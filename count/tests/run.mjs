// 글자수 세기 로직 시험: node count/tests/run.mjs  (추가 설치 없이 돈다)
// 기준값은 다른 방법으로 구한 것: cases.json(파이썬 regex·grapheme·uniseg·표준 코덱), cases-x.json(npm twitter-text),
// cases-sms.json(파이썬 smsutil·npm sms-segments-calculator·split-sms), 손으로 놓아 본 원고지 예시.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const A = path.join(HERE, '..', 'assets');
const LC = require(path.join(A, 'lc-core.js'));
require(path.join(A, 'lc-cp949.js'));
for (const f of ['lc-x-tld.js', 'lc-x.js', 'lc-sms.js', 'lc-wongoji.js']) if (fs.existsSync(path.join(A, f))) require(path.join(A, f));
const load = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));
const has = (f) => fs.existsSync(path.join(HERE, f));

let pass = 0, fail = 0, group = '';
const fails = [], skipped = [], perGroup = {};
function eq(got, want, label) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  perGroup[group] = perGroup[group] || [0, 0];
  if (ok) { pass++; perGroup[group][0]++; }
  else { fail++; perGroup[group][1]++; if (fails.length < 60) fails.push(`[${group}] ${label}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`); }
  return ok;
}
const show = (s) => JSON.stringify(s.length > 40 ? s.slice(0, 40) + '…' : s);
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const want = (g) => !ONLY.length || ONLY.some((o) => g.startsWith(o));

/* ───────────── 1. 파이썬 기준값과 대조 ───────────── */
const data = load('cases.json');
group = 'core';
if (want(group)) for (const c of data.cases) {
  const e = c.expect, t = c.text, tag = `${c.name} ${show(t)}`;
  for (const nl of [0, 1, 2]) {
    const r = LC.analyze(t, { newline: nl, locale: 'ko' });
    eq(r.chars, e.chars[nl], `${tag} 글자(줄바꿈 ${nl}자)`);
    eq(r.bytes.utf8, e.utf8[nl], `${tag} UTF-8(줄바꿈 ${nl})`);
    eq(r.bytes.utf16, e.utf16[nl], `${tag} UTF-16(줄바꿈 ${nl})`);
    eq(r.bytes.euckr.bytes, e.cp949[nl], `${tag} CP949(줄바꿈 ${nl})`);
    if (nl !== 1) continue;
    eq(r.raw, e.raw, `${tag} 날것(글자 묶음·코드 포인트·UTF-16 단위)`);
    if (e.graphemes_alt != null) eq(r.raw.graphemes, e.graphemes_alt, `${tag} 글자 묶음(grapheme 패키지)`);
    eq(r.charsNoSpace, e.charsNoSpace, `${tag} 공백 제외`);
    eq([r.spaces.space, r.spaces.tab, r.spaces.other, r.spaces.lineBreaks], [e.spaces.space, e.spaces.tab, e.spaces.other, e.lineBreaks], `${tag} 공백 종류`);
    eq(r.words, e.words, `${tag} 어절`);
    eq(r.lines, e.lines, `${tag} 줄`);
    eq(r.paragraphs, e.paragraphs, `${tag} 문단`);
    eq(r.loneSurrogates, e.loneSurrogates, `${tag} 외톨이 서로게이트`);
    eq([r.bytes.euckr.unencodable, r.bytes.euckr.outsideKsx1001], [e.cp949_bad, e.cp949_ks], `${tag} CP949 못 담는 글자·완성형 밖`);
    const sorted = (o) => Object.entries(o).filter(([, v]) => v).sort(([x], [y]) => (x < y ? -1 : 1));
    eq(sorted(r.classes), sorted(e.classes), `${tag} 글자 종류`);
    if (e.wordsSeg != null) eq(LC.analyze(t, { locale: 'en' }).wordsSeg, e.wordsSeg, `${tag} 단어(유니코드 규칙, uniseg)`);
    if (e.sentences != null) eq(LC.analyze(t, { locale: c.seg === 'en' ? 'en' : 'ko' }).sentences, e.sentences, `${tag} 문장(uniseg)`);
    /* 안쪽 일관성: 종류 합 = 글자 수, 빠른 길과 Segmenter만 쓴 길이 같다 */
    eq(Object.values(r.classes).reduce((a, b) => a + b, 0), r.chars - r.spaces.lineBreaks, `${tag} 종류 합`);
  }
}

