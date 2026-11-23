# 홈(랜딩) 칸을 _dev/catalog.json 에서 다시 만든다: python3 lumenlab/_dev/build_home.py
# index.html 의 <!-- gen:이름 --> ~ <!-- /gen:이름 --> 사이와 assets/i18n.js 의 /* gen:start */ ~ /* gen:end */ 사이만 바꾼다(손으로 고치지 말 것).
# 2026-10-18: 홈 = 루멘랩 랜딩 + 만든 것 전부(큰 아이콘 칸, gen:wall). 예전 '만든 것'(/works/) 목록은 이 홈으로 합쳤다(주소 이동은 _redirects).
# 2026-10-29: 가이드 /guides/ 를 다시 둔다. 이번엔 목록이 아니라 도구 사이트에서 옮겨 온 글 자체(build_guides.py, 이 파일 끝에서 부름).
#   아이콘을 누르면 assets/store.js 가 소개 창을 띄우고, 창 내용은 소개 페이지 /works/<id>/ 를 그대로 쓴다(build_store.py 가 만듦).
#   그래서 새 앱·도구는 catalog.json 한 줄 + showcase.json 한 항목(+ 도구면 assets/try/<id>.js)만 더하고 이 스크립트를 돌린다.
#   첫 화면(불 켜진 작업실 그림과 글)은 index.html 에 손으로 둔다(생성 칸 아님, 움직임은 assets/landing.js).
# 2026-11-19: 한국어 홈 index.html 은 「창 안으로」(틀 My-site-private reports/lumenlab/2026-11-19-홈-디자인-틀.md)를 _dev/home_ko.html 에서 굽는다(아래 '한국어 홈').
#   옛 홈(불 켜진 작업실 + 큰 아이콘 칸)은 _dev/shell.html 로 옮겼다: 영어 홈 /en/ 이 이것을 옮긴 것이고, 다른 페이지(소개·방침·소개 페이지·가이드)의 한국어 머리말·바닥글도 여기서 가져간다.
#   그래서 gen:wall·gen:foot 은 shell.html 에 채우고, 새 한국어 홈은 도구 걸이판(catalog tools)·작품 이름과 주소(catalog)만 채운다. 움직임 assets/home.js = _dev/home/*.js 를 차례로 이은 것.
# 웹 도구는 catalog.json 의 groups 순서대로 묶어서 보여 준다(도구마다 group 칸 필수, 없는 묶음 id면 멈춘다).
# sitemap.xml 도 여기서 만든다: 홈 + 소개·개인정보 처리방침 + 소개 페이지 15개(한·영) + 가이드 모음·글 + 카탈로그의 이 사이트 안 링크(/로 시작) 중 canonical이 lumenlab.page인 것.
#   lastmod = 그 파일을 마지막으로 바꾼 날(git). 가이드 글은 글의 마지막 확인 날(dateModified), 모음은 그중 가장 늦은 날.
# 소개(/about/)·방침(/privacy/)과 영어판은 build_info.py, 소개 페이지는 build_store.py 가 만든다(이 파일 끝에서 부름). 도구 사이트의 글을 읽으니 도구 폴더(catalog.json 의 dir)가 옆에 있어야 한다.
import json, os, re, shutil, subprocess, datetime, sys
from html import escape

here = os.path.dirname(os.path.abspath(__file__)); site = os.path.dirname(here)
sys.path.insert(0, here); import build_info, build_store, build_guides
cat = json.load(open(os.path.join(here, 'catalog.json')))
apps = cat['apps']; games = cat.get('games', []); tools = cat['tools']; groups = cat['groups']
_gid = [g['id'] for g in groups]
assert len(set(_gid)) == len(_gid), '묶음 id가 겹침'
for it in tools: assert it.get('group') in _gid, f"{it['id']}: group 이 없거나 groups 에 없음 ({it.get('group')!r})"
for g in groups: assert any(it['group'] == g['id'] for it in tools), f"묶음 {g['id']}: 도구가 하나도 없음(빈 묶음은 화면에 안 나오니 지우기)"
by_group = {g['id']: [it for it in tools if it['group'] == g['id']] for g in groups}
EN = {}
def foot(items):
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

idx = os.path.join(here, 'shell.html')   # 옛 홈 틀(영어 홈의 원본, 다른 페이지 머리말·바닥글)
html = open(idx).read()

