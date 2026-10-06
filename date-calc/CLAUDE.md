# 며칠 계산기 (date-calc)

날짜 계산 웹 도구 11종(두 날짜 사이, 디데이, 날짜 더하기·빼기, 영업일 세기, 영업일 뒤 날짜, 만 나이, 기념일, 요일, 주차, 시간 차이, 공휴일 목록). 한국·미국 공휴일. 정적 사이트(배포 빌드 없음, 가이드·영어판 HTML은 스크립트로 미리 만들어 커밋).
- 언어마다 주소 하나: 한국어 `/`(며칠 계산기), 영어 `/en/`(Daycount, 2026-10-05). hreflang으로 잇는다.

- 주소: https://date.lumenlab.page (Worker `date-calc`). 메인 lumenlab.page 는 루멘랩 소개 사이트(lumenlab 폴더). 예전 date-calc.mysitebox.workers.dev 는 `worker.js`가 새 주소의 같은 페이지로 301 넘긴다(2026-10-05, 네이버 중복 콘텐츠 방지). lumenlab.page 는 2026-10-03 Cloudflare에서 구입
- 출발점: 2026-10-03, 유튜브 "GPT-6 Astra에게 수익형 웹사이트를 통째로 맡겨봤습니다"의 날짜 계산기 예시를 참고해 기능만 가져옴. 이름·디자인·문구는 새로 만듦.

