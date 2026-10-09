# 공평뽑기 / Pickboard (pick)

뽑기·추첨 웹 도구 7개: 돌림판, 사다리타기, 제비뽑기(여러 명 뽑기·당첨 쪽지·순서 정하기), 팀 나누기, 랜덤 숫자, 동전, 주사위. 정적 사이트(서버 코드 없음, 배포 때 빌드 없음). 명단은 브라우저 밖으로 나가지 않는다.
- 주소: https://pick.lumenlab.page (Worker `pick`, workers.dev 끔). 영어 `/` = x-default, 한국어 `/ko/`. 2026-10-09 만듦.
- **결과를 한쪽으로 기울이는 기능(특정 이름이 나오게 하기, 숨은 가중치, 누구를 어느 팀에 넣기)은 만들지 않는다.** 확률을 바꾸는 방법은 같은 이름을 두 번 넣는 것처럼 화면에 보이는 것뿐.
- 도박처럼 보이면 안 된다(광고 정책): 숫자판·칩 그림, '베팅·배당·잭팟' 같은 말 금지. 한국어 '돌림판·뽑기·추첨', 영어 'wheel·picker·draw'. '룰렛 돌리기'는 돌림판 페이지의 검색어 곁말로만.

## 폴더
- `assets/core/` 핵심 로직(화면을 모르는 파일, 노드에서도 돈다)
  - `rng.js` 씨앗(32바이트, `crypto.getRandomValues`) → xoshiro256** → 거절 표본으로 정수(`below`). `Math.random()`과 나머지(%) 치우침 없음.
  - `pick.js` 섞기(Fisher–Yates), 여러 명 뽑기, 쪽지, 팀, 숫자, 동전, 주사위, 돌림판 각도(`wheelPick` → `wheelRotation`, 확인용 `wheelIndexAt`), 그리기 계산(`sliceColorCount`·`labelFlipped`·`labelSize`), 한도 `LIMITS`.
  - `ladder.js` 사다리 만들기·길 따라가기·한 판(`playLadder`: **아래 칸을 먼저 섞고** 사다리를 만든다).
  - `share.js` 명단 읽기(`parseList`), 공유 링크 넣고 빼기(`#r=1.<도구>.<씨앗 43자>.<base64url JSON>`).
- `assets/app.js` 공통 화면 코드(명단 칸, 공유 링크, 최근 결과, 소리, 다른 언어 안내 띠, 루멘랩 칸, 전체 화면, 색종이). `assets/tools/<도구>.js` 도구별 화면. 화면 글자는 페이지 안 `<script id="i18n">`에서 읽는다(코드에 글자를 적지 않는다).
- `assets/style.css` 색 이름은 `:root`에. 강조색은 바늘 빨강 `--pick` 하나(뽑는 행동과 뽑힌 것), 여러 색 `--s1`~`--s8`은 돌림판·팀 표시 안에서만.
- `assets/ads-config.js` 애드센스: client 있음(자동 광고 코드는 도구·글 `<head>`), 수동 자리 번호 `slots`는 비어 있음. 자리 2곳(mid = 도구 설명 글 다음, bottom = 가이드 목록 다음). localhost나 `?adpreview`면 빗금 상자로만 보인다.
- `_dev/build.py` **모든 HTML·sitemap.xml·rss.xml·404.html을 만든다.** 만든 파일은 손으로 고치지 않는다.
  - `_dev/content.json` 화면 글자(`ui`·`toolUi`), 화면 코드가 쓰는 글자(`js`), 도구별 제목·설명·본문·FAQ(`tools`).
  - `_dev/pages.json` 가이드 목록·소개·개인정보 처리방침. `_dev/articles.json` 글 목록(주소·제목·설명·짝 `pair`·연결 도구) + `_dev/articles/<언어>-<주소>.html` 본문.
  - 글 속 숫자는 `{{이름}}` 자리에 build.py가 `_dev/sim_ladder.json`(시뮬레이션)과 `tests/fixtures.json`(정확한 계산)에서 넣는다. 손으로 숫자를 적지 않는다. 모르는 이름이 있으면 빌드가 멈춘다.
