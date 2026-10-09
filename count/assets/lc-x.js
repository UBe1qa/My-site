/* X(트위터) 가중 글자 수. 화면(DOM)을 모른다. lc-x-tld.js(도메인 끝 목록)를 먼저 불러야 한다.
   규칙 = X가 공개한 twitter-text v3 설정: 한도 280, 가중치 범위의 글자는 1, 그 밖(한글·한자·가나 등)은 2,
   주소는 길이와 상관없이 23, 이모지 묶음 하나는 2. 글은 먼저 NFC로 맞춘다.
   주소 찾는 규칙(정규식)은 twitter-text 3.1.0(Apache-2.0)의 것을 그대로 옮겼다 → /licenses/ 에 고지.
   다른 점 하나: 이모지는 브라우저가 아는 유니코드 RGI 이모지 묶음 전부를 2로 센다
   (npm twitter-text 3.1.0은 옛 이모지 목록이라 그 뒤에 나온 묶음을 더 크게 센다).
   기준값 대조: tests/gen_x.mjs(npm twitter-text) → tests/cases-x.json */
(function (root) {
  'use strict';
  var LC = root.LC || (root.LC = {});
  var CONFIG = {
    version: 3, max: 280, scale: 100, defaultWeight: 200, urlLength: 23,
    ranges: [[0, 4351, 100], [8192, 8205, 100], [8208, 8223, 100], [8242, 8247, 100]]
  };
  var MAX_URL_LENGTH = 4096, MAX_TCO_SLUG = 40, MAX_LABEL = 63;

  /* ── 정규식 조각(이름·내용 모두 twitter-text와 같게) ── */
  var punct = "\\!'#%&'\\(\\)*\\+,\\\\\\-\\.\\/:;<=>\\?@\\[\\]\\^_{|}~\\$";
  var spacesGroup = '\\x09-\\x0D\\x20\\x85\\xA0\\u1680\\u180E\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000';
  var invalidCharsGroup = '\\uFFFE\\uFEFF\\uFFFF';
  var directionalMarkersGroup = '\\u202A-\\u202E\\u061C\\u200E\\u200F\\u2066\\u2067\\u2068\\u2069';
  var latinAccentChars = '\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\xFF\\u0100-\\u024F\\u0253\\u0254\\u0256\\u0257\\u0259\\u025B\\u0263\\u0268\\u026F\\u0272\\u0289\\u028B\\u02BB\\u0300-\\u036F\\u1E00-\\u1EFF';
  var cyrillicLettersAndMarks = '\\u0400-\\u04FF';
  /* 원본은 조각 넷을 '/조각/' 꼴 그대로 이어 붙인다(빗금이 덤으로 들어가지만 빗금은 이미 punct에 있어 뜻은 같다).
     원본 정규식과 글자 하나까지 같게 두려고 그대로 따른다(시험이 두 정규식의 source를 견준다). */
  var validDomainChars = '[^/' + punct + '//' + spacesGroup + '//' + invalidCharsGroup + '//' + directionalMarkersGroup + '/]';
  var validSubdomain = '(?:(?:' + validDomainChars + '(?:[_-]|' + validDomainChars + ')*)?' + validDomainChars + '\\.)';
  var validDomainName = '(?:(?:' + validDomainChars + '(?:-|' + validDomainChars + ')*)?' + validDomainChars + '\\.)';
  var validPunycode = '(?:xn--[\\-0-9a-z]+)';
  var validGeneralUrlPathChars = "[a-z" + cyrillicLettersAndMarks + "0-9!\\*';:=\\+,\\.\\$\\/%#\\[\\]\\-\\u2013_~@\\|&" + latinAccentChars + ']';
  var validUrlBalancedParens = '\\((?:' + validGeneralUrlPathChars + '+|(?:' + validGeneralUrlPathChars + '*\\(' + validGeneralUrlPathChars + '+\\)' + validGeneralUrlPathChars + '*))\\)';
  var validUrlPathEndingChars = '[\\+\\-a-z' + cyrillicLettersAndMarks + '0-9=_#\\/' + latinAccentChars + ']|(?:' + validUrlBalancedParens + ')';
  var validUrlPath = '(?:(?:' + validGeneralUrlPathChars + '*(?:' + validUrlBalancedParens + validGeneralUrlPathChars + '*)*' + validUrlPathEndingChars + ')|(?:@' + validGeneralUrlPathChars + '+/))';
  var validUrlQueryChars = "[a-z0-9!?\\*'@\\(\\);:&=\\+\\$\\/%#\\[\\]\\-_\\.,~|]";
  var validUrlQueryEndingChars = '[a-z0-9\\-_&=#\\/]';
  var validUrlPrecedingChars = '(?:[^A-Za-z0-9@＠$#＃' + invalidCharsGroup + ']|[' + directionalMarkersGroup + ']|^)';
  var INVALID_BEFORE_BARE = /[-_.\/]$/;

  var R = null;
  function regexes() {
    if (R) return R;
    var t = LC.X_TLD;
    if (!t) return null;
    var tail = ')(?=[^0-9a-zA-Z@+-]|$))';
    var validGTLD = '(?:(?:' + t.g + tail, validCCTLD = '(?:(?:' + t.c + tail;
    var validDomain = '(?:' + validSubdomain + '*' + validDomainName + '(?:' + validGTLD + '|' + validCCTLD + '|' + validPunycode + '))';
    R = {
      extractUrl: new RegExp('(' + '(' + validUrlPrecedingChars + ')' + '(' + '(https?:\\/\\/)?' + '(' + validDomain + ')' +
        '(?::(' + '[0-9]+' + '))?' + '(\\/' + validUrlPath + '*)?' + '(\\?' + validUrlQueryChars + '*' + validUrlQueryEndingChars + ')?' + ')' + ')', 'gi'),
      validAsciiDomain: new RegExp('(?:(?:[\\-a-z0-9' + latinAccentChars + ']+)\\.)+(?:' + validGTLD + '|' + validCCTLD + '|' + validPunycode + ')', 'gi'),
      validTcoUrl: new RegExp('^https?:\\/\\/t\\.co\\/([a-z0-9]+)(?:\\?' + validUrlQueryChars + '*' + validUrlQueryEndingChars + ')?', 'i')
    };
    return R;
  }

  /* ── 퓨니코드(RFC 3492) 인코딩: 도메인 조각 길이(1~63)를 재는 데만 쓴다 ── */
  function punyEncode(input) {
    var cps = [], i, c, out = [], n = 128, delta = 0, bias = 72, h, b, m, q, k, t, cur;
    for (i = 0; i < input.length; i++) {
      c = input.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < input.length && (input.charCodeAt(i + 1) & 0xFC00) === 0xDC00) {
        c = ((c & 0x3FF) << 10) + (input.charCodeAt(++i) & 0x3FF) + 0x10000;
      }
      cps.push(c);
    }
    for (i = 0; i < cps.length; i++) if (cps[i] < 128) out.push(String.fromCharCode(cps[i]));
    h = b = out.length;
    if (b) out.push('-');
    function digit(d) { return String.fromCharCode(d + 22 + 75 * (d < 26)); }
    function adapt(d, numPoints, first) {
      var kk = 0;
      d = first ? Math.floor(d / 700) : d >> 1;
      d += Math.floor(d / numPoints);
      for (; d > 455; kk += 36) d = Math.floor(d / 35);
      return Math.floor(kk + 36 * d / (d + 38));
    }
    while (h < cps.length) {
      for (m = 0x7FFFFFFF, i = 0; i < cps.length; i++) if (cps[i] >= n && cps[i] < m) m = cps[i];
      delta += (m - n) * (h + 1);
      n = m;
      for (i = 0; i < cps.length; i++) {
        cur = cps[i];
        if (cur < n) delta++;
        if (cur === n) {
          for (q = delta, k = 36; ; k += 36) {
            t = k <= bias ? 1 : (k >= bias + 26 ? 26 : k - bias);
            if (q < t) break;
            out.push(digit(t + (q - t) % (36 - t)));
            q = Math.floor((q - t) / (36 - t));
          }
          out.push(digit(q));
          bias = adapt(delta, h + 1, h === b);
          delta = 0;
          h++;
        }
      }
      delta++; n++;
    }
    return out.join('');
  }
  function punyToAscii(label) {
    return label.replace(/[\x2E。．｡]/g, '.').split('.').map(function (s) {
      return /[^\x20-\x7E]/.test(s) ? 'xn--' + punyEncode(s) : s;
    }).join('.');
  }
  function domainOk(domain, re) {
    if (domain.substring(0, 4) === 'xn--' && !domain.match(re.validAsciiDomain)) return false;
    var labels = domain.split('.'), i, p;
    for (i = 0; i < labels.length; i++) {
      p = punyToAscii(labels[i]);
      if (p.length < 1 || p.length > MAX_LABEL) return false;
    }
    return domain.length > 0;
  }

  /* 글에서 주소를 찾는다: [{url, start, end}] (자리 = UTF-16 단위) */
  function extractUrls(text) {
    var re = regexes(), urls = [], m, before, url, protocol, domain, path, end, start, last, asciiEnd, tco;
    if (!re || !text || !/\./.test(text)) return urls;
    re.extractUrl.lastIndex = 0;
    while ((m = re.extractUrl.exec(text))) {
      before = m[2]; url = m[3]; protocol = m[4]; domain = m[5]; path = m[7];
      end = re.extractUrl.lastIndex; start = end - url.length;
      if (!domainOk(domain, re) || (protocol || 'https://').length + url.length > MAX_URL_LENGTH) continue;
      if (!protocol) {
        if (INVALID_BEFORE_BARE.test(before)) continue;
        last = null; asciiEnd = 0;
        domain.replace(re.validAsciiDomain, function (asciiDomain) {
          var asciiStart = domain.indexOf(asciiDomain, asciiEnd);
          asciiEnd = asciiStart + asciiDomain.length;
          last = { url: asciiDomain, start: start + asciiStart, end: start + asciiEnd };
          urls.push(last);
        });
        if (!last) continue;
        if (path) { last.url = url.replace(domain, last.url); last.end = end; }
      } else {
        tco = url.match(re.validTcoUrl);
        if (tco) {
          if (tco[1] && tco[1].length > MAX_TCO_SLUG) continue;
          url = tco[0]; end = start + url.length;
        }
        urls.push({ url: url, start: start, end: end });
      }
    }
    return urls;
  }

  /* ── 이모지 묶음 찾기 ── */
  var EMOJI = null, EMOJI_APPROX = false;
  function emojiRe() {
    if (EMOJI) return EMOJI;
    try { EMOJI = new RegExp('\\p{RGI_Emoji}', 'gv'); }
    catch (e) {
      /* 옛 브라우저: 그림 글자(+피부색·변형 선택자)와 ZWJ로 이은 묶음, 국기, 키캡을 어림으로 찾는다 */
      EMOJI_APPROX = true;
      try {
        var one = '(?:\\p{Emoji_Presentation}\\uFE0F?|\\p{Extended_Pictographic}\\uFE0F)\\p{Emoji_Modifier}?';
        EMOJI = new RegExp('\\p{Regional_Indicator}{2}|[#*0-9]\\uFE0F?\\u20E3|' + one + '(?:\\u200D' + one + ')*', 'gu');
      } catch (e2) { EMOJI = /(?!)/g; }
    }
    return EMOJI;
  }

  function weightOf(code) {
    for (var i = 0; i < CONFIG.ranges.length; i++) if (code >= CONFIG.ranges[i][0] && code <= CONFIG.ranges[i][1]) return CONFIG.ranges[i][2];
    return CONFIG.defaultWeight;
  }

  /* 가중 글자 수 세기 */
  function count(text) {
    text = text == null ? '' : String(text);
    var norm = typeof text.normalize === 'function' ? text.normalize() : text;
    var urls = extractUrls(norm), urlAt = {}, emojiAt = {}, i, m, re = emojiRe(), w = 0, n = norm.length, c, d, emojis = 0;
    for (i = 0; i < urls.length; i++) urlAt[urls[i].start] = urls[i];
    re.lastIndex = 0;
    while ((m = re.exec(norm))) { emojiAt[m.index] = m[0].length; if (!m[0].length) re.lastIndex++; }
    for (i = 0; i < n; i++) {
      if (urlAt[i]) { w += CONFIG.urlLength * CONFIG.scale; i += urlAt[i].url.length - 1; }
      else if (emojiAt[i]) { w += CONFIG.defaultWeight; i += emojiAt[i] - 1; emojis++; }
      else {
        c = norm.charCodeAt(i);
        if (c >= 0xD800 && c <= 0xDBFF && i < n - 1) {
          d = norm.charCodeAt(i + 1);
          if (d >= 0xDC00 && d <= 0xDFFF) { i++; c = d; }
        }
        w += weightOf(c);
      }
    }
    var weighted = w / CONFIG.scale;
    return {
      weighted: weighted,
      max: CONFIG.max,
      remaining: CONFIG.max - weighted,
      over: Math.max(0, weighted - CONFIG.max),
      urls: urls,
      emojis: emojis,
      approx: EMOJI_APPROX || !regexes()
    };
  }

  LC.x = { CONFIG: CONFIG, count: count, extractUrls: extractUrls, _regexes: regexes, _punyEncode: punyEncode };
  if (typeof module !== 'undefined' && module.exports) module.exports = LC.x;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
