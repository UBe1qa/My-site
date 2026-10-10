// 만든 페이지의 숫자 검산: node salary/tests/site.mjs   (먼저 python3 -B salary/_dev/build.py)
//  1) 연봉 실수령액 표(한국어·영어)의 모든 칸 = 로직(netPay)으로 다시 계산한 값
//  2) 첫 HTML에 미리 넣은 결과(명세서) = 화면 코드(pay-view.js)가 지금 그리는 것(빌드가 낡지 않았고, 처음 그림과 스크립트가 붙은 뒤의 그림이 같다)
//  3) 가이드 글의 예시 숫자 = 이 파일에서 조건을 직접 적어 로직으로 다시 구한 값. 공식 원문에 있는 숫자는 [공식]으로 따로 적어 대조한다
//  4) 글·소개에 '주인 없는 숫자'가 없다: 쉼표가 든 숫자는 전부 자료 파일이나 계산값에 있는 수여야 한다(손으로 적은 낡은 숫자 잡기)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const require = createRequire(import.meta.url);
const A = (f) => path.join(ROOT, 'assets', f);
const DATA = require(A('pay-data.js')), GANI = require(A('gani-2026.js'));
const P = require(A('pay-core.js'))(DATA, GANI);
const makeView = require(A('pay-view.js'));
const { build, tableAnnuals, TABLE_OPTS, NET_STATE } = await import(path.join(ROOT, '_dev', 'calc.mjs'));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');
const f = (n) => P.fmt(n);

let pass = 0, fail = 0; const fails = [];
function ok(cond, name) { if (cond) pass++; else { fail++; if (fails.length < 60) fails.push(name); } }
function has(page, s, name) { ok(page.includes(s), `${name}: "${s}" 가 글에 없음`); }

/* ───────── 1. 연봉 실수령액 표 ───────── */
for (const [rel, lang] of [['table/index.html', 'ko'], ['en/table/index.html', 'en']]) {
  const html = read(rel), rows = [...html.matchAll(/<tr id="a\d+" data-a="(\d+)">([\s\S]*?)<\/tr>/g)];
  const annuals = tableAnnuals();
  ok(rows.length === annuals.length && rows.length === 91, `${rel}: 줄 수 ${rows.length}`);
  let bad = 0;
  rows.forEach((m, i) => {
    const a = +m[1], cells = [...m[2].matchAll(/<td[^>]*>([\d,]+)<\/td>/g)].map((x) => +x[1].replace(/,/g, ''));
    const r = P.netPay({ amount: a, basis: 'annual', family: 1, children: 0, nontax: DATA.net.nontaxMeal, ratio: 100, period: DATA.now });
    const want = [r.gross, r.line.pension.amount, r.line.health.amount, r.line.care.amount, r.line.employment.amount, r.line.incomeTax.amount, r.line.localTax.amount, r.deductions, r.net];
    if (a !== annuals[i] || JSON.stringify(cells) !== JSON.stringify(want)) { bad++; if (bad < 4) fails.push(`${rel} 연봉 ${a}: 표 ${cells} / 로직 ${want}`); }
    if (cells[1] + cells[2] + cells[3] + cells[4] + cells[5] + cells[6] !== cells[7] || cells[0] - cells[7] !== cells[8]) bad++;
  });
  ok(bad === 0, `${rel}: 로직과 다른 줄 ${bad}개`);
  ok(JSON.stringify(TABLE_OPTS) === JSON.stringify({ family: 1, children: 0, nontax: 200000, ratio: 100, period: '2026-10' }), '표의 가정');
}