## 폴더
- `index.html` 한국어 화면 전체(계산기 섹션 11개, FAQ). 글자는 `data-i18n="한국어 원문"` — 영어판을 만들 때 이 키로 사전을 찾는다. 계산기 마크업은 여기 한 곳에만 있다.
- `en/index.html` 영어 계산기. **손으로 고치지 않는다**: `tools/build_en.py`가 index.html + 영어 사전으로 만든다(첫 HTML에 영어가 들어 있어 검색엔진이 JS 없이 읽음). 머리말(제목·설명·canonical·hreflang·og en_US·JSON-LD)·가이드 목록·FAQ(영어 검색용으로 새로 씀, FAQPage와 글자 같음)·꼬리말은 build_en.py 안에 있다. 광고 코드·광고 자리는 한국어와 같다(다르면 빌드가 멈춤). 서치 콘솔·네이버 확인 태그는 넣지 않는다. 영어에선 기념일 '시작한 날을 1일째로(한국식)'를 기본으로 끈다.
- `en/guide/*/index.html`(영어 글 6편), `en/guide/index.html`, `en/about/index.html`도 `tools/build_en.py`. 영어 글은 한국어 글 번역이 아니라 영어 검색 질문으로 고른 주제다(두 날짜 사이 +1, 영업일 기한, 연방 공휴일 대체일, 개월 더하기 말일 규칙, 정확한 나이, ISO 주차). 사실은 확인한 공식 출처만(OPM·5 U.S.C. 6103·CFPB Reg Z·Microsoft·Python·MDN·dateutil 문서), 글마다 Sources. 예시 숫자는 tests/run.js 'Guide (en):' 묶음이 검산한다.
- `assets/dates.js` 순수 계산 로직(`DC`). DOM 모름. 날짜는 '하루 번호'(1970-01-01=0, UTC)로 다뤄 서머타임에 안 흔들림.
- `assets/holidays.js` 공휴일 표 2015–2035 (자동 생성, 손으로 고치지 않음).
- `assets/i18n.js` 영어 사전(`L`, `F`). 키 = 한국어 원문. 어순이 다르면 `%2$s`. 브라우저에선 계산 결과 문구만 바꾸고(app.js가 `setLang`), 화면 글자는 build_en.py가 이 사전으로 en/index.html에 미리 넣는다 → 사전·index.html 글자를 고치면 빌드를 다시 돌린다.
- `assets/app.js` 화면 연결. 페이지 언어는 `<html lang>`으로 정한다(저장값·브라우저 언어로 바꾸지 않음). 머리의 언어 버튼은 다른 언어 페이지로 가는 보통 링크(#해시 유지). 브라우저 언어가 페이지 언어와 다르면 위에 닫을 수 있는 작은 띠('English version →' / '한국어로 보기 →')만 띄우고 자동으로 넘기지 않는다.
- `assets/ads-config.js` 애드센스 설정. **켜져 있다**: client(pub-9496167591465154)가 들어 있고 각 페이지 `<head>`의 adsbygoogle.js로 자동 광고가 돈다. 수동 광고 단위 번호(slots)만 비어 있다. 광고 자리 3곳(top, below-tool, bottom). localhost나 `?adpreview`면 점선 상자로 자리만 보여 줌(영어 페이지는 'Ad slot').
- `guide/*/index.html`(가이드 글 6편), `guide/index.html`, `about/index.html`, `sitemap.xml` 은 `tools/build_guides.py` 가 만든다. 글은 그 파일 안에서 고치고 다시 돌린다. 글 속 예시 숫자는 tests/run.js '가이드:' 묶음이 검산한다(글을 고치면 시험도 같이).
- `404.html`(한국어·영어 두 줄, `/`·`/en/` 링크, 광고 없음·noindex)과 `rss.xml`(한국어 가이드 글 본문 전체, 네이버 서치어드바이저 제출용. 영어 RSS는 없음)도 `tools/build_guides.py`가 만든다. sitemap은 영어 주소까지 넣는다. lastmod는 `LASTMOD`(한국어)·`build_en.UPDATED`(영어)에 실제로 고친 페이지·날짜만 적는다.
- **한 명령으로 전부 다시 만든다**: `python3 tools/build_guides.py` (한국어 가이드·목록·소개·404·sitemap·rss + `build_en.py`의 영어판 전부). 영어 페이지에 `lang="ko"` 밖 한글이 있으면 빌드가 멈춘다.
- `worker.js` 예전 workers.dev 주소 → 새 주소 같은 경로로 301(`/en/…`도 그대로 넘어감). `wrangler.jsonc`의 `run_worker_first: ["/*", "!/assets/*"]`라 **새 주소의 페이지 조회도 하나하나 Worker 요청 1건으로 센다**(계정 전체 무료 한도 하루 10만 건, 넘으면 요청이 실패). 즉 예전 주소 넘기기의 값 = 페이지 조회마다 Worker 요청 1건. `/assets/` 파일은 Worker를 안 거친다.
- 공유 사진 `og.png`(한국어)·`og-en.png`(영어) 1200×630: `python3 tools/og.py`가 `tools/og.html`을 찍는다. 사이트 CSS와 따로라 디자인을 바꿔도 다시 안 찍어도 된다. 머리말 태그는 index.html·build_guides.py·build_en.py에 있다(2026-10-06).
- `privacy.html` 개인정보 처리방침(한·영, 제3자 쿠키·웹 비콘 문장과 구글 파트너 사이트 링크 포함 = 애드센스 게시자 정책). 두 칸에 `id="ko"`·`id="en"`, 영어 페이지는 `/privacy#en`으로 링크한다. `tools/` `tests/` `worker.js` 는 `.assetsignore`로 배포에서 뺌.

## 명령어
- 테스트: `./tests/run.sh` (맥 기본 jsc로 로직 3,200여 개 + 현지화 검사 + 영어판 검사. node 필요 없음). 리눅스 작업 공간에선 이 폴더에서 `node -e 'global.print=console.log;const fs=require("fs");global.read=f=>fs.readFileSync(f,"utf8");global.load=f=>{(0,eval)(read(f))};(0,eval)(read("tests/run.js"))'` 뒤 `python3 tools/check_i18n.py && python3 tools/check_en.py`
  - `check_en.py`: en/ 파일이 빌드 결과와 같은지(낡으면 실패), 영어 페이지의 lang="ko" 밖 한글 0, canonical·hreflang 짝, 제목·설명 중복, FAQPage·Article·BreadcrumbList가 화면 글자와 같은지, 사이트 안 링크·#해시, 영어 페이지 → 한국어 페이지 링크엔 lang="ko", 광고 자리·404 광고 없음, sitemap.
- 가이드·영어판 다시 만들기: `python3 date-calc/tools/build_guides.py`
- 로컬 보기: `python3 -m http.server 8417 --directory date-calc` (단 `/privacy`·`/en`→`/en/`·404 페이지는 Cloudflare 규칙이라 안 됨). Cloudflare와 똑같이 보려면 scratchpad에 wrangler.jsonc를 따로 두고(main·assets.directory = 이 폴더의 절대 경로) 그 폴더에서 `wrangler dev`. 이 폴더 안에서 돌리면 `.wrangler/`가 자산 폴더에 생겨 계속 다시 시작한다(생기면 지운다). workers.dev 넘기기는 `curl -H "Host: date-calc.mysitebox.workers.dev"`로 확인.
- 공휴일 표 다시 만들기 / 기준값 다시 만들기 (venv에 `holidays` 설치):
  `python3 -m venv /tmp/hv && /tmp/hv/bin/pip install holidays && /tmp/hv/bin/python date-calc/tools/gen_holidays.py && /tmp/hv/bin/python date-calc/tests/gen_cases.py`
- 배포: 이 폴더에 빈 파일 `.deploy-actions`가 있으면 main에 푸시할 때 GitHub Actions(`deploy-new-sites.yml`)가 wrangler로 배포.

## 설계 결정
- 에이브랜치 영상(2026-10-03 정리) 기준으로 애드센스 승인·검색 노출용: 사이트 주제에 맞는 가이드 글을 글마다 따로 된 페이지로, 머리 메뉴·푸터에 가이드·소개·방침·문의, robots.txt에 AI 검색 크롤러 명시 허용. 검토 없는 자동 대량 발행은 하지 않는다(스팸 정책).
- 기준값(tests/cases.json)은 파이썬 datetime·dateutil·holidays로 따로 계산한 값. 같은 로직을 두 번 짠 게 아님.
- 1/31 + 1개월 = 2/28 (말일 맞춤). 2/29생 만 나이는 평년에 3/1이 생일(2026-10-06 운영자 결정, 카드에서 고름. 날짜 더하기의 2/29+1년=2/28 말일 맞춤과는 따로).
- 영업일 세기: 종료일은 늘 포함, 시작일은 옵션(기본 포함). 영업일 더하기: 기준일은 세지 않음.
- 한국식 100일: 시작일을 1일째로(한국어 페이지 기본 켬, 영어 페이지 기본 끔 = 시작일 + 100일).
- 공휴일 표 밖 연도는 주말만 빼고 **경고를 띄움**(조용히 틀리지 않게).
- **언어 규칙(2026-10-05, 운영자 결정: 전 세계 검색 노출)**: 언어마다 주소 하나(`/` 한국어, `/en/` 영어). 브라우저 언어로 화면을 바꾸거나 자동으로 넘기지 않는다 — 구글봇은 Accept-Language 없이 주로 미국에서 긁어서, 한 주소에서 언어를 바꾸면 한 언어만 색인된다. 제안 띠만 띄운다.
- hreflang은 내용이 같은 짝에만: `/` ↔ `/en/`, `/about/` ↔ `/en/about/` (ko, en, x-default → 영어). 한국어 글과 영어 글은 주제가 달라 잇지 않는다(가이드 목록도 안 잇는다).
- 설정만 localStorage: `dc.country`(고른 나라. 처음엔 한국어 페이지 KR, 영어 페이지 US), `dc.lang`(방문자가 고른 언어: 언어 링크를 누르거나 띠를 닫을 때 저장. 띠를 다시 띄울지에만 쓰고 화면 언어는 안 바꿈). 입력값은 저장 안 함 → 방침 문구와 일치. 광고(애드센스 쿠키)는 방침·FAQ에 적혀 있음.
- 메인 도메인(루멘랩 소개)에는 광고 코드를 넣지 않고 ads.txt만 둔다(소개·앱 방침 페이지에 광고가 뜨지 않게).

- 디자인(2026-10-05 개편, '달력 종이'): 색은 뜻이 있을 때만. 파랑 = 고른 것·평일·토요일·영업일, 빨강 = 일요일·공휴일·오늘 표시(한국 달력 약속), 회색 = 주말. 글꼴 Pretendard(jsDelivr, 늦게 와도 안 막히게 media=print 방식). 결과 아래 기간 막대(시작→끝, 오늘 위치), 영업일은 영업일·주말·공휴일 비율 막대 + 범례. 휴대폰은 고르기 버튼을 작게 줄 바꿈해 첫 화면에 입력칸까지 보인다(옆으로 넘기기는 블라인드 검토에서 '더 있는 줄 모름'으로 탈락).
- 디자인(2026-10-06 다시, '오늘의 일력'): 운영자가 '칙칙해서 다시 오기 싫다'고 해서 첫 화면을 일력처럼 바꿈. 토마토색 띠(`--band`, 일력 머리 = 브랜드, 화면 틀에만)가 머리·제목·고르기를 화면 끝까지 칠하고(border-image라 가로 스크롤 없음) 계산기 카드가 그 띠에 걸친다. 오른쪽에 '오늘 한 장'(app.js `renderToday`: 날짜·요일·올해 며칠째·다음 공휴일 링크). 결과는 뜯는 점선 아래(양끝 반달 홈). 띠는 `body:has(#today)`일 때만이라 가이드 글 페이지는 따뜻한 종이색 + 위 6px 띠만. 휴대폰은 오늘 한 장을 제목 옆에 작게(설명·진행 막대 뺌) 해서 375×667에서도 첫 입력칸이 보인다. 시안 비교에서 탈락: 스티커 다이어리(계산기마다 색), 노란 포스터(제목이 커서 입력칸이 내려감).
- 디자인(2026-10-06 세 번째, '쓰임별 네 묶음'): 진한 띠 버림. 밝은 회색 바탕 + 흰 카드, 계산기 11개를 네 묶음(`data-g`: span 파랑·move 초록·life 귤색·cal 장미색)으로. 컴퓨터 = 왼쪽 목록(이름 + 한 줄 설명) | 계산기, 휴대폰 = 묶음 칸 4개 + 밑줄 탭(열린 묶음 `.pg.open`만). 묶음 색은 고르기·카드 윗줄·아이콘에만. 루멘랩 링크 칸은 '일력 세 장 부채'(화면에 들어오면 한 번 펼침, 수익형 사이트 고정 규칙: 루멘랩 링크 칸엔 연출). 테스트 스크립트로 계산기를 고를 땐 휴대폰에선 묶음 칸부터 눌러야 보인다.
- 연출(2026-10-06, 요청문 전문은 프로젝트 문서 date-calc-사이트-구조.md '연출 요청문'): 기본 반응은 style.css 끝 '연출' 칸(값 하나 `--dur`·`--ease`, transform·opacity만, 처음 열 때·날짜 치는 중엔 안 움직임). 핵심 순간 둘은 app.js: '그날이에요' 색종이(디데이 당일·생일·기념일 당일, 카드 안 canvas, 60조각 1.6초)와 '공휴일' 도장(무슨 요일·날짜 더하기 결과가 공휴일). 방문자가 값을 바꿔 그 순간이 됐을 때만(`byUser`), 같은 순간은 한 번. input과 change가 같은 값으로 두 번 오면 한 번만 그린다(안 그러면 도장 움직임이 지워짐). 광고 칸에는 연출 금지.
- 광고 자리: 고르기 버튼·입력칸 바로 옆에 두지 않는다(잘못 누르기 쉬움). top은 가이드 목록과 FAQ 사이, below-tool은 결과 카드에서 40px 띄움, 자리 위에 작은 '광고' 표시.

## 주의할 점
- wrangler.jsonc에 `routes`(사용자 지정 도메인)를 넣으면 wrangler가 workers.dev 주소를 꺼 버린다(2026-10-03 lumenlab 지원·방침 주소가 5분쯤 404). 예전 주소를 살리려면 `"workers_dev": true`를 같이 둔다.
- 사용자 지정 도메인을 다른 Worker로 옮길 땐 원래 Worker에서 먼저 빼고 배포한 뒤 새 Worker에 넣는다. 옮긴 직후 맥 DNS 캐시 때문에 잠깐 접속이 안 될 수 있다(`curl --resolve`로 확인).
- 서치 콘솔 확인 태그는 주소마다 다르다(lumenlab.page·date.lumenlab.page는 같은 값, workers.dev는 다른 값).
- `holidays` 라이브러리 객체는 기본 `expand=True`라 표 밖 연도를 몰래 채운다. 기준값 만들 때 `expand=False` 필수(안 하면 2014년 사례에서 앱과 어긋남).
- 한국어 조사(이에요/예요)를 변수 뒤에 붙이지 않는다. "공휴일이에요: %s"처럼 쓴다.
- 광고를 켜면 같은 변경에서 `ads.txt` 추가 + `privacy.html` 광고 문단 수정.
- Cloudflare가 `privacy.html`을 `/privacy`로 307 넘긴다. 링크·sitemap은 확장자 없이 쓴다.
- 애드센스는 workers.dev 같은 공용 서브도메인으로는 승인받기 어렵다. 승인된 자기 도메인이 필요.
- 광고 코드가 있는 실제 주소를 Playwright로 열 땐 `googlesyndication.com`·`doubleclick.net` 요청을 막는다(가짜 노출 = 무효 트래픽). **글롭 `**/*googlesyndication*`은 안 막힌다**(2026-10-06 발견) → `re.compile(r"googlesyndication|doubleclick|adservice|fundingchoices")`.

## 미완성
- RSS(`https://date.lumenlab.page/rss.xml`) 네이버 서치어드바이저 제출은 사용자가 할 일(2026-10-05 만듦).
- 애드센스: pub-9496167591465154, ads.txt는 메인(lumenlab 폴더)과 이 폴더 둘 다. 사이트 심사(lumenlab.page)는 2026-10-03 신청 대기. 수동 광고 단위 번호 아직 없음(자동 광고만).
- 임시공휴일은 라이브러리 업데이트 후 표를 다시 만들어야 반영(예: 2026 제헌절 공휴일 재지정 여부 확인 필요). 미국 행정명령 휴무(예: 2025-12-24·26, EO 14371)는 법정 공휴일이 아니라 표에 없다.
- 영어판(2026-10-05): 서치 콘솔에 sitemap 다시 제출·/en/ 색인 요청은 사용자가 할 일.
