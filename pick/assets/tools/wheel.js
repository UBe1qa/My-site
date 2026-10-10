// 돌림판 화면. 결과는 core가 먼저 정하고(wheelDraw), 여기서는 그 칸에 멈추도록 돌려서 보여 줄 뿐이다.
// 멈춰 있을 때: 캔버스 안에 지금 각도로 그린다(CSS 회전 없음, 왼쪽 절반의 이름은 뒤집어 써서 거꾸로 보이지 않게).
// 도는 동안: 그려 둔 캔버스를 CSS transform으로만 돌린다(다시 그리지 않는다). 멈추면 그리기 0.
//
// 돌리기를 누른 순간의 명단·씨앗·결과를 한 묶음으로 잡아 두고(spinning), 판의 강조 칸·발표 이름·'빼고 다시'·결과 링크·
// 최근 결과를 전부 그 묶음으로 만든다. 도는 동안에는 명단 칸과 그 단추들을 잠근다. 그래서 화면과 결과가 어긋날 길이 없다.
// '이 사람 빼고 다시'는 명단 칸의 글(= 저장되는 원래 명단)을 고치지 않는다. 뺀 사람은 out에만 적어 두고 판에서만 뺀다.
import { T, $, fmt, nfmt, reduced, list, sound, recent, safeShareUrl, copyLink, readShare, link, clearHash, showStamp, setAfter, confetti, stopConfetti, presenting, el } from '../app.js';
import { newSeed, makeRng } from '../core/rng.js';
import { wheelDraw, wheelRotation, wheelIndexAt, sliceColorCount, labelFlipped, labelSize, fitLabel, commonPrefixLength } from '../core/pick.js';

const TAU = Math.PI * 2;
const POINTER = 0; // 바늘은 오른쪽(3시): 멈췄을 때 뽑힌 이름이 가로로 읽힌다
const HISTORY_MAX = 60; // '지금까지 뽑힌 순서'에 남기는 수
const wheelEl = $('#wheel');
const canvas = $('canvas', wheelEl);
const ctx = canvas.getContext('2d');
const needle = $('.needle', wheelEl);
const go = $('#go');
const resultEl = $('#result');
const rname = $('#rname');
const rlabel = $('#rlabel');
const historyEl = $('#history');
const outBox = $('#outbox');

let live = list.items; // 명단 칸의 명단(원래 명단)
let out = [];          // 이번 판에서 뺀 이름(뺀 순서대로). 저장하지 않는다
let items = live;      // 판에 올라가 있는 명단 = 원래 명단에서 뺀 사람을 뺀 것. 도는 중과 결과가 떠 있는 동안에는 그때 잡아 둔 명단
let prefix = 0;        // 판의 이름들이 앞에서 몇 글자까지 같은지(긴 이름을 줄일 때 뒤쪽을 살리려고)
let rot = 0;           // 지금 판의 각도(라디안)
let spinning = null;   // 도는 중이면 { items, seed, pick, name, replay, legacy }
let last = null;       // 마지막 결과 { items, index, name, seed, legacy }
let shown = -1;        // 짚어 둔 칸
let hist = [];         // 지금까지 뽑힌 순서 { no, name } (새것이 앞)
let turnNo = 0;
let blocked = false;   // 열 수 없는 링크로 들어온 동안: 내 명단을 판에 올리지 않는다
let drawn = { items: [], hi: -1 }; // 캔버스에 마지막으로 그린 것(확인용)

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function restAngle(n) { return n ? -Math.PI / n : 0; } // 처음에는 첫 칸의 가운데가 바늘 아래에 오게

/** 원래 명단에서 뺀 사람을 뺀 명단(같은 이름이 여러 줄이면 뺀 수만큼만 뺀다) */
function active() {
  if (!out.length) return live.slice();
  const left = new Map();
  for (const name of out) left.set(name, (left.get(name) || 0) + 1);
  return live.filter((name) => { const c = left.get(name); if (c) { left.set(name, c - 1); return false; } return true; });
}

