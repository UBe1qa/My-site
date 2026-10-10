#!/usr/bin/env python3
"""테스트 기준값 만들기: python3 -B pick/tests/gen_fixtures.py  (numpy·scipy 필요)

기준값은 사이트 코드(자바스크립트)와 다른 방법으로 구한다.
- xoshiro256**: 파이썬 큰 정수로 참조 구현을 그대로 옮긴 것 + 공개된 기준 벡터(상태 1,2,3,4의 처음 10개,
  Rust rand_xoshiro 크레이트의 xoshiro256starstar.rs 테스트 reference()에 실린 값. 그 값은 참조 C 코드로 만든 것)와 대조.
- 카이제곱 임계값: scipy.stats.chi2.ppf(0.999, df).
- 공유 링크: 파이썬 json + base64 로 만든 문자열(자바스크립트가 읽어야 함)과 그 원문.
- 사다리: 한 사람의 자리 이동을 '높이마다 독립인 게으른 막대 위 걷기'로 직접 계산한 정확한 분포(행렬 거듭제곱).
- 명단의 '정해진 자리'(코드 포인트 순): 파이썬 sorted()(글자열을 코드 포인트로 견준다)로 구한 순서.
  그리고 tests/golden.json의 자리 번호를 그 순서에 대어, 예시 명단에서 누가 뽑혀야 하는지를 이름으로 적어 둔다.
"""
import base64, hashlib, json
from pathlib import Path

import numpy as np
from scipy.stats import chi2

OUT = Path(__file__).resolve().parent / 'fixtures.json'
M = (1 << 64) - 1


def rotl(x, k):
    return ((x << k) | (x >> (64 - k))) & M


def xoshiro_next(s):
    r = (rotl((s[1] * 5) & M, 7) * 9) & M
    t = (s[1] << 17) & M
    s[2] ^= s[0]
    s[3] ^= s[1]
    s[1] ^= s[2]
    s[0] ^= s[3]
    s[2] ^= t
    s[3] = rotl(s[3], 45)
    return r


PUBLISHED_1234 = [11520, 0, 1509978240, 1215971899390074240, 1216172134540287360, 607988272756665600,
                  16172922978634559625, 8476171486693032832, 10595114339597558777, 2904607092377533576]


def rng_vectors():
    out = []
    s = [1, 2, 3, 4]
    got = [xoshiro_next(s) for _ in range(10)]
    assert got == PUBLISHED_1234, got
    seed = b''.join(v.to_bytes(8, 'little') for v in [1, 2, 3, 4])
    out.append({'name': 'published state 1,2,3,4', 'seed_hex': seed.hex(), 'first': [str(v) for v in got], 'at': {}})
    for label in ['pick-a', 'pick-b', '루멘랩', 'all-ff']:
        seed = bytes([255] * 32) if label == 'all-ff' else hashlib.sha256(label.encode()).digest()
        s = [int.from_bytes(seed[i * 8:i * 8 + 8], 'little') for i in range(4)]
        first, at = [], {}
        for i in range(1, 100001):
            v = xoshiro_next(s)
            if i <= 8:
                first.append(str(v))
            if i in (1000, 65536, 100000):
                at[str(i)] = str(v)
        out.append({'name': label, 'seed_hex': seed.hex(), 'first': first, 'at': at})
    return out


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def share_cases():
    long_ko = [f'{i + 1}번 김하늘{i % 10}' for i in range(500)]
    cases = [
        {'name': 'korean', 'o': {}, 'i': ['김민준', '이서연', '박지호', '최유나', '정도윤', '강하린', '윤서준', '임채원']},
        {'name': 'emoji', 'o': {'rows': 14}, 'i': ['🍕 피자', '👨‍👩‍👧‍👦 가족', '🇰🇷', '👍🏽', '짜장면 vs 짬뽕', '1️⃣']},
        {'name': 'symbols', 'o': {'teams': 3, 'unique': True, 'sort': 'asc'}, 'i': ['a&b=c', '50% #1', 'x/y?z', 'tab+plus', '"quote"', "it's", '\\back', '<b>굵게</b>', 'A.B', 'r=1.w']},
        {'name': 'labels', 'o': {'labels': ['당첨', '꽝', '커피 사기'], 'rows': 24}, 'i': ['가', '나', '다']},
        {'name': 'long 500', 'o': {'size': 4}, 'i': long_ko},
        {'name': 'empty', 'o': {'min': -5, 'max': 9007199254740991, 'count': 10}, 'i': []},
        {'name': 'mixed scripts', 'o': {}, 'i': ['Zoë', 'Łukasz', '田中さん', 'محمد', 'Ngô Thị', 'Ἀθηνᾶ', 'é', '\u200d']},
    ]
    out = []
    for c in cases:
        text = json.dumps({'o': c['o'], 'i': c['i']}, ensure_ascii=False, separators=(',', ':'))
        out.append({'name': c['name'], 'o': c['o'], 'i': c['i'], 'body': b64u(text.encode('utf-8'))})
    return out


def base64_cases():
    out = []
    for n in list(range(0, 10)) + [31, 32, 33, 255, 256, 1000]:
        b = hashlib.shake_256(f'b64-{n}'.encode()).digest(n)
        out.append({'hex': b.hex(), 'b64u': b64u(b)})
    out.append({'hex': bytes(range(256)).hex(), 'b64u': b64u(bytes(range(256)))})
    return out


