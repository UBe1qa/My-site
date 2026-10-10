#!/usr/bin/env python3
"""공유 그림 만들기: python3 salary/_dev/og.py  → og.png(영어), og-ko.png(한국어) 1200×630. _dev/og.html 을 찍는다.
그림 속 금액은 calc.mjs 의 예시 계산값(연봉 4,000만 원)을 그대로 쓴다. 요율이 바뀌면 다시 찍는다."""
import json
import os
import sys
from pathlib import Path

sys.dont_write_bytecode = True
from playwright.sync_api import sync_playwright
from ctx import F, NOWID, c, period_ko, period_en, man

ROOT = Path(__file__).resolve().parent.parent
n = F['net4000']
ln = n['line']
DATA = {
    'ko': dict(lang='ko', brand='떼고얼마', h='연봉 실수령액<br>계산기', s='4대 보험과 세금을 떼고<br>통장에 들어오는 돈', slip='급여명세서', asof=f'{period_ko(NOWID)} 기준',
               k=f'연봉 {man(n["annual"])}이면 한 달에', n=c(n['net']), unit='원',
               rows=[['국민연금', '−' + c(ln['pension']) + '원'], ['건강보험', '−' + c(ln['health']) + '원'], ['소득세', '−' + c(ln['incomeTax']) + '원']]),
    'en': dict(lang='en', brand='Takehome Korea', h='Korea Net Salary<br>Calculator', s='Take-home pay after the four<br>insurances and income tax', slip='Payslip estimate', asof=period_en(NOWID),
               k=f'₩{c(n["annual"])} a year leaves, per month', n='₩' + c(n['net']), unit='',
               rows=[['National Pension', '−₩' + c(ln['pension'])], ['Health Insurance', '−₩' + c(ln['health'])], ['Income tax', '−₩' + c(ln['incomeTax'])]]),
}
proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy') or ''
args = ['--allow-file-access-from-files']
if proxy:
    args.append('--proxy-server=https=' + proxy.replace('http://', ''))
exe = sorted(Path('/opt/pw-browsers').glob('chromium-*/chrome-linux/chrome'))
FONT = (ROOT / 'assets' / 'pretendard.css').read_text(encoding='utf-8').replace('font-display:optional', 'font-display:swap')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=str(exe[0]) if exe else None, args=args)
    ctx = b.new_context(viewport={'width': 1200, 'height': 630}, ignore_https_errors=True)
    ctx.route('**/assets/pretendard.css', lambda r: r.fulfill(body=FONT, content_type='text/css'))
    pg = ctx.new_page()
    for lang, name in (('en', 'og.png'), ('ko', 'og-ko.png')):
        pg.goto((ROOT / '_dev' / 'og.html').as_uri(), wait_until='load')
        pg.evaluate('d => window.fill(d)', DATA[lang])
        try:
            pg.evaluate('document.fonts.load("800 60px \\"Pretendard Variable\\"", document.body.innerText)')
            pg.wait_for_function('document.fonts.status === "loaded"', timeout=15000)
        except Exception:
            pass
        pg.wait_for_timeout(1200)
        pg.screenshot(path=str(ROOT / name))
        print('wrote', name, pg.evaluate('document.fonts.check("800 60px \\"Pretendard Variable\\"")'))
    b.close()
