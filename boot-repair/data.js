/* spot = 견적 그림(SVG viewBox 좌표)에서 점을 찍을 자리
   가죽결 수선소 (연습용 가상 공방) · 바뀌는 내용은 여기만 고치면 된다.
   가격·기간은 연습용 예시다. */
window.REPAIRS = [
  { id: 'heel',    name: '굽 교체',          part: '굽',     price: 35000,  days: 3,
    why: '뒤쪽 모서리가 비스듬히 닳았으면 굽만 새로 붙여요.', spot: [250, 615] },
  { id: 'half',    name: '앞 밑창 덧대기(반창)', part: '밑창',   price: 45000,  days: 4,
    why: '앞쪽 바닥이 얇아졌으면 그 부분만 덧대요.', spot: [780, 615] },
  { id: 'welt',    name: '웰트 실밥 다시 박기', part: '실밥',   price: 30000,  days: 4,
    why: '밑창 둘레 실이 끊겼으면 물이 새기 전에 다시 박아요.', spot: [520, 576] },
  { id: 'leather', name: '가죽 보습·갈라짐 관리', part: '가죽',  price: 20000,  days: 2,
    why: '접히는 곳이 하얗게 트면 기름을 먹이고 갈라짐을 메워요.', spot: [600, 440] },
  { id: 'eyelet',  name: '끈구멍 교체',        part: '끈구멍', price: 15000,  days: 2,
    why: '고리가 빠지거나 벌어졌으면 새 고리로 바꿔요.', spot: [418, 270] },
  { id: 'toe',     name: '앞코 까짐 복원',     part: '앞코',   price: 25000,  days: 3,
    why: '앞코가 긁혀 색이 빠졌으면 색을 맞춰 메워요.', spot: [890, 520] },
  { id: 'full',    name: '통창갈이(밑창 전체)', part: '밑창 전체', price: 120000, days: 10,
    why: '밑창을 통째로 새로 달아요. 굽·반창·실밥이 같이 들어 있어요.',
    includes: ['heel', 'half', 'welt'] }
];

/* 맡기는 순서: 태그에 적히는 글 */
window.STEPS = [
  { title: '사진 보내기',  body: '닳은 곳 사진 두세 장이면 돼요. 신발 상자는 아직 안 싸도 돼요.', tag: '접수', note: '사진 3장 받음', meta: ['필요한 것: 사진 2~3장', '보통 1시간 안 답장'] },
  { title: '견적 받기',    body: '사진을 보고 가격과 기간을 답장해요. 안 고쳐도 되는 곳은 그렇다고 말씀드려요.', tag: '견적', note: '굽 + 실밥 · 65,000원', meta: ['안 고쳐도 되는 곳은 빼요'] },
  { title: '택배로 보내기', body: '상자에 넣어 보내 주세요. 왕복 택배비는 저희가 내요.', tag: '입고', note: '상자 도착 · 상태 확인', meta: ['왕복 택배비 포함', '도착하면 문자'] },
  { title: '수선',        body: '작업 중간에 사진으로 지금 어디까지 했는지 알려 드려요.', tag: '작업', note: '굽 붙이는 중', meta: ['중간 사진 보내 드림', '보통 4~10일'] },
  { title: '받아서 신어 보기', body: '받고 30일 안에 걸을 때 불편하면 다시 맞춰 드려요.', tag: '출고', note: '30일 다시 맞춤', meta: ['불편하면 30일 안 무료'] }
];

/* 수선 예시 카드: 새 부츠 값(38만 원)과 견준 비율. 예시다. */
window.CASES = [
  { boot: '워커', what: '통창갈이', why: '밑창이 갈라져 물이 샘', price: 120000, days: 10 },
  { boot: '첼시 부츠', what: '굽 교체', why: '뒤축이 비스듬히 닳음', price: 35000, days: 3 },
  { boot: '엔지니어 부츠', what: '반창 + 실밥', why: '앞바닥이 얇아지고 실이 끊김', price: 75000, days: 4 },
  { boot: '워커', what: '앞코 복원', why: '앞코가 긁혀 색이 빠짐', price: 25000, days: 3 }
];
window.NEW_BOOT = 380000;

/* 수선 종류 페이지: 수선마다 언제 맡기나 / 하는 일 / 같이 보면 좋은 것 */
window.REPAIR_INFO = {
  heel:    { when: '뒤쪽 모서리가 비스듬히 닳아 걸을 때 몸이 바깥으로 기울면', steps: ['닳은 굽 고무를 떼어 내요', '굽 높이를 원래대로 맞춰 새 굽을 붙여요', '옆면을 다듬고 색을 맞춰요'], with: 'welt', part: 'heel' },
  half:    { when: '앞바닥이 얇아져 돌이 느껴지거나 구멍이 나기 직전이면', steps: ['닳은 앞바닥만 고르게 깎아 내요', '새 밑창을 덧대고 눌러 붙여요', '옆면을 원래 밑창과 이어지게 다듬어요'], with: 'heel', part: 'half' },
  full:    { when: '밑창이 갈라지거나 물이 새고, 굽과 앞바닥이 같이 닳았으면', steps: ['둘레 실을 풀어 옛 밑창을 떼요', '속의 코르크를 새로 채워 바닥을 고르게 해요', '새 밑창을 대고 둘레를 다시 박아요'], with: 'leather', part: 'full' },
  welt:    { when: '밑창 둘레의 실이 끊기거나 들떠 틈이 보이면', steps: ['끊긴 실을 걷어 내요', '원래 구멍을 따라 왁스 실로 다시 박아요', '실 위에 왁스를 먹여 물이 덜 스미게 해요'], with: 'heel', part: 'welt' },
  leather: { when: '접히는 곳이 하얗게 트거나 가죽이 뻣뻣해졌으면', steps: ['먼지와 묵은 크림을 닦아 내요', '오일을 먹여 하룻밤 쉬게 해요', '갈라진 곳은 메우고 색을 맞춰요'], with: 'toe', part: 'upper' },
  eyelet:  { when: '끈구멍 고리가 빠지거나 벌어져 끈이 걸리면', steps: ['벌어진 고리를 빼요', '같은 크기의 새 고리를 박아요', '끈을 새로 끼워 드려요'], with: 'leather', part: 'eye' },
  toe:     { when: '앞코가 긁혀 색이 빠지거나 겉이 일어났으면', steps: ['일어난 겉면을 고르게 다듬어요', '빠진 색을 몇 번에 나눠 채워요', '크림으로 마무리해 광을 맞춰요'], with: 'leather', part: 'toe' }
};

