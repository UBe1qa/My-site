#!/usr/bin/env python3
"""오래QR 화면 확인(Playwright): python3 qr/_dev/e2e.py [스크린샷 폴더]      서버: node qr/_dev/serve.mjs (8471)
SEC=1,2 처럼 주면 그 묶음만:
 1 모든 페이지(콘솔 오류·깨진 그림·같은 id·동작 줄이기에서 내용)   2 가로 넘침 320~1440px(20px 간격, 두 언어, 휴대폰 흉내 없이 창 폭만)
 3 누를 것 44px(손가락 화면) + 언어 띠와 겹치는 누를 것 0            4 화면 밀림(CLS: 처음 열 때·누른 뒤·응답 늦춰서·저장된 설정)
 5 만들기: 종류별 입력 → 미리보기·찍힘 확인 통과 / 브라우저가 그린 PNG(저장 파일)를 zxing 으로 / 꾸밈 세트 전부 / 무작위 꾸밈(어둡게·투명 포함)
 6 찍힘 확인이 맞게 판정: 대비 낮음·반전·큰 로고·여백 0 → 경고/실패, 기본 → 통과
 7 저장: PNG·JPG·SVG·PDF·EPS·시트 PDF 받기 → 파일을 다시 읽기, 와이파이 비밀번호가 주소·저장소에 없음, 내 꾸밈·최근 QR
 8 대량: 목록 → ZIP(파일 수·이름·같은 이름 번호·PNG 읽힘), 틀린 줄 표   9 스캐너: 위 PNG 올리기 → 읽힘·종류·경고·자동으로 안 열림
10 연출: 도장·스티커 떼어짐·루멘랩 칸(그 순간에만, 끝나면 그리기 0), 이펙트 끔·동작 줄이기면 색만   11 느린 기기(CPU 4배): 한 글자 → QR 다시 그리기 ms
12 스크린샷(1366·390, 밝게·어둡게, 두 언어)
광고 요청은 정규식으로 막는다. 브라우저는 하나만 띄운다.
"""
import sys
sys.dont_write_bytecode = True
import io
import json
import os
import random
import re
import statistics
import tempfile
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8471'
ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else None
ONLY = set(os.environ.get('SEC', '').split(',')) - {''}
fails, passed, notes = [], 0, []
TMP = Path(tempfile.mkdtemp(prefix='qr-e2e-'))
# 가이드(/guide/·/ko/guide/)는 2026-10-29 lumenlab.page/guides/qr/ 로 옮겨 이 사이트 페이지가 아니다(301, sitemap 에도 없음)
PAGES = ['/', '/wifi/', '/vcard/', '/bulk/', '/scan/', '/about/', '/privacy/', '/ko/', '/ko/wifi/', '/ko/vcard/', '/ko/bulk/', '/ko/scan/', '/ko/about/', '/ko/privacy/', '/nope/', '/ko/nope/']
_SM = (ROOT / 'sitemap.xml').read_text()
PAGES = [p for p in PAGES if 'nope' in p or 'https://qr.lumenlab.page' + p + '<' in _SM]


def ok(cond, msg):
    global passed
    if cond:
        passed += 1
    else:
        fails.append(msg)
        print('  실패', msg[:240])


def sec(n):
    if ONLY and str(n) not in ONLY:
        return False
    print(f'{n}.', {1: '모든 페이지', 2: '가로 넘침', 3: '누를 것 44px·언어 띠', 4: '화면 밀림', 5: '만들기·판독', 6: '찍힘 확인 판정', 7: '저장', 8: '대량', 9: '스캐너', 10: '연출', 11: '느린 기기', 12: '스크린샷', 13: '판정 vs zxing', 14: '2단계 화면(저장 막대·틀 글자·크기·예시·스캐너)'}[n])
    return True


def zx(img_bytes):
    import zxingcpp
    from PIL import Image
    im = Image.open(io.BytesIO(img_bytes))
    if im.mode in ('RGBA', 'LA', 'P'):
        bg = Image.new('RGB', im.size, 'white')
        bg.paste(im.convert('RGBA'), mask=im.convert('RGBA').split()[3])
        im = bg
    return [x.text for x in zxingcpp.read_barcodes(im, formats=zxingcpp.BarcodeFormat.QRCode)]


class Env:
    def __init__(self, b):
        self.b = b

    def ctx(self, w=1366, h=900, lang='en', dark=False, reduced=False, touch=False, mobile=False, dpr=1, fx=None, store=None):
        c = self.b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr, is_mobile=mobile, has_touch=touch or mobile, locale='ko-KR' if lang == 'ko' else 'en-US',
                               reduced_motion='reduce' if reduced else 'no-preference', accept_downloads=True)
        st = {}
        if dark:
            st['theme'] = 'dark'
        if fx is not None:
            st['fx'] = fx
        init = f"try{{localStorage.setItem('staycode.lang','1');" + (f"localStorage.setItem('staycode.set',{json.dumps(json.dumps(st))});" if st else '') + "}catch(e){}"
        if store:
            init += ''.join(f"try{{localStorage.setItem({json.dumps(k)},{json.dumps(json.dumps(v))})}}catch(e){{}}" for k, v in store.items())
        c.add_init_script(init)
        c.route(re.compile(r'googlesyndication|doubleclick|adservice|fundingchoices'), lambda r: r.abort())
        return c

    def page(self, c, path, wait=600):
        pg = c.new_page()
        pg._errs = []
        pg.on('pageerror', lambda e: pg._errs.append(str(e)))
        pg.on('console', lambda m: pg._errs.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text and not (path.endswith('nope/') and '404' in m.text) else None)
        pg.goto(BASE + path, wait_until='load')
        pg.wait_for_timeout(wait)
        return pg


def wait_verdict(pg, timeout=9000):
    pg.wait_for_function("document.getElementById('stamp').getAttribute('data-s') !== 'wait'", timeout=timeout)
    pg.wait_for_timeout(50)
    return pg.evaluate("({s: document.getElementById('stamp').getAttribute('data-s'), main: document.getElementById('v-main').textContent, list: [...document.querySelectorAll('#v-list li')].map(l => l.textContent), v: window.__verdict})")


def png_of(pg, px=600, under=None):
    """화면이 가진 장면을 저장할 때와 같은 함수(QRR.toCanvas)로 그린 PNG 바이트."""
    import base64
    d = pg.evaluate(f"(() => {{ const c = document.createElement('canvas'); QRR.toCanvas(window.__qr.cur().scene, c, {px}, window.__qr.imgs, {json.dumps(under)}); return c.toDataURL('image/png'); }})()")
    return base64.b64decode(d.split(',', 1)[1])


# ---------- 1 ----------
def all_pages(env):
    for lang in ('en', 'ko'):
        c = env.ctx(lang=lang)
        for path in PAGES:
            pg = env.page(c, path)
            r = pg.evaluate('''() => ({ broken: [...document.images].filter(i => i.getAttribute('src') && i.complete && i.naturalWidth === 0).length,
              dup: (() => { const s = {}, d = []; document.querySelectorAll('[id]').forEach(e => { if (s[e.id]) d.push(e.id); s[e.id] = 1; }); return d; })(),
              h1: [...document.querySelectorAll('h1')].filter(h => h.getClientRects().length).length, lang: document.documentElement.lang,
              ads: !!document.querySelector('script[src*="adsbygoogle"]') })''')
            ok(not pg._errs, f'{path} 콘솔 오류 {pg._errs[:3]}')
            ok(r['broken'] == 0, f'{path} 깨진 그림 {r["broken"]}')
            ok(not r['dup'], f'{path} 같은 id {r["dup"]}')
            ok(r['h1'] == 1, f'{path} 보이는 h1 {r["h1"]}개')
            want_ko = path.startswith('/ko')
            ok(r['lang'] == ('ko' if want_ko else 'en'), f'{path} html lang {r["lang"]}')
            pg.close()
        c.close()
    # 동작 줄이기: 내용이 다 보이는지(숨은 채 남은 요소 0)
    c = env.ctx(reduced=True)
    for path in ('/', '/ko/', '/ko/scan/', '/bulk/'):
        pg = env.page(c, path)
        pg.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        pg.wait_for_timeout(500)
        hid = pg.evaluate('''() => [...document.querySelectorAll('main *, footer *')].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e);
            return r.width > 4 && r.height > 4 && (parseFloat(s.opacity) < 0.2) && !['INPUT'].includes(e.tagName) && !e.closest('.sweep,.curl,.lift,.stamp,.toast,.savebar,.sticker.is-ex,.sticker.is-bad'); }).map(e => e.className || e.tagName).slice(0, 5)''')
        ok(not hid, f'{path} 동작 줄이기에서 안 보이는 것 {hid}')
        cls = pg.evaluate('document.documentElement.className')
        ok('fx0' in cls and 'rm' in cls, f'{path} 동작 줄이기면 fx0 {cls}')
        pg.close()
    c.close()


