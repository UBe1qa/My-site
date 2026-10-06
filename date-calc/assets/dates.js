// 날짜 계산 순수 로직. 화면(DOM)을 모른다. tests/run.sh 가 이 파일을 직접 시험한다.
// 날짜는 '하루 번호'(1970-01-01 = 0)로 다룬다. UTC 기준이라 서머타임에 흔들리지 않는다.
var DC = (function () {
  var DAY = 86400000;

  function fromYMD(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / DAY); }
  function toYMD(n) {
    var t = new Date(n * DAY);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // 'YYYY-MM-DD' → 하루 번호. 형식이 틀리거나 없는 날(2월 30일)이면 null.
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
    return fromYMD(y, mo, d);
  }
  function iso(n) { var t = toYMD(n); return t.y + "-" + pad(t.m) + "-" + pad(t.d); }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function daysInMonth(y, m) { return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
  // 0 = 일요일 … 6 = 토요일
  function weekday(n) { return ((n % 7) + 7 + 4) % 7; }

  // 몇 달 뒤(앞). 그 달에 같은 날이 없으면 말일로 맞춘다(1/31 + 1개월 = 2/28).
  function addMonths(n, k) {
    var t = toYMD(n);
    var idx = t.y * 12 + (t.m - 1) + k;
    var y = Math.floor(idx / 12), m = idx - y * 12 + 1;
    return fromYMD(y, m, Math.min(t.d, daysInMonth(y, m)));
  }
  function addYears(n, k) { return addMonths(n, k * 12); }

  // a부터 b까지 몇 년 몇 개월 며칠(a ≤ b). b가 앞이면 부호만 바꿔 같은 값을 준다.
  function ymd(a, b) {
    var sign = 1;
    if (b < a) { var x = a; a = b; b = x; sign = -1; }
    var ta = toYMD(a), tb = toYMD(b);
    var months = (tb.y - ta.y) * 12 + (tb.m - ta.m);
    if (addMonths(a, months) > b) months--;
    var anchor = addMonths(a, months);
    return { sign: sign, years: Math.floor(months / 12), months: months % 12, days: b - anchor, totalMonths: months };
  }

  // 두 날짜 사이. includeStart면 첫날도 1일로 센다(+1).
  function between(a, b, includeStart) {
    var days = b - a;
    var abs = Math.abs(days) + (includeStart ? 1 : 0);
    // 시작일 포함이면 끝을 하루 늘려 년·개월·일을 센다(1/1~12/31 포함 = 1년 0개월 0일, '11개월 31일'이 아니라)
    var p = includeStart ? ymd(a, days < 0 ? b - 1 : b + 1) : ymd(a, b);
    return {
      days: abs, sign: days < 0 ? -1 : 1,
      weeks: Math.floor(abs / 7), weekRest: abs % 7,
      years: p.years, months: p.months, restDays: p.days,
      totalMonths: p.totalMonths,
      hours: abs * 24
    };
  }

  // 공휴일 표
  function holidayTable(country) {
    var H = (typeof DC_HOLIDAYS !== "undefined") ? DC_HOLIDAYS : null;
    return H && H[country] ? H[country] : {};
  }
  function holidayYears() {
    var H = (typeof DC_HOLIDAYS !== "undefined") ? DC_HOLIDAYS : null;
    return H ? H.years : [0, -1];
  }
  function holidayName(n, country, langIdx) {
    var h = holidayTable(country)[iso(n)];
    return h ? h[langIdx || 0] : null;
  }
  function covered(n) {
    var y = toYMD(n).y, r = holidayYears();
    return y >= r[0] && y <= r[1];
  }
  // 영업일 = 토·일·공휴일이 아닌 날. country가 'none'이면 주말만 뺀다.
  function isBusinessDay(n, country) {
    var w = weekday(n);
    if (w === 0 || w === 6) return false;
    if (country && country !== "none" && holidayTable(country)[iso(n)]) return false;
    return true;
  }

  // a~b 영업일 수. b는 늘 포함, a는 includeStart일 때만. 순서가 거꾸로면 바꿔서 센다.
  function businessDays(a, b, country, includeStart) {
    if (b < a) { var x = a; a = b; b = x; }
    var start = includeStart ? a : a + 1;
    var count = 0, weekend = 0, holidays = [], allCovered = true;
    for (var n = start; n <= b; n++) {
      var w = weekday(n);
      if (country !== "none" && !covered(n)) allCovered = false;
      if (w === 0 || w === 6) { weekend++; continue; }
      var name = country !== "none" ? holidayTable(country)[iso(n)] : null;
      if (name) { holidays.push({ day: n, name: name }); continue; }
      count++;
    }
    return { business: count, calendar: Math.max(0, b - start + 1), weekend: weekend, holidays: holidays, covered: allCovered };
  }

  // a에서 k영업일 뒤(k<0이면 앞). a 자신은 세지 않는다.
  function addBusinessDays(a, k, country) {
    var step = k < 0 ? -1 : 1, left = Math.abs(k), n = a, allCovered = true, guard = 0;
    while (left > 0 && guard++ < 100000) {
      n += step;
      if (country !== "none" && !covered(n)) allCovered = false;
      if (isBusinessDay(n, country)) left--;
    }
    return { day: n, covered: allCovered };
  }

  // 만 나이와 생일 정보. 2월 29일생은 평년에 2월 28일을 생일로 본다.
  function age(birth, today) {
    if (today < birth) return null;
    var p = ymd(birth, today);
    var tb = toYMD(birth), tt = toYMD(today);
    var next = addYears(birth, p.years + 1);
    var thisYear = addYears(birth, tt.y - tb.y);
    return {
      full: p.years, months: p.months, days: p.days,
      counting: tt.y - tb.y + 1,           // 세는 나이(옛 방식)
      yearAge: tt.y - tb.y,                // 연 나이(병역·청소년 보호법 등)
      lived: today - birth,
      nextBirthday: next, toNext: next - today,
      birthdayToday: thisYear === today && today !== birth
    };
  }

  // 기념일 목록. dayOne이면 시작일을 1일째로 센다(한국식 100일 = 시작일 + 99일).
  function anniversaries(start, dayOne) {
    var list = [], off = dayOne ? 1 : 0;
    var counts = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 3000, 5000, 10000];
    for (var i = 0; i < counts.length; i++) list.push({ kind: "days", n: counts[i], day: start + counts[i] - off });
    for (var y = 1; y <= 10; y++) list.push({ kind: "years", n: y, day: addYears(start, y) });
    list.sort(function (p, q) { return p.day - q.day || (p.kind === "years" ? -1 : 1); });
    return list;
  }

  // ISO 8601 주차(월요일 시작, 그해 첫 목요일이 있는 주가 1주)
  function isoWeek(n) {
    var w = weekday(n) || 7;
    var thursday = n + 4 - w;
    var y = toYMD(thursday).y;
    return { year: y, week: Math.floor((thursday - fromYMD(y, 1, 1)) / 7) + 1 };
  }
  function dayOfYear(n) { var y = toYMD(n).y; return n - fromYMD(y, 1, 1) + 1; }
  function daysInYear(y) { return isLeap(y) ? 366 : 365; }
  // 그 달의 몇째 주(그 달 1일이 든 주 = 1주, 일요일 시작)
  function weekOfMonth(n) {
    var t = toYMD(n), first = fromYMD(t.y, t.m, 1);
    return Math.floor((t.d - 1 + weekday(first)) / 7) + 1;
  }

  // 두 시각 사이(분). 'YYYY-MM-DDTHH:MM' 로컬 시각. 서머타임은 브라우저가 반영한다.
  function parseLocal(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(s || "").trim());
    if (!m) return null;
    if (parse(m[1] + "-" + m[2] + "-" + m[3]) === null || +m[4] > 23 || +m[5] > 59) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
  }
  function timeDiff(t1, t2) {
    var mins = Math.round((t2 - t1) / 60000), sign = mins < 0 ? -1 : 1;
    mins = Math.abs(mins);
    return { sign: sign, totalMinutes: mins, totalHours: mins / 60, days: Math.floor(mins / 1440), hours: Math.floor(mins % 1440 / 60), minutes: mins % 60 };
  }

  // 그해 공휴일 목록
  function holidaysOfYear(y, country) {
    var t = holidayTable(country), out = [];
    for (var k in t) if (k.slice(0, 4) === String(y)) out.push({ day: parse(k), names: t[k] });
    out.sort(function (p, q) { return p.day - q.day; });
    return out;
  }

  return {
    fromYMD: fromYMD, toYMD: toYMD, parse: parse, iso: iso, isLeap: isLeap, daysInMonth: daysInMonth,
    weekday: weekday, addMonths: addMonths, addYears: addYears, ymd: ymd, between: between,
    holidayName: holidayName, covered: covered, holidayYears: holidayYears, isBusinessDay: isBusinessDay,
    businessDays: businessDays, addBusinessDays: addBusinessDays, age: age, anniversaries: anniversaries,
    isoWeek: isoWeek, dayOfYear: dayOfYear, daysInYear: daysInYear, weekOfMonth: weekOfMonth,
    parseLocal: parseLocal, timeDiff: timeDiff, holidaysOfYear: holidaysOfYear
  };
})();
