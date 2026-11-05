/* 판의 손맛: 효과음(Web Audio로 그 자리에서 만든 소리, 파일 없음)과 작은 입자 효과.
   소리는 사람이 판을 처음 누른 뒤에만 나고(브라우저 규칙), 판 아래 스피커 단추로 끄면 fm.sound에 기억한다.
   움직임 줄이기를 켠 사람에겐 입자·흔들림을 빼고 색 변화만 남긴다(board.js가 FM.fxOK로 확인). */
(function (g) {
  'use strict';
  var FM = g.FM || (g.FM = {});
  var doc = g.document;
  var reduce = !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches);
  FM.fxOK = !reduce;

  // ---------------------------------------------------------------- 소리
  var KEY = 'fm.sound';
  var on = true;
  try { on = g.localStorage.getItem(KEY) !== '0'; } catch (_) {}
  var ac = null, out = null, noise = null, last = {}, VOL = 0.55;

  function ctx() {
    if (ac) return ac;
    var AC = g.AudioContext || g.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC({ latencyHint: 'interactive' }); } catch (_) { try { ac = new AC(); } catch (e) { return null; } }
    chain(ac);
    return ac;
  }
  // 소리 끝단: 전체 크기 → 부드러운 한계(겹쳐도 찢어지지 않게) → 스피커. 잡음 재료도 여기서 한 번 만든다.
  // 압축기(DynamicsCompressor)는 브라우저가 소리를 몰래 키워서(자동 보정) 크기가 들쭉날쭉해 쓰지 않는다.
  function chain(c) {
    out = c.createGain();
    out.gain.value = VOL;
    var sh = c.createWaveShaper(), n = 1024, cv = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; cv[i] = Math.tanh(x * 1.2) / Math.tanh(1.2); }
    sh.curve = cv;
    out.connect(sh); sh.connect(c.destination);
    var len = Math.floor(c.sampleRate * 0.5), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var j = 0; j < len; j++) d[j] = Math.random() * 2 - 1;
    noise = buf;
  }
  // 첫 누름에서 소리 장치를 깨운다(iOS는 touchend·click에서만 풀린다)
  function unlock() {
    if (!on) return;
    var c = ctx();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (_) {} }
  }
  if (doc) ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) { doc.addEventListener(ev, unlock, { capture: true, passive: true }); });

  // 감쇠하는 사인 하나(나무·마림바의 '모드'). τ = 줄어드는 빠르기(초)
  function mode(t, f, gain, tau, glide) {
    var o = ac.createOscillator(), v = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(f * glide, t + tau * 2);
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(gain, t + 0.0015);
    v.gain.setTargetAtTime(0, t + 0.0015, tau);
    o.connect(v); v.connect(out);
    o.start(t); o.stop(t + 0.0015 + tau * 8);
  }
  // 짧은 잡음(딸깍 소리). 필터 종류·가운데 높이·길이
  function burst(t, type, f, q, gain, dur) {
    var s = ac.createBufferSource(), fl = ac.createBiquadFilter(), v = ac.createGain();
    s.buffer = noise;
    fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    v.gain.setValueAtTime(gain, t);
    v.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(fl); fl.connect(v); v.connect(out);
    s.start(t, Math.random() * 0.4, dur + 0.01);
  }
  // 나무 말을 나무 판에 놓는 소리. k = 높이 배수, a = 크기
  function tock(t, k, a) {
    var r = k * (0.95 + Math.random() * 0.1);
    mode(t, 185 * r, 0.42 * a, 0.032, 0.8);     // 판이 울리는 낮은 소리
    mode(t, 760 * r, 0.30 * a, 0.020);
    mode(t, 1690 * r, 0.20 * a, 0.012);
    mode(t, 3020 * r, 0.09 * a, 0.006);
    burst(t, 'highpass', 2600, 0.7, 0.22 * a, 0.012);   // 닿는 순간 딸깍
  }
  // 마림바 한 음(맞힘·끝냄). 배음 1 : 3.9 : 9.2
  function bar(t, f, a, tau) {
    tau = tau || 0.32;
    mode(t, f, 0.30 * a, tau);
    mode(t, f * 3.9, 0.07 * a, tau * 0.18);
    mode(t, f * 9.2, 0.025 * a, tau * 0.07);
    burst(t, 'bandpass', f * 6, 1.2, 0.03 * a, 0.01);
  }
  var SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];   // 연속으로 맞힐수록 장음계로 한 칸씩 올라간다
  function note(semi) { return 523.25 * Math.pow(2, semi / 12); }   // C5 기준

  var SOUNDS = {
    pick: function (t) { mode(t, 2300, 0.05, 0.005); burst(t, 'highpass', 3500, 0.7, 0.05, 0.008); },
    move: function (t) { tock(t, 1, 1); },
    back: function (t) { tock(t, 0.92, 0.7); },
    capture: function (t) {
      // 말끼리 부딪는 딱 + 무겁게 내려앉는 쿵
      mode(t, 1250, 0.16, 0.010); mode(t, 2710, 0.10, 0.006); burst(t, 'bandpass', 3200, 1.5, 0.22, 0.014);
      var t2 = t + 0.026;
      mode(t2, 150, 0.55, 0.045, 0.75); mode(t2, 640, 0.32, 0.026); mode(t2, 1420, 0.18, 0.014);
      burst(t2, 'bandpass', 900, 0.9, 0.28, 0.045);
    },
    castle: function (t) { tock(t, 1, 0.95); tock(t + 0.095, 0.9, 0.85); },
    bell: function (t) {   // 체크: 말 소리 뒤에 맑은 쇠 소리를 겹친다
      mode(t, 1318.5, 0.12, 0.16); mode(t, 2637, 0.05, 0.08); mode(t, 3955, 0.02, 0.04);
    },
    promote: function (t) {
      tock(t, 1, 0.9);
      [1046.5, 1318.5, 1568, 2093].forEach(function (f, i) { bar(t + 0.05 + i * 0.045, f, 0.55, 0.16); });
    },
    shuffle: function (t) { tock(t, 1.05, 0.55); tock(t + 0.045, 0.98, 0.42); tock(t + 0.09, 0.92, 0.32); },
    ok: function (t, o) {
      var s = SCALE[Math.min(SCALE.length - 1, Math.max(0, ((o && o.combo) || 1) - 1))];
      bar(t + 0.06, note(s), 1);
      bar(t + 0.13, note(s + 7), 0.85);
    },
    warn: function (t) { bar(t + 0.05, 392, 0.7, 0.22); bar(t + 0.16, 329.6, 0.6, 0.22); },
    bad: function (t) {
      mode(t, 200, 0.40, 0.07, 0.72); burst(t, 'lowpass', 500, 0.7, 0.22, 0.05);
      mode(t + 0.12, 150, 0.32, 0.10, 0.8);
    },
    done: function (t, o) {
      var seq = [0, 4, 7, 12], big = o && o.perfect;
      seq.forEach(function (s, i) { bar(t + i * 0.075, note(s), 0.9, 0.4); });
      var t2 = t + seq.length * 0.075 + 0.02;
      [0, 4, 7].forEach(function (s) { bar(t2, note(s + 12), 0.45, 0.6); });
      if (big) [16, 19, 24].forEach(function (s, i) { bar(t2 + 0.12 + i * 0.06, note(s), 0.4, 0.3); });
    }
  };

  var Sfx = {
    get on() { return on; },
    set: function (v) {
      on = !!v;
      try { g.localStorage.setItem(KEY, on ? '1' : '0'); } catch (_) {}
      if (on) { unlock(); this.play('move'); }
      paint();
    },
    // delay(초): 말이 미끄러져 닿는 순간에 맞춘다
    play: function (kind, o) {
      if (!on || !SOUNDS[kind]) return;
      var c = ctx();
      if (!c || c.state !== 'running') return;
      var now = c.currentTime;
      if (last[kind] && now - last[kind] < 0.03) return;   // 같은 소리가 겹쳐 쌓이지 않게
      last[kind] = now;
      SOUNDS[kind](now + Math.max(0, (o && o.delay) || 0) + 0.005, o);
    },
    // 시험용: 소리 하나를 스피커 없이 그려 받는다(tests, 소리 확인)
    _render: function (kind, o, secs) {
      var OAC = g.OfflineAudioContext || g.webkitOfflineAudioContext;
      if (!OAC || !SOUNDS[kind]) return Promise.reject(new Error('no offline audio'));
      var keep = [ac, out, noise], off = new OAC(1, Math.ceil(44100 * (secs || 1.2)), 44100);
      ac = off; chain(off);
      try { SOUNDS[kind](0.01, o); } finally { ac = keep[0]; out = keep[1]; noise = keep[2]; }
      return off.startRendering();
    },
    buzz: function (pattern) {
      if (!on || !g.navigator || !g.navigator.vibrate) return;
      if (!(g.matchMedia && g.matchMedia('(pointer: coarse)').matches)) return;
      try { g.navigator.vibrate(pattern); } catch (_) {}
    }
  };
  FM.Sfx = Sfx;

  // 스피커 단추([data-sound]): 누르면 켜고 끄고, 상태는 aria-pressed
  function paint() {
    if (!doc) return;
    var bs = doc.querySelectorAll('[data-sound]');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  if (doc) {
    doc.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-sound]');
      if (b) Sfx.set(!on);
    });
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', paint); else paint();
  }

  // ---------------------------------------------------------------- 입자
  // 판 위 한 칸(x, y는 0~7)에서 작은 조각이 튄다. 판 요소 안에 그리고 끝나면 지운다.
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function px(v) { return v.toFixed(1) + 'px'; }
  FM.Fx = {
    chips: function (bd, x, y, colors, n, power) {
      if (!FM.fxOK || !bd.animate) return;
      n = n || 10; power = power || 1;
      var sq = bd.clientWidth / 8;
      for (var i = 0; i < n; i++) {
        var c = doc.createElement('i'), a = rnd(0, Math.PI * 2), d = rnd(0.35, 0.95) * sq * power, s = rnd(0.07, 0.15) * sq;
        c.className = 'spark';
        c.style.left = px((x + 0.5) * sq - s / 2);
        c.style.top = px((y + 0.5) * sq - s / 2);
        c.style.width = c.style.height = px(s);
        c.style.background = colors[i % colors.length];
        bd.appendChild(c);
        var dx = Math.cos(a) * d, dy = Math.sin(a) * d + 0.25 * sq * power;
        c.animate([
          { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
          { transform: 'translate(' + px(dx) + ',' + px(dy) + ') rotate(' + rnd(-260, 260).toFixed(0) + 'deg) scale(.4)', opacity: 0 }
        ], { duration: rnd(380, 560), easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards' }).onfinish = gone(c);
      }
    },
    // 판 위에서 떨어지는 종이 조각(줄을 끝냈을 때)
    confetti: function (bd, n, colors) {
      if (!FM.fxOK || !bd.animate) return;
      var W = bd.clientWidth;
      for (var i = 0; i < n; i++) {
        var c = doc.createElement('i'), w = rnd(0.012, 0.022) * W;
        c.className = 'spark conf';
        c.style.left = px(rnd(0.04, 0.96) * W);
        c.style.top = px(-w * 2);
        c.style.width = px(w);
        c.style.height = px(w * rnd(1.4, 2.2));
        c.style.background = colors[i % colors.length];
        bd.appendChild(c);
        var fall = rnd(0.85, 1.1) * W, drift = rnd(-0.14, 0.14) * W, spin = rnd(-540, 540);
        c.animate([
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + px(drift * 0.4) + ',' + px(fall * 0.5) + ') rotate(' + (spin * 0.5).toFixed(0) + 'deg)', opacity: 1, offset: 0.55 },
          { transform: 'translate(' + px(drift) + ',' + px(fall) + ') rotate(' + spin.toFixed(0) + 'deg)', opacity: 0 }
        ], { duration: rnd(1100, 1700), delay: rnd(0, 220), easing: 'cubic-bezier(.25,.6,.5,1)', fill: 'both' }).onfinish = gone(c);
      }
    }
  };
  function gone(el) { return function () { el.remove(); }; }
})(typeof window !== 'undefined' ? window : globalThis);
