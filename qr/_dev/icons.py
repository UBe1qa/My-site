#!/usr/bin/env python3
"""아이콘 만들기: python3 qr/_dev/icons.py → favicon.ico(16·32·48), apple-touch-icon.png(180). favicon.svg 와 같은 그림을 크게 그려 줄인다
(박리지 칸 위 흰 스티커 + 말린 모서리 + QR 눈 셋)."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
LINER, INK, CURL, WHITE = (207, 225, 214, 255), (23, 32, 27, 255), (169, 199, 181, 255), (255, 255, 255, 255)


def draw(size, rounded=True):
    k = 32
    s = 32 * k
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if rounded:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=8 * k, fill=LINER)
    else:
        d.rectangle((0, 0, s, s), fill=LINER)
    P = lambda pts: [(x * k, y * k) for x, y in pts]
    d.polygon(P([(6, 6), (26, 6), (26, 18), (18, 26), (6, 26)]), fill=WHITE, outline=INK, width=2 * k)
    d.polygon(P([(26, 18), (18, 26), (18, 20.5), (20.5, 18)]), fill=CURL, outline=INK, width=2 * k)
    for x, y in ((9, 9), (17, 9), (9, 17)):
        d.rounded_rectangle((x * k, y * k, (x + 5) * k, (y + 5) * k), radius=int(1.2 * k), fill=INK)
    return im.resize((size, size), Image.LANCZOS)


draw(48).save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
draw(180, rounded=False).convert('RGB').save(ROOT / 'apple-touch-icon.png', optimize=True)
print('wrote favicon.ico, apple-touch-icon.png')
