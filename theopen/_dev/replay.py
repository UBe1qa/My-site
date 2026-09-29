"""다시 움직이는지 확인 (작업 공간 브라우저)
python3 replay_test.py <폴더 또는 주소>
- 휴대폰: 자재 막대·섹션 제목·첫 화면 도면이 화면 밖으로 나갔다 들어오면 다시 움직이는지 (위·아래 양쪽)
- 입력 중인 신청서는 화면 밖으로 나가도 되돌리지 않는지
- 여러 위치에서, 화면 가운데 부분에 안 보인 채 남은 요소가 없는지
- 컴퓨터: 마우스 휠(부드러운 스크롤)로도 다시 움직이는지"""
import asyncio, os, sys, subprocess, time
from playwright.async_api import async_playwright

target = sys.argv[1]
srv = None
if not target.startswith('http'):
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8768', '--bind', '127.0.0.1'], cwd=target, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    base = 'http://127.0.0.1:8768/'
else:
    base = target
proxy = os.environ.get('HTTPS_PROXY', '')
fails = []
def check(ok, msg):
    print(('  OK  ' if ok else '  !!  ') + msg)
    if not ok: fails.append(msg)

BARS = '''() => { const s = [...document.querySelectorAll("[data-bars] .seg")].map(e => getComputedStyle(e).clipPath);
  return { none: s.filter(v => v === "none").length, total: s.length, tag: +getComputedStyle(document.querySelector(".bars__tag")).opacity }; }'''
TITLE = '''(sel) => { const l = [...document.querySelectorAll(sel + " .ln")]; return l.map(e => getComputedStyle(e).transform); }'''
PLAN = '''() => { const s = document.querySelector("[data-sheet]"); return { wall: getComputedStyle(s.querySelector(".p-wall")).strokeDashoffset,
  draw: (() => { const s = document.querySelector("[data-sheet]"); const d = [...s.querySelectorAll(".p-dot")]; if (!d.length) return getComputedStyle(s.querySelector(".p-path")).opacity === "1" ? "full" : "hidden"; const on = d.filter(e => e.style.opacity !== "0").length; return on === d.length ? "full" : on + "/" + d.length; })(), node: +getComputedStyle(s.querySelector(".p-node")).opacity,
  floor: s.querySelector(".p-floor > *") ? +getComputedStyle(s.querySelector(".p-floor > *")).opacity : -1 }; }'''
