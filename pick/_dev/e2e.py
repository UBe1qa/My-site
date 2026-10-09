#!/usr/bin/env python3
"""브라우저로 하는 확인(Playwright): 먼저 `node pick/_dev/serve.mjs` 를 띄우고  python3 -B pick/_dev/e2e.py [묶음…]
묶음: tools(도구를 실제로 눌러 결과 확인) pages(모든 페이지 320px·콘솔·깨진 그림) cls(화면 밀림) ads(광고 미리보기 거리)
      misc(저장 키·바깥 요청·404·어두운 화면·동작 줄이기·발표 화면·루멘랩 칸·500칸) shots(최종 스크린샷). 안 적으면 전부.
환경 변수: PW_CHROME(크롬 실행 파일), PICK_FONT(Pretendard .woff2. CDN을 못 받는 곳에서 대신 줌), PICK_SHOTS(스크린샷 폴더), PICK_BASE.
광고 요청은 늘 막는다. 브라우저는 하나만 띄운다. 결과는 통과 / 실패 / 못 함."""
import io
import json
import os
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE = os.environ.get('PICK_BASE', 'http://localhost:8442')
EXE = os.environ.get('PW_CHROME') or None
FONT = os.environ.get('PICK_FONT')
SHOTS = os.environ.get('PICK_SHOTS')
FONT_CSS = '@font-face{font-family:"Pretendard Variable";font-weight:45 920;font-display:swap;src:url(https://cdn.jsdelivr.net/__local/p.woff2) format("woff2-variations")}'
ADS = re.compile(r'googlesyndication|doubleclick|adservice|fundingchoices')
HANGUL = re.compile(r'[가-힣ㄱ-ㆎ]')
PATHS = {
    'ko': {'wheel': '/ko/', 'ladder': '/ko/ladder/', 'draw': '/ko/draw/', 'teams': '/ko/teams/', 'number': '/ko/number/', 'coin': '/ko/coin/', 'dice': '/ko/dice/'},
    'en': {'wheel': '/', 'ladder': '/ladder/', 'draw': '/name-picker/', 'teams': '/team-generator/', 'number': '/random-number/', 'coin': '/coin-flip/', 'dice': '/dice/'},
}
ALL = [u[len('https://pick.lumenlab.page'):] for u in re.findall(r'<loc>(.*?)</loc>', (ROOT / 'sitemap.xml').read_text())]
results = []
want = set(sys.argv[1:]) or {'tools', 'pages', 'cls', 'ads', 'misc', 'shots'}


def ok(cond, name, detail=''):
    results.append(('통과' if cond else '실패', name, str(detail)))
    if not cond:
        print('  실패', name, detail, flush=True)


def skip(name, why):
    results.append(('못 함', name, why))


class Ctx:
    """브라우저 문맥 하나 + 콘솔 오류·요청 기록"""

    def __init__(self, b, w=1366, h=768, mobile=False, lang='ko', font_delay=0, **kw):
        self.ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile,
                                 locale=kw.pop('locale', 'ko-KR' if lang == 'ko' else 'en-US'), **kw)
        self.errors = []
        self.hosts = set()
        self.ctx.route(ADS, lambda r: r.abort())
        if FONT:
            data = Path(FONT).read_bytes()

            def cdn(route):
                if font_delay:
                    time.sleep(font_delay / 1000)
                if route.request.url.endswith('.woff2'):
                    return route.fulfill(body=data, content_type='font/woff2', headers={'access-control-allow-origin': '*'})
                return route.fulfill(body=FONT_CSS, content_type='text/css', headers={'access-control-allow-origin': '*'})
            self.ctx.route(re.compile(r'cdn\.jsdelivr\.net'), cdn)
        self.page = self.ctx.new_page()
        self.page.on('console', lambda m: self.errors.append(m.text) if m.type == 'error' and not ADS.search(m.location.get('url', '')) and '__no-such-page' not in m.location.get('url', '') else None)
        self.page.on('pageerror', lambda e: self.errors.append('PAGEERROR ' + str(e)))
        self.page.on('request', lambda r: self.hosts.add(re.sub(r'^https?://([^/]+).*', r'\1', r.url)))

    def open(self, path, wait=250):
        self.page.goto(BASE + path, wait_until='load')
        self.page.evaluate('document.fonts.ready')
        self.page.wait_for_timeout(wait)
        return self.page

    def close(self):
        self.ctx.close()


def state(page):
    return page.evaluate('''() => { const s = window.__pick && window.__pick.state; return s ? JSON.parse(JSON.stringify(s, (k, v) => (v instanceof Uint8Array ? '[seed]' : v))) : null; }''')


def wheel_done(page, timeout=20000):
    page.wait_for_function('window.__pick && !window.__pick.state.spinning && window.__pick.state.last', timeout=timeout)


def pixel(page, x, y):
    from PIL import Image
    img = Image.open(io.BytesIO(page.screenshot(clip={'x': x - 2, 'y': y - 2, 'width': 4, 'height': 4}))).convert('RGB')
    return img.getpixel((2, 2))


def under_needle(page):
    box = page.evaluate("(() => { const r = document.querySelector('#wheel').getBoundingClientRect(); return [r.left, r.top, r.width]; })()")
    return pixel(page, box[0] + box[2] / 2 + box[2] / 2 * 0.855, box[1] + box[2] / 2)  # 이름 글자 끝(0.82)과 바늘 끝(0.89) 사이


def slice_color(page, index, n):
    return page.evaluate('''async ([i, n]) => { const { sliceColorCount } = await import('/assets/core/pick.js'); const m = sliceColorCount(n);
      const c = getComputedStyle(document.documentElement).getPropertyValue('--s' + (i % m + 1)).trim(); return [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)); }''', [index, n])


