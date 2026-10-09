#!/usr/bin/env python3
"""화면 확인(Playwright): 먼저 `node count/_dev/serve.mjs` 를 띄우고  python3 count/_dev/e2e.py [스크린샷 폴더]

보는 것: 모든 페이지 콘솔 오류 0·깨진 그림 0·320px 가로 스크롤 0 / 도구마다 실제로 눌러 결과 확인(화면 숫자 = 로직 값) /
처음 열 때 화면 밀림(CLS ≤ 0.02, 컴퓨터·휴대폰, 브라우저 언어가 달라 안내 띠가 뜰 때도) / 연출 세 가지 확인 줄 /
동작 줄이기에서 내용 전부 보임 / 광고 미리보기 자리가 도구에서 150px 넘게 떨어짐 / 영어 페이지를 쓴 뒤에도 lang="ko" 밖 한글 0 /
CP949 표 = 브라우저 TextDecoder('euc-kr') / 없는 주소 404. 스크린샷 폴더를 주면 final-*.png 도 찍는다.
광고 요청은 정규식으로 막는다(로컬이지만 습관으로).
"""
import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE = os.environ.get('BASE', 'http://localhost:8443')
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
ADS = re.compile(r'googlesyndication|doubleclick|adservice|fundingchoices')
HANGUL = "(() => { const re=/[\\u1100-\\u11FF\\u3130-\\u318F\\uAC00-\\uD7A3]/; const out=[]; const w=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ const p=n.parentElement; if(!p||p.closest('script,style,template,[lang=ko]')) continue; if(re.test(n.nodeValue)) out.push(n.nodeValue.trim().slice(0,30)); } document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(e=>{ if(e.closest('[lang=ko]')) return; for (const a of ['placeholder','aria-label','title']) if (re.test(e.getAttribute(a)||'')) out.push(a+':'+e.getAttribute(a)); }); return out; })()"
CLS_INIT = "window.__cls=0; new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});"
passed, fails, notes = 0, [], []


def ok(cond, msg):
    global passed
    if cond:
        passed += 1
    else:
        fails.append(msg)
    return cond


