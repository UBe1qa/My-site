// 토독 핵심 로직 시험: node typing/tests/run.mjs [묶음 이름…]   (추가 설치 없이 돈다)
// 기준값(tests/ref/ref.json)은 우리 코드와 다른 방법으로 만든 것이다: 파이썬 unicodedata(NFD·글자 이름), inko-py, hangul-js, es-hangul, zlib.
// 다시 만드는 법은 gen_ref.py·gen_ref.mjs·gen_keys.py 머리말(연습 글을 고치면 gen_ref.mjs 와 gen_keys.py 를 다시 돌린다). TJ_CORE=<경로> 로 다른 tj-core.js 를 시험할 수 있다(tests/mutate.mjs 가 쓴다).
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const TJ = require(process.env.TJ_CORE || '../assets/tj-core.js');
const KO = require('../assets/tj-text-ko.js');
const EN = require('../assets/tj-text-en.js');
const REF = require('./ref/ref.json');
globalThis.TJ = TJ; /* tj-lessons.js 는 브라우저처럼 전역 TJ 를 쓴다 */
const Store = require('../assets/tj-store.js');
const LES = require('../assets/tj-lessons.js');
const H = TJ.hangul;
const { NONE, OK, BAD, PENDING } = TJ;
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const only = process.argv.slice(2);
const tally = {};
let group = '';
const fails = [];
function ok(cond, msg) {
  const t = tally[group] || (tally[group] = { pass: 0, fail: 0 });
  if (cond) t.pass++;
  else { t.fail++; if (fails.length < 40) fails.push('[' + group + '] ' + msg); }
}
function eq(a, b, msg) { ok(a === b, msg + ' → 나온 값 ' + JSON.stringify(a) + ', 기대 ' + JSON.stringify(b)); }
function near(a, b, msg) { ok(Math.abs(a - b) < 1e-9, msg + ' → 나온 값 ' + a + ', 기대 ' + b); }
function run(name, fn) { if (only.length && !only.includes(name)) return; group = name; fn(); }

/* ---- 시험용 두벌식 입력기 흉내(글쇠 → 화면에 보이는 글). tj-core 와 반대 방향이고 표도 따로 적었다. 'ime' 묶음이 inko-py 와 대조한다. ---- */
const C19 = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const V21 = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const F28 = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
const VV = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
const FF = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
const isC = (k) => C19.includes(k), isV = (k) => 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅛㅜㅠㅡㅣ'.includes(k);
class Ime {
  constructor() { this.done = ''; this.c = ''; this.v = ''; this.f = ''; }
  cur() {
    const { c, v, f } = this;
    if (c && v) return String.fromCharCode(0xAC00 + (C19.indexOf(c) * 21 + V21.indexOf(VV[v] || v)) * 28 + (f ? F28.indexOf(FF[f] || f) : 0));
    return c || (v ? VV[v] || v : '');
  }
  value() { return this.done + this.cur(); }
  commit() { this.done += this.cur(); this.c = this.v = this.f = ''; }
  key(k) {
    if (k === '\b') {
      if (this.f) this.f = this.f.slice(0, -1);
      else if (this.v) this.v = this.v.slice(0, -1);
      else if (this.c) this.c = '';
      else this.done = Array.from(this.done).slice(0, -1).join('');
    } else if (isC(k)) {
      if (this.c && this.v && !this.f && F28.includes(k)) this.f = k;
      else if (this.c && this.v && this.f.length === 1 && FF[this.f + k]) this.f += k;
      else { this.commit(); this.c = k; }
    } else if (isV(k)) {
      if (this.c && !this.v) this.v = k;
      else if (this.c && this.v.length === 1 && !this.f && VV[this.v + k]) this.v += k;
      else if (!this.c && this.v.length === 1 && VV[this.v + k]) this.v += k;
      else if (this.c && this.v && this.f) { /* 받침이 다음 글자의 첫소리로 넘어간다 */
        const move = this.f.slice(-1); this.f = this.f.slice(0, -1); this.commit(); this.c = move; this.v = k;
      } else { this.commit(); this.v = k; }
    } else { this.commit(); this.done += k; }
    return this.value();
  }
}
/* 글을 두벌식으로 칠 때 글쇠마다 입력칸에 보이는 글 */
function stepsFor(keys) { const ime = new Ime(); return keys.map((k) => ime.key(k)); }
const SENT = [].concat(...Object.values(KO.sentences));
const ALL_KO = SENT.concat(KO.proverbs, KO.words);

/* ---- 1. 자모 풀기·글쇠 수: 한글 음절 11,172자 전부 ---- */
run('jamo', () => {
  const N2J = { KIYEOK: 'ㄱ', NIEUN: 'ㄴ', TIKEUT: 'ㄷ', RIEUL: 'ㄹ', MIEUM: 'ㅁ', PIEUP: 'ㅂ', SIOS: 'ㅅ', IEUNG: 'ㅇ', CIEUC: 'ㅈ', CHIEUCH: 'ㅊ', KHIEUKH: 'ㅋ', THIEUTH: 'ㅌ', PHIEUPH: 'ㅍ', HIEUH: 'ㅎ' };
  const DOUBLE = { 'ㄱ': 'ㄲ', 'ㄷ': 'ㄸ', 'ㅂ': 'ㅃ', 'ㅅ': 'ㅆ', 'ㅈ': 'ㅉ' };
  const V2Q = { A: 'k', AE: 'o', YA: 'i', YAE: 'O', EO: 'j', E: 'p', YEO: 'u', YE: 'P', O: 'h', WA: 'hk', WAE: 'ho', OE: 'hl', YO: 'y', U: 'n', WEO: 'nj', WE: 'np', WI: 'nl', YU: 'b', EU: 'm', YI: 'ml', I: 'l' };
  /* 글자 이름('SSANGKIYEOK', 'RIEUL-KIYEOK') → 글쇠 */
  const fromName = (n) => n.split('-').map((p) => p.startsWith('SSANG') ? DOUBLE[N2J[p.slice(5)]] : N2J[p]);
  eq(REF.syll.length, 11172, '기준값 음절 수');
  const a = [], b = [];
  for (let i = 0; i < 11172; i++) {
    const ch = String.fromCharCode(0xAC00 + i), q = REF.syll[i];
    eq(H.toQwerty(ch), q, ch + ' 쿼티 글자열(inko-py)');
    eq(H.strokeCount(ch), q.length + (q.match(/[A-Z]/g) || []).length, ch + ' 타수(Shift 포함)');
    const p = H.parts(ch);
    const l = REF.nfd.l.charCodeAt(i) - 65, v = REF.nfd.v.charCodeAt(i) - 65, t = REF.nfd.t.charCodeAt(i) - 65;
    eq(p.c.join(''), fromName(REF.names.cho[l]).join(''), ch + ' 초성(NFD·글자 이름)');
    eq(p.v.map((k) => H.K2Q[k]).join(''), V2Q[REF.names.jung[v]], ch + ' 중성(NFD·글자 이름)');
    eq(p.f.join(''), t ? fromName(REF.names.jong[t - 1]).join('') : '', ch + ' 종성(NFD·글자 이름)');
    a.push(H.keysOf(ch).join('')); b.push(H.toQwerty(ch));
  }
  eq(sha(a.join('|')), REF.hjs, '음절 11,172자 낱자 풀기 = hangul-js');
  eq(sha(b.join('|')), REF.esh, '음절 11,172자 쿼티 글자열 = es-hangul');
  /* 낱자 51자. inko-py 는 겹자음 낱자 11자(ㄳ 등)에 빈 글을 돌려주므로 그 11자는 유니코드 글자 이름으로 본다 */
  let empty = 0;
  for (let i = 0; i < 51; i++) {
    const ch = String.fromCharCode(0x3131 + i), name = REF.loneNames[i];
    if (REF.lone[i]) eq(H.toQwerty(ch), REF.lone[i], ch + ' 낱자 쿼티(inko-py)'); else empty++;
    if (i < 30) eq(H.keysOf(ch).join(''), fromName(name).join(''), ch + ' 낱자 글쇠(글자 이름)');
    else eq(H.toQwerty(ch), V2Q[name], ch + ' 낱자 모음(글자 이름)');
  }
  eq(empty, 11, 'inko-py 가 못 푸는 겹자음 낱자 수');
  /* 손으로 센 사례 */
  eq(H.keysOf('값').join(' '), 'ㄱ ㅏ ㅂ ㅅ', '값 = 네 글쇠');
  eq(H.keysOf('과').join(' '), 'ㄱ ㅗ ㅏ', '과 = 세 글쇠');
  eq(H.strokeCount('까'), 3, '까 = Shift+ㄱ, ㅏ = 3타');
  eq(H.strokeCount('얘'), 3, '얘 = ㅇ, Shift+ㅐ = 3타');
  eq(H.strokeCount('쌌'), 5, '쌌 = Shift+ㅅ, ㅏ, Shift+ㅅ = 5타');
  eq(H.strokeCount('한글 타자'), 11, '한글 타자 = 3+3+1+2+2');
  eq(H.strokeCount('값이 싸요'), 12, '값이 싸요 = 4+2+1+3+2');
  eq(H.strokeCount('Hi, there!'), 12, 'Hi, there! = H(2) i , 띄어쓰기 t h e r e !(2)');
  eq(H.strokeCount('a\nb'), 3, '줄바꿈은 1타');
  eq(H.toQwerty('한글 값 까 봬 얘'), 'gksrmf rkqt Rk qho dO', '쿼티 글자열');
  eq(H.untypeable('가 a…“”·').join(''), '…“”·', '자판으로 못 치는 글자를 알려 준다');
  eq(H.untypeable('한글 abc 123 ,.?!\n').length, 0, '칠 수 있는 글자');
  eq(H.cleanInput('“hi” it’s ok\r\n').toString(), '"hi" it\'s ok\n', '친 글 다듬기');
  eq(H.toChars('한').join(''), '한', '풀어 쓴 한글(NFD)도 한 글자로');
  eq(sha(ALL_KO.map((t) => H.toQwerty(t)).join('\n')), REF.eshText.sha, '연습 글 ' + REF.eshText.n + '줄의 쿼티 글자열 = es-hangul');
});

/* ---- 2. 시험용 입력기 흉내가 진짜 입력기처럼 도는지(es-hangul·inko-py 와 글쇠마다 대조) ---- */
run('ime', () => {
  let inkoDiff = 0;
  REF.ime.forEach((p, n) => {
    const keys = Array.from(p.keys).map((q) => H.Q2K[q] || q);
    const steps = stepsFor(keys);
    steps.forEach((s, i) => {
      eq(s, REF.ime2[n][i], p.text + ' ' + (i + 1) + '번째 글쇠 뒤(es-hangul)');
      /* inko-py 는 글자 뒤에 혼자 남은 ㄸ·ㅃ·ㅉ을 빠뜨린다('뒤' + ㅉ → '뒤'). 실제 입력기와 es-hangul 은 '뒤ㅉ'. 그 두 곳만 다르다. */
      if (p.steps[i] !== REF.ime2[n][i]) inkoDiff++; else eq(s, p.steps[i], p.text + ' ' + (i + 1) + '번째 글쇠 뒤(inko-py)');
    });
    eq(H.keyStream(p.text).join(''), keys.join(''), p.text + ' 글쇠 흐름');
  });
  eq(inkoDiff, 2, 'inko-py 와 es-hangul 이 다른 곳');
  const ime = new Ime();
  ['ㅎ', 'ㅏ', 'ㄴ', '\b', '\b', '\b', 'ㄱ', 'ㅏ', 'ㅂ', 'ㅅ', '\b'].forEach((k) => ime.key(k));
  eq(ime.value(), '갑', '지우기는 낱자 하나씩');
});

/* ---- 3. 조합 순서 흉내: 맞게 치는 동안에는 한 번도 틀림 표시가 안 나온다(도깨비불 포함) ---- */
const view = (target, value, opt) => TJ.compare(TJ.prepare(target), value, opt);
function cleanRun(text, label) {
  const T = TJ.prepare(text), keys = H.keyStream(text), steps = stepsFor(keys);
  let bad = 0;
  if (TJ.compare(T, '').next !== keys[0]) bad++;
  steps.forEach((s, i) => { const r = TJ.compare(T, s); if (r.st.includes(BAD)) bad++; if (r.next !== (i + 1 < keys.length ? keys[i + 1] : null)) bad++; }); /* 다음에 누를 글쇠도 맞아야 한다 */
  const last = TJ.compare(T, steps[steps.length - 1]);
  ok(bad === 0 && last.complete && last.okChars === T.chars.length && last.okStrokes === H.strokeCount(text) && last.badChars === 0,
    label + ' "' + text + '" 치는 중 틀림 표시·다음 글쇠 어긋남 ' + bad + '번, 끝 ' + last.complete + ', 맞은 글자 ' + last.okChars + '/' + T.chars.length);
}
/* 낱자·영문이 섞인 글(자리 연습): 시험용 입력기로 쳤을 때 틀림 표시 없이 끝까지 가는지 */
function cleanRunAny(text, label) {
  const T = TJ.prepare(text), keys = H.keyStream(text), steps = stepsFor(keys);
  let bad = 0;
  steps.forEach((s) => { if (TJ.compare(T, s).st.includes(BAD)) bad++; });
  const last = TJ.compare(T, steps[steps.length - 1]);
  ok(bad === 0 && last.complete && last.okStrokes === H.strokeCount(text), label + ' "' + text + '" 틀림 표시 ' + bad + '번, 끝 ' + last.complete);
}
run('compose', () => {
  /* 받침이 넘어가는 순간의 표시 */
  let r = view('가나다', 'ㄱ');
  eq(r.st.join(''), '300', "'ㄱ' = 첫 글자 조합 중"); eq(r.pendingText, 'ㄱ', '조합 중인 글자');
  r = view('가나다', '간');
  eq(r.st.join(''), '130', "'간' = '가' 맞음 + 다음 글자 조합 중"); eq(r.pendingText, 'ㄴ', '넘어갈 받침'); eq(r.cursor, 1, '다음 글쇠는 둘째 글자');
  r = view('가나다', '가낟');
  eq(r.st.join(''), '113', "'가낟'"); eq(r.pendingText, 'ㄷ', '넘어갈 받침');
  r = view('가나다', '가나다');
  eq(r.st.join(''), '111', '다 침'); ok(r.complete, '끝');
  r = view('달기', '닭'); eq(r.st.join(''), '13', "'닭' = '달' 맞음 + 'ㄱ' 넘어갈 차례");
  r = view('값이', '값'); eq(r.st.join(''), '10', "'값' 다 침"); eq(r.cursor, 1, '다음 글자로');
  r = view('과일', '고'); eq(r.st.join(''), '30', "'고' = '과' 조합 중"); eq(r.pendingText, '고', '조합 중인 모양');
  r = view('가 나', '간'); eq(r.st.join(''), '120', '띄어쓰기 자리에 ㄴ = 띄어쓰기 칸이 틀림');
  r = view('가 나', '가 '); eq(r.st.join(''), '110', '띄어쓰기까지'); eq(r.cursor, 2, '다음 낱말 첫 글자');
  /* 조합 중인 모양(partial)은 시험용 입력기가 보여 주는 글과 같아야 한다: 음절 11,172자 전부 */
  for (let i = 0; i < 11172; i++) {
    const ch = String.fromCharCode(0xAC00 + i), steps = stepsFor(H.keysOf(ch));
    ok(steps.every((s, k) => TJ.partial(ch, k + 1) === s), ch + ' 조합 중인 모양: ' + steps.map((s, k) => TJ.partial(ch, k + 1)).join(' ') + ' / 입력기 ' + steps.join(' '));
  }
  eq(TJ.partial('값', 0) + '|' + TJ.partial('a', 1) + '|' + TJ.partial('ㄳ', 1), '|a|ㄱ', '한글이 아니거나 낱자일 때');
  /* 연습 글 전부 */
  ALL_KO.forEach((t) => cleanRun(t, '연습 글'));
  cleanRun(SENT.slice(0, 12).join('\n'), '줄바꿈으로 이은 글');
  cleanRun('ㅋㅋㅋ ㅎㅎ', '낱자');
  EN.sentences.concat(EN.pangrams).forEach((t) => cleanRun(t, '영어 문장'));
  /* 한글 음절 11,172자 × 다음 글자(첫소리 19가지)·띄어쓰기·마침표 */
  const NEXT = Array.from(C19).map((c, i) => String.fromCharCode(0xAC00 + (i * 21 + (i % 21)) * 28 + (i % 3 ? 0 : 4))).concat([' ', '.']);
  for (let i = 0; i < 11172; i++) {
    const ch = String.fromCharCode(0xAC00 + i);
    let bad = 0;
    for (const nx of NEXT) {
      const text = ch + nx + '끝', T = TJ.prepare(text), steps = stepsFor(H.keyStream(text));
      for (const s of steps) if (TJ.compare(T, s).st.includes(BAD)) bad++;
      const last = TJ.compare(T, steps[steps.length - 1]);
      if (!last.complete || last.okStrokes !== H.strokeCount(text) || last.okChars !== 3) bad++;
    }
    ok(bad === 0, ch + ' 뒤에 21가지 글자를 이어 칠 때 틀림 표시 ' + bad + '번');
  }
  /* 한 판으로 쳐도 같은가: 누른 글쇠 = 맞은 글쇠 = 글쇠 수 */
  SENT.concat(KO.proverbs, EN.sentences).forEach((text) => {
    const keys = H.keyStream(text), s = new TJ.Session(text);
    stepsFor(keys).forEach((v, i) => s.update(v, 1000 + i * 100));
    const res = s.finish(keys.length * 100);
    ok(res.typedKeys === keys.length && res.okKeys === keys.length && res.accuracy === 100 && res.strokes === H.strokeCount(text) && res.missed.length === 0 && res.badChars === 0,
      '한 판 "' + text + '" 누른 글쇠 ' + res.typedKeys + '/' + keys.length + ', 맞은 ' + res.okKeys + ', 타수 ' + res.strokes);
  });
});

