// 팀 나누기 화면. 나누기는 core/pick.js의 drawTeams(인원 차이 최대 1, 명단의 순서와 상관없이 같은 팀). 실력 맞추기 같은 숨은 규칙은 없다.
import { T, $, fmt, el, list, recent, safeShareUrl, copyLink, readShare, clearHash, setAfter, setMsg, setCode, nameEl, seg, outHead, nfmt } from '../app.js';
import { listCode } from '../core/name.js';
import { newSeed, makeRng } from '../core/rng.js';
import { drawTeams } from '../core/pick.js';

const out = $('#out');
const kEl = $('#k');
const emptyHtml = out.innerHTML;
let last = null; // { seed, items, opts, teams, legacy }
const modeSeg = seg($('#mode'), (v) => { $('#lk').textContent = $(`#mode [data-v="${v}"]`).textContent; reset(); });
function reset() { last = null; out.innerHTML = emptyHtml; setAfter(false); setMsg(''); }

/** mark: 링크로 연 결과면 표시 종류('ok' | 'legacy' | 'cleaned'), 내가 나누면 없음 */
function run(seed, mark, o) {
  const replay = !!mark;
  const legacy = mark === 'legacy';
  const items = list.items.slice();
  const n = items.length;
  const mode = o ? o.mode : modeSeg.value;
  const k = Number(o ? o.k : kEl.value);
  if (n < 2) { reset(); setMsg(fmt(T.needMore, { n: 2 })); return; }
  if (!Number.isInteger(k) || k < 1 || k > n) { reset(); setMsg(fmt(mode === 'size' ? T.sizeBad : T.teamsBad, { n: nfmt(n) })); return; }
  setMsg('');
  if (!replay) clearHash();
  seed = seed || newSeed();
  const teams = drawTeams(items, mode === 'size' ? { size: k } : { teams: k }, makeRng(seed), legacy);
  last = { seed, items, opts: { mode, k }, teams, legacy };
  out.textContent = '';
  out.append(outHead(fmt(T.teamsHead, { n: nfmt(n), k: nfmt(teams.length) }), mark || false));
  const grid = el('div', 'teams');
  teams.forEach((members, i) => {
    const card = el('section', replay ? 'team' : 'team in');
    card.style.setProperty('--tc', `var(--s${(i % 8) + 1})`);
    card.style.setProperty('--i', Math.min(i, 12));
    const h = el('h3', null, fmt(T.team, { n: i + 1 }));
    h.append(el('small', null, fmt(T.people, { n: members.length })));
    const ul = el('ul');
    members.forEach((m) => ul.append(nameEl('li', items[m])));
    card.append(h, ul);
    grid.append(card);
  });
  out.append(grid);
  setAfter(true);
  setCode(n, listCode(items));
  if (!replay) recent.add('teams', fmt(T.teamsHead, { n: nfmt(n), k: nfmt(teams.length) }), safeShareUrl('teams', seed, items, last.opts));
}
function asText() {
  return last.teams.map((members, i) => `${fmt(T.team, { n: i + 1 })}: ${members.map((m) => last.items[m]).join(', ')}`).join('\n');
}

$('#go').addEventListener('click', () => run());
$('#copy').addEventListener('click', () => { if (last) copyLink('teams', last.seed, last.items, last.opts, last.legacy ? 1 : undefined); });
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
  run(shared.seed, shared.mark, { mode, k: shared.opts.k });
}
window.__pick = { get state() { return last; }, asText };
