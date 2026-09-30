# 공유 사진(og.png) 다시 찍기: 사이트 폴더에서 python3 -m http.server 8765 를 띄운 뒤 python3 _dev/og.py
import os
from playwright.sync_api import sync_playwright
here=os.path.dirname(os.path.abspath(__file__))
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':1200,'height':630},color_scheme='light')
    pg.add_init_script("try{localStorage.setItem('lumen:lang','ko')}catch(e){}"); pg.goto('http://localhost:8765/_dev/og.html'); pg.wait_for_timeout(500)
    pg.screenshot(path=os.path.join(here,'..','og.png'))
    b.close()
