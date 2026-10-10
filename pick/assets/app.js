// 공평뽑기 공통 화면 코드: 명단(저장·섞기·정리·지우기와 되돌리기·잠금·확인 코드·링크의 명단), 공유 링크, 결과 이름 맞추기, 최근 결과, 소리, 다른 언어 안내 띠, 루멘랩 칸, 발표 화면.
// 화면 글자는 전부 페이지의 <script id="i18n">(= _dev/content.json)에서 온다. 페이지 언어는 <html lang>이 정한다.
// 이 기기에 저장하는 것(개인정보 처리방침과 같아야 한다): pick.list(명단), pick.history(최근 결과), pick.sound(소리), pick.lang(언어 안내 띠).
import { newSeed, makeRng } from './core/rng.js';
import { parseList, uniqueItems, columns, pickColumn, historyHolds, encodeShare, decodeShare, shareLength, MAX_HASH } from './core/share.js';
import { listCode } from './core/name.js';

export const T = JSON.parse(document.getElementById('i18n').textContent);
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const fmt = (s, o = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const nfmt = (n) => Number(n).toLocaleString(T.lang === 'ko' ? 'ko-KR' : 'en-US');
/** 개수에 따라 문구 고르기: 1개일 때 쓸 글자(key + '1')가 있으면 그것을 쓴다(영어의 단수) */
export const plural = (key, n, o = {}) => fmt(n === 1 && T[key + '1'] ? T[key + '1'] : T[key], { n: nfmt(n), ...o });
export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function button(cls, text, f) {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', f);
  return b;
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장을 막아 둔 브라우저: 그냥 저장 없이 쓴다 */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* 위와 같음 */ } },
};
const LONG_LINK = 4000; // 이보다 긴 링크는 최근 결과에 저장하지 않고, 복사할 때 길다고 알린다
const short = (t, n) => { const a = Array.from(t); return a.length > n ? a.slice(0, n).join('') + '…' : t; };

/** 확인 코드 한 줄: "확인 코드 8명 · 9cfbab72" */
export const codeText = (n, code) => `${plural('count', n)} · ${code}`;
/** 결과 곁의 확인 코드(그 결과를 만든 명단의 것). 명단 칸의 코드와 견줄 수 있다. */
export function setCode(n, code) {
  const e = $('#fp');
  if (e) e.textContent = n ? fmt(T.fp, { count: plural('count', n), code }) : '';
}

/**
 * 큰 결과 이름을 칸에 맞춘다(잘라서 '…'로 끝내지 않는다).
 * 큰 글자부터 한 단계씩 줄여 보며 그 단계의 줄 수 한도 안에 들어가는 첫 단계를 쓴다. 단계마다의 글자 크기와 줄 수는 CSS가 정한다
 * (.result-name[data-fit="k"]의 --lines, 단계 수는 --fits). 마지막 단계에서도 넘치면 3줄에서 줄이고, 아래(full)에 전체 이름을 작은 글자로 한 번 더 보여 준다.
 */
export function fitName(e, text, full) {
  e.textContent = text;
  e.title = text;
  e.classList.remove('clip');
  if (full) { full.hidden = true; full.textContent = ''; }
  const steps = Number(getComputedStyle(e).getPropertyValue('--fits')) || 1;
  for (let k = 0; k < steps; k++) {
    e.dataset.fit = k;
    const cs = getComputedStyle(e);
    const lines = Math.round(e.scrollHeight / parseFloat(cs.lineHeight));
    if (lines <= (Number(cs.getPropertyValue('--lines')) || 1)) return k;
  }
  e.dataset.fit = steps;
  e.classList.add('clip');
  if (full) { full.textContent = text; full.hidden = false; }
  return steps;
}
/** 목록 속 이름(제비뽑기·팀·쪽지·사다리 결과): 줄을 바꿔 다 보여 주고, 길면 글자를 한 단계씩 줄인다. */
export function nameEl(tag, text) {
  const e = el(tag, null, text);
  const n = Array.from(text).length;
  if (n > 24) e.classList.add('xl'); else if (n > 12) e.classList.add('lg');
  return e;
}

