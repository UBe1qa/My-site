"""맛보기 판을 실제로 눌러 푼다(두 판). python3 _dev/play_test.py [주소] [출력폴더]"""
import sys, os
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
        pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=False, reduced_motion=motion)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto(BASE + path, wait_until='networkidle')
        tube = lambda i: pg.locator('.board .tube').nth(i)
        def tap(i): tube(i).click(); pg.wait_for_timeout(350)
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
        pg.wait_for_timeout(2400)
        check(pg.locator('.nest-slot[data-full]').count() == 1, f'{path} 병아리가 둥지에')
        check(pg.is_visible('.demo-done'), f'{path} 1판 완료 창')
        if OUT and motion != 'reduce': pg.screenshot(path=f'{OUT}/done1.png')
        pg.click('.demo-done [data-act=next]'); pg.wait_for_timeout(500)
        check(pg.locator('.board .tube').count() == 5, f'{path} 2판(튜브 5개)')
        # 다람쥐 꾹 누르기: 튜브 2의 바닥(0번째) 다람쥐
        box = tube(2).bounding_box()
        slot = (box['height'] - 20) / 4
        x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] - 10 - slot / 2
        pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(600); pg.mouse.up(); pg.wait_for_timeout(500)
        check('이동 1번' in pg.inner_text('.demo-count') or 'Moves 1' in pg.inner_text('.demo-count'), f'{path} 꾹 눌러 능력(이동 1)')
        # 되돌리기 후 다시
        pg.click('[data-act=undo]'); pg.wait_for_timeout(300)
        check('0' in pg.inner_text('.demo-count'), f'{path} 되돌리기')
        pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(600); pg.mouse.up(); pg.wait_for_timeout(500)
        tap(2); tap(4); tap(1); tap(2)
        pg.wait_for_timeout(2400)
        check(pg.is_visible('.demo-done'), f'{path} 2판 완료 창')
        if OUT and motion != 'reduce': pg.screenshot(path=f'{OUT}/done2.png')
        check(not errs, f'{path} 콘솔 오류 0 {errs}')
        pg.close()
    b.close()
print('실패', len(fails))
sys.exit(1 if fails else 0)
