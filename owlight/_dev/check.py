# Owlight 배포 전 확인: bash _dev/check.sh (사이트 폴더를 8766으로 띄우고 이 파일을 돌림)
# 320·390·1366 가로 넘침, 콘솔 오류, 깨진 사진, 페이지 안 링크, 영어에 한글 남음, 제목 줄 수, 장면 판 누르기,
# 동작 줄이기에서 다 보임, 움직임 켠 채 끝까지 내린 뒤 숨은 요소, 첫 화면이 다시 흐려지지 않음
import os, re, sys
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

with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CHROME)
    for path in ('/', '/404.html'):
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
                    hidden = pg.evaluate('''[...document.querySelectorAll('main *')].filter(e => {
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
                        btn = pg.evaluate('(() => { scrollTo(0,0); const b = document.querySelector(".hero .btn").getBoundingClientRect(); return b.bottom <= innerHeight })()')
                        ok(btn, f'{tag} 첫 화면에서 버튼이 스크롤 없이 보임')
                c.close()

    # 페이지 안 링크(#…)가 있는 곳을 가리킴
    c = br.new_context(viewport={'width': 1366, 'height': 800}, locale='ko-KR'); pg = c.new_page(); pg.goto(BASE + '/')
    miss = pg.evaluate('[...document.querySelectorAll("a[href^=\'#\']")].map(a => a.getAttribute("href")).filter(h => h.length > 1 && !document.querySelector(h))')
    ok(not miss, f'페이지 안 링크 대상 있음 {miss}')
    locals_ = pg.evaluate('[...document.querySelectorAll("a[href^=\'/\'], link[href^=\'/\'], img[src^=\'/\'], script[src^=\'/\']")].map(e => e.getAttribute("href") || e.getAttribute("src"))')
    bad = [u for u in set(locals_) if pg.request.get(BASE + u.split('#')[0]).status != 200]
    ok(not bad, f'사이트 안 파일 링크 전부 200 {bad}')
    # 장면 판: 앱 기본값과 같은 조합으로 켜지고, 켠 장면을 다시 누르면 다 꺼짐
    expect = {'scFocus': 'nightwatch halo', 'scShare': 'nightwatch curtain halo', 'scMovie': 'nightwatch', 'scPresent': 'nightwatch curtain'}  # 발표가 처음에 눌려 있어서 맨 뒤에
    good = True
    for k, v in expect.items():
        pg.click(f'[data-i18n={k}]'); pg.wait_for_timeout(50)
        on = pg.evaluate('[...document.querySelectorAll(".sw.is-on")].map(e => e.dataset.f).join(" ")')
        good = good and on == v
    pg.click('[data-i18n=scPresent]'); pg.wait_for_timeout(50)
    good = good and pg.evaluate('document.querySelectorAll(".sw.is-on").length') == 0
    ok(good, '장면 판: 네 장면 조합이 앱과 같고, 다시 누르면 모두 꺼짐')
    # 언어 버튼: 누르면 바뀌고 다시 열어도 유지
    pg.click('[data-lang-btn]'); pg.wait_for_timeout(100)
    l1 = pg.evaluate('document.documentElement.lang'); pg.reload(); pg.wait_for_timeout(300)
    ok(l1 == 'en' and pg.evaluate('document.documentElement.lang') == 'en', '언어 버튼으로 영어 전환·기억')
    c.close()

    # 동작 줄이기: 내리지 않아도 전부 보임
    c = br.new_context(viewport={'width': 390, 'height': 800}, reduced_motion='reduce'); pg = c.new_page(); pg.goto(BASE + '/'); pg.wait_for_timeout(300)
    n = pg.evaluate('[...document.querySelectorAll("main *")].filter(e => +getComputedStyle(e).opacity < 0.2 && e.getBoundingClientRect().width > 4).length')
    ok(n == 0 and pg.evaluate('document.querySelectorAll(".sw.is-on").length') == 2, '동작 줄이기: 숨은 요소 0, 장면 판 바로 켜짐')
    c.close()

    # 첫 화면이 보인 뒤 다시 흐려지지 않음 (제목·버튼·스크린숏 opacity 2.5초 기록)
    c = br.new_context(viewport={'width': 1366, 'height': 800}); pg = c.new_page()
    pg.add_init_script('''window.__op=[];const t0=performance.now();(function f(){const q=['h1','.hero .btn','.hero__shot img'].map(s=>document.querySelector(s));
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
