# 루멘랩 배포 전 확인: 사이트 폴더에서 python3 -m http.server 8765 를 띄운 뒤 python3 _dev/check.py
# 페이지마다 320·390·1366 가로 넘침, 콘솔 오류, 깨진 사진, 사이트 안 링크, 동작 줄이기, 움직임 뒤 숨은 요소, 첫 화면 다시 흐려짐,
# 첫 화면(여러 화면 크기에서 글과 창·간판이 안 겹침, 내리면 창 안으로 확대·되돌림, 확대 안 하는 경우),
# 홈 '만든 것' 아이콘마다 소개 창(주소 /works/<id>/, 바로 써 보기·미리 보기, Esc·뒤로 가기로 닫힘), 소개 페이지에서 바로 써 보기
import os, sys, hashlib, re
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8765')
import json
here = os.path.dirname(os.path.abspath(__file__)); site = os.path.dirname(here); mono = os.path.dirname(site)
cat = json.load(open(os.path.join(here, 'catalog.json')))
ITEMS = [(k, it['id']) for k in ('games', 'apps') for it in cat.get(k, [])] + [('tools', it['id']) for g in cat['groups'] for it in cat['tools'] if it['group'] == g['id']]
PAGES = ['/', '/en/', '/works/daycount/', '/en/works/pickboard/', '/works/castleup/', '/en/works/chickrescue/', '/works/owlight/', '/works/setnote/',
         '/about/', '/en/about/', '/privacy/', '/en/privacy/', '/owlight/privacy/', '/owlight/support/', '/nope/']
PAIRS = [('/', '/en/'), ('/about/', '/en/about/'), ('/privacy/', '/en/privacy/')] + [(f'/works/{i}/', f'/en/works/{i}/') for _, i in ITEMS]  # 한국어·영어가 따로 된 페이지
ORIG = '/home/claude/ube1qa/lumenlab-site/setnote'  # 세트노트는 2026-10-06 setnote.lumenlab.page 로 옮김 → 아래 비교는 하지 않음
fails = []
def ok(c, msg):
    print(('통과 ' if c else '실패 ') + msg)
    if not c: fails.append(msg)

# 세트노트: 원래 사이트 파일과 한 글자도 다르지 않게
if False:
    a = sorted(os.path.relpath(os.path.join(r, f), ORIG) for r, _, fs in os.walk(ORIG) for f in fs)
    b = sorted(os.path.relpath(os.path.join(r, f), site + '/setnote') for r, _, fs in os.walk(site + '/setnote') for f in fs)
    same = a == b and all(open(os.path.join(ORIG, f), 'rb').read() == open(os.path.join(site, 'setnote', f), 'rb').read() for f in a)
    ok(same, f'세트노트 파일 {len(a)}개가 원본과 같음')

# 방침·지원 페이지 본문이 원래 사이트 문구와 같음 (틀만 바뀜)
def body_text(f):
    t = open(f).read(); t = t[t.index('<h1>'):t.rindex('</section>')]
    t = re.sub(r'<!--.*?-->', '', t, flags=re.S); t = re.sub(r'</div>\s*</div>\s*<div class="wrap doc">', '', t)
    return re.sub(r'\s+', ' ', t)
for pg in ['owlight/privacy', 'owlight/support']:
    o = os.path.join(os.path.dirname(ORIG), pg, 'index.html')
    if os.path.exists(o): ok(body_text(o) == body_text(os.path.join(site, pg, 'index.html')), f'{pg} 본문이 원래 문구 그대로')

# lumenlab.page 의 어떤 페이지에도 광고 코드가 없음(광고는 도구 사이트에만)
ads = [os.path.relpath(os.path.join(r, f), site) for r, ds, fs in os.walk(site) if '/_dev' not in r for f in fs if f.endswith('.html') and re.search(r'adsbygoogle|pagead2\.googlesyndication', open(os.path.join(r, f)).read())]
ok(not ads, f'lumenlab.page 페이지에 광고 코드 없음 {ads[:3]}')

# 소개 페이지·소개·방침이 가리키는 도구·앱 사이트 주소가 이 저장소의 실제 파일과 맞음(옆 폴더 = 그 사이트)
hostdir = {urlparse(it['url']).netloc: it['dir'] for it in cat['tools']}
missing = []; nlinks = 0
for pth in [a for pair in PAIRS[1:] for a in pair]:
    for h in set(re.findall(r'href="(https://[a-z0-9-]+\.lumenlab\.page/[^"#]*)', open(os.path.join(site, pth.strip('/'), 'index.html')).read())):
        u = urlparse(h); d = hostdir.get(u.netloc, u.netloc.split('.')[0]); base = os.path.join(mono, d, u.path.strip('/'))
        nlinks += 1
        if not any(os.path.isfile(x) for x in (os.path.join(base, 'index.html'), base + '.html')): missing.append(h)
ok(nlinks > 100 and not missing, f'정보 페이지의 도구·앱 사이트 링크 {nlinks}개가 실제 파일과 맞음 {missing[:3]}')

