# boot-repair · 가죽결 수선소 (연습용 가상 공방)

웹 연출 연습용 내 사이트. lvlrehab.com 홈의 연출 뼈대(영상 첫 화면, 고정 무대 클로즈업, 여백 넓은 좌글·우그림, 고정 진행 그림, 늘 떠 있는 신청 바)를 부츠 수선 주제로 옮겼다. 가격·기간은 예시이고 신청은 접수되지 않는다(알림만).
주소: https://boot-repair.mysitebox.workers.dev (noindex). 배포는 `.deploy-actions` → GitHub Actions.
결정·연출 요청문은 My-site-private `context/knowledge/4-내-사이트/boot-repair-사이트-구조.md`.

## 파일
- `index.html` 한 페이지. 칸: 첫 화면(필름) → 고정 무대(story) → 큰 숫자(saving) → 흰 판(sheet: 견적·전후·순서·질문·끝) → 꼬리말 → 신청 바(dock)
- `data.js` 수선 항목(`REPAIRS`: 가격·기간·점 자리는 견적 그림 SVG 좌표)·맡기는 순서(`STEPS`). 항목은 여기만 고친다.
- `app.js` 움직임 없이도 되는 것: 견적(점·칩·견적서·도장·지우기/되돌리기), 전후 비교, 순서 태그, 신청 바, 드러내기·숫자 세기
- `film.js` 첫 화면 캔버스 '바느질 필름'(바늘이 웰트 선을 따라 한 땀씩). 화면 밖·숨김·일시정지·동작 줄이기에서 멈춤
- `motion.js` GSAP 3.15 + ScrollTrigger(jsDelivr). 첫 화면 틀 펼치기, 고정 무대 타임라인(scrub). `html.anim`일 때만
- `img/` 코드로 그린 그림을 WebP로 굽은 것. 원본은 `_dev/art/make_paint.py`(칠한 부츠 SVG를 자르기 viewBox로) → `_dev/render.py`
- `_dev/` 확인 도구(배포 안 됨): `check.py`(폭별 넘침·깨진 그림·오류·일시정지·동작 줄이기), `look.py`(스크롤 위치별 스크린샷), `interact.py`(견적·비교·신청 바 눌러 보기), `perf.py`(CPU 4배 느리게 프레임 간격)

## 명령
- 그림 다시 굽기: `cd _dev/art && python3 make_paint.py && cd .. && python3 render.py`
- 확인: `cd _dev && python3 check.py`
