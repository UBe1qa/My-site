#!/usr/bin/env python3
"""토독 화면 확인(Playwright): python3 typing/_dev/e2e.py [스크린샷 폴더]     서버: node typing/_dev/serve.mjs (8445)
SEC=3 처럼 주면 그 묶음만: 1 모든 페이지(오류·깨진 그림·가로 스크롤·어두운 화면·동작 줄이기) · 2 화면 밀림(CLS) ·
3 한국어 속도 측정(조합 입력·결과·기록·한/영 안내) · 4 영어 속도 측정·영타 · 5 자리 연습·문장 연습 · 6 휴대폰(터치 자판) · 7 광고 자리·연출·언어 띠 · 8 스크린샷 ·
9 제3자 평가에서 나온 것(누른 키 수, 천지인 중간 모양, 낱말 단위 한/영 안내, 팬그램·문장 되풀이, 휴대폰 옵션·누르는 크기, 초점, 통과 기준, 기록 목록, 404 언어 틀)

한글은 CDP Input.imeSetComposition / Input.insertText 로 조합 입력을 흉내 낸다(컴퓨터는 글쇠 이벤트 key=Process, code=KeyX 도 같이).
실제 한글 입력기(윈도우·맥·아이폰·안드로이드)는 이 작업 공간에서 확인할 수 없다.
광고 요청은 정규식으로 막는다. 브라우저는 하나만 띄운다.
"""
import sys
sys.dont_write_bytecode = True
import datetime
import json
import os
import re
import unicodedata
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8445'
ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else None
ONLY = set(os.environ.get('SEC', '').split(',')) - {''}
T0 = datetime.datetime(2026, 10, 10, 9, 0, 0)
fails, passed = [], 0

# 두벌식 입력기 흉내(글쇠 → 확정된 글자 / 조합 중인 글자). tests/run.mjs 의 Ime 와 같은 규칙.
SIM = r"""
window.__sim = (function () {
  const C19 = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', V21 = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ', F28 = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  const VV = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
  const FF = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
  const isC = (k) => C19.includes(k), isV = (k) => 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅛㅜㅠㅡㅣ'.includes(k);
  let c = '', v = '', f = '';
  const cur = () => (c && v) ? String.fromCharCode(0xAC00 + (C19.indexOf(c) * 21 + V21.indexOf(VV[v] || v)) * 28 + (f ? F28.indexOf(FF[f] || f) : 0)) : (c || (v ? VV[v] || v : ''));
  return {
    reset() { c = v = f = ''; },
    key(k) {
      let commit = '', plain = '', back = false;
      const done = () => { commit += cur(); c = v = f = ''; };
      if (k === '\b') { if (f) f = f.slice(0, -1); else if (v) v = v.slice(0, -1); else if (c) c = ''; else back = true; }
      else if (isC(k)) {
        if (c && v && !f && F28.includes(k)) f = k;
        else if (c && v && f.length === 1 && FF[f + k]) f += k;
        else { done(); c = k; }
      } else if (isV(k)) {
        if (c && !v) v = k;
        else if (c && v.length === 1 && !f && VV[v + k]) v += k;
        else if (!c && v.length === 1 && VV[v + k]) v += k;
        else if (c && v && f) { const mv = f.slice(-1); f = f.slice(0, -1); done(); c = mv; v = k; }
        else { done(); v = k; }
      } else { done(); plain = k; }
      return { commit, comp: cur(), plain, back };
    }
  };
})();
"""
CODE = {' ': 'Space', '.': 'Period', ',': 'Comma', '?': 'Slash', '!': 'Digit1', "'": 'Quote', '"': 'Quote', ';': 'Semicolon', ':': 'Semicolon', '-': 'Minus', '(': 'Digit9', ')': 'Digit0'}
HANGUL = re.compile(r'[ᄀ-ᇿ㄰-㆏가-힣]')
JAMO = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㄲㄸㅃㅆㅉㅏㅐㅑㅒㅓㅔㅕㅖㅗㅛㅜㅠㅡㅣ'


def ok(cond, msg, extra=''):
    global passed
    if cond:
        passed += 1
    else:
        fails.append(msg + (' → ' + str(extra) if extra != '' else ''))
        print('  실패', msg, extra)


def sec(n):
    return not ONLY or str(n) in ONLY


class Typist:
    """한 글쇠씩 친다. phys=True 면 자판(글쇠 이벤트 + 조합), False 면 터치 자판(글자만 들어옴)."""

    def __init__(self, pg, cdp, phys=True):
        self.pg, self.cdp, self.phys = pg, cdp, phys

    def code(self, k):
        if k in CODE:
            return CODE[k]
        q = self.pg.evaluate('k => { const p = TJ.keyPlace(k); return p ? p.ch : "" }', k)
        return ('Key' + q.upper()) if q.isalpha() else ('Digit' + q if q.isdigit() else 'Unidentified')

    def key(self, k, dt=150):
        self.pg.clock.run_for(dt)
        r = self.pg.evaluate('k => __sim.key(k)', k)
        hangul = not r['plain'] and not r['back'] and k != '\b'
        if self.phys and hangul:
            self.cdp.send('Input.dispatchKeyEvent', {'type': 'rawKeyDown', 'key': 'Process', 'code': self.code(k), 'windowsVirtualKeyCode': 229, 'nativeVirtualKeyCode': 229})
        if r['commit']:
            self.cdp.send('Input.insertText', {'text': r['commit']})
        if k == '\b':
            if r['back']:
                self.pg.keyboard.press('Backspace')
            else:   # 조합 중인 글자에서 낱자 하나를 지운다. 자판이면 지우기 키가 눌린 것도 같이 보인다(key 는 Process, code 는 Backspace)
                if self.phys:
                    self.cdp.send('Input.dispatchKeyEvent', {'type': 'rawKeyDown', 'key': 'Process', 'code': 'Backspace', 'windowsVirtualKeyCode': 229, 'nativeVirtualKeyCode': 229})
                self.cdp.send('Input.imeSetComposition', {'text': r['comp'], 'selectionStart': len(r['comp']), 'selectionEnd': len(r['comp'])})
                if self.phys:
                    self.cdp.send('Input.dispatchKeyEvent', {'type': 'keyUp', 'key': 'Backspace', 'code': 'Backspace', 'windowsVirtualKeyCode': 8})
        elif r['plain']:
            if self.phys:
                self.pg.keyboard.press('Space' if k == ' ' else ('Enter' if k == '\n' else k))
            else:
                self.cdp.send('Input.insertText', {'text': k})
        elif r['comp']:
            self.cdp.send('Input.imeSetComposition', {'text': r['comp'], 'selectionStart': len(r['comp']), 'selectionEnd': len(r['comp'])})
        if self.phys and hangul:
            self.cdp.send('Input.dispatchKeyEvent', {'type': 'keyUp', 'key': 'Process', 'code': self.code(k), 'windowsVirtualKeyCode': 229, 'nativeVirtualKeyCode': 229})

    def keys(self):
        return self.pg.evaluate('TJ.hangul.keyStream(__E.T.text)')

    def run(self, n=None, wrong_at=(), fix_at=(), slow='ㅂㅋㅍqzxp'):
        """글을 앞에서부터 n 글쇠(없으면 끝날 때까지) 친다. wrong_at 자리는 틀리게, fix_at 자리는 틀렸다가 고쳐서."""
        i = 0
        while not self.pg.evaluate('__E.done'):
            ks = self.keys()
            if i >= len(ks) or (n is not None and i >= n):
                break
            k = ks[i]
            if i in fix_at and wrong(k) != k and k not in ' \n':
                self.key(wrong(k), 180); self.key('\b', 240); self.key(k)
            elif i in wrong_at and wrong(k) != k and k not in ' \n':
                self.key(wrong(k))
            else:
                self.key(k, 420 if k in slow else 150)
            i += 1
        return i


def wrong(k):
    if k in 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㄲㄸㅃㅆㅉ':
        return 'ㅁ' if k != 'ㅁ' else 'ㄴ'
    if k in 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅛㅜㅠㅡㅣ':
        return 'ㅓ' if k != 'ㅓ' else 'ㅏ'
    if k.isalpha():
        return 'x' if k != 'x' else 'c'
    return k


