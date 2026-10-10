#!/usr/bin/env python3
"""체크벤치 화면 확인(Playwright): python3 check/_dev/e2e.py [스크린샷 폴더]   (먼저 node check/_dev/serve.mjs 8444)

- 모든 쪽: 콘솔 오류 0, 깨진 그림 0, 320px 가로 스크롤 0, 처음 열 때 화면 밀림(CLS) 0.02 이하(컴퓨터·휴대폰, CPU 4배 느리게).
- 도구를 실제로 눌러 본다: 키보드(누름·동시 입력·채터링·배열 바꾸기·모든 키·키 잡기 풀기), 마우스(단추 다섯·휠·더블클릭 의심·초당 보고 수),
  마이크·카메라(가짜 장치: 켜기·끄기·녹음·사진·탭이 가려지면 꺼짐), 스피커, 불량화소(색 넘기기), 주사율, 게임패드(가짜 컨트롤러), 권한 거절.
- 그 밖: 이 탭에서 해 본 테스트의 불이 다른 쪽에서도 켜져 있는지, 동작 줄이기, 어두운 화면, 광고 미리보기 자리와 단추 사이 거리(150px 이상), 404, 다른 언어 안내 띠.
- 진짜 소리·좌우·실기기·아이폰 사파리는 여기서 볼 수 없다(보고에 '못 함'으로 적는다).
- 브라우저는 한 번에 하나만 띄운다. 느린 기계에서도 돌게 기다리는 시간을 넉넉히 잡았다. CK_ONLY=home,keyboard 처럼 묶음을 골라 돌릴 수 있다
  (all_pages, home, keyboard, mouse, mic_cam_spk, screen_pad, late_shift, others, denied).
- CK_FONT=<PretendardVariable.woff2 경로> 를 주면 글꼴 요청을 그 파일로 대신한다(작업 공간에서는 글꼴 CDN이 안 열린다). 없으면 글꼴 요청을 끊는다.
"""
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE = 'http://localhost:8444'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
FONT = Path(os.environ['CK_FONT']).read_bytes() if os.environ.get('CK_FONT') and Path(os.environ['CK_FONT']).exists() else None
EXE = sorted(Path('/opt/pw-browsers').glob('chromium-*/chrome-linux/chrome'))
PATHS = [u.text.replace('https://check.lumenlab.page', '') for u in ET.parse(ROOT / 'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
fails, passed, notes = [], 0, []
WAIT = 20000


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
    if 'cdn.jsdelivr.net' in u:
        return r.fulfill(body=FONT, content_type='font/woff2', headers={'access-control-allow-origin': '*', 'cache-control': 'max-age=86400'}) if FONT else r.abort()
    return r.continue_()


def launch(p, extra=()):
    return p.chromium.launch(executable_path=str(EXE[0]) if EXE else None, args=['--no-proxy-server', '--autoplay-policy=no-user-gesture-required', *extra])


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
    for path in PATHS + ['/no-such-page/']:
        pg.goto(BASE + path, wait_until='load')
        for w in (320, 360, 375):
            pg.set_viewport_size({'width': w, 'height': 640})
            pg.wait_for_timeout(80)
            over = pg.evaluate("Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('header *, main > *, footer *')].map(e => Math.ceil(e.getBoundingClientRect().right))) - document.documentElement.clientWidth")
            ok(over <= 0, f'{path}: 폭 {w}px에서 가로로 {over}px 넘침')
            wide = max(wide, (over, f'{path} {w}px'))
    c.close()
    notes.append(f'가장 큰 화면 밀림 {worst[0]:.4f} ({worst[1]})')
    notes.append(f'좁은 화면(320·360·375px, 휴대폰 흉내 없이) 가로 넘침 최대 {wide[0]}px')


def home(b):
    print('· 첫 화면 점검판', flush=True)
    c = ctx_of(b, permissions=['microphone', 'camera'])
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
    ok(pg.evaluate("getComputedStyle(document.querySelector('.stage--kb .kb--full')).display") == 'block' and pg.evaluate("[...document.querySelectorAll('.stage--kb .kb')].filter(s => getComputedStyle(s).display !== 'none').length") == 1, '키보드: 배열 그림은 하나만 보임')
    press(pg, 'KeyA')
    ok(text(pg, '[data-v="kb"]') == '1 key pressed, and it registered.' and text(pg, '[data-vs="kb"]') == '103 keys on this layout not pressed yet.', '키보드: 첫 키 판정 글')
    for k in ('KeyA', 'KeyS', 'KeyD', 'KeyF'):
        pg.keyboard.down(k); pg.wait_for_timeout(60)
    ok(text(pg, '[data-kb-max]') == '4 worked' and text(pg, '[data-kb-held]') == 'A + S + D + F', f'키보드: 동시 4키 ({text(pg, "[data-kb-max]")} / {text(pg, "[data-kb-held]")})')
    ok(pg.evaluate("document.querySelectorAll('.stage--kb .kb--full .key.is-down').length") == 4, '키보드: 눌린 키 4개가 진하게')
    for k in ('KeyA', 'KeyS', 'KeyD', 'KeyF'):
        pg.keyboard.up(k)
    pg.wait_for_timeout(80)
    ok(text(pg, '[data-kb-held]') == 'none' and pg.evaluate("document.querySelectorAll('.key.is-down').length") == 0, '키보드: 떼면 눌린 표시가 사라짐')
    # 키 잡기: Tab이 초점을 옮기지 않는다 → Esc 두 번 → 옮긴다 → 자판을 누르면 다시 잡는다
    press(pg, 'Tab')
    ok(pg.evaluate("document.activeElement === document.body") and pg.evaluate("document.querySelector('.kb--full [data-code=Tab]').classList.contains('is-seen')"), '키보드: 테스트 중 Tab은 초점을 옮기지 않고 불만 켜짐')
    press(pg, 'Escape'); press(pg, 'Escape')
    ok(text(pg, '[data-kb-cap]').startswith('Released'), '키보드: Esc 두 번이면 키를 돌려줌')
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
    ok(text(pg, '[data-vs="kb"]').startswith('A second press arrived within 30 ms') and text(pg, '[data-kb-chatter]') == '1 key suspected', '키보드: 기준(30 ms)을 판정 글에 밝힘')
    ok(pg.evaluate("document.querySelector('.stage--kb').classList.contains('is-warn') && document.querySelector('.kb--full [data-code=KeyE]').classList.contains('is-warn')"), '키보드: 의심 키와 불이 주황')
    shot(pg, 'final-keyboard-en-chatter')
    # 자세히: code·key, 배열 밖 키, 기준 바꾸기
    pg.click('.more summary')
    ok(text(pg, '[data-kb-code]') == 'KeyE' and text(pg, '[data-kb-key]') == 'e', '키보드: 자세히 보기에 code·key')
    pg.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', {code: 'IntlBackslash', key: '\\\\', bubbles: true}))")
    ok(text(pg, '[data-kb-extra]') == 'IntlBackslash', '키보드: 배열에 없는 키는 따로 알려 줌')
    pg.fill('[data-kb-thr]', '10'); pg.dispatch_event('[data-kb-thr]', 'change')
    ok(pg.evaluate("localStorage.getItem('ck.chatter')") == '10', '키보드: 기준을 바꾸면 기기에 남김(ck.chatter)')
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
    ok(text(pg, '[data-kb-count]') == '86 of 87' and not pg.evaluate("document.querySelector('.kb--tkl').classList.contains('sweep')"), '키보드: 하나 남았을 때는 연출이 없음')
    pg.evaluate("c => window.dispatchEvent(new KeyboardEvent('keydown', {code: c, key: c, bubbles: true}))", codes[-1])
    ok(text(pg, '[data-v="kb"]') == 'Every key on this layout has registered.' and text(pg, '[data-kb-count]') == '87 of 87', '키보드: 마지막 키 → "Every key on this layout has registered."')
    ok(pg.evaluate("document.querySelector('.kb--tkl').classList.contains('sweep') && getComputedStyle(document.querySelector('.kb--tkl .glow')).animationName === 'row-glow'"), '연출 2(불 지나가기): 마지막 키에서 시작')
    press(pg, 'KeyQ')
    ok(pg.evaluate("document.querySelector('.kb--tkl [data-code=KeyQ]').classList.contains('is-seen')"), '연출 2: 지나가는 중에도 키가 먹음')
    shot(pg, 'final-keyboard-en-all')
    ok(until(pg, "!document.querySelector('.kb--tkl').classList.contains('sweep')", timeout=6000), '연출 2: 끝나면 덧칠이 멈춤')
    pg.click('[data-act="kb-reset"]')
    for code in codes:
        pg.evaluate("c => { const o = {code: c, key: c, bubbles: true}; window.dispatchEvent(new KeyboardEvent('keydown', o)); window.dispatchEvent(new KeyboardEvent('keyup', o)); }", code)
    ok(text(pg, '[data-kb-count]') == '87 of 87' and not pg.evaluate("document.querySelector('.kb--tkl').classList.contains('sweep')"), '연출 2: 같은 방문에서 다시 다 눌러도 다시 안 나옴')
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
    ok(text(pg, '[data-m-dbl]') == '1 suspected' and text(pg, '[data-vs="mouse"]').startswith('A second click arrived within 50 ms'), '마우스: 기준(50 ms)을 밝힘')
    pg.click('[data-act="mouse-reset"]')
    ok(text(pg, '[data-m-rate]') == 'move it quickly' or text(pg, '[data-v="mouse"]') == 'The mouse responds.', '마우스: 처음부터')
    ok(not errs, f'마우스: 콘솔 오류 {errs[:2]}')
    c.close()


def mic_cam_spk(b):
    print('· 마이크·카메라·스피커(가짜 장치)', flush=True)
    c = ctx_of(b, permissions=['microphone', 'camera'])
    errs = []
    pg = page_of(c, errs)
    go(pg, '/mic-test/')
    pg.evaluate('window.__seen = 0; setInterval(() => { const m = document.querySelector("[data-mic-meter] i").style.transform.match(/scaleX\\(([\\d.]+)/); if (m && +m[1] > window.__seen) window.__seen = +m[1]; }, 30)')
    pg.click('[data-act="mic"]')
    ok(until(pg, "document.querySelector('[data-v=\"mic\"]').textContent === 'Your mic picks up sound.'"), f'마이크: 소리를 잡음 ({text(pg, "[data-v=mic]")})')
    ok(pg.evaluate('window.__seen') > 0.3, '마이크: 막대가 움직임')
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
    # 탭이 가려지면 스스로 끈다
    pg.click('[data-act="mic"]')
    until(pg, "!document.querySelector('[data-act=\"mic-stop\"]').hidden")
    pg.evaluate("Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))")
    ok(pg.is_visible('[data-act="mic"]') or pg.evaluate("document.querySelector('[data-act=\"mic-stop\"]').hidden"), '마이크: 탭이 가려지면 꺼짐')
    ok(not errs, f'마이크: 콘솔 오류 {errs[:2]}')
    # 카메라
    errs.clear()
    go(pg, '/webcam-test/')
    pg.click('[data-act="cam"]')
    ok(until(pg, "document.querySelector('[data-v=\"cam\"]').textContent === 'Your camera works.' && document.querySelector('[data-cam-video]').videoWidth > 0"), '카메라: 켜짐')
    ok(until(pg, "/frames per second/.test(document.querySelector('[data-vs=\"cam\"]').textContent)", timeout=15000), f'카메라: 크기와 초당 장 수 ({text(pg, "[data-vs=cam]")})')
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
    pg.keyboard.press('Escape')
    ok(pg.evaluate(f"{full}.hidden") and text(pg, '[data-v="px"]') == 'You looked at 2 of 5 colors.', '불량화소: Esc로 나가기')
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
    # 게임패드: 가짜 컨트롤러
    FAKE = """(() => { const mk = (std) => ({ id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: std ? 'standard' : '', timestamp: 0,
      axes: [0.03, 0.04, 0, 0], buttons: Array.from({ length: std ? 17 : 12 }, () => ({ pressed: false, touched: false, value: 0 })),
      vibrationActuator: std ? { playEffect: () => Promise.resolve('complete') } : null });
      window.__pad = mk(%s); navigator.getGamepads = () => [window.__pad];
      window.__connect = () => { const e = new Event('gamepadconnected'); e.gamepad = window.__pad; window.dispatchEvent(e); }; })()"""
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
    ok(text(pg, '[data-pb-name="0"]') == 'Button 0' and pg.evaluate("document.querySelector('[data-pb=\"12\"]').hidden") and not pg.is_visible('[data-act="pad-rumble"]'), '게임패드: 표준 배치가 아니면 번호로, 진동 단추는 숨김')
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
        ok(main in ('Blocked for this site.', 'The permission prompt was closed.', 'Blocked by your system settings.') and len(sub) > 20, f'권한 거절: 이유와 다음에 할 일 ({main} / {sub})')
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
        worst = min(worst, (r['hot'], path))
    notes.append(f'광고 자리와 도구 단추 사이 가장 가까운 곳 {worst[0]:.0f}px ({worst[1]})')
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
    go(pg, '/', 600)
    ok(pg.is_visible('.lang-bar') and pg.evaluate("getComputedStyle(document.querySelector('.lang-bar')).position") == 'absolute' and pg.evaluate("document.querySelector('.lang-bar a').getAttribute('href')") == '/ko/' and pg.evaluate("document.querySelector('.lang-bar a').lang") == 'ko', '안내 띠: 한국어 브라우저에 영어 쪽 → 한국어판 안내')
    ok(pg.evaluate("document.documentElement.lang") == 'en', '안내 띠: 넘기지 않고 알려만 줌')
    pg.click('.lang-bar button')
    go(pg, '/', 400)
    ok(not pg.evaluate("!!document.querySelector('.lang-bar')") and pg.evaluate("localStorage.getItem('ck.lang')") == '1', '안내 띠: 닫으면 다시 안 뜸(ck.lang)')
    c.close()


def main():
    t0 = time.time()
    with sync_playwright() as p:
        b = launch(p, ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'])
        only = [x for x in os.environ.get('CK_ONLY', '').split(',') if x]
        for fn in (all_pages, home, keyboard, mouse, mic_cam_spk, screen_pad, late_shift, others):
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
    print(f'{"실패" if fails else "통과"}  화면 확인: {passed}개 통과' + (f', {len(fails)}개 실패' if fails else '') + f' ({time.time() - t0:.0f}초)')
    for n in notes:
        print('   ·', n)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
