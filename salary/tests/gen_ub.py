#!/usr/bin/env python3
"""구직급여 기준값 만들기: python3 -B salary/tests/gen_ub.py  → tests/ref/ub.json

우리 로직(pay-core.js, 정수 계산)과 다른 방법(파이썬 분수 Fraction)으로 구한 값이다.
  하루 금액 = max( floor(min(3개월 임금 ÷ 날짜 수, 기초일액 상한) × 60%), floor(하루 소정근로시간 × 최저임금 × 80%) )
- float: 제3자 평가(2026-10-10)가 1원 오차를 찾아낸 조건 그대로. 이직일 2026-03-31(3개월 90일)·하루 4시간·임금 496만~1,021만 원을 만 원씩(526건),
  이직일 2026-03-31·8시간·임금 9,907,200~10,215,000원을 150원씩, 92일·91일 구간(이직일 2026-09-30, 2026-06-30).
- next: 이직일이 2027년일 때. 하한은 2027년 최저임금으로, 기초일액 상한은 2026년 값 그대로(상한 미정).
3개월 날짜 수는 gen_dates.py 의 moel_period(고용노동부 계산기 스크립트를 옮긴 것)로 센다: 이직일 다음 날을 퇴직일로 본다.
값(요율·상한·최저임금)은 공식 원문에서 따로 옮겨 적었다: 고용보험법 제46조(100분의 60·100분의 80), 시행령 제68조(11만3500원), 최저임금 10,320원(2026)·10,700원(2027).
"""
import json, sys
from datetime import date, timedelta
from fractions import Fraction as F
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_dates import moel_period  # noqa: E402

OUT = Path(__file__).resolve().parent / 'ref' / 'ub.json'
BASE_MAX = 113500
MIN_WAGE = {2026: 10320, 2027: 10700}


def days3(leave):
    nxt = leave + timedelta(days=1)
    return sum(b - a + 1 for _, _, a, b in moel_period(nxt))


def daily(wages, leave, hours):
    d = days3(leave)
    by_rate = int(min(F(wages, d), BASE_MAX) * F(60, 100))
    lower = int(F(hours) * MIN_WAGE[leave.year] * F(80, 100))
    return d, by_rate, lower, max(by_rate, lower)


rows = []
for leave, hours, rng in ((date(2026, 3, 31), 4, range(4_960_000, 10_210_001, 10_000)), (date(2026, 3, 31), 8, range(9_907_200, 10_215_001, 150)),
                          (date(2026, 9, 30), 4, range(5_060_000, 10_440_001, 20_000)), (date(2026, 6, 30), 4, range(5_005_000, 10_330_001, 45_500)),
                          (date(2026, 2, 28), 8, (10_127_100, 10_127_250, 10_126_950, 9_000_000, 12_000_000))):
    for w in rng:
        d, br, lo, dy = daily(w, leave, hours)
        rows.append([leave.isoformat(), hours, w, d, br, lo, dy])
nxt = []
for leave in (date(2027, 1, 1), date(2027, 1, 15), date(2027, 5, 30), date(2027, 6, 30), date(2027, 12, 31)):
    for hours in (1, 4, 7, 8):
        for w in (3_000_000, 6_000_000, 9_000_000, 10_215_000, 10_440_000, 10_440_001, 15_000_000):
            d, br, lo, dy = daily(w, leave, hours)
            nxt.append([leave.isoformat(), hours, w, d, br, lo, dy])
data = {'_': '파이썬 분수 계산으로 구한 구직급여 기준값(gen_ub.py). 줄 = [이직일, 하루 소정근로시간, 3개월 임금, 3개월 날짜 수, 평균임금의 60%, 하한액, 하루 금액]. 손으로 고치지 않는다.',
        'float': rows, 'next': nxt}
OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('],[', '],\n[') + '\n', encoding='utf-8')
print(f'wrote {OUT.name}: float {len(rows)}, next {len(nxt)}')
