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
  pid=""
  if curl -s -o /dev/null --max-time 3 http://localhost:8443/assets/lc-core.js; then
    # 이미 이 폴더를 보여 주는 서버가 떠 있으면 그대로 쓴다(새로 띄우면 포트가 겹쳐 조용히 죽는다). 남이 띄운 서버는 끄지 않는다.
    echo "8443에 이미 떠 있는 서버를 씁니다"
  else
    node _dev/serve.mjs 8443 >/dev/null 2>&1 &
    pid=$!
    sleep 1
  fi
  python3 _dev/e2e.py ${2:+"$2"} || fail=1
  [ -n "$pid" ] && kill "$pid"
fi
[ "$fail" = 0 ] && echo "전부 통과" || echo "실패가 있어요"
exit $fail