def ladder_exact(n, rows, k):
    """가로줄을 채우지 않는(ensure 끔) 사다리에서 출발 자리별 도착 자리 분포. 틈마다 가로줄 확률 q = 1/(k+1)."""
    q = 1.0 / (k + 1)
    t = np.zeros((n, n))
    for j in range(n):
        if j < n - 1:
            t[j, j + 1] = q
        if j > 0:
            t[j, j - 1] = q
        t[j, j] = 1.0 - t[j].sum()
    return np.linalg.matrix_power(t, rows)


def ladder_cases():
    out = []
    for n, rows, k in [(2, 8, 2), (3, 14, 2), (4, 8, 2), (5, 14, 2), (6, 24, 2), (8, 8, 2), (8, 14, 2), (8, 24, 2), (10, 14, 3), (30, 24, 2)]:
        p = ladder_exact(n, rows, k)
        assert np.allclose(p.sum(axis=1), 1) and np.allclose(p.sum(axis=0), 1)
        out.append({'n': n, 'rows': rows, 'k': k, 'p': [[float(x) for x in row] for row in p]})
    return out


def ladder_table():
    """글에 쓸 정확한 숫자(ensure 끔 모형): 제자리 확률, 균등에서 먼 정도(전변동거리, 가장 나쁜 출발 자리)."""
    rows_list = [4, 8, 14, 24, 48, 100, 200, 400]
    out = []
    for n in [2, 3, 4, 5, 6, 8, 10, 15, 20, 30]:
        for rows in rows_list:
            p = ladder_exact(n, rows, 2)
            tv = 0.5 * np.abs(p - 1.0 / n).sum(axis=1)
            out.append({'n': n, 'rows': rows, 'stay_edge': float(p[0, 0]), 'stay_mid': float(p[n // 2, n // 2]),
                        'tv_worst': float(tv.max()), 'far_edge': float(p[0, n - 1])})
    return out


def ladder_need():
    """글에 쓸 정확한 숫자: 가장 불리한 출발 자리의 치우침(전변동거리)이 5%·1% 아래로 내려가는 가장 작은 높이."""
    out = []
    for n in [2, 3, 4, 5, 6, 8, 10, 15, 20, 30]:
        q = 1.0 / 3
        t = np.zeros((n, n))
        for j in range(n):
            if j < n - 1:
                t[j, j + 1] = q
            if j > 0:
                t[j, j - 1] = q
            t[j, j] = 1.0 - t[j].sum()
        p = np.eye(n)
        need = {}
        for rows in range(1, 20001):
            p = p @ t
            tv = (0.5 * np.abs(p - 1.0 / n).sum(axis=1)).max()
            for lim in (0.05, 0.01):
                if str(lim) not in need and tv < lim:
                    need[str(lim)] = rows
            if len(need) == 2:
                break
        out.append({'n': n, 'rows_tv5': need.get('0.05'), 'rows_tv1': need.get('0.01'),
                    'rungs_per_gap_tv5': round(need['0.05'] / 3, 1), 'total_rungs_tv5': round(need['0.05'] * (n - 1) / 3)})
    return out


def order_cases():
    """정해진 자리: 이름을 코드 포인트 순으로 놓는다(같은 이름끼리는 넣은 순서). order[k] = k번째 자리에 오는 이름의 원래 번호."""
    lists = {
        'korean sample': ['김민준', '이서연', '박지호', '최유나', '정도윤', '강하린', '윤서준', '임채원'],
        'mixed scripts': ['Zoë', 'zoe', 'Zoe', 'Łukasz', '田中さん', 'محمد', 'Ἀθηνᾶ', 'é', 'e\u0301', '😀', '\uffe5', '\ue000',
                          '👍🏽', '10', '9', '１０', 'a b', 'a', 'A', '가', '각', '힣', '\U0001F1F0\U0001F1F7', '\ufffd', '𠀀', '가나'],
        'dupes': ['나', '가', '나', '다', '가', '가'],
        'same start': ['3학년 1반 김민준', '3학년 1반 김민', '3학년 10반 김', '3학년 2반 이서연', '3학년 1반 김민준'],
        'one': ['혼자'],
    }
    out = []
    for name, items in lists.items():
        order = sorted(range(len(items)), key=lambda i: (items[i], i))
        out.append({'name': name, 'items': items, 'order': order, 'sorted': [items[i] for i in order]})
    return out


def order_golden():
    """예시 명단 8명 + 씨앗(상태 1,2,3,4)에서 누가 뽑혀야 하는지: golden.json의 자리 번호 → 코드 포인트 순 이름."""
    gold = json.loads((Path(__file__).resolve().parent / 'golden.json').read_text(encoding='utf-8'))
    names = sorted(['김민준', '이서연', '박지호', '최유나', '정도윤', '강하린', '윤서준', '임채원'])
    return {'sorted': names, 'wheel': names[gold['wheel']['index']], 'order': [names[k] for k in gold['order']],
            'teams': [[names[k] for k in team] for team in gold['teams']]}


def main():
    dfs = sorted(set(list(range(1, 130)) + [199, 255, 299, 499, 719, 899, 999]))
    data = {
        'note': 'tests/gen_fixtures.py 가 만든 파일. 손으로 고치지 않는다.',
        'xoshiro': rng_vectors(),
        'chi2_999': {str(d): float(chi2.ppf(0.999, d)) for d in dfs},
        'share': share_cases(),
        'base64': base64_cases(),
        'ladder': ladder_cases(),
        'ladder_table': ladder_table(),
        'ladder_need': ladder_need(),
        'order': order_cases(),
        'order_golden': order_golden(),
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=0) + '\n', encoding='utf-8')
    print('wrote', OUT, OUT.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
