#!/bin/sh
# 사용법: bash lumenlab/_dev/check.sh        배포 전 확인 (작업 공간에서 사이트 폴더를 8765로 띄움)
#         bash lumenlab/_dev/check.sh og     공유 사진 다시 찍기
#         bash lumenlab/_dev/check.sh live   푸시 뒤 실제 주소가 저장소 파일과 같아질 때까지 비교
cd "$(dirname "$0")/.." || exit 1
LIVE=https://lumenlab.mysitebox.workers.dev
if [ "$1" = live ]; then
  for i in $(seq 1 40); do
    bad=0
    for f in / /assets/site.css /assets/home.css /assets/site.js /owlight/privacy/ /owlight/support/ /setnote/sw.js /_redirects; do
      local=".$f"; case "$f" in */) local=".${f}index.html";; esac
      curl -sL "$LIVE$f" -o /tmp/lumen_live 2>/dev/null
      cmp -s /tmp/lumen_live "$local" || { bad=1; echo "아직 다름: $f"; }
    done
    code=$(curl -s -o /dev/null -w '%{http_code}' "$LIVE/_dev/check.py")
    [ "$bad" = 0 ] && [ "$code" = 404 ] && { echo "실제 주소 = 저장소, /_dev 404 확인"; exit 0; }
    sleep 15
  done
  echo "10분이 지나도 다름: GitHub Actions '새 사이트 자동 배포' 기록부터 보기"; exit 1
fi
python3 -m http.server 8765 >/dev/null 2>&1 & srv=$!
sleep 1
if [ "$1" = og ]; then python3 _dev/og.py; else python3 _dev/check.py; fi
st=$?; kill $srv; exit $st
