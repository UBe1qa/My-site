// 사다리타기 화면. 사다리와 결과는 core/ladder.js가 만든다(아래 칸을 먼저 섞고 사다리를 만든다).
// 여기서는 SVG로 그리고, 이름을 누르면 그 사람의 길을 따라간다. 가로줄은 누가 타기 전까지 가려 둔다.
// 한 판(game)은 만든 순간의 명단·아래 칸·씨앗을 잡아 둔 것이다. 그림·결과·링크는 전부 이 묶음에서 나오고,
// 명단이나 설정이 바뀌면 그 판은 통째로 지운다(길을 따라가는 도중이어도). 사다리는 줄 순서가 결과의 일부라서 순서까지 링크에 담긴다.
import { T, $, $$, fmt, reduced, el, list, recent, safeShareUrl, copyLink, readShare, clearHash, setAfter, setMsg, seg, outHead, nfmt, plural } from '../app.js';
import { newSeed, makeRng } from '../core/rng.js';
import { LIMITS, fitLabel, commonPrefixLength } from '../core/pick.js';
import { playLadder, tracePath } from '../core/ladder.js';
import { parseList } from '../core/share.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, cls) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (cls) e.setAttribute('class', cls); return e; };
const box = $('#ladderbox');
const holder = $('#ladder');
const out = $('#out');
const go = $('#go');
const showAllBtn = $('#showall');
const bottomEl = $('#bottom');
const rowsSeg = seg($('#rows'));
const emptyHtml = holder.innerHTML;
const goLabel = go.textContent;
const measure = document.createElement('canvas').getContext('2d');

let game = null; // { seed, items, labels, rows, g(playLadder 결과), open:Set, svg parts }

// 이름표에 맞추기: 넘치면 자른다. 앞이 같은 이름들은 앞을 줄이고 뒤쪽을 살린다(글자 크기는 그대로 13px)
function fit(text, maxPx, prefix) {
  measure.font = `700 13px ${getComputedStyle(document.documentElement).getPropertyValue('--font')}`;
  return fitLabel(text, maxPx, (t) => measure.measureText(t).width, { prefix, minScale: 1 }).text;
}

function labelsFor(n) {
  const all = parseList(bottomEl.value, { max: LIMITS.ladderMax });
  const given = all.items.slice(0, n);
  const labels = given.slice();
  while (labels.length < n) labels.push(T.blank);
  return { labels, given, extra: all.items.length + all.over - given.length }; // extra = 사람 수보다 많이 적어 쓰이지 않은 아래 칸
}

function reset() {
  game = null;
  holder.innerHTML = emptyHtml;
  holder.style.display = 'grid';
  out.textContent = '';
  $('#tip').textContent = '';
  $('#labwarn').textContent = '';
  showAllBtn.hidden = true;
  go.textContent = goLabel;
  setAfter(false);
  box.classList.remove('more');
}

function make(seed, replay, given) {
  const items = list.items.slice();
  const n = items.length;
  if (n < LIMITS.ladderMin || n > LIMITS.ladderMax) { reset(); setMsg(fmt(T.ladderRange, { n: nfmt(n) })); return; }
  setMsg('');
  if (!replay) clearHash();
  const rows = Number(rowsSeg.value);
  const lab = given ? { labels: given.concat(Array(Math.max(0, n - given.length)).fill(T.blank)).slice(0, n), given: given.slice(0, n), extra: Math.max(0, given.length - n) } : labelsFor(n);
  seed = seed || newSeed();
  const g = playLadder(n, { rows }, makeRng(seed));
  game = { seed, items, labels: lab.labels, given: lab.given, rows, g, open: new Set(), replay, pre: commonPrefixLength(items), preB: commonPrefixLength(lab.given) };
  render();
  // 아래 칸을 사람 수보다 많이 적었으면 말없이 버리지 않고 알린다
  $('#labwarn').textContent = lab.extra > 0 ? plural('ladderExtra', lab.extra, { m: nfmt(n) }) : '';
  go.textContent = go.dataset.again;
  showAllBtn.hidden = false;
  setAfter(true);
  $('#tip').textContent = T.ladderTip;
  if (replay) showAll();
  else {
    const hits = items.map((name, i) => [name, game.labels[g.result[i]]]).filter((p) => p[1] !== T.blank).slice(0, 3).map((p) => `${p[0]} ${p[1]}`);
    recent.add('ladder', hits.length ? hits.join(', ') : plural('count', n), safeShareUrl('ladder', seed, items, { rows, labels: lab.given }));
  }
}

