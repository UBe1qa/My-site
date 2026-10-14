#!/usr/bin/env bash
# 한바퀴 확인 한 번에: time/_dev/check.sh [e2e [스크린샷 폴더]] | og | live
#   1) 로직 시험(node tests/run.mjs)  2) 빌드 결과가 최신인지  3) 정적 검사  (+ e2e: 로컬 서버 8471 띄워 화면 확인)
cd "$(dirname "$0")/.." || exit 1
export PYTHONDONTWRITEBYTECODE=1
if [ "$1" = "live" ]; then
  # 실제 주소가 저장소와 같아질 때까지 15초마다 비교(최대 10분), 개발 파일은 404여야 한다
  for i in $(seq 1 40); do
    diffs=0
    for f in index.html ko/index.html assets/app.js assets/core.js assets/style.css sitemap.xml; do
      curl -s -L "https://time.lumenlab.page/$f" | cmp -s - "$f" || diffs=$((diffs+1))
    done
    [ $diffs = 0 ] && break; sleep 15
  done
  [ $diffs = 0 ] && echo "실제 주소 = 저장소" || echo "아직 다름($diffs)"
  for f in _dev/build.py tests/run.mjs CLAUDE.md wrangler.jsonc; do echo "$f $(curl -s -o /dev/null -w '%{http_code}' https://time.lumenlab.page/$f)"; done
  echo "없는 주소 $(curl -s -o /dev/null -w '%{http_code}' https://time.lumenlab.page/nope/)"
  exit 0
fi
if [ "$1" = "og" ]; then python3 _dev/og.py; exit $?; fi
fail=0
node tests/run.mjs | tail -n 12 || fail=1
python3 _dev/build.py --check || fail=1
python3 _dev/check.py || fail=1
node --check assets/app.js && node --check assets/core.js && node --check assets/tz.js && node --check assets/ads-config.js || fail=1
if [ "$1" = "e2e" ]; then
  pid=""
  if curl -s -o /dev/null --max-time 3 http://localhost:8471/assets/core.js; then echo "8471에 떠 있는 서버를 씁니다"
  else node _dev/serve.mjs 8471 >/dev/null 2>&1 & pid=$!; sleep 1; fi
  python3 _dev/e2e.py ${2:+"$2"} || fail=1
  [ -n "$pid" ] && kill "$pid"
fi
[ "$fail" = 0 ] && echo "전부 통과" || echo "실패가 있어요"
exit $fail