/* ---- 4. 틀린 글쇠는 눌린 그 순간 잡는다 ---- */
function play(target, keys, opt) {
  const s = new TJ.Session(target, opt), ime = new Ime();
  const seen = [];
  keys.forEach((k, i) => { const r = s.update(ime.key(k), 1000 + i * 100); seen.push(r.st.join('')); });
  return { s, seen, value: ime.value() };
}
run('wrong', () => {
  let p = play('한글', ['ㅎ', 'ㅏ', 'ㅅ']);
  eq(p.seen.join(' '), '30 30 20', "'핫' = 셋째 글쇠에서 틀림");
  eq(p.s.byKey['ㄴ'].miss, 1, '틀린 글쇠는 기대한 글쇠(ㄴ)에 적힌다');
  eq(p.s.pairs['ㄴ>ㅅ'], 1, 'ㄴ 자리에 ㅅ');
  eq(p.s.typedKeys + ':' + p.s.okKeys, '3:2', '누른 3, 맞은 2');
  p = play('가다', ['ㄱ', 'ㅏ', 'ㄴ']);
  eq(p.seen[2], '12', "'가다'에 '간' = '가'는 맞고 '다'가 틀림(ㄷ 자리에 ㄴ)"); eq(p.s.byKey['ㄷ'].miss, 1, 'ㄷ에 적힌다');
  p = play('과', ['ㄱ', 'ㅏ']);
  eq(p.seen[1], '2', "'과'에 '가'"); eq(p.s.byKey['ㅗ'].miss, 1, 'ㅗ에 적힌다');
  p = play('까치', ['ㄱ']);
  eq(p.seen[0], '20', 'Shift 없이 ㄱ'); eq(p.s.byKey['ㄲ'].miss, 1, 'ㄲ에 적힌다');
  p = play('한글', ['ㅏ']);
  eq(p.seen[0], '20', '첫소리 자리에 모음');
  /* 고쳐 쳐도 틀렸던 기록은 남는다: 누른 7, 맞은 6 */
  p = play('한글', ['ㅎ', 'ㅏ', 'ㅅ', '\b', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ']);
  eq(p.seen[p.seen.length - 1], '11', '고쳐서 다 맞음');
  let res = p.s.finish(3000);
  eq(res.typedKeys + ':' + res.okKeys, '7:6', '누른 7, 맞은 6');
  near(res.accuracy, 600 / 7, '정확도 = 6 ÷ 7');
  eq(res.strokes, 6, '맞게 친 타수 6');
  eq(res.missed.map((m) => m.key + m.miss).join(','), 'ㄴ1', '자주 틀린 글쇠');
  /* 안 고치고 넘어가면: 글자는 틀림, 맞은 글쇠만 타수로 */
  p = play('한글 타자', H.keyStream('핫글 타자'));
  res = p.s.finish(3000);
  eq(p.seen[p.seen.length - 1], '21111', '첫 글자만 틀림');
  eq(res.strokes, 10, "'핫글 타자' = 11타 가운데 ㅅ 하나만 빼고 10타");
  eq(res.okChars + ':' + res.badChars, '4:1', '맞은 글자 4, 틀린 글자 1');
  /* 글쇠를 하나 빠뜨렸을 때: 그 글자만 틀림(뒤 글자까지 줄줄이 틀리지 않는다) */
  p = play('학교에 갔어요', H.keyStream('하교에 갔어요'));
  res = p.s.finish(3000);
  eq(p.seen[p.seen.length - 1], '2111111', "'하교에' = '학'만 틀림");
  eq(res.typedKeys + ':' + res.okKeys, '14:13', '누른 14, 맞은 13'); eq(res.missed.map((m) => m.key + m.miss).join(','), 'ㄱ1', '빠뜨린 ㄱ에 적힌다');
  /* 글쇠를 하나 더 쳤을 때 */
  p = play('나무', ['ㄴ', 'ㅏ', 'ㅏ', 'ㅁ', 'ㅜ']);
  res = p.s.finish(1000);
  eq(res.typedKeys + ':' + res.okKeys + ':' + res.strokes, '5:4:4', '더 친 글쇠 하나만 틀림'); eq(res.okChars + res.badChars, 2, '글자 둘 가운데');
  /* 틀린 글쇠 때문에 글자 수가 달라져도(갅 → 간ㅁ) 다음 낱말은 다시 맞는다 */
  p = play('갅 나', ['ㄱ', 'ㅏ', 'ㄴ', 'ㅁ', ' ', 'ㄴ', 'ㅏ']);
  res = p.s.finish(1000);
  eq(p.seen[p.seen.length - 1], '211', '첫 글자만 틀림'); eq(res.missed.map((m) => m.key).join(''), 'ㅈ', 'ㅈ에 적힌다');
  /* 한 낱말에서 틀려도 띄어쓰기 뒤에는 다시 맞춰서 본다 */
  p = play('가나 다라 마바', H.keyStream('가너다 다라 마바'));
  eq(p.seen[p.seen.length - 1], '12111111', "첫 낱말의 '나'만 틀림, 뒤 낱말은 전부 맞음");
  /* 낱말을 다 안 치고 띄어쓰기: 안 친 글자가 틀림, 띄어쓰기도 틀린 글쇠 */
  p = play('사과를 먹어요', H.keyStream('사과 먹어요'));
  res = p.s.finish(1000);
  eq(p.seen[p.seen.length - 1], '1121111', "'를'을 안 침"); eq(res.missed.map((m) => m.key).join(''), 'ㄹ', '띄어쓰기를 누른 순간 기대한 글쇠는 ㄹ');
  /* 띄어쓰기 자리에서 받침을 더 침 */
  p = play('가 나', ['ㄱ', 'ㅏ', 'ㄴ']);
  eq(p.seen[2], '120', '띄어쓰기 칸이 틀림'); eq(p.s.byKey[' '].miss, 1, '띄어쓰기에 적힌다');
  /* 띄어쓰기를 연달아 치거나 맨 앞에 쳐도 낱말을 건너뛰지 않는다 */
  let s = new TJ.Session('가 나'); eq(s.update('가  나', 0).value, '가 나', '겹 띄어쓰기는 버린다'); eq(s.update(' 가', 0).value, '가', '맨 앞 띄어쓰기는 버린다');
  eq(s.update('가 나 다', 0).value, '가 나', '목표보다 넘치는 낱말은 버린다');
  /* 음절마다 글쇠 하나를 다른 글쇠로 바꿔 치면 반드시 그 글쇠가 잡힌다 */
  for (let i = 0; i < 11172; i += 5) {
    const ch = String.fromCharCode(0xAC00 + i), keys = H.keysOf(ch);
    keys.forEach((k, j) => {
      const sub = isC(k) ? (k === 'ㅁ' ? 'ㅋ' : 'ㅁ') : (k === 'ㅠ' ? 'ㅛ' : 'ㅠ');
      const typed = keys.slice(); typed[j] = sub;
      const q = play(ch + ' 끝', typed.concat([' ', 'ㄲ', 'ㅡ', 'ㅌ']));
      const r = q.s.finish(1000);
      ok(r.okKeys === keys.length + 3 && r.typedKeys === keys.length + 4 && r.missed.length === 1 && r.missed[0].key === k && q.seen[j].charAt(0) === '2' && q.seen[q.seen.length - 1] === '211',
        ch + ' 의 ' + (j + 1) + '번째 글쇠 ' + k + ' 대신 ' + sub + ': 맞은 ' + r.okKeys + '/' + r.typedKeys + ', 틀린 글쇠 ' + r.missed.map((m) => m.key).join('') + ', 화면 ' + q.seen.join(' '));
    });
  }
  /* 영어 */
  p = play('the cat', Array.from('thr'));
  eq(p.seen[2], '1120000', '영어 글자 틀림'); eq(p.s.byKey['e'].miss, 1, 'e에 적힌다');
  /* 목표보다 길게 치면: 더 친 글쇠는 틀림, 8글쇠 넘게는 받지 않는다 */
  s = new TJ.Session('ab'); let r = s.update('abcd', 0);
  eq(r.st.join(''), '12', '더 친 글자는 마지막 칸에 틀림으로'); eq(s.update('ab' + 'x'.repeat(30), 0).value.length, 10, '한 낱말에 8글쇠까지만 더 받는다');
  /* 글을 이어 붙이기 */
  const s2 = new TJ.Session('가'); s2.update('가', 0); ok(s2.cmp.complete, '다 침'); s2.extend('나'); eq(s2.T.text, '가 나', '이어 붙인 글'); ok(!s2.cmp.complete, '아직 안 끝남');
  eq(TJ.prepare('  가   나 \n\n 다  ').text, '가 나\n다', '목표 글의 앞뒤·겹 띄어쓰기는 하나로');
});

/* ---- 5. 터치 자판(천지인 등): 글자가 끝날 때 판정, 글쇠 수는 두벌식으로 환산 ---- */
run('touch', () => {
  const feed = (target, values) => { const s = new TJ.Session(target, { mode: 'char' }); const seen = values.map((v, i) => s.update(v, i * 300).st.join('')); return { s, seen }; };
  /* 천지인으로 '한글': ㅎ, ㅣ, ㆍ(히 → 하), ㄴ … 중간의 '히'를 틀렸다고 하지 않는다 */
  let p = feed('한글', ['ㅎ', '히', '하', '한', '한ㄱ', '한그', '한글']);
  eq(p.seen.join(' '), '30 30 30 30 13 13 13', '천지인 중간 모양에 틀림 표시 없음');
  eq(p.s.cmp.pendingText, '글', '조합 중인 글자는 친 그대로 보여 준다');
  let res = p.s.finish(2100);
  eq(res.typedKeys + ':' + res.okKeys, '6:6', '환산 글쇠 6, 맞은 6'); eq(res.strokes, 6, '타수 6'); eq(res.accuracy, 100, '정확도 100');
  near(res.speed, 6 * 60000 / 2100, '타수 = 6 × 60000 ÷ 2100');
  /* 틀린 글자는 다음 글자가 올 때 틀림으로 */
  p = feed('한글', ['ㅎ', '하', '핫', '핫ㄱ', '핫그', '핫글']);
  eq(p.seen.join(' '), '30 30 30 23 23 23', "'핫'은 다음 글자가 온 뒤에 틀림");
  res = p.s.finish(1800);
  eq(res.typedKeys + ':' + res.okKeys, '6:5', '환산 글쇠 6, 맞은 5'); eq(res.missed[0].key, 'ㄴ', '틀린 글쇠 ㄴ');
  eq(res.okChars + ':' + res.badChars, '1:1', '맞은 글자 1, 틀린 글자 1');
  /* 시간이 끝났을 때 조합 중이던 글자: 맞게 이어지는 글쇠만 센다 */
  p = feed('한글', ['ㅎ', '하', '한', '한ㄱ', '한그']);
  res = p.s.finish(1500);
  eq(res.strokes + ':' + res.okChars + ':' + res.badChars, '5:1:0', '조합 중이던 글자는 글쇠만');
  eq(res.typedKeys + ':' + res.okKeys, '5:5', '누른 5, 맞은 5');
  p = feed('한글', ['ㅎ', '하', '한', '한ㄱ', '한기']);
  res = p.s.finish(1500);
  eq(res.strokes + ':' + res.typedKeys, '3:3', '끝나는 순간 천지인 중간 모양(기)은 세지 않는다');
  /* 영어는 터치 자판에서도 바로 판정 */
  p = feed('cat', ['c', 'cx']);
  eq(p.seen.join(' '), '100 120', '영어는 바로');
  /* 자판(key)에서 시간이 끝났을 때 받침이 넘어가던 중이면 앞 글자는 맞음 */
  const s = new TJ.Session('가나'); s.update('간', 0);
  res = s.finish(1000);
  eq(res.okChars + ':' + res.badChars + ':' + res.strokes, '1:0:3', "'간'에서 끝 = '가' 맞음, 3타");
});

/* ---- 6. 타수·WPM·정확도: 손으로 계산한 값 ---- */
run('calc', () => {
  near(TJ.calc.perMin(11, 3000), 220, '11타 3초 = 220타/분');
  near(TJ.calc.perMin(300, 60000), 300, '300타 1분');
  near(TJ.calc.wpm(22, 12000), 22, '22글자 12초 = 22 WPM');
  near(TJ.calc.wpm(250, 60000), 50, '250글자 1분 = 50 WPM');
  near(TJ.calc.accuracy(10, 11), 1000 / 11, '10/11');
  eq(TJ.calc.accuracy(0, 0), null, '아무것도 안 누르면 정확도 없음');
  eq(TJ.calc.perMin(10, 0), 0, '시간 0이면 0'); eq(TJ.calc.wpm(10, 0), 0, '시간 0이면 0');
  const type = (target, typed, opt) => { const s = new TJ.Session(target, opt); let v = ''; Array.from(typed).forEach((ch, i) => { v = ch === '\b' ? v.slice(0, -1) : v + ch; s.update(v, i * 100); }); return s; };
  /* 영어, 다 맞음: 22글자 12초 → 순 22, 총 22, 100% */
  let r = type('the cat sat on the mat', 'the cat sat on the mat').finish(12000);
  near(r.wpm, 22, '순 WPM'); near(r.grossWpm, 22, '총 WPM'); eq(r.accuracy, 100, '정확도');
  /* 영어, 한 글자 틀리고 안 고침: 맞은 10글자·친 11글자 6초 → 순 20, 총 22, 90.909% */
  r = type('hello world', 'hellp world').finish(6000);
  near(r.wpm, 20, '순 WPM = 10 ÷ 5 ÷ 0.1'); near(r.grossWpm, 22, '총 WPM = 11 ÷ 5 ÷ 0.1'); near(r.accuracy, 1000 / 11, '정확도 = 10 ÷ 11');
  eq(r.missed.map((m) => m.key).join(''), 'o', '틀린 글쇠 o');
  /* 영어, 틀렸다가 고침: 친 12글자(지우기는 안 셈), 맞은 11 → 순 22, 총 24, 91.667% */
  r = type('hello world', 'hellp\bo world').finish(6000);
  near(r.wpm, 22, '순 WPM = 11 ÷ 5 ÷ 0.1'); near(r.grossWpm, 24, '총 WPM = 12 ÷ 5 ÷ 0.1'); near(r.accuracy, 1100 / 12, '정확도 = 11 ÷ 12');
  /* 영어 타수: 대문자는 Shift 포함 2타. 'Hi there' = 2+1+1+5 = 9타 3초 → 180타/분, WPM = 8 ÷ 5 ÷ 0.05 = 32 */
  r = type('Hi there', 'Hi there').finish(3000);
  near(r.speed, 180, '영어 타수'); near(r.wpm, 32, '영어 WPM');
  /* 한글: '한글 타자' 11타 3초 → 220타/분 */
  const ko = (target, ms) => { const s = new TJ.Session(target); stepsFor(H.keyStream(target)).forEach((v, i) => s.update(v, i * 50)); return s.finish(ms); };
  r = ko('한글 타자', 3000); near(r.speed, 220, '한글 타자 3초'); eq(r.strokes, 11, '11타');
  r = ko('값이 싸요', 4000); near(r.speed, 180, '값이 싸요 12타 4초 = 180타/분');
  r = ko('까치', 1000); near(r.speed, 300, '까치 5타 1초 = 300타/분');
  /* 줄바꿈 자리에 띄어쓰기를 쳐도 맞게(문장 연습) */
  r = type('a\nb', 'a b', { soft: true }).finish(1000); eq(r.okChars, 3, '줄바꿈 자리의 띄어쓰기');
  r = type('a\nb', 'a b').finish(1000); eq(r.okChars + ':' + r.badChars, '2:1', '옵션이 없으면 틀림');
  /* 1초마다 적는 기록 */
  const s = new TJ.Session('abcd'); s.update('ab', 500); s.sample(1); s.update('abx', 1500); s.sample(2);
  eq(JSON.stringify(s.samples), JSON.stringify([{ t: 1, net: 2, typed: 2, miss: 0 }, { t: 2, net: 2, typed: 3, miss: 1 }]), '초마다 기록');
});

/* ---- 7. 글쇠별 틀림·느림 집계 ---- */
run('keys', () => {
  /* ㅁ은 150ms, ㄴ은 400ms 간격으로 네 번씩. 처음 글쇠와 3초 넘게 쉰 뒤의 글쇠는 간격에서 뺀다 */
  const s = new TJ.Session('ㅁㄴㅁㄴㅁㄴㅁㄴㅁ');
  let t = 0, v = '';
  ['ㅁ', 'ㄴ', 'ㅁ', 'ㄴ', 'ㅁ', 'ㄴ', 'ㅁ', 'ㄴ'].forEach((k) => { t += k === 'ㅁ' ? 150 : 400; v += k; s.update(v, t); });
  t += 5000; v += 'ㅁ'; s.update(v, t);
  const r = s.finish(t);
  const by = Object.fromEntries(Object.keys(s.byKey).map((k) => [k, s.byKey[k]]));
  eq(by['ㅁ'].hit + ':' + by['ㅁ'].n + ':' + by['ㅁ'].ms, '5:3:450', 'ㅁ: 다섯 번 맞음, 간격은 세 번(첫 글쇠·오래 쉰 뒤 제외) 450ms');
  eq(by['ㄴ'].hit + ':' + by['ㄴ'].n + ':' + by['ㄴ'].ms, '4:4:1600', 'ㄴ: 네 번, 1600ms');
  near(r.meanGap, 2050 / 7, '전체 평균 간격');
  eq(r.slow.map((x) => x.key + Math.round(x.avg)).join(','), 'ㄴ400', '느린 글쇠 = ㄴ(평균 400ms)');
  /* 느린 글쇠가 여럿이면 느린 순서로: a 100ms, b 600ms, c 400ms → 평균(약 391ms)보다 느린 b, c */
  const s4 = new TJ.Session('abcabcabcabc'); let t4 = 0, v4 = '';
  Array.from('abcabcabcabc').forEach((k) => { t4 += { a: 100, b: 600, c: 400 }[k]; v4 += k; s4.update(v4, t4); });
  const r4 = s4.finish(t4);
  eq(r4.slow.map((x) => x.key + Math.round(x.avg)).join(','), 'b600,c400', '느린 글쇠는 느린 순서로');
  near(r4.meanGap, 4300 / 11, '평균 간격 = (300 + 2400 + 1600) ÷ 11');
  /* 멈췄다 돌아오면 다음 글쇠 간격은 재지 않는다 */
  const s2 = new TJ.Session('aaaa'); s2.update('a', 0); s2.update('aa', 100); s2.breakTiming(); s2.update('aaa', 200); s2.update('aaaa', 300);
  eq(s2.byKey.a.n + ':' + s2.byKey.a.ms, '2:200', '멈춘 뒤 첫 글쇠는 간격에서 뺌');
  /* 자주 틀린 글쇠 순서: 횟수 많은 순 */
  const s3 = new TJ.Session('aaabbb'); let val = '';
  ['x', '\b', 'x', '\b', 'a', 'a', 'a', 'y', '\b', 'b', 'b', 'b'].forEach((k, i) => { val = k === '\b' ? val.slice(0, -1) : val + k; s3.update(val, i * 100); });
  const r3 = s3.finish(1200);
  eq(r3.missed.map((m) => m.key + m.miss).join(','), 'a2,b1', '자주 틀린 글쇠 순서');
  eq(r3.pairs.map((p) => p.want + p.got + p.n).join(','), 'ax2,by1', '무엇을 무엇으로 쳤는지');
  /* 틀린 글쇠가 든 낱말 모으기 */
  const got = TJ.pick.withKeys(KO.words, ['ㅆ', 'ㄶ']);
  ok(got.length >= 5 && got.every((w) => H.keyStream(w).some((k) => k === 'ㅆ' || k === 'ㄶ' || k === 'ㅎ') ), '모은 낱말 수 ' + got.length);
  ok(got.every((w) => H.keyStream(w).includes('ㅆ')), 'ㅆ이 든 낱말만(겹받침 ㄶ은 ㄴ·ㅎ 두 글쇠라 글쇠가 아님): ' + got.slice(0, 5).join(' '));
  eq(TJ.pick.withKeys(['가', '까까', '까'], ['ㄲ']).join(','), '까까,까', '많이 든 낱말부터');
});

/* ---- 8. 시간 재기: 첫 글쇠에서 시작, 멈춤 포함 ---- */
run('timer', () => {
  let now = 1000;
  const t = new TJ.Timer(() => now);
  eq(t.elapsed(), 0, '시작 전 0'); ok(!t.running(), '시작 전');
  now = 5000; eq(t.elapsed(), 0, '시작 전에는 시간이 안 간다');
  t.start(); now = 8000; eq(t.elapsed(), 3000, '3초'); ok(t.running(), '재는 중');
  t.start(); eq(t.elapsed(), 3000, '두 번 시작해도 그대로');
  t.pause(); now = 20000; eq(t.elapsed(), 3000, '멈춘 동안 안 간다'); ok(!t.running(), '멈춤');
  t.pause(); eq(t.elapsed(), 3000, '두 번 멈춰도 그대로');
  t.resume(); now = 21500; eq(t.elapsed(), 4500, '다시 시작 뒤 1.5초');
  t.resume(); now = 22000; eq(t.elapsed(), 5000, '두 번 다시 시작해도 그대로');
  eq(t.left(30000), 25000, '남은 시간'); eq(t.left(4000), 0, '0 아래로 안 내려감');
  now = 19000; eq(t.elapsed(), 3000, '시계가 뒤로 가도 멈춰 둔 시간 아래로 내려가지 않는다'); now = 22000;
  t.reset(); eq(t.elapsed(), 0, '처음으로'); t.resume(); eq(t.elapsed(), 0, '시작 전 다시 시작은 무시'); t.pause(); eq(t.elapsed(), 0, '시작 전 멈춤은 무시');
});

/* ---- 9. 낱말·문장 고르기(씨앗 고정) ---- */
run('pick', () => {
  const P = TJ.pick;
  for (const [s, v] of Object.entries(REF.crc)) eq(P.crc32(s), v, 'crc32("' + s + '") = 파이썬 zlib');
  const a = P.words(EN.words, 200, P.rng(7)), b = P.words(EN.words, 200, P.rng(7)), c = P.words(EN.words, 200, P.rng(8));
  eq(a.join(' '), b.join(' '), '씨앗이 같으면 같은 낱말');
  ok(a.join(' ') !== c.join(' '), '씨앗이 다르면 다른 낱말');
  eq(a.length, 200, '낱말 수');
  ok(a.every((w) => EN.words.includes(w)), '목록 안의 낱말만');
  ok(a.every((w, i) => i < 1 || w !== a[i - 1]) && a.every((w, i) => i < 2 || w !== a[i - 2]), '바로 앞 두 낱말과 겹치지 않는다');
  /* 고르게 뽑는가: 3만 번 뽑아 가장 많이·적게 나온 낱말 */
  const many = P.words(EN.words, 30000, P.rng(123)), cnt = {};
  many.forEach((w) => { cnt[w] = (cnt[w] || 0) + 1; });
  const vals = EN.words.map((w) => cnt[w] || 0), mean = 30000 / EN.words.length;
  ok(Math.min(...vals) > mean * 0.6 && Math.max(...vals) < mean * 1.4, '고르게 뽑힘: 최소 ' + Math.min(...vals) + ', 최대 ' + Math.max(...vals) + ', 평균 ' + mean.toFixed(1));
  /* 문장부호 */
  const p = P.words(EN.words, 120, P.rng(3), { punct: true, lang: 'en' });
  ok(/^[A-Z]/.test(p[0]), '첫 낱말은 대문자: ' + p[0]);
  ok(/[.?!]$/.test(p[p.length - 1]), '마지막 낱말은 문장 끝 부호');
  ok(p.every((w, i) => i === 0 || !/[.?!]$/.test(p[i - 1]) || /^[A-Z]/.test(w)), '문장 끝 다음은 대문자');
  ok(p.every((w, i) => i === 0 || /[.?!]$/.test(p[i - 1]) || !/^[A-Z]/.test(w)), '문장 가운데는 소문자');
  ok(p.some((w) => w.endsWith(',')), '쉼표도 나온다');
  const pk = P.words(KO.words, 120, P.rng(3), { punct: true, lang: 'ko' });
  ok(pk.some((w) => /[.?!]$/.test(w)) && H.untypeable(pk.join(' ')).length === 0, '한국어 낱말 + 문장부호');
  const nums = P.words(EN.words, 300, P.rng(5), { numbers: true });
  const nn = nums.filter((w) => /^\d+$/.test(w)).length;
  ok(nn > 15 && nn < 70, '숫자 낱말이 가끔 나온다: ' + nn + '/300');
  ok(P.words(EN.words, 300, P.rng(5)).every((w) => !/\d/.test(w)), '옵션이 없으면 숫자 없음');
  let threw = false; try { P.words(['a', 'b'], 5, P.rng(1)); } catch (e) { threw = true; }
  ok(threw, '낱말이 너무 적으면 알린다');
  /* 문장 */
  const s1 = P.sentences(SENT, 600, P.rng(11)), s2 = P.sentences(SENT, 600, P.rng(11));
  eq(s1.join('|'), s2.join('|'), '씨앗이 같으면 같은 문장');
  ok(s1.join(' ').length >= 600, '달라는 길이를 채운다');
  eq(new Set(s1).size, s1.length, '한 바퀴 안에서는 같은 문장이 다시 안 나온다');
  const long = P.sentences(SENT.slice(0, 5), 2000, P.rng(2));
  ok(long.every((x, i) => i === 0 || x !== long[i - 1]), '여러 바퀴를 돌아도 같은 문장이 연달아 나오지 않는다');
  ok(long.length > 5, '문장이 모자라면 다시 섞어 잇는다');
  const sh = P.shuffle([1, 2, 3, 4, 5, 6, 7, 8], P.rng(9));
  eq(sh.slice().sort().join(''), '12345678', '섞어도 빠지거나 겹치지 않는다');
  /* 날짜 씨앗으로 고른 '오늘의 문장'은 날마다 고정 */
  const daily = (d) => SENT[P.crc32('ko:' + d) % SENT.length];
  eq(daily('2026-10-10'), SENT[REF.crc['ko:2026-10-10'] % SENT.length], '오늘의 문장(파이썬 zlib 값으로 고른 것과 같다)');
  /* 난수 값 고정(다른 구현과 대조한 값이 아니라, 바뀌면 알려고 박아 둔 값) */
  const r = P.rng(1); const first = [r(), r(), r()].map((x) => Math.floor(x * 1e6));
  eq(first.join(','), '627073,2735,527447', 'mulberry32(1) 첫 세 값');
});

/* ---- 10. 한/영 반대 입력 알아채기 ---- */
run('layout', () => {
  const hint = (t, i) => TJ.layoutHint(TJ.prepare(t).chars, H.toChars(i));
  eq(hint('the cat', 'ㅅ'), 'en', '영어 글인데 한글 낱자');
  eq(hint('the cat', '솓'), 'en', "영어 글인데 '솓'(the)");
  eq(hint('the cat', 'the ㅊ'), 'en', '중간부터 한글');
  eq(hint('Hello', 'ㅗ'), 'en', '대문자 자리');
  eq(hint('한글', 'g'), 'ko', '한글 글인데 영문자');
  eq(hint('한글', 'gks'), 'ko', 'gks = 한');
  eq(hint('한글 타자', '한글 x'), 'ko', '중간부터 영문자');
  eq(hint('까치', 'r'), 'ko', 'Shift 없이 쳐도 자판이 반대인 건 같다');
  eq(hint('hello', 'HEL'), 'caps', 'Caps Lock');
  eq(hint('한글', '핫'), null, '그냥 틀린 글자');
  eq(hint('한글', '한글'), null, '맞게 침');
  eq(hint('한글', 'x'), null, '자판을 바꿔도 안 맞는 글자');
  eq(hint('the', 'ㅁ'), null, '자판을 바꿔도 안 맞는 글자(영어)');
  eq(hint('the', 'thx'), null, '영어 오타');
  eq(hint('한글', ''), null, '아직 안 침');
  eq(hint('Hello', 'H'), null, '대문자 한 글자는 그냥 맞음');
});

/* ---- 11. 화면 자판 자리 ---- */
run('board', () => {
  const B = TJ.board;
  B.rows.forEach((row, i) => { eq(B.shifted[i].length, row.length, i + '줄 Shift 글자 수'); eq(B.finger[i].length, row.length, i + '줄 손가락 수'); });
  eq(Array.from(B.home).map((c) => TJ.keyPlace(c).finger).join(''), '12345678', '기본 자리 여덟 손가락');
  eq(JSON.stringify(TJ.keyPlace('ㅎ')), JSON.stringify({ ch: 'g', shift: false, finger: 4, row: 2, col: 4 }), 'ㅎ = g 자리, 왼손 검지');
  eq(TJ.keyPlace('ㅆ').ch + TJ.keyPlace('ㅆ').shift, 'ttrue', 'ㅆ = Shift + t');
  eq(TJ.keyPlace('?').ch + TJ.keyPlace('?').shift, '/true', '? = Shift + /');
  eq(TJ.keyPlace(' ').finger, 0, '띄어쓰기는 엄지');
  eq(TJ.keyPlace('…'), null, '자판에 없는 글자');
  /* 손가락마다 맡는 글쇠(자리 연습 표와 같은 것을 손가락 쪽에서 적은 것) */
  const BY_FINGER = ['`1qaz', '2wsx', '3edc', '45rtfgvb', '67yuhjnm', '8ik,', '9ol.', "0-=p[]\\;'/"];
  BY_FINGER.forEach((keys, f) => Array.from(keys).forEach((ch) => eq(TJ.keyPlace(ch).finger, f + 1, ch + ' 손가락')));
  eq(BY_FINGER.join('').length, B.rows.join('').length, '자판의 모든 글쇠에 손가락이 있다');
  Object.keys(H.K2Q).forEach((k) => ok(TJ.keyPlace(k) && TJ.keyPlace(k).shift === H.needsShift(k), k + ' 자리'));
  for (let c = 0x21; c < 0x7F; c++) { const ch = String.fromCharCode(c), p = TJ.keyPlace(ch); ok(p && p.shift === H.needsShift(ch), ch + ' 자리와 Shift'); }
});

/* ---- 12. 연습 글 ---- */
run('texts', () => {
  ok(SENT.length >= 200, '한국어 문장 ' + SENT.length + '개(200개 이상)');
  Object.entries(KO.sentences).forEach(([k, v]) => ok(v.length >= 40, '주제 ' + k + ' 문장 ' + v.length + '개(40개 이상)'));
  ok(KO.proverbs.length >= 60, '속담 ' + KO.proverbs.length + '개(60개 이상)');
  ok(KO.words.length >= 200, '한국어 낱말 ' + KO.words.length + '개');
  ok(EN.words.length >= 300, '영어 낱말 ' + EN.words.length + '개(300개 이상)');
  ok(EN.sentences.length >= 40, '영어 문장 ' + EN.sentences.length + '개(40개 이상)');
  const sets = { '한국어 문장': SENT, '속담': KO.proverbs, '한국어 낱말': KO.words, '영어 낱말': EN.words, '영어 문장': EN.sentences, '팬그램': EN.pangrams };
  for (const [name, list] of Object.entries(sets)) {
    eq(new Set(list).size, list.length, name + ' 겹치는 줄 없음');
    list.forEach((t) => {
      eq(H.untypeable(t).join(''), '', name + ' "' + t + '" 자판으로 칠 수 있는 글자만');
      ok(t === t.trim() && !/ {2}/.test(t) && !/\n/.test(t), name + ' "' + t + '" 앞뒤·겹 띄어쓰기 없음');
      eq(t.normalize('NFC'), t, name + ' "' + t + '" NFC');
    });
  }
  SENT.forEach((t) => { ok(/[.?!]$/.test(t), '문장 끝 부호: ' + t); ok(t.length >= 12 && t.length <= 40, '문장 길이 12~40자: ' + t.length + '자 ' + t); ok(!/[A-Za-z0-9]/.test(t), '한국어 문장에는 영문자·숫자 없음: ' + t); });
  KO.proverbs.forEach((t) => { ok(/^[가-힣 ]+$/.test(t), '속담은 한글과 띄어쓰기만: ' + t); ok(t.length <= 32, '속담 길이: ' + t); });
  KO.words.forEach((t) => ok(/^[가-힣]{2,5}$/.test(t), '낱말은 한글 2~5자: ' + t));
  EN.words.forEach((t) => ok(/^[a-z]{2,10}$/.test(t), '영어 낱말은 소문자 2~10자: ' + t));
  EN.sentences.forEach((t) => { ok(/^["A-Z]/.test(t) && /[.?!"]$/.test(t), '영어 문장 첫 글자·끝 부호: ' + t); ok(t.length >= 25 && t.length <= 75, '영어 문장 길이: ' + t.length + ' ' + t); });
  EN.pangrams.forEach((t) => eq(new Set(t.toLowerCase().replace(/[^a-z]/g, '')).size, 26, '팬그램에 26자 모두: ' + t));
  /* 겹받침·쌍자음이 고루 나오는가: 초성 19, 중성 21, 종성 27(없음 빼고) 전부 */
  const seen = { c: new Set(), v: new Set(), f: new Set() };
  Array.from(SENT.join('')).forEach((ch) => { const p = H.parts(ch); if (p && p.v.length && p.c.length) { seen.c.add(p.c.join('')); seen.v.add(p.v.join('')); if (p.f.length) seen.f.add(p.f.join('')); } });
  eq(seen.c.size, 19, '문장에 초성 19가지: 빠진 것 ' + H.CHO.filter((c) => !seen.c.has(c)).join(''));
  eq(seen.v.size, 21, '문장에 중성 21가지: 빠진 것 ' + H.JUNG.map((v) => v.join('')).filter((v) => !seen.v.has(v)).join(','));
  eq(seen.f.size, 27, '문장에 종성 27가지: 빠진 것 ' + H.JONG.map((v) => v.join('')).filter((v) => v && !seen.f.has(v)).join(','));
  /* 영어 낱말에 알파벳 26자가 모두 나오는가 */
  eq(new Set(EN.words.join('')).size, 26, '영어 낱말에 26자 모두');
});

/* ---- 13. 한/영(Caps Lock) 안내가 뜬 구간의 글쇠는 정확도·틀린 글쇠 기록에서 뺀다 ---- */
run('hintzone', () => {
  const feed = (target, values, opt) => { const s = new TJ.Session(target, opt); const hints = values.map((v, i) => s.update(v, 1000 + i * 100).hint); return { s, hints }; };
  /* 한글 글인데 영어 자판으로 gks 를 침: 셋 다 세지 않는다 */
  let p = feed('한글', ['g', 'gk', 'gks']);
  eq(p.hints.join(','), 'ko,ko,ko', '안내가 계속 뜬다');
  eq(p.s.typedKeys + ':' + p.s.okKeys + ':' + p.s.skippedKeys, '0:0:3', '누른 0, 맞은 0, 세지 않은 3');
  eq(Object.keys(p.s.pairs).length, 0, '무엇을 무엇으로 쳤는지에도 안 남는다');
  /* 지우고 한글로 다시 침: 여섯 글쇠만 센다 → 정확도 100 */
  ['gk', 'g', '', 'ㅎ', '하', '한', '한ㄱ', '한그', '한글'].forEach((v, i) => p.s.update(v, 2000 + i * 100));
  let res = p.s.finish(3000);
  eq(res.typedKeys + ':' + res.okKeys + ':' + res.skippedKeys, '6:6:3', '고쳐 친 뒤: 누른 6, 맞은 6');
  eq(res.accuracy, 100, '정확도 100'); eq(res.missed.length, 0, '틀린 글쇠 없음');
  eq(TJ.report(res).skipped, 3, '화면 표시 값에도 세지 않은 글쇠 수');
  /* 영어 글인데 한글 자판 */
  p = feed('the cat', ['ㅅ', '소', '솓']);
  eq(p.hints.join(','), 'en,en,en', '영어로 바꾸라는 안내'); eq(p.s.typedKeys + ':' + p.s.skippedKeys, '0:3', '세지 않는다');
  /* 글 중간부터 반대 자판: 앞에서 맞게 친 것은 그대로 */
  p = feed('한글 타자', ['ㅎ', '하', '한', '한ㄱ', '한그', '한글', '한글 ', '한글 x', '한글 xk']);
  eq(p.s.typedKeys + ':' + p.s.okKeys + ':' + p.s.skippedKeys, '7:7:2', '앞 일곱 글쇠만 센다');
  /* Caps Lock: 첫 글자는 안내가 뜨기 전이라 틀렸다고 셌다가, 안내가 뜨면 되돌린다 */
  p = feed('hello', ['H']);
  eq(p.hints[0], null, '한 글자로는 안내 없음'); eq(p.s.typedKeys + ':' + p.s.okKeys, '1:0', '일단 틀린 글쇠');
  eq(p.s.byKey.h.miss, 1, 'h에 적힘');
  eq(p.s.update('HE', 1200).hint, 'caps', 'Caps Lock 안내');
  eq(p.s.typedKeys + ':' + p.s.okKeys + ':' + p.s.skippedKeys, '0:0:2', '되돌려서 누른 0');
  eq(p.s.byKey.h.miss, 0, 'h의 틀린 횟수도 되돌림'); eq(Object.keys(p.s.pairs).length, 0, '짝 기록도 되돌림');
  ['H', '', 'h', 'he', 'hel', 'hell', 'hello'].forEach((v, i) => p.s.update(v, 1300 + i * 100));
  res = p.s.finish(2000);
  eq(res.typedKeys + ':' + res.okKeys, '5:5', '다시 친 다섯 글쇠만'); eq(res.missed.length, 0, '틀린 글쇠 없음');
  /* 그냥 틀린 글쇠는 그대로 센다 */
  p = feed('한글', ['ㅎ', '하', '핫']);
  eq(p.hints[2], null, '안내 없음'); eq(p.s.typedKeys + ':' + p.s.okKeys + ':' + p.s.skippedKeys, '3:2:0', '틀린 글쇠는 센다');
  /* 안내가 뜬 채로 시간이 끝나도 세지 않는다 */
  p = feed('한글 타자', ['ㅎ', '하', '한', '한r', '한rm']);
  res = p.s.finish(1500);
  eq(res.typedKeys + ':' + res.okKeys + ':' + res.skippedKeys, '3:3:2', '끝날 때도 그대로'); eq(res.strokes, 3, '맞게 친 타수 3');
  /* 자판을 바꾸느라 멈춘 간격은 느린 글쇠 계산에 넣지 않는다 */
  const s = new TJ.Session('aaa'); s.update('a', 0); s.update('aㅁ', 100); s.update('a', 200); s.update('aa', 2900); s.update('aaa', 3000);
  eq(s.byKey.a.n + ':' + s.byKey.a.ms, '1:100', '안내 뒤 첫 글쇠의 간격은 재지 않는다');
});

/* ---- 14. 화면 표시 값의 일관성: 화면에 보이는 수로 다시 계산해도 같은 수가 나온다 ---- */
run('report', () => {
  /* 손으로 계산한 사례 */
  let r = TJ.report({ ms: 30000, strokes: 184, okChars: 92, typedKeys: 202, okKeys: 197 });
  eq(r.secsText + ':' + r.speed + ':' + r.wpm, '30:368:37', '184타 ÷ 30초 × 60 = 368, 92자 ÷ 5 ÷ 30초 × 60 = 36.8 → 37');
  eq(r.accuracy + ':' + r.wrong, '98:5', '197 ÷ 202 = 97.5% → 98, 틀린 키 5');
  r = TJ.report({ ms: 23449, strokes: 184, okChars: 80, typedKeys: 90, okKeys: 90 });
  eq(r.secsText + ':' + r.speed + ':' + r.wpm, '23.4:472:41', '23.449초 → 23.4초, 184 × 60 ÷ 23.4 = 471.79 → 472, 80 × 12 ÷ 23.4 = 41.03 → 41');
  eq(r.accuracy, 100, '다 맞으면 100');
  r = TJ.report({ ms: 1600, strokes: 1, okChars: 1, typedKeys: 1, okKeys: 1 });
  eq(r.speed, 38, '1타 ÷ 1.6초 × 60 = 37.5 → 38(딱 .5는 올림)');
  r = TJ.report({ ms: 8000, strokes: 1, okChars: 1, typedKeys: 200, okKeys: 199 });
  eq(r.speed + ':' + r.accuracy, '8:99', '7.5 → 8, 199 ÷ 200 = 99.5%는 100이 아니라 99로');
  r = TJ.report({ ms: 30000, strokes: 2, okChars: 1, typedKeys: 300, okKeys: 1 });
  eq(r.accuracy, 1, '0.33%는 0이 아니라 1로');
  eq(TJ.report({ ms: 30000, strokes: 0, okChars: 0, typedKeys: 0, okKeys: 0 }).accuracy, null, '아무것도 안 누르면 정확도 없음');
  eq(TJ.report({ ms: 30000, strokes: 0, okChars: 0, typedKeys: 5, okKeys: 0 }).accuracy, 0, '다 틀리면 0');
  eq(TJ.report({ ms: 20, strokes: 1, okChars: 1, typedKeys: 1, okKeys: 1 }).secsText, '0.1', '시간은 0.1초 아래로 내려가지 않는다');
  /* 표시 값끼리 다시 계산: 화면 글자('23.4')를 읽어 정수 계산(반올림은 .5 올림)으로 구한 값과 같아야 한다 */
  const half = (num, den) => Number((2n * num + den) / (2n * den));
  let bad = 0, n = 0;
  for (let strokes = 0; strokes <= 1400; strokes += 7) {
    for (let ms = 50; ms <= 125000; ms += 331) {
      const rep = TJ.report({ ms, strokes, okChars: Math.floor(strokes / 2), typedKeys: strokes + 3, okKeys: strokes });
      const t = BigInt(rep.secsText.includes('.') ? rep.secsText.replace('.', '') : rep.secsText + '0'); /* 0.1초 단위 */
      if (rep.speed !== half(BigInt(rep.strokes) * 600n, t)) bad++;
      if (rep.wpm !== half(BigInt(rep.chars) * 120n, t)) bad++;
      if (rep.wrong !== rep.typed - rep.ok) bad++;
      if (Math.abs(Number(t) * 100 - ms) > 50 && ms >= 50) bad++; /* 표시한 시간은 잰 시간과 0.05초 넘게 다르지 않다 */
      n++;
    }
  }
  ok(bad === 0, '표시 값 일관성 ' + n + '가지 가운데 어긋남 ' + bad);
  /* 한 판을 실제로 돌려서도: 시간으로 잰 판은 표시 시간이 정확히 그 초 */
  const text = '한글 타자 연습을 해요', s = new TJ.Session(text);
  stepsFor(H.keyStream(text)).forEach((v, i) => s.update(v, i * 120));
  const rr = TJ.report(s.finish(15000));
  eq(rr.secsText + ':' + rr.strokes + ':' + rr.speed, '15:' + H.strokeCount(text) + ':' + H.strokeCount(text) * 4, '15초 판: 타수 × 4');
});

/* ---- 15. 기록 저장(흉내 저장소) ---- */
run('store', () => {
  const mem = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
  eq(Object.values(Store.KEYS).sort().join(','), 'todok.best,todok.keys,todok.lang,todok.runs,todok.set', '쓰는 키 다섯 개');
  const st = mem(), S = new Store(st);
  const cond = Store.cond({ tool: 'test', lang: 'ko', kind: 'sentences', len: 't30' });
  eq(cond, 'test|ko|sentences|t30|-', '조건 이름');
  ok(Store.cond({ tool: 'test', lang: 'ko', kind: 'words', len: 't30', punct: true }) !== Store.cond({ tool: 'test', lang: 'ko', kind: 'words', len: 't30' }), '문장부호를 넣은 판은 다른 조건');
  eq(S.runs().length, 0, '처음엔 비어 있다'); eq(S.best(cond), null, '최고 기록 없음'); ok(!S.hasRecords(), '기록 없음');
  let a = S.addRun({ cond, v: 300, acc: 96, at: 1000 });
  eq(JSON.stringify(a), JSON.stringify({ first: true, prev: null, diff: null, best: null, isBest: false }), '첫 기록: 견줄 기록이 없다(최고 기록 연출 없음)');
  a = S.addRun({ cond, v: 312, acc: 97, at: 2000 });
  eq(JSON.stringify(a), JSON.stringify({ first: false, prev: 300, diff: 12, best: 300, isBest: true }), '지난번보다 +12, 최고 기록');
  a = S.addRun({ cond, v: 290, acc: 99, at: 3000 });
  eq(a.diff + ':' + a.best + ':' + a.isBest, '-22:312:false', '지난번보다 −22, 최고는 312 그대로');
  a = S.addRun({ cond, v: 312, acc: 99, at: 3500 });
  eq(a.isBest, false, '같은 값은 최고 기록을 넘은 게 아니다');
  eq(S.best(cond).v + ':' + S.best(cond).at, '312:2000', '최고 기록과 그때 시각');
  const other = Store.cond({ tool: 'test', lang: 'ko', kind: 'sentences', len: 't60' });
  a = S.addRun({ cond: other, v: 100, acc: 90, at: 4000 });
  ok(a.first && S.best(other).v === 100 && S.best(cond).v === 312, '조건이 다르면 따로 견준다');
  eq(S.runs()[0].cond, other, '가장 새 기록이 맨 앞'); eq(S.last(cond).v, 312, '그 조건의 가장 최근 기록');
  for (let i = 0; i < 70; i++) S.addRun({ cond, v: 200 + (i % 5), acc: 95, at: 5000 + i });
  eq(S.runs().length, Store.MAX_RUNS, '최근 기록은 50개까지만');
  eq(JSON.parse(st.m.get('todok.runs')).length, 50, '저장소에도 50개');
  /* 키별 틀린 횟수 */
  S.addKeys('ko', [{ key: 'ㅊ', miss: 2, hit: 10 }, { key: 'ㅓ', miss: 1, hit: 30 }, { key: 'ㅏ', miss: 0, hit: 40 }]);
  S.addKeys('ko', [{ key: 'ㅊ', miss: 1, hit: 5 }, { key: 'ㅡ', miss: 1, hit: 3 }]);
  S.addKeys('en', [{ key: 'e', miss: 4, hit: 1 }]);
  eq(S.missed('ko').map((x) => x.key + x.miss + '/' + x.hit).join(' '), 'ㅊ3/15 ㅡ1/3 ㅓ1/30', '많이 틀린 순, 같으면 틀린 비율이 높은 순');
  eq(S.missed('en', 3).map((x) => x.key).join(''), 'e', '언어별로 따로');
  /* 설정 */
  S.saveSettings('ko/test', { kind: 'words', len: 't60' }); S.saveSettings('ko/test', { punct: true }); S.saveSettings('en/test', { kind: 'sentences' });
  eq(JSON.stringify(S.settings('ko/test')), JSON.stringify({ kind: 'words', len: 't60', punct: true }), '설정은 페이지마다, 덧붙여 저장');
  eq(JSON.stringify(S.settings('ko/practice')), '{}', '없는 페이지는 빈 설정');
  ok(!S.langDismissed(), '안내 띠 표시 없음'); S.dismissLang(); ok(S.langDismissed(), '안내 띠 닫음');
  /* 기록 지우기: 기록 셋만 지우고 설정·안내 띠 표시는 남는다 */
  ok(S.hasRecords(), '기록 있음');
  S.clearRecords();
  eq([...st.m.keys()].sort().join(','), 'todok.lang,todok.set', '지운 뒤 남는 키');
  ok(!S.hasRecords() && S.runs().length === 0 && S.best(cond) === null && S.missed('ko').length === 0, '기록이 전부 비었다');
  eq(S.addRun({ cond, v: 10, acc: 50, at: 1 }).first, true, '지운 직후는 다시 첫 기록(최고 기록 연출 없음)');
  /* 저장소 값이 망가져 있어도 죽지 않는다 */
  st.setItem('todok.runs', '{oops'); st.setItem('todok.best', '[1,2]'); st.setItem('todok.keys', '"x"'); st.setItem('todok.set', 'null');
  eq(S.runs().length + ':' + Object.keys(S.bests()).length + ':' + S.missed('ko').length + ':' + JSON.stringify(S.settings('ko/test')), '0:0:0:{}', '망가진 값은 빈 것으로');
  st.setItem('todok.runs', JSON.stringify([{ cond: 'a', v: 'x', at: 1 }, null, 3, { cond: 'a', v: 5, at: 2 }]));
  eq(S.runs().length, 1, '꼴이 안 맞는 줄은 버린다');
  S.addRun({ cond, v: 20, acc: 50, at: 9 }); S.addKeys('ko', [{ key: 'ㄱ', miss: 1, hit: 1 }]); S.saveSettings('ko/test', { kind: 'words' });
  eq(S.runs()[0].v + ':' + S.missed('ko')[0].key + ':' + S.settings('ko/test').kind, '20:ㄱ:words', '망가진 뒤에도 다시 쓸 수 있다');
  /* 저장소가 없거나(사생활 보호 모드) 쓰기가 막혀도 조용히 넘어간다 */
  const none = new Store(null);
  eq(none.addRun({ cond, v: 1, acc: 1, at: 1 }).first, true, '저장소 없음'); eq(none.runs().length, 0, '저장소 없음: 빈 목록'); none.clearRecords(); none.saveSettings('x', { a: 1 });
  const full = new Store({ getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => { throw new Error('no'); } });
  eq(full.addRun({ cond, v: 1, acc: 1, at: 1 }).first, true, '쓰기가 막혀도 결과는 돌려준다'); full.addKeys('ko', [{ key: 'ㄱ', miss: 1 }]); full.clearRecords(); full.dismissLang();
});

/* ---- 16. 자리 연습 단계: 배운 키만으로 칠 수 있는 글만 나온다 ---- */
run('lessons', () => {
  const TEXT = { ko: KO, en: EN };
  for (const lang of ['ko', 'en']) {
    const list = LES.list[lang];
    eq(list.map((l) => l.id).join(','), 'home,top,bottom,shift,all', lang + ' 단계 순서');
    const seen = new Set([' ']);
    list.forEach((les, idx) => {
      les.keys.forEach((k) => { ok(!seen.has(k), lang + ' ' + les.id + ' 새 키 ' + k + ' 가 앞 단계와 겹치지 않는다'); seen.add(k); ok(TJ.keyPlace(k), k + ' 는 자판에 있는 키'); });
      if (les.id === 'all') return;
      eq([...les.allowed].sort().join(''), [...seen].sort().join(''), lang + ' ' + les.id + ' 그때까지 배운 키');
      ok(les.words.length >= 30, lang + ' ' + les.id + ' 단어 ' + les.words.length + '개(30개 이상)');
      eq(new Set(les.words).size, les.words.length, lang + ' ' + les.id + ' 겹치는 단어 없음');
      les.words.forEach((w) => {
        ok(H.keyStream(w).every((k) => seen.has(k)), lang + ' ' + les.id + ' "' + w + '" 배운 키만');
        ok(H.keyStream(w).some((k) => les.keys.includes(k)), lang + ' ' + les.id + ' "' + w + '" 새 키가 들어 있다');
        eq(H.untypeable(w).join(''), '', w + ' 칠 수 있는 글자');
      });
      /* 새 키가 단어에 빠짐없이 나오는가(영어 Shift 단계의 대문자는 흔한 것만 나오면 된다) */
      const inWords = new Set(les.words.flatMap((w) => H.keyStream(w)));
      const missing = les.keys.filter((k) => !inWords.has(k));
      if (!(lang === 'en' && les.id === 'shift')) ok(missing.length === 0 || (lang === 'en' && missing.join('') === ';'), lang + ' ' + les.id + ' 단어에 안 나오는 새 키: ' + missing.join(''));
      for (let seed = 1; seed <= 25; seed++) {
        const t = LES.text(lang, idx, TJ.pick.rng(seed), TEXT[lang]), keys = H.keyStream(t);
        ok(keys.every((k) => seen.has(k)), lang + ' ' + les.id + ' 씨앗 ' + seed + ' 연습 글이 배운 키만: ' + t);
        ok(keys.some((k) => les.keys.includes(k)), '새 키가 나온다');
        eq(H.untypeable(t).join(''), '', '칠 수 있는 글자만');
        eq(t, LES.text(lang, idx, TJ.pick.rng(seed), TEXT[lang]), '씨앗이 같으면 같은 글');
        ok(t.length >= 30 && t.length <= 160, '길이 ' + t.length);
        cleanRunAny(t, lang + ' ' + les.id);
      }
      /* 새 키가 연습 글(키 익히기 줄 + 단어)에 전부 나오는가: 여러 판을 모으면 */
      const all = new Set();
      for (let seed = 1; seed <= 40; seed++) H.keyStream(LES.text(lang, idx, TJ.pick.rng(seed), TEXT[lang])).forEach((k) => all.add(k));
      const never = les.keys.filter((k) => !all.has(k));
      if (!(lang === 'en' && les.id === 'shift')) eq(never.join(''), '', lang + ' ' + les.id + ' 40판 동안 한 번도 안 나온 새 키');
    });
    const t5 = LES.text(lang, 4, TJ.pick.rng(3), TEXT[lang]);
    ok(t5.length >= 90 && H.untypeable(t5).length === 0, lang + ' 전체 단계는 문장: ' + t5.slice(0, 30));
  }
  /* 한글 26 낱자 + Shift 7, 영문 26자가 단계에 다 들어 있다 */
  const koKeys = LES.list.ko.flatMap((l) => l.keys);
  eq([...koKeys].sort().join(''), Object.keys(H.K2Q).sort().join(''), '두벌식 33 키 전부');
  const enKeys = LES.list.en.flatMap((l) => l.keys).filter((k) => /[a-z]/.test(k));
  eq(enKeys.sort().join(''), 'abcdefghijklmnopqrstuvwxyz', '영문 26자 전부');
  eq(LES.PASS_ACC, 95, '통과 기준 95%');
  let threw = false; try { LES.text('ko', 9, TJ.pick.rng(1), KO); } catch (e) { threw = true; }
  ok(threw, '없는 단계는 알린다');
});

/* ---- 17. 가이드 글 속 예시 숫자·표: 만든 HTML 을 읽어 로직으로 다시 계산한다 ---- */
run('guide', () => {
  const root = path.join(here, '..');
  const pages = ['ko/guide/tasu-gyesan', 'ko/guide/dubeolsik-jari', 'ko/guide/batchim-neomeogam', 'ko/guide/yeongta-yeonseup',
    'guide/how-wpm-is-calculated', 'guide/touch-typing-home-row', 'guide/accuracy-before-speed'];
  const un = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const seen = { st: 0, pm: 0, wpm: 0, acc: 0, ok: 0, ime: 0, finger: 0, hand: 0, q: 0 };
  for (const pg of pages) {
    const f = path.join(root, pg, 'index.html');
    ok(fs.existsSync(f), pg + ' 글이 만들어져 있다(python3 _dev/build.py)');
    if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, 'utf8');
    let m;
    const each = (re, fn) => { re.lastIndex = 0; while ((m = re.exec(src))) fn(m); };
    /* 글 → 타수 */
    each(/data-st="([^"]*)">([\d,]+)</g, (x) => { seen.st++; eq(H.strokeCount(un(x[1])), +x[2].replace(/,/g, ''), pg + ' "' + un(x[1]) + '" 타수'); });
    /* 타수·시간 → 타/분 (화면과 같은 반올림) */
    each(/data-pm="(\d+),(\d+)">([\d,]+)</g, (x) => { seen.pm++; eq(TJ.report({ ms: +x[2], strokes: +x[1], okChars: 0, typedKeys: 1, okKeys: 1 }).speed, +x[3].replace(/,/g, ''), pg + ' ' + x[1] + '타 ' + x[2] + 'ms 타/분'); });
    each(/data-wpm="(\d+),(\d+)">([\d,]+)</g, (x) => { seen.wpm++; eq(TJ.report({ ms: +x[2], strokes: 0, okChars: +x[1], typedKeys: 1, okKeys: 1 }).wpm, +x[3], pg + ' ' + x[1] + '자 ' + x[2] + 'ms WPM'); });
    each(/data-acc="(\d+),(\d+)">(\d+)</g, (x) => { seen.acc++; eq(TJ.report({ ms: 1000, strokes: 0, okChars: 0, typedKeys: +x[2], okKeys: +x[1] }).accuracy, +x[3], pg + ' 정확도 ' + x[1] + '/' + x[2]); });
    /* 목표|친 글 → 맞게 친 타수 */
    each(/data-ok="([^"|]*)\|([^"]*)">(\d+)</g, (x) => {
      seen.ok++;
      const s = new TJ.Session(un(x[1])); stepsFor(H.keyStream(un(x[2]))).forEach((v, i) => s.update(v, i * 100));
      eq(s.finish(3000).strokes, +x[3], pg + ' "' + x[2] + '" 로 쳤을 때 맞게 친 타수');
    });
    /* 글쇠마다 화면에 보이는 글 */
    each(/<table data-ime="([^"]*)">(.*?)<\/table>/gs, (x) => {
      seen.ime++;
      const rows = x[2].split('</tr>').filter((r) => r.includes('<td>')).map((r) => [...r.matchAll(/<td>([^<]*)<\/td>/g)].map((c) => c[1]));
      const keys = H.keyStream(x[1]);
      eq(rows[0].join(' '), keys.join(' '), pg + ' ' + x[1] + ' 표의 누른 키');
      eq(rows[1].join(' / '), stepsFor(keys).join(' / '), pg + ' ' + x[1] + ' 표의 화면 글(입력기 흉내)');
      const ref = REF.ime.findIndex((p) => p.text === x[1]);
      ok(ref >= 0 && REF.ime2[ref].join(' / ') === rows[1].join(' / '), pg + ' ' + x[1] + ' 표 = 기준 라이브러리(es-hangul)가 보여 주는 글');
      /* 표의 어느 단계에서도 토독은 틀렸다고 하지 않는다 */
      const T = TJ.prepare(x[1]);
      ok(rows[1].every((v) => !TJ.compare(T, v).st.includes(BAD)), pg + ' ' + x[1] + ' 중간 모양을 틀렸다고 하지 않는다');
    });
    /* 손가락 표 */
    const fk = [];
    each(/<tr data-finger="(\d)" data-keys="([^"]*)">/g, (x) => { seen.finger++; Array.from(un(x[2])).forEach((k) => { fk.push(k); eq(TJ.keyPlace(k).finger, +x[1], pg + ' ' + k + ' 손가락'); }); });
    if (pg === 'ko/guide/dubeolsik-jari') eq(fk.slice().sort().join(''), Object.keys(H.K2Q).filter((k) => !H.needsShift(k)).sort().join(''), '손가락 표에 두벌식 26 낱자가 빠짐없이');
    if (pg === 'guide/touch-typing-home-row') eq(fk.filter((k) => /[a-z]/.test(k)).sort().join(''), 'abcdefghijklmnopqrstuvwxyz', '손가락 표에 영문 26자가 빠짐없이');
    /* 한 손으로만 치는 단어 */
    each(/data-hand="([LR])"[^>]*>([a-z]+)</g, (x) => { seen.hand++; ok(Array.from(x[2]).every((c) => (TJ.keyPlace(c).finger <= 4) === (x[1] === 'L')), pg + ' ' + x[2] + ' 는 ' + x[1] + ' 손으로만'); ok(EN.words.includes(x[2]), x[2] + ' 는 연습 단어에 있는 말'); });
    /* 같은 키의 한글·영문 짝 */
    each(/data-q="([^"]*)">([A-Z])</g, (x) => { seen.q++; eq(H.K2Q[x[1]].toUpperCase(), x[2], pg + ' ' + x[1] + ' 의 영문 자리'); });
    /* 글에 나온 기본 자리 단어가 정말 그 줄만으로 쳐지는가 */
    if (pg === 'ko/guide/dubeolsik-jari') ['어머니', '나라', '호랑이'].forEach((w) => { ok(src.includes(w) && H.keyStream(w).every((k) => LES.list.ko[0].allowed.includes(k)), w + ' 는 기본 자리만으로'); });
    if (pg === 'guide/touch-typing-home-row') ['glass', 'salad', 'flash'].forEach((w) => { ok(src.includes(w) && H.keyStream(w).every((k) => LES.list.en[0].allowed.includes(k)), w + ' is home row only'); });
  }
  ok(seen.st >= 11 && seen.pm >= 6 && seen.wpm >= 10 && seen.acc >= 6 && seen.ok === 1 && seen.ime === 4 && seen.finger === 16 && seen.hand === 10 && seen.q === 9, '표시한 예시 수: ' + JSON.stringify(seen));
  /* 글에 적은 사례를 한 판으로 돌려 본다 */
  const type = (target, typed) => { const s = new TJ.Session(target); let v = ''; Array.from(typed).forEach((ch, i) => { v = ch === '\b' ? v.slice(0, -1) : v + ch; s.update(v, i * 100); }); return s; };
  let r = TJ.report(type('hello world', 'hellp world').finish(6000));
  eq([r.wpm, r.grossWpm, r.accuracy, r.chars, r.typed].join(','), '20,22,91,10,11', '영어 글: 틀리고 안 고친 사례');
  r = TJ.report(type('hello world', 'hellp\bo world').finish(6000));
  eq([r.wpm, r.grossWpm, r.accuracy, r.chars, r.typed].join(','), '22,24,92,11,12', '영어 글: 틀렸다 고친 사례');
  r = TJ.report(type('the cat sat on the mat', 'the cat sat on the mat').finish(12000));
  eq([r.wpm, r.grossWpm, r.accuracy].join(','), '22,22,100', '영어 글: 다 맞은 사례');
  const s = new TJ.Session('한글'); stepsFor(['ㅎ', 'ㅏ', 'ㅅ', '\b', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ']).forEach((v, i) => s.update(v, i * 100));
  r = TJ.report(s.finish(3000));
  eq([r.typed, r.ok, r.accuracy, r.strokes].join(','), '7,6,86,6', "한국어 글: '한글'을 치다 고친 사례(누른 7, 맞은 6, 86%, 타수는 그대로 6)");
  /* 소문자만 칠 때 타수 ÷ 5 = WPM */
  const lower = 'the quick fox ran over a lazy dog and then sat', sl = type(lower, lower).finish(lower.length * 200), rl = TJ.report(sl);
  eq(rl.strokes, rl.chars, '소문자·띄어쓰기만이면 타수 = 글자 수'); eq(rl.speed, rl.wpm * 5, '그때 타수 ÷ 5 = WPM');
});

