/* Owlight 소개 사이트: 장면 판(눌러 보기), 언어 버튼, 칸이 들어올 때 드러내기. 라이브러리 없음. */
(function () {
  var d = document, root = d.documentElement;
  var anim = root.classList.contains('anim');

  /* 장면 판: 앱의 기본 장면 4개(Types.swift SceneConfig.defaults)와 같은 조합.
     켠 장면을 다시 누르면 앱처럼 세 기능이 모두 꺼진다. */
  var board = d.querySelector('[data-board]');
  if (board) {
    var chips = board.querySelectorAll('.chip');
    var rows = board.querySelectorAll('.sw');
    var timers = [];
    var show = function (list, stagger) {
      timers.forEach(clearTimeout); timers = [];
      rows.forEach(function (r, i) {
        var on = list.indexOf(r.getAttribute('data-f')) > -1;
        if (stagger) timers.push(setTimeout(function () { r.classList.toggle('is-on', on); }, 160 + i * 220));
        else r.classList.toggle('is-on', on);
      });
    };
    var bo = null;
    var current = function () {
      var c = board.querySelector('.chip[aria-pressed="true"]');
      return c ? c.getAttribute('data-on').split(' ') : [];
    };
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var was = c.getAttribute('aria-pressed') === 'true';
        chips.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        if (!was) c.setAttribute('aria-pressed', 'true');
        if (bo) { bo.disconnect(); bo = null; }
        show(current(), false);
      });
    });
    if (anim) {
      /* 판이 화면에 들어오면 고른 장면의 스위치가 차례로 켜진다(한 번) */
      bo = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && bo) { show(current(), true); bo.disconnect(); bo = null; }
        });
      }, { threshold: 0.4 });
      bo.observe(board);
    } else {
      show(current(), false);
    }
  }

  /* 칸 드러내기 */
  if (anim) {
    window.__rvOn = true;
    var targets = d.querySelectorAll('.feat__text, .feat__head, .feat__shot, .more__item, .scenery, .privacy__card, .faq__list, .scenes__text, .board');
    /* 숨기기는 첫 알림에서 화면 밖인 칸만. 새로고침이 중간 위치를 되살렸을 때 이미 보이는 칸(스크린숏 포함)이
       사라졌다 다시 나타나며 늦게 그려지지 않게 */
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var el = e.target;
        if (!el.hasAttribute('data-rv')) {
          var r = e.boundingClientRect;
          if (r.top < innerHeight && r.bottom > 0) { io.unobserve(el); return; }
          el.setAttribute('data-rv', '');
        }
        if (e.isIntersecting) { el.classList.add('in'); io.unobserve(el); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
    var hs = d.querySelector('.hero__shot');
    if (hs) requestAnimationFrame(function () { requestAnimationFrame(function () { hs.classList.add('in'); }); });
  }
})();
