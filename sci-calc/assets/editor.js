/* 자연 표시 편집기 (ME): 분수는 위아래로, 루트는 지붕을 씌워, 지수는 위에 작게 보이며 입력한다.
 * 식 모양은 engine.js 의 줄(row)·마디와 같다. 화면 그리기 + 커서 + 키 처리만 한다.
 */
(function (root) {
'use strict';
var SC = root.SC;
var SLOTS = SC.TEMPLATE_SLOTS;
// 위·아래 화살표로 옮겨 갈 칸
var UPDOWN = {
  frac: { a: { down: 'b' }, b: { up: 'a' } },
  root: { a: { up: 'n' }, n: { down: 'a' } },
  log: { a: { down: 'n' }, n: { up: 'a' } },
  int: { a: { up: 'hi', down: 'lo' }, lo: { up: 'hi' }, hi: { down: 'lo' } },
  sum: { a: { up: 'hi', down: 'lo' }, lo: { up: 'hi' }, hi: { down: 'lo' } },
  prd: { a: { up: 'hi', down: 'lo' }, lo: { up: 'hi' }, hi: { down: 'lo' } },
  der: { a: { down: 'at' }, at: { up: 'a' } },
  mixed: { a: { down: 'b' }, b: { up: 'a' }, w: {} }
};
var FN_LABEL = { asin: 'sin⁻¹', acos: 'cos⁻¹', atan: 'tan⁻¹', asinh: 'sinh⁻¹', acosh: 'cosh⁻¹', atanh: 'tanh⁻¹', Ran: 'Ran#', RanInt: 'RanInt#' };
var OPS = { '+': 1, '−': 1, '×': 1, '÷': 1, '=': 1, '÷R': 1, 'P': 1, 'C': 1, '∠': 1 };
// 한글 자판 → 영문 자판 (한/영 전환을 안 해도 함수 이름이 쳐지게)
var JAMO = { 'ㅂ': 'q', 'ㅈ': 'w', 'ㄷ': 'e', 'ㄱ': 'r', 'ㅅ': 't', 'ㅛ': 'y', 'ㅕ': 'u', 'ㅑ': 'i', 'ㅐ': 'o', 'ㅔ': 'p',
  'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd', 'ㄹ': 'f', 'ㅎ': 'g', 'ㅗ': 'h', 'ㅓ': 'j', 'ㅏ': 'k', 'ㅣ': 'l',
  'ㅋ': 'z', 'ㅌ': 'x', 'ㅊ': 'c', 'ㅍ': 'v', 'ㅠ': 'b', 'ㅜ': 'n', 'ㅡ': 'm' };

function h(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ---------------------------------------------------------------- 그리기
// ctx: {cursor:{row,i}|null, placeholders:bool, map:true면 클릭 위치 기록}
function renderRow(row, ctx, top) {
  var el = h('span', 'mrow' + (top ? ' mtop' : ''));
  el.__row = row;
  if (!row.length) {
    if (!top || ctx.placeholders === 'always') {
      var ph = h('span', 'mph'); ph.__row = row; ph.__i = 0; el.appendChild(ph);
    }
  }
  for (var i = 0; i <= row.length; i++) {
    if (ctx.cursor && ctx.cursor.row === row && ctx.cursor.i === i) el.appendChild(cursorEl());
    if (i === row.length) break;
    var n = row[i], ne = renderNode(n, ctx, row, i);
    ne.__row = row; ne.__i = i;
    el.appendChild(ne);
  }
  return el;
}
function cursorEl() { var c = h('span', 'mcur'); c.setAttribute('aria-hidden', 'true'); return c; }
function slot(n, key, ctx, cls) {
  var s = renderRow(n[key], ctx, false);
  s.className += ' ' + cls;
  return s;
}
function renderNode(n, ctx, row, i) {
  var e;
  switch (n.t) {
    case 'c': {
      var v = n.v;
      if (v === 'C_') return h('span', 'mc mvar', 'C');
      if (v === 'ᴇ') return h('span', 'mc mE', '×₁₀');
      var cls = 'mc';
      if (OPS[v]) cls += ' mop';
      else if (/^[A-DMxy]$/.test(v) || v === 'e' || v === 'i') cls += ' mvar';
      else if (v === 'π') cls += ' mpi';
      else if (v === 'Ans') cls += ' mans';
      else if (v === ',') cls += ' mcomma';
      if (v === 'P' || v === 'C') { e = h('span', 'mc mop mperm', v === 'P' ? 'P' : 'C'); return e; }
      return h('span', cls, v === '÷R' ? '÷R' : v);
    }
    case 'l': return h('span', 'mc mvar mraw', n.v);
    case 'f': return h('span', 'mfn', FN_LABEL[n.v] || n.v);
    case 'k': {
      var c = SC.CONST_MAP[n.v];
      e = h('span', 'mk');
      e.appendChild(h('span', 'mk-s', c.sym));
      if (c.sub) e.appendChild(h('sub', 'mk-sub', c.sub));
      return e;
    }
    case 'u': {
      var cv = SC.CONV_MAP[n.v];
      return h('span', 'mu', cv.from + '▶' + cv.to);
    }
    case 'frac':
      e = h('span', 'mfrac');
      e.appendChild(slot(n, 'a', ctx, 'mnum'));
      e.appendChild(slot(n, 'b', ctx, 'mden'));
      return e;
    case 'mixed':
      e = h('span', 'mmixed');
      e.appendChild(slot(n, 'w', ctx, 'mwhole'));
      var f = h('span', 'mfrac');
      f.appendChild(slot(n, 'a', ctx, 'mnum')); f.appendChild(slot(n, 'b', ctx, 'mden'));
      e.appendChild(f);
      return e;
    case 'sqrt':
      e = h('span', 'msqrt');
      e.appendChild(h('span', 'mrad', '√'));
      e.appendChild(slot(n, 'a', ctx, 'mrad-in'));
      return e;
    case 'root':
      e = h('span', 'msqrt mroot');
      e.appendChild(slot(n, 'n', ctx, 'mroot-n'));
      e.appendChild(h('span', 'mrad', '√'));
      e.appendChild(slot(n, 'a', ctx, 'mrad-in'));
      return e;
    case 'pow':
      e = h('span', 'msup');
      e.appendChild(slot(n, 'a', ctx, 'msup-in'));
      return e;
    case 'abs':
      e = h('span', 'mabs');
      e.appendChild(slot(n, 'a', ctx, 'mabs-in'));
      return e;
    case 'log':
      e = h('span', 'mlog');
      e.appendChild(h('span', 'mfn', 'log'));
      e.appendChild(slot(n, 'n', ctx, 'msub-in'));
      e.appendChild(h('span', 'mparen', '('));
      e.appendChild(slot(n, 'a', ctx, 'mlog-in'));
      e.appendChild(h('span', 'mparen', ')'));
      return e;
    case 'int':
      e = h('span', 'mbig mint');
      var lim = h('span', 'mlim');
      lim.appendChild(slot(n, 'hi', ctx, 'mlim-hi'));
      lim.appendChild(h('span', 'mbig-sym', '∫'));
      lim.appendChild(slot(n, 'lo', ctx, 'mlim-lo'));
      e.appendChild(lim);
      e.appendChild(slot(n, 'a', ctx, 'mbody'));
      e.appendChild(h('span', 'mdx', 'dx'));
      return e;
    case 'sum': case 'prd':
      e = h('span', 'mbig msum');
      var l2 = h('span', 'mlim mlim-c');
      l2.appendChild(slot(n, 'hi', ctx, 'mlim-hi'));
      l2.appendChild(h('span', 'mbig-sym', n.t === 'sum' ? 'Σ' : 'Π'));
      var lo = h('span', 'mlim-lo mlim-eq');
      lo.appendChild(h('span', 'mvar', 'x'));
      lo.appendChild(h('span', 'mc', '='));
      lo.appendChild(renderRow(n.lo, ctx, false));
      l2.appendChild(lo);
      e.appendChild(l2);
      e.appendChild(h('span', 'mparen', '('));
      e.appendChild(slot(n, 'a', ctx, 'mbody'));
      e.appendChild(h('span', 'mparen', ')'));
      return e;
    case 'der':
      e = h('span', 'mder');
      var df = h('span', 'mfrac mfrac-sm');
      var dn = h('span', 'mrow mnum'); dn.textContent = 'd';
      var dd = h('span', 'mrow mden'); dd.textContent = 'dx';
      df.appendChild(dn); df.appendChild(dd);
      e.appendChild(df);
      e.appendChild(h('span', 'mparen', '('));
      e.appendChild(slot(n, 'a', ctx, 'mbody'));
      e.appendChild(h('span', 'mparen', ')'));
      var at = h('span', 'mat');
      at.appendChild(h('span', 'mat-bar'));
      var atl = h('span', 'mat-lo');
      atl.appendChild(h('span', 'mvar', 'x'));
      atl.appendChild(h('span', 'mc', '='));
      atl.appendChild(renderRow(n.at, ctx, false));
      at.appendChild(atl);
      e.appendChild(at);
      return e;
  }
  return h('span', 'mc', '?');
}
function render(row, el, opts) {
  opts = opts || {};
  el.textContent = '';
  el.appendChild(renderRow(row, { cursor: opts.cursor || null, placeholders: opts.placeholders }, true));
}

// ---------------------------------------------------------------- 편집기
function Editor(el, opts) {
  this.el = el;
  this.opts = opts || {};
  this.row = [];
  this.cur = { row: this.row, i: 0 };
  var self = this;
  el.addEventListener('pointerdown', function (ev) { self.clickAt(ev); });
}
Editor.prototype.draw = function () {
  render(this.row, this.el, { cursor: this.cur });
  var c = this.el.querySelector('.mcur');
  // 커서가 보이게 가로 스크롤
  if (c && this.el.scrollWidth > this.el.clientWidth) {
    var r = c.getBoundingClientRect(), b = this.el.getBoundingClientRect();
    if (r.right > b.right - 8) this.el.scrollLeft += r.right - b.right + 24;
    else if (r.left < b.left + 8) this.el.scrollLeft -= b.left - r.left + 24;
  }
  if (this.opts.onChange) this.opts.onChange(this);
};
Editor.prototype.setRow = function (row) {
  this.row = row; this.cur = { row: row, i: row.length }; this.draw();
};
Editor.prototype.clear = function () { this.setRow([]); };
Editor.prototype.isEmpty = function () { return this.row.length === 0; };
// 줄의 부모 찾기: {node, key, parentRow, index}
Editor.prototype.parentOf = function (target) {
  function walk(row) {
    for (var i = 0; i < row.length; i++) {
      var n = row[i];
      var slots = SLOTS[n.t];
      if (!slots) continue;
      for (var k = 0; k < slots.length; k++) {
        if (n[slots[k]] === target) return { node: n, key: slots[k], parentRow: row, index: i };
        var r = walk(n[slots[k]]); if (r) return r;
      }
    }
    return null;
  }
  return walk(this.row);
};
Editor.prototype.slotOrder = function (n) {
  // 오른쪽으로 갈 때 칸 순서 (Σ·∫ 은 본문 먼저, 그다음 아래·위 끝)
  if (n.t === 'int' || n.t === 'sum' || n.t === 'prd') return ['a', 'lo', 'hi'];
  return SLOTS[n.t];
};
Editor.prototype.firstSlot = function (n) {
  if (n.t === 'int' || n.t === 'sum' || n.t === 'prd') return 'a';
  if (n.t === 'root') return 'n';
  return this.slotOrder(n)[0];
};
Editor.prototype.left = function () {
  var c = this.cur;
  if (c.i > 0) {
    var n = c.row[c.i - 1];
    if (SLOTS[n.t]) { var ord = this.slotOrder(n), k = ord[ord.length - 1]; this.cur = { row: n[k], i: n[k].length }; }
    else this.cur = { row: c.row, i: c.i - 1 };
  } else {
    var p = this.parentOf(c.row);
    if (!p) return false;
    var ord2 = this.slotOrder(p.node), idx = ord2.indexOf(p.key);
    if (idx > 0) { var pk = p.node[ord2[idx - 1]]; this.cur = { row: pk, i: pk.length }; }
    else this.cur = { row: p.parentRow, i: p.index };
  }
  this.draw(); return true;
};
Editor.prototype.right = function () {
  var c = this.cur;
  if (c.i < c.row.length) {
    var n = c.row[c.i];
    if (SLOTS[n.t]) { var k = this.slotOrder(n)[0]; this.cur = { row: n[k], i: 0 }; }
    else this.cur = { row: c.row, i: c.i + 1 };
  } else {
    var p = this.parentOf(c.row);
    if (!p) return false;
    var ord = this.slotOrder(p.node), idx = ord.indexOf(p.key);
    if (idx < ord.length - 1) this.cur = { row: p.node[ord[idx + 1]], i: 0 };
    else this.cur = { row: p.parentRow, i: p.index + 1 };
  }
  this.draw(); return true;
};
Editor.prototype.vertical = function (dir) {
  var r = this.cur.row;
  for (;;) {
    var p = this.parentOf(r);
    if (!p) return false;
    var map = UPDOWN[p.node.t], to = map && map[p.key] && map[p.key][dir];
    if (to) { var tr = p.node[to]; this.cur = { row: tr, i: Math.min(this.cur.i, tr.length) }; if (r !== this.cur.row) this.cur.i = tr.length; this.draw(); return true; }
    r = p.parentRow;
  }
};
Editor.prototype.home = function () { this.cur = { row: this.row, i: 0 }; this.draw(); };
Editor.prototype.end = function () { this.cur = { row: this.row, i: this.row.length }; this.draw(); };
Editor.prototype.insertNode = function (n) {
  this.cur.row.splice(this.cur.i, 0, n);
  this.cur = { row: this.cur.row, i: this.cur.i + 1 };
};
// 글자 하나
Editor.prototype.insertChar = function (v) { this.insertNode({ t: 'c', v: v }); this.draw(); };
Editor.prototype.insertFn = function (name) {
  this.insertNode({ t: 'f', v: name });
  if (name !== 'Ran') this.insertNode({ t: 'c', v: '(' });
  this.draw();
};
// 앞의 덩어리(숫자·괄호·함수 호출)를 잡아 분자로
Editor.prototype.takeOperand = function () {
  var row = this.cur.row, i = this.cur.i, j = i;
  var stop = { '+': 1, '−': 1, '×': 1, '÷': 1, ',': 1, '(': 1, '÷R': 1, 'P': 1, 'C': 1, '∠': 1, '=': 1 };
  while (j > 0) {
    var n = row[j - 1];
    if (n.t === 'c' && n.v === ')') {
      var depth = 0, k = j - 1;
      for (; k >= 0; k--) {
        var m = row[k];
        if (m.t === 'c' && m.v === ')') depth++;
        else if (m.t === 'c' && m.v === '(') { depth--; if (depth === 0) break; }
      }
      if (k < 0) break;
      j = k;
      if (j > 0 && row[j - 1].t === 'f') j--;
      continue;
    }
    if (n.t === 'c' && stop[n.v]) break;
    if (n.t === 'f') break;
    j--;
  }
  var taken = row.splice(j, i - j);
  this.cur = { row: row, i: j };
  return taken;
};
// 틀 넣기. grab: 앞 덩어리를 첫 칸으로(분수)
Editor.prototype.insertTemplate = function (t, preset) {
  var n = SC.makeTemplate(t);
  if (preset) for (var k in preset) n[k] = preset[k];
  var target = this.firstSlot(n);
  if (t === 'frac' && !preset) {
    var g = this.takeOperand();
    if (g.length) { n.a = g; target = 'b'; }
  }
  this.insertNode(n);
  if (t === 'pow' && preset) { this.draw(); return; }        // x², x⁻¹ 는 커서를 뒤로
  this.cur = { row: n[target], i: n[target].length };
  this.draw();
};
// 지우기
Editor.prototype.backspace = function () {
  var c = this.cur;
  if (c.i > 0) {
    var n = c.row[c.i - 1];
    if (SLOTS[n.t]) {
      var empty = SLOTS[n.t].every(function (k) { return n[k].length === 0; });
      if (empty || n.t === 'pow' && n.a.length <= 2) { c.row.splice(c.i - 1, 1); this.cur = { row: c.row, i: c.i - 1 }; }
      else { var ord = this.slotOrder(n), k = ord[ord.length - 1]; this.cur = { row: n[k], i: n[k].length }; }
    } else {
      c.row.splice(c.i - 1, 1);
      this.cur = { row: c.row, i: c.i - 1 };
      // 함수 이름 뒤 '(' 를 지우면 함수 이름도 같이
      if (n.t === 'c' && n.v === '(' && c.i - 2 >= 0 && c.row[c.i - 2] && c.row[c.i - 2].t === 'f') {
        c.row.splice(c.i - 2, 1); this.cur = { row: c.row, i: c.i - 2 };
      }
    }
    this.draw(); return;
  }
  var p = this.parentOf(c.row);
  if (!p) return;
  var all = SLOTS[p.node.t].every(function (k) { return p.node[k].length === 0; });
  if (all) { p.parentRow.splice(p.index, 1); this.cur = { row: p.parentRow, i: p.index }; }
  else {
    // 틀을 풀어 안의 글자를 밖으로 (분수 → a÷b, 루트·지수 → 안의 것)
    var ord = this.slotOrder(p.node), idx = ord.indexOf(p.key);
    if (idx > 0) { var pr = p.node[ord[idx - 1]]; this.cur = { row: pr, i: pr.length }; }
    else {
      var flat = [];
      ord.forEach(function (k, j) { if (j && p.node.t === 'frac') flat.push({ t: 'c', v: '÷' }); flat = flat.concat(p.node[k]); });
      var args = [p.index, 1].concat(flat);
      Array.prototype.splice.apply(p.parentRow, args);
      this.cur = { row: p.parentRow, i: p.index };
    }
  }
  this.draw();
};
Editor.prototype.del = function () {
  var c = this.cur;
  if (c.i < c.row.length) { if (this.right() !== false) this.backspace(); }
};
// 키보드 영문자: 함수 이름이 되면 바꾼다 (sin, sqrt, pi …)
Editor.prototype.typeLetter = function (ch) {
  var row = this.cur.row;
  this.insertNode({ t: 'l', v: ch });
  var i = this.cur.i;
  // 끝에서부터 이어진 글자(+ 바로 앞 함수 이름)를 모아 가장 긴 이름부터 맞춰 본다
  var j = i, letters = '';
  while (j > 0 && row[j - 1].t === 'l') { j--; letters = row[j].v + letters; }
  var withFn = null, fnAt = -1;
  if (j > 0 && row[j - 1].t === 'f') fnAt = j - 1;
  else if (j > 1 && row[j - 1].auto && row[j - 2].t === 'f') fnAt = j - 2;     // sin( 뒤에 h → sinh
  if (fnAt >= 0) withFn = row[fnAt].v.toLowerCase() + letters;
  var hit = null;
  if (withFn && SC.NAME_ALIASES[withFn]) hit = { from: fnAt, name: SC.NAME_ALIASES[withFn] };
  else {
    for (var s = 0; s < letters.length; s++) {
      var cand = letters.slice(s).toLowerCase();
      if (cand.length >= 2 && SC.NAME_ALIASES[cand]) { hit = { from: j + s, name: SC.NAME_ALIASES[cand] }; break; }
    }
  }
  if (hit) {
    row.splice(hit.from, i - hit.from);
    this.cur = { row: row, i: hit.from };
    if (hit.name === '#π') this.insertNode({ t: 'c', v: 'π' });
    else if (hit.name === '#Ans') this.insertNode({ t: 'c', v: 'Ans' });
    else if (hit.name === '#sqrt') { var n = SC.makeTemplate('sqrt'); this.insertNode(n); this.cur = { row: n.a, i: 0 }; this.pendParen = n.a; }
    else if (hit.name === '#abs') { var a = SC.makeTemplate('abs'); this.insertNode(a); this.cur = { row: a.a, i: 0 }; this.pendParen = a.a; }
    else {
      // 키로 누른 함수처럼 ( 까지 넣는다. 바로 이어 ( 를 치면 그건 넣지 않는다
      this.insertNode({ t: 'f', v: hit.name });
      if (hit.name !== 'Ran') { this.insertNode({ t: 'c', v: '(', auto: true }); this.pendFnParen = { row: this.cur.row, i: this.cur.i }; }
    }
  }
  this.draw();
};
// 줄 안에서 아직 닫히지 않은 ( 개수
Editor.prototype.openParens = function (row) {
  var d = 0;
  row.forEach(function (n) { if (n.t === 'c' && n.v === '(') d++; if (n.t === 'c' && n.v === ')') d--; });
  return d;
};
// 커서가 지수 칸 바로 안에 있는가
Editor.prototype.inExponent = function () {
  var p = this.parentOf(this.cur.row);
  return !!(p && p.node.t === 'pow');
};
// 키보드로 친 ^ / 의 마지막 칸(지수·분모): 글자 식처럼 다음 연산 기호나 짝 없는 ) 에서 칸을 나온다
// (2^10*3 → 2¹⁰×3, 1/2+1/3 → ½+⅓). 화면 키로 만든 칸은 카시오처럼 그대로 둔다
Editor.prototype.markKbSlot = function () {
  var p = this.parentOf(this.cur.row);
  if (p) { p.node.kb = 1; this.draw(); }
};
Editor.prototype.leaveKbSlot = function (once) {
  for (;;) {
    var r = this.cur.row, p = this.parentOf(r);
    if (!p || !p.node.kb || !r.length || this.cur.i !== r.length || this.openParens(r) > 0) return;
    var ord = this.slotOrder(p.node);
    if (ord[ord.length - 1] !== p.key) return;
    this.cur = { row: p.parentRow, i: p.index + 1 };
    if (once) return;
  }
};
// 실제 키보드
Editor.prototype.handleKey = function (ev) {
  if (ev.key !== '(') { this.pendParen = null; this.pendFnParen = null; }
  var k = ev.key;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
  if (JAMO[k]) k = JAMO[k];
  // 한글 입력기가 켜져 있으면 key 가 'Process' 로 오기도 한다: 자판 위치(code)로 영문 글자를 읽는다
  if ((k === 'Process' || k === 'Unidentified' || /[\u3131-\u318e\uac00-\ud7a3]/.test(k)) && /^Key[A-Z]$/.test(ev.code || '')) {
    k = ev.shiftKey ? ev.code.charAt(3) : ev.code.charAt(3).toLowerCase();
  }
  if (/^[0-9.]$/.test(k)) { this.insertChar(k); return true; }
  // 숫자 바로 뒤의 E 는 ×10ⁿ, C·P 는 조합·순열(6.02E23, 10C3). 소문자 e 는 그대로 상수 e
  var prev = this.cur.i > 0 ? this.cur.row[this.cur.i - 1] : null;
  var afterNum = prev && prev.t === 'c' && /^[0-9.)]$/.test(prev.v);
  if (afterNum && k === 'E' && prev.v !== ')') { this.insertChar('ᴇ'); return true; }
  if (afterNum && (k === 'C' || k === 'P')) { this.leaveKbSlot(); this.insertChar(k); return true; }
  switch (k) {
    case '+': this.leaveKbSlot(); this.insertChar('+'); return true;
    case '-': this.leaveKbSlot(); this.insertChar('−'); return true;
    case '*': this.leaveKbSlot(); this.insertChar('×'); return true;
    case '/': this.leaveKbSlot(); this.insertTemplate('frac'); this.markKbSlot(); return true;     // 8/2/2 = (8/2)/2, 2^3/2 = 2³/2
    case '^': this.insertTemplate('pow'); this.markKbSlot(); return true;
    case '(':
      if (this.pendFnParen && this.pendFnParen.row === this.cur.row && this.pendFnParen.i === this.cur.i) { this.pendFnParen = null; return true; }
      // sqrt( · abs( 처럼 글자로 쓴 칸 바로 뒤의 ( 는 칸이 괄호 노릇을 하니 넣지 않고, 짝 ) 에서 칸 밖으로 나간다
      if (this.pendParen && this.pendParen === this.cur.row && !this.cur.row.length) { this.parenSlots = (this.parenSlots || []).concat([this.cur.row]); this.pendParen = null; return true; }
      this.insertChar(k); return true;
    case ')':
      var ps = this.parenSlots || [];
      if (ps.length && ps[ps.length - 1] === this.cur.row && this.cur.i === this.cur.row.length && this.openParens(this.cur.row) <= 0) {
        var par = this.parentOf(this.cur.row);
        ps.pop();
        if (par) { this.cur = { row: par.parentRow, i: par.index + 1 }; this.draw(); return true; }
      }
      this.leaveKbSlot(true); this.insertChar(k); return true;
    case ',': this.leaveKbSlot(); this.insertChar(k); return true;
    case '!': case '%': this.insertChar(k); return true;
    case 'ArrowLeft': this.left(); return true;
    case 'ArrowRight': this.right(); return true;
    case 'ArrowUp': if (!this.vertical('up') && this.opts.onHistory) this.opts.onHistory(-1); return true;
    case 'ArrowDown': if (!this.vertical('down') && this.opts.onHistory) this.opts.onHistory(1); return true;
    case 'Home': this.home(); return true;
    case 'End': this.end(); return true;
    case 'Backspace': this.backspace(); return true;
    case 'Delete': this.del(); return true;
  }
  if (/^[a-zA-Z]$/.test(k)) { this.typeLetter(k.toLowerCase() === 'e' && k === 'E' ? 'e' : k); return true; }
  return false;
};
// 화면을 눌러 커서 옮기기
Editor.prototype.clickAt = function (ev) {
  var t = ev.target;
  while (t && t !== this.el && t.__row === undefined) t = t.parentNode;
  if (!t || t === this.el) { this.end(); return; }
  if (t.__i === undefined) {                      // 칸(줄) 자체: 끝으로
    this.cur = { row: t.__row, i: t.__row.length }; this.draw(); return;
  }
  if (t.classList.contains('mph')) { this.cur = { row: t.__row, i: 0 }; this.draw(); return; }
  var r = t.getBoundingClientRect(), right = ev.clientX > r.left + r.width / 2;
  this.cur = { row: t.__row, i: t.__i + (right ? 1 : 0) };
  this.draw();
};

root.ME = { Editor: Editor, render: render, renderRow: renderRow, FN_LABEL: FN_LABEL };
})(window);
