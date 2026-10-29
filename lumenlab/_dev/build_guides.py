# 루트 가이드 /guides/ (한국어)·/en/guides/ (영어)를 만든다. 혼자 돌리지 않고 build_home.py 가 부른다.
# 2026-10-29 애드센스가 lumenlab.page 를 두 번째로 '가치가 별로 없는 콘텐츠'로 거절한 뒤, 도구 사이트마다 흩어져 있던 가이드 글 104편을 이 사이트 한곳에 모았다.
#   글의 원본은 그대로 각 도구 폴더다: 도구 빌드가 만드는 <도구 폴더>/…/guide/<글>/index.html 을 읽어 본문만 꺼내 루멘랩 틀에 담는다.
#   → 글을 고치려면 그 도구의 글 파일을 고치고 그 도구 빌드 → build_home.py 순서로 돌린다. 여기서 글을 직접 쓰지 않는다.
#   도구 사이트의 옛 주소(/guide/…)는 각 도구 폴더의 _redirects(며칠 계산기는 worker.js)가 이 사이트의 같은 이름 글로 301 넘긴다.
# 주소: /guides/<도구 주소 첫 마디>/<글 이름>/ (예: date.lumenlab.page/guide/d-day/ → /guides/date/d-day/), 영어는 /en/guides/…
#   한국어·영어 짝은 도구 글이 hreflang으로 이어 둔 것만 잇는다(주제가 다른 글은 잇지 않는다). 모음 /guides/ ↔ /en/guides/ 는 잇는다.
# 본문 꺼내기(clean): <main> 안에서 광고 칸·빵 부스러기·제목(h1)·날짜 줄·'다른 글'처럼 링크만 모은 칸·스크립트를 빼고,
#   감싸기만 하는 칸(article·div.prose 등)은 벗긴다. 표는 옆으로 밀리게 .tbl 로 감싼다.
#   링크: 다른 가이드 글은 이 사이트 글 주소로, 그 밖의 도구 페이지는 도구 주소(https://<도구>.lumenlab.page/…)로 바꾼다.
# 광고: 도구 사이트에 있을 때처럼 글 페이지에만 애드센스 자동 광고 코드를 넣는다(모음·홈·만든 것·소개·방침·앱 지원 페이지엔 없음).
import os, re, json, shutil, html as H
from html.parser import HTMLParser
from urllib.parse import urlparse, urljoin
import build_info as BI

ROOT = BI.ROOT
esc = BI.esc
ADS = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9496167591465154" crossorigin="anonymous"></script>\n'


# ---------- 아주 작은 HTML 나무(표준 라이브러리만) ----------
# 여는 태그는 원래 글자 그대로(raw) 둔다. 속성을 바꾼 태그만 다시 쓴다. 닫는 태그는 원래 이름(대소문자) 그대로.
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}

class El:
    __slots__ = ('tag', 'name', 'raw', 'attrs', 'kids', 'up', 'closed')
    def __init__(s, tag, raw, attrs, up, closed=False):
        s.tag, s.raw, s.attrs, s.kids, s.up, s.closed = tag, raw, list(attrs), [], up, closed
        m = re.match(r'<([A-Za-z][^\s/>]*)', raw or '')
        s.name = m.group(1) if m else tag
    def get(s, k, d=None):
        for a, v in s.attrs:
            if a == k: return v if v is not None else ''
        return d
    def cls(s): return set((s.get('class') or '').split())
    def set(s, k, v):
        """속성 하나를 바꾸거나(v=None 이면 뺀다) 여는 태그 글자를 다시 쓴다."""
        out, done = [], False
        for a, x in s.attrs:
            if a == k:
                done = True
                if v is not None: out.append((a, v))
            else: out.append((a, x))
        if not done and v is not None: out.append((k, v))
        s.attrs = out
        s.raw = '<' + s.name + ''.join(f' {a}' if x is None else f' {a}="{esc(x)}"' for a, x in out) + (' />' if s.closed else '>')
    def els(s):
        """아래의 모든 요소(깊이 우선)."""
        for k in s.kids:
            if isinstance(k, El):
                yield k; yield from k.els()
    def text(s):
        return ''.join(k if isinstance(k, str) else k.text() for k in s.kids)
    def drop(s): s.up.kids.remove(s)
    def unwrap(s):
        i = s.up.kids.index(s)
        for k in s.kids:
            if isinstance(k, El): k.up = s.up
        s.up.kids[i:i + 1] = s.kids