function draw(hi = -1) {
  shown = hi;
  const size = wheelEl.clientWidth;
  if (!size) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = Math.round(size * dpr);
  if (canvas.width !== px) canvas.width = canvas.height = px;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const R = size / 2;
  const rimW = Math.max(6, size * 0.024);
  const r = R - rimW;
  const board = blocked ? [] : items;
  const n = board.length;
  drawn = { items: board, hi };
  ctx.beginPath(); ctx.arc(R, R, R - 0.5, 0, TAU); ctx.fillStyle = css('--rim'); ctx.fill();
  if (!n) {
    ctx.beginPath(); ctx.arc(R, R, r, 0, TAU); ctx.fillStyle = css('--well'); ctx.fill();
    return;
  }
  const a = TAU / n;
  const m = sliceColorCount(n);
  const pal = Array.from({ length: m }, (_, i) => css('--s' + (i + 1)));
  const ink = css('--slice-ink');
  const font = css('--font');
  ctx.save();
  ctx.translate(R, R);
  ctx.rotate(rot);
  for (let i = 0; i < n; i++) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, i * a, (i + 1) * a); ctx.closePath();
    ctx.globalAlpha = hi >= 0 && i !== hi ? 0.24 : 1;
    ctx.fillStyle = pal[i % m];
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (n > 1 && n <= 200) {
    ctx.strokeStyle = css('--rim'); ctx.lineWidth = n > 60 ? 1 : 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * a) * r, Math.sin(i * a) * r); }
    ctx.stroke();
  }
  const maxW = r * 0.5;
  const label = (i, base, alpha) => {
    const mid = (i + 0.5) * a;
    ctx.font = `700 ${base}px ${font}`;
    // 넘치면 글자를 조금 줄이고(9px 아래로는 안 줄인다), 그래도 넘치면 자른다. 앞이 같은 명단은 뒤쪽을 살린다
    const fit = fitLabel(board[i], maxW, (t) => ctx.measureText(t).width, { prefix, minScale: Math.min(1, Math.max(0.72, 9 / base)) });
    const size2 = base * fit.scale;
    if (fit.scale !== 1) ctx.font = `700 ${size2}px ${font}`;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ink;
    ctx.textBaseline = 'middle';
    if (labelFlipped(mid + rot)) { ctx.rotate(mid + Math.PI); ctx.textAlign = 'left'; ctx.fillText(fit.text, -r * 0.86, size2 * 0.04); }
    else { ctx.rotate(mid); ctx.textAlign = 'right'; ctx.fillText(fit.text, r * 0.86, size2 * 0.04); }
    ctx.restore();
  };
  const base = labelSize(r, n);
  if (base >= 8) for (let i = 0; i < n; i++) label(i, base, hi >= 0 && i !== hi ? 0.32 : 1);
  // 칸이 아주 얇으면 뽑힌 칸을 넓혀서 다시 그린다(돋보기 칸). 바늘은 이 칸 안에 있다.
  if (hi >= 0 && base < 15 && n > 1) {
    const mid = (hi + 0.5) * a;
    const half = Math.max(a / 2, 0.14);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, mid - half, mid + half); ctx.closePath();
    ctx.fillStyle = pal[hi % m]; ctx.fill();
    ctx.strokeStyle = css('--rim'); ctx.lineWidth = 2; ctx.stroke();
    label(hi, Math.min(r * 0.1, 2 * r * 0.66 * Math.sin(half) * 0.56), 1);
  }
  ctx.restore();
}

function setWait(text, label) {
  rlabel.textContent = label || rlabel.dataset.idle;
  rname.textContent = text;
  rname.classList.add('wait');
}

function paintOut() {
  if (!outBox) return;
  outBox.hidden = !out.length;
  if (!out.length) return;
  $('#outtext').textContent = fmt(out.length === 1 && T.outList1 ? T.outList1 : T.outList, { n: nfmt(out.length), names: out.join(', ') });
  $('#outlast').hidden = out.length < 2; // 한 명뿐이면 '모두 되돌리기' 하나로 충분하다
}

function paintHist() {
  const ol = $('ol', historyEl);
  ol.textContent = '';
  for (const h of hist) {
    const li = el('li');
    li.append(el('b', 'num', h.no), el('span', null, h.name));
    ol.append(li);
  }
  if (hist.length) historyEl.removeAttribute('data-off'); else historyEl.setAttribute('data-off', '');
}

/** 명단이 바뀌었거나 뺀 사람을 되돌렸을 때: 판을 새 명단으로 다시 놓는다(앞 결과는 지운다) */
function sync() {
  // 뺀 사람·뽑힌 순서 가운데 새 명단에 없는 이름은 버린다(명단을 통째로 바꾸면 둘 다 새로 시작한다)
  const have = new Map();
  for (const name of live) have.set(name, (have.get(name) || 0) + 1);
  out = out.filter((name) => { const c = have.get(name); if (c) { have.set(name, c - 1); return true; } return false; });
  hist = hist.filter((h) => have.has(h.name));
  if (!hist.length) turnNo = 0;
  items = active();
  prefix = commonPrefixLength(items);
  last = null;
  rot = restAngle(items.length);
  setAfter(false);
  showStamp(false);
  go.textContent = T.spin;
  resultEl.dataset.state = 'idle';
  setWait(blocked ? '' : items.length ? T.wait : live.length ? T.allOut : T.emptyList);
  draw(-1);
  paintOut();
  paintHist();
}

