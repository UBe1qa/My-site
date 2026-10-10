// 빌드가 쓰는 계산값: node salary/_dev/calc.mjs  → JSON(표준 출력)
// 화면·글에 들어가는 모든 숫자는 여기서(= 자료 파일 pay-data.js·gani-2026.js 와 로직 pay-core.js 에서) 나온다.
// build.py 는 이 JSON 만 쓴다. 글에 손으로 숫자를 적지 않는다. tests/site.mjs 가 만든 페이지의 숫자를 이 값·로직과 다시 대조한다.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const A = (f) => path.join(here, '..', 'assets', f);
export const DATA = require(A('pay-data.js'));
export const GANI = require(A('gani-2026.js'));
export const P = require(A('pay-core.js'))(DATA, GANI);

const NOW = DATA.now, NEXT = DATA.next;
const slim = (r) => ({
  annual: r.annual, gross: r.gross, nontax: r.nontax, taxable: r.taxable, deductions: r.deductions, insurance: r.insurance, tax: r.tax,
  net: r.net, netAnnual: r.netAnnual, family: r.family, children: r.children, ratio: r.ratio, period: r.period,
  lines: r.lines.map((l) => ({ id: l.id, amount: l.amount, base: l.base, ratePct: l.ratePct, healthPct: l.healthPct, capped: l.capped || null,
    status: l.status, limitStatus: l.limitStatus || null, tableTax: l.tableTax, childCredit: l.childCredit, family: l.family,
    row: l.lookup && l.lookup.row ? l.lookup.row : null, zone: l.lookup ? l.lookup.zone : null })),
  line: Object.fromEntries(r.lines.map((l) => [l.id, l.amount])),
});
const net = (o) => { const r = P.netPay(o); if (!r.ok) throw new Error('netPay ' + JSON.stringify(o) + ' → ' + r.code); return slim(r); };

/* 연봉 실수령액 표: 2,000만~1억 원은 100만 원 간격, 그 위는 1,000만 원 간격으로 2억 원까지 */
export function tableAnnuals() {
  const a = [];
  for (let v = 20000000; v <= 100000000; v += 1000000) a.push(v);
  for (let v = 110000000; v <= 200000000; v += 10000000) a.push(v);
  return a;
}
export const TABLE_OPTS = { family: 1, children: 0, nontax: DATA.net.nontaxMeal, ratio: 100, period: NOW };
const makeView = require(A('pay-view.js'));
export const VIEW = { ko: makeView(P, 'ko'), en: makeView(P, 'en') };
/* 첫 화면 예시와 '앞뒤 연봉' 간격은 화면 코드(pay-view.js)에 있는 값을 그대로 쓴다 */
export const EXAMPLE = VIEW.ko.EXAMPLE, STEP = VIEW.ko.STEP;
export const NET_STATE = { text: '', basis: 'annual', nontax: DATA.net.nontaxMeal, nontaxText: null, family: 1, children: 0, ratio: 100, sev: false, age60: false, age65: false, period: NOW, planned: true, showEx: false };
/* 해가 바뀐 뒤(기기 날짜가 다음 기준의 시행일부터)에 처음 보일 모습: 다음 기준으로 계산한 예시. 첫 그림 전에 인라인 스크립트가 바꿔 끼운다 */
export const NET_STATE_NEXT = { ...NET_STATE, period: NEXT, planned: false };

