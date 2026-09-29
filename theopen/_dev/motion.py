"""움직임 확인 (작업 공간 브라우저)
python3 motion_test.py <폴더 또는 주소>
- 컴퓨터: 첫 화면 등장 뒤, 마우스 휠로 내려가며 여러 위치 스크린샷 (Lenis 부드러운 스크롤 포함)
- 휴대폰: 손가락 스크롤(=window.scrollTo)로 여러 위치 스크린샷
- '동작 줄이기': 움직임 없이 전부 보이는지
- 라이브러리 차단: 3.5초 안에 전부 보이는지
- 콘솔 오류, 가로 넘침(흐르는 띠 안쪽은 제외)"""
import asyncio, os, sys, subprocess, time
from playwright.async_api import async_playwright

target = sys.argv[1]
import tempfile
OUT = tempfile.mkdtemp(prefix='theopen-motion-') + '/'
os.makedirs(OUT, exist_ok=True)
srv = None
if not target.startswith('http'):
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8767', '--bind', '127.0.0.1'], cwd=target, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    base = 'http://127.0.0.1:8767/'
else:
    base = target
proxy = os.environ.get('HTTPS_PROXY', '')
fails = []
def check(ok, msg):
    print(('  OK  ' if ok else '  !!  ') + msg)
    if not ok: fails.append(msg)

