// 명단 읽기와 공유 링크 (DOM을 모르는 파일)
//
// 공유 링크는 주소의 # 뒤에만 담는다(# 뒤는 서버로 가지 않는다):
//   #r=2.<도구 한 글자>.<씨앗 43자>.<base64url(UTF-8(JSON {"o":설정,"i":명단}))>
// 맨 앞 숫자는 형식 번호. 뽑는 방식이 바뀌면 번호를 올리고, 옛 번호 링크는 옛 방식으로 계속 열리게 둔다.
//   1 = 처음 형식(2026-10-09): 돌림판·제비뽑기·팀 나누기가 명단에 '넣은 순서'를 자리로 썼다.
//   2 = 지금(2026-10-10): 그 셋이 '코드 포인트 순으로 놓은 자리'를 쓴다(pick.js). 순서만 바꾼 링크도 같은 결과.
//       사다리·숫자·동전·주사위는 1과 2가 같은 방식이다.
// 받은 링크는 믿지 않는다: 형식·크기·글자 종류를 전부 확인하고, 화면에는 글자(textContent)로만 넣는다.

import { LIMITS } from './pick.js';
import { bytesToB64u, b64uToBytes, seedToText, seedFromText } from './rng.js';

export const SHARE_VERSION = 2;
export const SHARE_VERSIONS = [1, 2]; // 읽을 수 있는 형식 번호
export const TOOLS = { wheel: 'w', ladder: 'l', draw: 'd', teams: 't', number: 'n', coin: 'c', dice: 'x' };
const TOOL_BY_CODE = Object.fromEntries(Object.entries(TOOLS).map(([k, v]) => [v, k]));
export const MAX_HASH = 400000; // 글자 수 한도('r='부터 센다). 이보다 긴 링크는 만들지도 읽지도 않는다
const MAX_OPT_KEYS = 16;

// ---------- 명단 읽기 ----------

/**
 * 붙여 넣은 글을 명단으로. 줄바꿈이 있으면 줄마다, 없으면 쉼표(, ， 、)나 탭으로 나눈다.
 * 앞뒤 공백을 지우고 빈 줄은 뺀다. 같은 이름은 지우지 않는다(두 번 넣으면 두 칸).
 * @returns {{items:string[], cut:number, over:number, dupes:number, tabs:number, split:boolean}}
 *   cut = 너무 길어 잘린 이름 수, over = 한도를 넘어 빠진 이름 수, dupes = 겹치는 이름 수,
 *   tabs = 여러 줄일 때 탭(엑셀의 칸 나눔)이 든 줄 수, split = 한 줄을 쉼표·탭으로 나눴는지
 */
export function parseList(text, opt = {}) {
  const max = opt.max == null ? LIMITS.items : opt.max;
  const src = String(text == null ? '' : text).replace(/\r\n?/g, '\n').replace(/[\u2028\u2029\u0085\v\f]/g, '\n');
  let parts;
  let tabs = 0;      // 여러 줄인데 탭이 든 줄 수(엑셀에서 여러 칸을 같이 붙여 넣은 표시)
  let split = false; // 한 줄뿐이라 쉼표·탭으로 나눴는지
  if (/\n/.test(src.trim())) {
    parts = src.split('\n');
    for (const p of parts) if (/\S\t+\S/.test(p)) tabs++;
  } else if (/[,，、\t]/.test(src)) { parts = src.split(/[,，、\t]/); split = true; }
  else parts = [src];
  const items = [];
  let cut = 0;
  let over = 0;
  for (let p of parts) {
    p = cleanName(p);
    if (opt.stripNumbers) p = p.replace(/^\d{1,4}[.)]\s+/, '');
    if (!p) continue;
    const chars = Array.from(p);
    if (chars.length > LIMITS.nameLength) { p = chars.slice(0, LIMITS.nameLength).join(''); cut++; }
    if (items.length >= max) { over++; continue; }
    items.push(p);
  }
  const seen = new Set();
  let dupes = 0;
  for (const it of items) { if (seen.has(it)) dupes++; else seen.add(it); }
  return { items, cut, over, dupes, tabs, split: split && items.length > 1 };
}

/** 여러 칸을 같이 붙여 넣은 글에서 줄마다 첫 칸(탭 앞)만 남긴다. 첫 칸이 빈 줄은 그 줄에서 처음 나오는 내용 있는 칸. */
export function firstColumn(text) {
  return String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n')
    .map((line) => { const cells = line.split('\t'); return cells.find((c) => c.trim() !== '') || ''; })
    .join('\n');
}

