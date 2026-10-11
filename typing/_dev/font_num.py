#!/usr/bin/env python3
"""숫자·키 글자용 글꼴 조각 만들기: python3 -B typing/_dev/font_num.py   (필요: pip install fonttools brotli)

왜: 숫자 줄의 키캡, 결과의 큰 숫자, 화면 자판의 영문 글자에 '키에 새긴 글자' 느낌의 둥근 네모 글꼴(Rubik 700)을 쓴다(사이트의 개성 한 군데).
    숫자·영문·기호 100자 남짓만 남겨 10KB 안쪽 파일 하나로 만든다. 한글은 지금처럼 Todok Sans(Pretendard).
무엇을: assets/fonts/tn-<지문>.woff2 + _dev/fonts-num.json(build.py 가 <head> 의 preload 와 @font-face 'Todok Num' 을 만든다) + assets/fonts/OFL-Rubik.txt.
원본: 환경 변수 TODOK_NUM_SRC(rubik-latin-700-normal.woff2 경로)와 TODOK_NUM_LICENSE(LICENSE 경로). 없으면 jsDelivr 의 @fontsource/rubik 에서 받는다.
라이선스: Rubik 은 SIL OFL 1.1(예약된 글꼴 이름 없음). 조각이라는 것이 드러나게 안의 이름을 'Todok Num' 으로 바꾸고 전문을 같이 둔다.
"""
import sys
sys.dont_write_bytecode = True
import hashlib
import io
import json
import os
import subprocess
import tempfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
OUT = ROOT / 'assets' / 'fonts'
VER = '5.3.0'
CDN = f'https://cdn.jsdelivr.net/npm/@fontsource/rubik@{VER}/'
KEEP = {0, 5, 13, 14}
# 숫자, 영문, 자판에 있는 기호, 식에 쓰는 기호
TEXT = ''.join(chr(c) for c in range(0x20, 0x7F)) + '–−×÷·'
HEAD = (f"tn-*.woff2 는 Rubik({VER}, 굵기 700)에서 숫자·영문·기호만 남긴 조각입니다. 조각 안의 글꼴 이름은 'Todok Num' 으로 바꿨습니다.\n"
        'These files are subsets of Rubik (weight 700: digits, Latin letters and symbols only), renamed "Todok Num".\n\n')


def fetch(rel, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['curl', '-fsSL', '--max-time', '120', '-o', str(path), CDN + rel], check=True)


def src(env, rel):
    if os.environ.get(env):
        return Path(os.environ[env])
    path = Path(tempfile.gettempdir()) / f'rubik-{VER}' / Path(rel).name
    if not path.exists():
        fetch(rel, path)
    return path


def main():
    f = TTFont(str(src('TODOK_NUM_SRC', 'files/rubik-latin-700-normal.woff2')), recalcTimestamp=False)
    o = subset.Options()
    o.layout_features = ['kern', 'tnum', 'lnum']
    o.hinting = False
    o.name_IDs = sorted(KEEP | {1, 2, 3, 4, 6})
    o.name_languages = [0x409]
    s = subset.Subsetter(o)
    s.populate(text=TEXT)
    s.subset(f)
    for n in f['name'].names:
        if n.nameID not in KEEP:
            n.string = n.toUnicode().replace('Rubik', 'Todok Num')
    f.flavor = 'woff2'
    buf = io.BytesIO()
    f.save(buf)
    data = buf.getvalue()
    cps = sorted(f.getBestCmap())
    name = f'tn-{hashlib.sha256(data).hexdigest()[:8]}.woff2'
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('tn-*.woff2'):
        if old.name != name:
            old.unlink()
    (OUT / name).write_bytes(data)
    lic = src('TODOK_NUM_LICENSE', 'LICENSE').read_text(encoding='utf-8')
    assert 'SIL OPEN FONT LICENSE' in lic, '라이선스 전문이 아니다'
    (OUT / 'OFL-Rubik.txt').write_text(HEAD + lic, encoding='utf-8')
    missing = ''.join(c for c in TEXT if ord(c) not in set(cps))
    (DEV / 'fonts-num.json').write_text(json.dumps({'note': '_dev/font_num.py 가 만든 파일. 손으로 고치지 않는다.', 'source': f'Rubik {VER} (700)', 'file': name, 'bytes': len(data),
                                                    'chars': ''.join(chr(c) for c in cps), 'not_in_source': missing}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'assets/fonts/{name}  {len(data):,} bytes  글자 {len(cps)}개' + (f'  (원본에 없는 글자: {missing})' if missing else ''))
    subprocess.run([sys.executable, '-B', str(DEV / 'build.py')], check=True)


if __name__ == '__main__':
    main()
