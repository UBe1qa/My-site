"""말 그림(Cburnett, 위키미디어 공용, BSD-3 선택) → assets/pieces.css (data URI). 그림을 바꾸면 이걸 다시 돌린다."""
import base64, pathlib
HERE = pathlib.Path(__file__).resolve().parent
out = ['/* 자동 생성: _dev/pieces.py. Chess pieces by Cburnett (https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces), '
       'used under the 3-clause BSD license (Copyright (c) Cburnett). */']
for f in sorted((HERE / 'pieces').glob('*.svg')):
    c, p = f.stem[0], f.stem[1]          # l/d + k/q/r/b/n/p
    cls = ('w' if c == 'l' else 'b') + p
    data = base64.b64encode(f.read_bytes()).decode()
    out.append(f'.pc.{cls}{{background-image:url(data:image/svg+xml;base64,{data})}}')
(HERE.parent / 'assets' / 'pieces.css').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('ok', len(out) - 1)
