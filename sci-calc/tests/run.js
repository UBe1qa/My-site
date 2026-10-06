// 계산 시험: node tests/run.js   (기준값은 tests/cases.json = 파이썬 sympy·fractions·decimal 로 따로 구한 값)
'use strict';
var path = require('path'), fs = require('fs');
var SC = require(path.join(__dirname, '../assets/engine.js'));
var data = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));
var pass = 0, fail = 0, notes = [];
function ok(cond, name, detail) {
  if (cond) pass++; else { fail++; console.log('실패: ' + name + (detail ? '  ' + detail : '')); }
}
function env(mode, cplx) { return { angle: mode || 'deg', complex: !!cplx, vars: {}, ans: SC.ZERO }; }
function norm10(v) { return SC.decimalText(SC.formatDecimal(v, { mode: 'norm' })); }
function refNorm(str) { return norm10(SC.xr(SC.rFromDecimal(str))); }
function relErr(a, b) { return b === 0 ? Math.abs(a) : Math.abs(a - b) / Math.abs(b); }
function termsKey(v) {   // 정확값 → [[n,d,r,p]] 정렬
  if (!v || v.t !== 'x') return null;
  return JSON.stringify(v.v.map(function (t) { return [t.c.n.toString(), t.c.d.toString(), t.r.toString(), t.p]; })
    .sort(function (a, b) { return a[3] - b[3] || (BigInt(a[2]) < BigInt(b[2]) ? -1 : 1); }));
}

// ---- 1. 함수·정확값·오류 (sympy 기준)
data.cases.forEach(function (c) {
  var name = '[' + c.mode + (c.cplx ? ',복소' : '') + '] ' + c.expr;
  var v, err = null;
  try { v = SC.calc(c.expr, env(c.mode, c.cplx)); } catch (e) { err = e; }
  if (c.err) {
    ok(err && err.kind === c.err, name, '오류 ' + c.err + ' 이어야 함, 결과: ' + (err ? err.kind + ' ' + err.message : SC.rowToPlain(SC.valueRow(v, {}))));
    return;
  }
  if (err) { ok(false, name, '오류 남: ' + err.kind + ' ' + err.message + (err.kind ? '' : '\n' + err.stack)); return; }
  if (v.t === 'multi') v = v.items[0].v;
  var vre = SC.re(v), vim = SC.im(v);
  [['re', vre], ['im', vim]].forEach(function (pair) {
    var refStr = c[pair[0]], got = pair[1];
    var refN = Number(refStr), gotN = SC.toNum(got);
    var a = norm10(got), b = refNorm(refStr);
    if (a !== b) {
      // 10자리 반올림 경계(…5000)에 아주 가까우면 소수 오차로 갈릴 수 있음 → 상대 오차로 판단
      var close = relErr(gotN, refN) < 1e-13 || (refN === 0 && Math.abs(gotN) < 1e-14);
      if (close) notes.push(name + ' 경계: ' + a + ' / 기준 ' + b);
      ok(close, name + ' ' + pair[0], '표시 ' + a + ' / 기준 ' + b);
    } else ok(true);
    var tol = refN === 0 ? 1e-13 : 1e-12;
    ok(relErr(gotN, refN) <= tol || (refN === 0 && Math.abs(gotN) <= tol), name + ' 정밀도 ' + pair[0], gotN + ' vs ' + refStr);
  });
  if (c.exact_re) {
    var kr = termsKey(vre), ki = termsKey(vim);
    ok(kr === JSON.stringify(c.exact_re), name + ' 정확값(실수부)', kr + ' vs ' + JSON.stringify(c.exact_re));
    ok(ki === JSON.stringify(c.exact_im), name + ' 정확값(허수부)', ki + ' vs ' + JSON.stringify(c.exact_im));
  }
});

// ---- 2. 무작위 분수 식 (파이썬 Fraction 과 글자까지 같게)
data.random.forEach(function (c) {
  var v;
  try { v = SC.calc(c.expr, env()); } catch (e) { ok(false, '무작위 ' + c.expr, e.kind + ' ' + e.message); return; }
  if (v.t === 'x' && SC.xIsRat(v)) {
    var r = SC.xRat(v);
    ok(r.n.toString() === c.n && r.d.toString() === c.d, '무작위 ' + c.expr, r.n + '/' + r.d + ' vs ' + c.n + '/' + c.d);
  } else {
    // 너무 커서 소수로 넘어간 경우: 값만 맞으면 됨
    var ref = Number(c.n) / Number(c.d);
    ok(relErr(SC.toNum(v), ref) < 1e-12, '무작위(소수) ' + c.expr, SC.toNum(v) + ' vs ' + ref);
  }
});

// ---- 3. 반올림 표시 (파이썬 Decimal ROUND_HALF_UP)
data.rounding.forEach(function (c) {
  var v = SC.xr(SC.R(BigInt(c.n), BigInt(c.d)));
  var nm = c.n + '/' + c.d;
  ok(norm10(v) === c.norm, '반올림 보통 ' + nm, norm10(v) + ' vs ' + c.norm);
  if (c.fix2 !== undefined) {
    [['fix2', 2], ['fix0', 0], ['fix5', 5]].forEach(function (f) {
      var got = SC.decimalText(SC.formatDecimal(v, { mode: 'fix', digits: f[1] }));
      ok(got === c[f[0]], '반올림 ' + f[0] + ' ' + nm, got + ' vs ' + c[f[0]]);
    });
  }
  if (c.sci4) {
    var g = SC.formatDecimal(v, { mode: 'sci', digits: 4 });
    var gs = (g.neg ? '-' : '') + g.mant + 'E' + g.exp;
    ok(gs === c.sci4, '반올림 sci4 ' + nm, gs + ' vs ' + c.sci4);
  }
});

