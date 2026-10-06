#!/usr/bin/env python3
"""공학용 계산기 페이지 만들기: 한국어(/)와 영어(/en/) HTML, sitemap.xml, rss.xml 을 이 폴더에 쓴다.

쓰는 법: python3 tools/build.py   (sci-calc 폴더 안에서든 밖에서든)
글 내용은 tools/articles.py, 모드 페이지 설명은 tools/content.py 에 있다. 이 파일은 틀(머리·꼬리·계산기 판)만.
"""
import datetime
import html
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import content  # noqa: E402
import articles  # noqa: E402

SITE = 'https://calc.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
TODAY = datetime.date(2026, 10, 6)
ASSET_V = '8'   # 스크립트·스타일을 바꾸면 올린다 (브라우저 캐시 새로 받기)

esc = html.escape


def url(lang, path):
    """path 는 '/' 로 시작하는 한국어 기준 경로 (예: '/stats/')."""
    return path if lang == 'ko' else '/en' + path


def T(lang, ko, en):
    return ko if lang == 'ko' else en


# ------------------------------------------------------------------ 공통 머리
def head(lang, path, title, desc, *, alt=True, ads=True, jsonld=(), noindex=False, og_type='website', extra=''):
    canon = SITE + url(lang, path)
    out = ['<!doctype html>', '<html lang="%s">' % lang, '<head>', '<meta charset="utf-8">',
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
           '<title>%s</title>' % esc(title), '<meta name="description" content="%s">' % esc(desc, quote=True),
           '<meta name="theme-color" content="#f1ece2" media="(prefers-color-scheme: light)">',
           '<meta name="theme-color" content="#1b1a17" media="(prefers-color-scheme: dark)">']
    if noindex:
        out.append('<meta name="robots" content="noindex">')
    else:
        out.append('<link rel="canonical" href="%s">' % canon)
        if alt:
            out.append('<link rel="alternate" hreflang="ko" href="%s">' % (SITE + path))
            out.append('<link rel="alternate" hreflang="en" href="%s">' % (SITE + '/en' + path))
            out.append('<link rel="alternate" hreflang="x-default" href="%s">' % (SITE + '/en' + path))
        out += ['<meta property="og:type" content="%s">' % og_type,
                '<meta property="og:title" content="%s">' % esc(title, quote=True),
                '<meta property="og:description" content="%s">' % esc(desc, quote=True),
                '<meta property="og:url" content="%s">' % canon,
                '<meta property="og:site_name" content="%s">' % T(lang, '공학용 계산기', 'Scientific Calculator'),
                '<meta property="og:locale" content="%s">' % T(lang, 'ko_KR', 'en_US'),
                # 공유 사진은 언어마다 한 장(_dev/og.py 로 찍는다). 디자인과 따로라 화면을 바꿔도 다시 찍지 않아도 된다
                '<meta property="og:image" content="%s/%s">' % (SITE, T(lang, 'og.png', 'og-en.png')),
                '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
                '<meta property="og:image:alt" content="%s">' % T(lang, '공학용 계산기: 분수·루트가 교과서처럼 보이는 무료 계산기', 'Scientific Calculator: fractions and roots shown like a textbook'),
                '<meta name="twitter:card" content="summary_large_image">']
        if lang == 'ko':
            out.append('<link rel="alternate" type="application/rss+xml" title="공학용 계산기 가이드" href="%s/rss.xml">' % SITE)
    out += ['<link rel="icon" href="/favicon.ico" sizes="32x32">', '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
            '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
            '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>',
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" media="print" onload="this.media=\'all\'">',
            '<link rel="stylesheet" href="/assets/style.css?v=%s">' % ASSET_V]
    for j in jsonld:
        out.append('<script type="application/ld+json">%s</script>' % json.dumps(j, ensure_ascii=False, separators=(',', ':')))
    if ads:
        out.append('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=%s" crossorigin="anonymous"></script>' % ADS_CLIENT)
        out.append('<script src="/assets/ads-config.js?v=%s" defer></script>' % ASSET_V)
    if extra:
        out.append(extra)
    out.append('</head>')
    return '\n'.join(out)


LOGO = ('<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="2" width="26" height="28" rx="7" class="lm-b"/>'
        '<rect x="7.5" y="6.5" width="17" height="7" rx="2" class="lm-s"/>'
        '<g class="lm-s"><circle cx="10.5" cy="19" r="2"/><circle cx="16" cy="19" r="2"/><circle cx="21.5" cy="19" r="2"/>'
        '<circle cx="10.5" cy="25" r="2"/><circle cx="16" cy="25" r="2"/></g><rect x="19.5" y="23" width="4" height="4" rx="1.2" fill="#ffb020"/></svg>')


def header(lang, path, alt=True):
    other = 'en' if lang == 'ko' else 'ko'
    other_href = url(other, path) if alt else url(other, '/')
    nav = [(url(lang, '/guide/'), T(lang, '가이드', 'Guides')), (url(lang, '/about/'), T(lang, '소개', 'About'))]
    bar_text = T(lang, 'This page is also available in English.', '이 페이지는 한국어로도 볼 수 있어요.')
    bar_link = T(lang, 'Open English', '한국어로 보기')
    return ('<a class="skip" href="#main">%s</a>\n' % T(lang, '본문으로 건너뛰기', 'Skip to content') +
            '<div class="langbar" id="langbar" hidden lang="%s"><span>%s</span><a href="%s" hreflang="%s">%s</a>'
            '<button type="button" aria-label="%s">×</button></div>\n' % (other, bar_text, other_href, other, bar_link, T(lang, '닫기', 'Close')) +
            '<div class="top-band"><header class="top wrap">'
            '<a class="logo" href="%s">%s<span>%s</span></a>' % (url(lang, '/'), LOGO, T(lang, '공학용 계산기', 'Scientific Calculator')) +
            '<nav class="top-nav" aria-label="%s">%s</nav>' % (T(lang, '사이트 메뉴', 'Site menu'),
                                                               ''.join('<a href="%s">%s</a>' % h for h in nav)) +
            '<a class="lang" href="%s" hreflang="%s" lang="%s" title="%s">%s</a>' % (
                other_href, other, other, T(lang, 'English version', '한국어판'), 'EN' if lang == 'ko' else 'KO') +
            '</header></div>')


