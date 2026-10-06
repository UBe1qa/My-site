// jsc(맥 기본 JavaScriptCore)로 돈다: tests/run.sh
load("assets/holidays.js"); load("assets/dates.js");
var C = JSON.parse(read("tests/cases.json")), fail = 0, total = 0;
function eq(name, got, want, ctx) {
  total++;
  if (JSON.stringify(got) !== JSON.stringify(want)) { fail++; if (fail < 30) print("✗ " + name + " " + JSON.stringify(ctx) + " got " + JSON.stringify(got) + " want " + JSON.stringify(want)); }
}
var P = DC.parse;
C.between.forEach(function (c) {
  var a = P(c[0]), b = P(c[1]);
  eq("days", b - a, c[2], c);
  var r = DC.ymd(a, b); eq("ymd", [r.years, r.months, r.days], [c[3], c[4], c[5]], c);
});
C.addMonths.forEach(function (c) { eq("addMonths", DC.iso(DC.addMonths(P(c[0]), c[1])), c[2], c); });
C.weekday.forEach(function (c) { eq("weekday", DC.weekday(P(c[0])), c[1], c); });
C.isoWeek.forEach(function (c) { var w = DC.isoWeek(P(c[0])); eq("isoWeek", [w.year, w.week], [c[1], c[2]], c); });
C.dayOfYear.forEach(function (c) { eq("dayOfYear", DC.dayOfYear(P(c[0])), c[1], c); });
C.business.forEach(function (c) { eq("business", DC.businessDays(P(c[0]), P(c[1]), c[2], c[3]).business, c[4], c); });
C.addBusiness.forEach(function (c) { eq("addBusiness", DC.iso(DC.addBusinessDays(P(c[0]), c[1], c[2]).day), c[3], c); });
C.age.forEach(function (c) { eq("age", DC.age(P(c[0]), P(c[1])).full, c[2], c); });

// 손으로 확인한 사례
eq("영상 사례: 2026-10-01~10 한국 영업일(시작일 포함)", DC.businessDays(P("2026-10-01"), P("2026-10-10"), "KR", true).business, 5);
eq("미국은 같은 기간 7영업일", DC.businessDays(P("2026-10-01"), P("2026-10-10"), "US", true).business, 7);
eq("2025-01-10은 금요일", DC.weekday(P("2025-01-10")), 5);
eq("한국식 100일: 2026-01-01 시작 → 4월 10일", DC.iso(DC.anniversaries(P("2026-01-01"), true)[0].day), "2026-04-10");
eq("시작일 포함 +1", DC.between(P("2026-10-03"), P("2026-10-03"), true).days, 1);
eq("없는 날은 null", DC.parse("2025-02-29"), null);
eq("형식 틀림 null", DC.parse("2025-2-1"), null);
eq("1/31 + 1개월 = 2/28", DC.iso(DC.addMonths(P("2025-01-31"), 1)), "2025-02-28");
eq("표 밖 연도는 covered=false", DC.businessDays(P("2040-01-01"), P("2040-01-10"), "KR", true).covered, false);
eq("표 안 연도는 covered=true", DC.businessDays(P("2026-01-01"), P("2026-01-10"), "KR", true).covered, true);
eq("주말만 빼기는 covered 상관없음", DC.businessDays(P("2040-01-01"), P("2040-01-10"), "none", true).covered, true);
eq("공휴일 이름", DC.holidayName(P("2026-10-05"), "KR", 0), "개천절 대체 휴일");
eq("그 달 몇째 주: 2026-10-03(토)", DC.weekOfMonth(P("2026-10-03")), 1);
eq("그 달 몇째 주: 2026-10-04(일)", DC.weekOfMonth(P("2026-10-04")), 2);
var td = DC.timeDiff(DC.parseLocal("2026-10-03T09:00"), DC.parseLocal("2026-10-04T18:30"));
eq("시간 차이", [td.days, td.hours, td.minutes, td.totalMinutes], [1, 9, 30, 2010]);
eq("시각 형식 틀림", DC.parseLocal("2026-10-03T25:00"), null);
eq("1900·2100년은 평년", [DC.isLeap(1900), DC.isLeap(2100), DC.isLeap(2000), DC.parse("2100-02-29")], [false, false, true, null]);
eq("생일 전엔 null", DC.age(P("2026-10-04"), P("2026-10-03")), null);

