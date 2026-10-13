import subprocess,time,statistics,sys
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8765'],cwd='..',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(.6)
variants={'base':'x{}','noblend':'.hero__light{mix-blend-mode:normal!important}','nolight':'.hero__light{display:none!important}','nocanvas':'.hero__film{display:none!important}','noken':'.hero__media{animation:none!important}','noclip':'.anim .hero__frame{clip-path:none!important}','noblur':'.top{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'}
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    for k,css in variants.items():
      ctx=b.new_context(viewport={'width':1440,'height':900})
      ctx.add_init_script("window.__fr=[];(function f(t){if(window.__last)__fr.push(t-__last);window.__last=t;requestAnimationFrame(f)})(performance.now())")
      pg=ctx.new_page(); cdp=ctx.new_cdp_session(pg)
      pg.goto('http://localhost:8765/'); pg.add_style_tag(content=css); pg.wait_for_timeout(1200)
      cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
      pg.evaluate('window.__fr=[]'); pg.wait_for_timeout(2000)
      fr=pg.evaluate('window.__fr'); print(k,'median %.1f'%statistics.median(fr),'>34ms',len([x for x in fr if x>34]))
      ctx.close()
    b.close()
finally: srv.terminate()
