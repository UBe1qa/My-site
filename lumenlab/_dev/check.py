# 루멘랩 배포 전 확인: 사이트 폴더에서 python3 -m http.server 8765 를 띄운 뒤 python3 _dev/check.py
# 페이지마다 320·390·1366 가로 넘침, 콘솔 오류, 깨진 사진, 사이트 안 링크, 동작 줄이기,
# 홈 첫 화면(2026-11-10 작업실 건물: 문질러 60%면 '불 켜기', 바로 켜기, 불 켜고 끄기, 동작 줄이기, 폰 세로 스크롤, 화면 밖이면 그리기 멈춤), 테마·서랍·전체 보기,
# 홈 '전체 보기' 아이콘마다 소개 창(주소 /works/<id>/, 바로 써 보기·미리 보기, Esc·뒤로 가기로 닫힘), 소개 페이지에서 바로 써 보기
import os, sys, hashlib, re
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8765')
import json
here = os.path.dirname(os.path.abspath(__file__)); site = os.path.dirname(here); mono = os.path.dirname(site)
cat = json.load(open(os.path.join(here, 'catalog.json')))
HOLD = [it['id'] for k in ('games', 'apps') for it in cat.get(k, []) if it.get('hold')]   # 출시 전이라 숨긴 것(홈 칸·소개 페이지 없음)
ITEMS = [(k, it['id']) for k in ('games', 'apps') for it in cat.get(k, []) if not it.get('hold')] + [('tools', it['id']) for g in cat['groups'] for it in cat['tools'] if it['group'] == g['id']]
PAGES = ['/', '/en/', '/works/daycount/', '/en/works/pickboard/', '/works/kankan/', '/en/works/chickrescue/', '/en/works/setnote/', '/works/setnote/',
         '/about/', '/en/about/', '/privacy/', '/en/privacy/', '/owlight/privacy/', '/owlight/support/', '/nope/',
         '/guides/', '/en/guides/', '/guides/date/d-day/', '/guides/salary/juhyu-sudang-gyesan/', '/guides/count/emoji-myeot-geulja/', '/en/guides/pick/ladder-lottery-fairness/']
PAIRS = [('/', '/en/'), ('/about/', '/en/about/'), ('/privacy/', '/en/privacy/'), ('/guides/', '/en/guides/')] + [(f'/works/{i}/', f'/en/works/{i}/') for _, i in ITEMS]  # 한국어·영어가 따로 된 페이지
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

# 광고 코드는 가이드 글(/guides/<도구>/<글>/, /en/guides/<도구>/<글>/)에만, 글마다 하나. 홈·만든 것·가이드 모음·소개·방침·앱 지원엔 없음(2026-10-29 가이드를 옮기며)
GUIDE_ART = re.compile(r'^(en/)?guides/[a-z]+/[a-z0-9-]+/index\.html$')
ad_pages = {os.path.relpath(os.path.join(r, f), site): open(os.path.join(r, f)).read().count('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9496167591465154')
            for r, ds, fs in os.walk(site) if '/_dev' not in r for f in fs if f.endswith('.html')}
wrong = [f for f, n in ad_pages.items() if n != (1 if GUIDE_ART.match(f) else 0)]
ok(not wrong and sum(1 for f in ad_pages if GUIDE_ART.match(f)) > 100, f'광고 코드는 가이드 글에만 하나씩({sum(1 for f in ad_pages if GUIDE_ART.match(f))}편) {wrong[:3]}')
ok(not [f for f in ad_pages if not GUIDE_ART.match(f) and 'adsbygoogle' in open(os.path.join(site, f)).read()], '가이드 글 밖엔 adsbygoogle 글자도 없음')
# AI 손님(2026-11-05): 루멘랩 모든 사이트의 robots.txt(모두 허용 + Content-Signal)·llms.txt 가 지금 페이지·sitemap·catalog 와 맞는지
import subprocess
_llms = subprocess.run([sys.executable, os.path.join(here, 'build_llms.py'), '--check'], capture_output=True, text=True)
ok(_llms.returncode == 0, f"robots.txt·llms.txt 최신({_llms.stdout.strip()[-300:]}) → 아니면 python3 lumenlab/_dev/build_llms.py")

