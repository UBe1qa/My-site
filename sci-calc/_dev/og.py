# 공유 사진 다시 찍기: python3 sci-calc/_dev/og.py  → sci-calc/og.png(한국어), sci-calc/og-en.png(영어)
# 글꼴(Pretendard)을 내려받아 컨테이너의 chromium으로 1200x630을 찍는다. 템플릿은 같은 폴더 og.html.
import os, subprocess, tempfile, urllib.request
here = os.path.dirname(os.path.abspath(__file__)); site = os.path.dirname(here)
CHROME = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'
tmp = tempfile.mkdtemp()
for w in ('Medium', 'Bold', 'ExtraBold'):
    urllib.request.urlretrieve('https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2/Pretendard-%s.woff2' % w, os.path.join(tmp, 'Pretendard-%s.woff2' % w))
src = open(os.path.join(here, 'og.html'), encoding='utf-8').read().replace('FONTDIR', 'file://' + tmp)
page = os.path.join(tmp, 'og.html'); open(page, 'w', encoding='utf-8').write(src)
for lang, out in (('ko', 'og.png'), ('en', 'og-en.png')):
    subprocess.run([CHROME, '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--window-size=1200,630', '--virtual-time-budget=3000', '--screenshot=' + os.path.join(site, out),
                    'file://%s?lang=%s' % (page, lang)], check=True, capture_output=True)
    print('wrote', out)
