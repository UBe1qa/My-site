/* 계산 모드: 통계·회귀, 확률분포, 방정식·부등식, 행렬·벡터, 진법, 함수표 (SCM). 화면(DOM)을 모른다.
 * 값은 engine.js(SC)의 값을 그대로 쓴다 → 입력이 분수·유한소수면 결과도 가능한 한 정확값(분수·루트).
 */
(function (root) {
'use strict';
var SC = (typeof module !== 'undefined' && module.exports) ? require('./engine.js') : root.SC;
var add = SC.add, sub = SC.sub, mul = SC.mul, div = SC.div, neg = SC.neg, xint = SC.xint, xr = SC.xr, R = SC.R;
var ZERO = SC.ZERO, ONE = SC.ONE;
function mathErr(m) { return SC.mathErr(m); }
function num(v) { return SC.toNum(v); }
function sq(v) { return mul(v, v); }
function sqrtReal(v) { return SC.sqrtv(v, { complex: false }); }
function parseValue(text, env) {
  // 칸에 적은 글자 → 값 (빈칸은 null)
  if (text === null || text === undefined) return null;
  var s = String(text).trim();
  if (s === '') return null;
  return SC.calc(s, env || SC.defaultEnv());
}

// ================================================================ 통계 (1변수)
// xs: 값 배열, fs: 도수 배열(없으면 모두 1). quart: 'casio'(기본) | 'excel'
function expandSorted(xs, fs) {
  var pairs = xs.map(function (x, i) {
    var f = fs ? fs[i] : ONE;
    if (!SC.realIsInt(f) || SC.sign(f) < 0) throw mathErr('freq');
    return { x: x, f: Number(SC.toNum(f)), n: num(x) };
  }).filter(function (p) { return p.f > 0; });
  pairs.sort(function (a, b) { return a.n - b.n; });
  return pairs;
}
// k번째(0부터) 값 (도수를 펼친 순서)
function kth(pairs, k) {
  var c = 0;
  for (var i = 0; i < pairs.length; i++) { c += pairs[i].f; if (k < c) return pairs[i].x; }
  return pairs[pairs.length - 1].x;
}
function medianRange(pairs, start, count) {   // 펼친 자료의 [start, start+count) 중앙값
  if (count <= 0) throw mathErr('n');
  if (count % 2 === 1) return kth(pairs, start + (count - 1) / 2);
  return div(add(kth(pairs, start + count / 2 - 1), kth(pairs, start + count / 2)), xint(2));
}
// 엑셀 QUARTILE.INC / PERCENTILE.INC: 위치 (n−1)p 에서 선형 보간
function percentileInc(pairs, n, p) {
  var pos = (n - 1) * p, lo = Math.floor(pos), frac = pos - lo;
  var a = kth(pairs, lo);
  if (frac === 0) return a;
  var b = kth(pairs, lo + 1);
  // frac 는 (n−1)p 의 소수 부분 = 0.25·0.5·0.75 중 하나 → 정확한 분수로
  var fr = xr(R(BigInt(Math.round(frac * 4)), 4n));
  return add(a, mul(sub(b, a), fr));
}
function stats1(xs, fs, quart) {
  if (!xs.length) throw mathErr('n');
  var n = ZERO, sum = ZERO, sum2 = ZERO;
  xs.forEach(function (x, i) {
    var f = fs ? fs[i] : ONE;
    n = add(n, f); sum = add(sum, mul(f, x)); sum2 = add(sum2, mul(f, sq(x)));
  });
  if (SC.isZero(n)) throw mathErr('n');
  var mean = div(sum, n);
  // 편차 제곱합 Σf(x−x̄)² (소수일 때 정확도 위해 평균을 뺀 뒤 제곱)
  var ss = ZERO;
  xs.forEach(function (x, i) { var f = fs ? fs[i] : ONE; ss = add(ss, mul(f, sq(sub(x, mean)))); });
  var popVar = div(ss, n);
  var res = { n: n, sum: sum, sum2: sum2, mean: mean, popVar: popVar, popSD: sqrtReal(popVar) };
  if (num(n) > 1) { res.sampleVar = div(ss, sub(n, ONE)); res.sampleSD = sqrtReal(res.sampleVar); }
  var pairs = expandSorted(xs, fs), N = pairs.reduce(function (s, p) { return s + p.f; }, 0);
  res.min = pairs[0].x; res.max = pairs[pairs.length - 1].x;
  res.range = sub(res.max, res.min);
  res.med = medianRange(pairs, 0, N);
  if (quart === 'excel') {
    res.q1 = percentileInc(pairs, N, 0.25); res.q3 = percentileInc(pairs, N, 0.75);
  } else if (N >= 2) {
    var half = Math.floor(N / 2);           // 홀수면 중앙값을 빼고 반씩
    res.q1 = medianRange(pairs, 0, half);
    res.q3 = medianRange(pairs, N - half, half);
  }
  // 최빈값 (모두 한 번씩이면 없음)
  var counts = {}, best = 0;
  pairs.forEach(function (p) { var k = SC.rowToPlain(SC.valueRow(p.x, { decimal: true })); counts[k] = (counts[k] || { x: p.x, c: 0 }); counts[k].c += p.f; best = Math.max(best, counts[k].c); });
  if (best > 1) res.mode = Object.keys(counts).filter(function (k) { return counts[k].c === best; }).map(function (k) { return counts[k].x; });
  return res;
}

// ================================================================ 회귀 (2변수)
var REG_TYPES = ['lin', 'quad', 'log', 'exp', 'abx', 'pow', 'inv'];
// 실수 연립 3원 (정확값 가능): 가우스 소거
function solveLinear(A, b) {
  var n = A.length, M = A.map(function (row, i) { return row.concat([b[i]]); });
  for (var c = 0; c < n; c++) {
    var piv = -1, best = -1;
    for (var r = c; r < n; r++) {
      if (SC.isZero(M[r][c])) continue;
      var mag = Math.abs(num(M[r][c]));
      if (mag > best) { best = mag; piv = r; }
    }
    if (piv < 0) return null;
    var t = M[c]; M[c] = M[piv]; M[piv] = t;
    for (var r2 = 0; r2 < n; r2++) {
      if (r2 === c || SC.isZero(M[r2][c])) continue;
      var f = div(M[r2][c], M[c][c]);
      for (var k = c; k <= n; k++) M[r2][k] = sub(M[r2][k], mul(f, M[c][k]));
    }
  }
  return M.map(function (row, i) { return div(row[n], row[i]); });
}
function regression(xs, ys, fs, type) {
  var n = xs.length;
  if (n < 2) throw mathErr('n');
  var X = xs, Y = ys, tx = function (v) { return v; }, ty = function (v) { return v; };
  var F = fs || xs.map(function () { return ONE; });
  if (type === 'quad') return quadReg(xs, ys, F);
  function ln(v) { if (SC.sign(v) <= 0) throw mathErr('domain'); return SC.lnv(v, { complex: false }); }
  if (type === 'log') X = xs.map(ln);
  if (type === 'inv') X = xs.map(function (v) { return SC.inv(v); });
  if (type === 'exp' || type === 'abx') Y = ys.map(ln);
  if (type === 'pow') { X = xs.map(ln); Y = ys.map(ln); }
  var lin = linFit(X, Y, F);
  var res = { type: type, r: lin.r, n: lin.n };
  if (type === 'lin' || type === 'log' || type === 'inv') { res.a = lin.a; res.b = lin.b; }
  else if (type === 'exp') { res.a = SC.F(Math.exp(num(lin.a))); res.b = lin.b; }           // y = a·e^(bx)
  else if (type === 'abx') { res.a = SC.F(Math.exp(num(lin.a))); res.b = SC.F(Math.exp(num(lin.b))); } // y = a·b^x
  else if (type === 'pow') { res.a = SC.F(Math.exp(num(lin.a))); res.b = lin.b; }           // y = a·x^b
  return res;
}
function linFit(X, Y, F) {
  var n = ZERO, sx = ZERO, sy = ZERO;
  X.forEach(function (x, i) { n = add(n, F[i]); sx = add(sx, mul(F[i], x)); sy = add(sy, mul(F[i], Y[i])); });
  var mx = div(sx, n), my = div(sy, n), sxx = ZERO, syy = ZERO, sxy = ZERO;
  X.forEach(function (x, i) {
    var dx = sub(x, mx), dy = sub(Y[i], my);
    sxx = add(sxx, mul(F[i], sq(dx))); syy = add(syy, mul(F[i], sq(dy))); sxy = add(sxy, mul(F[i], mul(dx, dy)));
  });
  if (SC.isZero(sxx)) throw mathErr('domain');
  var b = div(sxy, sxx), a = sub(my, mul(b, mx));
  var r = SC.isZero(syy) ? null : div(sxy, sqrtReal(mul(sxx, syy)));
  return { a: a, b: b, r: r, n: n, mx: mx, my: my };
}
function quadReg(xs, ys, F) {
  // 정규방정식: [n Σx Σx²; Σx Σx² Σx³; Σx² Σx³ Σx⁴][a b c] = [Σy Σxy Σx²y]
  var S = [ZERO, ZERO, ZERO, ZERO, ZERO], T = [ZERO, ZERO, ZERO];
  xs.forEach(function (x, i) {
    var p = F[i];
    for (var k = 0; k <= 4; k++) { S[k] = add(S[k], p); if (k < 3) T[k] = add(T[k], mul(p, ys[i])); p = mul(p, x); }
  });
  // 위 루프에서 T[k] 는 Σ f x^k y 가 되도록 p 를 곱하기 전에 더함
  var A = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]];
  var sol = solveLinear(A, T);
  if (!sol) throw mathErr('domain');
  // 결정계수 R² = 1 − SSres/SStot
  var n = S[0], my = div(T[0], n), ssr = ZERO, sst = ZERO;
  xs.forEach(function (x, i) {
    var yh = add(sol[0], add(mul(sol[1], x), mul(sol[2], sq(x))));
    ssr = add(ssr, mul(F[i], sq(sub(ys[i], yh)))); sst = add(sst, mul(F[i], sq(sub(ys[i], my))));
  });
  var r2 = SC.isZero(sst) ? null : sub(ONE, div(ssr, sst));
  return { type: 'quad', a: sol[0], b: sol[1], c: sol[2], r2: r2, n: n };
}
// 추정값
function regPredictY(reg, x) {
  var a = reg.a, b = reg.b;
  switch (reg.type) {
    case 'lin': return add(a, mul(b, x));
    case 'quad': return add(a, add(mul(b, x), mul(reg.c, sq(x))));
    case 'log': return add(a, mul(b, SC.lnv(x, { complex: false })));
    case 'exp': return SC.F(num(a) * Math.exp(num(b) * num(x)));
    case 'abx': return SC.F(num(a) * Math.pow(num(b), num(x)));
    case 'pow': return SC.F(num(a) * Math.pow(num(x), num(b)));
    case 'inv': return add(a, div(b, x));
  }
}
function regPredictX(reg, y) {        // 배열(이차는 둘)
  var a = reg.a, b = reg.b;
  switch (reg.type) {
    case 'lin': return [div(sub(y, a), b)];
    case 'quad': {
      var r = quadRoots(reg.c, b, sub(a, y));
      return r.filter(function (v) { return !SC.isC(v); });
    }
    case 'log': return [SC.F(Math.exp(num(sub(y, a)) / num(b)))];
    case 'exp': return [SC.F(Math.log(num(y) / num(a)) / num(b))];
    case 'abx': return [SC.F(Math.log(num(y) / num(a)) / Math.log(num(b)))];
    case 'pow': return [SC.F(Math.pow(num(y) / num(a), 1 / num(b)))];
    case 'inv': return [div(b, sub(y, a))];
  }
}

