/* 외울수 / Fewmoves 화면 연결: 탐색기(첫 화면·오프닝 페이지), 연습(드릴). 로직은 core.js, 판은 board.js. */
(function () {
  'use strict';
  var cfgEl = document.getElementById('fmc');
  if (!cfgEl) return;
  var C = JSON.parse(cfgEl.textContent), T = C.t, L = C.lang;
  var FILES = 'abcdefgh';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // ---- 성3: 폰 주소창이 들락날락해도 판 크기를 다시 재지 않는다(폭이 바뀔 때만) ----
  var lastW = 0;
  function fitBoards() {
    var w = document.documentElement.clientWidth;
    if (w === lastW) return;
    lastW = w;
    var h = window.innerHeight;
    // 폰: 판 + 이름 줄 + 조작 줄 + 다음 수 두세 줄이 한 화면에 들어오게
    var max = w < 900 ? Math.max(260, Math.min(w, h - 230)) : Math.min(620, Math.max(360, h - 190));
    var bw = $('.bwrap');
    document.documentElement.style.setProperty('--bd-max', Math.round(max) + 'px');
    // 판 아래 조작 줄까지 한 화면에: 첫 화면에서 시작하는 판은 페이지 위치로, 아래에 있는 판은 칩·이름 줄만 빼고.
    // 판이 좁아지면 칩이 두 줄이 될 수 있어 한 번 더 잰다.
    for (var k = 0; w >= 900 && bw && k < 2; k++) {
      var bc = bw.closest('.bcol') || bw.parentNode;
      var top = bw.getBoundingClientRect().top + window.pageYOffset, bcTop = bc.getBoundingClientRect().top + window.pageYOffset;
      var above = bcTop < Math.min(h * 0.4, 260) ? top : top - bcTop + 16;
      max = Math.min(620, Math.max(360, h - above - 66));
      document.documentElement.style.setProperty('--bd-max', Math.round(max) + 'px');
    }
  }
  fitBoards();
  var rz;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(fitBoards, 120); });

  // =====================================================================
  // 탐색기
  // =====================================================================
  function Explorer(root) {
    var self = this;
    this.root = root;
    this.ch = new Chess();
    this.line = [];          // [{san, uci, fen, epd, from, to}]
    this.ply = 0;
    this.band = store.get('fm.band', 2);
    if (!(this.band >= -1 && this.band <= 3)) this.band = 2;
    this.orient = root.getAttribute('data-orient') || 'w';
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
    this.guideEl = $('[data-guide]', root);
    this.bindUI();
    this.stick();
    var init = FM.paramToLine(new URLSearchParams(location.search).get('m'));
    if (!init.length && root.getAttribute('data-line')) init = root.getAttribute('data-line').split('.');
    this.loadLine(init, root.getAttribute('data-ply') ? +root.getAttribute('data-ply') : null);
  }
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
    // 입14: 마우스가 있는 열 전체 칠하기
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
    $$('[data-practice]', root).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var side = a.getAttribute('data-practice');
        var u = self.line.slice(0, self.ply).map(function (m) { return m.uci; });
        location.href = C.practiceUrl + '?m=' + FM.lineToParam(u) + '&side=' + side;
      });
    });
    if (!window.__fmKeys) window.__fmKeys = this;      // 페이지에 탐색기가 여럿이면 첫 탐색기만 화살표 키를 받는다
    document.addEventListener('keydown', function (e) {
      if (window.__fmKeys !== self || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target.closest && e.target.closest('input,select,textarea,[contenteditable],.bd-pr')) return;
      if (e.key === 'ArrowLeft') { self.nav('prev'); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { self.nav('next'); e.preventDefault(); }
      else if (e.key === 'Home') { self.nav('first'); e.preventDefault(); }
      else if (e.key === 'End') { self.nav('last'); e.preventDefault(); }
    });
  };
  // 폰(한 줄 배치): 칩·이름 줄은 위로 지나가고 판과 조작 줄은 화면 위에 붙어, 아래 수 표를 넘겨도 판이 보인다.
  // 화면이 판보다 넉넉히 길 때만(가로로 눕힌 폰은 안 붙임). 폭이 바뀔 때와 이름 줄 높이가 바뀔 때 다시 잰다.
  Explorer.prototype.stick = function () {
    var self = this, bcol = $('.bcol', this.root), grid = bcol && bcol.parentNode;
    if (!bcol || !grid || !grid.classList.contains('grid')) return;
    var bw = $('.bwrap', bcol), ct = $('.ctrls', bcol), lastW = -1, lastTop = -1;
    function fit(force) {
      var w = document.documentElement.clientWidth;
      if (!force && w === lastW) return;
      lastW = w;
      var need = bw.offsetHeight + (ct ? ct.offsetHeight + 10 : 0);
      if (w >= 900 || window.innerHeight < need + 200) { grid.classList.remove('stick'); return; }
      grid.classList.add('stick');
      var top = bw.offsetTop;                    // 붙은 .bcol 안에서 판까지 거리 = 칩 + 이름 줄
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
    var self = this, epds = [FM.epd(new Chess().fen())].concat(this.line.map(function (m) { return FM.epd(m.fen); }));
    Promise.all(epds.map(function (e) { return FM.entry(e).catch(function () { return null; }); })).then(function () { self.render(true); });
    this.render(true);
  };
  Explorer.prototype.fenAt = function (p) { return p === 0 ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : this.line[p - 1].fen; };
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
  Explorer.prototype.syncChess = function () {
    this.ch.load(this.fenAt(this.ply));
  };
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
  Explorer.prototype.epds = function () {
    var out = [FM.epd(this.fenAt(0))];
    for (var i = 0; i < this.ply; i++) out.push(FM.epd(this.line[i].fen));
    return out;
  };
  Explorer.prototype.render = function (instant) {
    var fen = this.fenAt(this.ply), self = this;
    this.syncChess();
    var last = this.ply ? [this.line[this.ply - 1].from, this.line[this.ply - 1].to] : null;
    this.board.set(fen, last, kingSq(this.ch), instant);
    this.renderMoves();
    this.renderName();
    var epd = FM.epd(fen), seq = (this.seq = (this.seq || 0) + 1);
    var sync = FM.entrySync(epd);
    if (sync !== undefined) this.renderStats(sync);
    else {
      this.root.classList.add('loading');
      FM.entry(epd).then(function (en) {
        if (seq !== self.seq) return;
        self.renderName();
        self.renderStats(en);
      }, function () { if (seq === self.seq) self.renderStats(null, true); });
    }
    this.syncUrl();
  };
  Explorer.prototype.syncUrl = function () {
    if (this.root.getAttribute('data-url') !== 'sync') return;
    var u = this.line.slice(0, this.ply).map(function (m) { return m.uci; });
    var q = u.length ? '?m=' + FM.lineToParam(u) : '';
    try { history.replaceState(null, '', location.pathname + q); } catch (e) {}
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
      // 입8: 가로로 흐르는 수순 줄에서 지금 수가 보이게 (스크롤 상자 안에서만 움직인다)
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
    if (!this.nameEl) return;
    var nm = FM.nameOf(this.epds(), L);
    if (!nm) { this.nameEl.innerHTML = '<span>' + esc(this.ply ? T.name_none : T.name_start) + '</span>'; }
    else this.nameEl.innerHTML = '<span class="eco">' + esc(nm.eco) + '</span><span>' + esc(nm.name) + '</span>';
    if (this.guideEl) {
      var fam = nm && C.guides ? C.guides[nm.slug || ''] : null;
      if (nm && nm.slug && fam && nm.slug !== this.root.getAttribute('data-slug')) {
        this.guideEl.hidden = false;
        this.guideEl.href = fam.u;
        this.guideEl.querySelector('b').textContent = fam.n;
      } else this.guideEl.hidden = true;
    }
  };
  Explorer.prototype.renderStats = function (entry, failed) {
    this.root.classList.remove('loading');
    var s = FM.stats(entry, this.band), tb = this.tbody, self = this;
    this.cur = s;
    if (this.sumEl) {
      if (failed) this.sumEl.textContent = T.load_fail;
      else if (!s || !s.played) this.sumEl.textContent = fmt(T.sum_none, { band: bandName(this.band) });
      else this.sumEl.innerHTML = fmt(T.sum, { n: '<b>' + FM.count(s.played, L) + '</b>', band: esc(bandName(this.band)) });
    }
    var rows = '';
    if (s && s.moves.length) {
      s.moves.slice(0, 12).forEach(function (m) {
        var w = m.w / m.n, d = m.d / m.n, b = m.b / m.n;
        rows += '<tr data-san="' + esc(m.san) + '"><th scope="row"><button type="button" class="mv">' + esc(m.san) + '</button></th>' +
          '<td class="sh"><span class="shb" style="--s:' + m.share.toFixed(3) + '"></span>' + FM.pct(m.share) + '</td>' +
          '<td class="ng">' + FM.count(m.n, L) + '</td>' +
          '<td class="wdl"><span class="bar" role="img" aria-label="' + esc(fmt(T.wdl_aria, { w: FM.pct(w), d: FM.pct(d), b: FM.pct(b) })) + '">' +
          '<i class="w" style="width:' + (w * 100).toFixed(1) + '%">' + (w >= 0.12 ? FM.pct(w) : '') + '</i>' +
          '<i class="d" style="width:' + (d * 100).toFixed(1) + '%">' + (d >= 0.12 ? FM.pct(d) : '') + '</i>' +
          '<i class="b" style="width:' + (b * 100).toFixed(1) + '%">' + (b >= 0.12 ? FM.pct(b) : '') + '</i></span></td></tr>';
      });
    } else {
      rows = '<tr class="empty"><td colspan="4">' + esc(failed ? T.load_fail : this.ch.isCheckmate() ? T.mate : this.ch.isDraw() ? T.drawn : T.rows_none) + '</td></tr>';
    }
    if (tb) tb.innerHTML = rows;
    this.drawArrows(null);
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
        list.push({ from: mv.from, to: mv.to, share: m.share, kind: hot && hot === m.san ? 'hot' : (hot ? 'dim' : 'freq') });
      });
    }
    this.board.drawArrows(list.reverse());
  };
  Explorer.prototype.hot = function (san) { this.drawArrows(san); };

  // =====================================================================
  // 연습 (움12: 단계가 끝나야 다음 단계로. 시간표 없이 상태 하나로 움직인다)
  // =====================================================================
  function Drill(root) {
    var self = this;
    this.root = root;
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
    if (q.get('o') && this.sel) this.sel.value = q.get('o');
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
  Drill.prototype.step = function () {
    var self = this, ply = this.ch.history().length, turn = this.ch.turn();
    if (this.ch.isGameOver()) { this.finish(); return; }
    var mine = turn === this.side;
    if (ply < this.main.length) {
      var u = this.main[ply];
      var t = new Chess(this.ch.fen()), m = t.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (mine) { this.expect = m.san; this.wrongHere = false; this.setState('you'); this.say(T.your_move, ''); }
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
      if (self.ch.history().length > self.main.length) self.extra++;
      self.board.set(self.ch.fen(), [m.from, m.to], kingSq(self.ch));
      self.board.drawArrows([]);
      if (p != null) self.say(fmt(T.opp_played, { san: esc(m.san), p: FM.pct(p), band: esc(bandName(self.band)) }), 'info');
      setTimeout(function () { if (self.state === 'opp') self.step(); }, reduce ? 0 : 160);
    }, reduce ? 60 : 420);
  };
  Drill.prototype.cardKey = function () { return this.key() + '|' + FM.epd(this.ch.fen()); };
  Drill.prototype.userMove = function (mv) {
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
      if (this.ch.history().length > this.main.length) this.extra++;
      this.board.set(this.ch.fen(), [m.from, m.to], kingSq(this.ch));
      this.board.setHint(null);
      this.board.drawArrows([]);
      this.board.flash(m.to, 'ok', { combo: this.wrongHere ? 0 : this.combo });
      this.say(this.wrongHere ? T.fixed : fmt(T.right, { san: esc(m.san) }), 'ok');
      if (this.reviewMode) { this.setState('next'); setTimeout(function () { self.nextReview(); }, reduce ? 200 : 700); return; }
      this.setState('opp');
      setTimeout(function () { self.step(); }, reduce ? 60 : 380);
      return;
    }
    // 틀림: 2000+가 15% 넘게 두는 수면 '둘 만한 수', 아니면 오답
    this.ch.undo();
    var epd = FM.epd(this.ch.fen()), en = FM.entrySync(epd), san = m.san;
    this.board.set(this.ch.fen(), null, kingSq(this.ch), false, true);
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

  // ---- 페이지별 시작 ----
  $$('[data-explorer]').forEach(function (r) { r.__ex = new Explorer(r); });
  $$('[data-drill]').forEach(function (r) { new Drill(r); });
  // 이 오프닝의 갈래(움7: 높이 0fr→1fr 펼치기)
  $$('[data-fold]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      var box = document.getElementById(b.getAttribute('aria-controls'));
      if (box) box.classList.toggle('open', open);
    });
  });
  // 본문 안 수순 링크: 위 탐색기를 그 수순으로
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
  // 다른 언어 안내 띠
  var lb = $('.langbar button');
  if (lb) lb.addEventListener('click', function () { document.documentElement.classList.remove('lb'); store.set('fm.lang', 1); });
})();
