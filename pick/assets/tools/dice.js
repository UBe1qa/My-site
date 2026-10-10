// 주사위 화면. 주사위마다 1~면 수에서 따로 하나씩(core/pick.js rollDice). 6면은 점으로, 나머지는 숫자로. 틀린 입력이면 앞 결과를 지우고 안내만.
import { T, $, fmt, el, recent, safeShareUrl, copyLink, readShare, clearHash, setAfter, setMsg, outHead, nfmt, reduced } from '../app.js';
import { newSeed, makeRng } from '../core/rng.js';
import { rollDice, LIMITS } from '../core/pick.js';

const out = $('#out');
const PIPS = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[26, 26], [50, 50], [74, 74]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]], 6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]] };
const emptyHtml = out.innerHTML;
let last = null;

function face(v, sides) {
  const d = el('div', 'die');
  d.setAttribute('role', 'img');
  d.setAttribute('aria-label', String(v));
  if (sides === 6) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    for (const [cx, cy] of PIPS[v]) { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 9.5); svg.append(c); }
    d.append(svg);
  } else d.textContent = v;
  return d;
}
function run(seed, replay, o) {
  const count = Number(o ? o.count : $('#count').value);
  const sides = Number(o ? o.sides : $('#sides').value);
  const fail = (m) => { last = null; out.innerHTML = emptyHtml; setAfter(false); setMsg(m); };
  if (!Number.isInteger(count) || count < 1 || count > LIMITS.diceCount) return fail(T.diceCount);
  if (!Number.isInteger(sides) || sides < 2 || sides > LIMITS.diceSides) return fail(T.diceSides);
  setMsg('');
  if (!replay) clearHash();
  seed = seed || newSeed();
  const vals = rollDice(count, sides, makeRng(seed));
  const total = vals.reduce((a, b) => a + b, 0);
  last = { seed, opts: { count, sides }, vals, total };
  out.textContent = '';
  out.append(outHead(fmt(T.diceSum, { n: nfmt(total) }), replay ? 'ok' : false));
  const box = el('div', 'dice' + (count > 6 ? ' many' : ''));
  vals.forEach((v) => { const d = face(v, sides); if (!replay && !reduced()) d.classList.add('in'); box.append(d); });
  out.append(box);
  setAfter(true);
  if (!replay) recent.add('dice', `${vals.slice(0, 10).join(', ')}${vals.length > 10 ? ' …' : ''} (${fmt(T.diceSum, { n: nfmt(total) })})`, safeShareUrl('dice', seed, [], last.opts));
}

$('#go').addEventListener('click', () => run());
$('#copy').addEventListener('click', () => { if (last) copyLink('dice', last.seed, [], last.opts); });
const shared = readShare('dice');
if (shared) {
  if (Number.isInteger(shared.opts.count)) $('#count').value = shared.opts.count;
  if (Number.isInteger(shared.opts.sides)) $('#sides').value = shared.opts.sides;
  run(shared.seed, true, { count: shared.opts.count, sides: shared.opts.sides });
}
window.__pick = { get state() { return last; } };
