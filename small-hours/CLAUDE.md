# small-hours

가상 문페이즈 시계 마이크로 브랜드 Small Hours의 영어 견본 사이트(루멘랩 개념 사이트). 주소 https://small-hours.lumenlab.page
기획·짜임·디자인 틀은 My-site-private `context/knowledge/4-내-사이트/small-hours-사이트-구조.md`.

## 파일
- `index.html`: 글·CSS 전부. 2판(11-25)은 '변신의 사슬': 고정 장 여덟 개 `section.sc#c1~c8` + 사진 줄 `#gallery` + 필름 뒤 보통 페이지 `#after`(질문·세 문자판·달력·알림, 5판에서 카드 줄 뺌). JS가 없으면 그냥 위아래로 읽히는 페이지.
- `assets/app.js`: 빌드 결과(three.js 포함, 직접 고치지 않음). 원본은 `_dev/src/`.
  - `main.js`: 스크롤 s(화면 수, 0~`FILM_END` 48.5) → 사슬. `CH`(장 범위), `TEXT`(글 블록 들고 나는 s), `STAGES`(무대), `keys()`(카메라 자리: 폰/PC). 문자판 투명(깊이만 쓰는 사본으로 하늘이 비침), 사진 줄은 캔버스 clip-path로 뷰파인더·창, 금선은 overrideMaterial 한 번 더, 초승달은 SVG, 각인은 뒷뚜껑 위 링에 캔버스 글. `?debug`면 `window.__sh`.
  - `backdrop.js`: 무대 셰이더(밤 하늘·달 뜬 하늘·새벽·제도 필름·빈 어둠) + 사진 세트 넷(20 밤 책상·21 제도대·22 각인 작업대·23 아침 식탁). 다음 무대는 시계 자리에서 동그랗게 열림.
  - 세트(3판, 11-25): 세트 안에서는 카메라가 DSET=20 거리에 서서 줌·이동만 하고 시계가 그 앞에서 돈다. 사진은 같은 카메라로 Blender 회색 구도(`_dev/sets/sets.py`, 결과 `sets.json`)를 찍어 Seedream 5.5에 기준 그림으로 넣어 뽑았다. 그래서 화면 픽셀마다 카메라 광선으로 사진 자리를 찾아 그리면 줌해도 맞는다(`SET_WIN`). 책상 그림자는 안 보이는 판(ShadowMaterial)이 받는다. 세트를 바꾸려면 sets.py를 다시 돌리고 SETS·SET_WIN 숫자를 고친다.
  - `watch-setup.js`·`studio.js`: 3D 스레드가 준 것(프로젝트 파일 `small-hours/3d/`). 사이트에서 바꾼 곳은 `setExplode`의 `stagger`(부품이 위에서부터 차례로 뜸)와 `glassBoost`(분해 때 유리 반사 세기) 둘.
  - 5판(11-25): 마무리 색 처리는 AgX(punchy, finish 셰이더 `agx()`), 뒷면이 보이면 무브먼트(`_mv` 재질) 반사를 절반으로. 분해는 제도대 세트 위에서 하고 불이 꺼지며 야광(`lumeMats`)으로 넘어감. 사진 줄 사진은 CSS 필터·그레인으로 한 필름처럼, 캡션 자리는 사진마다 바뀜(`.cap.p0~p3`), 사진마다 `objectPosition`으로 시계를 화면 안에.
  - `moon.js`: 오늘 달 위상·밝기·다음 보름(브라우저에서 계산). `sound.js`: 음악 둘 + 코드로 만든 째깍 소리.
- `img/set-*-p/w.webp`(세트 사진 폰/PC, Seedream 5.5), `img/night-1~6.webp`(Seedream 5.5 손목 사진, 사진 칸은 화면 가득), `img/dial-*`(3D 모델에서 헤드리스로 찍은 것)
- `assets/watch.glb`(Draco), `assets/draco/`(디코더), `assets/fonts/`(Instrument Serif, Inter Tight, OFL), `assets/audio/`(Suno 곡: night = 바탕 반복 4마디 뒤 24마디 고리, moon = ⑥에서 한 번).

## 명령
```
cd _dev && npm install   # 처음 한 번 (esbuild, three 0.187)
./build.sh               # src → ../assets/app.js
./check.sh               # 정적 검사
```