# 바닥글: 첫 줄은 루멘랩 자체(만든 것·소개·사이트 전체 방침·문의). 어느 페이지에서든 누가 운영하는지와 방침을 찾게
pvs = [(it, h) for it in games + apps for h in ([it['privacy']['ko']] if it.get('privacy') else []) + [l['href'] for l in it['links'] if l['href'].endswith('/privacy/')]]
pv = ''.join(f'<a href="{h}" data-i18n="f_{it["id"]}">{it["name"]["ko"]}</a>' for it, h in pvs)
for k, v in (('ftLumen', 'Lumen Lab'), ('ftWorks', 'Everything we make'), ('ftGuides', 'Guides'), ('ftAbout', 'About'), ('ftPrivacy', 'Privacy Policy'), ('ftContact', 'Contact'), ('ftAppPrivacy', 'App privacy policies')): EN[k] = v
FOOT = '      <div><b data-i18n="ftLumen">루멘랩</b><a href="/#works" data-i18n="ftWorks">만든 것 전부</a><a href="/guides/" data-i18n="ftGuides">가이드</a><a href="/about/" data-i18n="ftAbout">소개</a><a href="/privacy/" data-i18n="ftPrivacy">개인정보 처리방침</a><a href="mailto:contact@lumenlab.page" data-i18n="ftContact">문의</a></div>\n'
sg, sa = build_store.shown(games), build_store.shown(apps)   # 출시 전이라 숨긴 것(hold)은 제품 줄에서만 뺀다
FOOT += (f'      <div><b data-i18n="ftGames">게임</b>{foot(sg)}</div>\n' if sg else '') + f'      <div><b data-i18n="ftApps">앱</b>{foot(sa)}</div>\n      <div><b data-i18n="ftTools">웹 도구</b>{foot(tools)}</div>'
for it, _ in pvs: EN.setdefault(f"f_{it['id']}", it['name']['en'])   # 제품 줄에서 뺀 것(hold)도 앱 방침 줄엔 남으니 영어 이름을 따로 넣는다
if pv: FOOT += f'\n      <div><b data-i18n="ftAppPrivacy">앱 개인정보 처리방침</b>{pv}</div>'

# 홈: 큰 아이콘 칸(누르면 소개 창)·바닥글·숫자
wall, wt, wl = build_store.wall(cat, EN)
html = put(html, 'wall', wall)
html, n = re.subn(r'(data-i18n="wlTitle">).*?(</h2>)', lambda m: m.group(1) + wt + m.group(2), html, flags=re.S); assert n == 1, '아이콘 칸 제목을 못 찾음'
html, n = re.subn(r'(data-i18n="wlLead">).*?(</p>)', lambda m: m.group(1) + wl + m.group(2), html, flags=re.S); assert n == 1, '아이콘 칸 설명을 못 찾음'
html = put(html, 'foot', FOOT)

open(idx, 'w').write(html)
for f in ['404.html', 'owlight/privacy/index.html', 'owlight/support/index.html']:
    f = os.path.join(site, f); src = open(f).read(); open(f, 'w').write(put(src, 'foot', FOOT))

# 합친 옛 페이지(/apps/·/tools/·/games/, /works/ 목록)는 지운다(주소 이동은 _redirects). /works/<id>/ 소개 페이지는 build_store.py, /guides/ 는 build_guides.py 가 쓴다
for x in ['games', 'apps', 'tools', 'en/games', 'en/apps', 'en/tools']:
    if os.path.isdir(os.path.join(site, x)): shutil.rmtree(os.path.join(site, x))
for x in ['works/index.html', 'en/works/index.html', 'assets/guides.js']:
    if os.path.isfile(os.path.join(site, x)): os.remove(os.path.join(site, x))

i18n = os.path.join(site, 'assets', 'i18n.js')
js = open(i18n).read()
gen = '\n'.join(f'    {k}: {json.dumps(v, ensure_ascii=False)},' for k, v in EN.items())
js, n = re.subn(r'(/\* gen:start \*/).*?(\n[ \t]*/\* gen:end \*/)', lambda m: m.group(1) + '\n' + gen + m.group(2), js, flags=re.S)
assert n == 1, 'i18n.js 표시 없음'
open(i18n, 'w').write(js)