MODES = [('/', '계산', 'Calculate'), ('/stats/', '통계', 'Statistics'), ('/distribution/', '분포', 'Distributions'),
         ('/equation/', '방정식', 'Equations'), ('/matrix/', '행렬·벡터', 'Matrix & vector'), ('/base/', '진법', 'Base-N'),
         ('/table/', '함수표', 'Table')]


# 모드 메뉴 아이콘 (2026-10-06 5차 '글자 줄이기': 설명 대신 아이콘 + 이름, 설명은 title 로)
MODE_ICONS = {
    '/': '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M9 12h.01M12 12h.01M15 12h.01M9 15.5h.01M12 15.5h.01M15 15.5h.01"/>',
    '/stats/': '<path d="M4 20h16M6.5 20v-7M11 20V6M15.5 20v-9M20 20v-4"/>',
    '/distribution/': '<path d="M3 19h18M3 18.5c4.5 0 5-12.5 9-12.5s4.5 12.5 9 12.5"/>',
    '/equation/': '<path d="M4.5 7.5l6 9M10.5 7.5l-6 9M14 10.5h6M14 14h6"/>',
    '/matrix/': '<path d="M7.5 4H5v16h2.5M16.5 4H19v16h-2.5M9.5 9h.01M14.5 9h.01M9.5 15h.01M14.5 15h.01"/>',
    '/base/': '<path d="M6 8l2.5-2v12"/><rect x="12.5" y="6" width="6" height="12" rx="3"/>',
    '/table/': '<path d="M4 4v16h16M6.5 16.5c3.5 0 5-9.5 12.5-10.5"/>',
}


def mode_icon(p):
    return ('<svg class="mi" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round">%s</svg>' % MODE_ICONS[p])


def modes_nav(lang, current):
    desc = {p: d for p, n, d in content.HOME[lang]['modes']}
    items = []
    for p, ko, en in MODES:
        cur = ' aria-current="page"' if p == current else ''
        items.append('<li><a href="%s"%s title="%s">%s<b>%s</b></a></li>' % (url(lang, p), cur, esc(strip(desc[p])), mode_icon(p), T(lang, ko, en)))
    return '<ul class="modes" aria-label="%s">%s</ul>' % (T(lang, '계산 모드', 'Calculator modes'), ''.join(items))


KBD_ROWS = {
    'ko': [(['sin', 'sqrt', 'log'], '글자가 함수로'), (['/'], '분수'), (['^'], '거듭제곱'), (['Enter'], '= 계산'),
           (['Shift+Enter'], '소수로'), (['Esc'], '모두 지우기'), (['↑', '↓'], '이전 식')],
    'en': [(['sin', 'sqrt', 'log'], 'words → functions'), (['/'], 'fraction'), (['^'], 'power'), (['Enter'], '= equals'),
           (['Shift+Enter'], 'decimal'), (['Esc'], 'clear'), (['↑', '↓'], 'previous')],
}


def side_panel(lang):
    """첫 페이지 오른쪽 칸: 늘 보이는 기록(calc.js 가 채움) + 키보드 단축키."""
    rows = ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (' '.join('<kbd>%s</kbd>' % esc(k) for k in ks), esc(d))
                   for ks, d in KBD_ROWS[lang])
    return ('<aside class="side" aria-label="%s">'
            '<section class="side-box side-hist"><div class="side-h"><h2>%s</h2><button type="button" class="side-x" data-hist-clear hidden>%s</button></div>'
            '<ol class="hist-list" data-hist hidden></ol><p class="side-note" data-hist-empty>%s</p></section>'
            '<details class="side-box side-kbd"><summary>%s</summary><p class="side-sub">%s</p><dl class="kbd-list" id="kbd-help">%s</dl>'
            '<a class="side-link" href="#keys">%s</a></details>'
            '</aside>') % (
        T(lang, '기록과 키보드', 'History and keyboard'), T(lang, '기록', 'History'), T(lang, '지우기', 'Clear'),
        T(lang, '계산하면 여기에 쌓여요. 누르면 그 식을 다시 불러와요.', 'Your calculations appear here. Tap one to bring it back.'),
        T(lang, '키보드 단축키', 'Keyboard shortcuts'),
        T(lang, '숫자와 + − * ( ) 는 그대로 쳐요.', 'Digits and + − * ( ) work as usual.'), rows,
        T(lang, '키 뜻 전체 보기 →', 'What every key does →'))


def ad_slot(lang, name):
    return ('<aside class="ad wrap" data-ad-wrap="%s" hidden aria-label="%s"><span class="ad-label">%s</span><div data-ad="%s"></div></aside>'
            % (name, T(lang, '광고', 'Advertisement'), T(lang, '광고', 'Advertisement'), name))


