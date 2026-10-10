// 시험이 정말 잡는지 보기: tj-core.js 를 한 군데씩 일부러 틀리게 바꾼 복사본으로 run.mjs 를 돌려 실패하는지 본다.
// node typing/tests/mutate.mjs   (복사본은 기기 임시 폴더에 만들고 지운다. 저장소 파일은 건드리지 않는다)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'assets', 'tj-core.js'), 'utf8');
const M = [
  ['겹모음 ㅘ를 ㅗ+ㅐ로', "'ㅗㅏ', 'ㅗㅐ', 'ㅗㅣ'", "'ㅗㅐ', 'ㅗㅐ', 'ㅗㅣ'"],
  ['겹받침 ㄵ·ㄶ 순서 바꿈', "'ㄴㅈ', 'ㄴㅎ', 'ㄷ', 'ㄹ', 'ㄹㄱ'", "'ㄴㅎ', 'ㄴㅈ', 'ㄷ', 'ㄹ', 'ㄹㄱ'"],
  ['ㅆ을 Shift 없는 글쇠로', "var SHIFT_JAMO = 'ㄲㄸㅃㅆㅉㅒㅖ'", "var SHIFT_JAMO = 'ㄲㄸㅃㅉㅒㅖ'"],
  ['ㅐ·ㅔ 자리 바꿈', "'ㅐ': 'o', 'ㅔ': 'p'", "'ㅐ': 'p', 'ㅔ': 'o'"],
  ['Shift를 타수에서 뺌', 'return needsShift(tok) ? 2 : 1;', 'return 1;'],
  ['낱자 겹자음을 한 글쇠로', "var LONE = ['ㄱ', 'ㄲ', 'ㄱㅅ'", "var LONE = ['ㄱ', 'ㄲ', 'ㄱ'"],
  ['조합 중인 글자를 틀렸다고 함', 'else if (done > 0) { st[ci] = PENDING;', 'else if (done > 0) { st[ci] = BAD;'],
  ['글쇠 흐름 대신 글자끼리만 비교(받침 넘어감을 틀렸다고 함)', "if (bad) { st[ci] = BAD; r.badChars++; }", "if (bad || (done > 0 && done < to - from && Array.from(r.value).slice(-1)[0] !== partial(T.chars[ci], done))) { st[ci] = BAD; r.badChars++; }"],
  ['다른 글쇠로 친 값을 2로', "(ik[i - 1] === tk[j - 1] ? 0 : 1), up = ", "(ik[i - 1] === tk[j - 1] ? 0 : 2), up = "],
  ['틀린 글쇠를 전부 맞았다고 함', 'good = align(before.concat([tok]), Tw.tk, true).cost === a0.cost;', 'good = true;'],
  ['터치 자판에서 조합 중인 글자를 바로 판정', "var held = opt.lenient ? heldTail(chars, opt.hold | 0) : 0;", 'var held = 0;'],
  ['터치 자판에서 아래아 같은 중간 글자를 미루지 않음', "while (k < n && isMid(chars[n - 1 - k])) k++;", ''],
  ['터치 자판에서 조합 중인 문자열 길이를 무시', "while (h < hold && h < n && (isHangul(chars[n - 1 - h]) || isMid(chars[n - 1 - h]))) h++;", ''],
  ['끝날 때 아래아를 글쇠로 셈', ".filter(function (ch) { return !isMid(ch); })", ''],
  ['겹 띄어쓰기를 그대로 둠', ".replace(/([ \\n])[ \\n]+/g, '$1');", ';'],
  ['줄바꿈 자리 띄어쓰기를 틀렸다고 함', "var sepOk = I.sep === Tw.sep || (opt.soft && Tw.sep === '\\n' && I.sep === ' ');", 'var sepOk = I.sep === Tw.sep;'],
  ['띄어쓰기를 타수에서 뺌', "st[Tw.sepAt] = OK; r.okChars++; r.okStrokes += 1;", 'st[Tw.sepAt] = OK; r.okChars++;'],
  ['타수 식: 60초를 6초로', 'return ms > 0 ? count * 60000 / ms : 0;', 'return ms > 0 ? count * 6000 / ms : 0;'],
  ['WPM 식: 5로 나누지 않고 6으로', 'return ms > 0 ? chars / 5 * 60000 / ms : 0;', 'return ms > 0 ? chars / 6 * 60000 / ms : 0;'],
  ['정확도 식 뒤집음', 'return typed > 0 ? ok / typed * 100 : null;', 'return typed > 0 ? typed / ok * 100 : null;'],
  ['순 WPM을 누른 글쇠로 계산', 'wpm: TJ.calc.wpm(c.okChars, ms),', 'wpm: TJ.calc.wpm(this.typedKeys, ms),'],
  ['멈춘 동안에도 시간이 감', "this.acc += Math.max(0, this.now() - this.t0); this.t0 = null;", 'this.acc += 0;'],
  ['오래 쉰 간격도 느린 글쇠에 넣음', 'var GAP_CAP = 3000;', 'var GAP_CAP = 300000;'],
  ['느린 글쇠 순서 뒤집음', 'return b.avg - a.avg ||', 'return a.avg - b.avg ||'],
  ['난수 상수 바꿈', '0x6D2B79F5', '0x6D2B79F4'],
  ['같은 낱말이 연달아 나와도 둠', 'while (w === a || w === b);', 'while (false);'],
  ['CRC 다항식 바꿈', '0xEDB88320', '0xEDB88321'],
  ['한/영 안내를 반대로', "? { h: 'en', p: p } : null;", "? { h: 'ko', p: p } : null;"],
  ['한/영 안내가 띄어쓰기에서 꺼짐', "if (j > 0 && !iw[j].c.length) j--;", ''],
  ['한/영 안내 구간을 앞 낱말까지 묶지 않음', "if (k.p > 0) break;", 'break;'],
  ['숫자·기호만 든 낱말에서 안내 구간이 끊김', "} else if (!k && plainWord(iw[j].c, tw[j].c, iw[j].closed)) continue;", '}'],
  ['Caps Lock 을 한 글자로도 알림', "(hint === 'caps' && n < 2)", "(hint === 'caps' && n < 1)"],
  ['덜 치고 닫은 낱말도 반대 자판으로 봄', "(closed ? want === q : want.slice(0, q.length) === q)", "(want.slice(0, q.length) === q)"],
  ['손가락 표 한 칸 바꿈', "'12344556788', '1234455678'", "'12344556788', '1234555678'"],
  ['조합 중인 모양에서 받침을 하나 덜 그림', 'Math.min(k - 1 - p.v.length, p.f.length)', 'Math.min(k - 2 - p.v.length, p.f.length)'],
  ['한/영 안내 구간의 글쇠도 셈', 'if (idx >= zone) { log[idx] = { c: false, tok: tok, good: good, want: want }; this.skippedKeys++; continue; }', ''],
  ['안내가 뜨기 전에 센 글쇠를 되돌리지 않음', 'if (log[z] && log[z].c) this._uncount(log[z]);', ';'],
  ['받침이 넘어갈 때 자음을 두 번 셈(값이 줄면 기록을 버림)', "if (this.mode === 'char' || del === false) from = keep;\n    else from = (keep === log.length && fk.length > log.length) ? keep : start;", 'from = start;'],
  ['지우고 다시 친 같은 키를 세지 않음', "else from = (keep === log.length && fk.length > log.length) ? keep : start;", 'else from = keep;'],
  ['지우기 키를 봐도 꼬리를 버리지 않음', "if (del === true && this.mode === 'key') log.length = Math.min(log.length, start);", ''],
  ['터치 자판에서 지웠다 다시 넣은 글자를 두 번 셈', "if (this.mode === 'char' || del === false) from = keep;", 'if (del === false) from = keep;'],
  ['총 타수 식: 60초를 6초로', "grossSpeed: Math.round((res.typedStrokes || 0) * 600 / tenths),", "grossSpeed: Math.round((res.typedStrokes || 0) * 60 / tenths),"],
  ['소수 한 자리 정확도를 반올림으로', "Math.floor(ok * 1000 / typed) / 10", "Math.round(ok * 1000 / typed) / 10"],
  ['최근에 나온 문장을 피하지 않음', "if (!lap++ && avoid && avoid.length) deck = later(deck, avoid);", ''],
  ['문장 n개 고르기에서 최근 문장을 피하지 않음', "if (avoid && avoid.length) d = later(d, avoid).reverse();", ''],
  ['문장 길이를 하나씩 더 셈', "len += toChars(s).length + (out.length ? 1 : 0);", 'len += toChars(s).length + 1;'],
  ['안내 뒤 첫 글쇠의 간격도 잼', 'if (zone !== Infinity) this.lastAt = null;', 'if (false) this.lastAt = null;'],
  ['표시 속도를 반올림 전 시간으로 계산', 'speed: Math.round(res.strokes * 600 / tenths),', 'speed: Math.round(res.strokes * 60000 / res.ms),'],
  ['표시 정확도: 틀린 게 있어도 100으로 올림', 'if (acc === 100 && ok < typed) acc = 99;', ''],
  ['표시 WPM 식: 5 대신 6', 'wpm: Math.round(res.okChars * 120 / tenths),', 'wpm: Math.round(res.okChars * 100 / tenths),'],
  ['자판으로 못 치는 글자를 통과시킴', "return ch === '\\n' || (c >= 0x20 && c <= 0x7E);", 'return true;'],
];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tj-mut-'));
let caught = 0;
for (const [name, from, to] of M) {
  if (!src.includes(from)) { console.log('못 찾음  ' + name); process.exitCode = 1; continue; }
  const f = path.join(dir, 'core.js');
  fs.writeFileSync(f, src.replace(from, to));
  const r = spawnSync(process.execPath, [path.join(here, 'run.mjs')], { env: { ...process.env, TJ_CORE: f }, encoding: 'utf8' });
  const tail = (r.stdout || '').trim().split('\n').slice(-1)[0];
  if (r.status !== 0) caught++; else process.exitCode = 1;
  console.log((r.status !== 0 ? '잡힘    ' : '안 잡힘 ') + name + '  → ' + tail);
}
fs.rmSync(dir, { recursive: true, force: true });
console.log('일부러 틀리게 바꾼 ' + M.length + '가지 가운데 ' + caught + '가지를 시험이 잡았다');
