// 뽑기 로직 (DOM을 모르는 파일). 모든 함수는 난수기(rng.below)를 받아 쓴다.
// 같은 씨앗의 난수기를 넣으면 같은 결과가 나온다. 난수를 쓰는 순서는 바꾸지 않는다(공유 링크가 같은 결과를 다시 보여 줘야 한다).
// 결과를 한쪽으로 기울이는 인자(특정 항목이 나오게 하기)는 없다. 앞으로도 넣지 않는다.

export const LIMITS = {
  wheelSmooth: 500,   // 돌림판: 이 수까지는 버벅임 없이 그린다(테스트·화면 확인 기준)
  items: 5000,        // 명단 한도
  nameLength: 100,    // 이름 한 줄 글자 수 한도
  ladderMin: 2,
  ladderMax: 30,
  numbersCount: 10000,
  diceCount: 100,
  diceSides: 1000,
  coinCount: 1000,
  coinList: 300,      // 동전: 이 횟수까지는 던진 순서를 하나하나 보여 준다(넘으면 합계만)
};

function int(v, lo, hi, name) {
  if (!Number.isSafeInteger(v) || v < lo || v > hi) throw new RangeError(name);
  return v;
}

// ---------- 섞기·뽑기 ----------

/** 0..n-1 을 섞은 배열(Fisher–Yates). 모든 순서가 같은 확률. */
export function shuffledIndices(n, rng) {
  int(n, 0, 0xffffffff, 'n');
  const a = new Array(n);
  for (let i = 0; i < n; i++) a[i] = i;
  for (let i = n - 1; i > 0; i--) {
    const j = rng.below(i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/** 배열을 섞은 새 배열(원본은 그대로). */
export function shuffle(list, rng) {
  return shuffledIndices(list.length, rng).map((i) => list[i]);
}

/** n개 중 m개를 중복 없이 뽑는다. 뽑힌 순서대로 번호(0부터)를 돌려준다. */
export function pickSome(n, m, rng) {
  int(n, 1, 0xffffffff, 'n');
  int(m, 0, n, 'm');
  const a = new Array(n);
  for (let i = 0; i < n; i++) a[i] = i;
  for (let i = 0; i < m; i++) {
    const j = i + rng.below(n - i);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  a.length = m;
  return a;
}

/**
 * 쪽지 나눠 주기: 쪽지 종류와 장수(예: 당첨 2장, 꽝 6장)를 사람 수만큼 만들어 섞는다.
 * @param {number} n 사람 수
 * @param {{label:string,count:number}[]} slips 장수의 합이 n이어야 한다
 * @returns {number[]} 사람마다 받은 쪽지 종류 번호(slips의 자리)
 */
export function dealSlips(n, slips, rng) {
  int(n, 1, LIMITS.items, 'n');
  const pile = [];
  slips.forEach((s, k) => {
    int(s.count, 0, n, 'count');
    for (let i = 0; i < s.count; i++) pile.push(k);
  });
  if (pile.length !== n) throw new RangeError('slips');
  return shuffle(pile, rng);
}

// ---------- 팀 나누기 ----------

/** 팀 크기만 계산: 인원 차이는 최대 1. size(한 팀 최대 인원)를 주면 팀 수 = 올림(n / size). */
export function teamSizes(n, opt) {
  int(n, 1, LIMITS.items, 'n');
  let teams;
  if (opt && opt.teams != null) teams = int(opt.teams, 1, n, 'teams');
  else if (opt && opt.size != null) teams = Math.ceil(n / int(opt.size, 1, n, 'size'));
  else throw new RangeError('teams');
  const base = Math.floor(n / teams);
  const extra = n - base * teams;
  const sizes = [];
  for (let t = 0; t < teams; t++) sizes.push(base + (t < extra ? 1 : 0));
  return sizes;
}

/** n명을 섞어서 팀으로 나눈다. 팀마다 사람 번호(0부터) 배열. */
export function splitTeams(n, opt, rng) {
  const sizes = teamSizes(n, opt);
  const order = shuffledIndices(n, rng);
  const out = [];
  let p = 0;
  for (const size of sizes) {
    out.push(order.slice(p, p + size));
    p += size;
  }
  return out;
}

// ---------- 숫자·동전·주사위 ----------

/**
 * 랜덤 숫자. min~max(둘 다 포함)에서 count개.
 * unique면 중복 없이(범위보다 많이 달라고 하면 오류), sort: 'asc' | 'desc' | 없음(뽑힌 순서).
 */
export function randomNumbers(opt, rng) {
  const min = opt.min;
  const max = opt.max;
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) throw new RangeError('range');
  if (min > max) throw new RangeError('range-order');
  const span = max - min + 1;
  if (!Number.isSafeInteger(span) || span > 9007199254740992) throw new RangeError('range-too-wide');
  const count = int(opt.count == null ? 1 : opt.count, 1, LIMITS.numbersCount, 'count');
  let out;
  if (opt.unique) {
    if (count > span) throw new RangeError('unique-too-many');
    // Floyd의 방법으로 중복 없는 count개를 고른 뒤(어떤 조합이든 같은 확률) 순서를 섞는다
    const seen = new Set();
    for (let j = span - count; j < span; j++) {
      const t = rng.below(j + 1);
      seen.add(seen.has(t) ? j : t);
    }
    out = shuffle([...seen], rng).map((v) => v + min);
  } else {
    out = [];
    for (let i = 0; i < count; i++) out.push(min + rng.below(span));
  }
  if (opt.sort === 'asc') out.sort((a, b) => a - b);
  else if (opt.sort === 'desc') out.sort((a, b) => b - a);
  return out;
}

/** 동전 count번: 0 = 앞, 1 = 뒤 */
export function flipCoins(count, rng) {
  int(count, 1, LIMITS.coinCount, 'count');
  const out = [];
  for (let i = 0; i < count; i++) out.push(rng.below(2));
  return out;
}

/** 주사위 count개(sides면체): 1..sides */
export function rollDice(count, sides, rng) {
  int(count, 1, LIMITS.diceCount, 'count');
  int(sides, 2, LIMITS.diceSides, 'sides');
  const out = [];
  for (let i = 0; i < count; i++) out.push(1 + rng.below(sides));
  return out;
}

// ---------- 명단의 순서에 기대지 않는 뽑기 ----------
// 돌림판·제비뽑기·팀 나누기는 '넣은 순서'가 아니라 '정해진 자리'를 기준으로 뽑는다:
// 명단을 유니코드 코드 포인트 순으로 놓았을 때의 자리(같은 이름끼리는 넣은 순서). 씨앗이 고르는 것은 이 자리 번호다.
// 그래서 씨앗과 사람들이 같으면, 명단을 어떤 순서로 적었든 같은 사람이 같은 결과를 받는다
// (결과 링크 속 명단의 순서만 바꿔서 다른 사람이 뽑힌 것처럼 꾸밀 수 없다).
// 사다리는 '누가 몇 번째 줄에 서는가'가 결과의 일부라서 여기에 들지 않는다(순서까지 같아야 같은 결과).
// legacy = 옛 링크(형식 1): 넣은 순서를 그대로 자리로 썼다. 옛 링크를 옛 방식 그대로 다시 보여 줄 때만 쓴다.

/** 두 글자열을 유니코드 코드 포인트 순으로 견준다(음수·0·양수). 파이썬 sorted()와 같은 순서. */
export function compareCodePoints(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    let x = a.charCodeAt(i);
    let y = b.charCodeAt(i);
    if (x === y) continue;
    // UTF-16에서는 U+10000 이상의 글자(대리 문자 U+D800~DFFF 두 개)가 U+E000~FFFF보다 앞에 온다. 코드 포인트 순이 되게 자리를 바꿔 견준다.
    if (x >= 0xd800) x += x >= 0xe000 ? -0x800 : 0x2000;
    if (y >= 0xd800) y += y >= 0xe000 ? -0x800 : 0x2000;
    return x - y;
  }
  return a.length - b.length;
}

/** 정해진 자리: order[k] = 코드 포인트 순으로 k번째인 이름의 원래 번호. 같은 이름끼리는 넣은 순서대로(안정 정렬). */
export function canonicalOrder(items) {
  const order = items.map((_, i) => i);
  order.sort((i, j) => compareCodePoints(items[i], items[j]) || i - j);
  return order;
}

function seats(items, legacy) {
  int(items.length, 1, LIMITS.items, 'n');
  return legacy ? items.map((_, i) => i) : canonicalOrder(items);
}

/** 돌림판 한 번: { index = 뽑힌 이름의 원래 번호(판에서 그 칸), frac, turns }. 명단의 순서를 바꿔도 같은 이름이 뽑힌다. */
export function wheelDraw(items, rng, legacy = false) {
  const seat = seats(items, legacy);
  const p = wheelPick(items.length, rng);
  return { index: seat[p.index], frac: p.frac, turns: p.turns };
}

/** 명단에서 m명(중복 없이). 뽑힌 순서대로 원래 번호. */
export function drawSome(items, m, rng, legacy = false) {
  const seat = seats(items, legacy);
  return pickSome(items.length, m, rng).map((k) => seat[k]);
}

/** 명단 전체의 순서 정하기. 차례대로 원래 번호. */
export function drawOrder(items, rng, legacy = false) {
  const seat = seats(items, legacy);
  return shuffledIndices(items.length, rng).map((k) => seat[k]);
}

/** 쪽지 나눠 주기. 원래 번호마다 받은 쪽지 종류(slips의 자리). */
export function drawSlips(items, slips, rng, legacy = false) {
  const seat = seats(items, legacy);
  const dealt = dealSlips(items.length, slips, rng);
  const out = new Array(items.length);
  seat.forEach((orig, k) => { out[orig] = dealt[k]; });
  return out;
}

/** 팀 나누기. 팀마다 원래 번호 배열. */
export function drawTeams(items, opt, rng, legacy = false) {
  const seat = seats(items, legacy);
  return splitTeams(items.length, opt, rng).map((team) => team.map((k) => seat[k]));
}

// ---------- 돌림판 ----------
// 결과를 먼저 정하고, 그 칸에 멈추는 각도를 계산한다. 멈춘 위치로 결과를 읽지 않는다.
// 약속: 칸 i는 판 위에서 시계 방향으로 [i, i+1) × (한 바퀴 / n) 를 차지한다(판의 0도 = 3시 방향, 캔버스와 같다).
//       판을 rotation(라디안, 시계 방향이 +)만큼 돌려 그린다. 바늘은 화면의 pointer 각도(기본 12시 = -π/2)에 고정.

const TAU = Math.PI * 2;
export const WHEEL = { fracMin: 10, fracMax: 90, turnsMin: 5, turnsMax: 7 };

/**
 * 돌림판 한 번. index = 뽑힌 칸, frac = 그 칸 안에서 바늘이 멈출 자리(0.10~0.90, 금 위에 서지 않게),
 * turns = 멈추기 전에 도는 바퀴 수(보여 주기용). 셋 다 같은 씨앗에서 나오므로 다시 보기에서도 똑같이 멈춘다.
 */
export function wheelPick(n, rng) {
  int(n, 1, LIMITS.items, 'n');
  const index = rng.below(n);
  const frac = (WHEEL.fracMin + rng.below(WHEEL.fracMax - WHEEL.fracMin + 1)) / 100;
  const turns = WHEEL.turnsMin + rng.below(WHEEL.turnsMax - WHEEL.turnsMin + 1);
  return { index, frac, turns };
}

/** 칸 index의 frac 자리가 바늘 아래에 오는 회전 각도 중, from에서 turns바퀴 이상 더 돈 첫 각도. */
export function wheelRotation({ n, index, frac = 0.5, from = 0, turns = 0, pointer = -Math.PI / 2 }) {
  int(n, 1, LIMITS.items, 'n');
  int(index, 0, n - 1, 'index');
  if (!(frac > 0 && frac < 1)) throw new RangeError('frac');
  const target = pointer - ((index + frac) / n) * TAU; // 이 각도(와 한 바퀴씩 더한 값)에서 그 자리가 바늘 아래
  const least = from + turns * TAU;
  const k = Math.ceil((least - target) / TAU);
  return target + k * TAU;
}

/** 판이 rotation만큼 돌아가 있을 때 바늘 아래에 있는 칸. 확인·딸깍 소리용(결과를 정하는 데 쓰지 않는다). */
export function wheelIndexAt(n, rotation, pointer = -Math.PI / 2) {
  int(n, 1, LIMITS.items, 'n');
  let a = (pointer - rotation) % TAU;
  if (a < 0) a += TAU;
  const i = Math.floor((a / TAU) * n);
  return i >= n ? n - 1 : i;
}

// ---------- 돌림판 그리기에 쓰는 계산(화면 코드가 가져다 쓴다) ----------

/** 칸 색을 몇 가지로 돌려 쓸지. 맨 끝 칸과 첫 칸이 같은 색으로 만나지 않게 고른다(이웃한 칸은 늘 다른 색). */
export function sliceColorCount(n, max = 8) {
  for (let m = max; m >= 3; m--) if (n <= m || n % m !== 1) return m;
  return 3;
}

/** 화면에서 그 각도(라디안, 3시 = 0, 시계 방향 +)에 있는 이름이 뒤집혀 보이는지: 판의 왼쪽 절반이면 뒤집어서 쓴다. */
export function labelFlipped(screenAngle) {
  return Math.cos(screenAngle) < -1e-9;
}

/** 이름 글자 크기(px): 판 반지름 r, 칸 수 n. 8보다 작으면 이름을 쓰지 않는다. */
export function labelSize(r, n) {
  const chord = 2 * r * 0.66 * Math.sin(Math.PI / n);
  return Math.min(r * 0.1, chord * 0.56);
}

// ---------- 좁은 칸에 이름 맞추기(돌림판 칸, 사다리 이름표) ----------

/** 명단의 이름들이 앞에서부터 몇 글자(코드 포인트)까지 같은지. 이름이 하나뿐이거나 전부 같은 이름이면 0. */
export function commonPrefixLength(items) {
  if (!items || items.length < 2) return 0;
  const first = Array.from(items[0]);
  let len = first.length;
  let differ = false;
  for (let i = 1; i < items.length && len > 0; i++) {
    const cur = Array.from(items[i]);
    let k = 0;
    while (k < len && k < cur.length && cur[k] === first[k]) k++;
    if (k < len || cur.length !== first.length) differ = true;
    len = k;
  }
  return differ ? len : 0;
}

/**
 * 이름을 폭 maxWidth 안에 맞춘다. measure(글자열) = 기준 글자 크기에서의 폭.
 * ① 들어가면 그대로 ② 글자 크기를 minScale배까지 줄여서 들어가면 줄여서
 * ③ 그래도 넘치면 자른다. 명단의 이름들이 앞부분(prefix글자, 2글자 이상)이 같으면 그 앞을 '…'로 줄이고
 *    서로 다른 뒤쪽을 살린다("3학년 1반 김민준" → "…김민준"). 아니면 뒤를 자른다("Supercalifr…").
 * @returns {{text:string, scale:number}}
 */
export function fitLabel(text, maxWidth, measure, opt = {}) {
  const minScale = opt.minScale == null ? 0.72 : opt.minScale;
  const prefix = opt.prefix || 0;
  const w = measure(text);
  if (w <= maxWidth) return { text, scale: 1 };
  if (w * minScale <= maxWidth) return { text, scale: maxWidth / w };
  const room = maxWidth / minScale;
  const ch = Array.from(text);
  if (prefix >= 2 && prefix < ch.length) {
    // 앞을 줄인다: 같은 앞부분을 뺀 나머지가 들어가면 그대로, 아니면 들어가는 만큼의 끝부분
    let from = prefix;
    while (from < ch.length - 1 && measure('…' + ch.slice(from).join('')) > room) from++;
    return { text: '…' + ch.slice(from).join('').replace(/^\s+/, ''), scale: minScale };
  }
  let keep = ch.length - 1;
  while (keep > 1 && measure(ch.slice(0, keep).join('') + '…') > room) keep--;
  return { text: ch.slice(0, keep).join('').replace(/\s+$/, '') + '…', scale: minScale };
}
