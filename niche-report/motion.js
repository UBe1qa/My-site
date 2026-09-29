/* 니치 앱 리포트 — 움직임 (GSAP 3 + ScrollTrigger + SplitText, jsDelivr)
   html.anim 일 때만 동작. '동작 줄이기'면 app.js가 그린 최종 모습 그대로 보여요.
   튕기는 효과·마우스 따라다니는 빛·흐르는 띠는 쓰지 않아요. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('anim')) return;               // 3.5초 안전장치가 이미 풀었으면 아무것도 안 함
  if (!window.gsap || !window.ScrollTrigger) { window.__unanim && window.__unanim(); return; }
  clearTimeout(window.__animTimer);

  var gsap = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  gsap.registerPlugin(ST); if (Split) gsap.registerPlugin(Split);
  gsap.config({ nullTargetWarn: false });
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var EASE = 'power3.out';

  /* ── 숫자 세기 ─────────────────────────── */
  function fmt(n, dec) { return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function zero(el) { el.textContent = el.dataset.pre + fmt(0, +el.dataset.dec) + el.dataset.suf; }
  function count(el, delay) {
    var to = +el.dataset.to, dec = +el.dataset.dec, o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.3, delay: delay || 0, ease: 'power2.out', onUpdate: function () { el.textContent = el.dataset.pre + fmt(o.v, dec) + el.dataset.suf; } });
  }
  // 한 덩어리(차트·카드) 안의 숫자·막대를 한꺼번에 움직임
  function playBlock(block, delay) {
    delay = delay || 0;
    $$('.count', block).forEach(function (el) { count(el, delay); });
    var bars = $$('[data-bar]', block);
    if (bars.length) gsap.fromTo(bars, { scaleX: 0 }, { scaleX: 1, duration: 1, delay: delay, ease: 'power2.out', stagger: .12, transformOrigin: '0% 50%' });
    var cols = $$('[data-col]', block);
    if (cols.length) gsap.fromTo(cols, { scaleY: 0 }, { scaleY: 1, duration: .9, delay: delay, ease: 'power2.out', stagger: .2, transformOrigin: '50% 100%' });
    var labels = $$('.hbar-v', block);
    if (labels.length) gsap.fromTo(labels, { opacity: 0 }, { opacity: 1, duration: .4, delay: delay + .6, stagger: .12 });
    var dots = $$('.waffle i.on', block);
    if (dots.length) gsap.fromTo(dots, { scale: 0 }, { scale: 1, duration: .35, delay: delay + .2, stagger: .07, ease: 'power3.out' });
  }
  function prepBlock(block) {
    $$('.count', block).forEach(zero);
    gsap.set($$('[data-bar]', block), { scaleX: 0, transformOrigin: '0% 50%' });
    gsap.set($$('[data-col]', block), { scaleY: 0, transformOrigin: '50% 100%' });
    gsap.set($$('.hbar-v', block), { opacity: 0 });
    gsap.set($$('.waffle i.on', block), { scale: 0 });
  }
  function onView(el, fn, start) {
    ST.create({ trigger: el, start: start || 'top 82%', once: true, onEnter: fn });
  }

  /* ── 거름망 공 떨어뜨리기 ─────────────────── */
  var sieveTl = null;
  function sieveReset() {
    var S = window.__SIEVE; if (!S) return;
    if (sieveTl) sieveTl.kill();
    S.els.forEach(function (c) { gsap.set(c, { attr: { cx: c._start.x, cy: c._start.y, fill: c._color } }); });
    gsap.set($$('.lc', S.svg), { opacity: 0 });
    gsap.set(S.endT, { opacity: 0 });
    gsap.set($$('.layer-g', S.svg), { opacity: .35 });
  }
  function sievePlay() {
    var S = window.__SIEVE; if (!S) return;
    sieveReset();
    var L = S.layers, CX = S.CX, tl = gsap.timeline();
    gsap.set($$('.layer-g', S.svg), { opacity: 1 });
    S.order.forEach(function (bi, n) {
      var c = S.els[bi], b = c._b, t = gsap.timeline(), jit = ((n * 37) % 11) - 5;
      t.to(c, { attr: { cx: CX + jit, cy: L[0].y - 9 }, duration: .45, ease: 'power2.in' });
      for (var j = 0; j < Math.min(b.layer, 4); j++) t.to(c, { attr: { cy: L[j + 1].y - 9, cx: CX + jit * .5 }, duration: .2, ease: 'power1.in' });
      if (b.layer < 5) t.to(c, { attr: { cx: b.x, cy: b.y }, duration: .4, ease: 'power2.out' });
      else { t.to(c, { attr: { cx: b.x, cy: b.y }, duration: .35, ease: 'power1.in' }); t.set(c, { attr: { fill: 'var(--gold)' } }); }
      tl.add(t, n * .085);
    });
    $$('.lc', S.svg).forEach(function (el, i) { tl.to(el, { opacity: 1, duration: .3 }, .9 + i * .45); });
    tl.to(S.endT, { opacity: 1, duration: .4 }, '>-.1');
    sieveTl = tl;
  }

  /* ── 준비: 글꼴이 들어온 뒤 (줄바꿈이 맞게) ── */
  function ready(fn) {
    var done = false; function go() { if (!done) { done = true; fn(); } }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    setTimeout(go, 1200);
  }

  ready(function () {
    /* 첫 화면 */
    var title = document.querySelector('.h-title');
    gsap.set(title, { visibility: 'visible' });
    var tl = gsap.timeline({ defaults: { ease: EASE } });
    if (Split) {
      var sp = Split.create(title, { type: 'lines', mask: 'lines' });
      tl.from(sp.lines, { yPercent: 105, duration: .9, stagger: .09, onComplete: function () { sp.revert(); } }, .05);
    } else tl.from(title, { opacity: 0, y: 20, duration: .8 }, .05);
    tl.to('.h-a', { opacity: 1, duration: .6 }, .1)
      .fromTo('.tldr li', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .6, stagger: .1 }, .45)
      .fromTo('.h-art', { opacity: 0, y: 30, scale: .94 }, { opacity: 1, y: 0, scale: 1, duration: 1.1 }, .25);

    /* 섹션 제목: 줄마다 올라오기 */
    $$('.sec').forEach(function (sec) {
      var h2 = sec.querySelector('.sec-title'), no = sec.querySelector('.sec-no'), sub = sec.querySelector('.sec-sub');
      var parts = [no, sub].filter(Boolean);
      if (Split && h2) {
        var s = Split.create(h2, { type: 'lines', mask: 'lines' });
        gsap.set(s.lines, { yPercent: 105 });
        gsap.set(parts, { opacity: 0, y: 14 });
        onView(h2, function () {
          gsap.to(s.lines, { yPercent: 0, duration: .85, stagger: .08, ease: EASE, onComplete: function () { s.revert(); } });
          gsap.to(parts, { opacity: 1, y: 0, duration: .6, stagger: .08, delay: .15, ease: EASE });
        }, 'top 86%');
      }
    });

    /* 01 숫자 */
    var flood = document.getElementById('flood');
    prepBlock(flood); onView(flood, function () { playBlock(flood); });
    $$('.stat').forEach(function (s, i) {
      prepBlock(s); gsap.set(s, { opacity: 0, y: 26 });
      onView(s, function () { gsap.to(s, { opacity: 1, y: 0, duration: .7, delay: i * .08, ease: EASE }); playBlock(s, .2 + i * .08); });
    });
    var goalKids = $$('#goal > *'); gsap.set(goalKids, { opacity: 0, y: 20 });
    onView('#goal', function () { gsap.to(goalKids, { opacity: 1, y: 0, duration: .6, stagger: .1, ease: EASE }); });

    /* 02 사례: 양쪽에서 들어오기 */
    var win = $$('#win li'), lose = $$('#lose li');
    gsap.set(win, { opacity: 0, x: -28 }); gsap.set(lose, { opacity: 0, x: 28 });
    onView('.cases', function () {
      gsap.to(win, { opacity: 1, x: 0, duration: .6, stagger: .08, ease: EASE });
      gsap.to(lose, { opacity: 1, x: 0, duration: .6, stagger: .08, delay: .2, ease: EASE });
    });

    /* 03 거름망 */
    sieveReset();
    onView('#funnel', sievePlay, 'center 72%');
    var rp = document.getElementById('replay'); if (rp) rp.addEventListener('click', sievePlay);
    var checks = $$('.check'); gsap.set(checks, { opacity: 0, y: 16 });
    onView('#checks', function () { gsap.to(checks, { opacity: 1, y: 0, duration: .5, stagger: .08, ease: EASE }); });

    /* 04 후보 카드 */
    var ideas = $$('.idea'); gsap.set(ideas, { opacity: 0, y: 30 });
    ST.batch(ideas, { start: 'top 88%', once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: .7, stagger: .1, ease: EASE, overwrite: true }); } });
    window.__onFilter = function (shown) {
      gsap.fromTo(shown, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .45, stagger: .05, ease: EASE, overwrite: true });
      ST.refresh();
    };
    window.__onOpen = function (d) {
      gsap.fromTo(d, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .45, ease: 'power2.out', clearProps: 'height', onComplete: function () { ST.refresh(); } });
      gsap.fromTo($$('li, .dline', d), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: .35, stagger: .04, delay: .1 });
    };
    var lanes = $$('.lane'); gsap.set(lanes, { opacity: 0, y: 12 });
    onView('.lanes', function () { gsap.to(lanes, { opacity: 1, y: 0, duration: .5, stagger: .12, ease: EASE }); });
    var ins = document.getElementById('insider'); gsap.set(ins, { opacity: 0, y: 24 });
    onView(ins, function () { gsap.to(ins, { opacity: 1, y: 0, duration: .7, ease: EASE }); });
    var thirds = $$('#thirds li'); gsap.set(thirds, { opacity: 0, scale: .9 });
    onView('#thirds', function () { gsap.to(thirds, { opacity: 1, scale: 1, duration: .4, stagger: .05, ease: EASE }); });

    /* 05 분야별: 처음 탭은 보일 때, 나머지는 탭을 누를 때 */
    var panels = $$('.panel');
    panels.forEach(function (p) { prepBlock(p); });
    onView('#areaPanels', function () { playBlock(panels[0]); });
    window.__onPanel = function (p) {
      prepBlock(p);
      gsap.fromTo(p, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, ease: EASE });
      playBlock(p, .15);
    };

    /* 06 피할 곳 */
    var av = $$('#avoidList li'); gsap.set(av, { opacity: 0, y: 20 });
    ST.batch(av, { start: 'top 90%', once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: .5, stagger: .07, ease: EASE }); } });

    /* 07 규제: 신호등 켜기 → 금지어 긋기 */
    var lamps = $$('.lamp'), lights = $$('.light');
    gsap.set(lights, { opacity: 0, y: 20 }); gsap.set(lamps, { opacity: .25, scale: .6 });
    onView('#lights', function () {
      gsap.to(lights, { opacity: 1, y: 0, duration: .6, stagger: .15, ease: EASE });
      gsap.to(lamps, { opacity: 1, scale: 1, duration: .45, stagger: .35, delay: .3, ease: 'power3.out' });
    });
    var pairs = $$('.pair'); gsap.set(pairs, { opacity: 0, y: 16 });
    onView('#pairs', function () { gsap.to(pairs, { opacity: 1, y: 0, duration: .5, stagger: .12, ease: EASE }); });
    var words = document.querySelector('.words-row');
    onView(words, function () { words.classList.add('struck'); });
    var gates = $$('#gates li'); gsap.set(gates, { opacity: 0, x: 16 });
    onView('#gates', function () { gsap.to(gates, { opacity: 1, x: 0, duration: .45, stagger: .1, ease: EASE }); });

    /* 08 지원사업 달력 */
    var tlBars = $$('[data-tl]'), today = document.querySelector('.tl-today'), evs = $$('.tl-ev'), tlLabels = $$('.tl-label');
    gsap.set(tlBars, { scaleX: 0, transformOrigin: '0% 50%' }); gsap.set(tlLabels, { opacity: 0 }); gsap.set(evs, { opacity: 0, y: 6 });
    if (today) gsap.set(today, { scaleY: 0, transformOrigin: '50% 0%' });
    onView('#timeline', function () {
      var t = gsap.timeline();
      t.to(tlBars, { scaleX: 1, duration: .8, stagger: .15, ease: 'power2.out' })
       .to(tlLabels, { opacity: 1, duration: .4, stagger: .1 }, .3)
       .to(evs, { opacity: 1, y: 0, duration: .4, stagger: .15 }, .6);
      if (today) t.to(today, { scaleY: 1, duration: .6, ease: 'power2.out' }, .9);
    });
    var more = $$('.warn, #grantMore li, .tl-notes li'); gsap.set(more, { opacity: 0, y: 14 });
    ST.batch(more, { start: 'top 92%', once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: .5, stagger: .06, ease: EASE }); } });

    /* 09 6주: 선을 스크롤에 맞춰 그리기 */
    var fill = document.getElementById('stepsFill');
    if (fill) gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', transformOrigin: '50% 0%', scrollTrigger: { trigger: '#steps', start: 'top 70%', end: 'bottom 60%', scrub: .6 } });
    $$('.step').forEach(function (s) {
      var dot = s.querySelector('.step-dot');
      gsap.set(s, { opacity: 0, x: 24 }); gsap.set(dot, { scale: 0 });
      onView(s, function () { gsap.to(s, { opacity: 1, x: 0, duration: .6, ease: EASE }); gsap.to(dot, { scale: 1, duration: .4, delay: .15, ease: 'power3.out' }); }, 'top 78%');
    });
    var proofs = $$('#proofs li'); gsap.set(proofs, { opacity: 0, y: 14 });
    onView('#proofs', function () { gsap.to(proofs, { opacity: 1, y: 0, duration: .5, stagger: .08, ease: EASE }); });
    var trial = document.getElementById('trial'); prepBlock(trial);
    onView(trial, function () { playBlock(trial); });

    /* 10·11 */
    var un = $$('#unknowns li'); gsap.set(un, { opacity: 0, y: 14 });
    ST.batch(un, { start: 'top 92%', once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: .45, stagger: .06, ease: EASE }); } });
    var ends = $$('.end-card'); gsap.set(ends, { opacity: 0, y: 24 });
    ST.batch(ends, { start: 'top 90%', once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: .6, stagger: .1, ease: EASE }); } });

    // 사진이 늦게 들어와 높이가 바뀌면 위치 다시 계산
    addEventListener('load', function () { ST.refresh(); });
  });
})();
