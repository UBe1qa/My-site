# 한장달력 / Onesheet (calendar)

공휴일을 넣은 1년 한 장·월별 달력을 인쇄하거나 PDF·이미지로 받는 사이트. 한국어판은 음력·24절기·손 없는 날까지.
- 주소: https://calendar.lumenlab.page (Worker `calendar`, workers.dev 끔). 영어 `/`(미국 연방 공휴일, Letter 기본, x-default), 한국어 `/ko/`(한국 공휴일, A4 기본).
- 정적 사이트(배포 빌드 없음, 서버 코드 없음, 외부 라이브러리 없음). 달력은 브라우저 안에서 만들고 설정·파일은 어디에도 보내지 않는다.
- 페이지 60개 + 404: 도구(첫 화면), 연간 2026~2028, 월 2026-10~2027-12, 공휴일 2026·2027, 음력 변환·손 없는 날(한국어), 가이드 4편씩, 소개·방침·오픈소스 고지.

## 폴더
- `assets/core.js` 계산(`CAL`): 요일·주차(ISO 8601, 미국식)·달 격자, 음력 ↔ 양력, 손 없는 날, 24절기, 한국·미국 공휴일, 연휴, 연차를 끼우면 이어지는 날, 월·연 사실. DOM을 모르고 `Date`를 쓰지 않는다. 범위 밖은 `null`.
- `assets/data.js` 표(자동 생성, **손으로 고치지 않는다**): 음력 1912~2049, 24절기·그 밖의 날 2025~2028, 한국 2025년 표, 확정된 선거일, 미국 연방 공휴일 2025~2030.
- `assets/sheet.js` 종이 달력 배치(`SHEET`): `build(옵션)` → 글자·선의 위치 목록(mm) 하나. 그리는 곳만 둘: `svg()`(화면 미리보기·인쇄·미리 만든 PDF), `draw()`(캔버스 = 이미지로 저장·내 설정 PDF). `webMonth()`는 월 페이지의 큰 달 표(HTML 글자). `staticFile()`은 설정이 기본값일 때 미리 만든 파일 주소를, 아니면 `null`(기기에서 만든다).
- `assets/app.js` 화면 연결: 도구(`[data-tool]`), 월 페이지(`[data-month-page]`), 음력 변환(`[data-lunar]`), 다가오는 쉬는 날(`[data-up]`), 언어 안내 띠, 인쇄, 받기, 연출 3개. 저장하는 것은 localStorage `cal.lang` 하나(달력 설정은 저장하지 않는다 = 방침 문구와 같음).
- `assets/style.css` 색·글꼴은 `:root` 토큰. 진초록(`--brand`)은 받기·인쇄·고른 것에만, 빨강·파랑은 종이와 달력 표 안에서만.
- `assets/ads-config.js` 애드센스: client 있음(자동 광고 켜짐), 수동 자리 번호(`mid`·`bottom`)는 비어 있어 자리가 숨는다. localhost나 `?adpreview`면 빗금 상자, `?noadpreview`면 localhost에서도 끈다(화면 밀림 잴 때).
- `files/` 미리 만든 받기 파일: PDF 27개(연도 3 × [한국어 A4: 가로·세로·월별] + [영어 Letter·A4: 가로·세로·월별]) + 한국어 엑셀 3개. `_dev/make_files.py`가 만든다.
- `_dev/build.py` **모든 HTML·sitemap.xml·rss.xml(한국어 글)·404.html·robots.txt·ads.txt·wrangler.jsonc·.assetsignore를 만든다.** `node _dev/export.js`로 계산값·SVG를 받아 HTML만 짠다(계산·그리기 코드는 JS 한 곳). 문구·글 = `_dev/content.py`. 만든 HTML은 손으로 고치지 않는다.
- `_dev/ref/kasi.json` 공식 참조 자료(한국천문연구원 달력자료, 우주항공청 월력요항, 규정 요지). **이 파일이 기준.**
- `_dev/gen_data.py` → data.js / `gen_cases.py` → tests/cases.json / `verify_astro.py` → tests/astro.json / `make_files.py` → files/·아이콘·og / `sheets.js`·`export.js` = 파이썬이 부르는 노드 쪽.
- `tests/run.js` 로직·배치·글 속 숫자 테스트. `_dev/check.py` HTML 검사. `_dev/e2e.py` 화면을 실제로 눌러 보는 확인.

