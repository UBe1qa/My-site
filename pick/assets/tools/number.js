// 랜덤 숫자 화면. 뽑기는 core/pick.js의 randomNumbers. 범위 밖 입력은 틀린 답 대신 안내 문구만 보여 준다(앞 결과는 지운다).
import { T, $, fmt, el, recent, safeShareUrl, copyLink, readShare, clearHash, setAfter, setMsg, outHead, nfmt, reduced } from '../app.js';
import { newSeed, makeRng } from '../core/rng.js';
import { randomNumbers, LIMITS } from '../core/pick.js';
import { readInteger } from '../core/input.js';

const out = $('#out');
const emptyHtml = out.innerHTML;
let last = null;

/** 입력칸의 정수 읽기. 전각 숫자처럼 다르게 친 글자는 읽은 값으로 고쳐 보여 준다. */
function field(id) {
  const input = $(id);
  const r = readInteger(input.value);
  if (r.ok && /[^\x20-\x7e]/.test(input.value)) input.value = String(r.value);
  return r;
}
function run(seed, replay, o) {
  const fail = (m) => { last = null; out.innerHTML = emptyHtml; setAfter(false); setMsg(m); };
  let min;
  let max;
  if (o) { min = o.min; max = o.max; } else {
    const a = field('#min');
    const b = field('#max');
    // 안내는 경우에 맞게: 자릿수가 넘침 / 정수가 아님(빈칸·소수·글자)
    if ((!a.ok && a.reason === 'too-long') || (!b.ok && b.reason === 'too-long')) return fail(T.numWide);
    if (!a.ok || !b.ok) return fail(T.numInt);
    min = a.value;
    max = b.value;
  }
  const count = o ? o.count : Number($('#count').value);
  const unique = o ? !!o.unique : $('#unique').checked;
  const sort = o ? o.sort || '' : $('#sort').value;
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) return fail(T.numInt);
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
  let nums;
  try { nums = randomNumbers(opts, makeRng(seed)); } catch (e) { return fail(T.numWide); }
  last = { seed, opts, nums };
  out.textContent = '';
  out.append(outHead(fmt(T.numHead, { a: nfmt(min), b: nfmt(max), m: nfmt(count) }), replay ? 'ok' : false));
  const box = el('div', 'bignums' + (count > 30 ? ' lots' : count > 4 ? ' many' : ''));
  if (count > 300) box.textContent = nums.map(nfmt).join('   ');
  else nums.forEach((v) => box.append(el('span', replay || reduced() ? '' : 'in', nfmt(v))));
  out.append(box);
  setAfter(true);
  if (!replay) recent.add('number', nums.slice(0, 8).map(nfmt).join(', ') + (nums.length > 8 ? ' …' : ''), safeShareUrl('number', seed, [], opts));
}

$('#go').addEventListener('click', () => run());
$('#copy').addEventListener('click', () => { if (last) copyLink('number', last.seed, [], last.opts); });

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
