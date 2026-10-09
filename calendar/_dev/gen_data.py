#!/usr/bin/env python3
"""달력 데이터(assets/data.js)를 다시 만든다. 손으로 고치지 않는다.

쓰는 법(아무 폴더에서, venv에 holidays·korean_lunar_calendar 설치):
  python3 -m venv /tmp/cv && /tmp/cv/bin/pip install holidays korean_lunar_calendar
  /tmp/cv/bin/python calendar/_dev/gen_data.py

들어가는 것
- lunar : 음력 해마다 [음 1월 1일의 양력 월일, 윤달(없으면 0), 달 크기 비트] (korean_lunar_calendar, 한국천문연구원 기준 표)
- terms : 24절기 2025~2028 (_dev/ref/kasi.json = 한국천문연구원 달력자료, 계산값을 지어내지 않는다)
- days  : 정월대보름·한식·단오·칠석·삼복 2025~2028 (같은 자료)
- krFixed : 규칙 엔진을 쓰지 않는 해(2025)의 한국 공휴일 (python holidays, expand=False)
- krExtra : 규칙으로 못 구하는 날(선거일·임시공휴일) 가운데 확정된 것만
- us    : 미국 연방 공휴일 표 (python holidays US, 관측일 포함)
"""
import datetime as dt
import json
import os

import holidays
from korean_lunar_calendar import KoreanLunarCalendar

HERE = os.path.dirname(os.path.abspath(__file__))
REF = json.load(open(os.path.join(HERE, 'ref', 'kasi.json'), encoding='utf-8'))

LUNAR_FIRST, LUNAR_LAST = 1912, 2049   # 1912~: 천문 계산(verify_astro.py, UTC+9)과 모든 달이 맞는 범위. 끝은 라이브러리 표가 음력 2050-11-18까지라 2049
KR_FIXED_YEARS = [2025]
US_YEARS = range(2025, 2031)
TERM_NAMES = ['소한', '대한', '입춘', '우수', '경칩', '춘분', '청명', '곡우', '입하', '소만', '망종', '하지',
              '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지']
OTHER_NAMES = ['정월대보름', '한식', '단오', '초복', '중복', '칠석', '말복']

# 확정된 선거일·임시공휴일만. 출처: _dev/ref/kasi.json (우주항공청 월력요항·천문연 달력자료)
KR_EXTRA = {
    '2026-06-03': ['전국동시지방선거', 'Local Election Day', 'election'],
    '2028-04-12': ['국회의원선거일', 'National Assembly Election Day', 'election'],
}

KR_FIX_NAMES = {  # python holidays 이름 → 우리 표의 이름(천문연 표기)
    '신정연휴': '1월 1일', '설날 다음날': '설날 다음 날', '추석 다음날': '추석 다음 날', '삼일절': '3·1절',
    '대통령 선거일': '대통령선거일', '국회의원 선거일': '국회의원선거일',
}
US_KO = {
    "New Year's Day": '새해 첫날', 'Martin Luther King Jr. Day': '마틴 루서 킹 데이',
    "Washington's Birthday": '대통령의 날', 'Memorial Day': '메모리얼 데이',
    'Juneteenth National Independence Day': '준틴스', 'Independence Day': '독립기념일',
    'Labor Day': '노동절', 'Columbus Day': '콜럼버스 데이', 'Veterans Day': '재향군인의 날',
    'Thanksgiving Day': '추수감사절', 'Christmas Day': '크리스마스',
}


def lunar_table():
    """음력 해마다 달 목록을 라이브러리에서 하루씩 읽어 만든다."""
    cal = KoreanLunarCalendar()
    months = {}  # 음력 해 → [(달, 윤달 여부, 양력 1일)]
    d = dt.date(LUNAR_FIRST, 1, 1)
    end = dt.date(LUNAR_LAST + 1, 3, 1)
    while d <= end:
        assert cal.setSolarDate(d.year, d.month, d.day), d
        if cal.lunarDay == 1:
            months.setdefault(cal.lunarYear, []).append((cal.lunarMonth, bool(cal.isIntercalation), d))
        d += dt.timedelta(days=1)
    rows = []
    for y in range(LUNAR_FIRST, LUNAR_LAST + 1):
        ms = months[y]
        nxt = months[y + 1][0][2]
        assert ms[0][0] == 1 and not ms[0][1], y
        starts = [m[2] for m in ms] + [nxt]
        leap, bits = 0, 0
        for i, (m, is_leap, start) in enumerate(ms):
            n = (starts[i + 1] - start).days
            assert n in (29, 30), (y, m, n)
            if n == 30:
                bits |= 1 << i
            if is_leap:
                assert leap == 0 and ms[i - 1][0] == m
                leap = m
        assert len(ms) == (13 if leap else 12), y
        rows.append([ms[0][2].month * 100 + ms[0][2].day, leap, bits])
    return rows


