"""게임 저장소의 랜딩 키트(UBe1qa/mobile-games, landing-kit 브랜치 landing-kit/chick-rescue/)에서
사이트용 그림·영상을 만든다. 키트를 다시 받았을 때만 돌린다.
  python3 _dev/prep_assets.py /경로/mobile-games/landing-kit/chick-rescue
AI 그림에 C2PA 표식이 없음을 확인했다(2026-10-16) → WebP로 다시 저장해도 된다.
"""
import sys, os, subprocess
from PIL import Image

KIT = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'img')
os.makedirs(OUT, exist_ok=True)

def webp(src, dst, w=None, h=None, q=78):
    im = Image.open(os.path.join(KIT, src))
    im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    if w and im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    if h and im.height > h:
        im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    im.save(os.path.join(OUT, dst), 'WEBP', quality=q, method=6)
    return im.size

sizes = {}
for lang in ('ko', 'en'):
    for f in sorted(os.listdir(os.path.join(KIT, 'screenshots'))):
        if f.endswith(f'_{lang}.png'):
            name = f[:-4].split('_', 1)[1]  # 01_home_ko -> home_ko
            sizes[name] = webp(f'screenshots/{f}', f'shot-{name}.webp', w=600, q=80)
    sizes['logo_' + lang] = webp(f'art/logo/logo_{lang}.png', f'logo-{lang}.webp', w=640, q=86)
for f in sorted(os.listdir(os.path.join(KIT, 'art/characters'))):
    webp(f'art/characters/{f}', 'c-' + f.replace('.png', '.webp'), w=160, q=88)
for f in sorted(os.listdir(os.path.join(KIT, 'art/houses'))):
    webp(f'art/houses/{f}', f.replace('house_', 'house-').replace('.png', '.webp'), w=320, q=80)
webp('art/nest_tree.png', 'nest-tree.webp', w=640, q=80)
webp('art/backgrounds/stage1.jpg', 'bg-forest.webp', w=1080, q=68)
webp('art/backgrounds/theme5.jpg', 'bg-night.webp', w=1080, q=66)
webp('art/app_icon_1024.png', 'icon-256.webp', w=256, q=88)
ic = Image.open(os.path.join(KIT, 'art/app_icon_1024.png')).convert('RGB')
ic.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, '..', 'apple-touch-icon.png'), optimize=True)
ic.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'), optimize=True)
ic.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'), optimize=True)
ic.save(os.path.join(OUT, '..', 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])

# 영상: 600px 폭, MP4(H.264) + WebM(VP9). 소리 없음.
for lang in ('ko', 'en'):
    src = os.path.join(KIT, f'video/rescue_play_{lang}.mp4')
    base = os.path.join(OUT, f'play-{lang}')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=600:-2', '-an',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow',
                    '-movflags', '+faststart', base + '.mp4'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=600:-2', '-an',
                    '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1', base + '.webm'], check=True)
    # 영상 첫 장면(포스터)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', base + '.mp4', '-frames:v', '1', base + '-poster.png'], check=True)
    Image.open(base + '-poster.png').save(base + '-poster.webp', 'WEBP', quality=78, method=6)
    os.remove(base + '-poster.png')
print(sizes)
