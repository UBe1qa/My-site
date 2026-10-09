#!/usr/bin/env python3
"""기준값 만들기: 파이썬으로 '따로' 센 값을 tests/cases.json 에 적는다(자바스크립트 로직과 다른 방법).

쓰는 것: 표준 라이브러리(len, encode('utf-8'/'utf-16-le'/'cp949'/'euc_kr')), regex(\\X 글자 묶음, 유니코드 속성),
        grapheme(글자 묶음 두 번째 확인), uniseg(UAX #29 단어·문장), emoji(RGI 이모지 목록).
돌리기: <venv>/bin/python count/tests/gen_cases.py   (pip install regex grapheme uniseg emoji)
"""
import json, random, re, sys, unicodedata
from pathlib import Path

import regex
import grapheme
import emoji
from uniseg.wordbreak import words as uni_words
from uniseg.sentencebreak import sentences as uni_sentences

OUT = Path(__file__).resolve().parent / 'cases.json'
BREAK = re.compile(r'\r\n|\r|\n')
WS = regex.compile(r'\p{White_Space}')
EMOJI_MAX = 15.1   # 노드 22의 ICU(유니코드 16)와 파이썬 emoji 패키지가 함께 아는 판까지만 견준다


def fix_surrogates(t):
    return ''.join('�' if 0xD800 <= ord(c) <= 0xDFFF else c for c in t)


def units(t):
    return sum(2 if ord(c) > 0xFFFF else 1 for c in t)


def clusters(t):
    return regex.findall(r'\X', t)


def is_rgi(c):
    d = emoji.EMOJI_DATA.get(c)
    # 피부색·머리 모양 조각(component)은 혼자 있어도 유니코드 RGI 이모지 묶음(Basic_Emoji)에 든다
    return bool(d) and d['status'] in (emoji.STATUS['fully_qualified'], emoji.STATUS['component']) and d['E'] <= EMOJI_MAX


def klass(c):
    f = c[0]
    if WS.match(f):
        return 'space'
    if is_rgi(c):
        return 'emoji'
    if regex.fullmatch(r'[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]+', c):
        return 'invisible'
    if regex.match(r'\p{Script=Hangul}', f):
        return 'hangul'
    if regex.match(r'\p{Script=Han}', f):
        return 'hanja'
    if regex.match(r'\p{Script=Latin}', f):
        return 'latin'
    if regex.match(r'\p{Nd}', f):
        return 'digit'
    if regex.match(r'[\p{L}\p{N}\p{M}]', f):
        return 'letter'
    return 'symbol'


def cp949_stats(t):
    b = bad = ks = 0
    for ch in t:
        try:
            b += len(ch.encode('cp949'))
        except UnicodeEncodeError:
            bad += 1
            continue
        # 파이썬 euc_kr 코덱은 완성형 2,350자 밖의 한글을 8바이트 채움 조합으로 내보낸다 → 2바이트가 아니면 '완성형 밖'
        if len(ch.encode('cp949')) == 2 and len(ch.encode('euc_kr', errors='replace')) != 2:
            ks += 1
    return b, bad, ks


