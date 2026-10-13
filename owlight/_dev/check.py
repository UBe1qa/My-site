# Owlight 배포 전 확인: bash _dev/check.sh (사이트 폴더를 8766으로 띄우고 이 파일을 돌림)
# 320·390·1366 가로 넘침, 콘솔 오류, 깨진 사진, 페이지 안 링크, 영어에 한글 남음, 제목 줄 수, 첫 화면 '눌러 보는 메뉴'(장면·스위치),
# 동작 줄이기에서 다 보임, 움직임 켠 채 끝까지 내린 뒤 숨은 요소, 첫 화면이 다시 흐려지지 않음,
# 지원·방침(/support/, /privacy/) 본문이 lumenlab.page/owlight/… 와 같은지, 고른 언어 칸만 보이는지,
# 아래쪽(몰입 세션·단축키 칸)에서 새로고침했을 때 영어 방문자가 한국어 스크린숏을 받지 않고 그림이 숨었다 다시 나타나지 않는지,
# Mac/맥을 슬로건·소유격으로 쓰지 않는지(App Store 심사 5.2.5: 'Mac App Store'만 허용),
# 휴대폰용 잘라 낸 그림의 <source> 크기가 실제 파일과 같은지(자리 밀림 방지)
import os, re, sys
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8766')
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
fails = []
def ok(c, msg):
    print(('통과 ' if c else '실패 ') + msg)
    if not c: fails.append(msg)

def scroll_all(pg):
    h = pg.evaluate('document.documentElement.scrollHeight')
    for y in range(0, h + 800, 500):
        pg.mouse.wheel(0, 500); pg.wait_for_timeout(60)
    pg.wait_for_timeout(900)

# 지원·방침 본문(<h1>부터 마지막 </section>까지)이 앱·App Store에 등록된 lumenlab.page/owlight/… 와 글자까지 같음
def body_text(f):
    t = open(f, encoding='utf-8').read(); return t[t.index('<h1>'):t.rindex('</section>')]
for name in ('support', 'privacy'):
    a = os.path.join(SITE, name, 'index.html'); b = os.path.join(os.path.dirname(SITE), 'lumenlab', 'owlight', name, 'index.html')
    ok(os.path.exists(a) and body_text(a) == body_text(b), f'/{name}/ 본문이 lumenlab.page/owlight/{name}/ 와 같음 (다르면 python3 _dev/make_docs.py)')

# Mac/맥 슬로건·소유격 금지(2026-10-13 App Store 거절 5.2.5). 'Mac App Store'와 macOS만 쓴다
for f in ('index.html', 'assets/i18n.js', 'support/index.html', 'privacy/index.html', '404.html', '_dev/og.html'):
    t = open(os.path.join(SITE, f), encoding='utf-8').read()
    t = re.sub(r'<!--.*?-->|/\*.*?\*/', '', t, flags=re.S)
    hits = re.findall(r'.{0,12}(?:맥|\bMac(?!\s*App Store)\b|\bMacs\b).{0,12}', t)
    ok(not hits, f'{f}: Mac/맥 문구는 Mac App Store뿐 {hits[:3]}')

