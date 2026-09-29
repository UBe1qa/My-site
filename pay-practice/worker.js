// 붕어빵 결제 연습소 — 서버 코드 (Cloudflare Worker)
// 화면 파일(html·css·js)은 Cloudflare가 그대로 보내 주고, /api/ 로 시작하는 주소만 이 코드가 처리해요.
//
//   POST /api/confirm          결제창에서 돌아온 결제를 '승인'  (금액을 다시 계산해 맞을 때만 토스에 요청)
//   GET  /api/payments/:키     결제 한 건 조회
//   POST /api/cancel           결제 취소(환불)
//
// 시크릿 키는 절대 화면(브라우저)에 보내지 않아요. 여기서만 씁니다.

import { parseOrderId, cartLines, cartTotal, won, ORDER_PREFIX } from './shop.js';

// 토스페이먼츠 '문서용 테스트 키' 중 시크릿 키. 토스 공식 샘플 코드에 공개된 테스트 전용 키라
// 돈이 움직이지 않아요. 내 키(또는 실제 결제 키)를 쓸 땐 여기 적지 말고
// Cloudflare → Workers & Pages → pay-practice → Settings → Variables and Secrets 에
// 비밀값(Secret) 이름 TOSS_SECRET_KEY 로 넣으세요. 그러면 그 값이 먼저 쓰여요.
const DOCS_TEST_SECRET_KEY = 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
const TOSS = 'https://api.tosspayments.com/v1/payments';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await route(request, env, url);
    } catch (err) {
      console.error(err);
      return json({ ok: false, code: 'SERVER_ERROR', message: '서버에서 문제가 생겼어요. 잠시 뒤 다시 해 보세요.' }, 500);
    }
  },
};

async function route(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/confirm' && method === 'POST') return confirm(await body(request), env);
  if (path === '/api/cancel' && method === 'POST') return cancel(await body(request), env);

  const m = path.match(/^\/api\/payments\/([A-Za-z0-9_-]{10,200})$/);
  if (m && method === 'GET') {
    const r = await lookup(m[1], env);
    if (!r.ok) return json(r, r.status || 400);
    return json({ ok: true, mode: mode(env), check: checkOrder(r.payment.orderId, r.payment.totalAmount), payment: r.payment });
  }

  return json({ ok: false, code: 'NOT_FOUND', message: '없는 주소예요.' }, 404);
}

// ---------- 승인 ----------
// 결제창에서 돌아올 때 받은 paymentKey·orderId·amount 세 가지를 받아요.
async function confirm(input, env) {
  const { paymentKey, orderId } = input;
  const amount = Number(input.amount);

  if (!validKey(paymentKey)) {
    return json({ ok: false, step: 1, code: 'BAD_PAYMENT_KEY', message: '결제 키(paymentKey)가 없거나 모양이 이상해요.' }, 400);
  }

  // 2단계: 주문번호 속 주문 내용으로 금액을 다시 계산해서, 화면이 보낸 금액과 비교
  const check = checkOrder(orderId, amount);
  if (!check.ok) return json({ ...check, step: 2 }, 400);

  // 3단계: 토스에 승인 요청 (여기서 실제로 결제가 확정돼요)
  const res = await toss(env, '/confirm', { method: 'POST', body: { paymentKey, orderId, amount } });

  if (res.ok) return json({ ok: true, mode: mode(env), check, payment: slim(res.data) });

  // 이미 승인한 결제(새로고침 등) → 지금 상태를 조회해서 보여 줘요
  if (res.data.code === 'ALREADY_PROCESSED_PAYMENT') {
    const found = await lookup(paymentKey, env);
    if (found.ok && found.payment.orderId === orderId) {
      return json({ ok: true, already: true, mode: mode(env), check, payment: found.payment });
    }
  }

  return json({ ok: false, step: 3, code: res.data.code || 'TOSS_ERROR', message: res.data.message || '토스가 승인을 거절했어요.', check }, res.status || 400);
}

function checkOrder(orderId, amount) {
  const order = parseOrderId(orderId);
  if (!order) {
    return { ok: false, code: 'BAD_ORDER_ID', message: '우리 가게 주문번호 모양이 아니라 승인하지 않았어요.' };
  }
  const expected = cartTotal(order.cart);
  const lines = cartLines(order.cart).map((l) => ({ name: l.item.name, unit: l.item.unit, qty: l.qty, sum: l.sum }));
  if (!Number.isInteger(amount) || amount !== expected) {
    return {
      ok: false,
      code: 'AMOUNT_MISMATCH',
      message: `주문 내용으로 계산하면 ${won(expected)}인데 ${won(amount)}이 왔어요. 금액이 바뀐 것 같아 승인하지 않았어요.`,
      expected,
      received: Number.isFinite(amount) ? amount : null,
      lines,
    };
  }
  return { ok: true, expected, received: amount, lines };
}

