#!/usr/bin/env python3
"""기준값 만들기(우리 코드와 다른 방법으로): tests/ref/ref.json

돌리는 법(시험용 설치는 저장소 밖 폴더에):
  python3 -m venv <밖 폴더>/venv && <밖 폴더>/venv/bin/pip install inko-py
  <밖 폴더>/venv/bin/python typing/tests/gen_ref.py
  node typing/tests/gen_ref.mjs <밖 폴더>/node_modules     (hangul-js·es-hangul 대조값을 같은 파일에 더한다)

담는 것
- syll: 한글 음절 11,172자 전부의 두벌식 쿼티 글자열(inko-py ko2en). 대문자 = Shift.
- nfd: 같은 음절을 파이썬 unicodedata NFD로 풀어 얻은 초성·중성·종성 번호(글자 하나 = 'A' + 번호).
- names: 유니코드 글자 이름(초성 19, 중성 21, 종성 27). 겹받침 이름('KIYEOK-SIOS')에서 글쇠 두 개를 읽는다.
- ime: 짧은 글을 한 글쇠씩 칠 때마다 입력기가 보여 주는 글(inko-py en2ko에 글쇠 앞부분을 차례로 넣음).
- lone: 낱자(호환 자모 U+3131~U+3163) 51자의 쿼티 글자열(inko-py). 겹자음 낱자 11자(ㄳ 등)는 inko-py가 빈 글을 돌려준다.
- loneNames: 같은 51자의 유니코드 글자 이름(겹자음 낱자는 이 이름으로 대조한다).
- crc: 파이썬 zlib.crc32 값(오늘의 문장 씨앗).
"""
import json
import unicodedata
import zlib
from pathlib import Path

import inko

OUT = Path(__file__).resolve().parent / 'ref' / 'ref.json'
conv = inko.Inko()

syll, l, v, t = [], [], [], []
for cp in range(0xAC00, 0xD7A4):
    ch = chr(cp)
    syll.append(conv.ko2en(ch))
    d = unicodedata.normalize('NFD', ch)
    assert len(d) in (2, 3)
    l.append(chr(65 + ord(d[0]) - 0x1100))
    v.append(chr(65 + ord(d[1]) - 0x1161))
    t.append(chr(65 + (ord(d[2]) - 0x11A7 if len(d) == 3 else 0)))


def names(start, count, prefix):
    out = []
    for i in range(count):
        n = unicodedata.name(chr(start + i))
        assert n.startswith(prefix), n
        out.append(n[len(prefix):])
    return out


PHRASES = [
    '가나', '한글', '값이', '닭이', '읽어요', '앉아서', '많이', '깎아', '있어요', '과일', '봬요', '의자', '웨이터', '쌓다', '뚫어',
    '삶의 값', '없어요', '꿇고', '핥아', '읊어', '외곬으로', '넓이', '옮겨', '괜찮아', '얘기', '예의', '몫을', '훑어', '밟아', '젊어',
    '끓여', '싫어', '같이 가요', '학교에 갔어요.', '안녕하세요', '뒤쪽', '귀찮다', '쥐', '되어', '갈가', '달기', '없이', '빨리빨리',
    '또 봐요!', '궤도', '눈, 비', '쉬워요?', '각사', '옷이', '꽃을',
]
ime = []
for p in PHRASES:
    keys = conv.ko2en(p)
    steps = [conv.en2ko(keys[:i]) for i in range(1, len(keys) + 1)]
    assert steps[-1] == p, (p, steps[-1])
    ime.append({'text': p, 'keys': keys, 'steps': steps})

CRC_IN = ['', 'a', 'abc', '2026-10-10', '2026-10-11', '2027-01-01', 'ko:2026-10-10', '한글', 'The quick brown fox jumps over the lazy dog']
crc = {s: zlib.crc32(s.encode('utf-8')) & 0xFFFFFFFF for s in CRC_IN}

data = {}
if OUT.exists():
    data = json.loads(OUT.read_text(encoding='utf-8'))
data.update({
    'made_with': 'python unicodedata %s, inko-py' % unicodedata.unidata_version,
    'syll': syll,
    'nfd': {'l': ''.join(l), 'v': ''.join(v), 't': ''.join(t)},
    'names': {
        'cho': names(0x1100, 19, 'HANGUL CHOSEONG '),
        'jung': names(0x1161, 21, 'HANGUL JUNGSEONG '),
        'jong': names(0x11A8, 27, 'HANGUL JONGSEONG '),
    },
    'ime': ime,
    'lone': [conv.ko2en(chr(cp)) for cp in range(0x3131, 0x3164)],
    'loneNames': names(0x3131, 51, 'HANGUL LETTER '),
    'crc': crc,
})
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('wrote', OUT, OUT.stat().st_size, 'bytes,', len(syll), 'syllables,', len(ime), 'phrases')
