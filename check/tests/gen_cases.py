#!/usr/bin/env python3
"""기준값 만들기: python3 check/tests/gen_cases.py  →  tests/cases.json

화면 코드(assets/ck-*.js)와 다른 방법으로 답을 구한다.
- 중앙값·평균: 파이썬 표준 라이브러리 statistics, math.fsum
- 소리 크기: math.log10, math.sin 으로 직접 만든 파형
- 폴링: 답이 정해진 흐름(정확히 1ms 간격 = 1000Hz 등)이 중심. 흔들림을 넣은 흐름의 최대값은 정의를 그대로 따라 천천히 훑은 값
- 동시에 눌린 수·채터링: 먼저 '누른 구간' 목록(정답)을 만들고 그걸 이벤트로 풀어 준다.
  기준값은 구간 목록에서 직접 센다(화면 코드는 이벤트를 하나씩 받아 센다).
난수는 씨앗을 고정해 다시 돌려도 같은 파일이 나온다.
"""
import json, math, random, statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
rnd = random.Random(20261010)
out = {}


def num(x):
    """JSON에 못 담는 무한대는 글자로."""
    if x == float('-inf'):
        return '-inf'
    return x


# ── 1. 중앙값·주사율 ────────────────────────────────────────
cases = []
fixed = [
    [16.7], [16.6, 16.8], [10, 9, 100, 8.5], [100, 20, 3], [5, 5, 5, 5], [1.5, 2.5, 0.5, 3.5, 2.0],
    [16.67] * 50 + [33.3, 50.1, 250.0],          # 긴 프레임이 섞임
    [6.94, 6.95, 6.94, 6.96, 6.93, 13.9, 6.94],  # 144Hz 근처
]
for hz in (30, 50, 59.94, 60, 72, 75, 90, 100, 120, 143.86, 144, 165, 180, 240, 360):
    base = 1000 / hz
    n = rnd.randint(31, 240)
    lst = [base + rnd.uniform(-0.04, 0.04) * base for _ in range(n)]
    for _ in range(rnd.randint(0, 6)):             # 탭 전환·끊김
        lst.insert(rnd.randrange(len(lst)), base * rnd.choice([2, 3, 10, 40]))
    fixed.append(lst)
for lst in fixed:
    med = statistics.median(lst)
    cases.append({'intervals': lst, 'median': med, 'hz': 1000 / med,
                  'stable': sum(1 for v in lst if abs(v - med) <= med * 0.15) / len(lst), 'samples': len(lst)})
out['refresh'] = cases

# ── 2. 폴링 ────────────────────────────────────────────────
def poll_ref(t, idle=40, win=250, min_iv=10, min_span=125):
    """정의 그대로 천천히: 간격이 idle보다 길면 끊고, 이벤트마다 win 안에 드는 가장 먼 이벤트까지를 창으로 본다."""
    runs, start = [], 0
    for i in range(1, len(t)):
        d = t[i] - t[i - 1]
        if d < 0 or d > idle:
            runs.append((start, i - 1)); start = i
    runs.append((start, len(t) - 1))
    active = math.fsum(t[b] - t[a] for a, b in runs)
    ivs = sum(b - a for a, b in runs)
    peak = 0.0
    for a, b in runs:
        for i in range(a, b + 1):
            inside = [j for j in range(i, b + 1) if t[j] - t[i] <= win]
            j = inside[-1]
            span = t[j] - t[i]
            if j - i >= min_iv and span >= min_span and span > 0:
                peak = max(peak, (j - i) / span * 1000)
    return {'avgHz': (ivs / active * 1000) if active > 0 else None, 'peakHz': peak or None, 'activeMs': active, 'events': len(t)}


def stream(spec, t0=1000.0):
    """spec: [(간격 ms, 개수, 흔들림 비율)] 또는 ('pause', ms)"""
    t, cur = [t0], t0
    for item in spec:
        if item[0] == 'pause':
            cur += item[1]; t.append(cur); continue
        step, n, jit = item
        for _ in range(n):
            cur += step * (1 + rnd.uniform(-jit, jit)); t.append(cur)
    return t


