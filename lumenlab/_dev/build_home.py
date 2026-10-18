# 홈(랜딩) 칸을 _dev/catalog.json 에서 다시 만든다: python3 lumenlab/_dev/build_home.py
# index.html 의 <!-- gen:이름 --> ~ <!-- /gen:이름 --> 사이와 assets/i18n.js 의 /* gen:start */ ~ /* gen:end */ 사이만 바꾼다(손으로 고치지 말 것).
# 2026-10-18: 홈 = 루멘랩 랜딩 + 만든 것 전부(큰 아이콘 칸, gen:wall). 예전 '만든 것'(/works/)·'가이드 모음'(/guides/) 페이지는 이 홈으로 합쳤다(주소 이동은 _redirects).
#   아이콘을 누르면 assets/store.js 가 소개 창을 띄우고, 창 내용은 소개 페이지 /works/<id>/ 를 그대로 쓴다(build_store.py 가 만듦).
#   그래서 새 앱·도구는 catalog.json 한 줄 + showcase.json 한 항목(+ 도구면 assets/try/<id>.js)만 더하고 이 스크립트를 돌린다.
#   첫 화면 문장(gen:now)도 여기서: 빛나는 칸은 도구 넷의 계산 파일이 방문자 기기에서 채운다(아래 NOW, 계산은 assets/landing.js).
# 웹 도구는 catalog.json 의 groups 순서대로 묶어서 보여 준다(도구마다 group 칸 필수, 없는 묶음 id면 멈춘다).
# sitemap.xml 도 여기서 만든다: 홈 + 소개·개인정보 처리방침 + 소개 페이지 15개(한·영) + 카탈로그의 이 사이트 안 링크(/로 시작) 중 canonical이 lumenlab.page인 것. lastmod = 그 파일을 마지막으로 바꾼 날(git).
# 소개(/about/)·방침(/privacy/)과 영어판은 build_info.py, 소개 페이지는 build_store.py 가 만든다(이 파일 끝에서 부름). 도구 사이트의 글을 읽으니 도구 폴더(catalog.json 의 dir)가 옆에 있어야 한다.
import json, os, re, shutil, subprocess, datetime, sys
from html import escape

here = os.path.dirname(os.path.abspath(__file__)); site = os.path.dirname(here)
sys.path.insert(0, here); import build_info, build_store
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

idx = os.path.join(site, 'index.html')
html = open(idx).read()
nall = len(games) + len(apps) + len(tools)

# 바닥글: 첫 줄은 루멘랩 자체(만든 것·소개·사이트 전체 방침·문의). 어느 페이지에서든 누가 운영하는지와 방침을 찾게
pv = ''.join(f'<a href="{h}" data-i18n="f_{it["id"]}">{it["name"]["ko"]}</a>' for it in games + apps for h in ([it['privacy']['ko']] if it.get('privacy') else []) + [l['href'] for l in it['links'] if l['href'].endswith('/privacy/')])
for k, v in (('ftLumen', 'Lumen Lab'), ('ftWorks', 'Everything we make'), ('ftAbout', 'About'), ('ftPrivacy', 'Privacy Policy'), ('ftContact', 'Contact'), ('ftAppPrivacy', 'App privacy policies')): EN[k] = v
FOOT = '      <div><b data-i18n="ftLumen">루멘랩</b><a href="/#works" data-i18n="ftWorks">만든 것 전부</a><a href="/about/" data-i18n="ftAbout">소개</a><a href="/privacy/" data-i18n="ftPrivacy">개인정보 처리방침</a><a href="mailto:contact@lumenlab.page" data-i18n="ftContact">문의</a></div>\n'
FOOT += (f'      <div><b data-i18n="ftGames">게임</b>{foot(games)}</div>\n' if games else '') + f'      <div><b data-i18n="ftApps">앱</b>{foot(apps)}</div>\n      <div><b data-i18n="ftTools">웹 도구</b>{foot(tools)}</div>'
if pv: FOOT += f'\n      <div><b data-i18n="ftAppPrivacy">앱 개인정보 처리방침</b>{pv}</div>'

