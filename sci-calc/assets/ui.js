/* 모든 페이지가 같이 쓰는 화면 도우미 (UI): 말(한국어·영어), 저장, 설정, 결과 그리기, 오류 문구, 언어 안내 띠 */
(function (root) {
'use strict';
var SC = root.SC, ME = root.ME;
var LANG = /^en\b/i.test(document.documentElement.lang) ? 'en' : 'ko';

var MSG = {
  ko: {
    syntax: '식 모양이 맞지 않아요', syntaxHint: '괄호, 연산자, 빈칸을 확인해 주세요',
    div0: '0으로 나눌 수 없어요', domain: '이 함수가 받을 수 없는 값이에요', range: '계산할 수 있는 범위를 넘었어요',
    complexoff: '복소수 i는 설정에서 복소수를 켜야 써요', complexarg: '이 계산에는 복소수를 넣을 수 없어요',
    timeout: '적분이 수렴하지 않아요. 구간을 나눠 보세요', multi: 'Pol·Rec·÷R은 식 맨 바깥에서만 써요',
    int: '정수만 넣을 수 있어요', '0^0': '0의 0제곱은 정해진 값이 없어요', freq: '도수는 0 이상의 정수여야 해요',
    n: '자료가 더 필요해요', dim: '행렬 크기가 맞지 않아요', singular: '역행렬이 없어요 (행렬식이 0)', nosol: '근을 찾지 못했어요. 시작값을 바꿔 보세요',
    step: '간격은 0보다 커야 해요', rows: '행은 200개까지예요. 간격을 늘려 주세요', name: '알 수 없는 글자예요: ', empty: '식을 입력해 주세요',
    math: '계산할 수 없는 값이에요',
    copied: '복사했어요', copyFail: '복사하지 못했어요',
    approx: '소수로', exact: '정확값', none: '없음'
  },
  en: {
    syntax: 'Syntax error', syntaxHint: 'Check brackets, operators and empty boxes',
    div0: 'Division by zero', domain: 'Value outside this function’s domain', range: 'Result is out of range',
    complexoff: 'Turn on complex numbers in Settings to use i', complexarg: 'Complex numbers can’t go into this calculation',
    timeout: 'The integral did not converge. Try splitting the interval', multi: 'Pol, Rec and ÷R work only as the whole expression',
    int: 'Integers only', '0^0': '0 to the power 0 is undefined', freq: 'Frequencies must be whole numbers ≥ 0',
    n: 'More data needed', dim: 'Matrix sizes don’t match', singular: 'No inverse (determinant is 0)', nosol: 'No root found. Try another starting value',
    step: 'Step must be greater than 0', rows: 'Up to 200 rows. Use a larger step', name: 'Unknown letter: ', empty: 'Type an expression',
    math: 'Can’t calculate this value',
    copied: 'Copied', copyFail: 'Could not copy',
    approx: 'decimal', exact: 'exact', none: 'none'
  }
};
function t(key) { return (MSG[LANG] && MSG[LANG][key]) || MSG.ko[key] || key; }
function errorText(e) {
  if (!e || !e.kind) return t('math');
  if (e.kind === 'syntax') {
    if (/^name:/.test(e.message)) return t('name') + e.message.slice(5);
    if (e.message === 'empty') return t('empty');
    return t('syntax');
  }
  return MSG[LANG][e.message] ? t(e.message) : t('math');
}

// ---------------------------------------------------------------- 저장 (이 기기 브라우저에만)
var store = {
  get: function (k, def) { try { var v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
};
// 값 ↔ JSON
function ser(v) {
  if (!v) return null;
  if (v.t === 'x') return { t: 'x', v: v.v.map(function (q) { return [q.c.n.toString(), q.c.d.toString(), q.r.toString(), q.p]; }) };
  if (v.t === 'f') return { t: 'f', v: v.v };
  if (v.t === 'c') return { t: 'c', re: ser(v.re), im: ser(v.im) };
  return null;
}
function deser(o) {
  if (!o) return null;
  try {
    if (o.t === 'x') return { t: 'x', v: o.v.map(function (a) { return { c: SC.R(BigInt(a[0]), BigInt(a[1])), r: BigInt(a[2]), p: a[3] }; }) };
    if (o.t === 'f') return SC.F(o.v);
    if (o.t === 'c') return SC.cx(deser(o.re), deser(o.im));
  } catch (e) {}
  return null;
}

// ---------------------------------------------------------------- 설정 (모든 페이지 공통)
var DEFAULTS = { angle: 'deg', disp: { mode: 'norm', digits: 4 }, complex: 'off', mixed: false, decIn: true };
function loadSettings() {
  var s = store.get('sc.settings', {});
  var o = JSON.parse(JSON.stringify(DEFAULTS));
  for (var k in s) if (k in o) o[k] = s[k];
  return o;
}
function saveSettings(s) { store.set('sc.settings', s); }
function loadVars() {
  var raw = store.get('sc.vars', {}), out = {};
  SC.VARS.forEach(function (k) { var v = deser(raw[k]); if (v) out[k] = v; });
  return out;
}
function saveVars(vars) { var o = {}; for (var k in vars) o[k] = ser(vars[k]); store.set('sc.vars', o); }
function loadAns() { return deser(store.get('sc.ans', null)) || SC.ZERO; }
function saveAns(v) { store.set('sc.ans', ser(v)); }
function envFrom(settings, vars, ans) {
  var disp = settings.disp;
  return {
    angle: settings.angle, complex: settings.complex !== 'off', vars: vars || {}, ans: ans || SC.ZERO,
    rnd: function (v) {        // Rnd: 지금 표시대로 반올림한 값
      var f = SC.formatDecimal(v, disp.mode === 'norm' ? { mode: 'norm' } : disp);
      var s = (f.neg ? '-' : '') + f.mant + (f.exp !== null ? 'e' + f.exp : '');
      return SC.xr(SC.rFromDecimal(s));
    }
  };
}

// ---------------------------------------------------------------- 결과 그리기
// opts: {decimal, mixed, dms, polar, eng(정수 단계), disp}
function valueOpts(settings, extra) {
  var o = { disp: settings.disp, mixed: settings.mixed, polar: settings.complex === 'polar', angle: settings.angle };
  for (var k in extra || {}) o[k] = extra[k];
  if (o.eng !== undefined && o.eng !== null) o.disp = { mode: 'eng', engShift: o.eng };
  return o;
}
function drawValue(el, v, opts) {
  ME.render(SC.valueRow(v, opts), el, {});
  el.setAttribute('data-plain', SC.rowToPlain(SC.valueRow(v, opts)));
}
// 값 하나를 짧은 글자로 (표·목록 칸)
function plain(v, opts) { return SC.rowToPlain(SC.valueRow(v, opts || {})); }
function cell(el, v, opts) {
  if (v && v.error) { el.textContent = 'ERROR'; el.classList.add('is-err'); return; }
  ME.render(SC.valueRow(v, opts || {}), el, {});
}

// ---------------------------------------------------------------- 복사
function copyText(text, done) {
  function ok() { if (done) done(true); }
  function fail() { if (done) done(false); }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(ok, fail); return; }
  } catch (e) {}
  try {
    var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); var r = document.execCommand('copy'); document.body.removeChild(ta); r ? ok() : fail();
  } catch (e2) { fail(); }
}
function toast(msg) {
  var el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('on'); }, 1600);
}

