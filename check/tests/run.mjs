// 기기 테스트 로직 시험: node check/tests/run.mjs  (추가 설치 없이 돈다)
// 기준값은 다른 방법으로 구한 것:
//   cases.json        = tests/gen_cases.py (파이썬 statistics·math, 구간 목록에서 직접 센 키 정답)
//   ref-us-codes.json = Playwright 미국 자판 표의 code 이름(tests/gen_ref_codes.py)
//   그 밖은 손으로 따진 예시(값 옆에 따진 식을 적었다).
// CK_ASSETS=<폴더> 를 주면 그 폴더의 ck-*.js 를 시험한다(tests/mutants.mjs 가 쓴다).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const A = process.env.CK_ASSETS || path.join(HERE, '..', 'assets');
const CK = require(path.join(A, 'ck-keys.js'));
require(path.join(A, 'ck-measure.js'));
const load = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));
const C = load('cases.json');
const REF = load('ref-us-codes.json');

let pass = 0, fail = 0, group = '';
const fails = [], perGroup = {};
function ok(cond, label, detail) {
  perGroup[group] = perGroup[group] || [0, 0];
  if (cond) { pass++; perGroup[group][0]++; }
  else { fail++; perGroup[group][1]++; if (fails.length < 60) fails.push(`[${group}] ${label}${detail ? '\n      ' + detail : ''}`); }
  return cond;
}
const eq = (got, want, label) => ok(JSON.stringify(got) === JSON.stringify(want), label, `got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`);
const inf = (v) => (v === '-inf' ? -Infinity : v);
function near(got, want, tol, label) {
  want = inf(want);
  if (want === null || want === -Infinity || want === Infinity) return ok(got === want, label, `got ${got}, want ${want}`);
  return ok(typeof got === 'number' && Math.abs(got - want) <= tol, label, `got ${got}, want ${want} (±${tol})`);
}
const rel = (got, want, r, label) => near(got, want, Math.abs(want) * r + 1e-12, label);

