/* 오래QR — QR 읽기와 '찍힘 확인'. 만들기·대량·스캐너가 같이 쓴다.
   - QRV.decode(imageData) → Promise<{ok, text, bytes, inverted, via}>: 기기에 BarcodeDetector 가 있으면 그것, 없거나 못 읽으면
     jsQR(assets/vendor, Apache-2.0)을 Web Worker 에서. jsQR 일꾼은 처음 필요할 때 만든다(첫 화면 속도에 안 들어감).
   - QRV.check(scene, expected, style, imgs) → Promise<판정>: 저장할 그림과 같은 장면을 캔버스에 그려 다시 읽고, 넣은 내용과 같은지 + 경고(대비·반전·로고·여백·투명).
     판정 = { s: 'pass'|'warn'|'fail'|'none', main: 코드, list: [{c, p}] }  (문구는 화면 쪽이 코드로 찾는다) */
(function (root) {
  'use strict';
  var worker = null, seq = 0, waits = {}, bd = null, bdTried = false, workerUrl = null, broken = false;

  function setWorker(u) { workerUrl = u; }
  function getWorker() {
    if (worker || broken || !workerUrl || typeof Worker === 'undefined') return worker;
    try {
      worker = new Worker(workerUrl);
      worker.onmessage = function (e) { var w = waits[e.data.id]; if (w) { delete waits[e.data.id]; w(e.data); } };
      worker.onerror = function () { broken = true; Object.keys(waits).forEach(function (k) { waits[k]({ ok: false, err: 'worker' }); delete waits[k]; }); worker = null; };
    } catch (e) { broken = true; worker = null; }
    return worker;
  }
  function viaWorker(img, mode) {
    var w = getWorker();
    if (!w) return Promise.resolve({ ok: false, err: 'noworker' });
    return new Promise(function (res) {
      var id = ++seq, done = false;
      waits[id] = function (d) { if (!done) { done = true; res(d); } };
      setTimeout(function () { if (!done && waits[id]) { delete waits[id]; done = true; res({ ok: false, err: 'timeout' }); } }, 8000);
      var copy = new Uint8ClampedArray(img.data);
      w.postMessage({ id: id, w: img.width, h: img.height, data: copy, mode: mode || 'both' }, [copy.buffer]);
    });
  }
  function detector() {
    if (bdTried) return Promise.resolve(bd);
    bdTried = true;
    if (typeof root.BarcodeDetector === 'undefined' || (root.navigator && root.navigator.webdriver)) return Promise.resolve(null);   // 자동 시험은 늘 같은 판독기(jsQR)로
    return Promise.resolve(root.BarcodeDetector.getSupportedFormats ? root.BarcodeDetector.getSupportedFormats() : ['qr_code'])
      .then(function (f) { if (f.indexOf('qr_code') >= 0) bd = new root.BarcodeDetector({ formats: ['qr_code'] }); return bd; })
      .catch(function () { return null; });
  }
  var enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  function utf8(s) { return enc ? Array.prototype.slice.call(enc.encode(s)) : []; }
  function sameBytes(a, b) { if (!a || a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

  /* source: ImageData(또는 캔버스) */
  function decode(img, mode, workerOnly) {
    if (workerOnly) {   // 찍힘 확인: 늘 같은 판독기(jsQR, 반전 없이)로 — 기기마다 결과가 달라지지 않게
      return viaWorker(img.data ? img : img.getContext('2d').getImageData(0, 0, img.width, img.height), mode).then(function (x) { x.via = 'jsqr'; return x; });
    }
    return detector().then(function (d) {
      if (!d) return null;
      return d.detect(img).then(function (r) { return r && r.length ? { ok: true, text: r[0].rawValue, bytes: null, inverted: false, via: 'bd' } : null; }).catch(function () { return null; });
    }).then(function (r) {
      if (r) return r;
      var data = img.data ? img : img.getContext('2d').getImageData(0, 0, img.width, img.height);
      return viaWorker(data, mode).then(function (x) { x.via = 'jsqr'; return x; });
    });
  }

  /* 판정 */
  var CAP = { L: 0.07, M: 0.15, Q: 0.25, H: 0.30 };
  /* 규칙 검사(그림을 읽기 전에, 색·모양만 보고). 판정은 '실제 판독기보다 엄하게':
     - hard(안 읽힘): 밝기 대비 2:1 미만(그라데이션은 가장 밝은 점 색, 눈 색도 따로), 밝은 점·어두운 바탕(반전)
     - warn(주의): 대비 2~4:1, 로고가 복원 여유를 많이 씀, 로고 + L/M, 둘레 여백 4칸 미만
     - info: 투명 바탕, 틀이 있어 여백을 늘림, 그릴 수 없는 틀 글자 */
  var HARD = 2, SOFT = 4;
  function mix(a, b) { var R = root.QRR, x = R.rgb(a), y = R.rgb(b); return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round((x[i] + y[i]) / 2).toString(16)).slice(-2); }).join(''); }
  function warnings(scene, st) {
    var R = root.QRR, out = [], bg = scene.transparent ? '#ffffff' : (R.hex(st.bg) || '#ffffff');
    var cols = [{ c: R.hex(st.fg) || '#000000', k: 'dot' }];
    if (st.grad === 'linear' || st.grad === 'radial') cols.push({ c: R.hex(st.fg2) || cols[0].c, k: 'dot' });
    if (st.eyeColor) {
      if (R.hex(st.eyeOut)) cols.push({ c: R.hex(st.eyeOut), k: 'eye' });
      if (R.hex(st.eyeIn)) cols.push({ c: R.hex(st.eyeIn), k: 'eye' });
    }
    // 반전: 점(그라데이션이면 두 끝 다) 또는 눈이 바탕보다 밝으면. 그라데이션 한쪽 끝만 밝으면 반전이 아니라 대비 문제로 본다
    var L = function (c) { return R.lum(c); }, lb = L(bg), dots = cols.filter(function (x) { return x.k === 'dot'; }), eyes = cols.filter(function (x) { return x.k === 'eye'; });
    var inv = null;
    if (dots.every(function (x) { return L(x.c) >= lb; })) inv = dots[0];
    else eyes.forEach(function (x) { if (!inv && L(x.c) >= lb) inv = x; });
    var worst = null;
    cols.forEach(function (x) { x.r = L(x.c) >= lb ? 1 : R.contrast(x.c, bg); if (!worst || x.r < worst.r) worst = x; });
    var fmtR = function (r) { return (Math.floor(r * 10) / 10).toFixed(1); };
    var grad = dots.length > 1;
    if (inv) out.push({ c: inv.k === 'eye' ? 'eye_inverted' : 'inverted', hard: true, p: { a: inv.c, b: bg } });
    else if (worst && worst.r < SOFT) {
      var code = worst.k === 'eye' ? 'eye' : (grad ? 'contrast_grad' : 'contrast');
      // 그라데이션은 가장 밝은 점 색으로 대비를 보여 주고, '안 읽힘'은 가운데 색까지 2:1 미만일 때만(끝 한쪽만 옅은 것은 복원 여유로 읽히는 일이 많다: 평가 M1)
      var hardR = worst.r;
      if (code === 'contrast_grad') hardR = R.contrast(mix(dots[0].c, dots[1].c), bg);
      out.push({ c: code, hard: hardR < HARD, p: { c: fmtR(worst.r), a: worst.c, b: bg } });
    }
    if (scene.logo) {
      var cap = CAP[scene.ecl] || 0.15;
      if (scene.logo.areaFrac > cap * 0.35) out.push({ c: 'logo_big' });   // 비운 칸이 복원 여유의 1/3 을 넘으면(칸 하나가 여러 부호어에 걸려 실제 손상은 더 크다)
      else if (scene.ecl === 'L' || scene.ecl === 'M') out.push({ c: 'logo_ecl' });
    }
    if (scene.qr.margin < 4) out.push({ c: 'margin', p: { m: scene.qr.margin } });
    if (scene.qr.asked != null && scene.qr.asked < scene.qr.margin) out.push({ c: 'frame_margin', info: true, p: { m: scene.qr.margin } });
    if (scene.transparent) out.push({ c: 'transparent', info: true });
    if (scene.textMissing && scene.textMissing.length) out.push({ c: 'text_missing', p: { c: scene.textMissing.join(' ') }, info: true });
    return out;
  }

  /* 휴대폰 판독기처럼: 밝기(회색)만 보고, 반전 없이, 몇 가지 크기로 그려 읽는다. 하나라도 넣은 내용과 바이트까지 같으면 '읽힘'.
     한 칸 ≈ 6 / 4 / 9 / 3 px, 살짝 흐리게, QR 만 잘라서. (브라우저 안 판독기는 크기·모양에 따라 읽고 못 읽고가 갈려서 여러 번 본다) */
  var TRIES = [[6, 0], [4, 0], [9, 0], [3, 0], [6, 1.2], [5, 0.8], [6, 0, 'crop'], [8, 0, 'crop']];
  function ctx2d(cv) { return cv.getContext('2d', { willReadFrequently: true }); }
  function gray(img) {
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) { var y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000; d[i] = d[i + 1] = d[i + 2] = y; }
    return img;
  }
  function render(scene, imgs, cv, perMod, blur, crop) {
    var R = root.QRR, px = Math.round(Math.max(scene.W, scene.H) * perMod);
    px = Math.max(160, Math.min(px, 1300));
    var c = ctx2d(cv);
    R.toCanvas(scene, cv, px, imgs, '#ffffff');   // 투명 바탕은 흰 종이 위에 붙인 것으로 본다
    if (crop) {   // 카메라를 QR 에만 들이댄 것처럼: 틀은 빼고 QR(여백 포함)만
      var k = cv.width / scene.W, q = scene.qr;
      return gray(c.getImageData(Math.round(q.x * k), Math.round(q.y * k), Math.round(q.size * k), Math.round(q.size * k)));
    }
    if (blur && 'filter' in c) {
      var tmp = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cv.width, cv.height) : document.createElement('canvas');
      tmp.width = cv.width; tmp.height = cv.height;
      var t = ctx2d(tmp); t.filter = 'blur(' + blur + 'px)'; t.drawImage(cv, 0, 0);
      return gray(t.getImageData(0, 0, tmp.width, tmp.height));
    }
    return gray(c.getImageData(0, 0, cv.width, cv.height));
  }
  function newCanvas() { return typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas'); }
  /* 판정: { s: pass|warn|fail|none, main: 코드, list: [{c,p,hard?,info?}] }
     main: pass_ = 읽힘·걸림 없음 / read_warn = 읽혔지만 규칙에 걸림(안심 문구 없음) / fail = 못 읽음 / rule_fail = 규칙상 안 읽힘 / mismatch / none */
  function check(scene, expected, st, imgs, cv) {
    cv = cv || newCanvas();
    var warn = warnings(scene, st), want = utf8(expected), i = 0, lastR = null;
    var hard = warn.filter(function (w) { return w.hard; });
    if (hard.length) return Promise.resolve({ s: 'fail', main: 'rule_fail', list: warn });
    function same(r) { return r.bytes ? sameBytes(r.bytes, want) : (r.text === expected || r.text.replace(/\r/g, '') === expected.replace(/\r/g, '')); }
    function next() {
      if (i >= TRIES.length) return Promise.resolve(lastR);
      var tr = TRIES[i++];
      return decode(render(scene, imgs, cv, tr[0], tr[1], tr[2]), 'strict', true).then(function (r) {
        lastR = r;
        if (r && r.ok && same(r)) { r.match = true; r.tries = i; return r; }
        if (r && !r.ok && (r.err === 'noworker' || r.err === 'worker')) return r;
        return next();
      });
    }
    return next().then(function (r) {
      if (!r || (!r.ok && (r.err === 'noworker' || r.err === 'worker'))) return { s: 'none', main: 'none', list: warn };
      if (!r.ok) {
        // 규칙에 아무것도 안 걸렸는데 못 읽으면: 이 브라우저 판독기의 약점일 수 있어 '주의'(평가 M1: zxing·OpenCV 는 읽었다).
        // 규칙에 하나라도 걸렸으면 '안 읽힘'
        // 못 읽었을 때: 무늬를 실제로 망가뜨리는 조건(로고가 큼·로고+L/M·여백 2칸 미만)이 같이 걸렸으면 '안 읽힘',
        // 아니면 이 브라우저 판독기의 약점일 수 있어 '주의'(평가 M1: 그라데이션·점 모양은 zxing·OpenCV 가 읽었다)
        var damage = warn.some(function (w) { return w.c === 'logo_big' || w.c === 'logo_ecl' || (w.c === 'margin' && w.p.m < 2); });
        return damage ? { s: 'fail', main: 'fail', list: hintFor(warn) } : { s: 'warn', main: 'unsure', list: warn.concat([{ c: 'fail_hint' }]) };
      }
      if (!r.match) return { s: 'fail', main: 'mismatch', list: hintFor(warn) };
      var real = warn.filter(function (w) { return !w.info; });
      return real.length ? { s: 'warn', main: 'read_warn', list: warn, via: r.via, tries: r.tries } : { s: 'pass', main: 'pass_', list: warn, via: r.via, tries: r.tries };
    });
  }
  function hintFor(warn) {
    var real = warn.filter(function (w) { return !w.info; });
    return real.length ? warn : warn.concat([{ c: 'fail_hint' }]);
  }

  var QRV = { decode: decode, check: check, warnings: warnings, setWorker: setWorker, utf8: utf8, HARD: HARD, SOFT: SOFT };
  root.QRV = QRV;
})(typeof self !== 'undefined' ? self : this);
