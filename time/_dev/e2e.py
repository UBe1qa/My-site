#!/usr/bin/env python3
"""한바퀴 화면 확인(Playwright). 로컬 서버(node time/_dev/serve.mjs 8471)를 띄운 뒤: python3 time/_dev/e2e.py [스크린샷 폴더]
묶음: 1 모든 페이지(콘솔 오류·가로 넘침·44px·광고 코드) · 2 타이머 · 3 스톱워치 · 4 알람 · 5 세계 시간 · 6 화면 밀림(CLS)
광고·통계 요청은 막는다. SEC=2,3 처럼 묶음만 돌릴 수 있다."""
import asyncio
import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE = os.environ.get('BASE', 'http://localhost:8471')
SHOTS = Path(sys.argv[1]) if len(sys.argv) > 1 else None
BLOCK = re.compile(r'googlesyndication|doubleclick|adservice|fundingchoices|cloudflareinsights|cdn\.jsdelivr')
SEC = set((os.environ.get('SEC') or '1,2,3,4,5,6').split(','))
fails, passes = [], 0


def ok(cond, name):
    global passes
    if cond:
        passes += 1
    else:
        fails.append(name)
        print('  ✗', name)


def pages():
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    t = ET.parse(ROOT / 'sitemap.xml')
    return [re.sub(r'^https://time\.lumenlab\.page', '', u.text) for u in t.findall('.//s:loc', ns)]


