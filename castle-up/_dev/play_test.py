"""실제 브라우저로 눌러 보고 내려 본다(한국어·영어, 보통·움직임 줄이기). python3 _dev/play_test.py [주소] [출력폴더]
- 콘솔 오류 0, 첫 화면에서 성 그림을 한꺼번에 받지 않음(3장 이하)
- 스크롤하면 아래 고정 줄의 성 등급이 1 → 20으로 자람(첫 화면·꼭대기에서는 숨김)
- 보스 수배 전단 앞뒤 단추가 넘기고, 넘기면 약점 도장이 찍힘
- 질문 접기가 열림, 주 단추 주소·말이 모두 build.py CTA 상수와 같음
- 360×640·390×700에서 주 단추가 첫 화면 안, 로고와 보스 체력 줄이 안 겹침, 320px 가로 넘침 0
- 움직임 줄이기: 숨은 요소 0, 도는 애니메이션 0"""
import os, re, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.dont_write_bytecode = True
import build
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:' + os.environ.get('PORT', '8791')
OUT = sys.argv[2] if len(sys.argv) > 2 else None
EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
fails = []
def check(c, msg):
    print(('통과 ' if c else '실패 ') + msg)
    if not c: fails.append(msg)

HIDDEN_JS = '''() => [...document.querySelectorAll('main *, footer *')].filter(e => {
  const s = getComputedStyle(e), r = e.getBoundingClientRect();
  return r.width * r.height > 0 && (parseFloat(s.opacity) < .05 || s.visibility === 'hidden');
}).map(e => e.tagName + '.' + (e.className && e.className.baseVal === undefined ? e.className : ''))'''

