/* 외울수 / Fewmoves 핵심 로직 (화면 모름). 통계 읽기, 국면 이름, 연습 순서, 복습 간격.
   브라우저와 node(tests/run.mjs) 둘 다에서 돈다. */
(function (g) {
  'use strict';
  var FM = g.FM || (g.FM = {});

  FM.BANDS = ['<1200', '1200–1599', '1600–1999', '2000+'];
  FM.SHARDS = 256;
  FM.DATA = '/data/';

  // _dev/build_tree.py 의 fnv() 와 같아야 한다 (EPD는 ASCII)
  FM.fnv = function (s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  };
  FM.epd = function (fen) { return fen.split(' ').slice(0, 4).join(' '); };
  FM.shard = function (epd) {
    var n = FM.fnv(epd) % FM.SHARDS;
    return (n < 16 ? '0' : '') + n.toString(16);
  };

  // ---- 데이터 받기 (조각 하나 = 국면 수백 개) ----
  var cache = {}, wait = {};
  FM.fetchJSON = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
  FM.loadShard = function (id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    if (!wait[id]) {
      wait[id] = FM.fetchJSON(FM.DATA + 'p/' + id + '.json').then(function (j) { cache[id] = j; delete wait[id]; return j; },
        function (e) { delete wait[id]; throw e; });
    }
    return wait[id];
  };
  // 조각 = {e: {epd: 통계}, n: {epd: [ECO, 영어 이름, 한국어 이름, 해설 slug]}}
  FM.entry = function (epd) {
    return FM.loadShard(FM.shard(epd)).then(function (sh) { return sh.e[epd] || null; });
  };
  FM.entrySync = function (epd) { var sh = cache[FM.shard(epd)]; return sh ? (sh.e[epd] || null) : undefined; };
  FM._setShard = function (id, j) { cache[id] = j; };

  // ---- 통계 ----
  // entry = [played[12], reached[12], [san, w0,d0,b0, w1,d1,b1, w2,d2,b2, w3,d3,b3], ...]
  // band: 0~3, -1 = 전부
  function sumBand(arr, off, band) {
    var w = 0, d = 0, b = 0;
    for (var k = 0; k < 4; k++) {
      if (band >= 0 && k !== band) continue;
      w += arr[off + k * 3]; d += arr[off + k * 3 + 1]; b += arr[off + k * 3 + 2];
    }
    return { w: w, d: d, b: b, n: w + d + b };
  }
  FM.stats = function (entry, band) {
    if (!entry) return null;
    var played = sumBand(entry[0], 0, band), reached = sumBand(entry[1], 0, band);
    var moves = [];
    for (var i = 2; i < entry.length; i++) {
      var row = entry[i], s = sumBand(row, 1, band);
      if (!s.n) continue;
      moves.push({ san: row[0], n: s.n, w: s.w, d: s.d, b: s.b, share: played.n ? s.n / played.n : 0 });
    }
    moves.sort(function (a, b) { return b.n - a.n; });
    return { n: reached.n, w: reached.w, d: reached.d, b: reached.b, played: played.n, moves: moves };
  };
  // 백 기준 점수(이김 1, 비김 0.5)
  FM.score = function (s) { return s.n ? (s.w + s.d / 2) / s.n : 0; };
  FM.pct = function (x, digits) {
    var v = x * 100;
    if (v > 0 && v < 0.1) return '<0.1%';
    if (v > 0 && v < 1) return v.toFixed(1) + '%';
    return v.toFixed(digits == null ? 0 : digits) + '%';
  };
  FM.count = function (n, lang) {
    if (lang === 'ko') {
      if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + '만';
      return n.toLocaleString('ko-KR');
    }
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return Math.round(n / 1e3) + 'k';
    return n.toLocaleString('en-US');
  };

  // ---- 국면 이름: 처음 국면부터 지금까지(epds) 뒤에서부터 이름 있는 국면을 찾는다 ----
  FM.nameOf = function (epds, lang) {
    for (var i = epds.length - 1; i >= 0; i--) {
      var sh = cache[FM.shard(epds[i])];
      var n = sh && sh.n ? sh.n[epds[i]] : null;
      if (n) return { eco: n[0], name: lang === 'ko' ? n[2] : n[1], slug: n[3] || '', ply: i };
    }
    return null;
  };

  // ---- 연습(드릴) ----
  // 내 수 = 2000+가 가장 많이 둔 수(20판 이상), 없으면 전체에서 가장 많이 둔 수(30판 이상)
  FM.bookMove = function (entry) {
    var top = FM.stats(entry, 3);
    if (top && top.moves.length && top.moves[0].n >= 20) return top.moves[0].san;
    var all = FM.stats(entry, -1);
    if (all && all.moves.length && all.moves[0].n >= 30) return all.moves[0].san;
    return null;
  };
  // 같은 국면에서 2000+가 15% 넘게 두는 다른 수 = "둘 만한 수"
  FM.playable = function (entry, san) {
    var top = FM.stats(entry, 3);
    if (!top || top.played < 20) return false;
    for (var i = 0; i < top.moves.length; i++) if (top.moves[i].san === san) return top.moves[i].share >= 0.15;
    return false;
  };
  // 상대 수 후보: 그 레이팅대에서 5% 넘는 수(많아야 4개), 실제 비율로
  FM.oppChoices = function (entry, band) {
    var s = FM.stats(entry, band);
    if (!s || s.played < 15) s = FM.stats(entry, -1);
    if (!s || s.played < 15) return [];
    var out = [];
    for (var i = 0; i < s.moves.length && out.length < 4; i++) {
      var m = s.moves[i];
      if (m.share >= 0.05 && m.n >= 5) out.push({ san: m.san, p: m.share, n: m.n });
    }
    var t = out.reduce(function (a, m) { return a + m.p; }, 0);
    out.forEach(function (m) { m.w = m.p / t; });
    return out;
  };
  FM.pick = function (choices, r) {
    var acc = 0;
    for (var i = 0; i < choices.length; i++) { acc += choices[i].w; if (r < acc) return choices[i]; }
    return choices[choices.length - 1] || null;
  };

  // ---- 복습 간격 ----
  // 카드 = {i: 간격(일), d: 다음 날짜(일 번호), s: 연속 정답, f: 틀린 횟수}
  FM.STEPS = [1, 3, 7, 16, 35, 90];
  FM.today = function (now) {
    var t = now || new Date();
    return Math.floor((t.getTime() - t.getTimezoneOffset() * 60000) / 86400000);
  };
  FM.grade = function (card, ok, today) {
    var c = card ? { i: card.i, d: card.d, s: card.s, f: card.f || 0 } : { i: 0, d: today, s: 0, f: 0 };
    if (ok) {
      var k = FM.STEPS.indexOf(c.i);
      c.i = c.i === 0 ? FM.STEPS[0] : FM.STEPS[Math.min(k + 1, FM.STEPS.length - 1)] || FM.STEPS[0];
      c.s += 1;
      c.d = today + c.i;
    } else {
      c.i = 0; c.s = 0; c.f += 1; c.d = today;
    }
    return c;
  };
  FM.due = function (card, today) { return !card || card.d <= today; };

  // ---- 주소에 수순 담기: ?m=e2e4.e7e5 ----
  FM.lineToParam = function (ucis) { return ucis.join('.'); };
  FM.paramToLine = function (p) {
    if (!p) return [];
    return p.split('.').filter(function (u) { return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u); }).slice(0, 60);
  };
})(typeof window !== 'undefined' ? window : globalThis);