async def newpage(b, w=390, h=844, scheme='light', tz='Asia/Seoul', locale='ko-KR', clear=True):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, color_scheme=scheme, timezone_id=tz, locale=locale)
    if clear:
        await ctx.add_init_script("try{if(!sessionStorage.getItem('e2e')){localStorage.clear();localStorage.setItem('ot.lang','1');sessionStorage.setItem('e2e','1')}}catch(e){}")
    pg = await ctx.new_page()
    pg.errs = []
    pg.on('console', lambda m: pg.errs.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    await pg.route(BLOCK, lambda r: r.abort())
    return ctx, pg


async def sec1(b):
    print('1 모든 페이지')
    for w in (320, 390, 1366):
        ctx, pg = await newpage(b, w=w)
        for p in pages() + ['/nope/', '/ko/nope/']:
            r = await pg.goto(BASE + p)
            await pg.wait_for_timeout(150)
            if p.endswith('nope/'):
                ok(r.status == 404, f'404 {p}')
            else:
                ok(r.status == 200, f'200 {p}')
            sw = await pg.evaluate('document.documentElement.scrollWidth')
            ok(sw <= w, f'가로 넘침 {p} @{w}: {sw}')
            errs = [e for e in pg.errs if not ('nope' in p and '404' in e)]
            ok(not errs, f'콘솔 오류 {p} @{w}: {errs[:2]}')
            pg.errs.clear()
            if w == 390:
                small = await pg.evaluate("""()=>[...document.querySelectorAll('a,button,input,select,summary,[role=slider]')].filter(e=>{
                  if(e.classList.contains('skip')||e.closest('.why'))return false;if(e.closest('.prose p,.prose li,.faq p,.doc p,.doc li,.fact p,.src,.answer,.note,.cd,.dst,.cards span'))return false;
                  const r=e.getBoundingClientRect(); if(!r.width||getComputedStyle(e).visibility==='hidden')return false;
                  if(e.closest('details:not([open])')&&e.tagName!=='SUMMARY')return false;
                  return r.height<43.5||r.width<43.5}).map(e=>(e.id||e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)).slice(0,5)""")
                ok(not small, f'44px {p}: {small}')
                html = await pg.content()
                noads = p.startswith(('/about', '/ko/about', '/privacy', '/ko/privacy')) or p in ('/guide/', '/ko/guide/') or 'nope' in p
                ok(('adsbygoogle' in html) != noads, f'광고 코드 {p}')
            # 한 줄이어야 할 단추 글자
            wrapped = await pg.evaluate("""()=>[...document.querySelectorAll('.btn')].filter(b=>{const r=b.getBoundingClientRect();if(!r.width)return false;return b.scrollWidth>b.clientWidth+1}).map(b=>b.textContent.trim()).slice(0,4)""")
            ok(not wrapped, f'단추 글자 넘침 {p} @{w}: {wrapped}')
        await ctx.close()


async def sec2(b):
    print('2 타이머')
    for lang, path in (('ko', '/ko/'), ('en', '/')):
        ctx, pg = await newpage(b, w=1366, h=900)
        await pg.clock.install(time='2026-10-14T05:00:00Z')
        await pg.clock.pause_at('2026-10-14T05:00:01Z')
        await pg.goto(BASE + path)
        await pg.wait_for_timeout(200)
        ok(await pg.text_content('#big') == '05:00', f'{lang} 처음 5:00')
        # 숫자 칸으로 0:0:3
        await pg.fill('#inM', '0'); await pg.fill('#inS', '3')
        ok(await pg.text_content('#big') == '00:03', f'{lang} 칸 → 00:03')
        await pg.fill('#inS', '1.5')
        ok(await pg.get_attribute('#inS', 'aria-invalid') == 'true', f'{lang} 소수 거부')
        await pg.fill('#inM', '90'); await pg.fill('#inS', '0')
        ok(await pg.text_content('#big') == '1:30:00', f'{lang} 분 칸 90 → 1:30:00: {await pg.text_content("#big")}')
        await pg.click('#inS'); await pg.keyboard.type('45')
        ok(await pg.input_value('#inS') == '45', f'{lang} 클릭 뒤 입력은 덮어씀: {await pg.input_value("#inS")}')
        await pg.evaluate('document.activeElement.blur()')
        hv = [await pg.input_value(x) for x in ('#inH', '#inM', '#inS')]
        ok(hv == ['1', '30', '45'], f'{lang} 칸을 떠나면 1:30:45로 풀어 씀: {hv}')
        await pg.fill('#inH', '0'); await pg.fill('#inM', '0')
        await pg.fill('#inS', '３')
        ok(await pg.get_attribute('#inS', 'aria-invalid') == 'false', f'{lang} 전각 숫자 받음')
        await pg.click('#go')
        await pg.clock.run_for(1100)
        ok(await pg.text_content('#big') == '00:02', f'{lang} 1초 뒤 00:02: {await pg.text_content("#big")}')
        await pg.clock.run_for(2500)
        ok(await pg.locator('.ringbar').count() == 1, f'{lang} 끝나면 울림 띠')
        ok(await pg.evaluate("document.getElementById('dialbox').classList.contains('is-done')"), f'{lang} 끝난 판')
        await pg.click('.ringbar .btn')
        ok(await pg.locator('.ringbar').count() == 0, f'{lang} 소리 끄기')
        # +1분 → 다시 돎
        await pg.click('#plus1')
        ok(await pg.text_content('#big') == '01:00', f'{lang} 끝난 뒤 +1분 → 01:00: {await pg.text_content("#big")}')
        await pg.evaluate('document.activeElement.blur()')
        await pg.keyboard.press('Space')  # 멈춤
        st = await pg.evaluate("JSON.parse(localStorage.getItem('ot.timers')).list[0].state")
        ok(st == 'pause', f'{lang} 스페이스 멈춤: {st}')
        await pg.keyboard.press('r')
        ok(await pg.evaluate("JSON.parse(localStorage.getItem('ot.timers')).list[0].state") == 'idle', f'{lang} R 다시')
        # 판 돌리기: 3시 방향 = 15분
        box = await pg.locator('#dialbox svg.dial').bounding_box()
        cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
        await pg.mouse.move(cx, cy - box['height'] * 0.28); await pg.mouse.down()
        for k in range(1, 11):
            import math
            a = math.radians(9 * k)
            await pg.mouse.move(cx + box['width'] * 0.28 * math.sin(a), cy - box['height'] * 0.28 * math.cos(a))
        await pg.mouse.up()
        ok(await pg.text_content('#big') == '15:00', f'{lang} 판 돌려 15분: {await pg.text_content("#big")}')
        ok(await pg.input_value('#inM') == '15', f'{lang} 판 → 칸 15')
        # 바로 시작 + 새로고침 뒤 이어짐
        await pg.click('[data-preset="10"]')
        await pg.clock.run_for(60_100)
        b10 = await pg.text_content('#big'); ok(b10 == '09:00', f'{lang} 10분 1분 뒤 09:00: {b10}')
        await pg.reload(); await pg.wait_for_timeout(200)
        ok(await pg.text_content('#big') == '09:00', f'{lang} 새로고침 뒤 09:00: {await pg.text_content("#big")}')
        # 도는 중 바로 시작 → 새 타이머
        await pg.click('[data-preset="3"]')
        n = await pg.evaluate("JSON.parse(localStorage.getItem('ot.timers')).list.length")
        ok(n == 2, f'{lang} 도는 중 바로 시작 = 새 타이머: {n}')
        ok(await pg.locator('.trow').count() == 2, f'{lang} 목록 두 줄')
        await pg.click('.trow:nth-child(1) .pick')
        ok(await pg.text_content('#big') == '09:00', f'{lang} 목록에서 고르면 판에 크게')
        await pg.click('#addT')
        ok(await pg.locator('.trow').count() == 3, f'{lang} 타이머 더하기')
        await pg.click('.trow:nth-child(3) .tx')
        ok(await pg.locator('.trow').count() == 2, f'{lang} 지우기')
        # 닫혀 있는 동안 끝남 → 소리 없이 '전에 끝났어요'
        await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('ot.timers'));s.list[0].end=Date.now()-180000;localStorage.setItem('ot.timers',JSON.stringify(s))})()")
        await pg.reload(); await pg.wait_for_timeout(200)
        ok(await pg.locator('.ringbar').count() == 0, f'{lang} 닫힌 동안 끝난 건 안 울림')
        await pg.click('.trow:nth-child(1) .pick')
        sub = await pg.text_content('#sub')
        ok(('전에 끝났어요' in sub) if lang == 'ko' else ('ago' in sub), f'{lang} 닫힌 동안 끝남 문구: {sub}')
        ok(not pg.errs, f'{lang} 콘솔 오류 {pg.errs[:2]}')
        if SHOTS:
            await pg.screenshot(path=str(SHOTS / f'timer-{lang}.png'), full_page=True)
        await ctx.close()


