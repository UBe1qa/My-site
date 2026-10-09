// 문자(SMS) 기준값 만들기: 세 가지 독립 구현으로 센 값을 tests/cases-sms.json 에 적는다.
//  - 파이썬 smsutil (주 기준: 문자표·통 나누기)
//  - npm sms-segments-calculator (Twilio), npm split-sms (보조 기준)
// 돌리기: cd <npm install 한 폴더> && PY=<smsutil 깐 파이썬> node <이 파일 경로>
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(process.cwd(), 'x.js'));
const { SegmentedMessage } = require('sms-segments-calculator');
const splitter = require('split-sms');
const PY = process.env.PY || 'python3';

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = rng(20261009);
const pick = (a) => a[Math.floor(rnd() * a.length)];

const curated = [
  ['a', '한 글자'], ['Hello, world!', '기본'], ['a'.repeat(160), 'GSM 160 = 한 통'], ['a'.repeat(161), 'GSM 161 = 두 통'],
  ['a'.repeat(153), '153'], ['a'.repeat(306), '306 = 두 통'], ['a'.repeat(307), '307 = 세 통'], ['a'.repeat(459), '459 = 세 통'], ['a'.repeat(460), '460 = 네 통'],
  ['{'.repeat(80), '확장 80개 = 160칸'], ['{'.repeat(81), '확장 81개 = 162칸 → 두 통'], ['a'.repeat(159) + '{', '159 + 확장 = 161칸'], ['a'.repeat(158) + '{', '158 + 확장 = 160칸'],
  ['a'.repeat(152) + '{' + 'a'.repeat(10), '통 경계에 걸친 확장 문자는 다음 통으로'], ['a'.repeat(152) + '{' + 'a'.repeat(152) + '{' + 'a'.repeat(5), '경계마다 확장 문자'],
  ['€100 [ok] {x} ~y| \\z^', '확장 문자들'], ['£5 ¥6 §7 ¿Qué? ¡Hola! Ñandú ÄÖÜäöüß ÆæØøÅå Çé', 'GSM-7에 있는 유럽 글자'],
  ['ΔΦΓΛΩΠΨΣΘΞ', 'GSM-7 그리스 대문자'], ['αβγ', '그리스 소문자는 표 밖'], ['ç', '소문자 ç는 표 밖'], ['á', 'á는 표 밖'], ['Привет', '키릴'],
  ['“smart quotes”', '둥근 따옴표는 표 밖'], ['it’s', '둥근 작은따옴표'], ['a—b', '긴 줄표'], ['a…', '말줄임표'], ['a b', 'NBSP'], ['tab\there', '탭은 표 밖'],
  ['line1\nline2', '줄바꿈 LF'], ['line1\r\nline2', 'CRLF'], ['a`b', '억음 부호 `는 표 밖'], ['안녕하세요', '한글'], ['가'.repeat(70), '한글 70 = 한 통'], ['가'.repeat(71), '한글 71 = 두 통'],
  ['가'.repeat(134), '134 = 두 통'], ['가'.repeat(135), '135 = 세 통'], ['😀', '이모지 하나 = 2단위'], ['😀'.repeat(35), '이모지 35 = 70단위'], ['😀'.repeat(36), '이모지 36 = 72단위 → 두 통'],
  ['a'.repeat(66) + '😀' + 'a'.repeat(10), '통 경계에 걸친 서로게이트 짝'], ['a'.repeat(69) + '😀', '69 + 이모지 = 71단위'], ['a'.repeat(68) + '😀', '68 + 이모지 = 70단위'],
  ['Hello 😀', '이모지 하나가 전체를 UCS-2로'], ['a'.repeat(100) + 'é' + 'a'.repeat(100), 'é는 GSM-7'], ['a'.repeat(100) + 'ê' + 'a'.repeat(100), 'ê 하나 때문에 UCS-2 → 세 통'],
  ['Your code is 123456. It expires in 10 minutes.', '흔한 안내 문자'], ['@', '@'], ['\f', '폼 피드(확장)'],
];
const gsmChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¤%&\'()*+-/:;<=>¡ÄÖÑÜ§¿äöñüà"#\n'.split('');
const extChars = '^{}\\[~]|€'.split('');
const uniChars = ['가', '한', '글', 'ç', 'á', '“', '’', '—', '…', 'Ж', 'α', '中', '\t', '`', '😀', '👍', '🇰', '🇷', '‍', '️', '🏽', '𝒜'];
const fuzz = [];
for (let n = 0; n < 900; n++) {
  const mode = pick(['gsm', 'gsm', 'ext', 'uni', 'uni']);
  // 경계 근처 길이를 많이 뽑는다
  const len = pick([1, 5, 20, 60, 66, 67, 68, 69, 70, 71, 72, 133, 134, 135, 136, 150, 152, 153, 154, 158, 159, 160, 161, 162, 200, 201, 202, 305, 306, 307, 308, 458, 459, 460, 461, 612, 613]) + Math.floor(rnd() * 3) - 1;
  let s = '';
  for (let k = 0; k < len; k++) {
    const r = rnd();
    if (mode === 'gsm') s += pick(gsmChars);
    else if (mode === 'ext') s += r < .15 ? pick(extChars) : pick(gsmChars);
    else s += r < .2 ? pick(uniChars) : r < .25 ? pick(extChars) : pick(gsmChars);
  }
  if (s) fuzz.push([s, 'fuzz-' + mode]);
}