# ---------- 한국어 홈 「창 안으로」 ----------
# 작품 넷(병아리 구조대·Owlight·세트노트·다음 작품)은 물건이 저마다 달라 틀(_dev/home_ko.html)에 손으로 두고, 이름·주소만 catalog 에서 읽는다.
# 홈은 catalog 의 hold 와 따로 간다: Owlight 는 2026-10-18 Mac App Store 에 나왔다(catalog 에 App Store 링크가 없으면 아래 주소).
APP_STORE = {'owlight': 'https://apps.apple.com/app/id6817679082'}
everything = {it['id']: it for it in games + apps + tools}
def h_name(i): return escape(everything[i]['name']['ko'])
def h_url(i): return escape(everything[i]['url'])
def h_link(i, part):
    for l in everything[i].get('links', []):
        if part in l['href']: return escape(l['href'])
    assert part == 'apps.apple.com' and i in APP_STORE, f'{i}: {part} 링크가 catalog 에 없음'
    return APP_STORE[i]
ROTS = [-2.2, 1.6, 1.1, -1.4, -0.8, 2.0, 1.8, -1.9, -1.2, 0.9, 2.3, -1.6]   # 꼬리표 기울기(줄마다 다르게, -2.3~+2.3°)
gfirst = {by_group[g['id']][0]['id']: g['id'] for g in groups}   # 묶음 첫 꼬리표에 옛 홈의 #g-<묶음> 자리표
tags = []
for n, it in enumerate([it for g in groups for it in by_group[g['id']]]):
    anchor = f'<span class="gid" id="g-{gfirst[it["id"]]}"></span>' if it['id'] in gfirst else ''
    tags.append(f'    <li>{anchor}<a class="tg" style="--r:{ROTS[n % len(ROTS)]}deg" href="/works/{it["id"]}/" data-show="{it["id"]}" aria-haspopup="dialog">'
                f'<span class="card"><img src="{it["icon"]}" width="42" height="42" alt="" loading="lazy"><b class="wi__n">{escape(it["name"]["ko"])}</b>'
                f'<span class="wt">{escape(it["what"]["ko"])}</span></span></a></li>')
CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>'
def drape(w, h, path, folds, gid):
    f = ''.join(f'<path d="{d}" fill="none" stroke="rgba(110,70,40,.32)" stroke-width="2.2" stroke-linecap="round"/>' for d in folds)
    return (f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" aria-hidden="true"><defs><linearGradient id="{gid}" x1="0" x2="1"><stop offset="0" stop-color="#b89a70"/><stop offset=".35" stop-color="#efdfc2"/>'
            f'<stop offset=".6" stop-color="#e4d0ad"/><stop offset="1" stop-color="#a88a62"/></linearGradient></defs><path d="{path}" fill="url(#{gid})"/>{f}'
            f'<path d="{path}" fill="none" stroke="rgba(255,240,210,.35)" stroke-width="1"/></svg>')
fill = {'tags': '\n'.join(tags), 'ntools': str(len(tools)), 'toolnames': escape(', '.join(it['name']['ko'] for it in tools)), 'check': CHECK,
        'drape_tall': drape(120, 210, 'M6 208 C4 170 10 60 22 22 Q60 0 98 22 C110 60 116 170 114 208 Q60 200 6 208 Z',
                            ['M42 28 C36 90 30 150 24 204', 'M62 16 C64 90 66 160 62 202', 'M86 30 C92 100 98 160 102 204'], 'dg1'),
        'drape_wide': drape(210, 164, 'M4 162 C2 136 6 40 14 18 Q105 0 196 18 C204 40 208 136 206 162 Q105 152 4 162 Z',
                            ['M46 14 C40 70 34 120 28 158', 'M100 8 C104 70 104 120 98 156', 'M150 12 C158 70 166 120 176 158', 'M20 60 C60 74 150 70 190 58'], 'dg2')}
