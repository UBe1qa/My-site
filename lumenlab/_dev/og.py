# 공유 사진(og.png) 다시 찍기: bash _dev/check.sh og (사이트 폴더를 8765로 띄우고 이걸 부른다)
# 2026-10-29부터 첫 화면(불 켜진 작업실)을 그대로 찍는다. 동작 줄이기면 불 켜진 그림 한 장이고, 메뉴·설명 줄·단추는 숨기고 제목을 키운다.
# 그래서 첫 화면 그림이나 제목을 바꾸면 이것도 다시 찍는다
import os
from playwright.sync_api import sync_playwright
here=os.path.dirname(os.path.abspath(__file__))
CSS='header.top{visibility:hidden!important}.hero__sub,.hero__act{display:none!important}.hero__h1{font-size:64px!important;max-width:none!important;line-height:1.16!important}.hero__kick{font-size:22px!important}'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':1200,'height':630},color_scheme='light',reduced_motion='reduce')
    pg.add_init_script("try{localStorage.setItem('lumen:lang','ko');localStorage.setItem('lumen:langbar','ko')}catch(e){}"); pg.goto('http://localhost:8765/'); pg.add_style_tag(content=CSS); pg.wait_for_timeout(1200)
    pg.screenshot(path=os.path.join(here,'..','og.png'))
    b.close()
