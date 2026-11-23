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

with sync_playwright() as p:
    br = p.chromium.launch(executable_path=next((x for x in ('/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium') if os.path.exists(x)), None))  # 작업 공간마다 브라우저 자리가 다름
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
    c = br.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce'); pg = c.new_page(); pg.goto(BASE + '/en/'); pg.wait_for_timeout(300)
    ok(not pg.evaluate("document.documentElement.classList.contains('anim')"), '/en/ 동작 줄이기면 움직임 꺼짐')
    c.close()

    # 움직임 켜고 휠로 끝까지 내려가며 가운데 걸친 요소 중 숨은 것 0, 되돌아오면 다시 재생(명함 ✓ 도장은 답장 불빛이 닿아야 찍히니 아래 끝 칸 시험이 따로 봄, 끝 칸 모니터 번쩍 판은 늘 0, 첫 화면은 내리면 일부러 흐려지고 '만든 것'은 확대 끝(END p 0.72)에 드러나며 그동안 날아가는 아이콘 자리는 비어 있으니 그 구간은 아래 따로 확인)
    HID = '''()=>{const out=[];const H=innerHeight;const hz=document.querySelector('.zoom [data-hero]');if(hz&&scrollY<hz.offsetTop+(hz.offsetHeight-hz.querySelector('.hero__stage').offsetHeight)*.72)return out;for(const el of document.querySelectorAll('main *')){if(el.closest('.hero,.bcard__stamp,.end__stage'))continue;const r=el.getBoundingClientRect();if(r.width<4||r.height<4)continue;if(r.bottom<H*.12||r.top>H*.75)continue;let o=1,n=el;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}const cs=getComputedStyle(el);if(o<.2||cs.visibility==='hidden')out.push(el.className||el.tagName)}return out}'''
    for w, h in [(390, 844), (1366, 860)]:
        c = br.new_context(viewport={'width': w, 'height': h}); pg = c.new_page(); pg.goto(BASE + '/en/')
        pg.wait_for_timeout(1500)
        ok(pg.evaluate('!!window.__rvOn'), f'/en/ {w}px 움직임 시작됨')
        bad = set()
        for _ in range(40):
            pg.mouse.wheel(0, 260); pg.wait_for_timeout(260)
            pg.wait_for_timeout(700)
            bad |= set(map(str, pg.evaluate(HID)))
            if pg.evaluate('innerHeight+scrollY>=document.body.scrollHeight-2'): break
        ok(not bad, f'/en/ {w}px 스크롤 뒤 숨은 채 남은 요소 0 {sorted(bad)[:4]}')
        c.close()

    # 첫 화면이 보인 뒤 다시 흐려지지 않음
    c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page()
    pg.add_init_script('''window.__op=[];(function f(t){const e=document.querySelector('.hero__h1');if(e){let o=1,n=e;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}__op.push(o)}if(performance.now()<2500)requestAnimationFrame(f)})()''')
    pg.goto(BASE + '/en/'); pg.wait_for_timeout(2800)
    ops = pg.evaluate('__op'); peak = False; dip = False
    for o in ops:
        if o >= .95: peak = True
        elif peak and o < .85: dip = True
    ok(peak and not dip, '/en/ 첫 화면 제목이 한 번 보인 뒤 다시 흐려지지 않음')
    # 제목(루멘랩이 무엇을 만드는지) 두 줄
    lines = pg.evaluate("(()=>{const h=document.querySelector('.hero__h1');return Math.round(h.getBoundingClientRect().height/parseFloat(getComputedStyle(h).lineHeight))})()")
    ok(lines <= 3, f'/en/ 휴대폰 첫 화면 제목 {lines}줄')
    c.close()

    # 첫 화면(불 켜진 작업실): 여러 화면 크기에서 글(머리·제목·설명·단추 둘)이 불 켜진 창·창 위 간판과 겹치지 않고, 창이 화면 안에 다 보이고, 글이 무대 밖으로 잘리지 않음
    LAY = r"""()=>{const vis=[...document.querySelectorAll('.hero [data-win],.hero .n-board')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getBoundingClientRect());
      const st=document.querySelector('.hero__stage').getBoundingClientRect(),hit=[];
      for(const c of document.querySelectorAll('.hero__kick,.hero__h1,.hero__sub,.hero__cta,.hero__more'))for(const r of c.getClientRects())for(const v of vis)
        if(r.left<v.right&&r.right>v.left&&r.top<v.bottom&&r.bottom>v.top)hit.push(c.className);
      const w=[...document.querySelectorAll('.hero [data-win]')].map(e=>e.getBoundingClientRect()).find(r=>r.width>0),cta=document.querySelector('.hero__act').getBoundingClientRect();
      return{n:vis.length,hit,win:w.left>=0&&w.right<=innerWidth&&w.top>=64&&w.bottom<=Math.min(innerHeight,st.bottom),cut:cta.bottom>st.bottom,
        sw:document.documentElement.scrollWidth}}"""
    for pre in ('/en',):
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
    for pre, w, h in (('/en', 390, 844), ('/en', 1366, 860)):
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
    for pre, w, h, how in (('/en', 390, 844, 'touch'), ('/en', 1280, 800, 'wheel'), ('/en', 1280, 800, 'key')):
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
    # 그 뒤 줄이 보이면 줄 등이 켜지고 불빛이 날아가 아이콘이 다 켜짐, 끝 칸은 도시가 잠들기 시작하고 명함은 보임
    PT = r"""()=>{const w=document.getElementById('works'),cs=getComputedStyle(w);return{o:+cs.opacity,tf:cs.transform!=='none',clip:cs.clipPath!=='none'}}"""
    LIT = r"""(id)=>{const s=document.getElementById(id);return{in:s.classList.contains('in'),off:[...s.querySelectorAll('.wi')].filter(a=>!a.classList.contains('on')&&!a.classList.contains('landed')).length}}"""
    for pre, w, h in (('/en', 390, 844), ('/en', 1366, 860)):
        c = br.new_context(viewport={'width': w, 'height': h}); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + pre + '/'); pg.wait_for_timeout(1800)
        pg.evaluate(Z, 0.53); pg.wait_for_timeout(250); mid = pg.evaluate(PT)
        pg.evaluate(Z, 0.72); pg.wait_for_timeout(1800); end = pg.evaluate(PT); g = pg.evaluate(LIT, 'games')
        pg.evaluate("document.getElementById('g-play').scrollIntoView()"); pg.wait_for_timeout(2000); t = pg.evaluate(LIT, 'g-play')
        pg.evaluate("document.querySelector('.end').scrollIntoView()"); pg.wait_for_timeout(1700)
        e = pg.evaluate("(()=>{const b=document.querySelector('.bcard');return !!document.querySelector('.end-anim.dawn')&&+getComputedStyle(b).opacity===1})()")
        fxn = pg.evaluate("document.querySelectorAll('.page-fx .pf-b').length")
        ok(mid['o'] == 1 and mid['tf'] and mid['clip'] and end['o'] == 1 and not end['tf'] and not end['clip'] and g['in'] and g['off'] == 0 and t['in'] and t['off'] == 0 and e and fxn == 0 and not errs,
           f"{pre}/ {w}px 모니터 화면 안에 '만든 것'(넓어지는 중 {mid}) → END 제자리 {end}, 줄 등·아이콘 불: 게임 {g}·모임 {t}, 끝 칸 창밖에 날이 밝기 시작·명함 보임 {e}, 남은 불빛 {fxn} {errs[:1]}")
        c.close()
    # 다시 내려와도 또: '만든 것'까지 내렸다 첫 화면 맨 위로 올리면 줄 등·아이콘이 꺼지고 끝 칸 도시 불이 다시 켜져 처음으로 돌아가고, 다시 내리면 불빛이 또 날아가 켬
    FX = r"""()=>({fx:document.querySelectorAll('.page-fx .pf-b').length,gin:document.getElementById('games').classList.contains('in'),
      on:document.querySelectorAll('.works .wi.on').length,end:document.querySelector('.end').classList.contains('dawn'),out:/^inset\(0(px)? 0(px)? 100%/.test(getComputedStyle(document.getElementById('works')).clipPath)})"""
    for pre, w, h in (('/en', 412, 780), ('/en', 1366, 800)):
        c = br.new_context(viewport={'width': w, 'height': h}); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + pre + '/'); pg.wait_for_timeout(1800)
        rounds = []
        for rnd in range(2):
            pg.evaluate(Z, 0.72); bead = 0
            for i in range(10): pg.wait_for_timeout(120); bead = max(bead, pg.evaluate(FX)['fx'])
            pg.wait_for_timeout(1400); a = pg.evaluate(FX)
            pg.evaluate("document.querySelector('.end').scrollIntoView()"); pg.wait_for_timeout(1500); e = pg.evaluate(FX)['end']
            pg.evaluate(Z, 0); pg.wait_for_timeout(400); b = pg.evaluate(FX)
            rounds.append((bead, a['gin'], e, b['gin'] or b['on'] > 0 or b['end'], b['out']))
        ok(all(r[0] > 0 and r[1] and r[2] and not r[3] and r[4] for r in rounds) and not errs,
           f"{pre}/ {w}px 내렸다 올렸다 두 번: 매번 불빛이 날아가 켜지고 끝 칸 창밖에 날이 밝음, 맨 위에선 다 꺼지고 끝 칸은 다시 밤으로, 숨은 '만든 것'은 그리지 않음(첫 화면 아래쪽을 덮지 않음) (날아간 불빛·게임 줄·끝 칸 새벽·맨 위에 남은 불·안 그림) {rounds} {errs[:1]}")
        c.close()
    # 첫 화면 이야기 더하기: 거리의 셋째 손님(휴대폰)이 불빛을 받아 화면이 켜지고(45초 안, 아이·개 다음), 간판을 누르면 글자가 톡 뜀(오류 없이)
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("""window.__wk=0;(function f(){const s=[...document.querySelectorAll('.n-cast .scr')].find(e=>e.getBoundingClientRect().width>0);if(s&&+s.getAttribute('opacity')>.9)__wk=1;requestAnimationFrame(f)})()""")
    pg.goto(BASE + '/en/')
    try: pg.wait_for_function('__wk === 1', timeout=45000)
    except Exception: pass
    wk = pg.evaluate('__wk')
    sp = pg.evaluate("(()=>{const r=[...document.querySelectorAll('.night__bld')].find(e=>e.getBoundingClientRect().width>0).querySelector('.n-board').getBoundingClientRect();return[r.left+r.width*.6,r.top+r.height/2]})()")
    pg.touchscreen.tap(sp[0], sp[1]); pg.wait_for_timeout(200)
    hop = pg.evaluate("[...document.querySelectorAll('.n-name tspan')].some(t=>t.hasAttribute('y'))")
    ok(wk == 1 and hop and not errs, f"/en/ 첫 화면: 거리의 사람 휴대폰에 불빛 {wk}, 간판 누르면 글자 톡 {hop} {errs[:1]}")
    c.close()
    # (위: p 0.3엔 '만든 것'이 가려져 누를 수 없고, p 0.72엔 모니터 화면이 넓어져 된 '만든 것'이 화면 맨 위에 놓이고 제목이 머리말 바로 밑(아이콘 셋은 p 0.7에 다 앉음))
    # 확대하지 않을 때: 동작 줄이기, 낮은 화면, landing.js를 못 받음(3초 뒤 확대 풀림), JS 꺼짐 → 첫 화면은 화면 한 장, 글이 보이고 불은 켜진 채
    ONE = r"""()=>{const H=document.querySelector('[data-hero]'),S=H.querySelector('.hero__stage');return{one:Math.abs(H.offsetHeight-S.offsetHeight)<2,copy:+getComputedStyle(document.querySelector('.hero__copy')).opacity,
      lit:[...document.querySelectorAll('.n-lit')].filter(e=>e.getBoundingClientRect().width>0).every(e=>+getComputedStyle(e).opacity===1)}}"""
    # (낮은 화면은 움직임이 켜져 있어 들어올 때 불이 차례로 켜지는 2.5초를 기다린 뒤 본다)
    for name, opt, h, block in (('동작 줄이기', {'reduced_motion': 'reduce'}, 844, False), ('낮은 화면', {}, 500, False), ('landing.js를 못 받음', {}, 844, True), ('JS 꺼짐', {'java_script_enabled': False}, 844, False)):
        c = br.new_context(viewport={'width': 390, 'height': h}, **opt); pg = c.new_page()
        if block: pg.route(re.compile(r'.*/assets/landing\.js.*'), lambda r: r.abort())
        pg.goto(BASE + '/en/'); pg.wait_for_timeout(3600 if block else 3000 if h == 500 else 1800)
        st = pg.evaluate(ONE)
        ok(st['one'] and st['copy'] == 1 and st['lit'], f"/en/ {name}이면 첫 화면은 그림 한 장(확대 없음 {st['one']}), 글 보임, 불 켜짐")
        if opt.get('reduced_motion'):
            pg.evaluate('scrollTo(0, document.getElementById("works").offsetTop)'); pg.wait_for_timeout(300)
            ok(not pg.evaluate("document.documentElement.classList.contains('top-night')"), '동작 줄이기: 첫 화면을 지나면 머리말이 원래대로')
        c.close()

    c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page(); pg.goto(BASE + '/en/'); pg.wait_for_timeout(1500)
    pg.emulate_media(reduced_motion='reduce'); pg.wait_for_timeout(400); st = pg.evaluate(ONE)
    ok(st['one'] and st['copy'] == 1, f"보는 중에 동작 줄이기를 켜면 확대가 풀려 첫 화면이 화면 한 장 ({st['one']})")
    pg.emulate_media(reduced_motion='no-preference'); pg.wait_for_timeout(400)
    ok(not pg.evaluate(ONE)['one'], '동작 줄이기를 다시 끄면 확대가 돌아옴')
    pg.evaluate("scrollTo(0, innerHeight*.8)"); pg.wait_for_timeout(300); pg.emulate_media(media='print')
    st = pg.evaluate("""()=>{const h=document.querySelector('.hero__h1').getBoundingClientRect(),w=document.querySelector('.works').getBoundingClientRect(),c=getComputedStyle(document.querySelector('.hero__h1'));
      return{shown:h.height>0&&+getComputedStyle(document.querySelector('.hero__copy')).opacity===1&&c.visibility==='visible',under:w.top>=h.bottom,ink:c.color}}""")
    ok(st['shown'] and st['under'] and st['ink'] in ('rgb(0, 0, 0)',), f"인쇄하면 첫 화면 글이 검은 글로 보이고 '만든 것'이 그 밑에 {st}")
    c.close()

    # ── 한국어 홈 「창 안으로」(2026-11-19, 틀 문서 My-site-private reports/lumenlab/2026-11-19-홈-디자인-틀.md) ──
    # 높이 310svh 칸 안에 100svh 고정 장면 하나: u = 그 칸을 몇 화면 내렸나. 0~1.15 거리 → 진열창 속, 1.3 에서 작업대(멈춤 자리 u 1.75), 그 아래 걸이판·문.
    # 작품 넷은 작업대 위에서 옆으로 넘김(11-24 사용자 「왼쪽오른쪽으로 스와이프하는걸로」): BENCH.go(k, 바로) / BENCH.set(두 작품 사이 실수)
    HX0 = 1.3; HB = 1.75
    HU = "(u)=>{const w=document.querySelector('.walk');scrollTo({top:w.offsetTop+u*document.getElementById('hero').clientHeight,behavior:'instant'})}"
    HK = "(k)=>window.BENCH.go(k,true)"
    HS = r"""()=>{const pin=document.getElementById('hero'),vh=pin.clientHeight,u=-document.querySelector('.walk').getBoundingClientRect().top/vh;
      const R=e=>{if(!e)return null;const b=e.getBoundingClientRect();return{l:b.left,t:b.top,r:b.right,b:b.bottom,w:b.width,h:b.height}};
      const op=e=>{let o=1,n=e;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}return o};
      const sc=e=>{const m=getComputedStyle(e).transform;return m==='none'?1:new DOMMatrix(m).a};
      const G=window.SCENE||{},cv=document.getElementById('scene');
      const chs=[...document.querySelectorAll('.ch')].map(c=>({on:c.classList.contains('on'),op:op(c.querySelector('.obj')),pop:op(c.querySelector('.plate')),
        plate:R(c.querySelector('.plate')),obj:R(c.querySelector('.obj .grp,.obj .cover')),hid:getComputedStyle(c).visibility==='hidden',
        btn:[...c.querySelectorAll('.plate a')].every(a=>{const b=a.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2,h=document.elementFromPoint(x,y);return !!h&&a.contains(h)})}));
      return{u,s:sc(cv),scene:op(cv),say:op(document.querySelector('.say')),room:+getComputedStyle(document.getElementById('room')).opacity,
        nav:document.getElementById('nav').classList.contains('solid'),chs,cur:[...document.querySelectorAll('.chaps button')].findIndex(b=>b.hasAttribute('aria-current')),
        chaps:R(document.querySelector('.chaps')),chapsOn:op(document.querySelector('.chaps')),win:G.win?{l:G.win.x,t:G.win.y,r:G.win.x+G.win.w,b:G.win.y+G.win.h}:null,top:G.top,
        h1:R(document.querySelector('.say h1')),sub:R(document.querySelector('.say p')),hint:R(document.getElementById('hint')),navb:R(document.getElementById('nav')).b,
        vid:(v=>v?{paused:v.paused,ready:v.readyState}:null)(document.querySelector('.ch video')),pop:sc(document.getElementById('pop')),popR:R(document.getElementById('pop')),
        chips:document.querySelectorAll('.o-set .chip.on').length,chipR:[...document.querySelectorAll('.o-set .chip')].map(R),tagR:[...document.querySelectorAll('.o-next .tag')].map(R),sp:!!window.__scenePaused,rp:!!window.__roomPaused,
        sw:document.documentElement.scrollWidth,iw:innerWidth,ih:innerHeight}}"""
    hit = lambda a, b, m=0: a and b and a['l'] < b['r'] - m and a['r'] > b['l'] + m and a['t'] < b['b'] - m and a['b'] > b['t'] + m
    inside = lambda a, iw, ih: a['l'] >= 0 and a['r'] <= iw + .5 and a['t'] >= 0 and a['b'] <= ih + .5
    # 여러 화면 크기: 첫 화면 글이 작업실 건물에 안 걸리고 진열창·안내 알약이 화면 안, 장마다 앞판 글이 화면 안에 다 보이고 작품·알약·튀어나온 패널·기록 조각과 안 겹치고, 단추가 눌림
    for w, h in ((320, 568), (360, 740), (375, 667), (390, 664), (390, 844), (430, 932), (768, 1024), (844, 390), (1024, 768), (1280, 800), (1366, 768), (1440, 900), (1920, 1080), (2560, 1080)):
        c = br.new_context(viewport={'width': w, 'height': h}, locale='ko-KR'); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + '/'); pg.wait_for_timeout(1200)
        s0 = pg.evaluate(HS); bad = []
        if s0['sub']['b'] > s0['top'] - 8: bad.append(f"첫 화면 글이 건물에 걸림({s0['sub']['b']:.0f} > {s0['top']})")
        if not inside(s0['win'], w, h): bad.append(f"진열창이 화면 밖 {s0['win']}")
        if not inside(s0['hint'], w, h) or hit(s0['hint'], s0['h1']) or hit(s0['hint'], s0['sub']): bad.append('안내 알약')
        if s0['h1']['l'] < 0 or s0['h1']['r'] > w: bad.append('한마디가 화면 밖')
        for k in range(4):
            pg.evaluate(HU, HB); pg.evaluate(HK, k); pg.wait_for_timeout(350 if k != 1 else 800); s = pg.evaluate(HS); ch = s['chs'][k]
            if not (ch['on'] and ch['op'] > .98 and ch['pop'] > .98 and s['cur'] == k): bad.append(f'장 {k} 안 켜짐')
            if not inside(ch['plate'], w, h): bad.append(f"장 {k} 앞판 글이 화면 밖 {ch['plate']}")
            if hit(ch['plate'], ch['obj'], 2): bad.append(f'장 {k} 앞판 글이 작품과 겹침')
            if hit(ch['plate'], s['chaps']) or hit(ch['obj'], s['chaps'], 2): bad.append(f'장 {k} 알약 줄과 겹침')
            if ch['obj']['t'] < s['navb'] or not inside(ch['obj'], w, h): bad.append(f"장 {k} 작품이 화면·막대 밖 {ch['obj']}")
            if k == 1 and (hit(s['popR'], ch['plate']) or not inside(s['popR'], w, h) or s['popR']['t'] < s['chaps']['b'] - 1): bad.append('Owlight 패널 자리')
            if k == 2 and any(hit(r, ch['plate']) or not inside(r, w, h) for r in s['chipR']): bad.append('기록 조각 자리')
            if k == 3 and any(not inside(r, w, h) for r in s['tagR']): bad.append(f"천 꼬리표가 화면 밖 {[round(r['l']) for r in s['tagR']]}")
            if not ch['btn']: bad.append(f'장 {k} 단추가 가려져 안 눌림')
            if s['sw'] > w: bad.append(f"가로 넘침 {s['sw']}")
        ok(not bad and not errs, f"/ {w}x{h} 홈 자리: {bad or '첫 화면·장 넷 모두 제자리'} {errs[:1]}")
        c.close()
    # 내리는 만큼: 거리가 진열창 쪽으로 커지고 한마디가 빠지고, 창 안(작업실)이 나타나고, 장마다 그 장만 켜지고 알약 표시, 영상은 첫 장에서만 돌고
    # Owlight 패널은 다 커지고 기록 조각 셋이 다 뜸, 캔버스는 보이는 쪽만 그림. 맨 위로 올리면 처음 그대로
    for w, h in ((390, 844), (390, 664), (1440, 900)):
        c = br.new_context(viewport={'width': w, 'height': h}, locale='ko-KR'); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + '/'); pg.wait_for_timeout(1500)
        a = pg.evaluate(HS); pg.evaluate(HU, .6); pg.wait_for_timeout(300); b = pg.evaluate(HS); pg.evaluate(HU, 1.2); pg.wait_for_timeout(300); d = pg.evaluate(HS)
        st = []
        for k in range(4):
            pg.evaluate(HU, HB); pg.evaluate(HK, k); pg.wait_for_timeout(900); st.append(pg.evaluate(HS))
        pg.evaluate(HU, 0); pg.wait_for_timeout(400); z = pg.evaluate(HS)
        one = all(sum(1 for ch in s['chs'] if ch['on']) == 1 and all(ch['hid'] for j, ch in enumerate(s['chs']) if j != k) for k, s in enumerate(st))
        good = (a['s'] == 1 and a['say'] == 1 and a['room'] == 0 and not a['nav'] and a['cur'] == -1 and a['chapsOn'] == 0 and a['rp'] and not a['sp']
                and b['s'] > 1.1 and b['say'] < .05 and b['scene'] == 1 and d['room'] == 1 and d['scene'] == 0 and d['sp'] and d['nav']
                and one and not st[0]['vid']['paused'] and st[1]['vid']['paused'] and abs(st[1]['pop'] - 1) < .01 and st[2]['chips'] == 3 and not st[2]['rp']
                and z['s'] == 1 and z['say'] == 1 and z['cur'] == -1 and not errs)
        ok(good, f"/ {w}x{h} 내리는 만큼: 배율 {a['s']}→{b['s']:.2f}, 한마디 {b['say']:.2f}, 창 안 {d['room']}, 장마다 하나만 켜짐 {one}, 영상 첫 장 {'돎' if not st[0]['vid']['paused'] else '멈춤'}·다음 장 {'멈춤' if st[1]['vid']['paused'] else '돎'}, 패널 {st[1]['pop']:.2f}, 기록 조각 {st[2]['chips']}, 맨 위로 배율 {z['s']}·한마디 {z['say']} {errs[:1]}")
        # 장이 바뀌는 길목(옆으로 두 작품 사이): 두 장의 글이 같이 보이지 않고(진하게 보이는 앞판 글은 늘 하나 이하), 흐린 쪽 단추는 눌리지 않음(11-19 제3자 재평가: 300px 동안 겹쳐 보이는 단추와 눌리는 단추가 달랐음)
        XO = r"""()=>{const op=e=>{let o=1,n=e;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}return o};
          const ps=[...document.querySelectorAll('.ch .plate')].map(p=>({o:op(p),links:[...p.querySelectorAll('a')]}));let wrong=0;
          for(const p of ps)if(p.o<.5)for(const a of p.links){const b=a.getBoundingClientRect();if(!b.width)continue;const h=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);if(h&&a.contains(h))wrong++}
          return{shown:ps.filter(p=>p.o>.15).length,wrong}}"""
        xo = []
        pg.evaluate(HU, HB); pg.wait_for_timeout(200)
        for k in range(1, 4):
            for i in range(19):
                x = k - 1 + .05 + i * .05; pg.evaluate("x=>window.BENCH.set(x)", x); pg.wait_for_timeout(40); r = pg.evaluate(XO)
                if r['shown'] > 1 or r['wrong']: xo.append((round(x, 2), r))
        ok(not xo, f"/ {w}x{h} 장이 바뀌는 길목: 두 장 글이 같이 보이거나 흐린 단추가 눌리는 곳 {xo[:3] or '없음'}")
        # 장 알약을 누르면 그 장으로 부드럽게, 위 막대 '만든 것 보기'는 첫 장으로
        pg.evaluate(HU, 1.5); pg.wait_for_timeout(300); pg.click('.chaps button[data-go="2"]'); pg.wait_for_timeout(1600); p2 = pg.evaluate(HS)
        pg.evaluate(HU, 0); pg.wait_for_timeout(300); pg.click('.nav .go'); pg.wait_for_timeout(2400); p0 = pg.evaluate(HS)
        ok(p2['cur'] == 2 and p2['chs'][2]['on'] and p0['cur'] == 0 and p0['chs'][0]['on'], f"/ {w}x{h} 장 알약 '세트노트' → 장 {p2['cur']}, 위 막대 '만든 것 보기' → 장 {p0['cur']}")
        c.close()
    # 손가락 한 번 = 한 자리(디자인-방법 249, 사용자 11-20 「모바일에서 보면 화면이 수루룩 넘어가서 각각의 앱들이 인식이 잘 안 됨」):
    # 폰에서 첫 화면에서 손가락 한 번이면 정해진 빠르기로 가서(0.7초엔 아직 가는 중) 작업대 u 1.75에 서고, 또 한 번이면 걸이판 맨 위, 위로 한 번이면 작업대.
    # 빨리 세 번 밀어도 멈춤 자리에만 섬. 끝나면 overflow 원래대로
    # 작업대에서 옆으로 밀면(11-24 사용자 「왼쪽오른쪽으로 스와이프하는걸로」) 작품 하나씩, 세로 자리는 그대로: 빨리 길게 밀어도 하나, 살짝 천천히 밀면 그대로, 마지막에서 더 밀면 그대로
    HG = "()=>{const p=document.getElementById('hero');return{u:-document.querySelector('.walk').getBoundingClientRect().top/p.clientHeight,ov:document.documentElement.style.overflow,tools:document.getElementById('tools').getBoundingClientRect().top,h:window.BENCH.at()}}"
    HSTOP = [0, HB]
    at = lambda s: next((i for i, v in enumerate(HSTOP) if abs(s['u'] - v) < .01), None)
    for w, h, how in ((390, 664, 'touch'), (390, 844, 'touch')):
        c = br.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, locale='ko-KR'); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + '/'); pg.wait_for_timeout(1500); cdp = c.new_cdp_session(pg)
        def push(d): swipe(cdp, h * .75, h * .3) if d > 0 else swipe(cdp, h * .3, h * .75)
        def hsw(x0, x1, n=10, gap=16):
            y = h * .45; cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y}]})
            for i in range(1, n + 1): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * i / n, 'y': y + i * .3}]}); pg.wait_for_timeout(gap)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(1300); return pg.evaluate(HG)
        push(1); pg.wait_for_timeout(700); m = pg.evaluate(HG); pg.wait_for_timeout(1700); a = pg.evaluate(HG)
        h1 = hsw(w * .8, w * .3); h2 = hsw(w * .92, w * .04, 5, 12); h3 = hsw(w * .4, w * .48, 20, 40); pg.evaluate(HK, 3); pg.wait_for_timeout(300); h4 = hsw(w * .8, w * .2); h5 = hsw(w * .2, w * .8)
        push(1); pg.wait_for_timeout(1700); b = pg.evaluate(HG); push(-1); pg.wait_for_timeout(1700); y = pg.evaluate(HG)
        pg.goto(BASE + '/'); pg.wait_for_timeout(1500)
        for i in range(3): push(1); pg.wait_for_timeout(110)
        pg.wait_for_timeout(2600); f = pg.evaluate(HG)
        hs = [round(x['h'], 2) for x in (h1, h2, h3, h4, h5)]
        good = (.2 < m['u'] < 1.6 and at(a) == 1 and hs == [1, 2, 2, 3, 2] and all(at(x) == 1 for x in (h1, h2, h3, h4, h5))
                and abs(b['tools']) < 2 and at(y) == 1 and (at(f) == 1 or abs(f['tools']) < 2) and all(s['ov'] == '' for s in (a, b, f, y)) and not errs)
        ok(good, f"/ {w}x{h} {how} 손짓 한 번에 한 자리: 0.7초 u {m['u']:.2f}(가는 중) → 작업대 {a['u']:.2f}, 옆으로 밀면 작품 {hs}(밀기·빨리 길게·살짝·마지막에서 더·되돌림) 세로 그대로, 한 번 더 → 걸이판 {b['tools']:.0f}px, 위로 → u {y['u']:.2f}, 빨리 세 번 → u {f['u']:.2f} {errs[:1]}")
        c.close()
    # PC 휠·트랙패드 = 작품 앞 턱(사용자 11-20 「pc에서 스크롤 스무스하게 안됨」 → 11-21 「너무 저항감이 없거든... 조금만 더 저항감이 있긴해야함」, 「처음 내릴 때는 저항감이 거의 없거든」):
    # 멈춤 자리 가까이선 휠 한 칸이 20~60px만(턱), 그 자리에서 조금 내려도 되돌려 끌지 않음(갇힘 없음). 여러 칸·트랙패드로 다가가면 그 작품 자리에 딱 섬,
    # 위로도 같음. 칸 끝을 지나 걸이판 밑은 브라우저 그대로, PageDown도 브라우저 그대로. 알약으로 가는 중에 휠을 쓰면 바로 멈추고 사람한테 넘김
    c = br.new_context(viewport={'width': 1440, 'height': 900}, locale='ko-KR'); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + '/'); pg.wait_for_timeout(1500); pg.mouse.move(720, 450)
    HUu = "()=>-document.querySelector('.walk').getBoundingClientRect().top/document.getElementById('hero').clientHeight"
    def notch(n, d=100, gap=80):
        for i in range(n): pg.mouse.wheel(0, d); pg.wait_for_timeout(gap)
    def flick(sg=1):
        for i in range(60): pg.mouse.wheel(0, sg * max(1, 40 - i * .6)); pg.wait_for_timeout(16)
    notch(1); pg.wait_for_timeout(500); n1 = pg.evaluate('scrollY'); pg.wait_for_timeout(900); n1b = pg.evaluate('scrollY')
    notch(20); pg.wait_for_timeout(1800); h1 = pg.evaluate(HUu)
    y5 = pg.evaluate('scrollY'); notch(1); pg.wait_for_timeout(1300); y6 = pg.evaluate('scrollY')
    flick(); pg.wait_for_timeout(1500); fu = pg.evaluate(HUu); flick(-1); pg.wait_for_timeout(1500); fd = pg.evaluate(HUu)
    notch(70, gap=60); pg.wait_for_timeout(1500); out = pg.evaluate(HUu)
    pg.evaluate(HU, 2.0); pg.wait_for_timeout(300); y3 = pg.evaluate('scrollY'); pg.keyboard.press('PageDown'); pg.wait_for_timeout(1200); y4 = pg.evaluate('scrollY')
    pg.evaluate(HU, 1.5); pg.wait_for_timeout(300); pg.click('.chaps button[data-go="3"]'); pg.wait_for_timeout(250); pg.mouse.wheel(0, -100); pg.wait_for_timeout(1300); ya = pg.evaluate('scrollY'); pg.wait_for_timeout(1200); yb = pg.evaluate('scrollY')
    on = lambda u: any(abs(u - v) < .003 for v in HSTOP + [3.1])   # 3.1 = 칸 끝(걸이판 맨 위)
    good = (20 <= n1 <= 60 and abs(n1b - n1) < 1 and abs(h1 - HSTOP[1]) < .003 and 20 <= y6 - y5 <= 60 and on(fu) and fu > h1 + .5 and on(fd) and fd < fu
            and out > 3.15 and 500 < y4 - y3 < 900 and abs(yb - ya) < 2 and pg.evaluate("document.documentElement.style.overflow") == '' and not errs)
    ok(good, f"/ PC 휠 턱: 첫 칸 {n1:.0f}px(1.4초 뒤 {n1b:.0f}), 스무 칸 → u {h1:.3f}, 멈춤 자리에서 한 칸 {y6 - y5:.0f}px 그대로, 트랙패드 → {fu:.3f} · 위로 → {fd:.3f}, 일흔 칸 → 걸이판 밑 u {out:.2f}, PageDown {y4 - y3:.0f}px, 알약 가는 중 휠이면 멈춤 {ya:.0f}→{yb:.0f} {errs[:1]}")
    # 창 안으로 들어가는 구간(u .4~1.1)은 휠 한 칸이 절반만(11-21 「처음 내릴 때는 저항감이 거의 없거든... 슈루룩 넘겨져서」),
    # 거리와 방이 겹쳐 흐린 구간(u .86~1.1)엔 서지 않음: 내려가다 서면 첫 작품 자리까지 정해진 빠르기로, 올라가다 서면 겹치기 전(.86)으로
    pg.evaluate(HU, .7); pg.wait_for_timeout(400); z0 = pg.evaluate('scrollY'); notch(1); pg.wait_for_timeout(900); z1 = pg.evaluate('scrollY')
    pg.evaluate(HU, .84); pg.wait_for_timeout(400); notch(1); pg.wait_for_timeout(1900); bd = pg.evaluate(HUu)
    pg.evaluate(HU, 1.12); pg.wait_for_timeout(400); notch(1, d=-100); pg.wait_for_timeout(1300); bu = pg.evaluate(HUu)
    good = 40 <= z1 - z0 <= 60 and abs(bd - HSTOP[1]) < .003 and abs(bu - .86) < .005 and not errs
    ok(good, f"/ PC 창 안으로 구간: 휠 한 칸 {z1 - z0:.0f}px(다른 데 100), 흐린 구간에서 내려가다 서면 → u {bd:.3f} · 올라가다 서면 → u {bu:.3f} {errs[:1]}")
    c.close()
    # PC 작업대 옆 넘기기(11-24): 마우스로 옆으로 끌면 하나(놓을 때 밑의 단추가 안 눌림), 트랙패드 옆 밀기 한 손짓(관성 포함 50번)에 하나, ← → 키, 양옆 화살표(끝에선 꺼짐),
    # 세로 자리는 그대로. 처음 작업대에 서면 다음 작품이 한 번 살짝 비쳤다 돌아감. Owlight 모니터 돋보기는 뺌(11-24 「없어도 될듯」)
    c = br.new_context(viewport={'width': 1440, 'height': 900}, locale='ko-KR'); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + '/'); pg.wait_for_timeout(1500)
    pg.click('.nav .go'); pg.wait_for_timeout(2300); pk = []
    for i in range(14): pk.append(pg.evaluate('window.BENCH.at()')); pg.wait_for_timeout(100)
    pg.wait_for_timeout(600)
    def mdrag(x0, x1):
        pg.mouse.move(x0, 450); pg.mouse.down()
        for i in range(1, 13): pg.mouse.move(x0 + (x1 - x0) * i / 12, 450); pg.wait_for_timeout(16)
        pg.mouse.up(); pg.wait_for_timeout(1300); return round(pg.evaluate('window.BENCH.at()'), 2)
    TP = """sg=>new Promise(r=>{const pin=document.getElementById('hero');let i=0;const t=setInterval(()=>{pin.dispatchEvent(new WheelEvent('wheel',{deltaX:sg*Math.max(1,42-i*.8),bubbles:true,cancelable:true}));if(++i>=50){clearInterval(t);r()}},16)})"""
    d1 = mdrag(1200, 800); u1 = pg.evaluate(HUu); clicked = pg.evaluate("location.href")
    pg.evaluate(TP, 1); pg.wait_for_timeout(1300); t1 = round(pg.evaluate('window.BENCH.at()'), 2)
    pg.evaluate(TP, -1); pg.wait_for_timeout(1300); t2 = round(pg.evaluate('window.BENCH.at()'), 2)
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(1100); k1 = round(pg.evaluate('window.BENCH.at()'), 2)
    pg.click('.nv.next'); pg.wait_for_timeout(1100); a1 = round(pg.evaluate('window.BENCH.at()'), 2)
    nx = pg.evaluate("[document.querySelector('.nv.next').disabled,document.querySelector('.nv.prev').disabled,document.querySelectorAll('.lens').length]")
    good = (max(pk) > .08 and abs(pk[-1]) < .01 and d1 == 1 and abs(u1 - HB) < .003 and clicked == BASE + '/' and t1 == 2 and t2 == 1 and k1 == 2 and a1 == 3
            and nx == [True, False, 0] and not errs)
    ok(good, f"/ PC 작업대 옆 넘기기: 처음 살짝 비침 {max(pk):.2f}, 끌기 → {d1}(u {u1:.3f}), 트랙패드 → {t1}·되돌림 {t2}, → 키 {k1}, 화살표 → {a1}(끝에서 꺼짐 {nx[0]}), 돋보기 {nx[2]} {errs[:1]}")
    c.close()
    # 폰 단추(11-24 「모바일에서는 아예 안됨」): 마우스가 없으니 누르는 동안 손가락 쪽으로 끌려가며 눌리고(.94), 떼면 제자리
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, locale='ko-KR'); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + '/'); pg.wait_for_timeout(1200); pg.evaluate(HU, HB); pg.evaluate(HK, 1); pg.wait_for_timeout(900)
    cdp = c.new_cdp_session(pg); bx = pg.evaluate("(()=>{const r=document.querySelector('#c1 .btn.solid').getBoundingClientRect();return[r.left,r.top,r.width,r.height]})()")
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': bx[0] + bx[2] - 26, 'y': bx[1] + bx[3] * .5 + 9}]}); pg.wait_for_timeout(450)
    pr = pg.evaluate("(()=>{const m=new DOMMatrix(getComputedStyle(document.querySelector('#c1 .btn.solid')).transform);return[m.e,m.f,m.a]})()")
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []}); pg.wait_for_timeout(1200)
    rl = pg.evaluate("getComputedStyle(document.querySelector('#c1 .btn.solid')).transform")
    ok(pr[0] > 3 and pr[1] > 1 and pr[2] < .97 and rl == 'none' and not errs, f"/ 폰 단추 누르기: 손가락 쪽으로 {pr[0]:.1f}·{pr[1]:.1f}px, 크기 {pr[2]:.3f}, 떼면 {rl} {errs[:1]}")
    c.close()
    # 문 밖 가게 앞(11-20 사용자 「OPEN이라고 있는데 눌러도 안 눌림, 뭘 뜻하는지 모르겠음」): 진열창 둘에 작품 넷 중 셋이 이름표와 함께 화면 안에 보이고,
    # 가운데 문은 메일 링크라 누르면 문이 열리고 말풍선이 뜸. 진열창 '세트노트'를 누르면 그 장으로
    for w, h in ((390, 844), (1440, 900), (320, 640)):
        c = br.new_context(viewport={'width': w, 'height': h}, locale='ko-KR'); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + '/#contact'); pg.wait_for_timeout(900)
        pg.evaluate("document.getElementById('contact').scrollIntoView({block:'end',behavior:'instant'})"); pg.wait_for_timeout(500)
        f = pg.evaluate("""(()=>{const R=e=>e.getBoundingClientRect(),its=[...document.querySelectorAll('.sf-it')].map(a=>{const r=R(a.querySelector('.sf-fig'));return{l:r.left,r:r.right,w:r.width,go:a.dataset.go}}),
          d=document.getElementById('door'),dr=R(d),hit=document.elementFromPoint(dr.left+dr.width/2,dr.top+dr.height*.4);
          return{its,door:d.tagName==='A'&&d.href.startsWith('mailto:')&&d.contains(hit),sw:document.documentElement.scrollWidth}})()""")
        pg.click('#door'); pg.wait_for_timeout(450)
        o = pg.evaluate("[document.getElementById('door').classList.contains('open'),+getComputedStyle(document.getElementById('doorSay')).opacity,document.getElementById('doorSay').textContent]")
        pg.goto(BASE + '/#contact'); pg.wait_for_timeout(900); pg.evaluate("document.getElementById('contact').scrollIntoView({block:'end',behavior:'instant'})"); pg.wait_for_timeout(400)
        pg.click('.sf-set'); pg.wait_for_timeout(1800); cur = pg.evaluate(HS)['cur']
        good = (len(f['its']) == 3 and all(i['l'] >= 0 and i['r'] <= w and i['w'] > 12 for i in f['its']) and f['door'] and f['sw'] <= w
                and o[0] and o[1] > .9 and '메일' in o[2] and cur == 2 and not errs)
        ok(good, f"/ {w}x{h} 가게 앞: 진열창 작품 {[round(i['w']) for i in f['its']]}px 화면 안, 문 = 메일 링크 {f['door']}, 누르면 열림 {o[0]}·말풍선 {o[1]:.2f} '{o[2]}', 진열창 세트노트 → 장 {cur} {errs[:1]}")
        c.close()
    # 옛 주소 조각: #works·#games·#apps·#setnote 는 그 장, #tools·#g-play·#contact 는 그 칸
    for frag, k in (('#works', 0), ('#games', 0), ('#apps', 1), ('#owlight', 1), ('#setnote', 2), ('#next', 3)):
        c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page(); pg.goto(BASE + '/' + frag); pg.wait_for_timeout(900); s = pg.evaluate(HS)
        ok(s['cur'] == k and s['chs'][k]['on'] and s['chs'][k]['op'] > .98, f'/{frag} 로 오면 장 {k} ({s["cur"]})'); c.close()
    for frag in ('#tools', '#g-play', '#contact'):
        c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page(); pg.goto(BASE + '/' + frag); pg.wait_for_timeout(900)
        t = pg.evaluate(f"(()=>{{const e=document.getElementById('{frag[1:]}'),s=e.closest('section');return [Math.round(e.getBoundingClientRect().top),Math.round(s.getBoundingClientRect().top),Math.round(s.getBoundingClientRect().bottom),innerHeight+scrollY>=document.documentElement.scrollHeight-2]}})()")
        ok((t[1] <= 1 or (t[3] and t[1] < 844)) and t[2] > 300, f'/{frag} 로 오면 그 칸(맨 끝 칸은 페이지 끝까지 내려가 보임) {t}'); c.close()
    # 걸이판: 화면에 들어오면 꼬리표가 다 흔들리며 걸리고(.sw), 누르면 소개 창은 위 '소개 창' 시험이 봄
    c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page(); pg.goto(BASE + '/'); pg.wait_for_timeout(600)
    pg.evaluate("async()=>{const t=document.getElementById('tools');for(let y=t.offsetTop-800;y<t.offsetTop+t.offsetHeight;y+=200){scrollTo(0,y);await new Promise(r=>setTimeout(r,120))}}"); pg.wait_for_timeout(2400)
    n = pg.evaluate("[document.querySelectorAll('.board .tg').length,document.querySelectorAll('.board .tg.sw').length,document.querySelectorAll('.board .gid').length]")
    ok(n[0] == len([1 for k, _ in ITEMS if k == 'tools']) and n[1] == n[0] and n[2] == len(cat['groups']), f'걸이판: 꼬리표 {n[0]}개, 흔들려 걸린 것 {n[1]}, 묶음 표시 {n[2]}')
    c.close()
    # 동작 줄이기: 확대·빛 없이 장끼리 투명만, 그래도 장 넷이 다 보임 / JS 꺼짐: 장 넷이 차례로 쌓여 다 보임
    c = br.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce'); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + '/'); pg.wait_for_timeout(800)
    pg.evaluate(HU, .6); pg.wait_for_timeout(300); r6 = pg.evaluate("[getComputedStyle(document.getElementById('scene')).transform,+getComputedStyle(document.querySelector('.flash')).opacity]")
    seen = []
    for k in range(4): pg.evaluate(HU, HB); pg.evaluate(HK, k); pg.wait_for_timeout(300); s = pg.evaluate(HS); seen.append(s['chs'][k]['on'] and s['chs'][k]['op'] > .98)
    ok(r6[0] == 'none' and r6[1] == 0 and all(seen) and not errs, f'/ 동작 줄이기: 확대 {r6[0]}·빛 {r6[1]}, 장 넷 보임 {seen} {errs[:1]}')
    c.close()
    c = br.new_context(viewport={'width': 390, 'height': 844}, java_script_enabled=False); pg = c.new_page(); pg.goto(BASE + '/'); pg.wait_for_timeout(500)
    nj = pg.evaluate("""[...document.querySelectorAll('.ch')].map(c=>{let o=1,n=c.querySelector('.plate');while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}return o===1&&c.getBoundingClientRect().height>200})""")
    ok(all(nj) and len(nj) == 4 and pg.evaluate('document.documentElement.scrollWidth') <= 390, f'/ JS 꺼짐: 장 넷이 쌓여 다 보임 {nj}')
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
    pg.click('a.lang'); pg.wait_for_timeout(400)
    ok(pg.url == BASE + '/' and pg.evaluate('document.documentElement.lang') == 'ko' and '공들여 만들어요' in pg.inner_text('h1'), '한국어 단추로 / 로')
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
            pg.goto(BASE + pre + '/'); pg.wait_for_timeout(300); home_title = pg.title()
            for i, (kind, tid) in enumerate(ITEMS if pre else [x for x in ITEMS if x[0] == 'tools']):   # 한국어 홈은 작품 넷이 작업대 위 장이라 소개 창은 걸이판 도구만
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
                three = (st['steps'], st['rows'], st['days']) == want3(tid)
                good = st['open'] and st['path'] == f'{pre}/works/{tid}/' and titled and body_ok and st['facts'] == 3 and st['cards'] >= 2 and st['others'] == len(ITEMS) - 1 and st['h1'] == 0 and not st['over'] and three and shut and not errs
                what = ('바로 써 보기 ' + ('실패' if st['fail'] else '뜸') + ', 시연 ' + ('움직임' if st['text'] != before else '멈춤')) if kind == 'tools' else f"미리 보기 {st['shots']}장"
                ok(good, f"{pre}/ {w}px {tid} 소개 창: 주소 {st['path']}, 제목 {'맞음' if titled else st['title']}, {what}, 숫자 {st['facts']}·카드 {st['cards']}·다른 것 {st['others']}·쓰는 법 {st['steps']}·기준 {st['rows']}·기록 {st['days']}, {'뒤로 가기' if i % 2 else 'Esc'}로 {'닫힘' if shut else '안 닫힘'} {errs[:2]}")
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

    # 첫 화면 들어올 때 카메라는 움직이지 않음(처음부터 배율 1, 사용자가 '과하다'고 뺌). 제목 낱말 셋이 있고 위층 이웃 창에 불이 켜지면 그 낱말도 켜짐
    NEAR = "(()=>{const m=getComputedStyle(document.querySelector('.night__near')).transform;return m==='none'?1:new DOMMatrix(m).a})()"
    for pre, w, h in (('/en', 390, 844), ('/en', 1366, 860)):
        c = br.new_context(viewport={'width': w, 'height': h}); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + pre + '/'); pg.wait_for_timeout(250)
        s0 = pg.evaluate(NEAR); pg.wait_for_timeout(900); s1 = pg.evaluate(NEAR)
        ok(abs(s0 - 1) < .001 and abs(s1 - 1) < .001 and not errs, f'{pre}/ {w}px 들어올 때 카메라 그대로: 배율 {s0:.2f} → {s1:.2f} {errs[:2]}')
        n = pg.evaluate("document.querySelectorAll('.hero__h1 .hw[data-k]').length")
        pg.wait_for_function("document.querySelector('.hero__h1 .hw.lit')", timeout=9000)
        lit = pg.evaluate("[...document.querySelectorAll('.hero__h1 .hw.lit')].map(e=>e.dataset.k)")
        col = pg.evaluate("getComputedStyle(document.querySelector('.hero__h1 .hw.lit')).color!==getComputedStyle(document.querySelector('.hero__h1')).color")
        ok(n == 3 and lit and col, f'{pre}/ {w}px 제목 낱말 {n}개, 이웃 창 불과 같이 켜진 낱말 {lit}')
        c.close()
    # 동작 줄이기: 그림 그대로
    c = br.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce'); pg = c.new_page(); pg.goto(BASE + '/en/'); pg.wait_for_timeout(400)
    ok(pg.evaluate(NEAR) == 1, '/en/ 동작 줄이기: 첫 화면 그림 그대로')
    c.close()

    # 거리를 지나는 사람들: 넷(아이·개 산책·휴대폰·자전거)과 개, 그림자·테두리. 첫 사람(풍선 든 아이)이 창 앞에서 불빛을 받으면 풍선이 등불(.on)
    for w, h in ((390, 844), (1366, 768)):
        c = br.new_context(viewport={'width': w, 'height': h}); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + '/en/')
        pg.wait_for_function("[...document.querySelectorAll('.night__bld')].some(s=>s.getBoundingClientRect().width>0&&s.querySelector('.n-bln.on'))", timeout=20000)
        st = pg.evaluate("""()=>{const s=[...document.querySelectorAll('.night__bld')].find(s=>s.getBoundingClientRect().width>0),c=s.querySelector('.n-cast');
          return{figs:c.querySelectorAll('.n-fig').length,shd:c.querySelectorAll('.n-shd').length,rim:c.querySelectorAll('.n-rimu').length,op:+c.getAttribute('opacity')}}""")
        ok(st['figs'] == 5 and st['shd'] == 5 and st['rim'] == 5 and st['op'] > .9 and not errs, f"{w}px 거리: 그림 {st['figs']}(넷+개)·그림자 {st['shd']}·테두리 {st['rim']}, 아이 풍선이 불빛을 받아 켜짐 {errs[:2]}")
        c.close()

    # 끝 칸: 명함 종이가 칠해져 글씨가 보이고(배경 ≠ 투명, 글자 대비 4.5 이상), 창이 보이면 날이 밝아 건너편 창 불이 다 꺼지고 아이가 던진 종이비행기가
    # 명함에 내려앉아 ✓ 도장(.got). 다 가렸다 다시 보이면 밤부터 또
    LUM = "(c)=>{const v=c.match(/[\\d.]+/g).map(Number).slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]}"
    for scheme in ('light', 'dark'):
        c = br.new_context(viewport={'width': 390, 'height': 844}, color_scheme=scheme); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + '/en/'); pg.wait_for_timeout(600)
        st = pg.evaluate("(()=>{const L=" + LUM + ",cd=document.querySelector('.bcard'),bg=getComputedStyle(cd).backgroundColor,a=getComputedStyle(cd.querySelector('.bcard__rows a')).color,l1=L(bg),l2=L(a);return{bg,ratio:(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)}})()")
        ok(st['bg'] not in ('rgba(0, 0, 0, 0)', 'transparent') and st['ratio'] >= 4.5, f"{scheme} 끝 칸 명함: 종이 {st['bg']}, 메일 글자 대비 {st['ratio']:.1f}")
        pg.evaluate("document.querySelector('.end__scene').scrollIntoView({block:'center',behavior:'instant'})")
        pg.wait_for_function("document.querySelector('.bcard.got')", timeout=9000)
        lit = pg.evaluate("document.querySelectorAll('.end__scene .es-w.on').length")
        pl = pg.evaluate("(()=>{const p=document.querySelector('.end__fx .ef-plane'),c=document.querySelector('.bcard');if(!p)return 9e9;const a=p.getBoundingClientRect(),b=c.getBoundingClientRect();return Math.hypot(a.left+a.width/2-(b.right-22),a.top+a.height/2-b.top)})()")
        pg.evaluate("scrollTo({top:0,behavior:'instant'})"); pg.wait_for_timeout(400)
        off = pg.evaluate("!document.querySelector('.bcard.got') && !document.querySelector('.end.dawn') && !document.querySelector('.end__fx .ef-plane') && document.querySelectorAll('.end__scene .es-w.on').length > 10")
        pg.evaluate("document.querySelector('.end__scene').scrollIntoView({block:'center',behavior:'instant'})")
        pg.wait_for_function("document.querySelector('.bcard.got')", timeout=9000)
        ok(lit == 0 and pl < 24 and off and not errs, f"{scheme} 끝 칸: 날이 밝아 건너편 창 불이 다 꺼지고({lit}) 종이비행기가 명함 귀퉁이에(떨어진 거리 {pl:.0f}px) 내려앉아 도장, 올라갔다 다시 오면 밤부터 다시 {errs[:2]}")
        c.close()
    c = br.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce'); pg = c.new_page(); pg.goto(BASE + '/en/'); pg.wait_for_timeout(400)
    ok(pg.evaluate("!document.querySelector('.end-anim') && getComputedStyle(document.querySelector('.bcard__stamp')).opacity > .5 && !document.querySelector('.end__scene .es-w.on') && +getComputedStyle(document.querySelector('.es-dawn')).opacity === 1 && +getComputedStyle(document.querySelector('.es-lampg')).opacity === 0"), '동작 줄이기: 끝 칸은 해 뜬 아침(건너편 불·스탠드 꺼짐)과 도장 찍힌 명함 그대로')
    c.close()

    # '만든 것' 줄마다 매단 등: 줄이 켜지면 벽에 등불(::before 보임), 등 줄(::after)이 위 선까지
    c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page(); pg.goto(BASE + '/en/'); pg.wait_for_timeout(600)
    pg.click('.hero__more'); pg.wait_for_timeout(5200)
    st = pg.evaluate("""()=>{const sh=document.querySelector('.shelf.in'),h=sh&&sh.querySelector('.shelf__h'),a=h&&getComputedStyle(h,'::after'),b=sh&&getComputedStyle(sh,'::before');
      return{in:!!sh,wash:b?+b.opacity:0,cord:a?a.content!=='none'&&Math.abs(h.getBoundingClientRect().top+parseFloat(a.top)-sh.getBoundingClientRect().top)<2:false}}""")
    ok(st['in'] and st['wash'] > .9 and st['cord'], f"'만든 것' 줄 등: 켜짐 {st['in']}, 벽 등불 {st['wash']}, 등 줄이 위 선까지 {st['cord']}")
    c.close()

    # 소개 창 = 작업대: 열면 스탠드가 꺼진 채였다가 켜지고(.off 빠짐), 스탠드를 누르면 꺼지고 또 누르면 켜짐, 사실 숫자는 끝에 원래 글 그대로,
    # 도구는 모니터 안 무대, 닫을 때 스탠드가 꺼짐. 소개 페이지는 처음부터 켜진 채(CSS 첫 켜짐)
    for w in (390, 1366):
        c = br.new_context(viewport={'width': w, 'height': 844}, has_touch=w < 500); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.route(SUB, sub_file)
        pg.goto(BASE + '/en/'); pg.wait_for_timeout(300)
        a = pg.locator('.works a[data-show="chickrescue"]'); a.scroll_into_view_if_needed(); a.click(); pg.wait_for_timeout(120)
        off0 = pg.evaluate("!!document.querySelector('dialog.sheet .sh__spot.off')"); pg.wait_for_timeout(1500)
        on1 = pg.evaluate("!document.querySelector('dialog.sheet .sh__spot.off') && !!document.querySelector('dialog.sheet .sh__spot .sh__lamp') && !!document.querySelector('dialog.sheet .sh__spot .sh__status, dialog.sheet .sh__status')")
        facts = pg.evaluate("[...document.querySelectorAll('dialog.sheet .sh__facts b')].map(b=>b.textContent)")
        want = open(os.path.join(site, 'en', 'works', 'chickrescue', 'index.html')).read().split('<ul class="sh__facts">')[1].split('</ul>')[0]
        same = all(f'<b>{f}</b>' in want for f in facts)
        pg.locator('dialog.sheet .sh__lamp').click(force=True); pg.wait_for_timeout(250); tog1 = pg.evaluate("!!document.querySelector('dialog.sheet .sh__spot.off')")
        pg.locator('dialog.sheet .sh__lamp').click(force=True); pg.wait_for_timeout(250); tog2 = pg.evaluate("!document.querySelector('dialog.sheet .sh__spot.off')")
        pg.keyboard.press('Escape'); pg.wait_for_timeout(60); dark = pg.evaluate("!!document.querySelector('dialog.sheet .sh__spot.off')"); pg.wait_for_timeout(600)
        a = pg.locator('.works a[data-show="daycount"]'); a.scroll_into_view_if_needed(); a.click(); pg.wait_for_timeout(900)
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
