// 이름 고르기와 확인 코드 (DOM을 모르는 파일)
//
// 왜: 뽑기는 이름을 코드 포인트 순으로 놓은 자리(pick.js)에서 하고, 결과 링크는 "같은 씨앗 + 같은 사람들 = 같은 결과"를 약속한다.
//     그런데 화면에는 똑같이 보이는 이름이 글자열로는 다를 수 있다(폭 없는 공백이 끼었거나, 한글을 풀어쓴 자모로 적었거나).
//     그러면 눈으로는 같은 명단인데 자리가 달라져 다른 사람이 뽑힌다. 그래서 명단이 들어오는 모든 길(입력칸, 붙여 넣기, 링크)에서
//     이름을 한 가지 꼴로 고른다(cleanName). 정해진 자리, 겹친 이름, 확인 코드는 전부 이 꼴로 따진다.
// 무엇을:
//   ① 유니코드 정규화 NFC(풀어쓴 자모·결합 글자를 한 글자로)
//   ② 제어 문자와 빈칸처럼 보이는 글자(한글 채움 글자 U+3164·U+115F·U+1160·U+FFA0, 점자 빈칸 U+2800)는 공백으로
//   ③ 보이지 않는 글자는 지운다. 유니코드의 Default_Ignorable_Code_Point 전부(폭 없는 공백 U+200B·U+200C·U+2060·U+FEFF,
//      방향 표시 U+200E·U+200F·U+202A~202E·U+2066~2069, 소프트 하이픈 U+00AD, 변형 선택자, 꼬리표 글자 …)와
//      줄 사이 주석 표시(U+FFF9~FFFB), 이집트 글자 배치 표시(U+13430~1343F). 범위는 아래에 숫자로 적어 둔다
//      (브라우저마다 유니코드 판이 달라도 같은 결과가 나오게. tests/run.mjs가 노드의 유니코드 표와 전수 대조한다).
//   ④ 그림 글자(이모지) 안에서 뜻이 있는 것은 남긴다: 그림 글자를 잇는 U+200D(가족 👨‍👩‍👧‍👦), 그림 글자 모양으로 바꾸는 U+FE0F(❤️ 1️⃣),
//      잉글랜드·스코틀랜드·웨일스 깃발의 꼬리표. 그 밖의 자리에 있으면 지운다.
//   ⑤ 이어진 공백은 하나로, 앞뒤 공백 없이.
// 알아 둘 것:
//   - 페르시아어의 U+200C, 인도계 글자의 U+200D, 몽골 글자·한자의 변형 선택자도 지운다(모양이 조금 달라질 수 있다).
//   - 그림 글자 판별(\p{Extended_Pictographic}·\p{Emoji_Presentation})은 브라우저의 유니코드 표를 쓴다. 새로 생긴 그림 글자 뒤의
//     U+FE0F처럼 드문 경우에는 오래된 브라우저와 꼴이 다를 수 있다.
//   - 남는 틈: 눈에 같아 보이는 다른 글자(라틴 a와 키릴 а), 나란한 그림 글자 사이의 U+200D. 이건 확인 코드(listCode)로 견준다.

const rx = (src, flags, fallback) => { try { return new RegExp(src, flags); } catch (e) { return fallback; } };
// 유니코드 속성을 모르는 아주 오래된 브라우저에서는 넓게 잡은 범위로 대신한다
const PICT = rx('\\p{Extended_Pictographic}', 'u', /[\u00a9\u00ae\u203c\u2049\u2122\u2139\u2194-\u21aa\u231a-\u23ff\u24c2\u25aa-\u25fe\u2600-\u27bf\u2934\u2935\u2b05-\u2b55\u3030\u303d\u3297\u3299]|[\ud83c-\ud83e][\udc00-\udfff]/);
const PRES = rx('\\p{Emoji_Presentation}', 'u', /[\ud83c-\ud83e][\udc00-\udfff]/);

