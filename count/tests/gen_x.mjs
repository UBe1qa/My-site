// X(트위터) 기준값 만들기: npm twitter-text 로 센 값을 tests/cases-x.json 에, 도메인 끝 목록을 assets/lc-x-tld.js 에 적는다.
// 돌리기(라이브러리를 깐 폴더에서): cd <twitter-text를 npm install 한 폴더> && node <이 파일 경로>
// 먼저 gen_cases.py 를 돌려 cases.json(이모지 목록)을 만들어 둔다.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(process.cwd(), 'x.js'));
const tt = require('twitter-text');
const ver = require('twitter-text/package.json').version;
const src = (name) => require('twitter-text/dist/regexp/' + name + '.js');

/* 1) 도메인 끝 목록(일반·나라) → assets/lc-x-tld.js */
const inner = (re) => re.source.replace(/^\(\?:\(\?:/, '').replace(/\)\(\?=\[\^0-9a-zA-Z@\+-\]\|\$\)\)$/, '');
const g = inner(src('validGTLD')), c = inner(src('validCCTLD'));
fs.writeFileSync(path.join(HERE, '..', 'assets', 'lc-x-tld.js'),
  `/* 자동 생성: tests/gen_x.mjs (손으로 고치지 않는다)
   주소로 볼 도메인 끝 목록. 출처: twitter-text ${ver} (Apache-2.0)의 validGTLD(${g.split('|').length}개)·validCCTLD(${c.split('|').length}개).
   X가 실제로 쓰는 목록은 그 뒤에 늘었을 수 있다(새 도메인 끝은 주소로 안 잡힐 수 있음). */
(function (root) {
  var LC = root.LC || (root.LC = {});
  LC.X_TLD = {
    g: ${JSON.stringify(g)},
    c: ${JSON.stringify(c)}
  };
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
`);

/* 2) 사례 */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = rng(20261009);
const pick = (a) => a[Math.floor(rnd() * a.length)];