// ---------- 명단 ----------
// 명단 칸의 글 = 원래 명단. 저장되는 것도 이것이다(돌림판에서 '빼고 다시'를 눌러도 줄지 않는다).
// 이름은 읽을 때 한 가지 꼴로 고른다(core/name.js: 보이지 않는 글자를 지우고 NFC로). 명단 아래의 '확인 코드'는 그 고른 명단을 짧게 줄인 값이다.
// 링크로 연 명단은 '링크의 명단'으로 따로 둔다: 읽기만 되고 저장하지 않는다. 고치려 하면 내 명단으로 가져올지 묻고,
// 가져오면 그 전에 저장돼 있던 내 명단은 이 화면을 닫기 전까지 되돌릴 수 있다.
export const list = {
  el: $('#names'),
  items: [],
  shared: false,   // 결과 링크에 들어 있던 명단을 보여 주는 중
  asking: false,   // 링크의 명단을 내 명단으로 가져올지 묻는 중
  backup: null,    // 가져오기 전에 저장돼 있던 내 명단 { text }
  locked: false,   // 결과가 나오는 중이라 잠근 상태
  undo: null,      // 방금 지운 명단(다음 변경 전까지 되돌릴 수 있다)
  held: false,     // 방금 지운 명단의 이름이 최근 결과 기록에 남아 있는지
  handlers: [],
  /** 명단 아래에 보여 줄 확인 코드. 사다리는 줄 순서·아래 칸까지 넣은 코드로 바꿔 끼운다 */
  codeOf: (items) => listCode(items),
  init() {
    if (!this.el) return;
    this.box = $('#list');
    this.sample = this.el.dataset.sample || '';
    this.note = $('#listnote');
    this.alt = $('#listalt');
    this.left = $('#histleft');
    this.read();
    this.el.addEventListener('input', () => {
      if (this.shared) { this.el.value = this.sharedText; this.ask(); return; } // 링크의 명단은 가져오기 전에는 바뀌지 않는다
      this.undo = null;
      this.read(true);
    });
    // 링크의 명단을 고치려 할 때(누르기, 글자 치기, 붙여 넣기): 내 명단으로 가져올지 묻는다
    const wantEdit = (e) => { if (this.shared && !this.locked) { if (e.type !== 'click') e.preventDefault(); this.ask(); } };
    ['click', 'paste', 'cut', 'drop'].forEach((t) => this.el.addEventListener(t, wantEdit));
    this.el.addEventListener('keydown', (e) => { if (this.shared && !this.locked && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(e.key))) this.ask(); });
    $('#listclear').addEventListener('click', () => this.clear());
    if (this.alt) this.alt.addEventListener('click', () => this.other());
    $('#shuffle').addEventListener('click', () => {
      const r = makeRng(newSeed()); // 화면에 보이는 순서만 바꾼다(뽑기 결과와는 따로)
      const a = this.items.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = r.below(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
      this.edit(a.join('\n'));
    });
    $('#sortaz').addEventListener('click', () => this.edit(this.items.slice().sort((a, b) => a.localeCompare(b, T.lang, { numeric: true })).join('\n')));
    $('#dedupe').addEventListener('click', () => this.edit(uniqueItems(this.items).join('\n')));
    if (this.left) $('button', this.left).addEventListener('click', () => { recent.clear(); this.held = false; this.paint(); });
  },
  /** 명단 칸의 글을 읽어 명단으로. save면 조금 뒤 이 기기에 저장한다. */
  read(save) {
    const text = this.el.value;
    const p = parseList(text);
    this.items = p.items;
    this.parsed = p;
    clearTimeout(this.timer); // 지우기·링크 명단처럼 저장하지 않는 변경이 오면, 기다리던 저장도 취소한다
    if (save) {
      this.timer = setTimeout(() => { if (text.trim() === '' || text === this.sample) store.del('pick.list'); else store.set('pick.list', text); }, 250);
    }
    this.paint();
    this.handlers.forEach((f) => f(this.items));
  },
  /** 명단 칸 둘레의 글자(인원, 확인 코드, 알림, 안내 줄)를 지금 상태에 맞게 */
  paint() {
    const p = this.parsed;
    const text = this.el.value;
    const c = $('#count');
    if (c) c.textContent = plural('count', p.items.length);
    const code = $('#listcode');
    if (code) code.textContent = p.items.length ? codeText(p.items.length, this.codeOf(p.items)) : '';
    const w = $('#listwarn');
    if (w) {
      w.textContent = '';
      const say = (msg, strong) => { if (w.childNodes.length) w.append(' '); w.append(el('span', strong ? 'w' : '', msg)); };
      if (p.cut) say(plural('warnCut', p.cut), true);
      if (p.over) say(plural('warnOver', p.over), true);
      if (p.dupes) say(plural('warnDupes', p.dupes));
      if (p.hidden) say(plural('warnHidden', p.hidden));
      if (p.split) say(plural('warnSplit', p.items.length));
      if (p.tabs >= 2 && p.tabs * 2 >= p.items.length) { // 엑셀에서 여러 칸을 같이 붙여 넣은 것으로 보일 때: 어느 칸을 쓸지 고르게 한다
        say(T.warnTabs);
        const cols = columns(text);
        const box = el('span', 'cols');
        // 번호뿐인 칸(1, 2, 3 …)은 뒤로 보낸다: 이름이 든 칸이 먼저 보이게
        for (const col of cols.filter((x) => !x.numeric).concat(cols.filter((x) => x.numeric)).slice(0, 6)) {
          const b = button('btn btn-sm', fmt(T.colPick, { k: col.index + 1, sample: col.sample.map((v) => short(v, 8)).join(', ') + (col.count > col.sample.length ? ' …' : '') }), () => this.edit(pickColumn(this.el.value, col.index)));
          b.disabled = this.locked;
          box.append(b);
        }
        w.append(box);
      }
    }
    const mode = this.locked ? 'locked' : this.undo ? 'cleared' : this.asking ? 'ask' : this.shared ? 'shared' : this.backup ? 'imported' : text === this.sample ? 'sample' : 'own';
    this.note.dataset.mode = mode;
    this.box.classList.toggle('shared', this.shared);
    const hasMine = store.get('pick.list') !== null;
    this.note.firstElementChild.textContent = { locked: T.listLocked, cleared: T.listCleared, ask: hasMine ? T.listAsk : T.listAskNew, shared: T.listShared, imported: T.listImported, sample: T.listSample, own: T.listSaved }[mode];
    const b = this.note.lastElementChild;
    b.textContent = { locked: T.listClearAll, cleared: T.listUndo, ask: T.listAskNo, shared: T.listBack, imported: T.listClearAll, sample: T.listClear, own: T.listClearAll }[mode];
    b.disabled = this.locked;
    if (this.alt) {
      const label = { ask: T.listAskYes, shared: T.listEdit, imported: T.listRestore }[mode];
      this.alt.hidden = !label;
      this.alt.textContent = label || '';
      this.alt.disabled = this.locked;
    }
    // 명단을 지운 직후: 최근 결과 기록에 그 명단의 이름이 남아 있을 때만 같이 지울지 묻는다
    if (this.left) this.left.hidden = !(mode === 'cleared' && this.held);
  },
  set(text, save) { this.el.value = text; this.read(save); },
  /** 단추로 명단을 고칠 때: 내 명단이 되고(저장), 되돌리기는 사라진다. 링크의 명단이면 먼저 가져올지 묻는다 */
  edit(text) {
    if (this.locked) return;
    if (this.shared) { this.ask(); return; }
    this.undo = null;
    this.set(text, true);
  },
  setShared(items) {
    this.shared = true;
    this.asking = false;
    this.undo = null;
    this.sharedText = items.join('\n');
    this.el.value = this.sharedText;
    this.el.readOnly = true;
    this.read(false);
  },
  /** 링크의 명단을 내 명단으로 가져올지 묻는다(안내 줄이 물음으로 바뀐다) */
  ask() {
    if (!this.shared || this.locked || this.asking) return;
    this.asking = true;
    this.paint();
  },
  /** 링크의 명단을 내 명단으로 가져온다. 명단 자체는 그대로라서 화면의 결과는 지우지 않는다 */
  take() {
    const mine = store.get('pick.list');
    this.backup = mine === null ? null : { text: mine }; // 저장해 둔 것이 없었으면 되돌릴 것도 없다
    this.shared = false;
    this.asking = false;
    this.el.readOnly = this.locked;
    clearHash();
    clearTimeout(this.timer);
    store.set('pick.list', this.el.value);
    this.paint();
    this.el.focus();
  },
  /** 안내 줄의 둘째 단추: 고치기(→ 물음) / 가져오기 / 전 명단으로 되돌리기 */
  other() {
    if (this.locked) return;
    if (this.asking) { this.take(); return; }
    if (this.shared) { this.ask(); return; }
    if (this.backup) { const b = this.backup; this.backup = null; this.undo = null; this.set(b.text, true); }
  },
  /** 지우기 단추. 상태에 따라: 되돌리기 / 그만두기 / 내 명단으로 돌아가기 / 예시 지우기 / 내 명단 지우기(되돌릴 수 있다) */
  clear() {
    if (this.locked) return;
    if (this.undo) { const u = this.undo; this.undo = null; this.set(u.text, true); return; }
    if (this.asking) { this.asking = false; this.paint(); return; }
    if (this.shared) { // 링크로 받은 명단을 치우고 내 명단(없으면 예시)으로. 저장해 둔 내 명단은 건드리지 않는다
      this.shared = false;
      this.el.readOnly = false;
      clearHash();
      const mine = store.get('pick.list');
      this.set(mine !== null ? mine : this.sample, false);
      return;
    }
    const text = this.el.value;
    if (text === this.sample) { this.set('', true); this.el.focus(); return; }
    this.backup = null;
    this.held = false;
    if (text.trim() !== '') { this.undo = { text }; this.held = recent.holds(this.items); }
    clearTimeout(this.timer);
    store.del('pick.list');
    this.set(this.sample, false);
  },
  /** 결과가 나오는 동안 명단을 못 바꾸게 잠근다(잠긴 것이 보이게 칸을 흐리고 안내 줄을 바꾼다) */
  lock(on) {
    if (!this.el || this.locked === on) return;
    this.locked = on;
    this.el.readOnly = on || this.shared;
    this.box.classList.toggle('locked', on);
    $$('button', this.box).forEach((b) => { b.disabled = on; });
    this.paint();
  },
  onChange(f) { this.handlers.push(f); },
};

