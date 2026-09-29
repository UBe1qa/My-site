// 결제 확인 페이지: 토스가 붙여 준 값으로 우리 서버에 '승인'을 부탁하고, 단계마다 결과를 영수증에 찍어요.
import { won } from './shop.js';
import { h, fish, kv, history, api, STATUS, when, short, methodText } from './ui.js';

const $ = (id) => document.getElementById(id);
document.querySelectorAll('[data-fish]').forEach((el) => el.append(fish(el.dataset.fish)));

const q = new URLSearchParams(location.search);
const input = { paymentKey: q.get('paymentKey'), orderId: q.get('orderId'), amount: q.get('amount') };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pause = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

function step(n, state, ...body) {
  const li = document.querySelector(`[data-step="${n}"]`);
  li.dataset.state = state; // doing | ok | fail | skip
  li.querySelector('.step-body').replaceChildren(...body.filter((x) => x != null && x !== false));
}


function setTitle(text, stamp, tone) {
  $('r-title').textContent = text;
  const s = $('r-stamp');
  s.hidden = !stamp;
  s.textContent = stamp || '';
  s.dataset.tone = tone || '';
  document.title = `${text} | 붕어빵 결제 연습소`;
}

async function run() {
  $('r-when').textContent = when(new Date().toISOString());

  if (!input.paymentKey || !input.orderId || !input.amount) {
    setTitle('확인할 결제가 없어요', '', '');
    step(1, 'fail', h('p', {}, '이 페이지는 토스 결제창에서 결제를 마치면 열려요. 주소에 결제 정보가 없어요.'));
    ['2', '3', '4'].forEach((n) => step(n, 'skip'));
    $('acts').replaceChildren(h('a', { class: 'btn btn-ink', href: '../#menu' }, '붕어빵 고르러 가기'));
    return;
  }

  // 1. 토스가 주소에 붙여 준 값
  if (q.get('view') === '1') document.querySelector('[data-step="1"] b').textContent = '결제 기록을 다시 열었어요';
  step(1, 'ok',
    kv('주문번호', short(input.orderId, 16, 6)),
    kv('금액', won(input.amount)),
    kv('결제 키', short(input.paymentKey, 12, 4)));
  step(2, 'doing', h('p', { class: 'mono dim' }, '계산하는 중…'));
  await pause(450);

  // view=1 : 목록의 '자세히'로 다시 연 경우 → 승인하지 않고 지금 상태만 조회
  const view = q.get('view') === '1';
  const res = view
    ? { ...(await api(`/api/payments/${encodeURIComponent(input.paymentKey)}`)), already: true }
    : await api('/api/confirm', input);
  $('raw').textContent = JSON.stringify(res, null, 2);

  // 2. 서버의 금액 확인
  const check = res.check || (res.step === 2 ? res : null);
  if (check && check.lines) {
    const rows = check.lines.map((l) => kv(`${l.name} ${l.unit} ×${l.qty}`, won(l.sum)));
    const same = check.expected === Number(input.amount);
    step(2, same ? 'ok' : 'fail', ...rows,
      kv('서버가 계산한 금액', won(check.expected), 'kv-sum'),
      h('p', { class: same ? 'good' : 'bad' }, same ? `보낸 금액 ${won(input.amount)}과 같아요 ✓` : `보낸 금액은 ${won(input.amount)} — 달라서 멈췄어요`));
  } else if (res.step === 2) {
    step(2, 'fail', h('p', { class: 'bad' }, res.message));
  } else if (!res.ok && !res.step) {
    step(2, 'fail', h('p', { class: 'bad' }, res.message || '서버에 닿지 못했어요.'));
  }

  if (!res.ok) {
    if (view) {
      step(3, 'skip', h('p', { class: 'dim' }, '기록 조회만 했어요. 승인 요청은 보내지 않아요.'));
      step(4, 'skip');
      setTitle('결제 기록을 찾지 못했어요', '', '');
      $('acts').replaceChildren(h('a', { class: 'btn btn-ink', href: '../#mine' }, '내 결제 목록으로'));
      return;
    }
    if (res.step === 3) {
      await pause(350);
      step(3, 'fail', h('p', { class: 'bad' }, res.message), kv('토스 코드', res.code));
    } else {
      step(3, 'skip', h('p', { class: 'dim' }, '금액 확인을 통과하지 못해 토스에 요청하지 않았어요.'));
    }
    step(4, 'skip');
    setTitle('승인하지 않았어요', '승인 안 됨', 'bad');
    $('acts').replaceChildren(h('a', { class: 'btn btn-ink', href: '../#menu' }, '다시 해 보기'));
    return;
  }

  await pause(350);
  const p = res.payment;
  // 3. 토스 승인
  step(3, 'ok',
    res.already ? h('p', { class: 'dim' }, '이미 승인된 결제라 지금 상태를 다시 조회했어요.') : null,
    kv('승인 시각', when(p.approvedAt) || '-'),
    kv('결제 수단', methodText(p) || '-'),
    p.virtualAccount ? kv('입금 기한', when(p.virtualAccount.dueDate)) : null);
  await pause(300);

  history.save(p);
  showDone(p);
}

