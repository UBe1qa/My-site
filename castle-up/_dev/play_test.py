"""맛보기 보스전을 실제로 눌러 끝까지 한다. python3 _dev/play_test.py [주소] [출력폴더]"""
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765'
OUT = sys.argv[2] if len(sys.argv) > 2 else None
fails = []
def check(c, msg):
    print(('통과 ' if c else '실패 ') + msg)
    if not c: fails.append(msg)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    for path, motion in (('/', 'no-preference'), ('/en/', 'reduce')):
        pg = b.new_page(viewport={'width': 390, 'height': 844}, reduced_motion=motion)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto(BASE + path, wait_until='networkidle'); pg.wait_for_timeout(400)
        tip = lambda: pg.inner_text('.demo-tip')
        check(pg.locator('.chain .ch').count() == 2 and pg.locator('.sk.is-next').get_attribute('data-el') == 'phys', f'{path} 첫 순서 2칸, 물리에 다음!')
        pg.click('.sk[data-el=ice]'); pg.wait_for_timeout(700)
        check('벌칙' in tip() or 'penalty' in tip(), f'{path} 틀린 속성은 벌칙 없음 안내')
        check(pg.locator('.chain .ch-done').count() == 0, f'{path} 틀린 속성으로 순서가 나아가지 않음')
        pg.click('.sk[data-el=phys]'); pg.wait_for_timeout(700)
        check(pg.locator('.chain .ch-done').count() == 1 and pg.locator('.chain .ch-timer').count() == 1, f'{path} 한 칸 맞힘 + 8초 고리')
        pg.wait_for_timeout(500)
        pg.click('.sk[data-el=fire]'); pg.wait_for_timeout(900)
        check(pg.evaluate("document.querySelector('.boss').classList.contains('is-groggy')"), f'{path} 그로기')
        if OUT and motion != 'reduce': pg.screenshot(path=f'{OUT}/groggy.png')
        pg.wait_for_timeout(4300)
        check(not pg.evaluate("document.querySelector('.boss').classList.contains('is-groggy')") and pg.locator('.chain .ch').count() == 3, f'{path} 4초 뒤 다시 날고 새 순서 3칸')
        # 8초 넘기면 처음으로
        nx = pg.locator('.sk.is-next').get_attribute('data-el'); pg.click(f'.sk[data-el={nx}]'); pg.wait_for_timeout(8600)
        check(pg.locator('.chain .ch-done').count() == 0 and ('처음' in tip() or 'started over' in tip()), f'{path} 8초 지나면 순서가 처음으로')
        for k in range(40):
            if pg.is_visible('.demo-done') or pg.locator('.sk[disabled]').count(): break
            nx = pg.query_selector('.sk.is-next')
            el = nx.get_attribute('data-el') if nx else 'bolt'
            pg.click(f'.sk[data-el={el}]'); pg.wait_for_timeout(1050)
        pg.wait_for_timeout(1500)
        check(pg.is_visible('.demo-done'), f'{path} 보스를 잡고 완료 창')
        if OUT and motion != 'reduce': pg.screenshot(path=f'{OUT}/done.png')
        pg.click('.demo-done [data-act=again]'); pg.wait_for_timeout(400)
        check(not pg.is_visible('.demo-done') and pg.locator('.chain .ch').count() == 2, f'{path} 다시 하기')
        check(not errs, f'{path} 콘솔 오류 0 {errs}')
        pg.close()
    b.close()
print('실패', len(fails))
sys.exit(1 if fails else 0)