const all = [...curated, ...fuzz];
const tmp = path.join(os.tmpdir(), 'lc-sms-in.json');
fs.writeFileSync(tmp, JSON.stringify(all.map((x) => x[0])));
const py = `
import json, sys, smsutil, importlib.metadata
from smsutil.codecs import GSM_BASIC_CHARSET, GSM_EXT_CHARSET
out = []
for t in json.load(open(sys.argv[1], encoding='utf-8')):
    r = smsutil.split(t)
    gsm = r.encoding == 'gsm0338'
    out.append({'encoding': 'GSM-7' if gsm else 'UCS-2', 'segments': len(r.parts), 'length': r.total_bytes if gsm else r.total_bytes // 2})
print(json.dumps({'cases': out, 'basic': GSM_BASIC_CHARSET, 'ext': GSM_EXT_CHARSET, 'version': __import__('importlib.metadata').metadata.version('smsutil')}))
`;
const ref = JSON.parse(execFileSync(PY, ['-c', py, tmp], { encoding: 'utf8', maxBuffer: 1 << 26 }));
fs.unlinkSync(tmp);

let twDiff = 0, spDiff = 0;
const cases = all.map(([text, note], i) => {
  const c = { text, note, ...ref.cases[i] };
  // Twilio 계산기: 사람이 보는 글자 묶음을 통 경계에서 쪼개지 않는 방침이라 결합 글자가 경계에 걸리면 한 통 더 나올 수 있다 → 같은 값일 때만 견줄 값으로 남긴다
  const tw = new SegmentedMessage(text);
  const t = { encoding: tw.encodingName, segments: tw.segmentsCount };
  if (t.encoding === c.encoding && t.segments === c.segments) c.twilio = t; else { twDiff++; c.twilio_differs = t; }
  const sp = splitter.split(text);
  const s = { encoding: sp.characterSet === 'GSM' ? 'GSM-7' : 'UCS-2', segments: sp.parts.length };
  if (s.encoding === c.encoding && s.segments === c.segments) c.splitsms = s; else { spDiff++; c.splitsms_differs = s; }
  return c;
});
fs.writeFileSync(path.join(HERE, 'cases-sms.json'), JSON.stringify({
  made_with: { smsutil: ref.version, 'sms-segments-calculator': require('sms-segments-calculator/package.json').version, 'split-sms': require('split-sms/package.json').version },
  gsm_basic: ref.basic, gsm_ext: ref.ext, cases, twilio_differs: twDiff, splitsms_differs: spDiff,
}));
console.log(`wrote cases-sms.json: ${cases.length} cases; Twilio와 다른 것 ${twDiff}, split-sms와 다른 것 ${spDiff}`);
for (const c of cases.filter((x) => x.twilio_differs || x.splitsms_differs).slice(0, 12)) console.log('  ', JSON.stringify(c.text.slice(0, 30)), c.note, c.encoding, c.segments, 'tw', JSON.stringify(c.twilio_differs || '='), 'sp', JSON.stringify(c.splitsms_differs || '='));