/* ───────────── 2. 표 전체 대조 ───────────── */
group = 'tables';
if (want(group)) {
  eq(LC.WHITE_SPACE, data.white_space, 'White_Space 목록 = 파이썬 regex \\p{White_Space} 전체');
  // CP949: BMP 전체를 한 글자씩 세어 파이썬 코덱이 만든 범위와 대조
  const two = new Uint8Array(65536), ks = new Uint8Array(65536);
  for (const [a, b] of data.cp949_two_byte_ranges) for (let c = a; c <= b; c++) two[c] = 1;
  for (const [a, b] of data.ksx1001_two_byte_ranges) for (let c = a; c <= b; c++) ks[c] = 1;
  let bad = 0, firstBad = null;
  for (let c = 0; c < 65536; c++) {
    if (c >= 0xD800 && c <= 0xDFFF || c === 10 || c === 13) continue;
    const r = LC.analyze(String.fromCharCode(c)).bytes.euckr;
    const wantBytes = c < 0x80 ? 1 : two[c] ? 2 : 0, wantBad = c < 0x80 || two[c] ? 0 : 1, wantKs = two[c] && !ks[c] ? 1 : 0;
    if (r.bytes !== wantBytes || r.unencodable !== wantBad || r.outsideKsx1001 !== wantKs) { bad++; firstBad = firstBad ?? c; }
  }
  eq([bad, firstBad], [0, null], 'CP949 표: BMP 65,534자 하나씩 = 파이썬 cp949·euc_kr 코덱');
  // 세 번째 출처: 노드 TextDecoder('euc-kr')로 2바이트 전부를 풀어 본 집합.
  // 노드(ICU)의 euc-kr은 좁은 뜻의 완성형(KS X 1001)이라 우리 표의 '완성형에도 있음' 쪽과 견준다.
  // 브라우저의 TextDecoder('euc-kr')(WHATWG 표 = CP949 전체)와는 화면 시험(_dev/check)에서 견준다.
  try {
    const dec = new TextDecoder('euc-kr', { fatal: true }), set = new Uint8Array(65536);
    for (let a = 0x81; a <= 0xFE; a++) for (let b = 0x41; b <= 0xFE; b++) {
      try { const s = dec.decode(new Uint8Array([a, b])); if (s.length === 1) set[s.charCodeAt(0)] = 1; } catch (e) { /* 빈 자리 */ }
    }
    const diff = [];
    for (let c = 0x80; c < 65536; c++) if (set[c] !== ks[c] && !(c >= 0xE000 && c <= 0xF8FF)) diff.push(c.toString(16)); // 사용자 정의 영역(PUA)은 뺀다
    // 유로(U+20AC)·등록 상표(U+00AE) 두 글자만 다르다: 파이썬 euc_kr·cp949에는 있고 노드(ICU) 표에는 없다
    eq(diff, ['ae', '20ac'], '완성형(KS X 1001) 표 = 노드 TextDecoder(euc-kr) 8,224자, 다른 건 € ® 둘뿐');
  } catch (e) { skipped.push('TextDecoder euc-kr 없음: ' + e.message); }
  // UTF-8: TextEncoder와 대조(외톨이 서로게이트 포함)
  const enc = new TextEncoder();
  let u8bad = 0;
  for (const c of data.cases) if (LC.analyze(c.text.replace(/\r\n|\r|\n/g, ''), { newline: 0 }).bytes.utf8 !== enc.encode(c.text.replace(/\r\n|\r|\n/g, '')).length) u8bad++;
  eq(u8bad, 0, 'UTF-8 바이트 = TextEncoder (모든 사례)');
}

