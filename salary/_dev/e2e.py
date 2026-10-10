#!/usr/bin/env python3
"""화면 확인(Playwright): 먼저 `node salary/_dev/serve.mjs` 를 띄우고  python3 -B salary/_dev/e2e.py [스크린샷 폴더]
   묶음만 골라 돌리기: SEC=1,3 python3 -B salary/_dev/e2e.py
   1 모든 페이지(오류·그림·가로 스크롤·화면 밀림·404·언어 띠) · 2 실수령액(한국어) · 3 실수령액(영어)·기준 기간 경고·휴대폰 ·
   4 퇴직금 · 5 시급·주휴수당 · 6 실업급여·연차 · 7 연봉 표 · 8 글·광고 자리·인쇄·어두운 화면·동작 줄이기·연출 ·
   9 제3자 평가에서 고친 것(나이 조건, 출처 링크 목적지, 금액 칸 단위, 입력 유지, 해가 바뀐 뒤, 404, 오류 알림, 누르는 곳 44px)

화면의 숫자는 그 자리에서 로직(window.PAY)으로 다시 구한 값, 그리고 시험 파일에 손으로 적어 둔 값과 견준다.
광고 요청은 정규식으로 막는다(로컬이지만 습관으로). 브라우저는 하나만 띄운다. 기계가 바쁠 때를 생각해 기다리는 시간은 넉넉히 잡았다.
"""
import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.dont_write_bytecode = True
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://salary.lumenlab.page'
BASE = os.environ.get('BASE', 'http://localhost:8446')
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
PRE = os.environ.get('PRE', 'final3-')
SEC = {int(x) for x in os.environ.get('SEC', '').split(',') if x.strip()}
ADS = re.compile(r'googlesyndication|doubleclick|adservice|fundingchoices')
HANGUL = "(() => { const re=/[\\u1100-\\u11FF\\u3130-\\u318F\\uAC00-\\uD7A3]/; const out=[]; const w=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ const p=n.parentElement; if(!p||p.closest('script,style,template,[lang=ko]')) continue; if(re.test(n.nodeValue)) out.push(n.nodeValue.trim().slice(0,30)); } document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(e=>{ if(e.closest('[lang=ko]')) return; for (const a of ['placeholder','aria-label','title']) if (re.test(e.getAttribute(a)||'')) out.push(a+':'+e.getAttribute(a)); }); return out; })()"
# 누르는 곳(단추·링크·고르는 칸·체크 줄·연봉 표의 줄) 가운데 44px보다 작은 것. 문장 속 링크와 표 안의 연봉 글자(줄 전체가 눌린다)는 뺀다
SMALL = '''() => [...document.querySelectorAll("button, a, select, input, summary, label.chk, .pay-t tbody tr")].filter(e => {
  const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
  if (e.closest(".prose p, .prose li, .prose blockquote, .sr, .skip, .lead, .note, .stick") || (e.tagName === "INPUT" && e.type === "checkbox")) return false;
  if (e.tagName === "A" && e.closest(".pay-t")) return false;
  return r.height < 43.5 || r.width < 43.5; }).map(e => (e.id || e.className || e.tagName) + ":" + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height) + ":" + (e.textContent || "").trim().slice(0, 12))'''
# 글자가 제 상자 밖으로 넘친 누르는 곳(최소 폭을 준 단추가 글자보다 좁게 줄어든 경우를 잡는다)
SPILL = '''() => [...document.querySelectorAll("button, a, summary, label.chk")].filter(e => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0) || e.closest(".sr, .skip, .stick")) return false;
  const g = document.createRange(); g.selectNodeContents(e); const q = g.getBoundingClientRect(); return q.width > 0 && (q.left < r.left - 1.5 || q.right > r.right + 1.5); }).map(e => (e.id || e.className || e.tagName) + ":" + (e.textContent || "").trim().slice(0, 14))'''
CLS_INIT = "window.__cls=0; new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});"
passed, fails, notes = 0, [], []


def ok(cond, msg):
    global passed
    if cond:
        passed += 1
    else:
        fails.append(msg)
    return cond


def want(n):
    return not SEC or n in SEC