def hangul_leaks(page):
    return page.evaluate('''() => { const re = /[\\uac00-\\ud7a3\\u3131-\\u318e]/; const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const n = w.currentNode; if (!re.test(n.nodeValue)) continue; const p = n.parentElement; if (!p || p.closest('[lang="ko"], script, style')) continue; out.push(n.nodeValue.trim().slice(0, 30)); }
      for (const e of document.querySelectorAll('[aria-label], [title], [placeholder]')) { if (e.closest('[lang="ko"]')) continue; for (const a of ['aria-label', 'title', 'placeholder']) if (re.test(e.getAttribute(a) || '')) out.push(a + '=' + e.getAttribute(a)); }
      for (const e of document.querySelectorAll('input, textarea')) if (re.test(e.value || '')) out.push('value=' + e.value.slice(0, 20));
      return out; }''')


def replay(c, lang, tool, expect, read):
    """링크 복사 → 새 탭에서 열어 같은 결과인지"""
    page = c.page
    page.click('#copy')
    page.wait_for_timeout(250)
    url = page.evaluate('navigator.clipboard.readText()')
    ok(re.match(r'^' + re.escape(BASE + PATHS[lang][tool]) + r'#r=1\.[a-z]\.[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]+$', url or '') is not None, f'{lang} {tool}: 링크 복사(주소 꼴, {len(url or "")}자)')
    p2 = c.ctx.new_page()
    p2.goto(url, wait_until='load')
    if tool == 'wheel':
        wheel_done(p2)
    else:
        p2.wait_for_function('window.__pick && window.__pick.state', timeout=10000)
    p2.wait_for_timeout(200)
    got = read(p2)
    ok(got == expect, f'{lang} {tool}: 링크로 열면 같은 결과', f'{str(got)[:80]} / {str(expect)[:80]}')
    ok(p2.locator('.stamp:visible').count() >= 1, f'{lang} {tool}: 링크로 연 결과에 확인 도장')
    ok(p2.evaluate("localStorage.getItem('pick.history')") == page.evaluate("localStorage.getItem('pick.history')"), f'{lang} {tool}: 링크로 다시 볼 때는 기록에 더하지 않음')
    p2.close()


