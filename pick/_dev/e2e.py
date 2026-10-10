#!/usr/bin/env python3
"""브라우저로 하는 확인(Playwright): 먼저 `node pick/_dev/serve.mjs` 를 띄우고  python3 -B pick/_dev/e2e.py [묶음…]
묶음: tools(도구를 실제로 눌러 결과 확인) guard(도는 중 명단 바꾸기·순서만 바꾼 링크·옛 링크·열 수 없는 링크·긴 링크·지우기와 되돌리기)
      names(보이지 않는 글자·풀어쓴 자모로 꾸민 링크, 이모지 이름, 확인 코드, 긴 결과 이름, 링크의 명단 가져오기, 칸 고르기, 기록에 남은 이름)
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
want = set(sys.argv[1:]) or {'tools', 'guard', 'names', 'pages', 'cls', 'ads', 'misc', 'shots'}


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
        cols = page.locator('#listwarn .cols button').all_inner_texts()
        ok(len(state(page)['items']) == 3 and len(cols) == 3 and '김민준' in cols[0] and cols[0].startswith(T['colPick'].split('{k}')[0] + '2') and cols[-1].startswith(T['colPick'].split('{k}')[0] + '1'),
           f'{lang} 명단: 여러 칸을 같이 붙이면 어느 칸을 쓸지 묻는다(칸마다 단추, 번호뿐인 칸은 맨 뒤)', cols)
        page.locator('#listwarn .cols button').first.click()
        ok(state(page)['items'] == ['김민준', '이서연', '박지호'] and page.locator('#listwarn button').count() == 0, f'{lang} 명단: 이름이 든 칸을 고르면 이름만 남는다(번호 칸이 앞에 있어도)', state(page)['items'])
        page.fill('#names', '1\t김민준\t남\n2\t이서연\t여\n3\t박지호\t남')
        page.locator('#listwarn .cols button').last.click()
        ok(state(page)['items'] == ['1', '2', '3'], f'{lang} 명단: 번호 칸을 고르면 번호만(고른 대로 한다)', state(page)['items'])
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
  if (how.endsWith('reverse')) items.reverse(); else if (how === 'rotate') items.push(items.shift()); else if (how === 'swap') { const t = items[0]; items[0] = items[items.length - 1]; items[items.length - 1] = t; }
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
        ok('#r=1.' in v1 and p3.inner_text('#rname') == old and p3.inner_text('#stamp') == T['stampOld'] and p3.locator('#stamp.plain').count() == 1 and p3.locator('.stamp:not(.plain):visible').count() == 0
           and p3.locator('.linkmsg.warn[role="status"]').count() == 1 and T['legacyLink'] in p3.inner_text('.linkmsg') and not state(p3)['blocked'],
           f'{lang} 옛 형식(1) 링크: 옛 방식의 결과를 보여 주되 확인 도장은 없고(‘{T["stampOld"]}’), 지금 방식으로는 확인할 수 없다고 알림', p3.inner_text('#rname'))
        u2 = copied(p3)
        ok('#r=1.' in u2, f'{lang} 옛 형식 링크의 결과를 다시 복사하면 옛 형식 그대로(같은 결과로 열리게)')
        p3.locator('.linkmsg button').click()
        ok(p3.locator('.linkmsg').count() == 0 and p3.inner_text('#rname') == old, f'{lang} 옛 형식 링크 알림: 닫아도 결과는 그대로')
        p3.close()
        v1d = page.evaluate(FORGE_JS, [draw_url, 'v1'])
        p3 = c.ctx.new_page()
        p3.goto(v1d, wait_until='load'); p3.wait_for_function('window.__pick && window.__pick.state', timeout=10000)
        ok(p3.locator('.stamp:visible').inner_text() == T['stampOld'] and p3.locator('.stamp.plain:visible').count() == 1 and p3.locator('.linkmsg.warn').count() == 1 and p3.locator('.picked li').count() == 3, f'{lang} 옛 형식(1) 제비뽑기 링크도 열림(확인 도장 없음)')
        # 형식 번호만 1로 낮추고 순서를 바꾼 링크(평가의 N-L1): 결과는 달라질 수 있지만 '링크의 결과 그대로' 도장은 어디에도 붙지 않는다
        down = page.evaluate(FORGE_JS, [wheel_url, 'v1reverse'])
        p3.goto('about:blank'); p3.goto(down, wait_until='load'); wheel_done(p3); p3.wait_for_timeout(200)
        ok('#r=1.' in down and down != v1 and p3.locator('.stamp:not(.plain):visible').count() == 0 and p3.inner_text('#stamp') == T['stampOld'] and p3.locator('.linkmsg.warn').count() == 1, f'{lang} 형식 번호를 1로 낮추고 순서를 바꾼 링크: 확인 도장이 붙지 않는다')
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
            ok(p3.inner_text('#rname') == T['blockedHint'] and p3.evaluate("document.activeElement === document.querySelector('.linkmsg button')") and p3.locator('.linkmsg.nudge').count() == 1,
               f'{lang} 열 수 없는 링크({key}): 돌리기를 누르면 왜 안 도는지 알리고 닫기 단추를 가리킨다', p3.inner_text('#rname'))
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
        ok(p3.inner_text('#listclear') == T['listBack'] and p3.inner_text('#listalt') == T['listEdit'] and p3.inner_text('#listnote span') == T['listShared'] and p3.evaluate("document.getElementById('names').readOnly"),
           f'{lang} 링크로 연 명단: 읽기만 되는 ‘링크의 명단’이고 단추는 ‘{T["listEdit"]}’·‘{T["listBack"]}’')
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


# ---------------- 3단계-2: 이름 고르기·확인 코드·긴 결과 이름·링크의 명단 ----------------
ZW, ZWNJ, ZWJ, WJ, BOM, LRM, RLO, PDF_, SHY = '\N{ZERO WIDTH SPACE}', '\N{ZERO WIDTH NON-JOINER}', '\N{ZERO WIDTH JOINER}', '\N{WORD JOINER}', '\N{ZERO WIDTH NO-BREAK SPACE}', '\N{LEFT-TO-RIGHT MARK}', '\N{RIGHT-TO-LEFT OVERRIDE}', '\N{POP DIRECTIONAL FORMATTING}', '\N{SOFT HYPHEN}'
FAMILY = '\N{MAN}' + ZWJ + '\N{WOMAN}' + ZWJ + '\N{GIRL}' + ZWJ + '\N{BOY}'
FLAG_KR = '\N{REGIONAL INDICATOR SYMBOL LETTER K}\N{REGIONAL INDICATOR SYMBOL LETTER R}'
HEART = '\N{HEAVY BLACK HEART}\N{VARIATION SELECTOR-16}'
KEYCAP1 = '1\N{VARIATION SELECTOR-16}\N{COMBINING ENCLOSING KEYCAP}'
THUMB = '\N{THUMBS UP SIGN}\N{EMOJI MODIFIER FITZPATRICK TYPE-4}'
EVAL10 = ['김민준', '이서연', 'Alice', 'bob', 'Bob', '田中さん', '7번', '\N{GRINNING FACE}웃음', 'Zo\N{LATIN SMALL LETTER E WITH DIAERESIS}', '가나다']  # 재평가가 쓴 명단
LONG_NAMES = ['3학년 1반 김민준 선생님', '3학년 1반 이서연', 'Supercalifragilisticexpialidocious', '떡볶이 먹으러 가기 좋은 날이니까 다 같이 가요', 'Christopher', '박지호']
# 링크 속 명단을 고르지 않은 이름으로 바꿔 넣는다(이 사이트의 encodeShare는 그런 링크를 만들지 않으므로 직접 묶는다)
RAW_LINK_JS = r"""async ([url, items, ver, opts]) => { const { decodeShare } = await import('/assets/core/share.js'); const { bytesToB64u, seedToText } = await import('/assets/core/rng.js');
  const h = url.slice(url.indexOf('#') + 1); const d = decodeShare('#' + h);
  const body = bytesToB64u(new TextEncoder().encode(JSON.stringify({ o: opts || d.opts, i: items })));
  return url.slice(0, url.indexOf('#') + 1) + 'r=' + (ver || 2) + '.' + h.split('.')[1] + '.' + seedToText(d.seed) + '.' + body; }"""
# cut의 높이 여유: 줄 높이가 글꼴의 위아래 높이(Pretendard 1.19em)보다 낮으면 글자 칸이 줄 밖으로 1~3px 나간다(전체 화면의 큰 글자). 잘린 것이 아니라서 글자 크기의 5%까지는 봐준다(진짜 잘림은 한 줄 = 100% 넘게 넘친다)
SHOWN_JS = r"""(sel) => [...document.querySelectorAll(sel)].map((e) => { const cs = getComputedStyle(e); const box = e.getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(e);
  const rects = [...r.getClientRects()]; const inside = rects.every((q) => q.left >= box.left - 1 && q.right <= box.right + 1 && q.top >= box.top - 2 && q.bottom <= box.bottom + 2);
  return { text: e.textContent, cut: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + Math.max(1, parseFloat(cs.fontSize) * 0.05), ellipsis: cs.textOverflow === 'ellipsis' && cs.whiteSpace === 'nowrap', inside, right: Math.round(box.right), vw: innerWidth, size: parseFloat(cs.fontSize), lines: Math.round(box.height / parseFloat(cs.lineHeight)) }; })"""


def py_code(names, labels=None):
    """확인 코드를 파이썬 hashlib으로 따로 계산한다(이름은 이미 고른 꼴이어야 한다)."""
    import hashlib
    text = '\n'.join(sorted(names)) if labels is None else '\n'.join(names) + '\n\n' + '\n'.join(labels)
    return hashlib.sha256(text.encode('utf-8')).hexdigest()[:8]


def names(b):
    """재평가(2026-10-10)의 중간 2건과 낮음 7건을 못 박는다."""
    import unicodedata
    nfd = lambda t: unicodedata.normalize('NFD', t)
    for lang in ('ko', 'en'):
        c = Ctx(b, lang=lang, reduced_motion='reduce', permissions=['clipboard-read', 'clipboard-write'])
        page = c.page
        P = PATHS[lang]
        c.open(P['wheel'])
        T = page.evaluate("JSON.parse(document.getElementById('i18n').textContent)")
        count_of = lambda n: (T['count1'] if n == 1 and 'count1' in T else T['count']).replace('{n}', f'{n:,}')
        code_line = lambda n, code: f'{count_of(n)} · {code}'
        fp_line = lambda n, code: T['fp'].replace('{count}', count_of(n)).replace('{code}', code)
        sample = page.get_attribute('#names', 'data-sample').split('\n')

        # ---- 확인 코드: 첫 HTML에 적힌 값 = 화면 코드가 계산한 값 = 파이썬 hashlib
        first_html = re.search(r'id="listcode">([^<]*)<', c.ctx.request.get(BASE + P['wheel']).text()).group(1)
        ok(first_html == page.inner_text('#listcode') == code_line(8, py_code(sample)), f'{lang} 확인 코드: 첫 HTML = 화면 코드 = 파이썬 hashlib(예시 명단)', f'{first_html} / {page.inner_text("#listcode")} / {py_code(sample)}')
        mine = ['다람쥐', '가오리', '나비', '가오리 2']
        page.fill('#names', '\n'.join(mine)); page.wait_for_timeout(350)
        code = py_code(mine)
        ok(page.inner_text('#listcode') == code_line(4, code), f'{lang} 확인 코드: 내 명단의 코드 = 파이썬 hashlib', page.inner_text('#listcode'))
        page.click('#shuffle'); page.click('#sortaz')
        ok(page.inner_text('#listcode') == code_line(4, code) and state(page)['items'] != mine, f'{lang} 확인 코드: 순서를 바꿔도 같은 코드', page.inner_text('#listcode'))
        page.click('#go'); page.wait_for_timeout(200)
        ok(page.inner_text('#fp') == fp_line(4, code) and page.locator('#fp').is_visible(), f'{lang} 확인 코드: 결과 곁에도 그 명단의 코드가 나온다', page.inner_text('#fp'))
        page.click('#again'); page.wait_for_timeout(200)
        left = state(page)['items']
        ok(page.inner_text('#fp') == fp_line(3, py_code(left)) and page.inner_text('#listcode') == code_line(4, code), f'{lang} 확인 코드: 한 명을 빼고 돌리면 결과의 코드는 판에 남은 3명의 것(링크에 드는 명단), 명단 칸의 코드는 그대로')
        page.fill('#names', '\n'.join(mine[:3] + ['가오리 3'])); page.wait_for_timeout(100)
        ok(page.inner_text('#listcode') != code_line(4, code) and page.inner_text('#listcode').endswith(py_code(mine[:3] + ['가오리 3'])), f'{lang} 확인 코드: 이름 한 글자가 달라지면 다른 코드')
        page.fill('#names', ''); page.wait_for_timeout(100)
        ok(page.inner_text('#listcode') == '' and page.locator('#listfp').bounding_box()['height'] >= 20, f'{lang} 확인 코드: 빈 명단이면 코드가 없고 줄 자리는 그대로')

        # ---- 명단 칸: 보이지 않는 글자·풀어쓴 자모가 섞여도 같은 사람으로 읽는다
        page.fill('#names', '\n'.join([ZW + '김민준', '김민준', nfd('이서연'), '박지호' + LRM, '이서연'])); page.wait_for_timeout(150)
        warn = page.inner_text('#listwarn')
        want_hidden = T['warnHidden'].replace('{n}', '2')
        ok(state(page)['items'] == ['김민준', '김민준', '이서연', '박지호', '이서연'] and T['warnDupes'].replace('{n}', '2') in warn and want_hidden in warn,
           f'{lang} 명단 칸: 폭 없는 공백·풀어쓴 자모·방향 표시가 섞여도 같은 이름으로 읽고, 겹친 이름 2개와 보이지 않는 글자 2줄을 알린다', warn)
        ok(page.inner_text('#listcode') == code_line(5, py_code(['김민준', '김민준', '이서연', '박지호', '이서연'])), f'{lang} 명단 칸: 확인 코드도 고른 이름으로 계산')
        page.click('#dedupe')
        ok(state(page)['items'] == ['김민준', '이서연', '박지호'] and page.input_value('#names') == '김민준\n이서연\n박지호', f'{lang} 명단 칸: ‘겹친 이름 지우기’가 보이지 않는 글자만 다른 이름도 지운다', page.input_value('#names'))

        # ---- 이모지 이름: 가족(잇는 글자)·국기·하트·숫자 단추·피부색이 명단 → 결과 → 링크를 지나도 그대로
        emoji = [FAMILY + ' 가족', FLAG_KR, HEART, KEYCAP1 + '번', THUMB, '\N{GRINNING FACE}웃음']
        page.fill('#names', '\n'.join(emoji)); page.wait_for_timeout(150)
        ok(state(page)['items'] == emoji and page.inner_text('#listwarn') == '', f'{lang} 이모지 이름: 명단 칸에서 그대로(알림 없음)', state(page)['items'])
        page.click('#go'); page.wait_for_timeout(200)
        won = state(page)['last']['name']
        url = copied(page)
        p2 = c.ctx.new_page()
        p2.goto(url, wait_until='load'); wheel_done(p2); p2.wait_for_timeout(150)
        ok(won in emoji and p2.inner_text('#rname') == won and state(p2)['items'] == emoji and p2.inner_text('#stamp') == T['stamp'] and p2.locator('#stamp.plain').count() == 0 and p2.locator('.linkmsg').count() == 0 and p2.inner_text('#fp') == page.inner_text('#fp'),
           f'{lang} 이모지 이름: 링크로 열어도 그대로(같은 결과, 확인 도장, 같은 확인 코드, 알림 없음)', p2.inner_text('#rname'))
        p2.close()

        # ---- 꾸민 링크: 화면에는 같은 명단인데 글자열만 다른 링크 → 원래 링크와 같은 결과 + '정리했어요' 알림 + 도장 대신 '정리한 명단으로 다시 계산한 결과'
        def forged(tool, read, label, make):
            url = copied(page)
            want = read(page)
            base = state(page)['items']  # 그 결과를 만든 명단(고른 꼴)
            code = page.inner_text('#fp')
            hid = [ZW, ZWNJ, ZWJ, WJ, BOM, LRM, '\N{RIGHT-TO-LEFT MARK}', SHY, '\N{INVISIBLE SEPARATOR}', '\N{INVISIBLE TIMES}']
            variants = {
                '첫 이름 앞에 폭 없는 공백': [ZW + base[0]] + base[1:],
                '둘째 이름을 풀어쓴 자모로': [base[0], nfd(base[1])] + base[2:],
                '이름마다 다른 보이지 않는 글자': [nm + hid[i % len(hid)] for i, nm in enumerate(base)],
                '방향 뒤집기 표시로 감싸고 순서도 거꾸로': [RLO + nm + PDF_ for nm in reversed(base)],
                'BOM·소프트 하이픈을 이름 가운데에': [nm[:1] + BOM + SHY + nm[1:] if not (0xD800 <= ord(nm[0]) <= 0xDBFF or ord(nm[0]) > 0xFFFF) else BOM + nm for nm in base],
            }
            for how, items in variants.items():
                f = page.evaluate(RAW_LINK_JS, [url, items, 2, None])
                p3 = c.ctx.new_page()
                p3.goto(f, wait_until='load')
                if tool == 'wheel':
                    wheel_done(p3)
                else:
                    p3.wait_for_function('window.__pick && window.__pick.state', timeout=10000)
                p3.wait_for_timeout(150)
                got = read(p3)
                st = p3.locator('.stamp:visible')
                ok(f != url and got == want and sorted(state(p3)['items']) == sorted(base) and sorted(p3.input_value('#names').split('\n')) == sorted(base),
                   f'{lang} {label}: 꾸민 링크({how})도 원래 링크와 같은 결과, 명단은 정리된 원래 이름', f'{str(got)[:60]} / {str(want)[:60]}')
                ok(p3.locator('.linkmsg.warn[role="status"]').count() == 1 and T['cleanedLink'] in p3.inner_text('.linkmsg') and st.count() == 1 and st.inner_text() == T['stampCleaned'] and p3.locator('.stamp.plain:visible').count() == 1
                   and p3.locator('.stamp:not(.plain):visible').count() == 0 and p3.inner_text('#fp') == code,
                   f'{lang} {label}: 꾸민 링크({how})는 “정리했어요” 알림 + ‘{T["stampCleaned"]}’ 표시(확인 도장 아님) + 원래와 같은 확인 코드', p3.inner_text('.linkmsg p')[:40] if p3.locator('.linkmsg').count() else '알림 없음')
                p3.close()
            return url
        page.fill('#names', '\n'.join(EVAL10)); page.wait_for_timeout(150)
        page.click('#go'); page.wait_for_timeout(200)
        wheel_url = forged('wheel', lambda q: q.inner_text('#rname'), '돌림판', None)
        c.open(P['draw'])
        page.fill('#m', '3'); page.click('#go')
        forged('draw', lambda q: q.locator('.picked li span').all_inner_texts(), '3명 뽑기', None)
        page.click('#mode [data-v="order"]'); page.click('#go')
        forged('draw', lambda q: q.locator('.picked li span').all_inner_texts(), '순서 정하기', None)
        page.click('#mode [data-v="slips"]'); page.fill('#m', '2'); page.click('#go'); page.locator('.out-head .btn').click()
        forged('draw', lambda q: sorted(q.locator('.slip.win b').all_inner_texts()), '당첨 쪽지', None)
        c.open(P['teams'])
        page.fill('#k', '3'); page.click('#go')
        forged('teams', lambda q: [t.locator('li').all_inner_texts() for t in q.locator('.team').all()], '팀 나누기', None)
        # 공백을 바꾼 이름이 든 링크는 이 사이트가 만들 수 없는 꼴: 다른 결과로 열리지 않고 열 수 없는 링크로 알린다
        sp = page.evaluate(RAW_LINK_JS, [wheel_url, [' ' + EVAL10[0]] + EVAL10[1:], 2, None])
        p3 = c.ctx.new_page()
        p3.goto(sp, wait_until='load'); p3.wait_for_timeout(300)
        ok(p3.locator('.linkmsg[role="alert"]').count() == 1 and p3.inner_text('.linkmsg p') == T['badLink'] and state(p3)['last'] is None, f'{lang} 이름 앞에 공백을 붙인 링크: 열지 않는다(다른 결과로 열리지 않는다)')
        p3.close()
        # 옛 형식(1)이면서 보이지 않는 글자까지 든 링크: 두 가지를 다 알리고 확인 도장은 없다
        both = page.evaluate(RAW_LINK_JS, [wheel_url, [ZW + EVAL10[0]] + EVAL10[1:], 1, None])
        p3 = c.ctx.new_page()
        p3.goto(both, wait_until='load'); wheel_done(p3); p3.wait_for_timeout(150)
        msg = p3.inner_text('.linkmsg p')
        ok(T['legacyLink'] in msg and T['cleanedLink'] in msg and p3.locator('.linkmsg').count() == 1 and p3.inner_text('#stamp') == T['stampOld'] and p3.locator('.stamp:not(.plain):visible').count() == 0, f'{lang} 옛 형식이면서 보이지 않는 글자가 든 링크: 두 가지를 한 알림에 적고 확인 도장은 없다')
        p3.close()

        # ---- 사다리: 줄 순서와 아래 칸 순서가 결과의 일부라고 알리고(N-L2), 확인 코드가 둘 다 담는다
        c.open(P['ladder'])
        note = page.evaluate("document.getElementById('copynote').textContent")
        ok(('아래 칸' in note and '줄 순서' in note) if lang == 'ko' else ('bottom' in note.lower() and 'order' in note), f'{lang} 사다리: 링크 안내에 줄 순서와 아래 칸 순서가 둘 다 있다', note)
        ok(page.inner_text('#listcode') == code_line(10, py_code(EVAL10, [page.input_value('#bottom')])) and page.inner_text('#listcode') != code_line(10, py_code(EVAL10)),
           f'{lang} 사다리 확인 코드: 줄 순서 + 아래 칸까지 넣은 값(파이썬 hashlib과 같고, 명단 확인 코드와는 다르다)', page.inner_text('#listcode'))
        page.fill('#names', 'a\nb\nc'); page.locator('details.more summary').first.click(); page.fill('#bottom', 'W1\nW2')
        page.wait_for_timeout(100)
        lc = page.inner_text('#listcode')
        ok(lc == code_line(3, py_code(['a', 'b', 'c'], ['W1', 'W2'])), f'{lang} 사다리 확인 코드: 아래 칸을 고치면 바로 바뀐다', lc)
        page.click('#go'); page.wait_for_timeout(150)
        st = state(page)
        url = copied(page)
        ok(page.inner_text('#fp') == fp_line(3, py_code(['a', 'b', 'c'], ['W1', 'W2'])), f'{lang} 사다리: 결과 곁의 확인 코드 = 명단 칸의 코드')
        swapped = page.evaluate(RAW_LINK_JS, [url, ['a', 'b', 'c'], 2, {'rows': 14, 'labels': ['W2', 'W1']}])
        p3 = c.ctx.new_page()
        p3.goto(swapped, wait_until='load'); p3.wait_for_function('window.__pick && window.__pick.state', timeout=10000); p3.wait_for_timeout(150)
        st3 = state(p3)
        ok(st3['result'] == st['result'] and [st3['labels'][k] for k in st3['result']] != [st['labels'][k] for k in st['result']] and p3.inner_text('#fp') != page.inner_text('#fp') and p3.inner_text('#fp') == fp_line(3, py_code(['a', 'b', 'c'], ['W2', 'W1'])),
           f'{lang} 사다리: 아래 칸 순서만 바꾼 링크는 받는 결과가 바뀌고, 확인 코드도 달라져서 드러난다', p3.inner_text('#fp'))
        p3.goto('about:blank')
        order = page.evaluate(RAW_LINK_JS, [url, ['b', 'a', 'c'], 2, None])
        p3.goto(order, wait_until='load'); p3.wait_for_function('window.__pick && window.__pick.state', timeout=10000); p3.wait_for_timeout(150)
        ok(p3.inner_text('#fp') != page.inner_text('#fp') and p3.inner_text('#listcode') == code_line(3, py_code(['b', 'a', 'c'], ['W1', 'W2'])), f'{lang} 사다리: 줄 순서만 바꾼 링크도 확인 코드가 달라진다')
        p3.close()
        page.evaluate('localStorage.clear()')

        # ---- 기록도 지우기(N-L3): 기록에 그 명단의 이름이 있을 때만 묻는다
        c.open(P['coin'])
        page.click('#go'); page.wait_for_timeout(100)
        c.open(P['wheel'])
        page.fill('#names', '해\n달\n별'); page.wait_for_timeout(350)
        page.click('#listclear'); page.wait_for_timeout(150)
        ok(page.inner_text('#listclear') == T['listUndo'] and page.locator('#histleft').is_hidden() and page.evaluate("JSON.parse(localStorage.getItem('pick.history')).length") == 1,
           f'{lang} 기록도 지우기: 기록에 동전 결과뿐이면 묻지 않는다')
        page.click('#listclear'); page.wait_for_timeout(350)
        page.click('#go'); page.wait_for_timeout(150)
        page.click('#listclear'); page.wait_for_timeout(150)
        ok(page.locator('#histleft').is_visible(), f'{lang} 기록도 지우기: 그 명단으로 뽑은 기록이 있으면 묻는다')
        page.click('#listclear'); page.wait_for_timeout(350)
        page.fill('#names', '구름\n바람'); page.wait_for_timeout(350)
        page.click('#listclear'); page.wait_for_timeout(150)
        ok(page.locator('#histleft').is_hidden(), f'{lang} 기록도 지우기: 다른 명단을 지울 때는 묻지 않는다(기록에 그 이름이 없다)')
        page.evaluate('localStorage.clear()')

        # ---- 링크의 명단(N-L5): 내 명단과 따로 둔다. 고치려 하면 가져올지 묻고, 가져온 뒤에는 전 명단을 되돌릴 수 있다
        c.open(P['wheel'])
        MINE = '내 것 1\n내 것 2'
        page.fill('#names', MINE); page.wait_for_timeout(400)
        p3 = c.ctx.new_page()
        p3.goto(wheel_url, wait_until='load'); wheel_done(p3); p3.wait_for_timeout(150)
        shared_text = '\n'.join(EVAL10)
        p3.locator('#names').click()
        p3.keyboard.type('X')
        ok(p3.input_value('#names') == shared_text and p3.evaluate("localStorage.getItem('pick.list')") == MINE and p3.inner_text('#listnote span') == T['listAsk'] and p3.inner_text('#listalt') == T['listAskYes'] and p3.inner_text('#listclear') == T['listAskNo'],
           f'{lang} 링크의 명단: 글자를 치려 하면 바뀌지 않고 “내 명단으로 가져올까요”를 묻는다(저장해 둔 내 명단은 그대로)', p3.inner_text('#listnote span'))
        p3.click('#listclear')
        ok(p3.inner_text('#listnote span') == T['listShared'] and p3.input_value('#names') == shared_text and p3.evaluate("document.getElementById('names').readOnly"), f'{lang} 링크의 명단: ‘{T["listAskNo"]}’를 누르면 그대로 둔다')
        p3.click('#shuffle')
        ok(p3.input_value('#names') == shared_text and p3.inner_text('#listnote span') == T['listAsk'], f'{lang} 링크의 명단: 섞기를 눌러도 먼저 묻는다(바꾸지 않는다)')
        shown = p3.inner_text('#rname')
        p3.click('#listalt'); p3.wait_for_timeout(100)
        ok(p3.evaluate("localStorage.getItem('pick.list')") == shared_text and not p3.evaluate("document.getElementById('names').readOnly") and p3.inner_text('#listnote span') == T['listImported'] and p3.inner_text('#listalt') == T['listRestore']
           and p3.inner_text('#rname') == shown and '#' not in p3.url, f'{lang} 링크의 명단: ‘{T["listAskYes"]}’ → 내 명단으로 저장되고 고칠 수 있다(화면의 결과는 그대로, 전 명단을 되돌리는 단추가 생긴다)')
        p3.locator('#names').click(); p3.keyboard.press('Control+End'); p3.keyboard.type('\n새 이름'); p3.wait_for_timeout(400)
        ok(p3.evaluate("localStorage.getItem('pick.list')") == shared_text + '\n새 이름' and p3.inner_text('#listalt') == T['listRestore'], f'{lang} 링크의 명단: 가져온 뒤 고쳐도 전 명단을 되돌리는 단추는 남는다')
        p3.click('#listalt'); p3.wait_for_timeout(400)
        ok(p3.input_value('#names') == MINE and p3.evaluate("localStorage.getItem('pick.list')") == MINE and p3.locator('#listalt').is_hidden() and p3.inner_text('#listnote span') == T['listSaved'], f'{lang} 링크의 명단: ‘{T["listRestore"]}’ → 전에 저장한 내 명단이 돌아온다')
        p3.close()
        page.evaluate('localStorage.clear()')
        p3 = c.ctx.new_page()
        p3.goto(wheel_url, wait_until='load'); wheel_done(p3); p3.wait_for_timeout(150)
        p3.click('#listalt')
        asked = p3.inner_text('#listnote span')
        p3.click('#listalt'); p3.wait_for_timeout(100)
        ok(asked == T['listAskNew'] and p3.evaluate("localStorage.getItem('pick.list')") == shared_text and p3.locator('#listalt').is_hidden() and p3.inner_text('#listnote span') == T['listSaved'], f'{lang} 링크의 명단: 저장해 둔 명단이 없으면 가져온 뒤 되돌릴 것이 없다')
        p3.close()
        ok(not c.errors, f'{lang} names: 콘솔 오류 0', c.errors[:3])
        c.close()

    # ---- 긴 결과 이름(N-M2): 큰 결과 글자가 잘리지 않고 끝까지 보인다. 결과가 바뀌어도 아래가 밀리지 않는다
    for lang, w, h, mob in (('ko', 1366, 768, False), ('ko', 1100, 768, False), ('ko', 390, 844, True), ('ko', 320, 640, True), ('en', 1366, 768, False), ('en', 390, 844, True), ('en', 320, 640, True)):
        c = Ctx(b, w, h, mobile=mob, lang=lang, reduced_motion='reduce')
        page = c.open(PATHS[lang]['wheel'])
        tap = page.tap if mob else page.click
        pos = lambda: page.evaluate("[document.getElementById('list').getBoundingClientRect().top + scrollY, document.querySelector('.result-mid').getBoundingClientRect().top + scrollY, document.getElementById('after').getBoundingClientRect().top + scrollY, document.getElementById('recent').getBoundingClientRect().top + scrollY].map(Math.round)")
        tap('#go'); page.wait_for_timeout(150)
        short_pos = pos()
        page.fill('#names', '\n'.join(LONG_NAMES)); page.wait_for_timeout(250)
        seen, bad, moved = {}, [], []
        for _ in range(60):
            tap('#go'); page.wait_for_timeout(40)
            nm = state(page)['last']['name']
            if nm in seen:
                continue
            m = page.evaluate(SHOWN_JS, '#rname')[0]
            seen[nm] = m
            if not (m['text'] == nm and not m['cut'] and not m['ellipsis'] and m['inside'] and m['right'] <= m['vw'] and m['lines'] <= 3 and m['size'] >= 19 and page.locator('#rfull').is_hidden() and page.get_attribute('#rname', 'title') == nm):
                bad.append((nm[:10], m))
            now = pos()
            if now[:3] != short_pos[:3] or abs(now[3] - short_pos[3]) > 36:
                moved.append((nm[:10], now, short_pos))
            if len(seen) == len(LONG_NAMES):
                break
        ok(len(seen) == len(LONG_NAMES) and not bad, f'{lang} {w}px 긴 결과 이름: {len(seen)}가지 모두 큰 결과 글자에 끝까지 보인다(잘림·말줄임 없음, 3줄 이하, 19px 이상)', bad[:2])
        ok(not moved, f'{lang} {w}px 긴 결과 이름: 이름이 한 줄이든 세 줄이든 결과 자리·단추·명단 칸의 위치가 그대로다', moved[:2])
        sw = page.evaluate('[document.documentElement.scrollWidth, innerWidth]')
        ok(sw[0] <= sw[1], f'{lang} {w}px 긴 결과 이름: 가로 스크롤 0', sw)
        if (lang, w) in (('ko', 1366), ('ko', 390), ('ko', 320)) and SHOTS:
            for nm in (LONG_NAMES[0], LONG_NAMES[2]):
                for _ in range(80):
                    if state(page)['last']['name'] == nm:
                        break
                    tap('#go'); page.wait_for_timeout(30)
                page.screenshot(path=f'{SHOTS}/{PREFIX}-ko-longname-{"teacher" if nm == LONG_NAMES[0] else "oneword"}-{w}.png')
        # 아주 긴 이름(100자): 3줄에서 줄이고 바로 아래에 전체 이름을 작은 글자로 한 번 더
        huge = '가나다라마바사아자차' * 10
        page.fill('#names', huge + '\n' + huge); page.wait_for_timeout(200)
        tap('#go'); page.wait_for_timeout(120)
        m = page.evaluate(SHOWN_JS, '#rfull')[0]
        ok(page.locator('#rname.clip').count() == 1 and page.locator('#rfull').is_visible() and m['text'] == huge and not m['cut'] and m['inside'] and page.get_attribute('#rname', 'title') == huge,
           f'{lang} {w}px 아주 긴 이름(100자): 큰 글자는 3줄에서 줄이고 아래에 전체 이름을 작은 글자로 다 보여 준다', m)
        if (lang, w) in (('ko', 390),) and SHOTS:
            page.screenshot(path=f'{SHOTS}/{PREFIX}-ko-longname-100-{w}.png')
        tap('#listclear'); page.wait_for_timeout(200)
        tap('#go'); page.wait_for_timeout(120)
        ok(page.locator('#rname.clip').count() == 0 and page.locator('#rfull').is_hidden() and page.get_attribute('#rname', 'data-fit') == '0', f'{lang} {w}px 긴 이름 뒤에 짧은 이름: 큰 글자 한 줄로 돌아온다')
        # 제비뽑기·쪽지·팀·사다리 결과도 같은 원칙: 줄을 바꿔 다 보여 준다
        P = PATHS[lang]
        page.fill('#names', '\n'.join(LONG_NAMES)); page.wait_for_timeout(350)
        for tool, prep, sel in (('draw', "document.querySelector('#mode [data-v=order]').click()", '.picked li span'), ('draw', "document.querySelector('#mode [data-v=slips]').click()", '.slip b'), ('teams', '0', '.team li'), ('ladder', '0', '.pairs li b')):
            c.open(P[tool], wait=120)
            page.evaluate(prep)
            tap('#go'); page.wait_for_timeout(120)
            if tool == 'ladder':
                tap('#showall'); page.wait_for_timeout(120)
            got = page.evaluate(SHOWN_JS, sel)
            badn = [(g['text'][:10], g) for g in got if g['cut'] or g['ellipsis'] or not g['inside'] or g['right'] > g['vw']]
            ok(sorted(g['text'] for g in got) == sorted(LONG_NAMES) and not badn, f'{lang} {w}px {tool} {sel}: 긴 이름 {len(got)}개가 결과에 끝까지 보인다(잘림·말줄임 없음)', badn[:2])
            sw = page.evaluate('[document.documentElement.scrollWidth, innerWidth]')
            ok(sw[0] <= sw[1], f'{lang} {w}px {tool} {sel}: 가로 스크롤 0', sw)
            if (lang, w) in (('ko', 390), ('ko', 320)) and SHOTS:
                page.locator('#out').scroll_into_view_if_needed()
                page.screenshot(path=f'{SHOTS}/{PREFIX}-ko-longname-{tool}-{sel.split(" ")[0].strip(".")}-{w}.png')
        if mob:
            c.open(P['wheel'], wait=120)
            tap('#go'); page.wait_for_timeout(120)
            small = page.evaluate(TAP_JS)
            ok(not small, f'{lang} {w}px 긴 이름 결과 화면: 44px보다 작은 누름 영역 0', small[:4])
            for _ in range(16):
                tap('#go'); page.wait_for_timeout(70)
            squeezed = page.evaluate("[...document.querySelectorAll('#history li b')].filter((b) => b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent)")
            two = page.evaluate("[...document.querySelectorAll('#history li b')].filter((b) => b.textContent.length >= 2).length")
            ok(two >= 3 and not squeezed, f'{lang} {w}px 뽑힌 순서 이름표: 두 자리 번호도 한 줄로 보인다(긴 이름 옆에서 번호가 눌려 두 줄로 갈리지 않는다)', [two] + squeezed[:4])
        ok(not c.errors, f'{lang} {w}px 긴 결과 이름: 콘솔 오류 0', c.errors[:3])
        page.evaluate('localStorage.clear()')
        c.close()

    # ---- 전체 화면에서도 긴 이름이 끝까지 보인다(더 큰 글자로, 줄을 바꿔)
    c = Ctx(b, lang='ko', reduced_motion='reduce')
    page = c.open('/ko/')
    if page.evaluate('document.fullscreenEnabled') and page.locator('#present').is_visible():
        huge = '가나다라마바사아자차' * 10
        page.fill('#names', '\n'.join(LONG_NAMES + [huge])); page.wait_for_timeout(300)
        page.click('#present'); page.wait_for_timeout(600)
        if page.evaluate('!!document.fullscreenElement'):
            seen, bad = set(), []
            for _ in range(80):
                page.click('#go'); page.wait_for_timeout(60)
                nm = state(page)['last']['name']
                if nm in seen:
                    continue
                seen.add(nm)
                m = page.evaluate(SHOWN_JS, '#rname')[0]
                vh = page.evaluate('innerHeight')
                if not (m['text'] == nm and not m['cut'] and m['inside'] and m['right'] <= m['vw'] and m['size'] >= 26 and page.locator('#rname.clip').count() == 0 and page.locator('#rfull').is_hidden() and page.evaluate("document.getElementById('rname').getBoundingClientRect().bottom") <= vh):
                    bad.append((nm[:10], m))
                if nm == LONG_NAMES[2] and SHOTS:
                    page.screenshot(path=f'{SHOTS}/{PREFIX}-ko-longname-present.png')
                if len(seen) == len(LONG_NAMES) + 1:
                    break
            ok(len(seen) == len(LONG_NAMES) + 1 and not bad, f'전체 화면 긴 결과 이름: {len(seen)}가지(100자 이름 포함) 모두 끝까지 보인다(잘림 없음, 26px 이상)', bad[:2])
            page.evaluate('document.exitFullscreen()'); page.wait_for_timeout(400)
            m = page.evaluate(SHOWN_JS, '#rname')[0]
            last = state(page)['last']['name']
            if last == huge:  # 마지막에 나온 것이 100자 이름이면: 큰 글자는 3줄에서 줄이고 아래에 전체 이름
                ok(m['lines'] <= 3 and page.locator('#rname.clip').count() == 1 and page.inner_text('#rfull') == huge, '전체 화면을 끝내면 보통 화면의 크기로 다시 맞춘다(100자 이름: 3줄 + 아래 전체 이름)', m)
            else:
                ok(not m['cut'] and m['inside'] and m['lines'] <= 3 and page.locator('#rname.clip').count() == 0, '전체 화면을 끝내면 보통 화면의 크기로 다시 맞춘다', m)
        else:
            skip('전체 화면 긴 결과 이름', '머리 없는 브라우저에서 전체 화면이 안 됨')
    else:
        skip('전체 화면 긴 결과 이름', '이 브라우저는 전체 화면을 지원하지 않음')
    c.close()

    # ---- 휴대폰: 알리기만 하는 알림(옛 링크·정리한 링크)은 판을 조금만 가리고, 새 단추들도 44px 이상
    for lang in ('ko', 'en'):
        c = Ctx(b, 390, 844, mobile=True, lang=lang, reduced_motion='reduce', permissions=['clipboard-read', 'clipboard-write'])
        page = c.open(PATHS[lang]['wheel'])
        page.fill('#names', '\n'.join(EVAL10)); page.wait_for_timeout(350)
        page.tap('#go'); page.wait_for_timeout(150)
        url = copied(page)
        for label, f in (('정리한 링크', page.evaluate(RAW_LINK_JS, [url, [ZW + EVAL10[0]] + EVAL10[1:], 2, None])), ('옛 형식 링크', page.evaluate(RAW_LINK_JS, [url, EVAL10, 1, None]))):
            p3 = c.ctx.new_page()
            p3.goto(f, wait_until='load'); wheel_done(p3); p3.wait_for_timeout(200)
            m = p3.evaluate("(() => { const b = document.querySelector('.linkmsg').getBoundingClientRect(); const w = document.getElementById('wheel').getBoundingClientRect(); const g = document.getElementById('go').getBoundingClientRect(); return { cover: Math.round(b.bottom - w.top), wheel: Math.round(w.height), hitsGo: b.bottom > g.top, close: [...document.querySelectorAll('.linkmsg button')].map((x) => [x.offsetWidth, x.offsetHeight])[0] }; })()")
            ok(m['cover'] <= m['wheel'] * 0.16 and not m['hitsGo'] and min(m['close']) >= 44, f'{lang} 휴대폰 {label}: 알림이 판을 위쪽 {m["cover"]}px만 가리고(판 {m["wheel"]}px의 16% 이하) 돌리기 단추는 가리지 않는다, 닫기 44px', m)
            small = p3.evaluate(TAP_JS)
            ok(not small, f'{lang} 휴대폰 {label}(링크의 명단 상태): 44px보다 작은 누름 영역 0', small[:4])
            p3.tap('#listalt'); p3.wait_for_timeout(100)
            small = p3.evaluate(TAP_JS)
            sw = p3.evaluate('[document.documentElement.scrollWidth, innerWidth]')
            ok(not small and sw[0] <= sw[1] and p3.locator('#listalt').is_visible(), f'{lang} 휴대폰 {label}(가져올지 묻는 상태): 44px보다 작은 누름 영역 0, 가로 스크롤 0', small[:4])
            if SHOTS and lang == 'ko':
                p3.screenshot(path=f'{SHOTS}/{PREFIX}-ko-{"cleaned" if label == "정리한 링크" else "legacy"}-link-mobile.png')
                p3.evaluate("document.getElementById('list').scrollIntoView({ block: 'center' })"); p3.wait_for_timeout(150)
                p3.screenshot(path=f'{SHOTS}/{PREFIX}-ko-{"cleaned" if label == "정리한 링크" else "legacy"}-list-ask-mobile.png')
            p3.close()
        page.fill('#names', '1\t김민준\t남\n2\t이서연\t여\n3\t박지호\t남'); page.wait_for_timeout(200)
        small = page.evaluate(TAP_JS)
        sw = page.evaluate('[document.documentElement.scrollWidth, innerWidth]')
        ok(not small and sw[0] <= sw[1] and page.locator('#listwarn .cols button').count() == 3, f'{lang} 휴대폰 칸 고르기: 단추 3개가 44px 이상, 가로 스크롤 0', small[:4])
        ok(not c.errors, f'{lang} 휴대폰 names: 콘솔 오류 0', c.errors[:3])
        c.close()

    # ---- 링크로 연 결과의 표시(확인 도장·정리한 결과·옛 방식)가 붙어도 머리 줄 높이와 단추 줄 자리가 내가 돌렸을 때와 같다
    #      (표시가 줄보다 크면 이름이 두 줄일 때 아래가 5px쯤 밀렸다. 영어 320px에서는 표시가 다음 줄로 넘어가 25px)
    #      자리는 문서 좌표로 잰다(누르면서 화면이 조금 움직일 수 있다). 표시가 줄 안에 있는지는 기울이기 전의 상자(offset)로 본다(확인 도장은 4도 기울어 있다)
    ROW_JS = """() => { const q = (s) => document.querySelector(s); const r = (e) => e.getBoundingClientRect(); const st = q('#stamp'); const lab = q('.result-label');
      return { label: Math.round(r(lab).height * 10) / 10, bot: Math.round(r(q('.result-bot')).top + scrollY), name: Math.round(r(q('#rname')).height), stamp: st.hidden ? '' : st.textContent,
        inRow: st.hidden || (st.offsetTop >= lab.offsetTop - 1 && st.offsetTop + st.offsetHeight <= lab.offsetTop + lab.offsetHeight + 1 && st.offsetLeft + st.offsetWidth <= lab.offsetLeft + lab.offsetWidth + 1) }; }"""
    for lang in ('ko', 'en'):
        for w, h in ((390, 844), (320, 640)):
            c = Ctx(b, w, h, mobile=True, lang=lang, reduced_motion='reduce', permissions=['clipboard-read', 'clipboard-write'])
            page = c.open(PATHS[lang]['wheel'])
            T = page.evaluate("JSON.parse(document.getElementById('i18n').textContent)")
            two = [LONG_NAMES[0], LONG_NAMES[0]]  # 누가 뽑혀도 가장 큰 글자 두 줄(이름 자리를 꽉 채운다)
            page.fill('#names', '\n'.join(two)); page.wait_for_timeout(350)
            page.tap('#go'); wheel_done(page); page.wait_for_timeout(150)
            own = page.evaluate(ROW_JS)
            url = copied(page)
            links = (('ok', url, T['stamp']), ('cleaned', page.evaluate(RAW_LINK_JS, [url, [ZW + two[0], two[1]], 2, None]), T['stampCleaned']), ('legacy', page.evaluate(RAW_LINK_JS, [url, two, 1, None]), T['stampOld']))
            got = []
            for mark, u, text in links:
                p3 = c.ctx.new_page()
                p3.goto(u, wait_until='load'); wheel_done(p3); p3.wait_for_timeout(250)
                m = p3.evaluate(ROW_JS)
                got.append((mark, m, m['stamp'] == text and m['inRow'] and abs(m['label'] - own['label']) <= 0.6 and m['bot'] == own['bot'] and m['name'] == own['name']))
                p3.close()
            ok(own['stamp'] == '' and own['name'] >= 90 and all(g[2] for g in got), f'{lang} {w}px 표시 세 가지(확인 도장·정리한 결과·옛 방식): 머리 줄 한 줄에 들어가고 단추 줄 자리가 내가 돌렸을 때와 같다', [own] + [g[:2] for g in got if not g[2]])
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
    # 3단계-2: 긴 이름(두세 줄로 나오는 결과)·영어판에서도, 그리고 링크로 열어 결과가 뜰 때도 밀리지 않는다
    SHIFT = "() => { window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shift += e.value; }).observe({ type: 'layout-shift' }); }"
    for lang, w, h, mob in (('ko', 390, 844, True), ('ko', 1366, 768, False), ('en', 390, 844, True), ('en', 1366, 768, False), ('ko', 320, 640, True)):
        c = Ctx(b, w, h, mobile=mob, lang=lang, permissions=['clipboard-read', 'clipboard-write'])
        page = c.open(PATHS[lang]['wheel'])
        page.fill('#names', '\n'.join(LONG_NAMES[:4])); page.wait_for_timeout(400)
        page.evaluate(SHIFT)
        worst, lines, tall = 0, set(), (0, None)
        for _ in range(4):
            before = page.evaluate('window.__shift')
            page.click('#go'); spin_start(page); wheel_done(page); page.wait_for_timeout(500)
            worst = max(worst, page.evaluate('window.__shift') - before)
            lines.add(page.evaluate("Math.round(document.getElementById('rname').getBoundingClientRect().height / parseFloat(getComputedStyle(document.getElementById('rname')).lineHeight))"))
            hgt = page.evaluate("document.getElementById('rname').getBoundingClientRect().height")
            if hgt > tall[0]:
                tall = (hgt, copied(page))  # 이름 자리를 가장 많이 채운 결과의 링크: 표시가 붙을 때 아래가 밀리기 가장 쉬운 경우
        ok(worst <= 0.02, f'CLS {lang} {w}px 긴 이름: 결과가 뜨는 순간 화면 밀림 {round(worst, 4)} (결과 이름 {sorted(lines)}줄)')
        url = tall[1]
        f = page.evaluate(RAW_LINK_JS, [url, [ZW + LONG_NAMES[0]] + LONG_NAMES[1:4], 2, None])
        for label, u in (('링크', url), ('정리한 링크', f)):
            p2 = c.ctx.new_page()
            p2.add_init_script("window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shift += e.value; }).observe({ type: 'layout-shift', buffered: true });")
            p2.goto(u, wait_until='load'); wheel_done(p2); p2.wait_for_timeout(600)
            v = p2.evaluate('window.__shift')
            ok(v <= 0.02, f'CLS {lang} {w}px {label}로 열기: 처음부터 결과가 뜰 때까지 화면 밀림 {round(v, 4)} (이름 높이 {round(tall[0])}px)')
            p2.close()
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
    # ---- 3단계-2: 확인 코드, 정리한 링크, 옛 링크, 링크의 명단, 칸 고르기, 열 수 없는 링크에서 돌리기
    for label, w, h, mob in (('desktop', 1366, 768, False), ('mobile', 390, 844, True), ('320', 320, 640, True)):
        c = Ctx(b, w, h, mobile=mob, lang='ko', reduced_motion='reduce', permissions=['clipboard-read', 'clipboard-write'])
        tap = (lambda sel: c.page.tap(sel)) if mob else (lambda sel: c.page.click(sel))
        page = c.open('/ko/')
        page.fill('#names', '\n'.join(EVAL10)); page.wait_for_timeout(350)
        tap('#go'); page.wait_for_timeout(200)
        snap(c, f'ko-code-result-{label}')
        if mob:
            page.evaluate("document.getElementById('list').scrollIntoView({ block: 'center' })"); page.wait_for_timeout(150)
            snap(c, f'ko-code-list-{label}')
        url = copied(page)
        cleaned = page.evaluate(RAW_LINK_JS, [url, [ZW + EVAL10[0]] + EVAL10[1:], 2, None])
        legacy = page.evaluate(RAW_LINK_JS, [url, EVAL10, 1, None])
        page.goto('about:blank'); page.goto(cleaned, wait_until='load'); wheel_done(page); page.wait_for_timeout(250)
        snap(c, f'ko-cleaned-link-{label}')
        page.locator('#names').click(force=True); page.wait_for_timeout(120)
        if mob:
            page.evaluate("document.getElementById('list').scrollIntoView({ block: 'center' })"); page.wait_for_timeout(150)
        snap(c, f'ko-shared-ask-{label}')
        tap('#listalt'); page.wait_for_timeout(150)
        snap(c, f'ko-shared-imported-{label}')
        page.evaluate('localStorage.clear()')
        page.goto('about:blank'); page.goto(legacy, wait_until='load'); wheel_done(page); page.wait_for_timeout(250)
        snap(c, f'ko-legacy-link3b-{label}')
        page.goto('about:blank'); page.goto(BASE + '/ko/#r=2.w.AAAA', wait_until='load'); page.wait_for_timeout(300)
        tap('#go'); page.wait_for_timeout(250)
        snap(c, f'ko-badlink-go-{label}')
        page.goto('about:blank'); page.goto(BASE + '/ko/', wait_until='load'); page.wait_for_timeout(250)
        page.fill('#names', '1\t김민준\t남\n2\t이서연\t여\n3\t박지호\t남'); page.wait_for_timeout(200)
        if mob:
            page.evaluate("document.getElementById('listwarn').scrollIntoView({ block: 'center' })"); page.wait_for_timeout(150)
        snap(c, f'ko-columns-{label}')
        page.evaluate('localStorage.clear()')
        page = c.open('/ko/ladder/')
        page.fill('#names', '가\n나\n다'); page.locator('details.more summary').first.click(); page.fill('#bottom', '당첨\n벌칙')
        tap('#go'); page.wait_for_timeout(150); tap('#showall'); page.wait_for_timeout(150)
        snap(c, f'ko-ladder-code-{label}')
        page = c.open('/ko/draw/')
        page.fill('#names', '\n'.join(LONG_NAMES)); page.wait_for_timeout(300)
        page.fill('#m', '4'); tap('#go'); page.wait_for_timeout(150)
        snap(c, f'ko-draw-long-{label}')
        page.evaluate('localStorage.clear()')
        if label != '320':
            page = c.open('/ko/guide/share-draw-result/')
            page.evaluate("document.querySelectorAll('.prose h2')[3].scrollIntoView({ block: 'start' })"); page.wait_for_timeout(150)
            snap(c, f'ko-article-code-{label}')
            page = c.open('/ko/privacy/')
            page.evaluate("document.querySelectorAll('.prose h2')[5].scrollIntoView({ block: 'center' })"); page.wait_for_timeout(150)
            snap(c, f'ko-privacy-fonts-{label}')
        c.close()
    c = Ctx(b, 390, 844, mobile=True, lang='en', reduced_motion='reduce', permissions=['clipboard-read', 'clipboard-write'])
    page = c.open('/')
    page.fill('#names', 'Christopher Alexander Montgomery\nOlivia\nNoah'); page.wait_for_timeout(300)
    for _ in range(40):
        page.tap('#go'); page.wait_for_timeout(40)
        if state(page)['last']['name'].startswith('Christopher'):
            break
    snap(c, 'en-longname-mobile')
    url = copied(page)
    cleaned = page.evaluate(RAW_LINK_JS, [url, [ZW + 'Olivia', 'Noah', 'Christopher Alexander Montgomery'], 2, None])
    page.goto('about:blank'); page.goto(cleaned, wait_until='load'); wheel_done(page); page.wait_for_timeout(250)
    snap(c, 'en-cleaned-link-mobile')
    c.close()
    c = Ctx(b, 1366, 768, lang='ko', color_scheme='dark', reduced_motion='reduce', permissions=['clipboard-read', 'clipboard-write'])
    page = c.open('/ko/')
    page.fill('#names', '\n'.join(EVAL10)); page.wait_for_timeout(350)
    page.click('#go'); page.wait_for_timeout(200)
    cleaned = page.evaluate(RAW_LINK_JS, [copied(page), [ZW + EVAL10[0]] + EVAL10[1:], 2, None])
    page.goto('about:blank'); page.goto(cleaned, wait_until='load'); wheel_done(page); page.wait_for_timeout(250)
    snap(c, 'ko-cleaned-link-dark')
    c.close()
    ok(True, f'최종 스크린샷을 {SHOTS} 에 저장')


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=EXE, args=['--no-proxy-server'])
        for name, f in (('tools', tools), ('guard', guard), ('names', names), ('pages', pages), ('cls', cls), ('ads', ads), ('misc', misc), ('shots', shots)):
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
