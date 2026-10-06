#!/bin/sh
# 배포 전에: 페이지 다시 만들기 → 계산 시험(엔진·모드·글 숫자) → HTML 검사
set -e
cd "$(dirname "$0")/.."
python3 tools/build.py
node tests/run.js
python3 _dev/check.py
