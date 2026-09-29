// 여러 페이지가 같이 쓰는 도우미: 글자 넣기, 붕어빵 그림, 내 결제 기록(이 브라우저에만 저장)

// 요소 만들기. 글자는 항상 textContent로 넣어요 (HTML로 해석되지 않게).
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// 붕어빵 그림 (직접 그린 SVG). filling = redbean | custard | pizza
export function fish(filling = 'redbean', { mini = false } = {}) {
  const tpl = document.createElement('template');
  tpl.innerHTML = `<svg class="fish${mini ? ' fish--mini' : ''}" viewBox="0 0 120 64" aria-hidden="true" focusable="false">
    <path class="fish-body" d="M10,32 C10,14 34,6 58,8 C74,9 86,16 95,25 L107,13 C111,9 117,11 116,17 L111,32 L116,47 C117,53 111,55 107,51 L95,39 C86,48 74,55 58,56 C34,58 10,50 10,32 Z"/>
    <path class="fish-bite fill-${filling}" d="M72,56 C70,50 74,46 79,47 C82,43 88,44 89,48 C86,52 80,55 72,56 Z"/>
    <circle class="fish-eye" cx="25" cy="26" r="3.4"/>
    <g class="fish-line">
      <path d="M13,36 q5,2 9,0"/>
      <path d="M38,15 Q47,32 38,49"/>
      <path class="fish-scale" d="M50,22 q5,6 10,0 M62,22 q5,6 10,0 M74,24 q4,5 8,0 M50,34 q5,6 10,0 M62,34 q5,6 10,0 M74,34 q4,5 8,0 M56,45 q5,5 10,0"/>
      <path d="M104,22 L110,32 L104,42"/>
    </g>
  </svg>`;
  return tpl.content.firstElementChild;
}

// ---------- 내 테스트 결제 기록 (이 브라우저에만) ----------
const KEY = 'bbpay.history.v1';

export const history = {
  list() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  },
  save(p) {
    // p: 서버가 준 결제 정보(slim)
    const item = {
      paymentKey: p.paymentKey,
      orderId: p.orderId,
      orderName: p.orderName,
      amount: p.totalAmount,
      at: p.approvedAt || p.requestedAt || new Date().toISOString(),
      status: p.status,
    };
    const rest = this.list().filter((x) => x.paymentKey !== item.paymentKey);
    try {
      localStorage.setItem(KEY, JSON.stringify([item, ...rest].slice(0, 10)));
    } catch { /* 저장이 막힌 브라우저면 그냥 넘어가요 */ }
  },
  remove(paymentKey) {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.list().filter((x) => x.paymentKey !== paymentKey)));
    } catch { /* 무시 */ }
  },
};

// ---------- 표시용 ----------
// 영수증 한 줄: 이름 …… 값. 숫자·코드 값은 고정폭 글꼴(mono), 한글 설명 값은 보통 글꼴
export function kv(k, v, cls = '') {
  const isText = /[가-힣]/.test(String(v)) && !/[0-9]{3}/.test(String(v));
  return h('div', { class: `kv ${cls}` }, h('span', { class: 'kv-k' }, k), h('span', { class: isText ? 'kv-v' : 'kv-v mono' }, v));
}

export const STATUS = {
  READY: '결제 전',
  IN_PROGRESS: '인증만 됨 (승인 전)',
  WAITING_FOR_DEPOSIT: '입금 기다리는 중',
  DONE: '결제 완료',
  CANCELED: '환불됨',
  PARTIAL_CANCELED: '일부 환불됨',
  ABORTED: '승인 실패',
  EXPIRED: '시간 지나 취소됨',
};

export function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// 긴 키는 앞뒤만: tgen_2026…a1b2
export function short(s, head = 10, tail = 4) {
  s = String(s || '');
  return s.length > head + tail + 1 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;
}

export function methodText(p) {
  if (!p) return '';
  if (p.easyPay) return `간편결제 · ${p.easyPay}`;
  if (p.card?.number) return `${p.method || '카드'} · ${p.card.number}`;
  return p.method || '';
}

export async function api(path, data) {
  const res = await fetch(path, data
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    : { headers: { Accept: 'application/json' } });
  let body = {};
  try { body = await res.json(); } catch { body = { ok: false, code: 'NETWORK', message: '서버 응답을 읽지 못했어요.' }; }
  return body;
}
