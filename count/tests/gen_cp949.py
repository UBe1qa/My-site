#!/usr/bin/env python3
"""assets/lc-cp949.js 를 만든다 (CP949·EUC-KR로 담을 수 있는 글자 표).

기준: 파이썬 표준 코덱 'cp949'(윈도우 한글 완성형 확장)와 'euc_kr'(KS X 1001 완성형).
돌리기: python3 count/tests/gen_cp949.py   (표준 라이브러리만 쓴다)
만든 파일은 손으로 고치지 않는다.
"""
import base64
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'lc-cp949.js'


def encodable(cp, codec):
    try:
        return len(chr(cp).encode(codec))
    except UnicodeEncodeError:
        return 0


def bitmap(start, end, pred):
    n = end - start + 1
    buf = bytearray((n + 7) // 8)
    for k in range(n):
        if pred(start + k):
            buf[k >> 3] |= 1 << (k & 7)
    return base64.b64encode(bytes(buf)).decode('ascii')


def main():
    two = set()
    for cp in range(0x10000):
        if 0xD800 <= cp <= 0xDFFF:
            continue
        n = encodable(cp, 'cp949')
        if n == 2:
            two.add(cp)
        elif n == 1:
            assert cp < 0x80, hex(cp)
    for cp in range(0x10000, 0x110000):
        assert not encodable(cp, 'cp949')
    ks = {cp for cp in two if encodable(cp, 'euc_kr') == 2}
    assert all(0xAC00 <= c <= 0xD7A3 for c in two - ks), 'cp949 전용 글자는 한글 음절뿐이어야 한다'
    assert not (ks - two)
    assert all(c in two for c in range(0xAC00, 0xD7A4)), '한글 음절 11,172자는 모두 CP949에 있다'
    assert all(c in two for c in range(0xF900, 0xFA0C))
    rest = sorted(c for c in two if not (0xAC00 <= c <= 0xD7A3 or 0x4E00 <= c <= 0x9FFF or 0xF900 <= c <= 0xFA0B))
    ranges = []
    s = p = rest[0]
    for c in rest[1:]:
        if c == p + 1:
            p = c
        else:
            ranges.append((s, p))
            s = p = c
    ranges.append((s, p))
    flat = ','.join('%d,%d' % (a, b - a) for a, b in ranges)
    han = bitmap(0x4E00, 0x9FFF, lambda c: c in two)
    ksx = bitmap(0xAC00, 0xD7A3, lambda c: c in ks)
    js = f"""/* 자동 생성: python3 count/tests/gen_cp949.py (손으로 고치지 않는다)
   CP949(윈도우 한글 코드 페이지)로 2바이트에 담기는 글자 {len(two):,}자의 표.
   - 한글 음절 U+AC00~D7A3 전부(11,172자), 한자 호환 U+F900~FA0B 전부(268자)
   - han: 한자 U+4E00~9FFF 비트맵({sum(1 for c in two if 0x4E00 <= c <= 0x9FFF):,}자)
   - rest: 그 밖의 기호·문자 {len(rest)}자 = [시작, 길이-1] 쌍
   - ksx: 옛 완성형(KS X 1001, 좁은 뜻의 EUC-KR)에도 있는 한글 음절 {len(ks & set(range(0xAC00, 0xD7A4))):,}자 비트맵
   기준 = 파이썬 표준 코덱 cp949, euc_kr */
(function (root) {{
  var LC = root.LC || (root.LC = {{}});
  LC.CP949 = {{
    han: "{han}",
    rest: [{flat}],
    ksx: "{ksx}"
  }};
  if (LC._cp949Ready) LC._cp949Ready();
}})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
"""
    OUT.write_text(js, encoding='utf-8')
    print('wrote', OUT, len(js), 'bytes;', len(two), 'two-byte chars;', len(ranges), 'ranges')


if __name__ == '__main__':
    main()