def kr_fixed():
    out = {}
    for y in KR_FIXED_YEARS:
        ko = holidays.KR(years=[y], language='ko', expand=False)
        en = holidays.KR(years=[y], language='en_US', expand=False)
        days = {}
        for d in sorted(ko):
            if d.year != y:
                continue
            names = []
            for n in ko[d].split('; '):
                sub = n.endswith(' 대체 휴일')
                base = n[:-len(' 대체 휴일')] if sub else n
                base = KR_FIX_NAMES.get(base, base)
                names.append(('대체공휴일(%s)' % base) if sub else base)
            # 같은 날 대체공휴일 둘은 한 이름으로: 대체공휴일(부처님오신날·어린이날)
            subs = [n[6:-1] for n in names if n.startswith('대체공휴일(')]
            if len(subs) > 1:
                names = ['대체공휴일(%s)' % '·'.join(subs)]
            days[d.strftime('%m-%d')] = ['; '.join(names), en[d]]
        out[str(y)] = days
    return out


def us_table():
    en = holidays.US(years=US_YEARS, language='en_US', expand=False)
    out = {}
    for d in sorted(en):
        if d.year not in US_YEARS:
            continue
        ko = []
        for name in en[d].split('; '):
            obs = name.endswith(' (observed)')
            base = name.replace(' (observed)', '')
            if base not in US_KO:
                raise SystemExit('한국어 이름이 없는 미국 공휴일: ' + base)
            ko.append(US_KO[base] + (' 대체 휴일' if obs else ''))
        out[d.isoformat()] = [en[d], '; '.join(ko)]
    return out


def terms():
    out = {}
    for y, rows in REF['solar_terms_kst'].items():
        assert [r[0] for r in rows] == TERM_NAMES, y
        out[y] = [r[1:] for r in rows]
    return out


def other_days():
    out = {}
    for y, row in REF['other_days'].items():
        assert set(row) == set(OTHER_NAMES), y
        out[y] = [row[n] for n in OTHER_NAMES]
    return out


def js(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))


def main():
    lunar = lunar_table()
    body = (
        '// 달력 데이터. 자동 생성: _dev/gen_data.py (python holidays %s, korean_lunar_calendar 0.4.0, _dev/ref/kasi.json)\n'
        '// 손으로 고치지 말고 스크립트로 다시 만든다. 형식 설명은 gen_data.py 머리말.\n'
        '(function (root) {\n'
        '  var D = {\n'
        '    lunar: { first: %d, last: %d, official: [2025, 2028], years: %s },\n'
        '    termNames: %s,\n'
        '    terms: %s,\n'
        '    otherNames: %s,\n'
        '    others: %s,\n'
        '    krFixed: %s,\n'
        '    krExtra: %s,\n'
        '    usYears: [%d, %d],\n'
        '    us: %s\n'
        '  };\n'
        "  if (typeof module === 'object' && module.exports) module.exports = D; else root.CAL_DATA = D;\n"
        "})(typeof self !== 'undefined' ? self : this);\n"
    ) % (holidays.__version__, LUNAR_FIRST, LUNAR_LAST, js(lunar), js(TERM_NAMES), js(terms()), js(OTHER_NAMES),
         js(other_days()), js(kr_fixed()), js(KR_EXTRA), US_YEARS[0], US_YEARS[-1], js(us_table()))
    out = os.path.normpath(os.path.join(HERE, '..', 'assets', 'data.js'))
    with open(out, 'w', encoding='utf-8') as f:
        f.write(body)
    print('음력 %d~%d (%d해), 절기 %s, 미국 %d일 → %s (%d바이트)' % (
        LUNAR_FIRST, LUNAR_LAST, len(lunar), ','.join(sorted(REF['solar_terms_kst'])), len(us_table()), out, len(body.encode())))


if __name__ == '__main__':
    main()
