# 공유 사진 og.png(1200×630)를 _dev/og.html 로 찍는다: bash _dev/check.sh og
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg = br.new_page(viewport={'width': 1200, 'height': 630})
    pg.goto('http://localhost:8766/_dev/og.html'); pg.wait_for_timeout(500)
    pg.screenshot(path='og.png'); br.close()
print('og.png 다시 찍음')