with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CHROME)
    for path in ('/', '/404.html', '/support/', '/privacy/'):
        for loc in ('ko-KR', 'en-US'):
            for w in (320, 390, 1366):
                c = br.new_context(viewport={'width': w, 'height': 800}, locale=loc)
                pg = c.new_page(); errs = []
                pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
                pg.on('pageerror', lambda e: errs.append(str(e)))
                pg.goto(BASE + path); pg.wait_for_timeout(500)
                scroll_all(pg)
                tag = f'{path} {loc[:2]} {w}px'
                ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{tag} 가로 넘침 없음')
                ok(not errs, f'{tag} 콘솔 오류 0 {errs[:2]}')
                broken = pg.evaluate('[...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src)')
                ok(not broken, f'{tag} 깨진 사진 0 {broken[:2]}')
                if path == '/':
                    pg.wait_for_timeout(3000)  # 예시 하루 재생(약 3.5초)이 끝나길 기다림
                    # 첫 화면의 흉내 낸 화면(.stage)은 켜고 끌 때 일부러 숨기는 조각이 있어 뺀다
                    hidden = pg.evaluate('''[...document.querySelectorAll('main *')].filter(e => { if (e.closest('.stage, .lumen__scene')) return false;
                        const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false;
                        let o = 1, n = e; while (n && n.nodeType === 1) { o *= +getComputedStyle(n).opacity; n = n.parentElement }
                        return o < 0.2 || getComputedStyle(e).visibility === 'hidden' }).length''')
                    ok(hidden == 0, f'{tag} 끝까지 내린 뒤 숨은 요소 0 ({hidden})')
                    if loc.startswith('en'):
                        left = pg.evaluate('''[...document.querySelectorAll('body *:not(script):not(style)')].filter(e =>
                            !e.closest('[lang=ko]') && [...e.childNodes].some(n => n.nodeType === 3 && /[가-힣]/.test(n.textContent))).map(e => e.textContent.trim().slice(0, 30))''')
                        ok(not left, f'{tag} 영어 화면에 한글 남음 0 {left[:3]}')
                        alts = pg.evaluate('[...document.querySelectorAll("img[alt]")].filter(i => /[가-힣]/.test(i.alt)).length')
                        ok(alts == 0, f'{tag} 영어 화면 사진 설명(alt) 영어')
                        shots = pg.evaluate('[...document.querySelectorAll("img[data-shot]")].every(i => /\\/img\\/en-/.test(i.currentSrc || i.src))')
                        ok(shots, f'{tag} 영어 스크린숏으로 바뀜')
                    if w <= 390:
                        lines = pg.evaluate('(() => { const h = document.querySelector("h1"); return Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)) })()')
                        ok(lines <= 2 or w == 320, f'{tag} 첫 화면 제목 {lines}줄')
                        btn = pg.evaluate('(() => { scrollTo(0,0); const b = document.querySelector(".panel__scenes .chip:last-child").getBoundingClientRect(); return b.bottom <= innerHeight })()')
                        ok(btn, f'{tag} 첫 화면에서 장면 단추 넷이 스크롤 없이 보임')
                c.close()

    # 페이지 안 링크(#…)가 있는 곳을 가리킴
    c = br.new_context(viewport={'width': 1366, 'height': 800}, locale='ko-KR'); pg = c.new_page(); pg.goto(BASE + '/')
    miss = pg.evaluate('[...document.querySelectorAll("a[href^=\'#\']")].map(a => a.getAttribute("href")).filter(h => h.length > 1 && !document.querySelector(h))')
    ok(not miss, f'페이지 안 링크 대상 있음 {miss}')
    n_sc = pg.evaluate('document.querySelectorAll(".scenery__list img").length')
    ok(n_sc == 10, f'커튼 풍경 그림 10장 ({n_sc})')
    locals_ = pg.evaluate('[...document.querySelectorAll("a[href^=\'/\'], link[href^=\'/\'], img[src^=\'/\'], script[src^=\'/\']")].map(e => e.getAttribute("href") || e.getAttribute("src"))')
    bad = [u for u in set(locals_) if pg.request.get(BASE + u.split('#')[0]).status != 200]
    ok(not bad, f'사이트 안 파일 링크 전부 200 {bad}')
    # 첫 화면 메뉴: 처음에 '발표'가 스스로 눌리고, 네 장면 조합이 앱 기본값과 같고, 켠 장면을 다시 누르면 다 꺼짐,
    # 스위치를 하나씩 눌러 장면과 같은 조합이 되면 그 장면에 불이 들어옴
    pg.wait_for_timeout(2100)  # 1.6초에 '발표'가 스스로 눌림
    on = lambda: pg.evaluate('[...document.querySelectorAll(".sw[aria-checked=true]")].map(e => e.dataset.f).join(" ")')
    good = on() == 'nightwatch curtain' and pg.evaluate('document.querySelector("[data-demo]").classList.contains("is-curtain")')
    expect = {'scFocus': 'nightwatch halo', 'scShare': 'nightwatch curtain halo', 'scMovie': 'nightwatch', 'scPresent': 'nightwatch curtain'}
    for k, v in expect.items():
        pg.click(f'.chip[data-i18n={k}]'); pg.wait_for_timeout(50)
        good = good and on() == v
    pg.click('.chip[data-i18n=scPresent]'); pg.wait_for_timeout(50)
    good = good and on() == '' and pg.evaluate('document.querySelector("[data-state]").textContent') == '모두 꺼짐'
    pg.click('.sw[data-f=nightwatch]'); pg.wait_for_timeout(50)
    good = good and pg.evaluate('document.querySelector(".chip[data-i18n=scMovie]").getAttribute("aria-pressed")') == 'true'
    pg.click('.sw[data-f=curtain]'); pg.wait_for_timeout(50)
    good = good and pg.evaluate('[...document.querySelectorAll(".chip[aria-pressed=true]")].map(c => c.dataset.i18n).join()') == 'scPresent'
    ok(good, '첫 화면 메뉴: 처음 발표, 네 장면 조합이 앱과 같음, 다시 누르면 꺼짐, 스위치 조합이 장면과 맞으면 불 켜짐')
    # 기능 탭: 누르면 그 칸만 보이고 화살표 키로도 옮겨 감
    pg.click('#tab-curtain'); pg.wait_for_timeout(50)
    t1 = pg.evaluate('[...document.querySelectorAll("[role=tabpanel]")].map(p => p.hidden ? 0 : 1).join("")')
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(50)
    t2 = pg.evaluate('[document.activeElement.id, [...document.querySelectorAll("[role=tabpanel]")].map(p => p.hidden ? 0 : 1).join("")]')
    ok(t1 == '010' and t2 == ['tab-nightwatch', '001'], f'기능 탭: 누르기·화살표 키 ({t1}, {t2})')
    # 언어 버튼: 누르면 바뀌고 다시 열어도 유지
    pg.click('[data-lang-btn]'); pg.wait_for_timeout(100)
    l1 = pg.evaluate('document.documentElement.lang'); pg.reload(); pg.wait_for_timeout(300)
    ok(l1 == 'en' and pg.evaluate('document.documentElement.lang') == 'en', '언어 버튼으로 영어 전환·기억')
    sup = pg.evaluate('[...document.querySelectorAll("a[href^=\'/support/\'], a[href^=\'/privacy/\']")].map(a => a.getAttribute("href"))')
    ok(sup and all(h.endswith('#en') for h in sup), f'영어 화면의 지원·방침 링크는 #en {sup}')
    # 지원·방침: 기억한 언어(영어) 칸만 보이고, 한국어 단추를 누르면 한국어 칸으로 바뀌고 기억
    vis = lambda: pg.evaluate("[...document.querySelectorAll('.doc section')].map(s => s.id + ':' + (s.offsetHeight > 0)).join(' ')")
    pg.goto(BASE + '/privacy/'); pg.wait_for_timeout(200)
    ok(vis() == 'ko:false en:true', f'방침: 영어를 골랐으면 영어 칸만 ({vis()})')
    pg.click('.doc-head nav a[href="#ko"]'); pg.wait_for_timeout(200)
    ok(vis() == 'ko:true en:false' and pg.evaluate('localStorage.getItem("owlight:lang")') == 'ko', f'방침: 한국어 단추로 한국어 칸 ({vis()})')
    pg.goto(BASE + '/support/#en'); pg.wait_for_timeout(200)
    ok(vis() == 'ko:false en:true', f'지원 #en 이면 영어 칸 ({vis()})')
    c.close()

    # 동작 줄이기: 내리지 않아도 전부 보임
    c = br.new_context(viewport={'width': 390, 'height': 800}, reduced_motion='reduce'); pg = c.new_page(); pg.goto(BASE + '/'); pg.wait_for_timeout(300)
    n = pg.evaluate('[...document.querySelectorAll("main *")].filter(e => +getComputedStyle(e).opacity < 0.2 && e.getBoundingClientRect().width > 4).length')
    n = pg.evaluate('[...document.querySelectorAll("main *")].filter(e => !e.closest(".stage, .lumen__scene") && +getComputedStyle(e).opacity < 0.2 && e.getBoundingClientRect().width > 4).length')
    ok(n == 0 and pg.evaluate('document.querySelectorAll(".sw[aria-checked=true]").length') == 2, '동작 줄이기: 숨은 요소 0, 첫 화면 메뉴에 발표가 바로 켜짐')
    c.close()

    # 몰입 세션·단축키 칸까지 내린 뒤 새로고침(브라우저가 그 위치를 되살림, 예전에 Cloudflare가 LCP 4.5초로 잡은 경우):
    # 영어면 한국어 스크린숏을 받지 않음, 그 칸이 숨었다 다시 나타나지 않음
    for loc in ('en-US', 'ko-KR'):
        for w in (390, 1366):
            c = br.new_context(viewport={'width': w, 'height': 800}, locale=loc); pg = c.new_page()
            pg.goto(BASE + '/'); pg.evaluate("document.querySelector('.auto__grid').scrollIntoView()"); pg.wait_for_timeout(1200)
            pg.add_init_script("""window.__hid=0;(function f(){var e=document.querySelector('.auto__item');
              if(e&&(e.hasAttribute('data-rv')||+getComputedStyle(e).opacity<.95))window.__hid++;if(performance.now()<4000)requestAnimationFrame(f)})()""")
            cdp = c.new_cdp_session(pg); cdp.send('Network.enable'); cdp.send('Network.clearBrowserCache')
            # 느린 망·느린 CPU에서만 드러남(빠르면 i18n.js가 먼저 돌아 옛 방식도 통과했다)
            cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 150, 'downloadThroughput': 200000, 'uploadThroughput': 94000})
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
            pg.reload(); pg.wait_for_timeout(4500)
            r = pg.evaluate("""({y: scrollY, hid: window.__hid, src: document.querySelector('.auto__item img.shot').currentSrc.replace(location.origin, ''),
              ko: performance.getEntriesByType('resource').map(e => e.name.replace(location.origin, '')).filter(n => /[/]img[/]ko-/.test(n))})""")
            tag = f'몰입 세션 칸 새로고침 {loc[:2]} {w}px'
            ok(r['y'] > 1500 and r['hid'] == 0, f'{tag}: 그림이 숨지 않음 (scrollY {r["y"]}, 숨은 프레임 {r["hid"]})')
            if loc == 'en-US':
                ok('/img/en-5' in r['src'] and not r['ko'], f'{tag}: 영어 그림만 받음 ({r["src"]}, 한국어 {r["ko"]})')
            c.close()

    # 휴대폰용 잘라 낸 그림(<source>)의 width·height = 실제 파일 크기 (다르면 그림이 뜰 때 아래 글이 밀림)
    c = br.new_context(viewport={'width': 390, 'height': 800}, locale='ko-KR'); pg = c.new_page(); pg.goto(BASE + '/')
    scroll_all(pg)
    bad = pg.evaluate("""[...document.querySelectorAll('picture source[data-shot]')].filter(s => !s.closest('[hidden]')).map(s => { const i = s.parentElement.querySelector('img');
      return [s.dataset.shot, +s.getAttribute('width'), +s.getAttribute('height'), i.naturalWidth, i.naturalHeight, i.currentSrc.includes(s.dataset.shot + '-')] })
      .filter(a => !a[5] || a[1] !== a[3] || a[2] !== a[4])""")
    ok(not bad, f'휴대폰 그림 <source> 크기 = 파일 크기 {bad}')
    c.close()

    # 첫 화면이 보인 뒤 다시 흐려지지 않음 (제목·장면 단추·흉내 낸 화면 opacity 2.5초 기록)
    c = br.new_context(viewport={'width': 1366, 'height': 800}); pg = c.new_page()
    pg.add_init_script('''window.__op=[];const t0=performance.now();(function f(){const q=['h1','.panel__scenes .chip','.stage'].map(s=>document.querySelector(s));
      if(q.every(Boolean)){window.__op.push(q.map(e=>{let o=1,n=e;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}return o}))}
      if(performance.now()-t0<2500)requestAnimationFrame(f)})()''')
    pg.goto(BASE + '/'); pg.wait_for_timeout(2700)
    ops = pg.evaluate('window.__op'); bad = False
    for i in range(3):
        seen = False
        for row in ops:
            if row[i] >= .95: seen = True
            elif seen and row[i] < .85: bad = True
    ok(ops and not bad and all(v >= .95 for v in ops[-1]), '첫 화면이 보인 뒤 다시 흐려지지 않음')
    c.close(); br.close()

print(f'\n실패 {len(fails)}개' if fails else '\n전부 통과')
sys.exit(1 if fails else 0)