// ② 공백으로 바꾸는 것: 제어 문자(C0·C1), 한글 채움 글자, 점자 빈칸
const BLANK = /[\u0000-\u001f\u007f-\u009f\u115f\u1160\u2800\u3164\uffa0]/g;
// ③ 지우는 것(그림 글자 안에서만 남기는 U+200D·U+FE0F·꼬리표 U+E0020~E007F는 아래 settle에서 따로 본다)
const HIDDEN = /[\u00ad\u034f\u061c\u17b4\u17b5\u180b-\u180f\u200b\u200c\u200e\u200f\u202a-\u202e\u2060-\u206f\ufe00-\ufe0e\ufeff\ufff0-\ufffb]|\ud80d[\udc30-\udc3f]|\ud82f[\udca0-\udca3]|\ud834[\udd73-\udd7a]|\udb40[\udc00-\udc1f\udc80-\udfff]|[\udb41-\udb43][\udc00-\udfff]/g;
const MAYBE = /[\u200d\ufe0f]|\udb40[\udc20-\udc7f]/; // 자리를 보고 정하는 글자가 있는지
const ZWJ = 0x200d;
const VS16 = 0xfe0f;
const KEYCAP = '\u20e3';
const BLACK_FLAG = '\u{1f3f4}';
const tag = (word) => Array.from(word, (ch) => String.fromCodePoint(0xe0000 + ch.charCodeAt(0))).join('') + '\u{e007f}';
const FLAG_TAGS = [tag('gbeng'), tag('gbsct'), tag('gbwls')]; // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 🏴󠁧󠁢󠁳󠁣󠁴󠁿 🏴󠁧󠁢󠁷󠁬󠁳󠁿
const isPict = (ch) => ch !== undefined && PICT.test(ch);
const isSkin = (ch) => { const c = ch === undefined ? 0 : ch.codePointAt(0); return c >= 0x1f3fb && c <= 0x1f3ff; };

/** 깨진 이모지 반쪽(짝 없는 대리 문자)은 대체 문자(U+FFFD)로 */
function wellFormed(s) {
  return typeof s.toWellFormed === 'function' ? s.toWellFormed()
    : s.replace(/[\ud800-\udbff](?![\udc00-\udfff])|([^\ud800-\udbff]|^)[\udc00-\udfff]/g, '$1\ufffd');
}

