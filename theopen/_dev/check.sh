#!/usr/bin/env bash
# 더오픈 빠른 확인 — 배포 전 기술 확인을 한 번에(동시에) 돌리고 결과만 짧게 보여 준다.
#   bash theopen/_dev/check.sh        고친 파일 확인 (320·390·1366 가로 넘침, 콘솔 오류, 신청서 문자·메일,
#                                     페이지 안 링크, 움직임·다시 재생, 동작 줄이기, 라이브러리 차단)
#   bash theopen/_dev/check.sh og     도면·색을 바꿨을 때: 공유 사진(og.png)을 다시 찍고 확인
#   bash theopen/_dev/check.sh live   푸시한 뒤: 실제 주소가 저장소 파일과 같아질 때까지 기다렸다 비교
# 이 폴더(_dev)는 .assetsignore로 사이트에 올라가지 않는다.
set -u
DEV="$(cd "$(dirname "$0")" && pwd)"; SITE="$(dirname "$DEV")"
URL="https://theopen.mysitebox.workers.dev"
if [ "${1:-}" = "live" ]; then
  for i in $(seq 1 24); do
    ok=1
    for f in index.html style.css app.js motion.js og.png; do
      curl -sfL "$URL/$f" -o /tmp/theopen-live-$$ 2>/dev/null && cmp -s /tmp/theopen-live-$$ "$SITE/$f" || { ok=0; break; }
    done
    if [ $ok = 1 ]; then
      code=$(curl -s -o /dev/null -w '%{http_code}' "$URL/_dev/check.sh")
      echo "LIVE 같음 (index·style·app·motion·og) · _dev 공개 여부: $code (404여야 함)"; rm -f /tmp/theopen-live-$$; exit 0
    fi
    sleep 15
  done
  echo "!! 6분 기다려도 실제 주소가 저장소와 다름"; rm -f /tmp/theopen-live-$$; exit 1
fi
if [ "${1:-}" = "og" ]; then python3 "$DEV/og.py" | tail -1; fi
T=$(mktemp -d)
for t in behave motion replay anchor; do timeout 400 python3 "$DEV/$t.py" "$SITE" > "$T/$t.txt" 2>&1 & done
wait
fail=0
for t in behave motion replay anchor; do
  if grep -q "!!\|실패\|Traceback\|Error" "$T/$t.txt" && ! grep -q "결과: 전부 통과" "$T/$t.txt"; then
    echo "== $t: 문제 있음"; grep -v "^  OK" "$T/$t.txt" | tail -25; fail=1
  elif [ $t = anchor ] && grep -q "!!" "$T/$t.txt"; then
    echo "== anchor: 문제 있음"; cat "$T/$t.txt"; fail=1
  else
    echo "== $t: 통과"
  fi
done
rm -rf "$T"
[ $fail = 0 ] && echo "전부 통과" || exit 1
