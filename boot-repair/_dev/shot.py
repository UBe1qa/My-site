# usage: python3 shot.py in.svg|html out.png [w h]
import sys, pathlib
from playwright.sync_api import sync_playwright
src, out = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv)>3 else 1000
h = int(sys.argv[4]) if len(sys.argv)>4 else 700
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':w,'height':h})
    pg.goto('file://'+str(pathlib.Path(src).resolve())); pg.wait_for_timeout(300)
    pg.screenshot(path=out); b.close()