OVERFLOW_JS = '''(w) => [...document.querySelectorAll("body *")].filter(e => !e.closest(".marquee") && !e.closest("svg") && getComputedStyle(e).position !== "fixed" && e.getBoundingClientRect().right > w + 1).map(e => e.tagName + "." + e.className).slice(0, 6)'''

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=[f'--proxy-server=https={proxy.replace("http://", "")}'] if proxy else [])

        # ---------- 컴퓨터 ----------
        ctx = await b.new_context(viewport={'width': 1366, 'height': 768}, locale='ko-KR')
        pg = await ctx.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(base, wait_until='domcontentloaded')
        await pg.wait_for_timeout(700)
        await pg.screenshot(path=OUT + 'pc-00-intro-mid.png')
        split_info = await pg.evaluate('''() => { const h = document.querySelector(".hero h1"); return { html: h.innerHTML.slice(0, 300), masks: [...h.querySelectorAll("*")].map(e => e.className).filter((v,i,a)=>a.indexOf(v)===i) }; }''')
        print('    h1 during intro:', split_info['masks'])
        await pg.wait_for_timeout(3200)
        info = await pg.evaluate('() => ({ ready: !!window.__motionReady, anim: document.documentElement.classList.contains("anim"), lenis: document.documentElement.classList.contains("lenis"), planIn: getComputedStyle(document.querySelector(".p-draw")).strokeDashoffset, h1: document.querySelector(".hero h1").innerHTML })')
        print('[컴퓨터]')
        check(info['ready'] and info['anim'], f'움직임 켜짐 (ready {info["ready"]}, anim {info["anim"]})')
        check(info['lenis'], '부드러운 스크롤(Lenis) 켜짐')
        check(info['planIn'] in ('0', '0px'), f'도면 점선 다 그려짐 ({info["planIn"]})')
        check('<div' not in info['h1'], '첫 화면 제목: 등장 뒤 원래 글로 돌아옴 (쪼갠 것 되돌림)')
        await pg.screenshot(path=OUT + 'pc-01-hero.png')
        # 키보드로 신청서에 먼저 들어가도(아직 스크롤 안 함) 신청서가 바로 보여야 함
        await pg.focus('#inquiry input[name=topic]')
        await pg.wait_for_timeout(250)
        op = await pg.evaluate('getComputedStyle(document.querySelector("#inquiry")).opacity')
        check(op == '1', f'키보드로 신청서에 들어가면 바로 보임 (opacity {op})')
        await pg.evaluate('document.activeElement.blur(); scrollTo(0, 0)')
        await pg.wait_for_timeout(1500)
        # 휠로 내려가며 찍기
        shots = [(f'{i:02d}', 650) for i in range(2, 17)]
        for name, dy in shots:
            await pg.mouse.move(683, 400)
            await pg.mouse.wheel(0, dy)
            await pg.wait_for_timeout(1500)
            y = await pg.evaluate('Math.round(scrollY)')
            hidden = await pg.evaluate('document.querySelector(".site-header").classList.contains("is-hidden")')
            await pg.screenshot(path=OUT + f'pc-{name}-y{y}.png')
            print(f'    휠 {dy} → scrollY {y}, 머리 막대 숨김 {hidden}')
        on = await pg.evaluate('[...document.querySelectorAll(".step")].map(s => s.classList.contains("is-on"))')
        print('    진행 단계 켜짐:', on)
        # 끝까지 내려온 뒤: 본문에 투명하게 남은 요소가 없어야 함 (움직임이 끝 값을 잘못 잡으면 안 보인 채 남음)
        # 4차부터 화면 밖으로 나간 칸은 일부러 처음 상태(숨김)로 되돌려 두므로, 지금 화면 가운데(12%~75%)에 걸친 요소만 본다
        HID = '(() => { const vh = innerHeight; return [...document.querySelectorAll("main *, footer *")].filter(e => { const r = e.getBoundingClientRect(); if (!r.height || r.bottom < vh * 0.12 || r.top > vh * 0.75) return false; const cs = getComputedStyle(e); return (cs.visibility === "hidden" || +cs.opacity < 0.05) && cs.display !== "none" && !e.closest("[hidden]") && e.tagName !== "INPUT"; }).map(e => e.tagName + "." + (e.getAttribute("class") || "")).slice(0, 8); })()'
        hid = await pg.evaluate(HID)
        check(not hid, f'컴퓨터: 끝까지 내려온 뒤 화면 가운데에 안 보이는 요소 없음 {hid}')
        # 위로 조금 → 머리 막대 다시 나타남
        await pg.mouse.wheel(0, -300)
        await pg.wait_for_timeout(900)
        hidden = await pg.evaluate('document.querySelector(".site-header").classList.contains("is-hidden")')
        check(not hidden, '위로 올리면 머리 막대가 다시 나타남')
        # 페이지 안 링크(부드러운 스크롤) — 사람처럼: 휠로 움직이고, 멈춘 뒤 누르기
        # (Lenis가 부드럽게 움직이는 도중에 코드로 scrollTo를 하면 Lenis가 무시하므로 테스트에서 쓰지 않는다)
        await pg.wait_for_timeout(1500)
        await pg.click('.nav a[href="#process"]')
        await pg.wait_for_timeout(2200)
        top = await pg.evaluate('Math.round(document.querySelector("#process").getBoundingClientRect().top)')
        check(-5 < top < 120, f'내려온 상태에서 메뉴 "진행 과정" → 진행 과정 칸으로 이동 (칸 위치 {top}px)')
        await pg.mouse.move(683, 400)
        await pg.mouse.wheel(0, -30000)
        await pg.wait_for_timeout(2500)
        y0 = await pg.evaluate('Math.round(scrollY)')
        check(y0 == 0, f'휠로 맨 위까지 올라감 (scrollY {y0})')
        await pg.click('.hero .btn--main')
        await pg.wait_for_timeout(2200)
        top = await pg.evaluate('Math.round(document.querySelector("#inquiry").getBoundingClientRect().top)')
        check(-5 < top < 120, f'"상담 신청서 쓰기" → 신청서로 바로 이동 (신청서 위치 {top}px)')
        await pg.screenshot(path=OUT + 'pc-11-contact.png')
        ov = await pg.evaluate(OVERFLOW_JS, 1366)
        sw = await pg.evaluate('document.documentElement.scrollWidth')
        check(sw == 1366 and not ov, f'가로 넘침 없음 ({sw}) {ov}')
        check(not errs, f'콘솔 오류 없음 {errs}')
        await ctx.close()

        # ---------- 휴대폰 ----------
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='ko-KR')
        pg = await ctx.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(base, wait_until='domcontentloaded')
        await pg.wait_for_timeout(3800)
        print('[휴대폰]')
        info = await pg.evaluate('() => ({ ready: !!window.__motionReady, lenis: document.documentElement.classList.contains("lenis") })')
        check(info['ready'] and not info['lenis'], f'움직임 켜짐, 휴대폰은 원래 스크롤 ({info})')
        await pg.screenshot(path=OUT + 'mo-01-hero.png')
        H = await pg.evaluate('document.documentElement.scrollHeight')
        for i, frac in enumerate([0.12, 0.2, 0.3, 0.42, 0.55, 0.68, 0.8]):
            await pg.evaluate(f'scrollTo(0, {int(H * frac)})')
            await pg.wait_for_timeout(1300)
            await pg.screenshot(path=OUT + f'mo-{i + 2:02d}.png')
        for y in range(0, H + 900, 700):
            await pg.evaluate(f'scrollTo(0, {y})'); await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(1200)
        hid = await pg.evaluate(HID)
        check(not hid, f'휴대폰: 끝까지 내려온 뒤 화면 가운데에 안 보이는 요소 없음 {hid}')
        ov = await pg.evaluate(OVERFLOW_JS, 390)
        sw = await pg.evaluate('document.documentElement.scrollWidth')
        check(sw == 390 and not ov, f'가로 넘침 없음 ({sw}) {ov}')
        check(not errs, f'콘솔 오류 없음 {errs}')
        await ctx.close()

        # ---------- 동작 줄이기 ----------
        ctx = await b.new_context(viewport={'width': 1366, 'height': 768}, reduced_motion='reduce', locale='ko-KR')
        pg = await ctx.new_page()
        await pg.goto(base, wait_until='networkidle')
        await pg.wait_for_timeout(800)
        print('[동작 줄이기]')
        r = await pg.evaluate('''() => ({ anim: document.documentElement.classList.contains("anim"), h1: getComputedStyle(document.querySelector(".hero h1")).opacity, sheet: getComputedStyle(document.querySelector(".sheet")).opacity, draw: getComputedStyle(document.querySelector(".p-draw")).strokeDashoffset, point: getComputedStyle(document.querySelector(".point h3")).opacity, lenis: document.documentElement.classList.contains("lenis") })''')
        check(not r['anim'] and r['h1'] == '1' and r['sheet'] == '1' and r['draw'] in ('0', '0px') and r['point'] == '1' and not r['lenis'], f'움직임 없이 전부 보임 {r}')
        await pg.screenshot(path=OUT + 'rm-full.png', full_page=True)
        await ctx.close()

        # ---------- 라이브러리가 안 불릴 때 ----------
        ctx = await b.new_context(viewport={'width': 1366, 'height': 768}, locale='ko-KR')
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/npm/gsap@*/**', lambda route: route.abort())
        await pg.goto(base, wait_until='domcontentloaded')
        await pg.wait_for_timeout(4200)
        print('[라이브러리 차단]')
        r = await pg.evaluate('''() => ({ anim: document.documentElement.classList.contains("anim"), header: getComputedStyle(document.querySelector(".site-header")).opacity, h1: getComputedStyle(document.querySelector(".hero h1")).opacity, sheet: getComputedStyle(document.querySelector(".sheet")).opacity, draw: getComputedStyle(document.querySelector(".p-draw")).strokeDashoffset })''')
        check(not r['anim'] and r['header'] == '1' and r['h1'] == '1' and r['sheet'] == '1' and r['draw'] in ('0', '0px'), f'라이브러리 없어도 전부 보임 {r}')
        check(not errs, f'페이지 오류 없음 {errs}')
        await pg.screenshot(path=OUT + 'nolib-hero.png')
        await ctx.close()
        await b.close()

try:
    asyncio.run(main())
finally:
    if srv: srv.terminate()
print('\n결과:', '전부 통과' if not fails else f'{len(fails)}개 실패: {fails}')