function showDone(p) {
  const canceled = p.status === 'CANCELED';
  const waiting = p.status === 'WAITING_FOR_DEPOSIT';
  step(4, canceled ? 'refund' : 'ok',
    kv('상태', STATUS[p.status] || p.status),
    kv('결제 금액', won(p.totalAmount)),
    ...(p.cancels || []).map((c) => kv(`환불 ${when(c.at)}`, `−${won(c.amount)}`)),
    waiting ? h('p', { class: 'dim' }, '가상계좌는 입금해야 결제가 끝나요. 테스트라 입금할 필요는 없어요.') : null);

  if (canceled) setTitle('환불까지 끝났어요', '환불됨', 'refund');
  else if (waiting) setTitle('입금을 기다리는 중이에요', '입금 대기', 'wait');
  else setTitle(`${won(p.totalAmount)} 결제됐어요`, '결제 완료', 'ok');

  const acts = [];
  if (p.receiptUrl) acts.push(h('a', { class: 'btn btn-line', href: p.receiptUrl, target: '_blank', rel: 'noopener' }, '토스 영수증 보기'));
  if (['DONE', 'PARTIAL_CANCELED', 'WAITING_FOR_DEPOSIT'].includes(p.status)) {
    const btn = h('button', { type: 'button', class: 'btn btn-stamp' }, '환불하기');
    const note = h('p', { class: 'pay-msg', role: 'status' });
    btn.addEventListener('click', async () => {
      if (btn.dataset.sure !== '1') {
        btn.dataset.sure = '1';
        btn.textContent = '정말 환불할까요? 한 번 더 누르기';
        return;
      }
      btn.disabled = true;
      btn.textContent = '환불하는 중…';
      const r = await api('/api/cancel', { paymentKey: p.paymentKey, reason: '연습용 환불' });
      $('raw').textContent = JSON.stringify(r, null, 2);
      if (r.ok) {
        history.save(r.payment);
        showDone(r.payment);
      } else {
        btn.disabled = false;
        btn.textContent = '환불하기';
        delete btn.dataset.sure;
        note.textContent = `${r.message || '환불을 못 했어요.'} (${r.code || ''})`;
        note.className = 'pay-msg is-err';
      }
    });
    acts.push(btn, note);
  }
  acts.push(h('a', { class: 'btn btn-ink', href: '../#menu' }, '또 사러 가기'));
  $('acts').replaceChildren(...acts);
}

run().catch((err) => {
  setTitle('문제가 생겼어요', '', '');
  step(2, 'fail', h('p', { class: 'bad' }, String(err?.message || err)));
});
