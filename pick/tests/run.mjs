// 핵심 로직 테스트: node pick/tests/run.mjs   (외부 패키지 없음. 기준값은 tests/fixtures.json = gen_fixtures.py)
// 씨앗을 고정해 돌리므로 결과는 늘 같다(가끔 실패하는 테스트가 아니다).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeRng, below, newSeed, cryptoSource, seedToText, seedFromText, bytesToB64u, b64uToBytes, SEED_BYTES } from '../assets/core/rng.js';
import { LIMITS, WHEEL, shuffledIndices, shuffle, pickSome, dealSlips, teamSizes, splitTeams, randomNumbers, flipCoins, rollDice, wheelPick, wheelRotation, wheelIndexAt, sliceColorCount, labelFlipped, labelSize,
  compareCodePoints, canonicalOrder, wheelDraw, drawSome, drawOrder, drawSlips, drawTeams, commonPrefixLength, fitLabel } from '../assets/core/pick.js';
import { LADDER, makeLadder, isValidLadder, tracePath, ladderEnds, playLadder } from '../assets/core/ladder.js';
import { parseList, cleanName, uniqueItems, firstColumn, encodeShare, decodeShare, shareLength, TOOLS, MAX_HASH, SHARE_VERSION } from '../assets/core/share.js';
import { readInteger } from '../assets/core/input.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FX = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures.json'), 'utf8'));
const CRIT = FX.chi2_999;

