// 급여 계산 로직 시험: node salary/tests/run.mjs
// 기준값은 우리 코드와 다른 데서 온다.
//  [공식] 공단·고용노동부·법령 원문에 적힌 예시와 표(출처는 assets/pay-data.js 의 SOURCES, 값은 이 파일에 따로 옮겨 적음)
//  [표본] tests/ref/gani-samples.json: 간이세액표에서 따로 옮겨 적은 17줄
//  [날짜] tests/ref/dates.json: 파이썬 datetime·calendar 로 구한 값(gen_dates.py). 퇴직 전 3개월은 고용노동부 계산기 스크립트의 가지 구조를 옮겨 셌다
//  [실물] tests/ref/moel-live.json: 고용노동부 「퇴직금 계산」 화면에 직접 넣어 받은 값(제3자 평가, 2026-10-10)
//  [평가] tests/ref/eval-sev.json: 제3자 평가자가 고용노동부 스크립트를 분수 계산으로 옮겨 구한 252건 / 평가 보고서에 적힌 값
//  [분수] tests/ref/ub.json: 파이썬 분수(Fraction)로 구한 구직급여(gen_ub.py)
//  [손]   경계 사례를 손으로 따진 값(식을 주석에 적음)
// 일부러 틀리게 바꾼 로직을 잡는지는 tests/mutate.mjs 가 본다(환경 변수 PAY_CORE·PAY_DATA·PAY_GANI 로 파일을 바꿔 끼움).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const A = (f) => path.join(here, '..', 'assets', f);
const DATA = require(process.env.PAY_DATA || A('pay-data.js'));
const GANI = require(process.env.PAY_GANI || A('gani-2026.js'));
const make = require(process.env.PAY_CORE || A('pay-core.js'));
const ref = (f) => JSON.parse(fs.readFileSync(path.join(here, 'ref', f), 'utf8'));

// 버림 단위는 아직 확정 전인 설정값이라 두 가지(10원·1원) 모두로 시험한다
const P10 = make(DATA, GANI, { rounding: { pension: 10, health: 10, care: 10, employment: 10, incomeTax: 10, localTax: 10 } });
const P1 = make(DATA, GANI, { rounding: { pension: 1, health: 1, care: 1, employment: 1, incomeTax: 1, localTax: 1 } });
const P = make(DATA, GANI);

let pass = 0, fail = 0, group = '';
const fails = [];
function eq(got, want, name) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) pass++; else { fail++; if (fails.length < 60) fails.push(`[${group}] ${name}: 기대 ${w} / 실제 ${g}`); }
}
function ok(cond, name) { eq(!!cond, true, name); }
function G(name, fn) { group = name; fn(); }
const net = (core, o) => core.netPay({ basis: 'monthly', nontax: 0, ...o });
const line = (core, o, id) => { const r = net(core, o); return r.ok ? r.line[id].amount : r.code; };

/* ───────── 자료 ───────── */
G('자료: 조회표가 원본과 같음', () => {
  const src = JSON.parse(fs.readFileSync(path.join(here, '..', '_dev', 'data', 'gani-2026.json'), 'utf8'));
  eq(GANI.rows.length, 647, '줄 수 647');
  eq(GANI.rows.length, src.rows.length, '원본과 줄 수');
  let diff = 0;
  src.rows.forEach((r, i) => { if (JSON.stringify([r.from, r.to, ...r.tax]) !== JSON.stringify(GANI.rows[i])) diff++; });
  eq(diff, 0, '원본과 다른 줄 0');
  eq(GANI.effective, '2026-03-01', '시행일');
  eq(GANI.over.map((t) => [t.over, t.upto, t.add, t.ratePct, t.factorPct]), [[10000, 14000, 25000, 35, 98], [14000, 28000, 1397000, 38, 98], [28000, 30000, 6610600, 40, 98], [30000, 45000, 7394600, 40, 100], [45000, 87000, 13394600, 42, 100], [87000, null, 31034600, 45, 100]], '[공식] 1,000만 원 초과 계산식 6구간(별표 2 원문)');
  eq([GANI.child.one, GANI.child.two, GANI.child.eachOverTwo], [20830, 45830, 33330], '[공식] 자녀 공제 금액(별표 2 주석 3)');
});

