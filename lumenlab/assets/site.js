/* 루멘랩 공통 스크립트: 머리말 선, 가벼운 움직임(라이브러리 없음).
   움직임은 head 스크립트가 html.anim 을 붙였을 때만. 칸(묶음)을 지켜보다 들어오면 켜고, 완전히 나가면 되돌린다.
   첫 화면은 도착 인사라 한 번만. */
(function () {
  var d = document.documentElement;
  var top = document.querySelector('.top');

  if (top) {
    var onScroll = function () { top.classList.toggle('is-stuck', window.scrollY > 4); };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  }

  if (!d.classList.contains('anim')) return;
  window.__rvOn = true;

  requestAnimationFrame(function () { if (top) top.classList.add('on'); });

  /* 묶음마다: 안의 요소에 --d(순서 × 간격)를 주고, 묶음이 들어오면 .in */
  var groups = [
    { el: '.hero__in', items: '.rv', step: 0.09, once: true },
    { el: '.feats', items: '.sw:not(.sw--off)', step: 0.18, self: true },
    { el: '.sets', items: '.setrow__now', step: 0.16, self: true }
  ];

  var play = function (g, on) {
    if (g.self) g.node.classList.toggle('in', on);
    g.list.forEach(function (n) { n.classList.toggle('in', on); });
  };

  var list = [];
  groups.forEach(function (g) {
    var node = document.querySelector(g.el);
    if (!node) return;
    g.node = node;
    g.list = g.self ? [] : Array.prototype.slice.call(node.querySelectorAll(g.items));
    Array.prototype.forEach.call(node.querySelectorAll(g.items), function (n, i) { n.style.setProperty('--d', (0.15 + i * g.step).toFixed(2) + 's'); });
    list.push(g);
  });

  /* 재생용(아래 8%는 빼고 들어오면)과 되돌리기용(완전히 나가면) 두 가지 */
  var ioPlay = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var g = e.target.__g;
      play(g, true);
      if (g.once) ioPlay.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  var ioReset = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (!e.isIntersecting) play(e.target.__g, false); });
  });

  list.forEach(function (g) {
    g.node.__g = g;
    ioPlay.observe(g.node);
    if (!g.once) ioReset.observe(g.node);
  });

  /* 인쇄할 땐 전부 보이게 */
  addEventListener('beforeprint', function () { d.classList.remove('anim'); });
})();