// ================================================================ 확률분포
var SQRT2 = Math.SQRT2, SQRT2PI = Math.sqrt(2 * Math.PI);
// erf 를 두 방법으로: |x| ≤ 3 은 모든 항이 양수인 급수(빼기 손실 없음), 그 밖은 erfc 연분수
function erfSeries(x) {          // erf(x) = 2/√π e^{-x²} Σ 2ⁿ x^{2n+1} / (1·3·…·(2n+1))
  var term = x, sum = x, n = 0, x2 = x * x;
  while (Math.abs(term) > 1e-17 * Math.abs(sum) && n < 500) { n++; term *= 2 * x2 / (2 * n + 1); sum += term; }
  return 2 / Math.sqrt(Math.PI) * Math.exp(-x2) * sum;
}
function erfcCF(x) {             // x > 0, 렌츠 방법 연분수: erfc(x) = e^{-x²}/√π · 1/(x + 1/2/(x + 1/(x + 3/2/(x + …))))
  var tiny = 1e-300, f = x, C = x, D = 0, k;
  for (k = 1; k < 500; k++) {
    var a = k / 2;
    D = x + a * D; if (D === 0) D = tiny; D = 1 / D;
    C = x + a / C; if (C === 0) C = tiny;
    var delta = C * D; f *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
}
function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x <= 3) return 1 - erfSeries(x);
  return erfcCF(x);
}
function erf(x) { return x < 0 ? -erf(-x) : (x <= 3 ? erfSeries(x) : 1 - erfcCF(x)); }
// 표준정규 누적: Φ(z) = erfc(−z/√2)/2
function phi(z) { return 0.5 * erfc(-z / SQRT2); }
// P(lo ≤ X ≤ hi): 같은 쪽 꼬리끼리 빼서 작은 확률도 정확하게
function normalCdf(lo, hi, mu, sd) {
  if (!(sd > 0)) throw mathErr('domain');
  if (lo > hi) throw mathErr('domain');
  var a = (lo - mu) / sd, b = (hi - mu) / sd;
  if (a >= 0) return (erfc(a / SQRT2) - erfc(b / SQRT2)) / 2;       // 둘 다 오른쪽: Q(a) − Q(b)
  if (b <= 0) return (erfc(-b / SQRT2) - erfc(-a / SQRT2)) / 2;     // 둘 다 왼쪽
  return 1 - erfc(-a / SQRT2) / 2 - erfc(b / SQRT2) / 2;
}
function normalPdf(x, mu, sd) {
  if (!(sd > 0)) throw mathErr('domain');
  var z = (x - mu) / sd;
  return Math.exp(-z * z / 2) / (sd * SQRT2PI);
}
// 역정규: 왼쪽 넓이 p 인 x. 첫 값(아브라모위츠·스테건 26.2.23) → 할리 방법으로 다듬기
function invNormStd(p) {
  if (!(p > 0 && p < 1)) throw mathErr('domain');
  var q = p < 0.5 ? p : 1 - p;
  var t = Math.sqrt(-2 * Math.log(q));
  var z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  if (p < 0.5) z = -z;
  for (var i = 0; i < 6; i++) {
    // 꼬리 쪽 확률로 오차 계산 (작은 p 에서 정밀하게)
    var e = p < 0.5 ? phi(z) - p : (p - 1) + (1 - phi(z));
    if (p >= 0.5) e = -(0.5 * erfc(z / SQRT2) - (1 - p));
    var d = Math.exp(-z * z / 2) / SQRT2PI;
    var u = e / d;
    z = z - u / (1 + z * u / 2);
    if (Math.abs(u) < 1e-16 * Math.max(1, Math.abs(z))) break;
  }
  return z;
}
// tail: 'left' P(X≤x)=p, 'right' P(X≥x)=p, 'center' P(−x≤X−μ≤x)=p → x 둘
function invNormal(p, mu, sd, tail) {
  if (!(sd > 0)) throw mathErr('domain');
  if (!(p > 0 && p < 1)) throw mathErr('domain');
  if (tail === 'right') return [mu + sd * invNormStd(1 - p)];
  if (tail === 'center') { var z = invNormStd(0.5 + p / 2); return [mu - sd * z, mu + sd * z]; }
  return [mu + sd * invNormStd(p)];
}
// 란초스 근사 lgamma (g=7, 9항)
var LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  var a = LG[0], t = x + 7.5;
  for (var i = 1; i < 9; i++) a += LG[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
var LOGFACT = [0];
function logFact(n) {             // 1000 까지는 더해서 정확히
  if (n <= 1000) { while (LOGFACT.length <= n) LOGFACT.push(LOGFACT[LOGFACT.length - 1] + Math.log(LOGFACT.length)); return LOGFACT[n]; }
  return lgamma(n + 1);
}
function checkInt(v, name) { if (!Number.isInteger(v) || v < 0) throw mathErr(name || 'int'); }
function binomPdf(k, n, p) {
  checkInt(n); if (!(p >= 0 && p <= 1)) throw mathErr('domain');
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  var lp = logFact(n) - logFact(k) - logFact(n - k) + k * Math.log(p) + (n - k) * Math.log1p(-p);
  return Math.exp(lp);
}
function binomCdf(lo, hi, n, p) {
  checkInt(n); if (n > 100000) throw mathErr('range');
  lo = Math.max(0, Math.ceil(lo)); hi = Math.min(n, Math.floor(hi));
  var s = 0; for (var k = lo; k <= hi; k++) s += binomPdf(k, n, p);
  return Math.min(1, s);
}
function poissonPdf(k, lam) {
  if (!(lam > 0)) throw mathErr('domain');
  if (!Number.isInteger(k) || k < 0) return 0;
  return Math.exp(k * Math.log(lam) - lam - logFact(k));
}
function poissonCdf(lo, hi, lam) {
  if (!(lam > 0)) throw mathErr('domain');
  lo = Math.max(0, Math.ceil(lo)); hi = Math.floor(hi);
  if (hi - lo > 1000000) throw mathErr('range');
  var s = 0; for (var k = lo; k <= hi; k++) s += poissonPdf(k, lam);
  return Math.min(1, s);
}

// ================================================================ 방정식
// 연립일차: A (n×n 값), b (n 값) → {kind:'one', x:[...]} | {kind:'none'} | {kind:'many'}
function solveSystem(A, b) {
  var n = A.length, M = A.map(function (row, i) { return row.slice().concat([b[i]]); });
  var rank = 0, pivCols = [];
  for (var c = 0; c < n && rank < n; c++) {
    var piv = -1, best = -1;
    for (var r = rank; r < n; r++) {
      if (SC.isZero(M[r][c])) continue;
      var mag = Math.abs(num(M[r][c])); if (mag > best) { best = mag; piv = r; }
    }
    if (piv < 0) continue;
    var t = M[rank]; M[rank] = M[piv]; M[piv] = t;
    for (var r2 = 0; r2 < n; r2++) {
      if (r2 === rank || SC.isZero(M[r2][c])) continue;
      var f = div(M[r2][c], M[rank][c]);
      for (var k = c; k <= n; k++) M[r2][k] = sub(M[r2][k], mul(f, M[rank][k]));
      // 소수 계산의 아주 작은 찌꺼기는 0으로
      for (var k2 = 0; k2 <= n; k2++) if (M[r2][k2].t === 'f' && Math.abs(M[r2][k2].v) < 1e-12 * Math.max(1, best)) M[r2][k2] = ZERO;
    }
    pivCols.push(c); rank++;
  }
  if (rank < n) {
    for (var r3 = rank; r3 < n; r3++) if (!SC.isZero(M[r3][n])) return { kind: 'none' };
    return { kind: 'many' };
  }
  return { kind: 'one', x: pivCols.map(function (c, i) { return div(M[i][n], M[i][c]); }) };
}
// 이차 ax²+bx+c=0 의 근 (정확값, 복소수 포함)
function quadRoots(a, b, c) {
  if (SC.isZero(a)) { if (SC.isZero(b)) throw mathErr('domain'); return [div(neg(c), b)]; }
  var D = sub(sq(b), mul(xint(4), mul(a, c)));
  var sD = SC.sqrtv(D, { complex: true });
  var two_a = mul(xint(2), a);
  var r1 = div(add(neg(b), sD), two_a), r2 = div(sub(neg(b), sD), two_a);
  if (SC.isZero(D)) return [r1, r1];
  // 실근은 작은 것부터
  if (!SC.isC(r1) && !SC.isC(r2) && num(r1) > num(r2)) return [r2, r1];
  return [r1, r2];
}
// 다항식 계수 [aₙ … a₀] (높은 차수부터) 값 배열
function polyEvalVals(co, x) { var s = ZERO; co.forEach(function (c) { s = add(mul(s, x), c); }); return s; }
function isRatVal(v) { return v && v.t === 'x' && SC.xIsRat(v); }
function bdivisors(n, limit) {            // |n| 의 약수 (n ≤ 10^12 정도)
  n = n < 0n ? -n : n;
  if (n === 0n) return null;
  if (n > 1000000000000n) return null;
  var out = [];
  for (var d = 1n; d * d <= n; d++) if (n % d === 0n) { out.push(d); if (d * d !== n) out.push(n / d); if (out.length > limit) return null; }
  return out;
}
// 유리수 근 찾기 (정수 계수로 바꾼 뒤 ±p/q)
function rationalRoots(co) {
  if (!co.every(isRatVal)) return [];
  var L = 1n;
  co.forEach(function (c) { var r = SC.xRat(c); L = L / SC.bgcd(L, r.d) * r.d; });
  var ints = co.map(function (c) { var r = SC.xRat(c); return r.n * (L / r.d); });
  var lead = ints[0];
  var k = ints.length - 1;
  while (k > 0 && ints[k] === 0n) k--;
  var tail = ints[k];
  var ps = bdivisors(tail, 4000), qs = bdivisors(lead, 4000);
  if (!ps || !qs) return [];
  var seen = {}, roots = [];
  if (k < ints.length - 1) roots.push(ZERO);            // x = 0 근
  ps.forEach(function (p) { qs.forEach(function (q) {
    [p, -p].forEach(function (pp) {
      var r = R(pp, q), key = r.n + '/' + r.d;
      if (seen[key]) return; seen[key] = 1;
      if (SC.isZero(polyEvalVals(co, xr(r)))) roots.push(xr(r));
    });
  }); });
  return roots;
}
function deflate(co, r) {                 // (x − r) 로 나눈 몫
  var out = [], acc = ZERO;
  for (var i = 0; i < co.length - 1; i++) { acc = add(mul(acc, r), co[i]); out.push(acc); }
  return out;
}
// 복소수 소수로 근 찾기 (듀랑-케르너) + 뉴턴으로 다듬기
function numericRoots(cf) {               // cf: 숫자 배열 [aₙ…a₀]
  var n = cf.length - 1;
  var a = cf.map(function (c) { return c / cf[0]; });
  var z = [];
  var rad = 1 + Math.max.apply(null, a.slice(1).map(Math.abs));
  for (var k = 0; k < n; k++) { var ang = 2 * Math.PI * k / n + 0.4; z.push([rad * Math.cos(ang), rad * Math.sin(ang)]); }
  function cmul(p, q) { return [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]]; }
  function cdiv(p, q) { var d = q[0] * q[0] + q[1] * q[1]; return [(p[0] * q[0] + p[1] * q[1]) / d, (p[1] * q[0] - p[0] * q[1]) / d]; }
  function peval(x) { var s = [0, 0]; for (var i = 0; i <= n; i++) { s = cmul(s, x); s[0] += a[i]; } return s; }
  for (var it = 0; it < 2000; it++) {
    var maxd = 0;
    for (var i = 0; i < n; i++) {
      var den = [1, 0];
      for (var j = 0; j < n; j++) if (j !== i) den = cmul(den, [z[i][0] - z[j][0], z[i][1] - z[j][1]]);
      var d = cdiv(peval(z[i]), den);
      z[i] = [z[i][0] - d[0], z[i][1] - d[1]];
      maxd = Math.max(maxd, Math.hypot(d[0], d[1]));
    }
    if (maxd < 1e-15) break;
  }
  // 뉴턴 다듬기 (원래 계수)
  var dcf = cf.slice(0, n).map(function (c, i) { return c * (n - i); });
  z = z.map(function (x) {
    for (var t = 0; t < 5; t++) {
      var p = [0, 0], dp = [0, 0];
      for (var i = 0; i <= n; i++) { p = cmul(p, x); p[0] += cf[i]; }
      for (var j = 0; j < n; j++) { dp = cmul(dp, x); dp[0] += dcf[j]; }
      if (dp[0] === 0 && dp[1] === 0) break;
      var step = cdiv(p, dp);
      if (!isFinite(step[0]) || !isFinite(step[1])) break;
      x = [x[0] - step[0], x[1] - step[1]];
    }
    var m = Math.hypot(x[0], x[1]);
    if (Math.abs(x[1]) < 1e-12 * Math.max(1, m)) x[1] = 0;
    if (Math.abs(x[0]) < 1e-14 * Math.max(1, m)) x[0] = 0;
    return x;
  });
  return z;
}
// 다항식 풀기: co 높은 차수부터 (2~4차). 근 배열(정확값·소수·복소수), 중근은 반복
function polyRoots(co) {
  while (co.length > 1 && SC.isZero(co[0])) co = co.slice(1);
  var deg = co.length - 1;
  if (deg < 1) throw mathErr('domain');
  var roots = [];
  // 유리수 근을 떼어 내며 낮춘다 (중근도 다시 확인)
  var guard = 0;
  while (co.length - 1 > 2 && guard++ < 8) {
    var rr = rationalRoots(co);
    if (!rr.length) break;
    roots.push(rr[0]); co = deflate(co, rr[0]);
  }
  if (co.length - 1 === 2) roots = roots.concat(quadRoots(co[0], co[1], co[2]));
  else if (co.length - 1 === 1) roots.push(div(neg(co[1]), co[0]));
  else {
    var nr = numericRoots(co.map(num));
    roots = roots.concat(nr.map(function (z) { return z[1] === 0 ? SC.F(z[0]) : SC.cx(SC.F(z[0]), SC.F(z[1])); }));
  }
  // 정렬: 실근 작은 것부터, 그다음 복소근
  roots.sort(function (p, q) {
    var pc = SC.isC(p), qc = SC.isC(q);
    if (pc !== qc) return pc ? 1 : -1;
    if (!pc) return num(p) - num(q);
    return num(SC.re(p)) - num(SC.re(q)) || num(SC.im(q)) - num(SC.im(p));
  });
  return roots;
}
// 극값 (이차: 꼭짓점, 삼차: 극대·극소)
function polyExtrema(co) {
  var deg = co.length - 1;
  if (deg === 2) {
    var x = div(neg(co[1]), mul(xint(2), co[0]));
    return [{ x: x, y: polyEvalVals(co, x), kind: SC.sign(co[0]) > 0 ? 'min' : 'max' }];
  }
  if (deg === 3) {
    var d = [mul(xint(3), co[0]), mul(xint(2), co[1]), co[2]];
    var D = sub(sq(d[1]), mul(xint(4), mul(d[0], d[2])));
    if (SC.sign(D) <= 0) return [];
    var rs = quadRoots(d[0], d[1], d[2]);
    return rs.map(function (x) {
      var second = add(mul(xint(2), mul(d[0], x)), d[1]);
      return { x: x, y: polyEvalVals(co, x), kind: SC.sign(second) < 0 ? 'max' : 'min' };
    });
  }
  return [];
}
// 부등식: co (2~4차), op: '>' '>=' '<' '<='  →  {all:true} | {none:true} | {parts:[{lo, loIn, hi, hiIn} | {eq: x}]}
function polyInequality(co, op) {
  var roots = polyRoots(co.slice()).filter(function (r) { return !SC.isC(r); });
  // 서로 다른 실근 (정렬)
  var uniq = [];
  roots.forEach(function (r) { if (!uniq.length || Math.abs(num(r) - num(uniq[uniq.length - 1])) > 1e-12 * Math.max(1, Math.abs(num(r)))) uniq.push(r); });
  function signAt(x) { var v = num(polyEvalVals(co, SC.F(x))); return v > 0 ? 1 : v < 0 ? -1 : 0; }
  var want = op[0] === '>' ? 1 : -1, incl = op.length === 2;
  // 구간마다 시험점
  var pts = uniq.map(num), parts = [];
  var bounds = [-Infinity].concat(pts, [Infinity]);
  for (var i = 0; i < bounds.length - 1; i++) {
    var lo = bounds[i], hi = bounds[i + 1], mid;
    if (lo === -Infinity && hi === Infinity) mid = 0;
    else if (lo === -Infinity) mid = hi - 1 - Math.abs(hi);
    else if (hi === Infinity) mid = lo + 1 + Math.abs(lo);
    else mid = (lo + hi) / 2;
    if (signAt(mid) === want) parts.push({ lo: i === 0 ? null : uniq[i - 1], hi: i === bounds.length - 2 ? null : uniq[i], loIn: incl, hiIn: incl });
  }
  // 이어진 구간 합치기 (경계점에서 0 이면 ≥·≤ 일 때만)
  var merged = [];
  parts.forEach(function (p) {
    var last = merged[merged.length - 1];
    if (last && last.hi && p.lo && last.hi === p.lo && incl) { last.hi = p.hi; last.hiIn = p.hiIn; }
    else merged.push(p);
  });
  // ≥·≤: 부호가 안 바뀌는 근(중근)은 점 하나로
  if (incl) {
    uniq.forEach(function (r) {
      var inside = merged.some(function (p) {
        var lo = p.lo ? num(p.lo) : -Infinity, hi = p.hi ? num(p.hi) : Infinity, x = num(r);
        return x >= lo && x <= hi;
      });
      if (!inside) merged.push({ eq: r });
    });
    merged.sort(function (a, b) { var x = a.eq ? num(a.eq) : (a.lo ? num(a.lo) : -Infinity), y = b.eq ? num(b.eq) : (b.lo ? num(b.lo) : -Infinity); return x - y; });
  }
  if (!merged.length) return { none: true };
  if (merged.length === 1 && !merged[0].eq && !merged[0].lo && !merged[0].hi) return { all: true };
  return { parts: merged };
}
// 아무 식 풀기 (SOLVE): f(x) − g(x) = 0 을 x0 근처에서
function solveNumeric(f, x0) {
  function g(x) { var v = f(x); if (!isFinite(v)) throw mathErr('domain'); return v; }
  var x = x0, fx;
  try { fx = g(x); } catch (e) { fx = NaN; }
  // 1) 뉴턴
  for (var i = 0; i < 60 && isFinite(fx); i++) {
    if (fx === 0) return { x: x, res: 0 };
    var h = 1e-7 * Math.max(1, Math.abs(x)), d;
    try { d = (g(x + h) - g(x - h)) / (2 * h); } catch (e) { break; }
    if (!isFinite(d) || d === 0) break;
    var nx = x - fx / d;
    if (!isFinite(nx)) break;
    if (Math.abs(nx - x) <= 1e-15 * Math.max(1, Math.abs(x))) { x = nx; try { fx = g(x); } catch (e) {} return { x: x, res: fx }; }
    x = nx; try { fx = g(x); } catch (e) { break; }
  }
  if (isFinite(fx) && Math.abs(fx) < 1e-12) return { x: x, res: fx };
  // 2) x0 에서 넓혀 가며 부호 바뀌는 곳 찾기 → 이분법
  var step = Math.max(0.1, Math.abs(x0) * 0.1), prevX = x0, prevF;
  try { prevF = g(x0); } catch (e) { prevF = NaN; }
  for (var k = 0; k < 400; k++) {
    var dir = (k % 2) ? -1 : 1, mag = step * Math.pow(1.3, Math.floor(k / 2));
    var xa = x0 + dir * mag, xb = x0 + dir * mag / 1.3, fa, fb;
    try { fa = g(xa); fb = g(xb); } catch (e) { continue; }
    if (fa === 0) return { x: xa, res: 0 };
    if (fa * fb < 0) {
      var lo = Math.min(xa, xb), hi = Math.max(xa, xb), flo = g(lo);
      for (var t = 0; t < 200; t++) {
        var m = (lo + hi) / 2, fm = g(m);
        if (fm === 0 || hi - lo <= 2e-16 * Math.max(1, Math.abs(m))) return { x: m, res: fm };
        if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m;
      }
      return { x: (lo + hi) / 2, res: g((lo + hi) / 2) };
    }
  }
  throw mathErr('nosol');
}
// 비례식 a:b = c:d 에서 하나 구하기 (missing: 'c' 또는 'd' …)
function ratio(a, b, c, d) {
  if (d === null) { if (SC.isZero(a)) throw mathErr('div0'); return div(mul(b, c), a); }
  if (c === null) { if (SC.isZero(b)) throw mathErr('div0'); return div(mul(a, d), b); }
  if (b === null) { if (SC.isZero(c)) throw mathErr('div0'); return div(mul(a, d), c); }
  if (a === null) { if (SC.isZero(d)) throw mathErr('div0'); return div(mul(b, c), d); }
  throw mathErr('domain');
}

