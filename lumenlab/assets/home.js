/* 루멘랩 홈(2026-11-10 디자인 틀): 첫 화면 장면 밖의 일. 라이브러리 없음. 장면은 assets/home-scene.js, 소개 창은 assets/store.js.
   1) 테마: 화면 세로 가운데 줄에 걸친 칸(data-theme, 바닥글은 밤)의 테마로 html[data-theme] → 바탕 전체가 0.5초에 바뀜(home.css)
   2) 위 막대: 막대 아래 끝이 첫 화면 아래 끝을 지나면 .is-solid. 폰은 ☰ 단추를 막대 안으로 옮기고 누르면 오른쪽에서 서랍
   3) 작품 판: 판 위 끝이 화면 위에서 65%를 넘으면 한 번 .in(등장). 영상은 반쯤 보이면 소리 없이 돌고 벗어나면 멈춤(동작 줄이기·데이터 절약이면 포스터만)
      웹 도구 판은 가까워지면 바로 써 보기(assets/try/<id>.js, 그 도구 사이트의 계산 파일 data-core·data-mod)를 판 안에 띄운다
   4) 전체 보기: 띠의 단추로 큰 아이콘 칸을 펼치고 접음. #works·#games… 로 들어오거나 그 주소로 가는 링크를 누르면 펼친 채 그 자리로
   5) 문의: 주소 복사 */