function render() {
  const { items, labels, rows, g } = game;
  const n = items.length;
  const avail = holder.clientWidth - 24;
  const colW = Math.max(62, Math.min(104, avail / n)); // 좁은 화면에서는 세 글자 이름이 보이는 폭을 지키고 옆으로 민다
  const padX = 12;
  const W = Math.round(colW * n + padX * 2);
  const top = 46;
  const H = rows > 14 ? 360 : 300;
  const rowH = H / (rows + 1);
  const total = top + H + 46;
  const x = (c) => padX + colW * (c + 0.5);
  const y = (r) => top + rowH * r;
  const svg = svgEl('svg', { width: W, height: total, viewBox: `0 0 ${W} ${total}`, role: 'group', 'aria-label': T.toolNames.ladder });
  const defs = svgEl('defs');
  const pat = svgEl('pattern', { id: 'hatch', width: 10, height: 10, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pat.append(svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 10 }, 'lad-cover-h'));
  defs.append(pat);
  svg.append(defs);
  for (let c = 0; c < n; c++) svg.append(svgEl('line', { x1: x(c), y1: top - 8, x2: x(c), y2: top + H + 8 }, 'lad-line'));
  const rungs = svgEl('g', { visibility: 'hidden' });
  g.ladder.rungs.forEach((row, r) => row.forEach((v, c) => { if (v) rungs.append(svgEl('line', { x1: x(c), y1: y(r + 1), x2: x(c + 1), y2: y(r + 1) }, 'lad-rung')); }));
  const cover = svgEl('g');
  cover.append(svgEl('rect', { x: 4, y: top + rowH * 0.45, width: W - 8, height: H - rowH * 0.9, rx: 10 }, 'lad-cover'), svgEl('rect', { x: 4, y: top + rowH * 0.45, width: W - 8, height: H - rowH * 0.9, rx: 10, fill: 'url(#hatch)' }));
  const paths = svgEl('g');
  svg.append(rungs, cover, paths);
  const tops = [];
  const bots = [];
  for (let c = 0; c < n; c++) {
    const t = svgEl('g', { tabindex: 0, role: 'button', 'aria-label': items[c] }, 'lad-top');
    const tt = svgEl('title'); tt.textContent = items[c];
    const tx = svgEl('text', { x: x(c), y: 19 });
    tx.textContent = fit(items[c], colW - 16, game.pre);
    // 누르는 넓이는 세로줄 폭 × 46px(보이는 이름표보다 넓게)
    t.append(tt, svgEl('rect', { x: x(c) - colW / 2, y: 0, width: colW, height: top, fill: 'transparent' }, 'lad-hit'), svgEl('rect', { x: x(c) - colW / 2 + 3, y: 3, width: colW - 6, height: 32, rx: 9 }), tx);
    t.addEventListener('click', () => walk(c));
    t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); walk(c); } });
    svg.append(t);
    tops.push(t);
    const b = svgEl('g', {}, 'lad-bot');
    const bx = svgEl('text', { x: x(c), y: total - 19, class: 'q' });
    bx.textContent = '?';
    b.append(svgEl('rect', { x: x(c) - colW / 2 + 3, y: total - 35, width: colW - 6, height: 32, rx: 9 }), bx);
    svg.append(b);
    bots.push(b);
  }
  Object.assign(game, { svg, rungs, cover, paths, tops, bots, x, y, colW });
  holder.style.display = 'block';
  holder.textContent = '';
  holder.append(svg);
  const mark = () => box.classList.toggle('more', holder.scrollWidth > holder.clientWidth + 2 && holder.scrollLeft + holder.clientWidth < holder.scrollWidth - 2);
  holder.onscroll = mark;
  mark();
  renderOut();
}