// 가이드 글(tools/build_guides.py)에 적은 예시 숫자
eq("가이드: 10/3~12/25", [DC.between(P("2026-10-03"), P("2026-12-25"), false).days, DC.between(P("2026-10-03"), P("2026-12-25"), true).days], [83, 84]);
eq("가이드: 1/1~12/31", DC.between(P("2026-01-01"), P("2026-12-31"), false).days, 364);
(function () { var r = DC.between(P("2026-01-01"), P("2026-12-31"), true); eq("시작일 포함 1/1~12/31 = 1년 0개월 0일", [r.days, r.years, r.months, r.restDays], [365, 1, 0, 0]); })();
(function () { var r = DC.between(P("2026-10-01"), P("2026-10-03"), true); eq("시작일 포함 10/1~10/3 = 3일", [r.years, r.months, r.restDays], [0, 0, 3]); })();
var g1 = DC.ymd(P("2026-03-01"), P("2026-04-15")), g2 = DC.ymd(P("2026-01-31"), P("2026-03-01"));
eq("가이드: 개월 환산", [g1.months, g1.days, g2.months, g2.days], [1, 14, 1, 1]);
var a1 = DC.age(P("2000-05-15"), P("2026-10-03")), a2 = DC.age(P("2000-12-20"), P("2026-10-03"));
eq("가이드: 나이 표", [a1.full, a1.yearAge, a1.counting, a2.full, a2.yearAge, a2.counting], [26, 26, 27, 25, 26, 27]);
eq("가이드: 살아온 날(빼기)", a1.lived, 9637);
var b = DC.businessDays(P("2026-10-01"), P("2026-10-31"), "KR", true);
eq("가이드: 2026년 10월 영업일", [b.business, b.weekend, b.holidays.length], [20, 9, 2]);
eq("가이드: 2026년 11월 미국·한국 영업일", [DC.businessDays(P("2026-11-01"), P("2026-11-30"), "US", true).business, DC.businessDays(P("2026-11-01"), P("2026-11-30"), "KR", true).business], [19, 21]);
eq("가이드: N영업일 뒤", [DC.iso(DC.addBusinessDays(P("2026-10-02"), 5, "KR").day), DC.iso(DC.addBusinessDays(P("2026-09-22"), 3, "KR").day)], ["2026-10-13", "2026-09-29"]);
var an = DC.anniversaries(P("2026-01-01"), true).filter(function (x) { return x.kind === "days" && [100, 200, 300, 500, 1000].indexOf(x.n) >= 0; }).map(function (x) { return DC.iso(x.day); });
eq("가이드: 기념일 표", an, ["2026-04-10", "2026-07-19", "2026-10-27", "2027-05-15", "2028-09-26"]);
eq("가이드: 빼기 방식 100일", DC.iso(DC.anniversaries(P("2026-01-01"), false)[0].day), "2026-04-11");
eq("가이드: 대체공휴일 2026", ["2026-03-02", "2026-05-25", "2026-08-17", "2026-10-05"].map(function (d) { return !!DC.holidayName(P(d), "KR", 0); }), [true, true, true, true]);
eq("가이드: 추석·현충일 토요일엔 대체 없음", [DC.holidayName(P("2026-09-28"), "KR", 0), DC.holidayName(P("2026-06-08"), "KR", 0)], [null, null]);
eq("가이드: 2027 대체공휴일", ["2027-02-09", "2027-08-16", "2027-10-04", "2027-10-11", "2027-12-27"].map(function (d) { return !!DC.holidayName(P(d), "KR", 0); }), [true, true, true, true, true]);


