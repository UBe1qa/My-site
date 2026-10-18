/* 한바퀴 바로 써 보기: 한바퀴 사이트의 시간 파일(core.js, 전역 OT)을 그대로 불러 시계판 타이머를 돌린다.
   멈춘 상태에서 판을 끌어 1분 단위로 맞추고(OT.dragMinutes, 60분 판), 돌기 시작하면 판 한 바퀴가 맞춘 시간에 맞춰 바뀐다(OT.scaleFor).
   남은 시간은 시작·끝 시각으로 계산한다(OT.timerStart·timerLeft). 아래 세계 시간은 OT.parts(브라우저 시간대 자료 + 한바퀴의 보정). */
window.LLTry.oneturn = function (stage, c) {
  var h = c.h, s = c.svg, ko = c.lang === 'ko', OT = window.OT;
  var T = ko
    ? { start: '시작', pause: '멈춤', resume: '계속', reset: '처음으로', drag: '판을 끌어 시간을 맞춰요', done: '끝났어요', dial: '타이머 시계판',
        cities: [['Asia/Seoul', '서울'], ['America/New_York', '뉴욕'], ['Europe/London', '런던'], ['Europe/Paris', '파리']], world: '지금 세계 시간' }
    : { start: 'Start', pause: 'Pause', resume: 'Resume', reset: 'Reset', drag: 'Drag the dial to set the time', done: 'Time’s up', dial: 'Timer dial',
        cities: [['Asia/Seoul', 'Seoul'], ['America/New_York', 'New York'], ['Europe/London', 'London'], ['Europe/Paris', 'Paris']], world: 'World clock right now' };
  var t = { dur: 0, state: 'idle', end: null, left: null, doneAt: null }, mins = 0, raf = 0, timer = 0, alive = true;
  // 한바퀴 시계판과 같은 짜임(테두리 → 눈금 → 숫자 → 띠 → 가운데)을 240칸 판에 줄여 그린다
  var RO = 76, RI = 58, RK = 67, CX = 120, CY = 120;
  var wedge = s('path', { class: 'ot-wedge' });
  var ticks = s('g', { class: 'ot-ticks' });
  var hand = s('circle', { class: 'ot-knob', r: 9 });
  var face = s('svg', { viewBox: '0 0 240 240', class: 'ot-face', role: 'slider', tabindex: '0', 'aria-label': T.dial, 'aria-valuemin': '0', 'aria-valuemax': '60', 'aria-valuenow': '0' }, [
    s('circle', { cx: CX, cy: CY, r: 116, class: 'ot-rim' }), s('circle', { cx: CX, cy: CY, r: (RO + RI) / 2, class: 'ot-band' }), ticks, wedge, s('circle', { cx: CX, cy: CY, r: RI - 4, class: 'ot-hub' }), hand
  ]);
  var readout = h('p', { class: 'ot-time', 'aria-live': 'off' });
  var hint = h('p', { class: 'tr-note ot-hint', text: T.drag });
  var go = h('button', { type: 'button', class: 'tr-btn tr-btn--main', onclick: toggle }, [T.start]);
  var reset = h('button', { type: 'button', class: 'tr-btn', onclick: doReset }, [T.reset]);
  var world = h('ul', { class: 'ot-world' });
  var cityEls = T.cities.map(function (ct) {
    var tm = h('b'), li = h('li', null, [tm, h('span', { text: ct[1] })]);
    world.appendChild(li); return tm;
  });

  function pt(frac, r) { var a = frac * 2 * Math.PI; return [CX + r * Math.sin(a), CY - r * Math.cos(a)]; }
  function drawFace(scale) {
    ticks.textContent = '';
    var f = OT.faceLabels(scale);
    var major = f.ticks / f.labels.length;
    for (var i = 0; i < f.ticks; i++) {
      var a = pt(i / f.ticks, 108), b = pt(i / f.ticks, i % major ? 102 : 97);
      ticks.appendChild(s('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }));
    }
    f.labels.forEach(function (l) {
      var p = pt(l.frac, 86);
      var tx = s('text', { x: p[0], y: p[1], 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      tx.textContent = String(l.v);
      ticks.appendChild(tx);
    });
  }
  var curScale = 0;
  function render(now) {
    var left = OT.timerLeft(t, now), scale = t.state === 'idle' ? 60 : OT.scaleFor(t.dur);
    if (scale !== curScale) { curScale = scale; drawFace(scale); }
    var frac = Math.min(1, left / (scale * OT.MIN));
    if (frac <= 0) wedge.setAttribute('d', '');
    else if (frac >= 0.9999) wedge.setAttribute('d', ring());
    else {
      var big = frac > 0.5 ? 1 : 0, o = pt(frac, RO), n = pt(frac, RI);
      wedge.setAttribute('d', 'M' + CX + ' ' + (CY - RO) + 'A' + RO + ' ' + RO + ' 0 ' + big + ' 1 ' + o[0] + ' ' + o[1] +
        'L' + n[0] + ' ' + n[1] + 'A' + RI + ' ' + RI + ' 0 ' + big + ' 0 ' + CX + ' ' + (CY - RI) + 'Z');
    }
    var k = pt(frac, RK); hand.setAttribute('cx', k[0]); hand.setAttribute('cy', k[1]);
    hint.hidden = t.state !== 'idle';
    readout.textContent = t.state === 'done' ? T.done : OT.fmtTimer(left);
    face.setAttribute('aria-valuenow', String(mins));
    face.setAttribute('aria-valuetext', OT.say(left, c.lang, true));
    go.textContent = t.state === 'run' ? T.pause : t.state === 'pause' ? T.resume : T.start;
    go.disabled = !(t.dur > 0) || t.state === 'done';
    stage.classList.toggle('is-done', t.state === 'done');
  }
  function ring() {
    return 'M' + CX + ' ' + (CY - RO) + 'a' + RO + ' ' + RO + ' 0 1 1 0 ' + (2 * RO) + 'a' + RO + ' ' + RO + ' 0 1 1 0 ' + (-2 * RO) +
      'M' + CX + ' ' + (CY - RI) + 'a' + RI + ' ' + RI + ' 0 1 0 0 ' + (2 * RI) + 'a' + RI + ' ' + RI + ' 0 1 0 0 ' + (-2 * RI) + 'Z';
  }
  function loop() {
    if (!alive) return;
    var now = Date.now();
    t = OT.timerTick(t, now);
    render(now);
    raf = t.state === 'run' ? requestAnimationFrame(loop) : 0;
  }
  function setMinutes(m) {
    if (t.state === 'run') return;
    mins = m;
    t = OT.timerReset({ dur: OT.hms(0, m, 0) });
    t.dur = OT.hms(0, m, 0);
    render(Date.now());
  }
  function toggle() {
    var now = Date.now();
    if (t.state === 'run') t = OT.timerPause(t, now);
    else t = OT.timerStart(t, now);
    if (t.state === 'run') {
      clearTimeout(timer);
      timer = setTimeout(loop, Math.max(0, t.end - now) + 5);   // 끝나는 순간 한 번(한바퀴와 같은 방식)
      if (!raf) raf = requestAnimationFrame(loop);
    }
    render(now);
  }
  function doReset() { clearTimeout(timer); cancelAnimationFrame(raf); raf = 0; t = OT.timerReset(t); render(Date.now()); }

  // 판 끌기: 12시 방향에서 시계 방향으로 잰 각도 → OT.dragMinutes
  var dragging = false;
  function angleOf(e) {
    var r = face.getBoundingClientRect(), x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
  }
  face.addEventListener('pointerdown', function (e) {
    if (t.state === 'run') return;
    dragging = true; face.setPointerCapture(e.pointerId);
    if (t.state !== 'idle') t = OT.timerReset(t);
    setMinutes(OT.dragMinutes(mins, angleOf(e)));
  });
  face.addEventListener('pointermove', function (e) { if (dragging) setMinutes(OT.dragMinutes(mins, angleOf(e))); });
  face.addEventListener('pointerup', function () { dragging = false; });
  face.addEventListener('pointercancel', function () { dragging = false; });
  face.addEventListener('keydown', function (e) {
    var d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (d && t.state !== 'run') { e.preventDefault(); if (t.state !== 'idle') t = OT.timerReset(t); setMinutes(Math.max(0, Math.min(60, mins + d))); }
  });

  function tickWorld() {
    if (!alive) return;
    var now = Date.now();
    T.cities.forEach(function (ct, i) { var p = OT.parts(ct[0], now); cityEls[i].textContent = OT.fmtClock(p.h, p.mi, c.lang, false); });
  }
  var worldTimer = setInterval(tickWorld, 1000);

  if (!document.getElementById('try-ot-css')) document.head.appendChild(h('style', { id: 'try-ot-css', text:
    '.ot{display:grid;grid-template-columns:240px minmax(0,1fr);gap:22px;align-items:center}' +
    '.ot-face{width:240px;height:240px;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}.ot-face:active{cursor:grabbing}' +
    '.ot-face:focus{outline:none}.ot-face:focus-visible .ot-rim{stroke:var(--focus);stroke-width:3}' +
    '.ot-rim{fill:var(--paper);stroke:var(--line);stroke-width:2}.ot-ticks line{stroke:var(--muted);stroke-width:1.4}' +
    '.ot-ticks text{fill:var(--ink-2);font-size:15px;font-weight:650;font-variant-numeric:tabular-nums}' +
    '.ot-wedge{fill:var(--tc);fill-rule:evenodd}.ot-band{fill:none;stroke:color-mix(in srgb,var(--tc) 12%,var(--line));stroke-width:' + (RO - RI) + '}.ot-hub{fill:var(--card);stroke:var(--line)}.ot-knob{fill:#fff;stroke:var(--tc);stroke-width:3}' +
    '.ot-time{margin:0;font-size:clamp(34px,7vw,48px);font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.1}' +
    '.is-done .ot-time{color:var(--tc)}.ot-side{display:grid;gap:12px;align-content:center}' +
    '.ot-world{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}' +
    '.ot-world li{padding:10px 12px;border-radius:12px;background:var(--paper);border:1px solid var(--line)}' +
    '.ot-world b{display:block;font-size:20px;font-variant-numeric:tabular-nums}.ot-world span{font-size:15px;color:var(--muted)}' +
    '.ot-wh{margin:0;font-size:15px;font-weight:600;color:var(--muted)}' +
    '@media (max-width:560px){.ot{grid-template-columns:minmax(0,1fr);justify-items:center;text-align:center}.ot-side .tr-row{justify-content:center}.ot-world{grid-template-columns:repeat(2,minmax(0,1fr))}}' }));
  stage.appendChild(h('div', { class: 'tr' }, [
    h('div', { class: 'ot' }, [face, h('div', { class: 'ot-side' }, [readout, hint, h('div', { class: 'tr-row' }, [go, reset])])]),
    h('p', { class: 'ot-wh', text: T.world }), world
  ]));
  setMinutes(0); tickWorld();

  return {
    stop: function () { alive = false; clearTimeout(timer); clearInterval(worldTimer); cancelAnimationFrame(raf); },
    auto: function (A) {
      doReset(); setMinutes(0);
      // 손가락이 12시에서 시계 방향으로 판을 끌어 5분을 맞추고 시작을 누른다 → 판 한 바퀴가 5분짜리로 바뀐다
      if (A.reduced) { setMinutes(5); return A.wait(300).then(function () { return A.press(go); }); }
      var a = 0;
      function sweep() {
        if (a > 30) return Promise.resolve();
        var p = pt(a / 360, RK);
        return A.move(face, p[0] / 240, p[1] / 240).then(function () {
          setMinutes(OT.dragMinutes(mins, a));
          a += 2;
          return A.wait(40);
        }).then(sweep);
      }
      return A.point(face, 0.5, (CY - RK) / 240)
        .then(sweep)
        .then(function () { return A.wait(450); })
        .then(function () { return A.press(go); });
    }
  };
};
