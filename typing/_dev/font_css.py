#!/usr/bin/env python3
"""assets/pretendard.css 만들기: python3 typing/_dev/font_css.py  (네트워크 필요, curl 사용)

Pretendard 1.3.9 '나눠 받기' CSS(jsDelivr)를 받아 두 가지만 바꾼다.
  1) font-display: swap → optional  : 글꼴이 늦게 와도 이미 그린 글자를 바꾸지 않는다(화면 밀림 0).
     처음 온 사람은 기기 글꼴로 보고, 받아 둔 글꼴은 다음 페이지부터 처음 그릴 때 바로 쓰인다.
  2) 글꼴 파일 주소를 jsDelivr 절대 주소로(글꼴 파일은 싣지 않는다).
만든 파일은 손으로 고치지 않는다. Pretendard: Copyright (c) 2021 Kil Hyung-jin, SIL Open Font License 1.1.
"""
import re
import subprocess
from pathlib import Path

VER = 'v1.3.9'
SRC = f'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@{VER}/dist/web/variable/pretendardvariable-dynamic-subset.min.css'
BASE = f'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@{VER}/packages/pretendard/dist/web/variable/woff2-dynamic-subset/'
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'pretendard.css'

css = subprocess.run(['curl', '-sS', '-m', '30', SRC], check=True, capture_output=True, text=True).stdout
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S).strip()
n = css.count('@font-face')
assert n > 50 and css.count('font-display:swap') == n, '원본 꼴이 바뀌었다'
css = css.replace('font-display:swap', 'font-display:optional')
css = re.sub(r'url\((?:\.\./)+packages/pretendard/dist/web/variable/woff2-dynamic-subset/', 'url(' + BASE, css)
assert css.count('url(' + BASE) == n
head = (f'/* 자동 생성: _dev/font_css.py (손으로 고치지 않는다). Pretendard {VER} 나눠 받기 CSS에서 font-display만 optional로 바꿨다.\n'
        '   Pretendard: Copyright (c) 2021 Kil Hyung-jin. SIL Open Font License 1.1 (https://openfontlicense.org). 글꼴 파일은 jsDelivr에서 받는다. */\n')
OUT.write_text(head + css + '\n', encoding='utf-8')
print('wrote', OUT, len(css), 'bytes,', n, 'faces')
