# 공유 사진 og.jpg·og-en.jpg(1200×630)를 _dev/og.html 로 찍는다 (서버: bash _dev/check.sh og 가 띄운다. 포트는 PORT, 기본 8791)
from playwright.sync_api import sync_playwright
from PIL import Image
import os
PORT = os.environ.get('PORT', '8791')
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    for l, out in (('ko', 'og.png'), ('en', 'og-en.png')):
        pg = br.new_page(viewport={'width': 1200, 'height': 630})
        pg.goto(f'http://127.0.0.1:{PORT}/_dev/og.html#' + l, wait_until='networkidle'); pg.wait_for_timeout(900)
        pg.screenshot(path=os.path.join(SITE, out)); pg.close()
    br.close()
for a, b in (('og.png', 'og.jpg'), ('og-en.png', 'og-en.jpg')):
    a, b = os.path.join(SITE, a), os.path.join(SITE, b)
    Image.open(a).convert('RGB').save(b, quality=84, optimize=True, progressive=True); os.remove(a)
print('og 다시 찍음')
