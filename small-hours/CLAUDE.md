# small-hours

가상 문페이즈 시계 마이크로 브랜드 Small Hours의 영어 견본 사이트(루멘랩 개념 사이트). 주소 https://small-hours.lumenlab.page
기획·짜임·디자인 틀은 My-site-private `context/knowledge/4-내-사이트/small-hours-사이트-구조.md`.

## 파일
- `index.html`: 글·CSS 전부(장면 일곱 개 = `section.sc#s1~s7`). JS가 없으면 그냥 위아래로 읽히는 페이지.
- `assets/app.js`: 빌드 결과(three.js 포함, 직접 고치지 않음). 원본은 `_dev/src/`.
  - `main.js`: 스크롤 → 장면. `SCENES`(장면별 화면 수), `keys()`(카메라 자리: 폰/PC), 글 들어오고 나가기, 소리 신호.
  - `backdrop.js`: 무대 셰이더 다섯(밤 하늘·설계도·종이·작업대·달 뜬 하늘), 아래에서 위로 바뀜.
  - `watch-setup.js`·`studio.js`: 3D 스레드가 준 것(프로젝트 파일 `small-hours/3d/`). 사이트에서 바꾼 곳은 `setExplode`의 `stagger`(부품이 위에서부터 차례로 뜸)와 `glassBoost`(분해 때 유리 반사 세기) 둘.
  - `moon.js`: 오늘 달 위상·밝기·다음 보름(브라우저에서 계산). `sound.js`: 음악 둘 + 코드로 만든 째깍 소리.
- `assets/watch.glb`(Draco), `assets/draco/`(디코더), `assets/fonts/`(Instrument Serif, Inter Tight, OFL), `assets/audio/`(Suno 곡: night = 바탕 반복 4마디 뒤 24마디 고리, moon = ⑥에서 한 번).

## 명령
```
cd _dev && npm install   # 처음 한 번 (esbuild, three 0.187)
./build.sh               # src → ../assets/app.js
./check.sh               # 정적 검사
```
