"""더한방 배포 전 확인: python3 _dev/check.py [사이트 폴더] [결과 폴더]
동작 줄이기 전체 화면 / 320·390·1366 가로 넘침 / 콘솔 오류 / 깨진 사진 / 스크롤 뒤 숨은 요소 / 다시 재생 / 탭 이동"""
import sys, os, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
out = sys.argv[2] if len(sys.argv) > 2 else '/tmp/hb-check'; os.makedirs(out, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Q, directory=root)
srv = socketserver.TCPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{port}/'
EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
fails = []
def ok(c, msg): print(('통과 ' if c else '실패 ') + msg); c or fails.append(msg)
HIDDEN = """() => [...document.querySelectorAll('main *')].filter(el => {
  const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false;
  if (r.bottom < innerHeight*.12 || r.top > innerHeight*.75) return false;
  if (el.closest('[hidden]')) return false;
  const cs = getComputedStyle(el); if (el.tagName === 'INPUT' && cs.opacity === '0') return false;
  return +cs.opacity < .2 || cs.visibility === 'hidden';
}).map(el => el.tagName + '.' + el.className).slice(0, 5)"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE)
    def page(w, h=800, mobile=False, reduce=False):
        ctx = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1, reduced_motion='reduce' if reduce else 'no-preference')
        ctx.route(lambda u: not u.startswith(URL), lambda r: r.abort())
        pg = ctx.new_page(); errs = []
        pg.on('console', lambda m: m.type == 'error' and 'net::' not in m.text and errs.append(m.text))
        pg.on('pageerror', lambda e: errs.append(str(e)))
        return pg, errs
    for w in (320, 390, 1366):
        for ch in ('home', 'tour', 'guide', 'menu', 'column'):
            pg, errs = page(w, mobile=w < 800, reduce=True); pg.goto(URL + '#' + ch); pg.wait_for_timeout(400)
            pg.evaluate("async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } scrollTo(0,0) }")
            pg.wait_for_timeout(500)
            ov = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
            broken = pg.evaluate("[...document.images].filter(i => i.complete && i.naturalWidth === 0 && !i.closest('[hidden]')).map(i => i.src)")
            ok(ov <= 0, f'{w}px {ch} 가로 넘침 {ov}'); ok(not broken, f'{w}px {ch} 깨진 사진 {broken[:3]}'); ok(not errs, f'{w}px {ch} 콘솔 오류 {errs[:2]}')
            if w in (390, 1366): pg.screenshot(path=f'{out}/full-{w}-{ch}.png', full_page=True)
            pg.context.close()
    # 움직임 켠 채: 휠로 끝까지 → 여러 위치에서 숨은 요소 0, 위로 오가며 다시 재생
    for w, mob in ((390, True), (1366, False)):
        for ch in ('home', 'tour', 'guide'):
            pg, errs = page(w, mobile=mob); pg.goto(URL + '#' + ch); pg.wait_for_timeout(1800)
            ok(pg.evaluate("document.documentElement.classList.contains('anim')"), f'{w}px {ch} 움직임 켜짐')
            bad = []; H_ = pg.evaluate('document.body.scrollHeight')
            for y in range(0, H_, 500):
                pg.mouse.wheel(0, 500); pg.wait_for_timeout(1300); bad += pg.evaluate(HIDDEN)
            for y in range(0, H_, 700):
                pg.mouse.wheel(0, -700); pg.wait_for_timeout(1300); bad += pg.evaluate(HIDDEN)
            ok(not bad, f'{w}px {ch} 스크롤 중 숨은 채 남은 요소 {bad[:3]}'); ok(not errs, f'{w}px {ch} 움직임 콘솔 오류 {errs[:2]}')
            pg.context.close()
    # 다시 재생: 비교 칸을 지나쳤다 돌아오면 in이 빠졌다가 다시 붙는지
    pg, _ = page(390, mobile=True); pg.goto(URL); pg.wait_for_timeout(1500)
    pg.evaluate("document.querySelector('#why').scrollIntoView()"); pg.wait_for_timeout(900)
    pg.evaluate("scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(900)
    gone = pg.evaluate("!document.querySelector('#why .pcard').classList.contains('in')")
    pg.evaluate("document.querySelector('#why').scrollIntoView()"); pg.wait_for_timeout(1500)
    back = pg.evaluate("document.querySelector('#why .pcard').classList.contains('in')")
    ok(gone and back, f'나갔다 들어오면 다시 재생 (되돌림 {gone}, 다시 {back})'); pg.context.close()
    # 라이브러리·스크립트 실패 대비: 본 스크립트를 막아도 3초 뒤 전부 보임
    pg, _ = page(390, mobile=True)
    pg.route('**/meals.js', lambda r: r.fulfill(body='throw new Error("x")'))
    pg.add_init_script("Object.defineProperty(window,'__rvOn',{get(){return false},set(){}})")
    pg.goto(URL); pg.wait_for_timeout(3500)
    ok(not pg.evaluate("document.documentElement.classList.contains('anim')"), '움직임이 못 켜지면 3초 뒤 anim 해제'); pg.context.close()
    b.close()
print('실패', len(fails)) if fails else print('전부 통과')