# ---------- 2 ----------
def overflow(env):
    for lang in ('en', 'ko'):
        c = env.ctx(lang=lang)
        pages = [p for p in PAGES if p.startswith('/ko') == (lang == 'ko')]
        pg = c.new_page()
        bad = []
        for path in pages:
            pg.goto(BASE + path, wait_until='load')
            pg.wait_for_timeout(150)
            for w in range(320, 1441, 20):
                pg.set_viewport_size({'width': w, 'height': 900})
                hs = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                if hs > 0:
                    bad.append(f'{path}@{w}:{hs}')
            # 단추 글자가 단추 밖으로 나가거나 세로로 서지 않는지(320px)
            pg.set_viewport_size({'width': 320, 'height': 900})
            sq = pg.evaluate('''() => [...document.querySelectorAll('.btn, .choice button, .types button, .tabs button')].filter(b => b.getClientRects().length && (b.scrollWidth > b.clientWidth + 2)).map(b => b.textContent.trim().slice(0, 20))''')
            ok(not sq, f'{path} 320px 단추 글자가 넘침 {sq[:4]}')
        ok(not bad, f'{lang} 가로 넘침 {bad[:10]}')
        print(f'  {lang}: {len(pages)}쪽 × {len(range(320, 1441, 20))}폭, 넘침 {len(bad)}')
        c.close()


# ---------- 3 ----------
def targets(env):
    for lang in ('en', 'ko'):
        c = env.ctx(w=390, h=844, lang=lang, touch=True, mobile=True, dpr=2)
        for path in [p for p in PAGES if p.startswith('/ko') == (lang == 'ko') and 'nope' not in p]:
            pg = env.page(c, path)
            # 접힌 칸도 열어서 잰다
            pg.evaluate("document.querySelectorAll('details').forEach(d => d.open = true); document.querySelectorAll('.tp').forEach(t => t.hidden = false)")
            pg.wait_for_timeout(100)
            small = pg.evaluate('''() => [...document.querySelectorAll('a, button, select, input:not([type=hidden]), summary, [role=tab], label.btn')].filter(e => {
                const r = e.getBoundingClientRect(); if (!r.width || !r.height || getComputedStyle(e).visibility === 'hidden') return false;
                if (e.closest('.sr') || e.classList.contains('sr') || e.closest('.savebar:not(.on)') || e.closest('[aria-hidden=true]')) return false;
                if (e.tagName === 'A' && e.closest('p, li, dd') && !e.classList.contains('btn') && !e.closest('.cards, .foot-links, .crumbs, .more-link, .nav')) return false;   /* 문단 속 링크 */
                if (e.type === 'checkbox' || e.type === 'radio') { const l = e.closest('label'); if (l) { const b = l.getBoundingClientRect(); return b.height < 44; } }
                if (e.type === 'color') return r.height < 44 || r.width < 44;
                return r.height < 44 || r.width < 24; }).map(e => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)).slice(0, 8)''')
            ok(not small, f'{path} 44px 안 되는 누를 것 {small}')
            pg.close()
        c.close()
    # 언어 띠: 브라우저 언어가 다른 판에서 뜨고, 누를 것을 덮지 않음
    for w in (320, 390, 768, 1366):
        c = env.b.new_context(viewport={'width': w, 'height': 800}, locale='ko-KR')
        c.route(re.compile(r'googlesyndication|doubleclick'), lambda r: r.abort())
        pg = c.new_page()
        pg.goto(BASE + '/', wait_until='load')
        pg.wait_for_timeout(400)
        r = pg.evaluate('''() => { const bar = document.querySelector('.langbar'); if (!bar) return { none: true }; if (bar.classList.contains('tuck')) return { hit: [] }; const b = bar.getBoundingClientRect();
            const hit = [...document.querySelectorAll('a, button, input, select, textarea, summary, [role=tab], [role=radio]')].filter(e => !bar.contains(e) && e.checkVisibility() && !e.closest('.savebar:not(.on), .sr')).filter(e => { const r = e.getBoundingClientRect();
              return r.width && r.height && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top; }).map(e => e.textContent.trim().slice(0, 15) || e.id);
            return { hit, top: b.top, bottom: b.bottom }; }''')
        ok(not r.get('none'), f'언어 띠가 안 뜸 {w}px')
        ok(not r.get('hit'), f'언어 띠가 덮는 누를 것 {w}px {r.get("hit")}')
        shown = 0
        for y in range(0, 4000, 300):
            pg.evaluate(f'window.scrollTo(0, {y})')
            pg.wait_for_timeout(120)
            r = pg.evaluate('''() => { const bar = document.querySelector('.langbar'); if (bar.classList.contains('tuck')) return { hit: [], t: 1 }; const b = bar.getBoundingClientRect();
              return { hit: [...document.querySelectorAll('a, button, input, select, textarea, summary, [role=tab], [role=radio]')].filter(e => !bar.contains(e) && e.checkVisibility() && !e.closest('.savebar:not(.on), .sr')).filter(e => { const r = e.getBoundingClientRect();
                return r.width && r.height && r.left < b.right - 2 && r.right > b.left + 2 && r.top < b.bottom - 2 && r.bottom > b.top + 2; }).map(e => e.textContent.trim().slice(0, 15) || e.id) }; }''')
            shown += not r.get('t')
            ok(not r['hit'], f'언어 띠가 덮는 누를 것 {w}px y={y} {r["hit"]}')
        ok(shown > 0, f'언어 띠가 한 번도 안 보임 {w}px')
        c.close()


# ---------- 4 ----------
CLS_JS = '''() => { window.__cls = 0; window.__sh = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__sh.push((e.sources || []).map(s => s.node && (s.node.id || s.node.className || s.node.nodeName)).join(',')); } }).observe({ type: 'layout-shift', buffered: true }); }'''


def cls(env):
    for w, h in ((390, 844), (1366, 900)):
        for lang in ('en', 'ko'):
            c = env.ctx(w=w, h=h, lang=lang)
            # 응답을 늦춰서(스크립트 1.5초 늦게)
            c.route(re.compile(r'/assets/.*\.js'), lambda r: (__import__('time').sleep(0.3), r.continue_()))
            for path in [p for p in PAGES if p.startswith('/ko') == (lang == 'ko')]:
                pg = c.new_page()
                pg.add_init_script('(' + CLS_JS + ')()')
                pg.goto(BASE + path, wait_until='load')
                pg.wait_for_timeout(1800)
                v = pg.evaluate('window.__cls')
                ok(v < 0.02, f'{path} {w}px 처음 열 때 CLS {v:.4f} {pg.evaluate("window.__sh")[:3]}')
                pg.close()
            c.close()
    # 누른 뒤: 내용을 넣고 0.5초 뒤 찍힘 확인이 뜰 때 밀림이 없어야 한다(판정 칸 자리는 미리 잡혀 있음)
    for w in (390, 1366):
        c = env.ctx(w=w, h=844)
        pg = c.new_page()
        pg.goto(BASE + '/', wait_until='load')
        pg.wait_for_timeout(500)
        pg.evaluate('(' + CLS_JS + ')()')
        pg.fill('#f-url-url', 'example.com/menu')
        pg.wait_for_timeout(2500)
        v = pg.evaluate('window.__cls')
        ok(v < 0.02, f'누른 뒤 {w}px CLS {v:.4f} {pg.evaluate("window.__sh")[:4]}')
        pg.close()
        c.close()
    # 저장된 설정·최근 QR 이 있을 때
    rec = [{'v': 2, 't': 'url', 'data': 'https://example.com', 'show': 'example.com', 'f': {'url': 'example.com'}, 'style': {}, 'ecl': 'M', 'margin': 4, 'at': 1}]
    c = env.ctx(w=390, h=844, dark=True, fx=1, store={'staycode.recent': rec})
    pg = c.new_page()
    pg.add_init_script('(' + CLS_JS + ')()')
    pg.goto(BASE + '/', wait_until='load')
    pg.wait_for_timeout(1500)
    v = pg.evaluate('window.__cls')
    ok(v < 0.02, f'저장된 설정·최근 QR 있을 때 CLS {v:.4f} {pg.evaluate("window.__sh")[:3]}')
    c.close()


