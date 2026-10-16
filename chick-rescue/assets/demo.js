/* 병아리 구조대 맛보기 판 — 게임 손맛 판(2026-10-17).
   기존 /assets/demo.js를 이 파일로 통째로 바꾸면 된다. HTML·CSS·#demo-text는 그대로 쓴다(DOM 약속이 같다).
   규칙(top·topRun·sealed·canPour·canClimb·apply·release·legal·solve)과 힌트·읽기 라벨·키보드는 기존 demo.js 그대로다.
   움직임·소리·진동·이펙트·생물 그림은 게임 코드의 숫자를 그대로 옮겼다(게임 저장소 games/sort-puzzle/):
     움직임  scripts/game/board_view.gd   _travel, _on_land, _squash, _jump, _shake, _put_back, _animate_shift,
                                           _animate_rescue, _celebrate_tube, _combo, celebrate_win, _settle
     이펙트  scripts/fx/fx_layer.gd       burst, ring, float_text, shake (파티클 모양 8가지)
             scripts/fx/fx_packs.gd       기본 팩(0)의 튜브 완성·판 완료
     소리    scripts/fx/sfx.gd            파일 없이 합성(22050Hz) → WebAudio 버퍼. 음높이는 playbackRate
     진동    Sfx.haptic(ms)               → navigator.vibrate(ms). 안드로이드 크롬만 된다(iOS 사파리는 API가 없어 건너뜀)
     생물    scripts/game/critter.gd      몸·배 무늬·눈, 능력 생물 숨쉬기, 병아리 떨림
     둥지·별·단추  nest_view.gd fill, star_row.gd show_stars, ui_theme.gd add_press_feedback
   게임은 1080px 폭 기준 px로 적혀 있다. 생물 칸 높이 d(게임 4튜브 판에서 165px)에 붙은 값은 d 배수 그대로,
   나머지 절대 px 값(중력·흔들림·글자 크기 등)은 S = d / 165를 곱해 옮겼다. 시간(초)·확률·개수는 그대로다.
   외부 라이브러리 없음. 모든 조각의 transform은 한 곳(drawPiece)에서 프레임마다 쓴다(CSS transition을 쓰지 않는다). */
