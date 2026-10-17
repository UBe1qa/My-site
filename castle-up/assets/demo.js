/* 캐슬업! 소개 사이트 — 보스 약점 맞히기 맛보기(외부 라이브러리 없음).
   규칙·수치는 게임 코드(games/castle scripts/core/battle.gd·balance.gd)를 따른다:
   보스 머리 위 속성 순서대로 스킬을 맞히면 그로기(4초, 1.8배 피해, 완성 순간 최대 체력 6%).
   순서와 다른 속성은 벌칙 없이 피해만, 한 칸 맞힌 뒤 8초 안에 다음 칸을 못 맞히면 처음으로.
   앞 스킬 → 뒤 스킬 속성이 5초 안에 이어지면 연계(뒤 스킬 1.5~2배). 나는 보스는 그로기 동안 땅으로 떨어진다.
   웹 맛보기라 스킬 대기 시간만 1초로 줄였다. 효과음은 게임 Sfx(sfx.gd)와 같은 식으로 합성한다. */
(function () {
  'use strict';
  var root = document.getElementById('demo');
  if (!root) return;
  var T = JSON.parse(document.getElementById('demo-text').textContent);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 게임 balance.gd
  var GROGGY = 4.0, GROGGY_DMG = 1.8, GROGGY_BURST = 0.06, CHAIN_WINDOW = 8.0, COMBO_WINDOW = 5.0;
  var EL_COLOR = { phys: '#E9DCC3', fire: '#FF7448', ice: '#8FD8FF', bolt: '#FFE15A', holy: '#FFF6C8', dark: '#B98CFF' };
  var COMBOS = {
    steam: ['ice', 'fire', 1.5], shock: ['ice', 'bolt', 1.5], shatter: ['ice', 'phys', 2.0], overload: ['fire', 'bolt', 1.5],
    flame_arrows: ['phys', 'fire', 1.5], lightning_rod: ['phys', 'bolt', 1.5], quench: ['fire', 'ice', 2.0]
  };
  function comboOf(a, b) { for (var k in COMBOS) if (COMBOS[k][0] === a && COMBOS[k][1] === b) return k; return ''; }
  var SKILL_CD = 1.0;      // 웹 맛보기용(게임은 6~28초)
  var MAX_HP = 1500, SKILL_DMG = 52, ARROW_DMG = 3;
  var FIRST_CHAINS = [['phys', 'fire'], ['ice', 'bolt', 'fire']]; // 처음 두 번은 정해 둔 순서(연계가 붙는 쌍), 그다음은 게임과 같은 방식으로 만든다
  var AVAIL = ['phys', 'fire', 'bolt', 'ice'];
  var WEAK = 'fire'; // 박쥐 여왕 약점(게임 BOSS_BAT_QUEEN_HINT)

  var stage = root.querySelector('.stage');
  var bossEl = root.querySelector('.boss');
  var bossImg = bossEl.querySelector('img');
  var chainEl = root.querySelector('.chain');
  var hpFill = root.querySelector('.hp i');
  var tip = root.querySelector('.demo-tip');
  var btns = [].slice.call(root.querySelectorAll('.sk'));
  var done = root.querySelector('.demo-done');
  var soundBtn = root.querySelector('[data-act="sound"]');
  var canvas = root.querySelector('canvas.fx');
  var ctx = canvas.getContext('2d');

  var S; // 판 상태
  function reset() {
    S = { hp: MAX_HP, chain: FIRST_CHAINS[0].slice(), ci: 0, ct: 0, round: 0, groggy: 0, down: false,
          lastEl: '', lastT: -99, cd: {}, groggies: 0, combos: 0, over: false, touched: false, t0: now() };
    hpFill.style.transform = 'scaleX(1)';
    bossEl.classList.remove('is-down', 'is-dead', 'is-groggy');
    done.hidden = true;
    btns.forEach(function (b) { b.disabled = false; b.style.removeProperty('--cd'); });
    drawChain(); say(T.tip, true);
  }
  function now() { return performance.now() / 1000; }

  /* ── 게임의 _make_chain: 성에 있는 속성 중 겹치지 않게, 70%는 연계가 붙는 다음 속성, 60%는 약점 ── */
  function makeChain(len) {
    var chain = [], prev = '';
    for (var k = 0; k < len; k++) {
      var opts = AVAIL.filter(function (e) { return chain.indexOf(e) < 0; });
      var linked = opts.filter(function (e) { return comboOf(prev, e); });
      var pick = opts[Math.floor(Math.random() * opts.length)];
      if (prev && linked.length && Math.random() < 0.7) pick = linked[Math.floor(Math.random() * linked.length)];
      else if (opts.indexOf(WEAK) >= 0 && Math.random() < 0.6) pick = WEAK;
      chain.push(pick); prev = pick;
    }
    return chain;
  }

  /* ── 약점 사슬 그리기(게임 _draw_chain: 맞힌 칸은 속성 색으로 채움, 다음 칸은 테두리가 빛나고, 남은 칸은 흐리게) ── */
  function drawChain(pop) {
    var html = '';
    S.chain.forEach(function (el, k) {
      var st = S.groggy > 0 ? 'rest' : k < S.ci ? 'done' : k === S.ci ? 'next' : 'rest';
      if (k > 0) html += '<i class="ch-arr' + (k <= S.ci && !(S.groggy > 0) ? ' on' : '') + '"></i>';
      html += '<span class="ch ch-' + st + (pop === k ? ' is-pop' : '') + '" style="--c:' + EL_COLOR[el] + '">' + icon(el) +
        (st === 'next' && S.ci > 0 ? '<svg class="ch-timer" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18"/></svg>' : '') + '</span>';
    });
    chainEl.innerHTML = html;
    var names = S.chain.map(function (e) { return T.el[e]; }).join(' → ');
    chainEl.setAttribute('aria-label', T.chainLabel.replace('{order}', names) + (S.groggy > 0 ? '' : ' ' + T.chainNext.replace('{el}', T.el[S.chain[S.ci]] || '')));
    btns.forEach(function (b) {
      var nx = S.groggy <= 0 && !S.over && b.dataset.el === S.chain[S.ci];
      b.classList.toggle('is-next', nx);
      b.classList.toggle('is-any', S.groggy > 0 && !S.over); // 그로기 동안은 어느 스킬이든(게임 FX_NOW '지금!')
    });
  }
  function icon(el) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-' + el + '"/></svg>'; }

  function say(text, quiet) { tip.textContent = text; if (!quiet && !reduce) tip.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 200 }); }

  /* ── 스킬 쓰기 ── */
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (S.over) return;
      var t = now(), el = b.dataset.el;
      if ((S.cd[el] || 0) > t) return;
      S.cd[el] = t + SKILL_CD; S.touched = true;
      root.classList.remove('is-nudge');
      audio.unlock();
      b.style.setProperty('--cd', '1'); b.classList.add('is-cool');
      setTimeout(function () { b.classList.remove('is-cool'); b.style.removeProperty('--cd'); }, SKILL_CD * 1000);
      cast(el);
    });
  });

  function cast(el) {
    var travel = reduce ? 0 : 0.42;
    var a = bossAt();
    sfx(el === 'phys' ? 'whoosh' : el === 'fire' ? 'cast' : el === 'bolt' ? 'zap' : 'frost', el === 'phys' ? 1.6 : 1, -6);
    skillFx(el, a, travel);
    setTimeout(function () { land(el); }, travel * 1000);
  }

  function land(el) {
    if (S.over) return;
    var t = now(), dmg = SKILL_DMG, a = bossAt();
    // 연계(battle.gd: last_element → element, COMBO_WINDOW 안)
    var combo = (t - S.lastT <= COMBO_WINDOW) ? comboOf(S.lastEl, el) : '';
    if (combo) {
      dmg *= COMBOS[combo][2]; S.combos++;
      var willGroggy = S.groggy <= 0 && S.chain[S.ci] === el && S.ci + 1 >= S.chain.length;
      var from = S.lastEl;
      if (willGroggy) setTimeout(function () { if (!S.over) comboFx(combo, from, el, bossAt()); }, reduce ? 1600 : 1300);
      else comboFx(combo, from, el, a);
    }
    S.lastEl = el; S.lastT = t;
    if (S.groggy > 0) dmg *= GROGGY_DMG;
    hit(dmg, a, el);
    sfx(el === 'fire' ? 'fire' : el === 'ice' ? 'frost' : el === 'bolt' ? 'thunder' : 'arrow', el === 'bolt' ? 1.4 : 1, el === 'bolt' ? -10 : -8);
    if (S.over) return;
    // 약점 사슬(그로기 중에는 멈춘다)
    if (S.groggy > 0) { say(T.inGroggy); return; }
    if (S.chain[S.ci] === el) {
      S.ci++; S.ct = t;
      chainStepFx(S.ci, el, a);
      if (S.ci >= S.chain.length) { groggy(); return; }
      drawChain(S.ci - 1);
      say(T.step.replace('{el}', T.el[S.chain[S.ci]]));
    } else {
      say(T.wrong.replace('{el}', T.el[S.chain[S.ci]]));
    }
  }

  function hit(dmg, a, el) {
    dmg = Math.round(dmg);
    S.hp = Math.max(0, S.hp - dmg);
    hpFill.style.transform = 'scaleX(' + (S.hp / MAX_HP) + ')';
    floatText(String(dmg), a.x + a.r * 0.35 + rnd(-10, 10), a.y + a.r * 0.35, el ? EL_COLOR[el] : '#fff', 18, 0.8);
    if (!reduce) bossImg.animate([{ filter: 'brightness(2.2)' }, { filter: 'none' }], { duration: 160 });
    if (S.hp <= 0) kill();
  }

  /* ── 그로기: 시간이 멈칫하고 번쩍, 보스가 휘청이며 땅으로 떨어진다 ── */
  function groggy() {
    var a = bossAt();
    S.groggies++;
    S.groggy = GROGGY; S.ci = 0;
    drawChain();
    root.classList.remove('is-nudge');
    hitstop(0.25);
    burst(a.x, a.y, '#FFE15A', 30, 1000, 'star', 28, 400, 0.9);
    burst(a.x, a.y, '#FFFFFF', 24, 700, 'spark', 22, 0, 0.5);
    ring(a.x, a.y, '#FFE15A', 320, 0.5, 20); ring(a.x, a.y, '#FFFFFF', 200, 0.3, 10);
    var tx = Math.min(Math.max(a.x, W * 0.42), W * 0.74);
    floatText(T.groggy, tx, H * 0.24, '#FFE15A', 36, 1.4, true);
    floatText(T.weak, tx, H * 0.24 + 32 * k(), '#FF9F43', 16, 1.6);
    shake(22, 0.4); flash('#FFF6C8', 0.65);
    sfx('explosion', 1.4); sfx('fanfare', 1.3); vibrate(80);
    hit(MAX_HP * GROGGY_BURST, a, '');
    if (S.over) return;
    say(T.groggyTip);
    bossEl.classList.add('is-groggy');
    // 나는 보스: 떨어지기 시작(battle_view 'fall') → 땅에 쿵('crash')
    setTimeout(function () {
      if (S.over) return;
      sfx('whoosh', 0.6, -4);
      bossEl.classList.add('is-down');
      setTimeout(function () {
        if (S.over) return;
        var f = bossAt(), foot = groundY();
        smoke(f.x, foot, 'rgba(158,133,102,.7)', 6, 90, 60, 0.9);
        burst(f.x, foot, '#8A7A68', 18, 520, 'shard', 18, 900, 0.8, Math.PI * 0.6, -Math.PI / 2);
        shake(16, 0.35);
        floatText(T.fall, f.x, foot - 40 * k(), '#FFB347', 22, 1.2);
        sfx('thud', 0.5); sfx('crack', 0.8, -4); vibrate(40);
      }, reduce ? 0 : 330);
    }, reduce ? 0 : 260);
  }

  function rise() {
    bossEl.classList.remove('is-down', 'is-groggy');
    var a = bossAt();
    smoke(a.x, groundY(), 'rgba(153,140,128,.5)', 3, 60, 40, 0.6);
    sfx('whoosh', 1.1, -8);
    S.round++;
    S.chain = S.round < FIRST_CHAINS.length ? FIRST_CHAINS[S.round].slice() : makeChain(Math.min(4, 2 + S.round));
    S.ci = 0;
    drawChain();
    say(T.rise);
  }

  function kill() {
    S.over = true; S.groggy = 0;
    var a = bossAt();
    drawChain();
    bossEl.classList.add('is-dead');
    hitstop(0.4);
    burst(a.x, a.y - 10, '#FFD24A', 30, 700, 'coin', 22, 1100, 1.2, Math.PI * 0.9, -Math.PI / 2);
    burst(a.x, a.y, '#FFFFFF', 12, 400, 'star', 14, 0, 0.5);
    ring(a.x, a.y, '#FFD24A', 420, 0.6, 18);
    shake(18, 0.4); flash('#FFF6C8', 0.5);
    sfx('explosion', 1.0); sfx('crystal', 0.8); sfx('fanfare', 1.0); vibrate(100);
    btns.forEach(function (b) { b.classList.remove('is-next', 'is-any'); b.disabled = true; });
    chainEl.innerHTML = ''; say(T.killed);
    setTimeout(function () {
      done.querySelector('h2').textContent = T.doneTitle;
      done.querySelector('p').textContent = T.done.replace('{g}', S.groggies).replace('{c}', S.combos);
      done.hidden = false;
      done.querySelector('[data-act="real"]').focus({ preventScroll: true });
    }, reduce ? 0 : 1300);
  }

  done.addEventListener('click', function (e) {
    var act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'again') reset();
    if (act.dataset.act === 'real') { reset(); var r = document.getElementById('real'); if (r) r.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
  });

  /* ── 시간 흐름: 그로기 4초, 사슬 8초, 성벽 궁수의 자동 화살 ── */
  var lastArrow = 0, lastFrame = now(), stopUntil = 0;
  function tick() {
    var t = now(), dt = Math.min(0.05, t - lastFrame); lastFrame = t;
    if (t < stopUntil) dt = 0; // 히트스톱
    if (!S.over) {
      if (S.groggy > 0) { S.groggy -= dt; if (S.groggy <= 0) { S.groggy = 0; rise(); } }
      else if (S.ci > 0) {
        var left = 1 - (t - S.ct) / CHAIN_WINDOW;
        var ring_ = chainEl.querySelector('.ch-timer');
        if (ring_) ring_.style.setProperty('--left', Math.max(0, left).toFixed(3));
        if (left <= 0) { // 시간이 지나면 처음으로(게임은 다음 스킬 때 판정, 화면에서는 고리가 비는 순간)
          S.ci = 0; drawChain(); say(T.reset);
          if (!reduce) chainEl.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 240 });
          sfx('tick', 0.6, -8);
        }
      }
      if (!reduce && t - lastArrow > 0.9 && visible) { lastArrow = t; autoArrow(); }
      if (!S.touched && t - S.t0 > 6) root.classList.add('is-nudge');
    }
    stepFx(dt);
    requestAnimationFrame(tick);
  }

  /* ── 위치 ── */
  var W = 0, H = 0, DPR = 1;
  function k() { return W / 420; }
  function resize() {
    var r = stage.getBoundingClientRect();
    W = r.width; H = r.height; DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function bossAt() {
    var s = stage.getBoundingClientRect(), b = bossImg.getBoundingClientRect();
    return { x: b.left - s.left + b.width / 2, y: b.top - s.top + b.height * 0.45, r: b.width / 2 };
  }
  var floorsEl = [].slice.call(root.querySelectorAll('.tw-fl'));
  function castleAt() { // 영웅이 선 층 하나에서 쏜다
    var s = stage.getBoundingClientRect(), f = floorsEl[Math.floor(Math.random() * floorsEl.length)].getBoundingClientRect();
    return { x: f.right - s.left - f.width * 0.2, y: f.top - s.top + f.height * 0.45 };
  }
  function groundY() { return H * 0.9; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ── 효과(게임 FxLayer를 작은 판에 맞게 줄임: 1080 기준 크기 × W/1080) ── */
  var parts = [], rings = [], bolts = [], meteors = [];
  var fxScale = function () { return W / 1080 * 1.6; };
  function burst(x, y, color, n, speed, shape, size, grav, life, spread, dir) {
    if (reduce) return;
    var s = fxScale();
    spread = spread == null ? Math.PI * 2 : spread; dir = dir == null ? 0 : dir;
    for (var i = 0; i < n; i++) {
      var ang = dir + (Math.random() - 0.5) * spread, v = speed * s * rnd(0.35, 1);
      parts.push({ x: x, y: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, g: grav * s, c: color, shape: shape, size: size * s * rnd(0.6, 1.1), life: life * rnd(0.7, 1), age: 0, rot: rnd(0, 6.28), vr: rnd(-8, 8) });
    }
  }
  function smoke(x, y, color, n, speed, size, life) {
    if (reduce) return;
    var s = fxScale();
    for (var i = 0; i < n; i++) parts.push({ x: x + rnd(-20, 20) * s, y: y, vx: rnd(-1, 1) * speed * s, vy: -rnd(0.2, 1) * speed * s * 0.5, g: 0, c: color, shape: 'puff', size: size * s * rnd(0.7, 1.2), life: life, age: 0, rot: 0, vr: 0 });
  }
  function ring(x, y, color, r, life, w) { if (!reduce) rings.push({ x: x, y: y, c: color, r: r * fxScale() * 0.5, life: life, w: w * fxScale() * 0.5, age: 0 }); }
  function floatText(text, x, y, color, size, life, big) {
    var el = document.createElement('span');
    el.className = 'ftext' + (big ? ' big' : '');
    el.textContent = text;
    el.style.cssText = 'left:' + x + 'px;top:' + y + 'px;color:' + color + ';font-size:' + Math.round(size * Math.max(0.85, k())) + 'px';
    stage.appendChild(el);
    if (reduce) { setTimeout(function () { el.remove(); }, life * 1000); return; }
    var a = el.animate(big ? [
      { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 1, offset: .15 },
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-90%) scale(1)', opacity: 0 }
    ] : [
      { transform: 'translate(-50%,-50%) scale(.7)', opacity: 0 }, { transform: 'translate(-50%,-70%) scale(1.1)', opacity: 1, offset: .2 },
      { transform: 'translate(-50%,-160%) scale(1)', opacity: 0 }
    ], { duration: life * 1000, easing: 'ease-out' });
    a.onfinish = function () { el.remove(); };
  }
  function shake(px, life) {
    if (reduce) return;
    var m = px * W / 1080, f = [];
    for (var i = 0; i < 6; i++) f.push({ transform: 'translate(' + rnd(-m, m).toFixed(1) + 'px,' + rnd(-m, m).toFixed(1) + 'px)' });
    f.push({ transform: 'none' });
    stage.animate(f, { duration: life * 1000 });
  }
  function flash(color, a) {
    if (reduce) return;
    var el = root.querySelector('.st-flash');
    el.style.background = color;
    el.animate([{ opacity: a }, { opacity: 0 }], { duration: 380, easing: 'ease-out' });
  }
  function hitstop(sec) { if (!reduce) stopUntil = now() + sec * 0.6; }

  function skillFx(el, a, travel) {
    if (reduce) return;
    var s = W / 420;
    if (el === 'phys') { // 화살비: 위에서 화살이 쏟아진다
      for (var i = 0; i < 12; i++) meteors.push({ kind: 'arrow', x0: a.x - 70 * s + rnd(-30, 30) * s, y0: -10 - rnd(0, 40), x1: a.x + rnd(-a.r * 0.7, a.r * 0.7), y1: a.y + rnd(-10, 20) * s, t: -i * 0.025, dur: travel, c: EL_COLOR.phys });
    } else if (el === 'fire') { // 메테오: 큰 불덩이
      var c = castleAt();
      meteors.push({ kind: 'meteor', x0: a.x - 120 * s, y0: -30, x1: a.x, y1: a.y, t: 0, dur: travel, c: EL_COLOR.fire });
      burst(c.x, c.y, '#FF9A4A', 6, 200, 'dot', 10, -100, 0.4);
    } else if (el === 'bolt') { // 낙뢰: 번쩍이는 번개
      setTimeout(function () { bolts.push({ x: a.x, y: a.y, age: 0, life: 0.28, seed: Math.random() }); flash('#FFF6C8', 0.25); }, travel * 1000 * 0.7);
    } else { // 눈보라: 눈송이가 보스를 감싼다
      for (var j = 0; j < 22; j++) {
        var ang = rnd(0, 6.28), rr = rnd(40, 90) * s;
        parts.push({ x: a.x + Math.cos(ang) * rr, y: a.y + Math.sin(ang) * rr - 40 * s, vx: -Math.sin(ang) * 120 * s, vy: Math.cos(ang) * 120 * s + 40 * s, g: 30 * s, c: '#EAF8FF', shape: 'flake', size: rnd(5, 9) * s, life: travel + 0.35, age: -rnd(0, 0.15), rot: 0, vr: 3 });
      }
    }
  }
  function chainStepFx(step, el, a) {
    var c = chainEl.getBoundingClientRect(), s = stage.getBoundingClientRect();
    var cx = c.left - s.left + c.width / 2, cy = c.top - s.top + c.height / 2;
    ring(a.x, a.y, EL_COLOR[el], a.r * 2 * (1.6 + step * 0.3) / fxScale(), 0.4, 10);
    burst(cx, cy, EL_COLOR[el], 14 + step * 4, 380, 'star', 18, 200, 0.5);
    sfx('chime', 1.2 + 0.3 * step); vibrate(20);
  }
  function comboFx(combo, from, to, a) {
    var cf = EL_COLOR[from], ct = EL_COLOR[to];
    ring(a.x, a.y, cf, 240, 0.45, 14); ring(a.x, a.y, ct, 340, 0.6, 10);
    burst(a.x, a.y, cf, 18, 700, 'star', 18, 200, 0.6); burst(a.x, a.y, ct, 18, 700, 'spark', 18, 200, 0.5);
    floatText(T.combo[combo], W * 0.5, H * 0.58, mix(cf, ct), 24, 1.3, true); // 성과 보스 사이(그로기 글자와 겹치지 않게)
    floatText(T.comboOf.replace('{a}', T.el[from]).replace('{b}', T.el[to]), W * 0.5, H * 0.58 + 26 * k(), '#FFFFFF', 13, 1.3); // 무엇이 연계인지
    hitstop(0.06); sfx('crystal', 0.9); sfx('chime', 1.6); vibrate(40);
  }
  function mix(a, b) { // 두 속성 색의 가운데를 조금 밝게(게임 from.lerp(to, .5).lightened(.2))
    var p = function (h, i) { return parseInt(h.substr(1 + i * 2, 2), 16); };
    var out = '#';
    for (var i = 0; i < 3; i++) { var v = (p(a, i) + p(b, i)) / 2; v = v + (255 - v) * 0.2; out += ('0' + Math.round(v).toString(16)).slice(-2); }
    return out;
  }
  function autoArrow() { // 층마다 선 영웅들이 저절로 쏘는 화살(방치형)
    if (S.over) return;
    var c = castleAt(), a = bossAt();
    meteors.push({ kind: 'shot', x0: c.x, y0: c.y + rnd(-20, 30), x1: a.x + rnd(-10, 10), y1: a.y + rnd(-10, 10), t: 0, dur: 0.45, c: '#E9DCC3', cb: function () {
      if (S.over) return;
      S.hp = Math.max(1, S.hp - ARROW_DMG * (S.groggy > 0 ? GROGGY_DMG : 1));
      hpFill.style.transform = 'scaleX(' + (S.hp / MAX_HP) + ')';
    } });
  }

  function stepFx(dt) {
    ctx.clearRect(0, 0, W, H);
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i]; m.t += dt;
      if (m.t < 0) continue;
      var u = Math.min(1, m.t / Math.max(0.01, m.dur)), x = m.x0 + (m.x1 - m.x0) * u, y = m.y0 + (m.y1 - m.y0) * u * u;
      var ang = Math.atan2((m.y1 - m.y0) * 2 * u, m.x1 - m.x0);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      if (m.kind === 'meteor') {
        var r = 13 * k();
        var g = ctx.createLinearGradient(-r * 4, 0, 0, 0); g.addColorStop(0, 'rgba(255,154,74,0)'); g.addColorStop(1, 'rgba(255,154,74,.75)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-r * 4, -r * 0.5); ctx.lineTo(0, -r); ctx.lineTo(0, r); ctx.lineTo(-r * 4, r * 0.5); ctx.fill();
        ctx.fillStyle = '#FF7448'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#FFE27A'; ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.2, r * 0.5, 0, 6.28); ctx.fill();
      } else {
        var len = (m.kind === 'shot' ? 12 : 18) * k();
        ctx.strokeStyle = m.c; ctx.lineWidth = Math.max(1.5, 2 * k()); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
        ctx.fillStyle = m.c; ctx.beginPath(); ctx.moveTo(3 * k(), 0); ctx.lineTo(-3 * k(), -3 * k()); ctx.lineTo(-3 * k(), 3 * k()); ctx.fill();
      }
      ctx.restore();
      if (u >= 1) {
        meteors.splice(i, 1);
        if (m.kind === 'meteor') { burst(m.x1, m.y1, '#FF7448', 22, 600, 'dot', 14, 300, 0.6); burst(m.x1, m.y1, '#FFE27A', 10, 400, 'spark', 12, 0, 0.4); ring(m.x1, m.y1, '#FF9A4A', 220, 0.4, 12); }
        else if (m.kind === 'arrow') burst(m.x1, m.y1, '#E9DCC3', 2, 160, 'spark', 8, 200, 0.25);
        if (m.cb) m.cb();
      }
    }
    for (i = bolts.length - 1; i >= 0; i--) {
      var b = bolts[i]; b.age += dt;
      if (b.age > b.life) { bolts.splice(i, 1); continue; }
      var al = 1 - b.age / b.life, seg = 7, px = b.x + 20 * k(), py = 0;
      ctx.strokeStyle = 'rgba(255,225,90,' + al + ')'; ctx.lineWidth = 4 * k(); ctx.shadowColor = '#FFE15A'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (var j = 1; j <= seg; j++) { var yy = b.y * j / seg; ctx.lineTo(b.x + (j === seg ? 0 : Math.sin(b.seed * 40 + j * 2.3) * 16 * k()), yy); }
      ctx.stroke(); ctx.shadowBlur = 0;
      if (b.age - dt <= 0) { burst(b.x, b.y, '#FFE15A', 16, 600, 'spark', 14, 0, 0.45); ring(b.x, b.y, '#FFE15A', 200, 0.35, 10); }
    }
    for (i = rings.length - 1; i >= 0; i--) {
      var rg = rings[i]; rg.age += dt;
      if (rg.age > rg.life) { rings.splice(i, 1); continue; }
      var q = rg.age / rg.life;
      ctx.globalAlpha = 1 - q; ctx.strokeStyle = rg.c; ctx.lineWidth = rg.w * (1 - q) + 1;
      ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r * (0.3 + 0.7 * Math.sqrt(q)), 0, 6.28); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.age += dt;
      if (p.age < 0) continue;
      if (p.age > p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      var fade = 1 - p.age / p.life;
      ctx.globalAlpha = Math.min(1, fade * 1.6);
      ctx.fillStyle = p.c; ctx.strokeStyle = p.c;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      var z = p.size;
      if (p.shape === 'star') { star(z * 0.6); }
      else if (p.shape === 'spark') { ctx.fillRect(-z * 0.6, -z * 0.12, z * 1.2, z * 0.24); }
      else if (p.shape === 'shard') { ctx.beginPath(); ctx.moveTo(0, -z * 0.5); ctx.lineTo(z * 0.35, z * 0.4); ctx.lineTo(-z * 0.3, z * 0.2); ctx.fill(); }
      else if (p.shape === 'coin') { ctx.beginPath(); ctx.ellipse(0, 0, z * 0.45 * Math.abs(Math.cos(p.rot * 2)) + 1, z * 0.45, 0, 0, 6.28); ctx.fill(); }
      else if (p.shape === 'puff') { ctx.globalAlpha = fade * 0.6; ctx.beginPath(); ctx.arc(0, 0, z * (1.4 - fade * 0.6), 0, 6.28); ctx.fill(); }
      else if (p.shape === 'flake') { ctx.lineWidth = 1.5; for (var f = 0; f < 3; f++) { ctx.rotate(1.047); ctx.beginPath(); ctx.moveTo(-z / 2, 0); ctx.lineTo(z / 2, 0); ctx.stroke(); } }
      else { ctx.beginPath(); ctx.arc(0, 0, z * 0.35, 0, 6.28); ctx.fill(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function star(r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * 0.45 : r, a = i * Math.PI / 5 - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }

  /* ── 효과음: 게임 sfx.gd와 같은 식(_tone·_boom·_bell·_noise_sweep, 22050Hz)으로 버퍼를 만든다 ── */
  var audio = (function () {
    var ac = null, on = true, bufs = {}, last = {};
    var RATE = 22050, seed = 7;
    function rand() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; }
    function tone(d, f0, f1, wave, decay, noise, vib, gain) {
      noise = noise || 0; vib = vib || 0; gain = gain == null ? 0.6 : gain;
      var n = Math.floor(d * RATE), out = new Float32Array(n), ph = 0, TAU = Math.PI * 2;
      for (var i = 0; i < n; i++) {
        var t = i / RATE, u = i / n, f = f0 * Math.pow(f1 / f0, u) * (1 + vib * Math.sin(TAU * 11 * t));
        ph = (ph + TAU * f / RATE) % TAU;
        var s = wave === 'square' ? (ph < Math.PI ? 1 : -1) : wave === 'triangle' ? 2 * Math.abs(ph / Math.PI - 1) - 1 : Math.sin(ph);
        if (noise > 0) s += rand() * noise;
        out[i] = s * Math.min(1, t / 0.004) * Math.pow(1 - u, decay) * gain;
      }
      return out;
    }
    function boom(d, f0, f1, noise) {
      var n = Math.floor(d * RATE), out = new Float32Array(n), ph = 0, low = 0, TAU = Math.PI * 2;
      for (var i = 0; i < n; i++) {
        var t = i / RATE, u = i / n;
        ph = (ph + TAU * f0 * Math.pow(f1 / f0, u) / RATE) % TAU;
        low += (rand() - low) * 0.12;
        out[i] = (Math.sin(ph) * 0.8 + low * noise * 2.2) * Math.min(1, t / 0.003) * Math.pow(1 - u, 2.2) * 0.7;
      }
      return out;
    }
    function sweep(d) {
      var n = Math.floor(d * RATE), out = new Float32Array(n), low = 0;
      for (var i = 0; i < n; i++) { var u = i / n, cut = 0.05 + (0.35 - 0.05) * Math.sin(Math.PI * u); low += (rand() - low) * cut; out[i] = low * Math.sin(Math.PI * u) * 0.9; }
      return out;
    }
    function bell(ratios, step, length) {
      var base = 784, n = Math.floor((step * (ratios.length - 1) + length) * RATE), out = new Float32Array(n), TAU = Math.PI * 2;
      ratios.forEach(function (r, k) {
        var start = Math.floor(step * k * RATE), f = base * r;
        for (var i = start; i < Math.min(n, start + Math.floor(length * RATE)); i++) {
          var t = (i - start) / RATE, env = Math.min(1, t / 0.003) * Math.exp(-t * 5);
          out[i] += (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2 * t) + 0.12 * Math.sin(TAU * f * 3 * t)) * env * 0.32;
        }
      });
      return out;
    }
    var DEF = {
      whoosh: function () { return sweep(0.38); }, tick: function () { return tone(0.035, 1900, 1500, 'square', 6, 0, 0, 0.25); },
      chime: function () { return bell([1.0], 0, 0.7); }, fanfare: function () { return bell([1.0, 1.25, 1.5, 2.0], 0.11, 0.9); },
      arrow: function () { return tone(0.06, 2200, 900, 'triangle', 4, 0.35, 0, 0.35); }, frost: function () { return tone(0.16, 2600, 2100, 'sine', 3, 0.05, 0.03, 0.35); },
      zap: function () { return tone(0.13, 1200, 260, 'square', 2, 0.55, 0, 0.3); }, fire: function () { return tone(0.14, 300, 180, 'triangle', 2, 0.6, 0, 0.35); },
      thud: function () { return boom(0.2, 150, 70, 0.35); }, explosion: function () { return boom(0.7, 70, 30, 0.9); }, thunder: function () { return boom(0.9, 55, 35, 1.0); },
      cast: function () { return tone(0.28, 420, 1300, 'sine', 1.4, 0, 0.04); }, crystal: function () { return bell([2.0, 3.0], 0.07, 0.5); },
      crack: function () { return tone(0.09, 3200, 1800, 'square', 4, 0.7, 0, 0.25); }
    };
    function get(name) {
      if (!bufs[name]) { var data = DEF[name](), b = ac.createBuffer(1, data.length, RATE); b.copyToChannel ? b.copyToChannel(data, 0) : b.getChannelData(0).set(data); bufs[name] = b; }
      return bufs[name];
    }
    return {
      unlock: function () {
        if (!on) return;
        if (!ac) { var C = window.AudioContext || window.webkitAudioContext; if (!C) { on = false; return; } ac = new C(); }
        if (ac.state === 'suspended') ac.resume();
      },
      play: function (name, pitch, db) {
        if (!on || !ac || !DEF[name]) return;
        var t = ac.currentTime;
        if (name === 'arrow' || name === 'zap' || name === 'fire' || name === 'frost') { if (t - (last[name] || -9) < 0.1) return; last[name] = t; }
        var src = ac.createBufferSource(), g = ac.createGain();
        src.buffer = get(name); src.playbackRate.value = pitch || 1;
        g.gain.value = Math.pow(10, (db || 0) / 20) * 0.8;
        src.connect(g); g.connect(ac.destination); src.start();
      },
      set: function (v) { on = v; }
    };
  })();
  function sfx(name, pitch, db) { audio.play(name, pitch, db); }
  function vibrate(ms) { if (soundOn && navigator.vibrate && !reduce) try { navigator.vibrate(ms); } catch (e) {} }
  var soundOn = true;
  try { soundOn = localStorage.getItem('castleup:sound') !== '0'; } catch (e) {}
  if (soundBtn) {
    soundBtn.setAttribute('aria-pressed', String(soundOn)); audio.set(soundOn);
    soundBtn.addEventListener('click', function () {
      soundOn = !soundOn; audio.set(soundOn); if (soundOn) audio.unlock(); soundBtn.setAttribute('aria-pressed', String(soundOn));
      try { localStorage.setItem('castleup:sound', soundOn ? '1' : '0'); } catch (e) {}
      if (soundOn) sfx('chime', 1.5, -6);
    });
  }

  /* 화면 밖이면 자동 화살을 멈춘다 */
  var visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(stage);
  addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  resize(); reset();
  requestAnimationFrame(tick);
})();
