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

  /* 한국어 / ↔ 영어 /en/ 은 따로 된 페이지. 브라우저 언어가 이 페이지와 다르면 작은 띠로 다른 언어 쪽을 알려 준다(자동으로 넘기지 않음).
     lumen:langbar = 방문자가 고른 언어(띠의 ×를 누르거나 언어 단추를 누르면 저장) */
  var other = document.querySelector('a.lang[data-other-lang]');
  if (other && top) {
    var lang = d.lang === 'en' ? 'en' : 'ko', want = /^ko\b/i.test(navigator.language || '') ? 'ko' : 'en', saved;
    var keep = function (l) { try { localStorage.setItem('lumen:langbar', l); } catch (e) {} };
    try { saved = localStorage.getItem('lumen:langbar'); } catch (e) {}
    other.addEventListener('click', function () { keep(lang === 'ko' ? 'en' : 'ko'); });
    if (want !== lang && saved !== lang) {
      var bar = document.createElement('div');
      bar.className = 'langbar'; bar.lang = want;
      bar.innerHTML = '<p class="wrap"><span>' + (want === 'en' ? 'This page is in Korean.' : '한국어 페이지도 있어요.') + '</span> <a hreflang="' + want + '" href="' + other.getAttribute('href') + '">' +
        (want === 'en' ? 'English version →' : '한국어로 보기 →') + '</a><button type="button" class="langbar__x" aria-label="' + (want === 'en' ? 'Close' : '닫기') + '">×</button></p>';
      bar.querySelector('a').addEventListener('click', function () { keep(want); });
      bar.querySelector('button').addEventListener('click', function () { keep(lang); bar.remove(); });
      document.body.insertBefore(bar, top);
    }
  }

  if (!d.classList.contains('anim')) return;
  window.__rvOn = true;

  requestAnimationFrame(function () { if (top) top.classList.add('on'); });

  /* 묶음마다: 안의 요소에 --d(순서 × 간격)를 주고, 묶음이 들어오면 .in */
  var groups = [
    { el: '.hero__in', items: '.rv', step: 0.09, once: true },
    { el: '#apps .cat__grid', items: '.rv', step: 0.08, once: true },
    { el: '#tools .cat__grid', items: '.rv', step: 0.08, once: true },
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