- `_dev/sim_ladder.mjs` 사다리 치우침 시뮬레이션(씨앗 고정, 약 6분) → `_dev/sim_ladder.json`.
- `_dev/check.py` 정적 확인, `_dev/e2e.py` 브라우저 확인(Playwright), `_dev/check.sh` 한 번에. `_dev/serve.mjs` 로컬 서버(폴더 주소 → index.html, 없는 주소 → 404.html, `_dev`·`tests` 막음).
- `_dev/og.py` + `_dev/og.html` 공유 그림(og.png 영어, og-ko.png 한국어)과 apple-touch-icon.png·favicon.ico. favicon.svg는 손으로 그린 파일.
- `tests/run.mjs` 로직 테스트, `tests/gen_fixtures.py` 기준값 만들기(파이썬 numpy·scipy) → `tests/fixtures.json`, `tests/golden.json` 고정값.
- `ads.txt`, `robots.txt`, `googlea614029e84d58498.html`(서치 콘솔 확인 파일. 지우지 않는다), `wrangler.jsonc`, `.assetsignore`, `.deploy-actions`.

## 명령어
- 전부 확인: `pick/_dev/check.sh` (로직 테스트 → 빌드 → 정적 확인 → 서버 띄워 브라우저 확인). `check.sh quick`은 브라우저 없이, `check.sh sim`은 시뮬레이션을 다시 돌려 숫자가 그대로인지.
  - 브라우저 확인 환경 변수: `PW_CHROME`(크롬 실행 파일), `PICK_FONT`(Pretendard 변수글꼴 .woff2 경로. CDN을 못 받는 곳에서 대신 줌), `PICK_SHOTS`(스크린샷 폴더).
  - 묶음만 돌리기: 서버를 띄운 뒤 `python3 -B pick/_dev/e2e.py tools|pages|cls|ads|misc|shots`.
- 로직 테스트만: `node pick/tests/run.mjs` (약 12초, 외부 패키지 없음).
- 페이지 다시 만들기: `python3 -B pick/_dev/build.py`. 최신인지: `python3 -B pick/_dev/build.py --check`.
- 로컬 보기: `node pick/_dev/serve.mjs` → http://localhost:8442
- 기준값 다시 만들기: `python3 -B pick/tests/gen_fixtures.py`. 시뮬레이션: `node pick/_dev/sim_ladder.mjs`.
- 배포: main에 푸시하면 GitHub Actions가 wrangler로 배포(`.deploy-actions`).

