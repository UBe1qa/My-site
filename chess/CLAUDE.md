# 외울수 / Fewmoves (chess)

체스 오프닝 공부 사이트: 레이팅대별 탐색기(리체스 대국 통계) · 오프닝 해설 31개 · 간격 반복 연습. 정적 사이트, 서버 코드 없음, 배포 때 빌드 없음.
- 주소: https://chess.lumenlab.page (Worker `chess`, workers.dev 끔). 영어 `/`(x-default), 한국어 `/ko/`.
- 페이지: 탐색기 `/`, 오프닝 목록 `openings/`, 해설 `openings/<slug>/`, 연습 `practice/`, 소개 `about/`, 방침 `privacy/`. 가이드 글 1편(한·영 짝, `guide/openings-by-rating/`)은 루멘랩 홈에 싣는다.
- 설계·결정·남은 일: My-site-private `context/knowledge/4-내-사이트/chess-사이트-구조.md`.

## 폴더
- `_dev/build.py` **모든 HTML·sitemap.xml·404.html을 만들고 data/p 조각에 해설 slug를 적는다**: `python3 -B chess/_dev/build.py`. 만든 파일은 손으로 고치지 않는다.
  - 화면 글 = `_dev/content.py`(UI 글·TX·소개·방침·STORE_KEYS), 해설 = `_dev/openings.py`(31개: 주요 수순·계획·갈래·함정·클럽 팁, 함정 `mate: True`는 실제 메이트여야 한다), 글 = `_dev/articles.py`(숫자는 build.py `article_data()`가 data에서 계산해 넣고, 본문의 주장은 assert로 확인).
  - 수순은 모두 `_dev/lines.mjs`(사이트와 같은 `assets/chess.min.js`)로 둬 본다. 틀린 수가 하나라도 있으면 빌드가 멈춘다(`check_lines`). 해설 끝 국면이 그 해설로 이어지는지도 본다(`check_names`).
  - 판·표·수 목록·이름은 첫 HTML에 미리 그린다(화면 밀림 0). `assets/board.js`가 같은 모양으로 다시 그린다. 둘을 같이 고친다.
  - 만든 가이드 HTML(`guide/`·`ko/guide/`)은 `lumenlab/_dev/build_home.py`가 읽어 lumenlab.page/guides/chess/에 싣는 원본이다. 이 사이트는 가이드 주소를 그리로 301(`_redirects`)하고 sitemap·배포에서 뺀다. 글을 고치면 이 도구를 빌드한 뒤 `python3 -B lumenlab/_dev/build_home.py`.
- `data/` 통계(배포됨, 18MB): `meta.json`(판 수·레이팅대별 시작 판 수), `p/00.json`~`ff.json`(256조각, 조각 = EPD의 FNV-1a 아래 8비트). 조각 = `{"e": {epd: [둔 수 12칸, 온 판 12칸, [수, 백승·무·흑승 × 레이팅대 4]...]}, "n": {epd: [ECO, 영어, 한국어, slug?]}}`. `_headers`가 `/data/*`에 CORS를 연다(루멘랩 홈 '바로 써 보기'가 읽음).
- `_dev/data/` 통계 만들기(저장소 밖 빈 폴더에서, python-chess·zstandard 필요): `count.py <lichess .pgn.zst> <counts>` → `make_data.py <counts> chess/data` → `build.py`. 이름 = `_dev/openings/*.tsv`(lichess-org/chess-openings, CC0), 한국어 이름 = `names_ko.py`.
- `assets/core.js` 숫자 읽기(DOM 모름: 조각 받기·레이팅대 합·비율·이름 찾기, 전역 `FM`), `board.js` 판(끌기·누르기·화살표 굵기 5+40×비율·승격), `app.js` 화면 연결(탐색기·연습 상태 기계·간격 반복), `style.css`, `pieces.css`(`_dev/pieces.py`가 `_dev/pieces/*.svg` Cburnett로 만듦), `ads-config.js`(광고 단위 번호, 지금은 빔).
- `tests/run.mjs` 로직 시험(41개), `_dev/check.py` 정적 검사(가이드 규칙 포함), `_dev/serve.mjs` 로컬 서버(8472), `_dev/og.cjs` 공유 그림·아이콘(서버를 띄운 뒤).

## 명령어
- 빌드 → 검사: `python3 -B chess/_dev/build.py && python3 -B chess/_dev/check.py && node chess/tests/run.mjs`.
- 화면 보기: `node chess/_dev/serve.mjs` → http://localhost:8472/.

## 동작 기준(화면 글과 같아야 한다)
- 레이팅대 = 두 사람 평균 <1200 / 1200–1599 / 1600–1999 / 2000+, 기본 1600–1999. 60판 미만 국면, 6판 미만 수는 싣지 않는다. 숫자는 2026년 10월 리체스 레이팅 대국(블리츠·래피드·클래식) 앞부분 17,395,175판.
- 연습: 내 수 = 해설 주요 수순, 그다음은 2000+가 가장 많이 둔 수. 상대 수 = 고른 레이팅대에서 5% 넘는 수를 실제 비율대로. 틀림·힌트 = 그날 다시, 맞힘 = 1·3·7·16·35·90일 뒤.
- 저장: localStorage `fm.band`·`fm.cards`·`fm.lang`(방침과 같다). 회원 가입·로그인 없음.
- 광고: 자동 광고 코드는 탐색기·해설·연습 페이지에만(소개·방침·목록·404 없음). 수동 자리 `mid`·`bottom`은 단위 번호가 비어 있어 지금은 없다.

## 유지
- 통계를 새 달 자료로 바꾸면 `content.py` 소개·data_note의 달, `articles.py` 글의 숫자 문장(assert가 알려 줌), 루멘랩 `catalog.json`·`showcase.json` 사실 줄(1,740만 판)을 같이 고친다.