# ---------- 5 ----------
INPUTS = [
    ('url', {'url': 'example.com/menu'}, 'https://example.com/menu'),
    ('text', {'text': '안녕하세요\n오래QR 😀'}, '안녕하세요\n오래QR 😀'),
    ('wifi', {'ssid': 'Cafe;Guest', 'password': 'pa:ss,word1'}, 'WIFI:T:WPA;S:Cafe\\;Guest;P:pa\\:ss\\,word1;;'),
    ('email', {'to': 'hi@example.com', 'subject': 'Hello there'}, 'mailto:hi@example.com?subject=Hello%20there'),
    ('sms', {'phone': '010-1234-5678', 'message': '주문할게요'}, 'SMSTO:01012345678:주문할게요'),
    ('tel', {'phone': '+82 2-123-4567'}, 'tel:+8221234567'),
    ('geo', {'lat': '37.5665', 'lng': '126.978'}, 'https://www.google.com/maps/search/?api=1&query=37.5665,126.978'),
    ('whatsapp', {'phone': '+1 555 123 4567', 'message': 'hi'}, 'https://wa.me/15551234567?text=hi'),
]


def fill(pg, t, f):
    pg.click(f'#types [data-t="{t}"]')
    for k, v in f.items():
        pg.fill(f'#f-{t}-{k}', v)


def make(env):
    c = env.ctx()
    pg = env.page(c, '/')
    for t, f, exp in INPUTS:
        fill(pg, t, f)
        v = wait_verdict(pg)
        data = pg.evaluate('window.__qr.cur().r && window.__qr.cur().r.data')
        ok(data == exp, f'make {t} 내용 {data!r} != {exp!r}')
        ok(v['s'] == 'pass', f'make {t} 찍힘 확인 {v["s"]} {v["main"]}')
        got = zx(png_of(pg))
        ok(exp in got, f'make {t} 브라우저가 그린 PNG 를 zxing 이 못 읽음 {got}')
        for k in f:
            pg.fill(f'#f-{t}-{k}', '')
    # 연락처: 전화 둘
    pg.click('#types [data-t="vcard"]')
    pg.fill('#f-vcard-last', '홍'); pg.fill('#f-vcard-first', '길동'); pg.fill('#f-vcard-phones', '010-1111-2222')
    pg.click('#add-ph')
    pg.fill('#ph-list .ph-row:nth-of-type(2) .ph-num', '02-333-4444')
    v = wait_verdict(pg)
    data = pg.evaluate('window.__qr.cur().r.data')
    ok('TEL;TYPE=CELL,VOICE:01011112222' in data and 'TEL;TYPE=WORK,VOICE:023334444' in data and 'FN:홍길동' in data, f'make vcard 전화 둘 {data!r}')
    ok(v['s'] == 'pass' and data in zx(png_of(pg)), 'make vcard 찍힘')
    # 일정(하루 종일)
    pg.click('#types [data-t="event"]')
    pg.fill('#f-event-title', '가을 장터')
    pg.check('#f-event-allday')
    pg.fill('#f-event-start', '2026-10-24')
    v = wait_verdict(pg)
    data = pg.evaluate('window.__qr.cur().r.data')
    ok('DTSTART;VALUE=DATE:20261024' in data and 'DTEND;VALUE=DATE:20261025' in data and v['s'] == 'pass', f'make event 하루 종일 {data!r}')
    # 틀린 입력: 칸 바로 아래 알림, 쓴 것은 그대로
    pg.click('#types [data-t="url"]')
    pg.fill('#f-url-url', 'exa mple.com')
    pg.wait_for_timeout(100)
    r = pg.evaluate("({m: document.getElementById('m-url-url').textContent, v: document.getElementById('f-url-url').value, inv: document.getElementById('f-url-url').getAttribute('aria-invalid')})")
    ok(r['m'] and r['v'] == 'exa mple.com' and r['inv'] == 'true', f'make 틀린 주소 알림 {r}')
    # UTM
    pg.fill('#f-url-url', 'shop.example.com/a?x=1')
    pg.click('#utm summary')
    pg.check('#f-url-utm')
    pg.fill('#f-url-utm_campaign', 'fall')
    pg.wait_for_timeout(100)
    data = pg.evaluate('window.__qr.cur().r.data')
    ok(data == 'https://shop.example.com/a?x=1&utm_source=qr&utm_medium=print&utm_campaign=fall', f'make UTM {data}')
    # 너무 긴 글
    pg.click('#types [data-t="text"]')
    pg.fill('#f-text-text', '가' * 1200)
    pg.wait_for_timeout(100)
    ok('3' in pg.inner_text('#notes') and pg.evaluate('!window.__qr.cur().scene'), 'make 너무 긴 글 알림')
    # 촘촘함 알림(버전 10 이상)
    pg.fill('#f-text-text', 'x' * 300)
    pg.wait_for_timeout(100)
    ok(pg.inner_text('#notes').strip() != '', 'make 촘촘함 알림')
    pg.fill('#f-text-text', '')
    pg.close()
    c.close()
    # 꾸밈 세트 전부(두 언어) + 무작위 꾸밈(어둡게·투명 포함)을 브라우저가 그린 PNG 로
    rnd = random.Random(1014)
    total = good = 0
    for lang, dark in (('en', False), ('ko', True)):
        c = env.ctx(lang=lang, dark=dark)
        pg = env.page(c, '/ko/' if lang == 'ko' else '/')
        pg.fill('#f-url-url', 'https://qr.lumenlab.page/menu?table=7')
        pg.evaluate('window.__qr.loadGlyphs()')
        pg.wait_for_timeout(300)
        n = pg.evaluate("document.querySelectorAll('#presets .pre').length")
        ok(n >= 8, f'꾸밈 세트 {n}개')
        for i in range(n):
            pg.click(f'#presets .pre:nth-child({i + 1})')
            v = wait_verdict(pg)
            got = zx(png_of(pg))
            total += 1
            good += 'https://qr.lumenlab.page/menu?table=7' in got and v['s'] in ('pass', 'warn')
            ok('https://qr.lumenlab.page/menu?table=7' in got and v['s'] in ('pass', 'warn'), f'{lang} 꾸밈 세트 #{i + 1}: zxing {bool(got)}, 판정 {v["s"]}')
        R = pg.evaluate('({d: QRR.DOTS, eo: QRR.EYE_OUT, ei: QRR.EYE_IN, f: QRR.FRAMES})')
        for i in range(55):
            st = {'dots': rnd.choice(R['d']), 'eyeOuter': rnd.choice(R['eo']), 'eyeInner': rnd.choice(R['ei']), 'frame': rnd.choice(R['f']),
                  'fg': rnd.choice(['#111111', '#0f3d5e', '#4a2e1f', '#5b2a86', '#14532d']), 'grad': rnd.choice(['none', 'linear', 'radial']), 'fg2': rnd.choice(['#7a1f2b', '#0b5c56', '#222222']),
                  'transparent': rnd.random() < 0.25, 'frameText': rnd.choice(['SCAN ME', '메뉴 보기', '']), 'frameColor': '#1d1d1d'}
            pg.evaluate(f'(() => {{ window.__qr.applyStyle(Object.assign({{}}, QRPRE.BASE, {json.dumps(st)})); window.__qr.S.ecl = {json.dumps(rnd.choice("LMQH"))}; window.__qr.designChanged(); }})()')
            v = wait_verdict(pg)
            got = zx(png_of(pg))
            total += 1
            good += 'https://qr.lumenlab.page/menu?table=7' in got
            ok('https://qr.lumenlab.page/menu?table=7' in got, f'{lang} 무작위 꾸밈 #{i} zxing 못 읽음 {json.dumps(st, ensure_ascii=False)[:160]}')
            ok(v['s'] in ('pass', 'warn'), f'{lang} 무작위 꾸밈 #{i} 브라우저 판정 {v["s"]} ({v["main"]})')
        pg.close()
        c.close()
    notes.append(f'브라우저 PNG 판독: {good}/{total}')
    print(f'  브라우저가 그린 PNG: {good}/{total} 읽힘')


