#!/usr/bin/env python3
"""체크벤치 화면 확인(Playwright): python3 check/_dev/e2e.py [스크린샷 폴더]   (먼저 node check/_dev/serve.mjs 8444)

- 모든 쪽: 콘솔 오류 0, 깨진 그림 0, 320px 가로 스크롤 0, 처음 열 때 화면 밀림(CLS) 0.02 이하(컴퓨터·휴대폰, CPU 4배 느리게).
  가로 넘침은 휴대폰 흉내 없이 창 폭만 320~1440px를 20px 간격으로 바꿔 가며 잰다(두 언어 모든 쪽).
- 도구를 실제로 눌러 본다: 키보드(누름·동시 입력·채터링·배열 바꾸기·모든 키·키 잡기 풀기), 마우스(단추 다섯·휠·더블클릭 의심·초당 보고 수),
  마이크·카메라(가짜 장치: 켜기·끄기·녹음·사진·탭이 가려지면 꺼짐), 스피커, 불량화소(색 넘기기), 주사율, 게임패드(가짜 컨트롤러), 권한 거절.
- 그 밖: 이 탭에서 해 본 테스트의 불이 다른 쪽에서도 켜져 있는지, 동작 줄이기, 어두운 화면, 광고 미리보기 자리와 단추 사이 거리(150px 이상), 404, 다른 언어 안내 띠.
- 진짜 소리·좌우·실기기·아이폰 사파리는 여기서 볼 수 없다(보고에 '못 함'으로 적는다).
- 브라우저는 한 번에 하나만 띄운다. 느린 기계에서도 돌게 기다리는 시간을 넉넉히 잡았다. CK_ONLY=home,keyboard 처럼 묶음을 골라 돌릴 수 있다
  (all_pages, home, keyboard, quirks, mouse, mic_cam_spk, screen_pad, late_shift, others, denied).
- 글꼴은 사이트가 직접 보내는 조각(assets/fonts/ck-*.woff2)이라 바깥 글꼴 요청이 없다.
- 3단계(제3자 평가 뒤)에 더한 묶음 quirks: 뗌만 오는 키(PrtSc), 맥 Caps Lock, 떼면 바로 지워지는 눌림 경고, 배열 고르기에 남은 초점, 건너뛰기 링크, 첫 화면의 키 받기·마우스 칸.
"""
import json
import math
import os
import re
import shutil
import struct
import sys
import tempfile
import time
import wave
import xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE = 'http://localhost:8444'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
EXE = sorted(Path('/opt/pw-browsers').glob('chromium-*/chrome-linux/chrome'))
PATHS = [u.text.replace('https://check.lumenlab.page', '') for u in ET.parse(ROOT / 'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
fails, passed, notes = [], 0, []
OUTSIDE = []
WAIT = 20000
WIDTHS = sorted(set(list(range(320, 1441, 20)) + [375, 390, 768, 810, 834, 1366]))


def ok(cond, msg):
    global passed
    if cond:
        passed += 1
    else:
        fails.append(msg)
        print('   ✗', msg, flush=True)
    return bool(cond)


def route(r):
    u = r.request.url
    if re.search(r'googlesyndication|doubleclick|adservice|fundingchoices', u):
        return r.abort()
    if re.search(r'cdn\.jsdelivr\.net|fonts\.g', u):
        OUTSIDE.append(u)           # 바깥 글꼴 요청은 이제 없어야 한다
        return r.abort()
    return r.continue_()


def launch(p, extra=()):
    return p.chromium.launch(executable_path=str(EXE[0]) if EXE else None, args=['--no-proxy-server', '--disable-background-networking', '--disable-component-update', '--autoplay-policy=no-user-gesture-required', *extra])


def ctx_of(b, mobile=False, **kw):
    vp = {'width': 390, 'height': 844} if mobile else {'width': 1366, 'height': 768}
    kw.setdefault('locale', 'en-US')
    c = b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, **kw)
    c.route('**/*', route)
    return c


def page_of(c, errs=None):
    pg = c.new_page()
    if errs is not None:
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text and 'net::ERR' not in m.text else None)
    return pg


def go(pg, path, settle=400):
    pg.goto(BASE + path, wait_until='load')
    pg.wait_for_timeout(settle)


def text(pg, sel):
    return pg.evaluate("s => { const e = [...document.querySelectorAll(s)].find(x => x.offsetParent !== null) || document.querySelector(s); return e ? e.textContent.trim() : null; }", sel)


def until(pg, js, arg=None, timeout=WAIT):
    try:
        pg.wait_for_function(js, arg=arg, timeout=timeout, polling=100)
        return True
    except Exception:
        return False


def shot(pg, name, full=False):
    if SHOTS:
        pg.screenshot(path=f'{SHOTS}/{name}.png', full_page=full)


def click(pg, sel):
    """사람처럼 누른다: 60ms 눌렀다 떼고 160ms 쉰다(바로 이어 누르면 더블클릭 기준 50ms에 걸린다)."""
    pg.click(sel, delay=60)
    pg.wait_for_timeout(160)


def press(pg, key):
    """사람처럼 누른다: 40ms 눌렀다 떼고 80ms 쉰다(바로 이어 누르면 채터링 기준 30ms에 걸린다)."""
    pg.keyboard.press(key, delay=40)
    pg.wait_for_timeout(80)


def keys_cdp(cdp, seq):
    """seq: [(type, code, key, 초 단위 시각)]. 시각을 박아 넣어 뗌→누름 간격을 정확히 만든다."""
    for typ, code, key, t in seq:
        cdp.send('Input.dispatchKeyEvent', {'type': typ, 'code': code, 'key': key, 'windowsVirtualKeyCode': ord(key.upper()) if len(key) == 1 else 0, 'timestamp': t})


CLS_JS = """() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); }"""


def all_pages(b):
    print('· 모든 쪽: 오류·밀림·가로 스크롤', flush=True)
    worst = (0, '')
    for mobile in (False, True):
        c = ctx_of(b, mobile)
        c.add_init_script(f'({CLS_JS})()')
        for path in PATHS:
            errs = []
            pg = page_of(c, errs)
            cdp = c.new_cdp_session(pg)
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
            go(pg, path, 3200)
            tag = f'{path} ({"휴대폰" if mobile else "컴퓨터"})'
            cls = pg.evaluate('window.__cls')
            worst = max(worst, (cls, tag))
            ok(cls <= 0.02, f'{tag}: 화면 밀림 {cls:.4f}')
            ok(not errs, f'{tag}: 콘솔 오류 {errs[:2]}')
            ok(pg.evaluate("[...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).length") == 0, f'{tag}: 깨진 그림')
            ok(pg.evaluate('document.documentElement.scrollWidth - innerWidth') <= 0, f'{tag}: 가로 스크롤')
            ok(pg.evaluate("!!document.querySelector('h1') && document.querySelector('h1').getBoundingClientRect().height > 0"), f'{tag}: 제목이 안 보임')
            if mobile:
                pg.set_viewport_size({'width': 320, 'height': 640})
                pg.wait_for_timeout(150)
                over = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
                ok(over <= 0, f'{path}: 320px 가로 스크롤 {over}px')
                pg.set_viewport_size({'width': 390, 'height': 844})
            pg.close()
        c.close()
    # 좁은 화면의 가로 스크롤은 휴대폰 흉내 없이 잰다. 휴대폰 흉내(is_mobile)에서는 넘친 만큼 화면이 줄어들어 scrollWidth − innerWidth 가 0으로 나온다
    c = b.new_context(viewport={'width': 320, 'height': 640}, locale='en-US')
    c.route('**/*', route)
    pg = page_of(c)
    wide = (0, '')
    fonts_seen = set()
    pg.on('response', lambda r: fonts_seen.add((r.url.split('/')[-1], r.status)) if '/assets/fonts/' in r.url else None)
    for path in PATHS + ['/no-such-page/']:
        pg.goto(BASE + path, wait_until='load')
        bad = []
        for w in WIDTHS:          # 320~1440px, 20px 간격(+ 흔한 태블릿 폭). 영어 도구 쪽이 761~891px에서 넘쳤던 일이 있다
            pg.set_viewport_size({'width': w, 'height': 700})
            pg.wait_for_timeout(35)
            over = pg.evaluate("Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('header *, nav.strip *, main > *, footer *')].map(e => Math.ceil(e.getBoundingClientRect().right))) - document.documentElement.clientWidth")
            if over > 0:
                bad.append((w, over))
            wide = max(wide, (over, f'{path} {w}px'))
        ok(not bad, f'{path}: 가로 넘침(폭, 넘친 px) {bad[:6]}')
        if path in ('/keyboard-test/', '/ko/keyboard-test/', '/gamepad-tester/'):      # 기기 띠의 낱말이 가운데에서 끊기지 않는다(320px 포함)
            for w in (320, 360, 390, 768, 900):
                pg.set_viewport_size({'width': w, 'height': 700}); pg.wait_for_timeout(60)
                broke = pg.evaluate("""() => [...document.querySelectorAll('.strip a')].filter(a => { const t = [...a.childNodes].find(n => n.nodeType === 3); if (!t) return false;
                  const r = document.createRange(); r.selectNodeContents(t); const lines = new Set([...r.getClientRects()].map(q => Math.round(q.top))).size; return lines > t.nodeValue.trim().split(/\\s+/).length; }).map(a => a.textContent)""")
                ok(not broke, f'{path} 폭 {w}px: 기기 띠 글자가 낱말 가운데에서 끊김 {broke}')
    ok(fonts_seen and all(st == 200 for _, st in fonts_seen), f'조각 글꼴을 사이트에서 직접 받음 {sorted(fonts_seen)}')
    pg.goto(BASE + '/ko/keyboard-test/', wait_until='load'); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.fonts.check('600 16px \"CK Sans\"', '키보드 Keyboard')"), '조각 글꼴(CK Sans)이 실제로 쓰임')
    c.close()
    ok(not OUTSIDE, f'바깥 글꼴 요청이 없어야 함 {OUTSIDE[:2]}')
    notes.append(f'가장 큰 화면 밀림 {worst[0]:.4f} ({worst[1]})')
    notes.append(f'가로 넘침(창 폭 {WIDTHS[0]}~{WIDTHS[-1]}px {len(WIDTHS)}가지, 휴대폰 흉내 없이) 최대 {wide[0]}px ({wide[1]})')


