# 마당 · 작은 커뮤니티

- 주소: (Vercel 연결 후 적어 둠)
- 화면: 이 폴더의 HTML·CSS·JS (빌드 없음)
- 글·댓글·회원 저장: Supabase 프로젝트 `community` (서울)

## 자주 고치는 곳
- 사이트 이름, 게시판, 인기글 기준(추천 몇 개), 한 쪽 글 수: `assets/config.js`
- 색·글꼴·모양: `assets/style.css` 맨 위 `:root`
- 첫 화면 문구: `index.html`의 hero 부분

## 파일
| 파일 | 하는 일 |
|---|---|
| index.html + assets/home.js | 첫 화면(인사말, 인기글, 새 글) |
| board/ + assets/board.js | 게시판 목록, 인기글, 전체 글, 검색 |
| post/ + assets/post.js | 글 보기, 추천, 신고, 댓글 |
| write/ + assets/write.js | 글쓰기·고치기, 사진 올리기 |
| login/ + assets/login.js | 로그인·가입 |
| me/ + assets/me.js | 내 정보, 닉네임, 내 글·댓글, 로그아웃, 탈퇴 |
| admin/ + assets/admin.js | 운영자 신고함 |
| rules/ | 이용 규칙·개인정보 처리방침 |
| assets/app.js | 모든 페이지 공통(머리 메뉴, 로그인 상태, 알림 등) |
| supabase/schema.sql | 데이터베이스 구조와 보안 규칙(사이트에는 안 올라감) |

## 운영자 지정
Supabase SQL에서: `update public.profiles set is_admin = true where nickname = '닉네임';`
