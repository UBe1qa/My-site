#!/usr/bin/env python3
"""만든 HTML 정적 검사: python3 -B salary/_dev/check.py   (표준 라이브러리만. node 가 있어야 한다: ctx.py 가 calc.mjs 를 돌린다)

보는 것: 페이지마다 title·description 다름 / canonical = sitemap 주소 = 내부 링크 주소(끝 /까지), 깨진 내부 링크·#해시 0 /
쪽 안 id 겹침 0, # 링크의 목적지가 뜻한 구역(#basis = '계산 기준' 구역, #main = 본문)인지 /
hreflang 짝·자기 자신·x-default(영어) / <html lang> / 영어 페이지의 lang="ko" 밖 한글 0 / Article·WebApplication JSON-LD 가 화면 글자와 같음 /
방침의 웹 비콘 문장·partner-sites 링크·방문 통계(Cloudflare Web Analytics, 브라우저 종류·성능 정보)·저장 키(localStorage tk.lang, sessionStorage tk.in) /
출처 링크는 새 탭(target=_blank rel=noopener) / 광고 없는 페이지에 adsbygoogle 없음, 계산기·표·글 페이지엔 있음 /
첫 HTML에 제목·본문·내부 링크 / 공개 페이지에 noindex 없음 / .html 링크 없음 / 화면 글에 줄표(—) 없음 /
돈·법 사실: 출처 링크와 확인한 날이 화면에 있음, 인용문이 원문 그대로(확인된 사실 파일이 있으면 대조), 확인 못 한 것(외국인 단일세율 등)이 없음,
2027년 확정·의결·미정 표시, texts.py·articles.py 에 손으로 적은 숫자가 없음.
"""
import ast
import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

sys.dont_write_bytecode = True
import chars  # noqa: E402
import ctx  # noqa: E402
from ctx import D, S, Q, CHECKED, href, date_ko, date_en  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://salary.lumenlab.page'
NO_ADS = ('/about/', '/privacy/', '/guide/', '/en/about/', '/en/privacy/', '/en/guide/')
TOOLS = ('/', '/severance/', '/hourly/', '/unemployment/', '/annual-leave/', '/en/', '/en/severance/', '/en/hourly/')
VERIFIED = Path('/home/claude/sp/briefs/verified-salary.md')   # 저장소 밖(작업 공간)에만 있다. 없으면 그 대조는 건너뛴다
HANGUL = re.compile(r'[ᄀ-ᇿ㄰-㆏가-힣]')
fails, passed, notes = [], 0, []


def ok(cond, msg):
    global passed
    if cond:
        passed += 1
    else:
        fails.append(msg)


class Doc(HTMLParser):
    VOID = {'meta', 'link', 'br', 'img', 'input', 'hr', 'source', 'path', 'rect', 'line'}

    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.lang = None; self.title = ''; self.desc = None; self.canon = None; self.alts = {}; self.links = []; self.ids = set()
        self.idn = {}; self.idinfo = {}; self.blank = {}; self.jsons = {}; self.cfg = {}; self._jid = None; self._h2 = None
        self.ld = []; self.h1 = ''; self.robots = None; self.scripts = []; self.visible = []; self.hangul_out = []; self.quotes = []
        self.stack = []
        self._cap = None; self._buf = ''; self._skip = 0; self.ads = 0; self._bq = None
        self.feed(text)

    def in_ko(self):
        return any(k for _, k, _ in self.stack)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html':
            self.lang = a.get('lang')
        if 'id' in a:
            self.ids.add(a['id'])
            self.idn[a['id']] = self.idn.get(a['id'], 0) + 1
            self.idinfo.setdefault(a['id'], {'tag': tag, 'h': ''})   # 같은 id 가 둘이면 브라우저처럼 앞의 것이 목적지다
        if tag == 'h2':
            self._h2 = {'ids': ([a['id']] if 'id' in a else []) + [i for t, _, i in self.stack if t == 'section' and i][-1:], 'buf': ''}
        if tag == 'meta' and a.get('name') == 'description':
            self.desc = a.get('content')
        if tag == 'meta' and a.get('name') == 'robots':
            self.robots = a.get('content')
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canon = a.get('href')
        if tag == 'link' and a.get('rel') == 'alternate' and a.get('hreflang'):
            self.alts[a['hreflang']] = a.get('href')
        if tag == 'a' and a.get('href') is not None:
            self.links.append((a['href'], a.get('lang')))
            self.blank[a['href']] = self.blank.get(a['href'], True) and a.get('target') == '_blank' and 'noopener' in (a.get('rel') or '').split()
        if tag == 'script':
            self.scripts.append(a.get('src') or '')
            if a.get('type') in ('application/ld+json', 'application/json'):
                self._cap = ('ld' if a.get('type') == 'application/ld+json' else 'json'); self._buf = ''; self._jid = a.get('id')
            else:
                self._skip += 1
        if tag in ('style', 'template'):
            self._skip += 1
        if 'data-ad' in a:
            self.ads += 1
        if tag in ('title', 'h1') and self._cap is None:
            self._cap = tag; self._buf = ''
        if tag == 'blockquote':
            self._bq = ''
        if tag == 'cite' and self._bq is not None:
            self.quotes.append(self._bq.strip()); self._bq = None
        if tag not in self.VOID:
            self.stack.append((tag, a.get('lang') == 'ko', a.get('id')))
        for k in ('placeholder', 'aria-label', 'content', 'title', 'alt', 'data-open', 'data-close', 'data-on', 'data-off', 'data-l'):
            v = a.get(k)
            if v and HANGUL.search(v) and not (a.get('lang') == 'ko' or self.in_ko()):
                self.hangul_out.append(f'{tag}@{k}: {v[:30]}')

    def handle_endtag(self, tag):
        if tag == 'script' and self._cap in ('ld', 'json'):
            if self._cap == 'ld':
                self.ld.append(json.loads(self._buf))
            else:
                self.jsons[self._jid] = json.loads(self._buf)
                if self._jid == 'tk':
                    self.cfg = self.jsons['tk']
            self._cap = None
        elif tag in ('script', 'style', 'template'):
            self._skip = max(0, self._skip - 1)
        if tag == 'h2' and self._h2:
            for i in self._h2['ids']:
                if not self.idinfo[i]['h']:
                    self.idinfo[i]['h'] = re.sub(r'\s+', ' ', self._h2['buf']).strip()
            self._h2 = None
        if tag == 'title' and self._cap == 'title':
            self.title = self._buf.strip(); self._cap = None
        if tag == 'h1' and self._cap == 'h1':
            self.h1 = re.sub(r'\s+', ' ', self._buf).strip(); self._cap = None
        if tag == 'blockquote' and self._bq is not None:
            self.quotes.append(self._bq.strip()); self._bq = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self._cap:
            self._buf += data
        if self._cap in ('ld', 'json') or self._skip:
            return
        if self._bq is not None:
            self._bq += data
        if self._h2:
            self._h2['buf'] += data
        self.visible.append(data)
        if HANGUL.search(data) and not self.in_ko():
            self.hangul_out.append(data.strip()[:30])