// ================================================================ 행렬·벡터 (값 2차 배열)
function mdims(A) { return [A.length, A[0].length]; }
function madd(A, B, s) {
  if (A.length !== B.length || A[0].length !== B[0].length) throw mathErr('dim');
  return A.map(function (row, i) { return row.map(function (v, j) { return s ? sub(v, B[i][j]) : add(v, B[i][j]); }); });
}
function mmul(A, B) {
  if (A[0].length !== B.length) throw mathErr('dim');
  return A.map(function (row) { return B[0].map(function (_, j) { var s = ZERO; row.forEach(function (v, k) { s = add(s, mul(v, B[k][j])); }); return s; }); });
}
function mscale(k, A) { return A.map(function (row) { return row.map(function (v) { return mul(k, v); }); }); }
function mtrans(A) { return A[0].map(function (_, j) { return A.map(function (row) { return row[j]; }); }); }
function mident(n) { var I = []; for (var i = 0; i < n; i++) { I.push([]); for (var j = 0; j < n; j++) I[i].push(i === j ? ONE : ZERO); } return I; }
function mdet(A) {
  var n = A.length; if (n !== A[0].length) throw mathErr('dim');
  var M = A.map(function (r) { return r.slice(); }), det = ONE;
  for (var c = 0; c < n; c++) {
    var piv = -1, best = -1;
    for (var r = c; r < n; r++) { if (SC.isZero(M[r][c])) continue; var mag = Math.abs(num(M[r][c])); if (mag > best) { best = mag; piv = r; } }
    if (piv < 0) return ZERO;
    if (piv !== c) { var t = M[c]; M[c] = M[piv]; M[piv] = t; det = neg(det); }
    det = mul(det, M[c][c]);
    for (var r2 = c + 1; r2 < n; r2++) {
      if (SC.isZero(M[r2][c])) continue;
      var f = div(M[r2][c], M[c][c]);
      for (var k = c; k < n; k++) M[r2][k] = sub(M[r2][k], mul(f, M[c][k]));
    }
  }
  if (det.t === 'f' && Math.abs(det.v) < 1e-12) {
    // 소수 계산의 찌꺼기: 원래 값 크기에 비해 아주 작으면 0
    var scale = 1; A.forEach(function (r) { r.forEach(function (v) { scale = Math.max(scale, Math.abs(num(v))); }); });
    if (Math.abs(det.v) < 1e-13 * Math.pow(scale, n)) return ZERO;
  }
  return det;
}
function minv(A) {
  var n = A.length; if (n !== A[0].length) throw mathErr('dim');
  var M = A.map(function (r, i) { return r.slice().concat(mident(n)[i]); });
  for (var c = 0; c < n; c++) {
    var piv = -1, best = -1;
    for (var r = c; r < n; r++) { if (SC.isZero(M[r][c])) continue; var mag = Math.abs(num(M[r][c])); if (mag > best) { best = mag; piv = r; } }
    if (piv < 0) throw mathErr('singular');
    var t = M[c]; M[c] = M[piv]; M[piv] = t;
    var pv = M[c][c];
    M[c] = M[c].map(function (v) { return div(v, pv); });
    for (var r2 = 0; r2 < n; r2++) {
      if (r2 === c || SC.isZero(M[r2][c])) continue;
      var f = M[r2][c];
      for (var k = 0; k < 2 * n; k++) M[r2][k] = sub(M[r2][k], mul(f, M[c][k]));
    }
  }
  if (SC.isZero(mdet(A))) throw mathErr('singular');
  return M.map(function (r) { return r.slice(n); });
}
function mrank(A) {
  var M = A.map(function (r) { return r.slice(); }), rows = M.length, cols = M[0].length, rank = 0;
  for (var c = 0; c < cols && rank < rows; c++) {
    var piv = -1, best = -1;
    for (var r = rank; r < rows; r++) { if (SC.isZero(M[r][c])) continue; var mag = Math.abs(num(M[r][c])); if (mag > best) { best = mag; piv = r; } }
    if (piv < 0 || best < 1e-12 && M[piv][c].t === 'f') continue;
    var t = M[rank]; M[rank] = M[piv]; M[piv] = t;
    for (var r2 = rank + 1; r2 < rows; r2++) {
      if (SC.isZero(M[r2][c])) continue;
      var f = div(M[r2][c], M[rank][c]);
      for (var k = c; k < cols; k++) M[r2][k] = sub(M[r2][k], mul(f, M[rank][k]));
    }
    rank++;
  }
  return rank;
}
function mpow(A, k) {
  if (A.length !== A[0].length) throw mathErr('dim');
  if (k < 0) return mpow(minv(A), -k);
  var Rm = mident(A.length), B = A;
  while (k > 0) { if (k & 1) Rm = mmul(Rm, B); k >>= 1; if (k) B = mmul(B, B); }
  return Rm;
}
// 벡터 (값 배열)
function vdot(u, v) { if (u.length !== v.length) throw mathErr('dim'); var s = ZERO; u.forEach(function (a, i) { s = add(s, mul(a, v[i])); }); return s; }
function vcross(u, v) {
  if (u.length !== 3 || v.length !== 3) throw mathErr('dim');
  return [sub(mul(u[1], v[2]), mul(u[2], v[1])), sub(mul(u[2], v[0]), mul(u[0], v[2])), sub(mul(u[0], v[1]), mul(u[1], v[0]))];
}
function vnorm(u) { return sqrtReal(vdot(u, u)); }
function vangle(u, v, mode) {             // 두 벡터 사이 각
  var d = mul(vnorm(u), vnorm(v));
  if (SC.isZero(d)) throw mathErr('domain');
  var c = div(vdot(u, v), d);
  if (c.t === 'f') c = SC.F(Math.max(-1, Math.min(1, c.v)));
  return SC.atrig('acos', c, mode || 'deg');
}
function vunit(u) { var n = vnorm(u); if (SC.isZero(n)) throw mathErr('domain'); return u.map(function (a) { return div(a, n); }); }

