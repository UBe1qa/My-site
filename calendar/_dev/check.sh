#!/bin/sh
# 배포 전 확인: calendar/_dev/check.sh  (화면 확인까지 하려면 서버를 띄우고 `check.sh e2e`)
# 1) 로직 테스트  2) 빌드 결과가 최신인지  3) HTML 검사  4) (e2e) 실제로 눌러 보기
cd "$(dirname "$0")/.." || exit 1
fail=0
node tests/run.js | tail -1 || fail=1
node --check assets/app.js && node --check assets/sheet.js && node --check assets/core.js || fail=1
python3 _dev/build.py --check || fail=1
python3 _dev/check.py || fail=1
if [ "$1" = "e2e" ]; then python3 _dev/e2e.py || fail=1; fi
[ $fail -eq 0 ] && echo "전부 통과" || echo "실패 있음"
exit $fail
