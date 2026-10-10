/* 달력 핵심 로직 테스트: calendar 폴더에서 `node tests/run.js`
   기준값은 core.js 와 다른 방법으로 구한 것만 쓴다.
   - _dev/ref/kasi.json : 한국천문연구원 달력자료·우주항공청 월력요항(공식)
   - tests/cases.json   : 파이썬 datetime·calendar, korean_lunar_calendar, python holidays (_dev/gen_cases.py)
   - tests/astro.json   : PyEphem 천문 계산으로 따로 구한 음력 달·절기 시각 (_dev/verify_astro.py)
   - 미국 연방 공휴일   : 5 U.S.C. 6103 의 규칙을 이 파일에서 Date.UTC 로 직접 계산 */
'use strict';
const path = require('path');
const C = require(path.join(__dirname, '..', 'assets', 'core.js'));
const D = require(path.join(__dirname, '..', 'assets', 'data.js'));
const K = require(path.join(__dirname, '..', '_dev', 'ref', 'kasi.json'));
const P = require(path.join(__dirname, 'cases.json'));
const A = require(path.join(__dirname, 'astro.json'));

let total = 0, failed = 0;
const groups = [];
let cur = null;
function group(name) { cur = { name, n: 0, fail: 0 }; groups.push(cur); }
function ok(cond, label) {
  total++; cur.n++;
  if (!cond) { failed++; cur.fail++; if (cur.fail <= 8) console.log('  ✗ [' + cur.name + '] ' + label); }
}
function eq(a, b, label) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  ok(x === y, label + '\n      나온 값: ' + x + '\n      기준값: ' + y);
}
const iso = (y, m, d) => C.iso(y, m, d);
const addDays = (s, n) => { const a = C.parse(s); return C.iso(...C.fromDn(C.dn(...a) + n)); };

// ───────── 1. 날짜 기본·요일 ─────────
group('요일(파이썬 datetime, 1900~2100 전부)');
{
  const a = C.parse(P.weekdays.from), s = P.weekdays.s;
  let n = C.dn(...a);
  for (let i = 0; i < s.length; i++, n++) {
    const t = C.fromDn(n);
    ok(C.wd(t[0], t[1], t[2]) === +s[i] && C.dn(t[0], t[1], t[2]) === n, '요일 ' + t.join('-'));
  }
  eq(C.iso(...C.fromDn(n - 1)), P.weekdays.to, '마지막 날');
}
group('윤년·달 길이·날짜 검사');
{
  const leap = new Set(P.leapYears);
  for (let y = 1800; y <= 2400; y++) ok(C.isLeap(y) === leap.has(y), '윤년 ' + y);
  for (const k of Object.keys(P.grids)) {
    const [st, y, m] = k.split('-').map(Number);
    if (st) continue;
    ok(C.dim(y, m) === Math.max(...P.grids[k].flat()), '달 길이 ' + y + '-' + m);
  }
  eq(C.dn(1970, 1, 1), 0, '1970-01-01 = 0');
  eq(C.valid(2027, 2, 29), false, '2027-02-29 없음');
  eq(C.valid(2028, 2, 29), true, '2028-02-29 있음');
  eq(C.valid(2027, 13, 1), false, '13월 없음');
  eq(C.valid(2027, 1.5, 1), false, '소수 달');
  eq(C.parse('2027-02-30'), null, 'parse 없는 날');
  eq(C.parse('2027-2-3'), null, 'parse 형식');
  eq(C.parse('2027-12-31'), [2027, 12, 31], 'parse');
}

// ───────── 2. 주차 ─────────
group('주차(파이썬 isocalendar·%U, 2015~2040 전부 + 1900~2100 연말연초)');
{
  const a = C.parse(P.weeks.from);
  let n = C.dn(...a);
  const len = P.weeks.isoYearOff.length;
  for (let i = 0; i < len; i++, n++) {
    const t = C.fromDn(n), w = C.isoWeek(t[0], t[1], t[2]);
    ok(w.week === +P.weeks.isoWeek.substr(i * 2, 2) && w.year === t[0] + (+P.weeks.isoYearOff[i]) - 1, 'ISO 주차 ' + t.join('-'));
    ok(C.usWeek(t[0], t[1], t[2]) === +P.weeks.usWeek.substr(i * 2, 2), '미국식 주차 ' + t.join('-'));
  }
  for (const [y, m, d, iy, iw, uw] of P.weekEdges) {
    const w = C.isoWeek(y, m, d);
    ok(w.year === iy && w.week === iw, 'ISO 주차(연말연초) ' + iso(y, m, d));
    ok(C.usWeek(y, m, d) === uw, '미국식 주차(연말연초) ' + iso(y, m, d));
  }
  // 글에 쓸 예시(ISO 8601 표준의 정의에서 바로 나오는 값)
  eq(C.isoWeek(2027, 1, 1), { year: 2026, week: 53 }, '2027-01-01(금) = 2026년 53주차');
  eq(C.isoWeek(2027, 1, 4), { year: 2027, week: 1 }, '2027-01-04(월) = 2027년 1주차');
  eq(C.usWeek(2027, 1, 1), 1, '미국식 2027-01-01 = 1주차');
  eq(C.usWeek(2027, 1, 3), 2, '미국식 2027-01-03(일) = 2주차');
  eq(C.isoWeek(2026, 12, 31), { year: 2026, week: 53 }, '2026-12-31 = 53주차');
}
group('달 격자(파이썬 calendar.monthdayscalendar, 2020~2035 × 일·월 시작)');
for (const k of Object.keys(P.grids)) {
  const [st, y, m] = k.split('-').map(Number);
  eq(C.monthGrid(y, m, st), P.grids[k], '격자 ' + k);
}

// ───────── 3. 음력 ─────────
group('음력: 천문연 달력자료 2025~2028 달 시작·대소·윤달 전부');
for (const y of Object.keys(K.lunar_month_starts)) {
  const ours = C.lunar.months(+y), ref = K.lunar_month_starts[y];
  eq(ours.length, ref.length, y + '년 달 수');
  ref.forEach(([m, leap, size, start], i) => {
    const o = ours[i];
    eq([o.m, o.leap ? 1 : 0, o.days === 30 ? '대' : '소', iso(...o.start)], [m, leap, size, start], y + '년 ' + (leap ? '윤' : '') + m + '월');
    const a = C.parse(start);
    eq(C.lunar.fromSolar(...a), { y: +y, m, d: 1, leap: !!leap, days: size === '대' ? 30 : 29 }, start + ' → 음력 1일');
    eq(C.lunar.toSolar(+y, m, 1, !!leap), a, y + '.' + m + '.1 → 양력');
  });
}
eq(C.lunar.official, [2025, 2028], '공식 자료와 대조한 범위');

group('음력: 천문 계산(PyEphem 합삭·중기, UTC+9)과 1912~2049 모든 달');
{
  let n = 0;
  for (const [start, ly, m, leap, days] of A.months) {
    if (ly < C.lunar.firstYear || ly > C.lunar.lastYear) continue;
    n++;
    const mo = C.lunar.months(ly).find((x) => x.m === m && x.leap === !!leap);
    ok(!!mo && iso(...mo.start) === start && mo.days === days, '천문 계산 ' + ly + '년 ' + (leap ? '윤' : '') + m + '월 시작 ' + start + ' / 표 ' + (mo ? iso(...mo.start) : '없음'));
  }
  let tableMonths = 0;
  for (let y = C.lunar.firstYear; y <= C.lunar.lastYear; y++) tableMonths += C.lunar.months(y).length;
  eq(n, tableMonths, '달 수(표에만 있는 달이 없다)');
}