const curated = [
  '', ' ', 'hello', 'Hello, world!', '한글 테스트', '가', '漢字', 'あいう', 'ｶﾞ', 'Ａ', '—', '–', '…', '“quote”', '‘q’', '•', '※', '€', '™',
  '©', '©️', '®', '☺', '☺️', '1️⃣', '#️⃣', '#', '*️⃣', '‼', '‼️',
  '👨‍👩‍👧', '🇰🇷', '👍🏽', '😀', '😀😀', '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', '🇰', '🇰🇷🇺', '👍\u{1F3FD}\u{1F3FD}',
  'é', 'éclair café', '한', 'ᄒᆞᆫ', 'a‍b', '가‍나', 'a​b', '﻿a', 'a￾b', 'a￿',
  'see http://example.com/abc now', 'example.com', 'a.b', 'test.co.kr/한글', 'https://t.co/abc?x=1', 'https://t.co/abc/def', 'http://t.co/' + 'a'.repeat(41),
  'https://example.com', 'https://example.com/', 'http://example.com:8080/path?q=1#frag', 'https://example.com/a_(b)_c', 'https://example.com/a(b(c)d)e',
  'https://example.com/path.', 'https://example.com/path,', 'https://example.com/path)', '(https://example.com/path)', 'https://example.com/?', 'https://example.com/?q=a.',
  'www.example.com', 'www.example.com/path', 'example.co.kr', 'naver.com 에서 봐요', '주소는naver.com입니다', '주소는 naver.com입니다', 'naver.com,daum.net',
  'foo@example.com', '@example.com', '#example.com', '$example.com', 'a-example.com', '-example.com', '_example.com', '.example.com', '/example.com', 'x.example.com',
  'http://한글.한국', '한글.한국', '한글.com', 'http://한글.com/길', 'http://xn--bj0bj06e.xn--3e0b707e', 'xn--bj0bj06e.xn--3e0b707e', 'http://münchen.de', 'münchen.de', 'café.fr',
  'example.notatld', 'file.txt', 'README.md', 'index.html', 'a.io', 'bit.ly/abc', 'youtu.be/dQw4w9WgXcQ', 'my.zip', 'script.py', 'photo.jpg', 'v1.2.3', '3.14', 'e.g. this', 'i.e. that',
  'http://example.com/@user/', 'http://example.com/@user', 'http://example.com/a@b', 'https://example.com/path–dash', 'https://example.com/привет', 'https://example.com/ünï',
  'https://example.com/한글', 'https://example.com/path한글', 'https://example.com?q=한글', 'HTTPS://EXAMPLE.COM/PATH', 'ftp://example.com', 'http://localhost:3000', 'http://127.0.0.1/a',
  'http://' + 'a'.repeat(63) + '.com', 'http://' + 'a'.repeat(64) + '.com', 'http://a.com/' + 'b'.repeat(300),
  'Check this out: https://example.com/article?id=42 and https://another.example.org/x — both great!',
  '링크 https://lumenlab.page/ko/ 와 date.lumenlab.page 두 개', 'http://a.com http://b.com http://c.com', 'http://a.com,http://b.com', 'a.com/b.com/c.net',
  'a'.repeat(280), 'a'.repeat(281), '가'.repeat(140), '가'.repeat(141), '😀'.repeat(140), 'https://example.com '.repeat(11),
  'ჿ', 'ᄀ', ' ', '‍', '‎', '‏', '‐', '‟', '†', '′', '‷', '‸', 'ჿaᄀb',
  'Line one\nLine two\r\nLine three', 'tab\there', '  leading and trailing  ', 'ＡＢＣ　１２３', 'αβγ ЖЗИ', 'عربى', 'ไทย', 'हिन्दी',
];
const words = ['hello', 'world', '안녕하세요', '글자', '수', 'tweet', '오늘', 'lunch', '커피', 'the', 'quick', '세어', '봐요', 'ＡＢ', 'café', 'naïve', 'é', '漢字', 'かな', '１２', '100%', '$5', '#tag', '@user', 'a_b', 'x-y'];
const urlsPool = ['https://example.com', 'http://example.com/a/b?c=d', 'example.com', 'sub.example.co.kr/path', 'https://t.co/AbC123', 'bit.ly/x', 'www.site.org', 'http://한글.한국/길', 'test.dev', 'a.b', 'file.txt', 'http://x.io/(y)', 'https://example.com/path.', 'example.com.', 'http://a.com:80', 'me@mail.com', 'https://ex.am/ple#frag'];
const seps = [' ', ' ', ' ', '\n', ', ', '. ', '', '(', ')', '—', '…', ' — ', '"', '‍', '​', '️', '-', '/', '_', '@', '#'];
const edge = ['ჿ', 'ᄀ', '῿', ' ', ' ', '‍', '‎', '‐', '‟', '†', '′', '‷', '‸', '©', '®', '™', '\uD83D', '\uDE00', '￾'];

const data = JSON.parse(fs.readFileSync(path.join(HERE, 'cases.json'), 'utf8'));
const known = [], newer = [];
for (const e of data.emoji) { const w = tt.parseTweet(e.e).weightedLength; (w === 2 ? known : newer).push({ e: e.e, w }); }

const fuzz = [];
for (let n = 0; n < 1500; n++) {
  const parts = [], len = pick([1, 2, 3, 4, 6, 9, 14, 25]);
  for (let k = 0; k < len; k++) {
    const r = rnd();
    parts.push(r < .45 ? pick(words) : r < .7 ? pick(urlsPool) : r < .82 ? pick(known).e : r < .9 ? pick(edge) : pick(words));
    parts.push(pick(seps));
  }
  fuzz.push(parts.join(''));
}

const one = (text) => {
  const p = tt.parseTweet(text);
  const norm = text.normalize();
  return { text, weighted: p.weightedLength, urls: tt.extractUrlsWithIndices(norm).map((u) => u.indices) };
};
const out = {
  made_with: { 'twitter-text': ver, 'twemoji-parser': require('twemoji-parser/package.json').version, punycode: require('punycode/package.json').version },
  config: tt.configs.version3,
  regex: {
    extractUrl: src('extractUrl').source, extractUrlFlags: src('extractUrl').flags,
    validAsciiDomain: src('validAsciiDomain').source, validTcoUrl: src('validTcoUrl').source,
  },
  cases: [...curated, ...fuzz].map(one),
  emoji: known,
  emoji_newer: newer,
};
fs.writeFileSync(path.join(HERE, 'cases-x.json'), JSON.stringify(out));
console.log(`wrote cases-x.json: ${out.cases.length} cases (${curated.length} curated), emoji known ${known.length}, newer ${newer.length}; lc-x-tld.js ${g.length + c.length} chars`);
