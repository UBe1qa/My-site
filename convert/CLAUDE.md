# 인플레이스 / Inplace (convert)

브라우저 안에서 파일을 바꾸는 도구 24개(영상·소리 7, 그림 4, PDF 11, 표 2). 2026-10-06 제3자 평가 뒤 결함 13개를 고치고 PDF 도구 7개(압축·쪽 정리·돌리기·쪽 번호·워터마크·암호 걸기·암호 풀기)를 더했다. 파일은 서버로 올라가지 않는다(서버 코드 없음, 정적 사이트).
- 주소: https://convert.lumenlab.page (Worker `convert`, workers.dev 끔). 영어 `/`, 한국어 `/ko/`. 2026-10-06 처음 배포.
- 출발점: 운영자가 '유튜브 다운로더(mp3, mp4)'를 원했으나 애드센스 정책(저작권 침해 도구 금지)과 유튜브 약관(다운로드 금지) 때문에 다운로더는 만들지 않고, **자기 파일을 바꾸는 변환기**로 바꿨다. smallpdf·123apps 분량(도구 여러 개, 도구마다 페이지 하나)을 참고했지만 디자인·문구·코드는 가져오지 않았다.
- **유튜브 주소를 받는 기능, 다운로드 기능은 넣지 않는다.** 넣으면 애드센스 계정 전체가 위험해진다.

## 폴더
- `_dev/build.py` **모든 HTML을 만든다**: `python3 convert/_dev/build.py` (→ "built N pages"). 도구 목록·분류·받는 파일 = `TOOLS`, 화면 글자 = `UI`, 방침·오픈소스 고지 = `PRIVACY`·`LICENSES`. 만든 HTML·`sitemap.xml`·`rss.xml`(한국어 글)·`assets/tools.js`는 손으로 고치지 않는다.
- `_dev/content.json` 도구마다 영어·한국어 이름·제목·설명·본문·FAQ, 첫 페이지·소개 글. `_dev/articles.json` 가이드 글(영어·한국어 따로 고른 주제, 같은 주제만 `ARTICLE_PAIRS`로 hreflang 짝). 글을 고치면 build.py를 다시 돌리고, 실제로 고친 주소·날짜를 `UPDATED`에 적는다(sitemap lastmod).
- `assets/app.js` 화면 전부(파일 넣기, 도구별 옵션 `RUNNERS`, 시간 띠 `timeline`, 결과·ZIP·공유, 첫 페이지의 '파일 먼저 넣고 도구 고르기'). 페이지 언어는 `<html lang>`으로만 정한다. 브라우저 언어가 다르면 닫을 수 있는 띠만 띄운다(자동으로 안 넘김).
- `assets/engines/` 변환 엔진(DOM을 거의 모름): `media.js`(Mediabunny = WebCodecs, MP3는 LAME wasm, AAC는 wasm 인코더), `image.js`(캔버스, HEIC는 libheif wasm), `pdf.js`(pdf-lib + PDF.js 4.10 legacy + qpdf wasm: 암호 풀기·걸기, 구조 압축), `data.js`(CSV·JSON 직접 구현, 엑셀은 SheetJS).
- `assets/vendor/` 라이브러리 원본(손으로 안 고침). 버전·라이선스는 `/licenses/` 페이지(build.py `LICENSES`).
- `assets/ads-config.js` 애드센스: client 들어 있음(자동 광고 켜짐), 수동 광고 단위 번호(slots)는 비어 있음. 자리 2곳(mid = 도구 카드 아래, bottom). localhost나 `?adpreview`면 점선 상자.
- `ads.txt`, `robots.txt`(AI 검색 크롤러 명시 허용), `og.png`·`favicon.*`·`apple-touch-icon.png`(만드는 스크립트는 없음, 바꾸려면 새로 그린다).

## 명령어
- 페이지 다시 만들기: `python3 convert/_dev/build.py`
- CSV·JSON 단위 시험(21개): convert 폴더에서 `node --input-type=module -e "import('./_dev/test_data.mjs')"`
- 로컬 보기: `node convert/_dev/serve.mjs` → http://localhost:8431 (폴더→index.html, 없는 주소→404.html, `_dev` 막음)
- 실제 파일 변환 시험(62개): `_dev/e2e.mjs`를 playwright-core가 깔린 폴더(scratchpad)에 복사해 `node e2e.mjs <시험 파일 폴더> <결과 폴더> http://localhost:8431 [도구 앞글자…]`. 시험 파일은 ffmpeg로 만든다(tone.wav/ogg/mp3/flac/m4a, clip.webm(VP9+Opus), clip.mp4(H.264+AAC), photo.png/jpg/webp, alpha.png, sample.heic, doc3.pdf, people.csv, items.json, book.xlsx). 2026-10-06에 더한 것: rot6.jpg(EXIF 회전 6, PIL로), scan.pdf(큰 JPG·PNG가 든 3쪽, pdf-lib로), restricted.pdf(열기 암호 없이 인쇄·복사만 막음), locked.pdf(열기 암호 user1) — 두 암호 PDF는 qpdf로 만든다.
- 화면 사진: `_dev/shots.mjs` (같은 방법, `ONLY=이름,이름`으로 골라 찍기).
- 배포: `.deploy-actions`가 있어 main에 푸시하면 GitHub Actions가 wrangler로 배포.

