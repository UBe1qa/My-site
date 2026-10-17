/* 병아리 구조대 소개 사이트 — 나타나기, 영상, 친구 고르기, 루멘랩 둥지. 외부 라이브러리 없음. */
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
    document.querySelectorAll('.rv').forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight) el.classList.add('is-in'); // 첫 화면에 걸친 것은 숨기지 않는다
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

  /* 능력 친구 고르기 */
  var data = document.getElementById('friend-text');
  var say = document.querySelector('.friend-say');
  var clip = document.getElementById('friend-clip');
  function showClip(k) { // 친구마다 능력 시연 영상(게임 도감 팝업과 같은 장면)
    if (!clip) return;
    clip.poster = '/img/abilities/' + k + '.webp';
    clip.src = '/video/abilities/' + k + '.mp4';
    if (!reduce) { var p = clip.play(); if (p && p.catch) p.catch(function () { clip.controls = true; }); }
  }
  if (clip) {
    if (reduce) { clip.removeAttribute('autoplay'); clip.controls = true; } // 동작 줄이기: 포스터만, 눌러서 재생
    else if (io) new IntersectionObserver(function (es) { // 보일 때만 재생
      es.forEach(function (e) { if (e.isIntersecting) { var p = clip.play(); if (p && p.catch) p.catch(function () {}); } else clip.pause(); });
    }, { threshold: .35 }).observe(clip);
  }
  if (data && say) {
    var F = JSON.parse(data.textContent);
    document.querySelectorAll('.friend').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.friend[aria-pressed="true"]').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        var f = F[b.dataset.k];
        say.querySelector('img').src = '/img/c-' + b.dataset.k + '.webp';
        say.querySelector('h3').textContent = f[0];
        say.querySelector('p').textContent = f[1];
        showClip(b.dataset.k);
        if (!reduce) say.animate([{ opacity: .4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
      });
    });
  }

  /* 루멘랩 둥지: 카드가 60% 넘게 보이면 병아리가 날아와 앉고 불이 켜진다(한 번) */
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
