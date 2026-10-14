"""세계 시간 시험의 기준값을 파이썬 zoneinfo(IANA tz 자료)로 만든다.
최신 tz 자료로: pip install --target <저장소 밖 폴더> -U tzdata 뒤 PYTHONPATH=<그 폴더> PYTHONTZPATH= python3 time/tests/gen_tz.py
OT.offset / OT.nextChange / OT.fromLocal / OT.meeting 을 이 값과 대조한다(tests/run.mjs 'tz' 묶음)."""
import json, re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / 'assets/tz.js').read_text(encoding='utf-8')
zones = sorted(set(re.findall(r"\['[a-z]+', '([A-Za-z_/]+)'", src)))
UTC = timezone.utc

def off(z, ts):
    return int(datetime.fromtimestamp(ts, ZoneInfo(z)).utcoffset().total_seconds() // 60)

def next_change(z, ts, days=400):
    o = off(z, ts)
    t = ts
    end = ts + days * 86400
    while t < end:
        t2 = t + 3600
        if off(z, t2) != o:
            lo, hi = t, t2
            while hi - lo > 60:
                mid = (lo + hi) // 2 // 60 * 60
                if mid <= lo: mid = lo + 60
                if off(z, mid) == o: lo = mid
                else: hi = mid
            return {'at': hi * 1000, 'before': o, 'after': off(z, hi)}
        t = t2
    return None

starts = [datetime(2026, 1, 1, tzinfo=UTC), datetime(2026, 3, 1, tzinfo=UTC), datetime(2026, 10, 14, 5, tzinfo=UTC), datetime(2027, 6, 1, tzinfo=UTC)]
import zoneinfo
try:
    import tzdata; VER = tzdata.IANA_VERSION
except ImportError:
    VER = open('/usr/share/zoneinfo/tzdata.zi').readline().split()[-1]
cases = {'offset': [], 'next': [], 'local': [], 'zones': zones, 'tzdata': VER}
for z in zones:
    for d in [datetime(2026, m, 15, 12, tzinfo=UTC) for m in range(1, 13)] + [datetime(2027, 1, 15, tzinfo=UTC), datetime(2027, 7, 15, tzinfo=UTC)]:
        ts = int(d.timestamp())
        cases['offset'].append([z, ts * 1000, off(z, ts)])
    for s in starts:
        cases['next'].append([z, int(s.timestamp()) * 1000, next_change(z, int(s.timestamp()))])
    # 바뀌는 순간 앞뒤 1분
    nc = next_change(z, int(starts[2].timestamp()))
    if nc:
        for dt in (-60, 0, 60):
            t = nc['at'] // 1000 + dt
            cases['offset'].append([z, t * 1000, off(z, t)])
# 벽시계 → 순간 (빈 시간·겹친 시간 포함)
def from_local(z, y, mo, d, h, mi):
    zi = ZoneInfo(z)
    naive = datetime(y, mo, d, h, mi)
    a = naive.replace(tzinfo=zi, fold=0)
    # 빈 시간이면 왕복이 안 맞는다
    back = a.astimezone(UTC).astimezone(zi)
    gap = (back.replace(tzinfo=None) != naive)
    if gap:
        # 바뀌기 전 오프셋으로 계산(뒤로 밀림)
        before = datetime(y, mo, d, tzinfo=zi) - timedelta(days=1)
        o = before.utcoffset()
        ts = (naive - o).replace(tzinfo=UTC).timestamp()
        return int(ts) * 1000, True
    return int(a.timestamp()) * 1000, False
for z, y, mo, d, h, mi in [('America/New_York', 2026, 3, 8, 2, 30), ('America/New_York', 2026, 11, 1, 1, 30), ('America/New_York', 2026, 11, 1, 3, 0),
                           ('Europe/London', 2026, 3, 29, 1, 15), ('Europe/London', 2026, 10, 25, 1, 15), ('Australia/Sydney', 2026, 10, 4, 2, 30),
                           ('Australia/Sydney', 2027, 4, 4, 2, 30), ('Pacific/Auckland', 2026, 9, 27, 2, 0), ('Asia/Seoul', 2026, 10, 14, 9, 0),
                           ('Asia/Kathmandu', 2026, 6, 1, 0, 0), ('Australia/Adelaide', 2026, 10, 4, 2, 0), ('America/Santiago', 2026, 9, 6, 0, 0)]:
    ts, gap = from_local(z, y, mo, d, h, mi)
    cases['local'].append([z, y, mo, d, h, mi, ts, gap])
(ROOT / 'tests/cases-tz.json').write_text(json.dumps(cases, ensure_ascii=False), encoding='utf-8')
print(len(zones), 'zones', len(cases['offset']), 'offsets', len(cases['next']), 'next', len(cases['local']), 'local')
