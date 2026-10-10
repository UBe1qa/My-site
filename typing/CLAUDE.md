# 토독 / Todok (typing)

타자 속도 측정·타자 연습 사이트(한글 두벌식 + 영어). 들어오자마자 치고, 끝나면 어느 키에서 틀리고 느렸는지 자판 그림으로 보여 준다. 친 글은 브라우저 밖으로 나가지 않는다(서버 코드 없음, 정적 사이트, 배포 때 빌드 없음, 외부 라이브러리 없음).
- 주소: https://typing.lumenlab.page (Worker `typing`, workers.dev 끔). 영어 `/`(x-default), 한국어 `/ko/`.
- 도구: 영어 = Typing Test(`/`), Typing Practice(`/practice/`). 한국어 = 타자 속도 측정(`/ko/`), 타자 자리 연습(`/ko/practice/`), 타자 문장 연습(`/ko/sentences/`), 영타 연습(`/ko/english/`).
- 가이드 글: 한국어 4편, 영어 3편(번역이 아니라 따로 고른 주제. '속도를 어떻게 계산하나' 한 쌍만 hreflang 으로 잇는다). 페이지는 19쪽 + 404.

## 폴더
- `_dev/build.py` **모든 HTML·sitemap.xml·rss.xml·404.html 을 만든다**: `python3 typing/_dev/build.py` (`--check` 는 낡았는지만 본다). 만든 파일은 손으로 고치지 않는다.
  - 화면 글 = `_dev/content.py`(`JS` = app.js 문구, `TX` = HTML 틀 문구, `TOOLS` = 도구 페이지, `BASIS` = 계산 기준, `FAQ`, `ABOUT`, `PRIVACY`), 가이드 글 = `_dev/articles.py`.
  - 배치는 도구마다 다르다: `layout_a`(종이 한 장: 속도 측정·영타), `layout_c`(화면 자판: 자리 연습), `layout_b`(보고 치는 글 + 내가 친 글: 문장 연습).
- `assets/tj-core.js` 핵심 로직(DOM 을 모른다): 한글 → 두벌식 글쇠(`TJ.hangul`), 목표 글과 친 글 비교(`TJ.compare`, 낱말 단위 편집 거리), 한/영 반대 알아채기(`TJ.layoutHint`), 식(`TJ.calc`), 화면 표시 값(`TJ.report`), 한 판(`TJ.Session`), 시간(`TJ.Timer`), 글 고르기(`TJ.pick`), 자판 자리·손가락(`TJ.board`, `TJ.keyPlace`).
- `assets/tj-store.js` 기록 저장(DOM 을 모른다, 저장소를 넘겨받는다). `assets/tj-lessons.js` 자리 연습 다섯 단계(배운 키만으로 칠 수 있는 글만 낸다).
- `assets/tj-text-ko.js`·`tj-text-en.js` 연습 글. **직접 쓴 문장, 전해 오는 속담, 직접 고른 단어만**(책·기사·가사·시·대사·명언 금지). 한국어 문장 203(일상 55·계절 45·음식 50·일 53), 속담 119, 단어 254 / 영어 단어 347, 문장 50, 팬그램 4.
- `assets/app.js` 도구 화면 연결(엔진 `Engine` + 화면 `ViewA`·`ViewB`·`ViewC`, 결과 칸, 내 기록, 결과 그림, 연출 둘). 문구는 페이지의 `#tj-cfg` JSON 에서 읽는다. `assets/site.js` 모든 페이지 공통(광고 자리 채우기, 다른 언어판 안내 띠, 루멘랩 키 줄 연출).
- `assets/style.css` 모양(토큰은 `:root`), `assets/pretendard.css` 글꼴 CSS(자동 생성: `_dev/font_css.py`), `assets/ads-config.js` 광고 설정.
- `tests/run.mjs` 로직 시험(추가 설치 없이 돈다), `tests/ref/ref.json` 기준값, `tests/gen_ref.py`·`gen_ref.mjs` 기준값 만들기, `tests/mutate.mjs` 일부러 틀리게 바꿔 시험이 잡는지 보기.
- `_dev/check.py` 정적 검사, `_dev/e2e.py` 화면 확인(Playwright), `_dev/serve.mjs` 로컬 서버, `_dev/og.py`+`og.html` 공유 그림, `_dev/icons.py` 아이콘.