/* ───────────── 3. 이모지 전부 ───────────── */
group = 'emoji';
if (want(group)) {
  let bad = [], badCls = [], badNum = [];
  for (const e of data.emoji) {
    const r = LC.analyze(e.e);
    if (r.chars !== 1) bad.push(e.e);
    if (r.classes.emoji !== 1) badCls.push(e.e);
    if (r.raw.codePoints !== e.cp || r.raw.units !== e.units || r.bytes.utf8 !== e.utf8) badNum.push(e.e);
  }
  eq(bad.slice(0, 20), [], `RGI 이모지 ${data.emoji.length}개가 저마다 한 글자`);
  eq(badCls.slice(0, 20), [], 'RGI 이모지의 종류 = 이모지');
  eq(badNum.slice(0, 20), [], 'RGI 이모지의 코드 포인트·UTF-16 단위·UTF-8 바이트 = 파이썬');
  // 글에 실을 숫자(브리프: 👨‍👩‍👧 = 1글자, 코드 포인트 5, UTF-8 18바이트)
  const fam = LC.analyze('👨‍👩‍👧');
  eq([fam.chars, fam.raw.codePoints, fam.raw.units, fam.bytes.utf8, fam.bytes.utf16], [1, 5, 8, 18, 16], '👨‍👩‍👧 = 1글자·코드 포인트 5·UTF-16 단위 8·UTF-8 18바이트·UTF-16 16바이트');
  const kr = LC.analyze('🇰🇷');
  eq([kr.chars, kr.raw.codePoints, kr.raw.units, kr.bytes.utf8], [1, 2, 4, 8], '🇰🇷 = 1글자·코드 포인트 2·단위 4·UTF-8 8바이트');
  const th = LC.analyze('👍🏽');
  eq([th.chars, th.raw.codePoints, th.raw.units, th.bytes.utf8], [1, 2, 4, 8], '👍🏽 = 1글자·코드 포인트 2·단위 4·UTF-8 8바이트');
  eq(LC.inspect('👨‍👩‍👧'), { codePoints: [0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467], units: 8, utf8: 18 }, 'inspect(👨‍👩‍👧)');
}

/* ───────────── 4. 빠른 길 = Segmenter만 쓴 값, Segmenter 없는 브라우저 ───────────── */
group = 'paths';
if (want(group)) {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let bad = [];
  for (const c of data.cases) {
    let n = 0;
    for (const s of seg.segment(c.text)) n++;
    if (LC.analyze(c.text).raw.graphemes !== n) bad.push(c.name);
  }
  eq(bad.slice(0, 10), [], '빠른 길(단순 글자 건너뛰기)과 Intl.Segmenter 전체 결과가 같다');
  // Segmenter 없는 브라우저: 코드 포인트로 세고 approx.grapheme 를 켠다
  const t = '가é👨‍👩‍👧\r\nb';
  const r = LC.analyze(t, { noSegmenter: true });
  eq([r.approx.grapheme, r.approx.word, r.approx.sentence], [true, true, true], 'Segmenter 없음 → 어림 표시가 켜진다');
  eq(r.chars, 1 + 2 + 5 + 1 + 1, 'Segmenter 없음 → 코드 포인트 수로 센다(줄바꿈 1)');
  eq(LC.analyze(t).approx.grapheme, false, 'Segmenter 있음 → 어림 표시 꺼짐');
  let bad2 = [];
  for (const c of data.cases) {
    const a = LC.analyze(c.text, { noSegmenter: true });
    if (a.chars !== c.expect.raw.codePoints - (c.text.match(/\r\n/g) || []).length) bad2.push(c.name);
  }
  eq(bad2.slice(0, 10), [], 'Segmenter 없음: 글자 = 코드 포인트 수(CRLF는 하나) (모든 사례)');
  eq(LC.graphemes('가👨‍👩‍👧\r\né'), ['가', '👨‍👩‍👧', '\r\n', 'é'], 'graphemes()');
  eq(LC.seconds(450, 225), 120, '읽는 시간: 450단어 ÷ 분당 225 = 120초');
  eq(LC.seconds(0, 200), 0, '읽는 시간: 빈 글 0초');
  eq(LC.analyze(null).empty && LC.analyze(undefined).chars === 0, true, 'null·undefined는 빈 글');
}