def tools(b):
    for lang in ('ko', 'en'):
        c = Ctx(b, lang=lang, permissions=['clipboard-read', 'clipboard-write'])
        page = c.page
        P = PATHS[lang]
        # ---- 돌림판 ----
        c.open(P['wheel'])
        for i in range(2):
            page.evaluate('window.__pick.state.last = null')
            page.click('#go')
            page.wait_for_function('window.__pick.state.spinning === true || window.__pick.state.last', timeout=5000)
            wheel_done(page)
            page.wait_for_timeout(350)
            st = state(page)
            shown = page.inner_text('#rname')
            px, exp = under_needle(page), slice_color(page, st['last']['index'], len(st['items']))
            ok(shown == st['last']['name'] == st['items'][st['last']['index']], f'{lang} 돌림판 {i + 1}: 결과 글자 = 뽑힌 이름', shown)
            ok(max(abs(px[k] - exp[k]) for k in range(3)) <= 8, f'{lang} 돌림판 {i + 1}: 바늘 아래 화면 색 = 뽑힌 칸 색', f'{px} {exp}')
        ok(page.evaluate("getComputedStyle(document.querySelector('#wheel canvas')).transform") in ('none', 'matrix(1, 0, 0, 1, 0, 0)'), f'{lang} 돌림판: 멈춘 뒤에는 CSS 회전 없음(이름을 읽히는 방향으로 다시 그림)')
        before = len(state(page)['items'])
        gone = state(page)['last']['name']
        expect = None
        page.click('#again')
        page.wait_for_function('window.__pick.state.spinning === true', timeout=5000)
        wheel_done(page)
        page.wait_for_timeout(300)
        st = state(page)
        ok(len(st['items']) == before - 1 and gone not in st['items'], f'{lang} 돌림판: 빼고 다시({before} → {len(st["items"])})')
        ok(page.locator('#history li').count() == 3, f'{lang} 돌림판: 뽑힌 순서 3개')
        replay(c, lang, 'wheel', [st['last']['name'], st['items']], lambda p: [p.inner_text('#rname'), state(p)['items']])
        # 명단 도구: 섞기·가나다순·겹친 이름 지우기·지우기
        page.fill('#names', '다\n가\n나\n가')
        page.wait_for_timeout(350)
        ok(len(state(page)['items']) == 4 and page.inner_text('#listwarn') != '', f'{lang} 명단: 겹친 이름 알림')
        page.click('#dedupe'); page.click('#sortaz')
        ok(state(page)['items'] == ['가', '나', '다'], f'{lang} 명단: 겹친 이름 지우기 + 가나다순', state(page)['items'])
        page.click('#shuffle')
        ok(sorted(state(page)['items']) == ['가', '나', '다'], f'{lang} 명단: 섞기')
        page.wait_for_timeout(400)
        ok(sorted(page.evaluate("localStorage.getItem('pick.list')").split('\n')) == ['가', '나', '다'], f'{lang} 명단: 이 기기에 저장')
        page.fill('#names', '')
        page.wait_for_timeout(100)
        page.click('#go')
        ok(not state(page)['spinning'] and state(page)['last'] is None and len(page.inner_text('#rname')) > 5, f'{lang} 돌림판: 빈 명단이면 돌지 않고 안내')
        page.click('#listclear')
        page.wait_for_timeout(400)
        ok(len(state(page)['items']) == 8 and page.evaluate("localStorage.getItem('pick.list')") is None, f'{lang} 명단: 지우면 예시로 돌아가고 저장도 지움')
        # ---- 사다리 ----
        c.open(P['ladder'])
        page.click('#go')
        page.wait_for_function('window.__pick.state', timeout=5000)
        st = state(page)
        n = len(st['items'])
        ok(sorted(st['result']) == list(range(n)) and sorted(st['ends']) == list(range(n)), f'{lang} 사다리: 결과가 일대일')
        ok(page.locator('.lad-rung').first.evaluate("e => e.parentNode.getAttribute('visibility')") == 'hidden', f'{lang} 사다리: 타기 전에는 가로줄이 가려져 있음')
        page.locator('.lad-top').nth(1).click()
        page.wait_for_function('window.__pick.state.open.length === 1', timeout=8000)
        PAIRS = "[...document.querySelectorAll('.pairs li')].map((li) => [li.querySelector('b').textContent, li.querySelector('span').textContent])"
        row = page.evaluate(PAIRS)
        ok(row == [[st['items'][1], st['labels'][st['result'][1]]]], f'{lang} 사다리: 한 명 따라가기 결과 = 계산한 결과', row)
        page.click('#showall')
        page.wait_for_timeout(200)
        rows = page.evaluate(PAIRS)
        ok(rows == [[st['items'][i], st['labels'][st['result'][i]]] for i in range(n)], f'{lang} 사다리: 전체 결과 = 계산한 결과')
        bots = page.evaluate("[...document.querySelectorAll('.lad-bot')].map((b) => b.querySelector('title') ? b.querySelector('title').textContent : null)")
        ok(all(bots[st['ends'][i]] == st['labels'][st['result'][i]] for i in range(n)), f'{lang} 사다리: 그린 사다리의 아래 칸 = 결과', bots)
        replay(c, lang, 'ladder', [st['result'], st['labels']], lambda p: [state(p)['result'], state(p)['labels']])
        page.fill('#names', '\n'.join(f'p{i}' for i in range(31)))
        page.click('#go')
        ok(state(page) is None and page.inner_text('#msg') != '', f'{lang} 사다리: 31명이면 만들지 않고 알림', page.inner_text('#msg'))
        page.fill('#names', '\n'.join(f'p{i}' for i in range(30)))
        page.click('#go')
        ok(state(page) and sorted(state(page)['result']) == list(range(30)), f'{lang} 사다리: 30명')
        page.click('#listclear'); page.wait_for_timeout(350)
        # ---- 제비뽑기 ----
        c.open(P['draw'])
        page.fill('#m', '3')
        page.click('#go')
        names = page.locator('.picked li span').all_inner_texts()
        st = state(page)
        ok(len(names) == 3 and len(set(names)) == 3 and all(x in st['items'] for x in names), f'{lang} 제비뽑기: 3명, 중복 없음', names)
        replay(c, lang, 'draw', names, lambda p: p.locator('.picked li span').all_inner_texts())
        page.fill('#m', '9')
        page.click('#go')
        ok(page.inner_text('#msg') != '' and page.locator('.picked').count() == 0, f'{lang} 제비뽑기: 명단보다 많이 뽑으면 알림')
        page.click('#mode [data-v="slips"]')
        page.fill('#m', '2')
        page.click('#go')
        ok(page.locator('.slip').count() == 8 and page.locator('.slip.open').count() == 0, f'{lang} 쪽지: 8장이 접힌 채로')
        page.locator('.slip').first.click()
        ok(page.locator('.slip.open').count() == 1, f'{lang} 쪽지: 눌러서 펼치기')
        page.locator('.out-head .btn').click()
        ok(page.locator('.slip.open').count() == 8 and page.locator('.slip.win').count() == 2, f'{lang} 쪽지: 모두 펼치면 당첨 2장')
        wins = page.locator('.slip.win b').all_inner_texts()
        replay(c, lang, 'draw', wins, lambda p: p.locator('.slip.win b').all_inner_texts())
        page.click('#mode [data-v="order"]')
        page.click('#go')
        order = page.locator('.picked li span').all_inner_texts()
        ok(sorted(order) == sorted(state(page)['items']) and page.locator('#fcount').is_hidden(), f'{lang} 순서 정하기: 전원이 한 번씩')
        # ---- 팀 ----
        c.open(P['teams'])
        page.fill('#k', '3')
        page.click('#go')
        teams = [t.locator('li').all_inner_texts() for t in page.locator('.team').all()]
        flat = [x for t in teams for x in t]
        ok([len(t) for t in teams] == [3, 3, 2] and sorted(flat) == sorted(state(page)['items']), f'{lang} 팀: 8명 3팀 → 3·3·2, 전원 한 번씩', [len(t) for t in teams])
        page.click('#copytext'); page.wait_for_timeout(200)
        txt = page.evaluate('navigator.clipboard.readText()')
        ok(txt.count('\n') == 2 and all(x in txt for x in flat), f'{lang} 팀: 글자로 복사')
        replay(c, lang, 'teams', teams, lambda p: [t.locator('li').all_inner_texts() for t in p.locator('.team').all()])
        page.click('#mode [data-v="size"]')
        page.fill('#k', '3')
        page.click('#go')
        ok([t.locator('li').count() for t in page.locator('.team').all()] == [3, 3, 2], f'{lang} 팀: 한 팀 최대 3명 → 3·3·2')
        page.fill('#k', '0')
        page.click('#go')
        ok(page.inner_text('#msg') != '' and page.locator('.team').count() == 0, f'{lang} 팀: 0이면 알림')
        # ---- 숫자 ----
        c.open(P['number'])
        page.fill('#min', '1'); page.fill('#max', '45'); page.fill('#count', '6'); page.check('#unique'); page.select_option('#sort', 'asc')
        page.click('#go')
        nums = [int(x.replace(',', '')) for x in page.locator('.bignums span').all_inner_texts()]
        ok(len(nums) == 6 and len(set(nums)) == 6 and nums == sorted(nums) and all(1 <= x <= 45 for x in nums), f'{lang} 숫자: 1~45 중복 없이 6개, 오름차순', nums)
        replay(c, lang, 'number', nums, lambda p: [int(x.replace(',', '')) for x in p.locator('.bignums span').all_inner_texts()])
        for a, z, cnt, why in (('9', '3', '1', '순서'), ('1', '5', '6', '중복 없이 모자람'), ('1.5', '3', '1', '소수'), ('1', '5', '0', '0개'), ('1', '9999999999999999', '1', '너무 큼')):
            page.fill('#min', a); page.fill('#max', z); page.fill('#count', cnt)
            page.click('#go')
            ok(page.inner_text('#msg') != '' and page.locator('#after[data-off]').count() == 1, f'{lang} 숫자: 틀린 입력({why})은 답 대신 알림')
        page.fill('#min', '-5'); page.fill('#max', '5'); page.fill('#count', '200'); page.uncheck('#unique')
        page.click('#go')
        many = [int(x.replace(',', '').replace('−', '-')) for x in page.locator('.bignums span').all_inner_texts()]
        ok(len(many) == 200 and min(many) >= -5 and max(many) <= 5, f'{lang} 숫자: -5~5에서 200개')
        # ---- 동전 ----
        c.open(P['coin'])
        page.click('#go')
        face = page.inner_text('#coin')
        ok(face in (page.evaluate("JSON.parse(document.getElementById('i18n').textContent).heads"), page.evaluate("JSON.parse(document.getElementById('i18n').textContent).tails")), f'{lang} 동전: 앞 또는 뒤', face)
        page.fill('#count', '100')
        page.click('#go')
        ok(page.locator('#tally i').count() == 100 and len(state(page)['flips']) == 100, f'{lang} 동전: 100번')
        replay(c, lang, 'coin', state(page)['flips'], lambda p: state(p)['flips'])
        # ---- 주사위 ----
        c.open(P['dice'])
        page.click('#go')
        st = state(page)
        ok(len(st['vals']) == 2 and all(1 <= v <= 6 for v in st['vals']) and page.locator('.die svg').count() == 2 and [d.locator('circle').count() for d in page.locator('.die').all()] == st['vals'], f'{lang} 주사위: 2개, 점 수 = 값', st['vals'])
        ok(str(st['total']) in page.inner_text('.out-head'), f'{lang} 주사위: 합계')
        page.fill('#count', '5'); page.fill('#sides', '20')
        page.click('#go')
        st = state(page)
        ok(len(st['vals']) == 5 and all(1 <= v <= 20 for v in st['vals']) and [int(x) for x in page.locator('.die').all_inner_texts()] == st['vals'], f'{lang} 주사위: 20면 5개')
        replay(c, lang, 'dice', st['vals'], lambda p: state(p)['vals'])
        # 최근 결과
        page.locator('#recent summary').click()
        page.wait_for_timeout(250)
        ok(page.locator('#recent li a').count() >= 5, f'{lang} 최근 결과: 뽑은 것들이 다시 보기 링크와 함께 쌓임', page.locator('#recent li').count())
        page.click('#recentclear')
        ok(page.evaluate("localStorage.getItem('pick.history')") is None, f'{lang} 최근 결과: 기록 지우기')
        if lang == 'en':
            for tool in PATHS['en']:
                c.open(PATHS['en'][tool])
                if tool != 'wheel':
                    page.click('#go'); page.wait_for_timeout(150)
                leaks = hangul_leaks(page)
                ok(not leaks, f'en {tool}: 눌러 본 뒤에도 lang="ko" 밖 한글 없음', leaks[:3])
        ok(not c.errors, f'{lang} 도구: 콘솔 오류 0', c.errors[:3])
        ok(c.hosts <= {re.sub(r'^https?://', '', BASE), 'cdn.jsdelivr.net', 'pagead2.googlesyndication.com'}, f'{lang} 도구: 바깥 요청은 글꼴·광고 코드뿐(명단을 보내는 요청 없음)', sorted(c.hosts))
        keys = page.evaluate('Object.keys(localStorage).sort()')
        ok(set(keys) <= {'pick.list', 'pick.history', 'pick.sound', 'pick.lang'}, f'{lang} 도구: 저장 키는 방침에 적은 것뿐', keys)
        c.close()
    # 휴대폰(동작 줄이기): 도구마다 눌러 결과, 가로 스크롤 0
    for lang in ('ko', 'en'):
        c = Ctx(b, 390, 844, mobile=True, lang=lang, reduced_motion='reduce')
        for tool, path in PATHS[lang].items():
            page = c.open(path)
            page.tap('#go')
            page.wait_for_timeout(250)
            st = state(page)
            ok(st is not None and (tool != 'wheel' or (st['last'] and not st['spinning'])), f'{lang} 휴대폰 {tool}: 누르면 결과(동작 줄이기에서는 회전 없이 바로)')
            w = page.evaluate('[document.documentElement.scrollWidth, innerWidth]')
            ok(w[0] <= w[1], f'{lang} 휴대폰 {tool}: 가로 스크롤 0', w)
            hid = page.evaluate('''() => [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 30 && r.height > 12 && s.visibility !== 'hidden' && parseFloat(s.opacity) < 0.2 && !e.closest('[data-off]'); }).length''')
            ok(hid == 0, f'{lang} 휴대폰 {tool}: 동작 줄이기에서 숨은 채 남은 요소 0', hid)
        ok(not c.errors, f'{lang} 휴대폰: 콘솔 오류 0', c.errors[:3])
        c.close()
    # 375×667·1366×650 첫 화면: 돌리기 단추와 명단 입구
    for lang in ('ko', 'en'):
        for w, h, mob in ((375, 667, True), (390, 844, True), (1366, 650, False), (1366, 768, False)):
            c = Ctx(b, w, h, mobile=mob, lang=lang)
            page = c.open(PATHS[lang]['wheel'])
            m = page.evaluate('''() => { const r = (s) => { const e = document.querySelector(s).getBoundingClientRect(); return [Math.round(e.top), Math.round(e.bottom)]; }; return { go: r('#go'), wheel: r('#wheel'), name: r('#rname'), list: r('#list'), names: r('#names'), nav: r('.tools-nav'), h: innerHeight }; }''')
            ok(m['go'][1] <= m['h'] and m['name'][1] <= m['h'] and m['nav'][1] <= m['h'], f'{lang} {w}×{h}: 돌리기 단추·결과 자리·도구 메뉴가 첫 화면에', m)
            if not mob:
                ok(m['wheel'][1] <= m['h'] and m['names'][0] < m['h'] - 120, f'{lang} {w}×{h}: 판 전체와 명단 입력칸이 첫 화면에', m)
            elif h >= 800:
                ok(m['list'][0] < m['h'], f'{lang} {w}×{h}: 명단 입구가 첫 화면에 걸침', m)
            ok(page.locator('#go').count() == 1 and page.locator('.btn-go:visible').count() == 0, f'{lang} {w}×{h}: 돌리기 단추는 하나')
            c.close()


