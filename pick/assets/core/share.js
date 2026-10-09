// 명단 읽기와 공유 링크 (DOM을 모르는 파일)
//
// 공유 링크는 주소의 # 뒤에만 담는다(# 뒤는 서버로 가지 않는다):
//   #r=1.<도구 한 글자>.<씨앗 43자>.<base64url(UTF-8(JSON {"o":설정,"i":명단}))>
// 맨 앞 1은 형식 번호. 뽑는 방식이 바뀌면 번호를 올리고, 옛 번호 링크는 옛 방식으로 계속 열리게 둔다.
// 받은 링크는 믿지 않는다: 형식·크기·글자 종류를 전부 확인하고, 화면에는 글자(textContent)로만 넣는다.

import { LIMITS } from './pick.js';
import { bytesToB64u, b64uToBytes, seedToText, seedFromText } from './rng.js';

export const SHARE_VERSION = 1;
export const TOOLS = { wheel: 'w', ladder: 'l', draw: 'd', teams: 't', number: 'n', coin: 'c', dice: 'x' };
const TOOL_BY_CODE = Object.fromEntries(Object.entries(TOOLS).map(([k, v]) => [v, k]));
const MAX_HASH = 400000; // 글자 수 한도(이보다 긴 링크는 읽지 않는다)
const MAX_OPT_KEYS = 16;

// ---------- 명단 읽기 ----------

/**
 * 붙여 넣은 글을 명단으로. 줄바꿈이 있으면 줄마다, 없으면 쉼표(, ， 、)나 탭으로 나눈다.
 * 앞뒤 공백을 지우고 빈 줄은 뺀다. 같은 이름은 지우지 않는다(두 번 넣으면 두 칸).
 * @returns {{items:string[], cut:number, over:number, dupes:number}}
 *   cut = 너무 길어 잘린 이름 수, over = 한도를 넘어 빠진 이름 수, dupes = 겹치는 이름 수
 */
export function parseList(text, opt = {}) {
  const max = opt.max == null ? LIMITS.items : opt.max;
  const src = String(text == null ? '' : text).replace(/\r\n?/g, '\n').replace(/[\u2028\u2029\u0085\v\f]/g, '\n');
  let parts;
  if (/\n/.test(src.trim())) parts = src.split('\n');
  else if (/[,，、\t]/.test(src)) parts = src.split(/[,，、\t]/);
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
  return { items, cut, over, dupes };
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
 * @returns {string} '#'를 뺀 해시 문자열 ('r=1.w.…')
 */
export function encodeShare(data) {
  const code = TOOLS[data.tool];
  if (!code) throw new Error('share-tool');
  const items = checkItems(data.items || []);
  const opts = checkOpts(data.opts || {});
  const json = JSON.stringify({ o: opts, i: items });
  const body = bytesToB64u(new TextEncoder().encode(json));
  return `r=${SHARE_VERSION}.${code}.${seedToText(data.seed)}.${body}`;
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
  if (version !== SHARE_VERSION) return fail('version');
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
