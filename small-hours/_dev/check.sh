#!/bin/sh
# Small Hours 빠른 확인: 빌드가 최신인지, 파일이 다 있는지, id가 겹치지 않는지.
cd "$(dirname "$0")/.." || exit 1
fail=0
for f in index.html assets/app.js assets/watch.glb assets/draco/draco_decoder.wasm assets/draco/draco_wasm_wrapper.js assets/audio/night.mp3 assets/audio/moon.mp3 img/watch-front.webp img/night-1.webp img/night-2.webp img/night-3.webp img/night-4.webp img/night-5.webp img/night-6.webp img/tile-dial.webp img/tile-moon.webp img/tile-rotor.webp img/tile-balance.webp img/tile-crown.webp img/tile-side.webp img/dial-midnight.webp img/dial-dusk.webp img/dial-ink.webp og.jpg favicon.svg favicon.ico apple-touch-icon.png robots.txt 404.html; do
  [ -f "$f" ] || { echo "없음: $f"; fail=1; }
done
for f in _dev/src/*.js; do [ "$f" -nt assets/app.js ] && { echo "빌드가 낡음: $f 가 app.js보다 새것 (./_dev/build.sh)"; fail=1; }; done
dups=$(grep -o 'id="[^"]*"' index.html | sort | uniq -d); [ -n "$dups" ] && { echo "겹친 id: $dups"; fail=1; }
for id in lie hero c1 c2 c3 c4 c5 c6 c7 c8 gallery frame reel line moonLine1 moonLine2 alm tiles row questions launch; do grep -q "id=\"$id\"" index.html || { echo "id 없음: $id"; fail=1; }; done
grep -q 'Not a real brand\|not a real brand' index.html || { echo "가상 브랜드 표시가 없음"; fail=1; }
[ $fail = 0 ] && echo "통과"
exit $fail
