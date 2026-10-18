# 홈(랜딩)과 '만든 것' 페이지(/works/)의 카탈로그 칸을 _dev/catalog.json 에서 다시 만든다: python3 lumenlab/_dev/build_home.py
# index.html·works/index.html 의 <!-- gen:이름 --> ~ <!-- /gen:이름 --> 사이와 assets/i18n.js 의 /* gen:start */ ~ /* gen:end */ 사이만 바꾼다(손으로 고치지 말 것).
# 홈(index.html)은 루멘랩을 알리는 랜딩이다(2026-10-18). 여기서 채우는 것: 찾기 목록(finder), 작업대(making, status 있는 게임·앱), 바닥글, '만든 것 N개'·'가이드 N편' 숫자.
# 게임·앱·웹 도구 카드 목록은 /works/ 에 전부 보여 준다(그래서 예전의 /apps/·/tools/ 전체 목록 페이지는 없다. catalog 의 limit·group_limit 은 쓰지 않음).
#   works/index.html 의 머리말·바닥글은 홈 것을 그대로 옮겨 온다(머리말을 고치려면 index.html 만 고치고 이 스크립트를 돌린다).
# 웹 도구는 catalog.json 의 groups 순서대로 묶어서 보여 준다(도구마다 group 칸 필수, 없는 묶음 id면 멈춘다).
# 찾기 목록은 이름·find(찾는 말)·what/kind·line 을 두 언어 모두 data-* 에 넣고 assets/landing.js 가 점수로 고른다. 새 도구엔 find 칸을 넣는다.
# sitemap.xml 도 여기서 만든다: 홈 + /works/ + 가이드 모음·소개·개인정보 처리방침 + 카탈로그의 이 사이트 안 링크(/로 시작) 중 canonical이 lumenlab.page인 것. lastmod = 그 파일을 마지막으로 바꾼 날(git).
# 가이드 모음(/guides/)·소개(/about/)·방침(/privacy/)과 영어판은 build_info.py 가 만든다(이 파일 끝에서 부름). 도구 사이트의 글을 읽으니 도구 폴더(catalog.json 의 dir)가 옆에 있어야 한다.
import json, os, re, shutil, subprocess, datetime, sys
from html import escape

here = os.path.dirname(os.path.abspath(__file__)); site = os.path.dirname(here)
sys.path.insert(0, here); import build_info
cat = json.load(open(os.path.join(here, 'catalog.json')))
apps = cat['apps']; games = cat.get('games', []); tools = cat['tools']; groups = cat['groups']
_gid = [g['id'] for g in groups]
assert len(set(_gid)) == len(_gid), '묶음 id가 겹침'
for it in tools: assert it.get('group') in _gid, f"{it['id']}: group 이 없거나 groups 에 없음 ({it.get('group')!r})"
for g in groups: assert any(it['group'] == g['id'] for it in tools), f"묶음 {g['id']}: 도구가 하나도 없음(빈 묶음은 화면에 안 나오니 지우기)"
by_group = {g['id']: [it for it in tools if it['group'] == g['id']] for g in groups}
EN = {}
# 홈의 '가이드 N편' 줄과 소개 페이지에 쓰는 글 수(도구 사이트의 guide/ 아래 글, noindex 뺌)
GCOUNT = {l: sum(len(build_info.read_guides(site, it, l)[1]) for it in tools) for l in ('ko', 'en')}

def t(key, val):
    """한국어는 HTML에, 영어는 i18n.js 사전에."""
    EN[key] = val['en']
    return f'data-i18n="{key}"', val['ko']

def name_html(it, cls, tag='h3'):
    k = f"c_{it['id']}_name"
    sub = f' <span class="app__en">{escape(it["sub"])}</span>' if it.get('sub') else ''
    EN[k] = it['name']['en']
    return f'<{tag} class="{cls}" data-i18n="{k}">{it["name"]["ko"]}{sub}</{tag}>'

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

def tool_row(it):
    a, line = t(f"c_{it['id']}_line", it['line'])
    host = re.match(r'https?://([^/]+)', it['url']).group(1)
    return '\n'.join([
        '            <li class="trow">',
        f'              <a class="trow__a" href="{it["url"]}">',
        f'                <img class="trow__icon" src="{it["icon"]}" width="44" height="44" alt="" loading="lazy">',
        '                <div class="trow__text">',
        f'                  {name_html(it, "trow__name", "h4")}',
        f'                  <p class="trow__line" {a}>{line}</p>',
        '                </div>',
        f'                <span class="trow__host"><span>{escape(host)}</span><span class="trow__go" aria-hidden="true">→</span></span>',
        '              </a>',
        '            </li>'])