/* ───────────── 5. X(트위터) 가중 글자 수: npm twitter-text 와 대조 ───────────── */
group = 'x';
if (want(group) && LC.x && has('cases-x.json')) {
  const xs = load('cases-x.json');
  const R = LC.x._regexes();
  eq(R.extractUrl.source === xs.regex.extractUrl && R.extractUrl.flags === xs.regex.extractUrlFlags, true, '주소 찾는 정규식이 twitter-text의 것과 글자 하나까지 같다');
  eq(R.validAsciiDomain.source === xs.regex.validAsciiDomain, true, 'ASCII 도메인 정규식이 같다');
  eq(R.validTcoUrl.source === xs.regex.validTcoUrl, true, 't.co 정규식이 같다');
  eq([LC.x.CONFIG.max, LC.x.CONFIG.scale, LC.x.CONFIG.defaultWeight, LC.x.CONFIG.urlLength, LC.x.CONFIG.ranges],
    [xs.config.maxWeightedTweetLength, xs.config.scale, xs.config.defaultWeight, xs.config.transformedURLLength, xs.config.ranges.map((r) => [r.start, r.end, r.weight])], '설정 = twitter-text v3 설정');
  for (const c of xs.cases) {
    const r = LC.x.count(c.text);
    eq(r.weighted, c.weighted, `${show(c.text)} 가중 글자 수`);
    eq(r.urls.map((u) => [u.start, u.end]), c.urls, `${show(c.text)} 주소 자리`);
  }
  let bad = [];
  for (const e of xs.emoji) if (LC.x.count(e.e).weighted !== e.w) bad.push(e.e + ' ' + LC.x.count(e.e).weighted + '≠' + e.w);
  eq(bad.slice(0, 20), [], `이모지 ${xs.emoji.length}개(twitter-text가 아는 것)의 가중 글자 수`);
  let bad2 = [];
  for (const e of xs.emoji_newer) if (LC.x.count(e.e).weighted !== 2) bad2.push(e.e);
  eq(bad2.slice(0, 20), [], `새 이모지 ${xs.emoji_newer.length}개(라이브러리 2020년 판이 모르는 묶음)도 2로 센다`);
  eq(xs.emoji_newer.every((e) => e.w !== 2), true, '위 묶음은 옛 라이브러리에선 2가 아니다(차이를 알고 있음)');
  eq(LC.x.CONFIG.max, 280, '한도 280');
  eq(LC.x.count('a'.repeat(280)).over, 0, '영문 280자는 딱 맞다');
  eq(LC.x.count('가'.repeat(140)).weighted, 280, '한글 140자 = 280');
  eq(LC.x.count('가'.repeat(141)).over, 2, '한글 141자는 2 넘친다');
} else if (want(group)) skipped.push('X 시험: lc-x.js 또는 cases-x.json 없음');

/* ───────────── 6. SMS 조각: 파이썬 smsutil·npm 두 가지와 대조 ───────────── */
group = 'sms';
if (want(group) && LC.sms && has('cases-sms.json')) {
  const ss = load('cases-sms.json');
  eq(LC.sms.GSM7_BASIC.length, 128, 'GSM-7 기본 문자표 128칸');
  eq([...LC.sms.GSM7_BASIC].sort().join(''), [...ss.gsm_basic].sort().join(''), 'GSM-7 기본 문자표 = smsutil 문자표');
  eq([...LC.sms.GSM7_EXT].sort().join(''), [...ss.gsm_ext].sort().join(''), 'GSM-7 확장 문자표 = smsutil 문자표');
  for (const c of ss.cases) {
    const r = LC.sms.count(c.text);
    eq([r.encoding, r.segments, r.length], [c.encoding, c.segments, c.length], `${show(c.text)} (${c.note || ''}) 방식·조각·길이`);
    if (c.twilio) eq([r.encoding, r.segments], [c.twilio.encoding, c.twilio.segments], `${show(c.text)} = Twilio 계산기`);
    if (c.splitsms) eq([r.encoding, r.segments], [c.splitsms.encoding, c.splitsms.segments], `${show(c.text)} = split-sms`);
  }
} else if (want(group)) skipped.push('SMS 시험: lc-sms.js 또는 cases-sms.json 없음');