def footer(lang):
    nav = [(url(lang, '/guide/'), T(lang, '가이드', 'Guides')), (url(lang, '/about/'), T(lang, '소개', 'About')),
           (url(lang, '/privacy/'), T(lang, '개인정보 처리방침', 'Privacy policy'))]
    return ('<footer class="foot"><div class="wrap">'
            # 루멘랩 이름판: 계산기 위쪽 태양전지 + 이름판 모양. 보이면 전지 칸이 차례로 켜진다(ui.js labPlate)
            '<a class="lab-plate" href="%s"><span class="lab-sun" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'
            '<span class="lab-txt"><b>LUMEN LAB</b><small>%s</small></span><span class="lab-go" aria-hidden="true">→</span></a>' % (
                T(lang, 'https://lumenlab.page/', 'https://lumenlab.page/en/'),
                T(lang, '이 계산기를 만든 곳 · 다른 도구와 앱 보기', 'Made this calculator · see our other tools and apps')) +
            '<nav aria-label="%s">%s</nav>' % (T(lang, '아래 메뉴', 'Footer menu'), ''.join('<a href="%s">%s</a>' % h for h in nav)) +
            '<p>%s</p>' % T(lang, '계산은 모두 이 브라우저 안에서 해요. 시험·업무에 쓰기 전에는 중요한 값을 한 번 더 확인해 주세요.',
                            'Everything is calculated in your browser. Double-check important results before using them for exams or work.') +
            '<p>© 2026 Lumen Lab · <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>'
            '</div></footer>')


def scripts(names):
    return '\n'.join('<script src="/assets/%s.js?v=%s" defer></script>' % (n, ASSET_V) for n in names)


def page(lang, path, title, desc, body, *, scripts_=('ui',), alt=True, ads=True, jsonld=(), noindex=False, og_type='website'):
    return '\n'.join([head(lang, path, title, desc, alt=alt, ads=ads, jsonld=jsonld, noindex=noindex, og_type=og_type),
                      '<body>', header(lang, path, alt), body, footer(lang), scripts(scripts_), '</body>', '</html>', ''])


# ------------------------------------------------------------------ 계산기 판
def key(k, label, s=None, slabel=None, cls='', aria=None, wide=False, lang='ko'):
    attrs = 'type="button" class="k%s" data-k="%s"' % ((' ' + cls) if cls else '', k)
    if s:
        attrs += ' data-s="%s"' % s
    if aria:
        attrs += ' aria-label="%s"' % esc(aria, quote=True)
    tip = KEY_TIPS[lang].get(k)
    if tip and s and s in SHIFT_TIPS[lang]:
        tip += ' · SHIFT: ' + SHIFT_TIPS[lang][s]
    if tip:
        attrs += ' title="%s"' % esc(tip, quote=True)
    sl = '<span class="ks" aria-hidden="true">%s</span>' % slabel if slabel else ''
    return '<button %s>%s<span class="kl">%s</span></button>' % (attrs, sl, label)


