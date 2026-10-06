# 첫 페이지의 앱·웹 도구 칸을 _dev/catalog.json 에서 다시 만든다: python3 lumenlab/_dev/build_home.py
# index.html 의 <!-- gen:이름 --> ~ <!-- /gen:이름 --> 사이와 assets/i18n.js 의 /* gen:start */ ~ /* gen:end */ 사이만 바꾼다(손으로 고치지 말 것).
# 칸마다 limit개를 넘으면 /apps/ · /tools/ 전체 목록 페이지를 만들고 홈에 '전체 보기'를 단다. 안 넘으면 그 페이지를 지운다.
# sitemap.xml 도 여기서 만든다: 홈 + 전체 목록 페이지 + 카탈로그의 이 사이트 안 링크(/로 시작) 중 canonical이 lumenlab.page인 것. lastmod = 그 파일을 마지막으로 바꾼 날(git).
import json, os, re, shutil, subprocess, datetime
from html import escape

here = os.path.dirname(os.path.abspath(__file__)); site = os.path.dirname(here)
cat = json.load(open(os.path.join(here, 'catalog.json')))
LIMIT = cat['limit']; apps = cat['apps']; tools = cat['tools']
EN = {}

def t(key, val):
    """한국어는 HTML에, 영어는 i18n.js 사전에."""
    EN[key] = val['en']
    return f'data-i18n="{key}"', val['ko']

def name_html(it, cls):
    k = f"c_{it['id']}_name"
    sub = f' <span class="app__en">{escape(it["sub"])}</span>' if it.get('sub') else ''
    EN[k] = it['name']['en']
    return f'<h3 class="{cls}" data-i18n="{k}">{it["name"]["ko"]}{sub}</h3>'

def app_card(it, n):
    a, kind = t(f"c_{it['id']}_kind", it['kind'])
    lazy = ' loading="lazy"' if n > 1 else ''
    out = [f'        <li class="app rv">',
           f'          <img class="icon" src="{it["icon"]}" width="64" height="64" alt=""{lazy}>',
           f'          <div class="app__body">',
           f'            {name_html(it, "app__name")}',
           f'            <p class="app__kind" {a}>{kind}</p>']
    if it.get('status'):
        a, s = t(f"c_{it['id']}_status", it['status'])
        out.append(f'            <p class="app__status"><span {a}>{s}</span></p>')
    a, line = t(f"c_{it['id']}_line", it['line'])
    out.append(f'            <p class="app__line" {a}>{line}</p>')
    # 앱 카드 단추 규칙: 첫째 = 소개 페이지(it['url'])로 가는 강조 단추, 그다음 열기·지원·방침(강조 없음)
    assert it['links'][0]['href'] == it['url'] and it['links'][0].get('go') and not any(l.get('go') for l in it['links'][1:]), f"{it['id']}: 첫 단추는 소개(url)·강조여야 함"
    out.append('            <p class="app__links">')
    for i, l in enumerate(it['links']):
        k = f"c_{it['id']}_l{i}"; EN[k] = l['en']
        out.append(f'              <a class="chip{" chip--go" if l.get("go") else ""}" href="{l["href"]}" data-i18n="{k}">{l["ko"]}</a>')
    out += ['            </p>', '          </div>', '        </li>']
    return '\n'.join(out)

def tool_card(it):
    a, line = t(f"c_{it['id']}_line", it['line'])
    host = re.match(r'https?://([^/]+)', it['url']).group(1)
    return '\n'.join([
        '        <li class="tool rv">',
        f'          <a class="tool__a" href="{it["url"]}">',
        f'            <img class="tool__icon" src="{it["icon"]}" width="48" height="48" alt="" loading="lazy">',
        f'            {name_html(it, "tool__name")}',
        f'            <p class="tool__line" {a}>{line}</p>',
        f'            <p class="tool__url"><span>{escape(host)}</span><span class="tool__go" aria-hidden="true">→</span></p>',
        '          </a>',
        '        </li>'])

def grid(kind, items, full=False):
    shown = items if full else items[:LIMIT]
    if kind == 'apps':
        body = '\n'.join(app_card(it, i) for i, it in enumerate(shown))
        head = '      <ul class="cat__grid cat__grid--apps" aria-label="루멘랩의 앱" data-i18n-aria="appsLabel">'
    else:
        body = '\n'.join(tool_card(it) for it in shown)
        head = '      <ul class="cat__grid cat__grid--tools" aria-label="루멘랩의 무료 웹 도구" data-i18n-aria="toolsLabel">'
    more = ''
    if not full and len(items) > LIMIT:
        k = f'{kind}All'; EN[k] = f'See all {len(items)} ' + ('apps' if kind == 'apps' else 'tools')
        more = f'\n      <p class="cat__all"><a href="/{kind}/" data-i18n="{k}">{"앱" if kind == "apps" else "웹 도구"} {len(items)}개 전체 보기</a></p>'
    return f'{head}\n{body}\n      </ul>{more}'

