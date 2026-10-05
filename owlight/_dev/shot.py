# 확인용 스크린숏: python3 _dev/shot.py [출력폴더]  (사이트 폴더를 8766으로 띄운 상태)
import sys, os
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/owlight-shots'
os.makedirs(out, exist_ok=True)
BASE = os.environ.get('BASE', 'http://localhost:8766')
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    for loc in ('ko-KR', 'en-US'):
        for w, h in ((1366, 800), (390, 844)):
            c = br.new_context(viewport={'width': w, 'height': h}, locale=loc, reduced_motion='reduce', device_scale_factor=1)
            pg = c.new_page(); pg.goto(BASE + '/'); pg.wait_for_timeout(600)
            pg.screenshot(path=f'{out}/{loc[:2]}-{w}-first.png')
            pg.screenshot(path=f'{out}/{loc[:2]}-{w}-full.png', full_page=True)
            c.close()
    br.close()
print(out)
