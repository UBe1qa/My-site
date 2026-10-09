// 랜덤 숫자 화면. 뽑기는 core/pick.js의 randomNumbers. 범위 밖 입력은 틀린 답 대신 안내 문구.
import { T, $, fmt, el, recent, shareUrl, copyLink, readShare, clearHash, setAfter, setMsg, outHead, nfmt, reduced } from '../app.js';
import { newSeed, makeRng } from '../core/rng.js';
import { randomNumbers, LIMITS } from '../core/pick.js';

const out = $('#out');
const MAX = 999999999999999; // 15자리
let last = null;

function readInt(v) {
  const s = String(v).trim().replace(/[,\s_]/g, '').replace(/^[−–]/, '-');
  if (!/^-?\d{1,15}$/.test(s)) return null;
  return Number(s);
}
function run(seed, replay, o) {
  const min = o ? o.min : readInt($('#min').value);
  const max = o ? o.max : readInt($('#max').value);
  const count = o ? o.count : Number($('#count').value);
  const unique = o ? !!o.unique : $('#unique').checked;
  const sort = o ? o.sort || '' : $('#sort').value;
  const fail = (m) => { last = null; setAfter(false); setMsg(m); };
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) return fail(T.numInt);
  if (Math.abs(min) > MAX || Math.abs(max) > MAX) return fail(T.numWide);
  if (min > max) return fail(T.numOrder);
  if (!Number.isInteger(count) || count < 1 || count > LIMITS.numbersCount) return fail(T.numCount);
  const span = max - min + 1;
  if (unique && count > span) return fail(fmt(T.numUnique, { m: nfmt(count), n: nfmt(span) }));
  setMsg('');
  if (!replay) clearHash();
  seed = seed || newSeed();
  const opts = { min, max, count };
  if (unique) opts.unique = true;
  if (sort === 'asc' || sort === 'desc') opts.sort = sort;
  const nums = randomNumbers(opts, makeRng(seed));
  last = { seed, opts, nums };
  out.textContent = '';
  out.append(outHead(fmt(T.numHead, { a: nfmt(min), b: nfmt(max), m: nfmt(count) }), replay));
  const box = el('div', 'bignums' + (count > 30 ? ' lots' : count > 4 ? ' many' : ''));
  if (count > 300) box.textContent = nums.map(nfmt).join('   ');
  else nums.forEach((v) => box.append(el('span', replay || reduced() ? '' : 'in', nfmt(v))));
  out.append(box);
  setAfter(true);
  if (!replay) recent.add('number', nums.slice(0, 8).map(nfmt).join(', ') + (nums.length > 8 ? ' …' : ''), shareUrl('number', seed, [], opts));
}

$('#go').addEventListener('click', () => run());
$('#copy').addEventListener('click', () => { if (last) copyLink(shareUrl('number', last.seed, [], last.opts)); });

const shared = readShare('number');
if (shared) {
  const o = shared.opts;
  if (Number.isSafeInteger(o.min)) $('#min').value = o.min;
  if (Number.isSafeInteger(o.max)) $('#max').value = o.max;
  if (Number.isInteger(o.count)) $('#count').value = o.count;
  $('#unique').checked = !!o.unique;
  $('#sort').value = o.sort === 'asc' || o.sort === 'desc' ? o.sort : '';
  run(shared.seed, true, { min: o.min, max: o.max, count: o.count, unique: !!o.unique, sort: o.sort });
}
window.__pick = { get state() { return last; } };
