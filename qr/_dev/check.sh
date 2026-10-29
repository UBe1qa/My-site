#!/usr/bin/env bash
# 오래QR 확인 한 번에: qr/_dev/check.sh            → 빌드 최신·정적 검사·JS 문법·로직 시험(빠른 묶음)
#                     qr/_dev/check.sh full       → + 로직 시험 전부(디자인 판독·PDF/EPS/ZIP) + 화면 확인 전부(e2e, 10분쯤)
#                     qr/_dev/check.sh e2e [폴더]  → 화면 확인만(스크린샷 폴더를 주면 거기에)
#                     qr/_dev/check.sh live       → 배포 뒤 실제 주소가 저장소 파일과 같은지, 옛 가이드 주소가 루트로 301 인지(지휘자가 돌림. 광고 코드가 있는 페이지는 curl 로만 받는다)
# 로컬 서버(8471)가 이미 떠 있으면 그대로 쓰고, 없으면 띄웠다가 끈다(남이 띄운 서버는 끄지 않는다).
cd "$(dirname "$0")/.." || exit 1
export PYTHONDONTWRITEBYTECODE=1
fail=0
SITE=https://qr.lumenlab.page

if [ "$1" = "live" ]; then
  # 1) 페이지마다 실제 주소 = 저장소 파일(15초마다, 최대 10분)
  pages=$(python3 -c "import re;print(' '.join(re.findall(r'<loc>https://qr.lumenlab.page(.*?)</loc>', open('sitemap.xml').read())))")
  for i in $(seq 1 40); do
    diff=0
    for p in $pages; do
      f="${p#/}index.html"
      if ! curl -sL --max-time 20 "$SITE$p" | cmp -s - "$f"; then diff=1; echo "  아직 다름: $p"; break; fi
    done
    for f in assets/app.js assets/style.css sitemap.xml robots.txt ads.txt; do
      curl -sL --max-time 20 "$SITE/$f" | cmp -s - "$f" || { diff=1; echo "  아직 다름: /$f"; break; }
    done
    [ $diff = 0 ] && { echo "실제 주소 = 저장소"; break; }
    [ $i = 40 ] && { echo "10분이 지나도 다름(Cloudflare 빌드 상태를 보세요)"; fail=1; }
    sleep 15
  done
  # 2) 없는 주소는 진짜 404, 개발 파일은 404, X-Robots-Tag 없음, _headers 적용
  for p in /nope/ /ko/nope/ /_dev/build.py /tests/test_logic.py /CLAUDE.md /wrangler.jsonc /.assetsignore; do
    c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$SITE$p"); [ "$c" = 404 ] || { echo "  실패 $p → $c (404 여야 함)"; fail=1; }
  done
  curl -sI --max-time 20 "$SITE/" | grep -qi '^x-robots-tag' && { echo "  실패 X-Robots-Tag 가 붙어 있음"; fail=1; }
  curl -sI --max-time 20 "$SITE/" | grep -qi 'x-content-type-options: nosniff' || { echo "  실패 nosniff 머리말 없음"; fail=1; }
  curl -sI --max-time 20 "$SITE/assets/app.js" | grep -qi 'max-age=31536000' || { echo "  실패 JS 오래 저장 머리말 없음"; fail=1; }
  # 3) 가이드는 2026-10-29 루멘랩(lumenlab.page/guides/qr/)으로 옮겼다: 옛 주소는 파일 대신 301 로 새 주소(목록·rss + 저장소의 가이드 글마다)
  moved() {
    # 마지막 응답의 상태·Location(프록시를 거치면 맨 앞에 'HTTP/1.1 200 Connection Established' 묶음이 먼저 온다)
    got=$(curl -s -o /dev/null -D - --max-time 20 "$SITE$1" | tr -d '\r' | awk '/^HTTP\// { c = $2; l = "" } tolower($1) == "location:" { l = $2 } END { print c, l }')
    [ "$got" = "301 $2" ] || { echo "  실패 $1 → $got (301 $2 여야 함)"; fail=1; }
  }
  moved /guide/ https://lumenlab.page/en/guides/#qr
  moved /ko/guide/ https://lumenlab.page/guides/#qr
  moved /rss.xml https://lumenlab.page/guides/rss.xml
  for f in guide/*/index.html ko/guide/*/index.html; do
    [ -f "$f" ] || continue
    s=${f%/index.html}; s=${s##*/}
    case "$f" in
      ko/*) moved "/ko/guide/$s/" "https://lumenlab.page/guides/qr/$s/" ;;
      *) moved "/guide/$s/" "https://lumenlab.page/en/guides/qr/$s/" ;;
    esac
  done
  [ $fail = 0 ] && echo "live 전부 통과" || echo "live 실패가 있어요"
  exit $fail
fi

python3 _dev/build.py --check || fail=1
python3 _dev/check.py || fail=1
for f in assets/*.js; do node --check "$f" || fail=1; done
if [ "$1" = "full" ]; then python3 tests/test_logic.py || fail=1; else python3 tests/test_logic.py encoder formats phase2 scanner presets names || fail=1; fi

if [ "$1" = "e2e" ] || [ "$1" = "full" ]; then
  pid=""
  if curl -s -o /dev/null --max-time 3 http://localhost:8471/assets/qr.js; then
    echo "8471에 이미 떠 있는 서버를 씁니다"
  else
    node _dev/serve.mjs 8471 >/dev/null 2>&1 &
    pid=$!
    sleep 1
  fi
  # 10분을 넘지 않게 나눠 돌린다
  for s in 1 2 3 4 "5,6" "7,8,9" "10,11" 13 14 12; do
    SEC=$s python3 _dev/e2e.py ${2:+"$2"} | tail -n 6 || fail=1
    [ "${PIPESTATUS[0]}" = 0 ] || fail=1
  done
  [ -n "$pid" ] && kill "$pid"
fi
[ "$fail" = 0 ] && echo "전부 통과" || echo "실패가 있어요"
exit $fail