G('자료: 공식 수치', () => {
  const now = DATA.periods['2026-10'], nx = DATA.periods['2027-01'];
  // [공식] 국민연금법 부칙: 2026년 1만분의 475, 2027년 1만분의 500. 공단: 2026.7~2027.6 하한 41만·상한 659만
  eq([now.pension.rateNum, now.pension.rateDen, nx.pension.rateNum, nx.pension.rateDen], [475, 10000, 500, 10000], '국민연금 요율');
  eq([now.pension.baseMin, now.pension.baseMax, nx.pension.baseMin, nx.pension.baseMax], [410000, 6590000, 410000, 6590000], '기준소득월액 상·하한');
  // [공식] 건강보험 7.19%의 절반 3.595%, 고시 상한 9,183,480·하한 20,160(합계) → 근로자 몫은 절반
  eq([now.health.rateNum / now.health.rateDen, now.health.totalMax, now.health.totalMin], [0.03595, 9183480, 20160], '건강보험 요율·상하한(합계)');
  eq([now.health.employeeMax * 2, now.health.employeeMin * 2], [9183480, 20160], '근로자 몫 = 합계의 절반');
  // [공식] 장기요양 = 건강보험료 × 0.9448% ÷ 7.19%
  eq([now.care.num, now.care.den], [9448, 71900], '장기요양 비율 = 0.9448 ÷ 7.19 (9448 ÷ 71900)');
  eq([now.employment.rateNum, now.employment.rateDen], [9, 1000], '고용보험 0.9%');
  // [공식] 최저임금위원회 표: 2026년 10,320 / 82,560 / 2,156,880, 2027년 10,700 / 85,600 / 2,236,300
  eq([now.minWage.hourly, now.minWage.daily8, now.minWage.monthly209], [10320, 82560, 2156880], '2026 최저임금');
  eq([nx.minWage.hourly, nx.minWage.daily8, nx.minWage.monthly209], [10700, 85600, 2236300], '2027 최저임금');
  eq([nx.care.status, nx.incomeTax.status, nx.health.limitStatus, nx.pension.status, nx.minWage.status], ['carried', 'carried', 'carried', 'fixed', 'fixed'], '2027년: 미정은 carried, 확정은 fixed');
  // 출처가 빠진 값이 없는지: 모든 src 이름이 SOURCES에 있고 주소·열람일이 있다
  const names = new Set();
  JSON.stringify(DATA, (k, v) => { if ((k === 'src' || k === 'limitSrc' || /Src$/.test(k)) && Array.isArray(v)) v.forEach((n) => names.add(n)); else if (k === 'src' && v && typeof v === 'object') Object.values(v).flat().forEach((n) => names.add(n)); return v; });
  let missing = 0; names.forEach((n) => { const s = DATA.sources[n]; if (!s || !/^https:\/\//.test(s.url) || !/^\d{4}-\d\d-\d\d$/.test(s.viewed)) missing++; });
  eq(missing, 0, '출처 이름이 전부 SOURCES에 있음');
  ok(names.size >= 20, '출처 20개 이상 쓰임');
});

/* ───────── 1. 실수령액 ───────── */
G('간이세액표 조회 [표본]', () => {
  const S = ref('gani-samples.json');
  for (const r of S.rows) {
    for (let fam = 1; fam <= 11; fam++) {
      const want = r.tax[fam - 1];
      eq(P.tableTax(r.from * 1000, fam).tax, want, `${r.from}천원 ${fam}명 (구간 첫 값)`);
      if (r.to > r.from) eq(P.tableTax(r.to * 1000 - 1, fam).tax, want, `${r.to}천원 − 1원 ${fam}명 (구간 끝 값)`);
    }
  }
  for (const [x, t1, t2, t4] of S.combo_1_2_4.cases) eq([1, 2, 4].map((f) => P.tableTax(x, f).tax), [t1, t2, t4], `${x} 1·2·4명`);
  for (const [x, want] of S.child2_family4.cases) eq(P.withholding(x, 4, 2, 100).amount, want, `${x} 4명(자녀 2명)`);
  eq([P.childCredit(0), P.childCredit(1), P.childCredit(2), P.childCredit(3), P.childCredit(4)], [0, 20830, 45830, 79160, 112490], '자녀 공제 0~4명 [공식+손: 45,830 + 33,330 × (n−2)]');
});

G('간이세액표 경계 [손]', () => {
  const t = (x, f = 1) => P.tableTax(x, f).tax;
  eq([t(0), t(769999), t(770000)], [0, 0, 0], '770천원 미만은 0, 770천원 줄도 0');
  eq(P.tableTax(769999, 1).zone, 'below', '770천원 미만은 표 밖(below)');
  // 구간은 '이상 ~ 미만': 2,000,000원은 2,000~2,010 줄, 1,999,999원은 그 앞줄
  eq(t(2000000), 19520, '2,000,000원');
  eq(t(2009999), 19520, '2,009,999원');
  ok(t(1999999) < 19520, '1,999,999원은 앞줄(더 적음)');
  ok(t(2010000) > 19520, '2,010,000원은 다음 줄(더 많음)');
  eq(P.tableTax(1999999, 1).row, { from: 1990000, to: 2000000 }, '1,999,999원의 구간');
  eq(P.tableTax(2000000, 1).row, { from: 2000000, to: 2010000 }, '2,000,000원의 구간');
  // 1,000만 원 딱 = 마지막 줄, 1원 넘으면 계산식(25,000원이 더해진다)
  eq(t(9999999), 1503990, '9,999,999원 = 9,980~10,000 줄');
  eq(t(10000000), 1507400, '10,000,000원 = 딱 1,000만 원 줄');
  eq(P.tableTax(10000000, 1).zone, 'top', '딱 1,000만 원은 top');
  eq(t(10000001), 1532400, '10,000,001원 = 1,507,400 + 25,000 + floor(1 × 0.98 × 0.35)');
  eq(t(10000037), 1532412, '10,000,037원 = … + floor(37 × 0.343 = 12.691)');
  eq(t(10500000), 1703900, '10,500,000원 = 1,507,400 + 25,000 + 500,000 × 0.98 × 0.35(171,500)');
  // 계산식 구간 경계: 이하 쪽 식과 초과 쪽 식이 같은 값으로 이어진다(손으로 따짐)
  eq([t(14000000), t(14000001)], [2904400, 2904400], '1,400만 원: 1,507,400 + 25,000 + 1,372,000 / 1,507,400 + 1,397,000 + 0');
  eq(t(20000000), 5138800, '2,000만 원 = 1,507,400 + 1,397,000 + 6,000,000 × 0.98 × 0.38(2,234,400)');
  eq([t(28000000), t(28000001)], [8118000, 8118000], '2,800만 원: … + 14,000,000 × 0.98 × 0.38(5,213,600)');
  eq([t(30000000), t(30000001)], [8902000, 8902000], '3,000만 원: 1,507,400 + 6,610,600 + 2,000,000 × 0.98 × 0.40(784,000)');
  eq([t(45000000), t(45000001)], [14902000, 14902000], '4,500만 원: 1,507,400 + 7,394,600 + 15,000,000 × 0.40');
  eq([t(87000000), t(87000001)], [32542000, 32542000], '8,700만 원: 1,507,400 + 13,394,600 + 42,000,000 × 0.42(17,640,000)');
  eq(t(100000000), 38392000, '1억 원 = 1,507,400 + 31,034,600 + 13,000,000 × 0.45');
  eq(t(30000001 + 2), 8902001, '3,000만 3원: 98%가 안 붙는 구간 = floor(3 × 0.40)');
  eq(t(28000001 + 2), 8118001, '2,800만 3원: floor(3 × 0.98 × 0.40 = 1.176)');
  eq(P.tableTax(20000000, 4).tax, 1170840 + 1397000 + 2234400, '2,000만 원 4명 = 1,000만 원 4명 칸에서 출발');
  // 가족 11명 초과: 11명 세액 − (10명 − 11명) × 넘는 사람 수
  eq(P.tableTax(5000000, 12).tax, 69100, '500만 12명 = 87,850 − (106,600 − 87,850) × 1');
  eq(P.tableTax(5000000, 13).tax, 50350, '500만 13명 = 87,850 − 18,750 × 2');
  eq(P.tableTax(5000000, 16).tax, 0, '500만 16명 = 87,850 − 18,750 × 5 → 음수라 0');
  eq(P.tableTax(3000000, 12).tax, 0, '300만 12명 = 0 − 3,600 → 0');
  eq(P.tableTax(10000000, 12).tax, 930840, '1,000만 12명 = 960,840 − (990,840 − 960,840)');
  eq(P.tableTax(20000000, 12).tax, 930840 + 1397000 + 2234400, '2,000만 12명: 계산식의 출발점도 12명 규칙');
  // 자녀 공제: 표 금액 − 공제, 음수면 0
  eq(P.withholding(2500000, 2, 1, 100).amount, 7770, '250만 2명(자녀 1) = 28,600 − 20,830');
  eq(P.withholding(5000000, 5, 3, 100).amount, 121190, '500만 5명(자녀 3) = 200,350 − 79,160');
  eq(P.withholding(2000000, 4, 2, 100).amount, 0, '200만 4명(자녀 2) = 3,220 − 45,830 → 0');
  eq(P.withholding(10000000, 4, 2, 100).amount, 1125010, '1,000만 4명(자녀 2)');
});

G('원천징수 비율 80·120% [손]', () => {
  // 19,520 × 80% = 15,616 → 10원 미만 버림 15,610 / 1원 단위 15,616. 지방소득세는 그 10%
  eq([line(P10, { amount: 2000000, ratio: 80 }, 'incomeTax'), line(P10, { amount: 2000000, ratio: 80 }, 'localTax')], [15610, 1560], '80% (10원 버림)');
  eq([line(P1, { amount: 2000000, ratio: 80 }, 'incomeTax'), line(P1, { amount: 2000000, ratio: 80 }, 'localTax')], [15616, 1561], '80% (1원)');
  eq([line(P10, { amount: 2000000, ratio: 120 }, 'incomeTax'), line(P10, { amount: 2000000, ratio: 120 }, 'localTax')], [23420, 2340], '120% = 23,424 → 23,420');
  eq([line(P10, { amount: 2000000 }, 'incomeTax'), line(P10, { amount: 2000000 }, 'localTax')], [19520, 1950], '100%: 지방소득세 1,952 → 1,950');
  eq(line(P1, { amount: 2000000 }, 'localTax'), 1952, '100% 지방소득세(1원)');
  // 자녀 공제 뒤에 비율: (91,670 − 45,830 = 45,840) × 120% = 55,008
  eq(line(P1, { amount: 4000000, family: 4, children: 2, ratio: 120 }, 'incomeTax'), 55008, '자녀 공제 뒤에 비율을 곱함');
  eq(net(P, { amount: 2000000, ratio: 90 }).code, 'ratio', '90%는 없는 비율');
});

G('국민연금 [공식+손]', () => {
  // [공식] 공단 예시: 기준소득월액 1,060,000원 → 본인 50,350원(보험료율 9.5%의 절반)
  eq(line(P1, { amount: 1060000 }, 'pension'), 50350, '1,060,000 → 50,350');
  eq(line(P10, { amount: 1060000 }, 'pension'), 50350, '1,060,000 → 50,350 (10원 버림도 같음)');
  eq(line(P1, { amount: 1060999 }, 'pension'), 50350, '1,060,999 → 천 원 미만 버림');
  eq(line(P1, { amount: 1061000 }, 'pension'), 50397, '1,061,000 × 4.75% = 50,397.5 → 50,397');
  eq(line(P10, { amount: 1061000 }, 'pension'), 50390, '1,061,000 (10원 버림) → 50,390');
  // [공식 풀이] 상한 6,590,000 × 4.75% = 313,025, 하한 410,000 × 4.75% = 19,475, 2027년 상한 × 5.0% = 329,500
  eq(line(P1, { amount: 6590000 }, 'pension'), 313025, '상한 딱');
  eq(line(P1, { amount: 6591000 }, 'pension'), 313025, '상한 넘음');
  eq(line(P1, { amount: 90000000 }, 'pension'), 313025, '아주 큰 월급도 상한');
  eq(line(P1, { amount: 6589999 }, 'pension'), 312977, '상한 바로 아래 6,589,000 × 4.75% = 312,977.5');
  eq(line(P1, { amount: 410000 }, 'pension'), 19475, '하한 딱');
  eq(line(P1, { amount: 409999 }, 'pension'), 19475, '하한 아래 → 41만 원으로');
  eq(line(P1, { amount: 100000 }, 'pension'), 19475, '10만 원도 하한');
  eq(line(P10, { amount: 410000 }, 'pension'), 19470, '하한 (10원 버림)');
  eq(line(P1, { amount: 411000 }, 'pension'), 19522, '411,000 × 4.75% = 19,522.5');
  eq(line(P1, { amount: 6590000, period: '2027-01' }, 'pension'), 329500, '2027년 상한 329,500');
  eq(line(P1, { amount: 3000000, period: '2027-01' }, 'pension'), 150000, '2027년 5.0%');
  eq(net(P, { amount: 409999 }).line.pension.capped, 'min', '하한 표시');
  eq(net(P, { amount: 410999 }).line.pension.capped, null, '410,999는 하한 표시 아님');
  eq(net(P, { amount: 6590999 }).line.pension.capped, null, '6,590,999는 상한 표시 아님');
  eq(net(P, { amount: 6591000 }).line.pension.capped, 'max', '6,591,000은 상한 표시');
  eq(net(P, { amount: 6590999 }).line.pension.base, 6590000, '기준소득월액');
});

G('건강보험·장기요양·고용보험 [손]', () => {
  // 3,000,000 × 3.595% = 107,850. 장기요양 = 107,850 × 0.9448 ÷ 7.19 = 14,172 (딱 떨어진다: 소수 계산이면 14,171.99…로 틀리기 쉬운 값)
  eq(line(P1, { amount: 3000000 }, 'health'), 107850, '300만 건강보험');
  eq(line(P1, { amount: 3000000 }, 'care'), 14172, '300만 장기요양 = 14,172');
  eq(line(P10, { amount: 3000000 }, 'care'), 14170, '300만 장기요양 (10원 버림)');
  eq(line(P1, { amount: 5000000 }, 'care'), 23620, '500만 장기요양 = 179,750 × 0.9448 ÷ 7.19 = 23,620');
  eq(line(P1, { amount: 7000000 }, 'care'), 33068, '700만 장기요양 = 251,650 × 0.9448 ÷ 7.19 = 33,068');
  eq(line(P1, { amount: 3133333 }, 'health'), 112643, '3,133,333 × 3.595% = 112,643.32');
  eq(line(P10, { amount: 3133333 }, 'health'), 112640, '3,133,333 (10원 버림)');
  eq(line(P1, { amount: 3133333 }, 'care'), 14801, '112,643 × 0.9448 ÷ 7.19 = 14,801.82');
  eq(line(P10, { amount: 3133333 }, 'care'), 14800, '112,640 × 0.9448 ÷ 7.19 = 14,801.43 → 14,800');
  eq(line(P1, { amount: 3133333 }, 'employment'), 28199, '3,133,333 × 0.9% = 28,199.997');
  eq(line(P10, { amount: 3133333 }, 'employment'), 28190, '고용보험 (10원 버림)');
  eq(line(P1, { amount: 3000000 }, 'employment'), 27000, '300만 고용보험');
  eq(line(P1, { amount: 100000000 }, 'employment'), 900000, '고용보험은 상한 없음: 1억 × 0.9%');
  // 건강보험 하한(본인 10,080원): 280,000 × 3.595% = 10,066 → 하한 / 281,000 × 3.595% = 10,101.95
  eq(line(P1, { amount: 280000 }, 'health'), 10080, '하한 적용');
  eq(net(P1, { amount: 280000 }).line.health.capped, 'min', '하한 표시');
  eq(line(P1, { amount: 281000 }, 'health'), 10101, '하한 바로 위');
  eq(net(P1, { amount: 281000 }).line.health.capped, null, '하한 표시 아님');
  // 건강보험 상한(본인 4,591,740원): 127,725,730 × 3.595% = 4,591,739.99 / 130,000,000 × 3.595% = 4,673,500 → 상한
  eq(line(P1, { amount: 127725730 }, 'health'), 4591739, '상한 바로 아래');
  eq(line(P1, { amount: 127725731 }, 'health'), 4591740, '상한에 닿음');
  eq(line(P1, { amount: 130000000 }, 'health'), 4591740, '상한 적용');
  eq(net(P1, { amount: 130000000 }).line.health.capped, 'max', '상한 표시');
  eq(line(P1, { amount: 130000000 }, 'care'), 603376, '상한일 때 장기요양 = 4,591,740 × 0.9448 ÷ 7.19 = 603,376.35');
});

G('실수령액 전체 [손]', () => {
  // W1: 월급 3,200,000, 비과세 200,000, 1명 → 과세 3,000,000
  //  국민연금 142,500 / 건강 107,850 / 장기요양 14,172(→14,170) / 고용 27,000 / 소득세 74,350(표본 줄) / 지방 7,435(→7,430)
  let r = P10.netPay({ basis: 'monthly', amount: 3200000, nontax: 200000 });
  eq(r.lines.map((l) => l.amount), [142500, 107850, 14170, 27000, 74350, 7430], 'W1 줄별(10원 버림)');
  eq([r.taxable, r.insurance, r.tax, r.deductions, r.net, r.netAnnual], [3000000, 291520, 81780, 373300, 2826700, 33920400], 'W1 합계');
  r = P1.netPay({ basis: 'monthly', amount: 3200000, nontax: 200000 });
  eq(r.lines.map((l) => l.amount), [142500, 107850, 14172, 27000, 74350, 7435], 'W1 줄별(1원)');
  eq([r.deductions, r.net], [373307, 2826693], 'W1 합계(1원)');
  // W2: 월급 5,200,000, 비과세 200,000, 4명(자녀 2명) → 소득세 219,100 − 45,830 = 173,270
  r = P10.netPay({ basis: 'monthly', amount: 5200000, nontax: 200000, family: 4, children: 2 });
  eq(r.lines.map((l) => l.amount), [237500, 179750, 23620, 45000, 173270, 17320], 'W2 줄별');
  eq([r.deductions, r.net], [676460, 4523540], 'W2 합계');
  // W3: 월급 7,200,000 → 과세 7,000,000: 국민연금 상한 313,025(→313,020), 소득세 732,700
  r = P10.netPay({ basis: 'monthly', amount: 7200000, nontax: 200000 });
  eq(r.lines.map((l) => l.amount), [313020, 251650, 33060, 63000, 732700, 73270], 'W3 줄별');
  eq(r.net, 7200000 - (313020 + 251650 + 33060 + 63000 + 732700 + 73270), 'W3 실수령 = 월급 − 공제 합계');
  // W5: 2027년 1월 예정 = W1에서 국민연금만 5.0%(150,000)
  const c = P10.compare({ basis: 'monthly', amount: 3200000, nontax: 200000 });
  eq(c.lines.map((l) => l.diff), [7500, 0, 0, 0, 0, 0], '2027년에 달라지는 줄은 국민연금뿐(+7,500)');
  eq([c.now.net, c.next.net, c.netDiff], [2826700, 2819200, -7500], '2026 → 2027 실수령');
  eq(c.next.carried, ['health', 'care', 'employment', 'incomeTax'], '2027년에 지금 값을 그대로 쓴 줄');
  eq(c.now.carried, [], '지금 기준에는 그대로 쓴 값 없음');
  // 연봉 → 월급: ÷12 (원 미만 버림), 퇴직금 포함이면 ÷13
  r = P10.netPay({ basis: 'annual', amount: 40000000 });
  eq([r.gross, r.divisor, r.nontax, r.taxable, r.annual], [3333333, 12, 200000, 3133333, 40000000], '연봉 4,000만 ÷ 12');
  eq([r.line.pension.amount, r.line.health.amount, r.line.care.amount, r.line.employment.amount], [148810, 112640, 14800, 28190], '연봉 4,000만 4대 보험: 3,133,000 × 4.75% = 148,817.5 → 148,810');
  r = P10.netPay({ basis: 'annual', amount: 39000000, includeSeverance: true });
  eq([r.gross, r.divisor], [3000000, 13], '퇴직금 포함 연봉 3,900만 ÷ 13');
  r = P10.netPay({ basis: 'annual', amount: 38400000 });
  eq([r.gross, r.taxable, r.line.incomeTax.amount, r.net], [3200000, 3000000, 74350, 2826700], '연봉 3,840만 = 월 320만(W1과 같음)');
  eq(P10.netPay({ basis: 'monthly', amount: 3200000 }).net, 2826700, '비과세 기본값 = 식대 20만 원');
  eq(P10.netPay({ basis: 'monthly', amount: 3200000, nontax: 0 }).taxable, 3200000, '비과세 0으로 바꿀 수 있음');
  // 모든 결과에서: 실수령 = 월급 − 줄 합계, 줄은 전부 0 이상의 정수
  let bad = 0;
  for (let a = 0; a <= 200000000; a += 777777) {
    for (const core of [P10, P1]) {
      const x = core.netPay({ basis: 'annual', amount: a, family: 1 + (a % 5), children: 0 });
      if (!x.ok || x.net !== x.gross - x.lines.reduce((s, l) => s + l.amount, 0) || x.lines.some((l) => !Number.isInteger(l.amount) || l.amount < 0)) bad++;
      if (core === P10 && x.lines.some((l) => l.amount % 10)) bad++;
    }
  }
  eq(bad, 0, '합계가 맞고 10원 버림이면 모든 줄이 10원 단위');
});

G('실수령액: 범위 밖 입력은 알린다', () => {
  const c = (o) => P.netPay(o).code;
  eq(c({ amount: -1 }), 'negative', '음수');
  eq(c({ amount: NaN }), 'nan', 'NaN');
  eq(c({ amount: '4000' }), 'nan', '글자');
  eq(c({ amount: 1.5 }), 'not-integer', '소수');
  eq(c({ basis: 'monthly', amount: 1000000001 }), 'too-large', '월 10억 초과');
  eq(c({ basis: 'annual', amount: 12000000012 }), 'too-large', '연 120억 초과');
  eq(P.netPay({ basis: 'annual', amount: 12000000000 }).ok, true, '연 120억까지는 계산');
  eq(c({ amount: 40000000, family: 0 }), 'family', '가족 0명');
  eq(c({ amount: 40000000, family: 31 }), 'family', '가족 31명');
  eq(c({ amount: 40000000, family: 1.5 }), 'family', '가족 1.5명');
  eq(c({ amount: 40000000, family: 2, children: 2 }), 'children-over-family', '자녀가 가족 수(본인 제외)보다 많음');
  eq(P.netPay({ amount: 40000000, family: 2, children: 2 }).max, 1, '넣을 수 있는 자녀 수를 알려 줌');
  eq(c({ amount: 40000000, children: -1 }), 'children', '자녀 음수');
  eq(c({ amount: 40000000, nontax: -5 }), 'nontax', '비과세 음수');
  eq(c({ amount: 40000000, period: '2030-01' }), 'period', '없는 기준 시기');
  let r = P.netPay({ basis: 'monthly', amount: 150000, nontax: 200000 });
  eq([r.ok, r.nontax, r.taxable, r.deductions, r.net, r.notes], [true, 150000, 0, 0, 150000, ['nontax-clamped', 'no-taxable']], '비과세가 월급보다 크면 월급까지만');
  r = P.netPay({ basis: 'monthly', amount: 0 });
  eq([r.ok, r.net, r.deductions, r.notes], [true, 0, 0, ['no-taxable']], '0원');
});

G('연봉 실수령액 표', () => {
  const list = [24000000, 38400000, 62400000, 86400000];
  const rows = P10.salaryTable(list, { family: 1 });
  eq(rows.map((r) => r.annual), list, '연봉 순서 그대로');
  eq(rows[1].net, 2826700, '3,840만 = W1');
  eq(rows[3].line.incomeTax.amount, 732700, '8,640만 → 과세 700만 줄');
  eq(rows.every((r, i) => i === 0 || r.net > rows[i - 1].net), true, '연봉이 오르면 실수령도 오른다');
});

/* ───────── 금액 읽기 ───────── */
G('금액 읽기 [손]', () => {
  const m = (s, ctx) => { const r = P.parseMoney(s, ctx); return r.ok ? [r.value, r.assumed] : r.code; };
  eq(m('4,000만 원'), [40000000, null], '4,000만 원');
  eq(m('40000000'), [40000000, null], '40000000');
  eq(m('4천'), [40000000, 'man'], '4천 → 4,000만(만 원으로 읽음)');
  eq(m('300'), [3000000, 'man'], '300 → 300만(만 원으로 읽음)');
  eq(m('4000'), [40000000, 'man'], '4000 → 4,000만');
  eq(m('99999'), [999990000, 'man'], '99999 → 9억 9,999만');
  eq(m('100000'), [100000, null], '100000 → 10만 원(원으로 읽음)');
  eq(m('4천만원'), [40000000, null], '4천만원');
  eq(m('4천5백만'), [45000000, null], '4천5백만');
  eq(m('3,500만'), [35000000, null], '3,500만');
  eq(m('1억'), [100000000, null], '1억');
  eq(m('1억 2천'), [120000000, 'man'], '1억 2천 → 1억 2,000만');
  eq(m('1억 5000'), [150000000, 'man'], '1억 5000 → 1억 5,000만');
  eq(m('1억2천만원'), [120000000, null], '1억2천만원');
  eq(m('3.5억'), [350000000, null], '3.5억');
  eq(m('2백만'), [2000000, null], '2백만');
  eq(m('천만'), [10000000, null], '천만');
  eq(m('250만 5천원'), [2505000, null], '250만 5천원');
  eq(m('３００'), [3000000, 'man'], '전각 숫자');
  eq(m(' ₩ 40,000,000 '), [40000000, null], '₩와 빈칸');
  eq(m('40m'), [40000000, null], '40m');
  eq(m('3.5 million'), [3500000, null], '3.5 million');
  eq(m('2500k'), [2500000, null], '2500k');
  eq(m('40,000,000 KRW'), [40000000, null], 'KRW');
  eq(m('10320', 'won'), [10320, null], '시급 칸: 10320 → 원');
  eq(m('9천', 'won'), [9000, null], '시급 칸: 9천 → 9,000원');
  eq(m('1만 320', 'won'), [10320, null], '시급 칸: 1만 320');
  eq(m('1만', 'won'), [10000, null], '시급 칸: 1만');
  eq(m(''), 'empty', '빈칸');
  eq(m('   '), 'empty', '빈칸뿐');
  eq(m('-300'), 'negative', '음수');
  eq(m('abc'), 'format', '글자');
  eq(m('4천만만'), 'format', '만이 두 번');
  eq(m('1억2억'), 'format', '억이 두 번');
  eq(m('만'), 'format', '숫자 없이 만');
  eq(m('10320.5', 'won'), 'format', '원 단위 소수');
  eq(m('99999억'), 'too-large', '터무니없이 큰 값');
  eq(m('0'), [0, 'man'], '0');
  eq([P.readKo(3130000), P.readKo(120000000), P.readKo(3333333), P.readKo(9000), P.readKo(0), P.readKo(100000000), P.readKo(40000000), P.readKo(10000)],
    ['313만 원', '1억 2,000만 원', '333만 3,333원', '9,000원', '0원', '1억 원', '4,000만 원', '1만 원'], '만 원 단위 읽기');
  eq([P.fmt(0), P.fmt(999), P.fmt(1000), P.fmt(3130000), P.fmt(-45830)], ['0', '999', '1,000', '3,130,000', '-45,830'], '쉼표');
  eq([P.readEn(3130000), P.readEn(40000000), P.readEn(1200000000), P.readEn(9000)], ['3.13 million won', '40 million won', '1.2 billion won', '9,000 won'], '영어 읽기');
});

/* ───────── 3. 퇴직금 ───────── */
G('퇴직금 [공식: 고용노동부 예제]', () => {
  // 입사 2014-10-02, 퇴사 2017-09-16, 재직 1,080일. 3개월 임금 7,080,000(월 기본급 200만 + 기타수당 36만 × 3),
  // 연간 상여금 4,000,000 → 가산 1,000,000, 연차수당 60,000 × 5일 → 가산 75,000, 3개월 92일 → 1일 평균임금 88,641원 31전
  const r = P.severance({ join: '2014-10-02', leave: '2017-09-16', wages3m: 7080000, annualBonus: 4000000, leavePay: 300000 });
  eq([r.ok, r.eligible, r.serviceDays, r.period.days], [true, true, 1080, 92], '재직 1,080일, 3개월 92일');
  eq([r.bonusPart, r.leavePart, r.total], [1000000, 75000, 8155000], '상여금 가산 1,000,000 · 연차수당 가산 75,000 · 합계 8,155,000');
  eq(P.splitJeon(r.avgDailyJeon), { won: 88641, jeon: 31 }, '1일 평균임금 88,641원 31전');
  eq([r.period.start, r.period.end], ['2017-06-16', '2017-09-15'], '3개월 = 2017-06-16 ~ 2017-09-15');
  // [손] 퇴직금 = 88,641.31 × 30 × 1,080 ÷ 365 = 7,868,434.09 → 원 미만 버림 (최종 금액은 고용노동부 화면에 없어 손으로 계산)
  eq(r.amount, 7868434, '퇴직금 7,868,434원');
  eq(r.basis, 'average', '평균임금 기준');
  // 1일 통상임금이 더 크면 그쪽: 90,000 × 30 × 1,080 ÷ 365 = 7,989,041.09
  const o = P.severance({ join: '2014-10-02', leave: '2017-09-16', wages3m: 7080000, annualBonus: 4000000, leavePay: 300000, dailyOrdinary: 90000 });
  eq([o.basis, o.amount], ['ordinary', 7989041], '통상임금이 크면 통상임금으로');
  const o2 = P.severance({ join: '2014-10-02', leave: '2017-09-16', wages3m: 7080000, annualBonus: 4000000, leavePay: 300000, dailyOrdinary: 80000 });
  eq([o2.basis, o2.amount], ['average', 7868434], '통상임금이 작으면 평균임금 그대로');
});

G('퇴직금 [날짜: 파이썬 datetime]', () => {
  const D = ref('dates.json');
  let bad = 0, n = 0; const seen = new Set();
  for (const s of D.service) {
    const r = P.severance({ join: s.join, leave: s.leave, wages3m: 9000000 });
    n++; seen.add(s.pdays);
    if (!r.ok || r.serviceDays !== s.days || r.period.start !== s.start || r.period.end !== s.end || r.period.days !== s.pdays) { bad++; if (bad < 4) fails.push(`[퇴직금 날짜] ${JSON.stringify(s)} / ${JSON.stringify(r.period)} ${r.serviceDays}`); }
  }
  eq(bad, 0, `재직일수·3개월 날짜 수 ${n}쌍`);
  ok(n > 1000, '1,000쌍 넘게 대조');
  eq([...seen].sort(), [89, 90, 91, 92], '3개월 날짜 수는 89~92일 전부 나옴');
});

G('퇴직금: 대상·경계 [손]', () => {
  const s = (o) => P.severance({ wages3m: 9000000, ...o });
  // 1년: 2024-03-01 입사면 2025-03-01(마지막 근무일 2025-02-28의 다음 날)부터 대상
  eq([s({ join: '2024-03-01', leave: '2025-03-01' }).eligible, s({ join: '2024-03-01', leave: '2025-02-28' }).reason], [true, 'under-1y'], '딱 1년 / 하루 모자람');
  eq(s({ join: '2024-03-01', leave: '2025-02-28' }).amount, null, '대상이 아니면 금액을 내지 않음');
  eq(s({ join: '2024-03-01', leave: '2025-02-28' }).oneYearDate, '2025-03-01', '1년이 되는 날을 알려 줌');
  // 윤년: 2023-03-01 → 2024-02-29 는 365일이지만 1년이 안 찼다(2024-03-01이어야 함)
  eq([s({ join: '2023-03-01', leave: '2024-02-29' }).serviceDays, s({ join: '2023-03-01', leave: '2024-02-29' }).reason], [365, 'under-1y'], '365일이어도 달력으로 1년이 안 참');
  eq(s({ join: '2023-03-01', leave: '2024-03-01' }).eligible, true, '366일째 = 달력 1년');
  // 2월 29일 입사: 1년이 차는 날은 2025-02-28, 그 다음 날 2025-03-01부터
  eq([s({ join: '2024-02-29', leave: '2025-02-28' }).reason, s({ join: '2024-02-29', leave: '2025-03-01' }).eligible], ['under-1y', true], '2/29 입사');
  eq(s({ join: '2020-01-01', leave: '2026-01-01', weeklyHours: 14 }).reason, 'under-15h', '주 15시간 미만');
  eq(s({ join: '2020-01-01', leave: '2026-01-01', weeklyHours: 15 }).eligible, true, '주 15시간은 대상');
  // 금액 [손]: 9,000,000 ÷ 92일(2025-10-01~12-31) = 97,826.086… → 97,826원 09전(전 단위 올림). × 30 × 2,192일 ÷ 365 = 17,624,777.2
  const r = s({ join: '2020-01-01', leave: '2026-01-01' });
  eq([r.serviceDays, r.period.days, r.avgDailyJeon, r.amount], [2192, 92, 9782609, 17624777], '6년 근무');
  eq(s({ join: '2020-01-01', leave: '2026-01-01', periodDays: 90 }).avgDailyJeon, 10000000, '3개월 날짜 수를 직접 넣으면 그 값으로: 9,000,000 ÷ 90');
  eq(s({ join: '2020-01-01', leave: '2026-01-01', periodDays: 90 }).amount, 18016438, '100,000 × 30 × 2,192 ÷ 365 = 18,016,438.36');
  eq(s({ join: '2026-01-01', leave: '2026-01-01' }).code, 'date-order', '퇴직일 = 입사일');
  eq(s({ join: '2026-01-02', leave: '2026-01-01' }).code, 'date-order', '날짜 뒤바뀜');
  eq(s({ join: '2026-02-30', leave: '2027-01-01' }).code, 'date', '없는 날');
  eq(s({ join: '', leave: '2027-01-01' }).code, 'date', '빈 날짜');
  eq(s({ join: '2020-01-01', leave: '2026-01-01', wages3m: -1 }).code, 'negative', '음수 임금');
  eq(P.severance({ join: '2020-01-01', leave: '2026-01-01' }).code, 'nan', '임금 없음');
  eq(s({ join: '2020-01-01', leave: '2026-01-01', periodDays: 93 }).code, 'period-days', '93일은 없는 값');
});

/* ───────── 4. 시급·주휴수당 ───────── */
G('주휴수당·월 환산 [공식+손]', () => {
  const w = (hourly, h) => { const r = P.weeklyHoliday({ hourly, weeklyHours: h }); return [r.paidHours, r.pay]; };
  // [공식] 주 40시간이면 주휴 8시간 = 일급. 최저임금 표의 일급(8시간): 2026년 82,560, 2027년 85,600
  eq(w(10320, 40), [8, 82560], '주 40시간 = 8시간분 = 82,560');
  eq(w(10700, 40), [8, 85600], '2027년 시급으로 85,600');
  // [손] 주 소정근로시간 ÷ 40 × 8
  eq(w(10320, 20), [4, 41280], '주 20시간 = 4시간분');
  eq(w(10320, 15), [3, 30960], '주 15시간 = 3시간분');
  eq(w(10320, 22.5), [4.5, 46440], '주 22.5시간 = 4.5시간분');
  eq(w(10320, 14.99), [0, 0], '주 14.99시간 = 0');
  eq(w(10320, 14), [0, 0], '주 14시간 = 0');
  eq(w(10320, 45), [8, 82560], '주 45시간도 8시간분까지');
  eq(P.weeklyHoliday({ hourly: 10320, weeklyHours: 45 }).over40, true, '40시간 넘음을 알림');
  eq(P.weeklyHoliday({ hourly: 10320, weeklyHours: 14 }).eligible, false, '15시간 미만은 대상 아님');
  eq(w(12345, 17), [3.4, 41973], '12,345 × 3.4시간 = 41,973');
  // [공식] 월 환산 209시간(주 40시간 + 주휴 8시간), 최저임금 월 환산액 2,156,880 · 2,236,300
  eq(P.monthlyHours(40).hours, 209, '주 40시간 = 209시간');
  eq(P.hourlyToPay({ hourly: 10320, weeklyHours: 40 }).monthly, 2156880, '2026 최저임금 월 환산액');
  eq(P.hourlyToPay({ hourly: 10700, weeklyHours: 40, period: '2027-01' }).monthly, 2236300, '2027 최저임금 월 환산액');
  // [손] (20 + 4) × 365 ÷ 7 ÷ 12 = 104.2857…, × 10,320 = 1,076,228.57 → 원 미만 올림 1,076,229
  //      (3단계에서 바꿈: 전에는 버림 1,076,228. 올려야 이 월급을 다시 시급으로 바꿨을 때 10,320원이 나오고, 아래 '주 20시간의 최저 월급 1,076,229'와 같아진다)
  ok(Math.abs(P.monthlyHours(20).hours - 24 * 365 / 84) < 1e-9, '주 20시간 = 104.29시간');
  ok(Math.abs(P.monthlyHours(15).hours - 18 * 365 / 84) < 1e-9, '주 15시간 = 78.21시간');
  ok(Math.abs(P.monthlyHours(14).hours - 14 * 365 / 84) < 1e-9, '주 14시간 = 주휴 없이 60.83시간');
  let r = P.hourlyToPay({ hourly: 10320, weeklyHours: 20 });
  eq([r.weeklyBase, r.weekly.pay, r.weeklyTotal, r.monthly], [206400, 41280, 247680, 1076229], '시급 10,320 · 주 20시간');
  eq([r.minWage.ok, r.minWage.diff], [true, 0], '최저임금과 같음');
  r = P.hourlyToPay({ hourly: 10319, weeklyHours: 40 });
  eq([r.minWage.ok, r.minWage.diff], [false, -1], '10,319원은 2026년 최저임금 미달');
  r = P.hourlyToPay({ hourly: 10320, weeklyHours: 40, period: '2027-01' });
  eq([r.minWage.ok, r.minWage.hourly, r.minWage.diff], [false, 10700, -380], '10,320원은 2027년 최저임금(10,700) 미달');
  // 월급 → 시급(209시간)
  r = P.monthlyToHourly({ monthly: 2156880 });
  eq([r.hourly, r.minWage.ok, r.minWage.monthly], [10320, true, 2156880], '2,156,880 ÷ 209 = 10,320');
  r = P.monthlyToHourly({ monthly: 2156879 });
  eq([r.hourly, r.minWage.ok, r.minWage.diff], [10319, false, -1], '1원 모자라면 미달');
  r = P.monthlyToHourly({ monthly: 2236300, period: '2027-01' });
  eq([r.hourly, r.minWage.ok], [10700, true], '2027: 2,236,300 ÷ 209 = 10,700');
  eq(P.monthlyToHourly({ monthly: 2236299, period: '2027-01' }).minWage.ok, false, '2027: 1원 모자람');
  r = P.monthlyToHourly({ monthly: 3000000 });
  eq(r.hourly, 14354, '3,000,000 ÷ 209 = 14,354.06');
  r = P.monthlyToHourly({ monthly: 1076229, weeklyHours: 20 });
  eq([r.minWage.monthly, r.minWage.ok], [1076229, true], '주 20시간의 최저 월급 = 1,076,228.57을 올린 1,076,229');
  eq(P.monthlyToHourly({ monthly: 1076228, weeklyHours: 20 }).minWage.ok, false, '주 20시간: 1,076,228은 미달');
  eq(P.weeklyHoliday({ hourly: -1, weeklyHours: 40 }).code, 'negative', '음수 시급');
  eq(P.weeklyHoliday({ hourly: 10320, weeklyHours: 0 }).code, 'nan', '0시간');
  eq(P.weeklyHoliday({ hourly: 10320, weeklyHours: 200 }).code, 'nan', '주 200시간');
  eq(P.weeklyHoliday({ hourly: 100000000, weeklyHours: 40 }).code, 'too-large', '시급 1억');
  eq(P.hourlyToPay({ hourly: 10320, weeklyHours: 40, period: 'x' }).code, 'period', '없는 기준 시기');
});

/* ───────── 5. 실업급여 ───────── */
G('실업급여 [공식+손]', () => {
  const u = (o) => P.unemployment({ leave: '2026-10-10', tenureYears: 2, ...o });
  // [공식] 1350 답변: 2026-01-01 이후 이직자 하한 1H 8,256 … 8H 66,048, 상한 68,100(기초일액 113,500)
  eq([1, 2, 3, 4, 5, 6, 7, 8].map((h) => u({ avgDaily: 10000, dayHours: h }).daily), [8256, 16512, 24768, 33024, 41280, 49536, 57792, 66048], '하한 표 8칸');
  eq([1, 2, 3, 4, 5, 6, 7, 8].map((h) => DATA.unemployment.lowerByHours[h]), [8256, 16512, 24768, 33024, 41280, 49536, 57792, 66048], '자료의 하한 표');
  eq([u({ avgDaily: 113500 }).daily, u({ avgDaily: 113500 }).kind], [68100, 'rate'], '113,500 × 60% = 68,100');
  eq([u({ avgDaily: 200000 }).daily, u({ avgDaily: 200000 }).kind], [68100, 'upper'], '상한 68,100');
  eq([u({ avgDaily: 113501 }).daily, u({ avgDaily: 113501 }).kind], [68100, 'upper'], '113,501은 상한');
  eq(u({ avgDaily: 113499 }).daily, 68099, '113,499 × 60% = 68,099.4');
  // [손] 하루 8시간: 110,080 × 60% = 66,048 = 하한. 110,090 × 60% = 66,054
  eq([u({ avgDaily: 110080 }).daily, u({ avgDaily: 110080 }).kind], [66048, 'lower'], '하한과 같으면 하한');
  eq([u({ avgDaily: 110090 }).daily, u({ avgDaily: 110090 }).kind], [66054, 'rate'], '하한 바로 위');
  eq([u({ avgDaily: 50000 }).daily, u({ avgDaily: 50000 }).kind], [66048, 'lower'], '낮은 임금은 하한');
  eq(u({ avgDaily: 50000, dayHours: 4 }).daily, 33024, '하루 4시간 하한');
  eq(u({ avgDaily: 50000, dayHours: 4.5 }).daily, 37152, '하루 4.5시간 하한 = 4.5 × 10,320 × 80%');
  eq(u({ avgDaily: 70000, dayHours: 4 }).daily, 42000, '하루 4시간, 70,000 × 60% = 42,000 > 하한');
  eq(u({ avgDaily: 50000, dayHours: 10 }).daily, 66048, '하루 8시간 넘게 넣어도 8시간까지');
  eq(u({ avgDaily: 88641.31 }).daily, 66048, '고용노동부 예제의 평균임금(53,184.78)은 하한 아래');
  eq(u({ avgDaily: 111000.55 }).daily, 66600, '111,000.55 × 60% = 66,600.33 → 원 미만 버림');
  // [공식] 소정급여일수 표(고용보험법 별표 1)
  const days = (over50, y) => u({ avgDaily: 100000, over50, tenureYears: y }).days;
  eq([0.5, 1, 3, 5, 10].map((y) => days(false, y)), [120, 150, 180, 210, 240], '50세 미만');
  eq([0.5, 1, 3, 5, 10].map((y) => days(true, y)), [120, 180, 210, 240, 270], '50세 이상');
  eq([0.99, 2.99, 4.99, 9.99, 30].map((y) => days(false, y)), [120, 150, 180, 210, 240], '피보험기간 경계 바로 아래');
  eq(u({ avgDaily: 100000, disabled: true, tenureYears: 4 }).days, 210, '장애인은 50세 이상 표');
  // [손] 총액·30일 금액
  let r = u({ avgDaily: 50000, tenureYears: 0.5 });
  eq([r.total, r.monthly30], [7925760, 1981440], '66,048 × 120일, × 30일');
  r = u({ avgDaily: 200000, over50: true, tenureYears: 12 });
  eq([r.total, r.monthly30, r.days], [18387000, 2043000, 270], '68,100 × 270일');
  eq(u({ avgDaily: 100000 }).waitDays, 7, '대기기간 7일');
  // 이직일: 2025년은 범위 밖. 2027년은 하한을 2027년 최저임금으로(8시간 68,480원 = 10,700 × 8 × 80%), 상한은 미정이라 2026년 값
  //   (3단계에서 바꿈: 전에는 하한도 2026년 값이라 68,100원이 나왔다. 고용보험법 제45조 제4항 '이직일 당시 적용되던 최저임금', 제46조 제2항)
  eq(u({ avgDaily: 100000, leave: '2025-12-31' }).code, 'before-range', '2025년 이직은 지원 안 함');
  eq(u({ avgDaily: 100000, leave: '2026-01-01' }).provisional, null, '2026-01-01');
  eq(u({ avgDaily: 100000, leave: '2026-12-31' }).provisional, null, '2026-12-31');
  r = u({ avgDaily: 200000, leave: '2027-01-01' });
  eq([r.provisional, r.daily, r.lower, r.atLeast], ['next-year-undecided', 68480, 68480, true], '2027년 이직: 하한 68,480원이 바닥, 상한 미정(평균임금 20만 원이면 새 상한에 따라 더 받을 수 있다 = 최소)');
  eq(u({ avgDaily: -1 }).code, 'negative', '음수');
  eq(u({ avgDaily: 100000, dayHours: 0 }).code, 'hours', '0시간');
  eq(u({ avgDaily: 100000, tenureYears: -1 }).code, 'tenure', '피보험기간 음수');
  eq(u({ avgDaily: 100000, leave: '2026-13-01' }).code, 'date', '없는 날');
  eq(P.unemployment({ avgDaily: 100000, leave: '2026-10-10' }).code, 'tenure', '피보험기간 없음');
});

/* ───────── 6. 연차 ───────── */
G('연차 [공식 풀이+날짜]', () => {
  // [공식 풀이] 근로기준법 제60조: 1·2년 15일, 3·4년 16일, 5·6년 17일 … 21년 이상 25일
  eq(Array.from({ length: 25 }, (_, i) => P.leaveDaysAfterYears(i + 1)), [15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 25, 25, 25], '1~25년');
  eq([P.leaveDaysAfterYears(0), P.leaveDaysAfterYears(40)], [0, 25], '0년 = 0, 40년 = 한도 25');
  const D = ref('dates.json');
  let bad = 0;
  for (const s of D.roll) {
    const r = P.annualLeave({ join: s.join, years: 30 });
    const m = r.monthly.map((x) => x.date), y = r.rows.map((x) => x.date);
    if (JSON.stringify(m) !== JSON.stringify(s.months.slice(0, 11)) || JSON.stringify(y) !== JSON.stringify(s.years)) { bad++; if (bad < 4) fails.push(`[연차 날짜] ${s.join}: ${m} / ${s.months}`); }
  }
  eq(bad, 0, `입사일 ${D.roll.length}개의 다달이·해마다 생기는 날`);
  let r = P.annualLeave({ join: '2026-01-15', years: 5, asOf: '2026-10-10' });
  eq(r.monthly.length, 11, '첫해 다달이 11번');
  eq([r.monthly[0].date, r.monthly[10].date, r.monthly[0].useBy], ['2026-02-15', '2026-12-15', '2027-01-14'], '2026-01-15 입사: 2/15부터 12/15까지, 첫 1년 안에 써야 함');
  eq(r.rows.map((x) => [x.date, x.days]), [['2027-01-15', 15], ['2028-01-15', 15], ['2029-01-15', 16], ['2030-01-15', 16], ['2031-01-15', 17]], '해마다');
  eq(r.rows[0].useBy, '2028-01-14', '1년 동안 쓸 수 있음');
  eq(r.asOf, { date: '2026-10-10', yearsDone: 0, monthsDone: 8, current: 8, next: { date: '2026-10-15', days: 1 } }, '2026-10-10 기준: 8개월 채움');
  eq([P.annualLeave({ join: '2026-01-15', asOf: '2026-02-14' }).asOf.current, P.annualLeave({ join: '2026-01-15', asOf: '2026-02-15' }).asOf.current], [0, 1], '한 달이 찬 다음 날(2/15)부터 1일');
  eq([P.annualLeave({ join: '2026-01-15', asOf: '2027-01-14' }).asOf.yearsDone, P.annualLeave({ join: '2026-01-15', asOf: '2027-01-15' }).asOf.yearsDone], [0, 1], '1년이 찬 다음 날(이듬해 1/15)부터 1년 채움');
  eq(P.annualLeave({ join: '2026-01-15', asOf: '2027-01-15' }).asOf.current, 15, '1년 채운 날 15일');
  eq(P.annualLeave({ join: '2026-01-15', asOf: '2026-01-15' }).asOf, { date: '2026-01-15', yearsDone: 0, monthsDone: 0, current: 0, next: { date: '2026-02-15', days: 1 } }, '입사한 날');
  r = P.annualLeave({ join: '2026-01-15', asOf: '2026-12-20' });
  eq(r.asOf.current, 11, '11개월 채우면 11일');
  eq(r.asOf.next, { date: '2027-01-15', days: 15 }, '다음은 1년 되는 날 15일');
  r = P.annualLeave({ join: '2020-03-02', asOf: '2026-10-10' });
  eq([r.asOf.yearsDone, r.asOf.current, r.asOf.next], [6, 17, { date: '2027-03-02', days: 18 }], '6년 채움 = 17일, 다음 7년 = 18일');
  // [손] 1월 31일 입사: 한 달이 차는 날은 2월 말일, 연차는 그 다음 날(3월 1일)
  r = P.annualLeave({ join: '2026-01-31' });
  eq(r.monthly.slice(0, 3).map((x) => x.date), ['2026-03-01', '2026-03-31', '2026-05-01'], '1/31 입사');
  eq(P.annualLeave({ join: '2024-02-29' }).rows[0].date, '2025-03-01', '2/29 입사의 1년');
  eq(P.annualLeave({ join: '2024-02-29' }).rows[3].date, '2028-02-29', '2/29 입사의 4년');
  eq(P.annualLeave({ join: 'x' }).code, 'date', '날짜 아님');
  eq(P.annualLeave({ join: '2026-01-15', asOf: '2026-01-14' }).code, 'date-order', '기준일이 입사일보다 앞');
  eq(P.annualLeave({ join: '2026-01-15', years: 0 }).code, 'years', '0년');
});

G('날짜 읽기', () => {
  eq([P.parseDate('2026-02-29'), P.parseDate('2024-02-29') !== null, P.parseDate('2026-1-5') !== null, P.parseDate('1949-12-31'), P.parseDate('2101-01-01'), P.parseDate('2026/01/05'), P.parseDate(null)], [null, true, true, null, null, null, null], '없는 날·범위 밖·다른 꼴');
  eq(P.iso(P.parseDate('2026-1-5')), '2026-01-05', '한 자리 월·일');
  eq(P.lastThreeMonths('2017-09-16'), { ok: true, start: '2017-06-16', end: '2017-09-15', days: 92 }, '퇴직 전 3개월');
});

/* ───────── 2단계에서 더한 것 ───────── */
G('65세 이후 새로 고용: 고용보험료를 떼지 않음', () => {
  // [공식] 징수법 제13조 제3항: 65세 이후에 고용된 자는 실업급여의 보험료를 징수하지 아니한다
  const a = net(P10, { amount: 3000000 }), b = net(P10, { amount: 3000000, noEmployment: true });
  eq([a.line.employment.amount, b.line.employment.amount, b.line.employment.exempt], [27000, 0, true], '[손] 3,000,000 × 0.9% = 27,000 → 0');
  eq(b.net - a.net, 27000, '실수령액이 그만큼 늘어남');
  eq(['pension', 'health', 'care', 'incomeTax', 'localTax'].map((k) => b.line[k].amount), ['pension', 'health', 'care', 'incomeTax', 'localTax'].map((k) => a.line[k].amount), '다른 줄은 그대로');
  eq([a.noEmployment, b.noEmployment], [false, true], '결과에 표시');
  eq(DATA.net.employmentExemptAge, 65, '[공식] 65세');
});

G('기준 기간이 지났는지', () => {
  // [공식] 국민연금 요율은 해마다 1월, 기준소득월액 상·하한은 7월부터 1년, 최저임금은 1월~12월
  eq(P.validity('2026-10', '2026-10-10'), { ok: true, stale: false, items: [], year: 2026 }, '오늘(2026-10-10)');
  eq(P.validity('2026-10', '2026-12-31').stale, false, '2026-12-31까지는 그대로');
  eq(P.validity('2026-10', '2027-01-01').items.map((x) => x.id), ['pensionRate', 'minWage'], '2027-01-01: 요율·최저임금 기간이 지남');
  eq(P.validity('2026-10', '2027-07-01').items.map((x) => x.id), ['pensionRate', 'pensionLimit', 'minWage'], '2027-07-01: 상·하한 기간도 지남');
  eq(P.validity('2027-01', '2027-06-30').stale, false, '2027년 1월 기준은 2027-06-30까지');
  eq(P.validity('2027-01', '2027-07-01').items, [{ id: 'pensionLimit', until: '2027-06-30' }], '2027-07-01: 상·하한만 지남');
  eq(P.validity('2027-01', '2028-01-01').items.length, 3, '2028년');
  eq([P.validity('x', '2026-10-10').code, P.validity('2026-10', 'x').code], ['period', 'date'], '잘못된 입력');
  eq([P.unemploymentValidity('2026-12-31').stale, P.unemploymentValidity('2027-01-01').stale], [false, true], '구직급여 표는 2026-12-31까지');
});

G('자료: 2단계에서 더한 값 [공식]', () => {
  // 국민연금법 부칙 제4조: 2026년 1만분의 475 … 2032년 1만분의 625, 제88조 제3항 1천분의 65
  eq(DATA.pensionSchedule.rows.map((r) => [r.year, r.pct]), [[2026, '4.75'], [2027, '5.0'], [2028, '5.25'], [2029, '5.5'], [2030, '5.75'], [2031, '6.0'], [2032, '6.25'], [2033, '6.5']], '국민연금 요율 일정');
  eq([DATA.periods['2026-10'].pension.ratePct, DATA.periods['2027-01'].pension.ratePct], [DATA.pensionSchedule.rows[0].pct, DATA.pensionSchedule.rows[1].pct], '기준 시기의 요율 = 일정표');
  // 고용노동부 퇴직금 예제: 2014-10-02 ~ 2017-09-16, 1,080일, 월 기본급 2,000,000 + 기타수당 360,000, 상여금 4,000,000, 연차수당 60,000 × 5일, 88,641원 31전
  const e = DATA.severance.example;
  eq([e.join, e.leave, e.serviceDays, e.periodDays, e.monthlyBase, e.monthlyAllowance, e.annualBonus, e.leaveUnit, e.leaveDays, e.avgWon, e.avgJeon], ['2014-10-02', '2017-09-16', 1080, 92, 2000000, 360000, 4000000, 60000, 5, 88641, 31], '예제 조건과 공식 값');
  eq([e.wages3m, e.leavePay, e.bonusPart, e.leavePart], [7080000, 300000, 1000000, 75000], '[공식] A 7,080,000 · B 1,000,000 · C 75,000');
  eq([(e.monthlyBase + e.monthlyAllowance) * 3, e.leaveUnit * e.leaveDays], [e.wages3m, e.leavePay], '예제 값끼리 맞음');
  const r = P.severance({ join: e.join, leave: e.leave, wages3m: e.wages3m, annualBonus: e.annualBonus, leavePay: e.leavePay });
  eq([r.serviceDays, r.period.days, r.bonusPart, r.leavePart, r.avgDailyJeon], [e.serviceDays, e.periodDays, e.bonusPart, e.leavePart, e.avgWon * 100 + e.avgJeon], '로직이 예제의 공식 값을 그대로 냄');
  eq(r.amount, 7868434, '[손] 88,641.31 × 30 × 1,080 ÷ 365 = 7,868,434.09 → 7,868,434');
  // [날짜] 파이썬 기준값(ref/dates.json)의 3개월 날짜 수는 89~92일 사이
  const spans = new Set(ref('dates.json').service.map((x) => x.pdays));
  eq([Math.min(...spans), Math.max(...spans)], [DATA.severance.periodDaysMin, DATA.severance.periodDaysMax], '퇴직 전 3개월 날짜 수 범위 = 자료');
  eq([DATA.leave.attendPct, DATA.leave.addFromYears], [80, 3], '[공식] 근로기준법 제60조: 80퍼센트, 3년 이상');
  eq([DATA.rounding.verified, DATA.rounding.src], ['own', ['treasury47']], '끝수는 우리 방식(국고금관리법 제47조의 방식)');
  ok(['treasury47', 'nhisDecree33', 'npsDecree3', 'eiLaw2'].every((k) => /^https:\/\/www\.law\.go\.kr\//.test(DATA.sources[k].url)), '끝수·비과세 근거 출처');
});

/* ───────── 3단계(제3자 평가 반영)에서 더한 것 ───────── */
G('H1 만 60세 이상(국민연금 없음) · 65세 이후 입사(고용보험료 없음) [평가+손]', () => {
  // [공식] 국민연금법 제6조·제8조: 가입 대상은 18세 이상 60세 미만. 징수법 제13조 제3항: 65세 이후에 고용된 자는 실업급여 보험료를 징수하지 않는다
  eq([DATA.net.pensionExemptAge, DATA.net.employmentExemptAge], [60, 65], '[공식] 60세 · 65세');
  ok(/^https:\/\/www\.law\.go\.kr\//.test(DATA.sources[DATA.net.pensionExemptSrc[0]].url) && /제6조·제8조/.test(DATA.sources.npsLaw6.name), '근거: 국민연금법 제6조·제8조');
  // 두 선택의 조합 4가지 × 연봉·월급 4가지. 기대값은 손으로: 실수령액 = 기본 실수령액 + 안 떼는 줄
  //  A 연봉 4,000만(비과세 20만): 줄 [148,810 · 112,640 · 14,800 · 28,190 · 84,620 · 8,460], 실수령 2,935,813
  //    [평가] 65세만 켠 값 2,964,003(고용보험만 0원), 둘 다 켠 값 3,112,813(평가 보고서 H1의 '실제'·'기대')
  //  B 월급 300만(비과세 0): 줄 [142,500 · 107,850 · 14,170 · 27,000 · 74,350 · 7,430], 실수령 2,626,700
  //  C 월급 720만(비과세 20만): 줄 [313,020 · 251,650 · 33,060 · 63,000 · 732,700 · 73,270], 실수령 5,733,300 (국민연금 상한)
  //  D 월급 30만(비과세 0): 국민연금 하한 410,000 × 4.75% = 19,475 → 19,470, 고용보험 2,700
  const cases = [
    [{ basis: 'annual', amount: 40000000 }, 2935813, 148810, 28190],
    [{ basis: 'monthly', amount: 3000000, nontax: 0 }, 2626700, 142500, 27000],
    [{ basis: 'monthly', amount: 7200000, nontax: 200000 }, 5733300, 313020, 63000],
    [{ basis: 'monthly', amount: 300000, nontax: 0 }, null, 19470, 2700],
  ];
  for (const [inp, base, pen, emp] of cases) {
    const r0 = P10.netPay(inp), tag = `${inp.basis} ${inp.amount}`;
    if (base !== null) eq(r0.net, base, `${tag}: 둘 다 끔 = 기본 실수령액`);
    eq([r0.line.pension.amount, r0.line.employment.amount], [pen, emp], `${tag}: 기본 국민연금·고용보험`);
    for (const [np, ne] of [[false, false], [true, false], [false, true], [true, true]]) {
      const r = P10.netPay({ ...inp, noPension: np, noEmployment: ne });
      eq([r.line.pension.amount, r.line.employment.amount], [np ? 0 : pen, ne ? 0 : emp], `${tag} 60세 ${np} · 65세 ${ne}: 국민연금·고용보험`);
      eq(r.net, r0.net + (np ? pen : 0) + (ne ? emp : 0), `${tag} 60세 ${np} · 65세 ${ne}: 실수령액은 안 떼는 만큼만 늘어난다`);
      eq(['health', 'care', 'incomeTax', 'localTax'].map((k) => r.line[k].amount), ['health', 'care', 'incomeTax', 'localTax'].map((k) => r0.line[k].amount), `${tag} 60세 ${np} · 65세 ${ne}: 다른 줄은 그대로`);
      eq([r.noPension, r.noEmployment, r.line.pension.exempt, r.line.employment.exempt], [np, ne, np, ne], `${tag}: 결과에 표시`);
      eq(r.net, r.gross - r.lines.reduce((a, l) => a + l.amount, 0), `${tag}: 실수령 = 월급 − 줄 합계`);
    }
  }
  eq([P10.netPay({ basis: 'annual', amount: 40000000, noEmployment: true }).net, P10.netPay({ basis: 'annual', amount: 40000000, noPension: true, noEmployment: true }).net, P10.netPay({ basis: 'annual', amount: 40000000, noPension: true }).net],
    [2964003, 3112813, 3084623], '[평가] 연봉 4,000만: 65세만 2,964,003 / 둘 다 3,112,813 / [손] 60세만 3,084,623');
  // 2027년 비교: 국민연금을 안 내면 2027년에 달라지는 줄이 없다
  let c = P10.compare({ basis: 'annual', amount: 40000000, noPension: true });
  eq([c.netDiff, c.lines.filter((l) => l.diff !== 0).length, c.next.line.pension.amount], [0, 0, 0], '2027년 비교: 국민연금 없음 → 차이 0');
  c = P10.compare({ basis: 'annual', amount: 40000000, noEmployment: true });
  eq([c.netDiff, c.next.line.employment.amount], [-7840, 0], '2027년 비교: 65세만 켜면 국민연금 차이 그대로(−7,840), 고용보험은 두 해 모두 0');
  eq(P10.salaryTable([40000000], { noPension: true })[0].line.pension.amount, 0, '연봉 표 계산에도 같은 조건이 먹는다');
});

G('M4·L1 퇴직금 = 고용노동부 계산기 [실물·평가]', () => {
  // [실물] 고용노동부 화면에 직접 넣은 10건: 3개월 날짜 수·시작일·1일 평균임금·퇴직금
  const live = ref('moel-live.json').rows, z = (n) => String(n).padStart(2, '0'), d = (a) => `${a[0]}-${z(a[1])}-${z(a[2])}`;
  let n = 0;
  for (const x of live) {
    const [j, l, w, b, lp] = x.case, r = P.severance({ join: d(j), leave: d(l), wages3m: w, annualBonus: b, leavePay: lp });
    if (x.dialogs.length) { eq(r.reason, 'under-1y', `[실물] ${d(j)} ~ ${d(l)}: 고용노동부 화면도 1년 미만이라고 알린다`); continue; }
    const start = x.periods[0][0].split('.').map(Number);
    eq([r.serviceDays, r.period.days, r.period.start], [x.termDays, x.sumday, d(start)], `[실물] ${d(l)} 퇴직: 재직 ${x.termDays}일, 3개월 ${x.sumday}일(${x.periods[0][0]}부터)`);
    eq(r.avgDailyJeon, Math.round(Number(x.avrPay.replace(/,/g, '')) * 100), `[실물] ${d(l)} 퇴직: 1일 평균임금 ${x.avrPay}`);
    eq(r.amountIfEligible, x.retirePay, `[실물] ${d(l)} 퇴직: 퇴직금 ${x.retirePay}`);
    n++;
  }
  eq(n, 9, '[실물] 금액까지 견준 것 9건');
  // [평가] 252건: 평가자가 고용노동부 스크립트를 분수 계산으로 옮겨 구한 퇴직금·날짜 수
  const ev = ref('eval-sev.json').rows; let bad = 0, cnt = 0;
  for (const x of ev) {
    const r = P.severance({ join: x.join, leave: x.leave, wages3m: x.w, annualBonus: x.b, leavePay: x.lp, dailyOrdinary: x.o || undefined });
    if (!r.ok) continue;   // 입사일 = 퇴직일 같은 범위 밖 1건
    cnt++;
    if (r.amountIfEligible !== x.moel.sev || r.period.days !== x.moel.d3) { bad++; if (bad < 4) fails.push(`[평가 퇴직금] ${JSON.stringify(x)} / ${r.amountIfEligible} ${r.period.days}`); }
  }
  eq(bad, 0, `[평가] ${cnt}건 전부 고용노동부 계산과 같음(날짜 수·원 미만 반올림)`);
  ok(cnt >= 250, '[평가] 250건 넘게 대조');
  // [평가 보고서 M4] 2020-03-02 입사, 3개월 임금 900만: 5/31 퇴직 91일 18,541,924 · 5/30 90일 18,739,726 · 5/29 89일 18,941,974
  const s = (leave) => { const r = P.severance({ join: '2020-03-02', leave, wages3m: 9000000 }); return [r.period.start, r.period.days, r.amount]; };
  eq([s('2026-05-31'), s('2026-05-30'), s('2026-05-29')], [['2026-03-01', 91, 18541924], ['2026-03-01', 90, 18739726], ['2026-03-01', 89, 18941974]], '[평가] 5월 29·30·31일 퇴직(평년): 3월 1일부터');
  // 윤년(2028): 5/29는 2월 29일이 있으니 그날부터, 5/30·5/31은 3월 1일부터
  eq([s('2028-05-29').slice(0, 2), s('2028-05-30').slice(0, 2), s('2028-05-31').slice(0, 2)], [['2028-02-29', 90], ['2028-03-01', 90], ['2028-03-01', 91]], '[손] 윤년의 5월 29·30·31일');
  // 4월·9월·11월·6월이 걸려 날짜가 없으면 그 달 말일부터(고용노동부 화면: 7/31 → 4.30, 12/31 → 9.30)
  eq([s('2026-07-31').slice(0, 2), s('2026-12-31').slice(0, 2), s('2027-02-28').slice(0, 2), s('2026-05-28').slice(0, 2), s('2026-06-01').slice(0, 2)],
    [['2026-04-30', 92], ['2026-09-30', 92], ['2026-11-28', 92], ['2026-02-28', 89], ['2026-03-01', 92]], '[손] 그 밖의 말일·경계');
  // [평가 보고서 L1] 반올림: 2026-12-31 퇴직 20,061,049(버리면 20,061,048), 8/31 19,080,108, 10/1 19,329,363
  eq([s('2026-12-31')[2], s('2026-08-31')[2], s('2026-10-01')[2]], [20061049, 19080108, 19329363], '[평가] 원 미만 반올림');
  // [손] 반올림 경계: 1일 통상임금 100,000원 × 30 × 재직일수 ÷ 365. 73일이면 600,000 딱, 1일 8,219.18 → 8,219, 2일 16,438.36 → 16,438, 5일 41,095.89 → 41,096
  const o = (days) => P.severance({ join: '2020-01-01', leave: P.iso(P.parseDate('2020-01-01') + days), wages3m: 0, dailyOrdinary: 100000 }).amountIfEligible;
  eq([o(73), o(1), o(2), o(5), o(4)], [600000, 8219, 16438, 41096, 32877], '[손] 반올림 경계(…18 → 내림, …89 → 올림, …71 → 올림)');
  // 큰 금액에서도 정밀도를 잃지 않는다: BigInt 로 다시 계산
  let lost = 0;
  for (const [w, j, l] of [[99999999999, '1950-01-01', '2100-12-31'], [100000000000, '1960-02-29', '2099-12-31'], [87654321987, '1970-01-01', '2100-12-30'], [3000000000, '1990-05-05', '2026-05-31']]) {
    const r = P.severance({ join: j, leave: l, wages3m: w, annualBonus: w, leavePay: w });
    const want = Number((BigInt(r.usedJeon) * 30n * BigInt(r.serviceDays) * 2n + 36500n) / 73000n);
    if (r.amount !== want) lost++;
  }
  eq(lost, 0, '큰 금액(3개월 임금 1,000억 원, 재직 150년)도 BigInt 계산과 같다');
  // 한꺼번에 곱하면(평균임금 × 30 × 재직일수가 2^53을 넘음) 1원이 틀리는 값. 기대값은 BigInt 로 따로 구했다: 7,284,406,956,006(실수 계산은 …007)
  eq(P.severance({ join: '1950-01-01', leave: '2098-10-29', wages3m: 99999748819, annualBonus: 99999748818, leavePay: 99999748816 }).amount, 7284406956006, '[손] 큰 수의 정밀도');
  // 딱 반(…0.5원)이면 올린다: 고용노동부 스크립트의 Math.round 와 같다. 18.25원 × 30 × 1일 ÷ 365 = 1.5 → 2, 97,826.05원 × 30 × 365일 ÷ 365 = 2,934,781.5 → 2,934,782
  eq([P.severance({ join: '2026-01-01', leave: '2026-01-02', wages3m: 73, periodDays: 4 }).amountIfEligible, P.severance({ join: '2025-01-01', leave: '2026-01-01', wages3m: 1956521, periodDays: 20 }).amount], [2, 2934782], '[손] 딱 반은 올림');
  eq(P.severance({ join: '2020-01-01', leave: '2026-01-01', wages3m: 100000000001 }).code, 'too-large', '한도를 넘으면 알린다');
  eq(P.severance({ join: '2020-01-01', leave: '2026-01-01', wages3m: 9000000, dailyOrdinary: 1000000001 }).code, 'too-large', '통상임금 한도');
});

G('M2·M3 구직급여: 정수 계산과 2027년 하한 [분수·평가]', () => {
  const U = DATA.unemployment, R = ref('ub.json');
  // [공식] 자료끼리 맞는지: 상한 = 113,500 × 60%, 하한 표 = 시간 × 10,320 × 80%, 2027년 최저임금 = 기준 시기의 값
  eq(U.upper, U.baseMax * U.rateNum / U.rateDen, '상한 68,100 = 113,500 × 60%');
  eq([1, 2, 3, 4, 5, 6, 7, 8].map((h) => h * U.minWageHourly * U.lowerNum / U.lowerDen), [1, 2, 3, 4, 5, 6, 7, 8].map((h) => U.lowerByHours[h]), '하한 표 = 시간 × 10,320 × 80%');
  eq([U.next.minWageHourly, U.next.year, U.next.upperStatus, U.next.from, U.next.until], [DATA.periods['2027-01'].minWage.hourly, 2027, 'undecided', '2027-01-01', '2027-12-31'], '2027년 값');
  // [분수] 평가자가 1원 오차를 찾은 조건 그대로 + 92일·91일 구간
  let bad = 0;
  for (const [leave, hours, w, days, byRate, lower, daily] of R.float) {
    const r = P.unemployment({ wages3m: w, leave, dayHours: hours, tenureYears: 3 });
    if (!r.ok || r.periodDays !== days || r.byRate !== byRate || r.lower !== lower || r.daily !== daily) { bad++; if (bad < 4) fails.push(`[구직급여 분수] ${leave} ${hours}h ${w}: 기대 ${[days, byRate, lower, daily]} / 실제 ${r.ok ? [r.periodDays, r.byRate, r.lower, r.daily] : r.code}`); }
  }
  eq(bad, 0, `[분수] ${R.float.length}건(90일 구간 526건 포함)`);
  eq(R.float.filter((x) => x[0] === '2026-03-31' && x[1] === 4).length, 526, '평가자의 526건 조건이 들어 있다');
  // [평가 보고서 M2] 이직일 2026-03-31 · 4시간 · 600만 → 40,000원(전에는 39,999), 180일이면 7,200,000원. 이직일 2026-02-28 · 8시간 · 10,127,100 → 67,514원
  let r = P.unemployment({ wages3m: 6000000, leave: '2026-03-31', dayHours: 4, tenureYears: 3 });
  eq([r.periodDays, r.byRate, r.daily, r.days, r.total], [90, 40000, 40000, 180, 7200000], '[평가] 6,000,000 ÷ 90 × 60% = 40,000');
  eq(P.unemployment({ wages3m: 10127100, leave: '2026-02-28', dayHours: 8, tenureYears: 3 }).daily, 67514, '[평가] 10,127,100 ÷ 90 × 60% = 67,514');
  // 화면에 보이는 숫자끼리 다시 계산해도 맞는다: 평균임금의 60% = floor(임금 × 60 ÷ (날짜 수 × 100)), 1일 평균임금(원 미만 버림) = floor(임금 ÷ 날짜 수)
  bad = 0;
  for (let w = 5000000; w <= 10300000; w += 7919) for (const leave of ['2026-03-31', '2026-06-30', '2026-09-30', '2026-05-29']) {
    const x = P.unemployment({ wages3m: w, leave, dayHours: 8, tenureYears: 1 }), d = x.periodDays;
    const want = w > 113500 * d ? 68100 : Number(BigInt(w) * 60n / (BigInt(d) * 100n));
    if (x.byRate !== want || x.avgFloor !== Math.floor(w / d) || x.capped !== (w > 113500 * d)) bad++;
  }
  eq(bad, 0, '[손] 임금 × 60 ÷ (날짜 수 × 100)을 한 번만 버린다');
  // 3개월 날짜 수는 퇴직금과 같은 방식(이직일 다음 날이 퇴직일): 이직일 5월 30일 → 3월 1일부터 91일, 5월 28일(평년) → 89일
  eq([P.unemploymentPeriod('2026-05-30'), P.unemploymentPeriod('2026-05-28').days, P.unemploymentPeriod('2026-09-30').days, P.unemploymentPeriod('2026-03-31').days],
    [{ ok: true, start: '2026-03-01', end: '2026-05-30', days: 91, rule: 'feb' }, 89, 92, 90], '[손] 이직일 이전 3개월');
  // 상한: 평균임금이 113,500원을 넘으면 68,100원. 딱 113,500원(10,215,000 ÷ 90)이면 60% = 68,100이고 '상한'이 아니라 '60%'
  eq([P.unemployment({ wages3m: 10215000, leave: '2026-03-31', tenureYears: 1 }).kind, P.unemployment({ wages3m: 10215001, leave: '2026-03-31', tenureYears: 1 }).kind, P.unemployment({ wages3m: 10215001, leave: '2026-03-31', tenureYears: 1 }).daily], ['rate', 'upper', 68100], '상한 경계');
  // 1일 평균임금을 직접 넣는 길(전 단위까지)도 같은 값
  eq(P.unemployment({ avgDaily: 66666.67, leave: '2026-03-31', dayHours: 4, tenureYears: 3 }).byRate, 40000, 'avgDaily 66,666.67 × 60% = 40,000.002');
  eq(P.unemployment({ avgDaily: 66666.66, leave: '2026-03-31', dayHours: 4, tenureYears: 3 }).byRate, 39999, 'avgDaily 66,666.66 × 60% = 39,999.996(평균임금을 먼저 버리면 생기는 값)');
  // [분수] 2027년 이직: 하한은 2027년 최저임금 10,700원으로, 상한은 2026년 값 그대로
  bad = 0;
  for (const [leave, hours, w, days, byRate, lower, daily] of R.next) {
    const x = P.unemployment({ wages3m: w, leave, dayHours: hours, tenureYears: 3 });
    if (!x.ok || x.periodDays !== days || x.byRate !== byRate || x.lower !== lower || x.daily !== daily || x.minWageHourly !== 10700 || x.upperStatus !== 'undecided' || x.year !== 2027) bad++;
  }
  eq(bad, 0, `[분수] 2027년 이직 ${R.next.length}건`);
  // [공식 풀이] 10,700 × 8 × 80% = 68,480 > 2026년 상한 68,100
  r = P.unemployment({ wages3m: 9000000, leave: '2027-01-15', tenureYears: 3 });
  eq([r.lower, r.daily, r.kind, r.lowerOverUpper, r.upper, r.total], [68480, 68480, 'lower', true, 68100, 68480 * 180], '[평가 M3] 2027-01-15 · 900만: 하루 68,480원(2027년 하한)');
  // '최소'는 새 상한이 금액을 바꿀 수 있는 사람에게만: 평균임금이 지금 상한(113,500원)을 넘고, 상한이 없다고 칠 때의 60%가 하한보다 클 때
  //   [손] 900만 ÷ 92일 = 97,826 → 60% 58,695 < 하한 68,480: 상한이 얼마로 정해져도 하한액 그대로(제46조 제2항) → 최소 아님
  eq(r.atLeast, false, '2027년 · 900만 · 8시간: 60%가 하한보다 적어 상한과 상관없이 하한액(최소 표시 없음)');
  //   [손] 1,500만 ÷ 92일 = 163,043 → 60% 97,826 > 68,480, 지금 상한으로는 68,100 → 하한 68,480이 바닥이고 새 상한에 따라 더 받을 수 있다 → 최소
  r = P.unemployment({ wages3m: 15000000, leave: '2027-01-15', tenureYears: 3 });
  eq([r.daily, r.kind, r.capped, r.atLeast], [68480, 'lower', true, true], '2027년 · 1,500만 · 8시간: 최소 68,480');
  //   [손] 4시간 · 1,500만: 지금 상한 68,100 > 하한 34,240 → 68,100, 새 상한에 따라 더 받을 수 있다 → 최소
  r = P.unemployment({ wages3m: 15000000, leave: '2027-01-15', dayHours: 4, tenureYears: 3 });
  eq([r.daily, r.kind, r.atLeast], [68100, 'upper', true], '2027년 · 1,500만 · 4시간: 최소 68,100(2026년 상한액)');
  //   [손] 경계: 평균임금 113,600원(10,451,200 ÷ 92)은 상한을 넘지만 60% = 68,160 < 하한 68,480 → 상한이 올라도 하한액 → 최소 아님
  r = P.unemployment({ wages3m: 10451200, leave: '2027-01-15', tenureYears: 3 });
  eq([r.avgFloor, r.capped, r.daily, r.atLeast], [113600, true, 68480, false], '2027년 경계: 평균임금 113,600원은 상한을 넘어도 60%가 하한보다 적다');
  //   [손] 경계: 60%가 하한과 같을 때(68,480 ÷ 0.6 = 114,133.33… → 10,500,267 ÷ 92 × 0.6 = 68,480.002 → 68,480)는 더 받을 수 없다, 1원 넘으면(10,500,421 → 68,481) 최소
  eq([P.unemployment({ wages3m: 10500267, leave: '2027-01-15', tenureYears: 3 }).atLeast, P.unemployment({ wages3m: 10500421, leave: '2027-01-15', tenureYears: 3 }).atLeast], [false, true], '2027년 경계: 60%가 하한을 1원이라도 넘어야 최소');
  eq([1, 4, 8].map((h) => P.unemployment({ wages3m: 3000000, leave: '2027-06-30', dayHours: h, tenureYears: 1 }).lower), [8560, 34240, 68480], '[공식 풀이] 2027년 하한: 시간 × 10,700 × 80%');
  r = P.unemployment({ wages3m: 9000000, leave: '2026-12-31', tenureYears: 3 });
  eq([r.lower, r.atLeast, r.upperStatus, r.year, r.minWageHourly, r.lowerOverUpper], [66048, false, 'fixed', 2026, 10320, false], '2026-12-31 이직은 2026년 값');
  r = P.unemployment({ wages3m: 7000000, leave: '2027-03-31', dayHours: 4, tenureYears: 3 });
  eq([r.byRate, r.lower, r.daily, r.kind, r.atLeast], [46666, 34240, 46666, 'rate', false], '[손] 2027년 4시간: 7,000,000 ÷ 90 × 60% = 46,666.67(지금 상한 아래라 최소 표시 없음)');
  // 2028년부터는 계산 기준이 바뀔 예정이라 계산하지 않는다
  eq([P.unemployment({ wages3m: 9000000, leave: '2028-01-01', tenureYears: 3 }).code, P.unemployment({ wages3m: 9000000, leave: '2027-12-31', tenureYears: 3 }).ok], ['after-range', true], '2028년 이직은 범위 밖');
  eq([P.unemployment({ wages3m: 1.5, leave: '2026-03-31', tenureYears: 1 }).code, P.unemployment({ wages3m: -1, leave: '2026-03-31', tenureYears: 1 }).code, P.unemployment({ leave: '2026-03-31', tenureYears: 1 }).code], ['not-integer', 'negative', 'nan'], '범위 밖 입력');
  eq([P.unemploymentValidity('2026-12-31').nextYear, P.unemploymentValidity('2027-01-01').nextYear, P.unemploymentValidity('2028-01-01').nextYear], [false, true, false], '2027년은 하한만 확정인 기간');
});

G('L3·L13 시급 ↔ 월급 왕복, 시간 표시 [평가+손]', () => {
  // [평가 보고서 L3] 시급 10,320 · 주 15시간 → 807,171.43 → 올림 807,172. 그 월급을 다시 넣으면 시급 10,320, 최저임금과 같다(전에는 807,171 → '1원 적어요')
  let r = P.hourlyToPay({ hourly: 10320, weeklyHours: 15 });
  eq(r.monthly, 807172, '[평가] 10,320 · 주 15시간 → 807,172');
  let b = P.monthlyToHourly({ monthly: r.monthly, weeklyHours: 15 });
  eq([b.hourly, b.minWage.ok, b.minWage.diff, b.minWage.monthly, b.minWage.diffMonthly], [10320, true, 0, 807172, 0], '[평가] 807,172 · 15시간 → 시급 10,320, 최저임금과 같다');
  eq(P.hourlyToPay({ hourly: 10320, weeklyHours: 20 }).monthly, 1076229, '[평가] 주 20시간 1,076,229');
  // 자기 결과를 '적다'고 하지 않는다: 시급 → 월급 → 시급이 처음 값으로 돌아온다
  let bad = 0, n = 0;
  for (const wage of [10320, 10700, 9860, 12000, 12345, 15000, 33333]) for (let h = 1; h <= 60; h += 0.25) for (const period of ['2026-10', '2027-01']) {
    const a = P.hourlyToPay({ hourly: wage, weeklyHours: h, period }), c = P.monthlyToHourly({ monthly: a.monthly, weeklyHours: h, period });
    n++;
    if (c.hourly !== wage || c.minWage.ok !== a.minWage.ok || c.minWage.diff !== a.minWage.diff) bad++;
    // 월급은 시급 × 시간보다 모자라지 않고 1원 넘게 많지도 않다
    if (a.monthly * a.monthlyHours.den < wage * a.monthlyHours.num || (a.monthly - 1) * a.monthlyHours.den >= wage * a.monthlyHours.num) bad++;
  }
  eq(bad, 0, `[손] 왕복 ${n}건: 시급이 그대로 돌아오고 최저임금 판정이 같다`);
  // 월급 쪽 판정: '월급이 최저임금 월 환산액 이상' = '시급이 최저임금 이상'
  bad = 0;
  for (let h = 1; h <= 40; h += 0.5) { const need = P.monthlyToHourly({ monthly: 1, weeklyHours: h }).minWage.monthly; for (const m of [need - 1, need, need + 1]) { const x = P.monthlyToHourly({ monthly: m, weeklyHours: h }); if (x.minWage.ok !== (m >= need)) bad++; } }
  eq(bad, 0, '[손] 월 환산액 경계에서 두 판정이 같다');
  // [공식] 주 40시간은 고시의 209시간이라 끝수가 없다
  eq([P.hourlyToPay({ hourly: 10320, weeklyHours: 40 }).monthly, P.hourlyToPay({ hourly: 10700, weeklyHours: 40, period: '2027-01' }).monthly], [2156880, 2236300], '[공식] 최저임금 월 환산액은 그대로');
  // 월 환산 시간: 화면에 보여 줄 0.1시간 단위 값
  eq([P.monthlyHours(20).tenths, P.monthlyHours(15).tenths, P.monthlyHours(30).tenths, P.monthlyHours(40).tenths, P.monthlyHours(14).tenths], [1043, 782, 1564, 2090, 608], '[손] 104.29 → 104.3, 78.21 → 78.2, 156.43 → 156.4, 209, 60.83 → 60.8');
  ok(Math.abs(P.monthlyHours(22.5).hours - 27 * 365 / 84) < 1e-9 && P.monthlyHours(22.5).num * 84 === 27 * 365 * P.monthlyHours(22.5).den, '주 22.5시간 = (22.5 + 4.5) × 365 ÷ 84');
  // [평가 보고서 L13] 14.99시간은 15시간이 아니다: 주휴 0, 표시는 14.99
  const w = P.weeklyHoliday({ hourly: 10320, weeklyHours: 14.99 });
  eq([w.eligible, w.pay, w.hours100, P.fmtDec(w.hours100, 100)], [false, 0, 1499, '14.99'], '[평가] 14.99시간');
  eq([P.fmtDec(1500, 100), P.fmtDec(2250, 100), P.fmtDec(4000, 100), P.fmtDec(4500, 1000), P.fmtDec(3002, 1000), P.fmtDec(5, 100)], ['15', '22.5', '40', '4.5', '3.002', '0.05'], '시간 글자');
  eq([P.weeklyHoliday({ hourly: 10320, weeklyHours: 15.01 }).paid1000, P.weeklyHoliday({ hourly: 10320, weeklyHours: 22.5 }).paid1000], [3002, 4500], '유급 주휴 시간(0.001시간 단위)');
  // 소수 셋째 자리가 있는 시간은 반올림해 받지 않는다(14.999 → 15.00이 되면 주휴가 생겨 버린다)
  eq([P.weeklyHoliday({ hourly: 10320, weeklyHours: 14.999 }).code, P.hourlyToPay({ hourly: 10320, weeklyHours: 14.999 }).code, P.monthlyToHourly({ monthly: 1000000, weeklyHours: 14.999 }).code], ['hours', 'hours', 'hours'], '14.999시간은 받지 않는다');
});

G('L2 1,000만 원 초과 + 80·120%: 끝수 순서 [손]', () => {
  // 이 계산기의 순서: 계산식 금액(원 미만 버림) → 자녀 공제 → 비율 → 10원 미만 버림.
  // [평가 보고서 L2] 월급 12,134,265 · 부양 4 · 자녀 2 · 80%: 1,170,840 + 25,000 + floor(2,134,265 × 0.98 × 0.35 = 732,052.895) = 1,927,892 − 45,830 = 1,882,062 × 80% = 1,505,649.6 → 1,505,640
  //   (계산식 금액의 원 미만을 끝까지 들고 가면 1,505,650. 어느 쪽이 국세청 방식인지는 확인하지 못했다)
  const r = P10.netPay({ basis: 'monthly', amount: 12134265, nontax: 0, family: 4, children: 2, ratio: 80 }).line.incomeTax;
  eq([r.lookup.piece, r.tableTax, r.afterCredit, r.amount], [732052, 1927892, 1882062, 1505640], '식 금액 원 미만 버림 → 공제 → 80% → 10원 미만 버림');
});

G('L4~L6 금액 읽기: 모든 칸이 같은 규칙 [손]', () => {
  const I = DATA.input.manBelow, m = (s, ctx) => { const r = P.parseMoney(s, ctx); return r.ok ? [r.value, r.read, r.big] : r.code; };
  const A = { unit: 'man', manBelow: I.annual }, M = { unit: 'man', manBelow: I.monthly }, N = { unit: 'man', manBelow: I.nontax }, W = { unit: 'won' };
  eq([I.annual, I.monthly, I.wages3m, I.bonus, I.nontax, I.leavePay], [1000000, 100000, 100000, 100000, 10000, 10000], '칸마다 원으로 읽기 시작하는 수');
  // 연봉 칸: 99999 → 9억 9,999만, 100000 → 10억(뒤집히지 않는다). 100만부터는 원
  eq([m('99999', A), m('100000', A), m('999999', A), m('1000000', A), m('40000000', A)], [[999990000, 'man', false], [1000000000, 'man', false], [9999990000, 'man', false], [1000000, 'won', true], [40000000, 'won', true]], '[평가 L5] 연봉 칸: 99999 ↔ 100000 사이에서 뒤집히지 않는다');
  // 월급 칸: 250 → 250만, 2500000 → 250만 원(원으로)
  eq([m('250', M), m('2500000', M), m('99999', M), m('100000', M), m('1', M)], [[2500000, 'man', false], [2500000, 'won', true], [999990000, 'man', false], [100000, 'won', true], [10000, 'man', false]], '월급 칸');
  // 비과세 칸: 20 → 20만 원(전에는 20원), 200000 → 20만 원, 13.75 → 137,500원
  eq([m('20', N), m('200000', N), m('13.75', N), m('500', N), m('9999', N), m('10000', N), m('0', N)], [[200000, 'man', false], [200000, 'won', true], [137500, 'man', false], [5000000, 'man', false], [99990000, 'man', false], [10000, 'won', true], [0, 'man', false]], '[평가 L4] 비과세 칸');
  // 3개월 임금 칸: 900 → 900만(퇴직금·실업급여·홈이 같다), 7080000 → 원
  eq([m('900', { unit: 'man', manBelow: I.wages3m }), m('7080000', { unit: 'man', manBelow: I.wages3m }), m('708만', { unit: 'man', manBelow: I.wages3m })], [[9000000, 'man', false], [7080000, 'won', true], [7080000, 'won', false]], '[평가 L6] 3개월 임금 칸');
  // '원'·₩·won 을 붙이면 어느 칸이든 원
  eq([m('300원', A), m('4천원', A), m('₩40,000', A), m('40000000원', A), m('1억 2천원', A), m('20원', N)], [[300, 'won', false], [4000, 'won', false], [40000, 'won', false], [40000000, 'won', false], [100002000, 'won', false], [20, 'won', false]], "'원'을 붙이면 원");
  // 말로 쓴 것은 그대로
  eq([m('4천', A), m('1억 2천', A), m('4,000만 원', A), m('3.5억', A), m('40m', A), m('4k', A)], [[40000000, 'man', false], [120000000, 'man', false], [40000000, 'won', false], [350000000, 'won', false], [40000000, 'won', false], [4000, 'won', false]], '말·단위가 붙은 글자');
  // 원 칸(시급·1일 통상임금, 영어판): 숫자는 원 그대로
  eq([m('10320', W), m('40,000', W), m('900', W), m('40000000', W), m('9천', W), m('40m', W), m('2.5m', W)], [[10320, 'won', false], [40000, 'won', false], [900, 'won', false], [40000000, 'won', false], [9000, 'won', false], [40000000, 'won', false], [2500000, 'won', false]], '원 칸');
  // 원 미만이 남는 글자는 조용히 깎지 않는다
  eq([m('1.23456만', A), m('0.5원', W), m('3.33333', N), m('1.2345', N), m('1.15m', W), m('1.15억', A)], ['format', 'format', 'format', [12345, 'man', false], [1150000, 'won', false], [115000000, 'won', false]], '원 미만이 남으면 못 읽었다고 알린다');
  eq([m('', A), m('-5', N), m('abc', N), m('1e5', N), m('99999억', A)], ['empty', 'negative', 'format', 'format', 'too-large'], '[평가 L4] 못 읽는 글자는 알린다');
  // 옛 꼴(글자 하나로 준 칸 종류)도 그대로 돈다
  eq([P.parseMoney('300', 'man').value, P.parseMoney('300', 'won').value, P.parseMoney('300').value], [3000000, 300, 3000000], "ctx 'man'·'won'·없음");
  eq([P.readEn(3130000), P.readEn(40000000), P.readEn(1050000), P.readEn(1999999), P.readEn(2500000000), P.readEn(999999)], ['3.13 million won', '40 million won', '1.05 million won', '1.99 million won', '2.5 billion won', '999,999 won'], '영어 읽기(정수 계산)');
});

G('L11 해가 바뀌면 기본 기준 [손]', () => {
  // [공식] 2027년 1월 1일부터 국민연금 5.0%, 최저임금 10,700원
  eq([DATA.periods['2027-01'].starts, DATA.periods['2027-01'].pension.from, DATA.periods['2027-01'].minWage.from], ['2027-01-01', '2027-01-01', '2027-01-01'], '2027년 1월 기준의 시행일');
  eq([P.defaultPeriod('2026-10-10'), P.defaultPeriod('2026-12-31'), P.defaultPeriod('2027-01-01'), P.defaultPeriod('2027-01-05'), P.defaultPeriod('2028-03-01'), P.defaultPeriod('x')], ['2026-10', '2026-10', '2027-01', '2027-01', '2027-01', '2026-10'], '기기 날짜가 2027년이면 2027년 1월 기준');
  // 그 기준으로 계산하면 확정된 값은 새 값, 미정은 carried 로 표시된다
  const r = P10.netPay({ basis: 'annual', amount: 40000000, period: P.defaultPeriod('2027-01-05') });
  eq([r.line.pension.amount, r.net, r.carried], [156650, 2927973, ['health', 'care', 'employment', 'incomeTax']], '[손] 3,133,000 × 5.0% = 156,650. 실수령 2,935,813 − 7,840');
  eq(P.validity(P.defaultPeriod('2027-01-05'), '2027-01-05').stale, false, '그 기준은 아직 기간 안');
});

console.log(fails.join('\n'));
console.log(`${fail ? '실패' : '통과'}: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
