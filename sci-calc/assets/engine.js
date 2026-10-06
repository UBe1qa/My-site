/* 공학용 계산기 계산 엔진 (SC). 화면(DOM)을 모른다. 브라우저·node 둘 다에서 돈다.
 *
 * 값은 세 가지다.
 *   정확값 {t:'x', v:[항...]}  항 = {c: 유리수, r: 제곱 인수 없는 정수(√r), p: 0|1(π의 거듭제곱)}
 *                             예) (√6−√2)/4 = [{c:1/4,r:6,p:0},{c:-1/4,r:2,p:0}],  2π/3 = [{c:2/3,r:1,p:1}]
 *   소수   {t:'f', v:number}  (자바스크립트 double, 약 15~16자리)
 *   복소수 {t:'c', re:값, im:값}  (re·im은 정확값이나 소수)
 * 정확값끼리 계산하다 모양이 너무 커지거나 표현할 수 없으면(예: √(1+√2)) 소수로 넘어간다.
 * 유리수는 BigInt 분수라 1/3×3 = 1, 0.1+0.2 = 3/10 처럼 반올림 오차가 없다.
 */
(function (root) {
'use strict';

// ---------------------------------------------------------------- 오류
function CalcError(kind, msg) { this.kind = kind; this.message = msg || kind; }
CalcError.prototype = Object.create(Error.prototype);
CalcError.prototype.name = 'CalcError';
function mathErr(msg) { return new CalcError('math', msg || 'math'); }
function synErr(msg) { return new CalcError('syntax', msg || 'syntax'); }

// ---------------------------------------------------------------- BigInt
var BIG_LIMIT_BITS = 40000;            // 약 12,000자리. 넘으면 소수로 넘긴다
function babs(a) { return a < 0n ? -a : a; }
function bgcd(a, b) { a = babs(a); b = babs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
function bitlen(a) { a = babs(a); return a === 0n ? 0 : a.toString(2).length; }
function bsqrt(n) {                      // 바닥(√n), n ≥ 0
  if (n < 0n) throw mathErr();
  if (n < 2n) return n;
  var x = BigInt(Math.floor(Math.sqrt(Number(n))));
  if (bitlen(n) > 100) { x = 1n << BigInt(Math.ceil(bitlen(n) / 2)); }
  for (;;) {
    var y = (x + n / x) >> 1n;
    if (y >= x) { while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x; }
    x = y;
  }
}
function bnroot(n, k) {                  // 바닥(n^(1/k)), n ≥ 0, k ≥ 1
  if (k === 1) return n;
  if (n < 2n) return n;
  var K = BigInt(k);
  var x = 1n << BigInt(Math.ceil(bitlen(n) / k) + 1);
  for (;;) {
    var y = ((K - 1n) * x + n / (x ** (K - 1n))) / K;
    if (y >= x) break;
    x = y;
  }
  while (x ** K > n) x--;
  while ((x + 1n) ** K <= n) x++;
  return x;
}
function bpow10(k) { return 10n ** BigInt(k); }
function bdigits(a) { return babs(a).toString().length; }

// ---------------------------------------------------------------- 유리수 {n, d>0}
function R(n, d) {
  if (d === undefined) d = 1n;
  if (d === 0n) throw mathErr('div0');
  if (d < 0n) { n = -n; d = -d; }
  var g = bgcd(n, d);
  if (g > 1n) { n /= g; d /= g; }
  return { n: n, d: d };
}
var R0 = { n: 0n, d: 1n }, R1 = { n: 1n, d: 1n };
function radd(a, b) { return a.d === b.d ? R(a.n + b.n, a.d) : R(a.n * b.d + b.n * a.d, a.d * b.d); }
function rsub(a, b) { return radd(a, rneg(b)); }
function rneg(a) { return { n: -a.n, d: a.d }; }
function rmul(a, b) { return R(a.n * b.n, a.d * b.d); }
function rdiv(a, b) { if (b.n === 0n) throw mathErr('div0'); return R(a.n * b.d, a.d * b.n); }
function rcmp(a, b) { var x = a.n * b.d - b.n * a.d; return x < 0n ? -1 : x > 0n ? 1 : 0; }
function risInt(a) { return a.d === 1n; }
function rbits(a) { return Math.max(bitlen(a.n), bitlen(a.d)); }
function rfloor(a) { var q = a.n / a.d; if (a.n < 0n && q * a.d !== a.n) q -= 1n; return q; }
function rtrunc(a) { return a.n / a.d; }
// 유리수 → double (가장 가까운 값에 거의 항상 맞게)
function rToNum(a) {
  if (a.n === 0n) return 0;
  var nb = bitlen(a.n), db = bitlen(a.d);
  if (nb <= 53 && db <= 53) return Number(a.n) / Number(a.d);
  var shift = 70 - (nb - db);           // 몫이 약 70비트가 되게
  var n = babs(a.n), q;
  if (shift >= 0) q = (n << BigInt(shift)) / a.d; else q = n / (a.d << BigInt(-shift));
  var v = Number(q);
  // v × 2^-shift (지수가 아주 크거나 작아도 단계로 곱함)
  var s = -shift;
  while (s > 1000) { v *= Math.pow(2, 1000); s -= 1000; }
  while (s < -1000) { v *= Math.pow(2, -1000); s += 1000; }
  v *= Math.pow(2, s);
  return a.n < 0n ? -v : v;
}
// 10진 문자열(“12.5”, “3E-4” 같은)을 정확한 유리수로
function rFromDecimal(str) {
  str = String(str);
  if (str[0] === '-') return rneg(rFromDecimal(str.slice(1)));
  var m = /^(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(str);
  if (!m || (m[1] === '' && (m[2] === undefined || m[2] === ''))) throw synErr('number');
  var intp = m[1] || '0', frac = m[2] || '', ex = m[3] ? parseInt(m[3], 10) : 0;
  if (Math.abs(ex) > 5000) throw mathErr('range');
  var n = BigInt(intp + frac), d = bpow10(frac.length);
  if (ex > 0) n *= bpow10(ex); else if (ex < 0) d *= bpow10(-ex);
  return R(n, d);
}
// double → 정확한 유리수 (2진 값 그대로). 소수를 분수로 바꿀 때만 쓴다
function rFromNumExact(x) {
  if (!isFinite(x)) throw mathErr('range');
  if (x === 0) return R0;
  var neg = x < 0; x = Math.abs(x);
  var e = 0;
  while (x !== Math.floor(x)) { x *= 2; e++; if (e > 1100) break; }
  var r = R(BigInt(x), 1n << BigInt(e));
  return neg ? rneg(r) : r;
}

// ---------------------------------------------------------------- 제곱 인수 빼기
var SMALL_PRIMES = (function () {
  var lim = 2000, s = [], mark = new Uint8Array(lim + 1);
  for (var i = 2; i <= lim; i++) if (!mark[i]) { s.push(BigInt(i)); for (var j = i * i; j <= lim; j += i) mark[j] = 1; }
  return s;
})();
// n = s² · r (r은 가능한 한 제곱 인수 없음). 큰 수는 작은 소수와 완전제곱만 본다
function squarePart(n) {
  if (n <= 0n) throw mathErr();
  var s = 1n, r = n;
  var t = bsqrt(r);
  if (t * t === r) return { s: t, r: 1n };
  for (var i = 0; i < SMALL_PRIMES.length; i++) {
    var p = SMALL_PRIMES[i], pp = p * p;
    if (pp > r) break;
    while (r % pp === 0n) { r /= pp; s *= p; }
    if (r % p === 0n) { /* 한 번만 나눠지는 소수는 남긴다 */ }
  }
  t = bsqrt(r);
  if (t * t === r) return { s: s * t, r: 1n };
  return { s: s, r: r };
}
// 작은 수는 끝까지 소인수분해해서 정확히
function squarePartFull(n) {
  if (n <= 0n) throw mathErr();
  if (n > 1000000000000000000n) return squarePart(n);
  var s = 1n, r = 1n, m = n;
  for (var p = 2n; p * p <= m; p += (p === 2n ? 1n : 2n)) {
    var e = 0;
    while (m % p === 0n) { m /= p; e++; }
    if (e) { s *= p ** BigInt(e >> 1); if (e & 1) r *= p; }
    if (p > 1000000n) {               // 10^12 넘는 남은 수는 완전제곱만 확인
      var t = bsqrt(m);
      if (t * t === m) { s *= t; m = 1n; }
      break;
    }
  }
  r *= m;
  return { s: s, r: r };
}

// ---------------------------------------------------------------- 정확값 (항의 합)
function tkey(t) { return t.p + ':' + t.r.toString(); }
function xnorm(terms) {
  var map = {}, order = [];
  for (var i = 0; i < terms.length; i++) {
    var t = terms[i]; if (t.c.n === 0n) continue;
    var k = tkey(t);
    if (map[k]) map[k] = { c: radd(map[k].c, t.c), r: t.r, p: t.p };
    else { map[k] = t; order.push(k); }
  }
  var out = [];
  for (var j = 0; j < order.length; j++) if (map[order[j]].c.n !== 0n) out.push(map[order[j]]);
  out.sort(function (a, b) { return a.p - b.p || (a.r < b.r ? -1 : a.r > b.r ? 1 : 0); });
  return out;
}
function xbits(terms) {
  var b = 0;
  for (var i = 0; i < terms.length; i++) b = Math.max(b, rbits(terms[i].c), bitlen(terms[i].r));
  return b;
}
function X(terms) {
  terms = xnorm(terms);
  if (terms.length > 6 || xbits(terms) > BIG_LIMIT_BITS) return null;   // 너무 크면 소수로
  for (var i = 0; i < terms.length; i++) if (terms[i].r > 1000000000000000000n) return null;
  return { t: 'x', v: terms };
}
function xr(r) { return { t: 'x', v: r.n === 0n ? [] : [{ c: r, r: 1n, p: 0 }] }; }
function xint(n) { return xr(R(BigInt(n))); }
function F(v) { if (!isFinite(v)) throw mathErr('range'); return { t: 'f', v: v === 0 ? 0 : v }; }
var PI = { t: 'x', v: [{ c: R1, r: 1n, p: 1 }] };
var E_CONST = { t: 'f', v: Math.E, isE: true };
var ZERO = xr(R0), ONE = xr(R1);

function isX(a) { return a.t === 'x'; }
function isC(a) { return a.t === 'c'; }
function xIsRat(a) { return a.t === 'x' && (a.v.length === 0 || (a.v.length === 1 && a.v[0].r === 1n && a.v[0].p === 0)); }
function xRat(a) { return a.v.length === 0 ? R0 : a.v[0].c; }
function isZero(a) {
  if (a.t === 'x') return a.v.length === 0;
  if (a.t === 'f') return a.v === 0;
  return isZero(a.re) && isZero(a.im);
}
function toNum(a) {
  if (a.t === 'f') return a.v;
  if (a.t === 'c') throw mathErr('complex');
  var s = 0;
  for (var i = 0; i < a.v.length; i++) {
    var t = a.v[i];
    var v = rToNum(t.c);
    if (t.r !== 1n) v *= Math.sqrt(Number(t.r));
    if (t.p) v *= Math.PI;
    s += v;
  }
  return s;
}
// 실수 부호 (-1, 0, 1). 정확값은 소수 근사가 0에 아주 가까우면 더 정밀하게 본다
function sign(a) {
  if (a.t === 'c') throw mathErr('complex');
  if (a.t === 'x') {
    if (a.v.length === 0) return 0;
    if (xIsRat(a)) return a.v[0].c.n < 0n ? -1 : 1;
  }
  var v = toNum(a);
  return v < 0 ? -1 : v > 0 ? 1 : 0;
}
function realIsInt(a) {
  if (a.t === 'x') return xIsRat(a) && risInt(xRat(a));
  if (a.t === 'f') return Number.isInteger(a.v);
  return false;
}
function toBigInt(a) {          // 정수인 실수 → BigInt
  if (a.t === 'x' && xIsRat(a) && risInt(xRat(a))) return xRat(a).n;
  if (a.t === 'f' && Number.isInteger(a.v) && Math.abs(a.v) <= Number.MAX_SAFE_INTEGER) return BigInt(a.v);
  throw mathErr('int');
}

// 정확값 연산 (실패하면 null → 부른 쪽이 소수로)
function xadd(a, b) { return X(a.v.concat(b.v)); }
function xneg(a) { return { t: 'x', v: a.v.map(function (t) { return { c: rneg(t.c), r: t.r, p: t.p }; }) }; }
function xmul(a, b) {
  if (a.v.length * b.v.length > 16) return null;
  var out = [];
  for (var i = 0; i < a.v.length; i++) for (var j = 0; j < b.v.length; j++) {
    var s = a.v[i], t = b.v[j];
    var p = s.p + t.p; if (p > 1) return null;
    var g = bgcd(s.r, t.r);
    var c = rmul(s.c, t.c);
    if (g > 1n) c = rmul(c, R(g));
    out.push({ c: c, r: (s.r / g) * (t.r / g), p: p });
  }
  return X(out);
}
function xinv(a) {
  if (a.v.length === 0) throw mathErr('div0');
  if (a.v.length === 1) {
    var t = a.v[0]; if (t.p) return null;
    return X([{ c: rdiv(R1, rmul(t.c, R(t.r))), r: t.r, p: 0 }]);
  }
  if (a.v.length === 2 && a.v[0].p === 0 && a.v[1].p === 0) {
    // 1/(u+v) = (u−v)/(u²−v²)
    var u = a.v[0], v = a.v[1];
    var den = rsub(rmul(rmul(u.c, u.c), R(u.r)), rmul(rmul(v.c, v.c), R(v.r)));
    if (den.n === 0n) return null;
    var k = rdiv(R1, den);
    return X([{ c: rmul(u.c, k), r: u.r, p: 0 }, { c: rneg(rmul(v.c, k)), r: v.r, p: 0 }]);
  }
  return null;
}
// √(유리수 ≥ 0) 정확값
function xsqrtRat(r) {
  if (r.n < 0n) throw mathErr('domain');
  if (r.n === 0n) return ZERO;
  if (bitlen(r.n) + bitlen(r.d) > 400) return null;
  // √(n/d) = √(n·d)/d
  var sp = squarePartFull(r.n * r.d);
  if (sp.r > 1000000000000000000n) return null;
  return X([{ c: R(sp.s, r.d), r: sp.r, p: 0 }]);
}
// 유리수의 정수 k제곱근이 딱 떨어지면 유리수, 아니면 null
function ratRoot(r, k) {
  var neg = r.n < 0n;
  if (neg && k % 2 === 0) return null;
  var n = babs(r.n), a = bnroot(n, k), b = bnroot(r.d, k);
  if (a ** BigInt(k) !== n || b ** BigInt(k) !== r.d) return null;
  return R(neg ? -a : a, b);
}

// ---------------------------------------------------------------- 일반 연산 (실수·복소수)
function cx(re, im) { if (isZero(im)) return re; return { t: 'c', re: re, im: im }; }
function re(a) { return a.t === 'c' ? a.re : a; }
function im(a) { return a.t === 'c' ? a.im : ZERO; }
function fix(v) {                               // 소수 결과 검사
  if (v.t === 'f' && !isFinite(v.v)) throw mathErr('range');
  return v;
}
function add(a, b) {
  if (isC(a) || isC(b)) return cx(add(re(a), re(b)), add(im(a), im(b)));
  if (isX(a) && isX(b)) { var r = xadd(a, b); if (r) return r; }
  return F(toNum(a) + toNum(b));
}
function neg(a) {
  if (isC(a)) return cx(neg(a.re), neg(a.im));
  if (isX(a)) return xneg(a);
  return F(-a.v);
}
function sub(a, b) { return add(a, neg(b)); }
function mul(a, b) {
  if (isC(a) || isC(b)) {
    var ar = re(a), ai = im(a), br = re(b), bi = im(b);
    return cx(sub(mul(ar, br), mul(ai, bi)), add(mul(ar, bi), mul(ai, br)));
  }
  if (isX(a) && isX(b)) { var r = xmul(a, b); if (r) return r; }
  if (isZero(a) || isZero(b)) return ZERO;
  return F(toNum(a) * toNum(b));
}
function inv(a) {
  if (isC(a)) {
    var d = add(mul(a.re, a.re), mul(a.im, a.im));
    if (isZero(d)) throw mathErr('div0');
    return cx(div(a.re, d), neg(div(a.im, d)));
  }
  if (isZero(a)) throw mathErr('div0');
  if (isX(a)) { var r = xinv(a); if (r) return r; }
  return F(1 / toNum(a));
}
function div(a, b) {
  if (isZero(b)) throw mathErr('div0');
  if (isC(b)) return mul(a, inv(b));
  if (isC(a)) return cx(div(a.re, b), div(a.im, b));
  if (isX(a) && isX(b)) {
    if (xIsRat(b)) {                    // 유리수로 나누기는 항마다
      var q = xRat(b);
      return X(a.v.map(function (t) { return { c: rdiv(t.c, q), r: t.r, p: t.p }; })) || F(toNum(a) / toNum(b));
    }
    var ib = xinv(b);
    if (ib) { var r = xmul(a, ib); if (r) return r; }
    // 같은 모양끼리 나누기 (π/π, √2/√2 …): 소수 몫이 유리수에 아주 가까우면 확인해서 정확히
  }
  return F(toNum(a) / toNum(b));
}

// ---------------------------------------------------------------- 각도
var ANG = { deg: 'deg', rad: 'rad', gra: 'gra' };
// 정확값 각도를 '도' 단위 유리수로 (못 하면 null)
function exactDegrees(a, mode) {
  if (!isX(a)) return null;
  if (a.v.length === 0) return R0;
  if (mode === 'rad') {
    if (a.v.length === 1 && a.v[0].p === 1 && a.v[0].r === 1n) return rmul(a.v[0].c, R(180n));
    return null;
  }
  if (!xIsRat(a)) return null;
  var r = xRat(a);
  return mode === 'gra' ? rmul(r, R(9n, 10n)) : r;
}
function toRadiansNum(a, mode) {
  var v = toNum(a);
  if (mode === 'rad') return v;
  if (mode === 'gra') { v = v % 400; return v * Math.PI / 200; }
  v = v % 360; return v * Math.PI / 180;
}
// 도(유리수) → 각도 모드 값
function fromDegrees(dr, mode) {
  if (mode === 'deg') return xr(dr);
  if (mode === 'gra') return xr(rmul(dr, R(10n, 9n)));
  var c = rdiv(dr, R(180n));
  return c.n === 0n ? ZERO : X([{ c: c, r: 1n, p: 1 }]);
}
function fromRadiansNum(v, mode) {
  if (mode === 'rad') return F(v);
  if (mode === 'gra') return F(v * 200 / Math.PI);
  return F(v * 180 / Math.PI);
}
function angleToRadNum(a, mode) { return toRadiansNum(a, mode); }

// sin 정확값 표 (15° 간격, 0~90°)
var S2 = function (c, r) { return { c: c, r: BigInt(r), p: 0 }; };
var SIN_TABLE = {
  0: [],
  15: [S2(R(1n, 4n), 6), S2(R(-1n, 4n), 2)],
  30: [S2(R(1n, 2n), 1)],
  45: [S2(R(1n, 2n), 2)],
  60: [S2(R(1n, 2n), 3)],
  75: [S2(R(1n, 4n), 6), S2(R(1n, 4n), 2)],
  90: [S2(R1, 1)]
};
function exactSinDeg(d) {        // d: 0 ≤ d < 360 정수, 15의 배수
  var q = Math.floor(d / 90), m = d % 90, v;
  if (q === 0) v = SIN_TABLE[m];
  else if (q === 1) v = SIN_TABLE[90 - m];
  else if (q === 2) v = SIN_TABLE[m].map(negT);
  else v = SIN_TABLE[90 - m].map(negT);
  return X(v.slice());
}
function negT(t) { return { c: rneg(t.c), r: t.r, p: t.p }; }
function reduceDeg(dr) {          // 유리수 도 → [0,360)
  var k = rfloor(rdiv(dr, R(360n)));
  return rsub(dr, R(k * 360n));
}
function trig(fn, a, mode) {
  if (isC(a)) throw mathErr('complexarg');
  var dr = exactDegrees(a, mode);
  if (dr) {
    var d = reduceDeg(dr);
    if (risInt(d) && d.n % 15n === 0n) {
      var di = Number(d.n);
      var s = exactSinDeg(di), c = exactSinDeg((di + 90) % 360);
      if (fn === 'sin') return s;
      if (fn === 'cos') return c;
      if (isZero(c)) throw mathErr('domain');
      return div(s, c);
    }
    var rad = rToNum(d) * Math.PI / 180;
    return F(fn === 'sin' ? Math.sin(rad) : fn === 'cos' ? Math.cos(rad) : Math.tan(rad));
  }
  var x = toNum(a);
  if (mode !== 'rad') {
    var full = mode === 'deg' ? 360 : 400;
    x = x - full * Math.floor(x / full);
    var deg = mode === 'deg' ? x : x * 0.9;
    // 소수로 들어와도 90°의 배수가 정확하면 0·±1
    if (deg % 90 === 0) return trig(fn, xint(deg), 'deg');
    x = mode === 'deg' ? x * Math.PI / 180 : x * Math.PI / 200;
  }
  if (fn === 'tan' && Math.abs(Math.cos(x)) < 1e-300) throw mathErr('domain');
  return F(fn === 'sin' ? Math.sin(x) : fn === 'cos' ? Math.cos(x) : Math.tan(x));
}
// 역삼각 정확값 표: 값의 모양 → 도
function xkey(a) { return a.v.map(function (t) { return t.c.n + '/' + t.c.d + 'r' + t.r + 'p' + t.p; }).join('+'); }
var ASIN_DEG = {}, ATAN_DEG = {};
(function () {
  [0, 15, 30, 45, 60, 75, 90].forEach(function (d) {
    var v = exactSinDeg(d);
    ASIN_DEG[xkey(v)] = d; ASIN_DEG[xkey(xneg(v))] = -d;
  });
  [0, 15, 30, 45, 60, 75].forEach(function (d) {
    var t = div(exactSinDeg(d), exactSinDeg(d + 90));
    if (isX(t)) { ATAN_DEG[xkey(t)] = d; ATAN_DEG[xkey(xneg(t))] = -d; }
  });
})();
function atrig(fn, a, mode) {
  if (isC(a)) throw mathErr('complexarg');
  if (isX(a)) {
    var k = xkey(a), d = null;
    if (fn === 'asin' && k in ASIN_DEG) d = ASIN_DEG[k];
    if (fn === 'acos' && k in ASIN_DEG) d = 90 - ASIN_DEG[k];
    if (fn === 'atan' && k in ATAN_DEG) d = ATAN_DEG[k];
    if (d !== null) return fromDegrees(R(BigInt(d)), mode);
  }
  var x = toNum(a), r;
  if (fn === 'asin') { if (Math.abs(x) > 1) throw mathErr('domain'); r = Math.asin(x); }
  else if (fn === 'acos') { if (Math.abs(x) > 1) throw mathErr('domain'); r = Math.acos(x); }
  else r = Math.atan(x);
  return fromRadiansNum(r, mode);
}

// ---------------------------------------------------------------- 거듭제곱·제곱근
function ipow(a, n) {               // a^n, n BigInt
  if (n === 0n) { if (isZero(a)) throw mathErr('0^0'); return ONE; }
  if (n < 0n) return inv(ipow(a, -n));
  if (isX(a) && xIsRat(a)) {
    var r = xRat(a);
    if (rbits(r) * Number(n) > BIG_LIMIT_BITS) return F(Math.pow(rToNum(r), Number(n)));
    return xr(R(r.n ** n, r.d ** n));
  }
  if (!isC(a) && !isX(a)) return F(Math.pow(a.v, Number(n)));
  if (n > 4096n) {
    if (isC(a)) return cpowFloat(a, xint(Number(n)));
    return F(Math.pow(toNum(a), Number(n)));
  }
  var result = ONE, base = a, e = n;
  while (e > 0n) {
    if (e & 1n) result = mul(result, base);
    e >>= 1n;
    if (e > 0n) base = mul(base, base);
  }
  return result;
}
function sqrtv(a, env) {
  if (isC(a)) return cpowFloat(a, xr(R(1n, 2n)));
  if (isX(a) && xIsRat(a)) {
    var r = xRat(a);
    if (r.n < 0n) {
      if (!env.complex) throw mathErr('domain');
      var s = xsqrtRat(rneg(r)); return cx(ZERO, s || F(Math.sqrt(-rToNum(r))));
    }
    var e = xsqrtRat(r); if (e) return e;
  }
  var v = toNum(a);
  if (v < 0) { if (!env.complex) throw mathErr('domain'); return cx(ZERO, F(Math.sqrt(-v))); }
  return F(Math.sqrt(v));
}
function powv(a, b, env) {
  if (a.isE && !isC(b)) return F(Math.exp(toNum(b)));
  if (isC(a) || isC(b)) {
    if (!isC(b) && realIsInt(b) && sign(b) >= 0 && Math.abs(toNum(b)) <= 4096) return ipow(a, toBigInt(b));
    if (!isC(b) && realIsInt(b) && Math.abs(toNum(b)) <= 4096) return ipow(a, toBigInt(b));
    if (isZero(a)) { if (sign(re(b)) > 0) return ZERO; throw mathErr('domain'); }
    return cpowFloat(a, b);
  }
  if (realIsInt(b)) {
    var n = toBigInt(b);
    if (isZero(a) && n < 0n) throw mathErr('div0');
    return ipow(a, n);
  }
  if (isZero(a)) { if (sign(b) > 0) return ZERO; throw mathErr('domain'); }
  if (isX(b) && xIsRat(b)) {
    var q = xRat(b);                    // 지수 p/q
    if (isX(a) && xIsRat(a)) {
      var base = xRat(a), k = Number(q.d);
      if (base.n < 0n && q.d % 2n === 0n) {
        if (!env.complex) throw mathErr('domain');
        return cpowFloat(a, b);
      }
      if (k <= 64 && rbits(base) * Math.abs(Number(q.n)) < 4000) {
        var rt = ratRoot(base, k);
        if (rt) return ipow(xr(rt), q.n);
        if (k === 2) {                   // a^(p/2) = (a^p)^(1/2)
          var pw = ipow(xr(base), q.n);
          if (isX(pw) && xIsRat(pw)) { var s = xsqrtRat(xRat(pw)); if (s) return s; }
        }
      }
      if (base.n < 0n) {                 // 음수의 홀수 제곱근은 실수
        var v = Math.pow(-rToNum(base), rToNum(q));
        return F(-v);
      }
    }
  }
  var x = toNum(a), y = toNum(b);
  if (x < 0) {
    if (!env.complex) throw mathErr('domain');
    return cpowFloat(a, b);
  }
  return F(Math.pow(x, y));
}
function rootv(n, a, env) {             // n제곱근
  if (isC(n)) throw mathErr('domain');
  if (isZero(n)) throw mathErr('domain');
  if (realIsInt(n) && !isC(a)) {
    var k = toBigInt(n);
    if (k === 2n) return sqrtv(a, env);
    if (sign(a) < 0 && (k % 2n === 1n || k % 2n === -1n)) return neg(powv(neg(a), inv(n), env));
  }
  return powv(a, inv(n), env);
}

// 복소수 소수 계산
function cparts(a) { return [toNum(re(a)), toNum(im(a))]; }
function cmake(x, y) {
  // 아주 작은 쪽은 0으로 (e^(iπ) = −1 + 1.2e-16 i 같은 것)
  var m = Math.max(Math.abs(x), Math.abs(y));
  if (Math.abs(x) < m * 1e-14) x = 0;
  if (Math.abs(y) < m * 1e-14) y = 0;
  return cx(F(x), F(y));
}
function cpowFloat(a, b) {
  var p = cparts(a), q = cparts(b);
  if (p[0] === 0 && p[1] === 0) return ZERO;
  var lr = Math.log(Math.hypot(p[0], p[1])), th = Math.atan2(p[1], p[0]);
  var er = q[0] * lr - q[1] * th, ei = q[1] * lr + q[0] * th;
  var m = Math.exp(er);
  return cmake(m * Math.cos(ei), m * Math.sin(ei));
}
function cexp(a) { var p = cparts(a), m = Math.exp(p[0]); return cmake(m * Math.cos(p[1]), m * Math.sin(p[1])); }
function cln(a) { var p = cparts(a); if (p[0] === 0 && p[1] === 0) throw mathErr('domain'); return cmake(Math.log(Math.hypot(p[0], p[1])), Math.atan2(p[1], p[0])); }

// ---------------------------------------------------------------- 로그
function bigLog10(n) {               // n > 0 BigInt
  var s = n.toString();
  if (s.length < 300) return Math.log10(Number(n));
  return (s.length - 17) + Math.log10(Number(s.slice(0, 17)));
}
function ratLog10(r) { return bigLog10(r.n < 0n ? -r.n : r.n) - bigLog10(r.d); }
function log10v(a, env) {
  if (isC(a)) { if (!env.complex) throw mathErr('domain'); var l = cln(a); return div(l, F(Math.LN10)); }
  if (sign(a) <= 0) {
    if (sign(a) < 0 && env.complex) return div(cln(a), F(Math.LN10));
    throw mathErr('domain');
  }
  if (isX(a) && xIsRat(a)) {
    var r = xRat(a);
    var k = exactPow10(r); if (k !== null) return xint(k);
    return F(ratLog10(r));
  }
  return F(Math.log10(toNum(a)));
}
function exactPow10(r) {
  if (r.d === 1n) { var s = r.n.toString(); if (/^10*$/.test(s)) return s.length - 1; }
  else if (r.n === 1n) { var t = r.d.toString(); if (/^10*$/.test(t)) return -(t.length - 1); }
  return null;
}
function lnv(a, env) {
  if (isC(a)) { if (!env.complex) throw mathErr('domain'); return cln(a); }
  if (sign(a) <= 0) {
    if (sign(a) < 0 && env.complex) return cln(a);
    throw mathErr('domain');
  }
  if (isX(a) && xIsRat(a)) {
    var r = xRat(a);
    if (r.n === 1n && r.d === 1n) return ZERO;
    return F(ratLog10(r) * Math.LN10);
  }
  if (a.isE) return ONE;
  return F(Math.log(toNum(a)));
}
function logbv(b, a, env) {
  if (isC(a) || isC(b)) { if (!env.complex) throw mathErr('domain'); return div(lnv(a, env), lnv(b, env)); }
  if (sign(b) <= 0 || sign(a) <= 0) throw mathErr('domain');
  if (isX(a) && isX(b) && xIsRat(a) && xIsRat(b)) {
    var ra = xRat(a), rb = xRat(b);
    if (rb.n === rb.d) throw mathErr('domain');
    var est = ratLog10(ra) / ratLog10(rb);
    // log_b a = p/q 를 q ≤ 6에서 찾아 확인 (b^p = a^q)
    for (var q = 1; q <= 6; q++) {
      var p = Math.round(est * q);
      if (Math.abs(est * q - p) > 1e-6) continue;
      if (Math.abs(p) > 2000) break;
      var lhs = ipow(xr(rb), BigInt(p)), rhs = ipow(xr(ra), BigInt(q));
      if (isX(lhs) && isX(rhs) && xkey(lhs) === xkey(rhs)) return xr(R(BigInt(p), BigInt(q)));
    }
    return F(est);
  }
  var la = Math.log(toNum(a)), lb = Math.log(toNum(b));
  if (lb === 0) throw mathErr('domain');
  return F(la / lb);
}

// ---------------------------------------------------------------- 정수·확률 함수
var FACT_MAX = 3000;
function factorialv(a) {
  if (!realIsInt(a) || sign(a) < 0) throw mathErr('domain');
  var n = toBigInt(a);
  if (n > BigInt(FACT_MAX)) throw mathErr('range');
  var r = 1n; for (var i = 2n; i <= n; i++) r *= i;
  return xr(R(r));
}
function permv(n, r) {
  if (!realIsInt(n) || !realIsInt(r)) throw mathErr('domain');
  var N = toBigInt(n), K = toBigInt(r);
  if (N < 0n || K < 0n || K > N) throw mathErr('domain');
  if (K > 100000n) throw mathErr('range');
  var p = 1n; for (var i = 0n; i < K; i++) p *= (N - i);
  return xr(R(p));
}
function combv(n, r) {
  if (!realIsInt(n) || !realIsInt(r)) throw mathErr('domain');
  var N = toBigInt(n), K = toBigInt(r);
  if (N < 0n || K < 0n || K > N) throw mathErr('domain');
  if (N - K < K) K = N - K;
  if (K > 100000n) throw mathErr('range');
  var p = 1n; for (var i = 1n; i <= K; i++) p = p * (N - K + i) / i;
  return xr(R(p));
}
function gcdv(args) {
  var g = 0n;
  args.forEach(function (a) { if (!realIsInt(a)) throw mathErr('domain'); g = bgcd(g, toBigInt(a)); });
  return xr(R(g));
}
function lcmv(args) {
  var l = 1n;
  args.forEach(function (a) {
    if (!realIsInt(a)) throw mathErr('domain');
    var v = babs(toBigInt(a));
    if (v === 0n) { l = 0n; return; }
    if (l !== 0n) l = l / bgcd(l, v) * v;
  });
  return xr(R(l));
}
function intPart(a) {       // Int: 0 쪽으로 자르기
  if (isC(a)) throw mathErr('complexarg');
  if (isX(a) && xIsRat(a)) return xr(R(rtrunc(xRat(a))));
  return F(Math.trunc(toNum(a)));
}
function intgPart(a) {      // Intg: 바닥
  if (isC(a)) throw mathErr('complexarg');
  if (isX(a) && xIsRat(a)) return xr(R(rfloor(xRat(a))));
  return F(Math.floor(toNum(a)));
}
function absv(a) {
  if (isC(a)) return sqrtv(add(mul(a.re, a.re), mul(a.im, a.im)), { complex: false });
  return sign(a) < 0 ? neg(a) : a;
}
function argv(a, mode) {
  var x = re(a), y = im(a);
  if (isZero(x) && isZero(y)) throw mathErr('domain');
  return atan2v(y, x, mode);
}
// atan2: 정확값이면 표로
function atan2v(y, x, mode) {
  if (isX(x) && isX(y)) {
    var sx = sign(x), sy = sign(y), d = null;
    if (sx === 0) d = sy > 0 ? 90 : -90;
    else {
      var t = div(y, x);
      if (isX(t)) {
        var k = xkey(t);
        if (k in ATAN_DEG) {
          d = ATAN_DEG[k];
          if (sx < 0) d = sy >= 0 ? d + 180 : d - 180;
        }
      }
    }
    if (d !== null) return fromDegrees(R(BigInt(d)), mode);
  }
  return fromRadiansNum(Math.atan2(toNum(y), toNum(x)), mode);
}

// ---------------------------------------------------------------- 상수 (CODATA 2022, NIST)
// exact: SI 정의값이라 오차 없음. 값은 tests/gen_cases.py 가 NIST 표와 대조한다.
var CONSTANTS = [
  { id: 'c0',  sym: 'c',   sub: '0',  v: '299792458',        unit: 'm/s',          exact: true },
  { id: 'h',   sym: 'h',   sub: '',   v: '6.62607015e-34',   unit: 'J s',          exact: true },
  { id: 'hbar',sym: 'ħ',   sub: '',   v: null,               unit: 'J s',          exact: true },
  { id: 'qe',  sym: 'e',   sub: '',   v: '1.602176634e-19',  unit: 'C',            exact: true },
  { id: 'k',   sym: 'k',   sub: '',   v: '1.380649e-23',     unit: 'J/K',          exact: true },
  { id: 'NA',  sym: 'N',   sub: 'A',  v: '6.02214076e23',    unit: '1/mol',        exact: true },
  { id: 'R',   sym: 'R',   sub: '',   v: null,               unit: 'J/(mol K)',    exact: true },
  { id: 'F',   sym: 'F',   sub: '',   v: null,               unit: 'C/mol',        exact: true },
  { id: 'G',   sym: 'G',   sub: '',   v: '6.67430e-11',      unit: 'm³/(kg s²)' },
  { id: 'g',   sym: 'g',   sub: 'n',  v: '9.80665',          unit: 'm/s²',         exact: true },
  { id: 'me',  sym: 'm',   sub: 'e',  v: '9.1093837139e-31', unit: 'kg' },
  { id: 'mp',  sym: 'm',   sub: 'p',  v: '1.67262192595e-27',unit: 'kg' },
  { id: 'mn',  sym: 'm',   sub: 'n',  v: '1.67492750056e-27',unit: 'kg' },
  { id: 'u',   sym: 'u',   sub: '',   v: '1.66053906892e-27',unit: 'kg' },
  { id: 'eps0',sym: 'ε',   sub: '0',  v: '8.8541878188e-12', unit: 'F/m' },
  { id: 'mu0', sym: 'μ',   sub: '0',  v: '1.25663706127e-6', unit: 'N/A²' },
  { id: 'a0',  sym: 'a',   sub: '0',  v: '5.29177210544e-11',unit: 'm' },
  { id: 'Rinf',sym: 'R',   sub: '∞',  v: '10973731.568157',  unit: '1/m' },
  { id: 'alpha',sym:'α',   sub: '',   v: '7.2973525643e-3',  unit: '' },
  { id: 'sigma',sym:'σ',   sub: '',   v: null,               unit: 'W/(m² K⁴)',    exact: true },
  { id: 'Vm',  sym: 'V',   sub: 'm',  v: null,               unit: 'm³/mol (0 °C, 101.325 kPa)', exact: true },
  { id: 'atm', sym: 'atm', sub: '',   v: '101325',           unit: 'Pa',           exact: true },
  { id: 't0',  sym: 'T',   sub: '0',  v: '273.15',           unit: 'K',            exact: true }
];
var CONST_MAP = {};
(function () {
  CONSTANTS.forEach(function (c) { if (c.v) c.val = xr(rFromDecimal(c.v)); CONST_MAP[c.id] = c; });
  var h = CONST_MAP.h.val, NA = CONST_MAP.NA.val, k = CONST_MAP.k.val, e = CONST_MAP.qe.val;
  CONST_MAP.hbar.val = F(toNum(h) / (2 * Math.PI));
  CONST_MAP.R.val = mul(NA, k);
  CONST_MAP.F.val = mul(NA, e);
  CONST_MAP.Vm.val = div(mul(CONST_MAP.R.val, CONST_MAP.t0.val), CONST_MAP.atm.val);   // RT₀/p₀
  // σ = 2π⁵k⁴/(15h³c²)
  var kk = toNum(k), hh = toNum(h), cc = 299792458;
  CONST_MAP.sigma.val = F(2 * Math.pow(Math.PI, 5) * Math.pow(kk, 4) / (15 * hh * hh * hh * cc * cc));
})();

// ---------------------------------------------------------------- 단위 바꾸기 (정의값만)
// f: 곱할 수(정확한 10진). 온도만 식이 따로
var CONVERSIONS = [
  { id: 'in>cm',  from: 'in',  to: 'cm',  f: '2.54' },
  { id: 'cm>in',  from: 'cm',  to: 'in',  f: '1/2.54' },
  { id: 'ft>m',   from: 'ft',  to: 'm',   f: '0.3048' },
  { id: 'm>ft',   from: 'm',   to: 'ft',  f: '1/0.3048' },
  { id: 'yd>m',   from: 'yd',  to: 'm',   f: '0.9144' },
  { id: 'm>yd',   from: 'm',   to: 'yd',  f: '1/0.9144' },
  { id: 'mile>km',from: 'mile',to: 'km',  f: '1.609344' },
  { id: 'km>mile',from: 'km',  to: 'mile',f: '1/1.609344' },
  { id: 'lb>kg',  from: 'lb',  to: 'kg',  f: '0.45359237' },
  { id: 'kg>lb',  from: 'kg',  to: 'lb',  f: '1/0.45359237' },
  { id: 'oz>g',   from: 'oz',  to: 'g',   f: '28.349523125' },
  { id: 'g>oz',   from: 'g',   to: 'oz',  f: '1/28.349523125' },
  { id: 'gal>L',  from: 'gal(US)', to: 'L', f: '3.785411784' },
  { id: 'L>gal',  from: 'L',   to: 'gal(US)', f: '1/3.785411784' },
  { id: 'atm>Pa', from: 'atm', to: 'Pa',  f: '101325' },
  { id: 'Pa>atm', from: 'Pa',  to: 'atm', f: '1/101325' },
  { id: 'kWh>MJ', from: 'kWh', to: 'MJ',  f: '3.6' },
  { id: 'cal>J',  from: 'cal', to: 'J',   f: '4.184' },
  { id: 'J>cal',  from: 'J',   to: 'cal', f: '1/4.184' },
  { id: 'km/h>m/s', from: 'km/h', to: 'm/s', f: '1/3.6' },
  { id: 'm/s>km/h', from: 'm/s', to: 'km/h', f: '3.6' },
  { id: 'pyeong>m2', from: '평', to: 'm²', f: '400/121' },
  { id: 'm2>pyeong', from: 'm²', to: '평', f: '121/400' },
  { id: 'F>C',    from: '°F',  to: '°C',  temp: 'FC' },
  { id: 'C>F',    from: '°C',  to: '°F',  temp: 'CF' }
];
var CONV_MAP = {};
CONVERSIONS.forEach(function (c) {
  if (c.f) {
    var parts = c.f.split('/');
    c.val = parts.length === 2 ? xr(rdiv(rFromDecimal(parts[0]), rFromDecimal(parts[1]))) : xr(rFromDecimal(c.f));
  }
  CONV_MAP[c.id] = c;
});
function convert(id, a) {
  var c = CONV_MAP[id]; if (!c) throw synErr('conv');
  if (isC(a)) throw mathErr('complexarg');
  if (c.temp === 'FC') return mul(sub(a, xint(32)), xr(R(5n, 9n)));
  if (c.temp === 'CF') return add(mul(a, xr(R(9n, 5n))), xint(32));
  return mul(a, c.val);
}

// ---------------------------------------------------------------- 함수 목록
// arity: 인수 개수 [최소, 최대]
var FUNCS = {
  sin: [1, 1], cos: [1, 1], tan: [1, 1], asin: [1, 1], acos: [1, 1], atan: [1, 1],
  sinh: [1, 1], cosh: [1, 1], tanh: [1, 1], asinh: [1, 1], acosh: [1, 1], atanh: [1, 1],
  ln: [1, 1], log: [1, 2], exp: [1, 1], sqrt: [1, 1], abs: [1, 1],
  Int: [1, 1], Intg: [1, 1], Rnd: [1, 1], GCD: [2, 10], LCM: [2, 10],
  Pol: [2, 2], Rec: [2, 2], RanInt: [2, 2], Ran: [0, 0],
  Conjg: [1, 1], Arg: [1, 1], ReP: [1, 1], ImP: [1, 1]
};
// 키보드로 친 글자 → 함수 이름 (소문자로 비교)
var NAME_ALIASES = {
  sin: 'sin', cos: 'cos', tan: 'tan', asin: 'asin', acos: 'acos', atan: 'atan', arcsin: 'asin', arccos: 'acos', arctan: 'atan',
  sinh: 'sinh', cosh: 'cosh', tanh: 'tanh', asinh: 'asinh', acosh: 'acosh', atanh: 'atanh',
  ln: 'ln', log: 'log', exp: 'exp', sqrt: '#sqrt', abs: '#abs', pi: '#π', ans: '#Ans',
  int: 'Int', intg: 'Intg', rnd: 'Rnd', gcd: 'GCD', lcm: 'LCM', pol: 'Pol', rec: 'Rec',
  ranint: 'RanInt', ran: 'Ran', conjg: 'Conjg', arg: 'Arg', rep: 'ReP', imp: 'ImP'
};
var VARS = ['A', 'B', 'C', 'D', 'M', 'x', 'y'];

// ---------------------------------------------------------------- 식 모양 (편집기와 같은 구조)
// 줄(row) = 마디 배열.  마디:
//   {t:'c', v:'7'}   글자 하나: 숫자 . + − × ÷ ( ) , ! % ° ′ ″ ∠ π e i Ans ᴇ P C ÷R 변수(A B C D M x y)
//   {t:'l', v:'q'}   아직 뜻을 정하지 않은 영문자(키보드)
//   {t:'f', v:'sin'} 함수 이름
//   {t:'k', v:'c0'}  물리 상수,  {t:'u', v:'in>cm'} 단위 바꾸기(뒤에 붙음)
//   틀: {t:'frac',a,b} {t:'sqrt',a} {t:'root',n,a} {t:'pow',a} {t:'abs',a} {t:'log',n,a}
//       {t:'int',a,lo,hi} {t:'der',a,at} {t:'sum',a,lo,hi} {t:'prd',a,lo,hi} {t:'mixed',w,a,b}
var TEMPLATE_SLOTS = {
  frac: ['a', 'b'], sqrt: ['a'], root: ['n', 'a'], pow: ['a'], abs: ['a'], log: ['n', 'a'],
  int: ['a', 'lo', 'hi'], der: ['a', 'at'], sum: ['a', 'lo', 'hi'], prd: ['a', 'lo', 'hi'], mixed: ['w', 'a', 'b']
};
function isTemplate(n) { return !!TEMPLATE_SLOTS[n.t]; }
function makeTemplate(t) {
  var n = { t: t };
  TEMPLATE_SLOTS[t].forEach(function (s) { n[s] = []; });
  return n;
}
function cloneRow(row) { return row.map(cloneNode); }
function cloneNode(n) {
  var o = {}; for (var k in n) o[k] = Array.isArray(n[k]) ? cloneRow(n[k]) : n[k];
  return o;
}

// ---------------------------------------------------------------- 글자 식 → 줄 (시험·붙여넣기·모드 입력용)
// 문법: 2+3*4, 2^10, 1/3 (나누기), frac(1,3), sqrt(2), root(3,8), abs(-2), logb(2,8), int(x^2,0,1),
//       der(x^3,2), sum(x,1,10), prod(x,1,5), mixed(1,1,2), 5P2, 5C2, 30°15′, 3E5, pi, π, Ans, sin(30)
var TEXT_TEMPLATES = { frac: 'frac', sqrt: 'sqrt', root: 'root', abs: 'abs', logb: 'log', int: 'int', integral: 'int',
  der: 'der', sum: 'sum', prod: 'prd', mixed: 'mixed' };
function parseText(str) {
  var i = 0, s = String(str);
  function row(stopChars) {
    var out = [], depth = 0;                  // 안쪽 괄호 abs(sin(x)) 의 ) , 에서 멈추지 않게
    while (i < s.length) {
      var ch = s[i];
      if (stopChars && depth === 0 && stopChars.indexOf(ch) >= 0) break;
      if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
      if (/[0-9.]/.test(ch)) { out.push({ t: 'c', v: ch }); i++; continue; }
      if ((ch === 'E' || ch === 'ᴇ') && out.length && /[0-9.]/.test(out[out.length - 1].v || '')) { out.push({ t: 'c', v: 'ᴇ' }); i++; continue; }
      if (ch === '*' || ch === '×' || ch === '·') { out.push({ t: 'c', v: '×' }); i++; continue; }
      if (ch === '/' || ch === '÷') { out.push({ t: 'c', v: '÷' }); i++; continue; }
      if (ch === '-' || ch === '−' || ch === '–') { out.push({ t: 'c', v: '−' }); i++; continue; }
      if ('+(),!%°∠'.indexOf(ch) >= 0) {
        if (ch === '(') depth++; else if (ch === ')' && depth > 0) depth--;
        out.push({ t: 'c', v: ch }); i++; continue;
      }
      if (ch === "'" || ch === '′') { out.push({ t: 'c', v: '′' }); i++; continue; }
      if (ch === '"' || ch === '″') { out.push({ t: 'c', v: '″' }); i++; continue; }
      if (ch === 'π') { out.push({ t: 'c', v: 'π' }); i++; continue; }
      if (ch === '²') { out.push({ t: 'pow', a: [{ t: 'c', v: '2' }] }); i++; continue; }
      if (ch === '³') { out.push({ t: 'pow', a: [{ t: 'c', v: '3' }] }); i++; continue; }
      if (ch === '√') { i++; out.push({ t: 'sqrt', a: operand() }); continue; }
      if (ch === '|') { i++; var ab = { t: 'abs', a: row('|') }; if (s[i] === '|') i++; out.push(ab); continue; }   // |x−3| (겹친 |…| 은 abs( ) 로)
      if (ch === '^') { i++; out.push({ t: 'pow', a: operand() }); continue; }
      if (/[A-Za-z]/.test(ch)) {
        var m = /^[A-Za-z]+/.exec(s.slice(i))[0];
        if (m === 'Ans') { out.push({ t: 'c', v: 'Ans' }); i += 3; continue; }
        if (m === 'pi') { out.push({ t: 'c', v: 'π' }); i += 2; continue; }
        if (m === 'R' && out.length && out[out.length - 1].v === '÷') { out[out.length - 1] = { t: 'c', v: '÷R' }; i++; continue; }
        if (m === 'mod' ) { out.push({ t: 'c', v: '÷R' }); i += 3; continue; }
        if (TEXT_TEMPLATES[m] && s[i + m.length] === '(') {
          i += m.length + 1;
          var tt = TEXT_TEMPLATES[m], node = makeTemplate(tt), slots = TEMPLATE_SLOTS[tt];
          // 글자 순서: frac(a,b) root(n,a) logb(n,a) int(a,lo,hi) der(a,at) sum(a,lo,hi) mixed(w,a,b)
          for (var k = 0; k < slots.length; k++) {
            node[slots[k]] = row(k === slots.length - 1 ? ')' : ',');
            if (s[i] === ',' || s[i] === ')') i++;
          }
          out.push(node); continue;
        }
        var lower = m.toLowerCase();
        // 함수 이름이 붙어 있는 경우(“sin”) 그대로, 상수 id는 #이름
        if (m[0] === '#' ) {}
        if (FUNCS[m] || (NAME_ALIASES[lower] && NAME_ALIASES[lower][0] !== '#' && s[i + m.length] === '(')) {
          var fname = FUNCS[m] ? m : NAME_ALIASES[lower];
          out.push({ t: 'f', v: fname }); i += m.length; continue;
        }
        if (lower === 'sqrt' && s[i + 4] === '(') { i += 5; var sq = { t: 'sqrt', a: row(')') }; if (s[i] === ')') i++; out.push(sq); continue; }
        // 한 글자씩: P C 는 순열·조합, 나머지는 변수/상수
        for (var j = 0; j < m.length; j++) {
          var c = m[j];
          if (c === 'P' || c === 'C') out.push({ t: 'c', v: c });
          else if (c === 'e') out.push({ t: 'c', v: 'e' });
          else if (c === 'i') out.push({ t: 'c', v: 'i' });
          else if (c === 'x' || c === 'y') out.push({ t: 'c', v: c });
          else if (/[abdmABDM]/.test(c)) out.push({ t: 'c', v: c.toUpperCase() });
          else if (c === 'c') out.push({ t: 'c', v: 'C_' });
          else out.push({ t: 'l', v: c });
        }
        i += m.length; continue;
      }
      if (ch === '[') {                       // [c0] 같은 상수, [in>cm] 단위
        var close = s.indexOf(']', i);
        var id = s.slice(i + 1, close); i = close + 1;
        if (CONST_MAP[id]) out.push({ t: 'k', v: id }); else if (CONV_MAP[id]) out.push({ t: 'u', v: id }); else out.push({ t: 'l', v: '?' });
        continue;
      }
      out.push({ t: 'l', v: ch }); i++;
    }
    return out;
  }
  // ^ 뒤의 지수: 괄호 덩어리 하나, 또는 부호+숫자/이름 하나
  function operand() {
    var out = [];
    if (s[i] === '(') {
      i++; out = row(')'); if (s[i] === ')') i++;
      return out;
    }
    if (s[i] === '-' || s[i] === '−') { out.push({ t: 'c', v: '−' }); i++; }
    var m = /^([0-9.]+|[A-Za-zπ]+)/.exec(s.slice(i));
    if (m) {
      var sub = m[0]; i += sub.length;
      var save = i, saveS = s;
      s = sub; i = 0; out = out.concat(row()); s = saveS; i = save;
    }
    return out;
  }
  var r = row();
  if (i < s.length) throw synErr('paren');
  return r;
}
// 줄 → 글자 식 (복사·기록용, parseText 로 되돌릴 수 있게)
function rowToText(row) {
  var out = '';
  row.forEach(function (n) {
    switch (n.t) {
      case 'c':
        out += n.v === '×' ? '*' : n.v === '÷' ? '/' : n.v === '−' ? '-' : n.v === 'ᴇ' ? 'E' : n.v === '÷R' ? ' mod ' :
          n.v === 'C_' ? 'c' : n.v === '′' ? "'" : n.v === '″' ? '"' : n.v; break;
      case 'l': out += n.v; break;
      case 'f': out += n.v; break;
      case 'k': out += '[' + n.v + ']'; break;
      case 'u': out += '[' + n.v + ']'; break;
      case 'frac': out += 'frac(' + rowToText(n.a) + ',' + rowToText(n.b) + ')'; break;
      case 'sqrt': out += 'sqrt(' + rowToText(n.a) + ')'; break;
      case 'root': out += 'root(' + rowToText(n.n) + ',' + rowToText(n.a) + ')'; break;
      case 'pow': out += '^(' + rowToText(n.a) + ')'; break;
      case 'abs': out += 'abs(' + rowToText(n.a) + ')'; break;
      case 'log': out += 'logb(' + rowToText(n.n) + ',' + rowToText(n.a) + ')'; break;
      case 'int': out += 'int(' + rowToText(n.a) + ',' + rowToText(n.lo) + ',' + rowToText(n.hi) + ')'; break;
      case 'der': out += 'der(' + rowToText(n.a) + ',' + rowToText(n.at) + ')'; break;
      case 'sum': out += 'sum(' + rowToText(n.a) + ',' + rowToText(n.lo) + ',' + rowToText(n.hi) + ')'; break;
      case 'prd': out += 'prod(' + rowToText(n.a) + ',' + rowToText(n.lo) + ',' + rowToText(n.hi) + ')'; break;
      case 'mixed': out += 'mixed(' + rowToText(n.w) + ',' + rowToText(n.a) + ',' + rowToText(n.b) + ')'; break;
    }
  });
  return out;
}

// ---------------------------------------------------------------- 낱말 나누기 (줄 → 토큰)
// 토큰: {k:'num', s:'12.5', e: 지수문자열|null} {k:'op', v} {k:'fn', v} {k:'var', v} {k:'const', v}
//       {k:'tpl', n} {k:'pow', n} {k:'k', v} {k:'u', v}
function lexRow(row) {
  var toks = [], i = 0;
  while (i < row.length) {
    var n = row[i];
    if (n.t === 'c' && /^[0-9.]$/.test(n.v)) {
      var s = '';
      while (i < row.length && row[i].t === 'c' && /^[0-9.]$/.test(row[i].v)) { s += row[i].v; i++; }
      if ((s.match(/\./g) || []).length > 1) throw synErr('number');
      var tok = { k: 'num', s: s, e: null };
      if (i < row.length && row[i].t === 'c' && row[i].v === 'ᴇ') {
        i++; var es = '';
        if (i < row.length && row[i].t === 'c' && (row[i].v === '−' || row[i].v === '+')) { es = row[i].v === '−' ? '-' : ''; i++; }
        var digs = '';
        while (i < row.length && row[i].t === 'c' && /^[0-9]$/.test(row[i].v)) { digs += row[i].v; i++; }
        if (!digs) throw synErr('number');
        tok.e = es + digs;
      }
      toks.push(tok); continue;
    }
    if (n.t === 'c' && n.v === 'ᴇ') {                // 앞 숫자 없이 ×10^n
      i++; var es2 = '', d2 = '';
      if (i < row.length && row[i].t === 'c' && (row[i].v === '−' || row[i].v === '+')) { es2 = row[i].v === '−' ? '-' : ''; i++; }
      while (i < row.length && row[i].t === 'c' && /^[0-9]$/.test(row[i].v)) { d2 += row[i].v; i++; }
      if (!d2) throw synErr('number');
      toks.push({ k: 'num', s: '1', e: es2 + d2 }); continue;
    }
    if (n.t === 'l') {
      // 키보드 영문자: 한 글자씩 변수·상수로
      var c = n.v;
      if (c === 'x' || c === 'y') toks.push({ k: 'var', v: c });
      else if (/^[abdm]$/i.test(c)) toks.push({ k: 'var', v: c.toUpperCase() });
      else if (c === 'c' || c === 'C') toks.push({ k: 'var', v: 'C' });
      else if (c === 'e') toks.push({ k: 'const', v: 'e' });
      else if (c === 'i') toks.push({ k: 'const', v: 'i' });
      else throw synErr('name:' + c);
      i++; continue;
    }
    if (n.t === 'c') {
      var v = n.v;
      if (v === 'π' || v === 'e' || v === 'i') toks.push({ k: 'const', v: v });
      else if (v === 'Ans') toks.push({ k: 'var', v: 'Ans' });
      else if (v === 'C_') toks.push({ k: 'var', v: 'C' });
      else if (VARS.indexOf(v) >= 0 && v !== 'C') toks.push({ k: 'var', v: v });
      else toks.push({ k: 'op', v: v });          // + − × ÷ ( ) , ! % ° ′ ″ ∠ P C ÷R
      i++; continue;
    }
    if (n.t === 'f') { toks.push({ k: 'fn', v: n.v }); i++; continue; }
    if (n.t === 'k') { toks.push({ k: 'k', v: n.v }); i++; continue; }
    if (n.t === 'u') { toks.push({ k: 'u', v: n.v }); i++; continue; }
    if (n.t === 'pow') { toks.push({ k: 'pow', n: n }); i++; continue; }
    if (isTemplate(n)) { toks.push({ k: 'tpl', n: n }); i++; continue; }
    throw synErr('node');
  }
  return toks;
}

// ---------------------------------------------------------------- 문법 → 나무(AST)
// 우선순위(카시오 fx 시리즈와 같음, 높은 쪽이 먼저):
//   괄호 함수 > 뒤에 붙는 것(x², x⁻¹, !, %, °′″, 단위) > 거듭제곱 > 분수 > 앞 부호(−)
//   > 곱하기 기호 생략(2π, 2(3)) > 순열·조합 nPr nCr, 극형식 ∠ > × ÷ > + − > 나머지 나눗셈 ÷R
function parseRow(row) {
  var toks = lexRow(row), p = 0;
  function peek() { return toks[p]; }
  function isOp(t, v) { return t && t.k === 'op' && t.v === v; }
  function canStartAtom(t) {
    if (!t) return false;
    if (t.k === 'num' || t.k === 'fn' || t.k === 'var' || t.k === 'const' || t.k === 'tpl' || t.k === 'k') return true;
    return isOp(t, '(');
  }
  function expr() {
    var a = sum();
    if (isOp(peek(), '÷R')) { p++; var b = sum(); return { k: 'divr', a: a, b: b }; }
    return a;
  }
  function sum() {
    var a = term();
    while (isOp(peek(), '+') || isOp(peek(), '−')) {
      var o = toks[p++].v; var b = term();
      a = { k: o === '+' ? 'add' : 'sub', a: a, b: b };
    }
    return a;
  }
  function term() {
    var a = comb();
    while (isOp(peek(), '×') || isOp(peek(), '÷')) {
      var o = toks[p++].v; var b = comb();
      a = { k: o === '×' ? 'mul' : 'div', a: a, b: b };
    }
    return a;
  }
  function comb() {
    var a = implicit();
    while (isOp(peek(), 'P') || isOp(peek(), 'C') || isOp(peek(), '∠')) {
      var o = toks[p++].v; var b = implicit();
      a = { k: o === 'P' ? 'perm' : o === 'C' ? 'comb' : 'polar', a: a, b: b };
    }
    return a;
  }
  function implicit() {
    var a = unary();
    while (canStartAtom(peek())) { var b = unary(); a = { k: 'mul', a: a, b: b, imp: true }; }
    return a;
  }
  // 단위 바꾸기는 부호까지 포함한 값에 (−40 °C▶°F = −40)
  function unaryCore() {
    if (isOp(peek(), '−')) { p++; return { k: 'neg', a: unaryCore() }; }
    if (isOp(peek(), '+')) { p++; return unaryCore(); }
    return postfix();
  }
  function unary() {
    var a = unaryCore();
    while (peek() && peek().k === 'u') { a = { k: 'conv', id: toks[p].v, a: a }; p++; }
    return a;
  }
  function postfix() {
    var a = atom();
    for (;;) {
      var t = peek();
      if (!t) break;
      if (t.k === 'pow') { p++; a = { k: 'pow', a: a, b: parseRow(t.n.a) }; continue; }
      if (isOp(t, '!')) { p++; a = { k: 'fact', a: a }; continue; }
      if (isOp(t, '%')) { p++; a = { k: 'pct', a: a }; continue; }
      break;
    }
    return a;
  }
  function dmsTail(first) {
    // 숫자 ° [숫자 ′ [숫자 ″]]
    var d = first, m = null, s = null;
    if (toks[p] && toks[p].k === 'num' && isOp(toks[p + 1], '′')) { m = numNode(toks[p]); p += 2; }
    if (toks[p] && toks[p].k === 'num' && isOp(toks[p + 1], '″')) { s = numNode(toks[p]); p += 2; }
    return { k: 'dms', d: d, m: m, s: s };
  }
  function numNode(t) {
    var v = rFromDecimal(t.s + (t.e !== null ? 'e' + t.e : ''));
    return { k: 'num', v: v };
  }
  function atom() {
    var t = toks[p];
    if (!t) throw synErr('end');
    if (t.k === 'num') {
      p++;
      var nn = numNode(t);
      if (isOp(peek(), '°')) { p++; return dmsTail(nn); }
      if (isOp(peek(), '′')) { p++; return { k: 'dms', d: { k: 'num', v: R0 }, m: nn, s: null }; }
      return nn;
    }
    if (t.k === 'var') { p++; return { k: 'var', v: t.v }; }
    if (t.k === 'const') { p++; return { k: 'const', v: t.v }; }
    if (t.k === 'k') { p++; return { k: 'pconst', v: t.v }; }
    if (isOp(t, '(')) {
      p++;
      var e = expr();
      if (isOp(peek(), ')')) p++;
      else if (p < toks.length) throw synErr('paren');
      return { k: 'group', a: e };
    }
    if (t.k === 'fn') {
      p++;
      var name = t.v;
      if (name === 'Ran') {               // Ran# 는 괄호 없이
        if (isOp(peek(), '(') && isOp(toks[p + 1], ')')) p += 2;
        return { k: 'call', f: 'Ran', args: [] };
      }
      if (!isOp(peek(), '(')) throw synErr('fnparen');
      p++;
      var args = [];
      if (!isOp(peek(), ')')) {
        args.push(expr());
        while (isOp(peek(), ',')) { p++; args.push(expr()); }
      }
      if (isOp(peek(), ')')) p++;
      else if (p < toks.length) throw synErr('paren');
      var ar = FUNCS[name];
      if (!ar || args.length < ar[0] || args.length > ar[1]) throw synErr('args');
      return { k: 'call', f: name, args: args };
    }
    if (t.k === 'tpl') {
      p++;
      var n = t.n;
      switch (n.t) {
        case 'frac': return { k: 'frac', a: parseRow(n.a), b: parseRow(n.b) };
        case 'sqrt': return { k: 'sqrt', a: parseRow(n.a) };
        case 'root': return { k: 'root', n: parseRow(n.n), a: parseRow(n.a) };
        case 'abs': return { k: 'call', f: 'abs', args: [parseRow(n.a)] };
        case 'log': return { k: 'logb', n: parseRow(n.n), a: parseRow(n.a) };
        case 'int': return { k: 'int', a: parseRow(n.a), lo: parseRow(n.lo), hi: parseRow(n.hi) };
        case 'der': return { k: 'der', a: parseRow(n.a), at: parseRow(n.at) };
        case 'sum': return { k: 'sum', a: parseRow(n.a), lo: parseRow(n.lo), hi: parseRow(n.hi) };
        case 'prd': return { k: 'prd', a: parseRow(n.a), lo: parseRow(n.lo), hi: parseRow(n.hi) };
        case 'mixed': return { k: 'mixed', w: parseRow(n.w), a: parseRow(n.a), b: parseRow(n.b) };
      }
    }
    throw synErr('unexpected');
  }
  if (toks.length === 0) throw synErr('empty');
  var tree = expr();
  if (p < toks.length) throw synErr('trailing');
  return tree;
}

// ---------------------------------------------------------------- 계산
// env: {angle:'deg'|'rad'|'gra', complex:bool, vars:{A..}, ans:값, x:값(미적분 안), rnd: 반올림 함수, random}
function evaluate(node, env) {
  switch (node.k) {
    case 'num': return xr(node.v);
    case 'group': return evaluate(node.a, env);
    case 'var':
      if (node.v === 'Ans') return env.ans || ZERO;
      if (node.v === 'x' && env.x) return env.x;
      return (env.vars && env.vars[node.v]) || ZERO;
    case 'const':
      if (node.v === 'π') return PI;
      if (node.v === 'e') return E_CONST;
      if (node.v === 'i') { if (!env.complex) throw mathErr('complexoff'); return cx(ZERO, ONE); }
      break;
    case 'pconst': return CONST_MAP[node.v].val;
    case 'add': return add(evaluate(node.a, env), evaluate(node.b, env));
    case 'sub': return sub(evaluate(node.a, env), evaluate(node.b, env));
    case 'mul': return mul(evaluate(node.a, env), evaluate(node.b, env));
    case 'div': return div(evaluate(node.a, env), evaluate(node.b, env));
    case 'frac': return div(evaluate(node.a, env), evaluate(node.b, env));
    case 'neg': return neg(evaluate(node.a, env));
    case 'pow': return powv(evaluate(node.a, env), evaluate(node.b, env), env);
    case 'sqrt': return sqrtv(evaluate(node.a, env), env);
    case 'root': return rootv(evaluate(node.n, env), evaluate(node.a, env), env);
    case 'logb': return logbv(evaluate(node.n, env), evaluate(node.a, env), env);
    case 'fact': return factorialv(realOnly(evaluate(node.a, env)));
    case 'pct': return div(evaluate(node.a, env), xint(100));
    case 'perm': return permv(realOnly(evaluate(node.a, env)), realOnly(evaluate(node.b, env)));
    case 'comb': return combv(realOnly(evaluate(node.a, env)), realOnly(evaluate(node.b, env)));
    case 'conv': return convert(node.id, evaluate(node.a, env));
    case 'polar': {
      if (!env.complex) throw mathErr('complexoff');
      var r = realOnly(evaluate(node.a, env)), th = realOnly(evaluate(node.b, env));
      return cx(mul(r, trig('cos', th, env.angle)), mul(r, trig('sin', th, env.angle)));
    }
    case 'dms': {
      var v = realOnly(evaluate(node.d, env));
      if (node.m) v = add(v, div(realOnly(evaluate(node.m, env)), xint(60)));
      if (node.s) v = add(v, div(realOnly(evaluate(node.s, env)), xint(3600)));
      return v;
    }
    case 'mixed': {
      var w = realOnly(evaluate(node.w, env)), f = div(realOnly(evaluate(node.a, env)), realOnly(evaluate(node.b, env)));
      return sign(w) < 0 ? sub(w, f) : add(w, f);
    }
    case 'divr': {
      var a = realOnly(evaluate(node.a, env)), b = realOnly(evaluate(node.b, env));
      if (!realIsInt(a) || !realIsInt(b)) throw mathErr('domain');
      var A = toBigInt(a), Bv = toBigInt(b);
      if (Bv === 0n) throw mathErr('div0');
      if (A < 0n || Bv < 0n) throw mathErr('domain');
      return { t: 'multi', kind: 'divr', items: [{ label: 'Q', v: xr(R(A / Bv)) }, { label: 'R', v: xr(R(A % Bv)) }] };
    }
    case 'call': return callFn(node, env);
    case 'int': return integrate(node, env);
    case 'der': return derivative(node, env);
    case 'sum': return sumProd(node, env, true);
    case 'prd': return sumProd(node, env, false);
  }
  throw synErr('node:' + node.k);
}
function realOnly(v) { if (v && v.t === 'multi') throw mathErr('multi'); if (isC(v)) throw mathErr('complexarg'); return v; }
function noMulti(v) { if (v && v.t === 'multi') throw mathErr('multi'); return v; }

function callFn(node, env) {
  var f = node.f;
  var args = node.args.map(function (a) { return noMulti(evaluate(a, env)); });
  var a = args[0];
  switch (f) {
    case 'sin': case 'cos': case 'tan': return trig(f, a, env.angle);
    case 'asin': case 'acos': case 'atan': return atrig(f, a, env.angle);
    case 'sinh': return F(Math.sinh(toNum(realOnly(a))));
    case 'cosh': return F(Math.cosh(toNum(realOnly(a))));
    case 'tanh': return F(Math.tanh(toNum(realOnly(a))));
    case 'asinh': return F(Math.asinh(toNum(realOnly(a))));
    case 'acosh': { var x = toNum(realOnly(a)); if (x < 1) throw mathErr('domain'); return F(Math.acosh(x)); }
    case 'atanh': { var y = toNum(realOnly(a)); if (Math.abs(y) >= 1) throw mathErr('domain'); return F(Math.atanh(y)); }
    case 'ln': return lnv(a, env);
    case 'log': return args.length === 2 ? logbv(args[0], args[1], env) : log10v(a, env);
    case 'exp': return isC(a) ? cexp(a) : powv(E_CONST, a, env);
    case 'sqrt': return sqrtv(a, env);
    case 'abs': return absv(a);
    case 'Int': return intPart(a);
    case 'Intg': return intgPart(a);
    case 'Rnd': return env.rnd ? env.rnd(realOnly(a)) : a;
    case 'GCD': return gcdv(args.map(realOnly));
    case 'LCM': return lcmv(args.map(realOnly));
    case 'RanInt': {
      var lo = toBigInt(realOnly(args[0])), hi = toBigInt(realOnly(args[1]));
      if (lo > hi) throw mathErr('domain');
      var span = Number(hi - lo + 1n), rnd = env.random || Math.random;
      return xr(R(lo + BigInt(Math.floor(rnd() * span))));
    }
    case 'Ran': { var rr = env.random || Math.random; return xr(R(BigInt(Math.floor(rr() * 1000)), 1000n)); }
    case 'Pol': {
      var px = realOnly(args[0]), py = realOnly(args[1]);
      var r = sqrtv(add(mul(px, px), mul(py, py)), { complex: false });
      var th = (isZero(px) && isZero(py)) ? ZERO : atan2v(py, px, env.angle);
      return { t: 'multi', kind: 'pol', items: [{ label: 'r', v: r }, { label: 'θ', v: th }] };
    }
    case 'Rec': {
      var rr2 = realOnly(args[0]), t2 = realOnly(args[1]);
      return { t: 'multi', kind: 'rec', items: [{ label: 'x', v: mul(rr2, trig('cos', t2, env.angle)) }, { label: 'y', v: mul(rr2, trig('sin', t2, env.angle)) }] };
    }
    case 'Conjg': return isC(a) ? cx(a.re, neg(a.im)) : a;
    case 'Arg': return argv(a, env.angle);
    case 'ReP': return re(a);
    case 'ImP': return im(a);
  }
  throw synErr('fn:' + f);
}

// ---------------------------------------------------------------- 미분·적분·Σ·Π
function evalAtX(tree, env, xv) {
  var e2 = Object.create(env); e2.x = xv;
  return noMulti(evaluate(tree, e2));
}
function fnum(tree, env) {
  return function (x) {
    var v = evalAtX(tree, env, F(x));
    if (isC(v)) throw mathErr('complexarg');
    return toNum(v);
  };
}
// 적응형 가우스-크론로드(7-15점)
var GK_X = [0.991455371120812639206854697526329, 0.949107912342758524526189684047851, 0.864864423359769072789712788640926,
  0.741531185599394439863864773280788, 0.586087235467691130294144845693013, 0.405845151377397166906606412076961,
  0.207784955007898467600689403773245, 0];
var GK_WK = [0.022935322010529224963732008058970, 0.063092092629978553290700663189204, 0.104790010322250183839876322541518,
  0.140653259715525918745189590510238, 0.169004726639267902826583426598550, 0.190350578064785409913256402421014,
  0.204432940075298892414161999234649, 0.209482141084727828012999174891714];
var GK_WG = [0, 0.129484966168869693270611432679082, 0, 0.279705391489276667901467771423780, 0,
  0.381830050505118944950369775488975, 0, 0.417959183673469387755102040816327];
function gk15(f, a, b) {
  var c = (a + b) / 2, h = (b - a) / 2, fc = f(c);
  var k = fc * GK_WK[7], g = fc * GK_WG[7];
  for (var i = 0; i < 7; i++) {
    var dx = h * GK_X[i], f1 = f(c - dx), f2 = f(c + dx);
    k += GK_WK[i] * (f1 + f2); g += GK_WG[i] * (f1 + f2);
  }
  return { v: k * h, err: Math.abs((k - g) * h) };
}
function integrateNum(f, a, b) {
  if (a === b) return 0;
  var sgn = 1; if (a > b) { var t = a; a = b; b = t; sgn = -1; }
  var parts = [], first = gk15(f, a, b);
  parts.push({ a: a, b: b, v: first.v, err: first.err });
  var total = first.v, err = first.err, n = 0;
  while (err > Math.max(1e-13, 1e-12 * Math.abs(total)) && n < 400) {
    // 오차가 가장 큰 구간을 반으로
    var wi = 0;
    for (var i = 1; i < parts.length; i++) if (parts[i].err > parts[wi].err) wi = i;
    var w = parts[wi], m = (w.a + w.b) / 2;
    if (m <= w.a || m >= w.b) break;
    var L = gk15(f, w.a, m), Rr = gk15(f, m, w.b);
    parts.splice(wi, 1, { a: w.a, b: m, v: L.v, err: L.err }, { a: m, b: w.b, v: Rr.v, err: Rr.err });
    total = 0; err = 0;
    for (var j = 0; j < parts.length; j++) { total += parts[j].v; err += parts[j].err; }
    n++;
  }
  if (!isFinite(total)) throw mathErr('range');
  if (err > Math.max(1e-6, 1e-6 * Math.abs(total))) throw mathErr('timeout');
  return sgn * total;
}
function integrate(node, env) {
  var a = toNum(realOnly(noMulti(evaluate(node.lo, env)))), b = toNum(realOnly(noMulti(evaluate(node.hi, env))));
  var f = fnum(node.a, env);
  var v = integrateNum(f, a, b);
  return F(snapNum(v));
}
// 리더스 방법(중심 차분 + 리처드슨)
function derivNum(f, x) {
  // 처음 간격은 x 의 1%(최대 0.01). 예전 0.1×|x| 는 점근선·정의역 끝 근처(1/x 의 x=0.05, ln 의 x=0.05)와
  // 아주 큰 x(sin x 의 x=10⁶)에서 틀린 값을 냈다 (2026-10-06 제3자 평가)
  var h = x === 0 ? 0.01 : Math.min(0.01, 0.01 * Math.abs(x)), CON = 1.4, CON2 = CON * CON, NT = 12, SAFE = 2;
  var a = [], err = Infinity, ans = NaN;
  a[0] = [(f(x + h) - f(x - h)) / (2 * h)];
  for (var i = 1; i < NT; i++) {
    h /= CON;
    a[i] = [(f(x + h) - f(x - h)) / (2 * h)];
    var fac = CON2;
    for (var j = 1; j <= i; j++) {
      a[i][j] = (a[i][j - 1] * fac - a[i - 1][j - 1]) / (fac - 1);
      fac *= CON2;
      var errt = Math.max(Math.abs(a[i][j] - a[i][j - 1]), Math.abs(a[i][j] - a[i - 1][j - 1]));
      if (errt <= err) { err = errt; ans = a[i][j]; }
    }
    if (Math.abs(a[i][i] - a[i - 1][i - 1]) >= SAFE * err) break;
  }
  if (!isFinite(ans)) throw mathErr('domain');
  return ans;
}
function derivative(node, env) {
  var x0 = toNum(realOnly(noMulti(evaluate(node.at, env))));
  var f = fnum(node.a, env);
  f(x0);                                      // 그 점에서 정의되지 않으면 여기서 오류
  return F(snapNum(derivNum(f, x0)));
}
// 아주 작은 오차로 정수 옆에 있으면 정수로 (적분·미분 결과)
function snapNum(v) {
  var r = Math.round(v);
  if (r !== 0 && Math.abs(v - r) < 1e-11 * Math.max(1, Math.abs(r))) return r;
  if (Math.abs(v) < 1e-13) return 0;
  return v;
}
function exactBits(a) {
  var m = 0;
  a.v.forEach(function (t) { m = Math.max(m, t.c.n.toString(16).length * 4, t.c.d.toString(16).length * 4); });
  return m;
}
function sumProd(node, env, isSum) {
  var lo = toBigInt(realOnly(noMulti(evaluate(node.lo, env)))), hi = toBigInt(realOnly(noMulti(evaluate(node.hi, env))));
  if (hi < lo) throw mathErr('domain');
  if (hi - lo > 1000000n) throw mathErr('range');
  var acc = isSum ? ZERO : ONE, t0 = Date.now(), n = 0;
  for (var k = lo; k <= hi; k++) {
    var v = evalAtX(node.a, env, xr(R(k)));
    acc = isSum ? add(acc, v) : mul(acc, v);
    // 정확값의 분자·분모가 너무 커지면(Σ1/x 를 수천 항) 소수로 바꿔 이어서 계산한다. 예전엔 탭이 몇십 초 멈췄다 (2026-10-06 제3자 평가)
    if ((++n & 63) === 0) {
      if (acc.t === 'x' && exactBits(acc) > 600) acc = F(toNum(acc));
      if (Date.now() - t0 > 5000) throw mathErr('range');
    }
  }
  return acc;
}

// ---------------------------------------------------------------- 한 번에: 줄 → 값
function calc(row, env) {
  if (typeof row === 'string') row = parseText(row);
  var tree = parseRow(row);
  var v = evaluate(tree, env || defaultEnv());
  if (v.t === 'f') fix(v);
  return v;
}
function defaultEnv() { return { angle: 'deg', complex: false, vars: {}, ans: ZERO }; }

// ---------------------------------------------------------------- 10진수 표시
// 값의 10진 근사: {neg, digits:'12345', exp} = 0.12345 × 10^(exp)
// 정확한 유리수는 BigInt로 정확히 반올림하고, 소수는 15자리로 먼저 반올림한다(카시오 내부 자릿수와 같은 생각)
function decimalSource(v) {
  if (v.t === 'x' && xIsRat(v)) return { rat: xRat(v) };
  if (v.t === 'f' || v.t === 'x') {
    var x = toNum(v);
    if (!isFinite(x)) throw mathErr('range');
    return { num: x };
  }
  throw mathErr('complex');
}
// 유효숫자 sig자리로 반올림 → {neg, m: BigInt(정수, sig자리), e: 10의 지수}  (값 = m × 10^e)
function roundSig(src, sig) {
  if (src.rat) {
    var r = src.rat;
    if (r.n === 0n) return { neg: false, m: 0n, e: 0 };
    var neg = r.n < 0n, n = babs(r.n), d = r.d;
    // 지수 k = floor(log10(n/d))
    var k = n.toString().length - d.toString().length;
    // n/d < 10^k 이면 한 자리 내림 (10^k ≤ n/d < 10^(k+1) 이 되게)
    if (k >= 0 ? n < d * bpow10(k) : n * bpow10(-k) < d) k--;
    var scale = sig - 1 - k;            // m = round(n/d × 10^scale)
    var num = scale >= 0 ? n * bpow10(scale) : n, den = scale >= 0 ? d : d * bpow10(-scale);
    var q = num / den, rem = num % den;
    if (rem * 2n >= den) q += 1n;
    if (q.toString().length > sig) { q = q / 10n; scale -= 1; }   // 9.99… → 10.0
    return { neg: neg, m: q, e: -scale };
  }
  var x = src.num;
  if (x === 0) return { neg: false, m: 0n, e: 0 };
  var neg2 = x < 0; x = Math.abs(x);
  // 15자리로 한 번 반올림한 10진 문자열에서 다시 반올림
  var s = x.toExponential(14);        // d.dddddddddddddde±x
  var mm = /^(\d)\.(\d+)e([+-]\d+)$/.exec(s);
  var digits = mm[1] + mm[2], ex = parseInt(mm[3], 10);
  return roundDigits(neg2, digits, ex, sig);
}
function roundDigits(neg, digits, ex, sig) {   // digits = 첫 자리가 10^ex 자리
  if (digits.length <= sig) {
    var m = BigInt(digits) * bpow10(sig - digits.length);
    return { neg: neg, m: m, e: ex - sig + 1 };
  }
  var head = BigInt(digits.slice(0, sig)), next = parseInt(digits[sig], 10);
  if (next >= 5) head += 1n;
  var e = ex - sig + 1;
  if (head.toString().length > sig) { head /= 10n; e += 1; }
  return { neg: neg, m: head, e: e };
}
// 소수점 아래 n자리로 반올림 (Fix)
function roundFixed(src, n) {
  if (src.rat) {
    var r = src.rat, neg = r.n < 0n, a = babs(r.n) * bpow10(n), q = a / r.d, rem = a % r.d;
    if (rem * 2n >= r.d) q += 1n;
    return { neg: neg && q !== 0n, m: q, e: -n };
  }
  var x = src.num;
  if (x === 0) return { neg: false, m: 0n, e: -n };
  var s = Math.abs(x).toExponential(14), mm = /^(\d)\.(\d+)e([+-]\d+)$/.exec(s);
  var digits = mm[1] + mm[2], ex = parseInt(mm[3], 10);
  var keep = ex + 1 + n;                  // 남길 자릿수
  if (keep <= 0) {
    if (keep === 0 && parseInt(digits[0], 10) >= 5) return { neg: x < 0, m: 1n, e: -n };
    return { neg: false, m: 0n, e: -n };
  }
  var rr = roundDigits(x < 0, digits, ex, keep);
  // e 를 -n 으로 맞춤
  var shift = rr.e + n;
  var m = shift >= 0 ? rr.m * bpow10(shift) : rr.m / bpow10(-shift);
  return { neg: x < 0 && m !== 0n, m: m, e: -n };
}
function exp10Of(src) {     // floor(log10|값|)
  var r = roundSig(src, 15);
  if (r.m === 0n) return 0;
  return r.e + r.m.toString().length - 1;
}
// 표시 설정: {mode:'norm'|'fix'|'sci'|'eng', digits:n}
// 결과: {mant:'1.234', exp:null|정수, neg:bool}
function formatDecimal(v, disp) {
  var src = decimalSource(v);
  disp = disp || { mode: 'norm' };
  var r, mant, exp = null;
  if (disp.mode === 'fix') {
    var e10 = exp10Of(src);
    if (e10 >= 10) return formatDecimal(v, { mode: 'sci', digits: 10 });
    r = roundFixed(src, disp.digits);
    mant = fixedString(r.m, disp.digits);
    return { neg: r.neg, mant: mant, exp: null };
  }
  if (disp.mode === 'sci' || disp.mode === 'eng') {
    var sig = disp.mode === 'sci' ? (disp.digits || 10) : 10;
    r = roundSig(src, sig);
    if (r.m === 0n) return { neg: false, mant: '0', exp: null };
    var ms = r.m.toString();
    exp = r.e + ms.length - 1;
    if (disp.mode === 'eng') {
      var shift = ((exp % 3) + 3) % 3 + (disp.engShift || 0) * 3;
      var e3 = exp - shift;
      mant = trimZeros(placePoint(ms, shift + 1));
      return { neg: r.neg, mant: mant, exp: e3 };
    }
    mant = ms[0] + (ms.length > 1 ? '.' + ms.slice(1) : '');
    if (disp.mode === 'sci' && !disp.digits) mant = trimZeros(mant);
    return { neg: r.neg, mant: mant, exp: exp };
  }
  // 보통: 10자리, |x| ≥ 10^10 또는 |x| < 10^-9 이면 지수 표기
  r = roundSig(src, 10);
  if (r.m === 0n) return { neg: false, mant: '0', exp: null };
  var s = r.m.toString();
  var e = r.e + s.length - 1;               // 첫 자리의 자리 지수
  var plain = trimZeros(placePoint(s, e + 1));
  // 10자리 넘는 큰 수, 0.000000001보다 작은 수, 또는 소수로 쓰면 숫자가 12개를 넘는 작은 수는 지수 표기
  if (e >= 10 || e < -9 || plain.replace(/[^0-9]/g, '').length > 12) {
    return { neg: r.neg, mant: trimZeros(s[0] + '.' + s.slice(1)), exp: e };
  }
  return { neg: r.neg, mant: plain, exp: null };
}
function placePoint(s, intDigits) {       // s 의 앞 intDigits 자리가 정수 부분
  if (intDigits <= 0) return '0.' + '0'.repeat(-intDigits) + s;
  if (intDigits >= s.length) return s + '0'.repeat(intDigits - s.length);
  return s.slice(0, intDigits) + '.' + s.slice(intDigits);
}
function trimZeros(s) { if (s.indexOf('.') < 0) return s; return s.replace(/0+$/, '').replace(/\.$/, ''); }
function fixedString(m, n) {
  var s = m.toString();
  if (n === 0) return s;
  while (s.length <= n) s = '0' + s;
  return s.slice(0, s.length - n) + '.' + s.slice(s.length - n);
}
function decimalText(f) {                 // 한 줄 글자 (복사용): 1.5E-12
  var s = (f.neg ? '-' : '') + f.mant;
  if (f.exp !== null) s += 'E' + f.exp;
  return s;
}

// ---------------------------------------------------------------- 정확값 표시 (분수·루트·π)
// 결과: null(소수로 보여야 함) 또는 {neg, num:[{n:BigInt, r:BigInt, p}], den:BigInt}
function exactForm(v) {
  if (v.t !== 'x') return null;
  if (v.v.length === 0) return { neg: false, num: [], den: 1n };
  var D = 1n;
  v.v.forEach(function (t) { D = D / bgcd(D, t.c.d) * t.c.d; });
  var num = v.v.map(function (t) { return { n: t.c.n * (D / t.c.d), r: t.r, p: t.p }; });
  var neg = false;
  if (num.every(function (t) { return t.n < 0n; })) { neg = true; num = num.map(function (t) { return { n: -t.n, r: t.r, p: t.p }; }); }
  return { neg: neg, num: num, den: D };
}
var EXACT_DIGITS = 10;
function exactFits(ef) {
  if (!ef) return false;
  if (ef.num.length > 3) return false;
  if (bdigits(ef.den) > EXACT_DIGITS) return false;
  var total = bdigits(ef.den) > 1 || ef.den > 1n ? bdigits(ef.den) : 0;
  for (var i = 0; i < ef.num.length; i++) {
    var t = ef.num[i];
    if (bdigits(t.n) > EXACT_DIGITS || bdigits(t.r) > EXACT_DIGITS) return false;
    total += bdigits(t.n) + (t.r > 1n ? bdigits(t.r) : 0);
  }
  // 정수 하나는 10자리까지, 분수는 분자+분모 합이 10자리까지(카시오와 같은 기준)
  if (ef.num.length === 1 && ef.num[0].r === 1n && ef.num[0].p === 0 && ef.den === 1n) return bdigits(ef.num[0].n) <= 10;
  return total <= 12;
}
// 정확값으로 보여 줄 수 있는가 (소수 말고)
function hasExactDisplay(v) {
  if (v.t === 'c') return (v.re.t === 'x' && exactFits(exactForm(v.re))) && (v.im.t === 'x' && exactFits(exactForm(v.im)));
  return v.t === 'x' && exactFits(exactForm(v));
}
// 정수가 아닌 유리수인가 (분수 표시가 의미 있는가)
function isFraction(v) { return v.t === 'x' && xIsRat(v) && !risInt(xRat(v)); }

// ---------------------------------------------------------------- 결과 → 표시 줄 (편집기와 같은 마디로)
// opts: {disp, decimal:bool(≈), mixed:bool, dms:bool, polar:bool, angle}
function digitsRow(s) { var out = []; for (var i = 0; i < s.length; i++) out.push({ t: 'c', v: s[i] === '-' ? '−' : s[i] }); return out; }
function decimalRow(f) {
  var row = [];
  if (f.neg) row.push({ t: 'c', v: '−' });
  row = row.concat(digitsRow(f.mant));
  if (f.exp !== null) {
    row.push({ t: 'c', v: '×' }); row = row.concat(digitsRow('10'));
    row.push({ t: 'pow', a: digitsRow(String(f.exp)) });
  }
  return row;
}
function termRow(t) {            // 정수 계수 n, √r, π
  var row = [];
  var showN = !(t.n === 1n && (t.r > 1n || t.p));
  if (showN) row = row.concat(digitsRow(t.n.toString()));
  if (t.r > 1n) row.push({ t: 'sqrt', a: digitsRow(t.r.toString()) });
  if (t.p) row.push({ t: 'c', v: 'π' });
  return row;
}
function exactRow(ef, mixed) {
  if (ef.num.length === 0) return [{ t: 'c', v: '0' }];
  var top = [];
  // 양수 항을 앞으로: (√6−√2)/4, √2−1
  var terms = ef.num.filter(function (t) { return t.n > 0n; }).concat(ef.num.filter(function (t) { return t.n < 0n; }));
  terms.forEach(function (t, i) {
    var tt = t;
    if (i > 0) { if (t.n < 0n) { top.push({ t: 'c', v: '−' }); tt = { n: -t.n, r: t.r, p: t.p }; } else top.push({ t: 'c', v: '+' }); }
    else if (t.n < 0n) { top.push({ t: 'c', v: '−' }); tt = { n: -t.n, r: t.r, p: t.p }; }
    top = top.concat(termRow(tt));
  });
  var row = [];
  if (ef.neg) row.push({ t: 'c', v: '−' });
  if (ef.den === 1n) return row.concat(top);
  var isRat = ef.num.length === 1 && ef.num[0].r === 1n && !ef.num[0].p;
  if (mixed && isRat && ef.num[0].n > ef.den) {
    var w = ef.num[0].n / ef.den, rest = ef.num[0].n % ef.den;
    row.push({ t: 'mixed', w: digitsRow(w.toString()), a: digitsRow(rest.toString()), b: digitsRow(ef.den.toString()) });
    return row;
  }
  row.push({ t: 'frac', a: top, b: digitsRow(ef.den.toString()) });
  return row;
}
function realRow(v, opts) {
  if (opts.dms && v.t !== 'c') return dmsRow(v);
  // Sci·Fix 일 땐 정수도 그 표시로 (카시오: Sci 3 에서 123456 → 1.23×10⁵). 분수·루트는 그대로
  var dm = opts.disp && opts.disp.mode, intFmt = (dm === 'sci' || dm === 'fix') && v.t === 'x' && xIsRat(v) && risInt(xRat(v));
  if (!opts.decimal && v.t === 'x' && !intFmt) {
    var ef = exactForm(v);
    if (exactFits(ef)) return exactRow(ef, opts.mixed);
  }
  return decimalRow(formatDecimal(v, opts.disp));
}
function realText(v, opts) { return rowToPlain(realRow(v, opts)); }
function dmsRow(v) {
  var x = toNum(v), neg = x < 0; x = Math.abs(x);
  // 초를 소수 둘째 자리까지 (반올림하며 60초 넘김)
  var totalCs = Math.round(x * 360000);
  if (Math.abs(x * 360000 - totalCs) > 0.5 && x > 1e9) return decimalRow(formatDecimal(v, { mode: 'norm' }));
  var d = Math.floor(totalCs / 360000), rest = totalCs - d * 360000;
  var m = Math.floor(rest / 6000), cs = rest - m * 6000;
  var s = (cs / 100).toFixed(2).replace(/\.?0+$/, '');
  var row = [];
  if (neg) row.push({ t: 'c', v: '−' });
  row = row.concat(digitsRow(String(d)), [{ t: 'c', v: '°' }], digitsRow(String(m)), [{ t: 'c', v: '′' }], digitsRow(s), [{ t: 'c', v: '″' }]);
  return row;
}
function valueRow(v, opts) {
  opts = opts || {};
  if (v.t === 'multi') {
    var row = [];
    v.items.forEach(function (it, i) {
      if (i) row.push({ t: 'c', v: ',' }, { t: 'c', v: ' ' });
      row.push({ t: 'c', v: it.label }, { t: 'c', v: '=' });
      row = row.concat(realRow(it.v, it.label === 'θ' ? opts : opts));
    });
    return row;
  }
  if (v.t === 'c') {
    if (opts.polar) {
      var r = absv(v), th = argv(v, opts.angle || 'deg');
      return realRow(r, opts).concat([{ t: 'c', v: '∠' }], realRow(th, opts));
    }
    var out = [];
    if (!isZero(v.re)) out = out.concat(realRow(v.re, opts));
    var iv = v.im, ineg = sign(iv) < 0;
    if (ineg) iv = neg(iv);
    if (out.length) out.push({ t: 'c', v: ineg ? '−' : '+' }); else if (ineg) out.push({ t: 'c', v: '−' });
    var one = iv.t === 'x' && xIsRat(iv) && xRat(iv).n === 1n && xRat(iv).d === 1n || iv.t === 'f' && iv.v === 1;   // 1i → i
    if (!one) out = out.concat(realRow(iv, opts));
    out.push({ t: 'c', v: 'i' });
    return out;
  }
  return realRow(v, opts);
}
// 표시 줄 → 한 줄 글자 (읽기·복사용)
function rowToPlain(row) {
  return row.map(function (n) {
    switch (n.t) {
      case 'c': return n.v;
      case 'frac': return '(' + rowToPlain(n.a) + ')/(' + rowToPlain(n.b) + ')';
      case 'sqrt': return '√' + (n.a.length > 1 ? '(' + rowToPlain(n.a) + ')' : rowToPlain(n.a));
      case 'pow': return '^' + (n.a.length > 1 ? '(' + rowToPlain(n.a) + ')' : rowToPlain(n.a));
      case 'mixed': return rowToPlain(n.w) + ' ' + rowToPlain(n.a) + '/' + rowToPlain(n.b);
      default: return '';
    }
  }).join('').replace(/\(([^()]+)\)\/\((\d+)\)/g, function (m, a, b) { return /^[\d.]+$|^√\d+$|^\d*√\d+$|^\d*π$/.test(a) ? a + '/' + b : '(' + a + ')/' + b; });
}

// ---------------------------------------------------------------- 소인수분해 (FACT)
function factorize(v) {
  if (!(v.t === 'x' && xIsRat(v) && risInt(xRat(v)))) throw mathErr('domain');
  var n = xRat(v).n;
  if (n < 2n) throw mathErr('domain');
  if (bdigits(n) > 15) throw mathErr('range');
  var out = [], m = n;
  for (var p = 2n; p * p <= m; p += (p === 2n ? 1n : 2n)) {
    var e = 0; while (m % p === 0n) { m /= p; e++; }
    if (e) out.push({ p: p, e: e });
  }
  if (m > 1n) out.push({ p: m, e: 1 });
  return out;
}
function factorRow(fs) {
  var row = [];
  fs.forEach(function (f, i) {
    if (i) row.push({ t: 'c', v: '×' });
    row = row.concat(digitsRow(f.p.toString()));
    if (f.e > 1) row.push({ t: 'pow', a: digitsRow(String(f.e)) });
  });
  return row;
}

// ---------------------------------------------------------------- 분수 ↔ 소수 바꾸기용: 소수값을 가까운 분수로 (S⇔D에서 소수 결과일 때)
// 연분수로 분모 ≤ 10^6 안에서 15자리까지 같은 분수를 찾는다. 못 찾으면 null
function floatToFraction(x) {
  if (!isFinite(x) || x === 0 || Math.abs(x) > 1e10) return null;
  var neg = x < 0; x = Math.abs(x);
  var h0 = 0, h1 = 1, k0 = 1, k1 = 0, b = x;
  for (var i = 0; i < 40; i++) {
    var a = Math.floor(b);
    var h2 = a * h1 + h0, k2 = a * k1 + k0;
    if (k2 > 1e6) return null;
    if (Math.abs(h2 / k2 - x) <= 1e-14 * x) {
      if (k2 === 1) return null;
      return xr(R(BigInt(neg ? -h2 : h2), BigInt(k2)));
    }
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    var frac = b - a; if (frac < 1e-15) return null;
    b = 1 / frac;
  }
  return null;
}

var SC = {
  CalcError: CalcError, parseText: parseText, rowToText: rowToText, parseRow: parseRow, evaluate: evaluate, calc: calc,
  defaultEnv: defaultEnv, valueRow: valueRow, rowToPlain: rowToPlain, formatDecimal: formatDecimal, decimalText: decimalText,
  hasExactDisplay: hasExactDisplay, isFraction: isFraction, exactForm: exactForm, exactFits: exactFits,
  factorize: factorize, factorRow: factorRow, floatToFraction: floatToFraction,
  toNum: toNum, sign: sign, isZero: isZero, realIsInt: realIsInt, xr: xr, xint: xint, F: F, R: R, rFromDecimal: rFromDecimal,
  add: add, sub: sub, mul: mul, div: div, neg: neg, inv: inv, powv: powv, sqrtv: sqrtv, absv: absv, ipow: ipow,
  trig: trig, atrig: atrig, lnv: lnv, log10v: log10v, cx: cx, re: re, im: im, isC: isC, isX: isX, xIsRat: xIsRat, xRat: xRat,
  rToNum: rToNum, rFromNumExact: rFromNumExact, ZERO: ZERO, ONE: ONE, PI: PI,
  integrateNum: integrateNum, derivNum: derivNum, snapNum: snapNum,
  CONSTANTS: CONSTANTS, CONST_MAP: CONST_MAP, CONVERSIONS: CONVERSIONS, CONV_MAP: CONV_MAP,
  FUNCS: FUNCS, NAME_ALIASES: NAME_ALIASES, VARS: VARS, TEMPLATE_SLOTS: TEMPLATE_SLOTS, makeTemplate: makeTemplate,
  isTemplate: isTemplate, cloneRow: cloneRow, digitsRow: digitsRow, fromDegrees: fromDegrees, mathErr: mathErr, synErr: synErr,
  FACT_MAX: FACT_MAX, bgcd: bgcd, bsqrt: bsqrt
};
if (typeof module !== 'undefined' && module.exports) module.exports = SC;
else root.SC = SC;
})(typeof window !== 'undefined' ? window : this);
