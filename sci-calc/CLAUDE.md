# sci-calc (공학용 계산기 · Scientific Calculator)

주소 https://calc.lumenlab.page (한국어 `/`, 영어 `/en/`). Cloudflare Worker `sci-calc`, 정적 파일만. GitHub Actions 가 `.deploy-actions` 표시를 보고 배포한다.
결정·남은 일·고친 기록은 프로젝트 문서 `4-내-사이트/sci-calc-사이트-구조.md` 에만 적는다(여기엔 파일 구조와 명령만).

## 파일
- `assets/engine.js` 계산 엔진(SC): 정확값(큰 정수 분수, √·π 항), 소수, 복소수, 식 읽기(카시오식 우선순위), 표시 반올림, 상수(CODATA 2022)·단위 바꾸기
- `assets/modes.js` 통계·회귀·분포·방정식·행렬·벡터·진법·함수표 계산(SCM)
- `assets/editor.js` 자연 표시 편집기(ME): 분수·루트 칸, 커서, 키보드·한글 자판 입력
- `assets/ui.js` 공통 화면 도우미(UI): 말(ko/en), localStorage 저장, 설정, 결과 그리기, 언어 안내 띠
- `assets/calc.js` 첫 페이지 계산기 / `assets/modes-ui.js` 모드 화면 6개 / `assets/ads-config.js` 광고 자리
- `assets/style.css` 모양 전부(색은 `:root` 토큰, 어두운 화면 포함)
- `tools/build.py` 모든 HTML·sitemap.xml·rss.xml 을 만든다. 글은 `tools/articles.py`, 첫 화면·모드·소개·방침 글은 `tools/content.py`
- `tests/` 기준값(파이썬 sympy·mpmath·scipy 로 따로 계산)과 시험. `_dev/` 검사 도구

## 명령
- 페이지 다시 만들기 + 시험 + HTML 검사: `sh _dev/check.sh`
- 브라우저 검사(서버 켜고): `python3 -m http.server 8765` 후 `python3 _dev/check_browser.py`, `python3 _dev/check_calc.py`
- 기준값 다시 만들기(보통 필요 없음): `python3 tests/gen_cases.py`, `python3 tests/gen_modes.py` (sympy·mpmath·numpy·scipy 필요)

## 지킬 것
- HTML 은 손으로 고치지 않는다. `tools/*.py` 를 고치고 `python3 tools/build.py`.
- 글에 숫자를 쓰면 `checks` 에 같이 적는다(`tests/run_articles.js` 가 계산기로 다시 계산).
- 스크립트·CSS 를 바꾸면 `tools/build.py` 의 `ASSET_V` 를 올린다(브라우저 캐시).
- sitemap lastmod 는 `content.UPDATED`·글의 `updated` 로 정한다. 내용이 바뀐 날만 올린다.
- 광고: `<head>` 자동 광고 코드는 404 에 넣지 않는다. 수동 광고 단위 번호는 `assets/ads-config.js` 의 `slots`.
