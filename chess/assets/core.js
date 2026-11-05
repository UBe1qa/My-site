/* Opening Trail 핵심 로직 (화면 모름). 판·수 자료 읽기, 수 분류, 국면 이름, 연습 순서, 복습 간격.
   브라우저와 node(tests/run.mjs) 둘 다에서 돈다. 루멘랩 홈 '바로 써 보기'도 이 파일을 읽는다(FM.entry·FM.stats·FM.nameOf·FM.count). */
(function (g) {
  'use strict';
  var FM = g.FM || (g.FM = {});

  FM.BANDS = ['<1200', '1200–1599', '1600–1999', '2000+'];
  FM.SHARDS = 4096;
  FM.DATA = '/data/';

  // _dev/data/make_site.py·build.py 의 fnv() 와 같아야 한다 (EPD는 ASCII)
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
    return ('00' + n.toString(16)).slice(-3);
  };

  // ---- 데이터 받기 (조각 하나 = 국면 수백 개) ----
  var cache = {}, wait = {};
  FM.fetchJSON = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
  FM.loadShard = function (id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    if (!wait[id]) {
      wait[id] = FM.fetchJSON(FM.DATA + 't/' + id + '.json').then(function (j) { cache[id] = j; delete wait[id]; return j; },
        function (e) { delete wait[id]; throw e; });
    }
    return wait[id];
  };
  // 조각 = {e: {epd: 판}, n: {epd: [ECO, 영어 이름, 한국어 이름, 해설 slug]}, x: {epd: {수: [영어 이유, 한국어 이유]}}}
  // 판 = [온 판 12칸, 평가, [[수, 분류, 둔 뒤 평가, 12칸], ...], 대회 온 판 12칸 | 0, [[수, 대회 판 4칸], ...] | 0, 엔진 첫 수, 다른 수순 | 0]
  FM.entry = function (epd) {
    return FM.loadShard(FM.shard(epd)).then(function (sh) { return sh.e[epd] || null; });
  };
  FM.entrySync = function (epd) { var sh = cache[FM.shard(epd)]; return sh ? (sh.e[epd] || null) : undefined; };
  FM._setShard = function (id, j) { cache[id] = j; };

  FM.why = function (epd, san, lang) {
    var sh = cache[FM.shard(epd)], x = sh && sh.x ? sh.x[epd] : null, r = x ? x[san] : null;
    return r ? r[lang === 'ko' ? 1 : 0] : '';
  };

  // ---- 통계 ----
  // 12칸 = 레이팅대 4개 × 백승·무·흑승. band: 0~3, -1 = 전부
  function sumBand(arr, off, band) {
    var w = 0, d = 0, b = 0;
    for (var k = 0; k < 4; k++) {
      if (band >= 0 && k !== band) continue;
      w += arr[off + k * 3]; d += arr[off + k * 3 + 1]; b += arr[off + k * 3 + 2];
    }
    return { w: w, d: d, b: b, n: w + d + b };
  }
  // all = true면 이 레이팅대에서 0판인 수(이론만 있는 수 포함)도 남긴다
  FM.stats = function (entry, band, all) {
    if (!entry) return null;
    var reached = sumBand(entry[0], 0, band), rows = entry[2] || [], moves = [], played = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i], s = sumBand(row, 3, band);
      played += s.n;
      if (!s.n && !all) continue;
      moves.push({ san: row[0], cls: row[1], ev: row[2], n: s.n, w: s.w, d: s.d, b: s.b, share: 0 });
    }
    moves.forEach(function (m) { m.share = played ? m.n / played : 0; });
    moves.sort(function (a, b) { return b.n - a.n || a.cls - b.cls; });
    return { n: reached.n, w: reached.w, d: reached.d, b: reached.b, played: played, moves: moves, ev: entry[1], best: entry[5] || null };
  };
  // 고수 대회(리체스 중계 기보, CC BY-SA 4.0): 레이팅대 <2200·2200-2399·2400-2599·2600+
  FM.otb = function (entry, band) {
    if (!entry || !entry[3]) return null;
    var r = sumBand(entry[3], 0, band), rows = entry[4] || [], moves = [], played = 0;
    rows.forEach(function (row) {
      var n = 0;
      for (var k = 0; k < 4; k++) if (band < 0 || k === band) n += row[1 + k];
      played += n;
      if (n) moves.push({ san: row[0], n: n });
    });
    moves.forEach(function (m) { m.share = played ? m.n / played : 0; });
    moves.sort(function (a, b) { return b.n - a.n; });
    return { n: r.n, w: r.w, d: r.d, b: r.b, played: played, moves: moves };
  };
  // 평가(백 기준 센티폰 정수 또는 "M3") → 글자, 승률(0~1, 백 기준)
  FM.evText = function (v) {
    if (v == null) return '';
    if (typeof v === 'string') return '#' + v.slice(1);
    var p = v / 100;
    return (p > 0 ? '+' : p < 0 ? '−' : '') + fix(Math.abs(p), Math.abs(p) >= 10 ? 0 : 1);
  };
  FM.evWin = function (v) {
    if (v == null) return null;
    if (typeof v === 'string') return v.charAt(1) === '-' ? 0 : 1;
    return 1 / (1 + Math.exp(-0.00368208 * v));
  };
  // 수 분류: 0 메인, 1 대안, 2 사이드, 3 의심스러운 수(?!), 4 나쁜 수(?), -1 모름
  FM.CLS = ['main', 'alt', 'side', 'dubious', 'bad'];
  // 백 기준 점수(이김 1, 비김 0.5)
  FM.score = function (s) { return s.n ? (s.w + s.d / 2) / s.n : 0; };
  // 반올림은 빌드(build.py tofixed)와 같게 5에서 올린다(0.15 → 0.2): 서버에서 쓴 숫자와 화면에서 쓴 숫자가 어긋나지 않게
  function fix(x, d) { var m = Math.pow(10, d); return (Math.floor(x * m + 0.5 + 1e-9) / m).toFixed(d); }
  FM.fix = fix;
  FM.pct = function (x, digits) {
    var v = x * 100;
    if (v > 0 && v < 0.1) return '<0.1%';
    if (v > 0 && v < 1) return fix(v, 1) + '%';
    return fix(v, digits == null ? 0 : digits) + '%';
  };
  FM.count = function (n, lang) {
    if (lang === 'ko') {
      if (n >= 100000000) return fix(n / 100000000, 1).replace(/\.0$/, '') + '억';
      if (n >= 10000) return fix(n / 10000, n >= 100000 ? 0 : 1).replace(/\.0$/, '') + '만';
      return n.toLocaleString('ko-KR');
    }
    if (n >= 1e6) return fix(n / 1e6, 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return Math.floor(n / 1e3 + 0.5) + 'k';
    return n.toLocaleString('en-US');
  };

  // ---- 국면 이름: 처음 국면부터 지금까지(epds) 뒤에서부터 이름 있는 국면을 찾는다 ----
  FM.nameOf = function (epds, lang) {
    for (var i = epds.length - 1; i >= 0; i--) {
      var sh = cache[FM.shard(epds[i])];
      var n = sh && sh.n ? sh.n[epds[i]] : null;
      if (n) return { eco: n[0], name: lang === 'ko' ? n[2] : n[1], en: n[1], ko: n[2], slug: n[3] || '', ply: i };
    }
    return null;
  };

  // ---- 연습(드릴) ----
  // 내 수 = 이 판의 메인 수(분류 0), 없으면 2000+가 가장 많이 둔 수(20판 이상), 없으면 전체 최다(30판 이상)
  FM.bookMove = function (entry) {
    var rows = entry && entry[2] || [];
    for (var i = 0; i < rows.length; i++) if (rows[i][1] === 0) return rows[i][0];
    var top = FM.stats(entry, 3);
    if (top && top.moves.length && top.moves[0].n >= 20) return top.moves[0].san;
    var all = FM.stats(entry, -1);
    if (all && all.moves.length && all.moves[0].n >= 30) return all.moves[0].san;
    return null;
  };
  // 메인·대안(분류 0·1)이거나 2000+가 15% 넘게 두는 다른 수 = "둘 만한 수"(틀렸다고 하지 않음)
  FM.playable = function (entry, san) {
    var rows = entry && entry[2] || [];
    for (var j = 0; j < rows.length; j++) if (rows[j][0] === san && (rows[j][1] === 0 || rows[j][1] === 1)) return true;
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

  // ---- 주소에 수순 담기: 지도는 #e4.e5.Nf3(SAN, 체크 표시 뺌), 예전 주소 ?m=e2e4.e7e5(UCI)도 읽는다 ----
  FM.sanToHash = function (sans) { return sans.map(function (s) { return s.replace(/[+#]/g, ''); }).join('.'); };
  FM.hashToSan = function (h) {
    if (!h) return [];
    h = decodeURIComponent(h.replace(/^#/, ''));
    return h.split(/[.\s,]+/).map(function (s) { return s.replace(/[+#!?]+$/, ''); }).filter(function (s) { return /^(?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?)$/.test(s); }).slice(0, 80);
  };
  FM.lineToParam = function (ucis) { return ucis.join('.'); };
  FM.paramToLine = function (p) {
    if (!p) return [];
    return p.split('.').filter(function (u) { return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u); }).slice(0, 60);
  };
})(typeof window !== 'undefined' ? window : globalThis);
