/* 오래QR — 인쇄 파일 만들기(외부 라이브러리 없음). 화면(DOM)을 모른다: 노드 시험과 브라우저가 같이 쓴다.
   - QRX.pdf(pages, images): 벡터 PDF. 장면(qr-render.js 의 scene)을 path 그대로 옮긴다(그라데이션 = 셰이딩, 글자 = 모양).
     pages = [{ w, h (pt), items: [{ scene, x, y, s (장면 1칸 = s pt), (y 는 위에서부터) }], marks: [[x1,y1,x2,y2]…] }]
     images = { src: { w, h, rgb: Uint8Array, alpha: Uint8Array|null, flate: bool } } 로고(미리 RGB 로 풀어 둔 것)
   - QRX.eps(scene, s, images): EPS(PostScript 3). 로고는 바탕에 합친 RGB 로 받는다(EPS 에는 투명이 없다).
   - QRX.zip(files): 압축하지 않는 ZIP(STORE). files = [{ name, data: Uint8Array }]
   - QRX.sheet(sceneW, sceneH, cm, opt): A4 스티커 시트의 칸 자리(재단선 포함). */
(function (root) {
  'use strict';
  var f = function (n) { n = Math.round(n * 1000) / 1000; return (n === 0 ? 0 : n).toString(); };
  var MM = 72 / 25.4;   // 1mm = 2.8346pt
  var A4 = { w: 595.276, h: 841.89 };

  function bytesOf(str) {   // 글자(0~255)만 든 글 → 바이트
    var b = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) b[i] = str.charCodeAt(i) & 255;
    return b;
  }
  function concat(parts) {
    var n = 0, i; for (i = 0; i < parts.length; i++) n += parts[i].length;
    var out = new Uint8Array(n), o = 0;
    for (i = 0; i < parts.length; i++) { out.set(parts[i], o); o += parts[i].length; }
    return out;
  }
  function rgbN(hex) { var c = hex.replace('#', ''); return [parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255].map(function (v) { return f(v); }); }

  function parse(d) { return root.QRR ? root.QRR.parse(d) : require('./qr-render.js').parse(d); }
  function pathOps(d, ps) {   // ps: true = PostScript 말, false = PDF 말
    var o = [], ops = parse(d);
    for (var i = 0; i < ops.length; i++) {
      var p = ops[i];
      if (p[0] === 'M') o.push(f(p[1]) + ' ' + f(p[2]) + (ps ? ' moveto' : ' m'));
      else if (p[0] === 'L') o.push(f(p[1]) + ' ' + f(p[2]) + (ps ? ' lineto' : ' l'));
      else if (p[0] === 'C') o.push(p.slice(1).map(f).join(' ') + (ps ? ' curveto' : ' c'));
      else o.push(ps ? 'closepath' : 'h');
    }
    return o.join('\n');
  }

  /* ---------- PDF ---------- */
  function pdf(pages, images) {
    images = images || {};
    var objs = [];   // 번호 = 자리 + 1
    function add(body) { objs.push(body); return objs.length; }
    function ref(n) { return n + ' 0 R'; }
    var catalog = add(null), pagesObj = add(null), kids = [];
    var imgNames = {}, imgCount = 0;
    function imageObj(src) {
      if (imgNames[src]) return imgNames[src];
      var im = images[src];
      if (!im) return null;
      var smask = null;
      if (im.alpha) smask = add({ dict: '/Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceGray /BitsPerComponent 8' + (im.flate ? ' /Filter /FlateDecode' : ''), data: im.alpha });
      var n = add({ dict: '/Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8' + (im.flate ? ' /Filter /FlateDecode' : '') + (smask ? ' /SMask ' + ref(smask) : ''), data: im.rgb });
      imgNames[src] = { name: 'Im' + (imgCount++), n: n };
      return imgNames[src];
    }
    /* 장면 하나를 그리는 Form(여러 번 찍어도 한 번만 담긴다) */
    var forms = [];
    function formOf(scene) {
      for (var i = 0; i < forms.length; i++) if (forms[i].scene === scene) return forms[i];
      var sh = [], xo = [], c = [], shn = 0;
      scene.shapes.forEach(function (s) {
        var ops = pathOps(s.d, false), ev = s.rule === 'evenodd';
        if (s.fill.t === 's') { c.push(rgbN(s.fill.c).join(' ') + ' rg'); c.push(ops); c.push(ev ? 'f*' : 'f'); }
        else {
          var a = s.fill.a, fn = '<< /FunctionType 2 /Domain [0 1] /C0 [' + rgbN(a[0][1]).join(' ') + '] /C1 [' + rgbN(a[a.length - 1][1]).join(' ') + '] /N 1 >>';
          var coords = s.fill.t === 'l' ? [s.fill.x1, s.fill.y1, s.fill.x2, s.fill.y2] : [s.fill.cx, s.fill.cy, 0, s.fill.cx, s.fill.cy, s.fill.r];
          var nm = 'Sh' + (shn++);
          sh.push('/' + nm + ' ' + ref(add('<< /ShadingType ' + (s.fill.t === 'l' ? 2 : 3) + ' /ColorSpace /DeviceRGB /Coords [' + coords.map(f).join(' ') + '] /Function ' + fn + ' /Extend [true true] >>')));
          c.push('q'); c.push(ops); c.push(ev ? 'W* n' : 'W n'); c.push('/' + nm + ' sh'); c.push('Q');
        }
      });
      scene.images.forEach(function (im) {
        var o = imageObj(im.src);
        if (!o) return;
        xo.push('/' + o.name + ' ' + ref(o.n));
        c.push('q ' + f(im.w) + ' 0 0 ' + f(-im.h) + ' ' + f(im.x) + ' ' + f(im.y + im.h) + ' cm /' + o.name + ' Do Q');
      });
      var res = '<< ' + (sh.length ? '/Shading << ' + sh.join(' ') + ' >> ' : '') + (xo.length ? '/XObject << ' + xo.join(' ') + ' >> ' : '') + '>>';
      var n = add({ dict: '/Type /XObject /Subtype /Form /BBox [0 0 ' + f(scene.W) + ' ' + f(scene.H) + '] /Resources ' + res, data: bytesOf(c.join('\n')) });
      var fo = { scene: scene, n: n, name: 'Fm' + forms.length };
      forms.push(fo);
      return fo;
    }
    pages.forEach(function (pg) {
      var c = [], used = {};
      pg.items.forEach(function (it) {
        var fo = formOf(it.scene);
        used[fo.name] = fo.n;
        // 장면은 y 가 아래로 자란다 → 뒤집어서 놓는다
        c.push('q ' + f(it.s) + ' 0 0 ' + f(-it.s) + ' ' + f(it.x) + ' ' + f(pg.h - it.y) + ' cm /' + fo.name + ' Do Q');
      });
      if (pg.marks && pg.marks.length) {
        c.push('q 0.35 G 0.4 w');
        pg.marks.forEach(function (m) { c.push(f(m[0]) + ' ' + f(pg.h - m[1]) + ' m ' + f(m[2]) + ' ' + f(pg.h - m[3]) + ' l S'); });
        c.push('Q');
      }
      var cont = add({ dict: '', data: bytesOf(c.join('\n')) });
      var xo = Object.keys(used).map(function (k) { return '/' + k + ' ' + ref(used[k]); }).join(' ');
      kids.push(add('<< /Type /Page /Parent ' + ref(pagesObj) + ' /MediaBox [0 0 ' + f(pg.w) + ' ' + f(pg.h) + '] /Resources << /XObject << ' + xo + ' >> >> /Contents ' + ref(cont) + ' >>'));
    });
    objs[catalog - 1] = '<< /Type /Catalog /Pages ' + ref(pagesObj) + ' >>';
    objs[pagesObj - 1] = '<< /Type /Pages /Kids [' + kids.map(ref).join(' ') + '] /Count ' + kids.length + ' >>';
    var info = add('<< /Producer (Staycode qr.lumenlab.page) /Title (QR code) >>');
    var parts = [bytesOf('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')], off = parts[0].length, xref = [];
    objs.forEach(function (o, i) {
      xref.push(off);
      var head = (i + 1) + ' 0 obj\n', chunk;
      if (typeof o === 'string') chunk = bytesOf(head + o + '\nendobj\n');
      else chunk = concat([bytesOf(head + '<< ' + o.dict + ' /Length ' + o.data.length + ' >>\nstream\n'), o.data, bytesOf('\nendstream\nendobj\n')]);
      parts.push(chunk); off += chunk.length;
    });
    var x = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + xref.map(function (o) { return ('0000000000' + o).slice(-10) + ' 00000 n \n'; }).join('');
    parts.push(bytesOf(x + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + ref(catalog) + ' /Info ' + ref(info) + ' >>\nstartxref\n' + off + '\n%%EOF\n'));
    return concat(parts);
  }

  /* 장면 하나를 PDF 로: mode = 'a4'(A4 가운데) | 'fit'(그림 크기 그대로), cm = 긴 변 길이 */
  /* 크기(cm)는 'QR 무늬' 한 변(눈 바깥 끝에서 끝까지, 여백·틀 빼고)이다(평가 M6). 1칸 = cm / n.
     scene.qr.n 이 없으면(옛 장면) 긴 변 기준 */
  function scaleFor(scene, cm) {
    var L = cm * 10 * MM;
    return scene.qr && scene.qr.n ? L / scene.qr.n : L / Math.max(scene.W, scene.H);
  }
  function pdfOne(scene, cm, mode, images) {
    var s = scaleFor(scene, cm), w = scene.W * s, h = scene.H * s;
    if (mode !== 'fit' && (w > A4.w || h > A4.h)) { var k = Math.min(A4.w / w, A4.h / h); s *= k; w *= k; h *= k; }
    if (mode === 'fit') return pdf([{ w: w, h: h, items: [{ scene: scene, x: 0, y: 0, s: s }] }], images);
    return pdf([{ w: A4.w, h: A4.h, items: [{ scene: scene, x: (A4.w - w) / 2, y: (A4.h - h) / 2, s: s }] }], images);
  }

  /* ---------- 스티커 시트 ---------- */
  /* 칸 자리 계산. cm = 스티커 긴 변. 재단선은 칸 모서리 바깥 틈에 2.5mm. 여백 10mm, 칸 사이 6mm(재단선 자리) */
  function sheet(W, H, cm, opt, n) {
    opt = opt || {};
    var L = cm * 10 * MM, s = n ? L / n : L / Math.max(W, H), w = W * s, h = H * s;
    var margin = (opt.margin == null ? 10 : opt.margin) * MM, gap = (opt.marks === false ? 3 : 6) * MM;
    var cols = Math.max(1, Math.floor((A4.w - 2 * margin + gap) / (w + gap))), rows = Math.max(1, Math.floor((A4.h - 2 * margin + gap) / (h + gap)));
    var fits = w <= A4.w - 2 * margin + 0.01 && h <= A4.h - 2 * margin + 0.01;
    var tw = cols * w + (cols - 1) * gap, th = rows * h + (rows - 1) * gap, x0 = (A4.w - tw) / 2, y0 = (A4.h - th) / 2;
    var cells = [], marks = [], ml = 2.5 * MM, mo = 0.8 * MM;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = x0 + c * (w + gap), y = y0 + r * (h + gap);
      cells.push({ x: x, y: y, w: w, h: h });
      if (opt.marks !== false) {
        [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]].forEach(function (k) {
          marks.push([k[0] + k[2] * mo, k[1], k[0] + k[2] * (mo + ml), k[1]]);   // 가로 선
          marks.push([k[0], k[1] + k[3] * mo, k[0], k[1] + k[3] * (mo + ml)]);   // 세로 선
        });
      }
    }
    return { page: A4, cells: fits ? cells : [], marks: fits ? marks : [], cols: fits ? cols : 0, rows: fits ? rows : 0, s: s, w: w, h: h, fits: fits };
  }
  function pdfSheet(scene, cm, opt, images) {
    var g = sheet(scene.W, scene.H, cm, opt, scene.qr && scene.qr.n);
    return { bytes: pdf([{ w: A4.w, h: A4.h, items: g.cells.map(function (c) { return { scene: scene, x: c.x, y: c.y, s: g.s }; }), marks: g.marks }], images), geo: g };
  }

  /* ---------- EPS ---------- */
  function hexData(u8) {
    var h = '0123456789abcdef', out = [], line = '';
    for (var i = 0; i < u8.length; i++) {
      line += h[u8[i] >> 4] + h[u8[i] & 15];
      if (line.length >= 78) { out.push(line); line = ''; }
    }
    if (line) out.push(line);
    return out.join('\n');
  }
  function eps(scene, cm, images) {
    images = images || {};
    var s = scaleFor(scene, cm), w = scene.W * s, h = scene.H * s;
    var o = ['%!PS-Adobe-3.0 EPSF-3.0', '%%BoundingBox: 0 0 ' + Math.ceil(w) + ' ' + Math.ceil(h), '%%HiResBoundingBox: 0 0 ' + f(w) + ' ' + f(h),
      '%%Creator: Staycode qr.lumenlab.page', '%%Title: QR code', '%%LanguageLevel: 3', '%%EndComments', 'gsave', '0 ' + f(h) + ' translate ' + f(s) + ' ' + f(-s) + ' scale'];
    scene.shapes.forEach(function (sh) {
      var ops = pathOps(sh.d, true), ev = sh.rule === 'evenodd';
      if (sh.fill.t === 's') o.push(rgbN(sh.fill.c).join(' ') + ' setrgbcolor', 'newpath', ops, ev ? 'eofill' : 'fill');
      else {
        var a = sh.fill.a, fn = '<< /FunctionType 2 /Domain [0 1] /C0 [' + rgbN(a[0][1]).join(' ') + '] /C1 [' + rgbN(a[a.length - 1][1]).join(' ') + '] /N 1 >>';
        var coords = sh.fill.t === 'l' ? [sh.fill.x1, sh.fill.y1, sh.fill.x2, sh.fill.y2] : [sh.fill.cx, sh.fill.cy, 0, sh.fill.cx, sh.fill.cy, sh.fill.r];
        o.push('gsave newpath', ops, ev ? 'eoclip' : 'clip', 'newpath', '<< /ShadingType ' + (sh.fill.t === 'l' ? 2 : 3) + ' /ColorSpace /DeviceRGB /Coords [' + coords.map(f).join(' ') + '] /Function ' + fn + ' /Extend [true true] >> shfill', 'grestore');
      }
    });
    scene.images.forEach(function (im) {
      var d = images[im.src];
      if (!d) return;
      o.push('gsave ' + f(im.x) + ' ' + f(im.y + im.h) + ' translate ' + f(im.w) + ' ' + f(-im.h) + ' scale',
        '/DeviceRGB setcolorspace', '<< /ImageType 1 /Width ' + d.w + ' /Height ' + d.h + ' /BitsPerComponent 8 /Decode [0 1 0 1 0 1] /ImageMatrix [' + d.w + ' 0 0 ' + (-d.h) + ' 0 ' + d.h + '] /DataSource currentfile /ASCIIHexDecode filter >> image',
        hexData(d.rgb) + '>', 'grestore');
    });
    o.push('grestore', 'showpage', '%%EOF', '');
    return bytesOf(o.join('\n'));
  }

  /* ---------- ZIP (STORE) ---------- */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xffffffff; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function utf8(s) { return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Buffer.from(s, 'utf8'); }
  function zip(files, when) {
    var d = when || new Date(2026, 9, 14, 12, 0, 0);
    var dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
    var parts = [], central = [], off = 0;
    files.forEach(function (fl) {
      var name = utf8(fl.name), data = fl.data, crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    });
    var cd = concat(central), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cd.length, true); e.setUint32(16, off, true);
    return concat(parts.concat([cd, new Uint8Array(e.buffer)]));
  }

  /* 같은 이름이 또 나오면 뒤에 -2, -3 … */
  function uniqueNames(names) {
    var seen = {}, out = [];
    names.forEach(function (n) {
      var dot = n.lastIndexOf('.'), base = dot > 0 ? n.slice(0, dot) : n, ext = dot > 0 ? n.slice(dot) : '', key = n.toLowerCase(), k = 2;
      while (seen[key]) { n = base + '-' + (k++) + ext; key = n.toLowerCase(); }
      seen[key] = 1; out.push(n);
    });
    return out;
  }

  var QRX = { scaleFor: scaleFor, pdf: pdf, pdfOne: pdfOne, pdfSheet: pdfSheet, sheet: sheet, eps: eps, zip: zip, crc32: crc32, uniqueNames: uniqueNames, A4: A4, MM: MM };
  if (typeof module !== 'undefined' && module.exports) module.exports = QRX;
  else root.QRX = QRX;
})(typeof self !== 'undefined' ? self : this);