def pages(b):
    for w, h, mob in ((320, 640, True), (1366, 768, False)):
        c = Ctx(b, w, h, mobile=mob, lang='ko')
        bad_w, bad_img = [], []
        for path in ALL + ['/__no-such-page/']:
            page = c.open(path, wait=120)
            sw = page.evaluate('[document.documentElement.scrollWidth, innerWidth]')
            if sw[0] > sw[1]:
                bad_w.append((path, sw))
            if page.evaluate('[...document.images].filter((i) => i.complete && i.naturalWidth === 0).length'):
                bad_img.append(path)
        ok(not bad_w, f'{w}px: 모든 페이지 {len(ALL) + 1}쪽 가로 스크롤 0', bad_w[:3])
        ok(not bad_img, f'{w}px: 깨진 그림 0', bad_img[:3])
        ok(not c.errors, f'{w}px: 모든 페이지 콘솔 오류 0', c.errors[:3])
        c.close()
    c = Ctx(b, 390, 844, mobile=True, lang='ko')
    r = c.page.goto(BASE + '/__no-such-page/')
    ok(r.status == 404 and c.page.locator('a[href="/ko/"]').count() == 1 and c.page.locator('a[href="/"]').count() >= 1, '없는 주소: 404 상태 + 두 언어 첫 화면 링크', r.status)
    r = c.page.goto(BASE + '/_dev/build.py')
    ok(r.status == 404, '개발 파일(_dev)은 로컬 서버에서도 404', r.status)
    c.close()


