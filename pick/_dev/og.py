#!/usr/bin/env python3
"""공유 그림·아이콘 만들기: python3 -B pick/_dev/og.py  (Playwright·Pillow 필요. 디자인을 바꿨을 때만 다시 돌린다)
og.png(영어)·og-ko.png(한국어) 1200×630, apple-touch-icon.png 180, favicon.ico 32·48 을 _dev/og.html 에서 찍는다.
글꼴을 CDN에서 못 받는 곳에서는 PICK_FONT=Pretendard 변수글꼴(.woff2) 경로를 주면 그 파일로 대신한다."""
import io, os, re
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC = (ROOT / '_dev' / 'og.html').as_uri()
FONT = os.environ.get('PICK_FONT')
EXE = os.environ.get('PW_CHROME') or None

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE, args=['--no-proxy-server'] if FONT else [])
    ctx = b.new_context(viewport={'width': 1200, 'height': 630})
    if FONT:
        data = Path(FONT).read_bytes()
        css = '@font-face{font-family:"Pretendard Variable";font-weight:45 920;src:url(https://cdn.jsdelivr.net/__local/p.woff2) format("woff2-variations")}'
        ctx.route(re.compile(r'cdn\.jsdelivr\.net'), lambda r: r.fulfill(body=data, content_type='font/woff2', headers={'access-control-allow-origin': '*'}) if r.request.url.endswith('.woff2') else r.fulfill(body=css, content_type='text/css', headers={'access-control-allow-origin': '*'}))
    page = ctx.new_page()
    for lang, name in (('en', 'og.png'), ('ko', 'og-ko.png')):
        page.goto(f'{SRC}?lang={lang}')
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(300)
        page.screenshot(path=str(ROOT / name))
    page.set_viewport_size({'width': 180, 'height': 180})
    page.goto(f'{SRC}?icon=1')
    png = page.screenshot()
    b.close()
img = Image.open(io.BytesIO(png)).convert('RGBA')
img.save(ROOT / 'apple-touch-icon.png')
img.save(ROOT / 'favicon.ico', sizes=[(32, 32), (48, 48)])
for n in ('og.png', 'og-ko.png', 'apple-touch-icon.png', 'favicon.ico'):
    print(n, (ROOT / n).stat().st_size)
