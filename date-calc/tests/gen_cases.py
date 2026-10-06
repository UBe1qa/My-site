#!/usr/bin/env python3
"""dates.js와 따로 만든 기준값(baseline). 파이썬 datetime·dateutil·holidays로 계산해 cases.json에 쓴다.
같은 로직을 두 번 짠 게 아니라 다른 구현으로 답을 내서 비교하려는 것.
  /tmp/hv/bin/python date-calc/tests/gen_cases.py   (holidays 설치된 venv)
"""
import json, os, random, datetime as dt
from dateutil.relativedelta import relativedelta
import holidays

random.seed(20261003)
E0 = dt.date(1970, 1, 1)
def rd():
    return dt.date(2000, 1, 1) + dt.timedelta(days=random.randrange(0, 365 * 40))
def near(a, span=800):
    return a + dt.timedelta(days=random.randrange(-span, span))
# expand=False: 표 밖 연도를 몰래 채우지 않게(앱의 표도 2015–2035뿐)
KR = holidays.KR(years=range(2015, 2036), expand=False); US = holidays.US(years=range(2015, 2036), expand=False)

cases = {"between": [], "addMonths": [], "weekday": [], "isoWeek": [], "dayOfYear": [], "business": [], "addBusiness": [], "age": []}
# 말일·윤년 경계를 일부러 섞는다
edge = [dt.date(2024, 1, 31), dt.date(2024, 2, 29), dt.date(2023, 2, 28), dt.date(2025, 12, 31), dt.date(2000, 2, 29), dt.date(2026, 10, 3)]
for i in range(400):
    a = edge[i] if i < len(edge) else rd(); b = near(a)
    lo, hi = min(a, b), max(a, b)
    r = relativedelta(hi, lo)
    cases["between"].append([a.isoformat(), b.isoformat(), (b - a).days, r.years, r.months, r.days])
    k = random.randrange(-30, 31)
    cases["addMonths"].append([a.isoformat(), k, (a + relativedelta(months=k)).isoformat()])
    cases["weekday"].append([a.isoformat(), a.isoweekday() % 7])
    y, w, _ = a.isocalendar(); cases["isoWeek"].append([a.isoformat(), y, w])
    cases["dayOfYear"].append([a.isoformat(), a.timetuple().tm_yday])
def bd(a, b, table, inc):
    if b < a: a, b = b, a
    d = a if inc else a + dt.timedelta(days=1); n = 0
    while d <= b:
        if d.weekday() < 5 and d not in table: n += 1
        d += dt.timedelta(days=1)
    return n
for i in range(300):
    a = dt.date(2015, 1, 1) + dt.timedelta(days=random.randrange(0, 365 * 20))
    b = a + dt.timedelta(days=random.randrange(0, 120))
    c, tbl = random.choice([("KR", KR), ("US", US), ("none", {})])
    inc = random.random() < .5
    cases["business"].append([a.isoformat(), b.isoformat(), c, inc, bd(a, b, tbl, inc)])
    k = random.randrange(-40, 41); d = a; left = abs(k); step = dt.timedelta(days=-1 if k < 0 else 1)
    while left:
        d += step
        if d.weekday() < 5 and d not in tbl: left -= 1
    cases["addBusiness"].append([a.isoformat(), k, c, d.isoformat()])
def age_years(birth, today):
    # 2월 29일생은 평년엔 3월 1일에 한 살 (2026-10-06 운영자 결정). 나머지는 dateutil 그대로.
    if (birth.month, birth.day) != (2, 29): return relativedelta(today, birth).years
    leap = today.year % 4 == 0 and (today.year % 100 != 0 or today.year % 400 == 0)
    return today.year - birth.year - ((today.month, today.day) < ((2, 29) if leap else (3, 1)))
for i in range(200):
    birth = rd(); today = birth + dt.timedelta(days=random.randrange(0, 365 * 30))
    cases["age"].append([birth.isoformat(), today.isoformat(), age_years(birth, today)])
cases["age"] += [["2000-02-29", "2025-02-27", 24], ["2000-02-29", "2025-02-28", 24], ["2000-02-29", "2025-03-01", 25], ["2000-02-29", "2024-02-28", 23], ["2000-02-29", "2024-02-29", 24]]
out = os.path.join(os.path.dirname(__file__), "cases.json")
json.dump(cases, open(out, "w"), indent=0)
print({k: len(v) for k, v in cases.items()})