CLS_JS = '''() => new Promise((res) => { let total = 0; const list = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { total += e.value; list.push([Math.round(e.value * 1000) / 1000, (e.sources || []).map((s) => s.node && (s.node.id || s.node.className || s.node.nodeName)).slice(0, 3)]); } }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => res([Math.round(total * 10000) / 10000, list.slice(0, 5)]), %d); })'''


def cls(b):
    if not FONT:
        skip('화면 밀림(CLS): 글꼴을 늦게 주는 조건', 'PICK_FONT 없음')
    cases = [('ko', 390, 844, True, '/ko/'), ('ko', 1366, 768, False, '/ko/'), ('en', 390, 844, True, '/'), ('en', 1366, 768, False, '/'),
             ('ko', 390, 844, True, '/ko/ladder/'), ('ko', 390, 844, True, '/ko/draw/'), ('ko', 390, 844, True, '/ko/teams/'), ('ko', 390, 844, True, '/ko/number/'),
             ('ko', 390, 844, True, '/ko/coin/'), ('ko', 390, 844, True, '/ko/dice/'), ('ko', 390, 844, True, '/ko/guide/ladder-fairness/'), ('en', 390, 844, True, '/guide/ladder-lottery-fairness/'),
             ('en', 1366, 768, False, '/ladder/'), ('ko', 1366, 768, False, '/ko/guide/ladder-fairness/')]
    for lang, w, h, mob, path in cases:
        worst = 0
        detail = None
        for attempt in range(2):
            # 가장 밀리기 쉬운 조건: 글꼴이 늦게 옴 + 저장된 명단이 있음 + 브라우저 언어가 페이지와 다름(언어 안내 띠) + 느린 CPU
            c = Ctx(b, w, h, mobile=mob, lang=lang, font_delay=900, locale='en-US' if lang == 'ko' else 'ko-KR')
            c.ctx.add_init_script("try { localStorage.setItem('pick.list', '하나\\n둘\\n셋\\n넷\\n다섯\\n여섯\\n일곱\\n여덟\\n아홉\\n열\\n열하나\\n열둘'); } catch (e) {}")
            cdp = c.ctx.new_cdp_session(c.page)
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
            c.page.goto(BASE + path, wait_until='load')
            val, entries = c.page.evaluate(CLS_JS % 3500)
            bar = c.page.locator('.lang-bar').count()
            c.close()
            worst, detail = val, entries
            if val <= 0.02:
                break
        ok(worst <= 0.02, f'CLS {lang} {w}px {path}: {worst} (글꼴 늦음·저장된 명단·언어 띠 {bar}개·CPU 4배)', detail)
    # 돌린 뒤 결과가 뜰 때 화면이 밀리지 않는다(누른 뒤 0.5초가 지난 밀림만 센다)
    for lang, w, h, mob in (('ko', 390, 844, True), ('ko', 1366, 768, False)):
        c = Ctx(b, w, h, mobile=mob, lang=lang)
        page = c.open(PATHS[lang]['wheel'])
        page.evaluate('''() => { window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shift += e.value; }).observe({ type: 'layout-shift' }); }''')
        page.click('#go')
        wheel_done(page)
        page.wait_for_timeout(600)
        v = page.evaluate('window.__shift')
        ok(v <= 0.02, f'CLS {lang} {w}px: 돌려서 결과가 뜨는 순간 화면 밀림 {round(v, 4)}')
        c.close()