/* ───────── 2. 미리 넣은 결과 = 화면 코드가 그리는 것 ───────── */
const slipOf = (html) => { const m = /<div class="slip is-ex" id="slip">([\s\S]*?)<\/div>\n  <p class="sr" id="live"/.exec(html); return m ? m[1] : null; };
for (const lang of ['ko', 'en']) {
  const V = makeView(P, lang), pre = lang === 'ko' ? '' : 'en/';
  const n = V.net(NET_STATE), home = read(pre + 'index.html');
  ok(slipOf(home) === n.slip, `${pre}: 첫 화면 명세서가 화면 코드와 같음`);
  ok(home.includes(`<div id="cmp">${n.compare}</div>`), `${pre}: 앞뒤 금액 표가 화면 코드와 같음`);
  ok(home.includes(`id="optsSum">${n.summary}</span>`) && home.includes(`id="read">${n.read.html}</p>`), `${pre}: 조건 한 줄·읽기 줄`);
  ok(slipOf(read(pre + 'severance/index.html')) === V.sev({}).slip, `${pre}severance/: 명세서`);
  ok(slipOf(read(pre + 'hourly/index.html')) === V.hourly({ mode: 'hourly', text: '', hours: '', period: DATA.now }).slip, `${pre}hourly/: 명세서`);
  if (lang === 'ko') {
    ok(slipOf(read('unemployment/index.html')) === V.ub({}).slip, 'unemployment/: 명세서');
    ok(slipOf(read('annual-leave/index.html')) === V.leave({}).slip, 'annual-leave/: 명세서');
  }
}
// 첫 화면 예시의 숫자를 손으로도 한 번: 연봉 4,000만 원 ÷ 12 = 3,333,333 / 과세 3,133,333
{
  const r = P.netPay({ amount: 40000000, basis: 'annual' }), h = text(read('index.html'));
  // [손] 국민연금 3,133,000 × 4.75% = 148,817.5 → 148,810 / 건강보험 3,133,333 × 3.595% = 112,643.3 → 112,640 / 장기요양 112,640 × 0.9448 ÷ 7.19 = 14,801.4 → 14,800
  //      고용보험 3,133,333 × 0.9% = 28,199.9 → 28,190 / 소득세 [공식 표본 3,120~3,140천원 구간은 표본에 없음 → 조회표] 84,620 / 지방소득세 8,460
  ok(JSON.stringify(r.lines.map((l) => l.amount)) === JSON.stringify([148810, 112640, 14800, 28190, 84620, 8460]) && r.net === 2935813, '[손] 연봉 4,000만 원 예시');
  for (const s of ['2,935,813', '−148,810원', '−112,640원', '−14,800원', '−28,190원', '−84,620원', '−8,460원', '3,333,333원', '−397,520원']) has(h, s, '첫 화면');
  // [손] 2027년: 3,133,000 × 5.0% = 156,650 → 차이 7,840
  ok(P.compare({ amount: 40000000, basis: 'annual' }).netDiff === -7840, '[손] 2027년 1월 차이 −7,840');
  has(h, '2027년 1월부터는 국민연금이 5.0%로 올라 한 달에 7,840원 덜 받아요.', '첫 화면 2027 문장');
}

