/* 캐슬업! 소개 사이트 — 나타나기, 영상, 성 등급 넘기기, 루멘랩 탑. 외부 라이브러리 없음. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = 'IntersectionObserver' in window;

  /* 나타나기: 화면에 들어오면 한 번 */
  if (io && !reduce) {
    document.documentElement.classList.add('js-motion');
    var rv = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); rv.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.rv').forEach(function (el) {
      if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in'); // 첫 화면에 걸친 것은 숨기지 않는다
      else rv.observe(el);
    });
  }

  /* 영상: 보일 때만 재생, 동작 줄이기면 포스터만(재생 단추) */
  var v = document.getElementById('play-video');
  if (v) {
    if (reduce) { v.removeAttribute('autoplay'); v.controls = true; }
    else if (io) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () { v.controls = true; }); } else v.pause(); });
      }, { threshold: .35 }).observe(v);
    }
  }

  /* 성 등급 20: 넘기면 새 성이 위에서 쿵 내려앉는다 */
  function tower(box, auto) {
    var G = JSON.parse(box.dataset.grades), meta = box.dataset.meta;
    var img = box.querySelector('.tower-img img'), name = box.querySelector('.tower-name'), m = box.querySelector('.tower-meta');
    var range = box.querySelector('input[type=range]');
    var cur = range ? +range.value : 1;
    G.forEach(function (g) { var p = new Image(); p.src = '/img/castle-' + ('0' + g[1]).slice(-2) + '.webp'; }); // 미리 받아 두기(20장, 각 30KB 안팎)
    function show(n) {
      n = Math.max(1, Math.min(20, n)); if (n === cur && img.dataset.n) return; cur = n; img.dataset.n = n;
      var g = G[n - 1];
      img.src = '/img/castle-' + ('0' + n).slice(-2) + '.webp';
      name.textContent = g[0];
      m.textContent = meta.replace('{n}', g[1]).replace('{f}', g[2]);
      if (range) range.value = n;
      if (!reduce) { img.classList.remove('is-drop'); void img.offsetWidth; img.classList.add('is-drop'); }
    }
    if (range) range.addEventListener('input', function () { stop(); show(+range.value); });
    box.querySelectorAll('[data-step]').forEach(function (b) { b.addEventListener('click', function () { stop(); show(cur + +b.dataset.step); }); });
    var timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function play(from) { // 한 번만 1등급부터 끝까지
      if (reduce) return;
      var n = from; show(n);
      timer = setInterval(function () { n++; if (n > 20) { stop(); return; } show(n); }, auto);
    }
    return { play: play, stop: stop, show: show };
  }
  var tw = document.querySelector('.tower');
  if (tw) {
    var T1 = tower(tw, 260);
    if (io && !reduce) new IntersectionObserver(function (es, o) {
      es.forEach(function (e) { if (e.intersectionRatio >= .6) { o.disconnect(); T1.play(1); } });
    }, { threshold: [0, .6] }).observe(tw);
  }
  var t3 = document.querySelector('.v3-tower');
  if (t3) { var T3 = tower(t3, 330); setTimeout(function () { T3.play(1); }, 500); }

  /* 루멘랩 탑: 카드가 60% 넘게 보이면 아래층부터 불이 켜지고 깃발이 오른다(한 번) */
  var lumen = document.querySelector('.lumen');
  if (lumen) {
    if (reduce || !io) lumen.classList.add('is-lit');
    else new IntersectionObserver(function (es, o) {
      es.forEach(function (e) { if (e.intersectionRatio >= .6) { lumen.classList.add('is-lit'); o.disconnect(); } });
    }, { threshold: [0, .6] }).observe(lumen);
  }

  /* 메일 주소 복사 */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.copy, done = function () { var o = b.textContent; b.textContent = b.dataset.done; setTimeout(function () { b.textContent = o; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () {});
    });
  });
})();
