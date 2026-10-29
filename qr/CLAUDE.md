# 오래QR / Staycode (qr)

무료 QR코드 생성기(수익형, 애드센스). 정적 QR만 만든다: 넣은 내용이 그림 안에 그대로 들어가고 이 사이트를 거치지 않아 만료가 없다. 유료 사이트(QRFY·ME-QR)의 유료 기능(점·눈 모양, 그라데이션, 로고, 틀+문구, SVG/PDF/EPS, 대량, 스캔 확인)을 가입 없이. 모든 처리는 브라우저 안(서버 코드 없음, 빌드 없이 배포, CDN 라이브러리 없음).
- 주소: https://qr.lumenlab.page (Worker `qr`, workers.dev 끔). 영어 `/`(x-default), 한국어 `/ko/`. 로컬 포트 8471.
- 설계서(이름·상징·자유 칸·망설임·연출 요청문): 비공개 저장소 `context/knowledge/4-내-사이트/qr-사이트-구조.md`.
- 페이지: 만들기 `/` · 와이파이 `/wifi/` · 명함 `/vcard/` · 대량 `/bulk/` · 스캐너 `/scan/` · 가이드 `/guide/<slug>/` · 소개 · 방침 (두 언어 짝, hreflang) + `404.html`(두 언어 틀).

## 폴더
- `_dev/build.py` **모든 HTML·sitemap.xml·404.html 을 만든다**: `python3 qr/_dev/build.py` (`--check` 는 낡았는지만). 만든 파일은 손으로 고치지 않는다.
  - 화면 글 = `_dev/content.py`(TX 틀 글, UI 도구 글, M 스크립트 문구·알림 코드, FIELDS 입력 칸, PAGES 제목·설명, FAQ, ABOUT, PRIVACY, STORE_KEYS).
  - 가이드 글 = `_dev/articles.py`(**글 담당 에이전트가 쓴다. 없으면 빈 목록**). 형식: `ARTICLES = [{lang, slug, title, description, h1, lead, body, pair, tool, checked, sources:[{label,url,checked}]}]`. 주소 `/guide/<slug>/`·`/ko/guide/<slug>/`, 짝(`pair`)이 다른 언어에 있으면 hreflang.
  - 2026-10-29부터 이 가이드 HTML 은 `lumenlab/_dev/build_home.py` 가 읽어 lumenlab.page/guides/qr/(영어 /en/guides/qr/)에 싣는 원본일 뿐이다: 이 사이트는 올리지 않고(`.assetsignore`) sitemap 에도 안 넣으며 옛 주소는 301(`_redirects`), 링크는 새 주소(`guide_links()`). 글을 고치면 이 도구를 빌드한 뒤 `python3 -B lumenlab/_dev/build_home.py`.
  - 인쇄 크기 안내 = `_dev/facts.md` 에 `print_tip_ko: …`·`print_tip_en: …` 줄이 있으면 그 문장(없으면 content.py 의 '…쯤' 문장).
  - 첫 HTML 의 예시 QR·모양 그림은 `_dev/render.mjs`(node)가 브라우저와 같은 `assets/qr-render.js` 로 그린다(화면 밀림 0). 꾸밈 세트 그림은 화면이 뜬 뒤 app.js 가 그린다(첫 HTML 을 가볍게).
- 로직(DOM 을 모른다, 노드 시험과 브라우저가 같이 쓴다):
  - `assets/qr.js` QR 부호(qr-maker 에서 복사, segno·python-qrcode 와 칸 단위 같음).
  - `assets/qr-payload.js` 내용 만들기(`QRP.build(type, fields)`): URL(https 붙이기·UTM)·글·와이파이(`\ ; , : "` 이스케이프)·vCard 3.0(CRLF·75바이트 접기·한글)·mailto·SMSTO·tel·geo/지도 링크·VEVENT(하루 종일=끝 다음 날)·wa.me. 알림은 코드(`c`)로만 돌려주고 글은 content.py 의 `M.err`·`M.warn`.
  - `assets/qr-render.js` 장면(scene) 하나 → SVG·캔버스. 모든 모양은 M L C Z path. 점 8 · 눈 바깥 6 · 눈 안 7 · 틀 9(+없음) · 그라데이션 · 로고(가운데 칸 비우기·바탕) · 틀 문구(글꼴 모양 path).
  - `assets/qr-export.js` PDF(손으로 쓴 벡터 PDF, 그라데이션=셰이딩)·EPS·스티커 시트(A4, 재단선)·ZIP(STORE)·같은 이름 번호.
  - `assets/qr-parse.js` 스캐너 풀기 + 주소 경고(http·짧은 주소·IP·퓨니코드·%인코딩 도메인·@·앞부분을 다른 사이트처럼 꾸민 도메인·로그인/결제 낱말·드문 포트·열면 안 되는 종류·060/1-900 유료 번호).
  - `assets/qr-presets.js` 꾸밈 세트 10개(이름·틀 문구는 언어별).
  - `assets/verify.js` 읽기(`QRV.decode`: 스캐너는 BarcodeDetector → 없으면 jsQR 일꾼) + 찍힘 확인(`QRV.check`: 규칙 검사(`QRV.warnings`) 먼저, 그다음 저장할 그림과 같은 장면을 회색·반전 없이·jsQR 로 8가지(크기·흐림·QR만) 그려 읽기. 판정 단계는 아래 '설계 결정').
  - `assets/scan-worker.js` jsQR 일꾼(필요할 때만 만든다). `assets/vendor/jsQR-1.4.0.js` + `jsQR-LICENSE.txt`(Apache-2.0).
