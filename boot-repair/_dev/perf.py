# 느린 휴대폰 조건(390px, dpr3, CPU 4배)에서 프레임 간격 재기
import subprocess,time,statistics
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8765'],cwd='..',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(.6)
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    for name,vp,dpr,mob in [('mobile',{'width':390,'height':844},3,True),('desktop',{'width':1440,'height':900},1,False)]:
      ctx=b.new_context(viewport=vp,device_scale_factor=dpr,is_mobile=mob,has_touch=mob)
      ctx.add_init_script("window.__fr=[];(function f(t){if(window.__last)__fr.push(t-__last);window.__last=t;requestAnimationFrame(f)})(performance.now())")
      pg=ctx.new_page(); cdp=ctx.new_cdp_session(pg)
      pg.goto('http://localhost:8765/'); pg.wait_for_timeout(1500)
      cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
      def run(label, y0, y1, steps=40):
        pg.evaluate('window.__fr=[]')
        for i in range(steps):
          pg.mouse.wheel(0,(y1-y0)/steps); pg.wait_for_timeout(40)
        pg.wait_for_timeout(400)
        fr=pg.evaluate('window.__fr')
        long=[x for x in fr if x>34]
        print(name,label,'frames',len(fr),'median %.1f'%statistics.median(fr),'p95 %.1f'%sorted(fr)[int(len(fr)*.95)],'>34ms',len(long))
      pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(500)
      pg.evaluate('window.__fr=[]'); pg.wait_for_timeout(2000)
      fr=pg.evaluate('window.__fr'); print(name,'hero idle median %.1f'%statistics.median(fr),'>34ms',len([x for x in fr if x>34]))
      H=vp['height']
      run('hero→story', 0, H*2.5)
      run('story mid', 0, H*2)
      cdp.send('Emulation.setCPUThrottlingRate',{'rate':1}); ctx.close()
    b.close()
finally: srv.terminate()
