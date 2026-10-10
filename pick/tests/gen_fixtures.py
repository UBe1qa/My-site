#!/usr/bin/env python3
"""테스트 기준값 만들기: python3 -B pick/tests/gen_fixtures.py  (numpy·scipy·regex 필요)

기준값은 사이트 코드(자바스크립트)와 다른 방법으로 구한다.
- xoshiro256**: 파이썬 큰 정수로 참조 구현을 그대로 옮긴 것 + 공개된 기준 벡터(상태 1,2,3,4의 처음 10개,
  Rust rand_xoshiro 크레이트의 xoshiro256starstar.rs 테스트 reference()에 실린 값. 그 값은 참조 C 코드로 만든 것)와 대조.
- 카이제곱 임계값: scipy.stats.chi2.ppf(0.999, df).
- 공유 링크: 파이썬 json + base64 로 만든 문자열(자바스크립트가 읽어야 함)과 그 원문.
- 사다리: 한 사람의 자리 이동을 '높이마다 독립인 게으른 막대 위 걷기'로 직접 계산한 정확한 분포(행렬 거듭제곱).
- 명단의 '정해진 자리'(코드 포인트 순): 파이썬 sorted()(글자열을 코드 포인트로 견준다)로 구한 순서.
  그리고 tests/golden.json의 자리 번호를 그 순서에 대어, 예시 명단에서 누가 뽑혀야 하는지를 이름으로 적어 둔다.
- 이름 고르기(NFC + 보이지 않는 글자 지우기): 파이썬 unicodedata.normalize 와 regex 모듈의 유니코드 속성
  (Default_Ignorable_Code_Point, Extended_Pictographic, Emoji_Presentation)으로 따로 짠 clean_name().
  사이트 코드(assets/core/name.js)는 범위를 숫자로 적어 두고 차례로 훑는 방식이라 방법이 다르다.
- 확인 코드: 파이썬 hashlib.sha256.
"""
import base64, hashlib, json, random, unicodedata
from pathlib import Path

import numpy as np
import regex  # pip install regex (유니코드 속성 표)
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
        # 2026-10-10(3단계-2): 이름은 고른 꼴만 링크에 들어간다. 전에는 여기에 풀어쓴 e + U+0301 과 U+200D 한 글자짜리 이름이 있었다
        #   → 그 둘은 아래 share_raw_cases()로 옮겼다(읽을 때 고쳐 읽는 것을 본다). 대신 한 글자로 된 é와 스코틀랜드 깃발(꼬리표 글자)을 넣었다.
        {'name': 'mixed scripts', 'o': {}, 'i': ['Zoë', 'Łukasz', '田中さん', 'محمد', 'Ngô Thị', 'Ἀθηνᾶ', '\u00e9', '\U0001F3F4\U000E0067\U000E0062\U000E0073\U000E0063\U000E0074\U000E007F']},
    ]
    out = []
    for c in cases:
        text = json.dumps({'o': c['o'], 'i': c['i']}, ensure_ascii=False, separators=(',', ':'))
        out.append({'name': c['name'], 'o': c['o'], 'i': c['i'], 'body': b64u(text.encode('utf-8'))})
    return out


# ---------------- 이름 고르기(참조 구현) ----------------
DI = regex.compile(r'\p{Default_Ignorable_Code_Point}')
PICT = r'\p{Extended_Pictographic}'
TEXT_PICT = r'[\p{Extended_Pictographic}--\p{Emoji_Presentation}]'   # 글자 모양이 기본인 그림 글자
SKIN = r'[\U0001F3FB-\U0001F3FF]'
TAGS = '|'.join(''.join(chr(0xE0000 + ord(c)) for c in w) + '\U000E007F' for w in ('gbeng', 'gbsct', 'gbwls'))
FLAG = f'\U0001F3F4(?:{TAGS})'
BLANK_LIKE = {0x115F, 0x1160, 0x2800, 0x3164, 0xFFA0}                # 빈칸처럼 보이는 글자 → 공백
ALSO_HIDDEN = set(range(0xFFF9, 0xFFFC)) | set(range(0x13430, 0x13440))  # Default_Ignorable는 아니지만 보이지 않는 표시
JS_SPACE = regex.compile('[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+')
# 남겨도 되는 자리: (그림 글자 안의 U+FE0F) | (숫자 단추의 U+FE0F) | (깃발 꼬리표 통째) | (그림 글자 사이의 U+200D)
KEEP = regex.compile(
    rf'(?<={TEXT_PICT})\ufe0f'
    rf'|(?<=[0-9#*])\ufe0f(?=\u20e3)'
    rf'|(?<=\U0001F3F4)(?:{TAGS})'
    rf'|(?:(?<={PICT})|(?<={TEXT_PICT}\ufe0f)|(?<={PICT}{SKIN})|(?<={FLAG}))\u200d(?={PICT})', regex.V1)
