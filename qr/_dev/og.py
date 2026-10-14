#!/usr/bin/env python3
"""공유 그림 만들기: python3 qr/_dev/og.py → og.png(영어), og-ko.png(한국어) 1200×630. 박리지 위 스티커 세 장 + 제목."""
import json, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
TXT = {'en': ('Staycode', 'Free QR codes that never expire', 'Logo · frames · scan check · SVG / PDF / EPS · no sign-up'),
       'ko': ('오래QR', '만료 없는 무료 QR코드', '로고·틀·찍힘 확인 · SVG / PDF / EPS · 가입 없음')}
exe = sorted(Path('/opt/pw-browsers').glob('chromium-*/chrome-linux/chrome'))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=str(exe[0]) if exe else None)
    pg = b.new_page(viewport={'width': 1200, 'height': 630})
    for lang, name in (('en', 'og.png'), ('ko', 'og-ko.png')):
        svgs = json.loads(subprocess.run(['node', str(ROOT / '_dev/og.mjs'), lang], capture_output=True, text=True, check=True).stdout)
        t = TXT[lang]
        html = f'''<html><body style="margin:0;width:1200px;height:630px;font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;background:#dcebe2;
background-image:linear-gradient(#a9c7b5 1px,transparent 1px),linear-gradient(90deg,#a9c7b5 1px,transparent 1px);background-size:30px 30px;position:relative;overflow:hidden">
<style>.s{{position:absolute;filter:drop-shadow(0 4px 3px rgba(28,52,40,.25)) drop-shadow(0 14px 18px rgba(28,52,40,.25))}} .s svg{{width:100%;height:100%}} .cut{{fill:#fff;stroke:#fff}}</style>
<div style="position:absolute;left:64px;top:92px;width:560px;background:#fff;border-radius:22px;padding:40px 44px;box-shadow:0 10px 24px rgba(28,52,40,.18)">
<div style="font-size:30px;font-weight:800;color:#2f6b4f">{t[0]}</div>
<div style="font-size:58px;line-height:1.15;font-weight:900;color:#17201b;margin:10px 0 18px;letter-spacing:-.02em">{t[1]}</div>
<div style="font-size:24px;color:#46524c">{t[2]}</div></div>
<div class="s" style="left:700px;top:60px;width:230px;height:300px;transform:rotate(-7deg)">{svgs[0]}</div>
<div class="s" style="left:930px;top:120px;width:220px;height:300px;transform:rotate(6deg)">{svgs[1]}</div>
<div class="s" style="left:790px;top:330px;width:230px;height:270px;transform:rotate(2deg)">{svgs[2]}</div>
</body></html>'''
        pg.set_content(html); pg.wait_for_timeout(300)
        pg.screenshot(path=str(ROOT / name)); print('wrote', name)
    b.close()
