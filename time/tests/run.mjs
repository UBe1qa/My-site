// 한바퀴 로직 시험: node time/tests/run.mjs [묶음 이름…] [--strict]
// 기준값은 손으로 따지지 않고 다른 방법으로 구한다: 시간대 = 파이썬 zoneinfo(tests/gen_tz.py → cases-tz.json).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..');
const load = (f) => new Function(fs.readFileSync(path.join(ROOT, f), 'utf8'))();
load('assets/core.js'); load('assets/tz.js');
const OT = globalThis.OT, TZ = globalThis.OT_TZ;
const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let pass = 0, fail = 0; const fails = [];
function eq(name, got, exp) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) pass++; else { fail++; if (fails.length < 40) fails.push(`${name}: got ${g} want ${e}`); }
}
const groups = {};
const G = (n, f) => { groups[n] = f; };
const M = 60000, H = 3600000;

G('fmt', () => {
  eq('t 5m', OT.fmtTimer(5 * M), '05:00');
  eq('t 5m-1ms', OT.fmtTimer(5 * M - 1), '05:00');
  eq('t 4:59', OT.fmtTimer(5 * M - 1000), '04:59');
  eq('t 0', OT.fmtTimer(0), '00:00');
  eq('t neg', OT.fmtTimer(-500), '00:00');
  eq('t 1ms', OT.fmtTimer(1), '00:01');
  eq('t 1h', OT.fmtTimer(H), '1:00:00');
  eq('t 99h', OT.fmtTimer(OT.MAX_TIMER), '99:59:59');
  eq('w 0', OT.fmtWatch(0), '00:00.00');
  eq('w 61.239', OT.fmtWatch(61239), '01:01.23');
  eq('w 1h2m3.456', OT.fmtWatch(H + 2 * M + 3456), '1:02:03.45');
  eq('w nocs', OT.fmtWatch(61999, true), '01:01');
  eq('say ko', OT.say(H + 5 * M, 'ko'), '1시간 5분');
  eq('say ko 0', OT.say(0, 'ko'), '0초');
  eq('say en', OT.say(M + 1000, 'en'), '1 minute 1 second');
  eq('say en pl', OT.say(2 * H + 30 * 1000, 'en'), '2 hours 30 seconds');
  eq('say ceil', OT.say(4 * M + 59001, 'ko', true), '5분');
  eq('ago ko', OT.ago(3 * M + 5000, 'ko'), '3분 전');
  eq('ago ko h', OT.ago(H + 2 * M, 'ko'), '1시간 2분 전');
  eq('ago en now', OT.ago(30000, 'en'), 'just now');
  eq('until ko', OT.until(6 * H + 11 * M + 1, 'ko'), '6시간 12분 뒤');
  eq('until en', OT.until(45 * M, 'en'), 'in 45 min');
  eq('until en h', OT.until(2 * H, 'en'), 'in 2 h');
  eq('clock 12', OT.fmtClock(0, 5, 'en', true), '12:05 AM');
  eq('clock ko', OT.fmtClock(13, 0, 'ko', true), '오후 1:00');
  eq('clock 24', OT.fmtClock(7, 3, 'ko', false), '07:03');
  eq('utc +', OT.utcLabel(540), 'UTC+9');
  eq('utc half', OT.utcLabel(-210), 'UTC−3:30');
  eq('utc 545', OT.utcLabel(345), 'UTC+5:45');
  eq('diff ko', OT.diffText(-13 * 60, 'ko', '서울'), '서울보다 13시간 느림');
  eq('diff ko +', OT.diffText(90, 'ko', '서울'), '서울보다 1시간 30분 빠름');
  eq('diff ko 0', OT.diffText(0, 'ko', '서울'), '서울과 같은 시각');
  eq('diff en', OT.diffText(-240, 'en', 'London'), '4 h behind London');
  eq('diff en +', OT.diffText(30, 'en', 'you'), '30 min ahead of you');
});