// ---------- 공유 링크 ----------
/** 이 페이지 주소 + '#r=…'. 링크가 한도보다 길면 오류를 던진다. */
export function shareUrl(tool, seed, items, opts, version) {
  return location.origin + location.pathname + '#' + encodeShare({ tool, seed, items, opts, version });
}
/** 최근 결과에 남길 링크: 못 만들면(너무 김) 빈 글자 */
export function safeShareUrl(tool, seed, items, opts, version) {
  try { return shareUrl(tool, seed, items, opts, version); } catch (e) { return ''; }
}
export async function copyLink(tool, seed, items, opts, version) {
  const toast = $('#toast');
  let url;
  try { url = shareUrl(tool, seed, items, opts, version); } catch (e) {
    // 열 수 없는 링크는 만들지 않는다. 복사했다고도 하지 않는다
    if (toast) toast.textContent = fmt(T.linkTooLong, { n: nfmt(shareLength(items, opts)), max: nfmt(MAX_HASH) });
    return false;
  }
  try {
    await navigator.clipboard.writeText(url);
    if (toast) toast.textContent = T.copied + (url.length > LONG_LINK ? ' ' + fmt(T.copiedLong, { n: nfmt(url.length) }) : '');
  } catch (e) {
    if (toast) { toast.textContent = T.copyFail + ' '; const c = el('code', null, url); c.style.userSelect = 'all'; toast.append(c); }
  }
  return true;
}
/** 열 수 없는 링크로 들어왔는지(닫기를 누르면 풀린다). 돌림판은 그동안 내 명단을 판에 올리지 않는다. */
export const link = { bad: false, handlers: [], onClose(f) { this.handlers.push(f); } };
/** 도구 위에 겹쳐 띄우는 알림(끼워 넣지 않아 화면이 밀리지 않는다). kind: 'warn'이면 알리기만(결과는 보여 준다), 없으면 열 수 없는 링크. */
function banner(parts, kind) {
  const host = $('#tool') || document.body;
  const b = el('div', 'linkmsg' + (kind ? ' ' + kind : ''));
  b.setAttribute('role', kind ? 'status' : 'alert');
  const p = el('p');
  p.append(...parts);
  b.append(p, button('btn btn-sm', T.close, () => {
    b.remove();
    if (!kind) { clearHash(); link.bad = false; link.handlers.forEach((f) => f()); }
  }));
  host.append(b);
}
/** 열 수 없는 링크 알림이 떠 있는 동안 실행 단추를 눌렀을 때: 알림을 한 번 흔들고 닫기 단추로 초점을 옮긴다 */
export function nudgeBanner() {
  const b = $('.linkmsg:not(.warn)');
  if (!b) return;
  b.classList.remove('nudge');
  if (!reduced()) { void b.offsetWidth; b.classList.add('nudge'); }
  $('button', b).focus();
}
/**
 * 주소에 공유 링크가 있으면 읽는다. 이 도구의 링크면 내용을 돌려준다. 돌려주는 것의 mark = 결과 곁에 붙일 표시의 종류:
 *   'ok'      링크의 결과 그대로(같은 씨앗 + 같은 명단으로 다시 계산했다)
 *   'legacy'  옛 형식 1(명단의 순서까지 결과에 들어가던 방식). 옛 방식 그대로 보여 주되 확인 표시는 붙이지 않는다
 *   'cleaned' 링크 속 이름에 보이지 않는 글자 등이 있어 고쳐 읽었다. 정리한 명단으로 다시 계산한 결과라고 밝힌다
 * 다른 도구의 링크면 그 도구로 가는 안내를, 잘못된 링크면 이유를 눈에 띄게 알리고 null을 돌려준다.
 */