class Tree(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=False)
        s.root = El('#root', '', [], None); s.cur = s.root
    def handle_starttag(s, tag, attrs):
        e = El(tag, s.get_starttag_text(), attrs, s.cur); s.cur.kids.append(e)
        if tag not in VOID: s.cur = e
    def handle_startendtag(s, tag, attrs):
        s.cur.kids.append(El(tag, s.get_starttag_text(), attrs, s.cur, closed=True))
    def handle_endtag(s, tag):
        e = s.cur
        while e is not s.root and e.tag != tag: e = e.up
        if e is not s.root: s.cur = e.up
    def handle_data(s, d): s.cur.kids.append(d)
    def handle_entityref(s, n): s.cur.kids.append(f'&{n};')
    def handle_charref(s, n): s.cur.kids.append(f'&#{n};')

def parse(src):
    t = Tree(); t.feed(src); t.close(); return t.root

def out(n):
    if isinstance(n, str): return n
    inner = ''.join(out(k) for k in n.kids)
    if n.tag == '#root': return inner
    if n.tag in VOID or n.closed: return n.raw
    return f'{n.raw}{inner}</{n.name}>'

def attached(e):
    """나무에 아직 붙어 있는지(조상 중 하나라도 빠졌으면 아님)."""
    while e.up is not None:
        if not any(k is e for k in e.up.kids): return False
        e = e.up
    return e.tag == '#root'

def plain(s):
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', s or ''))).strip()


# ---------- 도구마다 글 찾기 ----------
def host_of(it): return urlparse(it['url']).netloc.split('.')[0]      # date, calc, salary, convert …

def tool_base(it, lang):
    """그 도구의 그 언어판 시작 주소(https://convert.lumenlab.page/ko/)와 폴더 안 경로(ko/)."""
    url = it['url_en'] if lang == 'en' else it['url']
    u = urlparse(url); base = u.path if u.path.endswith('/') else u.path + '/'
    return f'{u.scheme}://{u.netloc}{base}', base.strip('/')

def root_path(it, lang, slug=None):
    pre = '/en' if lang == 'en' else ''
    return f'{pre}/guides/{host_of(it)}/{slug}/' if slug else f'{pre}/guides/#{host_of(it)}'

def find(site, cat):
    """[(it, lang, slug, file, 도구 글 주소)…] 도구 순서(묶음 순) → 도구 가이드 목록 순서. 글 정보는 build_info.read_guides 와 같은 규칙으로 읽는다."""
    tools = [it for g in cat['groups'] for it in cat['tools'] if it['group'] == g['id']]
    mono = os.path.dirname(site); found = []
    for it in tools:
        for lang in ('ko', 'en'):
            index, items = BI.read_guides(site, it, lang)
            base_url, base = tool_base(it, lang)
            for g in items:
                f = os.path.join(mono, it['dir'], base, 'guide', g['slug'], 'index.html')
                found.append(dict(it=it, lang=lang, slug=g['slug'], file=f, src_url=g['url'], index_url=index['url'],
                                  title=g['title'], desc=g['desc'], pub=g['pub'], mod=g['mod'] or g['pub']))
    return found


# ---------- 본문 꺼내기 ----------
AD_CLS = {'ad', 'ad-wrap', 'ad-slot', 'ad-label', 'ad-in', 'ad-col'}
WRAP_CLS = {'wrap', 'narrow', 'prose', 'article-body', 'art', 'doc', 'article', 'section', 'page-head', 'below', 'center', 'col'}
KEEP_BOX = {'tbl', 'tbl-wrap', 'answer', 'lead', 'lede', 'try', 'src', 'sources', 'bars', 'fig', 'cta', 'tip', 'note', 'calc'}
DATE_CLS = {'meta', 'byline', 'updated'}