home = open(os.path.join(here, 'home_ko.html')).read()
home = re.sub(r'\{\{name:([a-z]+)\}\}', lambda m: h_name(m.group(1)), home)
home = re.sub(r'\{\{url:([a-z]+)\}\}', lambda m: h_url(m.group(1)), home)
home = re.sub(r'\{\{link:([a-z]+):([^}]+)\}\}', lambda m: h_link(m.group(1), m.group(2)), home)
home = re.sub(r'\{\{([a-z_]+)\}\}', lambda m: fill[m.group(1)], home)
assert '{{' not in home, '한국어 홈: 채우지 못한 자리 ' + home[home.index('{{'):home.index('{{') + 40]
open(os.path.join(site, 'index.html'), 'w').write(home)
js_parts = ['head.js', 'scene.js', 'room.js', 'walk.js', 'touch.js']   # touch.js = 작은 부품 손맛 다섯(2026-11-23, 디자인북마크 Motion에서 옮김)
open(os.path.join(site, 'assets', 'home.js'), 'w').write('\n'.join(open(os.path.join(here, 'home', f)).read().rstrip('\n') + '\n' for f in js_parts))
print(f'한국어 홈: 작품 장 4 + 도구 꼬리표 {len(tags)}개 → index.html, assets/home.js')

print(f'게임 {len(games)}개, 앱 {len(apps)}개, 웹 도구 {len(tools)}개 = ' + ' / '.join(f"{g['name']['ko']} {len(by_group[g['id']])}" for g in groups))


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
    for k in set(re.findall(r'\bdata-i18n-ph="([^"]+)"', page)):
        assert k in ALL, f'영어 없음: {k}'
        page = re.sub(rf'placeholder="[^"]*"(\s+data-i18n-ph="{re.escape(k)}")', lambda m: f'placeholder="{escape(ALL[k])}"' + m.group(1), page)
    page = page.replace('<html lang="ko" data-lang="ko">', '<html lang="en" data-lang="en">')
    title, desc = ALL['docTitle'], ALL['metaDesc']
    for name, val in [('description', desc), ('og:description', desc), ('og:title', title)]:
        page = re.sub(rf'(<meta (?:name|property)="{name}" content=")[^"]*"', lambda m: m.group(1) + escape(val) + '"', page)
    page = page.replace('content="Lumen Lab 루멘랩"', 'content="Lumen Lab"')
    page = page.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="website">\n<meta property="og:locale" content="en_US">')
    page = re.sub(r'(rel="canonical" href="https://lumenlab\.page/)', r'\1en/', page)
    page = re.sub(r'(property="og:url" content="https://lumenlab\.page/)', r'\1en/', page)
    # 사이트 안 이동은 영어 쪽으로(루트의 만든 것·가이드·소개·방침은 /en/… 영어판이 따로 있음), 앱 방침·지원(한 주소에 두 언어)은 #en 으로, 도구는 영어 주소로
    page = re.sub(r'href="/((?:works/[a-z0-9]+/|about/|privacy/|guides/)?(?:#[^"]*)?)"', lambda m: f'href="/en/{m.group(1)}"', page)
    page = re.sub(r'href="((?:https://[a-z0-9-]+\.lumenlab\.page/(?:[a-z]+/)?|/(?!en/)[a-z]+/)(?:privacy|support)/)"', r'href="\1#en"', page)  # 앱 주소의 방침·지원도(owlight.lumenlab.page/support/)
    for it in tools + apps + games:
        if it.get('url_en'): page = page.replace(f'href="{it["url"]}"', f'href="{it["url_en"]}"')
        if it.get('privacy'): page = page.replace(f'href="{it["privacy"]["ko"]}"', f'href="{it["privacy"]["en"]}"')
    page = page.replace('<span>Lumen Lab(<span lang="ko">루멘랩</span>)</span>', '<span>Lumen Lab (<span lang="ko">루멘랩</span>)</span>')  # 영어는 괄호 앞 띄어쓰기
    page = page.replace('<a class="lang" href="/en/" hreflang="en" lang="en" data-other-lang>English</a>', '<a class="lang" href="/" hreflang="ko" lang="ko" data-other-lang>한국어</a>')
    return page

LEFT = re.compile(r'\\[0-9]|\{\{|\$\{|\{[a-z_]+\[')  # 치환·템플릿 자리표시자가 글자로 남은 것(예: \\1, {{, ${)
def no_left(page, where):
    body = re.sub(r'<script\b.*?</script>|<code\b.*?</code>|<pre\b.*?</pre>', '', page, flags=re.S)   # 가이드의 코드 보기(예: 와이파이 QR 의 p@ss\,word\\1)는 진짜 글자
    m = LEFT.search(body); assert not m, f'{where}: 자리표시자가 그대로 남음 {body[max(0, m.start()-40):m.end()+20]!r}'

