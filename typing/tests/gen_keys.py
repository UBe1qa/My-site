#!/usr/bin/env python3
"""기준값 더하기: 한국어 연습 글마다 '실제로 누르는 키 수'와 '받침이 다음 글자로 넘어가는 횟수'.   python3 typing/tests/gen_keys.py
파이썬 표준 라이브러리(unicodedata)만 쓴다. 우리 코드(tj-core.js)와 다른 방법이다:
  - 글자를 NFD 로 풀어 초성·중성·종성 자모를 얻고, 유니코드 글자 이름으로 키 수를 센다
    (겹모음 WA·WAE·OE·WEO·WE·WI·YI 는 키 둘, 겹받침은 이름에 '-' 가 있고 키 둘, 쌍자음은 Shift 를 같이 누르는 키 하나).
  - 받침이 넘어가는 횟수: 두벌식 입력기는 자음을 치면 일단 앞 글자의 받침으로 붙였다가(붙일 수 있을 때), 바로 뒤에 모음이 오면 다음 글자로 옮긴다.
    붙일 수 있는 경우 = 앞 글자에 받침이 없고 그 자음이 받침으로 쓰이는 자음일 때, 또는 앞 글자의 홑받침과 겹받침을 이룰 때(종성 글자 이름으로 판단).
tests/ref/ref.json 의 keys 칸에 적는다. 연습 글(assets/tj-text-ko.js)을 고치면 다시 돌린다. run.mjs 'keyflow' 묶음이 쓴다.
"""
import hashlib
import json
import re
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / 'assets' / 'tj-text-ko.js'
OUT = HERE / 'ref' / 'ref.json'

src = re.sub(r'/\*.*?\*/', '', SRC.read_text(encoding='utf-8'), flags=re.S)
texts = [t for t in re.findall(r"'([^'\n]*)'", src) if re.search('[가-힣]', t)]

JONG_NAMES = set()
for cp in range(0x11A8, 0x11C3):
    JONG_NAMES.add(unicodedata.name(chr(cp)).replace('HANGUL JONGSEONG ', ''))
TWO_KEY_VOWELS = {'WA', 'WAE', 'OE', 'WEO', 'WE', 'WI', 'YI'}


def parts(ch):
    """글자 하나 → (초성 이름, 중성 이름, 종성 이름 또는 None). 한글 음절이 아니면 None"""
    if not ('가' <= ch <= '힣'):
        return None
    d = unicodedata.normalize('NFD', ch)
    n = [unicodedata.name(x) for x in d]
    return (n[0].replace('HANGUL CHOSEONG ', ''), n[1].replace('HANGUL JUNGSEONG ', ''), n[2].replace('HANGUL JONGSEONG ', '') if len(n) > 2 else None)


def count(text):
    keys = moves = 0
    prev = None
    for ch in text:
        p = parts(ch)
        if p is None:
            keys += 1
            prev = None
            continue
        cho, jung, jong = p
        keys += 1 + (2 if jung in TWO_KEY_VOWELS else 1) + (0 if jong is None else (2 if '-' in jong else 1))
        if prev is not None:
            pj = prev[2]
            if (pj is None and cho in JONG_NAMES) or (pj is not None and '-' not in pj and (pj + '-' + cho) in JONG_NAMES):
                moves += 1
        prev = p
    return keys, moves


per = [count(t) for t in texts]
data = json.loads(OUT.read_text(encoding='utf-8'))
data['keys'] = {
    'n': len(texts), 'sha': hashlib.sha256('\n'.join(texts).encode('utf-8')).hexdigest(),
    'total': sum(k for k, _ in per), 'moves': sum(m for _, m in per),
    'per': ';'.join(f'{k},{m}' for k, m in per),
    'made_with': 'python unicodedata ' + unicodedata.unidata_version,
}
OUT.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
print('texts', len(texts), 'keys', data['keys']['total'], 'moves', data['keys']['moves'])
