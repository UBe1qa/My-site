#!/usr/bin/env python3
"""공유 그림 만들기: python3 count/_dev/og.py  → og.png(영어), og-ko.png(한국어) 1200×630. _dev/og.html 을 찍는다."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy') or ''
args = ['--allow-file-access-from-files']
if proxy:
    args.append('--proxy-server=https=' + proxy.replace('http://', ''))
exe = sorted(Path('/opt/pw-browsers').glob('chromium-*/chrome-linux/chrome'))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=str(exe[0]) if exe else None, args=args)
    ctx = b.new_context(viewport={'width': 1200, 'height': 630}, ignore_https_errors=True)
    pg = ctx.new_page()
    for lang, name in (('en', 'og.png'), ('ko', 'og-ko.png')):
        pg.goto((ROOT / '_dev' / 'og.html').as_uri() + '?lang=' + lang, wait_until='load')
        try:
            pg.wait_for_function('document.fonts.status === "loaded"', timeout=8000)
        except Exception:
            pass
        pg.wait_for_timeout(600)
        pg.screenshot(path=str(ROOT / name))
        print('wrote', name)
    b.close()
