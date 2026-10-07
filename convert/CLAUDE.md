# 인플레이스 / Inplace (convert)

브라우저 안에서 파일을 바꾸는 도구 25개(영상·소리 7, 그림 4, PDF 12, 표 2). 2026-10-07 'PDF → 마크다운'(ChatGPT·클로드·제미나이 같은 AI에 PDF 대신 글만 넣어 토큰 줄이기)과 가이드 글을 더했다. 2026-10-06 제3자 평가 뒤 결함 13개를 고치고 PDF 도구 7개(압축·쪽 정리·돌리기·쪽 번호·워터마크·암호 걸기·암호 풀기)를 더했다. 파일은 서버로 올라가지 않는다(서버 코드 없음, 정적 사이트).
- 주소: https://convert.lumenlab.page (Worker `convert`, workers.dev 끔). 영어 `/`, 한국어 `/ko/`. 2026-10-06 처음 배포.
- 출발점: 운영자가 '유튜브 다운로더(mp3, mp4)'를 원했으나 애드센스 정책(저작권 침해 도구 금지)과 유튜브 약관(다운로드 금지) 때문에 다운로더는 만들지 않고, **자기 파일을 바꾸는 변환기**로 바꿨다. smallpdf·123apps 분량(도구 여러 개, 도구마다 페이지 하나)을 참고했지만 디자인·문구·코드는 가져오지 않았다.
- **유튜브 주소를 받는 기능, 다운로드 기능은 넣지 않는다.** 넣으면 애드센스 계정 전체가 위험해진다.

## 폴더
- `_dev/build.py` **모든 HTML을 만든다**: `python3 convert/_dev/build.py` (→ "built N pages"). 도구 목록·분류·받는 파일 = `TOOLS`, 화면 글자 = `UI`, 방침·오픈소스 고지 = `PRIVACY`·`LICENSES`. 만든 HTML·`sitemap.xml`·`rss.xml`(한국어 글)·`assets/tools.js`는 손으로 고치지 않는다.
- `_dev/content.json` 도구마다 영어·한국어 이름·제목·설명·본문·FAQ, 첫 페이지·소개 글. `_dev/articles.json` 가이드 글(영어·한국어 따로 고른 주제, 같은 주제만 `ARTICLE_PAIRS`로 hreflang 짝). 글을 고치면 build.py를 다시 돌리고, 실제로 고친 주소·날짜를 `UPDATED`에 적는다(sitemap lastmod).
- `assets/app.js` 화면 전부(파일 넣기, 도구별 옵션 `RUNNERS`, 시간 띠 `timeline`, 결과·ZIP·공유, 첫 페이지의 '파일 먼저 넣고 도구 고르기'). 페이지 언어는 `<html lang>`으로만 정한다. 브라우저 언어가 다르면 닫을 수 있는 띠만 띄운다(자동으로 안 넘김).
- `assets/engines/` 변환 엔진(DOM을 거의 모름): `media.js`(Mediabunny = WebCodecs, MP3는 LAME wasm, AAC는 wasm 인코더), `image.js`(캔버스, HEIC는 libheif wasm), `pdf.js`(pdf-lib + PDF.js 4.10 legacy + qpdf wasm: 암호 풀기·걸기, 구조 압축), `pdfmd.js`(PDF → 마크다운: PDF.js 글자 조각 위치만 보고 제목·문단·목록·표·두 단을 다시 짬), `data.js`(CSV·JSON 직접 구현, 엑셀은 SheetJS).
- `assets/vendor/` 라이브러리 원본(손으로 안 고침). 버전·라이선스는 `/licenses/` 페이지(build.py `LICENSES`).
- `assets/ads-config.js` 애드센스: client 들어 있음(자동 광고 켜짐), 수동 광고 단위 번호(slots)는 비어 있음. 자리 2곳(mid = 도구 카드 아래, bottom). localhost나 `?adpreview`면 점선 상자.
- `ads.txt`, `robots.txt`(AI 검색 크롤러 명시 허용), `og.png`·`favicon.*`·`apple-touch-icon.png`(만드는 스크립트는 없음, 바꾸려면 새로 그린다).

