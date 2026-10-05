# 첫 페이지의 앱·웹 도구 칸을 _dev/catalog.json 에서 다시 만든다: python3 lumenlab/_dev/build_home.py
# index.html 의 <!-- gen:이름 --> ~ <!-- /gen:이름 --> 사이와 assets/i18n.js 의 /* gen:start */ ~ /* gen:end */ 사이만 바꾼다(손으로 고치지 말 것).
# 칸마다 limit개를 넘으면 /apps/ · /tools/ 전체 목록 페이지를 만들고 홈에 '전체 보기'를 단다. 안 넘으면 그 페이지를 지운다.
import json, os, re, shutil
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
    out.append('            <p class="app__links">')
    for i, l in enumerate(it['links']):
        k = f"c_{it['id']}_l{i}"; EN[k] = l['en']
        out.append(f'              <a class="chip{" chip--go" if l.get("go") else ""}" href="{l["href"]}" data-i18n="{k}">{l["ko"]}</a>')
    out += ['            </p>', '          </div>', '        </li>']
    return '\n'.join(out)

def tool_card(it):
    a, line = t(f"c_{it['id']}_line", it['line'])
    host = re.sub(r'^https?://|/$', '', it['url'])
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
for kind, items, ko_t, en_t in [('apps', apps, '앱 전체', 'All apps'), ('tools', tools, '무료 웹 도구 전체', 'All free web tools')]:
    d = os.path.join(site, kind)
    if len(items) <= LIMIT:
        if os.path.isdir(d): shutil.rmtree(d)
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
    os.makedirs(d, exist_ok=True); open(os.path.join(d, 'index.html'), 'w').write(page)
EN['backHome'] = 'Back to Lumen Lab'

i18n = os.path.join(site, 'assets', 'i18n.js')
js = open(i18n).read()
gen = '\n'.join(f'    {k}: {json.dumps(v, ensure_ascii=False)},' for k, v in EN.items())
js, n = re.subn(r'(/\* gen:start \*/).*?(\n[ \t]*/\* gen:end \*/)', lambda m: m.group(1) + '\n' + gen + m.group(2), js, flags=re.S)
assert n == 1, 'i18n.js 표시 없음'
open(i18n, 'w').write(js)
print(f'앱 {len(apps)}개, 웹 도구 {len(tools)}개 (홈에는 칸마다 {LIMIT}개까지)')
