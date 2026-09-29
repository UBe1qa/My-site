import asyncio, os, sys, subprocess, time
from playwright.async_api import async_playwright
target = sys.argv[1]
srv = None
if not target.startswith('http'):
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8770', '--bind', '127.0.0.1'], cwd=target, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    base = 'http://127.0.0.1:8770/'
else:
    base = target
proxy = os.environ.get('HTTPS_PROXY', '')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=[f'--proxy-server=https={proxy.replace("http://", "")}'] if proxy else [])
        ctx = await b.new_context(viewport={'width': 1366, 'height': 768}, locale='ko-KR')
        pg = await ctx.new_page()
        await pg.goto(base, wait_until='networkidle'); await pg.wait_for_timeout(4800)
        await pg.click('.hero .btn--main'); await pg.wait_for_timeout(2200)
        top = await pg.evaluate('Math.round(document.querySelector("#inquiry").getBoundingClientRect().top)')
        print('상담 신청서 쓰기 → #inquiry top', top, 'OK' if -5 < top < 120 else '!!')
        await pg.goto(base, wait_until='networkidle'); await pg.wait_for_timeout(4800)
        await pg.click('.nav a[href="#process"]'); await pg.wait_for_timeout(2200)
        top = await pg.evaluate('Math.round(document.querySelector("#process").getBoundingClientRect().top)')
        print('메뉴 진행 과정 → #process top', top, 'OK' if -5 < top < 120 else '!!')
        await pg.mouse.wheel(0, -200); await pg.wait_for_timeout(800)
        await pg.click('.brand'); await pg.wait_for_timeout(2200)
        y = await pg.evaluate('Math.round(scrollY)')
        print('로고 → 맨 위 scrollY', y, 'OK' if y < 5 else '!!')
        await b.close()
try: asyncio.run(main())
finally:
    if srv: srv.terminate()
