// 난수 (DOM을 모르는 파일. 브라우저와 노드에서 같이 돈다)
//
// 뽑는 순서: ① 뽑을 때마다 새 씨앗 32바이트를 crypto.getRandomValues 로 만든다(newSeed)
//            ② 그 씨앗을 처음 상태로 xoshiro256** 를 돌려 결과를 낸다(makeRng)
// 그래서 씨앗 + 명단 + 설정이 같으면 누가 열어도 같은 결과가 나온다(공유 링크).
//
// - xoshiro256** 1.0: David Blackman, Sebastiano Vigna (공개 도메인). 기준 벡터로 테스트한다(tests/run.mjs).
//   64비트 정수를 32비트 두 칸(아래·위)으로 나눠 계산한다(BigInt 없이, 빠르게).
// - 정수 뽑기(below)는 '거절 표본': 필요한 비트만큼만 뽑고, 범위를 넘으면 버리고 다시 뽑는다.
//   나머지(%) 연산을 쓰지 않으므로 어느 숫자도 더 자주 나오지 않는다. Math.random()은 쓰지 않는다.

export const SEED_BYTES = 32;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** 새 씨앗(32바이트, 암호학적 난수). */
export function newSeed() {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function') throw new Error('no-crypto');
  for (;;) {
    const s = c.getRandomValues(new Uint8Array(SEED_BYTES));
    if (s.some((b) => b !== 0)) return s; // 전부 0인 상태는 xoshiro가 못 쓴다(확률 2^-256)
  }
}

/** 씨앗 ↔ 글자(base64url 43자). 링크와 화면에 이 꼴로 나온다. */
export function seedToText(seed) {
  checkSeed(seed);
  return bytesToB64u(seed);
}
export function seedFromText(text) {
  if (typeof text !== 'string' || text.length !== 43) throw new Error('bad-seed');
  const b = b64uToBytes(text);
  checkSeed(b);
  if (bytesToB64u(b) !== text) throw new Error('bad-seed'); // 남는 비트가 0이 아닌 변형 표기는 받지 않는다
  return b;
}
function checkSeed(seed) {
  if (!(seed instanceof Uint8Array) || seed.length !== SEED_BYTES) throw new Error('bad-seed');
  if (!seed.some((b) => b !== 0)) throw new Error('bad-seed');
}

// ---- base64url (채움 글자 '=' 없음). share.js도 이걸 쓴다 ----
export function bytesToB64u(bytes) {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[n >>> 18] + B64[(n >>> 12) & 63] + B64[(n >>> 6) & 63] + B64[n & 63];
  }
  if (i + 1 === bytes.length) {
    const n = bytes[i] << 16;
    out += B64[n >>> 18] + B64[(n >>> 12) & 63];
  } else if (i + 2 === bytes.length) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[n >>> 18] + B64[(n >>> 12) & 63] + B64[(n >>> 6) & 63];
  }
  return out;
}
const B64_REV = (() => {
  const t = new Int8Array(128).fill(-1);
  for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i;
  return t;
})();
export function b64uToBytes(text) {
  if (typeof text !== 'string') throw new Error('bad-base64');
  const len = text.length;
  if (len % 4 === 1) throw new Error('bad-base64');
  const out = new Uint8Array(Math.floor((len * 3) / 4));
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < len; i++) {
    const c = text.charCodeAt(i);
    const v = c < 128 ? B64_REV[c] : -1;
    if (v < 0) throw new Error('bad-base64');
    acc = ((acc << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >>> bits) & 255;
    }
  }
  return out;
}

/**
 * 씨앗으로 도는 난수기. 씨앗 32바이트 = 처음 상태 s0..s3 (각 8바이트, 낮은 자리 먼저).
 * @returns {{u32:()=>number, u64:()=>[number,number], below:(n:number)=>number}}
 */