## 명령어
- 전부 확인: `typing/_dev/check.sh` (로직 테스트 → 빌드 최신 → 정적 검사 → JS 문법). `typing/_dev/check.sh e2e [스크린샷 폴더]` 는 화면 확인까지(기계가 한가할 때 10분쯤).
- 로직 테스트만: `node typing/tests/run.mjs` (묶음 이름을 붙이면 그것만: `node typing/tests/run.mjs report guide`). 묶음: jamo ime compose wrong touch calc keys timer pick layout board texts hintzone report store lessons guide.
- 시험이 정말 잡는지: `node typing/tests/mutate.mjs` (34가지 변이).
- 화면 확인을 묶음만: 서버를 띄우고 `SEC=3 python3 typing/_dev/e2e.py` (1 모든 페이지 · 2 화면 밀림 · 3 한국어 속도 측정 · 4 영어·영타 · 5 자리 연습·문장 연습 · 6 휴대폰 · 7 광고 자리·연출·언어 띠 · 8 스크린샷).
- 로컬 보기: `node typing/_dev/serve.mjs` → http://localhost:8445 (폴더 → index.html, 없는 주소 → 404.html, `_dev`·`tests` 막음).
- 기준값 다시 만들기(시험용 설치는 저장소 밖 폴더에): `pip install inko-py`, `npm install hangul-js es-hangul` 뒤 `python typing/tests/gen_ref.py` → `node typing/tests/gen_ref.mjs <그 node_modules>`. **연습 글(tj-text-ko.js)을 고치면 gen_ref.mjs 를 다시 돌려야 한다**(연습 글 전체의 대조 해시가 ref.json 에 있다).
- 공유 그림: `python3 typing/_dev/og.py`(og.png, og-ko.png). 아이콘: `python3 typing/_dev/icons.py`. 글꼴 CSS: `python3 typing/_dev/font_css.py`.
- 배포: `.deploy-actions` 가 있어 main 에 푸시하면 GitHub Actions 가 wrangler 로 배포.

## 계산 기준(화면 '계산 기준'·글과 글자 그대로 같아야 한다)
- **한글은 글쇠 흐름으로 비교한다.** 띄어쓰기를 치면 다음 낱말로 넘어가고, 낱말 안에서는 글자가 아니라 두벌식 글쇠 순서끼리 '가장 적게 고쳐서 맞추는 짝'(편집 거리)으로 견준다. 그래서 조합 중인 글자('한'을 치는 중의 '하')와 받침이 다음 글자로 넘어가는 순간('간' → '가나')이 틀림으로 나오지 않고, 글쇠 하나를 빠뜨려도 뒤 글자가 줄줄이 틀리지 않는다.
- **타수(타/분)** = 맞게 친 글쇠 수(Shift 를 같이 누르는 글쇠는 2타, 겹받침·겹모음은 글쇠 둘, 띄어쓰기·줄바꿈 1타) ÷ 초 × 60. 끝났을 때의 글 기준이라 고쳐 친 글쇠는 한 번만 센다. 다른 프로그램과 같다고 쓰지 않는다.
- **영어 WPM** = 맞게 친 글자 수 ÷ 5 ÷ 분(순 WPM). 총 WPM = 누른 글쇠 전부(지우기 제외).
- **정확도** = 맞게 누른 글쇠 ÷ 누른 글쇠. 눌린 그 순간 맞았는지로 센다(고쳐도 틀렸던 기록은 남는다).
- **한/영·Caps Lock 안내가 뜬 구간**의 글쇠는 정확도·틀린 글쇠 기록에서 뺀다(`Session._zone`). 안내가 뜨기 직전에 이미 센 글쇠(Caps Lock 의 첫 글자)도 되돌린다.
- **화면 표시 값**(`TJ.report`): 시간을 0.1초까지 먼저 반올림하고, 속도는 그 표시한 시간으로 계산해 반올림한다. 결과 화면의 식("맞게 친 N타 ÷ T초 × 60 = S타/분")을 다시 계산하면 같은 수가 나와야 한다(시험 `report`, e2e `check_formula`). 틀린 게 하나라도 있으면 정확도 100% 로 올림하지 않는다.
- **틀린 글쇠**는 '그때 쳐야 했던 글쇠'에 적는다. **느린 글쇠** = 맞게 친 글쇠의 앞 글쇠와의 간격 평균이 전체 평균보다 긴 것(3초 넘게 쉰 간격·세 번 못 친 글쇠 제외).
- **터치 자판**: 자판 글쇠 이벤트가 한 번도 안 보이면 글자 단위(`mode: 'char'`). 마지막 한글 글자는 다음 글자가 올 때까지 판정을 미루고, 글쇠 수는 두벌식으로 환산한다. 느린 글쇠는 재지 않는다.
- 화면 말은 '글쇠'·'낱말' 대신 **'키'·'단어'**(처음 온 사람이 걸리는 말이라서. check.py 가 본다). 코드 주석과 이 문서는 예전 말이 섞여 있어도 된다.

