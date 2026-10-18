/* 가이드 모음(/guides/, /en/guides/) 전용.
   1) 맨 위 도구 아이콘 줄(.tgrid)이 화면 위로 지나가면 머리말 밑에 작은 줄(.tdock)이 내려와 따라온다.
      화면을 가장 많이 차지한 도구 칸이 '지금 도구'라 그것만 이름이 펼쳐진다.
   2) 소개 창: 도구 칸 머리(아이콘·이름·설명)를 누르면 뜬다. 맨 위 아이콘이 칸에서 창으로 날아오고,
      창 안 '여기서 바로 써 보기'는 그 도구 사이트의 계산 파일(assets/…)을 그대로 불러 돌린다(같은 계산, 같은 결과).
      처음엔 터치 자국이 한 번 써 보이고, 손님이 누르거나 키를 치면 바로 멈추고 손님 차례가 된다.
   자료는 페이지 안 #tooldata(빌드가 catalog.json·showcase.json으로 만든다), 도구별 미리보기는 /assets/try/<id>.js. */
(function () {
  'use strict';
  var HEAD = 64;   // site.css .top__in 높이
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(.2,.8,.2,1)';

  /* ---------- 1. 도구 아이콘 줄과 따라오는 작은 줄 ---------- */
  var grid = document.querySelector('.tgrid'), dock = document.querySelector('.tdock');
  if (grid && dock) (function () {
    var list = dock.querySelector('.tdock__list');
    var links = [].slice.call(dock.querySelectorAll('.tdock__a'));
    var arts = links.map(function (a) { return document.getElementById(a.hash.slice(1)); });
    var active = -1, ticking = false, on = false;
    var DOCK_H = 61;   // .tdock 높이(숨어 있을 때도 같은 값으로 잰다)
    function setActive(i) {
      if (i === active) return;
      if (active >= 0) links[active].removeAttribute('aria-current');
      active = i;
      if (i >= 0) {
        links[i].setAttribute('aria-current', 'true');
        // 펼쳐지는 이름 폭까지 생각해 가운데로(이름이 펼쳐진 뒤 한 번 더)
        var center = function (b) { var a = links[i]; list.scrollTo({ left: Math.max(0, a.offsetLeft - (list.clientWidth - a.offsetWidth) / 2), behavior: b }); };
        center(reduced || !on ? 'auto' : 'smooth');
        setTimeout(function () { if (active === i) center(reduced ? 'auto' : 'smooth'); }, 280);
      }
    }
    function update() {
      ticking = false;
      // 줄 아래로 보이는 높이가 가장 큰 도구 칸(같으면 위쪽)
      var top = HEAD + DOCK_H, idx = -1, best = 0;
      for (var i = 0; i < arts.length; i++) {
        var r = arts[i].getBoundingClientRect(), seen = Math.min(r.bottom, innerHeight) - Math.max(r.top, top);
        if (seen > best) { best = seen; idx = i; }
      }
      var show = grid.getBoundingClientRect().bottom < HEAD + 4;
      if (show !== on) { on = show; dock.classList.toggle('is-on', on); }
      setActive(idx);
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update, { passive: true });
    function go(e) {
      var a = e.currentTarget, t = document.getElementById(a.hash.slice(1));
      if (!t) return;
      e.preventDefault();
      var y = t.getBoundingClientRect().top + scrollY - (HEAD + DOCK_H + 12);
      scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      history.replaceState(history.state, '', a.hash);
      t.focus({ preventScroll: true });
    }
    [].slice.call(document.querySelectorAll('.tgrid__a, .tdock__a')).forEach(function (a) { a.addEventListener('click', go); });
    update();
  })();

  /* ---------- 2. 소개 창 ---------- */
  var dataEl = document.getElementById('tooldata');
  if (!dataEl || typeof HTMLDialogElement !== 'function') return;
  var DATA = JSON.parse(dataEl.textContent), UI = DATA.ui;
  var LANG = document.documentElement.lang === 'en' ? 'en' : 'ko';

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

  // 작은 그림 글자(더 할 수 있는 일 카드): 선 몇 개로 그 일을 가리킨다
  var GLYPH = {
    calendar: 'M4 7h16M4 5h16v14H4zM8 3v4M16 3v4M8 11h2M12 11h2M16 11h2M8 15h2M12 15h2',
    clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2',
    count: 'M5 6h14M5 12h10M5 18h6M19 15v6M16 18h6',
    file: 'M7 3h7l4 4v14H7zM14 3v4h4M10 13h5M10 17h5',
    swap: 'M5 8h12l-3-3M19 16H7l3 3',
    pdf: 'M7 3h7l4 4v14H7zM14 3v4h4M9.5 16v-4h1.5a1.3 1.3 0 0 1 0 2.6H9.5',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5a1 1 0 1 0 0 .01',
    sound: 'M5 10v4h3l4 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
    video: 'M4 6h12v12H4zM16 10l4-2v8l-4-2',
    key: 'M3 7h18v10H3zM6 10h1M9 10h1M12 10h1M15 10h1M18 10h1M7 14h10',
    mouse: 'M12 3a5 5 0 0 0-5 5v6a5 5 0 0 0 10 0V8a5 5 0 0 0-5-5zM12 3v6',
    mic: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4',
    screen: 'M3 5h18v12H3zM8 21h8M12 17v4',
    pad: 'M6 9h12a3 3 0 0 1 3 3v2a3 3 0 0 1-5 2l-1-1H9l-1 1a3 3 0 0 1-5-2v-2a3 3 0 0 1 3-3zM8 11v3M6.5 12.5h3M16 12h.01M18 13h.01',
    cam: 'M4 7h3l2-2h6l2 2h3v12H4zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    dice: 'M5 5h14v14H5zM9 9h.01M15 15h.01M12 12h.01',
    coin: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4',
    ladder: 'M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8',
    team: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a5 5 0 0 1 10 0M11 20a5 5 0 0 1 10 0',
    wheel: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M3 12h18M5.6 5.6l12.8 12.8',
    qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2',
    wifi: 'M4 9a12 12 0 0 1 16 0M7 12.5a7.5 7.5 0 0 1 10 0M10 16a3 3 0 0 1 4 0M12 19h.01',
    card: 'M3 6h18v12H3zM7 10a2 2 0 1 0 0 .01M6 15h4M13 10h5M13 13h5',
    scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16',
    stack: 'M4 8l8-4 8 4-8 4zM4 12l8 4 8-4M4 16l8 4 8-4',
    money: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 10v4M18 10v4',
    hour: 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9',
    leave: 'M5 20V5M5 5h11l-2 4 2 4H5',
    table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
    func: 'M10 20c2 0 2-3 3-8s1-8 3-8M8 11h7',
    matrix: 'M7 4H5v16h2M17 4h2v16h-2M9 9h.01M12 9h.01M15 9h.01M9 15h.01M12 15h.01M15 15h.01',
    stats: 'M5 19V11M10 19V6M15 19v-9M20 19V9M3 19h19',
    base: 'M5 7h3v10H5zM11 7h2M11 12h2M11 17h2M16 7l3 5-3 5',
    print: 'M7 9V4h10v5M5 9h14v7h-3M8 13h8v7H8z',
    sms: 'M4 5h16v11H9l-5 4zM8 10h8',
    grid: 'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16',
    type: 'M3 7h18v10H3zM6 10h2M10 10h2M14 10h2M18 10h0M8 14h8',
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
    alarm: 'M12 6a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM12 9v4l2 2M4 6l3-3M20 6l-3-3',
    stop: 'M12 6a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM12 13l3-3M10 2h4',
    rate: 'M4 18l4-8 4 5 4-9 4 12',
    pixel: 'M4 4h16v16H4zM10 10h4v4h-4z',
    speaker: 'M5 10v4h3l4 4V6L8 10zM16 9a4 4 0 0 1 0 6',
    age: 'M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 20a6 6 0 0 1 12 0',
    plus: 'M12 5v14M5 12h14',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5'
  };
  function glyph(name) {
    return svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'gly' }, [svg('path', { d: GLYPH[name] || GLYPH.plus })]);
  }

  // 창 뼈대(한 번만 만든다)
  var dlg = h('dialog', { class: 'sheet', 'aria-labelledby': 'sh-name' });
  var panel = h('div', { class: 'sh' });
  dlg.appendChild(panel);
  document.body.appendChild(dlg);
  var cur = null, opener = null, stopDemo = null, closing = false, watchOpen = null;

  function factsRow(t) {
    return h('ul', { class: 'sh__facts' }, t.facts.map(function (f) {
      // 가운뎃점 앞뒤에서 줄이 갈리지 않게(줄 맨 앞에 '·PDF'가 오지 않게)
      return h('li', null, [h('b', { text: f.v }), h('span', { text: f.l.replace(/·/g, '\u2060·\u2060') })]);
    }));
  }

  function fill(id) {
    var t = DATA.tools[id];
    panel.style.setProperty('--tc', t.color);
    panel.textContent = '';
    var icon = h('img', { class: 'sh__icon', src: t.icon, width: 88, height: 88, alt: '' });
    var name = h('h2', { class: 'sh__name', id: 'sh-name' }, [t.name, t.sub ? h('span', { lang: 'en', text: ' ' + t.sub }) : null]);
    var stage = h('div', { class: 'stage', 'data-tool': id });
    var badge = h('p', { class: 'stage__badge', 'aria-live': 'polite' });
    var replay = h('button', { type: 'button', class: 'stage__replay', hidden: true }, [UI.replay]);
    var head = h('header', { class: 'sh__head' }, [
      icon,
      h('div', { class: 'sh__id' }, [
        name,
        h('p', { class: 'sh__what', text: t.what }),
        h('a', { class: 'btn btn--lamp sh__open', href: t.home }, [UI.open + ' ', h('span', { 'aria-hidden': 'true', text: '↗' })])
      ])
    ]);
    var more = t.more.length ? h('section', { class: 'sh__sec sh__more', 'aria-labelledby': 'sh-more' }, [
      h('h3', { id: 'sh-more', text: UI.more }),
      h('ul', { class: 'sh__cards' }, t.more.map(function (m) {
        return h('li', null, [h('a', { href: m.href }, [h('span', { class: 'sh__gly' }, [glyph(m.g)]), h('b', { text: m.t }), h('span', { text: m.d })])]);
      }))
    ]) : null;
    // 머리의 '열기'가 위로 지나가면 같은 단추가 작게 창 위 막대에 붙는다(스토어의 '받기'처럼)
    var pill = h('a', { class: 'sh__pill', href: t.home, tabindex: '-1', 'aria-hidden': 'true' }, [h('img', { src: t.icon, width: 26, height: 26, alt: '' }), h('span', { text: UI.open })]);
    panel.appendChild(h('div', { class: 'sh__bar' }, [
      h('span', { class: 'sh__grab', 'aria-hidden': 'true' }),
      pill,
      h('button', { type: 'button', class: 'sh__x', 'aria-label': UI.close, onclick: requestClose }, [svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [svg('path', { d: 'M6 6l12 12M18 6L6 18' })])])
    ]));
    panel.appendChild(h('div', { class: 'sh__body' }, [
      head,
      factsRow(t),
      h('section', { class: 'sh__sec sh__try', 'aria-labelledby': 'sh-try' }, [
        h('div', { class: 'sh__try-h' }, [h('h3', { id: 'sh-try', text: UI.try }), badge, replay]),
        stage,
        h('p', { class: 'sh__cap', text: t.demo.cap })
      ]),
      more,
      h('section', { class: 'sh__sec', 'aria-labelledby': 'sh-check' }, [h('h3', { id: 'sh-check', text: UI.check }), h('p', { class: 'sh__check', text: t.check })]),
      h('section', { class: 'sh__sec', 'aria-labelledby': 'sh-gd' }, [
        h('h3', { id: 'sh-gd', text: UI.guides + ' ' + t.guides.length }),
        h('ol', { class: 'sh__guides' }, t.guides.map(function (g) { return h('li', null, [h('a', { href: g.u, text: g.t })]); }))
      ])
    ]));
    var openBtn = head.querySelector('.sh__open'), bodyEl = panel.querySelector('.sh__body');
    if (watchOpen) watchOpen.disconnect();
    watchOpen = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      var e = en[en.length - 1];
      panel.classList.toggle('is-past', !e.isIntersecting && e.boundingClientRect.top < e.rootBounds.top + 10);
    }, { root: bodyEl, threshold: 0 }) : null;
    if (watchOpen) watchOpen.observe(openBtn);
    panel.classList.remove('is-past');
    return { icon: icon, stage: stage, badge: badge, replay: replay, tool: t };
  }

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
      badge.textContent = auto ? UI.auto : UI.yours;
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
    var CTRL = 'input, textarea, select, button, a, label, [data-grab]';
    function opt(passive) { return { capture: true, passive: passive }; }
    stage.addEventListener('pointerdown', function (e) {
      if (!e.isTrusted) return;
      // 마우스·단추·입력 칸은 누르는 순간, 손가락은 떼었을 때 거의 안 움직였으면(쓸어 올린 스크롤이면 시연을 이어 간다)
      if (e.pointerType === 'mouse' || (e.target.closest && e.target.closest(CTRL))) { down = null; mine(); }
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

  function failMsg(t) {
    return h('p', { class: 'stage__msg' }, [UI.fail + ' ', h('a', { href: t.home, text: t.name + ' ' + UI.open + ' ↗' })]);
  }
  function mountDemo(parts, id) {
    var t = parts.tool, stage = parts.stage;
    stage.classList.add('is-loading');
    stage.appendChild(h('p', { class: 'stage__msg', text: UI.loading }));
    var my = cur, auto = null, d = null, failed = false;
    // 불러온 뒤에 실패해도(예: 모듈 허락이 없는 주소) 빈 판 대신 안내와 도구 링크를 보인다
    function fail(e) {
      if (failed || cur !== my) return;
      failed = true;
      if (e) console.warn(e);
      if (auto) auto.stop();
      if (d && d.stop) d.stop();
      parts.badge.textContent = ''; parts.badge.className = 'stage__badge'; parts.replay.hidden = true;
      stage.textContent = '';
      stage.classList.add('is-loading');
      stage.appendChild(failMsg(t));
    }
    loadAll(t.demo.core.concat(['/assets/try/' + id + '.js'])).then(function () {
      if (cur !== my || !window.LLTry[id]) throw new Error('no demo');
      stage.textContent = '';
      stage.classList.remove('is-loading');
      // mine(): 무대 밖에서 받은 진짜 입력(예: 키보드 시험의 키 누름)도 손님 차례로 넘긴다
      d = window.LLTry[id](stage, { lang: LANG, h: h, svg: svg, reduced: reduced, tool: t, fail: fail, mine: function () { if (auto) auto.mine(); } });
      if (failed) { if (d.stop) d.stop(); return; }
      auto = d.auto ? Auto(stage, parts.badge, parts.replay, d.auto, { reset: d.reset, fail: fail }) : null;
      if (auto) setTimeout(function () { if (cur === my && !failed) auto.start(reduced); }, reduced ? 200 : 650);
      stopDemo = function () { if (auto) auto.stop(); if (d.stop) d.stop(); };
    }).catch(function (e) {
      if (cur !== my) return;
      console.warn(e);
      failed = true;
      stage.classList.remove('is-loading');
      stage.textContent = '';
      stage.classList.add('is-loading');
      stage.appendChild(failMsg(t));
    });
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
    var g = h('img', { class: 'sh__ghost', src: toEl.src, alt: '' });
    g.style.cssText = 'left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px';
    dlg.appendChild(g);
    toEl.style.visibility = 'hidden';
    var s = a.width / b.width;
    var anim = g.animate([
      { transform: 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + s + ')', borderRadius: '22%' },
      { transform: 'none', borderRadius: '22%' }
    ], { duration: ms, easing: EASE });
    anim.onfinish = function () { toEl.style.visibility = ''; g.remove(); };
    return g;
  }
  function flyBack(fromEl, toEl) {
    if (reduced || !fromEl || !toEl) return;
    var a = toEl.getBoundingClientRect(), b = fromEl.getBoundingClientRect();
    if (!a.width || a.bottom < 0 || a.top > innerHeight) return;
    var g = h('img', { class: 'sh__ghost', src: fromEl.src, alt: '' });
    g.style.cssText = 'left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px';
    dlg.appendChild(g);
    fromEl.style.visibility = 'hidden';
    g.animate([{ transform: 'none' }, { transform: 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + (a.width / b.width) + ')' }],
      { duration: 260, easing: EASE, fill: 'forwards' });
  }

  function open(id, trigger, push) {
    if (!DATA.tools[id] || cur) return;
    cur = id; opener = trigger || null; closing = false;
    var parts = fill(id);
    document.documentElement.classList.add('is-sheet');
    dlg.showModal();
    var body = panel.querySelector('.sh__body'); if (body) body.scrollTop = 0;
    var fromIcon = trigger && trigger.closest('.gt') && trigger.closest('.gt').querySelector('.gt__icon');
    fly(fromIcon, parts.icon, 360);
    panelIn();
    if (push !== false) history.pushState({ sheet: id }, '', '#try-' + id);
    mountDemo(parts, id);
  }
  function finishClose() {
    if (stopDemo) { stopDemo(); stopDemo = null; }
    if (watchOpen) { watchOpen.disconnect(); watchOpen = null; }
    dlg.close();
    panel.getAnimations().forEach(function (a) { a.cancel(); });
    panel.style.transform = '';
    [].slice.call(dlg.querySelectorAll('.sh__ghost')).forEach(function (g) { g.remove(); });
    document.documentElement.classList.remove('is-sheet');
    var gtIcon = opener && opener.closest('.gt') && opener.closest('.gt').querySelector('.gt__icon');
    if (gtIcon) gtIcon.style.visibility = '';
    if (opener) opener.focus({ preventScroll: true });
    cur = null; closing = false;
  }
  function animateClose(fromY) {
    if (!cur || closing) return;
    closing = true;
    var gtIcon = opener && opener.closest('.gt') && opener.closest('.gt').querySelector('.gt__icon');
    var shIcon = panel.querySelector('.sh__icon');
    flyBack(shIcon, gtIcon);
    var a = panelOut(fromY);
    a.onfinish = finishClose;
  }
  function requestClose() {
    if (!cur) return;
    if (history.state && history.state.sheet) history.back();   // popstate 가 닫는다(뒤로 가기 단추와 같은 길)
    else animateClose();
  }
  var closeFromY = 0;   // 끌어내려 닫을 때 창이 내려가 있던 만큼(거기서부터 마저 내려간다)
  addEventListener('popstate', function () {
    var y = closeFromY; closeFromY = 0;
    if (cur && !(history.state && history.state.sheet)) animateClose(y);
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
        else animateClose(keep);
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
    open(a.getAttribute('data-show'), a, true);
  });

  // 주소가 #try-<도구> 이면 열어 둔다(공유한 주소)
  var m = /^#try-([a-z0-9]+)$/.exec(location.hash);
  if (m && DATA.tools[m[1]]) {
    history.replaceState(null, '', location.pathname + location.search);
    var tr = document.querySelector('a[data-show="' + m[1] + '"]');
    if (tr) { var art = tr.closest('.gt'); if (art) art.scrollIntoView({ block: 'center' }); }
    open(m[1], tr, true);
  }
})();
