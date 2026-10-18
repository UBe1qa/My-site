/* 공평뽑기 바로 써 보기: 공평뽑기 사이트의 뽑기 파일(core/rng.js·core/pick.js, ES 모듈)을 그대로 불러 돌림판을 돌린다.
   돌리기 전에 결과가 먼저 정해진다: 브라우저 암호 난수 32바이트(newSeed) → wheelDraw → 그 칸에 멈추는 각도(wheelRotation).
   도는 시간·감속(3400 + 바퀴 수 × 260ms, 1-(1-t)^3.6)과 바늘 자리(3시)도 사이트와 같다. 판은 이 창에서 SVG로 그린다. */
window.LLTry.pickboard = function (stage, c) {
  var h = c.h, s = c.svg, ko = c.lang === 'ko';
  var T = ko
    ? { names: '명단 (한 줄에 한 명)', spin: '돌리기', spinning: '도는 중…', winner: '뽑힌 사람', out: '뽑힌 사람 빼기', wait: '돌리기를 눌러 보세요', empty: '이름을 두 명 넘게 넣어 주세요',
        count: function (n) { return n + '명'; }, sample: '김민준\n이서연\n박지호\n최유나\n정도윤\n강하린\n윤서준\n임채원' }
    : { names: 'Names (one per line)', spin: 'Spin', spinning: 'Spinning…', winner: 'Winner', out: 'Remove winner', wait: 'Press Spin', empty: 'Add at least two names',
        count: function (n) { return n + ' names'; }, sample: 'Olivia\nNoah\nEmma\nLiam\nAva\nMason\nSophia\nLucas' };
  var PAL = ['#ffd04a', '#7cc4f4', '#86dba8', '#b9a7f6', '#ffb968', '#5fd0cf', '#c2e56b', '#94a9f8'];   // 공평뽑기 --s1~8
  var TAU = Math.PI * 2, R = 100, POINTER = 0;
  var P = null, RNG = null, items = [], rot = 0, spinning = false, raf = 0, alive = true, lastDur = 0, winner = -1;

  var wheel = s('g', { class: 'pb-wheel' });
  var needle = s('path', { class: 'pb-needle', d: 'M' + (R + 13) + ' -9L' + (R - 9) + ' 0L' + (R + 13) + ' 9Z' });
  var face = s('svg', { viewBox: '-116 -116 232 232', class: 'pb-face', 'aria-hidden': 'true' }, [s('circle', { r: R + 4, class: 'pb-rim' }), wheel, needle]);
  var hub = h('button', { type: 'button', class: 'pb-hub', onclick: function () { spin(); } }, [T.spin]);
  var ta = h('textarea', { class: 'tr-in pb-list', rows: 4, spellcheck: 'false', 'aria-label': T.names, text: T.sample });
  var countEl = h('span', { class: 'pb-count' });
  var resLbl = h('span', { class: 'pb-rl', text: T.winner });
  var resName = h('b', { class: 'pb-name', 'aria-live': 'polite' });
  var outBtn = h('button', { type: 'button', class: 'tr-btn', hidden: true, onclick: removeWinner }, [T.out]);

  function names() {
    return ta.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 200);
  }
  function arc(i, n) {
    var a0 = i / n * TAU, a1 = (i + 1) / n * TAU, big = a1 - a0 > Math.PI ? 1 : 0;
    if (n === 1) return 'M' + R + ' 0A' + R + ' ' + R + ' 0 1 1 ' + (-R) + ' 0A' + R + ' ' + R + ' 0 1 1 ' + R + ' 0Z';
    return 'M0 0L' + R * Math.cos(a0) + ' ' + R * Math.sin(a0) + 'A' + R + ' ' + R + ' 0 ' + big + ' 1 ' + R * Math.cos(a1) + ' ' + R * Math.sin(a1) + 'Z';
  }
  function draw(hi) {
    wheel.textContent = '';
    var n = items.length;
    if (!n) return;
    // 이름 글자는 화면에서 15px 넘게(칸 폭이 허락하는 만큼까지만 키운다)
    var px = (face.getBoundingClientRect().width || 300) / 232;
    var m = P.sliceColorCount(n), size = Math.max(P.labelSize(R, n), Math.min(15 / px, 2 * R * 0.66 * Math.sin(Math.PI / n) * 0.56));
    for (var i = 0; i < n; i++) {
      var g = s('g', { class: 'pb-slice' + (hi >= 0 && i !== hi ? ' is-dim' : '') });
      g.appendChild(s('path', { d: arc(i, n), fill: PAL[i % m] }));
      if (size >= 8) {
        var mid = (i + 0.5) / n * TAU, flip = P.labelFlipped(mid + rot), deg = (mid + (flip ? Math.PI : 0)) * 180 / Math.PI;
        var tx = s('text', { x: flip ? -R * 0.86 : R * 0.86, y: 0, 'text-anchor': flip ? 'start' : 'end', 'dominant-baseline': 'central', transform: 'rotate(' + deg + ')', 'font-size': size.toFixed(2) });
        var name = items[i];
        tx.textContent = name.length > 9 ? name.slice(0, 8) + '…' : name;
        g.appendChild(tx);
      }
      wheel.appendChild(g);
    }
    wheel.setAttribute('transform', 'rotate(' + (rot * 180 / Math.PI) + ')');
  }
  function sync() {
    if (spinning || !P) return;
    items = names();
    countEl.textContent = T.count(items.length);
    winner = -1; outBtn.hidden = true;
    rot = items.length ? -Math.PI / items.length : 0;   // 처음엔 첫 칸 가운데가 바늘 아래(사이트와 같다)
    resName.textContent = items.length > 1 ? T.wait : T.empty;
    resName.classList.add('is-wait');
    hub.disabled = items.length < 2;
    draw(-1);
  }
  function spin() {
    if (spinning || !P || items.length < 2) return 0;
    var n = items.length;
    var pick = P.wheelDraw(items, RNG.makeRng(RNG.newSeed()));   // 결과를 먼저 정하고
    var to = P.wheelRotation({ n: n, index: pick.index, frac: pick.frac, from: rot, turns: pick.turns, pointer: POINTER });   // 그 칸에 멈추는 각도
    var from = rot, dur = c.reduced ? 0 : 3400 + pick.turns * 260, t0 = performance.now(), lastTick = 0, lastIdx = P.wheelIndexAt(n, from, POINTER);
    spinning = true; hub.disabled = true; ta.readOnly = true; outBtn.hidden = true;
    resName.textContent = T.spinning; resName.classList.add('is-wait');
    draw(-1);
    function done() {
      spinning = false; rot = to % TAU; winner = pick.index;
      draw(winner);
      resName.textContent = items[winner]; resName.classList.remove('is-wait');
      if (!c.reduced) { resName.classList.remove('tr-pop'); void resName.offsetWidth; resName.classList.add('tr-pop'); }
      hub.disabled = false; ta.readOnly = false; outBtn.hidden = false;
    }
    if (!dur) { done(); return 0; }
    function frame(now) {
      if (!alive) return;
      var t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3.6), v = from + (to - from) * e;
      wheel.setAttribute('transform', 'rotate(' + (v * 180 / Math.PI) + ')');
      var idx = P.wheelIndexAt(n, v, POINTER);
      if (idx !== lastIdx && now - lastTick > 55) { lastTick = now; needle.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-11deg)' }, { transform: 'rotate(0)' }], { duration: 110 }); }
      lastIdx = idx;
      if (t < 1) raf = requestAnimationFrame(frame); else done();
    }
    raf = requestAnimationFrame(frame);
    lastDur = dur;
    return dur;
  }
  function removeWinner() {
    if (winner < 0 || spinning) return;
    var lines = ta.value.split('\n'), name = items[winner], k = -1;
    for (var i = 0; i < lines.length; i++) if (lines[i].trim() === name) { k = i; break; }
    if (k >= 0) lines.splice(k, 1);
    ta.value = lines.join('\n');
    sync();
  }
  ta.addEventListener('input', sync);

  if (!document.getElementById('try-pb-css')) document.head.appendChild(h('style', { id: 'try-pb-css', text:
    '.pb{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:22px;align-items:center}' +
    '.pb-box{position:relative;width:100%;max-width:300px;aspect-ratio:1;margin:0 auto}.pb-face{display:block;width:100%;height:100%;overflow:visible}' +
    '.pb-rim{fill:var(--card);stroke:var(--line);stroke-width:1.5}.pb-slice path{stroke:#fff;stroke-width:1.2}.pb-slice text{fill:#1b2026;font-weight:700}' +
    '.pb-slice.is-dim{opacity:.26}.pb-needle{fill:var(--tc);stroke:#fff;stroke-width:2;stroke-linejoin:round;transform-origin:' + (R + 13) + 'px 0;transform-box:view-box}' +
    '.pb-hub{position:absolute;left:50%;top:50%;width:27%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:0;background:color-mix(in srgb,var(--tc) 86%,#000);color:#fff;' +
    'font:inherit;font-size:clamp(15px,4vw,18px);font-weight:800;cursor:pointer;box-shadow:0 0 0 5px var(--card),0 6px 14px rgba(20,28,36,.28);transition:transform .12s}' +
    '.pb-hub:active,.pb-hub.is-auto-press{transform:translate(-50%,-50%) scale(.94)}.pb-hub:disabled{cursor:default}' +
    '.pb-side{display:grid;gap:12px;align-content:start}.pb-res{display:grid;gap:2px;min-height:64px}.pb-rl{font-size:15px;font-weight:600;color:var(--muted)}' +
    '.pb-name{font-size:clamp(26px,6vw,34px);font-weight:800;letter-spacing:-.02em;line-height:1.2;overflow-wrap:anywhere}.pb-name.is-wait{font-size:17px;font-weight:600;color:var(--ink-2)}' +
    '.pb-lh{display:flex;justify-content:space-between;font-size:15px;font-weight:600;color:var(--muted)}.pb-list{min-height:120px}' +
    '@media (max-width:560px){.pb{grid-template-columns:minmax(0,1fr)}.pb-res{text-align:center}}' }));
  stage.appendChild(h('div', { class: 'tr pb' }, [
    h('div', { class: 'pb-box' }, [face, hub]),
    h('div', { class: 'pb-side' }, [
      h('div', { class: 'pb-res' }, [resLbl, resName]),
      outBtn,
      h('label', { class: 'tr-field' }, [h('span', { class: 'pb-lh' }, [h('span', { text: T.names }), countEl]), ta])
    ])
  ]));
  hub.disabled = true;
  // 사이트의 뽑기 파일은 ES 모듈이라 import()로 부른다(이 창이 열릴 때 한 번)
  var mods = (c.tool.demo.mod || []).map(function (u) { return import(u); });
  var ready = Promise.all(mods).then(function (ms) {
    ms.forEach(function (m) { if (m.makeRng) RNG = m; if (m.wheelDraw) P = m; });
    if (!P || !RNG) throw new Error('pick core');
    sync();
  });
  ready.catch(function (e) { c.fail(e); });   // 불러오지 못하면 빈 판 대신 안내와 공평뽑기 링크
  return {
    stop: function () { alive = false; cancelAnimationFrame(raf); },
    auto: function (A) {
      if (A.fast) return ready;   // 동작 줄이기: 손님이 돌리지 않은 결과를 남기지 않는다
      return ready.then(function () { return A.press(hub); })
        .then(function () { return A.wait(lastDur + 2200); })
        .then(function () { return A.press(outBtn); });
    }
  };
};