let passed = 0;
let failed = 0;
let group = '';
const fails = [];
function section(name) { group = name; }
function ok(cond, name) {
  if (cond) passed++;
  else { failed++; fails.push(`${group}: ${name}`); }
}
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), `${name}  (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }
function throws(fn, name) { let t = false; try { fn(); } catch (e) { t = true; } ok(t, name + ' should throw'); }

const hex = (h) => Uint8Array.from(h.match(/../g) || [], (b) => parseInt(b, 16));
const seedOf = (label) => { // 테스트용 고정 씨앗(라벨마다 다른 32바이트)
  const s = new Uint8Array(SEED_BYTES);
  for (let i = 0; i < 32; i++) s[i] = (label.charCodeAt(i % label.length) * 31 + i * 17 + label.length) & 255;
  s[0] |= 1;
  return s;
};
const u64 = ([hi, lo]) => (BigInt(hi) << 32n) | BigInt(lo);

/** 카이제곱 통계량. 기대 도수가 5보다 작은 칸은 한 칸으로 모은다. [통계량, 자유도] */
function chi2(obs, exp) {
  let stat = 0;
  let cells = 0;
  let po = 0;
  let pe = 0;
  for (let i = 0; i < obs.length; i++) {
    if (exp[i] < 5) { po += obs[i]; pe += exp[i]; continue; }
    stat += (obs[i] - exp[i]) ** 2 / exp[i];
    cells++;
  }
  if (pe > 0) { stat += (po - pe) ** 2 / pe; cells++; }
  return [stat, cells - 1];
}
function uniformOk(obs, name) {
  const total = obs.reduce((a, b) => a + b, 0);
  const [stat, df] = chi2(obs, obs.map(() => total / obs.length));
  const crit = CRIT[String(df)];
  if (crit == null) throw new Error('임계값 없음: df ' + df);
  ok(stat < crit, `${name}: 카이제곱 ${stat.toFixed(1)} < ${crit.toFixed(1)} (자유도 ${df})`);
  return stat;
}
const N = 100000;
const GOLD = JSON.parse(fs.readFileSync(path.join(HERE, 'golden.json'), 'utf8'));

// ---------------------------------------------------------------- 난수기 기준 벡터
section('난수기 기준 벡터');
for (const v of FX.xoshiro) {
  const r = makeRng(hex(v.seed_hex));
  const got = [];
  const at = {};
  for (let i = 1; i <= 100000; i++) {
    const x = u64(r.u64());
    if (i <= v.first.length) got.push(x.toString());
    if (v.at[String(i)] !== undefined) at[String(i)] = x.toString();
    if (i >= v.first.length && Object.keys(v.at).length === 0) break;
  }
  eq(got, v.first, `${v.name}: 처음 ${v.first.length}개`);
  eq(at, v.at, `${v.name}: 1000·65536·100000번째`);
}
{
  // 공개 기준 벡터를 BigInt로 직접 대조(값이 2^53을 넘어 Number로는 견줄 수 없다).
  // 출처: rust-random/rngs 의 rand_xoshiro/src/xoshiro256starstar.rs, 테스트 reference() (참조 C 구현으로 만든 값이라고 적혀 있다).
  // 씨앗 32바이트 = 1,0,0,0,0,0,0,0, 2,0,…, 3,0,…, 4,0,… (낮은 자리 먼저라 상태 s = [1, 2, 3, 4])
  const REFERENCE = [11520n, 0n, 1509978240n, 1215971899390074240n, 1216172134540287360n, 607988272756665600n,
    16172922978634559625n, 8476171486693032832n, 10595114339597558777n, 2904607092377533576n];
  const seed = new Uint8Array(32);
  seed[0] = 1; seed[8] = 2; seed[16] = 3; seed[24] = 4;
  const r = makeRng(seed);
  const got = REFERENCE.map(() => u64(r.u64()));
  ok(got.every((v, i) => v === REFERENCE[i]), `공개 기준 벡터 10개(BigInt): ${got.join(', ')}`);
  ok(REFERENCE[6] > BigInt(Number.MAX_SAFE_INTEGER), '기준 벡터에는 2^53을 넘는 값이 있다(그래서 BigInt로 견준다)');
  ok(11520n === ((2n * 5n) << 7n) * 9n, '손계산: 상태 [1,2,3,4]의 첫 출력 = rotl(2×5, 7)×9 = 11520');
}
{
  // u32는 64비트 출력의 위쪽 절반이다
  const a = makeRng(hex(FX.xoshiro[1].seed_hex));
  const b = makeRng(hex(FX.xoshiro[1].seed_hex));
  let same = true;
  for (let i = 0; i < 1000; i++) if (a.u32() !== b.u64()[0]) same = false;
  ok(same, 'u32 = u64의 위쪽 32비트');
  throws(() => makeRng(new Uint8Array(32)), '전부 0인 씨앗');
  throws(() => makeRng(new Uint8Array(31).fill(1)), '길이가 다른 씨앗');
}

// ---------------------------------------------------------------- 씨앗
section('씨앗');
{
  const a = newSeed();
  const b = newSeed();
  ok(a instanceof Uint8Array && a.length === 32, '새 씨앗은 32바이트');
  ok(seedToText(a) !== seedToText(b), '새 씨앗은 매번 다르다');
  ok(/^[A-Za-z0-9_-]{43}$/.test(seedToText(a)), '씨앗 글자는 base64url 43자');
  eq([...seedFromText(seedToText(a))], [...a], '씨앗 글자 왕복');
  throws(() => seedFromText('abc'), '짧은 씨앗 글자');
  throws(() => seedFromText('A'.repeat(43)), '전부 0인 씨앗 글자');
  throws(() => seedFromText(seedToText(a).slice(0, 42) + '*'), '없는 글자');
  // 마지막 글자의 남는 2비트가 0이 아닌 표기는 거절(같은 씨앗을 가리키는 다른 글자가 없게)
  const t = seedToText(seedOf('canon'));
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  ok(abc.indexOf(t[42]) % 4 === 0, '씨앗 글자의 마지막 글자는 남는 비트가 0');
  throws(() => seedFromText(t.slice(0, 42) + abc[abc.indexOf(t[42]) + 1]), '남는 비트가 0이 아닌 씨앗 글자');
  const c = cryptoSource();
  const seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(c.below(6));
  eq([...seen].sort(), [0, 1, 2, 3, 4, 5], 'cryptoSource.below(6)은 0~5만');
}

// ---------------------------------------------------------------- base64url
section('base64url');
for (const c of FX.base64) {
  const b = hex(c.hex);
  ok(bytesToB64u(b) === c.b64u, `인코딩 ${b.length}바이트 = 파이썬 base64`);
  eq([...b64uToBytes(c.b64u)], [...b], `디코딩 ${b.length}바이트`);
}
throws(() => b64uToBytes('A'), '길이 4n+1');
throws(() => b64uToBytes('ab+/'), '표준 base64 글자(+ /)는 받지 않는다');
throws(() => b64uToBytes('ab=='), '채움 글자는 받지 않는다');
throws(() => b64uToBytes('한글'), '아스키가 아닌 글자');

// ---------------------------------------------------------------- 거절 표본
section('거절 표본 경계');
{
  // 정해 둔 32비트 값을 차례로 내는 가짜 원천
  const script = (vals) => { let i = 0; const s = { used: () => i, u32: () => { if (i >= vals.length) throw new Error('원천 소진'); return vals[i++] >>> 0; }, u64: () => { const hi = s.u32(); return [hi, s.u32()]; } }; return s; };
  const top = (v, bits) => (v * 2 ** (32 - bits)) >>> 0; // 위쪽 bits 비트가 v인 32비트 값

  // n = 5: 3비트를 뽑는다. 5, 6, 7은 버린다
  let s = script([top(7, 3), top(5, 3), top(6, 3), top(4, 3)]);
  eq(below(s, 5), 4, 'n=5: 7,5,6을 버리고 4');
  eq(s.used(), 4, 'n=5: 네 번 뽑음');
  s = script([top(0, 3) | 0x1fffffff]);
  eq(below(s, 5), 0, 'n=5: 아래쪽 비트는 보지 않는다');
  // n = 1: 난수를 쓰지 않는다
  s = script([]);
  eq(below(s, 1), 0, 'n=1 → 0');
  eq(s.used(), 0, 'n=1: 난수를 쓰지 않음');
  // 2의 거듭제곱: 버리는 값이 없다
  s = script([0xffffffff, 0x00000000, 0x80000000]);
  eq([below(s, 8), below(s, 8), below(s, 8)], [7, 0, 4], 'n=8: 버림 없음');
  eq(s.used(), 3, 'n=8: 세 번에 셋');
  // 2의 거듭제곱 + 1: 거의 절반을 버린다
  s = script([top(9, 4), top(15, 4), top(8, 4)]);
  eq(below(s, 9), 8, 'n=9: 9,15를 버리고 8(가장 큰 값)');
  // 32비트 경계
  s = script([0xffffffff]);
  eq(below(s, 4294967296), 4294967295, 'n=2^32: 가장 큰 값');
  s = script([0xffffffff, 0xfffffffe]);
  eq(below(s, 4294967295), 4294967294, 'n=2^32-1: 0xffffffff는 버림');
  s = script([0x80000000, 0x7fffffff]);
  eq(below(s, 2147483649), 2147483648, 'n=2^31+1: 가장 큰 값 받기');
  s = script([0x80000001, 0x00000005]);
  eq(below(s, 2147483649), 5, 'n=2^31+1: 범위 밖은 버림');
  // 2^32 넘는 범위: 64비트 출력의 위쪽 비트
  s = script([0x00000001, 0xffffffff]); // 위 33비트 = (1 << 1) | 1 = 3
  eq(below(s, 4294967297), 3, 'n=2^32+1: 위쪽 33비트');
  s = script([0xffffffff, 0xffffffff, 0x80000000, 0x00000000]);
  eq(below(s, 4294967297), 4294967296, 'n=2^32+1: 2^33-1은 버리고 2^32');
  s = script([0xffffffff, 0xffffffff]);
  eq(below(s, 9007199254740992), 9007199254740991, 'n=2^53: 가장 큰 값');
  s = script([0xffffffff, 0xffffffff, 0xffffffff, 0xfffff000]); // 위 53비트: 2^53-1(버림), 2^53-2
  eq(below(s, 9007199254740991), 9007199254740990, 'n=2^53-1: 2^53-1은 버림');
  throws(() => below(script([1]), 0), 'n=0');
  throws(() => below(script([1]), -3), 'n<0');
  throws(() => below(script([1]), 2.5), '정수가 아닌 n');
  throws(() => below(script([1]), 2 ** 53 + 2), 'n>2^53');

  // 모든 비트 모양을 한 번씩(큰 값부터) 넣으면 모든 결과가 정확히 한 번씩 나온다(치우침 0의 직접 확인)
  let exact = true;
  for (let n = 2; n <= 256; n++) {
    const bits = Math.ceil(Math.log2(n));
    const vals = [];
    for (let v = 2 ** bits - 1; v >= 0; v--) vals.push(top(v, bits) | (v * 2654435761 >>> bits >>> 0 & (2 ** (32 - bits) - 1)));
    const src = script(vals);
    const count = new Array(n).fill(0);
    for (let i = 0; i < n; i++) count[below(src, n)]++;
    if (count.some((c) => c !== 1) || src.used() !== 2 ** bits) exact = false;
  }
  ok(exact, 'n=2..256: 비트 모양 2^k가지를 한 번씩 넣으면 0..n-1이 정확히 한 번씩, 나머지는 버려진다');
}

// ---------------------------------------------------------------- 균등성 (씨앗 고정, 10만 번)
section('균등성');
for (const n of [2, 3, 5, 6, 7, 10, 30, 37, 100, 500, 1000]) {
  const r = makeRng(seedOf('below' + n));
  const c = new Array(n).fill(0);
  for (let i = 0; i < Math.max(N, n * 200); i++) c[r.below(n)]++;
  uniformOk(c, `below(${n})`);
}
{
  // 2^32 넘는 범위도 고르게: 3 × 2^40 을 세 구간으로
  const r = makeRng(seedOf('big'));
  const c = [0, 0, 0];
  const n = 3 * 2 ** 40;
  for (let i = 0; i < N; i++) c[Math.floor(r.below(n) / 2 ** 40)]++;
  uniformOk(c, 'below(3×2^40) 세 구간');
  // 아래쪽 비트도 고르게
  const lowBits = new Array(8).fill(0);
  for (let i = 0; i < N; i++) lowBits[r.below(n) % 8]++;
  uniformOk(lowBits, 'below(3×2^40) 아래 3비트');
}
{
  // 검정에 힘이 있는지: 나머지(%)로 줄인 치우친 뽑기는 같은 검정에서 떨어져야 한다
  const r = makeRng(seedOf('biased'));
  const c = new Array(6).fill(0);
  for (let i = 0; i < N; i++) c[(r.u32() >>> 28) % 6]++; // 4비트(0~15) % 6 → 0~3이 더 자주
  const [stat, df] = chi2(c, c.map(() => N / 6));
  ok(stat > CRIT[String(df)], `치우친 뽑기(4비트 % 6)는 걸러진다: 카이제곱 ${stat.toFixed(0)}`);
}
{
  // 돌림판: 칸마다 같은 확률, 멈출 자리(frac)와 바퀴 수도 고르게
  // 실제 쓰임 그대로: 뽑을 때마다 새 씨앗 32바이트(여기서는 고정 난수기로 만든다) → 그 씨앗으로 한 번
  for (const n of [2, 8, 30, 500]) {
    const c = new Array(n).fill(0);
    const total = Math.max(N, n * 200);
    const master = makeRng(seedOf('wheel' + n));
    const seed = new Uint8Array(32);
    for (let i = 0; i < total; i++) {
      for (let b = 0; b < 32; b += 4) { const v = master.u32(); seed[b] = v & 255; seed[b + 1] = (v >>> 8) & 255; seed[b + 2] = (v >>> 16) & 255; seed[b + 3] = v >>> 24; }
      c[wheelPick(n, makeRng(seed)).index]++;
    }
    uniformOk(c, `돌림판 ${n}칸(씨앗마다 한 번)`);
  }
  const r = makeRng(seedOf('wheel-frac'));
  const f = new Array(81).fill(0);
  const t = [0, 0, 0];
  for (let i = 0; i < N; i++) { const p = wheelPick(12, r); f[Math.round(p.frac * 100) - 10]++; t[p.turns - 5]++; }
  uniformOk(f, '돌림판 멈출 자리 0.10~0.90');
  uniformOk(t, '돌림판 바퀴 수 5~7');
}
{
  // 섞기: 5명의 120가지 순서가 모두 같은 확률, 자리마다도 같은 확률
  const r = makeRng(seedOf('shuffle'));
  const perms = new Map();
  const pos = Array.from({ length: 25 }, () => 0);
  const total = 120000;
  for (let i = 0; i < total; i++) {
    const p = shuffledIndices(5, r);
    const key = p.join('');
    perms.set(key, (perms.get(key) || 0) + 1);
    p.forEach((v, at) => pos[v * 5 + at]++);
  }
  eq(perms.size, 120, '섞기: 5명의 순서 120가지가 모두 나옴');
  uniformOk([...perms.values()], '섞기: 순서 120가지');
  for (let v = 0; v < 5; v++) uniformOk(pos.slice(v * 5, v * 5 + 5), `섞기: ${v}번이 놓이는 자리`);
}
{
  // 제비뽑기: 30명 중 3명 → 누구나 뽑힐 확률이 같고, 첫 번째로 뽑힐 확률도 같다
  const r = makeRng(seedOf('picksome'));
  const inc = new Array(30).fill(0);
  const first = new Array(30).fill(0);
  for (let i = 0; i < N; i++) { const p = pickSome(30, 3, r); p.forEach((v) => inc[v]++); first[p[0]]++; }
  uniformOk(inc, '30명 중 3명: 뽑힌 횟수');
  uniformOk(first, '30명 중 3명: 첫 번째로 뽑힌 횟수');
  // 10명 중 2명: 45가지 짝이 모두 같은 확률
  const pairs = new Array(100).fill(0);
  for (let i = 0; i < N; i++) { const [a, b] = pickSome(10, 2, r); pairs[Math.min(a, b) * 10 + Math.max(a, b)]++; }
  const used = pairs.filter((x) => x > 0);
  eq(used.length, 45, '10명 중 2명: 짝 45가지');
  uniformOk(used, '10명 중 2명: 짝 45가지');
}
{
  // 쪽지: 8명에 당첨 2장 → 누구나 당첨 확률 1/4
  const r = makeRng(seedOf('slips'));
  const win = new Array(8).fill(0);
  for (let i = 0; i < N; i++) dealSlips(8, [{ label: '당첨', count: 2 }, { label: '꽝', count: 6 }], r).forEach((k, who) => { if (k === 0) win[who]++; });
  uniformOk(win, '쪽지: 사람마다 당첨 횟수');
  eq(win.reduce((a, b) => a + b, 0), 2 * N, '쪽지: 판마다 당첨은 정확히 2장');
}
{
  // 팀: 7명을 3팀(3,2,2)으로 → 누구나 큰 팀에 들어갈 확률이 같고, 두 사람이 같은 팀일 확률도 짝마다 같다
  const r = makeRng(seedOf('teams'));
  const big = new Array(7).fill(0);
  const together = new Map();
  for (let i = 0; i < N; i++) {
    const teams = splitTeams(7, { teams: 3 }, r);
    teams[0].forEach((p) => big[p]++);
    for (const t of teams) for (const a of t) for (const b of t) if (a < b) together.set(a * 7 + b, (together.get(a * 7 + b) || 0) + 1);
  }
  uniformOk(big, '팀: 3명 팀에 들어간 횟수');
  eq(together.size, 21, '팀: 짝 21가지가 모두 나옴');
  uniformOk([...together.values()], '팀: 같은 팀이 된 짝');
}
{
  const r = makeRng(seedOf('numbers'));
  const c = new Array(45).fill(0);
  for (let i = 0; i < 20000; i++) randomNumbers({ min: 1, max: 45, count: 6, unique: true }, r).forEach((v) => c[v - 1]++);
  uniformOk(c, '숫자: 1~45에서 6개(중복 없음)');
  const firstPos = new Array(45).fill(0);
  for (let i = 0; i < N; i++) firstPos[randomNumbers({ min: 1, max: 45, count: 6, unique: true }, r)[0] - 1]++;
  uniformOk(firstPos, '숫자: 중복 없이 뽑을 때 첫 숫자');
  const d = new Array(21).fill(0);
  for (let i = 0; i < N; i++) d[randomNumbers({ min: -10, max: 10, count: 1 }, r)[0] + 10]++;
  uniformOk(d, '숫자: -10~10');
  // Floyd 방법: 5개 중 3개 → 조합 10가지가 같은 확률
  const combos = new Map();
  for (let i = 0; i < N; i++) { const k = randomNumbers({ min: 0, max: 4, count: 3, unique: true, sort: 'asc' }, r).join(''); combos.set(k, (combos.get(k) || 0) + 1); }
  eq(combos.size, 10, '숫자: 5개 중 3개 조합 10가지');
  uniformOk([...combos.values()], '숫자: 조합 10가지');
  const coin = [0, 0];
  flipCoins(1000, r).forEach((v) => coin[v]++);
  for (let i = 0; i < 99; i++) flipCoins(1000, r).forEach((v) => coin[v]++);
  uniformOk(coin, '동전 10만 번');
  const dice = new Array(6).fill(0);
  for (let i = 0; i < 1000; i++) rollDice(100, 6, r).forEach((v) => dice[v - 1]++);
  uniformOk(dice, '주사위 10만 번');
  const d20 = new Array(20).fill(0);
  for (let i = 0; i < 1000; i++) rollDice(100, 20, r).forEach((v) => d20[v - 1]++);
  uniformOk(d20, '20면 주사위 10만 번');
}

// ---------------------------------------------------------------- 중복 없음·범위
section('중복 없음');
{
  const r = makeRng(seedOf('nodup'));
  let good = true;
  for (let t = 0; t < 3000; t++) {
    const n = 1 + r.below(60);
    const m = r.below(n + 1);
    const p = pickSome(n, m, r);
    if (p.length !== m || new Set(p).size !== m || p.some((v) => v < 0 || v >= n || !Number.isInteger(v))) good = false;
  }
  ok(good, 'pickSome: 3,000번 모두 중복 없음·범위 안');
  good = true;
  for (let t = 0; t < 2000; t++) {
    const n = r.below(80);
    const p = shuffledIndices(n, r);
    if (p.length !== n || new Set(p).size !== n || p.some((v) => v < 0 || v >= n)) good = false;
  }
  ok(good, 'shuffledIndices: 2,000번 모두 순열');
  const names = ['가', '나', '다', '라', '마'];
  const sh = shuffle(names, r);
  eq([...sh].sort(), [...names].sort(), 'shuffle: 같은 원소');
  eq(names, ['가', '나', '다', '라', '마'], 'shuffle: 원본은 그대로');
  eq(pickSome(5, 5, r).slice().sort(), [0, 1, 2, 3, 4], '5명 중 5명 = 전원');
  eq(pickSome(5, 0, r), [], '0명 뽑기');
  throws(() => pickSome(5, 6, r), '5명 중 6명');
  throws(() => pickSome(0, 0, r), '0명에서 뽑기');

  good = true;
  for (let t = 0; t < 2000; t++) {
    const min = r.below(2001) - 1000;
    const span = 1 + r.below(300);
    const count = 1 + r.below(span);
    const v = randomNumbers({ min, max: min + span - 1, count, unique: true }, r);
    if (v.length !== count || new Set(v).size !== count || v.some((x) => x < min || x > min + span - 1 || !Number.isInteger(x))) good = false;
  }
  ok(good, '숫자(중복 없음): 2,000번 모두 중복 없음·범위 안');
  eq(randomNumbers({ min: 3, max: 7, count: 5, unique: true, sort: 'asc' }, r), [3, 4, 5, 6, 7], '범위 전체를 중복 없이 = 전부');
  eq(randomNumbers({ min: 3, max: 7, count: 5, unique: true, sort: 'desc' }, r), [7, 6, 5, 4, 3], '내림차순');
  eq(randomNumbers({ min: 9, max: 9, count: 4 }, r), [9, 9, 9, 9], '범위가 한 숫자');
  throws(() => randomNumbers({ min: 1, max: 5, count: 6, unique: true }, r), '범위보다 많이, 중복 없이');
  throws(() => randomNumbers({ min: 5, max: 1, count: 1 }, r), '최솟값 > 최댓값');
  throws(() => randomNumbers({ min: 0.5, max: 3, count: 1 }, r), '소수 범위');
  throws(() => randomNumbers({ min: -9007199254740991, max: 9007199254740991, count: 1 }, r), '너무 넓은 범위');
  throws(() => randomNumbers({ min: 1, max: 5, count: 0 }, r), '0개');
  throws(() => randomNumbers({ min: 1, max: 5, count: LIMITS.numbersCount + 1 }, r), '개수 한도 넘김');
  const big = randomNumbers({ min: 0, max: 9007199254740990, count: 50, unique: true }, r);
  ok(big.length === 50 && new Set(big).size === 50 && big.every((x) => Number.isSafeInteger(x) && x >= 0), '아주 넓은 범위에서 중복 없이 50개');
  let srt = true;
  const a = randomNumbers({ min: 1, max: 1000, count: 300, sort: 'asc' }, r);
  for (let i = 1; i < a.length; i++) if (a[i - 1] > a[i]) srt = false;
  ok(srt, '정렬(오름차순)');
  ok(flipCoins(50, r).every((v) => v === 0 || v === 1), '동전은 0·1만');
  ok(rollDice(100, 6, r).every((v) => v >= 1 && v <= 6), '주사위는 1~6만');
  throws(() => rollDice(1, 1, r), '1면 주사위');
  throws(() => rollDice(0, 6, r), '주사위 0개');
  throws(() => flipCoins(0, r), '동전 0번');
  const d = dealSlips(6, [{ label: 'A', count: 1 }, { label: 'B', count: 2 }, { label: 'C', count: 3 }], r);
  eq([...d].sort(), [0, 1, 1, 2, 2, 2], '쪽지 장수 그대로');
  throws(() => dealSlips(6, [{ label: 'A', count: 1 }], r), '쪽지 수 ≠ 사람 수');
}

// ---------------------------------------------------------------- 팀 나누기
section('팀 나누기');
{
  const r = makeRng(seedOf('teamsize'));
  let good = true;
  let cover = true;
  for (let n = 1; n <= 80; n++) {
    for (let k = 1; k <= n; k++) {
      const sizes = teamSizes(n, { teams: k });
      if (sizes.length !== k || sizes.reduce((a, b) => a + b, 0) !== n || Math.max(...sizes) - Math.min(...sizes) > 1 || Math.min(...sizes) < 1) good = false;
      const teams = splitTeams(n, { teams: k }, r);
      const all = teams.flat();
      if (teams.length !== k || all.length !== n || new Set(all).size !== n || teams.some((t, i) => t.length !== sizes[i])) cover = false;
    }
    for (let size = 1; size <= n; size++) {
      const sizes = teamSizes(n, { size });
      if (sizes.reduce((a, b) => a + b, 0) !== n || Math.max(...sizes) > size || Math.max(...sizes) - Math.min(...sizes) > 1 || sizes.length !== Math.ceil(n / size)) good = false;
    }
  }
  ok(good, '1~80명 × 모든 팀 수·팀당 인원: 합 = 인원, 크기 차 ≤ 1');
  ok(cover, '1~80명 × 모든 팀 수: 모두가 정확히 한 팀에');
  eq(teamSizes(13, { size: 4 }), [4, 3, 3, 3], '13명, 한 팀 최대 4명 → 4·3·3·3');
  eq(teamSizes(30, { teams: 4 }), [8, 8, 7, 7], '30명 4팀 → 8·8·7·7');
  eq(teamSizes(5, { teams: 5 }), [1, 1, 1, 1, 1], '5명 5팀');
  throws(() => teamSizes(5, { teams: 6 }), '사람보다 많은 팀');
  throws(() => teamSizes(5, { teams: 0 }), '0팀');
  throws(() => teamSizes(5, { size: 0 }), '팀당 0명');
  throws(() => teamSizes(5, {}), '기준 없음');
}

// ---------------------------------------------------------------- 돌림판 각도
section('돌림판 각도');
{
  const TAU = Math.PI * 2;
  let good = true;
  let turnsOk = true;
  let checked = 0;
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 30, 31, 37, 50, 64, 99, 100, 128, 200, 256, 333, 499, 500, 1000, 5000]) {
    for (let index = 0; index < n; index += n > 600 ? 7 : 1) {
      for (const frac of [0.1, 0.37, 0.5, 0.9]) {
        for (const from of [0, 1.234, 123.456, -7.5, 5000.25]) {
          const rot = wheelRotation({ n, index, frac, from, turns: 6 });
          if (wheelIndexAt(n, rot) !== index) good = false;
          if (!(rot >= from + 6 * TAU - 1e-9 && rot < from + 7 * TAU + 1e-9)) turnsOk = false;
          checked++;
        }
      }
    }
  }
  ok(good, `멈출 각도로 돌리면 바늘 아래가 뽑힌 칸이다 (${checked.toLocaleString('en')}가지: 1~5,000칸 × 칸 × 멈출 자리 × 시작 각도)`);
  ok(turnsOk, '시작 각도에서 6바퀴 이상 7바퀴 미만 더 돈다');
  // 바늘이 다른 곳(3시)에 있어도
  good = true;
  for (let i = 0; i < 12; i++) if (wheelIndexAt(12, wheelRotation({ n: 12, index: i, frac: 0.5, pointer: 0 }), 0) !== i) good = false;
  ok(good, '바늘이 3시 방향일 때도 같다');
  // 손으로 따진 값: 4칸이면 칸 0 = 3시~6시, 칸 1 = 6시~9시, 칸 2 = 9시~12시, 칸 3 = 12시~3시.
  // 판을 시계 방향으로 돌리면 왼쪽(9시)에 있던 것이 위(12시 바늘)로 올라온다.
  eq(wheelIndexAt(4, 0.01), 2, '4칸·거의 안 돌림 → 바늘 바로 왼쪽의 칸 2');
  eq(wheelIndexAt(4, -0.01), 3, '4칸·반시계로 조금 → 칸 3');
  eq(wheelIndexAt(4, Math.PI / 4), 2, '4칸·시계 방향 45° → 칸 2');
  eq(wheelIndexAt(4, (3 * Math.PI) / 4), 1, '4칸·시계 방향 135° → 칸 1');
  eq(wheelIndexAt(4, (5 * Math.PI) / 4), 0, '4칸·시계 방향 225° → 칸 0');
  eq(wheelIndexAt(4, -Math.PI / 4), 3, '4칸·반시계 45° → 칸 3');
  eq(wheelIndexAt(4, (-3 * Math.PI) / 4), 0, '4칸·반시계 135° → 칸 0');
  eq(wheelIndexAt(4, Math.PI / 4 + 20 * Math.PI), 2, '여러 바퀴를 더 돌아도 같다');
  // wheelPick 결과가 약속한 범위 안
  const r = makeRng(seedOf('wheelrange'));
  good = true;
  for (let i = 0; i < 20000; i++) {
    const n = 1 + r.below(500);
    const p = wheelPick(n, r);
    if (!(p.index >= 0 && p.index < n && p.frac >= 0.1 && p.frac <= 0.9 && p.turns >= WHEEL.turnsMin && p.turns <= WHEEL.turnsMax)) good = false;
    const rot = wheelRotation({ n, index: p.index, frac: p.frac, from: i * 0.37, turns: p.turns });
    if (wheelIndexAt(n, rot) !== p.index) good = false;
  }
  ok(good, 'wheelPick → wheelRotation → 바늘 아래 칸이 늘 같다(2만 번)');
  eq(wheelPick(1, makeRng(seedOf('one'))).index, 0, '항목이 하나면 그 항목');
  throws(() => wheelPick(0, r), '빈 돌림판');
  throws(() => wheelRotation({ n: 4, index: 4 }), '없는 칸');
  throws(() => wheelRotation({ n: 4, index: 0, frac: 1 }), '금 위(frac 1)');
}

// ---------------------------------------------------------------- 사다리
section('사다리');
{
  const r = makeRng(seedOf('ladder'));
  let valid = true;
  let perm = true;
  let pathOk = true;
  let every = true;
  let count = 0;
  for (let n = 2; n <= 30; n++) {
    for (const rows of [1, 2, 3, LADDER.rowsFew, LADDER.rowsNormal, LADDER.rowsMany, 60]) {
      for (let rep = 0; rep < 12; rep++) {
        const lad = makeLadder(n, rows, r);
        count++;
        if (!isValidLadder(lad)) valid = false;
        const ends = ladderEnds(lad);
        if (new Set(ends).size !== n || ends.some((e) => e < 0 || e >= n)) perm = false;
        // 다른 방법으로 구한 결과: 위에서부터 가로줄마다 두 줄을 맞바꾼다(길을 따라가지 않음)
        const at = Array.from({ length: n }, (_, i) => i); // at[자리] = 그 자리에 있는 사람
        for (let rr = 0; rr < rows; rr++) for (let c = 0; c < n - 1; c++) if (lad.rungs[rr][c]) { const t = at[c]; at[c] = at[c + 1]; at[c + 1] = t; }
        for (let pos = 0; pos < n; pos++) if (ends[at[pos]] !== pos) perm = false;
        // 길: 이어져 있고, 가로로 갈 땐 가로줄이 있고, 가로줄을 지나치지 않는다
        for (let s = 0; s < n; s++) {
          const p = tracePath(lad, s);
          if (p[0][0] !== s || p[0][1] !== 0 || p[p.length - 1][1] !== rows + 1 || p[p.length - 1][0] !== ends[s]) pathOk = false;
          for (let i = 1; i < p.length; i++) {
            const [c0, y0] = p[i - 1];
            const [c1, y1] = p[i];
            if (y0 === y1) { // 가로 이동: 그 높이에 그 틈의 가로줄이 있어야 한다
              if (Math.abs(c0 - c1) !== 1 || y0 < 1 || y0 > rows || !lad.rungs[y0 - 1][Math.min(c0, c1)]) pathOk = false;
              if (i >= 2 && p[i - 2][1] === y0) pathOk = false; // 같은 높이에서 두 번 꺾이지 않는다
            } else { // 세로 이동: 사이 높이에는 이 세로줄에 닿는 가로줄이 없어야 한다
              if (c0 !== c1 || y1 <= y0) pathOk = false;
              for (let y = y0 + 1; y < y1; y++) {
                const row = lad.rungs[y - 1];
                if ((c0 < n - 1 && row[c0]) || (c0 > 0 && row[c0 - 1])) pathOk = false;
              }
              // 세로 이동은 맨 아래에서 끝나거나, 바로 다음에 가로로 꺾인다
              if (y1 !== rows + 1 && !(p[i + 1] && p[i + 1][1] === y1)) pathOk = false;
              // 세로 이동은 맨 위에서 시작하거나, 가로로 온 직후다
              if (y0 !== 0 && !(i >= 2 && p[i - 2][1] === y0)) pathOk = false;
            }
          }
        }
        // 틈마다 가로줄이 하나 이상(자리가 있을 때)
        if (rows >= 3) for (let c = 0; c < n - 1; c++) if (!lad.rungs.some((row) => row[c])) every = false;
      }
    }
  }
  ok(valid, `사다리 ${count.toLocaleString('en')}개: 같은 높이에 이웃한 가로줄 없음`);
  ok(perm, '출발 → 도착은 늘 일대일 대응이고, 가로줄 맞바꾸기로 구한 결과와 같다');
  ok(pathOk, '그린 길이 이어져 있고, 가로줄이 있는 곳에서만 꺾이고, 가로줄을 지나치지 않고, 끝이 결과와 같다');
  ok(every, '높이가 3칸 이상이면 모든 틈에 가로줄이 하나 이상');
  throws(() => makeLadder(1, 8, r), '1명');
  throws(() => makeLadder(31, 8, r), '31명');
  throws(() => makeLadder(4, 0, r), '가로줄 높이 0');
  throws(() => tracePath(makeLadder(4, 8, r), 4), '없는 출발 자리');
  ok(!isValidLadder({ n: 3, rows: 1, rungs: [Uint8Array.from([1, 1])] }), '이웃한 가로줄은 규칙 위반으로 본다');

  // 손으로 그린 사다리: 3줄, 높이 3.  0-1 / 1-2 / 0-1  → 0→2, 1→0... 을 직접 따져 본 값
  const hand = { n: 3, rows: 3, rungs: [Uint8Array.from([1, 0]), Uint8Array.from([0, 1]), Uint8Array.from([1, 0])] };
  eq(ladderEnds(hand), [2, 1, 0], '손으로 따진 사다리 결과');
  eq(tracePath(hand, 0), [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 4]], '손으로 따진 길(0번)');
  eq(tracePath(hand, 1), [[1, 0], [1, 1], [0, 1], [0, 3], [1, 3], [1, 4]], '손으로 따진 길(1번)');

  // 한 판: 결과도 일대일, 아래 칸 섞기 반영
  let gameOk = true;
  for (let n = 2; n <= 30; n++) {
    const g = playLadder(n, { rows: LADDER.rowsNormal }, r);
    if (new Set(g.result).size !== n || new Set(g.bottom).size !== n) gameOk = false;
    for (let s = 0; s < n; s++) if (g.result[s] !== g.bottom[g.ends[s]]) gameOk = false;
  }
  ok(gameOk, '한 판: 사람 → 결과가 일대일이고 그린 길의 끝 칸과 같다');

  // 정확한 분포(파이썬 행렬 계산)와 대조: 가로줄 채우기 없는 사다리, 출발 자리별 도착 자리
  for (const c of FX.ladder) {
    const rr = makeRng(seedOf(`lx${c.n}-${c.rows}-${c.k}`));
    const trials = 60000;
    const counts = Array.from({ length: c.n }, () => new Array(c.n).fill(0));
    for (let t = 0; t < trials; t++) {
      const ends = ladderEnds(makeLadder(c.n, c.rows, rr, { k: c.k, ensure: false }));
      for (let s = 0; s < c.n; s++) counts[s][ends[s]]++;
    }
    let worst = 0;
    let allOk = true;
    for (const s of [0, Math.floor(c.n / 2), c.n - 1]) {
      const [stat, df] = chi2(counts[s], c.p[s].map((p) => p * trials));
      const crit = CRIT[String(df)];
      if (!(stat < crit)) allOk = false;
      worst = Math.max(worst, stat / crit);
    }
    ok(allOk, `정확한 분포와 맞음: ${c.n}명·높이 ${c.rows}·k=${c.k} (임계값 대비 최대 ${(worst * 100).toFixed(0)}%)`);
  }

  // 사다리만으로는 고르지 않다(8명·높이 14, 아래 칸을 안 섞으면 제자리 근처가 훨씬 많다) → 검정에서 떨어져야 한다
  const rb = makeRng(seedOf('ladder-bias'));
  const raw = new Array(8).fill(0);
  const mixed = new Array(8).fill(0);
  for (let t = 0; t < N; t++) {
    raw[playLadder(8, { rows: 14, shuffleBottom: false }, rb).result[0]]++;
    mixed[playLadder(8, { rows: 14 }, rb).result[0]]++;
  }
  const [st] = chi2(raw, raw.map(() => N / 8));
  ok(st > CRIT['7'] * 10, `아래 칸을 안 섞은 사다리는 고르지 않다(1번 자리의 도착 분포, 카이제곱 ${st.toFixed(0)})`);
  uniformOk(mixed, '아래 칸을 섞은 사다리: 1번이 받는 결과 8가지');
  // 4명: 24가지 배정이 모두 같은 확률(가로줄 8칸뿐이어도)
  const assign = new Map();
  for (let t = 0; t < 120000; t++) { const k = playLadder(4, { rows: 8 }, rb).result.join(''); assign.set(k, (assign.get(k) || 0) + 1); }
  eq(assign.size, 24, '4명 사다리: 배정 24가지가 모두 나옴');
  uniformOk([...assign.values()], '4명 사다리(가로줄 높이 8): 배정 24가지');
  // 30명·가로줄 적게: 그래도 누구나 같은 확률
  const thirty = new Array(30).fill(0);
  for (let t = 0; t < 60000; t++) thirty[playLadder(30, { rows: 8 }, rb).result[0]]++;
  uniformOk(thirty, '30명 사다리(가로줄 높이 8): 1번이 받는 결과 30가지');
}

// ---------------------------------------------------------------- 같은 씨앗 = 같은 결과
section('같은 씨앗 = 같은 결과');
{
  const s = seedOf('replay');
  const run = (seed) => {
    const out = {};
    out.wheel = wheelPick(30, makeRng(seed));
    out.order = shuffledIndices(30, makeRng(seed));
    out.some = pickSome(30, 5, makeRng(seed));
    out.slips = dealSlips(8, [{ label: 'a', count: 3 }, { label: 'b', count: 5 }], makeRng(seed));
    out.teams = splitTeams(23, { size: 4 }, makeRng(seed));
    out.numbers = randomNumbers({ min: 1, max: 100, count: 10, unique: true }, makeRng(seed));
    out.coin = flipCoins(20, makeRng(seed));
    out.dice = rollDice(5, 6, makeRng(seed));
    const g = playLadder(12, { rows: 14 }, makeRng(seed));
    out.ladder = { bottom: g.bottom, ends: g.ends, result: g.result, rungs: g.ladder.rungs.map((r) => [...r].join('')) };
    return JSON.stringify(out);
  };
  ok(run(s) === run(Uint8Array.from(s)), '같은 씨앗 → 모든 도구가 같은 결과');
  ok(run(s) === run(seedFromText(seedToText(s))), '씨앗을 글자로 바꿨다 돌아와도 같은 결과');
  const other = Uint8Array.from(s); other[31] ^= 1;
  ok(run(s) !== run(other), '씨앗 1비트가 다르면 다른 결과');
  // 고정값(이 값이 바뀌면 옛 공유 링크의 결과가 달라진다는 뜻 → 형식 번호를 올려야 한다)
  const fixed = seedFromText('AQAAAAAAAAACAAAAAAAAAAMAAAAAAAAABAAAAAAAAAA'); // 상태 1,2,3,4
  eq(wheelPick(8, makeRng(fixed)), GOLD.wheel, '고정값: 돌림판 8칸');
  eq(shuffledIndices(8, makeRng(fixed)), GOLD.order, '고정값: 8명 순서');
  eq(splitTeams(8, { teams: 3 }, makeRng(fixed)), GOLD.teams, '고정값: 8명 3팀');
  eq(playLadder(4, { rows: 8 }, makeRng(fixed)).result, GOLD.ladder, '고정값: 4명 사다리');
  eq(randomNumbers({ min: 1, max: 45, count: 6, unique: true, sort: 'asc' }, makeRng(fixed)), GOLD.numbers, '고정값: 1~45에서 6개');
  // 두 번째 고정값: 흔한 모양의 씨앗(기준 벡터 'pick-a')
  const s2 = hex(GOLD.b.seed_hex);
  eq(wheelPick(30, makeRng(s2)), GOLD.b.wheel, '고정값 2: 돌림판 30칸');
  eq(shuffledIndices(10, makeRng(s2)), GOLD.b.order, '고정값 2: 10명 순서');
  eq(pickSome(30, 3, makeRng(s2)), GOLD.b.some, '고정값 2: 30명 중 3명');
  eq(splitTeams(11, { size: 4 }, makeRng(s2)), GOLD.b.teams, '고정값 2: 11명, 한 팀 최대 4명');
  eq(randomNumbers({ min: 1, max: 45, count: 6, unique: true }, makeRng(s2)), GOLD.b.numbers, '고정값 2: 1~45에서 6개');
  eq(flipCoins(10, makeRng(s2)), GOLD.b.coin, '고정값 2: 동전 10번');
  eq(rollDice(5, 6, makeRng(s2)), GOLD.b.dice, '고정값 2: 주사위 5개');
  const g2 = playLadder(6, { rows: 14 }, makeRng(s2));
  eq({ bottom: g2.bottom, ends: g2.ends, result: g2.result, rungs: g2.ladder.rungs.map((r) => [...r].join('')) }, GOLD.b.ladder, '고정값 2: 6명 사다리(모양까지)');
}

// ---------------------------------------------------------------- 명단의 순서에 기대지 않는 뽑기
section('순서에 기대지 않는 뽑기');
{
  // ① 정해진 자리(코드 포인트 순)는 파이썬 sorted()와 같다
  for (const c of FX.order) {
    eq(canonicalOrder(c.items), c.order, `정해진 자리 = 파이썬 sorted(): ${c.name}`);
    eq(canonicalOrder(c.items).map((i) => c.items[i]), c.sorted, `정해진 자리의 이름들: ${c.name}`);
  }
  ok(compareCodePoints('￥', '😀') < 0 && '￥' > '😀', '코드 포인트 순: U+FFE5가 U+1F600보다 앞(자바스크립트 기본 정렬은 반대)');
  ok(compareCodePoints('가', '가나') < 0 && compareCodePoints('가나', '가') > 0 && compareCodePoints('가', '가') === 0, '앞이 같으면 짧은 쪽이 앞, 같으면 0');
  // ② 예시 명단 8명 + 씨앗(상태 1,2,3,4): 뽑힌 사람 = golden.json의 자리 번호를 파이썬이 코드 포인트 순 이름에 댄 것
  const fixed = seedFromText('AQAAAAAAAAACAAAAAAAAAAMAAAAAAAAABAAAAAAAAAA');
  const sample = FX.order[0].items; // 넣은 순서(정렬되지 않음)
  const G = FX.order_golden;
  const names = (idx, list = sample) => idx.map((i) => list[i]);
  eq(sample[wheelDraw(sample, makeRng(fixed)).index], G.wheel, '고정값: 돌림판에서 뽑힌 이름');
  eq(names(drawOrder(sample, makeRng(fixed))), G.order, '고정값: 순서 정하기');
  eq(drawTeams(sample, { teams: 3 }, makeRng(fixed)).map((t) => names(t)), G.teams, '고정값: 3팀');
  eq(names(drawSome(sample, 3, makeRng(fixed))), names(pickSome(8, 3, makeRng(fixed)), G.sorted), '고정값: 3명 뽑기 = 자리 번호를 코드 포인트 순 이름에 댄 것');
  // 옛 방식(형식 1 링크): 넣은 순서가 그대로 자리다 → 예전과 똑같은 결과
  eq(wheelDraw(sample, makeRng(fixed), true), GOLD.wheel, '옛 방식: 돌림판은 넣은 순서의 자리 번호 그대로');
  eq(drawOrder(sample, makeRng(fixed), true), GOLD.order, '옛 방식: 순서 정하기');
  eq(drawTeams(sample, { teams: 3 }, makeRng(fixed), true), GOLD.teams, '옛 방식: 3팀');
  eq(drawSome(sample, 3, makeRng(fixed), true), pickSome(8, 3, makeRng(fixed)), '옛 방식: 3명 뽑기');
  eq(drawSlips(sample, [{ label: 'a', count: 2 }, { label: 'b', count: 6 }], makeRng(fixed), true), dealSlips(8, [{ label: 'a', count: 2 }, { label: 'b', count: 6 }], makeRng(fixed)), '옛 방식: 쪽지');

  // ③ 명단을 아무렇게나 뒤섞어도 같은 씨앗이면 같은 사람이 같은 결과를 받는다(4,000가지 명단 × 뒤섞기)
  const r = makeRng(seedOf('order-free'));
  const pool = ['김민준', '이서연', '박지호', '최유나', '정도윤', '강하린', '윤서준', '임채원', 'Zoë', 'zoe', '田中さん', '😀', '👍🏽', '￥', '10', '9', 'a b', 'A', '가', '각', '3학년 1반 김민준', '3학년 1반 김민', 'محمد', ''];
  const seedFrom = (rng) => { const s = new Uint8Array(32); for (let b = 0; b < 32; b += 4) { const v = rng.u32(); s[b] = v & 255; s[b + 1] = (v >>> 8) & 255; s[b + 2] = (v >>> 16) & 255; s[b + 3] = v >>> 24; } s[0] |= 1; return s; };
  const slipKey = (list, dealt) => { const m = new Map(); list.forEach((nm, i) => { const a = m.get(nm) || []; a.push(dealt[i]); m.set(nm, a); }); return JSON.stringify([...m].map(([k, v]) => [k, v.sort()]).sort()); };
  let same = { wheel: 0, some: 0, order: 0, slips: 0, teams: 0 };
  let moved = 0;      // 뒤섞어서 실제로 순서가 달라진 경우 수
  let oldDiffers = 0; // 옛 방식이었다면 결과가 달라졌을 경우 수(이 시험이 실제로 무는지)
  const TRIALS = 4000;
  for (let t = 0; t < TRIALS; t++) {
    const n = 1 + r.below(40);
    const dup = r.below(3) === 0; // 셋 중 하나는 같은 이름이 섞인 명단
    const a = Array.from({ length: n }, (_, i) => (dup ? pool[r.below(Math.min(pool.length, 6))] : pool[i % pool.length] + (i >= pool.length ? ' ' + Math.floor(i / pool.length) : '')));
    const b = shuffle(a, r);
    if (a.join('\n') !== b.join('\n')) moved++;
    const seed = seedFrom(r);
    const m = 1 + r.below(n);
    const k = 1 + r.below(n);
    const slips = [{ label: 'w', count: m }, { label: 'l', count: n - m }];
    const wa = wheelDraw(a, makeRng(seed));
    const wb = wheelDraw(b, makeRng(seed));
    if (a[wa.index] === b[wb.index] && wa.frac === wb.frac && wa.turns === wb.turns) same.wheel++;
    if (JSON.stringify(names(drawSome(a, m, makeRng(seed)), a)) === JSON.stringify(names(drawSome(b, m, makeRng(seed)), b))) same.some++;
    if (JSON.stringify(names(drawOrder(a, makeRng(seed)), a)) === JSON.stringify(names(drawOrder(b, makeRng(seed)), b))) same.order++;
    if (slipKey(a, drawSlips(a, slips, makeRng(seed))) === slipKey(b, drawSlips(b, slips, makeRng(seed)))) same.slips++;
    if (JSON.stringify(drawTeams(a, { teams: k }, makeRng(seed)).map((x) => names(x, a))) === JSON.stringify(drawTeams(b, { teams: k }, makeRng(seed)).map((x) => names(x, b)))) same.teams++;
    if (a[wheelDraw(a, makeRng(seed), true).index] !== b[wheelDraw(b, makeRng(seed), true).index]) oldDiffers++;
  }
  eq(same, { wheel: TRIALS, some: TRIALS, order: TRIALS, slips: TRIALS, teams: TRIALS }, `명단을 뒤섞어도 결과가 같다(${TRIALS.toLocaleString('en')}건씩: 돌림판·여러 명·순서·쪽지·팀)`);
  ok(moved > TRIALS * 0.9, `뒤섞어서 실제로 순서가 달라진 명단 ${moved.toLocaleString('en')}건`);
  ok(oldDiffers > TRIALS * 0.5, `같은 시험에서 옛 방식(넣은 순서 = 자리)은 ${oldDiffers.toLocaleString('en')}건이 다른 사람을 뽑는다(시험이 실제로 문다)`);

  // ④ 결과 링크로 해 보기: 링크 속 명단의 순서만 바꿔도 같은 사람이 뽑힌다(평가에서 나온 조작 시나리오)
  let forged = 0;
  let forgedOld = 0;
  for (let t = 0; t < 300; t++) {
    const seed = seedFrom(r);
    const pickName = (hash, legacy) => { const d = decodeShare('#' + hash); return d.items[wheelDraw(d.items, makeRng(d.seed), legacy).index]; };
    const real = pickName(encodeShare({ tool: 'wheel', seed, items: sample }), false);
    const swapped = shuffle(sample, r);
    if (pickName(encodeShare({ tool: 'wheel', seed, items: swapped }), false) !== real) forged++;
    if (pickName(encodeShare({ tool: 'wheel', seed, items: swapped, version: 1 }), true) !== pickName(encodeShare({ tool: 'wheel', seed, items: sample, version: 1 }), true)) forgedOld++;
  }
  eq(forged, 0, '링크 속 명단의 순서를 바꿔도 뽑힌 사람이 바뀌지 않는다(300건)');
  ok(forgedOld > 150, `옛 형식(1) 링크는 순서를 바꾸면 ${forgedOld}건이 바뀐다(그래서 옛 링크에는 "순서까지 같아야"라고 알린다)`);

  // ⑤ 공평성: 정해진 자리로 뽑아도 이름마다 같은 확률(명단을 매번 다른 순서로 넣어도)
  const rf = makeRng(seedOf('order-fair'));
  const idOf = new Map(sample.map((nm, i) => [nm, i]));
  const wheelC = new Array(8).fill(0);
  const someC = new Array(8).fill(0);
  const firstC = new Array(8).fill(0);
  const slipC = new Array(8).fill(0);
  const bigC = new Array(8).fill(0);
  const posC = Array.from({ length: 64 }, () => 0);
  for (let t = 0; t < N; t++) {
    const list = shuffle(sample, rf);
    wheelC[idOf.get(list[wheelDraw(list, rf).index])]++;
    const some = drawSome(list, 3, rf);
    some.forEach((i) => someC[idOf.get(list[i])]++);
    firstC[idOf.get(list[some[0]])]++;
    drawSlips(list, [{ label: 'w', count: 2 }, { label: 'l', count: 6 }], rf).forEach((kind, i) => { if (kind === 0) slipC[idOf.get(list[i])]++; });
    drawTeams(list, { teams: 3 }, rf)[0].forEach((i) => bigC[idOf.get(list[i])]++);
    drawOrder(list, rf).forEach((i, at) => posC[idOf.get(list[i]) * 8 + at]++);
  }
  uniformOk(wheelC, '돌림판(정해진 자리): 이름마다 뽑힌 횟수');
  uniformOk(someC, '8명 중 3명(정해진 자리): 이름마다 뽑힌 횟수');
  uniformOk(firstC, '8명 중 3명(정해진 자리): 첫 번째로 뽑힌 횟수');
  uniformOk(slipC, '쪽지(정해진 자리): 이름마다 당첨 횟수');
  uniformOk(bigC, '팀(정해진 자리): 3명 팀에 들어간 횟수');
  for (let v = 0; v < 8; v++) uniformOk(posC.slice(v * 8, v * 8 + 8), `순서 정하기(정해진 자리): ${sample[v]}의 차례`);
  // 코드 포인트 순으로 맨 앞·맨 뒤인 이름이 유리하지도 불리하지도 않다(실제 쓰임대로 씨앗마다 한 번씩)
  const edge = new Array(8).fill(0);
  const master = makeRng(seedOf('order-edge'));
  for (let t = 0; t < N; t++) edge[idOf.get(sample[wheelDraw(sample, makeRng(seedFrom(master))).index])]++;
  uniformOk(edge, '돌림판(정해진 자리, 씨앗마다 한 번)');
  // 같은 이름을 두 번 넣으면 여전히 두 배
  const dupC = [0, 0];
  for (let t = 0; t < 60000; t++) { const l = shuffle(['A', 'B', 'A'], rf); dupC[l[wheelDraw(l, rf).index] === 'A' ? 0 : 1]++; }
  const [dst] = chi2(dupC, [40000, 20000]);
  ok(dst < CRIT['1'], `같은 이름 두 줄은 두 칸(A ${dupC[0]} : B ${dupC[1]}, 기대 2:1)`);
  throws(() => wheelDraw([], makeRng(fixed)), '빈 명단');
}

// ---------------------------------------------------------------- 좁은 칸에 이름 맞추기
section('이름 맞추기');
{
  const w10 = (t) => Array.from(t).length * 10; // 글자마다 폭 10인 가짜 글꼴
  eq(fitLabel('김민준', 50, w10), { text: '김민준', scale: 1 }, '들어가면 그대로');
  eq(fitLabel('김민준이', 36, w10), { text: '김민준이', scale: 0.9 }, '조금 넘치면 글자를 줄인다');
  eq(fitLabel('Supercalifragilistic', 60, w10), { text: 'Superca…', scale: 0.72 }, '많이 넘치면 줄이고 뒤를 자른다');
  const cls = ['3학년 1반 김민준', '3학년 1반 이서연', '3학년 1반 박지호'];
  eq(commonPrefixLength(cls), 7, '앞이 같은 글자 수("3학년 1반 " = 3·학·년·빈칸·1·반·빈칸)');
  eq(cls.map((c) => fitLabel(c, 40, w10, { prefix: commonPrefixLength(cls) }).text), ['…김민준', '…이서연', '…박지호'], '앞이 같은 명단은 앞을 줄이고 서로 다른 뒤쪽을 살린다');
  ok(new Set(cls.map((c) => fitLabel(c, 40, w10, { prefix: 7 }).text)).size === 3 && new Set(cls.map((c) => fitLabel(c, 40, w10).text)).size === 1, '그러지 않으면 셋이 같은 글자("3학년…")로 보인다');
  // 손으로 따진 값: 폭 40, 72%까지 줄이면 기준 크기로 55.5까지 들어간다 = 다섯 글자('…' 포함)
  eq(fitLabel('3학년 1반 남궁민수현', 40, w10, { prefix: 7 }).text, '…궁민수현', '뒤쪽도 넘치면 들어가는 만큼의 끝부분');
  eq([commonPrefixLength(['가']), commonPrefixLength([]), commonPrefixLength(['가나', '가나']), commonPrefixLength(['김민준', '김서연']), commonPrefixLength(['가나다', '가나']), commonPrefixLength(['👍🏽a', '👍🏽b'])], [0, 0, 0, 1, 2, 2], '앞이 같은 글자 수: 하나뿐·전부 같은 이름은 0, 이모지는 쪼개지 않는다');
  // 손으로 따진 값: 폭 30, 72%까지 줄이면 41.6까지 = 네 글자('…' 포함)
  eq(fitLabel('김민준 선생님', 30, w10, { prefix: 1 }).text, '김민준…', '같은 앞부분이 한 글자뿐이면(성이 같은 정도) 평소대로 뒤를 자른다');
  eq(fitLabel('가나다라마바사', 30, w10, { minScale: 1 }), { text: '가나…', scale: 1 }, '줄이지 않기로 하면(사다리 이름표) 자르기만');
  let fits = true;
  const rr = makeRng(seedOf('fit'));
  for (let t = 0; t < 3000; t++) {
    const len = 1 + rr.below(30);
    const text = Array.from({ length: len }, () => 'ab가나😀 '[rr.below(6)]).join('').trim() || 'a';
    const max = 20 + rr.below(200);
    const pre = rr.below(8);
    const f = fitLabel(text, max, w10, { prefix: pre });
    if (!(w10(f.text) * f.scale <= max + 1e-9 || Array.from(f.text).length <= 2) || f.scale > 1 || f.scale < 0.72 - 1e-9 || f.text === '') fits = false;
  }
  ok(fits, '3,000가지 이름·폭: 맞춘 글자는 폭 안에 들어가고(두 글자 이하로 줄인 것은 빼고), 크기는 72%~100%');
}

// ---------------------------------------------------------------- 숫자 읽기
section('숫자 읽기');
{
  const v = (t) => { const r = readInteger(t); return r.ok ? r.value : r.reason; };
  eq([v('10'), v(' 12 '), v('1,000'), v('-5'), v('+5'), v('007'), v('-0')], [10, 12, 1000, -5, 5, 7, 0], '보통 정수, 띄어쓰기, 자릿수 쉼표, 부호');
  eq([v('１０'), v('－５'), v('１，０００'), v('−5'), v('–5'), v('１　０')], [10, -5, 1000, -5, -5, 10], '전각 숫자·전각 쉼표·여러 가지 빼기표는 반각으로 받는다');
  eq([v(''), v('   '), v('1.5'), v('abc'), v('1e3'), v('5-'), v('--5'), v('0x10')], ['empty', 'empty', 'not-integer', 'not-integer', 'not-integer', 'not-integer', 'not-integer', 'not-integer'], '빈칸과 정수가 아닌 것');
  eq([v('999999999999999'), v('-999999999999999'), v('1000000000000000'), v('9999999999999999'), v('000000000000000001')], [999999999999999, -999999999999999, 'too-long', 'too-long', 1], '15자리까지, 16자리부터는 너무 길다고(정수가 아니라고 하지 않는다)');
  ok(999999999999999 - -999999999999999 + 1 < 2 ** 53, '15자리 범위는 어떤 두 수든 정확히 계산된다(범위 크기 < 2^53)');
}

// ---------------------------------------------------------------- 명단 읽기
section('명단 읽기');
{
  eq(parseList('김민준\n이서연\n\n  박지호  \n').items, ['김민준', '이서연', '박지호'], '줄마다 하나, 빈 줄·앞뒤 공백 정리');
  eq(parseList('김민준\r\n이서연\r박지호').items, ['김민준', '이서연', '박지호'], '윈도·옛 맥 줄바꿈');
  eq(parseList('짜장면, 짬뽕 ,볶음밥').items, ['짜장면', '짬뽕', '볶음밥'], '한 줄이면 쉼표로');
  eq(parseList('짜장면，짬뽕、볶음밥').items, ['짜장면', '짬뽕', '볶음밥'], '전각 쉼표·모점');
  eq(parseList('가\t나\t다').items, ['가', '나', '다'], '엑셀 한 행(탭)');
  // 한 줄뿐일 때 쉼표로 나눴는지 알려 준다(화면이 "한 줄을 쉼표로 나눴어요"라고 밝힌다)
  eq([parseList('Smith, John').items, parseList('Smith, John').split], [['Smith', 'John'], true], '한 줄 "Smith, John"은 둘로 나누고 나눴다고 알린다');
  eq(parseList('Smith, John\nDoe, Jane').split, false, '여러 줄이면 쉼표로 나누지 않는다');
  eq(parseList('혼자').split, false, '나눌 것이 없으면 나눴다고 하지 않는다');
  // 엑셀에서 여러 칸을 같이 붙여 넣은 것: 줄마다 탭이 있다 → 몇 줄인지 알려 주고, 첫 칸만 남길 수 있다
  const sheet = '1\t김민준\t남\n2\t이서연\t여\n3\t박지호\t남';
  eq([parseList(sheet).items, parseList(sheet).tabs], [['1 김민준 남', '2 이서연 여', '3 박지호 남'], 3], '여러 칸 붙여 넣기: 한 줄이 한 칸으로, 탭이 든 줄 수');
  eq(parseList(firstColumn(sheet)).items, ['1', '2', '3'], '첫 칸만 쓰기');
  eq(parseList(firstColumn('김민준\t1반\n이서연\t2반\n\n\t박지호\t3반')).items, ['김민준', '이서연', '박지호'], '첫 칸만 쓰기: 빈 줄은 빼고, 첫 칸이 비면 그 줄의 첫 내용');
  eq(parseList('김민준\n이서연').tabs, 0, '탭이 없으면 0');
  eq(parseList('김민준, 1반\n이서연, 2반').items, ['김민준, 1반', '이서연, 2반'], '여러 줄이면 쉼표는 이름의 일부');
  eq(parseList('혼자').items, ['혼자'], '하나');
  eq(parseList('').items, [], '빈 글');
  eq(parseList('   \n \n').items, [], '공백뿐');
  eq(parseList(null).items, [], 'null');
  eq(parseList('가\n가\n나\n가').dupes, 2, '겹치는 이름 수');
  eq(parseList('가\n가\n나').items, ['가', '가', '나'], '겹치는 이름은 지우지 않는다');
  eq(uniqueItems(['가', '가', '나', '가']), ['가', '나'], '겹치는 이름 지우기');
  eq(parseList('1. 김민준\n2) 이서연\n3반 박지호', { stripNumbers: true }).items, ['김민준', '이서연', '3반 박지호'], '번호 지우기(켰을 때만)');
  eq(parseList('1. 김민준').items, ['1. 김민준'], '번호는 기본으로 두기');
  eq(parseList('김  민준\n이\u3000서연\n박\u00a0지호').items, ['김 민준', '이 서연', '박 지호'], '이어진 공백·전각 공백');
  const long = 'ㄱ'.repeat(150);
  const pl = parseList(long + '\n가');
  ok(pl.cut === 1 && Array.from(pl.items[0]).length === LIMITS.nameLength, '너무 긴 이름은 100자로 자르고 알림');
  const emojiLong = parseList('👨‍👩‍👧‍👦'.repeat(40));
  ok(Array.from(emojiLong.items[0]).length === LIMITS.nameLength && emojiLong.items[0].isWellFormed(), '이모지를 반으로 자르지 않는다');
  const many = parseList(Array.from({ length: LIMITS.items + 7 }, (_, i) => 'p' + i).join('\n'));
  ok(many.items.length === LIMITS.items && many.over === 7, '한도 넘는 이름은 빼고 몇 개인지 알림');
  eq(cleanName('a\u0000b\tc'), 'a b c', '제어 문자는 공백으로');
  eq(cleanName('반쪽\ud83d'), '반쪽\ufffd', '깨진 이모지 반쪽은 대체 문자로');
}

// ---------------------------------------------------------------- 공유 링크
section('링크 왕복');
{
  const seed = seedOf('share');
  for (const c of FX.share) {
    for (const tool of Object.keys(TOOLS)) {
      const h = encodeShare({ tool, seed, items: c.i, opts: c.o });
      const d = decodeShare('#' + h);
      ok(d.ok && d.tool === tool && JSON.stringify(d.items) === JSON.stringify(c.i) && JSON.stringify(d.opts) === JSON.stringify(c.o) && seedToText(d.seed) === seedToText(seed),
        `왕복: ${c.name} / ${tool}`);
      ok(/^r=2\.[a-z]\.[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]+$/.test(h), `주소에 그대로 쓸 수 있는 글자만(형식 2): ${c.name} / ${tool}`);
      ok(d.version === 2 && h.length === shareLength(c.i, c.o), `형식 번호 2, 길이 계산 = 실제 길이: ${c.name} / ${tool}`);
    }
    // 파이썬이 만든 문자열과 글자 하나까지 같고, 파이썬이 만든 것도 읽힌다
    const h = encodeShare({ tool: 'wheel', seed, items: c.i, opts: c.o });
    ok(h.split('.')[3] === c.body, `파이썬 json+base64와 같은 문자열: ${c.name}`);
    for (const ver of [1, 2]) {
      const d = decodeShare(`r=${ver}.w.${seedToText(seed)}.${c.body}`);
      ok(d.ok && d.version === ver && JSON.stringify(d.items) === JSON.stringify(c.i), `파이썬이 만든 링크 읽기(형식 ${ver}): ${c.name}`);
    }
    // 브라우저 주소 처리(URL)를 지나도 그대로
    const u = new URL('https://pick.lumenlab.page/ko/#' + h);
    ok(decodeShare(u.hash).ok && u.hash === '#' + h && u.href.endsWith('#' + h), `URL을 지나도 그대로: ${c.name}`);
  }
  // 같은 씨앗·명단 → 링크를 지나도 같은 결과
  const items = FX.share[0].i;
  const before = wheelPick(items.length, makeRng(seed));
  const d = decodeShare(encodeShare({ tool: 'wheel', seed, items }));
  eq(wheelPick(d.items.length, makeRng(d.seed)), before, '링크로 열면 같은 결과가 재생된다');
  eq(d.items[before.index], items[before.index], '뽑힌 이름도 같다');
  const longLink = encodeShare({ tool: 'draw', seed, items: FX.share.find((c) => c.name === 'long 500').i });
  ok(longLink.length < 16000, `500명 명단 링크 길이 ${longLink.length.toLocaleString('en')}자`);

  // 잘못된 링크는 이유와 함께 거절(예외를 던지지 않는다)
  const good = encodeShare({ tool: 'wheel', seed, items: ['가', '나'] });
  const parts = good.split('.');
  const enc = (obj) => bytesToB64u(new TextEncoder().encode(typeof obj === 'string' ? obj : JSON.stringify(obj)));
  const bad = (h, reason, name) => { let d2; try { d2 = decodeShare(h); } catch (e) { d2 = { ok: true, reason: 'threw' }; } ok(d2.ok === false && d2.reason === reason, `${name} → ${reason} (got ${d2.reason})`); };
  bad('', 'none', '빈 해시');
  bad('#guide', 'none', '다른 해시');
  bad(null, 'none', 'null');
  bad('#r=', 'format', '내용 없음');
  bad('#' + good + '.x', 'format', '칸이 더 많음');
  bad('#' + good.replace('r=2.', 'r=3.'), 'version', '모르는 형식 번호(3)');
  bad('#' + good.replace('r=2.', 'r=0.'), 'version', '모르는 형식 번호(0)');
  bad('#' + good.replace('r=2.', 'r=x.'), 'format', '형식 번호가 숫자가 아님');
  ok(decodeShare('#' + good.replace('r=2.', 'r=1.')).version === 1, '옛 형식 번호 1은 계속 읽는다');
  eq(SHARE_VERSION, 2, '새로 만드는 링크의 형식 번호');
  eq(decodeShare(encodeShare({ tool: 'wheel', seed, items: ['가', '나'], version: 1 })).version, 1, '옛 형식으로 받은 결과는 옛 형식으로 다시 만들 수 있다');
  throws(() => encodeShare({ tool: 'wheel', seed, items: ['가'], version: 3 }), '없는 형식 번호로 만들기');
  bad('#' + good.replace('.w.', '.q.'), 'tool', '모르는 도구');
  bad('#' + [parts[0], parts[1], 'A'.repeat(43), parts[3]].join('.'), 'seed', '전부 0인 씨앗');
  bad('#' + [parts[0], parts[1], parts[2].slice(1), parts[3]].join('.'), 'seed', '짧은 씨앗');
  bad('#' + [parts[0], parts[1], parts[2], parts[3].slice(0, -3)].join('.'), 'data', '잘린 내용');
  bad('#' + [parts[0], parts[1], parts[2], '!!!!'].join('.'), 'data', 'base64가 아닌 내용');
  bad('#' + [parts[0], parts[1], parts[2], bytesToB64u(Uint8Array.from([0xff, 0xfe, 0x7b]))].join('.'), 'data', 'UTF-8이 아닌 내용');
  { // JSON 글자 안에 깨진 UTF-8 바이트(0xff)가 든 내용: 대체 문자로 바꿔 받지 않고 거절
    const raw = [...new TextEncoder().encode('{"o":{},"i":["a')].concat([0xff], [...new TextEncoder().encode('"]}')]);
    bad('#' + [parts[0], parts[1], parts[2], bytesToB64u(Uint8Array.from(raw))].join('.'), 'data', '이름 안의 깨진 UTF-8');
  }
  const withBody = (obj) => '#' + [parts[0], parts[1], parts[2], enc(obj)].join('.');
  bad(withBody('[1,2]'), 'data', '배열');
  bad(withBody('null'), 'data', 'null');
  bad(withBody({ o: {}, i: 'abc' }), 'data', '명단이 글자');
  bad(withBody({ o: {}, i: [1, 2] }), 'data', '명단에 숫자');
  bad(withBody({ o: {}, i: [' 가 '] }), 'data', '다듬어지지 않은 이름');
  bad(withBody({ o: {}, i: [''] }), 'data', '빈 이름');
  bad(withBody({ o: {}, i: ['a\nb'] }), 'data', '줄바꿈이 든 이름');
  bad(withBody({ o: {}, i: ['x'.repeat(101)] }), 'data', '너무 긴 이름');
  bad(withBody({ o: {}, i: Array.from({ length: LIMITS.items + 1 }, () => 'a') }), 'data', '너무 많은 이름');
  bad(withBody({ o: [], i: [] }), 'data', '설정이 배열');
  bad(withBody({ o: { a: { b: 1 } }, i: [] }), 'data', '설정 안에 객체');
  bad(withBody({ o: { a: 1.5 }, i: [] }), 'data', '설정에 소수');
  bad(withBody({ o: { 'bad-key': 1 }, i: [] }), 'data', '설정 키에 이상한 글자');
  bad(withBody('{"o":{"__proto__":{"x":1}},"i":[]}'), 'data', '__proto__ 키');
  bad(withBody('{"o":{},"i":["\\ud83d"]}'), 'data', '깨진 이모지 반쪽');
  bad('#r=2.w.' + parts[2] + '.' + 'A'.repeat(400001), 'too-long', '너무 긴 링크');
  { // 링크 길이 한도: 만들 수 있는 링크는 전부 읽을 수 있고, 한도를 넘는 링크는 만들지 않는다(복사했다고 해 놓고 안 열리는 일이 없게)
    const name = (i) => 'ㄱ'.repeat(26) + String(i).padStart(4, '0'); // 30자 이름
    const fits = Array.from({ length: 3400 }, (_, i) => name(i));
    const h = encodeShare({ tool: 'wheel', seed, items: fits });
    ok(h.length <= MAX_HASH && h.length > MAX_HASH * 0.95 && decodeShare('#' + h).ok, `한도 바로 아래 링크(${h.length.toLocaleString('en')}자)는 만들어지고 읽힌다`);
    const big = Array.from({ length: 5000 }, (_, i) => name(i));
    ok(shareLength(big, {}) > MAX_HASH, `5,000명 × 30자 명단은 한도를 넘는다(${shareLength(big, {}).toLocaleString('en')}자)`);
    let err = '';
    try { encodeShare({ tool: 'wheel', seed, items: big }); } catch (e) { err = e.message; }
    eq(err, 'share-too-long', '한도를 넘는 링크는 만들지 않고 알린다');
    const eight = Array.from({ length: 5000 }, (_, i) => '가나다라' + String(i).padStart(4, '0')); // 5,000명 × 8자
    ok(decodeShare('#' + encodeShare({ tool: 'wheel', seed, items: eight })).ok, `5,000명 × 8자 명단(${shareLength(eight, {}).toLocaleString('en')}자)은 링크가 된다`);
    // 한도 경계: 길이가 딱 한도인 것은 읽고, 한 글자 넘으면 읽지 않는다
    const pad = (len) => 'r=2.w.' + parts[2] + '.' + bytesToB64u(new TextEncoder().encode(JSON.stringify({ o: {}, i: [] }))).padEnd(len - 6 - 43 - 1, 'A');
    ok(pad(MAX_HASH).length === MAX_HASH && decodeShare(pad(MAX_HASH)).reason !== 'too-long', '길이가 딱 한도인 링크는 길이로 거절하지 않는다');
    eq(decodeShare(pad(MAX_HASH + 1)).reason, 'too-long', '한도를 한 글자 넘으면 읽지 않는다');
  }
  ok(decodeShare(withBody({})).ok, '명단·설정이 없으면 빈 값으로');
  throws(() => encodeShare({ tool: 'nope', seed, items: [] }), '모르는 도구로 만들기');
  throws(() => encodeShare({ tool: 'wheel', seed: new Uint8Array(32), items: [] }), '0 씨앗으로 만들기');
  throws(() => encodeShare({ tool: 'wheel', seed, items: [' 앞 공백'] }), '다듬지 않은 이름으로 만들기');
  // 명단 읽기 → 링크: 무엇을 붙여 넣어도 링크로 만들 수 있다
  const messy = parseList('  가\t나 \n\u0000다\ud83d\n' + '라'.repeat(300) + '\n😀\n');
  const rt = decodeShare(encodeShare({ tool: 'teams', seed, items: messy.items, opts: { teams: 2 } }));
  ok(rt.ok && JSON.stringify(rt.items) === JSON.stringify(messy.items), '지저분한 붙여 넣기도 왕복');
}

// ---------------------------------------------------------------- 시뮬레이션 숫자 (가이드 글의 재료)
section('사다리 시뮬레이션');
{
  // _dev/sim_ladder.json(사이트 코드로 사다리를 수만~수십만 개 만든 결과)을 파이썬의 정확한 계산과 대조한다.
  // 높이 24 이상에서는 '가로줄 채우기'가 거의 일어나지 않아 두 값이 표본 오차 안에서 같아야 한다.
  const simPath = path.join(HERE, '..', '_dev', 'sim_ladder.json');
  if (fs.existsSync(simPath)) {
    const sim = JSON.parse(fs.readFileSync(simPath, 'utf8'));
    let worstStay = 0;
    let worstTv = 0;
    let compared = 0;
    for (const c of sim.cells) {
      if (c.rows < 24) continue;
      const ex = FX.ladder_table.find((e) => e.n === c.n && e.rows === c.rows);
      if (!ex) continue;
      compared++;
      worstStay = Math.max(worstStay, Math.abs(c.edge.stay - ex.stay_edge));
      worstTv = Math.max(worstTv, Math.abs(c.edge.tv - ex.tv_worst) - c.noise);
    }
    ok(compared >= 40, `대조한 칸 ${compared}개`);
    ok(worstStay < 0.005, `맨 끝 자리 '바로 아래 칸' 비율: 정확한 값과 차이 최대 ${(worstStay * 100).toFixed(2)}%p`);
    ok(worstTv < 0.012, `균등과의 차이(tv): 정확한 값과 차이(우연 수준을 뺀 것) 최대 ${worstTv.toFixed(4)}`);
    // 아래 칸을 섞으면 사이트가 쓰는 모든 높이·인원에서 우연 수준
    const mixed = sim.cells.filter((c) => c.mixed);
    ok(mixed.length === 30 && mixed.every((c) => c.mixed.tv < c.noise * 2.5 + 0.001), `아래 칸을 섞은 ${mixed.length}칸 모두 우연 수준(tv < 우연 수준의 2.5배)`);
    // 글에 쓸 대표 숫자(바뀌면 글도 고쳐야 한다)
    const cell = (n, rows) => sim.cells.find((c) => c.n === n && c.rows === rows);
    eq([cell(8, 14).edge.stay, cell(8, 14).fair, cell(30, 24).edge.stay, cell(30, 24).fair], [0.2476, 0.125, 0.1924, 0.0333], '대표 숫자: 8명·보통 24.8% 대 12.5%, 30명·많이 19.2% 대 3.3%');
  } else {
    ok(true, 'sim_ladder.json 없음(건너뜀)');
  }
  // 정확한 계산: 치우침이 5% 아래로 내려가는 높이
  const need = Object.fromEntries(FX.ladder_need.map((r) => [r.n, r.rows_tv5]));
  eq([need[4], need[8], need[30]], [12, 49, 696], '치우침 5% 아래가 되는 높이: 4명 12칸, 8명 49칸, 30명 696칸(파이썬 계산)');
}

// ---------------------------------------------------------------- 글·화면 문구에 적은 숫자
section('글 속 숫자');
{
  // 팀 나누기 글의 표
  eq(teamSizes(30, { teams: 4 }), [8, 8, 7, 7], '30명 4팀');
  eq(teamSizes(10, { teams: 3 }), [4, 3, 3], '10명 3팀');
  eq(teamSizes(23, { teams: 6 }), [4, 4, 4, 4, 4, 3], '23명 6팀');
  eq(teamSizes(13, { size: 4 }), [4, 3, 3, 3], '13명, 한 팀 최대 4명');
  eq(teamSizes(23, { size: 5 }), [5, 5, 5, 4, 4], '23명, 한 팀 최대 5명');
  eq(teamSizes(9, { size: 4 }), [3, 3, 3], '9명, 한 팀 최대 4명');
  eq(teamSizes(13, { teams: 3 }), [5, 4, 4], '13명 3팀');
  eq([teamSizes(4, { teams: 4 }), teamSizes(8, { teams: 4 })], [[1, 1, 1, 1], [2, 2, 2, 2]], '잘하는 4명·나머지 8명을 각각 4팀으로');
  // 돌림판 글: 결과 링크 길이(세 글자 이름)
  const fam = '김이박최정강조윤장임한오서신권황안송류전';
  const giv = ['민준', '서연', '지호', '유나', '도윤', '하린', '서준', '채원', '지우', '예준', '수아', '시우', '하윤', '주원', '지안'];
  const len = (n) => ('https://pick.lumenlab.page/ko/#' + encodeShare({ tool: 'wheel', seed: seedOf('len'), items: Array.from({ length: n }, (_, i) => fam[i % fam.length] + giv[(i * 7) % giv.length]) })).length;
  ok(len(30) >= 540 && len(30) <= 640, `30명 링크 약 600자 (${len(30)})`);
  ok(len(100) >= 1600 && len(100) <= 1800, `100명 링크 약 1,700자 (${len(100)})`);
  // 동전 글: 10번 던지면 같은 면이 세 번 이상 이어지는 경우가 절반보다 많다 / 다섯 번 모두 앞 = 1/32
  let runs = 0;
  for (let m = 0; m < 1024; m++) {
    let best = 1;
    let cur = 1;
    for (let i = 1; i < 10; i++) { cur = ((m >> i) & 1) === ((m >> (i - 1)) & 1) ? cur + 1 : 1; best = Math.max(best, cur); }
    if (best >= 3) runs++;
  }
  eq(runs, 846, '10번 던지기 1,024가지 중 같은 면이 3번 이상 이어지는 경우 846가지(82.6%)');
  ok(runs / 1024 > 0.5, '절반보다 많다');
  eq(2 ** 5, 32, '다섯 번 모두 앞일 확률 1/32');
  // 동전 FAQ: 어느 다섯 번이 모두 같은 면일 확률은 16분의 1(앞만 다섯 번이면 32분의 1)
  let allSame = 0;
  for (let m = 0; m < 32; m++) if (m === 0 || m === 31) allSame++;
  eq([allSame, 32 / allSame], [2, 16], '다섯 번이 모두 같은 면인 경우는 32가지 중 2가지 = 1/16');
  // 화면 글에 적은 한도 = 코드의 한도
  const CONTENT = JSON.parse(fs.readFileSync(path.join(HERE, '..', '_dev', 'content.json'), 'utf8'));
  const textOf = (tid, lang) => JSON.stringify(CONTENT.tools[tid][lang]);
  const said = (text, n) => text.includes(n.toLocaleString('en'));
  ok(said(textOf('coin', 'ko'), LIMITS.coinList) && said(textOf('coin', 'en'), LIMITS.coinList) && said(textOf('coin', 'ko'), LIMITS.coinCount) && said(textOf('coin', 'en'), LIMITS.coinCount), `동전 글: 던진 순서는 ${LIMITS.coinList}번까지, 한 번에 ${LIMITS.coinCount.toLocaleString('en')}번까지`);
  ok(said(textOf('dice', 'ko'), LIMITS.diceSides) && said(textOf('dice', 'en'), LIMITS.diceSides) && said(textOf('dice', 'ko'), LIMITS.diceCount) && said(textOf('dice', 'en'), LIMITS.diceCount), `주사위 글: 면 수 2~${LIMITS.diceSides.toLocaleString('en')}, 한 번에 ${LIMITS.diceCount}개`);
  for (const tid of ['wheel', 'draw', 'teams']) ok(said(textOf(tid, 'ko'), LIMITS.items) && said(textOf(tid, 'en'), LIMITS.items), `${tid} 글: 명단 한도 ${LIMITS.items.toLocaleString('en')}`);
  ok(said(textOf('number', 'ko'), LIMITS.numbersCount) && said(textOf('number', 'en'), LIMITS.numbersCount), '숫자 글: 한 번에 10,000개');
  ok(said(textOf('ladder', 'ko'), LIMITS.ladderMax) && said(textOf('ladder', 'en'), LIMITS.ladderMax), '사다리 글: 30명까지');
  const allText = JSON.stringify(CONTENT);
  ok(!/인원 제한 없|몇 명이든|No Entry Limit|no limit on entries|any number of names|of any length/i.test(allText), '화면 글에 "제한 없음" 꼴의 말이 없다(한도는 5,000줄)');
  // 돌림판 그리기 계산: 이웃한 칸(맨 끝과 첫 칸 포함)은 색이 다르다, 왼쪽 절반만 뒤집는다
  let colorsOk = true;
  for (let n = 2; n <= 600; n++) { const m = sliceColorCount(n); if (m < 3 && n > 2) colorsOk = false; for (let i = 0; i < n; i++) if (n > 2 && i % m === ((i + 1) % n) % m) colorsOk = false; }
  ok(colorsOk, '칸 색: 3~600칸에서 이웃한 칸이 같은 색으로 만나지 않는다');
  eq([labelFlipped(0), labelFlipped(Math.PI / 2 - 0.01), labelFlipped(Math.PI / 2 + 0.01), labelFlipped(Math.PI), labelFlipped(-Math.PI / 2 + 0.01), labelFlipped(-Math.PI / 2 - 0.01), labelFlipped(7 * Math.PI)],
    [false, false, true, true, false, true, true], '이름 뒤집기: 판의 왼쪽 절반에서만');
  ok(labelSize(250, 8) > 20 && labelSize(250, 30) >= 14 && labelSize(250, 200) < 8, '이름 크기: 8칸 크게, 30칸 읽을 만하게, 200칸은 쓰지 않음');
}

// ---------------------------------------------------------------- 끝
console.log(`${failed === 0 ? '통과' : '실패'}: ${passed}개 통과, ${failed}개 실패 (모두 ${passed + failed}개)`);
if (failed) { console.log(fails.map((f) => '  ✗ ' + f).join('\n')); process.exit(1); }
