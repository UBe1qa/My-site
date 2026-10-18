/* 루멘랩 공통 스크립트: 머리말 선, 언어 띠, 로고 불 켜기(라이브러리 없음).
   움직임은 head 스크립트가 html.anim 을 붙였을 때만(window.__rvOn = 시작했다는 표시, 3초 안에 없으면 head 스크립트가 움직임을 끈다).
   칸마다의 움직임은 그 페이지 스크립트가 맡는다(홈 = landing.js). */
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

  /* 인쇄할 땐 전부 보이게 */
  addEventListener('beforeprint', function () { d.classList.remove('anim'); });
})();