G('parse', () => {
  eq('empty', OT.parseField('', 59), { ok: true, value: 0, empty: true });
  eq('5', OT.parseField('5', 59), { ok: true, value: 5 });
  eq('full', OT.parseField('１０', 59), { ok: true, value: 10 });
  eq('space', OT.parseField(' 7 ', 59), { ok: true, value: 7 });
  eq('frac', OT.parseField('1.5', 59).err, 'frac');
  eq('neg', OT.parseField('-3', 59).err, 'neg');
  eq('nan', OT.parseField('abc', 59).err, 'nan');
  eq('exp', OT.parseField('1e3', 59).err, 'nan');
  eq('max', OT.parseField('60', 59).err, 'max');
  eq('h99', OT.parseField('99', 99).value, 99);
  eq('clock', OT.parseClock('07:30'), { h: 7, m: 30 });
  eq('clock 1digit', OT.parseClock('7:05'), { h: 7, m: 5 });
  eq('clock full', OT.parseClock('０７：３０'), { h: 7, m: 30 });
  eq('clock bad', OT.parseClock('24:00'), null);
  eq('clock bad2', OT.parseClock('7:5'), null);
});

G('scale', () => {
  eq('30s', OT.scaleFor(30000), 1);
  eq('1m', OT.scaleFor(M), 1);
  eq('1m1s', OT.scaleFor(M + 1000), 5);
  eq('5m', OT.scaleFor(5 * M), 5);
  eq('25m', OT.scaleFor(25 * M), 30);
  eq('60m', OT.scaleFor(60 * M), 60);
  eq('61m', OT.scaleFor(61 * M), 120);
  eq('24h', OT.scaleFor(24 * H), 1440);
  eq('30h', OT.scaleFor(30 * H), 1800);
  // 모든 판: 눈금 숫자가 12개 이하, 첫 숫자는 0, 작은 눈금 한 칸은 딱 떨어지는 초
  for (const s of OT.SCALES.concat([1800, 6000])) {
    const f = OT.faceLabels(s);
    eq('labels<=12 ' + s, f.labels.length <= 12 && f.labels.length >= 3, true);
    eq('first0 ' + s, f.labels[0].v, 0);
    eq('tick whole ' + s, Number.isInteger((s * 60) / f.ticks), true);
    eq('label on tick ' + s, f.labels.every((l) => Math.abs(l.frac * f.ticks - Math.round(l.frac * f.ticks)) < 1e-9), true);
  }
  // 돌려 맞추기
  eq('ang 0', OT.angleToMinutes(0), 0);
  eq('ang 90', OT.angleToMinutes(90), 15);
  eq('ang -6', OT.angleToMinutes(-6), 59);
  eq('ang 359', OT.angleToMinutes(359), 0);
  eq('drag up', OT.dragMinutes(58, 360 - 6), 59);
  eq('drag over 12', OT.dragMinutes(59, 6), 60);
  eq('drag stay full', OT.dragMinutes(60, 12), 60);
  eq('drag back', OT.dragMinutes(60, 354), 59);
  eq('drag below 0', OT.dragMinutes(0, 354), 0);
  eq('drag fwd', OT.dragMinutes(10, 90), 15);
  eq('drag near half fwd', OT.dragMinutes(5, 200), 33);
  eq('drag jump guard', OT.dragMinutes(5, 216), 0); // 반 바퀴 넘게 튀면 반대쪽(-)으로 읽어 0에서 멈춤
});

G('timer', () => {
  let t = { id: 'a', dur: 5 * M, state: 'idle' };
  eq('idle left', OT.timerLeft(t, 0), 5 * M);
  t = OT.timerStart(t, 1000);
  eq('run end', t.end, 1000 + 5 * M);
  eq('run left', OT.timerLeft(t, 61000), 4 * M);
  t = OT.timerPause(t, 61000);
  eq('pause left', [t.state, t.left], ['pause', 4 * M]);
  eq('pause left later', OT.timerLeft(t, 9e9), 4 * M);
  t = OT.timerStart(t, 100000);
  eq('resume end', t.end, 100000 + 4 * M);
  t = OT.timerAdd(t, M, 100000);
  eq('add run', [t.end, t.dur], [100000 + 5 * M, 6 * M]);
  eq('tick before', OT.timerTick(t, t.end - 1).state, 'run');
  const d = OT.timerTick(t, t.end + 5000);
  eq('tick done', [d.state, d.doneAt], ['done', t.end]);
  eq('done left', OT.timerLeft(d, 0), 0);
  const d2 = OT.timerAdd(d, M, 777);
  eq('add after done restarts', [d2.state, d2.end, d2.dur], ['run', 777 + M, M]);
  eq('reset', OT.timerReset(d).state, 'idle');
  eq('start zero', OT.timerStart({ dur: 0, state: 'idle' }, 5).state, 'idle');
  eq('add max', OT.timerAdd({ dur: OT.MAX_TIMER, state: 'idle' }, M, 0).dur, OT.MAX_TIMER);
  // 숨은 탭에서 늦게 불려도 남은 시간은 끝 시각으로 정해진다
  let r = OT.timerStart({ dur: 10 * M, state: 'idle' }, 0);
  eq('late call', OT.fmtTimer(OT.timerLeft(r, 7 * M + 59 * 1000 + 300)), '02:01');
});

