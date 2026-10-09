/* 달력 핵심 계산(CAL). 화면(DOM)을 모른다. 브라우저에선 전역 CAL, 노드에선 require.
   - 날짜는 '하루 번호'(1970-01-01 = 0)로 다뤄 시간대·서머타임에 흔들리지 않는다(Date 객체를 쓰지 않는다).
   - 지원 범위 밖은 null을 돌려준다(조용히 틀리지 않는다). 범위는 CAL.support.
   - 한국 공휴일: 「관공서의 공휴일에 관한 규정」 제2조·제3조(2026-04-30 개정)를 옮긴 규칙. 2025년은 표.
   - 미국 공휴일·음력·절기 표는 data.js(자동 생성). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'));
  else root.CAL = factory(root.CAL_DATA);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';

  // ---------- 날짜 기본 ----------
  function dn(y, m, d) {
    y -= m <= 2 ? 1 : 0;
    var era = Math.floor(y / 400), yoe = y - era * 400;
    var doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
    return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
  }
  function fromDn(z) {
    z += 719468;
    var era = Math.floor(z / 146097), doe = z - era * 146097;
    var yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    var mp = Math.floor((5 * doy + 2) / 153), d = doy - Math.floor((153 * mp + 2) / 5) + 1, m = mp < 10 ? mp + 3 : mp - 9;
    return [yoe + era * 400 + (m <= 2 ? 1 : 0), m, d];
  }
  function wdN(n) { return ((n + 4) % 7 + 7) % 7; }            // 0 = 일요일
  function wd(y, m, d) { return wdN(dn(y, m, d)); }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function dim(y, m) { return m === 2 ? (isLeap(y) ? 29 : 28) : [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
  function isInt(v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v; }
  function valid(y, m, d) { return isInt(y) && isInt(m) && isInt(d) && m >= 1 && m <= 12 && d >= 1 && d <= dim(y, m); }
  function p2(v) { return (v < 10 ? '0' : '') + v; }
  function iso(y, m, d) { return y + '-' + p2(m) + '-' + p2(d); }
  function isoN(n) { var a = fromDn(n); return iso(a[0], a[1], a[2]); }
  function parse(s) {
    var t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!t) return null;
    var a = [+t[1], +t[2], +t[3]];
    return valid(a[0], a[1], a[2]) ? a : null;
  }

  // ---------- 주차 ----------
  // ISO 8601: 월요일 시작, 그 해 첫 목요일이 든 주가 1주차(연초·연말은 앞뒤 해의 주차가 될 수 있다).
  function isoWeek(y, m, d) {
    var n = dn(y, m, d), thu = n - (wdN(n) + 6) % 7 + 3, ty = fromDn(thu)[0];
    return { year: ty, week: Math.floor((thu - dn(ty, 1, 1)) / 7) + 1 };
  }
  // 미국식: 일요일 시작, 1월 1일이 든 주가 1주차(해를 넘기지 않는다. 12월 말은 53~54주차).
  function usWeek(y, m, d) {
    var j1 = dn(y, 1, 1);
    return Math.floor((dn(y, m, d) - j1 + wdN(j1)) / 7) + 1;
  }
  // 한 달을 주 단위 줄로. weekStart: 0 일요일, 1 월요일. 빈 칸은 0.
  function monthGrid(y, m, weekStart) {
    var lead = (wd(y, m, 1) - (weekStart ? 1 : 0) + 7) % 7, n = dim(y, m), rows = [], row = [], i;
    for (i = 0; i < lead; i++) row.push(0);
    for (i = 1; i <= n; i++) { row.push(i); if (row.length === 7) { rows.push(row); row = []; } }
    if (row.length) { while (row.length < 7) row.push(0); rows.push(row); }
    return rows;
  }

  // ---------- 음력 ----------
  var L = D.lunar, lcache = {};
  function lyear(y) {
    if (!isInt(y) || y < L.first || y > L.last) return null;
    if (lcache[y]) return lcache[y];
    var r = L.years[y - L.first], n = r[1] ? 13 : 12, ms = [], s = dn(y, Math.floor(r[0] / 100), r[0] % 100), num = 0;
    for (var i = 0; i < n; i++) {
      var leap = r[1] > 0 && i === r[1];      // 윤달은 같은 번호 평달 바로 뒤
      if (!leap) num++;
      var len = (r[2] >> i) & 1 ? 30 : 29;
      ms.push({ m: num, leap: leap, days: len, start: s });
      s += len;
    }
    return (lcache[y] = { months: ms, start: ms[0].start, end: s, leapMonth: r[1] });
  }
  var lunarMin = lyear(L.first).start, lunarMax = lyear(L.last).end - 1;
  function lunarOfN(n) {
    if (n < lunarMin || n > lunarMax) return null;
    var y = fromDn(n)[0], ly = lyear(y);
    if (!ly || n < ly.start) { y -= 1; ly = lyear(y); }
    if (!ly) return null;
    for (var i = ly.months.length - 1; i >= 0; i--) {
      var mo = ly.months[i];
      if (n >= mo.start) return { y: y, m: mo.m, d: n - mo.start + 1, leap: mo.leap, days: mo.days };
    }
    return null;
  }
  function lunarFromSolar(y, m, d) { return valid(y, m, d) ? lunarOfN(dn(y, m, d)) : null; }
  function lunarToN(ly, lm, ld, leap) {
    var t = lyear(ly);
    if (!t || !isInt(lm) || !isInt(ld) || ld < 1) return null;
    for (var i = 0; i < t.months.length; i++) {
      var mo = t.months[i];
      if (mo.m === lm && mo.leap === !!leap) return ld <= mo.days ? mo.start + ld - 1 : null;
    }
    return null;                                // 그 해에 없는 윤달
  }
  function lunarToSolar(ly, lm, ld, leap) { var n = lunarToN(ly, lm, ld, leap); return n === null ? null : fromDn(n); }
  // 음력 해의 달 목록(달, 윤달, 크기, 양력 1일)
  function lunarMonths(ly) {
    var t = lyear(ly);
    return t ? t.months.map(function (mo) { return { m: mo.m, leap: mo.leap, days: mo.days, start: fromDn(mo.start) }; }) : null;
  }
  // 손 없는 날: 음력 날짜 끝자리가 9·0 (9, 10, 19, 20, 29, 30일). 전해 오는 풍습이라 공식 기준은 없다.
  function sonDay(lunarDay) { return lunarDay % 10 === 9 || lunarDay % 10 === 0; }
  function isSon(y, m, d) { var l = lunarFromSolar(y, m, d); return l ? sonDay(l.d) : null; }

  // ---------- 24절기·그 밖의 날 (공식 자료가 있는 해만) ----------
  function terms(year) {
    var t = D.terms[year];
    return t ? t.map(function (r, i) { return { name: D.termNames[i], m: r[0], d: r[1], h: r[2], min: r[3] }; }) : null;
  }
  function termOn(y, m, d) {
    var t = D.terms[y];
    if (!t) return null;
    for (var i = 0; i < t.length; i++) if (t[i][0] === m && t[i][1] === d) return D.termNames[i];
    return '';
  }
  function others(year) {
    var t = D.others[year];
    return t ? t.map(function (r, i) { return { name: D.otherNames[i], m: r[0], d: r[1] }; }) : null;
  }

  // ---------- 한국 공휴일 ----------
  var KR_MIN = 2025, KR_RULE_FROM = 2026, KR_MAX = L.last;
  var KR_OFFICIAL = [2026, 2027];   // 월력요항이 발표된 해
  var KR_PROVISIONAL = [2028];      // 천문연 달력자료는 있으나 월력요항 발표 전
  var KR_EN = {
    '1월 1일': "New Year's Day", '설날 전날': 'Day before Seollal', '설날': 'Seollal (Lunar New Year)', '설날 다음 날': 'Day after Seollal',
    '3·1절': 'Independence Movement Day', '노동절': 'Labor Day', '어린이날': "Children's Day", '부처님오신날': "Buddha's Birthday",
    '현충일': 'Memorial Day', '제헌절': 'Constitution Day', '광복절': 'Liberation Day', '추석 전날': 'Day before Chuseok',
    '추석': 'Chuseok', '추석 다음 날': 'Day after Chuseok', '개천절': 'National Foundation Day', '한글날': 'Hangeul Day',
    '기독탄신일': 'Christmas Day'
  };
  var KR_SHORT = {  // 달력 칸에 쓰는 짧은 이름
    '1월 1일': '신정', '설날 전날': '설 연휴', '설날 다음 날': '설 연휴', '3·1절': '삼일절', '추석 전날': '추석 연휴', '추석 다음 날': '추석 연휴',
    '기독탄신일': '성탄절', '전국동시지방선거': '지방선거', '국회의원선거일': '국회의원 선거', '대통령선거일': '대통령 선거'
  };
  function krLabel(name) {
    return name.split('; ').map(function (n) { return n.indexOf('대체공휴일') === 0 ? '대체공휴일' : (KR_SHORT[n] || n); })
      .filter(function (n, i, a) { return a.indexOf(n) === i; }).join('·');
  }
  function krKind(name) {
    if (name.indexOf('대체공휴일') === 0) return 'substitute';
    if (name.indexOf('선거') >= 0) return 'election';
    if (name.indexOf('임시공휴일') >= 0) return 'temporary';
    return 'holiday';
  }

  // 규칙 엔진. 분류: A = 토·일요일 또는 다른 공휴일과 겹치면 대체(국경일·부처님오신날·노동절·어린이날·기독탄신일)
  //                 F = 일요일 또는 다른 공휴일과 겹치면 대체(설·추석 연휴), N = 대체 없음(1월 1일·현충일), X = 선거일·수시 지정
  function krRule(y) {
    var ny = lunarToN(y, 1, 1, false), bu = lunarToN(y, 4, 8, false), ch = lunarToN(y, 8, 15, false);
    if (y < KR_RULE_FROM || ny === null || bu === null || ch === null) return null;
    var H = {}, order = [];
    function add(n, name, cls, group) {
      if (!H[n]) { H[n] = []; order.push(n); }
      H[n].push({ name: name, cls: cls, group: group || name });
    }
    // 음력으로 정하는 날을 먼저(겹칠 때 이름 순서: '추석; 개천절')
    add(ny - 1, '설날 전날', 'F', '설날'); add(ny, '설날', 'F', '설날'); add(ny + 1, '설날 다음 날', 'F', '설날');
    add(bu, '부처님오신날', 'A');
    add(ch - 1, '추석 전날', 'F', '추석'); add(ch, '추석', 'F', '추석'); add(ch + 1, '추석 다음 날', 'F', '추석');
    add(dn(y, 1, 1), '1월 1일', 'N');
    add(dn(y, 3, 1), '3·1절', 'A');
    add(dn(y, 5, 1), '노동절', 'A');           // 2026-05-01 시행
    add(dn(y, 5, 5), '어린이날', 'A');
    add(dn(y, 6, 6), '현충일', 'N');
    add(dn(y, 7, 17), '제헌절', 'A');          // 2026-05-11 시행(2026년부터)
    add(dn(y, 8, 15), '광복절', 'A');
    add(dn(y, 10, 3), '개천절', 'A');
    add(dn(y, 10, 9), '한글날', 'A');
    add(dn(y, 12, 25), '기독탄신일', 'A');
    var extraEn = {};
    Object.keys(D.krExtra).forEach(function (k) {
      if (+k.slice(0, 4) !== y) return;
      var a = parse(k);
      add(dn(a[0], a[1], a[2]), D.krExtra[k][0], 'X');
      extraEn[D.krExtra[k][0]] = D.krExtra[k][1];
    });
    order.sort(function (a, b) { return a - b; });

    // 제3조: 대체공휴일 = 그 공휴일 다음의 첫 번째 비공휴일. 대체공휴일끼리 겹치거나 토요일이면 그다음 비공휴일.
    var subs = {}, subOrder = [];
    function isHoliday(n) { return wdN(n) === 0 || !!H[n]; }   // 제2조 각 호(일요일 포함)
    function place(n, groups) {
      var t = n + 1;
      while (isHoliday(t) || subs[t] || wdN(t) === 6) t++;
      subs[t] = groups; subOrder.push(t);
    }
    order.forEach(function (n) {
      var list = H[n], w = wdN(n);
      var A = list.filter(function (h) { return h.cls === 'A'; });
      var F = list.filter(function (h) { return h.cls === 'F'; });
      var counted = list.filter(function (h) { return h.cls !== 'X'; });   // 제2호~제10호
      if (w === 0 || w === 6) {
        A.forEach(function (h) { place(n, [h.group]); });                   // 제1항 제1호
        if (w === 0 && F.length) place(n, [F[0].group]);                    // 제1항 제2호
      } else if (counted.length > 1 && (A.length || F.length)) {           // 제1항 제3호
        var g = [];
        F.concat(A).forEach(function (h) { if (g.indexOf(h.group) < 0) g.push(h.group); });
        place(n, g);
      }
    });

    var items = [];
    order.forEach(function (n) {
      var names = H[n].map(function (h) { return h.name; });
      items.push({ n: n, names: names, kind: H[n][0].cls === 'X' ? krKind(names[0]) : 'holiday',
        en: names.map(function (x) { return KR_EN[x] || extraEn[x] || x; }).join('; ') });
    });
    subOrder.forEach(function (n) {
      items.push({ n: n, names: ['대체공휴일(' + subs[n].join('·') + ')'], kind: 'substitute', of: subs[n],
        en: 'Substitute holiday (' + subs[n].map(function (x) { return (KR_EN[x] || x).replace(/ \(.*\)$/, ''); }).join(', ') + ')' });
    });
    return items;
  }

  function krTable(y) {
    var t = D.krFixed[y];
    if (!t) return null;
    return Object.keys(t).map(function (k) {
      var name = t[k][0];
      return { n: dn(y, +k.slice(0, 2), +k.slice(3)), names: name.split('; '), kind: krKind(name), en: t[k][1] };
    });
  }

  function usTable(y) {
    if (y < D.usYears[0] || y > D.usYears[1]) return null;
    var out = [];
    Object.keys(D.us).forEach(function (k) {
      if (+k.slice(0, 4) !== y) return;
      var a = parse(k), en = D.us[k][0];
      out.push({ n: dn(a[0], a[1], a[2]), names: [D.us[k][1]], kind: /\(observed\)/.test(en) ? 'substitute' : 'holiday', en: en });
    });
    return out;
  }

  var hcache = {};
  /* 공휴일 목록. country: 'KR' | 'US'. 범위 밖이면 null.
     basis: 'official'(공식 발표) · 'provisional'(공식 발표 전 자료) · 'rule'(규칙으로 계산, 선거일·임시공휴일 없음) · 'table'(확정 표) */
  function holidays(country, year) {
    var key = country + year;
    if (key in hcache) return hcache[key];
    var items = null, basis = null;
    if (isInt(year)) {
      if (country === 'KR' && year >= KR_MIN && year <= KR_MAX) {
        if (year < KR_RULE_FROM) { items = krTable(year); basis = 'table'; }
        else {
          items = krRule(year);
          basis = KR_OFFICIAL.indexOf(year) >= 0 ? 'official' : KR_PROVISIONAL.indexOf(year) >= 0 ? 'provisional' : 'rule';
        }
      } else if (country === 'US') { items = usTable(year); basis = 'table'; }
    }
    if (!items) return (hcache[key] = null);
    items.sort(function (a, b) { return a.n - b.n; });
    var byDate = {};
    var list = items.map(function (it) {
      var a = fromDn(it.n), o = {
        date: iso(a[0], a[1], a[2]), y: a[0], m: a[1], d: a[2], wd: wdN(it.n), name: it.names.join('; '), names: it.names,
        label: country === 'KR' ? krLabel(it.names.join('; ')) : it.names.join('; '), en: it.en, kind: it.kind
      };
      if (it.of) o.of = it.of;
      byDate[o.date] = o;
      return o;
    });
    return (hcache[key] = { country: country, year: year, basis: basis, list: list, byDate: byDate });
  }
  function holidayOn(country, y, m, d) {
    var h = holidays(country, y);
    return h ? (h.byDate[iso(y, m, d)] || false) : null;
  }
  // 쉬는 날인가(토·일요일 또는 공휴일). 공휴일 표가 없는 해는 주말만 본다.
  function isOffN(country, n) {
    var w = wdN(n);
    if (w === 0 || w === 6) return true;
    var a = fromDn(n), h = holidays(country, a[0]);
    return !!(h && h.byDate[iso(a[0], a[1], a[2])]);
  }

  // ---------- 연휴 ----------
  // 토·일요일과 공휴일이 이어진 minLen일 이상 구간. 해를 넘는 구간은 걸친 해 양쪽에 다 나온다.
  function breaks(country, year, minLen) {
    if (!holidays(country, year)) return null;
    minLen = minLen || 3;
    var a = dn(year, 1, 1), b = dn(year, 12, 31), out = [], n = a;
    while (isOffN(country, n - 1)) n--;          // 전해에서 이어진 구간
    while (n <= b) {
      if (!isOffN(country, n)) { n++; continue; }
      var s = n, names = [];
      while (isOffN(country, n)) {
        var t = fromDn(n), h = holidays(country, t[0]), it = h && h.byDate[iso(t[0], t[1], t[2])];
        if (it) names.push(it.name);
        n++;
      }
      if (n - s >= minLen) out.push({ from: isoN(s), to: isoN(n - 1), days: n - s, names: names });
    }
    return out;
  }
  // 연차를 끼우면 이어지는 날: 쉬는 구간 사이에 낀 평일 1~maxLeave일.
  function bridges(country, year, maxLeave) {
    if (!holidays(country, year)) return null;
    maxLeave = maxLeave || 1;
    var a = dn(year, 1, 1), b = dn(year, 12, 31), out = [], n = a;
    while (n <= b) {
      if (isOffN(country, n) || !isOffN(country, n - 1)) { n++; continue; }
      var s = n;
      while (!isOffN(country, n)) n++;
      var gap = n - s;
      if (gap > maxLeave) continue;
      var l = s - 1, r = n;
      while (isOffN(country, l - 1)) l--;
      while (isOffN(country, r + 1)) r++;
      var leave = [];
      for (var i = s; i < n; i++) leave.push(isoN(i));
      out.push({ leave: leave, from: isoN(l), to: isoN(r), days: r - l + 1, before: s - l, after: r - n + 1 });
    }
    return out;
  }

  // ---------- 월·연 사실 ----------
  function monthFacts(country, y, m) {
    if (!isInt(y) || !isInt(m) || m < 1 || m > 12) return null;
    var n = dim(y, m), h = holidays(country, y), f = {
      year: y, month: m, days: n, weekdays: 0, saturdays: 0, sundays: 0, firstWd: wd(y, m, 1), lastWd: wd(y, m, n),
      isoWeeks: [isoWeek(y, m, 1), isoWeek(y, m, n)], usWeeks: [usWeek(y, m, 1), usWeek(y, m, n)],
      holidays: h ? [] : null, holidaysOnWeekdays: h ? 0 : null, workdays: null,
      lunar: null, terms: null, son: null
    };
    for (var d = 1; d <= n; d++) {
      var w = wd(y, m, d);
      if (w === 0) f.sundays++; else if (w === 6) f.saturdays++; else f.weekdays++;
      var it = h && h.byDate[iso(y, m, d)];
      if (it) { f.holidays.push(it); if (w !== 0 && w !== 6) f.holidaysOnWeekdays++; }
    }
    if (h) f.workdays = f.weekdays - f.holidaysOnWeekdays;
    var l1 = lunarFromSolar(y, m, 1), l2 = lunarFromSolar(y, m, n);
    if (l1 && l2) {
      f.lunar = { from: l1, to: l2 };
      f.son = [];
      for (d = 1; d <= n; d++) if (sonDay(lunarFromSolar(y, m, d).d)) f.son.push(d);
    }
    var t = terms(y);
    if (t) f.terms = t.filter(function (x) { return x.m === m; });
    return f;
  }
  function yearFacts(country, y) {
    var h = holidays(country, y);
    if (!isInt(y)) return null;
    var f = { year: y, leap: isLeap(y), days: isLeap(y) ? 366 : 365, sundays: 0, saturdays: 0, weekdays: 0,
      holidayDates: null, holidaysOnSun: null, holidaysOnSat: null, holidaysOnWeekdays: null,
      publicHolidays: null, daysOff: null, workdays: null, basis: h ? h.basis : null };
    for (var n = dn(y, 1, 1), e = dn(y, 12, 31); n <= e; n++) {
      var w = wdN(n);
      if (w === 0) f.sundays++; else if (w === 6) f.saturdays++; else f.weekdays++;
    }
    if (h) {
      f.holidayDates = h.list.length;
      f.holidaysOnSun = h.list.filter(function (x) { return x.wd === 0; }).length;
      f.holidaysOnSat = h.list.filter(function (x) { return x.wd === 6; }).length;
      f.holidaysOnWeekdays = f.holidayDates - f.holidaysOnSun - f.holidaysOnSat;
      f.publicHolidays = f.sundays + f.holidayDates - f.holidaysOnSun;       // 일요일 + 공휴일(겹친 날은 한 번)
      f.daysOff = f.publicHolidays + f.saturdays - f.holidaysOnSat;         // 주5일 기준 쉬는 날
      f.workdays = f.days - f.daysOff;
    }
    return f;
  }

  return {
    dn: dn, fromDn: fromDn, wd: wd, isLeap: isLeap, dim: dim, valid: valid, iso: iso, parse: parse,
    isoWeek: isoWeek, usWeek: usWeek, monthGrid: monthGrid,
    lunar: { fromSolar: lunarFromSolar, toSolar: lunarToSolar, months: lunarMonths, min: isoN(lunarMin), max: isoN(lunarMax),
      firstYear: L.first, lastYear: L.last, official: L.official },
    sonDay: sonDay, isSon: isSon, terms: terms, termOn: termOn, others: others,
    holidays: holidays, holidayOn: holidayOn, krLabel: krLabel,
    isOff: function (country, y, m, d) { return valid(y, m, d) ? isOffN(country, dn(y, m, d)) : null; },
    breaks: breaks, bridges: bridges, monthFacts: monthFacts, yearFacts: yearFacts,
    support: { KR: [KR_MIN, KR_MAX], US: D.usYears.slice(), terms: [2025, 2028], krOfficial: KR_OFFICIAL.slice(), krProvisional: KR_PROVISIONAL.slice() }
  };
});
