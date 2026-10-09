// 사다리타기 (DOM을 모르는 파일)
//
// 모양: 세로줄 n개(2~30), 가로줄 자리는 높이 rows칸. rungs[r][c] = 1 이면 r번째 높이에 세로줄 c와 c+1을 잇는 가로줄.
// 같은 높이에서 이웃한 두 가로줄(c와 c+1)은 함께 놓이지 않는다(한 세로줄의 같은 높이에 가로줄 두 개가 닿지 않게).
// 그래서 어느 출발 자리든 길은 하나뿐이고, 출발 → 도착은 늘 일대일 대응(순열)이다.
//
// 가로줄 놓는 법(높이마다 왼쪽부터): 맨 왼쪽 틈은 1/(k+1) 확률, 그다음부터는 바로 왼쪽 틈이 비었을 때만 1/k 확률.
// 이렇게 하면 모든 틈에 가로줄이 놓일 확률이 1/(k+1)로 같다(왼쪽·오른쪽이 대칭). 기본 k = 2.
//
// 공평함: 사다리만으로는 출발 자리 가까이에 도착하기 쉽다(가로줄이 적을수록, 사람이 많을수록).
// 그래서 playLadder는 **아래 칸(결과)을 먼저 무작위로 섞고** 사다리를 만든다. 그러면 누가 어느 결과를 받는지는
// 사다리 모양과 상관없이 모든 경우가 같은 확률이 된다. 숫자는 _dev/sim_ladder.mjs.

import { LIMITS, shuffledIndices } from './pick.js';

export const LADDER = { k: 2, rowsFew: 8, rowsNormal: 14, rowsMany: 24, rowsMax: 400 };

function check(n, rows) {
  if (!Number.isSafeInteger(n) || n < LIMITS.ladderMin || n > LIMITS.ladderMax) throw new RangeError('ladder-n');
  if (!Number.isSafeInteger(rows) || rows < 1 || rows > LADDER.rowsMax) throw new RangeError('ladder-rows');
}

/**
 * 사다리 만들기.
 * @param {number} n 세로줄 수(2~30)
 * @param {number} rows 가로줄 자리 높이 수
 * @param {{below:(n:number)=>number}} rng
 * @param {{k?:number, ensure?:boolean}} [opt] ensure(기본 켬): 가로줄이 하나도 없는 틈에 하나를 넣는다
 * @returns {{n:number, rows:number, rungs:Uint8Array[]}}
 */
export function makeLadder(n, rows, rng, opt = {}) {
  check(n, rows);
  const k = opt.k == null ? LADDER.k : opt.k;
  if (!Number.isSafeInteger(k) || k < 1 || k > 64) throw new RangeError('ladder-k');
  const gaps = n - 1;
  const rungs = [];
  for (let r = 0; r < rows; r++) {
    const row = new Uint8Array(gaps);
    let prev = 0;
    for (let c = 0; c < gaps; c++) {
      let on = 0;
      if (c === 0) on = rng.below(k + 1) === 0 ? 1 : 0;
      else if (!prev) on = rng.below(k) === 0 ? 1 : 0;
      row[c] = on;
      prev = on;
    }
    rungs.push(row);
  }
  if (opt.ensure !== false) {
    // 가로줄이 하나도 없는 틈에 하나를 넣는다. 높이가 3칸 이상이면 늘 넣을 수 있다.
    const count = new Array(gaps).fill(0);
    for (let r = 0; r < rows; r++) for (let c = 0; c < gaps; c++) count[c] += rungs[r][c];
    for (let c = 0; c < gaps; c++) {
      if (count[c]) continue;
      const start = rng.below(rows);
      let placed = false;
      // ① 양옆 틈이 비어 있는 높이
      for (let d = 0; d < rows && !placed; d++) {
        const r = (start + d) % rows;
        if (!(c > 0 && rungs[r][c - 1]) && !(c < gaps - 1 && rungs[r][c + 1])) { rungs[r][c] = 1; placed = true; }
      }
      // ② 없으면, 옆 가로줄을 치워도 그 틈에 가로줄이 남는 높이에서 옆 것을 치우고 넣는다
      for (let d = 0; d < rows && !placed; d++) {
        const r = (start + d) % rows;
        const left = c > 0 && rungs[r][c - 1] === 1;
        const right = c < gaps - 1 && rungs[r][c + 1] === 1;
        if ((left && count[c - 1] < 2) || (right && count[c + 1] < 2)) continue;
        if (left) { rungs[r][c - 1] = 0; count[c - 1]--; }
        if (right) { rungs[r][c + 1] = 0; count[c + 1]--; }
        rungs[r][c] = 1;
        placed = true;
      }
      if (placed) count[c] = 1;
    }
  }
  return { n, rows, rungs };
}

