/* 모드 화면 (통계·분포·방정식·행렬·진법·함수표): 입력 칸을 만들고 SCM 으로 계산해 결과를 그린다 */
(function () {
'use strict';
var SC = window.SC, SCM = window.SCM, UI = window.UI, ME = window.ME, L = UI.LANG;
var root = document.getElementById('mode-ui');
if (!root) return;
var mode = root.getAttribute('data-mode');
var settings = UI.loadSettings();
var env = UI.envFrom(settings, UI.loadVars(), UI.loadAns());

var W = {
  ko: {
    useY: 'y 값도 넣기 (두 변수)', useF: '도수 넣기', quart: '사분위수 방식', qCasio: '공학용 계산기 방식', qExcel: '엑셀 QUARTILE.INC', reg: '회귀식',
    addRow: '줄 추가', clear: '모두 지우기', freq: '도수', pasteHint: '엑셀 열이나 “1, 2, 3” 같은 목록을 칸에 붙여 넣으면 아래로 나눠 들어가요.',
    n: '개수 n', mean: '평균', sum: '합', sum2: '제곱의 합', popSD: '모표준편차', sampleSD: '표본표준편차', popVar: '모분산', sampleVar: '표본분산',
    min: '최솟값', q1: '제1사분위수 Q1', med: '중앙값', q3: '제3사분위수 Q3', max: '최댓값', range: '범위', mode: '최빈값', regEq: '회귀식', r: '상관계수 r', r2: '결정계수 r²',
    est: '추정', estX: 'x 를 넣으면 ŷ', estY: 'y 를 넣으면 x̂', xs: 'x 자료', ys: 'y 자료', yEmpty: '{n}번째 줄의 y 칸이 비어 있어요', modeMore: '외 {n}개 (모두 {c}번씩)',
    lin: '일차 y=a+bx', quad: '이차 y=a+bx+cx²', log: '로그 y=a+b·ln x', exp: '지수 y=a·eᵇˣ', abx: '지수 y=a·bˣ', pow: '거듭제곱 y=a·xᵇ', inv: '역수 y=a+b/x',
    npd: '정규 밀도', ncd: '정규 누적', invn: '역정규', bpd: '이항 확률', bcd: '이항 누적', ppd: '푸아송 확률', pcd: '푸아송 누적',
    lower: '아래 끝 (비우면 −∞)', upper: '위 끝 (비우면 +∞)', mu: '평균 μ', sd: '표준편차 σ', area: '넓이(확률)', tail: '꼬리', left: '왼쪽', right: '오른쪽', center: '가운데',
    trials: '시행 횟수 n', prob: '성공 확률 p', lam: '평균 λ', lo0: '아래 끝 (비우면 0)', hiN: '위 끝 (비우면 끝까지)',
    sys: '연립방정식', poly: '고차방정식', ineq: '부등식', solve: 'SOLVE', ratio: '비례식', unknowns: '미지수', degree: '차수',
    none: '해가 없어요', many: '해가 무수히 많아요', all: '모든 실수', noneIneq: '해가 없어요', vertex: '꼭짓점', lmax: '극댓값', lmin: '극솟값',
    eq: '방정식 (x 를 써요, = 하나)', start: '시작값', resid: '좌변 − 우변', ratioHint: '네 칸 중 하나를 비워 두면 그 값을 구해요.',
    calc: '계산', matA: '행렬 A', matB: '행렬 B', rows: '행', cols: '열', toA: '결과 → A', toB: '결과 → B', mat: '행렬', vct: '벡터', dim: '차원',
    det: '행렬식', rank: '계수', vA: '벡터 A', vB: '벡터 B', angle: '사이각', unit: '단위벡터', norm: '크기',
    inBase: '입력 진법', bits: '비트 수', expr: '수 또는 식', logic: '비트 연산',
    fx: 'f(x)', gx: 'g(x) (선택)', from: '시작', to: '끝', step: '간격', copyTable: '표 복사', copied: '표를 복사했어요',
    result: '결과', err: '계산할 수 없어요'
  },
  en: {
    useY: 'Add y values (two variables)', useF: 'Add frequencies', quart: 'Quartile method', qCasio: 'Scientific calculator', qExcel: 'Excel QUARTILE.INC', reg: 'Regression',
    addRow: 'Add row', clear: 'Clear all', freq: 'Freq', pasteHint: 'Paste a spreadsheet column or a list like “1, 2, 3” into a cell and it fills downward.',
    n: 'Count n', mean: 'Mean', sum: 'Sum', sum2: 'Sum of squares', popSD: 'Population SD', sampleSD: 'Sample SD', popVar: 'Population variance', sampleVar: 'Sample variance',
    min: 'Minimum', q1: 'First quartile Q1', med: 'Median', q3: 'Third quartile Q3', max: 'Maximum', range: 'Range', mode: 'Mode', regEq: 'Equation', r: 'Correlation r', r2: 'R²',
    est: 'Estimate', estX: 'Enter x for ŷ', estY: 'Enter y for x̂', xs: 'x data', ys: 'y data', yEmpty: 'Row {n}: the y cell is empty', modeMore: 'and {n} more (each {c} times)',
    lin: 'Linear y=a+bx', quad: 'Quadratic y=a+bx+cx²', log: 'Log y=a+b·ln x', exp: 'Exponential y=a·eᵇˣ', abx: 'Exponential y=a·bˣ', pow: 'Power y=a·xᵇ', inv: 'Inverse y=a+b/x',
    npd: 'Normal PDF', ncd: 'Normal CDF', invn: 'Inverse normal', bpd: 'Binomial PD', bcd: 'Binomial CD', ppd: 'Poisson PD', pcd: 'Poisson CD',
    lower: 'Lower bound (empty = −∞)', upper: 'Upper bound (empty = +∞)', mu: 'Mean μ', sd: 'Standard deviation σ', area: 'Area (probability)', tail: 'Tail', left: 'Left', right: 'Right', center: 'Center',
    trials: 'Trials n', prob: 'Success probability p', lam: 'Mean λ', lo0: 'Lower (empty = 0)', hiN: 'Upper (empty = all)',
    sys: 'Simultaneous', poly: 'Polynomial', ineq: 'Inequality', solve: 'SOLVE', ratio: 'Ratio', unknowns: 'Unknowns', degree: 'Degree',
    none: 'No solution', many: 'Infinitely many solutions', all: 'All real numbers', noneIneq: 'No solution', vertex: 'Vertex', lmax: 'Local maximum', lmin: 'Local minimum',
    eq: 'Equation (use x and one =)', start: 'Start value', resid: 'Left − right', ratioHint: 'Leave one of the four boxes empty to solve for it.',
    calc: 'Calculate', matA: 'Matrix A', matB: 'Matrix B', rows: 'rows', cols: 'cols', toA: 'Result → A', toB: 'Result → B', mat: 'Matrix', vct: 'Vector', dim: 'Dimension',
    det: 'Determinant', rank: 'Rank', vA: 'Vector A', vB: 'Vector B', angle: 'Angle', unit: 'Unit vector', norm: 'Magnitude',
    inBase: 'Input base', bits: 'Word size', expr: 'Number or expression', logic: 'Bitwise',
    fx: 'f(x)', gx: 'g(x) (optional)', from: 'Start', to: 'End', step: 'Step', copyTable: 'Copy table', copied: 'Table copied',
    result: 'Result', err: 'Can’t calculate'
  }
}[L];

// ---------------------------------------------------------------- 도우미
function el(tag, cls, text, attrs) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = text;
  if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
var NUMRE = /^[-+−]?(\d+\.?\d*|\.\d+)(e[-+−]?\d+)?$/i;
function val(s) {                // 칸 글자 → 값 (빈칸 null). 1.5e3 같은 숫자는 지수로 읽는다
  s = String(s === null || s === undefined ? '' : s).trim();
  if (!s) return null;
  if (NUMRE.test(s)) s = s.replace(/e/i, 'E');
  return SC.calc(s, env);
}
function need(s) { var v = val(s); if (v === null) throw SC.synErr('empty'); return v; }
function num(s, def) { var v = val(s); if (v === null) { if (def === undefined) throw SC.synErr('empty'); return def; } if (SC.isC(v)) throw SC.mathErr('complexarg'); return SC.toNum(v); }
function decText(x) { return SC.decimalText(SC.formatDecimal(typeof x === 'number' ? SC.F(x) : x, { mode: 'norm' })).replace(/^-/, '−').replace(/E(-?)(\d+)$/, function (_, s, d) { return '×10' + sup((s ? '−' : '') + d); }); }
function sup(s) { var m = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '−': '⁻' }; return s.split('').map(function (c) { return m[c] || c; }).join(''); }
// 값 그리기: 정확값이 있으면 정확값 + ≈ 소수
function fmt(v, onlyDec, noApprox) {
  var span = el('span', 'val');
  if (typeof v === 'number') { span.textContent = decText(v); return span; }
  var exact = !onlyDec && SC.hasExactDisplay(v);
  var m = el('span', 'val-main');
  ME.render(SC.valueRow(v, UI.valueOpts(settings, { decimal: !exact })), m, {});
  span.appendChild(m);
  var isInt = !SC.isC(v) && SC.realIsInt(v);
  if (exact && !isInt && !noApprox) {
    var a = el('span', 'val-approx');
    ME.render(SC.valueRow(v, UI.valueOpts(settings, { decimal: true })), a, {});
    a.insertBefore(document.createTextNode('≈ '), a.firstChild);
    span.appendChild(a);
  }
  return span;
}
function plain(v, dec) { return typeof v === 'number' ? decText(v) : SC.rowToPlain(SC.valueRow(v, UI.valueOpts(settings, { decimal: dec || !SC.hasExactDisplay(v) }))); }
function kv(out, rows) {
  var dl = el('dl', 'kv');
  rows.forEach(function (r) {
    if (!r) return;
    dl.appendChild(el('dt', null, r[0]));
    var dd = el('dd');
    if (r[1] instanceof Node) dd.appendChild(r[1]); else if (typeof r[1] === 'string') dd.textContent = r[1]; else dd.appendChild(fmt(r[1], r[2]));
    dl.appendChild(dd);
  });
  out.appendChild(dl);
}
function showErr(out, e) {
  out.textContent = '';
  out.className = 'out is-err';
  out.textContent = e && e.msg ? e.msg : (e && e.kind) ? UI.errorText(e) : W.err;
}
function clearOut(out) { out.textContent = ''; out.className = 'out'; }
function field(label, id, value, attrs) {
  var w = el('div', 'field');
  var inp = el('input', 'inp', null, { id: id, type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false' });
  if (attrs) for (var k in attrs) inp.setAttribute(k, attrs[k]);
  inp.value = value === undefined || value === null ? '' : value;
  w.appendChild(el('label', null, label, { for: id }));
  w.appendChild(inp);
  return w;
}
function select(label, id, options, current) {
  var w = el('div', 'field');
  var s = el('select', 'inp', null, { id: id });
  options.forEach(function (o) { var op = el('option', null, o[1], { value: o[0] }); if (String(o[0]) === String(current)) op.selected = true; s.appendChild(op); });
  w.appendChild(el('label', null, label, { for: id }));
  w.appendChild(s);
  return w;
}
function tabs(list, current, onPick) {
  var bar = el('div', 'tabs', null, { role: 'tablist' });
  list.forEach(function (it) {
    var b = el('button', null, it[1], { type: 'button', role: 'tab', 'aria-selected': String(it[0] === current) });
    b.addEventListener('click', function () { onPick(it[0]); });
    bar.appendChild(b);
  });
  return bar;
}
function btn(label, onClick, cls) { var b = el('button', 'btn' + (cls ? ' ' + cls : ''), label, { type: 'button' }); b.addEventListener('click', onClick); return b; }
function debounce(fn, ms) { var tm; return function () { clearTimeout(tm); tm = setTimeout(fn, ms || 200); }; }
// 화면 상태 저장 (이 기기 브라우저에만)
var KEY = 'sc.m.' + mode;
var saved = UI.store.get(KEY, {}) || {};
function save(state) { UI.store.set(KEY, state); }
function q(name) { var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search); return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null; }

// ================================================================ 통계
function statsUI() {
  var st = { x: [], y: [], f: [], useY: false, useF: false, quart: 'casio', reg: 'lin', ex: '', ey: '' };
  for (var k in saved) if (k in st) st[k] = saved[k];
  var qx = q('x');
  if (qx) { st.x = qx.split(/[,\s]+/).filter(Boolean); st.y = []; st.f = []; st.useY = !!q('y'); if (st.useY) st.y = q('y').split(/[,\s]+/); st.useF = false; }
  if (!st.x.length) { st.x = ['2', '4', '4', '4', '5', '5', '7', '9']; }
  var opts = el('div', 'opt-row');
  var cy = el('label', 'chk'); var iy = el('input', null, null, { type: 'checkbox' }); iy.checked = st.useY; cy.appendChild(iy); cy.appendChild(document.createTextNode(' ' + W.useY));
  var cf = el('label', 'chk'); var ifr = el('input', null, null, { type: 'checkbox' }); ifr.checked = st.useF; cf.appendChild(ifr); cf.appendChild(document.createTextNode(' ' + W.useF));
  opts.appendChild(cy); opts.appendChild(cf);
  root.appendChild(opts);
  var sels = el('div', 'row2');
  var qs = select(W.quart, 'st-q', [['casio', W.qCasio], ['excel', W.qExcel]], st.quart);
  var rs = select(W.reg, 'st-r', SCM.REG_TYPES.map(function (t) { return [t, W[t]]; }), st.reg);
  sels.appendChild(qs); sels.appendChild(rs);
  root.appendChild(sels);
  var wrap = el('div', 'data-wrap');
  var table = el('table', 'grid-in');
  wrap.appendChild(table);
  root.appendChild(wrap);
  root.appendChild(el('p', 'hint', W.pasteHint));
  var br = el('div', 'btn-row');
  br.appendChild(btn(W.addRow, function () { sync(); st.x.push(''); draw(); focusCell(st.x.length - 1, 'x'); }, 'btn-ghost'));
  br.appendChild(btn(W.clear, function () { if (!confirm(W.clear + '?')) return; st.x = []; st.y = []; st.f = []; draw(); recalc(); focusCell(0, 'x'); }, 'btn-ghost'));
  root.appendChild(br);
  var out = el('div', 'out', null, { 'aria-live': 'polite' });
  root.appendChild(out);
  var estBox = el('div', 'est');
  root.appendChild(estBox);
  var lastReg = null;

  function cols() { var c = ['x']; if (st.useY) c.push('y'); if (st.useF) c.push('f'); return c; }
  function draw() {
    table.textContent = '';
    var c = cols(), thead = el('thead'), tr = el('tr');
    tr.appendChild(el('th', null, ''));
    c.forEach(function (k) { tr.appendChild(el('th', null, k === 'f' ? W.freq : k)); });
    thead.appendChild(tr); table.appendChild(thead);
    var tb = el('tbody'), n = Math.max(st.x.length + 1, 3);
    for (var i = 0; i < n; i++) {
      var row = el('tr');
      row.appendChild(el('td', null, String(i + 1)));
      c.forEach(function (k) {
        var td = el('td'), inp = el('input', 'inp', null, { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'data-r': i, 'data-c': k, 'aria-label': (k === 'f' ? W.freq : k) + ' ' + (i + 1) });
        inp.value = (st[k][i] !== undefined ? st[k][i] : '');
        td.appendChild(inp); row.appendChild(td);
      });
      tb.appendChild(row);
    }
    table.appendChild(tb);
  }
  function focusCell(r, c) { var i = table.querySelector('input[data-r="' + r + '"][data-c="' + c + '"]'); if (i) i.focus(); }
  function sync() {
    table.querySelectorAll('input[data-r]').forEach(function (inp) { st[inp.getAttribute('data-c')][+inp.getAttribute('data-r')] = inp.value; });
    // 끝의 빈 줄 정리
    while (st.x.length && !String(st.x[st.x.length - 1] || '').trim() && !String(st.y[st.x.length - 1] || '').trim()) { st.x.pop(); }
  }
  table.addEventListener('paste', function (ev) {
    var t = ev.target; if (!t.getAttribute || t.getAttribute('data-r') === null) return;
    var text = (ev.clipboardData || window.clipboardData).getData('text');
    if (!/[\n\t,;]|\s\S/.test(text.trim())) return;
    ev.preventDefault();
    sync();
    var r0 = +t.getAttribute('data-r'), c = cols(), c0 = c.indexOf(t.getAttribute('data-c'));
    var lines = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; });
    if (lines.length === 1) lines = lines[0].split(/[,;\s]+/).filter(Boolean).map(function (v) { return v; });
    lines.forEach(function (line, j) {
      var parts = line.indexOf('\t') >= 0 ? line.split('\t') : (lines.length > 1 ? line.trim().split(/[,;]\s*|\s+/) : [line]);
      parts.forEach(function (p, m) { var k = c[c0 + m]; if (k) st[k][r0 + j] = p.trim().replace(/,/g, ''); });
    });
    for (var i = 0; i < st.x.length; i++) if (st.x[i] === undefined) st.x[i] = '';
    draw(); recalc();
  });
  table.addEventListener('input', debounce(function () { sync(); var n = st.x.length; if (table.querySelectorAll('tbody tr').length < n + 1) { var a = document.activeElement, r = a && a.getAttribute('data-r'), cc = a && a.getAttribute('data-c'); draw(); if (r !== null) focusCell(r, cc); } recalc(); }, 250));
  table.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    var t = ev.target, r = +t.getAttribute('data-r'), c = t.getAttribute('data-c');
    ev.preventDefault(); sync(); if (r + 1 >= table.querySelectorAll('tbody tr').length) { st.x[r + 1] = st.x[r + 1] || ''; draw(); }
    focusCell(r + 1, c);
  });
  iy.addEventListener('change', function () { sync(); st.useY = iy.checked; draw(); recalc(); });
  ifr.addEventListener('change', function () { sync(); st.useF = ifr.checked; draw(); recalc(); });
  qs.querySelector('select').addEventListener('change', function (e) { st.quart = e.target.value; recalc(); });
  rs.querySelector('select').addEventListener('change', function (e) { st.reg = e.target.value; recalc(); });

  function recalc() {
    save(st);
    clearOut(out); estBox.textContent = ''; lastReg = null;
    rs.hidden = !st.useY;
    var xs = [], ys = [], fs = [];
    try {
      for (var i = 0; i < st.x.length; i++) {
        var xv = val(st.x[i]); if (xv === null) continue;
        if (SC.isC(xv)) throw SC.mathErr('complexarg');
        xs.push(xv);
        if (st.useY) { var yv = val(st.y[i]); if (yv === null) throw { msg: W.yEmpty.replace('{n}', i + 1) }; ys.push(yv); }
        if (st.useF) { var fv = val(st.f[i]); fs.push(fv === null ? SC.ONE : fv); }
      }
      if (!xs.length) return;
      var F = st.useF ? fs : null;
      var s = SCM.stats1(xs, F, st.quart);
      // 소수로 넣은 자료면 결과도 소수로 (2447/6250 대신 0.39152), 최빈값은 다섯 개까지만
      var dec = st.x.concat(st.useY ? st.y : []).some(function (t) { return /[.]|\d[eE]/.test(String(t || '')); });
      var modeText = null;
      if (s.mode) {
        modeText = s.mode.slice(0, 5).map(function (v) { return dec ? plain(v, true) : plain(v); }).join(', ');
        if (s.mode.length > 5) modeText += ' ' + W.modeMore.replace('{n}', s.mode.length - 5).replace('{c}', plain(s.modeCount));
      }
      var rows = [[W.n, s.n], [W.mean + ' x̄', s.mean, dec], [W.popSD + ' σx', s.popSD, dec], s.sampleSD ? [W.sampleSD + ' sx', s.sampleSD, dec] : null,
        [W.popVar + ' σ²', s.popVar, dec], s.sampleVar ? [W.sampleVar + ' s²', s.sampleVar, dec] : null, [W.sum + ' Σx', s.sum, dec], [W.sum2 + ' Σx²', s.sum2, dec],
        [W.min, s.min, dec], s.q1 ? [W.q1, s.q1, dec] : null, [W.med, s.med, dec], s.q3 ? [W.q3, s.q3, dec] : null, [W.max, s.max, dec], [W.range, s.range, dec],
        modeText ? [W.mode, modeText] : null];
      if (st.useY) {
        out.appendChild(el('h3', 'out-h', W.xs));
        kv(out, rows.slice(0, 4));
        var sy = SCM.stats1(ys, F, st.quart);
        out.appendChild(el('h3', 'out-h', W.ys));
        kv(out, [[W.mean + ' ȳ', sy.mean], [W.popSD + ' σy', sy.popSD], sy.sampleSD ? [W.sampleSD + ' sy', sy.sampleSD] : null]);
        out.appendChild(el('h3', 'out-h', W.regEq + ' · ' + W[st.reg]));
        var reg = SCM.regression(xs, ys, F, st.reg); lastReg = reg;
        var rr = [['a', reg.a, true], ['b', reg.b, true]];
        if (reg.c) rr.push(['c', reg.c, true]);
        if (reg.r) { rr.push([W.r, reg.r, true]); rr.push([W.r2, SC.mul(reg.r, reg.r), true]); }
        if (reg.r2) rr.push([W.r2, reg.r2, true]);
        kv(out, rr);
        drawEst();
      } else kv(out, rows);
    } catch (e) { showErr(out, e); }
  }
  function drawEst() {
    var r2 = el('div', 'row2');
    var fx = field(W.estX, 'st-ex', st.ex), fy = field(W.estY, 'st-ey', st.ey);
    r2.appendChild(fx); r2.appendChild(fy);
    estBox.appendChild(el('h3', 'out-h', W.est));
    estBox.appendChild(r2);
    var o = el('div', 'out');
    estBox.appendChild(o);
    function go() {
      st.ex = fx.querySelector('input').value; st.ey = fy.querySelector('input').value; save(st);
      clearOut(o);
      try {
        var rows = [];
        var xv = val(st.ex); if (xv !== null) rows.push(['ŷ (x = ' + plain(xv) + ')', SCM.regPredictY(lastReg, xv), true]);
        var yv = val(st.ey); if (yv !== null) SCM.regPredictX(lastReg, yv).forEach(function (v, i, a) { rows.push(['x̂' + (a.length > 1 ? (i + 1) : '') + ' (y = ' + plain(yv) + ')', v, true]); });
        if (rows.length) kv(o, rows);
      } catch (e) { showErr(o, e); }
    }
    estBox.addEventListener('input', debounce(go, 200));
    go();
  }
  draw(); recalc();
}