/* ---- 18. '누른 키'는 글쇠 흐름으로 센다: 받침이 넘어갈 때 입력칸 값이 두 번 바뀌어도, 앞 글자를 지우고 다시 넣는 기기에서도 한 번만 ---- */
/* 실제 입력기처럼 값이 바뀌는 차례를 낸다: 글쇠 하나에 값이 한 번 또는 두 번(확정 값 → 새 조합 값) 바뀐다 */
class Ime2 extends Ime {
  constructor() { super(); this.mid = []; }
  commit() { super.commit(); this.mid.push(this.done); }
  key2(k) { const before = this.value(); this.mid = []; const v = this.key(k); return this.mid.filter((m) => m !== v && m !== before).concat([v]); }
}
const twoStep = (keys) => { const ime = new Ime2(); return keys.map((k) => ime.key2(k)); };
/* 아이폰식: 조합 중인 글자가 있으면 그 글자를 지운 값이 먼저 오고, 합친 글이 다시 들어온다. three = 지운 값 → 확정된 글 → 새 글 세 단계로 */
const delInsert = (keys, three) => {
  const ime = new Ime2(); let prev = '';
  return keys.map((k) => {
    const composing = ime.cur() !== '', steps = ime.key2(k), v = steps[steps.length - 1], out = [];
    if (composing && isC(k) + isV(k) > 0) { out.push(Array.from(prev).slice(0, -1).join('')); if (three && steps.length > 1) out.push(steps[0]); }
    out.push(v); prev = v;
    return out;
  });
};
const flowLen = (v) => H.keyStream(v.replace(/[ \n]/g, '')).length + (v.match(/[ \n]/g) || []).length;
function feedSteps(target, steps, opt, info) {
  const s = new TJ.Session(target, opt); let t = 1000, bad = 0, shrink = 0, prev = '';
  steps.forEach((vs) => { t += 100; vs.forEach((v) => { const r = s.update(v, t, info); if (r.st.includes(BAD) || s.typedKeys !== s.okKeys) bad++; if (flowLen(v) < flowLen(prev)) shrink++; prev = v; }); });
  return { s, bad, shrink, t };
}
run('keyflow', () => {
  /* 기준값: 파이썬 unicodedata 로 따로 센 '실제 키 수'와 '받침이 넘어가는 횟수'(tests/gen_keys.py) */
  const per = REF.keys.per.split(';').map((x) => x.split(',').map(Number));
  eq(sha(ALL_KO.join('\n')), REF.keys.sha, '기준값을 만든 연습 글과 지금 연습 글이 같다(다르면 python3 tests/gen_keys.py)');
  eq(per.length, ALL_KO.length, '기준값 줄 수');
  /* 손으로 센 사례: '벗' → '버' → '버스' */
  let s = new TJ.Session('버스'); ['ㅂ', '버', '벗', '버', '버스'].forEach((v, i) => s.update(v, i * 100));
  eq(s.typedKeys + ':' + s.okKeys + ':' + s.typedStrokes, '4:4:4', "'버스' = 네 글쇠(받침이 넘어가도 ㅅ은 한 번)");
  eq(s.byKey['ㅅ'].hit, 1, 'ㅅ 맞은 횟수 1');
  /* 틀린 자음이 받침으로 붙었다가 넘어가도 틀린 기록은 한 번: '가르면'의 ㄹ 자리에 ㅅ */
  let f = feedSteps('가르면', twoStep(['ㄱ', 'ㅏ', 'ㅅ', 'ㅡ', 'ㅁ', 'ㅕ', 'ㄴ']));
  let res = f.s.finish(700);
  eq(res.typedKeys + ':' + res.okKeys, '7:6', "'가스면': 누른 7, 맞은 6"); eq(res.missed.map((m) => m.key + m.miss).join(','), 'ㄹ1', '틀린 키는 ㄹ에 한 번만');
  eq(res.pairs.map((p) => p.want + p.got + p.n).join(','), 'ㄹㅅ1', '무엇을 무엇으로 쳤는지도 한 번');
  near(res.accuracy, 600 / 7, '정확도 = 6 ÷ 7');
  /* 세 군데를 그렇게 틀리면 세 번(평가에서 여섯 번으로 나오던 사례) */
  f = feedSteps('나라 가르면 다리', twoStep(H.keyStream('나사 가스면 다시')));
  res = f.s.finish(2000);
  eq(res.missed.map((m) => m.key + m.miss).join(','), 'ㄹ3', '세 번 틀리면 세 번'); eq(res.typedKeys + ':' + res.okKeys, '17:14', '누른 17(4 + 1 + 7 + 1 + 4), 맞은 14');
  /* 연습 글 전부(한국어 576줄): 실제 입력 순서(받침이 넘어갈 때 두 단계)로 넣어도 누른 키 = 실제 키 수 */
  let over = 0, keysAll = 0, movesAll = 0, bad = 0, timed = 0;
  ALL_KO.forEach((text, i) => {
    const keys = H.keyStream(text), steps = twoStep(keys);
    eq(keys.length, per[i][0], '"' + text + '" 키 수(파이썬 unicodedata)');
    for (const info of [undefined, { del: false }]) {
      const g = feedSteps(text, steps, undefined, info), r = g.s.finish(g.t);
      over += Math.abs(r.typedKeys - per[i][0]); bad += g.bad;
      ok(r.typedKeys === per[i][0] && r.okKeys === per[i][0] && r.accuracy === 100 && r.missed.length === 0 && r.strokes === H.strokeCount(text) && r.typedStrokes === H.strokeCount(text) && g.bad === 0,
        '"' + text + '" 누른 키 ' + r.typedKeys + '/' + per[i][0] + ', 맞은 ' + r.okKeys + ', 타수 ' + r.strokes + ', 틀림 표시 ' + g.bad);
      if (!info) { keysAll += r.typedKeys; movesAll += g.shrink; eq(g.shrink, per[i][1], '"' + text + '" 받침이 넘어간 횟수(입력기 흉내 = 파이썬)'); timed += Object.values(g.s.byKey).reduce((a, b) => a + b.n, 0) - (keys.length - 1); }
    }
  });
  eq(keysAll + ':' + movesAll, REF.keys.total + ':' + REF.keys.moves, '전체 누른 키 = 실제 키 수, 받침이 넘어간 횟수 = 기준값');
  eq(over + ':' + bad, '0:0', '과다·과소 0, 틀림 표시 0');
  eq(timed, 0, '넘어간 키도 앞 키와의 간격을 잰다(첫 키만 빼고 전부)');
  /* 아이폰식(앞 글자를 지우고 합친 글자를 다시 넣음): 터치(글자 단위), 자판(글쇠 단위) 어느 쪽으로 받아도 같다 */
  let ios = 0, n = 0;
  ALL_KO.concat([SENT.slice(0, 6).join('\n')]).forEach((text, i) => {
    const keys = H.keyStream(text), want = keys.length;
    for (const [mode, info, three] of [['char', undefined, false], ['char', undefined, true], ['key', undefined, false], ['key', { del: false }, false], ['key', { del: false }, true]]) {
      if (i % 4 && mode === 'key') continue;   /* 자판 쪽은 넷에 하나만(시간) */
      const g = feedSteps(text, delInsert(keys, three), { mode }, info), r = g.s.finish(g.t);
      n++; if (r.typedKeys !== want || r.okKeys !== want || r.strokes !== H.strokeCount(text) || g.bad) { ios++; ok(false, '아이폰식 ' + mode + (three ? ' 세 단계' : '') + ' "' + text + '" 누른 키 ' + r.typedKeys + '/' + want + ', 틀림 표시 ' + g.bad); }
    }
  });
  ok(ios === 0 && n > 1200, '아이폰식 입력 ' + n + '판에서 누른 키가 다른 판 ' + ios);
  /* 영어는 값이 한 번씩만 바뀐다 */
  EN.sentences.slice(0, 40).forEach((text) => { const g = feedSteps(text, twoStep(Array.from(text))), r = g.s.finish(g.t); ok(r.typedKeys === text.length && r.okKeys === text.length, '영어 "' + text + '" 누른 키 ' + r.typedKeys); });
  /* 정말 지우고 같은 키를 다시 치면 두 번 누른 것이다(자판): 지우기 키를 본 경우(del)와 값만 본 경우 둘 다 */
  for (const info of [true, undefined]) {
    s = new TJ.Session('버스');
    [['ㅂ'], ['버'], ['벗'], ['버', info], ['벗'], ['버'], ['버스']].forEach(([v, d], i) => s.update(v, i * 100, d === undefined ? undefined : { del: d }));
    eq(s.typedKeys + ':' + s.okKeys + ':' + s.byKey['ㅅ'].hit, '5:5:2', '지우고 다시 친 ㅅ은 두 번(del ' + info + ')');
  }
  /* 지우기 키를 봤으면 그 뒤에 온 '지웠다 다시 넣기'와 헷갈리지 않는다: 벗 → (지우기) 버 → 벗 → 버 → 버스 → (지우기 두 번) 버 → 버스 */
  s = new TJ.Session('버스');
  [['ㅂ', false], ['버', false], ['벗', false], ['버', true], ['벗', false], ['버', false], ['버스', false], ['버ㅅ', true], ['버', true], ['벗', false], ['버', false], ['버스', false]].forEach(([v, d], i) => s.update(v, i * 100, { del: d }));
  eq(s.typedKeys + ':' + s.okKeys, '7:7', 'ㅂㅓㅅ + ㅅ + ㅡ + ㅅ + ㅡ = 7');
  /* 지우기 키를 본 뒤에는 꼬리를 바로 버린다: 그 뒤에 무엇이 오든 지운 자리는 새로 누른 키다. 지우기 키가 아니었다고 알려 오면(del false) 꼬리를 그대로 둔다 */
  s = new TJ.Session('abcd'); s.update('abc', 0, { del: false }); s.update('ab', 100, { del: true }); s.update('abcd', 200, { del: false });
  eq(s.typedKeys, 5, '지우기 키로 지운 c 는 다시 오면 새 키(a b c c d)');
  s = new TJ.Session('abcd'); s.update('abc', 0, { del: false }); s.update('ab', 100, { del: false }); s.update('a', 150, { del: false }); s.update('ab', 200, { del: false }); s.update('abc', 250, { del: false }); s.update('abcd', 300, { del: false });
  eq(s.typedKeys, 4, '입력기가 지웠다가 한 글자씩 다시 넣어도(지우기 키 없음) 네 키');
  /* 틀린 키를 지우고 맞게 치면: 누른 키에 둘 다, 틀린 기록은 한 번(값만 본 경우와 지우기 키를 본 경우가 같다) */
  for (const d of [undefined, true]) {
    s = new TJ.Session('한글');
    [['ㅎ'], ['하'], ['핫'], ['하', d], ['한'], ['한ㄱ'], ['한그'], ['한글']].forEach(([v, x], i) => s.update(v, i * 100, x === undefined ? undefined : { del: x }));
    res = s.finish(800);
    eq(res.typedKeys + ':' + res.okKeys + ':' + res.missed.map((m) => m.key + m.miss).join(','), '7:6:ㄴ1', '고친 키: 누른 7, 맞은 6, ㄴ 1번');
  }
  /* 터치 자판은 지우기와 바꿔 넣기를 가릴 수 없어 같은 자리의 같은 키를 한 번만 센다(그렇게 밝혀 둔다) */
  s = new TJ.Session('한글', { mode: 'char' });
  ['ㅎ', '하', '한', '한ㄱ', '한', '한ㄱ', '한그', '한글'].forEach((v, i) => s.update(v, i * 100));
  res = s.finish(800);
  eq(res.typedKeys + ':' + res.okKeys, '6:6', '터치: 지웠다 다시 친 같은 글자는 한 번');
  /* 받침이 넘어가는 중간 값에서 시간이 끝나도 이미 누른 키는 누른 키다 */
  s = new TJ.Session('버스'); ['ㅂ', '버', '벗', '버'].forEach((v, i) => s.update(v, i * 100));
  res = s.finish(400);
  eq(res.typedKeys + ':' + res.strokes, '3:2', "'버'에서 끝: 누른 3, 남은 글의 타수 2");
  /* 한/영 안내 구간과 같이: 반대 자판으로 친 글이 지워졌다 다시 들어와도 세지 않는다 */
  f = feedSteps('the cat', delInsert(['ㅅ', 'ㅗ', 'ㄷ', ' ', 'ㅊ', 'ㅁ', 'ㅅ']), { mode: 'char' });
  eq(f.s.typedKeys + ':' + f.s.cmp.hint, '0:en', '터치에서 반대 자판: 세지 않는다');
});

