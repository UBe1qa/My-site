// 사다리 치우침 시뮬레이션: node pick/_dev/sim_ladder.mjs [--quick]
// 사이트가 실제로 쓰는 사다리 만들기 코드(assets/core/ladder.js)로 사다리를 많이 만들어
// '출발 자리 → 도착 자리'가 얼마나 치우치는지 잰다. 씨앗이 고정이라 돌릴 때마다 같은 숫자가 나온다.
// 결과: _dev/sim_ladder.json (가이드 글의 표가 이 숫자를 쓴다. check.sh가 다시 돌려 대조한다)
//
// 재는 것(아래 칸을 섞지 않은 '사다리만'의 경우와, 사이트처럼 아래 칸을 섞은 경우):
//   stay  = 출발한 자리 바로 아래 칸에 도착한 비율        fair = 공평할 때의 값 1/n
//   near  = 출발 자리에서 한 칸 이내에 도착한 비율
//   tv    = 균등 분포와의 차이(전변동거리, 0 = 완전히 고름, 1에 가까울수록 치우침)
//   noise = 완전히 고른 뽑기를 같은 횟수만큼 했을 때 우연히 생기는 tv 크기(이 정도면 '고르다')
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng } from '../assets/core/rng.js';
import { LADDER, makeLadder, ladderEnds, playLadder } from '../assets/core/ladder.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const quick = process.argv.includes('--quick');
const PEOPLE = [2, 3, 4, 5, 6, 8, 10, 15, 20, 30];
const ROWS = [LADDER.rowsFew, LADDER.rowsNormal, LADDER.rowsMany, 48, 100, 200, 400];
const BUDGET = quick ? 1e7 : 6e7;
const MIN_TRIALS = quick ? 3000 : 20000;
const PRODUCT_ROWS = [LADDER.rowsFew, LADDER.rowsNormal, LADDER.rowsMany]; // 사이트가 실제로 쓰는 높이(적게·보통·많이)

function seedFor(label) {
  const s = new Uint8Array(32);
  for (let i = 0; i < 32; i++) s[i] = (label.charCodeAt(i % label.length) * 131 + i * 29 + 7) & 255;
  s[0] |= 1;
  return s;
}
const round = (x, d = 4) => Math.round(x * 10 ** d) / 10 ** d;
function summarize(counts, start, trials) {
  const n = counts.length;
  let tv = 0;
  let near = 0;
  for (let e = 0; e < n; e++) {
    tv += Math.abs(counts[e] / trials - 1 / n);
    if (Math.abs(e - start) <= 1) near += counts[e];
  }
  return { stay: round(counts[start] / trials), near: round(near / trials), tv: round(tv / 2) };
}

const out = { note: 'pick/_dev/sim_ladder.mjs 가 만든 파일. 손으로 고치지 않는다.', k: LADDER.k, quick, rows: ROWS, people: PEOPLE, cells: [] };
const t0 = Date.now();
for (const n of PEOPLE) {
  for (const rows of ROWS) {
    const trials = Math.max(MIN_TRIALS, Math.min(400000, Math.floor(BUDGET / (rows * n))));
    const mid = Math.floor(n / 2);
    const rng = makeRng(seedFor(`sim-${n}-${rows}`));
    const edge = new Array(n).fill(0);   // 맨 왼쪽에서 출발 → 도착 자리
    const middle = new Array(n).fill(0); // 가운데에서 출발 → 도착 자리
    let rungs = 0;
    for (let t = 0; t < trials; t++) {
      const lad = makeLadder(n, rows, rng);
      const ends = ladderEnds(lad);
      edge[ends[0]]++;
      middle[ends[mid]]++;
      if (t < 2000) for (const row of lad.rungs) for (const v of row) rungs += v;
    }
    // 사이트 방식: 아래 칸을 섞은 뒤 사다리. 맨 왼쪽 사람이 받는 결과 번호 (사이트가 쓰는 높이에서만 잰다)
    let mixed = null;
    if (PRODUCT_ROWS.includes(rows)) {
      mixed = new Array(n).fill(0);
      const rng2 = makeRng(seedFor(`mix-${n}-${rows}`));
      for (let t = 0; t < trials; t++) mixed[playLadder(n, { rows }, rng2).result[0]]++;
    }
    out.cells.push({
      n, rows, trials, fair: round(1 / n),
      rungsPerGap: round(rungs / Math.min(trials, 2000) / (n - 1), 2),
      edge: summarize(edge, 0, trials),
      middle: summarize(middle, mid, trials),
      mixed: mixed ? summarize(mixed, 0, trials) : undefined,
      noise: round(Math.sqrt((n - 1) / (2 * Math.PI * trials))),
      edgeDist: n === 8 ? edge.map((c) => round(c / trials)) : undefined,
      mixedDist: n === 8 && mixed ? mixed.map((c) => round(c / trials)) : undefined,
    });
  }
}
if (!quick) fs.writeFileSync(path.join(HERE, 'sim_ladder.json'), JSON.stringify(out, null, 1) + '\n');

// 사람이 읽는 표
const pct = (x) => (x * 100).toFixed(1) + '%';
const cell = (n, rows) => out.cells.find((c) => c.n === n && c.rows === rows);
console.log(`사다리 치우침 (가로줄 확률 1/${LADDER.k + 1}, ${quick ? '빠른 모드' : '전체'}, ${((Date.now() - t0) / 1000).toFixed(0)}초)`);
console.log('\n[1] 맨 끝 자리에서 출발해 "바로 아래 칸"에 도착한 비율 (사다리만, 아래 칸 안 섞음)');
console.log('인원 | 공평하면 | ' + ROWS.map((r) => `높이 ${r}`).join(' | '));
for (const n of PEOPLE) console.log(`${n}명 | ${pct(1 / n)} | ` + ROWS.map((r) => pct(cell(n, r).edge.stay)).join(' | '));
console.log('\n[2] 가운데 자리에서 출발해 한 칸 이내에 도착한 비율 (사다리만)');
for (const n of PEOPLE) console.log(`${n}명 | 공평하면 ${pct(Math.min(n, 3) / n)} | ` + ROWS.map((r) => pct(cell(n, r).middle.near)).join(' | '));
console.log('\n[3] 균등과의 차이 tv (맨 끝 출발, 사다리만)  /  아래 칸을 섞었을 때  /  우연 수준');
for (const n of PEOPLE) console.log(`${n}명 | ` + ROWS.map((r) => { const c = cell(n, r); return `${c.edge.tv.toFixed(3)} / ${c.mixed ? c.mixed.tv.toFixed(3) : '-'} / ${c.noise.toFixed(3)}`; }).join(' | '));
console.log('\n[4] 8명, 맨 왼쪽(1번) 출발 → 도착 칸 1~8번 비율');
for (const r of [LADDER.rowsFew, LADDER.rowsNormal, LADDER.rowsMany, 100]) {
  const c = cell(8, r);
  console.log(`높이 ${r} (틈마다 가로줄 평균 ${c.rungsPerGap}개): 사다리만 ${c.edgeDist.map(pct).join(' ')}` + (c.mixedDist ? `  |  섞으면 ${c.mixedDist.map(pct).join(' ')}` : ''));
}
