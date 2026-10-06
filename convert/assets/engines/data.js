// 표 데이터 엔진: CSV·JSON은 직접 만든 순수 함수(테스트: _dev/test_data.mjs), 엑셀은 SheetJS.
// RFC 4180 CSV: 쉼표·큰따옴표·줄바꿈이 든 칸은 큰따옴표로 감싸고, 안의 큰따옴표는 두 번 쓴다.

export const BOM = '﻿';

// 구분자 고르기: 첫 몇 줄(따옴표 밖)에서 쉼표·세미콜론·탭 중 줄마다 같은 수로 가장 많이 나오는 것
export function detectDelimiter(text) {
  const cands = [',', ';', '\t', '|'];
  const lines = [];
  let cur = '', q = false;
  for (let i = 0; i < text.length && lines.length < 20; i++) {
    const ch = text[i];
    if (ch === '"') q = !q;
    if (!q && (ch === '\n' || ch === '\r')) { if (cur) lines.push(cur); cur = ''; if (ch === '\r' && text[i + 1] === '\n') i++; continue; }
    cur += q && ch !== '"' ? '' : ch;
  }
  if (cur) lines.push(cur);
  let best = ',', bestScore = 0;
  for (const d of cands) {
    const counts = lines.map((l) => l.split(d).length - 1);
    if (!counts.length || counts[0] === 0) continue;
    const same = counts.filter((c) => c === counts[0]).length;
    const score = same * 100 + counts[0];
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

export function parseCSV(text, delim) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const d = delim || detectDelimiter(text);
  const rows = [];
  let row = [], field = '', i = 0, q = false;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        q = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { q = true; i++; continue; }
    if (ch === d) { row.push(field); field = ''; i++; continue; }
    if (ch === '\r' || ch === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
      i++; continue;
    }
    field += ch; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return { rows, delimiter: d };
}

const NUM = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;
function typed(v) {
  // 앞자리 0(우편번호·전화번호 010…)과 너무 큰 정수는 글자 그대로 둔다
  if (NUM.test(v)) { const x = Number(v); if (/[.eE]/.test(v) || Number.isSafeInteger(x)) return x; return v; }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  return v;
}

// rows → JSON 값. header: 첫 줄을 키로(객체 배열) / 아니면 배열의 배열
export function rowsToJson(rows, { header = true, types = false } = {}) {
  const conv = types ? typed : (v) => v;
  if (!header) return rows.map((r) => r.map(conv));
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((k, i) => (k === '' ? 'column' + (i + 1) : k));
  const seen = {};
  const uniq = keys.map((k) => { if (seen[k]) { seen[k]++; return k + '_' + seen[k]; } seen[k] = 1; return k; });
  return body.filter((r) => !(r.length === 1 && r[0] === '')).map((r) => {
    const o = {};
    uniq.forEach((k, i) => { o[k] = conv(r[i] ?? ''); });
    return o;
  });
}

function cell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function quote(s, d) {
  return /["\r\n]/.test(s) || s.includes(d) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(rows, { delimiter = ',', bom = false } = {}) {
  const text = rows.map((r) => r.map((v) => quote(cell(v), delimiter)).join(delimiter)).join('\r\n');
  return (bom ? BOM : '') + text + (rows.length ? '\r\n' : '');
}

// JSON 값 → rows. 객체 배열이면 모든 키의 합집합이 머리줄(처음 나온 순서), 배열의 배열이면 그대로, 객체 하나면 한 줄.
export function jsonToRows(value) {
  if (!Array.isArray(value)) {
    if (value && typeof value === 'object') {
      const arr = Object.values(value).find(Array.isArray);
      value = arr && Object.keys(value).length === 1 ? arr : [value];
    } else throw Object.assign(new Error('shape'), { code: 'json-shape' });
  }
  if (value.every(Array.isArray)) return value;
  const keys = [];
  const seen = new Set();
  for (const o of value) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw Object.assign(new Error('mixed'), { code: 'json-shape' });
    for (const k of Object.keys(o)) if (!seen.has(k)) { seen.add(k); keys.push(k); }
  }
  return [keys, ...value.map((o) => keys.map((k) => o[k]))];
}

export async function readText(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  // UTF-8로 읽다 깨지면(한국 엑셀이 저장한 CP949 CSV) EUC-KR로 다시
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(buf), encoding: 'UTF-8' }; }
  catch (e) {
    try { return { text: new TextDecoder('euc-kr').decode(buf), encoding: 'EUC-KR' }; }
    catch (e2) { return { text: new TextDecoder('utf-8').decode(buf), encoding: 'UTF-8' }; }
  }
}

// 엑셀(SheetJS)
let xlsxP = null;
const xlsx = () => (xlsxP ||= import('/assets/vendor/xlsx.mjs'));

export async function readWorkbook(file) {
  const X = await xlsx();
  try { return X.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: false }); }
  catch (e) { throw Object.assign(new Error('xlsx'), { code: 'xlsx' }); }
}

export async function sheetToRows(wb, name) {
  const X = await xlsx();
  return X.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '', blankrows: true });
}

export async function rowsToXlsx(rows, sheetName) {
  const X = await xlsx();
  const ws = X.utils.aoa_to_sheet(rows);
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, ws, (sheetName || 'Sheet1').slice(0, 31));
  const out = X.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
