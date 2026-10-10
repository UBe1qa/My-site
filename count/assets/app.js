/* 칸칸 화면 연결. 세는 일은 lc-*.js(화면을 모르는 로직)가 하고, 여기서는 칸에 채우기만 한다.
   페이지 언어는 <html lang>이 정한다(브라우저 언어로 바꾸지 않는다). 문구는 빌드가 넣어 둔 #kk JSON에서 읽는다.
   저장: localStorage는 LOCAL의 세 가지, sessionStorage는 SESSION 하나뿐이다(방침에 그대로 적는다. _dev/check.py가 대조).
   글은 어디에도 저장하지 않는다(자소서 화면에서 '이 기기에 저장'을 켠 사람만 localStorage에). */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement, win = window;
  var cfgEl = doc.getElementById('kk');
  var CFG = cfgEl ? JSON.parse(cfgEl.textContent) : {};
  var T = CFG.t || {}, LANG = CFG.lang || 'en';
  var LOCAL = { lang: 'kk.lang', on: 'kk.jasoseo.on', text: 'kk.jasoseo' }, SESSION = 'kk.set';
  var nf = new Intl.NumberFormat(LANG === 'ko' ? 'ko-KR' : 'en-US');
  var reduced = win.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = win.matchMedia ? matchMedia('(max-width: 800px)') : { matches: false };
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  /* 영어: 1이면 단위를 단수로(1 word, 1 character) */
  function unit(u, n) { return LANG === 'en' && n === 1 ? String(u).replace(/^(word|character|byte)s/, '$1') : u; }
  function fill(str, map) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return k in map ? map[k] : m; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  /* 같은 탭 안에서만 남는 설정(줄바꿈 기준·목표·읽는 속도). 글은 넣지 않는다. */
  function sget() { try { var o = JSON.parse(sessionStorage.getItem(SESSION) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function sset(k, v) { try { var o = sget(); if (v == null) delete o[k]; else o[k] = v; sessionStorage.setItem(SESSION, JSON.stringify(o)); } catch (e) { /* 저장소를 못 쓰면 그냥 기억하지 않는다 */ } }
  function nlOf(v, d) { return v === 0 || v === 1 || v === 2 ? v : d; }
  /* 숫자 칸: 못 받는 값(소수·음수·글자)은 조용히 바꿔 읽지 않고 표시한다 */
  function readNum(el) { var n = LC.parseCount(el.value), bad = n !== null && isNaN(n); mark(el, bad); return { bad: bad, empty: n === null, n: bad || n === null ? 0 : n }; }
  function mark(el, bad) { if (bad) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); }
  function clock(sec) {
    var d = LC.duration(sec);
    if (d.under) return T.under || fill(T.sec, { s: 0 });
    if (d.h) return fill(T.hrmin, { h: nf.format(d.h), m: d.m });
    return d.m ? fill(T.minsec, { m: d.m, s: d.s }) : fill(T.sec, { s: d.s });
  }
  function grow(ta, min) {
    ta.style.height = 'auto';
    ta.style.height = Math.max(min || 0, ta.scrollHeight + 2) + 'px';
  }
  function paintCells(box, ratio, over) {
    var kids = box.children, n = kids.length, on = Math.min(n, Math.floor(ratio * n + 1e-9)), i;
    for (i = 0; i < n; i++) kids[i].className = i < on ? (over ? 'on over' : 'on') : '';
  }
  /* 사람이 보는 글자 하나를 화면에 적는다. 보이지 않는 글자(탭·폭 없는 이음 글자 등)는 이름으로. */
  var INVIS = null, MARK = null, PICT = null;
  try { INVIS = new RegExp('^[\\p{Cc}\\p{Cf}\\p{Z}\\p{Default_Ignorable_Code_Point}]$', 'u'); MARK = new RegExp('^\\p{M}', 'u'); PICT = new RegExp('\\p{Extended_Pictographic}', 'u'); } catch (e) { INVIS = /^[\s​-‏⁠﻿­]$/; }
  function shown(g) {
    var names = T.names || {}, cps, i, c, ch, vis = '', extra = [];
    if (LC.isEmoji(g) || (PICT && PICT.test(g))) return g;   /* 이모지 묶음 안의 이음 글자는 그 이모지의 일부다 */
    cps = LC.inspect(g).codePoints;
    for (i = 0; i < cps.length; i++) {
      c = cps[i]; ch = String.fromCodePoint(c);
      if (names[c.toString(16)]) extra.push(names[c.toString(16)]);
      else if (c >= 0xD800 && c <= 0xDFFF || INVIS.test(ch)) extra.push(fill(T.nameU || 'U+{h}', { h: c.toString(16).toUpperCase().padStart(4, '0') }));
      else vis += ch;
    }
    if (!extra.length) return MARK && MARK.test(g) ? '◌' + g : g;
    return (vis ? vis + ' + ' : '') + extra.join(' + ');
  }

  /* ── 다른 언어판 안내: 화면 아래 작은 띠. 끼워 넣지 않고 겹쳐 띄운다(화면 밀림 0).
        띄울지는 <head>의 짧은 스크립트가 첫 그림 전에 정해 둔다(html.lb: 꼬리말 아래에 띠만큼 자리를 둔다).
        제목·설정·단추를 덮지 않는다: 가운데·오른쪽·왼쪽 가운데 누르는 것을 덮지 않는 자리에 놓고,
        스크롤하다 누르는 것 위에 오게 되면 그동안 비켜 준다(.away). 글 칸·설정 칸을 쓰는 동안에도 비켜 준다(.busy). ── */
  function langbar() {
    if (!CFG.other || !html.classList.contains('lb')) return;
    var bar = doc.createElement('div'), main = $('main'), raf = 0, gone = false;
    var HIT = 'a,button,input,select,textarea,summary,label,h1,.strip', SPOTS = ['', 'at-r', 'at-l'];
    bar.className = 'langbar away';   /* 자리를 고른 뒤에 보인다(보이는 채로 옮기면 화면 밀림으로 잡힌다) */
    var other = LANG === 'ko' ? 'en' : 'ko';
    bar.innerHTML = '<div><a href="' + CFG.other + '" lang="' + other + '" hreflang="' + other + '"></a><button type="button"></button></div>';
    var pill = bar.firstChild;
    $('a', bar).textContent = CFG.otherLabel;
    var x = $('button', bar);
    x.textContent = '×';
    x.setAttribute('aria-label', T.close);
    x.addEventListener('click', function () { store(LOCAL.lang, LANG); gone = true; bar.remove(); html.classList.remove('lb'); });
    $('a', bar).addEventListener('click', function () { store(LOCAL.lang, other); });
    /* 그 자리(가운데·오른쪽·왼쪽)에 놓였을 때의 네모. 띠를 실제로 옮겨 보지 않고 셈한다 */
    function rectAt(name) {
      var r = pill.getBoundingClientRect(), vw = html.clientWidth, left = name === 'at-r' ? vw - 12 - r.width : name === 'at-l' ? 12 : (vw - r.width) / 2;
      return { left: left, right: left + r.width, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    }
    /* 그 네모 아래에 누르는 것(이나 제목·숫자 띠)이 있는가 */
    function covers(r) {
      if (!doc.elementsFromPoint) return false;
      r = r || pill.getBoundingClientRect();
      var w = r.width - 4, xs = [r.left + 2, r.left + 2 + w / 4, r.left + 2 + w / 2, r.left + 2 + w * 3 / 4, r.right - 2], ys = [r.top + 2, r.top + r.height / 2, r.bottom - 2], i, j, k, els;
      for (i = 0; i < xs.length; i++) for (j = 0; j < ys.length; j++) {
        els = doc.elementsFromPoint(xs[i], ys[j]);
        for (k = 0; k < els.length; k++) if (!bar.contains(els[k]) && els[k].matches(HIT)) return true;
      }
      return false;
    }
    function spot(name) { SPOTS.forEach(function (n) { if (n) bar.classList.toggle(n, n === name); }); }
    /* 자리 잡기(처음 한 번과 화면 크기가 바뀔 때만): 덮지 않는 첫 자리. 없으면 가운데에 두고 비켜 있는다 */
    function place() {
      var i;
      if (gone) return;
      for (i = 0; i < SPOTS.length; i++) if (!covers(rectAt(SPOTS[i]))) { spot(SPOTS[i]); bar.classList.remove('away'); return; }
      spot(''); bar.classList.add('away');
    }
    function dodge() { raf = 0; if (!gone) bar.classList.toggle('away', covers()); }
    function later(fn) { return function () { if (!raf) raf = win.requestAnimationFrame ? requestAnimationFrame(fn) : setTimeout(fn, 50); }; }
    doc.body.appendChild(bar);
    place();
    win.addEventListener('scroll', later(dodge), { passive: true });
    win.addEventListener('resize', later(function () { raf = 0; place(); }));
    win.addEventListener('load', later(dodge));
    if (main && win.ResizeObserver) new ResizeObserver(later(dodge)).observe(main);
    if (main) {
      main.addEventListener('focusin', function (e) { if (e.target && /^(TEXTAREA|INPUT|SELECT)$/.test(e.target.tagName)) bar.classList.add('busy'); });
      main.addEventListener('focusout', function () { bar.classList.remove('busy'); });
    }
  }

  /* ── 루멘랩 칸: 글자는 늘 보이고, 화면에 들어올 때 한 번 차례로 다시 놓인다 ── */
  function lumen() {
    var el = $('.lumen');
    if (!el) return;
    if (reduced || !('IntersectionObserver' in win)) { html.classList.remove('anim'); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { el.classList.add('in'); io.disconnect(); }
    });
    io.observe(el);
  }

  /* ── 휴대폰 메뉴: 한 줄로 두고 옆으로 민다. 지금 페이지가 보이게 맞춰 둔다(화면은 밀리지 않는다) ── */
  function navScroll() {
    var nav = $('.nav'), cur = $('.nav a[aria-current]');
    if (nav && cur && nav.scrollWidth > nav.clientWidth + 2) nav.scrollLeft = Math.max(0, cur.offsetLeft - 16);
  }

  /* ── Intl.Segmenter가 없는 브라우저: 조용히 틀리지 않고 코드 포인트로 센다고 알린다 ── */
  function approxNote() {
    if (!(LC.support && !LC.support().segmenter) || !T.approx) return false;
    var head = $('.phead'), p = doc.createElement('p');
    if (!head) return true;
    p.className = 'approx wrap'; p.setAttribute('role', 'status'); p.textContent = T.approx;
    head.parentNode.insertBefore(p, head.nextSibling);
    if (CFG.approxHide) $$('.nums .proof').forEach(function (el) { el.hidden = true; });
    return true;
  }

  /* ── 글자 뜯어보기 ── */
  function inspector(getText, approx) {
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
      var info = LC.inspect(g), parts = info.codePoints, max = 24, i;
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
      var x = (win.LC && LC.x && LC.X_TLD) ? ' ' + fill(T.inspX, { x: LC.x.count(g).weighted }) : '';
      /* Segmenter가 없으면 '사람이 보기엔 몇 글자'를 말할 수 없다: 그 부분을 뺀 문장을 쓴다 */
      sum.innerHTML = fill(approx && T.inspSumApprox ? T.inspSumApprox : T.inspSum, { g: '<b>' + a.raw.graphemes + '</b>', cp: '<b>' + info.codePoints.length + '</b>', u16: '<b>' + info.units + '</b>', u8: '<b>' + info.utf8 + '</b>' }) + x + more;
    }
    function refresh() {
      var t = getText(), found = [], seen = {}, gs, i, g;
      if (t && t.length <= 20000) {
        gs = LC.graphemes(t);
        for (i = 0; i < gs.length && found.length < 12; i++) {
          g = gs[i];
          if ((g.length > 1 || g.charCodeAt(0) > 0x2000 && LC.isEmoji(g)) && !/^[\r\n]+$/.test(g) && !seen['$' + g]) { seen['$' + g] = 1; found.push(g); }
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

  /* ── 세는 화면(첫 화면·글자 수·바이트·문자·나이스·SNS·원고지) ── */
  function counter(approx) {
    var ta = $('#text'), nums = $('.nums');
    if (!ta || !nums) return;
    /* 줄바꿈 기준은 같은 탭 안에서 도구를 옮겨도 남는다(바이트 화면은 바이트 쪽 값) */
    var GK = LANG + ':' + CFG.tool, NLK = CFG.tool === 'byte' ? 'nlb' : 'nl', S0 = sget();
    var state = { nl: nlOf(S0[NLK], 1), goal: 0, goalBad: false, basis: CFG.goal && CFG.goal[0] ? CFG.goal[0].k : null, ringDone: false, wasIn: false, page: 0, wg: 0, seen: null, sig: null };
    var cellsBox = CFG.goal && CFG.goal.length ? $('.goal .cells') : null, goalIn = $('#goal'), goalSel = $('#goalBasis'), goalMsg = $('#goalMsg'), goalForm = $('.goal-form'), goalOpen = $('[data-act="goal-open"]');
    var wpmR = $('#wpmRead'), wpmS = $('#wpmSpeak'), wpmNote = $('#wpmNote'), undoBox = $('.undo'), undoText = null, lateTimer = 0, xTimer = 0, limTimer = 0;
    var hasLims = $$('[data-unit]').length > 0, neisSel = $('#neisItem'), neisCus = $('#neisCustom'), smsSel = $('#smsBase'), smsCus = $('#smsCustom');
    var refreshInspect = inspector(function () { return ta.value; }, approx);
    var sheet = CFG.tool === 'wongoji' ? wongojiSheet() : null;

    function set(key, val) { $$('[data-n="' + key + '"]').forEach(function (el) { el.textContent = val; }); }
    function basisInfo(k) { var i; for (i = 0; i < (CFG.goal || []).length; i++) if (CFG.goal[i].k === k) return CFG.goal[i]; return null; }
    /* 지금 칸들에 든 값(브라우저가 뒤로 가기·탭 복원 때 되살린 값도 여기서 읽힌다) */
    function sig() { return [ta.value, goalIn && goalIn.value, goalSel && goalSel.value, neisSel && neisSel.value, neisCus && neisCus.value, smsSel && smsSel.value, smsCus && smsCus.value, wpmR && wpmR.value, wpmS && wpmS.value].join('\u0001'); }

    function render(fromUser, inputType) {
      var t = ta.value, big = t.length > 50000, slow = t.length > 20000;
      state.seen = t; state.sig = sig();
      var r = LC.analyze(t, { newline: state.nl, locale: LANG, segment: !big });
      var v = {
        chars: r.chars, nospace: r.charsNoSpace, utf8: r.bytes.utf8, utf16: r.bytes.utf16,
        euckr: r.bytes.euckr ? r.bytes.euckr.bytes : 0, words: r.words, wordsSeg: r.wordsSeg, sentences: r.sentences,
        lines: r.lines, paras: r.paragraphs, codepoints: r.codePoints, units: r.raw.units
      };
      var per = 200, plain = r.chars - state.nl * r.spaces.lineBreaks;
      v.sheets = Math.ceil(plain / per);
      Object.keys(v).forEach(function (k) { if (v[k] != null) set(k, nf.format(v[k])); });
      /* 아주 긴 글: 아직 세는 중인 숫자는 옛 값을 두지 않고 전부 '…'로 */
      if (big) { set('wordsSeg', '…'); set('sentences', '…'); }
      html.classList.toggle('has-text', t.length > 0);

      /* 읽는·말하는 시간(가정한 속도, 바꿀 수 있음). 빈칸·0·못 받는 값이면 처음 값으로 계산하고 그렇게 적는다 */
      if (wpmR) {
        var note = [], anyBad = false, sp = function (inp, def, name) {
          var n = readNum(inp);
          if (n.bad) anyBad = true;
          if (n.bad || !n.n) note.push(fill(n.bad ? T.wpmBad : T.wpmDef, { l: name, d: def }));
          return n.bad || !n.n ? def : n.n;
        };
        set('read', clock(LC.seconds(r.words, sp(wpmR, CFG.wpm.read, T.wpmRead))));
        set('speak', clock(LC.seconds(r.words, sp(wpmS, CFG.wpm.speak, T.wpmSpeak))));
        if (wpmNote) { wpmNote.textContent = note.join(' '); wpmNote.className = 'fld-note' + (anyBad ? ' is-bad' : ''); }
      }
      /* EUC-KR로 못 담는 글자: 조각 수가 아니라 사람이 보는 글자 수로 */
      var miss = $('[data-miss]');
      if (miss && r.bytes.euckr) {
        var e = r.bytes.euckr;
        miss.hidden = !e.unencodableChars;
        if (e.unencodableChars) miss.textContent = fill(T.miss, { n: nf.format(e.unencodableChars), ex: e.sampleChars.slice(0, 5).map(shown).join(', ') });
        var ks = $('[data-ks]');
        if (ks) { ks.hidden = !e.outsideKsx1001; if (e.outsideKsx1001) ks.textContent = fill(T.ks, { n: nf.format(e.outsideKsx1001) }); }
      }
      /* 문자(SMS) */
      if (CFG.tool === 'sms' && LC.sms) smsRender(t, v);
      /* X 가중 글자 수: 긴 글은 조금 늦춰 센다 */
      if (CFG.tool === 'chars') {
        clearTimeout(xTimer);
        if (slow) { xPending(); xTimer = setTimeout(function () { xRender(ta.value); }, 300); } else xRender(t);
      }
      /* 원고지 */
      if (sheet) {
        var lay = LC.wongoji.layout(t, state.wg ? LC.wongoji.CUSTOM : {}), lastRows = lay.rows.length ? lay.rows.length - (Math.max(1, lay.sheets) - 1) * 10 : 0;
        v.laid = lay.sheets; v.rowsUsed = lay.rows.length; v.lastRows = lastRows; v.plain = plain;
        set('laid', nf.format(lay.sheets)); set('rowsUsed', nf.format(lay.rows.length)); set('lastRows', nf.format(lastRows)); set('plain', nf.format(plain));
        sheet.draw(lay);
      }
      goalRender(v, fromUser, inputType, t);
      if (neisSel) neisRender(t);
      if (smsSel) krSmsRender(v.euckr);
      if (hasLims) {
        clearTimeout(limTimer);
        if (slow) { limPending(); limTimer = setTimeout(function () { limRender(ta.value); }, 300); } else limRender(t);
      }
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
      if (!cellsBox || !g || !b) {
        /* 목표가 없으면 목표 칸은 보이지 않는다(빈 막대가 무엇인지 헷갈린다는 지적) */
        if (cellsBox) { cellsBox.hidden = true; paintCells(cellsBox, 0, false); }
        if (goalMsg) { goalMsg.textContent = state.goalBad ? T.goalBad : ''; goalMsg.className = 'goal-msg' + (state.goalBad ? ' is-bad' : ''); }
        if (s3 && CFG.strip3 && v[CFG.strip3.k] != null) { $('span', s3).textContent = CFG.strip3.label; $('b', s3).textContent = nf.format(v[CFG.strip3.k]); s3.classList.remove('is-over'); }
        state.wasIn = false;
        return;
      }
      var over = n > g, ratio = n / g, left = g - n;
      cellsBox.hidden = false;
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

    /* 나이스(생기부): 항목의 최대 글자 수(한글 기준) × 3 = 한도 바이트 */
    function neisRender(t) {
      var custom = neisSel.value === 'custom', cn = custom ? readNum(neisCus) : null;
      $('#neisCustomRow').hidden = !custom;
      var max = custom ? cn.n : +neisSel.value;
      var r = LC.neis(t, max), over = r.over && r.limit > 0, box = $('#neisCells'), none = !max;
      /* 최대 글자 수가 아직 없으면 한도·남은 바이트를 숫자처럼 보이게 두지 않는다('-') */
      set('neisB', nf.format(r.bytes)); set('neisMax', none ? '-' : nf.format(r.limit));
      set('neisLeft', none ? '-' : nf.format(Math.abs(r.left)));
      set('neisH', none ? '-' : nf.format(r.hangulLeft)); set('breaks', nf.format(r.lineBreaks));
      $$('[data-lab="neisLeft"]').forEach(function (el) { el.textContent = over ? T.neisOver : T.neisLeft; });
      $$('[data-k="neisB"], [data-k="neisLeft"]').forEach(function (el) { el.classList.toggle('is-over', over); });
      var eq = $('#neisEq');
      eq.textContent = max ? fill(T.neisEq, { c: nf.format(max), b: nf.format(r.limit) }) : cn && cn.bad ? T.numBad : T.neisNone;
      eq.className = 'goal-msg' + (cn && cn.bad ? ' is-bad' : '');
      paintCells(box, r.limit ? r.bytes / r.limit : 0, over);
    }
    /* 문자 한 통 기준(EUC-KR 바이트로 견준다) */
    function krSmsRender(bytes) {
      var custom = smsSel.value === 'custom', msg = $('#smsMsg'), box = $('#smsCells'), cn = custom ? readNum(smsCus) : null;
      $('#smsCustomWrap').hidden = !custom;
      var base = custom ? cn.n : +smsSel.value;
      if (!base) { msg.textContent = cn && cn.bad ? T.numBad : T.smsNone; msg.className = 'sms-msg' + (cn && cn.bad ? ' is-bad' : ''); paintCells(box, 0, false); return; }
      var long = bytes > base;   /* 장문은 틀린 것이 아니라 종류가 바뀌는 것이라 넘침 색을 쓰지 않는다 */
      paintCells(box, bytes / base, false);
      msg.textContent = fill(long ? T.smsLong : T.smsShort, { n: nf.format(Math.abs(base - bytes)) });
      msg.className = 'sms-msg' + (long ? ' is-long' : '');
    }
    /* SNS 한도: 서비스마다 세는 단위가 다르다(data-unit). 같은 단위는 한 번만 센다.
       둘째 한도(data-unit2: 블루스카이의 UTF-8 3,000바이트)가 있으면 둘 다 보고 하나라도 넘으면 넘침 */
    function limRender(t) {
      var memo = {};
      function m(u) { if (!(u in memo)) memo[u] = LC.measure(t, u); return memo[u]; }
      $$('[data-unit]').forEach(function (li) {
        var lim = +li.getAttribute('data-limit'), n = m(li.getAttribute('data-unit'));
        var u2 = li.getAttribute('data-unit2'), lim2 = +li.getAttribute('data-limit2'), n2 = u2 ? m(u2) : null;
        if (n == null) return;
        var over = n > lim, over2 = n2 != null && n2 > lim2;
        $('[data-lim-n]', li).textContent = nf.format(n);
        if (n2 != null) $('[data-lim-n2]', li).textContent = nf.format(n2);
        $('.lim-bar i', li).style.width = Math.min(100, Math.max(n / lim, n2 != null ? n2 / lim2 : 0) * 100) + '%';
        li.classList.toggle('is-over', over || over2);
        $('[data-lim-left]', li).textContent = over || !over2 ? fill(over ? T.limOver : T.limLeft, { n: nf.format(Math.abs(lim - n)) }) : fill(T.limOver2, { n: nf.format(n2 - lim2) });
      });
    }
    function limPending() {
      $$('[data-unit]').forEach(function (li) {
        $('[data-lim-n]', li).textContent = '…';
        var n2 = $('[data-lim-n2]', li); if (n2) n2.textContent = '…';
        $('[data-lim-left]', li).textContent = '';
        li.classList.remove('is-over');
      });
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
          /* 사람이 보는 글자 단위로(이모지 묶음은 하나), 보이지 않는 글자는 이름으로 */
          (s.nonGsmChars || s.nonGsm).forEach(function (c) { var el = doc.createElement('i'), tx = shown(c); el.textContent = tx; if (tx !== c) el.className = 'nm'; box.appendChild(el); });
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
    function xPending() {
      var el = $('#xNum'), box = $('#xCells'), msg = $('#xMsg');
      set('xw', '…');
      if (el) el.classList.remove('is-over');
      if (box) paintCells(box, 0, false);
      if (msg) msg.textContent = '';
    }

    /* 원고지 한 장(SVG로 그려 통째로 줄인다). 인쇄할 때는 모든 장을 한 쪽에 한 장씩 따로 그린다 */
    function wongojiSheet() {
      var svg = $('#sheet'), NS = 'http://www.w3.org/2000/svg', texts = [], lay = null, C = 36, GAP = 8, X0 = 2, Y0 = 6, r, c, el;
      var out = $('#printSheets'), printBtn = $('[data-act="print"]'), printKey = null, pageCss = null, CAP = 300, ASK = 50;
      function mk(name, attrs) { var e = doc.createElementNS(NS, name), k; for (k in attrs) e.setAttribute(k, attrs[k]); return e; }
      function cx(col) { return X0 + col * C + C / 2; }
      function cy(row) { return Y0 + row * (C + GAP) + C / 2 + 1; }
      function cls(t) { var len = t.length > 1 ? LC.graphemes(t).length : 1; return len > 2 ? 't3' : len > 1 ? 't2' : ''; }
      svg.appendChild(mk('line', { x1: 0, y1: 1, x2: 724, y2: 1, 'class': 'rule' }));
      svg.appendChild(mk('line', { x1: 0, y1: 445, x2: 724, y2: 445, 'class': 'rule' }));
      for (r = 0; r < 10; r++) for (c = 0; c < 20; c++) {
        svg.appendChild(mk('rect', { x: X0 + c * C, y: Y0 + r * (C + GAP), width: C, height: C, 'class': 'c' }));
      }
      var mark = mk('rect', { x: 0, y: 0, width: C, height: 3, 'class': 'last', visibility: 'hidden' });
      svg.appendChild(mark);
      for (r = 0; r < 10; r++) for (c = 0; c < 20; c++) {
        el = mk('text', { x: cx(c), y: cy(r) });
        svg.appendChild(el); texts.push(el);
      }
      function draw(l) {
        if (l) lay = l;
        var pages = Math.max(1, lay.sheets), k, row, cell, cl;
        if (state.page >= pages) state.page = pages - 1;
        for (k = 0; k < 200; k++) {
          row = lay.rows[state.page * 10 + Math.floor(k / 20)]; cell = row && row[k % 20];
          texts[k].textContent = cell && cell.t !== ' ' ? cell.t : '';
          cl = cell ? cls(cell.t) : '';
          if (cl) texts[k].setAttribute('class', cl); else texts[k].removeAttribute('class');
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
      /* 인쇄용: 장마다 틀(선 둘 + 칸 200개를 길 하나로)과 글자가 놓인 칸만 그린다. 안내 글자·마지막 칸 표시는 넣지 않는다 */
      function grid() {
        var d = '', row, col;
        for (row = 0; row < 10; row++) for (col = 0; col < 20; col++) d += 'M' + (X0 + col * C) + ' ' + (Y0 + row * (C + GAP)) + 'h' + C + 'v' + C + 'h-' + C + 'z';
        return d;
      }
      function buildPrint() {
        if (!out || !lay) return 0;
        var pages = Math.max(1, lay.sheets), n = Math.min(pages, CAP), key = state.wg + '|' + ta.value, d, p, k, sec, s, row, cell, t, note, cl;
        html.classList.add('wg-print');
        /* 원고지는 가로로 긴 종이에 한 장씩. 이 화면에서 원고지를 인쇄할 때만 쪽 방향을 정한다 */
        if (!pageCss) { pageCss = doc.createElement('style'); pageCss.textContent = '@page{size:landscape;margin:12mm}'; doc.head.appendChild(pageCss); }
        if (key === printKey) return pages;
        out.textContent = ''; d = grid();
        for (p = 0; p < n; p++) {
          sec = doc.createElement('section'); sec.className = 'psheet';
          t = doc.createElement('p'); t.className = 'psheet-h'; t.textContent = fill(T.printHead, { a: nf.format(p + 1), b: nf.format(pages) }); sec.appendChild(t);
          s = mk('svg', { viewBox: '0 0 724 446' });
          s.appendChild(mk('line', { x1: 0, y1: 1, x2: 724, y2: 1, 'class': 'rule' }));
          s.appendChild(mk('line', { x1: 0, y1: 445, x2: 724, y2: 445, 'class': 'rule' }));
          s.appendChild(mk('path', { d: d, 'class': 'c' }));
          for (k = 0; k < 200; k++) {
            row = lay.rows[p * 10 + Math.floor(k / 20)]; cell = row && row[k % 20];
            if (!cell || !cell.t || cell.t === ' ') continue;
            el = mk('text', { x: cx(k % 20), y: cy(Math.floor(k / 20)) }); el.textContent = cell.t;
            cl = cls(cell.t); if (cl) el.setAttribute('class', cl);
            s.appendChild(el);
          }
          sec.appendChild(s);
          t = doc.createElement('p'); t.className = 'psheet-f'; t.innerHTML = '<span>20 × 10</span><span>No. ' + (p + 1) + '</span>'; sec.appendChild(t);
          out.appendChild(sec);
        }
        if (pages > CAP) { note = doc.createElement('p'); note.className = 'psheet-note'; note.textContent = fill(T.printCap, { n: nf.format(pages), c: nf.format(CAP) }); out.lastChild.appendChild(note); }
        printKey = key;
        return pages;
      }
      $('#prev').addEventListener('click', function () { if (state.page > 0) { state.page--; draw(); } });
      $('#next').addEventListener('click', function () { if (lay && state.page < lay.sheets - 1) { state.page++; draw(); } });
      /* 브라우저 인쇄(Ctrl+P)로 들어와도 모든 장이 나오게 */
      win.addEventListener('beforeprint', buildPrint);
      if (printBtn) printBtn.addEventListener('click', function () {
        var pages = lay ? Math.max(1, lay.sheets) : 1;
        /* 장수가 아주 많으면 인쇄 전에 알려 준다 */
        if (pages > ASK && !win.confirm(fill(pages > CAP ? T.printAskCap : T.printAsk, { n: nf.format(pages), c: nf.format(CAP) }))) return;
        buildPrint(); win.print();
      });
      return { draw: draw, build: buildPrint };
    }

    function fit() { if (narrow.matches) grow(ta, 210); else ta.style.height = ''; }
    ta.addEventListener('input', function (e) { hideUndo(); fit(); render(true, e.inputType); });
    if (narrow.addEventListener) narrow.addEventListener('change', fit);

    /* 줄바꿈 기준 */
    function nlPaint() {
      $$('[data-nl]').forEach(function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-nl') === state.nl)); });
      var now = $('#nlNow'); if (now) now.textContent = fill(T.nlNow, { n: state.nl });
    }
    $$('[data-nl]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.nl = +b.getAttribute('data-nl');
        sset('nl', state.nl); sset('nlb', state.nl);   /* 이 화면들은 글자와 바이트를 같은 값으로 센다 */
        nlPaint();
        render(false);
      });
    });
    function saveWpm() {
      var a = LC.parseCount(wpmR.value), b = LC.parseCount(wpmS.value);
      sset('wpm', a > 0 || b > 0 ? [a > 0 ? a : 0, b > 0 ? b : 0] : null);
    }
    [wpmR, wpmS].forEach(function (i) { if (i) i.addEventListener('input', function () { saveWpm(); render(false); }); });
    [neisCus, smsCus].forEach(function (i) { if (i) i.addEventListener('input', function () { render(false); }); });
    [neisSel, smsSel].forEach(function (i) { if (i) i.addEventListener('change', function () { render(false); var c = i === neisSel ? neisCus : smsCus; if (i.value === 'custom') c.focus(); }); });
    /* 원고지: 칸에 놓는 방법(한 칸에 한 글자 | 관행대로) */
    $$('[data-wg]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.wg = +b.getAttribute('data-wg'); state.page = 0;
        $$('[data-wg]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        var note = $('#wgNote'); if (note) note.textContent = state.wg ? T.wgCustom : T.wgPlain;
        render(false);
      });
    });

    /* 목표: 칸에 든 값을 읽는다(머리의 짧은 스크립트가 같은 탭에서 쓰던 목표를 첫 그림 전에 넣어 둔다) */
    function readGoal() {
      if (!goalIn) return;
      var n = readNum(goalIn);
      state.goal = n.n; state.goalBad = n.bad;
      if (goalSel.value) state.basis = goalSel.value;
      if (!n.empty) { goalOpen.hidden = true; goalForm.hidden = false; }
    }
    function saveGoal() {
      var all = sget().goal || {};
      if (state.goal > 0) all[GK] = [state.goal, state.basis]; else delete all[GK];
      sset('goal', Object.keys(all).length ? all : null);
    }
    if (goalOpen) {
      goalOpen.addEventListener('click', function () { goalOpen.hidden = true; goalForm.hidden = false; goalIn.focus(); });
      goalIn.addEventListener('input', function () {
        readGoal(); saveGoal();
        state.ringDone = false; state.wasIn = true; /* 목표를 적는 순간에는 동그라미를 그리지 않는다 */
        render(false);
      });
      goalSel.addEventListener('change', function () { state.basis = goalSel.value; saveGoal(); state.ringDone = false; state.wasIn = true; render(false); });
      $('[data-act="goal-close"]').addEventListener('click', function () {
        state.goal = 0; state.goalBad = false; goalIn.value = ''; mark(goalIn, false); saveGoal(); goalForm.hidden = true; goalOpen.hidden = false; render(false); goalOpen.focus();
      });
    }

    /* 예시·복사·지우기. 글을 바꿔 놓는 단추(예시·지우기) 뒤에는 되돌리기가 나오고, 글을 다시 고치면 사라진다.
       시간이 지났다고 숨기지 않는다(휴대폰에서는 한 줄을 차지해서, 가만히 있을 때 숨기면 아래 내용이 밀린다) */
    function hideUndo() { if (undoBox && !undoBox.hidden) { undoBox.hidden = true; undoText = null; } }
    function showUndo(prev, msg) {
      undoText = prev;
      if (!undoBox) return;
      var m = $('.undo-msg', undoBox); if (m) m.textContent = msg;
      undoBox.hidden = false;
    }
    $$('[data-act="sample"]').forEach(function (b) {
      b.addEventListener('click', function () {
        var prev = ta.value;   /* 화면에는 빈 칸으로 보였더라도 실제 값을 읽는다(브라우저가 되살린 글을 덮어쓰지 않게) */
        ta.value = CFG.sample || ''; fit(); render(false);
        showUndo(prev, T.undoSample);
        ta.focus(); try { ta.setSelectionRange(0, 0); } catch (e) { /* 선택을 못 옮겨도 된다 */ } ta.scrollTop = 0;
      });
    });
    $$('[data-act="clear"]').forEach(function (b) {
      b.addEventListener('click', function () {
        var prev = ta.value;
        ta.value = ''; fit(); render(false);
        showUndo(prev, T.undoCleared);
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

    /* 처음 값: 같은 탭에서 쓰던 줄바꿈 기준·읽는 속도 */
    if (state.nl !== 1) nlPaint();
    if (wpmR) {
      if (S0.wpm && S0.wpm[0] > 0) wpmR.value = S0.wpm[0];
      if (S0.wpm && S0.wpm[1] > 0) wpmS.value = S0.wpm[1];
    }
    /* 브라우저가 글 칸·설정 칸의 값을 되살렸으면(뒤로 가기, 탭 복제·복원. load 무렵에 일어나고 input 이벤트가 없다) 다시 읽어 센다 */
    function sync() { if (sig() === state.sig) return; readGoal(); fit(); render(false); }
    win.addEventListener('load', sync);
    win.addEventListener('pageshow', function (e) {
      /* 통째로 되살아난 화면(bfcache): 그 사이 다른 도구에서 바꾼 줄바꿈 기준을 따라간다 */
      var n = e && e.persisted ? nlOf(sget()[NLK], state.nl) : state.nl;
      if (n !== state.nl) { state.nl = n; nlPaint(); state.sig = null; }
      sync();
    });
    ta.addEventListener('focus', sync);
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) sync(); });
    readGoal();
    fit();
    render(false);
  }

  /* ── 자소서(문항 여러 개) ── */
  function jasoseo() {
    var listEl = $('#qList'), tpl = $('#qT');
    if (!listEl || !tpl) return;
    var saveBox = $('#save'), wipe = $('#wipe'), S0 = sget(), timer = 0, active = null, guarded = false;
    var state = { nl: nlOf(S0.nl, 1), nlb: nlOf(S0.nlb, nlOf(S0.nl, 1)) };
    var presetMsg = $('#presetMsg'), presetUndo = $('#presetUndo'), presetBack = null, wipeUndo = $('#wipeUndo'), wipeBack = null;
    function readOne(q) { return { title: $('.q-title', q).value, goal: $('.q-goal', q).value, basis: $('.q-basis', q).value, text: $('textarea', q).value }; }
    function all() { return $$('.q', listEl).map(readOne); }
    function saveNow() {
      var items = all();
      if (saveBox.checked) store(LOCAL.text, JSON.stringify({ v: 1, nl: state.nl, nlb: state.nlb, items: items }));
      /* 같은 탭 안에서는 문항별 목표와 기준, 줄바꿈 기준을 기억한다(문항 이름과 글은 넣지 않는다) */
      var jq = items.map(function (d) { var g = LC.parseCount(d.goal); return [g > 0 ? g : 0, d.basis]; });
      sset('jq', jq.length > 1 || jq[0][0] || jq[0][1] !== 'chars' ? jq : null);
      sset('nl', state.nl); sset('nlb', state.nlb);
    }
    function persist() { clearTimeout(timer); timer = setTimeout(function () { timer = 0; saveNow(); }, 300); }
    /* 페이지를 떠날 때 아직 적지 않은 것이 있으면 바로 적는다 */
    function flush() { if (timer) { clearTimeout(timer); timer = 0; saveNow(); } }
    /* 저장을 안 켠 채 글이 있으면 떠나기 전에 브라우저가 한 번 묻는다. 글이 없거나 저장을 켰으면 묻지 않는다 */
    function warn(e) { e.preventDefault(); e.returnValue = ''; }
    function guard() {
      var need = !saveBox.checked && $$('textarea', listEl).some(function (t) { return t.value.length > 0; });
      if (need === guarded) return;
      guarded = need;
      if (need) win.addEventListener('beforeunload', warn); else win.removeEventListener('beforeunload', warn);
    }
    function renumber() { $$('.q', listEl).forEach(function (q, i) { $('.q-no', q).textContent = i + 1; $('.q-del', q).hidden = $$('.q', listEl).length < 2; }); }
    function count(q) {
      var d = readOne(q), r = LC.analyze(d.text, { newline: state.nl, newlineBytes: state.nlb, segment: false });
      var e = r.bytes.euckr || { bytes: 0, unencodableChars: 0, sampleChars: [] };
      var val = { chars: r.chars, nospace: r.charsNoSpace, utf8: r.bytes.utf8, euckr: e.bytes }, n = val[d.basis] || 0;
      var isByte = d.basis === 'utf8' || d.basis === 'euckr';
      var u = isByte ? T.unitByte : T.unitChar, gn = readNum($('.q-goal', q)), g = gn.n;
      $('.q-n', q).textContent = nf.format(n); $('.q-u', q).textContent = u;
      $('.q-sub', q).textContent = fill(T.qSub, { a: nf.format(r.chars), b: nf.format(r.charsNoSpace), c: nf.format(r.bytes.utf8), d: nf.format(e.bytes) });
      var miss = $('.q-miss', q), showMiss = d.basis === 'euckr' && e.unencodableChars > 0;
      miss.hidden = !showMiss;
      if (showMiss) miss.textContent = fill(T.qMiss, { n: nf.format(e.unencodableChars), ex: e.sampleChars.slice(0, 5).map(shown).join(', ') });
      var left = $('.left', q), cells = $('.cells', q), over = g > 0 && n > g;
      cells.hidden = !g;
      paintCells(cells, g ? n / g : 0, over);
      left.className = 'left' + (over ? ' is-over' : gn.bad ? ' is-bad' : '');
      left.textContent = gn.bad ? T.goalBad : !g ? '' : over ? fill(T.over, { n: nf.format(n - g), u: u }) : n === g ? T.exact : fill(T.left, { n: nf.format(g - n), u: u });
      q._c = { n: n, g: g, over: over, basis: d.basis };
      return r.chars;
    }
    /* 휴대폰 숫자 띠: 지금 쓰는 문항의 글자 수 · 남은 글자 · 목표(자판이 올라와도 위에 붙어 보인다) */
    function strip() {
      var box = $('.js-strip'), qs = $$('.q', listEl);
      if (!box || !qs.length) return;
      if (!active || qs.indexOf(active) < 0) active = qs[0];
      var c = active._c || { n: 0, g: 0, over: false, basis: 'chars' }, left = $('#sLeftP');
      $('#sLab').textContent = fill(T.stripQ, { n: qs.indexOf(active) + 1, b: (T.stripBasis || {})[c.basis] || '' });
      $('#sN').textContent = nf.format(c.n);
      $('#sLeftLab').textContent = c.over ? T.stripOver : T.stripLeft;
      $('#sLeft').textContent = c.g ? nf.format(Math.abs(c.g - c.n)) : '-';
      left.classList.toggle('is-over', c.over);
      $('#sGoal').textContent = c.g ? nf.format(c.g) : '-';
    }
    function total() {
      var sum = 0, qs = $$('.q', listEl);
      qs.forEach(function (q) { sum += count(q); });
      $('#qCount').textContent = nf.format(qs.length); $('#qTotal').textContent = nf.format(sum);
      strip(); guard();
    }
    function changed() { hidePresetUndo(); dropWipe(); total(); persist(); }
    function bind(q) {
      var ta = $('textarea', q);
      ta.addEventListener('input', function () { dropWipe(); grow(ta, 150); total(); persist(); });
      ['.q-title', '.q-goal', '.q-basis'].forEach(function (s) { $(s, q).addEventListener('input', changed); $(s, q).addEventListener('change', changed); });
      q.addEventListener('focusin', function () { if (active !== q) { active = q; strip(); } });
      $('.q-del', q).addEventListener('click', function () {
        if (ta.value && !win.confirm(T.qDelAsk)) return;
        q.remove(); renumber(); changed();
      });
      grow(ta, 150);
    }
    function add(d) {
      var q = tpl.content.firstElementChild.cloneNode(true);
      listEl.appendChild(q);
      if (d) fillQ(q, d);
      bind(q);
      return q;
    }
    function fillQ(q, d) { $('.q-title', q).value = d.title || ''; $('.q-goal', q).value = d.goal || ''; $('.q-basis', q).value = d.basis || 'chars'; if (!$('.q-basis', q).value) $('.q-basis', q).value = 'chars'; $('textarea', q).value = d.text || ''; }
    function rebuild(items) { listEl.innerHTML = ''; active = null; (items && items.length ? items : [null]).forEach(function (d) { add(d); }); renumber(); }
    function nlPaint() {
      $$('[data-nl]').forEach(function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-nl') === state.nl)); });
      $$('[data-nlb]').forEach(function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-nlb') === state.nlb)); });
      $('#nlNow').textContent = fill(T.nlNow, { n: state.nl, b: state.nlb });
    }

    /* 처음: 저장해 둔 글(스위치를 켠 사람만) 또는 같은 탭에서 쓰던 문항별 목표.
       문항 칸은 페이지의 짧은 스크립트가 첫 그림 전에 같은 값으로 만들어 둔다(화면 밀림 방지). 여기서는 같은 값을 다시 확인해 넣고 잇는다. */
    var saved = null, items = null;
    if (store(LOCAL.on) === '1') { try { saved = JSON.parse(store(LOCAL.text) || 'null'); } catch (e) { saved = null; } saveBox.checked = true; wipe.hidden = false; }
    if (saved && saved.items && saved.items.length) {
      items = saved.items;
      state.nl = nlOf(saved.nl, 1); state.nlb = nlOf(saved.nlb, state.nl);
    } else if (S0.jq && S0.jq.length) items = S0.jq.map(function (x) { return { goal: x && x[0] > 0 ? String(x[0]) : '', basis: x && x[1] }; });
    if (items) {
      var have = $$('.q', listEl);
      if (have.length !== items.length) rebuild(items);
      else have.forEach(function (q, i) { fillQ(q, items[i]); bind(q); });
    } else $$('.q', listEl).forEach(bind);

    $$('[data-nl]').forEach(function (b) { b.addEventListener('click', function () { state.nl = +b.getAttribute('data-nl'); nlPaint(); changed(); }); });
    $$('[data-nlb]').forEach(function (b) { b.addEventListener('click', function () { state.nlb = +b.getAttribute('data-nlb'); nlPaint(); changed(); }); });
    nlPaint();
    /* 취업 사이트 바이트에 맞추기: 모든 문항을 한글 2byte 기준으로, 줄바꿈은 글자 1자·바이트 1 또는 2byte(인크루트)로.
       누르기 전 상태를 기억해 두었다가 되돌릴 수 있다 */
    function hidePresetUndo() { if (presetBack) { presetBack = null; presetUndo.hidden = true; } }
    $$('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        var sels = $$('.q-basis', listEl), back = { nl: state.nl, nlb: state.nlb, bases: sels.map(function (s) { return s.value; }) };
        state.nl = 1; state.nlb = +b.getAttribute('data-preset');
        sels.forEach(function (sel) { sel.value = 'euckr'; });
        nlPaint(); total(); persist();
        presetBack = back; presetUndo.hidden = false;
        $('span', presetMsg).textContent = fill(T.presetDone, { q: nf.format(sels.length), n: state.nlb });
      });
    });
    presetUndo.addEventListener('click', function () {
      if (!presetBack) return;
      var back = presetBack, sels = $$('.q-basis', listEl);
      state.nl = back.nl; state.nlb = back.nlb;
      sels.forEach(function (sel, i) { if (back.bases[i]) sel.value = back.bases[i]; });
      hidePresetUndo(); nlPaint(); total(); persist();
      $('span', presetMsg).textContent = T.presetUndone;
    });
    $('#qAdd').addEventListener('click', function () { var q = add(); renumber(); changed(); $('.q-title', q).focus(); });
    saveBox.addEventListener('change', function () {
      if (saveBox.checked) { store(LOCAL.on, '1'); wipe.hidden = false; saveNow(); }
      else { store(LOCAL.on, null); store(LOCAL.text, null); wipe.hidden = true; }
      guard();
    });
    /* 저장한 글 지우기: 저장소와 화면의 글을 지운다. 다시 쓰기 시작하기 전까지 되돌릴 수 있다 */
    function dropWipe() { if (!wipeBack) return; wipeBack = null; if (wipeUndo) wipeUndo.hidden = true; }
    wipe.addEventListener('click', function () {
      if (!win.confirm(T.wipeAsk)) return;
      clearTimeout(timer); timer = 0;
      var back = { nl: state.nl, nlb: state.nlb, items: all() };
      store(LOCAL.text, null); store(LOCAL.on, null); saveBox.checked = false; wipe.hidden = true;
      sset('jq', null);
      hidePresetUndo(); rebuild(null); total();
      wipeBack = back;
      if (wipeUndo) wipeUndo.hidden = false;
    });
    if (wipeUndo) $('button', wipeUndo).addEventListener('click', function () {
      if (!wipeBack) return;
      var back = wipeBack;
      dropWipe();
      state.nl = back.nl; state.nlb = back.nlb;
      rebuild(back.items); nlPaint();
      saveBox.checked = true; store(LOCAL.on, '1'); wipe.hidden = false;
      total(); saveNow();
    });
    /* 브라우저가 칸의 값을 되살렸으면(뒤로 가기, 탭 복제·복원) 다시 읽어 센다 */
    function sync() { $$('.q textarea', listEl).forEach(function (t) { grow(t, 150); }); total(); }
    win.addEventListener('load', sync);
    win.addEventListener('pageshow', function (e) {
      if (e && e.persisted && !saveBox.checked) { var o = sget(); state.nl = nlOf(o.nl, state.nl); state.nlb = nlOf(o.nlb, state.nlb); nlPaint(); }
      sync();
    });
    win.addEventListener('pagehide', flush);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) flush(); else total(); });
    renumber(); total();
  }

  function start() {
    lumen();
    navScroll();
    if (win.LC && LC.analyze) { var approx = approxNote(); counter(approx); jasoseo(); }
    langbar();   /* 도구가 칸 높이를 잡은 뒤에 자리를 고른다 */
    if (win.KK_ADS) win.KK_ADS.mount();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
