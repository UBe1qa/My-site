// build.py 가 부른다: core.js·sheet.js 의 값을 JSON으로 내보낸다(계산·그리기 코드는 JS 한 곳에만 둔다).
// node _dev/export.js > (표준 출력 JSON)
const path = require('path');
const C = require(path.join(__dirname, '..', 'assets', 'core.js'));
const S = require(path.join(__dirname, '..', 'assets', 'sheet.js'));
const MONTHS = []; for (let n = 2026 * 12 + 9; n <= 2027 * 12 + 11; n++) MONTHS.push([Math.floor(n / 12), n % 12 + 1]);
const out = { months_list: MONTHS, years: {}, months: {}, svg: {}, son: {}, lunar: {}, misc: {} };
for (const c of ['KR', 'US']) {
  out.years[c] = {};
  for (let y = 2025; y <= 2030; y++) {
    const h = C.holidays(c, y);
    const lang0 = c === 'KR' ? 'ko' : 'en';
    out.years[c][y] = { basis: h.basis, list: h.list.map((it) => Object.assign({}, it, { lab: S.label(it, { lang: lang0, country: c }) })), facts: C.yearFacts(c, y), breaks: C.breaks(c, y, 3), bridges: C.bridges(c, y, 1) };
  }
  for (const [y, m] of MONTHS) {
    const f = C.monthFacts(c, y, m), lang = c === 'KR' ? 'ko' : 'en';
    out.months[c + '-' + y + '-' + m] = { facts: f, web: S.webMonth({ year: y, month: m, lang, country: c }),
      labels: f.holidays.map((it) => S.label(it, { lang, country: c }, true)) };
  }
}
for (const y of [2026, 2027, 2028]) {
  out.svg['ko-' + y] = S.svg(S.build({ kind: 'year', year: y, lang: 'ko', country: 'KR', paper: 'a4' }));
  out.svg['en-' + y] = S.svg(S.build({ kind: 'year', year: y, lang: 'en', country: 'US', paper: 'letter' }));
}
// 손 없는 날(2026-10 ~ 2027-12): 날짜·요일·공휴일·음력
for (const [y, m] of MONTHS) {
  const f = C.monthFacts('KR', y, m);
  out.son[y + '-' + m] = f.son.map((d) => { const l = C.lunar.fromSolar(y, m, d), h = C.holidayOn('KR', y, m, d); return { d, wd: C.wd(y, m, d), lunar: (l.leap ? '윤' : '') + l.m + '.' + l.d, hol: h ? h.label : '' }; });
}
for (let y = 2025; y <= 2030; y++) out.lunar[y] = C.lunar.months(y);
out.misc = {
  lunarMin: C.lunar.min, lunarMax: C.lunar.max,
  subs: Object.fromEntries([2026, 2027, 2028, 2029, 2030].map((y) => [y, C.holidays('KR', y).list.filter((x) => x.kind === 'substitute')])),
  weeks: { a: C.isoWeek(2027, 1, 1), b: C.isoWeek(2027, 1, 4), c: C.usWeek(2027, 1, 1), d: C.usWeek(2027, 1, 3), e: C.isoWeek(2026, 12, 31), f: C.usWeek(2026, 12, 31), g: C.usWeek(2027, 12, 31), h: C.isoWeek(2027, 12, 31) },
  seol2027: C.lunar.toSolar(2027, 1, 1, false), chuseok2027: C.lunar.toSolar(2027, 8, 15, false),
};
process.stdout.write(JSON.stringify(out));
