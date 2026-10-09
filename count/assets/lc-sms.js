/* 문자(SMS) 조각 세기. 화면(DOM)을 모른다.
   규격: 3GPP TS 23.038의 GSM 7비트 기본 문자표(128칸) + 확장 문자(이스케이프 뒤 한 칸 더 = 2칸).
   - 글 전체가 이 표 안이면 GSM-7: 한 통 160칸, 여러 통으로 나뉘면 통마다 153칸(이어 붙이기 머리 7칸).
   - 표 밖 글자가 하나라도 있으면 UCS-2(UTF-16): 한 통 70단위, 나뉘면 통마다 67단위.
   - 2칸짜리 확장 문자와 서로게이트 짝(이모지 등)은 통 경계에서 쪼개지 않고 다음 통으로 넘긴다.
   나라별 바꿈표(터키어·스페인어·포르투갈어 shift table)는 다루지 않는다.
   기준값 대조: tests/gen_sms.mjs(파이썬 smsutil, npm sms-segments-calculator·split-sms) → tests/cases-sms.json */
(function (root) {
  'use strict';
  var LC = root.LC || (root.LC = {});
  var BASIC = '@£$¥èéùìòÇ\nØø\rÅå' +
    'Δ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ' +
    ' !"#¤%&\'()*+,-./0123456789:;<=>?' +
    '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§' +
    '¿abcdefghijklmnopqrstuvwxyzäöñüà';
  var EXT = '\f^{}\\[~]|€';
  var LIMITS = { gsm: { single: 160, multi: 153 }, ucs2: { single: 70, multi: 67 } };

  var COST = null;
  function costs() {
    if (COST) return COST;
    var m = {}, i;
    for (i = 0; i < BASIC.length; i++) m[BASIC.charCodeAt(i)] = 1;
    for (i = 0; i < EXT.length; i++) m[EXT.charCodeAt(i)] = 2;
    COST = m;
    return m;
  }

  /* 낱자 크기 배열(sizes)을 한 통 한도(multi)에 맞춰 담는다. 낱자는 쪼개지 않는다. */
  function pack(sizes, single, multi) {
    var total = 0, i, parts = [], cur = 0;
    for (i = 0; i < sizes.length; i++) total += sizes[i];
    if (total <= single) return { total: total, parts: total ? [total] : [], per: single };
    for (i = 0; i < sizes.length; i++) {
      if (cur + sizes[i] > multi) { parts.push(cur); cur = 0; }
      cur += sizes[i];
    }
    if (cur) parts.push(cur);
    return { total: total, parts: parts, per: multi };
  }

  function count(text) {
    text = text == null ? '' : String(text);
    var m = costs(), n = text.length, i, c, sizes = [], gsm = true, bad = [], seen = {}, ch, r;
    for (i = 0; i < n; i++) {
      c = text.charCodeAt(i);
      if (m[c]) { sizes.push(m[c]); continue; }
      gsm = false;
      ch = (c >= 0xD800 && c <= 0xDBFF && i + 1 < n && (text.charCodeAt(i + 1) & 0xFC00) === 0xDC00) ? text.substr(i, 2) : text.charAt(i);
      if (!seen[ch] && bad.length < 8) { seen[ch] = 1; bad.push(ch); }
      if (ch.length === 2) i++;
    }
    if (!gsm) {
      sizes = [];
      for (i = 0; i < n; i++) {
        c = text.charCodeAt(i);
        if (c >= 0xD800 && c <= 0xDBFF && i + 1 < n && (text.charCodeAt(i + 1) & 0xFC00) === 0xDC00) { sizes.push(2); i++; }
        else sizes.push(1);
      }
    }
    r = gsm ? pack(sizes, LIMITS.gsm.single, LIMITS.gsm.multi) : pack(sizes, LIMITS.ucs2.single, LIMITS.ucs2.multi);
    var last = r.parts.length ? r.parts[r.parts.length - 1] : 0;
    return {
      encoding: gsm ? 'GSM-7' : 'UCS-2',
      length: r.total,                 /* GSM-7이면 칸(7비트) 수, UCS-2면 UTF-16 단위 수 */
      segments: r.parts.length,
      perSegment: r.per,
      parts: r.parts,
      remaining: r.per - last,         /* 지금 통에 더 쓸 수 있는 칸. 빈 글이면 160 */
      nonGsm: bad,                     /* GSM-7 표에 없는 글자(처음 몇 개) */
      extended: gsm ? sizes.filter(function (s) { return s === 2; }).length : 0
    };
  }

  LC.sms = { GSM7_BASIC: BASIC, GSM7_EXT: EXT, LIMITS: LIMITS, count: count };
  if (typeof module !== 'undefined' && module.exports) module.exports = LC.sms;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
