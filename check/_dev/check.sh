#!/usr/bin/env bash
# 체크벤치 확인 한 번에: check/_dev/check.sh [e2e [스크린샷 폴더]]
#   1) 로직 테스트(node tests/run.mjs)  2) 빌드 결과가 최신인지  3) 만든 HTML 정적 검사  4) 화면 코드 문법
#   e2e 를 붙이면 로컬 서버(8444)를 띄워 화면 확인(Playwright)까지 한다. 브라우저는 한 번에 하나만 띄운다.
#   화면 확인에는 playwright 가 깔린 파이썬이 필요하다: PY=/경로/venv/bin/python check/_dev/check.sh e2e
cd "$(dirname "$0")/.." || exit 1
export PYTHONDONTWRITEBYTECODE=1
PY="${PY:-python3}"
fail=0
node tests/run.mjs --quiet | tail -n 3 || fail=1
python3 _dev/build.py --check || fail=1
python3 _dev/check.py || fail=1
for f in app media screen ads-config ck-keys ck-measure; do node --check "assets/$f.js" || fail=1; done
if [ "$1" = "e2e" ]; then
  pid=""
  if curl -s -o /dev/null --noproxy '*' --max-time 3 http://localhost:8444/assets/ck-keys.js; then
    echo "8444에 이미 떠 있는 서버를 씁니다"   # 남이 띄운 서버는 끄지 않는다
  else
    node _dev/serve.mjs 8444 >/dev/null 2>&1 &
    pid=$!
    sleep 1
  fi
  "$PY" _dev/e2e.py ${2:+"$2"} || fail=1
  [ -n "$pid" ] && kill "$pid"
fi
[ "$fail" = 0 ] && echo "전부 통과" || echo "실패가 있어요"
exit $fail
