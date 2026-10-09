#!/usr/bin/env python3
"""음력 표와 절기 표를 '천문 계산'으로 따로 구해 tests/astro.json 에 적는다(다른 방법으로 구한 기준값).

- 합삭(달이 해와 같은 방향에 오는 순간)과 중기(해의 황경이 30도 배수인 순간)를 PyEphem으로 구하고,
  한국 표준시(UTC+9) 날짜로 바꿔 '합삭이 든 날 = 음력 1일', '동지가 든 달 = 11월', '중기 없는 달 = 윤달' 규칙으로 달을 매긴다.
- 표(korean_lunar_calendar)나 천문연 자료를 전혀 쓰지 않는다. 그래서 대조할 수 있다.
- 자정 가까이(몇 분 안)에 일어나는 합삭·중기는 계산 정밀도 때문에 하루 어긋날 수 있다 → near_midnight 에 따로 적는다.

쓰는 법: /tmp/cv/bin/pip install ephem && /tmp/cv/bin/python calendar/_dev/verify_astro.py
"""
import datetime as dt
import json
import math
import os

import ephem

HERE = os.path.dirname(os.path.abspath(__file__))
KST = dt.timedelta(hours=9)
Y0, Y1 = 1900, 2049          # 음력 해 범위. data.js 는 이 가운데 1912~2049 만 쓴다(1900~1911 은 표준시가 달라 8쌍이 하루 어긋남)
TERM_NAMES = ['소한', '대한', '입춘', '우수', '경칩', '춘분', '청명', '곡우', '입하', '소만', '망종', '하지',
              '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지']


def kst(t):
    """ephem 날짜(UTC) → 한국 표준시 datetime"""
    return ephem.Date(t).datetime() + KST


def sun_lon(t):
    """그 순간의 겉보기 황경(도)"""
    s = ephem.Sun(t)
    equ = ephem.Equatorial(s.ra, s.dec, epoch=t)
    return math.degrees(ephem.Ecliptic(equ).lon) % 360.0


def when_lon(target, guess):
    """황경이 target 도가 되는 순간(guess 근처). 이분법."""
    def f(t):
        return (sun_lon(t) - target + 180.0) % 360.0 - 180.0
    a, b = guess - 6, guess + 6
    fa, fb = f(a), f(b)
    assert fa < 0 < fb, (target, ephem.Date(guess), fa, fb)
    for _ in range(60):
        m = (a + b) / 2
        if f(m) < 0:
            a = m
        else:
            b = m
    return ephem.Date((a + b) / 2)


def term_moment(year, idx):
    """year 년의 idx 번째 절기(소한=0 … 동지=23) 순간"""
    lon = (285 + 15 * idx) % 360
    approx = ephem.Date(dt.datetime(year, 1, 6) + dt.timedelta(days=15.2184 * idx))
    return when_lon(lon, approx)


def main():
    # 합삭
    moons = []
    t = ephem.Date(dt.datetime(Y0 - 1, 10, 1))
    end = ephem.Date(dt.datetime(Y1 + 2, 2, 1))
    while t < end:
        t = ephem.next_new_moon(t)
        moons.append(kst(t))
        t = ephem.Date(t + 1)
    starts = [m.date() for m in moons]
    near = [m.strftime('%Y-%m-%d %H:%M:%S') for m in moons
            if m.hour * 60 + m.minute < 10 or m.hour * 60 + m.minute >= 24 * 60 - 10]

    # 중기(짝수 번호 절기가 아니라: 대한·우수·춘분 … 동지 = idx 홀수)
    zhongqi = {}   # 날짜 → 황경
    solstice = {}  # 해 → 동지 날짜
    near_terms = []
    for y in range(Y0 - 1, Y1 + 2):
        for idx in range(1, 24, 2):
            m = kst(term_moment(y, idx))
            zhongqi[m.date()] = (285 + 15 * idx) % 360
            if idx == 23:
                solstice[y] = m.date()
            if m.hour * 60 + m.minute < 10 or m.hour * 60 + m.minute >= 24 * 60 - 10:
                near_terms.append(m.strftime('%Y-%m-%d %H:%M:%S'))

    def month_index(day):
        """day 가 든 음력 달의 번호(starts 의 위치)"""
        lo = 0
        for i, s in enumerate(starts):
            if s <= day:
                lo = i
            else:
                break
        return lo

    def has_zhongqi(i):
        a, b = starts[i], starts[i + 1]
        return any(a <= d < b for d in zhongqi)

    label = {}  # starts 위치 → (음력 해, 달, 윤달)
    for y in range(Y0 - 1, Y1 + 1):
        i11, j11 = month_index(solstice[y]), month_index(solstice[y + 1])
        n = j11 - i11
        assert n in (12, 13), (y, n)
        num, leap_used = 11, False
        label[i11] = (y, 11, False)
        for i in range(i11 + 1, j11):
            if n == 13 and not leap_used and not has_zhongqi(i):
                leap_used = True
                label[i] = (label[i - 1][0], label[i - 1][1], True)
                continue
            num = num % 12 + 1
            ly = y if num >= 11 else y + 1
            label[i] = (ly, num, False)
    months = []
    for i in sorted(label):
        ly, m, leap = label[i]
        if Y0 <= ly <= Y1:
            months.append([starts[i].isoformat(), ly, m, 1 if leap else 0, (starts[i + 1] - starts[i]).days])

    terms = {}
    for y in range(2025, 2029):
        rows = []
        for idx in range(24):
            m = kst(term_moment(y, idx))
            m = (m + dt.timedelta(seconds=30)).replace(second=0, microsecond=0)   # 분 단위로 반올림
            rows.append([m.month, m.day, m.hour, m.minute])
        terms[str(y)] = rows

    out = {
        'note': 'PyEphem %s 로 구한 합삭·중기(한국 표준시 UTC+9). 자동 생성: _dev/verify_astro.py' % ephem.__version__,
        'range': [Y0, Y1], 'months': months, 'near_midnight_new_moons': near, 'near_midnight_terms': near_terms,
        'terms': terms,
    }
    path = os.path.normpath(os.path.join(HERE, '..', 'tests', 'astro.json'))
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('음력 달 %d개, 자정 가까운 합삭 %d개 → %s' % (len(months), len(near), path))


if __name__ == '__main__':
    main()
