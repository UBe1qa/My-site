#!/usr/bin/env python3
"""간이세액표 자료 검사(참고용): python3 -B salary/tests/gani_formula_check.py

옮겨 온 표(_dev/data/gani-2026.json, 647줄 × 11칸 = 7,117칸)에 빠지거나 틀린 숫자가 없는지 보려고,
표 머리 주석의 계산 방법으로 세액을 다시 계산해 표와 몇 칸이 같은지 센다. 사이트는 이 식을 쓰지 않는다(조회표만 쓴다).
안 맞는 칸이 나와도 표를 고치지 않는다. 결과만 본다.

쓰는 값은 두 가지다.
 [원문] 법령 원문에서 확인한 것: 근로소득공제(소득세법 제47조), 세율(제55조), 별표 2 주석 1의 '특별소득공제 및 특별세액공제 중 일부' 식.
 [역산] 공식 원문으로 확인하지 못해 **표 값에서 거꾸로 찾아낸 것**(이 값들로 계산하면 표가 재현된다는 뜻일 뿐, 법 조문으로 확인한 사실이 아니다.
        글·화면에 쓰지 않는다): 월급여액은 구간의 가운데 값(딱 10,000천원 줄은 그 값), 기본공제 1명당 150만 원,
        연금보험료공제 = (월급여를 29만~449만 원 범위로 맞추고 천 원 미만을 버린 금액 × 4.5%, 10원 미만 버림) × 12,
        근로소득세액공제 = 산출세액 50만 원까지 55% + 넘는 금액의 30%
        (한도: 총급여 5,500만 원 이하 66만 원, 7,000만 원 이하 63만 원, 그 위 63만 원 − (총급여 − 7,000만 원) ÷ 2, 최소 50만 원),
        월 세액 = 연 세액 ÷ 12에서 10원 미만 버림, 1,000원 미만은 0원.
"""
import json, sys
from fractions import Fraction as F
from pathlib import Path

sys.dont_write_bytecode = True
SRC = Path(__file__).resolve().parent.parent / '_dev' / 'data' / 'gani-2026.json'
M = 1_000_000


def earned_income_deduction(g):          # [원문] 소득세법 제47조
    if g <= 5 * M: return g * F(70, 100)
    if g <= 15 * M: return 3_500_000 + (g - 5 * M) * F(40, 100)
    if g <= 45 * M: return 7_500_000 + (g - 15 * M) * F(15, 100)
    if g <= 100 * M: return 12 * M + (g - 45 * M) * F(5, 100)
    return min(20 * M, 14_750_000 + (g - 100 * M) * F(2, 100))


def special(g, fam):                     # [원문] 별표 2 주석 1의 계산식 표
    extra = max(0, g - 40 * M) * F(4, 100) if fam >= 3 else 0
    base = {1: 3_100_000, 2: 3_600_000}.get(fam, 5 * M)
    low = F(7, 100) if fam >= 3 else F(4, 100)
    if g <= 30 * M: return base + g * low + extra
    if g <= 45 * M: return base + g * low - (g - 30 * M) * F(5, 100) + extra
    if g <= 70 * M: return base + g * (F(5, 100) if fam >= 3 else F(15, 1000) if fam == 1 else F(2, 100)) + extra
    return base + g * (F(3, 100) if fam >= 3 else F(5, 1000) if fam == 1 else F(1, 100)) + extra


BRACKETS = ((14 * M, 0, F(6, 100), 0), (50 * M, 840_000, F(15, 100), 14 * M), (88 * M, 6_240_000, F(24, 100), 50 * M),
            (150 * M, 15_360_000, F(35, 100), 88 * M), (300 * M, 37_060_000, F(38, 100), 150 * M))


def tax_on(base):                        # [원문] 소득세법 제55조
    for upto, fixed, rate, over in BRACKETS:
        if base <= upto: return fixed + (base - over) * rate
    raise ValueError(base)


def monthly_tax(mid, fam):
    g = mid * 12
    pbase = int(min(max(mid, 290_000), 4_490_000)) // 1000 * 1000             # [역산] 천 원 미만 버림
    pension = (pbase * 45 // 1000) // 10 * 10 * 12                            # [역산] 월 보험료는 10원 미만 버림
    base = max(0, g - earned_income_deduction(g) - 1_500_000 * fam - pension - special(g, fam))  # 기본공제 [역산]
    t = tax_on(base)
    credit = F(55, 100) * t if t <= 500_000 else 275_000 + F(30, 100) * (t - 500_000)   # [역산]
    limit = 660_000 if g <= 55 * M else 630_000 if g <= 70 * M else max(500_000, 630_000 - (g - 70 * M) * F(1, 2))  # [역산]
    m = (t - min(credit, limit)) / 12
    won = int(m) // 10 * 10              # [역산] 10원 미만 버림
    return 0 if won < 1000 else won


def main():
    rows = json.loads(SRC.read_text(encoding='utf-8'))['rows']
    total = same = 0
    bad = []
    for r in rows:
        mid = F((r['from'] + r['to']) * 1000, 2)
        for fam in range(1, 12):
            total += 1
            got = monthly_tax(mid, fam)
            if got == r['tax'][fam - 1]: same += 1
            else: bad.append((r['from'], r['to'], fam, r['tax'][fam - 1], got))
    print(f'다시 계산한 값과 같은 칸: {same} / {total} ({same / total * 100:.2f}%)')
    for b in bad[:30]:
        print('  다른 칸: %d~%d천원 %d명  표 %d / 계산 %d' % b)
    sys.exit(0 if not bad else 1)


if __name__ == '__main__':
    main()
