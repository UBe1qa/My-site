/* 기기 테스트: 자판 배열 표와 키 기록 로직. 화면(DOM)을 모른다.
   브라우저: window.CK / 노드: require('./ck-keys.js')
   - CK.layout(id): KeyboardEvent.code → 자판 위치(키 너비 1을 단위로 한 x, y, w, h). 배열은 full(ANSI 104키), iso(105키, 엔터가 세로로 긴 자판), tkl(87키), mac(78키).
   - CK.defaultLayout(platform): 처음 보일 배열(맥·아이폰·아이패드면 mac, 그 밖은 full).
   - CK.resolveKey(id, code, key): 들어온 키가 그 배열의 어느 칸인지. 배열에 없는 키는 조용히 버리지 않고 extra로 돌려준다.
   - CK.createTracker(): 누름·뗌을 받아 한 번도 안 눌린 키, 동시에 눌린 최대 수, 채터링 의심, 눌린 채 있는 키를 계산한다.
   채터링 기준: 같은 키를 뗀 뒤 chatterMs(기본 30ms) 안에 다시 눌림이 들어오면 의심 1회로 센다. 이 값은 화면에 밝히고 바꿀 수 있다.
   시험: tests/run.mjs (기준값은 손으로 따진 예시와 tests/gen_cases.py) */