def home(b):
    print('· 첫 화면 점검판', flush=True)
    c = ctx_of(b, permissions=['microphone', 'camera'])
    c.add_init_script(SPY_JS)
    errs = []
    pg = page_of(c, errs)
    go(pg, '/', 300)
    ok(text(pg, '[data-state="kb"]') == 'Press any key' and text(pg, '[data-state="mic"]') == 'Not checked yet', '첫 화면: 처음 상태 글자')
    ok(until(pg, "document.querySelector('.p-screen').classList.contains('is-on') && /^\\d+$/.test(document.querySelector('[data-hz]').textContent)"), '첫 화면: 주사율이 스스로 켜짐')
    ok(text(pg, '[data-state="hz"]') == 'measured automatically', '첫 화면: 화면 칸에 "measured automatically"')
    shot(pg, 'final-home-en-desktop')
    for k in ('KeyC', 'KeyH', 'KeyE', 'KeyK', 'Space', 'Digit1'):
        press(pg, k)
    ok(pg.evaluate("document.querySelector('.p-kb').classList.contains('is-on')") and text(pg, '.p-kb [data-v="kb"]') == '6 keys pressed, and all of them registered.', f'첫 화면: 키 6개 → 판정 글 ({text(pg, ".p-kb [data-v=kb]")})')
    ok(pg.evaluate("document.querySelectorAll('.kb--home.kb--full .key.is-seen').length") == 6, '첫 화면: 누른 키 6개에 불')
    ok(pg.evaluate('scrollY') == 0, '첫 화면: 스페이스를 눌러도 화면이 안 밀림')
    box = pg.evaluate("(() => { const r = document.querySelector('.p-mouse').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
    pg.mouse.move(box[0] - 90, box[1])
    cdp = c.new_cdp_session(pg)
    t0 = time.time()
    for i in range(600):
        cdp.send('Input.dispatchMouseEvent', {'type': 'mouseMoved', 'x': box[0] - 90 + (i % 180), 'y': box[1] + (i % 30), 'timestamp': t0 + i * 0.001, 'pointerType': 'mouse'})
    ok(until(pg, "document.querySelector('[data-m-rate]').textContent === 'about 1000'"), f'첫 화면: 1ms 간격 이동 → about 1000 ({text(pg, "[data-m-rate]")})')
    pg.mouse.click(box[0], box[1], button='right', delay=60); pg.wait_for_timeout(160)
    ok(pg.evaluate("document.querySelector('.p-mouse .chip[data-m=\"2\"]').classList.contains('is-seen')") and text(pg, '[data-state="mouse"]') == 'Mouse responds', '첫 화면: 오른쪽 단추')
    # 마이크: 켜기 → 끄기 단추와 안내 → 끄기
    click(pg, '.p-mic [data-act="mic"]')
    ok(until(pg, "document.querySelector('.p-mic').classList.contains('is-on')"), '첫 화면: 마이크 켜짐')
    ok(pg.is_visible('.p-mic [data-act="mic-stop"]') and not pg.is_visible('.p-mic [data-act="mic"]'), '첫 화면: 켜진 동안 끄기 단추가 보임')
    ok(text(pg, '[data-note="mic"]') == 'Nothing is uploaded. It stays in this tab.', '첫 화면: 켜진 뒤 안내 글이 바뀜')
    ok(until(pg, "document.querySelector('[data-state=\"mic\"]').textContent === 'Mic picks up sound'"), f'첫 화면: 소리를 잡음 ({text(pg, "[data-state=mic]")})')
    click(pg, '.p-mic [data-act="mic-stop"]')
    ok(pg.is_visible('.p-mic [data-act="mic"]') and text(pg, '[data-note="mic"]') == 'It is off now. Nothing was uploaded.', '첫 화면: 마이크 끄면 처음 단추로, 안내는 "꺼져 있어요"로')
    # 카메라: 켜기 → 크게 보기 → 끄기
    click(pg, '.p-cam [data-act="cam"]')
    ok(until(pg, "document.querySelector('.p-cam').classList.contains('is-on') && document.querySelector('[data-cam-video]').videoWidth > 0"), '첫 화면: 카메라 켜짐')
    ok(pg.is_visible('[data-act="cam-large"]') and pg.is_visible('.p-cam [data-act="cam-stop"]'), '첫 화면: 크게 보기·끄기 단추')
    want = pg.evaluate("window.__gum.map(c => c.video).filter(Boolean).pop()")
    ok(want.get('width') == {'ideal': 4096} and want.get('height') == {'ideal': 2160} and pg.evaluate("document.querySelector('[data-cam-video]').videoWidth") > 640, f'첫 화면: 카메라 칸도 가장 큰 크기를 요청함 {want}')
    click(pg, '[data-act="cam-large"]')
    ok(until(pg, "document.querySelector('[data-cam-dialog]').open && document.querySelector('[data-cam-big]').videoWidth > 0"), '첫 화면: 크게 보기 창')
    click(pg, '[data-act="cam-large-close"]')
    click(pg, '.p-cam [data-act="cam-stop"]')
    ok(pg.is_visible('.p-cam [data-act="cam"]') and pg.evaluate("document.querySelector('[data-cam-video]').hidden"), '첫 화면: 카메라 끔')
    click(pg, '[data-act="spk-left"]')
    ok(until(pg, "document.querySelector('[data-state=\"spk\"]').textContent === 'Tone played'"), '첫 화면: 스피커 소리 냄')
    ok(text(pg, '[data-tally]') == '6', f'첫 화면: 6개 확인 ({text(pg, "[data-tally]")})')
    ok(text(pg, '[data-tally-text]') == '6 of 7 devices checked', '첫 화면: "6 of 7 devices checked"')
    ok(pg.evaluate("document.querySelector('.p-kb').getBoundingClientRect().bottom <= innerHeight && document.querySelector('.p-mic [data-act=\"mic\"]').getBoundingClientRect().bottom <= innerHeight"), '첫 화면: 1366×768에서 아랫줄 단추까지 보임')
    shot(pg, 'final-home-en-desktop-used')
    hangul = pg.evaluate("(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n, out = []; while ((n = w.nextNode())) { if (/[가-힣]/.test(n.nodeValue) && !n.parentElement.closest('[lang=ko], script')) out.push(n.nodeValue.trim().slice(0, 20)); } return out; })()")
    ok(not hangul, f'첫 화면(영어): 쓴 뒤에도 lang=ko 밖 한글 없음 {hangul[:3]}')
    # 이 탭에서 해 본 테스트의 불이 도구 쪽 띠에도 켜진다
    go(pg, '/keyboard-test/', 300)
    lit = pg.evaluate("[...document.querySelectorAll('.strip a.is-on, .strip a.is-warn')].map(a => a.getAttribute('data-dev'))")
    ok(sorted(lit) == ['cam', 'hz', 'kb', 'mic', 'mouse', 'spk'], f'기기 띠: 해 본 테스트 6개에 불 {lit}')
    go(pg, '/', 300)
    ok(text(pg, '[data-state="mic"]') == 'Checked earlier in this tab' and text(pg, '[data-tally]') == '6', '첫 화면으로 돌아오면 "Checked earlier in this tab"')
    ok(not errs, f'첫 화면: 콘솔 오류 {errs[:2]}')
    c.close()
    # 높이 650(주소창을 뺀 노트북), 휴대폰
    c = ctx_of(b)
    pg = page_of(c)
    pg.set_viewport_size({'width': 1366, 'height': 650})
    go(pg, '/', 300)
    ok(pg.evaluate("['mic', 'cam', 'spk-left'].every(a => document.querySelector('[data-act=\"' + a + '\"]').getBoundingClientRect().bottom <= innerHeight)"), '첫 화면: 높이 650에서도 마이크·카메라·스피커 단추가 보임')
    c.close()
    c = ctx_of(b, True, permissions=['microphone', 'camera'])
    pg = page_of(c)
    pg.set_viewport_size({'width': 375, 'height': 667})
    go(pg, '/', 300)
    vis = pg.evaluate("[...document.querySelectorAll('[data-act]')].filter(x => x.offsetParent && x.getBoundingClientRect().bottom <= innerHeight).map(x => x.getAttribute('data-act'))")
    ok('mic' in vis and 'cam' in vis, f'휴대폰 375×667 첫 화면에 마이크·카메라 단추 {vis}')
    ok(not pg.is_visible('.p-kb') and pg.is_visible('.desk-note') and pg.is_visible('.for-touch') and not pg.is_visible('.for-desk'), '휴대폰: 자판·마우스 칸 대신 "컴퓨터에서" 한 줄, 설명도 휴대폰용')
    ok(pg.evaluate("document.querySelectorAll('.desk-note a').length") == 2, '휴대폰: 키보드·마우스 테스트로 가는 링크')
    pg.set_viewport_size({'width': 390, 'height': 844})
    ok(until(pg, "/^\\d+$/.test(document.querySelector('[data-hz]').textContent)"), '휴대폰 첫 화면: 주사율이 스스로 켜짐')
    shot(pg, 'final-home-en-mobile')
    click(pg, '.p-cam [data-act="cam"]')
    ok(until(pg, "document.querySelector('.p-cam').classList.contains('is-on') && document.querySelector('.p-cam .finder').getBoundingClientRect().height > 150"), '휴대폰: 카메라를 켜면 미리보기 칸이 커짐')
    ok(pg.evaluate("(() => { const f = document.querySelector('.p-cam .finder').getBoundingClientRect(), s = document.querySelector('.p-cam [data-act=\"cam-stop\"]').getBoundingClientRect(); return s.width > 0 && s.top >= f.top && s.bottom <= f.bottom; })()"), '휴대폰: 끄기 단추가 미리보기 안에 보임')
    click(pg, '.p-cam [data-act="cam-stop"]')
    ok(pg.evaluate("document.querySelector('.p-cam .finder').getBoundingClientRect().height") < 100 and text(pg, '[data-note="cam"]') == 'It is off now. Nothing was uploaded.', '휴대폰: 끄면 미리보기 칸이 다시 작아지고 안내가 바뀜')
    c.close()


def keyboard(b):
    print('· 키보드', flush=True)
    c = ctx_of(b)
    errs = []
    pg = page_of(c, errs)
    go(pg, '/keyboard-test/')
    ok(pg.evaluate("document.documentElement.getAttribute('data-kb')") == 'full' and text(pg, '[data-kb-count]') == '0 of 104', '키보드: 처음 배열은 풀 104')
    ok(text(pg, '[data-kb-cap]').startswith('Press any key to start.') and pg.evaluate("document.querySelector('[data-kb-cap]').getBoundingClientRect().bottom <= document.querySelector('.stage--kb .kb-well').getBoundingClientRect().top"), '키보드: 키를 잡는다는 안내가 자판 위에 있음')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.stage--kb .kb--full')).display") == 'block' and pg.evaluate("[...document.querySelectorAll('.stage--kb .kb')].filter(s => getComputedStyle(s).display !== 'none').length") == 1, '키보드: 배열 그림은 하나만 보임')
    press(pg, 'KeyA')
    ok(text(pg, '[data-v="kb"]') == '1 key pressed, and it registered.' and text(pg, '[data-vs="kb"]') == '103 keys on this layout not pressed yet.', '키보드: 첫 키 판정 글')
    ok(text(pg, '[data-kb-cap]').startswith('Keys are captured'), '키보드: 첫 키에서 스스로 키를 잡음')
    for k in ('KeyA', 'KeyS', 'KeyD', 'KeyF'):
        pg.keyboard.down(k); pg.wait_for_timeout(60)
    ok(text(pg, '[data-kb-max]') == '4 worked' and text(pg, '[data-kb-held]') == 'A + S + D + F', f'키보드: 동시 4키 ({text(pg, "[data-kb-max]")} / {text(pg, "[data-kb-held]")})')
    ok(text(pg, '[data-kb-maxkeys]') == 'A + S + D + F', f'키보드: 가장 많이 눌렸을 때의 키를 보여 줌 ({text(pg, "[data-kb-maxkeys]")})')
    ok(pg.evaluate("document.querySelectorAll('.stage--kb .kb--full .key.is-down').length") == 4, '키보드: 눌린 키 4개가 진하게')
    for k in ('KeyA', 'KeyS', 'KeyD', 'KeyF'):
        pg.keyboard.up(k)
    pg.wait_for_timeout(80)
    ok(text(pg, '[data-kb-held]') == 'none' and pg.evaluate("document.querySelectorAll('.key.is-down').length") == 0, '키보드: 떼면 눌린 표시가 사라짐')
    # 키 잡기: Tab이 초점을 옮기지 않는다 → Esc 두 번 → 옮긴다 → 자판을 누르면 다시 잡는다
    press(pg, 'Tab')
    ok(pg.evaluate("document.activeElement === document.body") and pg.evaluate("document.querySelector('.kb--full [data-code=Tab]').classList.contains('is-seen')"), '키보드: 테스트 중 Tab은 초점을 옮기지 않고 불만 켜짐')
    press(pg, 'Escape'); press(pg, 'Escape')
    ok(text(pg, '[data-kb-cap]').startswith('Released') and pg.is_visible('[data-act="kb-capture"]'), '키보드: Esc 두 번이면 키를 돌려주고 다시 받는 단추가 보임')
    press(pg, 'Tab')
    ok(pg.evaluate("document.activeElement !== document.body"), '키보드: 풀린 뒤에는 Tab이 초점을 옮김')
    pg.evaluate("document.activeElement.blur()")
    pg.click('[data-kb-area]', position={'x': 5, 'y': 5})
    ok(text(pg, '[data-kb-cap]').startswith('Keys are captured'), '키보드: 자판을 누르면 다시 잡음')
    ok(text(pg, '[data-kb-chatter]') == 'none seen', f'키보드: 사람 속도로 누른 키는 채터링으로 잡지 않음 ({text(pg, "[data-v=kb]")})')
    # 채터링: 뗀 뒤 12ms 만에 다시 눌림(시각을 박아 넣는다)
    cdp = c.new_cdp_session(pg)
    t = time.time()
    keys_cdp(cdp, [('keyDown', 'KeyE', 'e', t), ('keyUp', 'KeyE', 'e', t + 0.060), ('keyDown', 'KeyE', 'e', t + 0.072), ('keyUp', 'KeyE', 'e', t + 0.130)])
    ok(until(pg, "document.querySelector('[data-v=\"kb\"]').textContent === 'Possible double-typing on E.'"), f'키보드: 12ms 재입력 → 채터링 의심 ({text(pg, "[data-v=kb]")})')
    ok(text(pg, '[data-vs="kb"]').startswith('A second press arrived less than 30 ms after release') and text(pg, '[data-kb-chatter]') == '1 key suspected', f'키보드: 기준(30 ms)을 판정 글에 밝힘 ({text(pg, "[data-vs=kb]")} / {text(pg, "[data-kb-chatter]")})')
    ok(pg.evaluate("document.querySelector('.stage--kb').classList.contains('is-warn') && document.querySelector('.kb--full [data-code=KeyE]').classList.contains('is-warn')"), '키보드: 의심 키와 불이 주황')
    shot(pg, 'final-keyboard-en-chatter')
    # 자세히: code·key, 배열 밖 키, 기준 바꾸기
    pg.click('.more summary')
    ok(text(pg, '[data-kb-code]') == 'KeyE' and text(pg, '[data-kb-key]') == 'e', '키보드: 자세히 보기에 code·key')
    pg.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', {code: 'IntlBackslash', key: '\\\\', bubbles: true}))")
    ok(text(pg, '[data-kb-extra]') == 'IntlBackslash', '키보드: 배열에 없는 키는 따로 알려 줌')
    pg.fill('[data-kb-thr]', '10'); pg.dispatch_event('[data-kb-thr]', 'change')
    ok(pg.evaluate("localStorage.getItem('ck.chatter')") == '10', '키보드: 기준을 바꾸면 기기에 남김(ck.chatter)')
    ok(pg.evaluate("[...document.querySelectorAll('[data-thr=\"kb\"]')].map(e => e.textContent).join()") == '10,10', '키보드: 설명 글의 기준 숫자가 설정을 따라 바뀜')
    pg.fill('[data-kb-thr]', '999'); pg.dispatch_event('[data-kb-thr]', 'change')
    ok(pg.input_value('[data-kb-thr]') == '200', '키보드: 기준은 200ms를 넘지 못함')
    pg.fill('[data-kb-thr]', '30'); pg.dispatch_event('[data-kb-thr]', 'change')
    pg.click('.more summary')
    # 처음부터 → 배열 바꾸기 → 모든 키
    pg.click('[data-act="kb-reset"]')
    ok(text(pg, '[data-v="kb"]') == 'Press any key' and text(pg, '[data-kb-count]') == '0 of 104' and not pg.evaluate("document.querySelector('.stage--kb').classList.contains('is-warn')"), '키보드: 처음부터')
    pg.select_option('[data-kb-layout]', 'iso')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.stage--kb .kb--iso')).display") == 'block' and text(pg, '[data-kb-count]') == '0 of 105' and pg.evaluate("localStorage.getItem('ck.layout')") == 'iso', '키보드: ISO 105로 바꾸면 그림·수·저장이 바뀜')
    pg.reload(wait_until='load'); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.documentElement.getAttribute('data-kb')") == 'iso' and pg.input_value('[data-kb-layout]') == 'iso', '키보드: 다시 열어도 고른 배열 그대로')
    pg.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', {code: 'IntlBackslash', key: '\\\\', bubbles: true}))")
    ok(pg.evaluate("document.querySelector('.kb--iso [data-code=IntlBackslash]').classList.contains('is-seen')"), '키보드: ISO에서는 Shift 옆 키가 제자리에 켜짐')
    pg.select_option('[data-kb-layout]', 'tkl')
    ok(text(pg, '[data-kb-count]') == '0 of 87', f'키보드: 텐키리스 87 ({text(pg, "[data-kb-count]")})')
    codes = pg.evaluate("CK.layout('tkl').keys.map(k => k.code)")
    for code in codes[:-1]:
        pg.evaluate("c => { const o = {code: c, key: c, bubbles: true, cancelable: true}; window.dispatchEvent(new KeyboardEvent('keydown', o)); window.dispatchEvent(new KeyboardEvent('keyup', o)); }", code)
    ok(text(pg, '[data-kb-count]') == '86 of 87' and not pg.evaluate("document.querySelector('.kb--tkl').classList.contains('is-sweeping')"), '키보드: 하나 남았을 때는 연출이 없음')
    # 완료 순간에 자판과 그 아래 내용이 제자리에 있다(연출 클래스가 다른 칸의 모양 규칙을 물려받아 33px 밀렸던 일)
    POS = "JSON.stringify(['.stage--kb .kb--tkl', '.stage--kb .facts', '.stage--kb .more', '.tool-head + .wrap + section'].map(q => { const r = document.querySelector(q).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }))"
    before = pg.evaluate(POS)
    pg.evaluate("c => window.dispatchEvent(new KeyboardEvent('keydown', {code: c, key: c, bubbles: true}))", codes[-1])
    ok(text(pg, '[data-v="kb"]') == 'Every key on this layout has registered.' and text(pg, '[data-kb-count]') == '87 of 87', '키보드: 마지막 키 → "Every key on this layout has registered."')
    ok(pg.evaluate("document.querySelector('.kb--tkl').classList.contains('is-sweeping') && getComputedStyle(document.querySelector('.kb--tkl .glow')).animationName === 'row-glow'"), '연출 2(불 지나가기): 마지막 키에서 시작')
    during = pg.evaluate(POS)
    ok(before == during, f'연출 2: 지나가는 동안 자판과 아래 내용의 자리·높이가 그대로 ({before} → {during})')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.kb--tkl')).display") == 'block' and pg.evaluate("[...document.querySelectorAll('.stage--kb .kb')].filter(s => getComputedStyle(s).display !== 'none').length") == 1, '연출 2: 자판은 하나만 보임')
    press(pg, 'KeyQ')
    ok(pg.evaluate("document.querySelector('.kb--tkl [data-code=KeyQ]').classList.contains('is-seen')"), '연출 2: 지나가는 중에도 키가 먹음')
    shot(pg, 'final-keyboard-en-all')
    ok(until(pg, "!document.querySelector('.kb--tkl').classList.contains('is-sweeping')", timeout=6000), '연출 2: 끝나면 덧칠이 멈춤')
    ok(pg.evaluate(POS) == before, '연출 2: 끝난 뒤에도 자리 그대로')
    pg.click('[data-act="kb-reset"]')
    for code in codes:
        pg.evaluate("c => { const o = {code: c, key: c, bubbles: true}; window.dispatchEvent(new KeyboardEvent('keydown', o)); window.dispatchEvent(new KeyboardEvent('keyup', o)); }", code)
    ok(text(pg, '[data-kb-count]') == '87 of 87' and not pg.evaluate("document.querySelector('.kb--tkl').classList.contains('is-sweeping')"), '연출 2: 같은 방문에서 다시 다 눌러도 다시 안 나옴')
    pg.select_option('[data-kb-layout]', 'full')
    ok(not errs, f'키보드: 콘솔 오류 {errs[:2]}')
    c.close()
    # 맥: Win 키가 없는 맥 배열이 처음부터
    c = ctx_of(b)
    c.add_init_script("Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' }); Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });")
    pg = page_of(c)
    go(pg, '/keyboard-test/')
    seen = pg.evaluate("[...document.querySelectorAll('.stage--kb .kb')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.textContent).join(' ')")
    ok(pg.evaluate("document.documentElement.getAttribute('data-kb')") == 'mac' and 'Win' not in seen and '⌘' in seen and text(pg, '[data-kb-count]') == '0 of 76', '맥: 처음부터 맥 배열(⌘·⌥), Win 없음, 76키')
    ok(pg.evaluate("CK.defaultLayout(navigator.platform)") == 'mac', '맥: 첫 그림 전 스크립트와 로직의 판단이 같음')
    shot(pg, 'final-keyboard-en-mac')
    go(pg, '/')
    seen = pg.evaluate("[...document.querySelectorAll('.p-kb .kb')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.textContent).join(' ')")
    ok('Win' not in seen and '⌘' in seen, '맥: 첫 화면의 작은 자판도 맥 배열')
    c.close()
    # 한국어: 한/영·한자
    c = ctx_of(b, locale='ko-KR')
    pg = page_of(c)
    go(pg, '/ko/keyboard-test/')
    ok(pg.evaluate("document.querySelector('.kb--full [data-code=AltRight] text').textContent") == '한/영' and pg.evaluate("document.querySelector('.kb--full [data-code=ControlRight] text').textContent") == '한자', '한국어: 한/영·한자 키 글자')
    pg.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', {code: 'Lang1', key: 'HangulMode', bubbles: true}))")
    ok(pg.evaluate("document.querySelector('.kb--full [data-code=AltRight]').classList.contains('is-seen')") and text(pg, '[data-v="kb"]') == '키 1개를 눌렀고 잘 들어왔어요.', '한국어: Lang1(한/영)이 한/영 자리에 켜짐')
    for k in ('KeyA', 'KeyS', 'KeyD'):
        pg.keyboard.down(k)
    shot(pg, 'final-keyboard-ko')
    c.close()

KEV = "([t, c, k]) => window.dispatchEvent(new KeyboardEvent(t, {code: c, key: k || c, bubbles: true, cancelable: true}))"


def quirks(b):
    """제3자 평가(2026-10-10)에서 나온 것: 한쪽 신호만 오는 키, 눌림 경고, 남은 초점, 건너뛰기 링크, 첫 화면의 키 받기와 마우스 칸."""
    print('· 한쪽 신호만 오는 키·키 잡기·첫 화면 마우스 칸', flush=True)
    c = ctx_of(b)
    errs = []
    pg = page_of(c, errs)
    go(pg, '/keyboard-test/')
    # L22: 첫 키를 누르기 전에는 Tab이 평소대로 초점을 옮긴다 → '본문으로 건너뛰기'를 Enter로 쓸 수 있다
    pg.keyboard.press('Tab', delay=40); pg.wait_for_timeout(120)
    ok(pg.evaluate("document.activeElement && document.activeElement.classList.contains('skip')") and text(pg, '[data-kb-cap]').startswith('Press any key to start.'), '키보드: 첫 키 전의 Tab은 건너뛰기 링크로 가고 키를 잡지 않음')
    ok(pg.evaluate("document.querySelector('.kb--full [data-code=Tab]').classList.contains('is-seen')"), '키보드: 그 Tab도 눌린 키로는 켜짐')
    pg.keyboard.press('Enter', delay=40); pg.wait_for_timeout(200)
    ok(pg.url.endswith('#main') and text(pg, '[data-kb-cap]').startswith('Press any key to start.'), f'키보드: 건너뛰기 링크가 Enter로 동작함 ({pg.url})')
    pg.evaluate("document.activeElement && document.activeElement.blur()")
    # H2: 누름 없이 뗌만 오는 키(윈도우의 PrtSc) → 칸이 켜지고, 눌려 있는 키·동시 입력 수에는 안 들어간다
    pg.evaluate(KEV, ['keyup', 'PrintScreen', 'PrintScreen'])
    ok(pg.evaluate("document.querySelector('.kb--full [data-code=PrintScreen]').classList.contains('is-seen')"), '뗌만 온 키(PrtSc): 칸이 켜짐')
    ok(text(pg, '[data-kb-count]') == '3 of 104' and text(pg, '[data-kb-held]') == 'none' and text(pg, '[data-kb-max]') == 'press several together', f'뗌만 온 키: 눌러 본 키로 세고, 눌려 있는 키·동시 입력에는 없음 ({text(pg, "[data-kb-count]")} / {text(pg, "[data-kb-held]")} / {text(pg, "[data-kb-max]")})')
    pg.click('.more summary')
    ok(text(pg, '[data-kb-log] li:first-child span:last-child') == 'release only (no press arrived)' and text(pg, '[data-kb-code]') == 'PrintScreen', '뗌만 온 키: 최근 누름에 "release only"로 남음')
    pg.click('.more summary')
    pg.wait_for_timeout(300)
    ok(not pg.evaluate("document.querySelector('.kb--full [data-code=PrintScreen]').classList.contains('is-down')"), '뗌만 온 키: 눌린 채로 그려 두지 않음')
    # 입력칸이 받은 키의 뗌은 '뗌만 온 키'로 세지 않는다
    pg.click('.more summary'); pg.focus('[data-kb-thr]'); pg.keyboard.press('ArrowUp', delay=40); pg.keyboard.press('ArrowDown', delay=40); pg.evaluate("document.activeElement.blur()"); pg.click('.more summary')
    ok(not pg.evaluate("document.querySelector('.kb--full [data-code=ArrowUp]').classList.contains('is-seen')"), '입력칸 안에서 누른 키는 세지 않음')
    # L10: 배열 고르기에 초점이 남아 있어도 글자 키가 배열을 바꾸지 않는다
    pg.focus('[data-kb-layout]')
    pg.keyboard.press('m', delay=40); pg.wait_for_timeout(120)
    ok(pg.input_value('[data-kb-layout]') == 'full' and pg.evaluate("document.documentElement.getAttribute('data-kb')") == 'full' and pg.evaluate("document.querySelector('.kb--full [data-code=KeyM]').classList.contains('is-seen')"),
       f'배열 고르기에 초점이 있어도 M은 배열을 바꾸지 않고 키로 켜짐 ({pg.input_value("[data-kb-layout]")})')
    ok(pg.evaluate("document.activeElement === document.body"), '배열 고르기의 초점을 풀어 줌')
    # L2: 10초 넘게 누르면 뜨는 경고는 떼는 순간 지워진다. 그동안 Caps Lock(누름만 옴)은 눌린 키로 치지 않는다(H3)
    pg.evaluate(KEV, ['keydown', 'CapsLock', 'CapsLock'])
    pg.keyboard.down('KeyJ')
    pg.wait_for_timeout(250)
    ok(text(pg, '[data-kb-held]') == 'J' and not pg.evaluate("document.querySelector('.kb--full [data-code=CapsLock]').classList.contains('is-down')") and pg.evaluate("document.querySelector('.kb--full [data-code=CapsLock]').classList.contains('is-seen')"),
       f'Caps Lock(누름만 옴): 켜지되 눌려 있는 키가 아님 ({text(pg, "[data-kb-held]")})')
    ok(text(pg, '[data-kb-max]') == 'press several together', f'Caps Lock + J: 동시 입력 2로 세지 않음 ({text(pg, "[data-kb-max]")})')
    got = until(pg, "/^J has been held for 1\\d seconds/.test(document.querySelector('[data-vs=\"kb\"]').textContent)", timeout=16000)
    ok(got, f'10초 넘게 누른 키(J)만 경고에 나옴 ({text(pg, "[data-vs=kb]")})')
    pg.keyboard.up('KeyJ'); pg.wait_for_timeout(150)
    ok('held for' not in text(pg, '[data-vs="kb"]') and text(pg, '[data-kb-held]') == 'none', f'눌림 경고는 떼는 순간 지워짐 ({text(pg, "[data-vs=kb]")})')
    pg.wait_for_timeout(1300)
    ok('held for' not in text(pg, '[data-vs="kb"]'), 'Caps Lock 때문에 경고가 다시 뜨지 않음')
    ok(not errs, f'키보드(한쪽 신호만 오는 키): 콘솔 오류 {errs[:2]}')
    c.close()
    # H3: 맥. Caps Lock을 켤 때 누름만, 끌 때 뗌만 온다
    c = ctx_of(b)
    c.add_init_script("Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' }); Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });")
    pg = page_of(c)
    go(pg, '/keyboard-test/')
    ok(pg.is_visible('.kb-na') and '76' in text(pg, '.kb-na'), '맥 배열: 점선 키(fn·전원)를 세지 않아 76개라는 설명이 보임')
    pg.evaluate(KEV, ['keydown', 'CapsLock', 'CapsLock'])
    pg.evaluate(KEV, ['keydown', 'KeyA', 'a']); pg.wait_for_timeout(60); pg.evaluate(KEV, ['keyup', 'KeyA', 'a'])
    ok(text(pg, '[data-kb-held]') == 'none' and text(pg, '[data-kb-max]') == 'press several together' and text(pg, '[data-kb-count]') == '2 of 76', f'맥 Caps Lock: 눌려 있음·동시 입력에 안 들어감 ({text(pg, "[data-kb-held]")} / {text(pg, "[data-kb-max]")} / {text(pg, "[data-kb-count]")})')
    pg.wait_for_timeout(11500)
    ok('held' not in text(pg, '[data-vs="kb"]') and 'stuck' not in text(pg, '[data-vs="kb"]'), f'맥 Caps Lock: 11초 뒤에도 "걸렸을 수 있어요"가 안 뜸 ({text(pg, "[data-vs=kb]")})')
    pg.evaluate(KEV, ['keyup', 'CapsLock', 'CapsLock'])
    ok(text(pg, '[data-kb-count]') == '2 of 76' and text(pg, '[data-kb-held]') == 'none', '맥 Caps Lock: 끌 때의 뗌도 문제없음')
    shot(pg, 'final3-keyboard-mac-capslock')
    c.close()
    # 한국어: 한/영(누름만 와도) 눌려 있는 키로 두지 않는다
    c = ctx_of(b, locale='ko-KR')
    pg = page_of(c)
    go(pg, '/ko/keyboard-test/')
    pg.evaluate(KEV, ['keydown', 'AltRight', 'HangulMode'])
    pg.wait_for_timeout(300)
    ok(pg.evaluate("document.querySelector('.kb--full [data-code=AltRight]').classList.contains('is-seen')") and text(pg, '[data-kb-held]') == '없음', f'한/영(누름만 옴): 켜지되 눌려 있는 키가 아님 ({text(pg, "[data-kb-held]")})')
    pg.evaluate(KEV, ['keyup', 'PrintScreen', 'PrintScreen'])
    ok(text(pg, '[data-kb-count]') == '104개 중 2개', f'한국어: 뗌만 온 키도 셈 ({text(pg, "[data-kb-count]")})')
    c.close()

    # ── 첫 화면: 키 받기(M2) ──
    c = ctx_of(b)
    errs = []
    pg = page_of(c, errs)
    go(pg, '/about/'); go(pg, '/')
    ok(text(pg, '.p-kb [data-kb-cap]') == 'Until you capture keys, Tab, Enter and F5 do their usual job.' and pg.get_attribute('[data-act="kb-capture"]', 'aria-pressed') == 'false', '첫 화면: 키를 받기 전의 안내')
    pg.focus('.p-kb .go')
    press(pg, 'Space'); press(pg, 'End'); press(pg, 'PageDown')
    ok(pg.evaluate('scrollY') == 0 and pg.url.endswith(':8444/'), f'첫 화면: 초점이 링크에 있어도 Space·End·PageDown이 화면을 굴리지 않음 (scrollY {pg.evaluate("scrollY")})')
    pg.evaluate("document.activeElement.blur()")
    press(pg, 'Tab')
    ok(pg.evaluate("document.activeElement !== document.body"), '첫 화면: 키를 받기 전에는 Tab이 평소대로 초점을 옮김(접근성)')
    pg.evaluate("document.activeElement.blur()")
    click(pg, '[data-act="kb-capture"]')
    ok(pg.get_attribute('[data-act="kb-capture"]', 'aria-pressed') == 'true' and text(pg, '[data-state="kb"]') == 'Capturing · Esc twice to stop', f'첫 화면: 키 받기를 켜면 나오는 법이 칸 머리에 보임 ({text(pg, "[data-state=kb]")})')
    pg.evaluate('window.__mark = 1')
    for k in ('Tab', 'Enter', 'Space', 'End', 'F5', 'Backspace'):
        press(pg, k)
    pg.wait_for_timeout(300)
    ok(pg.evaluate('window.__mark') == 1 and pg.url.endswith(':8444/') and pg.evaluate('scrollY') == 0 and pg.evaluate("document.activeElement === document.body"), '첫 화면: 받는 동안 Tab·Enter·Space·End·F5·Backspace가 화면을 흔들지 않음')
    ok(pg.evaluate("['Tab', 'Enter', 'Space', 'End', 'F5', 'Backspace'].every(c => document.querySelector('.kb--home.kb--full [data-code=' + c + ']').classList.contains('is-seen'))"), '첫 화면: 그 키들이 전부 켜짐')
    ok(text(pg, '[data-state="kb"]') == 'Capturing · Esc twice to stop', '첫 화면: 키를 눌러도 나오는 법이 계속 보임')
    shot(pg, 'final3-home-capture')
    press(pg, 'Escape'); press(pg, 'Escape')
    ok(pg.get_attribute('[data-act="kb-capture"]', 'aria-pressed') == 'false' and text(pg, '[data-state="kb"]') == 'Keys respond', f'첫 화면: Esc 두 번이면 풀림 ({text(pg, "[data-state=kb]")})')
    press(pg, 'Tab')
    ok(pg.evaluate("document.activeElement !== document.body"), '첫 화면: 풀린 뒤에는 Tab이 다시 초점을 옮김')
    pg.evaluate("document.activeElement.blur()")
    pg.click('.p-kb .kb-well', position={'x': 6, 'y': 6})
    ok(pg.get_attribute('[data-act="kb-capture"]', 'aria-pressed') == 'true', '첫 화면: 자판을 눌러도 키 받기가 켜짐')
    press(pg, 'Escape'); press(pg, 'Escape')
    # ── 첫 화면: 마우스 칸 안에서는 뒤로·앞으로·오른쪽 단추 메뉴를 막는다(M1) ──
    cdp = c.new_cdp_session(pg)
    box = pg.evaluate("(() => { const r = document.querySelector('.p-mouse .m-pic').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
    pg.mouse.move(box[0], box[1])
    for nm in ('back', 'forward', 'middle'):
        cdp.send('Input.dispatchMouseEvent', {'type': 'mousePressed', 'x': box[0], 'y': box[1], 'button': nm, 'clickCount': 1})
        pg.wait_for_timeout(70)
        cdp.send('Input.dispatchMouseEvent', {'type': 'mouseReleased', 'x': box[0], 'y': box[1], 'button': nm, 'clickCount': 1})
        pg.wait_for_timeout(250)
    ok(pg.url.endswith(':8444/') and pg.evaluate("[1, 3, 4].every(i => document.querySelector('.p-mouse .chip[data-m=\"' + i + '\"]').classList.contains('is-seen'))"), f'첫 화면 마우스 칸: 뒤로·앞으로 단추를 눌러도 쪽을 떠나지 않고 불이 켜짐 ({pg.url})')
    cm = pg.evaluate("""() => { const fire = (el) => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }); el.dispatchEvent(e); return e.defaultPrevented; };
      return [fire(document.querySelector('.p-mouse .m-pic')), fire(document.querySelector('.bench-head h1'))]; }""")
    ok(cm == [True, False], f'첫 화면 마우스 칸: 칸 안에서만 오른쪽 단추 메뉴를 막음 {cm}')
    ok('inside this box' in text(pg, '.p-mouse .p-foot .note'), '첫 화면 마우스 칸: 옆 단추는 칸 안에서 눌러 보라는 안내')
    pg.mouse.move(box[0], box[1]); pg.mouse.wheel(0, 200); pg.wait_for_timeout(250)
    ok(pg.evaluate("document.querySelector('.p-mouse [data-m-wheel=\"down\"]').classList.contains('is-seen')"), '첫 화면 마우스 칸: 휠을 셈')
    ok(not errs, f'첫 화면(키 받기·마우스 칸): 콘솔 오류 {errs[:2]}')
    c.close()


def mouse(b):
    print('· 마우스', flush=True)
    c = ctx_of(b)
    errs = []
    pg = page_of(c, errs)
    go(pg, '/mouse-test/')
    cdp = c.new_cdp_session(pg)
    box = pg.evaluate("(() => { const r = document.querySelector('.m-pic').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
    x, y = box
    ok(text(pg, '[data-v="mouse"]') == 'Move the mouse or click here', '마우스: 처음 글자')
    ok('wheel is counted instead of scrolling' in text(pg, '.stage--mouse .cap--top') and pg.evaluate("document.querySelector('.stage--mouse .cap--top').getBoundingClientRect().bottom <= document.querySelector('.stage--mouse .m-wrap').getBoundingClientRect().top"), '마우스: 칸 안에서는 휠이 페이지를 굴리지 않는다는 안내')
    ok(pg.evaluate("(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); document.querySelector('.stage--mouse .m-pic').dispatchEvent(e); return e.defaultPrevented; })()"), '마우스: 칸 안에서는 오른쪽 단추 메뉴를 막음')
    pg.mouse.move(x - 60, y)
    t = time.time()
    for i in range(600):
        cdp.send('Input.dispatchMouseEvent', {'type': 'mouseMoved', 'x': x - 60 + (i % 120), 'y': y + (i % 30), 'timestamp': t + i * 0.001, 'pointerType': 'mouse'})
    ok(until(pg, "document.querySelector('[data-m-rate]').textContent === 'about 1000'"), f'마우스: 1ms 간격 → about 1000 ({text(pg, "[data-m-rate]")})')
    pg.wait_for_timeout(700)
    for nm in ('left', 'middle', 'right', 'back', 'forward'):
        pg.mouse.move(x, y)
        cdp.send('Input.dispatchMouseEvent', {'type': 'mousePressed', 'x': x, 'y': y, 'button': nm, 'clickCount': 1})
        pg.wait_for_timeout(70)
        cdp.send('Input.dispatchMouseEvent', {'type': 'mouseReleased', 'x': x, 'y': y, 'button': nm, 'clickCount': 1})
        pg.wait_for_timeout(120)
    ok(until(pg, "document.querySelectorAll('.stage--mouse .chip[data-m].is-seen').length === 5"), '마우스: 단추 다섯 개 ' + str(pg.evaluate("document.querySelectorAll('.stage--mouse .chip[data-m].is-seen').length")))
    ok(text(pg, '[data-vs="mouse"]') == 'All five buttons seen.' and pg.url.endswith('/mouse-test/'), f'마우스: 뒤로·앞으로 단추를 눌러도 쪽을 떠나지 않음 ({text(pg, "[data-vs=mouse]")})')
    pg.mouse.move(x, y); pg.mouse.wheel(0, 120); pg.wait_for_timeout(150); pg.mouse.wheel(0, -120); pg.wait_for_timeout(250)
    ok(text(pg, '[data-m-wn="up"]') == '1' and text(pg, '[data-m-wn="down"]') == '1' and pg.evaluate('scrollY') == 0, '마우스: 휠 위·아래를 세고 화면은 안 밀림')
    ok(text(pg, '[data-m-dbl]') == 'none seen', '마우스: 사람 속도 클릭은 의심으로 잡지 않음')
    shot(pg, 'final-mouse-en')
    # 더블클릭 의심: 뗀 뒤 20ms 만에 다시 눌림
    pg.wait_for_timeout(400)
    t = time.time()
    for typ, dt in (('mousePressed', 0), ('mouseReleased', 0.07), ('mousePressed', 0.09), ('mouseReleased', 0.15)):
        cdp.send('Input.dispatchMouseEvent', {'type': typ, 'x': x, 'y': y, 'button': 'left', 'clickCount': 1, 'timestamp': t + dt})
    ok(until(pg, "document.querySelector('[data-v=\"mouse\"]').textContent === 'Possible double-click fault on Left.'"), f'마우스: 20ms 재클릭 → 의심 ({text(pg, "[data-v=mouse]")})')
    ok(text(pg, '[data-m-dbl]') == '1 suspected' and text(pg, '[data-vs="mouse"]').startswith('A second click arrived less than 50 ms after release'), '마우스: 기준(50 ms)을 밝힘')
    pg.click('[data-act="mouse-reset"]')
    ok(text(pg, '[data-m-rate]') == 'move it quickly' or text(pg, '[data-v="mouse"]') == 'The mouse responds.', '마우스: 처음부터')
    ok(not errs, f'마우스: 콘솔 오류 {errs[:2]}')
    c.close()


SPY_JS = """
(() => { const md = navigator.mediaDevices; window.__gum = []; window.__acs = [];
  if (md && md.getUserMedia) { const g = md.getUserMedia.bind(md); md.getUserMedia = (c) => { window.__gum.push(JSON.parse(JSON.stringify(c))); return g(c); }; }
  const AC = window.AudioContext; if (AC) { window.AudioContext = function () { const a = new AC(...arguments); window.__acs.push(a); return a; }; window.AudioContext.prototype = AC.prototype; } })();
"""


def mic_cam_spk(b):
    print('· 마이크·카메라·스피커(가짜 장치)', flush=True)
    c = ctx_of(b, permissions=['microphone', 'camera'])
    c.add_init_script(SPY_JS)
    errs = []
    pg = page_of(c, errs)
    go(pg, '/mic-test/')
    pg.evaluate('window.__seen = 0; setInterval(() => { const m = document.querySelector("[data-mic-meter] i").style.transform.match(/scaleX\\(([\\d.]+)/); if (m && +m[1] > window.__seen) window.__seen = +m[1]; }, 30)')
    pg.click('[data-act="mic"]')
    ok(until(pg, "document.querySelector('[data-v=\"mic\"]').textContent === 'Your mic picks up sound.'"), f'마이크: 소리를 잡음 ({text(pg, "[data-v=mic]")})')
    ok(pg.evaluate('window.__seen') > 0.3, '마이크: 막대가 움직임')
    want = pg.evaluate('window.__gum[0].audio')
    ok(all(want.get(k) == {'ideal': False} for k in ('echoCancellation', 'noiseSuppression', 'autoGainControl')), f'마이크: 소리 다듬기(울림 제거·소음 억제·자동 음량)를 끄고 요청함 {want}')
    proc = text(pg, '[data-mic-proc]') or ''
    ok(pg.is_visible('[data-mic-proc]') and (proc.startswith('Echo cancelling, noise suppression and automatic volume are off') or proc.startswith('Your browser is still shaping the sound') or proc.startswith('This browser does not say')), f'마이크: 브라우저가 소리를 다듬는지 알려 줌 ({proc[:60]})')
    notes.append(f'가짜 마이크에서 소리 다듬기 안내: "{proc[:70]}…"')
    ok(pg.is_visible('[data-act="mic-stop"]') and pg.is_visible('[data-on-note="mic"]') and not pg.is_visible('[data-act="mic"]'), '마이크: 켜진 동안 끄기 단추와 "Nothing is uploaded" 안내')
    ok(pg.evaluate("document.querySelector('.stage--mic').classList.contains('is-on')"), '마이크: 불이 켜짐')
    ok(pg.evaluate("document.querySelectorAll('[data-mic-device] option').length") >= 1 and re.search(r'\d+ Hz', text(pg, '[data-mic-info]') or ''), f'마이크: 장치 목록·신호 정보 ({text(pg, "[data-mic-info]")})')
    pg.click('[data-act="mic-rec"]')
    ok(until(pg, "!document.querySelector('[data-mic-audio]').hidden && document.querySelector('[data-mic-audio]').src.startsWith('blob:')", timeout=15000), f'마이크: 5초 녹음 → 다시 듣기 ({text(pg, "[data-mic-rec-state]")})')
    ok(text(pg, '[data-mic-rec-state]') == 'Recorded 5 seconds. Press play to listen.', '마이크: 녹음 끝 안내')
    ok(until(pg, "(async () => { const a = document.querySelector('[data-mic-audio]'); if (!(a.readyState >= 1)) return false; return true; })()", timeout=8000), '마이크: 녹음이 재생할 수 있는 상태')
    pg.evaluate('window.__freezeAt = 0.5')
    until(pg, 'window.__freeze === true', timeout=8000)
    shot(pg, 'final-mic-en')
    pg.evaluate('window.__freeze = false; window.__freezeAt = 0')
    pg.click('[data-act="mic-del"]')
    ok(pg.evaluate("document.querySelector('[data-mic-audio]').hidden"), '마이크: 녹음 지우기')
    pg.click('.more summary'); pg.click('[data-act="mic-noise"]')
    ok(until(pg, "/^Background noise: /.test(document.querySelector('[data-mic-noise]').textContent)", timeout=9000), f'마이크: 바탕 소음 ({text(pg, "[data-mic-noise]")})')
    pg.click('[data-act="mic-stop"]')
    ok(text(pg, '[data-v="mic"]') == 'Mic turned off.' and pg.is_visible('[data-act="mic"]') and not pg.is_visible('[data-on-note="mic"]'), '마이크: 끄기')
    ok(pg.evaluate("window.__acs.length >= 1 && window.__acs.every(a => a.state === 'closed')"), f'마이크: 끄면 AudioContext도 닫음 {pg.evaluate("window.__acs.map(a => a.state)")}')
    # 탭이 가려지면 스스로 끈다
    pg.click('[data-act="mic"]')
    until(pg, "!document.querySelector('[data-act=\"mic-stop\"]').hidden")
    pg.evaluate("Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))")
    ok(pg.is_visible('[data-act="mic"]') or pg.evaluate("document.querySelector('[data-act=\"mic-stop\"]').hidden"), '마이크: 탭이 가려지면 꺼짐')
    ok(not errs, f'마이크: 콘솔 오류 {errs[:2]}')
    # 너무 큼(L18): 꼭대기까지 꽉 찬 소리를 넣으면 말로 알리고, 줄이면 다시 '소리를 잡아요'
    go(pg, '/mic-test/')
    pg.evaluate("""navigator.mediaDevices.getUserMedia = async () => { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(), d = a.createMediaStreamDestination();
      o.type = 'square'; o.frequency.value = 220; g.gain.value = 3; o.connect(g); g.connect(d); o.start(); window.__gain = g; return d.stream; }; 0""")
    pg.click('[data-act="mic"]')
    ok(until(pg, "document.querySelector('[data-v=\"mic\"]').textContent === 'Your mic picks up sound, but it is too loud.'"), f'마이크: 꽉 찬 소리 → "너무 커요"를 말로 알림 ({text(pg, "[data-v=mic]")})')
    ok(pg.evaluate("document.querySelector('.stage--mic').classList.contains('is-warn')") and 'cut off' in text(pg, '[data-vs="mic"]'), '마이크: 너무 클 때 주황 불과 할 일')
    shot(pg, 'final3-mic-too-loud')
    pg.evaluate('window.__gain.gain.value = 0.05')
    ok(until(pg, "document.querySelector('[data-v=\"mic\"]').textContent === 'Your mic picks up sound.'", timeout=9000) and pg.evaluate("document.querySelector('.stage--mic').classList.contains('is-on')"), f'마이크: 소리를 줄이면 다시 "소리를 잡아요" ({text(pg, "[data-v=mic]")})')
    pg.click('[data-act="mic-stop"]')
    # M5: 브라우저가 소리 다듬기를 켜 둔 경우와 일부만 알려 주는 경우의 안내(트랙 설정을 바꿔 넣어 본다)
    for fake, starts in (("{ echoCancellation: false, noiseSuppression: true, autoGainControl: false }", 'Your browser is still shaping the sound'), ("{ echoCancellation: false }", 'This browser does not say whether it is shaping the sound'), ("{}", 'This browser does not say')):
        go(pg, '/mic-test/')
        pg.evaluate("""(fake) => { navigator.mediaDevices.getUserMedia = async () => { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(), d = a.createMediaStreamDestination();
          g.gain.value = 0.1; o.connect(g); g.connect(d); o.start(); const tr = d.stream.getAudioTracks()[0]; tr.getSettings = () => fake; return d.stream; }; }""", json.loads(fake.replace('echoCancellation', '"echoCancellation"').replace('noiseSuppression', '"noiseSuppression"').replace('autoGainControl', '"autoGainControl"')))
        pg.click('[data-act="mic"]')
        ok(until(pg, "s => (document.querySelector('[data-mic-proc]').textContent || '').startsWith(s)", arg=starts, timeout=8000), f'마이크: 트랙 설정 {fake} → 안내 ({(text(pg, "[data-mic-proc]") or "")[:50]})')
        pg.click('[data-act="mic-stop"]')
    # 카메라
    errs.clear()
    go(pg, '/webcam-test/')
    pg.click('[data-act="cam"]')
    ok(until(pg, "document.querySelector('[data-v=\"cam\"]').textContent === 'Your camera works.' && document.querySelector('[data-cam-video]').videoWidth > 0"), '카메라: 켜짐')
    ok(until(pg, "/frames per second/.test(document.querySelector('[data-vs=\"cam\"]').textContent)", timeout=15000), f'카메라: 크기와 초당 장 수 ({text(pg, "[data-vs=cam]")})')
    # H1: 카메라가 낼 수 있는 가장 큰 크기를 요청하고(ideal), 받은 값이 무엇인지 밝힌다
    want = pg.evaluate("window.__gum[window.__gum.length - 1].video")
    ok(want.get('width') == {'ideal': 4096} and want.get('height') == {'ideal': 2160} and 'exact' not in json.dumps(want), f'카메라: 가장 큰 크기를 ideal 조건으로 요청함 {want}')
    size = pg.evaluate("(() => { const v = document.querySelector('[data-cam-video]'), s = v.srcObject.getVideoTracks()[0].getSettings(); return [v.videoWidth, v.videoHeight, s.width, s.height]; })()")
    ok(size[0] > 640 and size[0] == size[2] and size[1] == size[3] and text(pg, '[data-vs="cam"]').startswith(f'Your browser receives {size[0]} × {size[1]}'), f'카메라: 640×480보다 큰 크기를 받고, 화면에 보이는 값 = 트랙 설정 {size} ({text(pg, "[data-vs=cam]")})')
    got = text(pg, '[data-cam-got]') or ''
    ok(got.startswith('This is the size your browser is delivering right now. We asked the camera for the largest size it offers.'), f'카메라: 받은 크기가 무엇인지 밝힘 ({got[:80]})')
    caps = pg.evaluate("(() => { const t = document.querySelector('[data-cam-video]').srcObject.getVideoTracks()[0]; const c = t.getCapabilities ? t.getCapabilities() : null; return c && c.width ? [c.width.max, c.height.max] : null; })()")
    if caps:
        ok(f'The camera reports up to {caps[0]} × {caps[1]}' in got, f'카메라: 카메라가 밝힌 최대 크기를 같이 보여 줌 ({got})')
        pg.click('.more summary')
        ok(text(pg, '[data-cam-cap]').startswith(f'{caps[0]} × {caps[1]}'), f'카메라: 자세히 보기에 카메라가 밝힌 최대 ({text(pg, "[data-cam-cap]")})')
        pg.click('.more summary')
    notes.append(f'가짜 카메라: 받은 크기 {size[0]}×{size[1]}, 카메라가 밝힌 최대 {caps}')
    ok(pg.is_visible('[data-act="cam-stop"]') and pg.is_visible('[data-on-note="cam"]'), '카메라: 끄기 단추와 안내')
    pg.click('[data-act="cam-mirror"]')
    ok(pg.evaluate("document.querySelector('[data-cam-box]').classList.contains('is-mirror') && document.querySelector('[data-act=\"cam-mirror\"]').getAttribute('aria-pressed') === 'true'"), '카메라: 좌우 뒤집기')
    pg.click('[data-act="cam-photo"]')
    ok(until(pg, "!document.querySelector('[data-cam-shot]').hidden && document.querySelector('[data-cam-img]').src.startsWith('blob:') && document.querySelector('[data-cam-save]').href.startsWith('blob:')"), '카메라: 사진 찍기 → 저장 링크')
    ok(until(pg, "document.querySelector('[data-cam-img]').naturalWidth > 0"), '카메라: 사진이 그려짐')
    shot(pg, 'final-webcam-en')
    pg.click('[data-act="cam-stop"]')
    ok(text(pg, '[data-v="cam"]') == 'Camera turned off.' and pg.evaluate("document.querySelector('[data-cam-video]').hidden"), '카메라: 끄기')
    ok(not errs, f'카메라: 콘솔 오류 {errs[:2]}')
    # 스피커
    errs.clear()
    go(pg, '/speaker-test/')
    ok(pg.input_value('[data-spk-vol]') == '0.1', '스피커: 처음 음량 0.1')
    pg.evaluate("window.__bufs = []; const o = AudioContext.prototype.createBuffer; AudioContext.prototype.createBuffer = function () { const b = o.apply(this, arguments); window.__bufs.push(b); return b; }; 0")
    pg.click('[data-act="spk-left"]')
    ok(text(pg, '[data-v="spk"]') == 'Playing on the left only.', '스피커: 왼쪽 재생 중')
    peaks = pg.evaluate("(() => { const b = window.__bufs[0]; const pk = ch => b.getChannelData(ch).reduce((m, v) => Math.max(m, Math.abs(v)), 0); return [pk(0), pk(1)]; })()")
    ok(0.09 < peaks[0] <= 0.1001 and peaks[1] == 0, f'스피커: 왼쪽 채널만 0.1 크기, 오른쪽은 0 {peaks}')
    shot(pg, 'final-speaker-en')
    ok(until(pg, "document.querySelector('[data-v=\"spk\"]').textContent === 'Played on the left. Did it come from the left?'", timeout=8000), '스피커: 끝나면 물어봄')
    pg.click('[data-act="spk-right"]')
    peaks = pg.evaluate("(() => { const b = window.__bufs[1]; const pk = ch => b.getChannelData(ch).reduce((m, v) => Math.max(m, Math.abs(v)), 0); return [pk(0), pk(1)]; })()")
    ok(peaks[0] == 0 and 0.09 < peaks[1] <= 0.1001, f'스피커: 오른쪽 채널만 {peaks}')
    pg.click('[data-act="spk-sweep"]')
    ok(until(pg, "/^Rising tone: [\\d,]+ Hz$/.test(document.querySelector('[data-v=\"spk\"]').textContent)") and pg.is_visible('[data-act="spk-stop"]'), f'스피커: 올라가는 소리와 멈추기 단추 ({text(pg, "[data-v=spk]")})')
    pg.click('[data-act="spk-stop"]')
    ok(not pg.is_visible('[data-act="spk-stop"]'), '스피커: 멈추기')
    # L16: 올라가는 소리가 나는 중에 탭이 가려지면 소리도 멈춘다
    pg.click('[data-act="spk-sweep"]')
    until(pg, "!document.querySelector('[data-act=\"spk-stop\"]').hidden")
    pg.evaluate("Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))")
    pg.wait_for_timeout(200)
    ok(not pg.is_visible('[data-act="spk-stop"]') and text(pg, '[data-v="spk"]') == 'Pick a side to play a short tone', f'스피커: 탭이 가려지면 올라가는 소리도 멈춤 ({text(pg, "[data-v=spk]")})')
    pg.evaluate("Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); 0")
    ok(not errs, f'스피커: 콘솔 오류 {errs[:2]}')
    c.close()
    # 한국어 마이크(휴대폰)
    c = ctx_of(b, True, locale='ko-KR', permissions=['microphone', 'camera'])
    pg = page_of(c)
    go(pg, '/ko/mic-test/')
    pg.evaluate('window.__freezeAt = 0.5')
    pg.click('[data-act="mic"]')
    ok(until(pg, "document.querySelector('[data-v=\"mic\"]').textContent === '마이크가 소리를 잡아요.'"), '한국어 마이크: 판정 글')
    until(pg, 'window.__freeze === true', timeout=8000)
    shot(pg, 'final-mic-ko-mobile')
    c.close()


def screen_pad(b):
    print('· 불량화소·주사율·게임패드', flush=True)
    c = ctx_of(b)
    errs = []
    pg = page_of(c, errs)
    go(pg, '/dead-pixel-test/')
    pg.click('[data-act="px-start"]')
    full = "document.querySelector('[data-px-full]')"
    ok(pg.evaluate(f"!{full}.hidden && getComputedStyle({full}).backgroundColor") == 'rgb(0, 0, 0)', '불량화소: 검정으로 시작')
    ok(pg.evaluate(f"{full}.childNodes.length === 0 && (() => {{ const r = {full}.getBoundingClientRect(); return r.width >= innerWidth && r.height >= innerHeight; }})()"), '불량화소: 화면을 가득 채우고 그 안에는 아무것도 없음')
    seen = []
    for _ in range(4):
        pg.keyboard.press('ArrowRight')
        seen.append(pg.evaluate(f"getComputedStyle({full}).backgroundColor"))
    ok(seen == ['rgb(255, 255, 255)', 'rgb(255, 0, 0)', 'rgb(0, 255, 0)', 'rgb(0, 0, 255)'], f'불량화소: 흰색·빨강·초록·파랑 순서 {seen}')
    pg.wait_for_timeout(1200)
    ok(pg.evaluate(f"getComputedStyle({full}).backgroundColor") == 'rgb(0, 0, 255)', '불량화소: 스스로 넘어가지 않음')
    pg.keyboard.press('ArrowRight')
    ok(pg.evaluate(f"{full}.hidden") and text(pg, '[data-v="px"]') == 'You looked at 5 of 5 colors.', '불량화소: 마지막 색 다음에 닫힘')
    pg.click('label.sw:nth-of-type(3)'); pg.click('[data-act="px-start"]')
    ok(pg.evaluate(f"getComputedStyle({full}).backgroundColor") == 'rgb(255, 0, 0)', '불량화소: 고른 색(빨강)부터')
    pg.click('[data-px-full]')
    ok(pg.evaluate(f"getComputedStyle({full}).backgroundColor") == 'rgb(0, 255, 0)', '불량화소: 누르면 다음 색')
    pg.keyboard.press('ArrowLeft')
    ok(pg.evaluate(f"getComputedStyle({full}).backgroundColor") == 'rgb(255, 0, 0)', '불량화소: ← 키로 앞의 색으로 돌아감')
    pg.keyboard.press('ArrowLeft')
    ok(pg.evaluate(f"getComputedStyle({full}).backgroundColor") == 'rgb(255, 0, 0)', '불량화소: 시작한 색에서는 ← 를 눌러도 그대로')
    pg.keyboard.press('ArrowRight')
    pg.keyboard.press('Escape')
    ok(pg.evaluate(f"{full}.hidden") and text(pg, '[data-v="px"]') == 'You looked at 2 of 5 colors.', '불량화소: Esc로 나가기')
    ok('← to go back' in text(pg, '.stage--px .act-row + .note') or 'Press ← to go back' in text(pg, '.stage--px .act-row + .note'), '불량화소: ← 키 안내')
    shot(pg, 'final-deadpixel-en')
    ok(not errs, f'불량화소: 콘솔 오류 {errs[:2]}')
    errs.clear()
    go(pg, '/refresh-rate-test/')
    ok(until(pg, "/times per second \\(\\d+ Hz\\)\\.$/.test(document.querySelector('[data-v=\"hz\"]').textContent)"), f'주사율: 판정 글 ({text(pg, "[data-v=hz]")})')
    ok(text(pg, '[data-vs="hz"]').startswith('Measured from 120 frames'), '주사율: 근거 한 줄(120장)')
    pg.click('[data-act="hz-bar"]')
    pg.wait_for_timeout(500)
    ok(pg.evaluate("document.querySelector('[data-act=\"hz-bar\"]').getAttribute('aria-pressed') === 'true' && /translateX/.test(document.querySelector('[data-band] i').style.transform)") and text(pg, '[data-act="hz-bar"]') == 'Stop the bar', '주사율: 움직이는 막대')
    shot(pg, 'final-refresh-en')
    pg.click('[data-act="hz-bar"]')
    ok(pg.evaluate("document.querySelector('[data-band] i').style.transform === ''") and text(pg, '[data-act="hz-bar"]') == 'Show moving bar', '주사율: 막대 멈춤(그리기 멈춤)')
    pg.click('[data-act="hz-again"]')
    ok(until(pg, "/times per second/.test(document.querySelector('[data-v=\"hz\"]').textContent)"), '주사율: 다시 재기')
    ok(not errs, f'주사율: 콘솔 오류 {errs[:2]}')
    c.close()
    # L3: 프레임이 한 장 걸러 빠지면(간격이 두 무리) 없는 값을 단정하지 않는다. 프레임 시각을 바꿔 넣어 본다
    RAF = "(() => { const raf = window.requestAnimationFrame.bind(window); let n = 0, t = 1000; const gaps = %s; window.requestAnimationFrame = (cb) => raf(() => { t += gaps[n++ %% gaps.length]; cb(t); }); })();"
    for gaps, want_main, want_sub, want_num, tag in (
            ('[1000 / 120, 1000 / 60]', 'Frames arrived unevenly, so the rate could not be measured exactly.', 'Close other tabs, turn off power saving and press Measure again.', '··', '120Hz에서 한 장 걸러 빠짐(가운데 값 80Hz)'),
            ('[1000 / 144, 2000 / 144]', 'Frames arrived unevenly, so the rate could not be measured exactly.', 'Close other tabs, turn off power saving and press Measure again.', '··', '144Hz에서 한 장 걸러 빠짐(가운데 값 96Hz)'),
            ('[1000 / 60, 1000 / 60, 1000 / 60, 1000 / 30, 1000 / 30]', 'Frames arrived unevenly, so the rate could not be measured exactly.', 'It looks like about 60 Hz. Close other tabs, turn off power saving and press Measure again.', '60', '60Hz에서 다섯 장 중 두 장이 늦음(고른 프레임 60%)')):
        c = ctx_of(b)
        c.add_init_script(RAF % gaps)
        pg = page_of(c)
        go(pg, '/refresh-rate-test/')
        got = until(pg, "document.querySelector('[data-v=\"hz\"]').textContent !== 'Measuring…'")
        ok(got and text(pg, '[data-v="hz"]') == want_main and text(pg, '[data-vs="hz"]') == want_sub and text(pg, '[data-hz]') == want_num, f'주사율 {tag}: 값을 단정하지 않음 ({text(pg, "[data-v=hz]")} / {text(pg, "[data-vs=hz]")} / {text(pg, "[data-hz]")})')
        ok(not pg.evaluate("document.querySelector('.stage--hz').classList.contains('is-on')"), f'주사율 {tag}: 불을 켜지 않음')
        if want_num == '··':
            shot(pg, 'final3-refresh-uneven')
            go(pg, '/')
            ok(until(pg, "document.querySelector('[data-state=\"hz\"]').textContent === 'uneven frames'") and text(pg, '.p-screen [data-hz]') == '··', f'첫 화면 {tag}: 화면 칸도 값을 말하지 않음 ({text(pg, "[data-state=hz]")})')
        c.close()
    # 게임패드: 가짜 컨트롤러
    FAKE = """(() => { const mk = (std) => ({ id: std ? 'Test Pad (STANDARD GAMEPAD)' : 'Odd Pad (Vendor: 1234 Product: 5678)', index: 0, connected: true, mapping: std ? 'standard' : '', timestamp: 0,
      axes: std ? [0.03, 0.04, 0, 0] : [0.03, 0.04, -1, 0, 0.5, -1], buttons: Array.from({ length: std ? 17 : 12 }, () => ({ pressed: false, touched: false, value: 0 })),
      vibrationActuator: std ? { playEffect: () => Promise.resolve('complete') } : null });
      window.__mk = mk; window.__pad = mk(%s); navigator.getGamepads = () => [window.__pad];
      window.__connect = () => { const e = new Event('gamepadconnected'); e.gamepad = window.__pad; window.dispatchEvent(e); };
      window.__disconnect = () => { const e = new Event('gamepaddisconnected'); e.gamepad = window.__pad; window.dispatchEvent(e); }; })()"""
    c = ctx_of(b)
    c.add_init_script(FAKE % 'true')
    errs = []
    pg = page_of(c, errs)
    go(pg, '/gamepad-tester/')
    ok(text(pg, '[data-v="pad"]') == 'Press any button on your controller' and pg.is_disabled('[data-act="pad-drift"]'), '게임패드: 연결 전')
    pg.evaluate('window.__connect()')
    ok(text(pg, '[data-v="pad"]') == 'Controller connected.' and 'Test Pad' in text(pg, '[data-vs="pad"]'), '게임패드: 연결됨')
    pg.evaluate('window.__pad.buttons[0] = { pressed: true, touched: true, value: 1 }; window.__pad.buttons[6] = { pressed: false, touched: true, value: 0.4 }')
    ok(until(pg, "document.querySelector('[data-pb=\"0\"]').classList.contains('is-down') && document.querySelector('[data-pb-v=\"6\"]').textContent === '40%'"), '게임패드: 단추 누름과 트리거 값')
    ok(until(pg, "/translate\\(1\\.3px, ?1\\.7px\\)/.test(document.querySelector('[data-stick=\"0\"]').style.transform)") and text(pg, '[data-stick-v="0"]') == '0.03, 0.04', '게임패드: 스틱 위치 ' + str(text(pg, '[data-stick-v="0"]')))
    pg.click('[data-act="pad-drift"]')
    ok(until(pg, "/Left stick rests 5\\.0% off center: slightly off\\. Right stick rests 0\\.0% off center: centered\\./.test(document.querySelector('[data-pad-drift]').textContent)", timeout=9000), f'게임패드: (0.03, 0.04) → 5.0% 조금 쏠림 ({text(pg, "[data-pad-drift]")})')
    shot(pg, 'final-gamepad-en')
    ok(pg.is_visible('[data-act="pad-rumble"]'), '게임패드: 진동 단추(지원할 때만)')
    pg.click('[data-act="pad-rumble"]')
    ok(until(pg, "document.querySelector('[data-pad-drift]').textContent === 'Vibration sent.'"), '게임패드: 진동')
    # M6: 평균은 가운데인데 좌우로 10%씩 튀는 스틱 → '가운데지만 떨려요'
    pg.evaluate("window.__flip = 1; setInterval(() => { window.__flip = -window.__flip; window.__pad.axes = [0.1 * window.__flip, 0, 0, 0]; }, 12); 0")
    pg.wait_for_timeout(100)
    pg.click('[data-act="pad-drift"]')
    ok(until(pg, "/^Left stick rests [0-2]\\.\\d% off center: centered on average, but jittery\\. It jumps by up to 1\\d\\.\\d% while resting\\. Right stick rests 0\\.0% off center: centered\\.$/.test(document.querySelector('[data-pad-drift]').textContent)", timeout=9000), f'게임패드: 가운데지만 떨리는 스틱을 따로 알림 ({text(pg, "[data-pad-drift]")})')
    shot(pg, 'final3-gamepad-jitter')
    ok('jittery' in text(pg, '.stage--pad .drift .note'), '게임패드: 떨림 기준을 이 사이트의 기준으로 밝힘')
    # 경계: 5.0%로 보이는 값은 '조금 쏠림', 15.0%는 '쏠림'(화면 글과 같게)
    for ax, word in (([0.05, 0, 0.15, 0], r'Left stick rests 5\.0% off center: slightly off\. Right stick rests 15\.0% off center: drifting\.'), ([0.049, 0, 0.149, 0], r'Left stick rests 4\.9% off center: centered\. Right stick rests 14\.9% off center: slightly off\.')):
        pg.evaluate("a => { window.__flip = 0; for (let i = 1; i < 9999; i++) clearInterval(i); window.__pad.axes = a; }", ax)
        pg.wait_for_timeout(120)
        pg.click('[data-act="pad-drift"]')
        ok(until(pg, "r => new RegExp('^' + r + '$').test(document.querySelector('[data-pad-drift]').textContent)", arg=word, timeout=9000), f'게임패드 경계 {ax}: ({text(pg, "[data-pad-drift]")})')
    go(pg, '/')
    pg.evaluate('window.__connect()')
    ok(text(pg, '[data-state="pad"]') == 'Controller connected' and pg.evaluate("document.querySelector('.p-pad').classList.contains('is-on')"), '첫 화면: 게임패드 칸')
    ok(not errs, f'게임패드: 콘솔 오류 {errs[:2]}')
    c.close()
    c = ctx_of(b)
    c.add_init_script(FAKE % 'false')
    pg = page_of(c)
    go(pg, '/gamepad-tester/')
    pg.evaluate('window.__connect()')
    names = pg.evaluate("[...document.querySelectorAll('.pbs .pb span')].map(e => e.textContent)")
    ok(names == [f'Button {i}' for i in range(12)] and not pg.is_visible('[data-act="pad-rumble"]'), f'게임패드: 표준 배치가 아니면 받은 단추 12개를 번호로, 진동 단추는 숨김 {names[:3]}…({len(names)})')
    axes = pg.evaluate("[...document.querySelectorAll('.axes .ax')].filter(e => e.offsetParent).map(e => e.firstChild.textContent + ' ' + e.lastChild.textContent)")
    ok(until(pg, "document.querySelectorAll('.axes .ax').length === 6 && document.querySelector('.axes .ax:nth-child(3) .num').textContent === '-1.00'") and not pg.is_visible('[data-sticks]') and text(pg, '[data-axes-h]') == 'Axes', f'게임패드: 축 6개를 전부 Axis N으로 보여 줌 {axes}')
    ok('buttons and axes are shown by number' in text(pg, '[data-vs="pad"]'), '게임패드: 배치를 모른다고 알림')
    pg.evaluate('window.__pad.buttons[11] = { pressed: true, touched: true, value: 1 }')
    ok(until(pg, "document.querySelector('[data-pb=\"11\"]').classList.contains('is-down')"), '게임패드: 12번째 단추 누름')
    pg.click('[data-act="pad-drift"]')
    ok(until(pg, "/^Resting values: Axis 0 0\\.03, Axis 1 0\\.04, Axis 2 -1\\.00, Axis 3 0\\.00, Axis 4 0\\.50, Axis 5 -1\\.00\\. /.test(document.querySelector('[data-pad-drift]').textContent)", timeout=9000) and 'drift' not in text(pg, '[data-pad-drift]').lower() and 'without a verdict' in text(pg, '[data-pad-drift]'),
       f'게임패드: 배치를 모르면 축 값만 보여 주고 쏠림이라고 하지 않음 ({text(pg, "[data-pad-drift]")})')
    shot(pg, 'final3-gamepad-nonstandard')
    # L4: 다른(표준) 컨트롤러로 바꾸면 이름·칸·문구가 처음으로 돌아간다
    pg.evaluate('window.__disconnect()')
    ok(text(pg, '[data-v="pad"]') == 'Controller disconnected.' and pg.is_disabled('[data-act="pad-drift"]') and text(pg, '[data-pad-drift]') == 'Let go of both sticks, then press the button.', '게임패드: 끊기면 문구가 처음으로')
    pg.evaluate('window.__pad = window.__mk(true); window.__connect()')
    names = pg.evaluate("[...document.querySelectorAll('.pbs .pb span')].map(e => e.textContent)")
    ok(len(names) == 17 and names[0] == 'A / Cross' and names[16] == 'Home' and pg.is_visible('[data-sticks]') and not pg.is_visible('[data-axes]') and text(pg, '[data-axes-h]') == 'Sticks', f'게임패드: 표준 컨트롤러로 바꾸면 자리 이름으로 다시 그림 {names[:2]}')
    ok(pg.evaluate("document.querySelectorAll('.pbs .pb.is-seen, .pbs .pb.is-down').length") == 0, '게임패드: 앞 컨트롤러의 불이 남지 않음')
    pg.click('[data-act="pad-rumble"]')
    until(pg, "document.querySelector('[data-pad-drift]').textContent === 'Vibration sent.'")
    pg.evaluate('window.__disconnect()')
    ok(not pg.is_visible('[data-act="pad-rumble"]') and text(pg, '[data-pad-drift]') != 'Vibration sent.', '게임패드: 끊긴 뒤에는 진동 단추와 "진동을 보냈어요"가 남지 않음')
    c.close()


LATE_JS = """
window.__late = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__late += e.value; }).observe({ type: 'layout-shift', buffered: true });
(() => { const md = navigator.mediaDevices; if (!md || !md.getUserMedia) return; const g = md.getUserMedia.bind(md);
  md.getUserMedia = c => new Promise((res, rej) => setTimeout(() => window.__deny ? rej(new DOMException('Permission denied', 'NotAllowedError')) : g(c).then(res, rej), 1500)); })();
"""


def late_shift(b):
    """권한 창에 1.5초 뒤에 답한 사람: 답한 뒤에 칸이 늘어나 아래가 밀리면 안 된다(누른 순간에 자리를 잡는다)."""
    print('· 권한 창에 늦게 답했을 때의 밀림', flush=True)
    worst = (0, '')
    for deny in (False, True):
        for path, mobile, sel in (('/', True, '.p-cam [data-act="cam"]'), ('/', True, '.p-mic [data-act="mic"]'), ('/', False, '.p-cam [data-act="cam"]'), ('/ko/', True, '.p-cam [data-act="cam"]'),
                                  ('/mic-test/', False, '[data-act="mic"]'), ('/mic-test/', True, '[data-act="mic"]'), ('/webcam-test/', False, '[data-act="cam"]'), ('/webcam-test/', True, '[data-act="cam"]')):
            c = ctx_of(b, mobile, permissions=['microphone', 'camera'])
            c.add_init_script(LATE_JS + ('window.__deny = true;' if deny else ''))
            pg = page_of(c)
            go(pg, path, 1200)
            h0 = pg.evaluate('window.__late')
            (pg.tap if mobile else pg.click)(sel)
            pg.wait_for_timeout(3600)
            late = pg.evaluate('window.__late') - h0
            tag = f'{path} {"휴대폰" if mobile else "컴퓨터"} {"거절" if deny else "허용"}'
            ok(late <= (0.03 if deny else 0.02), f'{tag}: 권한 창에 답한 뒤 화면 밀림 {late:.4f}')
            if not deny:
                ok(pg.evaluate("s => document.querySelector(s).closest('[data-dev]').classList.contains('is-on')", sel), f'{tag}: 늦게 허용해도 켜짐')
            worst = max(worst, (late, tag))
            c.close()
    notes.append(f'권한 창에 답한 뒤의 밀림 가운데 가장 큰 값 {worst[0]:.4f} ({worst[1]})')


def denied(p):
    print('· 권한 거절·장치 없음', flush=True)
    b = launch(p, ['--use-fake-device-for-media-stream', '--deny-permission-prompts'])       # 권한을 묻는 창을 거절로 닫는다
    c = ctx_of(b)
    pg = page_of(c)
    go(pg, '/mic-test/')
    pg.click('[data-act="mic"]')
    got = until(pg, "document.querySelector('.stage--mic').classList.contains('is-err')", timeout=12000)
    ok(got, '권한 거절: 빨간 불(×)')
    if got:
        main, sub = text(pg, '[data-v="mic"]'), text(pg, '[data-vs="mic"]')
        ok(main in ('Blocked for this site.', 'The permission prompt was closed.', 'Blocked by your system settings.', 'The browser did not allow it.') and len(sub) > 20, f'권한 거절: 이유와 다음에 할 일 ({main} / {sub})')
        ok(pg.is_visible('[data-act="mic"]') and not pg.is_visible('[data-act="mic-stop"]'), '권한 거절: 다시 누를 단추가 남아 있음')
        shot(pg, 'final-mic-en-denied')
    go(pg, '/')
    pg.click('.p-cam [data-act="cam"]')
    ok(until(pg, "document.querySelector('.p-cam').classList.contains('is-err')", timeout=12000) and len(text(pg, '[data-note="cam"]') or '') > 20, f'첫 화면: 카메라 거절 → 이유와 할 일 ({text(pg, "[data-state=cam]")} / {text(pg, "[data-note=cam]")})')
    ok(text(pg, '[data-tally]') in ('0', '1'), '거절은 "확인"으로 세지 않음')
    c.close(); b.close()
    b = launch(p, ['--use-fake-ui-for-media-stream'])            # 권한은 주지만 장치가 없다
    c = ctx_of(b)
    pg = page_of(c)
    go(pg, '/mic-test/')
    pg.click('[data-act="mic"]')
    if until(pg, "document.querySelector('.stage--mic').classList.contains('is-err') || document.querySelector('.stage--mic').classList.contains('is-on')", timeout=12000):
        if pg.evaluate("document.querySelector('.stage--mic').classList.contains('is-err')"):
            ok(text(pg, '[data-v="mic"]') == 'No device was found.', f'장치 없음: 안내 ({text(pg, "[data-v=mic]")})')
        else:
            notes.append('장치 없음 흐름: 이 기계에는 소리 장치가 잡혀서 볼 수 없었음')
    else:
        notes.append('장치 없음 흐름: 응답이 없어 볼 수 없었음')
    c.close(); b.close()


def others(b):
    print('· 동작 줄이기·어두운 화면·광고 자리·404·안내 띠·글', flush=True)
    # 동작 줄이기: 움직임 없이도 내용이 다 보이고 판정이 바뀐다
    c = ctx_of(b, reduced_motion='reduce')
    pg = page_of(c)
    go(pg, '/keyboard-test/')
    ok(not pg.evaluate("document.documentElement.classList.contains('anim')"), '동작 줄이기: anim 꺼짐')
    codes = pg.evaluate("CK.layout('full').keys.map(k => k.code)")
    for code in codes:
        pg.evaluate("c => { const o = {code: c, key: c, bubbles: true}; window.dispatchEvent(new KeyboardEvent('keydown', o)); window.dispatchEvent(new KeyboardEvent('keyup', o)); }", code)
    ok(text(pg, '[data-v="kb"]') == 'Every key on this layout has registered.' and pg.evaluate("getComputedStyle(document.querySelector('.kb--full .glow')).animationName") == 'none', '동작 줄이기: 띠 없이 판정 글만 바뀜')
    pg.evaluate('scrollTo(0, document.body.scrollHeight)'); pg.wait_for_timeout(300)
    ok(pg.evaluate("getComputedStyle(document.querySelector('.lumen-lamps i'), '::after').opacity") == '1', '동작 줄이기: 루멘랩 불이 켜진 채 보임')
    c.close()
    # 연출 1: 루멘랩 표시등 줄
    c = ctx_of(b)
    pg = page_of(c)
    go(pg, '/keyboard-test/')
    ok(not pg.evaluate("document.querySelector('[data-lumen]').classList.contains('in')") and pg.evaluate("getComputedStyle(document.querySelector('.lumen-lamps i'), '::after').opacity") == '0', '연출 1: 처음 열 때는 안 나옴(칸이 화면 밖)')
    pg.evaluate("document.querySelector('[data-lumen]').scrollIntoView({block: 'center'})")
    ok(until(pg, "document.querySelector('[data-lumen]').classList.contains('in')", timeout=6000), '연출 1: 칸이 들어오면 시작')
    pg.wait_for_timeout(1500)
    ok(pg.evaluate("getComputedStyle(document.querySelector('.lumen-lamps i:last-child'), '::after').opacity") == '1', '연출 1: 끝나면 다섯 불이 켜져 있음')
    shot(pg, 'final-lumen')
    ok(pg.evaluate("document.querySelector('[data-lumen]').getAttribute('href')") == 'https://lumenlab.page/en/', '루멘랩 링크: 영어판은 /en/')
    pg.evaluate('scrollTo(0, 0)'); pg.wait_for_timeout(200)
    pg.evaluate("document.querySelector('[data-lumen]').scrollIntoView({block: 'center'})"); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.getAnimations().filter(a => a.playState === 'running').length") == 0, '연출 1: 다시 와도 다시 안 나오고, 멈춰 있을 때 도는 움직임 0')
    go(pg, '/ko/')
    ok(pg.evaluate("document.querySelector('[data-lumen]').getAttribute('href')") == 'https://lumenlab.page/', '루멘랩 링크: 한국어판은 /')
    c.close()
    # 연출 3: 들려요 물결(한 번만)
    c = ctx_of(b, permissions=['microphone'])
    pg = page_of(c)
    go(pg, '/mic-test/')
    pg.evaluate("window.__rip = 0; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('ripple')) window.__rip++; }))).observe(document.querySelector('.stage--mic .lamp'), { childList: true })")
    pg.click('[data-act="mic"]')
    ok(until(pg, 'window.__rip === 2'), '연출 3: 소리를 처음 잡았을 때 고리 2개')
    ok(until(pg, "document.querySelectorAll('.ripple').length === 0", timeout=6000), '연출 3: 끝나면 고리를 지움')
    pg.click('[data-act="mic-stop"]'); pg.click('[data-act="mic"]')
    until(pg, "document.querySelector('[data-v=\"mic\"]').textContent === 'Your mic picks up sound.'")
    pg.wait_for_timeout(400)
    ok(pg.evaluate('window.__rip') == 2, '연출 3: 다시 켜도 다시 안 나옴')
    c.close()
    # 권한 창을 그냥 두면 답이 영영 안 올 수 있다: 15초 뒤 '다시 눌러 주세요' 안내, 단추는 그대로 눌린다
    c = ctx_of(b, permissions=['microphone'])
    pg = page_of(c)
    go(pg, '/mic-test/')
    pg.evaluate("navigator.mediaDevices.getUserMedia = () => new Promise(() => {}); 0")
    pg.click('[data-act="mic"]')
    ok(text(pg, '[data-v="mic"]') == 'Waiting for your permission' and text(pg, '[data-vs="mic"]') == 'Choose Allow in the browser prompt.', '권한을 기다리는 중: 처음 안내')
    ok(until(pg, "document.querySelector('[data-vs=\"mic\"]').textContent.startsWith('Still waiting for an answer.')", timeout=20000) and pg.is_enabled('[data-act="mic"]'), '권한 창을 그냥 둔 경우: 15초 뒤 다시 누르라는 안내, 단추는 눌림')
    c.close()
    # 어두운 화면
    c = ctx_of(b, color_scheme='dark')
    pg = page_of(c)
    go(pg, '/', 2600)
    bg = pg.evaluate("getComputedStyle(document.body).backgroundColor")
    ok(bg == 'rgb(15, 21, 25)', f'어두운 화면: 바탕 {bg}')
    for k in ('KeyD', 'KeyA', 'KeyR', 'KeyK'):
        press(pg, k)
    shot(pg, 'final-home-en-dark')
    pg.evaluate("sessionStorage.clear(); localStorage.setItem('ck.lang', '1'); 0")   # 한국어 첫 화면은 처음 상태로, 안내 띠 없이
    go(pg, '/ko/', 2600)
    ok(text(pg, '[data-state="kb"]') == '아무 키나 눌러 보세요' and text(pg, '[data-state="hz"]') == '스스로 잰 값', '한국어 첫 화면: 처음 상태 글자')
    shot(pg, 'final-home-ko-dark')
    c.close()
    # 광고 미리보기: 자리가 누르는 것에서 150px 넘게 떨어져 있다
    c = ctx_of(b)
    pg = page_of(c)
    worst = (9999, '')
    cta_worst = (9999, '')
    for path in PATHS:
        if path.rstrip('/').split('/')[-1] in ('about', 'privacy', 'guide'):
            continue
        go(pg, path + '?adpreview', 200)
        r = pg.evaluate("""() => { const ads = [...document.querySelectorAll('.ad-slot')].filter(a => a.offsetParent).map(a => a.getBoundingClientRect());
          const hot = [...document.querySelectorAll('.stage button, .stage select, .stage input, .stage summary, .stage a.btn, .bench button, .bench a, .stage audio')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect());
          const soft = [...document.querySelectorAll('main a, main summary, main button')].filter(e => e.offsetParent && !e.closest('.stage, .bench')).map(e => e.getBoundingClientRect());
          const gap = (a, b) => Math.max(a.top - b.bottom, b.top - a.bottom, 0);
          return { n: ads.length, hot: Math.min(...ads.flatMap(a => hot.map(h => gap(a, h))), 9999), soft: Math.min(...ads.flatMap(a => soft.map(h => gap(a, h))), 9999),
            w: ads.map(a => Math.round(a.width)), h: ads.map(a => Math.round(a.height)), label: [...document.querySelectorAll('.ad-label')].map(l => [l.textContent, parseFloat(getComputedStyle(l).fontSize)]),
            txt: [...document.querySelectorAll('.ad-slot')].map(a => a.textContent) }; }""")
        ok(r['n'] == 2, f'{path}: 광고 자리 2곳({r["n"]})')
        ok(r['hot'] >= 150, f'{path}: 광고 자리와 도구의 단추 사이 {r["hot"]:.0f}px(150 이상이어야 함)')
        ok(r['soft'] >= 40, f'{path}: 광고 자리와 글 속 링크·접는 줄 사이 {r["soft"]:.0f}px(40 이상이어야 함)')
        ok(all(w <= 760 for w in r['w']) and all(h >= 250 for h in r['h']), f'{path}: 광고 자리 폭·높이 {r["w"]} {r["h"]}')
        ok(all(l[0] in ('Ad', '광고') and l[1] >= 11 for l in r['label']) and all(t in ('Ad slot', '광고 자리') for t in r['txt']), f'{path}: 광고 표시 글자 {r["label"]} {r["txt"]}')
        if '/guide/' in path:      # 글: '테스트 열기' 단추 바로 아래에 광고 자리가 오지 않는다(150px 넘게)
            cta = pg.evaluate("""() => { const b = document.querySelector('.article .cta a.btn').getBoundingClientRect(); const gap = (a) => Math.max(a.top - b.bottom, b.top - a.bottom, 0);
              return Math.min(...[...document.querySelectorAll('.ad-slot')].filter(a => a.offsetParent).map(a => gap(a.getBoundingClientRect()))); }""")
            ok(cta >= 150, f'{path}: 테스트 열기 단추와 광고 자리 사이 {cta:.0f}px(150 이상이어야 함)')
            cta_worst = min(cta_worst, (cta, path))
        worst = min(worst, (r['hot'], path))
    notes.append(f'광고 자리와 도구 단추 사이 가장 가까운 곳 {worst[0]:.0f}px ({worst[1]})')
    notes.append(f'글의 테스트 열기 단추와 광고 자리 사이 가장 가까운 곳 {cta_worst[0]:.0f}px ({cta_worst[1]})')
    go(pg, [x for x in PATHS if '/guide/' in x and not x.endswith('/guide/')][0] + '?adpreview', 300)
    shot(pg, 'final3-article-adpreview', full=True)
    go(pg, '/mic-test/?adpreview', 300)
    shot(pg, 'final-adpreview', full=True)
    # 광고 없는 쪽에는 미리보기에서도 자리가 없다
    go(pg, '/about/?adpreview', 200)
    ok(pg.evaluate("document.querySelectorAll('[data-ad]').length") == 0, '소개: 광고 자리 없음')
    # 404
    resp = pg.goto(BASE + '/no-such-page/', wait_until='load')
    ok(resp.status == 404 and 'Page not found' in pg.inner_text('h1') and pg.evaluate("document.querySelectorAll('[data-ad], script[src*=adsbygoogle]').length") == 0, '404: 진짜 404, 광고 없음')
    shot(pg, 'final-404')
    resp = pg.goto(BASE + '/_dev/build.py', wait_until='load')
    ok(resp.status == 404, '개발 파일(_dev)은 로컬 서버에서도 404')
    # 글·소개·방침
    arts = [p_ for p_ in PATHS if '/guide/' in p_ and not p_.endswith('/guide/')]
    if arts:
        en = [a for a in arts if not a.startswith('/ko/')][0]
        go(pg, en, 400); shot(pg, 'final-article-en-desktop', full=True)
        ko = [a for a in arts if a.startswith('/ko/')][0]
        go(pg, ko, 400); shot(pg, 'final-article-ko-desktop', full=True)
    for a in arts:      # 표: 컴퓨터에서는 옆으로 밀지 않아도 모든 칸이 보인다
        go(pg, a, 200)
        cut = pg.evaluate("[...document.querySelectorAll('.tbl')].map(t => t.scrollWidth - t.clientWidth).filter(d => d > 1)")
        ok(not cut, f'{a}: 표가 칸 밖으로 넘침(컴퓨터) {cut}')
    go(pg, '/ko/', 2600); shot(pg, 'final-home-ko-desktop')
    go(pg, '/privacy/', 300); shot(pg, 'final-privacy-en', full=True)
    c.close()
    c = ctx_of(b, True, locale='ko-KR')
    pg = page_of(c)
    go(pg, '/ko/', 2600); shot(pg, 'final-home-ko-mobile')
    arts_ko = [a for a in PATHS if a.startswith('/ko/guide/') and not a.endswith('/guide/')]
    if arts_ko:
        go(pg, arts_ko[0], 400); shot(pg, 'final-article-ko-mobile', full=True)
        over = pg.evaluate("[...document.querySelectorAll('.tbl')].filter(t => t.getBoundingClientRect().right > innerWidth + 1).length")
        ok(over == 0, '글(휴대폰): 표를 감싼 칸이 화면 밖으로 나가지 않음')
    for a in [x for x in PATHS if '/guide/' in x and not x.endswith('/guide/')]:      # 표: 휴대폰 390에서도 모든 칸이 보인다(긴 글 표는 줄 카드)
        go(pg, a, 200)
        r = pg.evaluate("({ cut: [...document.querySelectorAll('.tbl')].map(t => t.scrollWidth - t.clientWidth).filter(d => d > 1), cards: [...document.querySelectorAll('.tbl--cards td')].every(td => getComputedStyle(td).display === 'block'), th: [...document.querySelectorAll('.tbl td')].every(td => td.dataset.th) })")
        ok(not r['cut'] and r['cards'] and r['th'], f'{a}: 표(휴대폰) 넘침 {r["cut"]}, 줄 카드 {r["cards"]}, 칸 이름 {r["th"]}')
    if arts_ko:
        mic_ko = [a for a in arts_ko if 'maikeu' in a]
        if mic_ko:
            go(pg, mic_ko[0], 300); pg.evaluate("document.querySelector('.tbl').scrollIntoView({block: 'start'})"); pg.wait_for_timeout(200); shot(pg, 'final-article-ko-mobile-table')
    go(pg, '/ko/keyboard-test/', 300); shot(pg, 'final-keyboard-ko-mobile')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.strip-in')).display") == 'grid' and pg.evaluate("document.querySelector('.strip').scrollWidth <= innerWidth"), '휴대폰: 기기 띠가 넘치지 않고 다 보임')
    # 다른 언어 안내 띠: 한국어 브라우저로 영어 쪽 → 띠가 뜨고(겹쳐서), 닫으면 다시 안 뜸
    # 손가락으로 누르는 화면: 누르는 곳의 높이 44px 이상(L7). 글 속 링크는 뺀다
    SMALL = """() => [...document.querySelectorAll('button, select, summary, input[type=number], .strip a, .top-nav a, a.go, .foot-links a, .tool-list a, .guide-list a, .crumb a, .desk-note a, a.btn, label.sw, .lumen')]
      .filter(e => e.offsetParent && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 43.5).map(e => (e.className || e.tagName) + ':' + (e.textContent || '').trim().slice(0, 16) + ':' + Math.round(e.getBoundingClientRect().height))"""
    for path in ('/ko/', '/ko/keyboard-test/', '/ko/mouse-test/', '/ko/mic-test/', '/ko/webcam-test/', '/ko/speaker-test/', '/ko/dead-pixel-test/', '/ko/refresh-rate-test/', '/ko/gamepad-tester/', '/ko/guide/', arts_ko[0] if arts_ko else '/ko/about/', '/'):
        go(pg, path, 250)
        pg.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
        small = pg.evaluate(SMALL)
        ok(not small, f'{path} (휴대폰): 44px보다 낮은 누르는 곳 {small[:5]}')
    # 다른 언어 안내 띠(M7): 한국어 브라우저로 영어 쪽 → 화면 아래에 뜨고, 누르는 것을 덮지 않는다. 닫으면 다시 안 뜸
    COVER = """() => { const bar = document.querySelector('.lang-bar'); if (!bar || bar.classList.contains('is-away')) return [];
      const b = bar.getBoundingClientRect(); return [...document.querySelectorAll('a, button, select, input, summary')].filter(e => !bar.contains(e) && e.offsetParent).filter(e => { const r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top)) return false;
        const x = (Math.max(r.left, b.left) + Math.min(r.right, b.right)) / 2, y = (Math.max(r.top, b.top) + Math.min(r.bottom, b.bottom)) / 2;      // 겹친 자리에 실제로 그 요소가 있는지(접힌 칸 안의 것은 뺀다)
        return document.elementsFromPoint(x, y).some(h => h === e || e.contains(h)); }).map(e => (e.textContent || e.tagName).trim().slice(0, 20)); }"""
    for path in ('/keyboard-test/', '/mic-test/', '/'):
        go(pg, path, 600)
        ok(pg.evaluate("!!document.querySelector('.lang-bar')") and pg.evaluate("getComputedStyle(document.querySelector('.lang-bar')).position") == 'fixed', f'{path}: 안내 띠가 화면 아래에 겹쳐 뜸(끼워 넣지 않음)')
        tabs = pg.evaluate("""() => [...document.querySelectorAll('.strip a')].every(a => { const r = a.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return top === a || a.contains(top); })""")
        ok(tabs, f'{path}: 기기 띠의 탭이 전부 눌림(안내 띠가 가리지 않음)')
        hits = []
        for y in range(0, 2600, 180):
            pg.evaluate('y => scrollTo(0, y)', y); pg.wait_for_timeout(90)
            hits += pg.evaluate(COVER)
        ok(not hits, f'{path}: 스크롤하는 동안 안내 띠가 누르는 것을 덮지 않음 {hits[:4]}')
        pg.evaluate('scrollTo(0, 0)'); pg.wait_for_timeout(120)
    go(pg, '/', 600)
    pg.evaluate("document.querySelector('.sec').scrollIntoView({block: 'end'})"); pg.wait_for_timeout(250)
    bar = pg.evaluate("(() => { const r = document.querySelector('.lang-bar').getBoundingClientRect(), x = document.querySelector('.lang-bar button').getBoundingClientRect(); return { bottom: innerHeight - r.bottom, x: [x.width, x.height], away: document.querySelector('.lang-bar').classList.contains('is-away') }; })()")
    ok(bar['x'][0] >= 44 and bar['x'][1] >= 44 and 0 <= bar['bottom'] <= 40, f'안내 띠: 화면 아래 작은 띠, 닫기 단추 44px 이상 {bar}')
    shot(pg, 'final3-langbar-mobile')
    ok(pg.evaluate("document.querySelector('.lang-bar a').getAttribute('href')") == '/ko/' and pg.evaluate("document.querySelector('.lang-bar a').lang") == 'ko', '안내 띠: 한국어 브라우저에 영어 쪽 → 한국어판 안내')
    ok(pg.evaluate("document.documentElement.lang") == 'en', '안내 띠: 넘기지 않고 알려만 줌')
    if bar['away']:
        pg.evaluate('scrollTo(0, 0)'); pg.wait_for_timeout(200)
    pg.evaluate("document.querySelector('.lang-bar button').click()")
    go(pg, '/', 400)
    ok(not pg.evaluate("!!document.querySelector('.lang-bar')") and pg.evaluate("localStorage.getItem('ck.lang')") == '1', '안내 띠: 닫으면 다시 안 뜸(ck.lang)')
    c.close()


def fake_voice(folder):
    """가짜 마이크에 넣을 소리: 440Hz, 꼭대기 0.1(-20 dBFS)인 사인 2초. 크롬의 기본 가짜 소리(삑)는 꼭대기까지 꽉 차서
    소리 다듬기를 끈 지금은 '너무 커요'로 나온다(그 판정은 따로 확인한다). 보통 크기의 소리로 나머지 흐름을 본다."""
    path = os.path.join(folder, 'voice.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(48000)
        w.writeframes(b''.join(struct.pack('<h', int(3277 * math.sin(2 * math.pi * 440 * i / 48000))) for i in range(96000)))
    return path


def main():
    t0 = time.time()
    tmp = tempfile.mkdtemp(prefix='ck-e2e-')
    with sync_playwright() as p:
        b = launch(p, ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-audio-capture=' + fake_voice(tmp)])
        only = [x for x in os.environ.get('CK_ONLY', '').split(',') if x]
        for fn in (all_pages, home, keyboard, quirks, mouse, mic_cam_spk, screen_pad, late_shift, others):
            if only and fn.__name__ not in only:
                continue
            try:
                fn(b)
            except Exception as e:      # 한 묶음이 죽어도 나머지는 본다
                ok(False, f'{fn.__name__}: 확인이 중간에 멈춤 → {str(e)[:300]}')
        b.close()
        try:
            if not os.environ.get('CK_ONLY') or 'denied' in os.environ['CK_ONLY']:
                denied(p)
        except Exception as e:
            ok(False, f'denied: 확인이 중간에 멈춤 → {str(e)[:300]}')
    shutil.rmtree(tmp, ignore_errors=True)
    print(f'{"실패" if fails else "통과"}  화면 확인: {passed}개 통과' + (f', {len(fails)}개 실패' if fails else '') + f' ({time.time() - t0:.0f}초)')
    for n in notes:
        print('   ·', n)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