## 설계 결정
- 브라우저가 못 하는 변환은 하는 척하지 않는다: Word·한글(HWP)→PDF, PDF→Word, 오래된 코덱(WMV·AVI·FLV)은 도구로 만들지 않았다. 못 여는 파일은 '이 브라우저에서 못 연다 + 대신 할 수 있는 것' 오류를 보여 준다.
- 영상·소리는 Mediabunny Conversion: 형식만 바꿀 땐 다시 인코딩하지 않고 그대로 옮겨(copy) 순식간에 끝난다. 자르기 '빠르게'는 키프레임에 맞춰 넓게 자르고(region expand), '정확하게'는 다시 인코딩한다. 소리만 있는 파일이 Conversion으로 안 되면 decodeAudioData로 풀어서 다시 넣는다.
- 영상 줄이기 코덱은 고정하지 않는다: avc → hevc → vp9 → av1 중 이 브라우저가 인코딩할 수 있는 첫 번째.
- CSV→JSON '숫자로 바꾸기'를 켜도 앞자리 0(010…, 우편번호)과 너무 큰 정수는 글자로 둔다. 엑셀용 CSV는 한글이 안 깨지게 BOM을 붙이는 옵션(한국어 기본 켬). UTF-8로 안 읽히는 CSV는 EUC-KR로 다시 읽는다.
- 언어마다 주소 하나(`/` 영어 = x-default, `/ko/` 한국어), hreflang은 같은 내용 짝에만.
- 디자인: 공항 '글자판(split-flap)' — 검은 칸에 노란 글자, 바뀔 때 넘어가는 애니메이션(움직임 줄이기 설정이면 없음). 분류 색(영상 보라, 소리 청록, 그림 주황, PDF 빨강, 표 초록)은 카드 왼쪽 줄에만.
- 광고 자리는 파일 넣는 곳·바꾸기 버튼 바로 옆에 두지 않는다(잘못 누르기 쉬움).
- 연출(2026-10-06): 기본 반응은 style.css 끝 '연출' 칸의 토큰(`--t-fast`·`--t`·`--t-slow`·`--ease`)만 쓴다. 화려한 연출은 3개뿐(출발 안내판 공개 = 세션 첫 결과만, 용량 줄어듦 막대, 자물쇠 열림·잠김) — 요청문·고른 이유는 구조 문서 '연출 요청문'. 변환하는 동안엔 진행 막대 말고 움직임을 넣지 않는다(변환이 CPU를 씀). 첫 페이지 머리 글자판은 한 바퀴만 돌고 멈춘다(멈춘 뒤 타이머 0).

## 주의할 점
- qpdf wasm 빌드(@neslinesli93/qpdf-wasm 0.3.0)는 `print`·`printErr`를 넘겨받지 않는다(오류 글은 console로만 나감). 그래서 종료 코드로만 판단한다: `--show-npages`가 0이면 열림(→ `--is-encrypted` 0이면 제한만 걸림), 아니면 pdf-lib `ignoreEncryption`으로 열어 `isEncrypted`면 열기 암호, 아니면 손상. 열기 암호 파일에 `--requires-password`는 0이 아니라 2를 낸다.
- Mediabunny Conversion의 `copy`에는 `region` 옵션이 없다(`mode`·`shiftTolerance`·`boundaryPolicy`·`boundaryTolerance`). 소리만 자를 때 옮겨 담으려면 `shiftTolerance`(0.1초)를 줘야 한다. 안 주면 다시 인코딩되고 비트레이트를 안 정하면 320kbps 가까이로 커진다.
- 이미지→PDF에서 JPG를 그대로 넣으면 EXIF 회전값이 무시된다 → 회전값(1 아님)이 있으면 풀어서 다시 저장(image.js `jpegOrientation`).
- MP4·MOV로 바꿀 땐 VP9·AV1·Opus를 그대로 담지 않는다(아이폰·편집 앱에서 안 열림) → H.264·AAC로 다시 만들고, 이 브라우저가 H.264를 못 만들면 그대로 담되 화면에 알린다(`compat`).
- 작업 공간(리눅스 Playwright Chromium)에는 AAC·H.264 디코더가 없어 MP4(H.264)·M4A 입력 시험이 실패한다. 실제 크롬·사파리에서는 된다. 이 3개 시험 실패는 코드 문제가 아님.
- PDF.js 5·6은 너무 새 JS(`getOrInsertComputed`)를 써서 조금 오래된 브라우저에서 깨진다 → 4.10 legacy 빌드를 쓴다. 문서 닫기는 `loadingTask.destroy()`.
- 캔버스 `toBlob('image/webp')`이 안 되는 브라우저(옛 사파리)는 PNG를 돌려준다 → 결과 `blob.type`을 확인한다(image.js `canEncode`).
- GIF(256색)는 그냥 가장 가까운 색으로 바꾸면 안개·흐린 배경이 얼룩진다 → `engines/dither.js`의 순서 디더링(프레임마다 무늬 자리가 같아 지글거림 없음). 팔레트가 앞 프레임 것으로 충분하면(오차 1.25배 이내) 다시 쓰고, 앞 프레임과 거의 같은 점(색 차이 7 이하)은 투명으로 둬 용량을 줄인다(정지 배경 영상 3.4MB→0.3MB). 시험: e2e `gif-quality` (fx/static.webm = 안개 사진 위로 상자 하나가 움직이는 3초 영상).
- 광고 코드가 있는 실제 주소를 자동으로 열 땐 `googlesyndication.com`·`doubleclick.net` 요청을 막는다(가짜 노출 = 무효 트래픽).
