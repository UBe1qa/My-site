# 방침·지원 페이지와 404를 다시 만든다: 머리말·바닥글은 index.html에서, 본문은 원래 사이트(lumenlab-site)에서 그대로.
# 새 앱 페이지를 옮길 때: PAGES에 (경로, 앱 이름, 아이콘, 한국어 이름표 키) 한 줄을 더하고 python3 _dev/build_pages.py
# 원래 사이트 복사본 경로: SRC (없으면 git clone --depth 1 https://github.com/UBe1qa/lumenlab-site)
import re, os, sys
SRC = os.environ.get('SRC', '/home/claude/ube1qa/lumenlab-site')
here = os.path.dirname(os.path.abspath(__file__)); site = os.path.dirname(here); os.chdir(site)
BASE = 'https://lumenlab.mysitebox.workers.dev'
PAGES = [
    ('owlight/privacy', 'Owlight', '/img/owlight.webp', 'crumbPrivacy', '개인정보 처리방침', 'Owlight(macOS 메뉴 막대 앱)의 개인정보 처리방침. Owlight privacy policy.'),
    ('owlight/support', 'Owlight', '/img/owlight.webp', 'crumbSupport', '지원', 'Owlight(macOS 메뉴 막대 앱) 사용 안내, 자주 묻는 질문, 문의. Owlight support.'),
]
idx = open('index.html').read()
langscript = idx[idx.index('<script>\n/* 언어'):]
langscript = langscript[:langscript.index('/* 움직임은')].rstrip() + '\n</script>'
header = idx[idx.index('<a class="skip"'):idx.index('<main')]
footer = idx[idx.index('<footer'):idx.index('<script src="/assets/i18n.js"')]
tail = '<script src="/assets/i18n.js"></script>\n<script src="/assets/site.js" defer></script>\n</body>\n</html>\n'
def head(title, desc, url, extra=''):
    return f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
{extra}<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/site.css">
{langscript}
'''
for page, app, icon, key, label, desc in PAGES:
    o = open(os.path.join(SRC, page, 'index.html')).read()
    title = re.search(r'<title>(.*?)</title>', o).group(1)
    body = o[o.index('<body>') + 6:o.index('</body>')].strip()
    cut = body.index('<section')
    top, rest = body[:cut].strip(), body[cut:].strip()
    url = f'{BASE}/{page}/'
    extra = f'''<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Lumen Lab 루멘랩">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}/og.png">
'''
    slug = page.split('/')[0]
    html = head(title, desc, url, extra) + f'''</head>
<body>
{header}<main id="main">
<div class="doc-head">
<div class="wrap doc-head__in">
<p class="crumb"><img class="icon" src="{icon}" width="28" height="28" alt=""><a href="/#{slug}">{app}</a><span aria-hidden="true">›</span><span data-i18n="{key}">{label}</span></p>
<!-- 아래 제목·이동 줄과 본문은 원래 사이트(lumenlab-site)의 문구 그대로 -->
{top}
</div>
</div>
<div class="wrap doc">
{rest}
</div>
</main>

{footer}''' + tail
    os.makedirs(page, exist_ok=True)
    open(os.path.join(page, 'index.html'), 'w').write(html)
    print('만듦', page)

nf = head('페이지를 찾을 수 없어요 · Lumen Lab', 'Lumen Lab(루멘랩)', BASE, '<meta name="robots" content="noindex">\n') + '''<style>.nf{padding-top:80px;padding-bottom:96px;max-width:760px}.nf h1{font-size:clamp(28px,4.4vw,38px);line-height:1.3;margin:0 0 12px}.nf p{color:var(--ink-2);margin:0 0 28px}.nf .row{display:flex;flex-wrap:wrap;gap:10px}</style>
</head>
<body>
''' + header + '''<main id="main" class="wrap nf">
<h1 data-i18n="nfTitle">찾는 페이지가 없어요</h1>
<p data-i18n="nfText">주소가 바뀌었거나 잘못 들어왔을 수 있어요. 앱 목록에서 다시 골라 주세요.</p>
<p class="row"><a class="btn btn--main" href="/" data-i18n="nfHome">앱 목록으로</a><a class="btn btn--line" href="mailto:woxocoso@gmail.com" data-i18n="nfMail">메일로 문의</a></p>
</main>
''' + footer + tail
open('404.html', 'w').write(nf)
print('만듦 404.html')
