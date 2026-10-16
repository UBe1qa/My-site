/* 병아리 구조대 맛보기 판 — 게임 규칙(games/sort-puzzle/scripts/core/sort_rules.gd)을 웹으로 옮긴 것.
   튜브 글자: 앞이 바닥, 끝이 위. 대문자 = 능력 없는 친구, c = 다람쥐(꾹 누르면 꼭대기로), b = 병아리.
   판 두 개는 게임의 구출 1스테이지 1판·4판 그대로(levels/rescue.json). 외부 라이브러리 없음. */
(function () {
  'use strict';
  var root = document.getElementById('demo');
  if (!root) return;
  var T = JSON.parse(document.getElementById('demo-text').textContent);
  var CAP = 4, nudgeId = 0;
  var LEVELS = [
    { tubes: ['ABA', 'BABC', 'CCCA', 'bB'], min: 3, tip: T.tip1 },
    { tubes: ['AAC', 'BBbB', 'cCCB', 'CAcA', 'cc'], min: 3, tip: T.tip2 }
  ];
  var COLORS = { A: '#E5484D', B: '#3E8BFF', C: '#F5C400' };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var board = root.querySelector('.board');
  var layer = root.querySelector('.pieces');
  var nest = root.querySelector('.nest');
  var tipEl = root.querySelector('.demo-tip');
  var countEl = root.querySelector('.demo-count');
  var doneEl = root.querySelector('.demo-done');
  var fx = root.querySelector('.fx');
  var undoBtn = root.querySelector('[data-act="undo"]');
  var hintBtn = root.querySelector('[data-act="hint"]');
  var restartBtn = root.querySelector('[data-act="restart"]');

  var lv = 0, state, moves, sel = -1, history, pieces, tubesEl = [], busy = false, saved = 0, total = 0;
  var dims = { tw: 62, pw: 52, th: 236, slot: 54, gap: 10 };

  /* ── 규칙 ── */
  function top(t) { return t ? t[t.length - 1] : ''; }
  function topRun(t) { var n = t.length, j = n - 2; if (!n) return 0; while (j >= 0 && t[j] === t[n - 1]) j--; return n - 1 - j; }
  function sealed(t) { if (t.length !== CAP) return false; for (var i = 1; i < t.length; i++) if (t[i] !== t[0]) return false; return true; }
  function canPour(s, a, b) { var A = s[a], B = s[b]; return a !== b && A && !sealed(A) && B.length < CAP && (!B || top(A) === top(B)); }
  function canClimb(s, t, k) { var A = s[t]; return !sealed(A) && A[k] === 'c' && k < A.length - 1 && A.slice(k + 1).replace(/c/g, '') !== ''; }
  function apply(s, m) {
    var n = s.slice(), A = s[m.t];
    if (m.type === 'pour') {
      var B = s[m.to], c = Math.min(topRun(A), CAP - B.length);
      n[m.t] = A.slice(0, A.length - c); n[m.to] = B + new Array(c + 1).join(top(A));
    } else {
      n[m.t] = A.slice(0, m.k) + A.slice(m.k + 1) + 'c';
    }
    return n;
  }
  function release(s) { var out = [], n = s.slice(); for (var i = 0; i < n.length; i++) while (top(n[i]) === 'b') { n[i] = n[i].slice(0, -1); out.push(i); } return { s: n, freed: out }; }
  function hasBaby(s) { return s.join('').indexOf('b') >= 0; }
  function legal(s) {
    var out = [];
    for (var a = 0; a < s.length; a++) {
      for (var b = 0; b < s.length; b++) if (canPour(s, a, b)) out.push({ type: 'pour', t: a, to: b });
      for (var k = 0; k < s[a].length; k++) if (canClimb(s, a, k)) out.push({ type: 'climb', t: a, k: k });
    }
    return out;
  }
  function solve(s) { // 가장 적은 수의 다음 한 수 (힌트)
    var start = s.join('|'), q = [[s, null]], seen = {}; seen[start] = 1;
    for (var i = 0; i < q.length && i < 20000; i++) {
      var cur = q[i][0], first = q[i][1], ms = legal(cur);
      for (var j = 0; j < ms.length; j++) {
        var nx = release(apply(cur, ms[j])).s, key = nx.join('|');
        if (seen[key]) continue; seen[key] = 1;
        var f = first || ms[j];
        if (!hasBaby(nx)) return f;
        q.push([nx, f]);
      }
    }
    return null;
  }

  /* ── 그림 ── */
  function face(kind) {
    if (kind === 'b') return '<img src="/img/c-chick.webp" alt="" draggable="false">';
    if (kind === 'c') return '<img src="/img/c-squirrel.webp" alt="" draggable="false">';
    var c = COLORS[kind], mark = kind === 'A' ? '<circle cx="50" cy="69" r="6" fill="none" stroke="#fff" stroke-width="4"/>'
      : kind === 'B' ? '<rect x="44" y="63" width="12" height="12" rx="2" fill="#fff"/>'
      : '<path d="M50 62 58 75H42z" fill="#fff"/>';
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="45" fill="' + c + '"/>' +
      '<ellipse cx="34" cy="28" rx="11" ry="7" fill="#fff" opacity=".28"/>' +
      '<circle cx="36" cy="46" r="10" fill="#fff"/><circle cx="64" cy="46" r="10" fill="#fff"/>' +
      '<circle cx="38" cy="47" r="5.5" fill="#1D1D2B"/><circle cx="66" cy="47" r="5.5" fill="#1D1D2B"/>' + mark + '</svg>';
  }
  function measure() {
    var n = state.length, avail = Math.min(root.clientWidth, 460);
    var gap = n > 4 ? 8 : 12;
    var tw = Math.floor(Math.min(66, (avail - gap * (n - 1)) / n));
    var pw = tw - 10, slot = pw + 3;
    dims = { tw: tw, pw: pw, slot: slot, th: CAP * slot + 20, gap: gap };
    board.style.setProperty('--tw', tw + 'px'); board.style.setProperty('--pw', pw + 'px');
    board.style.setProperty('--th', dims.th + 'px'); board.style.setProperty('--gap', gap + 'px');
  }
  function posOf(t, i, lift) {
    var el = tubesEl[t];
    return { x: el.offsetLeft + (dims.tw - dims.pw) / 2, y: el.offsetTop + dims.th - 10 - (i + 1) * dims.slot - (lift ? 18 : 0) };
  }
  function place(p, x, y) { p.el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
  function nameOf(k) { return T.names[k]; }
  function labelTube(t) {
    var s = state[t];
    var who = s ? s.split('').map(nameOf).join(', ') : T.empty;
    tubesEl[t].setAttribute('aria-label', T.tube.replace('{n}', t + 1) + ' — ' + who);
  }
  function layout() {
    for (var t = 0; t < pieces.length; t++) {
      var run = sel === t ? topRun(state[t]) : 0, len = pieces[t].length;
      for (var i = 0; i < len; i++) { var q = posOf(t, i, sel === t && i >= len - run); place(pieces[t][i], q.x, q.y); }
      tubesEl[t].classList.toggle('is-sel', sel === t);
      tubesEl[t].classList.toggle('is-sealed', sealed(state[t]));
      labelTube(t);
    }
  }
  function build() {
    board.querySelectorAll('.tube').forEach(function (b) { b.remove(); });
    layer.innerHTML = ''; nest.innerHTML = '';
    tubesEl = []; pieces = [];
    measure();
    for (var t = 0; t < state.length; t++) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tube'; b.dataset.t = t;
      board.insertBefore(b, layer);
      tubesEl.push(b);
      var col = [];
      for (var i = 0; i < state[t].length; i++) {
        var el = document.createElement('div');
        el.className = 'pc'; el.innerHTML = face(state[t][i]); el.style.transition = 'none';
        layer.appendChild(el); col.push({ kind: state[t][i], el: el });
      }
      pieces.push(col);
    }
    total = LEVELS[lv].tubes.join('').split('b').length - 1;
    for (var k = 0; k < total; k++) {
      var slot = document.createElement('span'); slot.className = 'nest-slot'; nest.appendChild(slot);
    }
    layout();
    layer.offsetWidth; // 위치를 먼저 정하고 나서 움직임을 켠다
    layer.querySelectorAll('.pc').forEach(function (e) { e.style.transition = ''; });
  }
  function setTip(s) { tipEl.textContent = s; }
  function setCount() { countEl.textContent = T.count.replace('{n}', moves).replace('{min}', LEVELS[lv].min); }

  function start(i) {
    lv = i; state = LEVELS[lv].tubes.slice(); moves = 0; sel = -1; history = []; saved = 0; busy = false;
    doneEl.hidden = true; root.classList.remove('is-done');
    build(); setTip(LEVELS[lv].tip); setCount(); clearHint(); undoBtn.disabled = true;
    if (lv === 0) nudgeId = setTimeout(function () {
      var m = solve(state); if (m && m.type === 'pour' && sel < 0 && !moves) tubesEl[m.t].classList.add('is-nudge');
    }, 5000);
  }

  /* ── 한 수 ── */
  function clearHint() {
    root.querySelectorAll('.is-hint').forEach(function (e) { e.classList.remove('is-hint'); e.removeAttribute('data-hint'); });
    root.querySelectorAll('.is-nudge').forEach(function (e) { e.classList.remove('is-nudge'); });
    clearTimeout(nudgeId);
    root.querySelectorAll('.is-hintpc').forEach(function (e) { e.classList.remove('is-hintpc'); });
  }
  function doMove(m) {
    clearHint();
    history.push({ state: state.slice(), moves: moves, saved: saved });
    undoBtn.disabled = false;
    var next = apply(state, m);
    if (m.type === 'pour') {
      var c = Math.min(topRun(state[m.t]), CAP - state[m.to].length);
      var moving = pieces[m.t].splice(pieces[m.t].length - c, c);
      pieces[m.to] = pieces[m.to].concat(moving);
    } else {
      var p = pieces[m.t].splice(m.k, 1)[0];
      pieces[m.t].push(p);
      if (!reduce) p.el.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.6)' }, { filter: 'brightness(1)' }], 400);
    }
    state = next; sel = -1; moves++;
    layout(); setCount();
    var r = release(state);
    if (r.freed.length) { busy = true; setTimeout(function () { rescue(r); }, reduce ? 0 : 260); }
    else setTip(T.go);
  }
  function rescue(r) {
    var nestRect = nest.getBoundingClientRect(), bRect = board.getBoundingClientRect();
    r.freed.forEach(function (t, j) {
      var p = pieces[t].pop(), slotEl = nest.children[saved];
      var sr = slotEl.getBoundingClientRect();
      var from = p.el.style.transform;
      var tx = sr.left - bRect.left + (sr.width - dims.pw) / 2, ty = sr.top - bRect.top - dims.pw * 0.55;
      var to = 'translate(' + tx + 'px,' + ty + 'px) scale(.82)';
      saved++;
      var land = (function (el, sl) { return function () { el.remove(); sl.dataset.full = '1'; }; })(p.el, slotEl);
      if (reduce) { land(); return; }
      var mid = 'translate(' + (tx + parseFloat(from.split('(')[1])) / 2 + 'px,' + (Math.min(ty, parseFloat(from.split(',')[1])) - 70) + 'px) scale(1.15) rotate(-8deg)';
      p.el.style.transition = 'none';
      p.el.animate([{ transform: from }, { transform: mid, offset: .55 }, { transform: to }], { duration: 760, easing: 'cubic-bezier(.3,.7,.3,1)', delay: j * 120, fill: 'both' })
        .onfinish = land;
    });
    state = r.s;
    setTip(T.saved);
    setTimeout(function () {
      busy = false;
      if (!hasBaby(state)) win(); else layout();
    }, reduce ? 0 : 900);
  }
  function win() {
    busy = true; root.classList.add('is-done');
    for (var i = 0; i < state.length; i++) labelTube(i); // 날아간 병아리를 읽기 라벨에서도 뺀다
    if (!reduce) { confetti(); wave(); }
    setTimeout(function () {
      var last = lv === LEVELS.length - 1;
      doneEl.querySelector('h2').textContent = last ? T.doneAllTitle : T.doneTitle;
      doneEl.querySelector('p').textContent = (last ? T.doneAll : T.done).replace('{n}', moves) + (moves <= LEVELS[lv].min ? ' ' + T.best : '');
      var a = doneEl.querySelector('[data-act="next"]'), b = doneEl.querySelector('[data-act="real"]');
      a.textContent = last ? T.seeReal : T.next; a.dataset.go = last ? 'real' : 'next';
      b.textContent = last ? T.again : T.seeReal; b.dataset.go = last ? 'again' : 'real';
      doneEl.hidden = false; a.focus({ preventScroll: true });
      if (window.crEvent) window.crEvent('demo_clear_' + (lv + 1));
    }, reduce ? 0 : 1100);
  }
  function wave() {
    var all = layer.querySelectorAll('.pc');
    all.forEach(function (e, i) {
      e.animate([{ translate: '0 0' }, { translate: '0 -16px' }, { translate: '0 0' }], { duration: 420, delay: i * 45, easing: 'ease-out' });
    });
  }
  function confetti() {
    var c = fx, ctx = c.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    var w = c.clientWidth, h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
    var cs = getComputedStyle(document.documentElement);
    var cols = [cs.getPropertyValue('--chick'), cs.getPropertyValue('--play'), '#E5484D', '#3E8BFF', '#F45FB0', '#19C2D6'];
    var n = innerWidth < 600 ? 50 : 76, ps = [];
    for (var i = 0; i < n; i++) ps.push({ x: w / 2 + (Math.random() - .5) * 60, y: h * .45, vx: (Math.random() - .5) * 9, vy: -6 - Math.random() * 8, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, s: 6 + Math.random() * 6, c: cols[i % cols.length].trim(), star: i % 5 === 0 });
    var t0 = performance.now();
    (function frame(now) {
      var k = (now - t0) / 1400; ctx.clearRect(0, 0, w, h);
      if (k >= 1) return;
      ps.forEach(function (p) {
        p.vy += .32; p.x += p.vx; p.y += p.vy; p.vx *= .985; p.r += p.vr;
        ctx.save(); ctx.globalAlpha = 1 - Math.max(0, k - .6) / .4; ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        if (p.star) { ctx.beginPath(); for (var j = 0; j < 10; j++) { var rr = j % 2 ? p.s * .45 : p.s; ctx.lineTo(Math.cos(j * Math.PI / 5) * rr, Math.sin(j * Math.PI / 5) * rr); } ctx.fill(); }
        else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      });
      requestAnimationFrame(frame);
    })(t0);
  }

  /* ── 손 ── */
  var hold = null, skipClick = false;
  function tap(t) {
    if (busy) return;
    if (sel < 0) {
      if (!state[t] || sealed(state[t])) { no(t); return; }
      sel = t; clearHint(); layout(); setTip(T.pick); return;
    }
    if (sel === t) { sel = -1; layout(); setTip(T.go); return; }
    if (canPour(state, sel, t)) { doMove({ type: 'pour', t: sel, to: t }); return; }
    var why = sealed(state[t]) ? T.cantSealed : state[t].length >= CAP ? T.cantFull : T.cant;
    no(t); sel = -1; layout(); setTip(why);
  }
  function no(t) { var e = tubesEl[t]; e.classList.remove('is-no'); void e.offsetWidth; e.classList.add('is-no'); if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) {} }
  function pieceAt(t, clientY) {
    var r = tubesEl[t].getBoundingClientRect(), i = Math.floor((r.bottom - 10 - clientY) / dims.slot);
    return i >= 0 && i < state[t].length ? i : -1;
  }
  board.addEventListener('click', function (e) {
    var b = e.target.closest('.tube'); if (!b) return;
    if (skipClick) { skipClick = false; return; }
    tap(+b.dataset.t);
  });
  board.addEventListener('pointerdown', function (e) {
    var b = e.target.closest('.tube'); if (!b || busy) return;
    var t = +b.dataset.t, k = pieceAt(t, e.clientY);
    if (k < 0 || state[t][k] !== 'c') return;
    var p = pieces[t][k];
    p.el.classList.add('is-hold');
    hold = { t: t, k: k, p: p, id: setTimeout(function () {
      p.el.classList.remove('is-hold'); hold = null; skipClick = true;
      if (canClimb(state, t, k)) { sel = -1; doMove({ type: 'climb', t: t, k: k }); }
      else { no(t); setTip(T.climbTop); }
    }, 380) };
  });
  function endHold() { if (hold) { clearTimeout(hold.id); hold.p.el.classList.remove('is-hold'); hold = null; } }
  board.addEventListener('pointerup', endHold);
  board.addEventListener('pointercancel', endHold);
  board.addEventListener('pointerleave', endHold);
  board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  board.addEventListener('keydown', function (e) { // 키보드: 튜브에서 A 키 = 그 튜브 다람쥐의 능력
    var b = e.target.closest('.tube'); if (!b || busy) return;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ㅁ') {
      var t = +b.dataset.t, k = state[t].indexOf('c');
      if (k >= 0 && canClimb(state, t, k)) doMove({ type: 'climb', t: t, k: k }); else no(t);
    }
  });
  undoBtn.addEventListener('click', function () {
    if (busy || !history.length) return;
    var h = history.pop(); state = h.state; moves = h.moves; sel = -1;
    build(); saved = 0;
    // 되돌린 뒤에도 이미 구한 병아리는 둥지에 앉아 있게
    for (var i = 0; i < h.saved; i++) nest.children[i].dataset.full = '1';
    saved = h.saved;
    setCount(); setTip(T.go); undoBtn.disabled = !history.length;
  });
  restartBtn.addEventListener('click', function () { if (!busy) start(lv); });
  hintBtn.addEventListener('click', function () {
    if (busy) return;
    sel = -1; layout(); clearHint();
    var m = solve(state);
    if (!m) { setTip(T.stuck); return; }
    if (m.type === 'pour') {
      tubesEl[m.t].classList.add('is-hint'); tubesEl[m.t].dataset.hint = T.hintFrom;
      tubesEl[m.to].classList.add('is-hint'); tubesEl[m.to].dataset.hint = T.hintTo;
      setTip(T.hintPour);
    }
    else { pieces[m.t][m.k].el.classList.add('is-hintpc'); setTip(T.hintClimb); }
  });
  doneEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]'); if (!b) return;
    if (b.dataset.go === 'next') start(lv + 1);
    else if (b.dataset.go === 'again') start(0);
    else { start(lv < LEVELS.length - 1 ? lv + 1 : 0); document.getElementById('real').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
  });
  doneEl.addEventListener('keydown', function (e) { // Esc: 창을 닫고 다음 판을 준비
    if (e.key === 'Escape') start(lv < LEVELS.length - 1 ? lv + 1 : 0);
  });
  var rt;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (!busy) { measure(); layer.querySelectorAll('.pc').forEach(function (e) { e.style.transition = 'none'; }); layout(); layer.offsetWidth; layer.querySelectorAll('.pc').forEach(function (e) { e.style.transition = ''; }); } }, 120); });

  start(0);
  root.classList.add('is-ready');
})();