## 명령어
- 페이지 다시 만들기: `python3 calendar/_dev/build.py` (→ "built 61 pages")
- 테스트: 이 폴더에서 `node tests/run.js` (11만여 개)
- 배포 전 확인: `sh _dev/check.sh` (테스트 + 빌드가 최신인지 + HTML 검사). 화면까지: `node _dev/serve.mjs &` 뒤 `sh _dev/check.sh e2e` (약 5분, pdfinfo·Pillow·playwright 필요)
- 로컬 보기: `node calendar/_dev/serve.mjs` → http://localhost:8441 (폴더 → index.html, 없는 주소 → 404.html, `_dev`·`tests` 막음)
- 표·기준값 다시 만들기(venv는 폴더 밖): `python3 -m venv /tmp/cv && /tmp/cv/bin/pip install holidays korean_lunar_calendar ephem openpyxl`
  `/tmp/cv/bin/python _dev/gen_data.py && /tmp/cv/bin/python _dev/gen_cases.py && /tmp/cv/bin/python _dev/verify_astro.py && node tests/run.js`
- 받기 파일 다시 만들기: `python3 _dev/make_files.py pdf`(playwright), `/tmp/cv/bin/python _dev/make_files.py xlsx`(openpyxl), `python3 _dev/make_files.py icons`(favicon·apple-touch-icon·og). Pretendard 가변 글꼴 woff2 경로를 `CAL_FONT`로 준다.
- 배포: `.deploy-actions`가 있어 main에 푸시하면 GitHub Actions가 wrangler로 배포.

## 설계 결정
- **한국 공휴일은 규칙 엔진**(`krRule`): 「관공서의 공휴일에 관한 규정」 제2조·제3조(2026-04-30 개정)를 옮겼다. 2026년부터 쓴다(노동절 5/1, 제헌절 7/17 포함). 2025년은 표.
  - 대체공휴일: ① 국경일·부처님오신날·노동절·어린이날·기독탄신일이 토·일요일과 겹칠 때 ② 설·추석 연휴가 일요일과 겹칠 때 ③ 평일에 다른 공휴일과 겹칠 때(겹친 날 하나에 하루) → 그다음 첫 비공휴일. 다른 대체공휴일·토요일이면 그다음 날로. 1월 1일·현충일은 대체 없음.
  - 선거일·임시공휴일은 규칙으로 못 구한다 → `gen_data.py`의 `KR_EXTRA`에 **확정된 것만**(2026-06-03, 2028-04-12).
  - `basis`: `official`(2026·2027) / `provisional`(2028, 화면에 '공식 발표 전 자료') / `rule`(2029~, '규정으로 계산한 예상') / `table`(2025).
