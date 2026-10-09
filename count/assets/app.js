/* 칸칸 화면 연결. 세는 일은 lc-*.js(화면을 모르는 로직)가 하고, 여기서는 칸에 채우기만 한다.
   페이지 언어는 <html lang>이 정한다(브라우저 언어로 바꾸지 않는다). 문구는 빌드가 넣어 둔 #kk JSON에서 읽는다. */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var cfgEl = doc.getElementById('kk');
  var CFG = cfgEl ? JSON.parse(cfgEl.textContent) : {};
  var T = CFG.t || {}, LANG = CFG.lang || 'en';
  var nf = new Intl.NumberFormat(LANG === 'ko' ? 'ko-KR' : 'en-US');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia ? matchMedia('(max-width: 800px)') : { matches: false };
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  /* 영어: 1이면 단위를 단수로(1 word, 1 character) */
  function unit(u, n) { return LANG === 'en' && n === 1 ? String(u).replace(/^(word|character|byte)s/, '$1') : u; }
  function fill(str, map) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return k in map ? map[k] : m; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function clock(sec) {
    sec = Math.round(sec);
    var m = Math.floor(sec / 60), s = sec % 60;
    return m ? fill(T.minsec, { m: nf.format(m), s: s }) : fill(T.sec, { s: s });
  }
  function grow(ta, min) {
    ta.style.height = 'auto';
    ta.style.height = Math.max(min || 0, ta.scrollHeight + 2) + 'px';
  }
  function paintCells(box, ratio, over) {
    var kids = box.children, n = kids.length, on = Math.min(n, Math.floor(ratio * n + 1e-9)), i;
    for (i = 0; i < n; i++) kids[i].className = i < on ? (over ? 'on over' : 'on') : '';
  }

  /* ── 다른 언어판 안내(끼워 넣지 않고 겹쳐 띄움) ── */
  function langbar() {
    if (!CFG.other || store('kk.lang')) return;
    var nav = (navigator.language || '').slice(0, 2).toLowerCase();
    var want = LANG === 'ko' ? nav !== 'ko' : nav === 'ko';
    if (!want) return;
    var top = $('.top');
    if (!top) return;
    var bar = doc.createElement('div');
    bar.className = 'langbar';
    var other = LANG === 'ko' ? 'en' : 'ko';
    bar.innerHTML = '<div><a href="' + CFG.other + '" lang="' + other + '" hreflang="' + other + '"></a><button type="button"></button></div>';
    $('a', bar).textContent = CFG.otherLabel;
    var x = $('button', bar);
    x.textContent = '×';
    x.setAttribute('aria-label', T.close);
    x.addEventListener('click', function () { store('kk.lang', LANG); bar.remove(); });
    $('a', bar).addEventListener('click', function () { store('kk.lang', other); });
    top.appendChild(bar);
  }

  /* ── 루멘랩 칸(화면에 들어올 때 한 번) ── */
  function lumen() {
    var el = $('.lumen');
    if (!el) return;
    if (reduced || !('IntersectionObserver' in window)) { html.classList.remove('anim'); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { el.classList.add('in'); io.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    window.__kkAnim = true;
  }

  /* ── 글자 뜯어보기 ── */
  function inspector(getText) {
    var pick = $('#inspPick'), stage = $('#inspStage'), sum = $('#inspSum');
    if (!pick) return function () {};
    var cur = null, list = [];
    function label(cp) {
      if (cp === 0x200D) return 'ZWJ';
      if (cp === 0xFE0F) return 'VS16';
      if (cp === 0xFE0E) return 'VS15';
      if (cp === 0x200B) return 'ZWSP';
      if (cp === 0x200C) return 'ZWNJ';
      if (cp === 0xFEFF) return 'BOM';
      if (cp === 0x00AD) return 'SHY';
      if (cp >= 0xE0020 && cp <= 0xE007F) return 'TAG';
      return '';
    }
    function show(g, animate) {
      cur = g;
      $$('button', pick).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-g') === g)); });
      var info = LC.inspect(g), parts = info.codePoints, max = 24, i, h = '';
      stage.innerHTML = '';
      var one = doc.createElement('div'); one.className = 'insp-one'; one.textContent = g; stage.appendChild(one);
      var eq = doc.createElement('span'); eq.className = 'insp-eq'; eq.textContent = '='; eq.setAttribute('aria-hidden', 'true'); stage.appendChild(eq);
      var wrap = doc.createElement('div'); wrap.className = 'insp-parts' + (animate && !reduced ? ' go' : ''); wrap.setAttribute('aria-hidden', 'true');
      for (i = 0; i < Math.min(parts.length, max); i++) {
        var cp = parts[i], lb = label(cp), d = doc.createElement('div'), b = doc.createElement('b'), s = doc.createElement('small');
        var ch = String.fromCodePoint(cp);
        if (lb) { d.className = 'inv'; b.textContent = lb; }
        else b.textContent = /^\p{M}$/u.test(ch) ? '◌' + ch : ch;
        s.textContent = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
        d.style.setProperty('--i', i);
        d.appendChild(b); d.appendChild(s); wrap.appendChild(d);
      }
      stage.appendChild(wrap);
      var a = LC.analyze(g);
      var more = parts.length > max ? ' ' + fill(T.inspMore, { n: parts.length - max }) : '';
      var x = (window.LC && LC.x && LC.X_TLD) ? ' ' + fill(T.inspX, { x: LC.x.count(g).weighted }) : '';
      sum.innerHTML = fill(T.inspSum, { g: '<b>' + a.raw.graphemes + '</b>', cp: '<b>' + info.codePoints.length + '</b>', u16: '<b>' + info.units + '</b>', u8: '<b>' + info.utf8 + '</b>' }) + x + more;
    }
    function refresh() {
      var t = getText(), found = [], seen = {}, gs, i, g;
      if (t && t.length <= 20000) {
        gs = LC.graphemes(t);
        for (i = 0; i < gs.length && found.length < 12; i++) {
          g = gs[i];
          if ((g.length > 1 || g.charCodeAt(0) > 0x2000 && LC.isEmoji(g)) && !/^[\r\n]+$/.test(g) && !seen[g]) { seen[g] = 1; found.push(g); }
        }
      }
      var from = found.length ? found : CFG.inspect || [];
      if (from.join('\u0001') === list.join('\u0001')) return;
      list = from;
      pick.innerHTML = '';
      var lead = doc.createElement('span'); lead.textContent = found.length ? T.inspFound : T.inspTry; pick.appendChild(lead);
      list.forEach(function (x) {
        var b = doc.createElement('button'); b.type = 'button'; b.textContent = x; b.setAttribute('data-g', x); b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () { show(x, true); });
        pick.appendChild(b);
      });
      if (list.length && list.indexOf(cur) < 0) show(list[0], false);
    }
    refresh();
    return refresh;
  }

  /* ── 세는 화면(첫 화면·글자 수·바이트·문자·원고지) ── */
  function counter() {
    var ta = $('#text'), nums = $('.nums');
    if (!ta || !nums) return;
    var state = { nl: 1, goal: 0, basis: CFG.goal && CFG.goal[0] ? CFG.goal[0].k : null, ringDone: false, wasIn: false, userEdit: false, page: 0 };
    var cellsBox = $('.goal .cells'), goalIn = $('#goal'), goalSel = $('#goalBasis'), goalMsg = $('#goalMsg'), goalForm = $('.goal-form'), goalOpen = $('[data-act="goal-open"]');
    var wpmR = $('#wpmRead'), wpmS = $('#wpmSpeak'), undoBox = $('.undo'), undoText = null, undoTimer = 0, lateTimer = 0, xTimer = 0;
    var refreshInspect = inspector(function () { return ta.value; });
    var sheet = CFG.tool === 'wongoji' ? wongojiSheet() : null;

    function set(key, val) { $$('[data-n="' + key + '"]').forEach(function (el) { el.textContent = val; }); }
    function basisInfo(k) { var i; for (i = 0; i < (CFG.goal || []).length; i++) if (CFG.goal[i].k === k) return CFG.goal[i]; return null; }

    function render(fromUser, inputType) {
      var t = ta.value, big = t.length > 50000;
      var r = LC.analyze(t, { newline: state.nl, locale: LANG, segment: !big });
      var v = {
        chars: r.chars, nospace: r.charsNoSpace, utf8: r.bytes.utf8, utf16: r.bytes.utf16,
        euckr: r.bytes.euckr ? r.bytes.euckr.bytes : 0, words: r.words, wordsSeg: r.wordsSeg, sentences: r.sentences,
        lines: r.lines, paras: r.paragraphs, codepoints: r.raw.codePoints, units: r.raw.units
      };
      var per = 200, plain = r.chars - state.nl * r.spaces.lineBreaks;
      v.sheets = Math.ceil(plain / per);
      Object.keys(v).forEach(function (k) { if (v[k] != null) set(k, nf.format(v[k])); });
      if (big) { set('wordsSeg', '…'); set('sentences', '…'); }
      html.classList.toggle('has-text', t.length > 0);

      /* 읽는·말하는 시간(가정한 속도, 바꿀 수 있음) */
      if (wpmR) {
        var wr = Math.max(1, parseInt(wpmR.value, 10) || CFG.wpm.read), ws = Math.max(1, parseInt(wpmS.value, 10) || CFG.wpm.speak);
        set('read', clock(LC.seconds(r.words, wr)));
        set('speak', clock(LC.seconds(r.words, ws)));
      }
      /* EUC-KR로 못 담는 글자 */
      var miss = $('[data-miss]');
      if (miss && r.bytes.euckr) {
        var e = r.bytes.euckr;
        miss.hidden = !e.unencodable;
        if (e.unencodable) miss.textContent = fill(T.miss, { n: nf.format(e.unencodable), ex: e.samples.slice(0, 5).join(' ') });
        var ks = $('[data-ks]');
        if (ks) { ks.hidden = !e.outsideKsx1001; if (e.outsideKsx1001) ks.textContent = fill(T.ks, { n: nf.format(e.outsideKsx1001) }); }
      }
      /* 문자(SMS) */
      if (CFG.tool === 'sms' && LC.sms) smsRender(t, v);
      /* X 가중 글자 수: 긴 글은 조금 늦춰 센다 */
      if (CFG.tool === 'chars') {
        clearTimeout(xTimer);
        if (t.length > 20000) xTimer = setTimeout(function () { xRender(t); }, 300); else xRender(t);
      }
      /* 원고지 */
      if (sheet) {
        var lay = LC.wongoji.layout(t), lastRows = lay.rows.length ? lay.rows.length - (Math.max(1, lay.sheets) - 1) * 10 : 0;
        v.laid = lay.sheets; v.rowsUsed = lay.rows.length; v.lastRows = lastRows; v.plain = plain;
        set('laid', nf.format(lay.sheets)); set('rowsUsed', nf.format(lay.rows.length)); set('lastRows', nf.format(lastRows)); set('plain', nf.format(plain));
        sheet.draw(lay);
      }
      goalRender(v, fromUser, inputType, t);
      refreshInspect();

      /* 아주 긴 글: 단어(유니코드 규칙)·문장은 손을 멈춘 뒤에 */
      clearTimeout(lateTimer);
      if (big) lateTimer = setTimeout(function () {
        var full = LC.analyze(ta.value, { newline: state.nl, locale: LANG });
        if (full.wordsSeg != null) set('wordsSeg', nf.format(full.wordsSeg));
        set('sentences', nf.format(full.sentences));
      }, 350);
    }

    function goalRender(v, fromUser, inputType, t) {
      var s3 = $('[data-strip3]');
      var b = basisInfo(state.basis), g = state.goal, n = b ? v[b.k] : 0;
      $$('.bigrow').forEach(function (row) { row.classList.remove('is-over'); });
      if (!cellsBox) return;
      if (!g || !b) {
        paintCells(cellsBox, 0, false);
        if (goalMsg) { goalMsg.textContent = ''; goalMsg.className = 'goal-msg'; }
        if (s3 && CFG.strip3) { $('span', s3).textContent = CFG.strip3.label; $('b', s3).textContent = nf.format(v[CFG.strip3.k]); s3.classList.remove('is-over'); }
        state.wasIn = false;
        return;
      }
      var over = n > g, ratio = n / g, left = g - n;
      paintCells(cellsBox, ratio, over);
      var m = over ? fill(T.over, { n: nf.format(-left), u: unit(b.unit, -left) }) : left === 0 ? T.exact : fill(T.left, { n: nf.format(left), u: unit(b.unit, left) });
      goalMsg.textContent = fill(T.goalOf, { g: nf.format(g), u: unit(b.unit, g), b: b.label }) + ' · ' + m;
      goalMsg.className = 'goal-msg' + (over ? ' is-over' : '');
      var row = $('.bigrow[data-k="' + b.k + '"]');
      if (row && over) row.classList.add('is-over');
      if (s3) { $('span', s3).textContent = over ? T.stripOver : T.stripLeft; $('b', s3).textContent = nf.format(Math.abs(left)); s3.classList.toggle('is-over', over); }
      /* 목표 맞춤 동그라미: 고치다가 목표의 90~100%에 처음 들어온 순간에만 */
      var inRange = ratio >= 0.9 && ratio <= 1;
      if (!t.length) state.ringDone = false;
      if (inRange && !state.wasIn && fromUser && !state.ringDone && inputType !== 'insertFromPaste' && inputType !== 'insertFromDrop' && row && !reduced) ring(row);
      if (inRange && fromUser) state.ringDone = true;
      state.wasIn = inRange;
      $$('.ring').forEach(function (x) { if (!inRange) x.remove(); });
    }
    function ring(row) {
      var vv = $('.vv', row);
      if (!vv || vv.offsetParent === null) return;
      var svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'ring'); svg.setAttribute('viewBox', '0 0 100 50'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
      var p = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M52 3 C22 1 3 10 3 26 C3 42 26 48 52 47 C80 46 97 38 97 24 C97 9 74 2 44 5');
      p.setAttribute('pathLength', '1'); p.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(p); vv.appendChild(svg);
      setTimeout(function () { svg.remove(); }, 2300);
    }

    function smsRender(t) {
      var s = LC.sms.count(t), uni = s.encoding !== 'GSM-7';
      set('segs', nf.format(s.segments));
      set('smsLeft', nf.format(s.remaining));
      set('smsEnc', uni ? T.smsUni : T.smsGsm);
      set('smsLen', fill(uni ? T.smsUnits : T.smsSeptets, { n: nf.format(s.length) }));
      set('smsPer', nf.format(s.perSegment));
      var bar = $('#segbar');
      if (bar) {
        var h = '', i, n = Math.min(s.parts.length, 12);
        for (i = 0; i < Math.max(1, n); i++) h += '<i style="--w:' + (s.parts[i] ? Math.round(s.parts[i] / s.perSegment * 100) : 0) + '%"></i>';
        bar.innerHTML = h;
      }
      var bad = $('#smsBad');
      if (bad) {
        bad.hidden = !uni;
        if (uni) {
          $('span', bad).textContent = T.smsBad;
          var box = $('.chips', bad); box.innerHTML = '';
          s.nonGsm.forEach(function (c) { var i = doc.createElement('i'); i.textContent = /^\s$/.test(c) ? '␣' : c; box.appendChild(i); });
        }
      }
      var s3 = $('[data-strip3]');
      if (s3) $('b', s3).textContent = uni ? 'Unicode' : 'GSM-7';
    }
    function xRender(t) {
      if (!(LC.x && LC.X_TLD)) return;
      var x = LC.x.count(t), el = $('#xNum');
      set('xw', nf.format(x.weighted));
      if (el) el.classList.toggle('is-over', x.over > 0);
      var box = $('#xCells');
      if (box) paintCells(box, x.weighted / x.max, x.over > 0);
      var msg = $('#xMsg');
      if (msg) msg.textContent = x.over > 0 ? fill(T.xOver, { n: nf.format(x.over) }) : fill(T.xLeft, { n: nf.format(x.remaining) });
    }

    /* 원고지 한 장(SVG로 그려 통째로 줄인다) */
    function wongojiSheet() {
      var svg = $('#sheet'), NS = 'http://www.w3.org/2000/svg', texts = [], lay = null, C = 36, GAP = 8, X0 = 2, Y0 = 6, r, c, el;
      function mk(name, attrs) { var e = doc.createElementNS(NS, name), k; for (k in attrs) e.setAttribute(k, attrs[k]); return e; }
      svg.appendChild(mk('line', { x1: 0, y1: 1, x2: 724, y2: 1, 'class': 'rule' }));
      svg.appendChild(mk('line', { x1: 0, y1: 445, x2: 724, y2: 445, 'class': 'rule' }));
      for (r = 0; r < 10; r++) for (c = 0; c < 20; c++) {
        svg.appendChild(mk('rect', { x: X0 + c * C, y: Y0 + r * (C + GAP), width: C, height: C, 'class': 'c' }));
      }
      var mark = mk('rect', { x: 0, y: 0, width: C, height: 3, 'class': 'last', visibility: 'hidden' });
      svg.appendChild(mark);
      for (r = 0; r < 10; r++) for (c = 0; c < 20; c++) {
        el = mk('text', { x: X0 + c * C + C / 2, y: Y0 + r * (C + GAP) + C / 2 + 1 });
        svg.appendChild(el); texts.push(el);
      }
      function draw(l) {
        if (l) lay = l;
        var pages = Math.max(1, lay.sheets), k, row, cell;
        if (state.page >= pages) state.page = pages - 1;
        for (k = 0; k < 200; k++) {
          row = lay.rows[state.page * 10 + Math.floor(k / 20)]; cell = row && row[k % 20];
          texts[k].textContent = cell && cell.t !== ' ' ? cell.t : '';
          texts[k].removeAttribute('class');
        }
        mark.setAttribute('visibility', 'hidden');
        if (!lay.rows.length) Array.from(T.wgGhost).forEach(function (ch, n) { if (ch !== ' ') { texts[n].textContent = ch; texts[n].setAttribute('class', 'ghost'); } });
        else if (state.page === pages - 1) {
          var lr = lay.rows.length - 1, lc = lay.rows[lr].length - 1;
          if (lc >= 0) { mark.setAttribute('x', X0 + lc * C); mark.setAttribute('y', Y0 + (lr - state.page * 10) * (C + GAP) + C - 3); mark.setAttribute('visibility', 'visible'); }
        }
        $('#pageNo').textContent = (state.page + 1) + ' / ' + pages;
        $('#prev').disabled = state.page <= 0; $('#next').disabled = state.page >= pages - 1;
        $('#sheetNo').textContent = 'No. ' + (state.page + 1);
      }
      $('#prev').addEventListener('click', function () { if (state.page > 0) { state.page--; draw(); } });
      $('#next').addEventListener('click', function () { if (lay && state.page < lay.sheets - 1) { state.page++; draw(); } });
      return { draw: draw };
    }

    function fit() { if (narrow.matches) grow(ta, 210); else ta.style.height = ''; }
    ta.addEventListener('input', function (e) { hideUndo(); fit(); render(true, e.inputType); });
    if (narrow.addEventListener) narrow.addEventListener('change', fit);

    /* 줄바꿈 기준 */
    $$('[data-nl]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.nl = +b.getAttribute('data-nl');
        $$('[data-nl]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        var now = $('#nlNow'); if (now) now.textContent = fill(T.nlNow, { n: state.nl });
        render(false);
      });
    });
    [wpmR, wpmS].forEach(function (i) { if (i) i.addEventListener('input', function () { render(false); }); });

    /* 목표 */
    if (goalOpen) {
      goalOpen.addEventListener('click', function () { goalOpen.hidden = true; goalForm.hidden = false; goalIn.focus(); });
      goalIn.addEventListener('input', function () {
        state.goal = parseInt(String(goalIn.value).replace(/[^0-9]/g, ''), 10) || 0;
        state.ringDone = false; state.wasIn = true; /* 목표를 적는 순간에는 동그라미를 그리지 않는다 */
        render(false);
      });
      goalSel.addEventListener('change', function () { state.basis = goalSel.value; state.ringDone = false; state.wasIn = true; render(false); });
      $('[data-act="goal-close"]').addEventListener('click', function () {
        state.goal = 0; goalIn.value = ''; goalForm.hidden = true; goalOpen.hidden = false; render(false); goalOpen.focus();
      });
    }

    /* 예시·복사·지우기(지운 뒤 되돌리기) */
    function hideUndo() { if (undoBox && !undoBox.hidden) { undoBox.hidden = true; undoText = null; clearTimeout(undoTimer); } }
    $$('[data-act="sample"]').forEach(function (b) { b.addEventListener('click', function () { hideUndo(); ta.value = CFG.sample || ''; fit(); render(false); ta.focus(); try { ta.setSelectionRange(0, 0); } catch (e) {} ta.scrollTop = 0; }); });
    $$('[data-act="clear"]').forEach(function (b) {
      b.addEventListener('click', function () {
        undoText = ta.value; ta.value = ''; fit(); render(false);
        if (undoBox) { undoBox.hidden = false; clearTimeout(undoTimer); undoTimer = setTimeout(hideUndo, 12000); }
        ta.focus();
      });
    });
    $$('[data-act="undo"]').forEach(function (b) { b.addEventListener('click', function () { if (undoText != null) { ta.value = undoText; hideUndo(); fit(); render(false); ta.focus(); } }); });
    $$('[data-act="copy"]').forEach(function (b) {
      b.addEventListener('click', function () {
        var done = function () { var old = b.textContent; b.textContent = T.copied; setTimeout(function () { b.textContent = old; }, 1400); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); doc.execCommand('copy'); done(); });
        else { ta.select(); doc.execCommand('copy'); done(); }
      });
    });
    fit();
    render(false);
  }

  /* ── 자소서(문항 여러 개) ── */
  function jasoseo() {
    var listEl = $('#qList'), tpl = $('#qT');
    if (!listEl || !tpl) return;
    var KEY = 'kk.jasoseo', ON = 'kk.jasoseo.on';
    var saveBox = $('#save'), wipe = $('#wipe'), state = { nl: 1 }, timer = 0;
    function readOne(q) { return { title: $('.q-title', q).value, goal: $('.q-goal', q).value, basis: $('.q-basis', q).value, text: $('textarea', q).value }; }
    function all() { return $$('.q', listEl).map(readOne); }
    function persist() {
      if (!saveBox.checked) return;
      clearTimeout(timer);
      timer = setTimeout(function () { store(KEY, JSON.stringify({ v: 1, nl: state.nl, items: all() })); }, 300);
    }
    function renumber() { $$('.q', listEl).forEach(function (q, i) { $('.q-no', q).textContent = i + 1; $('.q-del', q).hidden = $$('.q', listEl).length < 2; }); }
    function count(q) {
      var d = readOne(q), r = LC.analyze(d.text, { newline: state.nl, segment: false });
      var val = { chars: r.chars, nospace: r.charsNoSpace, utf8: r.bytes.utf8 }, n = val[d.basis];
      var unit = d.basis === 'utf8' ? T.unitByte : T.unitChar, g = parseInt(String(d.goal).replace(/[^0-9]/g, ''), 10) || 0;
      $('.q-n', q).textContent = nf.format(n); $('.q-u', q).textContent = unit;
      $('.q-sub', q).textContent = fill(T.qSub, { a: nf.format(r.chars), b: nf.format(r.charsNoSpace), c: nf.format(r.bytes.utf8) });
      var left = $('.left', q);
      paintCells($('.cells', q), g ? n / g : 0, g && n > g);
      left.className = 'left' + (g && n > g ? ' is-over' : '');
      left.textContent = !g ? '' : n > g ? fill(T.over, { n: nf.format(n - g), u: unit }) : n === g ? T.exact : fill(T.left, { n: nf.format(g - n), u: unit });
      return r.chars;
    }
    function total() {
      var sum = 0, qs = $$('.q', listEl);
      qs.forEach(function (q) { sum += count(q); });
      $('#qCount').textContent = nf.format(qs.length); $('#qTotal').textContent = nf.format(sum);
    }
    function bind(q) {
      var ta = $('textarea', q);
      ta.addEventListener('input', function () { grow(ta, 150); total(); persist(); });
      ['.q-title', '.q-goal', '.q-basis'].forEach(function (s) { $(s, q).addEventListener('input', function () { total(); persist(); }); $(s, q).addEventListener('change', function () { total(); persist(); }); });
      $('.q-del', q).addEventListener('click', function () {
        if (ta.value && !window.confirm(T.qDelAsk)) return;
        q.remove(); renumber(); total(); persist();
      });
      grow(ta, 150);
    }
    function add(d) {
      var q = tpl.content.firstElementChild.cloneNode(true);
      listEl.appendChild(q);
      if (d) { $('.q-title', q).value = d.title || ''; $('.q-goal', q).value = d.goal || ''; $('.q-basis', q).value = d.basis || 'chars'; $('textarea', q).value = d.text || ''; }
      bind(q); renumber();
      return q;
    }
    /* 저장해 둔 글(스위치를 켠 사람만) */
    var saved = null;
    if (store(ON) === '1') { try { saved = JSON.parse(store(KEY) || 'null'); } catch (e) { saved = null; } saveBox.checked = true; wipe.hidden = false; }
    if (saved && saved.items && saved.items.length) {
      listEl.innerHTML = '';
      state.nl = saved.nl === 0 || saved.nl === 2 ? saved.nl : 1;
      saved.items.forEach(add);
    } else $$('.q', listEl).forEach(bind);
    $$('[data-nl]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(+b.getAttribute('data-nl') === state.nl));
      b.addEventListener('click', function () {
        state.nl = +b.getAttribute('data-nl');
        $$('[data-nl]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $('#nlNow').textContent = fill(T.nlNow, { n: state.nl });
        total(); persist();
      });
    });
    $('#nlNow').textContent = fill(T.nlNow, { n: state.nl });
    $('#qAdd').addEventListener('click', function () { var q = add(); total(); persist(); $('.q-title', q).focus(); });
    saveBox.addEventListener('change', function () {
      if (saveBox.checked) { store(ON, '1'); wipe.hidden = false; persist(); }
      else { store(ON, null); store(KEY, null); wipe.hidden = true; }
    });
    wipe.addEventListener('click', function () {
      if (!window.confirm(T.wipeAsk)) return;
      store(KEY, null); store(ON, null); saveBox.checked = false; wipe.hidden = true;
      listEl.innerHTML = ''; add(); total();
    });
    renumber(); total();
  }

  function start() {
    langbar();
    lumen();
    if (window.LC && LC.analyze) { counter(); jasoseo(); }
    if (window.KK_ADS) window.KK_ADS.mount();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