/** ④ U+200D·U+FE0F·꼬리표 글자: 그림 글자 안에서 뜻이 있는 자리에 있을 때만 남긴다. */
function settle(s) {
  const a = Array.from(s);
  const out = [];
  for (let i = 0; i < a.length; i++) {
    const ch = a[i];
    const cp = ch.codePointAt(0);
    const prev = out[out.length - 1];
    if (cp === VS16) {
      // 글자 모양이 기본인 그림 글자(❤ ☀ 🏳 …) 바로 뒤, 또는 숫자 단추(1️⃣ = 1 + U+FE0F + U+20E3)에서만
      if ((isPict(prev) && !PRES.test(prev)) || (prev !== undefined && /^[0-9#*]$/.test(prev) && a[i + 1] === KEYCAP)) out.push(ch);
    } else if (cp === ZWJ) {
      // 앞이 그림 글자(또는 그 뒤에 붙은 U+FE0F·피부색·깃발 꼬리표의 끝)이고 바로 다음이 그림 글자일 때만
      const afterPict = isPict(prev) || prev === '\ufe0f' || prev === '\u{e007f}' || (isSkin(prev) && isPict(out[out.length - 2]));
      if (afterPict && isPict(a[i + 1])) out.push(ch);
    } else if (cp >= 0xe0020 && cp <= 0xe007f) {
      // 검은 깃발 바로 뒤에 정해진 세 가지 꼬리표가 통째로 있을 때만
      const run = a.slice(i, i + 6).join('');
      if (prev === BLACK_FLAG && FLAG_TAGS.includes(run)) { out.push(...a.slice(i, i + 6)); i += 5; }
    } else out.push(ch);
  }
  return out.join('');
}

/** 이름 한 줄을 한 가지 꼴로 고른다(위 ①~⑤). 같은 글자열을 다시 넣어도 그대로다. */
export function cleanName(s) {
  s = wellFormed(String(s)).replace(BLANK, ' ').replace(HIDDEN, '');
  if (MAYBE.test(s)) s = settle(s);
  if (typeof s.normalize === 'function') s = s.normalize('NFC');
  return s.replace(/\s+/g, ' ').trim();
}

// 공백 글자(자바스크립트의 \s에서 U+FEFF를 뺀 것: U+FEFF는 보이지 않는 글자로 보고 지운다)와 제어 문자
const SPACES = /[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\u0000-\u001f\u007f-\u009f]+/g;

/** 옛 다듬기: 제어 문자·공백 글자를 공백 하나로, 앞뒤 공백 없이(보이지 않는 글자와 정규화는 건드리지 않는다). */
export function plainName(s) {
  return String(s).replace(SPACES, ' ').replace(/^ | $/g, '');
}

/** 보이지 않는 글자를 지웠는지(정규화·공백 정리만 한 것과 고른 꼴이 다른지). 명단 칸의 알림에 쓴다. */
export function hadHidden(s) {
  s = wellFormed(String(s));
  return plainName(typeof s.normalize === 'function' ? s.normalize('NFC') : s) !== cleanName(s);
}

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

// ---------- 확인 코드 ----------
// 명단을 짧게 줄인 값. 뽑기 전에 명단과 함께 올려 두면, 결과 링크를 연 사람이 이름을 하나하나 대조하지 않고 코드만 견주면 된다.
//   명단 확인 코드 = SHA-256( 고른 이름들을 코드 포인트 순으로 놓고 줄바꿈(\n)으로 이은 글의 UTF-8 )의 앞 8자리(16진수).
//                    사람들이 같으면 순서가 달라도 같다(돌림판·제비뽑기·팀 나누기의 결과가 순서와 무관한 것과 같다).
//   사다리 확인 코드 = SHA-256( 이름들을 줄 순서대로 \n으로 잇고, 빈 줄 하나(\n\n) 뒤에 아래 칸을 적은 순서대로 \n으로 이은 글 )의 앞 8자리.
//                    사다리는 줄 순서와 아래 칸 순서가 결과의 일부라서 순서까지 넣는다.
// 8자리(32비트)라 우연히 같을 일은 약 43억 분의 1이지만, 암호 수준의 증명은 아니다(작정하고 계산해 맞춘 가짜까지 막지는 못한다).

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);

/** 글의 UTF-8 바이트에 대한 SHA-256(16진수 64자). 표준 그대로(FIPS 180-4). */
export function sha256Hex(text) {
  const src = new TextEncoder().encode(String(text));
  const len = src.length;
  const total = (((len + 8) >> 6) + 1) << 6; // 0x80 한 바이트 + 길이 8바이트를 넣고 64바이트 단위로
  const m = new Uint8Array(total);
  m.set(src);
  m[len] = 0x80;
  const bits = len * 8;
  const view = new DataView(m.buffer);
  view.setUint32(total - 8, Math.floor(bits / 4294967296));
  view.setUint32(total - 4, bits >>> 0);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  return Array.from(h, (v) => v.toString(16).padStart(8, '0')).join('');
}

export const CODE_LENGTH = 8;

/** 명단 확인 코드: 사람들이 같으면 순서가 달라도 같다. */
export function listCode(items) {
  const names = items.map(cleanName).filter((s) => s !== '');
  names.sort(compareCodePoints);
  return sha256Hex(names.join('\n')).slice(0, CODE_LENGTH);
}

/** 사다리 확인 코드: 줄 순서와 아래 칸(적은 순서)까지 넣는다. */
export function ladderCode(items, labels) {
  const names = items.map(cleanName).filter((s) => s !== '');
  const below = (labels || []).map(cleanName).filter((s) => s !== '');
  return sha256Hex(names.join('\n') + '\n\n' + below.join('\n')).slice(0, CODE_LENGTH);
}