export function readShare(tool) {
  const d = decodeShare(location.hash);
  if (d.ok && d.tool === tool) {
    d.legacy = d.version === 1 && ['wheel', 'draw', 'teams'].includes(tool);
    d.mark = d.legacy ? 'legacy' : d.cleaned ? 'cleaned' : 'ok';
    const say = [];
    if (d.legacy) say.push(T.legacyLink);
    if (d.cleaned) say.push(T.cleanedLink);
    if (say.length) banner([say.join(' ')], 'warn');
    return d;
  }
  if (!d.ok && d.reason === 'none') return null;
  link.bad = true;
  if (d.ok) {
    const a = el('a', null, T.openThere);
    a.href = T.paths[d.tool] + location.hash;
    banner([fmt(T.otherTool, { tool: T.toolNames[d.tool] }) + ' ', a]);
  } else {
    banner([d.reason === 'version' ? T.badVersion : d.reason === 'too-long' ? T.badTooLong : T.badLink]);
  }
  return null;
}
export function clearHash() {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}
/** 결과 곁의 표시를 종류에 맞게 채운다. 'ok'만 확인 도장(빨간 테두리)이고, 나머지는 도장이 아닌 수수한 표시다 */
function paintStamp(s, mark) {
  const plain = mark !== 'ok';
  s.textContent = mark === 'legacy' ? T.stampOld : mark === 'cleaned' ? T.stampCleaned : T.stamp;
  s.classList.toggle('plain', plain);
  if (plain) s.removeAttribute('aria-label'); else s.setAttribute('aria-label', T.stampSr);
  s.classList.remove('in');
  if (!plain && !reduced()) { void s.offsetWidth; s.classList.add('in'); }
  return s;
}
/** 새 표시 하나(동전처럼 제목 줄이 없는 곳에서 쓴다) */
export const stampEl = (mark) => paintStamp(el('span', 'stamp'), mark);
/** 돌림판의 결과 표시. mark: false(내가 돌린 결과) | 'ok' | 'legacy' | 'cleaned' */
export function showStamp(mark) {
  const s = $('#stamp');
  if (!s) return;
  s.hidden = !mark;
  if (mark) paintStamp(s, mark);
}
/** 결과 머리 줄: 제목 + (링크로 연 결과면) 표시 + 단추들. mark: false | 'ok' | 'legacy' | 'cleaned' */
export function outHead(text, mark, ...buttons) {
  const h = el('div', 'out-head');
  const h2 = el('h2', null, text);
  if (mark) h2.append(stampEl(mark));
  h.append(h2, ...buttons.filter(Boolean));
  return h;
}
/** 누름 단추 묶음(.seg): 고른 값을 돌려주고, 바뀌면 f를 부른다 */
export function seg(box, f) {
  const btns = $$('button', box);
  const pick = (v) => btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
  btns.forEach((b) => b.addEventListener('click', () => { pick(b.dataset.v); if (f) f(b.dataset.v); }));
  return { get value() { return (btns.find((b) => b.getAttribute('aria-pressed') === 'true') || btns[0]).dataset.v; }, set: pick };
}
export function setMsg(text) { const m = $('#msg'); if (m) m.textContent = text || ''; }
export function setAfter(on) {
  const a = $('#after');
  if (!a) return;
  if (on) a.removeAttribute('data-off'); else a.setAttribute('data-off', '');
  const t = $('#toast');
  if (t && !on) t.textContent = '';
}

