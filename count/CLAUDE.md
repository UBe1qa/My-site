# 칸칸 / Kankan (count)

글자 수를 세는 도구 사이트. 같은 글도 세는 기준(공백, 줄바꿈 0·1·2자, 글자 대 바이트, 서비스마다 다른 세는 단위)에 따라 숫자가 달라지는 것을 한 화면에 나란히 보여 준다. 쓰거나 붙여 넣은 글은 브라우저 밖으로 나가지 않는다(서버 코드 없음, 정적 사이트, 배포 때 빌드 없음).
- 주소: https://count.lumenlab.page (Worker `count`, workers.dev 끔). 영어 `/`(x-default), 한국어 `/ko/`.
- 도구: 영어 = Word Counter(`/`), Character Counter(`/character-counter/`, X 가중 글자 수 + SNS 한도), SMS Counter(`/sms/`). 한국어 = 글자수 세기(`/ko/`), 자소서(`/ko/jasoseo/`), 바이트 계산기(`/ko/byte/`, 문자 한 통 기준), 나이스 생기부 바이트 계산기(`/ko/neis/`), SNS 글자수 세기(`/ko/sns/`), 원고지(`/ko/wongoji/`).
- 가이드 글: 한국어 4편, 영어 3편(번역이 아니라 따로 고른 주제. 이모지 글 한 쌍만 hreflang으로 잇는다).

## 폴더
- `_dev/build.py` **모든 HTML·sitemap.xml·rss.xml·404.html을 만든다**: `python3 count/_dev/build.py` (`--check`는 낡았는지만 본다). 만든 파일은 손으로 고치지 않는다.
  - 화면 글 = `_dev/content.json`(ui·t·sample·pages), 가이드 글 = `_dev/articles.json`, 도구 구성(큰 숫자·줄·목표 기준·불러올 스크립트) = build.py의 `TOOLS`·`M`·`GOAL`·`NAV`.
  - `_dev/limits.json` **공식 출처에서 확인한 값**(나이스 항목·바이트 규칙, 문자 한 통 기준, SNS 한도와 세는 단위, 읽기 속도, 원고지 관행, 취업 사이트에 직접 넣어 본 값). 묶음마다 `verified`·`checked`(확인한 날)·출처 주소·`not_verified`(확인 못 해 싣지 않은 것)가 있다. build.py가 여기서 표·목록·출처 링크를 만든다.
  - 글 본문의 자리 표시 `<!--neis-table-->`, `<!--jobsites-measured-->`, `<!--jobsites-rules-->`는 limits.json으로 만든 표로 바뀐다. `<table class="wide">`는 휴대폰에서 옆으로 미는 넓은 표.
- `assets/lc-core.js` 세는 로직: `LC.analyze`(글자·공백·줄바꿈 0·1·2·바이트·어절·단어·문장·문단·줄), `LC.measure(text, unit)`(SNS 한도용 단위: grapheme·utf16·utf8·euckr·x), `LC.neis(text, 최대 글자 수)`(나이스 바이트). DOM을 모른다.
- `assets/lc-cp949.js` EUC-KR(CP949) 표(자동 생성), `lc-x.js` + `lc-x-tld.js` X 가중 글자 수, `lc-sms.js` SMS 조각(영어판), `lc-wongoji.js` 원고지(`layout(text, opts)`, `CUSTOM` = 화면의 '관행대로').
- `assets/app.js` 화면 연결(세는 화면, 목표 칸, 글자 뜯어보기, 나이스, 문자 한 통 기준, SNS 한도 목록, 자소서, 원고지 SVG, 다른 언어 안내 띠, 루멘랩 칸). 문구는 빌드가 페이지에 넣어 둔 `#kk` JSON에서 읽는다.
- `assets/style.css` 모양(토큰은 `:root`), `assets/pretendard.css` 글꼴 CSS(자동 생성: `_dev/font_css.py`), `assets/ads-config.js` 광고 설정.
- `tests/` 로직 시험과 기준값. `_dev/check.py` 정적 검사, `_dev/e2e.py` 화면 확인, `_dev/serve.mjs` 로컬 서버, `_dev/og.py` 공유 그림.

