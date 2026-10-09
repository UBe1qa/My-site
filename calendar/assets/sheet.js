/* 종이 달력 그리기(SHEET). DOM을 모른다. 브라우저 전역 SHEET, 노드 require.
   배치는 하나(build → 글자·선의 위치 목록, 단위 mm)이고 그리는 곳만 셋이다:
   - svg(): 화면 미리보기·인쇄·미리 만든 PDF (글자 그대로라 작게 줄여도 배치가 안 깨진다)
   - draw(): 캔버스(이미지로 저장)
   - pdf.js(PDFDOC): 내 설정 PDF(글자 그대로, 글꼴을 담는다)
   그래서 미리보기 = 인쇄 = 받는 파일. 글자 폭은 Pretendard의 실제 폭 표(estW, 굵기 500~800 가운데 가장 넓은 값)로 재고,
   자리가 모자라면 줄을 나누거나 글자를 줄인다. 종이에 말줄임(…)이나 '외 N일'은 찍지 않는다(tests/run.js 가 지킨다).
   글자 굵기는 500·600·700·800 네 가지만 쓴다(PDF에 담는 글꼴이 이 네 개). */
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
      note: { KR: '대한민국 공휴일 · 대체공휴일 포함', US: '미국 연방 공휴일 · 대신 쉬는 날 포함', NONE: '' },
      ws: ['일요일 시작', '월요일 시작'], prov: '공식 발표 전 자료', rule: '규정으로 계산한 예상(선거일·임시공휴일 제외)',
      wk: '주', lunar: '음 ', leap: '윤', son: '손 없는 날',
      seol: '설 연휴', chuseok: '추석 연휴', sub: '대체공휴일',
      obs: function (name, wd) { return name + '(' + T.ko.wd[wd] + '요일에 대신 쉼)'; },
      legend: { lunar: '음 = 음력 날짜', son: '손 없는 날 = 음력 끝자리 9·0인 날(전해 오는 풍습)', terms: '24절기: 한국천문연구원' }
    },
    en: {
      wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], wd1: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      month: function (m) { return EN_M[m - 1]; }, ym: function (y, m) { return EN_M[m - 1] + ' ' + y; },
      note: { KR: 'South Korea public holidays', US: 'US federal holidays', NONE: '' },
      ws: ['Weeks start on Sunday', 'Weeks start on Monday'], prov: 'pre-announcement data', rule: 'projected from the holiday rules (no election days)',
      wk: 'Wk', lunar: 'lunar ', leap: 'leap ', son: 'son-eomneun-nal',
      seol: 'Seollal holiday', chuseok: 'Chuseok holiday', sub: 'Substitute holiday',
      obs: function (name, wd) { return name + ' (observed ' + T.en.wd[wd] + ')'; },
      legend: { lunar: 'lunar = Korean lunar date', son: 'son-eomneun-nal = lunar days ending in 9 or 0 (folk custom)', terms: 'Solar terms: KASI' }
    }
  };
  var KO_TERMS = ['소한', '대한', '입춘', '우수', '경칩', '춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지'];
  var EN_TERMS = ['Minor Cold', 'Major Cold', 'Start of Spring', 'Rain Water', 'Awakening of Insects', 'Spring Equinox', 'Pure Brightness', 'Grain Rain', 'Start of Summer', 'Grain Buds', 'Grain in Ear', 'Summer Solstice',
    'Minor Heat', 'Major Heat', 'Start of Autumn', 'End of Heat', 'White Dew', 'Autumn Equinox', 'Cold Dew', 'Frost Descent', 'Start of Winter', 'Minor Snow', 'Major Snow', 'Winter Solstice'];
  function termName(t, lang) { return t && lang === 'en' ? EN_TERMS[KO_TERMS.indexOf(t)] || t : t; }
  var US_SHORT = { 'Juneteenth National Independence Day': 'Juneteenth', 'Thanksgiving Day': 'Thanksgiving' };

  function page(o) { var s = SIZES[o.paper] || SIZES.a4; return o.orient === 'portrait' && o.kind === 'year' ? [s[1], s[0]] : [s[0], s[1]]; }
  // 글자 폭(mm). Pretendard 굵기 500~800 가운데 가장 넓은 폭(1/1000 em, 글자 사이 좁힘은 치지 않음) → 실제보다 좁게 나오지 않는다.
  var ADV = [245, 324, 378, 633, 638, 993, 662, 200, 407, 407, 562, 663, 297, 455, 292, 385, 683, 480, 619, 647, 669, 638, 654, 584, 656, 654, 292, 292, 663, 663, 663, 558, 878, 743, 643, 734, 707, 596, 565, 741, 724, 274, 559, 677, 551, 894, 715, 762, 630, 763, 640, 638, 654, 707, 743, 1027, 711, 717, 656, 407, 385, 407, 476, 467, 480, 565, 619, 576, 619, 582, 378, 619, 613, 271, 271, 572, 271, 895, 612, 598, 618, 618, 404, 554, 381, 612, 575, 833, 564, 575, 561, 407, 373, 407, 663];
  function estW(s, size) {
    var w = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      w += c >= 32 && c < 127 ? ADV[c - 32] : c > 0x2FFF ? 865 : c === 0x2013 ? 483 : c === 0xB7 ? 292 : c === 0x2019 ? 278 : 880;
    }
    return w * size / 1000;
  }
  function norm(o) {
    var lang = o.lang === 'en' ? 'en' : 'ko';
    var country = o.country === 'US' ? 'US' : o.country === 'KR' ? 'KR' : o.country === 'NONE' ? 'NONE' : (lang === 'en' ? 'US' : 'KR');
    var sh = o.show || {};
    return { kind: o.kind === 'month' ? 'month' : 'year', year: o.year, month: o.month || 1, lang: lang, country: country,
      kr: country === 'KR' || (country === 'NONE' && lang === 'ko'),      // 한국식 달력(일요일 빨강·토요일 파랑, 음력·절기)
      paper: o.paper === 'letter' ? 'letter' : 'a4', orient: o.orient === 'portrait' ? 'portrait' : 'landscape', weekStart: o.weekStart ? 1 : 0, mono: !!o.mono,
      show: { names: sh.names !== false, week: !!sh.week, lunar: !!sh.lunar, terms: !!sh.terms, son: !!sh.son } };
  }
  function holidaysOf(o) { return o.country === 'NONE' ? null : CAL.holidays(o.country, o.year); }
  // 공휴일 이름. short = 좁은 칸용(화면의 큰 달 표), 아니면 무엇의 대체공휴일인지까지.
  function label(it, o, short) {
    if (o.country === 'KR') {
      if (o.lang === 'ko') return it.kind === 'substitute' && !short && it.of ? T.ko.sub + '(' + it.of.map(CAL.krLabel).join('·') + ')' : it.label;
      return it.kind === 'substitute' ? (short ? T.en.sub : it.en) : it.en.replace(' (Lunar New Year)', '');
    }
    if (o.lang === 'ko') return it.names.join('·');
    var obs = / \(observed\)$/.test(it.en), b = it.en.replace(/ \(observed\)$/, '');
    return (US_SHORT[b] || b) + (obs ? ' (observed)' : '');
  }
  function wdRole(k, o) { return o.kr ? (k === 0 ? 'sun' : k === 6 ? 'sat' : 'ink') : (k === 0 || k === 6 ? 'muted' : 'ink'); }
  function basisNote(o, hol) {
    var L = T[o.lang];
    return L.note[o.country] + (hol && hol.basis === 'provisional' ? ' · ' + L.prov : hol && hol.basis === 'rule' ? ' · ' + L.rule : '');
  }

  // 한 달의 공휴일을 [날짜 글자, 이름] 목록으로(1년 한 장의 이름 줄).
  // 한국: 설·추석 연휴는 한 줄로 묶는다. 미국: 실제 날과 대신 쉬는 날이 붙어 있으면 한 줄로("24–25 Christmas Day (observed Fri)").
  function holidayList(list, o) {
    var L = T[o.lang], out = [], i = 0;
    if (o.country === 'US') {
      var used = {};
      list.forEach(function (x, a) {
        if (used[a]) return;
        var base = x.en.replace(/ \(observed\)$/, ''), b = -1;
        list.forEach(function (z, k) { if (k > a && !used[k] && z.d === x.d + 1 && z.en.replace(/ \(observed\)$/, '') === base && (z.kind === 'substitute') !== (x.kind === 'substitute')) b = k; });
        if (b < 0) { out.push([String(x.d), label(x, o)]); return; }
        used[b] = 1;
        var real = x.kind === 'substitute' ? list[b] : x, obs = x.kind === 'substitute' ? x : list[b];
        out.push([x.d + '–' + list[b].d, L.obs(o.lang === 'ko' ? real.names.join('·') : (US_SHORT[base] || base), obs.wd)]);
      });
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
  // 낱말 단위로 줄을 나눈다(폭 maxW mm 안에). 한 낱말이 폭보다 길면 그 줄만 넘친다 → 부르는 쪽이 글자를 줄여 다시 부른다.
  function wrap(s, maxW, size) {
    var words = s.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (cur && estW(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  // 두 줄로 나뉜 이름의 둘째 줄이 낱말 하나뿐이면(끝에 'Day'만 남는 꼴) 두 줄 길이가 비슷해지게 낱말을 아래로 옮긴다.
  function balance(lines, size) {
    if (lines.length !== 2 || lines[1].indexOf(' ') >= 0 || lines[1][0] === '(') return lines;
    var a = lines[0].split(' '), b = [lines[1]];
    while (a.length > 1) {
      var na = a.slice(0, -1).join(' '), nb = [a[a.length - 1]].concat(b).join(' ');
      if (Math.max(estW(na, size), estW(nb, size)) >= Math.max(estW(a.join(' '), size), estW(b.join(' '), size))) break;
      b.unshift(a.pop());
    }
    return [a.join(' '), b.join(' ')];
  }
  function fitsAll(lines, maxW, size) { return lines.every(function (l) { return estW(l, size) <= maxW; }); }
  // 이름 목록을 두 칸짜리 줄에 채운다. 짧은 이름은 반 칸, 긴 이름은 한 줄, 더 긴 이름은 여러 줄(이어지는 줄은 이름 자리에 맞춰 들여 쓴다).
  function pack(list, bw, size) {
    var half = bw / 2, rows = [], cur = null;
    list.forEach(function (a) {
      var dw = estW(a[0], size) + size * 0.36, full = dw + estW(a[1], size);
      if (full <= half - 1.2) {
        if (!cur || cur.used + 1 > 2) { cur = { used: 0, cells: [] }; rows.push(cur); }
        cur.cells.push({ x: cur.used * half, d: a[0], dw: dw, s: a[1] }); cur.used += 1;
        return;
      }
      wrap(a[1], bw - dw, size).forEach(function (line, n) {
        cur = { used: 2, cells: [{ x: 0, d: n ? '' : a[0], dw: dw, s: line }] }; rows.push(cur);
        if (n) rows.wraps = (rows.wraps || 0) + 1;
      });
    });
    return rows;
  }
  var NAME_SIZES = [[3.05, 3.9], [2.7, 3.4], [2.45, 3.1], [2.2, 2.8]];   // [글자 크기, 줄 높이] mm

  function buildYear(o) {
    var P = page(o), W = P[0], H = P[1], portrait = W < H, L = T[o.lang], y = o.year, ws = o.weekStart;
    var hol = holidaysOf(o), it = [];
    function text(x, yy, s, size, weight, role, anchor, lim) { var t = { t: 1, x: x, y: yy, s: String(s), z: size, w: weight, c: role, a: anchor || 's' }; if (lim) t.r = lim; it.push(t); }
    function line(x1, y1, x2, y2, w, role) { it.push({ t: 0, x1: x1, y1: y1, x2: x2, y2: y2, w: w, c: role }); }
    var mx = portrait ? 13 : 14, top = portrait ? 14 : 11, bot = 8;
    text(mx - 0.6, top + 11.2, y, 15, 800, 'ink');
    if (basisNote(o, hol)) text(W - mx, top + 11.2, basisNote(o, hol), 3.1, 500, 'muted', 'e');
    var cols = portrait ? 3 : 4, rows = 12 / cols, cg = 9, rg = portrait ? 5 : 4.4;
    var gy = top + 17, gh = H - bot - 5 - gy, bw = (W - 2 * mx - (cols - 1) * cg) / cols, bh = (gh - (rows - 1) * rg) / rows;
    var wk = o.show.week ? 4.8 : 0, cw = (bw - wk) / 7, names = o.show.names && hol;
    // 이름 줄: 열두 달 가운데 가장 많은 줄 수에 맞춰 자리를 잡는다. 날짜 칸이 너무 낮아지면 이름 글자를 줄인다.
    var lists = [], packed = null, size = 0, lh = 0, n = 0, rh = 0, holH = 0;
    if (names) {
      for (var m0 = 1; m0 <= 12; m0++) lists.push(holidayList(hol.list.filter(function (x) { return x.m === m0; }), o));
      var best = null;
      NAME_SIZES.some(function (c) {
        var pk = lists.map(function (l) { return pack(l, bw, c[0]); });
        var nn = Math.max(portrait ? 3 : 2, Math.max.apply(null, pk.map(function (p) { return p.length; })));
        var r = (bh - 11.4 - (nn * c[1] + 0.4) - 0.8) / 6;
        var cand = { pk: pk, n: nn, size: c[0], lh: c[1], rh: r, wraps: pk.reduce(function (a, p) { return a + (p.wraps || 0); }, 0) };
        // 고르는 순서: ① 날짜 칸 5mm 이상이고 두 줄로 나뉜 이름이 없는 글자(2.7mm까지만 줄여 본다) ② 5mm 이상인 가장 큰 글자 ③ 4.6mm 넘는 가장 큰 글자 ④ 칸이 가장 높은 쪽
        if (!best || (best.rh < 4.6 && r > best.rh) || (best.rh < 5 && r >= 5)) best = cand;
        return r >= 5 && !cand.wraps && c[0] >= 2.7 && ((best = cand), true);
      });
      packed = best.pk; size = best.size; lh = best.lh; n = best.n; holH = n * lh + 0.4;
      rh = Math.min(portrait ? 6.3 : 5.6, best.rh);
    } else rh = Math.min(portrait ? 7.3 : 6.6, (bh - 11.4 - 0.8) / 6);
    for (var m = 1; m <= 12; m++) {
      var bx = mx + ((m - 1) % cols) * (bw + cg), by = gy + Math.floor((m - 1) / cols) * (bh + rg);
      text(bx, by + 4.4, L.month(m), o.lang === 'en' ? 4.3 : 4.6, 800, 'ink');
      line(bx, by + 6.3, bx + bw, by + 6.3, 0.35, 'ink');
      if (wk) text(bx + wk * 0.42, by + 10, L.wk, 2.1, 600, 'muted', 'm');
      for (var i = 0; i < 7; i++) { var k = (i + ws) % 7; text(bx + wk + cw * (i + 0.5), by + 10, L.wd1[k], 2.7, 700, o.kr ? wdRole(k, o) : 'muted', 'm'); }
      CAL.monthGrid(y, m, ws).forEach(function (row, r) {
        var yy = by + 11.4 + r * rh + rh * 0.72;
        if (wk) { var d0 = row.filter(Boolean)[0]; text(bx + wk * 0.42, yy - 0.2, ws ? CAL.isoWeek(y, m, d0).week : CAL.usWeek(y, m, d0), 2.2, 500, 'muted', 'm'); }
        row.forEach(function (d, i) {
          if (!d) return;
          var k = (i + ws) % 7, h = hol && hol.byDate[CAL.iso(y, m, d)], x = bx + wk + cw * (i + 0.5);
          text(x, yy, d, 3.8, h ? 800 : 600, h ? 'sun' : wdRole(k, o), 'm');
          if (h && o.mono) line(x - 1.7, yy + 1, x + 1.7, yy + 1, 0.3, 'ink');
        });
      });
      if (names) packed[m - 1].forEach(function (row, r) {
        var yy = by + bh - holH + lh * (r + 0.78);
        row.cells.forEach(function (c) {
          var lim = bx + (row.used === 2 ? bw : c.x + bw / 2 - 1.2) + 0.05;
          if (c.d) text(bx + c.x, yy, c.d, size, 700, 'sun');
          text(bx + c.x + c.dw, yy, c.s, size, 500, 'muted', 's', lim);
        });
      });
    }
    text(mx, H - bot + 1.2, L.ws[ws], 2.2, 500, 'muted');
    text(W - mx, H - bot + 1.2, SITE, 2.2, 500, 'muted', 'e');
    return { w: W, h: H, items: it, mono: o.mono, lang: o.lang, title: (o.lang === 'ko' ? y + '년 달력' : y + ' calendar'), nameSize: size, rowH: rh };
  }

  // 달 칸에서 숫자 아래에 쌓는 줄(공휴일 이름·절기·손 없는 날)의 글자 크기 단계. [크기, 가장 많은 줄 수]
  var LABEL_SIZES = [[2.9, 2], [2.6, 3], [2.4, 3], [2.2, 4], [2.0, 5]];
  function buildMonth(o) {
    var P = page(o), W = P[0], H = P[1], L = T[o.lang], y = o.year, m = o.month, ws = o.weekStart;
    var hol = holidaysOf(o), it = [];
    function text(x, yy, s, size, weight, role, anchor, lim) { var t = { t: 1, x: x, y: yy, s: String(s), z: size, w: weight, c: role, a: anchor || 's' }; if (lim) t.r = lim; it.push(t); }
    function line(x1, y1, x2, y2, w, role) { it.push({ t: 0, x1: x1, y1: y1, x2: x2, y2: y2, w: w, c: role }); }
    var mx = 14, top = 12, bot = 9, minK = 1;
    text(mx - 0.7, top + 12.4, L.month(m), 16, 800, 'ink');
    text(W - mx, top + 12.4, y, 9, 700, 'muted', 'e');
    var hy = top + 19, cw = (W - 2 * mx) / 7;
    for (var i = 0; i < 7; i++) { var k = (i + ws) % 7; text(mx + cw * i + 1.8, hy + 4.6, L.wd[k], 3.4, 700, wdRole(k, o)); }
    line(mx, hy + 7, W - mx, hy + 7, 0.4, 'ink');
    var grid = CAL.monthGrid(y, m, ws), gy = hy + 7, gh = H - bot - 5.5 - gy, rh = gh / grid.length;
    var showLunar = o.show.lunar && o.kr, showTerms = o.show.terms && o.kr, showSon = o.show.son && o.kr;
    grid.forEach(function (row, r) {
      var yT = gy + r * rh;
      if (r) line(mx, yT, W - mx, yT, 0.2, 'line');
      // 주 번호는 늘 첫 열의 오른쪽 위에(그 칸에 날짜가 없어도)
      if (o.show.week) {
        var d0 = row.filter(Boolean)[0], wn = ws ? CAL.isoWeek(y, m, d0).week : CAL.usWeek(y, m, d0);
        text(mx + cw - 1.6, yT + 4.6, o.lang === 'ko' ? wn + L.wk : L.wk + ' ' + wn, 2.3, 500, 'muted', 'e');
      }
      row.forEach(function (d, i) {
        if (!d) return;
        var k = (i + ws) % 7, x = mx + cw * i + 1.8, h = hol && hol.byDate[CAL.iso(y, m, d)], lim = mx + cw * (i + 1) - 1;
        text(x, yT + 7.6, d, 6.2, h ? 800 : 600, h ? 'sun' : wdRole(k, o));
        if (h && o.mono) line(x, yT + 8.8, x + estW(String(d), 6.2), yT + 8.8, 0.35, 'ink');
        var numW = estW(String(d), 6.2) + 1.6, stack = [];
        if (h && o.show.names) {
          var lab = label(h, o);
          if (estW(lab, 2.9) <= lim - (x + numW) - (o.show.week && i === 0 ? 8 : 0)) text(x + numW, yT + 7.3, lab, 2.9, 700, 'sun', 's', lim);
          else {
            // 숫자 옆에 안 들어가면 아래 줄로. 길면 두 줄로 나누고, 그래도 넘치면 글자를 줄인다(말줄임은 쓰지 않는다).
            var lines = null, z = 0;
            LABEL_SIZES.some(function (c) { z = c[0]; lines = wrap(lab, lim - x, z); return lines.length <= c[1] && fitsAll(lines, lim - x, z); });
            while (!fitsAll(lines, lim - x, z)) { z -= 0.1; lines = wrap(lab, lim - x, z); }
            lines = balance(lines, z);
            lines.forEach(function (s) { stack.push({ s: s, z: z, w: 700, c: 'sun' }); });
          }
        }
        var l = showLunar || showSon ? CAL.lunar.fromSolar(y, m, d) : null;
        var term = showTerms ? termName(CAL.termOn(y, m, d), o.lang) : '';
        if (term) stack.push({ s: term, z: 2.8, w: 700, c: 'ink' });
        if (showSon && l && CAL.sonDay(l.d)) stack.push({ s: L.son, z: 2.6, w: 500, c: 'muted' });
        // 쌓은 줄이 칸 높이를 넘으면 같은 비율로 줄인다(음력 날짜 줄과 겹치지 않게).
        var need = 0; stack.forEach(function (s, n) { if (n) need += s.z * 1.34; });
        var room = rh - 12.2 - (showLunar && l ? 5.3 : 1.8), kf = need > room ? room / need : 1, y2 = yT + 12.2;
        if (kf < minK) minK = kf;
        stack.forEach(function (s, n) { if (n) y2 += s.z * 1.34 * kf; text(x, y2, s.s, +(s.z * kf).toFixed(2), s.w, s.c, 's', lim); });
        if (showLunar && l) text(x, yT + rh - 2, L.lunar + (l.leap ? L.leap : '') + l.m + '.' + l.d, 2.6, l.d === 1 ? 700 : 500, l.d === 1 ? 'ink' : 'muted');
      });
    });
    line(mx, gy + gh, W - mx, gy + gh, 0.2, 'line');
    var leg = basisNote(o, hol) ? [basisNote(o, hol)] : [];
    if (showLunar) leg.push(L.legend.lunar);
    if (showSon) leg.push(L.legend.son);
    if (leg.length) text(mx, H - bot + 1.6, leg.join('   ·   '), 2.2, 500, 'muted');
    text(W - mx, H - bot + 1.6, SITE, 2.2, 500, 'muted', 'e');
    return { w: W, h: H, items: it, mono: o.mono, lang: o.lang, title: L.ym(y, m), minScale: minK };
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

  // 화면용 큰 달(표). 첫 HTML에 글자로 들어간다. 좁은 칸이라 이름은 짧게 쓰고, 긴 한글 이름은 나눌 자리(<wbr>)를 준다.
  var WBR = [['부처님오신날', '부처님<wbr>오신날'], ['대체공휴일', '대체<wbr>공휴일'], ['임시공휴일', '임시<wbr>공휴일'], ['·', '·<wbr>']];
  function webMonth(opts) {
    var o = norm(opts), L = T[o.lang], y = o.year, m = o.month, ws = o.weekStart, hol = holidaysOf(o), kr = o.kr;
    var cls = function (k) { return kr ? (k === 0 ? 'sun' : k === 6 ? 'sat' : '') : (k === 0 || k === 6 ? 'we' : ''); };
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
        if (h) { var lab = esc(label(h, o, true)); if (o.lang === 'ko') WBR.forEach(function (w) { lab = lab.split(w[0]).join(w[1]); }); out.push('<em>' + lab + '</em>'); }
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
    var o = norm(opts), c = o.country === 'KR' ? 'korea' : o.country === 'US' ? 'us' : 'no-holidays';
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

  return { build: build, svg: svg, draw: draw, webMonth: webMonth, fileBase: fileBase, staticFile: staticFile, estW: estW, color: color, SIZES: SIZES, FONT: FONT, T: T, SITE: SITE,
    label: function (it, o, short) { return label(it, norm(o), short); } };
});