// ---------- 최근 결과(이 기기에만) ----------
export const recent = {
  box: $('#recent'),
  load() { try { const a = JSON.parse(store.get('pick.history') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } },
  count() { return this.load().length; },
  /** 이 명단의 이름이 기록(다시 보기 링크나 결과 요약)에 남아 있는지 */
  holds(names) { return historyHolds(this.load(), names); },
  add(tool, text, url) {
    const a = this.load();
    const hash = url ? url.slice(url.indexOf('#')) : '';
    a.unshift({ t: tool, d: Date.now(), s: String(text).slice(0, 200), h: hash.length <= LONG_LINK ? hash : '' });
    store.set('pick.history', JSON.stringify(a.slice(0, 30)));
    if (this.box && this.box.open) this.render();
  },
  clear() { store.del('pick.history'); if (this.box) this.render(); },
  render() {
    const ul = $('ul', this.box);
    ul.textContent = '';
    const a = this.load();
    $('#recentclear').hidden = !a.length;
    if (!a.length) { ul.append(el('li', 'recent-empty', T.recentEmpty)); return; }
    const df = new Intl.DateTimeFormat(T.lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    for (const r of a) {
      const li = el('li');
      const time = el('time', null, df.format(new Date(r.d)));
      time.dateTime = new Date(r.d).toISOString();
      const sum = el('b', null, r.s);
      sum.title = r.s;
      li.append(time, el('i', null, T.toolNames[r.t] || ''), sum);
      if (r.h && T.paths[r.t]) { const a2 = el('a', null, T.replay); a2.href = T.paths[r.t] + r.h; li.append(a2); }
      ul.append(li);
    }
  },
  init() {
    if (!this.box) return;
    this.box.addEventListener('toggle', () => { if (this.box.open) this.render(); });
    $('#recentclear').addEventListener('click', () => { this.clear(); if (list.el) { list.held = false; list.paint(); } });
    addEventListener('hashchange', () => { if (location.hash.startsWith('#r=')) location.reload(); }); // '다시 보기'가 같은 페이지의 다른 결과 링크면 새로 연다
  },
};

// ---------- 소리(Web Audio로 만든 짧은 소리. 파일 없음. 누르기 전에는 소리를 내지 않는다) ----------
export const sound = {
  on: store.get('pick.sound') !== '0',
  ctx: null,
  btn: $('#sound'),
  init() {
    if (!this.btn) return;
    this.paint();
    this.btn.addEventListener('click', () => { this.on = !this.on; store.set('pick.sound', this.on ? '1' : '0'); this.paint(); if (this.on) this.tick(); });
  },
  paint() { this.btn.textContent = this.on ? T.soundOn : T.soundOff; this.btn.setAttribute('aria-pressed', String(this.on)); },
  /** 누르는 동작 안에서 한 번 불러 둔다(브라우저가 소리를 허락하는 때) */
  arm() {
    if (!this.on) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) { try { this.ctx = new AC(); } catch (e) { return; } }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },
  blip(freq, dur, gain, type) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  tick() { this.arm(); this.blip(1150, 0.035, 0.05, 'square'); },
  ding() { this.blip(880, 0.5, 0.09, 'sine'); this.blip(1320, 0.7, 0.05, 'sine'); },
};

// ---------- 발표 화면(전체 화면이 되는 기기에서만 단추를 보여 준다) ----------
export function initPresent() {
  const b = $('#present');
  const tool = $('#tool');
  if (!b || !tool || !document.fullscreenEnabled || !tool.requestFullscreen) return;
  b.hidden = false;
  b.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else tool.requestFullscreen().catch(() => {}); });
  document.addEventListener('fullscreenchange', () => {
    b.textContent = document.fullscreenElement ? T.presentExit : T.present;
    dispatchEvent(new Event('resize'));
  });
}
export const presenting = () => !!document.fullscreenElement;