## 설계 결정
- 색: **가지색 한 색**(`--main` 밝게 `#5b3fa6`, 어둡게 `#b8a4f0`) + 무채색. 지금 칠 자리·고른 것·속도 숫자·주 단추에만 쓴다. `--bad`(주홍) = 틀린 키, `--slow`(호박색) = 느린 키는 그 뜻일 때만. 다른 루멘랩 사이트와 겹치지 않게 고른 색이다(청록은 기기 테스트 사이트가 쓴다).
- 상징: **키 하나**. 로고, 다음 키(숫자 줄 오른쪽), 결과의 틀린 키 지도, 자리 연습 자판, 루멘랩 줄(L·U·M·E·N), 404, 공유 그림.
- 조합 중인 글자는 다른 글자로 바꿔 그리지 않는다. 목표 글자는 그대로 두고 친 만큼만 왼쪽부터 가지색을 채운다(`.c.pend`, `--f`). 다른 글자를 겹쳐 그리면 틀린 것처럼 보인다는 지적이 있었다.
- 결과는 **같은 종이 안에서** 바뀐다(컴퓨터: 종이 높이 고정 440px, 자리 연습 자판 높이 미리 잡음). 시간이 다 되어 결과가 뜨는 순간에는 사용자 입력이 없어서, 높이가 바뀌면 화면 밀림(CLS)으로 잡힌다.
- 휴대폰: 숫자가 글 위에 온다(기기 자판이 아래를 가린다). 글을 누르면 `html.m-tall`: 머리·제목·고르기를 접고 종이를 화면 높이로 늘린다(결과가 길어져도 아래 내용은 화면 밖에서만 밀린다). 닫기(×)나 '처음 화면으로'로 돌아온다.
- 설정: 자주 바꾸는 것(글 종류·시간)만 밖에 두고, 재는 방법(시간/분량)·문장부호·숫자는 '설정'에 접어 뒀다. 고른 것은 `todok.set` 에 남는다. 저장한 설정으로 바뀌어도 자리가 안 밀리게 `.opt.len` 폭을 잡아 뒀다.
- 단축키: Tab = 다른 글, Enter(결과 화면) = 다시, Esc = 처음으로(치는 칸에서 나와 키보드로 다른 단추에 갈 수 있다). 결과가 뜬 직후 0.7초 안의 Enter·Tab 은 무시한다(치던 손이 넘어온 것).
- 첫 판의 글은 날짜로 정한 '오늘의 글'(모든 방문자가 같은 글, 도구마다 따로). 둘째 판부터는 방문마다 다르다.
- 기록 비교: 같은 조건(도구·글 언어·글 종류·길이·문장부호/숫자)끼리만 지난 기록·최고 기록과 견준다. '틀린 키만 연습'은 최근·최고 기록에 넣지 않는다(키별 횟수에는 넣는다).
- 연구 값(Dhakal 외, CHI 2018: 168,960명 평균 51.56 WPM)은 영어 글을 치는 화면(영어 속도 측정, 영타 연습)에만, 출처 링크·확인한 날·한계(스스로 참여, 영어 문장 베껴 치기, 세계 평균 아님)와 함께 싣는다. 한국어 타수에는 견줄 공식 평균이 없어 내 기록하고만 견준다.
- 연출 셋: 루멘랩 키 줄(꼬리말, 화면에 들어올 때 한 번), 틀린 키 지도 켜짐(결과가 뜬 순간, 0.4초 안), 최고 기록 키 튀기(같은 조건의 앞 최고를 넘고 정확도 90% 이상일 때, 캔버스 1.4초). 치는 중에는 색만 바뀐다. 지금 칠 자리 밑줄은 다섯 번만 깜빡이고 멈춘다. 동작 줄이기면 전부 움직이지 않는다. 요청문은 구조 문서에 있다.
- 글꼴: Pretendard 를 `font-display: optional` 로 쓴다(치는 글의 줄 수가 글꼴이 늦게 와서 바뀌면 치는 중에 화면이 밀린다).
- 광고: 자동 광고 코드는 도구·글 페이지 `<head>` 에만(소개·방침·가이드 목록·404 에는 없음). 수동 자리 `mid`·`bottom` 은 단위 번호가 비어 있어 지금은 화면에 없다(높이 0). 도구 화면의 `mid` 는 '계산 기준' 뒤라 치는 칸에서 150px 넘게 떨어지고 치는 동안 보이는 범위 밖이다(e2e 가 잰다). `?adpreview` 나 localhost 에서는 빗금 상자.
- 저장: localStorage 키는 `todok.runs`·`todok.best`·`todok.keys`·`todok.set`·`todok.lang` 다섯 개뿐이고 방침에 그대로 적었다(check.py 가 코드의 키와 방침을 대조). 친 글 자체는 저장하지 않는다. '기록 지우기'는 앞의 셋을 지운다.
- 방침: 방문 통계는 Cloudflare Web Analytics 라고 적는다(Cloudflare 가 실제 주소에서 스크립트를 자동으로 끼워 넣는다. 우리 HTML 에는 없다). "아무것도 보내지 않아요"처럼 넓게 쓰지 않고 '친 글과 기록'에 대한 말로만 쓴다.

