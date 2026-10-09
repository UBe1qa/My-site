/* 글자수 세기 핵심 로직. 화면(DOM)을 모른다.
   브라우저: window.LC / 노드: require('./lc-core.js')
   - LC.analyze(text, opts): 글자·공백·줄·단어·문장·바이트·글자 종류를 한 번에 센다.
   - 세는 기준(무엇을 한 글자로 보는지)은 README 격인 CLAUDE.md '세는 기준'과 화면 설명에 그대로 적는다.
   기준값 대조: tests/gen_cases.py(파이썬 regex·표준 코덱·uniseg) → tests/cases.json → tests/run.mjs */
(function (root) {
  'use strict';
  var LC = root.LC || (root.LC = {});

  /* ── 글자 종류 번호 ─────────────────────────────── */
  var SPACE = 0, HANGUL = 1, LATIN = 2, DIGIT = 3, HANJA = 4, EMOJI = 5, LETTER = 6, SYMBOL = 7, INVISIBLE = 8;
  var CLASS_NAMES = ['space', 'hangul', 'latin', 'digit', 'hanja', 'emoji', 'letter', 'symbol', 'invisible'];
  var F_CLASS = 15, F_SIMPLE = 16, F_WS = 32;

  /* 공백 = 유니코드 White_Space 속성(25자). 줄바꿈(LF·CR)도 여기 든다. */
  var WS_LIST = [9, 10, 11, 12, 13, 32, 0x85, 0xA0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
    0x2007, 0x2008, 0x2009, 0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000];

  function re(src, flags) { try { return new RegExp(src, flags); } catch (e) { return null; } }
  var P = {
    hangul: re('^\\p{Script=Hangul}', 'u'),
    han: re('^\\p{Script=Han}', 'u'),
    latin: re('^\\p{Script=Latin}', 'u'),
    digit: re('^\\p{Nd}', 'u'),
    letter: re('^[\\p{L}\\p{N}\\p{M}]', 'u'),
    invisible: re('^[\\p{Cc}\\p{Cf}\\p{Default_Ignorable_Code_Point}]+$', 'u'),
    rgi: re('^\\p{RGI_Emoji}$', 'v'),
    pict: re('\\p{Extended_Pictographic}', 'u'),
    epres: re('\\p{Emoji_Presentation}', 'u'),
    flag: re('^\\p{Regional_Indicator}{2}$', 'u')
  };
  var HAS_PROPS = !!(P.hangul && P.han && P.latin && P.digit && P.letter && P.invisible && P.pict);
  var KEYCAP = /^[#*0-9]️?⃣$/;

  /* 한 번에 한 칸(UTF-16 단위 하나)이고, 이런 글자 둘이 나란히 있으면 반드시 글자 경계가 있는 범위.
     이 범위의 글자만 이어지는 곳은 Intl.Segmenter 없이 바로 센다(100만 자도 빠르게). */
  var SIMPLE_RANGES = [
    [0x00, 0x0C], [0x0E, 0x7F], [0x80, 0x2FF], [0x370, 0x482], [0x48A, 0x52F],
    [0x2000, 0x200A], [0x2010, 0x2027], [0x202F, 0x205F],
    [0x3000, 0x3029], [0x3041, 0x3096], [0x30A1, 0x30FA], [0x3131, 0x318E],
    [0x3400, 0x4DBF], [0x4E00, 0x9FFF], [0xAC00, 0xD7A3], [0xFF01, 0xFF5E], [0xFFE0, 0xFFE6]
  ];

  var INFO = null;
  function table() {
    if (INFO) return INFO;
    var t = new Uint8Array(65536), i, k, c, ch;
    for (i = 0; i < 65536; i++) t[i] = SYMBOL;
    for (k = 0; k < SIMPLE_RANGES.length; k++) {
      for (c = SIMPLE_RANGES[k][0]; c <= SIMPLE_RANGES[k][1]; c++) {
        if (c >= 0x4E00 && c <= 0x9FFF || c >= 0x3400 && c <= 0x4DBF) { t[c] = HANJA | F_SIMPLE; continue; }
        if (c >= 0xAC00 && c <= 0xD7A3) { t[c] = HANGUL | F_SIMPLE; continue; }
        t[c] = classOfCodePoint(String.fromCharCode(c), c) | F_SIMPLE;
      }
    }
    for (k = 0; k < WS_LIST.length; k++) { ch = WS_LIST[k]; t[ch] = (t[ch] & F_SIMPLE) | SPACE | F_WS; }
    INFO = t;
    return t;
  }

  /* 글자 묶음의 첫 코드 포인트로 종류를 정한다(공백·이모지·보이지 않는 글자는 따로 먼저 본다). */
  function classOfCodePoint(s, c, partOfLonger) {
    if (c < 0x80) {
      if (c >= 48 && c <= 57) return DIGIT;
      if (c >= 65 && c <= 90 || c >= 97 && c <= 122) return LATIN;
      if ((c < 32 || c === 127) && !partOfLonger) return INVISIBLE;
      return SYMBOL;
    }
    if (!HAS_PROPS) {
      if (c >= 0xAC00 && c <= 0xD7A3 || c >= 0x1100 && c <= 0x11FF || c >= 0x3131 && c <= 0x318E) return HANGUL;
      if (c >= 0x4E00 && c <= 0x9FFF) return HANJA;
      return SYMBOL;
    }
    if (!partOfLonger && P.invisible.test(s)) return INVISIBLE;
    if (P.hangul.test(s)) return HANGUL;
    if (P.han.test(s)) return HANJA;
    if (P.latin.test(s)) return LATIN;
    if (P.digit.test(s)) return DIGIT;
    if (P.letter.test(s)) return LETTER;
    return SYMBOL;
  }

  function isEmoji(s) {
    if (P.rgi) return P.rgi.test(s);
    if (!HAS_PROPS) return false;
    if (KEYCAP.test(s)) return true;
    if (P.flag && P.flag.test(s)) return true;
    return P.pict.test(s) && (s.indexOf('️') >= 0 || (P.epres ? P.epres.test(s) : true));
  }
  LC.isEmoji = isEmoji;

  /* 글자 묶음(사람이 보는 한 글자) 하나의 종류 */
  function classOfCluster(s, info) {
    var c = s.charCodeAt(0);
    if (info[c] & F_WS) return SPACE;
    if (s.length > 1 || c >= 0x2000) {
      if (isEmoji(s)) return EMOJI;
      if (HAS_PROPS && P.invisible.test(s)) return INVISIBLE;
    }
    /* 보이지 않는 글자로 시작해도 묶음 전체가 그런 글자가 아니면(위에서 걸러짐) 기호로 둔다 */
    var first = 1;
    if (c >= 0xD800 && c <= 0xDBFF && s.length > 1) { c = s.codePointAt(0); first = 2; }
    else if ((info[c] & F_SIMPLE) && ((info[c] & F_CLASS) !== INVISIBLE || s.length === 1)) return info[c] & F_CLASS;
    return classOfCodePoint(first === 2 ? s.substr(0, 2) : s.charAt(0), c, s.length > first);
  }

  /* ── Intl.Segmenter ─────────────────────────────── */
  var segCache = {};
  function segmenter(granularity, locale) {
    var key = granularity + '|' + (locale || '');
    if (key in segCache) return segCache[key];
    var s = null;
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) s = new Intl.Segmenter(locale || undefined, { granularity: granularity });
    } catch (e) { s = null; }
    segCache[key] = s;
    return s;
  }
  LC.support = function () {
    return { segmenter: !!segmenter('grapheme'), properties: HAS_PROPS, rgiEmoji: !!P.rgi, cp949: !!LC.CP949 };
  };

  /* ── CP949 표 풀기(lc-cp949.js가 있을 때) ─────── */
  var CP = null;
  function b64(s) {
    if (typeof atob === 'function') {
      var bin = atob(s), out = new Uint8Array(bin.length), i;
      for (i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    return new Uint8Array(Buffer.from(s, 'base64'));
  }
  function cp949() {
    if (CP) return CP;
    var src = LC.CP949;
    if (!src) return null;
    var t = new Uint8Array(65536), han = b64(src.han), ksx = b64(src.ksx), i, k, c;
    /* 1 = CP949에 있음, 3 = 옛 완성형(KS X 1001)에도 있음 */
    for (i = 0; i <= 0x9FFF - 0x4E00; i++) if (han[i >> 3] & (1 << (i & 7))) t[0x4E00 + i] = 3;
    for (c = 0xF900; c <= 0xFA0B; c++) t[c] = 3;
    for (k = 0; k < src.rest.length; k += 2) for (c = src.rest[k]; c <= src.rest[k] + src.rest[k + 1]; c++) t[c] = 3;
    for (i = 0; i <= 0xD7A3 - 0xAC00; i++) t[0xAC00 + i] = (ksx[i >> 3] & (1 << (i & 7))) ? 3 : 1;
    CP = t;
    return t;
  }

  /* ── 한 번에 세기 ───────────────────────────────── */
  /* opts.newline: 줄바꿈 하나를 몇 글자(몇 단위)로 볼지 0·1·2 (기본 1)
     opts.locale : 단어·문장 나누기에 쓸 언어('ko'·'en')
     opts.segment: false면 단어(유니코드 규칙)·문장을 세지 않는다(아주 긴 글에서 화면이 먼저 답하게)
     opts.noSegmenter: true면 Intl.Segmenter 없는 브라우저처럼 센다(시험용) */
  LC.analyze = function (text, opts) {
    opts = opts || {};
    text = text == null ? '' : String(text);
    var nl = opts.newline == null ? 1 : +opts.newline;
    var info = table(), n = text.length, i, c, d, f;

    /* 1) 단위·코드 포인트·바이트·공백·줄·어절 (글자 묶음과 무관한 것) */
    var codePoints = 0, lone = 0, utf8 = 0, brUnits = 0, lineBreaks = 0;
    var space = 0, tab = 0, otherWs = 0, tokens = 0, inToken = false, paragraphs = 0, ink = false;
    var cp = cp949(), cpBytes = 0, cpBad = 0, ksBad = 0, bad = [], badSeen = {};
    function noteBad(ch) {
      cpBad++;
      if (bad.length < 8 && !badSeen[ch]) { badSeen[ch] = 1; bad.push(ch); }
    }
    for (i = 0; i < n; i++) {
      c = text.charCodeAt(i);
      if (c === 10 || c === 13) {
        codePoints++;
        if (c === 13 && i + 1 < n && text.charCodeAt(i + 1) === 10) { i++; codePoints++; brUnits++; }
        brUnits++; lineBreaks++; inToken = false;
        if (ink) paragraphs++;
        ink = false;
        continue;
      }
      if (c < 0x80) {
        utf8++; codePoints++; cpBytes++;
        if (c === 32) { space++; inToken = false; }
        else if (c === 9) { tab++; inToken = false; }
        else if (c === 11 || c === 12) { otherWs++; inToken = false; }
        else { ink = true; if (!inToken) { inToken = true; tokens++; } }
        continue;
      }
      if (c >= 0xD800 && c <= 0xDFFF) {
        d = c <= 0xDBFF && i + 1 < n ? text.charCodeAt(i + 1) : 0;
        if (d >= 0xDC00 && d <= 0xDFFF) { utf8 += 4; if (cp) noteBad(text.substr(i, 2)); i++; }
        else { utf8 += 3; lone++; if (cp) noteBad('�'); }
        codePoints++; ink = true;
        if (!inToken) { inToken = true; tokens++; }
        continue;
      }
      codePoints++;
      utf8 += c < 0x800 ? 2 : 3;
      if (cp) { f = cp[c]; if (f) { cpBytes += 2; if (f === 1) ksBad++; } else noteBad(text.charAt(i)); }
      if (info[c] & F_WS) { otherWs++; inToken = false; }
      else { ink = true; if (!inToken) { inToken = true; tokens++; } }
    }
    if (ink) paragraphs++;
    var endsWithBreak = n > 0 && (text.charCodeAt(n - 1) === 10 || text.charCodeAt(n - 1) === 13);
    var lines = n === 0 ? 0 : lineBreaks + (endsWithBreak ? 0 : 1);

    /* 2) 글자 묶음(사람이 보는 글자)과 종류 */
    var seg = opts.noSegmenter ? null : segmenter('grapheme');
    var cls = [0, 0, 0, 0, 0, 0, 0, 0, 0], g = 0, segs = null, part, k, it;
    i = 0;
    while (i < n) {
      c = text.charCodeAt(i); f = info[c];
      /* 빠른 길: 단순 글자 둘이 나란히 있으면 그 사이는 반드시 글자 경계다 */
      if ((f & F_SIMPLE) && (i + 1 >= n || (info[text.charCodeAt(i + 1)] & F_SIMPLE))) {
        if (c !== 10) { g++; cls[f & F_CLASS]++; }
        i++;
        continue;
      }
      if (seg) {
        /* 복잡한 곳(결합 글자·이모지·옛한글·CR 등)만 Segmenter에 묻는다. 여기는 늘 묶음의 첫 자리다. */
        if (!segs) segs = seg.segment(text);
        k = segs.containing(i).segment;
        i += k.length;
        c = k.charCodeAt(0);
        if (c === 10 || c === 13) continue;
        g++; cls[classOfCluster(k, info)]++;
        continue;
      }
      /* Segmenter 없음: 코드 포인트 하나를 한 글자로(결합 글자·이모지 묶음은 더 많이 세진다) */
      if (c === 10) { i++; continue; }
      if (c === 13) { i += (i + 1 < n && text.charCodeAt(i + 1) === 10) ? 2 : 1; continue; }
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < n && (text.charCodeAt(i + 1) & 0xFC00) === 0xDC00) {
        g++; cls[classOfCluster(text.substr(i, 2), info)]++; i += 2;
      } else { g++; cls[classOfCluster(text.charAt(i), info)]++; i++; }
    }

    /* 3) 단어(유니코드 규칙)·문장 */
    var wordsSeg = null, sentences = null, approxWord = false, approxSentence = false, w, s;
    if (opts.segment !== false) {
      w = opts.noSegmenter ? null : segmenter('word', opts.locale);
      if (w) {
        wordsSeg = 0;
        it = w.segment(text)[Symbol.iterator]();
        for (part = it.next(); !part.done; part = it.next()) if (part.value.isWordLike) wordsSeg++;
      } else { wordsSeg = tokens; approxWord = true; }
      s = opts.noSegmenter ? null : segmenter('sentence', opts.locale);
      if (s) {
        sentences = 0;
        it = s.segment(text)[Symbol.iterator]();
        for (part = it.next(); !part.done; part = it.next()) if (hasInk(part.value.segment, info)) sentences++;
      } else { sentences = roughSentences(text, info); approxSentence = true; }
    }

    var out = {
      empty: n === 0,
      newline: nl,
      /* 줄바꿈을 nl자로 본 값 */
      chars: g + nl * lineBreaks,
      charsNoSpace: g - cls[SPACE],
      /* 날것 그대로(줄바꿈 처리 옵션과 무관) */
      raw: { graphemes: g + lineBreaks, codePoints: codePoints, units: n },
      spaces: { space: space, tab: tab, other: otherWs, lineBreaks: lineBreaks, total: cls[SPACE] + lineBreaks },
      lines: lines,
      paragraphs: paragraphs,
      words: tokens,
      wordsSeg: wordsSeg,
      sentences: sentences,
      bytes: {
        utf8: utf8 + nl * lineBreaks,
        utf16: 2 * (n - brUnits) + 2 * nl * lineBreaks,
        euckr: cp ? { bytes: cpBytes + nl * lineBreaks, unencodable: cpBad, samples: bad, outsideKsx1001: ksBad } : null
      },
      classes: {},
      loneSurrogates: lone,
      approx: { grapheme: !seg, word: approxWord, sentence: approxSentence, classes: !HAS_PROPS }
    };
    for (i = 0; i < CLASS_NAMES.length; i++) out.classes[CLASS_NAMES[i]] = cls[i];
    return out;
  };

  function hasInk(s, info) {
    for (var i = 0, c; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (!(info[c] & F_WS)) return true;
    }
    return false;
  }
  /* Segmenter가 없을 때만: 마침표·물음표·느낌표 뒤의 공백이나 줄바꿈에서 끊는다(어림) */
  function roughSentences(text, info) {
    var parts = text.split(/(?:[.!?。！？…]+["'”’)\]]*(?:\s+|$))|[\r\n]+/), n = 0, i;
    for (i = 0; i < parts.length; i++) if (parts[i] && hasInk(parts[i], info)) n++;
    return n;
  }

  /* 글자 묶음 배열(원고지 칸 놓기·미리보기용). Segmenter가 없으면 코드 포인트로 나눈다. */
  LC.graphemes = function (text, opts) {
    text = text == null ? '' : String(text);
    var seg = opts && opts.noSegmenter ? null : segmenter('grapheme'), out = [], it, p;
    if (seg) {
      it = seg.segment(text)[Symbol.iterator]();
      for (p = it.next(); !p.done; p = it.next()) out.push(p.value.segment);
      return out;
    }
    for (var i = 0, c; i < text.length; i++) {
      c = text.charCodeAt(i);
      if (c === 13 && text.charCodeAt(i + 1) === 10) { out.push('\r\n'); i++; }
      else if (c >= 0xD800 && c <= 0xDBFF && (text.charCodeAt(i + 1) & 0xFC00) === 0xDC00) { out.push(text.substr(i, 2)); i++; }
      else out.push(text.charAt(i));
    }
    return out;
  };

  /* 한 글자(글자 묶음)를 뜯어보기: 코드 포인트·UTF-16 단위·UTF-8 바이트 */
  LC.inspect = function (cluster) {
    var s = String(cluster), cps = [], i, c, u8 = 0;
    for (i = 0; i < s.length; i++) {
      c = s.codePointAt(i);
      if (c > 0xFFFF) i++;
      cps.push(c);
      u8 += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }
    return { codePoints: cps, units: s.length, utf8: u8 };
  };

  /* 읽는·말하는 시간(초). perMinute = 1분에 읽는 단어(또는 글자) 수. 기본값은 화면 설정이 정한다. */
  LC.seconds = function (count, perMinute) {
    if (!(perMinute > 0) || !(count > 0)) return 0;
    return count / perMinute * 60;
  };

  LC.CLASS_NAMES = CLASS_NAMES;
  LC.WHITE_SPACE = WS_LIST.slice();
  if (typeof module !== 'undefined' && module.exports) module.exports = LC;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