(function (root) {
  'use strict';
  var CK = root.CK || (root.CK = {});

  /* ── 기준값(화면에 그대로 밝힌다) ───────────────────────── */
  CK.KEY_CHATTER_MS = 30;    // 키: 뗀 뒤 이 시간 안에 다시 눌리면 채터링 의심
  CK.MOUSE_CHATTER_MS = 50;  // 마우스 단추: 뗀 뒤 이 시간 안에 다시 눌리면 더블클릭 의심
  CK.CHATTER_MIN_MS = 5;     // 바꿀 수 있는 범위
  CK.CHATTER_MAX_MS = 200;

  /* ── 자판 줄 정의 ──────────────────────────────────────
     한 줄 = 항목 배열. 항목은 [code, 너비] 또는 숫자(빈칸 너비).
     줄 전체 너비가 맞는지는 시험이 본다(본판 15, 맥 14.5). */
  function k(code, w, h) { return { code: code, w: w || 1, h: h || 1 }; }
  function seq(prefix, list) { return list.map(function (s) { return k(prefix + s); }); }

  var LETTERS_1 = seq('Key', ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']);
  var LETTERS_2 = seq('Key', ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']);
  var LETTERS_3 = seq('Key', ['Z', 'X', 'C', 'V', 'B', 'N', 'M']);
  var DIGITS = seq('Digit', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
  function fkeys(a, b) { var out = []; for (var i = a; i <= b; i++) out.push(k('F' + i)); return out; }

  /* PC 본판(6줄, 너비 15) */
  var PC_MAIN = [
    { y: 0, keys: [k('Escape'), 1].concat(fkeys(1, 4), [0.5], fkeys(5, 8), [0.5], fkeys(9, 12)) },
    { y: 1.5, keys: [k('Backquote')].concat(DIGITS, [k('Minus'), k('Equal'), k('Backspace', 2)]) },
    { y: 2.5, keys: [k('Tab', 1.5)].concat(LETTERS_1, [k('BracketLeft'), k('BracketRight'), k('Backslash', 1.5)]) },
    { y: 3.5, keys: [k('CapsLock', 1.75)].concat(LETTERS_2, [k('Semicolon'), k('Quote'), k('Enter', 2.25)]) },
    { y: 4.5, keys: [k('ShiftLeft', 2.25)].concat(LETTERS_3, [k('Comma'), k('Period'), k('Slash'), k('ShiftRight', 2.75)]) },
    { y: 5.5, keys: [k('ControlLeft', 1.25), k('MetaLeft', 1.25), k('AltLeft', 1.25), k('Space', 6.25), k('AltRight', 1.25), k('MetaRight', 1.25), k('ContextMenu', 1.25), k('ControlRight', 1.25)] }
  ];
  /* ISO 본판(105키): 엔터가 세로로 길다. 오른쪽 기둥(너비 1.25, 두 줄) + 윗줄에서 왼쪽으로 0.25 더 나온 꼴(ext).
     ANSI의 \\ 자리 키(Backslash)는 셋째 줄 엔터 왼쪽으로 가고, 왼쪽 Shift가 짧아지며 그 옆에 키 하나(IntlBackslash)가 더 있다. */
  var ISO_MAIN = [
    PC_MAIN[0], PC_MAIN[1],
    { y: 2.5, keys: [k('Tab', 1.5)].concat(LETTERS_1, [k('BracketLeft'), k('BracketRight'), 0.25, { code: 'Enter', w: 1.25, h: 2, ext: { dx: -0.25, w: 0.25, h: 1 } }]) },
    { y: 3.5, keys: [k('CapsLock', 1.75)].concat(LETTERS_2, [k('Semicolon'), k('Quote'), k('Backslash')]) },
    { y: 4.5, keys: [k('ShiftLeft', 1.25), k('IntlBackslash')].concat(LETTERS_3, [k('Comma'), k('Period'), k('Slash'), k('ShiftRight', 2.75)]) },
    PC_MAIN[5]
  ];
  /* PC 이동 키 묶음(x 15.25부터 3칸) */
  var PC_NAV = [
    { y: 0, keys: [k('PrintScreen'), k('ScrollLock'), k('Pause')] },
    { y: 1.5, keys: [k('Insert'), k('Home'), k('PageUp')] },
    { y: 2.5, keys: [k('Delete'), k('End'), k('PageDown')] },
    { y: 4.5, keys: [1, k('ArrowUp')] },
    { y: 5.5, keys: [k('ArrowLeft'), k('ArrowDown'), k('ArrowRight')] }
  ];
  /* 숫자판(x 18.5부터 4칸). 더하기·엔터는 두 줄 높이, 0은 두 칸 너비 */
  var PC_NUMPAD = [
    { y: 1.5, keys: [k('NumLock'), k('NumpadDivide'), k('NumpadMultiply'), k('NumpadSubtract')] },
    { y: 2.5, keys: [k('Numpad7'), k('Numpad8'), k('Numpad9'), k('NumpadAdd', 1, 2)] },
    { y: 3.5, keys: [k('Numpad4'), k('Numpad5'), k('Numpad6')] },
    { y: 4.5, keys: [k('Numpad1'), k('Numpad2'), k('Numpad3'), k('NumpadEnter', 1, 2)] },
    { y: 5.5, keys: [k('Numpad0', 2), k('NumpadDecimal')] }
  ];
  /* 맥(매직 키보드·맥북 꼴, 너비 14.5). Fn과 잠금 키는 브라우저가 못 받는다(undetectable). 화살표 위·아래는 반 높이 */
  var MAC_MAIN = [
    { y: 0, keys: [k('Escape', 1.5)].concat(fkeys(1, 12), [k('Power')]) },
    { y: 1.25, keys: [k('Backquote')].concat(DIGITS, [k('Minus'), k('Equal'), k('Backspace', 1.5)]) },
    { y: 2.25, keys: [k('Tab', 1.5)].concat(LETTERS_1, [k('BracketLeft'), k('BracketRight'), k('Backslash')]) },
    { y: 3.25, keys: [k('CapsLock', 1.75)].concat(LETTERS_2, [k('Semicolon'), k('Quote'), k('Enter', 1.75)]) },
    { y: 4.25, keys: [k('ShiftLeft', 2.25)].concat(LETTERS_3, [k('Comma'), k('Period'), k('Slash'), k('ShiftRight', 2.25)]) },
    { y: 5.25, keys: [k('Fn'), k('ControlLeft'), k('AltLeft'), k('MetaLeft', 1.25), k('Space', 5), k('MetaRight', 1.25), k('AltRight'), k('ArrowLeft'), { code: 'ArrowUp', w: 1, h: 0.5, stack: 'ArrowDown' }, k('ArrowRight')] }
  ];
  var UNDETECTABLE = { Fn: 1, Power: 1 };

  var DEFS = {
    full: { blocks: [[0, PC_MAIN], [15.25, PC_NAV], [18.5, PC_NUMPAD]], width: 22.5, height: 6.5, os: 'pc' },
    iso: { blocks: [[0, ISO_MAIN], [15.25, PC_NAV], [18.5, PC_NUMPAD]], width: 22.5, height: 6.5, os: 'pc' },
    tkl: { blocks: [[0, PC_MAIN], [15.25, PC_NAV]], width: 18.25, height: 6.5, os: 'pc' },
    mac: { blocks: [[0, MAC_MAIN]], width: 14.5, height: 6.25, os: 'mac' }
  };
  CK.LAYOUT_IDS = ['full', 'iso', 'tkl', 'mac'];
  /* 처음 보일 배열: 기기 이름(navigator.platform 또는 userAgentData.platform)에 Mac·iPhone·iPad가 있으면 맥 배열 */
  CK.defaultLayout = function (platform) {
    return /mac|iphone|ipad|ipod/i.test(String(platform || '')) ? 'mac' : 'full';
  };

  var cache = {};
  /* 배열 하나를 자리 잡힌 키 목록으로 푼다. */
  CK.layout = function (id) {
    if (cache[id]) return cache[id];
    var def = DEFS[id];
    if (!def) return null;
    var keys = [], index = {};
    def.blocks.forEach(function (b) {
      var x0 = b[0];
      b[1].forEach(function (row) {
        var x = x0;
        row.keys.forEach(function (item) {
          if (typeof item === 'number') { x += item; return; }
          var key = { code: item.code, x: x, y: row.y, w: item.w, h: item.h, detectable: !UNDETECTABLE[item.code] };
          if (item.ext) key.ext = { x: x + item.ext.dx, y: row.y, w: item.ext.w, h: item.ext.h };
          keys.push(key); index[key.code] = key;
          if (item.stack) {
            var below = { code: item.stack, x: x, y: row.y + item.h, w: item.w, h: item.h, detectable: true };
            keys.push(below); index[below.code] = below;
          }
          x += item.w;
        });
      });
    });
    var out = { id: id, os: def.os, width: def.width, height: def.height, keys: keys, index: index,
      total: keys.length, detectable: keys.filter(function (q) { return q.detectable; }).length };
    cache[id] = out;
    return out;
  };

  /* 다른 이름으로 들어오는 같은 키. 옛 파이어폭스는 윈도우 키를 OSLeft·OSRight로 보낸다.
     한국어 자판: 한/영은 Lang1 또는 key 'HangulMode', 한자는 Lang2 또는 key 'HanjaMode'로 온다.
     PC 배열에서는 오른쪽 Alt·오른쪽 Ctrl 자리가 그 키다(따로 달린 106키는 같은 자리에 겹쳐 켜진다: via 값으로 알린다). */
  var CODE_ALIAS = { OSLeft: 'MetaLeft', OSRight: 'MetaRight' };
  var PC_LANG = { Lang1: 'AltRight', Lang2: 'ControlRight' };
  var PC_KEY_LANG = { HangulMode: 'AltRight', HanjaMode: 'ControlRight' };

  /* 돌려주는 값: { slot: 배열 안 code 또는 null, via: 'code'|'alias'|'lang'|'key'|null, extra: 배열 밖 키 이름 또는 null }
     code가 비었거나 'Unidentified'이고 key로도 못 찾으면 extra에 key(없으면 'Unidentified')를 담는다. */
  CK.resolveKey = function (layoutId, code, key) {
    var lay = CK.layout(layoutId);
    if (!lay) return { slot: null, via: null, extra: code || key || 'Unidentified' };
    code = code || ''; key = key || '';
    if (code && code !== 'Unidentified') {
      if (lay.os === 'pc' && PC_KEY_LANG[key] && lay.index[PC_KEY_LANG[key]] && (code === 'AltRight' || code === 'ControlRight' || PC_LANG[code])) {
        return { slot: PC_KEY_LANG[key], via: code === PC_KEY_LANG[key] ? 'code' : 'lang', extra: null };
      }
      if (lay.index[code]) return { slot: code, via: 'code', extra: null };
      if (CODE_ALIAS[code] && lay.index[CODE_ALIAS[code]]) return { slot: CODE_ALIAS[code], via: 'alias', extra: null };
      if (lay.os === 'pc' && PC_LANG[code] && lay.index[PC_LANG[code]]) return { slot: PC_LANG[code], via: 'lang', extra: null };
      return { slot: null, via: null, extra: code };
    }
    if (lay.os === 'pc' && PC_KEY_LANG[key]) return { slot: PC_KEY_LANG[key], via: 'key', extra: null };
    return { slot: null, via: null, extra: key && key !== 'Unidentified' ? 'key:' + key : 'Unidentified' };
  };

  /* 이 code를 가진 배열들(숫자판 키를 눌렀는데 텐키리스를 골랐을 때 '풀 배열로 바꿀까요'를 묻는 데 쓴다) */
  CK.layoutsWith = function (code) {
    return CK.LAYOUT_IDS.filter(function (id) { return !!CK.layout(id).index[code]; });
  };

  /* 아직 한 번도 안 눌린 키(브라우저가 못 받는 키는 뺀다). pressed: Set 또는 배열 또는 {code:true} */
  CK.untested = function (layoutId, pressed) {
    var lay = CK.layout(layoutId);
    if (!lay) return [];
    var has = toHas(pressed);
    return lay.keys.filter(function (q) { return q.detectable && !has(q.code); }).map(function (q) { return q.code; });
  };
  CK.progress = function (layoutId, pressed) {
    var lay = CK.layout(layoutId);
    if (!lay) return { done: 0, total: 0, left: 0, all: false };
    var left = CK.untested(layoutId, pressed).length;
    return { done: lay.detectable - left, total: lay.detectable, left: left, all: left === 0 };
  };
  function toHas(p) {
    if (!p) return function () { return false; };
    if (typeof p.has === 'function') return function (c) { return p.has(c); };
    if (Array.isArray(p)) return function (c) { return p.indexOf(c) !== -1; };
    return function (c) { return !!p[c]; };
  }

  /* ── 키 기록 ──────────────────────────────────────────
     id는 무엇이든 된다(키는 slot 이름, 마우스 단추는 'mouse0' 등).
     t는 밀리초(이벤트의 timeStamp). 시간이 거꾸로 가거나 숫자가 아니면 그 간격은 재지 않는다. */
  var MODS = { MetaLeft: 1, MetaRight: 1 };
  CK.createTracker = function (opts) {
    opts = opts || {};
    var chatterMs = clampChatter(opts.chatterMs == null ? CK.KEY_CHATTER_MS : opts.chatterMs);
    var metaClears = opts.metaClearsHeld !== false;
    var held = {}, heldN = 0, lastUp = {}, stats = {}, seen = {}, seenN = 0;
    var maxHeld = 0, maxHeldIds = [], presses = 0;

    function st(id) { return stats[id] || (stats[id] = { presses: 0, chatter: 0, minGap: null, gaps: [] }); }
    function heldIds() { return Object.keys(held); }

    var T = {
      /* 눌림. 돌려주는 값: { counted, first, chatter, gap, held } */
      down: function (id, t, repeat) {
        if (repeat) return { counted: false, first: false, chatter: false, gap: null, held: heldN };
        var s = st(id), gap = null, chatter = false, first = !seen[id];
        if (first) { seen[id] = 1; seenN++; }
        if (held[id] == null) {
          held[id] = t; heldN++;
          if (lastUp[id] != null && isNum(t) && t >= lastUp[id]) {
            gap = t - lastUp[id];
            if (s.minGap == null || gap < s.minGap) s.minGap = gap;
            if (gap < chatterMs) { chatter = true; s.chatter++; s.gaps.push(gap); }
          }
        } else {
          held[id] = t;   // 뗌 없이 다시 눌림(창을 벗어났다 온 경우 등): 간격은 알 수 없다
        }
        s.presses++; presses++;
        if (heldN > maxHeld) { maxHeld = heldN; maxHeldIds = heldIds(); }
        return { counted: true, first: first, chatter: chatter, gap: gap, held: heldN };
      },
      /* 뗌. 맥은 Command를 누른 동안 다른 키의 뗌이 안 온다 → Command를 떼면 눌린 것으로 남은 키를 지운다 */
      up: function (id, t) {
        if (held[id] != null) { delete held[id]; heldN--; lastUp[id] = t; }
        if (metaClears && MODS[id]) {
          heldIds().forEach(function (h) { if (!MODS[h]) { delete held[h]; heldN--; } });
        }
        return { held: heldN };
      },
      /* 창이 초점을 잃음: 뗌을 못 받으니 눌린 키를 비운다(채터링 간격에도 쓰지 않는다) */
      blur: function () { held = {}; heldN = 0; lastUp = {}; },
      setChatterMs: function (ms) { chatterMs = clampChatter(ms); return chatterMs; },
      chatterMs: function () { return chatterMs; },
      /* 지금 눌린 채인 키와 눌린 시간. minMs를 주면 그보다 오래 눌린 것만 */
      heldKeys: function (now, minMs) {
        return heldIds().map(function (id) { return { id: id, ms: isNum(now) && isNum(held[id]) ? Math.max(0, now - held[id]) : 0 }; })
          .filter(function (h) { return minMs == null || h.ms >= minMs; })
          .sort(function (a, b) { return b.ms - a.ms || (a.id < b.id ? -1 : 1); });
      },
      isHeld: function (id) { return held[id] != null; },
      heldCount: function () { return heldN; },
      seen: function () { return Object.keys(seen); },
      seenCount: function () { return seenN; },
      hasSeen: function (id) { return !!seen[id]; },
      maxHeld: function () { return maxHeld; },
      maxHeldIds: function () { return maxHeldIds.slice(); },
      presses: function () { return presses; },
      stat: function (id) { var s = stats[id]; return s ? { presses: s.presses, chatter: s.chatter, minGap: s.minGap, gaps: s.gaps.slice() } : null; },
      /* 채터링 의심 키: 많이 걸린 순, 같으면 가장 짧은 간격 순 */
      suspects: function () {
        return Object.keys(stats).filter(function (id) { return stats[id].chatter > 0; })
          .map(function (id) { var s = stats[id]; return { id: id, count: s.chatter, presses: s.presses, minGap: Math.min.apply(null, s.gaps) }; })
          .sort(function (a, b) { return b.count - a.count || a.minGap - b.minGap || (a.id < b.id ? -1 : 1); });
      },
      reset: function () { held = {}; heldN = 0; lastUp = {}; stats = {}; seen = {}; seenN = 0; maxHeld = 0; maxHeldIds = []; presses = 0; }
    };
    return T;
  };
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function clampChatter(ms) {
    ms = Number(ms);
    if (!isFinite(ms)) return CK.KEY_CHATTER_MS;
    return Math.min(CK.CHATTER_MAX_MS, Math.max(CK.CHATTER_MIN_MS, ms));
  }
  CK.clampChatterMs = clampChatter;

  /* 이벤트 목록을 한 번에: [{ id, type: 'down'|'up'|'blur', t, repeat }] → 요약 */
  CK.analyzeKeyEvents = function (events, opts) {
    var T = CK.createTracker(opts);
    (events || []).forEach(function (e) {
      if (e.type === 'down') T.down(e.id, e.t, !!e.repeat);
      else if (e.type === 'up') T.up(e.id, e.t);
      else if (e.type === 'blur') T.blur();
    });
    var last = events && events.length ? events[events.length - 1].t : 0;
    return { presses: T.presses(), seen: T.seen().sort(), maxHeld: T.maxHeld(), maxHeldIds: T.maxHeldIds().sort(),
      suspects: T.suspects(), held: T.heldKeys(last), chatterMs: T.chatterMs() };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CK;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