(function () {
  'use strict';
  var d = document.documentElement;
  window.__homeOn = true;
  if (d.classList.contains('anim')) window.__rvOn = true;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IO = 'IntersectionObserver' in window;
  var LANG = d.lang === 'en' ? 'en' : 'ko';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var swap = function (el, on) { var s = $$('[data-i18n]', el); if (s.length > 1) { s[0].hidden = on; s[1].hidden = !on; } };

  /* 1) 테마 */
  var secs = $$('main > [data-theme]'), foot = $('footer.foot');
  if (foot) { foot.setAttribute('data-theme', 'night'); secs.push(foot); }
  if (IO) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) d.setAttribute('data-theme', e.target.getAttribute('data-theme')); });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    secs.forEach(function (s) { io.observe(s); });
  }

  /* 2) 위 막대와 서랍 */
  var top = $('.top'), hero = $('.hero');
  function solid() { if (top && hero) top.classList.toggle('is-solid', scrollY + top.offsetHeight >= hero.offsetHeight); }
  solid(); addEventListener('scroll', solid, { passive: true }); addEventListener('resize', solid);
  var mb = $('.menu-btn'), dr = $('#drawer'), tin = $('.top__in');
  if (mb && dr && tin) {
    tin.appendChild(mb);
    var shut = 0;
    var setOpen = function (on, back) {
      clearTimeout(shut);
      mb.setAttribute('aria-expanded', on ? 'true' : 'false'); swap(mb, on);
      d.classList.toggle('menu-open', on);
      if (on) { dr.hidden = false; void dr.offsetWidth; dr.classList.add('is-open'); var f = $('a', dr); if (f) f.focus({ preventScroll: true }); }
      else { dr.classList.remove('is-open'); shut = setTimeout(function () { dr.hidden = true; }, reduced ? 0 : 300); if (back) mb.focus({ preventScroll: true }); }
    };
    mb.addEventListener('click', function () { setOpen(mb.getAttribute('aria-expanded') !== 'true', false); });
    dr.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return;
      if (a.classList.contains('lang')) try { localStorage.setItem('lumen:langbar', LANG === 'ko' ? 'en' : 'ko'); } catch (x) {}   // site.js 는 머리말의 언어 단추만 듣는다: 서랍 것도 고른 언어로 저장
      setOpen(false, false);
    });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && mb.getAttribute('aria-expanded') === 'true') setOpen(false, true); });
    matchMedia('(min-width:960px)').addEventListener('change', function (m) { if (m.matches) setOpen(false, false); });
  }

  /* 3) 작품 판 */
  var wps = $$('.wp');
  if (d.classList.contains('anim') && IO) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -35% 0px', threshold: 0 });
    wps.forEach(function (w) { if (w.getBoundingClientRect().top < innerHeight * 0.65) w.classList.add('in'); else rio.observe(w); });
  }
  var save = navigator.connection && navigator.connection.saveData;
  var vids = $$('video.wp__vid');
  if (vids.length && IO && !reduced && !save) {
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.intersectionRatio >= 0.5) { v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else if (!v.paused) v.pause();
      });
    }, { threshold: [0, 0.5] });
    vids.forEach(function (v) { vio.observe(v); });
  } else vids.forEach(function (v) { v.controls = true; });

  // 바로 써 보기: store.js 와 같은 방식으로 /assets/try/<id>.js 를 부르고 판(stage) 안에 띄운다(자동 시연은 소개 창에서만)
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function svg(tag, attrs, kids) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs || {}) el.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { el.appendChild(c); });
    return el;
  }
  var got = {};
  function load(src) {
    if (!got[src]) got[src] = new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = function () { ok(); }; s.onerror = function () { delete got[src]; no(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
    return got[src];
  }
  window.LLTry = window.LLTry || {};
  function mount(stage) {
    var id = stage.getAttribute('data-tool'), name = stage.getAttribute('data-name'), home = stage.getAttribute('data-home');
    var core = JSON.parse(stage.getAttribute('data-core') || '[]'), mod = JSON.parse(stage.getAttribute('data-mod') || '[]'), failed = false;
    function fail(e) {
      if (failed) return; failed = true; if (e) console.warn(e);
      stage.textContent = '';
      stage.appendChild(h('p', { class: 'wp__msg' }, [h('a', { href: home, text: name + (LANG === 'en' ? ' — open it ↗' : ' 열어 보기 ↗') })]));
    }
    core.concat(['/assets/try/' + id + '.js']).reduce(function (p, s) { return p.then(function () { return load(s); }); }, Promise.resolve()).then(function () {
      if (!window.LLTry[id]) throw new Error('no demo');
      stage.textContent = '';
      window.LLTry[id](stage, { lang: LANG, h: h, svg: svg, reduced: reduced, fail: fail, seed: null, mine: function () {},
        tool: { id: id, name: name, home: home, demo: { core: core, mod: mod } } });
    }).catch(fail);
  }
  var demos = $$('.wp__demo[data-tool]');
  if (IO) {
    var dio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { dio.unobserve(e.target); mount(e.target); } });
    }, { rootMargin: '400px 0px' });
    demos.forEach(function (s) { dio.observe(s); });
  } else demos.forEach(mount);

  /* 4) 전체 보기 */
  var all = $('.all'), ab = $('.all__btn');
  function openAll(on) {
    if (!all) return;
    all.classList.toggle('is-open', on);
    ab.setAttribute('aria-expanded', on ? 'true' : 'false'); swap(ab, on);
  }
  var WALLHASH = /^#(works|games|apps|tools|g-[a-z]+)$/;
  if (all && ab) {
    if (d.classList.contains('all-open')) openAll(true);
    ab.addEventListener('click', function () { openAll(!all.classList.contains('is-open')); });
    addEventListener('hashchange', function () { if (WALLHASH.test(location.hash)) openAll(true); });
    document.addEventListener('click', function (e) {   // 같은 주소(#works)를 다시 눌러도 펼친다
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var u = new URL(a.href, location.href);
      if (u.pathname === location.pathname && WALLHASH.test(u.hash)) openAll(true);
    });
  }

  /* 5) 주소 복사 */
  $$('[data-copy]').forEach(function (b) {
    var t = 0;
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-copy');
      var done = function () { swap(b, true); clearTimeout(t); t = setTimeout(function () { swap(b, false); }, 2000); };
      var old = function () {
        var ta = h('textarea', { readonly: true, style: 'position:fixed;opacity:0;left:-999px' }); ta.value = v; document.body.appendChild(ta); ta.select();
        try { if (document.execCommand('copy')) done(); } catch (e) {}
        ta.remove();
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, old); else old();
    });
  });
})();
