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

print((fail ? "✗ " + fail + "개 실패" : "✅ 전부 통과") + " (" + total + "개)");
if (fail) throw new Error("tests failed");