def scroll_grades(pg):
    """맨 위부터 끝까지 조금씩 내리며 (등급, 고정 줄이 보이나)를 모은다."""
    H = pg.evaluate('document.documentElement.scrollHeight - innerHeight')
    seen = []
    y = 0
    while True:
        pg.evaluate(f'scrollTo(0,{y})'); pg.wait_for_timeout(70)
        seen.append((y, int(pg.get_attribute('#keepName', 'data-grade')), pg.evaluate("document.getElementById('keep').classList.contains('show')")))
        if y >= H: break
        y = min(H, y + 160)
    return seen

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE if os.path.exists(EXE) else None)
    for i, path in enumerate(('/', '/en/')):
        for motion in ('no-preference', 'reduce'):
            tag = f'{path} {"움직임 줄이기" if motion == "reduce" else "보통"}:'
            pg = b.new_page(viewport={'width': 390, 'height': 844}, reduced_motion=motion)
            errs, castles = [], []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.on('request', lambda r: castles.append(r.url) if re.search(r'/img/castle-\d\d\.webp', r.url) else None)
            pg.goto(BASE + path, wait_until='networkidle'); pg.wait_for_timeout(600)
            check(len(castles) <= 3, f'{tag} 첫 화면에서 성 그림 {len(castles)}장만 받음(3장 이하)')
            box = pg.locator('#heroAct .cta').bounding_box()
            check(box and box['y'] + box['height'] <= 844, f'{tag} 첫 화면 안에 주 단추(아래 끝 {round(box["y"] + box["height"]) if box else "-"}px)')
            check(not pg.evaluate("document.getElementById('keep').classList.contains('show')"), f'{tag} 첫 화면에서는 고정 줄 숨김')

            # 주 단추: 모든 자리가 같은 상수
            hrefs = pg.eval_on_selector_all('a.cta', 'els => els.map(e => [e.getAttribute("href"), e.querySelector(".cta-t").textContent])')
            check(len(hrefs) >= 3 and all(h == [build.CTA['href'][i], build.CTA['label'][i]] for h in hrefs), f'{tag} 주 단추 {len(hrefs)}곳의 주소·말이 CTA 상수와 같음')

            # 자라는 성
            seen = scroll_grades(pg)
            grades = [g for _, g, _ in seen]
            shown = [g for _, g, s in seen if s]
            mono = all(b2 >= a2 for a2, b2 in zip(grades, grades[1:]))
            check(grades[0] == 1 and max(grades) == 20 and mono and len(set(grades)) >= 10,
                  f'{tag} 스크롤하면 고정 줄 성 등급 1 → 20(거친 등급 {len(set(grades))}개, 줄어든 적 없음)')
            check(shown and min(shown) <= 2 and max(shown) >= 19, f'{tag} 고정 줄이 보이는 동안 {min(shown) if shown else "-"} → {max(shown) if shown else "-"}등급')
            check(not seen[-1][2], f'{tag} 꼭대기(끝)에서는 고정 줄 숨김')
            check(len(castles) <= 22, f'{tag} 성 그림은 필요할 때만(끝까지 내려 {len(set(castles))}장)')
            if motion == 'reduce':
                hidden = pg.evaluate(HIDDEN_JS)
                check(not hidden, f'{tag} 끝까지 내린 뒤 숨은 요소 0 {hidden[:5]}')
                running = pg.evaluate("document.getAnimations().filter(a => a.playState === 'running').length")
                check(running == 0, f'{tag} 도는 애니메이션 0 ({running})')
                check(pg.evaluate("document.getElementById('vid').controls && document.getElementById('vid').paused"), f'{tag} 영상은 멈춘 채 재생 단추')
            pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(250)
            check(not pg.evaluate("document.getElementById('keep').classList.contains('show')"), f'{tag} 다시 첫 화면으로 오면 고정 줄 숨김')

            # 보스 수배 전단 넘기기
            pg.locator('#board').scroll_into_view_if_needed(); pg.wait_for_timeout(1300)
            check(pg.inner_text('#count').replace(' ', '') == '1/6' and pg.is_disabled('#prev'), f'{tag} 보스 1 / 6, 앞 단추 꺼짐')
            check(pg.evaluate("document.querySelector('.poster').classList.contains('stamped')"), f'{tag} 첫 전단에 약점 도장')
            nb = pg.locator('#next').bounding_box(); pb = pg.locator('#prev').bounding_box()
            check(min(nb['width'], nb['height'], pb['width'], pb['height']) >= 48, f'{tag} 앞뒤 단추 48px 이상')
            pg.click('#next'); pg.wait_for_timeout(900)
            check(pg.inner_text('#count').replace(' ', '') == '2/6' and pg.evaluate("document.getElementById('board').scrollLeft") > 50, f'{tag} 다음 단추가 넘김(2 / 6)')
            if OUT and motion != 'reduce' and i == 0: pg.screenshot(path=f'{OUT}/boss-next.png')
            for _ in range(6): pg.click('#next', force=True); pg.wait_for_timeout(450)
            check(pg.is_disabled('#next'), f'{tag} 끝에서 다음 단추 꺼짐')
            check(pg.evaluate("[...document.querySelectorAll('.poster')].every(p => p.classList.contains('stamped'))"), f'{tag} 넘긴 전단 모두 도장')
            pg.click('#prev'); pg.wait_for_timeout(900)
            check(not pg.is_disabled('#next'), f'{tag} 이전 단추가 되돌림')

            # 질문 접기
            pg.locator('#faq summary').first.scroll_into_view_if_needed()
            pg.locator('#faq summary').first.click(); pg.wait_for_timeout(200)
            check(pg.evaluate("document.querySelector('#faq details').open"), f'{tag} 질문 접기가 열림')
            check(not errs, f'{tag} 콘솔 오류 0 {errs}')
            pg.close()

        # 작은 휴대폰·앱 안 브라우저 높이: 주 단추 첫 화면 안, 로고와 체력 줄 안 겹침
        for w, h in ((360, 640), (390, 700), (320, 640)):
            pg = b.new_page(viewport={'width': w, 'height': h}, reduced_motion='reduce')
            pg.goto(BASE + path, wait_until='networkidle'); pg.wait_for_timeout(300)
            cb = pg.locator('#heroAct .cta').bounding_box()
            lb = pg.locator('.brand').bounding_box(); hb = pg.locator('.hud').bounding_box(); lg = pg.locator('.lang').bounding_box()
            sep = lambda a, c: a['x'] + a['width'] <= c['x'] or c['x'] + c['width'] <= a['x'] or a['y'] + a['height'] <= c['y'] or c['y'] + c['height'] <= a['y']
            check(cb['y'] + cb['height'] <= h, f'{path} {w}×{h} 주 단추가 첫 화면 안(아래 끝 {round(cb["y"] + cb["height"])}px)')
            check(sep(lb, hb) and sep(lg, hb), f'{path} {w}×{h} 로고·언어 링크와 보스 체력 줄이 안 겹침')
            ov = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
            check(ov <= 0, f'{path} {w}×{h} 가로 넘침 0 ({ov})')
            if OUT: pg.screenshot(path=f'{OUT}/first-{path.strip("/") or "ko"}-{w}x{h}.png')
            pg.close()
    b.close()
print('실패', len(fails))
sys.exit(1 if fails else 0)