group('음력: 라이브러리(korean_lunar_calendar) 달 전부 + 2024~2030 하루씩');
{
  for (const [start, ly, m, leap, days] of P.lunarLib.months) {
    const mo = C.lunar.months(ly).find((x) => x.m === m && x.leap === !!leap);
    ok(!!mo && iso(...mo.start) === start && mo.days === days, '라이브러리 달 ' + ly + '.' + m);
  }
  let n = C.dn(...C.parse(P.lunarLib.daysFrom));
  const s = P.lunarLib.days;
  for (let i = 0; i < s.length; i += 5, n++) {
    const t = C.fromDn(n), l = C.lunar.fromSolar(t[0], t[1], t[2]);
    ok(l && l.m === +s.substr(i, 2) && l.d === +s.substr(i + 2, 2) && l.leap === (s[i + 4] === '1'), '하루씩 ' + t.join('-'));
  }
}
group('음력: python holidays 가 따로 가진 설날·부처님오신날·추석(1949~2049)');
for (const [y, m, d, date] of P.lunarAnchors) {
  if (y < C.lunar.firstYear) continue;
  eq(C.lunar.toSolar(y, m, d, false), C.parse(date), y + '년 음력 ' + m + '.' + d);
}
group('음력: 왕복·범위 밖·없는 날');
{
  const a = C.dn(...C.parse(C.lunar.min)), b = C.dn(...C.parse(C.lunar.max));
  let bad = 0;
  for (let n = a; n <= b; n++) {
    const t = C.fromDn(n), l = C.lunar.fromSolar(t[0], t[1], t[2]);
    const back = l && C.lunar.toSolar(l.y, l.m, l.d, l.leap);
    if (!back || C.dn(...back) !== n) bad++;
  }
  eq(bad, 0, '양력 → 음력 → 양력 (' + (b - a + 1) + '일)');
  eq(C.lunar.min, '1912-02-18', '지원 시작');
  eq(C.lunar.max, '2050-01-22', '지원 끝');
  eq(C.lunar.fromSolar(...C.parse(addDays(C.lunar.min, -1))), null, '시작 전날은 null');
  eq(C.lunar.fromSolar(...C.parse(addDays(C.lunar.max, 1))), null, '끝 다음 날은 null');
  eq(C.lunar.fromSolar(2027, 2, 30), null, '없는 양력 날짜');
  eq(C.lunar.toSolar(1911, 1, 1, false), null, '범위 밖 해');
  eq(C.lunar.toSolar(2050, 1, 1, false), null, '범위 밖 해(2050)');
  eq(C.lunar.toSolar(2027, 5, 1, true), null, '2027년엔 윤달이 없다');
  eq(C.lunar.toSolar(2025, 6, 1, true), [2025, 7, 25], '2025 윤6월 1일');
  eq(C.lunar.toSolar(2025, 6, 30, true), null, '2025 윤6월은 작은달(29일)');
  eq(C.lunar.toSolar(2028, 5, 1, true), [2028, 6, 23], '2028 윤5월 1일');
  eq(C.lunar.toSolar(2027, 1, 30, false), null, '2027 정월은 작은달');
  eq(C.lunar.toSolar(2027, 13, 1, false), null, '13월');
  eq(C.lunar.toSolar(2027, 1, 0, false), null, '0일');
}
group('음력: 천문연 그 밖의 날(정월대보름·단오·칠석·한식·삼복)');
{
  const idx = (name) => D.otherNames.indexOf(name);
  const stems = new Set();
  for (const y of Object.keys(K.other_days)) {
    const o = K.other_days[y];
    eq(C.lunar.toSolar(+y, 1, 15, false).slice(1), o['정월대보름'], y + ' 정월대보름 = 음 1.15');
    eq(C.lunar.toSolar(+y, 5, 5, false).slice(1), o['단오'], y + ' 단오 = 음 5.5');
    eq(C.lunar.toSolar(+y, 7, 7, false).slice(1), o['칠석'], y + ' 칠석 = 음 7.7');
    const got = C.others(+y);
    for (const name of D.otherNames) eq([got[idx(name)].m, got[idx(name)].d], o[name], y + ' ' + name);
    // 삼복: 초복·중복은 10일 간격, 말복은 입추 뒤 첫 경일(입추에서 9일 안), 초복은 하지에서 20~29일 뒤. 세 날의 일진 천간이 같다.
    const t = C.terms(+y), haji = t.find((x) => x.name === '하지'), ipchu = t.find((x) => x.name === '입추');
    const n = (md) => C.dn(+y, md[0], md[1]);
    eq(n(o['중복']) - n(o['초복']), 10, y + ' 중복 − 초복');
    ok([10, 20].includes(n(o['말복']) - n(o['중복'])), y + ' 말복 − 중복');
    const gapIp = n(o['말복']) - C.dn(+y, ipchu.m, ipchu.d), gapHa = n(o['초복']) - C.dn(+y, haji.m, haji.d);
    ok(gapIp >= 0 && gapIp <= 9, y + ' 말복은 입추 뒤 첫 경일');
    ok(gapHa >= 20 && gapHa <= 29, y + ' 초복은 하지 뒤 셋째 경일');
    ['초복', '중복', '말복'].forEach((k) => stems.add(((n(o[k]) % 10) + 10) % 10));
    // 한식 = 앞선 동지에서 105일째
    const prev = C.terms(+y - 1);
    if (prev) { const dj = prev.find((x) => x.name === '동지'); eq(C.fromDn(C.dn(+y - 1, dj.m, dj.d) + 105).slice(1), o['한식'], y + ' 한식 = 동지 + 105일'); }
  }
  eq(stems.size, 1, '삼복 12일의 천간이 모두 같다(경일)');
  eq(C.others(2029), null, '2029년은 자료 없음 → null');
}

// ───────── 4. 24절기 ─────────
group('24절기: 천문연 2025~2028 + 천문 계산(±1분)');
for (const y of Object.keys(K.solar_terms_kst)) {
  const t = C.terms(+y);
  eq(t.map((x) => [x.name, x.m, x.d, x.h, x.min]), K.solar_terms_kst[y], y + '년 절기 24개');
  t.forEach((x, i) => {
    const a = A.terms[y][i];
    const diff = (C.dn(+y, x.m, x.d) - C.dn(+y, a[0], a[1])) * 1440 + (x.h - a[2]) * 60 + (x.min - a[3]);
    ok(Math.abs(diff) <= 1, y + ' ' + x.name + ' 천문 계산과 ' + diff + '분 차이');
    eq(C.termOn(+y, x.m, x.d), x.name, y + ' ' + x.name + ' termOn');
  });
  for (let i = 1; i < t.length; i++) ok(C.dn(+y, t[i].m, t[i].d) - C.dn(+y, t[i - 1].m, t[i - 1].d) >= 14, y + ' 절기 간격');
}
eq(C.terms(2024), null, '2024년 절기는 없다(null)');
eq(C.terms(2029), null, '2029년 절기는 없다(null)');
eq(C.termOn(2029, 3, 20), null, '2029년 termOn 은 null(모름)');
eq(C.termOn(2027, 3, 20), '', '2027-03-20 은 절기가 아니다(빈 글자)');
eq(C.termOn(2027, 3, 21), '춘분', '2027 춘분 3월 21일');
eq(C.termOn(2025, 12, 22), '동지', '2025 동지 12월 22일 00:03(자정 3분 뒤)');

// ───────── 5. 한국 공휴일 ─────────
group('한국 공휴일: 공식 표(2026·2027·2028)와 한 날도 다르지 않게');
for (const y of Object.keys(K.kr_public_holidays)) {
  const h = C.holidays('KR', +y);
  eq(h.list.map((x) => [x.date.slice(5), x.name]), K.kr_public_holidays[y], y + '년 날짜·이름 전부');
  eq(h.list.length, K.kr_public_holidays[y].length, y + '년 개수');
  // 음력 명절이 음력 표와 맞는지
  const find = (name) => K.kr_public_holidays[y].find(([, n]) => n.split('; ').includes(name))[0];
  const md = (s) => [+s.slice(0, 2), +s.slice(3)];
  eq(C.lunar.fromSolar(+y, ...md(find('설날'))), { y: +y, m: 1, d: 1, leap: false, days: C.lunar.months(+y)[0].days }, y + ' 설날 = 음 1.1');
  const bu = C.lunar.fromSolar(+y, ...md(find('부처님오신날'))), ch = C.lunar.fromSolar(+y, ...md(find('추석')));
  eq([bu.m, bu.d, bu.leap], [4, 8, false], y + ' 부처님오신날 = 음 4.8');
  eq([ch.m, ch.d, ch.leap], [8, 15, false], y + ' 추석 = 음 8.15');
}
eq(C.holidays('KR', 2026).basis, 'official', '2026 공식');
eq(C.holidays('KR', 2027).basis, 'official', '2027 공식');
eq(C.holidays('KR', 2028).basis, 'provisional', '2028 공식 발표 전');
eq(C.holidays('KR', 2029).basis, 'rule', '2029 규칙 계산');
eq(C.holidays('KR', 2025).basis, 'table', '2025 표');

group('한국 2027년 공식 수치(우주항공청 월력요항)');
{
  const f = C.yearFacts('KR', 2027), h = C.holidays('KR', 2027);
  eq(f.sundays, 52, '일요일 52일');
  eq(f.holidayDates, 24, '공휴일 24일');
  eq(h.list.filter((x) => x.wd === 0).map((x) => x.date.slice(5)), ['02-07', '06-06', '08-15', '10-03'], '일요일과 겹치는 4일');
  eq(f.publicHolidays, 72, '관공서 공휴일 72일');
  eq(f.saturdays, 52, '토요일 52일');
  eq(h.list.filter((x) => x.wd === 6).map((x) => x.date.slice(5)), ['02-06', '05-01', '07-17', '10-09', '12-25'], '토요일과 겹치는 5일');
  eq(f.daysOff, 119, '주5일 휴일 119일');
  eq(C.breaks('KR', 2027, 3).map((b) => b.from.slice(5) + '~' + b.to.slice(5)),
    ['01-01~01-03', '02-06~02-09', '02-27~03-01', '05-01~05-03', '07-17~07-19', '08-14~08-16', '09-14~09-16', '10-02~10-04', '10-09~10-11', '12-25~12-27'],
    '3일 이상 연휴 10번');
  eq(C.breaks('KR', 2027, 3).map((b) => b.days), [3, 4, 3, 3, 3, 3, 3, 3, 3, 3], '연휴 길이');
}

