#!/usr/bin/env bash
# 공평뽑기 확인을 한 번에: pick/_dev/check.sh [quick|sim]
#   (아무것도 안 적으면) 로직 테스트 → 빌드 → 정적 확인 → 로컬 서버를 띄워 브라우저 확인 전부
#   quick = 브라우저 확인 없이(로직 테스트 + 빌드 + 정적 확인)   sim = 사다리 시뮬레이션을 다시 돌려 저장된 숫자와 같은지(약 6분)
# 브라우저 확인에는 Playwright가 필요하다. 환경 변수: PW_CHROME(크롬 실행 파일), PICK_FONT(Pretendard .woff2), PICK_SHOTS(스크린샷 폴더), PICK_PORT(기본 8442)
set -u
cd "$(dirname "$0")/.."
PORT="${PICK_PORT:-8442}"
fail=0
step() { echo "== $1"; shift; "$@" || fail=1; }

step "로직 테스트" node tests/run.mjs
step "페이지 만들기" python3 -B _dev/build.py
step "정적 확인" python3 -B _dev/check.py
if [ "${1:-}" = "sim" ]; then
  cp _dev/sim_ladder.json /tmp/pick-sim-before.json
  step "사다리 시뮬레이션 다시 돌리기" node _dev/sim_ladder.mjs
  step "시뮬레이션 숫자가 그대로인지" cmp /tmp/pick-sim-before.json _dev/sim_ladder.json
fi
if [ "${1:-}" != "quick" ] && [ "${1:-}" != "sim" ]; then
  node _dev/serve.mjs "$PORT" >/dev/null 2>&1 &
  SERVER=$!
  sleep 1
  PICK_BASE="http://localhost:$PORT" step "브라우저 확인" python3 -B _dev/e2e.py
  kill "$SERVER" 2>/dev/null
fi
find . -name __pycache__ -type d -prune -exec rm -rf {} + 2>/dev/null
[ "$fail" = 0 ] && echo "전부 통과" || echo "실패한 확인이 있어요"
exit "$fail"
