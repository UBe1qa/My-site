// 기준값 더하기(노드 쪽 라이브러리): node typing/tests/gen_ref.mjs <hangul-js·es-hangul이 깔린 node_modules 경로>
// - hjs: hangul-js 의 disassemble 로 음절 11,172자를 낱자로 푼 것(전부 이어 붙인 글의 SHA-256)
// - esh: es-hangul 의 convertHangulToQwerty 로 음절 11,172자를 쿼티 글자열로 바꾼 것(SHA-256)
// - eshText: 연습 글(문장·속담·낱말) 전체를 es-hangul 로 쿼티 글자열로 바꾼 것(SHA-256)
// - ime2: gen_ref.py 가 적어 둔 짧은 글을 한 글쇠씩 칠 때마다 보이는 글(es-hangul convertQwertyToHangul 에 글쇠 앞부분을 차례로 넣음)
// 우리 코드(tj-core.js)는 쓰지 않는다. 값은 tests/ref/ref.json 에 더한다(gen_ref.py 를 먼저 돌린다).
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mods = process.argv[2];
if (!mods) { console.error('node_modules 경로를 주세요'); process.exit(1); }
const req = createRequire(path.join(path.resolve(mods), 'x.js'));
const Hangul = req('hangul-js');
const es = req('es-hangul');
const ko = createRequire(import.meta.url)('../assets/tj-text-ko.js');
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const a = [], b = [];
for (let cp = 0xAC00; cp <= 0xD7A3; cp++) {
  const ch = String.fromCodePoint(cp);
  a.push(Hangul.disassemble(ch).join(''));
  b.push(es.convertHangulToQwerty(ch));
}
const texts = [].concat(...Object.values(ko.sentences), ko.proverbs, ko.words);
const out = path.join(here, 'ref', 'ref.json');
const data = JSON.parse(fs.readFileSync(out, 'utf8'));
data.hjs = sha(a.join('|'));
data.esh = sha(b.join('|'));
data.eshText = { n: texts.length, sha: sha(texts.map((t) => es.convertHangulToQwerty(t)).join('\n')) };
data.ime2 = data.ime.map((p) => Array.from(p.keys).map((_, i) => es.convertQwertyToHangul(p.keys.slice(0, i + 1))));
data.made_with_node = 'hangul-js ' + req('hangul-js/package.json').version + ', es-hangul ' + req('es-hangul/package.json').version;
fs.writeFileSync(out, JSON.stringify(data));
console.log('added hjs, esh, eshText(' + texts.length + ') to', out, fs.statSync(out).size, 'bytes');
