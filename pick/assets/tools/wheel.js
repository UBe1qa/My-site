// 돌림판 화면. 결과는 core가 먼저 정하고(wheelPick), 여기서는 그 칸에 멈추도록 돌려서 보여 줄 뿐이다.
// 멈춰 있을 때: 캔버스 안에 지금 각도로 그린다(CSS 회전 없음, 왼쪽 절반의 이름은 뒤집어 써서 거꾸로 보이지 않게).
// 도는 동안: 그려 둔 캔버스를 CSS transform으로만 돌린다(다시 그리지 않는다). 멈추면 그리기 0.
import { T, $, fmt, reduced, list, sound, recent, shareUrl, copyLink, readShare, clearHash, showStamp, setAfter, confetti, stopConfetti, presenting, el } from '../app.js';
import { newSeed, makeRng } from '../core/rng.js';
import { wheelPick, wheelRotation, wheelIndexAt, sliceColorCount, labelFlipped, labelSize } from '../core/pick.js';

const TAU = Math.PI * 2;
const POINTER = 0; // 바늘은 오른쪽(3시): 멈췄을 때 뽑힌 이름이 가로로 읽힌다
const wheelEl = $('#wheel');
const canvas = $('canvas', wheelEl);
const ctx = canvas.getContext('2d');
const needle = $('.needle', wheelEl);
const go = $('#go');
const resultEl = $('#result');
const rname = $('#rname');
const rlabel = $('#rlabel');
const historyEl = $('#history');

let items = list.items;
let rot = 0;       // 지금 판의 각도(라디안)
let spinning = false;
let last = null;   // { index, name, seed }
let shown = -1;    // 짚어 둔 칸
let turnNo = 0;

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function restAngle(n) { return n ? -Math.PI / n : 0; } // 처음에는 첫 칸의 가운데가 바늘 아래에 오게

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
  const n = items.length;
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
  const label = (i, size2, alpha, half) => {
    const mid = (i + 0.5) * a;
    const maxW = r * 0.5;
    ctx.font = `700 ${size2}px ${font}`;
    let text = items[i];
    if (ctx.measureText(text).width > maxW) {
      const ch = Array.from(text);
      while (ch.length > 1 && ctx.measureText(ch.join('') + '…').width > maxW) ch.pop();
      text = ch.join('') + '…';
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ink;
    ctx.textBaseline = 'middle';
    if (labelFlipped(mid + rot)) { ctx.rotate(mid + Math.PI); ctx.textAlign = 'left'; ctx.fillText(text, -r * 0.86, size2 * 0.04); }
    else { ctx.rotate(mid); ctx.textAlign = 'right'; ctx.fillText(text, r * 0.86, size2 * 0.04); }
    ctx.restore();
    return half;
  };
  const size2 = labelSize(r, n);
  if (size2 >= 8) for (let i = 0; i < n; i++) label(i, size2, hi >= 0 && i !== hi ? 0.32 : 1);
  // 칸이 아주 얇으면 뽑힌 칸을 넓혀서 다시 그린다(돋보기 칸). 바늘은 이 칸 안에 있다.
  if (hi >= 0 && size2 < 15 && n > 1) {
    const mid = (hi + 0.5) * a;
    const half = Math.max(a / 2, 0.14);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, mid - half, mid + half); ctx.closePath();
    ctx.fillStyle = pal[hi % m]; ctx.fill();
    ctx.strokeStyle = css('--rim'); ctx.lineWidth = 2; ctx.stroke();
    label(hi, Math.min(r * 0.1, 2 * r * 0.66 * Math.sin(half) * 0.56), 1);
  }
  ctx.restore();
}

function setWait(text) {
  rlabel.textContent = $('#rlabel').dataset.idle || rlabel.textContent;
  rname.textContent = text;
  rname.classList.add('wait');
}

function showResult(pick, name, seed, replay, quiet) {
  last = { index: pick.index, name, seed };
  draw(pick.index);
  rlabel.textContent = T.picked;
  rname.textContent = name;
  rname.classList.remove('wait');
  resultEl.classList.remove('fresh');
  if (!quiet && !reduced()) { void resultEl.offsetWidth; resultEl.classList.add('fresh'); }
  setAfter(true);
  showStamp(!!replay);
  turnNo++;
  const li = el('li');
  li.append(el('b', 'num', turnNo), el('span', null, name));
  $('ol', historyEl).prepend(li);
  historyEl.removeAttribute('data-off');
  if (!replay) {
    recent.add('wheel', name, shareUrl('wheel', seed, items));
    sound.ding();
    confetti();
  }
}

function spin(seed, replay) {
  if (spinning) return;
  if (!items.length) { setWait(T.emptyList); list.el.focus(); return; }
  if (!replay) clearHash();
  stopConfetti();
  seed = seed || newSeed();
  const n = items.length;
  const pick = wheelPick(n, makeRng(seed));   // 결과를 먼저 정하고
  const to = wheelRotation({ n, index: pick.index, frac: pick.frac, from: rot, turns: pick.turns, pointer: POINTER }); // 그 칸에 멈추는 각도를 구한다
  const name = items[pick.index];
  $('#toast').textContent = '';
  showStamp(false);
  if (reduced()) { rot = to % TAU; showResult(pick, name, seed, replay, true); return; }
  spinning = true;
  wheelEl.classList.add('spinning');
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
    spinning = false;
    wheelEl.classList.remove('spinning');
    showResult(pick, name, seed, replay);
  };
  requestAnimationFrame(frame);
}

list.onChange((next) => {
  items = next;
  if (spinning) return;
  last = null;
  rot = restAngle(items.length);
  setAfter(false);
  showStamp(false);
  setWait(items.length ? T.wait : T.emptyList);
  draw(-1);
});

rlabel.dataset.idle = rlabel.textContent;
go.addEventListener('click', () => { sound.arm(); spin(); });
$('#again').addEventListener('click', () => {
  if (!last || spinning) return;
  const rest = items.slice();
  rest.splice(last.index, 1);
  sound.arm();
  list.set(rest.join('\n'), !list.shared);
  if (items.length) spin();
});
$('#copy').addEventListener('click', () => { if (last) copyLink(shareUrl('wheel', last.seed, items)); });

let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!spinning) draw(shown); }, 60); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!spinning) draw(shown); });
document.fonts.ready.then(() => { if (!spinning) draw(shown); });
if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { if (!spinning) draw(shown); });

rot = restAngle(items.length);
if (!items.length) setWait(T.emptyList);
draw(-1);
const shared = readShare('wheel');
if (shared && shared.items.length) {
  list.setShared(shared.items);
  spin(shared.seed, true); // 같은 씨앗 + 같은 명단 → 같은 칸에 멈춘다
}
window.__pick = { get state() { return { items, last, rot, spinning, presenting: presenting() }; }, spin };
