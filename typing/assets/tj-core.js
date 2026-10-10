/* 토독(타자 연습·타자 속도 측정) 핵심 로직. 화면(DOM)을 모른다.
   브라우저에서는 window.TJ, 노드에서는 require('./tj-core.js').
   - 한글은 글자가 아니라 두벌식 글쇠 흐름으로 비교한다(조합 중인 글자, 받침이 다음 글자로 넘어가는 순간을 틀렸다고 하지 않으려고).
   - 타수 = 맞게 친 글쇠 수(Shift 포함) ÷ 분, 영어 WPM = 맞게 친 글자 수 ÷ 5 ÷ 분. 식은 TJ.calc 에만 있다. */
(function (root) {
  'use strict';
  var TJ = {};

  /* ---------- 1. 한글 음절 → 두벌식 글쇠 ---------- */
  function sp(s) { return s.split(''); }
  var CHO = sp('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ');
  var JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅗㅏ', 'ㅗㅐ', 'ㅗㅣ', 'ㅛ', 'ㅜ', 'ㅜㅓ', 'ㅜㅔ', 'ㅜㅣ', 'ㅠ', 'ㅡ', 'ㅡㅣ', 'ㅣ'].map(sp);
  var JONG = ['', 'ㄱ', 'ㄲ', 'ㄱㅅ', 'ㄴ', 'ㄴㅈ', 'ㄴㅎ', 'ㄷ', 'ㄹ', 'ㄹㄱ', 'ㄹㅁ', 'ㄹㅂ', 'ㄹㅅ', 'ㄹㅌ', 'ㄹㅍ', 'ㄹㅎ', 'ㅁ', 'ㅂ', 'ㅂㅅ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'].map(sp);
  /* 낱자(호환 자모) U+3131~U+314E 자음 30자. 겹자음(ㄳ 등)은 두 글쇠 */
  var LONE = ['ㄱ', 'ㄲ', 'ㄱㅅ', 'ㄴ', 'ㄴㅈ', 'ㄴㅎ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㄹㄱ', 'ㄹㅁ', 'ㄹㅂ', 'ㄹㅅ', 'ㄹㅌ', 'ㄹㅍ', 'ㄹㅎ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅂㅅ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'].map(sp);
  var SHIFT_JAMO = 'ㄲㄸㅃㅆㅉㅒㅖ';
  var SHIFT_ASCII = '~!@#$%^&*()_+{}|:"<>?';
  /* 두벌식 글쇠 ↔ 쿼티 글자(한/영 반대 입력 알아채기, 화면 자판 표시용) */
  var K2Q = { 'ㅂ': 'q', 'ㅈ': 'w', 'ㄷ': 'e', 'ㄱ': 'r', 'ㅅ': 't', 'ㅛ': 'y', 'ㅕ': 'u', 'ㅑ': 'i', 'ㅐ': 'o', 'ㅔ': 'p', 'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd', 'ㄹ': 'f', 'ㅎ': 'g', 'ㅗ': 'h', 'ㅓ': 'j', 'ㅏ': 'k', 'ㅣ': 'l', 'ㅋ': 'z', 'ㅌ': 'x', 'ㅊ': 'c', 'ㅍ': 'v', 'ㅠ': 'b', 'ㅜ': 'n', 'ㅡ': 'm', 'ㅃ': 'Q', 'ㅉ': 'W', 'ㄸ': 'E', 'ㄲ': 'R', 'ㅆ': 'T', 'ㅒ': 'O', 'ㅖ': 'P' };
  var Q2K = {};
  Object.keys(K2Q).forEach(function (k) { Q2K[K2Q[k]] = k; });

  function code(ch) { return ch.codePointAt(0); }
  function isSyllable(ch) { var c = code(ch); return c >= 0xAC00 && c <= 0xD7A3; }
  function isLoneJamo(ch) { var c = code(ch); return c >= 0x3131 && c <= 0x3163; }
  function isHangul(ch) { return isSyllable(ch) || isLoneJamo(ch); }
  function isLatin(ch) { return /^[A-Za-z]$/.test(ch); }

  /* 글자 하나를 초성·중성·종성 글쇠 묶음으로. 한글이 아니면 null */
  function parts(ch) {
    var c = code(ch);
    if (c >= 0xAC00 && c <= 0xD7A3) {
      var n = c - 0xAC00;
      return { c: [CHO[Math.floor(n / 588)]], v: JUNG[Math.floor(n / 28) % 21], f: JONG[n % 28] };
    }
    if (c >= 0x3131 && c <= 0x314E) return { c: LONE[c - 0x3131], v: [], f: [] };
    if (c >= 0x314F && c <= 0x3163) return { c: [], v: JUNG[c - 0x314F], f: [] };
    return null;
  }
  /* 글자 하나 → 글쇠(토큰) 배열. 토큰은 낱자 한 글자(Shift가 필요한 ㄲ·ㅆ·ㅒ 등은 그 낱자 그대로), 한글이 아니면 그 글자 */
  function keysOf(ch) {
    var p = parts(ch);
    return p ? p.c.concat(p.v, p.f) : [ch];
  }
  function needsShift(tok) {
    return SHIFT_JAMO.indexOf(tok) >= 0 || (tok >= 'A' && tok <= 'Z') || (tok.length === 1 && SHIFT_ASCII.indexOf(tok) >= 0);
  }
  /* 글쇠 하나의 타수: Shift와 같이 누르면 2타 */
  function strokes(tok) { return needsShift(tok) ? 2 : 1; }
  function toChars(s) { return Array.from(String(s == null ? '' : s).normalize('NFC')); }
  /* 친 글 다듬기: 줄바꿈 하나로, 휴대폰이 바꿔 넣는 둥근 따옴표·줄 안 바뀌는 공백을 자판 글자로 */
  function cleanInput(s) {
    return String(s == null ? '' : s).normalize('NFC').replace(/\r\n?/g, '\n').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, ' ');
  }
  function keyStream(text) {
    var out = [];
    toChars(text).forEach(function (ch) { Array.prototype.push.apply(out, keysOf(ch)); });
    return out;
  }
  function strokeCount(text) {
    var n = 0;
    keyStream(text).forEach(function (k) { n += strokes(k); });
    return n;
  }
  /* 두벌식·쿼티 자판으로 칠 수 있는 글자인지(연습 글 검사, 지원 밖 글자 알림) */
  function typeable(ch) {
    if (isSyllable(ch) || isLoneJamo(ch)) return true;
    var c = code(ch);
    return ch === '\n' || (c >= 0x20 && c <= 0x7E);
  }
  function untypeable(text) {
    var bad = [];
    toChars(text).forEach(function (ch) { if (!typeable(ch) && bad.indexOf(ch) < 0) bad.push(ch); });
    return bad;
  }
  /* 한글 → 쿼티 글자열('한글' → 'gksrmf'), 쿼티 글자 → 두벌식 글쇠 */
  function toQwerty(text) {
    return keyStream(text).map(function (k) { return K2Q[k] || k; }).join('');
  }
  function fromQwerty(ch) { return Q2K[ch] || Q2K[ch.toLowerCase()] || null; }
  /* Shift를 뗀 글쇠(ㄲ → ㄱ, ㅒ → ㅐ) */
  function unshift(tok) { var q = K2Q[tok]; return q ? Q2K[q.toLowerCase()] : tok.toLowerCase(); }

  TJ.hangul = { CHO: CHO, JUNG: JUNG, JONG: JONG, K2Q: K2Q, Q2K: Q2K, parts: parts, keysOf: keysOf, keyStream: keyStream, strokes: strokes, strokeCount: strokeCount, needsShift: needsShift, isSyllable: isSyllable, isHangul: isHangul, typeable: typeable, untypeable: untypeable, toQwerty: toQwerty, fromQwerty: fromQwerty, toChars: toChars, cleanInput: cleanInput };

  /* ---------- 2. 목표 글과 친 글 비교 ----------
     - 띄어쓰기(줄바꿈)를 치면 다음 낱말로 넘어간다. 한 낱말에서 틀려도 다음 낱말은 다시 맞춰서 본다.
     - 낱말 안에서는 글자가 아니라 글쇠 흐름끼리 견준다. 조합 중인 글자('한'을 치는 중의 '하')와
       받침이 다음 글자로 넘어가는 순간('간' → '가나')은 글쇠 흐름으로는 그냥 '맞게 치는 중'이다.
     - 글쇠 하나를 빠뜨리거나 더 쳐도 그 뒤를 전부 틀렸다고 하지 않도록, 가장 적게 고쳐서 맞추는 짝(편집 거리)을 쓴다. */
  var NONE = 0, OK = 1, BAD = 2, PENDING = 3;
  var MATCH = 1, SUB = 2, GONE = 3; /* 목표 글쇠마다: 맞음, 다른 글쇠로 침, 빠뜨림 */
  function isSep(ch) { return ch === ' ' || ch === '\n'; }

  /* 목표 글 준비: 낱말로 나누고 글자마다 글쇠 자리를 적어 둔다. 앞뒤·겹친 띄어쓰기는 하나로 줄인다. */
  function prepare(text) {
    var norm = String(text == null ? '' : text).normalize('NFC').replace(/\r\n?/g, '\n').replace(/[ \n]*\n[ \n]*/g, '\n').replace(/ {2,}/g, ' ').replace(/^[ \n]+|[ \n]+$/g, '');
    var chars = Array.from(norm), words = [], cur = null;
    chars.forEach(function (ch, i) {
      if (isSep(ch)) { cur.sep = ch; cur.sepAt = i; cur = null; return; }
      if (!cur) { cur = { ci: [], ka: [], tk: [], sep: null, sepAt: -1 }; words.push(cur); }
      cur.ci.push(i); cur.ka.push(cur.tk.length);
      Array.prototype.push.apply(cur.tk, keysOf(ch));
    });
    return { text: norm, chars: chars, words: words };
  }
  /* 친 글 정리: 맨 앞 띄어쓰기와 연달아 친 띄어쓰기는 버린다(빈 낱말로 넘어가지 않게). 목표보다 넘치는 낱말도 버린다. */
  function tidy(value, T) {
    var v = cleanInput(value).replace(/^[ \n]+/, '').replace(/([ \n])[ \n]+/g, '$1');
    if (!T) return v;
    var chars = Array.from(v), w = 0, out = [], keys = 0;
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      if (w >= T.words.length) break;
      if (isSep(ch)) { if (T.words[w].sep == null) break; out.push(ch); w++; keys = 0; continue; }
      /* 한 낱말에 목표보다 8글쇠 넘게는 받지 않는다 */
      var k = keysOf(ch).length;
      if (keys + k > T.words[w].tk.length + 8) continue;
      keys += k; out.push(ch);
    }
    return out.join('');
  }
  /* 낱말 하나 맞추기. ik = 친 글쇠, tk = 목표 글쇠, open = 아직 치는 중(띄어쓰기 전)
     돌려주는 값: cost(고친 수), end(목표 글쇠 어디까지 왔나), full(낱말 끝까지 맞추면 고친 수), tOp(목표 글쇠마다), extra(더 친 글쇠가 끼어든 자리) */
  function align(ik, tk, open) {
    var n = ik.length, m = tk.length, W = m + 1, D = new Array((n + 1) * W), i, j;
    for (j = 0; j <= m; j++) D[j] = j;
    for (i = 1; i <= n; i++) {
      D[i * W] = i;
      for (j = 1; j <= m; j++) {
        var d = D[(i - 1) * W + j - 1] + (ik[i - 1] === tk[j - 1] ? 0 : 1), up = D[(i - 1) * W + j] + 1, left = D[i * W + j - 1] + 1;
        D[i * W + j] = d <= up ? (d <= left ? d : left) : (up <= left ? up : left);
      }
    }
    var end = m;
    if (open) { /* 가장 적게 고치는 자리. 같으면 친 글쇠 수와 가까운 쪽, 그래도 같으면 더 나아간 쪽 */
      var best = Infinity, bd = Infinity;
      for (j = 0; j <= m; j++) {
        var v = D[n * W + j], dist = Math.abs(j - n);
        if (v < best || (v === best && dist <= bd)) { best = v; bd = dist; end = j; }
      }
    }
    var tOp = new Array(end), extra = [];
    i = n; j = end;
    while (i > 0 || j > 0) {
      var cur = D[i * W + j];
      if (i > 0 && j > 0 && cur === D[(i - 1) * W + j - 1] + (ik[i - 1] === tk[j - 1] ? 0 : 1)) { tOp[j - 1] = ik[i - 1] === tk[j - 1] ? MATCH : SUB; i--; j--; }
      else if (i > 0 && cur === D[(i - 1) * W + j] + 1) { extra.push(j); i--; }
      else { tOp[j - 1] = GONE; j--; }
    }
    return { cost: D[n * W + end], end: end, full: D[n * W + m], tOp: tOp, extra: extra };
  }
  /* 조합 중인 글자의 모양: 목표 글자의 글쇠 가운데 앞 k개만 친 모습('값'의 3개 = '갑', '과'의 2개 = '고') */
  function partial(ch, k) {
    var p = parts(ch);
    if (!p) return k > 0 ? ch : '';
    if (p.c.length !== 1 || !p.v.length) return p.c.concat(p.v).slice(0, k).join('');
    if (k <= 0) return '';
    if (k === 1) return p.c[0];
    var nv = Math.min(k - 1, p.v.length), nf = Math.max(0, Math.min(k - 1 - p.v.length, p.f.length));
    var vi = -1, fi = -1, vs = p.v.slice(0, nv).join(''), fs = p.f.slice(0, nf).join('');
    JUNG.forEach(function (x, idx) { if (x.join('') === vs) vi = idx; });
    JONG.forEach(function (x, idx) { if (x.join('') === fs) fi = idx; });
    return String.fromCharCode(0xAC00 + (CHO.indexOf(p.c[0]) * 21 + vi) * 28 + fi);
  }
  /* compare(준비한 목표, 친 글, 옵션) → 화면이 그릴 상태
     옵션 lenient: 터치 자판처럼 글쇠를 알 수 없을 때. 마지막 한글 글자는 다음 글자가 올 때까지 판정을 미룬다(천지인의 중간 모양을 틀렸다고 하지 않게).
     옵션 final: 끝났을 때(미뤄 둔 마지막 글자도 맞으면 센다).
     옵션 soft: 목표의 줄바꿈 자리에 띄어쓰기를 쳐도 맞다고 본다.
     돌려주는 값: st(목표 글자마다 0 안 침·1 맞음·2 틀림·3 조합 중), cursor(다음 글쇠가 갈 글자), next(다음에 누를 글쇠),
       pendingText(조합 중인 글자의 모양), okStrokes(맞게 친 타수), okChars·badChars, complete, value(정리한 입력칸 값) */
  function compare(T, value, opt) {
    opt = opt || {};
    var chars = Array.from(tidy(value, T)), raw = '';
    var st = new Array(T.chars.length).fill(NONE);
    var r = { value: chars.join(''), st: st, cursor: 0, next: null, pendingAt: -1, pendingText: '', okStrokes: 0, okChars: 0, badChars: 0, complete: false, fk: [], fw: [], ws: [] };
    if (opt.lenient && chars.length && isHangul(chars[chars.length - 1])) raw = chars.pop();
    /* 친 글을 낱말로 */
    var iw = [{ k: [], sep: null }];
    chars.forEach(function (ch) {
      var w = iw[iw.length - 1];
      if (isSep(ch)) { w.sep = ch; iw.push({ k: [], sep: null }); } else Array.prototype.push.apply(w.k, keysOf(ch));
    });
    if (raw && opt.final) { /* 끝나는 순간 조합 중이던 글자: 맞게 이어지는 글쇠일 때만 넣는다 */
      var lw = iw[iw.length - 1], tw = T.words[iw.length - 1];
      if (tw) { var withRaw = lw.k.concat(keysOf(raw)); if (align(withRaw, tw.tk, true).cost <= align(lw.k, tw.tk, true).cost) lw.k = withRaw; }
      raw = '';
    }
    for (var w = 0; w < iw.length && w < T.words.length; w++) {
      var I = iw[w], Tw = T.words[w], closed = I.sep != null, m = Tw.tk.length;
      r.ws.push(r.fk.length);
      I.k.forEach(function (k) { r.fk.push(k); r.fw.push(w); });
      if (closed) { r.fk.push(I.sep); r.fw.push(w); }
      if (!closed && !I.k.length && !raw) { r.cursor = Tw.ci[0]; r.next = Tw.tk[0]; break; }
      var a = align(I.k, Tw.tk, !closed), tailExtra = a.extra.indexOf(m) >= 0;
      Tw.ci.forEach(function (ci, x) {
        var from = Tw.ka[x], to = x + 1 < Tw.ka.length ? Tw.ka[x + 1] : m, bad = false, done = 0;
        for (var j = from; j < to && j < a.end; j++) { done++; if (a.tOp[j] === MATCH) r.okStrokes += strokes(Tw.tk[j]); else bad = true; }
        a.extra.forEach(function (e) { if (e < m && e >= from && e < to) bad = true; }); /* 더 친 글쇠가 이 글자 안에 끼어들었다 */
        if (bad) { st[ci] = BAD; r.badChars++; }
        else if (done === to - from) { st[ci] = OK; r.okChars++; }
        else if (done > 0) { st[ci] = PENDING; r.pendingAt = ci; r.pendingText = partial(T.chars[ci], done); }
      });
      if (closed) {
        var sepOk = I.sep === Tw.sep || (opt.soft && Tw.sep === '\n' && I.sep === ' ');
        if (sepOk && !tailExtra) { st[Tw.sepAt] = OK; r.okChars++; r.okStrokes += 1; } else { st[Tw.sepAt] = BAD; r.badChars++; }
        r.cursor = Tw.sepAt + 1;
      } else {
        /* 지금 치는 낱말: 다음 글쇠가 갈 글자 */
        if (tailExtra) { if (Tw.sepAt >= 0) { st[Tw.sepAt] = BAD; r.badChars++; } else if (st[Tw.ci[Tw.ci.length - 1]] === OK) { st[Tw.ci[Tw.ci.length - 1]] = BAD; r.okChars--; r.badChars++; } }
        r.next = a.end < m ? Tw.tk[a.end] : Tw.sep; /* 다음에 누를 글쇠(화면 자판 표시용) */
        if (a.end >= m) r.cursor = Tw.sepAt >= 0 ? Tw.sepAt : T.chars.length;
        else { var x = 0; while (x + 1 < Tw.ka.length && Tw.ka[x + 1] <= a.end) x++; r.cursor = Tw.ci[x]; }
        r.complete = w === T.words.length - 1 && a.full === a.cost && !raw && I.k.length > 0;
        r.open = { w: w, cost: a.cost, end: a.end };
      }
    }
    if (raw) { /* 터치 자판에서 조합 중인 글자는 판정하지 않고 그대로 보여 준다 */
      if (r.cursor < st.length && st[r.cursor] !== BAD) { if (st[r.cursor] === OK) r.okChars--; st[r.cursor] = PENDING; }
      r.pendingAt = r.cursor; r.pendingText = raw;
    }
    return r;
  }
  TJ.NONE = NONE; TJ.OK = OK; TJ.BAD = BAD; TJ.PENDING = PENDING;
  TJ.prepare = prepare; TJ.tidy = tidy; TJ.align = align; TJ.partial = partial; TJ.compare = compare;

  /* 한/영이 반대로 켜져 있는지: 'ko' = 한글로 바꿔야 함(한글 글인데 영문자가 들어옴), 'en' = 영어로 바꿔야 함, 'caps' = Caps Lock, null = 모름.
     틀리기 시작한 자리부터 끝까지가 전부 반대쪽 글자이고, 자판만 바꾸면 목표와 맞아떨어질 때만 알린다. */
  function layoutHint(T, I) {
    var n = Math.min(I.length, T.length), m = 0;
    while (m < n && I[m] === T[m]) m++;
    if (m >= n) return null;
    var tail = I.slice(m, n), tgt = T.slice(m);
    if (tail.every(isHangul) && isLatin(tgt[0])) {
      var q = toQwerty(tail.join('')).toLowerCase();
      var want = tgt.slice(0, q.length).join('').toLowerCase();
      return q.length && want === q ? 'en' : null;
    }
    if (tail.every(isLatin) && isHangul(tgt[0])) {
      var typed = tail.map(function (ch) { return fromQwerty(ch); });
      if (typed.some(function (k) { return !k; })) return null;
      var wantK = keyStream(tgt.slice(0, tail.length).join('')).slice(0, typed.length);
      /* Shift 없이 쳐도(ㅆ 자리에 ㅅ) 자판이 반대인 건 같다 */
      var same = typed.every(function (k, j) { return wantK[j] != null && unshift(k) === unshift(wantK[j]); });
      return same ? 'ko' : null;
    }
    if (tail.length >= 2 && tail.every(isLatin) && tgt.slice(0, tail.length).every(isLatin)) {
      var a = tail.join(''), b = tgt.slice(0, tail.length).join('');
      if (a !== b && a.toLowerCase() === b.toLowerCase() && a === a.toUpperCase() && b !== b.toUpperCase()) return 'caps';
    }
    return null;
  }
  TJ.layoutHint = layoutHint;

  /* ---------- 3. 식 ---------- */
  TJ.calc = {
    /* 타수(타/분) = 글쇠 수 × 60000 ÷ 걸린 시간(ms) */
    perMin: function (count, ms) { return ms > 0 ? count * 60000 / ms : 0; },
    /* WPM = 글자 수 ÷ 5 ÷ 분 */
    wpm: function (chars, ms) { return ms > 0 ? chars / 5 * 60000 / ms : 0; },
    /* 정확도(%) = 맞게 누른 글쇠 ÷ 누른 글쇠 × 100. 아무것도 안 눌렀으면 null */
    accuracy: function (ok, typed) { return typed > 0 ? ok / typed * 100 : null; }
  };

  /* 화면에 보여 줄 값. 반올림 순서를 고정한다: 시간은 0.1초까지 먼저 반올림하고, 속도는 그 '표시한 시간'으로 계산해 반올림한다.
     그래서 화면의 "맞게 친 N타 ÷ T초 × 60"을 계산기로 다시 계산하면 화면의 속도와 같은 수가 나온다.
     tenths = 0.1초 단위 정수. 나눗셈은 정수끼리 한 번만 한다(0.1초 값을 실수로 만들어 나누면 딱 .5인 경우가 어긋날 수 있다). */
  TJ.report = function (res) {
    var tenths = Math.max(1, Math.round(res.ms / 100)), typed = res.typedKeys, ok = res.okKeys, acc = null;
    if (typed > 0) {
      acc = Math.round(ok * 100 / typed);
      if (acc === 100 && ok < typed) acc = 99; /* 하나라도 틀렸으면 100%라고 쓰지 않는다 */
      if (acc === 0 && ok > 0) acc = 1;
    }
    return {
      tenths: tenths, secs: tenths / 10,
      secsText: tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1),
      strokes: res.strokes, speed: Math.round(res.strokes * 600 / tenths),   /* 타/분 = 맞게 친 타수 ÷ 초 × 60 */
      chars: res.okChars, wpm: Math.round(res.okChars * 120 / tenths),       /* WPM = 맞게 친 글자 ÷ 5 ÷ 초 × 60 */
      grossWpm: Math.round(typed * 120 / tenths),
      typed: typed, ok: ok, wrong: typed - ok, accuracy: acc, skipped: res.skippedKeys || 0
    };
  };

  /* ---------- 4. 한 판(세션): 친 글이 바뀔 때마다 update ---------- */
  function lcp(a, b) { var i = 0, m = Math.min(a.length, b.length); while (i < m && a[i] === b[i]) i++; return i; }
  var GAP_CAP = 3000; /* 이보다 오래 멈춘 간격은 '느린 글쇠' 계산에서 뺀다(자리를 비운 것) */

  /* mode 'key' = 자판(글쇠가 눌릴 때마다 판정), 'char' = 터치 자판(글자가 끝날 때 판정, 글쇠 수는 두벌식으로 환산) */
  function Session(target, opt) {
    opt = opt || {};
    this.mode = opt.mode === 'char' ? 'char' : 'key';
    this.soft = !!opt.soft;
    this.T = prepare(target);
    this.value = '';
    this.K = [];
    this.typedKeys = 0; this.okKeys = 0; this.typedStrokes = 0;
    this.byKey = {};
    this.pairs = {};
    this.log = [];          /* 친 글쇠마다: 셌는지(c), 맞았는지(good), 그때 쳐야 했던 글쇠(want) */
    this.skippedKeys = 0;   /* 한/영·Caps Lock 안내가 떠 있는 동안 쳐서 세지 않은 글쇠 */
    this.lastAt = null;
    this.samples = [];
    this.cmp = compare(this.T, '', this._opt(false));
  }
  /* 글을 이어 붙인다(시간으로 재는 판에서 글이 모자랄 때) */
  Session.prototype.extend = function (more) { this.T = prepare(this.T.text + ' ' + more); this.cmp = compare(this.T, this.value, this._opt(false)); };
  Session.prototype._opt = function (fin) { return { lenient: this.mode === 'char', soft: this.soft, final: !!fin }; };
  Session.prototype._key = function (tok) { return this.byKey[tok] || (this.byKey[tok] = { hit: 0, miss: 0, ms: 0, n: 0 }); };
  /* 한/영(또는 Caps Lock)이 반대로 켜져 있다고 알리는 구간이 친 글쇠 몇 번째부터인지. 안내가 없으면 Infinity.
     그 구간의 글쇠는 정확도·틀린 글쇠 기록에 넣지 않는다(자판 전환 실수는 타자 실력이 아니다). */
  Session.prototype._zone = function (r) {
    var chars = Array.from(r.value), tc = this.T.chars, h = layoutHint(tc, chars);
    r.hint = h;
    if (!h) return Infinity;
    var m = 0, n = Math.min(chars.length, tc.length), z = 0;
    while (m < n && chars[m] === tc[m]) m++;
    for (var i = 0; i < m; i++) z += isSep(chars[i]) ? 1 : keysOf(chars[i]).length;
    return z;
  };
  Session.prototype._uncount = function (L) {
    this.typedKeys--; this.typedStrokes -= strokes(L.tok); this.skippedKeys++;
    if (L.good) { this.okKeys--; this._key(L.tok).hit--; }
    else {
      this._key(L.want == null ? L.tok : L.want).miss--;
      if (L.want != null) { var id = L.want + '>' + L.tok; if (this.pairs[id] > 1) this.pairs[id]--; else delete this.pairs[id]; }
    }
    L.c = false;
  };
  /* 새로 눌린 글쇠마다 그 순간 맞았는지 본다: 그 글쇠 때문에 낱말의 '고친 수'가 늘면 틀린 글쇠다. 지웠다 다시 쳐도 틀렸던 기록은 남는다. */
  Session.prototype._tally = function (r, at) {
    var start = lcp(this.K, r.fk), added = r.fk.length - start, T = this.T, zone = this._zone(r);
    this.log.length = Math.min(this.log.length, start);
    /* 안내가 뜨기 직전에 이미 틀렸다고 센 글쇠(Caps Lock의 첫 글자 등)도 안내 구간이면 되돌린다 */
    for (var z = zone; z < start; z++) if (this.log[z] && this.log[z].c) this._uncount(this.log[z]);
    for (var idx = start; idx < r.fk.length; idx++) {
      var tok = r.fk[idx], w = r.fw[idx], Tw = T.words[w], before = r.fk.slice(r.ws[w], idx);
      var a0 = align(before, Tw.tk, true), good, want;
      if (isSep(tok)) {
        good = a0.full === a0.cost && (tok === Tw.sep || (this.soft && Tw.sep === '\n' && tok === ' '));
        want = a0.full === a0.cost ? Tw.sep : Tw.tk[a0.end];
      } else {
        good = align(before.concat([tok]), Tw.tk, true).cost === a0.cost;
        want = a0.end < Tw.tk.length ? Tw.tk[a0.end] : Tw.sep;
      }
      if (idx >= zone) { this.log[idx] = { c: false, tok: tok, good: good, want: want }; this.skippedKeys++; continue; }
      this.log[idx] = { c: true, tok: tok, good: good, want: want };
      this.typedKeys++; this.typedStrokes += strokes(tok);
      if (good) {
        this.okKeys++;
        var k = this._key(tok); k.hit++;
        if (this.mode === 'key' && added === 1 && this.lastAt != null && at != null) {
          var dt = at - this.lastAt;
          if (dt >= 0 && dt <= GAP_CAP) { k.ms += dt; k.n++; }
        }
      } else {
        this._key(want == null ? tok : want).miss++;
        if (want != null) { var id = want + '>' + tok; this.pairs[id] = (this.pairs[id] || 0) + 1; }
      }
    }
    if (zone !== Infinity) this.lastAt = null; /* 자판을 바꾸느라 멈춘 간격은 재지 않는다 */
    else if (added > 0 && at != null) this.lastAt = at;
    this.K = r.fk;
  };
  /* 친 글 전체(입력칸 값)와 시각(ms)을 넘긴다. 돌려주는 값은 화면이 그릴 비교 결과(r.value = 정리한 입력칸 값) */
  Session.prototype.update = function (value, at) {
    var r = compare(this.T, value, this._opt(false));
    this._tally(r, at);
    this.value = r.value; this.cmp = r;
    return r;
  };
  /* 멈췄다가 다시 시작할 때: 다음 글쇠의 간격을 재지 않는다 */
  Session.prototype.breakTiming = function () { this.lastAt = null; };
  /* 1초마다 부른다(그래프용). net = 그때까지 맞게 친 타수(지금 글 기준) */
  Session.prototype.sample = function (sec) { this.samples.push({ t: sec, net: this.cmp.okStrokes, typed: this.typedKeys, miss: this.typedKeys - this.okKeys }); };
  /* 끝: 미뤄 둔 마지막 글자까지 판정하고 결과를 낸다 */
  Session.prototype.finish = function (ms) {
    var r = compare(this.T, this.value, this._opt(true));
    this._tally(r, null);
    this.cmp = r;
    return this.result(ms);
  };
  Session.prototype.result = function (ms) {
    var c = this.cmp, by = this.byKey, self = this;
    var list = Object.keys(by).map(function (k) { var b = by[k]; return { key: k, hit: b.hit, miss: b.miss, avg: b.n ? b.ms / b.n : null, n: b.n }; });
    var timed = list.filter(function (x) { return x.n >= 1; });
    var all = 0, cnt = 0;
    timed.forEach(function (x) { all += by[x.key].ms; cnt += x.n; });
    var mean = cnt ? all / cnt : null;
    return {
      ms: ms,
      strokes: c.okStrokes, typedStrokes: this.typedStrokes,
      speed: TJ.calc.perMin(c.okStrokes, ms),            /* 타수(타/분) */
      grossSpeed: TJ.calc.perMin(this.typedStrokes, ms), /* 누른 글쇠 전부 기준 */
      okChars: c.okChars, badChars: c.badChars, typedKeys: this.typedKeys, okKeys: this.okKeys,
      wpm: TJ.calc.wpm(c.okChars, ms),                   /* 순 WPM */
      grossWpm: TJ.calc.wpm(this.typedKeys, ms),         /* 총 WPM */
      accuracy: TJ.calc.accuracy(this.okKeys, this.typedKeys),
      /* 자주 틀린 글쇠: 틀린 횟수가 많은 순, 같으면 틀린 비율이 높은 순 */
      missed: list.filter(function (x) { return x.miss > 0; }).sort(function (a, b) { return b.miss - a.miss || (b.miss / (b.miss + b.hit)) - (a.miss / (a.miss + a.hit)) || (a.key < b.key ? -1 : 1); }),
      /* 느린 글쇠: 세 번 넘게 맞게 친 글쇠 가운데 평균 간격이 전체 평균보다 긴 것, 긴 순 */
      slow: mean == null ? [] : list.filter(function (x) { return x.n >= 3 && x.avg > mean; }).sort(function (a, b) { return b.avg - a.avg || (a.key < b.key ? -1 : 1); }),
      meanGap: mean,
      pairs: Object.keys(this.pairs).map(function (id) { return { want: id.split('>')[0], got: id.split('>')[1], n: self.pairs[id] }; }).sort(function (a, b) { return b.n - a.n; }),
      skippedKeys: this.skippedKeys,
      samples: this.samples.slice(), mode: this.mode
    };
  };
  TJ.Session = Session;

  /* ---------- 5. 시간 재기 ---------- */
  /* now: 지금 시각(ms)을 돌려주는 함수. 첫 글쇠에서 start, 탭이 가려지면 pause, 돌아오면 resume */
  function Timer(now) { this.now = now || function () { return Date.now(); }; this.reset(); }
  Timer.prototype.reset = function () { this.acc = 0; this.t0 = null; this.started = false; };
  Timer.prototype.start = function () { if (!this.started) { this.started = true; this.t0 = this.now(); } };
  Timer.prototype.pause = function () { if (this.started && this.t0 != null) { this.acc += Math.max(0, this.now() - this.t0); this.t0 = null; } };
  Timer.prototype.resume = function () { if (this.started && this.t0 == null) this.t0 = this.now(); };
  Timer.prototype.running = function () { return this.started && this.t0 != null; };
  Timer.prototype.elapsed = function () { return this.acc + (this.t0 == null ? 0 : Math.max(0, this.now() - this.t0)); };
  /* 남은 시간(ms): 0 아래로 내려가지 않는다 */
  Timer.prototype.left = function (limit) { return Math.max(0, limit - this.elapsed()); };
  TJ.Timer = Timer;

  /* ---------- 6. 낱말·문장 고르기(씨앗 고정) ---------- */
  /* 씨앗이 같으면 늘 같은 순서(mulberry32) */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* 글자열 → 씨앗(CRC-32). '2026-10-10' 같은 날짜로 '오늘의 문장'을 정할 때 쓴다 */
  var CRC = null;
  function crc32(str) {
    if (!CRC) { CRC = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
    var crc = 0xFFFFFFFF, bytes = utf8(str);
    for (var i = 0; i < bytes.length; i++) crc = CRC[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function utf8(str) {
    var out = [];
    Array.from(String(str)).forEach(function (ch) {
      var c = ch.codePointAt(0);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xE0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else out.push(0xF0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    });
    return out;
  }
  function int(rand, n) { return Math.floor(rand() * n); }
  function shuffle(list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = int(rand, i + 1), x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  /* 낱말 n개. 바로 앞 두 낱말과 같은 낱말은 뽑지 않는다.
     옵션 punct: 문장부호(영어는 문장 첫 글자를 대문자로), numbers: 숫자 낱말을 가끔 끼움, lang: 'ko' | 'en' */
  function words(list, n, rand, opt) {
    opt = opt || {};
    var out = [], a = null, b = null, left = 0, startOfSentence = true;
    if (list.length < 3) throw new Error('낱말이 3개는 있어야 해요');
    while (out.length < n) {
      var w;
      if (opt.numbers && rand() < 0.12) w = String(int(rand, [10, 100, 1000, 10000][int(rand, 4)]));
      else { do { w = list[int(rand, list.length)]; } while (w === a || w === b); b = a; a = w; }
      if (opt.punct) {
        if (left <= 0) left = 4 + int(rand, 7);
        if (startOfSentence && opt.lang === 'en') w = w.charAt(0).toUpperCase() + w.slice(1);
        startOfSentence = false; left--;
        if (left === 0 || out.length === n - 1) { w += '.?!'.charAt(rand() < 0.8 ? 0 : 1 + int(rand, 2)); startOfSentence = true; left = 0; }
        else if (rand() < 0.14) w += ',';
      }
      out.push(w);
    }
    return out;
  }
  /* 문장을 섞어 minChars 글자가 넘을 때까지 잇는다(한 바퀴 안에서는 같은 문장이 다시 안 나온다) */
  function sentences(list, minChars, rand) {
    var out = [], len = 0, deck = [];
    if (!list.length) throw new Error('문장이 없어요');
    while (len < minChars) {
      if (!deck.length) { deck = shuffle(list, rand); if (out.length && deck[deck.length - 1] === out[out.length - 1] && deck.length > 1) deck.reverse(); }
      var s = deck.pop();
      out.push(s); len += toChars(s).length + 1;
    }
    return out;
  }
  /* 틀린 글쇠가 든 낱말만 모으기: 그 글쇠가 많이 든 낱말부터 */
  function withKeys(list, toks) {
    return list.map(function (w, i) {
      var c = 0; keyStream(w).forEach(function (k) { if (toks.indexOf(k) >= 0) c++; });
      return { w: w, c: c, i: i };
    }).filter(function (x) { return x.c > 0; }).sort(function (x, y) { return y.c - x.c || x.i - y.i; }).map(function (x) { return x.w; });
  }
  TJ.pick = { rng: rng, crc32: crc32, shuffle: shuffle, words: words, sentences: sentences, withKeys: withKeys };

  /* ---------- 7. 자판 자리(화면 자판·손가락 표시용) ---------- */
  /* 줄마다 [Shift 없이, Shift와 같이]. 손가락: 1~4 왼손 새끼~검지, 5~8 오른손 검지~새끼, 0 엄지 */
  TJ.board = {
    rows: ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'],
    shifted: ['~!@#$%^&*()_+', 'QWERTYUIOP{}|', 'ASDFGHJKL:"', 'ZXCVBNM<>?'],
    finger: ['1123445567888', '1234455678888', '12344556788', '1234455678'],
    home: 'asdfjkl;'
  };
  /* 글쇠(토큰) → { ch: 자판에 적힌 영문 자리, shift, finger } . 자판에 없는 글자는 null */
  TJ.keyPlace = function (tok) {
    var q = K2Q[tok] || tok, b = TJ.board;
    if (q === ' ') return { ch: ' ', shift: false, finger: 0 };
    if (q === '\n') return { ch: '\n', shift: false, finger: 8 };
    for (var r = 0; r < 4; r++) {
      var i = b.rows[r].indexOf(q), sh = false;
      if (i < 0) { i = b.shifted[r].indexOf(q); sh = i >= 0; }
      if (i >= 0) return { ch: b.rows[r].charAt(i), shift: sh, finger: +b.finger[r].charAt(i), row: r, col: i };
    }
    return null;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TJ;
  else root.TJ = TJ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
