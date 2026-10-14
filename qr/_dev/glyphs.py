#!/usr/bin/env python3
"""틀 문구 글자 모양 만들기: python3 -B qr/_dev/glyphs.py   (pip install fonttools)
틀(스티커) 문구는 글꼴 파일을 화면에 부르지 않고, 글자 모양을 path 로 바꿔 둔 JSON 에서 그린다.
그래서 미리보기·PNG·SVG·PDF·EPS 에서 글자 모양이 같고, 받는 파일에 글꼴이 필요 없다.
- 글꼴: BM JUA(배달의민족 주아체, SIL OFL 1.1) = 한글·영문·숫자. 주아에 없는 라틴 확장(é ñ ü ß œ …)·흔한 기호(€ £ © ™ – — … ¡ ¿)는
  Fredoka(SIL OFL 1.1, 굵기 600 으로 고정)에서 가져와 주아의 대문자 높이에 맞춰 키운다. 화살표·체크(→ ← ↑ ↓ ✓ ✔)는 두 글꼴에 없어 여기서 그린다.
  원본 TTF 는 QR_FONT_SRC(주아)·QR_FONT_LATIN(Fredoka 변수 글꼴)로 주거나 jsDelivr(google/fonts)에서 받는다.
- assets/glyphs/base.json = 영문·숫자·기호 + 화면에 미리 넣은 문구의 한글. 나머지는 조각(필요할 때만 부른다):
  ko-<n>.json(한글 80자씩), lat.json(라틴 확장), sym.json(기호). base.json 의 chunks = [[첫 글자, 끝 글자, 조각 이름]…].
  어느 조각에도 없는 글자는 화면이 입력하는 순간 '그릴 수 없어요'로 알린다.
- 좌표는 글꼴 단위를 4 로 나눈 정수(250 = 한 글자 높이), y 는 위로. 명령은 M L Q Z 만.
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'glyphs'
SRC = os.environ.get('QR_FONT_SRC', '')
URL = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/jua/Jua-Regular.ttf'
LIC = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/jua/OFL.txt'
LAT_SRC = os.environ.get('QR_FONT_LATIN', '')
LAT_URL = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/fredoka/Fredoka%5Bwdth,wght%5D.ttf'
LAT_LIC = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/fredoka/OFL.txt'
LATIN = [chr(c) for c in range(0xA1, 0x180) if c not in (0xAD,)]   # 라틴-1 보충 + 라틴 확장-A
SYMS = list('–—‘’‚“”„•…‰€₩™←↑→↓✓✔')
CHUNK = 80   # 한글 조각 하나에 담을 글자 수(직접 쓴 문구에 필요한 조각만 받게 작게)

from fontTools.ttLib import TTFont  # noqa: E402
from fontTools.pens.basePen import BasePen  # noqa: E402


Q = 4   # 좌표를 글꼴 단위 4 로 나눠 정수로(한 글자 높이 = 250). 틀 문구 크기에서는 차이가 보이지 않고 파일이 작아진다


def q(v):
    return round(v / Q)


class Pen(BasePen):
    def __init__(self, gs):
        super().__init__(gs)
        self.o = []
        self.last = None

    def _moveTo(self, p):
        self.o.append('M%d %d' % (q(p[0]), q(p[1])))
        self.last = (q(p[0]), q(p[1]))

    def _lineTo(self, p):
        pt = (q(p[0]), q(p[1]))
        if pt != self.last:
            self.o.append('L%d %d' % pt)
        self.last = pt

    def _qCurveToOne(self, a, b):
        pa, pb = (q(a[0]), q(a[1])), (q(b[0]), q(b[1]))
        if pb == self.last:
            return
        if pa == pb or pa == self.last:   # 줄였더니 곧은 선이 된 곡선
            self.o.append('L%d %d' % pb)
        else:
            self.o.append('Q%d %d %d %d' % (pa + pb))
        self.last = pb

    def _curveToOne(self, a, b, c):  # TTF 에는 없지만 혹시 오면 곧은 선으로 이어 둔다
        self.o.append('L%d %d' % (q(c[0]), q(c[1])))
        self.last = (q(c[0]), q(c[1]))

    def _closePath(self):
        self.o.append('Z')

    _endPath = _closePath


def font_path():
    if SRC:
        return Path(SRC)
    cache = Path(os.environ.get('TMPDIR', '/tmp')) / 'qr-jua' / 'Jua-Regular.ttf'
    if not cache.exists():
        cache.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, cache)
        urllib.request.urlretrieve(LIC, cache.parent / 'OFL.txt')
    return cache


def base_chars():
    """영문·숫자·기호 + 화면에 들어 있는 틀 문구(content.py 의 FRAME_WORDS, 꾸밈 세트의 문구)의 글자."""
    sys.path.insert(0, str(ROOT / '_dev'))
    import content as C
    chars = {chr(c) for c in range(0x21, 0x7F)}
    for lang in ('ko', 'en'):
        for w in C.FRAME_WORDS[lang]:
            chars |= set(w)
    pre = (ROOT / 'assets' / 'qr-presets.js').read_text(encoding='utf-8')
    chars |= {ch for ch in pre if '가' <= ch <= '힣'}
    chars |= set('·…→←↑↓★♥✓')
    return chars


def latin_font():
    if LAT_SRC:
        p = Path(LAT_SRC)
    else:
        p = Path(os.environ.get('TMPDIR', '/tmp')) / 'qr-jua' / 'Fredoka.ttf'
        if not p.exists():
            p.parent.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(LAT_URL, p)
            urllib.request.urlretrieve(LAT_LIC, p.parent / 'OFL-Fredoka.txt')
    f = TTFont(str(p))
    if 'fvar' in f:
        from fontTools.varLib import instancer
        f = instancer.instantiateVariableFont(f, {'wght': 600, 'wdth': 100})
    return f, p.parent / 'OFL-Fredoka.txt'


# 두 글꼴에 없는 화살표·체크: 주아 단위(대문자 높이 712)로 직접 그린 모양 [나아감, path]
def drawn():
    def poly(pts):
        return 'M' + 'L'.join('%d %d' % (round(x / Q), round(y / Q)) for x, y in pts) + 'Z'
    w, t = 760, 110   # 글자 폭, 선 굵기(반)
    right = poly([(60, 356 - t), (480, 356 - t), (480, 356 - 250), (720, 356), (480, 356 + 250), (480, 356 + t), (60, 356 + t)])
    left = poly([(700, 356 - t), (280, 356 - t), (280, 356 - 250), (40, 356), (280, 356 + 250), (280, 356 + t), (700, 356 + t)])
    up = poly([(380 - t, 0), (380 - t, 420), (380 - 250, 420), (380, 712), (380 + 250, 420), (380 + t, 420), (380 + t, 0)])
    down = poly([(380 - t, 712), (380 - t, 292), (380 - 250, 292), (380, 0), (380 + 250, 292), (380 + t, 292), (380 + t, 712)])
    check = poly([(60, 380), (180, 500), (300, 300), (620, 690), (740, 570), (300, 60)])
    return {'→': [round(w / Q), right], '←': [round(w / Q), left], '↑': [round(w / Q), up], '↓': [round(w / Q), down], '✓': [round(800 / Q), check], '✔': [round(800 / Q), check]}


def main():
    fp = font_path()
    f = TTFont(str(fp))
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    hmtx = f['hmtx']
    em = f['head'].unitsPerEm
    # 글자가 실제로 차지하는 높이(한글 기준)로 위아래를 잡는다: 틀 칸 안에서 글자가 너무 작아 보이지 않게
    sample = [cmap[ord(c)] for c in '한글SCANMEgjy' if ord(c) in cmap]
    from fontTools.pens.boundsPen import BoundsPen
    lo, hi = 0, 0
    for g in sample:
        bp = BoundsPen(gs)
        gs[g].draw(bp)
        if bp.bounds:
            lo, hi = min(lo, bp.bounds[1]), max(hi, bp.bounds[3])

    def glyph(ch):
        name = cmap.get(ord(ch))
        if not name:
            return None
        pen = Pen(gs)
        gs[name].draw(pen)
        return [q(hmtx[name][0]), ''.join(pen.o)]

    # 라틴 확장 글꼴: 대문자 H 높이를 주아에 맞춰 키운다
    lf, lic2 = latin_font()
    lgs, lcm, lhm = lf.getGlyphSet(), lf.getBestCmap(), lf['hmtx']

    def cap(gset, cm):
        bp = BoundsPen(gset)
        gset[cm[ord('H')]].draw(bp)
        return bp.bounds[3]
    k = cap(gs, cmap) / cap(lgs, lcm)
    from fontTools.pens.transformPen import TransformPen

    def lglyph(ch):
        name = lcm.get(ord(ch))
        if not name:
            return None
        pen = Pen(lgs)   # 악센트 글자는 다른 글자(부품)를 불러 쓰므로 Fredoka 의 글자 모음으로 그린다
        lgs[name].draw(TransformPen(pen, (k, 0, 0, k, 0, 0)))
        return [q(lhm[name][0] * k), ''.join(pen.o)]

    base = sorted(c for c in base_chars() if ord(c) in cmap)
    hangul = sorted(chr(c) for c in cmap if 0xAC00 <= c <= 0xD7A3 and chr(c) not in base)
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.json'):
        old.unlink()
    chunks = [hangul[i:i + CHUNK] for i in range(0, len(hangul), CHUNK)]
    index = [[ord(c[0]), ord(c[-1]), f'ko-{i}'] for i, c in enumerate(chunks)]
    # 라틴 확장: 주아에 있으면 주아, 없으면 Fredoka
    lat = {}
    for ch in LATIN:
        if ch in base:
            continue
        g = glyph(ch) if ord(ch) in cmap else lglyph(ch)
        if g:
            lat[ch] = g
    sym, hand = {}, drawn()
    for ch in SYMS:
        g = glyph(ch) if ord(ch) in cmap else (lglyph(ch) if ord(ch) in lcm else hand.get(ch))
        if g:
            sym[ch] = g
    index.append([0xA1, 0x17F, 'lat'])
    index.append([0x2013, 0x2714, 'sym'])
    head = {'em': q(em), 'asc': q(hi), 'desc': q(lo), 'font': 'BM JUA + Fredoka (SIL OFL 1.1)', 'chunks': index,
            'sets': {'lat': sorted(lat), 'sym': sorted(sym)}, 'g': {c: glyph(c) for c in base}}
    (OUT / 'base.json').write_text(json.dumps(head, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    for i, c in enumerate(chunks):
        (OUT / f'ko-{i}.json').write_text(json.dumps({c2: glyph(c2) for c2 in c}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (OUT / 'lat.json').write_text(json.dumps(lat, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (OUT / 'sym.json').write_text(json.dumps(sym, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    lic = fp.parent / 'OFL.txt'
    if lic.exists():
        (OUT / 'OFL-Jua.txt').write_text(lic.read_text(encoding='utf-8'), encoding='utf-8')
    if lic2.exists():
        (OUT / 'OFL-Fredoka.txt').write_text(lic2.read_text(encoding='utf-8'), encoding='utf-8')
    sizes = sorted((p.name, p.stat().st_size) for p in OUT.glob('*.json'))
    print(f'base {len(base)}자, 한글 조각 {len(chunks)}개({len(hangul)}자), 라틴 {len(lat)}자, 기호 {len(sym)}자:', ', '.join(f'{n} {s // 1024}KB' for n, s in sizes if not n.startswith('ko-')))


if __name__ == '__main__':
    main()