/* ───────────── 7. 원고지 ───────────── */
group = 'wongoji';
if (want(group) && LC.wongoji && has('cases-wongoji.json')) {
  const ws = load('cases-wongoji.json');
  for (const c of ws.cases) {
    const r = LC.wongoji.layout(c.text, c.opts || {});
    if (c.sheets != null) eq(r.sheets, c.sheets, `${c.name} 장수`);
    if (c.cells != null) eq(r.cells, c.cells, `${c.name} 쓴 칸`);
    if (c.rows != null) eq(r.rows.length, c.rows, `${c.name} 줄 수`);
    if (c.grid) eq(r.rows.map((row) => row.map((x) => x.t).join('|')), c.grid, `${c.name} 칸 배치`);
    if (c.simple != null) eq(LC.wongoji.simple(c.text, c.opts || {}).sheets, c.simple, `${c.name} 단순 환산`);
  }
  // 성질: 칸에 놓인 글자를 이으면 원문(줄바꿈·줄 첫 칸에서 뺀 띄어쓰기 제외)이 된다
  let bad = [];
  for (const c of data.cases.slice(0, 300)) {
    const r = LC.wongoji.layout(c.text, {});
    const back = r.rows.map((row) => row.map((x) => x.t).join('')).join('');
    if (back !== c.text.replace(/\r\n|\r|\n/g, '')) bad.push(c.name);
    if (r.rows.some((row) => row.length > 20)) bad.push(c.name + ' (20칸 넘음)');
    if (r.sheets !== Math.ceil(r.rows.length / 10)) bad.push(c.name + ' (장수)');
  }
  eq(bad.slice(0, 10), [], '원고지: 칸의 글자를 이으면 원문, 한 줄 20칸 이하, 장수 = 줄 ÷ 10 올림');
} else if (want(group)) skipped.push('원고지 시험: lc-wongoji.js 또는 cases-wongoji.json 없음');

/* ───────────── 8. 화면·글에 실을 숫자(브리프의 경계 사례) ───────────── */
group = 'facts';
if (want(group)) {
  const b = (t, o) => LC.analyze(t, o).bytes;
  eq([b('가').utf8, b('가').euckr.bytes, b('가').utf16], [3, 2, 2], '한글 한 자 = UTF-8 3바이트, EUC-KR(CP949) 2바이트, UTF-16 2바이트');
  eq([b('a').utf8, b('a').euckr.bytes, b('a').utf16], [1, 1, 2], '영문 한 자 = 1·1·2바이트');
  eq([b('漢').utf8, b('漢').euckr.bytes], [3, 2], '한자 한 자 = UTF-8 3바이트, EUC-KR 2바이트');
  eq([b('😀').utf8, b('😀').utf16, b('😀').euckr.bytes, b('😀').euckr.unencodable], [4, 4, 0, 1], '😀 = UTF-8 4바이트, UTF-16 4바이트, EUC-KR로는 못 담음(알림)');
  eq([b('가\n나', { newline: 0 }).utf8, b('가\n나', { newline: 1 }).utf8, b('가\n나', { newline: 2 }).utf8], [6, 7, 8], '줄바꿈 0·1·2로 본 UTF-8 바이트');
  eq(b('가\r\n나', { newline: 2 }).utf8, b('가\n나', { newline: 2 }).utf8, '줄바꿈 옵션은 입력이 LF든 CRLF든 같은 값');
  const j = '안녕하세요. 저는 지원자입니다.\n잘 부탁드립니다.';
  eq([LC.analyze(j, { newline: 0 }).chars, LC.analyze(j, { newline: 1 }).chars, LC.analyze(j, { newline: 2 }).chars, LC.analyze(j).charsNoSpace], [26, 27, 28, 23], '같은 글이 기준마다 26·27·28자(공백 포함, 줄바꿈 0·1·2자), 공백 제외 23자 (파이썬 len으로 확인)');
  eq([LC.analyze('똠').bytes.euckr.bytes, LC.analyze('똠').bytes.euckr.outsideKsx1001], [2, 1], "'똠'은 CP949로 2바이트지만 옛 완성형 2,350자 밖");
  if (LC.sms) {
    const s0 = LC.sms.count(''), s160 = LC.sms.count('a'.repeat(160)), s161 = LC.sms.count('a'.repeat(161));
    eq([s0.segments, s0.remaining, s0.encoding], [0, 160, 'GSM-7'], '빈 문자 = 0통, 남은 칸 160');
    eq([s160.segments, s160.remaining], [1, 0], '영문 160자 = 한 통');
    eq([s161.segments, s161.parts, s161.remaining], [2, [153, 8], 145], '영문 161자 = 두 통(153 + 8)');
    eq(LC.sms.count('a'.repeat(160) + '😀').segments, 3, '영문 160자에 이모지 하나를 붙이면 UCS-2가 되어 세 통(162단위 ÷ 67)');
    eq(LC.sms.count('가'.repeat(71)).parts, [67, 4], '한글 71자 = 두 통(67 + 4)');
  }
  eq(LC.support().segmenter && LC.support().properties && LC.support().cp949, true, '이 노드에서 Segmenter·유니코드 속성·CP949 표를 쓴다');
}