// ---------- 색종이: 발표 화면에서 결과가 나온 순간에만 ----------
let confettiStop = null;
export function confetti() {
  if (reduced() || !presenting()) return;
  if (confettiStop) confettiStop();
  const c = el('canvas', 'confetti');
  c.setAttribute('aria-hidden', 'true');
  (document.fullscreenElement || document.body).append(c);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const W = c.width = innerWidth * dpr;
  const H = c.height = innerHeight * dpr;
  const g = c.getContext('2d');
  const cs = getComputedStyle(document.documentElement);
  const cols = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--pick'].map((k) => cs.getPropertyValue(k).trim());
  const n = innerWidth < 600 ? 45 : 70;
  const r = makeRng(newSeed());
  const rnd = () => r.below(10000) / 10000;
  const parts = Array.from({ length: n }, (_, i) => {
    const left = i % 2 === 0;
    return { x: (left ? 0.2 : 0.8) * W + (rnd() - 0.5) * 60 * dpr, y: H * 0.86, vx: (left ? 1 : -1) * (rnd() * 5 + 1) * dpr, vy: -(rnd() * 13 + 9) * dpr, s: (rnd() * 7 + 6) * dpr, a: rnd() * 6.28, va: (rnd() - 0.5) * 0.4, c: cols[i % cols.length] };
  });
  const t0 = performance.now();
  let raf = 0;
  let dead = false;
  confettiStop = () => { dead = true; cancelAnimationFrame(raf); c.remove(); confettiStop = null; };
  const frame = (now) => {
    if (dead) return;
    const t = (now - t0) / 1400;
    if (t >= 1 || document.hidden) return confettiStop();
    g.clearRect(0, 0, W, H);
    g.globalAlpha = t > 0.75 ? (1 - t) / 0.25 : 1;
    for (const p of parts) {
      p.vy += 0.42 * dpr; p.x += p.vx; p.y += p.vy; p.a += p.va;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); g.restore();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
export function stopConfetti() { if (confettiStop) confettiStop(); }

// ---------- 머리 메뉴(휴대폰에서 넘치면 넘친다는 표시) ----------
function initNav() {
  const nav = $('.tools-nav');
  if (!nav) return;
  const mark = () => nav.classList.toggle('more', nav.scrollWidth > nav.clientWidth + 2 && nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2);
  const cur = $('[aria-current="page"]', nav);
  if (cur && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, cur.offsetLeft - nav.clientWidth / 2 + cur.offsetWidth / 2);
  mark();
  nav.addEventListener('scroll', mark, { passive: true });
  addEventListener('resize', mark);
}

// ---------- 옆으로 밀리는 표(글): 더 있을 때만 '옆으로 밀어 보세요' 표시 ----------
function initTables() {
  $$('.tbl').forEach((box) => {
    const mark = () => box.parentElement.classList.toggle('more', box.scrollWidth > box.clientWidth + 2);
    mark();
    addEventListener('resize', mark);
  });
}

// ---------- 다른 언어판 안내 띠(화면 아래에 겹쳐 띄운다. 끼워 넣지 않고, 자동으로 넘기지 않는다) ----------
function initLang() {
  const alt = $(`link[rel="alternate"][hreflang="${T.other.lang}"]`);
  $$('a.lang').forEach((a) => a.addEventListener('click', () => store.set('pick.lang', T.other.lang)));
  if (!alt || store.get('pick.lang')) return;
  const browser = (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  if (browser === T.lang) return;
  const bar = el('div', 'lang-bar');
  const a = el('a', null, T.other.label);
  a.href = alt.href.replace(/^https?:\/\/[^/]+/, '') + location.hash;
  a.lang = T.other.lang;
  a.addEventListener('click', () => store.set('pick.lang', T.other.lang));
  const x = el('button', null, '×');
  x.type = 'button';
  x.setAttribute('aria-label', T.lang === 'ko' ? 'Close' : '닫기');
  if (T.lang === 'en') x.lang = 'ko';
  x.addEventListener('click', () => { store.set('pick.lang', T.lang); bar.remove(); });
  bar.append(a, x);
  document.body.append(bar);
}

// ---------- 루멘랩 칸: 화면에 들어오면 작은 판이 한 번 돈다 ----------
function initLumen() {
  const a = $('[data-lumen]');
  if (!a || reduced() || !('IntersectionObserver' in window)) return;
  const born = performance.now();
  const io = new IntersectionObserver((es) => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    setTimeout(() => a.classList.add('spin'), Math.max(0, 600 - (performance.now() - born)));
  }, { threshold: 0.6 });
  io.observe(a);
}

list.init();
recent.init();
sound.init();
initPresent();
initNav();
initTables();
initLang();
initLumen();
