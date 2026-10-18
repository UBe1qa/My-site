/* 떼고얼마 바로 써 보기: 떼고얼마 사이트의 계산 파일(pay-data.js·gani-2026.js·pay-core.js, 전역 PAY)을 그대로 불러
   연봉을 움직일 때마다 PAY.netPay로 다시 계산한다(사이트 기본값과 같다: 비과세 식대 20만 원, 부양가족 본인 1명, 간이세액 100%).
   막대 = 한 달 월급 가운데 받는 돈과 떼는 돈, 아래 줄 = 떼는 돈 여섯 가지(가장 큰 것을 끝까지로). */
window.LLTry.takehome = function (stage, c) {
  var h = c.h, ko = c.lang === 'ko', P = window.PAY;
  var KO = { pension: '국민연금', health: '건강보험', care: '장기요양보험', employment: '고용보험', incomeTax: '소득세', localTax: '지방소득세' };
  var EN = { pension: 'National Pension', health: 'Health Insurance', care: 'Long-term Care', employment: 'Employment Insurance', incomeTax: 'Income tax', localTax: 'Local income tax' };
  var nd = new Date(), period = P.defaultPeriod(nd.getFullYear() + '-' + ('0' + (nd.getMonth() + 1)).slice(-2) + '-' + ('0' + nd.getDate()).slice(-2));
  var pm = /^(\d{4})-(\d{2})$/.exec(period);
  var T = ko
    ? { annual: '연봉', net: '한 달 실수령액', gross: '월급(세전)', ded: '떼는 돈', keep: '받는 돈', of: function (p) { return '월급의 ' + p + '%'; },
        basis: '비과세 식대 20만 원 · 부양가족 본인 1명 · ' + (+pm[1]) + '년 ' + (+pm[2]) + '월 기준',
        won: function (n) { return P.readKo(n); }, full: function (n) { return P.fmt(n) + '원'; }, names: KO }
    : { annual: 'Annual salary', net: 'Monthly take-home', gross: 'Monthly gross', ded: 'Deducted', keep: 'You keep', of: function (p) { return p + '% of gross'; },
        basis: '₩200,000 non-taxable meals · 1 dependent (you) · rules as of ' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+pm[2] - 1] + ' ' + pm[1],
        won: function (n) { return '₩' + P.fmt(n); }, full: function (n) { return '₩' + P.fmt(n); }, names: EN };
  var MIN = 20000000, MAX = 100000000, STEP = 1000000;
  var range = h('input', { class: 'th-range', type: 'range', min: MIN, max: MAX, step: STEP, value: 30000000, 'aria-label': T.annual });
  var annualOut = h('b', { class: 'th-annual' });
  var big = h('p', { class: 'tr-big th-net', 'aria-live': 'polite' });
  var barKeep = h('span', { class: 'th-keep' }), barDed = h('span', { class: 'th-dedbar' });
  var keepLbl = h('span'), dedLbl = h('span');
  var rows = {}, list = h('ul', { class: 'th-lines' });
  Object.keys(KO).forEach(function (id) {
    var amt = h('b'), rate = h('span', { class: 'th-rate' }), fillEl = h('i');
    rows[id] = { amt: amt, rate: rate, fill: fillEl };
    list.appendChild(h('li', { class: 'th-l th-l--' + (id === 'incomeTax' || id === 'localTax' ? 'tax' : 'ins') }, [
      h('span', { class: 'th-name' }, [T.names[id], rate]), amt, h('span', { class: 'th-track' }, [fillEl])
    ]));
  });
  var grossEl = h('p', { class: 'tr-note th-gross' });

  function run() {
    var amount = +range.value;
    var r = P.netPay({ amount: amount, basis: 'annual', period: period });
    if (!r.ok) return;
    annualOut.textContent = T.won(amount);
    big.textContent = '';
    big.appendChild(document.createTextNode(T.full(r.net)));
    big.appendChild(h('small', { text: T.net }));
    var keepPct = r.net / r.gross * 100;
    barKeep.style.width = keepPct + '%';
    barDed.style.width = (100 - keepPct) + '%';
    keepLbl.textContent = T.keep + ' ' + Math.round(keepPct) + '%';
    dedLbl.textContent = T.ded + ' ' + T.full(r.deductions);
    var maxAmt = 1;
    r.lines.forEach(function (l) { if (l.amount > maxAmt) maxAmt = l.amount; });
    r.lines.forEach(function (l) {
      var row = rows[l.id]; if (!row) return;
      row.amt.textContent = '−' + T.full(l.amount);
      row.rate.textContent = l.ratePct && l.id !== 'localTax' ? ' ' + l.ratePct + '%' : '';
      row.fill.style.width = (l.amount / maxAmt * 100) + '%';
    });
    grossEl.textContent = T.gross + ' ' + T.full(r.gross) + ' · ' + T.basis;
    range.style.setProperty('--p', ((amount - MIN) / (MAX - MIN) * 100) + '%');
  }
  range.addEventListener('input', run);

  if (!document.getElementById('try-th-css')) document.head.appendChild(h('style', { id: 'try-th-css', text:
    '.th-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.th-top span{font-size:15px;font-weight:600;color:var(--muted)}' +
    '.th-annual{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums}' +
    '.th-range{-webkit-appearance:none;appearance:none;width:100%;height:44px;margin:0;background:transparent;cursor:pointer;touch-action:pan-y}' +
    '.th-range::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:linear-gradient(90deg,var(--tc) var(--p,0%),var(--line) var(--p,0%))}' +
    '.th-range::-moz-range-track{height:8px;border-radius:4px;background:linear-gradient(90deg,var(--tc) var(--p,0%),var(--line) var(--p,0%))}' +
    '.th-range::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:28px;margin-top:-10px;border-radius:50%;background:#fff;border:3px solid var(--tc);box-shadow:0 2px 6px rgba(0,0,0,.25)}' +
    '.th-range::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid var(--tc)}' +
    '.th-range:focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:8px}' +
    '.th-net small{display:block;margin:6px 0 0}' +
    '.th-bar{display:flex;height:22px;border-radius:8px;overflow:hidden;background:var(--line)}' +
    '.th-keep{background:var(--tc);transition:width .3s cubic-bezier(.2,.8,.2,1)}.th-dedbar{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--ink) 45%,var(--card)) 0 5px,color-mix(in srgb,var(--ink) 30%,var(--card)) 5px 10px);transition:width .3s cubic-bezier(.2,.8,.2,1)}' +
    '.th-barlbl{display:flex;justify-content:space-between;gap:10px;font-size:15px;font-weight:600;color:var(--ink-2);font-variant-numeric:tabular-nums}' +
    '.th-lines{list-style:none;margin:0;padding:0;display:grid;gap:10px}' +
    '.th-l{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 12px;font-size:15px}' +
    '.th-name{color:var(--ink-2)}.th-rate{color:var(--muted)}.th-l b{font-variant-numeric:tabular-nums;text-align:right}' +
    '.th-track{grid-column:1/-1;height:6px;border-radius:3px;background:color-mix(in srgb,var(--line) 70%,transparent);overflow:hidden}' +
    '.th-track i{display:block;height:100%;border-radius:3px;background:color-mix(in srgb,var(--ink) 45%,var(--card));transition:width .3s cubic-bezier(.2,.8,.2,1)}' +
    '.th-l--tax .th-track i{background:color-mix(in srgb,var(--tc) 70%,var(--card))}' +
    '@media (min-width:641px){.th-lines{grid-template-columns:1fr 1fr;column-gap:22px}}' +
    '@media (prefers-reduced-motion:reduce){.th-keep,.th-dedbar,.th-track i{transition:none}}' }));
  stage.appendChild(h('div', { class: 'tr' }, [
    h('div', { class: 'th-top' }, [h('span', { text: T.annual }), annualOut]),
    range,
    big,
    h('div', { class: 'th-bar', 'aria-hidden': 'true' }, [barKeep, barDed]),
    h('div', { class: 'th-barlbl' }, [keepLbl, dedLbl]),
    list,
    grossEl
  ]));
  run();
  return {
    auto: function (A) {
      // 손가락이 손잡이를 잡고 3,000만 → 7,000만 원으로 끌었다가 4,500만 원에 놓는다
      function at(v) { return (v - MIN) / (MAX - MIN) * 0.94 + 0.03; }
      function slide(from, to, ms) {
        var steps = A.reduced ? 1 : Math.max(1, Math.round(ms / 40)), i = 0;
        function step() {
          if (i++ >= steps) return Promise.resolve();
          var v = Math.round((from + (to - from) * (i / steps)) / STEP) * STEP;
          return A.move(range, at(v), 0.5).then(function () { A.set(range, String(v)); return A.wait(40); }).then(step);
        }
        return step();
      }
      A.set(range, '30000000');
      return A.point(range, at(30000000), 0.5)
        .then(function () { return slide(30000000, 70000000, 1600); })
        .then(function () { return A.wait(900); })
        .then(function () { return slide(70000000, 45000000, 900); });
    }
  };
};