# 키에 마우스를 올리면 나오는 설명(title)과 첫 페이지 '키 뜻' 표
KEY_TIPS = {
    'ko': {'shift': '다음에 누르는 키의 주황 글자 기능을 써요', 'fnmenu': '함수 목록: 쌍곡선·정수·순열·좌표·물리 상수·단위 바꾸기',
           'varmenu': '변수 A·B·C·D·M·x·y 저장·불러오기', 'left': '커서 왼쪽', 'right': '커서 오른쪽',
           'frac': '분수 □/□', 'sqrt': '제곱근 √', 'sq': '제곱 x²', 'pow': '거듭제곱: 지수 칸이 생겨요', 'inv': '역수 x⁻¹', 'abs': '절댓값 |x|',
           'logb': '밑을 정하는 로그 log□(□)', 'log': '상용로그 (밑 10)', 'ln': '자연로그 (밑 e)', 'sin': '사인', 'cos': '코사인', 'tan': '탄젠트',
           'lp': '여는 괄호', 'rp': '닫는 괄호', 'pi': '원주율 π', 'x': '변수 x (∫·Σ·SOLVE·함수표에 써요)', 'int': '정적분 ∫', 'sum': '합 Σ',
           'del': '한 칸 지우기', 'ac': '모두 지우기', 'mul': '곱하기', 'div': '나누기', 'add': '더하기', 'sub': '빼기',
           '0': '0', 'dot': '소수점', 'ee': '×10ˣ: 3×10⁸ 같은 지수 표기', 'ans': 'Ans: 직전 답', 'eq': '계산'},
    'en': {'shift': 'Use the orange function printed above the next key', 'fnmenu': 'Function list: hyperbolic, integer, probability, coordinates, constants, units',
           'varmenu': 'Store and recall variables A, B, C, D, M, x, y', 'left': 'Cursor left', 'right': 'Cursor right',
           'frac': 'Fraction □/□', 'sqrt': 'Square root √', 'sq': 'Square x²', 'pow': 'Power: opens an exponent box', 'inv': 'Reciprocal x⁻¹', 'abs': 'Absolute value |x|',
           'logb': 'Logarithm with a chosen base log□(□)', 'log': 'Common log (base 10)', 'ln': 'Natural log (base e)', 'sin': 'Sine', 'cos': 'Cosine', 'tan': 'Tangent',
           'lp': 'Open bracket', 'rp': 'Close bracket', 'pi': 'Pi π', 'x': 'Variable x (for ∫, Σ, SOLVE and tables)', 'int': 'Definite integral ∫', 'sum': 'Summation Σ',
           'del': 'Delete one', 'ac': 'All clear', 'mul': 'Multiply', 'div': 'Divide', 'add': 'Plus', 'sub': 'Minus',
           '0': '0', 'dot': 'Decimal point', 'ee': '×10ˣ: scientific notation like 3×10⁸', 'ans': 'Ans: previous answer', 'eq': 'Calculate'},
}
SHIFT_TIPS = {
    'ko': {'mixed': '대분수', 'cbrt': '세제곱근', 'cube': '세제곱', 'root': 'n제곱근', 'fact': '팩토리얼 x!', 'pct': '퍼센트 %',
           'angle': '복소수 극형식 ∠', 'pow10': '10의 거듭제곱', 'exp': 'e의 거듭제곱', 'asin': '역사인', 'acos': '역코사인', 'atan': '역탄젠트',
           'dms': '도·분·초 °′″ 넣기', 'comma': '쉼표 (함수 안의 값 나누기)', 'e': '자연상수 e', 'i': '허수 단위 i', 'der': '미분값 d/dx', 'prd': '곱 Π',
           'nPr': '순열 nPr', 'nCr': '조합 nCr', 'pol': 'Pol: 직교좌표 → 극좌표', 'rec': 'Rec: 극좌표 → 직교좌표',
           'rnd': 'Rnd: 화면 자릿수로 반올림', 'ran': 'Ran#: 0~1 난수', 'divr': '÷R: 몫과 나머지', 'approx': '≈: 소수로 계산'},
    'en': {'mixed': 'Mixed number', 'cbrt': 'Cube root', 'cube': 'Cube', 'root': 'nth root', 'fact': 'Factorial x!', 'pct': 'Percent %',
           'angle': 'Polar complex form ∠', 'pow10': 'Power of 10', 'exp': 'Power of e', 'asin': 'Inverse sine', 'acos': 'Inverse cosine', 'atan': 'Inverse tangent',
           'dms': 'Degrees-minutes-seconds °′″', 'comma': 'Comma (separates arguments)', 'e': 'Euler’s number e', 'i': 'Imaginary unit i', 'der': 'Derivative d/dx', 'prd': 'Product Π',
           'nPr': 'Permutations nPr', 'nCr': 'Combinations nCr', 'pol': 'Pol: rectangular → polar', 'rec': 'Rec: polar → rectangular',
           'rnd': 'Rnd: round to the shown digits', 'ran': 'Ran#: random number 0–1', 'divr': '÷R: quotient and remainder', 'approx': '≈: calculate as a decimal'},
}
KEY_LEGEND = {
    'ko': [('SHIFT', '누른 다음 키의 주황 글자 기능을 써요. 예: SHIFT 다음 sin → sin⁻¹'),
           ('DEG·RAD·GRA', '각도 단위. 누를 때마다 도 → 라디안 → 그레이드'),
           ('Norm', '숫자 표시 방식(보통·소수점 자리 고정 Fix·유효숫자 Sci). 누르면 설정이 열려요'),
           ('S⇔D', '답을 정확값(분수·루트·π)과 소수 사이에서 바꿔요'),
           ('ENG', '공학 표기: 10의 지수를 3의 배수로 (k·M·m·μ 단위 읽기 쉽게)'),
           ('°′″', '답을 도·분·초로 보여 줘요. SHIFT ( 로는 도·분·초를 넣어요'),
           ('소인수', '정수 답을 소인수분해 (360 → 2³×3²×5)'),
           ('▲ ▼', '▲는 이전 기록, ▼는 다음 기록을 불러와요. 분수 칸에서는 위·아래 칸으로 옮겨요'),
           ('함수', '함수 목록 판: 쌍곡선·정수(최대공약수 등)·순열·좌표·물리 상수·단위 바꾸기. 위의 ‘함수표’ 탭은 f(x) 값을 표로 만드는 다른 화면이에요'),
           ('변수', 'A·B·C·D·M·x·y에 답을 저장하고 불러와요. M+·M−도 여기에'),
           ('log□', '밑을 직접 넣는 로그. log₂8 = 3'),
           ('x□', '거듭제곱. 지수 칸이 생기고 ▶로 빠져나와요'),
           ('Pol · Rec', '좌표 바꾸기. Pol(x, y)는 직교 → 극좌표, Rec(r, θ)는 극 → 직교좌표'),
           ('Rnd', '답을 화면에 보이는 자릿수로 반올림해서 계산에 써요'),
           ('Ran#', '0 이상 1 미만 난수 (소수 셋째 자리)'),
           ('÷R', '나눗셈의 몫과 나머지. 17 ÷R 5 → 몫 3, 나머지 2'),
           ('≈', '정확값 대신 바로 소수로 계산 (SHIFT =)'),
           ('×10ˣ', '3×10⁸처럼 큰 수·작은 수를 써요')],
    'en': [('SHIFT', 'Uses the orange function above the next key. SHIFT then sin gives sin⁻¹'),
           ('DEG·RAD·GRA', 'Angle unit. Each press cycles degrees → radians → gradians'),
           ('Norm', 'Number format (Normal, fixed decimals Fix, significant figures Sci). Opens settings'),
           ('S⇔D', 'Switches the answer between exact (fraction, root, π) and decimal'),
           ('ENG', 'Engineering notation: powers of ten in steps of 3 (k, M, m, μ)'),
           ('°′″', 'Shows the answer in degrees-minutes-seconds. SHIFT ( enters °′″'),
           ('Factor', 'Prime factorization of an integer answer (360 → 2³×3²×5)'),
           ('▲ ▼', '▲ recalls the previous calculation, ▼ the next. In a fraction, moves between boxes'),
           ('FUNC', 'Function list: hyperbolic, integer (gcd etc.), probability, coordinates, constants, unit conversion. The ‘Table’ tab above is a separate screen that tabulates f(x)'),
           ('VAR', 'Store and recall answers in A, B, C, D, M, x, y. M+ and M− live here'),
           ('log□', 'Logarithm with a base you type. log₂8 = 3'),
           ('x□', 'Power. Opens an exponent box; leave it with ▶'),
           ('Pol · Rec', 'Coordinate conversion. Pol(x, y): rectangular → polar; Rec(r, θ): polar → rectangular'),
           ('Rnd', 'Rounds the answer to the digits on screen for further use'),
           ('Ran#', 'Random number from 0 up to 1 (three decimals)'),
           ('÷R', 'Division with remainder. 17 ÷R 5 → quotient 3, remainder 2'),
           ('≈', 'Calculate straight to a decimal instead of an exact value (SHIFT =)'),
           ('×10ˣ', 'Scientific notation such as 3×10⁸')],
}