# # 링크가 가야 할 곳: 이름표(id)마다 '어떤 요소여야 하고 제목에 무슨 말이 있어야 하는지'. 여기 없는 이름표로 가는 링크는 실패(새로 만들면 여기 적는다)
PLACES = {
    'main': (('main',), ()),
    'basis': (('section', 'h2'), ('계산 기준', 'Rules and sources', 'full table of rules')),
}


def right_place(doc, frag):
    info, rule = doc.idinfo.get(frag), PLACES.get(frag)
    if not info or not rule:
        return False
    return info['tag'] in rule[0] and (not rule[1] or any(w in info['h'] for w in rule[1]))


def typed_numbers():
    """texts.py·articles.py 의 글자(문자열 상수) 가운데 손으로 적은 숫자를 찾는다. f-string 의 {…} 안(자료에서 꺼낸 값)은 보지 않는다."""
    allow = re.compile(r'제\d+조(?:의\d+)?|제\d+항|제\d+호|별표 \d|Table \d|Article \d+(?:\(\d+\))?|3/12|365 ÷ 7 ÷ 12|÷ 1[23]\b|\b1[23](?:으로|로)|by 1[23]\b|100%|\b1350\b|License 1\.1|\d+월 \d+일|&#?\w+;')
    bad = []
    for name in ('texts.py', 'articles.py'):
        tree = ast.parse((ROOT / '_dev' / name).read_text(encoding='utf-8'))
        parts = []
        for node in ast.walk(tree):
            if isinstance(node, ast.JoinedStr):       # f-string: {…} 밖의 글자만
                parts += [v.value for v in node.values if isinstance(v, ast.Constant) and isinstance(v.value, str)]
        inside = {id(v) for n in ast.walk(tree) if isinstance(n, ast.JoinedStr) for v in ast.walk(n)}
        for node in ast.walk(tree):                    # 보통 문자열: 문장(띄어쓰기나 한글이 든 것)만. 이름표·주소·열쇠말은 뺀다
            if isinstance(node, ast.Constant) and isinstance(node.value, str) and id(node) not in inside and (' ' in node.value or HANGUL.search(node.value)) and not node.value.lstrip().startswith(('화면 글', '가이드 글', '3,130,000')):
                parts.append(node.value)
        for raw_text in parts:
            t = re.sub(r'<[^>]*>', ' ', raw_text)       # 태그·속성(스타일의 px 등)은 뺀다
            t = re.sub(r'style="[^"]*"?|[\w-]+:\s*[\w.%-]+px', ' ', t)
            t = allow.sub(' ', t)
            for m in re.finditer(r'\d[\d,.]*\d|\d+%', t):
                bad.append(f'{name}: "{m.group(0)}" (…{t[max(0, m.start() - 18):m.end() + 12].strip()}…)')
    return bad