def ads(b):
    for lang in ('ko', 'en'):
        for w, h, mob in ((390, 844, True), (1366, 768, False)):
            c = Ctx(b, w, h, mobile=mob, lang=lang)
            for tool, path in list(PATHS[lang].items()) + [('글', '/ko/guide/ladder-fairness/' if lang == 'ko' else '/guide/ladder-lottery-fairness/')]:
                page = c.open(path + '?adpreview', wait=100)
                if tool != '글':
                    (page.tap if mob else page.click)('#go')
                    page.wait_for_timeout(120 if tool != 'wheel' else 200)
                m = page.evaluate('''() => { const ads = [...document.querySelectorAll('.ad-wrap')].filter((e) => !e.hidden).map((e) => e.getBoundingClientRect());
                  const R = (e) => e.getBoundingClientRect();
                  const acts = [...document.querySelectorAll('main button, main input, main textarea, main select, main summary, main .lad-top, main a.btn, main .ways a, main .guide-list a')].filter((e) => { const r = R(e); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
                  const go = document.querySelector('#go');
                  const gap = (a, r) => Math.max(0, r.top - a.bottom, a.top - r.bottom, r.left - a.right, a.left - r.right);
                  let near = 1e9, nearGo = 1e9, who = '';
                  for (const a of ads) { for (const e of acts) { const g = gap(a, R(e)); if (g < near) { near = g; who = e.id || e.className || e.tagName; } } if (go) nearGo = Math.min(nearGo, gap(a, R(go))); }
                  return { n: ads.length, near: Math.round(near), who, nearGo: Math.round(nearGo), labels: [...document.querySelectorAll('.ad-wrap:not([hidden]) .ad-label')].map((e) => e.textContent), text: [...document.querySelectorAll('.ad-slot')].map((e) => e.textContent.trim()), firstTop: ads.length ? Math.round(ads[0].top + scrollY) : 0, vh: innerHeight }; }''')
                want_n = 1 if tool == '글' else 2
                ok(m['n'] == want_n and m['labels'] == ['광고' if lang == 'ko' else 'Ad'] * want_n and all(t == '' for t in m['text']), f'광고 미리보기 {lang} {w}px {tool}: 자리 {want_n}곳, 표시는 ‘{"광고" if lang == "ko" else "Ad"}’뿐', m)
                ok(m['near'] >= 40, f'광고 미리보기 {lang} {w}px {tool}: 가장 가까운 단추·입력칸({m["who"]})과 {m["near"]}px (40px 이상)')
                if tool != '글':
                    ok(m['nearGo'] >= 150, f'광고 미리보기 {lang} {w}px {tool}: 돌리기·뽑기 단추와 {m["nearGo"]}px (150px 이상)')
                    ok(m['firstTop'] > m['vh'], f'광고 미리보기 {lang} {w}px {tool}: 첫 화면에 광고 자리 없음(첫 자리 위치 {m["firstTop"]}px)')
            ok(c.page.evaluate("getComputedStyle(document.querySelector('.ad-slot')).backgroundImage").startswith('repeating-linear-gradient'), f'광고 미리보기 {lang} {w}px: 자리 상자는 빗금(입력칸과 다르게)')
            c.close()
    c = Ctx(b, lang='ko')
    page = c.open('/ko/')
    # 실제 주소에서는(미리보기 아님, 단위 번호 없음) 자리가 숨어 있어야 한다: localhost는 늘 미리보기라 설정 함수로 확인
    ok(page.evaluate("PK_ADS.slots.mid === '' && PK_ADS.slots.bottom === '' && PK_ADS.client === 'ca-pub-9496167591465154'"), '광고 설정: client 있음, 수동 자리 번호는 비어 있음')
    c.close()