- 화면: `assets/app.js`(만들기·와이파이·명함), `assets/bulk.js`, `assets/scan.js`, `assets/site.js`(공통: 화면 설정·언어 띠·루멘랩 칸), `assets/fx.js`(이펙트 엔진), `assets/style.css`(토큰은 `:root`, 어둡게는 `html[data-theme=dark]`).
- `assets/glyphs/` 틀 문구 글자 모양: `base.json`(영문·숫자·기호 + 화면에 미리 있는 문구의 한글, BM JUA) + 조각 `ko-<n>.json`(한글 80자씩) · `lat.json`(라틴 확장 é ñ ü ß œ…, Fredoka 600을 주아 대문자 높이에 맞춤) · `sym.json`(€ – — … 와 직접 그린 → ← ↑ ↓ ✓). 직접 쓴 문구에 필요한 조각만 받고, 어느 조각에도 없는 글자(☕ 등)는 입력하는 순간 칸 아래에 알린다. 라이선스 `OFL-Jua.txt`·`OFL-Fredoka.txt`. 만들기: `pip install fonttools` 뒤 `python3 -B qr/_dev/glyphs.py`(원본은 jsDelivr google/fonts 또는 `QR_FONT_SRC`·`QR_FONT_LATIN`). **꾸밈 세트나 FRAME_WORDS 에 새 한글 문구를 넣으면 다시 돌린다**(check.py·시험 presets 가 알려 준다).
- 시험·확인: `tests/test_logic.py`(로직), `_dev/check.py`(정적), `_dev/e2e.py`(화면, Playwright), `_dev/check.sh`(묶음), `_dev/serve.mjs`(로컬 서버), `_dev/og.py`+`og.mjs`(공유 그림), `_dev/icons.py`(아이콘), `_dev/shots/`(스크린샷), `_dev/lumenlab-icon.svg`(루멘랩 카드 아이콘).

## 명령어
- 빠른 확인: `qr/_dev/check.sh` (빌드 최신 → 정적 검사 → JS 문법 → 로직 시험 빠른 묶음, 1분쯤).
- 전부: `qr/_dev/check.sh full` (로직 전부: 디자인 판독 290개·PDF/EPS/시트/ZIP·2단계 + 화면 확인 14묶음(13 = 판정 vs zxing 148개, 14 = 저장 막대·틀 글자·크기·예시·스캐너). 20분쯤). 화면만: `qr/_dev/check.sh e2e [폴더]`. 묶음 하나: 서버를 띄우고 `SEC=5,6 python3 qr/_dev/e2e.py`.
- 배포 뒤: `qr/_dev/check.sh live` (실제 주소 = 저장소, 404·개발 파일 404·머리말, 옛 가이드 주소 301). 지휘자가 돌린다.
- 로컬 보기: `node qr/_dev/serve.mjs` → http://localhost:8471 (폴더 → index.html, 없는 주소 → 404.html, `_dev`·`tests` 막음).
- 시험에 필요한 것: `pip install segno qrcode zxing-cpp cairosvg vobject icalendar pillow playwright`, `apt install ghostscript poppler-utils qpdf`.
- 배포: `.deploy-actions` 가 있어 main 에 푸시하면 GitHub Actions 가 wrangler 로 배포.