/* ---- 19. 터치 자판: 조합이 끝나기 전의 글자는 어느 것도 판정하지 않는다(천지인의 'ㅇㆍ' 같은 중간 모양) ---- */
/* 천지인으로 글자를 만들 때 조합 칸에 차례로 보이는 모양(평가자의 흉내와 같은 규칙: 자음은 한 번에, 모음은 단계별, 아래아가 먼저 오면 'ㅎㆍ'처럼 두 글자) */
const CJI = { 'ㅏ': ['ㅣ', 'ㅏ'], 'ㅓ': ['ㆍ', 'ㅓ'], 'ㅗ': ['ㆍ', 'ㅗ'], 'ㅜ': ['ㅡ', 'ㅜ'], 'ㅑ': ['ㅣ', 'ㅏ', 'ㅑ'], 'ㅕ': ['ㆍ', 'ᆢ', 'ㅕ'], 'ㅛ': ['ㆍ', 'ᆢ', 'ㅛ'], 'ㅠ': ['ㅡ', 'ㅜ', 'ㅠ'],
  'ㅐ': ['ㅣ', 'ㅏ', 'ㅐ'], 'ㅔ': ['ㆍ', 'ㅓ', 'ㅔ'], 'ㅡ': ['ㅡ'], 'ㅣ': ['ㅣ'], 'ㅘ': ['ㆍ', 'ㅗ', 'ㅚ', 'ㅘ'], 'ㅝ': ['ㅡ', 'ㅜ', 'ㅝ'], 'ㅢ': ['ㅡ', 'ㅢ'], 'ㅚ': ['ㆍ', 'ㅗ', 'ㅚ'], 'ㅟ': ['ㅡ', 'ㅜ', 'ㅟ'],
  'ㅙ': ['ㆍ', 'ㅗ', 'ㅚ', 'ㅘ', 'ㅙ'], 'ㅞ': ['ㅡ', 'ㅜ', 'ㅝ', 'ㅞ'], 'ㅒ': ['ㅣ', 'ㅏ', 'ㅑ', 'ㅒ'], 'ㅖ': ['ㆍ', 'ᆢ', 'ㅕ', 'ㅖ'] };