# 가이드(2026-10-29 도구 사이트에서 옮김): 도구 글 하나하나가 이 사이트 글로 있고, canonical = 자기 주소, 사이트맵에 있고,
# hreflang 짝은 서로 가리키고, 글 안 링크는 이 사이트 주소(파일 있음)나 https 주소뿐, 영어 글은 영어 쪽으로만, RSS 는 한국어 글 전부
sys.path.insert(0, here); sys.dont_write_bytecode = True; import build_info as BI, build_guides as BG
sm_txt = open(os.path.join(site, 'sitemap.xml')).read()
gfound = BG.find(site, cat); gbad = []
ALT = re.compile(r'<link rel="alternate" hreflang="([^"]+)" href="https://lumenlab\.page([^"]*)"')
for a in gfound:
    pth = BG.root_path(a['it'], a['lang'], a['slug']); f = os.path.join(site, pth.strip('/'), 'index.html')
    if not os.path.isfile(f): gbad.append(f'{pth} 없음'); continue
    h = open(f).read(); body = h[h.index('<main'):h.index('</main>')]
    if f'<link rel="canonical" href="https://lumenlab.page{pth}">' not in h: gbad.append(f'{pth} canonical')
    if f'<loc>https://lumenlab.page{pth}</loc>' not in sm_txt: gbad.append(f'{pth} 사이트맵')
    alts = dict(ALT.findall(h))
    if alts:
        o = alts.get('en' if a['lang'] == 'ko' else 'ko'); of = os.path.join(site, (o or '').strip('/'), 'index.html')
        if alts.get(a['lang']) != pth or not o or not os.path.isfile(of) or dict(ALT.findall(open(of).read())) != alts: gbad.append(f'{pth} hreflang 짝 {alts}')
    for k, v in re.findall(r'\s(href|src|poster)="([^"]*)"', body):
        if v.startswith(('https://', '#', 'mailto:', 'tel:', 'data:')): continue
        q = v.split('#')[0]; t = os.path.join(site, q.lstrip('/'))
        if not v.startswith('/') or v.startswith('//') or not (os.path.isfile(t) or os.path.isfile(os.path.join(t, 'index.html'))): gbad.append(f'{pth} 링크 {v}')
        elif k == 'href' and (a['lang'] == 'en') != v.startswith('/en/') and v != '/': gbad.append(f'{pth} 다른 언어 쪽 링크 {v}')
ok(len(gfound) > 100 and not gbad, f'가이드 글 {len(gfound)}편: 페이지·canonical·사이트맵·hreflang 짝·글 안 링크 {gbad[:4]}')
rss = open(os.path.join(site, 'guides', 'rss.xml')).read()
import xml.dom.minidom
try: xml.dom.minidom.parseString(rss.encode()); rss_ok = True
except Exception as e: rss_ok = False
ok(rss_ok and rss.count('<item>') == sum(1 for a in gfound if a['lang'] == 'ko') and not re.search(r'\s(href|src)="/', rss), f"가이드 RSS: XML 맞음, 한국어 글 {rss.count('<item>')}편, 주소는 다 https")