// 영어 가이드 글(tools/build_en.py)에 적은 예시 숫자. 글을 고치면 여기도 같이 고친다
var iso = DC.iso, wdn = function (s) { return DC.weekday(P(s)); }, bt = function (a, b, inc) { return DC.between(P(a), P(b), inc).days; };
// days-between-dates
eq("Guide (en): Oct 5 to Dec 25, 2026", [bt("2026-10-05", "2026-12-25", false), bt("2026-10-05", "2026-12-25", true), wdn("2026-12-25")], [81, 82, 5]);
eq("Guide (en): June 1 to June 5", [bt("2026-06-01", "2026-06-05", false), bt("2026-06-01", "2026-06-05", true)], [4, 5]);
eq("Guide (en): countdown Dec 24 = 1, Dec 25 = 0", [P("2026-12-25") - P("2026-12-24"), P("2026-12-25") - P("2026-12-25")], [1, 0]);
var e1 = DC.between(P("2026-10-05"), P("2026-12-25"), false), e2 = DC.ymd(P("2026-10-05"), P("2026-12-25"));
eq("Guide (en): 81 days = 11 weeks 4 days = 2 months 20 days", [e1.weeks, e1.weekRest, e2.months, e2.days], [11, 4, 2, 20]);
var e3 = DC.ymd(P("2026-03-01"), P("2026-04-15"));
eq("Guide (en): Mar 1 to Apr 15, 2026 = 45 days = 1 month 14 days", [bt("2026-03-01", "2026-04-15", false), e3.months, e3.days], [45, 1, 14]);
eq("Guide (en): Feb 1 to Mar 1 in 2026 and 2028", [bt("2026-02-01", "2026-03-01", false), bt("2028-02-01", "2028-03-01", false)], [28, 29]);
eq("Guide (en): whole year 2026 and 2028", [bt("2026-01-01", "2026-12-31", false), bt("2026-01-01", "2026-12-31", true), bt("2028-01-01", "2028-12-31", false), bt("2028-01-01", "2028-12-31", true)], [364, 365, 365, 366]);
eq("Guide (en): leap rule 2000 and 2100", [DC.isLeap(2000), DC.isLeap(2100)], [true, false]);
eq("Guide (en): DAYS example Feb 1 to Mar 15, 2021", bt("2021-02-01", "2021-03-15", false), 42);
// business-days
eq("Guide (en): 5 US business days after Wed Nov 25, 2026", [wdn("2026-11-25"), iso(DC.addBusinessDays(P("2026-11-25"), 5, "US").day), wdn("2026-12-03")], [3, "2026-12-03", 4]);
eq("Guide (en): without the holiday it would be Dec 2", iso(DC.addBusinessDays(P("2026-11-25"), 5, "none").day), "2026-12-02");
eq("Guide (en): Thanksgiving skipped, Nov 27 is a business day", [!!DC.holidayName(P("2026-11-26"), "US", 1), DC.isBusinessDay(P("2026-11-27"), "US")], [true, true]);
eq("Guide (en): 3 business days after Mon Oct 5, 2026", [wdn("2026-10-05"), iso(DC.addBusinessDays(P("2026-10-05"), 3, "US").day)], [1, "2026-10-08"]);
var j = DC.businessDays(P("2026-07-01"), P("2026-07-31"), "US", true), n = DC.businessDays(P("2026-11-01"), P("2026-11-30"), "US", true);
eq("Guide (en): July 2026 = 31 days, 8 weekend, 23 weekdays, 22 business days", [j.calendar, j.weekend, j.calendar - j.weekend, j.business, j.holidays.map(function (h) { return iso(h.day); })], [31, 8, 23, 22, ["2026-07-03"]]);
eq("Guide (en): November 2026 = 21 weekdays, 19 business days", [n.calendar - n.weekend, n.business, n.holidays.map(function (h) { return iso(h.day); }), wdn("2026-11-11"), wdn("2026-11-26")], [21, 19, ["2026-11-11", "2026-11-26"], 3, 4]);
var x = DC.addBusinessDays(P("2026-12-18"), 10, "US").day;
eq("Guide (en): 10 business days after Fri Dec 18, 2026", [wdn("2026-12-18"), iso(x), DC.weekday(x), x - P("2026-12-18"), wdn("2026-12-25"), wdn("2027-01-01")], [5, "2027-01-05", 2, 18, 5, 5]);
// federal-holidays-observed
var obs = [["2026-07-04", "2026-07-03"], ["2027-06-19", "2027-06-18"], ["2027-07-04", "2027-07-05"], ["2027-12-25", "2027-12-24"], ["2028-01-01", "2027-12-31"], ["2028-11-11", "2028-11-10"]];
eq("Guide (en): weekend holidays 2026-2028 and their observed days", obs.map(function (o) { return [wdn(o[0]), wdn(o[1]), /\(observed\)$/.test(DC.holidayName(P(o[1]), "US", 1) || "")]; }),
  [[6, 5, true], [6, 5, true], [0, 1, true], [6, 5, true], [6, 5, true], [6, 5, true]]);