def expect(t, seg=False):
    cl = clusters(t)
    nb = [c for c in cl if c not in ('\r\n', '\r', '\n')]
    n_br = len(BREAK.findall(t))
    assert len(cl) - len(nb) == n_br, repr(t)
    g2 = grapheme.length(fix_surrogates(t))
    spaces = [c for c in nb if WS.match(c[0])]
    e = {
        'raw': {'graphemes': len(cl), 'codePoints': len(t), 'units': units(t)},
        'graphemes_alt': g2,
        'lineBreaks': n_br,
        'chars': [len(nb) + k * n_br for k in (0, 1, 2)],
        'charsNoSpace': len(nb) - len(spaces),
        'spaces': {'space': t.count(' '), 'tab': t.count('\t'),
                   'other': sum(1 for c in t if WS.match(c) and c not in ' \t\r\n')},
        'words': len([w for w in regex.split(r'\p{White_Space}+', t) if w]),
        'loneSurrogates': sum(1 for c in t if 0xD800 <= ord(c) <= 0xDFFF),
        'utf8': [], 'utf16': [], 'cp949': [],
    }
    norm = BREAK.sub('\n', t)
    ls = norm.split('\n')
    if t == '':
        e['lines'] = 0
    else:
        e['lines'] = len(ls) - (1 if norm.endswith('\n') else 0)
    e['paragraphs'] = sum(1 for l in ls if regex.search(r'\P{White_Space}', l))
    for k, rep in ((0, ''), (1, '\n'), (2, '\r\n')):
        t2 = BREAK.sub(rep, t)
        e['utf8'].append(len(fix_surrogates(t2).encode('utf-8')))
        e['utf16'].append(len(fix_surrogates(t2).encode('utf-16-le')))
        b, bad, ks = cp949_stats(t2)
        e['cp949'].append(b)
        e['cp949_bad'] = bad
        e['cp949_ks'] = ks
    cls = {}
    for c in nb:
        k = klass(c)
        cls[k] = cls.get(k, 0) + 1
    e['classes'] = cls
    # grapheme 패키지는 옛 유니코드 규칙이라 인도계 글자 묶음(GB9c)을 더 잘게 나눈다 → 그 글자가 든 글은 두 번째 확인에서 뺀다
    if regex.search(r'[\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Tamil}]', t):
        del e['graphemes_alt']
    # 단어(유니코드 규칙)는 영어 글에서만 견준다: 브라우저(ICU)는 한글·한자·가나를 사전으로 더 잘게 나눠 UAX #29 기본 규칙과 다르다
    if seg == 'en':
        ws = [w for w in uni_words(t) if regex.search(r'[\p{L}\p{N}]', w)]
        e['wordsSeg'] = len(ws)
    if seg:
        e['sentences'] = len([s for s in uni_sentences(t) if regex.search(r'\P{White_Space}', s)])
    return e


CURATED = [
    # (이름, 글, 단어·문장도 견줄지)
    ('빈 글', '', True),
    ('띄어쓰기 하나', ' ', True),
    ('줄바꿈 하나', '\n', True),
    ('한글 한 자', '가', True),
    ('한글 문장', '안녕하세요. 글자 수를 세어 봐요!', True),
    ('한글 두 문단', '첫 문단이에요. 두 문장이죠.\n\n둘째 문단은 한 문장.', True),
    ('가족 이모지', '👨‍👩‍👧', False),
    ('국기', '🇰🇷', False),
    ('피부색', '👍🏽', False),
    ('이모지 섞인 문장', '오늘 날씨 좋다 ☀️ 산책 가자 🐕‍🦺!', False),
    ('국기 셋', '🇰🇷🇺🇸🇯🇵', False),
    ('키캡', '1️⃣2️⃣#️⃣', False),
    ('텍스트 기호', '© ® ™ ☺ ‼', False),
    ('한글 자모 조합(NFD)', unicodedata.normalize('NFD', '한글 자모 조합'), False),
    ('한글 NFC 대 NFD', '각' + unicodedata.normalize('NFD', '각'), False),
    ('옛한글', 'ᄒᆞᆫ글 ᄇᆞᆰ', False),
    ('한자', '大韓民國 漢字', False),
    ('한자 확장 B', '𠀀𠀁 𪚥', False),
    ('전각', 'ＡＢＣ　１２３！', False),
    ('반각 가타카나', 'ｶﾞｷﾞ ｱｲｳ', False),
    ('탭', 'a\tb\tc', 'en'),
    ('CRLF', 'line1\r\nline2\r\nline3', 'en'),
    ('CR만', 'a\rb\rc', False),
    ('섞인 줄바꿈', 'a\r\n\nb\r\r\nc\n', False),
    ('끝 줄바꿈', '한 줄\n', True),
    ('빈 줄 여럿', '\n\n\n', True),
    ('공백만', '   \t  ', True),
    ('여러 공백', 'a  b   c', 'en'),
    ('노브레이크 스페이스', 'a b　c d', False),
    ('결합 문자', 'é ä́ ñ', False),
    ('데바나가리', 'नमस्ते क्षत्रिय', False),
    ('타이', 'สวัสดีครับ', False),
    ('아랍', 'مرحبا بالعالم', False),
    ('제로 폭 공백', 'a​b​c', False),
    ('BOM', '﻿hello', False),
    ('소프트 하이픈', 'co­operate', False),
    ('한글 채움 문자', 'ㅤㅤ가', False),
    ('방향 표시', 'abc‎‏def', False),
    ('외톨이 서로게이트', 'a\ud83db', False),
    ('외톨이 낮은 서로게이트', '\udc00', False),
    ('영어 문장', "The quick brown fox jumps over the lazy dog. It didn't stop, did it? No!", 'en'),
    ('영어 하이픈·소수', 'A well-known e-mail said pi is 3.14 and costs $1,000.50 (really).', 'en'),
    ('영어 약어', 'Dr. Smith went to Washington. He arrived at 5 p.m. on Jan. 3rd.', False),
    ('주소', 'See https://example.com/a?b=1 or mail me@example.org today', False),
    ('일본어', '私は学生です。東京に住んでいます。', False),
    ('중국어', '我是学生。我住在北京。', False),
    ('자소서 한 문단', '저는 대학에서 통계를 공부하며 데이터를 다루는 일의 즐거움을 알게 되었습니다. '
                 '3학년 때 지역 도서관 대출 기록 12만 건을 분석해 야간 개방 시간을 제안했고, 실제로 반영되었습니다.', True),
    ('따옴표·말줄임', '“그래요?” 그가 물었다… ‘아니요.’', False),
    ('수식 기호', '2 × 3 ÷ 4 ≠ 1 ± 0.5 ≤ 10 √2 ∞', False),
    ('NEIS식', '국어: 성실함.\r\n수학: 1학기 2등급', True),
    ('문자 90바이트 경계', '가' * 45, True),
    ('문자 90바이트 넘음', '가' * 45 + 'a', True),
    ('KS X 1001 밖 한글', '똠방각하 믜 쀍 뷁', False),
    ('유로·기호', '€100 ½ ℃ ㈜ ㎡ ⅓', False),
    ('깃발 태그', '🏴\U000E0067\U000E0062\U000E0065\U000E006E\U000E0067\U000E007F', False),
    ('ZWJ 뒤 기호', 'a‍© ©️', False),
    ('프리펜드', '؀123 ۝', False),
    ('변형 선택자만', '️️a', False),
    ('가‍나', '가‍나', False),
    ('자모 뒤 음절', 'ᄀ가 ᄀ각 각', False),
    ('1000자', ('가나다라마바사아자차' * 100), True),
]