## 설계 결정
- **정적 QR 만.** 인쇄 뒤 주소 바꾸기·우리 서버의 스캔 집계(동적 QR)와 남의 PDF·메뉴를 올려 주는 페이지는 뺐다(설계서: 도메인 전체 위험 + 인쇄된 코드를 살려 둘 책임). 찍힌 수는 UTM 꼬리표로 손님 자신의 분석 도구에서.
- **설정을 주소(?…)에 담지 않는다**(와이파이 비밀번호가 주소·방문 통계에 남지 않게).
- **최근에 만든 QR**(2단계, 평가 H3·M4): 저장(내려받기·복사·공유)한 것만, 넣은 내용 **전체**를 남기고 화면 표시만 40자로 줄인다(잘린 내용을 되살리면 틀린 QR 이 됐다). **연락처·와이파이는 아예 남기지 않는다**(`NO_RECENT`, 방침 문장과 check.py 가 대조). 옛 형식(v 없음) 항목은 읽지 않는다.
- **찍힘 확인은 실제 판독기보다 엄하게**(2단계, 제3자 평가 H1·H2·M1): ① 규칙 검사 먼저 — 밝기 대비 2:1 미만(그라데이션은 가장 밝은 점 색, 눈 색 따로)·반전(점이 바탕보다 밝음)이면 그림을 읽지 않고 '안 읽힘'(`rule_fail`). ② 그림 읽기는 회색으로 바꿔, 반전 없이(`strict`), jsQR 하나로(기기마다 BarcodeDetector 결과가 달라지지 않게) 8가지 크기·흐림·QR만 자르기. ③ 읽혔어도 규칙(대비 4:1 미만·로고·여백 4칸 미만)에 걸리면 '주의'이고 **"읽어 보니 똑같아요" 안심 문구를 쓰지 않는다**(`read_warn`). ④ 못 읽었는데 무늬를 망가뜨리는 조건(로고 큼·로고+L/M·여백 2칸 미만)이 없으면 '주의'(`unsure`: 브라우저 판독기의 약점일 수 있음), 있으면 '안 읽힘'. e2e 13 이 148개(평가 사례 전부 + 무작위)를 zxing(반전 없이, PNG·SVG 둘 다)과 맞춘다: **'통과'·안심 문구인데 zxing 실패 = 0**이어야 통과.
- **틀이 있으면 둘레 여백은 2칸 아래로 안 내려간다**(`MIN_FRAME_MARGIN`, 틀의 진한 띠가 무늬에 붙으면 안 읽혔다: 평가 H1). 늘렸다는 안내(i)를 판정 목록에 띄운다.
- **찍힘 확인**: 내용·디자인이 멈춘 뒤 0.5초. 결과(미리보기)는 그 자리에서 바로 바뀌고 확인은 따로(느린 기기 흉내 한 글자 → 다시 그리기 가운데값 5ms 안팎). 통과 = 다시 읽은 바이트 = 넣은 내용 + 규칙 걸림 0. 주의: 대비 2~4:1(두 색과 숫자), 로고가 비운 칸이 복원 여유의 1/3 초과 또는 로고 + L/M, 여백 4칸 미만. 안내(i): 투명, 그릴 수 없는 틀 글자. 실패·경고 문구는 다음 행동까지 말한다.
  - **판독기는 모양마다 강약이 다르다**: 브라우저 안 jsQR 은 점(dots)·세로 줄을 큰 그림에서, 다이아 모양을 작은 그림에서 놓쳤다(zxing 은 읽음). 그래서 한 번만 그려 '안 읽힘'이라 하지 않고 여덟 가지로 그려 보고, 망가뜨리는 조건이 없으면 '주의(unsure)'로 둔다. 화면 문구는 "실제 결과는 인쇄·조명·카메라에 따라 다를 수 있어요"까지.
- **읽히는 모양만 둔다**(시험 design 이 290개를 zxing 으로 읽는다): 눈은 7칸 고리 + 1칸 틈 + 3칸 가운데 비율을 지키고, 둥근 눈(잎·물방울)은 반지름 2.5칸까지(3칸이면 안 읽히는 조합이 나왔다), 눈 가운데 '다이아'는 3.5칸 팔각(마름모는 가로·세로가 3칸을 못 채워 jsQR 이 눈으로 못 봤다). 점 모양 가운데 '점'은 반지름 0.46칸.
- **투명 바탕은 틀이 없을 때(또는 모서리 틀)만.** 틀이 QR 을 감싸면 QR 칸에는 바탕색을 깐다: 투명하게 두면 QR 이 진한 틀 색 위에 놓여 안 읽혔다(시험에서 28개 실패 → 0).
- 틀 문구는 글꼴 파일을 화면에 부르지 않고 글자 모양 path 로 그린다 → 미리보기·PNG·SVG·PDF·EPS 가 같은 글자 모양이고, 받은 파일에 글꼴이 필요 없다.
- 로고는 512px PNG 로 굳혀 쓴다(SVG 로고도). 로고를 넣으면 오류 복원을 H 로 올리고 알린다(빼면 원래대로).
- PDF 는 그림(비트맵) 없이 path 로만(로고만 그림). EPS 는 투명이 없어 로고를 바탕색에 합친다.
- **크기(cm) = QR 무늬 한 변**(눈 바깥 끝~끝, 여백·틀 빼고. 2단계 평가 M6): PDF·EPS·스티커 시트 모두. 화면 이름표에 '(여백·틀 빼고)'를 쓰고, 시트는 스티커 한 장의 실제 mm 를 같이 보여 준다. A4 가운데 PDF 는 A4 를 넘으면 줄인다.
- 스티커 시트: A4, 여백 10mm, 칸 사이 6mm, 칸 모서리 바깥 재단선 2.5mm. 'PDF 받기'와 '바로 인쇄'(인쇄 CSS, A4 한 장)가 같은 칸 수.
- 대량: 한 번에 1,000줄(`limit`, 화면·FAQ 숫자와 check.py 가 대조, 넘으면 단추가 '앞 1,000줄 만들기'). 줄마다 같은 찍힘 확인. 미리보기 표는 100줄까지.
  - **줄 나누기 규칙**(2단계, 평가 H4, 입력칸 아래에 종류마다 보임): 글 = 한 줄 전체가 내용(쉼표로 안 나눔), 파일 이름은 '이름(탭)내용'만. 첫 줄이 `filename,content` 같은 제목줄인 CSV 일 때만 칸(따옴표 규칙)으로. URL = '이름,주소'·'이름(탭)주소'(쉼표 앞이 주소 모양이면 이름으로 안 봄). 와이파이 = CSV 칸.
