// 제비뽑기 화면: 몇 명 뽑기 / 당첨·꽝 쪽지 / 순서 정하기. 뽑기는 core/pick.js가 한다(명단의 순서와 상관없이 같은 사람이 뽑힌다).
// 결과(last)는 뽑은 순간의 명단을 잡아 둔 것이고, 명단이 바뀌면 그 결과는 지운다.
import { T, $, $$, fmt, el, list, recent, safeShareUrl, copyLink, readShare, clearHash, setAfter, setMsg, seg, outHead, nfmt } from '../app.js';
import { newSeed, makeRng } from '../core/rng.js';
import { drawSome, drawSlips, drawOrder } from '../core/pick.js';
import { cleanName } from '../core/share.js';

const out = $('#out');
const mEl = $('#m');
const lcount = $('#lcount');
const emptyHtml = out.innerHTML;
let last = null; // { seed, items, opts, legacy }

const modeSeg = seg($('#mode'), (v) => { paintMode(v); reset(); });
function paintMode(v) {
  $('#fcount').hidden = v === 'order';
  $('#sliplabels').hidden = v !== 'slips';
  if (v !== 'order') lcount.textContent = lcount.dataset[v];
}
function reset() { last = null; out.innerHTML = emptyHtml; setAfter(false); setMsg(''); }

function run(seed, replay, o, legacy) {
  const items = list.items.slice();
  const n = items.length;
  const mode = o ? o.mode : modeSeg.value;
  if (n < 1 || (mode !== 'pick' && n < 2)) { reset(); setMsg(fmt(T.needMore, { n: mode === 'pick' ? 1 : 2 })); return; }
  const m = mode === 'order' ? n : Number(o ? o.m : mEl.value);
  // 안내는 경우에 맞게: 숫자가 아니거나 1보다 작을 때 / 명단보다 많을 때
  if (!Number.isInteger(m) || m < 1) { reset(); setMsg(mode === 'slips' ? T.slipsBad : T.pickBad); return; }
  if (m > n) { reset(); setMsg(fmt(mode === 'slips' ? T.slipsTooMany : T.pickTooMany, { n: nfmt(n) })); return; }
  const win = cleanName(o ? o.win || T.win : $('#winlabel').value) || T.win;
  const lose = cleanName(o ? o.lose || T.lose : $('#loselabel').value) || T.lose;
  setMsg('');
  if (!replay) clearHash();
  seed = seed || newSeed();
  const rng = makeRng(seed);
  const opts = mode === 'slips' ? { mode, m, win, lose } : mode === 'pick' ? { mode, m } : { mode };
  last = { seed, items, opts, legacy: !!legacy };
  const stamp = replay ? (legacy ? 'legacy' : true) : false;
  out.textContent = '';
  let summary = '';
  if (mode === 'slips') {
    const dealt = drawSlips(items, [{ label: win, count: m }, { label: lose, count: n - m }], rng, !!legacy);
    const openAll = el('button', 'btn btn-sm', T.openAll);
    openAll.type = 'button';
    out.append(outHead(fmt(T.slipsHead, { n: nfmt(n) }), stamp, openAll));
    const ul = el('ul', 'slips');
    const open = (b, k) => { if (b.classList.contains('open')) return; b.classList.add('open'); if (k === 0) b.classList.add('win'); $('span', b).textContent = k === 0 ? win : lose; b.setAttribute('aria-expanded', 'true'); };
    dealt.forEach((k, i) => {
      const li = el('li');
      const b = el('button', 'slip');
      b.type = 'button';
      b.setAttribute('aria-expanded', 'false');
      b.append(el('b', null, items[i]), el('span', null, T.slipClosed));
      b.addEventListener('click', () => open(b, k));
      li.append(b);
      ul.append(li);
      if (replay) open(b, k);
    });
    openAll.addEventListener('click', () => $$('.slip', ul).forEach((b, i) => open(b, dealt[i])));
    out.append(ul);
    summary = `${win}: ` + dealt.map((k, i) => (k === 0 ? items[i] : null)).filter(Boolean).slice(0, 5).join(', ');
  } else {
    const idx = mode === 'order' ? drawOrder(items, rng, !!legacy) : drawSome(items, m, rng, !!legacy);
    out.append(outHead(mode === 'order' ? T.order : fmt(T.pickedN, { n: nfmt(n), m: nfmt(m) }), stamp));
    const ol = el('ol', mode === 'order' || m > 12 ? 'picked order' : 'picked');
    idx.forEach((v, i) => { const li = el('li'); li.append(el('i', null, i + 1), el('span', null, items[v])); ol.append(li); });
    out.append(ol);
    summary = idx.slice(0, 5).map((v) => items[v]).join(', ') + (idx.length > 5 ? ' …' : '');
  }
  setAfter(true);
  if (!replay) recent.add('draw', summary, safeShareUrl('draw', seed, items, opts));
}

$('#go').addEventListener('click', () => run());
$('#copy').addEventListener('click', () => { if (last) copyLink('draw', last.seed, last.items, last.opts, last.legacy ? 1 : undefined); });
list.onChange(() => { if (last) reset(); setMsg(''); });

paintMode(modeSeg.value);
const shared = readShare('draw');
if (shared && shared.items.length) {
  const o = shared.opts;
  const mode = ['pick', 'slips', 'order'].includes(o.mode) ? o.mode : 'pick';
  list.setShared(shared.items);
  modeSeg.set(mode);
  paintMode(mode);
  if (Number.isInteger(o.m)) mEl.value = o.m;
  if (typeof o.win === 'string') $('#winlabel').value = o.win;
  if (typeof o.lose === 'string') $('#loselabel').value = o.lose;
  run(shared.seed, true, { mode, m: o.m, win: o.win, lose: o.lose }, shared.legacy);
}
window.__pick = { get state() { return last; } };
