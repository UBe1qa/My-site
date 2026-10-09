#!/usr/bin/env python3
"""테스트 기준값(tests/cases.json)을 '다른 방법'으로 다시 만든다. core.js 를 쓰지 않는다.

- 요일·주차·달 격자·윤년: 파이썬 표준 라이브러리(datetime, calendar)
- 음력: korean_lunar_calendar(하루씩 읽은 값), python holidays 가 따로 가진 설날·부처님오신날·추석 날짜
- 한국 공휴일 2029~2049: python holidays(선거일 빼고). 2026~2028 은 _dev/ref/kasi.json(공식)으로 테스트가 직접 대조한다.
- 월·연 사실: datetime + kasi.json 공휴일 날짜

쓰는 법: /tmp/cv/bin/python calendar/_dev/gen_cases.py   (venv: holidays, korean_lunar_calendar)
"""
import calendar
import datetime as dt
import json
import os

import holidays
from korean_lunar_calendar import KoreanLunarCalendar

HERE = os.path.dirname(os.path.abspath(__file__))
REF = json.load(open(os.path.join(HERE, 'ref', 'kasi.json'), encoding='utf-8'))
DAY = dt.timedelta(days=1)


def days(a, b):
    d = a
    while d <= b:
        yield d
        d += DAY


def sun0(d):
    """0 = 일요일"""
    return (d.weekday() + 1) % 7


def us_week(d):
    """일요일 시작, 1월 1일이 든 주가 1주차. C 라이브러리 %U(첫 일요일 전은 0주)로 구한다."""
    u = int(d.strftime('%U'))
    return u if sun0(dt.date(d.year, 1, 1)) == 0 else u + 1


