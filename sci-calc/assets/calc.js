/* 계산 화면 (첫 페이지): 키패드·키보드 → 편집기, = → 결과, 결과 바꿔 보기, 함수·변수·설정·기록 판 */
(function () {
'use strict';
var SC = window.SC, ME = window.ME, UI = window.UI, t = UI.t, L = UI.LANG;
var root = document.getElementById('calc');
if (!root) return;

var W = {
  ko: { fn: '함수', vars: '변수', settings: '설정', history: '기록', close: '닫기', insert: '넣기', store: 'Ans 저장', zero: '0으로',
    hyp: '쌍곡선 함수', numfn: '수·정수', prob: '순열·조합·난수', coord: '좌표·복소수', calculus: '미적분·로그', consts: '물리 상수 (CODATA 2022)', units: '단위 바꾸기',
    angle: '각도 단위', disp: '숫자 표시', norm: '보통', fix: '소수점 자리 고정 (Fix)', sci: '유효숫자 (Sci)', digits: '자리',
    fracOut: '분수 결과', improper: '가분수 7/3', mixed: '대분수 2⅓', cplx: '복소수', off: '끔', decIn: '소수를 넣으면 결과도 소수로',
    clearHist: '기록 모두 지우기', emptyHist: '아직 계산 기록이 없어요', mplus: 'M+ (Ans 더하기)', mminus: 'M− (Ans 빼기)', clearVars: '변수 모두 0으로',
    exactNote: 'SI 정의값(오차 없음)', varsNote: '변수와 기록은 이 기기 브라우저에만 저장돼요.', copy: '복사', sd: 'S⇔D', eng: 'ENG', dms: '°′″', fact: '소인수',
    expr: '계산식', result: '결과', shiftOn: 'SHIFT 켜짐' },
  en: { fn: 'Functions', vars: 'Variables', settings: 'Settings', history: 'History', close: 'Close', insert: 'Insert', store: 'Store Ans', zero: 'Set 0',
    hyp: 'Hyperbolic', numfn: 'Numbers & integers', prob: 'Permutations & random', coord: 'Coordinates & complex', calculus: 'Calculus & logs', consts: 'Physical constants (CODATA 2022)', units: 'Unit conversions',
    angle: 'Angle unit', disp: 'Number format', norm: 'Normal', fix: 'Fixed decimals (Fix)', sci: 'Significant figures (Sci)', digits: 'digits',
    fracOut: 'Fraction results', improper: 'Improper 7/3', mixed: 'Mixed 2⅓', cplx: 'Complex numbers', off: 'Off', decIn: 'Decimal in, decimal out',
    clearHist: 'Clear history', emptyHist: 'No calculations yet', mplus: 'M+ (add Ans)', mminus: 'M− (subtract Ans)', clearVars: 'Reset all to 0',
    exactNote: 'exact SI value', varsNote: 'Variables and history stay in this browser only.', copy: 'Copy', sd: 'S⇔D', eng: 'ENG', dms: '°′″', fact: 'Factor',
    expr: 'Expression', result: 'Result', shiftOn: 'SHIFT on' }
}[L];
var CONST_NAMES = {
  ko: { c0: '빛의 속력', h: '플랑크 상수', hbar: '디랙 상수 h/2π', qe: '기본 전하', k: '볼츠만 상수', NA: '아보가드로 수', R: '기체 상수', F: '패러데이 상수',
    G: '만유인력 상수', g: '표준 중력 가속도', me: '전자 질량', mp: '양성자 질량', mn: '중성자 질량', u: '원자 질량 단위', eps0: '진공 유전율', mu0: '진공 투자율',
    a0: '보어 반지름', Rinf: '뤼드베리 상수', alpha: '미세 구조 상수', sigma: '슈테판-볼츠만 상수', Vm: '이상 기체 몰부피', atm: '표준 대기압', t0: '0 °C의 절대 온도' },
  en: { c0: 'speed of light', h: 'Planck constant', hbar: 'reduced Planck constant', qe: 'elementary charge', k: 'Boltzmann constant', NA: 'Avogadro constant', R: 'gas constant', F: 'Faraday constant',
    G: 'gravitational constant', g: 'standard gravity', me: 'electron mass', mp: 'proton mass', mn: 'neutron mass', u: 'atomic mass constant', eps0: 'vacuum permittivity', mu0: 'vacuum permeability',
    a0: 'Bohr radius', Rinf: 'Rydberg constant', alpha: 'fine-structure constant', sigma: 'Stefan–Boltzmann constant', Vm: 'molar volume of ideal gas', atm: 'standard atmosphere', t0: '0 °C in kelvin' }
}[L];

var settings = UI.loadSettings(), vars = UI.loadVars(), ans = UI.loadAns();
var hist = UI.store.get('sc.hist', []);
var exprEl = root.querySelector('.expr'), resEl = root.querySelector('.result'), statusEl = root.querySelector('.status');
var sheet = root.querySelector('.sheet');
var state = { done: false, value: null, view: {}, shift: false, histPos: -1, row: null };

var ed = new ME.Editor(exprEl, { onChange: onEdit, onHistory: histNav });
ed.draw();

// ---------------------------------------------------------------- 상태 줄
function drawStatus() {
  var ang = { deg: 'DEG', rad: 'RAD', gra: 'GRA' }[settings.angle];
  var disp = settings.disp.mode === 'fix' ? 'Fix ' + settings.disp.digits : settings.disp.mode === 'sci' ? 'Sci ' + settings.disp.digits : 'Norm';
  statusEl.querySelector('[data-st=angle]').textContent = ang;
  statusEl.querySelector('[data-st=disp]').textContent = disp;
  var c = statusEl.querySelector('[data-st=cplx]');
  c.hidden = settings.complex === 'off'; c.textContent = settings.complex === 'polar' ? 'r∠θ' : 'a+bi';
  statusEl.querySelector('[data-st=shift]').hidden = !state.shift;
  var m = statusEl.querySelector('[data-st=m]');
  m.hidden = !(vars.M && !SC.isZero(vars.M));
  var wasShift = root.classList.contains('is-shift');
  root.classList.toggle('is-shift', state.shift);
  if (state.shift && !wasShift && !calmMo.matches) mo(root, 'mo-shift');
}
statusEl.querySelector('[data-st=angle]').addEventListener('click', function () {
  settings.angle = { deg: 'rad', rad: 'gra', gra: 'deg' }[settings.angle]; UI.saveSettings(settings); drawStatus(); onEdit();
});
statusEl.querySelector('[data-st=disp]').addEventListener('click', function () { openSheet('settings'); });

// ---------------------------------------------------------------- 계산
function env() { return UI.envFrom(settings, vars, ans); }
// ---------------------------------------------------------------- 연출 (2026-10-06, 설계서 '연출 요청문')
// 기본 반응은 CSS(--mo-d·--mo-e 한 값)로, 여기선 class 만 다시 붙인다. 화려한 연출은 3개(SHIFT 불 켜짐, 정확값 밑줄, 기록 불러오기).
var calmMo = matchMedia('(prefers-reduced-motion: reduce)');
function mo(node, cls) {
  if (!node) return;
  clearTimeout(node['_mo' + cls]);
  node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls);
  node['_mo' + cls] = setTimeout(function () { node.classList.remove(cls); }, 700);
}
// 정확값(분수·√·π)으로 나온 답 밑에 주황 줄이 오른쪽에서 왼쪽으로 그어졌다 사라진다 (0.3초)
function moExact() {
  if (calmMo.matches || !resEl.firstChild) return;
  var r = document.createRange(); r.selectNodeContents(resEl);
  var b = r.getBoundingClientRect(), o = resEl.getBoundingClientRect();
  if (!b.width) return;
  var line = document.createElement('span'); line.className = 'mo-line'; line.setAttribute('aria-hidden', 'true');
  line.style.left = Math.max(0, b.left - o.left + resEl.scrollLeft) + 'px'; line.style.width = Math.min(b.width, o.width) + 'px';
  resEl.appendChild(line);
  line.addEventListener('animationend', function () { line.remove(); });
  setTimeout(function () { line.remove(); }, 600);
}
// 기록 줄을 누르면 그 식이 계산 화면으로 날아간다 (0.3초, 조각 1개)
function moFly(fromEl) {
  if (calmMo.matches || !fromEl || !fromEl.animate) return;
  var a = fromEl.getBoundingClientRect(), b = exprEl.getBoundingClientRect();
  if (!a.width || !b.width) return;
  var g = fromEl.cloneNode(true); g.className = 'mo-ghost'; g.setAttribute('aria-hidden', 'true');
  g.style.left = a.left + 'px'; g.style.top = a.top + 'px'; g.style.width = a.width + 'px'; g.style.height = a.height + 'px';
  document.body.appendChild(g);
  var dx = b.left + 12 - a.left, dy = b.top + 8 - a.top;
  var an = g.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.12)', opacity: 0 }],
    { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
  an.onfinish = an.oncancel = function () { g.remove(); };
  setTimeout(function () { g.remove(); }, 700);
}
function hasNode(row, test) {
  return row.some(function (n) {
    if (test(n)) return true;
    var slots = SC.TEMPLATE_SLOTS[n.t];
    return slots ? slots.some(function (k) { return hasNode(n[k], test); }) : false;
  });
}
function hasDecimalPoint(row) { return hasNode(row, function (n) { return n.t === 'c' && n.v === '.'; }); }
function isHeavy(row) { return hasNode(row, function (n) { return n.t === 'int' || n.t === 'der' || n.t === 'sum' || n.t === 'prd' || (n.t === 'f' && (n.v === 'Ran' || n.v === 'RanInt')); }); }

function evaluateNow(forceDecimal) {
  if (ed.isEmpty()) return;
  var row = SC.cloneRow(ed.row), v;
  try { v = SC.evaluate(SC.parseRow(row), env()); }
  catch (e) { showError(e); return; }
  state.done = true; state.value = v; state.row = row;
  var exactAvail = v.t === 'multi' ? false : SC.hasExactDisplay(v);
  state.view = { decimal: !!forceDecimal || (settings.decIn && hasDecimalPoint(row)) || !exactAvail, eng: null, dms: false, fact: false, frac: null };
  var main = v.t === 'multi' ? v.items[0].v : v;
  ans = main; UI.saveAns(ans);
  hist.unshift({ e: SC.rowToText(row), r: UI.ser(main) });
  if (hist.length > 40) hist.length = 40;
  UI.store.set('sc.hist', hist);
  drawSideHist();
  state.histPos = -1;
  ME.render(row, exprEl, {});
  drawResult();
  mo(resEl, 'mo-in');
  if (sideList && sideList.firstElementChild) mo(sideList.firstElementChild, 'mo-new');
  if (!state.view.decimal && v.t === 'x' && !SC.realIsInt(v)) moExact();
}
function showError(e) {
  resEl.className = 'result is-err';
  resEl.removeAttribute('data-plain');
  resEl.textContent = UI.errorText(e);
  mo(resEl.closest('.screen'), 'mo-shake');
  if (e.kind === 'syntax') { var hint = document.createElement('span'); hint.className = 'result-hint'; hint.textContent = t('syntaxHint'); resEl.appendChild(hint); }
  state.done = false;
}
function viewOpts() {
  var o = UI.valueOpts(settings, { decimal: state.view.decimal, dms: state.view.dms });
  if (state.view.eng !== null && state.view.eng !== undefined) o.disp = { mode: 'eng', engShift: state.view.eng };
  return o;
}
function drawResult() {
  var v = state.value;
  resEl.className = 'result';
  if (state.view.fact) {
    ME.render(SC.factorRow(SC.factorize(v)), resEl, {});
  } else if (state.view.frac) {
    ME.render(SC.valueRow(state.view.frac, viewOpts()), resEl, {});
  } else {
    UI.drawValue(resEl, v, viewOpts());
  }
  drawActions();
}
function drawActions() {
  var v = state.value, real = v && v.t !== 'multi' && v.t !== 'c';
  setAct('sd', state.done && v && v.t !== 'multi' && (SC.hasExactDisplay(v) || (v.t === 'f' && SC.floatToFraction(v.v))));
  setAct('eng', state.done && real);
  setAct('dms', state.done && real);
  var factOk = false;
  try { factOk = state.done && real && SC.realIsInt(v) && SC.sign(v) > 0 && SC.toNum(v) >= 2 && SC.toNum(v) < 1e15; } catch (e) {}
  setAct('fact', factOk);
  setAct('copy', state.done);
  drawStarter();
}
function setAct(k, on) { var b = root.querySelector('[data-act=' + k + ']'); if (b) b.disabled = !on; }
// 빈 화면이면 꺼진 버튼 대신 '눌러 보기' 예시를 보여 준다
var actsEl = root.querySelector('.acts');
function drawStarter() { if (actsEl) actsEl.classList.toggle('is-start', ed.isEmpty() && !state.done); }
root.querySelectorAll('[data-try]').forEach(function (b) {
  b.addEventListener('click', function () {
    try { ed.setRow(SC.parseText(b.getAttribute('data-try'))); evaluateNow(false); } catch (e) {}
    exprEl.focus({ preventScroll: true });
  });
});

// 고칠 때마다: 흐린 미리보기
function onEdit() {
  if (!resEl) return;
  if (state.done) return;
  resEl.className = 'result is-preview';
  resEl.textContent = '';
  if (ed.isEmpty() || isHeavy(ed.row)) { drawActions(); return; }
  try {
    var v = SC.evaluate(SC.parseRow(ed.row), env());
    var exact = v.t !== 'multi' && SC.hasExactDisplay(v);
    var o = UI.valueOpts(settings, { decimal: (settings.decIn && hasDecimalPoint(ed.row)) || !exact });
    ME.render(SC.valueRow(v, o), resEl, {});
  } catch (e) { /* 아직 다 안 쓴 식: 미리보기 없음 */ }
  drawActions();
}

// ---------------------------------------------------------------- 키
var CONT = { add: 1, sub: 1, mul: 1, div: 1, sq: 1, cube: 1, inv: 1, pow: 1, fact: 1, pct: 1, nPr: 1, nCr: 1, divr: 1, root: 0, frac: 1 };
var KEYMAP = {
  add: ['c', '+'], sub: ['c', '−'], mul: ['c', '×'], div: ['c', '÷'], lp: ['c', '('], rp: ['c', ')'], comma: ['c', ','], dot: ['c', '.'],
  fact: ['c', '!'], pct: ['c', '%'], pi: ['c', 'π'], e: ['c', 'e'], x: ['c', 'x'], y: ['c', 'y'], i: ['c', 'i'], ans: ['c', 'Ans'],
  ee: ['c', 'ᴇ'], nPr: ['c', 'P'], nCr: ['c', 'C'], angle: ['c', '∠'], divr: ['c', '÷R'],
  sin: ['f', 'sin'], cos: ['f', 'cos'], tan: ['f', 'tan'], asin: ['f', 'asin'], acos: ['f', 'acos'], atan: ['f', 'atan'],
  sinh: ['f', 'sinh'], cosh: ['f', 'cosh'], tanh: ['f', 'tanh'], asinh: ['f', 'asinh'], acosh: ['f', 'acosh'], atanh: ['f', 'atanh'],
  log: ['f', 'log'], ln: ['f', 'ln'], pol: ['f', 'Pol'], rec: ['f', 'Rec'], rnd: ['f', 'Rnd'], ran: ['f', 'Ran'], ranint: ['f', 'RanInt'],
  int_: ['f', 'Int'], intg: ['f', 'Intg'], gcd: ['f', 'GCD'], lcm: ['f', 'LCM'], conjg: ['f', 'Conjg'], arg: ['f', 'Arg'], rep: ['f', 'ReP'], imp: ['f', 'ImP'],
  frac: ['t', 'frac'], mixed: ['t', 'mixed'], sqrt: ['t', 'sqrt'], pow: ['t', 'pow'], root: ['t', 'root'], abs: ['t', 'abs'], logb: ['t', 'log'],
  int: ['t', 'int'], der: ['t', 'der'], sum: ['t', 'sum'], prd: ['t', 'prd']
};
function press(k) {
  if (k === 'shift') { state.shift = !state.shift; drawStatus(); return; }
  if (state.shift) {
    var b = root.querySelector('[data-k="' + k + '"]');
    state.shift = false; drawStatus();
    if (b && b.getAttribute('data-s')) k = b.getAttribute('data-s');
  }
  switch (k) {
    case 'fnmenu': openSheet('fn'); return;
    case 'varmenu': openSheet('vars'); return;
    case 'eq': evaluateNow(false); return;
    case 'approx': evaluateNow(true); return;
    case 'ac': ed.clear(); state.done = false; resEl.textContent = ''; resEl.className = 'result'; drawActions(); return;
    case 'left': case 'right':
      if (state.done) { state.done = false; ed.setRow(state.row ? SC.cloneRow(state.row) : ed.row); if (k === 'left') ed.end(); else ed.home(); onEdit(); return; }
      if (k === 'left') ed.left(); else ed.right(); return;
    case 'up': if (!ed.vertical('up')) histNav(-1); return;
    case 'down': if (!ed.vertical('down')) histNav(1); return;
    case 'del':
      if (state.done) { state.done = false; ed.setRow(SC.cloneRow(state.row)); onEdit(); return; }
      ed.backspace(); return;
  }
  // 입력하는 키: 결과를 본 뒤면 새 식 (연산자면 Ans 에 이어서)
  if (state.done) {
    state.done = false;
    if (CONT[k]) ed.setRow([{ t: 'c', v: 'Ans' }]); else ed.clear();
  }
  if (/^[0-9]$/.test(k)) { ed.insertChar(k); return; }
  switch (k) {
    // 지수 칸 안의 ÷ 는 작은 분수로: x^□ 1 ÷ 2 → x^½ (= √x). 줄 위의 ÷ 로 두면 5¹÷2 처럼 읽혀 헷갈린다
    case 'div': if (ed.inExponent()) { ed.insertTemplate('frac'); return; } break;
    case 'sq': ed.insertTemplate('pow', { a: [{ t: 'c', v: '2' }] }); return;
    case 'cube': ed.insertTemplate('pow', { a: [{ t: 'c', v: '3' }] }); return;
    case 'inv': ed.insertTemplate('pow', { a: [{ t: 'c', v: '−' }, { t: 'c', v: '1' }] }); return;
    case 'cbrt': ed.insertTemplate('root', { n: [{ t: 'c', v: '3' }] }); ed.cur = { row: ed.cur.row, i: 0 }; focusRootBody(); return;
    case 'pow10': ed.insertChar('1'); ed.insertChar('0'); ed.insertTemplate('pow'); return;
    case 'exp': ed.insertChar('e'); ed.insertTemplate('pow'); return;
    case 'dms': ed.insertChar(nextDms()); return;
  }
  if (k.indexOf('const:') === 0) { ed.insertNode({ t: 'k', v: k.slice(6) }); ed.draw(); return; }
  if (k.indexOf('conv:') === 0) { ed.insertNode({ t: 'u', v: k.slice(5) }); ed.draw(); return; }
  if (k.indexOf('var:') === 0) { ed.insertChar(k.slice(4) === 'C' ? 'C_' : k.slice(4)); return; }
  var m = KEYMAP[k];
  if (!m) return;
  if (m[0] === 'c') ed.insertChar(m[1]);
  else if (m[0] === 'f') ed.insertFn(m[1]);
  else ed.insertTemplate(m[1]);
}
function focusRootBody() {
  // ³√ 은 지수 3이 이미 있으니 안쪽으로
  var row = ed.cur.row;
  var p = ed.parentOf(row);
  if (p && p.node.t === 'root') { ed.cur = { row: p.node.a, i: p.node.a.length }; ed.draw(); }
}
function nextDms() {           // ° → ′ → ″ 차례
  var row = ed.cur.row;
  for (var i = ed.cur.i - 1; i >= 0; i--) {
    var n = row[i];
    if (n.t !== 'c') break;
    if (n.v === '°') return '′';
    if (n.v === '′') return '″';
    if (!/[0-9.]/.test(n.v)) break;
  }
  return '°';
}
root.querySelectorAll('[data-k]').forEach(function (b) {
  b.addEventListener('click', function () { press(b.getAttribute('data-k')); if (!matchMedia('(pointer:coarse)').matches) exprEl.focus({ preventScroll: true }); });
});
// 결과 바꿔 보기
root.querySelectorAll('[data-act]').forEach(function (b) {
  b.addEventListener('click', function () { act(b.getAttribute('data-act')); });
});
function act(a) {
  var v = state.value; if (!v) return;
  if (a === 'sd') {
    if (state.view.frac) { state.view.frac = null; state.view.decimal = true; }
    else if (SC.hasExactDisplay(v)) state.view.decimal = !state.view.decimal;
    else if (v.t === 'f') { var fr = SC.floatToFraction(v.v); if (fr) state.view.frac = fr; }
    state.view.eng = null; state.view.dms = false; state.view.fact = false;
  }
  if (a === 'eng') {
    state.view.decimal = true; state.view.dms = false; state.view.fact = false; state.view.frac = null;
    var step = state.shift ? -1 : 1; if (state.shift) { state.shift = false; drawStatus(); }
    state.view.eng = state.view.eng === null || state.view.eng === undefined ? 0 : Math.max(-3, Math.min(3, state.view.eng + step));
  }
  if (a === 'dms') { state.view.dms = !state.view.dms; state.view.fact = false; state.view.eng = null; state.view.frac = null; }
  if (a === 'fact') { state.view.fact = !state.view.fact; state.view.dms = false; state.view.eng = null; }
  if (a === 'copy') {
    var txt = copyTextOf(v);
    UI.copyText(txt, function (ok) { UI.toast(ok ? t('copied') + ': ' + txt : t('copyFail')); if (ok) mo(root.querySelector('[data-act=copy]'), 'mo-ok'); });
    return;
  }
  drawResult();
  mo(resEl, 'mo-roll');
}
function copyTextOf(v) {
  if (v.t === 'multi') return v.items.map(function (it) { return it.label + '=' + copyTextOf(it.v); }).join(', ');
  var o = viewOpts();
  if (v.t !== 'c' && (o.decimal || !SC.hasExactDisplay(v)) && !state.view.dms) return SC.decimalText(SC.formatDecimal(v, o.disp));
  return SC.rowToPlain(SC.valueRow(v, o)).replace(/−/g, '-');
}

// ---------------------------------------------------------------- 키보드
exprEl.addEventListener('keydown', function (ev) {
  if (ev.key === 'Enter' || ev.key === '=') { ev.preventDefault(); evaluateNow(ev.shiftKey); return; }
  if (ev.key === 'Escape') { ev.preventDefault(); press('ac'); return; }
  if (state.done && ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey) {
    var cont = '+-*/^!%'.indexOf(ev.key) >= 0;
    state.done = false;
    if (cont) ed.setRow([{ t: 'c', v: 'Ans' }]); else ed.clear();
  } else if (state.done && (ev.key === 'Backspace' || ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
    ev.preventDefault(); press(ev.key === 'Backspace' ? 'del' : ev.key === 'ArrowLeft' ? 'left' : 'right'); return;
  }
  if (ed.handleKey(ev)) ev.preventDefault();
});
exprEl.addEventListener('paste', function (ev) {
  var text = (ev.clipboardData || window.clipboardData).getData('text');
  if (!text) return;
  ev.preventDefault();
  try {
    var row = SC.parseText(text);
    if (state.done) { state.done = false; ed.clear(); }
    row.forEach(function (n) { ed.insertNode(n); }); ed.draw();
  } catch (e) { UI.toast(UI.errorText(e)); }
});
exprEl.addEventListener('copy', function (ev) {
  if (!state.done || !state.value) return;
  ev.preventDefault();
  (ev.clipboardData || window.clipboardData).setData('text/plain', copyTextOf(state.value));
});

// ---------------------------------------------------------------- 기록
function histNav(dir) {
  if (!hist.length) return;
  var np = state.histPos + (dir < 0 ? 1 : -1);
  if (np < -1) np = -1;
  if (np >= hist.length) np = hist.length - 1;
  state.histPos = np; state.done = false;
  if (np === -1) { ed.clear(); onEdit(); return; }
  try { ed.setRow(SC.parseText(hist[np].e)); } catch (e) { ed.clear(); }
  onEdit();
}

// ---------------------------------------------------------------- 판 (함수·변수·설정·기록)
function el(tag, cls, text, attrs) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = text;
  if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function keyBtn(label, k, title) {
  var b = el('button', 'sk', label, { type: 'button', 'data-sk': k });
  if (title) b.title = title;
  return b;
}
function openSheet(which) {
  sheet.textContent = '';
  sheet.hidden = false;
  root.classList.add('sheet-open');
  var head = el('div', 'sheet-head');
  var title = el('h2', 'sheet-title', W[which === 'fn' ? 'fn' : which]);
  var close = el('button', 'sheet-close', W.close, { type: 'button' });
  close.addEventListener('click', closeSheet);
  head.appendChild(title); head.appendChild(close);
  sheet.appendChild(head);
  var body = el('div', 'sheet-body');
  sheet.appendChild(body);
  if (which === 'fn') fnSheet(body);
  if (which === 'vars') varSheet(body);
  if (which === 'settings') setSheet(body);
  if (which === 'history') histSheet(body);
  sheet.querySelectorAll('[data-sk]').forEach(function (b) {
    b.addEventListener('click', function () { closeSheet(); press(b.getAttribute('data-sk')); });
  });
  close.focus({ preventScroll: true });
}
function closeSheet() { sheet.hidden = true; root.classList.remove('sheet-open'); }
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !sheet.hidden) closeSheet(); });
root.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { openSheet(b.getAttribute('data-open')); }); });