def key_legend(lang):
    rows = ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (esc(a), esc(b)) for a, b in KEY_LEGEND[lang])
    return ('<section class="section wrap keyhelp"><details id="keys"><summary><h2>%s</h2></summary><p>%s</p><dl>%s</dl></details></section>'
            % (T(lang, '키 뜻 한눈에 보기', 'What each key does'),
               T(lang, '키에 마우스를 올려도 설명이 나와요. 주황 글자는 SHIFT를 누른 다음 그 키를 눌러요.',
                 'Hover over a key to see its name too. Orange labels need SHIFT first.'), rows))


PH = '<i class="kph"></i>'   # 빈칸 표시 □


def calculator(lang):
    L = lambda ko, en: T(lang, ko, en)  # noqa: E731
    K = lambda *a, **kw: key(*a, lang=lang, **kw)  # noqa: E731
    f_rows = [
        [K('shift', 'SHIFT', cls='shift', aria=L('SHIFT: 키 위 주황 글자 기능', 'SHIFT: use the orange function above a key')),
         K('fnmenu', L('함수', 'FUNC'), cls='menu', aria=L('함수·상수·단위 목록', 'Functions, constants and units')),
         K('varmenu', L('변수', 'VAR'), cls='menu', aria=L('변수와 메모리', 'Variables and memory')),
         K('left', '◀', aria=L('왼쪽', 'Left')),
         K('right', '▶', aria=L('오른쪽', 'Right')),
         '<div class="k arrows"><button type="button" data-k="up" aria-label="%s">▲</button><button type="button" data-k="down" aria-label="%s">▼</button></div>'
         % (L('위 / 이전 기록', 'Up / previous'), L('아래 / 다음 기록', 'Down / next'))],
        [K('frac', '<span class="kfrac"><i></i><b></b><i></i></span>', 'mixed', '□⅟□', aria=L('분수', 'Fraction')),
         K('sqrt', '√<i class="kph"></i>', 'cbrt', '³√', aria=L('제곱근', 'Square root')),
         K('sq', '<var>x</var><sup>2</sup>', 'cube', 'x³', aria=L('제곱', 'Square')),
         K('pow', '<var>x</var><sup>▫</sup>', 'root', 'ˣ√', aria=L('거듭제곱', 'Power')),
         K('inv', '<var>x</var><sup>−1</sup>', 'fact', 'x!', aria=L('역수', 'Reciprocal')),
         K('abs', '|<var>x</var>|', 'pct', '%', aria=L('절댓값', 'Absolute value'))],
        [K('logb', 'log<sub>▫</sub>', 'angle', '∠', aria=L('밑이 있는 로그', 'Log with base')),
         K('log', 'log', 'pow10', '10ˣ'),
         K('ln', 'ln', 'exp', 'eˣ'),
         K('sin', 'sin', 'asin', 'sin⁻¹'),
         K('cos', 'cos', 'acos', 'cos⁻¹'),
         K('tan', 'tan', 'atan', 'tan⁻¹')],
        [K('lp', '(', 'dms', '°′″'),
         K('rp', ')', 'comma', ','),
         K('pi', 'π', 'e', 'e'),
         K('x', '<var>x</var>', 'i', 'i', aria=L('변수 x', 'Variable x')),
         K('int', '∫', 'der', 'd/dx', aria=L('정적분', 'Definite integral')),
         K('sum', 'Σ', 'prd', 'Π', aria=L('합 Σ', 'Summation'))],
    ]
    n_rows = [
        [K('7', '7'), K('8', '8'), K('9', '9'), K('del', 'DEL', cls='del', aria=L('지우기', 'Delete')),
         K('ac', 'AC', cls='ac', aria=L('모두 지우기', 'All clear'))],
        [K('4', '4'), K('5', '5'), K('6', '6'), K('mul', '×', 'nPr', 'nPr', cls='op', aria=L('곱하기', 'Multiply')),
         K('div', '÷', 'nCr', 'nCr', cls='op', aria=L('나누기', 'Divide'))],
        [K('1', '1'), K('2', '2'), K('3', '3'), K('add', '+', 'pol', 'Pol', cls='op', aria=L('더하기', 'Plus')),
         K('sub', '−', 'rec', 'Rec', cls='op', aria=L('빼기', 'Minus'))],
        [K('0', '0', 'rnd', 'Rnd'), K('dot', '.', 'ran', 'Ran#', aria=L('소수점', 'Decimal point')),
         K('ee', '×10<sup><var>x</var></sup>', aria=L('지수 표기 ×10의 거듭제곱', 'Times ten to the power')),
         K('ans', 'Ans', 'divr', '÷R', aria=L('직전 답 Ans', 'Previous answer')),
         K('eq', '=', 'approx', '≈', cls='eq', aria=L('계산', 'Equals'))],
    ]
    status = ('<div class="status">'
              '<button type="button" data-st="angle" title="%s">DEG</button>'
              '<button type="button" data-st="disp" title="%s">Norm</button>'
              '<span class="st-flag" data-st="cplx" hidden>a+bi</span>'
              '<span class="st-flag st-shift" data-st="shift" hidden>S</span>'
              '<span class="st-flag" data-st="m" hidden>M</span>'
              '<span class="st-right"><a href="#keys">%s</a><button type="button" data-open="history">%s</button><button type="button" data-open="settings">%s</button></span>'
              '</div>') % (L('각도 단위 바꾸기 (DEG→RAD→GRA)', 'Change angle unit (DEG→RAD→GRA)'), L('숫자 표시 설정', 'Number format'),
                           L('키 뜻', 'Keys'), L('기록', 'History'), L('설정', 'Settings'))
    screen = ('<div class="screen">%s'
              '<div class="expr" tabindex="0" role="textbox" aria-label="%s" aria-describedby="kbd-help"></div>'
              '<div class="result" role="status" aria-live="polite" aria-label="%s"></div>'
              '</div>') % (status, L('계산식 입력 (키보드로 써도 돼요)', 'Expression (you can type)'), L('결과', 'Result'))
    starter = ('<span class="starter">%s<button type="button" data-try="√(8)+frac(1,2)">√8+½</button>'
               '<button type="button" data-try="frac(1,3)+frac(1,4)">⅓+¼</button><button type="button" data-try="6÷2(1+2)">6÷2(1+2)</button></span>'
               % L('눌러 보기', 'Try'))
    acts = ('<div class="acts is-start">' + starter +
            '<button type="button" data-act="sd" disabled title="%s">S⇔D</button>'
            '<button type="button" data-act="eng" disabled title="%s">ENG</button>'
            '<button type="button" data-act="dms" disabled title="%s">°′″</button>'
            '<button type="button" data-act="fact" disabled title="%s">%s</button>'
            '<span class="acts-sep"></span>'
            '<button type="button" data-act="copy" disabled>%s</button>'
            '</div>') % (L('정확값(분수·루트) ↔ 소수', 'Exact (fraction, root) ↔ decimal'), L('공학 표기 (10의 3의 배수 지수)', 'Engineering notation'),
                         L('도·분·초로 보기', 'Show as degrees-minutes-seconds'), L('소인수분해', 'Prime factorization'),
                         L('소인수', 'Factor'), L('복사', 'Copy'))
    keys = ('<div class="keys-f">%s</div><div class="keys-n">%s</div>'
            % (''.join(''.join(r) for r in f_rows), ''.join(''.join(r) for r in n_rows)))
    return ('<section class="calc" id="calc" translate="no" aria-label="%s">'
            '<div class="calc-brand"><span>LUMEN LAB</span><span>%s</span></div>'
            '%s%s%s<div class="sheet" hidden role="dialog" aria-modal="false"></div>'
            '<noscript><p class="noscript">%s</p></noscript>'
            '</section>') % (L('공학용 계산기', 'Scientific calculator'), L('자연 표시 · 정확값', 'NATURAL DISPLAY · EXACT'),
                             screen, acts, keys, L('계산기를 쓰려면 자바스크립트를 켜 주세요.', 'Please turn on JavaScript to use the calculator.'))


