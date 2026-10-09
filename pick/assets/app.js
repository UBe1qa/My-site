// 공평뽑기 공통 화면 코드: 명단(저장·섞기·정리), 공유 링크, 최근 결과, 소리, 다른 언어 안내 띠, 루멘랩 칸, 발표 화면.
// 화면 글자는 전부 페이지의 <script id="i18n">(= _dev/content.json)에서 온다. 페이지 언어는 <html lang>이 정한다.
// 이 기기에 저장하는 것(개인정보 처리방침과 같아야 한다): pick.list(명단), pick.history(최근 결과), pick.sound(소리), pick.lang(언어 안내 띠).
import { newSeed, makeRng } from './core/rng.js';
import { parseList, uniqueItems, encodeShare, decodeShare } from './core/share.js';

export const T = JSON.parse(document.getElementById('i18n').textContent);
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const fmt = (s, o = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const nfmt = (n) => Number(n).toLocaleString(T.lang === 'ko' ? 'ko-KR' : 'en-US');
export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장을 막아 둔 브라우저: 그냥 저장 없이 쓴다 */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* 위와 같음 */ } },
};

// ---------- 명단 ----------
export const list = {
  el: $('#names'),
  items: [],
  shared: false,
  handlers: [],
  init() {
    if (!this.el) return;
    this.sample = this.el.dataset.sample || '';
    this.note = $('#listnote');
    this.read();
    this.el.addEventListener('input', () => { this.shared = false; this.read(true); });
    $('#listclear').addEventListener('click', () => {
      if (this.el.value === this.sample && !this.shared) { this.set('', true); this.el.focus(); return; }
      store.del('pick.list');
      this.shared = false;
      this.set(this.sample, false);
    });
    $('#shuffle').addEventListener('click', () => {
      const r = makeRng(newSeed()); // 화면에 보이는 순서만 바꾼다(뽑기 결과와는 따로)
      const a = this.items.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = r.below(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
      this.set(a.join('\n'), true);
    });
    $('#sortaz').addEventListener('click', () => this.set(this.items.slice().sort((a, b) => a.localeCompare(b, T.lang, { numeric: true })).join('\n'), true));
    $('#dedupe').addEventListener('click', () => this.set(uniqueItems(this.items).join('\n'), true));
  },
  read(save) {
    const text = this.el.value;
    const p = parseList(text);
    this.items = p.items;
    clearTimeout(this.timer); // 지우기·링크 명단처럼 저장하지 않는 변경이 오면, 기다리던 저장도 취소한다
    if (save) {
      this.timer = setTimeout(() => { if (text.trim() === '' || text === this.sample) store.del('pick.list'); else store.set('pick.list', text); }, 250);
    }
    const c = $('#count');
    if (c) c.textContent = p.items.length === 1 ? T.count1 : fmt(T.count, { n: nfmt(p.items.length) });
    const warn = [];
    if (p.cut) warn.push(fmt(T.warnCut, { n: p.cut }));
    if (p.over) warn.push(fmt(T.warnOver, { n: nfmt(p.over) }));
    if (p.dupes) warn.push(fmt(T.warnDupes, { n: p.dupes }));
    const w = $('#listwarn');
    if (w) w.textContent = warn.join(' ');
    const mode = this.shared ? 'shared' : text === this.sample ? 'sample' : 'own';
    this.note.firstElementChild.textContent = { shared: T.listShared, sample: T.listSample, own: T.listSaved }[mode];
    this.note.lastElementChild.textContent = mode === 'sample' ? this.note.dataset.clear : this.note.dataset.clearall;
    this.handlers.forEach((f) => f(this.items));
  },
  set(text, save) { this.el.value = text; this.read(save); },
  setShared(items) { this.shared = true; this.el.value = items.join('\n'); this.read(false); },
  onChange(f) { this.handlers.push(f); },
};

// ---------- 공유 링크 ----------
/** 이 페이지 주소 + '#r=…' */
export function shareUrl(tool, seed, items, opts) {
  return location.origin + location.pathname + '#' + encodeShare({ tool, seed, items, opts });
}
export async function copyLink(url) {
  const toast = $('#toast');
  try {
    await navigator.clipboard.writeText(url);
    if (toast) toast.textContent = T.copied;
  } catch (e) {
    if (toast) { toast.textContent = T.copyFail + ' '; const c = el('code', null, url); c.style.userSelect = 'all'; toast.append(c); }
  }
}
/** 주소에 공유 링크가 있으면 읽는다. 다른 도구의 링크면 그 도구로 가는 안내를 띄운다. 잘못된 링크면 이유를 알린다. */
export function readShare(tool) {
  const d = decodeShare(location.hash);
  if (d.ok && d.tool === tool) return d;
  const msg = $('#msg') || $('#toast');
  if (!msg || (!d.ok && d.reason === 'none')) return null;
  if (d.ok) {
    msg.textContent = fmt(T.otherTool, { tool: T.toolNames[d.tool] }) + ' ';
    const a = el('a', null, T.openThere);
    a.href = T.paths[d.tool] + location.hash;
    msg.append(a);
  } else {
    msg.textContent = d.reason === 'version' ? T.badVersion : T.badLink;
  }
  return null;
}
export function clearHash() {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}
export function showStamp(on) {
  const s = $('#stamp');
  if (!s) return;
  s.hidden = !on;
  if (!on) return;
  s.textContent = T.stamp;
  s.setAttribute('aria-label', T.stampSr);
  s.classList.remove('in');
  if (!reduced()) { void s.offsetWidth; s.classList.add('in'); }
}
/** 결과 머리 줄: 제목 + (링크로 연 결과면) 확인 도장 + 단추들 */
export function outHead(text, replay, ...buttons) {
  const h = el('div', 'out-head');
  const h2 = el('h2', null, text);
  if (replay) {
    const s = el('span', 'stamp', T.stamp);
    s.setAttribute('aria-label', T.stampSr);
    if (!reduced()) s.classList.add('in');
    h2.append(s);
  }
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
  add(tool, text, url) {
    const a = this.load();
    const hash = url.slice(url.indexOf('#'));
    a.unshift({ t: tool, d: Date.now(), s: String(text).slice(0, 200), h: hash.length <= 4000 ? hash : '' });
    store.set('pick.history', JSON.stringify(a.slice(0, 30)));
    if (this.box && this.box.open) this.render();
  },
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
      li.append(time, el('i', null, T.toolNames[r.t] || ''), el('b', null, r.s));
      if (r.h && T.paths[r.t]) { const link = el('a', null, T.replay); link.href = T.paths[r.t] + r.h; li.append(link); }
      ul.append(li);
    }
  },
  init() {
    if (!this.box) return;
    this.box.addEventListener('toggle', () => { if (this.box.open) this.render(); });
    $('#recentclear').addEventListener('click', () => { store.del('pick.history'); this.render(); });
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

// ---------- 다른 언어판 안내 띠(겹쳐 띄운다. 자동으로 넘기지 않는다) ----------
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
initLang();
initLumen();