group('한국 공휴일: 규칙의 세부(제2조·제3조)');
{
  const names = (y) => Object.fromEntries(C.holidays('KR', y).list.map((x) => [x.date.slice(5), x.name]));
  // 2026 개정: 노동절·제헌절
  eq(names(2026)['05-01'], '노동절', '2026 노동절');
  eq(names(2026)['07-17'], '제헌절', '2026 제헌절');
  eq(names(2026)['06-03'], '전국동시지방선거', '2026 지방선거');
  eq(C.holidays('KR', 2026).byDate['2026-06-03'].kind, 'election', '선거일 종류');
  eq(names(2028)['04-12'], '국회의원선거일', '2028 국회의원선거');
  // 1월 1일·현충일은 대체공휴일 없음
  eq(C.wd(2028, 1, 1), 6, '2028-01-01 은 토요일');
  eq(names(2028)['01-03'], undefined, '2028-01-01(토) 대체 없음');
  eq(C.wd(2027, 6, 6), 0, '2027-06-06 은 일요일');
  eq(names(2027)['06-07'], undefined, '2027 현충일(일) 대체 없음');
  // 설·추석 연휴는 토요일과 겹쳐도 대체 없음(2026 추석 9/24~26, 26일 토)
  eq(C.wd(2026, 9, 26), 6, '2026-09-26 은 토요일');
  eq(names(2026)['09-28'], undefined, '2026 추석 다음 날(토) 대체 없음');
  // 평일에 겹치면 하루(2028 추석·개천절)
  eq(C.holidays('KR', 2028).byDate['2028-10-05'].of, ['추석', '개천절'], '2028 대체공휴일 까닭');
  eq(C.holidays('KR', 2028).list.filter((x) => x.kind === 'substitute').length, 1, '2028 대체공휴일 1일');
  // 대체공휴일은 토·일요일·다른 공휴일에 오지 않는다(2026~2049)
  let bad = 0, cnt = 0;
  for (let y = 2026; y <= 2049; y++) {
    const h = C.holidays('KR', y), dates = h.list.map((x) => x.date);
    eq(new Set(dates).size, dates.length, y + ' 날짜 중복 없음');
    h.list.filter((x) => x.kind === 'substitute').forEach((x) => { cnt++; if (x.wd === 0 || x.wd === 6) bad++; });
  }
  eq(bad, 0, '주말에 놓인 대체공휴일 0 (' + cnt + '개 중)');
  // 달력 칸 이름
  eq(C.krLabel('1월 1일'), '신정', '칸 이름: 신정');
  eq(C.krLabel('추석; 개천절'), '추석·개천절', '칸 이름: 겹친 날');
  eq(C.krLabel('대체공휴일(추석·개천절)'), '대체공휴일', '칸 이름: 대체공휴일');
  eq(C.krLabel('설날 전날'), '설 연휴', '칸 이름: 설 연휴');
}

group('한국 공휴일: python holidays 0.106 과 2029~2049 (선거일 빼고)');
for (const y of Object.keys(P.krLib)) {
  eq(C.holidays('KR', +y).list.filter((x) => x.kind !== 'election').map((x) => x.date), P.krLib[y], y + '년');
}

group('한국 2025년 표·범위 밖');
{
  const h = C.holidays('KR', 2025);
  eq(h.list.length, 19, '2025년 19일');
  eq(h.byDate['2025-01-27'].kind, 'temporary', '2025-01-27 임시공휴일');
  eq(h.byDate['2025-06-03'].kind, 'election', '2025-06-03 대통령선거일');
  eq(h.list.filter((x) => x.kind === 'substitute').map((x) => x.date.slice(5)), ['03-03', '05-06', '10-08'], '2025 대체공휴일 3일');
  eq(h.byDate['2025-05-05'].names, ['부처님오신날', '어린이날'], '2025-05-05 두 공휴일');
  eq(C.holidays('KR', 2024), null, '2024 → null');
  eq(C.holidays('KR', 2050), null, '2050 → null');
  eq(C.holidays('KR', 2027.5), null, '소수 → null');
  eq(C.holidays('JP', 2027), null, '모르는 나라 → null');
  eq(C.holidayOn('KR', 2024, 1, 1), null, '범위 밖 날짜는 null(모름)');
  eq(C.holidayOn('KR', 2027, 1, 2), false, '공휴일 아닌 날은 false');
  eq(C.holidayOn('KR', 2027, 1, 1).name, '1월 1일', '공휴일인 날');
  eq(C.breaks('KR', 2024), null, '연휴: 범위 밖 null');
  eq(C.support.KR, [2025, 2049], '한국 지원 범위');
}

// ───────── 6. 미국 연방 공휴일 ─────────
group('미국 연방 공휴일: 5 U.S.C. 6103 규칙으로 직접 계산(2025~2030)');
{
  const U = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  const fmt = (dt) => dt.toISOString().slice(0, 10);
  const nth = (y, m, wd, n) => { const first = U(y, m, 1).getUTCDay(); return U(y, m, 1 + ((wd - first + 7) % 7) + (n - 1) * 7); };
  const last = (y, m, wd) => { const end = U(y, m + 1, 0); return U(y, m, end.getUTCDate() - ((end.getUTCDay() - wd + 7) % 7)); };
  const expected = (year) => {
    const out = {};
    const fixed = (y, m, d, name) => {
      const dt = U(y, m, d), w = dt.getUTCDay();
      if (y === year) out[fmt(dt)] = name;
      const obs = w === 6 ? U(y, m, d - 1) : w === 0 ? U(y, m, d + 1) : null;       // 토 → 금, 일 → 월
      if (obs && obs.getUTCFullYear() === year) out[fmt(obs)] = name + ' (observed)';
    };
    fixed(year, 1, 1, "New Year's Day"); fixed(year + 1, 1, 1, "New Year's Day");
    out[fmt(nth(year, 1, 1, 3))] = 'Martin Luther King Jr. Day';
    out[fmt(nth(year, 2, 1, 3))] = "Washington's Birthday";
    out[fmt(last(year, 5, 1))] = 'Memorial Day';
    fixed(year, 6, 19, 'Juneteenth National Independence Day');
    fixed(year, 7, 4, 'Independence Day');
    out[fmt(nth(year, 9, 1, 1))] = 'Labor Day';
    out[fmt(nth(year, 10, 1, 2))] = 'Columbus Day';
    fixed(year, 11, 11, 'Veterans Day');
    out[fmt(nth(year, 11, 4, 4))] = 'Thanksgiving Day';
    fixed(year, 12, 25, 'Christmas Day');
    return out;
  };
  for (let y = C.support.US[0]; y <= C.support.US[1]; y++) {
    const got = Object.fromEntries(C.holidays('US', y).list.map((x) => [x.date, x.en]));
    const exp = expected(y);
    eq(Object.keys(got).sort(), Object.keys(exp).sort(), y + '년 날짜');
    for (const k of Object.keys(exp)) eq(got[k], exp[k], y + ' ' + k);
  }
  eq(C.holidays('US', 2027).byDate['2027-12-31'].en, "New Year's Day (observed)", '2027-12-31 은 2028년 새해 첫날의 관측일');
  eq(C.holidays('US', 2027).byDate['2027-12-31'].kind, 'substitute', '관측일 종류');
  eq(C.holidays('US', 2026).byDate['2026-07-03'].en, 'Independence Day (observed)', '2026-07-03 관측일');
  eq(C.holidays('US', 2024), null, '미국 2024 → null');
  eq(C.holidays('US', 2031), null, '미국 2031 → null');
  eq(C.breaks('US', 2027, 3).map((b) => b.from + '~' + b.to),
    ['2027-01-01~2027-01-03', '2027-01-16~2027-01-18', '2027-02-13~2027-02-15', '2027-05-29~2027-05-31', '2027-06-18~2027-06-20',
      '2027-07-03~2027-07-05', '2027-09-04~2027-09-06', '2027-10-09~2027-10-11', '2027-12-24~2027-12-26', '2027-12-31~2028-01-02'],
    '미국 2027 3일 이상 연휴(손으로 확인: 월요일 공휴일 6 + 금요일 관측일 3 + 새해)');
}

group('미국 연방 공휴일: OPM 일정표(2026·2027, 2026-10-10 열람)와 쉬는 날·이름이 같다');
{
  // 미국 인사관리처(OPM) 'Federal Holidays' 2026·2027 Holiday Schedule 그대로(쉬는 날만 적힌 표). 지휘자 쪽 사실 확인 기록 10번.
  const OPM = {
    2026: [['01-01', "New Year's Day"], ['01-19', 'Birthday of Martin Luther King, Jr.'], ['02-16', "Washington's Birthday"], ['05-25', 'Memorial Day'], ['06-19', 'Juneteenth National Independence Day'],
      ['07-03', 'Independence Day'], ['09-07', 'Labor Day'], ['10-12', 'Columbus Day'], ['11-11', 'Veterans Day'], ['11-26', 'Thanksgiving Day'], ['12-25', 'Christmas Day']],
    2027: [['01-01', "New Year's Day"], ['01-18', 'Birthday of Martin Luther King, Jr.'], ['02-15', "Washington's Birthday"], ['05-31', 'Memorial Day'], ['06-18', 'Juneteenth National Independence Day'],
      ['07-05', 'Independence Day'], ['09-06', 'Labor Day'], ['10-11', 'Columbus Day'], ['11-11', 'Veterans Day'], ['11-25', 'Thanksgiving Day'], ['12-24', 'Christmas Day']],
  };
  const official = { 'Martin Luther King Jr. Day': 'Birthday of Martin Luther King, Jr.' };
  for (const y of Object.keys(OPM)) {
    // 우리 표에서 그 해 공휴일의 '쉬는 날': 평일인 날. 다음 해 새해 첫날을 당겨 쉬는 12월 31일은 OPM이 다음 해 표에 적는다.
    const ours = C.holidays('US', +y).list.filter((x) => x.wd !== 0 && x.wd !== 6 && !(x.m === 12 && x.d === 31))
      .map((x) => { const b = x.en.replace(' (observed)', ''); return [x.date.slice(5), official[b] || b]; });
    eq(ours, OPM[y], y + '년 쉬는 날 11일');
  }
  eq(C.holidays('US', 2027).list.filter((x) => x.kind === 'substitute').map((x) => x.date.slice(5)), ['06-18', '07-05', '12-24', '12-31'], '2027년 대신 쉬는 날(12-31은 2028년 새해 첫날 몫)');
}

