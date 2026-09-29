/* 더오픈 THE OPEN — 움직임 (4차: 다시 보일 때마다 다시 움직임, 2026-09-29)
   GSAP(ScrollTrigger·SplitText) + 컴퓨터(마우스)에선 Lenis 부드러운 스크롤.
   - 첫 화면: 제목이 줄마다 올라오고(처음 한 번), 도면이 벽 → 바닥 → 가구 → 동선 순서로 그려짐.
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
      it.tl.pause(0);
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

    // 도면: 시트가 놓이고 → 바깥벽 → 안쪽 벽 → 바닥 색 → 가구·방 이름 → 동선 점선과 번호가 차례로.
    // 그리는 부분은 따로 떼어 두고, 화면 밖으로 나갔다 들어오면 다시 그린다
    var sheet = $('[data-sheet]');
    if (sheet) {
      var walls = $$('.p-wall', sheet);
      var floors = $$('.p-floor > *', sheet);
      var furn = $$('.p-furn > *, .p-curtain, .p-room text, .p-entry', sheet);
      var draw = $('.p-draw', sheet);
      var nodes = $$('.p-node', sheet);
      var drawTl = G.timeline({ paused: true })
        .fromTo(walls[0], { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, 0)
        .fromTo(walls[1], { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, 0.55)
        .fromTo(floors, { opacity: 0 }, { opacity: 1, duration: 0.7, stagger: 0.1, ease: 'power1.out' }, 0.85)
        .fromTo(furn, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, stagger: 0.012, ease: 'none' }, 0.95)
        .fromTo(draw, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: 'power1.inOut' }, 1.35);
      // 번호는 점선이 그 자리에 닿을 때 (점선 길이 비율로 계산한 시각)
      [1.92, 2.16, 2.48, 3.4].forEach(function (t, i) {
        drawTl.fromTo(nodes[i], { autoAlpha: 0, scale: 0.4, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'power2.out' }, t);
      });
      intro
        .fromTo(sheet, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.1, clearProps: 'transform' }, 0.3)
        .call(function () { drawTl.play(0); reveal(sheet, drawTl, 92, true); }, null, 0.55);
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
      rise(steps, $('.steps', wrap), 86, { y: 24, stagger: 0.09 });
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