# 도구·게임·앱 사이트 주소(https://*.lumenlab.page/…)는 이 저장소의 옆 폴더 파일로 돌려준다(바로 써 보기 계산 파일, 미리 보기 사진·영상).
# 공평뽑기 모듈은 실제 사이트처럼 허락 머리말을 붙인다
TYPES = {'.js': 'application/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.json': 'application/json'}
def sub_file(r):
    u = urlparse(r.request.url); f = os.path.join(mono, hostdir.get(u.netloc, u.netloc.split('.')[0]), u.path.lstrip('/'))
    if not os.path.isfile(f): return r.fulfill(status=404, body='')
    hd = {'content-type': TYPES.get(os.path.splitext(f)[1], 'application/octet-stream')}
    if u.netloc.startswith('pick.') and u.path.startswith('/assets/core/'): hd['access-control-allow-origin'] = '*'
    r.fulfill(path=f, headers=hd)
SUB = re.compile(r'https://[a-z0-9-]+\.lumenlab\.page/.*')

with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    seen = set()
    for path in PAGES:
        for w in (320, 390, 1366):
            c = br.new_context(viewport={'width': w, 'height': 800}, locale='ko-KR')
            pg = c.new_page(); errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.route(SUB, sub_file)
            r = pg.goto(BASE + path); pg.wait_for_timeout(700 if '/works/' not in path else 1500)
            if path == '/nope/':
                errs = [e for e in errs if '404' not in e]
            sw = pg.evaluate('document.documentElement.scrollWidth')
            ok(sw <= w, f'{path} {w}px 가로 넘침 없음 ({sw})')
            ok(not errs, f'{path} {w}px 콘솔 오류 0 {errs[:2]}')
            left = pg.evaluate(r"(document.body.innerText.match(/\\[0-9]|\{\{|\$\{|undefined|NaN/g)||[]).slice(0,3)")
            ok(not left, f'{path} {w}px 화면 글에 자리표시자(\\1, {{{{, ${{, undefined) 없음 {left}')
            if w == 1366:
                # 끝까지 내렸다 올라와 lazy 사진까지 부른 뒤 깨진 사진 세기
                pg.evaluate('async()=>{for(let y=0;y<document.body.scrollHeight;y+=300){scrollTo(0,y);await new Promise(r=>setTimeout(r,40))}scrollTo(0,0)}'); pg.wait_for_timeout(300)
                broken = pg.evaluate('[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src)')
                ok(not broken, f'{path} 깨진 사진 0 {broken}')
                for h in pg.evaluate('[...document.querySelectorAll("a[href]")].map(a=>a.href)'):
                    u = urlparse(h)
                    if u.scheme in ('http', 'https') and h.startswith(BASE): seen.add(h.split('#')[0])
            c.close()
    # 사이트 안 링크가 전부 열림
    c = br.new_context(); rq = c.request
    for h in sorted(seen):
        st = rq.get(h).status
        ok(st == 200, f'링크 {h.replace(BASE, "")} → {st}')
    for f in ['/favicon.ico', '/favicon.svg', '/apple-touch-icon.png', '/robots.txt', '/og.png', '/setnote/sw.js']:
        ok(rq.get(BASE + f).status == 200, f'파일 {f}')
    c.close()

    # 동작 줄이기: 첫 페이지 요소가 전부 보임
    c = br.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce'); pg = c.new_page(); pg.goto(BASE + '/'); pg.wait_for_timeout(300)
    ok(not pg.evaluate("document.documentElement.classList.contains('anim')"), '동작 줄이기면 움직임 꺼짐')
    c.close()

    # 움직임 켜고 휠로 끝까지 내려가며 가운데 걸친 요소 중 숨은 것 0, 되돌아오면 다시 재생(첫 화면은 내리면 일부러 흐려지고 '만든 것'은 확대 끝(END p 0.72)에 드러나며 그동안 날아가는 아이콘 자리는 비어 있으니 그 구간은 아래 따로 확인)
    HID = '''()=>{const out=[];const H=innerHeight;const hz=document.querySelector('.zoom [data-hero]');if(hz&&scrollY<hz.offsetTop+(hz.offsetHeight-hz.querySelector('.hero__stage').offsetHeight)*.72)return out;for(const el of document.querySelectorAll('main *')){if(el.closest('.hero'))continue;const r=el.getBoundingClientRect();if(r.width<4||r.height<4)continue;if(r.bottom<H*.12||r.top>H*.75)continue;let o=1,n=el;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}const cs=getComputedStyle(el);if(o<.2||cs.visibility==='hidden')out.push(el.className||el.tagName)}return out}'''
    for w, h in [(390, 844), (1366, 860)]:
        c = br.new_context(viewport={'width': w, 'height': h}); pg = c.new_page(); pg.goto(BASE + '/')
        pg.wait_for_timeout(1500)
        ok(pg.evaluate('!!window.__rvOn'), f'{w}px 움직임 시작됨')
        bad = set()
        for _ in range(40):
            pg.mouse.wheel(0, 260); pg.wait_for_timeout(260)
            pg.wait_for_timeout(700)
            bad |= set(map(str, pg.evaluate(HID)))
            if pg.evaluate('innerHeight+scrollY>=document.body.scrollHeight-2'): break
        ok(not bad, f'{w}px 스크롤 뒤 숨은 채 남은 요소 0 {sorted(bad)[:4]}')
        c.close()

    # 첫 화면이 보인 뒤 다시 흐려지지 않음
    c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page()
    pg.add_init_script('''window.__op=[];(function f(t){const e=document.querySelector('.hero__h1');if(e){let o=1,n=e;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}__op.push(o)}if(performance.now()<2500)requestAnimationFrame(f)})()''')
    pg.goto(BASE + '/'); pg.wait_for_timeout(2800)
    ops = pg.evaluate('__op'); peak = False; dip = False
    for o in ops:
        if o >= .95: peak = True
        elif peak and o < .85: dip = True
    ok(peak and not dip, '첫 화면 제목이 한 번 보인 뒤 다시 흐려지지 않음')
    # 제목(루멘랩이 무엇을 만드는지) 두 줄
    lines = pg.evaluate("(()=>{const h=document.querySelector('.hero__h1');return Math.round(h.getBoundingClientRect().height/parseFloat(getComputedStyle(h).lineHeight))})()")
    ok(lines <= 2, f'휴대폰 첫 화면 제목 {lines}줄')
    c.close()

    # 첫 화면(불 켜진 작업실): 여러 화면 크기에서 글(머리·제목·설명·단추 둘)이 불 켜진 창·창 위 간판과 겹치지 않고, 창이 화면 안에 다 보이고, 글이 무대 밖으로 잘리지 않음
    LAY = r"""()=>{const vis=[...document.querySelectorAll('.hero [data-win],.hero .n-board')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getBoundingClientRect());
      const st=document.querySelector('.hero__stage').getBoundingClientRect(),hit=[];
      for(const c of document.querySelectorAll('.hero__kick,.hero__h1,.hero__sub,.hero__cta,.hero__more'))for(const r of c.getClientRects())for(const v of vis)
        if(r.left<v.right&&r.right>v.left&&r.top<v.bottom&&r.bottom>v.top)hit.push(c.className);
      const w=[...document.querySelectorAll('.hero [data-win]')].map(e=>e.getBoundingClientRect()).find(r=>r.width>0),cta=document.querySelector('.hero__act').getBoundingClientRect();
      return{n:vis.length,hit,win:w.left>=0&&w.right<=innerWidth&&w.top>=64&&w.bottom<=Math.min(innerHeight,st.bottom),cut:cta.bottom>st.bottom,
        sw:document.documentElement.scrollWidth}}"""
    for pre in ('', '/en'):
        for w, h in ((320, 568), (360, 740), (375, 667), (390, 844), (430, 932), (768, 1024), (844, 390), (1024, 768), (1280, 800), (1366, 768), (1440, 900), (1920, 1080), (2560, 1080)):
            c = br.new_context(viewport={'width': w, 'height': h}); pg = c.new_page(); pg.goto(BASE + pre + '/'); pg.wait_for_timeout(500)
            st = pg.evaluate(LAY)
            ok(st['n'] == 2 and not st['hit'] and st['win'] and not st['cut'] and st['sw'] <= w,
               f"{pre}/ {w}x{h} 첫 화면: 글이 창·간판과 겹침 {st['hit'] or '없음'}, 창 {'다 보임' if st['win'] else '잘림'}, 단추 {'잘림' if st['cut'] else '보임'}, 가로 {st['sw']}")
            c.close()
    # 내리면 창 안으로: 스크롤 위치를 따라 커지고(글은 흐려지고) 끝에 종이색이 덮이며 머리말이 원래대로, 되돌리면 처음 그대로, '만든 것' 제목이 곧 올라옴
    Z = r"""(p)=>{const H=document.querySelector('[data-hero]'),S=H.querySelector('.hero__stage');scrollTo({top:H.getBoundingClientRect().top+scrollY+p*(H.offsetHeight-S.offsetHeight),behavior:'instant'})}"""
    # aim = 모니터 화면(방 안 .r-scr, SVG 그대로 읽음) 가운데가 화면 가운데에서 얼마나 떨어졌나(화면 폭·높이에 대한 비율). 확대가 다 됐을 때 0 근처여야 한다
    ZS = r"""()=>{const n=document.querySelector('.night__near'),m=getComputedStyle(n).transform,c=document.querySelector('.hero__copy'),t=document.getElementById('works-title').getBoundingClientRect();
      const g=[...document.querySelectorAll('.hero [data-win]')].map(e=>e.getBoundingClientRect()).find(r=>r.width>0),sc=document.querySelector('#n-room .r-scr'),vb=document.querySelector('#n-room').getAttribute('viewBox').split(' ').map(Number);
      const ax=g.left+g.width*(+sc.getAttribute('x')+sc.getAttribute('width')/2)/vb[2],ay=g.top+g.height*(+sc.getAttribute('y')+sc.getAttribute('height')/2)/vb[3],wa=document.querySelector('.hero__wash'),st=document.querySelector('.hero__stage').getBoundingClientRect();
      return{s:m==='none'?1:new DOMMatrix(m).a,copy:+getComputedStyle(c).opacity,wash:getComputedStyle(wa).display==='none'?0:+getComputedStyle(wa).opacity,
        aim:Math.max(Math.abs(ax-st.left-st.width/2)/st.width,Math.abs(ay-st.top-st.height/2)/st.height),
        night:document.documentElement.classList.contains('top-night'),theme:document.querySelector('meta[name=theme-color]').content,title:t.top<innerHeight&&t.bottom>64,
        top:t.top>64&&t.bottom<innerHeight*.5,wo:+getComputedStyle(document.getElementById('works')).opacity,wp:getComputedStyle(document.getElementById('works')).pointerEvents}}"""
    for pre, w, h in (('', 390, 844), ('/en', 1366, 860)):
        c = br.new_context(viewport={'width': w, 'height': h}); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + pre + '/'); pg.wait_for_timeout(1800)
        z0 = pg.evaluate(ZS); pg.evaluate(Z, 0.3); pg.wait_for_timeout(250); zh = pg.evaluate(ZS)
        pg.evaluate(Z, 0.45); pg.wait_for_timeout(250); zm = pg.evaluate(ZS)
        pg.evaluate(Z, 0.72); pg.wait_for_timeout(250); za = pg.evaluate(ZS)
        pg.evaluate(Z, 1); pg.wait_for_timeout(250); z1 = pg.evaluate(ZS)
        pg.evaluate(Z, 0); pg.wait_for_timeout(250); zb = pg.evaluate(ZS)
        good = (z0['s'] == 1 and z0['copy'] == 1 and z0['night'] and zm['s'] > 2 and zm['copy'] < .05 and za['aim'] < .03 and z1['wash'] == 1 and not z1['night'] and z1['wo'] == 1
                and zh['wo'] == 0 and zh['wp'] == 'none' and za['wo'] == 1 and za['wp'] != 'none' and za['top'] and za['wash'] == 1
                and z1['theme'] != z0['theme'] and zb['s'] == 1 and zb['copy'] == 1 and zb['night'] and zb['theme'] == z0['theme'] and not errs)
        ok(good, f"{pre}/ {w}px 내리면 창 안으로: 배율 {z0['s']}→{zm['s']:.1f}→{za['s']:.1f}, 모니터 화면이 가운데에서 {za['aim']:.3f}, 글 {zm['copy']:.2f}, '만든 것' 가림 {zh['wo']}/{zh['wp']} → 드러남 {za['wo']}·제목이 머리말 바로 밑 {za['top']}, 끝 종이 {z1['wash']}·머리말 {'밤' if z1['night'] else '원래'}·'만든 것' {z1['wo']}, 되돌리면 배율 {zb['s']}·글 {zb['copy']} {errs[:1]}")
        pg.evaluate(Z, 0); pg.wait_for_timeout(200); pg.click('.hero__more'); pg.wait_for_timeout(4600)   # 장면을 끝까지 보여 주며(약 3.8초) 내려감
        st = pg.evaluate(ZS)
        wt = pg.evaluate("Math.round(document.getElementById('works').getBoundingClientRect().top)")
        ok(st['top'] and not st['night'] and st['wo'] == 1 and abs(wt) < 12 and pg.evaluate('location.hash') == '#works', f"{pre}/ {w}px '작업실 구경하기'를 누르면 만든 것이 화면 맨 위 제자리로(제목은 머리말 바로 밑) (위 {wt}px, 제목 {'머리말 밑' if st['top'] else '딴 데'})")
        pg.evaluate(Z, 0); pg.wait_for_timeout(200); pg.click('.hero__cta'); pg.wait_for_timeout(2500)
        tl = pg.evaluate("(()=>{const r=document.getElementById('tools').getBoundingClientRect();return Math.abs(r.top-80)<12&&+getComputedStyle(document.getElementById('works')).opacity===1})()")
        ok(tl and pg.evaluate('location.hash') == '#tools', f"{pre}/ {w}px '무료 웹 도구 써 보기'를 누르면 웹 도구 줄로 ({tl})")
        # 가려진 '만든 것' 안으로 탭 키가 오면 드러나는 곳까지 내려 줌
        pg.evaluate(Z, 0); pg.wait_for_timeout(200); pg.focus('.hero__more'); pg.keyboard.press('Tab'); pg.wait_for_timeout(600)
        fx = pg.evaluate("(()=>{const a=document.activeElement,r=a.getBoundingClientRect();return !!a.closest('#works')&&+getComputedStyle(document.getElementById('works')).opacity===1&&r.top>=0&&r.bottom<=innerHeight})()")
        ok(fx, f"{pre}/ {w}px 첫 화면에서 탭 키로 '만든 것' 안에 가면 그 칸이 드러나고 포커스가 보임")
        pg.keyboard.press('Shift+Tab'); pg.wait_for_timeout(500)
        bk = pg.evaluate("(()=>{const a=document.activeElement,H=document.querySelector('[data-hero]');return a.classList.contains('hero__more')&&Math.abs(scrollY-(H.getBoundingClientRect().top+scrollY))<3&&+getComputedStyle(document.querySelector('.hero__copy')).opacity===1})()")
        ok(bk, f"{pre}/ {w}px Shift+Tab으로 첫 화면 단추에 돌아오면 첫 화면 처음으로(단추 보임)")
        c.close()
    # 한 번 튕겨도 장면을 끝까지: 맨 위에서 휠 한 칸·손가락 한 번·PageDown이면 장면이 정해진 빠르기로 END(p 0.72)까지 가서 멈추고, 거기서 위로 한 번이면 맨 위까지
    PP = r"""()=>{const H=document.querySelector('[data-hero]'),S=H.querySelector('.hero__stage');return (scrollY-(H.getBoundingClientRect().top+scrollY))/(H.offsetHeight-S.offsetHeight)}"""
    def swipe(cdp, y0, y1):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 200, 'y': y0}]})
        for i in range(1, 5): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 200, 'y': y0 + (y1 - y0) * i / 4}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    for pre, w, h, how in (('', 390, 844, 'touch'), ('/en', 1280, 800, 'wheel'), ('', 1280, 800, 'key')):
        c = br.new_context(viewport={'width': w, 'height': h}, is_mobile=how == 'touch', has_touch=how == 'touch'); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + pre + '/'); pg.wait_for_timeout(2800)
        cdp = c.new_cdp_session(pg)
        if how == 'touch': swipe(cdp, 600, 250)
        elif how == 'wheel': pg.mouse.move(w / 2, h / 2); pg.mouse.wheel(0, 120)
        else: pg.keyboard.press('PageDown')
        pg.wait_for_timeout(1200); p1 = pg.evaluate(PP); pg.wait_for_timeout(3000); p2 = pg.evaluate(PP); st = pg.evaluate(ZS)
        if how == 'touch': swipe(cdp, 300, 650)
        elif how == 'wheel': pg.mouse.wheel(0, -120)
        else: pg.keyboard.press('PageUp')
        pg.wait_for_timeout(2800); p3 = pg.evaluate(PP); zb = pg.evaluate(ZS)
        ok(.15 < p1 < .6 and abs(p2 - .72) < .01 and st['wo'] == 1 and st['top'] and abs(p3) < .005 and zb['copy'] == 1 and zb['s'] == 1 and not errs
           and pg.evaluate("document.documentElement.style.overflow") == '',
           f"{pre}/ {w}px {how} 한 번에 장면을 끝까지: 1.2초 p {p1:.2f}(중간), 4.2초 p {p2:.3f}(END 0.72)·'만든 것' {st['wo']}, 위로 한 번이면 맨 위 p {p3:.3f}·글 {zb['copy']} {errs[:1]}")
        c.close()
    # 모니터 화면 = '만든 것'으로 가는 창: 화면이 넓어지는 중(p 0.53)엔 '만든 것'이 그 화면 안에 보이고(옮김·자름), END에 제자리(옮김 없음).
    # 그 뒤 줄이 보이면 줄 등이 켜지고 불빛이 날아가 아이콘이 다 켜짐, 끝 칸은 명함이 떨어져 보임
    PT = r"""()=>{const w=document.getElementById('works'),cs=getComputedStyle(w);return{o:+cs.opacity,tf:cs.transform!=='none',clip:cs.clipPath!=='none'}}"""
    LIT = r"""(id)=>{const s=document.getElementById(id);return{in:s.classList.contains('in'),off:[...s.querySelectorAll('.wi')].filter(a=>!a.classList.contains('on')&&!a.classList.contains('landed')).length}}"""
    for pre, w, h in (('', 390, 844), ('/en', 1366, 860)):
        c = br.new_context(viewport={'width': w, 'height': h}); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + pre + '/'); pg.wait_for_timeout(1800)
        pg.evaluate(Z, 0.53); pg.wait_for_timeout(250); mid = pg.evaluate(PT)
        pg.evaluate(Z, 0.72); pg.wait_for_timeout(1800); end = pg.evaluate(PT); g = pg.evaluate(LIT, 'games')
        pg.evaluate("document.getElementById('g-play').scrollIntoView()"); pg.wait_for_timeout(2000); t = pg.evaluate(LIT, 'g-play')
        pg.evaluate("document.querySelector('.end').scrollIntoView()"); pg.wait_for_timeout(1700)
        e = pg.evaluate("(()=>{const e=document.querySelector('.end'),b=document.querySelector('.bcard');return e.classList.contains('in')&&+getComputedStyle(b).opacity===1})()")
        fxn = pg.evaluate("document.querySelectorAll('.page-fx g').length")
        ok(mid['o'] == 1 and mid['tf'] and mid['clip'] and end['o'] == 1 and not end['tf'] and not end['clip'] and g['in'] and g['off'] == 0 and t['in'] and t['off'] == 0 and e and fxn == 0 and not errs,
           f"{pre}/ {w}px 모니터 화면 안에 '만든 것'(넓어지는 중 {mid}) → END 제자리 {end}, 줄 등·아이콘 불: 게임 {g}·모임 {t}, 끝 칸 명함 {e}, 남은 불빛 {fxn} {errs[:1]}")
        c.close()
    # 첫 화면 이야기 더하기: 거리의 사람이 휴대폰으로 불빛을 받고(10초 안), 간판을 누르면 글자가 톡 뜀, 사람을 누르면 손을 흔듦(오류 없이)
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("""window.__wk=0;(function f(){const s=[...document.querySelectorAll('.wk-scr')].find(e=>e.getBoundingClientRect().width>0);if(s&&+s.getAttribute('opacity')>.9)__wk=1;requestAnimationFrame(f)})()""")
    pg.goto(BASE + '/'); pg.wait_for_timeout(11000)
    wk = pg.evaluate('__wk')
    sp = pg.evaluate("(()=>{const r=[...document.querySelectorAll('.night__bld')].find(e=>e.getBoundingClientRect().width>0).querySelector('.n-board').getBoundingClientRect();return[r.left+r.width*.6,r.top+r.height/2]})()")
    pg.touchscreen.tap(sp[0], sp[1]); pg.wait_for_timeout(200)
    hop = pg.evaluate("[...document.querySelectorAll('.n-name tspan')].some(t=>t.hasAttribute('y'))")
    ok(wk == 1 and hop and not errs, f"첫 화면: 거리의 사람 휴대폰에 불빛 {wk}, 간판 누르면 글자 톡 {hop} {errs[:1]}")
    c.close()
    # (위: p 0.3엔 '만든 것'이 가려져 누를 수 없고, p 0.72엔 모니터 화면이 넓어져 된 '만든 것'이 화면 맨 위에 놓이고 제목이 머리말 바로 밑(아이콘 셋은 p 0.7에 다 앉음))
    # 확대하지 않을 때: 동작 줄이기, 낮은 화면, landing.js를 못 받음(3초 뒤 확대 풀림), JS 꺼짐 → 첫 화면은 화면 한 장, 글이 보이고 불은 켜진 채
    ONE = r"""()=>{const H=document.querySelector('[data-hero]'),S=H.querySelector('.hero__stage');return{one:Math.abs(H.offsetHeight-S.offsetHeight)<2,copy:+getComputedStyle(document.querySelector('.hero__copy')).opacity,
      lit:[...document.querySelectorAll('.n-lit')].filter(e=>e.getBoundingClientRect().width>0).every(e=>+getComputedStyle(e).opacity===1)}}"""
    # (낮은 화면은 움직임이 켜져 있어 들어올 때 불이 차례로 켜지는 2.5초를 기다린 뒤 본다)
    for name, opt, h, block in (('동작 줄이기', {'reduced_motion': 'reduce'}, 844, False), ('낮은 화면', {}, 500, False), ('landing.js를 못 받음', {}, 844, True), ('JS 꺼짐', {'java_script_enabled': False}, 844, False)):
        c = br.new_context(viewport={'width': 390, 'height': h}, **opt); pg = c.new_page()
        if block: pg.route(re.compile(r'.*/assets/landing\.js.*'), lambda r: r.abort())
        pg.goto(BASE + '/'); pg.wait_for_timeout(3600 if block else 3000 if h == 500 else 1800)
        st = pg.evaluate(ONE)
        ok(st['one'] and st['copy'] == 1 and st['lit'], f"{name}이면 첫 화면은 그림 한 장(확대 없음 {st['one']}), 글 보임, 불 켜짐")
        if opt.get('reduced_motion'):
            pg.evaluate('scrollTo(0, document.getElementById("works").offsetTop)'); pg.wait_for_timeout(300)
            ok(not pg.evaluate("document.documentElement.classList.contains('top-night')"), '동작 줄이기: 첫 화면을 지나면 머리말이 원래대로')
        c.close()

    c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page(); pg.goto(BASE + '/'); pg.wait_for_timeout(1500)
    pg.emulate_media(reduced_motion='reduce'); pg.wait_for_timeout(400); st = pg.evaluate(ONE)
    ok(st['one'] and st['copy'] == 1, f"보는 중에 동작 줄이기를 켜면 확대가 풀려 첫 화면이 화면 한 장 ({st['one']})")
    pg.emulate_media(reduced_motion='no-preference'); pg.wait_for_timeout(400)
    ok(not pg.evaluate(ONE)['one'], '동작 줄이기를 다시 끄면 확대가 돌아옴')
    pg.evaluate("scrollTo(0, innerHeight*.8)"); pg.wait_for_timeout(300); pg.emulate_media(media='print')
    st = pg.evaluate("""()=>{const h=document.querySelector('.hero__h1').getBoundingClientRect(),w=document.querySelector('.works').getBoundingClientRect(),c=getComputedStyle(document.querySelector('.hero__h1'));
      return{shown:h.height>0&&+getComputedStyle(document.querySelector('.hero__copy')).opacity===1&&c.visibility==='visible',under:w.top>=h.bottom,ink:c.color}}""")
    ok(st['shown'] and st['under'] and st['ink'] in ('rgb(0, 0, 0)',), f"인쇄하면 첫 화면 글이 검은 글로 보이고 '만든 것'이 그 밑에 {st}")
    c.close()

    # 언어: 한국어 / 와 영어 /en/ 은 따로 된 페이지. 자동으로 넘기지 않고 띠로만 알림, 방침 페이지는 #en 이면 영어 칸
    sm = open(os.path.join(site, 'sitemap.xml')).read()
    for ko, en in PAIRS:
        for path, lang, other in [(ko, 'ko', en), (en, 'en', ko)]:
            html = open(os.path.join(site, path.strip('/'), 'index.html')).read()
            alts = dict(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="https://lumenlab\.page([^"]*)"', html))
            ok(alts == {'ko': ko, 'en': en, 'x-default': en}, f'{path} hreflang 짝 {alts}')
            ok(f'<link rel="canonical" href="https://lumenlab.page{path}">' in html, f'{path} canonical 은 자기 주소')
            ok(f'<html lang="{lang}"' in html and 'i18n.js' not in html, f'{path} 언어 {lang}, 글 바꾸는 스크립트 없음')
            ok(f'<a class="lang" href="{other}"' in html, f'{path} 언어 단추는 {other}')
            ok(f'<loc>https://lumenlab.page{path}</loc>' in sm, f'sitemap 에 {path}')
        for path in (ko, en):  # 머리말·바닥글에서 만든 것·소개·방침으로 갈 수 있음
            html = open(os.path.join(site, path.strip('/'), 'index.html')).read(); pre = '/en' if path.startswith('/en/') else ''
            ok(all(f'href="{pre}{q}"' in html for q in ('/#works', '/about/', '/privacy/')), f'{path} 에서 만든 것·소개·방침 링크')
    c = br.new_context(viewport={'width': 390, 'height': 844}, locale='en-US'); pg = c.new_page(); pg.goto(BASE + '/'); pg.wait_for_timeout(400)
    ok(pg.evaluate("document.documentElement.lang") == 'ko' and pg.url == BASE + '/', '영어 브라우저도 / 는 한국어 그대로(자동 이동 없음)')
    ok(pg.locator('.langbar a[href="/en/"]').count() == 1, '영어 브라우저면 영어 페이지 제안 띠')
    pg.click('.langbar a'); pg.wait_for_timeout(400)
    ok(pg.url == BASE + '/en/' and pg.evaluate("document.documentElement.lang") == 'en', '띠를 누르면 /en/')
    ok(pg.locator('.langbar').count() == 0, '/en/ 에선 띠 없음')
    ko_left = pg.evaluate(r"""[...document.querySelectorAll('main *, header *, footer *')].filter(e=>e.children.length===0&&/[가-힣]/.test(e.textContent)&&!e.closest('[lang=ko]')).map(e=>e.textContent.trim()).slice(0,6)""")
    ok(not ko_left, f'영어 화면에 한국어가 남지 않음 {ko_left}')
    sw = pg.evaluate('document.documentElement.scrollWidth'); ok(sw <= 390, f'영어 390px 가로 넘침 없음 ({sw})')
    lines = pg.evaluate("(()=>{const h=document.querySelector('.hero__h1');return Math.round(h.getBoundingClientRect().height/parseFloat(getComputedStyle(h).lineHeight))})()")
    ok(lines <= 3, f'영어 휴대폰 첫 화면 제목 {lines}줄')
    hrefs = pg.evaluate('[...document.querySelectorAll("a[href]")].map(a=>a.getAttribute("href"))')
    ok(all(h.startswith(('/en/', '#', 'http', 'mailto:', 'tel:')) or h.endswith('#en') or h == '/' for h in hrefs), f'영어 페이지 안 링크는 영어 쪽 {[h for h in hrefs if not (h.startswith(("/en/", "#", "http", "mailto:", "tel:")) or h == "/")]}')
    pg.route(SUB, sub_file)
    for path in ('/en/about/', '/en/privacy/') + tuple(f'/en/works/{i}/' for _, i in ITEMS):
        pg.goto(BASE + path); pg.wait_for_timeout(200 if '/works/' not in path else 600)
        left = pg.evaluate(r"""[...document.querySelectorAll('main *, header *, footer *')].filter(e=>e.children.length===0&&/[가-힣]/.test(e.textContent)&&!e.closest('[lang=ko]')).map(e=>e.textContent.trim()).slice(0,6)""")
        ok(not left, f'{path} 화면에 한국어가 남지 않음 {left}')
        hs = pg.evaluate('[...document.querySelectorAll("a[href]:not(.lang)")].map(a=>a.getAttribute("href"))')
        bad = [h for h in hs if not (h.startswith(('/en/', '#', 'http', 'mailto:', 'tel:')) or h == '/')]
        ok(not bad, f'{path} 안 링크는 영어 쪽 {bad[:4]}')
        if 'privacy' not in path: ok(pg.locator('.top nav a[aria-current]').count() == 1, f'{path} 머리말에 지금 페이지 표시')
    pg.goto(BASE + '/en/'); pg.wait_for_timeout(300)
    pg.click('a.lang'); pg.wait_for_timeout(400)
    ok(pg.url == BASE + '/' and pg.evaluate('document.documentElement.lang') == 'ko' and '혼자 만들어요' in pg.inner_text('h1'), '한국어 단추로 / 로')
    ok(pg.locator('.langbar').count() == 0, '한국어를 고르면 띠가 다시 안 뜸')
    pg.goto(BASE + '/owlight/privacy/#en'); pg.wait_for_timeout(300)
    vis = pg.evaluate("[...document.querySelectorAll('.doc section')].map(s=>s.id+':'+(s.offsetHeight>0))")
    ok(vis == ['ko:false', 'en:true'], f'방침 #en 이면 영어 칸 {vis}')
    pg.click('.doc-head nav a[href=\"#ko\"]'); pg.wait_for_timeout(200)
    vis = pg.evaluate("[...document.querySelectorAll('.doc section')].map(s=>s.id+':'+(s.offsetHeight>0))")
    ok(vis == ['ko:true', 'en:false'], f'한국어 누르면 한국어 칸 {vis}')
    c.close()

    # 홈 '만든 것' 소개 창: 아이콘마다 창이 열리고 주소가 /works/<id>/ 가 되고, 도구는 그 사이트의 진짜 파일로 '바로 써 보기'가 뜨고(오류 0)
    # 자동 시연이 화면을 바꾸고, 게임·앱은 실제 화면 미리 보기가 있고, Esc·뒤로 가기로 닫히면 주소가 홈으로 돌아옴
    sc = json.load(open(os.path.join(here, 'showcase.json')))
    ok(all(i in sc[k] for k, i in ITEMS) and all(os.path.isfile(os.path.join(site, 'assets', 'try', i + '.js')) for k, i in ITEMS if k == 'tools'),
       f'만든 것 {len(ITEMS)}개 모두 소개 내용이 있고, 도구는 바로 써 보기 파일이 있음')
    SHEET = """()=>{const d=document.querySelector('dialog.sheet'),s=d.querySelector('.stage'),b=d.querySelector('.sh__body');return{open:d.open,path:location.pathname,
      name:(d.querySelector('.sh__name')||{}).textContent||'',fail:!!(s&&s.querySelector('.stage__msg')),text:s?s.innerText:'',stage:!!s,shots:d.querySelectorAll('.shots li').length,
      facts:d.querySelectorAll('.sh__facts li').length,cards:d.querySelectorAll('.sh__cards li').length,others:d.querySelectorAll('.sh__others a').length,h1:d.querySelectorAll('h1').length,
      over:b.scrollWidth>b.clientWidth+1,title:document.title}}"""
    for pre in ('', '/en'):
        for w in (390, 1366):
            c = br.new_context(viewport={'width': w, 'height': 844}, has_touch=w < 500); pg = c.new_page(); errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.route(SUB, sub_file)
            pg.goto(BASE + pre + '/'); pg.wait_for_timeout(300); home_title = pg.title()
            for i, (kind, tid) in enumerate(ITEMS):
                errs.clear(); a = pg.locator(f'.works a[data-show="{tid}"]')
                a.scroll_into_view_if_needed(); a.click(); pg.wait_for_timeout(900)
                before = pg.evaluate("(document.querySelector('dialog.sheet .stage')||{}).innerText||''")
                if kind == 'tools': pg.wait_for_timeout(3200)
                st = pg.evaluate(SHEET)
                if i % 2: pg.go_back()
                else: pg.keyboard.press('Escape')
                pg.wait_for_timeout(700)
                shut = not pg.evaluate("document.querySelector('dialog.sheet').open") and pg.evaluate('location.pathname+location.hash') == pre + '/' and pg.title() == home_title
                titled = st['title'] == open(os.path.join(site, pre.strip('/'), 'works', tid, 'index.html')).read().split('<title>')[1].split('</title>')[0].replace('&amp;', '&')
                body_ok = (st['stage'] and not st['fail'] and st['text'] != before) if kind == 'tools' else (not st['stage'] and st['shots'] >= 3)
                good = st['open'] and st['path'] == f'{pre}/works/{tid}/' and titled and body_ok and st['facts'] == 3 and st['cards'] >= 2 and st['others'] == len(ITEMS) - 1 and st['h1'] == 0 and not st['over'] and shut and not errs
                what = ('바로 써 보기 ' + ('실패' if st['fail'] else '뜸') + ', 시연 ' + ('움직임' if st['text'] != before else '멈춤')) if kind == 'tools' else f"미리 보기 {st['shots']}장"
                ok(good, f"{pre}/ {w}px {tid} 소개 창: 주소 {st['path']}, 제목 {'맞음' if titled else st['title']}, {what}, 숫자 {st['facts']}·카드 {st['cards']}·다른 것 {st['others']}, {'뒤로 가기' if i % 2 else 'Esc'}로 {'닫힘' if shut else '안 닫힘'} {errs[:2]}")
            # 창 안 '다른 것도 둘러보기'를 누르면 창 내용만 바뀌고(주소도), 한 번 닫으면 홈
            a = pg.locator('.works a[data-show="daycount"]'); a.scroll_into_view_if_needed(); a.click(); pg.wait_for_timeout(900)
            nxt = pg.locator('dialog.sheet .sh__others a').first; nid = nxt.get_attribute('data-show')
            nxt.scroll_into_view_if_needed(); nxt.click(); pg.wait_for_timeout(1200)
            st = pg.evaluate(SHEET)
            pg.keyboard.press('Escape'); pg.wait_for_timeout(700)
            ok(st['open'] and st['path'] == f'{pre}/works/{nid}/' and not pg.evaluate("document.querySelector('dialog.sheet').open") and pg.evaluate('location.pathname') == pre + '/',
               f'{pre}/ {w}px 창 안에서 다른 것({nid})으로 바뀌고 한 번 닫으면 홈')
            c.close()
    # 소개 페이지에서 바로: 도구마다 바로 써 보기가 뜨고 오류 0, 홈으로 가는 위치 줄
    c = br.new_context(viewport={'width': 1366, 'height': 900}); pg = c.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.route(SUB, sub_file)
    for kind, tid in ITEMS:
        if kind != 'tools': continue
        errs.clear(); pg.goto(BASE + f'/works/{tid}/'); pg.wait_for_timeout(1500)
        st = pg.evaluate("""()=>({fail:!!document.querySelector('.stage .stage__msg'),h1:document.querySelectorAll('h1').length,crumb:document.querySelectorAll('.pp__crumb a[href^="/#"]').length,text:document.querySelector('.stage').innerText.length})""")
        ok(not st['fail'] and st['text'] > 20 and st['h1'] == 1 and st['crumb'] == 2 and not errs, f'/works/{tid}/ 페이지에서 바로 써 보기가 뜸 {errs[:2]}')
    c.close()
    # 동작 줄이기여도 바로 써 보기는 그대로 뜸(날아오기·밀어 올리기 대신 흐려졌다 나타남), 예전 가이드 주소의 #try-·#t- 로 와도 그 창이 열림
    tools = [i for k, i in ITEMS if k == 'tools']
    for frag in ('#try-' + tools[0], '#t-' + tools[1]):
        c = br.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce'); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.route(SUB, sub_file)
        pg.goto(BASE + '/' + frag); pg.wait_for_timeout(1500)
        tid = frag.split('-', 1)[1]
        ok(pg.evaluate("document.querySelector('dialog.sheet').open && !document.querySelector('.stage .stage__msg') && document.querySelector('.stage').innerText.length > 20")
           and pg.evaluate('location.pathname') == f'/works/{tid}/' and not errs, f'동작 줄이기 + 예전 {frag} 주소로 와도 소개 창이 뜸 {errs[:2]}')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        ok(pg.evaluate('location.pathname+location.hash') == '/', f'{frag} 창을 닫으면 주소가 홈')
        c.close()
    br.close()

print('\n실패 %d개' % len(fails) if fails else '\n모두 통과')
sys.exit(1 if fails else 0)