// ================================================================ 분포
function distUI() {
  var st = { tab: 'ncd', v: {} };
  for (var k in saved) if (k in st) st[k] = saved[k];
  var DEF = { npd: { x: '0', mu: '0', sd: '1' }, ncd: { lo: '-1.96', hi: '1.96', mu: '0', sd: '1' }, invn: { p: '0.975', tail: 'left', mu: '0', sd: '1' },
    bpd: { x: '3', n: '10', p: '0.5' }, bcd: { lo: '', hi: '3', n: '10', p: '0.5' }, ppd: { x: '2', lam: '3' }, pcd: { lo: '', hi: '2', lam: '3' } };
  var FIELDS = {
    npd: [['x', 'x'], ['mu', W.mu], ['sd', W.sd]], ncd: [['lo', W.lower], ['hi', W.upper], ['mu', W.mu], ['sd', W.sd]],
    invn: [['p', W.area], ['tail', W.tail], ['mu', W.mu], ['sd', W.sd]], bpd: [['x', 'x'], ['n', W.trials], ['p', W.prob]],
    bcd: [['lo', W.lo0], ['hi', W.hiN], ['n', W.trials], ['p', W.prob]], ppd: [['x', 'x'], ['lam', W.lam]], pcd: [['lo', W.lo0], ['hi', W.hiN], ['lam', W.lam]]
  };
  function draw() {
    root.textContent = '';
    root.appendChild(tabs(['ncd', 'npd', 'invn', 'bpd', 'bcd', 'ppd', 'pcd'].map(function (t) { return [t, W[t]]; }), st.tab, function (t) { st.tab = t; draw(); }));
    var v = st.v[st.tab] = st.v[st.tab] || JSON.parse(JSON.stringify(DEF[st.tab]));
    var grid = el('div', 'row2');
    FIELDS[st.tab].forEach(function (f) {
      if (f[0] === 'tail') grid.appendChild(select(f[1], 'd-tail', [['left', W.left], ['right', W.right], ['center', W.center]], v.tail));
      else grid.appendChild(field(f[1], 'd-' + f[0], v[f[0]]));
    });
    root.appendChild(grid);
    var out = el('div', 'out', null, { 'aria-live': 'polite' });
    root.appendChild(out);
    function go() {
      FIELDS[st.tab].forEach(function (f) { var i = document.getElementById('d-' + f[0]); if (i) v[f[0]] = i.value; });
      save(st); clearOut(out);
      try {
        var t = st.tab, r;
        if (t === 'npd') kv(out, [['f(x)', SCM.normalPdf(num(v.x), num(v.mu, 0), num(v.sd, 1))]]);
        if (t === 'ncd') {
          var mu = num(v.mu, 0), sd = num(v.sd, 1), lo = num(v.lo, -Infinity), hi = num(v.hi, Infinity);
          r = SCM.normalCdf(lo, hi, mu, sd);
          kv(out, [['P', r], isFinite(lo) ? ['z ' + W.lower.split(' ')[0], (lo - mu) / sd] : null, isFinite(hi) ? ['z ' + W.upper.split(' ')[0], (hi - mu) / sd] : null]);
        }
        if (t === 'invn') {
          var xs = SCM.invNormal(num(v.p), num(v.mu, 0), num(v.sd, 1), v.tail);
          kv(out, xs.map(function (x, i) { return ['x' + (xs.length > 1 ? (i + 1) : ''), x]; }));
        }
        if (t === 'bpd') kv(out, [['P(X = ' + v.x + ')', SCM.binomPdf(num(v.x), num(v.n), num(v.p))]]);
        if (t === 'bcd') { var n = num(v.n); kv(out, [['P', SCM.binomCdf(num(v.lo, 0), num(v.hi, n), n, num(v.p))]]); }
        if (t === 'ppd') kv(out, [['P(X = ' + v.x + ')', SCM.poissonPdf(num(v.x), num(v.lam))]]);
        if (t === 'pcd') kv(out, [['P', SCM.poissonCdf(num(v.lo, 0), num(v.hi, Infinity), num(v.lam))]]);
      } catch (e) { showErr(out, e); }
    }
    root.addEventListener('input', debounce(go, 150));
    var ts = document.getElementById('d-tail'); if (ts) ts.addEventListener('change', go);
    go();
  }
  // root 에 input 리스너가 쌓이지 않게 새 판으로
  var orig = root;
  draw = (function (inner) { return function () { var fresh = orig.cloneNode(false); orig.parentNode.replaceChild(fresh, orig); orig = root = fresh; inner(); }; })(draw);
  draw();
}