/** 이름 한 줄 다듬기: 제어 문자를 공백으로, 이어진 공백은 하나로, 앞뒤 공백 없이. */
export function cleanName(s) {
  s = String(s);
  // 깨진 이모지 반쪽(짝 없는 대리 문자)은 링크에 담을 수 없어서 대체 문자(U+FFFD)로 바꾼다
  s = typeof s.toWellFormed === 'function' ? s.toWellFormed()
    : s.replace(/[\ud800-\udbff](?![\udc00-\udfff])|([^\ud800-\udbff]|^)[\udc00-\udfff]/g, '$1\ufffd');
  return s.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 겹치는 이름을 처음 것만 남긴다. */
export function uniqueItems(items) {
  return [...new Set(items)];
}

// ---------- 공유 링크 ----------

/**
 * @param {{tool:string, seed:Uint8Array, items?:string[], opts?:Object}} data
 * @returns {string} '#'를 뺀 해시 문자열 ('r=2.w.…'). 한도(MAX_HASH)를 넘으면 'share-too-long' 오류(열 수 없는 링크를 만들지 않는다).
 *   data.version: 옛 형식(1)으로 받은 결과를 다시 링크로 만들 때만 1을 준다(옛 방식의 결과가 옛 방식으로 다시 열리게).
 */
export function encodeShare(data) {
  const code = TOOLS[data.tool];
  if (!code) throw new Error('share-tool');
  const version = data.version == null ? SHARE_VERSION : data.version;
  if (!SHARE_VERSIONS.includes(version)) throw new Error('share-version');
  const items = checkItems(data.items || []);
  const opts = checkOpts(data.opts || {});
  const json = JSON.stringify({ o: opts, i: items });
  const body = bytesToB64u(new TextEncoder().encode(json));
  const out = `r=${version}.${code}.${seedToText(data.seed)}.${body}`;
  if (out.length > MAX_HASH) throw new Error('share-too-long');
  return out;
}

/** 이 명단·설정으로 링크를 만들면 몇 글자인지('r='부터). 만들지 않고 길이만 잰다. */
export function shareLength(items, opts) {
  const bytes = new TextEncoder().encode(JSON.stringify({ o: opts || {}, i: items || [] })).length;
  return 2 + String(SHARE_VERSION).length + 1 + 1 + 1 + 43 + 1 + Math.ceil((bytes * 4) / 3);
}

/**
 * @param {string} hash location.hash 그대로('#' 있어도 됨)
 * @returns {{ok:true, version:number, tool:string, seed:Uint8Array, items:string[], opts:Object} | {ok:false, reason:string}}
 *   reason: 'none'(공유 링크 아님) | 'too-long' | 'format' | 'version' | 'tool' | 'seed' | 'data'
 */
export function decodeShare(hash) {
  if (typeof hash !== 'string') return fail('none');
  let h = hash.charAt(0) === '#' ? hash.slice(1) : hash;
  if (h.slice(0, 2) !== 'r=') return fail('none');
  if (h.length > MAX_HASH) return fail('too-long');
  h = h.slice(2);
  const parts = h.split('.');
  if (parts.length !== 4) return fail('format');
  if (!/^[0-9]{1,3}$/.test(parts[0])) return fail('format');
  const version = Number(parts[0]);
  if (!SHARE_VERSIONS.includes(version)) return fail('version');
  const tool = TOOL_BY_CODE[parts[1]];
  if (!tool) return fail('tool');
  let seed;
  try { seed = seedFromText(parts[2]); } catch (e) { return fail('seed'); }
  let obj;
  try {
    const bytes = b64uToBytes(parts[3]);
    obj = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (e) { return fail('data'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return fail('data');
  let items;
  let opts;
  try {
    items = checkItems(obj.i === undefined ? [] : obj.i);
    opts = checkOpts(obj.o === undefined ? {} : obj.o);
  } catch (e) { return fail('data'); }
  return { ok: true, version, tool, seed, items, opts };
}

function fail(reason) { return { ok: false, reason }; }

function checkItems(items) {
  if (!Array.isArray(items) || items.length > LIMITS.items) throw new Error('share-items');
  return items.map((s) => {
    if (typeof s !== 'string') throw new Error('share-items');
    if (s !== cleanName(s) || s === '' || Array.from(s).length > LIMITS.nameLength) throw new Error('share-items');
    if (!isWellFormed(s)) throw new Error('share-items');
    return s;
  });
}

// 설정: 한 겹짜리 {영문 키: 숫자 | 참거짓 | 짧은 글 | 짧은 글 배열}만 받는다
function checkOpts(opts) {
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) throw new Error('share-opts');
  const keys = Object.keys(opts);
  if (keys.length > MAX_OPT_KEYS) throw new Error('share-opts');
  const out = {};
  for (const k of keys) {
    if (!/^[a-z][a-zA-Z0-9]{0,15}$/.test(k)) throw new Error('share-opts');
    const v = opts[k];
    if (typeof v === 'number') { if (!Number.isSafeInteger(v)) throw new Error('share-opts'); }
    else if (typeof v === 'string') checkOptText(v);
    else if (Array.isArray(v)) { if (v.length > LIMITS.ladderMax * 2) throw new Error('share-opts'); v.forEach(checkOptText); }
    else if (typeof v !== 'boolean') throw new Error('share-opts');
    out[k] = Array.isArray(v) ? v.slice() : v;
  }
  return out;
}
function checkOptText(v) {
  if (typeof v !== 'string' || v !== cleanName(v) || Array.from(v).length > LIMITS.nameLength || !isWellFormed(v)) throw new Error('share-opts');
}

// 짝이 안 맞는 대리 문자(깨진 이모지 반쪽)가 없는지
function isWellFormed(s) {
  if (typeof s.isWellFormed === 'function') return s.isWellFormed();
  return !/[\ud800-\udbff](?![\udc00-\udfff])|(?:[^\ud800-\udbff]|^)[\udc00-\udfff]/.test(s);
}