G('watch', () => {
  let w = OT.watchReset();
  w = OT.watchStart(w, 1000);
  w = OT.watchLap(w, 3500);
  w = OT.watchLap(w, 4500);
  w = OT.watchStop(w, 6000);
  eq('time stopped', OT.watchTime(w, 99999), 5000);
  w = OT.watchStart(w, 10000);
  eq('time resumed', OT.watchTime(w, 11000), 6000);
  w = OT.watchLap(w, 13000);
  eq('laps', w.laps, [2500, 3500, 8000]);
  const lr = OT.lapRows(w.laps);
  eq('rows', lr.rows.map((x) => x.lap), [2500, 1000, 4500]);
  eq('fast slow', [lr.fast, lr.slow], [1, 2]);
  eq('one lap no marks', [OT.lapRows([1000]).fast, OT.lapRows([1000]).slow], [-1, -1]);
  eq('equal laps no marks', OT.lapRows([1000, 2000]).fast, -1);
  eq('lap on stopped ignored', OT.watchLap(OT.watchStop(w, 14000), 15000).laps.length, 3);
  eq('csv', OT.lapCsv([2500, 3500], 'en'), 'Lap,Lap time,Total time,Lap (ms),Total (ms)\n1,00:02.50,00:02.50,2500,2500\n2,00:01.00,00:03.50,1000,3500\n');
});

G('alarm', () => {
  // 기기 시간대를 바꿔 가며 다른 노드 프로세스에서 돈다
  const code = `${fs.readFileSync(path.join(ROOT, 'assets/core.js'), 'utf8')}
    const OT=globalThis.OT, out=[];
    const T=(s)=>new Date(s).getTime();
    out.push(OT.nextAlarm(7,30,T('2026-10-14T06:00:00')));
    out.push(OT.nextAlarm(7,30,T('2026-10-14T07:30:00')));
    out.push(OT.nextAlarm(7,30,T('2026-10-14T08:00:00')));
    out.push(OT.nextAlarm(2,30,T('2026-03-07T23:00:00')));
    out.push(OT.nextAlarm(1,30,T('2026-11-01T00:10:00')));
    console.log(JSON.stringify(out.map(r=>r&&[new Date(r.at).toString().slice(0,24), r.shifted])));`;
  const ny = JSON.parse(execFileSync(process.execPath, ['-e', code], { env: { ...process.env, TZ: 'America/New_York' } }).toString());
  eq('ny before', ny[0], ['Wed Oct 14 2026 07:30:00', false]);
  eq('ny same minute → tomorrow', ny[1], ['Thu Oct 15 2026 07:30:00', false]);
  eq('ny after', ny[2], ['Thu Oct 15 2026 07:30:00', false]);
  eq('ny spring gap', ny[3], ['Sun Mar 08 2026 03:30:00', true]);
  eq('ny fall twice → first', ny[4][0], 'Sun Nov 01 2026 01:30:00');
  const se = JSON.parse(execFileSync(process.execPath, ['-e', code], { env: { ...process.env, TZ: 'Asia/Seoul' } }).toString());
  eq('seoul', se[0], ['Wed Oct 14 2026 07:30:00', false]);
  eq('seoul no gap', se[3], ['Sun Mar 08 2026 02:30:00', false]);
});