class Links:
    """도구 주소 → 이 사이트 주소. 글 주소(도구 canonical)와 도구 가이드 목록 주소를 다 안다."""
    def __init__(s, found):
        s.art, s.idx = {}, {}
        for a in found:
            s.art[a['src_url']] = root_path(a['it'], a['lang'], a['slug'])
            s.idx[a['index_url']] = root_path(a['it'], a['lang'])
            # 도구들이 먼저 이 사이트 주소로 바꿔 둔 링크(…/guides/<도구>/<글>/)도 받는다
            s.art[ROOT + root_path(a['it'], a['lang'], a['slug'])] = root_path(a['it'], a['lang'], a['slug'])
    def fix(s, href, page_url):
        if not href or href.startswith(('#', 'mailto:', 'tel:', 'javascript:')): return href
        absu = urljoin(page_url, href)
        u = urlparse(absu); frag = ('#' + u.fragment) if u.fragment else ''
        bare = f'{u.scheme}://{u.netloc}{u.path}'
        if not bare.endswith('/') and '.' not in u.path.rsplit('/', 1)[-1]: bare += '/'
        if bare in s.art: return s.art[bare] + frag
        if bare in s.idx: return s.idx[bare]
        if u.netloc == 'lumenlab.page':
            return absu[len(ROOT):] or '/'
        return absu

def clean(src, page_url, links, log=None):
    """도구 글 페이지 HTML → (본문 HTML, 본문 안 h1 글자)."""
    m = re.search(r'<main\b[^>]*>(.*)</main>', src, re.S)
    assert m, f'{page_url}: <main> 없음'
    root = parse(m.group(1))
    gone = lambda e, why: (log.append((why, plain(out(e))[:70])) if log is not None else None, e.drop())
    h1 = [e for e in root.els() if e.tag == 'h1']
    assert len(h1) == 1, f'{page_url}: h1 이 {len(h1)}개'
    title_html = ''.join(out(k) for k in h1[0].kids).strip()
    h1[0].drop()
    for e in list(root.els()):
        if not attached(e): continue                              # 이미 빠진 칸 안
        c = e.cls()
        if e.tag in ('script', 'noscript', 'style', 'template'): gone(e, 'script')
        elif (c & AD_CLS) or e.get('data-ad') is not None or e.get('data-ad-wrap') is not None: gone(e, 'ad')
        elif e.tag in ('nav', 'p', 'div') and (c & {'crumbs', 'crumb'} or (e.tag == 'nav' and (e.get('aria-label') or '').lower() in ('breadcrumb', '현재 위치', '위치'))): gone(e, 'crumb')
        elif e.tag == 'p' and (c & DATE_CLS or ({'muted', 'small'} <= c)) and len(plain(out(e))) < 90: gone(e, 'date')
        elif e.tag == 'p' and e.kids and all(isinstance(k, str) and not k.strip() or isinstance(k, El) and k.tag == 'time' for k in e.kids): gone(e, 'date')
        elif e.tag == 'time' and e.up.tag in ('#root', 'article', 'div', 'section') and not (e.up.cls() & KEEP_BOX) : gone(e, 'date')
    # 링크만 모은 칸(다른 글·도구 목록): h2 와 목록뿐이고 링크가 모두 사이트 안(도구·가이드)인 section/div
    def nav_only(e):
        if e.tag not in ('section', 'div', 'aside') or e.cls() & KEEP_BOX: return False
        kids = [k for k in e.kids if isinstance(k, El)]
        if not kids or not any(k.tag in ('ul', 'ol') for k in kids): return False
        if any(k.tag not in ('h2', 'h3', 'ul', 'ol', 'p') for k in kids): return False
        a = [x for x in e.els() if x.tag == 'a']
        if not a: return False
        for x in a:
            h = urljoin(page_url, x.get('href') or '')
            if not re.match(r'https://([a-z0-9-]+\.)?lumenlab\.page/', h): return False
        ps = [k for k in kids if k.tag == 'p']
        return all(len(plain(out(p))) < 60 for p in ps)
    for e in list(root.els()):
        if attached(e) and nav_only(e): gone(e, 'nav-list')
    # 감싸기만 하는 칸을 벗긴다(안쪽부터)
    for e in reversed(list(root.els())):
        if e.tag in ('article', 'main', 'header') or (e.tag in ('div', 'section') and e.cls() and e.cls() <= WRAP_CLS and not e.get('id')):
            e.unwrap()
    # 빈 칸 지우기
    for e in reversed(list(root.els())):
        if e.tag in ('div', 'section', 'p', 'aside') and not plain(out(e)) and not any(x.tag in ('img', 'svg', 'table', 'video', 'canvas') for x in e.els()):
            e.drop()
    # 표는 옆으로 밀리게 감싼다(도구에 감싼 칸이 없던 표만)
    for t in [e for e in root.els() if e.tag == 'table']:
        p = t.up
        if not (p.tag == 'div' and p.cls() & {'tbl', 'tbl-wrap'}):
            w = El('div', '<div class="tbl">', [('class', 'tbl')], p); i = p.kids.index(t)
            p.kids[i] = w; w.kids = [t]; t.up = w
    # 링크·그림 주소
    for e in root.els():
        if e.tag == 'a' and e.get('href') is not None:
            new = links.fix(e.get('href'), page_url)
            if new != e.get('href'): e.set('href', new)
            if 'btn' in e.cls(): e.set('class', 'btn btn--lamp')
        for k in ('src', 'poster'):
            if e.get(k) and not e.get(k).startswith(('data:', 'http')): e.set(k, urljoin(page_url, e.get(k)))
    return out(root).strip(), title_html


