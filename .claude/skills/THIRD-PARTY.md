# 이 폴더의 스킬 (남이 만든 오픈소스)

Claude Code가 이 저장소에서 일할 때 자동으로 읽는 스킬들이다. 2026-11-05에 넣었다. 사이트 배포에는 들어가지 않는다(사이트는 각 폴더만 배포함).

| 폴더 | 원본 | 받은 커밋 | 라이선스 | 무엇에 쓰나 |
|---|---|---|---|---|
| `impeccable/` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | c8891a9 (2026-11-05, 엔진 0.1.18) | Apache-2.0 (`impeccable/LICENSE`, `NOTICE.md`) | 디자인 다듬기·점검. `overdrive`(셰이더·스프링·스크롤 연출), `critique`·`audit`, `animate`, `bolder` 등 |
| `gsap-*/` (8개) | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | aed9cfd (2026-04-21) | MIT (각 폴더 `LICENSE`) | GSAP 공식 사용법: 타임라인, ScrollTrigger, SplitText 등 플러그인, 성능 |
| `shader-art-coding/` | [gokayfem/shader-skills](https://github.com/gokayfem/shader-skills) | a56e773 (2026-10-23) | MIT (`shader-art-coding/LICENSE`) | 검증된 GLSL 함수(구름·물·지형·노이즈·SDF), 묶기·검사 도구 |

## 원본에서 바꾼 것

- `impeccable/`: `live`·`generate` 명령을 뺐다(`reference/live.md`·`live-setup.md`·`generate.md`, `scripts/live-browser*.js`·`modern-screenshot.umd.js`를 지우고, `SKILL.md`·`reference/init.md`·`routing.md`·`typeset.md`·`colorize.md`·`layout.md`에서 그 명령을 가리키는 줄을 고침). live 모드는 편집을 적용할 때 Claude/Codex 명령을 권한 확인 없이 돌릴 수 있어서다. `SKILL.md` 머리에 바꾼 내용을 적어 두었다.
- `impeccable/`의 자동 검사 훅(편집할 때마다 도는 것)은 설치하지 않았다. 검사는 필요할 때 `audit`·`critique`로.
- GSAP·Shader 스킬은 원본 그대로다.

## 쓸 때

- 디자인 규칙은 비공개 저장소 My-site-private의 지침이 먼저다. 스킬 안의 취향 규칙이 지침과 다르면 지침을 따른다.
- `impeccable`은 처음 쓸 때 GitHub 릴리스에서 엔진 파일을 받아 `~/.impeccable/bin/`에 둔다(체크섬 확인함).
- `impeccable init`·`document`는 쓰지 않는다. 이 저장소는 사이트 여러 개가 같이 있고, 사이트 폴더에 `PRODUCT.md`·`DESIGN.md`가 생기면 그 폴더째 공개 배포된다. 사이트마다 누구·무엇·느낌은 My-site-private의 구조 문서에 있으니 그걸 읽고 명령을 쓴다.
- 스킬이 만드는 설정 폴더 `.impeccable/`은 `.gitignore`에 넣어 커밋·배포되지 않게 했다.

## 새 판으로 바꾸려면

원본 저장소를 새로 받아 같은 폴더에 덮어쓰고, `impeccable/`은 위 '바꾼 것'을 다시 적용한 뒤 이 표의 커밋을 고친다.