// ================================================================ 진법 (2·8·10·16, 2의 보수)
var BASES = { BIN: 2, OCT: 8, DEC: 10, HEX: 16 };
function wrapSigned(v, bits) {          // BigInt → bits 비트 부호 있는 값 (넘치면 오류)
  var B = BigInt(bits), min = -(1n << (B - 1n)), max = (1n << (B - 1n)) - 1n;
  if (v < min || v > max) throw mathErr('range');
  return v;
}
function toUnsigned(v, bits) { var B = BigInt(bits); return v < 0n ? (1n << B) + v : v; }
function fromUnsigned(u, bits) { var B = BigInt(bits); return u >= (1n << (B - 1n)) ? u - (1n << B) : u; }
function formatBase(v, base, bits) {
  if (base === 10) return v.toString();
  return toUnsigned(v, bits).toString(base).toUpperCase();
}
// 진법 식: 숫자(입력 진법), + − × ÷ * /, and or xor xnor, not( neg( 괄호
function baseCalc(text, base, bits) {
  var s = String(text).replace(/\s+/g, ' ').trim(), i = 0;
  var B = BigInt(bits), mask = (1n << B) - 1n;
  if (!s) throw SC.synErr('empty');
  function skip() { while (s[i] === ' ') i++; }
  function word() { skip(); var m = /^[A-Za-z]+/.exec(s.slice(i)); return m ? m[0].toLowerCase() : null; }
  function digitVal(ch) { var d = parseInt(ch, 16); return isNaN(d) ? -1 : d; }
  function numberTok() {
    skip();
    var st = i, v = 0n;
    while (i < s.length) {
      var ch = s[i], dv = digitVal(ch);
      if (dv < 0 || dv >= base) break;
      // 16진수의 a~f 가 낱말(and 등)의 시작이면 숫자가 아님
      if (/[a-f]/i.test(ch) && i === st && /^(and|xor|xnor|or|not|neg)\b/i.test(s.slice(i))) break;
      v = v * BigInt(base) + BigInt(dv); i++;
    }
    if (i === st) throw SC.synErr('number');
    if (base !== 10) { if (v > mask) throw mathErr('range'); return fromUnsigned(v, bits); }
    return v;
  }
  function wrapResult(v) { return wrapSigned(v, bits); }
  function primary() {
    skip();
    var w = word();
    if (w === 'not' || w === 'neg') {
      i += 3; skip(); if (s[i] !== '(') throw SC.synErr('paren'); i++;
      var a = orExpr(); skip(); if (s[i] === ')') i++;
      if (w === 'not') return fromUnsigned(toUnsigned(a, bits) ^ mask, bits);
      return wrapResult(-a);
    }
    if (s[i] === '(') { i++; var e = orExpr(); skip(); if (s[i] === ')') i++; else if (i < s.length) throw SC.synErr('paren'); return e; }
    if (s[i] === '-' || s[i] === '−') { i++; return wrapResult(-primary()); }
    return numberTok();
  }
  function mulExpr() {
    var a = primary();
    for (;;) {
      skip(); var ch = s[i];
      if (ch === '*' || ch === '×') { i++; a = wrapResult(a * primary()); }
      else if (ch === '/' || ch === '÷') { i++; var b = primary(); if (b === 0n) throw mathErr('div0'); a = wrapResult(a / b); }
      else return a;
    }
  }
  function addExpr() {
    var a = mulExpr();
    for (;;) {
      skip(); var ch = s[i];
      if (ch === '+') { i++; a = wrapResult(a + mulExpr()); }
      else if (ch === '-' || ch === '−') { i++; a = wrapResult(a - mulExpr()); }
      else return a;
    }
  }
  function andExpr() {
    var a = addExpr();
    for (;;) { var w = word(); if (w === 'and') { i += 3; a = fromUnsigned(toUnsigned(a, bits) & toUnsigned(addExpr(), bits), bits); } else return a; }
  }
  function orExpr() {
    var a = andExpr();
    for (;;) {
      var w = word();
      if (w === 'or') { i += 2; a = fromUnsigned(toUnsigned(a, bits) | toUnsigned(andExpr(), bits), bits); }
      else if (w === 'xor') { i += 3; a = fromUnsigned(toUnsigned(a, bits) ^ toUnsigned(andExpr(), bits), bits); }
      else if (w === 'xnor') { i += 4; a = fromUnsigned((toUnsigned(a, bits) ^ toUnsigned(andExpr(), bits)) ^ mask, bits); }
      else return a;
    }
  }
  var v = orExpr(); skip();
  if (i < s.length) throw SC.synErr('trailing');
  return v;
}
function baseAll(v, bits) {
  return { DEC: formatBase(v, 10, bits), HEX: formatBase(v, 16, bits), OCT: formatBase(v, 8, bits), BIN: formatBase(v, 2, bits) };
}

