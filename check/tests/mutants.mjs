// 시험이 정말 잡아내는지 보기: node check/tests/mutants.mjs
// 로직 파일을 임시 폴더에 복사해 한 군데씩 일부러 틀리게 바꾸고 run.mjs 를 돌린다. 전부 '잡힘'이어야 한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const A = path.join(HERE, '..', 'assets');
const FILES = ['ck-keys.js', 'ck-measure.js'];
const M = [
  // [파일, 원래 글자, 바꿀 글자, 무엇을 틀리게 했나]
  ['ck-keys.js', 'if (gap < chatterMs)', 'if (gap <= chatterMs)', '채터링 경계(딱 30ms도 의심으로)'],
  ['ck-keys.js', "if (repeat) return { counted: false", "if (false) return { counted: false", '반복 이벤트를 누름으로 셈'],
  ['ck-keys.js', 'if (heldN > maxHeld)', 'if (heldN >= maxHeld)', '최대일 때의 키 목록이 나중 것으로 바뀜'],
  ['ck-keys.js', 'blur: function () { held = {}; heldN = 0; lastUp = {}; }', 'blur: function () { held = {}; heldN = 0; }', 'blur 뒤에도 옛 뗌 시각으로 간격을 잼'],
  ['ck-keys.js', "heldN--; lastUp[id] = t; }", "heldN--; }", '뗌 시각을 안 적음(채터링을 하나도 못 잡음)'],
  ['ck-keys.js', "heldIds().forEach(function (h) { if (!MODS[h]) { delete held[h]; heldN--; } });", "", '맥 Command 뗌 처리 빠짐'],
  ['ck-keys.js', "return b.count - a.count || a.minGap - b.minGap", "return a.count - b.count || a.minGap - b.minGap", '의심 키 순서 거꾸로'],
  ['ck-keys.js', "k('Enter', 2.25)", "k('Enter', 2)", 'Enter 너비'],
  ['ck-keys.js', "k('Space', 6.25)", "k('Space', 6)", '스페이스 너비'],
  ['ck-keys.js', "k('Semicolon')", "k('SemiColon')", 'code 오타'],
  ['ck-keys.js', "k('ShiftLeft', 1.25), k('IntlBackslash')", "k('IntlBackslash'), k('ShiftLeft', 1.25)", 'ISO: Shift와 옆 키 자리 바뀜'],
  ['ck-keys.js', "ext: { dx: -0.25, w: 0.25, h: 1 }", "ext: { dx: -0.25, w: 0.25, h: 2 }", 'ISO 엔터의 나온 부분이 아랫줄 키와 겹침'],
  ['ck-keys.js', "return /mac|iphone|ipad|ipod/i.test(String(platform || '')) ? 'mac' : 'full';", "return 'full';", '맥에서도 Win 키 배열이 뜸'],
  ['ck-keys.js', "k('NumpadAdd', 1, 2)", "k('NumpadAdd', 1, 1)", '숫자판 + 높이'],
  ['ck-keys.js', "k('Tab', 1.5)].concat(LETTERS_1, [k('BracketLeft'), k('BracketRight'), k('Backslash', 1.5)])", "k('Tab', 1.5)].concat(LETTERS_1, [k('BracketLeft'), k('Backslash', 1.5), k('BracketRight')])", 'PC ]와 \\ 자리 바뀜(너비가 달라 자리가 어긋남)'],
  ['ck-keys.js', "var PC_LANG = { Lang1: 'AltRight', Lang2: 'ControlRight' };", "var PC_LANG = { Lang1: 'ControlRight', Lang2: 'AltRight' };", '한/영·한자 자리 바뀜'],
  ['ck-keys.js', "var CODE_ALIAS = { OSLeft: 'MetaLeft', OSRight: 'MetaRight' };", "var CODE_ALIAS = {};", '옛 윈도우 키 이름을 모름'],
  ['ck-keys.js', "return q.detectable && !has(q.code); }", "return !has(q.code); }", '못 받는 키(Fn)를 안 눌린 키로 셈'],
  ['ck-keys.js', "{ code: 'ArrowUp', w: 1, h: 0.5, stack: 'ArrowDown' }", "k('ArrowUp')", '맥 아래 화살표 빠짐'],
  ['ck-keys.js', "return { slot: null, via: null, extra: code };", "return { slot: null, via: null, extra: null };", '배열 밖 키를 조용히 버림'],
  ['ck-measure.js', "var a = nums(list).sort(function (x, y) { return x - y; });", "var a = nums(list).sort();", '중앙값: 글자 순서로 정렬'],
  ['ck-measure.js', "return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;", "return a[m];", '중앙값: 짝수 개일 때 평균 안 냄'],
  ['ck-measure.js', "var med = CK.median(a), hz = 1000 / med", "var med = CK.median(a), hz = 1 / med", '주사율: ms를 초로 안 바꿈'],
  ['ck-measure.js', "CK.REFRESH_TOL = 0.01;", "CK.REFRESH_TOL = 0.05;", '주사율: 흔한 값에 너무 쉽게 붙음'],
  ['ck-measure.js', "if (Math.abs(a[i] - med) <= med * 0.15) inBand++;", "if (Math.abs(a[i] - med) <= med * 0.5) inBand++;", '고른 프레임 띠 넓힘'],
  ['ck-measure.js', "var idle = opts.idleGapMs == null ? 40 : opts.idleGapMs;", "var idle = opts.idleGapMs == null ? 400 : opts.idleGapMs;", '폴링: 쉰 시간을 안 뺌'],
  ['ck-measure.js', "if (d < 0 || d > idle)", "if (d < 0 || d >= idle)", '폴링: 쉬는 구간 경계'],
  ['ck-measure.js', "var r = n / span * 1000;", "var r = (n + 1) / span * 1000;", '폴링: 간격 수 대신 이벤트 수(하나 더 셈)'],
  ['ck-measure.js', "if (n >= minIv && span > 0 && span >= minSpan)", "if (n >= minIv && span > 0)", '폴링: 짧은 뭉침도 셈'],
  ['ck-measure.js', "activeIv += end - runStart; }", "activeIv += end - runStart + 1; }", '폴링 평균: 하나 더 셈'],
  ['ck-measure.js', "return Math.sqrt(sum / n);", "return Math.sqrt(sum) / n;", 'RMS 식'],
  ['ck-measure.js', "return 20 * Math.log10(amp);", "return 10 * Math.log10(amp);", 'dBFS: 20 대신 10'],
  ['ck-measure.js', "return (db - floorDb) / (0 - floorDb);", "return db / floorDb;", '막대 길이 거꾸로'],
  ['ck-measure.js', "if (n % 2) return m < silent ? -Infinity : finite[m - silent];", "if (n % 2) return m <= silent ? -Infinity : finite[m - silent];", '바탕 소음: 무음 경계'],
  ['ck-measure.js', "if (Math.abs(samples[i]) >= 0.999) c++;", "if (samples[i] >= 0.999) c++;", '잘림: 음수 쪽을 안 봄'],
  ['ck-measure.js', "if (ch !== 'right') L[i] = v;", "L[i] = v;", '오른쪽만 낼 때 왼쪽에도 소리'],
  ['ck-measure.js', "if (ch !== 'left') R[i] = v;", "if (ch === 'right') R[i] = v;", '양쪽일 때 오른쪽이 안 남'],
  ['ck-measure.js', "if (i < fade) env = i / fade; else if (i >= n - fade) env = (n - 1 - i) / fade;", "if (i < fade) env = i / fade;", '끝 페이드 없음(딱 소리)'],
  ['ck-measure.js', "return Math.min(CK.MAX_GAIN, g);", "return g;", '소리 크기 한도 없음'],
  ['ck-measure.js', "CK.DEFAULT_GAIN = 0.1;", "CK.DEFAULT_GAIN = 0.8;", '처음 소리가 큼'],
  ['ck-measure.js', "w = 2 * Math.PI * f / sr;", "w = Math.PI * f / sr;", '음 높이가 절반'],
  ['ck-measure.js', "return f0 * Math.pow(f1 / f0, t / duration);", "return f0 + (f1 - f0) * t / duration;", '훑기가 직선'],
  ['ck-measure.js', "var off = Math.min(1, Math.hypot(mx, my));", "var off = Math.min(1, Math.max(Math.abs(mx), Math.abs(my)));", '스틱 거리 식'],
  ['ck-measure.js', "var d = Math.hypot(q[0] - mx, q[1] - my); if (d > wob) wob = d;", "var d = Math.hypot(q[0], q[1]); if (d > wob) wob = d;", '떨림을 중심에서 잼'],
  ['ck-measure.js', "return offset >= clear ? 'drift' : offset >= slight ? 'slight' : 'centered';", "return offset > clear ? 'drift' : offset > slight ? 'slight' : 'centered';", '쏠림 판정 경계'],
  ['ck-measure.js', "var s = Math.min(w, h), l = Math.max(w, h);", "var s = h, l = w;", '세로로 든 카메라 해상도'],
  ['ck-measure.js', "if (/system/i.test(msg)) return out('denied-system', false, 'os');", "", '운영체제가 막은 경우를 못 가림'],
  ['ck-measure.js', "if (/dismiss/i.test(msg)) return out('dismissed', true);", "", '창을 닫은 경우를 못 가림'],
  ['ck-measure.js', "case 'NotReadableError':\n      case 'TrackStartError':\n        return out('in-use', true);", "case 'NotReadableError':\n      case 'TrackStartError':\n        return out('no-device', true);", '사용 중을 장치 없음으로'],
  ['ck-measure.js', "if (!secure) return out('insecure', false);\n        if (/dismiss/i", "if (/dismiss/i", 'http인데 권한 탓으로 알림'],
  ['ck-measure.js', "if (!hasApi) return secure ? out('unsupported', false) : out('insecure', false);", "if (!hasApi) return out('unsupported', false);", 'http라 API가 없는 경우'],
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-mut-'));
const src = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(A, f), 'utf8')]));
let caught = 0, missed = [], broken = [];
for (const [file, from, to, what] of M) {
  if (!src[file].includes(from)) { broken.push(what + ' (원래 글자를 못 찾음)'); continue; }
  for (const f of FILES) fs.writeFileSync(path.join(tmp, f), f === file ? src[f].replace(from, to) : src[f]);
  const r = spawnSync(process.execPath, [path.join(HERE, 'run.mjs'), '--quiet'], { env: { ...process.env, CK_ASSETS: tmp }, encoding: 'utf8' });
  if (r.status !== 0) caught++; else missed.push(`${file}: ${what}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`일부러 틀리게 바꾼 ${M.length}곳 중 ${caught}곳 잡힘`);
if (missed.length) console.log('못 잡음:\n  ' + missed.join('\n  '));
if (broken.length) console.log('바꾸지 못함:\n  ' + broken.join('\n  '));
process.exit(missed.length || broken.length ? 1 : 0);
