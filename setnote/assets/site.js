/* 머리말 선, 가벼운 움직임(라이브러리 없음). 움직임은 head 스크립트가 html.anim 을 붙였을 때만.
   보이는 칸에 들어오면 한 번 켠다. 기록 예시는 '오늘' 칸이 차례로 채워진다 (lumenlab 과 같은 방식). */
(function () {
  var d = document.documentElement;
  var top = document.querySelector('.top');
  if (top) {
    var onScroll = function () { top.classList.toggle('is-stuck', window.scrollY > 4); };
    onScroll(); addEventListener('scroll', onScroll, { passive: true });
  }
  if (!d.classList.contains('anim')) return;
  window.__rvOn = true;
  document.querySelectorAll('.hero .rv').forEach(function (n, i) { n.style.setProperty('--d', (0.08 + i * 0.08).toFixed(2) + 's'); });
  document.querySelectorAll('.cards .rv').forEach(function (n, i) { n.style.setProperty('--d', (i * 0.08).toFixed(2) + 's'); });
  document.querySelectorAll('.setrow__now').forEach(function (n, i) { n.style.setProperty('--d', (0.6 + i * 0.16).toFixed(2) + 's'); });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv, .sets').forEach(function (n) { io.observe(n); });
  addEventListener('beforeprint', function () { d.classList.remove('anim'); });
})();