function openBottom(pos, hit) {
  const { bots, labels, g, colW, preB } = game;
  const b = bots[pos];
  b.classList.add('open');
  $$('.hit', game.svg).forEach((e) => e.classList.remove('hit'));
  if (hit) b.classList.add('hit');
  const tx = $('text', b);
  tx.removeAttribute('class');
  const full = labels[g.bottom[pos]];
  tx.textContent = fit(full, colW - 16, preB);
  if (!$('title', b)) { const tt = svgEl('title'); tt.textContent = full; b.prepend(tt); }
}

function walk(start) {
  if (!game) return;
  const mine = game; // 길을 따라가는 도중에 판이 지워지거나 새로 만들어지면 이 길의 끝 처리는 하지 않는다
  const { g, paths, tops, x, y } = game;
  const pts = tracePath(g.ladder, start);
  const d = pts.map(([c, r], i) => `${i ? 'L' : 'M'}${x(c)} ${i === 0 ? y(0) - 8 : i === pts.length - 1 ? y(r) + 8 : y(r)}`).join(' ');
  $$('path', paths).forEach((p) => p.classList.add('done'));
  tops.forEach((t, i) => t.classList.toggle('on', i === start));
  const path = svgEl('path', { d, pathLength: 1 }, 'lad-path');
  paths.append(path);
  const end = pts[pts.length - 1][0];
  const finish = () => { if (game !== mine) return; game.open.add(start); openBottom(end, true); renderOut(); };
  if (reduced() || !path.animate) { finish(); return; }
  path.style.strokeDasharray = '1 1';
  const dur = Math.min(2400, 700 + pts.length * 90);
  const anim = path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur, easing: 'cubic-bezier(.4,0,.3,1)' });
  anim.onfinish = () => { path.style.strokeDasharray = ''; finish(); };
}

function showAll() {
  if (!game) return;
  game.rungs.setAttribute('visibility', 'visible');
  game.cover.remove();
  game.items.forEach((_, i) => game.open.add(i));
  for (let pos = 0; pos < game.items.length; pos++) openBottom(pos, false);
  $('#tip').textContent = '';
  renderOut();
}

function renderOut() {
  const { items, labels, g, open, replay } = game;
  out.textContent = '';
  if (!open.size) return;
  out.append(outHead(T.ladderAll, replay && open.size === items.length));
  const ul = el('ul', 'pairs');
  items.forEach((name, i) => {
    if (!open.has(i)) return;
    const label = labels[g.result[i]];
    const li = el('li', label !== T.blank ? 'win' : '');
    li.append(el('i', null, i + 1), el('b', null, name), el('span', null, label));
    ul.append(li);
  });
  out.append(ul);
}

go.dataset.again = go.dataset.again || '';
go.addEventListener('click', () => make());
showAllBtn.addEventListener('click', showAll);
$('#copy').addEventListener('click', () => { if (game) copyLink('ladder', game.seed, game.items, { rows: game.rows, labels: game.given }); });
list.onChange(() => { if (game) reset(); setMsg(''); });
bottomEl.addEventListener('input', () => { if (game) reset(); });
$('#rows').addEventListener('click', () => { if (game) reset(); });
let rz = 0;
let lastW = holder.clientWidth;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (game && holder.clientWidth !== lastW) { lastW = holder.clientWidth; const opened = new Set(game.open); const all = !game.cover.isConnected; render(); if (all) showAll(); else opened.forEach((i) => { game.open.add(i); openBottom(game.g.ends[i], false); }); renderOut(); } }, 120); });

const shared = readShare('ladder');
if (shared && shared.items.length) {
  list.setShared(shared.items);
  const labels = Array.isArray(shared.opts.labels) ? shared.opts.labels : [];
  bottomEl.value = labels.join('\n');
  if ([8, 14, 24].includes(shared.opts.rows)) rowsSeg.set(shared.opts.rows);
  make(shared.seed, true, labels);
}
window.__pick = { get state() { return game ? { items: game.items, labels: game.labels, given: game.given, result: game.g.result, ends: game.g.ends, bottom: game.g.bottom, open: [...game.open] } : null; } };
