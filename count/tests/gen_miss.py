#!/usr/bin/env python3
"""기준값 만들기(3단계-2): '못 담는 글자'를 사람이 보는 글자 단위로 파이썬이 '따로' 센 값을 tests/cases-miss.json 에 적는다.

- cp949: 글을 regex \\X(글자 묶음)로 나누고, 묶음 안에 cp949 코덱으로 못 바꾸는 코드 포인트가 하나라도 있으면 그 묶음을 '못 담는 글자' 하나로 센다.
- sms  : 같은 방법으로, GSM-7 문자표(cases-sms.json 의 smsutil 문자표) 밖 글자가 든 묶음을 앞에서부터 서로 다른 것 8개까지 모은다.
글은 cases.json·cases-sms.json 의 것을 그대로 쓰고(그 파일들은 고치지 않는다) 평가에서 나온 예시 몇 개를 더한다.
돌리기: <venv>/bin/python count/tests/gen_miss.py   (pip install regex)
"""
import json, re
from pathlib import Path

import regex

HERE = Path(__file__).resolve().parent
OUT = HERE / 'cases-miss.json'
BREAK = re.compile(r'\r\n|\r|\n')
EXTRA = [
    '가족 👨‍👩‍👧 국기 🇰🇷 엄지 👍🏽 끝',          # 평가 L2: 이모지 3개인데 조각 9개로 나오던 글
    '가‍나 a​ b\tc',                # 보이지 않는 이음 글자·폭 없는 공백·탭
    'é é 한한',         # 합친 é, 풀어 쓴 é, 풀어 쓴 한글
    '😀😀😀 가 😀',                           # 같은 글자 여러 번
    '줄\r\n바꿈\n👍🏽\r끝',
    '',
]


def clusters(t):
    return [c for c in regex.findall(r'\X', t) if not BREAK.fullmatch(c)]


def cp949_ok(ch):
    try:
        ch.encode('cp949')
        return True
    except UnicodeEncodeError:
        return False


def first_unique(items, n=8):
    out = []
    for x in items:
        if x not in out:
            out.append(x)
            if len(out) >= n:
                break
    return out


def main():
    base = json.loads((HERE / 'cases.json').read_text(encoding='utf-8'))
    sms = json.loads((HERE / 'cases-sms.json').read_text(encoding='utf-8'))
    gsm = set(sms['gsm_basic']) | set(sms['gsm_ext'])

    def cp(t):
        bad = [c for c in clusters(t) if not all(cp949_ok(x) for x in c)]
        return [len(bad), first_unique(bad)]

    def sm(t):
        # 줄바꿈(CR·LF)은 GSM-7 문자표 안이라 걸리지 않는다
        return first_unique([c for c in regex.findall(r'\X', t) if not all(x in gsm for x in c)])

    out = {
        'made_with': f'python regex {regex.__version__} (\\X), cp949 codec',
        # cases.json 의 글 순서대로 [못 담는 글자 수, 서로 다른 것 앞 8개] (글은 되풀이해 적지 않는다)
        'cp949': [cp(c['text']) for c in base['cases']],
        'cp949_extra': [{'text': t, 'expect': cp(t)} for t in EXTRA],
        # cases-sms.json 의 글 순서대로 GSM-7 밖 글자(서로 다른 것 앞 8개)
        'sms': [sm(c['text']) for c in sms['cases']],
        'sms_extra': [{'text': t, 'expect': sm(t)} for t in EXTRA],
    }
    OUT.write_text(json.dumps(out, ensure_ascii=True, separators=(',', ':')), encoding='utf-8')
    n1 = sum(1 for c in out['cp949'] if c[0]); n2 = sum(1 for c in out['sms'] if c)
    print(f"cp949 {len(out['cp949'])}+{len(EXTRA)}개(못 담는 글자가 있는 글 {n1}개), sms {len(out['sms'])}+{len(EXTRA)}개(GSM-7 밖 글자가 있는 글 {n2}개) → {OUT.name}")


if __name__ == '__main__':
    main()