/** 사다리가 규칙에 맞는지(크기, 0/1, 같은 높이에 이웃한 가로줄 없음). */
export function isValidLadder(ladder) {
  if (!ladder || !Array.isArray(ladder.rungs) || ladder.rungs.length !== ladder.rows) return false;
  for (const row of ladder.rungs) {
    if (row.length !== ladder.n - 1) return false;
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== 0 && row[c] !== 1) return false;
      if (c > 0 && row[c] && row[c - 1]) return false;
    }
  }
  return true;
}

/**
 * 한 사람의 길. 점 [세로줄, 높이]의 목록: 높이 0 = 맨 위, r번째 가로줄 높이 = r + 1, 맨 아래 = rows + 1.
 * 화면은 이 점들을 이어 그리면 된다(결과는 마지막 점의 세로줄).
 */
export function tracePath(ladder, start) {
  const { n, rows, rungs } = ladder;
  if (!Number.isSafeInteger(start) || start < 0 || start >= n) throw new RangeError('ladder-start');
  let col = start;
  const pts = [[col, 0]];
  for (let r = 0; r < rows; r++) {
    const row = rungs[r];
    let next = col;
    if (col < n - 1 && row[col]) next = col + 1;
    else if (col > 0 && row[col - 1]) next = col - 1;
    if (next !== col) {
      pts.push([col, r + 1], [next, r + 1]);
      col = next;
    }
  }
  pts.push([col, rows + 1]);
  return pts;
}

/** 출발 자리마다 도착 자리: end[start]. 늘 순열이다. (tracePath와 같은 걸음, 길을 남기지 않아 빠르다) */
export function ladderEnds(ladder) {
  const { n, rows, rungs } = ladder;
  const end = new Array(n);
  for (let s = 0; s < n; s++) {
    let col = s;
    for (let r = 0; r < rows; r++) {
      const row = rungs[r];
      if (col < n - 1 && row[col]) col++;
      else if (col > 0 && row[col - 1]) col--;
    }
    end[s] = col;
  }
  return end;
}

/**
 * 사다리타기 한 판.
 * 난수를 쓰는 순서(바꾸지 않는다): ① 아래 칸 섞기 ② 사다리 만들기.
 * @param {number} n 사람 수 = 아래 칸 수
 * @param {{rows?:number, k?:number, shuffleBottom?:boolean}} opt shuffleBottom을 끄는 건 시뮬레이션·테스트용
 * @returns {{ladder, bottom:number[], ends:number[], result:number[]}}
 *   bottom[자리] = 그 자리에 놓인 결과 번호, ends[출발] = 도착 자리, result[사람] = 받은 결과 번호
 */
export function playLadder(n, opt, rng) {
  const rows = opt && opt.rows != null ? opt.rows : LADDER.rowsNormal;
  check(n, rows);
  const bottom = opt && opt.shuffleBottom === false ? Array.from({ length: n }, (_, i) => i) : shuffledIndices(n, rng);
  const ladder = makeLadder(n, rows, rng, { k: opt && opt.k });
  const ends = ladderEnds(ladder);
  const result = ends.map((pos) => bottom[pos]);
  return { ladder, bottom, ends, result };
}
