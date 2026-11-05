/* Opening Trail 화면 연결: 지도·해설 탐색기, 메인라인 한 수씩 보기, 머리 찾기 칸, 레이팅대 탭, 연습(드릴).
   로직은 core.js, 판은 board.js. 첫 HTML은 build.py가 같은 모양으로 미리 그려 둔다(rows_html·tree_svg·crumb_html). */
(function () {
  'use strict';
  var cfgEl = document.getElementById('fmc');
  if (!cfgEl) return;
  var C = JSON.parse(cfgEl.textContent), T = C.t, L = C.lang;
  var FILES = 'abcdefgh';
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var PREFIX = L === 'ko' ? '/ko/' : '/';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasChess = typeof Chess !== 'undefined' && typeof FM !== 'undefined' && FM.Board;

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ''; }); }
  function uciOf(m) { return m.from + m.to + (m.promotion || ''); }
  function kingSq(ch) {
    if (!ch.inCheck()) return null;
    var b = ch.board(), turn = ch.turn();
    for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) {
      var p = b[r][f];
      if (p && p.type === 'k' && p.color === turn) return FILES[f] + (8 - r);
    }
    return null;
  }
  function legalFn(ch) {
    return function (sq) {
      return ch.moves({ square: sq, verbose: true }).map(function (m) { return { to: m.to, promotion: m.promotion }; });
    };
  }
  function bandName(b) { return b < 0 ? T.band_all : FM.BANDS[b]; }
  function numbered(sans, start) {
    var out = [], i0 = start || 0;
    for (var i = 0; i < sans.length; i++) {
      var p = i0 + i;
      if (p % 2 === 0) out.push(Math.floor(p / 2) + 1 + '.' + sans[i]);
      else if (i === 0) out.push(Math.floor(p / 2) + 1 + '...' + sans[i]);
      else out.push(sans[i]);
    }
    return out.join(' ');
  }
  function badge(c) {
    if (c == null || c < 0) return '';
    return '<span class="cl c' + c + '" title="' + esc((C.clsTip || [])[c] || '') + '">' + esc(T.cls[c]) + '</span>';
  }
  function isTrap(m) { return m.cls >= 3 && m.share >= 0.10 && m.n >= 50; }
  // 리체스 이름 → 해설 slug (build.py covers_slug와 같다: 가장 긴 것이 이긴다)
  function coversSlug(name) {
    var best = '', blen = -1, cv = C.covers || {};
    for (var c in cv) {
      if ((name === c || name.indexOf(c + ':') === 0 || name.indexOf(c + ',') === 0) && c.length > blen) { best = cv[c]; blen = c.length; }
    }
    return best;
  }
  function sansToUcis(sans) {
    var ch = new Chess(), out = [];
    for (var i = 0; i < sans.length; i++) {
      var m;
      try { m = ch.move(sans[i]); } catch (e) { m = null; }
      if (!m) break;
      out.push(uciOf(m));
    }
    return out;
  }

  // ---- 성3: 폰 주소창이 들락날락해도 판 크기를 다시 재지 않는다(폭이 바뀔 때만) ----
  var lastW = 0;
  function fitBoards() {
    var w = document.documentElement.clientWidth;
    if (w === lastW) return;
    lastW = w;
    var h = window.innerHeight;
    var max = w < 900 ? Math.max(260, Math.min(w, h - 230)) : Math.min(620, Math.max(360, h - 190));
    var bw = $('.tool .bwrap');
    document.documentElement.style.setProperty('--bd-max', Math.round(max) + 'px');
    for (var k = 0; w >= 900 && bw && k < 2; k++) {
      var bc = bw.closest('.bcol') || bw.parentNode;
      var top = bw.getBoundingClientRect().top + window.pageYOffset, bcTop = bc.getBoundingClientRect().top + window.pageYOffset;
      var above = bcTop < Math.min(h * 0.4, 260) ? top : top - bcTop + 16;
      max = Math.min(620, Math.max(360, h - above - 66));
      document.documentElement.style.setProperty('--bd-max', Math.round(max) + 'px');
    }
  }
  if (hasChess) {
    fitBoards();
    var rz;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(fitBoards, 120); });
  }

  // =====================================================================
  // 탐색기(지도 /map/ 과 해설 위): 판 · 길잡이 줄 · 다음 수 표 · 가지 그림
  // =====================================================================
  function Explorer(root) {
    var self = this;
    this.root = root;
    this.ch = new Chess();
    this.line = [];          // [{san, uci, fen, from, to}]
    this.ply = 0;
    this.band = store.get('fm.band', 2);
    if (!(this.band >= -1 && this.band <= 3)) this.band = 2;
    this.orient = root.getAttribute('data-orient') || 'w';
    this.sync = root.getAttribute('data-url') === 'sync';
    this.board = new FM.Board($('[data-board]', root), {
      orient: this.orient,
      movable: function (c) { return c === self.ch.turn(); },
      legal: legalFn(this.ch),
      onMove: function (mv) { self.playMove(mv); }
    });
    this.tbody = $('[data-rows]', root);
    this.table = $('table.st', root);
    this.ml = $('[data-ml]', root);
    this.nameEl = $('[data-name]', root);
    this.sumEl = $('[data-sum]', root);
    this.evEl = $('[data-ev] b', root);
    this.passEl = $('[data-pass]', root);
    this.crumbEl = $('[data-crumb]', root);
    this.treeEl = $('[data-tree-svg]', root);
    this.guideEl = $('[data-guide]', root);
    this.bindUI();
    this.stick();
    this.loadLine(this.initLine(), root.getAttribute('data-ply') ? +root.getAttribute('data-ply') : null);
    if (this.sync) {
      window.addEventListener('hashchange', function () {
        if (location.hash === '#main') return;
        var u = self.initLine(), cur = self.line.slice(0, self.ply).map(function (m) { return m.uci; });
        if (u.join('.') !== cur.join('.')) self.loadLine(u);
      });
    }
  }
  Explorer.prototype.initLine = function () {
    if (this.sync) {
      var h = FM.hashToSan(location.hash);
      if (h.length) return sansToUcis(h);
      var q = FM.paramToLine(new URLSearchParams(location.search).get('m'));
      if (q.length) return q;
    }
    var d = this.root.getAttribute('data-line');
    return d ? d.split('.') : [];
  };
  Explorer.prototype.bindUI = function () {
    var self = this, root = this.root;
    $$('[data-band]', root).forEach(function (b) {
      b.addEventListener('click', function () { self.setBand(+b.getAttribute('data-band')); });
    });
    this.markBand();
    $$('[data-nav]', root).forEach(function (b) {
      b.addEventListener('click', function () { self.nav(b.getAttribute('data-nav')); });
    });
    if (this.tbody) {
      this.tbody.addEventListener('click', function (e) {
        var tr = e.target.closest('tr[data-san]');
        if (tr) self.playSan(tr.getAttribute('data-san'));
      });
      this.tbody.addEventListener('mouseover', function (e) {
        var tr = e.target.closest('tr[data-san]');
        self.hot(tr ? tr.getAttribute('data-san') : null);
      });
      this.tbody.addEventListener('mouseleave', function () { self.hot(null); });
    }
    if (this.table) {
      this.table.addEventListener('mouseover', function (e) {
        var td = e.target.closest('td,th');
        self.table.setAttribute('data-col', td ? String(td.cellIndex) : '');
      });
      this.table.addEventListener('mouseleave', function () { self.table.removeAttribute('data-col'); });
    }
    if (this.ml) {
      this.ml.addEventListener('click', function (e) {
        var b = e.target.closest('[data-ply]');
        if (b) self.go(+b.getAttribute('data-ply'));
      });
    }
    if (this.treeEl) {
      this.treeEl.addEventListener('click', function (e) {
        var g = e.target.closest('[data-s]');
        if (!g) return;
        g.getAttribute('data-s').split(' ').forEach(function (san) { self.playSan(san); });
      });
      this.treeEl.addEventListener('mouseover', function (e) {
        var g = e.target.closest('[data-t]');
        var k = g && self.kids ? self.kids[+g.getAttribute('data-t').split('.')[0]] : null;
        self.hot(k ? k.san : null);
      });
      this.treeEl.addEventListener('mouseleave', function () { self.hot(null); });
    }
    $$('[data-practice]', root).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var side = a.getAttribute('data-practice');
        var u = self.line.slice(0, self.ply).map(function (m) { return m.uci; });
        location.href = C.practiceUrl + '?m=' + FM.lineToParam(u) + '&side=' + side;
      });
    });
    if (!window.__fmKeys) window.__fmKeys = this;      // 탐색기가 여럿이면 첫 탐색기만 화살표 키를 받는다
    document.addEventListener('keydown', function (e) {
      if (window.__fmKeys !== self || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target.closest && e.target.closest('input,select,textarea,[contenteditable],.bd-pr')) return;
      if (e.key === 'ArrowLeft') { self.nav('prev'); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { self.nav('next'); e.preventDefault(); }
      else if (e.key === 'Home') { self.nav('first'); e.preventDefault(); }
      else if (e.key === 'End') { self.nav('last'); e.preventDefault(); }
    });
  };
  // 폰(한 줄 배치): 칩·이름 줄은 위로 지나가고 판과 조작 줄은 화면 위에 붙는다(화면이 판보다 넉넉히 길 때만)
  Explorer.prototype.stick = function () {
    var bcol = $('.bcol', this.root), grid = bcol && bcol.parentNode;
    if (!bcol || !grid || !grid.classList.contains('grid')) return;
    var bw = $('.bwrap', bcol), ct = $('.ctrls', bcol), lastW = -1, lastTop = -1;
    function fit(force) {
      var w = document.documentElement.clientWidth;
      if (!force && w === lastW) return;
      lastW = w;
      var need = bw.offsetHeight + (ct ? ct.offsetHeight + 10 : 0);
      if (w >= 900 || window.innerHeight < need + 200) { grid.classList.remove('stick'); return; }
      grid.classList.add('stick');
      var top = bw.offsetTop;
      if (top === lastTop && !force) return;
      lastTop = top;
      grid.style.setProperty('--stick', -top + 'px');
      grid.style.setProperty('--stick-h', need + 'px');
    }
    fit(true);
    window.addEventListener('resize', function () { fit(false); });
    if (window.ResizeObserver && this.nameEl) new ResizeObserver(function () { if (grid.classList.contains('stick')) fit(true); }).observe(this.nameEl);
  };
  Explorer.prototype.setBand = function (b) {
    this.band = b;
    store.set('fm.band', b);
    this.markBand();
    this.render();
  };
  Explorer.prototype.markBand = function () {
    var b = this.band;
    $$('[data-band]', this.root).forEach(function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-band') === b)); });
  };
  Explorer.prototype.loadLine = function (ucis, ply) {
    var ch = this.ch;
    ch.reset();
    this.line = [];
    for (var i = 0; i < ucis.length; i++) {
      var u = ucis[i], m;
      try { m = ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch (e) { m = null; }
      if (!m) break;
      this.line.push({ san: m.san, uci: uciOf(m), fen: ch.fen(), from: m.from, to: m.to });
    }
    this.ply = ply != null ? Math.min(ply, this.line.length) : this.line.length;
    // 지나온 국면의 조각을 미리 받아 이름을 찾는다
    var self = this, epds = [FM.epd(START)].concat(this.line.map(function (m) { return FM.epd(m.fen); }));
    Promise.all(epds.map(function (e) { return FM.entry(e).catch(function () { return null; }); })).then(function () { self.render(true); });
    this.render(true);
  };
  Explorer.prototype.fenAt = function (p) { return p === 0 ? START : this.line[p - 1].fen; };
  Explorer.prototype.go = function (p) {
    p = Math.max(0, Math.min(this.line.length, p));
    if (p === this.ply) return;
    this.ply = p;
    this.render();
  };
  Explorer.prototype.nav = function (k) {
    if (k === 'first') this.go(0);
    else if (k === 'prev') this.go(this.ply - 1);
    else if (k === 'next') this.go(this.ply + 1);
    else if (k === 'last') this.go(this.line.length);
    else if (k === 'flip') {
      this.orient = this.orient === 'w' ? 'b' : 'w';
      this.board.setOrient(this.orient);
    }
  };
  Explorer.prototype.syncChess = function () { this.ch.load(this.fenAt(this.ply)); };
  Explorer.prototype.playMove = function (mv) {
    this.syncChess();
    var m;
    try { m = this.ch.move(mv); } catch (e) { m = null; }
    if (!m) { this.render(); return; }
    var next = this.line[this.ply];
    if (!(next && next.uci === uciOf(m))) {
      this.line = this.line.slice(0, this.ply);
      this.line.push({ san: m.san, uci: uciOf(m), fen: this.ch.fen(), from: m.from, to: m.to });
    }
    this.ply += 1;
    this.render();
  };
  Explorer.prototype.playSan = function (san) {
    this.syncChess();
    var m;
    try { m = this.ch.move(san); } catch (e) { m = null; }
    if (!m) return;
    this.ch.undo();
    this.playMove({ from: m.from, to: m.to, promotion: m.promotion });
  };
  Explorer.prototype.sans = function () { return this.line.slice(0, this.ply).map(function (m) { return m.san; }); };
  Explorer.prototype.epds = function () {
    var out = [FM.epd(START)];
    for (var i = 0; i < this.ply; i++) out.push(FM.epd(this.line[i].fen));
    return out;
  };
  Explorer.prototype.render = function (instant) {
    var fen = this.fenAt(this.ply), self = this;
    this.syncChess();
    var last = this.ply ? [this.line[this.ply - 1].from, this.line[this.ply - 1].to] : null;
    this.board.set(fen, last, kingSq(this.ch), instant);
    this.renderMoves();
    var epd = FM.epd(fen), seq = (this.seq = (this.seq || 0) + 1), list = this.epds();
    // 이름은 지나온 판들의 조각에서 찾으니, 빠진 조각을 모두 받은 뒤 이름·표를 함께 바꾼다
    var missing = list.filter(function (e) { return FM.entrySync(e) === undefined; });
    if (!missing.length) { this.renderName(); this.renderStats(FM.entrySync(epd)); }
    else {
      // 받는 동안: 옛 판의 화살표는 바로 지우고, 표·이름은 흐리게(평가 M2: 판과 표가 다른 국면을 보여 줌)
      this.cur = null;
      this.board.drawArrows([]);
      this.root.classList.add('loading');
      this.root.setAttribute('aria-busy', 'true');
      Promise.all(missing.map(function (e) { return FM.entry(e).catch(function () { return null; }); })).then(function () {
        if (seq !== self.seq) return;
        self.renderName();
        var en = FM.entrySync(epd);
        self.renderStats(en === undefined ? null : en, en === undefined);
      });
    }
    this.syncUrl();
  };
  Explorer.prototype.syncUrl = function () {
    if (!this.sync) return;
    var s = this.sans(), q = new URLSearchParams(location.search);
    q.delete('m');
    var qs = q.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + (s.length ? '#' + FM.sanToHash(s) : '')); } catch (e) {}
  };
  Explorer.prototype.renderMoves = function () {
    if (!this.ml) return;
    var h = '', line = this.line;
    for (var i = 0; i < line.length; i++) {
      if (i % 2 === 0) h += '<li><span class="mn">' + (i / 2 + 1) + '.</span>';
      h += '<button type="button" data-ply="' + (i + 1) + '"' + (i + 1 === this.ply ? ' aria-current="true"' : '') + (i + 1 > this.ply ? ' class="ahead"' : '') + '>' + esc(line[i].san) + '</button>';
      if (i % 2 === 1 || i === line.length - 1) h += '</li>';
    }
    this.ml.innerHTML = h || '<li class="ml-empty">' + esc(T.ml_empty) + '</li>';
    var cur = $('[aria-current]', this.ml), box = this.ml.parentNode;
    if (cur && box) {
      var l = cur.offsetLeft, r = l + cur.offsetWidth;
      if (l < box.scrollLeft + 24 || r > box.scrollLeft + box.clientWidth - 24) box.scrollLeft = l - box.clientWidth / 2;
    }
    if (box) {
      box.classList.toggle('fade-l', box.scrollLeft > 4);
      box.classList.toggle('fade-r', box.scrollLeft + box.clientWidth < box.scrollWidth - 4);
    }
    $$('[data-nav]', this.root).forEach(function (b) {
      var k = b.getAttribute('data-nav');
      if (k === 'first' || k === 'prev') b.disabled = this.ply === 0;
      if (k === 'next' || k === 'last') b.disabled = this.ply === this.line.length;
    }, this);
  };
  Explorer.prototype.renderName = function () {
    var nm = FM.nameOf(this.epds(), L);
    if (this.nameEl) {
      if (!nm) this.nameEl.innerHTML = '<span>' + esc(this.ply ? T.name_none : T.name_start) + '</span>';
      else this.nameEl.innerHTML = '<span class="eco">' + esc(nm.eco) + '</span><span>' + esc(nm.name) + '</span>';
    }
    if (this.crumbEl) this.crumbEl.innerHTML = this.crumb(nm);
    if (this.guideEl) {
      var fam = nm && C.guides ? C.guides[nm.slug || ''] : null;
      if (nm && nm.slug && fam && nm.slug !== this.root.getAttribute('data-slug')) {
        this.guideEl.hidden = false;
        this.guideEl.href = fam.u;
        this.guideEl.querySelector('b').textContent = fam.n;
      } else this.guideEl.hidden = true;
    }
  };
  // 길잡이 줄: 1수 › 오프닝 › 갈래 › 세부 (build.py crumb_parts와 같다)
  Explorer.prototype.crumb = function (nm) {
    var sans = this.sans(), parts = [];
    if (!sans.length) return '<span>' + esc(T.here_root) + '</span>';
    parts.push(['1.' + sans[0], (C.fm || {})[sans[0]] || PREFIX + 'openings/other-first-moves/']);
    if (nm && nm.en) {
      var en = nm.en, i = en.indexOf(':'), fam = i < 0 ? en : en.slice(0, i), rest = i < 0 ? '' : en.slice(i + 1).trim();
      var j = rest.indexOf(','), vr = j < 0 ? rest : rest.slice(0, j).trim(), sub = j < 0 ? '' : rest.slice(j + 1).trim();
      var ko = nm.ko || '', ki = ko.indexOf(':'), kfam = ki < 0 ? ko : ko.slice(0, ki), krest = ki < 0 ? '' : ko.slice(ki + 1).trim();
      var kj = krest.indexOf(','), kvar = kj < 0 ? krest : krest.slice(0, kj).trim(), ksub = kj < 0 ? '' : krest.slice(kj + 1).trim();
      var pieces = [[fam, kfam], [vr ? fam + ': ' + vr : '', kvar], [sub ? en : '', ksub]], lastSlug = null;
      pieces.forEach(function (pc) {
        var full = pc[0];
        if (!full) return;
        var tail = full.split(':').pop().split(',').pop().trim();
        var label = L === 'ko' && pc[1] ? pc[1] : tail;
        var slug = coversSlug(full), g = slug && slug !== lastSlug && C.guides ? C.guides[slug] : null;
        lastSlug = slug || lastSlug;
        parts.push([label, g ? g.u : null]);
      });
    }
    return parts.map(function (p) { return p[1] ? '<a href="' + esc(p[1]) + '">' + esc(p[0]) + '</a>' : '<span>' + esc(p[0]) + '</span>'; })
      .join('<span class="sep" aria-hidden="true">›</span>');
  };
  Explorer.prototype.renderStats = function (entry, failed) {
    this.root.classList.remove('loading');
    this.root.removeAttribute('aria-busy');
    var s = FM.stats(entry, this.band), tb = this.tbody, epd = FM.epd(this.fenAt(this.ply));
    if (s && !s.moves.length) {
      var sa = FM.stats(entry, -1, true);
      if (sa && sa.moves.length && !sa.played) s = sa;      // 이론만 있는 판: 0판 수라도 보인다
    }
    this.cur = s;
    if (this.sumEl) {
      if (failed) this.sumEl.textContent = T.load_fail;
      else if (this.ch.isGameOver() && !(s && s.n)) this.sumEl.textContent = '';
      else if (!s || !(s.played || s.n)) this.sumEl.textContent = fmt(T.sum_none, { band: bandName(this.band) });
      // 이 국면까지 온 판 수(레이팅 표와 같은 숫자). 다음 수가 적힌 판(played)은 대국이 거기서 끝난 판만큼 적다
      else this.sumEl.innerHTML = fmt(T.sum, { n: '<b>' + FM.count(Math.max(s.n || 0, s.played), L) + '</b>', band: esc(bandName(this.band)) });
    }
    if (this.evEl) this.evEl.textContent = entry ? (FM.evText(entry[1]) || '—') : '—';
    if (this.passEl) {
      var base = (C.startN || [])[this.band < 0 ? 4 : this.band];
      this.passEl.textContent = s && s.n && base ? fmt(T.pass, { p: FM.pct(s.n / base, 1), band: bandName(this.band) }) : '';
    }
    var rows = '';
    if (s && s.moves.length) {
      s.moves.slice(0, 12).forEach(function (m) {
        var trap = isTrap(m) ? '<span class="tp" title="' + esc(T.trap_tip) + '">' + esc(T.trap_flag) + '</span>' : '', bar, sh;
        if (m.n) {
          var w = m.w / m.n, d = m.d / m.n, b = m.b / m.n;
          bar = '<span class="bar" role="img" aria-label="' + esc(fmt(T.wdl_aria, { w: FM.pct(w), d: FM.pct(d), b: FM.pct(b) })) + '">' +
            '<i class="w" style="width:' + (w * 100).toFixed(1) + '%">' + (w >= 0.12 ? FM.pct(w) : '') + '</i>' +
            '<i class="d" style="width:' + (d * 100).toFixed(1) + '%">' + (d >= 0.12 ? FM.pct(d) : '') + '</i>' +
            '<i class="b" style="width:' + (b * 100).toFixed(1) + '%">' + (b >= 0.12 ? FM.pct(b) : '') + '</i></span>';
          sh = '<span class="shb" style="--s:' + m.share.toFixed(3) + '"></span>' + FM.pct(m.share) + '<small>' + FM.count(m.n, L) + '</small>';
        } else {
          bar = '<small class="th">' + esc(T.theory) + '</small>';
          sh = '—';
        }
        rows += '<tr data-san="' + esc(m.san) + '" class="c' + m.cls + '"><th scope="row"><button type="button" class="mv">' + esc(m.san) + '</button>' + badge(m.cls) + trap + '</th>' +
          '<td class="sh">' + sh + '</td><td class="wdl">' + bar + '</td><td class="ev">' + esc(FM.evText(m.ev)) + '</td></tr>';
        var why = FM.why(epd, m.san, L);
        if (why) rows += '<tr class="why"><td colspan="4">' + esc(why) + '</td></tr>';
      });
    } else {
      rows = '<tr class="empty"><td colspan="4">' + esc(failed ? T.load_fail : this.ch.isCheckmate() ? T.mate : this.ch.isDraw() ? T.drawn : T.rows_none) + '</td></tr>';
    }
    if (tb) tb.innerHTML = rows;
    this.drawArrows(null);
    this.renderTree(s);
  };
  // ---- 가지 그림: 지금 판 → 다음 수 최대 5(3% 넘게, 적어도 2) → 그 뒤 최대 3(5% 넘게). build.py tree_svg와 같은 모양 ----
  Explorer.prototype.renderTree = function (s) {
    if (!this.treeEl) return;
    var self = this, seq = this.seq, base = this.fenAt(this.ply), kids = [];
    this.kids = null;
    if (s && s.played) {
      for (var i = 0; i < s.moves.length; i++) {
        var m = s.moves[i];
        if (kids.length >= 5 || (m.share < 0.03 && kids.length >= 2)) break;
        var ch = new Chess(base), mv;
        try { mv = ch.move(m.san); } catch (e) { mv = null; }
        if (!mv) continue;
        kids.push({ san: m.san, share: m.share, cls: m.cls, epd: FM.epd(ch.fen()), kids: [] });
      }
    }
    if (!kids.length) { this.treeEl.innerHTML = ''; this.treeEl.parentNode.hidden = true; return; }
    this.treeEl.parentNode.hidden = false;
    Promise.all(kids.map(function (k) { return FM.entry(k.epd).catch(function () { return null; }); })).then(function (ens) {
      if (seq !== self.seq) return;
      ens.forEach(function (en, i) {
        var s2 = FM.stats(en, self.band);
        if (!s2) return;
        for (var j = 0; j < s2.moves.length; j++) {
          var g = s2.moves[j];
          if (kids[i].kids.length >= 3 || g.share < 0.05) break;
          kids[i].kids.push({ san: g.san, share: g.share, cls: g.cls });
        }
      });
      self.kids = kids;
      self.treeEl.innerHTML = self.treeSvg(kids);
    });
  };
  Explorer.prototype.treeSvg = function (kids) {
    var ply = this.ply, sans = this.sans(), rootLabel = sans.length ? numbered([sans[sans.length - 1]], sans.length - 1) : T.here_root;
    var leaves = 0;
    kids.forEach(function (k) { leaves += Math.max(1, k.kids.length); });
    var RH = 30, W = 460, H = leaves * RH + 12, x0 = 4, x1 = 150, x2 = 310, y0 = H / 2, paths = '', texts = '', yi = 6, alt = [];
    kids.forEach(function (k, i) {
      var nleaf = Math.max(1, k.kids.length), yc = yi + nleaf * RH / 2, sw = 2 + k.share * 20;
      alt.push(numbered([k.san], ply) + ' ' + FM.pct(k.share));
      paths += '<path class="br c' + k.cls + '" d="M' + (x0 + 76) + ' ' + y0.toFixed(0) + 'C' + (x0 + 116) + ' ' + y0.toFixed(0) + ' ' + (x1 - 40) + ' ' + yc.toFixed(0) + ' ' + (x1 - 6) + ' ' + yc.toFixed(0) + '" stroke-width="' + sw.toFixed(1) + '"/>';
      texts += '<g class="tn" data-t="' + i + '" data-s="' + esc(k.san) + '"><text x="' + x1 + '" y="' + (yc + 5).toFixed(0) + '">' + esc(numbered([k.san], ply)) + '</text><text class="tp" x="' + (x1 + 104) + '" y="' + (yc + 5).toFixed(0) + '" text-anchor="end">' + FM.pct(k.share) + '</text></g>';
      k.kids.forEach(function (g, j) {
        var yg = yi + j * RH + RH / 2, sw2 = 1.5 + g.share * 16;
        paths += '<path class="br c' + g.cls + '" d="M' + (x1 + 110) + ' ' + yc.toFixed(0) + 'C' + (x1 + 136) + ' ' + yc.toFixed(0) + ' ' + (x2 - 32) + ' ' + yg.toFixed(0) + ' ' + (x2 - 6) + ' ' + yg.toFixed(0) + '" stroke-width="' + sw2.toFixed(1) + '" opacity=".85"/>';
        texts += '<g class="tn" data-t="' + i + '.' + j + '" data-s="' + esc(k.san + ' ' + g.san) + '"><text x="' + x2 + '" y="' + (yg + 5).toFixed(0) + '">' + esc(numbered([g.san], ply + 1)) + '</text><text class="tp" x="' + (W - 4) + '" y="' + (yg + 5).toFixed(0) + '" text-anchor="end">' + FM.pct(g.share) + '</text></g>';
      });
      yi += nleaf * RH;
    });
    texts += '<rect class="rt" x="' + x0 + '" y="' + (y0 - 15).toFixed(0) + '" width="72" height="30" rx="8"/><text class="rtt" x="' + (x0 + 36) + '" y="' + (y0 + 5).toFixed(0) + '" text-anchor="middle">' + esc(rootLabel) + '</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H.toFixed(0) + '" role="img" aria-label="' + esc(alt.join(', ')) + '">' + paths + texts + '</svg>';
  };
  Explorer.prototype.drawArrows = function (hot) {
    var s = this.cur, ch = this.ch, list = [];
    if (s && s.moves.length) {
      this.syncChess();
      s.moves.slice(0, 5).forEach(function (m) {
        if (m.share < 0.04 && list.length >= 2) return;
        var mv;
        try { mv = ch.move(m.san); } catch (e) { mv = null; }
        if (!mv) return;
        ch.undo();
        list.push({ from: mv.from, to: mv.to, share: m.share || 0.2, kind: hot && hot === m.san ? 'hot' : (hot ? 'dim' : 'freq') });
      });
    }
    this.board.drawArrows(list.reverse());
  };
  Explorer.prototype.hot = function (san) { this.drawArrows(san); };

  // =====================================================================
  // 메인라인 한 수씩(해설 3칸): 판은 붙어 있고, 수 목록을 넘기면 그 수의 판이 된다
  // =====================================================================
  function Steps(root) {
    var self = this, ucis = (root.getAttribute('data-line') || '').split('.').filter(Boolean), ch = new Chess();
    this.root = root;
    this.fens = [ch.fen()];
    this.moves = [null];
    ucis.forEach(function (u) {
      var m = ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      self.fens.push(ch.fen());
      self.moves.push([m.from, m.to]);
    });
    this.items = $$('li.stp', root);
    this.now = $('[data-steps-now]', root);
    this.board = new FM.Board($('[data-board]', root), { orient: root.getAttribute('data-orient') || 'w', movable: function () { return false; } });
    this.ply = -1;
    this.items.forEach(function (li) {
      li.addEventListener('click', function (e) { if (!e.target.closest('a')) self.set(+li.getAttribute('data-ply'), true); });
    });
    if ('IntersectionObserver' in window) {
      // 화면 가운데 띠에 들어온 수를 판에 둔다(손으로 고른 뒤 잠깐은 따라가지 않는다)
      var io = new IntersectionObserver(function (es) {
        if (Date.now() - (self.picked || 0) < 700) return;
        es.forEach(function (e) { if (e.isIntersecting) self.set(+e.target.getAttribute('data-ply')); });
      }, { rootMargin: '-42% 0px -48% 0px' });
      this.items.forEach(function (li) { io.observe(li); });
    }
    this.set(0);
  }
  Steps.prototype.set = function (p, byHand) {
    if (byHand) this.picked = Date.now();
    if (p === this.ply) return;
    var instant = this.ply < 0 || Math.abs(p - this.ply) > 1;
    this.ply = p;
    var ch = new Chess(this.fens[p]);
    this.board.set(this.fens[p], this.moves[p], kingSq(ch), instant);
    this.items.forEach(function (li) { li.classList.toggle('cur', +li.getAttribute('data-ply') === p); });
    if (this.now) {
      var li = this.items[p - 1];
      this.now.textContent = p ? fmt(T.step_of, { i: p, n: this.items.length }) + ' · ' + (li ? $('.mn', li).textContent + $('.san', li).textContent : '') : '';
    }
  };

  // =====================================================================
  // 머리 찾기 칸: 오프닝 이름(영어·한국어·다른 이름)·ECO·첫 수 → 해설 또는 지도
  // =====================================================================
  var FIND = null, FINDP = null;
  function findData() {
    if (FIND) return Promise.resolve(FIND);
    if (!FINDP) FINDP = fetch(C.find.src).then(function (r) { return r.json(); }).then(function (j) {
      FIND = j.map(function (x) {
        var hay = norm(x[1] + ' ' + x[2] + ' ' + x[3] + ' ' + (x[5] || '')), hn = norm(x[1] + ' ' + x[2] + ' ' + (x[5] || ''));
        // 수처럼 생긴 말(e4, c4)은 ECO 코드(E41, C44)에 걸리지 않게 코드를 뺀 칸(nx)으로 찾는다
        return { k: x[0], en: x[1], ko: x[2], eco: x[3], tail: x[4], hay: hay, hayC: hay.replace(/ /g, ''), words: hay.split(' '),
          nx: { hay: hn, hayC: hn.replace(/ /g, ''), words: hn.split(' ') } };
      });
      return FIND;
    });
    return FINDP;
  }
  // 아포스트로피는 붙여 지우고(king's → kings), 한국어 '즈'는 '스'로 같이 본다(퀸즈갬빗 = 퀸스 갬빗)
  function norm(s) {
    return String(s).toLowerCase().replace(/[’'`´]/g, '').replace(/[.,:;()\-–—_/]+/g, ' ').replace(/즈/g, '스').replace(/\s+/g, ' ').trim();
  }
  // 이름에서 흔한 꼬리말을 뺀 알맹이: 'sicilian'을 치면 Sicilian Defense 해설이 Sicilian Kan보다 먼저
  var GENERIC = /\b(defense|defence|opening|game|attack|gambit|system|variation)\b|디펜스|오프닝|게임|어택|갬빗|시스템|변화/g;
  function core(s) { return s.replace(GENERIC, ' ').replace(/\s+/g, '').trim(); }
  var MOVE_TOK = /^(?:\d+\.+)?(?:[KQRBNkqrbn]?[a-h]?[1-8]?x?[a-h][1-8](?:=?[QRBNqrbn])?|[Oo0]-[Oo0](?:-[Oo0])?)[+#!?]*$/;
  // 한 글자 틀림·뒤바뀜(najdrof → najdorf)까지 같은 말로 본다
  function near(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
      var c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n] <= 1;
  }
  function wordHit(x, w) {
    if (x.hay.indexOf(w) >= 0) return 2;
    if (w.length < (/[가-힣]/.test(w) ? 3 : 5)) return 0;
    for (var i = 0; i < x.words.length; i++) {
      var h = x.words[i];
      if (near(w, h) || (h.length > w.length && near(w, h.slice(0, w.length)))) return 1;
    }
    return 0;
  }
  // 수 입력(e4 c5, 1.e4 e5 2.Nf3)이면 처음 판부터 둬 보고 SAN 목록을 돌려준다(아니면 null)
  function movesOf(raw) {
    var toks = String(raw).replace(/\d+\s*\.(\.\.)?/g, ' ').replace(/[,;]/g, ' ').split(/\s+/).filter(Boolean);
    if (!toks.length || toks.length > 40) return null;
    var c = new Chess(), out = [];
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i].replace(/[!?]+$/, ''), mv = null;
      if (!/^(?:[KQRBNkqrbn]?[a-h]?[1-8]?x?[a-h][1-8](?:=?[QRBNqrbn])?|[Oo0]-[Oo0](?:-[Oo0])?)[+#]?$/.test(t)) return null;
      t = t.replace(/^[Oo0]-[Oo0]-[Oo0]/, 'O-O-O').replace(/^[Oo0]-[Oo0]/, 'O-O');
      if (/^[kqrn]/.test(t)) t = t[0].toUpperCase() + t.slice(1);
      try { mv = c.move(t); } catch (e) { mv = null; }
      if (!mv && /^b/.test(t)) { try { mv = c.move('B' + t.slice(1)); } catch (e) { mv = null; } }   // bc4 = Bc4
      if (!mv) return null;
      out.push(mv.san);
    }
    return out;
  }
  function Find(root) {
    var self = this;
    this.input = $('[data-find-in]', root);
    this.out = $('[data-find-out]', root);
    this.act = -1;
    this.res = [];
    this.out.id = 'find-out';
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-controls', 'find-out');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.addEventListener('focus', function () { findData().catch(function () {}); });
    this.input.addEventListener('input', function () { self.search(); });
    this.input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { self.move(1); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { self.move(-1); e.preventDefault(); }
      else if (e.key === 'Enter') { var r = self.res[self.act < 0 ? 0 : self.act]; if (r) location.href = self.href(r); e.preventDefault(); }
      else if (e.key === 'Escape') { self.close(); }
    });
    document.addEventListener('click', function (e) { if (!root.contains(e.target)) self.close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !(e.target.closest && e.target.closest('input,select,textarea,[contenteditable]'))) { self.input.focus(); e.preventDefault(); }
    });
  }
  Find.prototype.href = function (r) {
    if (r.k === 'm') return C.mapUrl + '#' + r.tail;
    if (r.k === 'p' || r.k === 'f') return PREFIX + 'openings/' + r.tail + '/';
    return C.mapUrl + '#' + r.tail;
  };
  Find.prototype.search = function () {
    var self = this, raw = this.input.value, q = norm(raw);
    if (!q) { this.close(); return; }
    findData().then(function (data) {
      if (norm(self.input.value) !== q) return;
      var words = q.split(' '), qc = q.replace(/ /g, ''), hits = [], qcore = core(q);
      var moveLike = String(raw).trim().split(/\s+/).every(function (t) { return MOVE_TOK.test(t) || /^\d+\.+$/.test(t); });
      // 수 입력: 그 수순의 판을 지도에서 연다(이름이 있는 수순이면 그 이름과 함께 맨 위)
      var mv = /[a-h][1-8]|o-o/i.test(raw) ? movesOf(raw) : null, top = [];
      if (mv && mv.length) {
        var h = FM.sanToHash(mv), named = data.filter(function (x) { return x.k === 'n' && x.tail === h; })[0];
        top.push(named || { k: 'm', en: numbered(mv), ko: numbered(mv), eco: '', tail: h });
      }
      data.forEach(function (x) {
        var ok = true, fuzzy = false, H = moveLike ? x.nx : x;
        if (H.hayC.indexOf(qc) < 0) {
          for (var i = 0; i < words.length; i++) {
            var w = wordHit(H, words[i]);
            if (!w) { ok = false; break; }
            if (w === 1) fuzzy = true;
          }
        }
        if (!ok) return;
        var name = norm(L === 'ko' ? x.ko : x.en), score = (x.k === 'p' ? 0 : x.k === 'f' ? 1 : 2) * 10 + (name.indexOf(q) === 0 ? 0 : H.hay.indexOf(q) >= 0 ? 3 : 6) + Math.min(name.length / 40, 3) + (fuzzy ? 4 : 0) - (qcore && core(name) === qcore ? 5 : 0);
        hits.push({ x: x, s: score });
      });
      hits.sort(function (a, b) { return a.s - b.s; });
      self.res = top.concat(hits.map(function (h) { return h.x; }).filter(function (x) { return top.indexOf(x) < 0; })).slice(0, 8);
      self.act = -1;
      self.draw();
    }, function () { self.res = []; self.draw(); });
  };
  Find.prototype.draw = function () {
    var self = this;
    if (!this.res.length) {
      this.out.innerHTML = '<li class="find-none">' + esc(C.find.none) + '</li>';
    } else {
      this.out.innerHTML = this.res.map(function (r, i) {
        var nm = L === 'ko' ? r.ko : r.en, kind = r.k === 'm' ? C.find.moves : r.k === 'n' ? C.find.line : C.find.page;
        return '<li role="option" id="find-' + i + '"' + (i === self.act ? ' aria-selected="true"' : '') + '><a href="' + esc(self.href(r)) + '">' +
          '<span class="fn">' + esc(nm) + '</span><small>' + (r.eco ? esc(r.eco) + ' · ' : '') + esc(kind) + '</small></a></li>';
      }).join('');
    }
    this.out.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    if (this.act >= 0) this.input.setAttribute('aria-activedescendant', 'find-' + this.act);
    else this.input.removeAttribute('aria-activedescendant');
  };
  Find.prototype.move = function (d) {
    if (!this.res.length) return;
    this.act = (this.act + d + this.res.length) % this.res.length;
    this.draw();
  };
  Find.prototype.close = function () {
    this.out.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
  };

  // ---- 레이팅대별 추천 탭 ----
  function bestTabs(root) {
    var page = root.parentNode, b0 = store.get('fm.band', 2);
    function show(b) {
      $$('[data-bb]', root).forEach(function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-bb') === b)); });
      $$('[data-bp]', page).forEach(function (x) { x.hidden = +x.getAttribute('data-bp') !== b; });
    }
    $$('[data-bb]', root).forEach(function (x) {
      x.addEventListener('click', function () { var b = +x.getAttribute('data-bb'); store.set('fm.band', b); show(b); });
    });
    if (b0 >= 0 && b0 <= 3) show(b0);
  }

  // =====================================================================
  // 연습 (움12: 단계가 끝나야 다음 단계로. 시간표 없이 상태 하나로 움직인다)
  // =====================================================================
  function Drill(root) {
    var self = this;
    this.root = root;
    root._drill = this;   // 시험(자동 클릭)용
    this.ch = new Chess();
    this.state = 'setup';
    this.band = store.get('fm.band', 2);
    if (!(this.band >= -1 && this.band <= 3)) this.band = 2;
    this.cards = store.get('fm.cards', {});
    this.board = new FM.Board($('[data-board]', root), {
      orient: 'w',
      movable: function (c) { return self.state === 'you' && c === self.side; },
      legal: legalFn(this.ch),
      onMove: function (mv) { self.userMove(mv); }
    });
    this.msg = $('[data-msg]', root);
    this.sel = $('[data-pick]', root);
    this.sideSel = $('[data-side]', root);
    this.bindUI();
    var q = new URLSearchParams(location.search);
    var custom = FM.paramToLine(q.get('m'));
    if (q.get('o') && this.sel) {
      this.sel.value = q.get('o');
      var o0 = this.opening();
      if (o0 && this.sideSel) this.sideSel.value = q.get('side') === 'b' ? 'b' : q.get('side') === 'w' ? 'w' : o0.side;
    }
    if (custom.length) {
      this.custom = custom;
      if (this.sel) {
        var opt = document.createElement('option');
        opt.value = ''; opt.textContent = T.custom_line; opt.setAttribute('data-custom', '');
        this.sel.insertBefore(opt, this.sel.firstChild);
        this.sel.value = '';
      }
      this.side = q.get('side') === 'b' ? 'b' : 'w';
      if (this.sideSel) this.sideSel.value = this.side;
    }
    this.updateDue();
    this.showSetup();
  }
  Drill.prototype.bindUI = function () {
    var self = this, root = this.root;
    $$('[data-band]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        self.band = +b.getAttribute('data-band');
        store.set('fm.band', self.band);
        $$('[data-band]', root).forEach(function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-band') === self.band)); });
      });
      b.setAttribute('aria-pressed', String(+b.getAttribute('data-band') === self.band));
    });
    if (this.sel) this.sel.addEventListener('change', function () {
      if (self.sel.value === '' && self.custom) { self.showSetup(); return; }
      self.custom = null;
      var co = $('option[data-custom]', self.sel);
      if (co) co.remove();
      var o = self.opening();
      if (o && self.sideSel) self.sideSel.value = o.side;
      self.showSetup();
    });
    if (this.sideSel) this.sideSel.addEventListener('change', function () { if (self.state === 'setup' || self.state === 'end') self.showSetup(); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var a = b.getAttribute('data-act');
      if (a === 'start') self.start(false);
      else if (a === 'review') self.start(true);
      else if (a === 'again') self.start(self.reviewMode);
      else if (a === 'setup') self.showSetup();
      else if (a === 'hint') self.hint();
    });
  };
  Drill.prototype.opening = function () {
    var slug = this.sel ? this.sel.value : null;
    return (C.openings || []).filter(function (o) { return o.slug === slug; })[0] || null;
  };
  Drill.prototype.key = function () { return this.custom ? 'line:' + this.custom.join('.') : (this.opening() || {}).slug; };
  Drill.prototype.updateDue = function () {
    var today = FM.today(), cards = this.cards, n = 0, total = 0;
    Object.keys(cards).forEach(function (k) { total++; if (cards[k].d <= today && typeof cards[k].u === 'string' && cards[k].m) n++; });
    this.dueCount = n;
    var el = $('[data-due]', this.root);
    if (el) el.textContent = total ? fmt(T.due, { n: n, total: total }) : T.due_none;
    var rb = $('[data-act="review"]', this.root);
    if (rb) rb.disabled = n === 0;
  };
  Drill.prototype.say = function (html, kind) {
    if (!this.msg) return;
    this.msg.className = 'msg ' + (kind || '');
    this.msg.innerHTML = html;
  };
  Drill.prototype.setState = function (s) {
    this.state = s;
    this.root.setAttribute('data-state', s);
  };
  Drill.prototype.showSetup = function () {
    this.setState('setup');
    this.updateDue();
    this.ch.reset();
    var o = this.opening();
    var line = this.custom || (o ? o.line : []);
    var tmp = new Chess(), last = null;
    line.forEach(function (u) { var m = tmp.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); last = [m.from, m.to]; });
    var side = this.sideSel ? this.sideSel.value : 'w';
    this.board.setOrient(side);
    this.board.set(tmp.fen(), last, null, true);
    this.board.drawArrows([]);
    var nm = this.custom ? T.custom_line : (o ? o.name : '');
    this.say(fmt(T.setup_msg, { name: esc(nm), side: side === 'w' ? T.white : T.black }), '');
  };
  Drill.prototype.start = function (review) {
    this.reviewMode = review;
    this.side = this.sideSel ? this.sideSel.value : 'w';
    this.board.setOrient(this.side);
    this.ch.reset();
    this.done = []; this.ok = 0; this.bad = 0; this.extra = 0; this.combo = 0;
    this.lineSan = [];
    if (review) {
      var today = FM.today(), cards = this.cards;
      this.queue = Object.keys(cards).filter(function (k) { return cards[k].d <= today && typeof cards[k].u === 'string' && cards[k].m; }).slice(0, 20);
      if (!this.queue.length) { this.updateDue(); return; }
      this.nextReview();
      return;
    }
    var o = this.opening();
    this.main = this.custom || (o ? o.line : []);
    // 상대가 그대로 따라 두는 길이: 지도에서 고른 수순은 전부, 오프닝은 그 오프닝이 되는 수순(정의 수순)까지만
    this.fixed = this.custom ? this.main.length : (o ? Math.min(o.def || 0, this.main.length) : 0);
    this.board.set(this.ch.fen(), null, null, true);
    this.board.drawArrows([]);
    this.step();
  };
  Drill.prototype.nextReview = function () {
    var k = this.queue.shift();
    if (!k) { this.finish(); return; }
    var c = this.cards[k];
    this.revKey = k;
    this.side = c.c || this.side;
    this.board.setOrient(this.side);
    this.ch.reset();
    var ucis = c.u ? c.u.split('.') : [], last = null, self = this;
    ucis.forEach(function (u) { var m = self.ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); last = [m.from, m.to]; });
    this.main = ucis;
    this.board.set(this.ch.fen(), last, kingSq(this.ch), true);
    this.board.drawArrows([]);
    this.expect = c.m;
    this.wrongHere = false;
    this.setState('you');
    this.say(fmt(T.review_q, { left: this.queue.length + 1 }), '');
  };
  // 다음 할 일 정하기: 정해진 수순 → 그다음은 실제 통계(상대) / 2000+ 최다 수(나)
  Drill.prototype.onMain = function () {
    var main = this.main;
    return this.ch.history({ verbose: true }).every(function (m, i) { return uciOf(m) === main[i]; });
  };
  Drill.prototype.step = function () {
    var self = this, ply = this.ch.history().length, turn = this.ch.turn();
    if (this.ch.isGameOver()) { this.finish(); return; }
    var mine = turn === this.side;
    var onMain = ply < this.main.length && this.onMain();
    if (onMain && (mine || ply < this.fixed)) {
      var u = this.main[ply];
      var t = new Chess(this.ch.fen()), m = t.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (mine) { this.expect = m.san; this.wrongHere = false; this.setState('you'); this.say(T.your_move, ''); FM.entry(FM.epd(this.ch.fen())).catch(function () {}); }
      else this.oppPlay(m.san);
      return;
    }
    if (this.extra >= 10) { this.finish(); return; }
    var epd = FM.epd(this.ch.fen());
    this.setState('wait');
    FM.entry(epd).then(function (en) {
      if (mine) {
        var bm = en ? FM.bookMove(en) : null;
        if (!bm) { self.finish(); return; }
        self.expect = bm; self.wrongHere = false;
        self.setState('you');
        self.say(T.your_move, '');
      } else {
        var cs = en ? FM.oppChoices(en, self.band) : [];
        if (!cs.length) { self.finish(); return; }
        var pk = FM.pick(cs, Math.random());
        self.oppPlay(pk.san, pk.p);
      }
    }, function () { self.say(T.load_fail, 'bad'); self.setState('end'); });
  };
  Drill.prototype.oppPlay = function (san, p) {
    var self = this;
    this.setState('opp');
    setTimeout(function () {
      if (self.state !== 'opp') return;
      var m = self.ch.move(san);
      if (self.ch.history().length > self.main.length || !self.onMain()) self.extra++;
      self.board.set(self.ch.fen(), [m.from, m.to], kingSq(self.ch));
      self.board.drawArrows([]);
      if (p != null) self.say(fmt(T.opp_played, { san: esc(m.san), p: FM.pct(p), band: esc(bandName(self.band)) }), 'info');
      setTimeout(function () { if (self.state === 'opp') self.step(); }, reduce ? 0 : 120);
    }, reduce ? 60 : 260);
  };
  Drill.prototype.cardKey = function () { return this.key() + '|' + FM.epd(this.ch.fen()); };
  Drill.prototype.userMove = function (mv, loaded) {
    if (this.state !== 'you') return;
    var before = this.ch.fen(), m;
    try { m = this.ch.move(mv); } catch (e) { m = null; }
    if (!m) { this.board.set(before, null, kingSq(this.ch), false, true); return; }
    var self = this, today = FM.today();
    if (m.san === this.expect) {
      this.ch.undo();
      var key = this.reviewMode ? this.revKey : this.cardKey();
      var path = this.ch.history({ verbose: true }).map(uciOf);
      var old = this.cards[key];
      if (!this.wrongHere && (this.reviewMode || FM.due(old, today))) {
        var g = FM.grade(old, true, today);
        g.u = path.join('.'); g.m = m.san; g.c = this.side;
        this.cards[key] = g;
        store.set('fm.cards', this.cards);
      }
      this.ch.move(mv);
      if (!this.wrongHere) { this.ok++; this.combo = (this.combo || 0) + 1; }
      if (this.ch.history().length > this.main.length || !this.onMain()) this.extra++;
      this.board.set(this.ch.fen(), [m.from, m.to], kingSq(this.ch));
      this.board.setHint(null);
      this.board.drawArrows([]);
      this.board.flash(m.to, 'ok', { combo: this.wrongHere ? 0 : this.combo });
      this.say(this.wrongHere ? T.fixed : fmt(T.right, { san: esc(m.san) }), 'ok');
      if (this.reviewMode) { this.setState('next'); setTimeout(function () { self.nextReview(); }, reduce ? 200 : 700); return; }
      this.setState('opp');
      setTimeout(function () { self.step(); }, reduce ? 60 : 200);
      return;
    }
    // 틀림: 메인·대안이거나 2000+가 15% 넘게 두는 수면 '둘 만한 수', 아니면 오답
    this.ch.undo();
    var epd = FM.epd(this.ch.fen()), en = FM.entrySync(epd), san = m.san;
    this.board.set(this.ch.fen(), null, kingSq(this.ch), false, true);
    if (en === undefined && !loaded) {
      this.setState('wait');
      var again = function () { self.setState('you'); self.userMove(mv, true); };
      FM.entry(epd).then(again, again);
      return;
    }
    if (en && FM.playable(en, san)) {
      this.board.flash(m.to, 'warn');
      this.say(fmt(T.playable, { san: esc(san), want: esc(this.expect) }), 'warn');
      return;
    }
    this.combo = 0;
    this.board.flash(m.to, 'bad', { from: m.from });
    if (!this.wrongHere) {
      this.bad++;
      this.wrongHere = true;
      var key2 = this.reviewMode ? this.revKey : this.cardKey();
      var g2 = FM.grade(this.cards[key2], false, today);
      g2.u = this.ch.history({ verbose: true }).map(uciOf).join('.'); g2.m = this.expect; g2.c = this.side;
      this.cards[key2] = g2;
      store.set('fm.cards', this.cards);
    }
    this.showAnswer();
    this.say(fmt(T.wrong, { san: esc(san), want: esc(this.expect) }), 'bad');
  };
  Drill.prototype.showAnswer = function () {
    var t = new Chess(this.ch.fen()), m = t.move(this.expect);
    this.board.drawArrows([{ from: m.from, to: m.to, share: 1, kind: 'answer', width: 16, opacity: 0.9 }]);
  };
  Drill.prototype.hint = function () {
    if (this.state !== 'you') return;
    this.combo = 0;
    if (!this.wrongHere) {
      this.wrongHere = true; this.bad++;
      var key = this.reviewMode ? this.revKey : this.cardKey(), today = FM.today();
      var g = FM.grade(this.cards[key], false, today);
      g.u = this.ch.history({ verbose: true }).map(uciOf).join('.'); g.m = this.expect; g.c = this.side;
      this.cards[key] = g;
      store.set('fm.cards', this.cards);
    }
    this.showAnswer();
    this.say(fmt(T.hint_msg, { want: esc(this.expect) }), 'warn');
  };
  Drill.prototype.finish = function () {
    this.setState('end');
    if (this.ok > 0) this.board.celebrate(this.bad === 0);
    this.updateDue();
    var hist = this.ch.history(), txt = '';
    for (var i = 0; i < hist.length; i++) txt += (i % 2 === 0 ? (i / 2 + 1) + '. ' : '') + hist[i] + ' ';
    this.say(fmt(this.reviewMode ? T.end_review : T.end, { ok: this.ok, bad: this.bad, line: esc(txt.trim()) }) +
      '<span class="acts"><button type="button" class="btn" data-act="again">' + esc(this.reviewMode ? T.review_again : T.again) + '</button>' +
      '<button type="button" class="btn ghost" data-act="setup">' + esc(T.change) + '</button></span>', 'end');
  };

  // =====================================================================
  // 루멘랩 칸: 나이트가 L자로 뛰어 루멘랩 칸에 앉는다(화면에 들어올 때 한 번, 8초 안엔 다시 안 함)
  // =====================================================================
  function lumen() {
    var el = $('.lumen');
    if (!el || !('IntersectionObserver' in window)) return;
    var lastRun = 0;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var now = Date.now();
        if (now - lastRun < 8000) return;
        lastRun = now;
        el.classList.remove('run');
        void el.offsetWidth;
        el.classList.add('run');
      });
    }, { threshold: 0.6 });
    io.observe(el);
  }

  // =====================================================================
  // 테스트 한 판: 국면 10개, 2000+가 가장 많이 두는 수 고르기 → 단계·닮은 레이팅대·공유 카드
  // =====================================================================
  function Quiz(root) {
    var self = this;
    this.root = root;
    this.TT = C.tt;
    this.ch = new Chess();
    this.state = 'intro';
    this.board = new FM.Board($('[data-board]', root), {
      orient: 'w',
      movable: function (c) { return self.state === 'q' && c === self.ch.turn(); },
      legal: legalFn(this.ch),
      onMove: function (mv) { self.boardMove(mv); }
    });
    this.sel = $('[data-qo]', root);
    var o = new URLSearchParams(location.search).get('o');
    if (o && this.sel && $('option[value="' + o.replace(/[^a-z0-9-]/g, '') + '"]', this.sel)) this.sel.value = o;
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-qa]');
      if (b) self.act(b.getAttribute('data-qa'));
      var op = e.target.closest('[data-opt]');
      if (op && self.state === 'q') self.answer(op.getAttribute('data-opt'));
    });
    $('[data-qopts]', root).addEventListener('mouseover', function (e) {
      var op = e.target.closest('[data-opt]');
      if (self.state === 'q') self.arrow(op ? op.getAttribute('data-opt') : null);
    });
  }
  Quiz.prototype.set = function (s) { this.state = s; this.root.setAttribute('data-state', s === 'fb' ? 'q' : s); };
  Quiz.prototype.act = function (a) {
    if (a === 'start' || a === 'again') this.start();
    else if (a === 'next') { if (this.state === 'fb') this.next(); }
    else if (a === 'share') this.share();
    else if (a === 'save') this.save();
  };
  Quiz.prototype.load = function () {
    if (this.data) return Promise.resolve(this.data);
    var self = this;
    return FM.fetchJSON(C.testSrc).then(function (j) { self.data = j; return j; });
  };
  Quiz.prototype.start = function () {
    var self = this, slug = this.sel ? this.sel.value : '';
    this.load().then(function (d) { self.begin(d, slug); }, function () {
      self.set('q');
      $('[data-qmsg]', self.root).textContent = self.TT.load_fail;
    });
  };
  // 쉬운 판(앞 4수) 3개 · 가운데 4개 · 깊은 판 3개. 한 오프닝만 고르면 그 오프닝 판에서 앞에서 뒤로.
  Quiz.prototype.begin = function (d, slug) {
    var idx = slug && d.by[slug] ? d.by[slug].slice() : d.q.map(function (_, i) { return i; });
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    var pick = [];
    if (slug) pick = shuffle(idx).slice(0, 10);
    else {
      var easy = shuffle(idx.filter(function (i) { return d.q[i][4] <= 3; })), mid = shuffle(idx.filter(function (i) { return d.q[i][4] > 3 && d.q[i][4] <= 9; })),
        deep = shuffle(idx.filter(function (i) { return d.q[i][4] > 9; }));
      pick = easy.slice(0, 3).concat(mid.slice(0, 4), deep.slice(0, 3));
      if (pick.length < 10) pick = pick.concat(shuffle(idx.filter(function (i) { return pick.indexOf(i) < 0; })).slice(0, 10 - pick.length));
    }
    pick.sort(function (a, b) { return d.q[a][4] - d.q[b][4]; });
    this.qs = pick.map(function (i) { return d.q[i]; });
    this.k = -1;
    this.res = [];
    $$('[data-qbar] i', this.root).forEach(function (x, i) { x.className = ''; x.hidden = i >= pick.length; });
    this.next();
  };
  Quiz.prototype.next = function () {
    this.k++;
    if (this.k >= this.qs.length) { this.finish(); return; }
    var q = this.qs[this.k], ch = this.ch, last = null, TT = this.TT;
    ch.reset();
    q[0].split('.').forEach(function (u) { var m = ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); last = [m.from, m.to]; });
    this.board.setOrient(q[1]);
    this.board.set(ch.fen(), last, kingSq(ch), true);
    this.board.drawArrows([]);
    var opts = q[3].map(function (o) { return o[0]; }).sort(function () { return Math.random() - 0.5; });
    $('[data-qof]', this.root).textContent = fmt(TT.q_of, { i: this.k + 1, n: this.qs.length });
    var sans = ch.history(), self = this;
    // 이름은 조각이 오면 붙인다
    var epds = [FM.epd(START)], t = new Chess();
    sans.forEach(function (s) { t.move(s); epds.push(FM.epd(t.fen())); });
    var nameEl = $('[data-qname]', this.root);
    nameEl.innerHTML = '<span class="san">' + esc(numbered(sans)) + '</span>';
    Promise.all(epds.map(function (e) { return FM.entry(e).catch(function () { return null; }); })).then(function () {
      var nm = FM.nameOf(epds, L);
      if (nm && self.qs[self.k] === q) nameEl.innerHTML = '<b>' + esc(nm.name) + '</b> <span class="san">' + esc(numbered(sans)) + '</span>';
    });
    $('[data-qprompt]', this.root).textContent = q[1] === 'w' ? TT.prompt_w : TT.prompt_b;
    $('[data-qopts]', this.root).innerHTML = opts.map(function (s) {
      return '<button type="button" class="q-opt" data-opt="' + esc(s) + '"><span class="san">' + esc(numbered([s], sans.length)) + '</span></button>';
    }).join('');
    var msg = $('[data-qmsg]', this.root);
    msg.className = 'msg';
    msg.textContent = TT.tap;
    $('[data-qa="next"]', this.root).hidden = true;
    this.set('q');
    var bar = $$('[data-qbar] i', this.root)[this.k];
    if (bar) bar.className = 'now';
  };
  Quiz.prototype.arrow = function (san) {
    if (!san) { this.board.drawArrows([]); return; }
    var t = new Chess(this.ch.fen()), m;
    try { m = t.move(san); } catch (e) { m = null; }
    this.board.drawArrows(m ? [{ from: m.from, to: m.to, share: 0.5, kind: 'hot' }] : []);
  };
  Quiz.prototype.boardMove = function (mv) {
    var t = new Chess(this.ch.fen()), m;
    try { m = t.move(mv); } catch (e) { m = null; }
    if (!m) { this.board.set(this.ch.fen(), null, kingSq(this.ch), false, true); return; }
    this.answer(m.san);
  };
  Quiz.prototype.answer = function (san) {
    if (this.state !== 'q') return;
    this.set('fb');
    var q = this.qs[this.k], TT = this.TT, right = san === q[2], ch = this.ch;
    var mine = null;
    q[3].forEach(function (o) { if (o[0] === san) mine = o; });
    this.res.push({ q: q, san: san, ok: right, sh: mine ? mine[1] : [0.002, 0.002, 0.002, 0.002] });
    var before = ch.fen(), a = ch.move(q[2]), aMove = [a.from, a.to];
    var afen = ch.fen();
    ch.load(before);
    if (right) {
      this.board.set(afen, aMove, null);
      this.board.flash(a.to, 'ok', { combo: this.res.filter(function (r) { return r.ok; }).length });
    } else {
      var t = new Chess(before), m = null;
      try { m = t.move(san); } catch (e) { m = null; }
      this.board.set(before, null, kingSq(ch), false, true);
      if (m) this.board.flash(m.to, 'bad', { from: m.from });
      this.board.drawArrows([{ from: a.from, to: a.to, share: 1, kind: 'answer', width: 16, opacity: 0.9 }]);
    }
    var ap = FM.pct(q[3][0][1][3]);
    var msg = $('[data-qmsg]', this.root);
    var nA = numbered([q[2]], q[4]), nM = numbered([san], q[4]);
    msg.className = 'msg ' + (right ? 'ok' : 'bad');
    msg.innerHTML = right ? fmt(TT.right, { p: ap, san: '<b>' + esc(nA) + '</b>' }) :
      mine ? fmt(TT.wrong, { san: '<b>' + esc(nA) + '</b>', p: ap, mine: '<b>' + esc(nM) + '</b>', q: FM.pct(mine[1][3]) }) :
        fmt(TT.off, { mine: '<b>' + esc(nM) + '</b>', san: '<b>' + esc(nA) + '</b>', p: ap });
    var why = FM.why(FM.epd(before), q[2], L);
    if (why) msg.innerHTML += '<span class="q-why">' + esc(why) + '</span>';
    $$('[data-opt]', this.root).forEach(function (b) {
      var s = b.getAttribute('data-opt');
      b.disabled = true;
      if (s === q[2]) b.classList.add('ok');
      else if (s === san) b.classList.add('bad');
    });
    var bar = $$('[data-qbar] i', this.root)[this.k];
    if (bar) bar.className = right ? 'ok' : 'bad';
    var nb = $('[data-qa="next"]', this.root);
    nb.textContent = this.k === this.qs.length - 1 ? TT.see : TT.next;
    nb.hidden = false;
    nb.focus({ preventScroll: true });
  };
  Quiz.prototype.level = function (k, n) {
    var r = n ? k / n : 0;
    return r >= 1 ? 5 : r >= 0.9 ? 4 : r >= 0.7 ? 3 : r >= 0.5 ? 2 : r >= 0.3 ? 1 : 0;
  };
  Quiz.prototype.finish = function () {
    var TT = this.TT, res = this.res, k = res.filter(function (r) { return r.ok; }).length, n = res.length;
    var lv = this.level(k, n), lt = TT.levels[lv];
    // 고른 수를 레이팅대마다 두는 비율을 곱해 가장 그럴듯한 레이팅대
    var ll = [0, 0, 0, 0];
    res.forEach(function (r) { for (var b = 0; b < 4; b++) ll[b] += Math.log(Math.max(0.01, r.sh[b] || 0)); });
    var band = 0;
    for (var b = 1; b < 4; b++) if (ll[b] > ll[band]) band = b;
    this.result = { k: k, n: n, lv: lv, band: band };
    $('[data-qlevel]', this.root).textContent = lt[0];
    $('[data-qscore]', this.root).textContent = fmt(TT.score, { k: k, n: n });
    $('[data-qld]', this.root).textContent = lt[1];
    $('[data-qlike]', this.root).textContent = fmt(TT.like, { band: FM.BANDS[band] });
    var miss = res.filter(function (r) { return !r.ok; });
    $('[data-qmiss]', this.root).innerHTML = miss.length ? miss.map(function (r) {
      var t = new Chess(), sans = [];
      r.q[0].split('.').forEach(function (u) { var m = t.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); sans.push(m.san); });
      var g = C.guides[r.q[5][0]];
      return '<li><span class="san">' + esc(numbered(sans)) + ' <b>' + esc(numbered([r.q[2]], sans.length)) + '</b></span> ' +
        (g ? '<a href="' + esc(g.u) + '">' + esc(TT.guide) + ': ' + esc(g.n) + '</a> ' : '') +
        '<a href="' + esc(C.mapUrl + '#' + FM.sanToHash(sans)) + '">' + esc(TT.map) + '</a></li>';
    }).join('') : '<li>' + esc(TT.miss_none) + '</li>';
    this.set('end');
    this.board.celebrate(k === n);
    var self = this;
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { self.card(); });
    try { this.root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); } catch (e) {}
  };
  // ---- 공유 카드(1080×1350): 길 위의 점 10개 = 맞힘·틀림, 단계 이름, 점수 ----
  Quiz.prototype.card = function () {
    var cv = $('[data-qcard]', this.root);
    if (!cv || !cv.getContext) return;
    var x = cv.getContext('2d'), W = 1080, H = 1350, TT = this.TT, r = this.result, res = this.res;
    var font = getComputedStyle(document.body).fontFamily;
    x.fillStyle = '#f6f3ec'; x.fillRect(0, 0, W, H);
    // 판 무늬 띠
    for (var i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#b78a62' : '#eedcb6'; x.fillRect(i * W / 8, 0, W / 8, 28); }
    x.fillStyle = '#1c2130';
    x.font = '700 44px ' + font; x.fillText('Opening Trail', 80, 130);
    x.fillStyle = '#5b6271'; x.font = '500 34px ' + font; x.fillText(TT.card_sub, 80, 186);
    x.fillStyle = '#2c47c9'; x.font = '600 40px ' + font; x.fillText(TT.result_h, 80, 330);
    x.fillStyle = '#1c2130'; x.font = '800 128px ' + font; x.fillText(TT.levels[r.lv][0], 72, 470);
    x.font = '700 60px ' + font; x.fillText(fmt(TT.score, { k: r.k, n: r.n }), 80, 570);
    x.fillStyle = '#5b6271'; x.font = '500 36px ' + font; x.fillText(fmt(TT.like, { band: FM.BANDS[r.band] }), 80, 640);
    // 길: 문제 하나 = 점 하나, 맞히면 한 칸 오르고 틀리면 그 높이로 간다(오른쪽 끝 높이 = 맞힌 수)
    var pts = [], up = 0;
    for (i = 0; i < res.length; i++) {
      var tt = res.length > 1 ? i / (res.length - 1) : 0;
      if (res[i].ok) up++;
      pts.push([120 + tt * 840, 1150 - up * 36]);
    }
    x.strokeStyle = '#d4ccbb'; x.lineWidth = 18; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath();
    pts.forEach(function (p, j) { if (j) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); });
    x.stroke();
    pts.forEach(function (p, j) {
      x.beginPath(); x.arc(p[0], p[1], 30, 0, Math.PI * 2);
      x.fillStyle = res[j].ok ? '#1d8a4d' : '#c23b2a'; x.fill();
      x.fillStyle = '#fff'; x.font = '700 28px ' + font; x.textAlign = 'center'; x.fillText(String(j + 1), p[0], p[1] + 10); x.textAlign = 'left';
    });
    x.fillStyle = '#1c2130'; x.font = '700 40px ' + font; x.fillText(TT.card_url, 80, 1290);
  };
  Quiz.prototype.blob = function () {
    var cv = $('[data-qcard]', this.root);
    return new Promise(function (ok) { if (cv && cv.toBlob) cv.toBlob(ok, 'image/png'); else ok(null); });
  };
  Quiz.prototype.share = function () {
    var self = this, r = this.result, TT = this.TT;
    var text = fmt(TT.share_text, { k: r.k, n: r.n, level: TT.levels[r.lv][0] }), url = location.origin + location.pathname;
    this.blob().then(function (b) {
      var f = b && typeof File !== 'undefined' ? new File([b], 'opening-trail-test.png', { type: 'image/png' }) : null;
      if (f && navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], text: text + ' ' + url });
      if (navigator.share) return navigator.share({ text: text, url: url });
      return navigator.clipboard.writeText(text + ' ' + url).then(function () { var n = $('[data-qnote]', self.root); if (n) n.textContent = TT.copied; });
    }).catch(function () {});
  };
  Quiz.prototype.save = function () {
    this.blob().then(function (b) {
      if (!b) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'opening-trail-test.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    });
  };

  // ---- 루멘랩 칸: 나이트가 L자로 뛰어 루멘랩 칸에 앉는다(화면에 들어올 때 한 번, 8초 안엔 다시 안 함) ----
  function lumen() {
    var el = $('.lumen');
    if (!el || !('IntersectionObserver' in window)) return;
    var lastRun = 0;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var now = Date.now();
        if (now - lastRun < 8000) return;
        lastRun = now;
        el.classList.remove('run');
        void el.offsetWidth;
        el.classList.add('run');
      });
    }, { threshold: 0.6 });
    io.observe(el);
  }

  // ---- 페이지별 시작 ----
  // 예전 첫 화면 주소(/?m=e2e4...)는 지도로
  if ((location.pathname === '/' || location.pathname === '/ko/') && /[?&]m=/.test(location.search)) {
    location.replace(C.mapUrl + location.search);
    return;
  }
  if (C.find) $$('[data-find]').forEach(function (r) { new Find(r); });
  if (hasChess) {
    $$('[data-explorer]').forEach(function (r) { r.__ex = new Explorer(r); });
    $$('[data-steps]').forEach(function (r) { new Steps(r); });
    $$('[data-drill]').forEach(function (r) { new Drill(r); });
    $$('[data-quiz]').forEach(function (r) { new Quiz(r); });
  }
  $$('[data-best]').forEach(bestTabs);
  // 본문으로 건너뛰기: 주소에 #main을 붙이지 않는다(지도 주소의 수가 지워지지 않게)
  $$('.skip').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var m = document.getElementById('main');
      if (!m) return;
      e.preventDefault();
      m.setAttribute('tabindex', '-1');
      m.focus({ preventScroll: true });
      m.scrollIntoView();
    });
  });
  // 펼치기(움7: 높이 0fr→1fr)
  $$('[data-fold]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      var box = document.getElementById(b.getAttribute('aria-controls'));
      if (box) box.classList.toggle('open', open);
    });
  });
  // 본문 안 수순 링크: 위 탐색기를 그 수순으로(탐색기가 없으면 지도 주소로 간다)
  $$('[data-goto]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var ex = $('[data-explorer]');
      if (!ex || !ex.__ex) return;
      e.preventDefault();
      ex.__ex.loadLine(a.getAttribute('data-goto').split('.'));
      ex.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });
  lumen();
  var lb = $('.langbar button');
  if (lb) lb.addEventListener('click', function () { document.documentElement.classList.remove('lb'); store.set('fm.lang', 1); });
})();