// ───────── 7. 손 없는 날 ─────────
group('손 없는 날(라이브러리 음력 날짜 끝자리 9·0, 2026-10 ~ 2027-12)');
for (const k of Object.keys(P.son)) {
  const [y, m] = k.split('-').map(Number);
  eq(C.monthFacts('KR', y, m).son, P.son[k], k + ' 손 없는 날');
}
eq([9, 10, 19, 20, 29, 30].every((d) => C.sonDay(d)), true, '9·10·19·20·29·30일');
eq([1, 8, 11, 18, 21, 28].some((d) => C.sonDay(d)), false, '그 밖의 날은 아니다');
eq(C.isSon(1900, 1, 1), null, '범위 밖은 null');

// ───────── 8. 월·연 사실 ─────────
group('월·연 사실(파이썬 datetime + 공식 공휴일, 2026~2028)');
for (const k of Object.keys(P.factsKR)) {
  const [y, m] = k.split('-').map(Number), f = C.monthFacts('KR', y, m), r = P.factsKR[k];
  eq({ days: f.days, weekdays: f.weekdays, saturdays: f.saturdays, sundays: f.sundays, holidays: f.holidays.length,
    holidaysOnWeekdays: f.holidaysOnWeekdays, workdays: f.workdays, firstWd: f.firstWd, lastWd: f.lastWd,
    isoWeeks: [f.isoWeeks[0].week, f.isoWeeks[1].week], usWeeks: f.usWeeks }, r, k + ' 사실');
}
for (const y of Object.keys(P.yearsKR)) {
  const f = C.yearFacts('KR', +y), r = P.yearsKR[y], h = C.holidays('KR', +y);
  eq({ days: f.days, leap: f.leap, sundays: f.sundays, saturdays: f.saturdays, holidayDates: f.holidayDates,
    holidaysOnSun: h.list.filter((x) => x.wd === 0).map((x) => x.date), holidaysOnSat: h.list.filter((x) => x.wd === 6).map((x) => x.date),
    publicHolidays: f.publicHolidays, daysOff: f.daysOff, workdays: f.workdays }, r, y + '년 사실');
  eq(f.holidaysOnWeekdays, f.holidayDates - f.holidaysOnSun - f.holidaysOnSat, y + ' 평일 공휴일 수');
  let sum = 0;
  for (let m = 1; m <= 12; m++) sum += C.monthFacts('KR', +y, m).workdays;
  eq(sum, f.workdays, y + ' 달별 일하는 날 합 = 연 합');
}
eq(C.monthFacts('KR', 2024, 5).workdays, null, '공휴일 표 없는 해: 일하는 날은 null');
eq(C.monthFacts('KR', 2024, 5).weekdays, 23, '공휴일 표 없는 해: 평일 수는 센다');
eq(C.monthFacts('KR', 2027, 13), null, '13월 → null');
eq(C.monthFacts('KR', 2027, 2).lunar.from, { y: 2026, m: 12, d: 25, leap: false, days: 30 }, '2027-02-01 = 음 2026.12.25');
eq(C.monthFacts('KR', 2027, 3).terms.map((t) => t.name + t.d), ['경칩6', '춘분21'], '2027년 3월 절기');
eq(C.monthFacts('KR', 2030, 3).terms, null, '2030년 절기는 null');

// ───────── 9. 연차를 끼우면 이어지는 날 ─────────
group('징검다리(공식 표를 보고 손으로 확인한 2027년)');
eq(C.bridges('KR', 2027, 1).map((b) => [b.leave.join(','), b.from, b.to, b.days]), [
  ['2027-05-04', '2027-05-01', '2027-05-05', 5],     // 노동절(토)·대체(월) | 화 | 어린이날(수)
  ['2027-05-14', '2027-05-13', '2027-05-16', 4],     // 부처님오신날(목) | 금 | 주말
  ['2027-09-13', '2027-09-11', '2027-09-16', 6],     // 주말 | 월 | 추석 연휴(화~목)
  ['2027-09-17', '2027-09-14', '2027-09-19', 6],     // 추석 연휴(화~목) | 금 | 주말
], '2027 하루 끼우기');
eq(C.bridges('KR', 2027, 2).length, 5, '2027 이틀까지 끼우기(5/6~7 추가)');
eq(C.bridges('KR', 2024, 1), null, '범위 밖 null');


// ───────── 10. 종이 배치(sheet.js) ─────────
const S = require(path.join(__dirname, '..', 'assets', 'sheet.js'));
group('종이 배치: 글자가 종이 안에 있고(위·옆 11mm, 아래 6mm 넘게) 날 수가 맞는다');
{
  let n = 0;
  const combos = [];
  for (const year of [2025, 2026, 2027, 2028, 2029, 2030]) for (const [lang, country] of [['ko', 'KR'], ['en', 'US'], ['en', 'KR'], ['ko', 'US']])
    for (const paper of ['a4', 'letter']) for (const weekStart of [0, 1]) {
      for (const orient of ['landscape', 'portrait']) for (const week of [false, true]) combos.push({ kind: 'year', year, lang, country, paper, weekStart, orient, show: { week } });
      for (const month of [1, 2, 5, 10]) combos.push({ kind: 'month', year, month, lang, country, paper, weekStart, show: { week: true, lunar: true, terms: true, son: true } });
    }
  for (const o of combos) {
    const sh = S.build(o), tag = JSON.stringify(o);
    let minX = 1e9, maxX = -1e9, maxY = -1e9, minTop = 1e9, bad = 0, days = 0;
    for (const i of sh.items) {
      if (!i.t) { if ([i.x1, i.y1, i.x2, i.y2, i.w].some((v) => !isFinite(v))) bad++; minX = Math.min(minX, i.x1); maxX = Math.max(maxX, i.x2); maxY = Math.max(maxY, i.y2); continue; }
      if (!isFinite(i.x) || !isFinite(i.y) || !i.s.length) bad++;
      const w = S.estW(i.s, i.z), x0 = i.a === 's' ? i.x : i.a === 'e' ? i.x - w : i.x - w / 2;
      minX = Math.min(minX, x0); maxX = Math.max(maxX, x0 + w); maxY = Math.max(maxY, i.y); minTop = Math.min(minTop, i.y - 0.74 * i.z);
      if (/^\d+$/.test(i.s) && i.z === (o.kind === 'year' ? 3.8 : 6.2)) days++;
    }
    n++;
    ok(bad === 0 && minX >= 11 && maxX <= sh.w - 11 && maxY <= sh.h - 6.5 && minTop >= 11,
      '종이 밖 글자 ' + tag + ' minX ' + minX.toFixed(1) + ' maxX ' + (sh.w - maxX).toFixed(1) + ' bottom ' + (sh.h - maxY).toFixed(1) + ' top ' + minTop.toFixed(1));
    ok(days === (o.kind === 'year' ? (C.isLeap(o.year) ? 366 : 365) : C.dim(o.year, o.month)), '날 수 ' + tag + ' = ' + days);
  }
  const svg = S.svg(S.build({ kind: 'year', year: 2027, lang: 'ko' }));
  ok(svg.startsWith('<svg') && svg.endsWith('</svg>') && (svg.match(/<g /g) || []).length === (svg.match(/<\/g>/g) || []).length, 'SVG 짝이 맞는다');
  eq(S.build({ kind: 'year', year: 2027, lang: 'ko' }).w, 297, 'A4 가로 297mm');
  eq([S.build({ kind: 'year', year: 2027, lang: 'en', paper: 'letter', orient: 'portrait' }).w, S.build({ kind: 'year', year: 2027, lang: 'en', paper: 'letter', orient: 'portrait' }).h], [215.9, 279.4], 'Letter 세로');
  // 미리 만든 파일 이름 규칙
  eq(S.staticFile({ kind: 'year', year: 2027, lang: 'ko', country: 'KR', paper: 'a4' }), '/files/2027-calendar-korea-a4-landscape.pdf', '한국어 기본 = 미리 만든 파일');
  eq(S.staticFile({ kind: 'months', year: 2027, lang: 'ko', country: 'KR', paper: 'a4', show: { lunar: true, terms: true } }), '/files/2027-calendar-korea-monthly-a4.pdf', '월별 12장');
  eq(S.staticFile({ kind: 'year', year: 2027, lang: 'en', country: 'US', paper: 'letter', orient: 'portrait' }), '/files/2027-calendar-us-letter-portrait.pdf', '영어 Letter 세로');
  eq(S.staticFile({ kind: 'year', year: 2027, lang: 'ko', country: 'KR', paper: 'a4', weekStart: 1 }), null, '설정을 바꾸면 기기에서 만든다');
  eq(S.staticFile({ kind: 'year', year: 2029, lang: 'ko', country: 'KR', paper: 'a4' }), null, '2029년은 미리 만든 파일이 없다');
  eq(S.staticFile({ kind: 'year', year: 2027, lang: 'en', country: 'KR', paper: 'a4' }), null, '영어 화면 + 한국 공휴일은 기기에서');
  ok(S.webMonth({ year: 2026, month: 10, lang: 'ko' }).includes('<em>한글날</em>') && S.webMonth({ year: 2026, month: 10, lang: 'ko' }).includes('음 9.1'), '큰 달 표에 공휴일·음력');
}

