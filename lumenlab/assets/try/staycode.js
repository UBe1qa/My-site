/* 오래QR 바로 써 보기: 오래QR 사이트의 QR 만드는 파일(qr.js, 전역 QR)을 그대로 불러 글자를 칠 때마다 QR을 다시 만든다.
   흰 바탕·검은 칸이라 휴대폰 카메라로 바로 읽힌다. */
window.LLTry.staycode = function (stage, c) {
  var h = c.h, ko = c.lang === 'ko';
  var T = ko
    ? { label: '담을 주소나 글', ph: '주소나 글을 쳐 보세요', ecl: '오류 복원', info: function (q) { return '버전 ' + q.version + ' · ' + q.size + '×' + q.size + '칸 · ' + q.bytes + '바이트'; },
        scan: '휴대폰 카메라로 비춰 보세요. 이 QR은 바로 읽혀요.', empty: '글자를 치면 QR이 생겨요', lv: { L: '7%', M: '15%', Q: '25%', H: '30%' }, start: 'https://lumenlab.page' }
    : { label: 'Link or text', ph: 'Type a link or some text', ecl: 'Error correction', info: function (q) { return 'Version ' + q.version + ' · ' + q.size + '×' + q.size + ' modules · ' + q.bytes + ' bytes'; },
        scan: 'Point your phone camera at it. This QR code scans.', empty: 'Type something to make a QR code', lv: { L: '7%', M: '15%', Q: '25%', H: '30%' }, start: 'https://lumenlab.page' };
  var ecl = 'M';
  var input = h('input', { class: 'tr-in', type: 'text', placeholder: T.ph, autocomplete: 'off', spellcheck: 'false', 'aria-label': T.label });
  var box = h('div', { class: 'qr-box' });
  var info = h('p', { class: 'tr-note qr-info', 'aria-live': 'polite' });
  var chips = ['L', 'M', 'Q', 'H'].map(function (k) {
    return h('button', { type: 'button', class: 'tr-btn qr-ecl', 'aria-pressed': String(k === ecl), 'data-k': k, onclick: function () { setEcl(k); } }, [k + ' ', h('span', { text: T.lv[k] })]);
  });
  function setEcl(k) {
    ecl = k;
    chips.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-k') === k)); });
    draw(true);
  }
  function draw(pop) {
    var v = input.value;
    box.textContent = '';
    if (!v) { box.appendChild(h('p', { class: 'tr-note', text: T.empty })); info.textContent = ''; return; }
    var q;
    try { q = window.QR.encode(v, { ecl: ecl }); } catch (e) { info.textContent = String(e.message || e); return; }
    var n = q.size, m = 4, d = '';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (q.modules[y * n + x]) d += 'M' + (x + m) + ' ' + (y + m) + 'h1v1h-1z';
    var s = c.svg('svg', { viewBox: '0 0 ' + (n + 2 * m) + ' ' + (n + 2 * m), role: 'img', 'aria-label': 'QR: ' + v, 'shape-rendering': 'crispEdges' }, [
      c.svg('rect', { width: n + 2 * m, height: n + 2 * m, fill: '#fff' }),
      c.svg('path', { d: d, fill: '#111' })
    ]);
    if (pop) s.classList.add('tr-pop');
    box.appendChild(s);
    info.textContent = T.info(q);
  }
  input.addEventListener('input', function () { draw(false); });
  if (!document.getElementById('try-qr-css')) document.head.appendChild(h('style', { id: 'try-qr-css', text:
    '.qr{display:grid;grid-template-columns:200px minmax(0,1fr);gap:18px;align-items:center}' +
    '.qr-box{width:200px;height:200px;display:grid;place-items:center;border-radius:14px;background:#fff;border:1px solid var(--line);overflow:hidden}' +
    '.qr-box svg{display:block;width:100%;height:100%}.qr-box .tr-note{color:#555;text-align:center;padding:0 14px}' +
    '.qr-side{display:grid;gap:12px;align-content:start}.qr-ecl span{font-weight:600;color:var(--muted)}.qr-ecl[aria-pressed="true"] span{color:inherit;opacity:.75}' +
    '.qr-h{margin:0;font-size:15px;font-weight:600;color:var(--muted)}.qr-info{font-variant-numeric:tabular-nums}' +
    '@media (max-width:560px){.qr{grid-template-columns:minmax(0,1fr)}.qr-box{margin:0 auto}}' }));
  stage.appendChild(h('div', { class: 'tr' }, [
    input,
    h('div', { class: 'qr' }, [box, h('div', { class: 'qr-side' }, [h('p', { class: 'qr-h', text: T.ecl }), h('div', { class: 'tr-chips' }, chips), info, h('p', { class: 'tr-note', text: T.scan })])])
  ]));
  draw(false);
  return {
    auto: function (A) {
      A.set(input, '');
      return A.type(input, T.start, 70)
        .then(function () { return A.wait(500); })
        .then(function () { return A.press(chips[3]); })
        .then(function () { return A.wait(900); })
        .then(function () { return A.press(chips[1]); });
    }
  };
};
