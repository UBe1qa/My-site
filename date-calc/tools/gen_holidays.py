#!/usr/bin/env python3
"""공휴일 표(assets/holidays.js)를 다시 만든다.

쓰는 법 (아무 폴더에서):
  python3 -m venv /tmp/hv && /tmp/hv/bin/pip install holidays && /tmp/hv/bin/python date-calc/tools/gen_holidays.py
"""
import json, os, holidays

YEARS = range(2015, 2036)
US_KO = {
    "New Year's Day": "새해 첫날", "Martin Luther King Jr. Day": "마틴 루서 킹 데이",
    "Washington's Birthday": "대통령의 날", "Memorial Day": "메모리얼 데이",
    "Juneteenth National Independence Day": "준틴스", "Independence Day": "독립기념일",
    "Labor Day": "노동절", "Columbus Day": "콜럼버스 데이", "Veterans Day": "재향군인의 날",
    "Thanksgiving Day": "추수감사절", "Christmas Day": "크리스마스",
}

kr_ko = holidays.KR(years=YEARS, language="ko")
kr_en = holidays.KR(years=YEARS, language="en_US")
# 라이브러리 한국어 이름 중 어색한 것만 바꾼다
KO_FIX = {"신정연휴": "신정"}
kr = {d.isoformat(): ["; ".join(KO_FIX.get(n, n) for n in kr_ko[d].split("; ")), kr_en[d]] for d in sorted(kr_en)}

us_en = holidays.US(years=YEARS, language="en_US")
us = {}
for d in sorted(us_en):
    en = us_en[d]
    parts = []
    for name in en.split("; "):
        observed = name.endswith(" (observed)")
        base = name.replace(" (observed)", "")
        if base not in US_KO:
            raise SystemExit("한국어 이름이 없는 미국 공휴일: " + base)
        parts.append(US_KO[base] + (" 대체 휴일" if observed else ""))
    us[d.isoformat()] = ["; ".join(parts), en]

head = (
    "// 공휴일 표 (%d–%d). 자동 생성: python holidays %s, tools/gen_holidays.py\n"
    "// 손으로 고치지 말고 스크립트로 다시 만들어요. 나중에 정부가 정하는 임시공휴일은 미리 들어 있지 않아요.\n"
    "// 형식: 'YYYY-MM-DD': [한국어 이름, 영어 이름]\n"
) % (YEARS[0], YEARS[-1], holidays.__version__)
body = "var DC_HOLIDAYS = {\n  years: [%d, %d],\n  KR: %s,\n  US: %s\n};\n" % (
    YEARS[0], YEARS[-1], json.dumps(kr, ensure_ascii=False), json.dumps(us, ensure_ascii=False))
out = os.path.join(os.path.dirname(__file__), "..", "assets", "holidays.js")
open(out, "w", encoding="utf-8").write(head + body)
print("KR %d개, US %d개 → %s" % (len(kr), len(us), os.path.normpath(out)))