## 명령어
- 전부 확인: `count/_dev/check.sh` (로직 테스트 → 빌드 최신 → 정적 검사). `count/_dev/check.sh e2e [스크린샷 폴더]`는 화면 확인까지(Playwright. 한가할 때 5분쯤, 기계가 바쁘면 더 걸린다).
- 로직 테스트만: `node count/tests/run.mjs` (추가 설치 없이 돈다. 묶음 이름을 붙이면 그것만: `node count/tests/run.mjs neis units facts3`).
- 화면 확인을 묶음만: 서버를 띄우고 `SEC=6 python3 count/_dev/e2e.py`(1 모든 페이지 · 2 한국어 첫 화면 · 3 영어 첫 화면 · 4 글자 수·문자 · 5 바이트·원고지·자소서 · 6 나이스·SNS · 7 글·광고 자리).
- 로컬 보기: `node count/_dev/serve.mjs` → http://localhost:8443 (폴더 → index.html, 없는 주소 → 404.html, `_dev`·`tests` 막음).
- 기준값 다시 만들기(시험용 설치는 저장소 밖 폴더에): `pip install regex grapheme uniseg emoji smsutil`, `npm install twitter-text sms-segments-calculator split-sms` 뒤
  `python count/tests/gen_cp949.py` → `python count/tests/gen_cases.py` → `python count/tests/gen_units.py` → (npm 폴더에서) `node count/tests/gen_x.mjs` → `PY=<그 파이썬> node count/tests/gen_sms.mjs`.
- 공유 그림: `python3 count/_dev/og.py` (og.png, og-ko.png). 글꼴 CSS: `python3 count/_dev/font_css.py`.
- 배포: `.deploy-actions`가 있어 main에 푸시하면 GitHub Actions가 wrangler로 배포.

## 세는 기준(화면 설명과 같아야 한다)
- 글자 = 유니코드 UAX #29 글자 묶음(`Intl.Segmenter`). 없는 브라우저는 코드 포인트로 세고 `approx.grapheme`으로 알린다. 긴 글은 단순 글자 구간을 직접 세고 복잡한 자리만 `segments.containing(i)`로 묻는다(100만 자 수십 ms).
- 공백 = 유니코드 White_Space 25자. 줄바꿈 = CRLF·CR·LF 각각 한 번이고 0·1·2자(바이트) 가운데 고른다. UTF-16은 그 두 배.
- 바이트: UTF-8, UTF-16(BOM 없음), EUC-KR = CP949 표(2바이트 17,048자). 표에 없는 글자는 '못 담는 글자'로 따로 세고 바이트에서 뺀다. 옛 완성형(KS X 1001) 2,350자 밖 한글도 따로 센다.
- 단어: `words` = 띄어쓰기 덩어리(영어판 기본, 한국어판 어절), `wordsSeg` = 유니코드 단어 규칙(영어판에 곁들여 보여 줌).
- **나이스(생기부)**: 2026학년도 고등학교 기재요령 [참고자료 8]. 한글 1자 3Byte, 영문·숫자 1자 1Byte, **엔터 1Byte**. 한도 = 항목의 최대 글자 수(한글 기준) × 3(곱은 '계산한 값'이라고 밝힌다). 원문에 없는 띄어쓰기·문장부호·특수문자는 우리 기준(ASCII 1Byte, 그 밖은 UTF-8 바이트)이라고 화면에 적었다. 중학교·초등학교 값은 확인 못 해 없다.
- **문자 한 통 기준**(바이트 화면): LG유플러스·KT 안내의 단문 140byte 이하(장문 141byte부터)가 기본. 90byte는 '웹 문자 발송 서비스에 많다고 알려진' 기준으로만 고르게 했다. EUC-KR 바이트로 견준다. 장문은 틀린 게 아니라서 넘침 색을 쓰지 않는다.
- **SNS 한도**: 서비스마다 세는 단위가 다르다(X = 가중치, 유튜브 설명 = UTF-8 바이트, 틱톡 = UTF-16 단위, 블루스카이 = 글자소). 공식 문서에 단위가 없는 곳(인스타그램·스레드·링크드인·유튜브 제목·X 프리미엄)은 UTF-16 단위로 보여 주고 그렇게 밝힌다.
- X 가중 글자 수: X 공식 문서(docs.x.com)와 twitter-text v3.json(280, 범위 안 1·밖 2, 주소 23). 정규식은 npm twitter-text 3.1.0과 글자 하나까지 같다. 이모지는 브라우저가 아는 RGI 이모지 묶음 전부 2(문서: 모든 이모지 2. npm 3.1.0은 옛 목록이라 새 묶음 810개를 더 크게 센다. 시험에 적어 둠).
- SMS(영어판): GSM-7 기본 128칸 + 두 칸짜리 10자, 160/153, 표 밖 글자가 있으면 UCS-2 70/67. 두 칸짜리 글자·서로게이트 짝은 통 경계에서 안 쪼갠다.
- 원고지: '글자 수로 환산' = 글자 수(띄어쓰기 포함·줄바꿈 제외) ÷ 200 올림. '칸에 놓으면' = 20칸 × 10줄에 놓은 장수이고 방법 두 가지: '한 칸에 한 글자'(기본) / '관행대로'(문단 첫 칸 비움, 줄 첫 칸의 띄어쓰기 생략, 덩어리 숫자 두 자 한 칸, 줄 끝에서 넘치는 온점·반점·물음표·느낌표는 마지막 칸에, 온점+닫는 따옴표 한 칸). 원고지 쓰는 법은 어문 규정이 아니라 관행이라고 화면에 밝힌다(국립국어원 답변). 알파벳 소문자 두 자 한 칸은 근거를 확인 못 해 쓰지 않는다.
- 읽는 시간(영어판): 단어 수 ÷ 분당 단어 수. 처음 값은 Brysbaert(2019)의 영어 성인 평균 238(묵독, 비소설)·183(소리 내어)이고 바꿀 수 있다. 한국어판에는 읽는 시간이 없다(한국어 분당 글자 수는 확인된 값이 없음).
- 자소서: 문항마다 기준 넷(공백 포함·공백 제외·바이트 한글 2byte = EUC-KR·바이트 한글 3byte = UTF-8). '취업 사이트 바이트에 맞추기' 단추는 모든 문항을 한글 2byte 기준으로, 줄바꿈을 1(사람인·잡코리아·네이버) 또는 2(인크루트)로 바꾼다.

