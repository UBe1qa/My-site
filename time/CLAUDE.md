# 한바퀴 / Oneturn (time)

시계판 하나로 쓰는 시간 도구 사이트: 타이머 · 스톱워치 · 알람 · 세계 시간(시차·서머타임·회의 시간). 정적 사이트, 서버 코드 없음, 배포 때 빌드 없음.
- 주소: https://time.lumenlab.page (Worker `time`, workers.dev 끔). 영어 `/`(x-default), 한국어 `/ko/`.
- 도구: 타이머 `/`·`/ko/`, 스톱워치 `stopwatch/`, 알람 `alarm/`, 세계 시간 `world-clock/`. 가이드 글 한국어 3·영어 3(짝 둘: 백그라운드 탭, 랩/스플릿).
- 설계·결정·남은 일: My-site-private `context/knowledge/4-내-사이트/time-사이트-구조.md`.

## 폴더
- `_dev/build.py` **모든 HTML·sitemap.xml·404.html을 만든다**: `python3 time/_dev/build.py` (`--check`는 낡았는지만). 만든 파일은 손으로 고치지 않는다.
  - 화면 글 = `_dev/content.py`(UI·PAGES·FACTS·FAQ·소개·방침), 글 = `_dev/articles.py`(시차 표는 파이썬 zoneinfo로 계산해 넣는다), 공식 사실 = `_dev/facts.json`(값·출처·확인한 날·확인 못 한 것).
  - 만든 가이드 HTML(`guide/`·`ko/guide/`)은 2026-10-29부터 `lumenlab/_dev/build_home.py`가 읽어 lumenlab.page/guides/에 싣는 원본이다. 이 사이트는 가이드 주소를 그리로 301(`_redirects`)하고 sitemap·배포에서 뺀다. 글을 고치면 이 도구를 빌드한 뒤 `python3 -B lumenlab/_dev/build_home.py`.
  - 시계판 SVG는 build.py `dial_svg()`가 첫 HTML에 미리 그리고(화면 밀림 0), app.js `drawFace()`가 같은 기하로 다시 그린다. 둘을 같이 고친다(반지름: 테두리 198·판 186·눈금 178/171/164·숫자 145·띠 126~100·가운데 96).
- `assets/core.js` 시간 로직(DOM 모름): 숫자 칸 읽기, 시계판 한 바퀴 단위(`scaleFor`·`faceLabels`), 판 돌리기(`dragMinutes`), 타이머·스톱워치 상태, 알람 다음 시각, 시간대(`offset`·`parts`·`fromLocal`·`nextChange`·`meeting`), **`OT.PATCH`(2026년 캐나다 세 주·모로코 규칙. 브라우저 tz 자료가 낡아도 맞게)**.
- `assets/tz.js` 도시 목록(id·IANA 시간대·영어·한국어·나라·찾기 별칭). `assets/app.js` 화면 연결. `assets/style.css` 모양(토큰 `:root`, 어둡게 `[data-theme=dark]`).
- `tests/run.mjs` 로직 시험(2,099개), `tests/gen_tz.py` 시간대 기준값(파이썬 zoneinfo) → `tests/cases-tz.json`.
- `_dev/check.py` 정적 검사, `_dev/e2e.py` 화면 확인(Playwright, 가짜 시계), `_dev/serve.mjs` 로컬 서버(8471), `_dev/og.py` 공유 그림.

## 명령어
- 전부: `time/_dev/check.sh` (시험 → 빌드 최신 → 정적 검사). `check.sh e2e [스크린샷 폴더]` 화면 확인까지(5~8분). `check.sh live` 배포 뒤 실제 주소 대조. `check.sh og` 공유 그림.
- 묶음만: `SEC=2,5 python3 time/_dev/e2e.py` (1 모든 페이지 · 2 타이머 · 3 스톱워치 · 4 알람 · 5 세계 시간 · 6 화면 밀림).
- 시간대 기준값 새로: 저장소 밖 폴더에 `pip install --target <폴더> -U tzdata` → `PYTHONPATH=<폴더> PYTHONTZPATH= python3 time/tests/gen_tz.py`. 노드의 tz 자료가 예전 것이어도 `OT.PATCH` 덕분에 새 자료와 같아야 한다.

## 동작 기준(화면 글과 같아야 한다)
- 시간은 언제나 시작·끝 시각으로 계산한다. 끝나는 순간에 `setTimeout` 하나(이어 건 타이머가 아님 → 크롬의 '1분에 한 번' 늦추기 대상이 아니다). 화면은 보일 때만 requestAnimationFrame.
- 타이머: 최대 99:59:59, 8개까지. 멈춘 상태에서 판을 돌려 1분 단위(60분 판). 돌 때 판 한 바퀴는 맞춘 시간에 맞춰 1·5·10·15·20·30·60분 … 24시간. 도는 중에 '바로 시작'을 누르면 새 타이머로 더한다. 닫혀 있는 동안 끝난 것은 소리 없이 '몇 분 전에 끝났어요'.
- 알람: 12개까지, 한 번 울리면 꺼짐, 5분 뒤 다시. 닫혀 있던 동안 지나간 것은 '지나갔어요'. 서머타임으로 없는 시각은 밀린 시각에 울리고 그렇게 적는다.
- 세계 시간: 기준 = 기기 시간대(바꿀 수 있음). 근무 시간 = 현지 월~금 9~18시, 그 시각에 시작한 한 시간이 들어가야 칠한다. 공휴일 없음. 도시 12개까지.
- 소리는 파일 없이 Web Audio로 만든다(종·삐삐·부드럽게). 알림은 컴퓨터 브라우저에서만(안드로이드·iOS는 서비스 워커가 필요해 숨김).
- 저장: localStorage 키 여섯 개 `ot.set`·`ot.timers`·`ot.watch`·`ot.alarms`·`ot.cities`·`ot.lang`(방침과 같다, check.py 대조). sessionStorage 안 씀.
- 광고: 자동 광고 코드는 도구·글 페이지에만(소개·방침·가이드 목록·404 없음). 수동 자리 `mid`·`bottom`은 단위 번호가 비어 있어 지금은 없다.

## 유지 일정
- IANA tz 새 판이 나오면(1년에 몇 번, https://data.iana.org/time-zones/tzdb/NEWS): 바뀐 나라가 도시 목록에 있으면 `OT.PATCH`·`facts.json` `tz_2026`·글을 고치고 `gen_tz.py`를 다시.
- 해마다 10월: 글의 서머타임 표 기간(2026~2027)을 다음 해로(articles.py `changes()` 범위와 제목).