def tool_groups():
    """웹 도구를 묶음별로 전부(/works/)."""
    out = []
    for g in groups:
        items = by_group[g['id']]
        EN[f"g_{g['id']}_name"] = g['name']['en']; EN[f"g_{g['id']}_line"] = g['line']['en']
        rows = '\n'.join(tool_row(it) for it in items)
        out.append(f'''      <div class="tgroup rv" id="g-{g['id']}">
        <div class="tgroup__head">
          <h3 class="tgroup__name" id="g-{g['id']}-n" data-i18n="g_{g['id']}_name">{g['name']['ko']}</h3>
          <p class="tgroup__line" data-i18n="g_{g['id']}_line">{g['line']['ko']}</p>
        </div>
        <ul class="tgroup__list" aria-labelledby="g-{g['id']}-n">
{rows}
        </ul>
      </div>''')
    return '\n'.join(out)

KO_WORD = {'games': '게임', 'apps': '앱', 'tools': '웹 도구'}

def grid(kind, items):
    if kind == 'tools':
        return tool_groups()
    body = '\n'.join(app_card(it, i) for i, it in enumerate(items))
    head = f'      <ul class="cat__grid cat__grid--apps" aria-label="루멘랩의 {KO_WORD[kind]}" data-i18n-aria="{kind}Label">'
    return f'{head}\n{body}\n      </ul>'

def names(items):
    ko = ' · '.join(i['name']['ko'] for i in items[:3]); en = ' · '.join(i['name']['en'] for i in items[:3])
    if len(items) > 3:
        ko += f' 외 {len(items) - 3}개'; en += f' and {len(items) - 3} more'
    return ko, en

def shelf(kind, items, label):
    if kind == 'tools':  # 도구가 많아지면 이름 셋 + '외 N개'보다 묶음 이름이 고르기 쉽다
        ko = ' · '.join(g['name']['ko'] for g in groups); en = ' · '.join(g['name']['en'] for g in groups)
    else:
        ko, en = names(items)
    EN[f'sh_{kind}_n'] = f'{len(items)} ' + kind[:-1] + ('' if len(items) == 1 else 's')
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

def plain(h):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', h)).strip()

# ---------- 홈(랜딩) 찾기 목록: 하려는 일을 적으면 맞는 도구·게임·앱이 켜진다(점수는 landing.js) ----------
def finder_item(it, kind):
    host = re.match(r'https?://([^/]+)', it['url']).group(1)
    what = it.get('what') or {'ko': plain(it['kind']['ko']), 'en': plain(it['kind']['en'])}
    k = f"fi_{it['id']}"; EN[k + '_n'] = it['name']['en']; EN[k + '_w'] = what['en']
    grp = next((g['name'] for g in groups if g['id'] == it.get('group')), {'ko': KO_WORD[kind], 'en': kind[:-1]})
    q = lambda *vals: escape(' '.join(v for v in vals if v).lower(), quote=True)
    find = it.get('find', {})
    return '\n'.join([
        f'          <li class="fi" hidden data-id="{it["id"]}" data-n="{q(it["name"]["ko"], it["name"]["en"], it.get("sub", ""))}" data-f="{q(find.get("ko", ""), find.get("en", ""))}"'
        f' data-k="{q(KO_WORD[kind], "도구" if kind == "tools" else "", kind[:-1], "web tool" if kind == "tools" else "")}"'
        f' data-w="{q(what["ko"], what["en"], grp["ko"], grp["en"])}" data-l="{q(plain(it["line"]["ko"]), plain(it["line"]["en"]))}">',
        f'            <a class="fi__a" href="{it["url"]}">',
        f'              <img class="fi__icon" src="{it["icon"]}" width="44" height="44" alt="" loading="lazy">',
        f'              <span class="fi__t"><b data-i18n="{k}_n">{it["name"]["ko"]}</b><span data-i18n="{k}_w">{what["ko"]}</span></span>',
        f'              <span class="fi__host"><span>{escape(host)}</span> <span aria-hidden="true">→</span></span>',
        '            </a>',
        '          </li>'])

