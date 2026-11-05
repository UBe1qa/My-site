// 로직 시험: node chess/tests/run.mjs  (core.js·chess.min.js·data/t 를 그대로 읽는다)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = globalThis;
for (const f of ['chess.min.js', 'core.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8'));
const FM = globalThis.FM, Chess = globalThis.Chess;
let ok = 0, bad = 0;
const eq = (a, b, msg) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { bad++; console.log('✗', msg, JSON.stringify(a), '≠', JSON.stringify(b)); } };

// 1) 조각: 모든 국면이 자기 조각에 있고(FNV 같음), 숫자 칸 모양이 맞다
//    국면 = [도착 12칸, 평가, [[수, 분류, 수 뒤 평가, 12칸]…], 고수 도착 12칸|0, [[수, 4칸]…]|0, 엔진 최선 수|0, 수순|0]
const dir = path.join(ROOT, 'data', 't');
let npos = 0, nnames = 0, slugs = 0, nfiles = 0, nev = 0;
for (const f of fs.readdirSync(dir)) {
  nfiles++;
  const id = f.replace('.json', ''), sh = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const [epd, e] of Object.entries(sh.e)) {
    npos++;
    if (e[1] != null) nev++;
    if (FM.shard(epd) !== id) eq(FM.shard(epd), id, 'shard ' + epd);
    if (e[0].length !== 12) eq(e[0].length, 12, 'reached 12칸 ' + epd);
    for (const row of e[2]) if (row.length !== 15 || typeof row[0] !== 'string' || row[1] < -1 || row[1] > 4) eq(row.length, 15, 'row ' + epd);
    if (e[3] && e[3].length !== 12) eq(e[3].length, 12, 'otb 12칸 ' + epd);
    if (e[4]) for (const row of e[4]) if (row.length !== 5) eq(row.length, 5, 'otb row ' + epd);
    const s = FM.stats(e, -1), sum = s.moves.reduce((a, m) => a + m.n, 0);
    if (sum > s.n) eq(sum <= s.n, true, 'moves ≤ reached ' + epd);
  }
  for (const [epd, n] of Object.entries(sh.n || {})) { nnames++; if (n[3]) slugs++; if (FM.shard(epd) !== id) eq(FM.shard(epd), id, 'name shard ' + epd); }
}
eq(nfiles, FM.SHARDS, '조각 수');
eq(nev / npos > 0.95, true, '평가가 있는 국면 95% 이상');
console.log(`국면 ${npos}(평가 ${(nev / npos * 100).toFixed(1)}%), 이름 ${nnames}(해설 연결 ${slugs})`);

// 2) 처음 국면 통계 + 수가 모두 둘 수 있는 수
const start = new Chess(), sepd = FM.epd(start.fen());
const sh0 = JSON.parse(fs.readFileSync(path.join(dir, FM.shard(sepd) + '.json'), 'utf8'));
FM._setShard(FM.shard(sepd), sh0);
const st = FM.stats(sh0.e[sepd], 2);
eq(st.moves[0].san, 'e4', '1600–1999 첫 수 1위');
for (const m of FM.stats(sh0.e[sepd], -1).moves) { const c = new Chess(); let mv = null; try { mv = c.move(m.san); } catch (e) {} eq(!!mv, true, '첫 수 둘 수 있음 ' + m.san); }
eq(FM.entrySync(sepd) === sh0.e[sepd], true, 'entrySync');
eq(FM.nameOf([sepd], 'en'), null, '처음 국면 이름 없음');