export function makeRng(seed) {
  checkSeed(seed);
  const s = new Uint32Array(8); // [s0 아래, s0 위, s1 아래, s1 위, s2 아래, s2 위, s3 아래, s3 위]
  for (let i = 0; i < 8; i++) {
    const p = i * 4;
    s[i] = (seed[p] | (seed[p + 1] << 8) | (seed[p + 2] << 16) | (seed[p + 3] << 24)) >>> 0;
  }
  let outLo = 0;
  let outHi = 0;
  function step() {
    const l = s[2];
    const h = s[3];
    // result = rotl(s1 * 5, 7) * 9
    let ml = (l << 2) >>> 0;
    let mh = ((h << 2) | (l >>> 30)) >>> 0;
    let sum = ml + l;
    const al = sum >>> 0;
    const ah = (mh + h + (sum > 0xffffffff ? 1 : 0)) >>> 0;
    const rl = ((al << 7) | (ah >>> 25)) >>> 0;
    const rh = ((ah << 7) | (al >>> 25)) >>> 0;
    ml = (rl << 3) >>> 0;
    mh = ((rh << 3) | (rl >>> 29)) >>> 0;
    sum = ml + rl;
    outLo = sum >>> 0;
    outHi = (mh + rh + (sum > 0xffffffff ? 1 : 0)) >>> 0;
    // 상태 갱신
    const tl = (l << 17) >>> 0;
    const th = ((h << 17) | (l >>> 15)) >>> 0;
    s[4] ^= s[0]; s[5] ^= s[1]; // s2 ^= s0
    s[6] ^= s[2]; s[7] ^= s[3]; // s3 ^= s1
    s[2] ^= s[4]; s[3] ^= s[5]; // s1 ^= s2
    s[0] ^= s[6]; s[1] ^= s[7]; // s0 ^= s3
    s[4] ^= tl; s[5] ^= th;     // s2 ^= t
    const xl = s[6];
    const xh = s[7];            // s3 = rotl(s3, 45) = 위아래를 바꾼 뒤 rotl 13
    s[6] = ((xh << 13) | (xl >>> 19)) >>> 0;
    s[7] = ((xl << 13) | (xh >>> 19)) >>> 0;
  }
  const src = {
    /** 64비트 한 번: [위 32비트, 아래 32비트] */
    u64() { step(); return [outHi, outLo]; },
    /** 32비트 한 번(64비트 출력의 위쪽 절반) */
    u32() { step(); return outHi; },
  };
  src.below = (n) => below(src, n);
  return src;
}

/** crypto.getRandomValues 를 바로 쓰는 원천(씨앗 없이 한 번 쓰고 버릴 때). */
export function cryptoSource() {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function') throw new Error('no-crypto');
  const buf = new Uint32Array(2);
  const src = {
    u32() { c.getRandomValues(buf); return buf[0]; },
    u64() { c.getRandomValues(buf); return [buf[0], buf[1]]; },
  };
  src.below = (n) => below(src, n);
  return src;
}

/**
 * 0 이상 n 미만의 정수 하나(모든 값이 같은 확률). n은 1 ~ 2^53 사이 정수.
 * n보다 크거나 같은 가장 작은 2의 거듭제곱까지만 비트를 뽑고, n 이상이면 버리고 다시 뽑는다.
 * n = 1이면 난수를 쓰지 않고 0을 돌려준다.
 */
export function below(src, n) {
  if (!Number.isInteger(n) || n < 1 || n > 9007199254740992) throw new RangeError('below: n');
  if (n === 1) return 0;
  if (n <= 4294967296) {
    const shift = Math.clz32(n - 1); // 버릴 비트 수 = 32 - 필요한 비트 수
    for (;;) {
      const x = src.u32() >>> shift;
      if (x < n) return x;
    }
  }
  // 2^32보다 큰 범위: 64비트 출력의 위쪽 bits 비트(33~53)를 쓴다
  const extra = 32 - Math.clz32(Math.floor((n - 1) / 4294967296)); // 32비트를 넘는 비트 수(1~21)
  const scale = 2 ** extra;
  const drop = 32 - extra;
  for (;;) {
    const [hi, lo] = src.u64();
    const x = hi * scale + (lo >>> drop);
    if (x < n) return x;
  }
}