def main():
    global SRC_URLS
    SRC_URLS = {href(x['url']) for x in S.values()}
    sm = [u.text for u in ET.parse(ROOT / 'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    paths = [u[len(SITE):] for u in sm]
    ok(len(paths) == len(set(paths)), 'sitemap에 같은 주소가 두 번')
    docs, raw = {}, {}
    for p in paths:
        f = ROOT / p.lstrip('/') / 'index.html'
        ok(f.exists(), f'sitemap 주소에 파일이 없음: {p}')
        if f.exists():
            raw[p] = f.read_text(encoding='utf-8')
            docs[p] = Doc(raw[p])
    built = set()
    for f in ROOT.rglob('index.html'):
        if '_dev' in f.parts or 'tests' in f.parts:
            continue
        rel = str(f.parent.relative_to(ROOT))
        built.add('/' if rel == '.' else '/' + rel + '/')
    ok(built == set(paths), f'sitemap과 만든 페이지가 다름: {sorted(built ^ set(paths))}')
    vis = {p: re.sub(r'\s+', ' ', ''.join(d.visible)) for p, d in docs.items()}
    hrefs = {p: {h for h, _ in d.links} for p, d in docs.items()}

    titles, descs = {}, {}
    for p, d in docs.items():
        en = p.startswith('/en/')
        ok(d.lang == ('en' if en else 'ko'), f'{p}: <html lang>={d.lang}')
        ok(bool(d.title) and bool(d.desc) and bool(d.h1), f'{p}: title·description·h1 가운데 빈 것')
        ok(d.title not in titles, f'{p}: title이 {titles.get(d.title)}와 같음'); titles[d.title] = p
        ok(d.desc not in descs, f'{p}: description이 {descs.get(d.desc)}와 같음'); descs[d.desc] = p
        ok(len(d.title) <= 75, f'{p}: title이 너무 김({len(d.title)}자)')
        ok(40 <= len(d.desc) <= 220, f'{p}: description 길이 {len(d.desc)}')
        ok(d.canon == SITE + p, f'{p}: canonical={d.canon}')
        ok(d.robots is None, f'{p}: 공개 페이지에 robots 메타({d.robots})')
        ok(len(vis[p]) > 400, f'{p}: 첫 HTML 본문이 너무 짧음')
        internal = [h for h, _ in d.links if h.startswith('/')]
        ok(len(internal) >= 8, f'{p}: 첫 HTML 내부 링크가 적음({len(internal)})')
        lumen = 'https://lumenlab.page/en/' if en else 'https://lumenlab.page/'
        ok(lumen in hrefs[p] and ('https://lumenlab.page/' if en else 'https://lumenlab.page/en/') not in {h for h in hrefs[p] if h.startswith('https://lumenlab.page')} - {lumen}, f'{p}: 루멘랩 링크가 같은 언어 본페이지가 아님')
        dup = sorted(i for i, n in d.idn.items() if n > 1)
        ok(not dup, f'{p}: 같은 id 가 두 번 {dup}')
        for h, lang in d.links:
            if h.startswith('#'):
                ok(h[1:] in d.ids, f'{p}: 없는 #해시 {h}')
                ok(right_place(d, h[1:]), f'{p}: {h} 의 목적지가 뜻한 구역이 아님 {d.idinfo.get(h[1:])}')
            elif h.startswith('/assets/'):
                ok((ROOT / h.lstrip('/')).is_file(), f'{p}: 없는 파일로 가는 링크 {h}')
            elif h.startswith('/'):
                path, _, frag = h.partition('#')
                ok('.html' not in path, f'{p}: .html 링크 {h}')
                ok(path in docs, f'{p}: 깨진 내부 링크 {h}')
                if frag and path in docs and not frag.startswith('a='):
                    ok(frag in docs[path].ids, f'{p}: 없는 #해시 {h}')
                    ok(right_place(docs[path], frag), f'{p}: {h} 의 목적지가 뜻한 구역이 아님 {docs[path].idinfo.get(frag)}')
                if en and not path.startswith('/en/'):
                    ok(lang == 'ko', f'{p}: 한국어 페이지로 가는 링크에 lang="ko" 없음 {h}')
        # hreflang: 짝이 있는 페이지만, 자기 자신 포함, x-default 는 영어
        if d.alts:
            ok(set(d.alts) == {'en', 'ko', 'x-default'}, f'{p}: hreflang 묶음 {sorted(d.alts)}')
            ok(d.alts.get('en' if en else 'ko') == SITE + p, f'{p}: hreflang에 자기 자신이 없음')
            ok(d.alts.get('x-default') == d.alts.get('en'), f'{p}: x-default가 영어판이 아님')
            other = (d.alts.get('ko' if en else 'en') or '')[len(SITE):]
            ok(other in docs and docs[other].alts.get('en' if en else 'ko') == SITE + p, f'{p}: hreflang 짝({other})이 되돌아오지 않음')
            ok(d.cfg.get('other') == other, f'{p}: 언어 링크({d.cfg.get("other")})가 hreflang 짝({other})과 다름')
        else:
            ok(d.cfg.get('other') in ('/', '/en/'), f'{p}: 짝 없는 페이지의 언어 링크는 다른 언어 첫 화면이어야 함')
        if en:
            ok(not d.hangul_out, f'{p}: lang="ko" 밖 한글 {d.hangul_out[:3]}')
        has_ads = any('adsbygoogle' in s for s in d.scripts)
        if p in NO_ADS:
            ok(not has_ads and d.ads == 0, f'{p}: 광고 없는 페이지에 광고 코드')
        else:
            ok(has_ads and d.ads >= 2, f'{p}: 광고 코드·자리({d.ads})가 없음')
        ok(any('ads-config.js' in s for s in d.scripts) == has_ads, f'{p}: ads-config.js와 광고 코드가 짝이 안 맞음')
        types = [j.get('@type') for j in d.ld]
        if '/guide/' in p and not p.endswith('/guide/'):
            art = [j for j in d.ld if j.get('@type') == 'Article']
            ok(bool(art) and art[0]['headline'] == d.h1 and art[0]['description'] == d.desc and art[0]['mainEntityOfPage'] == SITE + p, f'{p}: Article JSON-LD가 화면과 다름')
            ok('BreadcrumbList' in types, f'{p}: BreadcrumbList 없음')
            ok(('마지막 확인 ' if not en else 'Last checked ') + art[0]['dateModified'] in vis[p], f'{p}: 마지막 확인 날짜가 dateModified 와 다름')
        elif p in TOOLS:
            app = [j for j in d.ld if j.get('@type') == 'WebApplication']
            ok(bool(app) and app[0]['url'] == SITE + p and app[0]['description'] == d.desc and app[0]['name'] == d.h1, f'{p}: WebApplication 이 화면과 다름')
        ok(not re.search(r'"(aggregateRating|review|reviewRating)"\s*:', json.dumps(d.ld)), f'{p}: 없는 평점·후기')
        ok('FAQPage' not in types, f'{p}: 화면에 FAQ가 없는데 FAQPage')
        ok('—' not in vis[p], f'{p}: 화면 글에 줄표(—)')
        ok(raw[p].count('class="ad-in"') == raw[p].count('data-ad='), f'{p}: 광고 자리에 .ad-in 틀이 없음')
        body_html = re.sub(r'<script type="application/json"[\s\S]*?</script>', '', raw[p])   # 미리 그려 둔 다음 기준 결과(JSON) 안의 표는 빼고 센다
        ok(body_html.count('<table') == body_html.count('<div class="tbl') + body_html.count('class="cmp-t"') + body_html.count('class="lv"'), f'{p}: 표를 감싼 칸(.tbl)이 표 수와 다름')
        srcs_same_tab = sorted(h for h, b in d.blank.items() if h in SRC_URLS and not b)
        ok(not srcs_same_tab, f'{p}: 출처 링크가 새 탭으로 열리지 않음 {srcs_same_tab[:2]}')

    # 짝: 같은 역할만
    for p in ('/unemployment/', '/annual-leave/'):
        ok(not docs[p].alts, f'{p}: 짝이 없는 페이지에 hreflang')
    pairs = [(p, docs[p].alts['en'][len(SITE):]) for p in docs if not p.startswith('/en/') and docs[p].alts]
    ok(sorted(pairs) == sorted([('/', '/en/'), ('/table/', '/en/table/'), ('/severance/', '/en/severance/'), ('/hourly/', '/en/hourly/'), ('/guide/', '/en/guide/'),
                                 ('/about/', '/en/about/'), ('/privacy/', '/en/privacy/'), ('/guide/toejikgeum-gyesan-yeje/', '/en/guide/severance-pay-korea/')]), f'hreflang 짝 목록이 다름: {pairs}')

    # 방침
    js = (ROOT / 'assets' / 'app.js').read_text(encoding='utf-8')
    keys = set(re.findall(r"store\('([\w.]+)'", js))
    ok(keys == {'tk.lang'} and js.count('localStorage.') == 2, f'app.js 가 쓰는 localStorage 키가 방침과 다름: {sorted(keys)}')
    skeys = set(re.findall(r"SKEY = '([\w.]+)'", js))
    ok(skeys == {'tk.in'} and set(re.findall(r'sessionStorage\.\w+\(([\w.\']+)', js)) == {'SKEY'}, f'app.js 가 쓰는 sessionStorage 키가 방침과 다름: {sorted(skeys)}')
    ok('document.cookie' not in js and 'indexedDB' not in js and 'caches.' not in js, 'app.js 가 방침에 없는 저장소를 씀')
    for f in ('pay-view.js', 'pay-core.js', 'pay-data.js', 'ads-config.js'):
        t = (ROOT / 'assets' / f).read_text(encoding='utf-8')
        ok(not re.search(r'localStorage|sessionStorage|document\.cookie|indexedDB', t), f'{f}: 방침에 없는 저장소를 씀')
    for f in ('app.js', 'pay-view.js', 'pay-core.js', 'pay-data.js'):
        t = (ROOT / 'assets' / f).read_text(encoding='utf-8')
        ok(not re.search(r'\bfetch\(|XMLHttpRequest|sendBeacon|new WebSocket', t), f'{f}: 입력을 밖으로 보낼 수 있는 코드')
    for p, word in (('/en/privacy/', 'web beacons'), ('/privacy/', '웹 비콘')):
        ok(word in vis[p] and any(h.startswith('https://policies.google.com/technologies/partner-sites') for h in hrefs[p]), f'{p}: 웹 비콘 문장·partner-sites 링크')
        ok('tk.lang' in vis[p] and 'localStorage' in vis[p], f'{p}: 저장 항목 tk.lang 이 방침에 없음')
        ok('tk.in' in vis[p] and 'sessionStorage' in vis[p] and ('이 탭을 닫으면 사라져요' in vis[p] or 'gone when you close the tab' in vis[p]), f'{p}: 입력 유지(sessionStorage tk.in)와 "탭을 닫으면 사라진다"가 방침에 없음')
        ok('Cloudflare Web Analytics' in vis[p] and 'https://www.cloudflare.com/web-analytics/' in hrefs[p], f'{p}: Cloudflare Web Analytics 문장·링크')
        ok(('브라우저 종류' in vis[p] and '성능 정보' in vis[p]) or ('kind of browser' in vis[p] and 'performance data' in vis[p]), f'{p}: 방문 통계 문장에 브라우저 종류·성능 정보가 없음')
        ok('woxocoso@gmail.com' in vis[p] and 'https://www.google.com/settings/ads' in hrefs[p], f'{p}: 문의 메일·광고 설정 링크')
    for p in docs:
        bad = re.search(r'입력[^.]{0,12}저장(하지|되지) 않|(?<!그 밖에는 )저장하지 않아요|(?<!else )is (not|never) (stored|saved)|분석 도구[를는은]? ?(쓰지|사용하지|없)|통계[를는은]? ?(모으지|수집하지) 않|추적하지 않|no analytics|(do not|don\'t|never) (use|run) (any )?analytics|no tracking|(do not|don\'t) track|아무것도 (보내지|전송하지) 않|nothing (is|gets) sent', vis[p], re.I)
        ok(not bad, f'{p}: 방문 통계·전송·저장이 없다는 뜻의 넓은 문장 "{bad.group(0) if bad else ""}"')
    # 404
    nf = (ROOT / '404.html').read_text(encoding='utf-8')
    ok('adsbygoogle' not in nf and 'noindex' in nf and 'href="/"' in nf and 'href="/en/"' in nf, '404: 광고 코드가 없고 noindex, 두 언어 첫 화면 링크')
    nfd = Doc(nf)
    ok(nfd.lang == 'ko' and '찾을 수 없어요' in nfd.title and 'Page not found' in nfd.title and '떼고얼마' in nfd.title and 'Takehome Korea' in nfd.title, f'404: 제목이 두 언어가 아님({nfd.title})')
    ok("document.title=en?" in nf and "h.lang='en'" in nf and '/^\\/en(\\/|$)/' in nf, '404: 주소가 /en/ 이면 제목·언어를 영어로 바꾸는 코드')
    ok(not [i for i, n in nfd.idn.items() if n > 1] and all(h[1:] in nfd.ids for h, _ in nfd.links if h.startswith('#')), '404: id 겹침·없는 #해시')
    # 그 밖의 파일
    ok((ROOT / 'ads.txt').read_text().strip() == 'google.com, pub-9496167591465154, DIRECT, f08c47fec0942fa0', 'ads.txt')
    ok((ROOT / 'googlea614029e84d58498.html').read_text().strip() == 'google-site-verification: googlea614029e84d58498.html', '구글 확인 파일')
    rb = (ROOT / 'robots.txt').read_text()
    ok(f'Sitemap: {SITE}/sitemap.xml' in rb and 'Disallow' not in rb, 'robots.txt: Sitemap 줄이 있고 막는 줄이 없음')
    for f in ('favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og.png', 'og-ko.png', 'wrangler.jsonc', '.assetsignore', '.deploy-actions', 'rss.xml', 'CLAUDE.md'):
        ok((ROOT / f).exists(), f'{f} 없음')
    wr = (ROOT / 'wrangler.jsonc').read_text(encoding='utf-8')
    ok('"name": "salary"' in wr and '"workers_dev": false' in wr and '"pattern": "salary.lumenlab.page", "custom_domain": true' in wr and '"not_found_handling": "404-page"' in wr, 'wrangler.jsonc')
    ig = (ROOT / '.assetsignore').read_text().split()
    ok(all(x in ig for x in ('_dev', 'tests', 'CLAUDE.md', 'wrangler.jsonc', '.assetsignore', '.deploy-actions')), '.assetsignore')
    rss = (ROOT / 'rss.xml').read_text(encoding='utf-8')
    ok(rss.count('<item>') == sum(1 for p in paths if p.startswith('/guide/') and p != '/guide/') >= 4, 'rss.xml 글 수 = 한국어 글 수(4편 이상)')
    ok(sum(1 for p in paths if p.startswith('/en/guide/') and p != '/en/guide/') >= 3, '영어 글 3편 이상')
    for junk in ('node_modules', '__pycache__', '.wrangler'):
        ok(not list(ROOT.rglob(junk)), f'폴더 안에 {junk}가 남아 있음')
    # 글꼴 조각(_dev/font.py): 파일이 있고, 페이지마다 자기 언어의 조각을 먼저 받고, 화면 글자를 전부 담고 있다
    fj = ROOT / '_dev' / 'fonts.json'
    fonts = json.loads(fj.read_text(encoding='utf-8')) if fj.exists() else {}
    fdir = ROOT / 'assets' / 'fonts'
    ok(all(l in fonts and (fdir / fonts[l]['file']).is_file() and (fdir / fonts[l]['file']).stat().st_size == fonts[l]['bytes'] for l in ('ko', 'en')), '조각 글꼴 파일이 있고 크기가 fonts.json 과 같음')
    if fonts:
        fam = fonts['family']
        for path, lang, f in chars.pages():
            t = f.read_text(encoding='utf-8')
            ok(f'<link rel="preload" href="/assets/fonts/{fonts[lang]["file"]}" as="font" type="font/woff2" crossorigin>' in t and f'font-family:"{fam}";src:url(/assets/fonts/{fonts[lang]["file"]})' in t
               and f'font-display:optional;unicode-range:{fonts[lang]["range"]}}}' in t, f'{path}: 자기 언어의 조각 글꼴 preload 와 @font-face({fam}, optional)')
            ok('jsdelivr' not in t and 'pretendard.css' not in t and 'preconnect' not in t, f'{path}: 글꼴 때문에 다른 곳에 접속하지 않는다(jsDelivr·옛 Pretendard CSS 없음)')
        need = chars.screen_chars()
        for l in ('ko', 'en'):
            miss = ''.join(c for c in need[l] if c not in fonts[l]['chars'] and c not in fonts[l].get('not_in_source', ''))
            ok(not miss, f'조각 글꼴({l})에 없는 화면 글자 {len(miss)}자: {miss[:40]} → python3 -B _dev/font.py 를 다시 돌린다(안 돌리면 그 글자만 기기 글꼴로 보인다)')
        junk_fonts = [f.name for f in fdir.glob('*.woff2') if f.name not in (fonts['ko']['file'], fonts['en']['file'])]
        ok(not junk_fonts, f'쓰지 않는 옛 조각 글꼴 파일 {junk_fonts}')
        ofl = (fdir / 'OFL.txt').read_text(encoding='utf-8') if (fdir / 'OFL.txt').exists() else ''
        ok('SIL OPEN FONT LICENSE' in ofl and fam in ofl and 'Reserved Font Name Pretendard' in ofl, '글꼴 라이선스 전문(assets/fonts/OFL.txt)과 이름을 바꿨다는 설명')
        hd = (ROOT / '_headers').read_text(encoding='utf-8') if (ROOT / '_headers').exists() else ''
        ok('/assets/fonts/*' in hd and 'immutable' in hd, '_headers: 글꼴 조각은 오래 저장')
        css = (ROOT / 'assets' / 'style.css').read_text(encoding='utf-8')
        ok(f'--font:"{fam}","Pretendard Variable"' in css and '@import' not in css, 'style.css: 글꼴 이름표 순서(조각 → 기기에 깔린 Pretendard → 기기 글꼴)')
        weights = {int(w) for w in re.findall(r'font-weight:(\d+)', css)}
        ok(weights and min(weights) >= fonts['weights'][0] and max(weights) <= fonts['weights'][1], f'style.css 가 쓰는 굵기 {sorted(weights)} 가 조각의 범위 {fonts["weights"]} 안')
        ok('글꼴은 이 사이트에서 함께 받아요' in vis['/privacy/'] and 'served from this site' in vis['/en/privacy/'] and 'jsDelivr' not in vis['/privacy/'] + vis['/en/privacy/'], '방침의 글꼴 설명 = 실제(이 사이트에서만 받는다)')
        pub = [f for f in (ROOT / 'assets').rglob('*') if f.suffix in ('.css', '.js')]
        ok(not [f.name for f in pub if 'jsdelivr' in f.read_text(encoding='utf-8').lower()] and not (ROOT / 'assets' / 'pretendard.css').exists(), '올리는 CSS·JS 에 jsDelivr 주소가 없음')

    # ── 돈·법 사실 ──
    allvis = '\n'.join(vis.values())
    allraw = '\n'.join(raw.values())
    # 1) 인용문: 화면의 인용 = ctx.Q, 그리고 Q 는 확인된 사실 파일에 글자 그대로 있어야 한다
    qtexts = {re.sub(r'\s+', ' ', t) for _, t in Q.values()}
    for p, d in docs.items():
        for bq in d.quotes:
            t = re.sub(r'\s+', ' ', bq).strip()
            t = t[1:-1] if t.startswith('“') and t.endswith('”') else t
            ok(t in qtexts, f'{p}: 인용문이 원문 목록(ctx.Q)에 없음: {t[:40]}')
    if VERIFIED.exists():
        v = re.sub(r'\s+', ' ', VERIFIED.read_text(encoding='utf-8'))
        missing = [k for k, (_, t) in Q.items() for part in t.split('…') if re.sub(r'\s+', ' ', part.strip()) not in v]
        ok(not missing, f'확인된 사실 파일에 글자 그대로 없는 인용: {missing}')
        notes.append(f'인용문 {len(Q)}개를 확인된 사실 파일과 대조함')
    else:
        notes.append('확인된 사실 파일이 없어 인용문 대조는 건너뜀')
    # 2) 출처: 모든 출처에 주소·열람일, 계산기 페이지에는 그 계산의 출처 링크와 확인한 날
    ok(all(s['url'].startswith('https://') and s['viewed'] == CHECKED for s in S.values()), '출처의 주소·열람일')
    link = lambda k: href(S[k]['url'])
    N, U, L, SV, H = D['net'], D['unemployment'], D['leave'], D['severance'], D['hourly']
    NOW, NXT = D['periods'][D['now']], D['periods'][D['next']]
    need = {
        '/': NOW['pension']['src'] + NOW['health']['src'] + NOW['health']['limitSrc'] + NXT['health']['src'] + NXT['care']['src'] + NOW['employment']['src'] + NOW['incomeTax']['src'] + NOW['localTax']['src'] + N['nontaxSrc'] + D['rounding']['src'] + sum(N['baseSrc'].values(), []) + N['pensionExemptSrc'],
        '/severance/': sum(SV['src'].values(), []) + SV['periodRuleSrc'],
        '/hourly/': ['lsa55', 'lsaDecree30', 'lsa18', 'lsaDecreeT2', 'moel1350Weekly', 'minWage'] + H['src']['monthly'],
        '/unemployment/': sum(U['src'].values(), []) + U['next']['lowerSrc'],
        '/annual-leave/': L['src']['main'] + L['src']['exclude'],
    }
    need['/en/'] = need['/']; need['/en/severance/'] = need['/severance/']; need['/en/hourly/'] = need['/hourly/']
    need['/about/'] = [k for k in S if k not in ('lsaDecree30',)] ; need['/en/about/'] = [k for k in need['/about/'] if k not in ('eiLaw', 'eiDecree68', 'eiTable1', 'moel1350Ub', 'lsa60', 'lsa11')]
    for p, ks in need.items():
        for k in ks:
            ok(link(k) in hrefs[p], f'{p}: 출처 링크가 없음 {k}')
        ok(CHECKED in vis[p] or date_ko(CHECKED) in vis[p] or date_en(CHECKED) in vis[p], f'{p}: 확인한 날이 화면에 없음')
    for p in docs:
        if '/guide/' in p and not p.endswith('/guide/'):
            ok(sum(1 for h in hrefs[p] if 'law.go.kr' in h or 'moel.go.kr' in h or 'nps.or.kr' in h or 'nhis.or.kr' in h or 'minimumwage.go.kr' in h or 'mohw.go.kr' in h) >= 4, f'{p}: 공식 출처 링크가 적음')
            ok((date_ko(CHECKED) if not p.startswith('/en/') else date_en(CHECKED)) in vis[p], f'{p}: 출처를 확인한 날이 없음')
    # 모든 바깥 링크는 자료 파일의 출처이거나 정해 둔 곳
    known = {link(k) for k in S} | {'https://lumenlab.page/', 'https://lumenlab.page/en/', 'https://www.cloudflare.com/web-analytics/', 'https://www.google.com/settings/ads',
                                    'https://policies.google.com/technologies/partner-sites', 'https://policies.google.com/technologies/partner-sites?hl=ko', 'mailto:woxocoso@gmail.com'}
    for p in docs:
        ext = {h for h in hrefs[p] if not h.startswith(('/', '#'))}
        ok(ext <= known, f'{p}: 자료 파일에 없는 바깥 링크 {sorted(ext - known)[:2]}')
    # 3) 확인하지 못한 것은 싣지 않는다
    for word in ('단일세율', 'flat tax', 'flat rate', '13.14', '조세특례', '제58조', '제41조', '226시간', '243시간', '150만 원', '산입 범위'):
        ok(word not in allvis, f'확인 못 한 것({word})이 화면에 있음')
    ok(not re.search(r'(?<![\d.])19 ?%', allvis), '확인 못 한 것(19%)이 화면에 있음')
    ok('uses the standard monthly withholding table that applies to residents' in vis['/en/'] and 'uses the standard monthly withholding table that applies to residents' in vis['/en/about/'], '영어판 범위 안내 문장')
    for m in re.finditer(r'[^.\n]*(?:외국인|foreigner|non-resident|nonresident)[^.\n]*', allvis, re.I):
        ok(False, f'외국인 과세에 대한 문장은 싣지 않는다: {m.group(0)[:60]}')
    # 4) 2027년: 확정·의결·미정을 갈라 표시
    for p, w in (('/', ('확정', '의결', '미정')), ('/en/', ('set by law', 'approved', 'not decided')), ('/guide/2026-4dae-boheom-yoyul/', ('확정', '의결', '미정'))):
        ok(all(x in vis[p] for x in w), f'{p}: 2027년 확정·의결·미정 표시')
    ok('tag-hold' in raw['/'] and 'tag-hold' in raw['/about/'], '미정 꼬리표')
    # 5) 끝수·우리 방식·안내 문구
    ok(f'{D["rounding"]["pension"]}원 미만을 버려요' in vis['/'] and '국고금관리법 제47조' in vis['/'] and '몇십 원 다를 수 있어요' in vis['/'], '/: 끝수 처리 문구')
    ok('하루 차이가 날 수 있어요' in vis['/annual-leave/'], '우리 방식(한 달·1년이 찬 날) 안내')
    ok('고용노동부 계산기에 맞췄어요' in vis['/severance/'] and '3월 1일부터' in vis['/severance/'] and '원 미만을 반올림해요' in vis['/severance/'] and 'rounded to the nearest won' in vis['/en/severance/'],
       '/severance/: 퇴직 전 3개월 세는 법·반올림(고용노동부 계산기와 같게) 안내')
    # 5-2) 3단계에서 바뀐 것
    age = N['pensionExemptAge']
    ok(f'만 {age}세 이상이에요' in vis['/'] and '임의계속가입' in vis['/'] and f'I am {age} or older' in vis['/en/'] and 'o-age60' in docs['/'].ids and 'o-age60' in docs['/en/'].ids, '/: 만 60세 이상(국민연금 안 냄) 조건')
    ok(f'만 {age}세 미만' in vis['/table/'] and f'under {age}' in vis['/en/table/'], '/table/: 표의 가정에 나이 조건')
    low = f'{ctx.F["ub"]["lowerNext8"]:,}원'
    ok(low in vis['/unemployment/'] and '상한은 미정' in vis['/unemployment/'] and low in vis['/guide/sileopgeupyeo-haru-geumaek/'], f'/unemployment/: {U["next"]["year"]}년 이직의 하한 {low}(확정)·상한 미정')
    ok('이직일은 마지막으로 일한 날이에요' in vis['/unemployment/'] and '퇴직일은 마지막으로 일한 날의 다음 날이에요' in vis['/severance/'], '실업급여·퇴직금의 날짜 기준이 다르다는 안내')
    ok('정수라서' in vis['/unemployment/'], '/unemployment/: 하루 소정근로시간이 정수인 이유')
    ok('소득세의 끝수 순서' in vis['/'] and 'Order of rounding for income tax' in vis['/en/'] and '이 계산기가 정한 방식' in vis['/'], '/: 소득세 끝수 순서를 이 계산기의 방식으로 밝힘')
    for p in ('/', '/en/', '/hourly/', '/en/hourly/'):
        pn = docs[p].jsons.get('pre-next')
        ok(bool(pn) and all(k in docs[p].ids for k in pn) and f'data-starts="{NXT["starts"]}"' in raw[p] and "getElementById('pre-next')" in raw[p], f'{p}: 해가 바뀌면 끼울 다음 기준 결과(pre-next)')
    for p, ids in (('/', ('u-amt', 'u-o-nontax', 'r-o-nontax')), ('/en/', ('u-amt', 'u-o-nontax')), ('/severance/', ('u-f-wages', 'u-f-bonus', 'u-f-lpay', 'u-f-ord')), ('/en/severance/', ('u-f-wages',)),
                   ('/hourly/', ('u-amt',)), ('/unemployment/', ('u-f-wages',)), ('/table/', ('u-find',)), ('/en/table/', ('u-find',))):
        ok(all(i in docs[p].ids for i in ids), f'{p}: 금액 칸 옆 단위 표시({ids})')
    ok('45시간' in vis['/guide/juhyu-sudang-gyesan/'] and '40시간분까지' in vis['/guide/juhyu-sudang-gyesan/'], '주휴수당 글: 45시간 줄 설명')
    ok('기본급(매달 정해 놓고 받는 임금) 기준의 단순 비교예요' in vis['/hourly/'] and '따지지 못해요' in vis['/hourly/'], '/hourly/: 최저임금 비교 안내')
    ok('근로기준법 시행령 별표 2' in vis['/hourly/'] and '풀면' in vis['/hourly/'], '/hourly/: 주휴수당 식의 근거 표현')
    ok('고용센터가 정해요' in vis['/unemployment/'] and '판정하지 않아요' in vis['/severance/'], '받을 수 있는지는 판정하지 않는다는 안내')
    ok('예상 금액이에요' in vis['/'] and 'An estimate' in vis['/en/'] and '세무·노무 상담이 아니에요' in vis['/'] and 'not tax or labor advice' in vis['/en/'], '예상 금액·상담 아님 안내')
    ok('고친 날' not in allvis and 'Updated ' not in allvis, "'고친 날'/'Updated' 가 남아 있음")
    ok('조건 바꾸기' in vis['/'] and '>바꾸기<' not in raw['/'], "'바꾸기' → '조건 바꾸기'")
    for w in ('÷13', '표 금액의 80%'):
        ok(w not in allvis, f'낯선 말({w})이 남아 있음')
    # 6) 손으로 적은 숫자
    typed = typed_numbers()
    ok(not typed, f'texts.py·articles.py 에 손으로 적은 숫자 {len(typed)}곳: {typed[:6]}')

    print(f'{"실패" if fails else "통과"}  정적 검사: {passed}개 통과' + (f', {len(fails)}개 실패' if fails else '') + f' (페이지 {len(docs)}장)' + (' · ' + ' · '.join(notes) if notes else ''))
    for m in fails[:40]:
        print('   -', m)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