# ---------- 6 ----------
LOGO = 'data:image/svg+xml;base64,' + __import__('base64').b64encode(b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" rx="2" fill="#c2410c"/><circle cx="5" cy="5" r="3" fill="#fff"/></svg>').decode()


def verdicts(env):
    c = env.ctx()
    pg = env.page(c, '/')
    pg.fill('#f-url-url', 'https://example.com/check')

    def setst(st, ecl='M', margin=4, logo=None):
        pg.evaluate(f'''(async () => {{ const q = window.__qr; q.applyStyle(Object.assign({{}}, QRPRE.BASE, {json.dumps(st)})); q.S.ecl = {json.dumps(ecl)}; q.S.margin = {margin};
          q.S.logo = {('{src:' + json.dumps(logo[0]) + ',w:10,h:10,size:' + str(logo[1]) + ',clear:true,plate:false}') if logo else 'null'};
          {'await new Promise(r => { const i = new Image(); i.onload = () => { q.imgs[' + json.dumps(logo[0]) + '] = i; r(); }; i.src = ' + json.dumps(logo[0]) + '; });' if logo else ''}
          q.designChanged(); }})()''')
        return wait_verdict(pg)
    v = setst({})
    ok(v['s'] == 'pass' and not v['list'], f'판정 기본 = 통과 {v}')
    v = setst({'fg': '#9a9a9a'})
    ok(v['s'] == 'warn' and v['v']['main'] == 'read_warn' and any(':1' in x and '#9a9a9a' in x for x in v['list']), f'판정 대비 2.8:1 = 주의(숫자·두 색) {v}')
    ok('똑같아요' not in v['main'] and 'matches' not in v['main'], f'주의일 때 안심 문구 없음 {v["main"]}')
    v = setst({'fg': '#e53935', 'bg': '#43a047'})
    ok(v['s'] == 'fail' and v['v']['main'] == 'rule_fail', f'H2 빨강/초록 = 안 읽힘 {v}')
    v = setst({'frame': 'band', 'frameText': 'SCAN ME'}, margin=0)
    ok(pg.evaluate('window.__qr.cur().scene.qr.margin') >= 2 and v['s'] != 'pass' and v['v']['main'] != 'pass_', f'H1 틀+여백0 = 여백 늘림 + 안심 문구 없음 {v}')
    ok('https://example.com/check' in zx(png_of(pg)), 'H1 틀+여백0 저장 그림이 읽힘')
    v = setst({'grad': 'linear', 'fg': '#000000', 'fg2': '#ffffff'})
    ok(v['s'] != 'pass' and any('#ffffff' in x for x in v['list']), f'M1 그라데이션 = 가장 밝은 색으로 대비 {v}')
    v = setst({'fg': '#dddddd'})
    ok(v['s'] in ('warn', 'fail'), f'판정 대비 1.4:1 = 경고/실패 {v["s"]}')
    v = setst({'fg': '#ffffff', 'bg': '#111111'})
    ok(v['s'] == 'fail' and any(('밝아요' in x or 'lighter' in x) for x in v['list']), f'판정 반전 = 안 읽힘 {v}')
    v = setst({}, ecl='H', logo=(LOGO, 0.30))
    ok(v['s'] in ('warn', 'fail') and any(('smaller' in x or '줄여' in x) for x in v['list']), f'판정 큰 로고 = 경고(줄이기) {v}')
    v = setst({}, ecl='M', logo=(LOGO, 0.14))
    ok(v['s'] in ('warn', 'fail') and any('H' in x for x in v['list']), f'판정 로고 + M = H 권함 {v}')
    v = setst({}, ecl='H', logo=(LOGO, 0.16))
    ok(v['s'] == 'pass', f'판정 작은 로고 + H = 통과 {v}')
    v = setst({}, margin=0)
    ok(v['s'] in ('warn', 'fail') and any(('4' in x) for x in v['list']), f'판정 여백 0 = 경고 {v}')
    v = setst({'transparent': True})
    ok(v['s'] == 'pass' and v['list'], f'판정 투명 = 통과 + 안내 {v}')
    # 다음 행동까지 말하는지(실패 문구에 '보세요'·'Try')
    v = setst({'fg': '#eeeeee'}, ecl='L', logo=(LOGO, 0.34))
    ok(v['s'] == 'fail' and any(('보세요' in x or 'Try' in x or 'Make' in x) for x in v['list']), f'판정 실패 = 다음 행동 {v}')
    pg.close()
    c.close()


# ---------- 7 ----------
def downloads(env):
    import subprocess
    c = env.ctx()
    pg = env.page(c, '/')
    fill(pg, 'wifi', {'ssid': 'Cafe Guest', 'password': 'secret-pass-77'})
    wait_verdict(pg)
    exp = 'WIFI:T:WPA;S:Cafe Guest;P:secret-pass-77;;'
    got_files = {}
    for sel, kind in (('#dl-png', 'png'), ('[data-dl=jpg]', 'jpg'), ('[data-dl=svg]', 'svg'), ('[data-dl=pdf]', 'pdf'), ('[data-dl=eps]', 'eps')):
        with pg.expect_download() as d:
            pg.click(sel)
        p = TMP / d.value.suggested_filename
        d.value.save_as(p)
        got_files[kind] = p
        ok(p.name.startswith('qr-wifi-Cafe-Guest') and p.suffix == '.' + kind, f'저장 파일 이름 {p.name}')
    ok(exp in zx(got_files['png'].read_bytes()), '저장 PNG 읽힘')
    ok(exp in zx(got_files['jpg'].read_bytes()), '저장 JPG 읽힘')
    import cairosvg
    ok(exp in zx(cairosvg.svg2png(url=str(got_files['svg']), output_width=800, background_color='white')), '저장 SVG 읽힘')
    subprocess.run(['pdftoppm', '-r', '150', '-png', '-singlefile', str(got_files['pdf']), str(TMP / 'dl')], check=True)
    ok(exp in zx((TMP / 'dl.png').read_bytes()), '저장 PDF 읽힘')
    subprocess.run(['gs', '-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-sDEVICE=png16m', '-r300', '-dEPSCrop', f'-sOutputFile={TMP / "dle.png"}', str(got_files['eps'])], check=True)
    ok(exp in zx((TMP / 'dle.png').read_bytes()), '저장 EPS 읽힘')
    # PNG 크기 고르기·투명
    pg.select_option('#png-size', '2048')
    pg.click('#c-tr', force=True) if False else pg.evaluate("document.querySelector('#tab-color').click(); document.getElementById('c-tr').click()")
    pg.wait_for_timeout(200)
    with pg.expect_download() as d:
        pg.click('#dl-png')
    d.value.save_as(TMP / 'big.png')
    from PIL import Image
    im = Image.open(TMP / 'big.png')
    ok(max(im.size) == 2048 and im.mode == 'RGBA' and im.getpixel((2, 2))[3] == 0, f'PNG 2048·투명 {im.size} {im.mode} {im.getpixel((2, 2))}')
    ok(exp in zx((TMP / 'big.png').read_bytes()), 'PNG 2048 투명 읽힘')
    # 시트 PDF
    pg.evaluate("document.getElementById('sheet').open = true")
    pg.select_option('#sheet-cm', '3')
    with pg.expect_download() as d:
        pg.click('#sheet-pdf')
    d.value.save_as(TMP / 'sheet.pdf')
    subprocess.run(['pdftoppm', '-r', '200', '-png', '-singlefile', str(TMP / 'sheet.pdf'), str(TMP / 'sheet')], check=True)
    n = zx((TMP / 'sheet.png').read_bytes()).count(exp)
    shown = pg.inner_text('#sheet-n')
    ok(n > 10 and str(n) in shown, f'시트 PDF {n}장 읽힘, 화면 "{shown}"')
    # 바로 인쇄: 인쇄용 시트가 A4 한 장에 같은 수로 찍히는지(인쇄 화면을 PDF 로 받아 읽기)
    pg.evaluate("window.print = () => { window.__printed = 1 }")
    pg.click('#sheet-print')
    pg.wait_for_timeout(150)
    pg.emulate_media(media='print')
    pg.pdf(path=str(TMP / 'print.pdf'), format='A4', print_background=True, prefer_css_page_size=True)
    pg.emulate_media(media='screen')
    info = subprocess.run(['pdfinfo', str(TMP / 'print.pdf')], capture_output=True, text=True).stdout
    subprocess.run(['pdftoppm', '-r', '200', '-png', '-singlefile', str(TMP / 'print.pdf'), str(TMP / 'print')], check=True)
    pn = zx((TMP / 'print.png').read_bytes()).count(exp)
    ok(pg.evaluate('window.__printed') == 1 and 'Pages:           1' in info and pn == n, f'바로 인쇄: {pn}장 읽힘(시트 PDF {n}장), {info.count("Pages")}')
    pg.evaluate("document.documentElement.classList.remove('printing-sheet'); document.getElementById('print-sheet').innerHTML = ''")
    # 와이파이 비밀번호가 주소·저장소에 없음
    st = pg.evaluate('JSON.stringify(localStorage)')
    ok('secret-pass-77' not in st and 'secret-pass-77' not in pg.url, '비밀번호가 주소·localStorage 에 없음')
    ok('Cafe Guest' not in st, '와이파이 QR 은 최근 목록에 남지 않음(H3·M4)')
    ok(pg.evaluate("document.getElementById('recent').hidden"), '와이파이만 만들었으면 최근 칸이 없음')
    # 연락처도 남지 않음
    pg.click('#types [data-t="vcard"]')
    pg.fill('#f-vcard-first', 'Jamie'); pg.fill('#f-vcard-phones', '+1 555 123 4567')
    wait_verdict(pg)
    with pg.expect_download():
        pg.click('#dl-png')
    ok('5551234567' not in pg.evaluate('JSON.stringify(localStorage)'), '연락처 QR 은 최근 목록에 남지 않음')
    # 긴 주소: 전체가 남고, 다시 쓰면 같은 QR(H3)
    longu = 'https://smartstore.naver.com/cafe-orae/products/1234567890'
    pg.click('#types [data-t="url"]')
    pg.fill('#f-url-url', longu)
    wait_verdict(pg)
    with pg.expect_download():
        pg.click('#dl-png')
    ok(pg.evaluate("!document.getElementById('recent').hidden"), '최근에 만든 QR 칸이 보임')
    rec = pg.evaluate("JSON.parse(localStorage.getItem('staycode.recent'))")
    ok(rec and rec[0]['data'] == longu and len(rec[0]['show']) <= 40, f'최근 목록: 전체 저장·짧게 표시 {rec and rec[0]}')
    keys = pg.evaluate('Object.keys(localStorage)')
    ok(set(keys) <= {'staycode.set', 'staycode.styles', 'staycode.recent', 'staycode.lang'}, f'저장 키 {keys}')
    # 내 꾸밈 저장 → 새로 열어 쓰기
    pg.click('#presets .pre[data-p="cafe"]')
    pg.click('#tab-mine')
    pg.fill('#mine-name', '우리 가게')
    pg.click('#mine-save')
    ok('우리 가게' in pg.inner_text('#mine-list'), '내 꾸밈 저장')
    pg2 = env.page(c, '/')
    pg2.click('#tab-mine')
    pg2.click('#mine-list [data-use="0"]')
    ok(pg2.evaluate('window.__qr.S.style.frame') == 'band', '내 꾸밈 다시 쓰기')
    pg2.click('#mine-list [data-del="0"]')
    ok(pg2.evaluate("JSON.parse(localStorage.getItem('staycode.styles')).length") == 0, '내 꾸밈 지우기')
    # 최근 QR 다시 쓰기: 잘리지 않은 주소 → 같은 QR
    pg2.reload(); pg2.wait_for_timeout(600)
    pg2.click('#rec-list .rec')
    wait_verdict(pg2)
    ok(pg2.evaluate("document.getElementById('f-url-url').value") == longu and pg2.evaluate('window.__qr.cur().r.data') == longu, '최근 QR 다시 쓰기 = 전체 주소')
    ok(longu in zx(png_of(pg2)), '다시 쓴 QR 이 전체 주소로 읽힘')
    pg2.close()
    pg.close()
    c.close()


# ---------- 8 ----------
def bulk(env):
    c = env.ctx()
    pg = env.page(c, '/bulk/')
    lines = ['https://example.com/a', 'shop2,https://example.com/b', 'shop2,https://example.com/c', 'not a url here', 'example.org/d', '', 'javascript:alert(1)', '가게,https://example.com/한글']
    pg.fill('#b-list', '\n'.join(lines))
    pg.click('#b-go')
    pg.wait_for_function('window.__bulk', timeout=60000)
    r = pg.evaluate('window.__bulk')
    ok(r['made'] == 5 and r['skipped'] == 2, f'대량 만든 수·건너뜀 {r}')
    skip = pg.inner_text('#b-skips')
    ok('4' in skip and '7' in skip, f'대량 건너뛴 줄 번호 {skip}')
    with pg.expect_download() as d:
        pg.click('#b-zip')
    d.value.save_as(TMP / 'bulk.zip')
    z = zipfile.ZipFile(TMP / 'bulk.zip')
    names = z.namelist()
    ok(z.testzip() is None and len(names) == 5, f'ZIP {names}')
    ok('shop2.png' in names and 'shop2-2.png' in names and '가게.png' in names, f'ZIP 이름 {names}')
    want = {'https://example.com/a', 'https://example.com/b', 'https://example.com/c', 'https://example.org/d', 'https://example.com/한글'}
    got = set()
    for n in names:
        got |= set(zx(z.read(n)))
    ok(got == want, f'ZIP 각 PNG 읽힘 {got ^ want}')
    ok(pg.locator('#b-rows tr').count() == 5 and pg.locator('#b-rows .ok').count() == 5, '대량 표: 줄마다 통과')
    # H4: 글 종류는 쉼표로 나누지 않는다. 이름은 탭으로만
    pg.select_option('#b-type', 'text')
    pg.fill('#b-list', '안녕하세요, 반가워요\n가격: 1,000원\n메뉴\t오늘의 메뉴, 커피')
    ok('탭' in pg.inner_text('#b-rule') or 'tab' in pg.inner_text('#b-rule'), '대량 글 규칙이 화면에 보임')
    pg.evaluate('window.__bulk = null')
    pg.click('#b-go')
    pg.wait_for_function('window.__bulk', timeout=60000)
    with pg.expect_download() as d:
        pg.click('#b-zip')
    d.value.save_as(TMP / 'bulk-text.zip')
    z = zipfile.ZipFile(TMP / 'bulk-text.zip')
    got = set()
    for n_ in z.namelist():
        got |= set(zx(z.read(n_)))
    ok(got == {'안녕하세요, 반가워요', '가격: 1,000원', '오늘의 메뉴, 커피'}, f'대량 글 쉼표 그대로 {got}')
    ok('메뉴.png' in z.namelist(), f'대량 글 탭 앞 = 파일 이름 {z.namelist()}')
    # 제목줄이 있는 CSV 는 칸으로(따옴표 안 쉼표 그대로)
    pg.fill('#b-list', 'filename,content\nhello,"Hi, there"\n')
    pg.evaluate('window.__bulk = null')
    pg.click('#b-go')
    pg.wait_for_function('window.__bulk', timeout=60000)
    with pg.expect_download() as d:
        pg.click('#b-zip')
    d.value.save_as(TMP / 'bulk-csv.zip')
    z = zipfile.ZipFile(TMP / 'bulk-csv.zip')
    ok(z.namelist() == ['hello.png'] and zx(z.read('hello.png')) == ['Hi, there'], f'대량 글 CSV {z.namelist()}')
    pg.select_option('#b-type', 'url')
    # 와이파이 CSV + SVG
    pg.select_option('#b-type', 'wifi')
    pg.fill('#b-list', 'name,ssid,password,security,hidden\nlobby,Lobby Net,pw123456,WPA,\nopen,Guest Open,,nopass,\n,Hidden;Net,p:w,WPA,true')
    pg.check('input[name=bfmt][value=svg]')
    pg.evaluate('window.__bulk = null')
    pg.click('#b-go')
    pg.wait_for_function('window.__bulk', timeout=60000)
    r = pg.evaluate('window.__bulk')
    ok(r['made'] == 3 and r['skipped'] == 0, f'대량 와이파이 {r}')
    with pg.expect_download() as d:
        pg.click('#b-zip')
    d.value.save_as(TMP / 'bulk2.zip')
    z = zipfile.ZipFile(TMP / 'bulk2.zip')
    import cairosvg
    got = set()
    for n in z.namelist():
        got |= set(zx(cairosvg.svg2png(bytestring=z.read(n), output_width=700, background_color='white')))
    ok(got == {'WIFI:T:WPA;S:Lobby Net;P:pw123456;;', 'WIFI:T:nopass;S:Guest Open;;', 'WIFI:T:WPA;S:Hidden\\;Net;P:p\\:w;H:true;;'}, f'대량 와이파이 SVG {got}')
    # 한도
    pg.select_option('#b-type', 'url')
    pg.fill('#b-list', '\n'.join(f'https://e.com/{i}' for i in range(1003)))
    pg.wait_for_timeout(100)
    ok('1,003' in pg.inner_text('#b-count') and '1,000' in pg.inner_text('#b-count'), f'대량 한도 표시 {pg.inner_text("#b-count")}')
    ok('1,000' in pg.inner_text('#b-go'), f'1,000줄 넘으면 단추 글자 {pg.inner_text("#b-go")}')
    pg.close()
    c.close()


# ---------- 9 ----------
def scanner(env):
    import segno
    c = env.ctx()
    pg = env.page(c, '/scan/')
    opened = []
    pg.on('popup', lambda p: opened.append(p.url))
    cases = [('https://bit.ly/abc', 'url', ['short']), ('http://192.168.0.1/login', 'url', ['http', 'ip', 'words']), ('https://www.google.com@evil.example/', 'url', ['at']),
             ('WIFI:T:WPA;S:Cafe;P:secret99;;', 'wifi', []), ('BEGIN:VCARD\r\nVERSION:3.0\r\nFN:홍길동\r\nTEL:01012345678\r\nEND:VCARD', 'vcard', []), ('javascript:alert(1)', 'blocked', ['blocked'])]
    for text, kind, flags in cases:
        p = TMP / 'scan.png'
        segno.make(text, error='m', micro=False).save(str(p), scale=8, border=4)
        pg.set_input_files('#s-file', str(p))
        pg.wait_for_function('window.__scan && window.__scan.text === ' + json.dumps(text), timeout=8000)
        r = pg.evaluate("({t: document.getElementById('s-res').dataset.type, f: [...document.querySelectorAll('#s-flags li, .s-flags li')].map(l => l.dataset.f), host: (document.getElementById('s-host') || {}).textContent, open: !!document.getElementById('s-open')})")
        ok(r['t'] == kind and sorted(r['f']) == sorted(flags), f'스캐너 {text[:30]}: {r}')
        if text.startswith('https://www.google.com@'):
            ok(r['host'] == 'evil.example', f'스캐너 실제 도메인 크게 {r["host"]}')
        if kind == 'blocked':
            ok(not r['open'], '스캐너 javascript: 는 열기 단추 없음')
        if kind == 'wifi':
            ok('secret99' not in pg.inner_text('#s-res'), '스캐너 와이파이 비밀번호 가림')
            pg.click('#s-pwt')
            ok('secret99' in pg.inner_text('#s-res'), '스캐너 비밀번호 보기')
    # 만든 사이트의 PNG(브라우저가 그린 것)를 올려도 읽히는지
    pg2 = env.page(c, '/')
    pg2.click('#presets .pre[data-p="event"]')
    pg2.fill('#f-url-url', 'https://qr.lumenlab.page/ko/')
    wait_verdict(pg2)
    (TMP / 'made.png').write_bytes(png_of(pg2, 900))
    pg2.close()
    pg.set_input_files('#s-file', str(TMP / 'made.png'))
    pg.wait_for_function("window.__scan && window.__scan.text === 'https://qr.lumenlab.page/ko/'", timeout=8000)
    ok(True, '')
    pg.wait_for_timeout(300)
    ok(not opened, f'스캐너가 스스로 연 창 {opened}')
    pg.close()
    c.close()


# ---------- 10 ----------
def motion(env):
    c = env.ctx()
    pg = env.page(c, '/')
    ok(pg.evaluate("document.getAnimations().filter(a => a.playState === 'running').length") == 0, '연출 처음 열 때 도는 움직임 0')
    pg.fill('#f-url-url', 'example.com')
    v = wait_verdict(pg)
    ok(v['s'] == 'pass', '연출 판정 통과')
    pg.wait_for_timeout(40)
    pg.wait_for_timeout(600)
    ok(pg.evaluate("document.getAnimations().filter(a => a.playState === 'running').length") == 0, '연출 끝나면 그리기 0(도장 뒤)')
    # 저장 때 떼어짐: 도는 중에도 단추가 눌림
    pg.evaluate("window.__anims = []; const o = Element.prototype.animate; Element.prototype.animate = function (k, t) { window.__anims.push(this.id || String(this.className)); return o.call(this, k, t); }; 0")
    with pg.expect_download():
        pg.click('#dl-png')
    pg.wait_for_timeout(60)
    ok('sticker' in pg.evaluate('window.__anims'), f'연출 저장 때 스티커 떼어짐 {pg.evaluate("window.__anims")}')
    with pg.expect_download():
        pg.click('[data-dl=svg]')   # 떼어짐 도중에도 다른 저장이 된다
    pg.wait_for_timeout(900)
    ok(pg.evaluate("document.getAnimations().filter(a => a.playState === 'running').length") == 0, '연출 떼어짐 끝나면 그리기 0')
    # 루멘랩 칸
    pg.evaluate("document.getElementById('lumen').scrollIntoView({block: 'center'})")
    pg.wait_for_timeout(250)
    ok(pg.evaluate("document.getElementById('lumen').classList.contains('in')"), '루멘랩 칸 들어오면 연출')
    n0 = pg.evaluate("document.getElementById('lumen').getAnimations({subtree: true}).length")
    ok(n0 > 0, f'루멘랩 칸 움직임 {n0}')
    pg.wait_for_timeout(2300)
    ok(pg.evaluate("document.getElementById('lumen').getAnimations({subtree: true}).filter(a => a.playState === 'running').length") == 0, '루멘랩 칸 끝나면 그리기 0')
    href = pg.evaluate("document.getElementById('lumen').href")
    ok(href == 'https://lumenlab.page/en/', f'영어판 루멘랩 링크 {href}')
    pg.close()
    pk = env.page(c, '/ko/')
    ok(pk.evaluate("document.getElementById('lumen').href") == 'https://lumenlab.page/', '한국어판 루멘랩 링크')
    pk.close()
    c.close()
    # 이펙트 끔: 색만(움직임 없음)
    for kw in ({'fx': 0}, {'reduced': True}):
        c = env.ctx(**kw)
        pg = env.page(c, '/')
        pg.evaluate("window.__anims = []; const o = Element.prototype.animate; Element.prototype.animate = function (k, t) { window.__anims.push([this.id || String(this.className), JSON.stringify(k)]); return o.call(this, k, t); }; 0")
        pg.fill('#f-url-url', 'example.com')
        wait_verdict(pg)
        with pg.expect_download():
            pg.click('#dl-png')
        pg.wait_for_timeout(100)
        moves = [a for a in pg.evaluate('window.__anims') if 'transform' in a[1]]
        ok(not moves, f'{kw} 에서 움직이는 연출 {moves[:3]}')
        pg.evaluate("document.getElementById('lumen').scrollIntoView({block: 'center'})")
        pg.wait_for_timeout(300)
        ok(pg.evaluate("document.getElementById('lumen').classList.contains('lite')") or kw.get('reduced'), f'{kw} 루멘랩 칸 색만')
        ok(pg.evaluate("document.getElementById('lumen').getAnimations({subtree: true}).length") == 0, f'{kw} 루멘랩 칸 움직임 0')
        pg.close()
        c.close()


# ---------- 11 ----------
def slow(env):
    c = env.ctx(w=390, h=844, touch=True, mobile=True, dpr=3)
    pg = env.page(c, '/')
    cdp = c.new_cdp_session(pg)
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    pg.click('#f-url-url')
    pg.evaluate("window.__t = []; document.getElementById('f-url-url').addEventListener('input', () => { const t0 = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => window.__t.push([window.__lastRenderMs, performance.now() - t0]))); }, true)")
    text = 'https://example.com/menu/today?table=12'
    for ch in text:
        pg.keyboard.type(ch)
        pg.wait_for_timeout(120)
    pg.wait_for_timeout(400)
    t = pg.evaluate('window.__t')
    render = [x[0] for x in t if x[0] is not None]
    frame = [x[1] for x in t]
    med_r, p90_r = statistics.median(render), sorted(render)[int(len(render) * 0.9)]
    med_f = statistics.median(frame)
    notes.append(f'느린 기기(CPU 4배, 390px dpr3): 한 글자 → QR 다시 그리기 가운데값 {med_r:.1f}ms · p90 {p90_r:.1f}ms · 화면에 나오기까지(rAF 두 번) 가운데값 {med_f:.1f}ms, {len(t)}글자')
    print('  ' + notes[-1])
    ok(med_r < 50, f'느린 기기 다시 그리기 가운데값 {med_r:.1f}ms (목표 50ms 안팎)')
    # 로고·틀·그라데이션이 있는 무거운 꾸밈에서도
    pg.click('#presets .pre[data-p="event"]')
    pg.wait_for_timeout(500)
    pg.click('#f-url-url')
    pg.keyboard.press('End')
    pg.evaluate('window.__t = []')
    for ch in 'abcdefghij':
        pg.keyboard.type(ch)
        pg.wait_for_timeout(120)
    pg.wait_for_timeout(400)
    t = pg.evaluate('window.__t')
    render = [x[0] for x in t]
    notes.append(f'느린 기기 + 점 모양(점)·그라데이션·말풍선 틀: 가운데값 {statistics.median(render):.1f}ms')
    print('  ' + notes[-1])
    c.close()


# ---------- 12 ----------
def shots(env):
    out = OUT or (ROOT / '_dev' / 'shots')
    out.mkdir(parents=True, exist_ok=True)
    for lang, base in (('en', '/'), ('ko', '/ko/')):
        for dark in (False, True):
            for w, h in ((1366, 900), (390, 844)):
                c = env.ctx(w=w, h=h, lang=lang, dark=dark, reduced=True)
                for path in ('', 'wifi/', 'bulk/', 'scan/', 'privacy/'):
                    if path not in ('',) and (dark or w == 1366) and path != 'scan/':
                        continue
                    pg = env.page(c, base + path)
                    if path in ('', 'wifi/'):
                        pg.evaluate('window.__qr.loadGlyphs()')
                        pg.wait_for_function('window.__qr && document.querySelector("#presets .pre-i svg")', timeout=8000)
                    if path == '':
                        pg.fill('#f-url-url', 'qr.lumenlab.page/ko/' if lang == 'ko' else 'qr.lumenlab.page')
                        pg.click('#presets .pre[data-p="cafe"]')
                        pg.wait_for_timeout(300)
                        wait_verdict(pg)
                    if path == 'wifi/':
                        pg.fill('#f-wifi-ssid', 'Cafe Guest')
                        pg.fill('#f-wifi-password', 'hello2026')
                        pg.click('#presets .pre[data-p="wifi"]')
                        pg.wait_for_timeout(300)
                        wait_verdict(pg)
                    pg.wait_for_timeout(400)
                    name = f'{lang}-{(path or "make").strip("/")}-{w}-{"dark" if dark else "light"}.png'
                    pg.screenshot(path=str(out / name), full_page=True)
                    if path == '' and w == 390:
                        pg.screenshot(path=str(out / name.replace('.png', '-first.png')))
                    pg.close()
                c.close()
    print('  스크린샷 →', out)


# ---------- 13 ----------
EVAL_CASES = [   # 제3자 평가(2026-10-14)의 사례 전부 + 비슷한 조합. (이름, 꾸밈, 오류 복원, 여백, 로고)
    ('H1 아래 띠 여백0', {'frame': 'band', 'frameText': 'SCAN ME'}, 'M', 0, None), ('H1 위 띠 여백0', {'frame': 'top', 'frameText': 'SCAN ME'}, 'M', 0, None),
    ('H1 알약 여백0', {'frame': 'pill', 'frameText': 'SCAN ME'}, 'M', 0, None), ('H1 말풍선 여백0', {'frame': 'bubble', 'frameText': 'SCAN ME'}, 'M', 0, None),
    ('H1 입장권 여백0', {'frame': 'ticket', 'frameText': 'SCAN ME'}, 'M', 0, None), ('H1 꼬리표 여백0', {'frame': 'tag', 'frameText': 'SCAN ME'}, 'M', 0, None),
    ('동그라미 여백0', {'frame': 'circle', 'frameText': 'SCAN ME'}, 'M', 0, None), ('휴대폰 여백0', {'frame': 'phone', 'frameText': 'SCAN ME'}, 'M', 0, None),
    ('모서리 여백0', {'frame': 'corners', 'frameText': 'SCAN ME'}, 'M', 0, None), ('아래 띠 여백1', {'frame': 'band', 'frameText': 'SCAN ME'}, 'M', 1, None),
    ('H2 빨강/초록', {'fg': '#e53935', 'bg': '#43a047'}, 'M', 4, None),
    ('M1a 점+동그라미+여백2 L', {'dots': 'dots', 'eyeInner': 'circle'}, 'L', 2, None), ('M1a 점+동그라미+여백2 M', {'dots': 'dots', 'eyeInner': 'circle'}, 'M', 2, None),
    ('M1b 선 그라데이션 검정→흰', {'grad': 'linear', 'fg': '#000000', 'fg2': '#ffffff'}, 'M', 4, None),
    ('M1c 잎+원 파랑→청록', {'dots': 'leaf', 'grad': 'radial', 'fg': '#1e88e5', 'fg2': '#26a69a'}, 'M', 4, None),
    ('M1d 노랑 점', {'fg': '#ffeb3b'}, 'M', 4, None), ('옅은 점 #d8d8d8', {'fg': '#d8d8d8'}, 'M', 4, None), ('회색 점 #9a9a9a', {'fg': '#9a9a9a'}, 'M', 4, None),
    ('저대비 #7a7a7a', {'fg': '#7a7a7a'}, 'M', 4, None), ('저대비 #a0a0a0', {'fg': '#a0a0a0'}, 'M', 4, None),
    ('흰 점/어두운 바탕', {'fg': '#ffffff', 'bg': '#111111'}, 'M', 4, None), ('네이비 바탕/노랑 점', {'fg': '#ffeb3b', 'bg': '#1a237e'}, 'M', 4, None),
    ('선 그라데이션 검정→옅은 회색', {'grad': 'linear', 'fg': '#000000', 'fg2': '#cccccc'}, 'M', 4, None), ('원 검정→#bbb', {'grad': 'radial', 'fg': '#000000', 'fg2': '#bbbbbb'}, 'M', 4, None),
    ('눈 색 #f0f0f0', {'eyeColor': True, 'eyeOut': '#f0f0f0', 'eyeIn': '#f0f0f0'}, 'M', 4, None), ('눈 안만 #dddddd', {'eyeColor': True, 'eyeOut': '#111111', 'eyeIn': '#dddddd'}, 'M', 4, None),
    ('갈색/베이지 4.17', {'fg': '#795548', 'bg': '#d7ccc8'}, 'M', 4, None),
    ('로고 30% H', {}, 'H', 4, 0.30), ('로고 30% L', {}, 'L', 4, 0.30), ('로고 30% L 회색', {'fg': '#9a9a9a'}, 'L', 4, 0.30), ('로고 16% H', {}, 'H', 4, 0.16),
    ('여백0 틀 없음', {}, 'M', 0, None), ('가로 줄 여백0 투명', {'dots': 'hbar', 'transparent': True}, 'M', 0, None),
    ('투명만', {'transparent': True}, 'M', 4, None), ('투명 + 아래 띠', {'transparent': True, 'frame': 'band', 'frameText': 'SCAN ME'}, 'M', 4, None),
    ('투명 + 흰 점', {'transparent': True, 'fg': '#ffffff'}, 'M', 4, None),
    ('다이아+H', {'dots': 'diamond', 'eyeInner': 'diamond'}, 'H', 4, None), ('세로 줄 L', {'dots': 'vbar'}, 'L', 4, None),
]

SET_JS = """async (a) => { const q = window.__qr; q.applyStyle(Object.assign({}, QRPRE.BASE, a.st)); q.S.ecl = a.ecl; q.S.margin = a.margin;
  if (a.logo) { q.S.logo = {src: a.src, w: 10, h: 10, size: a.logo, clear: true, plate: false}; await new Promise(r => { const i = new Image(); i.onload = () => { q.imgs[a.src] = i; r(); }; i.src = a.src; }); } else q.S.logo = null;
  await q.needChunks(q.S.style.frameText || ''); q.designChanged(); }"""


def calib(env):
    import cairosvg
    import zxingcpp
    from PIL import Image
    exp = 'https://smartstore.naver.com/cafe-orae/products/1234567890'
    c = env.ctx()
    pg = env.page(c, '/')
    pg.fill('#f-url-url', exp)
    wait_verdict(pg)
    rnd = random.Random(777)
    R = pg.evaluate('({d: QRR.DOTS, eo: QRR.EYE_OUT, ei: QRR.EYE_IN, f: QRR.FRAMES})')
    cases = list(EVAL_CASES)
    pal = ['#111111', '#0f3d5e', '#4a2e1f', '#5b2a86', '#e53935', '#9a9a9a', '#ffeb3b', '#43a047', '#1e88e5', '#cccccc']
    for i in range(110):   # 무작위: 색이 엉망인 것까지
        st = {'dots': rnd.choice(R['d']), 'eyeOuter': rnd.choice(R['eo']), 'eyeInner': rnd.choice(R['ei']), 'frame': rnd.choice(R['f']), 'frameText': rnd.choice(['SCAN ME', '메뉴 보기', '']),
              'fg': rnd.choice(pal), 'grad': rnd.choice(['none', 'none', 'linear', 'radial']), 'fg2': rnd.choice(pal), 'bg': rnd.choice(['#ffffff', '#ffffff', '#fffaf2', '#43a047', '#1a237e', '#eeeeee']),
              'transparent': rnd.random() < 0.15, 'eyeColor': rnd.random() < 0.2, 'eyeOut': rnd.choice(pal), 'eyeIn': rnd.choice(pal), 'frameColor': rnd.choice(['#1d1d1d', '#5b2a86'])}
        cases.append((f'무작위 {i}', st, rnd.choice('LMQH'), rnd.choice([0, 1, 2, 4, 4, 4]), rnd.choice([None, None, None, 0.16, 0.24, 0.30])))
    tally = {'pass': [0, 0], 'warn': [0, 0], 'fail': [0, 0], 'none': [0, 0]}
    bad_pass, rows = [], []

    def strict(img):
        if img.mode != 'RGB':
            bg = Image.new('RGB', img.size, 'white')
            bg.paste(img.convert('RGBA'), mask=img.convert('RGBA').split()[3])
            img = bg
        return exp in [x.text for x in zxingcpp.read_barcodes(img, formats=zxingcpp.BarcodeFormat.QRCode, try_invert=False)]
    for name, st, ecl, margin, logo in cases:
        pg.evaluate(SET_JS, {'st': st, 'ecl': ecl, 'margin': margin, 'logo': logo, 'src': LOGO})
        v = wait_verdict(pg, timeout=15000)
        png = png_of(pg, 1024)
        svg = pg.evaluate("QRR.toSVG(window.__qr.cur().scene, {px: 1000})")
        okp = strict(Image.open(io.BytesIO(png)))
        oks = strict(Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=900, background_color='white'))))
        zx_ok = okp and oks
        s_ = v['s']
        main = (v['v'] or {}).get('main', '')
        tally[s_][0 if zx_ok else 1] += 1
        if s_ == 'pass' and not zx_ok:
            bad_pass.append(name)
        elif main == 'pass_' and not zx_ok:
            bad_pass.append(name + '(안심 문구)')
        rows.append([name, s_, main, zx_ok])
        if name.startswith(('H1', 'H2')):
            ok(s_ != 'pass' and main != 'pass_', f'{name}: 판정 {s_} {main}')
            ok(zx_ok or s_ == 'fail', f'{name}: zxing 실패인데 판정이 {s_}')
        if name.startswith('M1'):
            ok(not (main == 'fail' and zx_ok), f'{name}: zxing 은 읽는데 판독 실패로 안 읽힘')
    ok(not bad_pass, f'판정이 통과(또는 안심 문구)인데 zxing 이 못 읽음: {bad_pass}')
    n = len(cases)
    fr = tally['fail'][0]
    line = (f"판정 vs zxing(반전 없이, PNG·SVG 둘 다) {n}개: 통과 {sum(tally['pass'])}(zxing 실패 {tally['pass'][1]}) · 주의 {sum(tally['warn'])}(zxing 실패 {tally['warn'][1]}) · "
            f"안 읽힘 {sum(tally['fail'])}(zxing 성공 {fr}, {100 * fr / max(1, sum(tally['fail'])):.0f}%) · 확인 못 함 {sum(tally['none'])}")
    notes.append(line)
    print('  ' + line)
    (ROOT / '_dev' / 'shots' / 'calib.json').write_text(json.dumps(rows, ensure_ascii=False, indent=0), encoding='utf-8')
    pg.close()
    c.close()