def board_item(it):
    k = f"fi_{it['id']}"
    return '\n'.join([
        f'          <li><a class="bd" href="{it["url"]}" data-id="{it["id"]}">',
        f'            <img src="{it["icon"]}" width="40" height="40" alt="" loading="lazy">',
        f'            <span data-i18n="{k}_n">{it["name"]["ko"]}</span>',
        '          </a></li>'])

def making_item(it):
    k = f"mk_{it['id']}"; EN[k] = it['name']['en']; EN[k + '_s'] = it['status']['en']
    l0 = it['links'][0]; EN[k + '_go'] = l0['en']
    return '\n'.join([
        '            <li class="mk">',
        '              <span class="bulb" aria-hidden="true"></span>',
        f'              <img class="mk__icon" src="{it["icon"]}" width="48" height="48" alt="" loading="lazy">',
        f'              <span class="mk__t"><b data-i18n="{k}">{it["name"]["ko"]}</b><span data-i18n="{k}_s">{it["status"]["ko"]}</span></span>',
        f'              <a class="mk__go" href="{l0["href"]}" data-i18n="{k}_go">{l0["ko"]}</a>',
        '            </li>'])

idx = os.path.join(site, 'index.html'); wks = os.path.join(site, 'works', 'index.html')
html = open(idx).read(); works = open(wks).read()
nall = len(games) + len(apps) + len(tools)

# 바닥글: 첫 줄은 루멘랩 자체(만든 것·소개·가이드·사이트 전체 방침·문의). 어느 페이지에서든 누가 운영하는지와 방침을 찾게
pv = ''.join(f'<a href="{h}" data-i18n="f_{it["id"]}">{it["name"]["ko"]}</a>' for it in games + apps for h in ([it['privacy']['ko']] if it.get('privacy') else []) + [l['href'] for l in it['links'] if l['href'].endswith('/privacy/')])
for k, v in (('ftLumen', 'Lumen Lab'), ('ftWorks', 'Everything we make'), ('ftAbout', 'About'), ('ftGuides', 'Guides'), ('ftPrivacy', 'Privacy Policy'), ('ftContact', 'Contact'), ('ftAppPrivacy', 'App privacy policies')): EN[k] = v
FOOT = '      <div><b data-i18n="ftLumen">루멘랩</b><a href="/works/" data-i18n="ftWorks">만든 것 전부</a><a href="/about/" data-i18n="ftAbout">소개</a><a href="/guides/" data-i18n="ftGuides">가이드</a><a href="/privacy/" data-i18n="ftPrivacy">개인정보 처리방침</a><a href="mailto:contact@lumenlab.page" data-i18n="ftContact">문의</a></div>\n'
FOOT += (f'      <div><b data-i18n="ftGames">게임</b>{foot(games, "games")}</div>\n' if games else '') + f'      <div><b data-i18n="ftApps">앱</b>{foot(apps, "apps")}</div>\n      <div><b data-i18n="ftTools">웹 도구</b>{foot(tools, "tools")}</div>'
if pv: FOOT += f'\n      <div><b data-i18n="ftAppPrivacy">앱 개인정보 처리방침</b>{pv}</div>'

# 홈: 찾기·작업대·바닥글·숫자
html = put(html, 'board', '\n'.join(board_item(it) for it in games + apps + tools))
html = put(html, 'finder', '\n'.join([finder_item(it, 'tools') for it in tools] + [finder_item(it, 'games') for it in games] + [finder_item(it, 'apps') for it in apps]))
making = [it for it in games + apps if it.get('status')]
assert making, '작업대에 올릴 게임·앱(status)이 없음 → index.html 의 작업대 칸을 다시 생각하기'
html = put(html, 'making', '\n'.join(making_item(it) for it in making))
html = put(html, 'foot', FOOT)
EN['ctaWorks'] = f"See all {nall} things we've made"
html, n = re.subn(r'(data-i18n="ctaWorks">)[^<]*', lambda m: m.group(1) + f'만든 것 {nall}개 전부 보기', html); assert n >= 2, "'만든 것 N개' 단추를 못 찾음"
EN['prGuides'] = f"{GCOUNT['en']} guides that explain the rules"
html, n = re.subn(r'(data-i18n="prGuides">)[^<]*', lambda m: m.group(1) + f'계산 기준을 풀어 쓴 가이드 {GCOUNT["ko"]}편', html); assert n == 1
open(idx, 'w').write(html)

