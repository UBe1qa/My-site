/* 글자 그대로인 PDF 쓰기(PDFDOC). 외부 라이브러리 없음. 브라우저 전역 PDFDOC, 노드 require.
   sheet.js 가 만든 배치(글자·선의 위치, mm)를 그대로 PDF 글자와 선으로 옮긴다. 그림이 아니라서 인쇄하면 선명하고 글자를 고를 수 있다.
   글꼴: assets/fonts/onesheet-{500,600,700,800}.ttf (Pretendard에서 종이에 쓰는 글자만 남긴 것, _dev/make_fonts.py) 를 통째로 담는다.
   글자 폭·글리프 번호는 assets/fonts/metrics.json. 글꼴 파일을 읽어 풀지 않는다.
   - covers(sheets, metrics): 모든 글자가 글꼴에 있는가(없으면 부르는 쪽이 그림 PDF로 대신한다)
   - make(sheets, kit, meta, deflate): Promise<Uint8Array>. kit = { metrics, fonts: { 500: Uint8Array, … } },
     meta = { title, author, lang, date }, deflate = (Uint8Array) => Promise<Uint8Array | null> (zlib 형식. 없으면 안 줄이고 담는다)
   - image(pages, meta): 쪽마다 JPEG 한 장인 PDF(글꼴을 못 불러왔을 때의 대신) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PDFDOC = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var K = 72 / 25.4;                       // mm → pt
  var STEMV = { 500: 88, 600: 104, 700: 120, 800: 136 };
  function latin(s) { var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; }
  function hex4(n) { return ('000' + n.toString(16)).slice(-4).toUpperCase(); }
  function n3(v) { var s = (Math.round(v * 1000) / 1000).toString(); return s === '-0' ? '0' : s; }
  function u16(s) { var o = 'FEFF'; for (var i = 0; i < s.length; i++) o += hex4(s.charCodeAt(i)); return '<' + o + '>'; }
  function rgb(hex) { return [1, 3, 5].map(function (i) { return n3(parseInt(hex.substr(i, 2), 16) / 255); }).join(' '); }
  function stamp(d) { function p(n) { return (n < 10 ? '0' : '') + n; } return 'D:' + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z'; }
  function gidMap(m) {
    if (!m._map) { m._map = {}; for (var i = 0; i < m.chars.length; i++) m._map[m.chars[i]] = m.gid[i]; }
    return m._map;
  }
  function covers(sheets, metrics) {
    var map = gidMap(metrics);
    return sheets.every(function (sh) { return sh.items.every(function (i) { if (!i.t) return true; for (var k = 0; k < i.s.length; k++) if (!(i.s[k] in map)) return false; return true; }); });
  }
  // 글자 폭(mm): 담은 글꼴의 실제 폭. 테스트가 sheet.js 의 어림 폭(estW)과 견준다.
  function width(s, size, weight, metrics) {
    var map = gidMap(metrics), adv = metrics.adv[weight], w = 0;
    for (var i = 0; i < s.length; i++) w += adv[map[s[i]]] || 0;
    return w / metrics.upm * size;
  }

  // 쪽 하나의 내용(글자·선)
  function content(sh, metrics, colorOf) {
    var H = sh.h * K, map = gidMap(metrics), out = [], lineKey = '';
    sh.items.forEach(function (i) {
      if (i.t) return;
      var k = colorOf(i.c, sh.mono) + '|' + i.w;
      if (k !== lineKey) { out.push(rgb(colorOf(i.c, sh.mono)) + ' RG ' + n3(i.w * K) + ' w'); lineKey = k; }
      out.push(n3(i.x1 * K) + ' ' + n3(H - i.y1 * K) + ' m ' + n3(i.x2 * K) + ' ' + n3(H - i.y2 * K) + ' l S');
    });
    var texts = sh.items.filter(function (i) { return i.t; }).map(function (i, n) { return [i.w + '|' + i.z + '|' + i.c, n, i]; })
      .sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]; });
    var font = '', fill = '';
    out.push('BT');
    texts.forEach(function (t) {
      var i = t[2], f = '/F' + i.w + ' ' + n3(i.z * K) + ' Tf', c = rgb(colorOf(i.c, sh.mono)) + ' rg';
      if (f !== font) { out.push(f); font = f; }
      if (c !== fill) { out.push(c); fill = c; }
      var w = width(i.s, i.z, i.w, metrics), x = i.a === 'm' ? i.x - w / 2 : i.a === 'e' ? i.x - w : i.x, h = '';
      for (var k = 0; k < i.s.length; k++) h += hex4(map[i.s[k]]);
      out.push('1 0 0 1 ' + n3(x * K) + ' ' + n3(H - i.y * K) + ' Tm <' + h + '> Tj');
    });
    out.push('ET');
    return out.join('\n');
  }
  function toUnicode(metrics) {
    var lines = [];
    for (var i = 0; i < metrics.chars.length; i++) lines.push('<' + hex4(metrics.gid[i]) + '> <' + hex4(metrics.chars.charCodeAt(i)) + '>');
    var body = '';
    for (var a = 0; a < lines.length; a += 100) { var part = lines.slice(a, a + 100); body += part.length + ' beginbfchar\n' + part.join('\n') + '\nendbfchar\n'; }
    return '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n' +
      '1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' + body + 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
  }

  // 낱개 객체를 모아 파일로(바이트 위치를 세어 xref 를 쓴다)
  function Writer() {
    var parts = [], offs = [], pos = 0;
    function put(x) { var b = typeof x === 'string' ? latin(x) : x; parts.push(b); pos += b.length; }
    put('%PDF-1.5\n%\xE2\xE3\xCF\xD3\n');
    return {
      obj: function (id, body) { offs[id] = pos; put(id + ' 0 obj\n' + body + '\nendobj\n'); },
      stream: function (id, dict, bytes) { offs[id] = pos; put(id + ' 0 obj\n<< ' + dict + ' /Length ' + bytes.length + ' >>\nstream\n'); put(bytes); put('\nendstream\nendobj\n'); },
      end: function (total, info, idSeed) {
        var xref = pos, s = 'xref\n0 ' + total + '\n0000000000 65535 f \n', h = 2166136261, id = '';
        for (var k = 1; k < total; k++) s += ('0000000000' + offs[k]).slice(-10) + ' 00000 n \n';
        for (var i = 0; i < 4; i++) { for (var j = 0; j < idSeed.length; j++) { h ^= idSeed.charCodeAt(j) + i; h = Math.imul(h, 16777619) >>> 0; } id += ('0000000' + h.toString(16)).slice(-8); }
        put(s + 'trailer\n<< /Size ' + total + ' /Root 1 0 R' + (info ? ' /Info ' + info + ' 0 R' : '') + ' /ID [<' + id + '> <' + id + '>] >>\nstartxref\n' + xref + '\n%%EOF\n');
        var out = new Uint8Array(pos), at = 0;
        parts.forEach(function (b) { out.set(b, at); at += b.length; });
        return out;
      }
    };
  }
  function infoDict(meta) {
    var who = meta.author || 'Onesheet (calendar.lumenlab.page)';
    return '<< /Title ' + u16(meta.title || '') + ' /Author ' + u16(who) + ' /Creator ' + u16(who) + ' /Producer ' + u16(who) + ' /CreationDate (' + stamp(meta.date || new Date()) + ') >>';
  }
  function catalog(meta) { return '<< /Type /Catalog /Pages 2 0 R /Lang (' + (meta.lang === 'ko' ? 'ko-KR' : 'en-US') + ') /ViewerPreferences << /DisplayDocTitle true >> >>'; }

  function make(sheets, kit, meta, deflate) {
    var m = kit.metrics, colorOf = meta.color, zip = deflate || function () { return Promise.resolve(null); };
    var weights = [];
    sheets.forEach(function (sh) { sh.items.forEach(function (i) { if (i.t && weights.indexOf(i.w) < 0) weights.push(i.w); }); });
    weights.sort();
    if (!weights.every(function (w) { return kit.fonts[w] && m.adv[w]; })) return Promise.reject(new Error('font'));
    var W = Writer(), fontId = {}, next = 4;
    weights.forEach(function (w) { fontId[w] = next; next += 5; });
    var pageId = sheets.map(function () { var id = next; next += 2; return id; });
    function packed(bytes) { return zip(bytes).then(function (z) { return z && z.length < bytes.length ? [z, ' /Filter /FlateDecode'] : [bytes, '']; }); }
    var chain = Promise.resolve();
    W.obj(1, catalog(meta));
    W.obj(2, '<< /Type /Pages /Kids [' + pageId.map(function (id) { return id + ' 0 R'; }).join(' ') + '] /Count ' + sheets.length + ' >>');
    W.obj(3, infoDict(meta));
    var s1000 = 1000 / m.upm, uni = latin(toUnicode(m));
    weights.forEach(function (w) {
      var id = fontId[w], name = '/ONESHT+OnesheetSans-' + w, file = kit.fonts[w];
      chain = chain.then(function () { return packed(file); }).then(function (f) {
        return packed(uni).then(function (u) {
          W.obj(id, '<< /Type /Font /Subtype /Type0 /BaseFont ' + name + ' /Encoding /Identity-H /DescendantFonts [' + (id + 1) + ' 0 R] /ToUnicode ' + (id + 4) + ' 0 R >>');
          W.obj(id + 1, '<< /Type /Font /Subtype /CIDFontType2 /BaseFont ' + name + ' /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ' + (id + 2) +
            ' 0 R /DW 1000 /W [0 [' + m.adv[w].map(function (a) { return Math.round(a * s1000); }).join(' ') + ']] /CIDToGIDMap /Identity >>');
          W.obj(id + 2, '<< /Type /FontDescriptor /FontName ' + name + ' /Flags 4 /FontBBox [' + m.bbox.map(function (v) { return Math.round(v * s1000); }).join(' ') + '] /ItalicAngle 0 /Ascent ' + Math.round(m.asc * s1000) +
            ' /Descent ' + Math.round(m.desc * s1000) + ' /CapHeight ' + Math.round(m.cap * s1000) + ' /StemV ' + (STEMV[w] || 100) + ' /FontFile2 ' + (id + 3) + ' 0 R >>');
          W.stream(id + 3, '/Length1 ' + file.length + f[1], f[0]);
          W.stream(id + 4, u[1].slice(1), u[0]);
        });
      });
    });
    var res = '<< /Font << ' + weights.map(function (w) { return '/F' + w + ' ' + fontId[w] + ' 0 R'; }).join(' ') + ' >> >>';
    sheets.forEach(function (sh, n) {
      chain = chain.then(function () { return packed(latin(content(sh, m, colorOf))); }).then(function (c) {
        W.obj(pageId[n], '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + n3(sh.w * K) + ' ' + n3(sh.h * K) + '] /Resources ' + res + ' /Contents ' + (pageId[n] + 1) + ' 0 R >>');
        W.stream(pageId[n] + 1, c[1].slice(1), c[0]);
      });
    });
    return chain.then(function () { return W.end(next, 3, (meta.title || '') + sheets.length + next); });
  }

  // 그림 PDF(대신 쓰는 길): pages = [{ jpeg: Uint8Array, wpx, hpx, wmm, hmm }]
  function image(pages, meta) {
    var W = Writer(), n = pages.length, kids = [];
    for (var i = 0; i < n; i++) kids.push((4 + i * 3) + ' 0 R');
    W.obj(1, catalog(meta));
    W.obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>');
    W.obj(3, infoDict(meta));
    pages.forEach(function (p, i) {
      var id = 4 + i * 3, w = n3(p.wmm * K), h = n3(p.hmm * K), cs = latin('q ' + w + ' 0 0 ' + h + ' 0 0 cm /Im0 Do Q');
      W.obj(id, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + w + ' ' + h + '] /Resources << /XObject << /Im0 ' + (id + 2) + ' 0 R >> >> /Contents ' + (id + 1) + ' 0 R >>');
      W.stream(id + 1, '', cs);
      W.stream(id + 2, '/Type /XObject /Subtype /Image /Width ' + p.wpx + ' /Height ' + p.hpx + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode', p.jpeg);
    });
    return W.end(4 + n * 3, 3, (meta.title || '') + n);
  }

  return { make: make, image: image, covers: covers, width: width };
});