def main():
    paths = [u.text.replace('https://count.lumenlab.page', '') for u in ET.parse(ROOT / 'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy') or ''
    args = ['--proxy-bypass-list=localhost;127.0.0.1']
    if proxy:
        args.append('--proxy-server=https=' + proxy.replace('http://', ''))
    exe = sorted(Path('/opt/pw-browsers').glob('chromium-*/chrome-linux/chrome'))
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=str(exe[0]) if exe else None, args=args)

        FONT = (ROOT / 'assets' / 'pretendard.css').read_text(encoding='utf-8').replace('font-display:optional', 'font-display:swap')

        def ctx(w=1366, h=768, mobile=False, lang=None, dark=False, reduce=False, path='/', real_font=False):
            # real_font=False: 스크린샷용. 글꼴을 받아 둔 방문자가 보는 모습(Pretendard)으로 찍으려고 CSS의 표시 방식만 swap으로 바꿔 준다.
            # real_font=True : 실제 CSS 그대로(처음 온 방문자). 화면 밀림은 이쪽으로 잰다.
            c = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile,
                              locale=lang or ('ko-KR' if path.startswith('/ko/') else 'en-US'), color_scheme='dark' if dark else 'light',
                              reduced_motion='reduce' if reduce else 'no-preference', ignore_https_errors=True,
                              permissions=['clipboard-read', 'clipboard-write'])
            c.route(ADS, lambda r: r.abort())
            if not real_font:
                c.route('**/assets/pretendard.css', lambda r: r.fulfill(body=FONT, content_type='text/css'))
            return c

        def open_page(c, path, errs=None):
            pg = c.new_page()
            if errs is not None:
                pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
                pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
            pg.add_init_script(CLS_INIT)
            pg.goto(BASE + path, wait_until='load')
            return pg

        def shot(pg, name, full=False):
            if SHOTS:
                pg.evaluate('document.activeElement && document.activeElement.blur()')
                pg.wait_for_timeout(200)
                pg.screenshot(path=f'{SHOTS}/final-{name}.png', full_page=full)

        txt = lambda pg, sel: pg.inner_text(sel).strip()
        num = lambda pg, key: pg.eval_on_selector(f'.nums [data-n="{key}"]', 'e => e.textContent.replace(/,/g, "")')

        # ── 1. 모든 페이지: 오류·그림·가로 스크롤·화면 밀림 ──
        worst = (0, '')
        for path in paths + ['/404-nope']:
            for (w, h, mobile) in ((1366, 768, False), (390, 844, True)):
                errs = []
                c = ctx(w, h, mobile, path=path, real_font=True)
                pg = open_page(c, path, errs)
                pg.wait_for_timeout(1300)
                if path == '/404-nope':
                    errs[:] = [e for e in errs if '404' not in e]
                cls = pg.evaluate('window.__cls')
                if cls > worst[0]:
                    worst = (cls, f'{path} {w}px')
                ok(cls <= 0.02, f'{path} {w}px: 화면 밀림 {cls:.3f} > 0.02')
                ok(not errs, f'{path} {w}px: 콘솔 오류 {errs[:2]}')
                ok(pg.evaluate('[...document.images].filter(i => i.complete && i.naturalWidth === 0).length') == 0, f'{path}: 깨진 그림')
                ok(pg.evaluate('document.documentElement.scrollWidth - innerWidth') <= 0, f'{path} {w}px: 가로 스크롤')
                ok(pg.evaluate('!!document.querySelector("h1") && document.querySelector("h1").getBoundingClientRect().height > 0'), f'{path}: h1이 안 보임')
                c.close()
            c = ctx(320, 640, True, path=path)
            pg = open_page(c, path)
            pg.wait_for_timeout(400)
            ok(pg.evaluate('document.documentElement.scrollWidth - innerWidth') <= 0, f'{path} 320px: 가로 스크롤 {pg.evaluate("document.documentElement.scrollWidth - innerWidth")}')
            c.close()
        notes.append(f'화면 밀림 가장 큰 값 {worst[0]:.4f} ({worst[1] or "모두 0"})')
        # 브라우저 언어가 페이지와 다를 때(안내 띠가 뜸)도 밀림이 없어야 한다
        for path, lang in (('/', 'ko-KR'), ('/ko/', 'en-US')):
            c = ctx(390, 844, True, lang=lang, path=path, real_font=True)
            pg = open_page(c, path)
            pg.wait_for_timeout(1200)
            ok(pg.locator('.langbar').count() == 1, f'{path}: 다른 언어 안내 띠가 안 뜸')
            ok(pg.evaluate('window.__cls') <= 0.02, f'{path}: 안내 띠가 뜰 때 화면 밀림 {pg.evaluate("window.__cls"):.3f}')
            ok(pg.evaluate('getComputedStyle(document.querySelector(".langbar")).position') == 'absolute', '안내 띠는 겹쳐 띄운다')
            if path == '/':
                ok(pg.evaluate(HANGUL) == [], f'/ 안내 띠 한글이 lang="ko" 밖: {pg.evaluate(HANGUL)[:2]}')
            pg.click('.langbar button')
            ok(pg.locator('.langbar').count() == 0 and pg.evaluate('localStorage.getItem("kk.lang")') is not None, '안내 띠 닫기')
            c.close()
        r = b.new_context().request.get(BASE + '/404-nope')
        ok(r.status == 404 and 'adsbygoogle' not in r.text(), f'없는 주소가 404가 아님({r.status})')
        ok(b.new_context().request.get(BASE + '/_dev/build.py').status == 404, '_dev 가 열림')

        # ── 2. 한국어 첫 화면 ──
        c = ctx(path='/ko/'); pg = open_page(c, '/ko/'); pg.wait_for_timeout(500)
        shot(pg, 'ko-home-empty-desktop')
        ok(pg.is_visible('[data-act="sample"]') and not pg.is_visible('[data-act="clear"]'), 'ko: 빈 상태엔 예시 단추만')
        ok(pg.is_hidden('.goal-form') and pg.input_value('#goal') == '', 'ko: 목표는 처음에 비어 있고 접혀 있다')
        pg.fill('#text', '가 나\n다')
        ok([num(pg, k) for k in ('chars', 'nospace', 'utf8', 'euckr', 'words', 'sentences', 'lines', 'sheets')] == ['5', '3', '11', '8', '3', '2', '2', '1'], f'ko: 가 나⏎다 = {[num(pg, k) for k in ("chars", "nospace", "utf8", "euckr", "words", "sentences", "lines", "sheets")]}')
        pg.click('.basis summary'); pg.click('[data-nl="2"]')
        ok([num(pg, 'chars'), num(pg, 'utf8'), txt(pg, '#nlNow')] == ['6', '12', '줄바꿈은 2자로 셈'], 'ko: 줄바꿈 2자')
        pg.click('[data-nl="0"]'); ok(num(pg, 'chars') == '4', 'ko: 줄바꿈 0자'); pg.click('[data-nl="1"]')
        pg.click('[data-act="goal-open"]'); pg.fill('#goal', '10')
        ok(txt(pg, '#goalMsg') == '목표 10자(공백 포함) · 5자 남았어요', f'ko: 목표 문구 = {txt(pg, "#goalMsg")}')
        ok(pg.locator('.goal .cells i.on').count() == 12, f'ko: 목표 칸 12칸(50%) = {pg.locator(".goal .cells i.on").count()}')
        ok(pg.locator('.ring').count() == 0, 'ko: 목표를 적는 순간에는 동그라미가 없다')
        pg.select_option('#goalBasis', 'utf8'); ok('바이트 넘었어요' in txt(pg, '#goalMsg') and pg.locator('.goal .cells i.on.over').count() == 25, 'ko: 바이트 기준으로 바꾸면 넘침')
        pg.select_option('#goalBasis', 'chars')
        # 목표 맞춤 동그라미: 고쳐 써서 90~100%에 처음 들어온 순간에만
        pg.focus('#text'); pg.keyboard.press('Control+End')
        pg.keyboard.type('라마바'); ok(pg.locator('.ring').count() == 0, 'ko: 80%에서는 동그라미가 없다')
        pg.keyboard.type('사')
        ok(pg.locator('.ring').count() == 1, 'ko: 90%에 들어온 순간 동그라미')
        ok(pg.evaluate('getComputedStyle(document.querySelector(".ring")).pointerEvents') == 'none', '동그라미는 터치를 통과시킨다')
        if SHOTS:
            pg.wait_for_timeout(700); pg.screenshot(path=f'{SHOTS}/final-fx-goal-ring.png', clip={'x': 900, 'y': 150, 'width': 400, 'height': 220})
        pg.keyboard.type('아'); ok(pg.locator('.ring').count() <= 1 and txt(pg, '#goalMsg').endswith('딱 맞아요'), 'ko: 100%면 딱 맞아요')
        pg.wait_for_timeout(2500); ok(pg.locator('.ring').count() == 0, 'ko: 동그라미는 스스로 지워진다')
        pg.keyboard.press('Backspace'); pg.keyboard.type('아'); pg.wait_for_timeout(100)
        ok(pg.locator('.ring').count() == 0, 'ko: 같은 글에서 두 번 나오지 않는다')
        pg.keyboard.type('자'); ok('넘었어요' in txt(pg, '#goalMsg') and pg.locator('.bigrow.is-over').count() == 1, 'ko: 넘으면 주홍')
        before = pg.input_value('#text'); pg.click('[data-act="clear"]')
        ok(pg.input_value('#text') == '' and pg.is_visible('.undo'), 'ko: 지우면 되돌리기가 보인다')
        pg.click('[data-act="undo"]'); ok(pg.input_value('#text') == before, 'ko: 되돌리기')
        pg.click('[data-act="goal-close"]'); ok(pg.is_hidden('.goal-form') and txt(pg, '#goalMsg') == '', 'ko: 목표 지우기')
        pg.fill('#text', '가😀'); ok(pg.is_visible('[data-miss]') and '1개' in txt(pg, '[data-miss]'), 'ko: EUC-KR로 못 담는 글자 알림')
        pg.click('[data-act="copy"]'); pg.wait_for_timeout(150); ok(pg.evaluate('navigator.clipboard.readText()') == '가😀', 'ko: 글 복사')
        # 글자 뜯어보기
        pg.fill('#text', ''); pg.wait_for_timeout(100)
        ok(pg.locator('#inspPick button').count() == 6 and '18' in txt(pg, '#inspSum'), f'ko: 뜯어보기 첫 예시 = {txt(pg, "#inspSum")}')
        ok(pg.locator('.insp-parts.go').count() == 0, '뜯어보기: 처음 열 때는 움직이지 않는다')
        pg.click('#inspPick button:nth-of-type(2)')
        ok(pg.locator('.insp-parts.go').count() == 1 and pg.locator('.insp-parts div').count() == 2, '뜯어보기: 눌렀을 때 펼쳐진다(🇰🇷 = 2조각)')
        pg.fill('#text', '오늘 👍🏽 좋아요 👨‍👩‍👧'); pg.wait_for_timeout(100)
        ok(pg.locator('#inspPick button').count() == 2, '뜯어보기: 글에서 여러 조각 글자를 찾는다')
        pg.click('[data-act="clear"]'); pg.click('[data-act="sample"]'); pg.wait_for_timeout(200)
        want = pg.evaluate('(() => { const r = LC.analyze(document.querySelector("#text").value, {newline:1, locale:"ko"}); return [r.chars, r.charsNoSpace, r.bytes.utf8, r.bytes.euckr.bytes, r.words, r.sentences, r.lines].map(String); })()')
        ok([num(pg, k) for k in ('chars', 'nospace', 'utf8', 'euckr', 'words', 'sentences', 'lines')] == want, 'ko: 예시 글 숫자 = 로직 값')
        ok(pg.is_hidden('.undo'), 'ko: 예시 글을 넣으면 되돌리기 안내가 사라진다')
        pg.reload(); pg.wait_for_timeout(500); pg.click('[data-act="sample"]'); pg.wait_for_timeout(250)
        pg.mouse.move(1360, 400); shot(pg, 'ko-home-desktop')
        if SHOTS:
            pg.evaluate('document.querySelector("#inspect").scrollIntoView()'); pg.click('#inspPick button:nth-of-type(1)'); pg.wait_for_timeout(700)
            pg.screenshot(path=f'{SHOTS}/final-fx-inspect.png')
        c.close()
        for dark, name in ((False, 'ko-home-mobile'), (True, 'ko-home-mobile-dark')):
            c = ctx(390, 844, True, dark=dark, path='/ko/'); pg = open_page(c, '/ko/'); pg.wait_for_timeout(400)
            if not dark:
                box = pg.evaluate('(() => { const t = document.querySelector("#text").getBoundingClientRect(); return [t.top, innerHeight]; })()')
                shot(pg, 'ko-home-empty-mobile')
            pg.evaluate('document.querySelector("[data-act=sample]").click()'); pg.wait_for_timeout(200)
            ok(pg.evaluate('getComputedStyle(document.querySelector(".strip")).position') == 'sticky', '휴대폰: 숫자 띠가 붙어 다닌다')
            ok(pg.evaluate('document.querySelector("#text").scrollHeight <= document.querySelector("#text").clientHeight + 2'), '휴대폰: 글 칸이 글 길이만큼 늘어난다(안쪽 스크롤 없음)')
            if not dark:
                pg.click('[data-act="goal-open"]'); pg.fill('#goal', '300'); pg.wait_for_timeout(100)
                ok(pg.inner_text('[data-strip3] span') == '남음', '휴대폰: 목표가 있으면 띠 셋째 칸이 남은 글자')
                pg.evaluate('scrollTo(0,0)')
            shot(pg, name)
            c.close()
        c = ctx(375, 667, True, path='/ko/'); pg = open_page(c, '/ko/'); pg.wait_for_timeout(300)
        top = pg.evaluate('document.querySelector("#text").getBoundingClientRect().top')
        ok(top < 500, f'375×667 첫 화면에 글 칸이 보인다(위에서 {top:.0f}px)'); notes.append(f'375×667에서 글 칸 시작 {top:.0f}px')
        c.close()
        c = ctx(dark=True, path='/ko/'); pg = open_page(c, '/ko/'); pg.evaluate('document.querySelector("[data-act=sample]").click()'); pg.wait_for_timeout(300); shot(pg, 'ko-home-desktop-dark'); c.close()

        # ── 3. 영어 첫 화면 ──
        c = ctx(path='/'); pg = open_page(c, '/'); pg.wait_for_timeout(400)
        pg.fill('#text', "Well-known tests don't fail. Do they?")
        ok([num(pg, k) for k in ('words', 'wordsSeg', 'chars', 'nospace', 'sentences', 'paras')] == ['6', '7', '37', '32', '2', '1'], f'en: 단어 6(띄어쓰기)·7(유니코드) = {[num(pg, k) for k in ("words", "wordsSeg", "chars", "nospace", "sentences", "paras")]}')
        ok(num(pg, 'read') == '2 sec', f'en: 읽는 시간 = {num(pg, "read")}')
        pg.click('.basis summary'); pg.fill('#wpmRead', '6'); ok(num(pg, 'read') == '1 min 0 sec', f'en: 속도를 바꾸면 시간이 바뀐다 = {num(pg, "read")}')
        pg.click('[data-act="goal-open"]'); pg.fill('#goal', '5')
        ok(txt(pg, '#goalMsg') == 'Goal: 5 words · 1 word over', f'en: 목표 문구 = {txt(pg, "#goalMsg")}')
        pg.click('[data-act="goal-close"]'); pg.click('[data-act="clear"]'); pg.click('[data-act="sample"]'); pg.wait_for_timeout(200)
        pg.click('#inspPick button:nth-of-type(1)')
        ok(pg.evaluate(HANGUL) == [], f'en: 쓴 뒤에도 lang="ko" 밖 한글 0 = {pg.evaluate(HANGUL)[:3]}')
        pg.evaluate('scrollTo(0,0)'); pg.mouse.move(1360, 400); shot(pg, 'en-home-desktop')
        # 루멘랩 칸
        ok(pg.evaluate('document.documentElement.classList.contains("anim") && !document.querySelector(".lumen").classList.contains("in")'), '루멘랩 칸: 화면에 들어오기 전에는 시작하지 않는다')
        pg.evaluate('document.querySelector(".lumen").scrollIntoView({block:"center"})'); pg.wait_for_timeout(1400)
        ok(pg.evaluate('document.querySelector(".lumen").classList.contains("in") && [...document.querySelectorAll(".lumen-cells span")].every(s => getComputedStyle(s).opacity === "1")'), '루멘랩 칸: 들어오면 글자가 다 놓인다')
        ok(pg.get_attribute('.lumen', 'href') == 'https://lumenlab.page/en/', '영어판 루멘랩 링크는 /en/')
        ok(pg.evaluate('document.getAnimations().filter(a => a.playState === "running").length') == 0, '루멘랩 칸: 끝나면 도는 움직임 0')
        if SHOTS:
            pg.locator('.foot').screenshot(path=f'{SHOTS}/final-fx-lumen.png')
        c.close()
        c = ctx(390, 844, True, path='/'); pg = open_page(c, '/'); pg.evaluate('document.querySelector("[data-act=sample]").click()'); pg.wait_for_timeout(300); shot(pg, 'en-home-mobile'); c.close()
        c = ctx(dark=True, path='/'); pg = open_page(c, '/'); pg.evaluate('document.querySelector("[data-act=sample]").click()'); pg.wait_for_timeout(300); shot(pg, 'en-home-desktop-dark'); c.close()
        # 동작 줄이기: 내용이 전부 보이고 움직이지 않는다
        c = ctx(reduce=True, path='/ko/'); pg = open_page(c, '/ko/'); pg.wait_for_timeout(500)
        ok(pg.evaluate('!document.documentElement.classList.contains("anim") && [...document.querySelectorAll(".lumen-cells span")].every(s => getComputedStyle(s).opacity === "1")'), '동작 줄이기: 루멘랩 칸 글자가 처음부터 보인다')
        pg.click('[data-act="goal-open"]'); pg.fill('#goal', '10'); pg.focus('#text'); pg.keyboard.type('가나다라마바사아자')
        ok(pg.locator('.ring').count() == 0 and '1자 남았어요' in txt(pg, '#goalMsg'), '동작 줄이기: 동그라미 없이 문구로 전해진다')
        pg.click('#inspPick button:nth-of-type(2)'); ok(pg.locator('.insp-parts.go').count() == 0 and pg.locator('.insp-parts div').count() == 2, '동작 줄이기: 뜯어보기는 바로 펼쳐진 모습')
        hidden = pg.evaluate('[...document.querySelectorAll("main *, footer *")].filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 4 && r.height > 4 && e.offsetParent && parseFloat(s.opacity) < 0.2; }).length')
        ok(hidden == 0, f'동작 줄이기: 숨은 채 남은 요소 {hidden}')
        c.close()

        # ── 4. 글자 수(X)·문자·바이트·원고지·자소서 ──
        c = ctx(path='/character-counter/'); pg = open_page(c, '/character-counter/'); pg.wait_for_timeout(500)
        pg.fill('#text', 'https://example.com 가😀')
        ok([num(pg, k) for k in ('chars', 'nospace', 'utf8', 'utf16', 'codepoints', 'xw')] == ['22', '21', '27', '46', '22', '28'], f'chars: 주소+가+😀 = {[num(pg, k) for k in ("chars", "nospace", "utf8", "utf16", "codepoints", "xw")]}')
        ok(txt(pg, '#xMsg') == '252 left.', f'chars: X 남은 수 = {txt(pg, "#xMsg")}')
        pg.fill('#text', '가' * 141); ok(num(pg, 'xw') == '282' and pg.locator('#xNum.is-over').count() == 1 and txt(pg, '#xMsg') == '2 over the limit.', 'chars: 한글 141자는 X에서 2 넘침')
        pg.click('[data-act="clear"]'); pg.click('[data-act="sample"]'); pg.wait_for_timeout(250)
        ok(pg.evaluate('LC.x.count(document.querySelector("#text").value).urls.length') == 1 and int(num(pg, 'xw')) < 280, 'chars: 예시 글의 주소를 찾고 280 안')
        pg.click('#inspPick button:nth-of-type(1)'); ok('on X' in txt(pg, '#inspSum'), 'chars: 뜯어보기에 X 값')
        ok(pg.evaluate(HANGUL) == [], f'chars: lang="ko" 밖 한글 0 = {pg.evaluate(HANGUL)[:3]}')
        pg.evaluate('scrollTo(0,0)'); pg.mouse.move(1360, 400); shot(pg, 'en-character-counter')
        c.close()

        c = ctx(path='/sms/'); pg = open_page(c, '/sms/'); pg.wait_for_timeout(400)
        pg.fill('#text', 'a' * 160); ok([num(pg, 'segs'), num(pg, 'smsLeft'), num(pg, 'smsEnc')] == ['1', '0', 'GSM-7'], 'sms: 160자 = 한 통')
        pg.fill('#text', 'a' * 161); ok([num(pg, 'segs'), num(pg, 'smsLeft'), num(pg, 'smsPer'), pg.locator('#segbar i').count()] == ['2', '145', '153', 2], f'sms: 161자 = 두 통 {[num(pg, "segs"), num(pg, "smsLeft"), num(pg, "smsPer")]}')
        pg.fill('#text', 'a' * 160 + '😀')
        ok([num(pg, 'segs'), num(pg, 'smsEnc'), num(pg, 'smsPer')] == ['3', 'Unicode (UCS-2)', '67'] and pg.is_visible('#smsBad') and pg.locator('#smsBad .chips i').count() == 1, 'sms: 이모지 하나로 유니코드 세 통 + 어떤 글자인지')
        pg.click('[data-act="clear"]'); pg.click('[data-act="sample"]'); pg.wait_for_timeout(200)
        ok(num(pg, 'segs') == '1' and pg.is_hidden('#smsBad'), 'sms: 예시 글은 GSM-7 한 통')
        ok(pg.evaluate(HANGUL) == [], 'sms: lang="ko" 밖 한글 0')
        pg.fill('#text', 'Hi! Your table for 4 is booked for Fri 7:30pm. Reply YES to confirm, or call 020 7946 0958 to change. We’ll hold it for 15 minutes 🙂'); pg.mouse.move(1360, 400)
        shot(pg, 'en-sms')
        c.close()

        c = ctx(path='/ko/byte/'); pg = open_page(c, '/ko/byte/'); pg.wait_for_timeout(400)
        pg.fill('#text', '가a\n똠😀')
        ok([num(pg, k) for k in ('utf8', 'euckr', 'utf16', 'chars')] == ['12', '6', '12', '5'], f'byte: {[num(pg, k) for k in ("utf8", "euckr", "utf16", "chars")]}')
        ok(pg.is_visible('[data-miss]') and pg.is_visible('[data-ks]') and '1자' in txt(pg, '[data-ks]'), 'byte: 못 담는 글자·완성형 밖 한글 알림')
        pg.click('.basis summary'); pg.click('[data-nl="2"]'); ok([num(pg, 'utf8'), num(pg, 'euckr'), num(pg, 'utf16'), txt(pg, '#nlNow')] == ['13', '7', '14', '줄바꿈은 2바이트로 셈'], 'byte: 줄바꿈 2바이트(UTF-16은 4)')
        pg.click('.basis summary'); pg.mouse.move(1360, 400); shot(pg, 'ko-byte')
        c.close()

        c = ctx(path='/ko/wongoji/'); pg = open_page(c, '/ko/wongoji/'); pg.wait_for_timeout(400)
        ok(pg.locator('#sheet text.ghost').count() > 5, '원고지: 빈 장에 안내 글자')
        pg.fill('#text', '\n'.join(['가'] * 11))
        ok([num(pg, 'laid'), num(pg, 'sheets'), num(pg, 'rowsUsed'), num(pg, 'lastRows'), txt(pg, '#pageNo')] == ['2', '1', '11', '1', '1 / 2'], f'원고지: 한 글자 줄 11개 = 칸 2장·환산 1장 {[num(pg, "laid"), num(pg, "sheets"), num(pg, "rowsUsed"), num(pg, "lastRows"), txt(pg, "#pageNo")]}')
        pg.click('#next'); ok(txt(pg, '#pageNo') == '2 / 2' and txt(pg, '#sheetNo') == 'No. 2' and pg.evaluate('[...document.querySelectorAll("#sheet text")].filter(t => t.textContent).length') == 1, '원고지: 다음 장')
        pg.click('[data-act="clear"]'); pg.click('[data-act="sample"]'); pg.wait_for_timeout(250)
        ok(pg.evaluate('(() => { const l = LC.wongoji.layout(document.querySelector("#text").value); const t = [...document.querySelectorAll("#sheet text")].map(x => x.textContent || " ").slice(0, 20).join(""); return t === l.rows[0].map(c => c.t).join("").padEnd(20, " "); })()'), '원고지: 첫 줄 칸 = 로직이 놓은 칸')
        ok('원고지 쓰기 규칙과 다를 수 있어요' in txt(pg, '.sheet-note'), '원고지: 규칙 안내 문구')
        pg.mouse.move(1360, 400); shot(pg, 'ko-wongoji')
        if SHOTS:
            pg.emulate_media(media='print'); pg.wait_for_timeout(200); pg.screenshot(path=f'{SHOTS}/final-print-wongoji.png', full_page=True)
            ok(pg.evaluate('["header.top","footer.foot",".ad-wrap",".bar"].every(s => [...document.querySelectorAll(s)].every(e => getComputedStyle(e).display === "none"))'), '인쇄: 머리·꼬리·광고 자리·단추 줄이 숨는다')
            pg.emulate_media(media='screen')
        c.close()
        c = ctx(390, 844, True, path='/ko/wongoji/'); pg = open_page(c, '/ko/wongoji/'); pg.evaluate('document.querySelector("[data-act=sample]").click()'); pg.wait_for_timeout(300)
        ok(pg.evaluate('document.querySelector("#sheet").getBoundingClientRect().width') > 300, '원고지: 휴대폰에서 한 장이 통째로 줄어 보인다')
        pg.evaluate('document.querySelector(".sheet").scrollIntoView()'); shot(pg, 'ko-wongoji-mobile'); c.close()

        c = ctx(path='/ko/jasoseo/'); pg = open_page(c, '/ko/jasoseo/'); pg.wait_for_timeout(400)
        pg.on('dialog', lambda d: d.accept())
        ok(pg.locator('.q').count() == 1 and not pg.is_checked('#save') and pg.evaluate('localStorage.getItem("kk.jasoseo")') is None, '자소서: 처음엔 문항 하나, 저장 꺼짐')
        pg.fill('.q .q-title', '지원 동기'); pg.fill('.q .q-goal', '10'); pg.fill('.q textarea', '가 나\n다')
        ok([txt(pg, '.q .q-n'), txt(pg, '.q .left'), txt(pg, '#qTotal'), pg.locator('.q .cells i.on').count()] == ['5', '5자 남았어요', '5', 12], f'자소서: 문항 세기 {[txt(pg, ".q .q-n"), txt(pg, ".q .left"), txt(pg, "#qTotal")]}')
        pg.select_option('.q .q-basis', 'utf8'); ok([txt(pg, '.q .q-n'), txt(pg, '.q .q-u'), txt(pg, '.q .left')] == ['11', '바이트', '1바이트 넘었어요'], '자소서: 바이트 기준')
        pg.select_option('.q .q-basis', 'nospace'); ok(txt(pg, '.q .q-n') == '3', '자소서: 공백 제외')
        pg.click('#qAdd'); ok(pg.locator('.q').count() == 2 and txt(pg, '#qCount') == '2' and txt(pg, '.q:nth-child(2) .q-no') == '2', '자소서: 문항 추가')
        pg.fill('.q:nth-child(2) textarea', '둘째 문항')
        pg.wait_for_timeout(500); ok(pg.evaluate('localStorage.getItem("kk.jasoseo")') is None, '자소서: 스위치를 켜기 전에는 저장하지 않는다')
        pg.check('#save'); pg.wait_for_timeout(500)
        ok('지원 동기' in (pg.evaluate('localStorage.getItem("kk.jasoseo")') or '') and pg.is_visible('#wipe'), '자소서: 켜면 이 기기에 저장')
        shot(pg, 'ko-jasoseo')
        pg.reload(); pg.wait_for_timeout(500)
        ok(pg.locator('.q').count() == 2 and pg.input_value('.q .q-title') == '지원 동기' and pg.input_value('.q:nth-child(2) textarea') == '둘째 문항' and pg.is_checked('#save'), '자소서: 다시 열면 그대로')
        pg.click('.q:nth-child(2) .q-del'); ok(pg.locator('.q').count() == 1, '자소서: 문항 지우기')
        pg.click('#wipe'); pg.wait_for_timeout(200)
        ok(pg.evaluate('localStorage.getItem("kk.jasoseo")') is None and pg.evaluate('localStorage.getItem("kk.jasoseo.on")') is None and pg.input_value('.q textarea') == '' and not pg.is_checked('#save'), '자소서: 저장한 글 지우기')
        c.close()

        # ── 5. 글·404·광고 미리보기·CP949 대조 ──
        c = ctx(path='/ko/guide/'); pg = open_page(c, '/ko/guide/geulja-su-dareun-iyu/'); pg.wait_for_timeout(500); shot(pg, 'article-ko-desktop', full=True); c.close()
        c = ctx(390, 844, True, path='/'); pg = open_page(c, '/guide/why-161-characters-is-two-sms/'); pg.wait_for_timeout(500)
        ok(pg.evaluate('[...document.querySelectorAll(".prose table")].every(t => t.parentElement.classList.contains("tbl"))'), '글: 표는 옆으로 밀리는 틀 안에')
        shot(pg, 'article-en-mobile', full=True); c.close()
        c = ctx(path='/'); pg = open_page(c, '/nope/'); pg.wait_for_timeout(300); shot(pg, '404'); c.close()
        for path in ('/ko/', '/sms/', '/guide/how-x-counts-characters/'):
            c = ctx(path=path); pg = open_page(c, path + '?adpreview'); pg.wait_for_timeout(500)
            gap = pg.evaluate('(() => { const a = document.querySelector(".ad-wrap[data-slot=mid] .ad-slot"); const t = document.querySelector(".tool, .art"); const btns = [...document.querySelectorAll("button, textarea, input, select, a.btn")].filter(e => e.offsetParent); const ar = a.getBoundingClientRect(); let near = 1e9; for (const b of btns) { const r = b.getBoundingClientRect(); const d = r.bottom <= ar.top ? ar.top - r.bottom : r.top >= ar.bottom ? r.top - ar.bottom : 0; near = Math.min(near, d); } return [Math.round(near), a.textContent, Math.round(ar.height)]; })()')
            ok(gap[0] >= (150 if path != '/guide/how-x-counts-characters/' else 40), f'{path}: 광고 자리와 가장 가까운 단추 사이 {gap[0]}px')
            ok(gap[1] in ('광고 자리', 'Ad slot') and gap[2] >= 250, f'{path}: 미리보기 상자 글자·높이 {gap}')
            if path == '/ko/':
                pg.evaluate('document.querySelector(".ad-wrap").scrollIntoView({block:"center"})'); shot(pg, 'adpreview')
            c.close()
        c = ctx(path='/ko/'); pg = open_page(c, '/ko/'); pg.wait_for_timeout(300)
        diff = pg.evaluate('''(() => { const dec = new TextDecoder('euc-kr', {fatal:true}); const set = new Uint8Array(65536); let n = 0;
          for (let a=0x81;a<=0xFE;a++) for (let c=0x41;c<=0xFE;c++) { try { const s = dec.decode(new Uint8Array([a,c])); if (s.length===1) { set[s.charCodeAt(0)] = 1; } } catch(e){} }
          const d = []; for (let c=0x80;c<65536;c++) { if (c>=0xD800&&c<=0xDFFF) continue; if (set[c]) n++; const mine = LC.analyze(String.fromCharCode(c)).bytes.euckr.bytes===2?1:0; if (mine!==set[c]) d.push(c); } return [n, d.length]; })()''')
        ok(diff == [17048, 0], f"CP949 표 = 브라우저 TextDecoder('euc-kr') 17,048자, 차이 0 → {diff}")
        t = pg.evaluate('(() => { const s = "자기소개서는 지원자가 어떤 사람인지 보여 주는 글이에요. ".repeat(40000).slice(0, 1e6); const t0 = performance.now(); LC.analyze(s, {segment:false}); const a = performance.now() - t0; const t1 = performance.now(); LC.analyze(s, {locale:"ko"}); return [Math.round(a), Math.round(performance.now() - t1)]; })()')
        notes.append(f'브라우저에서 100만 자: 빠른 세기 {t[0]}ms, 전부 {t[1]}ms')
        ok(t[0] < 600, f'100만 자 빠른 세기 {t[0]}ms')
        c.close()
        b.close()

    print(f'{"실패" if fails else "통과"}  화면 확인: {passed}개 통과' + (f', {len(fails)}개 실패' if fails else ''))
    for n in notes:
        print('   ·', n)
    for m in fails[:50]:
        print('   -', m)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
