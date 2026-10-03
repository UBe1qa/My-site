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

print((fail ? "✗ " + fail + "개 실패" : "✅ 전부 통과") + " (" + total + "개)");
if (fail) throw new Error("tests failed");