## 주의할 점
- **실제 한글 입력기(윈도우·맥·아이폰·안드로이드, 천지인)로는 확인하지 못했다.** e2e 는 CDP `Input.imeSetComposition`/`Input.insertText` 흉내이고, 로직 시험은 입력기 흉내(es-hangul·inko-py 와 대조)다. 입력 이벤트가 다른 기기가 있으면 `Engine.onInput` 과 `phys`(자판/터치 판별)를 먼저 본다.
- 공식 출처가 필요한 사실은 확인된 것만 쓴다. 싣지 않은 것: 두벌식 표준 번호(KS X 5002), 한국어 평균 타수·'몇 타면 빠른 편'·자격시험 급수 기준, 다른 타자 프로그램의 계산 방식("다를 수 있다"까지만), 기기별 입력기 동작.
- 가이드 글의 숫자·표에는 `data-st`·`data-pm`·`data-wpm`·`data-acc`·`data-ok`·`data-ime`·`data-finger`·`data-hand`·`data-q` 표시가 있고, 시험 `guide` 가 만든 HTML 을 읽어 로직으로 다시 계산한다. 글을 고치면 빌드한 뒤 시험을 돌린다.
- 영어 페이지에는 `lang="ko"` 밖 한글이 없어야 한다(check.py 는 정적 HTML·JSON, e2e.py 는 친 뒤의 화면까지 본다). 영어 페이지는 `tj-text-ko.js` 를 부르지 않는다.
- 스크린샷을 Pretendard 로 찍으려면 e2e.py 처럼 글꼴 CSS 의 표시 방식을 swap 으로 바꿔 받아야 한다(optional 은 처음 여는 브라우저에서 기기 글꼴로 그린다).
- Playwright 의 가짜 시계(`page.clock`)를 쓰면 30초 판을 바로 끝낼 수 있다. 화면 밀림(CLS)은 진짜 시계로 따로 잰다.
- 광고 코드가 있는 실제 주소(`*.lumenlab.page`)는 자동 도구로 열지 않는다. 로컬에서도 광고 요청은 정규식으로 막는다(`googlesyndication|doubleclick|adservice|fundingchoices`).
- 폴더에 `__pycache__`·`node_modules`·`.wrangler` 를 남기지 않는다(build.py·check.py·e2e.py 는 바이트코드를 쓰지 않게 해 뒀다).

## 유지 일정
- 해마다 바뀌는 기준은 없다. 연습 글은 분기마다 20~30문장씩 더한다(더할 때마다 `gen_ref.mjs` → 시험 `texts`·`compose` 통과).
- 연구 값 한 줄(51.56 WPM)은 논문 값이라 바뀌지 않는다. 링크가 살아 있는지만 반기마다 본다.
- 브라우저 입력 이벤트(조합 이벤트·`inputType`)가 바뀌면 e2e 를 다시 돌린다.
- 수동 광고 단위 번호를 받으면 `assets/ads-config.js` 의 `slots` 에 넣는다(자리 높이는 280px 로 잡혀 있다).
