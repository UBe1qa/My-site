#!/usr/bin/env python3
"""계산기 화면 누르기 시험 (Playwright). 서버를 켜 두고: python3 _dev/check_calc.py [http://localhost:8765]"""
import asyncio, sys, re
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765'
fails = []
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, locale='ko-KR')
        await ctx.route(re.compile(r'googlesyndication|doubleclick'), lambda r: r.abort())
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.goto(BASE + '/'); await pg.wait_for_function('window.__calcReady')
        async def keys(*ks):
            for k in ks: await pg.click('[data-k="%s"]' % k)
        async def res(): return (await pg.eval_on_selector('.result', 'e=>e.getAttribute("data-plain")||e.textContent')).strip()
        async def expect(name, want):
            got = await res()
            if got != want: fails.append('%s: %r ≠ %r' % (name, got, want))
        await keys('sin', '4', '5', 'rp', 'eq'); await expect('sin45', '√2/2')
        await pg.click('[data-act=sd]'); await expect('S⇔D', '0.7071067812')
        await keys('ac', '6', 'div', '2', 'lp', '1', 'add', '2', 'rp', 'eq'); await expect('6÷2(1+2)', '1')
        await keys('mul', '3', 'eq'); await expect('Ans×3', '3')
        await keys('ac', '1', 'frac', '3', 'right', 'add', '1', 'frac', '6', 'eq'); await expect('1/3+1/6', '1/2')
        await keys('ac', 'shift', 'sin', '0', 'dot', '5', 'rp', 'eq'); await expect('sin⁻¹0.5', '30')
        await keys('ac', '5', 'shift', 'mul', '2', 'eq'); await expect('5P2', '20')
        await keys('ac', '5', 'shift', 'div', '2', 'eq'); await expect('5C2', '10')
        await keys('ac', 'sqrt', '8', 'eq'); await expect('√8', '2√2')
        await keys('ac', '1', 'div', '0', 'eq')
        if 'is-err' not in await pg.eval_on_selector('.result', 'e=>e.className'): fails.append('1÷0 오류 표시 없음')
        await keys('ac', 'shift', 'add', '1', 'shift', 'rp', '1', 'rp', 'eq')
        if 'r=' not in await res(): fails.append('Pol: ' + await res())
        await keys('ac', '1', '2', 'eq'); await pg.click('[data-act=fact]')
        if '2' not in await pg.eval_on_selector('.result', 'e=>e.textContent'): fails.append('소인수')
        # 각도 단위 바꾸기
        await pg.click('[data-st=angle]'); await keys('ac', 'sin', 'pi', 'div', '6', 'rp', 'eq'); await expect('RAD sin(π/6)', '1/2'); await pg.click('[data-st=angle]'); await pg.click('[data-st=angle]')
        # 판 열기
        for which in ('fnmenu', 'varmenu'):
            await keys(which)
            if await pg.eval_on_selector('.sheet', 'e=>e.hidden'): fails.append(which + ' 판 안 열림')
            await pg.click('.sheet-close')
        await pg.click('[data-open=settings]'); await pg.click('.seg-btn:has-text("Fix")'); await pg.click('.sheet-close')
        await keys('ac', '1', 'div', '3', 'eq'); await pg.click('[data-act=sd]'); await expect('Fix4', '0.3333')
        await pg.click('[data-open=settings]'); await pg.click('.seg-btn:has-text("보통")'); await pg.click('.sheet-close')
        await pg.click('[data-open=history]')
        if not await pg.query_selector('.hist-item'): fails.append('기록 없음')
        await pg.click('.sheet-close')
        # 함수 판에서 상수 넣기
        await keys('ac', 'fnmenu'); await pg.click('[data-sk="const:c0"]'); await keys('eq'); await expect('c₀', '299792458')
        # 키보드
        await keys('ac'); await pg.focus('.expr')
        await pg.keyboard.type('sqrt(2)*sqrt(8)'); await pg.keyboard.press('Enter'); await expect('kbd √2×√8', '4')
        await pg.keyboard.type('2^10'); await pg.keyboard.press('Enter'); await expect('kbd 2^10', '1024')
        await pg.evaluate("""()=>{const e=document.querySelector('.expr');for(const [k,c] of [['ㄴ','KeyS'],['ㅑ','KeyI'],['ㅜ','KeyN'],['3','Digit3'],['0','Digit0']])e.dispatchEvent(new KeyboardEvent('keydown',{key:k,code:c,bubbles:true,cancelable:true}))}""")
        await pg.keyboard.press('Enter'); await expect('한글 자판 sin30', '1/2')
        await pg.keyboard.type('sinh(0)+asin(1)+abs(-3)'); await pg.keyboard.press('Enter'); await expect('kbd sinh·asin·abs', '93')
        await pg.goto(BASE + '/?e=' + '1%C3%B745C6'); await pg.wait_for_function('window.__calcReady'); await expect('?e=', '1/8145060')
        if errs: fails.extend('콘솔: ' + e for e in errs)
        await b.close()
asyncio.run(main())
print('\n'.join('✗ ' + f for f in fails) if fails else '계산기 누르기 시험 통과')
sys.exit(1 if fails else 0)
