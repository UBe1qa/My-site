/* 캐슬업! 소개 사이트 — 쿵 내려앉는 칸, 첫 화면 한 번의 자동 사격, 원정 막대, 보스 수배 전단 넘기기,
   스크롤만큼 자라는 성(아래 고정 줄). 보일 때만 움직이고, 움직임 줄이기면 움직임 없이 다 보인다. 외부 라이브러리 없음. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  function watch(els, fn, opt) {
    if (!hasIO) { els.forEach(function (el) { fn(el, true, null, null); }); return null; }
    var o = new IntersectionObserver(function (es) { es.forEach(function (e) { fn(e.target, e.isIntersecting, o, e); }); }, opt);
    els.forEach(function (el) { o.observe(el); });
    return o;
  }

  /* 보일 때만 움직이기: 화면 밖 칸의 반복 움직임(보스 둥실, 깃발, 단추 반짝임)은 CSS에서 멈춘다 */
  watch($$('[data-live]'), function (el, on) { el.classList.toggle('is-live', on); });

  /* 루멘랩 칸: 60% 넘게 보이면 돌 다섯이 쌓여 망루가 되고 깃발이 오른다(1.8초, 한 번). 나갔다 6초 뒤 다시 들어오면 다시 */
  var lumen = $('#lumen');
  if (lumen && hasIO && !reduce) {
    var lumenAt = 0;
    lumen.classList.add('arm');
    new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || es[0].intersectionRatio < .6 || document.hidden) return;
      if (lumenAt && Date.now() - lumenAt < 6000) return;
      lumenAt = Date.now();
      lumen.classList.remove('in'); void lumen.offsetWidth; lumen.classList.add('in');
    }, { threshold: [0, .6] }).observe(lumen);
  }

  /* 먼지 */
  function puff(host, n) {
    if (reduce) return;
    var w = host.getBoundingClientRect().width;
    for (var k = 0; k < n; k++) {
      var s = document.createElement('i'); s.className = 'puff';
      s.style.left = ((k % 2 ? w * .12 : w * .88) + (Math.random() * 20 - 10)) + 'px'; s.style.bottom = '-6px';
      s.style.setProperty('--px', (k % 2 ? -1 : 1) * (10 + Math.random() * 24) + 'px');
      s.style.setProperty('--py', (-6 - Math.random() * 14) + 'px');
      host.appendChild(s); setTimeout(function (x) { x.remove(); }, 650, s);
    }
  }

  /* 색종이(꼭대기, 한 번) */
  function burst(host) {
    if (reduce) return;
    var cols = ['#FFD866', '#F2A55E', '#C27BFF', '#7FD0FF', '#FF8A4C', '#FFF0A6'];
    setTimeout(function () {
      for (var k = 0; k < 42; k++) {
        var c = document.createElement('i'); c.className = 'confetti';
        c.style.left = (40 + Math.random() * 20) + '%'; c.style.top = '18%'; c.style.background = cols[k % cols.length];
        c.style.setProperty('--x', (Math.random() * 320 - 160) + 'px');
        c.style.setProperty('--y', (120 + Math.random() * 260) + 'px');
        c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
        c.style.setProperty('--d', (1.2 + Math.random() * 1.2) + 's');
        host.appendChild(c); setTimeout(function (x) { x.remove(); }, 2600, c);
      }
    }, 700);
  }

  /* 칸이 보이면 쿵(한 번) */
  watch($$('.drop'), function (el, on, o) {
    if (!on && !reduce) return;
    el.classList.add('in'); if (o) o.unobserve(el);
    if (el.classList.contains('room')) el.addEventListener('animationend', function () { puff(el, 4); }, { once: true });
    if (el.id === 'trips') el.classList.add('run');
    if (el.id === 'summit') burst(el);
  }, { threshold: .2, rootMargin: '0px 0px -6% 0px' });

  /* ── 첫 화면: 성이 알아서 쏘는 장면을 한 번만(짧게). 그 뒤로는 멈춘 키 아트 ── */
  var stage = $('#stage'), fx = $('#fx'), boss = $('#boss'), hp = $('#hp');
  var REST = .62;
  function introDone() { hp.style.transform = 'scaleX(' + REST + ')'; }
  if (stage && boss && hp) {
    if (reduce || !hasIO || !Element.prototype.animate) introDone();
    else {
      var started = false;
      var so = new IntersectionObserver(function (es) {
        so.disconnect();
        if (!es[0].isIntersecting) { introDone(); return; }
        if (started) return; started = true;
        setTimeout(volley, 500);
      }, { threshold: .3 });
      so.observe(stage);
    }
  }
  function pt(el, ax, ay) {
    var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return [r.left - s.left + r.width * ax, r.top - s.top + r.height * ay];
  }
  function volley() {
    var rooms = $$('.tw-hero .room img', stage); // 위층부터: 천사, 얼음 마녀, 궁수
    if (rooms.length < 3) { introDone(); return; }
    var weak = boss.dataset.weak, pop = fx.dataset.pop;
    var seq = [[rooms[2], .91], [rooms[1], .79], [rooms[0], .72], [rooms[1], REST]];
    seq.forEach(function (q, k) {
      setTimeout(function () {
        var from = q[0], el = from.dataset.el, c = 'var(--' + el + ')';
        var a = pt(from, .75, .3), b = pt(boss, .32 + Math.random() * .2, .42 + Math.random() * .16);
        var p = document.createElement('span'); p.className = 'shot'; p.style.setProperty('--c', c); fx.appendChild(p);
        var mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 50;
        p.animate([{ transform: 'translate(' + a[0] + 'px,' + a[1] + 'px) scale(.6)' }, { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1)' },
          { transform: 'translate(' + b[0] + 'px,' + b[1] + 'px) scale(1.1)' }], { duration: 460, easing: 'cubic-bezier(.3,0,.7,1)' }).onfinish = function () {
          p.remove();
          for (var n = 0; n < 7; n++) {
            var s = document.createElement('span'); s.className = 'spark'; s.style.setProperty('--c', c);
            s.style.left = b[0] + 'px'; s.style.top = b[1] + 'px'; fx.appendChild(s);
            var ang = Math.random() * 6.28, d = 16 + Math.random() * 22;
            s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(ang) * d + 'px,' + Math.sin(ang) * d + 'px) scale(.2)', opacity: 0 }],
              { duration: 380, easing: 'ease-out' }).onfinish = function () { this.effect.target.remove(); };
          }
          boss.classList.add('hit'); setTimeout(function () { boss.classList.remove('hit'); }, 110);
          hp.style.transform = 'scaleX(' + q[1] + ')';
          if (el === weak) {
            var t = document.createElement('span'); t.className = 'pop'; t.textContent = pop; t.style.setProperty('--c', c);
            t.style.left = b[0] + 'px'; t.style.top = (b[1] - 20) + 'px'; fx.appendChild(t);
            t.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: 'translate(-50%,-90%) scale(1.15)', opacity: 1, offset: .3 },
              { transform: 'translate(-50%,-160%) scale(1)', opacity: 0 }], { duration: 900, easing: 'ease-out' }).onfinish = function () { t.remove(); };
          }
        };
      }, k * 380);
    });
  }

  /* ── 켜 둔 동안: 실제 게임 영상, 보일 때만 재생 ── */
  var vid = $('#vid');
  if (vid) {
    if (reduce) { vid.controls = true; }
    else watch([vid], function (el, on) {
      if (on) { var pr = el.play(); if (pr && pr.catch) pr.catch(function () { el.controls = true; }); } else el.pause();
    }, { threshold: .35 });
  }

  /* ── 보스 수배 전단: 앞뒤 단추, 넘기면 약점 도장 '쾅' ── */
  var board = $('#board');
  if (board) {
    var posters = $$('.poster', board), prev = $('#prev'), next = $('#next'), count = $('#count');
    var step = function () { return posters.length > 1 ? posters[1].offsetLeft - posters[0].offsetLeft : board.clientWidth; };
    var maxL = function () { return board.scrollWidth - board.clientWidth; };
    var ticking = false;
    function sync() {
      ticking = false;
      var i = Math.min(posters.length - 1, Math.round(board.scrollLeft / step()));
      count.textContent = (i + 1) + ' / ' + posters.length;
      prev.disabled = board.scrollLeft <= 2; next.disabled = board.scrollLeft >= maxL() - 2;
    }
    function go(d) {
      var i = Math.round(board.scrollLeft / step()) + d;
      board.scrollTo({ left: Math.max(0, Math.min(maxL(), i * step())), behavior: reduce ? 'auto' : 'smooth' });
    }
    board.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(sync); } }, { passive: true });
    addEventListener('resize', sync);
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    board.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    sync();
    function stamp(p) {
      if (p.classList.contains('stamped')) return;
      p.classList.add('stamped');
      if (reduce) return;
      setTimeout(function () { board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake'); }, 180);
    }
    if (reduce || !hasIO) posters.forEach(stamp);
    else {
      // 게시판이 화면에 들어온 뒤에야, 가운데로 온 전단에 도장을 찍는다
      var bo = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        bo.disconnect();
        watch(posters, function (p, on, o) { if (on) { o.unobserve(p); setTimeout(function () { stamp(p); }, 380); } }, { root: board, threshold: .6 });
      }, { threshold: .4 });
      bo.observe(board);
    }
  }

  /* ── 자라는 내 성: 스크롤만큼 1등급 → 20등급. 그림은 지금 등급과 다음 두 장만 받는다 ── */
  var keep = $('#keep'), heroAct = $('#heroAct'), endAct = $('#endAct'), summit = $('#end');
  if (keep && heroAct && endAct && hasIO) {
    var G = JSON.parse(keep.dataset.grades), meta = keep.dataset.meta;
    var kImg = $('#keepImg'), kName = $('#keepName'), kMeta = $('#keepMeta'), kGlow = $('#keepGlow');
    var asked = {};
    var url = function (g) { return '/img/castle-' + (g < 10 ? '0' : '') + g + '.webp'; };
    var fetchAhead = function (g) { for (var n = g + 1; n <= Math.min(20, g + 2); n++) if (!asked[n]) { asked[n] = 1; (new Image()).src = url(n); } };
    var grade = 1, a = 0, b = 1, heroOut = false, endIn = false;
    asked[1] = 1;
    function setGrade(g) {
      if (g === grade) return;
      var up = g > grade; grade = g; asked[g] = 1;
      kImg.src = url(g);
      kName.textContent = G[g - 1]; kName.dataset.grade = g;
      kMeta.textContent = meta.replace('{n}', g).replace('{f}', g + 2);
      fetchAhead(g);
      if (reduce) return;
      kImg.classList.remove('thud'); void kImg.offsetWidth; kImg.classList.add('thud');
      kName.classList.remove('bump'); void kName.offsetWidth; kName.classList.add('bump');
      if (up) { puff(kImg.parentNode, 2); if (g % 5 === 0) { kGlow.classList.remove('on'); void kGlow.offsetWidth; kGlow.classList.add('on'); } }
    }
    function measure() {
      a = heroAct.getBoundingClientRect().bottom + scrollY;
      b = summit.getBoundingClientRect().top + scrollY - innerHeight * .6;
      if (b < a + 200) b = a + 200;
      onScroll();
    }
    var tk = false;
    function onScroll() {
      if (tk) return; tk = true;
      requestAnimationFrame(function () {
        tk = false;
        var p = Math.min(1, Math.max(0, (scrollY - a) / (b - a)));
        setGrade(1 + Math.floor(p * 19.999));
      });
    }
    function show() {
      var on = heroOut && !endIn;
      keep.classList.toggle('show', on);
      if (on) { keep.removeAttribute('inert'); fetchAhead(grade); } else keep.setAttribute('inert', '');
    }
    keep.hidden = false; keep.setAttribute('inert', '');
    document.body.classList.add('has-keep');
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', measure);
    addEventListener('load', measure);
    measure();
    watch([heroAct], function (el, on, o, e) { heroOut = !on && e.boundingClientRect.top < 0; show(); });
    watch([endAct], function (el, on, o, e) { endIn = on || e.boundingClientRect.top < 0; show(); }, { threshold: .15 });
  }
})();