export function build() {
  const mwNow = DATA.periods[NOW].minWage, mwNext = DATA.periods[NEXT].minWage, U = DATA.unemployment, S = DATA.severance, ex = S.example;
  const exA = { amount: EXAMPLE.annual, basis: 'annual' }, exM = { amount: EXAMPLE.monthly, basis: 'monthly' };
  const cmp = (o) => { const c = P.compare(o); return { netDiff: c.netDiff, lines: c.lines, next: slim(c.next) }; };
  const wh = (h, wage) => { const r = P.hourlyToPay({ hourly: wage, weeklyHours: h, period: NOW }); return { hours: h, eligible: r.weekly.eligible, paidHours: r.weekly.paidHours, pay: r.weekly.pay, weeklyBase: r.weeklyBase, weeklyTotal: r.weeklyTotal, monthlyHours: r.monthlyHours.hours, monthly: r.monthly }; };
  const sev = P.severance({ join: ex.join, leave: ex.leave, wages3m: ex.wages3m, annualBonus: ex.annualBonus, leavePay: ex.leavePay });
  const ub = (wages3m, hours, leave = '2026-09-30') => {
    const r = P.unemployment({ wages3m, dayHours: hours, leave, tenureYears: 3, over50: false });
    if (!r.ok) throw new Error('unemployment ' + r.code);
    return { wages3m, leave, days: r.periodDays, avgDaily: r.avgFloor, daily: r.daily, byRate: r.byRate, lower: r.lower, kind: r.kind, total: r.total, payDays: r.days, monthly30: r.monthly30, year: r.year, minWageHourly: r.minWageHourly, atLeast: r.atLeast };
  };
  const sevAt = (leave, join = '2020-03-02', wages3m = 9000000) => { const r = P.severance({ join, leave, wages3m }); return { join, leave, wages3m, start: r.period.start, end: r.period.end, days: r.period.days, rule: r.period.rule, serviceDays: r.serviceDays, avg: P.splitJeon(r.avgDailyJeon), amount: r.amount }; };
  const leaveEx = P.annualLeave({ join: '2026-01-15', years: 25 });
  const m300 = net({ amount: 3000000, basis: 'monthly' }), m300nt0 = net({ amount: 3000000, basis: 'monthly', nontax: 0 });
  const m700 = net({ amount: 7000000, basis: 'monthly' });
  const fam = [1, 2, 3, 4].map((f) => net({ amount: 4200000, basis: 'monthly', family: f }));
  const facts = {
    net4000: net(exA), cmp4000: cmp(exA), net300m: net(exM), cmp300m: cmp(exM),
    m300, m300nt0, m700, m300diff: m300.net - m300nt0.net,
    /* 과세 대상 월급 400만 원(월급 420만 원 − 비과세 20만 원)일 때 가족 수별 */
    fam, famKid: net({ amount: 4200000, basis: 'monthly', family: 4, children: 2 }),
    ratio80: net({ amount: 4200000, basis: 'monthly', ratio: 80 }), ratio120: net({ amount: 4200000, basis: 'monthly', ratio: 120 }),
    age65: net({ ...exA, noEmployment: true }), age60: net({ ...exA, noPension: true }), ageBoth: net({ ...exA, noPension: true, noEmployment: true }),
    weekly: [14, 15, 20, 30, 40, 45].map((h) => wh(h, mwNow.hourly)),
    monthlyHours: [15, 20, 30, 40].map((h) => { const m = P.monthlyHours(h); return { hours: h, paid: Math.min(h, 40) / 5, value: m.hours, official: m.official }; }),
    weeksPerYearNum: 365, raw209: (DATA.hourly.fullWeekHours + DATA.hourly.fullDayHours) * 365 / 7 / 12,
    m2h: (() => { const r = P.monthlyToHourly({ monthly: 2500000, period: NOW }); return { monthly: r.monthly, hourly: r.hourly, need: r.minWage.monthly }; })(),
    sev: { serviceDays: sev.serviceDays, periodStart: sev.period.start, periodEnd: sev.period.end, periodDays: sev.period.days, total: sev.total,
      bonusPart: sev.bonusPart, leavePart: sev.leavePart, avg: P.splitJeon(sev.avgDailyJeon), amount: sev.amount },
    ub: { low: ub(6000000, 8), mid: ub(9000000, 8), high: ub(15000000, 8), half: ub(3600000, 4),
      width: U.upper - U.lowerByHours[8],
      /* 2027년 이직: 하한은 2027년 최저임금으로(확정), 상한은 미정. 평가자가 1원 오차를 찾았던 보기(90일 구간)도 글에 쓴다 */
      next: ub(9000000, 8, '2027-01-15'), next4: ub(9000000, 4, '2027-01-15'), lowerNext8: ub(0, 8, U.next.from).lower, overUpper: ub(0, 8, U.next.from).lower - U.upper,
      d90: ub(6000000, 4, '2026-03-31') },
    leave: { rows: leaveEx.rows.map((r) => ({ n: r.yearsDone, days: r.days })), firstMonthly: leaveEx.monthly.length,
      capYear: leaveEx.rows.find((r) => r.days === DATA.leave.cap).yearsDone },
    mw: { now: mwNow, next: mwNext, diff: mwNext.hourly - mwNow.hourly },
    /* 퇴직 전 3개월을 세는 보기: 5월 31일 퇴직(3개월 전이 2월이라 3월 1일부터), 12월 31일 퇴직(9월 31일이 없어 9월 30일부터), 보통 날(같은 날부터) */
    threeMonthsEx: sevAt('2026-05-31'), threeMonthsLast: sevAt('2026-12-31'), threeMonthsSame: sevAt('2026-10-01'),
    /* 시급 → 월급 → 시급 왕복: 최저임금·주 15시간 */
    round15: (() => { const a = P.hourlyToPay({ hourly: mwNow.hourly, weeklyHours: 15, period: NOW }), b = P.monthlyToHourly({ monthly: a.monthly, weeklyHours: 15, period: NOW }); return { hours: 15, hourly: mwNow.hourly, monthly: a.monthly, back: b.hourly, need: b.minWage.monthly }; })(),
    /* 1,000만 원 초과 + 80%: 끝수 순서의 보기(평가 보고서 L2) */
    over10m: (() => { const r = P.netPay({ amount: 12134265, basis: 'monthly', nontax: 0, family: 4, children: 2, ratio: 80 }).line.incomeTax; return { gross: 12134265, family: 4, children: 2, ratio: 80, piece: r.lookup.piece, tableTax: r.tableTax, credit: r.childCredit, afterCredit: r.afterCredit, amount: r.amount }; })(),
    /* 연차: 1월 31일 입사자의 첫 연차 */
    leaveJan31: P.annualLeave({ join: '2026-01-31' }).monthly[0].date,
    ubLower: Object.entries(U.lowerByHours).map(([h, v]) => ({ hours: +h, amount: v })),
    net5500: net({ amount: 55000000, basis: 'annual' }),
    net3000: net({ amount: 30000000, basis: 'annual' }), net5000: net({ amount: 50000000, basis: 'annual' }), net7000: net({ amount: 70000000, basis: 'annual' }),
    hourly12000: wh(20, 12000),
    /* 연봉별: 지금 기준 실수령액과 다음 기준에서 달라지는 금액 */
    cmpBy: [30000000, 40000000, 50000000, 70000000, 100000000].map((a) => { const x = P.compare({ amount: a, basis: 'annual' }); return { annual: a, now: x.now.net, next: x.next.net, diff: x.netDiff, pensionNow: x.now.line.pension.amount, pensionNext: x.next.line.pension.amount }; }),
  };
  const annuals = tableAnnuals();
  /* 첫 HTML에 미리 넣는 결과(예시 상태). 브라우저의 app.js 가 같은 함수로 다시 그린다. */
  const pre = {};
  for (const lang of ['ko', 'en']) {
    const V = VIEW[lang], n = V.net(NET_STATE), nn = V.net(NET_STATE_NEXT);
    pre[lang] = {
      net: { read: n.read, summary: n.summary, slip: n.slip, compare: n.compare, stick: n.stick },
      netNext: { summary: nn.summary, slip: nn.slip, compare: nn.compare, stick: nn.stick },
      sev: { slip: V.sev({}).slip },
      hourly: { slip: V.hourly({ mode: 'hourly', text: '', hours: '', period: NOW }).slip, read: V.hourly({ mode: 'hourly', text: '', hours: '', period: NOW }).read },
      hourlyNext: { slip: V.hourly({ mode: 'hourly', text: '', hours: '', period: NEXT }).slip },
      stale: { now: V.staleText(DATA.periods[NOW].year, false), next: V.staleText(DATA.periods[NEXT].year, false), ub: lang === 'ko' ? V.ubStaleText(true) : '', ubAfter: lang === 'ko' ? V.ubStaleText(false) : '' },
      unit: V.UNIT,
    };
    if (lang === 'ko') { pre.ko.ub = { slip: V.ub({}).slip }; pre.ko.leave = { slip: V.leave({}).slip }; }
  }
  return {
    pre,
    now: NOW, next: NEXT, data: DATA,
    gani: { name: GANI.name, source: GANI.source, law: GANI.law, effective: GANI.effective, viewed: GANI.viewed, count: GANI.rows.length,
      first: GANI.rows[0][0] * GANI.unit, last: GANI.rows[GANI.rows.length - 1][0] * GANI.unit, child: GANI.child },
    example: EXAMPLE, step: STEP,
    table: { opts: TABLE_OPTS, rows: P.salaryTable(annuals, TABLE_OPTS).map(slim) },
    facts,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.stdout.write(JSON.stringify(build()));