- 일정: 시각은 만든 기기의 시간대로 받아 UTC(끝에 Z)로 담는다(평가 L9). 하루 종일은 날짜 그대로.
- 첫 화면·대량의 '예시' 미리보기는 `QRR.fake`(눈·타이밍만 남기고 섞은 무늬)라 캡처해 써도 읽히지 않는다(평가 L3).
- 가이드 글이 0편인 언어판은 메뉴·꼬리말·sitemap·`/guide/` 페이지에서 가이드를 뺀다(빈 페이지 방지, 평가 M3). 빌드는 더 만들지 않는 옛 index.html 을 지운다.
- 스캐너: 자동으로 열지 않는다(누를 때만 새 창, `noopener noreferrer`). javascript:·data: 같은 것은 열기 단추 없음. `@` 가 든 주소는 @ 뒤가 실제 도메인이라 그것을 크게. 경고가 없다고 안전하다고 쓰지 않는다.
- 색: 넓게 = 박리지 민트·세이지(`--liner*`), 주황 `--save` = 저장(떼어 가기)에만, 초록 `--ok`·빨강 `--bad` = 찍힘 확인·입력 오류의 뜻으로만. 메뉴·탭·입력칸·꼬리말은 흔한 모양(친숙 8 : 개성 2).
- 색 탭의 '점·바탕 색 바꾸기'는 뺐다(누르면 늘 읽히지 않는 반전 조합이 됐다: 평가 L5). 로고를 넣은 뒤 오류 복원을 직접 고르면 'H로 올렸어요' 알림을 지운다(L6).
- 화면 설정(톱니): 이펙트 끔/가볍게/화려하게(기본 화려하게, 느린 기기는 스스로 한 단계 내림), 밝게/어둡게(기본 밝게, 기기 어두운 모드는 따르지 않는다). 동작 줄이기면 fx0 고정. `<head>` 스크립트가 첫 그림 전에 `html.fx0/1/2`·`data-theme`.
- 언어 안내 띠: 브라우저 언어가 다른 판에서만, 화면 아래 가운데에 겹쳐 띄우고 누를 것과 겹치는 동안은 아래로 숨는다(site.js, e2e 3 이 4가지 폭 × 14자리에서 잰다).
- 광고: 자동 광고 코드 줄만 도구·글 `<head>`(소개·방침·가이드 목록·404 없음). 도구 전체가 `#tool` 한 칸 → 자동 광고 제외 구역 권장. 수동 자리 없음.
- 저장 키: `staycode.set`·`staycode.styles`·`staycode.recent`·`staycode.lang` 넷(방침에 그대로, check.py 가 코드와 대조).

## 주의할 점
- 광고 코드가 있는 실제 주소를 자동 도구로 열지 않는다. 로컬에서도 광고 요청은 정규식으로 막는다.
- 실제 휴대폰 카메라로 찍어 보지 못했다(작업 공간). 카메라 스캔(getUserMedia)은 화면 확인에서 돌리지 않았다. BarcodeDetector 는 자동 도구(`navigator.webdriver`)에서 끄고 jsQR 로만 시험한다(실기기에서는 안드로이드 크롬 등이 BarcodeDetector 를 쓴다).
- segno 1.6.x 는 끝 표시 뒤 길이가 8의 배수여도 0 을 8개 더 써서 칸이 다르다(판독 결과는 같음). 시험은 그 한 줄만 표준대로 바꿔 대조하고, 손대지 않은 python-qrcode 와도 대조한다. 마스크 고르기(벌점)는 라이브러리끼리도 다르므로 '고른 마스크로 만든 칸'을 본다.
- 폴더에 `__pycache__`·`node_modules`·`.wrangler` 를 남기지 않는다.
