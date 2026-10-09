# 칸칸 / Kankan (count)

글자 수를 세는 도구 사이트. 같은 글도 세는 기준(공백, 줄바꿈 0·1·2자, 글자 대 바이트)에 따라 숫자가 달라지는 것을 한 화면에 나란히 보여 준다. 글은 브라우저 밖으로 나가지 않는다(서버 코드 없음, 정적 사이트, 배포 때 빌드 없음).
- 주소: https://count.lumenlab.page (Worker `count`, workers.dev 끔). 영어 `/`(x-default), 한국어 `/ko/`.
- 도구: 영어 = Word Counter(`/`), Character Counter(`/character-counter/`, X 가중 글자 수), SMS Counter(`/sms/`). 한국어 = 글자수 세기(`/ko/`), 자소서(`/ko/jasoseo/`), 바이트 계산기(`/ko/byte/`), 원고지(`/ko/wongoji/`).
- 가이드 글: 언어판마다 3편(번역이 아니라 따로 고른 주제. 이모지 글 한 쌍만 hreflang으로 잇는다).

## 폴더
- `_dev/build.py` **모든 HTML·sitemap.xml·rss.xml·404.html을 만든다**: `python3 count/_dev/build.py` (`--check`는 낡았는지만 본다). 만든 파일은 손으로 고치지 않는다.
  - 화면 글 = `_dev/content.json`(ui·t·sample·pages), 가이드 글 = `_dev/articles.json`, 도구 구성(큰 숫자·줄·목표 기준·불러올 스크립트) = build.py의 `TOOLS`·`M`·`GOAL`·`NAV`.
  - `_dev/limits.json` 공식 출처 확인을 기다리는 값의 자리(전부 `verified: false`). 확인된 값만 화면·글에 쓴다.
- `assets/lc-core.js` 세는 로직(`LC.analyze`): 글자(사람이 보는 글자·코드 포인트·UTF-16 단위), 공백, 줄바꿈 0·1·2, 바이트, 어절·단어·문장·문단·줄, 글자 종류. DOM을 모른다.
- `assets/lc-cp949.js` EUC-KR(CP949) 표(자동 생성), `lc-x.js` + `lc-x-tld.js` X 가중 글자 수, `lc-sms.js` SMS 조각, `lc-wongoji.js` 원고지.
- `assets/app.js` 화면 연결(세는 화면, 목표 칸, 글자 뜯어보기, 자소서, 원고지 SVG, 다른 언어 안내 띠, 루멘랩 칸). 문구는 빌드가 페이지에 넣어 둔 `#kk` JSON에서 읽는다.
- `assets/style.css` 모양(토큰은 `:root`), `assets/pretendard.css` 글꼴 CSS(자동 생성: `_dev/font_css.py`), `assets/ads-config.js` 광고 설정.
- `tests/` 로직 시험과 기준값. `_dev/check.py` 정적 검사, `_dev/e2e.py` 화면 확인, `_dev/serve.mjs` 로컬 서버, `_dev/og.py` 공유 그림.

## 명령어
- 전부 확인: `count/_dev/check.sh` (로직 테스트 → 빌드 최신 → 정적 검사). `count/_dev/check.sh e2e [스크린샷 폴더]`는 화면 확인까지(Playwright, 약 3분).
- 로직 테스트만: `node count/tests/run.mjs` (추가 설치 없이 돈다. 묶음 이름을 붙이면 그것만: `node count/tests/run.mjs guide x`).
- 로컬 보기: `node count/_dev/serve.mjs` → http://localhost:8443 (폴더 → index.html, 없는 주소 → 404.html, `_dev`·`tests` 막음).
- 기준값 다시 만들기(시험용 설치는 저장소 밖 폴더에): `pip install regex grapheme uniseg emoji smsutil`, `npm install twitter-text sms-segments-calculator split-sms` 뒤
  `python count/tests/gen_cp949.py` → `python count/tests/gen_cases.py` → (npm 폴더에서) `node count/tests/gen_x.mjs` → `PY=<그 파이썬> node count/tests/gen_sms.mjs`.
- 공유 그림: `python3 count/_dev/og.py` (og.png, og-ko.png). 글꼴 CSS: `python3 count/_dev/font_css.py`.
- 배포: `.deploy-actions`가 있어 main에 푸시하면 GitHub Actions가 wrangler로 배포.