POOLS = {
    'hangul': [chr(c) for c in range(0xAC00, 0xD7A4, 37)],
    'jamo': ['ᄀ', 'ᄂ', 'ᄒ', 'ᅡ', 'ᅩ', 'ᆞ', 'ᆨ', 'ᆫ', 'ᆯ'],
    'compat': list('ㄱㄴㅏㅣㅎㅋㅠ') + ['ㅤ'],
    'ascii': list('abcXYZ019.,!?-_()[]{}@#$%^&*\'"/\\~|'),
    'space': [' ', ' ', ' ', '\t', ' ', '　', ' ', '\u000b', '\u0085', ' ', ' '],
    'break': ['\n', '\n', '\r\n', '\r'],
    'combining': ['́', '̈', '̧', '⃝', '゙', '҃'],
    'control': ['​', '‌', '‍', '﻿', '­', '⁠', '‎', '\x00', '\x1f', '\x7f', '️', '︎'],
    'hanja': list('漢字韓國大中小人日月') + ['豈', '㐀', '𠀀', '𪚥'],
    'latin1': list('éüñßø×÷©®°±µ¿¡«»'),
    'greekcyr': list('αβγΩЖдя'),
    'fullwidth': list('ＡｂＣ１２３！？') + ['ｶ', 'ﾞ', 'ﾟ'],
    'kana': list('あいうアイウー、。「」'),
    'punct': list('“”‘’…—–·•※→←★☆♥♡♪') + ['‼', '⁉', '™', '☺', '☀', '✔'],
    'ri': [chr(c) for c in (0x1F1F0, 0x1F1F7, 0x1F1FA, 0x1F1F8, 0x1F1EF, 0x1F1F5)],
    'astral': ['𝒜', '𝟙', '😀', '🙂', '🧑', '🏽', '🏻', '\U0001F3F4'],
    'deva': list('कखगतस') + ['्', 'ा', 'ं'],
    'thai': list('สวัดีครับ'),
    'arabic': list('مرحبا') + ['؀', 'َ'],
    'lone': ['\ud800', '\udc00', '\ud83d'],
}