class Env:
    def __init__(self, browser):
        self.b = browser

    def ctx(self, w=1366, h=768, mobile=False, lang='ko', dark=False, reduced=False, dpr=1):
        c = self.b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr, is_mobile=mobile, has_touch=mobile,
                               locale='ko-KR' if lang == 'ko' else 'en-US', color_scheme='dark' if dark else 'light',
                               reduced_motion='reduce' if reduced else 'no-preference', ignore_https_errors=True)
        c.route(re.compile(r'googlesyndication|doubleclick|adservice|fundingchoices'), lambda r: r.abort())
        return c

    def page(self, c, path, clock=True, shots_font=False):
        pg = c.new_page()
        pg._errs = []
        pg.on('pageerror', lambda e: pg._errs.append(str(e)))
        pg.on('console', lambda m: pg._errs.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
        if shots_font:  # 스크린샷은 Pretendard 로: optional 을 swap 으로 바꿔 받는다(처음 여는 브라우저는 optional 이면 기기 글꼴로 그린다)
            def font(route):
                r = route.fetch()
                route.fulfill(response=r, body=r.text().replace('font-display:optional', 'font-display:swap'))
            pg.route('**/assets/pretendard.css', font)
            pg.route(re.compile(r'localhost:8445/(?!assets/)[^.]*$'), font)   # 페이지 <head> 의 조각 글꼴(@font-face, optional)도 같이
        if clock:
            pg.clock.install(time=T0)
        pg.goto(BASE + path, wait_until='load')
        if shots_font:
            try:
                pg.wait_for_function('document.fonts.status === "loaded"', timeout=10000)
            except Exception:
                pass
        pg.wait_for_timeout(350)
        return pg

    def tool(self, c, path, mobile=False, shots_font=False):
        pg = self.page(c, path, shots_font=shots_font)
        pg.add_script_tag(content=SIM)
        cdp = c.new_cdp_session(pg)
        if mobile:
            pg.tap('#trap', position={'x': 60, 'y': 30})
        else:
            pg.evaluate('document.getElementById("trap").focus()')
        pg.clock.pause_at(T0 + datetime.timedelta(seconds=5))
        return pg, Typist(pg, cdp, phys=not mobile)


def shot(pg, name, full=False):
    if OUT:
        OUT.mkdir(parents=True, exist_ok=True)
        pg.screenshot(path=str(OUT / (name + '.png')), full_page=full)


def finish_wait(pg):
    pg.clock.run_for(1600)
    pg.wait_for_timeout(250)


def visible_hangul_outside_ko(pg):
    return pg.evaluate(r'''() => { const re = /[ᄀ-ᇿ㄰-㆏가-힣]/; const out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const n = w.currentNode, p = n.parentElement; if (!re.test(n.nodeValue) || !p || p.closest('script,style,[lang="ko"]')) continue; out.push(n.nodeValue.trim().slice(0, 30)); }
      document.querySelectorAll('[aria-label],[title],[placeholder]').forEach((e) => { if (e.closest('[lang="ko"]')) return; for (const a of ['aria-label', 'title', 'placeholder']) { const v = e.getAttribute(a); if (v && re.test(v)) out.push(a + '=' + v); } });
      return out; }''')


def first_line_visible(pg):
    return pg.evaluate('''() => { const v = document.querySelector('.view, .now').getBoundingClientRect(), c = document.querySelector('#txt .c').getBoundingClientRect(), cur = document.querySelector('#txt .cur'); return c.top >= v.top - 1 && c.bottom <= v.bottom + 1 && !!cur && cur === document.querySelector('#txt .c'); }''')


def read_result(pg):
    return pg.evaluate('''() => { const t = (id) => { const e = document.getElementById(id); return e ? e.textContent : null; };
      return { speed: t('r-speed'), unit: t('r-unit'), formula: t('r-formula'), formula2: t('r-formula2'), cmp: t('r-cmp'), acc: t('r-acc'), accd: t('r-accd'), skip: t('r-skip'),
        rep: __E.result && __E.result.rep, v: __E.result && __E.result.v, done: __E.done, mode: __E.session.mode,
        missed: __E.result ? __E.result.missed.map((m) => m.key) : [], slow: __E.result ? __E.result.slow.slice(0, 4).map((m) => m.key) : [],
        mapMiss: [...document.querySelectorAll('#kb .k.miss')].map((k) => k.getAttribute('data-k')), mapSlow: [...document.querySelectorAll('#kb .k.slowk')].map((k) => k.getAttribute('data-k')),
        resultShown: !document.getElementById('result').hidden, playShown: !document.getElementById('playbox').hidden }; }''')


def nums(s):
    return [float(x.replace(',', '')) for x in re.findall(r'\d[\d,]*(?:\.\d+)?', s or '')]


def check_formula(tag, r, ko=True):
    """화면의 식을 글자 그대로 읽어 다시 계산해도 화면의 속도가 나오는가."""
    f = nums(r['formula'])
    if ko:      # 맞게 친 N타 ÷ T초 × 60 = S타/분
        ok(len(f) == 4 and f[2] == 60, f'{tag} 식 모양', r['formula'])
        n, t, _, s = f
        ok(int(n * 60 / t + 0.5) == int(s), f'{tag} 식을 다시 계산하면 같은 수', r['formula'])
    else:       # N correct characters ÷ 5 ÷ T s × 60 = S WPM
        ok(len(f) == 5 and f[1] == 5 and f[3] == 60, f'{tag} 식 모양', r['formula'])
        n, _, t, _, s = f
        ok(int(n / 5 / t * 60 + 0.5) == int(s), f'{tag} 식을 다시 계산하면 같은 수', r['formula'])
    ok(str(int(s)) == (r['speed'] or '').replace(',', '') or r['speed'] is None, f'{tag} 큰 숫자 = 식의 결과', (r['speed'], r['formula']))
    a = nums(r['accd'])
    if a:
        typed, okk = (a[0], a[1]) if ko else (a[1], a[0])
        shown = int(r['acc'].rstrip('%'))
        calc = round(okk * 100 / typed)
        ok(shown == calc or (calc == 100 and shown == 99 and okk < typed), f'{tag} 정확도 = 맞은 키 ÷ 누른 키', (r['acc'], r['accd']))


def ls(pg, key):
    return pg.evaluate('k => JSON.parse(localStorage.getItem(k) || "null")', key)


# ---------- 1. 모든 페이지 ----------
def all_pages(env):
    print('1. 모든 페이지')
    paths = re.findall(r'<loc>https://typing\.lumenlab\.page([^<]*)</loc>', (ROOT / 'sitemap.xml').read_text(encoding='utf-8'))
    for w, h, mobile in ((1366, 768, False), (390, 844, True), (320, 640, True)):
        c = env.ctx(w, h, mobile)
        for path in paths + ['/no-such-page/']:
            pg = env.page(c, path, clock=False)
            r = pg.evaluate('''() => ({ hs: document.documentElement.scrollWidth - innerWidth, h1: [...document.querySelectorAll('h1')].filter((h) => h.getClientRects().length).length,
              broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
              wide: [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > innerWidth + 1 && !e.closest('.tbl,.view,.txt,.more-pop,.sr,.ln,.mine,.rec-col,.burst,.skip') && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map((e) => e.tagName + '.' + e.className) })''')
            ok(r['hs'] <= 0, f'{path} {w}px 가로 스크롤 0', r['hs'])
            ok(not r['wide'], f'{path} {w}px 화면 밖으로 나간 요소', r['wide'])
            ok(r['h1'] == 1 and r['broken'] == 0, f'{path} {w}px h1 하나·깨진 그림 0', r)
            errs = [e for e in pg._errs if not (path == '/no-such-page/' and 'status of 404' in e)]   # 없는 주소 자체의 404 응답은 오류가 아니다
            ok(not errs, f'{path} {w}px 콘솔 오류 0', errs[:3])
            if path == '/no-such-page/':
                ok(pg.evaluate('document.title').startswith('Page not found'), '없는 주소는 404 화면')
            if w == 320 and pg.evaluate('!!document.querySelector(".tbl")'):
                t = pg.evaluate('[...document.querySelectorAll(".tbl:not(.wide)")].filter((e) => e.scrollWidth > e.clientWidth + 1).length')
                ok(t == 0, f'{path} 320px 에서 넘치는 표(넓은 표 표시 없이)', t)
            pg.close()
        c.close()
    # 어두운 화면·동작 줄이기에서 내용이 다 보인다
    for kw, tag in (({'dark': True}, '어두운 화면'), ({'reduced': True}, '동작 줄이기')):
        c = env.ctx(**kw)
        for path in paths:
            pg = env.page(c, path, clock=False)
            r = pg.evaluate('''() => { const bg = getComputedStyle(document.body).backgroundColor; const hid = [...document.querySelectorAll('main *')].filter((e) => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width > 4 && b.height > 4 && e.children.length === 0 && e.textContent.trim() && (parseFloat(s.opacity) < 0.2) && !e.closest('.trap,[hidden]'); }).length;
              return { bg, hid, anim: document.documentElement.classList.contains('anim') }; }''')
            ok(r['hid'] == 0, f'{path} {tag}: 숨은 채 남은 글자 0', r['hid'])
            if 'dark' in kw:
                ok(r['bg'] == 'rgb(18, 18, 24)', f'{path} 어두운 바탕', r['bg'])
            else:
                ok(not r['anim'], f'{path} 동작 줄이기면 연출을 켜지 않는다')
            ok(not pg._errs, f'{path} {tag} 콘솔 오류 0', pg._errs[:3])
            pg.close()
        c.close()


# ---------- 2. 화면 밀림(CLS) ----------
CLS_JS = '''() => { window.__cls = 0; window.__shifts = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push((e.sources || []).map((s) => s.node && (s.node.id || s.node.className || s.node.nodeName)).join(',')); } }).observe({ type: 'layout-shift', buffered: true }); }'''


def cls(env):
    print('2. 화면 밀림(CLS)')
    paths = re.findall(r'<loc>https://typing\.lumenlab\.page([^<]*)</loc>', (ROOT / 'sitemap.xml').read_text(encoding='utf-8'))
    for w, h, mobile in ((1366, 768, False), (390, 844, True)):
        c = env.ctx(w, h, mobile)
        for path in paths:
            pg = c.new_page()
            pg.add_init_script('(' + CLS_JS + ')()')
            # 글꼴 파일을 늦게 보낸다(느린 망). optional 이라 늦게 와도 글자를 바꾸지 않아야 한다
            pg.route(re.compile(r'\.woff2'), lambda r: (pg.wait_for_timeout(600), r.continue_()))
            pg.goto(BASE + path, wait_until='load')
            pg.wait_for_timeout(1500)
            v = pg.evaluate('window.__cls')
            ok(v <= 0.02, f'{path} {w}px 처음 열 때 화면 밀림 {v:.4f} (0.02 이하)', pg.evaluate('window.__shifts.slice(0, 4)'))
            pg.close()
        c.close()
    # 저장된 설정·기록이 있는 채로 다시 열 때(고른 단추·기록 칸이 늦게 채워져도 밀리지 않는다)
    c = env.ctx()
    pg = c.new_page()
    pg.goto(BASE + '/ko/', wait_until='load')
    pg.evaluate('''() => { localStorage.setItem('todok.set', JSON.stringify({ 'ko/test': { kind: 'words', mode: 'count', count: 50, secs: 60, punct: true } }));
      const runs = []; for (let i = 0; i < 8; i++) runs.push({ cond: 'test|ko|words|c50|p', v: 300 + i, unit: 'ko', acc: 97, secs: 30, at: Date.now() - i * 60000, tool: 'test', lang: 'ko', kind: 'words', len: 'c50' });
      localStorage.setItem('todok.runs', JSON.stringify(runs)); localStorage.setItem('todok.best', JSON.stringify({ 'test|ko|words|c50|p': { v: 307, at: runs[7].at, acc: 97 } }));
      localStorage.setItem('todok.keys', JSON.stringify({ ko: { 'ㅊ': [5, 20], 'ㅓ': [3, 40], 'ㅡ': [2, 9], 'ㄹ': [2, 30], 'ㅂ': [1, 5], 'ㅆ': [1, 3], 'ㅎ': [1, 9] } })); }''')
    pg.close()
    for w, h, mobile in ((1366, 768, False), (390, 844, True)):
        pg = c.new_page()
        pg.set_viewport_size({'width': w, 'height': h})
        pg.add_init_script('(' + CLS_JS + ')()')
        pg.goto(BASE + '/ko/', wait_until='load')
        pg.wait_for_timeout(1200)
        v = pg.evaluate('window.__cls')
        ok(v <= 0.02, f'/ko/ {w}px 기록·설정이 있는 채로 열 때 화면 밀림 {v:.4f}', pg.evaluate('window.__shifts.slice(0, 4)'))
        ok(pg.evaluate('document.querySelector("#kind [aria-pressed=true]").dataset.v') == 'words' and pg.evaluate('!document.getElementById("len-c").hasAttribute("data-off")'), '저장한 설정대로 열린다')
        ok(pg.evaluate('document.querySelectorAll("#rec-list li").length') == 5, '최근 기록 다섯 줄')
        pg.close()
    c.close()
    # 시간이 다 되어 결과로 바뀔 때(입력 없이): 종이 높이가 그대로라 아래 내용이 밀리지 않는다
    for path, lang in (('/ko/', 'ko'), ('/', 'en')):
        c = env.ctx(lang=lang)
        pg, ty = env.tool(c, path)
        pg.evaluate('(' + CLS_JS + ')()')
        box0 = pg.evaluate('document.querySelector(".stage").getBoundingClientRect().height')
        y0 = pg.evaluate('document.querySelector(".records").getBoundingClientRect().top')
        ty.run(n=40, wrong_at={7})
        pg.clock.run_for(31000)
        pg.wait_for_timeout(400)
        r = read_result(pg)
        ok(r['done'] and r['resultShown'], f'{path} 시간이 끝나면 결과가 나온다')
        box1 = pg.evaluate('document.querySelector(".stage").getBoundingClientRect().height')
        y1 = pg.evaluate('document.querySelector(".records").getBoundingClientRect().top')
        ok(abs(box0 - box1) < 0.6 and abs(y0 - y1) < 0.6, f'{path} 결과로 바뀌어도 종이 높이·아래 위치 그대로', (box0, box1, y0, y1))
        inner = pg.evaluate('(() => { const s = document.querySelector(".stage").getBoundingClientRect(); return [...document.querySelectorAll("#result *")].filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && b.bottom > s.bottom + 1; }).map((e) => e.id || e.className).slice(0, 4); })()')
        ok(not inner, f'{path} 결과가 종이 안에 다 들어간다(잘린 것 없음)', inner)
        c.close()


# ---------- 3. 한국어 속도 측정 ----------
def ko_test(env):
    print('3. 한국어 속도 측정')
    c = env.ctx()
    pg, ty = env.tool(c, '/ko/')
    ok(pg.evaluate('document.activeElement.id') == 'trap', '컴퓨터: 열자마자 치는 칸에 초점')
    ok(first_line_visible(pg), '시작 전: 글의 첫 줄과 지금 칠 자리가 보인다', pg.evaluate('document.getElementById("txt").style.transform'))
    ok(pg.evaluate('document.getElementById("daily").textContent') == '10월 10일의 글', '오늘의 글 표시', pg.evaluate('document.getElementById("daily").textContent'))
    first = pg.evaluate('__E.T.text')
    keys = ty.keys()
    ok(pg.evaluate('document.getElementById("nextkey").textContent') == keys[0], '시작 전: 다음 키 = 첫 글쇠')
    # 조합 중인 글자: 목표 글자를 바꿔 그리지 않고(같은 글자 그대로) 틀림 표시도 없다
    n = 0
    while True:   # 글쇠 셋짜리 첫 글자를 찾아 그 가운데까지
        ch = pg.evaluate('i => __E.T.chars[i]', 0)
        break
    ty.key(keys[0])
    st = pg.evaluate('''() => { const s = document.querySelector('#txt .c'); return { cls: s.className, text: s.textContent, target: __E.T.chars[0], f: s.style.getPropertyValue('--f'), bad: document.querySelectorAll('#txt .bad').length, running: document.documentElement.classList.contains('running') }; }''')
    ok(st['text'] == st['target'] and 'pend' in st['cls'] and st['bad'] == 0 and st['f'].endswith('%'), '조합 중: 목표 글자는 그대로, 친 만큼만 색이 찬다', st)
    ok(st['running'], '첫 글쇠에서 시작')
    ok(pg.evaluate('document.getElementById("nextkey").textContent') == keys[1], '다음 키가 따라온다')
    ok(pg.evaluate('getComputedStyle(document.querySelector(".start")).visibility') == 'hidden', '치기 시작하면 시작 안내가 사라진다(자리는 그대로)')
    # 틀린 글쇠 하나, 틀렸다 고친 글쇠 하나를 섞어 끝까지
    ty.run(wrong_at={21, 60, 88}, fix_at={35, 70})
    first_burst = pg.evaluate('document.getElementById("burst").hidden')
    pg.keyboard.press('Enter')   # 결과가 뜬 직후의 Enter 는 무시(치던 손이 넘어온 것)
    ok(pg.evaluate('__E.done'), '결과가 뜬 직후 0.7초 안의 Enter 는 무시')
    finish_wait(pg)
    r = read_result(pg)
    ok(r['done'] and r['resultShown'] and not r['playShown'], '30초가 지나면 결과')
    ok(r['mode'] == 'key', '자판은 글쇠 단위로 잰다')
    ok(r['rep']['secsText'] == '30', '시간으로 잰 판의 표시 시간은 30초', r['rep'])
    ok(r['unit'] == '타/분' and r['speed'] == str(r['rep']['speed']), '큰 숫자 = 타/분', (r['speed'], r['rep']['speed']))
    check_formula('한국어 결과', r)
    ok(r['rep']['wrong'] >= 5 and r['rep']['typed'] > r['rep']['ok'], '틀린 글쇠·고친 글쇠가 정확도에 남는다', r['rep'])
    ok(r['cmp'].startswith('첫 기록이에요'), '첫 판: "첫 기록이에요"', r['cmp'])
    keymap = pg.evaluate('(ks) => ks.map((k) => { const p = TJ.keyPlace(k); return p ? p.ch : null; })', r['missed'])
    ok(sorted(set(k for k in keymap if k and k not in ' \n')) == sorted(set(k for k in r['mapMiss'] if k != ' ')) or set(keymap) >= set(r['mapMiss']), '지도에 칠한 키 = 틀린 키', (keymap, r['mapMiss']))
    ok(len(r['mapMiss']) >= 1 and pg.evaluate('document.querySelectorAll("#kb .k.miss em").length') == len(r['mapMiss']), '틀린 키마다 횟수')
    ok(pg.evaluate('document.getElementById("map-cap").textContent').startswith('틀린 키'), '지도 설명 글')
    ok(pg.evaluate('document.querySelectorAll("#chart path.line").length') == 1, '초마다 속도 그래프')
    ok(pg.evaluate('document.querySelector("#kb .k").getBoundingClientRect().width') >= 30, '컴퓨터에서 지도 키 30px 이상')
    runs = ls(pg, 'todok.runs'); best = ls(pg, 'todok.best'); keysrec = ls(pg, 'todok.keys')
    ok(len(runs) == 1 and runs[0]['cond'] == 'test|ko|sentences|t30|-' and runs[0]['v'] == r['rep']['speed'], '기록 저장(조건·속도)', runs)
    ok(set(runs[0]) == {'cond', 'v', 'unit', 'acc', 'secs', 'at', 'tool', 'lang', 'kind', 'len'}, '기록에는 친 글이 들어가지 않는다', list(runs[0]))
    ok(best and best['test|ko|sentences|t30|-']['v'] == runs[0]['v'] and 'ko' in keysrec, '최고 기록·키별 횟수 저장')
    ok(pg.evaluate('document.querySelectorAll("#rec-list li").length') == 1 and pg.evaluate('!document.getElementById("rec-clear").hidden'), '내 기록 칸에 한 줄')
    ok(first_burst, '첫 기록에는 최고 기록 연출이 없다')
    shot(pg, 'e2e-ko-result')
    # 조금 뒤의 Enter = 다른 글로 다시
    pg.keyboard.press('Enter')
    pg.wait_for_timeout(120)
    ok(not pg.evaluate('__E.done') and pg.evaluate('__E.T.text') != first and pg.evaluate('document.activeElement.id') == 'trap', 'Enter = 다른 글로 다시, 초점은 치는 칸')
    ok(pg.evaluate('document.getElementById("daily").textContent') == '', '둘째 판부터는 "오늘의 글" 표시 없음')
    # 둘째 판: 더 빨리(간격 100ms) → 최고 기록 + 연출
    pg.evaluate('__sim.reset()')
    i = 0
    while not pg.evaluate('__E.done'):
        ks = ty.keys()
        if i >= len(ks):
            break
        ty.key(ks[i], 100); i += 1
    pg.wait_for_timeout(60)
    burst_on = not pg.evaluate('document.getElementById("burst").hidden')
    pg.clock.run_for(300); pg.wait_for_timeout(120)
    shot(pg, 'e2e-ko-best')
    finish_wait(pg)
    r2 = read_result(pg)
    ok(r2['rep']['speed'] > r['rep']['speed'] and r2['cmp'].startswith('최고 기록이에요. 앞 기록 ' + str(r['rep']['speed']) + '타'), '둘째 판: 앞 최고를 넘으면 "최고 기록이에요. 앞 기록 N타"', r2['cmp'])
    check_formula('한국어 둘째 결과', r2)
    ok(r2['rep']['accuracy'] == 100 and r2['accd'].startswith('누른 키') and pg.evaluate('document.getElementById("map-cap").textContent').startswith('틀린 키가 없어요'), '다 맞으면 100%, 틀린 키 없음')
    ok(pg.evaluate('document.getElementById("drill").hidden'), '틀린 키가 없으면 "틀린 키만 연습" 단추는 숨긴다')
    ok(burst_on, '최고 기록 연출(캔버스)이 나온다')
    ok(pg.evaluate('getComputedStyle(document.getElementById("burst")).pointerEvents') == 'none', '연출은 터치를 통과시킨다')
    ok(pg.evaluate('document.getElementById("burst").hidden'), '연출은 1.4초 뒤 스스로 지운다')
    # 같은 글 다시
    t2 = pg.evaluate('__E.T.text')
    pg.click('#same'); pg.wait_for_timeout(100)
    ok(pg.evaluate('__E.T.text') == t2 and not pg.evaluate('__E.done'), '"같은 글 다시" = 같은 글')
    # 한/영이 반대로: 안내가 뜨고, 그동안 친 키는 세지 않는다
    pg.evaluate('__sim.reset()')
    ks = ty.keys()
    qw = pg.evaluate('ks => ks.map((k) => TJ.hangul.K2Q[k]).join("")', ks[:2])   # 한글 대신 같은 자리의 영문자 두 개
    pg.keyboard.type(qw)
    pg.clock.run_for(200); pg.wait_for_timeout(120)
    hint = pg.evaluate('document.getElementById("hint").hidden ? null : document.getElementById("hint").textContent')
    ok(hint and '한/영' in hint and '한글' in hint, '한글 글에 영문자가 들어오면 한/영 안내', hint)
    ok(pg.evaluate('[__E.session.typedKeys, __E.session.skippedKeys]') == [0, 2], '안내가 뜬 동안 친 키는 세지 않는다', pg.evaluate('[__E.session.typedKeys, __E.session.skippedKeys]'))
    shot(pg, 'e2e-ko-hint')
    pg.keyboard.press('Backspace'); pg.keyboard.press('Backspace')
    ok(pg.evaluate('document.getElementById("hint").hidden'), '지우면 안내가 사라진다')
    # 겹 띄어쓰기 정리, 붙여 넣기 막기
    n0 = ty.run(n=pg.evaluate('TJ.hangul.keyStream(__E.T.words[0].ci.map((i) => __E.T.chars[i]).join("")).length') + 1)
    v1 = pg.evaluate('document.getElementById("trap").value')
    pg.keyboard.press('Space'); pg.keyboard.press('Space')
    ok(pg.evaluate('__E.session.value') == v1, '연달아 친 띄어쓰기는 버린다(단어를 건너뛰지 않는다)')
    pg.evaluate('(() => { const t = document.getElementById("trap"); const e = new ClipboardEvent("paste", { clipboardData: new DataTransfer(), bubbles: true, cancelable: true }); e.clipboardData.setData("text/plain", "붙여 넣은 글"); window.__pasteBlocked = !t.dispatchEvent(e); })()')
    ok(pg.evaluate('window.__pasteBlocked'), '붙여 넣기는 막는다')
    # 탭이 가려지면 시간 멈춤
    e1 = pg.evaluate('__E.timer.elapsed()')
    pg.evaluate('Object.defineProperty(document, "hidden", { value: true, configurable: true }); document.dispatchEvent(new Event("visibilitychange"))')
    pg.clock.run_for(5000); e2 = pg.evaluate('__E.timer.elapsed()')
    pg.evaluate('Object.defineProperty(document, "hidden", { value: false, configurable: true }); document.dispatchEvent(new Event("visibilitychange"))')
    pg.clock.run_for(1000); e3 = pg.evaluate('__E.timer.elapsed()')
    ok(e2 - e1 < 50 and 900 < e3 - e2 < 1100, '탭이 가려지면 시간이 멈추고 돌아오면 이어 간다', (e1, e2, e3))
    # Tab = 다른 글, Esc = 처음으로(초점 풀림)
    t3 = pg.evaluate('__E.T.text'); pg.keyboard.press('Tab'); pg.wait_for_timeout(80)
    ok(pg.evaluate('__E.T.text') != t3 and not pg.evaluate('__E.started'), 'Tab = 다른 글')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(80)
    ok(pg.evaluate('document.activeElement.id') != 'trap', 'Esc = 치는 칸에서 나온다(키보드로 다른 단추에 갈 수 있게)')
    pg.keyboard.press('a'); pg.wait_for_timeout(80)
    ok(pg.evaluate('document.activeElement.id') == 'trap', '다른 곳에 있다가 글자를 치면 치는 칸으로 돌아온다')
    # 옵션: 단어·속담·시간·분량·문장부호. 고른 것은 저장된다
    pg.click('#kind [data-v="words"]'); pg.wait_for_timeout(60)
    ok(' ' in pg.evaluate('__E.T.text') and not re.search(r'[.?!]', pg.evaluate('__E.T.text')), '단어: 문장부호 없는 단어들')
    pg.click('#more summary'); pg.check('#punct'); pg.wait_for_timeout(60)
    ok(re.search(r'[.?!,]', pg.evaluate('__E.T.text')), '문장부호 넣기')
    pg.check('#nums'); pg.wait_for_timeout(60)
    ok(re.search(r'\d', pg.evaluate('__E.T.text')), '숫자 넣기')
    pg.click('#mode [data-v="count"]'); pg.wait_for_timeout(60)
    ok(pg.evaluate('!document.getElementById("len-c").hasAttribute("data-off") && getComputedStyle(document.getElementById("len-t")).visibility === "hidden" && document.getElementById("l-len").textContent') == '분량', '분량으로 재기: 길이 단추로 바뀐다')
    ok(len(pg.evaluate('__E.T.text').split(' ')) == 25 and pg.evaluate('__E.limit()') == 0, '분량 짧게 = 단어 25개, 시간 제한 없음')
    pg.keyboard.press('Escape')
    pg.click('h1')
    pg.click('#kind [data-v="proverbs"]'); pg.wait_for_timeout(60)
    ok(pg.evaluate('document.getElementById("words-only").hidden'), '속담에서는 문장부호·숫자 옵션을 숨긴다')
    pg.click('#more summary'); pg.click('#mode [data-v="time"]'); pg.click('h1')
    pg.click('#len-t [data-v="t15"]'); pg.wait_for_timeout(60)
    ok(pg.evaluate('__E.limit()') == 15000 and pg.evaluate('document.getElementById("left").textContent') == '15', '시간 15초')
    st = ls(pg, 'todok.set')
    ok(st['ko/test']['kind'] == 'proverbs' and st['ko/test']['secs'] == 15 and st['ko/test']['mode'] == 'time', '고른 설정 저장', st)
    # 15초 판을 틀리게 쳐서 '틀린 키만 연습'
    pg.evaluate('__sim.reset()'); pg.evaluate('document.getElementById("trap").focus()')
    ty.run(wrong_at={3, 9, 15, 22, 30})
    finish_wait(pg)
    r3 = read_result(pg)
    ok(r3['done'] and r3['rep']['secsText'] == '15' and r3['cmp'].startswith('첫 기록'), '15초 속담 판은 다른 조건이라 다시 첫 기록', r3['cmp'])
    check_formula('15초 결과', r3)
    missed = [k for k in r3['missed'][:4] if k not in ' \n']
    pg.clock.run_for(900)
    pg.click('#drill'); pg.wait_for_timeout(100)
    words = pg.evaluate('__E.T.text').split(' ')
    ok(pg.evaluate('__E.limit()') == 0 and len(words) >= 8, '틀린 키만 연습: 시간 제한 없이 단어 묶음', words)
    hit = pg.evaluate('([m, ws]) => ws.filter((w) => TJ.hangul.keyStream(w).some((k) => m.includes(k))).length', [missed, words])
    ok(hit >= min(8, len(words)) * 0.5, '연습 글에 틀린 키가 든 단어가 모인다', (missed, words))
    ok(pg.evaluate('document.getElementById("daily").textContent') == '틀린 키만 모은 연습', '연습 표시')
    pg.evaluate('__sim.reset()'); ty.run(); pg.clock.run_for(900); pg.wait_for_timeout(200)
    r4 = read_result(pg)
    ok(r4['done'] and r4['cmp'] == '틀린 키 연습은 기록에 넣지 않아요.' and len(ls(pg, 'todok.runs')) == 3, '틀린 키 연습은 최근·최고 기록에 넣지 않는다', (r4['cmp'], len(ls(pg, 'todok.runs'))))
    check_formula('연습 결과(시간 제한 없음)', r4)
    ok('.' in r4['rep']['secsText'] or r4['rep']['tenths'] % 10 == 0, '분량 판의 시간은 0.1초까지')
    # 기록 지우기: 두 번 눌러야 지워지고, 설정은 남는다
    pg.click('#rec-clear')
    ok(len(ls(pg, 'todok.runs')) == 3 and pg.evaluate('document.getElementById("rec-clear").textContent') == '한 번 더 누르면 지워요', '기록 지우기는 한 번 더 물어본다')
    pg.click('#rec-clear'); pg.wait_for_timeout(80)
    ok(ls(pg, 'todok.runs') is None and ls(pg, 'todok.best') is None and ls(pg, 'todok.keys') is None and ls(pg, 'todok.set') is not None, '기록 셋만 지우고 설정은 남는다')
    ok(pg.evaluate('document.getElementById("rec-list").hidden && !document.getElementById("rec-empty").hidden && document.getElementById("rec-clear").hidden'), '지운 뒤 빈 상태')
    allkeys = pg.evaluate('Object.keys(localStorage)')
    ok(set(allkeys) <= {'todok.runs', 'todok.best', 'todok.keys', 'todok.set', 'todok.lang'}, '방침에 적은 키만 쓴다', allkeys)
    ok(not pg._errs, '한국어 속도 측정 콘솔 오류 0', pg._errs[:3])
    c.close()
    # 글이 모자라면 잇는다(아주 빠른 사람): 15초 동안 18ms 간격
    c = env.ctx()
    pg, ty = env.tool(c, '/ko/')
    pg.click('#len-t [data-v="t15"]'); pg.wait_for_timeout(60); pg.evaluate('__sim.reset()')
    len0 = pg.evaluate('__E.T.chars.length')
    i = 0
    while not pg.evaluate('__E.done') and i < 4000:
        ks = ty.keys()
        if i >= len(ks):
            break
        ty.key(ks[i], 18); i += 1
        if i in (120, 260, 400):   # 줄이 넘어가도 지금 칠 자리는 늘 보이는 범위 안에 있다
            vis = pg.evaluate('''() => { const v = document.querySelector('.view').getBoundingClientRect(), c = document.querySelector('#txt .cur').getBoundingClientRect(); return c.top >= v.top - 1 && c.bottom <= v.bottom + 6; }''')
            ok(vis, f'치는 중({i}번째 키): 지금 칠 자리가 보이는 줄 안에 있다')
    finish_wait(pg)
    r = read_result(pg)
    ok(r['done'] and r['rep']['secsText'] == '15' and pg.evaluate('__E.T.chars.length') > len0 and r['rep']['accuracy'] == 100 and r['rep']['wrong'] == 0, '아주 빨리 쳐도 글이 끊기지 않고 이어진다(이어 붙인 뒤에도 틀림 표시 없음)', (len0, pg.evaluate('__E.T.chars.length'), r['rep']))
    check_formula('15초 빠른 결과', r)
    c.close()


# ---------- 4. 영어 속도 측정·영타 ----------
def en_test(env):
    print('4. 영어 속도 측정·영타')
    c = env.ctx(lang='en')
    pg, ty = env.tool(c, '/')
    ok(pg.evaluate('document.getElementById("daily").textContent') == 'Text for Oct 10', '영어: 오늘의 글 표시', pg.evaluate('document.getElementById("daily").textContent'))
    ok(first_line_visible(pg), '영어 시작 전: 글의 첫 줄이 보인다')
    ty.run(wrong_at={10, 44}, fix_at={25})
    finish_wait(pg)
    r = read_result(pg)
    ok(r['done'] and r['unit'] == 'WPM' and r['speed'] == str(r['rep']['wpm']), '영어 큰 숫자 = WPM', (r['speed'], r['rep']))
    check_formula('영어 결과', r, ko=False)
    ok(r['cmp'].startswith('Your first result'), '영어 첫 기록 문구', r['cmp'])
    ok('51.56 WPM' in pg.evaluate('document.querySelector(".r-ctx").textContent') and pg.evaluate('document.querySelector(".r-ctx a").href').startswith('https://userinterfaces.aalto.fi/136Mkeystrokes'), '연구 값 한 줄과 출처 링크')
    ok(not visible_hangul_outside_ko(pg), '영어 결과 화면에 한글 없음', visible_hangul_outside_ko(pg)[:5])
    runs = ls(pg, 'todok.runs')
    ok(runs[0]['cond'] == 'test|en|words|t30|-' and runs[0]['unit'] == 'en' and runs[0]['v'] == r['rep']['wpm'], '영어 기록은 WPM 으로', runs[0])
    shot(pg, 'e2e-en-result')
    # 결과 그림 저장: PNG 파일이 내려온다(1200×630)
    with pg.expect_download(timeout=8000) as dl:
        pg.click('#share')
    f = dl.value
    ok(re.fullmatch(r'todok-\d+wpm\.png', f.suggested_filename or ''), '결과 그림 저장: 파일 이름', f.suggested_filename)
    data = Path(f.path()).read_bytes()
    ok(data[:8] == b'\x89PNG\r\n\x1a\n' and int.from_bytes(data[16:20], 'big') == 1200 and int.from_bytes(data[20:24], 'big') == 630, '결과 그림은 1200×630 PNG')
    if OUT:
        (OUT / 'e2e-share-image-en.png').write_bytes(data)
    # 한글 자판으로 치면: 영어로 바꾸라는 안내, 세지 않는다
    pg.clock.run_for(900); pg.click('#again'); pg.wait_for_timeout(100); pg.evaluate('__sim.reset()')
    ok(not pg.evaluate('__E.done') and pg.evaluate('document.activeElement.id') == 'trap', '영어: 다시 하기 단추 → 새 판, 초점은 치는 칸')
    ks = ty.keys()
    ko1 = pg.evaluate('k => TJ.hangul.Q2K[k]', ks[0])
    if ko1:
        pg.clock.run_for(100)
        cdp = c.new_cdp_session(pg)
        cdp.send('Input.imeSetComposition', {'text': ko1, 'selectionStart': 1, 'selectionEnd': 1})
        pg.clock.run_for(200); pg.wait_for_timeout(100)
        hint = pg.evaluate('document.getElementById("hint").hidden ? null : document.getElementById("hint").textContent')
        ok(hint and 'English' in hint, '영어 글에 한글이 들어오면 영어로 바꾸라는 안내', hint)
        ok(pg.evaluate('__E.session.typedKeys') == 0, '그동안 친 키는 세지 않는다')
        ok(not [x for x in visible_hangul_outside_ko(pg)], '안내가 뜬 화면에도 lang 밖 한글 없음', visible_hangul_outside_ko(pg)[:5])
        cdp.send('Input.imeSetComposition', {'text': '', 'selectionStart': 0, 'selectionEnd': 0})
    # Caps Lock
    pg.keyboard.press('Tab'); pg.wait_for_timeout(80)
    ks = ty.keys()
    pg.keyboard.type((ks[0] + ks[1]).upper()); pg.clock.run_for(100); pg.wait_for_timeout(100)
    if ks[0].isalpha() and ks[1].isalpha():
        ok('Caps Lock' in (pg.evaluate('document.getElementById("hint").hidden ? "" : document.getElementById("hint").textContent')), 'Caps Lock 안내')
        ok(pg.evaluate('__E.session.typedKeys') == 0, 'Caps Lock 구간도 세지 않는다')
    # 문장, 분량
    pg.keyboard.press('Escape')
    pg.click('#kind [data-v="sentences"]'); pg.wait_for_timeout(80)
    ok(re.search(r'[A-Z]', pg.evaluate('__E.T.text')) and '.' in pg.evaluate('__E.T.text'), 'Sentences: 대문자·마침표가 있는 문장')
    ok(not visible_hangul_outside_ko(pg), '영어 화면(설정 바꾼 뒤)에 한글 없음', visible_hangul_outside_ko(pg)[:5])
    ok(not pg._errs, '영어 속도 측정 콘솔 오류 0', pg._errs[:3])
    c.close()
    # 영타 연습(한국어 화면, 영어 글): 타수와 WPM 같이
    c = env.ctx()
    pg, ty = env.tool(c, '/ko/english/')
    ty.run(n=30)
    live = pg.evaluate('[document.getElementById("speed").textContent, document.getElementById("wpm").textContent]')
    ok(int(live[0]) > 0 and int(live[1]) > 0 and int(live[0]) > int(live[1]), '치는 중: 타/분과 WPM 이 같이 보인다', live)
    ty2 = ty
    i = 30
    while not pg.evaluate('__E.done'):
        ks = ty2.keys()
        if i >= len(ks):
            break
        ty2.key(wrong(ks[i]) if i in (40, 77) else ks[i]); i += 1
    finish_wait(pg)
    r = read_result(pg)
    ok(r['done'] and r['unit'] == '타/분' and r['speed'] == str(r['rep']['speed']), '영타: 큰 숫자는 타/분')
    check_formula('영타 결과(타수)', r)
    f2 = nums(r['formula2'])
    ok(len(f2) == 5 and int(f2[0] / 5 / f2[2] * 60 + 0.5) == int(f2[4]) == r['rep']['wpm'] and pg.evaluate('document.getElementById("r-wpm").textContent') == f'{r["rep"]["wpm"]} WPM', '영타: WPM 식도 다시 계산하면 같은 수', r['formula2'])
    ok('세계 평균은 아니' in pg.evaluate('document.querySelector(".r-ctx").textContent'), '영타: 연구 값의 한계를 밝힌다')
    ok(ls(pg, 'todok.runs')[0]['cond'] == 'english|en|words|t30|-', '영타 기록 조건')
    shot(pg, 'e2e-ko-english-result')
    ok(not pg._errs, '영타 콘솔 오류 0', pg._errs[:3])
    c.close()


# ---------- 5. 자리 연습·문장 연습 ----------
def practice(env):
    print('5. 자리 연습·문장 연습')
    for path, lang in (('/ko/practice/', 'ko'), ('/practice/', 'en')):
        c = env.ctx(lang=lang)
        pg, ty = env.tool(c, path)
        ok(first_line_visible(pg), f'{path} 시작 전: 글의 첫 줄이 보인다')
        ks = ty.keys()
        allowed = pg.evaluate('l => TJ.lessons.list[l][0].allowed', lang)
        ok(all(k in allowed for k in ks), f'{path} 1단계 글은 배운 키만', [k for k in ks if k not in allowed][:5])
        nx = pg.evaluate('''() => { const k = document.querySelector('#kb .k.next'); return k ? k.getAttribute('data-k') : null; }''')
        want = pg.evaluate('k => TJ.keyPlace(k).ch', ks[0])
        ok(nx == want, f'{path} 화면 자판에 다음 키가 켜진다', (nx, want))
        say = pg.evaluate('document.getElementById("kb-say").textContent')
        ok((ks[0] in say) and (('손가락' in say) if lang == 'ko' else ('finger' in say)), f'{path} 다음 키와 손가락 안내', say)
        ok(pg.evaluate('document.querySelectorAll("#kb .k.new").length') == len(pg.evaluate('l => TJ.lessons.list[l][0].keys', lang)), f'{path} 이번 단계의 새 키에 점')
        ty.key(ks[0])
        nx2 = pg.evaluate('''() => document.querySelector('#kb .k.next').getAttribute('data-k')''')
        ok(nx2 == pg.evaluate('k => TJ.keyPlace(k).ch', ks[1]), f'{path} 치면 다음 키로 옮겨 간다')
        i = 1
        while not pg.evaluate('__E.done'):
            ks = ty.keys()
            if i >= len(ks):
                break
            ty.key(wrong(ks[i]) if i == 5 else ks[i]); i += 1
        pg.clock.run_for(900); pg.wait_for_timeout(200)
        r = read_result(pg)
        ok(r['done'] and r['resultShown'], f'{path} 다 치면 결과')
        check_formula(f'{path} 결과', r, ko=(lang == 'ko'))
        strip = pg.evaluate('[document.getElementById("speed").textContent, document.getElementById("acc").textContent, document.getElementById("left").textContent]')
        ok(strip == [str(r['v']), str(r['rep']['accuracy']), r['rep']['secsText']], f'{path} 숫자 띠 = 결과의 식과 같은 값', (strip, r['rep']))
        passline = pg.evaluate('document.getElementById("r-pass").textContent')
        ok((('1단계 통과' in passline) if lang == 'ko' else ('Step 1 passed' in passline)) and r['rep']['accuracy'] >= 95, f'{path} 정확도 95% 이상이면 통과', (passline, r['rep']['accuracy']))
        btn = pg.evaluate('document.getElementById("again").textContent')
        ok(('윗줄' in btn) if lang == 'ko' else ('Top row' in btn), f'{path} 주 단추가 다음 단계로 바뀐다', btn)
        ok(len(r['mapMiss']) == 1 and pg.evaluate('!document.getElementById("kb-legend").hidden'), f'{path} 자판에 틀린 키 표시', r['mapMiss'])
        if lang == 'en':
            ok(not visible_hangul_outside_ko(pg), '/practice/ 결과 화면에 한글 없음', visible_hangul_outside_ko(pg)[:5])
        shot(pg, 'e2e-' + lang + '-practice-result')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(120)
        ok(pg.evaluate('__E.lesson') == 1 and pg.evaluate('document.querySelector("#steps [aria-pressed=true]").dataset.v') == '1' and pg.evaluate('document.querySelector("#steps button").classList.contains("done")'), f'{path} Enter = 다음 단계, 통과한 단계 표시')
        st = ls(pg, 'todok.set')[lang + '/practice']
        ok(st['lesson'] == 1 and st['passed'] == [0], f'{path} 단계 저장', st)
        ks = ty.keys()
        allowed2 = pg.evaluate('l => TJ.lessons.list[l][1].allowed', lang)
        ok(all(k in allowed2 for k in ks), f'{path} 2단계 글은 1·2단계 키만')
        # Shift 단계: Shift 키도 같이 켜진다
        pg.click('#steps [data-v="3"]'); pg.wait_for_timeout(100)
        ks = ty.keys()
        idx = next((j for j, k in enumerate(ks) if pg.evaluate('k => TJ.hangul.needsShift(k)', k)), None)
        pg.evaluate('__sim.reset()')
        if idx is not None:
            for j in range(idx):
                ty.key(ks[j])
            ok(pg.evaluate('document.querySelectorAll("#kb .k.with").length') == 1 and 'Shift' in pg.evaluate('document.getElementById("kb-say").textContent'), f'{path} Shift 가 필요한 키는 Shift 도 켜진다')
        pg.click('#kb-toggle'); pg.wait_for_timeout(60)
        ok(pg.evaluate('getComputedStyle(document.getElementById("kb")).display') == 'none' and pg.evaluate('document.activeElement.id') == 'trap', f'{path} 자판 가리기')
        pg.click('#steps [data-v="4"]'); pg.wait_for_timeout(100)
        ok(len(pg.evaluate('__E.T.text')) >= 80 and '.' in pg.evaluate('__E.T.text'), f'{path} 마지막 단계는 문장', pg.evaluate('__E.T.text'))
        ok(not pg._errs, f'{path} 콘솔 오류 0', pg._errs[:3])
        c.close()
    # 문장 연습
    c = env.ctx()
    pg, ty = env.tool(c, '/ko/sentences/')
    text = pg.evaluate('__E.T.text')
    ok(text.count('\n') == 4, '문장 연습: 다섯 문장', text)
    first_line = text.split('\n')[0]
    ok(pg.evaluate('document.getElementById("txt").textContent').strip() == first_line or first_line.startswith(pg.evaluate('document.getElementById("txt").textContent').strip()), '보고 치는 글 = 첫 문장(또는 그 첫 줄)')
    ty.run(n=14, wrong_at={6})
    mine = pg.evaluate('document.getElementById("mine-t").textContent')
    ok(len(mine) >= 3 and pg.evaluate('document.querySelectorAll("#txt .bad").length') == 1, '내가 친 글이 아래 줄에 보이고, 틀린 글자는 위 줄에서 주홍', mine)
    shot(pg, 'e2e-ko-sentences-typing')
    # 끝까지: 문장 끝은 번갈아 띄어쓰기·Enter 로
    i = 14; nl = 0
    while not pg.evaluate('__E.done'):
        ks = ty.keys()
        if i >= len(ks):
            break
        k = ks[i]
        if k == '\n':
            nl += 1
            ty.key(' ' if nl % 2 else '\n')
        else:
            ty.key(k)
        i += 1
    pg.clock.run_for(900); pg.wait_for_timeout(200)
    r = read_result(pg)
    ok(r['done'] and r['rep']['wrong'] == 1 and r['rep']['accuracy'] is not None, '문장 연습: 줄바꿈 자리의 띄어쓰기·Enter 둘 다 맞다', r['rep'])
    check_formula('문장 연습 결과', r)
    ok(pg.evaluate('document.getElementById("left").textContent') == '5/5' and pg.evaluate('document.getElementById("g-label").textContent') == '이번 기록', '계기판: 5/5, 이번 기록')
    ok(pg.evaluate('[document.getElementById("speed").textContent, document.getElementById("acc").textContent]') == [str(r['rep']['speed']), str(r['rep']['accuracy'])], '계기판 숫자 = 결과의 식과 같은 값')
    ok(pg.evaluate('document.getElementById("r-formula").getBoundingClientRect().height') < 30, '문장 연습 결과의 식이 한 줄에 들어간다')
    ok(ls(pg, 'todok.runs')[0]['cond'] == 'sentences|ko|all|c5|-', '문장 연습 기록 조건')
    over = pg.evaluate('(() => { const s = document.querySelector(".desk").getBoundingClientRect(); return [...document.querySelectorAll("#result *")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > s.right + 1 || b.bottom > s.bottom + 1); }).map((e) => e.id || e.className).slice(0, 4); })()')
    ok(not over, '문장 연습 결과가 칸 안에 들어간다', over)
    shot(pg, 'e2e-ko-sentences-result')
    pg.clock.run_for(900)
    pg.click('#topic [data-v="proverbs"]'); pg.wait_for_timeout(100)
    prov = pg.evaluate('TJ_TEXT.ko.proverbs')
    ok(all(line in prov for line in pg.evaluate('__E.T.text').split('\n')), '주제 = 속담')
    pg.select_option('#count', '10'); pg.wait_for_timeout(100)
    ok(pg.evaluate('__E.T.text').count('\n') == 9 and pg.evaluate('document.getElementById("left").textContent') == '1/10', '한 번에 10문장')
    ok(not pg._errs, '문장 연습 콘솔 오류 0', pg._errs[:3])
    c.close()


# ---------- 6. 휴대폰(터치 자판) ----------
def mobile(env):
    print('6. 휴대폰')
    for w, h in ((390, 844), (375, 667)):
        c = env.ctx(w, h, True, dpr=2)
        pg = env.page(c, '/ko/', clock=False)
        r = pg.evaluate('''() => { const t = document.getElementById('txt').getBoundingClientRect(), m = document.querySelector('.meter').getBoundingClientRect(), n = document.querySelector('.nav');
          return { textTop: t.top, meterTop: m.top, vh: innerHeight, navFits: n.scrollWidth <= n.clientWidth + 1, navItems: [...n.querySelectorAll('a')].filter((a) => { const b = a.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth + 0.5 && b.width > 20; }).length }; }''')
        ok(r['textTop'] < r['vh'] - 80 and first_line_visible(pg), f'{w}×{h} 첫 화면에 치는 글(첫 줄)이 보인다', r)
        ok(r['meterTop'] < r['textTop'], f'{w}×{h} 숫자가 글 위에 온다(자판이 아래를 가린다)', r)
        ok(r['navFits'] and r['navItems'] == 5, f'{w}×{h} 메뉴 다섯 개가 잘리지 않고 다 보인다', r)
        c.close()
    c = env.ctx(390, 844, True, dpr=2)
    pg, ty = env.tool(c, '/ko/', mobile=True)
    ok(pg.evaluate('document.documentElement.classList.contains("m-tall")'), '휴대폰: 글을 누르면 치는 화면으로')
    ok(pg.evaluate('getComputedStyle(document.querySelector(".top")).display') == 'none' and pg.evaluate('document.querySelector(".stage").getBoundingClientRect().top') < 20, '치는 동안 머리(메뉴)가 접힌다')
    ok(pg.evaluate('document.getElementById("txt").getBoundingClientRect().top') < 160, '글이 화면 위쪽에 온다(자판에 안 가린다)', pg.evaluate('document.getElementById("txt").getBoundingClientRect().top'))
    ok(pg.evaluate('getComputedStyle(document.getElementById("quit")).display') != 'none', '그만 단추가 보인다')
    pg.evaluate('(' + CLS_JS + ')()')
    # 천지인 중간 모양처럼 다음 글자가 올 때까지 판정을 미룬다(글자 단위)
    ty.run(n=24, wrong_at={13})
    ok(pg.evaluate('__E.session.mode') == 'char', '터치 자판은 글자 단위로 잰다')
    shot(pg, 'e2e-ko-mobile-typing')
    ty2 = 24
    i = 24
    while not pg.evaluate('__E.done'):
        ks = ty.keys()
        if i >= len(ks):
            break
        ty.key(ks[i]); i += 1
    finish_wait(pg)
    r = read_result(pg)
    ok(r['done'] and r['resultShown'], '휴대폰: 결과')
    check_formula('휴대폰 결과', r)
    ok('터치 자판이라 글자 단위로 쟀어요' in pg.evaluate('document.getElementById("map-cap").textContent'), '터치 자판 안내 문구')
    v = pg.evaluate('window.__cls')
    ok(v <= 0.02, f'휴대폰: 치는 동안과 결과로 바뀔 때 화면 밀림 {v:.4f}', pg.evaluate('window.__shifts.slice(0, 4)'))
    ok(pg.evaluate('document.querySelector(".records").getBoundingClientRect().top') >= 844 - 1, '결과가 길어져도 아래 내용은 화면 밖에서만 밀린다')
    kw = pg.evaluate('document.getElementById("kb").getBoundingClientRect().width')
    ok(kw >= 390 - 32 - 40, '휴대폰: 틀린 키 지도가 화면 폭을 다 쓴다', kw)
    ok(pg.evaluate('document.querySelector("#kb .k").getBoundingClientRect().height') >= 22, '휴대폰: 지도 키 높이 22px 이상')
    ok(pg.evaluate('document.documentElement.scrollWidth - innerWidth') <= 0, '휴대폰 결과: 가로 스크롤 0')
    shot(pg, 'e2e-ko-mobile-result', full=False)
    pg.tap('#quit2'); pg.wait_for_timeout(120)
    ok(not pg.evaluate('document.documentElement.classList.contains("m-tall")') and pg.evaluate('getComputedStyle(document.querySelector(".top")).display') != 'none', '"처음 화면으로" = 머리가 돌아온다')
    ok(not pg._errs, '휴대폰 콘솔 오류 0', pg._errs[:3])
    c.close()
    # 자리 연습·문장 연습 휴대폰
    for path in ('/ko/practice/', '/ko/sentences/', '/practice/'):
        c = env.ctx(390, 844, True, lang='en' if path == '/practice/' else 'ko', dpr=2)
        pg, ty = env.tool(c, path, mobile=True)
        ok(pg.evaluate('document.documentElement.classList.contains("m-tall")') and pg.evaluate('document.getElementById("txt").getBoundingClientRect().top') < 260, f'{path} 휴대폰: 치는 화면', pg.evaluate('document.getElementById("txt").getBoundingClientRect().top'))
        over = pg.evaluate('''() => { const ms = [...document.querySelectorAll('.strip > *, .meter > *, .gauge > *')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getBoundingClientRect()); let n = 0; for (let a = 0; a < ms.length; a++) for (let b = a + 1; b < ms.length; b++) { const A = ms[a], B = ms[b]; if (A.left < B.right - 1 && B.left < A.right - 1 && A.top < B.bottom - 1 && B.top < A.bottom - 1) n++; } return n; }''')
        ok(over == 0, f'{path} 휴대폰: 숫자·단추가 서로 겹치지 않는다', over)
        i = 0; missed_once = False
        while not pg.evaluate('__E.done'):
            ks = ty.keys()
            if i >= len(ks):
                break
            k = ks[i]
            bad_now = (not missed_once) and i >= 4 and wrong(k) != k and k not in ' \n'
            missed_once = missed_once or bad_now
            ty.key(' ' if k == '\n' else (wrong(k) if bad_now else k)); i += 1
        pg.clock.run_for(900); pg.wait_for_timeout(200)
        r = read_result(pg)
        ok(r['done'] and r['resultShown'] and pg.evaluate('document.documentElement.scrollWidth - innerWidth') <= 0, f'{path} 휴대폰 결과·가로 스크롤 0')
        ok(pg.evaluate('getComputedStyle(document.getElementById("kb")).display') != 'none' and len(r['mapMiss']) >= 1, f'{path} 휴대폰: 끝나면 틀린 키 지도가 보인다')
        shot(pg, 'e2e-mobile-' + path.strip('/').replace('/', '-') + '-result')
        ok(not pg._errs, f'{path} 휴대폰 콘솔 오류 0', pg._errs[:3])
        c.close()


# ---------- 7. 광고 자리·연출·언어 띠 ----------
def ads_and_motion(env):
    print('7. 광고 자리·연출·언어 띠')
    tool_paths = ['/', '/practice/', '/ko/', '/ko/practice/', '/ko/sentences/', '/ko/english/']
    for w, h, mobile in ((1366, 768, False), (390, 844, True)):
        c = env.ctx(w, h, mobile)
        for path in tool_paths + [p for p in ('/ko/guide/tasu-gyesan/', '/guide/how-wpm-is-calculated/') if (ROOT / p.strip('/') / 'index.html').exists()]:
            pg = env.page(c, path + '?adpreview', clock=False)
            r = pg.evaluate('''() => { const ads = [...document.querySelectorAll('.ad-wrap')].map((a) => { const b = a.getBoundingClientRect(), lab = a.querySelector('.ad-label'), slot = a.querySelector('[data-ad]').getBoundingClientRect();
                let near = 1e9, who = '';
                document.querySelectorAll('button,a.btn,input,select,textarea,summary').forEach((e) => { const q = e.getBoundingClientRect(); if (!q.width || !q.height || e.closest('.ad-wrap')) return;
                  const dy = q.bottom < slot.top ? slot.top - q.bottom : q.top > slot.bottom ? q.top - slot.bottom : 0, dx = q.right < slot.left ? slot.left - q.right : q.left > slot.right ? q.left - slot.right : 0, d = Math.hypot(dx, dy); if (d < near) { near = d; who = e.id || e.className || e.tagName; } });
                return { top: b.top + scrollY, w: slot.width, h: slot.height, label: lab.textContent, fs: parseFloat(getComputedStyle(lab).fontSize), near, who, text: a.querySelector('[data-ad]').textContent, bg: getComputedStyle(a.querySelector('[data-ad]')).backgroundImage.slice(0, 25) }; });
              const st = document.querySelector('.stage'), sb = st ? st.getBoundingClientRect().bottom + scrollY : 0, col = document.querySelector('article.prose > p.lead, .sec');
              return { ads, stageBottom: sb, vh: innerHeight, colW: col ? Math.min(780, col.getBoundingClientRect().width) : 0, preview: document.documentElement.classList.contains('ad-preview') }; }''')
            ko = path.startswith('/ko/')
            ok(r['preview'] and len(r['ads']) == 2, f'{path} {w}px 광고 미리보기 자리 둘', len(r['ads']))
            for a in r['ads']:
                ok(a['label'] == ('광고' if ko else 'Ad') and a['fs'] >= 11, f'{path} {w}px 광고 표시 글자("광고"/"Ad", 11px 이상)', (a['label'], a['fs']))
                ok(a['near'] >= 40, f'{path} {w}px 광고 자리가 누르는 것에서 40px 이상', (round(a['near']), a['who']))
                ok('repeating-linear' in a['bg'] and a['h'] >= 250, f'{path} {w}px 미리보기는 빗금 상자, 높이를 미리 잡는다', (a['bg'], a['h']))
                ok(abs(a['w'] - r['colW']) < 2 or r['colW'] == 0, f'{path} {w}px 광고 자리 폭 = 글 기둥 폭', (a['w'], r['colW']))
                ok(a['text'] in ('광고 자리', 'Ad slot'), f'{path} 미리보기 글자에 개발용 이름 없음', a['text'])
                if r['stageBottom']:
                    ok(a['top'] - r['stageBottom'] >= 150, f'{path} {w}px 광고 자리가 치는 칸에서 150px 이상', round(a['top'] - r['stageBottom']))
                    ok(a['top'] >= r['vh'], f'{path} {w}px 치는 중 보이는 범위(첫 화면) 밖', (round(a['top']), r['vh']))
            pg.close()
        c.close()
    # 소개·방침·목록·404 에는 광고 자리가 없다
    c = env.ctx()
    for path in ('/about/', '/ko/privacy/', '/guide/', '/nope/'):
        pg = env.page(c, path + '?adpreview', clock=False)
        ok(pg.evaluate('document.querySelectorAll("[data-ad]").length') == 0 and not pg.evaluate('!!window.TJ_ADS'), f'{path} 광고 없는 페이지')
        pg.close()
    # 연출 1: 루멘랩 키 줄. 화면에 들어올 때 한 번, 다시 들어와도 다시 안 나온다
    pg = env.page(c, '/ko/', clock=False)
    ok(not pg.evaluate('document.getElementById("lumen").classList.contains("in")'), '루멘랩: 화면 밖에서는 시작하지 않는다')
    pg.evaluate('document.getElementById("lumen").scrollIntoView({ block: "center" })'); pg.wait_for_timeout(250)
    a = pg.evaluate('''() => { const l = document.getElementById('lumen'); return { on: l.classList.contains('in'), anims: l.getAnimations({ subtree: true }).length, href: l.href, capsHidden: l.querySelector('.caps').getAttribute('aria-hidden') }; }''')
    ok(a['on'] and a['anims'] >= 5 and a['href'] == 'https://lumenlab.page/' and a['capsHidden'] == 'true', '루멘랩: 들어오면 키 다섯 개가 차례로 눌린다', a)
    shot(pg, 'e2e-lumen')
    pg.wait_for_timeout(1100)
    ok(pg.evaluate('document.getElementById("lumen").getAnimations({ subtree: true }).length') == 0, '루멘랩: 0.7초 뒤에는 그리기가 멈춘다')
    ok(pg.evaluate('getComputedStyle(document.querySelector("#lumen .cap")).color') == pg.evaluate('(() => { const d = document.createElement("i"); d.style.color = "var(--main)"; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; })()'), '루멘랩: 눌린 글자는 가지색으로 남는다')
    pg.evaluate('scrollTo(0, 0)'); pg.wait_for_timeout(150)
    pg.evaluate('document.getElementById("lumen").scrollIntoView({ block: "center" })'); pg.wait_for_timeout(200)
    ok(pg.evaluate('document.getElementById("lumen").getAnimations({ subtree: true }).length') == 0, '루멘랩: 다시 들어와도 다시 안 나온다')
    near_ad = pg.evaluate('(() => { const l = document.getElementById("lumen").getBoundingClientRect(); let d = 1e9; document.querySelectorAll(".ad-wrap").forEach((a) => { const b = a.getBoundingClientRect(); if (b.height) d = Math.min(d, Math.abs(l.top - b.bottom)); }); return d; })()')
    ok(near_ad >= 60, '루멘랩 칸은 광고 자리 옆이 아니다', near_ad)
    pg.close(); c.close()
    c = env.ctx(lang='en')
    pg = env.page(c, '/', clock=False)
    ok(pg.evaluate('document.getElementById("lumen").href') == 'https://lumenlab.page/en/', '영어판 루멘랩 링크는 /en/')
    pg.close(); c.close()
    c = env.ctx(reduced=True)
    pg = env.page(c, '/ko/', clock=False)
    pg.evaluate('document.getElementById("lumen").scrollIntoView({ block: "center" })'); pg.wait_for_timeout(250)
    ok(pg.evaluate('document.getElementById("lumen").classList.contains("in") && document.getElementById("lumen").getAnimations({ subtree: true }).length === 0'), '루멘랩: 동작 줄이기면 움직이지 않고 색만 바뀐다')
    pg.close()
    # 연출 2·3: 동작 줄이기면 지도는 처음부터 칠해져 있고, 최고 기록은 글로만
    pg, ty = env.tool(c, '/ko/')
    ok(pg.evaluate('getComputedStyle(document.querySelector("#txt .cur"), "::after").animationName') == 'none', '동작 줄이기: 지금 칠 자리 밑줄은 깜빡이지 않고 고정')
    ty.run(wrong_at={5, 12})
    finish_wait(pg)
    ok(pg.evaluate('document.querySelectorAll("#kb .k.miss").length') >= 1 and pg.evaluate('document.querySelectorAll("#kb .k.pop").length') == 0, '동작 줄이기: 틀린 키는 움직임 없이 칠해져 있다')
    pg.clock.run_for(900); pg.keyboard.press('Enter'); pg.wait_for_timeout(100); pg.evaluate('__sim.reset()')
    i = 0
    while not pg.evaluate('__E.done'):
        ks = ty.keys()
        if i >= len(ks):
            break
        ty.key(ks[i], 90); i += 1
    finish_wait(pg)
    ok('최고 기록이에요' in pg.evaluate('document.getElementById("r-cmp").textContent') and pg.evaluate('document.getElementById("burst").hidden'), '동작 줄이기: 최고 기록은 글로만(조각 없음)')
    c.close()
    # 연출 2: 결과가 뜬 순간 틀린 키가 차례로 눌린다. 나오는 중에도 단추가 눌린다
    c = env.ctx()
    pg, ty = env.tool(c, '/ko/')
    ok(pg.evaluate('getComputedStyle(document.querySelector("#txt .cur"), "::after").animationName') == 'blink' and pg.evaluate('getComputedStyle(document.querySelector("#txt .cur"), "::after").animationIterationCount') == '5', '지금 칠 자리 밑줄은 다섯 번만 깜빡인다')
    ty.run(wrong_at={5, 12, 20, 33, 41, 55, 62, 70})
    finish_wait(pg)
    pop = pg.evaluate('[...document.querySelectorAll("#kb .k.pop")].map((k) => k.style.getPropertyValue("--d"))')
    ok(len(pop) >= 2 and max(int(x.replace('ms', '')) for x in pop) <= 300, '틀린 키 지도: 차례로(많아도 0.3초 안에 시작) 눌린다', pop)
    pg.clock.run_for(900)
    pg.click('#again'); pg.wait_for_timeout(100)
    ok(not pg.evaluate('__E.done') and pg.evaluate('document.querySelectorAll("#kb .k.pop").length') in (0, len(pop)), '연출 중·뒤에도 다시 하기가 바로 된다')
    c.close()
    # 다른 언어판 안내 띠: 브라우저 언어가 다를 때만, 겹쳐 띄우고, 닫으면 다시 안 뜬다
    c = env.ctx(lang='en')
    pg = env.page(c, '/ko/', clock=False)
    bar = pg.evaluate('''() => { const b = document.querySelector('.langbar'); return b && { pos: getComputedStyle(b).position, lang: b.lang, href: b.querySelector('a').getAttribute('href'), text: b.textContent }; }''')
    ok(bar and bar['pos'] == 'absolute' and bar['lang'] == 'en' and bar['href'] == '/' and 'English version' in bar['text'], '영어 브라우저로 한국어판: 영어판 안내 띠(겹쳐 띄움)', bar)
    ok(pg.evaluate('location.pathname') == '/ko/', '자동으로 넘기지 않는다')
    shot(pg, 'e2e-langbar')
    pg.click('.langbar button'); pg.wait_for_timeout(80)
    ok(pg.evaluate('!document.querySelector(".langbar")') and pg.evaluate('localStorage.getItem("todok.lang")') == '1', '닫으면 todok.lang 에 적는다')
    pg.reload(); pg.wait_for_timeout(300)
    ok(pg.evaluate('!document.querySelector(".langbar")'), '닫은 뒤에는 다시 안 뜬다')
    pg.close(); c.close()
    c = env.ctx(lang='ko')
    pg = env.page(c, '/', clock=False)
    bar = pg.evaluate('''() => { const b = document.querySelector('.langbar'); return b && { lang: b.lang, href: b.querySelector('a').getAttribute('href') }; }''')
    ok(bar and bar['lang'] == 'ko' and bar['href'] == '/ko/', '한국어 브라우저로 영어판: 한국어판 안내 띠(lang="ko")', bar)
    ok(not visible_hangul_outside_ko(pg), '안내 띠의 한글은 lang="ko" 안에 있다', visible_hangul_outside_ko(pg)[:3])
    pg.close()
    pg = env.page(c, '/ko/', clock=False)
    ok(pg.evaluate('!document.querySelector(".langbar")'), '같은 언어면 띠가 없다')
    pg.close(); c.close()
    # 인쇄: 광고 자리·머리·꼬리를 숨긴다
    c = env.ctx()
    pg = env.page(c, '/ko/?adpreview', clock=False)
    pg.emulate_media(media='print')
    ok(pg.evaluate('["top", "foot", "ad-wrap"].every((c) => [...document.querySelectorAll("." + c)].every((e) => getComputedStyle(e).display === "none"))'), '인쇄에서는 머리·꼬리·광고 자리를 숨긴다')
    c.close()


# ---------- 8. 스크린샷 ----------
def shots(env):
    if not OUT:
        return
    print('8. 스크린샷')
    for lang, home in (('en', '/'), ('ko', '/ko/')):
        for w, h, mobile, dark, tag in ((1366, 768, False, False, 'desktop'), (390, 844, True, False, 'mobile'), (1366, 768, False, True, 'desktop-dark')):
            c = env.ctx(w, h, mobile, lang=lang, dark=dark, dpr=2 if mobile else 1)
            pg = env.page(c, home, clock=True, shots_font=True)
            shot(pg, f'final-{lang}-home-{tag}')
            if tag == 'desktop':
                pg2 = env.page(c, home, clock=False, shots_font=True)
                shot(pg2, f'final-{lang}-home-desktop-full', full=True)
                pg2.close()
            c.close()
    jobs = [('ko', '/ko/', 'ko-test', False), ('ko', '/ko/practice/', 'ko-practice', False), ('ko', '/ko/sentences/', 'ko-sentences', False), ('ko', '/ko/english/', 'ko-english', False),
            ('en', '/', 'en-test', False), ('en', '/practice/', 'en-practice', False), ('ko', '/ko/', 'ko-test-mobile', True), ('en', '/', 'en-test-mobile', True)]
    for lang, path, name, mob in jobs:
        c = env.ctx(390 if mob else 1366, 844 if mob else 768, mob, lang=lang, dpr=2 if mob else 1)
        pg = env.page(c, path, shots_font=True)
        pg.add_script_tag(content=SIM)
        cdp = c.new_cdp_session(pg)
        if mob:
            pg.tap('#trap', position={'x': 60, 'y': 30})
        else:
            pg.evaluate('document.getElementById("trap").focus()')
        pg.clock.pause_at(T0 + datetime.timedelta(seconds=5))
        ty = Typist(pg, cdp, phys=not mob)
        ks = ty.keys()
        # 치는 중: 틀린 글자 하나 + 조합 중인 글자
        stop = 47 if not mob else 31
        if lang == 'ko' and 'english' not in path and 'practice' not in path:
            while stop < len(ks) - 2 and not pg.evaluate('([n]) => { const T = __E.T; let acc = 0; for (const w of T.words) { for (let x = 0; x < w.ka.length; x++) { const a = acc + w.ka[x], z = acc + (x + 1 < w.ka.length ? w.ka[x + 1] : w.tk.length); if (n > a + 1 && n < z) return true; } acc += w.tk.length + 1; } return false; }', [stop]):
                stop += 1
        ty.run(n=min(stop, len(ks) - 3), wrong_at={13})
        pg.wait_for_timeout(200)
        shot(pg, f'final-{name}-typing')
        i = min(stop, len(ks) - 3)
        while not pg.evaluate('__E.done'):
            ks = ty.keys()
            if i >= len(ks):
                break
            k = ks[i]
            if i % 41 == 17 and wrong(k) != k and k not in ' \n':
                ty.key(wrong(k), 180); ty.key('\b', 240); ty.key(k)
            elif i % 53 == 30 and wrong(k) != k and k not in ' \n':
                ty.key(wrong(k))
            else:
                ty.key(' ' if k == '\n' else k, 420 if k in 'ㅂㅋㅍqzxp' else 150)
            i += 1
        finish_wait(pg)
        pg.wait_for_timeout(300)
        shot(pg, f'final-{name}-result')
        if mob:
            shot(pg, f'final-{name}-result-full', full=True)
        c.close()
    for lang, path, name in (('ko', '/ko/guide/tasu-gyesan/', 'ko-article'), ('en', '/guide/how-wpm-is-calculated/', 'en-article'), ('ko', '/ko/guide/', 'ko-guide-index'), ('ko', '/ko/privacy/', 'ko-privacy'), ('en', '/about/', 'en-about'), ('en', '/no-such-page/', '404')):
        if name.endswith('article') and not (ROOT / path.strip('/') / 'index.html').exists():
            continue
        for w, h, mob, tag in ((1366, 768, False, 'desktop'), (390, 844, True, 'mobile')):
            c = env.ctx(w, h, mob, lang=lang, dpr=2 if mob else 1)
            pg = env.page(c, path, clock=False, shots_font=True)
            shot(pg, f'final-{name}-{tag}', full=name.endswith('article'))
            c.close()
    for path, name in (('/ko/?adpreview', 'adpreview-ko'), ('/?adpreview', 'adpreview-en'), ('/ko/guide/tasu-gyesan/?adpreview', 'adpreview-ko-article')):
        if 'guide' in path and not (ROOT / 'ko/guide/tasu-gyesan/index.html').exists():
            continue
        for w, h, mob, tag in ((1366, 768, False, 'desktop'), (390, 844, True, 'mobile')):
            c = env.ctx(w, h, mob, lang='en' if name.endswith('en') else 'ko', dpr=1)
            pg = env.page(c, path, clock=False, shots_font=True)
            shot(pg, f'final-{name}-{tag}', full=True)
            c.close()


# ---------- 9. 제3자 평가에서 나온 것 ----------
C19 = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
V21 = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
F28 = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'
FIRST_OF = {'ㄳ': 'ㄱ', 'ㄵ': 'ㄴ', 'ㄶ': 'ㄴ', 'ㄺ': 'ㄹ', 'ㄻ': 'ㄹ', 'ㄼ': 'ㄹ', 'ㄽ': 'ㄹ', 'ㄾ': 'ㄹ', 'ㄿ': 'ㄹ', 'ㅀ': 'ㄹ', 'ㅄ': 'ㅂ'}
# 천지인으로 모음을 만들 때 조합 칸에 차례로 보이는 모양(평가자의 흉내와 같은 규칙). 아래아가 먼저 오면 'ㅇㆍ'처럼 글자 둘이 된다
CJI = {'ㅏ': ['ㅣ', 'ㅏ'], 'ㅓ': ['ㆍ', 'ㅓ'], 'ㅗ': ['ㆍ', 'ㅗ'], 'ㅜ': ['ㅡ', 'ㅜ'], 'ㅑ': ['ㅣ', 'ㅏ', 'ㅑ'], 'ㅕ': ['ㆍ', 'ᆢ', 'ㅕ'], 'ㅛ': ['ㆍ', 'ᆢ', 'ㅛ'], 'ㅠ': ['ㅡ', 'ㅜ', 'ㅠ'],
       'ㅐ': ['ㅣ', 'ㅏ', 'ㅐ'], 'ㅔ': ['ㆍ', 'ㅓ', 'ㅔ'], 'ㅡ': ['ㅡ'], 'ㅣ': ['ㅣ'], 'ㅘ': ['ㆍ', 'ㅗ', 'ㅚ', 'ㅘ'], 'ㅝ': ['ㅡ', 'ㅜ', 'ㅝ'], 'ㅢ': ['ㅡ', 'ㅢ'], 'ㅚ': ['ㆍ', 'ㅗ', 'ㅚ'], 'ㅟ': ['ㅡ', 'ㅜ', 'ㅟ'],
       'ㅙ': ['ㆍ', 'ㅗ', 'ㅚ', 'ㅘ', 'ㅙ'], 'ㅞ': ['ㅡ', 'ㅜ', 'ㅝ', 'ㅞ'], 'ㅒ': ['ㅣ', 'ㅏ', 'ㅑ', 'ㅒ'], 'ㅖ': ['ㆍ', 'ᆢ', 'ㅕ', 'ㅖ']}


def cji_steps(ch):
    c = ord(ch) - 0xAC00
    if c < 0 or c > 11171:
        return None
    cho, vi, fi = C19[c // 588], (c // 28) % 21, c % 28
    syl = lambda v, f: chr(0xAC00 + (C19.index(cho) * 21 + V21.index(v)) * 28 + f)
    out = [cho]
    for m in CJI[V21[vi]]:
        out.append(syl(m, 0) if m in V21 else cho + m)
    if fi:
        if F28[fi] in FIRST_OF:
            out.append(syl(V21[vi], F28.index(FIRST_OF[F28[fi]])))
        out.append(ch)
    return out


def py_keys(text):
    """실제로 누르는 키 수. 파이썬 unicodedata 로 따로 센다(tests/gen_keys.py 와 같은 방법, 우리 코드와 다른 길)."""
    n = 0
    for ch in text:
        if '가' <= ch <= '힣':
            names = [unicodedata.name(x) for x in unicodedata.normalize('NFD', ch)]
            n += 1 + (2 if names[1].replace('HANGUL JUNGSEONG ', '') in ('WA', 'WAE', 'OE', 'WEO', 'WE', 'WI', 'YI') else 1)
            if len(names) > 2:
                n += 2 if '-' in names[2] else 1
        else:
            n += 1
    return n


def hint_text(pg):
    return pg.evaluate('document.getElementById("hint").hidden ? "" : document.getElementById("hint").textContent')


def active(pg):
    return pg.evaluate('document.activeElement.id || document.activeElement.tagName')


def count_mode(pg, tap=False):
    (pg.tap if tap else pg.click)('#more summary')
    (pg.tap if tap else pg.click)('#mode [data-v="count"]')
    pg.wait_for_timeout(80)


def mobile_count(env, c):
    """휴대폰: 분량으로 재는 판을 열고 글을 눌러 치는 화면으로"""
    pg = env.page(c, '/ko/')
    pg.add_script_tag(content=SIM)
    cdp = c.new_cdp_session(pg)
    count_mode(pg, tap=True)
    pg.tap('#trap', position={'x': 60, 'y': 30})
    pg.clock.pause_at(T0 + datetime.timedelta(seconds=5))
    pg.wait_for_timeout(100)
    return pg, Typist(pg, cdp, phys=False)


SET_JS = "([v, type, data]) => { const t = document.getElementById('trap'); t.value = v; t.setSelectionRange(v.length, v.length); t.dispatchEvent(new InputEvent('input', { inputType: type, data: data, bubbles: true, isComposing: false })); }"
SMALL_JS = """() => [...document.querySelectorAll('button, summary, select, .nav a, .top .lang, .logo, .foot-links a, a.btn, .more-row label, .guides a, .langbar a')].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[data-off]'))
  .map((e) => { const b = e.getBoundingClientRect(); return [e.id || e.className || e.textContent.trim().slice(0, 10), Math.round(b.width), Math.round(b.height), e.tagName]; })
  .filter((x) => x[2] < 44 || ((x[3] === 'BUTTON' || x[3] === 'SUMMARY' || x[3] === 'SELECT') && x[1] < 44)).map((x) => x.slice(0, 3))"""
NF_JS = """() => { const vis = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length);
  return { lang: document.documentElement.lang, title: document.title, h1: vis('h1').map((e) => e.textContent), nav: vis('.nav a').map((e) => e.textContent), home: vis('.logo').map((e) => e.getAttribute('href')),
    lumen: vis('.lumen').map((e) => e.href), btn: vis('.nf a.btn').map((e) => e.getAttribute('href')), ids: document.querySelectorAll('#lumen').length, skip: vis('.skip').length }; }"""
OPEN_POS_JS = """() => { const T = __E.T, H = TJ.hangul, out = []; let base = 0;
  for (const w of T.words) { for (let x = 1; x < w.ci.length; x++) { const pp = H.parts(T.chars[w.ci[x - 1]]), cp = H.parts(T.chars[w.ci[x]]);
      if (pp && cp && pp.c.length === 1 && pp.v.length && !pp.f.length && cp.c.length === 1 && cp.v.length && 'ㄸㅃㅉㅁㄴ'.indexOf(cp.c[0]) < 0) out.push(base + w.ka[x]); }
    base += w.tk.length + 1; }
  return out; }"""
OUTSIDE_JS = '(() => { const s = document.querySelector(".stage").getBoundingClientRect(); return [...document.querySelectorAll("#result *")].filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && b.bottom > s.bottom + 1; }).map((e) => e.id || e.className).slice(0, 4); })()'


def tp_keys(env):
    """H1. 누른 키 = 실제로 누른 키(받침이 넘어갈 때 값이 두 번 바뀌어도 한 번)"""
    c = env.ctx()
    pg, ty = env.tool(c, '/ko/')
    count_mode(pg); pg.click('#trap'); pg.wait_for_timeout(80)
    text = pg.evaluate('__E.T.text'); n = py_keys(text)
    ok(n == len(ty.keys()), 'H1 기준: 파이썬으로 센 키 수 = 글의 키 수', (n, len(ty.keys())))
    ty.run(slow='')
    pg.clock.run_for(900); pg.wait_for_timeout(200)
    r = read_result(pg)
    ok(r['done'] and r['rep']['typed'] == n and r['rep']['ok'] == n and r['rep']['accuracy'] == 100, f'H1 전부 맞게 친 판: 누른 키 = 실제 키 수 {n}', r['rep'])
    ok(r['accd'] == f'누른 키 {n}개 중 {n}개 맞음' and r['missed'] == [], 'H1 화면 문구도 실제 키 수', r['accd'])
    check_formula('H1 결과', r)
    raw = pg.evaluate('document.getElementById("r-raw").textContent'); f = nums(raw)
    ok(raw.startswith('총 타수') and len(f) == 4 and f[3] == 60 and int(f[1] * 60 / f[2] + 0.5) == int(f[0]) and f[1] == r['rep']['strokes'] and f[0] == r['rep']['speed'], 'M6 총 타수 줄: 식을 다시 계산하면 같은 수(다 맞으면 타수와 같다)', raw)
    ok(pg.evaluate('Object.values(__E.session.byKey).reduce((a, b) => a + b.n, 0)') == n - 1, 'H1 넘어간 키도 앞 키와의 간격을 잰다(첫 키만 빼고 전부)')
    ok(not pg.evaluate(OUTSIDE_JS), 'M6 한국어 결과: 한 줄을 더해도 종이 안에 다 들어간다', pg.evaluate(OUTSIDE_JS))
    shot(pg, 'e2e-ko-count-result')
    # 받침 없는 글자 뒤 첫소리를 세 번 틀리게(고치지 않음): 틀린 키 3번, 누른 키는 그대로
    pg.clock.run_for(900); pg.click('#again'); pg.wait_for_timeout(120); pg.evaluate('__sim.reset()')
    text = pg.evaluate('__E.T.text'); n = py_keys(text); ks = ty.keys()
    pos = pg.evaluate(OPEN_POS_JS)
    pick = [pos[0], pos[len(pos) // 2], pos[-1]] if len(pos) >= 3 else pos
    ty.run(wrong_at=set(pick), slow='')
    pg.clock.run_for(900); pg.wait_for_timeout(200)
    r = read_result(pg)
    miss = dict(map(tuple, pg.evaluate('__E.result.missed.map((m) => [m.key, m.miss])')))
    want = {}
    for i in pick:
        want[ks[i]] = want.get(ks[i], 0) + 1
    ok(len(pick) == 3 and miss == want, 'H1 받침으로 붙었다 넘어간 틀린 자음: 틀린 키는 그 횟수만큼만(세 번)', (miss, want))
    ok(r['rep']['typed'] == n and r['rep']['ok'] == n - 3 and r['accd'] == f'누른 키 {n}개 중 {n - 3}개 맞음', 'H1 세 번 틀린 판: 누른 키·맞은 키', (r['rep'], n))
    em = pg.evaluate('[...document.querySelectorAll("#kb .k.miss em")].map((e) => +e.textContent).reduce((a, b) => a + b, 0)')
    ok(em == 3, 'H1 틀린 키 지도의 횟수 합 3', em)
    store_miss = sum(v[0] for v in ls(pg, 'todok.keys')['ko'].values())
    ok(store_miss == 3, 'H1 "자주 틀린 키" 누적도 세 번', store_miss)
    shot(pg, 'e2e-ko-count-3wrong')
    # 정말 지우고 같은 키를 다시 치면 두 번 누른 것으로 센다(지우기 키를 본다)
    pg.clock.run_for(900)
    pg.evaluate("__E.text = '벗고 버스를 타요'; __E.same = true; __E.reset(); document.getElementById('trap').focus(); __sim.reset()")
    for k in ['ㅂ', 'ㅓ', 'ㅅ', '\b', 'ㅅ', 'ㄱ', 'ㅗ', ' ', 'ㅂ', 'ㅓ', 'ㅅ', 'ㅡ', 'ㄹ', 'ㅡ', 'ㄹ', ' ', 'ㅌ', 'ㅏ', 'ㅇ', 'ㅛ']:
        ty.key(k)
    pg.clock.run_for(900); pg.wait_for_timeout(200)
    r = read_result(pg)
    ok(py_keys('벗고 버스를 타요') == 18 and r['done'] and r['rep']['typed'] == 19 and r['rep']['ok'] == 19 and r['rep']['strokes'] == 18, 'H1 지우고 다시 친 같은 키: 누른 키 19(글은 18키), 타수는 18', r['rep'])
    ok(not pg._errs, 'H1 콘솔 오류 0', pg._errs[:3])
    c.close()
    # 아이폰식(조합 이벤트 없이 앞 글자를 지우고 합친 글자를 다시 넣음): 평가에서 168 → 324 로 나오던 사례
    for variant in ('지우고 넣기', '세 단계', '바꿔 넣기'):
        c = env.ctx(390, 844, True, dpr=2)
        pg, ty = mobile_count(env, c)
        text = pg.evaluate('__E.T.text'); n = py_keys(text); ks = ty.keys()
        done, comp, bad = '', '', 0
        for k in ks:
            pg.clock.run_for(200)
            prev = done + comp
            r0 = pg.evaluate('k => __sim.key(k)', k)
            if r0['plain']:
                done += r0['commit'] + r0['plain']; comp = ''
                pg.evaluate(SET_JS, [done, 'insertText', k])
            else:
                mid = done + r0['commit']
                done, new = mid, mid + r0['comp']
                if comp and variant != '바꿔 넣기':
                    pg.evaluate(SET_JS, [prev[:-1], 'deleteContentBackward', None])
                    if variant == '세 단계' and mid != prev[:-1] and mid != new:
                        pg.evaluate(SET_JS, [mid, 'insertText', mid[len(prev) - 1:]])
                    pg.evaluate(SET_JS, [new, 'insertText', new[len(prev) - 1:]])
                else:
                    pg.evaluate(SET_JS, [new, 'insertReplacementText' if comp else 'insertText', new[max(0, len(prev) - 1):]])
                comp = r0['comp']
            if pg.evaluate('document.querySelectorAll("#txt .bad").length'):
                bad += 1
        pg.clock.run_for(900); pg.wait_for_timeout(200)
        r = read_result(pg)
        ok(r['done'] and r['mode'] == 'char' and bad == 0, f'H1 아이폰식({variant}): 끝까지 가고 틀림 표시 없음', (r['done'], r['mode'], bad))
        ok(r['rep'] and r['rep']['typed'] == n and r['rep']['ok'] == n and r['rep']['accuracy'] == 100 and r['accd'] == f'누른 키 {n}개 중 {n}개 맞음', f'H1 아이폰식({variant}): 누른 키 = 두벌식으로 환산한 키 수 {n}', r['rep'])
        check_formula(f'H1 아이폰식({variant})', r)
        c.close()


def tp_cji(env):
    """H2. 천지인 중간 모양('ㅇㆍ' 등): 조합이 끝나기 전에는 판정하지 않는다"""
    c = env.ctx(390, 844, True, dpr=2)
    pg, ty = mobile_count(env, c)
    text = pg.evaluate('__E.T.text'); n = py_keys(text)
    cdp = ty.cdp; bad = []; steps = 0; mids = 0
    for ch in text:
        st = cji_steps(ch)
        if st is None:
            pg.clock.run_for(200); cdp.send('Input.insertText', {'text': ch}); steps += 1
        else:
            for m in st:
                pg.clock.run_for(200); cdp.send('Input.imeSetComposition', {'text': m, 'selectionStart': len(m), 'selectionEnd': len(m)}); steps += 1
                mids += 1 if len(m) > 1 else 0
                if pg.evaluate('document.querySelectorAll("#txt .bad").length'):
                    bad.append((ch, m))
                if mids == 3 and len(m) > 1:
                    shot(pg, 'e2e-ko-mobile-cji-typing')
            cdp.send('Input.insertText', {'text': ch})
        if pg.evaluate('__E.done'):
            break
    pg.clock.run_for(900); pg.wait_for_timeout(200)
    r = read_result(pg)
    ok(mids >= 5, 'H2 흉내가 아래아 중간 모양을 실제로 냈다', mids)
    ok(not bad, f'H2 천지인 흉내 {steps}단계: 맞게 치는 동안 틀림 표시 없음', bad[:5])
    ok(r['done'] and r['mode'] == 'char' and r['rep']['accuracy'] == 100 and r['rep']['typed'] == n and r['rep']['ok'] == n and r['missed'] == [], f'H2 천지인 흉내: 정확도 100%, 누른 키 {n}, 틀린 키 없음', (r['rep'], r['missed']))
    ok(pg.evaluate('document.getElementById("map-cap").textContent').startswith('틀린 키가 없어요'), 'H2 틀린 키 지도 글', pg.evaluate('document.getElementById("map-cap").textContent'))
    check_formula('H2 결과', r)
    shot(pg, 'e2e-ko-mobile-cji-result')
    ok(not pg._errs, 'H2 콘솔 오류 0', pg._errs[:3])
    c.close()


def tp_hint(env):
    """M1. 한/영 반대 안내는 띄어쓰기를 넘어서도 이어진다"""
    c = env.ctx(lang='en')
    pg, ty = env.tool(c, '/')
    words = pg.evaluate('__E.T.text').split(' ')[:5]
    seq = list(' '.join(words) + ' ')
    lost = []
    for ch in seq:
        ty.key(pg.evaluate('k => TJ.hangul.Q2K[k] || k', ch))
        if 'English' not in hint_text(pg):
            lost.append(ch)
    st = pg.evaluate('[__E.session.typedKeys, __E.session.okKeys, __E.session.skippedKeys]')
    ok(not lost, f'M1 영어 글을 한글 자판으로 {len(seq)}키(다섯 단어): 안내가 끝까지 떠 있다', lost)
    ok(st == [0, 0, len(seq)] and pg.evaluate('document.getElementById("acc").textContent') == '–', 'M1 그동안 친 키는 정확도·틀린 키에 넣지 않는다', st)
    ok(not visible_hangul_outside_ko(pg), 'M1 안내가 뜬 영어 화면에 lang 밖 한글 없음', visible_hangul_outside_ko(pg)[:4])
    shot(pg, 'e2e-en-hint-words')
    pg.keyboard.press('Tab'); pg.wait_for_timeout(100); pg.evaluate('__sim.reset()')
    w = pg.evaluate('__E.T.text').split(' ')[:3]
    typed = w[0].upper() + ' ' + w[1].upper() + ' ' + w[2].upper()[:1]
    hints = []
    for ch in typed:
        pg.clock.run_for(120); pg.keyboard.type(ch); hints.append('Caps Lock' in hint_text(pg))
    st = pg.evaluate('[__E.session.typedKeys, __E.session.skippedKeys]')
    ok(hints[0] is False and all(hints[1:]), 'M1 Caps Lock: 둘째 키부터 끝까지 안내(다음 단어는 첫 키부터)', hints)
    ok(st == [0, len(typed)], 'M1 Caps Lock 구간은 세지 않는다(처음에 센 한 키도 되돌린다)', st)
    # 진짜 오타는 안내로 잡지 않는다
    pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    w = pg.evaluate('__E.T.text').split(' ')[:2]
    junk = ''.join(' ' if ch == ' ' else ('z' if ch == 'q' else 'q') for ch in ' '.join(w))
    for ch in junk:
        pg.clock.run_for(120); pg.keyboard.type(ch)
    st = pg.evaluate('[__E.session.typedKeys, __E.session.skippedKeys]')
    ok(hint_text(pg) == '' and st == [len(junk), 0], 'M1 그냥 틀린 키는 안내 없이 전부 센다', (hint_text(pg), st))
    ok(not pg._errs, 'M1 영어 콘솔 오류 0', pg._errs[:3])
    c.close()


def tp_focus(env):
    """M1(한국어 쪽)·M4·L8·L1·L10·L5. 초점과 안내"""
    c = env.ctx()
    pg, ty = env.tool(c, '/ko/')
    w = pg.evaluate('__E.T.text').split(' ')[:3]
    qw = pg.evaluate('ws => ws.map((x) => TJ.hangul.toQwerty(x)).join(" ")', w).lower()
    lost = []
    for ch in qw:
        pg.clock.run_for(120); pg.keyboard.type(ch)
        if '한/영' not in hint_text(pg):
            lost.append(ch)
    st = pg.evaluate('[__E.session.typedKeys, __E.session.skippedKeys]')
    ok(not lost and st == [0, len(qw)], f'M1 한글 글을 영문 자판으로 {len(qw)}키(세 단어): 안내가 이어지고 세지 않는다', (lost, st))
    shot(pg, 'e2e-ko-hint-words')
    # Esc 뒤: 안내, 띄어쓰기, 한글 입력기가 켜진 키
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); pg.evaluate('__sim.reset()')
    st = pg.evaluate('({ on: getComputedStyle(document.querySelector(".start .on")).display, off: getComputedStyle(document.querySelector(".start .off")).display, text: document.querySelector(".start .off").textContent })')
    ok(active(pg) != 'trap' and st['on'] == 'none' and st['off'] != 'none' and st['text'] == '글을 누르거나 아무 키나 치면 시작해요', 'M4 Esc 뒤: 다시 시작하는 법 안내', st)
    shot(pg, 'e2e-ko-after-esc')
    pg.keyboard.press('Space'); pg.wait_for_timeout(120)
    ok(pg.evaluate('scrollY') == 0 and active(pg) == 'trap' and not pg.evaluate('__E.started'), 'L8 Esc 뒤 띄어쓰기: 쪽이 굴러가지 않고 치는 칸으로', (pg.evaluate('scrollY'), active(pg)))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(80)
    for typ in ('rawKeyDown', 'keyUp'):
        ty.cdp.send('Input.dispatchKeyEvent', {'type': typ, 'key': 'Process', 'code': 'KeyG', 'windowsVirtualKeyCode': 229, 'nativeVirtualKeyCode': 229})
    pg.wait_for_timeout(80)
    ok(active(pg) == 'trap' and pg.evaluate('getComputedStyle(document.querySelector(".start .on")).display') != 'none', 'M4 Esc 뒤 한글 입력기가 켜진 키(key=Process, 229)를 누르면 치는 칸으로', active(pg))
    ks = ty.keys(); n1 = ks.index(' ') + 1   # 첫 단어와 띄어쓰기까지(조합이 끝난 자리에서 누른다. 실제 입력기도 누르면 조합을 끝낸다)
    for k in ks[:n1]:
        ty.key(k)
    ok(pg.evaluate('__E.started') and pg.evaluate('__E.session.okKeys') == n1, 'M4 이어서 치면 시작된다')
    pg.mouse.click(6, 420); pg.wait_for_timeout(80)
    a1 = active(pg)
    pg.mouse.click(450, 100); pg.wait_for_timeout(80)   # 제목과 고르기 단추 사이의 빈 곳
    ok(a1 == 'trap' and active(pg) == 'trap', 'M4 여백·제목 줄의 빈 곳을 눌러도 치는 칸 초점이 그대로', (a1, active(pg)))
    for k in ks[n1:n1 + 4]:
        ty.key(k)
    ok(pg.evaluate('__E.session.okKeys') == n1 + 4 and pg.evaluate('__E.session.typedKeys') == n1 + 4, 'M4 여백을 누른 뒤에도 그대로 이어 쳐진다', pg.evaluate('[__E.session.okKeys, __E.session.typedKeys]'))
    pg.evaluate('document.getElementById("faq-h").scrollIntoView({ block: "center" })'); pg.wait_for_timeout(80)
    pg.click('#faq-h'); pg.wait_for_timeout(80)
    ok(active(pg) != 'trap', 'M4 읽는 글을 누르면 초점을 붙잡지 않는다(글자를 골라 복사할 수 있게)', active(pg))
    pg.evaluate('scrollTo(0, 0)'); pg.evaluate('document.getElementById("trap").focus()')
    ok(pg.evaluate('''(() => { const hit = (sel) => { const e = document.querySelector(sel); const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientX: 300, clientY: 300 }); e.dispatchEvent(ev); return ev.defaultPrevented; };
      return [hit('.meter'), hit('main'), hit('#result'), hit('#fresh'), hit('.basis a'), hit('.rec-note')]; })()''') == [True, True, False, False, False, False], 'M4 초점을 지키는 곳은 빈 곳뿐(결과 글·단추·링크·아래 글은 그대로)')
    # 설정을 바꾼 뒤 바로 치기
    pg.keyboard.press('Escape'); pg.wait_for_timeout(80); pg.evaluate('__sim.reset()')
    pg.click('#more summary'); pg.click('#mode [data-v="count"]'); pg.wait_for_timeout(80)
    ok(pg.evaluate('document.getElementById("more").open') and active(pg) != 'trap', 'L1 설정을 바꾼 직후: 팝업이 열려 있고 초점은 단추')
    ty.cdp.send('Input.dispatchKeyEvent', {'type': 'rawKeyDown', 'key': 'Process', 'code': ty.code(ty.keys()[0]), 'windowsVirtualKeyCode': 229, 'nativeVirtualKeyCode': 229})
    pg.wait_for_timeout(60)
    ok(not pg.evaluate('document.getElementById("more").open') and active(pg) == 'trap', 'L1 그대로 치기 시작하면 팝업이 닫히고 치는 칸으로(한글 입력기)', active(pg))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(60)
    pg.click('#kind [data-v="words"]'); pg.wait_for_timeout(80)
    pg.click('#more summary'); pg.check('#punct'); pg.wait_for_timeout(80)
    ok(pg.evaluate('document.getElementById("more").open') and active(pg) == 'punct', 'L1 체크 칸을 누른 직후: 팝업이 열려 있다', active(pg))
    pg.keyboard.press('g'); pg.wait_for_timeout(80)
    ok(not pg.evaluate('document.getElementById("more").open') and active(pg) == 'trap' and pg.evaluate('document.getElementById("trap").value') == 'g', 'L1 체크 칸에서 글자를 치면 팝업이 닫히고 그 글자가 치는 칸에 들어간다', (active(pg), pg.evaluate('document.getElementById("trap").value')))
    pg.keyboard.press('Backspace')
    pg.click('#more summary'); pg.uncheck('#punct'); pg.wait_for_timeout(60); pg.click('h1'); pg.click('#kind [data-v="sentences"]'); pg.wait_for_timeout(80)
    # 화면 읽기 프로그램이 읽을 글과 빠져나오는 법
    a11y = pg.evaluate("""() => { const sr = document.getElementById('txt-sr'), t = document.getElementById('trap'), h = document.getElementById(t.getAttribute('aria-describedby') || '');
      return { same: sr.textContent === __E.T.text.replace(/\\n/g, ' '), hidden: sr.closest('[aria-hidden="true"]') !== null || getComputedStyle(sr).display === 'none' || getComputedStyle(sr).visibility === 'hidden', help: h ? h.textContent : '', label: t.getAttribute('aria-label') }; }""")
    ok(a11y['same'] and not a11y['hidden'] and 'Esc' in a11y['help'] and a11y['label'], 'L10 칠 글을 읽을 수 있는 문단이 있고, 치는 칸에 빠져나오는 법 설명이 붙어 있다', a11y)
    ok('Esc' in pg.evaluate('document.querySelector(".basis").textContent'), 'L10 화면에도 Esc 로 나오는 법 한 줄')
    # 속담 사이 구분(화면에만)
    pg.click('#more summary'); pg.click('#mode [data-v="time"]'); pg.click('h1'); pg.click('#kind [data-v="proverbs"]'); pg.wait_for_timeout(100)
    br = pg.evaluate("""() => { const b = [...document.querySelectorAll('#txt .sp.brk')]; return { n: b.length, parts: __E.parts.length, dot: b.length ? getComputedStyle(b[0], '::before').content : '', text: b.map((x) => x.textContent).join(''), inText: __E.T.text.includes('·'), first: __E.parts[0] }; }""")
    ok(br['n'] == br['parts'] - 1 and br['n'] >= 3 and '·' in br['dot'] and br['text'].strip() == '' and not br['inText'], 'L5 속담 사이마다 가운뎃점이 보이고, 치는 글에는 들어 있지 않다', br)
    pg.evaluate('__sim.reset()')
    for k in pg.evaluate('p => TJ.hangul.keyStream(p + " ")', br['first']):
        ty.key(k)
    cls_ = pg.evaluate('document.querySelector("#txt .sp.brk").className')
    ok('brk' in cls_ and 'ok' in cls_ and pg.evaluate('__E.session.typedKeys === __E.session.okKeys'), 'L5 그 자리는 띄어쓰기로 치고, 친 뒤에도 표시가 남는다', cls_)
    shot(pg, 'e2e-ko-proverbs')
    ok(not pg._errs, '초점·속담 콘솔 오류 0', pg._errs[:3])
    c.close()


def tp_texts(env):
    """M2·M5·M6. 팬그램은 팬그램만, 영어 문장은 되풀이되지 않게, Raw WPM"""
    c = env.ctx()
    pg, ty = env.tool(c, '/ko/english/')
    pg.click('#kind [data-v="pangrams"]'); pg.wait_for_timeout(100)
    pans = set(pg.evaluate('TJ_TEXT.en.pangrams'))
    ok(len(pans) >= 20, 'M2 팬그램 20개 이상', len(pans))
    shot(pg, 'e2e-ko-english-pangrams')
    wrongs = 0
    for i in range(8):
        parts = pg.evaluate('__E.parts')
        if not parts or any(x not in pans or len(set(x.lower()) & set('abcdefghijklmnopqrstuvwxyz')) != 26 for x in parts) or pg.evaluate('__E.T.text') != ' '.join(parts) or len(set(parts)) != len(parts):
            wrongs += 1
        pg.keyboard.press('Tab'); pg.wait_for_timeout(60)
    ok(wrongs == 0, 'M2 팬그램 모드 여덟 판: 26자가 다 든 문장만, 한 판 안에서 되풀이 없음', wrongs)
    count_mode(pg); pg.click('#trap'); pg.wait_for_timeout(80)
    parts = pg.evaluate('__E.parts')
    ok(parts and all(x in pans for x in parts), 'M2 팬그램 분량 모드도 팬그램만', parts)
    pg.click('#more summary'); pg.click('#mode [data-v="time"]'); pg.click('#trap'); pg.wait_for_timeout(80); pg.evaluate('__sim.reset()')
    len0 = pg.evaluate('__E.T.chars.length'); i = 0
    while not pg.evaluate('__E.done') and i < len0 - 40:   # 남은 글이 90자 아래로 내려가면 이어 붙는다
        ty.key(ty.keys()[i], 20); i += 1
    parts = pg.evaluate('__E.parts')
    ok(pg.evaluate('__E.T.chars.length') > len0 and all(x in pans for x in parts) and pg.evaluate('__E.T.text') == ' '.join(parts), 'M2 빨리 쳐서 글을 이어 붙여도 팬그램만 이어진다', (len0, pg.evaluate('__E.T.chars.length')))
    ok(pg.evaluate('__E.session.typedKeys === __E.session.okKeys && document.querySelectorAll("#txt .bad").length === 0'), 'M2 이어 붙인 뒤에도 틀림 표시 없음')
    pg.clock.run_for(31000); pg.wait_for_timeout(300)
    raw = pg.evaluate('document.getElementById("r-raw").textContent')
    ok('총 타수' in raw and '총 WPM' in raw and not pg.evaluate(OUTSIDE_JS), 'M6 영타 결과: 총 타수와 총 WPM, 종이 안에 다 들어간다', (raw, pg.evaluate(OUTSIDE_JS)))
    shot(pg, 'e2e-ko-english-raw')
    c.close()
    c = env.ctx(lang='en')
    pg, ty = env.tool(c, '/')
    pg.click('#kind [data-v="sentences"]'); pg.wait_for_timeout(100)
    seen, again, inner = [], 0, 0
    for i in range(25):
        parts = pg.evaluate('__E.parts')
        inner += len(parts) - len(set(parts)); again += sum(1 for x in parts if x in seen); seen += parts
        pg.keyboard.press('Tab'); pg.wait_for_timeout(50)
    ok(pg.evaluate('TJ_TEXT.en.sentences.length') >= 200 and inner == 0 and again == 0, f'M5 "다른 글" 25번(문장 {len(seen)}개): 같은 문장이 한 번도 다시 나오지 않는다', (inner, again))
    count_mode(pg); pg.click('#trap'); pg.wait_for_timeout(80); pg.evaluate('__sim.reset()')
    ty.run(wrong_at={7}, fix_at={15, 30}, slow='')
    pg.clock.run_for(900); pg.wait_for_timeout(200)
    r = read_result(pg)
    raw = pg.evaluate('document.getElementById("r-raw").textContent'); f = nums(raw)
    ok(raw.startswith('Raw ') and len(f) == 5 and f[2] == 5 and f[4] == 60 and int(f[1] / 5 / f[3] * 60 + 0.5) == int(f[0]) and f[1] == r['rep']['typed'] and f[0] == r['rep']['grossWpm'] and f[0] >= r['rep']['wpm'], 'M6 영어 결과에 Raw WPM 과 식(다시 계산하면 같은 수, 누른 키 = 정확도 줄의 누른 키)', (raw, r['rep']))
    ok(not pg.evaluate(OUTSIDE_JS), 'M6 한 줄을 더해도 결과가 종이 안에 다 들어간다', pg.evaluate(OUTSIDE_JS))
    basis = pg.evaluate('document.getElementById("basis").textContent')
    ok('Raw speed' in basis and 'small print' in basis, 'M6 계산 기준의 Raw speed 설명이 화면과 맞다')
    shot(pg, 'e2e-en-raw')
    ok(not visible_hangul_outside_ko(pg) and not pg._errs, 'M5·M6 영어 화면: 한글 없음, 콘솔 오류 0', (visible_hangul_outside_ko(pg)[:3], pg._errs[:3]))
    c.close()


def tp_mobile(env):
    """M3·L3. 휴대폰: 옵션만 눌러서는 치는 화면으로 가지 않는다, 누르는 곳 44px"""
    for w, h in ((390, 844), (320, 568)):
        c = env.ctx(w, h, True, dpr=2)
        pg = env.page(c, '/ko/', clock=False)
        ok(pg.evaluate(SMALL_JS) == [], f'L3 {w}px 첫 화면: 누르는 곳이 모두 44px 이상', pg.evaluate(SMALL_JS)[:6])
        ok(first_line_visible(pg), f'L3 {w}px 단추를 키워도 첫 화면에 치는 글이 보인다')
        pg.tap('#kind [data-v="words"]'); pg.wait_for_timeout(150)
        st = pg.evaluate('({ tall: document.documentElement.classList.contains("m-tall"), act: document.activeElement.id, kind: __E.kind, opts: document.querySelector(".opts").getClientRects().length > 0 })')
        ok(not st['tall'] and st['act'] != 'trap' and st['kind'] == 'words' and st['opts'], f'M3 {w}px 글 종류를 눌러도 치는 화면으로 넘어가지 않는다', st)
        pg.tap('#len-t [data-v="t60"]'); pg.wait_for_timeout(150)
        st = pg.evaluate('({ tall: document.documentElement.classList.contains("m-tall"), act: document.activeElement.id, kind: __E.kind, secs: __E.secs, left: document.getElementById("left").textContent })')
        ok(not st['tall'] and st['act'] != 'trap' and st['kind'] == 'words' and st['secs'] == 60 and st['left'] == '60', f'M3 {w}px 이어서 시간을 고를 수 있다(둘 다 적용)', st)
        if w == 390:
            shot(pg, 'e2e-ko-mobile-options')
        pg.tap('#more summary'); pg.wait_for_timeout(100)
        ok(pg.evaluate(SMALL_JS) == [], f'L3 {w}px 설정 팝업: 44px 이상', pg.evaluate(SMALL_JS)[:6])
        pg.tap('#punct'); pg.wait_for_timeout(100)
        ok(pg.evaluate('__E.punct && !document.documentElement.classList.contains("m-tall")'), f'M3 {w}px 설정 안의 옵션도 이어서')
        ok(pg.evaluate('document.documentElement.scrollWidth - innerWidth') <= 0, f'{w}px 옵션을 고른 뒤 가로 스크롤 0')
        pg.tap('h1'); pg.wait_for_timeout(100)   # 팝업 밖을 눌러 닫는다
        ok(not pg.evaluate('document.getElementById("more").open') and not pg.evaluate('document.documentElement.classList.contains("m-tall")'), f'M3 {w}px 팝업 밖을 누르면 닫힌다(치는 화면으로 가지 않는다)')
        pg.tap('#trap', position={'x': 60, 'y': 30}); pg.wait_for_timeout(150)
        ok(pg.evaluate('document.documentElement.classList.contains("m-tall")') and pg.evaluate('document.activeElement.id') == 'trap', f'M3 {w}px 글을 누르면 치는 화면')
        ok(pg.evaluate(SMALL_JS) == [], f'L3 {w}px 치는 화면(다른 글·닫기): 44px 이상', pg.evaluate(SMALL_JS)[:6])
        rc = pg.evaluate('(() => { const t = document.getElementById("txt").getBoundingClientRect(); return [t.top, innerHeight]; })()')
        ok(rc[0] < rc[1] * 0.45, f'L3 {w}px 치는 화면: 글이 화면 위쪽에 있다(자판에 안 가린다)', rc)
        shot(pg, f'e2e-ko-mobile-typing-{w}')
        pg.tap('#quit'); pg.wait_for_timeout(120)
        ok(not pg.evaluate('document.documentElement.classList.contains("m-tall")') and pg.evaluate('__E.kind') == 'words' and pg.evaluate('__E.secs') == 60, f'M3 {w}px 닫기(×): 고른 옵션은 그대로')
        ok(not pg._errs, f'{w}px 휴대폰 옵션 콘솔 오류 0', pg._errs[:3])
        c.close()
    for lang, paths in (('en', ('/', '/practice/', '/guide/how-wpm-is-calculated/', '/about/')), ('ko', ('/ko/practice/', '/ko/sentences/', '/ko/english/', '/ko/guide/tasu-gyesan/', '/ko/privacy/'))):
        c = env.ctx(390, 844, True, lang=lang, dpr=2)
        for path in paths:
            pg = env.page(c, path, clock=False)
            ok(pg.evaluate(SMALL_JS) == [], f'L3 {path} 390px: 누르는 곳이 모두 44px 이상', pg.evaluate(SMALL_JS)[:6])
            pg.close()
        c.close()
    c = env.ctx(390, 844, True, dpr=2)
    pg, ty = mobile_count(env, c)
    ty.run(wrong_at={9})
    pg.clock.run_for(900); pg.wait_for_timeout(200)
    ok(pg.evaluate('__E.done') and pg.evaluate(SMALL_JS) == [], 'L3 휴대폰 결과 화면: 단추가 모두 44px 이상', pg.evaluate(SMALL_JS)[:6])
    ok('총 타수' in pg.evaluate('document.getElementById("r-raw").textContent'), 'M6 휴대폰 결과에도 총 타수')
    shot(pg, 'e2e-ko-mobile-result-44')
    c.close()


def tp_rest(env):
    """L2·L4·L6. 통과 기준, 기록 목록, 없는 주소"""
    c = env.ctx(lang='en')
    pg, ty = env.tool(c, '/practice/')

    def lesson(wrongs, fixes):
        pg.evaluate("__E.text = 'asdf jkl; asdf jkl; asdf jkl; asdf jkl;'; __E.same = true; __E.reset(); document.getElementById('trap').focus(); __sim.reset()")
        ty.run(wrong_at=wrongs, fix_at=fixes, slow='')
        pg.clock.run_for(900); pg.wait_for_timeout(200)
        return read_result(pg), pg.evaluate('[document.getElementById("r-pass").textContent, document.getElementById("again").textContent, document.getElementById("acc").textContent]')
    r, t = lesson({1, 6}, set())
    ok(r['rep']['typed'] == 39 and r['rep']['ok'] == 37 and not pg.evaluate('__E.result.pass'), 'L2 37/39 = 94.87%: 통과가 아니다', r['rep'])
    ok(r['acc'] == '94.8%' and t[2] == '94.8' and '95% accuracy or higher' in t[0] and 'Next step' not in t[1], 'L2 그때는 95%로 반올림해 보여 주지 않는다(94.8%)', (r['acc'], t))
    ok(not pg.evaluate(OUTSIDE_JS), 'M6 자리 연습 결과: 종이 안에 다 들어간다', pg.evaluate(OUTSIDE_JS))
    shot(pg, 'e2e-en-practice-9487')
    r, t = lesson({1}, {6})
    ok(r['rep']['typed'] == 40 and r['rep']['ok'] == 38 and pg.evaluate('__E.result.pass') and r['acc'] == '95%' and 'Step 1 passed' in t[0] and 'Next step' in t[1], 'L2 38/40 = 95.0%: 통과', (r['rep'], t))
    r, t = lesson({1, 6, 11}, set())
    ok(not pg.evaluate('__E.result.pass') and r['acc'] == '92%', 'L2 36/39 = 92.3%: 통과가 아니다', r['acc'])
    ok('95% accuracy or higher' in pg.evaluate('document.querySelector(".basis").textContent'), 'L2 화면의 말도 "95% 이상"')
    ok(not pg._errs, 'L2 콘솔 오류 0', pg._errs[:3])
    c.close()
    # 내 기록: 문장부호·숫자 조건 표시, 더 보기
    c = env.ctx()
    pg = c.new_page()
    pg.goto(BASE + '/ko/', wait_until='load')
    pg.evaluate("""() => { const conds = ['p', '-', 'pn', 'n', '-', 'p', '-', '-'], runs = [];
      conds.forEach((f, i) => runs.push({ cond: 'test|ko|words|t30|' + f, v: 300 + i, unit: 'ko', acc: 97, secs: 30, at: Date.now() - i * 60000, tool: 'test', lang: 'ko', kind: 'words', len: 't30' }));
      localStorage.setItem('todok.runs', JSON.stringify(runs)); }""")
    pg.reload(wait_until='load'); pg.wait_for_timeout(300)
    rows = pg.evaluate('[...document.querySelectorAll("#rec-list li .rc-cond")].map((e) => e.textContent)')
    ok(rows == ['단어 · 30초 · 문장부호', '단어 · 30초', '단어 · 30초 · 문장부호 · 숫자', '단어 · 30초 · 숫자', '단어 · 30초'], 'L4 기록 목록에 문장부호·숫자 조건이 보인다', rows)
    more = pg.evaluate('(() => { const b = document.getElementById("rec-more"); return [b.hidden, b.textContent]; })()')
    ok(more == [False, '더 보기(8개)'], 'L4 다섯 개가 넘으면 "더 보기"', more)
    h0 = pg.evaluate('document.querySelector(".rec-col").getBoundingClientRect().height')
    pg.click('#rec-more'); pg.wait_for_timeout(100)
    ok(pg.evaluate('document.querySelectorAll("#rec-list li").length') == 8 and pg.evaluate('document.getElementById("rec-more").textContent') == '접기' and pg.evaluate('document.querySelector(".rec-col").getBoundingClientRect().height') > h0, 'L4 누르면 전부 펼쳐진다')
    pg.evaluate('document.querySelector(".records").scrollIntoView()'); pg.wait_for_timeout(100)
    shot(pg, 'e2e-ko-records-more')
    pg.click('#rec-more'); pg.wait_for_timeout(100)
    ok(pg.evaluate('document.querySelectorAll("#rec-list li").length') == 5 and abs(pg.evaluate('document.querySelector(".rec-col").getBoundingClientRect().height') - h0) < 1, 'L4 접으면 다섯 줄, 칸 높이도 그대로')
    c.close()
    # 없는 주소: 주소에 맞는 언어 틀
    c = env.ctx()
    for path, want in (('/ko/eobtneun-juso/', 'ko'), ('/ko/guide/none/', 'ko'), ('/nope/', 'en'), ('/kotlin/', 'en')):
        pg = env.page(c, path, clock=False)
        r = pg.evaluate(NF_JS)
        if want == 'ko':
            ok(r['lang'] == 'ko' and r['title'] == '없는 페이지예요 | 토독' and r['h1'] == ['없는 페이지예요'] and r['nav'] == ['속도 측정', '자리 연습', '문장 연습', '영타 연습', '가이드'] and r['home'] == ['/ko/'] and r['lumen'] == ['https://lumenlab.page/'] and r['btn'] == ['/ko/', '/'], f'L6 {path}: 한국어 틀(메뉴·제목·루멘랩 링크)', r)
        else:
            ok(r['lang'] == 'en' and r['title'].startswith('Page not found') and r['h1'] == ['Page not found'] and r['nav'] == ['Typing Test', 'Practice', 'Guides'] and r['home'] == ['/'] and r['lumen'] == ['https://lumenlab.page/en/'] and r['btn'] == ['/', '/ko/'], f'L6 {path}: 영어 틀', r)
            ok(not visible_hangul_outside_ko(pg), f'L6 {path}: lang 밖 한글 없음', visible_hangul_outside_ko(pg)[:3])
        ok(r['ids'] == 1 and r['skip'] == 1, f'L6 {path}: 겹치는 id 없음, 건너뛰기 링크 하나', (r['ids'], r['skip']))
        if path in ('/ko/eobtneun-juso/', '/nope/'):
            shot(pg, 'e2e-404-' + want)
        pg.close()
    c.close()


def third_party(env):
    print('9. 제3자 평가에서 나온 것')
    part = os.environ.get('PART', '')
    for name, fn in (('keys', tp_keys), ('cji', tp_cji), ('hint', tp_hint), ('focus', tp_focus), ('texts', tp_texts), ('mobile', tp_mobile), ('rest', tp_rest)):
        if part and name not in part.split(','):
            continue
        try:
            fn(env)
        except Exception as e:  # 한 갈래가 죽어도 나머지는 돌린다
            import traceback
            traceback.print_exc()
            fails.append(f'{fn.__name__} 가 도중에 멈췄다: {e!r}'[:300])


def main():
    proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy') or ''
    args = ['--proxy-bypass-list=localhost;127.0.0.1']
    if proxy:
        args.append('--proxy-server=https=' + proxy.replace('http://', ''))
    exe = sorted(Path('/opt/pw-browsers').glob('chromium-*/chrome-linux/chrome'))
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=str(exe[0]) if exe else None, args=args)
        env = Env(b)
        for n, fn in ((1, all_pages), (2, cls), (3, ko_test), (4, en_test), (5, practice), (6, mobile), (7, ads_and_motion), (9, third_party), (8, shots)):
            if sec(n):
                try:
                    fn(env)
                except Exception as e:  # 한 묶음이 죽어도 나머지는 돌린다
                    import traceback
                    traceback.print_exc()
                    fails.append(f'{fn.__name__} 가 도중에 멈췄다: {e!r}'[:300])
        b.close()
    print(f'화면 확인 {passed + len(fails)}개 가운데 실패 {len(fails)}개')
    for f in fails[:80]:
        print('  실패', f)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
