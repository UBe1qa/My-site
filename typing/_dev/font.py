#!/usr/bin/env python3
"""화면 글자만 담은 글꼴 조각 만들기: python3 -B typing/_dev/font.py   (필요: pip install fonttools brotli)

왜: 한국어 첫 화면이 Pretendard 나눠 받기 조각 스무 개 남짓(약 0.4MB)을 jsDelivr에서 받고 있었다. 이 사이트 화면과 연습 글에 실제로 나오는 글자만
    남긴 파일 하나를 같은 주소에서 받으면 요청 하나로 끝난다.
무엇을: build.screen_chars() 가 모은 글자(만든 페이지 + 연습 글 + 한글을 치는 중에 보이는 중간 모양)와 쓰는 굵기(400~800)만 남겨
    assets/fonts/td-<언어>-<지문>.woff2 를 만들고, 파일 이름과 담은 글자를 _dev/fonts.json 에 적은 뒤 build.py 를 다시 돌려 <head> 를 맞춘다.
조각에 없는 글자(틀리게 쳐서 생긴 드문 글자 등)는 지금처럼 jsDelivr 의 Pretendard 에서 그 글자 조각만 받는다(글꼴 이름 순서: Todok Sans → Pretendard Variable).
글·연습 글을 고쳐 새 글자가 생기면 check.py 와 시험(run.mjs 'more')이 알려 준다 → 이 스크립트를 다시 돌린다. 같은 글자면 같은 파일(같은 이름)이 나온다.

원본 글꼴: 환경 변수 TODOK_FONT_SRC(PretendardVariable.woff2 경로). 없으면 jsDelivr 에서 받아 기기 임시 폴더에 둔다.
라이선스: Pretendard 는 SIL OFL 1.1 이고 'Pretendard' 는 예약된 글꼴 이름이라, 조각 안의 이름은 'Todok Sans' 로 바꾸고 전문을 assets/fonts/OFL.txt 로 함께 둔다.
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
from fontTools.varLib import instancer

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
OUT = ROOT / 'assets' / 'fonts'
sys.path.insert(0, str(DEV))
import build as B  # noqa: E402

VER = '1.3.9'
CDN = f'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v{VER}/'
KEEP = {0, 5, 13, 14}  # 그대로 두는 이름 항목: 저작권, 판, 라이선스 설명, 라이선스 주소
WGHT = (400, 800)      # style.css 가 쓰는 굵기 범위
OFL_HEAD = (f"td-*.woff2 는 Pretendard Variable {VER} 에서 이 사이트 화면에 나오는 글자와 굵기 400~800 만 남긴 조각입니다.\n"
            "'Pretendard' 는 예약된 글꼴 이름(Reserved Font Name)이라 조각 안의 글꼴 이름을 'Todok Sans' 로 바꿨습니다.\n"
            'These files are subsets of Pretendard Variable, renamed "Todok Sans" because "Pretendard" is a Reserved Font Name.\n\n')


def fetch(rel, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['curl', '-fsSL', '--max-time', '180', '-o', str(path), CDN + rel], check=True)


def source():
    src = os.environ.get('TODOK_FONT_SRC')
    if src:
        return Path(src)
    path = Path(tempfile.gettempdir()) / f'pretendard-{VER}' / 'PretendardVariable.woff2'
    if not path.exists():
        fetch('packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2', path)
    return path


def make(src, text):
    f = TTFont(str(src), recalcTimestamp=False)  # 같은 글자면 같은 파일이 나오게
    o = subset.Options()
    o.layout_features += ['tnum']                # 숫자 폭 맞춤(tabular-nums)
    o.hinting = False
    o.name_IDs = sorted(KEEP | {1, 2, 3, 4, 6})
    o.name_languages = [0x409]
    s = subset.Subsetter(o)
    s.populate(text=text)
    s.subset(f)
    f = instancer.instantiateVariableFont(f, {'wght': WGHT})
    for n in f['name'].names:
        if n.nameID not in KEEP:
            n.string = n.toUnicode().replace('PretendardVariable', 'TodokSans').replace('Pretendard Variable', 'Todok Sans').replace('Pretendard', 'Todok Sans')
    left = [n.nameID for n in f['name'].names if n.nameID not in KEEP and 'pretendard' in n.toUnicode().lower()]
    assert not left, f'예약된 이름이 남음: {left}'
    f.flavor = 'woff2'
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue(), sorted(f.getBestCmap())


def main():
    src = source()
    chars = B.screen_chars()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'note': '_dev/font.py 가 만든 파일. 손으로 고치지 않는다.', 'source': f'Pretendard Variable {VER}', 'weights': list(WGHT)}
    keep = set()
    for lang in ('en', 'ko'):
        want = ''.join(sorted(chars[lang]))
        data, cps = make(src, want)
        name = f'td-{lang}-{hashlib.sha256(data).hexdigest()[:8]}.woff2'
        (OUT / name).write_bytes(data)
        keep.add(name)
        have = set(cps)
        missing = ''.join(c for c in want if ord(c) not in have)
        manifest[lang] = {'file': name, 'bytes': len(data), 'count': len(cps), 'chars': ''.join(chr(c) for c in cps), 'not_in_source': missing}
        print(f'assets/fonts/{name}  {len(data):,} bytes  글자 {len(cps)}개' + (f'  (원본 글꼴에 없는 글자 {len(missing)}개: {missing})' if missing else ''))
    for old in OUT.glob('td-*.woff2'):
        if old.name not in keep:
            old.unlink()
    lic = Path(os.environ['TODOK_FONT_LICENSE']) if os.environ.get('TODOK_FONT_LICENSE') else Path(tempfile.gettempdir()) / f'pretendard-{VER}' / 'LICENSE'
    if not lic.exists():
        fetch('LICENSE', lic)
    text = lic.read_text(encoding='utf-8')
    assert 'SIL OPEN FONT LICENSE' in text, '라이선스 전문이 아니다'
    (OUT / 'OFL.txt').write_text(OFL_HEAD + text, encoding='utf-8')
    (DEV / 'fonts.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    subprocess.run([sys.executable, '-B', str(DEV / 'build.py')], check=True)


if __name__ == '__main__':
    main()
