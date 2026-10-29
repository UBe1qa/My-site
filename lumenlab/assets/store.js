/* 만든 것 소개: 소개 페이지(/works/<id>/)와 홈의 소개 창이 같이 쓴다. 글은 build_store.py 가 페이지에 한 번만 만든다.
   1) 페이지: 본문(article.sh-doc)이 이미 있다. '바로 써 보기' 무대를 켜고, 미리 보기 영상은 화면에 보일 때만 소리 없이 돈다.
   2) 홈: 아이콘(a[data-show])을 누르면 그 소개 페이지를 불러(미리 받아 둔 게 있으면 그대로) .sh__body 를 창에 옮겨 담고 같은 일을 한다.
      아이콘이 칸에서 창으로 날아오고 주소는 /works/<id>/ 가 된다(공유하거나 새로 고치면 그 페이지). 뒤로 가기·Esc·창 밖·끌어내리기로 닫힌다.
      창 안 '다른 것도 둘러보기'를 누르면 창 내용만 바뀐다(뒤로 가기는 그대로 창 닫기).
   무대의 미리보기 화면은 /assets/try/<id>.js, 그 도구 사이트의 계산 파일(data-core·data-mod)을 그대로 불러 같은 계산을 돌린다. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(.2,.8,.2,1)';
  var LANG = document.documentElement.lang === 'en' ? 'en' : 'ko';
  var PRE = LANG === 'en' ? '/en' : '';
  var BASE_UI = LANG === 'en' ? { close: 'Close', loading: 'Loading' } : { close: '닫기', loading: '불러오는 중' };

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
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, kids) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs || {}) el.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { el.appendChild(c); });
    return el;
  }
  var $$ = function (root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };

  /* 계산 파일 불러오기: 도구 사이트의 assets 파일을 순서대로(한 번 불러온 건 다시 안 부른다) */
  var loaded = {};
  function loadScript(src) {
    if (!loaded[src]) loaded[src] = new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = function () { ok(); };
      s.onerror = function () { delete loaded[src]; no(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  function loadAll(list) {
    return list.reduce(function (p, src) { return p.then(function () { return loadScript(src); }); }, Promise.resolve());
  }
  window.LLTry = window.LLTry || {};


  /* 자동 시연: 누르는 자리에 동그란 터치 자국이 찍히고(앱 미리보기 영상의 '터치 보기'처럼) 글자가 쳐진다.
     손님이 누르거나(쓸어 넘기는 스크롤은 빼고) 키를 치면 그 즉시 멈추고, 도구가 reset 을 주면 시연이 바꿔 둔 값을 처음으로 돌린다.
     동작 줄이기: 기다림·터치 자국 없이 끝 모습만 바로 그리고 처음부터 손님 차례. '다시 보기'를 누를 때만 차례로 보여 준다. */
  function Auto(stage, badge, replay, run, hooks) {
    var gen = 0, dot = null, alive = true, running = false, dirty = false, ran = false, down = null;
    function stopErr() { var e = new Error('stop'); e.stop = true; return e; }
    function api(my, fast) {
      function live() { if (!alive || my !== gen) throw stopErr(); }
      function wait(ms) {
        return new Promise(function (ok, no) {
          setTimeout(function () { try { live(); ok(); } catch (e) { no(e); } }, fast ? 0 : ms);
        });
      }
      function at(el, fx, fy) {   // fx·fy = 그 칸 안 어디(0~1, 기본 가운데)
        var s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
        return 'translate(' + (r.left - s.left + r.width * (fx == null ? 0.5 : fx)) + 'px,' + (r.top - s.top + r.height * (fy == null ? 0.5 : fy)) + 'px)';
      }
      function pointAt(el, fx, fy) {
        live();
        if (fast) return Promise.resolve();
        if (!dot) { dot = h('span', { class: 'touch', 'aria-hidden': 'true' }); stage.appendChild(dot); }
        dot.style.transition = '';
        dot.style.transform = at(el, fx, fy);
        dot.classList.add('is-on');
        return wait(reduced ? 60 : 420);
      }
      // 자국만 옮긴다(끌기 시연: 기다리지 않고 바로, 움직임은 transition 이 잇는다)
      function moveTo(el, fx, fy) {
        live();
        if (fast) return Promise.resolve();
        if (!dot || !dot.classList.contains('is-on')) return pointAt(el, fx, fy);
        dot.style.transition = 'transform .08s linear,opacity .2s';
        dot.style.transform = at(el, fx, fy);
        return Promise.resolve();
      }
      function tap(el) {
        if (fast) return Promise.resolve();
        dot.classList.add('is-press');
        if (el) el.classList.add('is-auto-press');
        return wait(140).then(function () { dot.classList.remove('is-press'); if (el) el.classList.remove('is-auto-press'); });
      }
      function press(el) {
        return pointAt(el).then(function () { return tap(el); }).then(function () { el.click(); hideDot(); return wait(120); });
      }
      function setValue(input, v) {
        live();
        input.value = v;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // 칸을 한 번 톡 누르고 자국을 치운 뒤 친다(자국이 쳐지는 글자를 가리지 않게)
      function type(input, text, ms) {
        var chars = Array.isArray(text) ? text : Array.from(text);
        var i = 0, base = Array.isArray(text) ? '' : input.value;
        if (fast) { setValue(input, Array.isArray(text) ? chars[chars.length - 1] : base + text); return Promise.resolve(); }
        function step() {
          if (i >= chars.length) return Promise.resolve();
          setValue(input, Array.isArray(text) ? chars[i] : base + chars.slice(0, i + 1).join(''));
          i++;
          return wait(ms || 85).then(step);
        }
        return pointAt(input).then(function () { return tap(null); }).then(function () { hideDot(); return step(); });
      }
      return { wait: wait, point: pointAt, move: moveTo, press: press, set: setValue, type: type, reduced: reduced, fast: fast, live: live };
    }
    function hideDot() { if (dot) dot.classList.remove('is-on'); }
    function setBadge(auto) {
      badge.textContent = auto ? hooks.ui.auto : hooks.ui.yours;
      badge.className = 'stage__badge' + (auto ? ' is-auto' : '');
      replay.hidden = auto;
    }
    function start(fast) {
      var my = ++gen;
      fast = fast === true;
      if (ran && hooks.reset) hooks.reset();   // 다시 보기: 손님이 바꾼 것부터 지우고 처음 모습에서
      ran = true; dirty = true; running = !fast;
      setBadge(!fast);
      Promise.resolve().then(function () { return run(api(my, fast)); }).then(function () {
        if (my !== gen) return;
        running = false; hideDot(); setBadge(false);
      }, function (e) {
        if (e && e.stop) return;
        running = false; hideDot();
        if (hooks.fail) hooks.fail(e);
      });
    }
    // 손님 차례: 돌던 시연을 멈추고, 시연이 남긴 값은 한 번만 처음으로
    function mine() {
      if (!alive) return;
      if (running) { gen++; running = false; hideDot(); setBadge(false); }
      if (dirty) { dirty = false; if (hooks.reset) hooks.reset(); }
    }
    var GRAB = '[data-grab], input[type=range]';
    function opt(passive) { return { capture: true, passive: passive }; }
    stage.addEventListener('pointerdown', function (e) {
      if (!e.isTrusted) return;
      // 마우스와 끌어서 쓰는 것(고리·슬라이더)은 누르는 순간, 나머지 손가락은 떼었을 때 거의 안 움직였으면.
      // 칸·단추 위에서 시작해도 쓸어 올린 스크롤이면 시연을 이어 간다
      if (e.pointerType === 'mouse' || (e.target.closest && e.target.closest(GRAB))) { down = null; mine(); }
      else down = { x: e.clientX, y: e.clientY, id: e.pointerId };
    }, opt(true));
    stage.addEventListener('pointerup', function (e) {
      if (!down || e.pointerId !== down.id) return;
      var far = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 10;
      down = null;
      if (!far) mine();
    }, opt(true));
    stage.addEventListener('pointercancel', function () { down = null; }, opt(true));
    stage.addEventListener('keydown', function (e) { if (e.isTrusted) mine(); }, opt(true));
    replay.addEventListener('click', function () { start(false); });
    return { start: start, mine: mine, stop: function () { alive = false; gen++; } };
  }

  /* ---------- 본문 켜기(페이지·창 공통): 무대와 영상. 끌 때 부를 함수를 돌려준다 ---------- */
  function nameOf(root) {
    var n = root.querySelector('.sh__name');
    return n && n.firstChild ? n.firstChild.textContent.trim() : '';
  }
  // seed: 첫 화면 문장 칸이 넘긴 값(data-seed). 바로 써 보기가 그 칸의 값을 같은 계산으로 다시 보인다
  function mountDemo(root, UI, isLive, seed) {
    var stage = root.querySelector('.stage[data-tool]');
    if (!stage) return null;
    var id = stage.getAttribute('data-tool'), badge = root.querySelector('.stage__badge'), replay = root.querySelector('.stage__replay');
    var t = { id: id, name: nameOf(root), home: UI.home, demo: { core: JSON.parse(stage.getAttribute('data-core') || '[]'), mod: JSON.parse(stage.getAttribute('data-mod') || '[]') } };
    var auto = null, d = null, failed = false, alive = true;
    function failMsg() { return h('p', { class: 'stage__msg' }, [UI.fail + ' ', h('a', { href: t.home, text: t.name + ' ' + UI.open + ' ↗' })]); }
    // 불러온 뒤에 실패해도(예: 모듈 허락이 없는 주소) 빈 판 대신 안내와 도구 링크를 보인다
    function fail(e) {
      if (failed || !alive) return;
      failed = true;
      if (e) console.warn(e);
      if (auto) auto.stop();
      if (d && d.stop) d.stop();
      badge.textContent = ''; badge.className = 'stage__badge'; replay.hidden = true;
      stage.textContent = '';
      stage.classList.add('is-loading');
      stage.appendChild(failMsg());
    }
    loadAll(t.demo.core.concat(['/assets/try/' + id + '.js'])).then(function () {
      if (!alive || !isLive()) return;
      if (!window.LLTry[id]) throw new Error('no demo');
      stage.textContent = '';
      stage.classList.remove('is-loading');
      // mine(): 무대 밖에서 받은 진짜 입력(예: 키보드 시험의 키 누름)도 손님 차례로 넘긴다
      d = window.LLTry[id](stage, { lang: LANG, h: h, svg: svg, reduced: reduced, tool: t, fail: fail, seed: seed || null, mine: function () { if (auto) auto.mine(); } });
      if (failed) { if (d.stop) d.stop(); return; }
      auto = d.auto ? Auto(stage, badge, replay, d.auto, { reset: d.reset, fail: fail, ui: UI }) : null;
      if (auto) setTimeout(function () { if (alive && !failed) auto.start(reduced); }, reduced ? 200 : 650);
    }).catch(function (e) {
      if (!alive) return;
      console.warn(e);
      failed = true;
      stage.textContent = '';
      stage.classList.add('is-loading');
      stage.appendChild(failMsg());
    });
    return function () { alive = false; if (auto) auto.stop(); if (d && d.stop) d.stop(); };
  }
  // 미리 보기 영상: 화면에 반쯤 보이면 소리 없이 돌고, 벗어나면 멈춘다. 동작 줄이기·데이터 절약이면 자동으로 돌리지 않는다(재생 단추로)
  function wireVideos(root) {
    var vids = $$(root, 'video.shots__v');
    var save = navigator.connection && navigator.connection.saveData;
    if (!vids.length || reduced || save || !('IntersectionObserver' in window)) return null;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.intersectionRatio >= 0.5) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else if (!v.paused) v.pause();
      });
    }, { threshold: [0, 0.5] });
    vids.forEach(function (v) { io.observe(v); });
    return function () { io.disconnect(); vids.forEach(function (v) { v.pause(); }); };
  }
  /* 작업대(머리와 그 아래 물건들). 불 켜기·튀기·꼬리표 흔들림은 Web Animations 로(소개 페이지 첫 켜짐만 store.css 가 한다).
     - 스탠드: o.at(ms) 뒤에 딸깍 켜지고(깜빡 한 번) 꼬리표가 흔들린다. 스탠드를 누르면 끄고 켠다. 물건(아이콘)을 누르면 통 튄다.
       컴퓨터 마우스면 물건이 마우스 쪽으로 살짝 기운다(빛은 따라가지 않는다).
     - 칸(더 알아보기·확인한 것·가이드)이 보이면 .in, 벗어나면 지운다: 다시 들어오면 또 걸리고 그어진다.
     - 사실 숫자는 보일 때마다 0부터 센다(쉼표 그대로, 5 아래·범위·소수·값이 둘인 건 세지 않는다). 글에는 늘 최종 값이 있다.
     - 미리 보기: 가운데 온 화면만 밝고 크게(--f). 모니터: 처음 보일 때 한 번 켜진다.
     o.scroller = 창이면 .sh__body, 페이지면 null(화면). o.drop = 물건이 위에서 떨어져 앉는다(창 안에서 바뀔 때) */
  var FINE = matchMedia('(hover:hover) and (pointer:fine)');
  var FLICK = [{ '--sb-lit': 0 }, { '--sb-lit': 1, offset: .09 }, { '--sb-lit': .1, offset: .17 }, { '--sb-lit': 1, offset: .27 }, { '--sb-lit': 1 }];
  var SWING = ['-30', '6', '-14', '-3', '-9', '-7'].map(function (d, i, a) { return { transform: 'rotate(' + d + 'deg)', offset: [0, .22, .42, .62, .8, 1][i] }; });
  var HOP = [{ transform: 'scale(1.06,.9)' }, { transform: 'translateY(-26px) scale(.96,1.05)', offset: .3 }, { transform: 'none', offset: .6 }, { transform: 'scale(1.04,.95)', offset: .75 }, { transform: 'none' }];
  var DROP = [{ transform: 'translateY(-70px)', opacity: 0 }, { transform: 'none', opacity: 1, offset: .55 }, { transform: 'scale(1.05,.93)', offset: .72 }, { transform: 'none', opacity: 1 }];
  var NUM = /^(\d{1,3}(?:,\d{3})+|\d+)(\D*)$/;
  function bench(root, o) {
    if (!root.querySelector('.sh__spot')) return null;
    var spot = root.querySelector('.sh__spot'), icon = spot.querySelector('.sh__icon'), lamp = spot.querySelector('.sh__lamp'), tag = root.querySelector('.sh__status');
    var offs = [], timers = [], rafs = {};
    function on(el, ev, f, opt) { el.addEventListener(ev, f, opt); offs.push(function () { el.removeEventListener(ev, f, opt); }); }
    function play(el, kf, opt) { if (!reduced && el && el.animate) try { return el.animate(kf, opt); } catch (e) {} return null; }
    function light() {
      spot.classList.remove('off');
      play(spot, FLICK, { duration: 800 });
      play(tag, SWING, { duration: 1400, delay: 120, easing: 'cubic-bezier(.3,.6,.4,1)' });
    }
    if (o.at != null && !reduced) { spot.classList.add('off'); timers.push(setTimeout(light, o.at)); }
    if (o.drop) play(icon, DROP, { duration: 550, easing: 'cubic-bezier(.3,.7,.4,1)' });
    if (lamp) on(lamp, 'click', function () { if (spot.classList.contains('off')) light(); else spot.classList.add('off'); });
    if (icon) on(icon, 'click', function () { play(icon, HOP, { duration: 620, easing: 'cubic-bezier(.3,.7,.4,1)', composite: 'add' }); });
    if (icon && !reduced) {
      on(spot, 'pointermove', function (e) {
        if (e.pointerType !== 'mouse' || !FINE.matches) return;
        var r = spot.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        icon.style.setProperty('--ry', (x * 24).toFixed(1) + 'deg');
        icon.style.setProperty('--rx', (-y * 16).toFixed(1) + 'deg');
      });
      on(spot, 'pointerleave', function () { icon.style.removeProperty('--rx'); icon.style.removeProperty('--ry'); });
    }
    $$(root, '.sh__cards > li, .sh__guides > li, .sh__steps > li, .sh__days > li').forEach(function (li) { li.style.setProperty('--i', Array.prototype.indexOf.call(li.parentNode.children, li)); });

    var io = 'IntersectionObserver' in window && !reduced;
    // 칸 드러내기: 아래 10%를 뺀 화면에 들어오면
    if (io) {
      // 영수증은 한 번만 밀려 나온다(긴 종이가 되돌아올 때마다 다시 나오면 읽던 줄을 놓친다)
      var rio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (!(e.target.classList.contains('sh__basis') && e.target.classList.contains('in'))) e.target.classList.toggle('in', e.isIntersecting); });
      }, { root: o.scroller, rootMargin: '0px 0px -10% 0px' });
      $$(root, '.sh__how, .sh__more, .sh__log, .sh__basis, .sh__books, .sh__changes').forEach(function (s) { rio.observe(s); });
      offs.push(function () { rio.disconnect(); });
    }
    // 사실 숫자 세기
    var nums = $$(root, '.sh__facts b').filter(function (b) {
      var m = NUM.exec(b.textContent.trim());
      return m && +m[1].replace(/,/g, '') >= 5;
    });
    if (io && nums.length) {
      nums.forEach(function (b) { b.setAttribute('data-v', b.textContent.trim()); });
      var count = function (b, i) {
        var m = NUM.exec(b.getAttribute('data-v')), v = +m[1].replace(/,/g, ''), comma = m[1].indexOf(',') > 0, t0 = performance.now();
        if (!rafs['n' + i]) b.style.minWidth = b.getBoundingClientRect().width + 'px';
        cancelAnimationFrame(rafs['n' + i]);
        (function step(now) {
          var k = Math.min(1, ((now || t0) - t0) / 900), n = Math.round(v * (1 - Math.pow(1 - k, 3)));
          b.textContent = (comma ? n.toLocaleString('en-US') : n) + m[2];
          if (k < 1) rafs['n' + i] = requestAnimationFrame(step);
          else { rafs['n' + i] = 0; b.textContent = b.getAttribute('data-v'); b.style.minWidth = ''; }
        })();
      };
      var fio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) nums.forEach(count); });
      }, { root: o.scroller, threshold: .6 });
      fio.observe(root.querySelector('.sh__facts'));
      offs.push(function () { fio.disconnect(); nums.forEach(function (b) { b.textContent = b.getAttribute('data-v'); b.style.minWidth = ''; }); });
    }
    // 미리 보기: 가운데 온 화면에 불빛
    var shots = root.querySelector('.shots');
    if (shots && !reduced) {
      var items = Array.prototype.slice.call(shots.children);
      var focus = function () {
        rafs.shots = 0;
        var r = shots.getBoundingClientRect(), cx = r.left + r.width / 2;
        items.forEach(function (li) {
          var b = li.getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - cx) / (li.offsetWidth + 16);
          li.style.setProperty('--f', Math.max(0, 1 - d).toFixed(3));
        });
      };
      var soon = function () { if (!rafs.shots) rafs.shots = requestAnimationFrame(focus); };
      on(shots, 'scroll', soon, { passive: true });
      on(window, 'resize', soon);
      soon();
    }
    // 모니터 켜짐(한 번)
    var mon = root.querySelector('.mon');
    if (mon && io) {
      var mio = new IntersectionObserver(function (es) {
        if (!es.some(function (e) { return e.isIntersecting; })) return;
        mio.disconnect();
        play(mon.querySelector('.stage'), [
          { clipPath: 'inset(49% 3% 49% 3% round 12px)', filter: 'brightness(2.6)' },
          { clipPath: 'inset(0 0 0 0 round 12px)', filter: 'brightness(1.7)', offset: .35 },
          { clipPath: 'inset(0 0 0 0 round 12px)', filter: 'none' }], { duration: 700, easing: EASE });
      }, { root: o.scroller, threshold: .35 });
      mio.observe(mon);
      offs.push(function () { mio.disconnect(); });
    }
    return function () {
      timers.forEach(clearTimeout);
      for (var k in rafs) cancelAnimationFrame(rafs[k]);
      offs.forEach(function (f) { f(); });
    };
  }

  function start(root, UI, isLive, seed, o) {
    var stops = [mountDemo(root, UI, isLive, seed), wireVideos(root), bench(root, o || {})].filter(Boolean);
    return function () { stops.forEach(function (f) { f(); }); };
  }

  /* ---------- 1) 소개 페이지 ---------- */
  var doc = document.querySelector('article.sh-doc');
  if (doc) { start(doc, JSON.parse(doc.getAttribute('data-ui')), function () { return true; }, null, { scroller: null }); return; }

  /* ---------- 2) 홈의 소개 창 ---------- */
  if (!document.querySelector('a[data-show]') || typeof HTMLDialogElement !== 'function' || !window.fetch || !window.DOMParser) return;
  var HOME = location.pathname, HOME_TITLE = document.title;   // 창을 닫으면 돌아올 주소와 제목
  var urlOf = function (id) { return PRE + '/works/' + id + '/'; };

  // 소개 페이지 받기(한 번 받은 건 그대로). 실패하면 그 페이지로 그냥 이동한다
  var cache = {}, ready = {}, titles = {};
  function get(id) {
    if (!cache[id]) cache[id] = fetch(urlOf(id), { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (txt) {
      var doc = new DOMParser().parseFromString(txt, 'text/html'), art = doc.querySelector('article.sh-doc');
      if (!art || art.getAttribute('data-id') !== id) throw new Error('no sheet ' + id);
      ready[id] = art; titles[id] = doc.title;
      return art;
    }).catch(function (e) { delete cache[id]; throw e; });
    return cache[id];
  }
  function prefetch(id) { if (id && !cache[id]) get(id).catch(function () {}); }
  document.addEventListener('pointerover', function (e) { var a = e.target.closest && e.target.closest('a[data-show]'); if (a) prefetch(a.getAttribute('data-show')); }, { passive: true });
  document.addEventListener('pointerdown', function (e) { var a = e.target.closest && e.target.closest('a[data-show]'); if (a) prefetch(a.getAttribute('data-show')); }, { passive: true });
  document.addEventListener('focusin', function (e) { var a = e.target.closest && e.target.closest('a[data-show]'); if (a) prefetch(a.getAttribute('data-show')); });
  // 아이콘 칸이 화면에 들어오면 쉬는 틈에 전부 받아 둔다(누르는 순간 바로 뜨게, 하나씩 차례로)
  var works = document.querySelector('.works');
  if (works && 'IntersectionObserver' in window) {
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 300); };
    var pio = new IntersectionObserver(function (es) {
      if (!es.some(function (e) { return e.isIntersecting; })) return;
      pio.disconnect();
      var ids = $$(works, 'a[data-show]').map(function (a) { return a.getAttribute('data-show'); });
      (function next() { var id = ids.shift(); if (!id) return; idle(function () { (cache[id] || get(id)).then(next, next); }); })();
    }, { rootMargin: '200px 0px' });
    pio.observe(works);
  }

  // 창 뼈대(한 번만 만든다)
  var dlg = h('dialog', { class: 'sheet', 'aria-labelledby': 'sh-name' });
  var panel = h('div', { class: 'sh' });
  dlg.appendChild(panel);
  document.body.appendChild(dlg);
  var cur = null, opener = null, stopNow = null, closing = false, watchOpen = null, flyAnim = null, token = 0, seed = null;

  function swapTag(el, tag) {
    var n = document.createElement(tag);
    for (var i = 0; i < el.attributes.length; i++) n.setAttribute(el.attributes[i].name, el.attributes[i].value);
    while (el.firstChild) n.appendChild(el.firstChild);
    el.parentNode.replaceChild(n, el);
  }
  // 창 안에서는 제목이 한 단계 아래(페이지의 h1 → h2, 칸 제목 h2 → h3)
  function relevel(root) { $$(root, 'h2').forEach(function (el) { swapTag(el, 'h3'); }); $$(root, 'h1').forEach(function (el) { swapTag(el, 'h2'); }); }

  function bar(UI) {
    // 머리의 '열기'가 위로 지나가면 같은 단추가 작게 창 위 막대에 붙는다(스토어의 '받기'처럼)
    var pill = UI.home ? h('a', { class: 'sh__pill', href: UI.home, tabindex: '-1', 'aria-hidden': 'true' }, [h('img', { src: UI.icon, width: 26, height: 26, alt: '' }), h('span', { text: UI.open })]) : null;
    return h('div', { class: 'sh__bar' }, [
      h('span', { class: 'sh__grab', 'aria-hidden': 'true' }),
      pill,
      h('button', { type: 'button', class: 'sh__x', 'aria-label': UI.close, onclick: requestClose }, [svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [svg('path', { d: 'M6 6l12 12M18 6L6 18' })])])
    ]);
  }
  // 받기 전: 막대 + 아이콘만 있는 몸통(아이콘이 날아와 앉을 자리). 받으면 fill 이 바꾼다
  function skeleton(trigger, id) {
    var img = trigger && trigger.querySelector('img');
    panel.removeAttribute('style');
    panel.textContent = '';
    panel.appendChild(bar({ close: BASE_UI.close }));
    var icon = h('img', { class: 'sh__icon', src: img ? img.getAttribute('src') : '', width: 112, height: 112, alt: '' });
    var nm = (trigger && trigger.querySelector('.wi__n')) || document.querySelector('.works a[data-show="' + id + '"] .wi__n');   // 첫 화면 단추·앞으로 가기면 칸의 이름
    // 불 꺼진 작업대에 물건만(스탠드는 받은 본문과 함께 와서 켜진다). 그림 칸 크기가 같아 아이콘 자리도 같다
    var spot = h('div', { class: 'sh__spot off' }, [h('div', { class: 'sh__rig' }, [icon])]);
    panel.appendChild(h('div', { class: 'sh__body' }, [h('header', { class: 'sh__head' }, [spot, h('div', { class: 'sh__id' }, [
      h('h2', { class: 'sh__name', id: 'sh-name', tabindex: '-1', text: nm ? nm.textContent.trim() : '' }),
      h('p', { class: 'stage__msg sh__wait', text: BASE_UI.loading })])])]));
    return icon;
  }
  // o.at = 스탠드가 켜질 때(아이콘이 날아와 앉은 뒤), o.drop = 창 안에서 바뀔 때 물건이 떨어져 앉는다
  function fill(art, o) {
    var UI = JSON.parse(art.getAttribute('data-ui'));
    panel.setAttribute('style', art.getAttribute('style') || '');
    var body = document.importNode(art.querySelector('.sh__body'), true);
    relevel(body);
    panel.textContent = '';
    panel.appendChild(bar(UI));
    panel.appendChild(body);
    var icon = body.querySelector('.sh__icon');
    if (flyAnim && flyAnim.playState === 'running') { icon.style.visibility = 'hidden'; flyAnim.addEventListener('finish', function () { icon.style.visibility = ''; }); }
    var openBtn = body.querySelector('.sh__open');
    if (watchOpen) watchOpen.disconnect();
    watchOpen = openBtn && 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      var e = en[en.length - 1];
      panel.classList.toggle('is-past', !e.isIntersecting && e.boundingClientRect.top < e.rootBounds.top + 10);
    }, { root: body, threshold: 0 }) : null;
    if (watchOpen) watchOpen.observe(openBtn);
    panel.classList.remove('is-past');
    var my = ++token;
    stopNow = start(body, UI, function () { return my === token && !!cur; }, seed, { scroller: body, at: o.at, drop: o.drop });
    return body;
  }
  function setTitle(id) { if (cur === id && titles[id]) document.title = titles[id]; }
  function focusName() {
    var n = panel.querySelector('.sh__name') || panel.querySelector('.sh__x');
    if (n) n.focus({ preventScroll: true });   // 첫 초점은 제목: Space·PageDown 으로 창이 내려가고, Space 가 닫기를 누르지 않는다
  }

  /* 열고 닫기 */
  var mobile = matchMedia('(max-width:640px)');
  function panelIn() {
    if (reduced) return panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    return mobile.matches
      ? panel.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 300, easing: EASE })
      : panel.animate([{ opacity: 0, transform: 'translateY(28px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE });
  }
  function panelOut(fromY) {
    if (reduced) return panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' });
    return mobile.matches
      ? panel.animate([{ transform: 'translateY(' + (fromY || 0) + 'px)' }, { transform: 'translateY(100%)' }], { duration: 260, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' })
      : panel.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(20px) scale(.98)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
  }
  // 아이콘이 칸에서 창으로(닫을 땐 거꾸로) 날아간다. 창은 맨 위 층이라 날아가는 그림도 창 안에 둔다.
  function fly(fromEl, toEl, ms) {
    if (reduced || !fromEl || !toEl) return null;
    var a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    if (!a.width || a.bottom < 0 || a.top > innerHeight) return null;
    var g = h('img', { class: 'sh__ghost', src: toEl.getAttribute('src'), alt: '' });
    g.style.cssText = 'left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px';
    dlg.appendChild(g);
    toEl.style.visibility = 'hidden';
    var anim = g.animate([
      { transform: 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + (a.width / b.width) + ')' },
      { transform: 'none' }
    ], { duration: ms, easing: EASE });
    anim.addEventListener('finish', function () { toEl.style.visibility = ''; g.remove(); });
    return anim;
  }
  function flyBack(fromEl, toEl) {
    if (reduced || !fromEl || !toEl) return;
    var a = toEl.getBoundingClientRect(), b = fromEl.getBoundingClientRect();
    if (!a.width || a.bottom < 0 || a.top > innerHeight) return;
    var g = h('img', { class: 'sh__ghost', src: fromEl.getAttribute('src'), alt: '' });
    g.style.cssText = 'left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px';
    dlg.appendChild(g);
    fromEl.style.visibility = 'hidden';
    g.animate([{ transform: 'none' }, { transform: 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + (a.width / b.width) + ')' }],
      { duration: 260, easing: EASE, fill: 'forwards' });
  }
  // 그 항목이 홈에서 앉아 있는 아이콘(만든 것 칸 > 첫 화면 탭), 날아갈 출발·도착 자리
  function homeIcon(id, trigger) {
    if (trigger && trigger.getAttribute('data-show') === id && !panel.contains(trigger)) {
      var f = trigger.getAttribute('data-from');
      var el = f ? document.querySelector(f) : trigger.querySelector('img');
      if (el && el.getBoundingClientRect().width) return el;
    }
    return document.querySelector('.works a[data-show="' + id + '"] img');
  }

  function open(id, trigger, push) {
    if (cur) return;
    cur = id; opener = trigger || null; closing = false; seed = null;
    if (trigger && trigger.getAttribute('data-show') === id && trigger.hasAttribute('data-seed')) try { seed = JSON.parse(trigger.getAttribute('data-seed')); } catch (e) {}
    var gap = innerWidth - document.documentElement.clientWidth;
    if (gap > 0) document.documentElement.style.paddingRight = gap + 'px';
    document.documentElement.classList.add('is-sheet');
    var target = ready[id] ? null : skeleton(trigger, id);
    var body = ready[id] ? fill(ready[id], { at: 330 }) : null;
    dlg.showModal();
    var b = panel.querySelector('.sh__body'); if (b) b.scrollTop = 0;
    flyAnim = fly(homeIcon(id, trigger), target || body.querySelector('.sh__icon'), 360);
    panelIn();
    if (push !== false) history.pushState({ sheet: id }, '', urlOf(id));
    if (body) { setTitle(id); focusName(); }
    else get(id).then(function (art) {
      if (cur !== id) return;
      var left = flyAnim && flyAnim.playState === 'running' ? 360 - (flyAnim.currentTime || 0) : 0;
      fill(art, { at: Math.max(60, left - 30) }); setTitle(id); focusName();
    }, function () { if (cur === id) location.href = urlOf(id); });
  }
  // 창 안의 '다른 것도 둘러보기': 창은 그대로 두고 내용만 바꾼다
  function swap(id) {
    if (!cur || closing || id === cur) return;
    var was = cur; cur = id; seed = null;
    if (stopNow) { stopNow(); stopNow = null; }
    history.replaceState({ sheet: id }, '', urlOf(id));
    get(id).then(function (art) {
      if (cur !== id) return;
      var go = function () {
        fill(art, { at: 200, drop: true }); setTitle(id);
        var b = panel.querySelector('.sh__body'); if (b) b.scrollTop = 0;
        if (!reduced) panel.querySelector('.sh__body').animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE });
        focusName();
      };
      var old = panel.querySelector('.sh__body');
      if (reduced || !old) go();
      else old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 }).addEventListener('finish', go);
    }, function () { if (cur === id) location.href = urlOf(id); else cur = was; });
  }
  function finishClose() {
    if (stopNow) { stopNow(); stopNow = null; }
    if (watchOpen) { watchOpen.disconnect(); watchOpen = null; }
    var id = cur;
    dlg.close();
    panel.getAnimations().forEach(function (a) { a.cancel(); });
    panel.style.transform = '';
    $$(dlg, '.sh__ghost').forEach(function (g) { g.remove(); });
    document.documentElement.classList.remove('is-sheet');
    document.documentElement.style.paddingRight = '';
    document.title = HOME_TITLE;
    var back = homeIcon(id, opener);
    if (back) back.style.visibility = '';
    var focusTo = opener && opener.getAttribute('data-show') === id ? opener : document.querySelector('.works a[data-show="' + id + '"]') || opener;
    if (focusTo) focusTo.focus({ preventScroll: true });
    cur = null; closing = false; seed = null; token++;
  }
  function animateClose(fromY) {
    if (!cur || closing) return;
    closing = true;
    var sp = panel.querySelector('.sh__spot'); if (sp) sp.classList.add('off');   // 스탠드를 끄고 물건을 선반에 돌려놓는다
    flyBack(panel.querySelector('.sh__icon'), homeIcon(cur, opener));
    panelOut(fromY).addEventListener('finish', finishClose);
  }
  function requestClose() {
    if (!cur) return;
    if (history.state && history.state.sheet) history.back();   // popstate 가 닫는다(뒤로 가기 단추와 같은 길)
    else { history.replaceState(null, '', HOME); animateClose(); }
  }
  var closeFromY = 0;   // 끌어내려 닫을 때 창이 내려가 있던 만큼(거기서부터 마저 내려간다)
  addEventListener('popstate', function () {
    var st = history.state, y = closeFromY; closeFromY = 0;
    if (cur && !(st && st.sheet)) animateClose(y);
    else if (cur && st && st.sheet && st.sheet !== cur) swap(st.sheet);
    else if (!cur && st && st.sheet) open(st.sheet, null, false);   // 앞으로 가기
  });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); requestClose(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) requestClose(); });   // 창 밖(어두운 곳)

  // 휴대폰: 창 위쪽(손잡이·머리)을 끌어내리면 닫힌다. 위로 쓸면 머리 위에서 시작해도 그냥 스크롤
  (function () {
    var y0 = null, t0 = 0, dy = 0, drag = false;
    panel.addEventListener('touchstart', function (e) {
      if (!mobile.matches || e.touches.length !== 1) return;
      if (!e.target.closest('.sh__bar, .sh__head') || e.target.closest('a, button')) return;
      var body = panel.querySelector('.sh__body');
      if (body && body.scrollTop > 0) return;
      y0 = e.touches[0].clientY; t0 = performance.now(); dy = 0; drag = false;
    }, { passive: true });
    panel.addEventListener('touchmove', function (e) {
      if (y0 == null) return;
      var d = e.touches[0].clientY - y0;
      if (!drag) {
        if (d < -4) { y0 = null; return; }   // 위로 → 스크롤에 맡긴다
        if (d < 6) return;
        drag = true;
      }
      if (e.cancelable) e.preventDefault();
      dy = Math.max(0, d);
      panel.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: false });
    function end() {
      if (y0 == null) return;
      y0 = null;
      if (!drag) return;
      drag = false;
      var v = dy / Math.max(1, performance.now() - t0);
      if (dy > 110 || v > 0.6) {
        var keep = dy;
        if (history.state && history.state.sheet) { closeFromY = keep; history.back(); }
        else { history.replaceState(null, '', HOME); animateClose(keep); }
      } else {
        panel.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 200, easing: EASE });
        panel.style.transform = '';
      }
    }
    panel.addEventListener('touchend', end);
    panel.addEventListener('touchcancel', end);
  })();

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-show]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var id = a.getAttribute('data-show');
    if (cur && panel.contains(a)) swap(id);
    else open(id, a, true);
  });

  // 예전 가이드 모음 주소(/guides/#try-<도구>, #t-<도구>)는 홈으로 넘어오며 #가 남는다 → 그 소개 창을 연다
  var m = /^#(?:try|t)-([a-z0-9]+)$/.exec(location.hash);
  if (m && document.querySelector('a[data-show="' + m[1] + '"]')) {
    history.replaceState(null, '', HOME + location.search);
    open(m[1], document.querySelector('.works a[data-show="' + m[1] + '"]'), true);
  }
})();