function group(body, title, items) {
  var g = el('section', 'sk-group');
  g.appendChild(el('h3', 'sk-title', title));
  var wrap = el('div', 'sk-grid');
  items.forEach(function (it) { wrap.appendChild(keyBtn(it[0], it[1], it[2])); });
  g.appendChild(wrap);
  body.appendChild(g);
}
function fnSheet(body) {
  group(body, W.hyp, [['sinh', 'sinh'], ['cosh', 'cosh'], ['tanh', 'tanh'], ['sinh⁻¹', 'asinh'], ['cosh⁻¹', 'acosh'], ['tanh⁻¹', 'atanh']]);
  group(body, W.numfn, [['|x|', 'abs'], ['Int', 'int_'], ['Intg', 'intg'], ['Rnd', 'rnd'], ['GCD', 'gcd'], ['LCM', 'lcm'], ['÷R', 'divr'], ['%', 'pct'], ['x!', 'fact']]);
  group(body, W.prob, [['nPr', 'nPr'], ['nCr', 'nCr'], ['Ran#', 'ran'], ['RanInt#', 'ranint']]);
  group(body, W.coord, [['Pol', 'pol'], ['Rec', 'rec'], ['i', 'i'], ['∠', 'angle'], ['Conjg', 'conjg'], ['Arg', 'arg'], ['ReP', 'rep'], ['ImP', 'imp']]);
  group(body, W.calculus, [['∫dx', 'int'], ['d/dx', 'der'], ['Σ', 'sum'], ['Π', 'prd'], ['log□', 'logb'], ['eˣ', 'exp'], ['10ˣ', 'pow10']]);
  var g = el('section', 'sk-group');
  g.appendChild(el('h3', 'sk-title', W.consts));
  var list = el('div', 'sk-list');
  SC.CONSTANTS.forEach(function (c) {
    var b = el('button', 'sk-row', null, { type: 'button', 'data-sk': 'const:' + c.id });
    var sym = el('span', 'sk-sym'); sym.appendChild(el('span', null, c.sym)); if (c.sub) sym.appendChild(el('sub', null, c.sub));
    b.appendChild(sym);
    b.appendChild(el('span', 'sk-name', CONST_NAMES[c.id]));
    var val = SC.decimalText(SC.formatDecimal(c.val, { mode: 'norm' })).replace('E', '×10^');
    b.appendChild(el('span', 'sk-val', val + (c.unit ? ' ' + c.unit : '') + (c.exact ? ' · ' + W.exactNote : '')));
    list.appendChild(b);
  });
  g.appendChild(list); body.appendChild(g);
  var g2 = el('section', 'sk-group');
  g2.appendChild(el('h3', 'sk-title', W.units));
  var grid = el('div', 'sk-grid sk-grid-wide');
  SC.CONVERSIONS.forEach(function (c) {
    var from = c.from === '평' && L === 'en' ? 'pyeong' : c.from, to = c.to === '평' && L === 'en' ? 'pyeong' : c.to;
    grid.appendChild(keyBtn(from + ' ▶ ' + to, 'conv:' + c.id));
  });
  g2.appendChild(grid); body.appendChild(g2);
}
function varSheet(body) {
  var list = el('div', 'var-list');
  SC.VARS.forEach(function (k) {
    var r = el('div', 'var-row');
    r.appendChild(el('span', 'var-name', k));
    var val = el('span', 'var-val');
    UI.cell(val, vars[k] || SC.ZERO, UI.valueOpts(settings, {}));
    r.appendChild(val);
    var ins = el('button', 'var-btn', W.insert, { type: 'button', 'data-sk': 'var:' + k });
    var st = el('button', 'var-btn', W.store, { type: 'button' });
    st.addEventListener('click', function () { vars[k] = ans; UI.saveVars(vars); varSheetRefresh(); });
    r.appendChild(ins); r.appendChild(st);
    list.appendChild(r);
  });
  body.appendChild(list);
  var row = el('div', 'sheet-actions');
  var mp = el('button', 'var-btn', W.mplus, { type: 'button' });
  mp.addEventListener('click', function () { vars.M = SC.add(vars.M || SC.ZERO, ans); UI.saveVars(vars); varSheetRefresh(); drawStatus(); });
  var mm = el('button', 'var-btn', W.mminus, { type: 'button' });
  mm.addEventListener('click', function () { vars.M = SC.sub(vars.M || SC.ZERO, ans); UI.saveVars(vars); varSheetRefresh(); drawStatus(); });
  var cl = el('button', 'var-btn', W.clearVars, { type: 'button' });
  cl.addEventListener('click', function () { if (!confirm(W.clearVars + '?')) return; vars = {}; UI.saveVars(vars); varSheetRefresh(); drawStatus(); });
  row.appendChild(mp); row.appendChild(mm); row.appendChild(cl);
  body.appendChild(row);
  body.appendChild(el('p', 'sheet-note', W.varsNote));
}
function varSheetRefresh() { openSheet('vars'); }
function radio(name, options, current, onPick) {
  var wrap = el('div', 'seg', null, { role: 'radiogroup' });
  options.forEach(function (o) {
    var b = el('button', 'seg-btn', o[1], { type: 'button', role: 'radio', 'aria-checked': String(o[0] === current) });
    b.addEventListener('click', function () { onPick(o[0]); });
    wrap.appendChild(b);
  });
  return wrap;
}
function setSheet(body) {
  function section(title, ctl) { var s = el('section', 'set-row'); s.appendChild(el('h3', 'sk-title', title)); s.appendChild(ctl); body.appendChild(s); }
  function apply() { UI.saveSettings(settings); drawStatus(); if (state.done) drawResult(); else onEdit(); openSheet('settings'); }
  section(W.angle, radio('angle', [['deg', 'DEG (°)'], ['rad', 'RAD'], ['gra', 'GRA']], settings.angle, function (v) { settings.angle = v; apply(); }));
  var d = el('div', 'set-disp');
  d.appendChild(radio('disp', [['norm', W.norm], ['fix', 'Fix'], ['sci', 'Sci']], settings.disp.mode, function (v) {
    settings.disp.mode = v; if (v === 'fix' && settings.disp.digits > 9) settings.disp.digits = 4; if (v === 'sci' && settings.disp.digits < 1) settings.disp.digits = 4; apply();
  }));
  if (settings.disp.mode !== 'norm') {
    var sel = el('select', 'set-digits', null, { 'aria-label': W.digits });
    var lo = settings.disp.mode === 'fix' ? 0 : 1, hi = settings.disp.mode === 'fix' ? 9 : 10;
    for (var i = lo; i <= hi; i++) { var o = el('option', null, i + ' ' + W.digits, { value: String(i) }); if (i === settings.disp.digits) o.selected = true; sel.appendChild(o); }
    sel.addEventListener('change', function () { settings.disp.digits = parseInt(sel.value, 10); apply(); });
    d.appendChild(sel);
  }
  section(W.disp, d);
  section(W.fracOut, radio('frac', [[false, W.improper], [true, W.mixed]], settings.mixed, function (v) { settings.mixed = v; apply(); }));
  section(W.cplx, radio('cplx', [['off', W.off], ['rect', 'a+bi'], ['polar', 'r∠θ']], settings.complex, function (v) { settings.complex = v; apply(); }));
  var lab = el('label', 'set-check');
  var cb = el('input', null, null, { type: 'checkbox' }); cb.checked = !!settings.decIn;
  cb.addEventListener('change', function () { settings.decIn = cb.checked; apply(); });
  lab.appendChild(cb); lab.appendChild(document.createTextNode(' ' + W.decIn));
  body.appendChild(lab);
}
function histItems(list, onPick) {
  hist.forEach(function (h, i) {
    var li = el('li');
    var b = el('button', 'hist-item', null, { type: 'button' });
    var ex = el('span', 'hist-expr'), rs = el('span', 'hist-res');
    try { ME.render(SC.parseText(h.e), ex, {}); } catch (e) { ex.textContent = h.e; }
    var v = UI.deser(h.r);
    if (v) UI.cell(rs, v, UI.valueOpts(settings, { decimal: !SC.hasExactDisplay(v) }));
    b.appendChild(ex); b.appendChild(el('span', 'hist-eq', '=')); b.appendChild(rs);
    b.addEventListener('click', function () { onPick(i, h, b); });
    li.appendChild(b); list.appendChild(li);
  });
}
function loadHist(i, h) {
  state.done = false; state.histPos = i;
  try { ed.setRow(SC.parseText(h.e)); } catch (e) {}
  onEdit(); exprEl.focus({ preventScroll: true });
}
function clearHist() {
  if (!confirm(W.clearHist + '?')) return false;
  hist = []; UI.store.set('sc.hist', hist); drawSideHist(); return true;
}
function histSheet(body) {
  if (!hist.length) { body.appendChild(el('p', 'sheet-note', W.emptyHist)); return; }
  var list = el('ol', 'hist-list');
  histItems(list, function (i, h) { closeSheet(); loadHist(i, h); });
  body.appendChild(list);
  var c = el('button', 'var-btn', W.clearHist, { type: 'button' });
  c.addEventListener('click', function () { if (clearHist()) openSheet('history'); });
  body.appendChild(c);
}
// 첫 페이지 오른쪽(휴대폰은 계산기 아래) 기록 칸: 늘 보이고, 누르면 그 식을 다시 불러온다
var sideList = document.querySelector('[data-hist]'), sideEmpty = document.querySelector('[data-hist-empty]'), sideClear = document.querySelector('[data-hist-clear]');
function drawSideHist() {
  if (!sideList) return;
  sideList.textContent = '';
  histItems(sideList, function (i, h, btn) {
    var r = exprEl.getBoundingClientRect(), seen = r.top >= 0 && r.bottom <= innerHeight;
    if (seen) moFly(btn.querySelector('.hist-expr'));
    loadHist(i, h);
    // 휴대폰처럼 계산 화면이 위로 지나가 있으면 화면으로 데려가서 불러온 식을 보여 준다
    if (!seen) { exprEl.closest('.screen').scrollIntoView({ block: 'center', behavior: calmMo.matches ? 'auto' : 'smooth' }); mo(exprEl, 'mo-in'); }
  });
  var empty = !hist.length;
  sideList.hidden = empty; sideClear.hidden = empty; sideEmpty.hidden = !empty;
}
if (sideClear) sideClear.addEventListener('click', clearHist);
root.querySelectorAll('.k[data-s]').forEach(function (k, i) { k.style.setProperty('--i', i); });

// 주소에 ?e=식 이 있으면 넣어 둔다 (글 페이지의 '계산기에서 열기' 링크)
(function () {
  var m = /[?&]e=([^&]+)/.exec(location.search);
  if (!m) return;
  try {
    var row = SC.parseText(decodeURIComponent(m[1].replace(/\+/g, ' ')));
    ed.setRow(row); evaluateNow(false);
  } catch (e) {}
})();
drawStatus();
drawActions();
drawSideHist();
root.classList.add('is-ready');
window.__calcReady = true;
})();