## 명령어
- 페이지 다시 만들기: `python3 convert/_dev/build.py`
- CSV·JSON 단위 시험(21개): convert 폴더에서 `node --input-type=module -e "import('./_dev/test_data.mjs')"`
- 로컬 보기: `node convert/_dev/serve.mjs` → http://localhost:8431 (폴더→index.html, 없는 주소→404.html, `_dev` 막음)
- 실제 파일 변환 시험(73개): `_dev/e2e.mjs`를 playwright-core가 깔린 폴더(scratchpad)에 복사해 `node e2e.mjs <시험 파일 폴더> <결과 폴더> http://localhost:8431 [도구 앞글자…]`. 시험 파일은 ffmpeg로 만든다(tone.wav/ogg/mp3/flac/m4a, clip.webm(VP9+Opus), clip.mp4(H.264+AAC), photo.png/jpg/webp, alpha.png, sample.heic, doc3.pdf, people.csv, items.json, book.xlsx). 2026-10-06에 더한 것: rot6.jpg(EXIF 회전 6, PIL로), scan.pdf(큰 JPG·PNG가 든 3쪽, pdf-lib로), restricted.pdf(열기 암호 없이 인쇄·복사만 막음), locked.pdf(열기 암호 user1) — 두 암호 PDF는 qpdf로 만든다. 2026-10-07: paper.pdf(arXiv 1706.03762 논문), ko-guide.pdf(한국어 가이드 글을 LibreOffice `soffice --convert-to pdf:writer_web_pdf_Export`로 저장, 글꼴 WenQuanYi), notext.pdf(글자 층 없는 그림 3쪽), mixed.pdf(doc3 1쪽 + notext 1쪽 + doc3 3쪽, pdf-lib로), twocol.pdf(arXiv 1512.03385 ResNet, 진짜 두 단), slides.pdf(CS231n 2017 1강 슬라이드 48쪽). 로컬에서 v2mp3-mp4·audio-m4a2mp3·video-mp42webm 3개는 net::ERR_FAILED로 떨어질 수 있다(실제 주소로 확인).
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
- PDF → 마크다운(`pdfmd.js`): 노드에서도 돈다(`extractPages(PDF.js 모듈, 바이트)` → `buildMarkdown`). 한글 CID 글꼴은 `assets/vendor/cmaps/`(Adobe bcmap), 문서에 안 박힌 기본 글꼴(Helvetica 등)은 `assets/vendor/standard_fonts/`가 있어야 글자가 나온다. 표는 두 가지로 찾는다: 테두리 선이 있으면 `getOperatorList`의 가로·세로 선으로 칸을 나누고(칸 나뉜 줄이 있는 쪽만 읽음 — 스캔 쪽에서 쪽마다 1초씩 걸려서), 없으면 모든 줄에서 글자가 안 걸치는 세로 틈(칸 경계)을 찾는다. 쪽에 머리말과 같은 줄밖에 없으면 지우지 않는다(지우면 '글자 없는 쪽'으로 잘못 알림). 문단 끝은 '다음 줄 첫 낱말이 앞 줄 남은 자리에 들어갈 수 있었나'로 본다(한글 문서는 오른쪽이 들쭉날쭉해서 줄 길이만 보면 문단이 끊김).
- 이름·글은 특정 AI 하나를 앞세우지 않는다(사용자 2026-10-07: '클로드' 대신 'AI' 일반 표현, 예시로 여러 이름 나열은 괜찮음). 토큰 숫자는 각 회사 문서에서 확인한 것만 쓴다 — OpenAI·앤트로픽은 쪽마다 글+쪽 그림, 제미나이 API는 쪽당 258토큰, 제미나이 3은 미디어 해상도 문서 기준 기본 약 560토큰(낮음 280, 높음 1,120)에 PDF 글자는 요금 없음(그래서 마크다운이 더 들 수 있다고 적음). 논문 쪽 크기도 확인할 것(레터 1,496 / A4 1,551). 앤트로픽(쪽마다 글 1,500~3,000토큰 + 쪽 그림, 그림은 ⌈w/28⌉×⌈h/28⌉에 한도 1,568토큰/클로드 4.7 이후 4,784토큰, 베드록 3쪽 약 1,000 대 7,000, claude.ai 100쪽 이하만 그림 분석). API 키가 없어 실제 토큰은 못 쟀다 — 가이드 표는 잰 글자 수와 계산한 그림 최대치로만 썼다.
- 마크다운 제3자 평가(2026-10-07, 결함 17개) 뒤 배운 점: ① 두 단 판단(`findGutter`)은 가운데 맞춤 제목·저자·그림 설명 몇 줄이 띠를 가로질러도 통과해야 한다(안 그러면 두 단 본문이 '선 없는 표'로 잡힘). 가운데 맞춤으로 양쪽에 걸친 줄은 통째로 가로 줄. ② 제목 단계는 '첫 쪽 위쪽의 가장 큰 글 = #'에서 시작하고, 그보다 큰 글은 여러 쪽에 서로 다른 글일 때만 제목(그림 속 큰 글자 거르기). 3줄 넘게 붙은 '제목'·마침표로 끝나는 긴 문장은 문단. '3.1 …' 한 줄은 소절 제목. ③ 발표 자료(가로 쪽·쪽당 글 적음)는 쪽 위쪽 가장 큰 글만 제목, •·–는 크기와 상관없이 목록(들여쓰기로 하위 목록). ④ 공문서 'ㅇ'은 목록, '※'·'*'·'[12] 참고문헌'은 새 문단 + 내어쓴 다음 줄 잇기. ⑤ 꼬리말은 칸별로도 센다(쪽 번호 든 칸이 붙었다 떨어졌다 함), 표 칸 안 꼬리말 행도 뺀다, 몇 쪽만 꼬리말뿐이면 그 쪽은 그림만 있는 쪽. ⑥ 그림 글자·그림 제목·각주가 끼어 끊긴 문장(소문자로 시작)은 앞 문단에 잇고, 쪽을 넘어 이으면 문단 안에 `<!-- page N -->`를 남긴다. ⑦ 줄 끝 하이픈·한글 줄바꿈은 문서 낱말 모음(VOCAB)과 조사·어미 목록으로 붙일지 정한다. ⑧ 글 적은 쪽(40자 미만)은 그림 넓이를 재서 25% 넘으면 '그림 위주' 경고. ⑨ 진짜 두 단 논문(ResNet)·발표 자료(CS231n)·스캔+글 한 줄을 e2e에 넣었다(twocol.pdf, slides.pdf, scan.pdf). 엔진은 처음 변환할 때 받으므로 '페이지 연 뒤 인터넷 꺼도 됨'이라고 쓰지 말 것(끊기면 errOffline 안내).
