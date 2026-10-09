// 동전 던지기 화면. 한 번 = 무작위 비트 하나(core/pick.js flipCoins: 0 = 앞, 1 = 뒤).
import { T, $, fmt, el, recent, shareUrl, copyLink, readShare, clearHash, setAfter, setMsg, nfmt, reduced, showStamp } from '../app.js';
import { newSeed, makeRng } from '../core/rng.js';
import { flipCoins, LIMITS } from '../core/pick.js';

const coin = $('#coin');
const sum = $('#sum');
const tally = $('#tally');
let last = null;

function run(seed, replay, o) {
  const count = Number(o ? o.count : $('#count').value);
  if (!Number.isInteger(count) || count < 1 || count > LIMITS.coinCount) { last = null; setAfter(false); setMsg(T.coinCount); return; }
  setMsg('');
  if (!replay) clearHash();
  seed = seed || newSeed();
  const flips = flipCoins(count, makeRng(seed));
  last = { seed, opts: { count }, flips };
  const final = flips[flips.length - 1];
  coin.className = 'coin ' + (final ? 'tails' : 'heads');
  coin.textContent = final ? T.tails : T.heads;
  if (!replay && !reduced()) { void coin.offsetWidth; coin.classList.add('flip'); }
  const heads = flips.filter((v) => v === 0).length;
  sum.textContent = count > 1 ? fmt(T.coinTally, { a: nfmt(heads), b: nfmt(count - heads) }) : '';
  if (replay) { const s = el('span', 'stamp' + (reduced() ? '' : ' in'), T.stamp); s.setAttribute('aria-label', T.stampSr); sum.append(s); }
  tally.textContent = '';
  if (count > 1 && count <= 300) flips.forEach((v) => tally.append(el('i', v ? 't' : 'h', (v ? T.tails : T.heads).slice(0, 1))));
  setAfter(true);
  if (!replay) recent.add('coin', count > 1 ? fmt(T.coinTally, { a: heads, b: count - heads }) : (final ? T.tails : T.heads), shareUrl('coin', seed, [], { count }));
}

$('#go').addEventListener('click', () => run());
$('#copy').addEventListener('click', () => { if (last) copyLink(shareUrl('coin', last.seed, [], last.opts)); });
const shared = readShare('coin');
if (shared) {
  if (Number.isInteger(shared.opts.count)) $('#count').value = shared.opts.count;
  run(shared.seed, true, { count: shared.opts.count === undefined ? 1 : shared.opts.count });
}
window.__pick = { get state() { return last; } };