async def sec3(b):
    print('3 스톱워치')
    ctx, pg = await newpage(b)
    await pg.clock.install(time='2026-10-14T05:00:00Z')
    await pg.clock.pause_at('2026-10-14T05:00:01Z')
    await pg.goto(BASE + '/ko/stopwatch/')
    await pg.click('#go')
    await pg.clock.run_for(2500); await pg.click('#lap')
    await pg.clock.run_for(1000); await pg.keyboard.press('l')
    await pg.clock.run_for(4500); await pg.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'ㅣ',bubbles:true}))")
    ok(await pg.locator('#lapBody tr').count() == 3, '랩 세 줄')
    rows = await pg.evaluate("[...document.querySelectorAll('#lapBody tr')].map(r=>[...r.children].map(c=>c.textContent))")
    ok(rows[0][1] == '00:04.50' and rows[0][2] == '00:08.00', f'맨 위 = 최근 랩: {rows[0]}')
    ok('가장 빠름' in rows[1][0] and '가장 느림' in rows[0][0], f'빠름·느림 표시: {rows}')
    await pg.evaluate('document.activeElement.blur()')
    await pg.keyboard.press('Space')
    t1 = await pg.text_content('#big')
    await pg.clock.run_for(5000)
    ok(await pg.text_content('#big') == t1, '멈추면 그대로')
    await pg.reload(); await pg.wait_for_timeout(200)
    ok(await pg.locator('#lapBody tr').count() == 3 and await pg.text_content('#big') == t1, '새로고침 뒤 그대로')
    async with pg.expect_download() as dl:
        await pg.click('#csvLaps')
    d = await dl.value
    txt = Path(await d.path()).read_text(encoding='utf-8-sig')
    ok(txt.startswith('랩,랩 시간,누적 시간') and '3,00:04.50,00:08.00,4500,8000' in txt, f'CSV: {txt[:80]}')
    await pg.keyboard.press('r')
    ok(await pg.text_content('#big') == '00:00.00', '다시')
    ok(not pg.errs, f'콘솔 오류 {pg.errs[:2]}')
    if SHOTS:
        await pg.screenshot(path=str(SHOTS / 'watch.png'), full_page=True)
    await ctx.close()


