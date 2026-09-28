/* QR 만들기 설정 (자주 바꿀 만한 목록은 여기서만 고치면 돼요. 페이지 코드는 안 건드려도 됨) */
window.QR_SETTINGS = {
  // 색 고르기 동그라미 (앞에서부터 순서대로. 첫 번째가 기본)
  colors: [
    { name: '검정', value: '#15171a' },
    { name: '남색', value: '#1e3a8a' },
    { name: '초록', value: '#0b6b43' },
    { name: '자주', value: '#8a1c4a' },
    { name: '갈색', value: '#7a3a12' }
  ],

  // 저장 크기 (px = 이미지 한 변의 픽셀 수)
  sizes: [
    { name: '작게', px: 512, note: '메신저·화면' },
    { name: '보통', px: 1024, note: '문서·SNS', isDefault: true },
    { name: '인쇄용', px: 2048, note: '전단지·포스터' }
  ],

  captionMax: 30,   // 아래 글자 최대 글자 수
  maxRecent: 8,     // '최근에 저장한 QR'에 남길 개수

  // 떼어도 같은 페이지가 열리는 추적용 꼬리표 (?뒤에 붙는 이름). utm_ 로 시작하는 건 모두 포함
  tracking: {
    all: ['fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'yclid', 'igsh', 'igshid',
      'mc_cid', 'mc_eid', '_hsenc', '_hsmi', 'ttclid', 'twclid', 'srsltid'],
    // 특정 사이트에서만 떼는 것 (주소 앞의 www. m. 은 빼고 적기)
    byHost: {
      'youtube.com': ['si', 'feature', 'pp'],
      'youtu.be': ['si', 'feature'],
      'open.spotify.com': ['si'],
      'instagram.com': ['igsh', 'igshid']
    }
  }
};
