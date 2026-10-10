// 시험이 정말 잡는지 보기: 로직·자료를 한 군데씩 일부러 틀리게 바꾼 복사본으로 run.mjs 를 돌려 실패하는지 본다.
// node salary/tests/mutate.mjs   (복사본은 기기 임시 폴더에 만들고 지운다. 저장소 파일은 건드리지 않는다)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const A = (f) => path.join(here, '..', 'assets', f);
const SRC = { core: fs.readFileSync(A('pay-core.js'), 'utf8'), data: fs.readFileSync(A('pay-data.js'), 'utf8'), gani: fs.readFileSync(A('gani-2026.js'), 'utf8') };
const ENV = { core: 'PAY_CORE', data: 'PAY_DATA', gani: 'PAY_GANI' };

// [어느 파일, 이름, 원래 글자, 바꾼 글자]
const M = [
  ['core', '구간을 이상~미만이 아니라 초과~이하로', 'if (taxable < r[0] * U) hi = mid - 1; else if (taxable >= r[1] * U) lo = mid + 1;', 'if (taxable <= r[0] * U) hi = mid - 1; else if (taxable > r[1] * U) lo = mid + 1;'],
  ['core', '가족 수 칸을 한 칸 밀어 읽음', 'if (family <= 11) return row[1 + family];', 'if (family <= 11) return row[2 + family] || 0;'],
  ['core', '11명 초과 규칙에서 10명·11명을 바꿈', 'var t10 = row[11], t11 = row[12];', 'var t10 = row[12], t11 = row[11];'],
  ['core', '11명 초과가 음수여도 그대로', 'return Math.max(0, t11 - (t10 - t11) * (family - 11));', 'return t11 - (t10 - t11) * (family - 11);'],
  ['core', '770천원 미만에도 세금', "if (taxable < rows[0][0] * U) return { zone: 'below', tax: 0, row: null };", "if (taxable < rows[0][0] * U) return { zone: 'below', tax: 10, row: null };"],
  ['core', '딱 1,000만 원을 계산식으로 보냄', "if (taxable === top) return { zone: 'top', tax: base, row: { from: top, to: top } };", ''],
  ['core', '1,000만 원 미만인데 마지막 줄을 씀', 'if (taxable < top) { var r = findRow(taxable);', 'if (taxable < top - 20000) { var r = findRow(taxable);'],
  // (뺀 것) 계산식 구간 경계를 '초과~이하'에서 '이상~미만'으로 바꾸는 것: 별표 2의 식이 경계에서 같은 값으로 이어져(1,400만 원: 25,000 + 1,372,000 = 1,397,000 등) 결과가 같다. 틀린 바꿈이 아니라 뺐다.
  ['core', '계산식에서 98%를 빼먹음', 'piece = mulDiv(excess * t.factorPct, t.ratePct, 10000);', 'piece = mulDiv(excess * 100, t.ratePct, 10000);'],
  ['core', '계산식에서 더하는 금액을 빼먹음', 'tax: base + t.add + piece, row: null, tier: i', 'tax: base + piece, row: null, tier: i'],
  ['core', '계산식의 출발점을 1명 칸으로 고정', 'var base = colTax(last, family);', 'var base = colTax(last, 1);'],
  ['core', '자녀 3명 이상 공제를 2명과 같게', 'c.two + (children - 2) * c.eachOverTwo;', 'c.two;'],
  ['core', '자녀 1명 공제를 2명 금액으로', 'children === 1 ? c.one :', 'children === 1 ? c.two :'],
  ['core', '자녀 공제가 음수여도 그대로', 'var afterCredit = Math.max(0, t.tax - credit);', 'var afterCredit = t.tax - credit;'],
  ['core', '비율을 자녀 공제보다 먼저 곱함', 'var amount = floorTo(mulDiv(afterCredit, ratio, 100), unit === undefined ? ROUND.incomeTax : unit);', 'var amount = floorTo(Math.max(0, mulDiv(t.tax, ratio, 100) - credit), unit === undefined ? ROUND.incomeTax : unit);'],
  ['core', '80·120% 비율을 무시', 'mulDiv(afterCredit, ratio, 100)', 'mulDiv(afterCredit, 100, 100)'],
  ['core', '국민연금: 천 원 미만을 안 버림', 'var pBase0 = floorTo(taxable, pen.baseUnit)', 'var pBase0 = floorTo(taxable, 1)'],
  ['core', '국민연금: 상한을 안 씀', 'pBase = clamp(pBase0, pen.baseMin, pen.baseMax);', 'pBase = clamp(pBase0, pen.baseMin, Infinity);'],
  ['core', '국민연금: 하한을 안 씀', 'pBase = clamp(pBase0, pen.baseMin, pen.baseMax);', 'pBase = clamp(pBase0, 0, pen.baseMax);'],
  ['core', '국민연금 상·하한 표시를 뒤바꿈', "capped: pBase0 < pen.baseMin ? 'min' : pBase0 > pen.baseMax ? 'max' : null, status: pen.status });", "capped: pBase0 < pen.baseMin ? 'max' : pBase0 > pen.baseMax ? 'min' : null, status: pen.status });"],
  ['core', '건강보험: 상·하한을 안 씀', 'hAmt = clamp(hRaw, hi.employeeMin, hi.employeeMax);', 'hAmt = hRaw;'],
  ['core', '건강보험: 천 원 미만을 버리고 계산', 'var hRaw = floorTo(mulDiv(taxable, hi.rateNum, hi.rateDen)', 'var hRaw = floorTo(mulDiv(floorTo(taxable, 1000), hi.rateNum, hi.rateDen)'],
  ['core', '장기요양: 건강보험료가 아니라 월급에 곱함', 'floorTo(mulDiv(hAmt, care.num, care.den), u(\'care\'))', 'floorTo(mulDiv(taxable, care.num, care.den), u(\'care\'))'],
  ['core', '장기요양: 소수 곱셈(13.14%)으로', "floorTo(mulDiv(hAmt, care.num, care.den), u('care'))", "floorTo(Math.floor(hAmt * 0.1314), u('care'))"],
  ['core', '장기요양: 실수 나눗셈으로(딱 떨어지는 값이 1원 모자람)', "floorTo(mulDiv(hAmt, care.num, care.den), u('care'))", "floorTo(Math.floor(hAmt * 0.9448 / 7.19), u('care'))"],
  ['core', '고용보험에 국민연금 상한을 씌움', "floorTo(mulDiv(taxable, emp.rateNum, emp.rateDen), u('employment'))", "floorTo(mulDiv(Math.min(taxable, pen.baseMax), emp.rateNum, emp.rateDen), u('employment'))"],
  ['core', '지방소득세를 표 금액(비율 전)에서 계산', 'floorTo(mulDiv(w.amount, P.localTax.rateNum, P.localTax.rateDen)', 'floorTo(mulDiv(w.tableTax, P.localTax.rateNum, P.localTax.rateDen)'],
  ['core', '비과세를 안 뺌', 'var taxable = gross - nontax;', 'var taxable = gross;'],
  ['core', '퇴직금 포함 연봉을 12로 나눔', "(inp.includeSeverance ? 13 : 12)", "(inp.includeSeverance ? 12 : 12)"],
  ['core', '연 실수령을 13번으로', 'net: net, netAnnual: net * 12,', 'net: net, netAnnual: net * 13,'],
  ['core', '버림 단위를 무시(항상 1원)', "var u = function (k) { return inp.roundUnit || ROUND[k]; };", 'var u = function (k) { return 1; };'],
  ['core', '반올림으로 바꿈(버림 아님)', 'function floorTo(x, unit) { return unit > 1 ? x - (x % unit) : x; }', 'function floorTo(x, unit) { return unit > 1 ? Math.round(x / unit) * unit : x; }'],
  ['core', '자녀 수 검사를 뺌', "if (children > family - 1) return err('children-over-family', { max: family - 1 });", ''],
  ['core', '너무 큰 값 검사를 뺌', "if (gross > N.maxMonthly) return err('too-large', { max: N.maxMonthly });", ''],
  ['core', '음수 검사를 뺌', "if (amount < 0) return err('negative');\n    if (!isInt(amount)) return err('not-integer');\n    var family", "if (!isInt(amount)) return err('not-integer');\n    var family"],
  ['core', '2027년 비교가 같은 기준을 두 번 계산', "b = netPay(Object.assign({}, inp, { period: DATA.next }));", "b = netPay(Object.assign({}, inp, { period: DATA.now }));"],
  ['core', '금액 읽기: 단위 없는 숫자를 늘 원으로', "if (ctx === 'man' && n < BARE_MAN_BELOW) { value = n * 10000; assumed = 'man'; }", 'if (false) {}'],
  ['core', "금액 읽기: 만 원으로 읽었다는 표시를 안 함", "{ value = n * 10000; assumed = 'man'; }", '{ value = n * 10000; }'],
  ['core', "금액 읽기: '1억 2천'을 1억 2,000원으로", "if (i >= 0 || ctx === 'man') { man = g; assumed = 'man'; } else won = g;", "if (ctx === 'man' && i < 0) { man = g; assumed = 'man'; } else won = g;"],
  ['core', '금액 읽기: 천을 백으로', "var mult = { '천': 1000, '백': 100, '십': 10 };", "var mult = { '천': 100, '백': 100, '십': 10 };"],
  ['core', '금액 읽기: 억을 천만으로', 'value = eok * 100000000 + man * 10000 + won;', 'value = eok * 10000000 + man * 10000 + won;'],
  ['core', '만 원 읽기: 억 자리를 틀림', 'var eok = Math.floor(n / 100000000), man = Math.floor(n % 100000000 / 10000)', 'var eok = Math.floor(n / 1000000000), man = Math.floor(n % 100000000 / 10000)'],
  ['core', '없는 날(2월 30일)을 받아 줌', 'd < 1 || d > monthLen(y, mo)) return null;', 'd < 1 || d > 31) return null;'],
  ['core', '퇴직금: 3개월 전을 90일 전으로', "var start = addMonths(leave, -3, 'clamp');", 'var start = leave - 90;'],
  ['core', '퇴직금: 3개월에 퇴직일을 넣어 하루 더 셈', 'return { start: start, end: leave - 1, days: leave - start };', 'return { start: start, end: leave - 1, days: leave - start + 1 };'],
  ['core', '퇴직금: 재직일수에 하루 더', 'var serviceDays = leave - join, oneYear', 'var serviceDays = leave - join + 1, oneYear'],
  ['core', '퇴직금: 1년을 365일로 판단', "var reason = leave < oneYear ? 'under-1y'", "var reason = serviceDays < 365 ? 'under-1y'"],
  ['core', '퇴직금: 2/29 입사의 1년을 2/28로', "oneYear = addMonths(join, 12, 'roll');", "oneYear = addMonths(join, 12, 'clamp');"],
  ['core', '퇴직금: 상여금을 통째로 더함', 'var num = (wages * 12 + (bonus + leavePay) * 3) * 100', 'var num = (wages * 12 + bonus * 12 + leavePay * 3) * 100'],
  ['core', '퇴직금: 연차수당을 빼먹음', 'var num = (wages * 12 + (bonus + leavePay) * 3) * 100', 'var num = (wages * 12 + bonus * 3) * 100'],
  ['core', '퇴직금: 평균임금을 전 단위에서 버림', 'avgJeon = ceilDiv(num, 12 * days);', 'avgJeon = mulDiv(num, 1, 12 * days);'],
  ['core', '퇴직금: 30일분이 아니라 31일분', 'var amount = mulDiv(usedJeon * S.payDays, serviceDays, S.daysPerYear * 100);', 'var amount = mulDiv(usedJeon * 31, serviceDays, S.daysPerYear * 100);'],
  ['core', '퇴직금: 통상임금이 커도 평균임금', 'usedJeon = Math.max(avgJeon, ordJeon);', 'usedJeon = avgJeon;'],
  ['core', '퇴직금: 주 15시간 미만 검사를 뺌', "(typeof inp.weeklyHours === 'number' && inp.weeklyHours < S.minWeekHours) ? 'under-15h' : null", 'null'],
  ['core', '퇴직금: 대상이 아니어도 금액을 냄', 'amount: reason ? null : amount,', 'amount: amount,'],
  ['core', '날짜 뒤바뀜 검사를 뺌', "if (leave <= join) return err('date-order');", ''],
  ['core', '주휴: 40시간 넘으면 그만큼 더 줌', 'counted = Math.min(hh, H.fullWeekHours * 100);', 'counted = hh;'],
  ['core', '주휴: 15시간 미만에도 줌', 'var hh = h100(h), eligible = hh >= H.minWeekHours * 100,', 'var hh = h100(h), eligible = true,'],
  ['core', '주휴: 15시간 딱은 안 줌', 'var hh = h100(h), eligible = hh >= H.minWeekHours * 100,', 'var hh = h100(h), eligible = hh > H.minWeekHours * 100,'],
  ['core', '주휴: 8시간이 아니라 주 소정근로시간 ÷ 6', 'pay: eligible ? mulDiv(wage * counted, 1, 500) : 0', 'pay: eligible ? mulDiv(wage * counted, 1, 600) : 0'],
  ['core', '월 환산: 주 40시간을 208.57로', "if (hh >= H.fullWeekHours * 100) return { hours: H.monthlyHours40, official: true, num: H.monthlyHours40, den: 1 };", ''],
  ['core', '월 환산: 주휴를 빼고 계산', 'var paid = hh >= H.minWeekHours * 100 ? hh / 5 : 0, num', 'var paid = 0, num'],
  ['core', '월 환산: 365일이 아니라 52주', 'num = Math.round((hh + paid) * 5) * 365, den = 100 * 5 * 7 * 12;', 'num = Math.round((hh + paid) * 5) * 364, den = 100 * 5 * 7 * 12;'],
  ['core', '최저임금 비교: 같으면 미달로', 'ok: inp.hourly >= mw.hourly, diff', 'ok: inp.hourly > mw.hourly, diff'],
  ['core', '최저임금 비교가 기준 시기를 무시', 'function minWageOf(periodId) { var P = period(periodId); return P ? P.minWage : null; }', 'function minWageOf(periodId) { var P = period(periodId) && period(); return P ? P.minWage : null; }'],
  ['core', '월급의 최저임금 비교: 내림해서 1원 모자라도 통과', 'need = ceilDiv(mw.hourly * mh.num, mh.den);', 'need = mulDiv(mw.hourly * mh.num, 1, mh.den);'],
  ['core', '실업급여: 60%가 아니라 평균임금 그대로', 'var byRate = mulDiv(baseJeon, U.rateNum, U.rateDen * 100);', 'var byRate = mulDiv(baseJeon, 100, U.rateDen * 100);'],
  ['core', '실업급여: 상한을 안 씀', 'baseJeon = Math.min(avgJeon, U.baseMax * 100);', 'baseJeon = avgJeon;'],
  ['core', '실업급여: 하한을 안 씀', 'var daily = Math.max(byRate, lower), days', 'var daily = byRate, days'],
  ['core', '실업급여: 하한에 80%를 안 곱함', 'var lower = mulDiv(hh * U.minWageHourly, U.lowerNum, U.lowerDen * 100);', 'var lower = mulDiv(hh * U.minWageHourly, 100, U.lowerDen * 100);'],
  ['core', '실업급여: 하루 8시간 넘는 값을 그대로', 'var hh = Math.min(h100(h), U.maxDayHours * 100);\n    /* 기초일액', 'var hh = h100(h);\n    /* 기초일액'],
  ['core', '실업급여: 피보험기간 경계를 초과로', 'while (i < b.length && years >= b[i]) i++; return i; }', 'while (i < b.length && years > b[i]) i++; return i; }'],
  ['core', '실업급여: 50세 이상 표를 안 씀', '(over50 ? U.days.over50 : U.days.under50)[band]', '(U.days.under50)[band]'],
  ['core', '실업급여: 장애인을 50세 이상으로 안 봄', 'var over50 = !!(inp.over50 || inp.disabled),', 'var over50 = !!inp.over50,'],
  ['core', '실업급여: 2025년 이직도 2026년 값으로', "if (leave < parseDate(U.from)) return err('before-range', { from: U.from });", ''],
  ['core', '실업급여: 2027년 이직인데 미정 표시가 없음', "provisional: leave > parseDate(U.until) ? 'next-year-undecided' : null", 'provisional: null'],
  ['core', '실업급여: 상한 딱인데 상한으로 표시', "avgJeon > U.baseMax * 100 ? 'upper' : 'rate'", "avgJeon >= U.baseMax * 100 ? 'upper' : 'rate'"],
  ['core', '연차: 가산을 해마다 1일로', 'L.base + Math.floor((n - 1) / L.addEveryYears)', 'L.base + Math.floor(n - 1)'],
  ['core', '연차: 가산이 한 해 일찍', 'L.base + Math.floor((n - 1) / L.addEveryYears)', 'L.base + Math.floor(n / L.addEveryYears)'],
  ['core', '연차: 한도 25일을 안 씀', 'return n < 1 ? 0 : Math.min(L.cap, L.base', 'return n < 1 ? 0 : Math.min(99, L.base'],
  ['core', '연차: 없는 날은 말일로(다음 날이 아니라)', "monthly.push({ date: iso(addMonths(join, k, 'roll'))", "monthly.push({ date: iso(addMonths(join, k, 'clamp'))"],
  ['core', '연차: 해마다 생기는 날을 말일 맞춤으로', "var at = addMonths(join, 12 * n, 'roll');", "var at = addMonths(join, 12 * n, 'clamp');"],
  ['core', '연차: 첫해 12번 줌', 'for (k = 1; k <= L.firstYearMax; k++) monthly.push', 'for (k = 1; k <= L.firstYearMax + 1; k++) monthly.push'],
  ['core', '연차: 기준일 당일에 생긴 것을 안 셈', "while (months < L.firstYearMax && addMonths(join, months + 1, 'roll') <= asOf) months++;", "while (months < L.firstYearMax && addMonths(join, months + 1, 'roll') < asOf) months++;"],
  ['core', '연차: 다달이 쓰는 기한을 1년 뒤로', "useBy: iso(firstEnd - 1) });", "useBy: iso(firstEnd + 364) });"],
  ['core', '달 더하기: 12월을 넘길 때 해가 안 바뀜', 'y = Math.floor(idx / 12), m = idx % 12 + 1, len', 'y = p.y, m = idx % 12 + 1, len'],
  ['data', '국민연금 2026년 요율을 4.5%로(옛 값)', "rateNum: 475, rateDen: 10000, ratePct: '4.75'", "rateNum: 450, rateDen: 10000, ratePct: '4.75'"],
  ['data', '국민연금 2027년 요율을 그대로 둠', "rateNum: 500, rateDen: 10000, ratePct: '5.0'", "rateNum: 475, rateDen: 10000, ratePct: '5.0'"],
  ['data', '기준소득월액 상한을 옛 값(637만)으로', "baseMin: 410000, baseMax: 6590000, baseUnit: 1000, limitStatus: 'fixed', limitSrc: ['npsGuide'], limitFrom: '2026-07-01', limitUntil: '2027-06-30'\n      },\n      health: {\n        rateNum: 3595, rateDen: 100000, ratePct: '3.595', totalPct: '7.19', status: 'fixed'", "baseMin: 410000, baseMax: 6370000, baseUnit: 1000, limitStatus: 'fixed', limitSrc: ['npsGuide'], limitFrom: '2026-07-01', limitUntil: '2027-06-30'\n      },\n      health: {\n        rateNum: 3595, rateDen: 100000, ratePct: '3.595', totalPct: '7.19', status: 'fixed'"],
  ['data', '건강보험 요율을 옛 값(3.545%)으로', "rateNum: 3595, rateDen: 100000, ratePct: '3.595', totalPct: '7.19', status: 'fixed'", "rateNum: 3545, rateDen: 100000, ratePct: '3.595', totalPct: '7.19', status: 'fixed'"],
  ['data', '건강보험 상한을 합계 금액으로(절반 아님)', "employeeMin: 10080, employeeMax: 4591740, limitStatus: 'fixed'", "employeeMin: 10080, employeeMax: 9183480, limitStatus: 'fixed'"],
  ['data', '건강보험 하한을 합계 금액으로', "employeeMin: 10080, employeeMax: 4591740, limitStatus: 'fixed'", "employeeMin: 20160, employeeMax: 4591740, limitStatus: 'fixed'"],
  ['data', '장기요양 비율을 옛 값(0.9182)으로', "care: { num: 9448, den: 71900, ratePct: '0.9448', healthPct: '7.19', status: 'fixed'", "care: { num: 9182, den: 71900, ratePct: '0.9448', healthPct: '7.19', status: 'fixed'"],
  ['data', '고용보험 요율을 0.8%로', "employment: { rateNum: 9, rateDen: 1000, ratePct: '0.9', status: 'fixed'", "employment: { rateNum: 8, rateDen: 1000, ratePct: '0.9', status: 'fixed'"],
  ['data', '지방소득세를 1%로', "localTax: { rateNum: 10, rateDen: 100, ratePct: '10', status: 'fixed', src: ['localTax'] },\n      minWage: { hourly: 10320", "localTax: { rateNum: 1, rateDen: 100, ratePct: '10', status: 'fixed', src: ['localTax'] },\n      minWage: { hourly: 10320"],
  ['data', '2026 최저임금을 옛 값(10,030)으로', 'minWage: { hourly: 10320, daily8: 82560', 'minWage: { hourly: 10030, daily8: 82560'],
  ['data', '2027 최저임금을 2026 값으로', 'minWage: { hourly: 10700, daily8: 85600', 'minWage: { hourly: 10320, daily8: 85600'],
  ['data', '2027 장기요양을 확정이라고 표시', "status: 'carried', src: ['nhisRate', 'mohwCare2027']", "status: 'fixed', src: ['nhisRate', 'mohwCare2027']"],
  ['data', '비과세 식대 기본값을 10만 원으로', 'nontaxMeal: 200000', 'nontaxMeal: 100000'],
  ['data', '월 환산 시간을 208로', 'monthlyHours40: 209', 'monthlyHours40: 208'],
  ['data', '구직급여 상한 기초일액을 옛 값(11만)으로', 'baseMax: 113500, upper: 68100, minWageHourly: 10320', 'baseMax: 110000, upper: 68100, minWageHourly: 10320'],
  ['data', '구직급여 하한의 최저임금을 옛 값으로', 'baseMax: 113500, upper: 68100, minWageHourly: 10320', 'baseMax: 113500, upper: 68100, minWageHourly: 10030'],
  ['data', '소정급여일수 한 칸 바꿈', 'over50: [120, 180, 210, 240, 270]', 'over50: [120, 180, 210, 240, 240]'],
  ['data', '소정급여일수 경계(3년)를 2년으로', 'tenureBands: [1, 3, 5, 10]', 'tenureBands: [1, 2, 5, 10]'],
  ['data', '연차 한도를 26일로', 'firstYearMax: 11, base: 15, cap: 25', 'firstYearMax: 11, base: 15, cap: 26'],
  ['data', '퇴직금 30일을 31일로', 'daysPerYear: 365, payDays: 30', 'daysPerYear: 365, payDays: 31'],
  ['data', '없는 출처 이름을 가리킴', "employment: { rateNum: 9, rateDen: 1000, ratePct: '0.9', status: 'fixed', src: ['eiRateDecree', 'eiRateLaw'] }", "employment: { rateNum: 9, rateDen: 1000, ratePct: '0.9', status: 'fixed', src: ['eiRateDecree', 'eiRateLawX'] }"],
  ['gani', '표 한 칸의 숫자 하나가 빠짐(74,350 → 7,435)', '[3000,3020,74350,', '[3000,3020,7435,'],
  ['gani', '표의 한 줄이 통째로 빠짐', /\n\[5000,5020,[^\]]+\],/, ''],
  ['gani', '표본에 없는 줄의 한 칸을 바꿈(원본 대조가 잡아야 함)', /\n\[3120,3140,(\d+),/, (m, a) => `\n[3120,3140,${+a + 10},`],
  ['gani', '계산식 구간의 더하는 금액 한 자리 틀림', '"add":7394600', '"add":7394500'],
  ['gani', '계산식 세율 38% → 35%', '"add":1397000,"ratePct":38', '"add":1397000,"ratePct":35'],
  ['gani', '자녀 공제 금액 틀림', '"two":45830', '"two":45380'],
];

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pay-mut-'));
let caught = 0, missing = 0;
for (const [which, name, from, to] of M) {
  const src = SRC[which];
  const found = typeof from === 'string' ? src.includes(from) : from.test(src);
  if (!found) { console.log('못 찾음  ' + name); missing++; process.exitCode = 1; continue; }
  const f = path.join(dir, which + '.js');
  fs.writeFileSync(f, src.replace(from, to));
  const r = spawnSync(process.execPath, [path.join(here, 'run.mjs')], { env: { ...process.env, [ENV[which]]: f }, encoding: 'utf8' });
  const tail = (r.stdout || r.stderr || '').trim().split('\n').slice(-1)[0];
  if (r.status !== 0) caught++; else process.exitCode = 1;
  console.log((r.status !== 0 ? '잡힘    ' : '안 잡힘 ') + `[${which}] ` + name + '  → ' + tail.slice(0, 80));
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(`일부러 틀리게 바꾼 ${M.length}가지 가운데 ${caught}가지를 시험이 잡았다` + (missing ? ` (못 찾은 바꿈 ${missing}개: 로직이 바뀌었으면 이 목록도 고친다)` : ''));