/** 결과 보여 주기. s = 돌리기를 누른 순간에 잡아 둔 묶음. 여기서 쓰는 명단은 s.items뿐이다. */
function finish(s, quiet) {
  spinning = null;
  list.lock(false);
  wheelEl.classList.remove('spinning');
  items = s.items;
  last = { items: s.items, index: s.pick.index, name: s.name, seed: s.seed, legacy: s.legacy };
  draw(s.pick.index);
  resultEl.dataset.state = 'done';
  rlabel.textContent = T.picked;
  rname.textContent = s.name;
  rname.classList.remove('wait');
  resultEl.classList.remove('fresh');
  if (!quiet && !reduced()) { void resultEl.offsetWidth; resultEl.classList.add('fresh'); }
  go.textContent = T.spinAgain;
  setAfter(true);
  showStamp(s.replay, s.legacy);
  hist.unshift({ no: ++turnNo, name: s.name });
  if (hist.length > HISTORY_MAX) hist.length = HISTORY_MAX;
  paintHist();
  if (!s.replay) {
    recent.add('wheel', s.name, safeShareUrl('wheel', s.seed, s.items));
    sound.ding();
    confetti();
  }
}

function spin(seed, replay, legacy) {
  if (spinning || blocked) return;
  const board = active(); // 돌리기를 누른 순간의 명단. 이 뒤로는 이것만 쓴다
  if (!board.length) { setWait(live.length ? T.allOut : T.emptyList); if (!live.length) list.el.focus(); return; }
  items = board;
  prefix = commonPrefixLength(items);
  if (!replay) clearHash();
  stopConfetti();
  seed = seed || newSeed();
  const n = items.length;
  const pick = wheelDraw(items, makeRng(seed), !!legacy);   // 결과를 먼저 정하고(명단의 순서와 상관없이 같은 이름)
  const to = wheelRotation({ n, index: pick.index, frac: pick.frac, from: rot, turns: pick.turns, pointer: POINTER }); // 그 칸에 멈추는 각도를 구한다
  const s = { items, seed, pick, name: items[pick.index], replay: !!replay, legacy: !!legacy };
  last = null;
  setAfter(false);
  showStamp(false);
  if (reduced()) { rot = to % TAU; finish(s, true); return; }
  spinning = s;
  list.lock(true);
  wheelEl.classList.add('spinning');
  resultEl.dataset.state = 'spin';
  setWait(T.spinning, rlabel.dataset.idle);
  draw(-1);
  const from = rot;
  const dur = 3400 + pick.turns * 260;
  const t0 = performance.now();
  let lastIdx = wheelIndexAt(n, from, POINTER);
  let lastTick = 0;
  const frame = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 3.6);
    const v = from + (to - from) * e;
    canvas.style.transform = `rotate(${v - from}rad)`;
    const idx = wheelIndexAt(n, v, POINTER);
    if (idx !== lastIdx && now - lastTick > 55) {
      lastTick = now;
      sound.tick();
      needle.animate([{ transform: 'translateY(-50%) rotate(0)' }, { transform: 'translateY(-50%) rotate(-11deg)' }, { transform: 'translateY(-50%) rotate(0)' }], { duration: 110 });
    }
    lastIdx = idx;
    if (t < 1) { requestAnimationFrame(frame); return; }
    rot = to % TAU;
    canvas.style.transform = '';
    finish(s);
  };
  requestAnimationFrame(frame);
}

list.onChange((next) => {
  live = next;
  if (spinning) return; // 도는 중에는 명단이 잠겨 있다. 그래도 바뀌었다면 이번 판은 잡아 둔 명단으로 끝내고, 다음 판부터 새 명단을 쓴다
  sync();
});

rlabel.dataset.idle = rlabel.textContent;
go.addEventListener('click', () => { sound.arm(); spin(); });
$('#again').addEventListener('click', () => {
  if (!last || spinning) return;
  out.push(last.name); // 명단 칸의 글은 그대로 두고 판에서만 뺀다
  sound.arm();
  last = null;
  paintOut();
  if (active().length) spin(); else sync();
});
$('#copy').addEventListener('click', () => { if (last) copyLink('wheel', last.seed, last.items, undefined, last.legacy ? 1 : undefined); });
if (outBox) {
  $('#outlast').addEventListener('click', () => { if (spinning || !out.length) return; out.pop(); sync(); });
  $('#outall').addEventListener('click', () => { if (spinning || !out.length) return; out = []; sync(); });
}

let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!spinning) draw(shown); }, 60); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!spinning) draw(shown); });
document.fonts.ready.then(() => { if (!spinning) draw(shown); });
if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { if (!spinning) draw(shown); });

const shared = readShare('wheel');
blocked = link.bad;
link.onClose(() => { blocked = false; sync(); });
sync();
if (shared && shared.items.length) {
  list.setShared(shared.items);
  spin(shared.seed, true, shared.legacy); // 같은 씨앗 + 같은 사람들 → 같은 이름에 멈춘다
}
window.__pick = { get state() { return { items, live, out, hist, last, rot, spinning: !!spinning, drawn, blocked, presenting: presenting() }; }, spin };
