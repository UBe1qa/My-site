/* 체크벤치 화면 코드: 공통(상태 불, 언어 안내 띠, 광고 자리, 루멘랩 연출) + 권한 없이 되는 것(키보드, 마우스, 주사율, 게임패드).
   계산은 전부 ck-keys.js / ck-measure.js(화면을 모르는 로직)에 맡긴다. 화면 글자는 페이지의 #ck JSON에서 받는다.
   기기 저장소: localStorage ck.layout · ck.chatter · ck.dblclick · ck.lang, sessionStorage ck.done (방침에 적은 그대로). */
(function () {
  'use strict';
  var CK = window.CK || {}, d = document, root = d.documentElement;
  var cfgEl = d.getElementById('ck'), CFG = cfgEl ? JSON.parse(cfgEl.textContent) : {}, T = CFG.t || {}, PAGE = CFG.page || 'doc';
  function $(s, el) { return (el || d).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); }
  function fmt(s) { var a = arguments; return String(s).replace(/%(\d)/g, function (_, n) { return a[+n]; }); }
  function setText(sel, text) { $$(sel).forEach(function (el) { if (el.textContent !== String(text)) el.textContent = text; }); }
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장을 막아 둔 브라우저 */ } }
  };

  /* ── 상태 불: 이 탭에서 해 본 테스트는 페이지를 옮겨도 켜진 채로(세션 저장소) ── */
  var DEVS = ['kb', 'mouse', 'mic', 'cam', 'spk', 'hz', 'pad'], done = {};
  try { done = JSON.parse(sessionStorage.getItem('ck.done') || '{}') || {}; } catch (e) { done = {}; }
  function paint(dev, state) {
    $$('[data-dev="' + dev + '"]').forEach(function (el) { el.classList.remove('is-on', 'is-warn', 'is-err'); if (state) el.classList.add('is-' + state); });
  }
  function tally() { setText('[data-tally]', DEVS.filter(function (k) { return done[k]; }).length); }
  function setDev(dev, state, stateText) {
    paint(dev, state);
    if (stateText != null) setText('[data-state="' + dev + '"]', stateText);
    if (state === 'on' || state === 'warn') done[dev] = state; else if (state === null) delete done[dev];
    try { sessionStorage.setItem('ck.done', JSON.stringify(done)); } catch (e) { /* 저장을 막아 둔 브라우저 */ }
    tally();
  }
  function verdict(dev, main, sub) {
    setText('[data-v="' + dev + '"]', main);
    if (sub != null) setText('[data-vs="' + dev + '"]', sub);
  }
  function ripple(dev) {
    if (!root.classList.contains('anim') || d.hidden) return;
    $$('.stage[data-dev="' + dev + '"] .lamp, .panel[data-dev="' + dev + '"] .lamp').forEach(function (lamp) {
      for (var i = 0; i < 2; i++) {
        var r = d.createElement('i'); r.className = 'ripple'; r.setAttribute('aria-hidden', 'true');
        r.addEventListener('animationend', function () { if (this.parentNode) this.parentNode.removeChild(this); });
        lamp.appendChild(r);
      }
    });
  }
  Object.keys(done).forEach(function (dev) {
    paint(dev, done[dev]);
    if (PAGE === 'home' && T.earlier) setText('[data-state="' + dev + '"]', T.earlier);
  });
  tally();
  window.CKApp = { CFG: CFG, T: T, PAGE: PAGE, $: $, $$: $$, fmt: fmt, setText: setText, setDev: setDev, verdict: verdict, ripple: ripple, store: store };

  /* ── 다른 언어판 안내 띠(넘기지 않고 알려만 준다) ──
     화면 아래에 겹쳐 띄운다. 띠 밑에 누르는 것(단추·링크·탭·입력칸)이 오면 그동안 스스로 숨는다(덮어서 못 누르게 하지 않는다). */
  (function () {
    var nav = String(navigator.language || '').toLowerCase(), pageKo = CFG.lang === 'ko';
    if (!CFG.other || !CFG.otherLabel || (nav.indexOf('ko') === 0) === pageKo || store.get('ck.lang')) return;
    var bar = d.createElement('div'), a = d.createElement('a'), b = d.createElement('button'), queued = false, gone = false;
    bar.className = 'lang-bar';
    a.href = CFG.other; a.textContent = CFG.otherLabel + ' →'; a.lang = pageKo ? 'en' : 'ko';
    b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', T.close || 'Close');
    function keep() { store.set('ck.lang', '1'); }
    function covers() {          // 띠가 놓인 자리 밑에 누르는 것이 있나(띠 자신은 빼고 본다)
      var r = bar.getBoundingClientRect(), hit = false;
      if (!d.elementsFromPoint || !r.width) return false;
      [0.04, 0.3, 0.5, 0.7, 0.96].forEach(function (fx) {
        [0.15, 0.85].forEach(function (fy) {
          d.elementsFromPoint(r.left + r.width * fx, r.top + r.height * fy).forEach(function (el) {
            if (!bar.contains(el) && el.closest && el.closest('a, button, select, input, summary, label, audio, video, [data-kb-area], [data-cam-box]')) hit = true;
          });
        });
      });
      return hit;
    }
    function place() { queued = false; if (!gone) bar.classList.toggle('is-away', covers()); }
    function later() { if (!queued && !gone) { queued = true; requestAnimationFrame(place); } }
    a.addEventListener('click', keep);
    b.addEventListener('click', function () {
      keep(); gone = true;
      window.removeEventListener('scroll', later); window.removeEventListener('resize', later);
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    });
    bar.appendChild(a); bar.appendChild(b); d.body.appendChild(bar);
    place();
    window.addEventListener('scroll', later, { passive: true });
    window.addEventListener('resize', later);
    d.addEventListener('click', later);        // 칸이 펴지거나 접혀 자리가 바뀐 뒤에도 다시 본다
  })();

  /* ── 광고 자리, 루멘랩 표시등 줄 ── */
  if (window.CK_ADS) window.CK_ADS.mount();
  (function () {
    var el = $('[data-lumen]');
    if (!el) return;
    if (!('IntersectionObserver' in window)) { el.classList.add('in'); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { el.classList.add('in'); io.disconnect(); }
    }, { threshold: 0.7 });
    io.observe(el);
  })();

  /* ════════ 키보드 ════════
     키 잡기(armed): 켜져 있으면 Tab·스페이스·F5까지 이 화면이 받는다(Ctrl·Command 조합은 빼고). Esc 두 번이면 푼다.
     - 키보드 쪽: 처음 누른 키에서 스스로 켜진다. 단 Tab(과 Alt 조합)으로는 켜지지 않고, 초점이 링크·단추에 있을 때도 켜지지 않는다
       (키보드만 쓰는 사람이 '본문으로 건너뛰기'와 메뉴를 쓸 수 있게).
     - 첫 화면: 자판을 누르거나 '모든 키 받기'를 눌렀을 때만 켜진다. 그 전에는 화면을 굴리는 키만 막는다.
     한쪽 신호만 오는 키: 누름 없이 뗌만 온 키도 켜고(tap), Caps Lock·한/영·한자는 눌린 채로 두지 않는다(로직: ck-keys.js). */
  (function () {
    var svgs = $$('[data-kb]');
    if (!svgs.length || !CK.createTracker) return;
    var full = PAGE === 'kb';
    var layoutId = root.getAttribute('data-kb') || (root.getAttribute('data-os') === 'mac' ? 'mac' : 'full');
    var maps = {};
    svgs.forEach(function (svg) {
      var m = {};
      $$('[data-code]', svg).forEach(function (g) { m[g.getAttribute('data-code')] = g; });
      maps[svg.getAttribute('data-layout')] = { svg: svg, keys: m };
    });
    var thr = CK.clampChatterMs(parseFloat(store.get('ck.chatter')) || CK.KEY_CHATTER_MS);
    var tracker = CK.createTracker({ chatterMs: thr });
    var armed = false, auto = full, lastEsc = -1e9, extras = [], swept = false, sweepTimer = 0, heldTimer = 0, any = false;
    var eaten = {};     // 입력칸·고르기 칸이 받은 누름: 그 키의 뗌이 칸 밖에서 와도 '뗌만 온 키'로 세지 않는다
    var sel = $('[data-kb-layout]'), thrIn = $('[data-kb-thr]'), log = $('[data-kb-log]');
    var SCROLLY = { Space: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, PageUp: 1, PageDown: 1, Home: 1, End: 1, Quote: 1, Slash: 1, Backspace: 1 };
    var SEL_KEYS = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, PageUp: 1, PageDown: 1, Home: 1, End: 1, Enter: 1, NumpadEnter: 1, Space: 1, Escape: 1, Tab: 1 };
    if (sel) sel.value = layoutId;
    if (thrIn) thrIn.value = thr;
    setText('[data-thr="kb"]', thr);
    function keyEl(slot) { return maps[layoutId] && maps[layoutId].keys[slot]; }
    function nameOf(id) {
      var el = keyEl(id), t = el && el.querySelector('text');
      return t && t.textContent ? t.textContent : String(id).replace(/^key:/, '');
    }
    function counts() {
      var p = CK.progress(layoutId, tracker.seen());
      setText('[data-kb-count]', fmt(T.kb_count, p.done, p.total));
      return p;
    }
    function heldText(now) {
      var h = tracker.heldKeys(now);
      setText('[data-kb-held]', h.length ? h.map(function (x) { return nameOf(x.id); }).join(' + ') : T.kb_heldnone);
      return h;
    }
    function stateText() {      // 첫 화면 칸 머리: 키를 받는 동안에는 나오는 법이 보여야 한다
      var sus = tracker.suspects().length;
      if (!full && armed) return T.kb_cap_state;
      return any ? (sus ? T.kb_home_sus : T.kb_home_ok) : T.kb_idle;
    }
    function endSweep() {
      clearTimeout(sweepTimer); sweepTimer = 0;
      svgs.forEach(function (svg) { svg.classList.remove('is-sweeping'); });
    }
    function render(now) {
      var p = counts(), sus = tracker.suspects(), n = tracker.seenCount(), main, sub;
      setText('[data-kb-max]', tracker.maxHeld() >= 2 ? fmt(T.kb_max, tracker.maxHeld()) : T.kb_max0);
      setText('[data-kb-maxkeys]', tracker.maxHeld() >= 2 ? tracker.maxHeldIds().map(nameOf).join(' + ') : '·');
      setText('[data-kb-chatter]', sus.length ? (sus.length === 1 ? T.kb_n_sus1 : fmt(T.kb_n_sus, sus.length)) : T.kb_none);
      setText('[data-kb-extra]', extras.length ? extras.map(function (x) { return x.replace(/^key:/, ''); }).join(', ') : T.kb_extra_none);
      var held = heldText(now), stuck = held.filter(function (x) { return x.ms >= 10000; })[0];
      if (sus.length) { main = fmt(T.kb_sus, sus.map(function (s) { return nameOf(s.id); }).join(', ')); sub = fmt(T.kb_sus_s, tracker.chatterMs()); }
      else if (p.all) { main = T.kb_all; sub = fmt(T.kb_all_s, p.total); }
      else { main = n === 1 ? T.kb_ok1 : fmt(T.kb_ok, n); sub = p.left === 1 ? T.kb_left1 : fmt(T.kb_left, p.left); }
      if (stuck) sub = fmt(T.kb_held, nameOf(stuck.id), Math.floor(stuck.ms / 1000));
      verdict('kb', main, sub);
      setDev('kb', sus.length ? 'warn' : 'on', stateText());
      $$('[data-kb-empty]').forEach(function (el) { el.style.visibility = 'hidden'; });
      $$('[data-kb-live]').forEach(function (el) { el.style.visibility = 'visible'; });
      if (p.all && !swept && full) {            // 연출 2: 불 지나가기(한 방문에 한 번)
        swept = true;
        maps[layoutId].svg.classList.add('is-sweeping');
        sweepTimer = setTimeout(endSweep, 1400);
      }
    }
    function logLine(e, text) {
      if (!log) return;
      var li = d.createElement('li'), a = d.createElement('span'), b = d.createElement('span'), c = d.createElement('span');
      a.textContent = e.code || 'Unidentified'; b.textContent = e.key === ' ' ? 'Space' : (e.key || '');
      c.textContent = text;
      li.appendChild(a); li.appendChild(b); li.appendChild(c);
      log.insertBefore(li, log.firstChild);
      while (log.children.length > 12) log.removeChild(log.lastChild);
      setText('[data-kb-key]', b.textContent || '·'); setText('[data-kb-code]', a.textContent);
    }
    function capText() {
      if (full) return armed ? T.kb_cap_on : auto ? T.kb_cap_ready : T.kb_cap_off;
      return armed ? T.kb_cap_home_on : T.kb_cap_home;
    }
    function capture(on) {
      armed = on;
      if (!on) auto = false;      // 돌려준 뒤에는 스스로 다시 잡지 않는다(자판이나 단추를 눌러야 한다)
      setText('[data-kb-cap]', capText());
      $$('[data-act="kb-capture"]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(on));
        if (b.hasAttribute('data-when-off')) b.hidden = on || auto;
      });
      if (!full) setText('[data-state="kb"]', stateText());
      if (on && d.activeElement && d.activeElement !== d.body && d.activeElement.blur && !/^(INPUT|TEXTAREA)$/.test(d.activeElement.tagName)) d.activeElement.blur();
    }
    function tick() {
      if (!tracker.heldCount()) { clearInterval(heldTimer); heldTimer = 0; return; }
      if (any) render(performance.now());
    }
    function flash(el) {      // 눌린 채로 두지 않는 키: 잠깐만 진하게
      el.classList.add('is-down');
      setTimeout(function () { el.classList.remove('is-down'); }, 180);
    }
    window.addEventListener('keydown', function (e) {
      var t = e.target, tag = t && t.tagName;
      if (t === sel && sel && !SEL_KEYS[e.code] && !e.altKey && !e.ctrlKey && !e.metaKey) { sel.blur(); e.preventDefault(); tag = ''; }   // 배열 고르기에 초점이 남아 있어도 글자 키가 배열을 바꾸지 않게
      var field = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
      var onCtl = tag === 'A' || tag === 'BUTTON' || tag === 'SUMMARY' || tag === 'AUDIO' || tag === 'VIDEO';
      if (e.code === 'Escape' && !e.repeat) {
        if (armed && e.timeStamp - lastEsc < 600) capture(false);
        lastEsc = e.timeStamp;
      } else if (auto && !armed && !field && !e.repeat && e.code !== 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey &&
          !/^(Shift|Control|Alt|Meta)/.test(e.code) && !(onCtl && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space'))) {
        capture(true);          // 키보드 쪽: 첫 키에서 스스로 잡는다. Tab·조합 키, 링크·단추 위의 Enter·스페이스로는 잡지 않는다
      }
      if (armed) {
        if (!field && !e.ctrlKey && !e.metaKey) e.preventDefault();
      } else if (!full && SCROLLY[e.code] && !field && !e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'AUDIO' && tag !== 'VIDEO' &&
          !((tag === 'BUTTON' || tag === 'SUMMARY') && e.code === 'Space')) {
        e.preventDefault();      // 첫 화면: 키를 받기 전에도 화면을 굴리는 키는 막는다(단추 위의 스페이스는 그 단추를 누른다)
      }
      if (field) { eaten[e.code || e.key] = 1; return; }
      var r = CK.resolveKey(layoutId, e.code, e.key), id = r.slot || r.extra, soft = CK.isMomentary(e.code, e.key);
      var dn = tracker.down(id, e.timeStamp, e.repeat, soft), el = r.slot && keyEl(r.slot);
      if (el) {
        el.classList.add('is-seen');
        if (soft) { if (dn.counted) flash(el); } else el.classList.add('is-down');
        if (dn.chatter) { el.classList.add('is-warn', 'shake'); setTimeout(function () { el.classList.remove('shake'); }, 320); }
      }
      if (!dn.counted) return;
      any = true;
      if (!r.slot && extras.indexOf(r.extra) < 0) extras.push(r.extra);
      logLine(e, dn.gap == null ? T.kb_log_first : fmt(T.kb_log_gap, Math.round(dn.gap)));
      render(e.timeStamp);
      if (!heldTimer) heldTimer = setInterval(tick, 1000);
    }, true);
    window.addEventListener('keyup', function (e) {
      var tag = e.target && e.target.tagName, r = CK.resolveKey(layoutId, e.code, e.key), id = r.slot || r.extra;
      if (eaten[e.code || e.key]) { delete eaten[e.code || e.key]; if (!tracker.isHeld(id)) return; }
      if ((tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') && !tracker.isHeld(id)) return;
      var up = tracker.up(id, e.timeStamp);
      $$('.is-down', maps[layoutId].svg).forEach(function (el) { if (!tracker.isHeld(el.getAttribute('data-code'))) el.classList.remove('is-down'); });
      if (up.tap) {              // 누름 없이 뗌만 온 키(운영체제가 누름을 가져간 키): 한 번 눌린 것으로 켠다
        var el = r.slot && keyEl(r.slot);
        if (el) { el.classList.add('is-seen'); flash(el); }
        any = true;
        if (!r.slot && extras.indexOf(r.extra) < 0) extras.push(r.extra);
        logLine(e, T.kb_log_up);
      }
      if (any) render(e.timeStamp);      // 떼는 순간 '몇 초째 눌려 있어요'도 같이 지운다
    }, true);
    window.addEventListener('blur', function () {
      tracker.blur();
      $$('[data-kb] .is-down').forEach(function (el) { el.classList.remove('is-down'); });
      if (any) render(performance.now());
    });
    function repaint() {
      $$('.is-seen, .is-warn, .is-down', maps[layoutId].svg).forEach(function (el) { el.classList.remove('is-seen', 'is-warn', 'is-down'); });
      tracker.seen().forEach(function (code) { var el = keyEl(code); if (el) el.classList.add('is-seen'); });
      tracker.suspects().forEach(function (s) { var el = keyEl(s.id); if (el) el.classList.add('is-warn'); });
    }
    if (sel) sel.addEventListener('change', function () {
      endSweep();                 // 연출 중에 배열을 바꾸면 연출을 바로 끝낸다
      layoutId = sel.value;
      store.set('ck.layout', layoutId);
      root.setAttribute('data-kb', layoutId);
      repaint();
      if (any) render(performance.now()); else counts();
      sel.blur();
    });
    if (thrIn) thrIn.addEventListener('change', function () {
      thr = tracker.setChatterMs(parseFloat(thrIn.value));
      thrIn.value = thr;
      store.set('ck.chatter', String(thr));
      setText('[data-thr="kb"]', thr);
    });
    $$('[data-kb-area]').forEach(function (el) { el.addEventListener('pointerdown', function () { if (!armed) capture(true); }); });
    d.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]');
      if (!b) return;
      if (b.getAttribute('data-act') === 'kb-capture') { capture(!armed); b.blur(); return; }
      if (b.getAttribute('data-act') !== 'kb-reset') return;
      tracker.reset(); extras = []; any = false;
      endSweep();
      repaint(); counts();
      if (log) log.textContent = '';
      setText('[data-kb-key]', '·'); setText('[data-kb-code]', '·'); setText('[data-kb-extra]', T.kb_extra_none); setText('[data-kb-maxkeys]', '·');
      setText('[data-kb-max]', T.kb_max0); setText('[data-kb-chatter]', T.kb_chat0); setText('[data-kb-held]', T.kb_heldnone);
      verdict('kb', T.kb_idle, T.kb_idle_s);
      setDev('kb', null, T.kb_idle);
      if (full) capture(true);
      b.blur();
    });
    setText('[data-kb-cap]', capText());
    counts();
  })();

  /* ════════ 마우스 ════════
     테스트 칸([data-mouse-area]) 안에서는 오른쪽 단추 메뉴, 휠 누름 스크롤, 뒤로·앞으로 이동을 막는다(첫 화면의 마우스 칸도 같다. 칸 밖은 평소대로).
     마우스 쪽은 칸 안에서 누른 것만 세고 휠도 칸 안에서는 페이지를 굴리지 않는다. 첫 화면은 어디서 눌러도 세고 휠은 평소대로 굴린다. */
  (function () {
    var area = $('[data-mouse-area]');
    if (!area || !CK.createTracker) return;
    var full = PAGE === 'mouse';
    var thr = CK.clampChatterMs(parseFloat(store.get('ck.dblclick')) || CK.MOUSE_CHATTER_MS);
    var tr = CK.createTracker({ chatterMs: thr, metaClearsHeld: false });
    var moves = [], lastCalc = 0, lastTouch = -1e9, counts = [0, 0, 0, 0, 0], wheel = { up: 0, down: 0 }, awake = false;
    var thrIn = $('[data-m-thr]'), raw = 'onpointerrawupdate' in window;
    if (thrIn) thrIn.value = thr;
    setText('[data-thr="mouse"]', thr);
    function els(b) { return $$('[data-m="' + b + '"]'); }
    function inBox(e) { return !!(e.target && e.target.closest && e.target.closest('[data-mouse-area]')); }
    function inArea(e) { return !full || inBox(e); }
    function render() {
      var sus = tr.suspects(), seen = [], miss = [];
      for (var i = 0; i < 5; i++) (tr.hasSeen('mouse' + i) ? seen : miss).push(T.m_btn[i]);
      var main = T.m_ok, sub;
      if (sus.length) { main = fmt(T.m_sus, sus.map(function (s) { return T.m_btn[+s.id.slice(5)]; }).join(', ')); sub = fmt(T.m_sus_s, tr.chatterMs()); }
      else sub = miss.length ? (seen.length ? fmt(T.m_seen, seen.join(', ')) + ' ' : '') + fmt(T.m_notyet, miss.join(', ')) : T.m_allbtn;
      verdict('mouse', main, sub);
      setDev('mouse', sus.length ? 'warn' : 'on', sus.length ? T.m_home_sus : T.m_home_ok);
      if (tr.presses()) {
        setText('[data-m-dbl]', sus.length ? fmt(T.m_dbl_n, sus.length) : T.m_dbl_none);
        $$('[data-m-dbl]').forEach(function (el) { el.classList.remove('is-idle'); });
      }
      for (var b = 0; b < 5; b++) setText('[data-m-n="' + b + '"]', counts[b] || '');
      setText('[data-m-wn="up"]', wheel.up || ''); setText('[data-m-wn="down"]', wheel.down || '');
    }
    function wake() { if (!awake) { awake = true; render(); } }
    window.addEventListener('touchstart', function (e) { lastTouch = e.timeStamp; }, { passive: true, capture: true });
    window.addEventListener('mousedown', function (e) {
      if (e.timeStamp - lastTouch < 800 || e.button > 4 || !inArea(e)) return;
      if (e.button !== 0 && inBox(e)) e.preventDefault();          // 휠 누름 스크롤, 뒤로·앞으로 이동을 막는다(테스트 칸 안에서만)
      var dn = tr.down('mouse' + e.button, e.timeStamp, false);
      counts[e.button]++;
      els(e.button).forEach(function (el) { el.classList.add('is-down', 'is-seen'); if (dn.chatter) el.classList.add('is-warn'); });
      awake = true; render();
    }, true);
    window.addEventListener('mouseup', function (e) {
      if (e.button > 4) return;
      if (e.button > 2 && inBox(e)) e.preventDefault();
      if (!tr.isHeld('mouse' + e.button)) return;                 // 칸 밖에서 누른 단추의 뗌은 세지 않는다
      tr.up('mouse' + e.button, e.timeStamp);
      els(e.button).forEach(function (el) { el.classList.remove('is-down'); });
    }, true);
    $$('[data-mouse-area]').forEach(function (box) {
      box.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      box.addEventListener('auxclick', function (e) { e.preventDefault(); });
      if (full) box.addEventListener('wheel', function (e) { if (!e.ctrlKey) e.preventDefault(); }, { passive: false });   // 테스트 칸 위에서는 페이지가 밀리지 않게
    });
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || !e.deltaY || !inArea(e)) return;
      var dir = e.deltaY < 0 ? 'up' : 'down';
      wheel[dir]++;
      $$('[data-m-wheel="' + dir + '"]').forEach(function (el) { el.classList.add('is-seen'); });
      awake = true; render();
    }, { passive: true, capture: true });
    window.addEventListener(raw ? 'pointerrawupdate' : 'pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var list = !raw && e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      if (list.length) for (var i = 0; i < list.length; i++) moves.push(list[i].timeStamp); else moves.push(e.timeStamp);
      if (moves.length > 4000) moves.splice(0, moves.length - 4000);
      wake();
      if (e.timeStamp - lastCalc < 300) return;
      lastCalc = e.timeStamp;
      var p = CK.pollingEstimate(moves);
      if (!p.enough) return;
      setText('[data-m-rate]', p.nearest ? fmt(T.m_rate, p.nearest) : fmt(T.m_rate_raw, Math.max(10, Math.round(p.peakHz / 10) * 10)));
      $$('[data-m-rate]').forEach(function (el) { el.classList.remove('is-idle'); });
    }, { passive: true, capture: true });
    if (!raw && !(window.PointerEvent && PointerEvent.prototype.getCoalescedEvents)) $$('[data-m-cap]').forEach(function (el) { el.hidden = false; });
    if (thrIn) thrIn.addEventListener('change', function () {
      thr = tr.setChatterMs(parseFloat(thrIn.value));
      thrIn.value = thr;
      store.set('ck.dblclick', String(thr));
      setText('[data-thr="mouse"]', thr);
    });
    d.addEventListener('click', function (e) {
      if (!(e.target.closest && e.target.closest('[data-act="mouse-reset"]'))) return;
      tr.reset(); moves = []; counts = [0, 0, 0, 0, 0]; wheel = { up: 0, down: 0 }; awake = false;
      $$('[data-m], [data-m-wheel]').forEach(function (el) { el.classList.remove('is-seen', 'is-down', 'is-warn'); });
      $$('[data-m-n], [data-m-wn]').forEach(function (el) { el.textContent = ''; });
      setText('[data-m-rate]', T.m_rate_idle); setText('[data-m-dbl]', T.m_dbl_idle);
      $$('[data-m-rate], [data-m-dbl]').forEach(function (el) { el.classList.add('is-idle'); });
      verdict('mouse', T.m_idle, T.m_idle_s);
      setDev('mouse', null, T.m_idle);
    });
  })();

  /* ════════ 화면 주사율: 프레임 120장만 재고 멈춘다 ════════ */
  (function () {
    if (!$('[data-hz]') || !CK.refreshEstimate) return;
    var full = PAGE === 'hz', busy = false, dpr = window.devicePixelRatio || 1;
    setText('[data-res]', Math.round(screen.width * dpr) + ' × ' + Math.round(screen.height * dpr));
    function measure() {
      if (busy) return;
      busy = true;
      var times = [], n = 0;
      if (full) verdict('hz', T.hz_wait, ' ');
      function frame(t) {
        times.push(t);
        if (++n < 121) return requestAnimationFrame(frame);
        busy = false;
        var r = CK.refreshEstimate(CK.intervals(times));
        if (!r.enough || d.hidden) { if (full) verdict('hz', T.hz_hidden, ' '); return; }
        var steady = CK.refreshSteady(r), v = r.nearest || Math.round(r.hz);
        if (full) {
          setText('[data-hz-ms]', fmt(T.hz_ms, r.medianMs.toFixed(2)));
          setText('[data-hz-n]', r.samples);
          setText('[data-hz-stable]', fmt(T.hz_stable, Math.round(r.stable * 100)));
        }
        if (!steady) {            // 프레임 간격이 두 무리로 갈리면 가운데 값은 실제 주사율이 아니다: 값을 단정하지 않는다
          setText('[data-hz]', r.nearest || '··');
          if (full) verdict('hz', T.hz_uneven, r.nearest ? fmt(T.hz_uneven_near, r.nearest) : T.hz_uneven_s);
          setDev('hz', null, PAGE === 'home' ? T.hz_uneven_home : null);
          return;
        }
        setText('[data-hz]', v);
        if (full) verdict('hz', fmt(r.nearest ? T.hz_main : T.hz_main_raw, v), fmt(T.hz_sub, r.samples));
        setDev('hz', 'on', PAGE === 'home' ? CFG.auto : null);
      }
      requestAnimationFrame(frame);
    }
    measure();
    /* 움직이는 막대: 누르면 8초만 움직이고 스스로 멈춘다 */
    var band = $('[data-band] i'), barBtn = $('[data-act="hz-bar"]'), raf = 0, t0 = 0, label = barBtn ? barBtn.textContent : '';
    function stopBar() {
      cancelAnimationFrame(raf); raf = 0;
      if (band) band.style.transform = '';
      if (barBtn) { barBtn.textContent = label; barBtn.setAttribute('aria-pressed', 'false'); }
    }
    function step(t) {
      if (!t0) t0 = t;
      if (t - t0 > 8000) return stopBar();
      var w = band.parentNode.clientWidth + 80;
      band.style.transform = 'translateX(' + (((t - t0) * 0.6) % w - 80).toFixed(1) + 'px)';
      raf = requestAnimationFrame(step);
    }
    d.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]');
      if (!b) return;
      if (b.getAttribute('data-act') === 'hz-again') measure();
      if (b.getAttribute('data-act') === 'hz-bar' && band) {
        if (raf) return stopBar();
        t0 = 0; barBtn.textContent = barBtn.getAttribute('data-alt'); barBtn.setAttribute('aria-pressed', 'true');
        raf = requestAnimationFrame(step);
      }
    });
  })();

  /* ════════ 게임패드 ════════
     표준 배치(mapping === 'standard')면 단추 17개의 자리 이름과 스틱 두 개. 그 밖의 컨트롤러는 받은 단추 수·축 수 그대로 'Button N'·'Axis N'으로 그린다.
     쏠림은 평균 위치와 떨림(가장 멀리 튄 거리)을 같이 본다. 배치를 모르는 컨트롤러는 어느 축이 스틱인지 몰라 값만 보여 주고 판정하지 않는다
     (트리거가 축으로 오는 기기는 가만히 -1에 있다. 그것을 '쏠림'이라고 하면 틀린 말이다). */
  (function () {
    if (!$('[data-dev="pad"]')) return;
    var full = PAGE === 'pad', idx = null, raf = 0, drift = null, R = 42, std = true, btnEls = [], axEls = [];
    function pad() { var l = navigator.getGamepads ? navigator.getGamepads() : []; return idx == null ? null : l[idx]; }
    function say(text) { setText('[data-pad-drift]', text); }
    function build(g) {          // 컨트롤러가 바뀔 때마다 단추·축 칸을 받은 수대로 다시 그린다(앞 컨트롤러의 이름·불이 남지 않게)
      var list = $('[data-pbs]'), axes = $('[data-axes]'), i;
      std = g.mapping === 'standard';
      btnEls = []; axEls = [];
      list.textContent = '';
      for (i = 0; i < g.buttons.length; i++) {
        var li = d.createElement('li'), nm = d.createElement('span'), val = d.createElement('b');
        li.className = 'pb'; li.setAttribute('data-pb', i);
        nm.setAttribute('data-pb-name', i); nm.textContent = std && T.pad_btn[i] ? T.pad_btn[i] : fmt(T.pad_btn_n, i);
        val.className = 'num'; val.setAttribute('data-pb-v', i);
        li.appendChild(nm); li.appendChild(val); list.appendChild(li);
        btnEls.push({ li: li, val: val });
      }
      axes.textContent = '';
      for (i = std ? 4 : 0; i < g.axes.length; i++) {      // 표준 배치의 축 0~3은 스틱 그림이 보여 준다
        var row = d.createElement('li'), an = d.createElement('span'), bar = d.createElement('i'), dot = d.createElement('b'), av = d.createElement('b');
        row.className = 'ax'; row.setAttribute('data-axis', i);
        an.textContent = fmt(T.pad_axis_n, i); bar.className = 'ax-bar'; av.className = 'num'; av.textContent = '0.00';
        bar.appendChild(dot); row.appendChild(an); row.appendChild(bar); row.appendChild(av); axes.appendChild(row);
        axEls.push({ i: i, dot: dot, val: av });
      }
      axes.hidden = !axEls.length;
      $$('[data-sticks]').forEach(function (el) { el.hidden = !std; });
      setText('[data-axes-h]', std ? T.pad_sticks_h : T.pad_axes_h);
    }
    function loop() {
      raf = requestAnimationFrame(loop);
      var g = pad();
      if (!g || d.hidden) return;
      var i, x, y;
      for (i = 0; i < g.buttons.length && i < btnEls.length; i++) {
        var b = g.buttons[i], el = btnEls[i], down = b.pressed || b.value > 0.5;
        el.li.classList.toggle('is-down', down);
        if (down || b.value > 0.05) el.li.classList.add('is-seen');
        var txt = b.value > 0.005 && b.value < 0.995 ? Math.round(b.value * 100) + '%' : '';
        if (el.val.textContent !== txt) el.val.textContent = txt;
      }
      if (std) for (var s = 0; s < 2; s++) {
        x = g.axes[s * 2] || 0; y = g.axes[s * 2 + 1] || 0;
        var dot = $('[data-stick="' + s + '"]');
        if (dot) dot.style.transform = 'translate(' + (x * R).toFixed(1) + 'px,' + (y * R).toFixed(1) + 'px)';
        setText('[data-stick-v="' + s + '"]', x.toFixed(2) + ', ' + y.toFixed(2));
        if (drift) drift.s[s].push([x, y]);
      }
      for (i = 0; i < axEls.length; i++) {
        var v = g.axes[axEls[i].i] || 0, t = v.toFixed(2);
        axEls[i].dot.style.transform = 'translateX(' + (v * 50).toFixed(1) + '%)';
        if (axEls[i].val.textContent !== t) axEls[i].val.textContent = t;
        if (drift && !std) (drift.a[axEls[i].i] = drift.a[axEls[i].i] || []).push(v);
      }
      if (drift && performance.now() - drift.t0 > 1200) {
        var out;
        if (std) {
          out = [0, 1].map(function (k) {
            var q = CK.stickVerdict(CK.stickRest(drift.s[k]));
            if (!q) return '';
            var word = q.verdict === 'drift' ? (q.jitter ? T.pad_drifting_j : T.pad_drifting) : q.verdict === 'slight' ? (q.jitter ? T.pad_slight_j : T.pad_slight) : (q.jitter ? T.pad_centered_j : T.pad_centered);
            return fmt(T.pad_drift, T.pad_sticks[k], q.percent.toFixed(1), word) + (q.jitter ? ' ' + fmt(T.pad_jitter, q.wobblePercent.toFixed(1)) : '');
          }).join(' ');
        } else {
          out = fmt(T.pad_axes_rest, Object.keys(drift.a).map(function (k) { return fmt(T.pad_axis_n, k) + ' ' + CK.axisRest(drift.a[k]).mean.toFixed(2); }).join(', '));
        }
        drift = null;
        say(out);
      }
    }
    function connect(g) {
      idx = g.index;
      setDev('pad', 'on', T.pad_home_on);
      if (!full) return;
      drift = null;
      build(g);
      verdict('pad', T.pad_on, fmt(T.pad_on_s, g.id) + (std ? '' : ' ' + T.pad_nostd));
      say(T.pad_drift_idle);       // 앞 컨트롤러의 결과('진동을 보냈어요' 등)가 남지 않게
      $$('[data-act="pad-drift"]').forEach(function (b) { b.disabled = false; });
      $$('[data-act="pad-rumble"]').forEach(function (b) { b.hidden = !g.vibrationActuator; });
      if (!raf) loop();
    }
    window.addEventListener('gamepadconnected', function (e) { connect(e.gamepad); });
    window.addEventListener('gamepaddisconnected', function (e) {
      if (e.gamepad.index !== idx) return;
      idx = null; cancelAnimationFrame(raf); raf = 0; drift = null;
      if (!full) return;
      verdict('pad', T.pad_gone, T.pad_idle_s);
      say(T.pad_drift_idle);
      $$('.pb.is-down').forEach(function (el) { el.classList.remove('is-down'); });
      $$('[data-act="pad-drift"]').forEach(function (b) { b.disabled = true; });
      $$('[data-act="pad-rumble"]').forEach(function (b) { b.hidden = true; });
    });
    d.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]'), g = pad();
      if (!b || !g) return;
      if (b.getAttribute('data-act') === 'pad-drift') { drift = { t0: performance.now(), s: [[], []], a: {} }; say(T.pad_drift_run); }
      if (b.getAttribute('data-act') === 'pad-rumble') {
        var done = function (ok) { say(ok ? T.pad_rumble_ok : T.pad_rumble_no); };
        try { g.vibrationActuator.playEffect('dual-rumble', { duration: 400, strongMagnitude: 0.8, weakMagnitude: 0.8 }).then(function () { done(true); }, function () { done(false); }); }
        catch (err) { done(false); }
      }
    });
  })();
})();
