# 루멘랩 배포 전 확인: 사이트 폴더에서 python3 -m http.server 8765 를 띄운 뒤 python3 _dev/check.py
# 페이지마다 320·390·1366 가로 넘침, 콘솔 오류, 깨진 사진, 사이트 안 링크, 동작 줄이기, 움직임 뒤 숨은 요소, 첫 화면 다시 흐려짐, 세트노트 파일이 원본과 같은지
import os, sys, hashlib, re
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8765')
PAGES = ['/', '/en/', '/owlight/privacy/', '/owlight/support/', '/nope/']
ORIG = '/home/claude/ube1qa/lumenlab-site/setnote'  # 세트노트는 2026-10-06 setnote.lumenlab.page 로 옮김 → 아래 비교는 하지 않음
here = os.path.dirname(os.path.abspath(__file__)); site = os.path.dirname(here)
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

with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    seen = set()
    for path in PAGES:
        for w in (320, 390, 1366):
            c = br.new_context(viewport={'width': w, 'height': 800}, locale='ko-KR')
            pg = c.new_page(); errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            r = pg.goto(BASE + path); pg.wait_for_timeout(700)
            if path == '/nope/':
                errs = [e for e in errs if '404' not in e]
            sw = pg.evaluate('document.documentElement.scrollWidth')
            ok(sw <= w, f'{path} {w}px 가로 넘침 없음 ({sw})')
            ok(not errs, f'{path} {w}px 콘솔 오류 0 {errs[:2]}')
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

    # 움직임 켜고 휠로 끝까지 내려가며 가운데 걸친 요소 중 숨은 것 0, 되돌아오면 다시 재생
    HID = '''()=>{const out=[];const H=innerHeight;for(const el of document.querySelectorAll('main *')){const r=el.getBoundingClientRect();if(r.width<4||r.height<4)continue;if(r.bottom<H*.12||r.top>H*.75)continue;let o=1,n=el;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}const cs=getComputedStyle(el);if(o<.2||cs.visibility==='hidden')out.push(el.className||el.tagName)}return out}'''
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
    pg.add_init_script('''window.__op=[];(function f(t){const e=document.querySelector('.hero__lead');if(e){let o=1,n=e;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}__op.push(o)}if(performance.now()<2500)requestAnimationFrame(f)})()''')
    pg.goto(BASE + '/'); pg.wait_for_timeout(2800)
    ops = pg.evaluate('__op'); peak = False; dip = False
    for o in ops:
        if o >= .95: peak = True
        elif peak and o < .85: dip = True
    ok(peak and not dip, '첫 화면 소개 글이 한 번 보인 뒤 다시 흐려지지 않음')
    # 제목 두 줄
    lines = pg.evaluate("(()=>{const h=document.querySelector('.hero__title');return Math.round(h.getBoundingClientRect().height/parseFloat(getComputedStyle(h).lineHeight))})()")
    ok(lines <= 2, f'휴대폰 첫 화면 제목 {lines}줄')
    c.close()

    # 언어: 한국어 / 와 영어 /en/ 은 따로 된 페이지. 자동으로 넘기지 않고 띠로만 알림, 방침 페이지는 #en 이면 영어 칸
    for path, lang, other in [('/', 'ko', '/en/'), ('/en/', 'en', '/')]:
        html = open(os.path.join(site, path.strip('/'), 'index.html')).read()
        alts = dict(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="https://lumenlab\.page([^"]*)"', html))
        ok(alts == {'ko': '/', 'en': '/en/', 'x-default': '/en/'}, f'{path} hreflang 짝 {alts}')
        ok(f'<link rel="canonical" href="https://lumenlab.page{path}">' in html, f'{path} canonical 은 자기 주소')
        ok(f'<html lang="{lang}"' in html and 'i18n.js' not in html, f'{path} 언어 {lang}, 글 바꾸는 스크립트 없음')
    sm = open(os.path.join(site, 'sitemap.xml')).read()
    ok('<loc>https://lumenlab.page/</loc>' in sm and '<loc>https://lumenlab.page/en/</loc>' in sm, 'sitemap 에 / 와 /en/')
    c = br.new_context(viewport={'width': 390, 'height': 844}, locale='en-US'); pg = c.new_page(); pg.goto(BASE + '/'); pg.wait_for_timeout(400)
    ok(pg.evaluate("document.documentElement.lang") == 'ko' and pg.url == BASE + '/', '영어 브라우저도 / 는 한국어 그대로(자동 이동 없음)')
    ok(pg.locator('.langbar a[href="/en/"]').count() == 1, '영어 브라우저면 영어 페이지 제안 띠')
    pg.click('.langbar a'); pg.wait_for_timeout(400)
    ok(pg.url == BASE + '/en/' and pg.evaluate("document.documentElement.lang") == 'en', '띠를 누르면 /en/')
    ok(pg.locator('.langbar').count() == 0, '/en/ 에선 띠 없음')
    ko_left = pg.evaluate(r"""[...document.querySelectorAll('main *, header *, footer *')].filter(e=>e.children.length===0&&/[가-힣]/.test(e.textContent)&&!e.closest('[lang=ko]')).map(e=>e.textContent.trim()).slice(0,6)""")
    ok(not ko_left, f'영어 화면에 한국어가 남지 않음 {ko_left}')
    sw = pg.evaluate('document.documentElement.scrollWidth'); ok(sw <= 390, f'영어 390px 가로 넘침 없음 ({sw})')
    lines = pg.evaluate("(()=>{const h=document.querySelector('.hero__title');return Math.round(h.getBoundingClientRect().height/parseFloat(getComputedStyle(h).lineHeight))})()")
    ok(lines <= 2, f'영어 휴대폰 첫 화면 제목 {lines}줄')
    hrefs = pg.evaluate('[...document.querySelectorAll("a[href]")].map(a=>a.getAttribute("href"))')
    ok(all(h.startswith(('/en/', '#', 'http', 'mailto:')) or h.endswith('#en') or h == '/' for h in hrefs), f'영어 페이지 안 링크는 영어 쪽 {[h for h in hrefs if not h.startswith(("/en/", "#", "http", "mailto:"))]}')
    pg.click('a.lang'); pg.wait_for_timeout(400)
    ok(pg.url == BASE + '/' and '만드는 곳' in pg.inner_text('h1'), '한국어 단추로 / 로')
    ok(pg.locator('.langbar').count() == 0, '한국어를 고르면 띠가 다시 안 뜸')
    pg.goto(BASE + '/owlight/privacy/#en'); pg.wait_for_timeout(300)
    vis = pg.evaluate("[...document.querySelectorAll('.doc section')].map(s=>s.id+':'+(s.offsetHeight>0))")
    ok(vis == ['ko:false', 'en:true'], f'방침 #en 이면 영어 칸 {vis}')
    pg.click('.doc-head nav a[href=\"#ko\"]'); pg.wait_for_timeout(200)
    vis = pg.evaluate("[...document.querySelectorAll('.doc section')].map(s=>s.id+':'+(s.offsetHeight>0))")
    ok(vis == ['ko:true', 'en:false'], f'한국어 누르면 한국어 칸 {vis}')
    c.close()
    br.close()

print('\n실패 %d개' % len(fails) if fails else '\n모두 통과')
sys.exit(1 if fails else 0)