// ================================================================ 방정식
function eqUI() {
  var st = { tab: 'poly', n: 2, deg: 2, op: '>', sys: {}, co: {}, ineq: {}, solve: { e: 'x^3=2x+5', x0: '2' }, ratio: { a: '3', b: '4', c: '9', d: '' } };
  for (var k in saved) if (k in st) st[k] = saved[k];
  var qp = q('poly');
  if (qp) { var parts = qp.split(','); st.tab = 'poly'; st.deg = Math.max(2, Math.min(4, parts.length - 1)); st.co[st.deg] = parts; }
  var VN = ['x', 'y', 'z', 't'], CN = ['a', 'b', 'c', 'd', 'e'];
  var orig = root;
  function fresh() { var f = orig.cloneNode(false); orig.parentNode.replaceChild(f, orig); orig = root = f; }
  function draw() {
    fresh();
    root.appendChild(tabs([['sys', W.sys], ['poly', W.poly], ['ineq', W.ineq], ['solve', W.solve], ['ratio', W.ratio]], st.tab, function (t) { st.tab = t; draw(); }));
    var out = el('div', 'out', null, { 'aria-live': 'polite' }), go;
    if (st.tab === 'sys') {
      root.appendChild(tabs([[2, W.unknowns + ' 2'], [3, '3'], [4, '4']].map(function (a) { return [a[0], a[1]]; }), st.n, function (n) { st.n = n; draw(); }));
      var M = st.sys[st.n] = st.sys[st.n] || defaultsSys(st.n);
      var g = el('div', 'mat-grid eq-grid', null, { style: 'grid-template-columns: repeat(' + (st.n + 1) + ', minmax(0, 1fr))' });
      for (var j = 0; j <= st.n; j++) g.appendChild(el('div', 'lab', j < st.n ? VN[j] : '='));
      for (var i = 0; i < st.n; i++) for (var j2 = 0; j2 <= st.n; j2++) {
        var inp = el('input', 'inp', null, { type: 'text', inputmode: 'decimal', 'data-i': i, 'data-j': j2, 'aria-label': (i + 1) + ': ' + (j2 < st.n ? VN[j2] : '=') });
        inp.value = M[i][j2]; g.appendChild(inp);
      }
      root.appendChild(g);
      go = function () {
        root.querySelectorAll('.eq-grid input').forEach(function (inp) { M[+inp.getAttribute('data-i')][+inp.getAttribute('data-j')] = inp.value; });
        save(st); clearOut(out);
        try {
          var A = M.map(function (r) { return r.slice(0, st.n).map(function (s) { return val(s) || SC.ZERO; }); }), b = M.map(function (r) { return val(r[st.n]) || SC.ZERO; });
          var res = SCM.solveSystem(A, b);
          if (res.kind === 'none') out.textContent = W.none;
          else if (res.kind === 'many') out.textContent = W.many;
          else kv(out, res.x.map(function (v, i) { return [VN[i], v]; }));
        } catch (e) { showErr(out, e); }
      };
    } else if (st.tab === 'poly' || st.tab === 'ineq') {
      root.appendChild(tabs([[2, W.degree + ' 2'], [3, '3'], [4, '4']], st.deg, function (d) { st.deg = d; draw(); }));
      var store = st.tab === 'poly' ? st.co : st.ineq;
      var co = store[st.deg] = store[st.deg] || defaultsPoly(st.deg, st.tab);
      var form = el('p', 'eq-form');
      var txt = CN.slice(0, st.deg + 1).map(function (c, i) { var p = st.deg - i; return c + (p ? 'x' + (p > 1 ? sup(String(p)) : '') : ''); }).join(' + ');
      form.textContent = txt + (st.tab === 'poly' ? ' = 0' : '');
      if (st.tab === 'ineq') {
        var os = el('select', 'inp inp-op', null, { 'aria-label': W.ineq });
        [['>', '> 0'], ['>=', '≥ 0'], ['<', '< 0'], ['<=', '≤ 0']].forEach(function (o) { var op = el('option', null, o[1], { value: o[0] }); if (o[0] === st.op) op.selected = true; os.appendChild(op); });
        os.addEventListener('change', function () { st.op = os.value; go(); });
        form.appendChild(document.createTextNode(' ')); form.appendChild(os);
      }
      root.appendChild(form);
      var g2 = el('div', 'row' + Math.min(st.deg + 1, 3) + ' co-grid');
      for (var c = 0; c <= st.deg; c++) g2.appendChild(field(CN[c], 'co-' + c, co[c]));
      root.appendChild(g2);
      go = function () {
        for (var c = 0; c <= st.deg; c++) co[c] = document.getElementById('co-' + c).value;
        save(st); clearOut(out);
        try {
          var vals = co.slice(0, st.deg + 1).map(function (s) { return val(s) || SC.ZERO; });
          if (SC.isZero(vals[0])) throw SC.mathErr('domain');
          if (st.tab === 'poly') {
            var roots = SCM.polyRoots(vals.slice());
            var rows = roots.map(function (v, i) { return ['x' + sub1(i + 1), v]; });
            SCM.polyExtrema(vals).forEach(function (p) {
              rows.push([st.deg === 2 ? W.vertex : (p.kind === 'max' ? W.lmax : W.lmin), pointText(p.x, p.y)]);
            });
            kv(out, rows);
          } else {
            var r = SCM.polyInequality(vals, st.op);
            if (r.all) out.textContent = W.all;
            else if (r.none) out.textContent = W.noneIneq;
            else {
              var line = el('div', 'ineq-out');
              r.parts.forEach(function (p, i) {
                if (i) line.appendChild(document.createTextNode(',  '));
                if (p.eq) { line.appendChild(document.createTextNode('x = ')); line.appendChild(fmt(p.eq)); return; }
                if (p.lo) { line.appendChild(fmt(p.lo)); line.appendChild(document.createTextNode(p.loIn ? ' ≤ ' : ' < ')); }
                line.appendChild(document.createTextNode('x'));
                if (p.hi) { line.appendChild(document.createTextNode(p.hiIn ? ' ≤ ' : ' < ')); line.appendChild(fmt(p.hi)); }
              });
              out.appendChild(line);
            }
          }
        } catch (e) { showErr(out, e); }
      };
    } else if (st.tab === 'solve') {
      root.appendChild(field(W.eq, 'sv-e', st.solve.e, { inputmode: 'text' }));
      root.appendChild(field(W.start, 'sv-x0', st.solve.x0));
      go = function () {
        st.solve.e = document.getElementById('sv-e').value; st.solve.x0 = document.getElementById('sv-x0').value;
        save(st); clearOut(out);
        try {
          var parts = st.solve.e.split('=');
          if (parts.length > 2) throw SC.synErr('eq');
          var L_ = SC.parseRow(SC.parseText(parts[0])), R_ = parts.length === 2 && parts[1].trim() ? SC.parseRow(SC.parseText(parts[1])) : null;
          var f = function (x) {
            var e2 = Object.create(env || SC.defaultEnv()); e2.x = SC.F(x);
            var a = SC.toNum(SC.evaluate(L_, e2)), b = R_ ? SC.toNum(SC.evaluate(R_, e2)) : 0;
            return a - b;
          };
          var r = SCM.solveNumeric(f, num(st.solve.x0, 0));
          kv(out, [['x', r.x], [W.resid, r.res]]);
        } catch (e) { showErr(out, e); }
      };
    } else {
      root.appendChild(el('p', 'hint', W.ratioHint));
      var rg = el('div', 'ratio-grid');
      ['a', 'b', 'c', 'd'].forEach(function (k, i) {
        var inp = el('input', 'inp', null, { id: 'rt-' + k, type: 'text', inputmode: 'decimal', 'aria-label': k });
        inp.value = st.ratio[k]; rg.appendChild(inp);
        if (i < 3) rg.appendChild(el('span', 'ratio-sep', i === 1 ? '=' : ':'));
      });
      root.appendChild(rg);
      go = function () {
        ['a', 'b', 'c', 'd'].forEach(function (k) { st.ratio[k] = document.getElementById('rt-' + k).value; });
        save(st); clearOut(out);
        try {
          var vs = ['a', 'b', 'c', 'd'].map(function (k) { return val(st.ratio[k]); });
          var miss = vs.filter(function (v) { return v === null; }).length;
          if (miss !== 1) return;
          var k = ['a', 'b', 'c', 'd'][vs.indexOf(null)];
          kv(out, [[k, SCM.ratio(vs[0], vs[1], vs[2], vs[3])]]);
        } catch (e) { showErr(out, e); }
      };
    }
    root.appendChild(out);
    root.addEventListener('input', debounce(go, 200));
    go();
  }
  function sub1(n) { return String(n).split('').map(function (c) { return '₀₁₂₃₄₅₆₇₈₉'[+c]; }).join(''); }
  function pointText(x, y) { var s = el('span'); s.appendChild(document.createTextNode('(')); s.appendChild(fmt(x)); s.appendChild(document.createTextNode(', ')); s.appendChild(fmt(y)); s.appendChild(document.createTextNode(')')); return s; }
  function defaultsSys(n) {
    var D = { 2: [['2', '3', '12'], ['1', '-1', '1']], 3: [['1', '1', '1', '6'], ['2', '-1', '1', '3'], ['1', '2', '-1', '2']],
      4: [['1', '1', '1', '1', '10'], ['1', '-1', '1', '-1', '-2'], ['2', '1', '-1', '1', '5'], ['1', '2', '3', '-1', '10']] };
    return D[n];
  }
  function defaultsPoly(d, tab) {
    if (tab === 'ineq') return { 2: ['1', '-4', '3'], 3: ['1', '-6', '11', '-6'], 4: ['1', '0', '-5', '0', '4'] }[d];
    return { 2: ['1', '-2', '-1'], 3: ['1', '-6', '11', '-6'], 4: ['1', '0', '-5', '0', '4'] }[d];
  }
  draw();
}

