"""맛보기 판을 실제로 눌러 풀고(두 판), 페이지 장치를 눌러 본다. python3 _dev/play_test.py [주소] [출력폴더]
한국어(움직임 켬)·영어(움직임 줄이기) 둘 다:
  맛보기  틀린 수 안내 두 가지, 힌트 출발·도착 표시, 1판 풀기 → 둥지, 완료 창, 2판 꾹 눌러 능력, 되돌리기, 2판 풀기
  완료 창  주 단추(말·주소가 build.CTA와 같음), '다음 판'은 글자 링크, 창이 보이는 동안 하단 줄 숨김
  스토어  끝 칸 배지 둘이 보이면 하단 줄 숨김, 안드로이드·아이폰에선 주 단추가 그 스토어 주소로
  친구 무대  앞뒤 단추로 넘기기, 12마리 줄에서 고르면 그 무대가 가운데로(능력 한 줄·영상)
  질문  접고 펴기
  첫 화면  360×640·390×700에서 되돌리기·힌트·다시 하기와 주 단추가 보임
  기타  주 단추 모든 자리의 주소 상수, 둥근 글꼴 글자 빠짐(창 글자 포함), 판이 화면 밖일 때 rAF 0, 콘솔 오류 0"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build  # noqa: E402
from fontTools.ttLib import TTFont  # noqa: E402
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:' + os.environ.get('PORT', '8792')
OUT = sys.argv[2] if len(sys.argv) > 2 else None
EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
CMAP = TTFont(os.path.join(os.path.dirname(HERE), 'assets/head.woff2')).getBestCmap()
RAF = """(()=>{const o=window.requestAnimationFrame.bind(window);window.__raf=0;window.__rafBoard=0;window.requestAnimationFrame=function(cb){if((new Error().stack||'').indexOf('chick-board.js')>=0)window.__rafBoard++;else window.__raf++;return o(cb)};})()"""
ROUND_TEXT = """() => [...document.querySelectorAll('body *')].filter(e => {
  const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return false;
  return s.fontFamily.startsWith('"CR Round"') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
}).map(e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('')).join('')"""
fails = []
def check(c, msg):
    print(('통과 ' if c else '실패 ') + msg)
    if not c: fails.append(msg)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE)
    for i, (path, motion) in enumerate((('/', 'no-preference'), ('/en/', 'reduce'))):
        href, label = build.CTA['href'][i], build.CTA['label'][i]
        pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=False, reduced_motion=motion)
        pg.add_init_script(RAF)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto(BASE + path, wait_until='networkidle')
        tube = lambda n: pg.locator('.board .tube').nth(n)
        def tap(n): tube(n).click(); pg.wait_for_timeout(800)  # 게임 손맛 판: 옮기기·흔들림이 끝날 때까지
        round_text = pg.evaluate(ROUND_TEXT)
        # 주 단추: 모든 자리의 말·주소가 build.CTA 상수
        hrefs = pg.eval_on_selector_all('[data-cta]', 'es => es.map(e => [e.getAttribute("href"), e.textContent.trim()])')
        check(len(hrefs) == 3 and all(h == href and t == label for h, t in hrefs), f'{path} 주 단추 3곳이 상수 말·주소 ({len(hrefs)})')
        check(pg.is_visible('#dock .cta'), f'{path} 첫 화면 하단 줄 주 단추 보임')
        # 틀린 수: 꽉 찬 튜브(1)로, 맨 위가 다른 튜브(3)로
        tap(0); tap(1)
        check('꽉 찼' in pg.inner_text('.demo-tip') or 'full' in pg.inner_text('.demo-tip'), f'{path} 꽉 찬 튜브 안내')
        tap(0); tap(3)
        check('못 가요' in pg.inner_text('.demo-tip') or "Can’t" in pg.inner_text('.demo-tip'), f'{path} 틀린 수 안내')
        # 힌트: 출발 튜브와 도착 튜브에 다른 표시
        pg.click('[data-act=hint]'); pg.wait_for_timeout(200)
        check(pg.locator('.tube.is-hint').count() == 2, f'{path} 힌트가 튜브 둘을 가리킴')
        labels = pg.eval_on_selector_all('.tube.is-hint', 'es => es.map(e => e.dataset.hint)')
        check(len(set(labels)) == 2 and all(labels), f'{path} 힌트 출발·도착 표시 ({labels})')
        for a, c in ((2, 0), (1, 2), (3, 1)): tap(a); tap(c)
        pg.wait_for_timeout(3500)
        check(pg.locator('.nest-slot[data-full]').count() == 1, f'{path} 병아리가 둥지에')
        check(pg.is_visible('.demo-done'), f'{path} 1판 완료 창')
        # 완료 창: 주 단추 하나 + 글자 링크, 하단 줄 숨김
        check(pg.is_visible('.demo-done .cta') and pg.get_attribute('.demo-done .cta', 'href') == href and pg.inner_text('.demo-done .cta').strip() == label,
              f'{path} 완료 창 주 단추 = 「{label}」')
        nxt = pg.locator('.demo-done [data-act=next]')
        check(nxt.is_visible() and 'btn-link' in (nxt.get_attribute('class') or '') and pg.evaluate("getComputedStyle(document.querySelector('.demo-done [data-act=next]')).textDecorationLine") == 'underline',
              f'{path} 완료 창 다음 판은 글자 링크')
        pg.wait_for_timeout(500)
        check(not pg.is_visible('#dock .cta') or 'is-off' in (pg.get_attribute('#dock', 'class') or ''), f'{path} 완료 창 동안 하단 줄 숨김')
        round_text += pg.evaluate(ROUND_TEXT)
        if OUT and motion != 'reduce': pg.screenshot(path=f'{OUT}/done1.png')
        pg.click('.demo-done [data-act=next]'); pg.wait_for_timeout(900)
        check(pg.locator('.board .tube').count() == 5, f'{path} 2판(튜브 5개)')
        pg.wait_for_timeout(500)
        check('is-off' not in (pg.get_attribute('#dock', 'class') or ''), f'{path} 창을 닫으면 하단 줄 다시 보임')
        # 다람쥐 꾹 누르기: 튜브 2의 바닥(0번째) 다람쥐
        box = tube(2).bounding_box()
        slot = (box['height'] - 20) / 4
        x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] - 10 - slot / 2
        pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(600); pg.mouse.up(); pg.wait_for_timeout(1200)
        check('이동 1번' in pg.inner_text('.demo-count') or 'Moves 1' in pg.inner_text('.demo-count'), f'{path} 꾹 눌러 능력(이동 1)')
        # 되돌리기 후 다시
        pg.click('[data-act=undo]'); pg.wait_for_timeout(700)
        check('0' in pg.inner_text('.demo-count'), f'{path} 되돌리기')
        pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(600); pg.mouse.up(); pg.wait_for_timeout(1200)
        tap(2); tap(4); tap(1); tap(2)
        pg.wait_for_timeout(3500)
        check(pg.is_visible('.demo-done'), f'{path} 2판 완료 창')
        check(pg.is_visible('.demo-done .cta') and pg.get_attribute('.demo-done .cta', 'href') == href, f'{path} 2판 완료 창 주 단추')
        round_text += pg.evaluate(ROUND_TEXT)
        if OUT and motion != 'reduce': pg.screenshot(path=f'{OUT}/done2.png')
        # 친구 무대: 넘기기와 고르기
        pg.locator('#friends').scroll_into_view_if_needed(); pg.wait_for_timeout(500)
        pressed = lambda: pg.get_attribute('.pick[aria-pressed=true]', 'data-k')
        centered = lambda k: pg.evaluate("""k => { const t = document.querySelector('#track').getBoundingClientRect(), s = document.querySelector('#st-' + k).getBoundingClientRect();
            return s.left >= t.left - 2 && s.right <= t.right + 2; }""", k)
        check(pressed() == 'squirrel', f'{path} 친구 무대 처음은 다람쥐')
        pg.click('.nav-next'); pg.wait_for_timeout(900)
        check(pressed() == 'frog' and centered('frog'), f'{path} 다음 단추로 개구리 무대')
        pg.click('.nav-prev'); pg.wait_for_timeout(900)
        check(pressed() == 'squirrel' and centered('squirrel'), f'{path} 이전 단추로 다람쥐 무대')
        pg.click('.pick[data-k=whale]'); pg.wait_for_timeout(1100)
        say = pg.inner_text('#st-whale .say')
        check(pressed() == 'whale' and centered('whale') and len(say) > 5, f'{path} 줄에서 고래를 고르면 고래 무대(능력 한 줄: {say})')
        # 친구 카드 판(게임 세션 chick-board.js·friends.js): 보이면 영상 대신 직접 푸는 판
        pg.wait_for_timeout(600)
        mounted = pg.evaluate("(() => { const w = document.querySelector('#st-whale .win'); return !!w && !!w.querySelector('.cr-host') && !w.querySelector('video'); })()")
        check(mounted, f'{path} 고래 무대가 직접 푸는 판으로 바뀜')
        rs = pg.evaluate("(() => { const b = document.querySelector('#st-whale .cr-reset'); if (!b) return 0; const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); })()")
        check(rs >= 48, f'{path} 판 다시 하기 단추 48px 이상 ({rs})')
        pw = pg.evaluate("Math.max(...[...document.querySelectorAll('.pick')].map(e => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)))")
        nav = pg.evaluate("Math.min(...[...document.querySelectorAll('.nav')].map(e => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)))")
        check(pw >= 48 and nav >= 48, f'{path} 줄·앞뒤 단추 48px 이상 ({pw}, {nav})')
        # 질문 접기
        q = pg.locator('.qa summary').first
        q.scroll_into_view_if_needed(); q.click(); pg.wait_for_timeout(200)
        check(pg.evaluate("document.querySelector('.qa details').open") is True, f'{path} 질문 펴기')
        q.click(); pg.wait_for_timeout(200)
        check(pg.evaluate("document.querySelector('.qa details').open") is False, f'{path} 질문 접기')
        # 끝 칸 단추가 보이면 하단 줄은 숨김
        pg.locator('.end-cta').scroll_into_view_if_needed(); pg.wait_for_timeout(1800)
        check(pg.locator('.end-cta .store').count() == 2 and all(pg.locator('.end-cta .store').nth(n).is_visible() for n in range(2))
              and 'is-off' in (pg.get_attribute('#dock', 'class') or ''), f'{path} 끝 칸 배지 둘이 보이고 하단 줄 숨김')
        round_text += pg.evaluate(ROUND_TEXT)
        # 판이 화면 밖이면 rAF 0(이 페이지 장식은 rAF를 쓰지 않는다)
        pg.wait_for_timeout(800); pg.evaluate('window.__raf = 0; window.__rafBoard = 0'); pg.wait_for_timeout(1000)
        check(pg.evaluate('window.__raf') == 0, f'{path} 판이 화면 밖일 때 rAF 0 (사이트·맛보기 코드)')
        # 친구 카드 판 엔진(게임 세션 파일)도 화면 밖이면 멈춘다(landing-kit a56f51a에서 고침)
        check(pg.evaluate('window.__rafBoard') == 0, f'{path} 판이 화면 밖일 때 rAF 0 (친구 카드 판 엔진)')
        # 둥근 글꼴 글자 빠짐(’는 demo-text JSON 그대로라 시스템 글꼴로 대신)
        miss = sorted({c for c in round_text if ord(c) not in CMAP and not c.isspace() and c != '’'})
        check(not miss, f'{path} 화면의 둥근 글꼴 글자가 조각에 다 있음 {miss}')
        check(not errs, f'{path} 콘솔 오류 0 {errs}')
        pg.close()
        # 첫 화면: 되돌리기·힌트·다시 하기 줄과 주 단추
        for vw, vh in ((360, 640), (390, 700)):
            pg = b.new_page(viewport={'width': vw, 'height': vh}, is_mobile=True, has_touch=True, reduced_motion=motion)
            pg.goto(BASE + path, wait_until='networkidle'); pg.wait_for_timeout(600)
            r = pg.evaluate("""() => { const c = document.querySelector('.demo-ctrl').getBoundingClientRect(), d = document.querySelector('#dock').getBoundingClientRect();
                return {ctrl: Math.round(c.bottom), dock: Math.round(d.top), w: document.documentElement.scrollWidth}; }""")
            check(r['ctrl'] <= r['dock'] <= vh and pg.is_visible('#dock .cta') and r['w'] == vw, f'{path} {vw}×{vh} 첫 화면에 판 단추 줄(아래 {r["ctrl"]})과 주 단추(위 {r["dock"]})')
            pg.close()
        # 휴대폰 스토어: 안드로이드는 Google Play, 아이폰은 App Store로 주 단추 셋이 바로 간다
        for ua, k in (('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36', 'play'),
                      ('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'ios')):
            ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, user_agent=ua, reduced_motion=motion)
            pg = ctx.new_page(); pg.goto(BASE + path, wait_until='networkidle')
            hs = pg.eval_on_selector_all('[data-cta]', 'es => es.map(e => e.getAttribute("href"))')
            check(len(hs) == 3 and all(h == build.STORE[k] for h, in zip(hs)), f'{path} {k} 휴대폰 주 단추 셋 → {build.STORE[k]}')
            ctx.close()
    b.close()
print('실패', len(fails))
sys.exit(1 if fails else 0)