# 홈: 큰 아이콘 칸(누르면 소개 창)·바닥글·숫자
wall, wt, wl = build_store.wall(cat, EN)
html = put(html, 'wall', wall)
html, n = re.subn(r'(data-i18n="wlTitle">).*?(</h2>)', lambda m: m.group(1) + wt + m.group(2), html, flags=re.S); assert n == 1, '아이콘 칸 제목을 못 찾음'
html, n = re.subn(r'(data-i18n="wlLead">).*?(</p>)', lambda m: m.group(1) + wl + m.group(2), html, flags=re.S); assert n == 1, '아이콘 칸 설명을 못 찾음'
html = put(html, 'foot', FOOT)

# 첫 화면 문장(gen:now): 빛나는 칸은 도구 넷(체크벤치·며칠 계산기·한바퀴·칸칸)의 진짜 계산 파일이 방문자 기기에서 채운다(assets/landing.js).
#   칸 = {이름}. 색·아이콘·이름은 showcase.json·catalog.json 에서, 계산 파일 주소는 소개 창과 같은 것(내용 지문 붙음, 창을 열 때 캐시를 같이 씀).
#   칸 안 글자 '··'는 계산 전 자리(꺼진 칸). 칸 이름과 도구: hz 주사율, date 오늘, left 올해 남은 날, time 다른 도시 지금 시각, count 이 문장 글자 수
NOW_TOOL = {'hz': 'checkbench', 'date': 'daycount', 'left': 'daycount', 'time': 'oneturn', 'count': 'kankan'}
NOW_CORE = [('checkbench', '/assets/ck-measure.js'), ('daycount', '/assets/dates.js'), ('oneturn', '/assets/core.js'), ('kankan', '/assets/lc-core.js')]
NOW = {
    'ko': ('이 페이지는 1초에 {hz} 새로 그려져요. 오늘은 {date}, 올해가 {left} 남았고 '
           '<span class="now__city" data-city>뉴욕</span>은 지금 {time}이에요. 여기까지 {count}.',
           {'hz': '··번', 'date': '··월 ··일 ·요일', 'left': '··일', 'time': '·· ·:··', 'count': '··자'}),
    'en': ('This page redraws {hz} a second. Today is {date}, with {left} left this year, '
           'and it’s {time} in <span class="now__city" data-city>Seoul</span>. That’s {count} so far.',
           {'hz': '·· times', 'date': '······, ······· ··', 'left': '·· days', 'time': '·:·· ··', 'count': '··· characters'}),
}
_tool = {it['id']: it for it in tools}
def now_line(lang):
    tpl, ph = NOW[lang]
    def tok(m):
        k = m.group(1); tid = NOW_TOOL[k]; it = _tool[tid]; sc = build_store.SC['tools'][tid]
        return (f'<a class="nt" data-nt="{k}" href="/works/{tid}/" data-show="{tid}" aria-haspopup="dialog" style="--tc:{sc["color"]}">'
                f'<img class="nt__i" src="{it["icon"]}" width="24" height="24" alt=""><b class="nt__v">{ph[k]}</b>'
                f'<span class="nt__who"> ({escape(it["name"][lang])})</span></a>')
    return re.sub(r'\{(\w+)\}', tok, tpl)
core = [build_info.core_url(_tool[t], f) for t, f in NOW_CORE]
EN['nowLine'] = now_line('en')
html = put(html, 'now', f'        <p class="now__line" data-now data-core="{escape(json.dumps(core))}" data-i18n="nowLine">{now_line("ko")}</p>')

EN['ctaWorks'] = f"See all {nall} things we make"
html, n = re.subn(r'(data-i18n="ctaWorks">)[^<]*', lambda m: m.group(1) + f'만든 것 {nall}개 둘러보기', html); assert n >= 1, "'만든 것 N개' 단추를 못 찾음"
open(idx, 'w').write(html)
for f in ['404.html', 'owlight/privacy/index.html', 'owlight/support/index.html']:
    f = os.path.join(site, f); src = open(f).read(); open(f, 'w').write(put(src, 'foot', FOOT))

