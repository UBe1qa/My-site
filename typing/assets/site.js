/* 토독 모든 페이지 공통: 광고 자리 채우기, 다른 언어판 안내 띠, 루멘랩 키 줄 연출.
   저장: 안내 띠를 닫으면 localStorage 'todok.lang' 하나만 남긴다(개인정보 처리방침에 적혀 있다). */
(function () {
  'use strict';
  var D = document, root = D.documentElement, el = D.getElementById('tj-site');
  var cfg = el ? JSON.parse(el.textContent) : null;
  if (window.TJ_ADS) window.TJ_ADS.mount();

  /* 다른 언어판 안내: 브라우저 언어가 이 페이지 언어와 다를 때만, 닫을 수 있는 띠를 머리 위에 겹쳐 띄운다(자동으로 넘기지 않는다) */
  (function () {
    if (!cfg || !cfg.other) return;
    var nav = (navigator.language || '').toLowerCase(), wantsKo = nav.indexOf('ko') === 0;
    if ((cfg.lang === 'ko') !== wantsKo) {
      var seen = null;
      try { seen = window.localStorage.getItem('todok.lang'); } catch (e) { seen = null; }
      if (seen != null) return;
      var top = D.querySelector('.top'); if (!top) return;
      var bar = D.createElement('p'), t = D.createElement('span'), a = D.createElement('a'), b = D.createElement('button');
      bar.className = 'langbar'; bar.lang = cfg.otherLang;
      t.textContent = cfg.bar; a.href = cfg.other; a.textContent = cfg.offer; a.hreflang = cfg.otherLang;
      b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', cfg.close); b.lang = cfg.lang;
      var done = function () { try { window.localStorage.setItem('todok.lang', '1'); } catch (e) { /* 저장 못 해도 띠는 닫힌다 */ } bar.remove(); };
      b.addEventListener('click', done); a.addEventListener('click', function () { try { window.localStorage.setItem('todok.lang', '1'); } catch (e) { /* 무시 */ } });
      bar.appendChild(t); bar.appendChild(a); bar.appendChild(b); top.appendChild(bar);
    }
  })();

  /* 연출 1 '루멘랩 키 줄': 꼬리말의 만든 곳 칸이 화면에 들어올 때 한 번. 타자를 치는 중에는 시작하지 않는다. */
  (function () {
    var lumen = D.getElementById('lumen'); if (!lumen) return;
    if (!('IntersectionObserver' in window)) { lumen.classList.add('in'); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting || D.hidden || root.classList.contains('running')) return;
        lumen.classList.add('in'); io.disconnect();
      });
    }, { threshold: 0.6 });
    io.observe(lumen);
  })();
})();
