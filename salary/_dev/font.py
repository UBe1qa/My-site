#!/usr/bin/env python3
"""화면 글자만 담은 글꼴 조각 만들기: python3 -B salary/_dev/font.py   (필요: pip install fonttools brotli)

왜: 첫 화면이 jsDelivr의 Pretendard 나눠 받기 조각 15개(약 400KB)를 받고 있었다(제3자 평가 2026-10-10). 이 사이트 화면에 실제로 나오는 글자와
    쓰는 굵기(400~800)만 남기면 언어판마다 파일 하나로 줄고, 다른 곳(jsDelivr)에 접속하지 않아도 된다.
무엇을: 만든 페이지(먼저 build.py 를 돌린다)의 글자 + 화면 코드(pay-view.js·app.js·pay-core.js)가 넣는 글자를 언어판마다 모아
    Pretendard Variable 에서 그 글자만 남긴 assets/fonts/tk-<언어>-<지문>.woff2 를 만들고, 파일 이름·글자 범위를 _dev/fonts.json 에 적은 뒤
    build.py 를 다시 돌려 <head> 의 preload·@font-face 를 맞춘다.
조각에 없는 글자(칸에 직접 넣은 드문 글자, 원본 글꼴에 없는 한자 月 등)는 기기 글꼴로 보인다. jsDelivr 의 나눠 받기 CSS 는 더 쓰지 않는다
(이 사이트는 넣은 글자를 칸 밖에 그리지 않아서 얻는 것이 없고, 원본에 없는 글자 하나 때문에 조각을 받으러 가는 일만 생겼다).
글을 고쳐 새 글자가 생기면 check.py 가 알려 준다 → 이 스크립트를 다시 돌린다. 같은 글자면 같은 파일(같은 이름)이 나온다.

원본 글꼴: 환경 변수 TK_FONT_SRC(PretendardVariable.woff2 경로). 없으면 jsDelivr 에서 font_css.py 의 VER 과 같은 판을 받아 임시 폴더에 둔다(만들 때만 접속한다).
라이선스: Pretendard 는 SIL OFL 1.1 이고 'Pretendard' 는 예약된 글꼴 이름이라, 조각 안의 이름은 'TK Sans' 로 바꾸고 전문을 assets/fonts/OFL.txt 로 함께 둔다.
          전문은 환경 변수 TK_FONT_LICENSE(파일 경로)나 jsDelivr 에서 가져온다. 이미 있으면 머리말만 다시 쓴다.
"""
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

from chars import screen_chars  # noqa: E402

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
OUT = ROOT / 'assets' / 'fonts'
VER = re.search(r"VER = 'v([\d.]+)'", (DEV / 'font_css.py').read_text(encoding='utf-8')).group(1)
KEEP = {0, 5, 13, 14}  # 그대로 두는 이름 항목: 저작권, 판, 라이선스 설명, 라이선스 주소
WGHT = (400, 800)      # style.css 가 쓰는 굵기 범위
NAME = 'TK Sans'
OFL_HEAD = (f'tk-*.woff2 are subsets of Pretendard Variable {VER}: only the characters shown on this site, weights {WGHT[0]} to {WGHT[1]}.\n'
            f'They are renamed "{NAME}" because "Pretendard" is a Reserved Font Name. Made by _dev/font.py.\n\n')


def source():
    src = os.environ.get('TK_FONT_SRC')
    if src:
        return src
    path = Path(tempfile.gettempdir()) / f'pretendard-{VER}' / 'PretendardVariable.woff2'
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        url = f'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v{VER}/dist/web/variable/woff2/PretendardVariable.woff2'
        subprocess.run(['curl', '-fsSL', '--max-time', '120', '-o', str(path), url], check=True)
    return str(path)


def make(src, text):
    f = TTFont(src, recalcTimestamp=False)  # 같은 글자면 같은 파일이 나오게
    o = subset.Options()
    o.layout_features += ['tnum']           # 숫자 폭 맞춤(tabular-nums)
    o.hinting = False
    o.name_IDs = sorted(KEEP | {1, 2, 3, 4, 6})
    o.name_languages = [0x409]
    s = subset.Subsetter(o)
    s.populate(text=text)
    s.subset(f)
    f = instancer.instantiateVariableFont(f, {'wght': WGHT})
    for n in f['name'].names:
        if n.nameID not in KEEP:
            n.string = n.toUnicode().replace('PretendardVariable', NAME.replace(' ', '')).replace('Pretendard Variable', NAME).replace('Pretendard', NAME)
    left = [n.nameID for n in f['name'].names if n.nameID not in KEEP and 'pretendard' in n.toUnicode().lower()]
    assert not left, f'예약된 이름이 남음: {left}'
    f.flavor = 'woff2'
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue(), sorted(f.getBestCmap())


def ranges(cps):
    out, i = [], 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1:
            j += 1
        out.append(f'U+{cps[i]:X}' if i == j else f'U+{cps[i]:X}-{cps[j]:X}')
        i = j + 1
    return ','.join(out)


def license_text():
    src = os.environ.get('TK_FONT_LICENSE')
    if src:
        t = Path(src).read_text(encoding='utf-8')
        return t[t.index('Copyright'):] if 'Copyright' in t else t
    old = OUT / 'OFL.txt'
    if old.exists() and 'SIL OPEN FONT LICENSE' in old.read_text(encoding='utf-8'):
        t = old.read_text(encoding='utf-8')
        return t[t.index('Copyright'):]
    r = subprocess.run(['curl', '-fsSL', '--max-time', '60', f'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v{VER}/LICENSE'], capture_output=True, text=True)
    if r.returncode == 0 and 'SIL OPEN FONT LICENSE' in r.stdout:
        return r.stdout
    sys.exit('라이선스 전문(LICENSE)을 받지 못했어요. TK_FONT_LICENSE 로 파일 경로를 주세요.')


def main():
    subprocess.run([sys.executable, '-B', str(DEV / 'build.py')], check=True)   # 글자를 모을 페이지가 최신이게
    src = source()
    chars = screen_chars()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'note': '_dev/font.py 가 만든 파일. 손으로 고치지 않는다.', 'source': f'Pretendard Variable {VER}', 'family': NAME, 'weights': list(WGHT)}
    keep = set()
    for lang in ('ko', 'en'):
        data, cps = make(src, chars[lang])
        name = f'tk-{lang}-{hashlib.sha256(data).hexdigest()[:8]}.woff2'
        (OUT / name).write_bytes(data)
        keep.add(name)
        have = ''.join(chr(c) for c in cps)
        missing = ''.join(c for c in chars[lang] if ord(c) not in set(cps))
        manifest[lang] = {'file': name, 'bytes': len(data), 'count': len(cps), 'chars': have, 'range': ranges(cps), 'not_in_source': missing}
        print(f'assets/fonts/{name}  {len(data):,} bytes  글자 {len(cps)}개' + (f'  (원본 글꼴에 없는 글자 {len(missing)}개: {missing})' if missing else ''))
    for old in OUT.glob('tk-*.woff2'):
        if old.name not in keep:
            old.unlink()
    (OUT / 'OFL.txt').write_text(OFL_HEAD + license_text(), encoding='utf-8')
    (DEV / 'fonts.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    subprocess.run([sys.executable, '-B', str(DEV / 'build.py')], check=True)


if __name__ == '__main__':
    main()
