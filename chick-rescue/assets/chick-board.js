/* 병아리 구조대 판 엔진(ChickBoard) — 게임의 규칙·손맛을 웹으로 옮긴 것(2026-10-17).
   한 페이지에 판을 여러 개 띄울 수 있다('열두 친구' 카드마다 작은 판). 외부 라이브러리 없음.
   출처(게임 저장소 games/sort-puzzle/):
     규칙    scripts/core/sort_rules.gd     붓기 + 능력 12가지(다람쥐 등반·개구리 점프·해달 맞바꾸기·박쥐 뒤집기·문어 끌어오기·거북이 잠수·
                                            펭귄 미끄럼·두더지 파고들기·부엉이 돌리기·코끼리 물 뿜기·사자 자리 바꾸기·고래 파도), 병아리 구출
     움직임  scripts/game/board_view.gd     _travel, _animate_*(능력마다), _on_land, _squash, _jump, _shake, _celebrate_tube, celebrate_win,
                                            꾹 누르기 게이지, 개구리·사자 튜브 고르기, 손가락 안내(_draw_coach·_draw_hand)
     이펙트  scripts/fx/fx_layer.gd, fx_packs.gd(기본 팩)    소리 scripts/fx/sfx.gd(합성)    진동 Sfx.haptic → navigator.vibrate
   수치 변환: 게임은 1080px 폭 기준이다. 생물 칸 높이 d에 붙은 값은 d 배수 그대로, 절대 px 값은 S = d / 165를 곱했다. 시간·확률·개수는 그대로.
   쓰는 법: var b = ChickBoard.create(요소, { tubes: ['bcAA', 'B'], coach: {...}, onWin: fn, onStuck: fn }); b.reset(); b.destroy();
   그림: 능력 친구는 /img/c-<영어 이름>.webp, 병아리는 /img/c-chick.webp(사이트에 이미 있는 파일), 색 친구(A~F)는 코드 SVG. */
