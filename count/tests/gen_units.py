#!/usr/bin/env python3
"""기준값 만들기(3단계): 나이스 바이트와 SNS 한도의 세는 단위를 파이썬으로 '따로' 센 값을 tests/cases-units.json 에 적는다.

- neis : 「2026학년도 학교생활기록부 기재요령(고등학교)」 규칙대로 한 글자씩 더한다(한글 3, 영문·숫자 1, 엔터 1).
         원문에 없는 글자는 화면에 밝힌 우리 기준대로(ASCII 1, 그 밖은 UTF-8 바이트).
- units: UTF-16 단위 = encode('utf-16-le') ÷ 2, UTF-8 바이트 = encode('utf-8'), 글자소 = regex \\X.
돌리기: <venv>/bin/python count/tests/gen_units.py   (pip install regex)
"""
import json, random, re
from pathlib import Path

import regex

OUT = Path(__file__).resolve().parent / 'cases-units.json'
BREAK = re.compile(r'\r\n|\r|\n')


def is_hangul(c):
    o = ord(c)
    return 0xAC00 <= o <= 0xD7A3 or 0x1100 <= o <= 0x11FF or 0x3130 <= o <= 0x318F


def neis_bytes(t):
    n = 0
    for part in BREAK.split(t):
        for c in part:
            if is_hangul(c):
                n += 3          # 한글 1자는 3Byte
            elif ord(c) < 0x80:
                n += 1          # 영문·숫자 1자는 1Byte (띄어쓰기·문장부호는 원문에 없음: 우리 기준 1Byte)
            else:
                n += len(c.encode('utf-8'))   # 원문에 없음: 우리 기준 UTF-8 바이트
    return n + len(BREAK.findall(t))          # 엔터(Enter)는 1Byte


def graphemes(t):
    return len(regex.findall(r'\X', t))


def neis_case(t, mx):
    b = neis_bytes(t)
    breaks = len(BREAK.findall(t))
    return {'text': t, 'max': mx, 'bytes': b, 'limit': mx * 3, 'left': mx * 3 - b,
            'chars': graphemes(BREAK.sub('', t)) + breaks, 'lineBreaks': breaks,
            'hangulLeft': (mx * 3 - b) // 3 if mx * 3 > b else 0}


def unit_case(t):
    return {'text': t, 'utf16': len(t.encode('utf-16-le')) // 2, 'utf8': len(t.encode('utf-8')), 'grapheme': graphemes(t)}


HAND = [
    '', '가', 'a', '1', ' ', '\n', '가나다', 'abc123', '가나다\nabc', '독서 토론에 참여함.',
    '학급 회의에서 안건을 제안함.\n발표를 맡아 근거를 들어 설명함.', 'TED 강연 3편을 듣고 요약함.',
    '줄\r\n바꿈', '줄\r바꿈', '\n\n', 'ㄱㄴㄷ', '漢字', '‘따옴표’ “큰따옴표”', '①②③', '가·나', 'A～Z', '😀', '가😀나', '👨‍👩‍👧',
    '2026학년도 1학기: 수학Ⅰ, 영어Ⅱ', 'café',
]
random.seed(20261010)
POOL = (['가', '나', '다', '학', '생', '활', '동', '함', '임', '음'] * 6 + list('abcXYZ019') * 2 + [' '] * 14 + ['\n'] * 3
        + list('.,()·~') + ['“', '”', '‘', '’', '①', '㉠', '😀', '👍🏽', '🇰🇷', '漢', 'é', '…'])
RAND = [''.join(random.choice(POOL) for _ in range(random.randint(1, 180))) for _ in range(160)]
LIMITS = [50, 250, 300, 500, 1000]
neis = [neis_case(t, 500) for t in HAND] + [neis_case(t, random.choice(LIMITS)) for t in RAND]
neis += [neis_case('가' * n, mx) for n, mx in ((500, 500), (501, 500), (300, 300), (301, 300), (50, 50), (1000, 1000), (1001, 1000), (250, 250))]
units = [unit_case(t) for t in HAND + RAND + ['가' * 1666, '가' * 1667, 'a' * 5000, '😀' * 1100, '👨‍👩‍👧' * 300]]
OUT.write_text(json.dumps({'note': '파이썬으로 따로 센 값(gen_units.py). 고치지 말고 다시 만든다.', 'neis': neis, 'units': units},
                          ensure_ascii=False, indent=0) + '\n', encoding='utf-8')
print(f'{OUT.name}: neis {len(neis)}개, units {len(units)}개')