# ---------- 글 ----------
KO = {
    'crumb': '가이드', 'crumb_label': '위치', 'open': '열기', 'tool_open': '도구 열기',
    'checked': '마지막 확인', 'by': '루멘랩',
    'more': lambda n: f'{n} 가이드 더 보기', 'all': '가이드 전부 보기',
    'fix': f'글에 틀린 곳이 있거나 바뀐 기준을 아시면 <a href="mailto:{BI.MAIL}">{BI.MAIL}</a>로 알려 주세요. 확인해서 고치고, 고친 날을 이 글에 적어요.',
    'title': lambda t, n: t if ' | ' in t else f'{t} | {n}',
    'g_title': '루멘랩 가이드: 웹 도구 11개의 계산 기준과 쓰는 법 · Lumen Lab',
    'g_desc': lambda n: f'며칠 계산기, 떼고얼마, 인플레이스, 오래QR, 한장달력 등 루멘랩 웹 도구 11개의 계산 기준과 쓰는 법을 정리한 글 {n}편. 글마다 출처와 마지막으로 확인한 날을 적어요.',
    'g_kicker': '가이드',
    'g_h1': '도구를 쓰다 막히는 곳, <span class="nw">기준과 출처까지 풀어 썼어요</span>',
    'g_lead': lambda n, t: f'루멘랩 웹 도구 {t}개의 계산 기준과 쓰는 법을 글 {n}편에 모았어요. 숫자는 법령과 공식 문서, 직접 돌려 본 결과에서 가져오고, 글마다 출처와 마지막으로 확인한 날을 적어요.',
    'g_jump': '도구별 가이드', 'g_count': lambda n: f'{n}편',
    'rss_t': '루멘랩 가이드', 'rss_d': '루멘랩 웹 도구의 계산 기준과 쓰는 법을 정리한 글',
}
EN = {
    'crumb': 'Guides', 'crumb_label': 'Breadcrumb', 'open': 'Open', 'tool_open': 'Open the tool',
    'checked': 'Last checked', 'by': 'Lumen Lab',
    'more': lambda n: f'More {n} guides', 'all': 'All guides',
    'fix': f'Found a mistake, or a rule that has changed? Email <a href="mailto:{BI.MAIL}">{BI.MAIL}</a>. We check it, fix it and put the new date on this guide.',
    'title': lambda t, n: t if ' | ' in t else f'{t} | {n}',
    'g_title': 'Guides: how the 11 Lumen Lab web tools work · Lumen Lab',
    'g_desc': lambda n: f'{n} guides for the Lumen Lab web tools, from Daycount and Inplace to Staycode and Onesheet: the rules behind each result and how to use them, with sources and the date each was last checked.',
    'g_kicker': 'Guides',
    'g_h1': 'Where the tools get tricky, <span class="nw">explained with sources</span>',
    'g_lead': lambda n, t: f'{n} guides on how the {t} Lumen Lab web tools calculate and how to use them. Numbers come from laws, official documents and runs we did ourselves, and every guide lists its sources and the date it was last checked.',
    'g_jump': 'Guides by tool', 'g_count': lambda n: f'{n}',
}

