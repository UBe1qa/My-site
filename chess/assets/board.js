/* 체스판 (직접 그림, 라이브러리 없음). 끌기·누르기 두 방식, 화살표(굵기 = 많이 두는 비율), 승진 고르기, 움직임.
   규칙 판단은 밖(chess.js)이 하고, 이 판은 보여 주기와 손 입력만 한다.
   손맛(fx.js가 있으면): 바뀐 말을 보고 수의 종류(보통·잡기·캐슬링·승진·체크)를 알아내 말이 닿는 순간 소리와 효과를 낸다.
   말 자리는 CSS translate 속성으로 둔다(transform이 아니라). 그래야 scale·rotate 효과가 말 제자리를 중심으로 걸린다. */
(function (g) {
  'use strict';
  var FM = g.FM || (g.FM = {});
  var FILES = 'abcdefgh';
  var NS = 'http://www.w3.org/2000/svg';

  function Board(el, opts) {
    this.el = el;
    this.o = opts || {};
    this.orient = this.o.orient || 'w';
    this.pieces = {};          // 칸 → 요소
    this.sel = null;
    this.drag = null;
    this.fen = null;
    this.build();
  }
  Board.prototype.build = function () {
    var el = this.el;
    el.classList.add('bd');
    el.innerHTML = '<div class="bd-hl"></div><div class="bd-co" aria-hidden="true"></div><div class="bd-pc"></div>' +
      '<svg class="bd-ar" viewBox="0 0 800 800" aria-hidden="true"></svg><div class="bd-pr" hidden></div>';
    this.hl = el.querySelector('.bd-hl');
    this.pc = el.querySelector('.bd-pc');
    this.ar = el.querySelector('.bd-ar');
    this.pr = el.querySelector('.bd-pr');
    this.co = el.querySelector('.bd-co');
    this.coords();
    var self = this;
    el.addEventListener('pointerdown', function (e) { self.down(e); });
    el.addEventListener('pointermove', function (e) { self.move(e); });
    el.addEventListener('pointerup', function (e) { self.up(e); });
    el.addEventListener('pointercancel', function () { self.cancelDrag(); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };
  Board.prototype.xy = function (sq) {
    var f = FILES.indexOf(sq[0]), r = +sq[1];
    return this.orient === 'w' ? [f, 8 - r] : [7 - f, r - 1];
  };
  Board.prototype.sqAt = function (x, y) {
    if (x < 0 || y < 0 || x > 7 || y > 7) return null;
    return this.orient === 'w' ? FILES[x] + (8 - y) : FILES[7 - x] + (y + 1);
  };
  Board.prototype.coords = function () {
    var h = '';
    for (var i = 0; i < 8; i++) {
      var file = this.orient === 'w' ? FILES[i] : FILES[7 - i];
      var rank = this.orient === 'w' ? 8 - i : i + 1;
      h += '<span class="cf' + (i % 2 ? ' dk' : '') + '" style="left:' + (i * 12.5) + '%">' + file + '</span>';
      h += '<span class="cr' + (i % 2 ? '' : ' dk') + '" style="top:' + (i * 12.5) + '%">' + rank + '</span>';
    }
    this.co.innerHTML = h;
  };
  Board.prototype.setOrient = function (o) {
    if (o === this.orient) return;
    this.orient = o;
    this.el.setAttribute('data-orient', o);
    this.coords();
    var fen = this.fen; this.fen = null; this.pc.innerHTML = ''; this.pieces = {};
    if (fen) this.set(fen, this.last, this.check, true);
    this.drawArrows(this.arrows || []);
  };
  Board.prototype.place = function (node, sq) {
    var p = this.xy(sq);
    node.style.translate = (p[0] * 100) + '% ' + (p[1] * 100) + '%';
  };
  function parse(fen) {
    var out = {}, rows = fen.split(' ')[0].split('/');
    for (var r = 0; r < 8; r++) {
      var f = 0;
      for (var i = 0; i < rows[r].length; i++) {
        var ch = rows[r][i];
        if (/\d/.test(ch)) { f += +ch; continue; }
        var color = ch === ch.toUpperCase() ? 'w' : 'b';
        out[FILES[f] + (8 - r)] = color + ch.toLowerCase();
        f++;
      }
    }
    return out;
  }
  // fen 으로 말 놓기. 바뀐 말만 옮겨서 움직임이 보이게 한다.
  // quiet: 소리·효과 없이 옮긴다(틀린 수를 되돌릴 때 등)
  Board.prototype.set = function (fen, last, check, instant, quiet) {
    this.clearSel();
    var next = parse(fen), old = this.pieces, keep = {}, gone = [], self = this;
    var movers = [], born = [], feel = !instant && !quiet && this.fen && FM.Sfx;
    var dropped = this.dropped; this.dropped = null;
    Object.keys(old).forEach(function (sq) {
      if (next[sq] === old[sq].dataset.p) keep[sq] = old[sq];
      else gone.push({ sq: sq, node: old[sq] });
    });
    var fresh = {};
    Object.keys(next).forEach(function (sq) {
      if (keep[sq]) { fresh[sq] = keep[sq]; self.place(keep[sq], sq); return; }   // 끌어 놓았다 거절된 말도 제자리로
      // 같은 종류 말 중 가장 가까운 사라진 말을 옮겨 온다
      var best = -1, bd = 99, t = self.xy(sq);
      gone.forEach(function (gp, i) {
        if (!gp.node || gp.node.dataset.p !== next[sq]) return;
        var s = self.xy(gp.sq), d = Math.abs(s[0] - t[0]) + Math.abs(s[1] - t[1]);
        if (d < bd) { bd = d; best = i; }
      });
      var node;
      if (best >= 0 && !instant) { node = gone[best].node; movers.push({ node: node, from: gone[best].sq, to: sq }); gone[best].node = null; }
      else {
        node = document.createElement('i');
        node.className = 'pc ' + next[sq];
        node.dataset.p = next[sq];
        node.style.transition = 'none';
        self.pc.appendChild(node);
        self.place(node, sq);
        void node.offsetWidth;            // 놓인 자리를 먼저 그리게 하고 전환을 되살린다(움16)
        node.style.transition = '';
        if (!instant) born.push({ node: node, sq: sq });
      }
      self.place(node, sq);
      fresh[sq] = node;
    });
    var lost = gone.filter(function (gp) { return gp.node; });
    if (feel && last) this.feel(movers, born, lost, check, dropped && dropped === last[1] ? 0 : 95, next, last);
    else lost.forEach(function (gp) { gp.node.remove(); });
    this.pieces = fresh;
    this.fen = fen;
    this.last = last || null;
    this.check = check || null;
    this.paintHl();
  };
  // ---- 손맛: 수의 종류를 알아내 닿는 순간(ms 뒤) 소리·효과 ----
  var CHIPS = { w: ['#fffdf8', '#efe6d2', '#d2c6ac'], b: ['#2b2d33', '#4b4f59', '#17181c'] };
  var GOLD = ['#f5a300', '#ffcf3f', '#e0661a', '#fff3b3'];
  function after(ms, fn) { if (ms > 0) setTimeout(fn, ms); else fn(); }
  function once(node, cls, ms) {
    node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls);
    setTimeout(function () { node.classList.remove(cls); }, ms);
  }
  Board.prototype.feel = function (movers, born, lost, check, ms, next, last) {
    var self = this, fx = FM.fxOK, mover = next[last[1]] || '', color = mover[0];
    var capt = lost.filter(function (gp) { return gp.node.dataset.p[0] !== color; });
    var promo = born.length === 1 && born[0].sq === last[1] && lost.some(function (gp) { return gp.node.dataset.p === color + 'p'; });
    var kind = 'move';
    if (movers.length + born.length > 2 || lost.length > 2) kind = 'shuffle';
    else if (promo) kind = 'promote';
    else if (movers.length === 2 && movers.some(function (m) { return m.node.dataset.p[1] === 'k'; })) kind = 'castle';
    else if (capt.length) kind = 'capture';
    else if (born.length) kind = 'back';
    FM.Sfx.play(kind, { delay: ms / 1000 });
    if (check) FM.Sfx.play('bell', { delay: ms / 1000 + 0.03 });
    if (!fx) { lost.forEach(function (gp) { gp.node.remove(); }); return; }
    // 미끄러지는 동안 그림자, 캐슬링은 룩이 조금 늦게
    movers.forEach(function (m) {
      m.node.classList.add('mv');
      if (kind === 'castle' && m.node.dataset.p[1] === 'r') {
        m.node.style.transitionDelay = '70ms';
        setTimeout(function () { m.node.style.transitionDelay = ''; }, 400);
      }
    });
    // 승진: 폰이 끝 칸까지 간 뒤 사라지고 새 말이 튀어나온다
    if (kind === 'promote') {
      lost.forEach(function (gp) { if (gp.node.dataset.p === color + 'p') self.place(gp.node, last[1]); });
      born[0].node.classList.add('wait');
    }
    if (kind === 'back') born.forEach(function (b) { once(b.node, 'rise', 260); });
    after(ms, function () {
      movers.forEach(function (m) { m.node.classList.remove('mv'); if (kind !== 'shuffle') once(m.node, 'land', 260); });
      // 잡힌 말은 잡은 말이 온 방향으로 밀려나며 작아진다
      var hit = movers.filter(function (m) { return m.to === last[1]; })[0], ux = 0, uy = 0;
      if (hit) {
        var a = self.xy(hit.from), b2 = self.xy(hit.to), dx = b2[0] - a[0], dy = b2[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
        ux = dx / len; uy = dy / len;
      }
      lost.forEach(function (gp) {
        var n = gp.node;
        n.style.setProperty('--rot', (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 22) + 'deg');
        n.style.setProperty('--dx', (ux * 60).toFixed(0) + '%');
        n.style.setProperty('--dy', (uy * 60).toFixed(0) + '%');
        n.classList.add('out');
        setTimeout(function () { n.remove(); }, 320);
      });
      if (kind === 'capture') {
        var c = capt[0], p = self.xy(c.sq);
        FM.Fx.chips(self.el, p[0], p[1], CHIPS[c.node.dataset.p[0]].concat(['var(--hot)']), 12, 1);
        once(self.el, 'shk', 220);
        FM.Sfx.buzz(12);
      }
      if (kind === 'promote') {
        var b = born[0].node, q = self.xy(last[1]);
        b.classList.remove('wait');
        once(b, 'pop', 420);
        FM.Fx.chips(self.el, q[0], q[1], GOLD, 16, 1.3);
      }
      if (check) after(30, function () { self.ring(check, 'ck'); if (self.pieces[check]) once(self.pieces[check], 'jolt', 420); });
    });
  };
  // 칸에서 퍼지는 고리 하나
  Board.prototype.ring = function (sq, kind) {
    if (!FM.fxOK) return;
    var p = this.xy(sq), i = document.createElement('i');
    i.className = 'ring ' + kind;
    i.style.translate = (p[0] * 100) + '% ' + (p[1] * 100) + '%';
    this.el.appendChild(i);
    setTimeout(function () { i.remove(); }, 700);
  };
  Board.prototype.paintHl = function () {
    var h = '', self = this;
    function box(sq, cls) {
      var p = self.xy(sq);
      h += '<i class="' + cls + '" style="transform:translate(' + (p[0] * 100) + '%,' + (p[1] * 100) + '%)"></i>';
    }
    if (this.last) { box(this.last[0], 'lm'); box(this.last[1], 'lm'); }
    if (this.check) box(this.check, 'ck');
    if (this.sel) {
      box(this.sel, 'sl');
      (this.targets || []).forEach(function (t) { box(t.to, self.pieces[t.to] ? 'tg cap' : 'tg'); });
    }
    if (this.hint) box(this.hint, 'hn');
    this.hl.innerHTML = h;
  };
  // 연습 결과 표시. kind = ok(맞힘) · warn(둘 만한 수) · bad(틀림). o.combo = 연속으로 맞힌 수, o.from = 틀린 말이 돌아간 칸
  Board.prototype.flash = function (sq, kind, o) {
    o = o || {};
    var p = this.xy(sq), i = document.createElement('i'), self = this;
    i.className = 'fl ' + kind;
    i.style.transform = 'translate(' + (p[0] * 100) + '%,' + (p[1] * 100) + '%)';
    this.el.appendChild(i);
    setTimeout(function () { i.remove(); }, 900);
    if (!FM.Sfx) return;
    FM.Sfx.play(kind, { combo: o.combo, delay: kind === 'ok' ? 0.1 : 0 });   // 맞힘 소리는 말 소리 뒤에
    if (kind === 'ok') {
      setTimeout(function () { self.ring(sq, 'ok'); }, 90);
      if (o.combo > 1 && FM.fxOK) {
        var c = document.createElement('b');
        c.className = 'combo';
        c.textContent = '\u00d7' + o.combo;
        c.style.left = ((p[0] + 0.5) * 12.5) + '%';
        c.style.top = (p[1] * 12.5) + '%';
        this.el.appendChild(c);
        setTimeout(function () { c.remove(); }, 900);
      }
    }
    if (kind === 'bad') {
      FM.Sfx.buzz([18, 40, 18]);
      if (o.from) setTimeout(function () { var n = self.pieces[o.from]; if (n && FM.fxOK) once(n, 'wob', 420); }, 200);
    }
  };
  // 줄을 끝냈을 때. perfect = 하나도 안 틀림
  Board.prototype.celebrate = function (perfect) {
    if (!FM.Sfx) return;
    FM.Sfx.play('done', { perfect: perfect });
    FM.Fx.confetti(this.el, perfect ? 56 : 30, ['var(--acc)', 'var(--hot)', 'var(--ok)', '#ffd34d', '#fffdf8']);
    FM.Sfx.buzz(perfect ? [15, 30, 15, 30, 40] : [15, 30, 15]);
  };
  Board.prototype.clearSel = function () {
    if (this.sel && this.pieces[this.sel]) this.pieces[this.sel].classList.remove('lift');
    this.sel = null; this.targets = null;
  };

  // ---- 손 입력 ----
  Board.prototype.evSq = function (e) {
    var r = this.el.getBoundingClientRect(), s = r.width / 8;
    return this.sqAt(Math.floor((e.clientX - r.left) / s), Math.floor((e.clientY - r.top) / s));
  };
  Board.prototype.canMove = function (sq) {
    var p = this.pieces[sq];
    return !!(p && this.o.movable && this.o.movable(p.dataset.p[0]));
  };
  Board.prototype.down = function (e) {
    if (e.button && e.button !== 0) return;
    if (!this.pr.hidden) return;
    var sq = this.evSq(e);
    if (!sq) return;
    if (this.sel && this.targets && this.targets.some(function (t) { return t.to === sq; })) {
      e.preventDefault();
      this.tryMove(this.sel, sq);
      return;
    }
    if (!this.canMove(sq)) { this.clearSel(); this.paintHl(); return; }
    e.preventDefault();
    var wasSel = this.sel === sq;
    if (this.sel && this.sel !== sq && this.pieces[this.sel]) this.pieces[this.sel].classList.remove('lift');
    this.sel = sq;
    if (!wasSel) { this.pieces[sq].classList.add('lift'); if (FM.Sfx) FM.Sfx.play('pick'); }
    this.targets = this.o.legal ? this.o.legal(sq) : [];
    this.paintHl();
    var node = this.pieces[sq], r = this.el.getBoundingClientRect();
    this.drag = { from: sq, node: node, x0: e.clientX, y0: e.clientY, r: r, moved: false, wasSel: wasSel, id: e.pointerId };
    try { this.el.setPointerCapture(e.pointerId); } catch (_) {}
  };
  Board.prototype.move = function (e) {
    var d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    var dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    if (!d.moved) { d.moved = true; d.node.classList.add('drag'); }
    var s = d.r.width / 8;
    var x = e.clientX - d.r.left - s / 2, y = e.clientY - d.r.top - s / 2;
    d.node.style.translate = x + 'px ' + y + 'px';
  };
  Board.prototype.up = function (e) {
    var d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    var sq = this.evSq(e);
    if (d.moved) {
      d.node.classList.remove('drag');
      d.node.style.transition = 'none';
      this.place(d.node, d.from);
      void d.node.offsetWidth;
      d.node.style.transition = '';
      if (sq && sq !== d.from && this.targets && this.targets.some(function (t) { return t.to === sq; })) {
        this.tryMove(d.from, sq, true);
        return;
      }
      if (sq !== d.from) { this.clearSel(); this.paintHl(); }
    } else if (d.wasSel) {
      this.clearSel(); this.paintHl();
    }
  };
  Board.prototype.cancelDrag = function () {
    var d = this.drag;
    if (!d) return;
    this.drag = null;
    d.node.classList.remove('drag');
    this.place(d.node, d.from);
  };
  Board.prototype.tryMove = function (from, to, instant) {
    var opts = (this.targets || []).filter(function (t) { return t.to === to; });
    this.clearSel();
    if (opts.length && opts[0].promotion) { this.askPromo(from, to); return; }
    this.commit({ from: from, to: to }, instant);
  };
  Board.prototype.commit = function (mv, instant) {
    if (instant && this.pieces[mv.from]) {
      // 끌어서 놓은 말은 다시 미끄러지지 않게 바로 놓는다(소리도 바로)
      this.dropped = mv.to;
      var n = this.pieces[mv.from];
      n.style.transition = 'none';
      this.place(n, mv.to);
      void n.offsetWidth;
      n.style.transition = '';
    }
    if (this.o.onMove) this.o.onMove(mv);
    this.paintHl();
  };
  var PROMO = { ko: { q: '퀸', n: '나이트', r: '룩', b: '비숍' }, en: { q: 'Queen', n: 'Knight', r: 'Rook', b: 'Bishop' } };
  Board.prototype.askPromo = function (from, to) {
    var color = this.pieces[from].dataset.p[0], self = this, p = this.xy(to);
    var names = PROMO[(document.documentElement.lang || 'en').slice(0, 2)] || PROMO.en, h = '';
    ['q', 'n', 'r', 'b'].forEach(function (k, i) {
      var y = p[1] === 0 ? i : 7 - i;
      h += '<button type="button" class="pc ' + color + k + '" data-k="' + k + '" style="transform:translate(' + (p[0] * 100) + '%,' + (y * 100) + '%)" aria-label="' + names[k] + '"></button>';
    });
    this.pr.innerHTML = h;
    this.pr.hidden = false;
    // 눌러서 연 고르기 창: 그 누름의 click이 바로 퀸 단추에 떨어지지 않게, 창 안에서 새로 누른 것만 받는다(키보드 Enter는 detail 0)
    var armed = false;
    function close(k) {
      self.pr.hidden = true; self.pr.innerHTML = '';
      self.pr.onpointerdown = self.pr.onclick = null;
      document.removeEventListener('keydown', onKey);
      if (k) self.commit({ from: from, to: to, promotion: k });
      else self.paintHl();
    }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(null); } }
    document.addEventListener('keydown', onKey);
    this.pr.onpointerdown = function () { armed = true; };
    this.pr.onclick = function (e) {
      if (!armed && e.detail !== 0) return;
      var b = e.target.closest('button');
      close(b ? b.dataset.k : null);
    };
    var first = this.pr.querySelector('button');
    if (first) try { first.focus({ preventScroll: true }); } catch (_) {}
  };

  // ---- 화살표: 굵기·진하기 = 비율(0~1) ----
  Board.prototype.drawArrows = function (list) {
    this.arrows = list;
    var svg = this.ar, self = this;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    (list || []).forEach(function (a, i) {
      var f = self.xy(a.from), t = self.xy(a.to);
      var x1 = f[0] * 100 + 50, y1 = f[1] * 100 + 50, x2 = t[0] * 100 + 50, y2 = t[1] * 100 + 50;
      var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len;
      var w = a.width || (5 + 40 * Math.max(0, Math.min(1, a.share || 0)));   // 굵기 = 비율(곧게 비례)
      var head = Math.max(w * 2.1, 26), hl = Math.max(w * 1.5, 22);
      var sx = x1 + ux * 22, sy = y1 + uy * 22, ex = x2 - ux * (hl + 6), ey = y2 - uy * (hl + 6);
      var px = -uy, py = ux;
      var gEl = document.createElementNS(NS, 'g');
      gEl.setAttribute('class', 'arw ' + (a.kind || 'freq'));
      gEl.style.setProperty('--o', String(a.opacity != null ? a.opacity : 0.35 + 0.55 * Math.min(1, (a.share || 0) * 1.6)));
      gEl.style.setProperty('--i', String(i));
      var line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', sx); line.setAttribute('y1', sy); line.setAttribute('x2', ex); line.setAttribute('y2', ey);
      line.setAttribute('stroke-width', w.toFixed(1));
      line.setAttribute('pathLength', '1');
      var tip = document.createElementNS(NS, 'polygon');
      var bx = x2 - ux * (hl + 8), by = y2 - uy * (hl + 8);
      tip.setAttribute('points', [
        (x2 - ux * 8).toFixed(1) + ',' + (y2 - uy * 8).toFixed(1),
        (bx + px * head / 2).toFixed(1) + ',' + (by + py * head / 2).toFixed(1),
        (bx - px * head / 2).toFixed(1) + ',' + (by - py * head / 2).toFixed(1)
      ].join(' '));
      gEl.appendChild(line); gEl.appendChild(tip);
      svg.appendChild(gEl);
    });
  };
  Board.prototype.setHint = function (sq) { this.hint = sq; this.paintHl(); };

  FM.Board = Board;
})(typeof window !== 'undefined' ? window : globalThis);
