#!/bin/bash
# 배포 전 확인: bash _dev/check.sh  (og 다시 찍기: bash _dev/check.sh og, 배포 뒤 비교: bash _dev/check.sh live)
cd "$(dirname "$0")/.."
if ! curl -s -o /dev/null http://127.0.0.1:8765/; then (python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &); sleep 1; fi
case "$1" in
  og) python3 _dev/og.py ;;
  live)
    for f in index.html en/index.html assets/site.css assets/demo.js assets/site.js; do
      for i in $(seq 1 40); do
        if curl -sL "https://chick-rescue.lumenlab.page/$f" | cmp -s - "$f"; then echo "같음 $f"; break; fi
        sleep 15
      done
    done
    for p in _dev/build.py wrangler.jsonc .deploy-actions; do echo "$(curl -s -o /dev/null -w '%{http_code}' https://chick-rescue.lumenlab.page/$p) /$p (404여야 함)"; done ;;
  *) python3 _dev/check.py & a=$!; python3 _dev/play_test.py & b=$!; wait $a; r1=$?; wait $b; r2=$?; exit $((r1 + r2)) ;;
esac