function cjiSteps(ch) {
  const c = ch.charCodeAt(0) - 0xAC00;
  if (c < 0 || c > 11171) return null;
  const cho = C19[Math.floor(c / 588)], vi = Math.floor(c / 28) % 21, fi = c % 28, syl = (v, f) => String.fromCharCode(0xAC00 + (C19.indexOf(cho) * 21 + V21.indexOf(v)) * 28 + f);
  const out = [cho];
  CJI[V21[vi]].forEach((m) => out.push(V21.includes(m) ? syl(m, 0) : cho + m));
  if (fi) { const f = F28[fi], two = Object.keys(FF).find((k) => FF[k] === f); if (two) out.push(syl(V21[vi], F28.indexOf(two[0]))); out.push(ch); }
  return out;
}
/* 글 전체를 천지인 흉내로 넣는다. withHold = 입력기가 조합 중인 문자열을 알려 준 경우 */
function cjiRun(text, withHold) {
  const s = new TJ.Session(text, { mode: 'char' }); let done = '', t = 0, bad = 0, steps = 0;
  for (const ch of Array.from(text)) {
    const st = cjiSteps(ch);
    if (!st) { done += ch; t += 200; const r = s.update(done, t); if (r.st.includes(BAD)) bad++; steps++; continue; }
    for (const m of st) { t += 200; const r = s.update(done + m, t, withHold ? { hold: Array.from(m).length } : undefined); if (r.st.includes(BAD)) bad++; steps++; }
    done += ch; const r2 = s.update(done, t); if (r2.st.includes(BAD)) bad++;
  }
  return { s, bad, steps, t };
}
run('touch2', () => {
  const feed = (target, values, hold) => { const s = new TJ.Session(target, { mode: 'char' }); const seen = values.map((v, i) => s.update(v, i * 300, hold ? { hold: hold[i] } : undefined).st.join('')); return { s, seen }; };
  /* '에' = ㅇ → ㅇㆍ → 어 → 에 */
  let p = feed('에요', ['ㅇ', 'ㅇㆍ', '어', '에', '에ㅇ', '에ㅇㆍ', '에ㅇᆢ', '에요']);
  eq(p.seen.join(' '), '30 30 30 30 13 13 13 13', "'ㅇㆍ'·'ㅇᆢ' 가 보이는 동안 판정을 미룬다");
  eq(p.s.typedKeys, 2, "그동안 센 키는 끝난 글자 '에'의 두 키뿐");
  let res = p.s.finish(2400);
  eq(res.typedKeys + ':' + res.okKeys + ':' + res.accuracy + ':' + res.missed.length, '4:4:100:0', '다 치면 4키, 정확도 100, 틀린 키 없음');
  /* 호환 자모가 아닌 아래아(U+119E, U+11A2)와 가운뎃점도 같다 */
  for (const mid of ['ㆍ', 'ᆞ', 'ᆢ', '·', '‥']) eq(view('어', 'ㅇ' + mid, { lenient: true }).st.join(''), '3', '중간 글자 U+' + mid.charCodeAt(0).toString(16));
  eq(TJ.heldTail(Array.from('가ㅇㆍ'), 0) + ':' + TJ.heldTail(Array.from('가ㅇㆍㆍ'), 0) + ':' + TJ.heldTail(Array.from('가 ㆍ'), 0) + ':' + TJ.heldTail(Array.from('가'), 0) + ':' + TJ.heldTail(Array.from('가.'), 0) + ':' + TJ.heldTail([], 0), '2:3:1:1:0:0', '미룰 글자 수');
  eq(TJ.heldTail(Array.from('한글'), 2) + ':' + TJ.heldTail(Array.from('한글'), 9) + ':' + TJ.heldTail(Array.from('a글'), 2) + ':' + TJ.heldTail(Array.from('cat'), 3), '2:2:1:0', '조합 중인 문자열이 한글이면 통째로(한글이 아닌 글자는 미루지 않는다)');
  /* 조합 칸에 글자가 둘 이상 있어도(자판 앱이 단어를 통째로 조합 중일 때) 조합이 끝날 때까지 판정하지 않는다 */
  p = feed('한글', ['ㅎ', '하', '한', '한ㄱ', '한그', '한글'], [1, 1, 1, 2, 2, 2]);
  eq(p.seen.join(' '), '30 30 30 30 30 30', '조합 중인 두 글자 모두 판정을 미룬다'); eq(p.s.typedKeys, 0, '아직 센 키 없음');
  res = p.s.finish(1800);
  eq(res.typedKeys + ':' + res.okKeys + ':' + res.strokes, '6:6:6', '끝나면 여섯 키');
  /* 틀리게 쓴 글자는 조합이 끝난 뒤(다음 글자가 온 뒤) 틀림으로 */
  p = feed('에요', ['ㅇ', 'ㅇㆍ', '어', '어ㅇ']);
  eq(p.seen.join(' '), '30 30 30 23', "'어'는 다음 글자가 온 뒤에 틀림"); eq(p.s.byKey['ㅔ'].miss, 1, '쳐야 했던 키 ㅔ에 적힌다');
  /* 영어는 조합 중이라고 알려 와도 바로 판정한다(영어 자판의 단어 단위 조합) */
  p = feed('cat', ['c', 'cx'], [1, 2]); eq(p.seen.join(' '), '100 120', '영어는 바로');
  /* 끝나는 순간 중간 모양이 남아 있으면: 맞게 이어지는 키만 센다(아래아는 키가 아니다) */
  p = feed('어', ['ㅇ', 'ㅇㆍ']); res = p.s.finish(600);
  eq(res.typedKeys + ':' + res.strokes + ':' + res.badChars, '1:1:0', "'ㅇㆍ'에서 끝: ㅇ 하나만");
  /* 연습 글 전부를 천지인 흉내로: 틀림 표시 0, 누른 키 = 두벌식으로 환산한 키 수(파이썬 기준값), 정확도 100 */
  const per = REF.keys.per.split(';').map((x) => x.split(',').map(Number));
  let bad = 0, wrong = 0, steps = 0;
  ALL_KO.forEach((text, i) => {
    for (const hold of [false, true]) {
      if (hold && i % 3) continue;
      const g = cjiRun(text, hold), r = g.s.finish(g.t);
      bad += g.bad; steps += g.steps;
      if (r.typedKeys !== per[i][0] || r.okKeys !== per[i][0] || r.accuracy !== 100 || r.missed.length || r.strokes !== H.strokeCount(text)) { wrong++; ok(false, '천지인 흉내 "' + text + '" 누른 키 ' + r.typedKeys + '/' + per[i][0] + ' 틀린 키 ' + r.missed.map((m) => m.key).join('')); }
    }
  });
  ok(bad === 0 && wrong === 0 && steps > 20000, '천지인 흉내 ' + steps + '단계: 틀림 표시 ' + bad + '번, 숫자가 다른 글 ' + wrong);
  /* 흉내가 정말 중간 모양을 내는지(시험이 헛돌지 않게) */
  eq(cjiSteps('에').join(' ') + ' / ' + cjiSteps('려').join(' ') + ' / ' + cjiSteps('값').join(' '), 'ㅇ ㅇㆍ 어 에 / ㄹ ㄹㆍ ㄹᆢ 려 / ㄱ 기 가 갑 값', '천지인 흉내의 중간 모양');
});