/* 수선 사례 페이지 (예시): 부츠 종류, 신은 기간, 고친 곳 */
window.CASE_LIST = [
  { boot: '워커', worn: '5년', type: 'sole', repairs: ['full'], note: '밑창이 갈라져 비 오는 날 물이 샜어요.', days: 10 },
  { boot: '첼시 부츠', worn: '2년', type: 'heel', repairs: ['heel'], note: '뒤축 바깥쪽만 비스듬히 닳았어요.', days: 3 },
  { boot: '엔지니어 부츠', worn: '3년', type: 'sole', repairs: ['half', 'welt'], note: '앞바닥이 얇아지고 둘레 실이 끊겼어요.', days: 4 },
  { boot: '워커', worn: '1년', type: 'leather', repairs: ['toe'], note: '앞코가 긁혀 색이 빠졌어요.', days: 3 },
  { boot: '워커', worn: '3년', type: 'heel', repairs: ['heel', 'welt'], note: '굽이 닳고 뒤쪽 실이 들떴어요.', days: 4 },
  { boot: '처커 부츠', worn: '4년', type: 'leather', repairs: ['leather', 'eyelet'], note: '접히는 곳이 트고 끈구멍 고리가 빠졌어요.', days: 2 },
  { boot: '웨스턴 부츠', worn: '6년', type: 'sole', repairs: ['full', 'leather'], note: '밑창 전체가 닳고 가죽이 뻣뻣해졌어요.', days: 10 },
  { boot: '첼시 부츠', worn: '1년', type: 'heel', repairs: ['heel', 'toe'], note: '굽이 닳고 앞코에 긁힌 자국이 있었어요.', days: 3 }
];

/* 관리법 페이지 (ic = 카드 그림 이름, sub.js ICON) */
window.CARE = [
  { cat: 'rain', ic: 'umbrella', title: '비 맞은 날', time: '하루', steps: ['신문지를 구겨 안에 채워 물기를 빼요', '그늘에서 천천히 말려요. 드라이어·난로 앞은 피해요', '다 마르면 오일이나 크림을 얇게 발라요'] },
  { cat: 'rain', ic: 'snow', title: '눈길의 흰 자국', time: '20분', steps: ['젖은 천으로 흰 자국을 두드리듯 닦아요', '남으면 물과 식초를 반씩 섞어 한 번 더 닦아요', '말린 뒤 오일로 가죽을 다시 채워요'] },
  { cat: 'store', ic: 'box', title: '철 지나 넣어 둘 때', time: '10분', steps: ['솔질로 먼지를 털어요', '나무 슈트리를 넣어 모양을 잡아요', '상자보다 바람 통하는 곳, 햇빛 안 드는 곳에 둬요'] },
  { cat: 'store', ic: 'calendar', title: '이틀 연속 신지 않기', time: '-', steps: ['하루 신으면 하루 쉬게 해요', '안의 땀이 마르는 데 하루쯤 걸려요', '깔창을 빼 두면 더 빨리 말라요'] },
  { cat: 'leather', ic: 'drop', title: '오일 먹이기', time: '30분 + 하룻밤', steps: ['솔질로 먼지를 털고 마른 천으로 닦아요', '오일을 얇게, 접히는 곳 위주로 발라요', '하룻밤 둔 뒤 남은 기름을 천으로 닦아요'] },
  { cat: 'leather', ic: 'jar', title: '크림으로 광 내기', time: '15분', steps: ['색이 맞는 크림을 콩알만큼 덜어요', '작은 원을 그리며 얇게 펴요', '말리고 솔질한 뒤 천으로 문질러요'] },
  { cat: 'lace', ic: 'lace', title: '끈 새로 끼우기', time: '10분', steps: ['구멍 수로 길이를 골라요(한쪽 6개면 약 150cm)', '왁스 먹인 끈이 덜 풀리고 오래가요', '양쪽 길이를 맞춰 아래부터 끼워요'] },
  { cat: 'lace', ic: 'insole', title: '깔창과 냄새', time: '5분', steps: ['깔창을 빼서 따로 말려요', '삼나무 슈트리가 습기와 냄새를 덜어 줘요', '깔창이 꺼졌으면 새것으로 바꿔요'] }
];
