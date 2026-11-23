# MoveLens (movelens)

브라우저에서 Stockfish 19 WASM으로 Chess.com 경기와 PGN 기보를 무료 복기하는 웹앱(PC·안드로이드 PWA).
- 주소: https://movelens.mysitebox.workers.dev/ (Worker `movelens`, Actions 자동 배포 `.deploy-actions`).
- 설계·결정·남은 일: My-site-private `context/knowledge/4-내-사이트/movelens-사이트-구조.md`.

## 폴더
- 루트(`.`) — Cloudflare Workers에 바로 올라가는 빌드 결과물(`index.html`, `assets/`, `stockfish/`, `icon.svg`, `manifest.webmanifest`, `sw.js`). 손으로 고치지 않고 `_dev/build.sh`로 갱신한다.
- `_dev/` — React + TypeScript + Vite 소스.
  - `src/lib/stockfish.ts` — Stockfish 19 lite-single WASM(1.8MB, 싱글스레드라 COOP/COEP 헤더 불필요) Web Worker 래퍼 + 전체 경기 순차 분석.
  - `src/lib/eval.ts` — 승률(Win%) 변환, 수 분류(`book/best/excellent/good/inaccuracy/mistake/blunder`), 백/흑 정확도 계산, UCI→SAN 변환.
  - `src/lib/chesscom.ts` — Chess.com Public API(`api.chess.com/pub/player/{user}/games/...`) 연동.
  - `src/lib/pgn.ts` — `chess.js` PGN 파싱, `[%clk]` 남은 시간 추출, 오페라 게임 샘플.
  - `src/lib/share.ts` — 공유 URL(`?user=&game=` / `#pgn=`) 인코딩·디코딩.
  - `src/components/` — `ChessBoard.tsx`, `ChessPieces.tsx`(인라인 SVG), `EvalBar.tsx`, `EvalChart.tsx`, `GameSidebar.tsx`, `ReviewPanel.tsx`, `SettingsModal.tsx`.
  - `src/lib/__tests__/core.test.ts` — Vitest 단위 테스트 12개.

## 명령어
- 처음 1회: `cd movelens/_dev && npm ci`
- 테스트 + 빌드 + 루트 반영: `bash movelens/_dev/build.sh`
- 로컬 확인: `cd movelens/_dev && npm run dev`
- 배포: `My-site` `main`에 푸시하면 `.github/workflows/deploy-new-sites.yml`이 자동 배포한다.
