"""theopen 동작 확인 (작업 공간 브라우저)
- 휴대폰: 아래 막대가 첫 화면에선 숨고, 본문에서 보이고, 상담 칸에서 숨는지
- 상담 신청서: 고른 값·적은 글이 문자(sms:)·메일(mailto:) 주소에 그대로 담기는지 (링크 클릭을 가로채서 확인)
- 영상 상담하기 → '영상 편집·광고'가 미리 골라지는지
- 동선 도면 점선이 다 그려지는지, 가로 스크롤 0, 콘솔 오류 0 (320·390·1366)
사용: python3 behave.py <폴더 또는 주소>"""
import asyncio, os, sys, subprocess, time
from urllib.parse import unquote
from playwright.async_api import async_playwright

target = sys.argv[1]
srv = None
if not target.startswith('http'):
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766', '--bind', '127.0.0.1'], cwd=target,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    base = 'http://127.0.0.1:8766/'
else:
    base = target
proxy = os.environ.get('HTTPS_PROXY', '')

CATCH = """
window.__links = [];
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a');
  if (a && /^(sms|mailto):/.test(a.getAttribute('href') || '')) { window.__links.push(a.href); e.preventDefault(); }
}, true);
"""

fails = []
def check(ok, msg):
    print(('  OK  ' if ok else '  !!  ') + msg)
    if not ok: fails.append(msg)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=[f'--proxy-server=https={proxy.replace("http://", "")}'] if proxy and srv is None else
                                    ([f'--proxy-server=https={proxy.replace("http://", "")}'] if proxy else []))
        # ---------- 휴대폰 ----------
        for w, h in ((390, 844), (320, 640)):
            ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                      locale='ko-KR', user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')
            pg = await ctx.new_page()
            errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.add_init_script(CATCH)
            await pg.goto(base, wait_until='networkidle')
            await pg.wait_for_timeout(4200)
            print(f'[휴대폰 {w}x{h}]')
            sw = await pg.evaluate('document.documentElement.scrollWidth')
            check(sw == w, f'가로 스크롤 없음 (scrollWidth {sw})')
            wide = await pg.evaluate(f'[...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > {w} + 1 && getComputedStyle(e).position !== "fixed" && !e.closest(".site-header") && !e.closest("svg")).map(e => e.tagName + "." + e.className).slice(0,5)')
            check(not wide, f'화면 밖으로 넘치는 요소 없음 {wide}')
            if w == 390:
                on = await pg.evaluate('document.querySelector("[data-mbar]").classList.contains("is-on")')
                check(not on, '첫 화면에선 아래 막대 숨김')
                await pg.wait_for_timeout(1200)
                off = await pg.evaluate('(() => { const s = document.querySelector("[data-sheet]"); const d = [...s.querySelectorAll(".p-dot")]; if (!d.length) return getComputedStyle(s.querySelector(".p-path")).opacity === "1" ? "full" : "hidden"; const on = d.filter(e => e.style.opacity !== "0").length; return on === d.length ? "full" : on + "/" + d.length; })()')
                wall = await pg.evaluate('getComputedStyle(document.querySelector(".p-wall--inner")).strokeDashoffset')
                node = await pg.evaluate('getComputedStyle(document.querySelector(".p-node:last-of-type")).opacity')
                check(off == 'full' and wall in ('0', '0px') and node == '1', f'도면: 벽·점선·번호 끝까지 그려짐 (점선 {off}, 벽 {wall}, 번호 {node})')
                await pg.evaluate('document.querySelector("#process").scrollIntoView({behavior:"instant"})')
                await pg.wait_for_timeout(600)
                on = await pg.evaluate('document.querySelector("[data-mbar]").classList.contains("is-on")')
                check(on, '본문에선 아래 막대 보임')
                await pg.evaluate('document.querySelector("#contact").scrollIntoView({behavior:"instant"})')
                await pg.wait_for_timeout(600)
                on = await pg.evaluate('document.querySelector("[data-mbar]").classList.contains("is-on")')
                check(not on, '상담 칸에선 아래 막대 숨김')
                # 상담 종류 미리 고르기: 개원·리뉴얼 칸 버튼, 영상 상담하기
                for sel, want in (('#start a[data-topic="신규 개원"]', '신규 개원'), ('#start a[data-topic="리뉴얼"]', '리뉴얼'), ('#video a[data-topic]', '영상 편집·광고')):
                    await pg.evaluate(f'document.querySelector({sel!r}).scrollIntoView({{behavior:"instant", block:"center"}})')
                    await pg.wait_for_timeout(300)
                    await pg.click(sel)
                    await pg.wait_for_timeout(400)
                    v = await pg.evaluate('(document.querySelector("input[name=topic]:checked")||{}).value')
                    check(v == want, f'{sel} → 상담 종류 "{v}"')
                # 공간 칸: 휴대폰에선 칸마다 잘라 낸 평면 4개, 큰 평면은 숨김
                n = await pg.evaluate('document.querySelectorAll(".zone .zone__crop svg").length')
                fig = await pg.evaluate('getComputedStyle(document.querySelector("[data-space-fig]")).display')
                check(n == 4 and fig == 'none', f'공간 칸: 칸마다 작은 평면 {n}개, 큰 평면 {fig}')
                on = await pg.evaluate('[...document.querySelectorAll(".zone__crop")].map((c, i) => c.querySelector(".z.is-on") && c.querySelector(".z.is-on").dataset.z)')
                check(on == ['1', '2', '3', '4'], f'작은 평면마다 그 공간이 칠해짐 {on}')
                # 준비할 것: 상담 칸 안(신청서 앞)에 다섯 가지
                prep = await pg.evaluate('(() => { const p = document.querySelector("#contact .prep"); return p ? p.querySelectorAll("li").length : 0; })()')
                check(prep == 5, f'상담 칸 안에 준비할 것 {prep}가지')
                # 신청서 → 문자
                first = await pg.evaluate('[...document.querySelectorAll(".inquiry__actions .btn")].filter(b => !b.hidden).map(b => b.dataset.via)')
                check(first == ['sms', 'mail'], f'휴대폰 버튼: 문자 → 메일 ({first})')
                hdr = await pg.evaluate('getComputedStyle(document.querySelector(".cta-narrow")).display')
                check(hdr != 'none', '휴대폰 머리 막대 버튼은 "전화"')
                await pg.click('label.chip:has-text("리뉴얼")')
                await pg.fill('input[name=budget]', '5천만 원 안팎')
                await pg.fill('input[name=place]', '서울 송파구, 약 35평')
                await pg.fill('textarea[name=memo]', '대기실을 넓게 <b>&"</b>')
                await pg.click('button[data-via=sms]')
                await pg.wait_for_timeout(400)
                links = await pg.evaluate('window.__links')
                check(len(links) == 1 and links[0].startswith('sms:01026110157&body='), f'문자 주소 모양 (아이폰): {links[0][:40] if links else None}')
                body = unquote(links[0].split('body=', 1)[1]) if links else ''
                print('    문자 내용 >>', body.replace('\n', ' / '))
                check('상담: 리뉴얼' in body and '예산: 5천만 원 안팎' in body and '지역·평수: 서울 송파구, 약 35평' in body and '<b>&"</b>' in body, '적은 내용이 그대로 담김')
                st = await pg.evaluate('document.querySelector("[data-status]").textContent')
                check('문자 앱' in st and not await pg.evaluate('document.querySelector("[data-status]").hidden'), '안내 문구 보임')
                check(await pg.evaluate('document.querySelector("[data-status] b") === null'), '적은 글이 HTML로 안 들어감')
            check(not errs, f'콘솔 오류 없음 {errs}')
            await ctx.close()

        # ---------- 컴퓨터 ----------
        ctx = await b.new_context(viewport={'width': 1366, 'height': 768}, locale='ko-KR', permissions=['clipboard-read', 'clipboard-write'])
        pg = await ctx.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(CATCH)
        await pg.goto(base, wait_until='networkidle')
        await pg.wait_for_timeout(1500)
        print('[컴퓨터 1366x768]')
        sw = await pg.evaluate('document.documentElement.scrollWidth')
        check(sw == 1366, f'가로 스크롤 없음 ({sw})')
        first = await pg.evaluate('[...document.querySelectorAll(".inquiry__actions .btn")].filter(b => !b.hidden && getComputedStyle(b).display !== "none").map(b => b.dataset.via + ":" + b.textContent.trim())')
        check(first == ['copy:적은 내용 복사하기', 'mail:메일 앱으로 보내기'], f'컴퓨터 버튼: 복사 → 메일 앱 ({first})')
        mbar = await pg.evaluate('getComputedStyle(document.querySelector("[data-mbar]")).display')
        check(mbar == 'none', '컴퓨터에선 아래 막대 없음')
        await pg.evaluate('document.querySelector("#contact").scrollIntoView({behavior:"instant"})')
        await pg.click('label.chip:has-text("신규 개원")')
        await pg.fill('input[name=who]', '홍길동 원장 / 예시한의원')
        await pg.click('button[data-via=copy]')
        await pg.wait_for_timeout(400)
        clip = await pg.evaluate('navigator.clipboard.readText()')
        print('    복사된 내용 >>', clip.replace('\n', ' / '))
        check('상담: 신규 개원' in clip and '성함·한의원: 홍길동 원장 / 예시한의원' in clip, '복사하기: 적은 내용이 복사됨')
        st = await pg.evaluate('document.querySelector("[data-status]").textContent')
        check('복사했습니다' in st and 'lunar_23@naver.com' in st, f'복사 안내 문구: {st[:40]}')
        check(await pg.evaluate('location.search') == '', '주소창에 적은 내용이 안 붙음')
        await pg.click('button[data-via=mail]')
        await pg.wait_for_timeout(400)
        links = await pg.evaluate('window.__links')
        check(len(links) == 1 and links[0].startswith('mailto:lunar_23@naver.com?subject='), f'메일 주소 모양: {links[0][:48] if links else None}')
        body = unquote(links[0].split('body=', 1)[1]) if links else ''
        print('    메일 내용 >>', body.replace('\n', ' / '))
        check('상담: 신규 개원' in body and '성함·한의원: 홍길동 원장 / 예시한의원' in body, '고른 값·적은 글이 메일에 담김')
        # 공간 칸: 컴퓨터에선 오른쪽 평면이 따라오고, 가운데 칸의 공간이 칠해짐
        await pg.evaluate('(() => { const z = document.querySelector(".zone[data-zone=\'3\']"); window.scrollTo(0, z.getBoundingClientRect().top + scrollY - innerHeight / 2 + z.offsetHeight / 2); })()')
        await pg.wait_for_timeout(700)
        for _ in range(2):  # 여러 확인을 동시에 돌리면 부드러운 스크롤이 늦게 멈출 때가 있어 한 번 더 맞춤
            if await pg.evaluate('[...document.querySelectorAll("[data-space-fig] .z.is-on")].map(e => e.dataset.z).join() === "3"'): break
            await pg.evaluate('(() => { const z = document.querySelector(".zone[data-zone=\'3\']"); window.scrollTo(0, z.getBoundingClientRect().top + scrollY - innerHeight / 2 + z.offsetHeight / 2); })()')
            await pg.wait_for_timeout(900)
        zinfo = await pg.evaluate('({ on: [...document.querySelectorAll("[data-space-fig] .z.is-on")].map(e => e.dataset.z), pos: getComputedStyle(document.querySelector("[data-space-fig]")).position, top: Math.round(document.querySelector("[data-space-fig]").getBoundingClientRect().top), crops: getComputedStyle(document.querySelector(".zone__crop")).display })')
        check(zinfo['on'] == ['3'] and zinfo['pos'] == 'sticky' and 0 < zinfo['top'] < 200 and zinfo['crops'] == 'none', f'공간 칸 (컴퓨터): {zinfo}')
        dup = await pg.evaluate('(() => { const ids = [...document.querySelectorAll("[id]")].map(e => e.id); return ids.filter((v, i) => ids.indexOf(v) !== i); })()')
        check(not dup, f'같은 id 없음 {dup}')
        # 머리 막대 링크가 모두 있는 칸으로 이어지는지
        missing = await pg.evaluate('[...document.querySelectorAll("a[href^=\'#\']")].map(a => a.getAttribute("href")).filter(h => h.length > 1 && !document.querySelector(h))')
        check(not missing, f'페이지 안 링크 모두 연결 {missing}')
        tels = await pg.evaluate('[...new Set([...document.querySelectorAll("a[href^=tel]")].map(a => a.getAttribute("href")))]')
        check(tels == ['tel:010-2611-0157'], f'전화 링크 {tels}')
        mails = await pg.evaluate('[...new Set([...document.querySelectorAll("a[href^=mailto]")].map(a => a.getAttribute("href")))]')
        check(mails == ['mailto:lunar_23@naver.com'], f'메일 링크 {mails}')
        check(not errs, f'콘솔 오류 없음 {errs}')
        await ctx.close()
        await b.close()

try:
    asyncio.run(main())
finally:
    if srv: srv.terminate()
print('\n결과:', '전부 통과' if not fails else f'{len(fails)}개 실패')
