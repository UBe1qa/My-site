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

  /* 연출 1 '루멘랩 키 줄'(사이트 공통 고정 연출): 꼬리말의 만든 곳 칸이 화면에 들어올 때. 타자를 치는 중에는 시작하지 않는다.
     2026-10-11 사용자 "이펙트가 너무 약한듯" → 키 다섯이 깊게 눌리며 번쩍이고(CSS), '화려하게'일 때는 키마다 조각이 튀고 '5 콤보' 꼬리표가 뜬다(아래).
     화면 밖으로 나갔다가 다시 들어오면 다시 한 번 나온다(6초 안에는 다시 안 나온다). 계속 도는 움직임은 없다(끝나면 조각을 지운다) */
  (function () {
    /* 두 언어 틀을 같이 담은 장(404)에서는 보이는 쪽을 고른다 */
    var lumen = Array.prototype.filter.call(D.querySelectorAll('.lumen'), function (x) { return x.getClientRects().length > 0; })[0]; if (!lumen) return;
    if (!('IntersectionObserver' in window)) { lumen.classList.add('in'); return; }
    var anim = root.classList.contains('anim'), last = 0, out = true;
    /* 이펙트 세기: 설정(todok.set 의 fx.l. 도구 화면에서는 이펙트 엔진의 값) → 끔이면 색만, 가볍게면 키와 글만, 화려하게면 조각·꼬리표·소리까지 */
    function level() {
      if (!anim) return 0;
      if (window.TJFX) return window.TJFX.level;
      try { var st = JSON.parse(window.localStorage.getItem('todok.set') || '{}'); return st && st.fx && st.fx.l != null ? st.fx.l : 2; } catch (e) { return 2; }
    }
    function burst() {
      if (!lumen.animate) return;
      var caps = lumen.querySelectorAll('.caps .cap'), cols = ['var(--cap)', 'var(--main)', 'var(--hot)'], made = [], fx = window.TJFX;
      Array.prototype.forEach.call(caps, function (k, i) {
        var x = k.offsetLeft + k.offsetWidth / 2 - 4, y = k.offsetTop, at = i * 90 + 120;
        for (var n = 0; n < 3; n++) {
          var c = D.createElement('i'), dx = (n - 1) * 20 + (i - 2) * 4, up = 38 + ((i * 7 + n * 11) % 22);
          c.className = 'lchip'; c.style.background = cols[(i + n) % 3]; lumen.appendChild(c); made.push(c);
          c.animate([{ transform: 'translate(' + x + 'px,' + y + 'px) scale(.5)', opacity: 0 }, { transform: 'translate(' + (x + dx * 0.5) + 'px,' + (y - up) + 'px) rotate(' + (dx * 6) + 'deg) scale(1)', opacity: 1, offset: 0.35 },
            { transform: 'translate(' + (x + dx) + 'px,' + (y - up + 26) + 'px) rotate(' + (dx * 14) + 'deg) scale(.7)', opacity: 0 }], { duration: 640, delay: at, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' });
        }
        if (fx && fx.snd) setTimeout(function () { fx.snd.play('k'); }, at);
      });
      var lastCap = caps[caps.length - 1], tag = D.createElement('span'), nb = D.createElement('b');
      nb.textContent = '5'; tag.className = 'ltag'; tag.appendChild(nb); tag.appendChild(D.createTextNode(cfg && cfg.lang === 'ko' ? '콤보' : 'combo')); lumen.appendChild(tag); made.push(tag);
      var tx = Math.max(0, lastCap.offsetLeft + lastCap.offsetWidth - tag.offsetWidth + 10), ty = lastCap.offsetTop - 30;
      var a = tag.animate([{ transform: 'translate(' + tx + 'px,' + (ty + 12) + 'px) scale(.6)', opacity: 0 }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(1.12)', opacity: 1, offset: 0.16 }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(1)', opacity: 1, offset: 0.26 },
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(1)', opacity: 1, offset: 0.78 }, { transform: 'translate(' + tx + 'px,' + (ty - 10) + 'px) scale(1)', opacity: 0 }], { duration: 1300, delay: 520, easing: 'ease-out', fill: 'both' });
      if (fx && fx.snd) setTimeout(function () { fx.snd.play('ms'); }, 560);
      a.onfinish = function () { made.forEach(function (c) { c.remove(); }); };
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) { if (e.intersectionRatio < 0.05) out = true; return; }
        if (e.intersectionRatio < 0.6 || !out || D.hidden || root.classList.contains('running') || Date.now() - last < 6000) return;
        out = false; last = Date.now();
        var lv = level();
        if (lumen.classList.contains('in') && lv > 0) { lumen.classList.remove('in'); void lumen.offsetWidth; }   /* 다시 들어왔을 때: 처음부터 다시 */
        lumen.classList.toggle('lite', lv === 0);
        lumen.classList.add('in');
        if (lv >= 2) burst();
      });
    }, { threshold: [0, 0.6] });
    io.observe(lumen);
  })();
})();
