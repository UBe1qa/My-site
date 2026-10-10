// 명단 읽기와 공유 링크 (DOM을 모르는 파일)
//
// 공유 링크는 주소의 # 뒤에만 담는다(# 뒤는 서버로 가지 않는다):
//   #r=2.<도구 한 글자>.<씨앗 43자>.<base64url(UTF-8(JSON {"o":설정,"i":명단}))>
// 맨 앞 숫자는 형식 번호. 뽑는 방식이 바뀌면 번호를 올리고, 옛 번호 링크는 옛 방식으로 계속 열리게 둔다.
//   1 = 처음 형식(2026-10-09): 돌림판·제비뽑기·팀 나누기가 명단에 '넣은 순서'를 자리로 썼다.
//   2 = 지금(2026-10-10): 그 셋이 '코드 포인트 순으로 놓은 자리'를 쓴다(pick.js). 순서만 바꾼 링크도 같은 결과.
//       사다리·숫자·동전·주사위는 1과 2가 같은 방식이다.
// 받은 링크는 믿지 않는다: 형식·크기·글자 종류를 전부 확인하고, 화면에는 글자(textContent)로만 넣는다.
// 이름은 들어오는 모든 길(입력칸, 붙여 넣기, 링크)에서 한 가지 꼴로 고른다(name.js의 cleanName: NFC, 보이지 않는 글자 없음).
//   - 이 사이트가 만드는 링크에는 고른 꼴의 이름만 들어간다(encodeShare).
//   - 받은 링크의 이름이 고른 꼴이 아니면(보이지 않는 글자가 끼었거나 풀어쓴 자모) 고쳐서 읽고 cleaned = true로 알린다.
//     화면은 "정리한 명단으로 다시 계산한 결과"라고 밝히고 '링크의 결과 그대로' 표시를 붙이지 않는다.

import { LIMITS } from './pick.js';
import { bytesToB64u, b64uToBytes, seedToText, seedFromText } from './rng.js';
import { cleanName, hadHidden, plainName } from './name.js';

export { cleanName };

export const SHARE_VERSION = 2;
export const SHARE_VERSIONS = [1, 2]; // 읽을 수 있는 형식 번호
export const TOOLS = { wheel: 'w', ladder: 'l', draw: 'd', teams: 't', number: 'n', coin: 'c', dice: 'x' };
const TOOL_BY_CODE = Object.fromEntries(Object.entries(TOOLS).map(([k, v]) => [v, k]));
const LIST_TOOLS = ['wheel', 'ladder', 'draw', 'teams']; // 명단을 쓰는 도구
export const MAX_HASH = 400000; // 글자 수 한도('r='부터 센다). 이보다 긴 링크는 만들지도 읽지도 않는다
const MAX_OPT_KEYS = 16;

// ---------- 명단 읽기 ----------

/**
 * 붙여 넣은 글을 명단으로. 줄바꿈이 있으면 줄마다, 없으면 쉼표(, ， 、)나 탭으로 나눈다.
 * 이름마다 한 가지 꼴로 고르고(cleanName) 빈 줄은 뺀다. 같은 이름은 지우지 않는다(두 번 넣으면 두 칸).
 * @returns {{items:string[], cut:number, over:number, dupes:number, tabs:number, split:boolean, hidden:number}}
 *   cut = 너무 길어 잘린 이름 수, over = 한도를 넘어 빠진 이름 수, dupes = 겹치는 이름 수,
 *   tabs = 여러 줄일 때 탭(엑셀의 칸 나눔)이 든 줄 수, split = 한 줄을 쉼표·탭으로 나눴는지,
 *   hidden = 보이지 않는 글자를 지우고 읽은 줄 수
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
  let hidden = 0;
  for (const raw of parts) {
    let p = cleanName(raw);
    if (hadHidden(raw)) hidden++;
    if (opt.stripNumbers) p = p.replace(/^\d{1,4}[.)]\s+/, '');
    if (!p) continue;
    const chars = Array.from(p);
    // 100자에서 자른다. 자른 자리가 그림 글자 한가운데면 남은 반쪽(잇는 표시 등)도 정리한다
    if (chars.length > LIMITS.nameLength) { p = cleanName(chars.slice(0, LIMITS.nameLength).join('')); cut++; }
    if (items.length >= max) { over++; continue; }
    items.push(p);
  }
  const seen = new Set();
  let dupes = 0;
  for (const it of items) { if (seen.has(it)) dupes++; else seen.add(it); }
  return { items, cut, over, dupes, tabs, split: split && items.length > 1, hidden };
}

/** 여러 칸을 같이 붙여 넣은 글에서 줄마다 첫 칸(탭 앞)만 남긴다. 첫 칸이 빈 줄은 그 줄에서 처음 나오는 내용 있는 칸. */
export function firstColumn(text) {
  return String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n')
    .map((line) => { const cells = line.split('\t'); return cells.find((c) => c.trim() !== '') || ''; })
    .join('\n');
}

const tableRows = (text) => String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n').map((line) => line.split('\t'));

/**
 * 여러 칸을 같이 붙여 넣은 글의 칸들(내용이 하나라도 있는 칸만). 어느 칸을 명단으로 쓸지 고르게 하려고 쓴다.
 * @returns {{index:number, count:number, sample:string[], numeric:boolean}[]}
 *   index = 몇 번째 칸(0부터), count = 내용이 있는 줄 수, sample = 앞의 두 값, numeric = 번호뿐인 칸인지(숫자와 . ) - 만)
 */
