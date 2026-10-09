/* 종이 달력 그리기(SHEET). DOM을 모른다. 브라우저 전역 SHEET, 노드 require.
   배치는 하나(build → 글자·선의 위치 목록, 단위 mm)이고 그리는 곳만 둘이다:
   - svg(): 화면 미리보기·인쇄·미리 만든 PDF (글자 그대로라 작게 줄여도 배치가 안 깨진다)
   - draw(): 캔버스(이미지로 저장, 내 설정 PDF)
   그래서 미리보기 = 인쇄 = 받는 파일. 글자 폭은 어림값(estW)으로만 쓰고, 넘치지 않게 넉넉히 잡는다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.SHEET = factory(root.CAL);
})(typeof self !== 'undefined' ? self : this, function (CAL) {
  'use strict';

  var FONT = "'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic','Segoe UI',system-ui,sans-serif";
  var SIZES = { a4: [297, 210], letter: [279.4, 215.9] };          // 가로 기준 mm
  var COLORS = { ink: '#191c1a', muted: '#727b75', sun: '#d2332a', sat: '#2355c8', line: '#cfd5d1', paper: '#ffffff' };
  var SITE = 'calendar.lumenlab.page';
  var EN_M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var T = {
    ko: {
      wd: ['일', '월', '화', '수', '목', '금', '토'], wd1: ['일', '월', '화', '수', '목', '금', '토'],
      month: function (m) { return m + '월'; }, ym: function (y, m) { return y + '년 ' + m + '월'; },
      note: { KR: '대한민국 공휴일 · 대체공휴일 포함', US: '미국 연방 공휴일' },
      ws: ['일요일 시작', '월요일 시작'], prov: '공식 발표 전 자료', rule: '규정으로 계산한 예상(선거일·임시공휴일 제외)',
      wk: '주', lunar: '음 ', leap: '윤', son: '손 없는 날', more: function (n) { return '외 ' + n + '일'; },
      seol: '설 연휴', chuseok: '추석 연휴', sub: '대체공휴일',
      legend: { lunar: '음 = 음력 날짜', son: '손 없는 날 = 음력 끝자리 9·0인 날(전해 오는 풍습)', terms: '24절기: 한국천문연구원' }
    },
    en: {
      wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], wd1: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      month: function (m) { return EN_M[m - 1]; }, ym: function (y, m) { return EN_M[m - 1] + ' ' + y; },
      note: { KR: 'South Korea public holidays', US: 'US federal holidays' },
      ws: ['Weeks start on Sunday', 'Weeks start on Monday'], prov: 'pre-announcement data', rule: 'projected from the holiday rules (no election days)',
      wk: 'Wk', lunar: 'lunar ', leap: 'leap ', son: 'son-eomneun-nal', more: function (n) { return '+' + n + ' more'; },
      seol: 'Seollal holiday', chuseok: 'Chuseok holiday', sub: 'Substitute holiday',
      legend: { lunar: 'lunar = Korean lunar date', son: 'son-eomneun-nal = lunar days ending in 9 or 0 (folk custom)', terms: 'Solar terms: KASI' }
    }
  };
  var KO_TERMS = ['소한', '대한', '입춘', '우수', '경칩', '춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지'];
  var EN_TERMS = ['Minor Cold', 'Major Cold', 'Start of Spring', 'Rain Water', 'Awakening of Insects', 'Spring Equinox', 'Pure Brightness', 'Grain Rain', 'Start of Summer', 'Grain Buds', 'Grain in Ear', 'Summer Solstice',
    'Minor Heat', 'Major Heat', 'Start of Autumn', 'End of Heat', 'White Dew', 'Autumn Equinox', 'Cold Dew', 'Frost Descent', 'Start of Winter', 'Minor Snow', 'Major Snow', 'Winter Solstice'];
  function termName(t, lang) { return t && lang === 'en' ? EN_TERMS[KO_TERMS.indexOf(t)] || t : t; }
  var US_SHORT = { 'Juneteenth National Independence Day': 'Juneteenth', 'Thanksgiving Day': 'Thanksgiving' };

  function page(o) { var s = SIZES[o.paper] || SIZES.a4; return o.orient === 'portrait' && o.kind === 'year' ? [s[1], s[0]] : [s[0], s[1]]; }
  // 글자 폭 어림(em 단위 합 × 크기). 한글 0.9, 숫자 0.58 …
  function estW(s, size) {
    var w = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i), ch = s[i];
      w += c > 0x2FFF ? 0.9 : c === 0x2013 ? 0.62 : c >= 48 && c <= 57 ? 0.6 : ch === ' ' ? 0.28 : c >= 65 && c <= 90 ? 0.68 : c >= 97 && c <= 122 ? 0.54 : 0.34;
    }
    return w * size;
  }
  function norm(o) {
    var lang = o.lang === 'en' ? 'en' : 'ko', country = o.country === 'US' ? 'US' : o.country === 'KR' ? 'KR' : (lang === 'en' ? 'US' : 'KR');
    var sh = o.show || {};
    return { kind: o.kind === 'month' ? 'month' : 'year', year: o.year, month: o.month || 1, lang: lang, country: country,
      paper: o.paper === 'letter' ? 'letter' : 'a4', orient: o.orient === 'portrait' ? 'portrait' : 'landscape', weekStart: o.weekStart ? 1 : 0, mono: !!o.mono,
      show: { names: sh.names !== false, week: !!sh.week, lunar: !!sh.lunar, terms: !!sh.terms, son: !!sh.son } };
  }
  // 공휴일 이름(달력에 쓰는 짧은 이름)
  function label(it, o) {
    if (o.country === 'KR') {
      if (o.lang === 'ko') return it.label;
      return it.kind === 'substitute' ? T.en.sub : it.en.replace(' (Lunar New Year)', '');
    }
    if (o.lang === 'ko') return it.names.join('·');
    var obs = / \(observed\)$/.test(it.en), b = it.en.replace(/ \(observed\)$/, '');
    return (US_SHORT[b] || b) + (obs ? ' (observed)' : '');
  }
  function wdRole(k, o) { return o.country === 'US' ? (k === 0 || k === 6 ? 'muted' : 'ink') : (k === 0 ? 'sun' : k === 6 ? 'sat' : 'ink'); }

  // 한 달의 공휴일을 [날짜 글자, 이름] 목록으로. 설·추석 연휴는 한 줄로 묶고, 미국은 주말 실제 날짜 대신 관측일만.
  function holidayList(list, o) {
    var L = T[o.lang], out = [], i = 0;
    if (o.country === 'US') {
      var obs = {};
      list.forEach(function (x) { if (x.kind === 'substitute') obs[x.en.replace(/ \(observed\)$/, '')] = 1; });
      list.forEach(function (x) { if (!(x.kind === 'holiday' && (x.wd === 0 || x.wd === 6) && obs[x.en])) out.push([String(x.d), label(x, o)]); });
      return out;
    }
    while (i < list.length) {
      var it = list[i], key = /설날/.test(it.name) ? '설날' : /추석/.test(it.name) ? '추석' : null, j = i;
      if (key) while (j + 1 < list.length && list[j + 1].d === list[j].d + 1 && list[j + 1].name.indexOf(key) >= 0) j++;
      if (j > i) {
        var extra = [];
        for (var k = i; k <= j; k++) list[k].names.forEach(function (n) {
          if (n.indexOf(key) < 0 && n.indexOf('대체공휴일') !== 0) extra.push(o.lang === 'ko' ? CAL.krLabel(n) : label({ kind: 'holiday', en: list[k].en.split('; ').pop() }, o));
        });
        out.push([it.d + '–' + list[j].d, (key === '설날' ? L.seol : L.chuseok) + (extra.length ? (o.lang === 'ko' ? '·' : ', ') + extra.join(o.lang === 'ko' ? '·' : ', ') : '')]);
      } else out.push([String(it.d), label(it, o)]);
      i = j + 1;
    }
    return out;
  }
  // 목록을 두 칸짜리 줄에 채운다(긴 이름은 두 칸을 다 쓴다).
  function pack(list, bw, size) {
    var half = bw / 2, rows = [], cur = null;
    list.forEach(function (a) {
      var span = estW(a[0], size) + 1 + estW(a[1], size) <= half - 1.2 ? 1 : 2;
      if (!cur || cur.used + span > 2) { cur = { used: 0, cells: [] }; rows.push(cur); }
      cur.cells.push({ col: cur.used, a: a }); cur.used += span;
    });
    return rows;
  }

  function buildYear(o) {
    var P = page(o), W = P[0], H = P[1], portrait = W < H, L = T[o.lang], y = o.year, ws = o.weekStart;
    var hol = CAL.holidays(o.country, y), it = [];
    function text(x, yy, s, size, weight, role, anchor) { it.push({ t: 1, x: x, y: yy, s: String(s), z: size, w: weight, c: role, a: anchor || 's' }); }
    function line(x1, y1, x2, y2, w, role) { it.push({ t: 0, x1: x1, y1: y1, x2: x2, y2: y2, w: w, c: role }); }
    var mx = portrait ? 13 : 14, top = portrait ? 14 : 11, bot = 8;
    text(mx - 0.6, top + 11.2, y, 15, 800, 'ink');
    text(W - mx, top + 11.2, L.note[o.country] + (hol && hol.basis === 'provisional' ? ' · ' + L.prov : hol && hol.basis === 'rule' ? ' · ' + L.rule : ''), 3.1, 500, 'muted', 'e');
    var cols = portrait ? 3 : 4, rows = 12 / cols, cg = 9, rg = portrait ? 5 : 4.4;
    var gy = top + 17, gh = H - bot - 5 - gy, bw = (W - 2 * mx - (cols - 1) * cg) / cols, bh = (gh - (rows - 1) * rg) / rows;
    var maxLines = portrait ? 3 : 2, lh = 3.9, holH = maxLines * lh + 0.4, wk = o.show.week ? 4.8 : 0;
    var rh = Math.min(portrait ? 6.3 : 5.6, (bh - 11.4 - holH - 0.8) / 6), cw = (bw - wk) / 7;
    for (var m = 1; m <= 12; m++) {
      var bx = mx + ((m - 1) % cols) * (bw + cg), by = gy + Math.floor((m - 1) / cols) * (bh + rg);
      text(bx, by + 4.4, L.month(m), o.lang === 'en' ? 4.3 : 4.6, 800, 'ink');
      line(bx, by + 6.3, bx + bw, by + 6.3, 0.35, 'ink');
      if (wk) text(bx + wk * 0.42, by + 10, L.wk, 2.1, 600, 'muted', 'm');
      for (var i = 0; i < 7; i++) { var k = (i + ws) % 7; text(bx + wk + cw * (i + 0.5), by + 10, L.wd1[k], 2.7, 650, o.country === 'US' ? 'muted' : wdRole(k, o), 'm'); }
      CAL.monthGrid(y, m, ws).forEach(function (row, r) {
        var yy = by + 11.4 + r * rh + rh * 0.72;
        if (wk) { var d0 = row.filter(Boolean)[0]; text(bx + wk * 0.42, yy - 0.2, ws ? CAL.isoWeek(y, m, d0).week : CAL.usWeek(y, m, d0), 2.2, 500, 'muted', 'm'); }
        row.forEach(function (d, i) {
          if (!d) return;
          var k = (i + ws) % 7, h = hol && hol.byDate[CAL.iso(y, m, d)], x = bx + wk + cw * (i + 0.5);
          text(x, yy, d, 3.8, h ? 800 : 560, h ? 'sun' : wdRole(k, o), 'm');
          if (h && o.mono) line(x - 1.7, yy + 1, x + 1.7, yy + 1, 0.3, 'ink');
        });
      });
      if (o.show.names && hol) {
        var list = holidayList(hol.list.filter(function (x) { return x.m === m; }), o), size = 3.05, n = maxLines, lineH = lh;
        var packed = pack(list, bw, size);
        if (packed.length > n) { size = 2.7; n = maxLines + 1; lineH = holH / n; packed = pack(list, bw, size); }
        var hidden = 0;
        if (packed.length > n) { packed.slice(n).forEach(function (r) { hidden += r.cells.length; }); packed = packed.slice(0, n); }
        packed.forEach(function (row, r) {
          var yy = by + bh - holH + lineH * (r + 0.78);
          row.cells.forEach(function (c) {
            var x = bx + c.col * (bw / 2);
            text(x, yy, c.a[0], size, 750, 'sun');
            text(x + estW(c.a[0], size) + 1.1, yy, c.a[1], size, 500, 'muted');
          });
          if (hidden && r === packed.length - 1) text(bx + bw, yy, L.more(hidden), size, 500, 'muted', 'e');
        });
      }
    }
    text(mx, H - bot + 1.2, L.ws[ws], 2.2, 500, 'muted');
    text(W - mx, H - bot + 1.2, SITE, 2.2, 500, 'muted', 'e');
    return { w: W, h: H, items: it, mono: o.mono, title: (o.lang === 'ko' ? y + '년 달력' : y + ' calendar') };
  }

  function buildMonth(o) {
    var P = page(o), W = P[0], H = P[1], L = T[o.lang], y = o.year, m = o.month, ws = o.weekStart;
    var hol = CAL.holidays(o.country, y), it = [], kr = o.country === 'KR';
    function text(x, yy, s, size, weight, role, anchor) { it.push({ t: 1, x: x, y: yy, s: String(s), z: size, w: weight, c: role, a: anchor || 's' }); }
    function line(x1, y1, x2, y2, w, role) { it.push({ t: 0, x1: x1, y1: y1, x2: x2, y2: y2, w: w, c: role }); }
    var mx = 14, top = 12, bot = 9;
    text(mx - 0.7, top + 12.4, L.month(m), 16, 800, 'ink');
    text(W - mx, top + 12.4, y, 9, 650, 'muted', 'e');
    var hy = top + 19, cw = (W - 2 * mx) / 7;
    for (var i = 0; i < 7; i++) { var k = (i + ws) % 7; text(mx + cw * i + 1.8, hy + 4.6, L.wd[k], 3.4, 700, wdRole(k, o)); }
    line(mx, hy + 7, W - mx, hy + 7, 0.4, 'ink');
    var grid = CAL.monthGrid(y, m, ws), gy = hy + 7, gh = H - bot - 5.5 - gy, rh = gh / grid.length;
    var showLunar = o.show.lunar && kr, showTerms = o.show.terms && kr, showSon = o.show.son && kr;
    grid.forEach(function (row, r) {
      var yT = gy + r * rh;
      if (r) line(mx, yT, W - mx, yT, 0.2, 'line');
      var first = true;
      row.forEach(function (d, i) {
        if (!d) return;
        var k = (i + ws) % 7, x = mx + cw * i + 1.8, h = hol && hol.byDate[CAL.iso(y, m, d)];
        text(x, yT + 7.6, d, 6.2, h ? 800 : 620, h ? 'sun' : wdRole(k, o));
        if (h && o.mono) line(x, yT + 8.8, x + estW(String(d), 6.2), yT + 8.8, 0.35, 'ink');
        var numW = estW(String(d), 6.2) + 1.6, y2 = yT + 12.2;
        if (h && o.show.names) {
          var lab = label(h, o), fits = estW(lab, 2.9) <= cw - numW - 3.6 - (o.show.week && first ? 7 : 0);
          if (fits) text(x + numW, yT + 7.3, lab, 2.9, 700, 'sun');
          else { text(x, y2, lab.length > 24 ? lab.slice(0, 23) + '…' : lab, estW(lab, 2.9) > cw - 3.4 ? 2.45 : 2.9, 700, 'sun'); y2 += 4; }
        }
        var l = showLunar || showSon ? CAL.lunar.fromSolar(y, m, d) : null;
        var term = showTerms ? termName(CAL.termOn(y, m, d), o.lang) : '';
        if (term) { text(x, y2, term, 2.8, 700, 'ink'); y2 += 4; }
        if (showSon && l && CAL.sonDay(l.d)) text(x, y2, L.son, 2.6, 500, 'muted');
        if (showLunar && l) text(x, yT + rh - 2, L.lunar + (l.leap ? L.leap : '') + l.m + '.' + l.d, 2.6, l.d === 1 ? 750 : 450, l.d === 1 ? 'ink' : 'muted');
        if (o.show.week && first) text(mx + cw * i + cw - 1.6, yT + 4.6, o.lang === 'ko' ? (ws ? CAL.isoWeek(y, m, d).week : CAL.usWeek(y, m, d)) + L.wk : L.wk + ' ' + (ws ? CAL.isoWeek(y, m, d).week : CAL.usWeek(y, m, d)), 2.3, 500, 'muted', 'e');
        first = false;
      });
    });
    line(mx, gy + gh, W - mx, gy + gh, 0.2, 'line');
    var leg = [L.note[o.country] + (hol && hol.basis === 'provisional' ? ' · ' + L.prov : hol && hol.basis === 'rule' ? ' · ' + L.rule : '')];
    if (showLunar) leg.push(L.legend.lunar);
    if (showSon) leg.push(L.legend.son);
    text(mx, H - bot + 1.6, leg.join('   ·   '), 2.2, 500, 'muted');
    text(W - mx, H - bot + 1.6, SITE, 2.2, 500, 'muted', 'e');
    return { w: W, h: H, items: it, mono: o.mono, title: L.ym(y, m) };
  }

  function build(opts) { var o = norm(opts); return o.kind === 'month' ? buildMonth(o) : buildYear(o); }
  function color(role, mono) { return mono ? (role === 'muted' ? '#5c635e' : role === 'line' ? '#b9bfbb' : COLORS.ink) : COLORS[role]; }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function r2(v) { return Math.round(v * 100) / 10; }           // mm → viewBox(0.1mm) 한 자리

  // SVG 글자. 같은 모양의 글자는 <g>로 묶어 짧게.
  function svg(sheet, cls) {
    var out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + r2(sheet.w) + ' ' + r2(sheet.h) + '" class="' + (cls || 'sheet-svg') + '" role="img" aria-label="' + esc(sheet.title) + '" font-family="' + FONT + '">',
      '<rect width="100%" height="100%" fill="' + COLORS.paper + '"/>'];
    var key = null, K = function (i) { return i.z + '|' + i.w + '|' + i.c + '|' + i.a; };
    var items = sheet.items.filter(function (i) { return !i.t; }).concat(sheet.items.filter(function (i) { return i.t; })
      .map(function (i, n) { return [K(i), n, i]; }).sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]; }).map(function (a) { return a[2]; }));
    items.forEach(function (i) {
      if (!i.t) {
        out.push('<path d="M' + r2(i.x1) + ' ' + r2(i.y1) + 'L' + r2(i.x2) + ' ' + r2(i.y2) + '" stroke="' + color(i.c, sheet.mono) + '" stroke-width="' + r2(i.w) + '"/>');
        return;
      }
      var k = K(i);
      if (k !== key) {
        if (key) out.push('</g>');
        out.push('<g font-size="' + r2(i.z) + '" font-weight="' + i.w + '" fill="' + color(i.c, sheet.mono) + '"' + (i.a === 'm' ? ' text-anchor="middle"' : i.a === 'e' ? ' text-anchor="end"' : '') + '>');
        key = k;
      }
      out.push('<text x="' + r2(i.x) + '" y="' + r2(i.y) + '">' + esc(i.s) + '</text>');
    });
    if (key) out.push('</g>');
    out.push('</svg>');
    return out.join('');
  }
  // 캔버스. scale = 1mm가 몇 픽셀인지.
  function draw(ctx, sheet, scale) {
    ctx.fillStyle = COLORS.paper; ctx.fillRect(0, 0, Math.ceil(sheet.w * scale), Math.ceil(sheet.h * scale));
    sheet.items.forEach(function (i) {
      if (!i.t) {
        ctx.strokeStyle = color(i.c, sheet.mono); ctx.lineWidth = i.w * scale; ctx.beginPath();
        ctx.moveTo(i.x1 * scale, i.y1 * scale); ctx.lineTo(i.x2 * scale, i.y2 * scale); ctx.stroke();
        return;
      }
      ctx.font = i.w + ' ' + (i.z * scale) + 'px ' + FONT;
      ctx.fillStyle = color(i.c, sheet.mono);
      ctx.textAlign = i.a === 'm' ? 'center' : i.a === 'e' ? 'right' : 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(i.s, i.x * scale, i.y * scale);
    });
  }

  // 화면용 큰 달(표). 첫 HTML에 글자로 들어간다.
  function webMonth(opts) {
    var o = norm(opts), L = T[o.lang], y = o.year, m = o.month, ws = o.weekStart, hol = CAL.holidays(o.country, y), kr = o.country === 'KR';
    var cls = function (k) { return o.country === 'US' ? (k === 0 || k === 6 ? 'we' : '') : (k === 0 ? 'sun' : k === 6 ? 'sat' : ''); };
    var out = ['<table class="wm"><caption class="sr">' + esc(L.ym(y, m)) + '</caption><thead><tr>'];
    for (var i = 0; i < 7; i++) { var k = (i + ws) % 7; out.push('<th scope="col"' + (cls(k) ? ' class="' + cls(k) + '"' : '') + '>' + L.wd[k] + '</th>'); }
    out.push('</tr></thead><tbody>');
    CAL.monthGrid(y, m, ws).forEach(function (row) {
      out.push('<tr>');
      row.forEach(function (d, i) {
        if (!d) { out.push('<td class="off"></td>'); return; }
        var k = (i + ws) % 7, h = hol && hol.byDate[CAL.iso(y, m, d)], c = [cls(k), h ? 'hol' : ''].filter(Boolean).join(' ');
        var l = kr ? CAL.lunar.fromSolar(y, m, d) : null, term = kr ? termName(CAL.termOn(y, m, d), o.lang) : '';
        out.push('<td' + (c ? ' class="' + c + '"' : '') + ' data-d="' + d + '"><b>' + d + '</b>');
        if (h) out.push('<em>' + esc(label(h, o)) + '</em>');
        if (term) out.push('<i class="term">' + term + '</i>');
        if (l && CAL.sonDay(l.d)) out.push('<i class="son">' + L.son + '</i>');
        if (l) out.push('<small' + (l.d === 1 ? ' class="l1"' : '') + '>' + L.lunar + (l.leap ? L.leap : '') + l.m + '.' + l.d + '</small>');
        out.push('</td>');
      });
      out.push('</tr>');
    });
    out.push('</tbody></table>');
    return out.join('');
  }

  // 받는 파일 이름과, 미리 만들어 둔 파일이 있으면 그 주소(없으면 null → 기기에서 만든다)
  function fileBase(opts) {
    var o = norm(opts), c = o.country === 'KR' ? 'korea' : 'us';
    if (opts.kind === 'months') return o.year + '-calendar-' + c + '-monthly-' + o.paper;
    if (o.kind === 'month') return o.year + '-' + (o.month < 10 ? '0' : '') + o.month + '-calendar-' + c + '-' + o.paper;
    return o.year + '-calendar-' + c + '-' + o.paper + '-' + o.orient;
  }
  function staticFile(opts) {
    var o = norm(opts), s = o.show, months = opts.kind === 'months';
    if (o.year < 2026 || o.year > 2028 || o.weekStart || o.mono || !s.names || s.week || s.son) return null;
    if (!(o.lang === 'ko' && o.country === 'KR' && o.paper === 'a4') && !(o.lang === 'en' && o.country === 'US')) return null;
    if (months) return (o.country === 'KR' ? s.lunar && s.terms : true) ? '/files/' + fileBase(opts) + '.pdf' : null;
    if (o.kind !== 'year') return null;
    return '/files/' + fileBase(opts) + '.pdf';
  }

  return { build: build, svg: svg, draw: draw, webMonth: webMonth, fileBase: fileBase, staticFile: staticFile, estW: estW, SIZES: SIZES, FONT: FONT, T: T, label: function (it, o) { return label(it, norm(o)); } };
});