COND = regex.compile(r'[\u200d\ufe0f\U000E0020-\U000E007F]')


def clean_name(s):
    """이름을 한 가지 꼴로: 제어 문자·빈칸 글자는 공백, 보이지 않는 글자는 지움(그림 글자 안의 것은 남김), NFC, 공백 정리."""
    s = ''.join(' ' if (unicodedata.category(c) == 'Cc' or ord(c) in BLANK_LIKE) else c for c in s)
    s = ''.join(c for c in s if COND.match(c) or not (DI.match(c) or ord(c) in ALSO_HIDDEN))
    # 자리를 보고 정하는 글자: 남겨도 되는 자리에 있지 않은 것을 왼쪽부터 하나씩 지운다(지울 게 없을 때까지)
    while True:
        ok = set()
        for m in KEEP.finditer(s):
            ok.update(range(m.start(), m.end()))
        bad = next((m.start() for m in COND.finditer(s) if m.start() not in ok), None)
        if bad is None:
            break
        s = s[:bad] + s[bad + 1:]
    s = unicodedata.normalize('NFC', s)
    return JS_SPACE.sub(' ', s).strip(' ')


def name_cases():
    """손으로 고른 것 + 씨앗을 고정해 섞어 만든 것. s = 넣은 글, c = 고른 꼴."""
    Z, NJ, J, WJ, BOM, LRM, RLM, SHY, VS = '\u200b', '\u200c', '\u200d', '\u2060', '\ufeff', '\u200e', '\u200f', '\u00ad', '\ufe0f'
    nfd = lambda t: unicodedata.normalize('NFD', t)
    family = '\U0001F468\u200d\U0001F469\u200d\U0001F467\u200d\U0001F466'
    scot = '\U0001F3F4\U000E0067\U000E0062\U000E0073\U000E0063\U000E0074\U000E007F'
    hand = [
        '김민준', Z + '김민준', '김민준' + Z, '김' + Z + '민준', nfd('김민준'), nfd('이서연') + NJ, '이\u00a0서연', '  박  지호 ', '박\u3000지호', '최유나' + BOM, BOM + '최유나',
        'Zoe\u0308', 'Zoë', 'e' + Z + '\u0301', 'A' + LRM + 'lice', '\u202eAlice\u202c', '\u2066bob\u2069', 'Bob' + SHY, 'co' + SHY + 'op', 'a' + WJ + 'b', 'a\u2061b\u2062c\u2063d\u2064e',
        '\u3164', '\u3164김\u3164민준\u3164', '\u115f\u1160', '가\uffa0나', '\u2800빈칸\u2800', Z, J, VS, Z + NJ + J + WJ + BOM, ' ', '',
        family, family + ' 가족', '\U0001F468' + J + J + '\U0001F469', '\U0001F468' + Z + J + '\U0001F469', J + '\U0001F468', '\U0001F468' + J, '가' + J + '나', 'a' + J + '\U0001F600', '\U0001F600' + J + 'a',
        '\U0001F1F0\U0001F1F7', '\U0001F1F0' + Z + '\U0001F1F7', '\U0001F44D\U0001F3FD', '\U0001F469\U0001F3FD\u200d\U0001F4BB', '\U0001F3FD' + J + '\U0001F4BB',
        '❤\ufe0f', '❤', '\U0001F600\ufe0f', '\U0001F600', '❤\ufe0f\u200d\U0001F525', '\U0001F3F3\ufe0f\u200d\U0001F308', '\U0001F3F3\u200d\U0001F308', '1\ufe0f\u20e3', '1\ufe0f', '#\ufe0f\u20e3', '가\ufe0f', 'A\ufe0e', '☎\ufe0e',
        scot, scot + J + '\U0001F525', '\U0001F3F4\U000E0067\U000E0062', '\U0001F3F4\U000E0078' + scot[1:], '가\U000E0067\U000E007F', '\U000E0001tag',
        '葛\U000E0100', '辻\ufe00', 'ᠠ\u180b', 'ab\u034fc', 'می\u200cخواهم', 'ශ\u0dca\u200dර\u0dd3', '\u061cم',
        'a\tb', 'a\u0000b\tc', 'a\u0085b', 'x\ufff9y\ufffaz\ufffb', '\U00013430\U00013000', '\U0001D173\U0001D11E', '\u17b4ក', 'ﬁ', 'Ω', 'Å', '豈', '１０', 'Å', '3학년 1반 김민준', nfd('3학년 1반 김민준'),
    ]
    rnd = random.Random(20261010)
    parts = ['김', '민', '준', '이', '서', '연', nfd('한'), nfd('글'), 'a', 'B', 'e\u0301', 'o\u0308', ' ', '  ', '\u00a0', '\u3000', Z, NJ, J, WJ, BOM, LRM, RLM, SHY, VS, '\ufe0e', '\u202e', '\u2069',
             '\u3164', '\u2800', '\U0001F600', '\U0001F468', '\U0001F469', '\U0001F467', '❤', '\U0001F3F3', '\U0001F308', '\U0001F3FD', '\U0001F1F0', '\U0001F1F7', '1', '\u20e3', '#',
             '\U0001F3F4', '\U000E0067', '\U000E0062', '\U000E0073', '\U000E0063', '\U000E0074', '\U000E007F', scot, family, '田', '\U000E0100', '\u034f', '\u0301']
    mixed = [''.join(rnd.choice(parts) for _ in range(rnd.randint(1, 12))) for _ in range(500)]
    out = []
    for t in hand + mixed:
        c = clean_name(t)
        assert clean_name(c) == c, (t, c)           # 한 번 더 넣어도 그대로
        out.append({'s': t, 'c': c})
    # 손으로 따진 값(참조 구현이 틀리지 않았는지)
    want = {Z + '김민준': '김민준', nfd('김민준'): '김민준', family: family, '\U0001F468' + J: '\U0001F468', '가' + J + '나': '가나', '1\ufe0f\u20e3': '1\ufe0f\u20e3', '1\ufe0f': '1',
            '❤\ufe0f': '❤\ufe0f', '\U0001F600\ufe0f': '\U0001F600', scot: scot, '\U0001F3F4\U000E0067\U000E0062': '\U0001F3F4', '\u3164김\u3164민준\u3164': '김 민준',
            '\U0001F1F0' + Z + '\U0001F1F7': '\U0001F1F0\U0001F1F7', 'e' + Z + '\u0301': 'é', Z + NJ + J + WJ + BOM: '', '\U0001F3F3\ufe0f\u200d\U0001F308': '\U0001F3F3\ufe0f\u200d\U0001F308'}
    for k, v in want.items():
        assert clean_name(k) == v, (k, clean_name(k), v)
    return out