## 설계 결정
- 배치: 왼쪽 큰 글 칸 + 오른쪽 숫자 기둥. 휴대폰은 글 칸 위에 붙어 다니는 숫자 띠(아래 고정 띠는 키보드에 가려서 쓰지 않음). 휴대폰 글 칸은 글 길이만큼 늘어난다. 휴대폰에서도 제목 아래 '왜 여기서 세나' 한 줄이 보인다.
- 메뉴: 한국어는 일곱 개라 900px 아래에서는 한 줄로 두고 옆으로 민다(오른쪽 끝이 흐려짐, 지금 페이지가 보이게 맞춰 둠).
- 목표는 처음엔 비어 있다. 목표를 안 넣었으면 목표 칸(막대)은 숨기고 '목표 글자 수 넣기' 한 줄만 보인다. 목표 칸은 25칸(한 칸 4%).
- 글을 쓰기 전에 정하는 것(나이스 항목)은 글 칸 머리(`.pad-top`)에 둔다. 휴대폰에서도 글 칸 위에 온다.
- 색: 잉크 남색 한 색(`--main`) + 넘침 주홍(`--over`, 넘었거나 못 담을 때만). 상징은 칸(원고지 한 칸 = 한 글자): 로고, 목표 칸, 글자 뜯어보기, 원고지, 루멘랩 칸.
- 안심 문구("글은 이 기기 밖으로 나가지 않아요")는 자물쇠 그림 + 평문이다(알약 모양은 단추로 보인다는 지적).
- 연출 셋(app.js·style.css): 루멘랩 칸(꼬리말. **글자는 늘 보이고** 화면에 들어올 때 한 번 차례로 다시 놓인다), 글자 뜯어보기 펼침(눌렀을 때만), 목표 맞춤 동그라미(고쳐 쓰다가 목표의 90~100%에 처음 들어온 순간만). 글을 치는 중에는 숫자가 세는 효과 없이 바로 바뀐다. 동작 줄이기면 셋 다 움직이지 않는다.
- 글꼴: Pretendard를 `font-display: optional`로 쓴다(자체 CSS `assets/pretendard.css`, 글꼴 파일은 jsDelivr). swap이면 글이 많은 페이지에서 화면 밀림이 0.03~0.13 나왔다.
- 광고: 자동 광고 코드는 도구·글 페이지 `<head>`에만(소개·방침·오픈소스 고지·가이드 목록·404에는 없음). 수동 자리 `mid`·`bottom` 두 곳은 단위 번호가 비어 있어 지금은 화면에 없다. 자리 폭은 글 기둥과 같은 780px(도구 화면은 왼쪽 끝에 맞춤 `.left`, 글은 가운데 `.narrow`), 표시 글자 12.5px. `?adpreview`나 localhost에서는 빗금 상자.
- 표: 전부 `.tbl` 칸 안. 넓은 표(`.tbl.wide`)는 560px 아래에서 옆으로 밀고 '표를 옆으로 밀어 보세요' 한 줄을 보여 준다. 그 밖의 표는 320px에서도 넘치지 않아야 한다(e2e가 본다).
- 저장: 기본은 저장 안 함. localStorage 키는 `kk.lang`(언어 안내 띠 닫음), `kk.jasoseo.on`·`kk.jasoseo`(자소서 화면에서 '이 기기에 저장'을 켠 사람만) 셋뿐이고 방침에 그대로 적었다(check.py가 app.js의 키와 방침을 대조).
- 방침: 방문 통계는 Cloudflare Web Analytics라고 적는다(Cloudflare가 실제 주소에서 스크립트를 자동으로 끼워 넣는다. 우리 HTML에는 없다). "아무것도 보내지 않아요"처럼 넓게 쓰지 않고 '쓰거나 붙여 넣은 글'에 대한 말로만 쓴다.
- lastmod: build.py의 `lastmod()`. 본문·구조화 데이터·링크가 바뀐 페이지만 새 날짜(`UPDATED`에 주소를 적는다). 글의 '마지막 확인' 날짜도 같은 값이다.