// ---- 4. 손으로 확인한 표시 모양
function shown(expr, opts, e) {
  var v = SC.calc(expr, e || env());
  return SC.rowToPlain(SC.valueRow(v, opts || {}));
}
ok(shown('sin(15)') === '(√6−√2)/4', '표시 sin15', shown('sin(15)'));
ok(shown('1/(1+sqrt(2))') === '√2−1', '표시 유리화', shown('1/(1+sqrt(2))'));
ok(shown('cos(150)') === '−√3/2', '표시 −√3/2', shown('cos(150)'));
ok(shown('7/3', { mixed: true }) === '2 1/3', '표시 대분수', shown('7/3', { mixed: true }));
ok(shown('2pi/3') === '2π/3', '표시 2π/3');
ok(shown('1/3', { decimal: true }) === '0.3333333333', '표시 1/3 소수');
ok(shown('30.5', { dms: true }) === '30°30′0″', '표시 도분초', shown('30.5', { dms: true }));
ok(shown('12.5824', { dms: true }) === '12°34′56.64″', '표시 도분초2', shown('12.5824', { dms: true }));
ok(shown('Pol(1,1)') === 'r=√2, θ=45', 'Pol 표시', shown('Pol(1,1)'));
ok(shown('17 mod 5') === 'Q=3, R=2', '÷R 표시', shown('17 mod 5'));
ok(shown('1E10') === '1×10^(10)', '1E10 표시', shown('1E10'));
ok(shown('123456', { disp: { mode: 'eng' }, decimal: true }) === '123.456×10^3', 'ENG', shown('123456', { disp: { mode: 'eng' }, decimal: true }));
ok(shown('0.000047', { disp: { mode: 'eng' }, decimal: true }) === '47×10^(−6)', 'ENG 작은 수', shown('0.000047', { disp: { mode: 'eng' }, decimal: true }));
ok(shown('(1+2i)/(3-4i)', {}, env('deg', true)) === '−1/5+2/5i', '복소 표시', shown('(1+2i)/(3-4i)', {}, env('deg', true)));
ok(shown('2∠60', { polar: true, angle: 'deg' }, env('deg', true)) === '2∠60', '극형식 표시');
ok(SC.rowToPlain(SC.factorRow(SC.factorize(SC.xint(360)))) === '2^3×3^2×5', '소인수분해 360');
ok(SC.rowToPlain(SC.factorRow(SC.factorize(SC.xint(9999999967)))) === '9999999967', '소인수분해 소수');
ok(SC.rowToPlain(SC.factorRow(SC.factorize(SC.xint(1234567890)))) === '2×3^2×5×3607×3803', '소인수분해 1234567890');
// 변수·Ans
(function () {
  var e = env(); e.vars = { A: SC.xint(5) }; e.ans = SC.xr(SC.R(1n, 2n));
  ok(shown('A^2+Ans', {}, e) === '51/2', '변수·Ans', shown('A^2+Ans', {}, e));
  ok(shown('3A', {}, e) === '15', '3A');
})();
// 소수 → 분수 (S⇔D)
(function () {
  var f = SC.floatToFraction(0.75); ok(f && SC.xRat(f).n === 3n && SC.xRat(f).d === 4n, '0.75 → 3/4');
  ok(SC.floatToFraction(Math.PI) === null, 'π는 분수로 안 바뀜');
})();
// 문자 식 ↔ 줄 되돌리기
['frac(1,3)+sqrt(2)^(2)', 'int(x^(2),0,1)', 'sin(30)+[c0]', 'mixed(1,1,2)*2'].forEach(function (s) {
  var row = SC.parseText(s), back = SC.rowToText(row);
  ok(SC.rowToText(SC.parseText(back)) === back, '글자 되돌리기 ' + s, back);
});

// ---- 5. 상수가 NIST 표(받아 둔 값)와 같은가
if (data.constants) {
  data.constants.forEach(function (c) {
    var mine = SC.CONST_MAP[c.id];
    ok(mine && mine.v === c.v, '상수 ' + c.id, (mine && mine.v) + ' vs NIST ' + c.v);
  });
}

if (data.derived) {        // 정의로 계산한 상수: NIST 표의 앞자리(… 앞까지)와 같은가
  data.derived.forEach(function (c) {
    var mine = SC.toNum(SC.CONST_MAP[c.id].val), ref = Number(c.v);
    var digits = c.v.replace(/e.*$/, '').replace(/[^0-9]/g, '').length;
    ok(relErr(mine, ref) < Math.pow(10, -digits + 1), '상수(계산) ' + c.id, mine + ' vs NIST ' + c.v);
  });
}

// ---- 6. 모드 계산 (통계·분포·방정식·행렬·진법)
var modesPath = path.join(__dirname, 'run_modes.js');
if (fs.existsSync(modesPath)) {
  var r = require(modesPath)(ok);
}
// ---- 7. 가이드 글의 숫자
var artPath = path.join(__dirname, 'run_articles.js');
if (fs.existsSync(artPath)) require(artPath)(ok);

console.log((fail ? '실패 ' + fail + '개, ' : '') + '통과 ' + pass + '개' + (notes.length ? ' (반올림 경계 ' + notes.length + '개)' : ''));
notes.forEach(function (n) { console.log('  참고: ' + n); });
process.exit(fail ? 1 : 0);
