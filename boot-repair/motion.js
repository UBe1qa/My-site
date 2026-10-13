/* 스크롤을 따라가는 연출 (GSAP + ScrollTrigger, scrub) — 2판
   ① 첫 화면 틀이 화면 끝까지 펼쳐짐
   ② 고정 무대: 문장 사이 알약 창(닳은 굽) → 화면 가득(흐림 걷힘, '맡길 때') → 수선사의 말 →
      한쪽 카드로 물러나며 고친 굽으로 바뀜('찾아갈 때') → 약속 세 가지. 무대 동안 머리줄은 숨긴다.
   스크롤을 가로채지 않는다(브라우저 스크롤 그대로, 무대는 position: sticky). */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('anim')) return;
  if (!window.gsap || !window.ScrollTrigger) { window.__unanim && window.__unanim(); return; }
  window.__motionOn = true;
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });
  ScrollTrigger.config({ ignoreMobileResize: true });

  var css = function (v) { return parseFloat(getComputedStyle(root).getPropertyValue(v)) || 0; };
  var ins = function (t, r, b, l, rad) { return 'inset(' + t + 'px ' + r + 'px ' + b + 'px ' + l + 'px round ' + rad + 'px)'; };
  var top = document.getElementById('top');

  /* ① 첫 화면: 둥근 틀 → 화면 끝까지 */
  gsap.fromTo('.hero__frame',
    { clipPath: function () { var m = css('--hero-in'); return ins(0, m, 0, m, css('--hero-r')); } },
    { clipPath: ins(0, 0, 0, 0, 0), ease: 'none', immediateRender: true,
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=45%', scrub: true, invalidateOnRefresh: true } });
  gsap.to('.hero__copy', { yPercent: -10, opacity: .2, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ② 고정 무대 */
  var stage = document.querySelector('.story__stage');
  var shot = document.querySelector('.story__shot');
  var worn = shot.querySelector('.story__pic--worn'), fixed = shot.querySelector('.story__pic--new'), blur = shot.querySelector('.story__pic--blur');
  var pics = [worn, fixed, blur];
  var bWorn = shot.querySelector('.story__badge--worn'), bNew = shot.querySelector('.story__badge--new');
  var wA = document.querySelector('.story__w--a'), wB = document.querySelector('.story__w--b');
  var quote = document.querySelector('.story__quote');
  var who = document.querySelector('.story__promise-who');
  var items = document.querySelectorAll('.promise li');

  var G = {};
  function measure() {
    var W = stage.clientWidth, H = stage.clientHeight, narrow = W < 700, wide = W >= 900, g = css('--gutter');
    G.W = W; G.H = H; G.narrow = narrow;
    G.gap = narrow ? 12 : 22;
    if (narrow) {   // 휴대폰: 두 말이 위아래, 창은 세로로 긴 알약
      G.pw = Math.min(W * .4, 150); G.ph = Math.min(H * .22, 190);
      var aB = wA.offsetTop + wA.offsetHeight, bT = wB.offsetTop;
      G.gx = W / 2; G.gy = (aB + bT) / 2; G.gap0 = bT - aB;
    } else {        // 컴퓨터: 두 말이 좌우, 말 폭을 빼고 남는 만큼만 창을 연다
      G.ph = Math.min(H * .42, 340);
      G.pw = Math.max(110, Math.min(W * .15, 220, W - wA.offsetWidth - wB.offsetWidth - 140));
      var aR = wA.offsetLeft + wA.offsetWidth, bL = wB.offsetLeft;
      G.gx = (aR + bL) / 2; G.gy = H / 2; G.gap0 = bL - aR;
    }
    // 알약 창 안에 굽이 오게: 굽 자리(그림 기준 %)를 화면 가운데로 옮겨 둔다
    G.shift = narrow ? [11, -14, '39% 64%'] : [27, -23, '23% 73%'];
    // 카드로 물러날 때 굽이 카드 가운데 오게 그림을 옮긴다
    G.cardShift = wide ? [50, 0] : narrow ? [0, -35] : [0, -30];
    G.card = wide ? [H * .14, g, H * .14, W * .54, 24] : [H * .06, g, H * .56, g, 20];
    stage.style.setProperty('--bw-t', '24px');
    stage.style.setProperty('--bn-t', (G.card[0] + 16) + 'px');
    stage.style.setProperty('--bn-l', (G.card[3] + 16) + 'px');
  }
  measure();
  bWorn.style.top = 'var(--bw-t)'; bWorn.style.left = 'var(--gutter)';
  bNew.style.top = 'var(--bn-t)'; bNew.style.left = 'var(--bn-l)';

  var sep = function (sign) { return function () {
    var need = (G.narrow ? G.ph : G.pw) + G.gap * 2;
    return sign * Math.max(0, (need - G.gap0) / 2);
  }; };
  var pill = function () {
    var t = G.gy - G.ph / 2, l = G.gx - G.pw / 2;
    return ins(t, G.W - (l + G.pw), G.H - (t + G.ph), l, Math.min(G.pw, G.ph) / 2);
  };

  var tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.story', start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true,
      onRefreshInit: measure,
      // 화면 전체를 쓰는 동안은 머리줄을 숨긴다
      onUpdate: function (self) { top.classList.toggle('is-stage', self.progress > .08 && self.progress < .995); },
      onLeave: function () { top.classList.remove('is-stage'); },
      onLeaveBack: function () { top.classList.remove('is-stage'); } }
  });

  gsap.set(blur, { opacity: .7 });

  // 0 → 2.4 : 알약 창이 열리고 말이 벌어진다 (크기 0일 때 한 줄이 비치지 않게 처음엔 숨김)
  tl.fromTo(shot, { opacity: 0 }, { opacity: 1, duration: .25 }, 0);
  // 얇은 틈에서 시작한다(컴퓨터는 세로 틈, 휴대폰은 가로 틈)
  tl.fromTo(shot, { clipPath: function () {
      return G.narrow ? ins(G.gy - 4, G.W - (G.gx + G.pw / 2), G.H - (G.gy + 4), G.gx - G.pw / 2, 999)
                      : ins(G.gy - G.ph / 2, G.W - (G.gx + 4), G.H - (G.gy + G.ph / 2), G.gx - 4, 999); } },
    { clipPath: pill, duration: 2.4 }, 0);
  // 틈이 넓어지는 동안 바탕이 어두워지고 말은 흰색이 된다
  tl.to(stage, { '--dark-o': 1, duration: .7, ease: 'power1.inOut' }, .7);
  tl.to([wA, wB], { color: '#F4F6FA', duration: .5, ease: 'power1.inOut' }, .85);
  tl.to(wA, { x: function () { return G.narrow ? 0 : sep(-1)(); }, y: function () { return G.narrow ? sep(-1)() : 0; }, duration: 2.4 }, 0);
  tl.to(wB, { x: function () { return G.narrow ? 0 : sep(1)(); }, y: function () { return G.narrow ? sep(1)() : 0; }, duration: 2.4 }, 0);
  tl.fromTo(pics, { scale: 1.45, xPercent: function () { return G.shift[0]; }, yPercent: function () { return G.shift[1]; }, transformOrigin: function () { return G.shift[2]; } },
    { scale: 1.25, duration: 2.4 }, 0);

  // 2.4 → 4.6 : 창이 화면 전체로, 흐림이 걷히며 다가간다. '맡길 때' 표가 붙는다
  // 시작 값을 늘 명시한다: 브라우저가 대칭인 inset을 줄여 쓰면(inset(a b round r)) 숫자 개수가 달라져 중간값이 틀어진다
  tl.fromTo(shot, { clipPath: pill }, { clipPath: ins(0, 0, 0, 0, 0), duration: 2.2, ease: 'power1.in', immediateRender: false }, 2.4);
  tl.to(wA, { x: function () { return G.narrow ? 0 : -G.W * .6; }, y: function () { return G.narrow ? -G.H * .5 : 0; }, duration: 1.6 }, 2.4);
  tl.to(wB, { x: function () { return G.narrow ? 0 : G.W * .6; }, y: function () { return G.narrow ? G.H * .5 : 0; }, duration: 1.6 }, 2.4);
  tl.to([wA, wB], { opacity: 0, duration: .5 }, 2.7);
  tl.to(pics, { scale: 1, xPercent: 0, yPercent: 0, duration: 2.2 }, 2.4);
  tl.to(blur, { opacity: 0, duration: 1.4 }, 3.2);
  tl.fromTo(bWorn, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .4 }, 4.2);

  // 4.8 → 6.6 : 수선사의 말
  tl.fromTo(quote, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .9, ease: 'power2.out' }, 4.8);
  tl.to(shot, { '--shade-o': 1, duration: .9 }, 4.8);
  tl.to(quote, { opacity: 0, y: -16, duration: .6 }, 6.6);
  tl.to(shot, { '--shade-o': 0, duration: .6 }, 6.6);
  tl.to(bWorn, { opacity: 0, duration: .4 }, 6.6);

  // 6.8 → 8.2 : 한쪽 카드로 물러나며 고친 굽으로 바뀐다
  tl.fromTo(shot, { clipPath: ins(0, 0, 0, 0, 0) }, { clipPath: function () { var c = G.card; return ins(c[0], c[1], c[2], c[3], c[4]); }, duration: 1.4, ease: 'power2.inOut', immediateRender: false }, 6.8);
  tl.to(pics, { xPercent: function () { return G.cardShift[0]; }, yPercent: function () { return G.cardShift[1]; }, duration: 1.4, ease: 'power2.inOut' }, 6.8);
  tl.to(fixed, { opacity: 1, duration: 1 }, 7.1);
  tl.fromTo(bNew, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .4 }, 8.0);

  // 7.6 → 9.4 : 약속이 차례로
  tl.fromTo(who, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .5 }, 7.6);
  items.forEach(function (li, i) {
    tl.fromTo(li, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .7, ease: 'power2.out' }, 7.9 + i * .5);
  });
  tl.to({}, { duration: .6 }, 9.4);

  // 무대 안으로 키보드 초점이 들어오면 끝 상태로
  document.querySelector('.story').addEventListener('focusin', function () { tl.progress(1); });
  window.addEventListener('beforeprint', function () { tl.progress(1); });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
