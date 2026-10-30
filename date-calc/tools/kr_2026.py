"""라이브러리(holidays 0.83)에 아직 없는 2026년 개정 공휴일을 한국 표에 더한다. gen_holidays.py가 쓴다.

관공서의 공휴일에 관한 규정(대통령령 제36290호, 2026-04-30 개정. 인사혁신처 보도자료 2026-04-29
「올해부터 노동절, 제헌절 공휴일로」): 노동절(5월 1일)은 2026-05-01부터, 제헌절(7월 17일)은
2026-05-11부터 공휴일이다. 제3조: 둘 다 토·일요일과 겹치면 그다음 첫 번째 비공휴일(토·일요일과
공휴일이 아닌 날)이 대체공휴일이다. 평일에 다른 공휴일과 겹쳐도 대체공휴일이 생기는데, 2035년까지는
그런 해가 없어서 겹치면 멈추고 사람이 보게 한다.
"""
import datetime as dt

FROM = 2026
NEW = [((5, 1), "노동절", "Labor Day"), ((7, 17), "제헌절", "Constitution Day")]


def add(kr, years):
    """kr: {'YYYY-MM-DD': [한국어 이름, 영어 이름]}. 더한 표를 날짜 순으로 돌려준다."""
    out = dict(kr)
    days = [(dt.date(y, m, d), ko, en) for y in years if y >= FROM for (m, d), ko, en in NEW]
    for day, ko, en in days:
        k = day.isoformat()
        if k in kr:
            raise SystemExit(f"{k}에 이미 '{kr[k][0]}'이(가) 있어요. 라이브러리가 {ko}을 넣었으면 tools/kr_2026.py를 빼고, "
                             "다른 공휴일과 겹친 거면 겹침 대체공휴일을 더해야 해요.")
        out[k] = [ko, en]
    for day, ko, en in days:
        if day.weekday() < 5:
            continue
        x = day + dt.timedelta(days=1)
        while x.weekday() >= 5 or x.isoformat() in out:
            x += dt.timedelta(days=1)
        out[x.isoformat()] = [ko + " 대체 휴일", "Alternative holiday for " + en]
    return dict(sorted(out.items()))