# 만든 것(/works/): 홈의 머리말·바닥글 + 게임·앱·웹 도구 전부
hdr = html[html.index('<a class="skip"'):html.index('\n<main')].rstrip()
hdr = hdr.replace('<a class="nav-works" href="/works/"', '<a class="nav-works" href="/works/" aria-current="page"', 1)
hdr = hdr.replace('<a class="lang" href="/en/"', '<a class="lang" href="/en/works/"', 1)
ftr = html[html.index('<footer'):html.index('</footer>') + len('</footer>')]
works = put(works, 'head', hdr)
works = put(works, 'footer', ftr)
EN['wkTitle'] = f'{len(games)} games, {len(apps)} apps and <span class="nw">{len(tools)} free web tools</span>'
works = put(works, 'wtitle', f'        <h1 id="works-title" class="hero__title rv" data-i18n="wkTitle">게임 {len(games)}개, 앱 {len(apps)}개, <span class="nw">무료 웹 도구 {len(tools)}개</span></h1>')
works = put(works, 'shelves', (shelf('games', games, '게임') + '\n' if games else '') + shelf('apps', apps, '앱') + '\n' + shelf('tools', tools, '웹 도구'))
works = put(works, 'games', grid('games', games))
works = put(works, 'apps', grid('apps', apps))
works = put(works, 'tools', grid('tools', tools))
EN['guidesLink'] = f"All {GCOUNT['en']} guides on how each tool works and the rules behind its numbers"
works = put(works, 'guides', f'      <p class="cat__all cat__guides"><a href="/guides/" data-i18n="guidesLink">도구마다 쓰는 법과 계산 기준을 풀어 쓴 가이드 {GCOUNT["ko"]}편 모아 보기</a> <span aria-hidden="true">→</span></p>')
open(wks, 'w').write(works)
for f in ['404.html', 'owlight/privacy/index.html', 'owlight/support/index.html']:
    f = os.path.join(site, f); src = open(f).read(); open(f, 'w').write(put(src, 'foot', FOOT))
EN['backHome'] = 'Back to Lumen Lab'

# 예전 전체 목록 페이지(/apps/·/tools/ 등)는 /works/ 로 합쳤다(주소 이동은 _redirects)
for kind in ('games', 'apps', 'tools'):
    for x in (os.path.join(site, kind), os.path.join(site, 'en', kind)):
        if os.path.isdir(x): shutil.rmtree(x)

i18n = os.path.join(site, 'assets', 'i18n.js')
js = open(i18n).read()
gen = '\n'.join(f'    {k}: {json.dumps(v, ensure_ascii=False)},' for k, v in EN.items())
js, n = re.subn(r'(/\* gen:start \*/).*?(\n[ \t]*/\* gen:end \*/)', lambda m: m.group(1) + '\n' + gen + m.group(2), js, flags=re.S)
assert n == 1, 'i18n.js 표시 없음'
open(i18n, 'w').write(js)
print(f'게임 {len(games)}개, 앱 {len(apps)}개, 웹 도구 {len(tools)}개 = ' + ' / '.join(f"{g['name']['ko']} {len(by_group[g['id']])}" for g in groups) + f' · 작업대 {len(making)}개')