# 합친 옛 페이지(/apps/·/tools/·/games/, /works/ 목록, /guides/)는 지운다(주소 이동은 _redirects). /works/<id>/ 소개 페이지는 build_store.py 가 쓴다
for x in ['games', 'apps', 'tools', 'guides', 'en/games', 'en/apps', 'en/tools', 'en/guides']:
    if os.path.isdir(os.path.join(site, x)): shutil.rmtree(os.path.join(site, x))
for x in ['works/index.html', 'en/works/index.html', 'assets/home.css', 'assets/guides.js']:
    if os.path.isfile(os.path.join(site, x)): os.remove(os.path.join(site, x))

i18n = os.path.join(site, 'assets', 'i18n.js')
js = open(i18n).read()
gen = '\n'.join(f'    {k}: {json.dumps(v, ensure_ascii=False)},' for k, v in EN.items())
js, n = re.subn(r'(/\* gen:start \*/).*?(\n[ \t]*/\* gen:end \*/)', lambda m: m.group(1) + '\n' + gen + m.group(2), js, flags=re.S)
assert n == 1, 'i18n.js 표시 없음'
open(i18n, 'w').write(js)
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
    page = re.sub(r'href="/((?:works/[a-z0-9]+/|about/|privacy/)?(?:#[^"]*)?)"', lambda m: f'href="/en/{m.group(1)}"', page)
    page = re.sub(r'href="((?:https://[a-z0-9-]+\.lumenlab\.page/(?:[a-z]+/)?|/(?!en/)[a-z]+/)(?:privacy|support)/)"', r'href="\1#en"', page)  # 앱 주소의 방침·지원도(owlight.lumenlab.page/support/)
    for it in tools + apps + games:
        if it.get('url_en'): page = page.replace(f'href="{it["url"]}"', f'href="{it["url_en"]}"')
        if it.get('privacy'): page = page.replace(f'href="{it["privacy"]["ko"]}"', f'href="{it["privacy"]["en"]}"')
    page = page.replace('<span>Lumen Lab(<span lang="ko">루멘랩</span>)</span>', '<span>Lumen Lab (<span lang="ko">루멘랩</span>)</span>')  # 영어는 괄호 앞 띄어쓰기
    page = page.replace('<a class="lang" href="/en/" hreflang="en" lang="en" data-other-lang>English</a>', '<a class="lang" href="/" hreflang="ko" lang="ko" data-other-lang>한국어</a>')
    return page

LEFT = re.compile(r'\\[0-9]|\{\{|\$\{|\{[a-z_]+\[')  # 치환·템플릿 자리표시자가 글자로 남은 것(예: \\1, {{, ${)
def no_left(page, where):
    body = re.sub(r'<script\b.*?</script>', '', page, flags=re.S)
    m = LEFT.search(body); assert not m, f'{where}: 자리표시자가 그대로 남음 {body[max(0, m.start()-40):m.end()+20]!r}'

def write_en(path, page):
    page = to_en(page, path); no_left(page, path)
    d = os.path.join(site, path); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w').write(page)

no_left(open(idx).read(), 'index.html')
write_en('en/', open(idx).read())

# 소개·개인정보 처리방침(한·영)과 소개 페이지 /works/<id>/(한·영): 방금 만든 홈·영어 홈의 머리말·꼬리말을 그대로 쓴다
info_paths, _ = build_info.build(site, cat, groups, tools)
work_paths = build_store.build(site, cat, open(idx).read(), open(os.path.join(site, 'en', 'index.html')).read())
for q in [q for p in info_paths for q in (p, '/en' + p)] + work_paths: no_left(open(os.path.join(site, q.strip('/'), 'index.html')).read(), q)

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
print('영어 페이지:', ', '.join(['/en/'] + ['/en' + p for p in info_paths]) + f' + 소개 페이지 {len(work_paths) // 2}개')