/* ───────── 3. 가이드 글의 예시 숫자 ───────── */
const G = (slug, en) => text(read((en ? 'en/' : '') + `guide/${slug}/index.html`));
const net = (o) => P.netPay(o);
{ // 명세서와 다른 이유
  const g = G('myeongseseo-dareun-iyu');
  const a = net({ amount: 3000000, basis: 'monthly' }), b = net({ amount: 3000000, basis: 'monthly', nontax: 0 });
  has(g, f(a.net) + '원', '비과세 20만'); has(g, f(b.net) + '원', '비과세 없음'); has(g, `${f(a.net - b.net)}원 차이`, '차이');
  // [공식] 간이세액표 4,000~4,020천원 줄: 195,960 | 167,950 | 109,590 | 91,670, '4명(자녀 2명)' 45,840원(verified-salary.md 5번)
  for (const [fam, tax] of [[1, 195960], [2, 167950], [3, 109590], [4, 91670]]) {
    ok(net({ amount: 4200000, basis: 'monthly', family: fam }).line.incomeTax.amount === tax, `[공식] 과세 400만 가족 ${fam}명 ${tax}`);
    has(g, f(tax) + '원', `가족 ${fam}명`);
  }
  ok(net({ amount: 4200000, basis: 'monthly', family: 4, children: 2 }).line.incomeTax.amount === 45840, '[공식] 4명(자녀 2명) 45,840'); has(g, '45,840원', '자녀 2명');
  // [손] 195,960 × 80% = 156,768 → 156,760 / × 120% = 235,152 → 235,150
  ok(net({ amount: 4200000, basis: 'monthly', ratio: 80 }).line.incomeTax.amount === 156760 && net({ amount: 4200000, basis: 'monthly', ratio: 120 }).line.incomeTax.amount === 235150, '[손] 80%·120%');
  has(g, '156,760원', '80%'); has(g, '235,150원', '120%');
  // [공식 풀이] 상한 6,590,000 × 4.75% = 313,025 → 10원 미만 버림 313,020
  ok(net({ amount: 7000000, basis: 'monthly' }).line.pension.amount === 313020, '[손] 국민연금 상한'); has(g, '313,020원', '국민연금 상한');
  has(g, '41만~659만 원', '기준소득월액 범위');
}
{ // 4대 보험 요율
  const g = G('2026-4dae-boheom-yoyul');
  for (const s of ['4.75%', '3.595%', '0.9%', '0.9448%', '7.19%', '5.0%', '5.25%', '6.5%', '10,080원', '4,591,740원', '20,160원', '9,183,480원', '10,320원', '10,700원', '2,156,880원', '2,236,300원']) has(g, s, '[공식] 요율 글');
  for (const a of [30000000, 40000000, 50000000, 70000000, 100000000]) {
    const c = P.compare({ amount: a, basis: 'annual' });
    has(g, f(c.now.line.pension.amount) + '원', `연봉 ${a} 국민연금`); has(g, f(c.next.line.pension.amount) + '원', `연봉 ${a} 2027 국민연금`); has(g, f(-c.netDiff) + '원', `연봉 ${a} 차이`);
    ok(c.lines.filter((x) => x.diff !== 0).length === 1 && c.lines[0].diff === -c.netDiff, `연봉 ${a}: 달라지는 줄은 국민연금 하나`);
  }
  // [공식 풀이] 2027년 1~6월 상한 6,590,000 × 5.0% = 329,500
  has(g, '329,500원', '2027 국민연금 상한');
}
{ // 주휴수당
  const g = G('juhyu-sudang-gyesan');
  // [손] 15시간: 3시간 × 10,320 = 30,960 / 20시간: 4 × 10,320 = 41,280 / 30시간: 6 × 10,320 = 61,920 / 40시간: 8 × 10,320 = 82,560(= [공식] 일급 8시간)
  for (const [h, pay] of [[14, 0], [15, 30960], [20, 41280], [30, 61920], [40, 82560], [45, 82560]]) {
    ok(P.weeklyHoliday({ hourly: 10320, weeklyHours: h }).pay === pay, `[손] 주 ${h}시간 주휴수당 ${pay}`);
    if (pay) has(g, f(pay) + '원', `주 ${h}시간`);
    has(g, f(P.hourlyToPay({ hourly: 10320, weeklyHours: h }).weeklyTotal) + '원', `주 ${h}시간 주급`);
  }
  has(g, '4시간 × 10,320원 = 41,280원', '계산 예');
}
{ // 퇴직금
  const g = G('toejikgeum-gyesan-yeje'), e = G('severance-pay-korea', true);
  // [공식] 고용노동부 예제: 7,080,000 + 1,000,000 + 75,000 = 8,155,000, 92일, 88,641원 31전, 재직 1,080일
  for (const s of ['7,080,000원', '1,000,000원', '75,000원', '8,155,000원', '92일', '88,641원 31전', '1,080일', '7,868,434원']) has(g, s, '[공식] 퇴직금 글');
  for (const s of ['₩7,080,000', '₩1,000,000', '₩75,000', '₩8,155,000', '92 days', '₩88,641.31', '1,080', '₩7,868,434']) has(e, s, '[공식] severance guide');
  const r = P.severance({ join: '2014-10-02', leave: '2017-09-16', wages3m: 7080000, annualBonus: 4000000, leavePay: 300000 });
  ok(r.amount === 7868434 && r.avgDailyJeon === 8864131, '[공식] 88,641원 31전 → [손] 7,868,434원');
}
{ // 209시간
  const g = G('choejeoimgeum-209sigan'), e = G('minimum-wage-weekly-holiday-allowance', true);
  for (const s of ['209시간', '208.57', '2,156,880원', '2,236,300원', '82,560원', '85,600원', '104.3시간', '78.2시간', '156.4시간']) has(g, s, '209시간 글');
  // [손] (20 + 4) × 365 ÷ 7 ÷ 12 = 104.2857 / (15 + 3) → 78.214 / (30 + 6) → 156.43
  ok(Math.abs(P.monthlyHours(20).hours - 104.2857) < 1e-3 && Math.abs(P.monthlyHours(15).hours - 78.2143) < 1e-3 && Math.abs(P.monthlyHours(30).hours - 156.4286) < 1e-3, '[손] 월 환산 시간');
  // [손] 2,500,000 ÷ 209 = 11,961.7 → 11,961
  ok(P.monthlyToHourly({ monthly: 2500000 }).hourly === 11961, '[손] 월급 250만 → 시급'); has(g, '11,961원', '월급 → 시급'); has(e, '₩11,961', 'monthly to hourly');
  for (const s of ['₩10,320', '₩10,700', '₩2,156,880', '₩2,236,300', '₩380', '209', '208.57', '₩41,280', '₩30,960', '₩82,560']) has(e, s, 'minimum wage guide');
}
{ // 실업급여
  const g = G('sileopgeupyeo-haru-geumaek');
  // [공식] 상한 68,100, 기초일액 113,500, 하한 표 8칸, 소정급여일수 표
  for (const s of ['68,100원', '113,500원', '66,048원', '8,256원', '16,512원', '24,768원', '33,024원', '41,280원', '49,536원', '57,792원', '2,052원', '120일', '150일', '180일', '210일', '240일', '270일']) has(g, s, '[공식] 실업급여 글');
  // [손] 9,000,000 ÷ 92 = 97,826.08 → × 60% = 58,695.6 → 58,695 (하한 66,048) / 6,000,000 ÷ 92 = 65,217.39 → 39,130 / 15,000,000 ÷ 92 = 163,043 → 상한
  const u = (w) => P.unemployment({ avgDaily: Math.floor(w * 100 / 92) / 100, dayHours: 8, leave: '2026-09-30', tenureYears: 3 });
  ok(P.lastThreeMonths('2026-10-01').days === 92, '[날짜] 2026-07-01 ~ 2026-09-30 = 92일');
  ok(u(9000000).byRate === 58695 && u(9000000).daily === 66048 && u(6000000).byRate === 39130 && u(15000000).daily === 68100, '[손] 구직급여 계산 예');
  for (const s of ['58,695원', '39,130원']) has(g, s, '실업급여 글 예');
  // [풀이] 2027년 최저임금 10,700 × 8 × 80% = 68,480
  has(g, '68,480원', '2027 하한 계산');
}
{ // 영어: 급여 공제
  const e = G('payroll-deductions-korea', true), r = net({ amount: 40000000, basis: 'annual' });
  for (const s of ['₩40,000,000', '₩3,333,333', '₩200,000', '₩3,133,333', '₩2,935,813', '₩397,520', '₩148,810', '₩112,640', '₩14,800', '₩28,190', '₩84,620', '₩8,460', '₩7,840', '₩195,960', '₩167,950', '₩91,670', '₩20,830', '₩45,830', '4.75%', '3.595%', '0.9448%', '7.19%', '0.9%', '5.0%', '₩410,000', '₩6,590,000', '₩10,080', '₩4,591,740']) has(e, s, 'payroll guide');
  ok(r.taxable === 3133333 && r.deductions === 397520, '[손] taxable·deductions');
}