// ───────── 10-2. 종이에 찍히는 글자: 말줄임·'외 N일' 0, 칸을 넘는 이름 0, PDF 글꼴에 모든 글자 ─────────
const PDF = require(path.join(__dirname, '..', 'assets', 'pdf.js'));
const FM = require(path.join(__dirname, '..', 'assets', 'fonts', 'metrics.json'));
const fs = require('fs'), zlib = require('zlib');
group("종이 글자: 말줄임(…)·'+N more'·'외 N일' 0, 이름이 제 칸 안, 글꼴 폭 표가 실제 폭보다 좁지 않다");
{
  let sheets = 0, ell = [], over = [], thin = [], miss = [], weights = new Set(), minName = 9, minRow = 9, minK = 1, wkBad = 0;
  const each = (o) => {
    const sh = S.build(o), tag = JSON.stringify(o);
    sheets++;
    if (!PDF.covers([sh], FM)) miss.push(tag);
    const wkX = new Set();
    for (const i of sh.items) {
      if (!i.t) continue;
      weights.add(i.w);
      if (/…|\.\.\.|\+\d+ more|외 \d+일/.test(i.s)) ell.push(i.s + ' ' + tag);
      const real = PDF.width(i.s, i.z, i.w, FM), est = S.estW(i.s, i.z);
      if (est < real - 1e-6) thin.push(i.s);
      if (i.r && i.x + real > i.r + 0.06) over.push(i.s + ' (' + (i.x + real - i.r).toFixed(2) + 'mm) ' + tag);
      if (o.kind === 'month' && o.show && o.show.week && i.z === 2.3 && i.a === 'e') wkX.add(i.x.toFixed(2));
    }
    if (o.kind === 'year' && sh.nameSize) minName = Math.min(minName, sh.nameSize);
    if (o.kind === 'year') minRow = Math.min(minRow, sh.rowH);
    if (o.kind === 'month') { minK = Math.min(minK, sh.minScale); if (o.show && o.show.week && wkX.size !== 1) wkBad++; }
  };
  for (const year of [2025, 2026, 2027, 2028, 2029, 2030]) for (const [lang, country] of [['ko', 'KR'], ['en', 'US'], ['en', 'KR'], ['ko', 'US'], ['ko', 'NONE'], ['en', 'NONE']])
    for (const paper of ['a4', 'letter']) for (const weekStart of [0, 1]) {
      for (const orient of ['landscape', 'portrait']) for (const week of [false, true]) for (const names of [true, false]) each({ kind: 'year', year, lang, country, paper, weekStart, orient, show: { week, names } });
      for (let month = 1; month <= 12; month++) for (const show of [{ week: true, lunar: true, terms: true, son: true }, { names: true }, { lunar: true, terms: true }])
        each({ kind: 'month', year, month, lang, country, paper, weekStart, show });
    }
  eq(ell.slice(0, 5), [], '말줄임·+N more·외 N일이 찍힌 종이 (' + sheets + '장 가운데)');
  eq(over.slice(0, 5), [], '제 칸을 넘는 이름(Pretendard 실제 글자 폭으로 잼)');
  eq([...new Set(thin)].slice(0, 5), [], '어림 폭(estW)이 실제 폭보다 좁은 글자열');
  eq(miss.slice(0, 3), [], 'PDF 글꼴(assets/fonts)에 없는 글자가 든 종이 → _dev/make_fonts.py 를 다시 돌린다');
  eq([...weights].sort(), [500, 600, 700, 800], '글자 굵기는 네 가지(PDF에 담는 글꼴과 같다)');
  ok(minName >= 2.45, '1년 한 장 이름 글자 가장 작은 크기 ' + minName + 'mm (2.45mm 이상)');
  ok(minRow >= 4.6, '1년 한 장 날짜 줄 높이 가장 낮은 값 ' + minRow.toFixed(2) + 'mm (4.6mm 이상)');
  ok(minK >= 0.8, '달 칸 글자를 줄인 비율 ' + minK.toFixed(2) + ' (0.8 이상)');
  eq(wkBad, 0, '월 달력의 주 번호는 모두 첫 열 같은 자리');
  // 평가에서 잘렸던 이름이 다 보이는지(영어 + 미국, 영어 + 한국)
  const texts = (o) => S.build(o).items.filter((i) => i.t).map((i) => i.s);
  const has = (o, parts) => { const t = texts(o).join('|'); return parts.every((x) => t.includes(x)); };
  ok(has({ kind: 'month', year: 2027, month: 1, lang: 'en', country: 'US', paper: 'letter' }, ['Martin Luther', 'King Jr. Day']), '영어 1월: Martin Luther King Jr. Day 다 보임(두 줄, 끝에 Day만 남지 않게)');
  ok(has({ kind: 'month', year: 2027, month: 7, lang: 'en', country: 'US', paper: 'letter' }, ['Independence Day', '(observed)']), '영어 7월: Independence Day (observed)');
  ok(has({ kind: 'month', year: 2027, month: 12, lang: 'en', country: 'US', paper: 'a4' }, ["New Year's Day", '(observed)', 'Christmas Day']), "영어 12월: New Year's Day (observed)");
  ok(has({ kind: 'month', year: 2027, month: 3, lang: 'en', country: 'KR', paper: 'letter' }, ['Independence', 'Movement', 'Day']), '영어 + 한국 3월: Independence Movement Day');
  ok(has({ kind: 'month', year: 2028, month: 4, lang: 'en', country: 'KR', paper: 'letter' }, ['National', 'Assembly', 'Election', 'Day']), '영어 + 한국 2028년 4월: National Assembly Election Day');
  ok(has({ kind: 'month', year: 2028, month: 10, lang: 'en', country: 'KR', paper: 'letter' }, ['Chuseok;', 'National', 'Foundation', 'Day']), '영어 + 한국 2028년 10월: Chuseok; National Foundation Day');
  // 영어 + 한국 + Letter 가로 1년 한 장(평가의 '+1 more'): 5월·10월 이름 넷이 모두
  ok(has({ kind: 'year', year: 2027, lang: 'en', country: 'KR', paper: 'letter' }, ['Labor Day', 'Substitute holiday (Labor Day)', "Children's Day", "Buddha's Birthday", 'Substitute holiday (Hangeul Day)', 'National Foundation Day']), '영어 + 한국 Letter 1년: 5월·10월 이름 전부');
  // 1년 한 장의 이름 줄: 미국은 실제 날과 대신 쉬는 날을 한 줄로, 한국은 무엇의 대체공휴일인지
  const pairs = (o) => { const it = S.build(o).items.filter((i) => i.t && i.z === S.build(o).nameSize); const out = []; for (let k = 0; k + 1 < it.length; k++) if (it[k].c === 'sun') out.push(it[k].s + ' ' + it[k + 1].s); return out; };
  const us27 = pairs({ kind: 'year', year: 2027, lang: 'en', country: 'US', paper: 'letter' });
  ok(['18–19 Juneteenth (observed Fri)', '4–5 Independence Day (observed Mon)', '24–25 Christmas Day (observed Fri)', "31 New Year's Day (observed)"].every((x) => us27.includes(x)), '미국 2027: ' + us27.filter((x) => /observed/.test(x)).join(' / '));
  ok(pairs({ kind: 'year', year: 2026, lang: 'en', country: 'US', paper: 'letter' }).includes('3–4 Independence Day (observed Fri)'), '미국 2026: 3–4 Independence Day (observed Fri)');
  const koUs27 = pairs({ kind: 'year', year: 2027, lang: 'ko', country: 'US', paper: 'a4' });
  ok(['24–25 크리스마스(금요일이 대신 쉬는 날)', '18–19 준틴스(금요일이 대신 쉬는 날)', '31 새해 첫날(대신 쉬는 날)'].every((x) => koUs27.includes(x)), "한국어 화면 + 미국: '대신 쉬는 날' 한 가지로 (" + koUs27.filter((x) => /대신/.test(x)).join(' / ') + ')');
  const kr27 = pairs({ kind: 'year', year: 2027, lang: 'ko', country: 'KR', paper: 'a4' });
  ok(['3 대체공휴일(노동절)', '19 대체공휴일(제헌절)', '27 대체공휴일(성탄절)', '6–9 설 연휴'].every((x) => kr27.includes(x)), '한국 2027: ' + kr27.filter((x) => /대체/.test(x)).join(' / '));
  eq(S.label(C.holidays('KR', 2025).byDate['2025-03-03'], { lang: 'ko', country: 'KR' }), '대체공휴일(삼일절)', '2025년 표의 대체공휴일도 무엇의 대체인지');
  eq(S.label(C.holidays('KR', 2027).byDate['2027-05-03'], { lang: 'ko', country: 'KR' }, true), '대체공휴일', "문장 속 짧은 이름(월 페이지 설명의 '대체공휴일(3일)')");
  eq(S.label(C.holidays('KR', 2027).byDate['2027-05-03'], { lang: 'en', country: 'KR' }), 'Substitute holiday (Labor Day)', '영어: Substitute holiday (Labor Day)');
  // 공휴일 표시 안 함
  const none = S.build({ kind: 'year', year: 2027, lang: 'ko', country: 'NONE', paper: 'a4' });
  ok(!none.items.some((i) => i.t && i.w === 800 && i.z === 3.8) && !none.items.some((i) => i.t && /공휴일/.test(i.s)), '공휴일 표시 안 함: 굵은 빨간 날짜·이름·안내 줄 없음');
  ok(none.items.some((i) => i.t && i.c === 'sun' && i.z === 3.8), '공휴일 표시 안 함(한국어): 일요일은 그대로 빨강');
  eq(S.fileBase({ kind: 'year', year: 2027, lang: 'ko', country: 'NONE', paper: 'a4' }), '2027-calendar-no-holidays-a4-landscape', '공휴일 없는 달력의 파일 이름');
  ok(S.webMonth({ year: 2027, month: 5, lang: 'ko' }).includes('<em>부처님<wbr>오신날</em>') && S.webMonth({ year: 2027, month: 5, lang: 'ko' }).includes('<em>대체<wbr>공휴일<wbr>(노동절)</em>'), '큰 달 표: 무엇의 대체공휴일인지, 긴 한글 이름에 나눌 자리');
  // 대신 쉬는 날을 부르는 말은 한 가지: 한국은 늘 '대체공휴일(○○)', 미국을 한국어로 쓸 때는 '대신 쉬는 날'('대체 휴일'·'대신 쉼'은 쓰지 않는다)
  {
    let bare = [], old = [], n = 0;
    const strip = (h) => h.replace(/<wbr>/g, '');
    for (let year = 2025; year <= 2030; year++) {
      for (const it of C.holidays('KR', year).list) if (it.kind === 'substitute') { n++; if (!/^대체공휴일\(.+\)$/.test(S.label(it, { lang: 'ko', country: 'KR' }))) bare.push(it.date); }
      for (const it of C.holidays('US', year).list) if (it.kind === 'substitute') { n++; if (!/.\(대신 쉬는 날\)$/.test(S.label(it, { lang: 'ko', country: 'US' }))) bare.push(it.date); }
      for (let month = 1; month <= 12; month++) {
        const cells = [strip(S.webMonth({ year, month, lang: 'ko', country: 'KR' })), strip(S.webMonth({ year, month, lang: 'ko', country: 'US' }))]
          .concat(['KR', 'US'].map((country) => S.build({ kind: 'month', year, month, lang: 'ko', country, paper: 'a4', show: { names: true } }).items.filter((i) => i.t && i.c === 'sun').map((i) => i.s).join('|')));   // 빨간 글자 = 날짜와 공휴일 이름
        if (/대체공휴일(?!\()/.test(cells[0]) || /대체공휴일(?!\()/.test(cells[2])) bare.push(year + '-' + month);
        if (cells.some((x) => /대체 휴일|대신 쉼/.test(x))) old.push(year + '-' + month);
      }
      for (const orient of ['landscape', 'portrait']) if (/대체 휴일|대신 쉼/.test(S.build({ kind: 'year', year, lang: 'ko', country: 'US', paper: 'a4', orient }).items.filter((i) => i.t).map((i) => i.s).join('|'))) old.push(year + orient);
    }
    eq(bare, [], "대신 쉬는 날 " + n + "일: 달력 칸·종이·목록 모두 '대체공휴일(○○)' / '○○(대신 쉬는 날)' 꼴");
    eq(old, [], "'대체 휴일'·'대신 쉼' 같은 다른 말이 남아 있지 않다");
  }
}

// ───────── 10-3. 받는 파일 이름, 주소에 담는 설정, 언어를 바꿀 때 가져가는 설정 ─────────
group('파일 이름·주소의 설정: 기본과 다른 설정이 이름에 보이고, 주소 ↔ 설정이 그대로 돌아오며, 쓸 수 없는 값은 알린다');
{
  // 파일 이름
  const KR = { lang: 'ko', country: 'KR', paper: 'a4' }, US = { lang: 'en', country: 'US', paper: 'letter' };
  const ON = { names: true, week: false, lunar: true, terms: true, son: false };
  eq(S.fileBase({ kind: 'year', year: 2027, ...KR, show: ON }), '2027-calendar-korea-a4-landscape', '기본 설정은 이름에 붙는 것이 없다(1년 한 장)');
  eq(S.fileBase({ kind: 'months', year: 2027, ...KR, show: ON }), '2027-calendar-korea-monthly-a4', '기본 설정(월별 12장)');
  eq(S.fileBase({ kind: 'month', year: 2027, month: 5, ...KR, show: ON }), '2027-05-calendar-korea-a4', '기본 설정(한 달)');
  eq(S.fileBase({ kind: 'year', year: 2027, ...KR, weekStart: 1, show: ON }), '2027-calendar-korea-a4-landscape-mon', '월요일 시작 → -mon');
  eq(S.fileBase({ kind: 'year', year: 2027, ...KR, mono: true, show: ON }), '2027-calendar-korea-a4-landscape-bw', '흑백 → -bw');
  eq(S.fileBase({ kind: 'year', year: 2027, ...KR, show: { ...ON, week: true } }), '2027-calendar-korea-a4-landscape-wk', '주 번호 → -wk');
  eq(S.fileBase({ kind: 'year', year: 2027, ...KR, orient: 'portrait', weekStart: 1, mono: true, show: { ...ON, week: true, names: false, lunar: false, son: true } }), '2027-calendar-korea-a4-portrait-mon-wk-nonames-bw', '1년 한 장: 종이에 없는 음력·손 없는 날은 붙이지 않는다');
  eq(S.fileBase({ kind: 'months', year: 2027, ...KR, weekStart: 1, mono: true, show: { names: false, week: true, lunar: false, terms: false, son: true } }), '2027-calendar-korea-monthly-a4-mon-wk-nonames-nolunar-noterms-son-bw', '전부 바꾼 월별 12장(늘 같은 순서)');
  eq(S.fileBase({ kind: 'month', year: 2029, month: 5, ...KR, show: { ...ON, terms: false } }), '2029-05-calendar-korea-a4', '절기 자료가 없는 해에는 -noterms 를 붙이지 않는다');
  eq(S.fileBase({ kind: 'month', year: 2027, month: 5, ...US, show: { names: true, lunar: false, terms: false, son: true } }), '2027-05-calendar-us-letter', '미국 달력에는 음력·손 없는 날이 없다');
  eq(S.fileBase({ kind: 'month', year: 2027, month: 5, lang: 'ko', country: 'NONE', paper: 'a4', show: { names: false, lunar: true, terms: true, son: true } }), '2027-05-calendar-no-holidays-a4-son', "'표시 안 함'에는 -nonames 를 붙이지 않는다");
  eq(S.fileBase({ kind: 'month', year: 2026, month: 10, ...KR, show: { names: true, lunar: true, terms: true, son: true } }), '2026-10-calendar-korea-a4-son', '월 페이지(손 없는 날이 든 달) 파일 이름');
  // 설정이 다르면 이름도 다르다: 한 해의 모든 조합에서 (종이 내용이 다르면 이름도 다름)
  {
    const seen = new Map(); let clash = [], n = 0;
    for (const [lang, country] of [['ko', 'KR'], ['ko', 'US'], ['ko', 'NONE'], ['en', 'US'], ['en', 'KR'], ['en', 'NONE']]) for (const paper of ['a4', 'letter']) for (const weekStart of [0, 1]) for (const mono of [false, true])
      for (const names of [true, false]) for (const week of [false, true]) for (const lunar of [true, false]) for (const terms of [true, false]) for (const son of [false, true])
        for (const [kind, orient] of [['year', 'landscape'], ['year', 'portrait'], ['month', 'landscape']]) {
          const o = { kind, orient, year: 2027, month: 5, lang, country, paper, weekStart, mono, show: { names, week, lunar, terms, son } };
          const name = lang + '/' + S.fileBase(o), body = JSON.stringify(S.build(o).items) + mono;
          n++;
          if (seen.has(name) && seen.get(name) !== body) clash.push(name);
          seen.set(name, body);
        }
    eq([...new Set(clash)].slice(0, 5), [], '같은 이름인데 종이 내용이 다른 파일 (' + n + '가지 설정, 이름 ' + seen.size + '개)');
  }
  // 미리 만든 파일이 있는 설정은 이름에 붙는 것이 없다(그 파일 주소 = 이름)
  for (const y of [2026, 2027, 2028]) for (const [ed, kinds] of [[KR, ['year', 'months']], [US, ['year', 'months']]]) for (const kind of kinds) {
    const o = { kind, year: y, ...ed, show: ON };
    eq(S.staticFile(o), '/files/' + S.fileBase(o) + '.pdf', '미리 만든 파일 주소 = 파일 이름 ' + S.fileBase(o));
    ok(fs.existsSync(path.join(__dirname, '..', 'files', S.fileBase(o) + '.pdf')), '미리 만든 파일이 실제로 있다 ' + S.fileBase(o));
  }

  // 주소 ↔ 설정
  const D0 = { year: 2027, kind: 'year', orient: 'landscape', month: 1, weekStart: 0, paper: 'a4', country: 'KR', names: true, week: false, lunar: true, terms: true, son: false, mono: false };
  const base = (ed, more) => ({ year: 2027, paper: ed.paper, country: ed.country, fixed: false, min: 2025, max: 2030, ...more });
  const read = (query, b) => { const q = new URLSearchParams(query), have = {}; q.forEach((v, k) => { k = k.toLowerCase(); if (!(k in have)) have[k] = v; }); return S.urlRead((k) => (k in have ? have[k] : null), b); };
  eq(S.urlQuery(D0, base(KR)), '', '기본 설정은 주소에 아무것도 싣지 않는다');
  eq(S.urlQuery({ ...D0, year: 2028, kind: 'months', month: 5, weekStart: 1, paper: 'letter', country: 'US', week: true, mono: true }, base(KR)), 'y=2028&k=monthly&m=5&w=mon&p=letter&c=us&wk=1&ink=bw', '늘 같은 순서');
  eq(S.urlQuery({ ...D0, weekStart: 1, paper: 'letter', country: 'US', week: true, lunar: false, son: true, mono: true }, base(KR)), 'w=mon&p=letter&c=us&wk=1&lunar=0&son=1&ink=bw', '화면 확인(e2e)이 보는 주소와 같다');
  {
    // 모든 조합: 설정 → 주소 → 설정이 그대로 돌아온다
    let bad = [], n = 0;
    for (const ed of [KR, US]) for (const fixed of [false, true]) for (const year of fixed ? [2027] : [2025, 2027, 2030]) for (const [kind, orient] of [['year', 'landscape'], ['year', 'portrait'], ['months', 'landscape'], ['month', 'landscape']])
      for (const month of kind === 'year' ? [1] : [1, 12]) for (const weekStart of [0, 1]) for (const paper of ['a4', 'letter']) for (const country of ['KR', 'US', 'NONE'])
        for (const bits of [0, 1, 2, 4, 8, 16, 32, 63, 21, 42]) {
          const st = { year, kind, orient, month, weekStart, paper, country, names: !(bits & 1), week: !!(bits & 2), lunar: !(bits & 4), terms: !(bits & 8), son: !!(bits & 16), mono: !!(bits & 32) };
          const b = base(ed, { fixed }), r = read(S.urlQuery(st, b), b), back = { ...D0, ...ed, year: 2027, ...r.set };
          delete back.lang;
          n++;
          if (r.bad.length || JSON.stringify(Object.keys(st).sort().map((k) => back[k])) !== JSON.stringify(Object.keys(st).sort().map((k) => st[k]))) bad.push(S.urlQuery(st, b));
        }
    eq(bad.slice(0, 5), [], '설정 → 주소 → 설정 (' + n + '가지)');
  }
  eq(read('?y=2028&k=monthly&m=5&w=mon&p=letter&c=us&wk=1&ink=bw&zzz=1&p2=x', base(KR)), { set: { year: 2028, kind: 'months', orient: 'landscape', month: 5, weekStart: 1, paper: 'letter', country: 'US', week: true, mono: true }, bad: [] }, '남이 보낸 주소: 모르는 이름(zzz·p2)은 그냥 둔다');
  eq(read('?W=MON&P=Letter&C=Us&K=Portrait&INK=BW', base(KR)), { set: { kind: 'year', orient: 'portrait', weekStart: 1, paper: 'letter', country: 'US', mono: true }, bad: [] }, '이름·값의 대소문자는 가리지 않는다');
  eq(read('?y=2031&k=month&m=1', base(KR)), { set: { kind: 'month', orient: 'landscape', month: 1 }, bad: ['y'] }, '범위 밖 연도(2031)는 쓸 수 없는 값으로 알린다');
  eq(read('?y=1999&k=zzz&m=44&c=jp&p=b5', base(KR)).bad, ['y', 'k', 'm', 'p', 'c'], '쓸 수 없는 값 다섯');
  eq(read('?y=1999&k=zzz&m=44&c=jp&p=b5', base(KR)).set, {}, '쓸 수 없는 값은 하나도 쓰지 않는다');
  eq([read('?m=13', base(KR)).bad, read('?m=0', base(KR)).bad, read('?m=5.5', base(KR)).bad, read('?y=20270', base(KR)).bad, read('?y=', base(KR)).bad, read('?w=tue', base(KR)).bad, read('?names=no', base(KR)).bad, read('?ink=red', base(KR)).bad],
    [['m'], ['m'], ['m'], ['y'], ['y'], ['w'], ['names'], ['ink']], '13월·0월·소수·다섯 자리 연도·빈 값·모르는 요일·모르는 표시 값');
  eq(read('?y=' + 'x'.repeat(6000) + '&c=%3Cscript%3E', base(KR)).bad, ['y', 'c'], '아주 긴 값·태그가 든 값');
  eq(read('?y=2029&w=mon', base(KR, { fixed: true })), { set: { weekStart: 1 }, bad: ['y'] }, '연간 페이지: 다른 해의 y 는 쓸 수 없는 값, 다른 설정은 받는다');
  eq(read('?y=2027&w=mon', base(KR, { fixed: true })), { set: { weekStart: 1 }, bad: [] }, '연간 페이지: 그 해의 y 는 괜찮다');
  eq(read('?adpreview&utm_source=x', base(KR)), { set: {}, bad: [] }, '우리 것이 아닌 이름은 건드리지 않는다');

  // 언어를 바꿀 때: 나라·용지는 그대로(언어판 기본값이 달라도 같은 달력), 그 언어판에 없는 값은 버린다
  const carry = (st, from, to) => S.urlQuery(S.urlCarry(st, to), base(S.EDITION[to]));
  eq(S.EDITION, { ko: { country: 'KR', paper: 'a4' }, en: { country: 'US', paper: 'letter' } }, '언어판 기본값');
  eq(carry({ ...D0, weekStart: 1, country: 'US' }, 'ko', 'en'), 'w=mon&p=a4', '한국어판 ?w=mon&c=us → 영어판 ?w=mon&p=a4 (미국은 영어판 기본, A4는 그대로)');
  eq(carry({ ...D0, weekStart: 1 }, 'ko', 'en'), 'w=mon&p=a4&c=kr', '한국어판 ?w=mon → 영어판에서도 한국 공휴일·A4');
  eq(carry({ ...D0, paper: 'letter', country: 'US' }, 'ko', 'en'), '', '영어판 기본과 같아지면 아무것도 싣지 않는다');
  eq(carry({ ...D0, kind: 'month', month: 5, country: 'NONE', lunar: false, son: true, names: false }, 'ko', 'en'), 'k=month&m=5&p=a4&c=none', "영어판의 '표시 안 함'에는 음력·손 없는 날이 없다 → 버린다");
  eq(carry({ ...D0, kind: 'month', month: 5, country: 'NONE', lunar: false, son: true, paper: 'letter' }, 'en', 'ko'), 'k=month&m=5&p=letter&c=none&lunar=0&son=1', "한국어판의 '표시 안 함'에는 음력·손 없는 날이 있다 → 가져간다");
  eq(carry({ ...D0, kind: 'months', month: 3, country: 'KR', paper: 'letter', son: true, mono: true }, 'en', 'ko'), 'k=monthly&m=3&p=letter&son=1&ink=bw', '영어판에서 한국 공휴일 → 한국어판(나라는 기본이라 빠진다)');
}

group('글자 PDF(pdf.js): 구조가 맞고 글꼴·제목이 들어 있다');
{
  const G = cur, fonts = {};
  for (const w of [500, 600, 700, 800]) fonts[w] = new Uint8Array(fs.readFileSync(path.join(__dirname, '..', 'assets', 'fonts', 'onesheet-' + w + '.ttf')));
  const deflate = (b) => Promise.resolve(new Uint8Array(zlib.deflateSync(Buffer.from(b))));
  const parse = (bytes) => {
    const txt = Buffer.from(bytes).toString('latin1');
    const sx = +txt.slice(txt.lastIndexOf('startxref') + 9).trim().split('\n')[0];
    const lines = txt.slice(sx).split('\n'), total = +lines[1].split(' ')[1];
    let bad = 0;
    for (let k = 1; k < total; k++) { const off = +lines[2 + k].slice(0, 10); if (txt.substr(off, (k + ' 0 obj').length) !== k + ' 0 obj') bad++; }
    return { txt, total, bad, pages: (txt.match(/\/Type \/Page /g) || []).length };
  };
  const jobs = [
    [[{ kind: 'year', year: 2029, lang: 'ko', country: 'KR', paper: 'a4', weekStart: 1, show: { week: true } }], '2029년 달력', true],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => ({ kind: 'month', year: 2027, month, lang: 'en', country: 'KR', paper: 'letter', show: { lunar: true, terms: true, son: true } })), '2027 monthly calendar', true],
    [[{ kind: 'month', year: 2027, month: 5, lang: 'ko', country: 'KR', paper: 'a4', mono: true, show: { lunar: true } }], '2027년 5월', false],
  ];
  global.__pdfTests = Promise.all(jobs.map(([opts, title, zip]) => {
    const sheets = opts.map((o) => S.build(o));
    return PDF.make(sheets, { metrics: FM, fonts }, { title, lang: opts[0].lang, color: S.color, date: new Date(Date.UTC(2026, 9, 10)) }, zip ? deflate : null).then((bytes) => {
      cur = G;
      const r = parse(bytes), used = [...new Set(sheets.flatMap((sh) => sh.items.filter((i) => i.t).map((i) => i.w)))];
      ok(r.txt.startsWith('%PDF-1.') && r.txt.trimEnd().endsWith('%%EOF') && r.bad === 0, title + ': 머리·꼬리·xref 위치 (' + r.bad + '개 어긋남)');
      eq(r.pages, sheets.length, title + ': 쪽 수');
      eq((r.txt.match(/\/FontFile2 /g) || []).length, used.length, title + ': 쓰는 굵기만큼 글꼴이 담김');
      ok(r.txt.includes('/Title <FEFF' + [...title].map((ch) => ('000' + ch.charCodeAt(0).toString(16)).slice(-4).toUpperCase()).join('') + '>') && r.txt.includes('/Producer <FEFF'), title + ': 문서 제목·만든 곳');
      ok(r.txt.includes('/MediaBox [0 0 ' + (Math.round(sheets[0].w * 72 / 25.4 * 1000) / 1000) + ' '), title + ': 종이 크기');
      ok(bytes.length < (zip ? 160000 : 260000), title + ': 크기 ' + bytes.length + '바이트');
      if (!zip) {   // 안 줄인 판: 글자가 글리프 번호로 들어 있고 흑백이면 빨강이 없다
        const gid = (ch) => ('000' + FM.gid[FM.chars.indexOf(ch)].toString(16)).slice(-4).toUpperCase();
        ok(r.txt.includes('<' + [...'5월'].map(gid).join('') + '> Tj'), title + ": '5월'이 글자로 들어 있다");
        ok(!/0\.82\d* 0\.2 0\.16\d* rg/.test(r.txt), title + ': 흑백에는 빨강이 없다');
      }
    });
  }).concat([Promise.resolve().then(() => {
    cur = G;
    const img = PDF.image([{ jpeg: new Uint8Array([255, 216, 255, 217]), wpx: 3508, hpx: 2480, wmm: 297, hmm: 210 }], { title: '2029년 달력', lang: 'ko' }), r = parse(img);
    ok(r.bad === 0 && r.pages === 1 && r.txt.includes('/DCTDecode') && r.txt.includes('/Title <FEFF'), '그림 PDF(대신 쓰는 길): 구조·제목');
  })]));
}

