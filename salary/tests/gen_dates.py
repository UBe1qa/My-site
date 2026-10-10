#!/usr/bin/env python3
"""날짜 기준값 만들기: python3 -B salary/tests/gen_dates.py  → tests/ref/dates.json

우리 로직(pay-core.js)과 다른 방법(파이썬 datetime, dateutil)으로 구한 값이다.
- service: 입사일·퇴직일 → 재직일수(datetime 날짜 빼기), 퇴직일 이전 3개월의 시작일·끝일·날짜 수
  (시작일 = dateutil.relativedelta(months=-3): 그 달에 같은 날이 없으면 말일)
- roll: 입사일에서 k개월이 꽉 찬 다음 날(같은 날이 없으면 다음 달 1일. datetime이 없는 날을 거절하는 것을 이용)
난수 씨앗이 고정이라 다시 돌려도 같은 파일이 나온다.
"""
import json, random, sys
from datetime import date, timedelta
from pathlib import Path
from dateutil.relativedelta import relativedelta

sys.dont_write_bytecode = True
OUT = Path(__file__).resolve().parent / 'ref' / 'dates.json'
rnd = random.Random(20261010)


def rand_date(y0, y1):
    a, b = date(y0, 1, 1).toordinal(), date(y1, 12, 31).toordinal()
    return date.fromordinal(rnd.randint(a, b))


def service(join, leave):
    start = leave + relativedelta(months=-3)
    return {'join': join.isoformat(), 'leave': leave.isoformat(), 'days': (leave - join).days,
            'start': start.isoformat(), 'end': (leave - timedelta(days=1)).isoformat(), 'pdays': (leave - start).days}


def roll(d, k):
    idx = d.year * 12 + d.month - 1 + k
    y, m = idx // 12, idx % 12 + 1
    try:
        return date(y, m, d.day)
    except ValueError:
        return date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)


pairs = [
    (date(2014, 10, 2), date(2017, 9, 16)),   # 고용노동부 예제: 재직 1,080일, 3개월 92일
    (date(2024, 3, 1), date(2025, 3, 1)), (date(2023, 3, 1), date(2024, 2, 29)), (date(2024, 2, 29), date(2025, 2, 28)),
    (date(2024, 2, 29), date(2025, 3, 1)), (date(2020, 1, 1), date(2026, 5, 31)), (date(2020, 1, 1), date(2026, 5, 30)),
    (date(2020, 1, 1), date(2026, 5, 29)), (date(2020, 1, 1), date(2026, 5, 1)), (date(2020, 1, 1), date(2024, 5, 31)),
    (date(2020, 1, 1), date(2024, 5, 29)), (date(2019, 7, 1), date(2026, 3, 1)), (date(2019, 7, 1), date(2024, 3, 1)),
    (date(2019, 7, 1), date(2026, 12, 1)), (date(2019, 7, 1), date(2026, 1, 1)), (date(2025, 10, 10), date(2026, 10, 10)),
    (date(2025, 10, 11), date(2026, 10, 10)), (date(1999, 12, 31), date(2026, 12, 31)),
]
for _ in range(400):
    j = rand_date(1990, 2026)
    l = j + timedelta(days=rnd.randint(1, 12000))
    if l.year <= 2099:
        pairs.append((j, l))
# 3개월 날짜 수가 89~92일 전부 나오는지 볼 수 있게 한 해의 모든 날을 퇴직일로
for y in (2026, 2028):
    d = date(y, 1, 1)
    while d.year == y:
        pairs.append((date(2015, 6, 15), d))
        d += timedelta(days=1)

joins = [date(2024, 1, 31), date(2024, 2, 29), date(2023, 1, 29), date(2023, 1, 30), date(2023, 1, 31), date(2025, 3, 31),
         date(2025, 8, 31), date(2025, 10, 31), date(2025, 12, 31), date(2026, 1, 15), date(2020, 2, 29), date(2026, 10, 10), date(2000, 2, 29)]
joins += [rand_date(1995, 2026) for _ in range(60)]
rolls = []
for j in joins:
    rolls.append({'join': j.isoformat(), 'months': [roll(j, k).isoformat() for k in range(1, 13)],
                  'years': [roll(j, 12 * n).isoformat() for n in range(1, 31)]})

data = {'_': '파이썬 datetime·dateutil로 구한 날짜 기준값(gen_dates.py). 손으로 고치지 않는다.',
        'service': [service(j, l) for j, l in pairs], 'roll': rolls}
OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('},{', '},\n{') + '\n', encoding='utf-8')
ps = sorted({s['pdays'] for s in data['service']})
print(f"wrote {OUT.name}: service {len(data['service'])}, roll {len(rolls)}, 3개월 날짜 수 범위 {ps}")