// ---------- 조회 ----------
async function lookup(paymentKey, env) {
  if (!validKey(paymentKey)) return { ok: false, status: 400, code: 'BAD_PAYMENT_KEY', message: '결제 키 모양이 이상해요.' };
  const res = await toss(env, '/' + encodeURIComponent(paymentKey), { method: 'GET' });
  if (!res.ok) return { ok: false, status: res.status, code: res.data.code || 'TOSS_ERROR', message: res.data.message || '결제를 찾지 못했어요.' };
  // 문서용 테스트 키는 전 세계가 같이 써요 → 우리 가게 주문번호인 것만 다뤄요
  if (!String(res.data.orderId || '').startsWith(ORDER_PREFIX + '-')) {
    return { ok: false, status: 404, code: 'NOT_OUR_ORDER', message: '우리 가게 결제가 아니에요.' };
  }
  return { ok: true, payment: slim(res.data) };
}

// ---------- 취소(환불) ----------
async function cancel(input, env) {
  const { paymentKey } = input;
  const reason = String(input.reason || '연습용 환불').slice(0, 200);

  const found = await lookup(paymentKey, env);
  if (!found.ok) return json(found, found.status || 400);
  if (found.payment.status === 'CANCELED') {
    return json({ ok: true, already: true, mode: mode(env), payment: found.payment });
  }
  if (!['DONE', 'PARTIAL_CANCELED', 'WAITING_FOR_DEPOSIT'].includes(found.payment.status)) {
    return json({ ok: false, code: 'NOT_CANCELABLE', message: `지금 상태(${found.payment.status})에선 환불할 수 없어요.` }, 400);
  }

  const res = await toss(env, '/' + encodeURIComponent(paymentKey) + '/cancel', {
    method: 'POST',
    body: { cancelReason: reason },
    // 같은 환불 요청이 두 번 가도 한 번만 처리되게 (토스 멱등키)
    idempotencyKey: 'cancel-' + paymentKey,
  });
  if (!res.ok) return json({ ok: false, code: res.data.code || 'TOSS_ERROR', message: res.data.message || '환불을 못 했어요.' }, res.status || 400);
  return json({ ok: true, mode: mode(env), payment: slim(res.data) });
}

// ---------- 도우미 ----------
async function toss(env, path, { method, body: data, idempotencyKey }) {
  const secret = env.TOSS_SECRET_KEY || DOCS_TEST_SECRET_KEY;
  // 토스 인증: 'Basic ' + base64('시크릿키:') — 비밀번호 없이 키 뒤에 콜론
  const headers = { Authorization: 'Basic ' + btoa(secret + ':') };
  if (data) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey.slice(0, 300);
  const res = await fetch(TOSS + path, { method, headers, body: data ? JSON.stringify(data) : undefined });
  let json = {};
  try { json = await res.json(); } catch { /* 빈 응답 */ }
  return { ok: res.ok, status: res.status, data: json };
}

// 토스 응답에서 화면에 필요한 것만 추려서 보내요
function slim(p) {
  return {
    paymentKey: p.paymentKey,
    orderId: p.orderId,
    orderName: p.orderName,
    status: p.status,
    method: p.method,
    totalAmount: p.totalAmount,
    balanceAmount: p.balanceAmount,
    requestedAt: p.requestedAt,
    approvedAt: p.approvedAt,
    receiptUrl: p.receipt?.url || null,
    card: p.card ? { number: p.card.number, cardType: p.card.cardType, installment: p.card.installmentPlanMonths } : null,
    easyPay: p.easyPay?.provider || null,
    virtualAccount: p.virtualAccount ? { bank: p.virtualAccount.bankCode, dueDate: p.virtualAccount.dueDate } : null,
    cancels: (p.cancels || []).map((c) => ({ amount: c.cancelAmount, at: c.canceledAt, reason: c.cancelReason })),
  };
}

function mode(env) {
  const key = env.TOSS_SECRET_KEY || DOCS_TEST_SECRET_KEY;
  return key.startsWith('test_') ? 'test' : 'live';
}

function validKey(k) {
  return typeof k === 'string' && /^[A-Za-z0-9_-]{10,200}$/.test(k);
}

async function body(request) {
  try {
    const data = await request.json();
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