def main():
    paths = [u.text.replace(SITE, '') for u in ET.parse(ROOT / 'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy') or ''
    args = ['--proxy-bypass-list=localhost;127.0.0.1']
    if proxy:
        args.append('--proxy-server=https=' + proxy.replace('http://', ''))
    exe = sorted(Path('/opt/pw-browsers').glob('chromium-*/chrome-linux/chrome'))
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=str(exe[0]) if exe else None, args=args)

        DOCS = re.compile('^' + re.escape(BASE) + r'/(?!assets/)[^?#]*(/|[^./?#]*)([?#].*)?$')

        def as_swap(route):
            if route.request.resource_type != 'document':
                return route.fallback()
            r = route.fetch()
            route.fulfill(response=r, body=r.text().replace('font-display:optional', 'font-display:swap'))

        def ctx(w=1366, h=768, mobile=False, lang=None, dark=False, reduce=False, path='/', real_font=False):
            # real_font=False: 글꼴을 받아 둔 방문자가 보는 모습(Pretendard 조각)으로 보려고 첫 HTML 안 @font-face 의 표시 방식만 swap으로 바꿔 준다(스크린샷용).
            # real_font=True : 실제 CSS 그대로(처음 온 방문자). 화면 밀림은 이쪽으로 잰다.
            c = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile,
                              locale=lang or ('en-US' if path.startswith('/en/') else 'ko-KR'), color_scheme='dark' if dark else 'light',
                              reduced_motion='reduce' if reduce else 'no-preference', ignore_https_errors=True)
            c.set_default_timeout(60000)
            c.route(ADS, lambda r: r.abort())
            if not real_font:
                c.route(DOCS, as_swap)
            return c

        def open_page(c, path, errs=None, clock=None):
            pg = c.new_page()
            if errs is not None:
                pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
                pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
            pg.add_init_script(CLS_INIT)
            if clock:
                pg.clock.set_fixed_time(clock)
            pg.goto(BASE + path, wait_until='load')
            return pg

        def shot(pg, name, full=False):
            if SHOTS:
                pg.evaluate('document.activeElement && document.activeElement.blur()')
                pg.wait_for_timeout(350)
                pg.screenshot(path=f'{SHOTS}/{PRE}{name}.png', full_page=full)

        txt = lambda pg, sel: re.sub(r'\s+', ' ', pg.inner_text(sel)).strip()
        net = lambda pg: pg.eval_on_selector('#slip [data-net]', 'e => e.textContent')
        f = lambda n: f'{n:,}'
        hscroll = lambda pg: pg.evaluate('document.documentElement.scrollWidth - innerWidth')

        def pay(pg, expr):
            """페이지 안의 로직으로 다시 계산한다(화면 숫자와 견줄 값)."""
            return pg.evaluate(f'(() => {{ const P = window.PAY || window.PayCore(window.PAY_DATA, window.PAY_GANI || null); return {expr}; }})()')

        def typ(pg, sel, value):
            pg.fill(sel, value)

        # ── 1. 모든 페이지: 오류·그림·가로 스크롤·화면 밀림·표 ──
        if want(1):
            worst = (0, '')
            for path in paths + ['/404-nope']:
                for (w, h, mobile) in ((1366, 768, False), (390, 844, True)):
                    errs = []
                    c = ctx(w, h, mobile, path=path, real_font=True)
                    pg = open_page(c, path, errs)
                    pg.wait_for_timeout(1200)
                    if path == '/404-nope':
                        errs[:] = [e for e in errs if '404' not in e]
                    cls = pg.evaluate('window.__cls')
                    if cls > 0.02:   # 기계가 바쁠 때 한 번 더 재서 가린다
                        pg.reload(wait_until='load'); pg.wait_for_timeout(2500); cls = pg.evaluate('window.__cls')
                    if cls > worst[0]:
                        worst = (cls, f'{path} {w}px')
                    ok(cls <= 0.02, f'{path} {w}px: 화면 밀림 {cls:.3f} > 0.02')
                    ok(not errs, f'{path} {w}px: 콘솔 오류 {errs[:2]}')
                    ok(pg.evaluate('[...document.images].filter(i => i.complete && i.naturalWidth === 0).length') == 0, f'{path}: 깨진 그림')
                    ok(hscroll(pg) <= 0, f'{path} {w}px: 가로 스크롤 {hscroll(pg)}')
                    ok(pg.evaluate('!!document.querySelector("h1") && document.querySelector("h1").getBoundingClientRect().height > 0'), f'{path}: h1이 안 보임')
                    if mobile:
                        wide = pg.evaluate('[...document.querySelectorAll(".tbl.wide")].map(t => { const h = t.previousElementSibling; return [t.scrollWidth > t.clientWidth + 1, !!h && h.classList.contains("tbl-hint") && getComputedStyle(h).display !== "none"]; })')
                        ok(all(a and h_ for a, h_ in wide), f'{path} 390px: 넓은 표는 옆으로 밀리고 밀어 보라는 한 줄이 보인다 {wide}')
                        if path in ('/', '/en/'):
                            pg.click('#optsBtn'); pg.wait_for_timeout(150)
                        if path.endswith('severance/'):
                            pg.click('#more summary'); pg.wait_for_timeout(150)
                        small = pg.evaluate(SMALL)
                        ok(not small, f'{path} 390px: 44px보다 작은 누르는 곳 {small[:4]}')
                    c.close()
                # 좁은 화면: 휴대폰 흉내(320)와, 흉내 없이 창 폭만 줄인 것(320·360·375) 둘 다
                for (w, mobile) in ((320, True), (320, False), (360, False), (375, False)):
                    c = ctx(w, 640, mobile, path=path)
                    pg = open_page(c, path)
                    pg.wait_for_timeout(350)
                    ok(hscroll(pg) <= 0, f'{path} {w}px{"" if mobile else "(창 폭만)"}: 가로 스크롤 {hscroll(pg)}')
                    over = pg.evaluate('[...document.querySelectorAll(".tbl:not(.wide):not(.pay)")].filter(t => t.scrollWidth > t.clientWidth + 1).length')
                    ok(over == 0, f'{path} {w}px: 넓은 표 표시가 없는 표 {over}개가 넘침')
                    if w in (320, 360):
                        spill = pg.evaluate(SPILL)
                        ok(spill == [], f'{path} {w}px: 글자가 상자 밖으로 넘친 누르는 곳 {spill[:4]}')
                    if path in ('/', '/en/') and w == 320 and mobile:
                        pg.fill('#amt', '1억 2,000만' if path == '/' else '120,000,000'); pg.click('#optsBtn'); pg.click('#slip .how'); pg.click('#slip [data-act="period"]'); pg.wait_for_timeout(300)
                        ok(hscroll(pg) <= 0, f'{path} 320px: 쓰는 중(조건·계산식·2027 펼침) 가로 스크롤 {hscroll(pg)}')
                        clipped = pg.evaluate('[...document.querySelectorAll("#slip .num, #slip .tag-hold, #slip .chg-b")].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 0.5 || r.left < -0.5; }).length')
                        ok(clipped == 0, f'{path} 320px: 명세서의 숫자·꼬리표 {clipped}개가 화면 밖으로 나감')
                        if SHOTS and path == '/':
                            shot(pg, 'ko-home-320-used', full=True)
                    c.close()
            c = ctx(320, 640, True, path='/annual-leave/'); pg = open_page(c, '/annual-leave/'); pg.wait_for_timeout(400)
            nav = pg.evaluate('(() => { const n = document.querySelector(".tools"), c = n.querySelector("[aria-current]").getBoundingClientRect(); return [n.classList.contains("of"), n.scrollWidth > n.clientWidth, c.left >= 0 && c.right <= innerWidth, getComputedStyle(n).maskImage !== "none" || getComputedStyle(n).webkitMaskImage !== "none"]; })()')
            ok(nav == [True, True, True, True], f'320px 메뉴: 넘치면 끝을 흐리게 하고 지금 페이지가 보이게 밀어 둔다 {nav}')
            c.close()
            c = ctx(390, 844, True, path='/'); pg = open_page(c, '/'); pg.wait_for_timeout(400)
            ok(not pg.evaluate('document.querySelector(".tools").classList.contains("of")') and pg.locator('.tools a:visible').count() == 6, '390px 메뉴: 여섯 개가 한 줄에 다 보인다(넘침 표시 없음)')
            c.close()
            notes.append(f'화면 밀림 가장 큰 값 {worst[0]:.4f} ({worst[1] or "모두 0"})')
            # 브라우저 언어가 페이지와 다를 때(안내 띠가 뜸)도 밀림이 없어야 한다
            for path, lang in (('/', 'en-US'), ('/en/', 'ko-KR'), ('/unemployment/', 'en-US')):
                c = ctx(390, 844, True, lang=lang, path=path, real_font=True)
                pg = open_page(c, path)
                pg.wait_for_timeout(1200)
                ok(pg.locator('.langbar').count() == 1, f'{path}: 다른 언어 안내 띠가 안 뜸')
                ok(pg.evaluate('window.__cls') <= 0.02, f'{path}: 안내 띠가 뜰 때 화면 밀림 {pg.evaluate("window.__cls"):.3f}')
                ok(pg.evaluate('getComputedStyle(document.querySelector(".langbar")).position') == 'absolute', '안내 띠는 겹쳐 띄운다')
                ok(pg.get_attribute('.langbar a', 'href') == {'/': '/en/', '/en/': '/', '/unemployment/': '/en/'}[path], f'{path}: 안내 띠 링크')
                if path == '/en/':
                    ok(pg.evaluate(HANGUL) == [], f'/en/ 안내 띠 한글이 lang="ko" 밖: {pg.evaluate(HANGUL)[:2]}')
                    if SHOTS:
                        shot(pg, 'en-home-langbar-mobile')
                pg.click('.langbar button')
                ok(pg.locator('.langbar').count() == 0 and pg.evaluate('localStorage.getItem("tk.lang")') is not None, '안내 띠 닫기')
                ok(pg.evaluate('Object.keys(localStorage).join(",")') == 'tk.lang', f'{path}: 저장 키는 tk.lang 하나')
                pg.reload(wait_until='load'); pg.wait_for_timeout(500)
                ok(pg.locator('.langbar').count() == 0, f'{path}: 닫은 띠는 다시 안 뜬다')
                c.close()
            c = ctx(path='/'); pg = open_page(c, '/'); pg.wait_for_timeout(500)
            ok(pg.locator('.langbar').count() == 0, '같은 언어면 안내 띠가 없다')
            pg.fill('#amt', '5,000만'); pg.wait_for_timeout(900)
            keys = pg.evaluate('[Object.keys(localStorage).join(","), Object.keys(sessionStorage).join(","), document.cookie]')
            ok(keys == ['', 'tk.in', ''] and pg.evaluate('JSON.parse(sessionStorage.getItem("tk.in")).net.text') == '5,000만', f'입력은 이 탭의 임시 저장소(tk.in)에만 둔다. 쿠키·localStorage 는 안 쓴다 {keys}')
            pg.fill('#amt', ''); pg.wait_for_timeout(300)
            ok(pg.evaluate('Object.keys(sessionStorage).length') == 0, '칸을 비워 예시로 돌아가면 저장한 것도 지운다')
            c.close()
            r = b.new_context().request.get(BASE + '/404-nope')
            ok(r.status == 404 and 'adsbygoogle' not in r.text(), f'없는 주소가 404가 아님({r.status})')
            ok(b.new_context().request.get(BASE + '/_dev/build.py').status == 404 and b.new_context().request.get(BASE + '/tests/run.mjs').status == 404, '_dev·tests 가 열림')

        # ── 2. 실수령액(한국어) ──
        if want(2):
            c = ctx(path='/'); errs = []; pg = open_page(c, '/', errs); pg.wait_for_timeout(600)
            shot(pg, 'ko-home-desktop')
            ok(pg.evaluate('document.getElementById("slip").classList.contains("is-ex")') and txt(pg, '#slip .tag-ex') == '예시 · 연봉 4,000만 원', 'ko: 빈 상태는 예시(꼬리표가 숫자 곁에)')
            ok(net(pg) == '2,935,813', f'ko: 예시 실수령액 = {net(pg)}')
            tag = pg.evaluate('(() => { const t = document.querySelector("#slip .tag-ex").getBoundingClientRect(), n = document.querySelector("#slip [data-net]").getBoundingClientRect(); return n.top - t.bottom; })()')
            ok(0 <= tag <= 24, f'ko: 예시 꼬리표가 숫자 바로 위 {tag:.0f}px')
            ok(pg.evaluate('getComputedStyle(document.querySelector("#slip .dbl")).color') != pg.evaluate('(() => { const d = document.createElement("i"); d.style.color = "var(--main)"; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; })()'), 'ko: 예시 숫자는 강조색이 아니다')
            ok(pg.locator('#slip .dbl.draw').count() == 0, '연출 1: 처음 열 때는 밑줄을 긋지 않는다')
            ok(txt(pg, '#read') == '숫자만 쓰면 만 원으로 읽어요. 4000, 4천, 1억 2천처럼 써도 돼요.' and txt(pg, '#u-amt') == '만 원', f'ko: 빈 칸 아래 안내 한 줄과 칸 옆 단위 = {txt(pg, "#read")} / {txt(pg, "#u-amt")}')
            ok(all(t.endswith('원') for t in pg.eval_on_selector_all('#slip .ded .am, #slip .ln .num', 'els => els.map(e => e.textContent)')), 'ko: 명세서의 모든 금액에 원')
            ok(pg.evaluate('getComputedStyle(document.querySelector("#slip .ded .am")).color') == pg.evaluate('getComputedStyle(document.querySelector("#slip .ln.pay .num")).color'), 'ko: 떼는 돈은 강조색으로 칠하지 않는다')
            # 첫 화면(1366×768)에 입력칸·답·앞뒤 금액이 다 보인다
            pos = pg.evaluate('({ amt: document.getElementById("amt").getBoundingClientRect().bottom, sum: document.querySelector("#slip .sum").getBoundingClientRect().bottom, slipTop: document.getElementById("slip").getBoundingClientRect().top, cmp: document.querySelector("#cmp table").getBoundingClientRect().top, tot: document.querySelector("#slip .tot").getBoundingClientRect().bottom })')
            ok(pos['sum'] < 330 and pos['amt'] < 330 and pos['cmp'] < 600 and pos['tot'] < 768, f'ko 1366×768: 답이 종이 위쪽({pos["sum"]:.0f}), 합계 줄({pos["tot"]:.0f}), 앞뒤 금액 표({pos["cmp"]:.0f})가 첫 화면에')
            # 금액 읽기
            pg.focus('#amt'); pg.keyboard.type('5,500만', delay=40)
            ok(pg.locator('#slip .dbl.draw').count() == 0, '연출 1: 글자를 치는 중에는 긋지 않는다')
            ok(txt(pg, '#read') == '55,000,000원(5,500만 원)으로 읽었어요', f'ko: 읽은 값 = {txt(pg, "#read")}')
            ok(net(pg) == '3,886,073' and net(pg) == f(pay(pg, 'P.netPay({amount:55000000,basis:"annual"}).net')), f'ko: 5,500만 = {net(pg)}')
            ok(not pg.evaluate('document.getElementById("slip").classList.contains("is-ex")') and pg.locator('#slip .tag-ex').count() == 0, 'ko: 내 값을 넣으면 예시 꼬리표가 사라진다')
            pg.wait_for_timeout(900)
            ok(pg.locator('#slip .dbl.draw').count() == 1 and pg.evaluate('getComputedStyle(document.querySelector("#slip .dbl"), "::before").animationName') == 'tk-draw', '연출 1: 멈춘 뒤 한 번 긋는다')
            ok(pg.evaluate('getComputedStyle(document.querySelector("#slip .dbl"), "::before").pointerEvents') == 'none', '연출 1: 터치를 통과시킨다')
            if SHOTS:
                pg.screenshot(path=f'{SHOTS}/{PRE}fx-underline.png', clip={'x': 660, 'y': 140, 'width': 560, 'height': 150})
            pg.wait_for_timeout(700)
            ok(pg.evaluate('document.getAnimations().filter(a => a.playState === "running").length') == 0, '연출 1: 끝나면 도는 움직임이 없다')
            before = pg.evaluate('document.querySelector("#slip .dbl").getBoundingClientRect().toJSON()')
            pg.click('#optsBtn'); pg.wait_for_timeout(300)
            ok(pg.evaluate('document.getAnimations().filter(a => a.playState === "running" && a.animationName === "tk-draw").length') == 0, '연출 1: 조건 칸을 펼치기만 해서는 다시 긋지 않는다')
            ok(txt(pg, '#optsGo') == '조건 접기' and pg.is_visible('#optsBody'), 'ko: 조건 바꾸기 → 펼침')
            pg.click('#optsBtn')
            for text, val, read in (('4,000만 원', 40000000, '40,000,000원(4,000만 원)으로 읽었어요'), ('40000000', 40000000, '40,000,000원(4,000만 원)으로 읽었어요. 큰 수는 원 단위로 읽어요.'),
                                    ('4천', 40000000, '4,000만 원(40,000,000원)으로 읽었어요'), ('1억 2천', 120000000, '1억 2,000만 원(120,000,000원)으로 읽었어요'),
                                    ('300', 3000000, '300만 원(3,000,000원)으로 읽었어요'), ('３５００만', 35000000, '35,000,000원(3,500만 원)으로 읽었어요')):
                typ(pg, '#amt', text)
                ok(txt(pg, '#read') == read, f'ko: "{text}" → {txt(pg, "#read")}')
                ok(net(pg) == f(pay(pg, f'P.netPay({{amount:{val},basis:"annual"}}).net')), f'ko: "{text}" 실수령액 {net(pg)}')
            for text, msg in (('abc', '금액을 읽지 못했어요'), ('-500', '0보다 작은 금액은 계산하지 않아요'), ('0', '0보다 큰 금액을 넣어 주세요'), ('99999억', '넘는 금액은 계산하지 않아요')):
                typ(pg, '#amt', text)
                ok(msg in txt(pg, '#read') and 'err' in pg.get_attribute('#read', 'class') and net(pg) == '2,935,813' and pg.locator('#slip .tag-ex').count() == 1, f'ko: "{text}" → 알리고 예시로({txt(pg, "#read")[:30]})')
            # 연봉 ↔ 월급: 같은 돈으로 바꿔 주고, 고치지 않고 돌아오면 처음 글자 그대로
            typ(pg, '#amt', '4,000만'); pg.click('#kind [data-v="monthly"]')
            ok(pg.input_value('#amt') == '3,333,333원' and net(pg) == '2,935,813' and txt(pg, '#read') == '3,333,333원(333만 3,333원)으로 읽었어요', f'ko: 월급으로 바꾸면 3,333,333원 = {pg.input_value("#amt")} / {net(pg)}')
            pg.click('#optsBtn')
            ok(pg.get_attribute('#amt', 'placeholder') == '예: 300' and pg.locator('#quick button').first.inner_text() == '220만' and pg.is_hidden('[data-sev]'), f'ko: 월급일 때 자리 글자·바로 넣기 = {pg.get_attribute("#amt", "placeholder")} / {pg.locator("#quick button").first.inner_text()}')
            pg.click('#optsBtn')
            pg.click('#kind [data-v="annual"]')
            ok(pg.input_value('#amt') == '4,000만' and net(pg) == '2,935,813', f'ko: 연봉으로 돌아오면 처음 쓴 글자 = {pg.input_value("#amt")}')
            pg.click('#kind [data-v="monthly"]'); typ(pg, '#amt', '300만'); pg.click('#kind [data-v="annual"]')
            ok(pg.input_value('#amt') == '3,600만' and net(pg) == f(pay(pg, 'P.netPay({amount:3000000,basis:"monthly"}).net')) == '2,665,440', f'ko: 월급 300만 → 연봉 3,600만 = {pg.input_value("#amt")} / {net(pg)}')
            typ(pg, '#amt', ''); pg.click('#kind [data-v="monthly"]')
            ok(txt(pg, '#slip .tag-ex') == '예시 · 월급 300만 원' and net(pg) == '2,665,440', 'ko: 빈 칸에서 월급으로 바꾸면 월급 예시')
            pg.click('#kind [data-v="annual"]')
            pg.click('#quick button >> nth=2')
            ok(pg.input_value('#amt') == '5,000만' and net(pg) == '3,571,586', f'ko: 바로 넣기 5,000만 = {net(pg)}')
            # 조건
            pg.click('#optsBtn')
            pg.click('[data-k="family"] button >> nth=1'); pg.click('[data-k="family"] button >> nth=1'); pg.click('[data-k="children"] button >> nth=1')
            ok(net(pg) == f(pay(pg, 'P.netPay({amount:50000000,basis:"annual",family:3,children:1}).net')) and txt(pg, '#optsSum') == '비과세 20만 원 · 부양가족 3명(자녀 1명)', f'ko: 부양가족 3명·자녀 1명 = {net(pg)} / {txt(pg, "#optsSum")}')
            pg.click('[data-k="children"] button >> nth=1'); pg.click('[data-k="children"] button >> nth=1'); pg.click('[data-k="children"] button >> nth=1')
            ok(txt(pg, '[data-k="children"] output') == '2', 'ko: 자녀는 부양가족 − 1명까지')
            pg.click('[data-k="family"] button >> nth=0'); pg.click('[data-k="family"] button >> nth=0')
            ok(txt(pg, '[data-k="family"] output') == '1' and txt(pg, '[data-k="children"] output') == '0', 'ko: 부양가족을 줄이면 자녀도 같이 줄어든다')
            pg.click('[data-k="ratio"] [data-v="80"]')
            ok(net(pg) == f(pay(pg, 'P.netPay({amount:50000000,basis:"annual",ratio:80}).net')) and '세금을 덜 떼도록 신청(80%)' in txt(pg, '#optsSum'), 'ko: 80%')
            pg.click('[data-k="ratio"] [data-v="100"]')
            typ(pg, '#o-nontax', '0'); ok(net(pg) == f(pay(pg, 'P.netPay({amount:50000000,basis:"annual",nontax:0}).net')) and '비과세 없음' in txt(pg, '#optsSum'), 'ko: 비과세 0')
            typ(pg, '#o-nontax', '200000')
            ok(txt(pg, '#r-o-nontax') == '200,000원(20만 원)으로 읽었어요. 큰 수는 원 단위로 읽어요.' and txt(pg, '#u-o-nontax') == '원', f'ko: 비과세 200000 은 원으로 읽고 알린다 = {txt(pg, "#r-o-nontax")}')
            pg.press('#o-nontax', 'Tab')
            ok(pg.input_value('#o-nontax') == '20' and txt(pg, '#u-o-nontax') == '만 원' and '비과세 20만 원' in txt(pg, '#optsSum'), f'ko: 비과세 칸은 떠날 때 만 원 단위로 정리한다 = {pg.input_value("#o-nontax")} {txt(pg, "#u-o-nontax")}')
            pg.check('#o-sev')
            ok(net(pg) == f(pay(pg, 'P.netPay({amount:50000000,basis:"annual",includeSeverance:true}).net')) and '13으로 나눔' in txt(pg, '#optsSum') and txt(pg, '#slip .ln.pay .num') == '3,846,153원', f'ko: 퇴직금 포함 연봉 = {txt(pg, "#slip .ln.pay .num")}')
            pg.uncheck('#o-sev'); pg.check('#o-age')
            ok(txt(pg, '#slip [data-id="employment"] .am') == '0원' and txt(pg, '#slip [data-id="pension"] .am') == '0원' and pg.is_checked('#o-age60')
               and net(pg) == f(pay(pg, 'P.netPay({amount:50000000,basis:"annual",noEmployment:true,noPension:true}).net')) and '65세 이후 입사(고용보험료 없음)' in txt(pg, '#optsSum') and '만 60세 이상(국민연금 없음)' in txt(pg, '#optsSum'),
               f'ko: 65세 이후 입사 → 고용보험·국민연금 0원(만 60세 이상도 같이 켜진다) = {net(pg)} / {txt(pg, "#optsSum")}')
            pg.uncheck('#o-age'); pg.uncheck('#o-age60')
            # 계산식. 금액 칸에 초점이 있는 채로 명세서 안 단추를 눌러도 눌림이 씹히지 않는다
            pg.focus('#amt'); pg.keyboard.type(' '); pg.wait_for_timeout(100)
            pg.click('#slip .how')
            ex = pg.eval_on_selector_all('#slip .ded .ex', 'els => els.map(e => e.textContent)')
            ok(len(ex) == 6 and ex[0] == '국민연금을 매기는 월 소득 3,966,000원(천 원 미만 버림) × 4.75%' and ex[2].startswith('건강보험료 ') and ex[2].endswith('× 0.9448% ÷ 7.19%') and '간이세액표 3,960,000원 이상 3,980,000원 미만, 부양가족 1명' == ex[4], f'ko: 계산식 6줄 = {ex}')
            ok(pg.get_attribute('#slip .how', 'aria-expanded') == 'true' and txt(pg, '#slip .how') == '계산식 접기' and '10원 미만을 버려요' in txt(pg, '#slip'), 'ko: 계산식 보기 ↔ 접기')
            typ(pg, '#amt', '1억 2,000만')
            ex = pg.eval_on_selector_all('#slip .ded .ex', 'els => els.map(e => e.textContent)')
            ok('(상한 659만 원)' in ex[0] and txt(pg, '#slip [data-id="pension"] .am') == '−313,020원', f'ko: 국민연금 상한 표시 = {ex[0]}')
            typ(pg, '#amt', '3억'); ex = pg.eval_on_selector_all('#slip .ded .ex', 'els => els.map(e => e.textContent)')
            ok('간이세액표 주석의 계산식(월 1,000만 원 초과)' in ex[4], f'ko: 1,000만 원 초과 = {ex[4]}')
            pg.click('#slip .how'); typ(pg, '#amt', '4,000만'); pg.wait_for_timeout(800)
            shot(pg, 'ko-home-settings-desktop')
            pg.click('#optsBtn')
            # 연출 2: 기준 시기를 바꾸면 달라진 줄만 짚는다
            ok(txt(pg, '#slip .nx p') == '2027년 1월부터는 국민연금이 5.0%로 올라 한 달에 7,840원 덜 받아요.' and txt(pg, '#slip .nx .lnk') == '2027년 기준으로 보기', f'ko: 2027 문장 = {txt(pg, "#slip .nx")}')
            ok(pg.evaluate('getComputedStyle(document.querySelector("#slip .nx b")).color') != pg.evaluate('getComputedStyle(document.querySelector("#slip .dbl")).color'), 'ko: 2027 문장은 실수령액과 다른 색')
            ok(pg.locator('#slip .chg').count() == 0, '연출 2: 금액만 바꿀 때는 안 나온다')
            pg.click('#slip [data-act="period"]'); pg.wait_for_timeout(350)
            chg = pg.eval_on_selector_all('#slip .chg', 'els => els.map(e => e.dataset.id + ":" + e.querySelector(".chg-b").textContent)')
            ok(chg == ['pension:+7,840', 'net:−7,840'], f'연출 2: 달라진 줄 = {chg}')
            ok(net(pg) == '2,927,973' and txt(pg, '#slip .asof') == '2027년 1월 기준(예정)' and txt(pg, '#live') == '국민연금 7,840원 늘어요, 실수령액 7,840원 줄어요', f'ko: 2027년 기준 = {net(pg)} / {txt(pg, "#live")}')
            tags = pg.eval_on_selector_all('#slip .ded li', 'els => els.map(e => { const t = e.querySelector(".tag-hold, .tag-st"); return e.dataset.id + ":" + (t ? t.className + ":" + t.textContent : "") })')
            ok(tags == ['pension:tag-st:확정', 'health:tag-st:같은 요율로 의결', 'care:tag-hold:미정 · 2026년 값으로 계산', 'employment:tag-hold:2026년 요율로 계산', 'incomeTax:tag-hold:개정 여부 미정 · 2026년 표로 계산', 'localTax:'], f'ko: 2027년 확정·의결·미정 꼬리표 = {tags}')
            badge = pg.evaluate('(() => { const b = document.querySelector("#slip [data-id=pension] .chg-b").getBoundingClientRect(), a = document.querySelector("#slip [data-id=pension] .am").getBoundingClientRect(), s = document.getElementById("slip").getBoundingClientRect(); return [b.right <= a.left, b.left >= s.left, getComputedStyle(document.querySelector(".chg-b")).pointerEvents]; })()')
            ok(badge == [True, True, 'none'], f'연출 2: 꼬리표가 금액을 가리지 않고 종이 안에 있다 {badge}')
            before_h = pg.evaluate('document.getElementById("slip").getBoundingClientRect().height')
            if SHOTS:
                pg.screenshot(path=f'{SHOTS}/{PRE}fx-changed-lines.png', clip={'x': 660, 'y': 80, 'width': 560, 'height': 690})
            ok(pg.is_enabled('#slip [data-act="period"]'), '연출 2: 나오는 중에도 단추가 눌린다')
            pg.wait_for_timeout(2500)
            ok(pg.locator('#slip .chg').count() == 0 and pg.locator('#slip .chg-b').count() == 0 and pg.evaluate('document.getAnimations().filter(a => a.playState === "running").length') == 0, '연출 2: 2초 뒤 스스로 지우고 그리기가 멈춘다')
            ok(abs(pg.evaluate('document.getElementById("slip").getBoundingClientRect().height') - before_h) < 0.5, '연출 2: 줄의 높이·자리가 바뀌지 않는다')
            ok('2027년 1월(예정) 기준이에요.' in txt(pg, '#slip .nx') and '· 2027년 1월' in txt(pg, '#optsSum'), 'ko: 2027년 기준 안내')
            pg.click('#slip [data-act="period"]'); pg.wait_for_timeout(300)
            ok(net(pg) == '2,935,813' and pg.eval_on_selector_all('#slip .chg', 'els => els.map(e => e.dataset.id + ":" + e.querySelector(".chg-b").textContent)') == ['pension:−7,840', 'net:+7,840'], 'ko: 2026년 10월 기준으로 되돌리기')
            pg.wait_for_timeout(2300)
            # 앞뒤 금액
            rows = pg.eval_on_selector_all('#cmp tbody tr', 'els => els.map(e => [...e.children].map(c => c.textContent.trim()))')
            ok(len(rows) == 7 and rows[3][:2] == ['4,000만 내 금액', '2,935,813원'] and rows[2] == ['3,900만', '2,868,100원', '−67,713'] and rows[4] == ['4,100만', '3,003,546원', '+67,733'], f'ko: 앞뒤 금액 표 = {rows[2:5]}')
            ok(rows[4][1] == f(pay(pg, 'P.netPay({amount:41000000,basis:"annual"}).net')) + '원', 'ko: 앞뒤 금액 = 로직')
            pg.click('#cmp [data-act="step"][data-v="1"]')
            ok(pg.input_value('#amt') == '4,100만' and net(pg) == '3,003,546', f'ko: +100만 = {pg.input_value("#amt")}')
            pg.click('#cmp [data-act="step"][data-v="-1"]'); pg.click('#cmp [data-act="step"][data-v="-1"]')
            ok(pg.input_value('#amt') == '3,900만', 'ko: −100만 두 번')
            pg.click('#cmp tbody tr >> nth=6 >> button')
            ok(pg.input_value('#amt') == '4,200만' and net(pg) == '3,066,300', f'ko: 줄을 누르면 그 연봉으로 = {pg.input_value("#amt")}')
            ok(pg.get_attribute('.cmp-more a', 'href') == '/table/', 'ko: 표 전체 보기 링크')
            pg.click('#kind [data-v="monthly"]'); typ(pg, '#amt', '250만')
            ok(txt(pg, '#cmp h2') == '앞뒤 월급과 견주기' and txt(pg, '#cmp tbody tr >> nth=4 >> th') == '260만' and txt(pg, '#cmp .cmp-step').replace(' ', '') == '−10만+10만', f'ko: 월급일 때 앞뒤 10만 원 = {txt(pg, "#cmp h2")} / {txt(pg, "#cmp tbody tr >> nth=4 >> th")} / {txt(pg, "#cmp .cmp-step")}')
            ok(not errs, f'ko 실수령액: 콘솔 오류 {errs[:2]}')
            c.close()
            # 표에서 넘어온 연봉
            c = ctx(path='/'); pg = open_page(c, '/#a=55000000'); pg.wait_for_timeout(1200)
            ok(pg.input_value('#amt') == '5,500만' and net(pg) == '3,886,073' and pg.locator('#slip .dbl.draw').count() == 0, f'ko: /#a=55000000 = {pg.input_value("#amt")} / {net(pg)}(열 때는 밑줄을 긋지 않는다)')
            ok(pg.evaluate('location.hash') == '' and pg.evaluate('location.pathname') == '/', f'ko: #a= 는 읽은 뒤 주소에서 지운다 = {pg.evaluate("location.href")}')
            pg.fill('#amt', '7,777만'); pg.wait_for_timeout(200)
            ok(pg.evaluate('location.hash') == '' and net(pg) == f(pay(pg, 'P.netPay({amount:77770000,basis:"annual"}).net')), 'ko: 금액을 바꿔도 옛 금액이 주소에 남지 않는다')
            shot(pg, 'ko-home-used-desktop')
            c.close()

        # ── 3. 실수령액(영어)·기준 기간 경고·휴대폰 ──
        if want(3):
            c = ctx(path='/en/'); errs = []; pg = open_page(c, '/en/', errs); pg.wait_for_timeout(600)
            shot(pg, 'en-home-desktop')
            ok(net(pg) == '2,935,813' and txt(pg, '#slip .tag-ex') == 'Example · ₩40,000,000 a year' and txt(pg, '#slip .asof') == 'Rules as of October 2026', f'en: 예시 = {net(pg)} / {txt(pg, "#slip .tag-ex")}')
            ok(pg.evaluate(HANGUL) == [], f'en: lang="ko" 밖 한글 {pg.evaluate(HANGUL)[:3]}')
            ko = pg.eval_on_selector_all('#slip .ded li .ko', 'els => els.map(e => e.textContent + "|" + e.lang)')
            ok(ko == ['국민연금|ko', '건강보험|ko', '장기요양보험|ko', '고용보험|ko', '소득세|ko', '지방소득세|ko'], f'en: 줄마다 한국어 이름(lang=ko) = {ko}')
            ok(txt(pg, '#u-amt') == 'won' and 'Amounts are in won, read as typed.' in txt(pg, '#read'), f'en: 칸 옆 단위 won, 원 그대로 읽는다는 안내 = {txt(pg, "#read")}')
            for text, small in (('3500', '₩3,500'), ('40,000', '₩40,000'), ('4k', '₩4,000')):
                typ(pg, '#amt', text)
                ok(small in txt(pg, '#read') and 'small amount for this field' in txt(pg, '#read') and 'warn' in pg.get_attribute('#read', 'class'), f'en: "{text}" 는 원 그대로 읽고 작은 금액이라고 알린다 = {txt(pg, "#read")[:60]}')
            for text, val in (('55,000,000', 55000000), ('40m', 40000000), ('70 million', 70000000), ('40000000', 40000000)):
                typ(pg, '#amt', text)
                ok(net(pg) == f(pay(pg, f'P.netPay({{amount:{val},basis:"annual"}}).net')) and f'₩{val:,}' in txt(pg, '#read'), f'en: "{text}" → {txt(pg, "#read")}')
            typ(pg, '#amt', '55,000,000')
            pg.click('#optsBtn'); pg.click('[data-k="family"] button >> nth=1'); pg.click('[data-k="family"] button >> nth=1'); pg.click('[data-k="children"] button >> nth=1'); pg.click('[data-k="ratio"] [data-v="120"]'); pg.check('#o-sev'); pg.check('#o-age')
            pg.click('#slip .how'); pg.click('[data-k="period"] [data-v="2027-01"]'); pg.wait_for_timeout(400)
            ok(net(pg) == f(pay(pg, 'P.netPay({amount:55000000,basis:"annual",family:3,children:1,ratio:120,includeSeverance:true,noEmployment:true,noPension:true,period:"2027-01"}).net')) and pg.is_checked('#o-age60'), f'en: 조건을 다 바꾼 값 = {net(pg)}')
            ex = pg.eval_on_selector_all('#slip .ded .ex', 'els => els.map(e => e.textContent)')
            ok(ex[0] == 'Not collected from people aged 60 or older' and ex[3] == 'Not collected from people hired after 65' and 'aged 60 or older (no National Pension)' in txt(pg, '#optsSum'), f'en: 나이 조건의 계산식 글 = {ex[0]} / {ex[3]}')
            ok(pg.evaluate(HANGUL) == [], f'en: 쓴 뒤에도 lang="ko" 밖 한글 0 {pg.evaluate(HANGUL)[:3]}')
            tags = pg.eval_on_selector_all('#slip .ded li .tag-hold, #slip .ded li .tag-st', 'els => els.map(e => e.textContent)')
            ok(tags == ['same rate approved', 'not decided · 2026 value used', 'revision not decided · 2026 table used'], f'en: 2027 꼬리표(떼지 않는 국민연금·고용보험 줄에는 붙이지 않는다) = {tags}')
            pg.uncheck('#o-age'); pg.uncheck('#o-age60'); pg.wait_for_timeout(150)
            tags = pg.eval_on_selector_all('#slip .ded li .tag-hold, #slip .ded li .tag-st', 'els => els.map(e => e.textContent)')
            ok(tags == ['set by law', 'same rate approved', 'not decided · 2026 value used', '2026 rate used', 'revision not decided · 2026 table used'], f'en: 2027 꼬리표 = {tags}')
            pg.check('#o-age'); pg.wait_for_timeout(150)
            ok('Rules as of January 2027 (planned)' == txt(pg, '#slip .asof') and 'These are the rules planned for January 2027.' in txt(pg, '#slip .nx'), 'en: 2027 안내')
            shot(pg, 'en-home-used-desktop')
            pg.click('#kind [data-v="monthly"]')
            ok(pg.input_value('#amt') == '4,230,769' and pg.is_hidden('[data-sev]'), f'en: 월급으로 바꾸면 = {pg.input_value("#amt")}')
            ok(pg.get_attribute('.cmp-more a', 'href') == '/en/table/' and pg.get_attribute('.lumen', 'href') == 'https://lumenlab.page/en/', 'en: 표·루멘랩 링크')
            ok(not errs, f'en 실수령액: 콘솔 오류 {errs[:2]}')
            c.close()
            # 해가 바뀌면(기기 날짜 2027년 2월): 확정된 2027년 값으로 기본 계산하고, 미정 항목은 줄마다 표시한다. 경고 띠는 뜨지 않는다(2027년 기준의 기간 안)
            for path in ('/', '/en/', '/hourly/', '/en/hourly/', '/unemployment/'):
                c = ctx(path=path); pg = open_page(c, path); pg.wait_for_timeout(400)
                ok(pg.is_hidden('#stale'), f'{path}: 기간 안에서는 경고가 없다')
                c.close()
            for path in ('/', '/en/'):
                en = path == '/en/'
                c = ctx(path=path, real_font=True); errs = []; pg = open_page(c, path, errs, clock='2027-02-01T10:00:00'); pg.wait_for_timeout(900)
                ok(net(pg) == '2,927,973' == f(pay(pg, 'P.netPay({amount:40000000,basis:"annual",period:"2027-01"}).net')) and txt(pg, '#slip .asof') == ('Rules as of January 2027' if en else '2027년 1월 기준'), f'{path} 2027-02-01: 2027년 1월 기준이 기본(예정 표시 없음) = {net(pg)} / {txt(pg, "#slip .asof")}')
                ok(txt(pg, '#slip [data-id="pension"] .am') == ('−₩156,650' if en else '−156,650원') and pg.is_hidden('#stale'), f'{path} 2027-02-01: 국민연금 5.0%, 경고 띠 없음')
                tags = pg.eval_on_selector_all('#slip .ded li .tag-hold', 'els => els.map(e => e.textContent)')
                ok(tags == (['not decided · 2026 value used', '2026 rate used', 'revision not decided · 2026 table used'] if en else ['미정 · 2026년 값으로 계산', '2026년 요율로 계산', '개정 여부 미정 · 2026년 표로 계산']), f'{path} 2027-02-01: 미정 항목은 줄마다 2026년 값이라고 표시 = {tags}')
                ok(pg.evaluate('window.__cls') <= 0.02, f'{path} 2027-02-01: 기준이 바뀌어 보일 때 화면 밀림 {pg.evaluate("window.__cls"):.3f}')
                ok(pg.evaluate('document.getElementById("slip").classList.contains("is-ex")') and pg.locator('#slip .tag-ex').count() == 1, f'{path} 2027-02-01: 예시 상태 그대로')
                pg.click('#optsBtn')
                lab = pg.eval_on_selector_all('[data-k="period"] button', 'els => els.map(e => e.textContent + ":" + e.getAttribute("aria-pressed"))')
                ok(lab == (['Oct 2026:false', 'Jan 2027:true'] if en else ['2026년 10월:false', '2027년 1월:true']), f'{path} 2027-02-01: 기준 시기 단추 = {lab}')
                pg.click('[data-k="period"] [data-v="2026-10"]'); pg.wait_for_timeout(200)
                ok(net(pg) == '2,935,813' and pg.is_visible('#stale') and txt(pg, '#stale') == ('You are viewing the previous rules (2026).' if en else '지난 기준(2026년)으로 보고 있어요.'), f'{path} 2027-02-01: 2026년 기준을 고르면 지난 기준이라고 알린다 = {txt(pg, "#stale")}')
                above = pg.evaluate('document.getElementById("stale").getBoundingClientRect().bottom <= document.getElementById("slip").getBoundingClientRect().top + 1')
                ok(above, f'{path}: 알림은 결과 위에')
                pg.fill('#amt', '5500' if not en else '55,000,000'); pg.click('[data-k="period"] [data-v="2027-01"]'); pg.wait_for_timeout(200)
                ok(net(pg) == f(pay(pg, 'P.netPay({amount:55000000,basis:"annual",period:"2027-01"}).net')) and pg.is_hidden('#stale'), f'{path} 2027-02-01: 내 값도 2027년 기준으로')
                if SHOTS and not en:
                    pg.click('#optsBtn'); shot(pg, 'ko-home-2027-desktop')
                ok(not errs, f'{path} 2027-02-01: 콘솔 오류 {errs[:2]}')
                c.close()
            for path in ('/hourly/', '/en/hourly/'):
                c = ctx(path=path, real_font=True); pg = open_page(c, path, clock='2027-02-01T10:00:00'); pg.wait_for_timeout(900)
                ok(net(pg) == '2,236,300' and ('10,700' in txt(pg, '#slip .tag-ex')) and pg.is_hidden('#stale') and pg.get_attribute('#period [data-v="2027-01"]', 'aria-pressed') == 'true', f'{path} 2027-02-01: 2027년 최저임금 10,700원이 기본 = {net(pg)}')
                ok(pg.evaluate('window.__cls') <= 0.02, f'{path} 2027-02-01: 화면 밀림 {pg.evaluate("window.__cls"):.3f}')
                c.close()
            c = ctx(path='/unemployment/', real_font=True); pg = open_page(c, '/unemployment/', clock='2027-02-01T10:00:00'); pg.wait_for_timeout(900)
            ok(pg.is_visible('#stale') and txt(pg, '#stale') == '2027년 상한액은 아직 정해지지 않았어요. 2027년 이직은 하한액만 2027년 값으로 계산해요.' and pg.evaluate('window.__cls') <= 0.02, f'/unemployment/ 2027-02-01: 상한 미정 안내 = {txt(pg, "#stale") if pg.is_visible("#stale") else "(안 보임)"}')
            c.close()
            c = ctx(path='/unemployment/'); pg = open_page(c, '/unemployment/', clock='2028-01-05T10:00:00'); pg.wait_for_timeout(600)
            ok(pg.is_visible('#stale') and txt(pg, '#stale') == '이 값은 2027년 기준이에요. 새 기준을 확인 중이에요.', f'/unemployment/ 2028-01-05: 새 기준 확인 중 = {txt(pg, "#stale")}')
            c.close()
            # 자료를 못 넘긴 채 더 지나면(2027년 8월: 기준소득월액 상·하한 기간이 끝남) 2027년 기준에도 경고가 뜬다
            for path, msg in (('/', '이 값은 2027년 기준이에요. 새 기준을 확인 중이에요.'), ('/en/', 'These figures are the 2027 rules. We are checking the new ones.')):
                c = ctx(path=path, real_font=True); pg = open_page(c, path, clock='2027-08-01T10:00:00'); pg.wait_for_timeout(900)
                ok(pg.is_visible('#stale') and txt(pg, '#stale') == msg and net(pg) == '2,927,973', f'{path} 2027-08-01: 2027년 기준에도 경고 = {txt(pg, "#stale") if pg.is_visible("#stale") else "(안 보임)"}')
                ok(pg.evaluate('window.__cls') <= 0.02, f'{path} 2027-08-01: 경고가 뜰 때 화면 밀림 {pg.evaluate("window.__cls"):.3f}')
                if SHOTS and path == '/':
                    shot(pg, 'ko-home-stale-desktop')
                c.close()
            c = ctx(path='/hourly/'); pg = open_page(c, '/hourly/', clock='2028-01-05T10:00:00'); pg.wait_for_timeout(600)
            ok(pg.is_visible('#stale') and txt(pg, '#stale') == '이 값은 2027년 기준이에요. 새 기준을 확인 중이에요.' and net(pg) == '2,236,300', f'/hourly/ 2028-01-05: 2027년 최저임금이 끝나면 경고 = {txt(pg, "#stale")}')
            c.close()
            # 휴대폰
            for (w, h, name) in ((390, 844, 'mobile'), (375, 667, '375'), (360, 740, '360')):
                c = ctx(w, h, True, path='/'); pg = open_page(c, '/'); pg.wait_for_timeout(600)
                pos = pg.evaluate('({ amt: document.getElementById("amt").getBoundingClientRect().bottom, num: document.querySelector("#slip .sum-n").getBoundingClientRect().bottom, nav: document.querySelector(".tools").getBoundingClientRect().bottom })')
                ok(pos['amt'] < h and pos['num'] < h - 20, f'ko {w}×{h}: 입력칸({pos["amt"]:.0f})과 답({pos["num"]:.0f})이 첫 화면에 같이 보인다')
                ok(pg.evaluate('getComputedStyle(document.querySelector("#slip .slip-h")).flexWrap') == 'nowrap' and pg.evaluate('document.querySelector("#slip .slip-h").getBoundingClientRect().height') < 46, f'ko {w}: 종이 머리(기준 꼬리표)가 한 줄')
                ok(pg.evaluate('document.getElementById("read").textContent.length') > 10, f'ko {w}: 입력칸 아래가 비어 있지 않다')
                if name != '360':
                    shot(pg, f'ko-home-{name}')
                # 조건을 여는 동안 실수령액 한 줄이 붙어 있다
                ok(not pg.evaluate('document.getElementById("stick").classList.contains("on")'), f'ko {w}: 처음에는 붙박이 줄이 없다')
                pg.fill('#amt', '5500'); pg.click('#optsBtn'); pg.wait_for_timeout(500)
                on = pg.evaluate('document.getElementById("stick").classList.contains("on")')
                seen = pg.evaluate('(() => { const r = document.querySelector("#slip .sum-n").getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; })()')
                ok(on != seen and txt(pg, '#stick') == '한 달 실수령액 3,886,073원', f'ko {w}: 조건을 열면 답이 화면 밖일 때 붙박이 줄({on}, 답 보임 {seen}) = {txt(pg, "#stick")}')
                pg.click('[data-k="family"] button >> nth=1'); pg.wait_for_timeout(200)
                ok(txt(pg, '#stick') == '한 달 실수령액 ' + f(pay(pg, 'P.netPay({amount:55000000,basis:"annual",family:2}).net')) + '원', f'ko {w}: 조건을 바꾸면 붙박이 줄도 바뀐다 = {txt(pg, "#stick")}')
                if name == 'mobile':
                    shot(pg, 'ko-home-settings-mobile')
                pg.evaluate('document.getElementById("slip").scrollIntoView()'); pg.wait_for_timeout(500)
                ok(not pg.evaluate('document.getElementById("stick").classList.contains("on")'), f'ko {w}: 답이 보이면 붙박이 줄이 사라진다')
                pg.evaluate('window.scrollTo(0, 0)'); pg.wait_for_timeout(400); pg.click('#optsBtn'); pg.wait_for_timeout(300)
                ok(not pg.evaluate('document.getElementById("stick").classList.contains("on")'), f'ko {w}: 조건을 접으면 붙박이 줄이 사라진다')
                ok(hscroll(pg) <= 0, f'ko {w}: 가로 스크롤')
                c.close()
            c = ctx(390, 844, True, path='/en/'); pg = open_page(c, '/en/'); pg.wait_for_timeout(500); shot(pg, 'en-home-mobile')
            pos = pg.evaluate('({ amt: document.getElementById("amt").getBoundingClientRect().bottom, num: document.querySelector("#slip .sum-n").getBoundingClientRect().bottom })')
            ok(pos['num'] < 844, f'en 390×844: 답이 첫 화면에({pos["num"]:.0f})'); c.close()
            # 좁은 화면(흉내 없이 창 폭만): 단추 글자가 세로로 쪼개지지 않고, 차액 꼬리표가 글자를 덮지 않는다
            CLASH = '''() => [...document.querySelectorAll('#slip .chg')].map(row => { const b = row.querySelector('.chg-b'), r = b.getBoundingClientRect(), g = document.createRange(), w = document.createTreeWalker(row, NodeFilter.SHOW_TEXT); let n, hit = 0;
                while ((n = w.nextNode())) { if (b.contains(n) || !n.nodeValue.trim() || getComputedStyle(n.parentNode).visibility === 'hidden') continue; g.selectNodeContents(n);
                  for (const q of g.getClientRects()) if (q.width && q.right > r.left + 1 && q.left < r.right - 1 && q.bottom > r.top + 3 && q.top < r.bottom - 3) hit++; }
                const s = document.getElementById('slip').getBoundingClientRect(), o = row.getBoundingClientRect(); return [row.dataset.id, hit, r.left >= s.left && r.right <= s.right && r.bottom <= o.bottom + 1]; })'''
            for (w, path, val) in ((320, '/', '5,500만'), (320, '/en/', '55,000,000'), (375, '/en/', '120,000,000'), (390, '/', '1억 2천')):
                c = ctx(w, 700, False, path=path, dark=(w == 320)); errs = []; pg = open_page(c, path, errs); pg.wait_for_timeout(500)
                hw = pg.evaluate('(() => { const h = document.querySelector("#slip .how"), r = h.getBoundingClientRect(), g = document.createRange(); g.selectNodeContents(h); return [r.height, g.getClientRects().length]; })()')
                ok(hw[0] <= 46 and hw[1] == 1, f'{path} {w}px: 계산식 단추 글자가 한 줄 = {hw}')
                pg.fill('#amt', val); pg.press('#amt', 'Enter'); pg.wait_for_timeout(300)
                for ex in (False, True):
                    if ex:
                        pg.click('#slip .how'); pg.wait_for_timeout(200)
                    pg.click('#slip [data-act="period"]'); pg.wait_for_timeout(350)
                    got = pg.evaluate(CLASH)
                    ok(len(got) == 2 and all(x[1] == 0 and x[2] for x in got), f'{path} {w}px{" 계산식 펼침" if ex else ""}: 차액 꼬리표가 글자를 덮지 않고 줄 안에 있다 = {got}')
                    pg.wait_for_timeout(2300)
                    ok(pg.locator('#slip .chg, #slip .chg-b, #slip .tight').count() == 0, f'{path} {w}px: 꼬리표가 스스로 사라진다')
                    pg.click('#slip [data-act="period"]'); pg.wait_for_timeout(2500)
                ok(hscroll(pg) <= 0 and not errs, f'{path} {w}px: 가로 스크롤·오류 {errs}')
                c.close()
            c = ctx(390, 844, True, path='/', dark=True); pg = open_page(c, '/'); pg.wait_for_timeout(500); shot(pg, 'ko-home-mobile-dark'); c.close()
            c = ctx(path='/en/', dark=True); pg = open_page(c, '/en/'); pg.wait_for_timeout(500); pg.fill('#amt', '55,000,000'); pg.wait_for_timeout(900); shot(pg, 'en-home-desktop-dark')
            bg = pg.evaluate('getComputedStyle(document.body).backgroundColor'); ok(bg == 'rgb(22, 21, 24)', f'어두운 화면 바탕 = {bg}')
            contrast = pg.evaluate('(() => { const c = s => getComputedStyle(document.querySelector(s)).color; return [c("#slip .dbl"), c("#slip .ded .am"), getComputedStyle(document.getElementById("slip")).backgroundColor]; })()')
            ok(contrast[0] == 'rgb(240, 142, 166)' and contrast[2] == 'rgb(32, 31, 36)', f'어두운 화면의 강조색·종이색 = {contrast}')
            c.close()

        # ── 4. 퇴직금 ──
        if want(4):
            c = ctx(path='/severance/'); errs = []; pg = open_page(c, '/severance/', errs); pg.wait_for_timeout(500)
            ok(net(pg) == '7,868,434' and txt(pg, '#slip .tag-ex') == '예시 · 고용노동부 퇴직금 계산 예제' and '88,641원 31전' in txt(pg, '#slip') and pg.is_hidden('#b-clear'), f'퇴직금: 빈 상태는 고용노동부 예제 = {net(pg)}')
            pg.click('#b-ex'); pg.wait_for_timeout(300)
            ok(pg.input_value('#f-join') == '2014-10-02' and pg.input_value('#f-leave') == '2017-09-16' and pg.input_value('#f-wages') == '7,080,000' and pg.input_value('#f-bonus') == '4,000,000' and pg.input_value('#f-lpay') == '300,000', '퇴직금: 예제 넣어 보기')
            ok(net(pg) == '7,868,434' and pg.locator('#slip .tag-ex').count() == 0 and pg.locator('#slip .dbl.draw').count() == 1 and pg.is_visible('#b-clear'), '퇴직금: 예제를 넣으면 내 값이 되고 밑줄을 긋는다')
            rows = txt(pg, '#slip')
            ok(all(s in rows for s in ('1,080일', '92일', '7,080,000원', '1,000,000원', '75,000원', '88,641원 31전', '2014년 10월 2일 ~ 2017년 9월 15일 (마지막 근무일)', '2017년 6월 16일 ~ 2017년 9월 15일')), f'퇴직금: 예제의 줄 = {rows[:200]}')
            shot(pg, 'ko-severance-desktop')
            pg.fill('#f-join', '2020-03-02'); pg.fill('#f-leave', '2026-03-02'); pg.fill('#f-wages', '900만'); pg.fill('#f-bonus', ''); pg.fill('#f-lpay', '')
            want_ = pay(pg, 'P.severance({join:"2020-03-02",leave:"2026-03-02",wages3m:9000000})')
            ok(net(pg) == f(want_['amount']) and f'{want_["serviceDays"]:,}일' in txt(pg, '#slip') and want_['period']['days'] == 90 and '90일' in txt(pg, '#slip'), f'퇴직금: 2020-03-02 ~ 2026-03-02, 900만 = {net(pg)}')
            pg.fill('#f-ord', '120000')
            ok(net(pg) == f(pay(pg, 'P.severance({join:"2020-03-02",leave:"2026-03-02",wages3m:9000000,dailyOrdinary:120000}).amount')) and '통상임금으로 계산했어요' in txt(pg, '#slip'), '퇴직금: 통상임금이 더 크면 통상임금')
            pg.fill('#f-ord', ''); pg.check('#f-u15')
            ok(pg.locator('#slip [data-net]').count() == 0 and '15시간 미만이면 퇴직급여 제도의 대상에서 빠져요(근로자퇴직급여 보장법 제4조)' in txt(pg, '#slip') and '참고로 같은 조건을 그대로 계산하면' in txt(pg, '#slip'), '퇴직금: 주 15시간 미만은 금액 대신 조문')
            pg.uncheck('#f-u15'); pg.fill('#f-join', '2025-06-01')
            ok(pg.locator('#slip [data-net]').count() == 0 and '계속근로기간이 1년 미만이면' in txt(pg, '#slip') and '2026년 6월 1일에 1년이 돼요' in txt(pg, '#slip'), f'퇴직금: 1년 미만 = {txt(pg, "#slip .why")}')
            pg.fill('#f-join', '2026-06-01')
            ok('퇴직일은 입사일보다 뒤여야 해요.' in txt(pg, '#slip'), '퇴직금: 날짜가 뒤바뀌면 알린다')
            pg.fill('#f-join', '2020-03-02'); pg.fill('#f-wages', 'abc')
            ok('금액을 읽지 못했어요.' in txt(pg, '#slip') and pg.get_attribute('#f-wages', 'aria-invalid') == 'true' and '금액을 읽지 못했어요. 708, 708만, 7,080,000원처럼 써 주세요.' == txt(pg, '#r-f-wages'), f'퇴직금: 못 읽는 금액은 칸 아래와 결과에 알린다 = {txt(pg, "#r-f-wages")}')
            pg.fill('#f-wages', '')
            ok('퇴직 전 3개월 동안 받은 임금을 넣어 주세요.' in txt(pg, '#slip'), '퇴직금: 임금이 비면 알린다')
            # [평가 L6] 금액 칸은 실수령액 계산기와 같은 규칙: 900 = 900만 원. 칸 옆에 단위, 칸 아래에 읽은 값
            pg.fill('#f-wages', '900')
            ok(txt(pg, '#r-f-wages') == '900만 원(9,000,000원)으로 읽었어요' and txt(pg, '#u-f-wages') == '만 원' and '9,000,000원' in txt(pg, '#slip'), f'퇴직금: 900 → 900만 원 = {txt(pg, "#r-f-wages")}')
            pg.fill('#f-wages', '9000000')
            ok(txt(pg, '#r-f-wages') == '9,000,000원(900만 원)으로 읽었어요. 큰 수는 원 단위로 읽어요.' and txt(pg, '#u-f-wages') == '원', f'퇴직금: 9000000 → 원으로 읽고 알린다 = {txt(pg, "#r-f-wages")}')
            pg.fill('#f-bonus', '400'); pg.fill('#f-lpay', '30'); pg.fill('#f-ord', '120000')
            ok(txt(pg, '#r-f-bonus') == '400만 원(4,000,000원)으로 읽었어요' and txt(pg, '#r-f-lpay') == '30만 원(300,000원)으로 읽었어요' and txt(pg, '#r-f-ord') == '120,000원(12만 원)으로 읽었어요' and txt(pg, '#u-f-ord') == '원', f'퇴직금: 상여금·연차수당은 만 원, 1일 통상임금은 원 = {txt(pg, "#r-f-bonus")} / {txt(pg, "#r-f-lpay")} / {txt(pg, "#r-f-ord")}')
            pg.fill('#f-bonus', ''); pg.fill('#f-lpay', ''); pg.fill('#f-ord', '')
            # [평가 M4·L1, 고용노동부 화면에 직접 넣은 값] 2020-03-02 입사 · 3개월 임금 900만
            for leave, start, days, amount in (('2026-05-31', '2026년 3월 1일', 91, '18,541,924'), ('2026-05-30', '2026년 3월 1일', 90, '18,739,726'), ('2026-05-29', '2026년 3월 1일', 89, '18,941,974'),
                                               ('2026-12-31', '2026년 9월 30일', 92, '20,061,049'), ('2026-07-31', '2026년 4월 30일', 92, '18,830,852'), ('2026-10-01', '2026년 7월 1일', 92, '19,329,363')):
                pg.fill('#f-leave', leave)
                t = txt(pg, '#slip')
                ok(net(pg) == amount and f'{start} ~ ' in t and f'{days}일' in t, f'퇴직금 [실물] {leave} 퇴직: {start}부터 {days}일, {amount}원 = {net(pg)}')
                note = '3개월 전 달에 같은 날짜가 없어 이날부터 세어요(고용노동부 계산기와 같은 방식).' in t
                ok(note == (leave != '2026-10-01'), f'퇴직금 {leave}: 같은 날짜가 없을 때만 그 까닭을 한 줄로 알린다({note})')
                if SHOTS and leave == '2026-05-31':
                    pg.wait_for_timeout(800); shot(pg, 'ko-severance-may31-desktop')
            pg.click('#b-clear')
            ok(net(pg) == '7,868,434' and pg.locator('#slip .tag-ex').count() == 1 and pg.input_value('#f-join') == '', '퇴직금: 지우면 예시로')
            ok(not errs, f'퇴직금: 콘솔 오류 {errs[:2]}'); c.close()
            c = ctx(path='/en/severance/'); pg = open_page(c, '/en/severance/'); pg.wait_for_timeout(500)
            ok(net(pg) == '7,868,434' and '₩88,641.31' in txt(pg, '#slip') and 'Example · Ministry of Employment and Labor sample case' == txt(pg, '#slip .tag-ex'), 'en 퇴직금: 예제')
            pg.click('#b-ex'); pg.fill('#f-leave', '2026-03-02'); pg.fill('#f-join', '2025-06-01'); pg.wait_for_timeout(200)
            ok('Service of less than one year' in txt(pg, '#slip') and '1 Jun 2026' in txt(pg, '#slip') and pg.evaluate(HANGUL) == [], f'en 퇴직금: 1년 미만 안내, 한글 0 {pg.evaluate(HANGUL)[:2]}')
            pg.fill('#f-join', '2014-10-02'); pg.fill('#f-leave', '2017-09-16'); pg.wait_for_timeout(300); ok(net(pg) == '7,868,434', 'en 퇴직금: 예제 값'); shot(pg, 'en-severance-desktop'); c.close()
            c = ctx(390, 844, True, path='/severance/'); pg = open_page(c, '/severance/'); pg.wait_for_timeout(400); pg.click('#b-ex'); pg.wait_for_timeout(300)
            ok(hscroll(pg) <= 0 and pg.evaluate('document.querySelector("#more").open'), '퇴직금 390px: 예제를 넣으면 상여금 칸이 펼쳐진다'); shot(pg, 'ko-severance-mobile', full=True); c.close()

        # ── 5. 시급·주휴수당 ──
        if want(5):
            c = ctx(path='/hourly/'); errs = []; pg = open_page(c, '/hourly/', errs); pg.wait_for_timeout(500)
            ok(net(pg) == '2,156,880' and '2026년 최저임금 10,320원과 같아요.' in txt(pg, '#slip') and '82,560원' in txt(pg, '#slip') and '209시간' in txt(pg, '#slip'), f'시급: 빈 상태는 2026년 최저임금·주 40시간 = {net(pg)}')
            pg.fill('#amt', '12000'); pg.fill('#f-hours', '20')
            t = txt(pg, '#slip')
            # [손] 12,000 × (24 × 365 ÷ 84 = 104.2857…) = 1,251,428.57 → 원 미만 올림 1,251,429
            ok(net(pg) == '1,251,429' and '48,000원' in t and '288,000원' in t and '104.3시간' in t and '(20 + 4) × 365 ÷ 7 ÷ 12' in t and '2026년 최저임금 10,320원보다 시간당 1,680원 많아요.' in t and '원 미만 올림' in t, f'시급: 12,000원·주 20시간 = {net(pg)} / {t[:120]}')
            ok(net(pg) == f(pay(pg, 'P.hourlyToPay({hourly:12000,weeklyHours:20}).monthly')), '시급: = 로직')
            ok(txt(pg, '#read') == '12,000원(1만 2,000원)으로 읽었어요', f'시급: 읽은 값 = {txt(pg, "#read")}')
            pg.wait_for_timeout(900); shot(pg, 'ko-hourly-desktop')
            pg.fill('#f-hours', '14')
            ok('주 소정근로시간이 15시간 미만이라 주휴수당이 없어요(근로기준법 제18조 제3항).' in txt(pg, '#slip') and net(pg) == f(pay(pg, 'P.hourlyToPay({hourly:12000,weeklyHours:14}).monthly')), '시급: 주 15시간 미만')
            pg.fill('#f-hours', '45')
            ok('주휴는 8시간분까지예요.' in txt(pg, '#slip') and '209시간' in txt(pg, '#slip'), '시급: 주 40시간 초과')
            pg.fill('#f-hours', '40'); pg.fill('#amt', '10000')
            ok('2026년 최저임금 10,320원보다 시간당 320원 적어요.' in txt(pg, '#slip .mw') and 'under' in pg.get_attribute('#slip .mw', 'class'), '시급: 최저임금보다 적으면 알린다')
            pg.click('#period [data-v="2027-01"]')
            ok('2027년 최저임금 10,700원보다 시간당 700원 적어요.' in txt(pg, '#slip .mw') and txt(pg, '#slip .asof') == '2027년 최저임금 기준', '시급: 2027년 기준')
            pg.fill('#amt', '10700'); ok(net(pg) == '2,236,300', f'시급: 2027년 최저임금 월급 = {net(pg)}')
            pg.click('#period [data-v="2026-10"]'); pg.click('#mode [data-v="monthly"]')
            ok(pg.input_value('#amt') == '' and net(pg) == f(pay(pg, 'P.monthlyToHourly({monthly:3000000}).hourly')) and txt(pg, '#slip .tag-ex') == '예시 · 월급 300만 원', '시급: 월급으로 바꾸면 월급 예시')
            pg.fill('#amt', '250만')
            ok(net(pg) == '11,961' and '월급 ÷ 209시간, 원 미만 버림' in txt(pg, '#slip') and '2026년 최저임금 10,320원보다 시간당 1,641원 많아요.' in txt(pg, '#slip .mw') and '이 근로시간의 2026년 최저임금 월 환산액' in txt(pg, '#slip') and '2,156,880원' in txt(pg, '#slip'), f'시급: 월급 250만 → 시급(최저임금과는 시급끼리 견준다) = {net(pg)} / {txt(pg, "#slip .mw")}')
            ok(txt(pg, '#u-amt') == '' and txt(pg, '#read') == '2,500,000원(250만 원)으로 읽었어요', f'시급: 월급 칸은 단위를 붙여 쓰면 옆 단위를 비운다 = "{txt(pg, "#u-amt")}"')
            pg.fill('#amt', '250')
            ok(net(pg) == '11,961' and txt(pg, '#u-amt') == '만 원' and txt(pg, '#read') == '250만 원(2,500,000원)으로 읽었어요', f'시급: 월급 칸의 250 = 250만 원 = {txt(pg, "#read")}')
            pg.fill('#f-hours', 'x')
            ok('주 근로시간은 1~168시간 사이로 넣어 주세요(소수는 둘째 자리까지).' in txt(pg, '#read') and pg.get_attribute('#f-hours', 'aria-invalid') == 'true' and pg.locator('#slip [data-net]').count() == 0, '시급: 잘못된 근로시간은 40시간으로 바꿔 계산하지 않고 알린다')
            # [평가 L3] 시급 → 월급 → 시급 왕복: 자기 결과를 '적다'고 하지 않는다. 최저임금 10,320원·주 15시간 → 807,172원
            pg.fill('#f-hours', '15'); pg.fill('#amt', '807172')
            ok(net(pg) == '10,320' and txt(pg, '#slip .mw') == '2026년 최저임금 10,320원과 같아요.' and 'under' not in pg.get_attribute('#slip .mw', 'class') and '807,172원' in txt(pg, '#slip'), f'시급 [평가]: 월급 807,172·주 15시간 → 시급 10,320, 최저임금과 같다 = {net(pg)} / {txt(pg, "#slip .mw")}')
            pg.fill('#amt', '807171')
            ok(net(pg) == '10,319' and txt(pg, '#slip .mw') == '2026년 최저임금 10,320원보다 시간당 1원 적어요.', f'시급: 1원 모자라면 시급이 1원 적다 = {txt(pg, "#slip .mw")}')
            pg.fill('#f-hours', '20'); pg.fill('#amt', '1076229')
            ok(net(pg) == '10,320' and txt(pg, '#slip .mw') == '2026년 최저임금 10,320원과 같아요.', f'시급 [평가]: 주 20시간 1,076,229 → 10,320 = {net(pg)}')
            pg.click('#mode [data-v="hourly"]'); pg.fill('#amt', '10320'); pg.fill('#f-hours', '15')
            ok(net(pg) == '807,172' and txt(pg, '#slip .mw') == '2026년 최저임금 10,320원과 같아요.', f'시급 [평가]: 10,320·주 15시간 → 807,172 = {net(pg)}')
            pg.fill('#f-hours', '20'); ok(net(pg) == '1,076,229', f'시급 [평가]: 10,320·주 20시간 → 1,076,229 = {net(pg)}')
            # [평가 L13] 14.99시간은 15.0으로 보이지 않는다. 소수 셋째 자리는 받지 않는다
            pg.fill('#f-hours', '14.99'); t = txt(pg, '#slip')
            ok('14.99시간' in t and '15.0시간' not in t and '15시간 미만이라 주휴수당이 없어요' in t and '(14.99 + 0) × 365 ÷ 7 ÷ 12' in t, f'시급 [평가]: 14.99시간 표시 = {t[80:200]}')
            pg.fill('#f-hours', '14.999')
            ok('소수는 둘째 자리까지' in txt(pg, '#slip') and pg.locator('#slip [data-net]').count() == 0, '시급: 14.999시간은 반올림하지 않고 알린다')
            pg.fill('#f-hours', '37.5'); t = txt(pg, '#slip')
            ok('37.5시간' in t and '37.5 ÷ 40 × 8' in t and '7.5시간' in t, f'시급: 37.5시간 = {t[80:180]}')
            pg.fill('#amt', '10700'); pg.click('#mode [data-v="monthly"]')
            pg.fill('#f-hours', '40'); pg.click('#mode [data-v="hourly"]')
            ok(pg.input_value('#amt') == '10700', '시급: 방향을 되돌리면 전에 쓴 값')
            ok(not errs, f'시급: 콘솔 오류 {errs[:2]}'); c.close()
            c = ctx(path='/en/hourly/'); pg = open_page(c, '/en/hourly/'); pg.wait_for_timeout(500)
            ok(net(pg) == '2,156,880' and 'Exactly the 2026 minimum wage of ₩10,320 an hour.' in txt(pg, '#slip'), 'en 시급: 예시')
            pg.fill('#amt', '12000'); pg.fill('#f-hours', '20'); pg.click('#period [data-v="2027-01"]'); pg.wait_for_timeout(200)
            ok(net(pg) == '1,251,429' and '₩1,300 an hour above the 2027 minimum wage of ₩10,700.' in txt(pg, '#slip') and 'won fractions rounded up' in txt(pg, '#slip') and pg.evaluate(HANGUL) == [], f'en 시급: 12,000·20시간·2027, 한글 0 {pg.evaluate(HANGUL)[:2]}')
            pg.click('#mode [data-v="monthly"]'); pg.fill('#amt', '2500000')
            # [손] 2,500,000 ÷ (24 × 365 ÷ 84 = 104.2857…) = 23,972.6 → 원 미만 버림 23,972
            ok(net(pg) == '23,972' == f(pay(pg, 'P.monthlyToHourly({monthly:2500000,weeklyHours:20,period:"2027-01"}).hourly')) and 'Monthly minimum for these hours, 2027' in txt(pg, '#slip') and pg.evaluate(HANGUL) == [], f'en 시급: 월급 → 시급 = {net(pg)}')
            pg.wait_for_timeout(700); shot(pg, 'en-hourly-desktop'); c.close()

        # ── 6. 실업급여·연차 ──
        if want(6):
            c = ctx(path='/unemployment/'); errs = []; pg = open_page(c, '/unemployment/', errs); pg.wait_for_timeout(500)
            ok(net(pg) == '66,048' and '예시 · 3개월 임금 900만 원' == txt(pg, '#slip .tag-ex') and '180일' in txt(pg, '#slip'), f'실업급여: 예시 = {net(pg)}')
            pg.fill('#f-leave', '2026-09-30'); pg.fill('#f-wages', '1500만')
            t = txt(pg, '#slip')
            ok(net(pg) == '68,100' and '15,000,000원 ÷ 92일' in t and '163,043원' in t and '상한액으로 받아요' in t and '12,258,000원' in t, f'실업급여: 3개월 1,500만 = {net(pg)} / {t[:100]}')
            pg.select_option('#f-band', '4'); pg.click('#age [data-v="1"]')
            ok('270일' in txt(pg, '#slip') and '50세 이상, 가입 10년 이상' in txt(pg, '#slip') and f(68100 * 270) + '원' in txt(pg, '#slip'), '실업급여: 50세 이상·10년 이상 270일')
            pg.wait_for_timeout(800); shot(pg, 'ko-unemployment-desktop')
            pg.fill('#f-wages', '360만'); pg.select_option('#f-hours', '4')
            ok(net(pg) == '33,024' and '1일 4시간 × 2026년 최저임금 10,320원 × 80%' in txt(pg, '#slip'), f'실업급여: 하루 4시간 하한 = {net(pg)}')
            pg.select_option('#f-hours', '8'); pg.fill('#f-wages', '1000만')
            w_ = pay(pg, 'P.unemployment({wages3m: 10000000, dayHours:8, leave:"2026-09-30", tenureYears:10, over50:true})')
            ok(net(pg) == f(w_['daily']) == '66,048' and '10,000,000원 × 60% ÷ 92일, 원 미만 버림' in txt(pg, '#slip') and '65,217원' in txt(pg, '#slip'), f'실업급여: 3개월 1,000만 = {net(pg)}')
            ok(txt(pg, '#r-f-wages') == '10,000,000원(1,000만 원)으로 읽었어요' and txt(pg, '#u-f-wages') == '', f'실업급여: 읽은 값 = {txt(pg, "#r-f-wages")}')
            # [평가 M3] 2027년 이직: 하한은 2027년 최저임금 10,700원으로(8시간 68,480원), 상한은 미정, 합계는 최소
            pg.fill('#f-leave', '2027-01-15'); pg.fill('#f-wages', '900만'); pg.select_option('#f-band', '2'); pg.click('#age [data-v="0"]')
            t = txt(pg, '#slip')
            ok(net(pg) == '68,480' and txt(pg, '#slip .asof') == '2027년 이직 기준(상한 미정)' and '하한액이 더 커서 하한액으로 받아요.' in t and '(최소)' not in t, f'실업급여 [평가]: 2027-01-15 이직 = {net(pg)} / {txt(pg, "#slip .asof")}(60%가 하한보다 적은 사람은 상한과 상관없이 하한액: 최소 표시 없음)')
            ok(txt(pg, '#slip .hold') == '2027년 이직은 하루 최소 68,480원이에요(하루 8시간 기준, 2027년 최저임금 10,700원의 80%). 2026년 상한액 68,100원보다 커요. 2027년 상한액은 아직 정해지지 않았어요.', f'실업급여 [평가]: 2027년 안내 = {txt(pg, "#slip .hold")}')
            ok('1일 8시간 × 2027년 최저임금 10,700원 × 80%' in t and '하한액 확정' in t and '상한액 미정' in t and '아직 없어요' in t and f(68480 * 180) + '원' in t and f(68480 * 30) + '원' in t, f'실업급여 [평가]: 2027년 줄들 = {t[150:330]}')
            if SHOTS:
                pg.wait_for_timeout(800); shot(pg, 'ko-unemployment-2027-desktop')
            # 평균임금이 지금 상한(113,500원)을 넘으면 새 상한에 따라 더 받을 수도 있다 → 그때만 '최소'. [손] 1,500만 ÷ 92 = 163,043원, 60% = 97,826 > 68,480
            pg.fill('#f-wages', '1500만'); pg.wait_for_timeout(800); t = txt(pg, '#slip')
            ok(net(pg) == '68,480' and '하루 구직급여(최소)' in t and '2027년 하한액이에요. 2027년 상한액이 정해지면 더 받을 수도 있어요.' in t and '30일치(최소)' in t and '받는 날을 다 채우면(최소)' in t and txt(pg, '#live') == '하루 구직급여 최소 68,480원, 180일', f'실업급여: 2027년 · 1,500만 → 최소 68,480 = {net(pg)} / {t[40:120]}')
            pg.select_option('#f-hours', '4'); t = txt(pg, '#slip')
            ok(net(pg) == '68,100' and '2026년 상한액으로 계산했어요. 2027년 상한액이 정해지면 더 받을 수도 있어요.' in t and '하루 구직급여(최소)' in t and '2026년 상한액 68,100원보다 커요' not in t, f'실업급여: 2027년 · 1,500만 · 4시간 → 최소 68,100 = {net(pg)}')
            pg.select_option('#f-hours', '8'); pg.fill('#f-wages', '900만')
            pg.select_option('#f-hours', '4')
            ok(net(pg) == '58,695' == f(pay(pg, 'P.unemployment({wages3m:9000000,dayHours:4,leave:"2027-01-15",tenureYears:3}).daily')) and '1일 4시간 × 2027년 최저임금 10,700원 × 80%' in txt(pg, '#slip') and '34,240원' in txt(pg, '#slip') and '평균임금의 60%로 받아요.' in txt(pg, '#slip') and '(최소)' not in txt(pg, '#slip'), f'실업급여: 2027년·하루 4시간 = {net(pg)}')
            pg.select_option('#f-hours', '8'); pg.fill('#f-leave', '2028-01-01')
            ok(pg.locator('#slip [data-net]').count() == 0 and '2028년 1월 1일부터는 구직급여를 계산하는 기준이 바뀔 예정이라 그 뒤의 이직은 계산하지 않아요.' in txt(pg, '#slip') and pg.get_attribute('#f-leave', 'aria-invalid') == 'true', '실업급여: 2028년 이직은 범위 밖이라고 알린다')
            # [평가 M2] 이직일 2026-03-31(3개월 90일) · 임금 600만 · 4시간: 6,000,000 × 60% ÷ 90 = 정확히 40,000원(전에는 39,999원)
            pg.fill('#f-leave', '2026-03-31'); pg.fill('#f-wages', '6,000,000'); pg.select_option('#f-hours', '4')
            t = txt(pg, '#slip')
            ok(net(pg) == '40,000' and '6,000,000원 × 60% ÷ 90일, 원 미만 버림' in t and '6,000,000원 ÷ 90일, 원 미만 버림' in t and '66,666원' in t and '7,200,000원' in t and '39,999' not in t, f'실업급여 [평가]: 90일 구간 40,000원·합계 7,200,000원 = {net(pg)} / {t[100:260]}')
            # [평가] 8시간 · 이직일 2026-02-28 · 임금 10,127,100원 → 67,514원(전에는 67,513원). [손] 10,127,100 × 0.6 ÷ 90 = 67,514
            pg.fill('#f-leave', '2026-02-28'); pg.fill('#f-wages', '10,127,100원'); pg.select_option('#f-hours', '8')
            ok(net(pg) == '67,514', f'실업급여 [평가]: 2026-02-28 · 10,127,100원 → 67,514 = {net(pg)}')
            pg.fill('#f-wages', '900')
            ok(txt(pg, '#r-f-wages') == '900만 원(9,000,000원)으로 읽었어요' and txt(pg, '#u-f-wages') == '만 원', f'실업급여 [평가 L6]: 900 → 900만 원 = {txt(pg, "#r-f-wages")}')
            pg.fill('#f-wages', '1')
            ok('1만 원(10,000원)으로 읽었어요' in txt(pg, '#r-f-wages') and '작은 금액이에요' in txt(pg, '#r-f-wages') and 'warn' in pg.get_attribute('#r-f-wages', 'class'), f'실업급여: 1 → 1만 원, 작은 금액이라고 알린다 = {txt(pg, "#r-f-wages")}')
            ok('이직일은 마지막으로 일한 날이에요. 퇴직금 계산기에 넣는 퇴직일(그 다음 날)보다 하루 앞이에요.' == txt(pg, '#h-leave') and '공식 하한액 표가 1~8시간 정수라서 정수로 골라요.' == txt(pg, '#h-hours'), '실업급여 [평가 L16·L17]: 이직일 안내, 정수인 이유')
            pg.fill('#f-wages', '1000만'); pg.fill('#f-leave', '2026-09-30')
            pg.fill('#f-leave', '2025-12-31')
            ok(pg.locator('#slip [data-net]').count() == 0 and '2026년 1월 1일보다 앞선 이직은 상·하한액이 달라서 계산하지 않아요.' in txt(pg, '#slip'), '실업급여: 2025년 이직은 범위 밖이라고 알린다')
            pg.fill('#f-leave', '2026-09-30'); pg.fill('#f-wages', '')
            ok('퇴직 전 3개월 동안 받은 임금을 넣어 주세요.' in txt(pg, '#slip'), '실업급여: 임금이 비면 알린다')
            ok('고용센터가 정해요' in txt(pg, 'main') and '피보험 단위기간이 합쳐서 180일 이상' in txt(pg, 'main'), '실업급여: 요건은 조문만 나열')
            ok(not errs, f'실업급여: 콘솔 오류 {errs[:2]}'); c.close()
            c = ctx(390, 844, True, path='/unemployment/'); pg = open_page(c, '/unemployment/'); pg.wait_for_timeout(400); shot(pg, 'ko-unemployment-mobile', full=True); c.close()
            c = ctx(path='/annual-leave/'); errs = []; pg = open_page(c, '/annual-leave/', errs, clock='2026-10-10T09:00:00'); pg.wait_for_timeout(500)
            ok(net(pg) == '15' and '만 21년부터' in txt(pg, '#slip') and '25일' in txt(pg, '#slip'), '연차: 빈 상태는 근속 연수별 표')
            pg.fill('#f-join', '2020-03-02')
            t = txt(pg, '#slip')
            ok(net(pg) == '17' and '2026년 10월 10일 기준, 만 6년 근무. 다음은 2027년 3월 2일에 18일이 생겨요.' in t and '2021-03-02' in t, f'연차: 2020-03-02 입사 = {net(pg)} / {t[:120]}')
            ok(txt(pg, '#slip tr.me th') == '만 6년 지금', '연차: 지금 줄 강조')
            pg.wait_for_timeout(500); shot(pg, 'ko-annual-leave-desktop')
            pg.fill('#f-join', '2026-01-15')
            ok(net(pg) == '8' and '입사 첫해에 지금까지 생긴 연차' in txt(pg, '#slip') and '만 8개월 근무. 다음은 2026년 10월 15일에 1일이 생겨요.' in txt(pg, '#slip'), f'연차: 1년 미만 = {net(pg)}')
            pg.fill('#f-join', '2026-01-31')
            ok('2026-03-01부터 다달이' in txt(pg, '#slip'), '연차: 1월 31일 입사 → 첫 연차 3월 1일')
            pg.fill('#f-join', '2026-12-01')
            ok(net(pg) == '15' and '2027-12-01' in txt(pg, '#slip'), '연차: 입사일이 오늘보다 뒤여도 표는 나온다')
            ok(not errs, f'연차: 콘솔 오류 {errs[:2]}'); c.close()

        # ── 7. 연봉 표 ──
        if want(7):
            c = ctx(path='/table/'); errs = []; pg = open_page(c, '/table/', errs); pg.wait_for_timeout(500)
            ok(pg.locator('#tbl tbody tr').count() == 91 and pg.locator('#tbl thead th:visible').count() == 4, f'표: 91줄, 처음엔 4칸 = {pg.locator("#tbl thead th:visible").count()}')
            row = pg.eval_on_selector('#a4000', 'e => [...e.children].map(c => c.textContent)')
            ok(row == ['4,000만', '3,333,333', '148,810', '112,640', '14,800', '28,190', '84,620', '8,460', '397,520', '2,935,813'], f'표: 연봉 4,000만 줄 = {row}')
            pg.click('#b-all')
            ok(pg.locator('#tbl thead th:visible').count() == 10 and txt(pg, '#b-all') == '간단히 보기' and pg.get_attribute('#b-all', 'aria-pressed') == 'true', '표: 항목별로 보기')
            shot(pg, 'ko-table-desktop')
            pg.click('#b-all'); pg.fill('#find', '5500'); pg.wait_for_timeout(1100)
            ok(pg.eval_on_selector_all('#tbl tr.me', 'els => els.map(e => e.id)') == ['a5500'] and txt(pg, '#read') == '5,500만 원에 가장 가까운 줄을 표시했어요.', f'표: 내 연봉 5,500만 = {txt(pg, "#read")}')
            ok(pg.evaluate('(() => { const r = document.getElementById("a5500").getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight; })()'), '표: 내 줄이 화면에 온다')
            pg.fill('#find', '5,540만'); pg.wait_for_timeout(200)
            ok(pg.eval_on_selector_all('#tbl tr.me', 'els => els.map(e => e.id)') == ['a5500'], '표: 가장 가까운 줄')
            pg.fill('#find', '5억'); ok(txt(pg, '#read') == '표의 범위 밖이에요. 계산기에 넣어 보세요.' and pg.locator('#tbl tr.me').count() == 0, '표: 범위 밖')
            pg.fill('#find', 'x'); ok('금액을 읽지 못했어요.' == txt(pg, '#read'), '표: 못 읽는 금액')
            ok(pg.get_attribute('#a5500 th a', 'href') == '/#a=55000000', '표: 줄 링크')
            pg.click('#a5500 th a'); pg.wait_for_function('location.pathname === "/" && !location.hash'); pg.wait_for_timeout(800)
            ok(pg.input_value('#amt') == '5,500만' and net(pg) == '3,886,073', f'표 → 계산기 = {net(pg)}')
            # [평가 L8] 줄 어디를 눌러도(금액 칸도) 그 연봉으로 계산기가 열린다
            pg.go_back(); pg.wait_for_function('location.pathname === "/table/"'); pg.wait_for_timeout(500)
            pg.click('#a7000 td.net'); pg.wait_for_function('location.pathname === "/" && !location.hash'); pg.wait_for_timeout(800)
            ok(pg.input_value('#amt') == '7,000만' and net(pg) == f(pay(pg, 'P.netPay({amount:70000000,basis:"annual"}).net')), f'표 [평가]: 줄의 금액 칸을 눌러도 계산기로 = {pg.input_value("#amt")} / {net(pg)}')
            pg.go_back(); pg.wait_for_function('location.pathname === "/table/"'); pg.wait_for_timeout(500)
            ok(pg.evaluate('getComputedStyle(document.querySelector("#a4000")).cursor') == 'pointer', '표: 줄에 손 모양')
            for text, unit, read in (('5500', '만 원', '5,500만 원에 가장 가까운 줄을 표시했어요.'), ('55000000', '원', '5,500만 원에 가장 가까운 줄을 표시했어요.'), ('5,500만 원', '', '5,500만 원에 가장 가까운 줄을 표시했어요.')):
                pg.fill('#find', text); pg.wait_for_timeout(150)
                ok(txt(pg, '#u-find') == unit and txt(pg, '#read') == read and pg.eval_on_selector_all('#tbl tr.me', 'els => els.map(e => e.id)') == ['a5500'], f'표: 내 연봉 칸 "{text}" → 단위 "{txt(pg, "#u-find")}", {txt(pg, "#read")}')
            pg.fill('#find', 'x'); ok(pg.get_attribute('#find', 'aria-invalid') == 'true', '표: 못 읽으면 aria-invalid')
            ok(not errs, f'표: 콘솔 오류 {errs[:2]}'); c.close()
            for w in (390, 320):
                c = ctx(w, 740, True, path='/table/'); pg = open_page(c, '/table/'); pg.wait_for_timeout(400)
                fit = pg.evaluate('(() => { const t = document.querySelector("#tbl table").getBoundingClientRect(); return [Math.round(t.right), innerWidth, document.querySelectorAll("#tbl thead th").length, [...document.querySelectorAll("#tbl thead th")].filter(e => e.offsetWidth > 0).length]; })()')
                ok(fit[0] <= fit[1] and fit[3] == 3 and hscroll(pg) <= 0, f'표 {w}px: 3칸으로 줄여 잘리지 않는다 {fit}')
                last = pg.evaluate('(() => { const c = document.querySelector("#a20000 td.net").getBoundingClientRect(); return c.right <= innerWidth; })()')
                ok(last, f'표 {w}px: 가장 긴 줄(2억)의 실수령액이 화면 안')
                if w == 390:
                    shot(pg, 'ko-table-mobile')
                pg.click('#b-all'); pg.wait_for_timeout(200)
                ok(pg.is_visible('#hint') and pg.evaluate('document.getElementById("tbl").scrollWidth > document.getElementById("tbl").clientWidth') and hscroll(pg) <= 0, f'표 {w}px: 항목별로 보면 표 안에서 옆으로 밀고 한 줄로 알려 준다')
                # [평가 L8] 옆으로 밀어도 연봉 칸은 왼쪽에 붙어 있다(어느 줄인지 놓치지 않게)
                pg.evaluate('document.getElementById("tbl").scrollLeft = 400'); pg.wait_for_timeout(200)
                stuck = pg.evaluate('(() => { const t = document.getElementById("tbl").getBoundingClientRect(), a = document.querySelector("#a4000 th").getBoundingClientRect(), h = document.querySelector("#tbl thead th").getBoundingClientRect(), n = document.querySelector("#a4000 td.net").getBoundingClientRect(); return [document.getElementById("tbl").scrollLeft > 100, Math.abs(a.left - t.left) < 2, Math.abs(h.left - t.left) < 2, getComputedStyle(document.querySelector("#a4000 th")).backgroundColor !== "rgba(0, 0, 0, 0)", n.left >= a.right - 1 || n.right <= t.right + 1]; })()')
                ok(stuck == [True, True, True, True, True], f'표 {w}px [평가]: 옆으로 밀어도 연봉 칸이 붙어 있다 {stuck}')
                if w == 390:
                    shot(pg, 'ko-table-mobile-all')
                small = pg.evaluate(SMALL)
                ok(not small, f'표 {w}px: 44px보다 작은 누르는 곳 {small[:3]}')
                c.close()
            c = ctx(path='/en/table/'); pg = open_page(c, '/en/table/'); pg.wait_for_timeout(400)
            pg.fill('#find', '55m'); pg.wait_for_timeout(900)
            ok(pg.eval_on_selector_all('#tbl tr.me', 'els => els.map(e => e.id)') == ['a5500'] and txt(pg, '#read') == 'Marked the row closest to ₩55,000,000.' and pg.get_attribute('#a5500 th a', 'href') == '/en/#a=55000000' and pg.evaluate(HANGUL) == [], f'en 표: 찾기 = {txt(pg, "#read")}')
            shot(pg, 'en-table-desktop'); c.close()

        # ── 8. 글·광고 자리·인쇄·동작 줄이기·연출 3 ──
        if want(8):
            c = ctx(path='/'); pg = open_page(c, '/guide/myeongseseo-dareun-iyu/'); pg.wait_for_timeout(500); shot(pg, 'ko-guide-desktop', full=True)
            ok(pg.locator('.prose blockquote').count() >= 3 and pg.locator('.src-list a').count() >= 5 and pg.get_attribute('.try a', 'href') == '/', '글: 인용·출처·계산기 링크')
            ok(pg.evaluate('getComputedStyle(document.querySelector(".try a.btn")).color') == pg.evaluate('(() => { const d = document.createElement("i"); d.style.color = "var(--main-ink)"; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; })()'), '글 속 단추 글자색(링크 색을 물려받지 않는다)')
            c.close()
            c = ctx(390, 844, True, path='/'); pg = open_page(c, '/guide/myeongseseo-dareun-iyu/'); pg.wait_for_timeout(500); shot(pg, 'ko-guide-mobile', full=True); c.close()
            c = ctx(path='/en/'); pg = open_page(c, '/en/guide/payroll-deductions-korea/'); pg.wait_for_timeout(500); shot(pg, 'en-guide-desktop', full=True)
            ok(pg.evaluate(HANGUL) == [], f'en 글: 한글 {pg.evaluate(HANGUL)[:2]}'); c.close()
            c = ctx(path='/'); pg = open_page(c, '/about/'); pg.wait_for_timeout(400); shot(pg, 'ko-about-desktop', full=True)
            ok(pg.locator('#basis').count() == 1 and pg.locator('.tbl tbody tr').count() >= 22 and pg.locator('.tbl a[href*="law.go.kr"]').count() >= 20, '소개: 전체 근거표'); c.close()
            c = ctx(390, 844, True, path='/'); pg = open_page(c, '/about/'); pg.wait_for_timeout(400); shot(pg, 'ko-about-mobile', full=True)
            ok(pg.evaluate('getComputedStyle(document.querySelector(".tbl.rows tbody tr")).display') == 'block', '소개 390px: 근거표는 줄 카드'); c.close()
            c = ctx(path='/'); pg = open_page(c, '/404-nope'); pg.wait_for_timeout(300); shot(pg, '404-desktop')
            ok(pg.locator('.nf a[href="/"]').count() == 1 and pg.locator('.nf a[href="/en/"]').count() == 1 and pg.locator('[data-ad]').count() == 0, '404: 두 언어 링크, 광고 자리 없음')
            ok(pg.title() == '페이지를 찾을 수 없어요 | 떼고얼마' and pg.evaluate('document.documentElement.lang') == 'ko' and pg.get_attribute('#nf-brand', 'href') == '/' and txt(pg, '#nf-brand') == '떼고얼마', f'404 [평가 L14]: 한국어 주소면 한국어 제목·언어 = {pg.title()}'); c.close()
            c = ctx(path='/en/'); pg = open_page(c, '/en/nope-xyz/'); pg.wait_for_timeout(300); shot(pg, '404-en-desktop')
            ok(pg.title() == 'Page not found | Takehome Korea' and pg.evaluate('document.documentElement.lang') == 'en' and pg.get_attribute('#nf-brand', 'href') == '/en/' and txt(pg, '#nf-brand') == 'Takehome Korea' and txt(pg, '#nf-other') == '한국어' and pg.get_attribute('#nf-other', 'lang') == 'ko',
               f'404 [평가 L14]: /en/ 아래면 영어 제목·언어 = {pg.title()} / {pg.evaluate("document.documentElement.lang")}')
            ok(pg.evaluate(HANGUL) == [], f'404 /en/: lang="ko" 밖 한글 {pg.evaluate(HANGUL)[:2]}'); c.close()
            # 광고 미리보기: 자리가 누르는 것에서 떨어져 있는지
            for path in ('/', '/en/', '/severance/', '/hourly/', '/unemployment/', '/annual-leave/', '/table/', '/guide/juhyu-sudang-gyesan/'):
                for (w, mobile) in ((1366, False), (390, True)):
                    c = ctx(w, 844, mobile, path=path); pg = open_page(c, path + '?adpreview'); pg.wait_for_timeout(400)
                    if path in ('/', '/en/') and not mobile:
                        pg.click('#optsBtn'); pg.click('#slip .how'); pg.wait_for_timeout(200)
                    info = pg.evaluate('''(() => {
                      const slots = [...document.querySelectorAll('[data-ad]')].map(s => s.getBoundingClientRect());
                      const act = [...document.querySelectorAll('main button, main input, main select, main a.btn, main .slip, main .cmp-t, main summary, main .pay-t a')].filter(e => (e.checkVisibility ? e.checkVisibility() : e.offsetWidth > 0) && !e.closest('.stick')).map(e => e.getBoundingClientRect());
                      let gap = 1e9;
                      for (const s of slots) for (const a of act) { const g = a.bottom <= s.top ? s.top - a.bottom : a.top >= s.bottom ? a.top - s.bottom : -1; if (g < gap) gap = g; }
                      const lab = document.querySelector('.ad-label');
                      return { n: slots.length, gap: Math.round(gap), w: Math.round(Math.max(...slots.map(s => s.width))), h: Math.round(Math.min(...slots.map(s => s.height))), label: lab.textContent, size: parseFloat(getComputedStyle(lab).fontSize),
                               firstTop: Math.round(slots[0].top + scrollY), inputTop: Math.round((document.querySelector('main input') || document.querySelector('h1')).getBoundingClientRect().top + scrollY) };
                    })()''')
                    ok(info['n'] >= 2 and info['gap'] >= 40, f'{path} {w}px: 광고 자리와 누르는 것 사이 {info["gap"]}px (40px 이상이어야)')
                    ok(info['w'] <= 780 and info['h'] >= 250 and info['label'] in ('광고', 'Ad') and info['size'] >= 12, f'{path} {w}px: 광고 자리 폭 {info["w"]}·높이 {info["h"]}·표시 {info["label"]} {info["size"]}px')
                    ok(info['firstTop'] > info['inputTop'], f'{path} {w}px: 광고보다 입력칸이 먼저')
                    if path == '/' and not mobile and SHOTS:
                        pg.click('#slip .how'); pg.click('#optsBtn'); pg.wait_for_timeout(200); shot(pg, 'ko-home-adpreview', full=True)
                    c.close()
            for path in ('/about/', '/privacy/', '/guide/', '/en/about/', '/en/privacy/', '/en/guide/'):
                c = ctx(path=path); pg = open_page(c, path + '?adpreview'); pg.wait_for_timeout(300)
                ok(pg.locator('[data-ad]').count() == 0 and pg.locator('script[src*="adsbygoogle"]').count() == 0, f'{path}: 광고 코드·자리 없음'); c.close()
            # 인쇄: 머리·꼬리·광고·단추는 숨기고 명세서는 남긴다
            c = ctx(path='/'); pg = open_page(c, '/'); pg.fill('#amt', '5,500만'); pg.click('#slip .how'); pg.wait_for_timeout(300); pg.emulate_media(media='print')
            hid = pg.evaluate('[".top", ".foot", ".ad-wrap", ".quick", ".how", ".cmp-step", "#slip .lnk"].map(s => getComputedStyle(document.querySelector(s)).display)')
            ok(all(x == 'none' for x in hid) and pg.is_visible('#slip .sum') and pg.is_visible('#slip .ded .ex'), f'인쇄: 머리·꼬리·광고·단추 숨김 {hid}')
            shot(pg, 'ko-home-print', full=True); c.close()
            c = ctx(path='/table/'); pg = open_page(c, '/table/'); pg.emulate_media(media='print'); pg.wait_for_timeout(200)
            ok(pg.locator('#tbl thead th:visible').count() == 10 and pg.is_hidden('.pay-find'), '인쇄: 연봉 표는 모든 칸'); c.close()
            # 동작 줄이기: 내용이 다 보이고 움직이지 않는다
            c = ctx(path='/', reduce=True); pg = open_page(c, '/'); pg.wait_for_timeout(400)
            ok(not pg.evaluate('document.documentElement.classList.contains("anim")'), '동작 줄이기: anim 이 안 붙는다')
            pg.fill('#amt', '5,500만'); pg.wait_for_timeout(900)
            ok(pg.evaluate('getComputedStyle(document.querySelector("#slip .dbl"), "::before").animationName') == 'none' and pg.evaluate('getComputedStyle(document.querySelector("#slip .dbl"), "::before").transform') in ('none', 'matrix(1, 0, 0, 1, 0, 0)'), '동작 줄이기: 밑줄은 그어진 채로 있다')
            pg.click('#slip [data-act="period"]'); pg.wait_for_timeout(300)
            ok(pg.locator('#slip .chg-b').count() == 2 and pg.evaluate('getComputedStyle(document.querySelector("#slip [data-id=pension]"), "::after").content') in ('none', 'normal'), '동작 줄이기: 바탕 깜빡임 없이 차액 꼬리표만')
            pg.evaluate('document.querySelector(".lumen").scrollIntoView()'); pg.wait_for_timeout(500)
            ok(pg.evaluate('getComputedStyle(document.querySelector(".lm-paper")).transform') in ('none', 'matrix(1, 0, 0, 1, 0, 0)'), '동작 줄이기: 루멘랩 칸의 명세서는 처음부터 올라와 있다')
            hidden = pg.evaluate('[...document.querySelectorAll("main *, footer *")].filter(e => { const s = getComputedStyle(e); return e.offsetWidth > 0 && (parseFloat(s.opacity) < 0.2) && !e.closest(".chg-b, .sr, .stick, .sum-eye"); }).length')
            ok(hidden == 0, f'동작 줄이기: 숨은 채 남은 요소 {hidden}개'); c.close()
            # 연출 3: 루멘랩 칸. 화면에 들어올 때 한 번
            for (w, mobile, dark) in ((1366, False, False), (320, True, True)):
                c = ctx(w, 768, mobile, path='/', dark=dark); pg = open_page(c, '/'); pg.wait_for_timeout(500)
                ok(pg.evaluate('document.documentElement.classList.contains("anim")') and not pg.evaluate('document.querySelector(".lumen").classList.contains("in")'), f'연출 3 {w}px: 화면 밖에 있을 때는 시작하지 않는다')
                start = pg.evaluate('getComputedStyle(document.querySelector(".lm-paper")).transform')
                pg.evaluate('document.querySelector(".lumen").scrollIntoView({block: "center"})'); pg.wait_for_timeout(150)
                box0 = pg.evaluate('document.querySelector(".lumen").getBoundingClientRect().toJSON()')
                ok(pg.evaluate('document.querySelector(".lumen").classList.contains("in")') and start == 'matrix(1, 0, 0, 1, 0, 13)', f'연출 3 {w}px: 들어오면 시작(처음 자리 {start})')
                ok(pg.evaluate('document.elementFromPoint(...(r => [r.left + r.width / 2, r.top + r.height / 2])(document.querySelector(".lumen").getBoundingClientRect())).closest("a").href') == 'https://lumenlab.page/', '연출 3: 나오는 중에도 링크가 눌린다')
                pg.wait_for_timeout(1000)
                box1 = pg.evaluate('document.querySelector(".lumen").getBoundingClientRect().toJSON()')
                ok(pg.evaluate('getComputedStyle(document.querySelector(".lm-paper")).transform') in ('none', 'matrix(1, 0, 0, 1, 0, 0)') and box0 == box1, f'연출 3 {w}px: 0.6초 뒤 올라온 채 멈추고 자리 크기가 그대로')
                ok(pg.evaluate('document.getAnimations().filter(a => a.playState === "running").length') == 0, '연출 3: 끝나면 도는 움직임이 없다')
                if SHOTS and not mobile:
                    pg.screenshot(path=f'{SHOTS}/{PRE}fx-lumen.png', clip={'x': box1['x'] - 10, 'y': box1['y'] - 10, 'width': box1['width'] + 20, 'height': box1['height'] + 20})
                pg.evaluate('window.scrollTo(0, 0)'); pg.wait_for_timeout(300); pg.evaluate('document.querySelector(".lumen").scrollIntoView({block: "center"})'); pg.wait_for_timeout(200)
                ok(pg.evaluate('getComputedStyle(document.querySelector(".lm-paper")).transform') in ('none', 'matrix(1, 0, 0, 1, 0, 0)'), '연출 3: 다시 들어와도 다시 나오지 않는다')
                near = pg.evaluate('(() => { const l = document.querySelector(".lumen").getBoundingClientRect(); return [...document.querySelectorAll("[data-ad]")].map(a => a.getBoundingClientRect()).every(a => a.bottom + 60 < l.top || a.top > l.bottom + 60); })()')
                ok(near and hscroll(pg) <= 0, f'연출 3 {w}px: 광고 자리와 떨어져 있고 가로 스크롤 없음')
                if SHOTS and mobile:
                    shot(pg, 'fx-lumen-320-dark')
                c.close()
            c = ctx(path='/en/'); pg = open_page(c, '/en/'); pg.wait_for_timeout(300)
            ok(pg.get_attribute('.lumen', 'href') == 'https://lumenlab.page/en/' and txt(pg, '.lumen b') == 'Made by Lumen Lab', 'en: 루멘랩 칸은 영어 본페이지로'); c.close()

        # ── 9. 제3자 평가(2026-10-10)에서 고친 것 ──
        if want(9):
            DUP = '(() => { const m = {}; document.querySelectorAll("[id]").forEach(e => m[e.id] = (m[e.id] || 0) + 1); return Object.keys(m).filter(k => m[k] > 1); })()'
            # [H1] 나이 조건 둘의 조합 4가지 × 여러 연봉. 기준값: 평가 보고서(4,000만: 65세만 2,964,003 · 둘 다 3,112,813)와 손 계산(60세만 2,935,813 + 148,810 = 3,084,623)
            c = ctx(path='/'); errs = []; pg = open_page(c, '/', errs); pg.wait_for_timeout(500)
            pg.click('#optsBtn')
            ok('만 60세 이상이에요' in txt(pg, '#optsBody') and '국민연금을 내지 않아요. 임의계속가입으로 계속 내고 있으면 끄세요.' in txt(pg, '#optsBody') and '65세 이후에 새로 입사했어요' in txt(pg, '#optsBody') and '고용보험료도 내지 않아요.' in txt(pg, '#optsBody'), '[H1] 나이 조건 두 줄과 곁 설명')
            hand = {(False, False): '2,935,813', (True, False): '3,084,623', (False, True): '2,964,003', (True, True): '3,112,813'}
            for amount, text in ((30000000, '3000'), (40000000, '4000'), (70000000, '7000'), (120000000, '1억 2천')):
                pg.fill('#amt', text)
                for a60, a65 in ((False, False), (True, False), (True, True), (False, True)):
                    # 65세를 켜면 60세도 같이 켜진다. (False, True)는 그 뒤에 60세만 끈 것 = 임의계속가입으로 국민연금을 계속 내는 사람
                    pg.set_checked('#o-age60', False); pg.set_checked('#o-age', False)
                    if a65:
                        pg.set_checked('#o-age', True)
                        ok(pg.is_checked('#o-age60'), '[H1] 65세 이후 입사를 켜면 만 60세 이상도 같이 켜진다')
                        if not a60:
                            pg.set_checked('#o-age60', False)
                    elif a60:
                        pg.set_checked('#o-age60', True)
                    want_ = pay(pg, f'(r => [r.net, r.line.pension.amount, r.line.employment.amount])(P.netPay({{amount:{amount},basis:"annual",noPension:{str(a60).lower()},noEmployment:{str(a65).lower()}}}))')
                    got = [net(pg), txt(pg, '#slip [data-id="pension"] .am'), txt(pg, '#slip [data-id="employment"] .am')]
                    ok(got[0] == f(want_[0]) and (got[1] == '0원') == a60 and (got[2] == '0원') == a65 and (want_[1] == 0) == a60 and (want_[2] == 0) == a65, f'[H1] 연봉 {text} · 60세 {a60} · 65세 {a65} = {got} / 로직 {want_}')
                    if amount == 40000000:
                        ok(got[0] == hand[(a60, a65)], f'[H1 평가·손] 연봉 4,000만 · 60세 {a60} · 65세 {a65} = {got[0]} (기대 {hand[(a60, a65)]})')
                    s_ = txt(pg, '#optsSum')
                    ok(('만 60세 이상(국민연금 없음)' in s_) == a60 and ('65세 이후 입사(고용보험료 없음)' in s_) == a65, f'[H1] 조건 한 줄 = {s_}')
            pg.fill('#amt', '4000'); pg.set_checked('#o-age', False); pg.set_checked('#o-age60', True); pg.click('#slip .how')
            ex = pg.eval_on_selector_all('#slip .ded .ex', 'els => els.map(e => e.textContent)')
            ok(ex[0] == '만 60세 이상은 가입 대상이 아니라 떼지 않아요' and txt(pg, '#slip .nx p') == '2027년 1월 기준으로도 실수령액이 같아요.', f'[H1] 계산식 글과 2027년 비교(국민연금을 안 내면 달라지는 게 없다) = {ex[0]} / {txt(pg, "#slip .nx p")}')
            rows = pg.eval_on_selector_all('#cmp tbody tr', 'els => els.map(e => [...e.children].map(c => c.textContent.trim()))')
            ok(rows[3][1] == '3,084,623원' and rows[4][1] == f(pay(pg, 'P.netPay({amount:41000000,basis:"annual",noPension:true}).net')) + '원', f'[H1] 앞뒤 금액 표도 같은 조건 = {rows[3:5]}')
            pg.click('#slip [data-act="period"]'); pg.wait_for_timeout(300)
            ok(net(pg) == '3,084,623' and txt(pg, '#slip [data-id="pension"] .am') == '0원', f'[H1] 2027년 기준으로 봐도 국민연금 0원 = {net(pg)}')
            pg.click('#slip [data-act="period"]'); pg.wait_for_timeout(2300); pg.set_checked('#o-age', True); pg.wait_for_timeout(700)
            shot(pg, 'ko-home-age-desktop')
            ok(pg.locator('a[href*="%EA%B5%AD%EB%AF%BC%EC%97%B0%EA%B8%88%EB%B2%95"]', has_text='제6조·제8조').count() >= 1, '[H1] 근거표에 국민연금법 제6조·제8조 링크')
            ok(not errs, f'[H1] 콘솔 오류 {errs[:2]}'); c.close()
            c = ctx(path='/en/'); pg = open_page(c, '/en/'); pg.wait_for_timeout(400); pg.fill('#amt', '40,000,000'); pg.click('#optsBtn'); pg.check('#o-age')
            ok(net(pg) == '3,112,813' and txt(pg, '#slip [data-id="pension"] .am') == '₩0' and txt(pg, '#slip [data-id="employment"] .am') == '₩0' and 'I am 60 or older' in txt(pg, '#optsBody') and pg.evaluate(HANGUL) == [], f'[H1] en: 65세 이후 입사 = {net(pg)}')
            pg.uncheck('#o-age60')
            ok(net(pg) == '2,964,003' and txt(pg, '#slip [data-id="pension"] .am') == '−₩148,810', f'[H1] en: 60세를 끄면(임의계속가입) 국민연금은 다시 뗀다 = {net(pg)}'); c.close()
            c = ctx(390, 844, True, path='/'); pg = open_page(c, '/'); pg.wait_for_timeout(400); pg.fill('#amt', '4000'); pg.click('#optsBtn'); pg.check('#o-age'); pg.wait_for_timeout(300)
            pg.evaluate('document.getElementById("o-age").scrollIntoView({block: "center"})'); pg.wait_for_timeout(400)
            ok(hscroll(pg) <= 0 and txt(pg, '#stick') == '한 달 실수령액 3,112,813원', f'[H1] 390px: 나이 조건을 켠 화면, 붙박이 줄 = {txt(pg, "#stick")}'); shot(pg, 'ko-home-age-mobile'); c.close()

            # [M1] '계산 기준과 출처' 링크는 출처 구역으로 간다(모든 계산기, 두 화면 크기). 쪽 안 id 겹침 0
            for path in ('/', '/en/', '/severance/', '/en/severance/', '/hourly/', '/en/hourly/', '/unemployment/', '/annual-leave/'):
                for (w, h, mobile) in ((390, 844, True), (1366, 768, False)):
                    c = ctx(w, h, mobile, path=path, reduce=True); pg = open_page(c, path); pg.wait_for_timeout(400)
                    ok(pg.evaluate(DUP) == [], f'[M1] {path}: 같은 id 가 두 번 {pg.evaluate(DUP)}')
                    for sel in ('.fine a[href="#basis"]', '.kf .cmp-more a[href="#basis"]'):
                        if pg.locator(sel).count() == 0:
                            ok(path in ('/', '/en/') and sel.startswith('.kf'), f'[M1] {path}: {sel} 링크가 없음')
                            continue
                        pg.evaluate('window.scrollTo(0, 0)'); pg.wait_for_timeout(150)
                        pg.click(sel); pg.wait_for_timeout(500)
                        got = pg.evaluate('(() => { const e = document.getElementById("basis"), h = e.querySelector("h2"), r = h.getBoundingClientRect(), t = e.querySelector(".tbl"); return [location.hash, e.tagName, h.textContent, Math.round(r.top), r.top >= 0 && r.bottom <= innerHeight, !!t && t.getBoundingClientRect().top < innerHeight, document.querySelectorAll("#basis").length]; })()')
                        ok(got[0] == '#basis' and got[1] == 'SECTION' and got[2] in ('계산 기준과 출처', 'Rules and sources') and got[4] and got[5] and got[6] == 1, f'[M1] {path} {w}px {sel}: 출처 구역 제목이 화면에 온다 = {got}')
                        if SHOTS and path == '/' and mobile and sel.startswith('.fine'):
                            shot(pg, 'ko-home-basis-link-mobile')
                    c.close()
            for path in paths:
                c = ctx(path=path); pg = open_page(c, path); pg.wait_for_timeout(250)
                ok(pg.evaluate(DUP) == [], f'[M1] {path}: 같은 id 가 두 번 {pg.evaluate(DUP)}')
                bad = pg.evaluate('[...document.querySelectorAll("a[href*=\\"#\\"]")].filter(a => { const u = new URL(a.href); return u.origin === location.origin && u.pathname === location.pathname && u.hash && !u.hash.startsWith("#a=") && !document.getElementById(u.hash.slice(1)); }).map(a => a.getAttribute("href"))')
                ok(bad == [], f'[M1] {path}: 목적지가 없는 # 링크 {bad}')
                c.close()

            # [L4·L5·L6] 금액 칸: 칸 옆 단위, 읽은 값, 해석이 뒤집히지 않음, 알림
            c = ctx(path='/'); pg = open_page(c, '/'); pg.wait_for_timeout(400)
            for text, unit, read, cls in (('4000', '만 원', '4,000만 원(40,000,000원)으로 읽었어요', ''), ('99999', '만 원', '9억 9,999만 원(999,990,000원)으로 읽었어요', ''),
                                          ('100000', '만 원', "10억 원(1,000,000,000원)으로 읽었어요. 원 단위로 쓴 금액이면 끝에 '원'을 붙여 주세요.", 'warn'),
                                          ('40000000', '원', '40,000,000원(4,000만 원)으로 읽었어요. 큰 수는 원 단위로 읽어요.', ''), ('4,000만 원', '', '40,000,000원(4,000만 원)으로 읽었어요', ''),
                                          ('40,000,000원', '', '40,000,000원(4,000만 원)으로 읽었어요', ''), ('4k', '', '4,000원으로 읽었어요. 이 칸에는 작은 금액이에요. 맞는지 확인해 주세요.', 'warn')):
                pg.fill('#amt', text)
                ok(txt(pg, '#u-amt') == unit and txt(pg, '#read') == read and ('warn' in pg.get_attribute('#read', 'class')) == (cls == 'warn'), f'[L5] 연봉 칸 "{text}" → 단위 "{txt(pg, "#u-amt")}" / {txt(pg, "#read")}')
            a, b_ = pay(pg, 'P.netPay({amount:999990000,basis:"annual"}).net'), pay(pg, 'P.netPay({amount:1000000000,basis:"annual"}).net')
            pg.fill('#amt', '99999'); n1 = net(pg); pg.fill('#amt', '100000'); n2 = net(pg)
            ok(n1 == f(a) and n2 == f(b_) and b_ > a, f'[L5 평가] 99999 → 100000 에서 읽는 단위가 뒤집히지 않는다(둘 다 만 원) = {n1} → {n2}')
            pos = pg.evaluate('(() => { const i = document.getElementById("amt").getBoundingClientRect(), u = document.getElementById("u-amt").getBoundingClientRect(); return [u.left > i.left && u.right <= i.right && u.top >= i.top && u.bottom <= i.bottom, parseFloat(getComputedStyle(document.getElementById("amt")).paddingRight) >= u.width + 10]; })()')
            ok(pos == [True, True], f'[L4] 단위는 칸 안 오른쪽에 있고 글자가 그 밑으로 들어가지 않는다 {pos}')
            pg.fill('#amt', '4000'); pg.click('#optsBtn')
            ok(pg.input_value('#o-nontax') == '20' and txt(pg, '#u-o-nontax') == '만 원', f'[L4] 비과세 칸의 처음 값은 20(만 원) = {pg.input_value("#o-nontax")} {txt(pg, "#u-o-nontax")}')
            pg.fill('#o-nontax', '20')
            ok(net(pg) == '2,935,813' and txt(pg, '#r-o-nontax') == '20만 원(200,000원)으로 읽었어요' and '비과세 20만 원' in txt(pg, '#optsSum'), f'[L4 평가] 비과세 20 = 20만 원(전에는 20원) = {net(pg)} / {txt(pg, "#r-o-nontax")}')
            pg.fill('#o-nontax', '30')
            ok(net(pg) == f(pay(pg, 'P.netPay({amount:40000000,basis:"annual",nontax:300000}).net')) and '비과세 30만 원' in txt(pg, '#optsSum'), f'[L4] 비과세 30 = 30만 원 = {net(pg)}')
            for bad in ('abc', '1e5', '-3'):
                pg.fill('#o-nontax', bad)
                ok('비과세 금액을 읽지 못했어요. 앞서 넣은 금액으로 계산하고 있어요.' in txt(pg, '#r-o-nontax') and 'err' in pg.get_attribute('#r-o-nontax', 'class') and pg.get_attribute('#o-nontax', 'aria-invalid') == 'true'
                   and net(pg) == f(pay(pg, 'P.netPay({amount:40000000,basis:"annual",nontax:300000}).net')), f'[L4 평가] 비과세 "{bad}" 는 못 읽었다고 알리고 앞의 값으로 = {txt(pg, "#r-o-nontax")}')
            pg.fill('#o-nontax', '500')
            ok(txt(pg, '#r-o-nontax') == '비과세가 월급(3,333,333원)보다 커요. 월급만큼만 뺐어요.' and 'warn' in pg.get_attribute('#r-o-nontax', 'class') and pg.get_attribute('#o-nontax', 'aria-invalid') is None and net(pg) == '3,333,333', f'[L4 평가] 비과세가 월급보다 크면 알린다 = {txt(pg, "#r-o-nontax")}')
            shot(pg, 'ko-home-nontax-desktop')
            pg.fill('#o-nontax', ''); ok('비과세 없음' in txt(pg, '#optsSum') and net(pg) == f(pay(pg, 'P.netPay({amount:40000000,basis:"annual",nontax:0}).net')), '[L4] 비과세를 비우면 0원')
            c.close()
            c = ctx(path='/en/'); pg = open_page(c, '/en/'); pg.wait_for_timeout(400); pg.fill('#amt', '40,000,000'); pg.click('#optsBtn')
            ok(pg.input_value('#o-nontax') == '200,000' and txt(pg, '#u-o-nontax') == 'won', f'[L4] en: 비과세 칸은 원 그대로 = {pg.input_value("#o-nontax")}')
            pg.fill('#o-nontax', '5000000')
            ok('Non-taxable pay is larger than the monthly pay (₩3,333,333)' in txt(pg, '#r-o-nontax') and pg.evaluate(HANGUL) == [], f'[L4] en: 비과세가 월급보다 크면 알린다 = {txt(pg, "#r-o-nontax")[:50]}'); c.close()

            # [L15] 오류는 화면 낭독기에도 알린다: aria-invalid, 읽는 줄(live)
            c = ctx(path='/'); pg = open_page(c, '/'); pg.wait_for_timeout(400)
            pg.fill('#amt', '-5'); pg.wait_for_timeout(800)
            ok(pg.get_attribute('#amt', 'aria-invalid') == 'true' and pg.get_attribute('#amt', 'aria-describedby') == 'read' and 'err' in pg.get_attribute('#read', 'class') and txt(pg, '#live') == '0보다 작은 금액은 계산하지 않아요.' and pg.get_attribute('#live', 'aria-live') == 'polite',
               f'[L15 평가] -5 → aria-invalid, live 줄 = {pg.get_attribute("#amt", "aria-invalid")} / {txt(pg, "#live")}')
            border = pg.evaluate('getComputedStyle(document.getElementById("amt")).borderColor'); pg.fill('#amt', '4000'); pg.wait_for_timeout(800)
            ok(pg.get_attribute('#amt', 'aria-invalid') is None and txt(pg, '#live') == '한 달 실수령액 2,935,813원' and pg.evaluate('getComputedStyle(document.getElementById("amt")).borderColor') != border, f'[L15] 고치면 표시가 풀리고 결과를 읽어 준다 = {txt(pg, "#live")}'); c.close()
            c = ctx(path='/annual-leave/'); pg = open_page(c, '/annual-leave/'); pg.wait_for_timeout(300)
            pg.fill('#f-join', '2020-03-02'); ok(pg.get_attribute('#f-join', 'aria-invalid') is None, '[L15] 연차: 맞는 날짜'); c.close()
            c = ctx(path='/hourly/'); pg = open_page(c, '/hourly/'); pg.wait_for_timeout(300); pg.fill('#amt', 'abc'); pg.wait_for_timeout(800)
            ok(pg.get_attribute('#amt', 'aria-invalid') == 'true' and '금액을 읽지 못했어요.' in txt(pg, '#live'), f'[L15] 시급: 못 읽는 금액 = {txt(pg, "#live")}'); c.close()

            # [L9] 출처 링크는 새 탭으로 열리고, 다른 페이지에 갔다 와도 넣은 값이 남는다(이 탭에서만)
            c = ctx(path='/'); errs = []; pg = open_page(c, '/', errs); pg.wait_for_timeout(400)
            links = pg.evaluate('[...document.querySelectorAll("main a[href^=http]")].filter(a => !/lumenlab\\.page/.test(a.href)).map(a => [a.target, a.rel, a.href])')
            ok(len(links) >= 12 and all(t == '_blank' and 'noopener' in r for t, r, _ in links), f'[L9] /: 출처 링크 {len(links)}개가 전부 새 탭(noopener)')
            pg.fill('#amt', '5,500만'); pg.click('#optsBtn'); pg.click('[data-k="family"] button >> nth=1'); pg.fill('#o-nontax', '10'); pg.click('[data-k="ratio"] [data-v="80"]'); pg.check('#o-age60'); pg.wait_for_timeout(300)
            before = [pg.input_value('#amt'), net(pg), txt(pg, '#optsSum')]
            c.route(re.compile(r'law\.go\.kr|nps\.or\.kr|nhis\.or\.kr|mohw\.go\.kr|moel\.go\.kr|minimumwage\.go\.kr'), lambda r: r.fulfill(body='<title>source</title>', content_type='text/html'))
            with c.expect_page() as newp:
                pg.locator('#basis .srcs a').first.click()
            np_ = newp.value; np_.wait_for_load_state()
            ok(len(c.pages) == 2 and pg.url == BASE + '/' and [pg.input_value('#amt'), net(pg), txt(pg, '#optsSum')] == before and np_.evaluate('window.opener') is None, f'[L9 평가] 출처 링크는 새 탭으로 열리고 계산기는 그대로 = {before}')
            np_.close()
            pg.goto(BASE + '/about/', wait_until='load'); pg.wait_for_timeout(200); pg.go_back(wait_until='load'); pg.wait_for_timeout(700)
            ok([pg.input_value('#amt'), net(pg), txt(pg, '#optsSum')] == before and before[1] == f(pay(pg, 'P.netPay({amount:55000000,basis:"annual",family:2,nontax:100000,ratio:80,noPension:true}).net')) and pg.input_value('#o-nontax') == '10' and pg.is_checked('#o-age60'), f'[L9 평가] 다른 페이지에 갔다 돌아와도 입력이 남는다 = {[pg.input_value("#amt"), net(pg), txt(pg, "#optsSum")]}')
            ok(pg.locator('#slip .tag-ex').count() == 0 and pg.locator('#slip .dbl.draw').count() == 0, '[L9] 되살릴 때는 예시 꼬리표가 없고 밑줄을 다시 긋지 않는다')
            pg.reload(wait_until='load'); pg.wait_for_timeout(700)
            ok([pg.input_value('#amt'), net(pg), txt(pg, '#optsSum')] == before, '[L9] 새로 고쳐도 남는다(같은 탭)')
            ok(pg.evaluate('Object.keys(localStorage).length') == 0 and pg.evaluate('Object.keys(sessionStorage).join(",")') == 'tk.in' and pg.evaluate('document.cookie') == '', '[L9] 쓰는 저장소는 sessionStorage 의 tk.in 하나')
            pg2 = c.new_page(); pg2.goto(BASE + '/', wait_until='load'); pg2.wait_for_timeout(500)
            ok(pg2.input_value('#amt') == '' and pg2.locator('#slip .tag-ex').count() == 1, '[L9] 새 탭에는 따라오지 않는다(이 탭을 닫으면 사라진다)'); pg2.close()
            ok(not errs, f'[L9] 콘솔 오류 {errs[:2]}'); c.close()
            # 되살릴 때 화면이 밀리지 않는다(처음 온 방문자의 글꼴 그대로, 휴대폰·컴퓨터)
            for (w, h, mobile) in ((390, 844, True), (1366, 768, False)):
                c = ctx(w, h, mobile, path='/', real_font=True); pg = open_page(c, '/'); pg.wait_for_timeout(400)
                pg.fill('#amt', '1억 2천'); pg.click('#optsBtn'); pg.check('#o-age'); pg.click('#optsBtn'); pg.wait_for_timeout(300)
                pg.reload(wait_until='load'); pg.wait_for_timeout(1500)
                cls = pg.evaluate('window.__cls')
                ok(pg.input_value('#amt') == '1억 2천' and net(pg) == f(pay(pg, 'P.netPay({amount:120000000,basis:"annual",noPension:true,noEmployment:true}).net')) and cls <= 0.02, f'[L9] {w}px: 되살릴 때 화면 밀림 {cls:.3f}')
                c.close()
            for path, fill, check in (
                    ('/severance/', lambda g: (g.fill('#f-join', '2020-03-02'), g.fill('#f-leave', '2026-05-31'), g.fill('#f-wages', '900')), lambda g: [g.input_value('#f-join'), g.input_value('#f-leave'), g.input_value('#f-wages'), net(g)] == ['2020-03-02', '2026-05-31', '900', '18,541,924']),
                    ('/hourly/', lambda g: (g.fill('#amt', '12000'), g.fill('#f-hours', '20')), lambda g: [g.input_value('#amt'), g.input_value('#f-hours'), net(g)] == ['12000', '20', '1,251,429']),
                    ('/unemployment/', lambda g: (g.fill('#f-leave', '2026-03-31'), g.fill('#f-wages', '600'), g.select_option('#f-hours', '4')), lambda g: [g.input_value('#f-leave'), g.input_value('#f-wages'), g.input_value('#f-hours'), net(g)] == ['2026-03-31', '600', '4', '40,000']),
                    ('/annual-leave/', lambda g: g.fill('#f-join', '2020-03-02'), lambda g: g.input_value('#f-join') == '2020-03-02' and g.locator('#slip tr.me').count() == 1)):
                c = ctx(path=path, real_font=True); errs = []; pg = open_page(c, path, errs); pg.wait_for_timeout(400)
                fill(pg); pg.wait_for_timeout(300)
                pg.goto(BASE + '/privacy/', wait_until='load'); pg.go_back(wait_until='load'); pg.wait_for_timeout(900)
                ok(check(pg) and not errs, f'[L9] {path}: 갔다 와도 입력과 결과가 남는다 {errs[:1]}')
                pg.reload(wait_until='load'); pg.wait_for_timeout(1200)
                ok(check(pg) and pg.evaluate('window.__cls') <= 0.02, f'[L9] {path}: 새로 고쳐도 남고 화면 밀림 {pg.evaluate("window.__cls"):.3f}')
                c.close()
            c = ctx(path='/privacy/'); pg = open_page(c, '/privacy/'); pg.wait_for_timeout(300)
            ok('이 탭을 닫으면 사라져요' in txt(pg, 'main') and 'sessionStorage' in txt(pg, 'main') and 'tk.in' in txt(pg, 'main') and '브라우저 종류' in txt(pg, 'main') and '성능 정보' in txt(pg, 'main'), '[L9·방침] 방침에 입력 유지와 방문 통계 문장'); shot(pg, 'ko-privacy-desktop', full=True); c.close()

            # 좁은 화면: 바로 넣기 단추 넷이 한 줄, 비과세 칸의 단위가 칸 안에
            for w, h in ((320, 640), (360, 740), (390, 844)):
                for path in ('/', '/en/'):
                    c = ctx(w, h, True, path=path); pg = open_page(c, path); pg.wait_for_timeout(400)
                    rows_ = pg.evaluate('new Set([...document.querySelectorAll("#quick button")].map(e => Math.round(e.getBoundingClientRect().top))).size')
                    pg.click('#optsBtn'); pg.wait_for_timeout(200)
                    inside = pg.evaluate('(() => { const i = document.getElementById("o-nontax").getBoundingClientRect(), u = document.getElementById("u-o-nontax").getBoundingClientRect(); return u.left >= i.left && u.right <= i.right && u.top >= i.top && u.bottom <= i.bottom; })()')
                    ok(rows_ == 1 and inside, f'[L4·L7] {path} {w}px: 바로 넣기 단추 {rows_}줄, 비과세 단위가 칸 안({inside})')
                    c.close()
            # [글꼴] 화면 글자는 이 사이트의 조각(TK Sans) 하나로 그린다: 모든 페이지에서 다른 글꼴 요청 0(jsDelivr 에 접속하지 않는다)
            FJ = __import__('json').loads((ROOT / '_dev' / 'fonts.json').read_text(encoding='utf-8'))
            for (w, h, mobile) in ((1366, 768, False), (390, 844, True)):
                c = ctx(w, h, mobile, path='/')
                cdn, own = [], []
                c.on('request', lambda r: (own.append(r.url) if '/assets/fonts/' in r.url else cdn.append(r.url) if r.resource_type == 'font' or 'jsdelivr' in r.url else None))
                for path in paths + ['/404-nope', '/en/nope/']:
                    cdn.clear(); own.clear()
                    pg = open_page(c, path); pg.wait_for_timeout(350)
                    if path in ('/', '/en/'):
                        pg.fill('#amt', '5500' if path == '/' else '55,000,000'); pg.click('#optsBtn'); pg.click('#slip .how'); pg.click('#slip [data-act="period"]'); pg.check('#o-age'); pg.fill('#o-nontax', 'abc'); pg.fill('#amt', '-5'); pg.wait_for_timeout(300)
                    if path.endswith('severance/'):
                        pg.click('#b-ex'); pg.fill('#f-leave', '2026-05-31'); pg.fill('#f-wages', 'abc'); pg.check('#f-u15'); pg.wait_for_timeout(200)
                    if path.endswith('hourly/'):
                        pg.fill('#amt', '12000'); pg.fill('#f-hours', '14.99'); pg.click('#mode [data-v="monthly"]'); pg.fill('#f-hours', 'x'); pg.wait_for_timeout(200)
                    if path == '/unemployment/':
                        pg.fill('#f-leave', '2027-01-15'); pg.fill('#f-wages', '900'); pg.wait_for_timeout(200); pg.fill('#f-leave', '2028-01-01'); pg.wait_for_timeout(200)
                    if path == '/annual-leave/':
                        pg.fill('#f-join', '2020-03-02'); pg.wait_for_timeout(200)
                    if path.endswith('table/'):
                        pg.fill('#find', '5500'); pg.click('#b-all'); pg.wait_for_timeout(300)
                    pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(200)
                    lang_ = 'en' if path.startswith('/en/') and 'nope' not in path else 'ko'
                    loaded = pg.evaluate('[...document.fonts].filter(f => f.family.replace(/["\']/g, "") === "TK Sans").map(f => f.status)')
                    ok(cdn == [] and loaded == ['loaded'] and len(own) == 1 and own[0].endswith(FJ[lang_]['file']), f'[글꼴] {path} {w}px: 글꼴은 이 사이트의 조각 하나만 받는다(다른 글꼴 요청 0) = {loaded} / {[u.rsplit("/", 1)[-1] for u in own]} / {[u.rsplit("/", 1)[-1] for u in cdn][:3]}')
                    pg.close()
                c.close()
            # 실제 CSS(font-display: optional) 그대로: 처음 온 방문자도 첫 그림부터 조각 글꼴을 쓰는지(쓰지 못해도 화면은 안 밀린다. 참고로 적는다)
            c = ctx(path='/', real_font=True); hit = 0
            for path in ('/', '/en/', '/severance/', '/guide/2026-4dae-boheom-yoyul/', '/about/'):
                pg = open_page(c, path); pg.wait_for_timeout(900)
                cdp = c.new_cdp_session(pg); cdp.send('DOM.enable'); cdp.send('CSS.enable')
                node = cdp.send('DOM.querySelector', {'nodeId': cdp.send('DOM.getDocument')['root']['nodeId'], 'selector': 'h1'})['nodeId']
                used = [x['familyName'] for x in cdp.send('CSS.getPlatformFontsForNode', {'nodeId': node})['fonts']]
                hit += used == ['TK Sans']
                ok(pg.evaluate('window.__cls') <= 0.02, f'[글꼴] {path}: 실제 CSS 에서 화면 밀림 {pg.evaluate("window.__cls"):.3f}')
                pg.close()
            notes.append(f'실제 CSS(optional)에서 첫 그림부터 조각 글꼴로 그린 페이지 {hit}/5')
            c.close()
            # 어두운 화면·좁은 화면에서 새로 생긴 것들(단위, 알림 색, 44px)
            c = ctx(320, 640, True, path='/', dark=True); pg = open_page(c, '/'); pg.wait_for_timeout(400); pg.fill('#amt', '100000'); pg.click('#optsBtn'); pg.fill('#o-nontax', 'abc'); pg.wait_for_timeout(300)
            ok(hscroll(pg) <= 0 and pg.evaluate(SMALL) == [], f'[L7] 320px 어두운 화면: 가로 스크롤 0, 작은 누르는 곳 {pg.evaluate(SMALL)[:3]}')
            warn = pg.evaluate('[getComputedStyle(document.getElementById("read")).color, getComputedStyle(document.getElementById("r-o-nontax")).color, getComputedStyle(document.body).backgroundColor]')
            ok(len(set(warn)) == 3, f'어두운 화면: 알림(호박색)·오류(붉은색)가 바탕과 다른 색 {warn}'); shot(pg, 'ko-home-320-dark-units', full=True); c.close()

        b.close()
    print(f'{"실패" if fails else "통과"}  화면 확인: {passed}개 통과' + (f', {len(fails)}개 실패' if fails else '') + (' · ' + ' · '.join(notes) if notes else ''))
    for m in fails[:60]:
        print('   -', m)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