// ---------------------------------------------------------------- 다른 언어판 안내 띠 (자동으로 넘기지 않음)
function langBar() {
  var bar = document.getElementById('langbar');
  if (!bar) return;
  var nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  var wantKo = /^ko\b/i.test(nav);
  var dismissed = store.get('sc.langbar', null);
  if (dismissed === LANG) return;
  if ((LANG === 'ko' && !wantKo && nav) || (LANG === 'en' && wantKo)) {
    bar.hidden = false;
    var x = bar.querySelector('button');
    if (x) x.addEventListener('click', function () { bar.hidden = true; store.set('sc.langbar', LANG); });
  }
}

// 모드 링크에서 지금 페이지 표시
function markNav() {
  document.querySelectorAll('[data-nav]').forEach(function (a) {
    if (a.getAttribute('href') && location.pathname.replace(/index\.html$/, '') === a.getAttribute('href')) a.setAttribute('aria-current', 'page');
  });
}

root.UI = { LANG: LANG, t: t, MSG: MSG, errorText: errorText, store: store, ser: ser, deser: deser,
  loadSettings: loadSettings, saveSettings: saveSettings, loadVars: loadVars, saveVars: saveVars, loadAns: loadAns, saveAns: saveAns,
  envFrom: envFrom, valueOpts: valueOpts, drawValue: drawValue, plain: plain, cell: cell, copyText: copyText, toast: toast,
  langBar: langBar, markNav: markNav };
// 휴대폰에서 모드 줄이 옆으로 넘칠 때 지금 모드가 보이게 옮긴다
function showCurrentMode() {
  var ul = document.querySelector('.work .modes');
  if (!ul) return;
  function edge() { ul.classList.toggle('more-r', ul.scrollLeft + ul.clientWidth < ul.scrollWidth - 4); }
  var cur = ul.querySelector('[aria-current]');
  if (cur && ul.scrollWidth > ul.clientWidth) {
    var li = cur.parentNode;
    ul.scrollLeft = Math.max(0, li.offsetLeft - (ul.clientWidth - li.offsetWidth) / 2);
  }
  edge();
  ul.addEventListener('scroll', edge, { passive: true });
  window.addEventListener('resize', edge);
}
// 루멘랩 이름판: 화면에 들어오면 태양전지 칸이 차례로 켜지고(한 번), 마우스를 올리면 다시 켜진다. 동작 줄이기면 그냥 켜진 채로.
function labPlate() {
  var el = document.querySelector('.lab-plate'); if (!el) return;
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function play() {
    el.classList.add('is-lit'); if (calm) return;
    el.classList.remove('mo-sun'); void el.offsetWidth; el.classList.add('mo-sun');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('mo-sun'); }, 900);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); play(); } }, { threshold: 0.8 });
    io.observe(el);
  } else el.classList.add('is-lit');
  el.addEventListener('mouseenter', play); el.addEventListener('focus', play);
}
// '키 뜻' 링크(#keys)는 접힌 키 뜻 표를 펼치고 간다
function openKeys() { var d = document.getElementById('keys'); if (d && d.tagName === 'DETAILS') d.open = true; }
document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href="#keys"]'); if (a) openKeys(); });
if (location.hash === '#keys') document.addEventListener('DOMContentLoaded', openKeys);
document.addEventListener('DOMContentLoaded', function () { langBar(); showCurrentMode(); labPlate(); });
})(window);
