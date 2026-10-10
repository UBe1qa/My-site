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
export const NET_STATE = { text: '', basis: 'annual', nontax: DATA.net.nontaxMeal, family: 1, children: 0, ratio: 100, sev: false, age65: false, period: NOW, showEx: false };

export function build() {
  const mwNow = DATA.periods[NOW].minWage, mwNext = DATA.periods[NEXT].minWage, U = DATA.unemployment, S = DATA.severance, ex = S.example;
  const exA = { amount: EXAMPLE.annual, basis: 'annual' }, exM = { amount: EXAMPLE.monthly, basis: 'monthly' };
  const cmp = (o) => { const c = P.compare(o); return { netDiff: c.netDiff, lines: c.lines, next: slim(c.next) }; };
  const wh = (h, wage) => { const r = P.hourlyToPay({ hourly: wage, weeklyHours: h, period: NOW }); return { hours: h, eligible: r.weekly.eligible, paidHours: r.weekly.paidHours, pay: r.weekly.pay, weeklyBase: r.weeklyBase, weeklyTotal: r.weeklyTotal, monthlyHours: r.monthlyHours.hours, monthly: r.monthly }; };
  const sev = P.severance({ join: ex.join, leave: ex.leave, wages3m: ex.wages3m, annualBonus: ex.annualBonus, leavePay: ex.leavePay });
  const ub = (wages3m, hours) => {
    const leave = '2026-09-30', days = P.lastThreeMonths(P.iso(P.parseDate(leave) + 1)).days;
    const avg = Math.floor(wages3m * 100 / days) / 100;
    const r = P.unemployment({ avgDaily: avg, dayHours: hours, leave, tenureYears: 3, over50: false });
    return { wages3m, days, avgDaily: Math.floor(avg), daily: r.daily, byRate: r.byRate, lower: r.lower, kind: r.kind, total: r.total, payDays: r.days, monthly30: r.monthly30 };
  };
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
    age65: net({ ...exA, noEmployment: true }),
    weekly: [14, 15, 20, 30, 40, 45].map((h) => wh(h, mwNow.hourly)),
    monthlyHours: [15, 20, 30, 40].map((h) => { const m = P.monthlyHours(h); return { hours: h, paid: Math.min(h, 40) / 5, value: m.hours, official: m.official }; }),
    weeksPerYearNum: 365, raw209: (DATA.hourly.fullWeekHours + DATA.hourly.fullDayHours) * 365 / 7 / 12,
    m2h: (() => { const r = P.monthlyToHourly({ monthly: 2500000, period: NOW }); return { monthly: r.monthly, hourly: r.hourly, need: r.minWage.monthly }; })(),
    sev: { serviceDays: sev.serviceDays, periodStart: sev.period.start, periodEnd: sev.period.end, periodDays: sev.period.days, total: sev.total,
      bonusPart: sev.bonusPart, leavePart: sev.leavePart, avg: P.splitJeon(sev.avgDailyJeon), amount: sev.amount },
    ub: { low: ub(6000000, 8), mid: ub(9000000, 8), high: ub(15000000, 8), half: ub(3600000, 4),
      width: U.upper - U.lowerByHours[8], lowerNext8: Math.floor(U.next.minWageHourly * 8 * U.lowerNum / U.lowerDen) },
    leave: { rows: leaveEx.rows.map((r) => ({ n: r.yearsDone, days: r.days })), firstMonthly: leaveEx.monthly.length,
      capYear: leaveEx.rows.find((r) => r.days === DATA.leave.cap).yearsDone },
    mw: { now: mwNow, next: mwNext, diff: mwNext.hourly - mwNow.hourly },
    /* '그 날짜가 없는 달은 말일부터'의 보기: 5월 31일에 퇴직하면 */
    threeMonthsEx: { leave: '2026-05-31', ...P.lastThreeMonths('2026-05-31') },
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
    const V = VIEW[lang], n = V.net(NET_STATE);
    pre[lang] = {
      net: { read: n.read, summary: n.summary, slip: n.slip, compare: n.compare, stick: n.stick },
      sev: { slip: V.sev({}).slip },
      hourly: { slip: V.hourly({ mode: 'hourly', text: '', hours: '', period: NOW }).slip, read: V.hourly({ mode: 'hourly', text: '', hours: '', period: NOW }).read },
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
