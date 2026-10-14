/* 오래QR — 미리 만든 꾸밈 세트. 하나를 누르면 모양·색·틀·문구가 한꺼번에 바뀐다(로고·오류 복원·여백은 그대로).
   이름과 틀 문구는 언어마다. 색은 바탕과의 대비가 4.5:1 이상인 것만 쓴다(시험 presets 가 본다). */
(function (root) {
  'use strict';
  var BASE = { dots: 'square', eyeOuter: 'square', eyeInner: 'square', fg: '#111111', grad: 'none', fg2: '#111111', angle: 45, eyeColor: false, eyeOut: '#111111', eyeIn: '#111111', bg: '#ffffff', transparent: false, frame: 'none', frameText: '', frameColor: '#111111', frameTextColor: '#ffffff' };
  var LIST = [
    { id: 'plain', name: { ko: '기본', en: 'Classic' }, s: {} },
    { id: 'cafe', name: { ko: '카페', en: 'Café' }, s: { dots: 'rounded', eyeOuter: 'rounded', eyeInner: 'rounded', fg: '#4a2e1f', bg: '#fffaf2', frame: 'band', frameColor: '#4a2e1f', frameTextColor: '#fffaf2' }, t: { ko: '메뉴 보기', en: 'SEE MENU' } },
    { id: 'shop', name: { ko: '가게', en: 'Shop' }, s: { dots: 'tile', eyeOuter: 'cut', eyeInner: 'cut', fg: '#0f3d5e', eyeColor: true, eyeOut: '#0f3d5e', eyeIn: '#b3261e', frame: 'tag', frameColor: '#0f3d5e', frameTextColor: '#ffffff' }, t: { ko: '찍고 할인받기', en: 'SCAN FOR DEALS' } },
    { id: 'event', name: { ko: '행사', en: 'Event' }, s: { dots: 'dots', eyeOuter: 'circle', eyeInner: 'circle', fg: '#5b2a86', grad: 'linear', fg2: '#b0306a', angle: 45, frame: 'bubble', frameColor: '#5b2a86', frameTextColor: '#ffffff' }, t: { ko: '참가 신청', en: 'SIGN UP' } },
    { id: 'card', name: { ko: '명함', en: 'Business card' }, s: { dots: 'dots', eyeOuter: 'rounded', eyeInner: 'circle', fg: '#1f2a44', frame: 'none' } },
    { id: 'minimal', name: { ko: '미니멀', en: 'Minimal' }, s: { dots: 'vbar', eyeOuter: 'rounded', eyeInner: 'rounded', fg: '#222222', frame: 'corners', frameColor: '#222222' }, t: { ko: 'SCAN ME', en: 'SCAN ME' } },
    { id: 'wifi', name: { ko: '와이파이', en: 'Wi‑Fi' }, s: { dots: 'rounded', eyeOuter: 'drop', eyeInner: 'drop', fg: '#0b5c56', frame: 'phone', frameColor: '#0b5c56', frameTextColor: '#ffffff' }, t: { ko: '와이파이 연결', en: 'JOIN WI-FI' } },
    { id: 'review', name: { ko: '리뷰', en: 'Review' }, s: { dots: 'leaf', eyeOuter: 'leaf', eyeInner: 'leaf', fg: '#7a1f2b', bg: '#fff7f2', frame: 'pill', frameColor: '#7a1f2b', frameTextColor: '#ffffff' }, t: { ko: '리뷰 남기기', en: 'LEAVE A REVIEW' } },
    { id: 'ticket', name: { ko: '입장권', en: 'Ticket' }, s: { dots: 'hbar', eyeOuter: 'square', eyeInner: 'square', fg: '#1d1d1d', bg: '#fffdf4', frame: 'ticket', frameColor: '#1d1d1d', frameTextColor: '#fffdf4' }, t: { ko: '입장 QR', en: 'ADMIT ONE' } },
    { id: 'stamp', name: { ko: '동그라미', en: 'Round' }, s: { dots: 'diamond', eyeOuter: 'circle', eyeInner: 'diamond', fg: '#14532d', grad: 'radial', fg2: '#1f7a4a', frame: 'circle', frameColor: '#14532d', frameTextColor: '#ffffff' }, t: { ko: '찍어 보세요', en: 'SCAN ME' } }
  ];
  function style(p, lang) {
    var out = {}, k;
    for (k in BASE) out[k] = BASE[k];
    for (k in p.s) out[k] = p.s[k];
    out.frameText = p.t ? p.t[lang] || p.t.en : '';
    if (out.frame !== 'none' && !out.frameText) out.frameText = '';
    return out;
  }
  var QRPRE = { BASE: BASE, LIST: LIST, style: style, keys: Object.keys(BASE) };
  if (typeof module !== 'undefined' && module.exports) module.exports = QRPRE;
  else root.QRPRE = QRPRE;
})(typeof self !== 'undefined' ? self : this);