# ------------------------------------------------------------------ 페이지들
def home(lang):
    C = content.HOME[lang]
    faq_html = ''.join('<details><summary>%s</summary><p>%s</p></details>' % (q, a) for q, a in C['faq'])
    tip = lambda h, p, eg: '<div class="tip"><h3>%s</h3><p>%s</p>%s</div>' % (h, p, ('<span class="eg">%s</span>' % eg) if eg else '')  # noqa: E731
    tips = ''.join(tip(*t) for t in C['tips'][:3])
    if len(C['tips']) > 3:
        tips += '<details class="more-tips"><summary>%s</summary><div class="tips">%s</div></details>' % (
            T(lang, '사용법 더 보기', 'More tips'), ''.join(tip(*t) for t in C['tips'][3:]))
    guides = ''.join('<li><a href="%s">%s<span>%s</span></a></li>' % (url(lang, '/guide/%s/' % a['slug']), a['title'], a['short'])
                     for a in articles.list_for(lang))
    body = ('<main id="main">'
            '<section class="hero"><div class="wrap work">'
            '<h1>%s</h1><p class="lede">%s</p>'
            '<div class="w-nav">%s</div>'
            '<div class="tool">%s</div>'
            '%s'
            '</div></section>'
            '<div class="after-hero">'
            '<section class="wrap feat-wrap"><ul class="feat">%s</ul></section>'
            '%s'
            '<section class="section wrap"><h2>%s</h2><div class="tips">%s</div></section>'
            '%s'
            '<section class="section wrap"><h2>%s</h2><ul class="links">%s</ul></section>'
            '<section class="section wrap faq prose"><h2>%s</h2>%s</section>'
            '%s'
            '</div></main>') % (
        C['h1'], C['lede'], modes_nav(lang, '/'), calculator(lang), side_panel(lang),
        ''.join('<li><span class="dot"></span><span>%s</span></li>' % p for p in C['points']),
        ad_slot(lang, 'below-tool'),
        C['tips_h'], tips, key_legend(lang), C['guides_h'], guides, C['faq_h'], faq_html,
        ad_slot(lang, 'bottom'))
    jsonld = [content.webapp(lang, url(lang, '/'), SITE),
              {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
                  {'@type': 'Question', 'name': strip(q), 'acceptedAnswer': {'@type': 'Answer', 'text': strip(a)}} for q, a in C['faq']]}]
    return page(lang, '/', C['title'], C['desc'], body, scripts_=('engine', 'editor', 'ui', 'calc'), jsonld=jsonld)


