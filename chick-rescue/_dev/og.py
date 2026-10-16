# 공유 사진 og.png·og-en.png(1200×630)를 _dev/og.html 로 찍는다 (서버: python3 -m http.server 8765)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    for l, out in (('ko', 'og.png'), ('en', 'og-en.png')):
        pg = br.new_page(viewport={'width': 1200, 'height': 630})
        pg.goto('http://127.0.0.1:8765/_dev/og.html#' + l); pg.wait_for_timeout(700)
        pg.screenshot(path=out); pg.close()
    br.close()
print('og 다시 찍음')
from PIL import Image
import os
for a, b in (('og.png', 'og.jpg'), ('og-en.png', 'og-en.jpg')):
    Image.open(a).convert('RGB').save(b, quality=84, optimize=True, progressive=True); os.remove(a)