// ================================================================ 함수표
// f, g: 줄(row) 또는 글자, start/end/step: 값.  행 최대 200
function makeTable(fText, gText, start, end, step, env) {
  var f = fText ? SC.parseRow(typeof fText === 'string' ? SC.parseText(fText) : fText) : null;
  var g = gText ? SC.parseRow(typeof gText === 'string' ? SC.parseText(gText) : gText) : null;
  if (!f) throw SC.synErr('empty');
  if (SC.sign(step) <= 0) throw mathErr('step');
  var count = Math.floor((num(end) - num(start)) / num(step) + 1e-9) + 1;
  if (count < 1) throw mathErr('range');
  if (count > 200) throw mathErr('rows');
  var rows = [];
  for (var k = 0; k < count; k++) {
    var x = add(start, mul(xint(k), step));
    var e2 = Object.create(env || SC.defaultEnv()); e2.x = x;
    var fv = null, gv = null;
    try { fv = SC.evaluate(f, e2); } catch (e) { fv = { error: e.kind || 'math' }; }
    if (g) { try { gv = SC.evaluate(g, e2); } catch (e) { gv = { error: e.kind || 'math' }; } }
    rows.push({ x: x, f: fv, g: gv });
  }
  return rows;
}

var SCM = {
  parseValue: parseValue, stats1: stats1, regression: regression, regPredictY: regPredictY, regPredictX: regPredictX, REG_TYPES: REG_TYPES,
  erf: erf, erfc: erfc, phi: phi, normalPdf: normalPdf, normalCdf: normalCdf, invNormal: invNormal, invNormStd: invNormStd,
  binomPdf: binomPdf, binomCdf: binomCdf, poissonPdf: poissonPdf, poissonCdf: poissonCdf, lgamma: lgamma,
  solveSystem: solveSystem, quadRoots: quadRoots, polyRoots: polyRoots, polyExtrema: polyExtrema, polyInequality: polyInequality,
  polyEval: polyEvalVals, solveNumeric: solveNumeric, ratio: ratio,
  madd: madd, mmul: mmul, mscale: mscale, mtrans: mtrans, mdet: mdet, minv: minv, mrank: mrank, mpow: mpow, mident: mident,
  vdot: vdot, vcross: vcross, vnorm: vnorm, vangle: vangle, vunit: vunit,
  BASES: BASES, baseCalc: baseCalc, baseAll: baseAll, formatBase: formatBase, makeTable: makeTable
};
if (typeof module !== 'undefined' && module.exports) module.exports = SCM;
else root.SCM = SCM;
})(typeof window !== 'undefined' ? window : this);
