#!/usr/bin/env python3
"""아이콘 만들기: python3 typing/_dev/icons.py  → favicon.ico(16·32·48), apple-touch-icon.png(180, 여백 없는 정사각)
favicon.svg 와 같은 그림(가지색 바탕 + 흰 키 + 지금 칠 자리 밑줄)을 PIL 로 크게 그려 줄인다."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
MAIN, DEEP, WHITE = (91, 63, 166, 255), (44, 29, 88, 255), (255, 255, 255, 255)


def draw(size, round_bg=True):
    k = 16  # 크게 그려서 줄인다
    s = 32 * k
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if round_bg:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=7 * k, fill=MAIN)
    else:
        d.rectangle((0, 0, s, s), fill=MAIN)
    d.rounded_rectangle((6 * k, 9 * k, 26 * k, 26 * k), radius=int(4.5 * k), fill=DEEP)
    d.rounded_rectangle((6 * k, 6 * k, 26 * k, 23 * k), radius=int(4.5 * k), fill=WHITE)
    d.rounded_rectangle((11 * k, int(15.5 * k), 21 * k, int(18.7 * k)), radius=int(1.6 * k), fill=MAIN)
    return im.resize((size, size), Image.LANCZOS)


draw(48).save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
draw(180, round_bg=False).convert('RGB').save(ROOT / 'apple-touch-icon.png', optimize=True)
print('wrote favicon.ico, apple-touch-icon.png')
