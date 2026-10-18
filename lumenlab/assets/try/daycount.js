/* 며칠 바로 써 보기: 며칠 사이트의 날짜 파일(holidays.js·dates.js, 전역 DC)을 그대로 불러
   두 날짜 사이를 센다(DC.between). 아래 칸 띠는 그 사이 하루하루를 한 칸씩 놓은 것:
   평일·주말·공휴일은 DC.businessDays(며칠의 영업일 세기)와 DC.holidayName이 정한 그대로 칠한다. */
window.LLTry.daycount = function (stage, c) {
  var h = c.h, ko = c.lang === 'ko', DC = window.DC;
  var country = ko ? 'KR' : 'US', mdy = !ko;
  var nf = new Intl.NumberFormat(ko ? 'ko-KR' : 'en-US');
  var T = ko
    ? { from: '시작 날짜', to: '끝 날짜', ph: '2026.12.25처럼', inc: '시작일도 세기', days: '일', bad: '날짜를 다 쳐 주세요',
        work: '평일', off: '주말', hol: '공휴일', clip: '첫 1년만 칸으로 보여요', wd: ['일', '월', '화', '수', '목', '금', '토'],
        ymd: function (b) { return (b.years ? b.years + '년 ' : '') + (b.months ? b.months + '개월 ' : '') + b.restDays + '일 · ' + b.weeks + '주' + (b.weekRest ? ' ' + b.weekRest + '일' : ''); },
        md: function (n) { var t = DC.toYMD(n); return t.m + '.' + t.d; },
        sample: ['2026.12.25', '2027.2.10'] }
    : { from: 'Start date', to: 'End date', ph: 'e.g. 12/25/2026', inc: 'Count the start day', days: ' days', bad: 'Finish typing the date',
        work: 'Weekdays', off: 'Weekends', hol: 'Holidays', clip: 'Squares show the first year', wd: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        ymd: function (b) { function p(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); } return (b.years ? p(b.years, 'year') + ' ' : '') + (b.months ? p(b.months, 'month') + ' ' : '') + p(b.restDays, 'day') + ' · ' + p(b.weeks, 'week') + (b.weekRest ? ' ' + p(b.weekRest, 'day') : ''); },
        md: function (n) { var t = DC.toYMD(n); return t.m + '/' + t.d; },
        sample: ['12/25/2026', '2/16/2027'] };
  var d = new Date(), today = DC.fromYMD(d.getFullYear(), d.getMonth() + 1, d.getDate()), year = d.getFullYear();
  var inc = false;
  var fromIn = h('input', { class: 'tr-in', type: 'text', inputmode: 'numeric', autocomplete: 'off', value: DC.showDate(DC.iso(today), mdy) });
  var toIn = h('input', { class: 'tr-in', type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: T.ph });
  var incBtn = h('button', { type: 'button', class: 'tr-btn', 'aria-pressed': 'false', onclick: function () { inc = !inc; incBtn.setAttribute('aria-pressed', String(inc)); run(true); } }, [T.inc]);
  var big = h('p', { class: 'tr-big', 'aria-live': 'polite' });
  var dtag = h('span', { class: 'dc-tag' });
  var sub = h('p', { class: 'tr-note dc-sub' });
  var strip = h('div', { class: 'dc-strip', 'aria-hidden': 'true' });
  var legend = h('ul', { class: 'dc-legend' });
  var hols = h('ul', { class: 'dc-hols' });
  var note = h('p', { class: 'tr-note dc-clip', hidden: true, text: T.clip });

  function read(input) {
    var r = DC.readDate(input.value, { mdy: mdy, final: true, year: year });
    return r.state === 'ok' ? DC.parse(r.value) : null;
  }
  function field(label, input) { return h('label', { class: 'tr-field' }, [h('span', { text: label }), input]); }
  var lastKey = '';
  function run(pop) {
    var a = read(fromIn), b = read(toIn);
    if (a == null || b == null) {
      big.textContent = '–'; sub.textContent = toIn.value ? T.bad : ''; dtag.textContent = '';
      strip.textContent = ''; legend.textContent = ''; hols.textContent = ''; note.hidden = true; lastKey = '';
      return;
    }
    var lo = Math.min(a, b), hi = Math.max(a, b);
    var bt = DC.between(a, b, inc);
    big.textContent = '';
    big.appendChild(document.createTextNode(nf.format(bt.days)));
    big.appendChild(h('small', { text: T.days }));
    if (a === today && b !== today) { var df = b - a; dtag.textContent = df > 0 ? 'D-' + df : 'D+' + (-df); }
    else dtag.textContent = '';
    big.appendChild(dtag);
    sub.textContent = T.ymd(bt);
    // 영업일 세기와 같은 기준: 끝 날은 언제나 세고, 시작 날은 '시작일도 세기'일 때만
    var bd = DC.businessDays(lo, hi, country, inc);
    legend.textContent = '';
    [['work', bd.business], ['hol', bd.holidays.length], ['off', bd.weekend]].forEach(function (k) {
      legend.appendChild(h('li', { class: 'dc-k dc-k--' + k[0] }, [h('i'), h('span', { text: T[k[0]] + ' ' }), h('b', { text: nf.format(k[1]) })]));
    });
    hols.textContent = '';
    bd.holidays.slice(0, 8).forEach(function (x) {
      hols.appendChild(h('li', null, [h('b', { text: T.md(x.day) }), ' ' + x.name[ko ? 0 : 1]]));
    });
    // 칸 띠: 한 줄 = 한 요일, 한 열 = 한 주(일요일부터)
    var key = lo + ':' + hi + ':' + inc;
    if (key === lastKey) return;
    lastKey = key;
    var end = Math.min(hi, lo + 370), clip = hi > end;
    var first = lo - DC.weekday(lo), weeks = Math.ceil((end - first + 1) / 7);
    var holSet = {};
    bd.holidays.forEach(function (x) { holSet[x.day] = x.name[ko ? 0 : 1]; });
    strip.textContent = '';
    strip.style.setProperty('--wk', weeks);
    for (var r = 0; r < 7; r++) strip.appendChild(h('b', { class: 'dc-wd', style: 'grid-row:' + (r + 1), text: T.wd[r] }));
    for (var n = first; n < first + weeks * 7; n++) {
      var cls = 'dc-d';
      if (n < lo || n > end) cls += ' is-out';
      else {
        var w = DC.weekday(n);
        cls += holSet[n] ? ' is-hol' : (w === 0 || w === 6) ? ' is-off' : ' is-work';
        if (n === lo) cls += ' is-a' + (inc || a === b ? '' : ' is-skip');
        if (n === hi) cls += ' is-b';
      }
      var col = Math.floor((n - first) / 7);
      var cell = h('i', { class: cls, style: 'grid-column:' + (col + 2) + ';grid-row:' + (DC.weekday(n) + 1) + (pop && !c.reduced ? ';animation-delay:' + Math.min(260, col * 9) + 'ms' : '') });
      strip.appendChild(cell);
    }
    strip.classList.toggle('is-pop', !!pop && !c.reduced);
    note.hidden = !clip;
  }
  [fromIn, toIn].forEach(function (el) { el.addEventListener('input', function () { run(true); }); });

  if (!document.getElementById('try-dc-css')) document.head.appendChild(h('style', { id: 'try-dc-css', text:
    '.dc-res{display:grid;gap:4px}.dc-tag{display:inline-block;margin-left:12px;padding:3px 10px;border-radius:999px;background:var(--tc);color:#fff;font-size:15px;font-weight:800;letter-spacing:0;vertical-align:middle}' +
    '.dc-tag:empty{display:none}.dc-sub{font-variant-numeric:tabular-nums;min-height:1.6em}' +
    '.dc-strip{display:grid;grid-template-columns:auto repeat(var(--wk),minmax(0,1fr));grid-template-rows:repeat(7,auto);gap:3px;max-width:calc(var(--wk) * 22px + 26px);align-items:center}' +
    '.dc-wd{font-size:11px;font-weight:600;color:var(--muted);line-height:1;padding-right:5px;text-align:right}' +
    '.dc-d{display:block;aspect-ratio:1;border-radius:3px;background:var(--line)}' +
    '.dc-d.is-out{background:none}.dc-d.is-work{background:color-mix(in srgb,var(--tc) 55%,var(--card))}' +
    '.dc-d.is-off{background:color-mix(in srgb,var(--muted) 30%,var(--card))}.dc-d.is-hol{background:var(--tc);box-shadow:inset 0 0 0 2px color-mix(in srgb,#fff 55%,transparent)}' +
    '.dc-d.is-a,.dc-d.is-b{outline:2px solid var(--ink);outline-offset:1px}.dc-d.is-skip{opacity:.35}' +
    '.dc-strip.is-pop .dc-d:not(.is-out){animation:dcin .32s cubic-bezier(.2,.8,.2,1) both}' +
    '@keyframes dcin{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}' +
    '.dc-legend{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 18px;font-size:15px;color:var(--ink-2)}' +
    '.dc-k{display:flex;align-items:center;gap:6px}.dc-k i{width:13px;height:13px;border-radius:3px}.dc-k b{color:var(--ink);font-variant-numeric:tabular-nums}' +
    '.dc-k--work i{background:color-mix(in srgb,var(--tc) 55%,var(--card))}.dc-k--off i{background:color-mix(in srgb,var(--muted) 30%,var(--card))}.dc-k--hol i{background:var(--tc)}' +
    '.dc-hols{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}.dc-hols:empty{display:none}' +
    '.dc-hols li{padding:4px 10px;border-radius:999px;background:var(--paper);border:1px solid var(--line);font-size:15px}.dc-hols b{color:var(--tc);font-variant-numeric:tabular-nums}' }));
  stage.appendChild(h('div', { class: 'tr' }, [
    h('div', { class: 'tr-row' }, [field(T.from, fromIn), field(T.to, toIn), incBtn]),
    h('div', { class: 'dc-res' }, [big, sub]),
    strip, legend, hols, note
  ]));
  run(false);
  return {
    auto: function (A) {
      A.set(toIn, '');
      return A.type(toIn, T.sample[0], 90)
        .then(function () { return A.wait(1400); })
        .then(function () { A.set(toIn, ''); return A.type(toIn, T.sample[1], 90); })
        .then(function () { return A.wait(1100); })
        .then(function () { return A.press(incBtn); });
    }
  };
};
