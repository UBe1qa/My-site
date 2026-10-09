// 팀 나누기 화면. 나누기는 core/pick.js의 splitTeams(인원 차이 최대 1). 실력 맞추기 같은 숨은 규칙은 없다.
import { T, $, fmt, el, list, recent, shareUrl, copyLink, readShare, clearHash, setAfter, setMsg, seg, outHead, nfmt } from '../app.js';
import { newSeed, makeRng } from '../core/rng.js';
import { splitTeams } from '../core/pick.js';

const out = $('#out');
const kEl = $('#k');
const emptyHtml = out.innerHTML;
let last = null;
const modeSeg = seg($('#mode'), (v) => { $('#lk').textContent = $(`#mode [data-v="${v}"]`).textContent; reset(); });
function reset() { last = null; out.innerHTML = emptyHtml; setAfter(false); setMsg(''); }

function run(seed, replay, o) {
  const items = list.items.slice();
  const n = items.length;
  const mode = o ? o.mode : modeSeg.value;
  const k = Number(o ? o.k : kEl.value);
  if (n < 2) { reset(); setMsg(fmt(T.needMore, { n: 2 })); return; }
  if (!Number.isInteger(k) || k < 1 || k > n) { reset(); setMsg(fmt(mode === 'size' ? T.sizeBad : T.teamsBad, { n: nfmt(n) })); return; }
  setMsg('');
  if (!replay) clearHash();
  seed = seed || newSeed();
  const teams = splitTeams(n, mode === 'size' ? { size: k } : { teams: k }, makeRng(seed));
  last = { seed, items, opts: { mode, k }, teams };
  out.textContent = '';
  out.append(outHead(fmt(T.teamsHead, { n: nfmt(n), k: nfmt(teams.length) }), replay));
  const grid = el('div', 'teams');
  teams.forEach((members, i) => {
    const card = el('section', replay ? 'team' : 'team in');
    card.style.setProperty('--tc', `var(--s${(i % 8) + 1})`);
    card.style.setProperty('--i', Math.min(i, 12));
    const h = el('h3', null, fmt(T.team, { n: i + 1 }));
    h.append(el('small', null, fmt(T.people, { n: members.length })));
    const ul = el('ul');
    members.forEach((m) => ul.append(el('li', null, items[m])));
    card.append(h, ul);
    grid.append(card);
  });
  out.append(grid);
  setAfter(true);
  if (!replay) recent.add('teams', fmt(T.teamsHead, { n: nfmt(n), k: nfmt(teams.length) }), shareUrl('teams', seed, items, last.opts));
}
function asText() {
  return last.teams.map((members, i) => `${fmt(T.team, { n: i + 1 })}: ${members.map((m) => last.items[m]).join(', ')}`).join('\n');
}

$('#go').addEventListener('click', () => run());
$('#copy').addEventListener('click', () => { if (last) copyLink(shareUrl('teams', last.seed, last.items, last.opts)); });
$('#copytext').addEventListener('click', async () => {
  if (!last) return;
  try { await navigator.clipboard.writeText(asText()); $('#toast').textContent = T.copiedText; } catch (e) { $('#toast').textContent = asText(); }
});
list.onChange(() => { if (last) reset(); setMsg(''); });

const shared = readShare('teams');
if (shared && shared.items.length) {
  const mode = shared.opts.mode === 'size' ? 'size' : 'teams';
  list.setShared(shared.items);
  modeSeg.set(mode);
  $('#lk').textContent = $(`#mode [data-v="${mode}"]`).textContent;
  if (Number.isInteger(shared.opts.k)) kEl.value = shared.opts.k;
  run(shared.seed, true, { mode, k: shared.opts.k });
}
window.__pick = { get state() { return last; }, asText };