# 출시 전이라 숨긴 것(catalog hold, 2026-10-29): 홈 칸·소개 페이지·사이트맵·바닥글 제품 줄·/about/ 목록에 없고, 옛 소개 페이지 주소는 _redirects 가 302로 홈에
red = open(os.path.join(site, '_redirects')).read()
shown_txt = {p: open(os.path.join(site, p)).read() for p in ('index.html', 'en/index.html', 'about/index.html', 'en/about/index.html', '404.html')}
for i in HOLD:
    it = next(x for k in ('games', 'apps') for x in cat.get(k, []) if x['id'] == i)
    left = [p for p in (f'works/{i}/index.html', f'en/works/{i}/index.html') if os.path.exists(os.path.join(site, p))] + (['sitemap'] if f'/works/{i}/' in sm_txt else [])
    left += [p for p, h in shown_txt.items() if f'data-show="{i}"' in h or any(f'data-i18n="f_{i}"' in row for row in re.findall(r'data-i18n="ft(?:Games|Apps)">.*?</div>', h))]
    left += [p for p in ('about/index.html', 'en/about/index.html') if it['name']['ko' if p[:3] != 'en/' else 'en'] in shown_txt[p][shown_txt[p].index('<main'):shown_txt[p].index('</main>')]]
    left += [p for p in (f'/works/{i}/', f'/en/works/{i}/') if not re.search(rf'^{re.escape(p)} /(en/)?#(games|apps) 302$', red, re.M)]
    ok(not left, f'{i}: 출시 전이라 홈 칸·소개 페이지·사이트맵·바닥글 제품 줄·소개 목록에 없고 옛 주소는 302 {left}')

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
TYPES = {'.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.json': 'application/json'}
def sub_file(r):
    u = urlparse(r.request.url); f = os.path.join(mono, hostdir.get(u.netloc, u.netloc.split('.')[0]), u.path.lstrip('/'))
    if not os.path.isfile(f): return r.fulfill(status=404, body='')
    hd = {'content-type': TYPES.get(os.path.splitext(f)[1], 'application/octet-stream')}
    if (u.netloc.startswith('pick.') and u.path.startswith('/assets/core/')) or (u.netloc.startswith('chess.') and u.path.startswith('/data/')): hd['access-control-allow-origin'] = '*'  # 두 사이트 _headers와 같게
    r.fulfill(path=f, headers=hd)
SUB = re.compile(r'https://[a-z0-9-]+\.lumenlab\.page/.*')

