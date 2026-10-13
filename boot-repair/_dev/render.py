import pathlib, re
from playwright.sync_api import sync_playwright
from PIL import Image
art=pathlib.Path(__file__).resolve().parent/'art'; out=pathlib.Path(__file__).resolve().parent.parent/'img'
names=['hero-wide','hero-tall','close-wide','close-tall','ba-worn','ba-new']
with sync_playwright() as p:
    b=p.chromium.launch()
    for n in names:
        svg=(art/f'{n}.svg').read_text(); w,h=map(int,re.search(r'width="(\d+)" height="(\d+)"',svg).groups())
        pg=b.new_page(viewport={'width':w,'height':h}); pg.goto('file://'+str(art/f'{n}.svg')); pg.wait_for_timeout(300)
        png=f'/tmp/claude-0/{n}.png'; pg.screenshot(path=png); pg.close()
        im=Image.open(png).convert('RGB'); im.save(out/f'{n}.webp','WEBP',quality=78,method=6)
        if n.startswith(('hero','close')):
            im.resize((max(1,w//2),max(1,h//2)),Image.LANCZOS).save(out/f'{n}-sm.webp','WEBP',quality=74,method=6)
        if n.startswith('close'):
            im.resize((w//25,h//25),Image.LANCZOS).save(out/f'{n}-blur.webp','WEBP',quality=70)
    b.close()
for f in sorted(out.glob('*.webp')): print(f.name, f.stat().st_size//1024,'KB')
# 흐린 판: 1/4 크기에 가우시안 흐림 (작게 줄이기만 하면 확대할 때 네모가 보인다)
from PIL import ImageFilter
for n in ['close-wide','close-tall']:
    im=Image.open(f'/tmp/claude-0/{n}.png').convert('RGB'); w,h=im.size
    im.resize((w//4,h//4),Image.LANCZOS).filter(ImageFilter.GaussianBlur(10)).save(out/f'{n}-blur.webp','WEBP',quality=70)
