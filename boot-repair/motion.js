/* 스크롤을 따라가는 연출 (GSAP + ScrollTrigger, scrub)
   ① 첫 화면 틀이 화면 끝까지 펼쳐짐 ② 고정 무대: 문장 사이로 알약 창 → 클로즈업 → 인용 → 약속
   스크롤을 가로채지 않는다(브라우저 스크롤 그대로, 무대는 position: sticky). */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('anim')) return;
  if (!window.gsap || !window.ScrollTrigger) { window.__unanim && window.__unanim(); window.__filmStill && window.__filmStill(); return; }
  window.__motionOn = true;
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });
  ScrollTrigger.config({ ignoreMobileResize: true });

  var mq = function (q) { return window.matchMedia(q).matches; };
  var ins = function (t, r, b, l, rad) { return 'inset(' + t + 'px ' + r + 'px ' + b + 'px ' + l + 'px round ' + rad + 'px)'; };

  /* ① 첫 화면: 둥근 틀 → 화면 끝까지 */
  var frame = document.querySelector('.hero__frame');
  gsap.fromTo(frame,
    { clipPath: function () { var m = mq('(min-width: 700px)') ? 16 : 10; return ins(0, m, 0, m, mq('(min-width: 700px)') ? 28 : 24); } },
    { clipPath: ins(0, 0, 0, 0, 0), ease: 'none', immediateRender: true,
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=45%', scrub: true, invalidateOnRefresh: true } });
  gsap.to('.hero__copy', { yPercent: -12, opacity: .15, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ② 고정 무대 */
  var stage = document.querySelector('.story__stage');
  var shot = document.querySelector('.story__shot');
  var pic = shot.querySelector('picture');
  var blur = document.querySelector('.story__blur');
  var wA = document.querySelector('.story__w--a'), wB = document.querySelector('.story__w--b');
  var quote = document.querySelector('.story__quote');
  var who = document.querySelector('.story__promise-who');
  var items = document.querySelectorAll('.promise li');

  var G = {};
  function measure() {
    var W = stage.clientWidth, H = stage.clientHeight, narrow = W < 700, wide = W >= 900;
    G.W = W; G.H = H; G.narrow = narrow;
    G.pw = narrow ? Math.min(W * .62, 260) : Math.max(120, Math.min(W * .17, 250, W - wA.offsetWidth - wB.offsetWidth - 120));
    G.ph = narrow ? Math.min(H * .2, 170) : Math.min(H * .42, 360);
    G.gap = narrow ? 14 : 22;
    // 두 말 사이 틈의 가운데 (transform을 무시하는 offset 값으로 잰다)
    if (narrow) {
      var aB = wA.offsetTop + wA.offsetHeight, bT = wB.offsetTop;
      G.gx = W / 2; G.gy = (aB + bT) / 2; G.gap0 = bT - aB;
    } else {
      var aR = wA.offsetLeft + wA.offsetWidth, bL = wB.offsetLeft;
      G.gx = (aR + bL) / 2; G.gy = H / 2; G.gap0 = bL - aR;
    }
    G.card = wide ? [H * .14, W * .05, H * .14, W * .55, 24]
                  : [H * .07 + 60, 16, H * .56, 16, 20];
  }
  measure();

  var tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.story', start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true,
      onRefreshInit: measure }
  });
    var sep = function (sign) { return function () {
    var need = (G.narrow ? G.ph : G.pw) + G.gap * 2;
    return sign * Math.max(0, (need - G.gap0) / 2);
  }; };
  var pill = function () {
    var t = G.gy - G.ph / 2, l = G.gx - G.pw / 2;
    return ins(t, G.W - (l + G.pw), G.H - (t + G.ph), l, Math.min(G.pw, G.ph) / 2);
  };
  
  gsap.set(blur, { opacity: .7 });
  // 처음엔 밑창 둘레 실이 창 한가운데 오게 조금 올려 둔다
  gsap.set(pic, { scale: 1.45, yPercent: -11, transformOrigin: '50% 61%' });

  // 0 → 2.4 : 알약 창이 열리고 문장이 벌어진다 (크기 0일 때 한 줄이 비치지 않게 처음엔 숨김)
  tl.fromTo(shot, { opacity: 0 }, { opacity: 1, duration: .25 }, 0);
  tl.fromTo(shot, { clipPath: function () { return ins(G.gy, G.W - G.gx, G.H - G.gy, G.gx, 999); } },
                  { clipPath: pill, duration: 2.4 }, 0);
  tl.to(wA, { x: function () { return G.narrow ? 0 : sep(-1)(); }, y: function () { return G.narrow ? sep(-1)() : 0; }, duration: 2.4 }, 0);
  tl.to(wB, { x: function () { return G.narrow ? 0 : sep(1)(); }, y: function () { return G.narrow ? sep(1)() : 0; }, duration: 2.4 }, 0);
  tl.to(pic, { scale: 1.25, duration: 2.4 }, 0);

  // 2.4 → 4.6 : 창이 화면 전체로, 흐림이 걷히며 가까이 다가간다
  tl.to(shot, { clipPath: ins(0, 0, 0, 0, 0), duration: 2.2, ease: 'power1.in' }, 2.4);
  tl.to(wA, { x: function () { return G.narrow ? 0 : -G.W * .6; }, y: function () { return G.narrow ? -G.H * .5 : 0; }, opacity: 0, duration: 1.6 }, 2.4);
  tl.to(wB, { x: function () { return G.narrow ? 0 : G.W * .6; }, y: function () { return G.narrow ? G.H * .5 : 0; }, opacity: 0, duration: 1.6 }, 2.4);
  tl.to(pic, { scale: 1, yPercent: 0, duration: 2.2 }, 2.4);
  tl.to(blur, { opacity: 0, duration: 1.4 }, 3.2);
  tl.to(stage, { '--dark-o': 1, duration: .4 }, 4.6);

  // 4.8 → 6.6 : 인용 문구
  tl.fromTo(quote, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .9, ease: 'power2.out' }, 4.8);
  tl.to(shot, { '--shade-o': 1, duration: .9 }, 4.8);
  // 6.6 → 7.2 : 인용이 빠지고
  tl.to(quote, { opacity: 0, y: -16, duration: .6 }, 6.6);
  tl.to(shot, { '--shade-o': 0, duration: .6 }, 6.6);
  // 6.8 → 8.2 : 사진이 한쪽 카드로 물러난다
  tl.to(shot, { clipPath: function () { var c = G.card; return ins(c[0], c[1], c[2], c[3], c[4]); }, duration: 1.4, ease: 'power2.inOut' }, 6.8);
  // 7.6 → 9.4 : 약속이 차례로
  tl.fromTo(who, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .5 }, 7.6);
  items.forEach(function (li, i) {
    tl.fromTo(li, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .7, ease: 'power2.out' }, 7.9 + i * .5);
  });
  tl.to({}, { duration: .6 }, 9.4);

  // 무대 안으로 키보드 초점이 들어오면 약속까지 보이게
  document.querySelector('.story').addEventListener('focusin', function () { tl.progress(1); });
  window.addEventListener('beforeprint', function () { tl.progress(1); });

  // 글꼴·그림이 늦게 들어오면 길이를 다시 잰다
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
