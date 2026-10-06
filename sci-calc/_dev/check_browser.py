#!/usr/bin/env python3
"""브라우저 검사 (Playwright): 모든 페이지를 320·390·1366 폭으로 열어 가로 넘침·콘솔 오류·깨진 그림·첫 화면 제목 줄 수를 본다.
쓰는 법: (사이트 폴더에서) python3 -m http.server 8765 를 켜 두고  python3 _dev/check_browser.py [http://localhost:8765]
광고 요청(googlesyndication·doubleclick)은 막는다."""
import asyncio, re, sys, os, glob
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
paths = sorted('/' + os.path.relpath(os.path.dirname(f), ROOT).replace('\\', '/') + '/' for f in glob.glob(os.path.join(ROOT, '**', 'index.html'), recursive=True))
paths = [p.replace('/./', '/') for p in paths if not re.match(r'/(tests|_dev|tools)/', p)] + ['/404.html']
bad = []
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in ((320, 640), (390, 844), (1366, 900)):
            ctx = await b.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce' if w == 320 else 'no-preference')
            await ctx.route(re.compile(r'googlesyndication|doubleclick'), lambda r: r.abort())
            for path in paths:
                pg = await ctx.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
                r = await pg.goto(BASE + path)
                if path != '/404.html' and r.status != 200: bad.append('%s %d' % (path, r.status))
                await pg.wait_for_timeout(250)
                sw = await pg.evaluate('document.documentElement.scrollWidth')
                if sw > w: bad.append('%s @%d 가로 넘침 %dpx' % (path, w, sw))
                broken = await pg.evaluate('[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length')
                if broken: bad.append('%s 깨진 그림 %d' % (path, broken))
                if w == 390:
                    lines = await pg.evaluate("(()=>{const h=document.querySelector('h1');const lh=parseFloat(getComputedStyle(h).lineHeight);return Math.round(h.getBoundingClientRect().height/lh)})()")
                    if lines > 2: bad.append('%s 휴대폰 제목 %d줄' % (path, lines))
                for e in errs: bad.append('%s @%d 콘솔: %s' % (path, w, e[:120]))
                await pg.close()
            await ctx.close()
        await b.close()
asyncio.run(main())
print('\n'.join('✗ ' + x for x in bad) if bad else '브라우저 검사 통과: %d페이지 × 3폭' % len(paths))
sys.exit(1 if bad else 0)
