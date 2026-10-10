#!/usr/bin/env python3
"""브라우저로 하는 확인(Playwright): 먼저 `node pick/_dev/serve.mjs` 를 띄우고  python3 -B pick/_dev/e2e.py [묶음…]
묶음: tools(도구를 실제로 눌러 결과 확인) guard(도는 중 명단 바꾸기·순서만 바꾼 링크·옛 링크·열 수 없는 링크·긴 링크·지우기와 되돌리기)
      pages(모든 페이지 320px·콘솔·깨진 그림·휴대폰 누름 영역 44px) cls(화면 밀림) ads(광고 미리보기 거리)
      misc(저장 키·바깥 요청·404·어두운 화면·동작 줄이기·발표 화면·루멘랩 칸·500칸) shots(최종 스크린샷). 안 적으면 전부.
환경 변수: PW_CHROME(크롬 실행 파일), PICK_FONT(Pretendard .woff2. CDN을 못 받는 곳에서 대신 줌), PICK_SHOTS(스크린샷 폴더), PICK_SHOT_PREFIX(기본 final), PICK_BASE.
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
PREFIX = os.environ.get('PICK_SHOT_PREFIX', 'final')
FONT_CSS = '@font-face{font-family:"Pretendard Variable";font-weight:45 920;font-display:swap;src:url(https://cdn.jsdelivr.net/__local/p.woff2) format("woff2-variations")}'
ADS = re.compile(r'googlesyndication|doubleclick|adservice|fundingchoices')
HANGUL = re.compile(r'[가-힣ㄱ-ㆎ]')
PATHS = {
    'ko': {'wheel': '/ko/', 'ladder': '/ko/ladder/', 'draw': '/ko/draw/', 'teams': '/ko/teams/', 'number': '/ko/number/', 'coin': '/ko/coin/', 'dice': '/ko/dice/'},
    'en': {'wheel': '/', 'ladder': '/ladder/', 'draw': '/name-picker/', 'teams': '/team-generator/', 'number': '/random-number/', 'coin': '/coin-flip/', 'dice': '/dice/'},
}
ALL = [u[len('https://pick.lumenlab.page'):] for u in re.findall(r'<loc>(.*?)</loc>', (ROOT / 'sitemap.xml').read_text())]
results = []
want = set(sys.argv[1:]) or {'tools', 'guard', 'pages', 'cls', 'ads', 'misc', 'shots'}


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
        if font_delay:  # 같은 주소에서 받는 조각 글꼴(assets/fonts)도 늦게 준다
            def own(route):
                time.sleep(font_delay / 1000)
                route.continue_()
            self.ctx.route(re.compile(r'/assets/fonts/.*\.woff2'), own)
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


def spin_start(page):
    page.wait_for_function('window.__pick.state.spinning === true', timeout=5000)


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
    ok(re.match(r'^' + re.escape(BASE + PATHS[lang][tool]) + r'#r=2\.[a-z]\.[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]+$', url or '') is not None, f'{lang} {tool}: 링크 복사(주소 꼴, 형식 2, {len(url or "")}자)')
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
    return url


def tools(b):
    for lang in ('ko', 'en'):
        c = Ctx(b, lang=lang, permissions=['clipboard-read', 'clipboard-write'])
        page = c.page
        P = PATHS[lang]
        # ---- 돌림판 ----
        c.open(P['wheel'])
        T = page.evaluate("JSON.parse(document.getElementById('i18n').textContent)")
        for i in range(2):
            page.click('#go')
            spin_start(page)
            wheel_done(page)
            page.wait_for_timeout(350)
            st = state(page)
            shown = page.inner_text('#rname')
            px, exp = under_needle(page), slice_color(page, st['last']['index'], len(st['items']))
            ok(shown == st['last']['name'] == st['items'][st['last']['index']], f'{lang} 돌림판 {i + 1}: 결과 글자 = 뽑힌 이름', shown)
            ok(max(abs(px[k] - exp[k]) for k in range(3)) <= 8, f'{lang} 돌림판 {i + 1}: 바늘 아래 화면 색 = 뽑힌 칸 색', f'{px} {exp}')
        ok(page.evaluate("getComputedStyle(document.querySelector('#wheel canvas')).transform") in ('none', 'matrix(1, 0, 0, 1, 0, 0)'), f'{lang} 돌림판: 멈춘 뒤에는 CSS 회전 없음(이름을 읽히는 방향으로 다시 그림)')
        ok(page.inner_text('#go').replace('\n', ' ') == T['spinAgain'] and float(page.evaluate("getComputedStyle(document.querySelector('#go')).opacity")) == 1, f'{lang} 돌림판: 결과 뒤 가운데 단추는 ‘{T["spinAgain"]}’(흐리지 않음)')
        before = len(state(page)['items'])
        gone = state(page)['last']['name']
        text_before = page.input_value('#names')
        page.click('#again')
        spin_start(page)
        wheel_done(page)
        page.wait_for_timeout(300)
        st = state(page)
        ok(len(st['items']) == before - 1 and gone not in st['items'] and st['out'] == [gone], f'{lang} 돌림판: 빼고 다시({before} → {len(st["items"])}), 뺀 사람 = 방금 뽑힌 사람')
        ok(page.input_value('#names') == text_before and len(st['live']) == before and page.evaluate("localStorage.getItem('pick.list')") is None, f'{lang} 돌림판: 빼도 명단 칸의 글과 저장된 명단은 그대로')
        ok(page.locator('#outbox').is_visible() and gone in page.inner_text('#outtext'), f'{lang} 돌림판: 뺀 사람이 명단 아래에 적힘', page.inner_text('#outtext'))
        ok(page.locator('#history li').count() == 3, f'{lang} 돌림판: 뽑힌 순서 3개')
        replay(c, lang, 'wheel', [st['last']['name'], st['items']], lambda p: [p.inner_text('#rname'), state(p)['items']])
        page.click('#outall')
        st = state(page)
        ok(len(st['items']) == before and st['out'] == [] and st['last'] is None and page.locator('#outbox').is_hidden() and page.locator('#history li').count() == 3, f'{lang} 돌림판: 모두 되돌리기(판에 {len(st["items"])}명, 뽑힌 순서는 남음)')
        # 명단 도구: 섞기·가나다순·겹친 이름 지우기·지우기
        page.fill('#names', '다\n가\n나\n가')
        page.wait_for_timeout(350)
        ok(len(state(page)['items']) == 4 and page.inner_text('#listwarn') != '', f'{lang} 명단: 겹친 이름 알림')
        if lang == 'en':
            ok('1 duplicate name ' in page.inner_text('#listwarn') + ' ', 'en 명단: 겹친 이름 하나일 때 단수("1 duplicate name")', page.inner_text('#listwarn'))
        ok(page.locator('#history li').count() == 0, f'{lang} 돌림판: 명단을 통째로 바꾸면 뽑힌 순서도 새로 시작')
        page.click('#dedupe'); page.click('#sortaz')
        ok(state(page)['items'] == ['가', '나', '다'], f'{lang} 명단: 겹친 이름 지우기 + 가나다순', state(page)['items'])
        page.click('#shuffle')
        ok(sorted(state(page)['items']) == ['가', '나', '다'], f'{lang} 명단: 섞기')
        page.wait_for_timeout(400)
        ok(sorted(page.evaluate("localStorage.getItem('pick.list')").split('\n')) == ['가', '나', '다'], f'{lang} 명단: 이 기기에 저장')
        # 한 줄 쉼표·여러 칸 붙여 넣기 안내
        page.fill('#names', 'Smith, John')
        ok(state(page)['items'] == ['Smith', 'John'] and T['warnSplit'].split('{n}')[0][:12] in page.inner_text('#listwarn'), f'{lang} 명단: 한 줄을 쉼표로 나눴다고 알림', page.inner_text('#listwarn'))
        page.fill('#names', '1\t김민준\t남\n2\t이서연\t여\n3\t박지호\t남')
        ok(len(state(page)['items']) == 3 and page.locator('#listwarn button').count() == 1, f'{lang} 명단: 여러 칸을 같이 붙이면 알리고 ‘첫 칸만 쓰기’ 단추')
        page.click('#listwarn button')
        ok(state(page)['items'] == ['1', '2', '3'] and page.locator('#listwarn button').count() == 0, f'{lang} 명단: 첫 칸만 쓰기', state(page)['items'])
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
        page.fill('#names', 'a\nb\nc')
        page.locator('details.more summary').first.click()
        page.fill('#bottom', 'L1\nL2\nL3\nL4\nL5')
        page.click('#go')
        st3 = state(page)
        ok(st3['given'] == ['L1', 'L2', 'L3'] and '2' in page.inner_text('#labwarn') and page.locator('#labwarn').is_visible(), f'{lang} 사다리: 아래 칸을 사람 수보다 많이 적으면 알림', page.inner_text('#labwarn'))
        page.fill('#bottom', 'L1')
        page.click('#go')
        ok(page.inner_text('#labwarn') == '', f'{lang} 사다리: 아래 칸이 모자라지 않으면 알림 없음')
        page.locator('.lad-top').nth(0).click()
        page.fill('#names', 'a\nb\nc\nd')  # 길을 따라가는 도중에 명단이 바뀌면 그 판은 지워지고, 오류가 나지 않는다
        page.wait_for_timeout(2600)
        ok(state(page) is None and not c.errors, f'{lang} 사다리: 길을 따라가는 도중 명단이 바뀌면 판을 지움(오류 없음)', c.errors[:2])
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
        ok(page.inner_text('#msg') == T['pickTooMany'].replace('{n}', '8') and page.locator('.picked').count() == 0, f'{lang} 제비뽑기: 명단보다 많이 뽑으면 그렇게 알림', page.inner_text('#msg'))
        for bad in ('0', '-1', '2.5', ''):
            page.fill('#m', '3'); page.click('#go')
            page.fill('#m', bad); page.click('#go')
            ok(page.inner_text('#msg') == T['pickBad'] and page.locator('.picked').count() == 0, f'{lang} 제비뽑기: 뽑을 인원 {bad!r} → 1 이상의 정수로 넣으라는 안내(앞 결과는 지움)', page.inner_text('#msg'))
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
        for a, z, cnt, why, key in (('9', '3', '1', '순서', 'numOrder'), ('1', '5', '6', '중복 없이 모자람', None), ('1.5', '3', '1', '소수', 'numInt'), ('', '3', '1', '빈칸', 'numInt'), ('1', '5', '0', '0개', 'numCount'), ('1', '9999999999999999', '1', '16자리', 'numWide')):
            page.fill('#min', '1'); page.fill('#max', '45'); page.fill('#count', '6'); page.click('#go')
            had = page.locator('.bignums span').count()
            page.fill('#min', a); page.fill('#max', z); page.fill('#count', cnt)
            page.click('#go')
            msg = page.inner_text('#msg')
            ok(had == 6 and msg != '' and (key is None or msg == T[key]) and page.locator('#after[data-off]').count() == 1 and page.locator('.bignums').count() == 0 and page.locator('#out .out-empty').count() == 1,
               f'{lang} 숫자: 틀린 입력({why})은 경우에 맞는 안내만 보이고 앞 결과는 지워짐', msg)
        page.fill('#min', '１'); page.fill('#max', '１０'); page.fill('#count', '3'); page.uncheck('#unique')
        page.click('#go')
        wide = [int(x) for x in page.locator('.bignums span').all_inner_texts()]
        ok(len(wide) == 3 and all(1 <= x <= 10 for x in wide) and page.input_value('#max') == '10', f'{lang} 숫자: 전각 숫자(１０)는 반각으로 읽음', wide)
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
        page.fill('#count', '300'); page.click('#go')
        n300 = page.locator('#tally i').count()
        page.fill('#count', '301'); page.click('#go')
        ok(n300 == 300 and page.locator('#tally i').count() == 0 and page.inner_text('#sum') != '', f'{lang} 동전: 던진 순서는 300번까지, 301번부터는 합계만')
        page.fill('#count', '1001'); page.click('#go')
        ok(page.inner_text('#msg') == T['coinCount'] and state(page) is None and page.inner_text('#coin') == T['coinWait'] and page.inner_text('#sum') == '' and page.locator('#tally i').count() == 0, f'{lang} 동전: 1,001번은 안내만 보이고 앞 결과는 지워짐')
        page.fill('#count', '100'); page.click('#go')
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
        page.fill('#count', '101'); page.click('#go')
        ok(page.inner_text('#msg') == T['diceCount'] and state(page) is None and page.locator('.die').count() == 0, f'{lang} 주사위: 101개는 안내만 보이고 앞 결과는 지워짐')
        page.fill('#count', '2'); page.fill('#sides', '1000'); page.click('#go')
        ok(len(state(page)['vals']) == 2 and all(1 <= v <= 1000 for v in state(page)['vals']), f'{lang} 주사위: 1,000면(설명에 적은 한도까지 된다)')
        # 최근 결과
        page.locator('#recent summary').click()
        page.wait_for_timeout(250)
        ok(page.locator('#recent li a').count() >= 5, f'{lang} 최근 결과: 뽑은 것들이 다시 보기 링크와 함께 쌓임', page.locator('#recent li').count())
        page.click('#recentclear')
        ok(page.evaluate("localStorage.getItem('pick.history')") is None, f'{lang} 최근 결과: 기록 지우기')
        page.click('#go'); page.wait_for_timeout(150)
        if lang == 'en':
            for tool in PATHS['en']:
                c.open(PATHS['en'][tool])
                if tool != 'wheel':
                    page.click('#go'); page.wait_for_timeout(150)
                leaks = hangul_leaks(page)
                ok(not leaks, f'en {tool}: 눌러 본 뒤에도 lang="ko" 밖 한글 없음', leaks[:3])
        ok(not c.errors, f'{lang} 도구: 콘솔 오류 0', c.errors[:3])
        ok(c.hosts <= {re.sub(r'^https?://', '', BASE), 'cdn.jsdelivr.net', 'pagead2.googlesyndication.com'}, f'{lang} 도구: 바깥 요청은 글꼴·광고 코드뿐(명단을 보내는 요청 없음. 방문 통계는 실제 주소에서 Cloudflare가 끼워 넣는다)', sorted(c.hosts))
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
            if mob:
                order = page.evaluate("['#wheel', '#rname', '#list', '.trust', '#sound'].map((s) => Math.round(document.querySelector(s).getBoundingClientRect().top))")
                ok(order == sorted(order), f'{lang} {w}×{h}: 휴대폰 순서는 판 → 결과 → 내 명단 넣기 → 어떻게 뽑나요 → 소리', order)
            ok(page.locator('#go').count() == 1 and page.locator('.btn-go:visible').count() == 0, f'{lang} {w}×{h}: 돌리기 단추는 하나')
            c.close()


# 휴대폰에서 누르는 것 가운데 44px보다 작은 것(문단 속 링크는 뺀다). 체크 상자는 감싼 label 넓이로 잰다.
TAP_JS = r"""() => { const out = [];
  const inText = (e) => e.tagName === 'A' && !e.classList.contains('btn') && e.closest('.prose p, .prose li, .trust p, .linkmsg p, .msg, .toast, .list-warn, figcaption');
  for (const e of document.querySelectorAll('a, button, summary, select, textarea, input, [role="button"]')) {
    if (e.closest('.skip') || e.classList.contains('skip') || inText(e) || e.type === 'hidden') continue;
    const box = e.matches('input[type="checkbox"], input[type="radio"]') ? (e.closest('label') || e) : e;
    const r = box.getBoundingClientRect(); const cs = getComputedStyle(e);
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none' || e.closest('[data-off]')) continue;
    // 넓이는 배치 크기로 잰다(방금 눌러 살짝 줄어든 모습(transform)은 누르는 넓이와 상관없다). SVG 요소는 화면 크기로
    const w = box.offsetWidth === undefined ? r.width : box.offsetWidth; const h = box.offsetHeight === undefined ? r.height : box.offsetHeight;
    if (w < 43.5 || h < 43.5) out.push((e.id || e.className.baseVal || e.className || e.tagName) + ' ' + Math.round(w) + '×' + Math.round(h) + ' ' + (e.textContent || '').trim().slice(0, 12)); }
  return out; }"""

FORGE_JS = r"""async ([url, how]) => { const { decodeShare, encodeShare } = await import('/assets/core/share.js'); const d = decodeShare(url.slice(url.indexOf('#')));
  const items = d.items.slice();
  if (how === 'reverse') items.reverse(); else if (how === 'rotate') items.push(items.shift()); else if (how === 'swap') { const t = items[0]; items[0] = items[items.length - 1]; items[items.length - 1] = t; }
  return url.slice(0, url.indexOf('#') + 1) + encodeShare({ tool: d.tool, seed: d.seed, items, opts: d.opts, version: how.startsWith('v1') ? 1 : undefined }); }"""


def set_names(page, text):
    """명단 칸에 긴 글을 한 번에 넣는다(붙여 넣기처럼). fill은 수천 줄에서 아주 느리다."""
    page.evaluate("(t) => { const e = document.getElementById('names'); e.value = t; e.dispatchEvent(new Event('input', { bubbles: true })); }", text)


def copied(page):
    page.click('#copy')
    page.wait_for_timeout(250)
    return page.evaluate('navigator.clipboard.readText()')


def guard(b):
    """3단계에서 막은 구멍을 못 박는다."""
    for lang in ('ko', 'en'):
        c = Ctx(b, lang=lang, permissions=['clipboard-read', 'clipboard-write'])
        page = c.page
        P = PATHS[lang]
        c.open(P['wheel'])
        T = page.evaluate("JSON.parse(document.getElementById('i18n').textContent)")
        # ---- 도는 중에 명단 바꾸기 시도 → 발표 = 강조 칸 = 뺀 사람 = 링크의 결과
        B8 = '\n'.join(f'B{i}' for i in range(1, 9))
        page.fill('#names', B8)
        page.wait_for_timeout(350)
        page.click('#go')
        spin_start(page)
        page.wait_for_timeout(700)
        lk = page.evaluate("({ ro: document.getElementById('names').readOnly, dis: ['shuffle', 'sortaz', 'dedupe', 'listclear'].map((id) => document.getElementById(id).disabled), note: document.querySelector('#listnote span').textContent, cls: document.getElementById('list').classList.contains('locked'), border: getComputedStyle(document.getElementById('names')).borderTopStyle })")
        ok(lk['ro'] and all(lk['dis']) and lk['cls'] and lk['note'] == T['listLocked'] and lk['border'] == 'dashed', f'{lang} 도는 중: 명단 칸과 섞기·정렬·겹침·지우기 단추가 잠기고 잠겼다는 안내가 보임', lk)
        for sel in ('#shuffle', '#sortaz', '#dedupe', '#listclear'):
            box = page.locator(sel).bounding_box()
            page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        page.locator('#names').click(force=True)
        page.keyboard.press('Control+A')
        page.keyboard.type('Z1')
        page.keyboard.press('Enter')
        page.keyboard.type('Z2')
        mid = state(page)
        ok(page.input_value('#names') == B8 and mid['live'] == B8.split('\n') and mid['spinning'], f'{lang} 도는 중: 섞기·정렬·겹침·지우기를 누르고 글자를 쳐도 명단이 그대로', page.input_value('#names')[:30])
        wheel_done(page)
        page.wait_for_timeout(350)
        st = state(page)
        name = page.inner_text('#rname')
        px, exp = under_needle(page), slice_color(page, st['drawn']['hi'], len(st['drawn']['items']))
        ok(name == st['last']['name'] == st['drawn']['items'][st['drawn']['hi']] and st['drawn']['hi'] == st['last']['index'] and st['drawn']['items'] == B8.split('\n'), f'{lang} 도는 중 바꾸기 시도 뒤: 발표 이름 = 판에서 강조된 칸의 이름', f'{name} / {st["drawn"]["hi"]}')
        ok(max(abs(px[k] - exp[k]) for k in range(3)) <= 8, f'{lang} 도는 중 바꾸기 시도 뒤: 바늘 아래 화면 색 = 그 칸의 색', f'{px} {exp}')
        un = page.evaluate("({ ro: document.getElementById('names').readOnly, dis: ['shuffle', 'sortaz', 'dedupe', 'listclear'].map((id) => document.getElementById(id).disabled), cls: document.getElementById('list').classList.contains('locked') })")
        ok(not un['ro'] and not any(un['dis']) and not un['cls'], f'{lang} 멈춘 뒤: 명단 잠금이 풀림', un)
        url = copied(page)
        p2 = c.ctx.new_page()
        p2.goto(url, wait_until='load'); wheel_done(p2); p2.wait_for_timeout(200)
        ok(p2.inner_text('#rname') == name and p2.locator('#stamp:visible').count() == 1, f'{lang} 도는 중 바꾸기 시도 뒤: 링크의 결과 = 발표 이름', p2.inner_text('#rname'))
        p2.close()
        hist = json.loads(page.evaluate("localStorage.getItem('pick.history')"))
        ok(hist[0]['s'] == name and hist[0]['h'] == url[url.index('#'):], f'{lang} 도는 중 바꾸기 시도 뒤: 최근 결과의 이름과 링크 = 발표 이름과 그 링크')
        page.click('#again')
        spin_start(page)
        ok(state(page)['out'] == [name], f'{lang} 도는 중 바꾸기 시도 뒤: ‘빼고 다시’가 뺀 사람 = 발표 이름', state(page)['out'])
        wheel_done(page)
        page.wait_for_timeout(300)
        ok(page.input_value('#names') == B8 and page.evaluate("localStorage.getItem('pick.list')") == B8 and name not in state(page)['items'] and len(state(page)['items']) == 7, f'{lang} 빼고 다시: 저장된 명단은 원래 8명 그대로, 판에서만 7명')
        # 잠금을 건너뛰고 코드로 명단을 바꿔도(있을 수 없는 일) 이번 판은 잡아 둔 명단으로 끝난다
        page.click('#outall')
        A8 = [f'A{i}' for i in range(1, 9)]
        page.fill('#names', '\n'.join(A8))
        page.wait_for_timeout(100)
        page.click('#go')
        spin_start(page)
        page.wait_for_timeout(600)
        page.evaluate("() => { const e = document.getElementById('names'); e.value = 'Z1\\nZ2\\nZ3'; e.dispatchEvent(new Event('input', { bubbles: true })); }")
        wheel_done(page)
        page.wait_for_timeout(350)
        st = state(page)
        name = page.inner_text('#rname')
        px, exp = under_needle(page), slice_color(page, st['drawn']['hi'], 8)
        url = copied(page)
        p2 = c.ctx.new_page()
        p2.goto(url, wait_until='load'); wheel_done(p2); p2.wait_for_timeout(200)
        hist = json.loads(page.evaluate("localStorage.getItem('pick.history')"))
        ok(name in A8 and st['drawn']['items'] == A8 and st['drawn']['items'][st['drawn']['hi']] == name and max(abs(px[k] - exp[k]) for k in range(3)) <= 8 and p2.inner_text('#rname') == name and state(p2)['items'] == A8 and hist[0]['s'] == name and hist[0]['h'] == url[url.index('#'):],
           f'{lang} 잠금을 건너뛰고 코드로 명단을 바꿔도: 발표 = 강조 칸 = 링크의 결과 = 최근 결과(돌리기를 누른 순간의 명단)', f'{name} {st["drawn"]["items"][:3]} {p2.inner_text("#rname")}')
        p2.close()
        page.evaluate('localStorage.clear()')

        # ---- 링크 속 명단의 순서만 바꾸기 → 같은 결과(도장도 정당하게 붙는다)
        def forged_same(tool, read, label):
            url = copied(page)
            want = read(page)
            for how in ('reverse', 'rotate', 'swap'):
                f = page.evaluate(FORGE_JS, [url, how])
                p3 = c.ctx.new_page()
                p3.goto(f, wait_until='load')
                if tool == 'wheel':
                    wheel_done(p3)
                else:
                    p3.wait_for_function('window.__pick && window.__pick.state', timeout=10000)
                p3.wait_for_timeout(200)
                got = read(p3)
                moved = p3.input_value('#names') != page.input_value('#names')
                ok(got == want and moved and f != url, f'{lang} {label}: 링크 속 명단의 순서만 바꿔도({how}) 같은 결과', f'{str(got)[:70]} / {str(want)[:70]}')
                p3.close()
            return url
        c.open(P['wheel'])
        page.click('#go'); spin_start(page); wheel_done(page); page.wait_for_timeout(300)
        wheel_url = forged_same('wheel', lambda q: q.inner_text('#rname'), '돌림판')
        c.open(P['draw'])
        page.fill('#m', '3'); page.click('#go')
        draw_url = forged_same('draw', lambda q: q.locator('.picked li span').all_inner_texts(), '여러 명 뽑기')
        page.click('#mode [data-v="slips"]'); page.fill('#m', '2'); page.click('#go'); page.locator('.out-head .btn').click()
        forged_same('draw', lambda q: sorted(q.locator('.slip.win b').all_inner_texts()), '당첨 쪽지')
        page.click('#mode [data-v="order"]'); page.click('#go')
        forged_same('draw', lambda q: q.locator('.picked li span').all_inner_texts(), '순서 정하기')
        c.open(P['teams'])
        page.fill('#k', '3'); page.click('#go')
        forged_same('teams', lambda q: [t.locator('li').all_inner_texts() for t in q.locator('.team').all()], '팀 나누기')
        # 사다리는 줄 순서가 결과의 일부: 그렇게 밝혀 두었는지
        c.open(P['ladder'])
        note = page.evaluate("document.getElementById('copynote').textContent")
        ok(('순서' in note or 'order' in note) and note == page.evaluate("JSON.stringify(document.getElementById('copynote').textContent)")[1:-1], f'{lang} 사다리: 결과 링크 곁에 줄 순서까지 들어간다는 안내', note)

        # ---- 옛 형식(1) 링크: 옛 방식으로 열리고 그렇다고 알린다
        v1 = page.evaluate(FORGE_JS, [wheel_url, 'v1'])
        p3 = c.ctx.new_page()
        p3.goto(v1, wait_until='load'); wheel_done(p3); p3.wait_for_timeout(200)
        old = p3.evaluate("async () => { const { wheelDraw } = await import('/assets/core/pick.js'); const { makeRng } = await import('/assets/core/rng.js'); const { decodeShare } = await import('/assets/core/share.js'); const d = decodeShare(location.hash); return d.items[wheelDraw(d.items, makeRng(d.seed), true).index]; }")
        ok('#r=1.' in v1 and p3.inner_text('#rname') == old and p3.inner_text('#stamp') == T['stampOld'] and p3.locator('.linkmsg.info').count() == 1 and T['legacyLink'] in p3.inner_text('.linkmsg'), f'{lang} 옛 형식(1) 링크: 옛 방식의 결과로 열리고 “옛 방식 링크”라고 알림', p3.inner_text('#rname'))
        u2 = copied(p3)
        ok('#r=1.' in u2, f'{lang} 옛 형식 링크의 결과를 다시 복사하면 옛 형식 그대로(같은 결과로 열리게)')
        p3.locator('.linkmsg button').click()
        ok(p3.locator('.linkmsg').count() == 0 and p3.inner_text('#rname') == old, f'{lang} 옛 형식 링크 알림: 닫아도 결과는 그대로')
        p3.close()
        v1d = page.evaluate(FORGE_JS, [draw_url, 'v1'])
        p3 = c.ctx.new_page()
        p3.goto(v1d, wait_until='load'); p3.wait_for_function('window.__pick && window.__pick.state', timeout=10000)
        ok(p3.locator('.stamp:visible').inner_text() == T['stampOld'] and p3.locator('.linkmsg.info').count() == 1 and p3.locator('.picked li').count() == 3, f'{lang} 옛 형식(1) 제비뽑기 링크도 열림')
        p3.close()

        # ---- 열 수 없는 링크: 눈에 띄게 알리고, 그동안 내 명단을 판에 올리지 않는다
        seed43 = wheel_url.split('.')[2]
        for bad, key in (('#r=2.w.AAAA', 'badLink'), (f'#r=9.w.{seed43}.e30', 'badVersion'), (f'#r=2.w.{seed43}.' + 'A' * 400001, 'badTooLong'), ('#r=2.w.' + seed43 + '.!!!', 'badLink')):
            p3 = c.ctx.new_page()
            p3.goto(BASE + P['wheel'] + bad, wait_until='load'); p3.wait_for_timeout(300)
            st3 = state(p3)
            box = p3.locator('.linkmsg').bounding_box()
            ok(p3.locator('.linkmsg[role="alert"]').count() == 1 and p3.inner_text('.linkmsg p') == T[key] and st3['blocked'] and st3['drawn']['items'] == [] and box['width'] >= 300 and float(p3.evaluate("getComputedStyle(document.querySelector('.linkmsg')).fontSize").replace('px', '')) >= 15,
               f'{lang} 열 수 없는 링크({key}): 큰 알림, 판에는 내 명단을 올리지 않음', p3.inner_text('.linkmsg p')[:40])
            p3.click('#go')
            ok(not state(p3)['spinning'] and state(p3)['last'] is None, f'{lang} 열 수 없는 링크({key}): 닫기 전에는 돌지 않음')
            p3.locator('.linkmsg button').click()
            ok(p3.locator('.linkmsg').count() == 0 and len(state(p3)['drawn']['items']) == 8 and '#' not in p3.url, f'{lang} 열 수 없는 링크({key}): 닫으면 내 명단이 판에 올라오고 주소의 링크가 지워짐')
            p3.close()
        p3 = c.ctx.new_page()
        p3.goto(BASE + P['wheel'] + draw_url[draw_url.index('#'):], wait_until='load'); p3.wait_for_timeout(300)
        ok(p3.locator('.linkmsg a').get_attribute('href') == P['draw'] + draw_url[draw_url.index('#'):] and state(p3)['blocked'], f'{lang} 다른 도구의 링크: 그 도구로 가는 길을 알림')
        p3.goto(BASE + P['number'] + '#r=2.n.AAAA', wait_until='load'); p3.wait_for_timeout(300)
        shift = p3.evaluate("new Promise((res) => { let v = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) v += e.value; }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => res(v), 300); })")
        ok(p3.locator('.linkmsg[role="alert"]').count() == 1 and shift <= 0.02, f'{lang} 열 수 없는 링크(숫자): 알림은 겹쳐 띄워 화면을 밀지 않음({round(shift, 4)})')
        p3.locator('.linkmsg button').click(); p3.click('#go')
        ok(state(p3) is not None, f'{lang} 열 수 없는 링크(숫자): 닫고 나면 그대로 쓸 수 있음')
        p3.close()

        # ---- 명단 지우기: 되돌릴 수 있고(다음 변경 전까지), 최근 결과 기록도 지울지 묻는다
        page.evaluate('localStorage.clear()')
        c.open(P['wheel'])
        mine = '해\n달\n별'
        page.fill('#names', mine); page.wait_for_timeout(350)
        page.click('#go'); spin_start(page); wheel_done(page); page.wait_for_timeout(200)
        page.click('#listclear'); page.wait_for_timeout(350)
        ok(len(state(page)['live']) == 8 and page.evaluate("localStorage.getItem('pick.list')") is None and page.inner_text('#listnote span') == T['listCleared'] and page.inner_text('#listclear') == T['listUndo'] and page.locator('#histleft').is_visible(),
           f'{lang} 명단 지우기: 지워지고, ‘되돌리기’와 ‘기록도 지우기’가 나옴')
        gap = page.evaluate("(() => { const a = document.getElementById('listclear').getBoundingClientRect(); const b = document.querySelector('#histleft button').getBoundingClientRect(); return Math.max(b.top - a.bottom, a.left - b.right, b.left - a.right); })()")
        ok(gap >= 24, f'{lang} 명단 지우기: 되돌리기와 기록도 지우기 단추가 떨어져 있음({round(gap)}px)')
        page.click('#listclear'); page.wait_for_timeout(350)
        ok(page.input_value('#names') == mine and page.evaluate("localStorage.getItem('pick.list')") == mine and page.locator('#histleft').is_hidden() and page.inner_text('#listclear') == T['listClearAll'], f'{lang} 명단 지우기: 되돌리기로 명단과 저장이 돌아옴')
        page.click('#listclear'); page.wait_for_timeout(100)
        had = page.evaluate("localStorage.getItem('pick.history')")
        page.click('#histleft button')
        ok(had and mine.split('\n')[0] in page.evaluate("(h) => { const a = JSON.parse(h); return decodeURIComponent(escape(atob(a[0].h.split('.')[3].replace(/-/g, '+').replace(/_/g, '/')))); }", had) and page.evaluate("localStorage.getItem('pick.history')") is None and page.locator('#histleft').is_hidden(),
           f'{lang} 명단 지우기: ‘기록도 지우기’로 명단이 든 최근 결과 링크까지 지움')
        page.fill('#names', '가\n나'); page.wait_for_timeout(50)
        ok(page.inner_text('#listclear') == T['listClearAll'] and page.inner_text('#listnote span') == T['listSaved'], f'{lang} 명단 지우기: 그 뒤에 명단을 고치면 되돌리기는 사라짐')
        page.wait_for_timeout(350)
        p3 = c.ctx.new_page()
        p3.goto(wheel_url, wait_until='load'); wheel_done(p3); p3.wait_for_timeout(200)
        ok(p3.inner_text('#listclear') == T['listBack'], f'{lang} 링크로 연 명단: 단추는 ‘{T["listBack"]}’')
        p3.click('#listclear'); p3.wait_for_timeout(350)
        ok(p3.input_value('#names') == '가\n나' and p3.evaluate("localStorage.getItem('pick.list')") == '가\n나' and '#' not in p3.url, f'{lang} 링크로 연 명단: 내 명단으로 돌아가고 저장해 둔 명단은 지우지 않음')
        p3.close()
        ok(not c.errors, f'{lang} guard: 콘솔 오류 0', c.errors[:3])
        c.close()

    # ---- 긴 링크: 열 수 없는 링크는 만들지 않고, 만들어 준 링크는 실제로 열린다
    c = Ctx(b, lang='ko', permissions=['clipboard-read', 'clipboard-write'])
    page = c.open('/ko/draw/')
    T = page.evaluate("JSON.parse(document.getElementById('i18n').textContent)")
    name = lambda i: 'ㄱ' * 26 + f'{i:04d}'
    set_names(page, '\n'.join(name(i) for i in range(5000)))
    page.wait_for_timeout(600)
    page.click('#go')
    page.evaluate("navigator.clipboard.writeText('그대로')")
    page.click('#copy'); page.wait_for_timeout(400)
    toast = page.inner_text('#toast')
    ok(len(state(page)['items']) == 5000 and toast.startswith(T['linkTooLong'].split('(')[0]) and '400,000' in toast and T['copied'] not in toast and page.evaluate('navigator.clipboard.readText()') == '그대로',
       '긴 명단(5,000명 × 30자): 링크를 만들지 않고 너무 길다고 알림(복사했다고 하지 않음)', toast[:60])
    set_names(page, '\n'.join(name(i) for i in range(3400)))
    page.wait_for_timeout(500)
    page.click('#go')
    picked = page.locator('.picked li span').all_inner_texts()
    url = copied(page)
    toast = page.inner_text('#toast')
    p2 = c.ctx.new_page()
    p2.goto(url, wait_until='load'); p2.wait_for_function('window.__pick && window.__pick.state', timeout=30000); p2.wait_for_timeout(300)
    hash_len = len(url) - url.index('#') - 1
    ok(380000 < hash_len <= 400000 and p2.locator('.picked li span').all_inner_texts() == picked and len(state(p2)['items']) == 3400 and p2.locator('.stamp:visible').count() == 1,
       f'한도 바로 아래 링크({hash_len:,}자, 3,400명 × 30자): 복사되고 브라우저에서 실제로 열려 같은 결과')
    ok(T['copied'] in toast and '385' in toast.replace(',', '')[:200] or f'{len(url):,}' in toast, '긴 링크를 복사하면 길이와 잘릴 수 있다는 안내', toast[:80])
    p2.close()
    ok(not c.errors, '긴 링크: 콘솔 오류 0', c.errors[:3])
    c.close()

    # ---- 휴대폰: 뽑힌 순서 한 줄, 뺀 사람·지운 뒤 단추까지 44px, 언어 띠
    for lang in ('ko', 'en'):
        c = Ctx(b, 390, 844, mobile=True, lang=lang, reduced_motion='reduce', locale='en-US' if lang == 'ko' else 'ko-KR')
        page = c.open(PATHS[lang]['wheel'])
        bar = page.evaluate("(() => { const e = document.querySelector('.lang-bar'); const r = e.getBoundingClientRect(); const x = e.querySelector('button').getBoundingClientRect(); const hit = ['h1', '.aka', '#go', '#names'].filter((s) => { const q = document.querySelector(s).getBoundingClientRect(); return !(q.bottom <= r.top || q.top >= r.bottom || q.right <= r.left || q.left >= r.right); }); return { pos: getComputedStyle(e).position, top: r.top, bottom: r.bottom, vh: innerHeight, x: [x.width, x.height], a: e.querySelector('a').getBoundingClientRect().height, hit }; })()")
        ok(bar['pos'] == 'fixed' and bar['top'] > bar['vh'] - 80 and bar['bottom'] <= bar['vh'] and min(bar['x']) >= 44 and bar['a'] >= 44 and not bar['hit'], f'{lang} 언어 띠: 화면 아래 가운데, 닫기 44px, 제목·부제·돌리기·명단 칸을 가리지 않음', bar)
        small = page.evaluate(TAP_JS)
        ok(not small, f'{lang} 휴대폰 돌림판(언어 띠 포함): 44px보다 작은 누름 영역 0', small[:5])
        page.locator('.lang-bar button').tap()
        for _ in range(3):
            page.tap('#go'); page.wait_for_timeout(120)
            page.tap('#again'); page.wait_for_timeout(120)
        h = page.evaluate("(() => { const e = document.getElementById('history'); const r = e.getBoundingClientRect(); return { h: r.height, vis: getComputedStyle(e).visibility, n: e.querySelectorAll('li').length, disp: getComputedStyle(e).display }; })()")
        ok(h['vis'] == 'visible' and h['disp'] != 'none' and h['n'] == 6 and h['h'] <= 44 and len(state(page)['out']) == 3, f'{lang} 휴대폰: ‘지금까지 뽑힌 순서’가 접힌 한 줄로 보임(높이 {round(h["h"])}px, {h["n"]}개)')
        small = page.evaluate(TAP_JS)
        ok(not small and page.locator('#outbox').is_visible(), f'{lang} 휴대폰 돌림판(결과 + 뺀 사람 칸): 44px보다 작은 누름 영역 0', small[:5])
        page.fill('#names', '해\n달\n별'); page.wait_for_timeout(350)
        page.tap('#go'); page.wait_for_timeout(120)
        page.tap('#listclear'); page.wait_for_timeout(100)
        small = page.evaluate(TAP_JS)
        ok(not small and page.locator('#histleft').is_visible(), f'{lang} 휴대폰 돌림판(명단을 지운 직후): 44px보다 작은 누름 영역 0', small[:5])
        w = page.evaluate('[document.documentElement.scrollWidth, innerWidth]')
        ok(w[0] <= w[1], f'{lang} 휴대폰 돌림판(뺀 사람·지운 뒤): 가로 스크롤 0', w)
        # 뽑힌 순서는 60개까지만 남긴다(동작 줄이기라 누르는 즉시 결과가 나온다 → 65번 눌러 본다)
        page.fill('#names', '해\n달\n별'); page.wait_for_timeout(350)
        page.evaluate("() => { for (let i = 0; i < 65; i++) document.getElementById('go').click(); }")
        page.wait_for_timeout(150)
        hs = page.evaluate("({ n: document.querySelectorAll('#history li').length, top: document.querySelector('#history li .num').textContent, kept: window.__pick.state.hist.length })")
        ok(hs == {'n': 60, 'top': '65', 'kept': 60}, f'{lang} 돌림판: 65번 뽑아도 뽑힌 순서는 최근 60개만 남음(맨 앞 번호 65)', hs)
        ok(not c.errors, f'{lang} 휴대폰 guard: 콘솔 오류 0', c.errors[:3])
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
    # 휴대폰(390px): 모든 페이지에서 44px보다 작은 누름 영역 0(문단 속 링크 제외). 도구는 결과가 나온 상태에서 잰다
    c = Ctx(b, 390, 844, mobile=True, lang='ko', reduced_motion='reduce')
    small_all = []
    tool_paths = set(PATHS['ko'].values()) | set(PATHS['en'].values())
    for path in ALL + ['/__no-such-page/', '/ko/__no-such-page/']:
        page = c.open(path, wait=100)
        if path in tool_paths:
            page.tap('#go'); page.wait_for_timeout(150)
            if path in (PATHS['ko']['draw'], PATHS['en']['draw']):
                page.tap('#mode [data-v="slips"]'); page.tap('#go'); page.wait_for_timeout(100)
            page.locator('#recent summary').tap(); page.wait_for_timeout(100)
        for d in page.locator('details.more:not(.trust-more) > summary').all():
            d.tap()
        small = page.evaluate(TAP_JS)
        if small:
            small_all.append((path, small[:4]))
    ok(not small_all, f'390px: 모든 페이지 {len(ALL) + 2}쪽에서 44px보다 작은 누름 영역 0(문단 속 링크 제외)', small_all[:4])
    c.close()
    c = Ctx(b, 390, 844, mobile=True, lang='ko')
    r = c.page.goto(BASE + '/__no-such-page/')
    ok(r.status == 404 and c.page.locator('a[href="/ko/"]').count() >= 1 and c.page.locator('a[href="/"]').count() >= 1, '없는 주소: 404 상태 + 두 언어 첫 화면 링크', r.status)
    c.page.wait_for_timeout(150)
    nf = c.page.evaluate("({ brand: [...document.querySelectorAll('.logo')].filter((e) => e.offsetParent).map((e) => e.textContent.trim()), tools: [...document.querySelectorAll('.nf-tools a')].filter((e) => e.offsetParent).map((e) => e.getAttribute('href')), lang: document.documentElement.lang })")
    ok(nf['brand'] == ['Pickboard'] and nf['tools'] == list(PATHS['en'].values()) and nf['lang'] == 'en', '없는 주소(영어 쪽): 상표 Pickboard, 영어 도구 7개 링크', nf)
    r = c.page.goto(BASE + '/ko/__no-such-page/')
    c.page.wait_for_timeout(150)
    nf = c.page.evaluate("({ brand: [...document.querySelectorAll('.logo')].filter((e) => e.offsetParent).map((e) => e.textContent.trim()), tools: [...document.querySelectorAll('.nf-tools a')].filter((e) => e.offsetParent).map((e) => e.getAttribute('href')), lang: document.documentElement.lang })")
    ok(r.status == 404 and nf['brand'] == ['공평뽑기'] and nf['tools'] == list(PATHS['ko'].values()) and nf['lang'] == 'ko', '없는 주소(/ko/ 아래): 상표 공평뽑기, 한국어 도구 7개 링크', nf)
    # 글의 표: 칸이 많은 표는 옆으로 밀고 그렇다고 알린다. 칸이 적은 표는 폭 안에 들어간다
    for path in ('/ko/guide/ladder-fairness/', '/guide/ladder-lottery-fairness/', '/ko/guide/split-teams/'):
        page = c.open(path, wait=100)
        tb = page.evaluate("[...document.querySelectorAll('.tbl-wrap')].map((w) => { const t = w.querySelector('.tbl'); const h = w.querySelector('.tbl-hint'); return { wide: w.classList.contains('wide'), over: t.scrollWidth - t.clientWidth, hint: !!h && getComputedStyle(h).display !== 'none', right: Math.round(t.getBoundingClientRect().right), vw: innerWidth }; })")
        ok(tb and all((t['wide'] and t['over'] > 0 and t['hint']) or (not t['wide'] and t['over'] <= 1) for t in tb) and all(t['right'] <= t['vw'] for t in tb), f'390px 글의 표: 넘치는 표는 옆으로 밀리고 안내가 보임, 나머지는 폭 안: {path}', tb)
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
        page.screenshot(path=f'{SHOTS}/{PREFIX}-ko-home-dark.png')
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
    ok(bar.count() == 1 and page.evaluate("getComputedStyle(document.querySelector('.lang-bar')).position") == 'fixed' and bar.locator('a').get_attribute('href') == '/ladder/', '언어 안내 띠: 겹쳐 띄움(끼워 넣지 않음), 같은 도구의 영어판으로')
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
                page.screenshot(path=f'{SHOTS}/{PREFIX}-ko-present.png')
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
        page.screenshot(path=f'{SHOTS}/{PREFIX}-ko-wheel-500.png')
    c.close()


def shots(b):
    if not SHOTS:
        skip('최종 스크린샷', 'PICK_SHOTS 없음')
        return
    def snap(c, name, full=False):
        c.page.screenshot(path=f'{SHOTS}/{PREFIX}-{name}.png', full_page=full)
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
    # ---- 상태별 화면(잠긴 명단, 뺀 사람, 지운 뒤, 열 수 없는 링크, 옛 링크, 긴 이름, 안내 문구, 글의 그림·표, 404, 언어 띠, 꼬리말)
    MAKE = "async ([path, ver, items]) => { const { encodeShare } = await import('/assets/core/share.js'); const seed = new Uint8Array(32).map((_, i) => (i * 37 + 11) & 255); return path + '#' + encodeShare({ tool: 'wheel', seed, items, version: ver }); }"
    for label, w, h, mob in (('desktop', 1366, 768, False), ('mobile', 390, 844, True)):
        c = Ctx(b, w, h, mobile=mob, lang='ko')  # 움직임 켠 채: 도는 중의 잠긴 명단
        page = c.open('/ko/')
        (page.tap if mob else page.click)('#go'); spin_start(page); page.wait_for_timeout(1500)
        if mob:
            page.evaluate("document.getElementById('list').scrollIntoView({ block: 'center' })"); page.wait_for_timeout(150)
        snap(c, f'ko-wheel-locked-{label}')
        wheel_done(page)
        c.close()
        c = Ctx(b, w, h, mobile=mob, lang='ko', reduced_motion='reduce', permissions=['clipboard-read', 'clipboard-write'])
        tap = (lambda sel: c.page.tap(sel)) if mob else (lambda sel: c.page.click(sel))
        page = c.open('/ko/')
        for _ in range(3):
            tap('#go'); page.wait_for_timeout(120); tap('#again'); page.wait_for_timeout(120)
        snap(c, f'ko-wheel-out-{label}')
        if mob:
            page.evaluate("document.getElementById('outbox').scrollIntoView({ block: 'center' })"); page.wait_for_timeout(150)
            snap(c, 'ko-wheel-out-list-mobile')
        tap('#copy'); page.wait_for_timeout(250)
        if not mob:
            page.locator('.trust-more summary').click(); page.wait_for_timeout(100)
            snap(c, 'ko-wheel-copied-details-desktop')
        page.fill('#names', '해\n달\n별\n구름'); page.wait_for_timeout(350)
        tap('#go'); page.wait_for_timeout(150); tap('#listclear'); page.wait_for_timeout(150)
        if mob:
            page.evaluate("document.getElementById('list').scrollIntoView({ block: 'center' })"); page.wait_for_timeout(150)
        snap(c, f'ko-list-cleared-{label}')
        page.evaluate('localStorage.clear()')
        page.goto('about:blank'); page.goto(BASE + '/ko/#r=2.w.AAAA', wait_until='load'); page.wait_for_timeout(400)
        snap(c, f'ko-badlink-{label}')
        old = page.evaluate(MAKE, ['/ko/', 1, ['김민준', '이서연', '박지호', '최유나', '정도윤', '강하린', '윤서준', '임채원']])
        page.goto('about:blank'); page.goto(BASE + old, wait_until='load'); page.wait_for_timeout(500)
        snap(c, f'ko-legacy-link-{label}')
        page.goto('about:blank'); page.goto(BASE + '/ko/', wait_until='load'); page.wait_for_timeout(250)
        page.fill('#names', '\n'.join(['3학년 1반 김민준', '3학년 1반 이서연', '3학년 1반 박지호', '3학년 1반 최유나', '3학년 2반 정도윤', '3학년 2반 강하린', '3학년 2반 윤서준', '3학년 2반 임채원', '3학년 2반 남궁민수현', 'Supercalifragilisticexpialidocious']))
        page.wait_for_timeout(200)
        snap(c, f'ko-wheel-longnames-{label}')
        page.fill('#names', '1\t김민준\t남\n2\t이서연\t여\n3\t박지호\t남'); page.wait_for_timeout(200)
        if mob:
            page.evaluate("document.getElementById('list').scrollIntoView({ block: 'center' })"); page.wait_for_timeout(150)
            snap(c, 'ko-list-tabs-mobile')
        page.evaluate('localStorage.clear()')
        page = c.open('/ko/ladder/')
        page.fill('#names', '가\n나\n다'); page.locator('details.more summary').first.click(); page.fill('#bottom', '당첨\n꽝\n청소\n설거지\n심부름')
        tap('#go'); page.wait_for_timeout(200)
        snap(c, f'ko-ladder-extra-{label}')
        page.evaluate('localStorage.clear()')
        page = c.open('/ko/number/')
        tap('#go'); page.wait_for_timeout(100); page.fill('#min', '10'); page.fill('#max', '1'); tap('#go'); page.wait_for_timeout(100)
        snap(c, f'ko-number-error-{label}')
        page = c.open('/ko/draw/')
        page.fill('#m', '0'); tap('#go'); page.wait_for_timeout(100)
        snap(c, f'ko-draw-error-{label}')
        page = c.open('/ko/guide/ladder-fairness/')
        snap(c, f'ko-article-top-{label}')
        page.evaluate("document.querySelector('.tbl-wrap').scrollIntoView({ block: 'center' })"); page.wait_for_timeout(150)
        snap(c, f'ko-article-table-{label}')
        page = c.open('/ko/guide/share-draw-result/')
        page.evaluate("document.querySelectorAll('.prose h2')[2].scrollIntoView({ block: 'start' })"); page.wait_for_timeout(150)
        snap(c, f'ko-article-share-{label}')
        page = c.open('/ko/privacy/')
        page.evaluate("document.querySelectorAll('.prose h2')[3].scrollIntoView({ block: 'start' })"); page.wait_for_timeout(150)
        snap(c, f'ko-privacy-stats-{label}')
        page.goto(BASE + '/ko/__no-such-page/'); page.wait_for_timeout(200)
        snap(c, f'404-ko-{label}')
        page = c.open('/ko/coin/')
        page.evaluate("document.querySelector('.foot').scrollIntoView({ block: 'end' })"); page.wait_for_timeout(1200)
        snap(c, f'ko-footer-{label}')
        c.close()
        c = Ctx(b, w, h, mobile=mob, lang='ko', reduced_motion='reduce', locale='en-US')
        c.open('/ko/')
        snap(c, f'ko-langbar-{label}')
        c.close()
        c = Ctx(b, w, h, mobile=mob, lang='en', reduced_motion='reduce')
        page = c.open('/')
        tap = (lambda sel: c.page.tap(sel)) if mob else (lambda sel: c.page.click(sel))
        for _ in range(2):
            tap('#go'); page.wait_for_timeout(120); tap('#again'); page.wait_for_timeout(120)
        snap(c, f'en-wheel-out-{label}')
        page = c.open('/guide/ladder-lottery-fairness/')
        snap(c, f'en-article-top-{label}')
        page.goto(BASE + '/__no-such-page/'); page.wait_for_timeout(200)
        snap(c, f'404-en-{label}')
        c.close()
    ok(True, f'최종 스크린샷을 {SHOTS} 에 저장')


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=EXE, args=['--no-proxy-server'])
        for name, f in (('tools', tools), ('guard', guard), ('pages', pages), ('cls', cls), ('ads', ads), ('misc', misc), ('shots', shots)):
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