(function () {
  'use strict';
  var root = document.getElementById('demo');
  if (!root) return;
  var T = JSON.parse(document.getElementById('demo-text').textContent);
  var CAP = 4, nudgeId = 0;
  var LEVELS = [
    { tubes: ['ABA', 'BABC', 'CCCA', 'bB'], min: 3, tip: T.tip1 },
    { tubes: ['AAC', 'BBbB', 'cCCB', 'CAcA', 'cc'], min: 3, tip: T.tip2 }
  ];
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LANG = (document.documentElement.lang || 'ko').slice(0, 2);
  // localization/strings.csv FX_COMPLETE, FX_COMBO. #demo-text에 fxComplete·fxCombo가 있으면 그걸 쓴다.
  var FX_TEXT = { ko: ['완성!', '콤보 x{n}'], en: ['Done!', 'Combo x{n}'], ja: ['完成！', 'コンボ x{n}'] }[LANG] || ['완성!', '콤보 x{n}'];
  if (T.fxComplete) FX_TEXT[0] = T.fxComplete;
  if (T.fxCombo) FX_TEXT[1] = T.fxCombo;

  var board = root.querySelector('.board');
  var layer = root.querySelector('.pieces');
  var nest = root.querySelector('.nest');
  var tipEl = root.querySelector('.demo-tip');
  var countEl = root.querySelector('.demo-count');
  var doneEl = root.querySelector('.demo-done');
  var undoBtn = root.querySelector('[data-act="undo"]');
  var hintBtn = root.querySelector('[data-act="hint"]');
  var restartBtn = root.querySelector('[data-act="restart"]');
  var oldFx = root.querySelector('canvas.fx');
  if (oldFx) oldFx.style.display = 'none'; // 이펙트는 화면 전체 캔버스(아래 fxc)에 그린다

  var lv = 0, state, moves, sel = -1, history, pieces, tubesEl = [], busy = false, saved = 0, total = 0;
  var sealedSeen = {}, completed = 0, live = [], pid = 0, hold = null, skipClick = false;

  /* ── 수학·색 ── */
  var PI = Math.PI, TAU = PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(c) { return '#' + c.map(function (v) { return ('0' + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2); }).join(''); }
  function lighten(h, a) { return hex(rgb(h).map(function (v) { return v + (255 - v) * a; })); } // Godot Color.lightened
  function darken(h, a) { return hex(rgb(h).map(function (v) { return v * (1 - a); })); }       // Godot Color.darkened
  function luminance(h) { var c = rgb(h); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }

  /* Godot Tween 곡선(scene/animation/easing_equations.h). 기본 ease는 IN_OUT이다. */
  var E = {
    linear: function (u) { return u; },
    quadIn: function (u) { return u * u; },
    quadOut: function (u) { return -u * (u - 2); },
    quadInOut: function (u) { var v = u * 2; return v < 1 ? 0.5 * v * v : -0.5 * ((v - 1) * (v - 3) - 1); },
    sineInOut: function (u) { return -0.5 * (Math.cos(PI * u) - 1); },
    backOut: function (u) { var s = 1.70158; u -= 1; return u * u * ((s + 1) * u + s) + 1; },
    elasticOut: function (u) {
      if (u <= 0) return 0;
      if (u >= 1) return 1;
      var p = 0.3, s = p / 4;
      return Math.pow(2, -10 * u) * Math.sin((u - s) * TAU / p) + 1;
    },
    bounceOut: function (u) {
      if (u < 1 / 2.75) return 7.5625 * u * u;
      if (u < 2 / 2.75) { u -= 1.5 / 2.75; return 7.5625 * u * u + 0.75; }
      if (u < 2.5 / 2.75) { u -= 2.25 / 2.75; return 7.5625 * u * u + 0.9375; }
      u -= 2.625 / 2.75; return 7.5625 * u * u + 0.984375;
    }
  };

  /* ── 생물 그림(critter.gd) ── */
  var COLOR = { A: '#E5484D', B: '#3E8BFF', C: '#F5C400', D: '#FF8A1F', E: '#F45FB0', F: '#19C2D6', c: '#B07A4A', b: '#FFE066' };
  var CALM = 'ABCDEF';
  function pts(list) { return list.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' '); }
  function regular(n, r, cx, cy, start) {
    var out = [];
    for (var i = 0; i < n; i++) { var a = start + TAU * i / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return out;
  }
  function starPts(outer, inner, cx, cy) {
    var out = [];
    for (var i = 0; i < 10; i++) { var r = i % 2 ? inner : outer, a = -PI / 2 + PI * i / 5; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return out;
  }
  function face(kind) {
    if (kind === 'b') return '<img src="/img/c-chick.webp" alt="" draggable="false">';
    if (kind === 'c') return '<img src="/img/c-squirrel.webp" alt="" draggable="false">';
    // _draw: 테두리 원(어둡게 0.25) → 몸(0.92r, 0.06r 위) → 하이라이트 → 배 무늬 _draw_belly(종 번호, r*0.2, (0, r*0.45)) → 눈
    var base = COLOR[kind], r = 50, k = CALM.indexOf(kind), br = r * 0.2, by = r * 0.45;
    var ink = luminance(base) > 0.6 ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.75)';
    var belly = k === 0 ? '<circle cy="' + by + '" r="' + br * 0.8 + '" fill="none" stroke="' + ink + '" stroke-width="' + br * 0.35 + '"/>'
      : k === 1 ? '<rect x="' + -br * 0.75 + '" y="' + (by - br * 0.75) + '" width="' + br * 1.5 + '" height="' + br * 1.5 + '" fill="' + ink + '"/>'
      : '<polygon fill="' + ink + '" points="' + pts(k === 2 ? regular(3, br * 1.05, 0, by, -PI / 2) : k === 3 ? regular(4, br, 0, by, -PI / 2)
        : k === 4 ? starPts(br * 1.1, br * 0.48, 0, by) : regular(6, br * 0.95, 0, by, 0)) + '"/>';
    var eyes = '', es = r * 0.19;
    [-1, 1].forEach(function (s) {
      var x = 0.32 * s * r, y = -r * 0.18;
      eyes += '<circle cx="' + x + '" cy="' + y + '" r="' + es + '" fill="#fff"/><circle cx="' + x + '" cy="' + (y + es * 0.15) + '" r="' + es * 0.52 + '" fill="#1D1D2B"/>';
    });
    return '<svg viewBox="-50 -50 100 100" aria-hidden="true" style="overflow:visible">' +
      '<circle r="' + r + '" fill="' + darken(base, 0.25) + '"/><circle cy="' + -r * 0.06 + '" r="' + r * 0.92 + '" fill="' + base + '"/>' +
      '<circle cx="' + -r * 0.34 + '" cy="' + -r * 0.42 + '" r="' + r * 0.18 + '" fill="#fff" fill-opacity=".25"/>' + belly + eyes + '</svg>';
  }

  /* ── 소리(sfx.gd를 WebAudio로) ── */
  var RATE = 22050, actx = null, master = null, buffers = {}, soundOn = true, hapticsOn = true;
  var PENTATONIC = [1.0, 1.125, 1.25, 1.5, 1.667, 2.0, 2.25, 2.5];
  try { soundOn = localStorage.getItem('cr-demo-sound') !== '0'; hapticsOn = localStorage.getItem('cr-demo-haptics') !== '0'; } catch (e) {}
  var seed = 7;
  function rng() { // 잡음을 늘 같게(게임도 시드 7로 고정)
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function tone(dur, f0, f1, wave, decay, noise, vibrato, gain) {
    noise = noise || 0; vibrato = vibrato || 0; gain = gain == null ? 0.6 : gain;
    var n = Math.floor(dur * RATE), out = new Float32Array(n), phase = 0;
    for (var i = 0; i < n; i++) {
      var t = i / RATE, u = i / n;
      var f = f0 * Math.pow(f1 / f0, u) * (1 + vibrato * Math.sin(TAU * 11 * t));
      phase = (phase + TAU * f / RATE) % TAU;
      var s = wave === 'square' ? (phase < PI ? 1 : -1) : wave === 'triangle' ? 2 * Math.abs(phase / PI - 1) - 1 : Math.sin(phase);
      if (noise > 0) s += (rng() * 2 - 1) * noise;
      out[i] = s * Math.min(1, t / 0.004) * Math.pow(1 - u, decay) * gain;
    }
    return out;
  }
  function noiseSweep(dur) { // 바람 소리
    var n = Math.floor(dur * RATE), out = new Float32Array(n), low = 0;
    for (var i = 0; i < n; i++) {
      var u = i / n, cutoff = 0.05 + (0.35 - 0.05) * Math.sin(PI * u);
      low += (rng() * 2 - 1 - low) * cutoff;
      out[i] = low * Math.sin(PI * u) * 0.9;
    }
    return out;
  }
  function chirp() { // 병아리 삐약 두 번
    var n = Math.floor(0.26 * RATE), out = new Float32Array(n), phase = 0;
    for (var i = 0; i < n; i++) {
      var t = i / RATE, local = (t % 0.13) / 0.13;
      var f = 2600 + 1400 * Math.sin(PI * local) - 900 * local;
      phase = (phase + TAU * f / RATE) % TAU;
      out[i] = Math.sin(phase) * Math.min(1, local / 0.05) * Math.pow(1 - local, 2) * 0.45;
    }
    return out;
  }
  function bell(ratios, step, length) { // 종소리·팡파레(G5 기준)
    var base = 784, n = Math.floor((step * (ratios.length - 1) + length) * RATE), out = new Float32Array(n);
    for (var k = 0; k < ratios.length; k++) {
      var start = Math.floor(step * k * RATE), f = base * ratios[k], end = Math.min(n, start + Math.floor(length * RATE));
      for (var i = start; i < end; i++) {
        var t = (i - start) / RATE, env = Math.min(1, t / 0.003) * Math.exp(-t * 5);
        out[i] += (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2 * t) + 0.12 * Math.sin(TAU * f * 3 * t)) * env * 0.32;
      }
    }
    return out;
  }
  function buildSounds() {
    var raw = {
      select: tone(0.07, 520, 860, 'sine', 3),
      land: tone(0.08, 620, 300, 'triangle', 3.5, 0.04),
      pop: tone(0.1, 900, 380, 'sine', 3, 0.06),
      buzz: tone(0.18, 150, 120, 'square', 1.5, 0, 0, 0.35),
      squeak: tone(0.09, 1500, 2400, 'sine', 2),
      whoosh: noiseSweep(0.38),
      tick: tone(0.035, 1900, 1500, 'square', 6, 0, 0, 0.25),
      undo: tone(0.14, 880, 380, 'triangle', 2),
      chime: bell([1.0], 0, 0.7),
      fanfare: bell([1.0, 1.25, 1.5, 2.0], 0.11, 0.9),
      tweet: chirp()
    };
    Object.keys(raw).forEach(function (name) {
      var data = raw[name], buf = actx.createBuffer(1, data.length, RATE), ch = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) ch[i] = clamp(data[i], -1, 1);
      buffers[name] = buf;
    });
  }
  // 브라우저는 손으로 누른 뒤에만 소리를 낸다. 첫 pointerdown에서 만든다.
  function unlockAudio() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !soundOn) return;
    try { actx = new AC(); } catch (e) { return; }
    master = actx.createGain(); master.gain.value = 0.9; master.connect(actx.destination);
    buildSounds();
  }
  function play(name, pitch, db) {
    if (!soundOn || !actx || !buffers[name]) return;
    var src = actx.createBufferSource(), g = actx.createGain();
    src.buffer = buffers[name]; src.playbackRate.value = pitch || 1; // Godot pitch_scale처럼 빠르기와 음높이가 같이 바뀐다
    g.gain.value = Math.pow(10, (db || 0) / 20);
    src.connect(g); g.connect(master); src.start();
  }
  function chime(step) { play('chime', PENTATONIC[clamp(step, 0, PENTATONIC.length - 1)]); }
  function haptic(ms) { if (hapticsOn && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

  /* ── 트윈: Godot Tween처럼 시작할 때 값을 잡고, 같은 key의 새 트윈이 오면 옛것은 멈춘다 ── */
  var tweens = [], clock = 0;
  function tween(dur, ease, fn, delay, key) {
    return new Promise(function (resolve) {
      if (key) tweens.forEach(function (w) { if (w.key === key && !w.done) { w.done = true; w.resolve(); } });
      if (reduce) { dur = 0.001; delay = 0; }
      tweens.push({ start: clock + (delay || 0), dur: Math.max(0.001, dur), ease: ease, fn: fn, resolve: resolve, key: key, done: false });
      wake();
    });
  }
  function prop(obj, to, dur, ease, delay, key) {
    var from = null;
    return tween(dur, ease, function (v) {
      if (!from) { from = {}; for (var k in to) from[k] = obj[k]; }
      for (var k2 in to) obj[k2] = from[k2] + (to[k2] - from[k2]) * v;
    }, delay, key);
  }
  function wait(sec) { return tween(sec, E.linear, function () {}); }

  /* ── 판 크기(board_view.gd _layout): 튜브 폭 1.3d, 간격 0.38d, 생물 지름 0.88d, 튜브 높이 d*(칸 4 + 0.3) ── */
  var MAX_D = 60, d = 60, S = d / 165, M = {};
  function measure() {
    var n = state.length, avail = Math.min(root.clientWidth, 460);
    d = clamp(avail * 0.98 / (n * 1.3 + (n - 1) * 0.38), 30, MAX_D);
    S = d / 165;
    M = { tw: Math.round(d * 1.3), pw: Math.round(d * 0.88), th: Math.round(d * (CAP + 0.3)), gap: Math.round(d * 0.38) };
    board.style.setProperty('--tw', M.tw + 'px'); board.style.setProperty('--pw', M.pw + 'px');
    board.style.setProperty('--th', M.th + 'px'); board.style.setProperty('--gap', M.gap + 'px');
    board.style.paddingTop = Math.round(d * 0.8) + 'px'; // 게임은 튜브 위에 1.05d를 비운다(들어 올린 친구·넘어가는 친구 자리)
  }
  // 조각 자리: .pieces 기준 왼쪽 위 좌표
  function slotPos(t, k) { var el = tubesEl[t]; return { x: el.offsetLeft + (M.tw - M.pw) / 2, y: el.offsetTop + M.th - d * (0.15 + k + 0.5) - M.pw / 2 }; }
  function abovePos(t) { var el = tubesEl[t]; return { x: el.offsetLeft + (M.tw - M.pw) / 2, y: el.offsetTop - d * 0.6 - M.pw / 2 }; }
  // 고른 튜브는 맨 위 같은 친구 묶음을 튜브 입구 위로 들어 올린다(_rest_pos)
  function restPos(t, k) {
    var p = slotPos(t, k), s = state[t];
    if (t === sel && !sealed(s) && k >= s.length - topRun(s)) p.y += abovePos(t).y - slotPos(t, s.length - 1).y;
    return p;
  }
  // 이펙트 좌표(문서 기준: 스크롤해도 판과 같이 움직인다)
  function origin() { var r = layer.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY }; }
  function centerOf(p) { var o = origin(); return { x: o.x + p.x + M.pw / 2, y: o.y + p.y + M.pw / 2 - p.bounce }; }
  function posCenter(q) { var o = origin(); return { x: o.x + q.x + M.pw / 2, y: o.y + q.y + M.pw / 2 }; }
  function docRect(el) { var r = el.getBoundingClientRect(); return { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height }; }

  /* ── 조각: 위치·눌림(squash)·폴짝(bounce)·크기를 한 transform으로 ── */
  function newPiece(kind, t, k) {
    var el = document.createElement('div');
    el.className = 'pc'; el.innerHTML = face(kind);
    layer.appendChild(el);
    var q = restPos(t, k);
    var p = { id: ++pid, kind: kind, el: el, x: q.x, y: q.y, sx: 1, sy: 1, k: 1, bounce: 0, phase: Math.random() * TAU, tf: '', jumpId: 0 };
    live.push(p);
    drawPiece(p);
    return p;
  }
  function killPiece(p) { p.dead = true; p.el.remove(); }
  function drawPiece(p) {
    var sx = p.sx * p.k, sy = p.sy * p.k, rot = 0;
    if (!reduce) {
      if (p.kind === 'c') { var b = 0.04 * Math.sin(clock * 3.4 + p.phase); sx *= 1 + b; sy *= 1 - b; } // 능력 생물은 숨쉰다
      else if (p.kind === 'b') rot = Math.sin(clock * 9 + p.phase) * 0.07;                           // 병아리는 바들바들
    }
    var tf = 'translate(' + p.x.toFixed(2) + 'px,' + (p.y - p.bounce).toFixed(2) + 'px)' +
      (rot ? ' rotate(' + rot.toFixed(4) + 'rad)' : '') + (sx !== 1 || sy !== 1 ? ' scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')' : '');
    if (tf !== p.tf) { p.el.style.transform = tf; p.tf = tf; }
  }
  // 몸이 눌렸다가 탄성 있게 펴진다(0.32초, ELASTIC OUT)
  function squash(p, sx, sy) {
    p.sx = sx; p.sy = sy;
    return prop(p, { sx: 1, sy: 1 }, 0.32, E.elasticOut, 0, 's' + p.id);
  }
  // 제자리 폴짝: 0.16초 올라가고(QUAD OUT) 0.22초 통통 내려온다(BOUNCE OUT)
  function jump(p, delay, height) {
    var id = ++p.jumpId;
    return prop(p, { bounce: height }, 0.16, E.quadOut, delay, 'j' + p.id).then(function () {
      if (id === p.jumpId) return prop(p, { bounce: 0 }, 0.22, E.bounceOut, 0, 'j' + p.id);
    });
  }
  // 모든 조각을 제자리로(0.1초, QUAD OUT). 늘 duration만큼 걸린다.
  function settle(dur) {
    var all = [wait(dur)];
    for (var t = 0; t < pieces.length; t++) for (var k = 0; k < pieces[t].length; k++) {
      var p = pieces[t][k], q = restPos(t, k);
      if (dist(p, q) > 0.5) all.push(prop(p, { x: q.x, y: q.y }, dur, E.quadOut, 0, 'm' + p.id));
    }
    return Promise.all(all);
  }
  // 지금 자리 → exit까지 곧게 → exit에서 entry로 호 → end로 내려간다. 걸리는 시간은 거리로(0.2~0.55초), 전체에 SINE IN_OUT.
  function travel(p, exit, entry, end, delay, pace, height) {
    var s = { x: p.x, y: p.y }, c = { x: (exit.x + entry.x) / 2, y: Math.min(exit.y, entry.y) - height };
    var d1 = dist(s, exit), d2 = dist(exit, entry) + height * 0.6, d3 = dist(entry, end), all = d1 + d2 + d3;
    var A = d1 / all, B = (d1 + d2) / all;
    var dur = clamp(0.14 + all / (d * 24), 0.2, 0.55) / pace;
    var done = tween(dur, E.sineInOut, function (t) {
      var u;
      if (t < A) { u = t / A; p.x = s.x + (exit.x - s.x) * u; p.y = s.y + (exit.y - s.y) * u; }
      else if (t < B || B >= 1) {
        u = clamp((t - A) / (B - A), 0, 1);
        var ax = exit.x + (c.x - exit.x) * u, ay = exit.y + (c.y - exit.y) * u, bx = c.x + (entry.x - c.x) * u, by = c.y + (entry.y - c.y) * u;
        p.x = ax + (bx - ax) * u; p.y = ay + (by - ay) * u;
      } else { u = (t - B) / (1 - B); p.x = entry.x + (end.x - entry.x) * u; p.y = entry.y + (end.y - entry.y) * u; }
    }, delay, 'm' + p.id);
    return { done: done, arrive: delay + dur };
  }

  /* ── 이펙트 캔버스(fx_layer.gd): 화면 전체에 덮고 누르기는 통과 ── */
  var SH = { DOT: 0, STAR: 1, CONFETTI: 2, BUBBLE: 3, LEAF: 4, DROP: 5, SPARK: 6, HEART: 7 };
  var fxc = document.createElement('canvas');
  fxc.setAttribute('aria-hidden', 'true');
  fxc.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:60';
  document.body.appendChild(fxc);
  var ctx = fxc.getContext('2d'), dpr = 1, fxW = 0, fxH = 0, parts = [], rings = [], texts = [], drewFx = false;
  var fontFamily = getComputedStyle(root).fontFamily || 'sans-serif';
  function sizeFx() {
    dpr = Math.min(2, devicePixelRatio || 1); fxW = fxc.clientWidth; fxH = fxc.clientHeight;
    fxc.width = Math.round(fxW * dpr); fxc.height = Math.round(fxH * dpr);
  }
  sizeFx();
  // 한 점에서 흩뿌린다: direction 쪽으로 spread 각도 안에서. 속도는 0.35~1배, 수명 0.7~1.25배, 크기 0.6~1.3배, 색은 0~0.3만큼 밝게.
  function burst(pos, color, count, speed, shape, size, gravity, life, spread, dir) {
    if (reduce) return;
    spread = spread == null ? TAU : spread; dir = dir == null ? -PI / 2 : dir;
    for (var i = 0; i < count; i++) {
      var a = dir + rnd(-spread / 2, spread / 2), v = speed * rnd(0.35, 1), ml = life * rnd(0.7, 1.25);
      parts.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: ml, max: ml, size: size * rnd(0.6, 1.3),
        color: lighten(color, rnd(0, 0.3)), shape: shape, rot: Math.random() * TAU, spin: rnd(-9, 9), g: gravity });
    }
    wake();
  }
  function confettiRain(left, width, top, colors, count) {
    for (var i = 0; i < count; i++) {
      burst({ x: rnd(left, left + width), y: top + rnd(-40, 40) * S }, colors[i % colors.length], 1, 420 * S, SH.CONFETTI, 18 * S, 520 * S, 2.2, PI * 0.8, PI / 2);
    }
  }
  function ring(pos, color, radius, life, width) { if (!reduce) { rings.push({ x: pos.x, y: pos.y, r: radius, life: life, max: life, color: color, w: width }); wake(); } }
  // 글자가 톡 튀어나와(0.3→1배, 0.22초 BACK OUT) 떠오르며(QUAD OUT) 마지막 40%에 사라진다
  function floatText(pos, text, color, size, rise, life) {
    if (reduce) return;
    texts.push({ x: pos.x, y: pos.y, text: text, color: color, size: size, rise: rise == null ? 150 * S : rise, life: life || 1, age: 0 });
    wake();
  }
  var shk = { time: 0, dur: 0, str: 0 };
  function shake(strength, duration) {
    if (reduce) return;
    shk.str = Math.max(shk.time > 0 ? shk.str : 0, strength); shk.dur = Math.max(duration, shk.time); shk.time = shk.dur; wake();
  }
  function drawParticle(p) {
    var t = p.life / p.max, s = p.size * (0.4 + 0.6 * t), i;
    ctx.globalAlpha = clamp(t * 1.6, 0, 1);
    ctx.fillStyle = ctx.strokeStyle = p.color;
    switch (p.shape) {
      case SH.DOT: ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.5, 0, TAU); ctx.fill(); break;
      case SH.STAR:
        ctx.beginPath();
        for (i = 0; i < 10; i++) { var rr = (i % 2 ? s * 0.45 : s) * 0.5, a = p.rot + PI * i / 5; ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); }
        ctx.fill(); break;
      case SH.CONFETTI:
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(p.rot * 1.7)) * 0.8 + 0.2);
        ctx.fillRect(-s * 0.5, -s * 0.3, s, s * 0.6); ctx.restore(); break;
      case SH.BUBBLE:
        ctx.lineWidth = Math.max(1, s * 0.12); ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.5, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x - s * 0.15, p.y - s * 0.15, s * 0.1, 0, TAU); ctx.fill(); break;
      case SH.LEAF:
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.5);
        ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.fill(); ctx.restore(); break;
      case SH.DROP:
        var len = Math.hypot(p.vx, p.vy), dx = len > 1 ? p.vx / len : 0, dy = len > 1 ? p.vy / len : 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(p.x + dy * s * 0.38, p.y - dx * s * 0.38); ctx.lineTo(p.x - dy * s * 0.38, p.y + dx * s * 0.38);
        ctx.lineTo(p.x - dx * s * 0.9, p.y - dy * s * 0.9); ctx.fill(); break;
      case SH.SPARK:
        ctx.lineWidth = Math.max(1, s * 0.25); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke(); break;
      case SH.HEART: // 하트는 돌리지 않고 살짝만 기울인다
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.rot) * 0.3);
        ctx.beginPath(); ctx.arc(-s * 0.22, -s * 0.1, s * 0.27, 0, TAU); ctx.arc(s * 0.22, -s * 0.1, s * 0.27, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-s * 0.47, 0); ctx.lineTo(s * 0.47, 0); ctx.lineTo(0, s * 0.5); ctx.fill(); ctx.restore(); break;
    }
  }
  function drawFx(dt) {
    if (fxc.clientWidth !== fxW || fxc.clientHeight !== fxH) sizeFx();
    var any = parts.length || rings.length || texts.length || hold;
    if (!any && !drewFx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, fxc.width, fxc.height);
    drewFx = !!any;
    if (!any) return;
    ctx.setTransform(dpr, 0, 0, dpr, -scrollX * dpr, -scrollY * dpr);
    var keep = [];
    rings.forEach(function (r) {
      r.life -= dt; if (r.life <= 0) return; keep.push(r);
      var u = 1 - r.life / r.max;
      ctx.globalAlpha = 1 - u; ctx.strokeStyle = r.color; ctx.lineWidth = r.w * (1 - u * 0.6);
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (1 - Math.pow(1 - u, 2.5)), 0, TAU); ctx.stroke(); // Godot ease(u, 0.4)
    });
    rings = keep; keep = [];
    parts.forEach(function (p) {
      p.life -= dt; if (p.life <= 0) return; keep.push(p);
      var f = Math.max(0, 1 - 1.5 * dt); // drag 1.5
      p.vx *= f; p.vy *= f; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      drawParticle(p);
    });
    parts = keep; keep = [];
    texts.forEach(function (x) {
      x.age += dt; if (x.age >= x.life) return; keep.push(x);
      var sc = 0.3 + 0.7 * E.backOut(Math.min(1, x.age / 0.22)), y = x.y - x.rise * E.quadOut(Math.min(1, x.age / x.life));
      ctx.globalAlpha = x.age < x.life * 0.6 ? 1 : 1 - (x.age - x.life * 0.6) / (x.life * 0.4);
      ctx.save(); ctx.translate(x.x, y); ctx.scale(sc, sc);
      ctx.font = '800 ' + x.size + 'px ' + fontFamily; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(6 * S, x.size / 5); ctx.strokeStyle = 'rgba(13,15,31,.9)';
      ctx.strokeText(x.text, 0, 0); ctx.fillStyle = x.color; ctx.fillText(x.text, 0, 0); ctx.restore();
    });
    texts = keep;
    if (hold) { // 꾹 누르는 동안 생물 둘레에 게이지가 차오른다(_draw_hold_ring)
      var c = centerOf(hold.p), r = d * 0.44 * 1.3, fill = clamp(hold.time / 0.38, 0, 1);
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = d * 0.07; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = lighten(COLOR[hold.p.kind], 0.45); ctx.lineWidth = d * 0.09;
      ctx.beginPath(); ctx.arc(c.x, c.y, r, -PI / 2, -PI / 2 + TAU * fill); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ── 프레임 ── */
  var raf = 0, last = 0, visible = true;
  function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    var active = tweens; tweens = [];
    for (var i = 0; i < active.length; i++) {
      var w = active[i];
      if (w.done) continue;
      var u = (clock - w.start) / w.dur;
      if (u < 0) { tweens.push(w); continue; }
      if (u >= 1) { w.done = true; w.fn(1); w.resolve(); continue; }
      w.fn(w.ease(u)); tweens.push(w);
    }
    if (hold && !hold.fired) {
      hold.time += dt;
      if (hold.time >= 0.38) { var h = hold; hold = null; h.fired = true; skipClick = true; fireHold(h); }
    }
    if (shk.time > 0) {
      shk.time -= dt;
      var pw = shk.str * Math.max(0, shk.time / shk.dur);
      root.style.translate = shk.time > 0 ? rnd(-1, 1) * pw + 'px ' + rnd(-1, 1) * pw + 'px' : '';
    }
    live = live.filter(function (p) { return !p.dead; });
    live.forEach(drawPiece);
    drawFx(dt);
    var breathing = visible && !reduce && !document.hidden && live.some(function (p) { return p.kind === 'c' || p.kind === 'b'; });
    if (tweens.length || parts.length || rings.length || texts.length || shk.time > 0 || hold || drewFx || breathing) wake();
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) wake(); }).observe(root);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });

  /* ── 규칙(기존 demo.js 그대로: games/sort-puzzle/scripts/core/sort_rules.gd) ── */
  function top(t) { return t ? t[t.length - 1] : ''; }
  function topRun(t) { var n = t.length, j = n - 2; if (!n) return 0; while (j >= 0 && t[j] === t[n - 1]) j--; return n - 1 - j; }
  function sealed(t) { if (t.length !== CAP) return false; for (var i = 1; i < t.length; i++) if (t[i] !== t[0]) return false; return true; }
  function canPour(s, a, b) { var A = s[a], B = s[b]; return a !== b && A && !sealed(A) && B.length < CAP && (!B || top(A) === top(B)); }
  function canClimb(s, t, k) { var A = s[t]; return !sealed(A) && A[k] === 'c' && k < A.length - 1 && A.slice(k + 1).replace(/c/g, '') !== ''; }
  function apply(s, m) {
    var n = s.slice(), A = s[m.t];
    if (m.type === 'pour') {
      var B = s[m.to], c = Math.min(topRun(A), CAP - B.length);
      n[m.t] = A.slice(0, A.length - c); n[m.to] = B + new Array(c + 1).join(top(A));
    } else {
      n[m.t] = A.slice(0, m.k) + A.slice(m.k + 1) + 'c';
    }
    return n;
  }
  function release(s) { var out = [], n = s.slice(); for (var i = 0; i < n.length; i++) while (top(n[i]) === 'b') { n[i] = n[i].slice(0, -1); out.push(i); } return { s: n, freed: out }; }
  function hasBaby(s) { return s.join('').indexOf('b') >= 0; }
  function legal(s) {
    var out = [];
    for (var a = 0; a < s.length; a++) {
      for (var b = 0; b < s.length; b++) if (canPour(s, a, b)) out.push({ type: 'pour', t: a, to: b });
      for (var k = 0; k < s[a].length; k++) if (canClimb(s, a, k)) out.push({ type: 'climb', t: a, k: k });
    }
    return out;
  }
  function solve(s) { // 가장 적은 수의 다음 한 수 (힌트)
    var start = s.join('|'), q = [[s, null]], seen = {}; seen[start] = 1;
    for (var i = 0; i < q.length && i < 20000; i++) {
      var cur = q[i][0], first = q[i][1], ms = legal(cur);
      for (var j = 0; j < ms.length; j++) {
        var nx = release(apply(cur, ms[j])).s, key = nx.join('|');
        if (seen[key]) continue; seen[key] = 1;
        var f = first || ms[j];
        if (!hasBaby(nx)) return f;
        q.push([nx, f]);
      }
    }
    return null;
  }
  // star_row.gd: 최소 이동이면 별 셋, 조금 넘으면 둘, 그 밖에는 하나
  function starsFor(n, min) { return n <= min ? 3 : n <= min + Math.max(2, Math.ceil(min * 0.25)) ? 2 : 1; }

  /* ── 판 만들기 ── */
  var css = document.createElement('style');
  css.textContent = '#demo .pc{transition:none!important}' +
    '#demo .nest-slot[data-full]::after{scale:var(--sx,1) var(--sy,1)}' +
    '#demo .cr-lid{position:absolute;pointer-events:none;border-radius:3px}' +
    '#demo .cr-stars{display:flex;justify-content:center;gap:4px;height:46px;margin:8px 0 0}' +
    '#demo .cr-stars svg{width:46px;height:46px;overflow:visible;scale:0}';
  document.head.appendChild(css);

  function nameOf(k) { return T.names[k]; }
  function labelTube(t) {
    var s = state[t];
    var who = s ? s.split('').map(nameOf).join(', ') : T.empty;
    tubesEl[t].setAttribute('aria-label', T.tube.replace('{n}', t + 1) + ' — ' + who);
  }
  function refresh() {
    for (var t = 0; t < tubesEl.length; t++) {
      tubesEl[t].classList.toggle('is-sel', sel === t);
      tubesEl[t].classList.toggle('is-sealed', sealed(state[t]));
      labelTube(t);
    }
  }
  function addLid(t, animate) { // 다 모은 튜브에 뚜껑(_draw_tube). 처음 닫힐 때는 1.4d 위에서 떨어져 쾅(0.45초 BOUNCE OUT)
    var color = lighten(COLOR[state[t][0]], 0.15), lid = document.createElement('i');
    lid.className = 'cr-lid';
    lid.style.cssText = 'left:' + -d * 0.08 + 'px;top:' + -d * 0.22 + 'px;width:' + (M.tw + d * 0.16) + 'px;height:' + d * 0.26 + 'px;' +
      'background:linear-gradient(' + color + ' 60%,' + darken(color, 0.25) + ' 60%)';
    tubesEl[t].appendChild(lid);
    if (animate) tween(0.45, E.bounceOut, function (v) { var drop = 1 - v; lid.style.translate = '0 ' + (-drop * d * 1.4) + 'px'; lid.style.opacity = 1 - drop * 0.5; });
  }
  function build() {
    board.querySelectorAll('.tube').forEach(function (b) { b.remove(); });
    live.forEach(killPiece); live = [];
    layer.innerHTML = ''; nest.innerHTML = '';
    tubesEl = []; pieces = []; sealedSeen = {};
    measure();
    for (var t = 0; t < state.length; t++) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tube'; b.dataset.t = t;
      board.insertBefore(b, layer);
      tubesEl.push(b);
    }
    for (t = 0; t < state.length; t++) {
      var col = [];
      for (var i = 0; i < state[t].length; i++) col.push(newPiece(state[t][i], t, i));
      pieces.push(col);
      if (sealed(state[t])) { sealedSeen[t] = 1; addLid(t, false); }
    }
    completed = Object.keys(sealedSeen).length;
    total = LEVELS[lv].tubes.join('').split('b').length - 1;
    for (var k = 0; k < total; k++) {
      var slot = document.createElement('span'); slot.className = 'nest-slot'; nest.appendChild(slot);
    }
    refresh();
    wake();
  }
  function setTip(s) { tipEl.textContent = s; }
  function setCount() { countEl.textContent = T.count.replace('{n}', moves).replace('{min}', LEVELS[lv].min); }

  function start(i) {
    lv = i; state = LEVELS[lv].tubes.slice(); moves = 0; sel = -1; history = []; saved = 0; busy = false; hold = null;
    doneEl.hidden = true; root.classList.remove('is-done');
    build(); setTip(LEVELS[lv].tip); setCount(); clearHint(); undoBtn.disabled = true;
    if (lv === 0) nudgeId = setTimeout(function () {
      var m = solve(state); if (m && m.type === 'pour' && sel < 0 && !moves) tubesEl[m.t].classList.add('is-nudge');
    }, 5000);
  }

  /* ── 손 ── */
  function clearHint() {
    root.querySelectorAll('.is-hint').forEach(function (e) { e.classList.remove('is-hint'); e.removeAttribute('data-hint'); });
    root.querySelectorAll('.is-nudge').forEach(function (e) { e.classList.remove('is-nudge'); });
    clearTimeout(nudgeId);
    root.querySelectorAll('.is-hintpc').forEach(function (e) { e.classList.remove('is-hintpc'); });
  }
  // 고르기: 맨 위 묶음이 입구 위로 올라가며 세로로 늘어났다 펴진다. 음은 튜브가 찰수록 조금 높게.
  function selectTube(t) {
    sel = t;
    var s = state[t];
    play('select', 0.9 + 0.05 * s.length); haptic(8);
    pieces[t].slice(s.length - topRun(s)).forEach(function (p) { squash(p, 0.82, 1.2); });
    settle(0.1); refresh();
  }
  // 내려놓기(같은 튜브를 다시 누르거나 빈 곳): 0.1초 뒤 내려앉으며 눌리고, 먼지 4개, 낮은 착지음, 짧은 진동
  function putBack() {
    var i = sel;
    if (i < 0) return;
    var s = state[i], lifted = pieces[i].slice(s.length - topRun(s));
    sel = -1; settle(0.1); refresh();
    wait(0.1).then(function () {
      lifted.forEach(function (p) { if (!p.dead) squash(p, 1.18, 0.82); });
      if (lifted[0] && !lifted[0].dead) {
        var c = centerOf(lifted[0]);
        burst({ x: c.x, y: c.y + d * 0.44 * 0.85 }, lighten(COLOR[lifted[0].kind], 0.4), 4, d * 1.6, SH.DOT, d * 0.1, 200 * S, 0.3, PI * 0.9, -PI / 2);
      }
      play('land', 0.8 + 0.04 * s.length, -3); haptic(10);
    });
  }
  // 안 되는 수: 붉은 테두리가 0.3초에 걸쳐 빠지고, 안의 친구들이 좌우로 3번 흔들린다(줄어들며). 진동은 없다(게임과 같게).
  function shakeTube(t) {
    busy = true;
    play('buzz', 1, -6);
    var list = pieces[t].slice(), bases = list.map(function (p) { return p.x; }), el = tubesEl[t];
    return tween(0.3, E.linear, function (u) {
      var f = 1 - u, dx = Math.sin(u * TAU * 3) * d * 0.12 * f;
      list.forEach(function (p, k) { p.x = bases[k] + dx; });
      el.style.boxShadow = 'inset 0 0 0 ' + (2 + d * 0.05 * f).toFixed(1) + 'px rgba(' + Math.round(232 + 23 * f) + ',' + Math.round(236 - 159 * f) + ',' +
        Math.round(248 - 154 * f) + ',' + (0.42 + 0.58 * f).toFixed(3) + ')';
    }, 0, 'shake' + t).then(function () {
      el.style.boxShadow = '';
      return settle(0.1);
    }).then(function () { busy = false; });
  }
  function tap(t) {
    if (busy) return;
    if (t < 0) { if (sel >= 0) { putBack(); setTip(T.go); } return; }
    if (sel < 0) {
      if (!state[t] || sealed(state[t])) { shakeTube(t); return; }
      clearHint(); selectTube(t); setTip(T.pick); return;
    }
    if (sel === t) { putBack(); setTip(T.go); return; }
    if (canPour(state, sel, t)) { doMove({ type: 'pour', t: sel, to: t }); return; }
    var why = sealed(state[t]) ? T.cantSealed : state[t].length >= CAP ? T.cantFull : T.cant;
    var from = sel;
    sel = -1; refresh(); setTip(why);
    shakeTube(from); // 게임은 들고 있던 튜브를 흔든 뒤 내려놓는다(reject(move.y))
  }

  /* ── 한 수 ── */
  function doMove(m) {
    clearHint();
    history.push({ state: state.slice(), moves: moves, saved: saved });
    undoBtn.disabled = false;
    busy = true;
    var before = state;
    state = apply(state, m); sel = -1; moves++;
    setCount(); refresh();
    var anim = m.type === 'pour' ? animatePour(m.t, m.to, Math.min(topRun(before[m.t]), CAP - before[m.to].length)) : animateClimb(m.t, m.k);
    var freedAny = false;
    anim.then(function () {
      var n = checkCompletions();
      if (n >= 2) combo(n);
      var r = release(state);
      if (!r.freed.length) return;
      freedAny = true;
      state = r.s;
      setTip(T.saved);
      var order = [], counts = {};
      r.freed.forEach(function (t) { if (!counts[t]) { counts[t] = 0; order.push(t); } counts[t]++; });
      return order.reduce(function (pr, t) { return pr.then(function () { return animateRescue(t, counts[t]); }); }, Promise.resolve());
    }).then(function () {
      return settle(0.1);
    }).then(function () {
      refresh();
      if (!hasBaby(state)) { win(); return; }
      busy = false;
      if (!freedAny) setTip(T.go);
    });
  }
  // 붓기: '퐁' 하고, 맨 위부터 0.05초 간격으로 출발해 입구 위로 → 호를 그리며 넘어가 → 내려앉는다
  function animatePour(from, to, count) {
    var src = pieces[from], dst = pieces[to], exit = abovePos(from), entry = abovePos(to), waits = [];
    play('pop', 1.1);
    for (var m = 0; m < count; m++) {
      var p = src.pop();
      dst.push(p);
      p.el.style.zIndex = 5;
      var tr = travel(p, exit, entry, slotPos(to, dst.length - 1), m * 0.05, 1, d * 0.8);
      waits.push(tr.done.then(onLand.bind(null, p, m)));
    }
    // 자리가 모자라 못 간 친구는 제자리로 내려간다
    src.forEach(function (p, k) { var q = slotPos(from, k); if (dist(p, q) > 0.5) waits.push(prop(p, { x: q.x, y: q.y }, 0.14, E.quadIn, 0.06, 'm' + p.id)); });
    return Promise.all(waits);
  }
  // 착지: 납작하게 눌렸다 펴지고(1.28×0.72), 발밑에서 먼지 6개, 착지음은 뒤로 갈수록 조금씩 높게
  function onLand(p, order) {
    p.el.style.zIndex = '';
    squash(p, 1.28, 0.72);
    var c = centerOf(p);
    burst({ x: c.x, y: c.y + d * 0.44 * 0.85 }, lighten(COLOR[p.kind], 0.4), 6, d * 2.4, SH.DOT, d * 0.12, 260 * S, 0.35, PI * 0.9, -PI / 2);
    play('land', 0.95 + order * 0.08);
  }
  // 다람쥐 등반(_animate_shift "climb"): 옆으로 헤엄치듯 비켜 오르며 나뭇잎을 흘리고, 나머지는 한 칸씩 내려앉는다
  function animateClimb(t, k) {
    var list = pieces[t], mover = list.splice(k, 1)[0];
    list.push(mover);
    var toK = list.length - 1, start = { x: mover.x, y: mover.y }, end = slotPos(t, toK), swim = d * 0.5, leaf = '#7BC96F';
    var dur = 0.22 + 0.06 * Math.abs(k - toK), waits = [];
    play('squeak', 0.95 + Math.random() * 0.1);
    mover.el.style.zIndex = 5;
    waits.push(tween(dur, E.sineInOut, function (u) {
      mover.x = start.x + (end.x - start.x) * u + swim * Math.sin(PI * u);
      mover.y = start.y + (end.y - start.y) * u;
      if (Math.random() < 0.35) burst(centerOf(mover), leaf, 1, d, SH.LEAF, d * 0.22, 200 * S, 0.6);
    }, 0, 'm' + mover.id));
    list.forEach(function (p, j) { if (p !== mover) { var q = slotPos(t, j); waits.push(prop(p, { x: q.x, y: q.y }, dur * 0.8, E.quadInOut, dur * 0.15, 'm' + p.id)); } });
    return Promise.all(waits).then(function () {
      mover.el.style.zIndex = '';
      squash(mover, 0.78, 1.25);
      burst(centerOf(mover), leaf, 8, d * 2.5, SH.LEAF, d * 0.25, 300 * S, 0.6);
      play('land', 1.3);
    });
  }
  // 병아리 구출: 삐약, 하트 12개가 떠오르고 노란 고리, 병아리는 폴짝 올라 호를 그리며 둥지로(0.12초 간격, 0.85배로 줄며)
  function nestTarget(i) {
    var slot = nest.children[i], o = layer.getBoundingClientRect();
    if (!slot) return abovePos(0);
    var r = slot.getBoundingClientRect();
    return { x: r.left + r.width / 2 - o.left - M.pw / 2, y: r.bottom - 28 - o.top - M.pw / 2 };
  }
  function animateRescue(t, count) {
    var list = pieces[t], topAt = abovePos(t), waits = [];
    play('tweet', 1 + Math.random() * 0.1);
    burst(posCenter(topAt), '#FF7AA2', 12, d * 4, SH.HEART, d * 0.3, -150 * S, 0.9);
    if (list.length) ring(centerOf(list[list.length - 1]), '#FFE066', d * 1.6, 0.4, d * 0.08);
    for (var m = 0; m < count; m++) {
      var chick = list.pop(), slotIndex = saved + m, target = nestTarget(slotIndex);
      chick.el.style.zIndex = 20;
      var tr = travel(chick, topAt, target, target, m * 0.12, 0.7, d * 1.4);
      prop(chick, { k: 0.85 }, tr.arrive, E.linear, m * 0.12, 'k' + chick.id);
      waits.push(tr.done.then(chickHome.bind(null, chick, slotIndex)));
    }
    return Promise.all(waits);
  }
  // 둥지 도착(nest_view.gd fill): 납작했다(1.4×0.6) 탄성 있게 펴지고 하트(마지막 자리는 더 많이)·고리, 삐약은 찰수록 높게, 진동 20ms
  function chickHome(chick, i) {
    killPiece(chick);
    var slot = nest.children[i];
    if (!slot) return;
    slot.dataset.full = '1';
    tween(0.4, E.elasticOut, function (v) {
      slot.style.setProperty('--sx', (1.4 - 0.4 * v).toFixed(4)); slot.style.setProperty('--sy', (0.6 + 0.4 * v).toFixed(4));
    });
    var r = docRect(slot), c = { x: r.left + r.width / 2, y: r.top + r.height - 28 }, lastSlot = i === total - 1;
    burst(c, '#FF7AA2', lastSlot ? 14 : 8, 420 * S, SH.HEART, 30 * S, -120 * S, 0.9);
    ring(c, '#FFE066', 38 * 2.2 * S, 0.4, 6 * S);
    saved++;
    play('tweet', 1 + saved * 0.06); haptic(20);
  }
  function checkCompletions() {
    var n = 0;
    for (var t = 0; t < state.length; t++) if (!sealedSeen[t] && sealed(state[t])) { celebrateTube(t); n++; }
    return n;
  }
  // 튜브 완성(_celebrate_tube + 기본 연출 팩): 뚜껑 쾅, 색종이 24·흰 별 8, 고리, '완성!', 안의 친구들 차례로 폴짝, 음이 올라가는 차임, 진동 25ms, 화면 흔들림
  function celebrateTube(t) {
    sealedSeen[t] = 1;
    var color = COLOR[state[t][0]], r = docRect(tubesEl[t]), topAt = { x: r.left + r.width / 2, y: r.top };
    addLid(t, true);
    burst(topAt, color, 24, d * 7, SH.CONFETTI, d * 0.2, 1300 * S, 1.0, PI * 0.9, -PI / 2);
    burst(topAt, '#FFFFFF', 8, d * 4, SH.STAR, d * 0.3, 300 * S, 0.7);
    ring({ x: topAt.x, y: r.top + r.height / 2 }, lighten(color, 0.3), d * 2.2, 0.5, d * 0.1);
    floatText({ x: topAt.x, y: topAt.y - d * 0.9 }, FX_TEXT[0], lighten(color, 0.35), Math.round(d * 0.42));
    pieces[t].forEach(function (p, k) { jump(p, 0.12 + k * 0.07, d * 0.35); });
    chime(completed); haptic(25); completed++;
    shake(7 * S, 0.2);
  }
  var COMBO_COLORS = ['#FFD166', '#FF9F45', '#FF5D8F', '#B48CFF'];
  function combo(n) {
    var color = COMBO_COLORS[clamp(n - 2, 0, 3)], r = docRect(board), at = { x: r.left + r.width / 2, y: r.top + d * 1.3 };
    floatText(at, FX_TEXT[1].replace('{n}', n), color, Math.round(d * 0.5 + n * 4 * S), 60 * S, 1.1);
    burst(at, color, 10 + n * 3, d * 4, SH.STAR, d * 0.28, 200 * S, 0.7);
    play('chime', 1.5 + n * 0.12, -4);
  }

  /* ── 판 완료(celebrate_win) → 0.9초 뒤 완료 창(0.2초에 나타남) + 별 찍기 ── */
  function win() {
    busy = true; root.classList.add('is-done');
    for (var i = 0; i < state.length; i++) labelTube(i); // 날아간 병아리를 읽기 라벨에서도 뺀다
    var colors = [];
    pieces.forEach(function (list) { list.forEach(function (p) { if (colors.indexOf(COLOR[p.kind]) < 0) colors.push(COLOR[p.kind]); }); });
    colors.push('#FFFFFF');
    var r = docRect(root);
    confettiRain(r.left, r.width, r.top - r.height * 0.15, colors, 90);
    var order = 0;
    pieces.forEach(function (list) { list.forEach(function (p) { jump(p, order++ * 0.035, d * 0.45); }); });
    play('fanfare'); haptic(60); shake(9 * S, 0.3);
    wait(0.9).then(function () {
      var lastLv = lv === LEVELS.length - 1;
      doneEl.querySelector('h2').textContent = lastLv ? T.doneAllTitle : T.doneTitle;
      doneEl.querySelector('p').textContent = (lastLv ? T.doneAll : T.done).replace('{n}', moves) + (moves <= LEVELS[lv].min ? ' ' + T.best : '');
      var a = doneEl.querySelector('[data-act="next"]'), b = doneEl.querySelector('[data-act="real"]');
      a.textContent = lastLv ? T.seeReal : T.next; a.dataset.go = lastLv ? 'real' : 'next';
      b.textContent = lastLv ? T.again : T.seeReal; b.dataset.go = lastLv ? 'again' : 'real';
      doneEl.hidden = false;
      doneEl.style.opacity = 0;
      tween(0.2, E.linear, function (v) { doneEl.style.opacity = v; }).then(function () { doneEl.style.opacity = ''; });
      showStars(starsFor(moves, LEVELS[lv].min));
      a.focus({ preventScroll: true });
      if (window.crEvent) window.crEvent('demo_clear_' + (lv + 1));
    });
  }
  // 별 셋(star_row.gd): 0.25초 뒤부터 0.22초 간격으로, 얻은 별은 2.2배에서 쾅(퐁 소리는 별마다 높게), 못 얻은 별은 0.6배에서 흐리게
  function showStars(count) {
    var row = doneEl.querySelector('.cr-stars');
    if (!row) {
      row = document.createElement('div'); row.className = 'cr-stars'; row.setAttribute('aria-hidden', 'true');
      doneEl.querySelector('h2').insertAdjacentElement('afterend', row);
    }
    row.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var got = i < count, dy = i === 1 ? -12 : 8, c = got ? '#FFD166' : 'rgba(255,255,255,.15)';
      var svg = '<svg viewBox="-75 -75 150 150"><g transform="translate(0 ' + dy + ')">' +
        (got ? '<polygon fill="' + darken('#FFD166', 0.3) + '" points="' + pts(starPts(62, 27, 0, 0)) + '"/>' : '') +
        '<polygon fill="' + c + '" points="' + pts(starPts(56, 24, 0, -4)) + '"/></g></svg>';
      row.insertAdjacentHTML('beforeend', svg);
      (function (el, k, earned) {
        var from = earned ? 2.2 : 0.6;
        wait(0.25 + k * 0.22).then(function () {
          if (earned) play('pop', 1 + k * 0.2);
          return tween(0.28, E.backOut, function (v) { el.style.scale = (from + (1 - from) * v).toFixed(4); });
        });
      })(row.lastElementChild, i, got);
    }
  }

  /* ── 누르기: 판 어디를 눌러도 가까운 튜브로(튜브 위 1.05d·옆 간격 절반·아래 0.2d까지, board_view.gd _tube_at) ── */
  function tubeAt(x, y) {
    for (var t = 0; t < tubesEl.length; t++) {
      var r = tubesEl[t].getBoundingClientRect();
      if (x >= r.left - M.gap / 2 && x <= r.right + M.gap / 2 && y >= r.top - d * 1.05 && y <= r.bottom + d * 0.2) return t;
    }
    return -1;
  }
  function pieceAt(t, y) { // 맨 위 친구는 그 위 빈칸을 눌러도 잡힌다(_critter_at)
    var list = pieces[t];
    if (!list.length) return -1;
    var o = layer.getBoundingClientRect(), ly = y - o.top, best = -1, bestDy = d * 0.5;
    if (ly < list[list.length - 1].y + M.pw / 2) return list.length - 1;
    list.forEach(function (p, k) { var dy = Math.abs(p.y + M.pw / 2 - ly); if (dy < bestDy) { bestDy = dy; best = k; } });
    return best;
  }
  function fireHold(h) {
    if (busy) return;
    if (sel >= 0) { sel = -1; settle(0.1); refresh(); }
    if (canClimb(state, h.t, h.k)) { haptic(15); doMove({ type: 'climb', t: h.t, k: h.k }); }
    else { shakeTube(h.t); setTip(T.climbTop); }
  }
  root.addEventListener('pointerdown', unlockAudio, true);
  board.addEventListener('pointerdown', function (e) {
    skipClick = false;
    if (busy || e.button > 0) return;
    var t = tubeAt(e.clientX, e.clientY);
    if (t < 0) return;
    var k = pieceAt(t, e.clientY);
    if (k < 0 || state[t][k] !== 'c') return;
    clearHint();
    hold = { t: t, k: k, p: pieces[t][k], time: 0, x: e.clientX, y: e.clientY };
    wake();
  });
  board.addEventListener('pointermove', function (e) { // 손가락을 끌면 꾹 누르기를 취소한다
    if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > d * 0.45) hold = null;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { board.addEventListener(ev, function () { hold = null; }); });
  board.addEventListener('click', function (e) {
    if (skipClick && e.detail !== 0) { skipClick = false; return; } // 꾹 눌러 능력을 쓴 뒤 따라오는 클릭은 버린다(키보드 클릭은 아님)
    var t;
    if (e.detail === 0) { var b = e.target.closest('.tube'); if (!b) return; t = +b.dataset.t; } // 키보드(Enter·Space)
    else t = tubeAt(e.clientX, e.clientY);
    tap(t);
  });
  root.addEventListener('click', function (e) { // 판 밖 빈 곳을 눌러도 내려놓는다
    if (sel >= 0 && !busy && !board.contains(e.target) && !e.target.closest('button,a')) { putBack(); setTip(T.go); }
  });
  board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  board.addEventListener('keydown', function (e) { // 키보드: 튜브에서 A 키 = 그 튜브 다람쥐의 능력
    var b = e.target.closest('.tube'); if (!b || busy) return;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ㅁ') {
      unlockAudio();
      var t = +b.dataset.t, k = state[t].indexOf('c');
      if (k >= 0 && canClimb(state, t, k)) { haptic(15); doMove({ type: 'climb', t: t, k: k }); } else shakeTube(t);
    }
  });

  /* ── 단추: 누르면 0.93배(0.06초)·틱 소리, 떼면 탄성 있게(0.3초, ELASTIC OUT) — ui_theme.gd add_press_feedback ── */
  root.querySelectorAll('.demo-ctrl .btn, .demo-done .btn, [data-act="sound"]').forEach(function (btn) {
    var s = 1, down = false, key = 'btn' + btn.dataset.act;
    function go(to, dur, ease) {
      var from = s;
      tween(dur, ease, function (v) { s = from + (to - from) * v; btn.style.scale = s === 1 ? '' : s.toFixed(4); }, 0, key);
    }
    btn.addEventListener('pointerdown', function () {
      if (btn.disabled) return;
      down = true; play('tick', 1, -8);
      go(0.93, 0.06, E.linear);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      btn.addEventListener(ev, function () {
        if (!down) return;
        down = false;
        go(1, 0.3, E.elasticOut);
      });
    });
  });

  // 되돌리기: '휘릭' 소리와 함께 판이 잠깐 푸르게 번쩍였다 돌아온다(game_screen.gd _after_rewind, modulate 0.6·0.8·1.6 → 1, 0.3초)
  var NS = 'http://www.w3.org/2000/svg', fsvg = document.createElementNS(NS, 'svg');
  fsvg.setAttribute('width', '0'); fsvg.setAttribute('height', '0'); fsvg.setAttribute('aria-hidden', 'true');
  fsvg.style.position = 'absolute';
  fsvg.innerHTML = '<filter id="cr-rewind" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter>';
  root.appendChild(fsvg);
  function rewindFlash() {
    if (reduce) return;
    var fm = fsvg.querySelector('feColorMatrix');
    board.style.filter = 'url(#cr-rewind)';
    tween(0.3, E.linear, function (v) {
      fm.setAttribute('values', (0.6 + 0.4 * v) + ' 0 0 0 0 0 ' + (0.8 + 0.2 * v) + ' 0 0 0 0 0 ' + (1.6 - 0.6 * v) + ' 0 0 0 0 0 1 0');
    }).then(function () { board.style.filter = ''; });
  }
  undoBtn.addEventListener('click', function () {
    if (busy || !history.length) return;
    var h = history.pop(); state = h.state; moves = h.moves; sel = -1;
    build(); saved = 0;
    // 되돌린 뒤에도 이미 구한 병아리는 둥지에 앉아 있게
    for (var i = 0; i < h.saved; i++) nest.children[i].dataset.full = '1';
    saved = h.saved;
    setCount(); setTip(T.go); undoBtn.disabled = !history.length;
    play('undo'); rewindFlash();
  });
  restartBtn.addEventListener('click', function () { if (!busy) start(lv); });
  hintBtn.addEventListener('click', function () {
    if (busy) return;
    if (sel >= 0) { sel = -1; settle(0.1); refresh(); }
    clearHint();
    var m = solve(state);
    if (!m) { setTip(T.stuck); return; }
    play('chime', 2.0, -8);
    if (m.type === 'pour') {
      tubesEl[m.t].classList.add('is-hint'); tubesEl[m.t].dataset.hint = T.hintFrom;
      tubesEl[m.to].classList.add('is-hint'); tubesEl[m.to].dataset.hint = T.hintTo;
      setTip(T.hintPour);
    }
    else { pieces[m.t][m.k].el.classList.add('is-hintpc'); setTip(T.hintClimb); }
  });
  doneEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]'); if (!b) return;
    if (b.dataset.go === 'next') start(lv + 1);
    else if (b.dataset.go === 'again') start(0);
    else { start(lv < LEVELS.length - 1 ? lv + 1 : 0); document.getElementById('real').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
  });
  doneEl.addEventListener('keydown', function (e) { // Esc: 창을 닫고 다음 판을 준비
    if (e.key === 'Escape') start(lv < LEVELS.length - 1 ? lv + 1 : 0);
  });

  // 소리·진동 켜고 끄기: 페이지에 [data-act="sound"] 단추가 있으면 연결한다(없어도 된다). 밖에서는 window.crDemoFeel로.
  function setSound(on) {
    soundOn = !!on;
    try { localStorage.setItem('cr-demo-sound', soundOn ? '1' : '0'); } catch (e) {}
    if (soundOn) unlockAudio();
    var b = root.querySelector('[data-act="sound"]'); if (b) b.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  }
  function setHaptics(on) { hapticsOn = !!on; try { localStorage.setItem('cr-demo-haptics', hapticsOn ? '1' : '0'); } catch (e) {} }
  var soundBtn = root.querySelector('[data-act="sound"]');
  if (soundBtn) {
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    soundBtn.addEventListener('click', function () { setSound(!soundOn); });
  }
  window.crDemoFeel = { setSound: setSound, setHaptics: setHaptics };

  var rt;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (busy) return;
      measure();
      board.querySelectorAll('.cr-lid').forEach(function (e) { e.remove(); });
      Object.keys(sealedSeen).forEach(function (t) { addLid(+t, false); });
      for (var t = 0; t < pieces.length; t++) for (var k = 0; k < pieces[t].length; k++) { var q = restPos(t, k); pieces[t][k].x = q.x; pieces[t][k].y = q.y; }
      wake();
    }, 120);
  });

  start(0);
  root.classList.add('is-ready');
})();
