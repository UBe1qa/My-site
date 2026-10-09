#!/usr/bin/env python3
"""화면을 실제로 눌러 보는 확인(Playwright). 먼저 `node calendar/_dev/serve.mjs` 로 http://localhost:8441 을 띄운다.
  python3 calendar/_dev/e2e.py
보는 것: 콘솔 오류·깨진 그림·가로 넘침(320·390·1366), 도구의 모든 단추, 받는 파일(PDF 쪽 수·크기, PNG 크기), 인쇄 화면 쪽 수,
음력 변환, 다가오는 쉬는 날, 언어 띠, 휴대폰 설정 판, 화면 밀림(CLS), 동작 줄이기, 광고 자리와 누르는 것 사이 거리."""
import sys
sys.dont_write_bytecode = True
import os
import re
import subprocess
import tempfile
from playwright.sync_api import sync_playwright

BASE = os.environ.get('CAL_BASE', 'http://localhost:8441')
CHROME = os.environ.get('CAL_CHROME', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
res = []


def ok(cond, msg):
    res.append((bool(cond), msg))
    if not cond:
        print('  ✗', msg)


def pdfinfo(path):
    out = subprocess.run(['pdfinfo', path], capture_output=True, text=True).stdout
    pages = int(re.search(r'Pages:\s+(\d+)', out).group(1))
    w, h = (float(x) for x in re.search(r'Page size:\s+([\d.]+) x ([\d.]+)', out).groups())
    return pages, round(w), round(h)


def ctx_of(b, w=1366, h=768, mobile=False, locale='ko-KR', **kw):
    c = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, locale=locale, accept_downloads=True, **kw)
    c.route(re.compile(r'googlesyndication|doubleclick|adservice|fundingchoices'), lambda r: r.abort())
    c.add_init_script('window.print = function(){ window.__printed = (window.__printed || 0) + 1; }')
    return c


def open_page(c, path):
    pg = c.new_page()
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'net::' not in m.text and 'Failed to load resource' not in m.text else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.goto(BASE + path, wait_until='load')
    pg.wait_for_timeout(500)
    return pg, errs


def download(pg, selector):
    with pg.expect_download(timeout=30000) as d:
        pg.click(selector)
    f = d.value
    path = tempfile.mktemp(suffix='-' + f.suggested_filename)
    f.save_as(path)
    return f.suggested_filename, path


