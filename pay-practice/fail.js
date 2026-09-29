// 결제 실패 페이지: 토스가 주소 뒤에 붙여 준 code·message를 풀어서 보여 줘요.
import { fish, kv, short } from './ui.js';

document.querySelectorAll('[data-fish]').forEach((el) => el.append(fish(el.dataset.fish)));

const q = new URLSearchParams(location.search);
const code = q.get('code') || '';
const message = q.get('message') || '';
const orderId = q.get('orderId') || '';

// 자주 나오는 코드를 쉬운 말로
const EASY = {
  PAY_PROCESS_CANCELED: '결제창에서 직접 취소했어요.',
  PAY_PROCESS_ABORTED: '결제가 중간에 멈췄어요. 잠시 뒤 다시 해 보세요.',
  REJECT_CARD_COMPANY: '카드사가 결제를 거절했어요.',
  USER_CANCEL: '결제창을 닫았어요.',
};

if (code || message) {
  if (EASY[code]) document.getElementById('f-why').textContent = `${EASY[code]} 승인 전에 멈췄으니 돈은 나가지 않았어요.`;
  const rows = [
    ['이유 코드', code],
    ['토스 설명', message],
    ['주문번호', orderId && short(orderId, 16, 6)],
  ].filter(([, v]) => v);
  document.getElementById('f-kv').replaceChildren(
    ...rows.map(([k, v]) => kv(k, v)));
}