/* ───────── 4. 주인 없는 숫자 ───────── */
{
  const known = new Set();
  const add = (n) => { known.add(n); known.add(Math.floor(n / 10000)); known.add(n % 10000); known.add(Math.floor(n / 100000000)); known.add(Math.floor(n % 100000000 / 10000)); known.add(Math.floor(n / 1000)); };
  const all = build();
  delete all.pre;
  (JSON.stringify(all).match(/\d+/g) || []).forEach((s) => add(+s));
  GANI.rows.forEach((r) => r.forEach(add));
  const pages = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').match(/<loc>[^<]+<\/loc>/g).map((s) => s.replace(/<\/?loc>/g, '').replace('https://salary.lumenlab.page/', ''))
    .filter((p) => /guide\/.+|about\/$/.test(p));
  let orphans = 0;
  for (const p of pages) {
    const t = text(read(p + 'index.html'));
    for (const m of t.matchAll(/\d{1,3}(?:,\d{3})+/g)) {
      const n = +m[0].replace(/,/g, '');
      if (!known.has(n)) { orphans++; if (orphans < 8) fails.push(`${p}: 자료·계산값에 없는 숫자 ${m[0]} (…${t.slice(Math.max(0, m.index - 25), m.index + 20)}…)`); }
    }
  }
  ok(orphans === 0, `글·소개의 주인 없는 숫자 ${orphans}개`);
  ok(pages.length >= 11, `검사한 글·소개 ${pages.length}장`);
}

console.log(fails.join('\n'));
console.log(`${fail ? '실패' : '통과'}  만든 페이지 숫자 검산: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