def fdate(d, lang): return BI.fdate(d, lang)

def doc_title(src):
    t = re.search(r'<title>(.*?)</title>', src, re.S)
    return H.unescape(t.group(1)).strip() if t else ''

def pair_of(src, lang):
    """도구 글이 hreflang 으로 이어 둔 다른 언어 글의 도구 주소(없으면 None)."""
    other = 'en' if lang == 'ko' else 'ko'
    m = re.search(rf'<link rel="alternate" hreflang="{other}" href="([^"]+)"', src)
    return m.group(1) if m else None

def tool_card(it, lang, T, cls):
    home = BI.tool_pages(it, lang)['home']
    return (f'<a class="{cls}" href="{esc(home)}"><img src="{it["icon"]}" width="44" height="44" alt="">'
            f'<span class="{cls}-t"><b>{esc(it["name"][lang])}</b><span>{esc(it["what"][lang])}</span></span>'
            f'<span class="{cls}-go">{T["open"]} <span aria-hidden="true">↗</span></span></a>')

def books(items, lang, skip=None):
    rows = ''.join(f'<li><a href="{root_path(a["it"], lang, a["slug"])}"><b>{esc(a["title"])}</b><span>{esc(a["desc"])}</span></a></li>'
                   for a in items if a['slug'] != skip)
    return f'<ol class="gbooks">{rows}</ol>'

def color(it, SC):
    import build_store
    c = SC['tools'][it['id']]['color']
    return f'--tc:{c};--tcp:{build_store.text_mix(c)}%'


