// 붕어빵 결제 연습소 — 첫 페이지: 메뉴 담기 → 결제 위젯 → 결제창 → (성공하면 /success/ 로 이동)
import { MENU, MAX_QTY, TOSS_CLIENT_KEY, cartLines, cartTotal, cartCount, makeOrderId, orderNameOf, won } from './shop.js';
import { h, fish, history, api, STATUS, when, short } from './ui.js';

const $ = (id) => document.getElementById(id);
const cart = { p: 1 }; // 처음엔 팥 붕어빵 하나를 담아 둬요 (결제 위젯은 0원으로 못 그려요)
let widgets = null;
let widgetReady = false;
let lastAmount = 0;

// 머리 막대의 작은 붕어빵
document.querySelectorAll('[data-fish]').forEach((el) => el.append(fish(el.dataset.fish)));

// ---------- 1. 메뉴 ----------
function renderMenu() {
  const list = $('menu-list');
  list.replaceChildren(
    ...MENU.map((m) => {
      const qty = h('output', { class: 'qty-n mono', id: `qty-${m.code}`, 'aria-live': 'polite' }, '0');
      const minus = h('button', { type: 'button', class: 'qty-btn', 'aria-label': `${m.name} 하나 빼기`, onclick: () => change(m.code, -1) }, '−');
      const plus = h('button', { type: 'button', class: 'qty-btn', 'aria-label': `${m.name} 하나 더 담기`, onclick: () => change(m.code, +1) }, '+');
      return h('li', { class: 'menu-item', 'data-code': m.code },
        h('div', { class: 'menu-pic' }, fish(m.filling, { mini: m.mini })),
        h('div', { class: 'menu-text' },
          h('p', { class: 'menu-name' }, m.name, ' ', h('span', { class: 'menu-unit' }, m.unit)),
          h('p', { class: 'menu-desc' }, m.desc),
          h('p', { class: 'menu-price mono' }, won(m.price))),
        h('div', { class: 'qty', role: 'group', 'aria-label': `${m.name} 수량` }, minus, qty, plus));
    }));
}

function change(code, d) {
  const next = Math.max(0, Math.min(MAX_QTY, (cart[code] || 0) + d));
  cart[code] = next;
  update();
}

// ---------- 2. 주문서 + 위젯 금액 ----------
function update() {
  for (const m of MENU) {
    const n = cart[m.code] || 0;
    $(`qty-${m.code}`).textContent = String(n);
    const li = document.querySelector(`.menu-item[data-code="${m.code}"]`);
    li.classList.toggle('is-in', n > 0);
    li.querySelector('.qty-btn:first-child').disabled = n === 0;
    li.querySelector('.qty-btn:last-child').disabled = n >= MAX_QTY;
  }

  const lines = cartLines(cart);
  const total = cartTotal(cart);
  $('order-lines').replaceChildren(
    ...(lines.length
      ? lines.map((l) => h('li', {},
          h('span', {}, `${l.item.name} ${l.item.unit}`, h('span', { class: 'mono x' }, ` ×${l.qty}`)),
          h('span', { class: 'mono' }, won(l.sum))))
      : [h('li', { class: 'empty' }, '아직 담은 게 없어요. 위에서 + 를 눌러 담아요.')]));
  $('order-count').textContent = `${cartCount(cart)}개`;
  $('order-total').textContent = won(total);
  $('try-total').textContent = won(total);

  const btn = $('pay-btn');
  btn.textContent = total ? `${won(total)} 결제하기` : '붕어빵을 담아 주세요';
  btn.disabled = !widgetReady || !total;

  if (widgets && total && total !== lastAmount) {
    lastAmount = total;
    widgets.setAmount({ currency: 'KRW', value: total }).catch(showError);
  }
}

// ---------- 결제 위젯 ----------
async function initWidget() {
  if (typeof window.TossPayments !== 'function') {
    $('widget-wait').textContent = '토스 결제 위젯을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.';
    return;
  }
  try {
    const tossPayments = window.TossPayments(TOSS_CLIENT_KEY);
    // 회원 기능이 없는 가게라 '비회원(ANONYMOUS)' 결제로 해요
    widgets = tossPayments.widgets({ customerKey: window.TossPayments.ANONYMOUS });
    lastAmount = cartTotal(cart);
    await widgets.setAmount({ currency: 'KRW', value: lastAmount }); // 금액을 먼저 정해야 그릴 수 있어요
    await Promise.all([
      widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
      widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
    ]);
    widgetReady = true;
    $('widget-wait').hidden = true;
    update();
  } catch (err) {
    $('widget-wait').textContent = `결제 위젯을 그리지 못했어요. (${err.code || ''} ${err.message || err})`;
  }
}

async function pay() {
  const total = cartTotal(cart);
  if (!widgetReady || !total) return;
  const btn = $('pay-btn');
  btn.disabled = true;
  $('pay-msg').textContent = '토스 결제창을 여는 중…';
  $('pay-msg').className = 'pay-msg';
  try {
    if (total !== lastAmount) { lastAmount = total; await widgets.setAmount({ currency: 'KRW', value: total }); }
    await widgets.requestPayment({
      orderId: makeOrderId(cart), // BB-p2s1-무작위 : 주문 내용이 번호 안에
      orderName: orderNameOf(cart),
      successUrl: `${location.origin}/success/`,
      failUrl: `${location.origin}/fail/`,
    });
    // 성공하면 토스가 successUrl 로 이동시켜요 (이 아래는 보통 실행되지 않아요)
  } catch (err) {
    showError(err);
  } finally {
    btn.disabled = !widgetReady || !cartTotal(cart);
  }
}