poll = []
specs = {
    '1000Hz 1초': [(1.0, 1000, 0)],
    '125Hz 1초': [(8.0, 125, 0)],
    '500Hz 쉬었다 다시': [(2.0, 200, 0), ('pause', 300), (2.0, 200, 0)],
    '천천히(125)에서 빠르게(1000)': [(8.0, 50, 0), (1.0, 300, 0)],
    '1000Hz 흔들림 20%': [(1.0, 1500, 0.2)],
    '500Hz 흔들림 10% 두 구간': [(2.0, 400, 0.1), ('pause', 120), (2.0, 300, 0.1)],
    '250Hz 흔들림 5%': [(4.0, 300, 0.05)],
    '60Hz(프레임마다 한 번)': [(16.6667, 120, 0.02)],
    '8000Hz': [(0.125, 4000, 0.05)],
    '이벤트 5개뿐': [(8.0, 4, 0)],
    '전부 띄엄띄엄': [(60.0, 30, 0)],
}
for name, spec in specs.items():
    t = stream(spec)
    poll.append({'name': name, 'times': t, **poll_ref(t)})
# 굵은 시계(1ms로 깎인 시각): 8000Hz면 같은 시각이 여덟 번씩 온다
t = [float(math.floor(1000 + i * 0.125)) for i in range(4001)]
poll.append({'name': '8000Hz, 시각이 1ms 단위', 'times': t, **poll_ref(t)})
t = [float(math.floor(1000 + i * 1.0 + rnd.uniform(0, 0.99))) for i in range(1200)]
poll.append({'name': '1000Hz, 시각이 1ms 단위·흔들림', 'times': t, **poll_ref(t)})
out['polling'] = poll

# ── 3. 소리 크기 ────────────────────────────────────────────
amps = [1.0, 0.5, 0.1, 0.25, 0.001, 2.0, 1 / math.sqrt(2), 0.0316227766, 1e-5]
out['dbfs'] = [{'amp': a, 'db': 20 * math.log10(a)} for a in amps]

waves = []
def add_wave(name, samples):
    r = math.sqrt(math.fsum(v * v for v in samples) / len(samples))
    p = max(abs(v) for v in samples)
    waves.append({'name': name, 'samples': samples, 'rms': r, 'peak': p,
                  'rmsDb': num(20 * math.log10(r) if r > 0 else float('-inf')),
                  'peakDb': num(20 * math.log10(p) if p > 0 else float('-inf'))})

