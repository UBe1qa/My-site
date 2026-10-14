/* QR 코드 만드는 부분 (외부 라이브러리 없음)
   - 글자를 UTF-8 바이트로 바꿔 '바이트 모드'로 담아요. 인터넷 주소·한글 모두 됨
   - 버전 1~40, 오류 복원 L(7%)·M(15%)·Q(25%)·H(30%)
   - 표준(ISO/IEC 18004) 순서: 데이터 → 오류 복원 코드 → 칸 배치 → 마스크 → 형식 정보
   쓰는 법: QR.encode('https://example.com', { ecl: 'M' })
     → { version, ecl, mask, size, modules(Uint8Array, 1=검은 칸), bytes } */
(function (root) {
  'use strict';

  // 블록 하나에 붙는 오류 복원 코드 개수 [버전 1~40] (0번 칸은 안 씀)
  var ECC = {
    L: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  };
  // 데이터를 나누는 블록 개수 [버전 1~40]
  var BLOCKS = {
    L: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  };
  var FORMAT_ECL = { L: 1, M: 0, Q: 3, H: 2 };
  var ORDER = ['L', 'M', 'Q', 'H'];

  // ---- 갈루아체 GF(256) 곱셈표 (오류 복원 코드 계산용) ----
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  var genCache = {};
  function rsGenerator(degree) {
    if (genCache[degree]) return genCache[degree];
    var g = [1];
    for (var i = 0; i < degree; i++) {
      var next = [];
      for (var k = 0; k <= g.length; k++) next.push(0);
      for (var j = 0; j < g.length; j++) {
        next[j] ^= g[j];
        next[j + 1] ^= gmul(g[j], EXP[i]);
      }
      g = next;
    }
    genCache[degree] = g;
    return g;
  }
  function rsRemainder(data, degree) {
    var g = rsGenerator(degree);
    var rem = [];
    for (var k = 0; k < degree; k++) rem.push(0);
    for (var i = 0; i < data.length; i++) {
      var f = data[i] ^ rem.shift();
      rem.push(0);
      if (f !== 0) for (var j = 0; j < degree; j++) rem[j] ^= gmul(g[j + 1], f);
    }
    return rem;
  }

  // 버전별로 데이터를 담을 수 있는 칸 수 (패턴 자리 뺀 나머지)
  function rawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var n = Math.floor(ver / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function dataCodewords(ver, ecl) {
    return Math.floor(rawModules(ver) / 8) - ECC[ecl][ver] * BLOCKS[ecl][ver];
  }
  function alignPositions(ver) {
    if (ver === 1) return [];
    var n = Math.floor(ver / 7) + 2;
    var step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    var res = [6];
    for (var p = ver * 4 + 10; res.length < n; p -= step) res.splice(1, 0, p);
    return res;
  }

  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return Array.prototype.slice.call(new TextEncoder().encode(str));
    var s = unescape(encodeURIComponent(str)), out = [];
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }
  function bitsFor(ver, len) { return 4 + (ver <= 9 ? 8 : 16) + len * 8; }

  // 담을 수 있는 최대 바이트 수 (오류 복원 단계별)
  function maxBytes(ecl) {
    var cap = dataCodewords(40, ecl) * 8;
    return Math.floor((cap - 4 - 16) / 8);
  }

  function maskHit(m, x, y) {
    switch (m) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return (x * y) % 2 + (x * y) % 3 === 0;
      case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
      default: return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
    }
  }

  // 마스크 고르기용 점수 (낮을수록 스캐너가 읽기 좋음)
  function penalty(mod, size) {
    var score = 0, x, y, i, c, prev, run;
    // 1) 같은 색이 5칸 이상 이어짐
    for (y = 0; y < size; y++) {
      prev = -1; run = 0;
      for (x = 0; x < size; x++) {
        c = mod[y * size + x];
        if (c === prev) run++;
        else { if (run >= 5) score += run - 2; prev = c; run = 1; }
      }
      if (run >= 5) score += run - 2;
    }
    for (x = 0; x < size; x++) {
      prev = -1; run = 0;
      for (y = 0; y < size; y++) {
        c = mod[y * size + x];
        if (c === prev) run++;
        else { if (run >= 5) score += run - 2; prev = c; run = 1; }
      }
      if (run >= 5) score += run - 2;
    }
    // 2) 2×2 같은 색 덩어리
    for (y = 0; y < size - 1; y++) {
      for (x = 0; x < size - 1; x++) {
        c = mod[y * size + x];
        if (c === mod[y * size + x + 1] && c === mod[(y + 1) * size + x] && c === mod[(y + 1) * size + x + 1]) score += 3;
      }
    }
    // 3) 모서리 네모(파인더)와 닮은 1:1:3:1:1 무늬 + 앞이나 뒤로 밝은 4칸
    function lightRow(yy, from, to) {
      for (var k = Math.max(from, 0); k < Math.min(to, size); k++) if (mod[yy * size + k]) return false;
      return true;
    }
    function lightCol(xx, from, to) {
      for (var k = Math.max(from, 0); k < Math.min(to, size); k++) if (mod[k * size + xx]) return false;
      return true;
    }
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        var o = y * size;
        if (x + 6 < size && mod[o + x] && !mod[o + x + 1] && mod[o + x + 2] && mod[o + x + 3] && mod[o + x + 4] && !mod[o + x + 5] && mod[o + x + 6] &&
          (lightRow(y, x - 4, x) || lightRow(y, x + 7, x + 11))) score += 40;
        if (y + 6 < size && mod[y * size + x] && !mod[(y + 1) * size + x] && mod[(y + 2) * size + x] && mod[(y + 3) * size + x] && mod[(y + 4) * size + x] && !mod[(y + 5) * size + x] && mod[(y + 6) * size + x] &&
          (lightCol(x, y - 4, y) || lightCol(x, y + 7, y + 11))) score += 40;
      }
    }
    // 4) 검은 칸 비율이 50%에서 멀어질수록
    var dark = 0, total = size * size;
    for (i = 0; i < total; i++) dark += mod[i];
    score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
    return score;
  }

  function encode(text, opt) {
    opt = opt || {};
    var bytes = utf8(String(text));
    var ecl = opt.ecl || 'M';
    var ver = opt.version || 0;
    if (!ver) {
      for (var v = opt.minVersion || 1; v <= 40; v++) {
        if (bitsFor(v, bytes.length) <= dataCodewords(v, ecl) * 8) { ver = v; break; }
      }
    }
    if (!ver || bitsFor(ver, bytes.length) > dataCodewords(ver, ecl) * 8) {
      var err = new Error('QR에 담기엔 너무 길어요');
      err.code = 'TOO_LONG';
      err.max = maxBytes(ecl);
      err.bytes = bytes.length;
      throw err;
    }
    // 같은 크기 안에서 더 튼튼하게 담을 수 있으면 올림
    if (opt.boost !== false) {
      for (var e = ORDER.indexOf(ecl) + 1; e < ORDER.length; e++) {
        if (bitsFor(ver, bytes.length) <= dataCodewords(ver, ORDER[e]) * 8) ecl = ORDER[e];
      }
    }

    // ---- 1. 데이터 비트 ----
    var bits = [];
    function push(val, len) { for (var k = len - 1; k >= 0; k--) bits.push((val >>> k) & 1); }
    push(4, 4);                                   // 바이트 모드
    push(bytes.length, ver <= 9 ? 8 : 16);        // 글자 수
    for (var i = 0; i < bytes.length; i++) push(bytes[i], 8);
    var cap = dataCodewords(ver, ecl) * 8;
    push(0, Math.min(4, cap - bits.length));      // 끝 표시
    push(0, (8 - bits.length % 8) % 8);           // 바이트 맞춤
    var data = [];
    for (i = 0; i < bits.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      data.push(b);
    }
    for (var pad = 0xec; data.length < cap / 8; pad ^= 0xec ^ 0x11) data.push(pad);

    // ---- 2. 블록으로 나누고 오류 복원 코드 붙여 섞기 ----
    var nb = BLOCKS[ecl][ver], ne = ECC[ecl][ver];
    var raw = Math.floor(rawModules(ver) / 8);
    var numShort = nb - raw % nb;
    var shortLen = Math.floor(raw / nb);
    var blocks = [], eccs = [], pos = 0;
    for (var bi = 0; bi < nb; bi++) {
      var dlen = shortLen - ne + (bi < numShort ? 0 : 1);
      var blk = data.slice(pos, pos + dlen);
      pos += dlen;
      blocks.push(blk);
      eccs.push(rsRemainder(blk, ne));
    }
    var words = [];
    for (i = 0; i <= shortLen - ne; i++) {
      for (bi = 0; bi < nb; bi++) if (i < blocks[bi].length) words.push(blocks[bi][i]);
    }
    for (i = 0; i < ne; i++) for (bi = 0; bi < nb; bi++) words.push(eccs[bi][i]);

    // ---- 3. 칸 그리기 ----
    var size = ver * 4 + 17;
    var mod = new Uint8Array(size * size);  // 1 = 검은 칸
    var fn = new Uint8Array(size * size);   // 1 = 고정 무늬 칸
    function set(x, y, dark) { mod[y * size + x] = dark ? 1 : 0; fn[y * size + x] = 1; }

    for (i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); } // 타이밍
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          var d = Math.max(Math.abs(dx), Math.abs(dy));
          set(x, y, d !== 2 && d !== 4);
        }
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var al = alignPositions(ver), na = al.length;
    for (i = 0; i < na; i++) {
      for (j = 0; j < na; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
        for (var ay = -2; ay <= 2; ay++) {
          for (var ax = -2; ax <= 2; ax++) set(al[i] + ax, al[j] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
        }
      }
    }
    function drawFormat(m) {
      var d = (FORMAT_ECL[ecl] << 3) | m, r = d;
      for (var k = 0; k < 10; k++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var fb = ((d << 10) | r) ^ 0x5412;
      function bit(n) { return ((fb >>> n) & 1) !== 0; }
      for (k = 0; k <= 5; k++) set(8, k, bit(k));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (k = 9; k < 15; k++) set(14 - k, 8, bit(k));
      for (k = 0; k < 8; k++) set(size - 1 - k, 8, bit(k));
      for (k = 8; k < 15; k++) set(8, size - 15 + k, bit(k));
      set(8, size - 8, true);
    }
    drawFormat(0); // 자리만 먼저 잡아 둠
    if (ver >= 7) {
      var r2 = ver;
      for (var k = 0; k < 12; k++) r2 = (r2 << 1) ^ ((r2 >>> 11) * 0x1f25);
      var vb = (ver << 12) | r2;
      for (k = 0; k < 18; k++) {
        var dark = ((vb >>> k) & 1) !== 0;
        var aa = size - 11 + k % 3, bb = Math.floor(k / 3);
        set(aa, bb, dark); set(bb, aa, dark);
      }
    }

    // ---- 4. 데이터 칸을 지그재그로 채우기 ----
    var n = 0, total = words.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var jj = 0; jj < 2; jj++) {
          var x = right - jj;
          var up = ((right + 1) & 2) === 0;
          var y = up ? size - 1 - vert : vert;
          if (!fn[y * size + x] && n < total) {
            mod[y * size + x] = (words[n >>> 3] >>> (7 - (n & 7))) & 1;
            n++;
          }
        }
      }
    }

    // ---- 5. 마스크 (읽기 좋은 무늬로 뒤섞기) ----
    function applyMask(m) {
      for (var yy = 0; yy < size; yy++) {
        for (var xx = 0; xx < size; xx++) {
          if (!fn[yy * size + xx] && maskHit(m, xx, yy)) mod[yy * size + xx] ^= 1;
        }
      }
    }
    var mask = (typeof opt.mask === 'number' && opt.mask >= 0) ? opt.mask : -1;
    if (mask < 0) {
      var best = Infinity;
      for (var m = 0; m < 8; m++) {
        applyMask(m); drawFormat(m);
        var s = penalty(mod, size);
        if (s < best) { best = s; mask = m; }
        applyMask(m);
      }
    }
    applyMask(mask);
    drawFormat(mask);

    return { version: ver, ecl: ecl, mask: mask, size: size, modules: mod, bytes: bytes.length };
  }

  var QR = { encode: encode, maxBytes: maxBytes, utf8: utf8 };
  if (typeof module !== 'undefined' && module.exports) module.exports = QR;
  else root.QR = QR;
})(typeof self !== 'undefined' ? self : this);
