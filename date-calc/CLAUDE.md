# 며칠 계산기 (date-calc)

날짜 계산 웹 도구 11종(두 날짜 사이, 디데이, 날짜 더하기·빼기, 영업일 세기, 영업일 뒤 날짜, 만 나이, 기념일, 요일, 주차, 시간 차이, 공휴일 목록). 한국어·영어, 한국·미국 공휴일. 빌드 없는 정적 사이트.

- 주소: https://date.lumenlab.page (Worker `date-calc`). 메인 lumenlab.page 는 루멘랩 소개 사이트(lumenlab 폴더). 예전 date-calc.mysitebox.workers.dev 도 열림(canonical은 date.lumenlab.page). lumenlab.page 는 2026-10-03 Cloudflare에서 구입
- 출발점: 2026-10-03, 유튜브 "GPT-6 Astra에게 수익형 웹사이트를 통째로 맡겨봤습니다"의 날짜 계산기 예시를 참고해 기능만 가져옴. 이름·디자인·문구는 새로 만듦.

## 폴더
- `index.html` 화면 전체(계산기 섹션 11개, FAQ). 글자는 `data-i18n="한국어 원문"`.
- `assets/dates.js` 순수 계산 로직(`DC`). DOM 모름. 날짜는 '하루 번호'(1970-01-01=0, UTC)로 다뤄 서머타임에 안 흔들림.
- `assets/holidays.js` 공휴일 표 2015–2035 (자동 생성, 손으로 고치지 않음).
- `assets/i18n.js` 영어 사전(`L`, `F`). 키 = 한국어 원문. 어순이 다르면 `%2$s`.
- `assets/app.js` 화면 연결. `assets/ads-config.js` 애드센스(기본 꺼짐). 광고 자리 3곳(top, below-tool, bottom). localhost나 `?adpreview`면 점선 상자로 자리만 보여 줌.
- `privacy.html` 개인정보 처리방침(한·영). `tools/` `tests/` 는 `.assetsignore`로 배포에서 뺌.

## 명령어
- 테스트: `./tests/run.sh` (맥 기본 jsc로 로직 3,200여 개 + 현지화 검사. node 필요 없음)
- 로컬 보기: `python3 -m http.server 8417 --directory date-calc`
- 공휴일 표 다시 만들기 / 기준값 다시 만들기 (venv에 `holidays` 설치):
  `python3 -m venv /tmp/hv && /tmp/hv/bin/pip install holidays && /tmp/hv/bin/python date-calc/tools/gen_holidays.py && /tmp/hv/bin/python date-calc/tests/gen_cases.py`
- 배포: 이 폴더에 빈 파일 `.deploy-actions`가 있으면 main에 푸시할 때 GitHub Actions(`deploy-new-sites.yml`)가 wrangler로 배포.

## 설계 결정
- 기준값(tests/cases.json)은 파이썬 datetime·dateutil·holidays로 따로 계산한 값. 같은 로직을 두 번 짠 게 아님.
- 1/31 + 1개월 = 2/28 (말일 맞춤). 2/29생은 평년에 2/28이 생일.
- 영업일 세기: 종료일은 늘 포함, 시작일은 옵션(기본 포함). 영업일 더하기: 기준일은 세지 않음.
- 한국식 100일: 시작일을 1일째로(기본 켬).
- 공휴일 표 밖 연도는 주말만 빼고 **경고를 띄움**(조용히 틀리지 않게).
- 설정(언어·나라)만 localStorage `dc.lang`, `dc.country`. 입력값은 저장 안 함 → 방침 문구와 일치. 광고(애드센스 쿠키)는 방침·FAQ에 적혀 있음.
- 메인 도메인(루멘랩 소개)에는 광고 코드를 넣지 않고 ads.txt만 둔다(소개·앱 방침 페이지에 광고가 뜨지 않게).

## 주의할 점
- wrangler.jsonc에 `routes`(사용자 지정 도메인)를 넣으면 wrangler가 workers.dev 주소를 꺼 버린다(2026-10-03 lumenlab 지원·방침 주소가 5분쯤 404). 예전 주소를 살리려면 `"workers_dev": true`를 같이 둔다.
- 사용자 지정 도메인을 다른 Worker로 옮길 땐 원래 Worker에서 먼저 빼고 배포한 뒤 새 Worker에 넣는다. 옮긴 직후 맥 DNS 캐시 때문에 잠깐 접속이 안 될 수 있다(`curl --resolve`로 확인).
- 서치 콘솔 확인 태그는 주소마다 다르다(lumenlab.page·date.lumenlab.page는 같은 값, workers.dev는 다른 값).
- `holidays` 라이브러리 객체는 기본 `expand=True`라 표 밖 연도를 몰래 채운다. 기준값 만들 때 `expand=False` 필수(안 하면 2014년 사례에서 앱과 어긋남).
- 한국어 조사(이에요/예요)를 변수 뒤에 붙이지 않는다. "공휴일이에요: %s"처럼 쓴다.
- 광고를 켜면 같은 변경에서 `ads.txt` 추가 + `privacy.html` 광고 문단 수정.
- Cloudflare가 `privacy.html`을 `/privacy`로 307 넘긴다. 링크·sitemap은 확장자 없이 쓴다.
- 애드센스는 workers.dev 같은 공용 서브도메인으로는 승인받기 어렵다. 승인된 자기 도메인이 필요.

## 미완성
- 애드센스: pub-9496167591465154, ads.txt는 메인(lumenlab 폴더)과 이 폴더 둘 다. 사이트 심사(lumenlab.page)는 2026-10-03 신청 대기. 수동 광고 단위 번호 아직 없음(자동 광고만). og 이미지 없음.
- 임시공휴일은 라이브러리 업데이트 후 표를 다시 만들어야 반영(예: 2026 제헌절 공휴일 재지정 여부 확인 필요).
