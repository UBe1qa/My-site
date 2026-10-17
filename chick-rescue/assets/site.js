/* 병아리 구조대 소개 사이트 — 나타나기, 영상, 말풍선, 친구 무대 넘기기, 하단 줄. 외부 라이브러리 없음.
   맛보기 판은 /assets/demo.js(게임 세션이 준 그대로)가 맡는다. 이 파일은 requestAnimationFrame을 쓰지 않는다:
   모든 연출은 CSS 애니메이션(보일 때 한 번)이고, 말풍선은 판이 바뀔 때만, 무대는 넘길 때만 계산한다. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = 'IntersectionObserver' in window;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  if (io && !reduce) document.documentElement.classList.add('js-motion');

  function playSafe(v) { var p = v.play(); if (p && p.catch) p.catch(function () { v.controls = true; }); }

  /* 나타나기: 보일 때 한 번 '퐁' */
  function once(sel, opt) {
    var els = $$(sel);
    if (!io || reduce) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var ob = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); ob.unobserve(e.target); } });
    }, opt || { rootMargin: '0px 0px -12% 0px' });
    els.forEach(function (e) { ob.observe(e); });
  }
  once('.drop');

  /* 루멘랩 이정표: 60% 넘게 보이면 기둥이 솟고 판자가 걸리고 병아리가 앉아 '삐약'(2초, 한 번). 나갔다 6초 뒤 다시 들어오면 다시 */
  var lumen = $('#lumen');
  if (lumen && io && !reduce) {
    var lumenAt = 0;
    lumen.classList.add('arm');
    new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || es[0].intersectionRatio < .6 || document.hidden) return;
      if (lumenAt && Date.now() - lumenAt < 6000) return;
      lumenAt = Date.now();
      lumen.classList.remove('in'); void lumen.offsetWidth; lumen.classList.add('in');
    }, { threshold: [0, .6] }).observe(lumen);
  }
  once('.end-stack', { threshold: .5 });

  /* 실제 화면 영상: 보일 때만 재생. 움직임 줄이기면 포스터 + 재생 단추 */
  $$('video[data-auto]').forEach(function (v) {
    if (reduce || !io) { v.controls = true; return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) playSafe(v); else v.pause(); });
    }, { threshold: .35 }).observe(v);
  });

  /* 주 단추 누름: 공처럼 찌그러졌다 펴짐 */
  $$('.cta').forEach(function (b) {
    b.addEventListener('pointerdown', function () {
      if (reduce) return;
      b.classList.remove('is-press'); void b.offsetWidth; b.classList.add('is-press');
    });
  });

  /* 머리말(컴퓨터): 내려가면 바탕을 깐다 */
  var top = $('.top');
  if (top) {
    var stuck = function () { top.classList.toggle('is-stuck', scrollY > 20); };
    addEventListener('scroll', stuck, { passive: true }); stuck();
  }

  /* 갇힌 병아리 말풍선: 병아리가 있는 튜브 위에. 튜브를 고르거나 판을 다 풀면 숨김. 판이 바뀔 때만 계산 */
  var demo = $('#demo'), peep = demo && $('.peep', demo), done = demo && $('.demo-done', demo);
  var chickName = '';
  try { chickName = JSON.parse($('#demo-text').textContent).names.b; } catch (e) {}
  var lastT = null, pt = 0;
  function placePeep() {
    pt = 0;
    if (!peep) return;
    var t = null;
    $$('.tube', demo).forEach(function (b) { if (chickName && (b.getAttribute('aria-label') || '').indexOf(chickName) >= 0) t = b; });
    if (!t || $('.tube.is-sel', demo) || demo.classList.contains('is-done')) { peep.hidden = true; lastT = null; return; }
    var r = t.getBoundingClientRect(), o = demo.getBoundingClientRect();
    var wasHidden = peep.hidden;
    peep.hidden = false;
    var w = peep.offsetWidth, cx = r.left + r.width / 2 - o.left, x = Math.max(w / 2 + 2, Math.min(o.width - w / 2 - 2, cx));
    peep.style.left = x + 'px';
    peep.style.top = (r.top - o.top - 12) + 'px';
    peep.style.setProperty('--tail', (50 + (cx - x) / w * 100) + '%');
    if ((wasHidden || lastT !== t) && !reduce) { peep.classList.remove('is-pop'); void peep.offsetWidth; peep.classList.add('is-pop'); }
    lastT = t;
  }
  function queuePeep() { clearTimeout(pt); pt = setTimeout(placePeep, 60); }
  if (demo && peep && 'MutationObserver' in window) {
    var board = $('.board', demo);
    // 튜브가 바뀌거나(고르기·옮기기·읽기 라벨) 판이 끝났을 때만. 조각의 style(프레임마다 바뀜)은 보지 않는다
    new MutationObserver(queuePeep).observe(board, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-label'] });
    new MutationObserver(queuePeep).observe(demo, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', function () { setTimeout(queuePeep, 200); });
    queuePeep();
  }

  /* 친구 무대: 옆으로 넘기기(scroll-snap) + 앞뒤 단추 + 12마리 줄. 보이는 무대의 영상만, 칸이 보일 때만 재생 */
  var track = $('#track');
  if (track) {
    var slides = $$('.stage', track), picks = $$('.pick'), cur = -1, onScreen = false, st = 0;
    var nearest = function () {
      var c = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
      slides.forEach(function (s, i) { var dd = Math.abs(s.offsetLeft + s.offsetWidth / 2 - c); if (dd < bd) { bd = dd; best = i; } });
      return best;
    };
    var syncVideo = function () {
      slides.forEach(function (s, k) {
        var v = $('video', s); if (!v) return;
        if (reduce) { v.controls = true; return; }
        if (k === cur && onScreen) playSafe(v); else if (!v.paused) v.pause();
      });
    };
    var setCur = function (i) {
      if (i === cur) return;
      cur = i;
      var k = slides[i].dataset.k;
      picks.forEach(function (p) { p.setAttribute('aria-pressed', p.dataset.k === k ? 'true' : 'false'); });
      slides.forEach(function (s, n) { s.classList.toggle('is-cur', n === i); });
      if (!reduce) { var s = slides[i]; s.classList.remove('is-hop'); void s.offsetWidth; s.classList.add('is-hop'); }
      syncVideo();
    };
    var go = function (i) {
      i = (i + slides.length) % slides.length;
      var s = slides[i];
      var left = matchMedia('(min-width:700px)').matches ? s.offsetLeft : s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2;
      track.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' });
      setCur(i);
    };
    track.addEventListener('scroll', function () { clearTimeout(st); st = setTimeout(function () { setCur(nearest()); }, 90); }, { passive: true });
    $('.nav-prev').addEventListener('click', function () { go(cur - 1); });
    $('.nav-next').addEventListener('click', function () { go(cur + 1); });
    picks.forEach(function (p) {
      p.addEventListener('click', function () { go(slides.indexOf(document.getElementById('st-' + p.dataset.k))); });
    });
    if (io) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; syncVideo(); }, { threshold: .3 }).observe(track);
    setCur(0);
    slides[0].classList.remove('is-hop');
  }

  /* 휴대폰 하단 줄: 주 단추 하나. 맛보기 완료 창이 보이는 동안(창 안에 같은 단추)과 끝 칸 단추가 보일 때는 숨김 */
  var dock = $('#dock');
  if (dock) {
    var doneShown = false, endSeen = false;
    var sync = function () { dock.classList.toggle('is-off', doneShown || endSeen); };
    var endBtn = $('.end-cta');
    if (io && endBtn) new IntersectionObserver(function (es) { endSeen = es[0].isIntersecting; sync(); }, { rootMargin: '0px 0px -40px 0px' }).observe(endBtn);
    if (done) {
      var doneIn = false;
      var check = function () { doneShown = !done.hidden && doneIn; sync(); };
      if (io) new IntersectionObserver(function (es) { doneIn = es[0].isIntersecting; check(); }).observe(done);
      else doneIn = true;
      if ('MutationObserver' in window) new MutationObserver(function () { if (done.hidden) doneIn = false; check(); }).observe(done, { attributes: true, attributeFilter: ['hidden'] });
    }
    sync();
  }
})();