def misc(b):
    # 어두운 화면
    c = Ctx(b, lang='ko', color_scheme='dark', reduced_motion='reduce')
    page = c.open('/ko/')
    page.click('#go'); page.wait_for_timeout(200)
    bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    ok(bg == 'rgb(20, 24, 28)' and page.inner_text('#rname') == state(page)['last']['name'], '어두운 화면: 바탕이 어둡고 도구가 돈다', bg)
    if SHOTS:
        page.screenshot(path=f'{SHOTS}/final-ko-home-dark.png')
    c.close()
    # 인쇄 화면
    c = Ctx(b, lang='ko', reduced_motion='reduce')
    page = c.open('/ko/?adpreview')
    page.click('#go'); page.wait_for_timeout(150)
    page.emulate_media(media='print')
    vis = page.evaluate("['.top', '.foot', '.ad-wrap', '.hub', '.list-tools'].map((s) => getComputedStyle(document.querySelector(s)).display)")
    ok(all(v == 'none' for v in vis), '인쇄 화면: 머리·꼬리·광고 자리·단추 숨김', vis)
    c.close()
    # 언어 안내 띠: 브라우저 언어가 다르면 겹쳐 띄우고, 닫으면 기억
    c = Ctx(b, lang='ko', locale='en-US')
    page = c.open('/ko/ladder/')
    bar = page.locator('.lang-bar')
    ok(bar.count() == 1 and page.evaluate("getComputedStyle(document.querySelector('.lang-bar')).position") == 'absolute' and bar.locator('a').get_attribute('href') == '/ladder/', '언어 안내 띠: 겹쳐 띄움(absolute), 같은 도구의 영어판으로')
    ok(page.evaluate("document.documentElement.lang") == 'ko' and '/ko/ladder/' in page.url, '언어 안내 띠: 자동으로 넘기지 않음')
    bar.locator('button').click()
    page.reload()
    ok(page.locator('.lang-bar').count() == 0 and page.evaluate("localStorage.getItem('pick.lang')") == 'ko', '언어 안내 띠: 닫으면 다시 안 뜸(pick.lang)')
    c.close()
    c = Ctx(b, lang='ko', locale='ko-KR')
    ok(c.open('/ko/').locator('.lang-bar').count() == 0, '언어 안내 띠: 브라우저 언어가 같으면 안 뜸')
    c.close()
    # 저장된 명단이 다른 도구에서도 그대로
    c = Ctx(b, lang='ko', reduced_motion='reduce')
    page = c.open('/ko/')
    page.fill('#names', '해\n달\n별\n구름')
    page.wait_for_timeout(450)
    for path in ('/ko/ladder/', '/ko/draw/', '/ko/teams/', '/ko/'):
        page = c.open(path)
        ok(page.input_value('#names') == '해\n달\n별\n구름' and page.inner_text('#count').startswith('4'), f'같은 명단이 다른 도구에서도 그대로: {path}')
    c.close()
    # 소리: 끄면 기억, 누르기 전에는 AudioContext를 만들지 않는다
    c = Ctx(b, lang='ko', reduced_motion='reduce')
    c.ctx.add_init_script("window.__ac = 0; for (const k of ['AudioContext', 'webkitAudioContext']) { const O = window[k]; if (O) window[k] = function (...a) { window.__ac++; return new O(...a); }; }")
    page = c.open('/ko/')
    ok(page.evaluate('window.__ac') == 0, '소리: 누르기 전에는 소리 장치를 만들지 않음')
    page.click('#sound')
    ok(page.get_attribute('#sound', 'aria-pressed') == 'false' and page.evaluate("localStorage.getItem('pick.sound')") == '0', '소리: 끄면 기억(pick.sound)')
    page.click('#go'); page.wait_for_timeout(150)
    ok(page.evaluate('window.__ac') == 0, '소리: 꺼 두면 돌려도 소리 장치를 만들지 않음')
    c.close()
    # 루멘랩 칸: 화면에 들어오면 한 번
    c = Ctx(b, lang='ko')
    page = c.open('/ko/coin/')
    ok(page.locator('.lumen.spin').count() == 0, '루멘랩 칸: 열자마자 돌지 않음')
    page.locator('[data-lumen]').scroll_into_view_if_needed()
    page.wait_for_timeout(1100)
    ok(page.locator('.lumen.spin').count() == 1 and page.get_attribute('[data-lumen]', 'href') == 'https://lumenlab.page/', '루멘랩 칸: 화면에 들어오면 한 번 돈다, 한국어 본페이지 링크')
    page.wait_for_timeout(1200)
    ok(page.evaluate("document.querySelector('.lw-disc').getAnimations().length") == 0, '루멘랩 칸: 끝나면 움직임 0')
    c.close()
    c = Ctx(b, lang='en', reduced_motion='reduce')
    page = c.open('/coin-flip/')
    page.locator('[data-lumen]').scroll_into_view_if_needed(); page.wait_for_timeout(900)
    ok(page.locator('.lumen.spin').count() == 0 and page.get_attribute('[data-lumen]', 'href') == 'https://lumenlab.page/en/', '루멘랩 칸: 동작 줄이기면 안 돈다, 영어 본페이지 링크')
    c.close()
    # 발표 화면
    c = Ctx(b, lang='ko')
    page = c.open('/ko/')
    if page.evaluate('document.fullscreenEnabled') and page.locator('#present').is_visible():
        page.click('#present'); page.wait_for_timeout(500)
        if page.evaluate('!!document.fullscreenElement'):
            page.evaluate("window.__seen = 0; new MutationObserver(() => { if (document.querySelector('canvas.confetti')) window.__seen++; }).observe(document.documentElement, { childList: true, subtree: true })")
            page.click('#go'); wheel_done(page); page.wait_for_timeout(300)
            seen = page.evaluate('window.__seen')
            ok(seen >= 1, '발표 화면: 결과가 나온 순간 색종이')
            if SHOTS:
                page.screenshot(path=f'{SHOTS}/final-ko-present.png')
            page.wait_for_timeout(1700)
            ok(page.locator('canvas.confetti').count() == 0, '발표 화면: 색종이는 끝나면 스스로 지워짐')
            page.evaluate('document.exitFullscreen()')
        else:
            skip('발표 화면: 색종이', '머리 없는 브라우저에서 전체 화면이 안 됨')
    else:
        skip('발표 화면', '이 브라우저는 전체 화면을 지원하지 않음(단추가 숨겨짐)')
    page.click('#go') if not page.evaluate('!!document.fullscreenElement') else None
    wheel_done(page); page.wait_for_timeout(300)
    ok(page.locator('canvas.confetti').count() == 0, '색종이: 보통 화면에서는 안 나옴')
    c.close()
    # 500칸: 도는 동안 프레임
    c = Ctx(b, lang='ko')
    page = c.open('/ko/')
    fam, giv = '김이박최정강조윤장임한오서신권황안송류전', ['민준', '서연', '지호', '유나', '도윤', '하린', '서준', '채원', '지우', '예준', '수아', '시우', '하윤', '주원', '지안']
    best = None
    for attempt in range(3):
        page.fill('#names', '\n'.join(fam[i % len(fam)] + giv[(i * 7) % len(giv)] + str(i) for i in range(500)))
        page.wait_for_timeout(300)
        page.click('#go')
        gaps = page.evaluate('''() => new Promise((res) => { const g = []; let last = performance.now(); let k = 0; function f(now) { g.push(now - last); last = now; if (++k < 150) requestAnimationFrame(f); else res(g); } requestAnimationFrame(f); })''')
        wheel_done(page)
        slow = sum(1 for g in gaps[5:] if g > 34)
        best = slow if best is None else min(best, slow)
        if slow <= 4:
            break
    st = state(page)
    at = page.evaluate("async () => { const { wheelIndexAt } = await import('/assets/core/pick.js'); const s = window.__pick.state; return wheelIndexAt(s.items.length, s.rot, 0); }")
    ok(best <= 4, f'500칸: 도는 동안 34ms 넘는 프레임 {best}/145 (세 번 중 가장 좋은 값, 기계가 바쁘면 흔들림)')
    ok(len(st['items']) == 500 and at == st['last']['index'] and page.inner_text('#rname') == st['last']['name'], '500칸: 바늘 아래 칸 = 뽑힌 칸 = 결과 글자')
    if SHOTS:
        page.screenshot(path=f'{SHOTS}/final-ko-wheel-500.png')
    c.close()