// ================================================================ 행렬·벡터
function matUI() {
  var st = { tab: 'mat', A: { r: 2, c: 2, v: [['2', '1'], ['1', '3']] }, B: { r: 2, c: 2, v: [['1', '0'], ['0', '1']] }, dim: 3, vA: ['1', '2', '3'], vB: ['4', '5', '6'] };
  for (var k in saved) if (k in st) st[k] = saved[k];
  var orig = root, last = null;
  function fresh() { var f = orig.cloneNode(false); orig.parentNode.replaceChild(f, orig); orig = root = f; }
  function grid(name, M) {
    var box = el('div', 'mat-box');
    var head = el('div', 'mat-head');
    head.appendChild(el('b', null, W['mat' + name]));
    var rs = el('select', 'inp inp-sm', null, { 'aria-label': W['mat' + name] + ' ' + W.rows }), cs = el('select', 'inp inp-sm', null, { 'aria-label': W['mat' + name] + ' ' + W.cols });
    for (var i = 1; i <= 4; i++) { var o1 = el('option', null, String(i), { value: i }); if (i === M.r) o1.selected = true; rs.appendChild(o1); var o2 = el('option', null, String(i), { value: i }); if (i === M.c) o2.selected = true; cs.appendChild(o2); }
    rs.addEventListener('change', function () { readAll(); resize(M, +rs.value, M.c); draw(); });
    cs.addEventListener('change', function () { readAll(); resize(M, M.r, +cs.value); draw(); });
    head.appendChild(rs); head.appendChild(el('span', null, '×')); head.appendChild(cs);
    box.appendChild(head);
    var g = el('div', 'mat-grid', null, { style: 'grid-template-columns: repeat(' + M.c + ', minmax(0, 1fr))' });
    for (var r = 0; r < M.r; r++) for (var c = 0; c < M.c; c++) {
      var inp = el('input', 'inp', null, { type: 'text', inputmode: 'decimal', 'data-m': name, 'data-r': r, 'data-c': c, 'aria-label': name + (r + 1) + (c + 1) });
      inp.value = M.v[r][c]; g.appendChild(inp);
    }
    box.appendChild(g);
    return box;
  }
  function resize(M, r, c) {
    var v = [];
    for (var i = 0; i < r; i++) { v.push([]); for (var j = 0; j < c; j++) v[i].push(M.v[i] && M.v[i][j] !== undefined ? M.v[i][j] : (i === j ? '1' : '0')); }
    M.r = r; M.c = c; M.v = v;
  }
  function readAll() {
    root.querySelectorAll('input[data-m]').forEach(function (inp) { st[inp.getAttribute('data-m')].v[+inp.getAttribute('data-r')][+inp.getAttribute('data-c')] = inp.value; });
    root.querySelectorAll('input[data-v]').forEach(function (inp) { st[inp.getAttribute('data-v')][+inp.getAttribute('data-i')] = inp.value; });
    save(st);
  }
  function values(M) { return M.v.map(function (row) { return row.map(function (s) { return val(s) || SC.ZERO; }); }); }
  function showMatrix(out, label, R) {
    out.appendChild(el('h3', 'out-h', label));
    var t = el('table', 'mat-out');
    R.forEach(function (row) { var tr = el('tr'); row.forEach(function (v) { var td = el('td'); td.appendChild(fmt(v, false, true)); tr.appendChild(td); }); t.appendChild(tr); });
    out.appendChild(t);
    last = R;
    var br = el('div', 'btn-row');
    br.appendChild(btn(W.toA, function () { put('A'); }, 'btn-ghost'));
    br.appendChild(btn(W.toB, function () { put('B'); }, 'btn-ghost'));
    out.appendChild(br);
  }
  function put(name) {
    if (!last) return;
    st[name] = { r: last.length, c: last[0].length, v: last.map(function (row) { return row.map(function (v) { return plain(v).replace(/−/g, '-'); }); }) };
    save(st); draw();
  }
  function draw() {
    fresh();
    root.appendChild(tabs([['mat', W.mat], ['vct', W.vct]], st.tab, function (t) { readAll(); st.tab = t; draw(); }));
    var out = el('div', 'out', null, { 'aria-live': 'polite' });
    function run(label, fn) {
      return btn(label, function () {
        readAll(); clearOut(out); last = null;
        try { fn(); } catch (e) { showErr(out, e); }
        out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 'btn-op');
    }
    if (st.tab === 'mat') {
      var two = el('div', 'mat-two');
      two.appendChild(grid('A', st.A)); two.appendChild(grid('B', st.B));
      root.appendChild(two);
      var ops = el('div', 'btn-row ops');
      ops.appendChild(run('A + B', function () { showMatrix(out, 'A + B', SCM.madd(values(st.A), values(st.B))); }));
      ops.appendChild(run('A − B', function () { showMatrix(out, 'A − B', SCM.madd(values(st.A), values(st.B), true)); }));
      ops.appendChild(run('A × B', function () { showMatrix(out, 'A × B', SCM.mmul(values(st.A), values(st.B))); }));
      ops.appendChild(run('B × A', function () { showMatrix(out, 'B × A', SCM.mmul(values(st.B), values(st.A))); }));
      ops.appendChild(run('det A', function () { kv(out, [[W.det + ' A', SCM.mdet(values(st.A))]]); }));
      ops.appendChild(run('A⁻¹', function () { showMatrix(out, 'A⁻¹', SCM.minv(values(st.A))); }));
      ops.appendChild(run('Aᵀ', function () { showMatrix(out, 'Aᵀ', SCM.mtrans(values(st.A))); }));
      ops.appendChild(run('A²', function () { showMatrix(out, 'A²', SCM.mpow(values(st.A), 2)); }));
      ops.appendChild(run('rank A', function () { kv(out, [[W.rank + ' A', String(SCM.mrank(values(st.A)))]]); }));
      ops.appendChild(run('det B', function () { kv(out, [[W.det + ' B', SCM.mdet(values(st.B))]]); }));
      ops.appendChild(run('B⁻¹', function () { showMatrix(out, 'B⁻¹', SCM.minv(values(st.B))); }));
      root.appendChild(ops);
    } else {
      root.appendChild(tabs([[2, W.dim + ' 2'], [3, '3']], st.dim, function (d) { readAll(); st.dim = d; draw(); }));
      var vv = el('div', 'row2');
      ['vA', 'vB'].forEach(function (name) {
        var box = el('div', 'field'); box.appendChild(el('span', 'lab', W[name]));
        var g = el('div', 'mat-grid', null, { style: 'grid-template-columns: repeat(' + st.dim + ', minmax(0, 1fr))' });
        for (var i = 0; i < st.dim; i++) { var inp = el('input', 'inp', null, { type: 'text', inputmode: 'decimal', 'data-v': name, 'data-i': i, 'aria-label': W[name] + ' ' + (i + 1) }); inp.value = st[name][i] || '0'; g.appendChild(inp); }
        box.appendChild(g); vv.appendChild(box);
      });
      root.appendChild(vv);
      function vec(name) { return st[name].slice(0, st.dim).map(function (s) { return val(s) || SC.ZERO; }); }
      function showVec(label, v) { var s = el('span'); s.appendChild(document.createTextNode('[ ')); v.forEach(function (a, i) { if (i) s.appendChild(document.createTextNode(',  ')); s.appendChild(fmt(a, false, true)); }); s.appendChild(document.createTextNode(' ]')); kv(out, [[label, s]]); }
      var ops2 = el('div', 'btn-row ops');
      ops2.appendChild(run('A · B', function () { kv(out, [['A · B', SCM.vdot(vec('vA'), vec('vB'))]]); }));
      ops2.appendChild(run('A × B', function () { showVec('A × B', SCM.vcross(vec('vA'), vec('vB'))); }));
      ops2.appendChild(run('|A|', function () { kv(out, [['|A|', SCM.vnorm(vec('vA'))]]); }));
      ops2.appendChild(run('|B|', function () { kv(out, [['|B|', SCM.vnorm(vec('vB'))]]); }));
      ops2.appendChild(run(W.angle, function () { kv(out, [[W.angle + ' (' + settings.angle.toUpperCase() + ')', SCM.vangle(vec('vA'), vec('vB'), settings.angle)]]); }));
      ops2.appendChild(run(W.unit + ' A', function () { showVec(W.unit + ' A', SCM.vunit(vec('vA'))); }));
      ops2.appendChild(run('A + B', function () { var a = vec('vA'), b = vec('vB'); showVec('A + B', a.map(function (x, i) { return SC.add(x, b[i]); })); }));
      ops2.appendChild(run('A − B', function () { var a = vec('vA'), b = vec('vB'); showVec('A − B', a.map(function (x, i) { return SC.sub(x, b[i]); })); }));
      root.appendChild(ops2);
    }
    root.appendChild(out);
    root.addEventListener('input', debounce(readAll, 300));
  }
  draw();
}

// ================================================================ 진법
function baseUI() {
  var st = { base: 'HEX', bits: 32, e: 'FF + 1' };
  for (var k in saved) if (k in st) st[k] = saved[k];
  var row = el('div', 'row2');
  var bs = select(W.inBase, 'b-base', [['DEC', 'DEC (10)'], ['HEX', 'HEX (16)'], ['OCT', 'OCT (8)'], ['BIN', 'BIN (2)']], st.base);
  var bt = select(W.bits, 'b-bits', [[8, '8'], [16, '16'], [32, '32'], [64, '64']], st.bits);
  row.appendChild(bs); row.appendChild(bt);
  root.appendChild(row);
  var f = field(W.expr, 'b-e', st.e, { inputmode: 'text', autocapitalize: 'characters' });
  root.appendChild(f);
  var lg = el('div', 'btn-row');
  ['and', 'or', 'xor', 'xnor', 'not(', 'neg(', '(', ')'].forEach(function (w) {
    lg.appendChild(btn(w, function () { var i = f.querySelector('input'); var s = i.value; i.value = s + (s && !/[\s(]$/.test(s) && w[0] !== ')' ? ' ' : '') + w + (/[a-z]$/.test(w) ? ' ' : ''); i.focus(); go(); }, 'btn-ghost btn-sm'));
  });
  root.appendChild(lg);
  var out = el('div', 'out base-out', null, { 'aria-live': 'polite' });
  root.appendChild(out);
  function go() {
    st.base = bs.querySelector('select').value; st.bits = +bt.querySelector('select').value; st.e = f.querySelector('input').value;
    save(st); out.textContent = ''; out.className = 'out base-out';
    if (!st.e.trim()) return;
    try {
      var v = SCM.baseCalc(st.e.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'), SCM.BASES[st.base], st.bits);
      var all = SCM.baseAll(v, st.bits);
      ['DEC', 'HEX', 'OCT', 'BIN'].forEach(function (b) {
        var d = el('div'); d.appendChild(el('b', null, b));
        var c = el('code', null, b === 'BIN' ? all[b].replace(/(?=(\d{4})+$)/g, ' ').trim() : all[b]); d.appendChild(c); out.appendChild(d);
      });
    } catch (e) { showErr(out, e); }
  }
  root.addEventListener('input', debounce(go, 150));
  root.addEventListener('change', go);
  go();
}

// ================================================================ 함수표
function tableUI() {
  var st = { f: 'x^2-3x+1', g: '', a: '-2', b: '5', s: '1' };
  for (var k in saved) if (k in st) st[k] = saved[k];
  root.appendChild(field(W.fx, 't-f', st.f, { inputmode: 'text' }));
  root.appendChild(field(W.gx, 't-g', st.g, { inputmode: 'text' }));
  var r3 = el('div', 'row3');
  r3.appendChild(field(W.from, 't-a', st.a)); r3.appendChild(field(W.to, 't-b', st.b)); r3.appendChild(field(W.step, 't-s', st.s));
  root.appendChild(r3);
  var out = el('div', 'out', null, { 'aria-live': 'polite' });
  root.appendChild(out);
  var rows = null;
  function go() {
    ['f', 'g', 'a', 'b', 's'].forEach(function (k) { st[k] = document.getElementById('t-' + k).value; });
    save(st); clearOut(out); rows = null;
    try {
      rows = SCM.makeTable(st.f.trim(), st.g.trim() || null, need(st.a), need(st.b), need(st.s), env);
      out.appendChild(chart(rows));
      var wrap = el('div', 'tbl-wrap'), t = el('table', 'tbl'), hr = el('tr');
      ['x', 'f(x)'].concat(st.g.trim() ? ['g(x)'] : []).forEach(function (h) { hr.appendChild(el('th', null, h)); });
      t.appendChild(hr);
      rows.forEach(function (r) {
        var tr = el('tr');
        [r.x, r.f].concat(st.g.trim() ? [r.g] : []).forEach(function (v) {
          var td = el('td');
          if (v && v.error) { td.textContent = 'ERROR'; td.className = 'is-err'; } else td.textContent = plain(v);
          tr.appendChild(td);
        });
        t.appendChild(tr);
      });
      wrap.appendChild(t); out.appendChild(wrap);
      var br = el('div', 'btn-row');
      br.appendChild(btn(W.copyTable, function () {
        var tsv = rows.map(function (r) { return [r.x, r.f].concat(st.g.trim() ? [r.g] : []).map(function (v) { return v && v.error ? 'ERROR' : (SC.isC(v) ? plain(v) : SC.decimalText(SC.formatDecimal(v, { mode: 'norm' }))); }).join('\t'); });
        UI.copyText(['x', 'f(x)'].concat(st.g.trim() ? ['g(x)'] : []).join('\t') + '\n' + tsv.join('\n'), function (ok) { UI.toast(ok ? W.copied : UI.t('copyFail')); });
      }, 'btn-ghost'));
      out.appendChild(br);
    } catch (e) { showErr(out, e); }
  }
  // 그래프: 표 간격과 따로 화면 폭에 맞춰 촘촘히(약 2px마다) 계산해 매끄러운 곡선으로. 표 값은 점으로 표시.
  // 끊긴 곳(정의역 밖, 1/x·tan x 점근선)은 선을 잇지 않는다. 계산이 오래 걸리면(적분 등) 표 점만 잇는다.
  function chart(rows) {
    var NS = 'http://www.w3.org/2000/svg';
    var w = Math.round(Math.max(280, Math.min(1000, (root.clientWidth - 28) || 320))), h = Math.round(Math.max(170, Math.min(320, w * 0.42))), pad = 10;
    var keys = st.g.trim() ? ['f', 'g'] : ['f'];
    var tbl = { f: [], g: [] }, xs = [], ys = [];
    rows.forEach(function (r) {
      var x = SC.toNum(r.x); xs.push(x);
      keys.forEach(function (k) { var v = r[k]; if (v && !v.error && !SC.isC(v)) { var y = SC.toNum(v); if (isFinite(y)) { tbl[k].push([x, y]); ys.push(y); } } });
    });
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('class', 'chart'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'f(x)');
    if (!ys.length) return svg;
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    // 촘촘한 점 (x 는 소수로 계산: 빠르고, 그리기에는 충분히 정확)
    var fns = { f: SC.parseRow(SC.parseText(st.f.trim())), g: st.g.trim() ? SC.parseRow(SC.parseText(st.g.trim())) : null };
    var N = x1 > x0 ? Math.round((w - 2 * pad) / 2) : 0, dense = { f: [], g: [] }, t0 = Date.now(), slow = false;
    for (var i = 0; i <= N && !slow; i++) {
      var x = x0 + (x1 - x0) * i / N, e2 = Object.create(env || SC.defaultEnv()); e2.x = SC.F(x);
      keys.forEach(function (k) {
        var y = NaN;
        try { var v = SC.evaluate(fns[k], e2); if (!SC.isC(v)) y = SC.toNum(v); } catch (e) {}
        dense[k].push([x, isFinite(y) ? y : NaN]);
      });
      if (Date.now() - t0 > 250) slow = true;
    }
    var src = slow || !N ? tbl : dense;
    // 세로 범위: 표 값 기준(너무 큰 값 하나가 그래프를 납작하게 만들지 않게 2%~98%), 촘촘한 점은 그 안에서만 넓힘
    ys.sort(function (a, b) { return a - b; });
    var lo = ys[Math.floor(ys.length * 0.02)], hi = ys[Math.ceil(ys.length * 0.98) - 1];
    if (src === dense && ys.length >= 4) {
      var dy = []; keys.forEach(function (k) { dense[k].forEach(function (p) { if (isFinite(p[1])) dy.push(p[1]); }); });
      dy.sort(function (a, b) { return a - b; });
      var dlo = dy[Math.floor(dy.length * 0.02)], dhi = dy[Math.ceil(dy.length * 0.98) - 1], span = (hi - lo) || 1;
      if (dlo < lo) lo = Math.max(dlo, lo - span * 0.5);
      if (dhi > hi) hi = Math.min(dhi, hi + span * 0.5);
    }
    if (hi === lo) { hi += 1; lo -= 1; }
    var m = (hi - lo) * 0.06; hi += m; lo -= m;
    var X = function (x) { return pad + (x - x0) / ((x1 - x0) || 1) * (w - 2 * pad); }, Y = function (y) { return h - pad - (y - lo) / (hi - lo) * (h - 2 * pad); };
    function line(x1_, y1_, x2_, y2_) { var l = document.createElementNS(NS, 'line'); l.setAttribute('x1', x1_); l.setAttribute('y1', y1_); l.setAttribute('x2', x2_); l.setAttribute('y2', y2_); l.setAttribute('class', 'ax'); svg.appendChild(l); }
    if (lo < 0 && hi > 0) line(pad, Y(0), w - pad, Y(0));
    if (x0 < 0 && x1 > 0) line(X(0), pad, X(0), h - pad);
    var top = -h, bot = 2 * h;
    keys.forEach(function (k) {
      var pts = src[k], d = '', pen = false, prev = null;
      pts.forEach(function (p) {
        if (!isFinite(p[1])) { pen = false; prev = null; return; }
        var py = Y(p[1]);
        // 점근선: 화면 위쪽 밖과 아래쪽 밖을 바로 건너뛰면 잇지 않는다
        if (prev !== null && ((prev < 0 && py > h) || (prev > h && py < 0))) pen = false;
        d += (pen ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Math.max(top, Math.min(bot, py)).toFixed(1);
        pen = true; prev = py;
      });
      if (!d) return;
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d); path.setAttribute('class', k === 'f' ? 'lf' : 'lg'); svg.appendChild(path);
      if (src === dense && tbl[k].length <= 60) tbl[k].forEach(function (p) {
        var py = Y(p[1]); if (py < 0 || py > h) return;
        var c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', X(p[0]).toFixed(1)); c.setAttribute('cy', py.toFixed(1)); c.setAttribute('r', 3);
        c.setAttribute('class', k === 'f' ? 'pt' : 'pt pg'); svg.appendChild(c);
      });
    });
    return svg;
  }
  root.addEventListener('input', debounce(go, 300));
  go();
}

({ stats: statsUI, distribution: distUI, equation: eqUI, matrix: matUI, base: baseUI, table: tableUI })[mode]();
document.documentElement.classList.add('modes-ready');
window.__modeReady = true;
})();