// 2026–2028에 주말에 걸린 고정일 공휴일이 위 6개뿐인지
var fixed = ["01-01", "06-19", "07-04", "11-11", "12-25"], wk = [];
[2026, 2027, 2028].forEach(function (y) { fixed.forEach(function (md) { var w = wdn(y + "-" + md); if (w === 0 || w === 6) wk.push(y + "-" + md); }); });
eq("Guide (en): only those six fall on a weekend", wk, obs.map(function (o) { return o[0]; }).sort());
var weekdayHol = function (y) { return DC.businessDays(P(y + "-01-01"), P(y + "-12-31"), "US", true).holidays.length; };
eq("Guide (en): weekday federal holidays 2027 = 12, 2028 = 10", [weekdayHol(2027), weekdayHol(2028)], [12, 10]);
eq("Guide (en): week of June 29, 2026 has 4 business days", DC.businessDays(P("2026-06-29"), P("2026-07-03"), "US", true).business, 4);
eq("Guide (en): Inauguration Day 2029, Dec 24/26 2025 (executive order) and the day after Thanksgiving are not in the table", [DC.holidayName(P("2029-01-20"), "US", 1), DC.holidayName(P("2025-12-24"), "US", 1), DC.holidayName(P("2025-12-26"), "US", 1), DC.holidayName(P("2026-11-27"), "US", 1)], [null, null, null, null]);
// adding-months
var am = function (s, k) { return iso(DC.addMonths(P(s), k)); };
eq("Guide (en): add-months table", [am("2026-01-31", 1), am("2028-01-31", 1), am("2026-03-31", 1), am("2026-08-31", 6), am("2028-02-29", 12), am("2026-03-31", -1)],
  ["2026-02-28", "2028-02-29", "2026-04-30", "2027-02-28", "2029-02-28", "2026-02-28"]);
