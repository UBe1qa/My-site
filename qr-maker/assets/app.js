/* QR 만들기 — 화면 동작
   입력 → 해석(주소인지 글자인지) → QR 만들기(qr.js) → 미리보기 그림 → 저장(PNG·SVG)·복사·공유
   보안: 사용자가 넣은 글은 모두 textContent로만 화면에 넣어요 (HTML로 넣지 않음) */
(function () {
  'use strict';

  var S = window.QR_SETTINGS;
  var doc = document;
  function $(id) { return doc.getElementById(id); }

  var el = {
    url: $('url'), paste: $('paste'), clear: $('clear'), encoded: $('encoded'),
    tracker: $('tracker'), trackerText: $('tracker-text'), trackerBtn: $('tracker-btn'),
    opts: $('opts'), swatches: $('swatches'), colorWarn: $('color-warn'), bgNote: $('bg-note'), styleNote: $('style-note'),
    caption: $('caption'), sizes: $('sizes'),
    density: $('density'), densityText: $('density-text'), stage: $('stage'), proof: $('proof'), img: $('qr-img'), ghost: $('ghost-note'),
    proofLabel: $('proof-label'), actions: $('actions'), save: $('save'), alt: $('alt'), svg: $('svg'), hint: $('hint'),
    recent: $('recent'), recentList: $('recent-list'), recentClear: $('recent-clear'),
    install: $('install'), dock: $('dock'), dockImg: $('dock-img'), dockLabel: $('dock-label'), dockSave: $('dock-save'),
    toast: $('toast')
  };

  var CAPTION_FONT = '"IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  var MARGIN = 4;        // QR 둘레 여백(칸). 표준 권장값이라 줄이지 않아요
  var PREVIEW_PX = 1024; // 미리보기 그림 크기
  var INK = S.colors[0].value;
  var defaultSize = S.sizes.filter(function (s) { return s.isDefault; })[0] || S.sizes[0];

  var state = {
    enc: { kind: 'empty', value: '' },
    qr: null, error: null, cleaned: null,
    fg: INK, bg: 'white', style: 'square', caption: '', px: defaultSize.px,
    previewUrl: null, exportBlob: null, rev: 0
  };

  // ---------- 기기에 따라 버튼 정하기 ----------
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  var canPaste = !!(navigator.clipboard && navigator.clipboard.readText);
  var canClipImage = !!(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write);
  var canShareFiles = (function () {
    try {
      var f = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' });
      return !!(navigator.canShare && navigator.canShare({ files: [f] }));
    } catch (e) { return false; }
  })();
  var standalone = !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  // 아이폰: '이미지로 저장' = 공유 창(여기서 '이미지 저장' → 사진첩). 나머지: 파일로 받기
  var saveMode = (isIOS && canShareFiles) ? 'share' : 'download';
  var altMode = null;
  if (isIOS) altMode = canClipImage ? 'copy' : null;
  else if (coarse && canShareFiles) altMode = 'share';
  else if (canClipImage) altMode = 'copy';

  // ---------- 입력 해석 ----------
  var SCHEME = /^(?:https?:\/\/|ftp:\/\/|mailto:|tel:|sms:|smsto:|geo:|wifi:|mecard:|begin:vcard|market:|intent:|kakaotalk:|kakaomap:|nmap:|bitcoin:)/i;
  var DOMAIN;
  try {
    DOMAIN = new RegExp('^(?:[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]*[\\p{L}\\p{N}])?\\.)+\\p{L}{2,}(?::\\d{1,5})?(?:[/?#]\\S*)?$', 'u');
  } catch (e) {
    DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:[/?#]\S*)?$/i;
  }
  function interpret(raw) {
    var t = String(raw || '').trim();
    if (!t) return { kind: 'empty', value: '' };
    if (SCHEME.test(t)) return { kind: /^https?:/i.test(t) ? 'url' : 'scheme', value: t };
    if (!/\s/.test(t) && DOMAIN.test(t)) return { kind: 'url', value: 'https://' + t, added: true };
    return { kind: 'text', value: t };
  }

  function hostOf(url) {
    var m = /^https?:\/\/([^\/?#:]+)/i.exec(url);
    return m ? m[1].toLowerCase().replace(/^(www|m)\./, '') : '';
  }
  function labelFor(t) {
    var m = /^https?:\/\/([^\/?#]+)(\/[^\/?#]+)?/i.exec(t);
    if (m) {
      var seg = m[2] && m[2].length <= 24 ? m[2] : '';
      return m[1].replace(/^www\./i, '') + seg;
    }
    return t.length > 24 ? t.slice(0, 24) + '…' : t;
  }
  function safeDecode(s) { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return s; } }

  // 떼어도 같은 페이지가 열리는 추적용 꼬리표 찾기 (나머지 주소 모양은 그대로 둠)
  function stripTracking(url) {
    if (!/^https?:\/\//i.test(url)) return null;
    var m = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(url);
    if (!m || !m[2]) return null;
    var extra = S.tracking.byHost[hostOf(url)] || [];
    var keep = [], removed = [];
    m[2].slice(1).split('&').forEach(function (part) {
      if (!part) return;
      var key = safeDecode(part.split('=')[0]).toLowerCase();
      if (key.indexOf('utm_') === 0 || S.tracking.all.indexOf(key) >= 0 || extra.indexOf(key) >= 0) {
        if (removed.indexOf(key) < 0) removed.push(key);
      } else {
        keep.push(part);
      }
    });
    if (!removed.length) return null;
    return { value: m[1] + (keep.length ? '?' + keep.join('&') : '') + (m[3] || ''), removed: removed };
  }

  function makeQR(text) {
    try { return { qr: QR.encode(text, { ecl: 'M' }) }; }
    catch (e) {
      if (e.code !== 'TOO_LONG') return { error: e };
      try { return { qr: QR.encode(text, { ecl: 'L' }) }; } catch (e2) { return { error: e2 }; }
    }
  }

  // ---------- 그리기 ----------
  function geometry(qr, px, caption) {
    var total = qr.size + MARGIN * 2;
    var unit = Math.max(1, Math.floor(px / total));   // 한 칸 = 정수 픽셀 (선명하게)
    var qrPx = unit * total;
    var pad = Math.floor((px - qrPx) / 2);             // 남는 픽셀은 바깥 여백으로
    var fontPx = 0, capH = 0;
    if (caption) {
      fontPx = Math.max(12, Math.round(px * 0.07));
      capH = Math.round(fontPx * 1.25 + MARGIN * unit * 0.75);
    }
    return { total: total, unit: unit, qrPx: qrPx, pad: pad, W: px, H: px + capH, fontPx: fontPx, capH: capH };
  }
  function inFinder(x, y, n) { return (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7); }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fitFont(ctx, text, startPx, maxW) {
    var size = startPx;
    ctx.font = '700 ' + size + 'px ' + CAPTION_FONT;
    while (size > 10 && ctx.measureText(text).width > maxW) {
      size -= 2;
      ctx.font = '700 ' + size + 'px ' + CAPTION_FONT;
    }
    return size;
  }
  function toCanvas(qr, o) {
    var g = geometry(qr, o.px, o.caption);
    var c = doc.createElement('canvas');
    c.width = g.W; c.height = g.H;
    var ctx = c.getContext('2d');
    if (o.bg !== 'transparent') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, g.W, g.H); }
    ctx.fillStyle = o.fg;
    var n = qr.size, m = qr.modules, u = g.unit, ox = g.pad + MARGIN * u, oy = ox, x, y;
    if (o.style === 'round') {
      // 모서리 네모는 살짝만 둥글게 (많이 둥글리면 까다로운 판독기가 못 찾음 — 2026-09-28 시험)
      var r = u * 0.46;
      ctx.beginPath();
      for (y = 0; y < n; y++) {
        for (x = 0; x < n; x++) {
          if (!m[y * n + x] || inFinder(x, y, n)) continue;
          var cx = ox + (x + 0.5) * u, cy = oy + (y + 0.5) * u;
          ctx.moveTo(cx + r, cy);
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (p) {
        var fx = ox + p[0] * u, fy = oy + p[1] * u;
        ctx.beginPath();
        roundRect(ctx, fx, fy, 7 * u, 7 * u, 1.2 * u);
        roundRect(ctx, fx + u, fy + u, 5 * u, 5 * u, 0.7 * u);
        ctx.fill('evenodd');
        ctx.beginPath();
        roundRect(ctx, fx + 2 * u, fy + 2 * u, 3 * u, 3 * u, 0.5 * u);
        ctx.fill();
      });
    } else {
      for (y = 0; y < n; y++) {
        x = 0;
        while (x < n) {
          if (m[y * n + x]) {
            var s = x;
            while (x < n && m[y * n + x]) x++;
            ctx.fillRect(ox + s * u, oy + y * u, (x - s) * u, u);
          } else x++;
        }
      }
    }
    if (o.caption) {
      var size = fitFont(ctx, o.caption, g.fontPx, g.W * 0.88);
      ctx.font = '700 ' + size + 'px ' + CAPTION_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.caption, g.W / 2, g.pad + g.qrPx + g.fontPx * 0.55);
    }
    return c;
  }

  function num(v) { return String(Math.round(v * 1000) / 1000); }
  function xml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function rrPath(x, y, w, h, r) {
    var a = 'A' + num(r) + ' ' + num(r) + ' 0 0 1 ';
    return 'M' + num(x + r) + ' ' + num(y) + 'H' + num(x + w - r) + a + num(x + w) + ' ' + num(y + r) +
      'V' + num(y + h - r) + a + num(x + w - r) + ' ' + num(y + h) +
      'H' + num(x + r) + a + num(x) + ' ' + num(y + h - r) +
      'V' + num(y + r) + a + num(x + r) + ' ' + num(y) + 'Z';
  }
  // 인쇄소용 SVG: 1칸 = 1단위. 크기를 키워도 깨지지 않아요
  function toSVG(qr, o) {
    var n = qr.size, m = qr.modules, x, y;
    var g = geometry(qr, (n + MARGIN * 2) * 20, o.caption); // 1칸 = 20px 기준으로 캔버스와 같은 배치
    var k = 1 / g.unit, W = g.W * k, H = g.H * k;
    var d = '';
    if (o.style === 'round') {
      var r = 0.46;
      for (y = 0; y < n; y++) {
        for (x = 0; x < n; x++) {
          if (!m[y * n + x] || inFinder(x, y, n)) continue;
          var cx = MARGIN + x + 0.5, cy = MARGIN + y + 0.5;
          d += 'M' + num(cx - r) + ' ' + num(cy) + 'a' + r + ' ' + r + ' 0 1 0 ' + num(2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + num(-2 * r) + ' 0';
        }
      }
      [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (p) {
        var fx = MARGIN + p[0], fy = MARGIN + p[1];
        d += rrPath(fx, fy, 7, 7, 1.2) + rrPath(fx + 1, fy + 1, 5, 5, 0.7) + rrPath(fx + 2, fy + 2, 3, 3, 0.5);
      });
    } else {
      for (y = 0; y < n; y++) {
        x = 0;
        while (x < n) {
          if (m[y * n + x]) {
            var s = x;
            while (x < n && m[y * n + x]) x++;
            d += 'M' + (MARGIN + s) + ' ' + (MARGIN + y) + 'h' + (x - s) + 'v1h-' + (x - s) + 'z';
          } else x++;
        }
      }
    }
    var out = '<svg xmlns="http://www.w3.org/2000/svg" width="' + o.px + '" height="' + Math.round(o.px * H / W) +
      '" viewBox="0 0 ' + num(W) + ' ' + num(H) + '"' + (o.style === 'round' ? '' : ' shape-rendering="crispEdges"') + '>';
    if (o.bg !== 'transparent') out += '<rect width="100%" height="100%" fill="#ffffff"/>';
    out += '<path fill="' + o.fg + '" fill-rule="evenodd" d="' + d + '"/>';
    if (o.caption) {
      var ctx = doc.createElement('canvas').getContext('2d');
      var size = fitFont(ctx, o.caption, g.fontPx, g.W * 0.88);
      out += '<text x="' + num(W / 2) + '" y="' + num((g.pad + g.qrPx + g.fontPx * 0.55) * k) + '" text-anchor="middle" dominant-baseline="central"' +
        ' font-family="' + xml(CAPTION_FONT) + '" font-weight="700" font-size="' + num(size * k) + '" fill="' + o.fg + '">' + xml(o.caption) + '</text>';
    }
    return out + '</svg>';
  }

  function opts(px) { return { px: px, fg: state.fg, bg: state.bg, style: state.style, caption: state.caption }; }

  function fileName(ext) {
    var base = state.caption || labelFor(state.enc.value);
    base = String(base).replace(/[\\/:*?"<>|#%&{}$!'`@+=~^\s…]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 40);
    return (base || 'qr') + '-qr.' + ext;
  }

  // ---------- 화면 갱신 ----------
  function span(tag, text) { var s = doc.createElement(tag); s.textContent = text; return s; }
  function fmtNum(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function showEncoded() {
    var e = state.enc, box = el.encoded;
    box.textContent = '';
    box.className = 'encoded';
    if (e.kind === 'empty') { box.appendChild(span('small', 'https:// 는 빼고 넣어도 돼요')); return; }
    if (state.error) {
      box.classList.add('error');
      var max = QR.maxBytes('L');
      box.appendChild(span('b', '너무 길어요.'));
      box.appendChild(doc.createTextNode(' QR 하나에는 영문 ' + fmtNum(max) + '자(한글 약 ' + fmtNum(Math.floor(max / 3)) + '자)까지 담겨요. 지금 ' + fmtNum(QR.utf8(e.value).length) + '바이트예요.'));
      return;
    }
    if (e.kind === 'text') {
      box.classList.add('text');
      box.appendChild(span('b', '글자 그대로 담겨요'));
      box.appendChild(span('small', '주소가 아니라서, 찍으면 이 글자가 보여요'));
      return;
    }
    box.classList.add('ok');
    if (e.added) {
      box.appendChild(span('b', '✓ 앞에 https:// 를 붙여서 담아요'));
      box.appendChild(span('code', e.value));
    } else {
      box.appendChild(span('b', e.kind === 'url' ? '✓ 이 주소가 그대로 담겨요' : '✓ 이 내용이 그대로 담겨요'));
    }
  }

  function showTracker() {
    var t = (state.qr && state.enc.kind === 'url') ? stripTracking(state.enc.value) : null;
    state.cleaned = t;
    if (!t) { el.tracker.hidden = true; return; }
    var names = t.removed.slice(0, 3).join(', ') + (t.removed.length > 3 ? ' 등' : '');
    var now = state.qr.size, after = makeQR(t.value).qr;
    el.trackerText.textContent = '';
    el.trackerText.appendChild(span('b', '추적용 꼬리표 ' + t.removed.length + '개'));
    el.trackerText.appendChild(doc.createTextNode('(' + names + ')는 떼도 같은 페이지가 열려요.' +
      (after && after.size < now ? ' QR이 ' + now + '×' + now + '칸에서 ' + after.size + '×' + after.size + '칸으로 단순해져요.' : '')));
    el.tracker.hidden = false;
  }

  function showDensity() {
    if (!state.qr) {
      el.density.removeAttribute('data-level');
      el.densityText.textContent = state.error ? '담을 수 없어요' : '';
      return;
    }
    var n = state.qr.size, level, msg;
    if (n <= 29) { level = 1; msg = '멀리서도 잘 읽혀요'; }
    else if (n <= 49) { level = 2; msg = '적당해요'; }
    else { level = 3; msg = '촘촘해요 · 크게 인쇄하세요'; }
    el.density.setAttribute('data-level', String(level));
    el.densityText.textContent = n + '×' + n + '칸 · ' + msg;
  }

  var ghostUrl = null;
  function showProof() {
    var has = !!state.qr;
    el.proof.classList.toggle('is-empty', !has && !state.error);
    el.proof.classList.toggle('is-error', !!state.error);
    el.stage.classList.toggle('clear', has && state.bg === 'transparent');
    el.ghost.textContent = '';
    if (state.error) el.ghost.textContent = '너무 길어서 QR에 담을 수 없어요';
    else if (!has) el.ghost.textContent = '여기에 QR이 나와요';
    el.img.alt = has ? 'QR 코드: ' + state.enc.value : '';
    if (!has) {
      if (!ghostUrl) ghostUrl = toCanvas(QR.encode('QR 만들기'), { px: 330, fg: INK, bg: 'white', style: 'square', caption: '' }).toDataURL('image/png');
      el.img.src = ghostUrl;
      el.proofLabel.hidden = true;
      return;
    }
    var g = geometry(state.qr, state.px, state.caption);
    el.proofLabel.textContent = '';
    var fn = span('span', fileName('png')), px = span('span', ' · ' + g.W + '×' + g.H + 'px');
    fn.className = 'fn'; px.className = 'px';
    el.proofLabel.append(fn, px);
    el.proofLabel.hidden = false;
  }

  function refreshNotes() {
    el.colorWarn.hidden = contrastWithWhite(state.fg) >= 3;
    el.bgNote.hidden = state.bg !== 'transparent';
    el.styleNote.hidden = state.style !== 'round';
  }
  function lum(hex) {
    var v = parseInt(hex.slice(1), 16);
    var c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(function (x) {
      x /= 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrastWithWhite(hex) { return /^#[0-9a-f]{6}$/i.test(hex) ? 1.05 / (lum(hex) + 0.05) : 21; }

  function setButtons() {
    var ok = !!state.qr;
    el.save.disabled = !ok; el.alt.disabled = !ok; el.svg.disabled = !ok; el.dockSave.disabled = !ok;
    el.hint.textContent = ok ? HINT_READY : state.error ? '주소를 줄이면 다시 저장할 수 있어요' : '주소를 넣으면 저장 버튼이 켜져요';
  }

  // 미리보기 그림 (그리고 잠시 뒤 저장용 그림도 미리 만들어 둠 → 아이폰 공유 창이 바로 뜨게)
  var exportTimer = null;
  function renderImages() {
    var rev = ++state.rev;
    state.exportBlob = null;
    clearTimeout(exportTimer);
    if (!state.qr) return;
    var c = toCanvas(state.qr, opts(PREVIEW_PX));
    c.toBlob(function (blob) {
      if (rev !== state.rev || !blob) return;
      var old = state.previewUrl;
      state.previewUrl = URL.createObjectURL(blob);
      el.img.src = state.previewUrl;
      el.dockImg.src = state.previewUrl;
      if (old) setTimeout(function () { URL.revokeObjectURL(old); }, 1500);
      if (state.px === PREVIEW_PX) { state.exportBlob = blob; return; }
      exportTimer = setTimeout(function () {
        if (rev !== state.rev) return;
        toCanvas(state.qr, opts(state.px)).toBlob(function (b) { if (rev === state.rev) state.exportBlob = b; }, 'image/png');
      }, 200);
    }, 'image/png');
  }
  function getExportBlob() {
    if (state.exportBlob) return Promise.resolve(state.exportBlob);
    return new Promise(function (resolve, reject) {
      toCanvas(state.qr, opts(state.px)).toBlob(function (b) { if (b) resolve(b); else reject(new Error('no blob')); }, 'image/png');
    });
  }
  // 기다리지 않고 바로 그림 파일 만들기 (toDataURL은 즉시 끝남)
  function exportBlobNow() {
    var data = toCanvas(state.qr, opts(state.px)).toDataURL('image/png');
    var bin = atob(data.split(',')[1]), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: 'image/png' });
  }

  function update() {
    var raw = el.url.value;
    el.clear.hidden = !raw;
    el.paste.hidden = !!raw || !canPaste;
    state.enc = interpret(raw);
    state.qr = null; state.error = null;
    if (state.enc.kind !== 'empty') {
      var r = makeQR(state.enc.value);
      if (r.qr) state.qr = r.qr; else state.error = r.error;
    }
    showEncoded(); showTracker(); showDensity(); showProof(); setButtons();
    renderImages();
    updateDock();
  }
  var optTimer = null;
  function optionsChanged(now) {
    refreshNotes();
    if (!state.qr) return;
    showProof();
    clearTimeout(optTimer);
    if (now) renderImages(); else optTimer = setTimeout(renderImages, 60);
  }

  // ---------- 저장·복사·공유 ----------
  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    doc.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }
  function shareFile(blob, name) {
    var file = new File([blob], name, { type: 'image/png' });
    return navigator.share({ files: [file] });
  }
  function onSave() {
    if (!state.qr) return;
    var name = fileName('png');
    if (saveMode === 'share') {
      // 아이폰: 누르자마자 공유 창을 열어야 해서, 미리 만든 그림이 없으면 그 자리에서 바로 만듦
      var blob = state.exportBlob || exportBlobNow();
      shareFile(blob, name).then(function () { remember(); }, function (err) {
        if (err && err.name === 'AbortError') return;
        download(blob, name); remember();
      });
      return;
    }
    getExportBlob().then(function (blob) {
      download(blob, name);
      remember();
      toast('이미지로 저장했어요');
    }, function () { toast('저장하지 못했어요. 한 번 더 눌러 주세요'); });
  }
  function onAlt() {
    if (!state.qr) return;
    if (altMode === 'share') {
      shareFile(state.exportBlob || exportBlobNow(), fileName('png')).then(function () { remember(); }, function (err) {
        if (err && err.name !== 'AbortError') toast('공유하지 못했어요. 저장 버튼을 써 주세요');
      });
      return;
    }
    try {
      var item = new ClipboardItem({ 'image/png': state.exportBlob || getExportBlob() });
      navigator.clipboard.write([item]).then(function () {
        remember();
        toast('복사했어요. 원하는 곳에 붙여 넣으세요');
      }, function () { toast('이 브라우저는 그림 복사를 막아 두었어요. 저장 버튼을 써 주세요'); });
    } catch (e) {
      toast('이 브라우저는 그림 복사를 막아 두었어요. 저장 버튼을 써 주세요');
    }
  }
  function onSvg() {
    if (!state.qr) return;
    var svg = toSVG(state.qr, opts(state.px));
    download(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), fileName('svg'));
    remember();
    toast('SVG로 저장했어요');
  }

  // ---------- 최근에 저장한 QR (이 브라우저의 localStorage에만) ----------
  var RECENT_KEY = 'qr-maker:recent';
  function validEntry(x) {
    return !!x && typeof x.t === 'string' && x.t.length > 0 && x.t.length <= 3000 &&
      typeof x.c === 'string' && x.c.length <= 60 && /^#[0-9a-f]{6}$/i.test(x.fg) &&
      (x.bg === 'white' || x.bg === 'transparent') && (x.st === 'square' || x.st === 'round') &&
      typeof x.px === 'number' && typeof x.at === 'number';
  }
  function readRecent() {
    try {
      var list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(list) ? list.filter(validEntry).slice(0, S.maxRecent) : [];
    } catch (e) { return []; }
  }
  function writeRecent(list) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) { /* 저장 공간을 못 쓰면 조용히 넘어감 */ }
  }
  function sameEntry(a, b) { return a.t === b.t && a.c === b.c && a.fg === b.fg && a.bg === b.bg && a.st === b.st; }
  function remember() {
    var e = { t: state.enc.value, c: state.caption, fg: state.fg, bg: state.bg, st: state.style, px: state.px, at: Date.now() };
    var list = readRecent().filter(function (x) { return !sameEntry(x, e); });
    list.unshift(e);
    writeRecent(list.slice(0, S.maxRecent));
    renderRecent();
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    function two(v) { return (v < 10 ? '0' : '') + v; }
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + two(d.getHours()) + ':' + two(d.getMinutes());
  }
  function renderRecent() {
    var list = readRecent();
    el.recentList.textContent = '';
    el.recent.hidden = !list.length;
    list.forEach(function (x) {
      var li = doc.createElement('li');
      var open = doc.createElement('button');
      open.type = 'button';
      open.className = 'recent-open';
      var img = doc.createElement('img');
      img.alt = ''; img.width = 120; img.height = 120; img.loading = 'lazy';
      var r = makeQR(x.t);
      if (r.qr) img.src = toCanvas(r.qr, { px: 240, fg: x.fg, bg: x.bg, style: x.st, caption: '' }).toDataURL('image/png');
      var title = x.c || labelFor(x.t);
      open.append(img, span('span', title), span('span', fmtDate(x.at)));
      open.children[1].className = 'recent-name';
      open.children[2].className = 'recent-date';
      open.addEventListener('click', function () { restore(x); });
      var del = doc.createElement('button');
      del.type = 'button';
      del.className = 'recent-del';
      del.textContent = '×';
      del.setAttribute('aria-label', title + ' 목록에서 지우기');
      del.addEventListener('click', function () {
        writeRecent(readRecent().filter(function (y) { return !(sameEntry(y, x) && y.at === x.at); }));
        renderRecent();
      });
      li.append(open, del);
      el.recentList.appendChild(li);
    });
  }
  function restore(x) {
    el.url.value = x.t;
    state.fg = x.fg; state.bg = x.bg; state.style = x.st; state.caption = x.c;
    state.px = S.sizes.some(function (s) { return s.px === x.px; }) ? x.px : defaultSize.px;
    syncControls();
    update();
    loadCaptionFont(state.caption);
    $('title').scrollIntoView({ block: 'start' });
    toast('그때 설정으로 다시 열었어요');
  }

  // ---------- 꾸미기 칸 ----------
  var customWrap, customInput;
  function buildControls() {
    S.colors.forEach(function (c) {
      var lab = doc.createElement('label');
      lab.className = 'sw';
      lab.title = c.name;
      var inp = doc.createElement('input');
      inp.type = 'radio'; inp.name = 'fg'; inp.value = c.value;
      inp.setAttribute('aria-label', c.name);
      var dot = doc.createElement('span');
      dot.style.setProperty('--c', c.value);
      lab.append(inp, dot);
      el.swatches.appendChild(lab);
    });
    customWrap = doc.createElement('span');
    customWrap.className = 'sw sw-custom';
    customWrap.title = '직접 고르기';
    customInput = doc.createElement('input');
    customInput.type = 'color';
    customInput.value = '#0b7a4b';
    customInput.setAttribute('aria-label', '색 직접 고르기');
    customWrap.appendChild(customInput);
    el.swatches.appendChild(customWrap);
    customInput.addEventListener('input', function () {
      state.fg = customInput.value.toLowerCase();
      el.opts.querySelectorAll('input[name="fg"]').forEach(function (r) { r.checked = false; });
      customWrap.classList.add('on');
      optionsChanged(false);
    });

    S.sizes.forEach(function (s) {
      var lab = doc.createElement('label');
      lab.title = s.note;
      var inp = doc.createElement('input');
      inp.type = 'radio'; inp.name = 'size'; inp.value = String(s.px);
      var txt = span('span', s.name);
      txt.appendChild(span('small', s.px + 'px'));
      lab.append(inp, txt);
      el.sizes.appendChild(lab);
    });
    el.caption.maxLength = S.captionMax;
    syncControls();
  }
  function syncControls() {
    var preset = false;
    el.opts.querySelectorAll('input[name="fg"]').forEach(function (r) {
      r.checked = r.value.toLowerCase() === state.fg.toLowerCase();
      if (r.checked) preset = true;
    });
    customWrap.classList.toggle('on', !preset);
    if (!preset) customInput.value = state.fg;
    el.opts.querySelectorAll('input[name="bg"]').forEach(function (r) { r.checked = r.value === state.bg; });
    el.opts.querySelectorAll('input[name="style"]').forEach(function (r) { r.checked = r.value === state.style; });
    el.opts.querySelectorAll('input[name="size"]').forEach(function (r) { r.checked = Number(r.value) === state.px; });
    el.caption.value = state.caption;
    refreshNotes();
  }
  el.opts.addEventListener('submit', function (e) { e.preventDefault(); });
  el.opts.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'fg') { state.fg = t.value; customWrap.classList.remove('on'); }
    else if (t.name === 'bg') state.bg = t.value;
    else if (t.name === 'style') state.style = t.value;
    else if (t.name === 'size') state.px = Number(t.value);
    else return;
    optionsChanged(true);
  });
  el.caption.addEventListener('input', function () {
    state.caption = el.caption.value.trim();
    optionsChanged(false);
    loadCaptionFont(state.caption);
  });
  // 아래 글자에 쓰인 글자의 웹 글꼴 조각을 받아 온 뒤 다시 그림 (안 받아지면 기본 글꼴로)
  var fontTimer = null;
  function loadCaptionFont(text) {
    if (!text || !doc.fonts || !doc.fonts.load) return;
    clearTimeout(fontTimer);
    fontTimer = setTimeout(function () {
      doc.fonts.load('700 40px "IBM Plex Sans KR"', text).then(function () {
        if (state.caption === text) renderImages();
      }, function () {});
    }, 150);
  }
  el.caption.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); el.caption.blur(); } });

  // ---------- 주소 칸 ----------
  var inputTimer = null;
  el.url.addEventListener('input', function () {
    el.clear.hidden = !el.url.value;
    el.paste.hidden = !!el.url.value || !canPaste;
    clearTimeout(inputTimer);
    inputTimer = setTimeout(update, 80);
  });
  el.url.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    clearTimeout(inputTimer);
    update();
    el.url.blur();
    if (coarse && state.qr) el.actions.scrollIntoView({ block: 'center' });
  });
  el.clear.addEventListener('click', function () { el.url.value = ''; update(); el.url.focus(); });
  el.paste.addEventListener('click', function () {
    navigator.clipboard.readText().then(function (t) {
      t = String(t || '').trim();
      if (!t) { toast('복사해 둔 주소가 없어요'); return; }
      el.url.value = t.slice(0, 3000);
      update();
    }, function () { toast('붙여넣기가 막혀 있어요. 입력칸을 길게 눌러 붙여 넣어 주세요'); });
  });
  el.trackerBtn.addEventListener('click', function () {
    if (!state.cleaned) return;
    el.url.value = state.cleaned.value;
    update();
    toast('꼬리표를 뗐어요');
  });

  el.save.addEventListener('click', onSave);
  el.dockSave.addEventListener('click', onSave);
  el.alt.addEventListener('click', onAlt);
  el.svg.addEventListener('click', onSvg);
  el.recentClear.addEventListener('click', function () { writeRecent([]); renderRecent(); toast('목록을 비웠어요'); });

  // ---------- 휴대폰 하단 저장 막대 ----------
  var actionsOut = false;
  var narrow = window.matchMedia ? matchMedia('(max-width: 859px)') : { matches: false };
  function typing() { var a = doc.activeElement; return a === el.url || a === el.caption; }
  function updateDock() {
    var show = narrow.matches && !!state.qr && actionsOut && !typing();
    el.dock.hidden = !show;
    if (show) el.dockLabel.textContent = state.caption || labelFor(state.enc.value);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var en = entries[0];
      actionsOut = !en.isIntersecting;
      updateDock();
    }).observe(el.actions);
  }
  [el.url, el.caption].forEach(function (inp) {
    inp.addEventListener('focus', updateDock);
    inp.addEventListener('blur', function () { setTimeout(updateDock, 50); });
  });

  // ---------- 토스트 ----------
  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 2600);
  }

  // ---------- 앱으로 설치 (웹앱) ----------
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredInstall = e;
    el.install.hidden = false;
  });
  el.install.addEventListener('click', function () {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    deferredInstall.userChoice.then(function () { deferredInstall = null; el.install.hidden = true; });
  });
  window.addEventListener('appinstalled', function () { el.install.hidden = true; toast('설치했어요. 홈 화면에서 열어 보세요'); });
  if (standalone) doc.querySelectorAll('[data-app-only]').forEach(function (n) { n.hidden = true; });
  var os = isIOS ? 'ios' : isAndroid ? 'android' : (coarse ? '' : 'desktop');
  var here = os && doc.querySelector('.how-item[data-os="' + os + '"]');
  if (here) here.classList.add('is-here');

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  // ---------- 다른 앱에서 '공유'로 들어온 주소 (?url= / ?text=) ----------
  (function incoming() {
    var p;
    try { p = new URLSearchParams(location.search); } catch (e) { return; }
    var v = p.get('url') || '';
    if (!v) {
      var text = (p.get('text') || '') + ' ' + (p.get('title') || '');
      var found = /https?:\/\/\S+/i.exec(text);
      v = found ? found[0] : (p.get('text') || '').trim();
    }
    if (!v) return;
    el.url.value = v.slice(0, 3000);
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.hash);
  })();

  // ---------- 도움말 예시 그림 ----------
  function demo() {
    [['https://naver.com', 'demo-short'],
      ['https://naver.com/?utm_source=kakaotalk&utm_medium=share&utm_campaign=autumn_event&fbclid=IwAR2xYq8pLkT0mZ', 'demo-long']
    ].forEach(function (p) {
      var q = makeQR(p[0]).qr;
      $(p[1]).src = toCanvas(q, { px: q.size + MARGIN * 2, fg: INK, bg: 'white', style: 'square', caption: '' }).toDataURL('image/png');
      $(p[1] + '-n').textContent = q.size + '×' + q.size + '칸';
    });
  }

  // ---------- 시작 ----------
  if (altMode) { el.alt.hidden = false; el.alt.textContent = altMode === 'share' ? '공유' : '복사'; }
  el.svg.hidden = coarse;
  var HINT_READY = isIOS && saveMode === 'share' ? "'이미지로 저장' → 공유 창에서 '이미지 저장'을 누르면 사진첩에 들어가요"
    : coarse ? 'QR을 길게 눌러도 저장돼요'
      : 'PNG는 어디에나, SVG는 인쇄소에 보낼 때 좋아요';

  buildControls();
  renderRecent();
  demo();
  update();
  if (!coarse && !el.url.value) el.url.focus({ preventScroll: true });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { if (state.caption) renderImages(); });
})();
