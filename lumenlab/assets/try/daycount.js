/* 며칠 바로 써 보기: 며칠 사이트의 날짜 파일(holidays.js·dates.js, 전역 DC)을 그대로 불러
   두 날짜 사이를 센다(DC.between). 아래 칸 띠는 그 사이 하루하루를 한 칸씩 놓은 것:
   평일·주말·공휴일은 DC.businessDays(며칠의 영업일 세기)와 DC.holidayName이 정한 그대로 칠한다. */
window.LLTry.daycount = function (stage, c) {
  var h = c.h, ko = c.lang === 'ko', DC = window.DC;
  var country = ko ? 'KR' : 'US', mdy = !ko;
  var nf = new Intl.NumberFormat(ko ? 'ko-KR' : 'en-US');
  var T = ko
    ? { from: '시작 날짜', to: '끝 날짜', ph: '2026.12.25처럼', inc: '시작일도 세기', days: '일', bad: '날짜를 읽지 못했어요', empty: '날짜를 쳐 보세요', nohol: '이 사이엔 공휴일이 없어요', more: function (n) { return '외 ' + n + '개'; },
        work: '평일', off: '주말', hol: '공휴일', clip: '첫 1년만 칸으로 보여요', wd: ['일', '월', '화', '수', '목', '금', '토'],
        ymd: function (b) { return (b.years ? b.years + '년 ' : '') + (b.months ? b.months + '개월 ' : '') + b.restDays + '일 · ' + b.weeks + '주' + (b.weekRest ? ' ' + b.weekRest + '일' : ''); },
        md: function (n) { var t = DC.toYMD(n); return t.m + '.' + t.d; },
        sample: ['2026.12.25', '2027.2.10'] }
    : { from: 'Start date', to: 'End date', ph: 'e.g. 12/25/2026', inc: 'Count the start day', days: ' days', bad: 'Couldn’t read that date', empty: 'Type a date', nohol: 'No holidays in this range', more: function (n) { return '+' + n + ' more'; },
        work: 'Weekdays', off: 'Weekends', hol: 'Holidays', clip: 'Squares show the first year', wd: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        ymd: function (b) { function p(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); } return (b.years ? p(b.years, 'year') + ' ' : '') + (b.months ? p(b.months, 'month') + ' ' : '') + p(b.restDays, 'day') + ' · ' + p(b.weeks, 'week') + (b.weekRest ? ' ' + p(b.weekRest, 'day') : ''); },
        md: function (n) { var t = DC.toYMD(n); return t.m + '/' + t.d; },
        sample: ['12/25/2026', '2/16/2027'] };
  var d = new Date(), today = DC.fromYMD(d.getFullYear(), d.getMonth() + 1, d.getDate()), year = d.getFullYear();
  var inc = false;
  var fromIn = h('input', { class: 'tr-in', type: 'text', inputmode: 'numeric', autocomplete: 'off', value: DC.showDate(DC.iso(today), mdy) });
  var toIn = h('input', { class: 'tr-in', type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: T.ph });
  var incBtn = h('button', { type: 'button', class: 'tr-btn', 'aria-pressed': 'false', onclick: function () { inc = !inc; incBtn.setAttribute('aria-pressed', String(inc)); run(true, true); } }, [T.inc]);
  var big = h('p', { class: 'tr-big', 'aria-live': 'polite' });
  var dtag = h('span', { class: 'dc-tag' });
  var sub = h('p', { class: 'tr-note dc-sub' });
  var strip = h('div', { class: 'dc-strip', 'aria-hidden': 'true' });
  var legend = h('ul', { class: 'dc-legend' });
  var hols = h('ul', { class: 'dc-hols' });

  // 며칠과 같은 읽기: 치는 중(fin=false)엔 12/25·2026.12.2·12/25/20 같은 덜 친 값을 기다리고, 칸을 떠날 때 마저 읽는다
  function read(input, fin) {
    var r = DC.readDate(input.value, { mdy: mdy, final: fin, year: year });
    return r.state === 'ok' ? { n: DC.parse(r.value) } : { why: r.state };
  }
  function field(label, input) { return h('label', { class: 'tr-field' }, [h('span', { text: label }), input]); }
  // 공휴일 칩은 두 줄까지만(칸 높이가 늘지 않게), 넘치면 '외 N개'
  function fillHols(list, clip) {
    hols.textContent = '';
    if (clip) hols.appendChild(h('li', { class: 'dc-hn', text: T.clip }));
    if (!list.length) { if (!clip) hols.appendChild(h('li', { class: 'dc-hn', text: T.nohol })); return; }
    var lis = list.map(function (x) { return hols.appendChild(h('li', null, [h('b', { text: T.md(x.day) }), ' ' + x.name[ko ? 0 : 1]])); });
    var bottom = hols.getBoundingClientRect().bottom + 0.5;
    function over(el) { return el.getBoundingClientRect().bottom > bottom; }
    if (!over(lis[lis.length - 1])) return;
    var more = hols.appendChild(h('li', { class: 'dc-more' })), n = lis.length;
    do { lis[--n].remove(); more.textContent = T.more(list.length - n); } while (n > 0 && over(more));
  }
  function drawLegend(work, hol, off) {
    legend.textContent = '';
    [['work', work], ['hol', hol], ['off', off]].forEach(function (k) {
      legend.appendChild(h('li', { class: 'dc-k dc-k--' + k[0] }, [h('i'), h('span', { text: T[k[0]] + ' ' }), h('b', { text: nf.format(k[1]) })]));
    });
  }
  var lastKey = '';
  function run(pop, fin) {
    var a = read(fromIn, fin), b = read(toIn, fin);
    if (a.n == null || b.n == null) {
      var why = a.n == null ? a.why : b.why, msg = why === 'empty' ? T.empty : why === 'bad' ? T.bad : '';
      // 치는 중엔 지난 결과를 흐리게 남겨 둔다(칸 띠가 사라졌다 다시 생기며 무대가 출렁이지 않게)
      sub.classList.toggle('is-dim', !msg);
      if (lastKey) { root.classList.add('is-stale'); if (msg) sub.textContent = msg; return; }
      big.textContent = '–'; sub.textContent = msg; dtag.textContent = '';
      return;
    }
    root.classList.remove('is-stale'); sub.classList.remove('is-dim');
    a = a.n; b = b.n;
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
    drawLegend(bd.business, bd.holidays.length, bd.weekend);
    // 칸 띠: 한 줄 = 한 요일, 한 열 = 한 주(일요일부터)
    var key = lo + ':' + hi + ':' + inc;
    if (key === lastKey) return;
    lastKey = key;
    var end = Math.min(hi, lo + 370), clip = hi > end;
    var first = lo - DC.weekday(lo), weeks = Math.ceil((end - first + 1) / 7);
    // 요일 글자(15px)는 칸이 그만큼 클 때만(몇 달 넘으면 칸이 작아져 글자 없이 색만)
    var showWd = ((root.clientWidth || 300) - 34) / weeks - 3 >= 15;
    var holSet = {};
    bd.holidays.forEach(function (x) { holSet[x.day] = x.name[ko ? 0 : 1]; });
    strip.textContent = '';
    strip.style.setProperty('--wk', weeks);
    if (showWd) for (var r = 0; r < 7; r++) strip.appendChild(h('b', { class: 'dc-wd', style: 'grid-row:' + (r + 1), text: T.wd[r] }));
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
    fillHols(bd.holidays, clip);
  }
  [fromIn, toIn].forEach(function (el) {
    el.addEventListener('input', function () { run(true, false); });
    el.addEventListener('blur', function () { run(true, true); });
  });

  if (!document.getElementById('try-dc-css')) document.head.appendChild(h('style', { id: 'try-dc-css', text:
    '.dc-res{display:grid;gap:4px}.dc-tag{display:inline-block;margin-left:12px;padding:3px 10px;border-radius:999px;background:var(--tc);color:#fff;font-size:15px;font-weight:800;letter-spacing:0;vertical-align:middle}' +
    '.dc-tag:empty{display:none}.dc-sub{font-variant-numeric:tabular-nums;min-height:1.6em}.is-stale .dc-sub.is-dim{opacity:.3}' +
    '.dc-strip{display:grid;grid-template-columns:auto repeat(var(--wk),minmax(0,1fr));grid-template-rows:repeat(7,22px);gap:3px;max-width:calc(var(--wk) * 25px + 34px);align-items:center}' +
    '.dc-wd{font-size:15px;font-weight:600;color:var(--muted);line-height:1;padding-right:6px;text-align:right}' +
    '.is-stale .tr-big,.is-stale .dc-strip,.is-stale .dc-legend,.is-stale .dc-hols{opacity:.3;transition:opacity .15s}' +
    '.dc-d{display:block;height:100%;border-radius:3px;background:var(--line)}' +
    '.dc-d.is-out{background:none}.dc-d.is-work{background:color-mix(in srgb,var(--tc) 55%,var(--card))}' +
    '.dc-d.is-off{background:color-mix(in srgb,var(--muted) 30%,var(--card))}.dc-d.is-hol{background:var(--tc);box-shadow:inset 0 0 0 2px color-mix(in srgb,#fff 55%,transparent)}' +
    '.dc-d.is-a,.dc-d.is-b{outline:2px solid var(--ink);outline-offset:1px}.dc-d.is-skip{opacity:.35}' +
    '.dc-strip.is-pop .dc-d:not(.is-out){animation:dcin .32s cubic-bezier(.2,.8,.2,1) both}' +
    '@keyframes dcin{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}' +
    '.dc-legend{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 18px;font-size:15px;line-height:22px;min-height:22px;color:var(--ink-2)}' +
    '.dc-k{display:flex;align-items:center;gap:6px}.dc-k i{width:13px;height:13px;border-radius:3px}.dc-k b{color:var(--ink);font-variant-numeric:tabular-nums}' +
    '.dc-k--work i{background:color-mix(in srgb,var(--tc) 55%,var(--card))}.dc-k--off i{background:color-mix(in srgb,var(--muted) 30%,var(--card))}.dc-k--hol i{background:var(--tc)}' +
    '.dc-hols{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;align-content:flex-start;gap:6px;height:70px;overflow:hidden}' +
    '.dc-hols li{padding:4px 10px;border-radius:999px;background:var(--paper);border:1px solid var(--line);font-size:15px;line-height:22px;white-space:nowrap}.dc-hols b{color:var(--tct);font-variant-numeric:tabular-nums}' +
    '.dc-hols .dc-hn{flex-basis:100%;padding:0;border:0;background:none;line-height:32px;color:var(--muted);white-space:normal}.dc-hols .dc-more{color:var(--ink-2)}' }));
  var root = h('div', { class: 'tr' }, [
    h('div', { class: 'tr-row' }, [field(T.from, fromIn), field(T.to, toIn), incBtn]),
    h('div', { class: 'dc-res' }, [big, sub]),
    strip, legend, hols
  ]);
  stage.appendChild(root);
  // 범례가 이 폭에서 몇 줄이 되는지 긴 숫자로 한 번 재 두고 그 높이를 지킨다(결과마다 줄 수가 바뀌어 무대가 출렁이지 않게)
  drawLegend(888, 88, 888); legend.style.minHeight = legend.offsetHeight + 'px'; legend.textContent = '';
  run(false, true);
  return {
    auto: function (A) {
      A.set(toIn, '');
      // 첫 화면 '올해 남은 날' 칸에서 열면 그 끝 날짜(12월 31일)만 쳐서 같은 수가 나오는 것을 보인다
      if (c.seed && c.seed.to) return A.type(toIn, c.seed.to, 90);
      return A.type(toIn, T.sample[0], 90)
        .then(function () { return A.wait(1400); })
        .then(function () { A.set(toIn, ''); return A.type(toIn, T.sample[1], 90); })
        .then(function () { return A.wait(1100); })
        .then(function () { return A.press(incBtn); });
    }
  };
};
