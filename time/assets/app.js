/* 한바퀴 화면 연결. 시간 계산은 core.js(OT), 도시 목록은 tz.js(OT_TZ). 문구는 페이지의 #otc JSON.
   저장(localStorage)은 키 여섯 개뿐: ot.set · ot.timers · ot.watch · ot.alarms · ot.cities · ot.lang (방침과 같다, check.py가 대조). */
(function () {
  'use strict';
  var OT = window.OT, D = document, H = D.documentElement;
  var cfg = {};
  try { cfg = JSON.parse(D.getElementById('otc').textContent); } catch (e) {}
  var T = cfg.t || {}, LANG = cfg.lang || 'en', PAGE = cfg.page || '';
  var $ = function (id) { return D.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var C = 200;
  function fill(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ''; }); }
  function now() { return Date.now(); }

  /* ---------- 저장 ---------- */
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var SET = load('ot.set', {});
  if (typeof SET !== 'object' || !SET) SET = {};
  SET.sound = SET.sound || 'bell'; SET.fx = SET.fx || 'high'; SET.theme = SET.theme || 'auto';
  function saveSet() { save('ot.set', SET); }
  function fxOn() { return SET.fx !== 'off' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

  /* ---------- 화면 색·움직임 ---------- */
  function applyTheme() {
    var t = SET.theme;
    if (t !== 'light' && t !== 'dark') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    H.setAttribute('data-theme', t);
    H.classList.toggle('anim', fxOn());
    H.classList.toggle('fx-low', SET.fx === 'low');
  }
  if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) {} }
  D.querySelectorAll('[data-set]').forEach(function (seg) {
    var key = seg.getAttribute('data-set');
    function mark() { seg.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === SET[key])); }); }
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      SET[key] = b.getAttribute('data-v'); saveSet(); applyTheme(); mark();
    });
    mark();
  });

  /* ---------- 소리(파일 없이 Web Audio로 만든다) ---------- */
  var AC = null, master = null;
  function ctx() {
    if (!AC) {
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
      try { AC = new A(); master = AC.createGain(); master.gain.value = 0.7; master.connect(AC.destination); } catch (e) { AC = null; return null; }
    }
    if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  function audible() { return AC && AC.state === 'running'; }
  function unlock() { ctx(); var n = $('tapNote'); if (n && audible()) n.hidden = true; }
  D.addEventListener('pointerdown', unlock, true);
  D.addEventListener('keydown', unlock, true);
  function tone(f, t0, dur, type, vol, decay) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (decay || dur));
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + (decay || dur) + 0.05);
  }
  function playOnce(kind) { // 한 번 울리는 소리 묶음. 길이(초)를 돌려준다
    var a = ctx(); if (!a || kind === 'none') return 0;
    var t = a.currentTime + 0.03;
    if (kind === 'beep') { for (var i = 0; i < 4; i++) tone(1000, t + i * 0.18, 0.1, 'square', 0.18, 0.1); return 1.2; }
    if (kind === 'soft') { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, j) { tone(f, t + j * 0.16, 0.6, 'sine', 0.35, 0.9); }); return 1.6; }
    for (var k = 0; k < 2; k++) { var s = t + k * 0.75; tone(660, s, 1.6, 'sine', 0.45, 1.6); tone(660 * 2.76, s, 0.8, 'sine', 0.12, 0.8); tone(660 * 5.4, s, 0.4, 'sine', 0.05, 0.4); }
    return 1.9;
  }
  function click() { var a = ctx(); if (!a || !fxOn()) return; tone(2400, a.currentTime + 0.005, 0.02, 'triangle', 0.08, 0.025); }
  var ringTimer = null, ringStop = 0;
  function startRing(kind) {
    if (kind === 'none') return;
    stopRing(true);
    ringStop = now() + 60000;
    var loop = function () { if (now() > ringStop) { stopRing(true); return; } playOnce(kind); };
    loop(); ringTimer = setInterval(loop, 2200);
  }
  function stopRing(keepBar) { if (ringTimer) clearInterval(ringTimer); ringTimer = null; if (!keepBar) { hideBar(); stopFlash(); } }
  var snd = $('snd');
  if (snd) {
    snd.value = SET.sound;
    snd.addEventListener('change', function () { SET.sound = snd.value; saveSet(); });
    $('sndTest').addEventListener('click', function () { playOnce(snd.value === 'none' ? 'bell' : snd.value); });
  }

  /* ---------- 울림 띠·제목 깜빡임·알림·진동 ---------- */
  var bar = null, flashT = null, baseTitle = D.title;
  function showBar(msg, btns) {
    hideBar();
    bar = D.createElement('div'); bar.className = 'ringbar'; bar.setAttribute('role', 'alert');
    var p = D.createElement('p'); p.textContent = msg; bar.appendChild(p);
    btns.forEach(function (b, i) {
      var el = D.createElement('button'); el.type = 'button'; el.className = 'btn' + (i ? ' ghost' : ''); el.textContent = b[0];
      el.addEventListener('click', b[1]); bar.appendChild(el);
    });
    D.body.appendChild(bar);
    var first = bar.querySelector('button'); if (first) try { first.focus({ preventScroll: true }); } catch (e) {}
  }
  function hideBar() { if (bar) { bar.remove(); bar = null; } }
  function flash(msg) {
    stopFlash(); var on = false;
    flashT = setInterval(function () { on = !on; D.title = on ? msg : baseTitle; }, 1000);
    D.title = msg;
  }
  function stopFlash() { if (flashT) clearInterval(flashT); flashT = null; D.title = baseTitle; }
  function alertAll(msg, title) {
    flash(title);
    try { if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]); } catch (e) {}
    if (SET.notify && D.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body: msg, tag: 'oneturn' }); } catch (e) {}
    }
  }

  /* ---------- 화면 켜 두기·컴퓨터 알림 ---------- */
  var wakeLock = null, wake = $('wake');
  function wantWake() { return !!SET.wake; }
  function getWake() {
    if (!wantWake() || D.hidden || wakeLock) return;
    if (!('wakeLock' in navigator)) { var n = $('wakeNote'); if (n) n.textContent = T.wake_no; return; }
    navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {});
  }
  if (wake) {
    wake.checked = !!SET.wake;
    if (!('wakeLock' in navigator)) { wake.disabled = true; $('wakeNote').textContent = T.wake_no; }
    wake.addEventListener('change', function () { SET.wake = wake.checked; saveSet(); if (wake.checked) getWake(); else if (wakeLock) { wakeLock.release(); wakeLock = null; } });
    getWake();
  }
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var nrow = $('notifyRow'), notify = $('notify');
  if (nrow && 'Notification' in window && !coarse && !/Android|iPhone|iPad/i.test(navigator.userAgent)) {
    nrow.hidden = false;
    notify.checked = !!SET.notify && Notification.permission === 'granted';
    notify.addEventListener('change', function () {
      if (!notify.checked) { SET.notify = false; saveSet(); return; }
      Notification.requestPermission().then(function (p) {
        SET.notify = p === 'granted'; notify.checked = SET.notify; saveSet();
        if (p !== 'granted') { var s = nrow.querySelector('small'); if (s) s.textContent = T.notify_denied; }
      });
    });
  }

  /* ---------- 전체 화면 ---------- */
  var stage = D.querySelector('.stage'), fullBtn = $('fullBtn');
  function isFull() { return stage && stage.classList.contains('is-full'); }
  function setFull(on) {
    if (!stage) return;
    stage.classList.toggle('is-full', on);
    if (fullBtn) fullBtn.setAttribute('aria-label', on ? T.full_exit : (fullBtn.getAttribute('data-l') || fullBtn.getAttribute('aria-label')));
    try {
      if (on && stage.requestFullscreen && !D.fullscreenElement) stage.requestFullscreen().catch(function () {});
      if (!on && D.fullscreenElement && D.exitFullscreen) D.exitFullscreen().catch(function () {});
    } catch (e) {}
  }
  if (fullBtn) { fullBtn.setAttribute('data-l', fullBtn.getAttribute('aria-label')); fullBtn.addEventListener('click', function () { setFull(!isFull()); }); }
  D.addEventListener('fullscreenchange', function () { if (!D.fullscreenElement && isFull()) setFull(false); });

  /* ---------- 시계판 그리기(build.py의 dial_svg와 같은 기하) ---------- */
  function pt(r, frac) { var a = frac * 2 * Math.PI; return [C + r * Math.sin(a), C - r * Math.cos(a)]; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function donut(frac, ro, ri) {
    ro = ro || 126; ri = ri || 100;
    if (!(frac > 0)) return '';
    if (frac >= 0.9999) return 'M' + C + ' ' + (C - ro) + 'A' + ro + ' ' + ro + ' 0 1 1 ' + (C - 0.01) + ' ' + (C - ro) + 'Z M' + C + ' ' + (C - ri) + 'A' + ri + ' ' + ri + ' 0 1 0 ' + (C + 0.01) + ' ' + (C - ri) + 'Z';
    return arc(0, frac, ro, ri);
  }
  function arc(f0, f1, ro, ri) { // f0~f1 사이 고리 조각
    var span = f1 - f0; if (span <= 0) return '';
    if (span >= 0.9999) return donut(1, ro, ri);
    var lg = span > 0.5 ? 1 : 0, a = pt(ro, f0), b = pt(ro, f1), c = pt(ri, f1), d = pt(ri, f0);
    return 'M' + r1(a[0]) + ' ' + r1(a[1]) + 'A' + ro + ' ' + ro + ' 0 ' + lg + ' 1 ' + r1(b[0]) + ' ' + r1(b[1]) + 'L' + r1(c[0]) + ' ' + r1(c[1]) + 'A' + ri + ' ' + ri + ' 0 ' + lg + ' 0 ' + r1(d[0]) + ' ' + r1(d[1]) + 'Z';
  }
  function svgEl(tag, attrs) { var e = D.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function drawFace(g, scale) {
    var f = OT.faceLabels(scale), n = f.unit === 's' ? 60 : f.unit === 'm' ? scale : scale / 60, frag = D.createDocumentFragment(), majors = {};
    f.labels.forEach(function (l) { majors[Math.round(l.frac * f.ticks)] = 1; });
    for (var i = 0; i < f.ticks; i++) {
      var fr = i / f.ticks, p1 = pt(178, fr), p2 = pt(majors[i] ? 164 : 171, fr);
      frag.appendChild(svgEl('line', { 'class': 'tk' + (majors[i] ? ' mj' : ''), x1: r1(p1[0]), y1: r1(p1[1]), x2: r1(p2[0]), y2: r1(p2[1]) }));
    }
    f.labels.forEach(function (l) { var p = pt(145, l.frac), t = svgEl('text', { 'class': 'lb', x: r1(p[0]), y: r1(p[1]) }); t.textContent = l.v; frag.appendChild(t); });
    var u = svgEl('text', { 'class': 'unit', x: C + 14, y: C - 145 }); u.textContent = T['unit_' + f.unit]; frag.appendChild(u);
    g.textContent = ''; g.appendChild(frag);
    return f;
  }

  /* ---------- 다른 언어판 안내 띠 ---------- */
  if (H.classList.contains('lb') && cfg.other) {
    var lb = D.createElement('div'); lb.className = 'langbar';
    lb.innerHTML = '<div><a></a><button type="button"></button></div>';
    var la = lb.querySelector('a'), lx = lb.querySelector('button');
    la.href = cfg.other; la.textContent = cfg.otherLabel + ' →'; la.lang = LANG === 'ko' ? 'en' : 'ko';
    lx.setAttribute('aria-label', T.close); lx.textContent = '×';
    lx.addEventListener('click', function () { try { localStorage.setItem('ot.lang', '1'); } catch (e) {} lb.remove(); H.classList.remove('lb'); });
    lb.style.visibility = 'hidden'; D.body.appendChild(lb);
    var placeBar = function () {
      var inner = lb.firstChild, ok = null;
      ['', 'at-r', 'at-l'].some(function (cls) {
        lb.className = 'langbar' + (cls ? ' ' + cls : '');
        var r = inner.getBoundingClientRect(), hit = false;
        D.querySelectorAll('a,button,input,select,summary,td,.dialbox').forEach(function (el) {
          if (hit || lb.contains(el)) return;
          var q = el.getBoundingClientRect(); if (!q.width) return;
          if (q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top) hit = true;
        });
        if (!hit) { ok = cls; return true; } return false;
      });
      lb.className = 'langbar' + (ok ? ' ' + ok : '') + (ok === null ? ' away' : '');
      lb.style.visibility = '';
    };
    var pend = 0;
    var schedule = function () { if (pend) return; pend = requestAnimationFrame(function () { pend = 0; placeBar(); }); };
    addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule);
    requestAnimationFrame(placeBar);
  }

  /* ---------- 좁은 화면 위 탭: 지금 페이지가 보이게, 끝까지 밀면 흐림을 끈다 ---------- */
  var nav = D.querySelector('.nav');
  if (nav) {
    var navEnd = function () { nav.classList.toggle('at-end', nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 2); };
    var curA = nav.querySelector('[aria-current]');
    if (curA && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, curA.offsetLeft - 16);
    nav.addEventListener('scroll', navEnd, { passive: true }); addEventListener('resize', navEnd); navEnd();
  }

  /* ---------- 루멘랩 칸: 화면에 들어올 때 한 번(8초 안에는 다시 안 함) ---------- */
  var lumen = D.querySelector('.lumen');
  if (lumen && 'IntersectionObserver' in window) {
    var lastIn = 0;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && now() - lastIn > 8000) { lastIn = now(); lumen.classList.remove('in'); void lumen.offsetWidth; lumen.classList.add('in'); }
      });
    }, { threshold: 0.6 }).observe(lumen);
  } else if (lumen) lumen.classList.add('in');

  function typing(e) { var t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable); }
  function keyIs(e, en, ko) { return e.key && (e.key.toLowerCase() === en || e.key === ko); }
  function clockFmt() {
    var hc = 'h23';
    try { hc = new Intl.DateTimeFormat(LANG === 'ko' ? 'ko-KR' : 'en-US', { hour: 'numeric' }).resolvedOptions().hourCycle || 'h23'; } catch (e) {}
    return hc === 'h12' || hc === 'h11';
  }
  var H12 = clockFmt();
  // 이 기기의 시간대. 벽시계는 Date 대신 OT.parts로 읽는다(브라우저 tz 자료가 낡아도 OT.PATCH로 맞게)
  var DEVZ = 'UTC';
  try { DEVZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}
  if (!OT.validZone(DEVZ)) DEVZ = 'UTC';
  function lp(ts) { return OT.parts(DEVZ, ts); }
  function zoneNow() { var z = DEVZ; try { z = Intl.DateTimeFormat().resolvedOptions().timeZone || z; } catch (e) {} return OT.validZone(z) ? z : DEVZ; }
  function hhmm(ts) { var p = lp(ts); return OT.fmtClock(p.h, p.mi, LANG, H12); }

  /* =====================================================================
     타이머
     ===================================================================== */
  if (PAGE === 'timer') (function () {
    var MAXN = 8, dialbox = $('dialbox'), svg = dialbox.querySelector('svg'), g = svg.querySelector('.ticks');
    var wedge = svg.querySelector('.wedge'), edge = svg.querySelector('.edge'), knobG = svg.querySelector('.knob-g'), knob = svg.querySelector('.knob');
    var big = $('big'), sub = $('sub'), go = $('go'), inH = $('inH'), inM = $('inM'), inS = $('inS'), note = $('hmsNote'), nameIn = $('tName');
    var tlist = $('tlist');
    var st = load('ot.timers', null), seq = 1;
    if (!st || !Array.isArray(st.list) || !st.list.length) st = { cur: 't1', list: [{ id: 't1', name: '', dur: 5 * OT.MIN, state: 'idle' }] };
    st.list = st.list.filter(function (t) { return t && t.id && t.dur >= 0; }).slice(0, MAXN);
    if (!st.list.length) st.list = [{ id: 't1', name: '', dur: 5 * OT.MIN, state: 'idle' }];
    st.list.forEach(function (t) { var n = +String(t.id).replace(/\D/g, ''); if (n >= seq) seq = n + 1; });
    if (!st.list.some(function (t) { return t.id === st.cur; })) st.cur = st.list[0].id;
    var due = {}, faceScale = 0, ringing = {}, ringNames = [];
    function cur() { for (var i = 0; i < st.list.length; i++) if (st.list[i].id === st.cur) return st.list[i]; return st.list[0]; }
    function persist() { save('ot.timers', st); }
    function nameOf(t) { var i = st.list.indexOf(t); return t.name || (st.list.length > 1 ? fill(T.timer_n, { n: i + 1 }) : T.timer); }

    // 불러올 때: 닫혀 있는 동안 끝난 타이머는 소리 없이 '몇 분 전에 끝남'
    var t0 = now();
    st.list = st.list.map(function (t) { var d = OT.timerTick(t, t0); if (d !== t && t0 - d.doneAt > 3000) d.quiet = true; return d; });

    function schedule(t) {
      if (due[t.id]) { clearTimeout(due[t.id]); delete due[t.id]; }
      if (t.state === 'run') due[t.id] = setTimeout(function () { fire(t.id); }, Math.max(0, t.end - now()));
    }
    function fire(id) {
      delete due[id];
      var i = st.list.findIndex(function (t) { return t.id === id; }); if (i < 0) return;
      var t = st.list[i], n = now();
      if (t.state !== 'run') return;
      if (n < t.end) { schedule(t); return; }
      t = st.list[i] = OT.timerTick(t, n);
      persist(); finished(t);
    }
    function finished(t) {
      ringing[t.id] = 1;
      if (ringNames.indexOf(nameOf(t)) < 0) ringNames.push(nameOf(t));
      var nm = ringNames.join(', ');
      startRing(SET.sound);
      alertAll(fill(T.ring_msg, { name: nm }), fill(T.ring_title, { name: nm }));
      showBar(fill(T.ring_msg, { name: nm }), [[T.stop_sound, silence], [T.restart, function () { silence(); var x = byId(t.id); if (x) { set(x, OT.timerStart(OT.timerReset(x), now())); } }]]);
      if (t.id === st.cur && fxOn()) { dialbox.classList.remove('ring-now'); void dialbox.offsetWidth; dialbox.classList.add('ring-now'); }
      render(true);
    }
    function silence() { ringing = {}; ringNames = []; stopRing(); dialbox.classList.remove('ring-now'); }
    function byId(id) { for (var i = 0; i < st.list.length; i++) if (st.list[i].id === id) return st.list[i]; return null; }
    function set(t, nt) {
      var i = st.list.indexOf(t); if (i < 0) return;
      if (nt.state !== 'done') delete nt.quiet;
      st.list[i] = nt; schedule(nt); persist(); render(true);
      if (nt.state === 'run' && !audible()) ctx();
    }

    function scaleOf(t) { return t.state === 'idle' && t.dur <= 60 * OT.MIN ? 60 : OT.scaleFor(t.dur || OT.MIN); }
    var lastText = '', lastSub = '';
    function render(full) {
      var t = cur(), n = now(), left = OT.timerLeft(t, n);
      var sc = scaleOf(t);
      if (sc !== faceScale) { faceScale = sc; drawFace(g, sc); }
      var frac = Math.max(0, Math.min(1, left / (sc * OT.MIN)));
      wedge.setAttribute('d', donut(frac));
      var p1 = pt(98, frac), p2 = pt(128, frac), pk = pt(113, frac);
      edge.setAttribute('x1', r1(p1[0])); edge.setAttribute('y1', r1(p1[1])); edge.setAttribute('x2', r1(p2[0])); edge.setAttribute('y2', r1(p2[1]));
      knob.setAttribute('cx', r1(pk[0])); knob.setAttribute('cy', r1(pk[1]));
      var running = t.state === 'run';
      knobG.style.display = running || t.state === 'done' ? 'none' : '';
      edge.style.display = frac > 0 ? '' : 'none';
      dialbox.classList.toggle('is-done', t.state === 'done');
      dialbox.classList.toggle('can-drag', !running);
      var txt = OT.fmtTimer(left);
      if (txt !== lastText) { big.textContent = txt; lastText = txt; big.classList.toggle('long', txt.length > 5); }
      var s;
      if (t.state === 'run') s = fill(T.ends_at, { t: hhmm(t.end) });
      else if (t.state === 'pause') s = fill(T.paused, { t: OT.say(left, LANG, true) });
      else if (t.state === 'done') s = t.quiet ? fill(T.done_ago, { ago: OT.ago(n - t.doneAt, LANG) }) : T.done;
      else s = t.dur > 60 * OT.MIN ? fill(T.one_turn, { n: OT.say(sc * OT.MIN, LANG) }) : T.set_hint;
      if (s !== lastSub) { sub.textContent = s; lastSub = s; }
      if (full) {
        dialbox.setAttribute('aria-valuenow', String(Math.round(t.dur / OT.MIN)));
        dialbox.setAttribute('aria-valuetext', OT.say(running ? left : t.dur, LANG, true));
        var gl = go.querySelector('span'), gi = go.querySelector('svg');
        gl.textContent = running ? T.pause : t.state === 'pause' ? T.resume : t.state === 'done' ? T.restart : T.start;
        gi.innerHTML = running ? '<path d="M5 3.5h3v11H5zM10 3.5h3v11h-3z" fill="currentColor"/>' : '<path d="M5 3.5v11l9-5.5z" fill="currentColor"/>';
        go.classList.toggle('ring', t.state === 'done');
        go.classList.toggle('go', t.state !== 'done');
        [inH, inM, inS].forEach(function (x) { x.disabled = running; });
        if (D.activeElement !== inH && D.activeElement !== inM && D.activeElement !== inS) fillInputs(t.dur);
        if (D.activeElement !== nameIn) nameIn.value = t.name || '';
        var ph = D.querySelector('.presets .ctl-h');
        if (ph) ph.textContent = (running || t.state === 'pause') && st.list.length < MAXN ? T.presets_run : T.presets_idle;
        renderList();
      }
      updateRows(n);
      if (!D.hidden) {
        var anyRun = st.list.some(function (x) { return x.state === 'run'; });
        D.title = anyRun && !flashT ? OT.fmtTimer(OT.timerLeft(firstRun(), n)) + ' · ' + baseTitle : (flashT ? D.title : baseTitle);
      }
    }
    function firstRun() { var best = null; st.list.forEach(function (x) { if (x.state === 'run' && (!best || x.end < best.end)) best = x; }); return best; }
    function fillInputs(ms) { var s = OT.split(ms); inH.value = s.h; inM.value = s.m; inS.value = s.s; [inH, inM, inS].forEach(function (x) { x.removeAttribute('aria-invalid'); }); note.textContent = ''; note.classList.remove('is-bad'); }

    // 목록(타이머 둘 이상일 때)
    function mini(t) {
      return '<svg class="mini" viewBox="0 0 52 52" aria-hidden="true"><circle class="mb" cx="26" cy="26" r="25"/><circle class="mf" cx="26" cy="26" r="21.5"/><circle class="mt" cx="26" cy="26" r="17"/><path class="mw" d=""/></svg>';
    }
    function pie(frac) {
      if (!(frac > 0)) return '';
      if (frac >= 0.9999) return 'M26 9A17 17 0 1 1 25.99 9Z';
      var a = frac * 2 * Math.PI, x = 26 + 17 * Math.sin(a), y = 26 - 17 * Math.cos(a);
      return 'M26 26L26 9A17 17 0 ' + (frac > 0.5 ? 1 : 0) + ' 1 ' + r1(x) + ' ' + r1(y) + 'Z';
    }
    function renderList() {
      var show = st.list.length > 1;
      tlist.textContent = '';
      if (!show) return;
      st.list.forEach(function (t) {
        var li = D.createElement('li');
        li.className = 'trow' + (t.id === st.cur ? ' is-cur' : '') + (t.state === 'done' ? ' is-done' : '');
        li.setAttribute('data-id', t.id);
        li.innerHTML = mini(t) + '<button type="button" class="pick"><span class="tn"></span><span class="tt num"></span></button><span class="rb"><button type="button" class="ibtn tp"></button><button type="button" class="ibtn tx"></button></span>';
        li.querySelector('.tn').textContent = nameOf(t);
        var tp = li.querySelector('.tp'), tx = li.querySelector('.tx');
        tp.innerHTML = t.state === 'run' ? '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3.5h3v11H5zM10 3.5h3v11h-3z" fill="currentColor"/></svg>' : '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3.5v11l9-5.5z" fill="currentColor"/></svg>';
        tp.setAttribute('aria-label', (t.state === 'run' ? T.pausebtn : T.play) + ' · ' + nameOf(t));
        tx.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        tx.setAttribute('aria-label', T.del + ' · ' + nameOf(t));
        li.querySelector('.pick').setAttribute('aria-pressed', String(t.id === st.cur));
        tlist.appendChild(li);
      });
      updateRows(now(), true);
    }
    var rowText = {};
    function updateRows(n, force) {
      if (st.list.length < 2) return;
      st.list.forEach(function (t) {
        var li = tlist.querySelector('[data-id="' + t.id + '"]'); if (!li) return;
        var left = OT.timerLeft(t, n), txt = OT.fmtTimer(left);
        if (force || rowText[t.id] !== txt) {
          rowText[t.id] = txt; li.querySelector('.tt').textContent = txt;
          li.querySelector('.mw').setAttribute('d', pie(left / (OT.scaleFor(t.dur || OT.MIN) * OT.MIN)));
        }
      });
    }
    tlist.addEventListener('click', function (e) {
      var li = e.target.closest('.trow'); if (!li) return;
      var t = byId(li.getAttribute('data-id')); if (!t) return;
      if (e.target.closest('.tx')) {
        if (st.list.length <= 1) return;
        if (due[t.id]) clearTimeout(due[t.id]);
        st.list.splice(st.list.indexOf(t), 1);
        if (st.cur === t.id) st.cur = st.list[0].id;
        if (ringing[t.id]) silence();
        persist(); render(true); return;
      }
      if (e.target.closest('.tp')) { toggle(t); return; }
      st.cur = t.id; persist(); render(true);
    });
    $('addT').addEventListener('click', function () {
      if (st.list.length >= MAXN) { note.textContent = T.max_timers; note.classList.add('is-bad'); return; }
      var c = cur(), t = { id: 't' + (seq++), name: '', dur: c.dur || 5 * OT.MIN, state: 'idle' };
      st.list.push(t); st.cur = t.id; persist(); render(true);
      nameIn.focus();
    });

    function toggle(t) {
      if (t.state === 'run') set(t, OT.timerPause(t, now()));
      else if (t.state === 'done') { silence(); set(t, OT.timerStart(OT.timerReset(t), now())); }
      else {
        if (!(OT.timerLeft(t, now()) > 0)) { note.textContent = T.zero; note.classList.add('is-bad'); return; }
        set(t, OT.timerStart(t, now()));
      }
    }
    go.addEventListener('click', function () { toggle(cur()); });
    $('reset').addEventListener('click', function () { var t = cur(); if (ringing[t.id]) silence(); set(t, OT.timerReset(t)); });
    $('plus1').addEventListener('click', function () { var t = cur(); if (t.state === 'done') silence(); set(t, OT.timerAdd(t, OT.MIN, now())); });
    D.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ms = +b.getAttribute('data-preset') * OT.MIN, t = cur();
        if ((t.state === 'run' || t.state === 'pause') && st.list.length < MAXN) {
          t = { id: 't' + (seq++), name: '', dur: ms, state: 'idle' }; st.list.push(t); st.cur = t.id;
        } else { if (ringing[t.id]) silence(); t.dur = ms; t = OT.timerReset(t); st.list[st.list.indexOf(cur())] = t; }
        set(t, OT.timerStart(t, now()));
      });
    });

    // 숫자 칸
    function readInputs() {
      var parts = [[inH, 99], [inM, 999], [inS, 999]], vals = [], bad = null;
      parts.forEach(function (p) {
        var r = OT.parseField(p[0].value, p[1]);
        p[0].setAttribute('aria-invalid', String(!r.ok));
        if (!r.ok) { if (!bad) bad = r.err === 'max' ? fill(T.bad_max, { max: p[1] }) : T['bad_' + r.err]; vals.push(0); } else vals.push(r.value);
      });
      if (bad) { note.textContent = bad; note.classList.add('is-bad'); return null; }
      note.classList.remove('is-bad');
      var ms = OT.hms(vals[0], vals[1], vals[2]);
      if (ms > OT.MAX_TIMER) { note.textContent = fill(T.bad_max, { max: OT.fmtTimer(OT.MAX_TIMER) }); note.classList.add('is-bad'); return null; }
      return ms;
    }
    [inH, inM, inS].forEach(function (inp) {
      inp.addEventListener('input', function () {
        var ms = readInputs(); if (ms == null) return;
        var t = cur(); if (t.state === 'run') return;
        if (ringing[t.id]) silence();
        t = OT.timerReset(t); t.dur = ms; st.list[st.list.indexOf(cur())] = t; persist();
        note.textContent = ms > 0 ? fill(T.read_as, { t: OT.say(ms, LANG) }) : T.zero;
        note.classList.toggle('is-bad', !(ms > 0));
        render(false); dialbox.setAttribute('aria-valuenow', String(Math.round(ms / OT.MIN)));
      });
      // 클릭으로 들어와도 전체 선택을 유지한다(마우스를 뗄 때 커서가 선택을 지우지 않게)
      var fresh = false;
      inp.addEventListener('focus', function () { inp.select(); fresh = true; setTimeout(function () { if (fresh && D.activeElement === inp) inp.select(); }, 0); });
      inp.addEventListener('mouseup', function (e) { if (fresh) { e.preventDefault(); inp.select(); fresh = false; } });
      inp.addEventListener('keydown', function () { fresh = false; });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); toggle(cur()); } });
      inp.addEventListener('blur', function () { if (readInputs() != null) fillInputs(cur().dur); });
    });
    nameIn.addEventListener('input', function () { var t = cur(); t.name = nameIn.value.trim().slice(0, 24); persist(); renderList(); });

    // 판 돌려 맞추기
    var drag = null;
    function angleOf(e) {
      var r = svg.getBoundingClientRect(), x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      return { deg: Math.atan2(x, -y) * 180 / Math.PI, dist: Math.sqrt(x * x + y * y) / (r.width / 2) };
    }
    dialbox.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.dial-tools')) return;
      var t = cur(); if (t.state === 'run' || isFull()) return;
      var a = angleOf(e);
      if (e.pointerType === 'touch' || e.pointerType === 'pen') { if (a.dist > 0.74 || a.dist < 0.4) return; } // 손가락은 띠·손잡이에서만(나머지는 스크롤)
      else if (a.dist > 1.02 || a.dist < 0.25) return;
      e.preventDefault();
      if (ringing[t.id]) silence();
      var start = t.dur <= 60 * OT.MIN ? Math.round(t.dur / OT.MIN) : 60;
      drag = { m: start, id: e.pointerId, orig: t.dur };
      try { dialbox.setPointerCapture(e.pointerId); } catch (x) {}
      dialbox.classList.add('is-setting');
      moveTo(a.deg, true);
    });
    function moveTo(deg, first) {
      var m = OT.dragMinutes(drag.m, deg);
      if (first) { var raw = OT.angleToMinutes(deg); if (Math.abs(raw - drag.m) > 0) m = raw === 0 && drag.m > 30 ? 60 : raw; }
      if (m !== drag.m || first) {
        if (m !== drag.m) { click(); flashTick(m); }
        drag.m = m;
        var t = OT.timerReset(cur()); t.dur = m * OT.MIN; st.list[st.list.indexOf(cur())] = t;
        render(true); fillInputs(t.dur);
      }
    }
    function flashTick(m) {
      if (!fxOn()) return;
      var tk = g.querySelectorAll('.tk')[m % 60]; if (!tk) return;
      tk.classList.add('flash'); setTimeout(function () { tk.classList.remove('flash'); }, 180);
    }
    dialbox.addEventListener('pointermove', function (e) { if (drag && e.pointerId === drag.id) moveTo(angleOf(e).deg, false); });
    function endDrag() { if (!drag) return; drag = null; dialbox.classList.remove('is-setting'); persist(); render(true); }
    dialbox.addEventListener('pointerup', endDrag);
    dialbox.addEventListener('pointercancel', function () { if (drag) { var t = OT.timerReset(cur()); t.dur = drag.orig; st.list[st.list.indexOf(cur())] = t; } endDrag(); });
    dialbox.addEventListener('keydown', function (e) {
      var t = cur(); if (t.state === 'run') return;
      var step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key];
      if (e.key === 'Home') step = -999;
      if (step == null) return;
      e.preventDefault(); e.stopPropagation();
      var m = Math.max(0, Math.min(99 * 60, Math.round(t.dur / OT.MIN) + step));
      var nt = OT.timerReset(t); nt.dur = m * OT.MIN; st.list[st.list.indexOf(t)] = nt; persist(); click(); render(true);
    });

    // 단축키
    D.addEventListener('keydown', function (e) {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { if (bar) { silence(); e.preventDefault(); } else if (isFull()) setFull(false); return; }
      if (e.key === ' ' && !(e.target.closest && e.target.closest('button,a,summary'))) { e.preventDefault(); toggle(cur()); }
      else if (keyIs(e, 'r', 'ㄱ')) { var t = cur(); if (ringing[t.id]) silence(); set(t, OT.timerReset(t)); }
      else if (keyIs(e, 'f', 'ㄹ')) setFull(!isFull());
      else if (e.key === '+' || e.key === '=') { var c = cur(); if (c.state === 'done') silence(); set(c, OT.timerAdd(c, OT.MIN, now())); }
    });

    // 그리기 고리: 보일 때는 화면 주기마다, 숨었을 때는 제목만 1초마다(끝나는 알람은 따로 걸려 있다)
    var raf = 0, draw = render;
    function loop() { raf = 0; draw(false); if (st.list.some(function (t) { return t.state === 'run'; }) && !D.hidden) raf = requestAnimationFrame(loop); }
    function kick() { if (!raf && !D.hidden) raf = requestAnimationFrame(loop); }
    render = function (full) { draw(full); kick(); };
    setInterval(function () {
      if (!D.hidden) return;
      var r = firstRun(); if (r && !flashT) D.title = OT.fmtTimer(OT.timerLeft(r, now())) + ' · ' + baseTitle;
    }, 1000);
    D.addEventListener('visibilitychange', function () {
      if (!D.hidden) {
        st.list.forEach(function (t) { if (t.state === 'run' && now() >= t.end) fire(t.id); });
        render(true); getWake();
      }
    });
    addEventListener('pageshow', function () { render(true); });
    addEventListener('storage', function (e) { if (e.key === 'ot.timers') { var v = load('ot.timers', null); if (v && v.list) { st = v; st.list.forEach(schedule); render(true); } } });

    st.list.forEach(schedule);
    render(true);
    // 새로고침 뒤 이어서 도는 타이머가 있으면: 소리는 화면을 한 번 눌러야 날 수 있다
    if (st.list.some(function (t) { return t.state === 'run'; }) && SET.sound !== 'none') {
      setTimeout(function () { if (!audible()) { var tn = $('tapNote'); tn.textContent = T.need_tap; tn.hidden = false; } }, 400);
    }
  })();

  /* =====================================================================
     스톱워치
     ===================================================================== */
  if (PAGE === 'stopwatch') (function () {
    var dialbox = $('dialbox'), svg = dialbox.querySelector('svg'), wedge = svg.querySelector('.wedge'), hand = svg.querySelector('.hand'), lapsG = svg.querySelector('.laps-g');
    var big = $('big'), sub = $('sub'), go = $('go'), lapB = $('lap'), resetB = $('reset'), body = $('lapBody'), empty = $('lapEmpty'), lnote = $('lapNote');
    var copyB = $('copyLaps'), csvB = $('csvLaps');
    var w = load('ot.watch', null);
    if (!w || !Array.isArray(w.laps) || typeof w.acc !== 'number') w = OT.watchReset();
    function persist() { save('ot.watch', w); }
    var lastTxt = '', newLap = false;
    function render(full) {
      var n = now(), el = OT.watchTime(w, n), txt = OT.fmtWatch(el);
      if (txt !== lastTxt) { big.textContent = txt; lastTxt = txt; big.classList.toggle('long', txt.length > 8); }
      var fr = (el % 60000) / 60000;
      hand.setAttribute('transform', 'rotate(' + r1(fr * 360) + ' 200 200)');
      wedge.setAttribute('d', donut(fr));
      if (full) {
        sub.textContent = w.state === 'run' ? T.w_run : w.state === 'stop' ? T.w_stop : T.w_idle;
        go.querySelector('span').textContent = w.state === 'run' ? T.pause : w.state === 'stop' ? T.resume : T.start;
        go.querySelector('svg').innerHTML = w.state === 'run' ? '<path d="M5 3.5h3v11H5zM10 3.5h3v11h-3z" fill="currentColor"/>' : '<path d="M5 3.5v11l9-5.5z" fill="currentColor"/>';
        lapB.disabled = w.state !== 'run';
        resetB.disabled = w.state === 'run' || (w.acc === 0 && !w.laps.length);
        copyB.disabled = csvB.disabled = !w.laps.length;
        renderLaps();
      }
      if (!D.hidden && w.state === 'run') D.title = OT.fmtWatch(el, true) + ' · ' + baseTitle;
      else if (w.state !== 'run') D.title = baseTitle;
    }
    function renderLaps() {
      var lr = OT.lapRows(w.laps), frag = D.createDocumentFragment();
      for (var i = lr.rows.length - 1; i >= 0; i--) {
        var r = lr.rows[i], tr = D.createElement('tr');
        if (i === lr.fast) tr.className = 'is-fast'; else if (i === lr.slow) tr.className = 'is-slow';
        if (newLap && i === lr.rows.length - 1) tr.classList.add('is-new');
        var tag = i === lr.fast ? T.fast : i === lr.slow ? T.slow : '';
        tr.innerHTML = '<td>' + r.n + (tag ? '<span class="tag"></span>' : '') + '</td><td class="lp"></td><td></td>';
        if (tag) tr.querySelector('.tag').textContent = tag;
        tr.children[1].textContent = OT.fmtWatch(r.lap); tr.children[2].textContent = OT.fmtWatch(r.split);
        frag.appendChild(tr);
      }
      body.textContent = ''; body.appendChild(frag);
      empty.hidden = !!w.laps.length;
      // 시계판 테두리의 랩 점: 그 랩을 누른 순간의 초 자리(최근 30개)
      lapsG.textContent = '';
      w.laps.slice(-30).forEach(function (ms, k, arr) {
        var p = pt(113, (ms % 60000) / 60000);
        var c = svgEl('circle', { 'class': 'lapdot' + (newLap && k === arr.length - 1 ? ' is-new' : ''), cx: r1(p[0]), cy: r1(p[1]), r: 6 });
        lapsG.appendChild(c);
      });
      newLap = false;
    }
    function startStop() {
      if (w.state === 'run') w = OT.watchStop(w, now()); else { w = OT.watchStart(w, now()); ctx(); }
      persist(); render(true); kick();
    }
    function lap() { if (w.state !== 'run') return; w = OT.watchLap(w, now()); newLap = true; click(); persist(); render(true); }
    function reset() { if (w.state === 'run') return; w = OT.watchReset(); persist(); lnote.textContent = ''; render(true); }
    go.addEventListener('click', startStop); lapB.addEventListener('click', lap); resetB.addEventListener('click', reset);
    function table() { return OT.lapRows(w.laps).rows.map(function (r) { return [r.n, OT.fmtWatch(r.lap), OT.fmtWatch(r.split)].join('\t'); }); }
    copyB.addEventListener('click', function () {
      var txt = [T.lap_head + '\t' + D.querySelector('.lapt th:nth-child(2)').textContent + '\t' + D.querySelector('.lapt th:nth-child(3)').textContent].concat(table()).join('\n');
      var done = function () { lnote.textContent = T.copied; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt); done(); });
      else { fallbackCopy(txt); done(); }
    });
    function fallbackCopy(txt) { var ta = D.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; D.body.appendChild(ta); ta.select(); try { D.execCommand('copy'); } catch (e) {} ta.remove(); }
    csvB.addEventListener('click', function () {
      var blob = new Blob(['﻿' + OT.lapCsv(w.laps, LANG)], { type: 'text/csv;charset=utf-8' });
      var a = D.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'oneturn-laps.csv'; D.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      lnote.textContent = T.saved;
    });
    D.addEventListener('keydown', function (e) {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ' && !(e.target.closest && e.target.closest('button,a,summary'))) { e.preventDefault(); startStop(); }
      else if (keyIs(e, 'l', 'ㅣ')) lap();
      else if (keyIs(e, 'r', 'ㄱ')) reset();
      else if (keyIs(e, 'f', 'ㄹ')) setFull(!isFull());
      else if (e.key === 'Escape' && isFull()) setFull(false);
    });
    var raf = 0;
    function loop() { raf = 0; render(false); if (w.state === 'run' && !D.hidden) raf = requestAnimationFrame(loop); }
    function kick() { if (!raf && !D.hidden) raf = requestAnimationFrame(loop); }
    D.addEventListener('visibilitychange', function () { if (!D.hidden) { render(true); kick(); getWake(); } });
    addEventListener('pageshow', function () { render(true); kick(); });
    render(true); kick();
  })();

  /* =====================================================================
     알람
     ===================================================================== */
  if (PAGE === 'alarm') (function () {
    var MAXA = 12, dialbox = $('dialbox'), svg = dialbox.querySelector('svg'), wedge = svg.querySelector('.wedge'), marks = svg.querySelector('.amarks');
    var hh = svg.querySelector('.hand-h'), hm = svg.querySelector('.hand-m'), hs = svg.querySelector('.hand-s');
    var big = $('big'), sub = $('sub'), list = $('aList'), empty = $('aEmpty'), note = $('aNote'), tIn = $('aTime'), nIn = $('aName');
    var A = load('ot.alarms', []), seq = 1, due = {}, missedT = 0, ringList = [];
    if (!Array.isArray(A)) A = [];
    A = A.filter(function (a) { return a && a.id && a.h >= 0 && a.h <= 23 && a.m >= 0 && a.m <= 59; }).slice(0, MAXA);
    A.forEach(function (a) { var n = +String(a.id).replace(/\D/g, ''); if (n >= seq) seq = n + 1; });
    var t0 = now();
    A.forEach(function (a) { if (a.on && a.at < t0 - 60000) { a.on = false; a.missed = a.at; } }); // 닫혀 있던 사이 지나감
    // 기기 시간대가 바뀌었으면(여행) 켜진 알람을 새 시간대의 같은 벽시계 시각으로 다시 맞춘다(휴대폰 알람과 같게)
    function reanchor() {
      A.forEach(function (a) {
        if (a.z && a.z !== DEVZ && a.on) { var r = OT.nextAlarmZ(DEVZ, a.h, a.m, now()); a.at = r.at; a.shifted = r.shifted; schedule(a); }
        a.z = DEVZ;
      });
    }
    function persist() { save('ot.alarms', A); }
    persist();
    function schedule(a) {
      if (due[a.id]) { clearTimeout(due[a.id]); delete due[a.id]; }
      if (a.on) due[a.id] = setTimeout(function () { fire(a.id); }, Math.max(0, a.at - now()));
    }
    var missedNow = [];
    function fire(id) {
      delete due[id];
      var a = A.find(function (x) { return x.id === id; }); if (!a || !a.on) return;
      if (now() < a.at) { schedule(a); return; }
      if (now() - a.at > 2 * OT.MIN) { // 기기가 잠들었다 깨는 등 2분 넘게 늦었으면 울리지 않고 '놓침'으로
        a.on = false; a.missed = a.at; persist(); missedNow.push(hhmm(a.at) + (a.name ? ' ' + a.name : ''));
        clearTimeout(missedT); missedT = setTimeout(function () {
          showBar(fill(T.a_missed_bar, { list: missedNow.join(', ') }), [[T.close, function () { hideBar(); }]]); missedNow = [];
        }, 50);
        renderList(); return;
      }
      a.on = false; a.rang = a.at; persist();
      ringList.push(a.name || hhmm(a.at));
      var nm = ringList.join(', ');
      startRing(SET.sound);
      alertAll(fill(T.ring_msg, { name: nm }), fill(T.ring_title, { name: nm }));
      showBar(fill(T.ring_msg, { name: nm }), [[T.stop_sound, function () { ringList = []; stopRing(); dialbox.classList.remove('ring-now'); }], [T.a_snooze, function () {
        ringList = []; stopRing(); dialbox.classList.remove('ring-now'); addAt(now() + 5 * OT.MIN, a.name);
      }]]);
      if (fxOn()) { dialbox.classList.remove('ring-now'); void dialbox.offsetWidth; dialbox.classList.add('ring-now'); }
      renderList(); render();
    }
    function nextOn() { var b = null; A.forEach(function (a) { if (a.on && (!b || a.at < b.at)) b = a; }); return b; }
    var lastS = -1;
    function render() {
      var n = now(), d = lp(n), s = d.s, m = d.mi + s / 60, h = (d.h % 12) + m / 60;
      hh.setAttribute('transform', 'rotate(' + r1(h * 30) + ' 200 200)');
      hm.setAttribute('transform', 'rotate(' + r1(m * 6) + ' 200 200)');
      hs.setAttribute('transform', 'rotate(' + (s * 6) + ' 200 200)');
      if (s === lastS) return; lastS = s;
      big.textContent = OT.fmtClock(d.h, d.mi, LANG, H12);
      var nx = nextOn();
      var f0 = h / 12;
      wedge.setAttribute('d', nx ? arc(f0, f0 + Math.min(1, (nx.at - n) / (12 * OT.HOUR)), 126, 100) : '');
      sub.textContent = nx ? fill(T.a_next, { t: OT.until(nx.at - n, LANG) }) : T.a_none;
      if (s === 0) updateUntil();
    }
    function drawMarks() {
      marks.textContent = '';
      A.forEach(function (a) { if (!a.on) return; var d = lp(a.at), p = pt(113, ((d.h % 12) + d.mi / 60) / 12); marks.appendChild(svgEl('circle', { 'class': 'amark', cx: r1(p[0]), cy: r1(p[1]), r: 8 })); });
    }
    function updateUntil() {
      A.forEach(function (a) {
        var li = list.querySelector('[data-id="' + a.id + '"] .au'); if (!li) return;
        li.textContent = untilText(a);
      });
    }
    function untilText(a) {
      if (a.on) return OT.until(a.at - now(), LANG) + (a.shifted ? ' · ' + fill(T.a_shift, { t: hhmm(a.at) }) : '');
      if (a.missed) return fill(T.a_missed, { ago: OT.ago(now() - a.missed, LANG) });
      return T.a_off;
    }
    function renderList() {
      A.sort(function (x, y) { return (x.on ? 0 : 1) - (y.on ? 0 : 1) || (x.on ? x.at - y.at : (x.h * 60 + x.m) - (y.h * 60 + y.m)); });
      list.textContent = '';
      A.forEach(function (a) {
        var li = D.createElement('li');
        li.className = 'arow' + (a.on ? '' : ' is-off') + (a.missed && !a.on ? ' is-missed' : '');
        li.setAttribute('data-id', a.id);
        li.innerHTML = '<div><p class="at num"></p><p class="an"></p><p class="au"></p></div><label class="tog"><input type="checkbox" class="ao"><span class="sr"></span></label><button type="button" class="ibtn ax"></button>';
        li.querySelector('.at').textContent = a.on ? hhmm(a.at) : OT.fmtClock(a.h, a.m, LANG, H12);
        li.querySelector('.an').textContent = a.name || '';
        li.querySelector('.au').textContent = untilText(a);
        var shown = li.querySelector('.at').textContent;
        var cb = li.querySelector('.ao'); cb.checked = !!a.on; li.querySelector('.sr').textContent = T.a_on + ' · ' + shown;
        var x = li.querySelector('.ax'); x.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        x.setAttribute('aria-label', T.del + ' · ' + shown);
        list.appendChild(li);
      });
      empty.hidden = !!A.length;
      drawMarks(); lastS = -1; render();
    }
    list.addEventListener('change', function (e) {
      var cb = e.target.closest('.ao'); if (!cb) return;
      var a = A.find(function (x) { return x.id === cb.closest('.arow').getAttribute('data-id'); }); if (!a) return;
      if (cb.checked) { var r = OT.nextAlarmZ(DEVZ, a.h, a.m, now()); a.on = true; a.at = r.at; a.shifted = r.shifted; a.z = DEVZ; delete a.missed; ctx(); }
      else a.on = false;
      schedule(a); persist(); renderList();
    });
    list.addEventListener('click', function (e) {
      var x = e.target.closest('.ax'); if (!x) return;
      var id = x.closest('.arow').getAttribute('data-id'), i = A.findIndex(function (a) { return a.id === id; });
      if (i >= 0) { if (due[id]) clearTimeout(due[id]); A.splice(i, 1); persist(); renderList(); }
    });
    function addAt(at, name) { // 정확한 순간(5분 뒤 다시)
      at = Math.ceil(at / OT.MIN) * OT.MIN; var p = lp(at);
      if (A.some(function (x) { return x.on && x.at === at; })) return;
      push({ h: p.h, m: p.mi, at: at, shifted: false }, name);
    }
    function addAlarm(h, m, name) {
      var r = OT.nextAlarmZ(DEVZ, h, m, now());
      if (A.some(function (x) { return x.on && x.at === r.at; })) { note.classList.add('is-bad'); note.textContent = T.a_dup; return; }
      var off = A.find(function (x) { return !x.on && x.h === h && x.m === m; });
      if (off) { // 꺼진 같은 시각 줄이 있으면 새로 만들지 않고 다시 켠다
        off.on = true; off.at = r.at; off.shifted = r.shifted; off.z = DEVZ; delete off.missed; if (name && name.trim()) off.name = name.trim().slice(0, 24);
        schedule(off); persist(); renderList(); ctx(); note.classList.remove('is-bad');
        note.textContent = fill(T.a_added, { t: hhmm(off.at), in: OT.until(off.at - now(), LANG) }); return;
      }
      push({ h: h, m: m, at: r.at, shifted: r.shifted }, name);
    }
    function push(r, name) {
      if (A.length >= MAXA) { note.textContent = T.a_max; note.classList.add('is-bad'); return; }
      var a = { id: 'a' + (seq++), h: r.h, m: r.m, name: (name || '').trim().slice(0, 24), on: true, at: r.at, shifted: r.shifted, z: DEVZ };
      A.push(a); schedule(a); persist(); renderList(); ctx();
      note.classList.remove('is-bad');
      note.textContent = fill(T.a_added, { t: hhmm(a.at), in: OT.until(a.at - now(), LANG) });
    }
    $('aAdd').addEventListener('click', function () {
      var c = OT.parseClock(tIn.value);
      if (!c) { note.textContent = T.a_bad; note.classList.add('is-bad'); tIn.setAttribute('aria-invalid', 'true'); return; }
      tIn.removeAttribute('aria-invalid');
      addAlarm(c.h, c.m, nIn.value); nIn.value = '';
    });
    D.querySelectorAll('[data-quick]').forEach(function (b) {
      b.addEventListener('click', function () { // 시각 칸만 채운다(만들기는 '알람 맞추기')
        var p = lp(now() + (+b.getAttribute('data-quick')) * OT.MIN);
        tIn.value = (p.h < 10 ? '0' : '') + p.h + ':' + (p.mi < 10 ? '0' : '') + p.mi;
        tIn.removeAttribute('aria-invalid'); note.classList.remove('is-bad');
        note.textContent = fill(T.a_filled, { t: OT.fmtClock(p.h, p.mi, LANG, H12) });
        $('aAdd').focus();
      });
    });
    D.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (bar) { stopRing(); e.preventDefault(); } else if (isFull()) setFull(false); return; }
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (keyIs(e, 'f', 'ㄹ')) setFull(!isFull());
    });
    var raf = 0;
    function loop() { raf = 0; render(); if (!D.hidden) raf = requestAnimationFrame(loop); }
    D.addEventListener('visibilitychange', function () {
      if (!D.hidden) {
        var z = zoneNow(); if (z !== DEVZ) { DEVZ = z; reanchor(); persist(); renderList(); }
        A.forEach(function (a) { if (a.on && now() >= a.at) fire(a.id); }); if (!raf) raf = requestAnimationFrame(loop); updateUntil(); getWake();
      }
    });
    reanchor(); persist();
    A.forEach(schedule);
    // 열자마자 1분 안에 울려야 할 알람(닫혀 있다가 막 연 경우)
    A.forEach(function (a) { if (a.on && a.at <= now()) fire(a.id); });
    renderList();
    raf = requestAnimationFrame(loop);
    addEventListener('pageshow', function () { lastS = -1; render(); });
  })();

  /* =====================================================================
     세계 시간
     ===================================================================== */
  if (PAGE === 'world') (function () {
    var TZ = window.OT_TZ, CITY = {}, ko = LANG === 'ko';
    function norm(x) { return String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,()]/g, ' ').replace(/\s+/g, ' ').trim(); }
    TZ.cities.forEach(function (c) {
      CITY[c[0]] = { id: c[0], zone: c[1], name: ko ? c[3] : c[2], nation: TZ.nations[c[4]][ko ? 1 : 0],
        names: [norm(c[2]), norm(c[3]), c[0]], words: norm(c[5]).split(' ').filter(Boolean), nat: TZ.nations[c[4]].map(norm) };
    });
    var device = 'UTC';
    try { device = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}
    if (!OT.validZone(device)) device = 'UTC';
    var S = load('ot.cities', null);
    if (!S || !Array.isArray(S.list)) S = { base: 'auto', list: (cfg.defaults || []).slice() };
    S.list = S.list.filter(function (id) { return CITY[id]; }).slice(0, 12);
    if (S.base !== 'auto' && !CITY[S.base]) S.base = 'auto';
    function persist() { save('ot.cities', S); }
    function baseZone() { return S.base === 'auto' ? device : CITY[S.base].zone; }
    function cityOfZone(z) { for (var k in CITY) if (CITY[k].zone === z) return CITY[k]; return null; }
    function baseName() {
      if (S.base !== 'auto') return CITY[S.base].name;
      var c = cityOfZone(device); return c ? c.name : T.you;
    }
    var cities = $('cities'), sel = $('baseSel'), dl = $('cityList'), cin = $('cityIn'), cnote = $('cityNote');
    // 기준 고르기
    var opt0 = D.createElement('option'); opt0.value = 'auto'; opt0.textContent = fill(T.base_me, { zone: device }); sel.appendChild(opt0);
    Object.keys(CITY).map(function (k) { return CITY[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name, LANG); }).forEach(function (c) {
      var o = D.createElement('option'); o.value = c.id; o.textContent = c.name + ' · ' + c.nation; sel.appendChild(o);
      var o2 = D.createElement('option'); o2.value = c.name + ' (' + c.nation + ')'; dl.appendChild(o2);
    });
    sel.value = S.base;
    sel.addEventListener('change', function () { S.base = sel.value; persist(); renderAll(); });

    function dateLabel(p) {
      var w = T.weekday[p.wd];
      if (ko) return fill(T.date_fmt, { m: p.mo, d: p.d, w: w });
      var mon = new Date(Date.UTC(p.y, p.mo - 1, p.d)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      return fill(T.date_fmt, { w: w, mon: mon, d: p.d });
    }
    function dayWord(p, bp) {
      var dd = Math.round((Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(bp.y, bp.mo - 1, bp.d)) / OT.DAY);
      return dd === 1 ? T.tomorrow : dd === -1 ? T.yesterday : dd === 0 ? T.today : '';
    }
    function d24(svg, p) {
      var fr = function (h) { return h / 24; };
      var R = 26, c = 32;
      function a(f0, f1, cls) {
        var p0 = [c + R * Math.sin(f0 * 2 * Math.PI), c - R * Math.cos(f0 * 2 * Math.PI)], p1 = [c + R * Math.sin(f1 * 2 * Math.PI), c - R * Math.cos(f1 * 2 * Math.PI)];
        return '<path class="' + cls + '" d="M' + r1(p0[0]) + ' ' + r1(p0[1]) + 'A' + R + ' ' + R + ' 0 ' + (f1 - f0 > 0.5 ? 1 : 0) + ' 1 ' + r1(p1[0]) + ' ' + r1(p1[1]) + '"/>';
      }
      var hf = (p.h + p.mi / 60) / 24, hx = c + 19 * Math.sin(hf * 2 * Math.PI), hy = c - 19 * Math.cos(hf * 2 * Math.PI);
      svg.innerHTML = '<circle class="r" cx="32" cy="32" r="26"/>' + a(fr(22), fr(24), 'nt') + a(0, fr(7), 'nt') + (p.wd >= 1 && p.wd <= 5 ? a(fr(9), fr(18), 'w') : '') +
        '<text class="t" x="32" y="13">0</text><text class="t" x="32" y="51">12</text><line class="hd" x1="32" y1="32" x2="' + r1(hx) + '" y2="' + r1(hy) + '"/><circle class="c" cx="32" cy="32" r="2.6"/>';
    }
    function dstLine(zone, n) {
      var ch = OT.nextChange(zone, n, 370); if (!ch) return T.dst_none;
      var bz = baseZone(), after = ch.after - OT.offset(bz, ch.at + OT.MIN);
      var what = OT.PATCH[zone] && Math.abs(ch.at - OT.PATCH[zone].from) < OT.HOUR ? T.dst_change : ch.after > ch.before ? T.dst_start : T.dst_end;
      var w = OT.changeWall(ch); // 바뀌기 직전 벽시계(자정에 바꾸는 곳은 다음 날 0:00)
      return fill(T.dst_next, { date: dateLabel(w), time: OT.fmtClock(w.h, w.mi, LANG, H12), what: what, diff: OT.diffText(after, LANG, baseName()) });
    }
    var rowsMin = -1;
    function renderAll() {
      rowsMin = -1; tick(true); renderGrid();
    }
    function tick(force) {
      var n = now(), bz = baseZone(), bp = OT.parts(bz, n);
      $('nowClock').innerHTML = esc(OT.fmtClock(bp.h, bp.mi, LANG, H12)) + '<small>' + (bp.s < 10 ? '0' : '') + bp.s + '</small>';
      $('nowName').textContent = baseName();
      $('nowSub').textContent = dateLabel(bp) + ' · ' + OT.utcLabel(OT.offset(bz, n)) + ' · ' + bz;
      var minute = Math.floor(n / OT.MIN);
      if (!force && minute === rowsMin) return;
      rowsMin = minute;
      cities.textContent = '';
      S.list.forEach(function (id) {
        var c = CITY[id], p = OT.parts(c.zone, n), li = D.createElement('li');
        li.className = 'city'; li.setAttribute('data-id', id);
        li.innerHTML = '<svg class="d24" viewBox="0 0 64 64" aria-hidden="true"></svg><p class="cn"></p><p class="ct num"></p><p class="cd"></p><p class="dst"></p><button type="button" class="ibtn cx"></button>';
        d24(li.querySelector('.d24'), p);
        li.querySelector('.cn').innerHTML = esc(c.name) + '<small>' + esc(c.nation) + '</small>';
        var dw = dayWord(p, bp);
        li.querySelector('.ct').innerHTML = esc(OT.fmtClock(p.h, p.mi, LANG, H12)) + (dw && dw !== T.today ? '<small>' + esc(dw) + '</small>' : '');
        li.querySelector('.cd').textContent = OT.diffText(OT.diff(bz, c.zone, n), LANG, baseName()) + ' · ' + OT.utcLabel(OT.offset(c.zone, n));
        li.querySelector('.dst').textContent = dstLine(c.zone, n);
        var x = li.querySelector('.cx'); x.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        x.setAttribute('aria-label', T.remove + ' · ' + c.name);
        cities.appendChild(li);
      });
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    cities.addEventListener('click', function (e) {
      var x = e.target.closest('.cx'); if (!x) return;
      var id = x.closest('.city').getAttribute('data-id'); S.list = S.list.filter(function (k) { return k !== id; }); persist(); renderAll();
    });
    // 찾는 순서: 이름·별칭(약어 EST·KST 포함)이 딱 맞음 → 이름 앞부분 → 나라 이름 → (세 글자 넘을 때만) 이름 속 일부.
    // 'Seoul, Korea'처럼 둘 이상이면 첫 낱말로 다시. 한 글자는 받지 않는다.
    function findCity(raw) {
      var q = norm(String(raw).replace(/\(.*\)/, '')); if (q.length < 2) return null;
      var list = Object.keys(CITY).map(function (k) { return CITY[k]; });
      function pick(test) { for (var i = 0; i < list.length; i++) if (test(list[i])) return list[i]; return null; }
      var hit = pick(function (c) { return c.names.indexOf(q) >= 0 || (q.indexOf(' ') < 0 ? c.words.indexOf(q) >= 0 : (' ' + c.words.join(' ') + ' ').indexOf(' ' + q + ' ') >= 0); })
        || pick(function (c) { return c.names.some(function (n) { return n.indexOf(q) === 0; }); })
        || pick(function (c) { return c.nat.indexOf(q) >= 0; })
        || (q.length >= 3 ? pick(function (c) { return c.names.some(function (n) { return n.indexOf(q) > 0; }) || c.words.some(function (w) { return w.length >= 3 && w.indexOf(q) === 0; }); }) : null);
      if (!hit && q.indexOf(' ') > 0) return findCity(q.split(' ')[0]);
      return hit;
    }
    function addCity() {
      var c = findCity(cin.value);
      cnote.classList.remove('is-bad');
      if (!c) { cnote.textContent = T.city_none; cnote.classList.add('is-bad'); return; }
      if (S.list.indexOf(c.id) >= 0) { cnote.textContent = T.city_dup; return; }
      if (S.list.length >= 12) { cnote.textContent = T.city_max; cnote.classList.add('is-bad'); return; }
      S.list.push(c.id); persist(); cin.value = ''; cnote.textContent = ''; renderAll();
    }
    $('cityAdd').addEventListener('click', addCity);
    cin.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addCity(); } });
    cin.addEventListener('change', function () { if (findCity(cin.value) && /\(/.test(cin.value)) addCity(); });

    // 회의 시간 띠
    var md = $('meetDate'), tb = $('g24').querySelector('tbody'), pickLine = $('pickLine'), copyB = $('copyPick'), selH = -1, lastGrid = null;
    function ymd(p) { return p.y + '-' + (p.mo < 10 ? '0' : '') + p.mo + '-' + (p.d < 10 ? '0' : '') + p.d; }
    md.value = ymd(OT.parts(baseZone(), now()));
    md.addEventListener('change', function () { selH = -1; mtIn.value = ''; renderGrid(); });
    var mtIn = $('meetTime');
    mtIn.addEventListener('input', function () { selH = -1; renderGrid(); });
    $('grid24').addEventListener('scroll', function () { this.__moved = true; }, { passive: true });
    function hourLabel(h) { return ko ? (h < 12 ? '오전 ' : '오후 ') + (h % 12 === 0 ? 12 : h % 12) + '시' : (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? ' AM' : ' PM'); }
    function renderGrid() {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(md.value);
      if (!m) { var bp = OT.parts(baseZone(), now()); m = [0, bp.y, bp.mo, bp.d]; md.value = ymd(bp); }
      var bz = baseZone(), rows = [{ name: baseName(), zone: bz }].concat(S.list.map(function (id) { return { name: CITY[id].name, zone: CITY[id].zone }; }));
      var mt = OT.meeting(bz, rows.map(function (r) { return r.zone; }), +m[1], +m[2], +m[3]);
      lastGrid = { mt: mt, rows: rows };
      var html = '';
      rows.forEach(function (r, ri) {
        html += '<tr><th scope="row">' + esc(r.name) + '</th>';
        mt.hours.forEach(function (hr, hi) {
          var c = hr.cells[ri], cls = [], prev = hi ? mt.hours[hi - 1].cells[ri] : null;
          if (hr.all) cls.push('all'); else if (c.work) cls.push('w'); else if (c.night) cls.push('nt'); else if (c.wd === 0 || c.wd === 6) cls.push('we');
          if (prev && prev.day !== c.day) cls.push('dd');
          if (hi === selH) cls.push('sel');
          var lab = c.mi ? c.h + ':' + (c.mi < 10 ? '0' : '') + c.mi : c.h;
          html += '<td class="' + cls.join(' ') + '" data-h="' + hi + '" tabindex="' + (ri === 0 ? 0 : -1) + '" title="' + esc(r.name + ' ' + OT.fmtClock(c.h, c.mi, LANG, H12)) + '">' + lab + '</td>';
        });
        html += '</tr>';
      });
      tb.innerHTML = html;
      // 좁은 화면: 처음엔 기준 도시 아침 7시 칸부터 보이게(근무 시간 쪽)
      var box = $('grid24'), anchor = tb.querySelector('td[data-h="' + (selH >= 0 ? Math.max(0, selH - 2) : (mt.all[0] != null ? Math.max(0, mt.all[0] - 2) : 7)) + '"]');
      if (anchor && box.scrollWidth > box.clientWidth && !box.__moved) { var th = tb.querySelector('th'); box.scrollLeft = Math.max(0, anchor.offsetLeft - (th ? th.offsetWidth : 0) - 4); }
      var allSum = $('allSum');
      if (!mt.all.length) allSum.textContent = T.all_none;
      else {
        var groups = [], s0 = mt.all[0], pv = s0;
        for (var i = 1; i <= mt.all.length; i++) { if (mt.all[i] === pv + 1) { pv = mt.all[i]; continue; } groups.push([s0, pv]); s0 = pv = mt.all[i]; }
        allSum.textContent = fill(T.all_some, { list: groups.map(function (g) { return hourLabel(g[0]) + (g[1] > g[0] ? '–' + hourLabel(g[1] + 1) : ''); }).join(', ') + ' (' + baseName() + ')' });
      }
      showPick();
    }
    function showPick() {
      var c = OT.parseClock(mtIn.value), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(md.value);
      if (selH < 0 && c && m && lastGrid) { // 분 단위 시각을 넣었을 때
        var r = OT.fromLocal(baseZone(), +m[1], +m[2], +m[3], c.h, c.m);
        pickLine.textContent = lastGrid.rows.map(function (row) { var p = OT.parts(row.zone, r.ts); return row.name + ' ' + dateLabel(p) + ' ' + OT.fmtClock(p.h, p.mi, LANG, H12); }).join(' = ') + (r.gap ? ' ' + T.gap : '');
        copyB.disabled = false; return;
      }
      if (selH < 0 || !lastGrid) { pickLine.textContent = D.querySelector('.pickline p').getAttribute('data-d') || pickLine.textContent; copyB.disabled = true; return; }
      var hr = lastGrid.mt.hours[selH], parts = lastGrid.rows.map(function (r) {
        var p = OT.parts(r.zone, hr.ts); return r.name + ' ' + dateLabel(p) + ' ' + OT.fmtClock(p.h, p.mi, LANG, H12);
      });
      pickLine.textContent = parts.join(' = ') + (hr.gap ? ' ' + T.gap : '');
      copyB.disabled = false;
    }
    pickLine.setAttribute('data-d', pickLine.textContent);
    tb.addEventListener('click', function (e) { var td = e.target.closest('td'); if (!td) return; selH = +td.getAttribute('data-h'); mtIn.value = (selH < 10 ? '0' : '') + selH + ':00'; renderGrid(); var f = tb.querySelector('tr td[data-h="' + selH + '"]'); if (f) f.focus({ preventScroll: true }); });
    tb.addEventListener('keydown', function (e) {
      var td = e.target.closest('td'); if (!td) return;
      var h = +td.getAttribute('data-h');
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selH = h; renderGrid(); tb.querySelector('td[data-h="' + h + '"]').focus(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var nx = tb.querySelector('td[data-h="' + Math.max(0, Math.min(23, h + (e.key === 'ArrowRight' ? 1 : -1))) + '"]'); if (nx) nx.focus(); }
    });
    copyB.addEventListener('click', function () {
      var txt = pickLine.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { copyB.textContent = T.copied; setTimeout(function () { copyB.textContent = D.querySelector('.pickline').getAttribute('data-c') || copyB.textContent; }, 1500); });
    });
    D.querySelector('.pickline').setAttribute('data-c', copyB.textContent);

    // 브라우저 시간대 자료가 낡았으면 알린다
    // 낡은 시간대 자료 알림은 페이지 안 짧은 스크립트가 첫 그림 전에 띄운다(build.py STALE_BOOT, 화면 밀림 0)
    renderAll();
    var raf = 0, lastSec = -1;
    function loop() { raf = 0; var s = Math.floor(now() / 1000); if (s !== lastSec) { lastSec = s; tick(false); } if (!D.hidden) raf = requestAnimationFrame(loop); }
    raf = requestAnimationFrame(loop);
    D.addEventListener('visibilitychange', function () { if (!D.hidden && !raf) { rowsMin = -1; raf = requestAnimationFrame(loop); } });
    addEventListener('pageshow', function () { renderAll(); });
  })();
})();
