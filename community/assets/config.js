// ─────────────────────────────────────────────
// 마당 커뮤니티 설정
// 이름·게시판·인기글 기준을 바꾸려면 이 파일만 고치면 돼요.
// ─────────────────────────────────────────────
window.SITE = {
  name: '마당',
  mark: '마',                 // 로고 네모 안의 글자
  about: '누구나 가입하는 작은 커뮤니티',

  // 게시판 (Supabase의 boards 표와 slug가 같아야 해요)
  boards: [
    { slug: 'free',  name: '자유', full: '자유게시판', desc: '아무 이야기나 편하게' },
    { slug: 'qna',   name: '질문', full: '질문게시판', desc: '궁금한 걸 묻고 답해요' },
    { slug: 'photo', name: '사진', full: '사진게시판', desc: '찍은 사진을 나눠요' },
  ],

  hotLikes: 3,      // 추천을 몇 개 받으면 인기글이 되는지
  pageSize: 20,     // 목록 한 쪽에 보일 글 수
  maxImages: 5,     // 글 하나에 올릴 수 있는 사진 수

  // Supabase 연결 정보 — 공개용 열쇠라 사이트에 보여도 괜찮아요.
  // 진짜 보안은 데이터베이스 규칙(RLS)이 지켜요.
  supabaseUrl: 'https://glrziojqelmlsyepfimr.supabase.co',
  supabaseKey: 'sb_publishable_0H43mCp8cNApExrNiz86UQ_swPwAn9c',
};
