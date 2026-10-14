/* 오래QR — QR 그림 그리기. 화면(DOM)을 모른다(캔버스 그리기만 브라우저 것을 쓴다).
   QRR.scene(qr, style, glyphs) → 장면(scene): 1 = QR 한 칸. 모든 모양은 절대 좌표 M·L·C·Q·Z 만 쓴 path 글이라
   미리보기(SVG)·SVG 저장·PNG/JPG(캔버스 Path2D)·PDF·EPS 가 같은 장면에서 나온다(모양이 같다).
   눈(파인더)은 7칸 고리 + 1칸 틈 + 3칸 가운데의 비율을 지키고, 둘레 여백은 style.margin 칸.
   scene = { W, H, outline, shapes:[{d, fill, rule}], images:[{x,y,w,h,src}], qr:{x,y,size,n,margin}, textMissing } */
(function (root) {
  'use strict';
  var K = 0.5522847498;   // 원을 베지어 넷으로 그릴 때의 손잡이 길이

  function f(n) { n = Math.round(n * 1000) / 1000; return (n === 0 ? 0 : n).toString(); }

  /* ---------- path 만들기 ---------- */
  function P() { this.s = []; }
  P.prototype.M = function (x, y) { this.s.push('M' + f(x) + ' ' + f(y)); return this; };
  P.prototype.L = function (x, y) { this.s.push('L' + f(x) + ' ' + f(y)); return this; };
  P.prototype.C = function (a, b, c, d, e, g) { this.s.push('C' + f(a) + ' ' + f(b) + ' ' + f(c) + ' ' + f(d) + ' ' + f(e) + ' ' + f(g)); return this; };
  P.prototype.Z = function () { this.s.push('Z'); return this; };
  P.prototype.d = function () { return this.s.join(''); };
  P.prototype.raw = function (d) { if (d) this.s.push(d); return this; };

  /* 모서리마다 반지름이 다른 둥근 네모(시계 방향). r = [왼위, 오른위, 오른아래, 왼아래] */
  function rrect(p, x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    var m = Math.min(w, h) / 2;
    var a = Math.min(r[0], m), b = Math.min(r[1], m), c = Math.min(r[2], m), d = Math.min(r[3], m);
    p.M(x + a, y).L(x + w - b, y);
    if (b) p.C(x + w - b + b * K, y, x + w, y + b - b * K, x + w, y + b);
    p.L(x + w, y + h - c);
    if (c) p.C(x + w, y + h - c + c * K, x + w - c + c * K, y + h, x + w - c, y + h);
    p.L(x + d, y + h);
    if (d) p.C(x + d - d * K, y + h, x, y + h - d + d * K, x, y + h - d);
    p.L(x, y + a);
    if (a) p.C(x, y + a - a * K, x + a - a * K, y, x + a, y);
    return p.Z();
  }
  /* 거꾸로 도는 둥근 네모(구멍) */
  function rrectRev(p, x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    var m = Math.min(w, h) / 2;
    var a = Math.min(r[0], m), b = Math.min(r[1], m), c = Math.min(r[2], m), d = Math.min(r[3], m);
    p.M(x + a, y);
    if (a) p.C(x + a - a * K, y, x, y + a - a * K, x, y + a);
    p.L(x, y + h - d);
    if (d) p.C(x, y + h - d + d * K, x + d - d * K, y + h, x + d, y + h);
    p.L(x + w - c, y + h);
    if (c) p.C(x + w - c + c * K, y + h, x + w, y + h - c + c * K, x + w, y + h - c);
    p.L(x + w, y + b);
    if (b) p.C(x + w, y + b - b * K, x + w - b + b * K, y, x + w - b, y);
    return p.Z();
  }
  function circle(p, cx, cy, r, rev) {
    var k = r * K;
    if (!rev) return p.M(cx, cy - r).C(cx + k, cy - r, cx + r, cy - k, cx + r, cy).C(cx + r, cy + k, cx + k, cy + r, cx, cy + r)
      .C(cx - k, cy + r, cx - r, cy + k, cx - r, cy).C(cx - r, cy - k, cx - k, cy - r, cx, cy - r).Z();
    return p.M(cx, cy - r).C(cx - k, cy - r, cx - r, cy - k, cx - r, cy).C(cx - r, cy + k, cx - k, cy + r, cx, cy + r)
      .C(cx + k, cy + r, cx + r, cy + k, cx + r, cy).C(cx + r, cy - k, cx + k, cy - r, cx, cy - r).Z();
  }
  /* 모서리를 잘라 낸 네모(팔각) */
  function cut(p, x, y, w, h, c, rev) {
    var pts = [[x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]];
    if (rev) pts.reverse();
    p.M(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) p.L(pts[i][0], pts[i][1]);
    return p.Z();
  }
  function diamond(p, cx, cy, rx, ry) { return p.M(cx, cy - ry).L(cx + rx, cy).L(cx, cy + ry).L(cx - rx, cy).Z(); }

  /* ---------- 점 모양 ---------- */
  var DOTS = ['square', 'rounded', 'dots', 'leaf', 'tile', 'hbar', 'vbar', 'diamond'];
  var EYE_OUT = ['square', 'rounded', 'circle', 'leaf', 'drop', 'cut'];
  var EYE_IN = ['square', 'rounded', 'circle', 'leaf', 'drop', 'diamond', 'cut'];
  var FRAMES = ['none', 'band', 'top', 'pill', 'bubble', 'ticket', 'circle', 'phone', 'corners', 'tag'];
  var MIN_FRAME_MARGIN = 2;

  function inFinder(x, y, n) {
    return (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  }

  function modulesPath(dark, n, style, ox, oy) {
    var p = new P(), E = 0.012;   // 이웃 칸과 맞닿는 곳에 머리카락 같은 틈이 보이지 않게 아주 조금 겹친다
    var D = function (x, y) { return x >= 0 && y >= 0 && x < n && y < n && dark[y * n + x] === 1; };
    var x, y;
    switch (style) {
      case 'square':
        for (y = 0; y < n; y++) {
          for (x = 0; x < n; x++) {
            if (!D(x, y)) continue;
            var s = x; while (D(x + 1, y)) x++;
            p.M(ox + s - E, oy + y - E).L(ox + x + 1 + E, oy + y - E).L(ox + x + 1 + E, oy + y + 1 + E).L(ox + s - E, oy + y + 1 + E).Z();
          }
        }
        break;
      case 'rounded':   // 이어진 둥근: 드러난 모서리만 둥글게(반지름 0.5칸)
      case 'leaf':      // 잎: 드러난 왼위·오른아래 모서리만 둥글게
        for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
          if (!D(x, y)) continue;
          var t = D(x, y - 1), b = D(x, y + 1), l = D(x - 1, y), r = D(x + 1, y), R = 0.5;
          var rad = [(!t && !l) ? R : 0, (!t && !r) ? R : 0, (!b && !r) ? R : 0, (!b && !l) ? R : 0];
          if (style === 'leaf') { rad[1] = 0; rad[3] = 0; }
          rrect(p, ox + x - (l ? E : 0), oy + y - (t ? E : 0), 1 + (l ? E : 0) + (r ? E : 0), 1 + (t ? E : 0) + (b ? E : 0), rad);
        }
        break;
      case 'dots':
        for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (D(x, y)) circle(p, ox + x + 0.5, oy + y + 0.5, 0.46);
        break;
      case 'tile':
        for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (D(x, y)) rrect(p, ox + x + 0.07, oy + y + 0.07, 0.86, 0.86, 0.24);
        break;
      case 'diamond':
        for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (D(x, y)) diamond(p, ox + x + 0.5, oy + y + 0.5, 0.62, 0.62);
        break;
      case 'hbar':
        for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
          if (!D(x, y)) continue;
          var hs = x; while (D(x + 1, y)) x++;
          rrect(p, ox + hs + 0.04, oy + y + 0.1, x - hs + 0.92, 0.8, 0.4);
        }
        break;
      case 'vbar':
        for (x = 0; x < n; x++) for (y = 0; y < n; y++) {
          if (!D(x, y)) continue;
          var vs = y; while (D(x, y + 1)) y++;
          rrect(p, ox + x + 0.1, oy + vs + 0.04, 0.8, y - vs + 0.92, 0.4);
        }
        break;
    }
    return p.d();
  }

  /* 눈 하나: 바깥 고리(7칸)와 가운데(3칸). corner = 0 왼위, 1 오른위, 2 왼아래 → '뾰족한 곳'이 QR 가운데를 보게 돌린다 */
  function eyeOuter(x, y, st, corner) {
    var p = new P();
    switch (st) {
      case 'square': rrect(p, x, y, 7, 7, 0); rrectRev(p, x + 1, y + 1, 5, 5, 0); break;
      case 'rounded': rrect(p, x, y, 7, 7, 2.2); rrectRev(p, x + 1, y + 1, 5, 5, 1.3); break;
      case 'circle': circle(p, x + 3.5, y + 3.5, 3.5); circle(p, x + 3.5, y + 3.5, 2.5, true); break;
      case 'leaf': rrect(p, x, y, 7, 7, [2.5, 0, 2.5, 0]); rrectRev(p, x + 1, y + 1, 5, 5, [1.6, 0, 1.6, 0]); break;
      case 'drop': {
        var o = [[2.5, 2.5, 0, 2.5], [2.5, 2.5, 2.5, 0], [2.5, 0, 2.5, 2.5]][corner], i = o.map(function (v) { return v ? 1.6 : 0; });
        rrect(p, x, y, 7, 7, o); rrectRev(p, x + 1, y + 1, 5, 5, i); break;
      }
      case 'cut': cut(p, x, y, 7, 7, 1.6); cut(p, x + 1, y + 1, 5, 5, 1.05, true); break;
    }
    return p.d();
  }
  function eyeInner(x, y, st, corner) {
    var p = new P(), cx = x + 3.5, cy = y + 3.5;
    switch (st) {
      case 'square': rrect(p, x + 2, y + 2, 3, 3, 0); break;
      case 'rounded': rrect(p, x + 2, y + 2, 3, 3, 0.9); break;
      case 'circle': circle(p, cx, cy, 1.5); break;
      case 'leaf': rrect(p, x + 2, y + 2, 3, 3, [1.5, 0, 1.5, 0]); break;
      case 'drop': rrect(p, x + 2, y + 2, 3, 3, [[1.5, 1.5, 0, 1.5], [1.5, 1.5, 1.5, 0], [1.5, 0, 1.5, 1.5]][corner]); break;
      case 'diamond': cut(p, x + 1.75, y + 1.75, 3.5, 3.5, 1.15); break;   // 눈 가운데 다이아: 꼭짓점을 깎은 팔각(가로·세로 3칸을 채워야 판독기가 눈으로 본다)
      case 'cut': cut(p, x + 2, y + 2, 3, 3, 0.8); break;
    }
    return p.d();
  }

  /* ---------- 색 ---------- */
  function hex(c) {
    c = String(c || '').trim().toLowerCase();
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(c);
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return '#' + h;
  }
  function rgb(c) { c = hex(c) || '#000000'; return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function lum(c) {
    var v = rgb(c).map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  function fillOf(style, kind, box) {
    var c1 = hex(style.fg) || '#000000';
    var eyes = style.eyeColor !== false;   // eyeColor 가 false 면 눈도 점 색을 따른다
    if (eyes && kind === 'eyeOut' && hex(style.eyeOut)) return { t: 's', c: hex(style.eyeOut) };
    if (eyes && kind === 'eyeIn' && hex(style.eyeIn)) return { t: 's', c: hex(style.eyeIn) };
    if (style.grad === 'linear' || style.grad === 'radial') {
      var c2 = hex(style.fg2) || c1, stops = [[0, c1], [1, c2]];
      if (style.grad === 'radial') {
        return { t: 'r', cx: box.x + box.s / 2, cy: box.y + box.s / 2, r: box.s * 0.72, a: stops };
      }
      var ang = ((+style.angle || 0) % 360) * Math.PI / 180, cx = box.x + box.s / 2, cy = box.y + box.s / 2, half = box.s / 2;
      var dx = Math.cos(ang) * half, dy = Math.sin(ang) * half;
      return { t: 'l', x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy, a: stops };
    }
    return { t: 's', c: c1 };
  }

  /* ---------- 틀 문구(글꼴 모양을 path 로) ---------- */
  /* glyphs = { em, asc, desc, g: { '글자': [나아감, 'path(글꼴 단위, y 위로)'] } }. 없는 글자는 건너뛰고 missing 에 담는다 */
  function textPath(glyphs, text, box) {
    var out = { d: '', missing: [], w: 0 };
    if (!glyphs || !text) return out;
    var chars = Array.from ? Array.from(text) : text.split(''), adv = 0, list = [];
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i], g = glyphs.g[ch];
      if (!g) { if (ch === ' ' || ch === '　') { list.push([glyphs.em * 0.28, '']); adv += glyphs.em * 0.28; } else out.missing.push(ch); continue; }
      list.push(g); adv += g[0];
    }
    if (!adv) return out;
    var hgt = glyphs.asc - glyphs.desc, s = Math.min(box.h / hgt, box.w / adv);
    var x0 = box.x + (box.w - adv * s) / 2, base = box.y + (box.h - hgt * s) / 2 + glyphs.asc * s, p = [];
    list.forEach(function (g) {
      if (g[1]) p.push(g[1].replace(/([MLQCZ])([^MLQCZ]*)/g, function (_, c, nums) {
        if (c === 'Z') return 'Z';
        var v = nums.trim().split(/[\s,]+/).map(Number), o = [];
        for (var k = 0; k < v.length; k += 2) o.push(f(x0 + v[k] * s) + ' ' + f(base - v[k + 1] * s));
        return c + o.join(' ');
      }));
      x0 += g[0] * s;
    });
    out.d = p.join('');
    out.w = adv * s;
    return out;
  }

  /* ---------- 틀(스티커 모양) ---------- */
  /* QR(여백 포함) 한 변 N 칸을 받아 틀의 크기·QR 자리·틀 모양·글 자리를 돌려준다 */
  function frameGeo(kind, N) {
    var g = { W: N, H: N, qx: 0, qy: 0, frame: '', body: '', outline: '', text: null, textOn: 'frame', extra: [] };
    var p, b, band, r;
    switch (kind) {
      case 'band': case 'top': {
        b = N * 0.055; band = N * 0.26; r = N * 0.075;
        g.W = N + 2 * b; g.H = N + 2 * b + band - b;
        var top = kind === 'top';
        g.qx = b; g.qy = top ? band : b;
        g.frame = rrect(new P(), 0, 0, g.W, g.H, r).d();
        g.body = rrect(new P(), g.qx, g.qy, N, N, r * 0.55).d();
        g.text = { x: b * 2, y: top ? band * 0.2 : g.qy + N + band * 0.14, w: g.W - b * 4, h: band * 0.58 };
        g.outline = g.frame;
        break;
      }
      case 'pill': {
        b = N * 0.03; var gap = N * 0.06, ph = N * 0.2;
        g.W = N + 2 * b; g.H = N + 2 * b + gap + ph;
        g.qx = b; g.qy = b;
        var box = rrect(new P(), 0, 0, g.W, N + 2 * b, N * 0.07).d();
        var pw = g.W * 0.8, pill = rrect(new P(), (g.W - pw) / 2, N + 2 * b + gap, pw, ph, ph / 2).d();
        g.frame = box + pill;
        g.body = rrect(new P(), b, b, N, N, N * 0.05).d();
        g.text = { x: (g.W - pw) / 2 + ph * 0.45, y: N + 2 * b + gap + ph * 0.22, w: pw - ph * 0.9, h: ph * 0.56 };
        g.outline = g.frame;
        break;
      }
      case 'bubble': {
        b = N * 0.03; var bh = N * 0.22, tip = N * 0.07, gp = N * 0.02;
        g.W = N + 2 * b; g.H = bh + tip + gp + N + 2 * b;
        g.qx = b; g.qy = bh + tip + gp + b;
        p = new P();
        var bw = g.W * 0.86, bx = (g.W - bw) / 2, rr = bh * 0.32, cx = g.W / 2;
        // 말풍선: 둥근 네모 + 아래 꼬리(한 path, 시계 방향)
        p.M(bx + rr, 0).L(bx + bw - rr, 0).C(bx + bw - rr + rr * K, 0, bx + bw, rr - rr * K, bx + bw, rr).L(bx + bw, bh - rr)
          .C(bx + bw, bh - rr + rr * K, bx + bw - rr + rr * K, bh, bx + bw - rr, bh).L(cx + tip, bh).L(cx, bh + tip).L(cx - tip, bh).L(bx + rr, bh)
          .C(bx + rr - rr * K, bh, bx, bh - rr + rr * K, bx, bh - rr).L(bx, rr).C(bx, rr - rr * K, bx + rr - rr * K, 0, bx + rr, 0).Z();
        var qbox = rrect(new P(), 0, g.qy - b, g.W, N + 2 * b, N * 0.07).d();
        g.frame = p.d() + qbox;
        g.body = rrect(new P(), g.qx, g.qy, N, N, N * 0.05).d();
        g.text = { x: bx + bh * 0.4, y: bh * 0.2, w: bw - bh * 0.8, h: bh * 0.6 };
        g.outline = g.frame;
        break;
      }
      case 'ticket': {
        b = N * 0.05; var stub = N * 0.26, nr = N * 0.05;
        g.W = N + 2 * b; g.H = N + 2 * b + stub;
        g.qx = b; g.qy = b;
        r = N * 0.06;
        var ly = N + 2 * b;   // 점선 자리(양옆 반원 홈)
        p = new P();
        p.M(r, 0).L(g.W - r, 0).C(g.W - r + r * K, 0, g.W, r - r * K, g.W, r).L(g.W, ly - nr)
          .C(g.W - nr * K, ly - nr, g.W - nr, ly - nr * K, g.W - nr, ly).C(g.W - nr, ly + nr * K, g.W - nr * K, ly + nr, g.W, ly + nr)
          .L(g.W, g.H - r).C(g.W, g.H - r + r * K, g.W - r + r * K, g.H, g.W - r, g.H).L(r, g.H).C(r - r * K, g.H, 0, g.H - r + r * K, 0, g.H - r)
          .L(0, ly + nr).C(nr * K, ly + nr, nr, ly + nr * K, nr, ly).C(nr, ly - nr * K, nr * K, ly - nr, 0, ly - nr).L(0, r).C(0, r - r * K, r - r * K, 0, r, 0).Z();
        g.frame = p.d();
        g.body = rrect(new P(), g.qx, g.qy, N, N, N * 0.04).d();
        // 점선: 작은 네모들(바탕색)
        var dash = new P(), dw = N * 0.035, dx = nr * 1.6;
        for (; dx + dw < g.W - nr * 1.6; dx += dw * 2) dash.M(dx, ly - N * 0.006).L(dx + dw, ly - N * 0.006).L(dx + dw, ly + N * 0.006).L(dx, ly + N * 0.006).Z();
        g.extra.push({ d: dash.d(), on: 'body' });
        g.text = { x: b * 2, y: ly + stub * 0.2, w: g.W - b * 4, h: stub * 0.58 };
        g.outline = g.frame;
        break;
      }
      case 'circle': {
        var R = N * 0.78; b = N * 0.045;
        var Ri = R - b, s = N / 2, yt = -Math.sqrt(Ri * Ri - s * s) + N * 0.005, yb = yt + N;
        g.W = g.H = 2 * R;
        g.qx = R - s; g.qy = R + yt;
        g.frame = circle(new P(), R, R, R).d();
        g.body = circle(new P(), R, R, Ri).d();
        var ty = R + yb + N * 0.025, th = Math.min(N * 0.13, R + Ri - ty - N * 0.06);
        var half = Math.sqrt(Math.max(0, Ri * Ri - Math.pow(ty + th - R, 2)));
        g.text = { x: R - half * 0.86, y: ty, w: half * 1.72, h: th };
        g.textOn = 'body';
        g.outline = g.frame;
        break;
      }
      case 'phone': {
        b = N * 0.07; var topb = N * 0.17, chin = N * 0.27;
        g.W = N + 2 * b; g.H = topb + N + chin;
        g.qx = b; g.qy = topb;
        g.frame = rrect(new P(), 0, 0, g.W, g.H, N * 0.16).d();
        g.body = rrect(new P(), b * 0.6, topb * 0.62, g.W - b * 1.2, N + topb * 0.38 + N * 0.03, N * 0.05).d();
        g.extra.push({ d: rrect(new P(), g.W * 0.38, topb * 0.25, g.W * 0.24, topb * 0.16, topb * 0.08).d(), on: 'body' });
        g.text = { x: b * 1.4, y: topb + N + N * 0.06, w: g.W - b * 2.8, h: chin * 0.5 };
        g.outline = g.frame;
        break;
      }
      case 'corners': {
        var o = N * 0.07, L = N * 0.2, t = N * 0.035, th2 = N * 0.15;
        g.W = N + 2 * o; g.H = N + 2 * o + th2 + N * 0.03;
        g.qx = o; g.qy = o;
        g.body = rrect(new P(), 0, 0, g.W, g.H, N * 0.06).d();
        p = new P();
        var cs = [[0, 0, 1, 1], [g.W, 0, -1, 1], [0, N + 2 * o, 1, -1], [g.W, N + 2 * o, -1, -1]];
        cs.forEach(function (c) {
          var X = c[0], Y = c[1], sx = c[2], sy = c[3], ii = t * 0.9;
          var pts = [[X + sx * ii, Y + sy * ii], [X + sx * (ii + L), Y + sy * ii], [X + sx * (ii + L), Y + sy * (ii + t)], [X + sx * (ii + t), Y + sy * (ii + t)], [X + sx * (ii + t), Y + sy * (ii + L)], [X + sx * ii, Y + sy * (ii + L)]];
          if (sx * sy < 0) pts.reverse();
          p.M(pts[0][0], pts[0][1]); for (var k = 1; k < pts.length; k++) p.L(pts[k][0], pts[k][1]); p.Z();
        });
        g.frame = p.d();
        g.frameOver = true;   // 바탕 위에 그린다
        g.text = { x: o, y: N + 2 * o, w: N, h: th2 };
        g.textOn = 'body';
        g.outline = g.body;
        break;
      }
      case 'tag': {
        b = N * 0.05; var head = N * 0.2, foot = N * 0.24, hr = N * 0.045;
        g.W = N + 2 * b; g.H = head + N + foot;
        g.qx = b; g.qy = head;
        var ch = head * 0.85;
        p = new P();
        r = N * 0.05;
        p.M(ch, 0).L(g.W - ch, 0).L(g.W, ch).L(g.W, g.H - r).C(g.W, g.H - r + r * K, g.W - r + r * K, g.H, g.W - r, g.H).L(r, g.H).C(r - r * K, g.H, 0, g.H - r + r * K, 0, g.H - r).L(0, ch).Z();
        circle(p, g.W / 2, head * 0.48, hr, true);   // 끈 구멍(뚫림)
        g.frame = p.d();
        g.body = rrect(new P(), g.qx, g.qy, N, N, N * 0.04).d();
        g.text = { x: b * 2, y: head + N + foot * 0.18, w: g.W - b * 4, h: foot * 0.56 };
        g.outline = g.frame;
        g.holeRule = true;
        break;
      }
      default:
        g.body = rrect(new P(), 0, 0, N, N, 0).d();
        g.outline = g.body;
    }
    return g;
  }

  /* ---------- 로고 자리 ---------- */
  /* 로고 상자 크기(칸): QR 한 변(여백 제외)의 frac. 지울 칸은 상자 + 둘레 0.5칸, 눈과 겹치는 칸은 지우지 않는다 */
  function logoBox(n, frac) {
    var s = Math.max(1, n * frac), x = (n - s) / 2;
    return { x: x, y: x, s: s };
  }

  function scene(qr, st, glyphs) {
    st = st || {};
    var n = qr.size, m = Math.max(0, Math.min(10, Math.round(st.margin == null ? 4 : st.margin)));
    // 틀이 있으면 QR 둘레에 바탕색 띠를 2칸 이상 둔다(틀의 진한 띠가 무늬에 바로 붙으면 판독기가 못 읽는다: 제3자 평가 H1)
    var frameKind0 = FRAMES.indexOf(st.frame) >= 0 ? st.frame : 'none', mAsked = m;
    if (frameKind0 !== 'none' && m < MIN_FRAME_MARGIN) m = MIN_FRAME_MARGIN;
    var N = n + 2 * m, mods = qr.modules;
    var dark = new Uint8Array(n * n);
    var x, y;
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (mods[y * n + x] && !inFinder(x, y, n)) dark[y * n + x] = 1;
    var logo = st.logo && st.logo.src ? st.logo : null, lb = null, cleared = 0;
    if (logo) {
      lb = logoBox(n, Math.max(0.08, Math.min(0.34, +logo.size || 0.22)));
      if (logo.clear !== false) {
        var pad = 0.5, x0 = Math.floor(lb.x - pad), x1 = Math.ceil(lb.x + lb.s + pad), y0 = Math.floor(lb.y - pad), y1 = Math.ceil(lb.y + lb.s + pad);
        for (y = Math.max(0, y0); y < Math.min(n, y1); y++) for (x = Math.max(0, x0); x < Math.min(n, x1); x++) {
          if (inFinder(x, y, n)) continue;
          if (mods[y * n + x]) cleared++;
          dark[y * n + x] = 0;
          if (lb.cx0 == null) { lb.cx0 = x; lb.cy0 = y; }
          lb.cx1 = x + 1; lb.cy1 = y + 1;
        }
      }
    }
    var frameKind = FRAMES.indexOf(st.frame) >= 0 ? st.frame : 'none';
    var hasText = frameKind !== 'none' && String(st.frameText || '').trim();
    var g = frameGeo(frameKind, N);
    if (frameKind !== 'none' && !hasText && g.text && frameKind !== 'corners') { /* 문구가 비어도 틀 모양은 그대로 */ }
    var ox = g.qx + m, oy = g.qy + m;
    var box = { x: ox, y: oy, s: n };
    // 바탕 투명은 틀이 없을 때(또는 모서리 틀)만 투명이다. 틀이 QR 을 감싸는 모양이면 QR 칸은 바탕색을 깐다
    // (투명하게 두면 QR 이 진한 틀 색 위에 놓여 읽히지 않는다: 시험 design 에서 찾은 것)
    var clear = st.transparent && (frameKind === 'none' || frameKind === 'corners');
    var shapes = [], bgc = clear ? null : (hex(st.bg) || '#ffffff'), frc = hex(st.frameColor) || '#111111';
    // 1) 틀(틀 색)
    if (g.frame && !g.frameOver) shapes.push({ d: g.frame, fill: { t: 's', c: frc }, rule: g.holeRule ? 'evenodd' : 'nonzero', role: 'frame' });
    // 2) 바탕(바탕색 — 투명이면 없음)
    if (bgc) shapes.push({ d: g.body, fill: { t: 's', c: bgc }, rule: 'nonzero', role: 'bg' });
    if (g.frame && g.frameOver) shapes.push({ d: g.frame, fill: { t: 's', c: frc }, rule: 'nonzero', role: 'frame' });
    g.extra.forEach(function (e) { shapes.push({ d: e.d, fill: { t: 's', c: e.on === 'body' ? (bgc || '#ffffff') : frc }, rule: 'nonzero', role: 'deco' }); });
    // 3) 점
    var dotStyle = DOTS.indexOf(st.dots) >= 0 ? st.dots : 'square';
    var md = modulesPath(dark, n, dotStyle, ox, oy);
    if (md) shapes.push({ d: md, fill: fillOf(st, 'dots', box), rule: 'nonzero', role: 'dots' });
    // 4) 눈
    var eo = EYE_OUT.indexOf(st.eyeOuter) >= 0 ? st.eyeOuter : 'square', ei = EYE_IN.indexOf(st.eyeInner) >= 0 ? st.eyeInner : 'square';
    var eyes = [[0, 0], [n - 7, 0], [0, n - 7]], dOut = '', dIn = '';
    eyes.forEach(function (e, i) { dOut += eyeOuter(ox + e[0], oy + e[1], eo, i); dIn += eyeInner(ox + e[0], oy + e[1], ei, i); });
    shapes.push({ d: dOut, fill: fillOf(st, 'eyeOut', box), rule: 'nonzero', role: 'eyeOut' });
    shapes.push({ d: dIn, fill: fillOf(st, 'eyeIn', box), rule: 'nonzero', role: 'eyeIn' });
    // 5) 로고
    var images = [];
    if (logo && lb) {
      if (logo.plate && bgc) {
        var pp = 0.35;
        shapes.push({ d: rrect(new P(), ox + lb.x - pp, oy + lb.y - pp, lb.s + 2 * pp, lb.s + 2 * pp, lb.s * 0.18).d(), fill: { t: 's', c: bgc }, rule: 'nonzero', role: 'plate' });
      }
      var iw = lb.s, ih = lb.s, ar = (logo.w && logo.h) ? logo.w / logo.h : 1;
      if (ar > 1) ih = lb.s / ar; else iw = lb.s * ar;
      images.push({ x: ox + lb.x + (lb.s - iw) / 2, y: oy + lb.y + (lb.s - ih) / 2, w: iw, h: ih, src: logo.src, iw: logo.w, ih: logo.h });
    }
    // 6) 틀 문구
    var missing = [];
    if (hasText && g.text) {
      var tp = textPath(glyphs, String(st.frameText).trim(), g.text);
      missing = tp.missing;
      var tc = g.textOn === 'body' ? frc : (hex(st.frameTextColor) || '#ffffff');
      if (tp.d) shapes.push({ d: tp.d, fill: { t: 's', c: tc }, rule: 'nonzero', role: 'text' });
    }
    var total = 0;
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (!inFinder(x, y, n)) total++;
    return {
      W: g.W, H: g.H, outline: g.outline, shapes: shapes, images: images,
      qr: { x: g.qx, y: g.qy, size: N, n: n, margin: m, asked: mAsked, ox: ox, oy: oy },
      frame: frameKind, needsGlyphs: !!(hasText && !glyphs), textMissing: missing,
      logo: lb ? { frac: lb.s / n, cleared: cleared, clearedFrac: cleared / Math.max(1, total), areaFrac: (lb.cx1 != null ? (lb.cx1 - lb.cx0) * (lb.cy1 - lb.cy0) : lb.s * lb.s) / (n * n) } : null,
      bg: bgc, transparent: clear, version: qr.version, ecl: qr.ecl
    };
  }

  /* ---------- SVG ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function toSVG(sc, opt) {
    opt = opt || {};
    var unit = opt.px ? opt.px / Math.max(sc.W, sc.H) : 10, w = f(sc.W * unit), h = f(sc.H * unit);
    var defs = '', body = '', gid = opt.idp || 'g';
    sc.shapes.forEach(function (s, i) {
      var fill;
      if (s.fill.t === 's') fill = s.fill.c;
      else {
        var id = gid + i, stops = s.fill.a.map(function (a) { return '<stop offset="' + a[0] + '" stop-color="' + a[1] + '"/>'; }).join('');
        if (s.fill.t === 'l') defs += '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + f(s.fill.x1) + '" y1="' + f(s.fill.y1) + '" x2="' + f(s.fill.x2) + '" y2="' + f(s.fill.y2) + '">' + stops + '</linearGradient>';
        else defs += '<radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" cx="' + f(s.fill.cx) + '" cy="' + f(s.fill.cy) + '" r="' + f(s.fill.r) + '">' + stops + '</radialGradient>';
        fill = 'url(#' + id + ')';
      }
      body += '<path' + (opt.roles ? ' data-r="' + s.role + '"' : '') + ' d="' + s.d + '" fill="' + fill + '"' + (s.rule === 'evenodd' ? ' fill-rule="evenodd"' : '') + '/>';
    });
    sc.images.forEach(function (im) {
      body += '<image x="' + f(im.x) + '" y="' + f(im.y) + '" width="' + f(im.w) + '" height="' + f(im.h) + '" href="' + esc(im.src) + '" preserveAspectRatio="xMidYMid meet"/>';
    });
    var vb = '0 0 ' + f(sc.W) + ' ' + f(sc.H);
    if (opt.cut) {   // 미리보기의 다이컷 스티커: 틀 모양 둘레에 흰 칼선 여백(cut 칸)
      var c = opt.cut;
      vb = f(-c) + ' ' + f(-c) + ' ' + f(sc.W + 2 * c) + ' ' + f(sc.H + 2 * c);
      body = '<path class="cut" d="' + sc.outline + '" stroke-width="' + f(2 * c) + '" stroke-linejoin="round"/>' + body;
    }
    var attrs = opt.bare ? '' : ' xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"';
    return '<svg' + attrs + ' viewBox="' + vb + '"' + (opt.cls ? ' class="' + opt.cls + '"' : '') + (opt.aria ? ' role="img" aria-label="' + esc(opt.aria) + '"' : '') + '>' +
      (opt.title ? '<title>' + esc(opt.title) + '</title>' : '') + (defs ? '<defs>' + defs + '</defs>' : '') + body + '</svg>';
  }

  /* ---------- 캔버스(PNG·JPG·찍힘 확인) ---------- */
  /* imgs = { src: HTMLImageElement } 미리 불러 둔 로고. px = 긴 변의 픽셀. under = 투명 대신 깔 색(JPG·찍힘 확인) */
  function toCanvas(sc, cv, px, imgs, under) {
    var s = px / Math.max(sc.W, sc.H), W = Math.max(1, Math.round(sc.W * s)), H = Math.max(1, Math.round(sc.H * s));
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    if (under) { c.fillStyle = under; c.fillRect(0, 0, W, H); }
    c.setTransform(s, 0, 0, s, 0, 0);
    sc.shapes.forEach(function (sh) {
      var fs;
      if (sh.fill.t === 's') fs = sh.fill.c;
      else {
        fs = sh.fill.t === 'l' ? c.createLinearGradient(sh.fill.x1, sh.fill.y1, sh.fill.x2, sh.fill.y2) : c.createRadialGradient(sh.fill.cx, sh.fill.cy, 0, sh.fill.cx, sh.fill.cy, sh.fill.r);
        sh.fill.a.forEach(function (a) { fs.addColorStop(a[0], a[1]); });
      }
      c.fillStyle = fs;
      c.fill(new Path2D(sh.d), sh.rule === 'evenodd' ? 'evenodd' : 'nonzero');
    });
    sc.images.forEach(function (im) {
      var el = imgs && imgs[im.src];
      if (el) { c.imageSmoothingQuality = 'high'; c.drawImage(el, im.x, im.y, im.w, im.h); }
    });
    c.setTransform(1, 0, 0, 1, 0, 0);
    return cv;
  }

  /* ---------- path 글 읽기(PDF·EPS 로 옮길 때) ---------- */
  /* → [[op, ...수]] op = M L C Z (Q 는 C 로 바꾼다) */
  function parse(d) {
    var out = [], re = /([MLCQZ])([^MLCQZ]*)/g, mm, cx = 0, cy = 0, sx = 0, sy = 0;
    while ((mm = re.exec(d))) {
      var op = mm[1], v = mm[2].trim() ? mm[2].trim().split(/[\s,]+/).map(Number) : [];
      if (op === 'M') { for (var i = 0; i < v.length; i += 2) { if (i === 0) { out.push(['M', v[0], v[1]]); sx = v[0]; sy = v[1]; } else out.push(['L', v[i], v[i + 1]]); cx = v[i]; cy = v[i + 1]; } }
      else if (op === 'L') { for (i = 0; i < v.length; i += 2) { out.push(['L', v[i], v[i + 1]]); cx = v[i]; cy = v[i + 1]; } }
      else if (op === 'C') { for (i = 0; i < v.length; i += 6) { out.push(['C', v[i], v[i + 1], v[i + 2], v[i + 3], v[i + 4], v[i + 5]]); cx = v[i + 4]; cy = v[i + 5]; } }
      else if (op === 'Q') {
        for (i = 0; i < v.length; i += 4) {
          var qx = v[i], qy = v[i + 1], ex = v[i + 2], ey = v[i + 3];
          out.push(['C', cx + 2 / 3 * (qx - cx), cy + 2 / 3 * (qy - cy), ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey), ex, ey]);
          cx = ex; cy = ey;
        }
      } else { out.push(['Z']); cx = sx; cy = sy; }
    }
    return out;
  }

  /* 예시용 가짜 무늬: 눈·타이밍은 그대로 두고 나머지 칸을 섞어 찍어도 읽히지 않게(화면을 캡처해 써도 엉뚱한 곳으로 가지 않게) */
  function fake(qr) {
    var n = qr.size, mods = new Uint8Array(qr.modules), seed = 20261014;
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      if (inFinder(x, y, n) || x === 6 || y === 6 || (x < 9 && y < 9) || (x < 9 && y >= n - 8) || (x >= n - 8 && y < 9)) continue;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (seed % 3 === 0) mods[y * n + x] ^= 1;
    }
    // 형식 정보 칸도 비워 판독기가 형식을 못 읽게
    for (var k = 0; k < 9; k++) { mods[8 * n + k] = 0; mods[k * n + 8] = 0; mods[8 * n + n - 1 - k] = 0; mods[(n - 1 - k) * n + 8] = 0; }
    return { version: qr.version, ecl: qr.ecl, mask: qr.mask, size: n, modules: mods, bytes: qr.bytes, fake: true };
  }

  var QRR = { fake: fake, MIN_FRAME_MARGIN: MIN_FRAME_MARGIN, _modules: modulesPath, _eyeOuter: eyeOuter, _eyeInner: eyeInner, _frameGeo: frameGeo, DOTS: DOTS, EYE_OUT: EYE_OUT, EYE_IN: EYE_IN, FRAMES: FRAMES, scene: scene, toSVG: toSVG, toCanvas: toCanvas, parse: parse, hex: hex, rgb: rgb, lum: lum, contrast: contrast, textPath: textPath, f: f };
  if (typeof module !== 'undefined' && module.exports) module.exports = QRR;
  else root.QRR = QRR;
})(typeof self !== 'undefined' ? self : this);