# ---------- 14 ----------
def phase2_ui(env):
    # M2: 휴대폰에서 미리보기·판정 글·원래 저장 단추가 보이는 동안 아래 저장 막대는 숨고, 꾸미기로 내려가면 나온다. 판정 글을 덮지 않는다
    for lang in ('en', 'ko'):
        c = env.ctx(w=390, h=844, lang=lang, touch=True, mobile=True, dpr=2)
        pg = env.page(c, '/ko/' if lang == 'ko' else '/')
        pg.fill('#f-url-url', 'example.com/menu')
        wait_verdict(pg)
        bad = []
        for y in range(0, 2600, 100):
            pg.evaluate(f'window.scrollTo(0, {y})')
            pg.wait_for_timeout(120)
            r = pg.evaluate("""() => { const sb = document.getElementById('savebar'), on = sb.classList.contains('on'), b = sb.getBoundingClientRect();
              const vis = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
              const cover = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return on && r.bottom > b.top && r.top < b.bottom && r.height > 0; };
              return { on, saveVis: vis('dl-png'), cover: cover('v-main') || cover('go') || cover('dl-png') }; }""")
            if r['on'] and r['saveVis']:
                bad.append(f'y{y}:둘 다')
            if r['cover']:
                bad.append(f'y{y}:덮음')
        ok(not bad, f'{lang} 저장 막대 {bad[:6]}')
        pg.evaluate("document.getElementById('tp-shape').scrollIntoView()")
        pg.wait_for_timeout(300)
        ok(pg.evaluate("document.getElementById('savebar').classList.contains('on')"), f'{lang} 꾸미기에서는 저장 막대가 나옴')
        pg.close()
        c.close()
    # M5: 영어 틀 문구 Café·Niño·€ 가 그려지고, 그릴 수 없는 글자는 입력 즉시 알림
    c = env.ctx()
    pg = env.page(c, '/')
    pg.fill('#f-url-url', 'example.com')
    pg.click('#tab-frame')
    pg.click('.choice[data-g="frame"] button[data-v="band"]')
    pg.fill('#ft-text', 'Café Niño €5')
    pg.wait_for_timeout(1200)
    miss = pg.evaluate('window.__qr.cur().scene.textMissing')
    ok(miss == [] and pg.inner_text('#ft-msg') == '', f'틀 문구 라틴 확장 {miss} / {pg.inner_text("#ft-msg")}')
    pg.fill('#ft-text', 'Café ☕')
    pg.wait_for_timeout(800)
    ok('☕' in pg.inner_text('#ft-msg'), f'그릴 수 없는 글자 알림 {pg.inner_text("#ft-msg")!r}')
    # M6: 화면이 '무늬 크기(여백·틀 빼고)'라고 밝힘 + 시트에 실제 스티커 mm
    pg.evaluate("document.getElementById('sheet').open = true")
    ok(('quiet zone' in pg.inner_text('#save-box')) and 'mm' in pg.inner_text('#sheet-n'), f'크기 기준 안내 {pg.inner_text("#sheet-n")}')
    # L3 예시 무늬는 읽히지 않음
    pg2 = env.page(c, '/')
    import base64
    d = pg2.evaluate("(() => { const svg = document.querySelector('#sticker svg'); return new XMLSerializer().serializeToString(svg); })()")
    import cairosvg
    png = cairosvg.svg2png(bytestring=d.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"', 1).replace('class="cut"', 'fill="#fff"').encode() if 'xmlns' not in d else d.encode(), output_width=700, background_color='white')
    ok(not zx(png), '첫 화면 예시 QR 은 찍어도 안 읽힘')
    pg2.close()
    # L6: 로고 넣은 뒤 오류 복원을 직접 고르면 'H로 올렸어요' 알림이 사라진다
    pg.evaluate("document.getElementById('tab-logo').click()")
    pg.set_input_files('#logo-file', files=[{'name': 'l.svg', 'mimeType': 'image/svg+xml', 'buffer': base64.b64decode(LOGO.split(',')[1])}])
    pg.wait_for_timeout(800)
    ok('H' in pg.inner_text('#logo-msg'), 'H 로 올림 알림')
    pg.click('#tab-adv')
    pg.click('.choice[data-g="ecl"] button[data-v="L"]')
    ok(pg.inner_text('#logo-msg') == '', 'L 을 고르면 H 알림이 사라짐')
    # L4: 스캐너 060 번호·퍼센트·꾸민 도메인
    import segno
    ps = env.page(c, '/scan/')
    for text, flag in (('tel:060-700-1234', 'paid'), ('https://exa%6Dple.com/a', 'pct'), ('https://kakaobank.co.kr.secure-login.top/x', 'lookalike')):
        segno.make(text, error='m', micro=False).save(str(TMP / 's.png'), scale=8, border=4)
        ps.set_input_files('#s-file', str(TMP / 's.png'))
        ps.wait_for_function('window.__scan && window.__scan.text === ' + json.dumps(text), timeout=8000)
        fl = ps.evaluate("[...document.querySelectorAll('.s-flags li')].map(l => l.dataset.f)")
        ok(flag in fl, f'스캐너 {text}: {fl}')
    ps.close()
    pg.close()
    c.close()


def main():
    proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy') or ''
    args = ['--proxy-bypass-list=localhost;127.0.0.1']
    if proxy:
        args.append('--proxy-server=https=' + proxy.replace('http://', ''))
    exe = sorted(Path('/opt/pw-browsers').glob('chromium-*/chrome-linux/chrome'))
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=str(exe[0]) if exe else None, args=args)
        env = Env(b)
        for n, fn in ((1, all_pages), (2, overflow), (3, targets), (4, cls), (5, make), (6, verdicts), (7, downloads), (8, bulk), (9, scanner), (10, motion), (11, slow), (13, calib), (14, phase2_ui), (12, shots)):
            if sec(n):
                try:
                    fn(env)
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    fails.append(f'{fn.__name__} 가 도중에 멈췄다: {e!r}'[:300])
        b.close()
    print(f'화면 확인 {passed + len(fails)}개 가운데 실패 {len(fails)}개')
    for n in notes:
        print('  참고', n)
    for f in fails[:60]:
        print('  실패', f[:240])
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