sr = 48000
add_wave('꽉 찬 사인 1kHz(48주기)', [math.sin(2 * math.pi * 1000 * i / sr) for i in range(2304)])
add_wave('절반 크기 사인 440Hz(1초의 1/10, 44주기)', [0.5 * math.sin(2 * math.pi * 440 * i / sr) for i in range(4800)])
add_wave('꽉 찬 네모파', [1.0 if (i // 24) % 2 == 0 else -1.0 for i in range(960)])
add_wave('직류 0.1', [0.1] * 512)
add_wave('무음', [0.0] * 512)
add_wave('작은 잡음', [rnd.gauss(0, 0.002) for _ in range(2048)])
add_wave('사인 + 잡음', [0.3 * math.sin(2 * math.pi * 300 * i / sr) + rnd.gauss(0, 0.01) for i in range(4096)])
out['waves'] = waves

floors = []
lists = [
    [-60.2, -58.9, -61.0, -59.5, -40.1],           # 기침 한 번
    [-72.0, -71.5],
    [-55.0],
    ['-inf', '-inf', -80.0],
    ['-inf', -80.0, -70.0],
    ['-inf', -80.0],
    ['-inf', '-inf'],
    [rnd.uniform(-75, -45) for _ in range(41)],
    [rnd.uniform(-75, -45) for _ in range(40)],
]
for lst in lists:
    vals = [float('-inf') if v == '-inf' else v for v in lst]
    floors.append({'blocks': lst, 'floor': num(statistics.median(vals))})
out['noiseFloor'] = floors

# ── 4. 테스트 음 ────────────────────────────────────────────
tones = []
for (srate, secs, freq, gain) in [(48000, 1.0, 440, 0.1), (44100, 0.5, 1000, 0.25), (48000, 0.25, 100, 0.5), (48000, 1.0, 15000, 0.1)]:
    n = round(srate * secs)
    idx = sorted(rnd.sample(range(2000, n - 2000), 12))   # 페이드 밖(가운데) 표본
    mid = [gain * math.sin(2 * math.pi * freq * i / srate) for i in range(2000, n - 2000)]
    tones.append({'sampleRate': srate, 'seconds': secs, 'freq': freq, 'gain': gain, 'length': n,
                  'at': [[i, gain * math.sin(2 * math.pi * freq * i / srate)] for i in idx],
                  'midRms': math.sqrt(math.fsum(v * v for v in mid) / len(mid)),
                  'midFrom': 2000, 'midTo': n - 2000,
                  'peakDb': 20 * math.log10(gain)})
out['tones'] = tones
out['sweep'] = [{'f0': f0, 'f1': f1, 'T': T, 't': t, 'f': f0 * math.exp(math.log(f1 / f0) * t / T)}
                for (f0, f1, T) in [(20, 20000, 10), (100, 10000, 6), (40, 16000, 8)]
                for t in [0, T / 7, T / 3, T / 2, T * 0.9, T]]

# ── 5. 스틱 ────────────────────────────────────────────────
sticks = []
for cx, cy, noise, n in [(0, 0, 0.004, 120), (0.031, -0.012, 0.004, 120), (0.08, 0.05, 0.01, 90), (-0.2, 0.11, 0.02, 60), (0.6, -0.7, 0.0, 30), (0.9, 0.9, 0.0, 10)]:
    pts = [[cx + rnd.uniform(-noise, noise), cy + rnd.uniform(-noise, noise)] for _ in range(n)]
    mx, my = statistics.fmean(p[0] for p in pts), statistics.fmean(p[1] for p in pts)
    off = min(1.0, math.hypot(mx, my))
    sticks.append({'samples': pts, 'x': mx, 'y': my, 'offset': off, 'percent': off * 100,
                   'wobble': max(math.dist(p, (mx, my)) for p in pts)})
out['sticks'] = sticks

# ── 6. 해상도 ──────────────────────────────────────────────
out['megapixels'] = [{'w': w, 'h': h, 'mp': w * h / 1e6} for w, h in [(1920, 1080), (1280, 720), (3840, 2160), (640, 480), (2560, 1440), (1080, 1920)]]

# ── 7. 키 이벤트 흐름(구간에서 정답을 센다) ───────────────────
KEYS = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL', 'Space', 'ShiftLeft', 'Enter']
streams = []
for case in range(14):
    thr = rnd.choice([10, 20, 30, 30, 30, 50, 80])
    n_keys = rnd.randint(2, len(KEYS))
    intervals = []                                   # (key, down, up)
    for key in rnd.sample(KEYS, n_keys):
        t = rnd.uniform(0, 300)
        for _ in range(rnd.randint(1, 25)):
            hold = rnd.uniform(20, 400)
            intervals.append((key, round(t, 3), round(t + hold, 3)))
            # 다음 누름까지: 가끔 아주 짧게(채터링처럼), 보통은 사람 속도
            gap = rnd.choice([rnd.uniform(0.5, thr * 1.6), rnd.uniform(60, 500), rnd.uniform(60, 500), rnd.uniform(60, 500)])
            t = round(t + hold, 3) + round(gap, 3)
    # 정답 ①: 가장 많이 겹친 수(구간 겹침, 끝점을 정렬해 센다. 같은 시각이면 뗌이 먼저)
    points = sorted([(d, 1) for _, d, u in intervals] + [(u, 0) for _, d, u in intervals])
    cur = best = 0
    for _, kind in points:
        cur += 1 if kind == 1 else -1
        best = max(best, cur)
    # 정답 ②: 키마다 '앞 구간의 뗌 → 다음 구간의 누름' 간격이 기준보다 짧은 횟수
    suspects = {}
    for key in set(k for k, _, _ in intervals):
        seq = sorted((d, u) for k, d, u in intervals if k == key)
        gaps = [seq[i + 1][0] - seq[i][1] for i in range(len(seq) - 1)]
        hits = [g for g in gaps if g < thr]
        if hits:
            suspects[key] = {'count': len(hits), 'minGap': min(hits)}
    events = sorted([(d, 1, k) for k, d, u in intervals] + [(u, 0, k) for k, d, u in intervals])
    streams.append({'chatterMs': thr,
                    'events': [{'id': k, 'type': 'down' if kind == 1 else 'up', 't': t} for t, kind, k in events],
                    'presses': len(intervals), 'maxHeld': best, 'suspects': suspects,
                    'seen': sorted(set(k for k, _, _ in intervals))})
out['keyStreams'] = streams

(HERE / 'cases.json').write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
print('cases.json:', {k: len(v) for k, v in out.items()})