(function (global) {
  'use strict';
  if (global.ChickBoard) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PI = Math.PI, TAU = PI * 2, CAP = 4;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(c) { return '#' + c.map(function (v) { return ('0' + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2); }).join(''); }
  function lighten(h, a) { return hex(rgb(h).map(function (v) { return v + (255 - v) * a; })); }
  function darken(h, a) { return hex(rgb(h).map(function (v) { return v * (1 - a); })); }
  function luminance(h) { var c = rgb(h); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }
  function rgba(h, a) { var c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  /* Godot Tween 곡선(scene/animation/easing_equations.h). set_ease를 안 쓰면 IN_OUT이 기본이다. */
  var E = {
    linear: function (u) { return u; },
    quadIn: function (u) { return u * u; },
    quadOut: function (u) { return -u * (u - 2); },
    quadInOut: function (u) { var v = u * 2; return v < 1 ? 0.5 * v * v : -0.5 * ((v - 1) * (v - 3) - 1); },
    sineInOut: function (u) { return -0.5 * (Math.cos(PI * u) - 1); },
    backOut: function (u) { var s = 1.70158; u -= 1; return u * u * ((s + 1) * u + s) + 1; },
    backInOut: function (u) {
      var s = 1.70158 * 1.525, t = u * 2;
      if (t < 1) return 0.5 * (t * t * ((s + 1) * t - s));
      t -= 2; return 0.5 * (t * t * ((s + 1) * t + s) + 2);
    },
    elasticOut: function (u) {
      if (u <= 0) return 0;
      if (u >= 1) return 1;
      var p = 0.3, s = p / 4;
      return Math.pow(2, -10 * u) * Math.sin((u - s) * TAU / p) + 1;
    },
    bounceOut: function (u) {
      if (u < 1 / 2.75) return 7.5625 * u * u;
      if (u < 2 / 2.75) { u -= 1.5 / 2.75; return 7.5625 * u * u + 0.75; }
      if (u < 2.5 / 2.75) { u -= 2.25 / 2.75; return 7.5625 * u * u + 0.9375; }
      u -= 2.625 / 2.75; return 7.5625 * u * u + 0.984375;
    }
  };

  /* ── 규칙(sort_rules.gd). 상태는 튜브마다 글자열(앞이 바닥), 이동은 [종류, a, b, c] ── */
  var POUR = 0, DIVE = 1, CLIMB = 2, JUMP = 3, FLIP = 4, SLIDE = 5, PULL = 6, BURROW = 7, ROTATE = 8, TRADE = 9, SWAP = 10, SPRAY = 11, WAVE = 12;
  var ABILITY = 'schfpomwtlek', ORDERED = 'pomek', BABY = 'b';
  function top(t) { return t ? t[t.length - 1] : ''; }
  function topRun(t) { var n = t.length, j = n - 2; if (!n) return 0; while (j >= 0 && t[j] === t[n - 1]) j--; return n - 1 - j; }
  function uniform(t) { for (var i = 1; i < t.length; i++) if (t[i] !== t[0]) return false; return true; }
  function sealed(t) { return t.length === CAP && uniform(t); }
  function hasBaby(s) { return s.join('').indexOf(BABY) >= 0; }
  function hasAbility(ch) { return ch.length === 1 && ABILITY.indexOf(ch) >= 0; }
  function at(t, k) { return k >= 0 && k < t.length ? t[k] : ''; }
  function rev(t) { return t.split('').reverse().join(''); }
  function rot(t) { return t.length >= 2 ? t[t.length - 1] + t.slice(0, -1) : t; }
  function dive(t, k) { return t[k] + t.slice(0, k) + t.slice(k + 1); }
  function climb(t, k) { return t.slice(0, k) + t.slice(k + 1) + t[k]; }
  function slideTarget(t, n) { return (t + 1) % n; }
  function pullSource(t, n) { return (t - 1 + n) % n; }
  function canPour(s, a, b) {
    if (a === b || b < 0 || b >= s.length) return false;
    var A = s[a], B = s[b];
    if (!A || sealed(A) || B.length >= CAP) return false;
    return !B || top(A) === top(B);
  }
  function openTubes(s) { var o = []; for (var t = 0; t < s.length; t++) if (!sealed(s[t])) o.push(t); return o; }
  function wave(s) {
    var open = openTubes(s), n = s.slice();
    if (open.length < 2) return n;
    open.forEach(function (t) { if (s[t]) n[t] = n[t].slice(0, -1); });
    open.forEach(function (from, i) { if (s[from]) { var to = open[(i + 1) % open.length]; n[to] = n[to] + top(s[from]); } });
    return n;
  }
  function waveMoves(s) {
    var open = openTubes(s), out = [];
    if (open.length < 2) return out;
    open.forEach(function (from, i) { if (s[from]) out.push([from, open[(i + 1) % open.length]]); });
    return out;
  }
  function isLegal(s, m) {
    var x = m[0], y = m[1], z = m[2], w = m[3], n = s.length;
    if (y < 0 || y >= n) return false;
    var tube = s[y];
    if (x !== POUR && sealed(tube)) return false;
    switch (x) {
      case POUR: return canPour(s, y, z);
      case DIVE: return at(tube, z) === 's' && z > 0 && dive(tube, z) !== tube;
      case CLIMB: return at(tube, z) === 'c' && z < tube.length - 1 && climb(tube, z) !== tube;
      case JUMP:
        if (at(tube, z) !== 'h' || w === y || w < 0 || w >= n) return false;
        return s[w].length < CAP && (!s[w] || top(s[w]) === 'h');
      case FLIP: return tube.indexOf('f') >= 0 && tube.length >= 2 && rev(tube) !== tube;
      case SLIDE: return top(tube) === 'p' && n > 1 && s[slideTarget(y, n)].length < CAP;
      case PULL:
        var src = s[pullSource(y, n)];
        return top(tube) === 'o' && n > 1 && tube.length < CAP && !!src && !sealed(src);
      case BURROW: return top(tube) === 'm' && n > 1 && s[slideTarget(y, n)].length < CAP;
      case ROTATE: return tube.indexOf('w') >= 0 && tube.length >= 2 && rot(tube) !== tube;
      case TRADE: return at(tube, z) === 't' && z > 0 && tube[z - 1] !== 't';
      case SWAP:
        if (w === y || w < 0 || w >= n || z !== tube.length - 1 || top(tube) !== 'l') return false;
        return !!s[w] && !sealed(s[w]) && top(s[w]) !== 'l';
      case SPRAY:
        if (top(tube) !== 'e' || n < 3) return false;
        var hit = s[(y + 1) % n], dst = s[(y + 2) % n];
        return !!hit && !sealed(hit) && dst.length < CAP;
      case WAVE: return tube.indexOf('k') >= 0 && wave(s).join('|') !== s.join('|');
    }
    return false;
  }
  // 생물(t, k)을 꾹 눌렀을 때 쓸 능력. 개구리·사자는 받을 튜브를 아직 몰라 c = -1(화면이 고르게 한다). 쓸 수 없으면 null.
  function abilityAt(s, t, k) {
    var tube = s[t];
    if (k < 0 || k >= tube.length || sealed(tube)) return null;
    var ch = tube[k], m = null;
    switch (ch) {
      case 's': m = [DIVE, t, k, 0]; break;
      case 'c': m = [CLIMB, t, k, 0]; break;
      case 'f': m = [FLIP, t, 0, 0]; break;
      case 'h': return [JUMP, t, k, -1];
      case 'p': m = [SLIDE, t, 0, 0]; break;
      case 'o': m = [PULL, t, 0, 0]; break;
      case 'm': m = [BURROW, t, 0, 0]; break;
      case 'w': m = [ROTATE, t, 0, 0]; break;
      case 't': m = [TRADE, t, k, 0]; break;
      case 'e': m = [SPRAY, t, 0, 0]; break;
      case 'k': m = [WAVE, t, 0, 0]; break;
      case 'l':
        if (k === tube.length - 1) for (var w = 0; w < s.length; w++) if (isLegal(s, [SWAP, t, k, w])) return [SWAP, t, k, -1];
        return null;
    }
    return m && isLegal(s, m) ? m : null;
  }
  function legalMoves(s) {
    var out = [], n = s.length, i, j, t, k;
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) if (canPour(s, i, j)) out.push([POUR, i, j, 0]);
    var waveAdded = false;
    for (t = 0; t < n; t++) {
      var tube = s[t];
      if (sealed(tube)) continue;
      var flipAdded = false;
      for (k = 0; k < tube.length; k++) {
        var ch = tube[k];
        if (ch === 's' || ch === 'c' || ch === 't') { var m = abilityAt(s, t, k); if (m) out.push(m); }
        else if (ch === 'f' && !flipAdded && isLegal(s, [FLIP, t, 0, 0])) { out.push([FLIP, t, 0, 0]); flipAdded = true; }
        else if (ch === 'h') for (j = 0; j < n; j++) if (isLegal(s, [JUMP, t, k, j])) out.push([JUMP, t, k, j]);
      }
      [SLIDE, PULL, BURROW, ROTATE, SPRAY].forEach(function (x) { if (isLegal(s, [x, t, 0, 0])) out.push([x, t, 0, 0]); });
      if (top(tube) === 'l') for (j = 0; j < n; j++) if (isLegal(s, [SWAP, t, tube.length - 1, j])) out.push([SWAP, t, tube.length - 1, j]);
      if (!waveAdded && isLegal(s, [WAVE, t, 0, 0])) { out.push([WAVE, t, 0, 0]); waveAdded = true; }
    }
    return out;
  }
  // 이동을 적용한 새 상태와 화면용 사건 목록(apply_move)
  function applyMove(s, m) {
    var n = s.slice(), ev = [], x = m[0], y = m[1], z = m[2], w = m[3], tube = s[y], N = s.length, to, from;
    switch (x) {
      case POUR:
        var c = Math.min(topRun(tube), CAP - s[z].length);
        n[y] = tube.slice(0, tube.length - c); n[z] = s[z] + new Array(c + 1).join(top(tube));
        ev.push({ type: 'pour', from: y, to: z, count: c }); break;
      case DIVE: n[y] = dive(tube, z); ev.push({ type: 'dive', tube: y, from: z }); break;
      case CLIMB: n[y] = climb(tube, z); ev.push({ type: 'climb', tube: y, from: z }); break;
      case JUMP: n[y] = tube.slice(0, z) + tube.slice(z + 1); n[w] = s[w] + 'h'; ev.push({ type: 'jump', from: y, pos: z, to: w }); break;
      case FLIP: n[y] = rev(tube); ev.push({ type: 'flip', tube: y }); break;
      case SLIDE: to = slideTarget(y, N); n[y] = tube.slice(0, -1); n[to] = s[to] + 'p'; ev.push({ type: 'slide', from: y, to: to }); break;
      case PULL: from = pullSource(y, N); n[from] = s[from].slice(0, -1); n[y] = tube + top(s[from]); ev.push({ type: 'pull', from: from, to: y }); break;
      case BURROW: to = slideTarget(y, N); n[y] = tube.slice(0, -1); n[to] = 'm' + s[to]; ev.push({ type: 'burrow', from: y, to: to }); break;
      case ROTATE: n[y] = rot(tube); ev.push({ type: 'rotate', tube: y }); break;
      case TRADE: n[y] = tube.slice(0, z - 1) + tube[z] + tube[z - 1] + tube.slice(z + 1); ev.push({ type: 'trade', tube: y, pos: z }); break;
      case SWAP: n[y] = tube.slice(0, -1) + top(s[w]); n[w] = s[w].slice(0, -1) + 'l'; ev.push({ type: 'swap', from: y, to: w }); break;
      case SPRAY:
        var hit = (y + 1) % N; to = (y + 2) % N;
        n[hit] = s[hit].slice(0, -1); n[to] = s[to] + top(s[hit]); ev.push({ type: 'spray', from: y, hit: hit, to: to }); break;
      case WAVE: ev.push({ type: 'wave', tube: y, moves: waveMoves(s) }); n = wave(s); break;
    }
    // 맨 위에 드러난 병아리는 둥지로 간다(붙어 있으면 함께)
    for (var t = 0; t < n.length; t++) {
      var cnt = 0;
      while (cnt < n[t].length && n[t][n[t].length - 1 - cnt] === BABY) cnt++;
      if (cnt) { n[t] = n[t].slice(0, n[t].length - cnt); ev.push({ type: 'rescue', tube: t, count: cnt }); }
    }
    return { state: n, events: ev };
  }
  function stateKey(s) {
    var j = s.join('|');
    for (var i = 0; i < ORDERED.length; i++) if (j.indexOf(ORDERED[i]) >= 0) return j;
    return s.slice().sort().join('|');
  }
  // 아직 풀 수 있는지(작은 판이라 끝까지 찾는다). 너무 크면 풀 수 있다고 본다.
  function solvable(s) {
    if (!hasBaby(s)) return true;
    var seen = {}, q = [s]; seen[stateKey(s)] = 1;
    for (var i = 0; i < q.length && i < 20000; i++) {
      var ms = legalMoves(q[i]);
      for (var j = 0; j < ms.length; j++) {
        var nx = applyMove(q[i], ms[j]).state;
        if (!hasBaby(nx)) return true;
        var k = stateKey(nx);
        if (!seen[k]) { seen[k] = 1; q.push(nx); }
      }
    }
    return q.length >= 20000;
  }

  // 가장 짧은 풀이의 첫 수(손가락 안내용). 같은 길이면 능력을 먼저 쓰는 풀이를 고른다. 못 찾으면 null.
  function nextMove(s) {
    if (!hasBaby(s)) return null;
    var layer = [[s, null]], seen = {}; seen[stateKey(s)] = 1;
    for (var depth = 0; depth < 8 && layer.length; depth++) {
      var next = [], found = null;
      for (var i = 0; i < layer.length; i++) {
        var ms = legalMoves(layer[i][0]);
        for (var j = 0; j < ms.length; j++) {
          var nx = applyMove(layer[i][0], ms[j]).state, first = layer[i][1] || ms[j];
          if (!hasBaby(nx)) { if (!found || (found[0] === POUR && first[0] !== POUR)) found = first; continue; }
          var k = stateKey(nx);
          if (!seen[k]) { seen[k] = 1; next.push([nx, first]); }
        }
      }
      if (found) return found;
      if (next.length > 20000) return null;
      layer = next;
    }
    return null;
  }
  // 수 → 손가락 안내(능력은 그 친구를 꾹, 붓기는 출발 → 도착 튜브)
  function coachFor(s, m) {
    if (!m) return null;
    var tube = s[m[1]];
    switch (m[0]) {
      case POUR: return { kind: 'tap', from: m[1], to: m[2] };
      case DIVE: case CLIMB: case TRADE: case JUMP: case SWAP: return { kind: 'hold', t: m[1], k: m[2] };
      case FLIP: return { kind: 'hold', t: m[1], k: tube.indexOf('f') };
      case ROTATE: return { kind: 'hold', t: m[1], k: tube.indexOf('w') };
      case WAVE: return { kind: 'hold', t: m[1], k: tube.indexOf('k') };
    }
    return { kind: 'hold', t: m[1], k: tube.length - 1 }; // 펭귄·문어·두더지·코끼리는 맨 위에서
  }

  /* ── 생물 그림(critter.gd) ── */
  var COLOR = { A: '#E5484D', B: '#3E8BFF', C: '#F5C400', D: '#FF8A1F', E: '#F45FB0', F: '#19C2D6', b: '#FFE066',
    s: '#1FAE8C', c: '#B07A4A', h: '#9CD541', f: '#8C82BE', p: '#3D4C74', o: '#8E44AD', m: '#4A4E5A', w: '#EDE6D6', t: '#7E5C45', l: '#E8A33C', e: '#9FB4C7', k: '#3B6EA5' };
  var NAMES = { s: 'turtle', c: 'squirrel', h: 'frog', f: 'bat', p: 'penguin', o: 'octopus', m: 'mole', w: 'owl', t: 'otter', l: 'lion', e: 'elephant', k: 'whale', b: 'chick' };
  var CALM = 'ABCDEF';
  function pts(list) { return list.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' '); }
  function regular(n, r, cx, cy, start) { var o = []; for (var i = 0; i < n; i++) { var a = start + TAU * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
  function starPts(outer, inner, cx, cy) { var o = []; for (var i = 0; i < 10; i++) { var r = i % 2 ? inner : outer, a = -PI / 2 + PI * i / 5; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
  function face(kind) {
    if (NAMES[kind]) return '<img src="/img/c-' + NAMES[kind] + '.webp" alt="" draggable="false">';
    var base = COLOR[kind], r = 50, k = CALM.indexOf(kind), br = r * 0.2, by = r * 0.45;
    var ink = luminance(base) > 0.6 ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.75)';
    var belly = k === 0 ? '<circle cy="' + by + '" r="' + br * 0.8 + '" fill="none" stroke="' + ink + '" stroke-width="' + br * 0.35 + '"/>'
      : k === 1 ? '<rect x="' + -br * 0.75 + '" y="' + (by - br * 0.75) + '" width="' + br * 1.5 + '" height="' + br * 1.5 + '" fill="' + ink + '"/>'
      : '<polygon fill="' + ink + '" points="' + pts(k === 2 ? regular(3, br * 1.05, 0, by, -PI / 2) : k === 3 ? regular(4, br, 0, by, -PI / 2)
        : k === 4 ? starPts(br * 1.1, br * 0.48, 0, by) : regular(6, br * 0.95, 0, by, 0)) + '"/>';
    var eyes = '', es = r * 0.19;
    [-1, 1].forEach(function (sd) {
      var x = 0.32 * sd * r, y = -r * 0.18;
      eyes += '<circle cx="' + x + '" cy="' + y + '" r="' + es + '" fill="#fff"/><circle cx="' + x + '" cy="' + (y + es * 0.15) + '" r="' + es * 0.52 + '" fill="#1D1D2B"/>';
    });
    return '<svg viewBox="-50 -50 100 100" aria-hidden="true" style="overflow:visible">' +
      '<circle r="' + r + '" fill="' + darken(base, 0.25) + '"/><circle cy="' + -r * 0.06 + '" r="' + r * 0.92 + '" fill="' + base + '"/>' +
      '<circle cx="' + -r * 0.34 + '" cy="' + -r * 0.42 + '" r="' + r * 0.18 + '" fill="#fff" fill-opacity=".25"/>' + belly + eyes + '</svg>';
  }

  /* ── 소리(sfx.gd 합성 → WebAudio) ── */
  var RATE = 22050, actx = null, master = null, buffers = {}, soundOn = true, hapticsOn = true, seed = 7;
  try { soundOn = localStorage.getItem('cr-demo-sound') !== '0'; hapticsOn = localStorage.getItem('cr-demo-haptics') !== '0'; } catch (e) {}
  function rng() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function tone(dur, f0, f1, wv, decay, noise, vibrato, gain) {
    noise = noise || 0; vibrato = vibrato || 0; gain = gain == null ? 0.6 : gain;
    var n = Math.floor(dur * RATE), out = new Float32Array(n), ph = 0;
    for (var i = 0; i < n; i++) {
      var t = i / RATE, u = i / n, f = f0 * Math.pow(f1 / f0, u) * (1 + vibrato * Math.sin(TAU * 11 * t));
      ph = (ph + TAU * f / RATE) % TAU;
      var s = wv === 'square' ? (ph < PI ? 1 : -1) : wv === 'triangle' ? 2 * Math.abs(ph / PI - 1) - 1 : Math.sin(ph);
      if (noise > 0) s += (rng() * 2 - 1) * noise;
      out[i] = s * Math.min(1, t / 0.004) * Math.pow(1 - u, decay) * gain;
    }
    return out;
  }
  function noiseSweep(dur) { var n = Math.floor(dur * RATE), o = new Float32Array(n), low = 0; for (var i = 0; i < n; i++) { var u = i / n, c = 0.05 + 0.3 * Math.sin(PI * u); low += (rng() * 2 - 1 - low) * c; o[i] = low * Math.sin(PI * u) * 0.9; } return o; }
  function noiseBurst(dur, smooth) { var n = Math.floor(dur * RATE), o = new Float32Array(n), low = 0; for (var i = 0; i < n; i++) { var u = i / n; low += (rng() * 2 - 1 - low) * smooth; o[i] = low * Math.min(1, u / 0.02) * Math.pow(1 - u, 2.5) * 0.9; } return o; }
  function chirp() { var n = Math.floor(0.26 * RATE), o = new Float32Array(n), ph = 0; for (var i = 0; i < n; i++) { var t = i / RATE, l = (t % 0.13) / 0.13, f = 2600 + 1400 * Math.sin(PI * l) - 900 * l; ph = (ph + TAU * f / RATE) % TAU; o[i] = Math.sin(ph) * Math.min(1, l / 0.05) * Math.pow(1 - l, 2) * 0.45; } return o; }
  function twoNotes(f0, f1, each) { var n = Math.floor(each * 2 * RATE), o = new Float32Array(n), ph = 0; for (var i = 0; i < n; i++) { var t = i / RATE, l = (t % each) / each, f = t < each ? f0 : f1; ph = (ph + TAU * f / RATE) % TAU; o[i] = Math.sin(ph) * Math.min(1, l / 0.15) * Math.pow(1 - l, 1.5) * 0.5; } return o; }
  function bell(ratios, step, length) {
    var n = Math.floor((step * (ratios.length - 1) + length) * RATE), o = new Float32Array(n);
    ratios.forEach(function (r, k) {
      var st = Math.floor(step * k * RATE), f = 784 * r, end = Math.min(n, st + Math.floor(length * RATE));
      for (var i = st; i < end; i++) { var t = (i - st) / RATE, env = Math.min(1, t / 0.003) * Math.exp(-t * 5); o[i] += (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2 * t) + 0.12 * Math.sin(TAU * f * 3 * t)) * env * 0.32; }
    });
    return o;
  }
  function buildSounds() {
    var raw = {
      select: tone(0.07, 520, 860, 'sine', 3), land: tone(0.08, 620, 300, 'triangle', 3.5, 0.04), pop: tone(0.1, 900, 380, 'sine', 3, 0.06),
      buzz: tone(0.18, 150, 120, 'square', 1.5, 0, 0, 0.35), boing: tone(0.3, 240, 720, 'sine', 1.4, 0, 0.05), blub: tone(0.18, 260, 120, 'sine', 2, 0, 0.18),
      squeak: tone(0.09, 1500, 2400, 'sine', 2), whoosh: noiseSweep(0.38), tick: tone(0.035, 1900, 1500, 'square', 6, 0, 0, 0.25),
      chime: bell([1.0], 0, 0.7), fanfare: bell([1.0, 1.25, 1.5, 2.0], 0.11, 0.9), tweet: chirp(), hoot: twoNotes(420, 340, 0.16),
      roar: tone(0.45, 220, 90, 'square', 1.2, 0.45, 0.08, 0.4), trumpet: tone(0.32, 330, 520, 'square', 1.0, 0, 0.04, 0.35),
      splash: noiseBurst(0.4, 0.5), dig: noiseBurst(0.22, 0.12)
    };
    Object.keys(raw).forEach(function (k) { var d = raw[k], b = actx.createBuffer(1, d.length, RATE), c = b.getChannelData(0); for (var i = 0; i < d.length; i++) c[i] = clamp(d[i], -1, 1); buffers[k] = b; });
  }
  function unlockAudio() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC || !soundOn) return;
    try { actx = new AC(); } catch (e) { return; }
    master = actx.createGain(); master.gain.value = 0.9; master.connect(actx.destination);
    buildSounds();
  }
  function play(name, pitch, db) {
    if (!soundOn || !actx || !buffers[name]) return;
    var src = actx.createBufferSource(), g = actx.createGain();
    src.buffer = buffers[name]; src.playbackRate.value = pitch || 1; g.gain.value = Math.pow(10, (db || 0) / 20);
    src.connect(g); g.connect(master); src.start();
  }
  var PENTATONIC = [1.0, 1.125, 1.25, 1.5, 1.667, 2.0, 2.25, 2.5];
  function haptic(ms) { if (hapticsOn && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

  /* ── 트윈(Godot Tween처럼 시작할 때 값을 잡고, 같은 key의 새 트윈이 오면 옛것은 멈춘다) ── */
  var tweens = [], clock = 0;
  function tween(dur, ease, fn, delay, key) {
    return new Promise(function (resolve) {
      if (key) tweens.forEach(function (w) { if (w.key === key && !w.done) { w.done = true; w.resolve(); } });
      if (reduce) { dur = 0.001; delay = 0; }
      tweens.push({ start: clock + (delay || 0), dur: Math.max(0.001, dur), ease: ease, fn: fn, resolve: resolve, key: key, done: false });
      wake();
    });
  }
  function prop(obj, to, dur, ease, delay, key) {
    var from = null;
    return tween(dur, ease, function (v) {
      if (!from) { from = {}; for (var k in to) from[k] = obj[k]; }
      for (var k2 in to) obj[k2] = from[k2] + (to[k2] - from[k2]) * v;
    }, delay, key);
  }
  function wait(sec) { return tween(sec, E.linear, function () {}); }

  /* ── 이펙트 캔버스(fx_layer.gd). 화면 전체를 덮고 누르기는 통과. 파티클은 문서 좌표 ── */
  var SH = { DOT: 0, STAR: 1, CONFETTI: 2, BUBBLE: 3, LEAF: 4, DROP: 5, SPARK: 6, HEART: 7 };
  var fxc = null, ctx = null, dpr = 1, fxW = 0, fxH = 0, parts = [], rings = [], texts = [], drewFx = false;
  function ensureFx() {
    if (fxc) return;
    fxc = document.createElement('canvas');
    fxc.setAttribute('aria-hidden', 'true');
    fxc.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:60';
    document.body.appendChild(fxc);
    ctx = fxc.getContext('2d');
  }
  function sizeFx() { dpr = Math.min(2, devicePixelRatio || 1); fxW = fxc.clientWidth; fxH = fxc.clientHeight; fxc.width = Math.round(fxW * dpr); fxc.height = Math.round(fxH * dpr); }
  function burst(pos, color, count, speed, shape, size, gravity, life, spread, dir) {
    if (reduce) return;
    spread = spread == null ? TAU : spread; dir = dir == null ? -PI / 2 : dir;
    for (var i = 0; i < count; i++) {
      var a = dir + rnd(-spread / 2, spread / 2), v = speed * rnd(0.35, 1), ml = life * rnd(0.7, 1.25);
      parts.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: ml, max: ml, size: size * rnd(0.6, 1.3), color: lighten(color, rnd(0, 0.3)), shape: shape, rot: Math.random() * TAU, spin: rnd(-9, 9), g: gravity });
    }
    wake();
  }
  function ring(pos, color, radius, life, width) { if (!reduce) { rings.push({ x: pos.x, y: pos.y, r: radius, life: life, max: life, color: color, w: width }); wake(); } }
  function floatText(pos, text, color, size, rise, life) { if (!reduce) { texts.push({ x: pos.x, y: pos.y, text: text, color: color, size: size, rise: rise, life: life || 1, age: 0 }); wake(); } }
  var fontFamily = 'sans-serif';
  function drawParticle(p) {
    var t = p.life / p.max, s = p.size * (0.4 + 0.6 * t), i;
    ctx.globalAlpha = clamp(t * 1.6, 0, 1); ctx.fillStyle = ctx.strokeStyle = p.color;
    switch (p.shape) {
      case SH.DOT: ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.5, 0, TAU); ctx.fill(); break;
      case SH.STAR: ctx.beginPath(); for (i = 0; i < 10; i++) { var rr = (i % 2 ? s * 0.45 : s) * 0.5, a = p.rot + PI * i / 5; ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); } ctx.fill(); break;
      case SH.CONFETTI: ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(p.rot * 1.7)) * 0.8 + 0.2); ctx.fillRect(-s * 0.5, -s * 0.3, s, s * 0.6); ctx.restore(); break;
      case SH.BUBBLE: ctx.lineWidth = Math.max(1, s * 0.12); ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.5, 0, TAU); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x - s * 0.15, p.y - s * 0.15, s * 0.1, 0, TAU); ctx.fill(); break;
      case SH.LEAF: ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.5); ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.fill(); ctx.restore(); break;
      case SH.DROP:
        var len = Math.hypot(p.vx, p.vy), dx = len > 1 ? p.vx / len : 0, dy = len > 1 ? p.vy / len : 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(p.x + dy * s * 0.38, p.y - dx * s * 0.38); ctx.lineTo(p.x - dy * s * 0.38, p.y + dx * s * 0.38); ctx.lineTo(p.x - dx * s * 0.9, p.y - dy * s * 0.9); ctx.fill(); break;
      case SH.SPARK: ctx.lineWidth = Math.max(1, s * 0.25); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke(); break;
      case SH.HEART:
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.rot) * 0.3);
        ctx.beginPath(); ctx.arc(-s * 0.22, -s * 0.1, s * 0.27, 0, TAU); ctx.arc(s * 0.22, -s * 0.1, s * 0.27, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-s * 0.47, 0); ctx.lineTo(s * 0.47, 0); ctx.lineTo(0, s * 0.5); ctx.fill(); ctx.restore(); break;
    }
  }
  // 손가락(_draw_hand): 검지 끝이 at을 가리키는 흰 손
  function drawHand(at, alpha, d) {
    var s = d * 0.55, white = 'rgba(255,255,255,' + 0.95 * alpha + ')', ink = 'rgba(38,43,64,' + 0.8 * alpha + ')', tip = { x: at.x + s * 0.05, y: at.y + s * 0.1 };
    function circ(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    circ(tip.x, tip.y + s * 0.25, s * 0.2, ink); ctx.fillStyle = ink; ctx.fillRect(tip.x - s * 0.2, tip.y + s * 0.25, s * 0.4, s * 0.6); circ(tip.x + s * 0.15, tip.y + s * 1.05, s * 0.5, ink);
    circ(tip.x, tip.y + s * 0.25, s * 0.16, white); ctx.fillStyle = white; ctx.fillRect(tip.x - s * 0.16, tip.y + s * 0.25, s * 0.32, s * 0.6); circ(tip.x + s * 0.15, tip.y + s * 1.05, s * 0.46, white);
    for (var k = 0; k < 3; k++) circ(tip.x + s * (0.3 + k * 0.17), tip.y + s * (0.62 + k * 0.05), s * 0.14, white);
  }
  function arc(x, y, r, a0, a1, color, width) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke(); }
  function drawFx(dt) {
    if (!fxc) return;
    if (fxc.clientWidth !== fxW || fxc.clientHeight !== fxH) sizeFx();
    var overlays = boards.some(function (b) { return b.wantsOverlay(); });
    var any = parts.length || rings.length || texts.length || overlays;
    if (!any && !drewFx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, fxc.width, fxc.height);
    drewFx = !!any;
    if (!any) return;
    ctx.setTransform(dpr, 0, 0, dpr, -scrollX * dpr, -scrollY * dpr);
    var keep = [];
    rings.forEach(function (r) {
      r.life -= dt; if (r.life <= 0) return; keep.push(r);
      var u = 1 - r.life / r.max;
      ctx.globalAlpha = 1 - u; arc(r.x, r.y, r.r * (1 - Math.pow(1 - u, 2.5)), 0, TAU, r.color, r.w * (1 - u * 0.6));
    });
    rings = keep; keep = [];
    parts.forEach(function (p) {
      p.life -= dt; if (p.life <= 0) return; keep.push(p);
      var f = Math.max(0, 1 - 1.5 * dt);
      p.vx *= f; p.vy *= f; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      drawParticle(p);
    });
    parts = keep; keep = [];
    texts.forEach(function (x) {
      x.age += dt; if (x.age >= x.life) return; keep.push(x);
      var sc = 0.3 + 0.7 * E.backOut(Math.min(1, x.age / 0.22)), y = x.y - x.rise * E.quadOut(Math.min(1, x.age / x.life));
      ctx.globalAlpha = x.age < x.life * 0.6 ? 1 : 1 - (x.age - x.life * 0.6) / (x.life * 0.4);
      ctx.save(); ctx.translate(x.x, y); ctx.scale(sc, sc);
      ctx.font = '800 ' + x.size + 'px ' + fontFamily; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, x.size / 5); ctx.strokeStyle = 'rgba(13,15,31,.9)';
      ctx.strokeText(x.text, 0, 0); ctx.fillStyle = x.color; ctx.fillText(x.text, 0, 0); ctx.restore();
    });
    texts = keep;
    boards.forEach(function (b) { b.drawOverlay(dt); });
    ctx.globalAlpha = 1;
  }

  /* ── 프레임 ── */
  var raf = 0, last = 0, boards = [];
  function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    var active = tweens; tweens = [];
    for (var i = 0; i < active.length; i++) {
      var w = active[i];
      if (w.done) continue;
      var u = (clock - w.start) / w.dur;
      if (u < 0) { tweens.push(w); continue; }
      if (u >= 1) { w.done = true; w.fn(1); w.resolve(); continue; }
      w.fn(w.ease(u)); tweens.push(w);
    }
    var living = false;
    boards.forEach(function (b) { if (b.tick(dt)) living = true; });
    drawFx(dt);
    if (tweens.length || parts.length || rings.length || texts.length || drewFx || living) wake();
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });

  /* ── 엔진 CSS(한 번) ── */
  var cssDone = false;
  function ensureCss() {
    if (cssDone) return;
    cssDone = true;
    var st = document.createElement('style');
    st.textContent =
      '.cb{position:relative;width:100%;height:100%;overflow:hidden;touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}' +
      '.cb-tube{position:absolute;padding:0;border:0;cursor:pointer;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 2px rgba(255,255,255,.38);-webkit-tap-highlight-color:transparent;transform-origin:50% 50%}' +
      '.cb-tube::after{content:"";position:absolute;left:17%;top:7%;height:42%;width:6%;border-radius:9px;background:rgba(255,255,255,.12)}' +
      '.cb-tube.is-sel{background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 2.5px rgba(255,255,255,.8)}' +
      '.cb-tube:focus-visible{outline:2px solid #FFD166;outline-offset:2px}' +
      '.cb-lid{position:absolute;pointer-events:none;border-radius:3px}' +
      '.cb-pieces{position:absolute;inset:0;pointer-events:none}' +
      '.cb-pc{position:absolute;left:0;top:0;will-change:transform}' +
      '.cb-pc svg,.cb-pc img{display:block;width:100%;height:100%}';
    document.head.appendChild(st);
  }

  /* ── 판 하나 ── */
  var LANG = (document.documentElement.lang || 'ko').slice(0, 2);
  var FX_TEXT = { ko: '완성!', en: 'Done!', ja: '完成！' }[LANG] || '완성!';
  var AIM_COLOR = { h: '#9CD541', l: '#E8A33C' };

  function Board(host, opts) {
    var self = this;
    ensureCss(); ensureFx();
    fontFamily = getComputedStyle(host).fontFamily || fontFamily;
    this.host = host; this.opts = opts || {};
    this.el = document.createElement('div'); this.el.className = 'cb';
    this.layer = document.createElement('div'); this.layer.className = 'cb-pieces'; this.layer.setAttribute('aria-hidden', 'true');
    this.el.appendChild(this.layer);
    host.appendChild(this.el);
    this.live = []; this.pid = 0; this.hold = null; this.skipClick = false; this.aim = null; this.coachTime = 0; this.idle = 0; this.visible = true;
    this.shk = { time: 0, dur: 0, str: 0 };
    this._down = function (e) { self.onDown(e); };
    this._move = function (e) { if (self.hold && Math.hypot(e.clientX - self.hold.x, e.clientY - self.hold.y) > self.d * 0.45) self.hold = null; };
    this._up = function () { self.hold = null; };
    this._click = function (e) { self.onClick(e); };
    this._ctx = function (e) { e.preventDefault(); };
    this._key = function (e) { self.onKey(e); };
    this.el.addEventListener('pointerdown', unlockAudio, true);
    this.el.addEventListener('pointerdown', this._down);
    this.el.addEventListener('pointermove', this._move);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { self.el.addEventListener(ev, self._up); });
    this.el.addEventListener('click', this._click);
    this.el.addEventListener('contextmenu', this._ctx);
    this.el.addEventListener('keydown', this._key);
    if ('IntersectionObserver' in global) {
      this.io = new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; if (self.visible) wake(); });
      this.io.observe(this.el);
    }
    this._resize = function () { clearTimeout(self.rt); self.rt = setTimeout(function () { if (!self.busy) self.relayout(); }, 120); };
    addEventListener('resize', this._resize);
    boards.push(this);
    this.reset();
  }
  var B = Board.prototype;

  B.reset = function () {
    this.state = this.opts.tubes.slice(); this.sel = -1; this.busy = false; this.won = false; this.hold = null; this.moves = 0;
    this.cancelAim(true);
    this.coachTime = 0; this.idle = 0; this.coachOn = false; this.touched = false;
    this.coach = this.opts.coach === 'auto' ? null : (this.opts.coach || null);
    this.build();
  };
  B.destroy = function () {
    var self = this;
    this.live.forEach(function (p) { p.dead = true; });
    boards = boards.filter(function (b) { return b !== self; });
    if (this.io) this.io.disconnect();
    removeEventListener('resize', this._resize);
    this.el.remove();
  };
  B.measure = function () {
    var n = this.state.length, w = this.el.clientWidth || 200, h = this.el.clientHeight || 210;
    // board_view.gd _layout: 튜브 폭 1.3d, 간격 0.38d, 튜브 높이 d*(4+0.3), 위 여백 1.05d, 아래 0.2d
    var d = Math.min(w * 0.94 / (n * 1.3 + (n - 1) * 0.38), h * 0.96 / (1.05 + CAP + 0.3 + 0.2), this.opts.maxD || 70);
    this.d = d; this.S = d / 165;
    this.tw = d * 1.3; this.th = d * (CAP + 0.3); this.gap = d * 0.38; this.pw = d * 0.88;
    var total = n * this.tw + (n - 1) * this.gap;
    this.x0 = (w - total) / 2;
    this.y0 = (h - (1.05 + CAP + 0.3 + 0.2) * d) / 2 + 1.05 * d;
  };
  B.tubeLeft = function (t) { return this.x0 + t * (this.tw + this.gap); };
  B.slotPos = function (t, k) { return { x: this.tubeLeft(t) + (this.tw - this.pw) / 2, y: this.y0 + this.th - this.d * (0.15 + k + 0.5) - this.pw / 2 }; };
  B.abovePos = function (t) { return { x: this.tubeLeft(t) + (this.tw - this.pw) / 2, y: this.y0 - this.d * 0.6 - this.pw / 2 }; };
  B.restPos = function (t, k) {
    var p = this.slotPos(t, k), s = this.state[t];
    if (t === this.sel && !sealed(s) && k >= s.length - topRun(s)) p.y += this.abovePos(t).y - this.slotPos(t, s.length - 1).y;
    return p;
  };
  B.origin = function () { var r = this.el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY }; };
  B.centerOf = function (p) { var o = this.origin(); return { x: o.x + p.x + this.pw / 2, y: o.y + p.y + this.pw / 2 - p.bounce }; };
  B.posCenter = function (q) { var o = this.origin(); return { x: o.x + q.x + this.pw / 2, y: o.y + q.y + this.pw / 2 }; };
  B.tubeRect = function (t) { var o = this.origin(); return { left: o.x + this.tubeLeft(t), top: o.y + this.y0, width: this.tw, height: this.th }; };

  B.build = function () {
    var self = this;
    this.el.querySelectorAll('.cb-tube').forEach(function (b) { b.remove(); });
    this.live.forEach(function (p) { p.dead = true; p.el.remove(); });
    this.live = []; this.layer.innerHTML = ''; this.tubesEl = []; this.pieces = []; this.sealedSeen = {};
    this.measure();
    var names = this.opts.names || {};
    for (var t = 0; t < this.state.length; t++) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'cb-tube'; b.dataset.t = t;
      this.el.insertBefore(b, this.layer);
      this.tubesEl.push(b);
    }
    this.styleTubes();
    for (t = 0; t < this.state.length; t++) {
      var col = [];
      for (var i = 0; i < this.state[t].length; i++) col.push(this.newPiece(this.state[t][i], t, i));
      this.pieces.push(col);
      if (sealed(this.state[t])) { this.sealedSeen[t] = 1; this.addLid(t, false); }
    }
    this.completed = Object.keys(this.sealedSeen).length;
    this.refresh(names);
    wake();
  };
  B.styleTubes = function () {
    for (var t = 0; t < this.tubesEl.length; t++) {
      var s = this.tubesEl[t].style;
      s.left = this.tubeLeft(t) + 'px'; s.top = this.y0 + 'px'; s.width = this.tw + 'px'; s.height = this.th + 'px';
      s.borderRadius = this.d * 0.18 + 'px ' + this.d * 0.18 + 'px ' + this.tw / 2 + 'px ' + this.tw / 2 + 'px';
    }
  };
  B.relayout = function () {
    this.measure(); this.styleTubes();
    var self = this;
    this.el.querySelectorAll('.cb-lid').forEach(function (e) { e.remove(); });
    Object.keys(this.sealedSeen).forEach(function (t) { self.addLid(+t, false); });
    for (var t = 0; t < this.pieces.length; t++) for (var k = 0; k < this.pieces[t].length; k++) {
      var p = this.pieces[t][k], q = this.restPos(t, k); p.x = q.x; p.y = q.y; this.sizePiece(p);
    }
    wake();
  };
  B.refresh = function (names) {
    names = names || this.opts.names || {};
    var label = this.opts.tubeLabel || '튜브 {n}';
    for (var t = 0; t < this.tubesEl.length; t++) {
      var s = this.state[t], el = this.tubesEl[t];
      el.classList.toggle('is-sel', this.sel === t);
      var who = s ? s.split('').map(function (c) { return names[c] || c; }).join(', ') : (this.opts.emptyLabel || '비었어요');
      el.setAttribute('aria-label', label.replace('{n}', t + 1) + ' — ' + who);
    }
  };
  B.newPiece = function (kind, t, k) {
    var el = document.createElement('div');
    el.className = 'cb-pc'; el.innerHTML = face(kind);
    this.layer.appendChild(el);
    var q = this.restPos(t, k);
    var p = { id: ++this.pid, kind: kind, el: el, x: q.x, y: q.y, sx: 1, sy: 1, k: 1, rot: 0, bounce: 0, glow: 0, phase: Math.random() * TAU, tf: '', jumpId: 0 };
    this.sizePiece(p);
    this.live.push(p);
    this.drawPiece(p);
    return p;
  };
  B.sizePiece = function (p) { p.el.style.width = p.el.style.height = this.pw + 'px'; };
  B.drawPiece = function (p) {
    var sx = p.sx * p.k, sy = p.sy * p.k, r = p.rot;
    if (!reduce) {
      if (hasAbility(p.kind)) { var br = 0.04 * Math.sin(clock * 3.4 + p.phase); sx *= 1 + br; sy *= 1 - br; } // 능력 친구는 숨쉰다
      else if (p.kind === BABY) r += Math.sin(clock * 9 + p.phase) * 0.07;                                 // 병아리는 바들바들
    }
    var tf = 'translate(' + p.x.toFixed(2) + 'px,' + (p.y - p.bounce).toFixed(2) + 'px)' + (r ? ' rotate(' + r.toFixed(4) + 'rad)' : '') +
      (sx !== 1 || sy !== 1 ? ' scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')' : '');
    if (tf !== p.tf) { p.el.style.transform = tf; p.tf = tf; }
    // 개구리·사자가 갈 곳을 고르는 동안 빛난다
    var f = p.glow ? 'drop-shadow(0 0 ' + (this.d * (0.12 + 0.06 * Math.sin(clock * 8))).toFixed(1) + 'px ' + lighten(COLOR[p.kind], 0.4) + ')' : '';
    if (f !== p.filter) { p.el.style.filter = f; p.filter = f; }
  };
  B.tick = function (dt) {
    var self = this;
    this.live = this.live.filter(function (p) { return !p.dead; });
    this.live.forEach(function (p) { self.drawPiece(p); });
    if (this.shk.time > 0) {
      this.shk.time -= dt;
      var pw = this.shk.str * Math.max(0, this.shk.time / this.shk.dur);
      this.el.style.translate = this.shk.time > 0 ? rnd(-1, 1) * pw + 'px ' + rnd(-1, 1) * pw + 'px' : '';
    }
    if (this.hold && !this.hold.fired) {
      this.hold.time += dt;
      if (this.hold.time >= 0.38) { var h = this.hold; this.hold = null; h.fired = true; this.skipClick = true; this.fireHold(h); }
    }
    // 손가락 안내: 처음 1.2초, 그 뒤로는 4초 동안 아무것도 안 하면 다시(opts.coach가 'auto'면 지금 판에서 다음 수를 찾아 보여 준다)
    if (this.opts.coach && !this.won && this.visible) {
      if (!this.busy && !this.hold && this.sel < 0) this.idle += dt; else this.idle = 0;
      var need = this.moves === 0 && !this.touched ? 1.2 : 4;
      if (!this.coachOn && this.idle >= need) {
        if (this.opts.coach === 'auto') {
          var nm = nextMove(this.state);
          this.coach = this.aim && nm && (nm[0] === JUMP || nm[0] === SWAP) && nm[1] === this.aim.t ? { kind: 'tap', from: this.aim.t, to: nm[3] } : coachFor(this.state, nm);
        }
        if (this.coach) { this.coachOn = true; this.coachTime = 0; } else this.idle = -1e9;
      }
      if (this.coachOn) this.coachTime += dt;
    }
    var shown = this.visible && !document.hidden;
    var breathing = shown && !reduce && this.live.length > 0;
    // 손가락 안내·개구리/사자 고르기의 빛남은 판이 보일 때만 프레임을 돌린다(화면 밖이면 멈추고, 다시 보이면 IntersectionObserver·visibilitychange가 깨운다)
    return breathing || this.shk.time > 0 || !!this.hold || (shown && (this.coachOn || !!this.aim));
  };
  B.wantsOverlay = function () { return this.visible && ((this.hold && !this.hold.fired) || this.coachOn); };
  B.drawOverlay = function () {
    var d = this.d, c, r;
    if (this.hold && !this.hold.fired) { // 꾹 누르는 동안 게이지(_draw_hold_ring)
      c = this.centerOf(this.hold.p); r = d * 0.44 * 1.3;
      var fill = clamp(this.hold.time / 0.38, 0, 1);
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
      arc(c.x, c.y, r, 0, TAU, 'rgba(255,255,255,.15)', d * 0.07);
      arc(c.x, c.y, r, -PI / 2, -PI / 2 + TAU * fill, lighten(COLOR[this.hold.p.kind], 0.45), d * 0.09);
    }
    if (!this.coachOn || !this.coach) return;
    var cc = this.coach, u, a;
    ctx.lineCap = 'butt';
    if (cc.kind === 'hold') { // 손가락이 생물을 꾹 누르고 고리가 차오른다(_draw_coach "hold")
      var list = this.pieces[cc.t]; if (!list || !list[cc.k]) return;
      c = this.centerOf(list[cc.k]); u = (this.coachTime % 1.8) / 1.8; r = d * 0.6;
      var f2 = clamp((u - 0.15) / 0.6, 0, 1);
      ctx.globalAlpha = 1;
      arc(c.x, c.y, r, 0, TAU, 'rgba(255,255,255,.18)', d * 0.07);
      if (f2 > 0) arc(c.x, c.y, r, -PI / 2, -PI / 2 + TAU * f2, '#9FE6B8', d * 0.09);
      drawHand({ x: c.x, y: c.y + d * 0.12 * Math.min(1, u / 0.15) }, u < 0.9 ? 1 : 1 - (u - 0.9) / 0.1, d);
    } else if (cc.kind === 'tap') { // 출발 튜브를 누르고 도착 튜브를 누르는 손가락("tap")
      var ra = this.tubeRect(cc.from), rb = this.tubeRect(cc.to);
      var pa = { x: ra.left + ra.width / 2, y: ra.top + ra.height / 2 }, pb = { x: rb.left + rb.width / 2, y: rb.top + rb.height / 2 };
      u = (this.coachTime % 2.2) / 2.2;
      var atp = pa, press = 0;
      if (u < 0.25) press = Math.sin(u / 0.25 * PI);
      else if (u < 0.55) { var e2 = (u - 0.25) / 0.3; e2 = 1 - Math.pow(1 - e2, 2); atp = { x: pa.x + (pb.x - pa.x) * e2, y: pa.y + (pb.y - pa.y) * e2 }; }
      else if (u < 0.8) { atp = pb; press = Math.sin((u - 0.55) / 0.25 * PI); }
      else atp = pb;
      a = u < 0.85 ? 1 : 1 - (u - 0.85) / 0.15;
      if (press > 0) { ctx.globalAlpha = 0.5 * press * a; arc(atp.x, atp.y, d * (0.5 + 0.4 * press), 0, TAU, '#fff', d * 0.06); }
      drawHand({ x: atp.x, y: atp.y + d * 0.15 * press }, a, d);
    }
  };
  B.stopCoach = function () { this.coachOn = false; this.idle = 0; this.touched = true; };
  // 키보드: 튜브에서 A 키 = 그 튜브 능력 친구의 능력(꾹 누르기 대신)
  B.onKey = function (e) {
    var b = e.target.closest('.cb-tube'); if (!b || this.busy) return;
    if (e.key !== 'a' && e.key !== 'A' && e.key !== 'ㅁ') return;
    unlockAudio(); this.stopCoach();
    var t = +b.dataset.t, tube = this.state[t];
    for (var k = tube.length - 1; k >= 0; k--) if (hasAbility(tube[k]) && abilityAt(this.state, t, k)) { this.fireHold({ t: t, k: k, p: this.pieces[t][k] }); return; }
    this.shakeTube(t);
  };

  /* ── 움직임 도구(board_view.gd) ── */
  B.squash = function (p, sx, sy) { p.sx = sx; p.sy = sy; return prop(p, { sx: 1, sy: 1 }, 0.32, E.elasticOut, 0, 's' + p.id); };
  B.jump = function (p, delay, height) {
    var id = ++p.jumpId;
    return prop(p, { bounce: height }, 0.16, E.quadOut, delay, 'j' + p.id).then(function () { if (id === p.jumpId) return prop(p, { bounce: 0 }, 0.22, E.bounceOut, 0, 'j' + p.id); });
  };
  B.settle = function (dur) {
    var all = [wait(dur)];
    for (var t = 0; t < this.pieces.length; t++) for (var k = 0; k < this.pieces[t].length; k++) {
      var p = this.pieces[t][k], q = this.restPos(t, k);
      if (dist(p, q) > 0.5) all.push(prop(p, { x: q.x, y: q.y }, dur, E.quadOut, 0, 'm' + p.id));
    }
    return Promise.all(all);
  };
  // 지금 자리 → exit까지 곧게 → exit에서 entry로 호 → end로 내려간다(_travel)
  B.travel = function (p, exit, entry, end, delay, pace, height) {
    var s = { x: p.x, y: p.y }, c = { x: (exit.x + entry.x) / 2, y: Math.min(exit.y, entry.y) - height };
    var d1 = dist(s, exit), d2 = dist(exit, entry) + height * 0.6, d3 = dist(entry, end), all = d1 + d2 + d3 || 1;
    var A = d1 / all, Bq = (d1 + d2) / all, dur = clamp(0.14 + all / (this.d * 24), 0.2, 0.55) / pace;
    var done = tween(dur, E.sineInOut, function (t) {
      var u;
      if (t < A) { u = t / A; p.x = s.x + (exit.x - s.x) * u; p.y = s.y + (exit.y - s.y) * u; }
      else if (t < Bq || Bq >= 1) {
        u = clamp((t - A) / (Bq - A), 0, 1);
        var ax = exit.x + (c.x - exit.x) * u, ay = exit.y + (c.y - exit.y) * u, bx = c.x + (entry.x - c.x) * u, by = c.y + (entry.y - c.y) * u;
        p.x = ax + (bx - ax) * u; p.y = ay + (by - ay) * u;
      } else { u = (t - Bq) / (1 - Bq); p.x = entry.x + (end.x - entry.x) * u; p.y = entry.y + (end.y - entry.y) * u; }
    }, delay, 'm' + p.id);
    return { done: done, arrive: delay + dur };
  };
  B.shake = function (strength, duration) {
    if (reduce) return;
    var k = this.shk;
    k.str = Math.max(k.time > 0 ? k.str : 0, strength); k.dur = Math.max(duration, k.time); k.time = k.dur; wake();
  };
  B.foot = function (p) { var c = this.centerOf(p); return { x: c.x, y: c.y + this.d * 0.44 * 0.85 }; };
  B.onLand = function (p, order) {
    p.el.style.zIndex = '';
    this.squash(p, 1.28, 0.72);
    burst(this.foot(p), lighten(COLOR[p.kind], 0.4), 6, this.d * 2.4, SH.DOT, this.d * 0.12, 260 * this.S, 0.35, PI * 0.9, -PI / 2);
    play('land', 0.95 + order * 0.08);
  };
  B.dropOthers = function (t, dur, delay, ease) {
    var self = this, all = [];
    this.pieces[t].forEach(function (p, k) { var q = self.slotPos(t, k); if (dist(p, q) > 0.5) all.push(prop(p, { x: q.x, y: q.y }, dur, ease || E.quadIn, delay || 0, 'm' + p.id)); });
    return all;
  };

  /* ── 사건마다 움직임 ── */
  B.animate = function (ev) {
    switch (ev.type) {
      case 'pour': return this.aPour(ev);
      case 'dive': return this.aShift(ev.tube, ev.from, 0, 'dive');
      case 'climb': return this.aShift(ev.tube, ev.from, this.pieces[ev.tube].length - 1, 'climb');
      case 'rotate': return this.aShift(ev.tube, this.pieces[ev.tube].length - 1, 0, 'rotate');
      case 'jump': return this.aJump(ev);
      case 'flip': return this.aFlip(ev.tube);
      case 'slide': return this.aSlide(ev);
      case 'pull': return this.aPull(ev);
      case 'burrow': return this.aBurrow(ev);
      case 'trade': return this.aTrade(ev);
      case 'swap': return this.aSwap(ev);
      case 'spray': return this.aSpray(ev);
      case 'wave': return this.aWave(ev);
      case 'rescue': return this.aRescue(ev);
    }
    return Promise.resolve();
  };
  B.aPour = function (ev) {
    var self = this, src = this.pieces[ev.from], dst = this.pieces[ev.to], exit = this.abovePos(ev.from), entry = this.abovePos(ev.to), w = [];
    play('pop', 1.1);
    for (var m = 0; m < ev.count; m++) {
      var p = src.pop(); dst.push(p); p.el.style.zIndex = 5;
      var tr = this.travel(p, exit, entry, this.slotPos(ev.to, dst.length - 1), m * 0.05, 1, this.d * 0.8);
      w.push(tr.done.then(this.onLand.bind(this, p, m)));
    }
    return Promise.all(w.concat(this.dropOthers(ev.from, 0.14, 0.06)));
  };
  // 거북이 잠수·다람쥐 등반·부엉이 돌리기: 옆으로 비켜 가며 흔적(거품·나뭇잎·깃털)을 남기고, 나머지는 한 칸씩 밀린다
  B.aShift = function (t, fromK, toK, style) {
    var self = this, list = this.pieces[t], mover = list.splice(fromK, 1)[0];
    list.splice(toK, 0, mover);
    var diving = toK < fromK, color = diving ? '#BFF4FF' : '#7BC96F', shape = diving ? SH.BUBBLE : SH.LEAF;
    if (style === 'rotate') { color = '#FFF8EA'; shape = SH.LEAF; play('hoot', 1 + Math.random() * 0.1); }
    else if (style === 'dive') play('blub', 0.95 + Math.random() * 0.1);
    else play('squeak', 0.95 + Math.random() * 0.1);
    mover.el.style.zIndex = 5;
    var start = { x: mover.x, y: mover.y }, end = this.slotPos(t, toK), swim = this.d * 0.5, dur = 0.22 + 0.06 * Math.abs(fromK - toK), w = [];
    w.push(tween(dur, E.sineInOut, function (u) {
      mover.x = start.x + (end.x - start.x) * u + swim * Math.sin(PI * u); mover.y = start.y + (end.y - start.y) * u;
      if (Math.random() < 0.35) burst(self.centerOf(mover), color, 1, self.d, shape, self.d * 0.22, (diving ? -200 : 200) * self.S, 0.6);
    }, 0, 'm' + mover.id));
    list.forEach(function (p, j) { if (p !== mover) { var q = self.slotPos(t, j); w.push(prop(p, { x: q.x, y: q.y }, dur * 0.8, E.quadInOut, dur * 0.15, 'm' + p.id)); } });
    return Promise.all(w).then(function () {
      mover.el.style.zIndex = '';
      self.squash(mover, diving ? 1.3 : 0.78, diving ? 0.72 : 1.25);
      burst(self.centerOf(mover), color, 8, self.d * 2.5, shape, self.d * 0.25, (diving ? -150 : 300) * self.S, 0.6);
      play('land', diving ? 0.8 : 1.3);
    });
  };
  // 개구리: 묻혀 있던 자리에서 튀어나와 높이 뛰어 다른 튜브 맨 위에 내려앉는다
  B.aJump = function (ev) {
    var self = this, frog = this.pieces[ev.from].splice(ev.pos, 1)[0];
    this.pieces[ev.to].push(frog); frog.el.style.zIndex = 10;
    play('boing', 1 + Math.random() * 0.15);
    var tr = this.travel(frog, this.abovePos(ev.from), this.abovePos(ev.to), this.slotPos(ev.to, this.pieces[ev.to].length - 1), 0, 0.9, this.d * 1.8);
    var w = [tr.done, tween(tr.arrive * 0.4, E.sineInOut, function (v) { frog.sx = 1 - 0.18 * v; frog.sy = 1 + 0.28 * v; }, 0, 's' + frog.id)];
    return Promise.all(w.concat(this.dropOthers(ev.from, 0.18, 0.12))).then(function () {
      frog.el.style.zIndex = '';
      self.squash(frog, 1.35, 0.68);
      burst(self.foot(frog), '#8FE3FF', 12, self.d * 4, SH.DROP, self.d * 0.16, 1400 * self.S, 0.5, PI * 0.8, -PI / 2);
      play('land', 1.2);
    });
  };
  // 박쥐: 튜브를 180도 돌린다. 도는 동안 불꽃 궤적, 친구들은 반대쪽 바닥으로 떨어진다
  B.aFlip = function (t) {
    var self = this, list = this.pieces[t], tube = this.tubesEl[t];
    var cx = this.tubeLeft(t) + this.tw / 2 - this.pw / 2, cy = this.y0 + this.th / 2 - this.pw / 2;
    var starts = list.map(function (p) { return { x: p.x, y: p.y }; }), bat = lighten(COLOR.f, 0.4);
    play('whoosh');
    return tween(0.4, E.backInOut, function (ang) {
      var a = ang * PI, c = Math.cos(a), s = Math.sin(a);
      list.forEach(function (p, k) { var dx = starts[k].x - cx, dy = starts[k].y - cy; p.x = cx + dx * c - dy * s; p.y = cy + dx * s + dy * c; });
      tube.style.transform = 'rotate(' + a.toFixed(4) + 'rad)';
      if (Math.random() < 0.6 && list.length) burst(self.centerOf(list[Math.floor(Math.random() * list.length)]), bat, 1, self.d * 0.6, SH.SPARK, self.d * 0.3, 0, 0.35);
    }, 0, 'flip' + t).then(function () {
      tube.style.transform = '';
      list.reverse();
      var r = self.tubeRect(t);
      ring({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, bat, self.d * 1.6, 0.4, self.d * 0.08);
      return Promise.all(self.dropOthers(t, 0.16, 0, E.quadIn));
    }).then(function () { play('land', 0.8); });
  };
  // 펭귄: 배를 깔고 오른쪽 튜브로 쭉 미끄러진다. 얼음 가루
  B.aSlide = function (ev) {
    var self = this, pg = this.pieces[ev.from].pop();
    this.pieces[ev.to].push(pg); pg.el.style.zIndex = 10;
    play('whoosh', 1.4, -2);
    var tr = this.travel(pg, this.abovePos(ev.from), this.abovePos(ev.to), this.slotPos(ev.to, this.pieces[ev.to].length - 1), 0, 1.2, this.d * 0.25);
    pg.rot = -PI / 2;
    var w = [tr.done, prop(pg, { rot: 0 }, tr.arrive, E.backOut, 0, 'r' + pg.id),
      tween(tr.arrive, E.linear, function () { if (Math.random() < 0.5) burst(self.foot(pg), '#D6F3FF', 1, self.d * 0.8, SH.DOT, self.d * 0.12, 100 * self.S, 0.4); })];
    return Promise.all(w).then(function () { pg.el.style.zIndex = ''; pg.rot = 0; self.squash(pg, 1.3, 0.72); play('land', 1.1); });
  };
  // 문어: 다리를 뻗어 왼쪽 튜브 맨 위 친구를 끌어온다. 보라 먹물 방울
  B.aPull = function (ev) {
    var self = this, oct = this.pieces[ev.to][this.pieces[ev.to].length - 1], p = this.pieces[ev.from].pop();
    this.pieces[ev.to].push(p); p.el.style.zIndex = 10;
    play('blub', 1.3); this.squash(oct, 1.25, 0.8);
    var tr = this.travel(p, this.abovePos(ev.from), this.abovePos(ev.to), this.slotPos(ev.to, this.pieces[ev.to].length - 1), 0.05, 0.9, this.d * 0.9), ink = lighten(COLOR.o, 0.25);
    return Promise.all([tr.done, tween(tr.arrive, E.linear, function () { if (Math.random() < 0.5) burst(self.centerOf(p), ink, 1, self.d * 0.6, SH.DOT, self.d * 0.14, 300 * self.S, 0.45); })])
      .then(function () { self.onLand(p, 0); });
  };
  // 두더지: 오른쪽 튜브로 넘어가 바닥까지 파고든다. 그 튜브 친구들은 한 칸씩 올라가고 흙이 튄다
  B.aBurrow = function (ev) {
    var self = this, mole = this.pieces[ev.from].pop(), dst = this.pieces[ev.to];
    dst.unshift(mole);
    play('dig', 1);
    var end = this.slotPos(ev.to, 0), tr = this.travel(mole, this.abovePos(ev.from), this.abovePos(ev.to), end, 0, 0.8, this.d * 0.6), w = [tr.done];
    for (var k = 1; k < dst.length; k++) { var q = this.slotPos(ev.to, k); w.push(prop(dst[k], { x: q.x, y: q.y }, 0.2, E.backOut, tr.arrive * 0.6, 'm' + dst[k].id)); }
    setTimeout(function () { mole.el.style.zIndex = -1; }, reduce ? 0 : tr.arrive * 550); // 친구들 뒤로 파고드는 느낌
    return Promise.all(w).then(function () {
      mole.el.style.zIndex = '';
      burst(self.posCenter({ x: end.x, y: end.y + self.d * 0.4 }), '#8A6A4F', 14, self.d * 3, SH.DOT, self.d * 0.16, 1200 * self.S, 0.5, PI * 0.8, -PI / 2);
      self.squash(mole, 1.3, 0.75); play('land', 0.7);
    });
  };
  // 해달: 바로 아래 친구와 빙글 돌며 자리를 바꾼다. 물방울
  B.aTrade = function (ev) {
    var self = this, list = this.pieces[ev.tube], ot = list[ev.pos], other = list[ev.pos - 1];
    list[ev.pos] = other; list[ev.pos - 1] = ot;
    play('squeak', 1.3);
    var a = { x: ot.x, y: ot.y }, b = { x: other.x, y: other.y }, swing = this.d * 0.45;
    return tween(0.32, E.sineInOut, function (u) {
      ot.x = a.x + (b.x - a.x) * u - swing * Math.sin(PI * u); ot.y = a.y + (b.y - a.y) * u;
      other.x = b.x + (a.x - b.x) * u + swing * Math.sin(PI * u); other.y = b.y + (a.y - b.y) * u;
    }, 0, 'trade' + ot.id).then(function () {
      burst(self.posCenter({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), '#9ED8FF', 10, self.d * 2.5, SH.DROP, self.d * 0.14, 900 * self.S, 0.5);
      self.squash(ot, 1.2, 0.85); play('land', 1.2);
    });
  };
  // 사자: 어흥 하고 다른 튜브 맨 위 친구와 자리를 맞바꾼다. 금빛 불꽃
  B.aSwap = function (ev) {
    var self = this, lion = this.pieces[ev.from].pop(), other = this.pieces[ev.to].pop();
    this.pieces[ev.from].push(other); this.pieces[ev.to].push(lion);
    lion.el.style.zIndex = 10; other.el.style.zIndex = 9;
    play('roar', 1); this.shake(6 * this.S, 0.2);
    var t1 = this.travel(lion, this.abovePos(ev.from), this.abovePos(ev.to), this.slotPos(ev.to, this.pieces[ev.to].length - 1), 0, 0.85, this.d * 1.4);
    var t2 = this.travel(other, this.abovePos(ev.to), this.abovePos(ev.from), this.slotPos(ev.from, this.pieces[ev.from].length - 1), 0, 0.85, this.d * 0.5);
    return Promise.all([t1.done, t2.done, tween(t1.arrive, E.linear, function () { if (Math.random() < 0.6) burst(self.centerOf(lion), '#FFD27A', 1, self.d * 0.8, SH.SPARK, self.d * 0.25, 0, 0.35); })])
      .then(function () { self.onLand(lion, 0); self.onLand(other, 1); });
  };
  // 코끼리: 코로 물을 뿜어 오른쪽 튜브 맨 위 친구를 그다음 튜브로 날려 보낸다
  B.aSpray = function (ev) {
    var self = this, el = this.pieces[ev.from][this.pieces[ev.from].length - 1], p = this.pieces[ev.hit].pop();
    this.pieces[ev.to].push(p);
    play('trumpet', 1); this.squash(el, 0.85, 1.2);
    var a = this.centerOf(el), b = this.centerOf(p), dir = Math.atan2(b.y - a.y, b.x - a.x);
    var shots = [0, 1, 2].map(function (i) { return wait(i * 0.05).then(function () { burst(self.centerOf(el), '#8FD3FF', 8, self.d * 6, SH.DROP, self.d * 0.15, 300 * self.S, 0.45, 0.35, dir); }); });
    return Promise.all(shots).then(function () { return wait(0.05); }).then(function () {
      p.el.style.zIndex = 10; play('splash', 1.2, -4);
      return self.travel(p, self.abovePos(ev.hit), self.abovePos(ev.to), self.slotPos(ev.to, self.pieces[ev.to].length - 1), 0, 1, self.d).done;
    }).then(function () {
      burst(self.centerOf(p), '#8FD3FF', 10, self.d * 3, SH.DROP, self.d * 0.14, 1000 * self.S, 0.5, PI * 0.8, -PI / 2);
      self.onLand(p, 0);
    });
  };
  // 고래: 큰 파도로 모든 튜브의 맨 위 친구가 한꺼번에 오른쪽으로. 아래에서 물보라가 솟는다
  B.aWave = function (ev) {
    var self = this, movers = ev.moves.map(function (m) { return self.pieces[m[0]].pop(); });
    ev.moves.forEach(function (m, i) { self.pieces[m[1]].push(movers[i]); });
    play('splash', 0.9); play('whoosh', 0.8, -4); this.shake(8 * this.S, 0.3);
    var o = this.origin(), w = this.el.clientWidth, h = this.el.clientHeight;
    for (var x = 0; x < 9; x++) burst({ x: o.x + w * (x + 0.5) / 9, y: o.y + h * 0.95 }, '#7CC8FF', 6, this.d * 7, SH.DROP, this.d * 0.16, 1400 * this.S, 0.8, 0.5, -PI / 2);
    var all = ev.moves.map(function (m, i) {
      movers[i].el.style.zIndex = 10;
      return self.travel(movers[i], self.abovePos(m[0]), self.abovePos(m[1]), self.slotPos(m[1], self.pieces[m[1]].length - 1), i * 0.04, 0.9, self.d * 0.7).done;
    });
    return Promise.all(all).then(function () {
      movers.forEach(function (p) { p.el.style.zIndex = ''; self.squash(p, 1.25, 0.78); });
      play('land', 0.9);
    });
  };
  // 병아리 구출: 삐약, 하트가 떠오르고 노란 고리, 병아리는 폴짝 올라 판 위로 날아간다(둥지 자리가 없는 작은 판)
  B.aRescue = function (ev) {
    var self = this, list = this.pieces[ev.tube], topAt = this.abovePos(ev.tube), w = [];
    play('tweet', 1 + Math.random() * 0.1);
    burst(this.posCenter(topAt), '#FF7AA2', 12, this.d * 4, SH.HEART, this.d * 0.3, -150 * this.S, 0.9);
    if (list.length) ring(this.centerOf(list[list.length - 1]), '#FFE066', this.d * 1.6, 0.4, this.d * 0.08);
    for (var m = 0; m < ev.count; m++) {
      var chick = list.pop(), target = { x: topAt.x, y: -this.d * 2 };
      chick.el.style.zIndex = 20;
      var tr = this.travel(chick, topAt, target, target, m * 0.12, 0.7, this.d * 1.4);
      prop(chick, { k: 0.85 }, tr.arrive, E.linear, m * 0.12, 'k' + chick.id);
      w.push(tr.done.then((function (c) { return function () { c.dead = true; c.el.remove(); haptic(20); }; })(chick)));
    }
    return Promise.all(w);
  };
  B.addLid = function (t, animate) {
    var color = lighten(COLOR[this.state[t][0]], 0.15), lid = document.createElement('i'), d = this.d;
    lid.className = 'cb-lid';
    lid.style.cssText = 'left:' + (this.tubeLeft(t) - d * 0.08) + 'px;top:' + (this.y0 - d * 0.22) + 'px;width:' + (this.tw + d * 0.16) + 'px;height:' + d * 0.26 + 'px;' +
      'background:linear-gradient(' + color + ' 60%,' + darken(color, 0.25) + ' 60%)';
    this.el.insertBefore(lid, this.layer);
    if (animate) tween(0.45, E.bounceOut, function (v) { var dr = 1 - v; lid.style.translate = '0 ' + (-dr * d * 1.4) + 'px'; lid.style.opacity = 1 - dr * 0.5; });
  };
  B.checkCompletions = function () {
    var n = 0;
    for (var t = 0; t < this.state.length; t++) if (!this.sealedSeen[t] && sealed(this.state[t])) { this.celebrateTube(t); n++; }
    return n;
  };
  B.celebrateTube = function (t) {
    var self = this, color = COLOR[this.state[t][0]], r = this.tubeRect(t), topAt = { x: r.left + r.width / 2, y: r.top }, d = this.d;
    this.sealedSeen[t] = 1;
    this.addLid(t, true);
    burst(topAt, color, 24, d * 7, SH.CONFETTI, d * 0.2, 1300 * this.S, 1, PI * 0.9, -PI / 2);
    burst(topAt, '#FFFFFF', 8, d * 4, SH.STAR, d * 0.3, 300 * this.S, 0.7);
    ring({ x: topAt.x, y: r.top + r.height / 2 }, lighten(color, 0.3), d * 2.2, 0.5, d * 0.1);
    floatText({ x: topAt.x, y: topAt.y - d * 0.9 }, FX_TEXT, lighten(color, 0.35), Math.round(d * 0.42), 150 * this.S, 1);
    this.pieces[t].forEach(function (p, k) { self.jump(p, 0.12 + k * 0.07, d * 0.35); });
    play('chime', PENTATONIC[clamp(this.completed, 0, 7)]); haptic(25); this.completed++;
    this.shake(7 * this.S, 0.2);
  };
  B.win = function () {
    var self = this, colors = [], o = this.origin(), w = this.el.clientWidth;
    this.won = true; this.busy = true; this.coachOn = false;
    this.pieces.forEach(function (l) { l.forEach(function (p) { if (colors.indexOf(COLOR[p.kind]) < 0) colors.push(COLOR[p.kind]); }); });
    colors.push('#FFFFFF');
    for (var i = 0; i < 40; i++) burst({ x: o.x + rnd(0, w), y: o.y + rnd(-40, 40) * this.S }, colors[i % colors.length], 1, 420 * this.S, SH.CONFETTI, 18 * this.S, 520 * this.S, 2.2, PI * 0.8, PI / 2);
    var order = 0;
    this.pieces.forEach(function (l) { l.forEach(function (p) { self.jump(p, order++ * 0.035, self.d * 0.45); }); });
    play('fanfare'); haptic(60); this.shake(9 * this.S, 0.3);
    if (this.opts.onWin) wait(0.9).then(function () { if (self.won) self.opts.onWin(self); });
  };

  /* ── 손 ── */
  B.tubeAt = function (x, y) {
    for (var t = 0; t < this.tubesEl.length; t++) {
      var r = this.tubesEl[t].getBoundingClientRect();
      if (x >= r.left - this.gap / 2 && x <= r.right + this.gap / 2 && y >= r.top - this.d * 1.05 && y <= r.bottom + this.d * 0.2) return t;
    }
    return -1;
  };
  B.pieceAt = function (t, y) {
    var list = this.pieces[t];
    if (!list.length) return -1;
    var o = this.el.getBoundingClientRect(), ly = y - o.top, best = -1, bd = this.d * 0.5, pw = this.pw;
    if (ly < list[list.length - 1].y + pw / 2) return list.length - 1;
    list.forEach(function (p, k) { var dy = Math.abs(p.y + pw / 2 - ly); if (dy < bd) { bd = dy; best = k; } });
    return best;
  };
  B.onDown = function (e) {
    this.skipClick = false;
    if (this.busy || this.aim || e.button > 0) return;
    var t = this.tubeAt(e.clientX, e.clientY);
    if (t < 0) return;
    var k = this.pieceAt(t, e.clientY);
    if (k < 0 || !hasAbility(this.state[t][k])) return;
    this.stopCoach();
    this.hold = { t: t, k: k, p: this.pieces[t][k], time: 0, x: e.clientX, y: e.clientY };
    wake();
  };
  B.onClick = function (e) {
    if (this.skipClick && e.detail !== 0) { this.skipClick = false; return; }
    var t;
    if (e.detail === 0) { var b = e.target.closest('.cb-tube'); if (!b) return; t = +b.dataset.t; }
    else t = this.tubeAt(e.clientX, e.clientY);
    this.tap(t);
  };
  B.fireHold = function (h) {
    if (this.busy) return;
    if (this.sel >= 0) { this.sel = -1; this.settle(0.1); this.refresh(); }
    var m = abilityAt(this.state, h.t, h.k);
    if (!m) { this.shakeTube(h.t); return; }
    haptic(15);
    if (m[3] < 0) this.startAim(h, m); else this.doMove(m);
  };
  // 개구리·사자: 꾹 누른 뒤 갈(바꿀) 튜브를 고른다. 갈 수 있는 튜브 테두리가 그 친구 색으로 빛난다
  B.startAim = function (h, m) {
    var self = this, p = this.pieces[h.t][h.k], color = AIM_COLOR[p.kind];
    this.aim = { t: h.t, k: h.k, type: m[0], p: p };
    p.glow = 1;
    prop(p, { bounce: this.d * 0.25 }, 0.15, E.backOut, 0, 'j' + p.id);
    play(m[0] === JUMP ? 'boing' : 'roar', 0.8, -4);
    this.tubesEl.forEach(function (el, w) {
      if (isLegal(self.state, [m[0], h.t, h.k, w])) el.style.boxShadow = 'inset 0 0 0 ' + Math.max(2, self.d * 0.07).toFixed(1) + 'px ' + color + ',0 0 ' + self.d * 0.3 + 'px ' + rgba(color, 0.35);
    });
    wake();
  };
  B.cancelAim = function (quiet) {
    if (!this.aim) return;
    var p = this.aim.p;
    p.glow = 0;
    if (!quiet) prop(p, { bounce: 0 }, 0.12, E.quadInOut, 0, 'j' + p.id); else p.bounce = 0;
    (this.tubesEl || []).forEach(function (el) { el.style.boxShadow = ''; });
    this.aim = null;
  };
  B.tap = function (t) {
    if (this.busy) return;
    this.stopCoach();
    if (this.aim) {
      var a = this.aim, m = [a.type, a.t, a.k, t];
      this.cancelAim(false);
      if (t >= 0 && t !== a.t && isLegal(this.state, m)) this.doMove(m);
      return;
    }
    if (t < 0) { if (this.sel >= 0) this.putBack(); return; }
    if (this.sel < 0) {
      if (!this.state[t] || sealed(this.state[t])) { this.shakeTube(t); return; }
      this.selectTube(t); return;
    }
    if (this.sel === t) { this.putBack(); return; }
    if (canPour(this.state, this.sel, t)) { this.doMove([POUR, this.sel, t, 0]); return; }
    var from = this.sel;
    this.sel = -1; this.refresh(); this.shakeTube(from);
  };
  B.selectTube = function (t) {
    var self = this, s = this.state[t];
    this.sel = t;
    play('select', 0.9 + 0.05 * s.length); haptic(8);
    this.pieces[t].slice(s.length - topRun(s)).forEach(function (p) { self.squash(p, 0.82, 1.2); });
    this.settle(0.1); this.refresh();
  };
  B.putBack = function () {
    var self = this, i = this.sel;
    if (i < 0) return;
    var s = this.state[i], lifted = this.pieces[i].slice(s.length - topRun(s));
    this.sel = -1; this.settle(0.1); this.refresh();
    wait(0.1).then(function () {
      lifted.forEach(function (p) { if (!p.dead) self.squash(p, 1.18, 0.82); });
      if (lifted[0] && !lifted[0].dead) burst(self.foot(lifted[0]), lighten(COLOR[lifted[0].kind], 0.4), 4, self.d * 1.6, SH.DOT, self.d * 0.1, 200 * self.S, 0.3, PI * 0.9, -PI / 2);
      play('land', 0.8 + 0.04 * s.length, -3); haptic(10);
    });
  };
  B.shakeTube = function (t) {
    var self = this, list = this.pieces[t].slice(), bases = list.map(function (p) { return p.x; }), el = this.tubesEl[t];
    this.busy = true;
    play('buzz', 1, -6);
    return tween(0.3, E.linear, function (u) {
      var f = 1 - u, dx = Math.sin(u * TAU * 3) * self.d * 0.12 * f;
      list.forEach(function (p, k) { p.x = bases[k] + dx; });
      el.style.boxShadow = 'inset 0 0 0 ' + (2 + self.d * 0.05 * f).toFixed(1) + 'px rgba(' + Math.round(232 + 23 * f) + ',' + Math.round(236 - 159 * f) + ',' + Math.round(248 - 154 * f) + ',' + (0.42 + 0.58 * f).toFixed(3) + ')';
    }, 0, 'shake' + t).then(function () { el.style.boxShadow = ''; return self.settle(0.1); }).then(function () { self.busy = false; });
  };
  B.doMove = function (m) {
    var self = this, res = applyMove(this.state, m);
    this.busy = true; this.sel = -1; this.moves++; this.coachOn = false; this.idle = 0;
    var chain = Promise.resolve();
    // 상태는 사건마다 맞춰 가며 바꾼다(완성 검사는 사건 뒤의 판으로)
    var before = this.state;
    this.state = res.state.slice();
    res.events.forEach(function (ev) {
      chain = chain.then(function () { return self.animate(ev); }).then(function () {
        if (ev.type !== 'rescue') { var n = self.checkCompletions(); if (n >= 2) play('chime', 1.5 + n * 0.12, -4); }
      });
    });
    this.refresh();
    if (this.opts.onMove) this.opts.onMove(this, m, before);
    return chain.then(function () { return self.settle(0.1); }).then(function () {
      self.refresh();
      if (!hasBaby(self.state)) { self.win(); return; }
      self.busy = false;
      if (!solvable(self.state)) { play('blub', 0.7, -6); if (self.opts.onStuck) self.opts.onStuck(self); }
    });
  };

  global.ChickBoard = {
    create: function (host, opts) { return new Board(host, opts); },
    rules: { applyMove: applyMove, legalMoves: legalMoves, isLegal: isLegal, abilityAt: abilityAt, solvable: solvable, hasBaby: hasBaby, stateKey: stateKey, nextMove: nextMove },
    setSound: function (on) { soundOn = !!on; if (on) unlockAudio(); },
    setHaptics: function (on) { hapticsOn = !!on; }
  };
})(window);