G('alarmz', () => {
  // 시간대 지정 알람(기기 시간대가 브라우저 tz 자료와 달라도). 밴쿠버 2026-11-05 14:30Z = 현지 7:30(UTC-7)
  const T = (s) => Date.parse(s);
  eq('van 8:00', OT.nextAlarmZ('America/Vancouver', 8, 0, T('2026-11-05T14:30:00Z')).at, T('2026-11-05T15:00:00Z'));
  eq('casa 9:00', OT.nextAlarmZ('Africa/Casablanca', 9, 0, T('2026-11-05T08:30:00Z')).at, T('2026-11-05T09:00:00Z'));
  eq('ny gap', OT.nextAlarmZ('America/New_York', 2, 30, T('2026-03-08T04:00:00Z')), { at: T('2026-03-08T07:30:00Z'), shifted: true });
  eq('seoul tomorrow', OT.nextAlarmZ('Asia/Seoul', 7, 30, T('2026-10-14T00:00:00Z')).at, T('2026-10-14T22:30:00Z'));
  eq('same minute → tomorrow', OT.nextAlarmZ('Asia/Seoul', 9, 0, T('2026-10-14T00:00:00Z')).at, T('2026-10-15T00:00:00Z'));
  // 자정에 바꾸는 곳: 산티아고 2027-04-04 03:00Z, 바뀌기 전 UTC-3 → 4월 4일(일) 0:00
  const sc = OT.nextChange('America/Santiago', T('2026-10-14T00:00:00Z'), 400);
  eq('santiago wall', OT.changeWall(sc), { y: 2027, mo: 4, d: 4, h: 0, mi: 0, wd: 0 });
  const cai = OT.nextChange('Africa/Cairo', T('2026-10-14T00:00:00Z'), 400);
  eq('cairo wall', [OT.changeWall(cai).d, OT.changeWall(cai).h, OT.changeWall(cai).wd], [30, 0, 5]);
  const ny = OT.nextChange('America/New_York', T('2026-10-14T00:00:00Z'), 400);
  eq('ny wall', [OT.changeWall(ny).mo, OT.changeWall(ny).d, OT.changeWall(ny).h], [11, 1, 2]);
});

G('tz', () => {
  const C = JSON.parse(fs.readFileSync(path.join(DIR, 'cases-tz.json'), 'utf8'));
  // tz.js의 모든 도시 시간대가 이 브라우저(노드 ICU)에서 쓸 수 있는지, 시험 자료와 같은 목록인지
  const zs = [...new Set(TZ.cities.map((c) => c[1]))].sort();
  eq('zones listed', zs, C.zones);
  for (const z of zs) eq('valid ' + z, OT.validZone(z), true);
  for (const c of TZ.cities) eq('nation ' + c[0], !!TZ.nations[c[4]], true);
  eq('unique ids', new Set(TZ.cities.map((c) => c[0])).size, TZ.cities.length);
  for (const [z, ts, o] of C.offset) eq(`off ${z} ${new Date(ts).toISOString()}`, OT.offset(z, ts), o);
  for (const [z, ts, n] of C.next) eq(`next ${z} ${new Date(ts).toISOString()}`, OT.nextChange(z, ts), n);
  for (const [z, y, mo, d, h, mi, ts, gap] of C.local) eq(`local ${z} ${y}-${mo}-${d} ${h}:${mi}`, OT.fromLocal(z, y, mo, d, h, mi), { ts, gap });
  // 회의 띠: 서울 기준 2026-10-14(수), 뉴욕·런던. 모두 근무인 시간은 없다(서울 밤 = 뉴욕 아침, 런던 오후)
  const mt = OT.meeting('Asia/Seoul', ['Asia/Seoul', 'America/New_York', 'Europe/London'], 2026, 10, 14);
  eq('meet rows', mt.hours.length, 24);
  eq('meet seoul22 → ny 9', [mt.hours[22].cells[1].h, mt.hours[22].cells[1].day], [9, 0]);
  eq('meet seoul9 → ny 20 prev day', [mt.hours[9].cells[1].h, mt.hours[9].cells[1].day], [20, -1]);
  eq('meet all', mt.all, []);
  const mt2 = OT.meeting('Europe/London', ['Europe/London', 'Europe/Paris'], 2026, 10, 14);
  eq('meet london paris', mt2.all, [9, 10, 11, 12, 13, 14, 15, 16]);
  const mt3 = OT.meeting('Asia/Seoul', ['Asia/Seoul', 'Asia/Tokyo'], 2026, 10, 17); // 토요일
  eq('meet weekend', mt3.all, []);
  const mt4 = OT.meeting('Asia/Seoul', ['Asia/Seoul', 'Asia/Kolkata'], 2026, 10, 14); // 반 시간 차: 콜카타 9:30 시작도 근무
  eq('meet half hour', mt4.all, [13, 14, 15, 16, 17]);
});

const names = want.length ? want : Object.keys(groups);
for (const n of names) { if (!groups[n]) { console.log('묶음 없음:', n); process.exit(2); } groups[n](); }
for (const f of fails) console.log('  ✗ ' + f);
console.log(`${names.join(' ')}: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);