EXPAND = "(()=>{const b=document.querySelector('.all__btn');if(b&&b.getAttribute('aria-expanded')!=='true')b.click()})()"   # 홈 '전체 보기'를 펼친다(큰 아이콘 칸)
with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], executable_path=next((x for x in ('/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium') if os.path.exists(x)), None))  # 작업 공간마다 브라우저 자리가 다름
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

    # 첫 화면(2026-11-10 작업실 건물, assets/home-scene.js · 디자인 틀 2절 S): 장면을 그리고 제목은 폰 두 줄,
    # 문질러 60%면 종이가 걷히고 '불 켜기'가 뜸, '바로 켜기' → 0.5초 뒤 불(깜빡임·간판 2.3초 뒤 끝, 장면 다가감, 로고·빛무리 html.lit), 불 끄기,
    # 동작 줄이기면 바로 켜지고 꺼짐(다가감·먼지 없음), 폰은 종이 위에서 세로로 밀어도 페이지가 내려감(걷힌 뒤엔 그냥 스크롤), 화면 밖이면 그리기 멈춤
    PEEK = '__sceneCheck.peek()'
    READY = "window.__sceneCheck && __sceneCheck.peek().drawn"
    def scene_page(**kw):
        c = br.new_context(**kw); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        return c, pg, errs
    c, pg, errs = scene_page(viewport={'width': 390, 'height': 844})
    pg.goto(BASE + '/'); pg.wait_for_function(READY, timeout=8000)
    lines = pg.evaluate("(()=>{const h=document.querySelector('.hero__h1');return Math.round(h.getBoundingClientRect().height/parseFloat(getComputedStyle(h).lineHeight))})()")
    ok(lines == 2, f'휴대폰 첫 화면 제목 {lines}줄')
    b = pg.locator('.hero__paper').bounding_box()
    hid0 = pg.evaluate("getComputedStyle(document.querySelector('.hero__btn')).visibility")
    pg.mouse.move(b['x'] + 4, b['y'] + 30); pg.mouse.down()
    for rnd_ in range(4):
        for row in range(14):
            y = b['y'] + 30 + row * (b['height'] - 40) / 13
            xs = (b['x'] + 4, b['x'] + b['width'] - 4) if (row + rnd_) % 2 == 0 else (b['x'] + b['width'] - 4, b['x'] + 4)
            pg.mouse.move(xs[0], y, steps=2); pg.mouse.move(xs[1], y, steps=14)
    pg.mouse.up(); pg.wait_for_timeout(900)
    st = pg.evaluate(PEEK)
    shown = pg.evaluate("(()=>{const b=getComputedStyle(document.querySelector('.hero__btn'));return document.querySelector('.hero').classList.contains('ready')&&b.visibility==='visible'&&+b.opacity>.9&&document.querySelector('.hero__paper').hidden})()")
    ok(hid0 == 'hidden' and st['done'] and shown and not st['lit'] and not errs, f"폰 첫 화면: 처음엔 '불 켜기' 숨김({hid0}), 문질러 60% → 종이 걷힘·'불 켜기' 뜸 {st['done']}·{shown} {errs[:2]}")
    c.close()
    # 바로 켜기 → 불 켜짐 → 끄기 (PC, 움직임 있음)
    c, pg, errs = scene_page(viewport={'width': 1440, 'height': 900})
    pg.goto(BASE + '/'); pg.wait_for_function(READY, timeout=8000)
    pg.click('.hint__skip'); pg.wait_for_timeout(250); early = pg.evaluate(PEEK)
    pg.wait_for_timeout(3300)
    st = pg.evaluate(PEEK)
    on = pg.evaluate("""(()=>{const v=getComputedStyle(document.querySelector('.hero__view')).transform,s=document.querySelectorAll('.hero__btn [data-i18n]');
      return{lit:document.documentElement.classList.contains('lit'),scale:v==='none'?1:new DOMMatrix(v).a,label:s[1].hidden===false&&s[0].hidden===true,ready:document.querySelector('.hero').classList.contains('ready')}})()""")
    ok(not early['lit'] and st['lit'] and st['L'] == 1 and st['sig'] == 1 and on['lit'] and on['label'] and on['ready'] and abs(on['scale'] - 1.04) < .003 and not errs,
       f"PC '바로 켜기': 0.25초엔 아직 꺼짐 {not early['lit']}, 켜짐 L {st['L']}·간판 {st['sig']}, 로고·빛무리 {on['lit']}, 장면 다가감 {on['scale']:.3f}, 단추 '불 끄기' {on['label']} {errs[:2]}")
    pg.click('.hero__btn'); pg.wait_for_timeout(700); st = pg.evaluate(PEEK)
    off = pg.evaluate("!document.documentElement.classList.contains('lit') && !document.querySelector('.hero').classList.contains('on') && document.querySelectorAll('.hero__btn [data-i18n]')[0].hidden===false")
    ok(not st['lit'] and st['L'] == 0 and st['sig'] == 0 and off, f"PC 불 끄기: L {st['L']}, 간판 {st['sig']}, 되돌아감 {off}")
    # 화면 밖이면 그리기 멈춤, 돌아오면 다시
    pg.click('.hero__btn'); pg.wait_for_timeout(2600)
    pg.evaluate("scrollTo({top:document.body.scrollHeight,behavior:'instant'})"); pg.wait_for_timeout(500)
    f1 = pg.evaluate(PEEK); pg.wait_for_timeout(600); f2 = pg.evaluate(PEEK)
    pg.evaluate("scrollTo({top:0,behavior:'instant'})"); pg.wait_for_timeout(500); f3 = pg.evaluate(PEEK)
    ok(f1['frames'] == f2['frames'] and not f2['raf'] and f3['frames'] > f2['frames'], f"화면 밖이면 그리기 멈춤({f1['frames']}→{f2['frames']}), 돌아오면 다시({f3['frames']})")
    c.close()
    # 동작 줄이기: 바로 켜기 = 기다림·깜빡임 없이 곧바로, 다가감 없음, 그리기 루프 없음
    c, pg, errs = scene_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    pg.goto(BASE + '/'); pg.wait_for_function(READY, timeout=8000)
    pg.click('.hint__skip'); pg.wait_for_timeout(120); st = pg.evaluate(PEEK)
    tf = pg.evaluate("getComputedStyle(document.querySelector('.hero__view')).transform")
    pg.click('.hero__btn'); pg.wait_for_timeout(80); st2 = pg.evaluate(PEEK)
    ok(st['L'] == 1 and st['sig'] == 1 and not st['raf'] and tf == 'none' and st2['L'] == 0 and not st2['lit'] and not errs, f"동작 줄이기: 바로 켜짐 L {st['L']}, 루프 없음 {not st['raf']}, 다가감 없음 {tf}, 바로 꺼짐 L {st2['L']} {errs[:2]}")
    c.close()
    # 폰 세로 스크롤이 막히지 않음: 종이 위에서 세로로 빨리 밀면 페이지가 내려가고(그새 종이는 거의 안 닦임), 걷힌 뒤엔 장면 위에서도 그냥 스크롤
    def tswipe(cdp, x, y0, y1, n=6):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y0}]})
        for i in range(1, n + 1): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y0 + (y1 - y0) * i / n}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    c, pg, errs = scene_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    pg.goto(BASE + '/'); pg.wait_for_function(READY, timeout=8000); cdp = c.new_cdp_session(pg)
    tswipe(cdp, 200, 760, 400); pg.wait_for_timeout(900); y1 = pg.evaluate('scrollY'); st = pg.evaluate(PEEK)
    pg.evaluate("scrollTo({top:0,behavior:'instant'})"); pg.click('.hint__skip'); pg.wait_for_timeout(1200)
    tswipe(cdp, 200, 760, 400); pg.wait_for_timeout(900); y2 = pg.evaluate('scrollY')
    ok(y1 >= 300 and not st['done'] and y2 >= 300 and not errs, f'폰 첫 화면: 종이 위 세로 밀기 → 페이지 {y1}px 내려감(지우기 아님), 걷힌 뒤 장면 위 → {y2}px {errs[:2]}')
    c.close()
    # 테마: 화면 가운데 줄에 걸친 칸의 테마(밤 → 불빛 → 밤), 위 막대는 첫 화면을 지나면 테마 바탕. 폰 서랍(☰): 다섯 항목, Esc로 닫힘
    c, pg, errs = scene_page(viewport={'width': 390, 'height': 844})
    pg.goto(BASE + '/'); pg.wait_for_timeout(600)
    th = [pg.evaluate("[document.documentElement.dataset.theme,document.querySelector('.top').classList.contains('is-solid')]")]
    for sel in ('#works-title', '.feats .wp', '#contact-title'):
        pg.evaluate(f"document.querySelector('{sel}').scrollIntoView({{block:'center',behavior:'instant'}})"); pg.wait_for_timeout(400)
        th.append(pg.evaluate("[document.documentElement.dataset.theme,document.querySelector('.top').classList.contains('is-solid')]"))
    ok(th == [['night', False], ['lamp', False], ['lamp', True], ['night', True]], f'테마 밤 → 불빛 → 밤, 위 막대는 첫 화면 아래 끝을 지나야 바탕 {th}')
    pg.evaluate("scrollTo({top:0,behavior:'instant'})"); pg.click('.top .menu-btn'); pg.wait_for_timeout(450)
    dr = pg.evaluate("(()=>{const d=document.getElementById('drawer'),r=d.getBoundingClientRect();return{open:!d.hidden&&r.left===0&&r.width===innerWidth,n:d.querySelectorAll('a').length,h:Math.round(d.querySelector('a').getBoundingClientRect().height)}})()")
    pg.keyboard.press('Escape'); pg.wait_for_timeout(450)
    shut = pg.evaluate("document.getElementById('drawer').hidden && document.querySelector('.menu-btn').getAttribute('aria-expanded')==='false'")
    ok(dr['open'] and dr['n'] == 5 and dr['h'] == 56 and shut and not errs, f'폰 서랍: 열림 {dr}, Esc로 닫힘 {shut} {errs[:2]}')
    c.close()
    # 전체 보기: 처음엔 접힘, 누르면 펼침·접기. /#works 로 들어오면 펼친 채 그 자리(띠가 화면 위쪽)
    c, pg, errs = scene_page(viewport={'width': 390, 'height': 844})
    pg.goto(BASE + '/'); pg.wait_for_timeout(500)
    h0 = pg.evaluate("document.getElementById('all-wall').getBoundingClientRect().height")
    pg.evaluate("document.querySelector('.all__btn').click()"); pg.wait_for_timeout(700)
    h1 = pg.evaluate("document.getElementById('all-wall').getBoundingClientRect().height"); ex = pg.evaluate("document.querySelector('.all__btn').getAttribute('aria-expanded')")
    pg = c.new_page(); pg.goto(BASE + '/#works'); pg.wait_for_timeout(1500)   # 새로 들어온 /#works (다시 읽기는 그새 스크롤 자리를 되살려서 안 씀)
    st = pg.evaluate("(()=>({open:document.querySelector('.all').classList.contains('is-open'),top:Math.round(document.getElementById('works').getBoundingClientRect().top)}))()")
    ok(h0 < 2 and h1 > 1500 and ex == 'true' and st['open'] and 0 <= st['top'] <= 120 and not errs, f"전체 보기: 접힘 {h0:.0f}px → 펼침 {h1:.0f}px, /#works 로 오면 펼친 채 띠가 위 {st} {errs[:2]}")
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
    for path in ('/en/about/', '/en/privacy/', '/en/guides/', '/en/guides/pick/ladder-lottery-fairness/', '/en/guides/salary/severance-pay-korea/') + tuple(f'/en/works/{i}/' for _, i in ITEMS):
        pg.goto(BASE + path); pg.wait_for_timeout(200 if '/works/' not in path else 600)
        left = pg.evaluate(r"""[...document.querySelectorAll('main *, header *, footer *')].filter(e=>e.children.length===0&&/[가-힣]/.test(e.textContent)&&!e.closest('[lang=ko]')).map(e=>e.textContent.trim()).slice(0,6)""")
        ok(not left, f'{path} 화면에 한국어가 남지 않음 {left}')
        hs = pg.evaluate('[...document.querySelectorAll("a[href]:not(.lang)")].map(a=>a.getAttribute("href"))')
        bad = [h for h in hs if not (h.startswith(('/en/', '#', 'http', 'mailto:', 'tel:')) or h == '/')]
        ok(not bad, f'{path} 안 링크는 영어 쪽 {bad[:4]}')
        if 'privacy' not in path: ok(pg.locator('.top nav a[aria-current]').count() == 1, f'{path} 머리말에 지금 페이지 표시')
    pg.goto(BASE + '/en/'); pg.wait_for_timeout(300)
    pg.click('.top .menu-btn'); pg.wait_for_timeout(400); pg.click('.drawer a.lang'); pg.wait_for_timeout(400)   # 폰은 ☰ 서랍 안에 언어 단추
    ok(pg.url == BASE + '/' and pg.evaluate('document.documentElement.lang') == 'ko' and ('공들여 만들어요' in pg.inner_text('h1') or '혼자 만들어요' in pg.inner_text('h1')), '한국어 단추로 / 로')
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
    wt = json.load(open(os.path.join(here, 'works_text.json')))   # 글 칸 셋(쓰는 법·기준과 출처·고친 기록): 창에도 같은 수로
    want3 = lambda tid: (len(wt[tid]['how']['steps']), len((wt[tid].get('basis') or {}).get('rows', [])), len(wt[tid]['log']['items'])) if tid in wt else (0, 0, 0)
    ok(all(i in sc[k] for k, i in ITEMS) and all(os.path.isfile(os.path.join(site, 'assets', 'try', i + '.js')) for k, i in ITEMS if k == 'tools'),
       f'만든 것 {len(ITEMS)}개 모두 소개 내용이 있고, 도구는 바로 써 보기 파일이 있음')
    SHEET = """()=>{const d=document.querySelector('dialog.sheet'),s=d.querySelector('.stage'),b=d.querySelector('.sh__body');return{open:d.open,path:location.pathname,
      name:(d.querySelector('.sh__name')||{}).textContent||'',fail:!!(s&&s.querySelector('.stage__msg')),text:s?s.innerText:'',stage:!!s,shots:d.querySelectorAll('.shots li').length,
      facts:d.querySelectorAll('.sh__facts li').length,cards:d.querySelectorAll('.sh__cards li').length,others:d.querySelectorAll('.sh__others a').length,h1:d.querySelectorAll('h1').length,
      over:b.scrollWidth>b.clientWidth+1,title:document.title,steps:d.querySelectorAll('.sh__steps li').length,rows:d.querySelectorAll('.rc__row').length,days:d.querySelectorAll('.sh__days li').length}}"""
    for pre in ('', '/en'):
        for w in (390, 1366):
            c = br.new_context(viewport={'width': w, 'height': 844}, has_touch=w < 500); pg = c.new_page(); errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.route(SUB, sub_file)
            pg.goto(BASE + pre + '/'); pg.wait_for_timeout(300); home_title = pg.title(); pg.evaluate(EXPAND); pg.wait_for_timeout(500)
            for i, (kind, tid) in enumerate(ITEMS):
                errs.clear(); a = pg.locator(f'.wall a[data-show="{tid}"]')
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
                three = (st['steps'], st['rows'], st['days']) == want3(tid)
                good = st['open'] and st['path'] == f'{pre}/works/{tid}/' and titled and body_ok and st['facts'] == 3 and st['cards'] >= 2 and st['others'] == len(ITEMS) - 1 and st['h1'] == 0 and not st['over'] and three and shut and not errs
                what = ('바로 써 보기 ' + ('실패' if st['fail'] else '뜸') + ', 시연 ' + ('움직임' if st['text'] != before else '멈춤')) if kind == 'tools' else f"미리 보기 {st['shots']}장"
                ok(good, f"{pre}/ {w}px {tid} 소개 창: 주소 {st['path']}, 제목 {'맞음' if titled else st['title']}, {what}, 숫자 {st['facts']}·카드 {st['cards']}·다른 것 {st['others']}·쓰는 법 {st['steps']}·기준 {st['rows']}·기록 {st['days']}, {'뒤로 가기' if i % 2 else 'Esc'}로 {'닫힘' if shut else '안 닫힘'} {errs[:2]}")
            # 창 안 '다른 것도 둘러보기'를 누르면 창 내용만 바뀌고(주소도), 한 번 닫으면 홈
            a = pg.locator('.wall a[data-show="daycount"]'); a.scroll_into_view_if_needed(); a.click(); pg.wait_for_timeout(900)
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
    # /guides/ 는 2026-10-29부터 진짜 페이지(가이드 모음): 예전에 퍼진 /guides/#try-…, /en/guides/#t-… 는 홈의 그 창으로 넘김
    for pre, frag in (('', '#try-' + tools[2]), ('/en', '#t-' + tools[3])):
        c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.route(SUB, sub_file)
        pg.goto(BASE + pre + '/guides/' + frag); pg.wait_for_timeout(1800)
        tid = frag.split('-', 1)[1]
        ok(pg.evaluate("!!document.querySelector('dialog.sheet') && document.querySelector('dialog.sheet').open") and pg.evaluate('location.pathname') == f'{pre}/works/{tid}/' and not errs,
           f'예전 {pre}/guides/{frag} 로 와도 홈의 소개 창이 뜸 ({pg.evaluate("location.pathname")}) {errs[:2]}')
        c.close()
    c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page(); pg.goto(BASE + '/guides/#qr'); pg.wait_for_timeout(1800)   # 사이트 전체 scroll-behavior:smooth 라 그 칸까지 부드럽게 내려감(약 1초)
    top = pg.evaluate("document.querySelector('#qr').getBoundingClientRect().top")
    ok(pg.evaluate('location.pathname+location.hash') == '/guides/#qr' and 0 <= top < 220, f'가이드 모음 #도구 로 오면 그 도구 칸에서 멈춤(넘기지 않음, 칸 위 {round(top)}px)')
    c.close()

    # 소개 창 = 작업대: 열면 스탠드가 꺼진 채였다가 켜지고(.off 빠짐), 스탠드를 누르면 꺼지고 또 누르면 켜짐, 사실 숫자는 끝에 원래 글 그대로,
    # 도구는 모니터 안 무대, 닫을 때 스탠드가 꺼짐. 소개 페이지는 처음부터 켜진 채(CSS 첫 켜짐)
    for w in (390, 1366):
        c = br.new_context(viewport={'width': w, 'height': 844}, has_touch=w < 500); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.route(SUB, sub_file)
        pg.goto(BASE + '/'); pg.wait_for_timeout(300); pg.evaluate(EXPAND); pg.wait_for_timeout(500)
        a = pg.locator('.wall a[data-show="chickrescue"]'); a.scroll_into_view_if_needed(); a.click(); pg.wait_for_timeout(120)
        off0 = pg.evaluate("!!document.querySelector('dialog.sheet .sh__spot.off')"); pg.wait_for_timeout(1500)
        on1 = pg.evaluate("!document.querySelector('dialog.sheet .sh__spot.off') && !!document.querySelector('dialog.sheet .sh__spot .sh__lamp') && !!document.querySelector('dialog.sheet .sh__spot .sh__status, dialog.sheet .sh__status')")
        facts = pg.evaluate("[...document.querySelectorAll('dialog.sheet .sh__facts b')].map(b=>b.textContent)")
        want = open(os.path.join(site, 'works', 'chickrescue', 'index.html')).read().split('<ul class="sh__facts">')[1].split('</ul>')[0]
        same = all(f'<b>{f}</b>' in want for f in facts)
        pg.locator('dialog.sheet .sh__lamp').click(force=True); pg.wait_for_timeout(250); tog1 = pg.evaluate("!!document.querySelector('dialog.sheet .sh__spot.off')")
        pg.locator('dialog.sheet .sh__lamp').click(force=True); pg.wait_for_timeout(250); tog2 = pg.evaluate("!document.querySelector('dialog.sheet .sh__spot.off')")
        pg.keyboard.press('Escape'); pg.wait_for_timeout(60); dark = pg.evaluate("!!document.querySelector('dialog.sheet .sh__spot.off')"); pg.wait_for_timeout(600)
        a = pg.locator('.wall a[data-show="daycount"]'); a.scroll_into_view_if_needed(); a.click(); pg.wait_for_timeout(900)
        mon = pg.evaluate("!!document.querySelector('dialog.sheet .mon > .stage[data-tool]')")
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        ok(off0 and on1 and same and tog1 and tog2 and dark and mon and not errs,
           f'{w}px 작업대: 처음 꺼짐 {off0}, 켜짐 {on1}, 숫자 끝 {facts}, 스탠드 끄기·켜기 {tog1}·{tog2}, 닫을 때 꺼짐 {dark}, 모니터 안 무대 {mon} {errs[:2]}')
        c.close()
    c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page(); pg.goto(BASE + '/en/works/oneturn/'); pg.wait_for_timeout(1600)
    ok(pg.evaluate("!document.querySelector('.sh__spot.off') && getComputedStyle(document.querySelector('.sh__spot')).getPropertyValue('--sb-lit').trim()==='1'"), '소개 페이지: 작업대 스탠드가 켜진 채')
    c.close()
    br.close()

print('\n실패 %d개' % len(fails) if fails else '\n모두 통과')
sys.exit(1 if fails else 0)