export function columns(text) {
  const rows = tableRows(text);
  let width = 0;
  for (const r of rows) if (r.length > width) width = r.length;
  const out = [];
  for (let k = 0; k < width; k++) {
    const cells = [];
    for (const r of rows) { const c = r[k] === undefined ? '' : cleanName(r[k]); if (c) cells.push(c); }
    if (cells.length) out.push({ index: k, count: cells.length, sample: cells.slice(0, 2), numeric: cells.every((c) => /^[0-9０-９][0-9０-９.)\- ]*$/.test(c)) });
  }
  return out;
}

/** 여러 칸을 같이 붙여 넣은 글에서 k번째 칸(0부터)만 남긴다. 그 칸이 빈 줄은 뺀다. */
export function pickColumn(text, k) {
  return tableRows(text).map((r) => (r[k] === undefined ? '' : r[k])).filter((c) => c.trim() !== '').join('\n');
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
  const note = { strict: true, cleaned: false };
  const items = checkItems(data.items || [], note); // 고른 꼴이 아닌 이름으로는 만들지 않는다
  const opts = checkOpts(data.opts || {}, note);
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
 * @returns {{ok:true, version:number, tool:string, seed:Uint8Array, items:string[], opts:Object, cleaned:boolean} | {ok:false, reason:string}}
 *   reason: 'none'(공유 링크 아님) | 'too-long' | 'format' | 'version' | 'tool' | 'seed' | 'data'
 *   cleaned: 링크 속 이름(또는 아래 칸·쪽지에 쓴 말)이 고른 꼴이 아니어서 고쳐 읽었는지.
 *            (보이지 않는 글자가 끼어 있었거나 풀어쓴 자모였다. 그런 이름만으로 된 줄은 뺀다.) items·opts는 고친 뒤의 것이다.
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
  const note = { strict: false, cleaned: false };
  try {
    items = checkItems(obj.i === undefined ? [] : obj.i, note);
    opts = checkOpts(obj.o === undefined ? {} : obj.o, note);
  } catch (e) { return fail('data'); }
  return { ok: true, version, tool, seed, items, opts, cleaned: note.cleaned };
}

function fail(reason) { return { ok: false, reason }; }

// 글 하나 확인. 공백을 다듬지 않았거나 제어 문자가 들었거나 너무 길거나 깨진 반쪽이 있으면 거절한다(이 사이트가 만든 적 없는 꼴).
// 고른 꼴이 아닌 것(보이지 않는 글자·풀어쓴 자모): 링크를 만들 때(strict)는 거절, 읽을 때는 고쳐서 돌려주고 note.cleaned를 켠다.
function checkText(s, note, error) {
  if (typeof s !== 'string' || s !== plainName(s) || Array.from(s).length > LIMITS.nameLength || !isWellFormed(s)) throw new Error(error);
  const c = cleanName(s);
  if (c !== s) {
    if (note.strict) throw new Error(error);
    note.cleaned = true;
  }
  return c;
}

function checkItems(items, note) {
  if (!Array.isArray(items) || items.length > LIMITS.items) throw new Error('share-items');
  const out = [];
  for (const s of items) {
    if (s === '') throw new Error('share-items');
    const c = checkText(s, note, 'share-items');
    if (c !== '') out.push(c); // 보이지 않는 글자뿐이던 이름은 뺀다(cleaned가 켜져 있다)
  }
  return out;
}

// 설정: 한 겹짜리 {영문 키: 숫자 | 참거짓 | 짧은 글 | 짧은 글 배열}만 받는다
function checkOpts(opts, note) {
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) throw new Error('share-opts');
  const keys = Object.keys(opts);
  if (keys.length > MAX_OPT_KEYS) throw new Error('share-opts');
  const out = {};
  for (const k of keys) {
    if (!/^[a-z][a-zA-Z0-9]{0,15}$/.test(k)) throw new Error('share-opts');
    const v = opts[k];
    if (typeof v === 'number') { if (!Number.isSafeInteger(v)) throw new Error('share-opts'); out[k] = v; }
    else if (typeof v === 'string') out[k] = checkText(v, note, 'share-opts');
    else if (Array.isArray(v)) { if (v.length > LIMITS.ladderMax * 2) throw new Error('share-opts'); out[k] = []; for (const x of v) { const c = checkText(x, note, 'share-opts'); if (c !== '' || x === '') out[k].push(c); } } // 보이지 않는 글자뿐이던 말은 뺀다
    else if (typeof v === 'boolean') out[k] = v;
    else throw new Error('share-opts');
  }
  return out;
}

/**
 * 최근 결과 기록에 이 명단의 이름이 남아 있는지(명단을 지운 뒤 '기록도 지우기'를 물을지 정할 때 쓴다).
 * @param {{t:string, s:string, h:string}[]} entries 기록(t = 도구, s = 결과 요약, h = '#r=…' 링크 또는 빈 글자)
 * @param {string[]} names 방금 지운 명단
 */
export function historyHolds(entries, names) {
  const mine = new Set(names);
  if (!mine.size || !Array.isArray(entries)) return false;
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue;
    if (e.h) {
      const d = decodeShare(e.h);
      if (d.ok && d.items.some((n) => mine.has(n))) return true;
    } else if (LIST_TOOLS.includes(e.t) && typeof e.s === 'string') {
      // 링크를 남기지 않은 기록(아주 긴 명단): 결과 요약에 이름이 그대로 적혀 있다
      for (const n of mine) if (e.s.includes(n)) return true;
    }
  }
  return false;
}

// 짝이 안 맞는 대리 문자(깨진 이모지 반쪽)가 없는지
function isWellFormed(s) {
  if (typeof s.isWellFormed === 'function') return s.isWellFormed();
  return !/[\ud800-\udbff](?![\udc00-\udfff])|(?:[^\ud800-\udbff]|^)[\udc00-\udfff]/.test(s);
}