/* ───────────── 8-2. 가이드 글에 실은 숫자(글을 고치면 여기도 같이) ───────────── */
group = 'guide';
if (want(group)) {
  const an = (t, nl) => LC.analyze(t, { newline: nl == null ? 1 : nl });
  const four = (t) => { const r = an(t); return [r.chars, r.raw.codePoints, r.raw.units, r.bytes.utf8]; };
  const nfd = (t) => t.normalize('NFD');
  const eng = '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';
  // 한국어 1: 같은 글인데 글자 수가 다른 이유
  const ex = '안녕하세요. 저는 지원자입니다.\n잘 부탁드립니다 🙂';
  eq([an(ex, 0).chars, an(ex, 1).chars, an(ex, 2).chars, an(ex).charsNoSpace], [27, 28, 29, 23], '가이드(ko1): 예시 글 27·28·29자, 공백 제외 23자');
  eq([an(ex, 1).bytes.utf8, an(ex, 2).bytes.utf8, an(ex, 2).bytes.euckr.bytes, an(ex).bytes.euckr.unencodable], [71, 72, 48, 1], '가이드(ko1): UTF-8 71·72바이트, EUC-KR 48바이트(🙂 하나 못 담음)');
  eq([an(ex).spaces.space, an(ex).spaces.lineBreaks], [4, 1], '가이드(ko1): 띄어쓰기 4번, 줄바꿈 1번');
  const five = ['가', '나', '다', '라', '마'].join('\n\n');
  eq([an(five).spaces.lineBreaks, an(five, 0).chars, an(five, 1).chars, an(five, 2).chars], [8, 5, 13, 21], '가이드(ko1): 한 글자 문단 다섯 개 = 줄바꿈 8번, 5·13·21자');
  eq([an('가'.repeat(500)).bytes.utf8, an('가'.repeat(500)).bytes.euckr.bytes], [1500, 1000], '가이드(ko1·ko3): 한글 500자 = UTF-8 1,500바이트, EUC-KR 1,000바이트');
  // 한국어 2·영어 3: 이모지 표(보이는 글자·코드 포인트·UTF-16 단위·UTF-8 바이트)
  eq([four('가'), four('😀'), four('👍🏽'), four('🇰🇷'), four('1️⃣'), four('👨‍👩‍👧'), four(eng)],
    [[1, 1, 1, 3], [1, 1, 2, 4], [1, 2, 4, 8], [1, 2, 4, 8], [1, 3, 3, 7], [1, 5, 8, 18], [1, 7, 14, 28]], '가이드(ko2): 이모지 표');
  eq(four(nfd('한')), [1, 3, 3, 9], "가이드(ko2): 풀어 적은 '한' = 1글자·코드 포인트 3·UTF-8 9바이트");
  eq([four('a'), four('é'), four('é'), four('🇺🇸')], [[1, 1, 1, 1], [1, 1, 1, 2], [1, 2, 2, 3], [1, 2, 4, 8]], '가이드(en3): a, é 두 가지, 🇺🇸');
  // 한국어 3: 글자별 바이트
  const b3 = (t) => { const r = an(t).bytes; return [r.utf8, r.euckr.unencodable ? null : r.euckr.bytes, r.utf16]; };
  eq([b3('A'), b3(' '), b3('가'), b3('漢'), b3('€'), b3('😀')], [[1, 1, 2], [1, 1, 2], [3, 2, 2], [3, 2, 2], [3, 2, 2], [4, null, 4]], '가이드(ko3): 글자별 바이트 표');
  eq([an('가'.repeat(333)).bytes.utf8, an('가'.repeat(334)).bytes.utf8], [999, 1002], '가이드(ko3): 한글 333자 = 999바이트, 334자 = 1,002바이트');
  let cpAll = 0, cpHangul = 0, cpHanja = 0, ksHangul = 0;
  for (const [x, y] of data.cp949_two_byte_ranges) for (let c = x; c <= y; c++) { cpAll++; if (c >= 0xAC00 && c <= 0xD7A3) cpHangul++; if (c >= 0x4E00 && c <= 0x9FFF || c >= 0xF900 && c <= 0xFAFF) cpHanja++; }
  for (const [x, y] of data.ksx1001_two_byte_ranges) for (let c = x; c <= y; c++) if (c >= 0xAC00 && c <= 0xD7A3) ksHangul++;
  eq([cpAll, cpHangul, cpHanja, ksHangul, cpHangul - ksHangul], [17048, 11172, 4888, 2350, 8822], '가이드(ko3)·소개: 2바이트 글자 17,048자 = 한글 11,172 + 한자 4,888 + 그 밖, 완성형 한글 2,350자, 차이 8,822자');
  eq(an('똠').bytes.euckr.outsideKsx1001, 1, "가이드(ko3): '똠'은 완성형 2,350자 밖");
  // 영어 1: X
  if (LC.x && has('cases-x.json')) {
    const x = (t) => LC.x.count(t).weighted, xs = load('cases-x.json');
    eq(['a', 'é', 'Ж', '“', '—', '…', '™', '€', '가', '漢', 'あ', '😀', '👍🏽', '👨‍👩‍👧', 'ก'].map(x), [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], '가이드(en1): 가중치 표');
    const long = 'https://example.com/a/very/long/path/that/keeps/going/and/going?with=query&and=more';
    eq(['https://example.com'.length, long.length, x('https://example.com'), x(long), x('example.com'), x('see example.com now'), 'see example.com now'.length, x('file.txt')], [19, 83, 23, 23, 23, 31, 19, 8], '가이드(en1): 주소는 길이와 상관없이 23, file.txt는 8');
    const lib = (e) => xs.emoji_newer.find((o) => o.e === e).w;
    eq([lib('🧑‍🚀'), lib('❤️‍🔥'), x('🧑‍🚀'), x('❤️‍🔥')], [5, 5, 2, 2], '가이드(en1): 🧑‍🚀·❤️‍🔥는 라이브러리 5, 우리 2');
    eq([data.emoji.length, xs.emoji.length, xs.emoji_newer.length, xs.cases.length], [3773, 2963, 810, 1655], '가이드(en1): 이모지 3,773개 가운데 2,963개 일치·810개 다름, 글 1,655개');
    eq([x('a'.repeat(280)), x('가'.repeat(140)), x('😀'.repeat(140)), x('https://example.com ' + 'a'.repeat(256)), x('é'), x('é')], [280, 280, 280, 280, 1, 1], '가이드(en1): 280에 들어가는 것, é 두 가지 모두 1');
  }
  // 영어 2: SMS
  if (LC.sms) {
    const p = (t) => LC.sms.count(t).parts, g = (c) => LC.sms.count(c).encoding === 'GSM-7';
    eq([p('a'.repeat(160)), p('a'.repeat(161)), p('a'.repeat(306)), p('a'.repeat(307)), p('a'.repeat(460))], [[160], [153, 8], [153, 153], [153, 153, 1], [153, 153, 153, 1]], '가이드(en2): 끊기는 자리 표');
    eq([p('a'.repeat(160) + '😀').length, p('a'.repeat(100) + 'é' + 'a'.repeat(100)).length, p('a'.repeat(100) + 'ê' + 'a'.repeat(100)).length], [3, 2, 3], '가이드(en2): 이모지 하나로 3통, é는 2통, ê는 3통');
    eq(['’', '“', '”', '—', '…', '`', '\t', 'ç', 'á', 'ê', '😀'].map(g), Array(11).fill(false), '가이드(en2)·문자 화면 FAQ: GSM-7 밖 글자');
    eq(['é', 'è', 'à', 'ñ', 'ü', 'ö', 'Ç', "'"].map(g), Array(8).fill(true), '가이드(en2): GSM-7 안 글자(é è à ñ ü ö Ç)');
    eq([LC.sms.count('a'.repeat(69) + '😀').length, p('a'.repeat(69) + '😀').length, LC.sms.count('it’s').encoding, LC.sms.count("it's").encoding], [71, 2, 'UCS-2', 'GSM-7'], '가이드(en2): 69자 + 이모지 = 71단위 2통, it’s는 유니코드');
    eq(['[', ']', '{', '}', '^', '~', '|', '\\', '€'].map((c) => LC.sms.count(c).length), Array(9).fill(2), '가이드(en2): 두 칸짜리 글자 아홉');
    eq([p('{'.repeat(80)), p('{'.repeat(81))], [[160], [152, 10]], '가이드(en2): 중괄호 80개는 한 통, 81개는 152 + 10');
  }
  // 도구 화면 FAQ
  eq([an('👍🏽').bytes.utf8, an('👨‍👩‍👧').bytes.utf8, an('😀').bytes.utf8], [8, 18, 4], '화면 FAQ: 👍🏽 8바이트, 👨‍👩‍👧 18바이트, 😀 4바이트');
  if (LC.wongoji) eq([LC.wongoji.simple(Array(11).fill('가').join('\n')).sheets, LC.wongoji.layout(Array(11).fill('가').join('\n')).sheets], [1, 2], '원고지 FAQ: 한 글자짜리 줄 11개 = 환산 1장, 칸에 놓으면 2장');
  eq(LC.seconds(87, 200) < 60 && Math.round(LC.seconds(400, 200)) === 120, true, '읽는 시간: 400단어 ÷ 분당 200 = 2분');
}

