# 로컬 서버로 열어 스크롤 위치마다 찍는다. usage: python3 look.py desktop|mobile out_prefix [y,y,...] [--dark] [--reduce]
import sys, subprocess, time, os, json
from playwright.sync_api import sync_playwright
mode=sys.argv[1]; pre=sys.argv[2]
ys=[float(v) for v in sys.argv[3].split(',')] if len(sys.argv)>3 and not sys.argv[3].startswith('--') else None
dark='--dark' in sys.argv; reduce='--reduce' in sys.argv
os.chdir(os.path.dirname(os.path.abspath(__file__))+'/..')
srv=subprocess.Popen(['python3','-m','http.server','8765'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(.6)
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    vp={'width':1440,'height':900} if mode=='desktop' else {'width':390,'height':844}
    ctx=b.new_context(viewport=vp, device_scale_factor=1 if mode=='desktop' else 2, is_mobile=(mode=='mobile'), has_touch=(mode=='mobile'),
       color_scheme='dark' if dark else 'light', reduced_motion='reduce' if reduce else 'no-preference')
    pg=ctx.new_page(); errs=[]
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/'); pg.wait_for_timeout(1500)
    H=pg.evaluate('document.documentElement.scrollHeight'); vh=vp['height']
    if ys is None: ys=[i*vh for i in range(int(H/vh)+1)]
    for i,y in enumerate(ys):
      yy=int(y*H) if y<=1 and y>0 and y!=int(y) else int(y)
      pg.evaluate(f'window.scrollTo(0,{yy})'); pg.wait_for_timeout(1100)
      pg.screenshot(path=f'/tmp/claude-0/{pre}-{i:02d}.png')
    print('height',H,'errors',errs[:5])
    print(json.dumps(pg.evaluate('''({sx:document.documentElement.scrollWidth, vw:innerWidth, motion:!!window.__motionOn, anim:document.documentElement.className})''')))
    b.close()
finally: srv.terminate()
