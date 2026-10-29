#!/bin/sh
# 사용법: bash lumenlab/_dev/check.sh        배포 전 확인 (작업 공간에서 사이트 폴더를 8765로 띄움)
#         bash lumenlab/_dev/check.sh og     공유 사진 다시 찍기
#         bash lumenlab/_dev/check.sh live   푸시 뒤 실제 주소가 저장소 파일과 같아질 때까지 비교
cd "$(dirname "$0")/.." || exit 1
LIVE=https://lumenlab.mysitebox.workers.dev
if [ "$1" = live ]; then
  for i in $(seq 1 40); do
    bad=0
    for f in / /works/daycount/ /en/works/chickrescue/ /guides/ /en/guides/qr/wifi-qr-code/ /guides/rss.xml /assets/guides.css /assets/site.css /assets/landing.css /assets/store.css /assets/site.js /assets/landing.js /assets/store.js /owlight/privacy/ /owlight/support/ /setnote/sw.js; do
      local=".$f"; case "$f" in */) local=".${f}index.html";; esac
      curl -sL "$LIVE$f" -o /tmp/lumen_live 2>/dev/null
      cmp -s /tmp/lumen_live "$local" || { bad=1; echo "아직 다름: $f"; }
    done
    code=$(curl -s -o /dev/null -w '%{http_code}' "$LIVE/_dev/check.py")
    # 같아지면 가이드 이사(도구 사이트 옛 주소 301·사이트맵)도: 도구 사이트는 따로 배포되니 5분까지 기다림
    [ "$bad" = 0 ] && [ "$code" = 404 ] && { echo "실제 주소 = 저장소, /_dev 404 확인"; for j in $(seq 1 20); do python3 _dev/check_guides_live.py && exit 0; sleep 15; done; echo "가이드 옛 주소가 5분이 지나도 다름: 도구 폴더 배포 기록 보기"; exit 1; }
    sleep 15
  done
  echo "10분이 지나도 다름: GitHub Actions '새 사이트 자동 배포' 기록부터 보기"; exit 1
fi
python3 -m http.server 8765 >/dev/null 2>&1 & srv=$!
sleep 1
if [ "$1" = og ]; then python3 _dev/og.py; else python3 _dev/check.py; fi
st=$?; kill $srv; exit $st