# 화면 가운데(12%~75%)에 걸친 요소 가운데 안 보이는 것 (모든 칸의 '나타나는 줄'보다 안쪽이라 기다린 뒤엔 다 보여야 함)
HID = '''() => { const vh = innerHeight; return [...document.querySelectorAll("main *, footer *")].filter(e => {
  const r = e.getBoundingClientRect(); if (!r.height || r.bottom < vh * 0.12 || r.top > vh * 0.75) return false;
  const cs = getComputedStyle(e);
  return (cs.visibility === "hidden" || +cs.opacity < 0.05) && cs.display !== "none" && !e.closest("[hidden]") && e.tagName !== "INPUT";
}).map(e => e.tagName + "." + (e.getAttribute("class") || "")).slice(0, 8); }'''
TOP_AT = '''([sel, frac]) => { const r = document.querySelector(sel).getBoundingClientRect(); window.scrollTo(0, scrollY + r.top - innerHeight * frac); }'''

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=[f'--proxy-server=https={proxy.replace("http://", "")}'] if proxy else [])

        # ---------- 휴대폰 ----------
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='ko-KR')
        pg = await ctx.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(base, wait_until='domcontentloaded')
        await pg.wait_for_function('window.__motionReady === true', timeout=20000)  # 여러 확인을 동시에 돌리면 시작이 늦어질 수 있음
        await pg.wait_for_timeout(4800)
        print('[휴대폰]')
        pl = await pg.evaluate(PLAN)
        check(pl['wall'] in ('0', '0px') and pl['draw'] == 'full' and pl['node'] == 1, f'첫 화면 도면 다 그려짐 {pl}')

        # 자재 막대: 처음
        await pg.evaluate(TOP_AT, ['[data-bars]', 0.3]); await pg.wait_for_timeout(2800)
        r = await pg.evaluate(BARS)
        check(r['none'] == r['total'] and r['tag'] == 1, f'자재 막대 처음 봄: 다 차오름 {r}')
        # 위로 (막대가 화면 아래로 완전히 나감) → 되돌려짐
        await pg.evaluate('scrollTo(0, 0)'); await pg.wait_for_timeout(700)
        r = await pg.evaluate(BARS)
        check(r['none'] == 0, f'위로 올라가면 막대가 처음 상태로 {r}')
        pl = await pg.evaluate(PLAN)
        # 다시 내려옴 → 다시 차오름
        await pg.evaluate(TOP_AT, ['[data-bars]', 0.3]); await pg.wait_for_timeout(300)
        mid = await pg.evaluate(BARS)
        await pg.wait_for_timeout(2600)
        r = await pg.evaluate(BARS)
        check(mid['none'] < mid['total'] and r['none'] == r['total'], f'다시 내려오면 다시 차오름 (0.3초 {mid["none"]}/{mid["total"]} → 끝 {r["none"]}/{r["total"]})')
        # 아래로 지나감 (막대가 화면 위로 완전히 나감) → 되돌려짐 → 위로 올라오면 다시
        await pg.evaluate(TOP_AT, ['#faq', 0.1]); await pg.wait_for_timeout(700)
        r = await pg.evaluate(BARS)
        check(r['none'] == 0, f'아래로 지나가도 처음 상태로 {r}')
        await pg.evaluate(TOP_AT, ['[data-bars]', 0.3]); await pg.wait_for_timeout(300)
        mid = await pg.evaluate(BARS)
        await pg.wait_for_timeout(2600)
        r = await pg.evaluate(BARS)
        check(mid['none'] < mid['total'] and r['none'] == r['total'], f'위로 올라와도 다시 차오름 (0.3초 {mid["none"]}/{mid["total"]} → 끝 {r["none"]}/{r["total"]})')

        # 섹션 제목
        await pg.evaluate(TOP_AT, ['#process-title', 0.4]); await pg.wait_for_timeout(1800)
        t1 = await pg.evaluate(TITLE, '#process-title')
        await pg.evaluate('scrollTo(0, 0)'); await pg.wait_for_timeout(600)
        t2 = await pg.evaluate(TITLE, '#process-title')
        await pg.evaluate(TOP_AT, ['#process-title', 0.4]); await pg.wait_for_timeout(1800)
        t3 = await pg.evaluate(TITLE, '#process-title')
        shown = lambda ts: bool(ts) and all(t in ('none', 'matrix(1, 0, 0, 1, 0, 0)') for t in ts)
        check(shown(t1) and not shown(t2) and shown(t3), f'섹션 제목: 보임 → 나가면 되돌림 → 다시 올라옴 ({len(t1)}줄, 되돌린 값 {t2[:1]})')
        lab = await pg.evaluate('document.querySelector("#start-title").getAttribute("aria-label")')
        check(lab == '개원과 리뉴얼은 보는 곳이 다릅니다', f'화면 읽기용 제목 글 띄어쓰기 맞음 ({lab})')

        # 첫 화면 도면: 아래로 내려갔다 다시 올라오면 다시 그려짐
        pl1 = await pg.evaluate(PLAN)
        await pg.evaluate('scrollTo(0, 0)'); await pg.wait_for_timeout(500)
        pl2 = await pg.evaluate(PLAN)
        await pg.wait_for_timeout(4500)
        pl3 = await pg.evaluate(PLAN)
        check(pl1['draw'] != 'full' and pl2['draw'] != 'full' and pl3['draw'] == 'full' and pl3['node'] == 1,
              f'첫 화면 도면 다시 그려짐 (나가 있을 때 {pl1["draw"]}, 0.5초 {pl2["draw"]}, 끝 {pl3["draw"]})')

        # 휴대폰 공간 칸: 작은 평면에 그 공간이 칠해짐
        await pg.evaluate(TOP_AT, ['.zone[data-zone="3"]', 0.2]); await pg.wait_for_timeout(2400)
        z = await pg.evaluate('+getComputedStyle(document.querySelector(".zone[data-zone=\\"3\\"] .zone__crop .z.is-on")).opacity')
        check(z == 1, f'공간 칸 작은 평면: 그 공간 칠해짐 (opacity {z})')

        # 여러 위치에서 가운데 부분에 안 보인 요소 없음 (내려가며, 올라오며)
        H = await pg.evaluate('document.documentElement.scrollHeight')
        bad = []
        for frac in [0.1, 0.22, 0.35, 0.48, 0.6, 0.72, 0.85, 0.95, 0.66, 0.4, 0.15]:
            await pg.evaluate(f'scrollTo(0, {int(H * frac)})'); await pg.wait_for_timeout(1700)
            h = await pg.evaluate(HID)
            if h: bad.append((frac, h))
        check(not bad, f'여러 위치(내려가며·올라오며)에서 가운데 부분에 안 보인 요소 없음 {bad}')

        # 입력 중인 신청서는 화면 밖으로 나가도 되돌리지 않음
        await pg.evaluate(TOP_AT, ['#inquiry', 0.1]); await pg.wait_for_timeout(1500)
        await pg.focus('#inquiry input[name=budget]')
        await pg.evaluate('scrollTo(0, 0)'); await pg.wait_for_timeout(700)
        op = await pg.evaluate('getComputedStyle(document.querySelector("#inquiry")).opacity')
        check(op == '1', f'입력 중인 신청서는 화면 밖으로 나가도 그대로 (opacity {op})')
        await pg.evaluate('document.activeElement.blur()')
        check(not errs, f'콘솔 오류 없음 {errs}')
        await ctx.close()

        # ---------- 컴퓨터 (마우스 휠 + 부드러운 스크롤) ----------
        ctx = await b.new_context(viewport={'width': 1366, 'height': 768}, locale='ko-KR')
        pg = await ctx.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(base, wait_until='domcontentloaded')
        await pg.wait_for_timeout(5000)
        print('[컴퓨터]')
        await pg.mouse.move(683, 400)
        async def wheel_to(sel, frac):
            for _ in range(12):
                d = await pg.evaluate('([s, f]) => document.querySelector(s).getBoundingClientRect().top - innerHeight * f', [sel, frac])
                if abs(d) < 40: break
                await pg.mouse.wheel(0, max(-900, min(900, d)))
                await pg.wait_for_timeout(700)
            await pg.wait_for_timeout(600)
        await wheel_to('[data-bars]', 0.3); await pg.wait_for_timeout(2600)
        r1 = await pg.evaluate(BARS)
        await wheel_to('#faq', 0.1); await pg.wait_for_timeout(300)
        r2 = await pg.evaluate(BARS)
        await wheel_to('[data-bars]', 0.3); await pg.wait_for_timeout(2600)
        r3 = await pg.evaluate(BARS)
        check(r1['none'] == r1['total'] and r2['none'] == 0 and r3['none'] == r3['total'], f'휠로 지나갔다 올라와도 막대 다시 차오름 ({r1["none"]} → {r2["none"]} → {r3["none"]}/{r3["total"]})')
        # 컴퓨터 공간 칸: 따라 내려오는 평면이 보이고, 가운데 칸이 칠해짐
        await wheel_to('.zone[data-zone="2"]', 0.35); await pg.wait_for_timeout(1500)
        fig = await pg.evaluate('+getComputedStyle(document.querySelector(".space__fig")).opacity')
        on = await pg.evaluate('[...document.querySelectorAll(".space__fig .z.is-on")].map(e => e.dataset.z)')
        check(fig == 1 and on == ['2'], f'컴퓨터 공간 칸: 평면 보임({fig}), 칠해진 공간 {on}')
        hid = await pg.evaluate(HID)
        check(not hid, f'컴퓨터: 가운데 부분에 안 보인 요소 없음 {hid}')
        check(not errs, f'콘솔 오류 없음 {errs}')
        await ctx.close()
        await b.close()

try:
    asyncio.run(main())
finally:
    if srv: srv.terminate()
print('\n결과:', '전부 통과' if not fails else f'{len(fails)}개 실패: {fails}')