def names(items):
    ko = ' · '.join(i['name']['ko'] for i in items[:3]); en = ' · '.join(i['name']['en'] for i in items[:3])
    if len(items) > 3:
        ko += f' 외 {len(items) - 3}개'; en += f' and {len(items) - 3} more'
    return ko, en

def shelf(kind, items, label):
    ko, en = names(items)
    EN[f'sh_{kind}_n'] = f'{len(items)} ' + (('app' if kind == 'apps' else 'tool') + ('' if len(items) == 1 else 's'))
    EN[f'sh_{kind}_names'] = en
    icons = ''.join(f'<img src="{i["icon"]}" width="36" height="36" alt="">' for i in items[:4])
    return f'''        <li class="rv"><a class="shelf" href="#{kind}">
          <span class="shelf__icons" aria-hidden="true">{icons}</span>
          <span class="shelf__text"><b data-i18n="sh_{kind}">{label}</b> <span class="shelf__n" data-i18n="sh_{kind}_n">{len(items)}개</span><span class="shelf__names" data-i18n="sh_{kind}_names">{ko}</span></span>
          <span class="shelf__go" aria-hidden="true">→</span>
        </a></li>'''

def foot(items, kind):
    out = []
    for it in items:
        href = it.get('url') or it['links'][0]['href']
        k = f"f_{it['id']}"; EN[k] = it['name']['en']
        out.append(f'<a href="{href}" data-i18n="{k}">{it["name"]["ko"]}</a>')
    return ''.join(out)

def put(src, name, body):
    pat = re.compile(rf'(<!-- gen:{name} -->).*?(\n[ \t]*<!-- /gen:{name} -->)', re.S)
    assert pat.search(src), f'표시 {name} 없음'
    return pat.sub(lambda m: m.group(1) + '\n' + body + m.group(2), src)

idx = os.path.join(site, 'index.html')
html = open(idx).read()
html = put(html, 'shelves', shelf('apps', apps, '앱') + '\n' + shelf('tools', tools, '웹 도구'))
html = put(html, 'apps', grid('apps', apps))
html = put(html, 'tools', grid('tools', tools))
# 앱 심사·이용자가 어느 페이지에서든 방침을 찾게, 방침이 있는 앱은 '개인정보 처리방침' 줄에 이름 하나씩
pv = ''.join(f'<a href="{l["href"]}" data-i18n="f_{it["id"]}">{it["name"]["ko"]}</a>' for it in apps for l in it['links'] if l['href'].endswith('/privacy/'))
FOOT = f'      <div><b data-i18n="ftApps">앱</b>{foot(apps, "apps")}</div>\n      <div><b data-i18n="ftTools">웹 도구</b>{foot(tools, "tools")}</div>'
if pv: FOOT += f'\n      <div><b data-i18n="privacy">개인정보 처리방침</b>{pv}</div>'
html = put(html, 'foot', FOOT)
open(idx, 'w').write(html)
for f in ['404.html', 'owlight/privacy/index.html', 'owlight/support/index.html']:
    f = os.path.join(site, f); src = open(f).read(); open(f, 'w').write(put(src, 'foot', FOOT))

# 전체 목록 페이지: 홈의 머리말·꼬리말을 그대로 쓰고 main만 바꾼다
lists = []
for kind, items, ko_t, en_t in [('apps', apps, '앱 전체', 'All apps'), ('tools', tools, '무료 웹 도구 전체', 'All free web tools')]:
    d = os.path.join(site, kind)
    if len(items) <= LIMIT:
        for x in (d, os.path.join(site, 'en', kind)):
            if os.path.isdir(x): shutil.rmtree(x)
        continue
    EN[f'{kind}PageTitle'] = en_t
    main = f'''<main id="main">
  <section class="cat cat--page" id="{kind}" aria-labelledby="{kind}-title">
    <div class="wrap">
      <p class="sec-kicker"><a href="/" data-i18n="backHome">루멘랩 처음으로</a></p>
      <h1 id="{kind}-title" class="sec-title" data-i18n="{kind}PageTitle">{ko_t}</h1>
{grid(kind, items, full=True)}
    </div>
  </section>
</main>'''
    page = re.sub(r'<main id="main">.*</main>', lambda m: main, html, flags=re.S)
    page = re.sub(r'<title[^>]*>.*?</title>', f'<title>{ko_t} · Lumen Lab 루멘랩</title>', page)
    page = page.replace('href="https://lumenlab.page/"', f'href="https://lumenlab.page/{kind}/"', 1)
    for a in ('ko', 'en', 'x-default'):
        page = re.sub(rf'(hreflang="{a}" href="https://lumenlab\.page/)(en/)?"', lambda m: m.group(1) + (m.group(2) or '') + f'{kind}/"', page)
    os.makedirs(d, exist_ok=True); open(os.path.join(d, 'index.html'), 'w').write(page)
    lists.append((kind, en_t, page))
