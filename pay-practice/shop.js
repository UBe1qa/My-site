// 붕어빵 결제 연습소 — 메뉴와 주문 계산
// 화면(app.js)과 서버(worker.js)가 이 파일 하나를 같이 씁니다.
// 메뉴·가격을 바꾸려면 MENU만 고치면 돼요. (가상 가게 · 가상 가격)

export const SHOP_NAME = '붕어빵 결제 연습소';

// 토스페이먼츠 '문서용 테스트 키' 중 클라이언트 키 (화면에 보여도 되는 키).
// 누구나 쓰는 공개 테스트 키라 결제해도 돈이 움직이지 않아요.
// 짝이 되는 시크릿 키는 서버(worker.js)에만 있어요.
export const TOSS_CLIENT_KEY = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

export const ORDER_PREFIX = 'BB';
export const MAX_QTY = 9;

// code: 주문번호에 들어가는 한 글자(소문자, 겹치면 안 됨)
// filling: style.css의 --fill-<filling> 색으로 속 색을 칠해요
export const MENU = [
  { code: 'p', name: '팥 붕어빵', unit: '3개', price: 2000, filling: 'redbean', desc: '통팥이 꼬리까지' },
  { code: 's', name: '슈크림 붕어빵', unit: '3개', price: 2000, filling: 'custard', desc: '부드러운 커스터드' },
  { code: 'z', name: '피자 붕어빵', unit: '2개', price: 3000, filling: 'pizza', desc: '치즈·토마토소스' },
  { code: 'm', name: '미니 붕어빵', unit: '10개', price: 3500, filling: 'redbean', desc: '한입 크기 팥', mini: true },
];

const byCode = Object.fromEntries(MENU.map((m) => [m.code, m]));

// 장바구니 { p: 2, s: 1 } → 'p2s1' (메뉴 순서대로, 0개는 빼고)
export function cartToCode(cart) {
  return MENU.filter((m) => (cart[m.code] || 0) > 0)
    .map((m) => m.code + cart[m.code])
    .join('');
}

// 'p2s1' → { p: 2, s: 1 } / 모양이 틀리면 null
export function codeToCart(code) {
  if (typeof code !== 'string' || !/^([a-z][1-9])+$/.test(code)) return null;
  const cart = {};
  for (let i = 0; i < code.length; i += 2) {
    const c = code[i];
    if (!byCode[c] || cart[c]) return null; // 없는 메뉴거나 두 번 나오면 틀린 주문
    cart[c] = Number(code[i + 1]);
  }
  return cart;
}

export function cartLines(cart) {
  return MENU.filter((m) => (cart[m.code] || 0) > 0).map((m) => ({
    item: m,
    qty: cart[m.code],
    sum: m.price * cart[m.code],
  }));
}

export function cartTotal(cart) {
  return cartLines(cart).reduce((s, l) => s + l.sum, 0);
}

export function cartCount(cart) {
  return cartLines(cart).reduce((s, l) => s + l.qty, 0);
}

// 토스 결제창에 보이는 주문 이름: '팥 붕어빵 외 1건'
export function orderNameOf(cart) {
  const lines = cartLines(cart);
  if (!lines.length) return '';
  return lines.length === 1 ? lines[0].item.name : `${lines[0].item.name} 외 ${lines.length - 1}건`;
}

// 주문번호: BB-p2s1-무작위10자
// 주문 내용이 주문번호 안에 들어 있어서, 서버가 따로 저장하지 않아도 금액을 다시 계산할 수 있어요.
// (토스 규칙: 6~64자, 영문·숫자·-·_ 만)
export function makeOrderId(cart) {
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const rand = Array.from(bytes, (b) => abc[b % abc.length]).join('');
  return `${ORDER_PREFIX}-${cartToCode(cart)}-${rand}`;
}

// 주문번호 → { cart } / 우리 가게 모양이 아니면 null
export function parseOrderId(orderId) {
  if (typeof orderId !== 'string' || orderId.length > 64) return null;
  const m = orderId.match(new RegExp(`^${ORDER_PREFIX}-([a-z0-9]{2,40})-([A-Za-z0-9]{6,20})$`));
  if (!m) return null;
  const cart = codeToCart(m[1]);
  return cart ? { cart } : null;
}

export function won(n) {
  return `${Number(n || 0).toLocaleString('ko-KR')}원`;
}
