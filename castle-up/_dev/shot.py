"""화면 찍기: python3 _dev/shot.py 출력폴더 [주소=http://127.0.0.1:$PORT(기본 8791)]
휴대폰 390·320·360×640, 컴퓨터 1366, 한국어·영어, 밝게·어둡게(휴대폰. 사이트는 노을·밤 색 고정이라 같게 나와야 한다).
콘솔 오류·깨진 그림·가로 넘침·첫 화면 주 단추 위치도 센다."""
import sys, os, json
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; BASE = sys.argv[2] if len(sys.argv) > 2 else 'http://127.0.0.1:' + os.environ.get('PORT', '8791')
os.makedirs(OUT, exist_ok=True)
EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE if os.path.exists(EXE) else None)
    for path, lang in (('/', 'ko'), ('/en/', 'en')):
        for w, h, scheme, rm in ((390, 844, 'light', 'reduce'), (390, 844, 'dark', 'reduce'), (1366, 900, 'light', 'reduce'), (320, 640, 'light', 'reduce'), (360, 640, 'light', 'reduce')):
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, color_scheme=scheme, reduced_motion=rm, locale='ko-KR' if lang == 'ko' else 'en-US')
            pg = ctx.new_page(); errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(BASE + path, wait_until='networkidle')
            pg.evaluate('document.querySelectorAll("img[loading=lazy]").forEach(i=>i.loading="eager")')
            pg.wait_for_timeout(600)
            for _ in range(30): pg.mouse.wheel(0, 700); pg.wait_for_timeout(40)
            pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(500)
            key = f'{lang}-{w}x{h}-{scheme}'
            info = pg.evaluate('''() => ({
              overflow: document.documentElement.scrollWidth - innerWidth,
              broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
              h1lines: (() => { const e = document.querySelector('h1'); return Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)); })(),
              ctaBottom: Math.round(document.querySelector('#heroAct .cta').getBoundingClientRect().bottom),
              docHeight: document.documentElement.scrollHeight,
            })''')
            info['errors'] = errs
            res[key] = info
            pg.screenshot(path=f'{OUT}/{key}-top.png')
            pg.screenshot(path=f'{OUT}/{key}-full.png', full_page=True)
            ctx.close()
    b.close()
print(json.dumps(res, ensure_ascii=False, indent=1))
