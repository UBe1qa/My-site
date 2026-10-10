#!/usr/bin/env python3
"""화면 글자만 담은 글꼴 조각 만들기: python3 -B check/_dev/font.py   (필요: pip install fonttools brotli)

왜: Pretendard '나눠 받기' 조각을 CDN에서 받으면 한국어 키보드 쪽이 조각 17개(약 458KB), 영어 첫 화면이 10개(약 252KB)를 받았다(제3자 평가, 2026-10-10).
    이 사이트 화면에 실제로 나오는 글자는 영어판 130자, 한국어판 650자 남짓이라, 그 글자와 쓰는 굵기(400~800)만 남긴 파일 하나면 된다.
무엇을: 만든 페이지(build.py)에 나오는 글자를 언어판마다 모아(build.screen_chars) Pretendard Variable 에서 그 글자만 남긴
    assets/fonts/ck-<언어>-<지문>.woff2 를 만들고, 파일 이름·글자 범위를 _dev/fonts.json 에 적은 뒤 build.py 를 다시 돌려 <head>의 preload·@font-face 를 맞춘다.
조각에 없는 글자(운영체제가 알려 준 장치 이름의 드문 글자 등)는 기기 글꼴로 보인다(CDN 글꼴은 더는 받지 않는다).
글을 고쳐 새 글자가 생기면 check.py 가 알려 준다 → 이 스크립트를 다시 돌린다. 같은 글자면 같은 파일(같은 이름)이 나온다.

원본 글꼴: 환경 변수 CK_FONT_SRC(PretendardVariable.woff2 경로, 1.3.9 판). 없으면 jsDelivr 에서 받아 임시 폴더에 둔다.
라이선스: Pretendard 는 SIL OFL 1.1. 'Pretendard'는 예약된 글꼴 이름이라 조각 안의 이름은 'CK Sans'로 바꾸고 전문을 assets/fonts/OFL.txt 로 함께 둔다.
"""
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
OUT = ROOT / 'assets' / 'fonts'
sys.dont_write_bytecode = True
sys.path.insert(0, str(DEV))
import build as B  # noqa: E402

VER = '1.3.9'
KEEP = {0, 5, 13, 14}  # 그대로 두는 이름 항목: 저작권, 판, 라이선스 설명, 라이선스 주소
WGHT = (400, 800)      # style.css 가 쓰는 굵기 범위(400~740)
OFL_HEAD = (f"ck-*.woff2 는 Pretendard Variable {VER} 에서 이 사이트 화면에 나오는 글자와 굵기 400~800 만 남긴 조각입니다.\n"
            "'Pretendard' 는 예약된 글꼴 이름(Reserved Font Name)이라 조각 안의 글꼴 이름을 'CK Sans' 로 바꿨습니다.\n"
            'These files are subsets of Pretendard Variable, renamed "CK Sans" because "Pretendard" is a Reserved Font Name.\n\n')


def source():
    src = os.environ.get('CK_FONT_SRC')
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
            n.string = n.toUnicode().replace('PretendardVariable', 'CKSans').replace('Pretendard Variable', 'CK Sans').replace('Pretendard', 'CK Sans')
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


def main():
    src = source()
    chars = B.screen_chars()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'note': '_dev/font.py 가 만든 파일. 손으로 고치지 않는다.', 'source': f'Pretendard Variable {VER}', 'weights': list(WGHT)}
    keep = set()
    for lang in ('en', 'ko'):
        data, cps = make(src, chars[lang])
        name = f'ck-{lang}-{hashlib.sha256(data).hexdigest()[:8]}.woff2'
        (OUT / name).write_bytes(data)
        keep.add(name)
        have = ''.join(chr(c) for c in cps)
        missing = ''.join(c for c in chars[lang] if ord(c) not in set(cps))
        manifest[lang] = {'file': name, 'bytes': len(data), 'count': len(cps), 'chars': have, 'range': ranges(cps), 'not_in_source': missing}
        print(f'assets/fonts/{name}  {len(data):,} bytes  글자 {len(cps)}개' + (f'  (원본 글꼴에 없는 글자 {len(missing)}개: {missing})' if missing else ''))
    for old in OUT.glob('ck-*.woff2'):
        if old.name not in keep:
            old.unlink()
    if not (OUT / 'OFL.txt').exists():
        lic = subprocess.run(['curl', '-fsSL', '--max-time', '60', f'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v{VER}/LICENSE'], capture_output=True, text=True)
        if lic.returncode == 0 and 'SIL OPEN FONT LICENSE' in lic.stdout:
            (OUT / 'OFL.txt').write_text(OFL_HEAD + lic.stdout, encoding='utf-8')
        else:
            sys.exit('라이선스 전문(LICENSE)을 받지 못했어요. assets/fonts/OFL.txt 를 직접 넣어 주세요.')
    (DEV / 'fonts.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    subprocess.run([sys.executable, '-B', str(DEV / 'build.py')], check=True)


if __name__ == '__main__':
    main()