def write_en(path, page):
    page = to_en(page, path); no_left(page, path)
    d = os.path.join(site, path); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w').write(page)

no_left(open(idx).read(), '_dev/shell.html'); no_left(open(os.path.join(site, 'index.html')).read(), 'index.html')
write_en('en/', open(idx).read())

# 소개·개인정보 처리방침(한·영)과 소개 페이지 /works/<id>/(한·영): 방금 만든 홈·영어 홈의 머리말·꼬리말을 그대로 쓴다
info_paths, _ = build_info.build(site, cat, groups, tools)
work_paths = build_store.build(site, cat, open(idx).read(), open(os.path.join(site, 'en', 'index.html')).read())
guide_paths, guide_meta = build_guides.build(site, cat, open(idx).read(), open(os.path.join(site, 'en', 'index.html')).read(), build_store.SC)
for q in [q for p in info_paths for q in (p, '/en' + p)] + work_paths + guide_paths: no_left(open(os.path.join(site, q.strip('/'), 'index.html')).read(), q)

# sitemap.xml: 서브도메인 사이트는 각자 사이트맵이 있어서 여기엔 lumenlab.page 주소만 넣는다.
# canonical이 다른 주소인 페이지(예: 앱스토어에 적힌 옛 주소를 canonical로 둔 방침·지원)는 빼서 사이트맵 = canonical을 지킨다.
def lastmod(f):
    rel = os.path.relpath(f, site)
    dirty = subprocess.run(['git', 'status', '--porcelain', '--', rel], cwd=site, capture_output=True, text=True).stdout.strip()
    day = '' if dirty else subprocess.run(['git', 'log', '-1', '--format=%cs', '--', rel], cwd=site, capture_output=True, text=True).stdout.strip()
    return day or datetime.date.today().isoformat()
# 한국어·영어 짝이 있는 주소(/ ↔ /en/, /works/daycount/ ↔ /en/works/daycount/ …)는 xhtml:link 로 서로를 알린다.
home = ['/'] + info_paths + [p for p in work_paths if not p.startswith('/en/')]
paths = [q for p in home for q in (p, '/en' + p)]
paths += guide_paths
paths += [l['href'] for it in games + apps + tools for l in it.get('links', []) if l['href'].startswith('/') and l['href'] not in paths]
urls = []
for pth in paths:
    f = os.path.join(site, pth.strip('/'), 'index.html')
    if not os.path.isfile(f): continue
    m = re.search(r'<link rel="canonical" href="([^"]+)"', open(f).read())
    if not m or m.group(1) != 'https://lumenlab.page' + pth: continue
    ko = pth[3:] if pth.startswith('/en/') else pth
    alt = ''.join(f'<xhtml:link rel="alternate" hreflang="{h}" href="https://lumenlab.page{p}"/>' for h, p in (('ko', ko), ('en', '/en' + ko), ('x-default', '/en' + ko))) if ko in home else ''
    gm = guide_meta.get(pth)
    if gm:   # 가이드: 짝은 도구 글이 이어 둔 것만, 날짜는 글의 마지막 확인 날
        alt = ''.join(f'<xhtml:link rel="alternate" hreflang="{h}" href="https://lumenlab.page{gm["alt"][k]}"/>' for h, k in (('ko', 'ko'), ('en', 'en'), ('x-default', 'en'))) if gm['alt'] else ''
    urls.append(f'  <url><loc>https://lumenlab.page{pth}</loc><lastmod>{gm["lastmod"] if gm else lastmod(f)}</lastmod>{alt}</url>')
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(urls) + '\n</urlset>\n'
smf = os.path.join(site, 'sitemap.xml')
if not os.path.isfile(smf) or open(smf).read().split('<url>')[1:] != sm.split('<url>')[1:]:
    open(smf, 'w').write(sm)
print(f'sitemap.xml: 주소 {len(urls)}개')
print('영어 페이지:', ', '.join(['/en/'] + ['/en' + p for p in info_paths]) + f' + 소개 페이지 {len(work_paths) // 2}개 + 가이드')