def strip(s):
    import re
    return html.unescape(re.sub(r'<[^>]+>', '', s))


def mode_page(lang, m):
    C = content.MODE[m][lang]
    path = '/%s/' % m
    how = ''.join('<li>%s</li>' % x for x in C['how'])
    extra = C.get('more', '')
    links = ''.join('<li><a href="%s">%s<span>%s</span></a></li>' % (url(lang, p), n, d)
                    for p, n, d in content.HOME[lang]['modes'] if p != path)
    body = ('<main id="main">'
            '<section class="hero hero-mode"><div class="wrap work work-mode">'
            '<h1>%s</h1><p class="lede">%s</p><div class="w-nav">%s</div>'
            '<div class="tool"><div class="panel mode-ui" id="mode-ui" data-mode="%s"><noscript><p>%s</p></noscript></div></div>'
            '</div></section>'
            '<div class="after-hero">%s'
            '<section class="section wrap prose"><h2>%s</h2><ol>%s</ol>%s</section>'
            '<section class="section wrap"><h2>%s</h2><ul class="links">%s</ul></section>'
            '%s</div></main>') % (
        C['h1'], C['lede'], modes_nav(lang, path), m, T(lang, '계산하려면 자바스크립트를 켜 주세요.', 'Please turn on JavaScript.'),
        ad_slot(lang, 'below-tool'), T(lang, '쓰는 법', 'How to use'), how, extra,
        T(lang, '다른 계산', 'Other modes'), links, ad_slot(lang, 'bottom'))
    jsonld = [content.webapp(lang, url(lang, path), SITE, name=C['name'], desc=C['desc'])]
    return page(lang, path, C['title'], C['desc'], body, scripts_=('engine', 'editor', 'ui', 'modes', 'modes-ui'), jsonld=jsonld)


def crumbs(lang, items):
    return '<nav class="crumbs" aria-label="%s">%s</nav>' % (
        T(lang, '현재 위치', 'Breadcrumb'), ' › '.join('<a href="%s">%s</a>' % (h, n) if h else '<span>%s</span>' % n for h, n in items))


def guide_index(lang):
    path = '/guide/'
    lst = articles.list_for(lang)
    items = ''.join('<li><a href="%s"><b>%s</b><span>%s</span></a></li>' % (url(lang, '/guide/%s/' % a['slug']), a['title'], a['short']) for a in lst)
    title = T(lang, '공학용 계산기 가이드 — 계산 순서, 표준편차, 라디안, 방정식', 'Scientific Calculator Guides — order of operations, SD, radians, equations')
    desc = T(lang, '공학용 계산기를 쓰다 헷갈리는 것들을 예시와 함께 풀었어요. 6÷2(1+2), 표준편차 σ와 s, 도와 라디안, 이차·연립방정식, 순열과 조합.',
             'Plain-language guides with worked examples: 6÷2(1+2), population vs sample standard deviation, degrees vs radians, equations, nPr and nCr.')
    body = ('<main id="main"><div class="page-head"><div class="wrap">%s<h1>%s</h1><p>%s</p></div></div>'
            '<div class="wrap section prose"><ul class="guide-list">%s</ul></div></main>') % (
        crumbs(lang, [(url(lang, '/'), T(lang, '계산기', 'Calculator')), (None, T(lang, '가이드', 'Guides'))]),
        T(lang, '가이드', 'Guides'), desc, items)
    return page(lang, path, title, desc, body, alt=True)


def article_page(lang, a):
    path = '/guide/%s/' % a['slug']
    paired = articles.paired(a['slug'])
    j = [{'@context': 'https://schema.org', '@type': 'Article', 'headline': strip(a['title']), 'description': a['desc'],
          'inLanguage': lang, 'datePublished': a['date'], 'dateModified': a.get('updated', a['date']),
          'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'},
          'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'},
          'mainEntityOfPage': SITE + url(lang, path)},
         {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
             {'@type': 'ListItem', 'position': 1, 'name': T(lang, '공학용 계산기', 'Scientific Calculator'), 'item': SITE + url(lang, '/')},
             {'@type': 'ListItem', 'position': 2, 'name': T(lang, '가이드', 'Guides'), 'item': SITE + url(lang, '/guide/')},
             {'@type': 'ListItem', 'position': 3, 'name': strip(a['title']), 'item': SITE + url(lang, path)}]}]
    others = [b for b in articles.list_for(lang) if b['slug'] != a['slug']][:4]
    more = ''.join('<li><a href="%s">%s<span>%s</span></a></li>' % (url(lang, '/guide/%s/' % b['slug']), b['title'], b['short']) for b in others)
    upd = a.get('updated', a['date'])
    body = ('<main id="main"><div class="page-head"><div class="wrap">%s<h1>%s</h1><p>%s</p></div></div>'
            '<article class="wrap section prose">'
            '<div class="answer"><p>%s</p></div>'
            '%s'
            '<p class="updated">%s</p>'
            '</article>'
            '%s'
            '<section class="section wrap"><h2>%s</h2><ul class="links">%s</ul></section>'
            '%s</main>') % (
        crumbs(lang, [(url(lang, '/'), T(lang, '계산기', 'Calculator')), (url(lang, '/guide/'), T(lang, '가이드', 'Guides')), (None, a['title'])]),
        a['title'], a['desc'], a['answer'], articles.render_body(a, lang, url),
        T(lang, '처음 쓴 날 %s · 고친 날 %s · 루멘랩' % (a['date'], upd), 'Published %s · Updated %s · Lumen Lab' % (a['date'], upd)),
        ad_slot(lang, 'below-tool'),
        T(lang, '다른 가이드', 'More guides'), more, ad_slot(lang, 'bottom'))
    return page(lang, path, a['title'] + T(lang, ' | 공학용 계산기', ' | Scientific Calculator'), a['desc'], body,
                alt=paired, jsonld=j, og_type='article')