def build(site, cat, ko_src, en_src, SC):
    """/guides/·/en/guides/ 와 글 104편, /guides/rss.xml 을 쓰고 (사이트맵 주소 목록, 주소 → 짝·lastmod) 를 돌려준다."""
    found = find(site, cat); links = Links(found)
    tools = [it for g in cat['groups'] for it in cat['tools'] if it['group'] == g['id']]
    by = {(a['it']['id'], a['lang']): [] for a in found}
    for a in found: by[(a['it']['id'], a['lang'])].append(a)
    by_src = {a['src_url']: a for a in found}
    for d in ('guides', 'en/guides'):
        if os.path.isdir(os.path.join(site, d)): shutil.rmtree(os.path.join(site, d))
    org = {'@type': 'Organization', 'name': 'Lumen Lab', 'alternateName': '루멘랩', 'url': ROOT + '/', 'email': BI.MAIL}
    meta, paths, rss = {}, [], []
    for a in found:
        it, lang, T = a['it'], a['lang'], (KO if a['lang'] == 'ko' else EN)
        src = open(a['file'], encoding='utf-8').read()
        log = []
        body, h1 = clean(src, a['src_url'], links, log)
        path = root_path(it, lang, a['slug'])
        p = pair_of(src, lang); pa = by_src.get(p) if p else None
        alt = {lang: path, pa['lang']: root_path(pa['it'], pa['lang'], pa['slug'])} if pa else False
        lib = '/guides/' if lang == 'ko' else '/en/guides/'
        other = alt[('en' if lang == 'ko' else 'ko')] if alt else ('/en/guides/' if lang == 'ko' else '/guides/')
        name = it['name'][lang]
        crumb = (f'<nav class="gd__crumb" aria-label="{T["crumb_label"]}"><a href="{lib}">{T["crumb"]}</a><span aria-hidden="true">›</span>'
                 f'<a href="{root_path(it, lang)}">{esc(name)}</a></nav>')
        main = f'''<div class="wrap gd">
{crumb}
<article class="gd__doc" style="{color(it, SC)}">
  <header class="gd__head">
    <h1 class="gd__title">{h1}</h1>
    <p class="gd__meta">{T['by']} · {T['checked']} <time datetime="{a['mod']}">{fdate(a['mod'], lang)}</time></p>
    {tool_card(it, lang, T, 'gd__tool')}
  </header>
  <div class="gd__body">
{body}
  </div>
  <p class="gd__fix">{T['fix']}</p>
</article>
<aside class="gd__more" aria-labelledby="gd-more" style="{color(it, SC)}">
  <h2 id="gd-more">{T['more'](esc(name))}</h2>
  {books(by[(it['id'], lang)], lang, skip=a['slug'])}
  <p class="gd__all"><a href="{lib}">{T['all']} <span aria-hidden="true">→</span></a></p>
</aside>
</div>'''
        title = T['title'](doc_title(src) or plain(h1), name)
        ld = {'@context': 'https://schema.org', '@graph': [
            {'@type': 'Article', 'headline': plain(h1), 'description': a['desc'], 'inLanguage': lang, 'datePublished': a['pub'], 'dateModified': a['mod'],
             'mainEntityOfPage': ROOT + path, 'image': ROOT + '/og.png', 'author': org, 'publisher': org,
             'about': {'@type': 'WebApplication', 'name': name, 'url': BI.tool_pages(it, lang)['home'], 'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Web'}},
            {'@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': T['crumb'], 'item': ROOT + lib},
                {'@type': 'ListItem', 'position': 2, 'name': name, 'item': ROOT + lib + '#' + host_of(it)},
                {'@type': 'ListItem', 'position': 3, 'name': plain(h1), 'item': ROOT + path}]}]}
        html = BI.page(lang, path, title, a['desc'], main, ko_src if lang == 'ko' else en_src, 'article', ld, '',
                       css=['/assets/site.css', '/assets/guides.css'], alt=alt, other=other, extra=ADS)
        nav = f'<a class="nav-guides" href="{lib}"'
        assert nav in html, f'{path}: 머리말 가이드 링크가 없음'
        html = html.replace(nav, nav + ' aria-current="true"', 1)
        d = os.path.join(site, path.strip('/')); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w').write(html)
        paths.append(path); meta[path] = {'alt': alt, 'lastmod': a['mod']}
        if lang == 'ko': rss.append((a, body, path))
    # 모음 /guides/ ↔ /en/guides/
    for lang, src in (('ko', ko_src), ('en', en_src)):
        T = KO if lang == 'ko' else EN; lib = '/guides/' if lang == 'ko' else '/en/guides/'
        n = sum(len(by[(it['id'], lang)]) for it in tools)
        jump = ''.join(f'<a href="#{host_of(it)}"><img src="{it["icon"]}" width="24" height="24" alt=""><span>{esc(it["name"][lang])}</span><b>{T["g_count"](len(by[(it["id"], lang)]))}</b></a>' for it in tools)
        groups = []
        for g in cat['groups']:
            secs = []
            for it in [t for t in tools if t['group'] == g['id']]:
                h = host_of(it)
                secs.append(f'''  <section class="gshelf" id="{h}" aria-labelledby="gs-{h}" style="{color(it, SC)}">
    <header class="gshelf__head"><img src="{it['icon']}" width="56" height="56" alt=""><div><h3 id="gs-{h}">{esc(it['name'][lang])}</h3><p>{esc(it['line'][lang])}</p></div>
      <a class="gshelf__open" href="{esc(BI.tool_pages(it, lang)['home'])}">{T['tool_open']} <span aria-hidden="true">↗</span></a></header>
    {books(by[(it['id'], lang)], lang)}
  </section>''')
            groups.append(f'<section class="ggroup" aria-labelledby="gg-{g["id"]}">\n  <h2 class="ggroup__h" id="gg-{g["id"]}">{esc(g["name"][lang])}</h2>\n' + '\n'.join(secs) + '\n</section>')
        main = (f'''<header class="ihead ghead">
  <div class="wrap ihead__in ihead__in--wide">
    <p class="ihead__kicker">{T['g_kicker']}</p>
    <h1 class="ihead__title">{T['g_h1']}</h1>
    <p class="ihead__lead">{T['g_lead'](n, len(tools))}</p>
    <nav class="gjump" aria-label="{T['g_jump']}">{jump}</nav>
  </div>
</header>
<div class="wrap glib">
''' + '\n'.join(groups) + '\n</div>')
        ld = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': plain(T['g_h1']), 'url': ROOT + lib, 'inLanguage': lang, 'publisher': org,
              'mainEntity': {'@type': 'ItemList', 'numberOfItems': n, 'itemListElement': [
                  {'@type': 'ListItem', 'position': i + 1, 'url': ROOT + root_path(a['it'], lang, a['slug']), 'name': a['title']}
                  for i, a in enumerate([a for it in tools for a in by[(it['id'], lang)]])]}}
        # 옛 '바로 써 보기' 링크(/guides/#try-…, PR #9 때 모음에 있던 소개 창)는 홈의 같은 창으로
        home = '/' if lang == 'ko' else '/en/'
        js = f'<script>if(/^#(try|t)-/.test(location.hash))location.replace("{home}"+location.hash)</script>\n'
        html = BI.page(lang, lib, T['g_title'], T['g_desc'](n), main, src, 'website', ld, js, css=['/assets/site.css', '/assets/info.css', '/assets/guides.css'])
        d = os.path.join(site, lib.strip('/')); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w').write(html)
        meta[lib] = {'alt': {'ko': '/guides/', 'en': '/en/guides/'}, 'lastmod': max(a['mod'] for a in found if a['lang'] == lang)}
    paths = ['/guides/', '/en/guides/'] + paths
    # RSS(한국어 글, 네이버 서치어드바이저 제출용): 고친 날 새것부터, 본문 전체
    from email.utils import format_datetime
    import datetime
    def rfc(d): return format_datetime(datetime.datetime(*map(int, d.split('-')), 9, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=9))))
    absolute = lambda h: re.sub(r'(\s(?:href|src|poster))="/(?!/)', rf'\1="{ROOT}/', h)      # 피드 읽개는 사이트 밖에서 읽으니 주소를 다 붙인다
    items = []
    for a, body, path in sorted(rss, key=lambda x: (x[0]['mod'], x[0]['pub']), reverse=True):
        items.append(f'<item><title>{esc(a["title"])}</title><link>{ROOT}{path}</link><guid isPermaLink="true">{ROOT}{path}</guid>'
                     f'<description>{esc(a["desc"])}</description><pubDate>{rfc(a["mod"])}</pubDate><category>{esc(a["it"]["name"]["ko"])}</category>'
                     f'<content:encoded><![CDATA[{absolute(body).replace("]]>", "]]&gt;")}]]></content:encoded></item>')
    feed = (f'<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n<channel>'
            f'<title>{KO["rss_t"]}</title><link>{ROOT}/guides/</link><description>{KO["rss_d"]}</description><language>ko</language>\n'
            + '\n'.join(items) + '\n</channel></rss>\n')
    open(os.path.join(site, 'guides', 'rss.xml'), 'w').write(feed)
    ko_n = sum(1 for a in found if a['lang'] == 'ko'); paired = sum(1 for p in meta if meta[p]['alt']) - 2
    print(f'가이드: 한국어 {ko_n}편, 영어 {len(found) - ko_n}편, 한·영 짝으로 이은 글 {paired}편 + 모음 두 쪽 + rss')
    return paths, meta
