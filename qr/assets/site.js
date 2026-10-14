/* 오래QR 모든 페이지 공통: 화면 설정(이펙트 세기·밝게/어둡게), 다른 언어판 안내 띠, 루멘랩 스티커 시트 연출.
   저장: staycode.set(설정), staycode.lang(안내 띠를 닫음). 개인정보 처리방침에 적혀 있다. */
(function () {
  'use strict';
  var D = document, H = D.documentElement, el = D.getElementById('qr-site');
  var cfg = el ? JSON.parse(el.textContent) : null;
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 이번 화면에는 적용 */ } }
  var reduced = H.classList.contains('rm');

  /* 화면 설정 */
  Array.prototype.forEach.call(D.querySelectorAll('.set-pop'), function (pop) {
    var fxg = pop.querySelector('[id^=set-fx]'), thg = pop.querySelector('[id^=set-theme]'), note = pop.querySelector('.set-note');
    if (!fxg) return;
    var set = get('staycode.set') || {};
    function lvl() { return H.classList.contains('fx2') ? 2 : H.classList.contains('fx1') ? 1 : 0; }
    function sync() {
      Array.prototype.forEach.call(fxg.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-fx') === lvl() ? 'true' : 'false'); b.disabled = reduced; });
      Array.prototype.forEach.call(thg.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-theme') === H.getAttribute('data-theme') ? 'true' : 'false'); });
      note.hidden = !reduced;
    }
    fxg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || reduced) return;
      var v = +b.getAttribute('data-fx');
      H.classList.remove('fx0', 'fx1', 'fx2'); H.classList.add('fx' + v);
      set.fx = v; put('staycode.set', set); sync();
    });
    thg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var v = b.getAttribute('data-theme');
      H.setAttribute('data-theme', v);
      var m = D.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', v === 'dark' ? '#121815' : '#f4f7f5');
      set.theme = v; put('staycode.set', set); sync();
    });
    // 설정 창: 바깥을 누르거나 Esc 면 닫는다
    var det = fxg.closest('details');
    D.addEventListener('click', function (e) { if (det.open && !det.contains(e.target)) det.open = false; });
    D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && det.open) { det.open = false; det.querySelector('summary').focus(); } });
    sync();
  });

  /* 다른 언어판 안내: 브라우저 언어가 이 페이지 언어와 다를 때만, 화면 아래에 겹쳐 띄운다(자동으로 넘기지 않는다) */
  (function () {
    if (!cfg || !cfg.other) return;
    var wantsKo = (navigator.language || '').toLowerCase().indexOf('ko') === 0;
    if ((cfg.lang === 'ko') === wantsKo || get('staycode.lang')) return;
    var bar = D.createElement('div'), t = D.createElement('span'), a = D.createElement('a'), b = D.createElement('button');
    bar.className = 'langbar'; bar.lang = cfg.otherLang; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', cfg.bar);
    t.textContent = cfg.bar; a.href = cfg.other; a.textContent = cfg.offer; a.hreflang = cfg.otherLang;
    b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', cfg.close); b.lang = cfg.lang;
    var done = function () { put('staycode.lang', 1); bar.remove(); H.classList.remove('has-langbar'); };
    b.addEventListener('click', done); a.addEventListener('click', function () { put('staycode.lang', 1); });
    bar.appendChild(t); bar.appendChild(a); bar.appendChild(b); D.body.appendChild(bar);
    H.classList.add('has-langbar');
    /* 누를 것(단추·입력칸·링크)과 겹치면 겹치는 동안 아래로 숨긴다. 숨긴 채로 화면을 움직이면 다시 본다 */
    var SEL = 'a,button,input,select,textarea,summary,[role=tab],[role=radio],label.btn', pend = 0;
    function check() {
      pend = 0;
      if (!bar.isConnected) return;
      // 숨기는 움직임(transform) 중에도 원래 자리로 잰다: offset 값은 transform 을 빼고 준다(가운데 맞춤은 직접 계산)
      var w = bar.offsetWidth, h = bar.offsetHeight, top = bar.offsetTop, left = (D.documentElement.clientWidth - w) / 2;
      var r = { left: left, right: left + w, top: top, bottom: top + h }, hit = false, list = D.querySelectorAll(SEL);
      for (var i = 0; i < list.length && !hit; i++) {
        var e = list[i];
        if (bar.contains(e) || e.closest('.savebar:not(.on), .sr, [hidden]')) continue;
        var q = e.getBoundingClientRect();
        if (q.bottom < r.top - 4 || q.top > r.bottom + 4 || !q.width || !q.height) continue;   // 세로로 먼 것은 빨리 건너뛴다
        if (q.left < r.right + 4 && q.right > r.left - 4) hit = true;
      }
      bar.classList.toggle('tuck', hit);
    }
    function soon() { if (!pend) pend = requestAnimationFrame(check); }
    window.addEventListener('scroll', soon, { passive: true });
    window.addEventListener('resize', soon);
    check();
  })();

  /* 루멘랩 칸 '스티커 시트'(사이트 공통 고정 연출): 화면에 들어오면 1.8초 동안 차례로
     ① 작은 스티커들이 차례로 톡 ② 마지막 스티커 하나가 모서리부터 말려 떼어짐 → 뒤에 박리지 자국 ③ 글이 나타나고 ④ 화살표가 미끄러져 들어온다.
     나갔다가 6초 뒤 다시 들어오면 다시. 이펙트 끔·동작 줄이기면 색만(.lite). 계속 도는 움직임 없음(CSS 애니메이션은 한 번씩만). */
  (function () {
    var lumen = Array.prototype.filter.call(D.querySelectorAll('.lumen'), function (x) { return x.getClientRects().length > 0; })[0];
    if (!lumen) return;
    if (!('IntersectionObserver' in window)) { lumen.classList.add('in', 'lite'); return; }
    var last = 0, out = true;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) { if (e.intersectionRatio < 0.05) out = true; return; }
        if (e.intersectionRatio < 0.6 || !out || D.hidden || Date.now() - last < 6000) return;
        out = false; last = Date.now();
        var lv = H.classList.contains('fx2') ? 2 : H.classList.contains('fx1') ? 1 : 0;
        if (lumen.classList.contains('in') && lv > 0) { lumen.classList.remove('in'); void lumen.offsetWidth; }
        lumen.classList.toggle('lite', lv === 0);
        lumen.classList.toggle('big', lv === 2);
        lumen.classList.add('in');
      });
    }, { threshold: [0, 0.6] });
    io.observe(lumen);
  })();
})();