/* ───────────── 9. 속도(100만 자) ───────────── */
group = 'speed';
if (want(group)) {
  const mk = (s, n) => s.repeat(Math.ceil(n / s.length)).slice(0, n);
  const ko = mk('자기소개서는 지원자가 어떤 사람인지 보여 주는 글이에요. 글자 수 제한은 보통 500자에서 1,000자 사이예요!\n', 1e6);
  const en = mk("The quick brown fox jumps over the lazy dog. It didn't stop, did it? Well-known e-mail: 3.14 is pi.\n", 1e6);
  const emo = mk('오늘 날씨 좋다 ☀️ 산책 가자 🐕‍🦺! 👨‍👩‍👧 가족과 🇰🇷에서 é.\n', 1e6);
  const time = (f) => { let best = 1e9; for (let i = 0; i < 3; i++) { const t0 = performance.now(); f(); best = Math.min(best, performance.now() - t0); } return best; };
  LC.analyze('warm up 준비');
  const rows = [];
  for (const [name, t] of [['한글 100만 자', ko], ['영문 100만 자', en], ['이모지 섞인 100만 자', emo]]) {
    const quick = time(() => LC.analyze(t, { segment: false }));
    const full = time(() => LC.analyze(t, { locale: 'ko' }));
    rows.push(`${name}: 글자·바이트·공백·어절 ${quick.toFixed(0)}ms, 단어(유니코드)·문장까지 ${full.toFixed(0)}ms`);
    eq(quick < 400, true, `${name} 빠른 세기 ${quick.toFixed(0)}ms < 400ms`);
    eq(full < 1500, true, `${name} 전부 세기 ${full.toFixed(0)}ms < 1500ms`);
  }
  const small = mk('자기소개서는 지원자가 어떤 사람인지 보여 주는 글이에요.\n', 5000);
  const t5 = time(() => { for (let i = 0; i < 20; i++) LC.analyze(small, { locale: 'ko' }); }) / 20;
  rows.push(`5,000자(자소서 한 편): 전부 세기 ${t5.toFixed(2)}ms`);
  eq(t5 < 8, true, `5,000자 전부 세기 ${t5.toFixed(2)}ms < 8ms (입력할 때마다 세도 한 프레임 안)`);
  console.log('속도\n  ' + rows.join('\n  '));
}

/* ───────────── 결과 ───────────── */
for (const [g, [p, f]] of Object.entries(perGroup)) console.log(`${f ? '실패' : '통과'}  ${g}: ${p}개 통과${f ? `, ${f}개 실패` : ''}`);
if (skipped.length) console.log('건너뜀:\n  ' + skipped.join('\n  '));
if (fails.length) console.log('\n실패 내용(앞 60개):\n  ' + fails.join('\n  '));
console.log(`\n${fail ? '실패' : '통과'}: ${pass}개 통과, ${fail}개 실패` + (skipped.length ? `, 건너뜀 ${skipped.length}묶음` : ''));
process.exit(fail || (skipped.length && process.argv.includes('--strict')) ? 1 : 0);
