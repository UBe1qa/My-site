#!/usr/bin/env bash
# 떼고얼마 확인 한 번에: salary/_dev/check.sh [e2e [스크린샷 폴더]]
#   1) 로직 시험(node tests/run.mjs)  2) 빌드 결과가 최신인지  3) 만든 페이지의 숫자 검산(tests/site.mjs)  4) 만든 HTML 정적 검사
#   e2e 를 붙이면 로컬 서버(8446)를 띄워 화면 확인(Playwright)까지 한다. 브라우저는 하나만 띄운다.
#   일부러 틀리게 바꿔 보는 확인은 따로: node tests/mutate.mjs (1~2분)
cd "$(dirname "$0")/.." || exit 1
export PYTHONDONTWRITEBYTECODE=1
fail=0
node tests/run.mjs | tail -n 12 || fail=1
python3 -B _dev/build.py --check || fail=1
node tests/site.mjs | tail -n 12 || fail=1
python3 -B _dev/check.py || fail=1
for f in app.js pay-view.js pay-core.js pay-data.js ads-config.js gani-2026.js; do node --check "assets/$f" || fail=1; done
python3 -B _dev/gen_gani.py --check || fail=1
if [ "$1" = "e2e" ]; then
  pid=""
  if curl -s -o /dev/null --max-time 3 http://localhost:8446/assets/pay-core.js; then
    # 이미 이 폴더를 보여 주는 서버가 떠 있으면 그대로 쓴다. 남이 띄운 서버는 끄지 않는다.
    echo "8446에 이미 떠 있는 서버를 씁니다"
  else
    node _dev/serve.mjs 8446 >/dev/null 2>&1 &
    pid=$!
    sleep 1
  fi
  python3 -B _dev/e2e.py ${2:+"$2"} || fail=1
  [ -n "$pid" ] && kill "$pid"
fi
[ "$fail" = 0 ] && echo "전부 통과" || echo "실패가 있어요"
exit $fail
