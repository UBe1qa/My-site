import pathlib, re
from playwright.sync_api import sync_playwright
from PIL import Image, ImageEnhance
SAT = 0.65   # 2판: 갈색이 화면을 덮지 않게 채도를 낮춘다(제3자 미감 피드백 '색 구조')
art=pathlib.Path(__file__).resolve().parent/'art'; out=pathlib.Path(__file__).resolve().parent.parent/'img'
names=['hero-wide','hero-tall','close-wide','close-tall','close-wide-worn','close-tall-worn','ba-worn','ba-new',
       'heel-wide','heel-wide-worn','heel-tall','heel-tall-worn']
import sys
if len(sys.argv) > 1: names = sys.argv[1:]   # 이름을 주면 그것만 굽는다
with sync_playwright() as p:
    b=p.chromium.launch()
    for n in names:
        svg=(art/f'{n}.svg').read_text(); w,h=map(int,re.search(r'width="(\d+)" height="(\d+)"',svg).groups())
        pg=b.new_page(viewport={'width':w,'height':h}); pg.goto('file://'+str(art/f'{n}.svg')); pg.wait_for_timeout(300)
        png=f'/tmp/claude-0/{n}.png'; pg.screenshot(path=png); pg.close()
        im=ImageEnhance.Color(Image.open(png).convert('RGB')).enhance(SAT); im.save(out/f'{n}.webp','WEBP',quality=78,method=6)
    b.close()
for f in sorted(out.glob('*.webp')): print(f.name, f.stat().st_size//1024,'KB')
# 흐린 판: 1/4 크기에 가우시안 흐림 (작게 줄이기만 하면 확대할 때 네모가 보인다)
from PIL import ImageFilter
for n in ['close-wide-worn','close-tall-worn']:
    im=ImageEnhance.Color(Image.open(f'/tmp/claude-0/{n}.png').convert('RGB')).enhance(SAT); w,h=im.size
    im.resize((w//4,h//4),Image.LANCZOS).filter(ImageFilter.GaussianBlur(10)).save(out/f'{n}-blur.webp','WEBP',quality=70)
# 사진 견적 모형의 작은 사진 세 장 (닳은 판에서 잘라 냄)
def _sq(src, box, name):
    im = Image.open(src).convert('RGB').crop(box).resize((320, 320), Image.LANCZOS)
    im = ImageEnhance.Brightness(ImageEnhance.Color(im).enhance(SAT)).enhance(1.3)
    im.save(out / name, 'WEBP', quality=78)
_sq('/tmp/claude-0/close-wide-worn.png', (60, 200, 1260, 1000), 'ph-heel.webp')
_sq('/tmp/claude-0/ba-worn.png', (520, 250, 960, 690), 'ph-welt.webp')
# 앞코: art/boot-worn.svg 를 shot.py로 /tmp/claude-0/boot-worn.png 로 먼저 굽는다
import os
if os.path.exists('/tmp/claude-0/boot-worn.png'): _sq('/tmp/claude-0/boot-worn.png', (700, 380, 1000, 680), 'ph-toe.webp')