EN['backHome'] = 'Back to Lumen Lab'

i18n = os.path.join(site, 'assets', 'i18n.js')
js = open(i18n).read()
gen = '\n'.join(f'    {k}: {json.dumps(v, ensure_ascii=False)},' for k, v in EN.items())
js, n = re.subn(r'(/\* gen:start \*/).*?(\n[ \t]*/\* gen:end \*/)', lambda m: m.group(1) + '\n' + gen + m.group(2), js, flags=re.S)
assert n == 1, 'i18n.js 표시 없음'
open(i18n, 'w').write(js)
print(f'앱 {len(apps)}개, 웹 도구 {len(tools)}개 (홈에는 칸마다 {LIMIT}개까지)')


# ---------- 영어 페이지 /en/ ----------
src_js = open(i18n).read()
obj = re.search(r'var EN = (\{.*?\n  \});', src_js, re.S).group(1)  # i18n.js 의 영어 사전(JS 객체)을 node 로 읽는다
ALL = json.loads(subprocess.run(['node', '-e', f'process.stdout.write(JSON.stringify({obj}))'], capture_output=True, text=True, check=True).stdout)

def swap_inner(src, attr, key, val):
    """data-i18n="key" 인 요소의 안쪽을 val 로. 같은 이름 태그가 겹쳐 있어도 짝을 세어 닫는 태그를 찾는다."""
    out, pos = [], 0
    for m in re.finditer(rf'<(\w+)\b[^>]*\b{attr}="{re.escape(key)}"[^>]*>', src):
        if m.start() < pos: continue
        tag, i, depth = m.group(1), m.end(), 1
        tok = re.compile(rf'<(/?){tag}\b[^>]*>', re.I)
        while depth:
            t = tok.search(src, i); depth += -1 if t.group(1) else 1; i = t.end()
        out += [src[pos:m.end()], val]; pos = t.start()
    return ''.join(out) + src[pos:]

def to_en(page, path):
    for k in set(re.findall(r'\bdata-i18n="([^"]+)"', page)):
        assert k in ALL, f'영어 없음: {k}'
        page = swap_inner(page, 'data-i18n', k, ALL[k])
    for k in set(re.findall(r'\bdata-i18n-aria="([^"]+)"', page)):
        assert k in ALL, f'영어 없음: {k}'
        page = re.sub(rf'aria-label="[^"]*"(\s+data-i18n-aria="{re.escape(k)}")', lambda m: f'aria-label="{escape(ALL[k])}"' + m.group(1), page)
    page = page.replace('<html lang="ko" data-lang="ko">', '<html lang="en" data-lang="en">')
    page = re.sub(r'<title>(.*?)</title>', lambda m: '<title>' + (ALL['docTitle'] if path == 'en/' else m.group(1).replace('앱 전체', ALL.get('appsPageTitle', '')).replace('무료 웹 도구 전체', ALL.get('toolsPageTitle', '')).replace(' · Lumen Lab 루멘랩', ' · Lumen Lab')) + '</title>', page)
    for name, val in [('description', ALL['metaDesc']), ('og:description', ALL['metaDesc']), ('og:title', ALL['docTitle'])]:
        page = re.sub(rf'(<meta (?:name|property)="{name}" content=")[^"]*"', lambda m: m.group(1) + escape(val) + '"', page)
    page = page.replace('content="Lumen Lab 루멘랩"', 'content="Lumen Lab"')
    page = page.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="website">\n<meta property="og:locale" content="en_US">')
    page = re.sub(r'(rel="canonical" href="https://lumenlab\.page/)', r'\1en/', page)
    page = re.sub(r'(property="og:url" content="https://lumenlab\.page/)', r'\1en/', page)
    # 사이트 안 이동은 영어 쪽으로, 앱 방침·지원(한 주소에 두 언어)은 #en 으로, 도구는 영어 주소로
    page = re.sub(r'href="/(#[^"]*|apps/|tools/)?"', lambda m: f'href="/en/{m.group(1) or ""}"', page)
    page = re.sub(r'href="(/[a-z]+/(?:privacy|support)/)"', r'href="\1#en"', page)
    for it in tools + apps:
        if it.get('url_en'): page = page.replace(f'href="{it["url"]}"', f'href="{it["url_en"]}"')
    page = page.replace('<a class="lang" href="/en/" hreflang="en" lang="en" data-other-lang>English</a>', '<a class="lang" href="/" hreflang="ko" lang="ko" data-other-lang>한국어</a>')
    return page