# ---------- 영어 페이지 /en/ · /en/works/ ----------
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
    for k in set(re.findall(r'\bdata-i18n-ph="([^"]+)"', page)):
        assert k in ALL, f'영어 없음: {k}'
        page = re.sub(rf'placeholder="[^"]*"(\s+data-i18n-ph="{re.escape(k)}")', lambda m: f'placeholder="{escape(ALL[k])}"' + m.group(1), page)
    page = page.replace('<html lang="ko" data-lang="ko">', '<html lang="en" data-lang="en">')
    title, desc = (ALL['wkDocTitle'], ALL['wkMetaDesc']) if path == 'en/works/' else (ALL['docTitle'], ALL['metaDesc'])
    for name, val in [('description', desc), ('og:description', desc), ('og:title', title)]:
        page = re.sub(rf'(<meta (?:name|property)="{name}" content=")[^"]*"', lambda m: m.group(1) + escape(val) + '"', page)
    page = page.replace('content="Lumen Lab 루멘랩"', 'content="Lumen Lab"')
    page = page.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="website">\n<meta property="og:locale" content="en_US">')
    page = re.sub(r'(rel="canonical" href="https://lumenlab\.page/)', r'\1en/', page)
    page = re.sub(r'(property="og:url" content="https://lumenlab\.page/)', r'\1en/', page)
    # 사이트 안 이동은 영어 쪽으로(루트의 만든 것·가이드·소개·방침은 /en/… 영어판이 따로 있음), 앱 방침·지원(한 주소에 두 언어)은 #en 으로, 도구는 영어 주소로
    page = re.sub(r'href="/((?:works/|guides/|about/|privacy/)?(?:#[^"]*)?)"', lambda m: f'href="/en/{m.group(1)}"', page)
    page = re.sub(r'href="((?:https://[a-z0-9-]+\.lumenlab\.page/(?:[a-z]+/)?|/(?!en/)[a-z]+/)(?:privacy|support)/)"', r'href="\1#en"', page)  # 앱 주소의 방침·지원도(owlight.lumenlab.page/support/)
    for it in tools + apps + games:
        if it.get('url_en'): page = page.replace(f'href="{it["url"]}"', f'href="{it["url_en"]}"')
        if it.get('privacy'): page = page.replace(f'href="{it["privacy"]["ko"]}"', f'href="{it["privacy"]["en"]}"')
    page = page.replace('<span>Lumen Lab(<span lang="ko">루멘랩</span>)</span>', '<span>Lumen Lab (<span lang="ko">루멘랩</span>)</span>')  # 영어는 괄호 앞 띄어쓰기
    page = re.sub(r'<a class="lang" href="/en/((?:works/)?)" hreflang="en" lang="en" data-other-lang>English</a>', lambda m: f'<a class="lang" href="/{m.group(1)}" hreflang="ko" lang="ko" data-other-lang>한국어</a>', page)
    return page

LEFT = re.compile(r'\\[0-9]|\{\{|\$\{|\{[a-z_]+\[')  # 치환·템플릿 자리표시자가 글자로 남은 것(예: \\1, {{, ${)
def no_left(page, where):
    body = re.sub(r'<script\b.*?</script>', '', page, flags=re.S)
    m = LEFT.search(body); assert not m, f'{where}: 자리표시자가 그대로 남음 {body[max(0, m.start()-40):m.end()+20]!r}'

def write_en(path, page):
    page = to_en(page, path); no_left(page, path)
    d = os.path.join(site, path); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w').write(page)

no_left(open(idx).read(), 'index.html'); no_left(open(wks).read(), 'works/index.html')
write_en('en/', open(idx).read())
write_en('en/works/', open(wks).read())

# 가이드 모음·소개·개인정보 처리방침(한·영): 방금 만든 홈·영어 홈의 머리말·꼬리말을 그대로 쓴다
info_paths, _ = build_info.build(site, cat, groups, tools)
for p in info_paths:
    for q in (p, '/en' + p): no_left(open(os.path.join(site, q.strip('/'), 'index.html')).read(), q)

# sitemap.xml: 서브도메인 사이트는 각자 사이트맵이 있어서 여기엔 lumenlab.page 주소만 넣는다.
# canonical이 다른 주소인 페이지(예: 앱스토어에 적힌 옛 주소를 canonical로 둔 방침·지원)는 빼서 사이트맵 = canonical을 지킨다.
def lastmod(f):
    rel = os.path.relpath(f, site)
    dirty = subprocess.run(['git', 'status', '--porcelain', '--', rel], cwd=site, capture_output=True, text=True).stdout.strip()
    day = '' if dirty else subprocess.run(['git', 'log', '-1', '--format=%cs', '--', rel], cwd=site, capture_output=True, text=True).stdout.strip()
    return day or datetime.date.today().isoformat()
# 한국어·영어 짝이 있는 주소(/ ↔ /en/, /apps/ ↔ /en/apps/ …)는 xhtml:link 로 서로를 알린다.
home = ['/', '/works/'] + info_paths
paths = [q for p in home for q in (p, '/en' + p)]
paths += [l['href'] for it in games + apps + tools for l in it.get('links', []) if l['href'].startswith('/') and l['href'] not in paths]
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
print('영어 페이지:', ', '.join(['/en/', '/en/works/'] + ['/en' + p for p in info_paths]))
