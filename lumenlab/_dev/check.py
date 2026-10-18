# 루멘랩 배포 전 확인: 사이트 폴더에서 python3 -m http.server 8765 를 띄운 뒤 python3 _dev/check.py
# 페이지마다 320·390·1366 가로 넘침, 콘솔 오류, 깨진 사진, 사이트 안 링크, 동작 줄이기, 움직임 뒤 숨은 요소, 첫 화면 다시 흐려짐,
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
    pg.add_init_script('''window.__op=[];(function f(t){const e=document.querySelector('.now__h1');if(e){let o=1,n=e;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}__op.push(o)}if(performance.now()<2500)requestAnimationFrame(f)})()''')
    pg.goto(BASE + '/'); pg.wait_for_timeout(2800)
    ops = pg.evaluate('__op'); peak = False; dip = False
    for o in ops:
        if o >= .95: peak = True
        elif peak and o < .85: dip = True
    ok(peak and not dip, '첫 화면 제목이 한 번 보인 뒤 다시 흐려지지 않음')
    # 제목(루멘랩이 무엇을 만드는지) 두 줄
    lines = pg.evaluate("(()=>{const h=document.querySelector('.now__h1');return Math.round(h.getBoundingClientRect().height/parseFloat(getComputedStyle(h).lineHeight))})()")
    ok(lines <= 2, f'휴대폰 첫 화면 제목 {lines}줄')
    c.close()

    # 첫 화면 문장: 빛나는 칸 다섯이 도구의 진짜 계산 파일로 다 켜지고(값에 숫자, 자리 점 없음), 글자 수 칸은 칸칸으로 다시 세도 같고,
    # 다른 도시는 방문자와 다른 시각대, 칸을 누르면 그 도구 창, 계산 파일을 못 받거나 JS가 꺼져 있으면 칸 없는 글
    NOW = r"""()=>{const l=document.querySelector('[data-now]'),t=[...l.querySelectorAll('.nt')];const c=l.cloneNode(true);c.querySelectorAll('.nt__who').forEach(x=>x.remove());
      const txt=c.textContent.replace(/\s+/g,' ').trim(),cnt=t.find(a=>a.dataset.nt==='count').querySelector('.nt__v').textContent;
      return{on:t.filter(a=>a.classList.contains('is-on')).length,n:t.length,vals:t.map(a=>a.querySelector('.nt__v').textContent),
        same:window.LC?+cnt.replace(/[^0-9]/g,'')===LC.analyze(txt,{segment:false}).chars:false,city:l.querySelector('[data-city]').textContent,
        how:document.querySelector('[data-now-how]').innerText.trim(),plain:document.querySelector('.now').classList.contains('is-plain'),
        pills:document.querySelectorAll('.ntool.is-on').length,seed:(JSON.parse(t.find(a=>a.dataset.nt==='count').dataset.seed||'{}').text||'')===txt}}"""
    for pre, w, tz, city in (('', 390, 'Asia/Seoul', '뉴욕'), ('', 1366, 'America/New_York', '서울'), ('/en', 390, 'America/Los_Angeles', 'Seoul'), ('/en', 1366, 'Asia/Seoul', 'New York')):
        c = br.new_context(viewport={'width': w, 'height': 844}, timezone_id=tz); pg = c.new_page(); errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.route(SUB, sub_file)
        pg.goto(BASE + pre + '/'); pg.wait_for_timeout(4500)
        st = pg.evaluate(NOW)
        good = (st['on'] == st['n'] == 5 and all((re.search(r'[0-9]', v) or v in ('오늘 하루', 'just today')) and '·' not in v for v in st['vals']) and st['same'] and st['seed']
                and st['city'] == city and st['how'] and not st['plain'] and st['pills'] == 4 and not errs)
        ok(good, f"{pre}/ {w}px {tz} 첫 화면 칸 {st['on']}/{st['n']} 켜짐 {st['vals']}, 글자 수 {'맞음' if st['same'] else '틀림'}, 도구 줄 {st['pills']}/4, 도시 {st['city']} {errs[:2]}")
        if w == 1366:  # 글자 수·남은 날 칸을 누르면 창 안 바로 써 보기가 같은 글·같은 끝 날짜로 같은 수를 낸다
            for k in ('count', 'left'):
                want = re.sub(r'[^0-9]', '', pg.evaluate(f"document.querySelector('[data-now] [data-nt={k}] .nt__v').textContent"))
                pg.locator(f'[data-now] .nt[data-nt="{k}"]').click(); got = ''; m = None
                for _ in range(40):  # 시연이 다 칠 때까지(최대 8초)
                    pg.wait_for_timeout(200)
                    got = pg.evaluate("(()=>{const b=document.querySelector('dialog.sheet .tr-big');return b?b.textContent:''})()")
                    m = re.search(r'[0-9][0-9,]*', got)
                    if m and m.group().replace(',', '') == want: break
                ok(want and m and m.group().replace(',', '') == want, f"{pre}/ {k} 칸을 누르면 창의 바로 써 보기도 {want} ({got.strip()[:40]})")
                pg.keyboard.press('Escape'); pg.wait_for_timeout(700)
        a = pg.locator('[data-now] .nt[data-nt="hz"]'); a.click(); pg.wait_for_timeout(1200)
        op = pg.evaluate("document.querySelector('dialog.sheet').open && location.pathname")
        pg.keyboard.press('Escape'); pg.wait_for_timeout(600)
        ok(op == f'{pre}/works/checkbench/' and pg.evaluate("location.pathname") == pre + '/', f'{pre}/ {w}px 첫 화면 주사율 칸을 누르면 체크벤치 창({op}), 닫으면 홈')
        c.close()
    c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page()
    pg.route(SUB, lambda r: r.fulfill(status=404, body=''))
    pg.goto(BASE + '/'); pg.wait_for_timeout(1200)
    ok(pg.evaluate("document.querySelector('.now').classList.contains('is-plain') && getComputedStyle(document.querySelector('.now__plain')).display==='block' && getComputedStyle(document.querySelector('[data-now]')).display==='none'"),
       '계산 파일을 못 받으면 첫 화면은 칸 없는 글')
    c.close()
    # 계산 파일 하나가 끝내 안 오면 그 도구 문장만 빠지고(이미 켜진 칸은 그대로), 남은 글을 다시 세고, 그 도구 이름표도 빠진다
    c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route(SUB, lambda r: None if 'ck-measure' in r.request.url else sub_file(r))   # 체크벤치 파일은 답하지 않음(그래서 load 도 안 옴)
    pg.goto(BASE + '/', wait_until='domcontentloaded'); pg.wait_for_timeout(6800)
    st = pg.evaluate(NOW)
    gone = pg.evaluate("!document.querySelector('[data-part=hz]') && document.querySelector('.ntool[data-tool=checkbench]').hidden && !!document.getElementById('nw-hz').textContent")
    ok(not st['plain'] and gone and st['on'] == st['n'] == 4 and st['same'] and not errs, f"체크벤치 파일이 안 오면 그 문장만 빠짐 (켜짐 {st['on']}/{st['n']}, 글자 수 {'맞음' if st['same'] else '틀림'}) {errs[:1]}")
    c.close()
    # landing.js 자체를 못 받으면 6초 뒤 칸 없는 글(빈 막대와 '불러오는 중'이 남지 않게)
    c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page()
    pg.route(SUB, sub_file); pg.route(re.compile(r'.*/assets/landing\.js.*'), lambda r: r.abort())
    pg.goto(BASE + '/'); pg.wait_for_timeout(6500)
    ok(pg.evaluate("document.querySelector('.now').classList.contains('is-plain') && getComputedStyle(document.querySelector('.now__plain')).display==='block'"), 'landing.js를 못 받으면 6초 뒤 칸 없는 글')
    c.close()
    c = br.new_context(viewport={'width': 390, 'height': 844}, java_script_enabled=False); pg = c.new_page(); pg.goto(BASE + '/'); pg.wait_for_timeout(300)
    ok(pg.evaluate("getComputedStyle(document.querySelector('.now__plain')).display==='block' && getComputedStyle(document.querySelector('[data-now]')).display==='none'"), 'JS가 꺼져 있으면 첫 화면은 칸 없는 글')
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
    lines = pg.evaluate("(()=>{const h=document.querySelector('.now__h1');return Math.round(h.getBoundingClientRect().height/parseFloat(getComputedStyle(h).lineHeight))})()")
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
    ok(pg.url == BASE + '/' and '루멘랩' in pg.inner_text('h1'), '한국어 단추로 / 로')
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