def code_of(names):
    return hashlib.sha256('\n'.join(sorted(clean_name(n) for n in names if clean_name(n))).encode('utf-8')).hexdigest()[:8]


def ladder_code_of(names, labels):
    text = '\n'.join(clean_name(n) for n in names if clean_name(n)) + '\n\n' + '\n'.join(clean_name(n) for n in labels if clean_name(n))
    return hashlib.sha256(text.encode('utf-8')).hexdigest()[:8]


def code_cases():
    """확인 코드: 파이썬 hashlib으로 만든 값. sha = 글 그대로의 SHA-256, list = 명단 확인 코드, ladder = 사다리 확인 코드."""
    sample_ko = ['김민준', '이서연', '박지호', '최유나', '정도윤', '강하린', '윤서준', '임채원']
    sample_en = ['Olivia', 'Noah', 'Emma', 'Liam', 'Ava', 'Mason', 'Sophia', 'Lucas']
    lists = [sample_ko, sample_en, list(reversed(sample_ko)), sample_ko[:7], sample_ko + ['김민준'], ['혼자'], [], ['\u200b김민준', unicodedata.normalize('NFD', '이서연')] + sample_ko[2:],
             ['Zoë', 'zoe', '田中さん', '\U0001F600', '\U0001F468\u200d\U0001F469\u200d\U0001F467\u200d\U0001F466', '￥', '10', '9'], [f'p{i}' for i in range(5000)]]
    texts = ['', 'abc', 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '가', 'a' * 55, 'a' * 56, 'a' * 63, 'a' * 64, 'a' * 65, 'a' * 119, 'a' * 120, '김민준\n이서연', '\U0001F600' * 100, 'x' * 100000]
    # 공개 시험 벡터(FIPS 180-4 예제): 빈 글, "abc"
    assert hashlib.sha256(b'abc').hexdigest() == 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    assert hashlib.sha256(b'').hexdigest() == 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    return {
        'sha': [{'t': t if len(t) < 1000 else None, 'n': len(t), 'h': hashlib.sha256(t.encode('utf-8')).hexdigest()} for t in texts],
        'list': [{'i': l if len(l) < 100 else None, 'n': len(l), 'code': code_of(l)} for l in lists],
        'ladder': [{'i': sample_ko, 'labels': ['당첨'], 'code': ladder_code_of(sample_ko, ['당첨'])},
                   {'i': sample_en, 'labels': ['Winner'], 'code': ladder_code_of(sample_en, ['Winner'])},
                   {'i': ['가', '나', '다'], 'labels': ['당첨', '벌칙'], 'code': ladder_code_of(['가', '나', '다'], ['당첨', '벌칙'])},
                   {'i': ['가', '나', '다'], 'labels': ['벌칙', '당첨'], 'code': ladder_code_of(['가', '나', '다'], ['벌칙', '당첨'])},
                   {'i': ['나', '가', '다'], 'labels': ['당첨', '벌칙'], 'code': ladder_code_of(['나', '가', '다'], ['당첨', '벌칙'])},
                   {'i': ['가', '나'], 'labels': [], 'code': ladder_code_of(['가', '나'], [])}],
        'sample': {'ko': code_of(sample_ko), 'en': code_of(sample_en)},
    }


