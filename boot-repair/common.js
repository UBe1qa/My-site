/* 가죽결 수선소 · 모든 페이지가 같이 쓰는 코드
   알림 / 머리줄 숨김 / 휴대폰 메뉴 / 늘 떠 있는 신청 바 / 드러내기 / 전후 비교 / 숫자 세기
   다른 파일은 window.BR 로 가져다 쓴다. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var won = function (n) { return n.toLocaleString('ko-KR') + '원'; };
  var anim = function () { return root.classList.contains('anim'); };
  var page = document.body.getAttribute('data-page') || '';
  // 처음 화면 말고는 GSAP을 쓰지 않는다. 움직임은 이 파일(CSS + IntersectionObserver)이 맡는다
  if (page !== 'home') window.__motionOn = true;

  /* ---------- 알림 ---------- */
  var toastEl = $('#toast'), toastT;
  function toast(msg, ms) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, ms || 3600);
  }

  /* ---------- 머리줄: 내릴 땐 숨고, 올릴 땐 나온다 ---------- */
  var topEl = $('#top'), menu = $('#menu'), menuBtn = $('.top__menu');
  var lastY = window.scrollY, ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking || !topEl) return; ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY, d = y - lastY;
      if (Math.abs(d) > 6) {
        topEl.classList.toggle('is-hidden', d > 0 && y > window.innerHeight * .8 && !topEl.contains(document.activeElement) && !root.classList.contains('is-menu'));
        lastY = y;
      }
      ticking = false;
    });
  }, { passive: true });
  if (topEl) topEl.addEventListener('focusin', function () { topEl.classList.remove('is-hidden'); });

  /* ---------- 휴대폰·태블릿 메뉴 ---------- */
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    root.classList.toggle('is-menu', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.querySelector('.sr').textContent = open ? '메뉴 닫기' : '메뉴 열기';
    if (open) { topEl.classList.remove('is-hidden'); var a = $('.menu__a', menu); a && a.focus(); }
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
    // 메뉴 안에서 Tab이 밖으로 새지 않게: 마지막 다음은 메뉴 단추로
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var items = $$('a', menu), first = items[0], last = items[items.length - 1];
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); menuBtn.focus(); }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* ---------- 늘 떠 있는 신청 바 ---------- */
  var dock = $('#dock');
  if (dock) {
    var form = $('#dock-form'), phone = $('#dock-phone'), msg = $('#dock-msg');
    var wide = window.matchMedia('(min-width: 900px)');
    var hero = $('[data-hero]') || $('.hero'), foot = $('.foot');
    if ('IntersectionObserver' in window && hero) {
      var heroOut = false, footIn = false, busy = 0;
      var hides = $$('[data-dock-hide]');   // 같은 단추가 있는 칸이 보이는 동안은 숨긴다
      var upd = function () { dock.classList.toggle('is-show', heroOut && !footIn && !busy || dock.classList.contains('is-open')); };
      var busyIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.target.__in = e.isIntersecting; });
        busy = hides.filter(function (el) { return el.__in; }).length; upd();
      }, { rootMargin: '-15% 0px -15% 0px' });
      hides.forEach(function (el) { busyIO.observe(el); });
      new IntersectionObserver(function (es) { heroOut = !es[0].isIntersecting; upd(); }, { rootMargin: '-40% 0px 0px 0px' }).observe(hero);
      if (foot) new IntersectionObserver(function (es) { footIn = es[0].isIntersecting; upd(); }, { rootMargin: '0px 0px -120px 0px' }).observe(foot);
    } else dock.classList.add('is-show');

    var openApply = function () {
      dock.classList.add('is-show');
      if (!wide.matches) dock.classList.add('is-open');
      setTimeout(function () { (wide.matches ? phone : $('#dock-kind')).focus(); }, 60);
    };
    $$('[data-open-apply]').forEach(function (b) { b.addEventListener('click', openApply); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dock.classList.remove('is-open'); });
    document.addEventListener('pointerdown', function (e) {
      if (dock.classList.contains('is-open') && !dock.contains(e.target) && !e.target.closest('[data-open-apply]')) dock.classList.remove('is-open');
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var digits = phone.value.replace(/[^0-9０-９]/g, '');
      if (digits.length < 9) {
        phone.setAttribute('aria-invalid', 'true');
        msg.textContent = digits.length ? '번호가 짧아요. 010부터 다 적어 주세요.' : '연락받을 휴대폰 번호를 적어 주세요.';
        phone.focus(); return;
      }
      phone.removeAttribute('aria-invalid'); msg.textContent = '';
      toast('연습용 사이트라 실제로 접수되지는 않아요. 진짜 공방이라면 여기서 사진 보낼 링크가 문자로 가요.', 5200);
    });
    phone.addEventListener('input', function () { if (phone.getAttribute('aria-invalid')) { phone.removeAttribute('aria-invalid'); msg.textContent = ''; } });
  }

  /* ---------- 전후 비교 (손잡이 밀기) ---------- */
  $$('.ba').forEach(function (ba) {
    var r = $('.ba__range', ba); if (!r) return;
    var set = function () { ba.style.setProperty('--pos', r.value + '%'); };
    r.addEventListener('input', set); set();
  });

  /* ---------- 드러내기: 들어올 때마다 (움직임 켜졌을 때만) ---------- */
  var play, reset;
  if (anim()) {
    play = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { rootMargin: '0px 0px -12% 0px' });
    // 되돌리기는 화면에서 40px 넘게 벗어났을 때만: 24px 미끄러짐보다 커야 경계에서 깜빡이지 않는다
    reset = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting && !e.target.contains(document.activeElement)) e.target.classList.remove('in'); });
    }, { rootMargin: '40px 0px 40px 0px' });
    document.addEventListener('focusin', function (e) { var r = e.target.closest('.rv'); if (r) r.classList.add('in'); });
    window.addEventListener('beforeprint', function () { $$('.rv').forEach(function (el) { el.classList.add('in'); }); });
  }
  // els: 차례로 드러낼 요소들 (k번째는 k × step 초 늦게)
  function reveal(els, step) {
    if (!anim()) return;
    els.forEach(function (el, k) {
      el.classList.add('rv'); el.style.setProperty('--d', (k * (step || .08)).toFixed(2) + 's');
      play.observe(el); reset.observe(el);
    });
  }
  // HTML에 data-rv="묶음이름"을 달면 묶음마다 차례로
  var byGroup = {};
  $$('[data-rv]').forEach(function (el) { var g = el.getAttribute('data-rv') || '_'; (byGroup[g] = byGroup[g] || []).push(el); });
  Object.keys(byGroup).forEach(function (g) { reveal(byGroup[g]); });

  /* ---------- 숫자 세기: data-countup="최종값" (최종 값이 기본, 보일 때 0부터) ---------- */
  if (anim()) {
    var cIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, to = +el.getAttribute('data-countup'), t0 = performance.now();
        cancelAnimationFrame(el.__raf);
        (function tick(now) {
          var p = Math.min(1, (now - t0) / 1000), k = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * k);
          if (p < 1) el.__raf = requestAnimationFrame(tick);
        })(t0);
      });
    }, { rootMargin: '0px 0px -20% 0px' });
    $$('[data-countup]').forEach(function (el) { cIO.observe(el); });
  }

  window.BR = { $: $, $$: $$, won: won, anim: anim, toast: toast, reveal: reveal, page: page };
})();