def emoji_pool():
    out = []
    for k, d in emoji.EMOJI_DATA.items():
        if d['status'] == emoji.STATUS['fully_qualified'] and d['E'] <= EMOJI_MAX:
            out.append(k)
    out.sort()
    return out


def main():
    rnd = random.Random(20261009)
    cases = []
    for name, text, seg in CURATED:
        cases.append({'name': name, 'text': text, 'seg': seg, 'expect': expect(text, seg)})
    em = emoji_pool()
    keys = list(POOLS)
    # 섞어 만든 글(가중치는 실제 글에 가깝게: 한글·영문·공백이 많고 나머지가 끼어든다)
    for n in range(700):
        size = rnd.choice([1, 2, 3, 5, 8, 13, 30, 80])
        parts = []
        mode = rnd.choice(['plain', 'plain', 'mixed', 'wild', 'emoji'])
        for _ in range(size):
            r = rnd.random()
            if mode == 'plain':
                pool = 'hangul' if r < .55 else 'ascii' if r < .75 else 'space' if r < .93 else 'break'
            elif mode == 'emoji':
                pool = 'EMOJI' if r < .5 else 'hangul' if r < .7 else 'ascii' if r < .8 else rnd.choice(['space', 'control', 'ri', 'astral', 'combining'])
            elif mode == 'mixed':
                pool = rnd.choice(['hangul', 'hangul', 'ascii', 'space', 'break', 'hanja', 'latin1', 'fullwidth', 'kana', 'punct', 'compat', 'greekcyr', 'EMOJI'])
            else:
                pool = rnd.choice(keys + ['EMOJI'])
            parts.append(rnd.choice(em) if pool == 'EMOJI' else rnd.choice(POOLS[pool]))
        # 외톨이 서로게이트 둘이 우연히 붙으면 JSON을 읽는 쪽(자바스크립트)에선 한 글자가 된다 → 파이썬에서도 미리 합친다
        text = ''.join(parts).encode('utf-16-le', 'surrogatepass').decode('utf-16-le', 'surrogatepass')
        cases.append({'name': 'fuzz-%s-%d' % (mode, n), 'text': text, 'seg': False, 'expect': expect(text)})
    # 이모지 전부(RGI, 판 EMOJI_MAX까지): 하나가 한 글자·종류는 이모지
    emo = [{'e': k, 'cp': len(k), 'units': units(k), 'utf8': len(k.encode('utf-8'))} for k in em]
    # 표 대조용: White_Space 전부, CP949 2바이트 글자 전부(범위로)
    ws = [cp for cp in range(0x110000) if not 0xD800 <= cp <= 0xDFFF and WS.match(chr(cp))]
    two = []
    ksx = []
    for cp in range(0x10000):
        if 0xD800 <= cp <= 0xDFFF:
            continue
        try:
            if len(chr(cp).encode('cp949')) == 2:
                two.append(cp)
                if len(chr(cp).encode('euc_kr', errors='replace')) == 2:
                    ksx.append(cp)
        except UnicodeEncodeError:
            pass

    def ranges(xs):
        r = []
        s = p = xs[0]
        for c in xs[1:]:
            if c == p + 1:
                p = c
            else:
                r.append([s, p]); s = p = c
        r.append([s, p])
        return r

    data = {
        'made_with': {'python': sys.version.split()[0], 'unicodedata': unicodedata.unidata_version,
                      'regex': regex.__version__, 'emoji_max': EMOJI_MAX},
        'cases': cases,
        'emoji': emo,
        'white_space': ws,
        'cp949_two_byte_ranges': ranges(two),
        'ksx1001_two_byte_ranges': ranges(ksx),
    }
    OUT.write_text(json.dumps(data, ensure_ascii=True, separators=(',', ':')), encoding='ascii')
    print('wrote', OUT, len(cases), 'cases,', len(emo), 'emoji,', len(two), 'cp949,', len(ksx), 'ksx')


if __name__ == '__main__':
    main()
