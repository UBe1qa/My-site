/* 한장달력 바로 써 보기: 한장달력 사이트의 달력 파일(data.js·core.js·sheet.js, 전역 CAL·SHEET)을 그대로 불러
   인쇄할 종이 한 장을 이 창에서 그린다(SHEET.build → SHEET.svg, 사이트 미리보기와 같은 그림).
   설정을 바꾸면 종이가 프린터에서 다시 나오듯 위에서부터 그려진다. 아래 숫자는 CAL.yearFacts·monthFacts·breaks. */
window.LLTry.onesheet = function (stage, c) {
  var h = c.h, ko = c.lang === 'ko', CAL = window.CAL, SHEET = window.SHEET;
  var country = ko ? 'KR' : 'US', paper = ko ? 'a4' : 'letter';
  var nf = new Intl.NumberFormat(ko ? 'ko-KR' : 'en-US');
  var T = ko
    ? { year: '1년 한 장', month: '한 달씩', mon: '월요일 시작', lunar: '음력', son: '손 없는 날', prev: '이전', next: '다음',
        ylbl: function (y) { return y + '년'; }, mlbl: function (y, m) { return y + '년 ' + m + '월'; },
        yfacts: function (f, b) { return ['공휴일 ' + f.holidayDates + '일', '3일 이상 연휴 ' + b + '번', '일하는 날 ' + nf.format(f.workdays) + '일']; },
        mfacts: function (f) { return [f.days + '일', '공휴일 ' + f.holidays.length + '일', '일하는 날 ' + f.workdays + '일']; } }
    : { year: 'Whole year', month: 'Monthly', mon: 'Start on Monday', prev: 'Previous', next: 'Next',
        ylbl: function (y) { return String(y); }, mlbl: function (y, m) { return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1] + ' ' + y; },
        yfacts: function (f, b) { return [f.holidaysOnWeekdays + ' weekdays off', b + ' long weekends', nf.format(f.workdays) + ' working days']; },
        mfacts: function (f) { return [f.days + ' days', f.holidays.length + (f.holidays.length === 1 ? ' holiday' : ' holidays'), f.workdays + ' working days']; } };
  var d = new Date();
  // 사이트와 같게: 10월부터는 다음 해 달력이 먼저
  var S = { kind: 'year', year: d.getFullYear() + (d.getMonth() >= 9 ? 1 : 0), month: 1, weekStart: 0, lunar: ko, son: false };
  var MIN = 2025, MAX = 2030;

  function seg(label, kind) {
    return h('button', { type: 'button', class: 'tr-btn', 'aria-pressed': String(S.kind === kind), 'data-k': kind, onclick: function () { S.kind = kind; render(); } }, [label]);
  }
  var segs = [seg(T.year, 'year'), seg(T.month, 'month')];
  var label = h('b', { class: 'os-lbl', 'aria-live': 'polite' });
  var prev = h('button', { type: 'button', class: 'tr-btn os-step', 'aria-label': T.prev, onclick: function () { step(-1); } }, ['‹']);
  var next = h('button', { type: 'button', class: 'tr-btn os-step', 'aria-label': T.next, onclick: function () { step(1); } }, ['›']);
  function tog(text, key, on) {
    var b = h('button', { type: 'button', class: 'tr-btn', 'aria-pressed': 'false', onclick: function () { S[key] = on(S[key]); render(); } }, [text]);
    b._key = key; return b;
  }
  var monBtn = tog(T.mon, 'weekStart', function (v) { return v ? 0 : 1; });
  var toggles = [monBtn];
  if (ko) toggles.push(tog(T.lunar, 'lunar', function (v) { return !v; }), tog(T.son, 'son', function (v) { return !v; }));
  var sheetBox = h('div', { class: 'os-paper' });
  var facts = h('ul', { class: 'os-facts' });

  function step(k) {
    if (S.kind === 'year') S.year = Math.max(MIN, Math.min(MAX, S.year + k));
    else {
      var m = S.month + k, y = S.year;
      if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
      if (y >= MIN && y <= MAX) { S.month = m; S.year = y; }
    }
    render();
  }
  function render() {
    var o = { kind: S.kind, year: S.year, month: S.month, lang: c.lang, country: country, paper: paper, orient: 'landscape', weekStart: S.weekStart, mono: false,
      show: { names: true, week: false, lunar: S.lunar, terms: ko, son: S.son } };
    var sh = SHEET.build(o);
    sheetBox.style.setProperty('--ratio', (sh.w / sh.h).toFixed(4));
    sheetBox.innerHTML = SHEET.svg(sh, 'os-svg');
    if (!c.reduced) { sheetBox.classList.remove('is-print'); void sheetBox.offsetWidth; sheetBox.classList.add('is-print'); }
    segs.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-k') === S.kind)); });
    monBtn.setAttribute('aria-pressed', String(S.weekStart === 1));
    toggles.slice(1).forEach(function (b) { b.setAttribute('aria-pressed', String(!!S[b._key])); });
    label.textContent = S.kind === 'year' ? T.ylbl(S.year) : T.mlbl(S.year, S.month);
    prev.disabled = S.kind === 'year' ? S.year <= MIN : (S.year <= MIN && S.month === 1);
    next.disabled = S.kind === 'year' ? S.year >= MAX : (S.year >= MAX && S.month === 12);
    var list = S.kind === 'year' ? T.yfacts(CAL.yearFacts(country, S.year), (CAL.breaks(country, S.year, 3) || []).length) : T.mfacts(CAL.monthFacts(country, S.year, S.month));
    facts.textContent = '';
    list.forEach(function (t) { facts.appendChild(h('li', { text: t })); });
  }

  if (!document.getElementById('try-os-css')) document.head.appendChild(h('style', { id: 'try-os-css', text:
    '.os-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}' +
    '.os-nav{display:flex;align-items:center;gap:6px}.os-step{min-width:44px;padding:0;font-size:22px;line-height:1}.os-lbl{min-width:6.5em;text-align:center;font-size:18px;font-variant-numeric:tabular-nums}' +
    '.os-slot{position:relative;padding-top:10px}.os-slot::before{content:"";position:absolute;left:-6px;right:-6px;top:0;height:10px;border-radius:6px;' +
    'background:linear-gradient(color-mix(in srgb,var(--ink) 32%,var(--card)),color-mix(in srgb,var(--ink) 12%,var(--card)));box-shadow:inset 0 2px 3px rgba(0,0,0,.25)}' +
    '.os-paper{position:relative;aspect-ratio:var(--ratio,1.414);background:#fff;border-radius:0 0 4px 4px;box-shadow:0 10px 24px -10px rgba(0,0,0,.35),0 1px 3px rgba(0,0,0,.12);overflow:hidden;color:#1b1a24}' +
    '.os-paper svg{display:block;width:100%;height:100%}' +
    '.os-paper.is-print{animation:osprint .62s cubic-bezier(.3,.7,.3,1) both}' +
    '@keyframes osprint{from{clip-path:inset(0 0 100% 0);transform:translateY(-14px)}to{clip-path:inset(0 0 0 0);transform:none}}' +
    '.os-facts{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}' +
    '.os-facts li{padding:6px 12px;border-radius:999px;background:var(--paper);border:1px solid var(--line);font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}' }));
  stage.appendChild(h('div', { class: 'tr' }, [
    h('div', { class: 'os-bar' }, [h('div', { class: 'tr-chips' }, segs), h('div', { class: 'os-nav' }, [prev, label, next])]),
    h('div', { class: 'tr-chips' }, toggles),
    h('div', { class: 'os-slot' }, [sheetBox]),
    facts
  ]));
  render();
  return {
    auto: function (A) {
      return A.wait(500)
        .then(function () { return A.press(monBtn); })
        .then(function () { return A.wait(1300); })
        .then(function () { return A.press(segs[1]); })
        .then(function () { return A.wait(1200); })
        .then(function () { return A.press(next); })
        .then(function () { return A.wait(1300); })
        .then(function () { return A.press(monBtn); });
    }
  };
};
