#!/usr/bin/env python3
"""날짜 기준값 만들기: python3 -B salary/tests/gen_dates.py  → tests/ref/dates.json

우리 로직(pay-core.js)과 다른 방법(파이썬 datetime·calendar)으로 구한 값이다.
- service: 입사일·퇴직일 → 재직일수(datetime 날짜 빼기), 퇴직일 이전 3개월의 시작일·끝일·날짜 수.
  3개월을 세는 법은 고용노동부 '퇴직금 계산' 화면의 스크립트(retire_cal.js 의 setDate)를 **가지 구조 그대로** 옮긴 것이다(moel_period):
  1일 퇴직이면 앞의 석 달, 5월 29일(평년)·30일·31일 퇴직이면 3월 1일부터, 그 밖에는 [3개월 전 달의 그 날(없으면 말일 − (퇴직 달 말일 − 퇴직일))부터 말일] + 가운데 두 달 + [퇴직 달 1일 ~ 퇴직일 전날].
  우리 로직은 '3개월 전 같은 날, 없으면 말일, 2월이면 3월 1일' 한 줄 계산이라 짜임이 다르다. 실물 화면 값(ref/moel-live.json)과도 따로 대조한다.
- roll: 입사일에서 k개월이 꽉 찬 다음 날(같은 날이 없으면 다음 달 1일. datetime이 없는 날을 거절하는 것을 이용)
난수 씨앗이 고정이라 다시 돌려도 같은 파일이 나온다.
"""
import calendar, json, random, sys
from datetime import date, timedelta
from pathlib import Path

sys.dont_write_bytecode = True
OUT = Path(__file__).resolve().parent / 'ref' / 'dates.json'
rnd = random.Random(20261010)


def rand_date(y0, y1):
    a, b = date(y0, 1, 1).toordinal(), date(y1, 12, 31).toordinal()
    return date.fromordinal(rnd.randint(a, b))


def maxday(y, m):
    return calendar.monthrange(y, m)[1]


def moel_period(leave):
    """고용노동부 retire_cal.js setDate() 의 기간 계산을 가지 구조 그대로: [(연, 월, 시작일, 끝일), …]"""
    eyear, emon, eday = leave.year, leave.month, leave.day
    special = emon == 5 and ((eday == 29 and not calendar.isleap(eyear)) or eday in (30, 31))
    if eday - 1 == 0:          # 1일이라면: 앞의 석 달
        emon, idx = emon - 1, 3
    else:
        idx = 4
    if special:                 # 5.29(평년), 5.30, 5.31: 2월을 계산하지 않는다
        idx = 3
    rows = []
    for i in range(1, idx + 1):
        if emon - idx + i <= 0:
            yy, mm = eyear - 1, 12 + (emon - idx + i)
        else:
            yy, mm = eyear, emon - idx + i
        if idx == 3:
            if special and i == 3:
                dd, dd2 = 1, eday - 1
            else:
                dd, dd2 = 1, maxday(yy, mm)
        else:
            if i == 1:
                dd = maxday(yy, mm) - (maxday(eyear, emon) - eday) if eday > maxday(yy, mm) else eday
                dd2 = maxday(yy, mm)
            elif i in (2, 3):
                dd, dd2 = 1, maxday(yy, mm)
            else:
                dd, dd2 = 1, eday - 1
        rows.append((yy, mm, dd, dd2))
    return rows


def service(join, leave):
    rows = moel_period(leave)
    start = date(rows[0][0], rows[0][1], rows[0][2])
    pdays = sum(dd2 - dd + 1 for _, _, dd, dd2 in rows)
    assert pdays == (leave - start).days, (leave, rows)          # 줄들이 끊기지 않고 이어진다
    return {'join': join.isoformat(), 'leave': leave.isoformat(), 'days': (leave - join).days,
            'start': start.isoformat(), 'end': (leave - timedelta(days=1)).isoformat(), 'pdays': pdays}


def roll(d, k):
    idx = d.year * 12 + d.month - 1 + k
    y, m = idx // 12, idx % 12 + 1
    try:
        return date(y, m, d.day)
    except ValueError:
        return date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)


def main():
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
    for y in (2025, 2026, 2027, 2028):
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

    data = {'_': '파이썬 datetime·calendar로 구한 날짜 기준값(gen_dates.py). 퇴직 전 3개월은 고용노동부 계산기 스크립트의 가지 구조를 옮겨 셌다. 손으로 고치지 않는다.',
            'service': [service(j, l) for j, l in pairs], 'roll': rolls}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('},{', '},\n{') + '\n', encoding='utf-8')
    ps = sorted({s['pdays'] for s in data['service']})
    print(f"wrote {OUT.name}: service {len(data['service'])}, roll {len(rolls)}, 3개월 날짜 수 범위 {ps}")


if __name__ == '__main__':
    main()