def simple_page(lang, path, key_):
    C = content.PAGES[key_][lang]
    body = ('<main id="main"><div class="page-head"><div class="wrap"><h1>%s</h1><p>%s</p></div></div>'
            '<div class="wrap section prose">%s</div></main>') % (C['h1'], C['lede'], C['body'])
    return page(lang, path, C['title'], C['desc'], body, ads=C.get('ads', True))


def not_found():
    body = ('<main id="main"><div class="page-head"><div class="wrap"><h1>페이지를 찾을 수 없어요 · Page not found</h1>'
            '<p>주소가 바뀌었거나 없는 페이지예요. The page may have moved.</p></div></div>'
            '<div class="wrap section prose"><p><a class="try" href="/">공학용 계산기로 가기</a> <a class="try" href="/en/">Go to the calculator</a></p></div></main>')
    return '\n'.join([head('ko', '/404', '페이지를 찾을 수 없어요 · Page not found', '없는 페이지', ads=False, noindex=True, alt=False),
                      '<body>', header('ko', '/', alt=False), body, footer('ko'), scripts(('ui',)), '</body>', '</html>', ''])


# ------------------------------------------------------------------ 쓰기
def write(path, text):
    full = os.path.join(ROOT, path.lstrip('/'))
    if full.endswith('/'):
        full += 'index.html'
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(text)
    return full


def main():
    pages = []   # (경로, lastmod)
    for lang in ('ko', 'en'):
        write(url(lang, '/'), home(lang)); pages.append((url(lang, '/'), content.UPDATED['home']))
        for m in content.MODE:
            write(url(lang, '/%s/' % m), mode_page(lang, m)); pages.append((url(lang, '/%s/' % m), content.UPDATED['modes']))
        write(url(lang, '/guide/'), guide_index(lang))
        lst = articles.list_for(lang)
        pages.append((url(lang, '/guide/'), max(a.get('updated', a['date']) for a in lst)))
        for a in lst:
            p = '/guide/%s/' % a['slug']
            write(url(lang, p), article_page(lang, a)); pages.append((url(lang, p), a.get('updated', a['date'])))
        for p, k in (('/about/', 'about'), ('/privacy/', 'privacy')):
            write(url(lang, p), simple_page(lang, p, k)); pages.append((url(lang, p), content.UPDATED[k]))
    write('/404.html', not_found())
    # sitemap: 실제로 고친 날을 lastmod 로
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for p, d in pages:
        sm.append('  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>' % (SITE, p, d))
    sm.append('</urlset>')
    write('/sitemap.xml', '\n'.join(sm) + '\n')
    # RSS: 한국어 글만, 본문 전체
    items = []
    for a in sorted(articles.list_for('ko'), key=lambda a: a['date'], reverse=True):
        link = SITE + '/guide/%s/' % a['slug']
        d = datetime.date.fromisoformat(a['date'])
        pub = datetime.datetime(d.year, d.month, d.day, 9, 0).strftime('%a, %d %b %Y %H:%M:%S +0900')
        full = '<p>%s</p>%s' % (a['answer'], articles.render_body(a, 'ko', url, absolute=SITE))
        items.append('<item><title>%s</title><link>%s</link><guid isPermaLink="true">%s</guid><pubDate>%s</pubDate>'
                     '<description>%s</description><content:encoded><![CDATA[%s]]></content:encoded></item>'
                     % (esc(strip(a['title'])), link, link, pub, esc(a['desc']), full))
    rss = ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" '
           'xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>공학용 계산기 가이드</title><link>%s/guide/</link>'
           '<atom:link href="%s/rss.xml" rel="self" type="application/rss+xml"/>'
           '<description>공학용 계산기를 쓰다 헷갈리는 것들을 예시와 함께 풀어요.</description><language>ko</language>%s</channel></rss>\n'
           % (SITE, SITE, ''.join(items)))
    write('/rss.xml', rss)
    # 글의 예시 계산을 테스트가 확인하도록 꺼내 둔다
    cases = []
    for lang in ('ko', 'en'):
        for a in articles.list_for(lang):
            for c in a.get('checks', []):
                cases.append(dict(c, page=url(lang, '/guide/%s/' % a['slug'])))
    with open(os.path.join(ROOT, 'tests', 'article_cases.json'), 'w', encoding='utf-8') as f:
        json.dump(cases, f, ensure_ascii=False, indent=1)
    print('페이지 %d개, 글 확인 %d개' % (len(pages) + 1, len(cases)))


if __name__ == '__main__':
    main()