async def sec4(b):
    print('4 알람')
    ctx, pg = await newpage(b, w=1366, h=900)
    await pg.clock.install(time='2026-10-14T05:00:00Z')  # 서울 14:00
    await pg.goto(BASE + '/ko/alarm/')
    await pg.wait_for_timeout(200)
    ok('오후 2:00' in await pg.text_content('#big') or '14:00' in await pg.text_content('#big'), f'지금 시각: {await pg.text_content("#big")}')
    await pg.click('[data-quick="10"]')
    ok(await pg.input_value('#aTime') == '14:10', f'+10분은 시각 칸만 채움: {await pg.input_value("#aTime")}')
    ok(await pg.locator('.arow').count() == 0, '+10분만으로는 안 만듦')
    await pg.click('#aAdd')
    ok(await pg.locator('.arow').count() == 1, '+10분 알람')
    await pg.click('#aAdd')
    ok(await pg.locator('.arow').count() == 1 and '이미' in await pg.text_content('#aNote'), '같은 시각 중복 막음')
    ok('10분 뒤' in await pg.text_content('.arow .au'), f'남은 시간: {await pg.text_content(".arow .au")}')
    await pg.fill('#aTime', '13:30')
    await pg.click('#aAdd')
    ok(await pg.locator('.arow').count() == 2, '시각 알람')
    au = await pg.text_content('.arow:nth-child(2) .au')
    ok('23시간 30분 뒤' in au, f'지난 시각은 내일: {au}')
    await pg.clock.fast_forward(10 * 60_000 - 30_000); await pg.clock.run_for(32_000)
    ok(await pg.locator('.ringbar').count() == 1, '울림 띠')
    await pg.click('.ringbar .btn.ghost')  # 5분 뒤 다시
    ok(await pg.locator('.arow').count() == 3, f'5분 뒤 다시 = 새 알람: {await pg.locator(".arow").count()}')
    # 잠자기 흉내: 열린 채로 2시간 건너뛰면 지난 알람은 '놓침'으로 묶어 알림(울리지 않음)
    await pg.click('.ringbar .btn') if await pg.locator('.ringbar').count() else None
    n_before = await pg.locator('.arow').count()
    await pg.clock.fast_forward(2 * 3600_000); await pg.clock.run_for(200)
    ok(await pg.locator('.ringbar').count() == 1 and ('지나간' in await pg.text_content('.ringbar p')), f'잠자기 뒤 놓친 알람 띠: {await pg.text_content(".ringbar p") if await pg.locator(".ringbar").count() else None}')
    # 닫혀 있는 동안 지나감
    await ctx.close()
    ctx, pg = await newpage(b, w=1366, h=900, clear=False)
    await pg.clock.install(time='2026-10-14T05:00:00Z')
    await pg.clock.pause_at('2026-10-14T05:00:05Z')
    await pg.goto(BASE + '/ko/alarm/')
    await pg.evaluate("localStorage.setItem('ot.alarms', JSON.stringify([{id:'a1',h:13,m:0,name:'회의',on:true,at:Date.now()-3600000}]))")
    await pg.reload(); await pg.wait_for_timeout(200)
    ok('지나갔어요' in await pg.text_content('.arow .au'), f'지나간 알람: {await pg.text_content(".arow .au")}')
    ok(not pg.errs, f'콘솔 오류 {pg.errs[:2]}')
    if SHOTS:
        await pg.screenshot(path=str(SHOTS / 'alarm.png'), full_page=True)
    await ctx.close()


