# 오프닝 트레일 / Opening Trail (chess)

체스 오프닝 사이트: 1수부터 수마다 이유와 함께 따라가는 오프닝 해설 81개 · 레이팅대별 오프닝 지도(리체스 대국 통계 + 엔진 평가) · 2분 테스트 · 간격 반복 연습. 정적 사이트, 서버 코드 없음, 배포 때 빌드 없음. (2026-11-05 외울수/Fewmoves에서 이름을 바꿈.)
- 주소: https://chess.lumenlab.page (Worker `chess`, workers.dev 끔). 영어 `/`(x-default), 한국어 `/ko/`.
- 페이지: 홈 `/`, 지도 `map/`(#e4.e5.Nf3 = SAN 주소, 옛 `?m=` UCI도 받음), 오프닝 목록 `openings/`, 첫 수별 `openings/e4/`·`d4/`·`c4/`·`nf3/`·`other-first-moves/`, 해설 `openings/<slug>/`, 레이팅별 추천 `best-openings/`, 테스트 `test/`, 연습 `practice/`, 자료와 출처 `data/`, 소개 `about/`, 방침 `privacy/`. 가이드 글 1편(한·영 짝, `guide/openings-by-rating/`)은 루멘랩 홈에 싣는다.
- 설계·결정·남은 일: My-site-private `context/knowledge/4-내-사이트/chess-사이트-구조.md`, 기획서 Claude 문서 https://claude.ai/artifact/EXYbJ2vxH21ymBxzZ3ktZT.

## 폴더
- `_dev/build.py` **모든 HTML·sitemap.xml·404.html·data/openings·data/test.json·data/find.json을 만들고 data/t 조각에 분류·해설 slug·이유를 적는다**: `python3 -B chess/_dev/build.py`(그냥 python3, python-chess 필요 없음). 만든 파일은 손으로 고치지 않는다.
  - 화면 글 = `_dev/content.py`(UI·PAGES·TX·TEST·소개·방침·자료 문서·STORE_KEYS), 해설 = `_dev/openings.py`(81개: 정의 수순·계획·갈래·함정·팁, 함정 `mate: True`는 실제 메이트), 글 = `_dev/articles.py`.
  - 메인라인 = `_dev/main_lines.py` `MAIN`(허브 아닌 75개, 정의 수순 뒤로 이어지는 전체 SAN), 수마다 이유 = `_dev/why_trunk.py`(정의 수순 접두사) + `why_ext*.py`(연장 부분, `X(slug, 시작 수순 번호, 이유…)`), 한 줄 요약·검색 별명 = `_dev/reasons.py`. 이유가 빠진 메인라인 수가 있으면 빌드가 수를 알려 준다.
  - 분류 = `_dev/trail.py`: 리체스 승률식으로 최선 수보다 몇 %p 잃는지. <3.5 건전(고수가 가장 많이 두는 수 = 메인, 고수 10% 이상 = 대안), 3.5–8 사이드, 8–15 의심(?!), 15 이상 나쁨(?). 고수 = 대회 2400+(30판 이상) → 리체스 2000+(30판 이상) → 전체. 해설 정의 수순·MAIN 연장은 메인으로 고정(같은 판에 다른 책 수가 있으면 빌드가 멈춤). 인기 함정 = 분류 3 이상·비율 10% 이상·50판 이상.
  - 수순은 모두 `_dev/lines.mjs`(사이트와 같은 `assets/chess.min.js`)로 둬 본다. 틀린 수가 하나라도 있으면 빌드가 멈춘다(`check_lines`).
  - 글이 말하는 숫자·방향(판 수, '줄어든다' 등)은 `want()`로 데이터와 맞는지 본다. 데이터가 바뀌어 어긋나면 빌드가 멈추니 글을 고친다.
  - 판·표·수 목록·이름은 첫 HTML에 미리 그린다(화면 밀림 0). `assets/app.js`가 같은 모양으로 다시 그린다. 둘을 같이 고친다.
  - 만든 가이드 HTML(`guide/`·`ko/guide/`)은 `lumenlab/_dev/build_home.py`가 읽어 lumenlab.page/guides/chess/에 싣는 원본이다. 이 사이트는 가이드 주소를 그리로 301(`_redirects`)하고 sitemap·배포에서 뺀다(`.assetsignore`). 글을 고치면 이 도구를 빌드한 뒤 `python3 -B lumenlab/_dev/build_home.py`.
- `data/` (배포됨, 약 130MB): `meta.json`(판 수·출처·만든 날), `t/000.json`~`fff.json`(4096조각, 조각 = EPD의 FNV-1a % 4096, 세 자리 16진수), `openings/<slug>.json`(해설마다 화면과 같은 숫자), `test.json`(테스트 문제), `find.json`(검색). 조각 = `{"e": {epd: [온 판 12칸, 평가, [[수, 분류, 둔 뒤 평가, 12칸]…], 대회 온 판 12칸|0, [[수, 대회 4칸]…]|0, 엔진 첫 수, 수순|0]}, "n": {epd: [ECO, 영어, 한국어, slug?]}, "x": {이유}}`. 12칸 = 레이팅대 4 × 백승·무·흑승. `_headers`가 `/data/*`에 CORS를 연다(루멘랩 홈 '바로 써 보기'가 읽음).
- `_dev/data/` 통계 만들기(저장소 밖 빈 폴더에서, venv의 python-chess·zstandard). 집계 원본·엔진 평가 원본은 프로젝트 파일 `chess/raw-counts/`에 있다(다시 세면 한 달에 약 1시간, 평가 DB 22.5GB 흘려 읽기에 약 20분).
  1. `count2.py`·`count_otb.py`·`merge.py`(`pfetch.py`로 받으며) → 리체스·대회 `part0.pkl`
  2. `make_tree.py <리체스 part0> <대회 part0> <출력>` → `tree.pkl`·`epds.txt`(앙파상은 실제로 잡을 수 있을 때만 판 이름에 넣는다. 잡을 수 있는 판을 섞으면 평가가 틀린 판으로 붙는다)
  3. `python3 pfetch.py https://database.lichess.org/lichess_db_eval.jsonl.zst | python3 -I evals_stream.py epds.txt evals.pkl`
  4. `make_site.py tree.pkl chess/data evals.pkl` → `data/t`·`meta.json`, 그다음 `build.py`. 메인라인 후보는 `main_lines.py`가 뽑는다(사람이 보고 MAIN에 옮김).
  이름 = `_dev/openings/*.tsv`(lichess-org/chess-openings, CC0), 한국어 이름 = `names_ko.py`.
- `assets/core.js` 숫자 읽기(DOM 모름: 조각 받기·레이팅대 합·비율·이름 찾기, 전역 `FM`), `board.js` 판(끌기·누르기·화살표·승격), `fx.js` 손맛(효과음·입자, `FM.Sfx`·`FM.Fx`), `app.js` 화면 연결(지도·메인라인 따라가기·찾기·연습·테스트·공유 카드), `style.css`, `pieces.css`(`_dev/pieces.py`), `ads-config.js`(광고 단위 번호, 지금은 빔).
- `tests/run.mjs` 로직 시험(조각 모양·테스트 문제·연습·간격·숫자 모양), `_dev/check.py` 정적 검사, `_dev/serve.mjs` 로컬 서버(8472), `_dev/og.cjs` 공유 그림·아이콘(서버를 띄운 뒤).

## 명령어
- 빌드 → 검사: `python3 -B chess/_dev/build.py && python3 -B chess/_dev/check.py && node chess/tests/run.mjs`.
- 화면 보기: `node chess/_dev/serve.mjs` → http://localhost:8472/.
- 이름·판 수가 바뀌면 `python3 -B lumenlab/_dev/build_home.py`, `python3 lumenlab/_dev/build_llms.py`도.

## 동작 기준(화면 글과 같아야 한다)
- 레이팅대 = 두 사람 평균 <1200 / 1200–1599 / 1600–1999 / 2000+, 기본 1600–1999. 숫자는 리체스 2026년 8~10월 레이팅 대국(블리츠·래피드·클래식) 174,931,775판, 앞 40수순, 20판 넘게 나온 수순. 고수 줄 = 리체스 중계 기보 949,061판(CC BY-SA 4.0). 엔진 = 리체스 평가 DB(CC0), 판 99.2%.
- 테스트: 10문제(쉬운 3·중간 4·깊은 3), 정답 = 2000+가 40% 넘게 두고 둘째 수와 15%p 넘게 차이 나는 메인·대안 수, 보기 = 낮은 레이팅대에서 많이 두는 수 3개. 단계 이름 6개, 공유 카드 1080×1350.
- 연습: 내 수 = 해설 메인라인, 그다음은 메인(분류 0) → 2000+ 최다 수. 상대 수 = 고른 레이팅대에서 5% 넘는 수를 실제 비율대로. 틀림·힌트 = 그날 다시, 맞힘 = 1·3·7·16·35·90일 뒤.
- 저장: localStorage `fm.band`·`fm.cards`·`fm.lang`·`fm.sound`(방침과 같다). 회원 가입·로그인 없음.
- 손맛: `board.set()`이 수 종류를 알아내 말이 닿는 순간 소리·효과. 효과음 기본 켬, 스피커 단추([data-sound])로 끄고 기억. 움직임 줄이기면 입자·흔들림 없이 색만. 루멘랩 '바로 써 보기'는 fx.js 없이 board.js만 읽는다.
- 광고: 자동 광고 코드는 홈·지도·첫 수·추천·해설·연습에만(오프닝 목록·테스트·자료·소개·방침·404 없음, `check.py`가 본다).

## 유지
- 통계를 새 달 자료로 바꾸면 `content.py`의 달·판 수 문장, `articles.py` `GAMES_M`과 숫자 문장(want가 알려 줌), 루멘랩 `catalog.json`·`showcase.json`·`works_text.json` 사실 줄을 같이 고친다.
