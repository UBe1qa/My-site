"""게임 저장소의 랜딩 키트(UBe1qa/mobile-games, landing-kit 브랜치 landing-kit/castle-up/)에서
사이트용 그림·영상을 만든다. 키트를 다시 받았을 때만 돌린다.
  python3 _dev/prep_assets.py /경로/landing-kit/castle-up
C2PA 표식(AI 출처)이 든 파일(title_illustration.png, app_icon_alt_b_1024.png)은 다시 저장하면 표식이 빠지므로 쓰지 않는다
(시작 화면 그림은 게임이 그린 스크린숏 01_title로 보인다). 나머지 그림에는 표식이 없음을 확인했다(2026-10-17).
"""
import sys, os, subprocess
from PIL import Image

KIT = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'img')
os.makedirs(OUT, exist_ok=True)
for f in ('art/title_illustration.png', 'art/app_icon_alt_b_1024.png'):
    pass  # 위 설명: 쓰지 않음

def has_c2pa(p):
    return b'c2pa' in open(p, 'rb').read().lower()

def webp(src, dst, w=None, q=78):
    p = os.path.join(KIT, src)
    assert not has_c2pa(p), f'C2PA 표식이 있는 파일은 다시 저장하지 않는다: {src}'
    im = Image.open(p)
    im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    if w and im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, dst), 'WEBP', quality=q, method=6)
    return im.size

sizes = {}
for f in sorted(os.listdir(os.path.join(KIT, 'screenshots'))):
    if f.endswith('.png'):
        name = f[:-4].split('_', 1)[1]  # 02_wave_battle_ko -> wave_battle_ko
        sizes[name] = webp(f'screenshots/{f}', f'shot-{name}.webp', w=600, q=80)
sizes['logo_ko'] = webp('art/logo/logo_ko.png', 'logo-ko.webp', w=720, q=86)
for kind in ('heroes', 'bosses'):
    for f in sorted(os.listdir(os.path.join(KIT, 'art/characters', kind))):
        webp(f'art/characters/{kind}/{f}', ('h-' if kind == 'heroes' else 'b-') + f.replace('_', '-').replace('.png', '.webp'), w=360, q=84)
for f in sorted(os.listdir(os.path.join(KIT, 'art/castle_grades'))):
    webp(f'art/castle_grades/{f}', f.replace('grade_', 'castle-').replace('.png', '.webp'), w=320, q=82)
for f in sorted(os.listdir(os.path.join(KIT, 'art/backgrounds'))):
    webp(f'art/backgrounds/{f}', 'bg-' + f.replace('_', '-').replace('.jpg', '.webp'), w=1280, q=66)
webp('art/app_icon_1024.png', 'icon-256.webp', w=256, q=88)
ic = Image.open(os.path.join(KIT, 'art/app_icon_1024.png')).convert('RGB')
ic.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, '..', 'apple-touch-icon.png'), optimize=True)
ic.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'), optimize=True)
ic.save(os.path.join(OUT, '..', 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])

# 영상: 600px 폭, MP4(H.264) + WebM(VP9). 소리 없음.
for lang in ('ko', 'en'):
    src = os.path.join(KIT, f'video/boss_fight_{lang}.mp4')
    base = os.path.join(OUT, f'boss-{lang}')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=600:-2', '-an',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'slow',
                    '-movflags', '+faststart', base + '.mp4'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=600:-2', '-an',
                    '-c:v', 'libvpx-vp9', '-crf', '45', '-b:v', '0', '-row-mt', '1', base + '.webm'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '6.5', '-i', base + '.mp4', '-frames:v', '1', base + '-poster.png'], check=True)
    Image.open(base + '-poster.png').save(base + '-poster.webp', 'WEBP', quality=78, method=6)
    os.remove(base + '-poster.png')
print(sizes)
