// 모드 계산 시험 (tests/run.js 가 부른다). 기준값: tests/modes.json (numpy·scipy·sympy·fractions)
'use strict';
var path = require('path'), fs = require('fs');
var SC = require(path.join(__dirname, '../assets/engine.js'));
var SCM = require(path.join(__dirname, '../assets/modes.js'));
module.exports = function (ok) {
  var D = JSON.parse(fs.readFileSync(path.join(__dirname, 'modes.json'), 'utf8'));
  function val(s) { return SC.calc(String(s), SC.defaultEnv()); }
  function ratEq(v, nd) { return v.t === 'x' && SC.xIsRat(v) && SC.xRat(v).n.toString() === nd[0] && SC.xRat(v).d.toString() === nd[1]; }
  function rel(a, b) { return b === 0 ? Math.abs(a) : Math.abs(a - b) / Math.abs(b); }
  function txt(v) { return SC.rowToPlain(SC.valueRow(v, {})); }

  // 통계
  D.stats.forEach(function (c, i) {
    var xs = c.data.map(val), r = SCM.stats1(xs, null), nm = '통계#' + i;
    ok(ratEq(r.mean, c.mean), nm + ' 평균', txt(r.mean) + ' vs ' + c.mean.join('/'));
    ok(ratEq(r.popVar, c.popVar), nm + ' 모분산', txt(r.popVar));
    ok(ratEq(r.sampleVar, c.sampleVar), nm + ' 표본분산', txt(r.sampleVar));
    ok(rel(SC.toNum(r.popSD), Number(c.popSD)) < 1e-12, nm + ' σ', SC.toNum(r.popSD) + ' vs ' + c.popSD);
    ok(rel(SC.toNum(r.sampleSD), Number(c.sampleSD)) < 1e-12, nm + ' s', SC.toNum(r.sampleSD) + ' vs ' + c.sampleSD);
    ok(ratEq(r.q1, c.q1) && ratEq(r.med, c.med) && ratEq(r.q3, c.q3), nm + ' 사분위(카시오식)', [txt(r.q1), txt(r.med), txt(r.q3)].join(',') + ' vs ' + [c.q1, c.med, c.q3].map(function (a) { return a.join('/'); }).join(','));
    var rx = SCM.stats1(xs, null, 'excel');
    ok(rel(SC.toNum(rx.q1), Number(c.xq1)) < 1e-12 && rel(SC.toNum(rx.q3), Number(c.xq3)) < 1e-12, nm + ' 사분위(엑셀식)', SC.toNum(rx.q1) + ',' + SC.toNum(rx.q3) + ' vs ' + c.xq1 + ',' + c.xq3);
  });
  D.freq.forEach(function (c, i) {
    var r = SCM.stats1(c.x.map(val), c.f.map(val)), nm = '도수#' + i;
    ok(ratEq(r.mean, c.mean) && ratEq(r.q1, c.q1) && ratEq(r.med, c.med) && ratEq(r.q3, c.q3), nm, [txt(r.mean), txt(r.q1), txt(r.med), txt(r.q3)].join(','));
    ok(rel(SC.toNum(r.popSD), Number(c.sd)) < 1e-12, nm + ' σ');
  });
  // 회귀
  D.reg.forEach(function (c, i) {
    var r = SCM.regression(c.x.map(val), c.y.map(val), null, c.type), nm = '회귀 ' + c.type + '#' + i;
    ok(rel(SC.toNum(r.a), c.a) < 1e-9, nm + ' a', SC.toNum(r.a) + ' vs ' + c.a);
    ok(rel(SC.toNum(r.b), c.b) < 1e-9, nm + ' b', SC.toNum(r.b) + ' vs ' + c.b);
    if (c.type === 'quad') {
      ok(rel(SC.toNum(r.c), c.c) < 1e-9, nm + ' c', SC.toNum(r.c) + ' vs ' + c.c);
      ok(rel(SC.toNum(r.r2), c.r2) < 1e-10, nm + ' R²', SC.toNum(r.r2) + ' vs ' + c.r2);
    } else ok(rel(SC.toNum(r.r), c.r) < 1e-10, nm + ' r', SC.toNum(r.r) + ' vs ' + c.r);
  });
  // 분포
  D.dist.forEach(function (c, i) {
    var got, nm = '분포 ' + c.kind + ' ' + JSON.stringify(c).slice(0, 70), ref = Number(c.v);
    if (c.kind === 'ncdf') got = SCM.normalCdf(c.lo, c.hi, c.mu, c.sd);
    if (c.kind === 'npdf') got = SCM.normalPdf(c.x, c.mu, c.sd);
    if (c.kind === 'inorm') got = SCM.invNormal(c.p, c.mu, c.sd, c.tail);
    if (c.kind === 'inorm') got = c.tail === 'center' ? got[1] : got[0];
    if (c.kind === 'bpdf') got = SCM.binomPdf(c.k, c.n, c.p);
    if (c.kind === 'bcdf') got = SCM.binomCdf(c.lo, c.hi, c.n, c.p);
    if (c.kind === 'ppdf') got = SCM.poissonPdf(c.k, c.lam);
    if (c.kind === 'pcdf') got = SCM.poissonCdf(c.lo, c.hi, c.lam);
    // 10자리 표시가 같을 만큼 (상대오차 5e-11) — 아주 작은 꼬리는 상대오차로
    ok(rel(got, ref) < 5e-11 || Math.abs(got - ref) < 1e-300, nm, got + ' vs ' + ref);
  });
  // 다항식 근
  D.poly.forEach(function (c, i) {
    var co = c.co.map(val), roots = SCM.polyRoots(co.slice()), nm = '방정식 ' + c.co.join(',');
    ok(roots.length === c.roots.length, nm + ' 근 개수', roots.length);
    roots.forEach(function (r, k) {
      var gr = SC.toNum(SC.re(r)), gi = SC.toNum(SC.im(r)), er = Number(c.roots[k][0]), ei = Number(c.roots[k][1]);
      var close = Math.abs(gr - er) < 1e-9 * Math.max(1, Math.abs(er)) && Math.abs(gi - ei) < 1e-9 * Math.max(1, Math.abs(ei));
      ok(close, nm + ' 근' + k, txt(r) + ' = ' + gr + ',' + gi + ' vs ' + er + ',' + ei);
    });
  });
  // 정확한 모양 (손으로 확인)
  function rootsText(cs) { return SCM.polyRoots(cs.map(val)).map(txt).join(' ; '); }
  ok(rootsText(['1', '-3', '2']) === '1 ; 2', '이차 1,2', rootsText(['1', '-3', '2']));
  ok(rootsText(['1', '0', '-2']) === '−√2 ; √2', '이차 ±√2', rootsText(['1', '0', '-2']));
  ok(rootsText(['1', '2', '5']) === '−1+2i ; −1−2i', '이차 허근', rootsText(['1', '2', '5']));
  ok(rootsText(['1', '-1', '-1']) === '(1−√5)/2 ; (1+√5)/2', '이차 황금비', rootsText(['1', '-1', '-1']));
  ok(rootsText(['1', '0', '0', '-8']) === '2 ; −1+√3i ; −1−√3i', '삼차 x³=8', rootsText(['1', '0', '0', '-8']));
  ok(rootsText(['1', '-1', '-1', '1']) === '−1 ; 1 ; 1', '삼차 중근', rootsText(['1', '-1', '-1', '1']));
  var ex = SCM.polyExtrema(['1', '-4', '1'].map(val));
  ok(txt(ex[0].x) === '2' && txt(ex[0].y) === '−3' && ex[0].kind === 'min', '꼭짓점');
  // 연립
  D.sys.forEach(function (c, i) {
    var A = c.A.map(function (r) { return r.map(val); }), b = c.b.map(val), s = SCM.solveSystem(A, b), nm = '연립#' + i;
    if (c.kind) { ok(s.kind === c.kind, nm + ' ' + c.kind, s.kind); return; }
    ok(s.kind === 'one' && s.x.every(function (v, k) { return ratEq(v, c.x[k]); }), nm, s.x ? s.x.map(txt).join(',') : s.kind);
  });
  // 부등식
  function ineqText(r) {
    if (r.all) return 'all'; if (r.none) return 'none';
    return r.parts.map(function (p) {
      if (p.eq) return 'x=' + txt(p.eq);
      var s = '';
      if (p.lo) s += txt(p.lo).replace('−', '-') + (p.loIn ? '≤' : '<');
      s += 'x';
      if (p.hi) s += (p.hiIn ? '≤' : '<') + txt(p.hi).replace('−', '-');
      return s;
    }).join(', ');
  }
  D.ineq.forEach(function (c) {
    var r = SCM.polyInequality(c.co.map(val), c.op), g = ineqText(r);
    ok(g === c.ans, '부등식 ' + c.co.join(',') + ' ' + c.op, g + ' vs ' + c.ans);
  });
  // SOLVE·비례식
  var sol = SCM.solveNumeric(function (x) { return x * x - 2; }, 1);
  ok(Math.abs(sol.x - Math.SQRT2) < 1e-14, 'SOLVE √2', sol.x);
  var sol2 = SCM.solveNumeric(function (x) { return Math.cos(x) - x; }, 0);
  ok(Math.abs(sol2.x - 0.7390851332151607) < 1e-14, 'SOLVE cos x = x', sol2.x);
  var sol3 = SCM.solveNumeric(function (x) { return Math.exp(x) - 10; }, 50);
  ok(Math.abs(sol3.x - Math.log(10)) < 1e-12, 'SOLVE 먼 시작값', sol3.x);
  ok(txt(SCM.ratio(val(3), val(4), val(9), null)) === '12', '비례식');
  ok(txt(SCM.ratio(val(2), val(3), null, val(5))) === '10/3', '비례식 분수');
  // 행렬
  function mtxt(M) { return M.map(function (r) { return r.map(txt).join(','); }).join(';'); }
  function mref(M) { return M.map(function (r) { return r.map(function (s) { return txt(val(s.replace('/', '÷'))); }).join(','); }).join(';'); }
  D.mat.forEach(function (c, i) {
    var A = c.A.map(function (r) { return r.map(function (s) { return val(s.replace('/', '÷')); }); });
    var B = c.B.map(function (r) { return r.map(val); }), nm = '행렬#' + i;
    ok(txt(SCM.mdet(A)) === txt(val(c.det.replace('/', '÷'))), nm + ' det', txt(SCM.mdet(A)) + ' vs ' + c.det);
    ok(mtxt(SCM.mmul(A, B)) === mref(c.AB), nm + ' AB');
    ok(SCM.mrank(A) === c.rank, nm + ' rank', SCM.mrank(A) + ' vs ' + c.rank);
    if (c.inv) ok(mtxt(SCM.minv(A)) === mref(c.inv), nm + ' 역행렬', mtxt(SCM.minv(A)) + ' vs ' + mref(c.inv));
    else { var threw = false; try { SCM.minv(A); } catch (e) { threw = true; } ok(threw, nm + ' 역행렬 없음'); }
  });
  var u = D.vec.u.map(val), v = D.vec.v.map(val);
  ok(txt(SCM.vdot(u, v)) === D.vec.dot, '내적');
  ok(SCM.vcross(u, v).map(txt).join(',') === D.vec.cross.map(function (s) { return s.replace('-', '−'); }).join(','), '외적', SCM.vcross(u, v).map(txt).join(','));
  ok(txt(SCM.vnorm(u)) === '3', '크기');
  ok(rel(SC.toNum(SCM.vangle(u, v, 'deg')), Number(D.vec.angle)) < 1e-12, '두 벡터 사이 각', SC.toNum(SCM.vangle(u, v, 'deg')));
  // 진법
  D.base.forEach(function (c) {
    var r = SCM.baseCalc(c.expr, c.base, 32), all = SCM.baseAll(r, 32);
    ok(all.DEC === c.dec && all.HEX === c.hex && all.BIN === c.bin && all.OCT === c.oct, '진법 ' + c.expr, JSON.stringify(all) + ' vs ' + c.dec);
  });
  D.base_err.forEach(function (c) {
    var threw = false; try { SCM.baseCalc(c.expr, c.base, 32); } catch (e) { threw = true; }
    ok(threw, '진법 오류 ' + c.expr);
  });
  // 함수표
  var tb = SCM.makeTable('x^2/3', null, val(0), val(2), val('0.5'));
  ok(tb.length === 5 && txt(tb[1].f) === '1/12' && txt(tb[4].f) === '4/3', '함수표', tb.map(function (r) { return txt(r.f); }).join(','));
};
