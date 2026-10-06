# 세트노트 사이트 배포 전 확인: 이 폴더에서 python3 -m http.server 8767 을 띄운 뒤 python3 _dev/check.py
# 320·390·1366 가로 넘침, 콘솔 오류, 깨진 사진, 영어 화면에 한국어 남음, 스크롤 뒤 숨은 요소, 앱 본체 파일이 열리는지
import os, sys
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8767')
fails = []
def ok(c, m):
    print(('통과 ' if c else '실패 ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    for loc in ('ko-KR', 'en-US'):
        for w in (320, 390, 1366):
            c = br.new_context(viewport={'width': w, 'height': 820}, locale=loc); pg = c.new_page(); errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_CERT' not in m.text else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(BASE + '/'); pg.wait_for_timeout(600)
            sw = pg.evaluate('document.documentElement.scrollWidth'); ok(sw <= w, f'{loc} {w}px 가로 넘침 없음 ({sw})')
            ok(not errs, f'{loc} {w}px 콘솔 오류 0 {errs[:2]}')
            bad = set()
            for _ in range(30):
                pg.mouse.wheel(0, 300); pg.wait_for_timeout(450)
                bad |= set(pg.evaluate('''()=>{const o=[],H=innerHeight;for(const el of document.querySelectorAll('main *')){const r=el.getBoundingClientRect();if(r.width<4||r.height<4||r.bottom<H*.12||r.top>H*.75)continue;let a=1,n=el;while(n&&n.nodeType===1){a*=+getComputedStyle(n).opacity;n=n.parentElement}if(a<.2)o.push(String(el.className||el.tagName))}return o}'''))
                if pg.evaluate('innerHeight+scrollY>=document.body.scrollHeight-2'): break
            ok(not bad, f'{loc} {w}px 스크롤 뒤 숨은 요소 0 {sorted(bad)[:3]}')
            broken = pg.evaluate('[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src)')
            ok(not broken, f'{loc} {w}px 깨진 사진 0 {broken}')
            if loc == 'en-US' and w == 390:
                left = pg.evaluate(r"""[...document.querySelectorAll('header *, main *, footer *')].filter(e=>e.children.length===0&&/[가-힣]/.test(e.textContent)&&!e.closest('[lang=ko]')).map(e=>e.textContent.trim()).slice(0,5)""")
                ok(not left, f'영어 화면에 한국어 남지 않음 {left}')
            c.close()
    c = br.new_context(); rq = c.request
    for f in ['/app/', '/app/manifest.webmanifest', '/app/sw.js', '/app/icons/icon-192.png', '/app/icons/apple-touch-icon.png', '/og.png', '/icon.webp', '/robots.txt', '/sitemap.xml', '/404.html']:
        ok(rq.get(BASE + f).status == 200, f'파일 {f}')
    c.close(); br.close()
print('\n실패 %d개' % len(fails) if fails else '\n모두 통과')
sys.exit(1 if fails else 0)
