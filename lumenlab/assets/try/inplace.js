/* 인플레이스 바로 써 보기: 이미지 변환을 인플레이스와 같은 방식으로 이 창에서 한다.
   인플레이스의 이미지 변환(engines/image.js)은 따로 받는 라이브러리 없이 브라우저의 캔버스로 다시 저장한다:
   JPG 는 흰 바탕을 먼저 깔고, 브라우저가 그 형식으로 저장하지 못하면(blob.type 이 다르면) 못 하는 것으로 본다. 여기서도 같다.
   (인플레이스의 파일은 다른 주소에서 부를 수 없는 ES 모듈이라 같은 방식을 몇 줄로 옮겨 썼다.)
   그림은 이 자리에서 그린 것이고, 내 사진을 골라도 이 기기 안에서만 바꾼다(보내는 곳 없음). */
window.LLTry.inplace = function (stage, c) {
  var h = c.h, ko = c.lang === 'ko';
  var T = ko
    ? { pick: '내 사진으로 해 보기', fmt: '바꿀 형식', q: '품질', orig: '원본', out: '바꾼 것', zoom: '3배 확대', smaller: function (p) { return p + '% 작게'; }, bigger: function (p) { return p + '% 크게'; },
        no: '이 브라우저는 이 형식으로 저장하지 못해요', local: '사진은 이 기기 밖으로 나가지 않아요', src: '그려 둔 그림(PNG)' }
    : { pick: 'Try your own photo', fmt: 'Convert to', q: 'Quality', orig: 'Original', out: 'Converted', zoom: '3× zoom', smaller: function (p) { return p + '% smaller'; }, bigger: function (p) { return p + '% larger'; },
        no: 'This browser can’t save this format', local: 'Your photo never leaves this device', src: 'Built-in picture (PNG)' };
  var FMTS = [['jpg', 'image/jpeg', 'JPG'], ['webp', 'image/webp', 'WebP'], ['png', 'image/png', 'PNG'], ['avif', 'image/avif', 'AVIF']];
  var W = 480, HH = 300;
  var src = document.createElement('canvas'); src.width = W; src.height = HH;
  var fmt = 'jpg', q = 0.8, origBytes = 0, origName = T.src, url = null, job = 0, alive = true, timer = 0;

  function paintScene() {
    var g = src.getContext('2d');
    var sky = g.createLinearGradient(0, 0, 0, HH);
    sky.addColorStop(0, '#2b4c8c'); sky.addColorStop(0.55, '#f2a65a'); sky.addColorStop(1, '#f7d488');
    g.fillStyle = sky; g.fillRect(0, 0, W, HH);
    var sun = g.createRadialGradient(330, 150, 4, 330, 150, 90);
    sun.addColorStop(0, '#fff6d8'); sun.addColorStop(0.25, '#ffd36b'); sun.addColorStop(1, 'rgba(255,190,90,0)');
    g.fillStyle = sun; g.fillRect(0, 0, W, HH);
    [['#5a3d6e', 190, 0.012, 34], ['#3b2a52', 225, 0.02, 22], ['#1f1830', 262, 0.031, 14]].forEach(function (l, i) {
      g.fillStyle = l[0]; g.beginPath(); g.moveTo(0, HH);
      for (var x = 0; x <= W; x += 4) g.lineTo(x, l[1] + Math.sin(x * l[2] + i * 2) * l[3] + Math.sin(x * l[2] * 3.1) * l[3] * 0.3);
      g.lineTo(W, HH); g.closePath(); g.fill();
    });
    // 가는 줄과 낱알: 압축하면 먼저 뭉개지는 곳
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
    for (var k = 0; k < 7; k++) { g.beginPath(); g.moveTo(40 + k * 9, 40); g.lineTo(40 + k * 9, 110); g.stroke(); }
    g.fillStyle = '#fff'; g.font = '700 22px system-ui,sans-serif'; g.fillText('lumenlab', 120, 70);
    var d = g.getImageData(0, 0, W, HH), a = d.data, seed = 7;
    for (var i = 0; i < a.length; i += 4) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; var n = (seed % 23) - 11; a[i] += n; a[i + 1] += n; a[i + 2] += n; }
    g.putImageData(d, 0, 0);
  }
  function toBlob(cv, type, quality) { return new Promise(function (ok) { cv.toBlob(ok, type, quality); }); }

  var preview = h('img', { class: 'ip-img', alt: '', width: W, height: HH });
  var zA = h('canvas', { class: 'ip-z', width: 120, height: 120 }), zB = h('canvas', { class: 'ip-z', width: 120, height: 120 });
  var sizeEl = h('p', { class: 'tr-big ip-size', 'aria-live': 'polite' });
  var noteEl = h('p', { class: 'tr-note ip-note' });
  var chips = FMTS.map(function (f) {
    return h('button', { type: 'button', class: 'tr-btn', 'aria-pressed': String(f[0] === fmt), 'data-f': f[0], onclick: function () { fmt = f[0]; chips.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-f') === fmt)); }); qRow.hidden = fmt === 'png'; run(); } }, [f[2]]);
  });
  var range = h('input', { class: 'ip-range', type: 'range', min: 5, max: 100, step: 1, value: 80, 'aria-label': T.q });
  var qOut = h('b', { text: '80' });
  var qRow = h('label', { class: 'ip-q' }, [h('span', { text: T.q }), range, qOut]);
  var file = h('input', { type: 'file', accept: 'image/*', class: 'ip-file' });
  var fileBtn = h('button', { type: 'button', class: 'tr-btn', onclick: function () { file.click(); } }, [T.pick]);
  range.addEventListener('input', function () { q = +range.value / 100; qOut.textContent = range.value; range.style.setProperty('--p', ((range.value - 5) / 95 * 100) + '%'); clearTimeout(timer); timer = setTimeout(run, 40); });
  file.addEventListener('change', function () {
    var f = file.files && file.files[0]; if (!f) return;
    createImageBitmap(f, { imageOrientation: 'from-image' }).then(function (bm) {
      var s = Math.min(1, 1280 / bm.width);
      src.width = Math.round(bm.width * s); src.height = Math.round(bm.height * s);
      var g = src.getContext('2d'); g.drawImage(bm, 0, 0, src.width, src.height); if (bm.close) bm.close();
      origBytes = f.size; origName = f.name;
      run();
    }).catch(function () { noteEl.textContent = T.no; });
  });

  function fmtKB(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'; }
  function zoom(cv, img) {
    var g = cv.getContext('2d'), sw = 40, sx = Math.round(src.width * 0.06), sy = Math.round(src.height * 0.12);
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, 120, 120);
    g.drawImage(img, sx, sy, sw, sw, 0, 0, 120, 120);
  }
  function run() {
    var my = ++job, f = FMTS.filter(function (x) { return x[0] === fmt; })[0];
    var out = document.createElement('canvas'); out.width = src.width; out.height = src.height;
    var g = out.getContext('2d');
    if (fmt === 'jpg') { g.fillStyle = '#fff'; g.fillRect(0, 0, out.width, out.height); }   // 인플레이스와 같다: JPG 는 흰 바탕부터
    g.drawImage(src, 0, 0);
    var orig = origBytes ? Promise.resolve(origBytes) : toBlob(src, 'image/png').then(function (b) { origBytes = b.size; return b.size; });
    Promise.all([orig, toBlob(out, f[1], fmt === 'png' ? undefined : q)]).then(function (r) {
      if (my !== job || !alive) return;
      var b = r[1];
      if (!b || b.type !== f[1]) { sizeEl.textContent = '–'; noteEl.textContent = T.no; return; }
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(b);
      preview.src = url;
      preview.onload = function () { if (my === job) zoom(zB, preview); };
      zoom(zA, src);
      var pct = Math.round((1 - b.size / r[0]) * 100);
      sizeEl.textContent = '';
      sizeEl.appendChild(document.createTextNode(fmtKB(b.size)));
      sizeEl.appendChild(h('small', { text: pct >= 0 ? T.smaller(pct) : T.bigger(-pct) }));
      noteEl.textContent = T.orig + ' ' + fmtKB(r[0]) + ' (' + origName + ') → ' + f[2] + (fmt === 'png' ? '' : ' ' + Math.round(q * 100) + '%') + ' · ' + T.local;
    });
  }
  // AVIF 는 저장할 수 있는 브라우저에서만 보여 준다(인플레이스도 그렇다)
  toBlob(h('canvas', { width: 2, height: 2 }), 'image/avif', 0.5).then(function (b) { if (!b || b.type !== 'image/avif') chips[3].hidden = true; });

  if (!document.getElementById('try-ip-css')) document.head.appendChild(h('style', { id: 'try-ip-css', text:
    '.ip-view{display:grid;grid-template-columns:minmax(0,1fr) 128px;gap:12px;align-items:start}' +
    '.ip-img{display:block;width:100%;height:auto;border-radius:12px;background:var(--paper);border:1px solid var(--line)}' +
    '.ip-zs{display:grid;gap:6px}.ip-zs figure{margin:0;display:grid;gap:3px}.ip-zs figcaption{font-size:15px;font-weight:600;color:var(--muted)}' +
    '.ip-z{display:block;width:100%;aspect-ratio:1;border-radius:8px;border:1px solid var(--line);image-rendering:pixelated}' +
    '.ip-size small{margin-left:8px}.ip-note{min-height:3.2em}' +
    '.ip-q{display:grid;grid-template-columns:auto minmax(0,1fr) 2.5em;gap:12px;align-items:center;font-size:15px;font-weight:600;color:var(--muted)}.ip-q b{color:var(--ink);text-align:right;font-variant-numeric:tabular-nums}' +
    '.ip-range{-webkit-appearance:none;appearance:none;width:100%;height:44px;margin:0;background:transparent;cursor:pointer;touch-action:pan-y}' +
    '.ip-range::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:linear-gradient(90deg,var(--tc) var(--p,79%),var(--line) var(--p,79%))}' +
    '.ip-range::-moz-range-track{height:8px;border-radius:4px;background:var(--line)}' +
    '.ip-range::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;margin-top:-9px;border-radius:50%;background:#fff;border:3px solid var(--tc);box-shadow:0 2px 6px rgba(0,0,0,.25)}' +
    '.ip-range::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#fff;border:3px solid var(--tc)}' +
    '.ip-file{display:none}.ip-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}' +
    '@media (max-width:560px){.ip-view{grid-template-columns:minmax(0,1fr)}.ip-zs{grid-template-columns:1fr 1fr}}' }));
  stage.appendChild(h('div', { class: 'tr' }, [
    h('div', { class: 'ip-view' }, [preview, h('div', { class: 'ip-zs' }, [
      h('figure', null, [zA, h('figcaption', { text: T.orig + ' · ' + T.zoom })]),
      h('figure', null, [zB, h('figcaption', { text: T.out + ' · ' + T.zoom })])
    ])]),
    sizeEl, noteEl,
    h('div', { class: 'ip-bar' }, [h('div', { class: 'tr-chips', role: 'group', 'aria-label': T.fmt }, chips), fileBtn]),
    qRow, file
  ]));
  paintScene();
  run();
  return {
    stop: function () { alive = false; clearTimeout(timer); if (url) URL.revokeObjectURL(url); },
    auto: function (A) {
      function at(v) { return (v - 5) / 95 * 0.92 + 0.04; }
      function slide(from, to, ms) {
        var steps = A.reduced ? 1 : Math.max(1, Math.round(ms / 60)), i = 0;
        function step() {
          if (i++ >= steps) return Promise.resolve();
          var v = Math.round(from + (to - from) * (i / steps));
          return A.move(range, at(v), 0.5).then(function () { A.set(range, String(v)); return A.wait(60); }).then(step);
        }
        return step();
      }
      return A.wait(300)
        .then(function () { return A.point(range, at(80), 0.5); })
        .then(function () { return slide(80, 8, 1500); })
        .then(function () { return A.wait(1300); })
        .then(function () { return slide(8, 70, 700); })
        .then(function () { return A.wait(500); })
        .then(function () { return A.press(chips[1]); });
    }
  };
};
