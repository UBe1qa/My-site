#!/usr/bin/env python3
"""아이콘 만들기: python3 salary/_dev/icons.py  → favicon.ico(16·32·48), apple-touch-icon.png(180). favicon.svg 를 찍는다(Playwright + PIL)."""
import io
import sys
from pathlib import Path

sys.dont_write_bytecode = True
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
svg = (ROOT / 'favicon.svg').read_text(encoding='utf-8')
exe = sorted(Path('/opt/pw-browsers').glob('chromium-*/chrome-linux/chrome'))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=str(exe[0]) if exe else None)
    pg = b.new_page(viewport={'width': 256, 'height': 256})
    # 애플 터치 아이콘은 모서리를 기기가 깎으므로 바탕을 끝까지 채운다
    pg.set_content(f'<body style="margin:0;background:#9b2743"><div style="width:256px;height:256px">{svg}</div></body>')
    big = Image.open(io.BytesIO(pg.screenshot(clip={'x': 0, 'y': 0, 'width': 256, 'height': 256}))).convert('RGBA')
    pg.set_content(f'<body style="margin:0;background:transparent"><div style="width:256px;height:256px">{svg}</div></body>')
    clear = Image.open(io.BytesIO(pg.screenshot(clip={'x': 0, 'y': 0, 'width': 256, 'height': 256}, omit_background=True))).convert('RGBA')
    b.close()
big.resize((180, 180), Image.LANCZOS).convert('RGB').save(ROOT / 'apple-touch-icon.png', optimize=True)
clear.save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
print('wrote favicon.ico, apple-touch-icon.png')
