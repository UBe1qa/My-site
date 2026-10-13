# boot-repair · 가죽결 수선소 (연습용 가상 공방)

웹 연출 연습용 내 사이트(2판 2026-10-13: 제3자 미감 피드백 세 차례 반영). lvlrehab.com 홈의 연출 뼈대(영상 첫 화면, 고정 무대 클로즈업, 여백 넓은 좌글·우그림, 고정 진행 그림, 늘 떠 있는 신청 바)를 부츠 수선 주제로 옮겼다. 가격·기간은 예시이고 신청은 접수되지 않는다(알림만).
주소: https://boot-repair.mysitebox.workers.dev (noindex). 배포는 `.deploy-actions` → GitHub Actions.
결정·연출 요청문은 My-site-private `context/knowledge/4-내-사이트/boot-repair-사이트-구조.md`.

## 파일
- `index.html` 한 페이지. 칸: 첫 화면(필름) → 고정 무대(story: 닳은 굽 → 고친 굽) → 큰 숫자(saving) → 흰 판(sheet: 1분 견적·사진 견적·수선 전후·수선 예시·맡기는 순서(고정 무대에서 한 단계씩)·질문·끝) → 꼬리말 → 신청 바(dock)
- 모양 규칙(2판): 바탕 흰색·#F5F6F8 번갈이, 글자 짙은 남색, 강조 주홍 `--accent` 하나, 갈색은 그림 안에만(그림 채도 0.65). 글꼴 Pretendard 하나, 명조는 견적서 종이만. 모든 칸 왼쪽 시작선 = `--gutter`(머리줄 로고와 같음). 칸 머리 = 이름표 + 제목 + 두 줄.
- `data.js` 수선 항목(`REPAIRS`: 가격·기간·점 자리는 견적 그림 SVG 좌표)·맡기는 순서(`STEPS`)·수선 예시(`CASES`). 항목은 여기만 고친다.
- `app.js` 움직임 없이도 되는 것: 견적(점·칩·견적서·도장·지우기/되돌리기), 전후 비교, 순서 태그, 신청 바, 드러내기·숫자 세기
- `film.js` 첫 화면 캔버스 '바느질 필름'(바늘이 웰트 선을 따라 한 땀씩). 화면 밖·숨김·일시정지·동작 줄이기에서 멈춤
- `motion.js` GSAP 3.15 + ScrollTrigger(jsDelivr). 첫 화면 틀 펼치기, 고정 무대 타임라인(scrub). `html.anim`일 때만
- `img/` 코드로 그린 그림을 WebP로 굽은 것. 원본은 `_dev/art/make_paint.py`(칠한 부츠 SVG를 자르기 viewBox로) → `_dev/render.py`
- `_dev/` 확인 도구(배포 안 됨): `check.py`(폭별 넘침·깨진 그림·오류·일시정지·동작 줄이기), `look.py`(스크롤 위치별 스크린샷), `interact.py`(견적·비교·신청 바 눌러 보기), `perf.py`(CPU 4배 느리게 프레임 간격)

## 명령
- 그림 다시 굽기: `cd _dev/art && python3 make_paint.py && cd .. && python3 render.py`
- 확인: `cd _dev && python3 check.py`