def share_raw_cases():
    """고른 꼴이 아닌 이름이 든 링크 본문(파이썬 json + base64). 읽으면 고친 명단(i)과 설정(o)이 나오고 '고쳐 읽었다'고 알려야 한다."""
    Z = '\u200b'
    nfd = lambda t: unicodedata.normalize('NFD', t)
    base = ['김민준', '이서연', 'Alice', 'bob', 'Bob', '田中さん', '7번', '\U0001F600웃음', 'Zoë', '가나다']
    cases = [
        {'name': 'zwsp first', 'o': {}, 'i': [Z + base[0]] + base[1:]},
        {'name': 'nfd second', 'o': {}, 'i': [base[0], nfd(base[1])] + base[2:]},
        {'name': 'old fixture', 'o': {}, 'i': ['Zoë', 'Łukasz', '田中さん', 'محمد', 'Ngô Thị', 'Ἀθηνᾶ', 'e\u0301', '\u200d']},
        {'name': 'every name tagged', 'o': {'mode': 'pick', 'm': 3}, 'i': [n + c for n, c in zip(base, ['\u200b', '\u200c', '\u200d', '\u2060', '\u2061', '\u2062', '\u2063', '\u2064', '\u206a', '\u206b'])]},
        {'name': 'labels', 'o': {'labels': ['당첨' + Z, nfd('벌칙'), Z], 'rows': 14}, 'i': ['가', '나', '다']},
        {'name': 'slip words', 'o': {'mode': 'slips', 'm': 1, 'win': '당' + Z + '첨', 'lose': '꽝'}, 'i': ['가', '나', '다']},
        {'name': 'bidi', 'o': {}, 'i': ['\u202e' + base[2] + '\u202c', base[3] + '\u200e', '\u2066' + base[4] + '\u2069']},
    ]
    out = []
    for c in cases:
        text = json.dumps({'o': c['o'], 'i': c['i']}, ensure_ascii=False, separators=(',', ':'))
        want_o = {k: ([y for y in (clean_name(x) for x in v) if y] if isinstance(v, list) else clean_name(v) if isinstance(v, str) else v) for k, v in c['o'].items()}
        out.append({'name': c['name'], 'body': b64u(text.encode('utf-8')), 'i': [y for y in (clean_name(x) for x in c['i']) if y], 'o': want_o})
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
        'names': name_cases(),
        'codes': code_cases(),
        'share_raw': share_raw_cases(),
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=0) + '\n', encoding='utf-8')
    print('wrote', OUT, OUT.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