LEFT = re.compile(r'\\[0-9]|\{\{|\$\{|\{[a-z_]+\[')  # 치환·템플릿 자리표시자가 글자로 남은 것(예: \\1, {{, ${)
def no_left(page, where):
    body = re.sub(r'<script\b.*?</script>', '', page, flags=re.S)
    m = LEFT.search(body); assert not m, f'{where}: 자리표시자가 그대로 남음 {body[max(0, m.start()-40):m.end()+20]!r}'

def write_en(path, page):
    page = to_en(page, path); no_left(page, path)
    if path != 'en/':  # 목록 페이지의 '한국어' 단추는 같은 목록의 한국어 쪽으로
        page = page.replace('<a class="lang" href="/" hreflang="ko"', f'<a class="lang" href="/{path[3:]}" hreflang="ko"')
    d = os.path.join(site, path); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w').write(page)

no_left(open(idx).read(), 'index.html')
write_en('en/', open(idx).read())
for kind, en_t, page in lists:
    page = page.replace('<a class="lang" href="/en/" hreflang="en"', f'<a class="lang" href="/en/{kind}/" hreflang="en"')
    open(os.path.join(site, kind, 'index.html'), 'w').write(page)
    write_en(f'en/{kind}/', page)

# sitemap.xml: 서브도메인 사이트는 각자 사이트맵이 있어서 여기엔 lumenlab.page 주소만 넣는다.
# canonical이 다른 주소인 페이지(예: 앱스토어에 적힌 옛 주소를 canonical로 둔 방침·지원)는 빼서 사이트맵 = canonical을 지킨다.
def lastmod(f):
    rel = os.path.relpath(f, site)
    dirty = subprocess.run(['git', 'status', '--porcelain', '--', rel], cwd=site, capture_output=True, text=True).stdout.strip()
    day = '' if dirty else subprocess.run(['git', 'log', '-1', '--format=%cs', '--', rel], cwd=site, capture_output=True, text=True).stdout.strip()
    return day or datetime.date.today().isoformat()
# 한국어·영어 짝이 있는 주소(/ ↔ /en/, /apps/ ↔ /en/apps/ …)는 xhtml:link 로 서로를 알린다.
home = ['/'] + [f'/{k}/' for k, items in (('apps', apps), ('tools', tools)) if len(items) > LIMIT]
paths = [q for p in home for q in (p, '/en' + p)]
paths += [l['href'] for it in apps + tools for l in it.get('links', []) if l['href'].startswith('/') and l['href'] not in paths]
urls = []
for pth in paths:
    f = os.path.join(site, pth.strip('/'), 'index.html')
    if not os.path.isfile(f): continue
    m = re.search(r'<link rel="canonical" href="([^"]+)"', open(f).read())
    if not m or m.group(1) != 'https://lumenlab.page' + pth: continue
    ko = pth[3:] if pth.startswith('/en/') else pth
    alt = ''.join(f'<xhtml:link rel="alternate" hreflang="{h}" href="https://lumenlab.page{p}"/>' for h, p in (('ko', ko), ('en', '/en' + ko), ('x-default', '/en' + ko))) if ko in home else ''
    urls.append(f'  <url><loc>https://lumenlab.page{pth}</loc><lastmod>{lastmod(f)}</lastmod>{alt}</url>')
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(urls) + '\n</urlset>\n'
smf = os.path.join(site, 'sitemap.xml')
if not os.path.isfile(smf) or open(smf).read().split('<url>')[1:] != sm.split('<url>')[1:]:
    open(smf, 'w').write(sm)
print(f'sitemap.xml: 주소 {len(urls)}개')
print('영어 페이지:', ', '.join(['/en/'] + [f'/en/{k}/' for k, _, _ in lists]))
