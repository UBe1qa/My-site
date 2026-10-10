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

  /* ── 다른 언어판 안내 띠(넘기지 않고 알려만 준다) ── */
  (function () {
    var nav = String(navigator.language || '').toLowerCase(), pageKo = CFG.lang === 'ko';
    if (!CFG.other || !CFG.otherLabel || (nav.indexOf('ko') === 0) === pageKo || store.get('ck.lang')) return;
    var bar = d.createElement('div'), a = d.createElement('a'), b = d.createElement('button');
    bar.className = 'lang-bar';
    a.href = CFG.other; a.textContent = CFG.otherLabel + ' →'; a.lang = pageKo ? 'en' : 'ko';
    b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', T.close || 'Close');
    function keep() { store.set('ck.lang', '1'); }
    a.addEventListener('click', keep);
    b.addEventListener('click', function () { keep(); bar.parentNode.removeChild(bar); });
    bar.appendChild(a); bar.appendChild(b); d.body.appendChild(bar);
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

  /* ════════ 키보드 ════════ */
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
    var armed = full, lastEsc = -1e9, extras = [], swept = false, heldTimer = 0, any = false;
    var sel = $('[data-kb-layout]'), thrIn = $('[data-kb-thr]'), log = $('[data-kb-log]');
    var SCROLLY = { Space: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, PageUp: 1, PageDown: 1, Home: 1, End: 1, Quote: 1, Slash: 1, Backspace: 1 };
    if (sel) sel.value = layoutId;
    if (thrIn) thrIn.value = thr;
    function keyEl(slot) { return maps[layoutId] && maps[layoutId].keys[slot]; }
    function nameOf(id) {
      var el = keyEl(id), t = el && el.querySelector('text');
      return t && t.textContent ? t.textContent : String(id).replace(/^key:/, '');
    }
    function total() { return CK.layout(layoutId).detectable; }
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
    function render(now) {
      var p = counts(), sus = tracker.suspects(), n = tracker.seenCount(), main, sub;
      setText('[data-kb-max]', tracker.maxHeld() >= 2 ? fmt(T.kb_max, tracker.maxHeld()) : T.kb_max0);
      setText('[data-kb-chatter]', sus.length ? fmt(T.kb_n_sus, sus.length) : T.kb_none);
      setText('[data-kb-extra]', extras.length ? extras.map(function (x) { return x.replace(/^key:/, ''); }).join(', ') : T.kb_extra_none);
      var held = heldText(now), stuck = held.filter(function (x) { return x.ms >= 10000; })[0];
      if (sus.length) { main = fmt(T.kb_sus, sus.map(function (s) { return nameOf(s.id); }).join(', ')); sub = fmt(T.kb_sus_s, tracker.chatterMs()); }
      else if (p.all) { main = T.kb_all; sub = fmt(T.kb_all_s, p.total); }
      else { main = n === 1 ? T.kb_ok1 : fmt(T.kb_ok, n); sub = fmt(T.kb_left, p.left); }
      if (stuck) sub = fmt(T.kb_held, nameOf(stuck.id), Math.floor(stuck.ms / 1000));
      verdict('kb', main, sub);
      setDev('kb', sus.length ? 'warn' : 'on', sus.length ? T.kb_home_sus : T.kb_home_ok);
      $$('[data-kb-empty]').forEach(function (el) { el.style.visibility = 'hidden'; });
      $$('[data-kb-live]').forEach(function (el) { el.style.visibility = 'visible'; });
      if (p.all && !swept && full) {            // 연출 2: 불 지나가기(한 방문에 한 번)
        swept = true;
        var svg = maps[layoutId].svg;
        svg.classList.add('sweep');
        setTimeout(function () { svg.classList.remove('sweep'); }, 1400);
      }
    }
    function logLine(e, dn) {
      if (!log) return;
      var li = d.createElement('li'), a = d.createElement('span'), b = d.createElement('span'), c = d.createElement('span');
      a.textContent = e.code || 'Unidentified'; b.textContent = e.key === ' ' ? 'Space' : (e.key || '');
      c.textContent = dn.gap == null ? T.kb_log_first : fmt(T.kb_log_gap, Math.round(dn.gap));
      li.appendChild(a); li.appendChild(b); li.appendChild(c);
      log.insertBefore(li, log.firstChild);
      while (log.children.length > 12) log.removeChild(log.lastChild);
      setText('[data-kb-key]', b.textContent || '·'); setText('[data-kb-code]', a.textContent);
    }
    function capture(on) {
      armed = on;
      setText('[data-kb-cap]', on ? T.kb_cap_on : T.kb_cap_off);
    }
    function tick() {
      if (!tracker.heldCount()) { clearInterval(heldTimer); heldTimer = 0; return; }
      if (any) render(performance.now());
    }
    window.addEventListener('keydown', function (e) {
      var tag = e.target && e.target.tagName, field = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
      if (full) {
        if (e.code === 'Escape' && !e.repeat) {
          if (armed && e.timeStamp - lastEsc < 600) capture(false);
          lastEsc = e.timeStamp;
        }
        if (armed && !field && !e.ctrlKey && !e.metaKey) e.preventDefault();
      } else if (SCROLLY[e.code] && !field && !e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'BUTTON' && tag !== 'A' && tag !== 'SUMMARY' && tag !== 'AUDIO' && tag !== 'VIDEO') {
        e.preventDefault();
      }
      if (field) return;
      var r = CK.resolveKey(layoutId, e.code, e.key), id = r.slot || r.extra;
      var dn = tracker.down(id, e.timeStamp, e.repeat), el = r.slot && keyEl(r.slot);
      if (el) {
        el.classList.add('is-down', 'is-seen');
        if (dn.chatter) { el.classList.add('is-warn', 'shake'); setTimeout(function () { el.classList.remove('shake'); }, 320); }
      }
      if (!dn.counted) return;
      any = true;
      if (!r.slot && extras.indexOf(r.extra) < 0) extras.push(r.extra);
      logLine(e, dn);
      render(e.timeStamp);
      if (!heldTimer) heldTimer = setInterval(tick, 1000);
    }, true);
    window.addEventListener('keyup', function (e) {
      var r = CK.resolveKey(layoutId, e.code, e.key);
      tracker.up(r.slot || r.extra, e.timeStamp);
      $$('.is-down', maps[layoutId].svg).forEach(function (el) { if (!tracker.isHeld(el.getAttribute('data-code'))) el.classList.remove('is-down'); });
      if (any) heldText(e.timeStamp);
    }, true);
    window.addEventListener('blur', function () {
      tracker.blur();
      $$('[data-kb] .is-down').forEach(function (el) { el.classList.remove('is-down'); });
      if (any) heldText(0);
    });
    function repaint() {
      $$('.is-seen, .is-warn, .is-down', maps[layoutId].svg).forEach(function (el) { el.classList.remove('is-seen', 'is-warn', 'is-down'); });
      tracker.seen().forEach(function (code) { var el = keyEl(code); if (el) el.classList.add('is-seen'); });
      tracker.suspects().forEach(function (s) { var el = keyEl(s.id); if (el) el.classList.add('is-warn'); });
    }
    if (sel) sel.addEventListener('change', function () {
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
    });
    $$('[data-kb-area]').forEach(function (el) { el.addEventListener('pointerdown', function () { if (!armed) capture(true); }); });
    d.addEventListener('click', function (e) {
      if (!(e.target.closest && e.target.closest('[data-act="kb-reset"]'))) return;
      tracker.reset(); extras = []; any = false;
      repaint(); counts();
      if (log) log.textContent = '';
      setText('[data-kb-key]', '·'); setText('[data-kb-code]', '·'); setText('[data-kb-extra]', T.kb_extra_none);
      setText('[data-kb-max]', T.kb_max0); setText('[data-kb-chatter]', T.kb_chat0); setText('[data-kb-held]', T.kb_heldnone);
      verdict('kb', T.kb_idle, T.kb_idle_s);
      setDev('kb', null, T.kb_idle);
      capture(true);
      e.target.closest('button').blur();
    });
    counts();
  })();

  /* ════════ 마우스 ════════ */
  (function () {
    var area = $('[data-mouse-area]');
    if (!area || !CK.createTracker) return;
    var full = PAGE === 'mouse';
    var thr = CK.clampChatterMs(parseFloat(store.get('ck.dblclick')) || CK.MOUSE_CHATTER_MS);
    var tr = CK.createTracker({ chatterMs: thr, metaClearsHeld: false });
    var moves = [], lastCalc = 0, lastTouch = -1e9, counts = [0, 0, 0, 0, 0], wheel = { up: 0, down: 0 }, awake = false;
    var thrIn = $('[data-m-thr]'), raw = 'onpointerrawupdate' in window;
    if (thrIn) thrIn.value = thr;
    function els(b) { return $$('[data-m="' + b + '"]'); }
    function inArea(e) { return !full || (e.target.closest && !!e.target.closest('[data-mouse-area]')); }
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
      if (full && e.button !== 0) e.preventDefault();          // 휠 누름 스크롤, 뒤로·앞으로 이동을 막는다(테스트 칸 안에서만)
      var dn = tr.down('mouse' + e.button, e.timeStamp, false);
      counts[e.button]++;
      els(e.button).forEach(function (el) { el.classList.add('is-down', 'is-seen'); if (dn.chatter) el.classList.add('is-warn'); });
      awake = true; render();
    }, true);
    window.addEventListener('mouseup', function (e) {
      if (e.button > 4) return;
      if (full && e.button > 2 && inArea(e)) e.preventDefault();
      tr.up('mouse' + e.button, e.timeStamp);
      els(e.button).forEach(function (el) { el.classList.remove('is-down'); });
    }, true);
    if (full) {
      area.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      area.addEventListener('auxclick', function (e) { e.preventDefault(); });
    }
    if (full) area.addEventListener('wheel', function (e) { if (!e.ctrlKey) e.preventDefault(); }, { passive: false });   // 테스트 칸 위에서는 페이지가 밀리지 않게
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
        var v = r.nearest || Math.round(r.hz);
        setText('[data-hz]', v);
        if (full) {
          verdict('hz', fmt(r.nearest ? T.hz_main : T.hz_main_raw, v), fmt(T.hz_sub, r.samples));
          setText('[data-hz-ms]', fmt(T.hz_ms, r.medianMs.toFixed(2)));
          setText('[data-hz-n]', r.samples);
          setText('[data-hz-stable]', fmt(T.hz_stable, Math.round(r.stable * 100)));
        }
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

  /* ════════ 게임패드 ════════ */
  (function () {
    if (!$('[data-dev="pad"]')) return;
    var full = PAGE === 'pad', idx = null, raf = 0, drift = null, R = 42;
    function pad() { var l = navigator.getGamepads ? navigator.getGamepads() : []; return idx == null ? null : l[idx]; }
    function loop() {
      raf = requestAnimationFrame(loop);
      var g = pad();
      if (!g || d.hidden) return;
      for (var i = 0; i < g.buttons.length; i++) {
        var b = g.buttons[i], el = $('[data-pb="' + i + '"]');
        if (!el) continue;
        var down = b.pressed || b.value > 0.5;
        el.classList.toggle('is-down', down);
        if (down || b.value > 0.05) el.classList.add('is-seen');
        var v = $('[data-pb-v="' + i + '"]'), txt = b.value > 0.005 && b.value < 0.995 ? Math.round(b.value * 100) + '%' : '';
        if (v.textContent !== txt) v.textContent = txt;
      }
      for (var s = 0; s < 2; s++) {
        var x = g.axes[s * 2] || 0, y = g.axes[s * 2 + 1] || 0, dot = $('[data-stick="' + s + '"]');
        if (dot) dot.style.transform = 'translate(' + (x * R).toFixed(1) + 'px,' + (y * R).toFixed(1) + 'px)';
        setText('[data-stick-v="' + s + '"]', x.toFixed(2) + ', ' + y.toFixed(2));
        if (drift) drift.s[s].push([x, y]);
      }
      if (drift && performance.now() - drift.t0 > 1200) {
        var out = [0, 1].map(function (k) {
          var r = CK.stickRest(drift.s[k]), vd = CK.driftVerdict(r.offset);
          return fmt(T.pad_drift, T.pad_sticks[k], r.percent.toFixed(1), vd === 'drift' ? T.pad_drifting : vd === 'slight' ? T.pad_slight : T.pad_centered);
        });
        drift = null;
        setText('[data-pad-drift]', out.join(' '));
      }
    }
    function connect(g) {
      idx = g.index;
      setDev('pad', 'on', T.pad_home_on);
      if (!full) return;
      var std = g.mapping === 'standard', list = $('[data-pbs]');
      verdict('pad', T.pad_on, fmt(T.pad_on_s, g.id) + (std ? '' : ' ' + T.pad_nostd));
      for (var i = 0; i < Math.max(17, g.buttons.length); i++) {
        var li = $('[data-pb="' + i + '"]');
        if (!li && i < g.buttons.length) {
          li = d.createElement('li'); li.className = 'pb'; li.setAttribute('data-pb', i);
          var nm = d.createElement('span'), val = d.createElement('b');
          nm.setAttribute('data-pb-name', i); val.className = 'num'; val.setAttribute('data-pb-v', i);
          li.appendChild(nm); li.appendChild(val); list.appendChild(li);
        }
        if (li) { li.hidden = i >= g.buttons.length; if (!std || i > 16) $('[data-pb-name="' + i + '"]').textContent = fmt(T.pad_btn_n, i); }
      }
      $$('[data-act="pad-drift"]').forEach(function (b) { b.disabled = false; });
      $$('[data-act="pad-rumble"]').forEach(function (b) { b.hidden = !g.vibrationActuator; });
      if (!raf) loop();
    }
    window.addEventListener('gamepadconnected', function (e) { connect(e.gamepad); });
    window.addEventListener('gamepaddisconnected', function (e) {
      if (e.gamepad.index !== idx) return;
      idx = null; cancelAnimationFrame(raf); raf = 0;
      if (full) verdict('pad', T.pad_gone, T.pad_idle_s);
      $$('[data-act="pad-drift"]').forEach(function (b) { b.disabled = true; });
    });
    d.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]'), g = pad();
      if (!b || !g) return;
      if (b.getAttribute('data-act') === 'pad-drift') { drift = { t0: performance.now(), s: [[], []] }; setText('[data-pad-drift]', T.pad_drift_run); }
      if (b.getAttribute('data-act') === 'pad-rumble') {
        var done = function (ok) { setText('[data-pad-drift]', ok ? T.pad_rumble_ok : T.pad_rumble_no); };
        try { g.vibrationActuator.playEffect('dual-rumble', { duration: 400, strongMagnitude: 0.8, weakMagnitude: 0.8 }).then(function () { done(true); }, function () { done(false); }); }
        catch (err) { done(false); }
      }
    });
  })();
})();