PAGES = ['/', '/ko/', '/2027/', '/ko/2027/', '/ko/2028/', '/2026/october/', '/ko/2026/10/', '/ko/2027/2/', '/2027/holidays/', '/ko/2027/holidays/', '/ko/2026/holidays/',
         '/ko/lunar/', '/ko/son-eomneun-nal/', '/guide/', '/ko/guide/', '/guide/2027-long-weekends/', '/guide/south-korea-public-holidays-2027/', '/ko/guide/daeche-gonghyuil/',
         '/ko/guide/a4-han-jang-inswae/', '/about/', '/ko/privacy/', '/licenses/', '/no-such-page']

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--proxy-bypass-list=localhost;127.0.0.1'])

    # 1) 모든 종류의 페이지: 콘솔 오류, 깨진 그림, 가로 넘침
    for w, mobile in ((1366, False), (390, True), (320, True)):
        c = ctx_of(b, w, 800, mobile)
        for path in PAGES:
            pg, errs = open_page(c, path)
            sw = pg.evaluate('document.documentElement.scrollWidth')
            broken = pg.evaluate('[...document.images].filter(i => i.complete && i.naturalWidth === 0).length')
            ok(sw <= w and not errs and broken == 0, f'{path} @{w}: 가로 {sw}, 콘솔 {errs[:2]}, 깨진 그림 {broken}')
            if path == '/no-such-page':
                ok('Page not found' in pg.inner_text('h1'), '없는 주소는 404 화면')
            pg.close()
        c.close()

    # 2) 한국어 첫 화면 도구
    c = ctx_of(b)
    pg, errs = open_page(c, '/ko/')
    T = '[data-tool] '
    ok(pg.get_attribute(T + '[data-pdf]', 'href') == '/files/2027-calendar-korea-a4-landscape.pdf', '처음 PDF = 미리 만든 파일')
    name, path = download(pg, T + '[data-pdf]')
    ok(name == '2027-calendar-korea-a4-landscape.pdf' and pdfinfo(path) == (1, 842, 595), f'미리 만든 PDF 받기: {name} {pdfinfo(path)}')
    pg.wait_for_timeout(1500)
    ok(pg.inner_text(T + '[data-pdf] span') == 'PDF 받기', '받았어요 표시가 돌아온다')
    ok(pg.inner_text('.up li:first-child small') != '', '다가오는 쉬는 날이 채워진다')
    pg.click(T + '[data-step="1"]')
    ok(pg.inner_text(T + 'h1') == '2028년 달력 인쇄' and '발표 전' in pg.inner_text(T + '[data-basis]'), '2028: 제목·공식 발표 전 표시')
    ok('2028' in pg.inner_html(T + '.paper') and '공식 발표 전 자료' in pg.inner_html(T + '.paper'), '2028 종이에 표시')
    pg.click(T + '[data-step="1"]')
    ok('예상' in pg.inner_text(T + '[data-basis]') and pg.get_attribute(T + '[data-pdf]', 'download') is None and pg.is_hidden(T + '[data-xlsx]'), '2029: 예상 표시, 미리 만든 파일·엑셀 없음')
    name, path = download(pg, T + '[data-pdf]')
    ok(name == '2029-calendar-korea-a4-landscape.pdf' and pdfinfo(path) == (1, 842, 595) and os.path.getsize(path) > 100000, f'기기에서 만든 PDF: {name} {pdfinfo(path)} {os.path.getsize(path)}')
    pg.click(T + '[data-step="1"]')
    ok(pg.is_disabled(T + '[data-step="1"]') and pg.inner_text(T + 'output') == '2030', '2030에서 다음 해 단추 꺼짐')
    for _ in range(3):
        pg.click(T + '[data-step="-1"]')
    ok(pg.inner_text(T + 'output') == '2027' and pg.is_visible(T + '[data-xlsx]'), '2027로 돌아옴, 엑셀 링크 보임')
    name, path = download(pg, T + '[data-xlsx]')
    ok(name == '2027-calendar-korea.xlsx' and os.path.getsize(path) > 8000, '엑셀 받기')
    # 모양
    pg.click(T + '.shape[data-orient="portrait"]')
    ok(pg.get_attribute(T + '[data-pdf]', 'href').endswith('a4-portrait.pdf') and float(pg.evaluate("getComputedStyle(document.querySelector('.crop')).getPropertyValue('--ratio')")) < 1, '세로: 파일·종이 비율')
    pg.click(T + '.shape[data-kind="months"]')
    ok('12쪽' in pg.inner_text(T + '[data-meta]') and pg.get_attribute(T + '[data-pdf]', 'href').endswith('korea-monthly-a4.pdf') and pg.is_visible(T + '.mstep'), '월별 12장: 12쪽, 파일, 달 넘기기')
    pg.click(T + '[data-mstep="1"]')
    ok(pg.inner_text(T + '.mstep b') == '2월' and '>2월<' in pg.inner_html(T + '.paper'), '달 넘기기 → 2월')
    pg.click(T + '.shape[data-kind="month"]')
    ok('한 달 · 2월' in pg.inner_text(T + '[data-what]') and pg.get_attribute(T + '[data-pdf]', 'download') is None, '한 달: 어느 달인지 보임')
    name, path = download(pg, T + '[data-pdf]')
    ok(name == '2027-02-calendar-korea-a4.pdf' and pdfinfo(path)[0] == 1, f'한 달 PDF {name}')
    # 설정
    pg.click(T + '.opt-toggle')
    ok(pg.is_visible('#opts') and pg.is_visible(T + '[data-opt="lunar"]'), '내 설정 펼침, 달 모양에서는 음력 보임')
    pg.click(T + '[data-opt="son"]')
    ok('손 없는 날' in pg.inner_html(T + '.paper'), '손 없는 날 켜기')
    pg.click(T + '[data-opt="lunar"]')
    ok('음 1.' not in pg.inner_html(T + '.paper'), '음력 끄기')
    pg.click(T + '.shape[data-kind="year"][data-orient="landscape"]')
    ok(pg.is_hidden(T + '[data-opt="lunar"]'), '1년 한 장에서는 음력·절기 칸 숨김')
    pg.click(T + '[data-seg="weekStart"][data-v="1"]')
    ok('월요일 시작' in pg.inner_html(T + '.paper') and pg.get_attribute(T + '[data-pdf]', 'download') is None, '월요일 시작 → 기기에서 만들기')
    pg.click(T + '[data-opt="week"]')
    ok('>53<' in pg.inner_html(T + '.paper'), '주 번호(ISO, 2027-01-01 = 53주)')
    pg.click(T + '[data-opt="mono"]')
    ok('#d2332a' not in pg.inner_html(T + '.paper'), '흑백: 빨강 없음')
    pg.select_option('#o-paper', 'letter')
    ok(abs(float(pg.evaluate("getComputedStyle(document.querySelector('.crop')).getPropertyValue('--ratio')")) - 1.2941) < 0.001 and 'Letter' in pg.inner_text(T + '[data-meta]'), 'Letter 용지 비율')
    pg.select_option('#o-country', 'US')
    ok('미국 연방 공휴일' in pg.inner_html(T + '.paper') and '5 U.S.C. 6103' in pg.inner_text(T + '[data-basis]'), '미국 공휴일로 바꿈')
    pg.click(T + '[data-opt="names"]')
    ok('마틴 루서 킹' not in pg.inner_html(T + '.paper'), '공휴일 이름 끄기')
    pg.click(T + '[data-opt="names"]')
    name, path = download(pg, T + '[data-png]')
    from PIL import Image
    im = Image.open(path)
    ok(name == '2027-calendar-us-letter-landscape.png' and im.size == (2200, 1700), f'이미지로 저장: {name} {im.size}')
    pg.click(T + '.shape[data-kind="months"]')
    name, path = download(pg, T + '[data-pdf]')
    ok(pdfinfo(path) == (12, 792, 612), f'내 설정 월별 12장 PDF: {pdfinfo(path)}')
    pg.click(T + '[data-print]')
    ok(pg.evaluate('window.__printed') == 1 and pg.evaluate("document.querySelectorAll('#print-root svg').length") == 12, '인쇄 단추: 인쇄 창 호출, 종이 12장 준비')
    pg.emulate_media(media='print')
    f = tempfile.mktemp(suffix='.pdf')
    pg.pdf(path=f, prefer_css_page_size=True)
    ok(pdfinfo(f) == (12, 792, 612), f'인쇄 화면: 12쪽, Letter 가로 {pdfinfo(f)}')
    pg.emulate_media(media='screen')
    pg.evaluate('window.dispatchEvent(new Event("afterprint"))')
    pg.click(T + '.shape[data-kind="year"][data-orient="portrait"]')
    pg.evaluate('window.dispatchEvent(new Event("beforeprint"))')
    pg.emulate_media(media='print')
    pg.pdf(path=f, prefer_css_page_size=True)
    ok(pdfinfo(f) == (1, 612, 792), f'인쇄 화면: 세로 한 장 {pdfinfo(f)}')
    pg.emulate_media(media='screen')
    pg.evaluate('window.dispatchEvent(new Event("afterprint"))')
    pg.click(T + '.paper')
    ok(pg.is_visible('dialog.zoom svg'), '미리보기를 누르면 크게')
    pg.click('.zoom-x')
    ok(pg.locator('dialog.zoom').count() == 0, '크게 보기 닫기')
    ok(pg.locator('[data-pdf]').count() == 1, '받기 단추는 하나')
    ok(not errs, f'도구 콘솔 오류 {errs[:3]}')
    pg.close(); c.close()

    # 3) 영어 첫 화면·연간
    c = ctx_of(b, locale='en-US')
    pg, errs = open_page(c, '/')
    ok(pg.inner_text(T + 'h1') == 'Printable 2027 Calendar' and pg.get_attribute(T + '[data-pdf]', 'href') == '/files/2027-calendar-us-letter-landscape.pdf', '영어: 제목·Letter 파일')
    name, path = download(pg, T + '[data-pdf]')
    ok(pdfinfo(path) == (1, 792, 612), '영어 PDF Letter 가로')
    pg.click(T + '.opt-toggle')
    pg.select_option('#o-country', 'KR')
    ok('Seollal holiday' in pg.inner_html(T + '.paper') and '설' not in pg.inner_html(T + '.paper'), '영어 화면 + 한국 공휴일은 영어 이름')
    ok(not re.search('[가-힣]', pg.inner_text('main')), '영어 화면 본문에 한글 없음(설정을 바꾼 뒤에도)')
    pg.close()
    pg, errs = open_page(c, '/2027/')
    ok(pg.locator(T + '[data-step]').count() == 0 and pg.locator('.years a[aria-current]').inner_text() == '2027', '연간 페이지: 연도는 링크')
    pg.click(T + '.shape[data-kind="months"]')
    ok(pg.get_attribute(T + '[data-pdf]', 'href') == '/files/2027-calendar-us-monthly-letter.pdf', '연간 페이지 월별 파일')
    pg.close(); c.close()

    # 4) 월 페이지
    c = ctx_of(b)
    pg, errs = open_page(c, '/ko/2026/10/')
    name, path = download(pg, '[data-month-page] [data-pdf]')
    ok(name == '2026-10-calendar-korea-a4.pdf' and pdfinfo(path) == (1, 842, 595), f'이 달 PDF {name}')
    name, path = download(pg, '[data-month-page] [data-png]')
    ok(name.endswith('.png') and Image.open(path).size == (2339, 1654), '이 달 이미지 A4 200dpi')
    pg.click('[data-month-page] [data-print]')
    pg.emulate_media(media='print')
    f = tempfile.mktemp(suffix='.pdf')
    pg.pdf(path=f, prefer_css_page_size=True)
    ok(pdfinfo(f) == (1, 842, 595), f'월 페이지 인쇄 한 장 {pdfinfo(f)}')
    pg.emulate_media(media='screen')
    import datetime
    t = datetime.date.today()
    if (t.year, t.month) == (2026, 10):
        ok(pg.locator('td.is-today .today-ring.on').count() == 1, '오늘 동그라미(이번 달 페이지)')
    pg.close()
    pg, errs = open_page(c, '/ko/2027/2/')
    ok(pg.locator('.today-ring').count() == 0, '다른 달 페이지에는 오늘 동그라미 없음')
    ok(pg.get_attribute('a[data-nav-month]', 'href') == f'/ko/{t.year}/{t.month}/' or (t.year, t.month) > (2027, 12), "머리 메뉴 '월 달력' = 이번 달")
    pg.close()

    # 5) 음력 변환
    pg, errs = open_page(c, '/ko/lunar/')
    def conv(vals):
        for k, v in vals.items():
            pg.fill(f'[name="{k}"]', str(v))
        pg.wait_for_timeout(80)
    conv(dict(sy=2027, sm=2, sd=7))
    ok('음력 2027년 1월 1일' in pg.inner_text('[data-out="s2l"]'), '양력 2027-02-07 = 음력 1월 1일')
    conv(dict(sy=2025, sm=7, sd=25))
    ok('윤6월 1일' in pg.inner_text('[data-out="s2l"]'), '2025-07-25 = 윤6월 1일')
    conv(dict(sy=1900, sm=1, sd=1))
    ok('지원 범위 밖' in pg.inner_text('[data-out="s2l"]'), '범위 밖 알림')
    conv(dict(sy=2027, sm=2, sd=30))
    ok('없는 날짜' in pg.inner_text('[data-out="s2l"]'), '없는 날짜 알림')
    conv(dict(ly=2027, lm=8, ld=15))
    if pg.is_checked('[name="leap"]'):
        pg.uncheck('[name="leap"]')
    ok('양력 2027년 9월 15일 수요일' in pg.inner_text('[data-out="l2s"]'), '음력 2027-08-15 = 9월 15일(수)')
    pg.check('[name="leap"]')
    ok('윤8월이 없어요' in pg.inner_text('[data-out="l2s"]'), '없는 윤달 알림')
    pg.uncheck('[name="leap"]')
    conv(dict(ly=2027, lm=1, ld=30))
    ok('29일까지' in pg.inner_text('[data-out="l2s"]'), '작은달 30일 알림')
    conv(dict(ly=2060, lm=1, ld=1))
    ok('지원 범위 밖' in pg.inner_text('[data-out="l2s"]'), '음력 범위 밖 알림')
    pg.click('[data-lstep="1"]')
    ok(pg.locator('[data-lmonth] table.wm td[data-d]').count() >= 28, '음력 달력 넘기기')
    ok(not errs, f'음력 콘솔 오류 {errs[:3]}')
    pg.close(); c.close()

    # 6) 언어 안내 띠: 브라우저 언어가 다를 때만, 닫으면 기억
    c = ctx_of(b, locale='en-US')
    pg, errs = open_page(c, '/ko/')
    ok(pg.is_visible('.lang-bar') and pg.evaluate("getComputedStyle(document.querySelector('.lang-bar')).position") == 'absolute', '영어 브라우저 → 한국어판에 띠(겹쳐 띄움)')
    pg.click('.lang-bar button')
    pg.reload(); pg.wait_for_timeout(300)
    ok(pg.locator('.lang-bar').count() == 0 and pg.evaluate("localStorage.getItem('cal.lang')") == 'ko', '띠를 닫으면 기억(cal.lang)')
    pg.close(); c.close()

    # 7) 휴대폰: 설정 판과 미리보기가 같이 보인다
    c = ctx_of(b, 390, 844, True)
    pg, errs = open_page(c, '/ko/')
    r = pg.evaluate("(() => { const b = document.querySelector('[data-pdf]').getBoundingClientRect(); return [b.top, b.bottom]; })()")
    ok(r[1] < 667, f'375×667 안에 PDF 받기 단추({r})')
    pg.tap('.opt-toggle'); pg.wait_for_timeout(500)
    g = pg.evaluate("""(() => { const q = s => document.querySelector(s).getBoundingClientRect(); const p = q('.paper'), o = q('#opts'), a = q('[data-pdf]');
      return { paperTop: p.top, paperBottom: p.bottom, optsTop: o.top, optsBottom: o.bottom, pdfTop: a.top, pdfBottom: a.bottom, vh: innerHeight }; })()""")
    ok(g['paperTop'] >= 0 and g['paperBottom'] <= g['optsTop'] + 2 and g['pdfBottom'] <= g['vh'] + 1 and g['optsBottom'] <= g['pdfTop'] + 12, f'설정 판 위에 종이, 아래에 받기 단추 {g}')
    pg.tap('[data-seg="weekStart"][data-v="1"]')
    ok('월요일 시작' in pg.inner_html('.paper'), '판을 연 채 설정을 바꾸면 종이가 바뀐다')
    pg.tap('[data-opt-close]')
    ok(pg.is_hidden('#opts'), '판 닫기')
    pg.tap('.paper')
    ok(pg.is_visible('dialog.zoom svg') and pg.evaluate("document.querySelector('dialog.zoom svg').getBoundingClientRect().width") >= 1000, '휴대폰: 미리보기를 누르면 크게(가로 1000px 이상)')
    pg.close(); c.close()

    # 8) 화면 밀림(CLS): CPU 4배 느리게, 브라우저 언어가 달라도
    for path, locale in (('/ko/', 'ko-KR'), ('/', 'ko-KR'), ('/ko/2027/', 'en-US'), ('/ko/2026/10/', 'ko-KR'), ('/2026/october/', 'en-US'), ('/ko/lunar/', 'ko-KR')):
        for w, mobile in ((1366, False), (390, True)):
            c = ctx_of(b, w, 800, mobile, locale=locale)
            c.add_init_script("window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });")
            pg = c.new_page()
            cdp = c.new_cdp_session(pg)
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
            pg.goto(BASE + path + '?noadpreview', wait_until='load'); pg.wait_for_timeout(4200)   # 글꼴이 늦게 와서 바뀌는 것까지
            cls = pg.evaluate('window.__cls')
            ok(cls <= 0.02, f'CLS {path} @{w} ({locale}) = {cls:.4f}')
            pg.close(); c.close()

    # 9) 동작 줄이기: 내용이 다 보이고 루멘랩 귀퉁이는 접힌 채
    c = ctx_of(b, reduced_motion='reduce')
    pg, errs = open_page(c, '/ko/')
    ok(not pg.evaluate("document.documentElement.classList.contains('anim')") and pg.is_visible('.lumen'), '동작 줄이기: 숨김 없음')
    pg.close(); c.close()
    c = ctx_of(b)
    pg, errs = open_page(c, '/ko/guide/daeche-gonghyuil/')
    ok(not pg.evaluate("document.querySelector('.lumen').classList.contains('in')"), '루멘랩 귀퉁이: 화면 밖에서는 아직')
    pg.evaluate("document.querySelector('.lumen').scrollIntoView({block:'center'})"); pg.wait_for_timeout(900)
    ok(pg.evaluate("document.querySelector('.lumen').classList.contains('in')") and pg.get_attribute('.lumen', 'href') == 'https://lumenlab.page/', '루멘랩 귀퉁이: 들어오면 한 번, 한국어판 링크')
    pg.close()
    pg, errs = open_page(c, '/guide/2027-long-weekends/')
    ok(pg.get_attribute('.lumen', 'href') == 'https://lumenlab.page/en/', '영어판 루멘랩 링크 = /en/')
    pg.close(); c.close()

    # 10) 광고 자리(localhost 미리보기)와 누르는 것 사이 거리 40px 이상
    for path in ('/ko/', '/', '/ko/2027/', '/ko/2026/10/', '/ko/2027/holidays/', '/ko/lunar/', '/ko/son-eomneun-nal/', '/ko/guide/a4-han-jang-inswae/', '/guide/week-numbers-iso-vs-us/'):
        for w, mobile in ((1366, False), (390, True)):
            c = ctx_of(b, w, 800, mobile)
            pg, errs = open_page(c, path)
            d = pg.evaluate("""(() => { let min = 1e9, n = 0;
              document.querySelectorAll('[data-ad]').forEach(ad => { const a = ad.getBoundingClientRect(); if (!a.height) return; n++;
                document.querySelectorAll('main button, main a.btn, main input, main select, main summary, main .pills a, main .m-nav a').forEach(el => { const r = el.getBoundingClientRect(); if (!r.height) return;
                  const gap = r.bottom <= a.top ? a.top - r.bottom : r.top >= a.bottom ? r.top - a.bottom : 0; if (gap < min) min = gap; }); });
              return [n, min]; })()""")
            ok(d[0] >= 1 and d[1] >= 40, f'광고 자리 {path} @{w}: {d[0]}곳, 가장 가까운 단추까지 {d[1]:.0f}px')
            pg.close(); c.close()
    c = ctx_of(b)
    pg, errs = open_page(c, '/ko/about/')
    ok(pg.locator('[data-ad]').count() == 0, '소개 페이지에는 광고 자리 없음')
    pg.close(); c.close()
    b.close()

good = sum(1 for r in res if r[0])
print(f'화면 확인: 통과 {good}, 실패 {len(res) - good}')
sys.exit(0 if good == len(res) else 1)
