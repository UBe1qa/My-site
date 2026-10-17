# 공유 그림 og.jpg·og-en.jpg(1200×630)를 _dev/og.html 로 찍는다. 글은 build.py S['og']·S['peep'] 첫 낱말.
# 서버: bash _dev/check.sh og (PORT 기본 8792)
import os, sys
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import build  # noqa: E402
PORT = os.environ.get('PORT', '8792')
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    for i, (l, out) in enumerate((('ko', 'og.png'), ('en', 'og-en.png'))):
        pg = br.new_page(viewport={'width': 1200, 'height': 630})
        q = urlencode({'l': l, 't': build.S['og'][i], 'p': build.S['peep'][i].split()[0]})
        pg.goto(f'http://127.0.0.1:{PORT}/_dev/og.html?{q}', wait_until='networkidle'); pg.wait_for_timeout(700)
        pg.screenshot(path=os.path.join(SITE, out)); pg.close()
    br.close()
for a, b in (('og.png', 'og.jpg'), ('og-en.png', 'og-en.jpg')):
    a, b = os.path.join(SITE, a), os.path.join(SITE, b)
    Image.open(a).convert('RGB').save(b, quality=84, optimize=True, progressive=True); os.remove(a)
print('og 다시 찍음')
