#!/usr/bin/env python3
"""공유 그림 og.png(영어)·og-ko.png(한국어) 1200×630: python3 time/_dev/og.py (로컬 서버 8471이 떠 있어야 함)"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parent.parent
import sys
sys.path.insert(0, str(ROOT / '_dev'))
import build  # noqa: E402
TXT = {'en': ('Oneturn', 'Online timer, stopwatch, alarm and world clock', 'Rings on time in a background tab · DST dates for every city'),
       'ko': ('한바퀴', '타이머 · 스톱워치 · 알람 · 세계 시간', '다른 탭에서도 제때 울려요 · 도시마다 서머타임 바뀌는 날까지')}


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for lang, out in (('en', 'og.png'), ('ko', 'og-ko.png')):
            pg = await b.new_page(viewport={'width': 1200, 'height': 630})
            await pg.goto('http://localhost:8471/' + ('ko/' if lang == 'ko' else ''))
            dial = await pg.evaluate("document.querySelector('#dialbox svg.dial').outerHTML")
            t = TXT[lang]
            await pg.set_content(f'''<html><head><link rel="stylesheet" href="http://localhost:8471/assets/style.css"></head>
<body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:0 80px;box-sizing:border-box;flex-direction:row;background:#eeebe4;font-family:var(--font)">
<div style="width:440px;height:440px;flex:none;position:relative">{dial}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:76px;font-weight:800;letter-spacing:-.03em;color:#1c1e20">25:00</div></div>
<div><p style="font-size:30px;font-weight:800;color:#0d7068;margin:0 0 10px">{t[0]}</p>
<p style="font-size:52px;line-height:1.2;font-weight:800;color:#1c1e20;margin:0 0 20px;letter-spacing:-.02em">{t[1]}</p>
<p style="font-size:26px;line-height:1.45;color:#43474c;margin:0">{t[2]}</p></div></body></html>''')
            await pg.evaluate('''([d, k, e]) => { const s = document.querySelector('svg.dial'); s.querySelector('.wedge').setAttribute('d', d); s.querySelector('.knob-g').style.display = 'none'; const ed = s.querySelector('.edge'); ed.setAttribute('x1', e[0]); ed.setAttribute('y1', e[1]); ed.setAttribute('x2', e[2]); ed.setAttribute('y2', e[3]); }''', [build.donut(25 / 60), 0, [*build.pt(98, 25 / 60), *build.pt(128, 25 / 60)]])
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=str(ROOT / out))
            await pg.close()
        await b.close()
    print('og.png og-ko.png')
asyncio.run(main())