eq("Guide (en): one month twice vs two months", [am(am("2026-01-31", 1), 1), am("2026-01-31", 2), am(am("2026-03-31", -1), 1)], ["2026-03-28", "2026-03-31", "2026-03-28"]);
var fromStart = [1, 2, 3, 4, 5].map(function (k) { return am("2026-01-31", k); }), chained = [], d = "2026-01-31";
for (var k = 0; k < 5; k++) { d = am(d, 1); chained.push(d); }
eq("Guide (en): payment schedule", [fromStart, chained], [["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31", "2026-06-30"], ["2026-02-28", "2026-03-28", "2026-04-28", "2026-05-28", "2026-06-28"]]);
eq("Guide (en): days 1-28 never move", (function () { var ok = true; for (var m = 1; m <= 12; m++) for (var dd = 1; dd <= 28; dd++) for (var kk = -13; kk <= 13; kk++) { if (DC.toYMD(DC.addMonths(DC.fromYMD(2026, m, dd), kk)).d !== dd) ok = false; } return ok; })(), true);
eq("Guide (en): 30 days after Jan 31, 2026", iso(P("2026-01-31") + 30), "2026-03-02");
eq("Guide (en): Jan 28-31 are all one month before Feb 28", ["2026-01-28", "2026-01-29", "2026-01-30", "2026-01-31"].map(function (s) { var r = DC.ymd(P(s), P("2026-02-28")); return [r.months, r.days]; }), [[1, 0], [1, 0], [1, 0], [1, 0]]);
var js = new Date(2026, 0, 31); js.setMonth(1); var js16 = new Date(2016, 0, 31); js16.setMonth(1);
eq("Guide (en): JavaScript setMonth rolls over", [js.getMonth() + 1, js.getDate(), js16.getMonth() + 1, js16.getDate()], [3, 3, 3, 2]);
// exact-age
var g = DC.age(P("1990-08-15"), P("2026-10-05"));
eq("Guide (en): Aug 15, 1990 on Oct 5, 2026", [g.full, g.months, g.days, g.lived, Math.floor(g.lived / 7), g.lived % 7, DC.ymd(P("1990-08-15"), P("2026-10-05")).totalMonths, iso(g.nextBirthday), g.toNext], [36, 1, 20, 13200, 1885, 5, 433, "2027-08-15", 314]);
var h = DC.age(P("2000-01-31"), P("2026-03-01"));
eq("Guide (en): born Jan 31, 2000 on Mar 1, 2026", [h.full, h.months, h.days, DC.daysInMonth(2026, 2), 1 - 31 + 28 < 0], [26, 1, 1, 28, true]);
eq("Guide (en): Feb 29 birthday", [DC.age(P("2000-02-29"), P("2026-02-28")).full, DC.age(P("2000-02-29"), P("2026-03-01")).full, DC.age(P("2000-02-29"), P("2026-03-01")).birthdayToday, DC.age(P("2000-02-29"), P("2028-02-29")).birthdayToday], [25, 26, true, true]);
var f29 = DC.age(P("2000-02-29"), P("2026-02-28"));
eq("2월 29일생: 평년 2/28엔 아직 11개월 27일, 다음 생일 3/1", [f29.months, f29.days, DC.iso(f29.nextBirthday), f29.toNext], [11, 27, "2026-03-01", 1]);
var f29b = DC.age(P("2000-02-29"), P("2027-03-01"));
eq("2월 29일생: 평년 3/1 생일 다음 날부터 다시 셈", [f29b.full, f29b.months, f29b.days, DC.iso(DC.age(P("2000-02-29"), P("2027-03-02")).nextBirthday)], [27, 0, 0, "2028-02-29"]);
eq("Guide (en): 10,000th day", [iso(P("1990-08-15") + 10000), DC.weekday(P("1990-08-15") + 10000)], ["2017-12-31", 0]);
// iso-week-numbers
var wk2 = function (s) { var w = DC.isoWeek(P(s)); return w.year + "-W" + (w.week < 10 ? "0" : "") + w.week; };
eq("Guide (en): ISO weeks around New Year", ["2025-12-29", "2026-01-01", "2026-12-28", "2027-01-01", "2027-01-03", "2027-01-04", "2029-12-31"].map(function (s) { return [wdn(s), wk2(s)]; }),
  [[1, "2026-W01"], [4, "2026-W01"], [1, "2026-W53"], [5, "2026-W53"], [0, "2026-W53"], [1, "2027-W01"], [1, "2030-W01"]]);
eq("Guide (en): Python example, Dec 29, 2003 and Jan 4, 2004 are 2004-W01", [wk2("2003-12-29"), wk2("2004-01-04"), wdn("2004-01-01")], ["2004-W01", "2004-W01", 4]);
var y53 = [], dec28ok = true, ruleOk = true;
for (var y = 2015; y <= 2040; y++) {
  var last = DC.isoWeek(P(y + "-12-28")), max = 0;
  for (var q = DC.fromYMD(y, 1, 1); q <= DC.fromYMD(y, 12, 31); q++) { var w = DC.isoWeek(q); if (w.year === y && w.week > max) max = w.week; }
  if (last.year !== y || last.week !== max) dec28ok = false;
  if (max === 53) y53.push(y);
  var j1 = DC.weekday(DC.fromYMD(y, 1, 1));
  if ((max === 53) !== (j1 === 4 || (DC.isLeap(y) && j1 === 3))) ruleOk = false;
}
eq("Guide (en): 53-week years 2015-2040, Dec 28 rule, Thursday/leap-Wednesday rule", [y53, dec28ok, ruleOk], [[2015, 2020, 2026, 2032, 2037], true, true]);
eq("Guide (en): Oct 5, 2026 = 2nd week of October, ISO week 41", [DC.weekOfMonth(P("2026-10-05")), DC.isoWeek(P("2026-10-05")).week], [2, 41]);

print((fail ? "✗ " + fail + "개 실패" : "✅ 전부 통과") + " (" + total + "개)");
if (fail) throw new Error("tests failed");