def main():
    out = {'note': '자동 생성: _dev/gen_cases.py (python %s, holidays %s)' % (
        '.'.join(map(str, __import__('sys').version_info[:3])), holidays.__version__)}

    # 요일: 1900-01-01 ~ 2100-12-31 전부
    a, b = dt.date(1900, 1, 1), dt.date(2100, 12, 31)
    out['weekdays'] = {'from': a.isoformat(), 'to': b.isoformat(), 's': ''.join(str(sun0(d)) for d in days(a, b))}
    out['leapYears'] = [y for y in range(1800, 2401) if calendar.isleap(y)]

    # 주차: 2015~2040 전부 + 1900~2100 연말연초
    a, b = dt.date(2015, 1, 1), dt.date(2040, 12, 31)
    iso_w, iso_y, us_w = [], [], []
    for d in days(a, b):
        iy, iw, _ = d.isocalendar()
        iso_w.append('%02d' % iw)
        iso_y.append(str(iy - d.year + 1))
        us_w.append('%02d' % us_week(d))
    out['weeks'] = {'from': a.isoformat(), 'to': b.isoformat(), 'isoWeek': ''.join(iso_w), 'isoYearOff': ''.join(iso_y), 'usWeek': ''.join(us_w)}
    edges = []
    for y in range(1900, 2101):
        for d in list(days(dt.date(y, 1, 1), dt.date(y, 1, 10))) + list(days(dt.date(y, 12, 22), dt.date(y, 12, 31))):
            iy, iw, _ = d.isocalendar()
            edges.append([d.year, d.month, d.day, iy, iw, us_week(d)])
    out['weekEdges'] = edges

    # 달 격자: calendar.monthdayscalendar (일요일 시작 0, 월요일 시작 1)
    grids = {}
    for start, first in ((0, 6), (1, 0)):
        cal = calendar.Calendar(firstweekday=first)
        for y in range(2020, 2036):
            for m in range(1, 13):
                grids['%d-%d-%d' % (start, y, m)] = cal.monthdayscalendar(y, m)
    out['grids'] = grids

    # 음력(라이브러리): 달 시작 전부 + 2024~2030 하루씩
    klc = KoreanLunarCalendar()
    months, cur = [], None
    d, end = dt.date(1912, 2, 1), dt.date(2050, 1, 23)
    prev = None
    while d <= end:
        assert klc.setSolarDate(d.year, d.month, d.day)
        if klc.lunarDay == 1:
            if prev:
                prev.append((d - dt.date.fromisoformat(prev[0])).days)
            prev = [d.isoformat(), klc.lunarYear, klc.lunarMonth, 1 if klc.isIntercalation else 0]
            months.append(prev)
        d += DAY
    months.pop()          # 마지막(2050년 1월)은 길이를 모른다
    months = [m for m in months if 1912 <= m[1] <= 2049]
    a, b = dt.date(2024, 1, 1), dt.date(2030, 12, 31)
    per_day = []
    for d in days(a, b):
        klc.setSolarDate(d.year, d.month, d.day)
        per_day.append('%02d%02d%d' % (klc.lunarMonth, klc.lunarDay, 1 if klc.isIntercalation else 0))
    out['lunarLib'] = {'months': months, 'daysFrom': a.isoformat(), 'daysTo': b.isoformat(), 'days': ''.join(per_day)}

    # 음력 기준 명절(python holidays 가 따로 가진 표): 설날·부처님오신날·추석
    anchors = []
    for y in range(1949, 2050):
        ko = holidays.KR(years=[y], language='ko', expand=False, observed=False)
        for d in sorted(ko):
            for n in ko[d].split('; '):
                n = n.replace(' (추정)', '')
                if n in ('설날', '민속의 날'):
                    anchors.append([y, 1, 1, d.isoformat()])
                elif n in ('부처님오신날', '석가탄신일'):
                    anchors.append([y, 4, 8, d.isoformat()])
                elif n == '추석':
                    anchors.append([y, 8, 15, d.isoformat()])
    out['lunarAnchors'] = anchors

    # 한국 공휴일(라이브러리, 선거일 빼고) 2029~2049
    kr = {}
    for y in range(2029, 2050):
        ko = holidays.KR(years=[y], language='ko', expand=False)
        kr[str(y)] = sorted(d.isoformat() for d in ko if d.year == y and '선거' not in ko[d])
    out['krLib'] = kr

    # 손 없는 날(라이브러리 음력 날짜 끝자리 9·0): 2026-10 ~ 2027-12
    son = {}
    for y, m in [(2026, 10), (2026, 11), (2026, 12)] + [(2027, m) for m in range(1, 13)]:
        ds = []
        for d in range(1, calendar.monthrange(y, m)[1] + 1):
            klc.setSolarDate(y, m, d)
            if klc.lunarDay % 10 in (9, 0):
                ds.append(d)
        son['%d-%d' % (y, m)] = ds
    out['son'] = son

    # 월·연 사실(datetime + 공식 공휴일 날짜)
    facts, years = {}, {}
    for y in (2026, 2027, 2028):
        hol = {dt.date(y, int(k[:2]), int(k[3:])) for k, _ in REF['kr_public_holidays'][str(y)]}
        for m in range(1, 13):
            n = calendar.monthrange(y, m)[1]
            ds = [dt.date(y, m, d) for d in range(1, n + 1)]
            wk = [d for d in ds if d.weekday() < 5]
            hw = [d for d in wk if d in hol]
            facts['%d-%d' % (y, m)] = {
                'days': n, 'weekdays': len(wk), 'saturdays': sum(d.weekday() == 5 for d in ds), 'sundays': sum(d.weekday() == 6 for d in ds),
                'holidays': sum(d in hol for d in ds), 'holidaysOnWeekdays': len(hw), 'workdays': len(wk) - len(hw),
                'firstWd': sun0(ds[0]), 'lastWd': sun0(ds[-1]),
                'isoWeeks': [ds[0].isocalendar()[1], ds[-1].isocalendar()[1]], 'usWeeks': [us_week(ds[0]), us_week(ds[-1])],
            }
        ds = list(days(dt.date(y, 1, 1), dt.date(y, 12, 31)))
        sun = [d for d in ds if d.weekday() == 6]
        sat = [d for d in ds if d.weekday() == 5]
        years[str(y)] = {
            'days': len(ds), 'leap': calendar.isleap(y), 'sundays': len(sun), 'saturdays': len(sat), 'holidayDates': len(hol),
            'holidaysOnSun': sorted(d.isoformat() for d in hol if d.weekday() == 6),
            'holidaysOnSat': sorted(d.isoformat() for d in hol if d.weekday() == 5),
            'publicHolidays': len(set(sun) | hol), 'daysOff': len(set(sun) | set(sat) | hol),
            'workdays': len(ds) - len(set(sun) | set(sat) | hol),
        }
    out['factsKR'] = facts
    out['yearsKR'] = years

    path = os.path.normpath(os.path.join(HERE, '..', 'tests', 'cases.json'))
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('기준값 → %s (%d바이트)' % (path, os.path.getsize(path)))


if __name__ == '__main__':
    main()
