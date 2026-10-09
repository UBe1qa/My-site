#!/usr/bin/env bash
# 칸칸 확인 한 번에: count/_dev/check.sh [e2e [스크린샷 폴더]]
#   1) 로직 테스트(node tests/run.mjs)  2) 빌드 결과가 최신인지  3) 만든 HTML 정적 검사
#   e2e 를 붙이면 로컬 서버(8443)를 띄워 화면 확인(Playwright)까지 한다. 브라우저는 하나만 띄운다.
cd "$(dirname "$0")/.." || exit 1
export PYTHONDONTWRITEBYTECODE=1
fail=0
node tests/run.mjs --strict | tail -n 14 || fail=1
python3 _dev/build.py --check || fail=1
python3 _dev/check.py || fail=1
node --check assets/app.js && node --check assets/ads-config.js || fail=1
if [ "$1" = "e2e" ]; then
  node _dev/serve.mjs 8443 >/dev/null 2>&1 &
  pid=$!
  sleep 1
  python3 _dev/e2e.py ${2:+"$2"} || fail=1
  kill "$pid"
fi
[ "$fail" = 0 ] && echo "전부 통과" || echo "실패가 있어요"
exit $fail
