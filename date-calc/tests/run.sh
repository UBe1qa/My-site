#!/bin/sh
# 계산 로직 테스트. 맥에 기본으로 있는 JavaScriptCore(jsc)로 돌린다(node 필요 없음).
cd "$(dirname "$0")/.." || exit 1
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
"$JSC" tests/run.js && python3 tools/check_i18n.py