// 3) 연습 고르기
const choices = FM.oppChoices(sh0.e[sepd], 2);
eq(choices.length >= 2 && choices.every((c) => c.p >= 0.05), true, '상대 후보 5% 이상');
eq(Math.abs(choices.reduce((a, c) => a + c.w, 0) - 1) < 1e-9, true, '후보 무게 합 1');
eq(FM.pick(choices, 0).san, choices[0].san, 'pick 0');
eq(FM.pick(choices, 0.999999).san, choices[choices.length - 1].san, 'pick 끝');
eq(FM.bookMove(sh0.e[sepd]) !== null, true, '2000+ 최다 수');
eq(FM.playable(sh0.e[sepd], 'd4'), true, '1.d4 둘 만함');
eq(FM.playable(sh0.e[sepd], 'a3'), false, '1.a3 둘 만하지 않음');

// 4) 복습 간격
const T = 20000;
let c = FM.grade(null, true, T); eq([c.i, c.d, c.s], [1, T + 1, 1], '처음 맞힘');
c = FM.grade(c, true, T + 1); eq([c.i, c.d], [3, T + 4], '두 번째');
for (const want of [7, 16, 35, 90, 90]) { c = FM.grade(c, true, c.d); eq(c.i, want, '간격 ' + want); }
c = FM.grade(c, false, T + 500); eq([c.i, c.d, c.s, c.f], [0, T + 500, 0, 1], '틀림 → 그날');
eq(FM.due(c, T + 500), true, '틀린 카드 오늘 볼 것');
eq(FM.due(FM.grade(null, true, T), T), false, '맞힌 카드 오늘 아님');

// 5) 숫자 모양·주소
eq(FM.pct(0.004), '0.4%', 'pct <1'); eq(FM.pct(0.0004), '<0.1%', 'pct <0.1'); eq(FM.pct(0.355), '36%', 'pct'); eq(FM.count(1234567, 'en'), '1.2M', 'count en');
eq(FM.count(254000, 'ko'), '25만', 'count ko'); eq(FM.count(174931775, 'ko'), '1.7억', 'count ko 억'); eq(FM.count(18000, 'ko'), '1.8만', 'count ko 2'); eq(FM.count(8673, 'ko'), '8,673', 'count ko 3');
eq(FM.paramToLine('e2e4.e7e5.zz.e1g1.a7a8q'), ['e2e4', 'e7e5', 'e1g1', 'a7a8q'], 'paramToLine');
eq(FM.fnv('abc'), 440920331, 'fnv');
eq(FM.shard(sepd).length, 3, '조각 이름 3자리');
eq(FM.hashToSan('e4.e5.Nf3.Nc6'), ['e4', 'e5', 'Nf3', 'Nc6'], 'hashToSan');
eq(FM.sanToHash(['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#']), 'e4.e5.Qh5.Nc6.Bc4.Nf6.Qxf7', 'sanToHash');

// 7) 테스트 문제: 정답은 메인·대안이고 보기 넷이 서로 다르며 둘 수 있다
const TQ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'test.json'), 'utf8'));
eq(TQ.q.length >= 300, true, '테스트 문제 300개 이상');
let tbad = 0;
for (const q of TQ.q) {
  const c = new Chess();
  for (const u of q[0].split(".").filter(Boolean)) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  const sans = q[3].map((o) => o[0]);
  const okMove = (san) => { try { return !!new Chess(c.fen()).move(san); } catch (e) { return false; } };
  if (new Set(sans).size !== 4 || !sans.includes(q[2]) || !sans.every(okMove) || (c.turn() === 'w') !== (q[1] === 'w')) tbad++;
  const right = q[3].find((o) => o[0] === q[2]);
  if (!right || right[2] > 1) tbad++;
}
eq(tbad, 0, '테스트 문제 모양');
for (const [slug, ids] of Object.entries(TQ.by)) if (!ids.every((i) => TQ.q[i] && TQ.q[i][5].includes(slug))) eq(slug, 'ok', 'by 목록 ' + slug);

// 6) chess.js EPD 앙파상 칸 = python-chess(잡을 수 있을 때만)
const a = new Chess(); a.move('e4'); eq(FM.epd(a.fen()), 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -', 'ep 없음');
console.log(`${ok} 통과, ${bad} 실패`);
process.exit(bad ? 1 : 0);