/* ───────────── 1. 자판 배열 ───────────── */
group = 'layout';
{
  const full = CK.layout('full'), tkl = CK.layout('tkl'), mac = CK.layout('mac');
  eq(CK.LAYOUT_IDS, ['full', 'iso', 'tkl', 'mac'], '배열 목록');
  const iso = CK.layout('iso');
  // 104키 = 글자 26 + 숫자 10 + 기호 11 + 스페이스 + (Esc·Tab·Caps·Backspace·Enter) + 조합 키 9 + F 12 + 3 + 6 + 화살표 4 + 숫자판 17
  eq([full.total, tkl.total, mac.total], [104, 87, 78], '키 수 104 / 87 / 78');
  eq([full.detectable, tkl.detectable, mac.detectable], [104, 87, 76], '브라우저가 받을 수 있는 키 수(맥은 Fn·잠금 키 빼고 76)');

  // (가) Playwright 미국 자판 표에서 미디어 키 6개와 AltGraph를 뺀 것 = 104키와 같은 집합
  const notOnBoard = ['AltGraph', 'AudioVolumeMute', 'AudioVolumeDown', 'AudioVolumeUp', 'MediaTrackNext', 'MediaTrackPrevious', 'MediaPlayPause'];
  const refSet = REF.codes.filter((c) => !notOnBoard.includes(c)).sort();
  eq(full.keys.map((q) => q.code).sort(), refSet, 'full의 code 집합 = Playwright 미국 자판 표(104개)');

  // (나) 종류별로 다시 지은 목록(줄 순서가 아니라 종류로 짰다)
  const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c) => 'Key' + c);
  const digits = [...'0123456789'].map((c) => 'Digit' + c);
  const punct = ['Backquote', 'Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Backslash', 'Semicolon', 'Quote', 'Comma', 'Period', 'Slash'];
  const edit = ['Escape', 'Tab', 'CapsLock', 'Backspace', 'Enter', 'Space'];
  const mods = ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ContextMenu'];
  const fn = Array.from({ length: 12 }, (_, i) => 'F' + (i + 1));
  const sys = ['PrintScreen', 'ScrollLock', 'Pause'];
  const nav = ['Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown'];
  const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const numpad = ['NumLock', 'NumpadDivide', 'NumpadMultiply', 'NumpadSubtract', 'NumpadAdd', 'NumpadEnter', 'NumpadDecimal', ...[...'0123456789'].map((c) => 'Numpad' + c)];
  const tklWant = [...letters, ...digits, ...punct, ...edit, ...mods, ...fn, ...sys, ...nav, ...arrows].sort();
  eq(numpad.length, 17, '숫자판은 17키');
  eq(tkl.keys.map((q) => q.code).sort(), tklWant, 'tkl의 code 집합(종류별 목록 87개)');
  eq(full.keys.map((q) => q.code).sort(), [...tklWant, ...numpad].sort(), 'full = tkl + 숫자판 17');
  // 맥: 문자·숫자·기호·편집 키 + F1~F12 + 화살표 + 조합 키 7(Shift 2, Control 1, Option 2, Command 2) + Fn + 잠금 = 78
  const macWant = [...letters, ...digits, ...punct, ...edit, ...fn, ...arrows, 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'Fn', 'Power'].sort();
  eq(mac.keys.map((q) => q.code).sort(), macWant, 'mac의 code 집합(78개)');
  eq(mac.keys.filter((q) => !q.detectable).map((q) => q.code).sort(), ['Fn', 'Power'], '맥에서 못 받는 키는 Fn과 잠금 키');

  for (const lay of [full, iso, tkl, mac]) {
    const codes = lay.keys.map((q) => q.code);
    eq(new Set(codes).size, codes.length, `${lay.id}: 같은 code가 두 번 없음`);
    ok(lay.keys.every((q) => lay.index[q.code] === q), `${lay.id}: index가 keys와 같은 것을 가리킴`);
    ok(lay.keys.every((q) => q.x >= 0 && q.y >= 0 && q.x + q.w <= lay.width + 1e-9 && q.y + q.h <= lay.height + 1e-9), `${lay.id}: 모든 키가 판 안에 있음`);
    let overlaps = [];
    const rects = [];
    for (const q of lay.keys) { rects.push([q.code, q.x, q.y, q.w, q.h]); if (q.ext) rects.push([q.code + '+', q.ext.x, q.ext.y, q.ext.w, q.ext.h]); }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const w = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]), h = Math.min(a[2] + a[4], b[2] + b[4]) - Math.max(a[2], b[2]);
      if (w > 1e-9 && h > 1e-9) overlaps.push(a[0] + '×' + b[0]);
    }
    eq(overlaps, [], `${lay.id}: 겹치는 키 없음`);
    // 판 전체가 꽉 참: 오른쪽 끝·아래 끝에 닿는 키가 있다
    near(Math.max(...lay.keys.map((q) => q.x + q.w)), lay.width, 1e-9, `${lay.id}: 가장 오른쪽 키가 판 너비에 닿음`);
    near(Math.max(...lay.keys.map((q) => q.y + q.h)), lay.height, 1e-9, `${lay.id}: 가장 아래 키가 판 높이에 닿음`);
  }
  // 본판 줄 너비: PC는 15, 맥은 14.5 (줄마다 왼쪽 끝 0에서 시작해 빈틈없이 이어진다. PC 맨 윗줄만 띄어 있다)
  const rowSpan = (lay, y, maxX) => {
    const row = lay.keys.filter((q) => q.y === y && q.x < maxX).sort((a, b) => a.x - b.x);
    let gapless = true;
    for (let i = 1; i < row.length; i++) if (Math.abs(row[i - 1].x + row[i - 1].w - row[i].x) > 1e-9) gapless = false;
    return { from: row[0].x, to: row[row.length - 1].x + row[row.length - 1].w, n: row.length, gapless };
  };
  eq([1.5, 2.5, 3.5, 4.5, 5.5].map((y) => rowSpan(full, y, 15.1)), [14, 14, 13, 12, 8].map((n) => ({ from: 0, to: 15, n, gapless: true })), 'PC 본판 다섯 줄: 14·14·13·12·8키, 너비 15, 빈틈 없음');
  eq(rowSpan(full, 0, 15.1), { from: 0, to: 15, n: 13, gapless: false }, 'PC 맨 윗줄: Esc + F1~F12, 띄어 있음');
  eq([0, 1.25, 2.25, 3.25, 4.25].map((y) => rowSpan(mac, y, 99)), [14, 14, 14, 13, 12].map((n) => ({ from: 0, to: 14.5, n, gapless: true })), '맥 다섯 줄: 14·14·14·13·12키, 너비 14.5');
  // 줄 순서: 글자 키를 왼쪽부터 읽으면 QWERTY 글자 줄이 나와야 한다(code → 글자는 Playwright 표에서)
  const rowChars = (lay, y) => lay.keys.filter((q) => q.y === y && REF.chars[q.code] && q.code !== 'Space' && !q.code.startsWith('Numpad')).sort((a, b) => a.x - b.x).map((q) => REF.chars[q.code]).join('');
  eq([1.5, 2.5, 3.5, 4.5].map((y) => rowChars(full, y)), ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'], 'PC 글자 줄 순서 = QWERTY');
  eq([1.5, 2.5, 3.5, 4.5].map((y) => rowChars(tkl, y)), ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'], 'tkl 글자 줄 순서');
  eq([1.25, 2.25, 3.25, 4.25].map((y) => rowChars(mac, y)), ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'], '맥 글자 줄 순서');
  // 글자가 아닌 키의 순서(손으로 적은 줄, 왼쪽부터)
  const rowCodes = (lay, y, fromX, toX) => lay.keys.filter((q) => q.y === y && q.x >= fromX && q.x < toX).sort((a, b) => a.x - b.x).map((q) => q.code);
  eq(rowCodes(full, 0, 0, 15.1), ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'], 'PC 맨 윗줄 순서');
  eq(rowCodes(full, 5.5, 0, 15.1), ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'MetaRight', 'ContextMenu', 'ControlRight'], 'PC 맨 아랫줄 순서');
  eq([rowCodes(full, 1.5, 0, 1)[0], rowCodes(full, 1.5, 13, 15.1)[0], rowCodes(full, 2.5, 0, 1)[0], rowCodes(full, 3.5, 0, 1)[0], rowCodes(full, 3.5, 12, 15.1)[0], rowCodes(full, 4.5, 0, 1)[0], rowCodes(full, 4.5, 12, 15.1)[0]],
    ['Backquote', 'Backspace', 'Tab', 'CapsLock', 'Enter', 'ShiftLeft', 'ShiftRight'], 'PC 줄 양끝 키');
  eq([0, 1.5, 2.5, 3.5, 4.5, 5.5].map((y) => rowCodes(full, y, 15.2, 18.4)), [['PrintScreen', 'ScrollLock', 'Pause'], ['Insert', 'Home', 'PageUp'], ['Delete', 'End', 'PageDown'], [], ['ArrowUp'], ['ArrowLeft', 'ArrowDown', 'ArrowRight']], '이동 키 묶음 순서');
  eq([0, 1.5, 2.5, 3.5, 4.5, 5.5].map((y) => rowCodes(full, y, 18.4, 99)), [[], ['NumLock', 'NumpadDivide', 'NumpadMultiply', 'NumpadSubtract'], ['Numpad7', 'Numpad8', 'Numpad9', 'NumpadAdd'], ['Numpad4', 'Numpad5', 'Numpad6'], ['Numpad1', 'Numpad2', 'Numpad3', 'NumpadEnter'], ['Numpad0', 'NumpadDecimal']], '숫자판 순서');
  eq(rowCodes(mac, 0, 0, 99), ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Power'], '맥 맨 윗줄 순서');
  eq(rowCodes(mac, 5.25, 0, 99), ['Fn', 'ControlLeft', 'AltLeft', 'MetaLeft', 'Space', 'MetaRight', 'AltRight', 'ArrowLeft', 'ArrowUp', 'ArrowRight'], '맥 맨 아랫줄 순서(fn, control, option, command, 스페이스, command, option, 화살표)');
  // 손으로 따진 자리(키 너비 1 단위). 예: A = Caps 1.75 뒤, Z = Shift 2.25 뒤, 스페이스 = 1.25×3 뒤
  const at = (lay, code) => { const q = lay.index[code]; return [q.x, q.y, q.w, q.h]; };
  eq(at(full, 'KeyQ'), [1.5, 2.5, 1, 1], 'Q 자리');
  eq(at(full, 'KeyA'), [1.75, 3.5, 1, 1], 'A 자리');
  eq(at(full, 'KeyZ'), [2.25, 4.5, 1, 1], 'Z 자리');
  eq(at(full, 'Space'), [3.75, 5.5, 6.25, 1], '스페이스 자리');
  eq(at(full, 'Enter'), [12.75, 3.5, 2.25, 1], 'Enter 자리');
  eq(at(full, 'Backspace'), [13, 1.5, 2, 1], 'Backspace 자리');
  eq(at(full, 'F5'), [6.5, 0, 1, 1], 'F5 자리(Esc 1 + 빈칸 1 + F1~F4 + 빈칸 0.5)');
  eq(at(full, 'F12'), [14, 0, 1, 1], 'F12 자리');
  eq(at(full, 'ArrowUp'), [16.25, 4.5, 1, 1], '위 화살표 자리');
  eq(at(full, 'ArrowDown'), [16.25, 5.5, 1, 1], '아래 화살표 자리');
  eq(at(full, 'Numpad0'), [18.5, 5.5, 2, 1], '숫자판 0(두 칸)');
  eq(at(full, 'NumpadAdd'), [21.5, 2.5, 1, 2], '숫자판 +(두 줄)');
  eq(at(full, 'NumpadEnter'), [21.5, 4.5, 1, 2], '숫자판 Enter(두 줄)');
  eq(at(tkl, 'Pause'), [17.25, 0, 1, 1], 'tkl 오른쪽 끝은 Pause');
  eq(at(mac, 'Space'), [4.25, 5.25, 5, 1], '맥 스페이스(fn·control·option 1씩 + command 1.25 뒤)');
  eq(at(mac, 'ArrowUp'), [12.5, 5.25, 1, 0.5], '맥 위 화살표(반 높이)');
  eq(at(mac, 'ArrowDown'), [12.5, 5.75, 1, 0.5], '맥 아래 화살표(반 높이, 위 화살표 바로 아래)');
  // ISO(105키) = ANSI 104키 + IntlBackslash. 엔터는 오른쪽 기둥 1.25×2 + 윗줄 왼쪽으로 0.25 나온 꼴
  eq([iso.total, iso.detectable], [105, 105], 'ISO는 105키');
  eq(iso.keys.map((q) => q.code).sort(), [...full.keys.map((q) => q.code), 'IntlBackslash'].sort(), 'ISO의 code 집합 = ANSI 104 + IntlBackslash');
  eq([iso.index.Enter.x, iso.index.Enter.y, iso.index.Enter.w, iso.index.Enter.h, iso.index.Enter.ext], [13.75, 2.5, 1.25, 2, { x: 13.5, y: 2.5, w: 0.25, h: 1 }], 'ISO 엔터 자리: ] 끝(13.5)에서 15까지, 아래는 13.75부터');
  eq(at(iso, 'Backslash'), [12.75, 3.5, 1, 1], "ISO: # 자리 키(Backslash)는 셋째 줄 ' 오른쪽");
  eq(at(iso, 'ShiftLeft'), [0, 4.5, 1.25, 1], 'ISO: 왼쪽 Shift는 1.25');
  eq(at(iso, 'IntlBackslash'), [1.25, 4.5, 1, 1], 'ISO: Shift 옆 키');
  eq(at(iso, 'KeyZ'), [2.25, 4.5, 1, 1], 'ISO: Z 자리는 ANSI와 같다(1.25 + 1)');
  // 셋째 글자 줄은 Caps 1.75 + 글자 9 + ; ' + # 자리 키 = 13.75에서 끝나고(그 오른쪽은 윗줄에서 내려온 엔터 기둥), 넷째 줄은 Shift 1.25 + 키 1 + 글자 7 + 기호 3 + Shift 2.75 = 15
  eq([1.5, 3.5, 4.5, 5.5].map((y) => rowSpan(iso, y, 15.1)), [{ from: 0, to: 15, n: 14, gapless: true }, { from: 0, to: 13.75, n: 13, gapless: true }, { from: 0, to: 15, n: 13, gapless: true }, { from: 0, to: 15, n: 8, gapless: true }], 'ISO 본판 줄: 14·13(13.75까지)·13·8키');
  eq(rowSpan(iso, 2.5, 15.1), { from: 0, to: 15, n: 14, gapless: false }, 'ISO 둘째 글자 줄: ] 다음 0.25는 엔터의 나온 부분(ext)');
  eq([1.5, 2.5, 3.5, 4.5].map((y) => rowChars(iso, y)), ['`1234567890-=', 'qwertyuiop[]', "asdfghjkl;'\\", 'zxcvbnm,./'], 'ISO 글자 줄 순서(\\ 자리 키가 셋째 줄 끝)');
  eq(CK.layoutsWith('IntlBackslash'), ['iso'], 'IntlBackslash는 ISO에만');
  eq([CK.defaultLayout('MacIntel'), CK.defaultLayout('macOS'), CK.defaultLayout('iPhone'), CK.defaultLayout('Win32'), CK.defaultLayout('Linux x86_64'), CK.defaultLayout(''), CK.defaultLayout(undefined)], ['mac', 'mac', 'mac', 'full', 'full', 'full', 'full'], '처음 배열: 맥이면 mac, 그 밖은 full');
  eq(CK.layout('nope'), null, '없는 배열은 null');
  eq(CK.layoutsWith('Numpad5'), ['full', 'iso'], '숫자판 키는 full·iso에만');
  eq(CK.layoutsWith('KeyA'), ['full', 'iso', 'tkl', 'mac'], 'A는 모든 배열에');
  eq(CK.layoutsWith('ContextMenu'), ['full', 'iso', 'tkl'], '메뉴 키는 PC 배열에만');
}

/* ───────────── 2. 들어온 키 → 자판 칸 ───────────── */
group = 'resolve';
{
  const R = (l, c, k) => { const r = CK.resolveKey(l, c, k); return [r.slot, r.via, r.extra]; };
  eq(R('full', 'KeyA', 'a'), ['KeyA', 'code', null], '보통 키');
  eq(R('full', 'KeyA', 'ㅁ'), ['KeyA', 'code', null], '한글 자판 상태여도 code로 찾는다');
  eq(R('tkl', 'Numpad1', '1'), [null, null, 'Numpad1'], '텐키리스에서 숫자판 키는 배열 밖 키로 알린다');
  eq(R('mac', 'ContextMenu', 'ContextMenu'), [null, null, 'ContextMenu'], '맥 배열에 없는 메뉴 키');
  eq(R('full', 'IntlBackslash', '\\'), [null, null, 'IntlBackslash'], 'ISO 자판의 추가 키는 ANSI 배열에서는 배열 밖 키');
  eq(R('iso', 'IntlBackslash', '\\'), ['IntlBackslash', 'code', null], 'ISO 배열에서는 제자리');
  eq(R('full', 'OSLeft', 'OS'), ['MetaLeft', 'alias', null], '옛 파이어폭스의 윈도우 키 이름');
  eq(R('mac', 'OSRight', 'OS'), ['MetaRight', 'alias', null], '옛 이름(오른쪽)');
  eq(R('full', 'Lang1', 'HangulMode'), ['AltRight', 'lang', null], '한/영(Lang1)은 오른쪽 Alt 자리');
  eq(R('full', 'Lang2', 'HanjaMode'), ['ControlRight', 'lang', null], '한자(Lang2)는 오른쪽 Ctrl 자리');
  eq(R('tkl', 'Lang1', 'Process'), ['AltRight', 'lang', null], 'key가 달라도 code Lang1이면 한/영');
  eq(R('full', 'AltRight', 'HangulMode'), ['AltRight', 'code', null], '오른쪽 Alt가 한/영으로 오는 자판');
  eq(R('full', 'ControlRight', 'HanjaMode'), ['ControlRight', 'code', null], '오른쪽 Ctrl이 한자로 오는 자판');
  eq(R('full', '', 'HangulMode'), ['AltRight', 'key', null], 'code가 비면 key로 한/영을 찾는다');
  eq(R('full', 'Unidentified', 'HanjaMode'), ['ControlRight', 'key', null], 'code가 Unidentified면 key로 한자를 찾는다');
  eq(R('mac', 'Lang1', 'HangulMode'), [null, null, 'Lang1'], '맥 배열에는 한/영 자리가 없다(배열 밖 키로)');
  eq(R('full', '', ''), [null, null, 'Unidentified'], 'code도 key도 없으면 Unidentified');
  eq(R('full', '', 'AudioVolumeUp'), [null, null, 'key:AudioVolumeUp'], 'code 없이 key만 온 키');
  eq(R('full', 'AudioVolumeUp', 'AudioVolumeUp'), [null, null, 'AudioVolumeUp'], '미디어 키');
  eq(R('mac', 'Fn', 'Fn'), ['Fn', 'code', null], 'Fn이 실제로 들어오면 켠다');
  eq(R('nope', 'KeyA', 'a'), [null, null, 'KeyA'], '없는 배열');

  eq(CK.untested('tkl', []).length, 87, '아무것도 안 눌렀으면 87개 남음');
  eq(CK.untested('mac', []).length, 76, '맥은 76개(Fn·잠금 키는 세지 않음)');
  eq(CK.untested('mac', []).includes('Fn'), false, '못 받는 키는 안 눌린 키 목록에 없다');
  const all = CK.layout('full').keys.map((q) => q.code);
  eq(CK.untested('full', all), [], '전부 누르면 남은 키 없음');
  eq(CK.untested('full', new Set(all.filter((c) => c !== 'ScrollLock' && c !== 'KeyQ'))), ['KeyQ', 'ScrollLock'], '안 눌린 두 키(배열 순서)');
  eq(CK.progress('full', { KeyA: true, KeyB: true, Nope: true }), { done: 2, total: 104, left: 102, all: false }, '진행: 배열 밖 이름은 세지 않음');
  eq(CK.progress('mac', CK.layout('mac').keys.filter((q) => q.detectable).map((q) => q.code)), { done: 76, total: 76, left: 0, all: true }, '맥 76개를 다 누르면 끝');
  eq(CK.progress('nope', []), { done: 0, total: 0, left: 0, all: false }, '없는 배열');
}

/* ───────────── 3. 키 기록: 손으로 따진 흐름 ───────────── */
group = 'tracker';
{
  const run = (ev, opts) => CK.analyzeKeyEvents(ev.map(([type, id, t, repeat]) => ({ type, id, t, repeat })), opts);
  let r = run([['down', 'KeyA', 0], ['up', 'KeyA', 80], ['down', 'KeyB', 120], ['up', 'KeyB', 200]]);
  eq([r.presses, r.maxHeld, r.suspects, r.held, r.seen], [2, 1, [], [], ['KeyA', 'KeyB']], '보통 타자: 두 번 누름, 동시 1, 의심 없음');

  // 채터링: 뗀 뒤 12ms 만에 다시 눌림(기준 30ms)
  r = run([['down', 'KeyA', 0], ['up', 'KeyA', 60], ['down', 'KeyA', 72], ['up', 'KeyA', 130]]);
  eq(r.suspects, [{ id: 'KeyA', count: 1, presses: 2, minGap: 12 }], '12ms 간격은 의심 1회');
  r = run([['down', 'KeyA', 0], ['up', 'KeyA', 60], ['down', 'KeyA', 72]], { chatterMs: 10 });
  eq(r.suspects, [], '기준을 10ms로 낮추면 12ms는 의심 아님');
  r = run([['down', 'KeyA', 0], ['up', 'KeyA', 60], ['down', 'KeyA', 90]]);
  eq(r.suspects, [], '딱 30ms는 의심 아님(기준보다 짧을 때만)');
  r = run([['down', 'KeyA', 0], ['up', 'KeyA', 60], ['down', 'KeyA', 89.9]]);
  eq(r.suspects.length, 1, '29.9ms는 의심');
  // 떼는 순간 튐: 150ms 눌렀다 떼고 5ms 뒤 다시 눌림. 누름↔누름 간격은 155ms라 평범해 보여도 잡아야 한다
  r = run([['down', 'KeyE', 0], ['up', 'KeyE', 150], ['down', 'KeyE', 155], ['up', 'KeyE', 160]]);
  eq(r.suspects, [{ id: 'KeyE', count: 1, presses: 2, minGap: 5 }], '뗄 때 튀는 채터링');
  // 여러 키: A 두 번(5, 12ms), B 한 번(20ms), C는 정상 더블 탭(120ms)
  r = run([['down', 'KeyA', 0], ['up', 'KeyA', 50], ['down', 'KeyA', 55], ['up', 'KeyA', 100], ['down', 'KeyA', 112], ['up', 'KeyA', 160],
    ['down', 'KeyB', 200], ['up', 'KeyB', 260], ['down', 'KeyB', 280], ['up', 'KeyB', 330],
    ['down', 'KeyC', 400], ['up', 'KeyC', 450], ['down', 'KeyC', 570], ['up', 'KeyC', 620]]);
  eq(r.suspects, [{ id: 'KeyA', count: 2, presses: 3, minGap: 5 }, { id: 'KeyB', count: 1, presses: 2, minGap: 20 }], '의심 키는 많이 걸린 순');
  eq(r.presses, 7, '누름 수 7');

  // 동시 입력: A S D F를 차례로 누름 → 4. A를 떼고 G를 눌러도 4(처음 4가 된 때의 키를 기억)
  r = run([['down', 'KeyA', 0], ['down', 'KeyS', 10], ['down', 'KeyD', 20], ['down', 'KeyF', 30], ['up', 'KeyA', 40], ['down', 'KeyG', 50],
    ['up', 'KeyS', 60], ['up', 'KeyD', 61], ['up', 'KeyF', 62], ['up', 'KeyG', 63]]);
  eq([r.maxHeld, r.maxHeldIds, r.held], [4, ['KeyA', 'KeyD', 'KeyF', 'KeyS'], []], '동시 4키');
  r = run([['down', 'KeyA', 0], ['down', 'KeyS', 10], ['up', 'KeyA', 20], ['down', 'KeyD', 30], ['down', 'KeyF', 40], ['down', 'KeyJ', 50]]);
  eq([r.maxHeld, r.maxHeldIds], [4, ['KeyD', 'KeyF', 'KeyJ', 'KeyS']], '중간에 뗀 키는 세지 않는다');
  eq(r.held.map((h) => [h.id, h.ms]), [['KeyS', 40], ['KeyD', 20], ['KeyF', 10], ['KeyJ', 0]], '아직 눌린 키와 눌린 시간(오래된 순)');

  // 꾹 누르면 오는 반복 이벤트는 세지 않는다
  r = run([['down', 'KeyA', 0], ['down', 'KeyA', 500, true], ['down', 'KeyA', 533, true], ['down', 'KeyA', 566, true], ['up', 'KeyA', 600]]);
  eq([r.presses, r.maxHeld, r.suspects], [1, 1, []], '반복 이벤트는 누름 1번');
  // 창을 벗어나면(blur) 뗌을 못 받는다: 눌린 키를 비우고, 그 뒤 첫 누름은 간격을 재지 않는다
  r = run([['down', 'KeyA', 0], ['blur', '', 10], ['down', 'KeyA', 15], ['up', 'KeyA', 60]]);
  eq([r.presses, r.suspects, r.held], [2, [], []], 'blur 뒤 5ms 만의 누름은 의심 아님');
  r = run([['down', 'KeyA', 0], ['up', 'KeyA', 50], ['blur', '', 51], ['down', 'KeyA', 55]]);
  eq(r.suspects, [], 'blur가 끼면 뗌 시각도 버린다');
  // 뗌 없이 다시 눌림(반복 표시도 없음): 누름은 세되 간격은 모른다
  r = run([['down', 'KeyA', 0], ['down', 'KeyA', 5], ['up', 'KeyA', 50]]);
  eq([r.presses, r.maxHeld, r.suspects], [2, 1, []], '뗌 없는 재누름');
  // 맥: Command를 누른 동안 다른 키의 뗌이 안 온다 → Command를 떼면 같이 비운다
  r = run([['down', 'MetaLeft', 0], ['down', 'KeyC', 50], ['up', 'MetaLeft', 200]]);
  eq(r.held, [], 'Command를 떼면 남은 키를 비운다');
  r = run([['down', 'MetaLeft', 0], ['down', 'KeyC', 50], ['up', 'MetaLeft', 200]], { metaClearsHeld: false });
  eq(r.held.map((h) => h.id), ['KeyC'], '옵션을 끄면 남는다');
  r = run([['down', 'MetaLeft', 0], ['down', 'ShiftLeft', 10], ['down', 'KeyC', 50], ['up', 'MetaLeft', 200]]);
  eq(r.held, [], 'Command를 떼면 Shift도 비운다(Command만 조합 키로 남긴다)');
  // 시각이 거꾸로 가면 간격을 재지 않는다
  r = run([['down', 'KeyA', 100], ['up', 'KeyA', 160], ['down', 'KeyA', 150]]);
  eq(r.suspects, [], '거꾸로 간 시각');
  r = run([['down', 'KeyA', NaN], ['up', 'KeyA', NaN], ['down', 'KeyA', NaN]]);
  eq([r.presses, r.suspects], [2, []], '시각이 숫자가 아니어도 죽지 않는다');
  eq(run([]).presses, 0, '빈 목록');

  // 하나씩 넣으며 보는 값
  const T = CK.createTracker();
  eq(T.chatterMs(), 30, '기본 채터링 기준 30ms');
  eq(T.down('KeyA', 1000, false), { counted: true, first: true, chatter: false, gap: null, held: 1 }, '첫 누름');
  eq(T.down('KeyA', 1500, true), { counted: false, first: false, chatter: false, gap: null, held: 1 }, '반복');
  eq(T.up('KeyA', 1600), { held: 0 }, '뗌');
  eq(T.down('KeyA', 1620, false), { counted: true, first: false, chatter: true, gap: 20, held: 1 }, '20ms 뒤 다시 눌림 = 의심');
  eq(T.heldKeys(8000, 5000), [{ id: 'KeyA', ms: 6380 }], '5초 넘게 눌린 키');
  eq(T.heldKeys(3000, 5000), [], '아직 5초 안 됨');
  eq([T.isHeld('KeyA'), T.isHeld('KeyB'), T.hasSeen('KeyA'), T.hasSeen('KeyB'), T.seenCount(), T.heldCount()], [true, false, true, false, 1, 1], '상태 읽기');
  eq(T.stat('KeyA'), { presses: 2, chatter: 1, minGap: 20, gaps: [20] }, '키 하나 통계');
  eq(T.stat('KeyB'), null, '안 누른 키 통계는 null');
  eq(T.setChatterMs(1), 5, '기준은 5ms 아래로 못 내린다');
  eq(T.setChatterMs(9999), 200, '기준은 200ms 위로 못 올린다');
  eq(T.setChatterMs('abc'), 30, '숫자가 아니면 기본값');
  T.reset();
  eq([T.presses(), T.seenCount(), T.maxHeld(), T.heldCount(), T.suspects()], [0, 0, 0, 0, []], 'reset');
  eq([CK.KEY_CHATTER_MS, CK.MOUSE_CHATTER_MS, CK.CHATTER_MIN_MS, CK.CHATTER_MAX_MS], [30, 50, 5, 200], '화면에 밝히는 기준값');
  // 마우스 단추도 같은 기록기를 쓴다(기준 50ms)
  r = run([['down', 'mouse0', 0], ['up', 'mouse0', 70], ['down', 'mouse0', 110], ['up', 'mouse0', 170]], { chatterMs: CK.MOUSE_CHATTER_MS });
  eq(r.suspects, [{ id: 'mouse0', count: 1, presses: 2, minGap: 40 }], '마우스 왼쪽 단추 40ms 재클릭은 더블클릭 의심');
  r = run([['down', 'mouse0', 0], ['up', 'mouse0', 70], ['down', 'mouse0', 190], ['up', 'mouse0', 250]], { chatterMs: CK.MOUSE_CHATTER_MS });
  eq(r.suspects, [], '사람이 한 더블클릭(120ms)은 의심 아님');
}

/* ───────────── 3-1. 한쪽 신호만 오는 키(제3자 평가 H2·H3) ───────────── */
group = 'tracker-quirk';
{
  const run = (ev, opts) => CK.analyzeKeyEvents(ev.map(([type, id, t, repeat, momentary]) => ({ type, id, t, repeat, momentary })), opts);
  // H2: 누름 없이 뗌만 오는 키(윈도우의 PrtSc 꼴). 한 번 눌렸다 떼어진 것으로 센다. 눌려 있음·동시 입력 수에는 안 들어간다
  let r = run([['up', 'PrintScreen', 100]]);
  eq([r.presses, r.seen, r.maxHeld, r.held, r.suspects], [1, ['PrintScreen'], 0, [], []], '뗌만 온 키: 누름 1번, 눌린 적 있음, 동시 0, 눌려 있지 않음');
  r = run([['up', 'PrintScreen', 100], ['up', 'PrintScreen', 900]]);
  eq([r.presses, r.seen.length, r.maxHeld], [2, 1, 0], '뗌만 두 번: 누름 2번');
  r = run([['down', 'KeyA', 0], ['up', 'PrintScreen', 50], ['up', 'KeyA', 100]]);
  eq([r.presses, r.maxHeld, r.maxHeldIds, r.seen], [2, 1, ['KeyA'], ['KeyA', 'PrintScreen']], '다른 키를 누른 채 뗌만 와도 동시 입력 수는 1');
  let T = CK.createTracker();
  eq(T.up('PrintScreen', 5), { held: 0, tap: true, first: true }, '뗌만 온 키의 첫 번째: tap·first');
  eq(T.up('PrintScreen', 900), { held: 0, tap: true, first: false }, '뗌만 온 키의 두 번째: tap, first 아님');
  eq([T.hasSeen('PrintScreen'), T.isHeld('PrintScreen'), T.heldCount(), T.presses(), T.stat('PrintScreen').presses], [true, false, 0, 2, 2], '뗌만 온 키의 상태');
  T.down('KeyA', 1000, false);
  eq(T.up('KeyA', 1080), { held: 0 }, '보통 키의 뗌은 예전 그대로({ held })');
  // 창을 벗어나며 비운 키의 뗌이 나중에 와도 새 누름으로 세지 않는다
  r = run([['down', 'KeyA', 0], ['blur', '', 10], ['up', 'KeyA', 400]]);
  eq([r.presses, r.held], [1, []], 'blur로 비운 키의 늦은 뗌은 누름이 아님');
  r = run([['down', 'KeyA', 0], ['blur', '', 10], ['up', 'KeyA', 400], ['up', 'KeyA', 900]]);
  eq(r.presses, 2, '그 뒤에 또 뗌만 오면 그건 새로 센다');
  // 맥: Command를 떼며 비운 키의 뗌이 늦게 와도 새 누름이 아니다
  r = run([['down', 'MetaLeft', 0], ['down', 'KeyC', 50], ['up', 'MetaLeft', 200], ['up', 'KeyC', 230]]);
  eq([r.presses, r.held], [2, []], 'Command로 비운 키의 늦은 뗌');
  // 뗌만 온 키도 뗀 시각은 기억한다: 그 뒤 10ms 만의 눌림은 의심
  r = run([['up', 'KeyQ', 100], ['down', 'KeyQ', 110], ['up', 'KeyQ', 170]]);
  eq(r.suspects, [{ id: 'KeyQ', count: 1, presses: 2, minGap: 10 }], '뗌만 온 뒤 10ms 만의 눌림');

  // H3: Caps Lock. 맥은 켤 때 누름만, 끌 때 뗌만 준다 → 눌려 있는 키로 두지 않는다
  r = run([['down', 'CapsLock', 0]]);
  eq([r.presses, r.seen, r.maxHeld, r.held], [1, ['CapsLock'], 0, []], 'Caps Lock 누름만: 누름 1번, 눌려 있지 않음');
  T = CK.createTracker();
  eq(T.down('CapsLock', 0, false), { counted: true, first: true, chatter: false, gap: null, held: 0 }, 'Caps Lock 누름: held 0');
  eq([T.isHeld('CapsLock'), T.heldKeys(60000, 10000), T.heldKeys(60000)], [false, [], []], '1분이 지나도 눌린 채 있는 키가 아니다(걸렸다는 경고 없음)');
  T.down('KeyA', 3000, false);
  eq([T.maxHeld(), T.maxHeldIds(), T.heldCount()], [1, ['KeyA'], 1], 'Caps Lock 뒤에 A만 눌렀으면 동시 입력 1(A)');
  T.up('KeyA', 3080);
  eq(T.up('CapsLock', 9000), { held: 0 }, '끌 때의 뗌은 앞 누름의 짝(새 누름 아님)');
  eq([T.presses(), T.stat('CapsLock').presses], [2, 1], '누름 수: A 1 + Caps Lock 1');
  eq(T.up('CapsLock', 12000), { held: 0, tap: true, first: false }, '짝 없는 뗌(켜진 채 연 페이지에서 끄기)은 누름으로');
  // 윈도우처럼 누름·뗌이 둘 다 와도 눌린 채로 두지 않고, 채터링 간격은 그대로 잰다
  r = run([['down', 'CapsLock', 0], ['down', 'KeyA', 10], ['up', 'CapsLock', 60], ['down', 'CapsLock', 72], ['up', 'KeyA', 90], ['up', 'CapsLock', 130]]);
  eq([r.presses, r.maxHeld, r.suspects], [3, 1, [{ id: 'CapsLock', count: 1, presses: 2, minGap: 12 }]], 'Caps Lock: 동시 입력에서 빠지고 12ms 재입력은 의심');
  // 한/영·한자: 화면 코드가 momentary로 넘긴다(자리 이름은 오른쪽 Alt·Ctrl과 같다)
  T = CK.createTracker();
  eq(T.down('AltRight', 0, false, true).held, 0, '한/영으로 온 오른쪽 Alt 자리: 눌린 채로 두지 않는다');
  eq([T.isHeld('AltRight'), T.hasSeen('AltRight')], [false, true], '한/영: 눌린 적은 있음');
  eq(T.up('AltRight', 50), { held: 0 }, '한/영의 뗌');
  eq(T.down('AltRight', 500, false).held, 1, '진짜 오른쪽 Alt(momentary 아님)는 눌린 채로 둔다');
  T.reset();
  eq(T.up('CapsLock', 5), { held: 0, tap: true, first: true }, 'reset 뒤에는 처음부터');
  eq([['CapsLock', 'CapsLock'], ['Lang1', 'HangulMode'], ['Lang2', 'HanjaMode'], ['AltRight', 'HangulMode'], ['ControlRight', 'HanjaMode'], ['', 'HangulMode'], ['AltRight', 'Alt'], ['ControlRight', 'Control'], ['KeyA', 'a'], ['PrintScreen', 'PrintScreen'], ['', '']].map(([c, k]) => CK.isMomentary(c, k)),
    [true, true, true, true, true, true, false, false, false, false, false], '눌린 채로 두지 않는 키: Caps Lock, 한/영, 한자');
}

/* ───────────── 3-2. 한쪽 신호만 오는 키: 파이썬이 구간에서 센 정답 ───────────── */
group = 'quirk-ref';
C.keyStreamsQuirk.forEach((s, i) => {
  const r = CK.analyzeKeyEvents(s.events, { chatterMs: s.chatterMs });
  eq(r.presses, s.presses, `흐름 ${i}: 누름 수(보통 키 구간 + 뗌만 온 횟수 + Caps Lock 횟수)`);
  eq(r.maxHeld, s.maxHeld, `흐름 ${i}: 동시에 눌린 최대 수(보통 키 구간만)`);
  eq(r.seen, s.seen, `흐름 ${i}: 눌린 적 있는 키`);
  ok(!r.maxHeldIds.includes('CapsLock') && !r.maxHeldIds.includes('PrintScreen'), `흐름 ${i}: 최대일 때의 키 목록에 Caps Lock·PrtSc 없음`);
  ok(r.held.every((h) => h.id !== 'CapsLock' && h.id !== 'PrintScreen'), `흐름 ${i}: 눌린 채 있는 키에 Caps Lock·PrtSc 없음`);
  const got = {};
  r.suspects.forEach((x) => { got[x.id] = { count: x.count, minGap: x.minGap }; });
  eq(Object.keys(got).sort(), Object.keys(s.suspects).sort(), `흐름 ${i}: 의심 키 목록(기준 ${s.chatterMs}ms)`);
  for (const id of Object.keys(s.suspects)) {
    eq(got[id] && got[id].count, s.suspects[id].count, `흐름 ${i}: ${id} 의심 횟수`);
    near(got[id] ? got[id].minGap : NaN, s.suspects[id].minGap, 1e-9, `흐름 ${i}: ${id} 가장 짧은 간격`);
  }
});

/* ───────────── 4. 키 기록: 파이썬이 구간에서 센 정답 ───────────── */
group = 'tracker-ref';
C.keyStreams.forEach((s, i) => {
  const r = CK.analyzeKeyEvents(s.events, { chatterMs: s.chatterMs });
  eq(r.presses, s.presses, `흐름 ${i}: 누름 수`);
  eq(r.maxHeld, s.maxHeld, `흐름 ${i}: 동시에 눌린 최대 수`);
  eq(r.seen, s.seen, `흐름 ${i}: 눌린 적 있는 키`);
  eq(r.maxHeldIds.length, s.maxHeld, `흐름 ${i}: 최대일 때의 키 목록 길이`);
  const got = {};
  r.suspects.forEach((x) => { got[x.id] = { count: x.count, minGap: x.minGap }; });
  eq(Object.keys(got).sort(), Object.keys(s.suspects).sort(), `흐름 ${i}: 의심 키 목록(기준 ${s.chatterMs}ms)`);
  for (const id of Object.keys(s.suspects)) {
    eq(got[id] && got[id].count, s.suspects[id].count, `흐름 ${i}: ${id} 의심 횟수`);
    near(got[id] ? got[id].minGap : NaN, s.suspects[id].minGap, 1e-9, `흐름 ${i}: ${id} 가장 짧은 간격`);
  }
});

/* ───────────── 5. 중앙값·주사율 ───────────── */
group = 'refresh';
{
  eq(CK.median([10, 9, 100, 8.5]), 9.5, '중앙값은 숫자로 정렬해야 한다(글자 정렬이면 100이 앞에 온다): (9 + 10) / 2');
  eq(CK.median([3, 1, 2]), 2, '홀수 개');
  eq(CK.median([]), null, '빈 목록');
  eq(CK.median([5, NaN, 7, 'x', Infinity]), 6, '숫자가 아닌 값은 뺀다');
  C.refresh.forEach((c, i) => {
    const r = CK.refreshEstimate(c.intervals);
    rel(r.medianMs, c.median, 1e-12, `주사율 ${i}: 중앙값(statistics.median)`);
    rel(r.hz, c.hz, 1e-12, `주사율 ${i}: Hz`);
    near(r.stable, c.stable, 1e-12, `주사율 ${i}: 고른 프레임 비율`);
    eq(r.samples, c.samples, `주사율 ${i}: 표본 수`);
    eq(r.enough, c.samples >= 30, `주사율 ${i}: 표본이 30개 이상인가`);
  });
  // 가까운 흔한 값(1% 안일 때만). 손으로: 1000/16.6667 = 60.00, 1000/6.944 = 144.0, 59.94는 60과 0.1% 차이
  const N = (ms) => CK.refreshEstimate(Array(40).fill(ms)).nearest;
  eq([N(16.6667), N(6.944), N(1000 / 59.94), N(1000 / 143.86), N(1000 / 164.8), N(8.3333), N(4.1667), N(2.7778)], [60, 144, 60, 144, 165, 120, 240, 360], '흔한 값에 붙는 경우');
  // 1000/13 = 76.9Hz: 75와 2.6% 차이 → 붙이지 않는다. 62Hz는 60과 3.3% 차이. 73.5는 72(2.1%)·75(2.0%) 사이
  eq([N(13), N(1000 / 62), N(1000 / 73.5), N(1000 / 155)], [null, null, null, null], '애매하면 흔한 값을 붙이지 않는다');
  eq([N(1000 / 60.59), N(1000 / 60.61), N(1000 / 59.41), N(1000 / 59.39)], [60, null, 60, null], '경계: 60의 1%는 0.6 → 60.59·59.41은 안, 60.61·59.39는 밖');
  eq(CK.refreshEstimate([]), { hz: null, medianMs: null, samples: 0, nearest: null, stable: 0, enough: false }, '표본 없음');
  eq(CK.refreshEstimate([0, -5, NaN]).samples, 0, '0·음수·NaN 간격은 버린다');
  eq(CK.refreshEstimate(Array(29).fill(16.7)).enough, false, '29개는 아직 부족');
  eq(CK.intervals([100, 116.7, 133.3, 150]).map((v) => +v.toFixed(4)), [16.7, 16.6, 16.7], '시각 → 간격');
  eq([CK.nearestCommon(0, [60], 0.5), CK.nearestCommon(-3, [60], 0.5), CK.nearestCommon(NaN, [60], 0.5)], [null, null, null], '0·음수·NaN에는 흔한 값을 붙이지 않는다');
  // 프레임이 고르지 않으면 값을 말하지 않는다(제3자 평가 L3). 손으로: 120Hz에서 한 장 걸러 빠지면 간격이 8.33·16.67 번갈아 → 중앙값 12.5ms = 80Hz(없는 값), 고른 프레임 0%
  const alt = CK.refreshEstimate(Array.from({ length: 120 }, (_, i) => (i % 2 ? 1000 / 60 : 1000 / 120)));
  near(alt.hz, 80, 1e-9, '한 장 걸러 빠진 120Hz: 중앙값으로는 80Hz'); eq([alt.stable, alt.nearest, CK.refreshSteady(alt)], [0, null, false], '고른 프레임 0% → 고르지 않음');
  const alt144 = CK.refreshEstimate(Array.from({ length: 120 }, (_, i) => (i % 2 ? 2000 / 144 : 1000 / 144)));
  near(alt144.hz, 96, 1e-9, '한 장 걸러 빠진 144Hz: 중앙값으로는 96Hz'); eq(CK.refreshSteady(alt144), false, '144Hz도 고르지 않음');
  eq(CK.REFRESH_STEADY, 0.75, '고르다고 보는 선 75%(화면 글에 적은 값)');
  // 경계: 100장 중 75장이 제때면 고름, 74장이면 고르지 않음
  const mix = (good) => CK.refreshEstimate(Array(good).fill(16.67).concat(Array(100 - good).fill(33.3)));
  eq([mix(75).stable, CK.refreshSteady(mix(75)), mix(74).stable, CK.refreshSteady(mix(74)), CK.refreshSteady(mix(100))], [0.75, true, 0.74, false, true], '고른 프레임 75%가 경계');
  eq([CK.refreshSteady(CK.refreshEstimate(Array(29).fill(16.67))), CK.refreshSteady(CK.refreshEstimate([])), CK.refreshSteady(null)], [false, false, false], '표본이 모자라거나 없으면 고르다고 하지 않는다');
  C.refresh.forEach((c, i) => eq(CK.refreshSteady(CK.refreshEstimate(c.intervals)), c.samples >= 30 && c.stable >= 0.75, `주사율 ${i}: 고른가(파이썬이 센 비율 ${c.stable.toFixed(3)})`));
}

/* ───────────── 6. 폴링 ───────────── */
group = 'polling';
{
  const byName = {};
  C.polling.forEach((c) => {
    const r = CK.pollingEstimate(c.times);
    byName[c.name] = r;
    eq(r.events, c.events, `${c.name}: 이벤트 수`);
    if (c.avgHz === null) eq(r.avgHz, null, `${c.name}: 평균 없음`); else rel(r.avgHz, c.avgHz, 1e-9, `${c.name}: 평균 Hz`);
    if (c.peakHz === null) eq([r.peakHz, r.enough, r.nearest], [null, false, null], `${c.name}: 최대값 없음(표본 부족)`);
    else { rel(r.peakHz, c.peakHz, 1e-9, `${c.name}: 최대 Hz`); eq(r.enough, true, `${c.name}: 표본 충분`); }
    near(r.activeMs, c.activeMs, 1e-6, `${c.name}: 움직인 시간`);
  });
  // 답이 정해진 흐름(손으로): 정확히 1ms 간격 = 1000Hz, 8ms = 125Hz, 2ms = 500Hz
  const g = (n) => byName[n];
  near(g('1000Hz 1초').avgHz, 1000, 1e-6, '1ms 간격 평균 1000Hz'); near(g('1000Hz 1초').peakHz, 1000, 1e-6, '1ms 간격 최대 1000Hz');
  eq(g('1000Hz 1초').nearest, 1000, '약 1000Hz'); near(g('1000Hz 1초').activeMs, 1000, 1e-6, '움직인 시간 1000ms');
  near(g('125Hz 1초').peakHz, 125, 1e-6, '8ms 간격 최대 125Hz'); eq(g('125Hz 1초').nearest, 125, '약 125Hz');
  near(g('500Hz 쉬었다 다시').avgHz, 500, 1e-6, '쉰 시간은 평균에서 뺀다: 500Hz'); near(g('500Hz 쉬었다 다시').activeMs, 800, 1e-6, '쉰 300ms를 뺀 800ms');
  // 8ms×50개(400ms) 뒤 1ms×300개(300ms): 평균 = 350간격 ÷ 700ms = 500Hz, 최대는 빠른 구간의 1000Hz
  near(g('천천히(125)에서 빠르게(1000)').avgHz, 500, 1e-6, '섞인 흐름 평균 500Hz'); near(g('천천히(125)에서 빠르게(1000)').peakHz, 1000, 1e-6, '섞인 흐름 최대 1000Hz');
  eq(g('천천히(125)에서 빠르게(1000)').nearest, 1000, '최대값 기준으로 약 1000Hz');
  eq(g('8000Hz').nearest, 8000, '8000Hz'); eq(g('8000Hz, 시각이 1ms 단위').nearest, 8000, '시각이 1ms로 깎여도 8000Hz');
  eq(g('1000Hz 흔들림 20%').nearest, 1000, '흔들려도 약 1000Hz'); eq(g('250Hz 흔들림 5%').nearest, 250, '약 250Hz');
  eq(g('60Hz(프레임마다 한 번)').nearest, null, '60Hz는 마우스의 흔한 값이 아니라 붙이지 않는다');
  ok(g('60Hz(프레임마다 한 번)').peakHz > 55 && g('60Hz(프레임마다 한 번)').peakHz < 65, '프레임마다 한 번이면 60 근처');
  eq(CK.pollingEstimate([]), { avgHz: null, peakHz: null, nearest: null, events: 0, activeMs: 0, enough: false }, '빈 목록');
  eq(CK.pollingEstimate([5]).enough, false, '이벤트 하나');
  // 짧은 뭉침에 속지 않는다: 1ms 간격 12개(11ms)뿐이면 창 길이가 125ms에 못 미쳐 최대값을 내지 않는다
  eq(CK.pollingEstimate(Array.from({ length: 12 }, (_, i) => i)).peakHz, null, '11ms짜리 뭉침은 세지 않는다');
  // 2ms 간격으로 130ms(66개): 창 130ms ≥ 125ms → 500Hz
  near(CK.pollingEstimate(Array.from({ length: 66 }, (_, i) => i * 2)).peakHz, 500, 1e-9, '130ms면 잰다');
  // 쉬는 구간 경계: 간격이 딱 40ms면 이어진 것으로(25Hz, 29간격 × 40 = 1160ms), 조금이라도 넘으면 전부 끊긴다
  const at40 = CK.pollingEstimate(Array.from({ length: 30 }, (_, i) => i * 40));
  near(at40.avgHz, 25, 1e-9, '40ms 간격은 이어진 움직임: 25Hz'); near(at40.activeMs, 1160, 1e-9, '40ms 간격 30개 = 1160ms');
  eq(CK.pollingEstimate(Array.from({ length: 30 }, (_, i) => i * 40.5)).avgHz, null, '40.5ms 간격은 전부 쉬는 구간');
  eq([CK.POLL_COMMON, CK.POLL_TOL], [[125, 250, 500, 1000, 2000, 4000, 8000], 0.1], '폴링 흔한 값과 허용 오차');
  // 10% 경계: 1100Hz는 1000에 붙고(정확히 10%), 1101은 안 붙는다
  eq([CK.nearestCommon(1100, CK.POLL_COMMON, CK.POLL_TOL), CK.nearestCommon(1101, CK.POLL_COMMON, CK.POLL_TOL), CK.nearestCommon(700, CK.POLL_COMMON, CK.POLL_TOL)], [1000, null, null], '폴링 경계');
}

/* ───────────── 7. 소리 크기 ───────────── */
group = 'level';
{
  C.dbfs.forEach((c) => near(CK.dbfs(c.amp), c.db, 1e-9, `dBFS(${c.amp}) = 20·log10`));
  // 손으로: 1.0 → 0, 0.5 → -6.0206, 0.1 → -20, 1/√2 → -3.0103
  near(CK.dbfs(1), 0, 1e-12, '1.0 = 0 dBFS'); near(CK.dbfs(0.5), -6.0206, 1e-4, '0.5 = -6.02'); near(CK.dbfs(0.1), -20, 1e-9, '0.1 = -20'); near(CK.dbfs(Math.SQRT1_2), -3.0103, 1e-4, '1/√2 = -3.01');
  ok(CK.dbfs(0) === -Infinity && CK.dbfs(-1) === -Infinity && CK.dbfs(NaN) === -Infinity, '0·음수·NaN은 -Infinity(값 확인)');
  C.waves.forEach((w) => {
    const f32 = Float32Array.from(w.samples);
    near(CK.rms(w.samples), w.rms, 1e-12, `${w.name}: RMS`);
    near(CK.peak(w.samples), w.peak, 1e-12, `${w.name}: 꼭대기`);
    near(CK.dbfs(CK.rms(w.samples)), w.rmsDb, 1e-9, `${w.name}: RMS dBFS`);
    near(CK.dbfs(CK.peak(w.samples)), w.peakDb, 1e-9, `${w.name}: 꼭대기 dBFS`);
    if (w.rms > 0) near(CK.dbfs(CK.rms(f32)), w.rmsDb, 1e-4, `${w.name}: Float32Array로도 같은 값(±0.0001dB)`);
  });
  const W = (n) => C.waves.find((w) => w.name.startsWith(n));
  near(CK.dbfs(CK.rms(W('꽉 찬 사인').samples)), -3.0103, 1e-4, '꽉 찬 사인의 RMS = -3.01 dBFS(우리 기준)');
  near(CK.dbfs(CK.rms(W('절반 크기 사인').samples)), -9.0309, 1e-4, '절반 사인 = -9.03 dBFS');
  near(CK.dbfs(CK.rms(W('꽉 찬 네모파').samples)), 0, 1e-12, '꽉 찬 네모파 = 0 dBFS');
  near(CK.dbfs(CK.rms(W('직류').samples)), -20, 1e-9, '직류 0.1 = -20 dBFS');
  eq([CK.rms([]), CK.peak([]), CK.rms(null), CK.clipRatio([])], [0, 0, 0, 0], '빈 표본');
  // 막대 길이: 바닥 -60 기준. -30 → 0.5, -15 → 0.75, -60 이하·무음 → 0, 0 이상 → 1. 바닥 -80이면 -40 → 0.5
  eq([CK.levelFraction(-30), CK.levelFraction(-15), CK.levelFraction(-60), CK.levelFraction(-75), CK.levelFraction(-Infinity), CK.levelFraction(0), CK.levelFraction(3), CK.levelFraction(-40, -80), CK.levelFraction(NaN)],
    [0.5, 0.75, 0, 0, 0, 1, 1, 0.5, 0], '막대 길이 비율');
  C.noiseFloor.forEach((c, i) => {
    const got = CK.noiseFloorDb(c.blocks.map(inf));
    near(got, c.floor, 1e-12, `바탕 소음 ${i}: 중앙값(statistics.median)`);
  });
  eq(CK.noiseFloorDb([]), null, '구간이 없으면 null');
  eq(CK.noiseFloorDb([NaN, undefined]), null, '숫자가 없으면 null');
  // 잘림: 표본 8개 중 절댓값 0.999 이상이 2개 → 0.25
  eq(CK.clipRatio([0, 0.5, 1, -1, 0.99, -0.5, 0.2, 0.998]), 0.25, '잘린 비율');
  C.waves.forEach((w) => near(CK.clipRatio(w.samples), w.clip, 1e-12, `${w.name}: 꼭대기에 닿은 표본 비율(파이썬이 센 값)`));
  // '너무 큼'(제3자 평가 L18): 한 화면(표본 2048개)에서 꼭대기에 닿은 표본이 0.5% 이상. 손으로: 10개 = 0.488% → 아님, 11개 = 0.537% → 잘림
  const frame = (n) => { const a = new Float32Array(2048); for (let i = 0; i < n; i++) a[i * 7] = i % 2 ? -1 : 1; return a; };
  eq([CK.MIC_CLIP_SHARE, CK.isClipped(frame(10)), CK.isClipped(frame(11)), CK.isClipped(frame(0)), CK.isClipped([])], [0.005, false, true, false, false], '잘림 판정 경계 0.5%');
  eq([CK.isClipped(C.waves.find((w) => w.name.startsWith('꽉 찬 사인')).samples), CK.isClipped(C.waves.find((w) => w.name.startsWith('절반 크기 사인')).samples)], [true, false], '꽉 찬 사인은 잘림, 절반 크기는 아님');
  eq(CK.MIC_HEARD_DB, -45, "'소리를 잡았다'고 말하는 선 -45 dBFS(화면·소개에 적은 값)");
  // 진폭 0.0056(= 10^(-45/20))보다 큰 사인은 선을 넘고, 0.004는 못 넘는다
  ok(CK.dbfs(CK.rms(Array.from({ length: 480 }, (_, i) => 0.012 * Math.sin(2 * Math.PI * i / 48))) ) >= CK.MIC_HEARD_DB && CK.dbfs(CK.rms(Array.from({ length: 480 }, (_, i) => 0.004 * Math.sin(2 * Math.PI * i / 48)))) < CK.MIC_HEARD_DB, '선을 넘는 소리와 못 넘는 소리');
}

/* ───────────── 8. 테스트 음 ───────────── */
group = 'tone';
{
  C.tones.forEach((t) => {
    for (const ch of ['left', 'right', 'both']) {
      const o = CK.makeTone({ sampleRate: t.sampleRate, seconds: t.seconds, freq: t.freq, gain: t.gain, channel: ch });
      const tag = `${t.freq}Hz ${t.sampleRate} ${ch}`;
      eq([o.length, o.left.length, o.right.length, o.gain, o.channel], [t.length, t.length, t.length, t.gain, ch], `${tag}: 길이·크기·채널`);
      const on = ch === 'right' ? o.right : o.left, other = ch === 'left' ? o.right : ch === 'right' ? o.left : null;
      if (other) ok(other.every((v) => v === 0), `${tag}: 반대쪽 채널은 전부 0`);
      else ok(o.left.every((v, i) => v === o.right[i]), `${tag}: 양쪽이 같은 소리`);
      ok(t.at.every(([i, v]) => Math.abs(on[i] - v) < 1e-6), `${tag}: 가운데 표본 12개가 gain·sin(2πfi/sr)와 같음`);
      near(CK.rms(on.subarray(t.midFrom, t.midTo)), t.midRms, 1e-6, `${tag}: 가운데 구간 RMS`);
      ok(CK.peak(on) <= t.gain + 1e-7, `${tag}: 꼭대기가 gain을 넘지 않음`);
      near(CK.dbfs(CK.peak(on.subarray(t.midFrom, t.midTo))), t.peakDb, 0.05, `${tag}: 꼭대기 dBFS ≈ 20·log10(gain)`);
      eq([on[0], on[t.length - 1]], [0, 0], `${tag}: 처음과 끝 표본은 0(딱 소리 없음)`);
      // 이웃 표본 사이 차이는 gain·2πf/sr 를 넘지 못한다(끊긴 곳이 없다). 페이드 기울기만큼 여유
      let maxStep = 0; for (let i = 1; i < on.length; i++) maxStep = Math.max(maxStep, Math.abs(on[i] - on[i - 1]));
      ok(maxStep <= t.gain * (2 * Math.PI * t.freq / t.sampleRate) + t.gain / (t.sampleRate * 0.015) + 1e-6, `${tag}: 끊긴 곳 없음`);
      // 부호가 바뀌는 횟수 ≈ 2·f·초 (주파수가 맞는지 식과 다른 길로 확인)
      let cross = 0; for (let i = 1; i < on.length; i++) if ((on[i - 1] < 0 && on[i] >= 0) || (on[i - 1] > 0 && on[i] <= 0)) cross++;
      ok(Math.abs(cross - 2 * t.freq * t.seconds) <= 2, `${tag}: 부호 바뀜 ${cross}번 ≈ ${2 * t.freq * t.seconds}`);
    }
  });
  // 안전: 크기는 0.5를 넘지 못하고, 안 주면 0.1(꼭대기 -20 dBFS)
  eq([CK.DEFAULT_GAIN, CK.MAX_GAIN], [0.1, 0.5], '처음 크기 0.1, 한도 0.5');
  eq([CK.clampGain(0.9), CK.clampGain(5), CK.clampGain(0.3), CK.clampGain(0), CK.clampGain(-1), CK.clampGain(NaN), CK.clampGain('x')], [0.5, 0.5, 0.3, 0, 0.1, 0.1, 0.1], '크기 한도');
  eq(CK.makeTone({ gain: 3 }).gain, 0.5, '크기 3을 줘도 0.5');
  ok(CK.peak(CK.makeTone({ gain: 3 }).left) <= 0.5 + 1e-7, '실제 표본도 0.5를 넘지 않음');
  const d = CK.makeTone({});
  eq([d.gain, d.channel, d.sampleRate, d.length, d.freq], [0.1, 'both', 48000, 48000, 440], '기본값: 0.1, 양쪽, 48kHz 1초 440Hz');
  near(CK.dbfs(CK.peak(d.left)), -20, 0.01, '기본 음의 꼭대기는 -20 dBFS');
  eq(CK.makeTone({ channel: 'center' }).channel, 'both', '모르는 채널 이름은 양쪽');
  eq(CK.makeTone({ seconds: 0 }).length, 0, '0초');
  ok(CK.makeTone({ seconds: 0.001, sampleRate: 48000 }).left.every((v) => Math.abs(v) <= 0.1), '아주 짧아도 죽지 않음');
  // 주파수 훑기: 손으로 20 → 20000Hz, 10초. 1/3 지점 = 20·1000^(1/3) = 200, 2/3 = 2000, 절반 = √(20·20000) = 632.46
  near(CK.sweepFreq(20, 20000, 10, 10 / 3), 200, 1e-9, '훑기 1/3 지점 200Hz'); near(CK.sweepFreq(20, 20000, 10, 20 / 3), 2000, 1e-8, '2/3 지점 2000Hz');
  near(CK.sweepFreq(20, 20000, 10, 5), 632.4555320336759, 1e-9, '절반 지점 632.46Hz');
  eq([CK.sweepFreq(20, 20000, 10, 0), CK.sweepFreq(20, 20000, 10, 10), CK.sweepFreq(20, 20000, 10, -1), CK.sweepFreq(20, 20000, 10, 99)], [20, 20000, 20, 20000], '처음·끝·범위 밖');
  eq([CK.sweepFreq(0, 20000, 10, 1), CK.sweepFreq(20, 20000, 0, 1), CK.sweepFreq(20, -5, 10, 1)], [null, null, null], '잘못된 값은 null');
  C.sweep.forEach((c) => rel(CK.sweepFreq(c.f0, c.f1, c.T, c.t), c.f, 1e-12, `훑기 ${c.f0}→${c.f1} t=${c.t.toFixed(2)}`));
}

/* ───────────── 9. 스틱 쏠림 ───────────── */
group = 'stick';
{
  // 손으로: (0.03, 0.04) → 0.05(3-4-5) = 5% → 'slight'(5% 이상). (0.09, 0.12) → 0.15 → 'drift'
  const S = (x, y) => CK.stickRest(Array(20).fill([x, y]));
  near(S(0.03, 0.04).offset, 0.05, 1e-12, '(0.03, 0.04) → 0.05'); near(S(0.03, 0.04).percent, 5, 1e-10, '5%');
  near(S(0.06, -0.08).offset, 0.1, 1e-12, '(0.06, -0.08) → 0.10'); near(S(-0.09, 0.12).offset, 0.15, 1e-12, '(-0.09, 0.12) → 0.15');
  eq(S(0, 0).offset, 0, '가운데'); eq(S(1, 1).offset, 1, '(1, 1)은 1로 자른다'); near(S(0, 0).wobble, 0, 1e-15, '안 떨림');
  // 왼쪽·오른쪽으로 같은 만큼 튀면 평균은 가운데, 떨림은 0.1
  const w = CK.stickRest([[0.1, 0], [-0.1, 0], [0.1, 0], [-0.1, 0]]);
  near(w.offset, 0, 1e-15, '평균은 가운데'); near(w.wobble, 0.1, 1e-12, '떨림 0.1');
  eq([CK.driftVerdict(0), CK.driftVerdict(0.049), CK.driftVerdict(0.05), CK.driftVerdict(0.149), CK.driftVerdict(0.15), CK.driftVerdict(1)], ['centered', 'centered', 'slight', 'slight', 'drift', 'drift'], '판정 경계 5%·15%');
  eq([CK.driftVerdict(null), CK.driftVerdict(NaN)], [null, null], '값이 없으면 판정 없음');
  eq(CK.driftVerdict(0.08, 0.1, 0.3), 'centered', '기준을 바꿀 수 있다');
  eq([CK.DRIFT_SLIGHT, CK.DRIFT_CLEAR], [0.05, 0.15], '화면에 밝히는 기준');
  eq(CK.stickRest([]), { x: null, y: null, offset: null, percent: null, wobble: null, samples: 0 }, '표본 없음');
  eq(CK.stickRest([[NaN, 0], null, [0.2, 0]]).samples, 1, '잘못된 표본은 뺀다');
  // 화면에 보이는 자리(0.1%)로 맞춰 판정한다(제3자 평가 L4): 평균을 내다 생긴 끝자리 오차로 '5.0%'가 '가운데'로 나오면 안 된다
  eq([CK.driftVerdict(0.04999999999999999), CK.driftVerdict(0.0496), CK.driftVerdict(0.0494), CK.driftVerdict(0.14999999999999997), CK.driftVerdict(0.1496), CK.driftVerdict(0.1494)],
    ['slight', 'slight', 'centered', 'drift', 'drift', 'slight'], '5.0%로 보이는 값은 조금 쏠림, 15.0%로 보이는 값은 쏠림');
  eq(CK.stickVerdict(CK.stickRest(Array(70).fill([0.05, 0]))).verdict, 'slight', '(0.05, 0)을 70번 평균 낸 값 → 5.0% → 조금 쏠림');
  eq(CK.stickVerdict(CK.stickRest(Array(70).fill([0.15, 0]))).verdict, 'drift', '(0.15, 0)을 70번 평균 낸 값 → 15.0% → 쏠림');
  eq([CK.roundTenth(0.0496), CK.roundTenth(0.0494), CK.roundTenth(0.1), CK.roundTenth(0)], [0.05, 0.049, 0.1, 0], '0.1% 자리로 반올림');
  // 떨림(제3자 평가 M6). 손으로: 좌우로 0.1씩 번갈아 튀면 평균은 가운데(0), 가장 멀리 튄 거리 0.1 = 10% → 가운데지만 떨림
  eq(CK.stickVerdict(w), { verdict: 'centered', jitter: true, percent: 0, wobblePercent: 10 }, '가운데지만 떨리는 스틱');
  eq(CK.stickVerdict(S(0.03, 0.04)), { verdict: 'slight', jitter: false, percent: 5, wobblePercent: 0 }, '조금 쏠렸고 안 떨리는 스틱');
  eq(CK.stickVerdict(CK.stickRest([[0.02, 0], [-0.02, 0]])).jitter, false, '2% 떨림은 떨림으로 보지 않는다');
  eq([CK.DRIFT_WOBBLE, CK.wobbleVerdict(0.0494), CK.wobbleVerdict(0.0496), CK.wobbleVerdict(0.05), CK.wobbleVerdict(0.2), CK.wobbleVerdict(0), CK.wobbleVerdict(null), CK.wobbleVerdict(0.08, 0.1)],
    [0.05, false, true, true, true, false, null, false], '떨림 경계 5%(화면에 보이는 자리로 맞춰서)');
  eq([CK.stickVerdict(CK.stickRest([])), CK.stickVerdict(null)], [null, null], '표본이 없으면 판정 없음');
  C.stickJitter.forEach((c, i) => {
    const v = CK.stickVerdict(CK.stickRest(c.samples));
    eq([v.verdict, v.jitter], [c.verdict, c.jitter], `떨림 ${i}: 판정(쏠림 ${c.verdict}, 떨림 ${c.jitter})`);
    near(v.percent, c.percent, 1e-9, `떨림 ${i}: 보여 주는 쏠림 %`); near(v.wobblePercent, c.wobblePercent, 1e-9, `떨림 ${i}: 보여 주는 떨림 %`);
  });
  // 축 하나의 가만히 둔 값(배치를 모르는 컨트롤러). 손으로: [0.1, -0.1, 0.3] → 평균 0.1, 폭 0.4. 트리거가 축으로 오는 기기는 -1에 가만히 있다
  const ar = CK.axisRest([0.1, -0.1, 0.3]);
  near(ar.mean, 0.1, 1e-12, '축 평균 0.1'); near(ar.range, 0.4, 1e-12, '축이 움직인 폭 0.4'); eq([ar.min, ar.max, ar.samples], [-0.1, 0.3, 3], '축 최소·최대·표본 수');
  eq(CK.axisRest([-1, -1, -1]), { mean: -1, min: -1, max: -1, range: 0, samples: 3 }, '가만히 -1에 있는 축');
  eq([CK.axisRest([]), CK.axisRest([NaN, 'x']).samples], [{ mean: null, min: null, max: null, range: null, samples: 0 }, 0], '표본이 없는 축');
  C.axes.forEach((c, i) => { const a = CK.axisRest(c.values); near(a.mean, c.mean, 1e-12, `축 ${i}: 평균(statistics.fmean)`); near(a.range, c.range, 1e-12, `축 ${i}: 폭`); eq([a.min, a.max], [c.min, c.max], `축 ${i}: 최소·최대`); });
  C.sticks.forEach((c, i) => {
    const r = CK.stickRest(c.samples);
    near(r.x, c.x, 1e-12, `스틱 ${i}: 평균 x(statistics.fmean)`); near(r.y, c.y, 1e-12, `스틱 ${i}: 평균 y`);
    near(r.offset, c.offset, 1e-12, `스틱 ${i}: 중심에서 거리`); near(r.percent, c.percent, 1e-10, `스틱 ${i}: %`);
    near(r.wobble, c.wobble, 1e-12, `스틱 ${i}: 떨림`);
  });
}

/* ───────────── 10. 해상도 ───────────── */
group = 'resolution';
{
  C.megapixels.forEach((c) => near(CK.megapixels(c.w, c.h), c.mp, 1e-12, `${c.w}×${c.h} = ${c.mp}MP`));
  near(CK.megapixels(1920, 1080), 2.0736, 1e-12, '1920×1080 = 2.0736MP(손으로)');
  eq([[1920, 1080], [1080, 1920], [1280, 720], [3840, 2160], [2560, 1440], [640, 480], [640, 360], [320, 240], [1280, 960], [1920, 1200], [0, 0]].map(([w, h]) => CK.resolutionName(w, h)),
    ['1080p', '1080p', '720p', '4K', '1440p', '480p', '360p', '240p', null, null, null], '해상도 이름(정해진 크기만)');
  eq([CK.resolutionName(null, 3), CK.megapixels('a', 3)], [null, null], '숫자가 아니면 null');
}

/* ───────────── 11. 장치 오류 나누기 ───────────── */
group = 'errors';
{
  const E = (name, message, ctx) => { const r = CK.classifyMediaError({ name, message }, ctx); return [r.kind, r.retry, r.settings]; };
  // 표: 오류 이름(웹 표준) → 종류, 다시 눌러 볼 만한가, 어디 설정을 볼까
  eq(E('NotAllowedError', 'Permission denied'), ['denied', false, 'browser'], '권한 거절 → 브라우저의 사이트 권한');
  eq(E('NotAllowedError', 'Permission dismissed'), ['dismissed', true, null], '묻는 창을 닫음 → 다시 누르면 됨');
  eq(E('NotAllowedError', 'Permission denied by system'), ['denied-system', false, 'os'], '운영체제가 막음 → 운영체제 설정');
  // 3단계(제3자 평가 L6): 크롬 계열의 문장('Permission denied')일 때만 '이 사이트의 권한이 막힘'으로 단정한다.
  // 파이어폭스·사파리는 막았을 때와 창을 닫았을 때 같은 문장을 주므로 '막혀 있거나 창을 닫았을 수 있음'(denied-maybe, 다시 눌러 볼 만함)으로 알린다
  eq(E('NotAllowedError', 'Permission denied by user'), ['denied', false, 'browser'], '크롬 계열: 사용자가 막음');
  eq(E('NotAllowedError', 'permission denied.'), ['denied', false, 'browser'], '대소문자·마침표가 달라도 같은 문장');
  eq(E('NotAllowedError', ''), ['denied-maybe', true, 'browser'], '메시지가 없으면 단정하지 않는다');
  eq(E('NotAllowedError', 'The request is not allowed by the user agent or the platform in the current context.'), ['denied-maybe', true, 'browser'], '파이어폭스식 문장: 단정하지 않는다');
  eq(E('NotAllowedError', 'The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.'), ['denied-maybe', true, 'browser'], '사파리식 문장: 단정하지 않는다');
  eq(E('PermissionDeniedError', ''), ['denied-maybe', true, 'browser'], '옛 이름(문장 없음)');
  eq(E('PermissionDeniedError', 'Permission denied'), ['denied', false, 'browser'], '옛 이름 + 크롬 문장');
  eq(E('NotFoundError', 'Requested device not found'), ['no-device', true, null], '장치 없음');
  eq(E('DevicesNotFoundError', ''), ['no-device', true, null], '장치 없음(옛 이름)');
  eq(E('NotReadableError', 'Could not start audio source'), ['in-use', true, null], '다른 앱이 쓰는 중이거나 못 엶');
  eq(E('TrackStartError', ''), ['in-use', true, null], '못 엶(옛 이름)');
  eq(E('OverconstrainedError', ''), ['constraint', true, null], '고른 장치·설정을 못 맞춤');
  eq(E('ConstraintNotSatisfiedError', ''), ['constraint', true, null], '못 맞춤(옛 이름)');
  eq(E('AbortError', ''), ['aborted', true, null], '중단');
  eq(E('SecurityError', ''), ['policy', false, null], '문서 정책이 막음');
  eq(E('TypeError', ''), ['unknown', true, null], '보안 연결에서의 TypeError는 알 수 없음');
  eq(E('SomethingNew', 'x'), ['unknown', true, null], '모르는 이름');
  eq(E('', ''), ['unknown', true, null], '이름 없음');
  // 보안 연결(https)이 아닐 때
  eq(E('NotAllowedError', 'Permission denied', { secure: false }), ['insecure', false, null], 'http에서는 권한보다 연결이 먼저');
  eq(E('TypeError', '', { secure: false }), ['insecure', false, null], 'http에서의 TypeError');
  eq(E('SecurityError', '', { secure: false }), ['insecure', false, null], 'http에서의 SecurityError');
  eq(E('NotFoundError', '', { secure: false }), ['no-device', true, null], '장치 없음은 연결과 무관');
  // API가 없을 때
  eq(E('', '', { hasApi: false, secure: true }), ['unsupported', false, null], 'https인데 API가 없으면 지원 안 함');
  eq(E('', '', { hasApi: false, secure: false }), ['insecure', false, null], 'http라 API가 없으면 보안 연결 문제');
  eq(CK.classifyMediaError(null).kind, 'unknown', '오류 객체가 없어도 죽지 않음');
  eq(CK.classifyMediaError(new TypeError('x')).name, 'TypeError', '진짜 오류 객체도 받는다');
  eq(CK.classifyMediaError({ name: 'NotAllowedError', message: 'Permission denied' }).name, 'NotAllowedError', '원래 이름을 같이 돌려준다');
}

/* ───────────── 12. 가이드 글에 적은 숫자 ───────────── */
// 글(_dev/articles.json)의 표와 문장에 적은 숫자를 로직으로 다시 구해 맞춰 본다. 글을 고치면 여기도 같이 고친다.
group = 'guide';
{
  const ART = JSON.parse(fs.readFileSync(path.join(HERE, '..', '_dev', 'articles.json'), 'utf8'));
  const body = (lang, slug) => ART[lang].find((a) => a.slug === slug).body_html;
  const run = (ev, opts) => CK.analyzeKeyEvents(ev.map(([type, id, t]) => ({ type, id, t })), opts);

  // 채터링 글의 표 네 줄: [사건, 뗌→다시 눌림 간격, 기준 30ms에서 의심 수, 기준 10ms에서 의심 수]
  const rows = [
    [[['down', 'KeyA', 0], ['up', 'KeyA', 60], ['down', 'KeyA', 72]], 12, 1, 0],
    [[['down', 'KeyA', 0], ['up', 'KeyA', 150], ['down', 'KeyA', 155]], 5, 1, 1],
    [[['down', 'KeyA', 0], ['up', 'KeyA', 60], ['down', 'KeyA', 90]], 30, 0, 0],
    [[['down', 'KeyA', 0], ['up', 'KeyA', 60], ['down', 'KeyA', 180]], 120, 0, 0],
  ];
  const en = body('en', 'keyboard-double-typing'), ko = body('ko', 'keyboard-chattering');
  const word = { en: ['not counted', 'counted'], ko: ['정상', '의심'] };
  for (const [ev, gap, at30, at10] of rows) {
    eq(ev[2][2] - ev[1][2], gap, `표: 간격 ${gap}ms`);
    eq(run(ev, { chatterMs: 30 }).suspects.length, at30, `표: ${gap}ms, 기준 30ms`);
    eq(run(ev, { chatterMs: 10 }).suspects.length, at10, `표: ${gap}ms, 기준 10ms`);
    ok(en.includes(`<td>${gap} ms</td><td>${word.en[at30]}</td><td>${word.en[at10]}</td>`), `영어 글 표에 ${gap} ms 줄`);
    ok(ko.includes(`<td>${gap}ms</td><td>${word.ko[at30]}</td><td>${word.ko[at10]}</td>`), `한국어 글 표에 ${gap}ms 줄`);
  }
  eq(CK.KEY_CHATTER_MS, 30, '글에 적은 기본 기준 30ms');
  ok(en.includes('under 30 ms') && ko.includes('30ms(0.03초)보다 짧으면'), '글의 기준 문장');
  // 둘째 줄: 누름과 누름 사이는 155ms
  eq(rows[1][0][2][2] - rows[1][0][0][2], 155, '둘째 줄의 누름↔누름 155ms');
  ok(en.includes('155 ms apart') && ko.includes('155ms라'), '글의 155ms');

  // 동시 입력 글의 표 세 줄
  const max = (ev) => run(ev).maxHeld;
  const hold = (...ids) => ids.map((id, i) => ['down', id, i * 100]);
  eq(max(hold('KeyA', 'KeyS', 'KeyD', 'KeyF')), 4, '표: A S D F → 4');
  eq(max([...hold('KeyA', 'KeyS', 'KeyD', 'KeyF'), ['up', 'KeyA', 500], ['down', 'KeyG', 600]]), 4, '표: A를 떼고 G → 그대로 4');
  eq(max([['down', 'KeyA', 0], ['down', 'KeyS', 100], ['up', 'KeyA', 200], ['down', 'KeyD', 300], ['down', 'KeyF', 400], ['down', 'KeyJ', 500]]), 4, '표: A+S, A 뗌, D F J → 4');
  eq(max([['down', 'ShiftLeft', 0], ['down', 'KeyA', 100]]), 2, '조합 키도 하나로 센다');
  eq(max([['down', 'KeyA', 0], ['up', 'KeyA', 50], ['down', 'KeyS', 100]]), 1, '뗀 키는 세지 않는다');
  const enR = body('en', 'n-key-rollover-ghosting'), koR = body('ko', 'dongsi-ipryeok-rollover');
  ok(enR.includes('<td>A S D F</td><td>4</td>') && enR.includes('<td>S D F G</td><td>still 4</td>') && enR.includes('<td>S D F J</td><td>4</td>'), '영어 글 표');
  ok(koR.includes('<td>A S D F</td><td>4개</td>') && koR.includes('<td>S D F G</td><td>그대로 4개</td>') && koR.includes('<td>S D F J</td><td>4개</td>'), '한국어 글 표');

  // 모니터 글: 화면 한 장 16.67ms → 60Hz, 6.94ms → 144Hz, 120장
  near(1000 / 60, 16.67, 0.005, '1000/60 = 16.67ms');
  near(1000 / 144, 6.94, 0.005, '1000/144 = 6.94ms');
  eq(CK.refreshEstimate(Array(120).fill(16.67)).nearest, 60, '16.67ms 간격 120개 → 약 60Hz');
  eq(CK.refreshEstimate(Array(120).fill(6.94)).nearest, 144, '6.94ms 간격 120개 → 약 144Hz');
  ok(CK.refreshEstimate(Array(120).fill(16.67), { minSamples: 120 }).enough && !CK.refreshEstimate(Array(119).fill(16.67), { minSamples: 120 }).enough, '120장이 차야 결과');
  const enM = body('en', 'check-new-monitor-dead-pixels'), koM = body('ko', 'bulryang-hwaso-hwagin');
  ok(enM.includes('16.67 ms is 60 Hz') && enM.includes('6.94 ms is 144 Hz') && enM.includes('120 frames'), '영어 글의 숫자');
  ok(koM.includes('16.67ms면 60Hz') && koM.includes('6.94ms면 144Hz') && koM.includes('화면 120장'), '한국어 글의 숫자');

  // 마이크 글: -45 dBFS 선, -20 dBFS = 가장 큰 값의 10분의 1
  eq(CK.MIC_HEARD_DB, -45, '소리를 잡았다고 보는 선');
  near(CK.dbfs(0.1), -20, 1e-9, '0.1 = -20 dBFS');
  near(CK.dbfs(1), 0, 1e-12, '1.0 = 0 dBFS');
  const enV = body('en', 'microphone-not-working-browser'), koV = body('ko', 'maikeu-an-japil-ttae');
  ok(enV.includes('−45 dBFS') && enV.includes('−20 dBFS is one tenth'), '영어 글의 숫자');
  ok(koV.includes('-45 dBFS') && koV.includes('-20 dBFS는') && koV.includes('10분의 1'), '한국어 글의 숫자');
}

/* ───────────── 결과 ───────────── */
const ONLY_SUMMARY = process.argv.includes('--quiet');
if (!ONLY_SUMMARY) for (const [g, [p, f]] of Object.entries(perGroup)) console.log(`  ${f ? '✗' : '✓'} ${g.padEnd(12)} ${p} 통과${f ? `, ${f} 실패` : ''}`);
if (fails.length) console.log('\n실패:\n  ' + fails.join('\n  '));
console.log(`\n${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