/* ---- 20. 한/영(Caps Lock) 안내는 낱말 단위: 띄어쓰기를 넘어서도 이어지고, 그 구간은 세지 않는다 ---- */
run('hintword', () => {
  const hint = (t, i) => TJ.layoutHint(TJ.prepare(t).chars, H.toChars(i));
  const zone = (t, i) => { const z = TJ.layoutZone(TJ.prepare(t).chars, H.toChars(i)); return z ? z.hint + z.from : null; };
  eq(zone('turn done which', '셔구 '), 'en0', '띄어쓰기를 친 직후에도 안내'); eq(zone('turn done which', '셔구 ㅇ'), 'en0', '다음 낱말 첫 키'); eq(zone('turn done which', '셔구 애ㅜㄷ 조ㅑ'), 'en0', '세 낱말째');
  eq(zone('한글 타자 연습', 'gksrmf xk'), 'ko0', '한글 글을 영문 자판으로 두 낱말'); eq(zone('한글 타자 연습', '한글 xkwk d'), 'ko3', '둘째 낱말부터면 거기서부터');
  eq(zone('한글 타자', '한r'), 'ko1', '낱말 가운데서 바뀌면 그 자리부터'); eq(zone('the cat sat', 'thㄷ ㅊㅁ'), 'en2', '낱말 가운데서 바뀐 뒤 다음 낱말까지');
  eq(zone('hello world', 'HELLO W'), 'caps0', 'Caps Lock: 다음 낱말은 첫 키부터'); eq(zone('a cat', 'A C'), 'caps0', '한 글자 낱말 둘이면 뒤집힌 글자가 둘');
  eq(zone('Hello there', 'hELLO T'), 'caps0', 'Shift 를 누른 자리는 소문자로 뒤집힌다'); eq(zone('Hello there', 'HELLO T'), 'caps1', 'Shift 자리가 대문자로 남는 기기');
  eq(hint('a cat', 'A '), null, '뒤집힌 글자 하나로는 알리지 않는다'); eq(hint('hello', 'Hel'), null, '첫 글자만 대문자는 그냥 틀린 글자'); eq(hint('it is', 'It Is'), null, '낱말마다 첫 글자만 대문자');
  eq(zone('at 7:45, so', 'ㅁㅅ 7'), 'en0', '숫자·기호만 든 낱말은 자판과 상관없다(안내를 이어 간다)'); eq(zone('at 7:45, so', 'ㅁㅅ 7:45, 내'), 'en0', '그 뒤 낱말까지 한 구간');
  eq(hint('at 7:45, so', 'at 7:4'), null, '맞게 친 숫자는 안내 없음'); eq(zone('office. Paper', 'ㅐㄹ럋ㄷ. ㅖ메ㄷㄱ'), 'en0', '낱말 안의 문장부호, Shift 를 누른 글자');
  /* 그냥 틀린 글자는 낱말이 몇 개여도 알리지 않는다 */
  eq(hint('hello world again', 'jrxxp ept;f qsdyb'), null, '영어 오타'); eq(hint('한글 타자 연습', '핫글 차자 연슥'), null, '한글 오타'); eq(hint('the cat', 'the car'), null, '맞는 자판의 오타');
  eq(hint('the cat', '솓 ㅊㅁㄱ'), null, "반대 자판이어도 목표와 안 맞으면('car') 안내 없음"); eq(hint('the cat', '솓ㄱ '), null, '닫은 낱말은 끝까지 맞아야 한다'); eq(hint('there is', '소 '), null, "덜 치고 닫은 낱말('소' = 'th')은 안내하지 않는다"); eq(hint('there is', '소'), 'en', '치는 중인 낱말은 앞부분만 맞아도 안내');
  eq(zone('한글 타자', 'gks xk'), 'ko4', "덜 치고 넘어간 낱말('gks' = '한')은 구간에 넣지 않는다(다음 낱말부터)"); eq(hint('한글 타자', 'gks '), null, '덜 치고 넘어간 낱말에서는 안내가 꺼진다'); eq(hint('한글', 'gksrmfx'), null, '목표보다 더 친 글자');
  eq(zone('the cat sat', '솓 ㅊㅁㄱ ㄴㅁ'), 'en6', '틀린 낱말 뒤에 다시 반대 자판이면 그 낱말부터');
  /* 한 판으로: 영어 글을 한글 자판으로 40키(평가의 사례) */
  const en = 'turn done which jump could there land already';
  const jam = Array.from(en).map((c) => H.Q2K[c] || c);
  let s = new TJ.Session(en), hints = [];
  twoStep(jam).forEach((vs, i) => vs.forEach((v) => hints.push(s.update(v, 1000 + i * 150).hint)));
  ok(hints.every((h) => h === 'en'), '영어 글 + 한글 자판: 안내가 끝까지 떠 있다 ' + hints.filter((h) => h !== 'en').length + '/' + hints.length);
  eq(s.typedKeys + ':' + s.okKeys + ':' + s.skippedKeys, '0:0:' + jam.length, '그동안 친 키는 하나도 세지 않는다');
  eq(Object.keys(s.byKey).filter((k) => s.byKey[k].miss || s.byKey[k].hit).length + ':' + Object.keys(s.pairs).length, '0:0', '틀린 키 기록에도 안 남는다');
  /* 지우고 영어로 다시 치면 정확도 100 */
  let v = s.value; while (v) { v = Array.from(v).slice(0, -1).join(''); s.update(v, 9000, { del: true }); }
  eq(s.cmp.hint, null, '지우면 안내가 사라진다');
  Array.from(en).forEach((c, i) => s.update(en.slice(0, i + 1), 10000 + i * 100));
  let res = s.finish(15000);
  eq(res.typedKeys + ':' + res.okKeys + ':' + res.accuracy + ':' + res.skippedKeys, en.length + ':' + en.length + ':100:' + jam.length, '고쳐 친 뒤: 정확도 100, 세지 않은 키는 그대로');
  /* 한글 글 + 영문 자판: 첫 낱말은 맞게 치고 둘째 낱말부터 */
  s = new TJ.Session('한글 타자 연습'); hints = [];
  ['ㅎ', '하', '한', '한ㄱ', '한그', '한글', '한글 '].forEach((x, i) => s.update(x, i * 100));
  Array.from('xkwk dus').forEach((c, i, a) => hints.push(s.update('한글 ' + a.slice(0, i + 1).join(''), 1000 + i * 100).hint));
  eq(hints.join(','), 'ko,ko,ko,ko,ko,ko,ko,ko', '둘째 낱말부터 안내'); eq(s.typedKeys + ':' + s.okKeys + ':' + s.skippedKeys, '7:7:8', '앞의 일곱 키만 센다');
  /* Caps Lock: 첫 낱말의 첫 키만 잠깐 틀림으로 셌다가 되돌리고, 다음 낱말은 첫 키부터 안내 */
  s = new TJ.Session('hello world again'); hints = [];
  Array.from('HELLO WORLD AGAIN').forEach((c, i, a) => hints.push(s.update(a.slice(0, i + 1).join(''), i * 100).hint));
  eq(hints[0] + ':' + hints.slice(1).every((h) => h === 'caps'), 'null:true', '둘째 키부터 끝까지 Caps Lock 안내(둘째·셋째 낱말은 첫 키부터)');
  eq(s.typedKeys + ':' + s.okKeys + ':' + s.skippedKeys + ':' + (s.byKey.h ? s.byKey.h.miss : 0), '0:0:17:0', '전부 세지 않는다(처음에 센 한 키도 되돌림)');
  /* 진짜 오타 여덟 개를 이어 쳐도 안내가 잘못 뜨지 않고 전부 틀린 키로 센다 */
  s = new TJ.Session('typing is fun'); hints = [];
  Array.from('yuoomh').forEach((c, i, a) => hints.push(s.update(a.slice(0, i + 1).join(''), i * 100).hint));
  eq(hints.join(','), ',,,,,', '오타에는 안내 없음'); eq(s.typedKeys + ':' + s.okKeys + ':' + s.skippedKeys, '6:0:0', '여섯 키 모두 틀린 키');
  /* 반대 자판으로 치다가 낱말 하나를 목표와 다르게 치면: 그 낱말에서 안내가 꺼지고, 다음 낱말을 다시 반대 자판으로 치면 그 낱말부터 다시 */
  s = new TJ.Session('the cat sat'); hints = [];
  ['ㅅ', '소', '솓', '솓 ', '솓 ㅊ', '솓 ㅊㅁ', '솓 ㅊㅁㄱ', '솓 ㅊㅁㄱ ', '솓 ㅊㅁㄱ ㄴ', '솓 ㅊㅁㄱ ㄴㅁ'].forEach((x, i) => hints.push(s.update(x, i * 100).hint || '-'));
  eq(hints.join(','), 'en,en,en,en,en,en,-,-,en,en', '안 맞는 낱말에서 꺼지고 다음 낱말에서 다시');
  eq(s.typedKeys + ':' + s.skippedKeys, '2:8', "안 맞은 키(ㄱ)와 그 뒤 띄어쓰기만 센다");
});

