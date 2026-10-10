#!/usr/bin/env python3
"""화면을 실제로 눌러 보는 확인(Playwright). 먼저 `node calendar/_dev/serve.mjs` 로 http://localhost:8441 을 띄운다.
  python3 calendar/_dev/e2e.py
보는 것: 콘솔 오류·깨진 그림·가로 넘침(320·360·390·1366), 휴대폰에서 표 잘림·단추 글자 넘침·누르는 곳 크기(44px),
도구의 모든 단추, 받는 파일(PDF 쪽 수·크기·글꼴이 담겼는지, PNG 크기), 글꼴을 못 받았을 때의 그림 PDF, 인쇄 화면 쪽 수,
주소에 담긴 설정(1.5초 뒤 한 번만 고침, 쓸 수 없는 값 안내), 언어를 바꿀 때 따라가는 설정, 나라를 바꾸면 따라오는 링크·목록, 기기 날짜가 달라졌을 때,
음력 변환, 다가오는 쉬는 날, 언어 띠(누를 수 있는 것과 겹치지 않음), 휴대폰 설정 판, 구분 칩(낱말 중간에서 안 끊김), 화면 밀림(CLS, 달 고르는 줄),
동작 줄이기, 광고 자리(폭 = 글 기둥, 누르는 것과의 거리)."""
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


def fonts_of(path):
    """PDF에 담긴 글꼴: [(이름, 종류, 담겼는지)]"""
    out = subprocess.run(['pdffonts', path], capture_output=True, text=True).stdout.splitlines()[2:]
    return [(ln.split()[0], 'CID TrueType' in ln, ln.split()[-5] == 'yes') for ln in out if ln.strip()]


def text_of(path):
    return subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True).stdout


def is_text_pdf(path, n=None):
    """내 설정 PDF: 그림이 아니라 글자(글꼴이 담긴 CID TrueType), 말줄임 없음"""
    f = fonts_of(path)
    t = text_of(path)
    return len(f) >= 3 and all(x[1] and x[2] and 'OnesheetSans' in x[0] for x in f) and not re.search(r'…|\+\d+ more|외 \d+일', t) and (n is None or n in t)


# 휴대폰에서: 잘린 표, 글자가 넘친 단추, 44px보다 작은 누르는 곳(문단 속 링크는 뺀다)
PROBE = r"""() => {
  const out = { tables: [], btns: [], small: [] };
  document.querySelectorAll('main table').forEach(t => { const w = t.closest('.tbl-wrap,.wm-box') || t.parentElement; if (w.scrollWidth > w.clientWidth + 1) out.tables.push([w.scrollWidth, w.clientWidth]); });
  document.querySelectorAll('.btn, .seg button, .shape, .pills a, .years a, .m-nav a, .nav a').forEach(b => { if (!b.offsetParent) return;
    if (b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1) out.btns.push(b.textContent.trim().slice(0, 30)); });
  document.querySelectorAll('a, button, select, summary, label.check').forEach(el => { if (!el.offsetParent) return; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    if (el.closest('.prose p, .prose li, .faq p, .lead, .prose td, .src, .notice')) return;
    if (r.height < 43.5 || r.width < 24) out.small.push((el.className || el.tagName) + ':' + el.textContent.trim().slice(0, 16) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
  return out; }"""


URL_WAIT = 2300   # 주소는 설정을 바꾼 뒤 1.5초 가만히 있을 때 한 번 고친다

# 언어 안내 띠의 자리와, 띠와 겹치는 '누를 수 있는 것'(띠 안의 것은 뺀다)
OVERLAP = r"""() => { const bar = document.querySelector('.lang-bar'); if (!bar || getComputedStyle(bar).display === 'none') return { bar: null, docked: false, hits: [] };
  const b = bar.getBoundingClientRect(), hits = [];
  document.querySelectorAll('a, button, select, input, summary, label, [role="button"], [tabindex]').forEach(el => { if (bar.contains(el)) return; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none') return;
    if (r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top) hits.push((el.className || el.tagName) + ':' + (el.textContent || '').trim().slice(0, 16)); });
  return { bar: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)], docked: bar.classList.contains('is-docked'), hits }; }"""


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