// ───────── 11. 글·화면 문구 속 숫자 ─────────
group('글 속 숫자(가이드·자주 묻는 질문·공휴일 페이지)');
{
  const W = '일월화수목금토', wd = (s) => W[C.wd(...C.parse(s))];
  // 한국어 1: 노동절·제헌절 요일
  eq(['2026-05-01', '2026-07-17', '2027-05-01', '2027-07-17', '2028-05-01', '2028-07-17'].map(wd).join(''), '금금토토월월', '노동절·제헌절 요일 2026~2028');
  eq(C.bridges('KR', 2027, 1)[0].days, 5, '2027-05-04 연차 → 5일');
  // 한국어 2: 대체공휴일 표
  const subs = (y) => C.holidays('KR', y).list.filter((x) => x.kind === 'substitute').map((x) => x.date.slice(5) + W[x.wd]);
  eq(subs(2026), ['03-02월', '05-25월', '08-17월', '10-05월'], '2026 대체공휴일');
  eq(subs(2027), ['02-09화', '05-03월', '07-19월', '08-16월', '10-04월', '10-11월', '12-27월'], '2027 대체공휴일');
  eq(subs(2028), ['10-05목'], '2028 대체공휴일');
  eq(subs(2029), ['05-07월', '05-21월', '09-24월'], '2029 대체공휴일(예상)');
  eq(subs(2030), ['02-05화', '05-06월'], '2030 대체공휴일(예상)');
  eq(['2026-03-01', '2026-05-24', '2026-08-15', '2026-10-03', '2027-02-07', '2027-10-09', '2027-12-25', '2027-08-15', '2027-10-03', '2029-05-05', '2029-05-20', '2030-05-05'].map(wd).join(''), '일일토토일토토일일토일일', '대체공휴일 까닭(요일)');
  eq(C.holidays('KR', 2029).byDate['2029-09-23'].name, '추석 다음 날', '2029 추석 연휴의 일요일');
  eq(C.holidays('KR', 2030).byDate['2030-02-03'].name, '설날', '2030 설날은 일요일');
  eq([wd('2027-06-06'), wd('2028-01-01'), wd('2026-09-24'), wd('2026-09-26'), wd('2028-10-03')].join(''), '일토목토화', '대체 없는 날·2028 추석');
  eq(C.breaks('KR', 2028).filter((b) => b.from === '2028-09-30').map((b) => [b.to, b.days]), [['2028-10-05', 6]], '2028-09-30 ~ 10-05 6일');
  // 한국어 4: 음력 해 길이·윤달·명절
  const ly = (y) => { const ms = C.lunar.months(y); return [ms.length, ms.reduce((a, b) => a + b.days, 0)]; };
  eq([ly(2025), ly(2026), ly(2027), ly(2028)], [[13, 384], [12, 355], [12, 354], [13, 383]], '음력 해 길이');
  eq([C.lunar.toSolar(2025, 6, 1, true), C.lunar.toSolar(2025, 6, 29, true), C.lunar.toSolar(2028, 5, 1, true), C.lunar.toSolar(2028, 5, 29, true)], [[2025, 7, 25], [2025, 8, 22], [2028, 6, 23], [2028, 7, 21]], '윤달 기간');
  eq([C.lunar.toSolar(2025, 6, 1, false), C.lunar.toSolar(2025, 8, 15, false)], [[2025, 6, 25], [2025, 10, 6]], '2025 음 6.1, 추석');
  eq([[2026, 1, 1], [2026, 8, 15], [2027, 1, 1], [2027, 8, 15], [2028, 1, 1], [2028, 8, 15]].map((a) => { const s = C.lunar.toSolar(a[0], a[1], a[2], false); return C.iso(...s).slice(5) + W[C.wd(...s)]; }),
    ['02-17화', '09-25금', '02-07일', '09-15수', '01-27목', '10-03화'], '설날·추석 2026~2028');
  // 영어 2: 미국 2027 연휴와 목요일 공휴일
  eq(C.bridges('US', 2027, 1).map((b) => [b.leave[0], b.from, b.to, b.days]), [['2027-11-12', '2027-11-11', '2027-11-14', 4], ['2027-11-26', '2027-11-25', '2027-11-28', 4]], '미국 2027 목요일 공휴일 + 하루');
  eq([C.wd(2027, 6, 19), C.wd(2027, 7, 4), C.wd(2027, 12, 25), C.wd(2028, 1, 1), C.wd(2026, 7, 4)], [6, 0, 6, 6, 6], '주말에 걸린 미국 공휴일');
  eq(C.yearFacts('US', 2027).holidaysOnWeekdays, 12, '미국 2027 평일 휴일 12일');
  eq(C.yearFacts('US', 2026).holidaysOnWeekdays, 11, '미국 2026 평일 휴일 11일');
  // 영어 3: 주 번호 예시
  eq([C.isoWeek(2026, 12, 31), C.isoWeek(2027, 1, 1), C.isoWeek(2027, 1, 3), C.isoWeek(2027, 1, 4), C.isoWeek(2027, 12, 31)].map((w) => w.year + '-' + w.week), ['2026-53', '2026-53', '2026-53', '2027-1', '2027-52'], 'ISO 예시');
  eq([C.usWeek(2026, 12, 31), C.usWeek(2027, 1, 1), C.usWeek(2027, 1, 3), C.usWeek(2027, 1, 4), C.usWeek(2027, 12, 31)], [53, 1, 2, 2, 53], '미국식 예시');
  eq([C.wd(2026, 12, 31), C.wd(2027, 1, 1), C.wd(2027, 1, 3), C.wd(2027, 1, 4), C.wd(2027, 12, 31)], [4, 5, 0, 1, 5], '예시 날짜의 요일');
  // 영어 4: 한국 2027
  eq(C.holidays('KR', 2027).list.filter((x) => x.kind === 'substitute').length, 7, '2027 대체공휴일 7일');
  eq(C.bridges('KR', 2027, 1).filter((b) => /2027-09/.test(b.leave[0])).map((b) => b.days), [6, 6], '9월 13일·17일 연차 → 6일');
  // 인쇄 글: 용지 크기
  eq([+(S.SIZES.letter[1] - S.SIZES.a4[1]).toFixed(1), +(S.SIZES.a4[0] - S.SIZES.letter[0]).toFixed(1)], [5.9, 17.6], 'A4는 5.9mm 좁고 17.6mm 길다');
  // 손 없는 날 페이지·월 페이지에 나오는 2026년 10월
  eq(C.monthFacts('KR', 2026, 10).son, [9, 10, 19, 20, 29, 30], '2026년 10월 손 없는 날');
  eq(C.monthFacts('KR', 2026, 10).workdays, 20, '2026년 10월 일하는 날 20일');
}

// ───────── 결과 ─────────
(global.__pdfTests || Promise.resolve()).catch((e) => { total++; failed++; console.log('  ✗ PDF 테스트 오류: ' + (e && e.stack || e)); }).then(() => {
  console.log('');
  for (const g of groups) console.log((g.fail ? '✗ ' : '✓ ') + g.name + ' : ' + g.n + '개' + (g.fail ? ', 실패 ' + g.fail : ''));
  console.log('\n합계 ' + total + '개, 통과 ' + (total - failed) + ', 실패 ' + failed);
  process.exit(failed ? 1 : 0);
});