/* ---- 21. 연습 글(늘린 것)·최근 문장 피하기·총 속도·통과 기준 ---- */
run('more', () => {
  const P = TJ.pick;
  /* 영어 문장 200개 이상, 팬그램 20개 이상(26자 전부). 팬그램과 문장은 겹치지 않는다 */
  ok(EN.sentences.length >= 200, '영어 문장 ' + EN.sentences.length + '개(200개 이상)');
  ok(EN.pangrams.length >= 20, '팬그램 ' + EN.pangrams.length + '개(20개 이상)');
  EN.pangrams.forEach((t) => { eq(new Set(t.toLowerCase().replace(/[^a-z]/g, '')).size, 26, '팬그램에 26자 모두: ' + t); ok(/^[A-Z]/.test(t) && /[.?!]$/.test(t) && t.length >= 30 && t.length <= 85, '팬그램 꼴: ' + t); ok(!EN.sentences.includes(t), '문장 목록과 겹치지 않는다: ' + t); });
  ok(EN.sentences.every((t) => new Set(t.toLowerCase().replace(/[^a-z]/g, '')).size < 26), '문장 목록에는 팬그램이 없다(팬그램은 따로 둔다)');
  /* 겹침 검사: 글자만 남긴 꼴이 같은 문장, 한 문장이 다른 문장에 통째로 들어 있는 경우, 앞 다섯 단어가 같은 경우가 없다 */
  for (const [name, list] of [['영어 문장', EN.sentences.concat(EN.pangrams)], ['한국어 문장', SENT.concat(KO.proverbs)]]) {
    const norm = list.map((t) => t.toLowerCase().replace(/[^a-z0-9가-힣]/g, ''));
    eq(new Set(norm).size, list.length, name + ' 글자만 남긴 꼴이 겹치지 않는다');
    const inside = list.filter((t, i) => norm.some((o, j) => j !== i && o.length > norm[i].length && o.includes(norm[i])));
    eq(inside.join(' | '), '', name + ' 다른 문장에 통째로 든 문장');
    const head = list.map((t) => t.toLowerCase().split(' ').slice(0, 5).join(' ')).filter((h) => h.split(' ').length === 5);
    eq(head.length - new Set(head).size, 0, name + ' 앞 다섯 단어가 같은 문장');
  }
  ok(!/  |[^\x20-\x7e]/.test(EN.sentences.concat(EN.pangrams).join('')), '영어 글: 겹 띄어쓰기·자판에 없는 글자 없음');
  ok(EN.sentences.concat(EN.pangrams).every((t) => !/\b(\w+) \1\b/i.test(t) && !/ [,.?!;:]/.test(t)), '영어 글: 같은 단어 연달아·문장부호 앞 띄어쓰기 없음');
  /* 주제를 옮기고 고친 한국어 문장 */
  ok(!KO.sentences.work.some((t) => /농부|시 한 편|고양이/.test(t)), "'일' 주제에 일과 상관없는 문장이 없다");
  ok(SENT.includes('비 오는 날에는 부침개 부치는 소리가 빗소리와 닮았어요.') && SENT.includes('호박을 얇게 썰어 부침가루를 묻혀 구웠어요.') && SENT.includes('숲속 오솔길에는 짙은 풀 냄새가 가득했어요.'), '고친 문장 셋');
  ok(!SENT.join('').includes('부침 가루') && !SENT.join('').includes('풀냄새') && !SENT.join('').includes('굽는 소리'), '고치기 전 표기가 남아 있지 않다');
  /* 문장 고르기: 최근에 나온 문장(avoid)은 안 나온 문장이 남아 있는 동안 다시 나오지 않는다 */
  const list = EN.sentences;
  const first = P.sentences(list, 330, P.rng(5));
  eq(P.sentences(list, 330, P.rng(5), []).join('|'), first.join('|'), '피할 문장이 없으면 예전과 같은 글(오늘의 글이 바뀌지 않는다)');
  ok(first.join(' ').length >= 330 && first.join(' ').length < 330 + 80, '달라는 길이를 채우고 넘치지 않는다: ' + first.join(' ').length);
  let recent = [], seen = new Set(), rep = 0, rounds = 0;
  for (let r = 0; r < 25; r++) {   /* 30초 판 25번('다른 글'을 25번 누른 평가의 사례) */
    const got = P.sentences(list, 330, P.rng(1000 + r * 7919), recent);
    got.forEach((t) => { if (seen.has(t)) rep++; seen.add(t); });
    eq(new Set(got).size, got.length, r + '번째 판: 한 판 안에서 같은 문장이 되풀이되지 않는다');
    recent = recent.filter((t) => !got.includes(t)).concat(got); rounds++;
  }
  eq(rep, 0, '25판(문장 ' + seen.size + '개) 동안 같은 문장이 다시 나오지 않는다');
  /* 문장이 바닥나면 가장 오래전에 나온 것부터 다시 나온다 */
  const few = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6'];
  eq(P.some(few, 2, P.rng(3), ['a1', 'b2', 'c3', 'd4']).slice().sort().join(','), 'e5,f6', '안 나온 문장 먼저');
  eq(P.some(few, 4, P.rng(3), ['c3', 'a1', 'b2', 'd4']).slice(2).join(','), 'c3,a1', '그다음은 오래전에 나온 순서');
  eq(P.some(few, 3, P.rng(3)).join(','), P.shuffle(few, P.rng(3)).slice(0, 3).join(','), '피할 문장이 없으면 그냥 섞어서 앞에서부터');
  const s2 = P.sentences(few, 17, P.rng(4), ['f6', 'e5', 'd4', 'c3', 'b2', 'a1']);
  eq(s2.slice(0, 6).join(','), 'f6,e5,d4,c3,b2,a1', '전부 나왔던 문장이면 오래된 순서로');
  /* 팬그램만으로 120초 판(1,320자)을 채워도 한 바퀴 안에서는 되풀이되지 않는다 */
  const pg = P.sentences(EN.pangrams, 1320, P.rng(9));
  ok(pg.length <= EN.pangrams.length && new Set(pg).size === pg.length, '팬그램 120초 판: ' + pg.length + '문장, 되풀이 없음');
  /* 총 속도: 틀렸거나 지운 것까지 누른 키 전부(지우기 키는 빼고) */
  let r = TJ.report({ ms: 30000, strokes: 184, okChars: 92, typedKeys: 205, okKeys: 197, typedStrokes: 214 });
  eq(r.grossWpm + ':' + r.grossSpeed + ':' + r.typedStrokes, '82:428:214', '총 WPM = 205 ÷ 5 ÷ 30 × 60 = 82, 총 타수 = 214 ÷ 30 × 60 = 428');
  const type = (target, typed) => { const s = new TJ.Session(target); let v = ''; Array.from(typed).forEach((ch, i) => { const del = ch === '\b'; v = del ? v.slice(0, -1) : v + ch; s.update(v, i * 100, { del }); }); return s; };
  r = TJ.report(type('hello world', 'hellp\bo world').finish(6000));
  eq([r.wpm, r.grossWpm, r.typed, r.typedStrokes, r.grossSpeed].join(','), '22,24,12,12,120', '고친 사례: 순 22, 총 24 WPM, 누른 12타 ÷ 6초 × 60 = 120타/분');
  r = TJ.report(type('Hi there', 'Hi there').finish(3000));
  eq(r.typedStrokes + ':' + r.grossSpeed + ':' + r.speed, '9:180:180', '대문자는 Shift 포함 2타: 다 맞으면 총 타수 = 타수');
  const sk = new TJ.Session('까치'); stepsFor(['ㄱ', '\b', 'ㄲ', 'ㅏ', 'ㅊ', 'ㅣ']).forEach((v, i) => sk.update(v, i * 100, { del: i === 1 }));
  r = TJ.report(sk.finish(2000));
  eq([r.strokes, r.typedStrokes, r.speed, r.grossSpeed, r.typed, r.ok].join(','), '5,6,150,180,5,4', "'까치'를 ㄱ으로 잘못 시작했다 고침: 맞게 친 5타, 누른 6타");
  eq(TJ.report({ ms: 1000, strokes: 0, okChars: 0, typedKeys: 0, okKeys: 0 }).grossSpeed, 0, '아무것도 안 누르면 0');
  /* 조각 글꼴(_dev/font.py 가 만든 것)에 연습 글의 글자가 전부 들어 있다. 연습 글을 고치고 font.py 를 안 돌리면 여기서 알려 준다 */
  const fj = path.join(here, '..', '_dev', 'fonts.json');
  ok(fs.existsSync(fj), '_dev/fonts.json 이 있다(python3 -B _dev/font.py)');
  if (fs.existsSync(fj)) {
    const F = JSON.parse(fs.readFileSync(fj, 'utf8')), ko = new Set(Array.from(F.ko.chars)), en = new Set(Array.from(F.en.chars));
    const lesson = (l) => LES.list[l].flatMap((x) => x.words.concat(x.keys)).join('');
    const koNeed = new Set(Array.from(ALL_KO.join('') + EN.words.join('') + EN.sentences.join('') + EN.pangrams.join('') + lesson('ko') + lesson('en') + 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎㅏㅐㅑㅒㅓㅔㅕㅖㅗㅛㅜㅠㅡㅣ'));
    const enNeed = new Set(Array.from(EN.words.join('') + EN.sentences.join('') + EN.pangrams.join('') + lesson('en')));
    eq([...koNeed].filter((c) => !ko.has(c)).join(''), '', '한국어 조각 글꼴에 없는 연습 글 글자');
    eq([...enNeed].filter((c) => !en.has(c)).join(''), '', '영어 조각 글꼴에 없는 연습 글 글자');
    /* 치는 중에 잠깐 보이는 모양(받침이 붙었다 넘어가는 글자 포함)도 들어 있다: 문장 연습의 '내가 친 글' 줄에 보인다 */
    const mids = new Set(); SENT.concat(KO.proverbs).forEach((t) => stepsFor(H.keyStream(t)).forEach((v) => Array.from(v).forEach((c) => mids.add(c))));
    eq([...mids].filter((c) => !ko.has(c)).join(''), '', '한국어 조각 글꼴에 없는 조합 중 모양(' + mids.size + '자 가운데)');
    ok(fs.existsSync(path.join(here, '..', 'assets', 'fonts', F.ko.file)) && fs.existsSync(path.join(here, '..', 'assets', 'fonts', F.en.file)), '조각 글꼴 파일이 있다');
  }
  /* 통과 기준: 정확도 95% 이상, 반올림하기 전 값으로 */
  eq([LES.pass(37, 39), LES.pass(38, 40), LES.pass(19, 20), LES.pass(36, 39), LES.pass(95, 100), LES.pass(949, 1000), LES.pass(0, 0), LES.pass(20, 20)].join(','), 'false,true,true,false,true,false,false,true', '94.87% 탈락, 95.0% 통과, 92.3% 탈락, 94.9% 탈락');
  r = TJ.report({ ms: 30000, strokes: 37, okChars: 37, typedKeys: 39, okKeys: 37 });
  eq(r.accuracy + ':' + r.accuracy1, '95:94.8', '94.87%: 반올림하면 95, 소수 한 자리(버림)는 94.8');
  eq(TJ.report({ ms: 30000, strokes: 1, okChars: 1, typedKeys: 40, okKeys: 38 }).accuracy1, 95, '95.0%');
});

/* ---- 결과 ---- */
let pass = 0, fail = 0;
const partsOut = [];
for (const [g, t] of Object.entries(tally)) { pass += t.pass; fail += t.fail; partsOut.push(g + ' ' + t.pass + (t.fail ? ' (실패 ' + t.fail + ')' : '')); }
fails.forEach((f) => console.log('실패 ' + f));
console.log(partsOut.join(' / '));
console.log((fail ? '실패 ' + fail + '개, ' : '') + '통과 ' + pass + '개');
process.exit(fail ? 1 : 0);