- **도구 연도는 2025~2030**, 연간·월 페이지와 미리 만든 파일은 2026~2028.
- **음력 변환은 1912-02-18 ~ 2050-01-22**: 이 범위 1,707달이 천문 계산(UTC+9)과 전부 맞는다. 공식 자료와 직접 대조한 범위는 2025~2028(화면에 그렇게 밝힌다). 범위 밖은 알린다.
- **24절기는 공식 자료가 있는 2025~2028만**. 그 밖의 해는 표시하지 않는다(지어내지 않는다).
- 손 없는 날은 음력 끝자리 9·0. 공식 기준이 없는 풍습이라고 화면에 밝힌다.
- 달력 칸에는 흔히 쓰는 이름(신정·성탄절), 표와 글에는 공식 이름을 같이('기독탄신일(성탄절)'). 한국 공휴일의 영어 이름은 널리 쓰는 번역이고 '공식 표기'라고 쓰지 않는다.
- **종이는 SVG 글자로 그린다.** HTML 글자 크기를 화면 폭에 비례시키면 작은 미리보기에서 브라우저 최소 글자 크기(한국어 크롬 10px)에 걸려 배치가 깨진다. SVG는 viewBox(0.1mm 단위)로 통째로 줄어든다.
- 첫 화면 구성(블라인드 검토 뒤 결정): 제목 곁 연도 → 큰 미리보기 + `PDF 받기` 하나만 강조 → 모양 고르기(실제 내용이 보이는 썸네일) → `내 설정으로 바꾸기`는 접혀 있다. 휴대폰에서는 설정이 아래에서 올라오는 판이고, 같은 받기 단추가 판 아래에 붙고, 종이는 위에 그대로 보인다(단추를 두 번 두지 않는다).
- 받기: 설정이 기본값이면 미리 만든 벡터 PDF(`/files/`)를 그대로 받고, 바꿨으면 캔버스(200dpi, 월별 12장은 150dpi) JPEG를 담은 작은 PDF를 직접 쓴다(`pdfOf`, 라이브러리 없음). 아이폰은 `navigator.share`.
- 인쇄: `beforeprint`에서 `#print-root`에 SVG를 넣고 `@page` 크기를 설정대로 바꾼다. 인쇄 화면에는 종이만 남는다(머리·꼬리·광고 없음). Ctrl+P로도 같다.
- 받는 파일·인쇄물에는 광고가 없다. 구석에 사이트 주소 한 줄만 아주 작게.
- 언어마다 주소 하나, 브라우저 언어로 넘기지 않는다(닫을 수 있는 띠만, `position:absolute`). hreflang은 같은 역할 짝에만: 도구·연간·월·소개·방침·고지, 글은 인쇄법 한 쌍. 공휴일 페이지는 나라가 달라 잇지 않는다.
- 연출: 기본 반응은 `--dur .16s`·`--ease` 하나. 화려한 연출 3개(받기 = 한 장 뽑기, 이번 달 = 오늘 동그라미, 루멘랩 칸 = 접힌 귀퉁이). 요청문은 구조 문서 '연출 요청문'.

## 주의할 점
- python `holidays`는 기본 `expand=True`라 표 밖 연도를 몰래 채운다 → `expand=False`. 뒤 해의 선거일을 추정해 넣으니 우리 표에는 넣지 않는다.
- 미국 표에는 '실제 날짜'와 '관측일(observed)'이 둘 다 있다. 2027-12-31은 2028년 새해 첫날의 관측일이라 2027년 목록에 나온다. 미국 '공휴일 수'는 늘 11, 표의 줄 수가 아니다.
- **글꼴이 늦게 오면 글자 폭이 달라진다.** 제목 옆에 붙은 것(연도 링크 등)이나 한 줄에 딱 맞는 문장은 줄이 바뀌며 화면이 밀린다 → 제목 곁의 것은 따로 줄을 주거나 폭이 달라도 줄 수가 같게 짧게 쓴다. `e2e.py`의 CLS 확인은 글꼴이 늦게 오는 것까지 기다려 잰다.
- 글 속 단추(`a.btn`)는 `.note a`·`.prose a`의 링크 색을 물려받으면 글자가 안 보인다 → `a.btn` 색을 따로 준다(style.css에 있음).
- 수동 광고 단위 번호를 넣게 되면 그 자리가 늦게 나타나 화면이 밀린다 → 번호를 넣는 변경에서 `.ad-wrap`을 처음부터 보이게(높이 예약) 바꾼다.
- `img,svg{max-width:100%}` 때문에 부모보다 큰 장식 SVG(오늘 동그라미)는 `max-width:none`이 필요하다.
- 광고 코드가 있는 실제 주소를 자동으로 열 땐 `googlesyndication|doubleclick` 요청을 정규식으로 막는다.
- 폴더 안에 `node_modules`·`__pycache__`·`.wrangler`를 남기지 않는다(파이썬 스크립트는 `sys.dont_write_bytecode`).

## 해마다 할 일
- 6월 말 우주항공청 월력요항 발표 뒤: `_dev/ref/kasi.json`에 다음 해 공휴일·절기·음력을 더하고 → `gen_data.py`·`gen_cases.py`·테스트 → core.js의 `KR_OFFICIAL`/`KR_PROVISIONAL` 옮기기 → build.py의 `YEARS`·`HOL_YEARS`, export.js의 월 범위, make_files.py의 `YEARS` → 파일·페이지 다시.
- 임시공휴일·선거일이 정해지면 `KR_EXTRA`에 더하고 그 달·그 해 페이지의 `UPDATED`(lastmod)를 적는다.