## 설계 결정
- **씨앗 = 난수기 상태 그대로**(32바이트, 섞는 단계 없음). 공개 기준 벡터(상태 1,2,3,4)를 씨앗 넣는 문으로 바로 대조할 수 있다. 실제 씨앗은 전부 암호용 난수라 문제없지만, 테스트에서 씨앗을 앞쪽 바이트만 바꿔 만들면 첫 출력이 같아진다(첫 출력은 상태의 둘째 칸에만 달려 있다).
- **돌림판은 결과를 먼저 정하고 그 칸에 멈추는 각도를 계산한다.** 멈춘 위치로 결과를 읽지 않는다. 바늘은 오른쪽(3시): 뽑힌 이름이 가로로 읽힌다. 칸 안에서 멈출 자리(0.10~0.90)와 바퀴 수(5~7)도 씨앗에서 나와 링크로 다시 볼 때 똑같이 멈춘다.
- 돌림판 그리기: 멈춰 있을 때는 캔버스 안에 지금 각도로 그리고(왼쪽 절반의 이름은 뒤집어 써서 거꾸로 보이지 않게, CSS 회전 없음), 도는 동안만 그려 둔 캔버스를 CSS transform으로 돌린다. 캔버스는 `overflow:hidden`인 둥근 틀 안에 둔다(돌아간 네모 모서리가 가로 스크롤을 만들지 않게). 칸이 얇아 이름이 안 보일 때는 뽑힌 칸을 넓혀 다시 그린다.
- **사다리는 아래 칸을 먼저 섞는다.** 사다리만으로는 출발 자리 근처에 도착하기 쉽다(8명·보통 사다리에서 맨 끝 사람이 바로 아래 칸에 24.8%, 공평하면 12.5%). 숫자는 `_dev/sim_ladder.json`, 설명은 가이드 글.
- 사다리 규칙: 2~30명, 높이 8·14·24(적게·보통·많이). 층마다 왼쪽부터, 맨 왼쪽 틈 1/3, 그다음은 왼쪽 틈이 비었을 때만 1/2(모든 틈의 가로줄 확률이 1/3로 같음). 같은 층에 이웃한 가로줄 없음. 높이 3 이상이면 모든 틈에 하나 이상.
- 팀: '한 팀 최대 인원'이면 팀 수 = 올림(인원 ÷ 최대). 인원 차이는 최대 1.
- 랜덤 숫자: 화면 입력은 15자리까지(±999,999,999,999,999), 한 번에 10,000개. 중복 없이 뽑기는 Floyd의 방법 뒤 섞기.
- **공유 링크 형식 번호(맨 앞 1)**: 난수를 쓰는 순서나 뽑는 방식을 바꾸면 옛 링크의 결과가 달라진다 → 번호를 올리고 옛 번호는 옛 방식으로 계속 열리게 둔다. `tests/golden.json`의 고정값이 바뀌면 이 일이 일어난 것이다.
- 링크의 한계는 글과 소개에 그대로 적는다: 링크는 "뽑은 뒤 결과를 바꾸지 않았다"만 보여 주고, 여러 번 뽑아 고른 것은 막지 못한다.
- 이 기기에 저장하는 것(개인정보 처리방침과 같아야 한다. `check.py`가 코드의 키와 방침을 대조): `pick.list`(명단), `pick.history`(최근 결과 30개), `pick.sound`, `pick.lang`. 링크로 연 명단은 고치기 전에는 저장하지 않는다. 링크로 다시 본 결과는 기록에 더하지 않는다.
- 언어: 페이지 언어는 `<html lang>`. 브라우저 언어가 다르면 닫을 수 있는 띠만 겹쳐 띄운다(자동으로 안 넘김). hreflang은 같은 역할의 짝에만(도구 7개·가이드 목록·소개·방침, 글은 사다리 글 한 쌍).
- 화면 밀림(CLS): 저장된 명단은 입력칸 바로 뒤 인라인 스크립트가 첫 그림 전에 넣는다. 결과·단추 자리는 미리 잡아 두고 `visibility`로만 숨긴다(결과가 5초 뒤에 떠도 아래가 안 밀리게). 광고 자리는 자리 바로 뒤 인라인 스크립트가 켠다. Pretendard가 오기 전 글꼴(Noto Sans CJK KR)은 `size-adjust`로 폭을 맞췄다(style.css 맨 위. 애플·윈도 기본 글꼴은 재지 못해 그대로).
- 연출: 기본 반응은 `--t`(.16s)·`--ease` 하나로. 화려한 연출은 셋뿐: 전체 화면에서 결과가 나온 순간의 색종이, 링크로 연 결과의 확인 도장, 꼬리말 루멘랩 칸의 작은 돌림판(화면에 들어오면 한 번). 돌림판이 도는 것과 사다리 길 따라가기는 도구의 본체. 동작 줄이기면 회전 없이 결과만.
- 소리는 Web Audio로 만든 짧은 소리(파일 없음). 누르기 전에는 소리 장치를 만들지 않는다. 기본 켬, 단추로 끔.
- 전체 화면 단추는 `document.fullscreenEnabled`인 기기에서만 보인다.
- 광고 자리는 돌리기·뽑기 단추에서 150px 넘게, 다른 단추·입력칸에서 40px 넘게 떨어뜨린다(`e2e.py ads`가 잰다). 404·소개·방침·가이드 목록에는 광고 코드가 없다.

## 주의할 점
- 화면 글자를 고치면 `content.json`만 고치고 빌드를 다시 돌린다. FAQ는 화면과 FAQPage가 같은 데이터에서 나온다.
- 글에 바깥 사실을 더할 때는 공식 출처를 확인한 것만. 지금 글의 바깥 사실은 MDN 두 문서(crypto.getRandomValues, Math.random), Fisher–Yates의 출처(Durstenfeld 1964, Knuth TAOCP 2권 알고리즘 P), 사다리의 다른 이름(아미다쿠지, Ghost Leg)뿐이다. 추첨·경품의 법 이야기는 쓰지 않는다.
- 영어 페이지에 한글을 쓰려면 `lang="ko"`로 감싼다(안 감싸면 `check.py`가 실패). 화면 코드가 데이터에서 넣는 글자는 `e2e.py tools`가 눌러 본 뒤 다시 확인한다.
- 광고 코드가 있는 실제 주소를 자동으로 열지 않는다. 로컬에서도 `e2e.py`는 광고 요청을 정규식으로 막는다.
- `tests/run.mjs`의 균등성 검정은 씨앗이 고정이라 늘 같은 결과다(가끔 실패하는 테스트가 아니다). 실패하면 로직이 바뀐 것이다.
- 폴더 안에 `node_modules`·`__pycache__`·`.wrangler`를 남기지 않는다(파이썬은 `-B`로 돌린다. `check.sh`가 끝에 지운다).
