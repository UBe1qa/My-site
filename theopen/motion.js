/* 더오픈 THE OPEN — 움직임 (2차: 절제된 움직임, 2026-09-29)
   GSAP(ScrollTrigger·SplitText) + 컴퓨터(마우스)에선 Lenis 부드러운 스크롤.
   - 첫 화면: 제목이 줄마다 올라오고, 도면이 실제로 그려지듯 벽 → 가구 → 동선 순서로 나타남
   - 아래로: 섹션 제목이 줄마다 올라오고, 선이 그어지고, 진행 단계는 스크롤을 따라 하나씩 켜짐
   - 3차(내용 늘림): 순서 비교는 오른쪽 단계가 하나씩, 자재 막대는 왼쪽부터 차오름, 나머지 칸은 살짝 올라옴
   - html.anim 이 있을 때만 움직인다 ('동작 줄이기'면 머리 스크립트가 anim을 안 붙임)
   - 라이브러리가 안 불리면 __unanim()으로 모든 내용을 그대로 보여 준다
   - 튕기는 효과·마우스 따라 빛·흐르는 띠 같은 꾸밈은 쓰지 않는다 (AI 템플릿 인상) */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('anim')) return;
  var G = window.gsap, ST = window.ScrollTrigger, SPLIT = window.SplitText;
  if (!G || !ST || !SPLIT) { if (window.__unanim) window.__unanim(); return; }
  G.registerPlugin(ST, SPLIT);

  var started = false;
  function start() {
    if (started) return;
    started = true;
    window.__motionReady = true;
    try { init(); } catch (err) {
      if (window.__unanim) window.__unanim();
      G.set('[style*="opacity"], [style*="visibility"]', { clearProps: 'opacity,visibility,transform' });
      throw err;
    }
  }
  // 글꼴이 다 들어온 뒤에 줄을 나눠야 줄바꿈이 맞다 (늦어도 1.2초 뒤엔 시작)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  setTimeout(start, 1200);

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function init() {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var header = $('.site-header');

    /* 1) 부드러운 스크롤 — 컴퓨터(마우스)에서만. 휴대폰은 원래 스크롤 그대로 */
    if (fine && window.Lenis) {
      var lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on('scroll', ST.update);
      G.ticker.add(function (time) { lenis.raf(time * 1000); });
      G.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach(function (a) {
        if (a.classList.contains('skip')) return; // '본문 바로가기'는 원래 동작(초점 이동)대로
        a.addEventListener('click', function (e) {
          var id = a.getAttribute('href');
          var target = (id === '#' || id === '#top') ? 0 : document.querySelector(id);
          if (target === null) return;
          e.preventDefault();
          // Lenis가 CSS scroll-padding-top(머리 막대 높이)을 이미 빼 주므로 offset은 0
          lenis.scrollTo(target, { duration: 1.2 });
        });
      });
    }

    /* 2) 머리 막대: 내려가면 숨고, 올라가면 나타남 */
    if (header) {
      ST.create({
        start: 0, end: 'max',
        onUpdate: function (self) {
          if (self.scroll() < 140 || self.direction === -1) header.classList.remove('is-hidden');
          else if (self.direction === 1) header.classList.add('is-hidden');
        }
      });
      header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
    }

    /* 3) 첫 화면 */
    var intro = G.timeline({ defaults: { ease: 'power3.out' } });
    var h1 = $('.hero h1');
    var h1Split = SPLIT.create(h1, { type: 'lines', mask: 'lines', linesClass: 'ln' });
    intro
      .fromTo(header, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.8, clearProps: 'transform' }, 0)
      .set(h1, { autoAlpha: 1 }, 0.1)
      .from(h1Split.lines, { yPercent: 105, duration: 1.1, stagger: 0.12, ease: 'expo.out', onComplete: function () { h1Split.revert(); } }, 0.1)
      .fromTo('.hero__lead', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.45)
      .fromTo('.hero__actions > *', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, clearProps: 'transform' }, 0.6);

    // 도면: 시트가 놓이고 → 바깥벽 → 안쪽 벽 → 가구·방 이름 → 동선 점선과 번호가 차례로
    var sheet = $('[data-sheet]');
    if (sheet) {
      var walls = $$('.p-wall', sheet);
      var furn = $$('.p-furn > *, .p-curtain, .p-room text, .p-entry', sheet);
      var draw = $('.p-draw', sheet);
      var nodes = $$('.p-node', sheet);
      G.set(walls, { strokeDasharray: '1 1', strokeDashoffset: 1 });
      G.set(draw, { strokeDashoffset: 1 });
      G.set(furn, { autoAlpha: 0 });
      G.set(nodes, { autoAlpha: 0, scale: 0.4, transformOrigin: '50% 50%' });
      intro
        .fromTo(sheet, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.1, clearProps: 'transform' }, 0.3)
        .to(walls[0], { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, 0.55)
        .to(walls[1], { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, 1.1)
        .to(furn, { autoAlpha: 1, duration: 0.5, stagger: 0.012, ease: 'none' }, 1.5)
        .to(draw, { strokeDashoffset: 0, duration: 2.2, ease: 'power1.inOut' }, 1.9);
      // 번호는 점선이 그 자리에 닿을 때 (점선 길이 비율로 계산한 시각)
      [2.63, 2.85, 3.21, 4.1].forEach(function (t, i) {
        intro.to(nodes[i], { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'power2.out' }, t - 0.15);
      });
    }

    /* 4) 섹션 제목: 줄마다 아래에서 올라옴 */
    $$('.sec__title, .band__title').forEach(function (title) {
      var s = SPLIT.create(title, { type: 'lines', mask: 'lines', linesClass: 'ln' });
      G.from(s.lines, {
        yPercent: 105, duration: 1, stagger: 0.09, ease: 'expo.out',
        scrollTrigger: { trigger: title, start: 'top 88%' },
        onComplete: function () { s.revert(); }
      });
    });

    /* 5) 차이점: 윗선이 그어지고 글이 뒤따라 올라옴 */
    var points = $$('.point');
    if (points.length) {
      G.timeline({ scrollTrigger: { trigger: '.points', start: 'top 84%' } })
        .fromTo(points, { '--ln': 0 }, { '--ln': 1, duration: 1.1, stagger: 0.14, ease: 'power3.inOut' }, 0)
        .from($$('.point h3, .point p'), { opacity: 0, y: 14, duration: 0.8, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' }, 0.2);
    }

    /* 6) 진행 과정: 스크롤을 따라 선이 이어지고 번호가 하나씩 켜짐 */
    var wrap = $('.steps-wrap');
    if (wrap) {
      var trackEl = $('.steps__track', wrap), fillEl = $('.steps__fill', wrap);
      var steps = $$('.step', wrap), nos = $$('.step__no', wrap);
      var dir = 'y';
      // 번호 동그라미 가운데끼리 잇는 선 (transform 영향 없는 offset 값으로 잰다)
      var layout = function () {
        var a = nos[0], b = nos[nos.length - 1];
        var ax = a.parentNode.offsetLeft + a.offsetLeft + a.offsetWidth / 2, ay = a.parentNode.offsetTop + a.offsetTop + a.offsetHeight / 2;
        var bx = b.parentNode.offsetLeft + b.offsetLeft + b.offsetWidth / 2, by = b.parentNode.offsetTop + b.offsetTop + b.offsetHeight / 2;
        dir = Math.abs(ay - by) < 4 ? 'x' : 'y';
        trackEl.style.left = ax + 'px';
        trackEl.style.top = ay + 'px';
        trackEl.style.width = dir === 'x' ? (bx - ax) + 'px' : '1px';
        trackEl.style.height = dir === 'y' ? (by - ay) + 'px' : '1px';
      };
      layout();
      G.from(steps, { opacity: 0, y: 24, duration: 0.8, stagger: 0.09, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: wrap, start: 'top 86%' } });
      ST.create({
        trigger: wrap, start: 'top 70%', end: 'bottom 62%', scrub: 0.4,
        onRefresh: layout,
        onUpdate: function (self) {
          var p = self.progress;
          fillEl.style.transform = dir === 'x' ? 'scaleX(' + p + ')' : 'scaleY(' + p + ')';
          steps.forEach(function (s, i) { s.classList.toggle('is-on', p > 0.001 && p >= i / (steps.length - 1) - 0.02); });
        }
      });
    }

    /* 7) 영상 띠: 편집 조각이 펼쳐지고, 스크롤을 따라 재생선이 지나감 */
    if ($('.band')) {
      G.timeline({ scrollTrigger: { trigger: '.band', start: 'top 86%' } })
        .from('.band__art', { opacity: 0, y: 10, duration: 0.7, ease: 'power3.out' })
        .from('.band .v-clip', { scaleX: 0, transformOrigin: '0% 50%', duration: 0.6, stagger: 0.08, ease: 'power3.out' }, 0.1)
        .from('.band__text p, .band__btn', { opacity: 0, y: 12, duration: 0.7, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' }, 0.15);
      G.fromTo('.band .v-head', { x: -150 }, { x: 214, ease: 'none', scrollTrigger: { trigger: '.band', start: 'top 92%', end: 'bottom 15%', scrub: 0.6 } });
    }

    /* 7-1) 3차에 늘린 칸들: 살짝 올라오며 나타남 (내용은 그대로, 움직임만) */
    var rise = function (targets, trigger, start, extra) {
      var list = typeof targets === 'string' ? $$(targets) : [].concat(targets);
      if (!list.length) return;
      var vars = { opacity: 0, y: 18, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'transform',
        scrollTrigger: { trigger: trigger, start: start || 'top 85%' } };
      if (extra) for (var k in extra) vars[k] = extra[k];
      G.from(list, vars);
    };
    $$('.sec__lead').forEach(function (el) { rise(el, el, 'top 90%'); });

    // 순서 비교: 왼쪽(디자인 먼저) → 오른쪽(예산 먼저), 오른쪽 단계는 하나씩
    if ($('.flows')) {
      G.timeline({ scrollTrigger: { trigger: '.flows', start: 'top 80%' } })
        .from('.flow--off', { opacity: 0, y: 18, duration: 0.7, ease: 'power3.out', clearProps: 'transform' })
        .from('.flow--on', { opacity: 0, y: 18, duration: 0.7, ease: 'power3.out', clearProps: 'transform' }, 0.25)
        .from('.flow--on .flow__steps li', { opacity: 0, x: -10, duration: 0.5, stagger: 0.18, ease: 'power2.out', clearProps: 'transform' }, 0.6)
        .from('.flow--on .flow__end', { opacity: 0, duration: 0.6 }, 1.2);
    }

    // 자재 막대: 칸이 왼쪽부터 차오르고(글자는 찌그러지지 않게 잘라서 드러냄), 설명이 뒤따름
    if ($('[data-bars]')) {
      var bars = G.timeline({ scrollTrigger: { trigger: '[data-bars]', start: 'top 78%' } });
      $$('.bars__row').forEach(function (row, r) {
        bars.fromTo($$('.seg', row), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.55, stagger: 0.14, ease: 'power2.out', clearProps: 'clipPath' }, r * 0.95)
          .from($$('.bars__note', row), { opacity: 0, y: 8, duration: 0.5, ease: 'power2.out', clearProps: 'transform' }, r * 0.95 + 0.65);
      });
      bars.from('.bars__tag', { opacity: 0, duration: 0.4 }, 1.7);
    }

    // 공간마다 살필 것: 칸 글자와 평면
    $$('.sub').forEach(function (s) { rise($$('.sub__kicker, .sub__title', s), s, 'top 85%'); });
    $$('.zone').forEach(function (z) { rise($$('.zone__no, h4, li', z), z, 'top 82%'); });
    rise('.space__fig', '.space', 'top 75%');
    rise('.inline-cta', '.inline-cta', 'top 90%');

    // 개원/리뉴얼 · 진행 과정 아래 여섯 가지 · 상담 칸의 준비할 것
    rise('.track', '.tracks', 'top 82%', { stagger: 0.12 });
    rise('.promise li', '.promise', 'top 85%', { stagger: 0.06 });
    rise('.prep li, .prep__note', '.prep', 'top 88%', { stagger: 0.06 });

    /* 8) 자주 묻는 질문 · 상담 · 바닥글 */
    G.from('.faq__list details', { opacity: 0, y: 16, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: '.faq__list', start: 'top 86%' } });
    G.from('.contact__lead, .direct li', { opacity: 0, y: 16, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: '.contact__intro', start: 'top 80%' } });
    // 신청서는 페이지 안 링크가 곧장 오는 곳이라 위치를 옮기지 않고(y 없이) 흐리게만 나타나게
    G.from('.inquiry', { opacity: 0, duration: 0.9, ease: 'power2.out', scrollTrigger: { trigger: '.inquiry', start: 'top 90%' } });
    G.from('.footer__in > *', { opacity: 0, y: 16, duration: 0.8, stagger: 0.1, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: '.site-footer', start: 'top 95%' } });
    // 아래 칸들은 visibility가 아니라 opacity로만 숨겨 둔다 (키보드로 넘어가도 건너뛰지 않게).
    // 아직 나타나지 않은 칸 안으로 초점이 들어오면 그 움직임을 바로 끝낸다.
    document.addEventListener('focusin', function (e) {
      ST.getAll().forEach(function (st) {
        var a = st.animation;
        if (!a || a.progress() === 1) return;
        var targets = a.targets ? a.targets() : [];
        if (a.getChildren) a.getChildren(true, true, false).forEach(function (c) { targets = targets.concat(c.targets()); });
        if (targets.some(function (t) { return t && t.contains && t.contains(e.target); })) a.progress(1);
      });
    });

    // 질문을 열고 닫을 때 ScrollTrigger.refresh()는 하지 않는다 (35개를 다시 재느라 순간 멈칫함.
    // 아래 칸들의 나타나는 위치가 답 길이만큼 조금 일찍 잡힐 뿐이라 문제없음)

    requestAnimationFrame(function () { ST.refresh(); });
  }
})();