PAGES = ['/', '/ko/', '/2027/', '/ko/2027/', '/ko/2028/', '/2026/october/', '/2027/may/', '/ko/2026/10/', '/ko/2027/2/', '/ko/2027/5/', '/2027/holidays/', '/2026/holidays/', '/ko/2027/holidays/', '/ko/2026/holidays/',
         '/ko/lunar/', '/ko/son-eomneun-nal/', '/guide/', '/ko/guide/', '/guide/2027-long-weekends/', '/guide/south-korea-public-holidays-2027/', '/guide/week-numbers-iso-vs-us/', '/guide/print-calendar-on-one-page/',
         '/ko/guide/daeche-gonghyuil/', '/ko/guide/2026-nodongjeol-jeheonjeol/', '/ko/guide/eumnyeok-yundal/', '/ko/guide/a4-han-jang-inswae/', '/about/', '/ko/about/', '/ko/privacy/', '/licenses/', '/ko/licenses/', '/no-such-page']

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--proxy-bypass-list=localhost;127.0.0.1'])

    # 1) 모든 종류의 페이지: 콘솔 오류, 깨진 그림, 가로 넘침
    for w, mobile in ((1366, False), (390, True), (360, True), (320, True)):
        c = ctx_of(b, w, 800, mobile, locale='en-US' if w == 360 else 'ko-KR')
        for path in PAGES:
            pg, errs = open_page(c, path)
            sw = pg.evaluate('document.documentElement.scrollWidth')
            broken = pg.evaluate('[...document.images].filter(i => i.complete && i.naturalWidth === 0).length')
            ok(sw <= w and not errs and broken == 0, f'{path} @{w}: 가로 {sw}, 콘솔 {errs[:2]}, 깨진 그림 {broken}')
            if mobile and path != '/no-such-page':
                pr = pg.evaluate(PROBE)
                ok(not pr['tables'] and not pr['btns'], f'{path} @{w}: 잘린 표 {pr["tables"]}, 글자가 넘친 단추 {pr["btns"]}')
                if w == 390:
                    ok(not pr['small'], f'{path} @{w}: 44px보다 작은 누르는 곳 {pr["small"][:4]}')
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
    ok(name == '2029-calendar-korea-a4-landscape.pdf' and pdfinfo(path) == (1, 842, 595) and is_text_pdf(path, '2029') and os.path.getsize(path) < 200000,
       f'내 설정 PDF는 글자 그대로(글꼴이 담김): {name} {pdfinfo(path)} {os.path.getsize(path)}바이트 {fonts_of(path)[:2]}')
    info = subprocess.run(['pdfinfo', path], capture_output=True, text=True).stdout
    ok('2029년 달력' in info and '한장달력' in info, '내 설정 PDF에 제목·만든 곳')
    ok(pg.is_hidden(T + '[data-note]'), '글자 PDF면 그림 안내 줄은 안 보인다')
    ok('2029' in pg.title(), f'탭 제목이 연도를 따라간다: {pg.title()}')
    pg.wait_for_timeout(URL_WAIT)
    ok('y=2029' in pg.evaluate('location.search') and pg.get_attribute('link[rel=canonical]', 'href').endswith('/ko/'), '연도가 주소에 담기고 canonical 은 그대로')
    ok(pg.is_disabled(T + '[data-opt="terms"]') or pg.is_hidden(T + '[data-opt="terms"]'), '2029년: 24절기 칸은 꺼짐(자료 없음)')
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
    ok(pg.inner_text(T + '[data-png]') == '이 달만 이미지로', "월별 12장: 이미지 단추에 '이 달만'")
    pg.click(T + '[data-mstep="1"]')
    ok(pg.inner_text(T + '.mstep b') == '2월' and '>2월<' in pg.inner_html(T + '.paper'), '달 넘기기 → 2월')
    pg.click(T + '.shape[data-kind="month"]')
    ok(pg.inner_text(T + '[data-what]') == '한 달' and pg.inner_text(T + '.mstep b') == '2월' and pg.get_attribute(T + '[data-pdf]', 'download') is None, '한 달: 어느 달인지 보임')
    name, path = download(pg, T + '[data-pdf]')
    ok(name == '2027-02-calendar-korea-a4.pdf' and pdfinfo(path)[0] == 1 and is_text_pdf(path, '2월'), f'한 달 PDF {name} (글자)')
    ok(pg.inner_text(T + '[data-png]') == '이미지로 저장', '한 달: 이미지 단추 글자는 원래대로')
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
    ok('w=mon' not in pg.evaluate('location.search'), '설정을 바꾼 바로 뒤에는 주소를 고치지 않는다(1.5초 뒤 한 번)')
    pg.wait_for_timeout(URL_WAIT)
    ok('w=mon' in pg.evaluate('location.search'), '주 시작이 주소에 담긴다')
    pg.click(T + '[data-opt="week"]')
    ok('>53<' in pg.inner_html(T + '.paper'), '주 번호(ISO, 2027-01-01 = 53주)')
    pg.click(T + '[data-opt="mono"]')
    ok('#d2332a' not in pg.inner_html(T + '.paper'), '흑백: 빨강 없음')
    pg.select_option('#o-paper', 'letter')
    ok(abs(float(pg.evaluate("getComputedStyle(document.querySelector('.crop')).getPropertyValue('--ratio')")) - 1.2941) < 0.001 and 'Letter' in pg.inner_text(T + '[data-meta]'), 'Letter 용지 비율')
    pg.select_option('#o-country', 'US')
    ok('미국 연방 공휴일' in pg.inner_html(T + '.paper') and '5 U.S.C. 6103' in pg.inner_text(T + '[data-basis]'), '미국 공휴일로 바꿈')
    ok(pg.get_attribute(T + '[data-basis] a', 'href') == '/2027/holidays/' and '대신 쉬는 날' in pg.inner_text(T + '[data-basis]'), "나라를 바꾸면 '공휴일 보기' 링크도 미국 쪽으로")
    up = pg.inner_text('.up')
    ok(re.search('콜럼버스|재향군인|추수감사|크리스마스|새해', up) and '한글날' not in up, f'다가오는 쉬는 날도 미국 것으로: {up[:40]!r}')
    pg.wait_for_timeout(URL_WAIT)
    ok(pg.evaluate('location.search') == '?w=mon&p=letter&c=us&wk=1&lunar=0&son=1&ink=bw', f"주소에 담긴 설정: {pg.evaluate('location.search')}")
    ok(pg.get_attribute('a.lang', 'href') == '/?w=mon&wk=1&ink=bw', f"언어 링크에 지금 설정이 실린다(영어판 기본인 미국·Letter 는 빠짐): {pg.get_attribute('a.lang', 'href')}")
    pg.click(T + '[data-opt="names"]')
    ok('마틴 루서 킹' not in pg.inner_html(T + '.paper'), '공휴일 이름 끄기')
    pg.click(T + '[data-opt="names"]')
    name, path = download(pg, T + '[data-png]')
    from PIL import Image
    im = Image.open(path)
    ok(name == '2027-calendar-us-letter-landscape-mon-wk-bw.png' and im.size == (2200, 1700), f'이미지로 저장(이름에 월요일 시작·주 번호·흑백): {name} {im.size}')
    pg.click(T + '.shape[data-kind="months"]')
    name, path = download(pg, T + '[data-pdf]')
    ok(name == '2027-calendar-us-monthly-letter-mon-wk-bw.pdf' and pdfinfo(path) == (12, 792, 612) and is_text_pdf(path) and os.path.getsize(path) < 300000, f'내 설정 월별 12장 PDF: {name} {pdfinfo(path)} {os.path.getsize(path)}바이트 (글자)')
    t = text_of(path)
    ok('크리스마스(대신 쉬는 날)' in t.replace('\n', '') or ('크리스마스' in t and '(대신 쉬는 날)' in t), "한국어 + 미국 월별 PDF: '크리스마스(대신 쉬는 날)'")
    ok('대체 휴일' not in t and '대신 쉼' not in t, "한국어 + 미국 PDF에 '대체 휴일'·'대신 쉼'이 없다")
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
    # 공휴일 표시 안 함
    pg.select_option('#o-country', 'NONE')
    ok('표시하지 않은' in pg.inner_text(T + '[data-basis]') and pg.is_hidden(T + '[data-opt="names"]') and '공휴일' not in pg.inner_html(T + '.paper'), '공휴일 표시 안 함: 안내 줄·이름 칸·종이')
    name, path = download(pg, T + '[data-pdf]')
    ok(name == '2027-calendar-no-holidays-letter-portrait-mon-wk-bw.pdf' and is_text_pdf(path), f'공휴일 없는 달력 PDF: {name}')
    # 주소를 다시 열면 같은 설정
    pg.wait_for_timeout(URL_WAIT)
    url = pg.evaluate('location.href')
    pg.goto(url, wait_until='load'); pg.wait_for_timeout(500)
    ok(pg.input_value('#o-country') == 'NONE' and pg.input_value('#o-paper') == 'letter' and pg.is_checked(T + '[data-opt="week"]') and pg.is_checked(T + '[data-opt="mono"]')
       and pg.get_attribute(T + '[data-seg="weekStart"][data-v="1"]', 'aria-pressed') == 'true' and pg.get_attribute(T + '.shape[data-orient="portrait"]', 'aria-pressed') == 'true'
       and '월요일 시작' in pg.inner_html(T + '.paper'), f'주소를 다시 열면 같은 설정: {url}')
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
    ok(pg.get_attribute(T + '[data-basis] a', 'href') == '/guide/south-korea-public-holidays-2027/' and 'Chuseok' in pg.inner_text('.up') + pg.inner_html(T + '.paper'), '영어 + 한국: 링크와 종이가 한국 공휴일')
    ok('Hangeul Day' in pg.inner_text('.up') or 'Christmas' in pg.inner_text('.up'), f"영어 + 한국: 다가오는 공휴일도 한국 것 {pg.inner_text('.up')[:50]!r}")
    html_ = pg.inner_html(T + '.paper')
    ok('+1 more' not in html_ and 'Substitute holiday (Labor Day)' in html_ and "Buddha's Birthday" in html_, "영어 + 한국 + Letter: '+1 more' 없이 이름이 다 나온다")
    pg.click(T + '.shape[data-kind="months"]')
    name, path = download(pg, T + '[data-pdf]')
    t = text_of(path)
    ok(is_text_pdf(path) and 'Movement' in t and 'Substitute holiday' in t and 'Foundation' in t, f'영어 + 한국 월별 PDF: 이름이 잘리지 않는다 ({name})')
    pg.close()
    pg, errs = open_page(c, '/2027/')
    ok(pg.locator(T + '[data-step]').count() == 0 and pg.locator('.years a[aria-current]').inner_text() == '2027', '연간 페이지: 연도는 링크')
    pg.click(T + '.shape[data-kind="months"]')
    ok(pg.get_attribute(T + '[data-pdf]', 'href') == '/files/2027-calendar-us-monthly-letter.pdf', '연간 페이지 월별 파일')
    name, path = download(pg, T + '[data-pdf]')
    t = text_of(path)
    ok('…' not in t and 'Martin Luther' in t and 'King Jr. Day' in t and '(observed)' in t and "New Year's Day" in t, '미리 만든 영어 월별 PDF: 이름이 잘리지 않는다')
    pg.close(); c.close()

    # 4) 월 페이지
    c = ctx_of(b)
    pg, errs = open_page(c, '/ko/2026/10/')
    name, path = download(pg, '[data-month-page] [data-pdf]')
    ok(name == '2026-10-calendar-korea-a4-son.pdf' and pdfinfo(path) == (1, 842, 595) and is_text_pdf(path, '한글날') and '대체공휴일(개천절)' in text_of(path), f'이 달 PDF {name} (글자, 손 없는 날이 든 판이라 이름에 -son)')
    ok('대체공휴일(개천절)' in pg.inner_text('.wm-box td[data-d="5"]').replace('\n', ''), f"월 달력 칸에도 무엇의 대체공휴일인지: {pg.inner_text('.wm-box td[data-d=\"5\"]')!r}")
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
    conv(dict(sy='２０２７', sm='２', sd='７'))
    ok('음력 2027년 1월 1일' in pg.inner_text('[data-out="s2l"]'), '전각 숫자(２０２７)도 받는다')
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

    # 6) 언어 안내 띠: 브라우저 언어가 다를 때만, 닫으면 기억. 컴퓨터에서는 머리 줄의 빈자리에 있고 누를 수 있는 것 어느 것과도 겹치지 않는다
    c = ctx_of(b, locale='en-US')
    pg, errs = open_page(c, '/ko/')
    g = pg.evaluate("""(() => { const b = document.querySelector('.lang-bar'), r = b.getBoundingClientRect(), h = document.querySelector('header.top').getBoundingClientRect(), x = b.querySelector('button').getBoundingClientRect();
      return { pos: getComputedStyle(b).position, docked: b.classList.contains('is-docked'), top: r.top, bottom: r.bottom, vh: innerHeight, header: h.bottom, x: [x.width, x.height] }; })()""")
    ok(pg.is_visible('.lang-bar') and g['docked'] and g['pos'] == 'absolute' and g['top'] >= 0 and g['bottom'] <= g['header'] and min(g['x']) >= 44, f'영어 브라우저 → 한국어판에 띠: 머리 줄 안에 있고(내용을 덮지 않음) ×는 44px 이상 {g}')
    ok(pg.evaluate("(() => { const e = document.elementFromPoint(200, 28); return !!e && !!e.closest('header.top .nav'); })()") and not pg.evaluate(OVERLAP)['hits'], '띠가 떠 있어도 머리 메뉴를 누를 수 있다(메뉴·로고·언어 링크와 겹치지 않음)')
    pg.click('.lang-bar button')
    pg.reload(); pg.wait_for_timeout(300)
    ok(pg.locator('.lang-bar').count() == 0 and pg.evaluate("localStorage.getItem('cal.lang')") == 'ko', '띠를 닫으면 기억(cal.lang)')
    pg.close(); c.close()
    # 노트북 폭 세 가지 × 두 언어판 × 쪽 종류: 띠가 누를 수 있는 것과 겹치지 않는다(내 설정을 닫았을 때·열었을 때·열고 240px 내렸을 때)
    for w, h in ((1280, 720), (1366, 768), (1440, 900)):
        for loc, paths in (('en-US', ('/ko/', '/ko/2027/', '/ko/2027/5/', '/ko/2027/holidays/', '/ko/guide/daeche-gonghyuil/')), ('ko-KR', ('/', '/2027/', '/2027/may/', '/2027/holidays/'))):
            c = ctx_of(b, w, h, locale=loc)
            for path in paths:
                pg, errs = open_page(c, path)
                r = [pg.evaluate(OVERLAP)]
                if pg.locator('.opt-toggle').count():
                    pg.click('.opt-toggle'); pg.wait_for_timeout(150)
                    r.append(pg.evaluate(OVERLAP))
                    ok(pg.is_visible('#opts'), f'내 설정 펼침 {path} @{w}×{h}')
                    pg.evaluate('window.scrollTo(0, 240)'); pg.wait_for_timeout(100)
                    r.append(pg.evaluate(OVERLAP))
                ok(r[0]['bar'] and all(not x['hits'] for x in r), f'언어 띠가 누를 수 있는 것과 겹치지 않는다 {path} @{w}×{h}: ' + ' / '.join(f"{x['bar']} {x['hits'][:3]}" for x in r))
                pg.close()
            c.close()
    # 머리 줄에 자리가 없는 폭(좁은 창): 화면 아래에 뜨고, 내 설정을 열면 숨는다. 창을 넓히면 머리 줄로 간다
    c = ctx_of(b, 940, 700, locale='en-US')
    pg, errs = open_page(c, '/ko/')
    g0 = pg.evaluate(OVERLAP)
    pg.click('.opt-toggle'); pg.wait_for_timeout(150)
    hid = pg.is_hidden('.lang-bar')
    pg.click('.opt-toggle'); pg.wait_for_timeout(150)
    back = pg.is_visible('.lang-bar')
    pg.set_viewport_size({'width': 1366, 'height': 768}); pg.wait_for_timeout(400)
    g1 = pg.evaluate(OVERLAP)
    ok(g0['bar'] and not g0['docked'] and g0['bar'][1] > 500 and hid and back and g1['docked'] and not g1['hits'], f'좁은 창: 아래에 뜨고 내 설정을 열면 숨는다, 넓히면 머리 줄로 {g0} → {g1}')
    pg.close(); c.close()

    # 7) 휴대폰: 설정 판과 미리보기가 같이 보인다
    c = ctx_of(b, 390, 844, True, locale='en-US')
    pg, errs = open_page(c, '/ko/')
    g = pg.evaluate(OVERLAP)
    pg.tap('.opt-toggle'); pg.wait_for_timeout(500)
    ok(g['bar'] and not g['docked'] and g['bar'][3] <= 844 and g['bar'][1] > 700 and pg.is_hidden('.lang-bar'), f'휴대폰: 띠는 화면 아래에, 설정 판을 열면 숨는다 {g}')
    pg.tap('[data-opt-close]'); pg.wait_for_timeout(300)
    ok(pg.is_visible('.lang-bar'), '휴대폰: 설정 판을 닫으면 띠가 돌아온다')
    pg.close(); c.close()
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

    # 7-2) 주소에 담긴 설정으로 바로 열기(남이 보낸 주소) + 모르는 값은 버린다
    c = ctx_of(b)
    pg, errs = open_page(c, '/ko/?y=2028&k=monthly&m=5&w=mon&p=letter&c=us&wk=1&ink=bw&zzz=1&p2=x')
    T = '[data-tool] '
    ok(pg.inner_text(T + 'output') == '2028' and '12쪽' in pg.inner_text(T + '[data-meta]') and 'Letter' in pg.inner_text(T + '[data-meta]') and pg.inner_text(T + '.mstep b') == '5월'
       and pg.get_attribute(T + '[data-seg="weekStart"][data-v="1"]', 'aria-pressed') == 'true' and '22주' in pg.inner_html(T + '.paper') and '메모리얼 데이' in pg.inner_html(T + '.paper')
       and '#d2332a' not in pg.inner_html(T + '.paper') and '2028' in pg.title() and not errs,
       f'주소의 설정으로 열기: {pg.inner_text(T + "[data-what]")} / {pg.inner_text(T + "[data-meta]")} / {errs[:2]}')
    pg.close()
    pg, errs = open_page(c, '/ko/?y=1999&k=zzz&m=44&c=jp&p=b5')
    ok(pg.inner_text(T + 'output') == '2027' and pg.get_attribute(T + '[data-pdf]', 'href') == '/files/2027-calendar-korea-a4-landscape.pdf' and not errs, '주소에 모르는 값이 있어도 기본 달력')
    g = pg.evaluate("""(() => { const n = document.querySelector('.url-note'); if (!n) return null; const r = n.getBoundingClientRect(), p = document.querySelector('.paper').getBoundingClientRect();
      return { text: n.querySelector('span').textContent, pos: getComputedStyle(n).position, inPaper: r.left >= p.left && r.right <= p.right && r.top >= p.top && r.bottom <= p.bottom, role: n.getAttribute('role') }; })()""")
    ok(g and '쓸 수 없는 값' in g['text'] and g['pos'] == 'absolute' and g['inPaper'] and g['role'] == 'status', f'쓸 수 없는 값이 있으면 종이 위에 한 줄로 알린다(겹쳐 띄움) {g}')
    pg.click('.url-note button')
    ok(pg.locator('.url-note').count() == 0, '안내 줄은 닫을 수 있다')
    pg.close()
    pg, errs = open_page(c, '/ko/?y=2031&k=month&m=1')
    ok(pg.locator('.url-note').count() == 1 and pg.inner_text(T + 'output') == '2027' and pg.inner_text(T + '[data-what]') == '한 달' and pg.inner_text(T + '.mstep b') == '1월', '범위 밖 연도(2031): 알리고 기본 연도로, 쓸 수 있는 값(한 달·1월)은 그대로')
    pg.click(T + '[data-mstep="1"]')
    ok(pg.locator('.url-note').count() == 0, '설정을 바꾸면 안내 줄이 사라진다')
    pg.wait_for_timeout(URL_WAIT)
    ok(pg.evaluate('location.search') == '?k=month&m=2', f"그 뒤 주소는 쓸 수 있는 값만: {pg.evaluate('location.search')}")
    pg.close()
    pg, errs = open_page(c, '/ko/?W=MON&P=Letter')
    ok(pg.locator('.url-note').count() == 0 and '월요일 시작' in pg.inner_html(T + '.paper') and 'Letter' in pg.inner_text(T + '[data-meta]'), '주소의 대소문자는 가리지 않는다(?W=MON&P=Letter)')
    pg.close()
    pg, errs = open_page(c, '/ko/?w=mon&adpreview')
    ok(pg.locator('.url-note').count() == 0, '쓸 수 있는 값뿐이면 안내 줄 없음')
    pg.close()
    pg, errs = open_page(c, '/ko/2027/?y=2029&w=mon')
    ok(pg.locator('.years a[aria-current]').inner_text() == '2027' and '월요일 시작' in pg.inner_html(T + '.paper') and '2027' in pg.inner_html(T + '.paper'), '연간 페이지: 주소의 연도는 무시, 다른 설정은 받는다')
    ok(pg.locator('.url-note').count() == 1 and pg.get_attribute('a.lang', 'href') == '/2027/?w=mon&p=a4&c=kr', f"연간 페이지: 다른 해의 y 는 알린다, 언어 링크에 설정이 실린다 {pg.get_attribute('a.lang', 'href')}")
    pg.close()
    pg, errs = open_page(c, '/ko/2027/5/')
    href = pg.get_attribute('a[href*="k=month"]', 'href')
    pg.goto(BASE + href, wait_until='load'); pg.wait_for_timeout(500)
    ok(href == '/ko/?k=month&y=2027&m=5' and pg.inner_text(T + '[data-what]') == '한 달' and pg.inner_text(T + '.mstep b') == '5월' and '부처님오신날' in pg.inner_html(T + '.paper'), f'월 페이지 → 내 설정으로 이 달 만들기: {href}')
    pg.close(); c.close()

    # 7-2b) 주소는 설정을 여러 번 바꿔도 한 번만 고친다. 언어를 바꾸면 같은 달력이 열린다
    c = ctx_of(b, locale='en-US')
    pg, errs = open_page(c, '/ko/')
    ok(pg.get_attribute('a.lang', 'href') == '/' and pg.get_attribute('.lang-bar a', 'href') == '/', '아무것도 안 바꿨으면 언어 링크는 그대로(/)')
    pg.evaluate("(() => { window.__rs = 0; const o = history.replaceState; history.replaceState = function () { window.__rs++; return o.apply(this, arguments); }; })()")
    pg.click(T + '.opt-toggle')
    pg.click(T + '[data-seg="weekStart"][data-v="1"]'); pg.click(T + '[data-opt="week"]'); pg.click(T + '[data-opt="mono"]'); pg.click(T + '.shape[data-kind="months"]'); pg.click(T + '[data-mstep="1"]')
    n0 = pg.evaluate('window.__rs')
    pg.wait_for_timeout(URL_WAIT)
    ok(n0 == 0 and pg.evaluate('window.__rs') == 1 and pg.evaluate('location.search') == '?k=monthly&m=2&w=mon&wk=1&ink=bw', f"설정을 다섯 번 바꿔도 주소는 한 번만 고친다: 바로 뒤 {n0}번, 뒤에 {pg.evaluate('window.__rs')}번 {pg.evaluate('location.search')}")
    href = pg.get_attribute('a.lang', 'href')
    ok(href == '/?k=monthly&m=2&w=mon&p=a4&c=kr&wk=1&ink=bw' and pg.get_attribute('.lang-bar a', 'href') == href, f'머리의 언어 링크와 안내 띠 링크에 지금 설정이 실린다: {href}')
    pg.click('a.lang'); pg.wait_for_load_state('load'); pg.wait_for_timeout(600)
    ok(pg.evaluate('location.pathname') == '/' and pg.inner_text(T + '[data-what]') == '12 monthly pages' and pg.inner_text(T + '.mstep b') == 'Feb' and 'A4' in pg.inner_text(T + '[data-meta]') and pg.input_value('#o-country') == 'KR'
       and pg.get_attribute(T + '[data-seg="weekStart"][data-v="1"]', 'aria-pressed') == 'true' and pg.is_checked(T + '[data-opt="week"]') and pg.is_checked(T + '[data-opt="mono"]') and 'Seollal' in pg.inner_html(T + '.paper') and not errs,
       f"영어판에서도 같은 달력(한국 공휴일·A4·월요일 시작·주 번호·흑백·2월): {pg.inner_text(T + '[data-what]')} / {pg.inner_text(T + '[data-meta]')} / {pg.input_value('#o-country')}")
    ok(pg.get_attribute('a.lang', 'href') == '/ko/?k=monthly&m=2&w=mon&wk=1&ink=bw', f"돌아가는 링크(한국어판 기본인 한국·A4 는 빠짐): {pg.get_attribute('a.lang', 'href')}")
    pg.close()
    # 설정을 바꾸고 1.5초 안에 다른 쪽으로 갔다가 뒤로 와도 같은 달력
    pg, errs = open_page(c, '/ko/')
    pg.click(T + '.shape[data-orient="portrait"]')
    pg.click('a[href="/ko/2027/holidays/"] >> nth=0'); pg.wait_for_load_state('load'); pg.wait_for_timeout(300)
    pg.go_back(); pg.wait_for_load_state('load'); pg.wait_for_timeout(600)
    ok(pg.evaluate('location.search') == '?k=portrait' and pg.get_attribute(T + '.shape[data-orient="portrait"]', 'aria-pressed') == 'true', f"바로 떠났다가 뒤로 와도 설정이 남는다: {pg.evaluate('location.search')}")
    pg.close(); c.close()
    # 영어판 + 한국 공휴일: 근거 줄이 연도에 맞다(2025년은 2026년 개정 전)
    c = ctx_of(b, locale='en-US')
    for q, want, never in (('?y=2025&c=kr', 'confirmed public holidays for 2025', 'April 2026'), ('?y=2027&c=kr', 'as amended in April 2026', 'confirmed'), ('?y=2028&c=kr', 'not out yet', 'confirmed'), ('?y=2029&c=kr', 'projected', 'April 2026')):
        pg, errs = open_page(c, '/' + q)
        t = pg.inner_text(T + '[data-basis]')
        ok(want in t and never not in t and not re.search('[가-힣]', t) and not errs, f'영어 + 한국 근거 줄 {q}: {t[:80]!r}')
        pg.close()
    c.close()
    # 구분 칩: 낱말 중간에서 줄이 바뀌지 않는다(좁으면 칩이 통째로 이름 아래 줄로)
    for w in (320, 360, 390, 1366):
        c = ctx_of(b, w, 800, w < 900)
        for path in ('/2027/holidays/', '/2026/holidays/', '/ko/2027/holidays/', '/ko/2026/holidays/', '/2027/', '/ko/2027/', '/ko/2028/', '/ko/son-eomneun-nal/'):
            pg, errs = open_page(c, path)
            g = pg.evaluate("""(() => { const bad = []; let n = 0; document.querySelectorAll('.tag').forEach(t => { n++; const r = t.getBoundingClientRect(), wr = t.closest('.tbl-wrap').getBoundingClientRect();
              if (t.getClientRects().length > 1 || r.height > 28 || r.right > wr.right + 0.5 || r.left < wr.left - 0.5) bad.push(t.textContent + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
              return { n, bad: bad.slice(0, 4), sw: document.documentElement.scrollWidth }; })()""")
            ok(g['n'] >= 6 and not g['bad'] and g['sw'] <= w, f'구분 칩이 한 줄로, 표 안에 {path} @{w}: {g}')
            pg.close()
        c.close()

    # 7-3) 휴대폰: 모양을 바꿔 달 고르는 줄이 나와도 아래가 밀리지 않는다
    for path, loc in (('/ko/', 'ko-KR'), ('/', 'en-US')):
        for w in (390, 360, 320):
            c = ctx_of(b, w, 844, True, locale=loc)
            pg, errs = open_page(c, path)
            top = "document.querySelector('.paper-box').getBoundingClientRect().top + scrollY"
            y0 = pg.evaluate(top)
            pg.tap('.shape[data-kind="months"]'); pg.wait_for_timeout(250)
            y1 = pg.evaluate(top)
            pg.tap('.shape[data-kind="month"]'); pg.wait_for_timeout(250)
            y2 = pg.evaluate(top)
            pr = pg.evaluate(PROBE)
            ok(abs(y1 - y0) < 1 and abs(y2 - y0) < 1 and pg.is_visible('.mstep') and not pr['btns'], f'달 고르는 줄 밀림 0 {path} @{w}: {y0:.0f} → {y1:.0f} → {y2:.0f}, 넘친 단추 {pr["btns"]}')
            pg.close(); c.close()

    # 7-4) 기기 날짜가 달라졌을 때(시간이 지나도 낡지 않게)
    def dated(y, m, d, **kw):
        cx = ctx_of(b, **kw)
        cx.add_init_script("(() => { const D = Date, fixed = new D(%d, %d, %d, 10).getTime(); class F extends D { constructor(...a) { if (a.length) super(...a); else super(fixed); } static now() { return fixed; } } window.Date = F; })()" % (y, m - 1, d))
        return cx
    c = dated(2028, 6, 15)
    pg, errs = open_page(c, '/ko/')
    ok(pg.inner_text(T + 'output') == '2028' and '2028' in pg.inner_html(T + '.paper') and pg.get_attribute('a[data-nav-month]', 'href') == '/ko/2027/12/' and '2028' in pg.title(),
       f"2028년 6월: 기본 연도 {pg.inner_text(T + 'output')}, 월 달력 메뉴 {pg.get_attribute('a[data-nav-month]', 'href')}")
    ok(pg.locator('.up li time').first.get_attribute('datetime') == '2028-07-17' and pg.inner_text('.up li:first-child small') == '32일 뒤', f"2028년 6월: 다가오는 쉬는 날은 기기 날짜 기준 {pg.inner_text('.up li:first-child')!r}")
    pg.close(); c.close()
    c = dated(2027, 11, 20)
    pg, errs = open_page(c, '/ko/')
    ok(pg.inner_text(T + 'output') == '2028' and pg.get_attribute('a[data-nav-month]', 'href') == '/ko/2027/11/', '2027년 11월: 기본 연도는 다음 해, 월 달력은 이번 달')
    pg.close(); c.close()
    c = dated(2031, 1, 15, locale='en-US')
    pg, errs = open_page(c, '/')
    ok(pg.inner_text(T + 'output') == '2030' and pg.locator('.up').count() == 1 and pg.is_hidden('.up') and not errs, '2031년(미국 자료 범위 밖): 다가오는 공휴일 칸을 숨긴다, 연도는 2030까지')
    pg.close(); c.close()

    # 7-5) 글꼴을 못 받으면 300ppi 그림 PDF로 대신하고 그렇게 알린다
    c = ctx_of(b)
    c.route(re.compile(r'/assets/fonts/'), lambda r: r.abort())
    pg, errs = open_page(c, '/ko/?w=mon')
    name, path = download(pg, T + '[data-pdf]')
    imgs = subprocess.run(['pdfimages', '-list', path], capture_output=True, text=True).stdout
    ok(not fonts_of(path) and re.search(r'\b3508\s+2480\b', imgs) and pg.is_visible(T + '[data-note]') and '300ppi' in pg.inner_text(T + '[data-note]') and '2027년 달력' in subprocess.run(['pdfinfo', path], capture_output=True, text=True).stdout,
       f'글꼴을 못 받은 경우: 300ppi 그림 PDF + 안내 줄 + 제목 ({imgs.splitlines()[-1] if imgs else imgs})')
    pg.close(); c.close()

    # 8) 화면 밀림(CLS): CPU 4배 느리게, 브라우저 언어가 달라도
    for path, locale in (('/ko/', 'ko-KR'), ('/', 'ko-KR'), ('/ko/2027/', 'en-US'), ('/ko/2026/10/', 'ko-KR'), ('/2026/october/', 'en-US'), ('/ko/lunar/', 'ko-KR')):
        for w, mobile in ((1366, False), (390, True), (360, True)):
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
    # 광고 자리 폭 = 본문 글 기둥, 표시 글자 11px 이상
    for path, col in (('/ko/guide/daeche-gonghyuil/', '.prose'), ('/guide/2027-long-weekends/', '.prose'), ('/ko/', '.faq'), ('/2027/holidays/', '.note')):
        for w, mobile in ((1366, False), (390, True)):
            c = ctx_of(b, w, 800, mobile)
            pg, errs = open_page(c, path)
            g = pg.evaluate("(sel => { const a = document.querySelector('[data-ad]').getBoundingClientRect(), t = document.querySelector('main ' + sel).getBoundingClientRect(); return [a.left, a.width, t.left, t.width, parseFloat(getComputedStyle(document.querySelector('.ad-label')).fontSize)]; })", col)
            ok(abs(g[0] - g[2]) < 1.5 and abs(g[1] - g[3]) < 1.5 and g[4] >= 11, f'광고 자리 폭 = 글 기둥 {path} @{w}: 자리 {g[0]:.0f}+{g[1]:.0f}, 글 {g[2]:.0f}+{g[3]:.0f}, 표시 글자 {g[4]}px')
            pg.close(); c.close()
    c = ctx_of(b)
    pg, errs = open_page(c, '/ko/about/')
    ok(pg.locator('[data-ad]').count() == 0, '소개 페이지에는 광고 자리 없음')
    pg.close(); c.close()
    b.close()

good = sum(1 for r in res if r[0])
print(f'화면 확인: 통과 {good}, 실패 {len(res) - good}')
sys.exit(0 if good == len(res) else 1)
