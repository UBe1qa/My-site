# 배포 전 빠른 확인: 페이지마다 폭별 가로 넘침, 깨진 그림, 콘솔 오류, 단추 글자 넘침, 동작 줄이기·끝까지 내린 뒤 숨은 요소
# + 처음 화면 일시정지·신청 바, 메뉴 열고 닫기, 신청서가 아무 데도 보내지 않는지
import subprocess,time
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8765'],cwd='..',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(.6)
res=[]
def ok(name,cond,info=''): res.append(('통과' if cond else '실패',name,info))
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    PAGES=['','check/','repairs/','cases/','care/','maker/','apply/']
    for path in PAGES:
     for w in ([320,360,375,390,768,1024,1366,1440] if path=='' else [320,390,768,1024,1440]):
      pg=b.new_page(viewport={'width':w,'height':800}); errs=[]
      pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
      pg.goto('http://localhost:8765/'+path); pg.wait_for_timeout(900 if path else 1200)
      w=f'/{path} {w}'
      H=pg.evaluate('document.documentElement.scrollHeight')
      for y in range(0,H,700): pg.evaluate(f'scrollTo(0,{y})'); pg.wait_for_timeout(60)
      pg.wait_for_timeout(500)
      sx=pg.evaluate('document.documentElement.scrollWidth')
      vw=pg.evaluate('innerWidth'); ok(f'{w}px 가로 넘침 없음', sx<=vw, f'scrollWidth {sx}')
      broken=pg.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src)")
      ok(f'{w}px 깨진 그림 0', not broken, str(broken))
      ok(f'{w}px 콘솔 오류 0', not errs, str(errs[:3]))
      over=pg.evaluate("""[...document.querySelectorAll('.btn,.chip')].filter(b=>b.offsetParent&&(b.scrollWidth>b.clientWidth+1||b.getClientRects().length>1)).map(b=>b.textContent.trim())""")
      ok(f'{w}px 단추 글자 넘침 없음', not over, str(over))
      pg.close()
    # 일시정지
    pg=b.new_page(viewport={'width':1366,'height':800}); pg.goto('http://localhost:8765/'); pg.wait_for_timeout(1200)
    pg.click('.hero__pause'); pg.wait_for_timeout(200)
    ok('일시정지 누르면 멈춤 표시', pg.evaluate("document.querySelector('.hero').classList.contains('is-paused') && document.querySelector('.hero__pause').getAttribute('aria-pressed')==='true'"))
    a=pg.evaluate("document.querySelector('.hero__film').toDataURL()"); pg.wait_for_timeout(400); b2=pg.evaluate("document.querySelector('.hero__film').toDataURL()")
    ok('멈춘 동안 캔버스 그대로', a==b2)
    # 키보드: 신청 바 초점
    pg.focus('#dock-phone'); pg.wait_for_timeout(300)
    ok('번호 칸에 초점 가면 바가 보임', pg.evaluate("getComputedStyle(document.querySelector('#dock-phone')).visibility==='visible'"))
    pg.close()
    # 동작 줄이기: 끝까지 내려도 숨은 요소 없음
    for path in PAGES:
     ctx=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce'); pg=ctx.new_page(); pg.goto('http://localhost:8765/'+path); pg.wait_for_timeout(1000)
     H=pg.evaluate('document.documentElement.scrollHeight')
     for y in range(0,H,500): pg.evaluate(f'scrollTo(0,{y})'); pg.wait_for_timeout(50)
     hid=pg.evaluate("""[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();if(r.width<4||r.height<4)return false;let o=1,n=e;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}return o<0.2 && !e.closest('.story__blur,.stamp,.b-stitch,[aria-hidden=true],.ba__range,.choice,.drop')}).map(e=>e.className).slice(0,8)""")
     ok(f'/{path} 동작 줄이기에서 숨은 채 남은 요소 0', not hid, str(hid))
     ok(f'/{path} 동작 줄이기에서 움직임 꺼짐', pg.evaluate("!document.documentElement.classList.contains('anim')"))
     ctx.close()
    # 움직임 켠 채 끝까지 내린 뒤 숨은 요소
    for path in PAGES:
     ctx=b.new_context(viewport={'width':1366,'height':800}); pg=ctx.new_page(); pg.goto('http://localhost:8765/'+path); pg.wait_for_timeout(1200)
     H=pg.evaluate('document.documentElement.scrollHeight')
     for y in range(0,H+800,300): pg.mouse.wheel(0,300); pg.wait_for_timeout(60)
     pg.wait_for_timeout(800)
     hid=pg.evaluate("""[...document.querySelectorAll('main *, .foot *')].filter(e=>{const r=e.getBoundingClientRect();if(r.width<4||r.height<4||r.bottom<0||r.top>innerHeight)return false;if(e.closest('[aria-hidden=true],.ba__range,.choice,.drop'))return false;let o=1,n=e;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}return o<0.2}).map(e=>e.className).slice(0,8)""")
     ok(f'/{path} 끝까지 내린 뒤 끝 칸 보임', not hid, str(hid))
     ctx.close()
    # 메뉴: 열고, Esc로 닫고, 초점이 단추로 돌아온다
    pg=b.new_page(viewport={'width':390,'height':844}); pg.goto('http://localhost:8765/cases/'); pg.wait_for_timeout(600)
    pg.click('.top__menu'); pg.wait_for_timeout(200)
    ok('메뉴 열림·지금 페이지 표시', pg.evaluate("!document.getElementById('menu').hidden && !!document.querySelector('#menu [aria-current=page]')"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    ok('Esc로 닫히고 초점 복귀', pg.evaluate("document.getElementById('menu').hidden && document.activeElement.classList.contains('top__menu')"))
    pg.close()
    # 신청서: 보내기 눌러도 요청이 나가지 않고 주소에 개인정보가 실리지 않는다
    pg=b.new_page(viewport={'width':1366,'height':900}); reqs=[]
    pg.on('request',lambda r:reqs.append(r.url))
    pg.goto('http://localhost:8765/apply/?items=heel,welt'); pg.wait_for_timeout(600); reqs.clear()
    ok('주소의 수선 항목이 미리 골라짐', pg.evaluate("[...document.querySelectorAll('#a-items .chip[aria-pressed=true]')].map(c=>c.dataset.id).join()==='heel,welt'"))
    pg.fill('#a-name','홍길동'); pg.fill('#a-phone','010-1234-5678'); pg.check('#a-all'); pg.click('.submit'); pg.wait_for_timeout(500)
    ok('접수 예시 화면', pg.evaluate("!document.getElementById('done').hidden"))
    ok('보낼 때 요청 0·주소 그대로', not [u for u in reqs if 'localhost' in u] and '1234' not in pg.url, str(reqs[:3])+' '+pg.url)
    ok('입력 칸에 name 없음(스크립트 꺼져도 주소에 안 실림)', pg.evaluate("[...document.querySelectorAll('input:not([type=radio]):not([type=checkbox]),textarea,select')].every(e=>!e.name)"))
    pg.close(); b.close()
finally: srv.terminate()
for r in res: print(*r)
print('실패', sum(1 for r in res if r[0]=='실패'), '/', len(res))