## 세는 기준(화면 설명과 같아야 한다)
- 글자 = 유니코드 UAX #29 글자 묶음(`Intl.Segmenter`). 없는 브라우저는 코드 포인트로 세고 `approx.grapheme`으로 알린다. 긴 글은 단순 글자 구간을 직접 세고 복잡한 자리만 `segments.containing(i)`로 묻는다(100만 자 수십 ms).
- 공백 = 유니코드 White_Space 25자. 줄바꿈 = CRLF·CR·LF 각각 한 번이고 0·1·2자(바이트) 가운데 고른다. UTF-16은 그 두 배.
- 바이트: UTF-8, UTF-16(BOM 없음), EUC-KR = CP949 표(2바이트 17,048자). 표에 없는 글자는 '못 담는 글자'로 따로 세고 바이트에서 뺀다. 옛 완성형(KS X 1001) 2,350자 밖 한글도 따로 센다.
- 단어: `words` = 띄어쓰기 덩어리(영어판 기본, 한국어판 어절), `wordsSeg` = 유니코드 단어 규칙(영어판에 곁들여 보여 줌).
- X 가중 글자 수: twitter-text 3.1.0 설정(280, 범위 안 1·밖 2, 주소 23)과 같은 정규식. 이모지는 브라우저가 아는 RGI 이모지 묶음 전부 2(라이브러리 3.1.0은 옛 목록이라 새 묶음 810개를 더 크게 센다. 시험에 적어 둠).
- SMS: GSM-7 기본 128칸 + 두 칸짜리 10자, 160/153, 표 밖 글자가 있으면 UCS-2 70/67. 두 칸짜리 글자·서로게이트 짝은 통 경계에서 안 쪼갠다.
- 원고지: '글자 수로 환산' = 글자 수(띄어쓰기 포함·줄바꿈 제외) ÷ 200 올림, '칸에 놓으면' = 20칸 × 10줄에 한 칸 한 글자·줄을 바꾸면 다음 줄 첫 칸부터. 첫 화면의 원고지 숫자는 환산 값이다. 원고지 쓰기 규칙(숫자 두 자 한 칸 등)은 `lc-wongoji.js`에 선택 규칙으로 있지만 출처 확인 전이라 화면에 내놓지 않았다.
- 읽는·말하는 시간(영어판): 단어 수 ÷ 분당 단어 수. 200·130은 가정한 값이라 화면에 'assumed'라고 적고 바꿀 수 있게 했다.

## 설계 결정
- 배치: 왼쪽 큰 글 칸 + 오른쪽 숫자 기둥. 휴대폰은 글 칸 위에 붙어 다니는 숫자 띠(아래 고정 띠는 키보드에 가려서 쓰지 않음). 휴대폰 글 칸은 글 길이만큼 늘어난다.
- 목표는 처음엔 비어 있다. '목표 정하기'를 눌러 숫자와 기준(공백 포함·제외·바이트 등)을 고른다. 목표 칸은 25칸(한 칸 4%).
- 색: 잉크 남색 한 색(`--main`) + 넘침 주홍(`--over`, 넘었거나 못 담을 때만). 상징은 칸(원고지 한 칸 = 한 글자): 로고, 목표 칸, 글자 뜯어보기, 원고지, 루멘랩 칸.
- 연출 셋(app.js·style.css): 루멘랩 칸 채우기(꼬리말, 화면에 들어올 때 한 번), 글자 뜯어보기 펼침(눌렀을 때만), 목표 맞춤 동그라미(고쳐 쓰다가 목표의 90~100%에 처음 들어온 순간만. 붙여 넣기·목표를 적는 순간에는 안 나옴). 글을 치는 중에는 숫자가 세는 효과 없이 바로 바뀐다. 동작 줄이기면 셋 다 움직이지 않는다.
- 글꼴: Pretendard를 `font-display: optional`로 쓴다(자체 CSS `assets/pretendard.css`, 글꼴 파일은 jsDelivr). swap이면 글이 많은 페이지에서 글꼴이 늦게 올 때 줄 수가 바뀌어 화면 밀림이 0.03~0.13 나왔다. optional이면 처음 온 사람은 기기 글꼴, 받아 둔 뒤에는 Pretendard로 보이고 밀림은 0.
- 광고: 자동 광고 코드는 도구·글 페이지 `<head>`에만(소개·방침·오픈소스 고지·가이드 목록·404에는 없음). 수동 자리 `mid`·`bottom` 두 곳은 단위 번호가 비어 있어 지금은 화면에 없다. `ads-config.js`가 `<head>`에서 바로 돌아 자리 높이(250px)를 첫 그림 전에 잡는다. `?adpreview`나 localhost에서는 빗금 상자.
- 저장: 기본은 저장 안 함. localStorage 키는 `kk.lang`(언어 안내 띠 닫음), `kk.jasoseo.on`·`kk.jasoseo`(자소서 화면에서 '이 기기에 저장'을 켠 사람만) 셋뿐이고 방침에 그대로 적었다(check.py가 app.js의 키와 방침을 대조).
- 언어: 페이지 언어는 `<html lang>`이 정한다. 브라우저 언어가 다르면 겹쳐 띄우는 안내 띠만(`position:absolute`, 자동으로 안 넘김).

## 주의할 점
- 가이드 글의 숫자는 `tests/run.mjs`의 `guide` 묶음이 검산한다. 글을 고치면 시험도 같이 고친다.
- 영어 페이지에는 `lang="ko"` 밖 한글이 없어야 한다(check.py는 정적 HTML, e2e.py는 쓴 뒤의 화면까지 본다). 글자 뜯어보기 예시도 언어판마다 따로다(build.py `INSPECT`).
- 나이스(생기부), 한국 문자 한 통 기준, X 말고 다른 SNS 한도, 다른 사이트의 세는 기준은 공식 출처 확인 전이라 화면·글에 없다. check.py가 그 낱말이 화면에 들어오면 실패시킨다. 확인되면 `limits.json`에 값·출처·확인한 날을 적고 그 검사를 고친다.
- 노드의 `TextDecoder('euc-kr')`은 좁은 완성형(8,224자)이라 CP949 전체 대조는 브라우저에서 한다(e2e.py).
- 스크린샷을 Pretendard로 찍으려면 e2e.py처럼 글꼴 CSS의 표시 방식을 swap으로 바꿔 줘야 한다(optional은 처음 여는 브라우저에서 기기 글꼴로 그린다).
- 광고 코드가 있는 실제 주소를 자동으로 열 땐 광고 요청을 정규식으로 막는다(`googlesyndication|doubleclick|adservice|fundingchoices`).