def shots(b):
    if not SHOTS:
        skip('최종 스크린샷', 'PICK_SHOTS 없음')
        return
    def snap(c, name, full=False):
        c.page.screenshot(path=f'{SHOTS}/final-{name}.png', full_page=full)
    for lang in ('ko', 'en'):
        for label, w, h, mob in (('desktop', 1366, 768, False), ('mobile', 390, 844, True)):
            c = Ctx(b, w, h, mobile=mob, lang=lang, reduced_motion='reduce')
            page = c.open(PATHS[lang]['wheel'])
            snap(c, f'{lang}-home-{label}')
            for tool, path in PATHS[lang].items():
                page = c.open(path)
                (page.tap if mob else page.click)('#go'); page.wait_for_timeout(250)
                if tool == 'ladder':
                    page.locator('.lad-top').nth(2).click(); page.wait_for_timeout(150)
                if tool == 'draw' and label == 'desktop':
                    page.fill('#m', '3'); page.click('#go'); page.wait_for_timeout(150)
                snap(c, f'{lang}-{tool}-result-{label}')
            art = '/ko/guide/ladder-fairness/' if lang == 'ko' else '/guide/ladder-lottery-fairness/'
            c.open(art)
            snap(c, f'{lang}-article-{label}', full=True)
            c.close()
    c = Ctx(b, 1366, 768, lang='en', color_scheme='dark', reduced_motion='reduce')
    c.open('/'); c.page.click('#go'); c.page.wait_for_timeout(200); snap(c, 'en-home-dark')
    c.close()
    c = Ctx(b, 390, 844, mobile=True, lang='ko', color_scheme='dark', reduced_motion='reduce')
    c.open('/ko/'); snap(c, 'ko-home-mobile-dark')
    c.close()
    c = Ctx(b, 1366, 768, lang='ko', reduced_motion='reduce')
    c.open('/ko/?adpreview'); c.page.click('#go'); c.page.wait_for_timeout(150); snap(c, 'ko-adpreview-desktop', full=True)
    c.page.goto(BASE + '/__no-such-page/'); c.page.wait_for_timeout(200); snap(c, '404')
    c.open('/ko/about/'); snap(c, 'ko-about', full=True)
    c.open('/ko/'); c.page.click('#go'); c.page.wait_for_timeout(150); c.page.emulate_media(media='print'); snap(c, 'ko-print', full=True)
    c.close()
    c = Ctx(b, 390, 844, mobile=True, lang='ko', reduced_motion='reduce')
    c.open('/ko/?adpreview'); snap(c, 'ko-adpreview-mobile', full=True)
    c.close()
    ok(True, f'최종 스크린샷을 {SHOTS} 에 저장')


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=EXE, args=['--no-proxy-server'])
        for name, f in (('tools', tools), ('pages', pages), ('cls', cls), ('ads', ads), ('misc', misc), ('shots', shots)):
            if name in want:
                print(f'[{name}]', flush=True)
                try:
                    f(b)
                except Exception as e:  # 한 묶음이 죽어도 나머지는 돈다
                    ok(False, f'{name} 묶음이 중간에 멈춤', repr(e)[:300])
        b.close()
    n = {k: sum(1 for r in results if r[0] == k) for k in ('통과', '실패', '못 함')}
    for r in results:
        if r[0] == '못 함':
            print('  못 함', r[1], '→', r[2])
    print(f'{"통과" if not n["실패"] else "실패"}: 브라우저 확인 {n["통과"]}개 통과, {n["실패"]}개 실패, {n["못 함"]}개 못 함')
    if os.environ.get('PICK_RESULTS'):
        Path(os.environ['PICK_RESULTS']).write_text(json.dumps(results, ensure_ascii=False, indent=0), encoding='utf-8')
    sys.exit(1 if n['실패'] else 0)


if __name__ == '__main__':
    main()
