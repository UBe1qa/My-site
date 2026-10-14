/* 오래QR — QR 읽기 일꾼(Web Worker). 찍힘 확인·대량 만들기·스캐너가 같이 쓴다.
   필요할 때만 만든다(첫 화면 속도에 들어가지 않는다). jsQR(Apache-2.0, assets/vendor/jsQR-1.4.0.js)을 이 안에서만 부른다.
   받는 것: { id, w, h, data: Uint8ClampedArray(RGBA), mode: 'strict' | 'both' }
   돌려주는 것: { id, ok, bytes: number[], text, inverted } — strict 는 '어두운 점·밝은 바탕'만(찍힘 확인), both 는 못 읽으면 반전도 본다(스캐너, inverted=true 로 알림) */
/* global jsQR */
importScripts('vendor/jsQR-1.4.0.js');
self.onmessage = function (e) {
  var m = e.data, out = { id: m.id, ok: false, bytes: null, text: '', inverted: false };
  try {
    var r = jsQR(m.data, m.w, m.h, { inversionAttempts: 'dontInvert' });
    if (!r && m.mode !== 'strict') {   // strict = 반전 없이만(찍힘 확인). 스캐너는 반전도 본다
      r = jsQR(m.data, m.w, m.h, { inversionAttempts: 'onlyInvert' });
      if (r) out.inverted = true;
    }
    if (r) { out.ok = true; out.bytes = Array.prototype.slice.call(r.binaryData); out.text = r.data; }
  } catch (err) { out.err = String(err); }
  self.postMessage(out);
};