async def sec5(b):
    print('5 세계 시간')
    ctx, pg = await newpage(b, w=1366, h=900)
    await pg.clock.install(time='2026-10-14T05:00:00Z')
    await pg.clock.pause_at('2026-10-14T05:00:05Z')
    await pg.goto(BASE + '/ko/world-clock/')
    await pg.wait_for_timeout(300)
    ok(await pg.text_content('#nowName') == '서울', f'기준 서울: {await pg.text_content("#nowName")}')
    ny = await pg.text_content('.city[data-id="newyork"] .cd')
    ok('서울보다 13시간 느림' in ny, f'뉴욕 시차: {ny}')
    dst = await pg.text_content('.city[data-id="newyork"] .dst')
    ok('11월 1일' in dst and '14시간' in dst, f'뉴욕 서머타임 줄: {dst}')
    await pg.fill('#cityIn', '밴쿠버'); await pg.click('#cityAdd')
    vdst = await pg.text_content('.city[data-id="vancouver"] .dst')
    ok('바뀌는 날 없음' in vdst, f'밴쿠버는 더 안 바뀜: {vdst}')
    ok('16시간 느림' in await pg.text_content('.city[data-id="vancouver"] .cd'), '밴쿠버 16시간')
    await pg.fill('#cityIn', '밴쿠버'); await pg.click('#cityAdd')
    ok('이미' in await pg.text_content('#cityNote'), '같은 도시 거부')
    for q, cid in (('LA', 'losangeles'), ('EST', 'newyork'), ('산티아고', 'santiago'), ('Seoul, Korea', None), ('로스엔젤레스', 'losangeles')):
        await pg.fill('#cityIn', q); await pg.click('#cityAdd')
        if cid:
            ok(await pg.locator(f'.city[data-id="{cid}"]').count() == 1, f'찾기 {q} → {cid}')
    sdst = await pg.text_content('.city[data-id="santiago"] .dst')
    ok('4월 4일 (일) 오전 12:00' in sdst, f'산티아고 자정 바뀜: {sdst}')
    await pg.fill('#cityIn', 'a'); await pg.click('#cityAdd')
    ok('is-bad' in (await pg.get_attribute('#cityNote', 'class') or ''), '한 글자 거부')
    for cid in ('santiago', 'losangeles'):
        if await pg.locator(f'.city[data-id="{cid}"] .cx').count():
            await pg.click(f'.city[data-id="{cid}"] .cx')
    await pg.fill('#cityIn', 'zzzz'); await pg.click('#cityAdd')
    ok(await pg.get_attribute('#cityNote', 'class') == 'note is-bad', '없는 도시')
    await pg.click('.city[data-id="vancouver"] .cx')
    ok(await pg.locator('.city[data-id="vancouver"]').count() == 0, '도시 빼기')
    # 회의 띠: 서울 22시 칸 → 뉴욕 9시
    await pg.click('#g24 tr:nth-child(1) td[data-h="22"]')
    line = await pg.text_content('#pickLine')
    ok('뉴욕 10월 14일 (수) 오전 9:00' in line, f'고른 칸 한 줄: {line[:120]}')
    await pg.fill('#meetTime', '09:30')
    ok('뉴욕 10월 13일 (화) 오후 8:30' in await pg.text_content('#pickLine'), f'분 단위 변환: {(await pg.text_content("#pickLine"))[:100]}')
    # 기준 바꾸기
    await pg.select_option('#baseSel', 'london')
    ok(await pg.text_content('#nowName') == '런던', '기준 런던')
    ok('런던보다 5시간 느림' in await pg.text_content('.city[data-id="newyork"] .cd'), '런던 기준 뉴욕')
    # 2026-11-01 이후 시드니
    ok(not pg.errs, f'콘솔 오류 {pg.errs[:2]}')
    if SHOTS:
        await pg.screenshot(path=str(SHOTS / 'world.png'), full_page=True)
    await ctx.close()
    # 영어판, 뉴욕 기기
    ctx, pg = await newpage(b, w=390, h=844, tz='America/New_York', locale='en-US')
    await pg.clock.install(time='2026-10-14T13:00:00Z')
    await pg.clock.pause_at('2026-10-14T13:00:05Z')
    await pg.goto(BASE + '/world-clock/')
    await pg.wait_for_timeout(300)
    ok(await pg.text_content('#nowName') == 'New York', f'en 기준 뉴욕: {await pg.text_content("#nowName")}')
    ok('5 h ahead of New York' in await pg.text_content('.city[data-id="london"] .cd'), 'en 런던 5시간')
    ok(not pg.errs, f'en 콘솔 오류 {pg.errs[:2]}')
    await ctx.close()


async def sec6(b):
    print('6 화면 밀림')
    for p in ['/', '/ko/', '/ko/stopwatch/', '/ko/alarm/', '/ko/world-clock/', '/world-clock/', '/ko/guide/korea-time-difference/']:
        for w in (390, 1366):
            ctx, pg = await newpage(b, w=w)
            await pg.add_init_script("""window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true})""")
            await pg.goto(BASE + p); await pg.wait_for_timeout(1200)
            cls = await pg.evaluate('window.__cls')
            ok(cls < 0.02, f'CLS {p} @{w}: {cls:.4f}')
            await ctx.close()


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for k, f in (('1', sec1), ('2', sec2), ('3', sec3), ('4', sec4), ('5', sec5), ('6', sec6)):
            if k in SEC:
                await f(b)
        await b.close()
    print(f'화면 확인: 통과 {passes} · 실패 {len(fails)}')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    if SHOTS:
        SHOTS.mkdir(parents=True, exist_ok=True)
    asyncio.run(main())
