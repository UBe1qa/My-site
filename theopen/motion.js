/* 더오픈 THE OPEN — 움직임 (4차: 다시 보일 때마다 다시 움직임, 2026-09-29)
   GSAP(ScrollTrigger·SplitText) + 컴퓨터(마우스)에선 Lenis 부드러운 스크롤.
   - 첫 화면: 제목이 줄마다 올라오고(처음 한 번), 도면은 벽이 그어지고 → 바닥·가구가 한 번에 깔리고 →
     환자 한 명(초록 점)이 입구에서 걸어 들어가며 발자국 점선을 남기고, 도착하는 곳마다 번호와 아래 설명이 켜진다.
     점선·번호·설명이 모두 '걸어간 거리' 하나로 움직여 어긋나지 않는다 (5차, 2026-09-29 — 전엔 마스크로 점선을 드러내
     번호와 따로 놀았고, 아이폰 사파리는 마스크를 움직이는 도중 다시 안 그려 끝에 한꺼번에 나타날 수 있었음).
     도면은 화면 밖으로 나갔다가 다시 보이면 다시 그려진다
   - 아래 칸들: 화면 안쪽으로 들어오면 나타나고, 화면 밖으로 완전히 나가면 처음 상태로 되돌려 둔다
     → 위로 올라갔다 다시 내려와도(반대로 올라와도) 또 움직인다 (사용자 요청, 2026-09-29).
     되돌리는 건 화면에 전혀 안 보일 때만이라 깜빡이지 않는다
   - 들어오고 나가는 건 IntersectionObserver로 잰다: 브라우저가 직접 재서 휴대폰에서도 가볍고,
     질문을 열어 페이지 길이가 바뀌어도 따로 다시 잴 필요가 없다
   - 진행 단계 선·영상 재생선·머리 막대처럼 스크롤 위치를 그대로 따라가는 것만 ScrollTrigger
   - 움직이는 건 transform·opacity뿐(자재 막대만 clip-path) — 레이아웃을 다시 계산하지 않아 휴대폰에서도 부드럽다
   - html.anim 이 있을 때만 ('동작 줄이기'면 머리 스크립트가 anim을 안 붙임). 라이브러리가 안 불리면 __unanim()으로 전부 보임
   - 튕기는 효과·마우스 따라 빛·흐르는 띠 같은 꾸밈은 쓰지 않는다 (AI 템플릿 인상) */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('anim')) return;
  var G = window.gsap, ST = window.ScrollTrigger, SPLIT = window.SplitText;
  if (!G || !ST || !SPLIT || !('IntersectionObserver' in window)) { if (window.__unanim) window.__unanim(); return; }
  G.registerPlugin(ST, SPLIT);
  G.config({ nullTargetWarn: false });
  // 휴대폰 주소창이 나왔다 들어갈 때(높이만 바뀜) 전체를 다시 재지 않게
  ST.config({ ignoreMobileResize: true });

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

  /* 첫 화면 도면을 층 네 개로 나눈다: 바닥(원래 그림) / 가구·방 이름 / 벽 / 걷는 동선·번호.
     그림 하나(SVG)는 그 안의 점 하나만 움직여도 매 프레임 전체를 다시 그린다 → 휴대폰에서 걷는 동안 초당 10~15장까지 떨어졌음.
     층마다 따로 그려 두면 움직이는 층만 다시 그리고, 나타나는 층(바닥·가구)은 통째로 흐려졌다 선명해지기만 해서 거의 공짜.
     움직임이 꺼지면(동작 줄이기·라이브러리 실패) 이 함수는 안 불리고 원래 그림 하나 그대로 */
  function layerPlan(sheet) {
    var NS = 'http://www.w3.org/2000/svg';
    var base = sheet.querySelector('.sheet__draw svg');
    if (!base) return null;
    var stack = document.createElement('div');
    stack.className = 'sheet__stack';
    base.parentNode.insertBefore(stack, base);
    stack.appendChild(base);
    base.classList.add('sheet__base');
    function layer(sel) {
      var l = document.createElementNS(NS, 'svg');
      l.setAttribute('viewBox', base.getAttribute('viewBox'));
      l.setAttribute('class', 'sheet__layer');
      l.setAttribute('aria-hidden', 'true');
      l.setAttribute('focusable', 'false');
      Array.prototype.forEach.call(base.querySelectorAll(sel), function (el) { l.appendChild(el); });
      stack.appendChild(l);
      return l;
    }
    return { floor: base, furn: layer('.p-furn, .p-curtain, .p-room, .p-entry'), wall: layer('.p-wall'), walk: layer('.p-path, .p-node') };
  }

  /* 첫 화면 도면의 '걸어가는 동선'.
     점선(.p-path)을 따라 10단위마다 발자국 점을 만들고, 걸어간 거리 d 하나로 점·사람 점·번호·설명을 맞춘다.
     번호 자리는 도면에서 직접 재므로 도면을 다시 그려도 시간을 손으로 다시 계산할 필요가 없다.
     점선 위 위치는 처음에 2단위마다 한 번만 재 두고(매 프레임 다시 재지 않음) 사이는 이어 붙인다 */
  function makeWalk(sheet) {
    var NS = 'http://www.w3.org/2000/svg';
    var route = sheet.querySelector('.p-path');
    var nodes = Array.prototype.slice.call(sheet.querySelectorAll('.p-node'));
    var legend = Array.prototype.slice.call(sheet.querySelectorAll('.sheet__legend .lg'));
    if (!route || !route.getTotalLength || !nodes.length) return null;
    var len = route.getTotalLength();
    var SAMPLE = 2, STEP = 10, SPEED = 820, PAUSE = 0.14;
    var pts = [];
    for (var i = 0; i * SAMPLE < len; i++) pts.push(route.getPointAtLength(i * SAMPLE));
    pts.push(route.getPointAtLength(len));
    function pointAt(dist) {
      var f = Math.max(0, Math.min(dist, len)) / SAMPLE, i0 = Math.min(Math.floor(f), pts.length - 1), i1 = Math.min(i0 + 1, pts.length - 1), k = f - i0;
      return { x: pts[i0].x + (pts[i1].x - pts[i0].x) * k, y: pts[i0].y + (pts[i1].y - pts[i0].y) * k };
    }
    function el(name, cls, attrs) {
      var e = document.createElementNS(NS, name);
      e.setAttribute('class', cls);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }
    var g = el('g', 'p-walk', { 'aria-hidden': 'true' });
    nodes[0].parentNode.insertBefore(g, nodes[0]); // 번호 아래 (도착하면 번호가 사람 점을 덮는다)
    var dots = [];
    for (var d = 0; d <= len + 0.01; d += STEP) {
      var p = pointAt(d);
      var dot = el('circle', 'p-dot', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 2.4 });
      dot.style.opacity = 0;
      g.appendChild(dot);
      dots.push(dot);
    }
    // 번호마다 점선 위 거리 (가장 가까운 곳)
    var at = nodes.map(function (n) {
      var c = n.querySelector('circle'), x = +c.getAttribute('cx'), y = +c.getAttribute('cy'), best = 0, bd = 1e9;
      pts.forEach(function (q, j) {
        var dd = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y);
        if (dd < bd) { bd = dd; best = Math.min(j * SAMPLE, len); }
      });
      return best;
    });
    var rings = nodes.map(function (n) {
      var c = n.querySelector('circle');
      var r = el('circle', 'p-ring', { cx: c.getAttribute('cx'), cy: c.getAttribute('cy'), r: 13 });
      r.style.opacity = 0;
      g.appendChild(r);
      return r;
    });
    var man = el('circle', 'p-walker', { r: 0 });
    g.appendChild(man);
    route.style.opacity = 0; // 점선은 발자국 점이 대신한다 (움직임이 꺼지면 원래 점선이 그대로 보임)

    var shown = 0, pos = { d: 0 };
    function render(dist) {
      var n = dist <= 0 ? 0 : Math.min(dots.length, Math.floor(dist / STEP) + 1);
      if (n !== shown) {
        for (var i = Math.min(n, shown); i < Math.max(n, shown); i++) dots[i].style.opacity = i < n ? 1 : 0;
        shown = n;
      }
      var q = pointAt(dist);
      man.setAttribute('cx', q.x.toFixed(1)); man.setAttribute('cy', q.y.toFixed(1));
    }
    function update() { render(pos.d); }
    render(0);

    function addTo(tl, start) {
      tl.fromTo(man, { attr: { r: 0 } }, { attr: { r: 7.5 }, duration: 0.25, ease: 'power2.out' }, start);
      if (legend.length) tl.fromTo(legend, { opacity: 0.35 }, { opacity: 0.35, duration: 0.01 }, 0);
      var t = start + 0.1, prev = 0;
      var nc = nodes.map(function (n) { return n.querySelector('circle'); }), nt = nodes.map(function (n) { return n.querySelector('text'); });
      at.forEach(function (dist, i) {
        var dur = 0.26 + (dist - prev) / SPEED;
        // 곳마다 천천히 출발해 천천히 멈춘다 (사람이 걷다 서는 것처럼)
        tl.fromTo(pos, { d: prev }, { d: dist, duration: dur, ease: 'sine.inOut', immediateRender: false, onUpdate: update }, t);
        t += dur;
        // 번호: 동그라미만 커지고 숫자는 흐림만 (묶음째 크기를 바꾸면 매 프레임 도면 글자를 다시 배치해 휴대폰에서 버벅였음)
        tl.fromTo(nodes[i], { opacity: 0 }, { opacity: 1, duration: 0.18, ease: 'none' }, t - 0.06)
          .fromTo(nc[i], { attr: { r: 6 } }, { attr: { r: 13 }, duration: 0.4, ease: 'power3.out' }, t - 0.06)
          .fromTo(nt[i], { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' }, t + 0.02)
          .set(rings[i], { opacity: 0.5, attr: { r: 13 } }, t - 0.04) // 되감으면 set이 풀려 다시 안 보임
          .to(rings[i], { opacity: 0, attr: { r: 24 }, duration: 0.7, ease: 'power2.out' }, t - 0.04);
        if (legend[i]) tl.to(legend[i], { opacity: 1, duration: 0.35, ease: 'power1.out' }, t - 0.06);
        prev = dist;
        t += PAUSE;
      });
      // 마지막 곳(치료)에 닿으면 사람 점은 번호 속으로 사라지고, 남은 점선을 끝까지
      tl.to(man, { attr: { r: 0 }, duration: 0.25, ease: 'power2.in' }, t - PAUSE)
        .fromTo(pos, { d: prev }, { d: len, duration: Math.max(0.01, (len - prev) / SPEED), ease: 'none', immediateRender: false, onUpdate: update }, t - PAUSE);
    }
    return { render: render, addTo: addTo };
  }
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
    var headerST = null;
    if (header) {
      headerST = ST.create({
        start: 0, end: 'max',
        onUpdate: function (self) {
          if (self.scroll() < 140 || self.direction === -1) header.classList.remove('is-hidden');
          else if (self.direction === 1) header.classList.add('is-hidden');
        }
      });
      header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
    }

    /* ---------- 다시 움직이게 하는 장치 ----------
       칸 하나 = { el: 지켜볼 요소, tl: 움직임(멈춘 채로 만듦), at: 나타나는 줄(화면 위에서 %) }
       - 지켜볼 요소가 '화면 위 6% ~ at%' 사이에 걸리면 재생
       - 화면 밖으로 완전히 나가면 처음(숨은 상태)으로 되돌림 → 다음에 들어오면 다시 재생 */
    var items = [];
    var resetIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (!e.isIntersecting) forEl(e.target, null, hide); });
    });
    var playIOs = {};
    function playIO(at) {
      if (!playIOs[at]) {
        playIOs[at] = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) forEl(e.target, at, show); });
        }, { rootMargin: '-6% 0px ' + (at - 100) + '% 0px' });
      }
      return playIOs[at];
    }
    function forEl(el, at, fn) {
      items.forEach(function (it) { if (it.el === el && (at === null || it.at === at)) fn(it); });
    }
    function targetsOf(tl) {
      var out = [];
      (tl.getChildren ? tl.getChildren(true, true, false) : [tl]).forEach(function (c) { out = out.concat(c.targets()); });
      return out.filter(function (t) { return t && t.nodeType === 1; });
    }
    function holdsFocus(it) {
      var a = document.activeElement;
      return !!a && a !== document.body && it.targets.some(function (t) { return t.contains(a); });
    }
    function show(it) {
      if (it.state !== 'hidden') return;
      it.state = 'playing';
      it.tl.play(0);
    }
    function hide(it) {
      if (it.state === 'hidden' || holdsFocus(it)) return; // 입력 중인 신청서 같은 곳은 되돌리지 않는다
      it.state = 'hidden';
      it.tl.pause(0);            // 되돌릴 땐 onUpdate가 불리지 않으므로(GSAP 기본) 따로 챙길 게 있으면 onReset
      if (it.onReset) it.onReset();
    }
    function useTl(it, tl) {
      it.tl = tl;
      it.targets = targetsOf(tl);
      tl.eventCallback('onComplete', function () { it.state = 'shown'; });
    }
    // live: 이미 재생 중인 움직임(첫 화면 도면)을 이어받을 때
    function reveal(el, tl, at, live) {
      if (!el || !tl) return null;
      var it = { el: el, at: at || 85, state: live ? 'playing' : 'hidden' };
      useTl(it, tl);
      if (!live) tl.pause(0);
      items.push(it);
      playIO(it.at).observe(el);
      resetIO.observe(el);
      return it;
    }
    // 살짝 올라오며 나타나기
    function rise(targets, trigger, at, extra) {
      var list = (typeof targets === 'string' ? $$(targets) : [].concat(targets)).filter(Boolean);
      var el = typeof trigger === 'string' ? $(trigger) : trigger;
      if (!list.length || !el) return null;
      var vars = { opacity: 0, y: 18, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' };
      if (extra) for (var k in extra) vars[k] = extra[k];
      return reveal(el, G.timeline().from(list, vars), at);
    }

    /* 3) 첫 화면 (제목·버튼은 처음 한 번만) */
    var intro = G.timeline({ defaults: { ease: 'power3.out' } });
    var h1 = $('.hero h1');
    var h1Split = SPLIT.create(h1, { type: 'lines', mask: 'lines', linesClass: 'ln' });
    intro
      .fromTo(header, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.8, clearProps: 'transform' }, 0)
      .set(h1, { autoAlpha: 1 }, 0.1)
      .from(h1Split.lines, { yPercent: 105, duration: 1.1, stagger: 0.12, ease: 'expo.out', onComplete: function () { h1Split.revert(); } }, 0.1)
      .fromTo('.hero__lead', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.45)
      .fromTo('.hero__actions > *', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, clearProps: 'transform' }, 0.6);

    // 도면: 벽 → 바닥·가구(한 번에) → 환자가 걸어가는 동선. 화면 밖으로 나갔다 들어오면 다시 그린다
    var sheet = $('[data-sheet]');
    if (sheet) {
      var L = layerPlan(sheet);
      var walls = $$('.p-wall', sheet);
      var walk = makeWalk(sheet);
      var drawTl = G.timeline({ paused: true })
        .fromTo(walls[0], { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 0)
        .fromTo(walls[1], { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, 0.1)
        // 바닥과 가구는 방마다 따로가 아니라 층째 한 번에 (다시 그리지 않고 흐림만 바뀜)
        .fromTo(L ? L.floor : $('.p-floor', sheet), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 0.3)
        .fromTo(L ? L.furn : $$('.p-furn, .p-curtain, .p-room, .p-entry', sheet), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 0.45);
      if (walk) walk.addTo(drawTl, 0.65);
      intro
        .fromTo(sheet, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, clearProps: 'transform' }, 0.2)
        .call(function () {
          drawTl.play(0);
          var it = reveal(sheet, drawTl, 92, true);
          if (it && walk) it.onReset = function () { walk.render(0); };
        }, null, 0.3);
    }

    /* 4) 섹션 제목: 줄마다 아래에서 올라옴.
       다시 움직이려면 줄을 나눈 채로 둔다 → 화면 읽기 프로그램은 제목 전체(aria-label)를 읽고 줄 조각은 건너뜀.
       창 너비가 바뀌면 줄을 다시 나누고 움직임도 새로 만든다. (SplitText autoSplit은 글꼴 조각이 새로 들어올 때마다
       — 질문을 처음 열 때 등 — 제목 전부를 다시 나눠서 쓰지 않고, 너비가 바뀔 때만 직접 다시 나눈다) */
    var titles = [];
    $$('.sec__title, .band__title').forEach(function (title) {
      title.setAttribute('aria-label', (title.innerText || title.textContent).replace(/\s+/g, ' ').trim());
      var t = { el: title, split: null, width: 0, it: null };
      t.make = function () {
        t.split = SPLIT.create(title, { type: 'lines', mask: 'lines', linesClass: 'ln', aria: 'none' });
        t.split.lines.forEach(function (l) { l.setAttribute('aria-hidden', 'true'); });
        t.width = title.offsetWidth;
        return G.timeline({ paused: true }).from(t.split.lines, { yPercent: 105, duration: 1, stagger: 0.09, ease: 'expo.out' });
      };
      t.it = reveal(title, t.make(), 88);
      titles.push(t);
    });
    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        titles.forEach(function (t) {
          if (t.el.offsetWidth === t.width) return;
          var it = t.it, time = it.tl.totalTime(), state = it.state;
          it.tl.revert();
          t.split.revert();
          var tl = t.make();
          useTl(it, tl);
          if (state !== 'hidden') tl.totalTime(state === 'shown' ? tl.totalDuration() : time);
          if (state === 'playing') tl.play();
        });
      }, 200);
    });

    /* 5) 상담에서 정하는 세 가지: 윗선이 그어지고 글이 뒤따라 올라옴 */
    var pointsEl = $('.points');
    if (pointsEl) {
      reveal(pointsEl, G.timeline()
        .fromTo($$('.point', pointsEl), { '--ln': 0 }, { '--ln': 1, duration: 1.1, stagger: 0.14, ease: 'power3.inOut' }, 0)
        .from($$('.point h3, .point p', pointsEl), { opacity: 0, y: 14, duration: 0.8, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' }, 0.2), 84);
    }

    /* 6) 진행 과정: 단계가 올라오고, 스크롤을 따라 선이 이어지며 번호가 하나씩 켜짐 */
    var wrap = $('.steps-wrap');
    if (wrap) {
      var trackEl = $('.steps__track', wrap), fillEl = $('.steps__fill', wrap);
      var steps = $$('.step', wrap), nos = $$('.step__no', wrap);
      var dir = 'y', lastOn = -1;
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
      rise(steps, $('.steps', wrap), 86, { y: 24, stagger: 0.09 });
      ST.create({
        trigger: wrap, start: 'top 70%', end: 'bottom 62%', scrub: 0.4,
        onRefresh: layout,
        onUpdate: function (self) {
          var p = self.progress;
          fillEl.style.transform = dir === 'x' ? 'scaleX(' + p + ')' : 'scaleY(' + p + ')';
          var on = 0;
          steps.forEach(function (s, i) { if (p > 0.001 && p >= i / (steps.length - 1) - 0.02) on = i + 1; });
          if (on !== lastOn) { steps.forEach(function (s, i) { s.classList.toggle('is-on', i < on); }); lastOn = on; }
        }
      });
    }

    /* 7) 영상 띠: 편집 조각이 펼쳐지고, 스크롤을 따라 재생선이 지나감 */
    var bandST = null;
    if ($('.band')) {
      reveal($('.band__in'), G.timeline()
        .from('.band__art', { opacity: 0, y: 10, duration: 0.7, ease: 'power3.out', clearProps: 'transform' })
        .from('.band .v-clip', { scaleX: 0, transformOrigin: '0% 50%', duration: 0.6, stagger: 0.08, ease: 'power3.out' }, 0.1)
        .from('.band__text p, .band__btn', { opacity: 0, y: 12, duration: 0.7, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' }, 0.15), 86);
      bandST = G.fromTo('.band .v-head', { x: -150 }, { x: 214, ease: 'none', scrollTrigger: { trigger: '.band', start: 'top 92%', end: 'bottom 15%', scrub: 0.6 } }).scrollTrigger;
    }

    /* 8) 칸 안내 한 줄 · 작은 제목 */
    $$('.sec__lead').forEach(function (el) { rise(el, el, 90); });
    // 지켜볼 요소는 움직이는 요소를 모두 품어야 한다 (일부만 품으면 나머지가 보이는 채로 되돌려져 깜빡임)
    $$('.sub__head').forEach(function (h) { rise($$('.sub__kicker, .sub__title', h), h, 88); });

    // 순서 비교: 왼쪽(디자인 먼저) → 오른쪽(예산 먼저), 오른쪽 단계는 하나씩
    var flows = $('.flows');
    if (flows) {
      reveal(flows, G.timeline()
        .from('.flow--off', { opacity: 0, y: 18, duration: 0.7, ease: 'power3.out', clearProps: 'transform' })
        .from('.flow--on', { opacity: 0, y: 18, duration: 0.7, ease: 'power3.out', clearProps: 'transform' }, 0.25)
        .from('.flow--on .flow__steps li', { opacity: 0, x: -10, duration: 0.5, stagger: 0.18, ease: 'power2.out', clearProps: 'transform' }, 0.6)
        .from('.flow--on .flow__end', { opacity: 0, duration: 0.6 }, 1.2), 80);
    }

    // 자재 막대: 칸이 왼쪽부터 차오르고(글자는 찌그러지지 않게 잘라서 드러냄), 설명이 뒤따름
    var barsEl = $('[data-bars]');
    if (barsEl) {
      var bars = G.timeline();
      $$('.bars__row', barsEl).forEach(function (row, r) {
        bars.fromTo($$('.seg', row), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.55, stagger: 0.14, ease: 'power2.out', clearProps: 'clipPath' }, r * 0.95)
          .from($$('.bars__note', row), { opacity: 0, y: 8, duration: 0.5, ease: 'power2.out', clearProps: 'transform' }, r * 0.95 + 0.65);
      });
      bars.from('.bars__tag', { opacity: 0, duration: 0.4 }, 1.7);
      reveal(barsEl, bars, 78);
    }

    // 공간마다 살필 것: 칸 글자 → (휴대폰) 칸 속 작은 평면이 올라오고 그 공간이 칠해짐
    $$('.zone').forEach(function (z) {
      var tl = G.timeline().from($$('.zone__no, h4, li', z), { opacity: 0, y: 18, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' });
      var crop = $('.zone__crop', z);
      if (crop) {
        tl.from(crop, { opacity: 0, y: 18, duration: 0.8, ease: 'power3.out', clearProps: 'transform' }, 0.25)
          .from($$('.z.is-on', crop), { opacity: 0, duration: 0.7, ease: 'power1.out' }, 0.8);
      }
      reveal(z, tl, 82);
    });
    rise('.space__fig', '.space__fig', 80);
    rise('.inline-cta', '.inline-cta', 90);

    // 개원/리뉴얼 · 진행 과정 아래 여섯 가지 · 상담 칸의 준비할 것
    rise('.track', '.tracks', 82, { stagger: 0.12 });
    rise('.promise__title, .promise li', '.promise', 86, { stagger: 0.06 });
    rise('.prep li, .prep__note', '.prep', 88, { stagger: 0.06 });

    /* 9) 자주 묻는 질문 · 상담 · 바닥글 */
    rise('.faq__list details', '.faq__list', 86, { y: 16, duration: 0.7, stagger: 0.07 });
    rise('.contact__lead', '.contact__lead', 86, { y: 16 });
    rise('.direct li', '.direct', 86, { y: 16, stagger: 0.08 });
    // 신청서는 페이지 안 링크가 곧장 오는 곳이라 위치를 옮기지 않고(y 없이) 흐리게만 나타나게
    reveal($('.inquiry'), G.timeline().from('.inquiry', { opacity: 0, duration: 0.9, ease: 'power2.out' }), 92);
    rise('.footer__in > *', '.footer__in', 96, { y: 16, stagger: 0.1 });

    /* 숨긴 칸은 visibility가 아니라 opacity로만 숨긴다 (키보드로 넘어가도 건너뛰지 않게).
       아직 나타나지 않은 칸 안으로 초점이 들어오면 그 움직임을 바로 끝낸다 */
    document.addEventListener('focusin', function (e) {
      items.forEach(function (it) {
        if (it.state === 'shown') return;
        if (it.targets.some(function (t) { return t.contains(e.target); })) { it.state = 'shown'; it.tl.progress(1); }
      });
    });
    // 인쇄할 땐 전부 보이게
    window.addEventListener('beforeprint', function () {
      items.forEach(function (it) { it.state = 'shown'; it.tl.progress(1); });
    });

    // 질문을 열고 닫으면 아래쪽 길이가 바뀐다. 나타나는 시점은 IntersectionObserver라 그대로 맞고,
    // 스크롤을 따라가는 것(영상 재생선·머리 막대) 두 개만 다시 잰다 — 전체 refresh는 35개를 다시 재느라 멈칫했음
    $$('.faq__list details').forEach(function (d) {
      d.addEventListener('toggle', function () {
        requestAnimationFrame(function () {
          if (bandST) bandST.refresh();
          if (headerST) headerST.refresh();
        });
      });
    });

    requestAnimationFrame(function () { ST.refresh(); });
  }
})();