## 주의할 점
- 공식 출처가 필요한 숫자는 `_dev/limits.json`에 확인된 것만 적고, 화면에 출처 링크와 확인한 날을 같이 싣는다. 원문에 없는 환산(500자 = 1,500Byte, 한글만 140자 등)은 "계산하면"이라고 밝힌다. check.py가 출처 링크·날짜·숫자 일치, 확인 못 한 낱말(페이스북 한도, SKT 한도 등)을 본다.
- 가이드 글의 숫자는 `tests/run.mjs`의 `guide`·`neis`·`units`·`facts3` 묶음이 검산한다. 글을 고치면 시험도 같이 고친다. 취업 사이트 표의 '칸칸' 줄은 limits.json `jobsites.ours`이고 시험이 로직과 대조한다.
- '세다'의 높임은 '세어요'로 쓴다('세요'는 명령과 헷갈린다. check.py가 본다).
- 영어 페이지에는 `lang="ko"` 밖 한글이 없어야 한다(check.py는 정적 HTML, e2e.py는 쓴 뒤의 화면까지 본다). 글자 뜯어보기 예시도 언어판마다 따로다(build.py `INSPECT`).
- 노드의 `TextDecoder('euc-kr')`은 좁은 완성형(8,224자)이라 CP949 전체 대조는 브라우저에서 한다(e2e.py).
- 스크린샷을 Pretendard로 찍으려면 e2e.py처럼 글꼴 CSS의 표시 방식을 swap으로 바꿔 줘야 한다(optional은 처음 여는 브라우저에서 기기 글꼴로 그린다).
- 광고 코드가 있는 실제 주소(`*.lumenlab.page`)는 자동 도구로 열지 않는다. 로컬에서도 광고 요청은 정규식으로 막는다(`googlesyndication|doubleclick|adservice|fundingchoices`).

## 유지 일정
- 해마다 2~3월(새 학년도 기재요령이 나올 때): 나이스 항목별 최대 글자 수와 바이트 규칙 → 학교생활기록부 종합지원포털 자료실. `limits.json`의 `neis`, 화면의 학년도, 글 한 편, 시험의 항목 목록을 같이 고친다.
- 반기마다: SNS 한도(`limits.json`의 `sns.rows`, 출처 주소 그대로), X 규칙(v3.json·twitter-text 새 판), 통신사 문자 안내.
- 취업 사이트 측정값은 '2026년 10월 10일에 넣어 본 값'이다. 다시 넣어 보면 날짜와 `jobsites` 값을 같이 고친다.
- 유니코드 새 판(해마다 9월쯤): 코드는 브라우저가 따라간다. 시험의 이모지 판(`gen_cases.py`의 `EMOJI_MAX`)만 올린다.
