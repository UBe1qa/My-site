#!/bin/sh
# Small Hours 빠른 확인: 빌드가 최신인지, 파일이 다 있는지, id가 겹치지 않는지.
cd "$(dirname "$0")/.." || exit 1
fail=0
for f in index.html assets/app.js assets/watch.glb assets/draco/draco_decoder.wasm assets/draco/draco_wasm_wrapper.js assets/audio/night.mp3 assets/audio/moon.mp3 img/watch-front.webp og.jpg favicon.svg favicon.ico apple-touch-icon.png robots.txt 404.html; do
  [ -f "$f" ] || { echo "없음: $f"; fail=1; }
done
for f in _dev/src/*.js; do [ "$f" -nt assets/app.js ] && { echo "빌드가 낡음: $f 가 app.js보다 새것 (./_dev/build.sh)"; fail=1; }; done
dups=$(grep -o 'id="[^"]*"' index.html | sort | uniq -d); [ -n "$dups" ] && { echo "겹친 id: $dups"; fail=1; }
grep -q 'Not a real brand\|not a real brand' index.html || { echo "가상 브랜드 표시가 없음"; fail=1; }
[ $fail = 0 ] && echo "통과"
exit $fail