const SDK_ERRORS = {
  USER_CANCEL: '결제창을 닫아서 결제를 멈췄어요. 돈은 나가지 않았어요.',
  NEED_AGREEMENT_WITH_REQUIRED_TERMS: '필수 약관에 동의해야 결제할 수 있어요.',
  NEED_CARD_PAYMENT_DETAIL: '카드사를 골라 주세요.',
  NEED_REFUND_ACCOUNT_DETAIL: '환불받을 계좌 정보를 넣어 주세요.',
};

function showError(err) {
  const msg = SDK_ERRORS[err?.code] || err?.message || String(err);
  $('pay-msg').textContent = msg + (err?.code ? ` (${err.code})` : '');
  $('pay-msg').className = 'pay-msg is-err';
}

// ---------- 3. 직접 시험해 보기 ----------
async function tryIt(kind) {
  const total = cartTotal(cart);
  const out = $('try-out');
  out.hidden = false;
  if (!total) {
    out.replaceChildren(h('p', {}, '먼저 붕어빵을 하나 이상 담아 주세요.'));
    return;
  }
  const orderId = makeOrderId(cart);
  const amount = kind === 'hack' ? 100 : total;
  const sent = { paymentKey: 'fake_' + orderId.slice(-10) + '_demo', orderId, amount };
  out.replaceChildren(h('p', { class: 'mono' }, '보내는 중…'));
  const res = await api('/api/confirm', sent);

  const verdict = res.step === 2
    ? ['우리 서버가 막았어요', '토스에는 요청도 안 보냈어요.']
    : res.step === 3
      ? ['우리 서버는 통과, 토스가 거절했어요', '금액은 맞았지만, 토스에 그런 결제 기록이 없어서예요.']
      : [res.ok ? '승인됐어요?!' : '응답', ''];

  out.replaceChildren(
    h('div', { class: 'try-row' }, h('span', { class: 'try-k' }, '보낸 값'),
      h('code', {}, `주문번호 ${orderId}\n금액 ${won(amount)}${kind === 'hack' ? ` (원래 ${won(total)})` : ''}\n결제 키 ${sent.paymentKey}`)),
    h('div', { class: 'try-row' }, h('span', { class: 'try-k' }, '서버 답'),
      h('code', {}, `${res.code || (res.ok ? 'OK' : '')}\n${res.message || ''}`)),
    h('p', { class: 'try-verdict' }, h('b', {}, verdict[0]), ' ', verdict[1]));
}

// ---------- 4. 내 테스트 결제 ----------
async function renderMine() {
  const list = $('mine-list');
  const items = history.list();
  if (!items.length) {
    list.replaceChildren(h('li', { class: 'mine-empty' }, '아직 결제한 기록이 없어요. 결제를 마치면 여기에 쌓여요.'));
    return;
  }
  list.replaceChildren(...items.map((it) => {
    const status = h('span', { class: `pill pill--${it.status || 'DONE'}` }, STATUS[it.status] || '확인 중…');
    const act = h('div', { class: 'mine-act' });
    const li = h('li', { class: 'mine-item' },
      h('div', { class: 'mine-main' },
        h('p', { class: 'mine-name' }, it.orderName, ' ', status),
        h('p', { class: 'mine-meta mono' }, `${won(it.amount)} · ${when(it.at)} · ${short(it.orderId, 14, 4)}`)),
      act);
    refreshItem(it, status, act);
    return li;
  }));
}

async function refreshItem(it, status, act) {
  const res = await api(`/api/payments/${encodeURIComponent(it.paymentKey)}`);
  if (!res.ok) {
    status.textContent = '확인 못 함';
    act.replaceChildren(h('button', { type: 'button', class: 'btn btn-sm btn-line', onclick: () => { history.remove(it.paymentKey); renderMine(); } }, '목록에서 지우기'));
    return;
  }
  const p = res.payment;
  history.save(p);
  status.textContent = STATUS[p.status] || p.status;
  status.className = `pill pill--${p.status}`;
  const btns = [];
  if (p.receiptUrl) btns.push(h('a', { class: 'btn btn-sm btn-line', href: p.receiptUrl, target: '_blank', rel: 'noopener' }, '영수증'));
  btns.push(h('a', { class: 'btn btn-sm btn-line', href: `success/?paymentKey=${encodeURIComponent(p.paymentKey)}&orderId=${encodeURIComponent(p.orderId)}&amount=${p.totalAmount}&view=1` }, '자세히'));
  if (['DONE', 'PARTIAL_CANCELED', 'WAITING_FOR_DEPOSIT'].includes(p.status)) {
    const refund = h('button', { type: 'button', class: 'btn btn-sm btn-stamp' }, '환불');
    refund.addEventListener('click', async () => {
      if (refund.dataset.sure !== '1') { refund.dataset.sure = '1'; refund.textContent = '정말 환불? 한 번 더'; return; }
      refund.disabled = true; refund.textContent = '환불 중…';
      const r = await api('/api/cancel', { paymentKey: p.paymentKey, reason: '연습용 환불 (목록에서)' });
      if (r.ok) { history.save(r.payment); renderMine(); }
      else { refund.disabled = false; refund.textContent = '환불'; delete refund.dataset.sure; alert(r.message || '환불을 못 했어요.'); }
    });
    btns.push(refund);
  }
  act.replaceChildren(...btns);
}

// ---------- 시작 ----------
renderMenu();
update();
renderMine();
$('pay-btn').addEventListener('click', pay);
$('try-hack').addEventListener('click', () => tryIt('hack'));
$('try-fake').addEventListener('click', () => tryIt('fake'));
initWidget();

// 결제창을 닫고 돌아왔을 때(뒤로 가기 캐시) 기록을 새로 읽어요
window.addEventListener('pageshow', (e) => { if (e.persisted) renderMine(); });
