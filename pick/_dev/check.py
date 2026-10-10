#!/usr/bin/env python3
"""만든 페이지의 정적 확인(브라우저 없이): python3 -B pick/_dev/check.py
빌드가 최신인지, 제목·설명, canonical·sitemap·내부 링크, hreflang 짝, <html lang>, 영어 페이지의 한글,
JSON-LD가 화면 글자와 같은지, 방침 문구(방문 통계 포함), 광고 코드가 있어야 할 곳·없어야 할 곳, 글 길이와 빈 숫자 자리,
"제한 없음"·옛 이름 같은 틀린 말이 남지 않았는지, 조각 글꼴이 화면 글자를 다 담고 있는지."""
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '_dev'))
SITE = 'https://pick.lumenlab.page'
# 사실과 다른 말(3단계에서 고친 것). 다시 들어오면 실패한다.
NO_LIMIT = re.compile(r'인원 제한 없|몇 명이든|제한 없이 뽑|no entry limit|no limit on entries|any number of names|of any length|unlimited', re.I)
NO_ANALYTICS = re.compile(r'분석 도구[는를]? ?(?:없|쓰지 않)|통계를? ?(?:모으지|수집하지) 않|do(?:es)? not use (?:any |separate )?analytics|no analytics', re.I)
SEND_NOTHING = re.compile(r'어디로도 보내지 않|아무것도 보내지 않|기기 밖으로 나가지 않|nothing is sent|never leaves (?:this|your) device', re.I)
OLD_DICE = re.compile(r'd4 to d100|4 to 100 sides|4면부터 100면')
OLD_NAME = 'Fair' + 'draw'  # 영어 이름은 Pickboard로 바뀌었다
HANGUL = re.compile(r'[ᄀ-ᇿ㄰-㆏가-힣]')
VOID = {'meta', 'link', 'br', 'img', 'input', 'hr', 'source', 'area', 'base', 'col', 'embed', 'track', 'wbr'}
results = []


def ok(cond, name, detail=''):
    results.append((bool(cond), name, detail))


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = None
        self.title = ''
        self.meta = {}
        self.links = []      # (rel, hreflang, href)
        self.anchors = []    # href
        self.ids = set()
        self.jsonld = []
        self.i18n = None
        self.h1 = ''
        self.text = []       # (보이는 글자, 한국어 표시 안인가)
        self.attr_text = []  # (속성 글자, 한국어 표시 안인가)
        self.faq = []        # (질문, 답) — class="faq" 칸 안의 것만
        self.faq_depth = None
        self.stack = []      # (tag, lang)
        self._cap = None
        self._buf = []
        self._script = None
        self.ad_slots = 0
        self.has_ads = False
        self.robots = ''

    def cur_lang(self):
        for tag, lang in reversed(self.stack):
            if lang:
                return lang
        return self.lang

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html':
            self.lang = a.get('lang')
        if tag not in VOID:
            self.stack.append((tag, a.get('lang')))
            if self.faq_depth is None and 'faq' in (a.get('class') or '').split():
                self.faq_depth = len(self.stack)
        if 'id' in a:
            self.ids.add(a['id'])
        lang_here = a.get('lang') or self.cur_lang()
        for k in ('aria-label', 'title', 'alt', 'placeholder', 'value'):
            if a.get(k):
                self.attr_text.append((a[k], lang_here))
        for k, v in a.items():
            if k.startswith('data-') and v and k not in ('data-sample',):
                self.attr_text.append((v, lang_here))
        if a.get('data-sample'):
            self.attr_text.append((a['data-sample'], lang_here))
        if tag == 'meta':
            key = a.get('name') or a.get('property')
            if key:
                self.meta[key] = a.get('content', '')
                if key in ('description', 'og:title', 'og:description'):
                    self.attr_text.append((a.get('content', ''), self.lang))
                if key == 'robots':
                    self.robots = a.get('content', '')
        if tag == 'link':
            self.links.append((a.get('rel', ''), a.get('hreflang'), a.get('href', '')))
        if tag == 'a' and a.get('href') is not None:
            self.anchors.append(a['href'])
        if tag == 'script':
            self._script = a.get('type') or 'js'
            if a.get('id') == 'i18n':
                self._script = 'i18n'
            if 'adsbygoogle' in (a.get('src') or ''):
                self.has_ads = True
            self._buf = []
        if tag in ('title', 'h1') or (self.faq_depth is not None and (tag == 'summary' or (tag == 'p' and len(self.stack) >= 2 and self.stack[-2][0] == 'details'))):
            self._cap = tag
            self._buf = []
        if a.get('data-ad'):
            self.ad_slots += 1

    def handle_endtag(self, tag):
        if tag == 'script':
            body = ''.join(self._buf)
            if self._script == 'application/ld+json':
                self.jsonld.append(json.loads(body))
            elif self._script == 'i18n':
                self.i18n = json.loads(body.replace('<\\/', '</'))
            elif 'adsbygoogle' in body:
                pass
            self._script = None
        if self._cap == tag:
            text = re.sub(r'\s+', ' ', ''.join(self._buf)).strip()
            if tag == 'title':
                self.title = text
            elif tag == 'h1':
                self.h1 = text
            elif tag == 'summary':
                self.faq.append([text, None])
            elif tag == 'p' and self.faq and self.faq[-1][1] is None:
                self.faq[-1][1] = text
            self._cap = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break
        if self.faq_depth is not None and len(self.stack) < self.faq_depth:
            self.faq_depth = None

    def handle_data(self, data):
        if self._script:
            self._buf.append(data)
            return
        if self._cap:
            self._buf.append(data)
        if any(t in ('style',) for t, _ in self.stack):
            return
        if data.strip():
            self.text.append((data, self.cur_lang()))


def load(rel):
    p = Page()
    p.feed((ROOT / rel).read_text(encoding='utf-8'))
    p.raw = (ROOT / rel).read_text(encoding='utf-8')
    return p


def file_for(path):
    return path.lstrip('/') + 'index.html' if path.endswith('/') else path.lstrip('/')


def main():
    r = subprocess.run([sys.executable, '-B', str(ROOT / '_dev' / 'build.py'), '--check'], capture_output=True, text=True)
    ok(r.returncode == 0, '빌드 결과가 최신', (r.stdout + r.stderr).strip()[:200])

    sm = (ROOT / 'sitemap.xml').read_text(encoding='utf-8')
    locs = re.findall(r'<loc>(.*?)</loc>', sm)
    paths = [u[len(SITE):] for u in locs]
    ok(all(u.startswith(SITE + '/') and u.endswith('/') for u in locs), 'sitemap 주소가 전부 이 사이트의 폴더 주소')
    ok(len(paths) == len(set(paths)) and len(paths) >= 27, f'sitemap 주소 {len(paths)}개, 겹침 없음')
    pages = {}
    for path in paths:
        rel = file_for(path)
        ok((ROOT / rel).exists(), f'sitemap 주소의 파일이 있음: {path}')
        if (ROOT / rel).exists():
            pages[path] = load(rel)

    titles, descs = {}, {}
    for path, p in pages.items():
        ko = path.startswith('/ko/')
        d = p.meta.get('description', '')
        ok(p.title and p.title not in titles, f'제목이 있고 다른 페이지와 다름: {path}', titles.get(p.title, ''))
        ok(d and d not in descs and d != p.title, f'설명이 있고 다른 페이지와 다름: {path}', descs.get(d, ''))
        titles[p.title] = path
        descs[d] = path
        ok(p.lang == ('ko' if ko else 'en'), f'<html lang>이 주소와 같음: {path}', str(p.lang))
        canon = [h for rel, hl, h in p.links if rel == 'canonical']
        ok(canon == [SITE + path], f'canonical = sitemap 주소: {path}', str(canon))
        ok(p.meta.get('og:url') == SITE + path and p.meta.get('og:image', '').startswith(SITE + '/og') and p.meta.get('og:locale') == ('ko_KR' if ko else 'en_US') and p.meta.get('twitter:card'), f'og 태그: {path}')
        ok(p.h1 and p.h1 != '', f'H1이 있음: {path}')
        ok('noindex' not in p.robots and 'nosnippet' not in p.raw and 'max-snippet' not in p.raw, f'noindex·nosnippet 없음: {path}')
        ok('—' not in ''.join(t for t, _ in p.text) and '{{' not in p.raw, f'줄표·빈 숫자 자리 없음: {path}')
        seen = ' '.join(t for t, _ in p.text) + ' ' + p.title + ' ' + d
        bad_words = [m.group(0) for rx in (NO_LIMIT, NO_ANALYTICS, SEND_NOTHING, OLD_DICE) for m in [rx.search(seen)] if m]
        ok(not bad_words and OLD_NAME.lower() not in p.raw.lower(), f'틀린 말 없음(제한 없음·분석 도구 없음·아무것도 안 보냄·옛 주사위 설명·옛 이름): {path}', ', '.join(bad_words))
        if not ko:
            ok(len(p.title) <= 62, f'영어 제목 60자 안팎({len(p.title)}자): {path}', p.title)
        # 바깥 출처 링크에는 확인한 날을 같이 적는다
        if any(h.startswith(('https://developer.mozilla.org/', 'https://prng.di.unimi.it', 'https://raw.githubusercontent.com/')) for h in p.anchors):
            ok('2026-10-10' in seen, f'바깥 출처 링크 곁에 확인한 날: {path}')
        # hreflang
        alts = {hl: h for rel, hl, h in p.links if rel == 'alternate' and hl}
        if alts:
            me = 'ko' if ko else 'en'
            other = 'en' if ko else 'ko'
            good = set(alts) == {'en', 'ko', 'x-default'} and alts[me] == SITE + path and alts['x-default'] == alts['en']
            opath = alts.get(other, '')[len(SITE):]
            back = opath in pages and {hl: h for rel, hl, h in pages[opath].links if rel == 'alternate' and hl}.get(me) == SITE + path
            ok(good and back, f'hreflang: 자기 자신·짝·x-default(영어), 서로 가리킴: {path}', str(alts))
        else:
            ok('/guide/' in path and path.count('/') >= 3 + (1 if ko else 0), f'hreflang 없는 페이지는 짝 없는 글뿐: {path}')
        # 내부 링크
        bad = []
        for h in p.anchors:
            if h.startswith(('http://', 'https://', 'mailto:')):
                if h.startswith(SITE):
                    bad.append(h + ' (사이트 안 링크는 / 로 시작)')
                continue
            base, _, frag = h.partition('#')
            if not base.startswith('/') and base != '':
                bad.append(h)
                continue
            target = base or path
            if '.html' in target or not target.endswith('/'):
                bad.append(h)
                continue
            if not (ROOT / file_for(target)).exists():
                bad.append(h + ' (없는 주소)')
                continue
            if frag and target in pages and frag not in pages[target].ids:
                bad.append(h + ' (없는 #)')
        ok(not bad, f'내부 링크가 전부 있는 폴더 주소: {path}', ', '.join(bad[:4]))
        ok(any(h.startswith('https://lumenlab.page/' + ('' if ko else 'en/')) for h in p.anchors) and not any(h == ('https://lumenlab.page/en/' if ko else 'https://lumenlab.page/') for h in p.anchors), f'루멘랩 링크가 같은 언어 본페이지로: {path}')
        # 영어 페이지의 한글
        if not ko:
            leaks = [t.strip()[:30] for t, lang in p.text + p.attr_text if lang != 'ko' and HANGUL.search(t)]
            blob = dict(p.i18n or {})
            blob.pop('other', None)
            if HANGUL.search(json.dumps(blob, ensure_ascii=False)):
                leaks.append('i18n')
            ok(not leaks, f'영어 페이지에 lang="ko" 밖 한글 없음: {path}', ', '.join(leaks[:4]))
        # 구조화 데이터 = 화면 글자
        types = [j.get('@type') for j in p.jsonld]
        is_article = '/guide/' in path and not path.endswith('/guide/')
        is_doc = path.rstrip('/').split('/')[-1] in ('about', 'privacy', 'guide')
        if is_article:
            art = next((j for j in p.jsonld if j.get('@type') == 'Article'), {})
            crumb = next((j for j in p.jsonld if j.get('@type') == 'BreadcrumbList'), {})
            ok(art.get('headline') == p.h1 and art.get('description') == d and art.get('mainEntityOfPage') == SITE + path and art.get('inLanguage') == p.lang, f'Article = 화면 제목·설명: {path}')
            ok(crumb and crumb['itemListElement'][-1]['name'] == p.h1 and crumb['itemListElement'][-1]['item'] == SITE + path, f'BreadcrumbList = 화면: {path}')
            body = re.sub(r'<[^>]+>', '', p.raw[p.raw.index('<article'):p.raw.index('</article>')])
            ok(len(body) >= (1300 if ko else 2200), f'글 길이: {path}', str(len(body)))
            ok(('마지막 확인' if ko else 'Last checked') in body and '고친 날' not in body and re.search(r'<time datetime="(\d{4}-\d\d-\d\d)">\1</time>', p.raw) and art.get('dateModified') == re.search(r'<time datetime="([^"]+)"', p.raw).group(1),
               f"글 머리에 '마지막 확인' 날짜 = Article의 dateModified: {path}")
            ok(p.raw.count('<table>') == len(re.findall(r'<div class="tbl-wrap(?: wide)?"><div class="tbl(?: fit)?"><table>', p.raw)), f'표는 전부 옆으로 밀리는 칸 안에: {path}')
        elif not is_doc:
            app = next((j for j in p.jsonld if j.get('@type') == 'WebApplication'), {})
            ok(app.get('url') == SITE + path and app.get('description') == d and app.get('name', '').startswith(p.h1) and app.get('inLanguage') == p.lang, f'WebApplication = 화면 제목·설명: {path}')
            ok('aggregateRating' not in p.raw and 'review' not in json.dumps(p.jsonld).lower(), f'없는 평점·후기 없음: {path}')
            faq = next((j for j in p.jsonld if j.get('@type') == 'FAQPage'), None)
            shown = [(q, a) for q, a in p.faq if a]
            if faq:
                ld = [(q['name'], q['acceptedAnswer']['text']) for q in faq['mainEntity']]
                ok(ld == shown and len(ld) >= 1, f'FAQPage가 화면의 질문·답과 글자까지 같음: {path}')
            else:
                ok(not shown, f'FAQ가 화면에 없으면 FAQPage도 없음: {path}')
        ok('FAQPage' not in types or p.faq, f'FAQPage는 화면에 FAQ가 있을 때만: {path}')
        # 광고
        if is_doc:
            ok(not p.has_ads and 'adsbygoogle' not in p.raw and p.ad_slots == 0, f'광고 코드 없음(소개·방침·가이드 목록): {path}')
        else:
            ok(p.has_ads and p.ad_slots == (1 if is_article else 2) and 'ca-pub-9496167591465154' in p.raw, f'광고 코드와 자리 {1 if is_article else 2}곳: {path}')
        ok(len(''.join(t for t, _ in p.text)) > 400 and len([h for h in p.anchors if h.startswith('/')]) >= 5, f'첫 HTML에 본문과 내부 링크: {path}')

    nf = load('404.html')
    ok('noindex' in nf.robots and 'adsbygoogle' not in nf.raw and '/ko/' in nf.anchors and '/' in nf.anchors, '404: noindex, 광고 없음, 두 언어 첫 화면 링크')
    ok(not [t for t, lang in nf.text if lang != 'ko' and HANGUL.search(t)], '404: 한글은 lang="ko" 안에만')
    tool_paths = [x for x in paths if x.count('/') <= (3 if x.startswith('/ko/') else 2) and not any(k in x for k in ('guide', 'about', 'privacy'))]
    ok(len(tool_paths) == 14 and all(x in nf.anchors for x in tool_paths), '404: 두 언어의 도구 7개씩으로 가는 링크', str([x for x in tool_paths if x not in nf.anchors]))
    ok('공평뽑기' in nf.raw and 'Pickboard' in nf.raw and "indexOf('/ko/')" in nf.raw, '404: 주소가 /ko/ 로 시작하면 한국어 상표·문구만 남긴다')
    for path, need in (('/privacy/', ('web beacons', 'https://policies.google.com/technologies/partner-sites', 'pick.list', 'pick.history', 'pick.sound', 'pick.lang', 'woxocoso@gmail.com')),
                       ('/ko/privacy/', ('웹 비콘', 'https://policies.google.com/technologies/partner-sites', 'pick.list', 'pick.history', 'pick.sound', 'pick.lang', 'woxocoso@gmail.com'))):
        ok(all(n in pages[path].raw for n in need), f'방침: 웹 비콘 문장, partner-sites 링크, 저장 항목 4개, 문의 메일: {path}')
        # 실제 주소에서는 Cloudflare가 방문 통계 스크립트를 끼워 넣는다 → 방침에 적혀 있어야 하고 "분석 도구 없음" 꼴의 말이 없어야 한다
        ok('Cloudflare Web Analytics' in pages[path].raw and 'https://www.cloudflare.com/web-analytics/' in pages[path].anchors and not NO_ANALYTICS.search(pages[path].raw),
           f'방침: 방문 통계(Cloudflare Web Analytics)와 링크가 있고, 분석 도구가 없다는 말이 없음: {path}')
    # 옛 이름이 어느 파일에도 남아 있지 않다(이 검사 파일은 빼고)
    left = [str(f.relative_to(ROOT)) for f in ROOT.rglob('*') if f.is_file() and f.suffix in ('.html', '.js', '.mjs', '.json', '.css', '.md', '.py', '.xml', '.txt', '.jsonc', '.svg')
            and f.name != 'check.py' and OLD_NAME.lower() in f.read_text(encoding='utf-8', errors='ignore').lower()]
    ok(not left, f'옛 영어 이름({OLD_NAME})이 남은 파일 없음', ', '.join(left))
    # 조각 글꼴: 파일이 있고, 페이지마다 자기 언어의 조각을 preload하고, 화면 글자를 전부 담고 있다
    import build as B
    fonts = json.loads((ROOT / '_dev' / 'fonts.json').read_text(encoding='utf-8')) if (ROOT / '_dev' / 'fonts.json').exists() else {}
    ok(all(l in fonts and (ROOT / 'assets' / 'fonts' / fonts[l]['file']).exists() and (ROOT / 'assets' / 'fonts' / fonts[l]['file']).stat().st_size == fonts[l]['bytes'] for l in ('en', 'ko')), '조각 글꼴 파일이 있고 크기가 fonts.json과 같음')
    if fonts:
        ok(all(f'<link rel="preload" href="/assets/fonts/{fonts["ko" if path.startswith("/ko/") else "en"]["file"]}" as="font" type="font/woff2" crossorigin>' in p.raw and 'font-family:"PK Sans"' in p.raw for path, p in pages.items()),
           '모든 페이지가 자기 언어의 조각 글꼴을 preload하고 @font-face(PK Sans)를 갖고 있음')
        need_chars = B.screen_chars()
        for l in ('en', 'ko'):
            miss = ''.join(c for c in need_chars[l] if c not in fonts[l]['chars'] and c not in fonts[l].get('not_in_source', ''))
            ok(not miss, f'조각 글꼴({l})이 화면 글자를 전부 담고 있음(아니면 python3 -B _dev/font.py 를 다시 돌린다. 안 돌려도 그 글자는 CDN에서 받아 보인다)', f'{len(miss)}자: {miss[:40]}')
        junk_fonts = [f.name for f in (ROOT / 'assets' / 'fonts').glob('pk-*.woff2') if f.name not in (fonts['en']['file'], fonts['ko']['file'])]
        ok(not junk_fonts, '쓰지 않는 옛 조각 글꼴 파일 없음', ', '.join(junk_fonts))
    ofl = (ROOT / 'assets' / 'fonts' / 'OFL.txt')
    ok(ofl.exists() and 'SIL OPEN FONT LICENSE' in ofl.read_text(encoding='utf-8') and 'PK Sans' in ofl.read_text(encoding='utf-8'), '글꼴 라이선스 전문(assets/fonts/OFL.txt)과 이름을 바꿨다는 설명')
    ok((ROOT / '_headers').exists() and '/assets/fonts/*' in (ROOT / '_headers').read_text() and 'immutable' in (ROOT / '_headers').read_text(), '_headers: 글꼴 조각은 오래 저장')
    ok('"PK Sans", "Pretendard Variable"' in (ROOT / 'assets' / 'style.css').read_text(encoding='utf-8'), 'style.css: 글꼴 이름표 순서(조각 → CDN → 대체)')
    lastmods = set(re.findall(r'<lastmod>(.*?)</lastmod>', sm))
    ok(lastmods <= {B.MODIFIED, *B.UPDATED.values()} and all(re.fullmatch(r'\d{4}-\d\d-\d\d', x) for x in lastmods), f'sitemap lastmod는 실제로 고친 날뿐: {sorted(lastmods)}')
    js = ''.join((ROOT / 'assets' / f).read_text(encoding='utf-8') for f in ['app.js'] + [f'tools/{t}.js' for t in ('wheel', 'ladder', 'draw', 'teams', 'number', 'coin', 'dice')])
    keys = set(re.findall(r"['\"](pick\.[a-z]+)['\"]", js) + re.findall(r"getItem\('(pick\.[a-z]+)'\)", (ROOT / 'index.html').read_text(encoding='utf-8')))
    ok(keys == {'pick.list', 'pick.history', 'pick.sound', 'pick.lang'}, '코드가 쓰는 저장 키 = 방침에 적은 4개', str(sorted(keys)))
    core = ''.join(re.sub(r'//.*', '', f.read_text(encoding='utf-8')) for f in (ROOT / 'assets' / 'core').glob('*.js'))
    ok('Math.random' not in re.sub(r'//.*', '', js) and 'Math.random' not in core, '코드에 Math.random 없음(주석 빼고)')
    ok('fetch(' not in js and 'XMLHttpRequest' not in js and 'sendBeacon' not in js and 'WebSocket' not in js, '화면 코드에 바깥으로 보내는 호출 없음(fetch·XHR·beacon·WebSocket)')

    ok((ROOT / 'robots.txt').read_text().strip().endswith(f'Sitemap: {SITE}/sitemap.xml') and 'Disallow' not in (ROOT / 'robots.txt').read_text(), 'robots.txt: 전부 허용 + Sitemap 줄')
    ok((ROOT / 'ads.txt').read_text().strip() == 'google.com, pub-9496167591465154, DIRECT, f08c47fec0942fa0', 'ads.txt')
    ok((ROOT / 'googlea614029e84d58498.html').read_text().strip() == 'google-site-verification: googlea614029e84d58498.html', '구글 확인 파일')
    ign = (ROOT / '.assetsignore').read_text().split()
    ok(all(x in ign for x in ('_dev', 'tests', 'CLAUDE.md', 'wrangler.jsonc', '.assetsignore', '.deploy-actions')), '.assetsignore에 개발 파일')
    ok((ROOT / '.deploy-actions').exists() and '"pick.lumenlab.page"' in (ROOT / 'wrangler.jsonc').read_text() and '"workers_dev": false' in (ROOT / 'wrangler.jsonc').read_text() and '404-page' in (ROOT / 'wrangler.jsonc').read_text(), 'wrangler.jsonc·.deploy-actions')
    for f in ('favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og.png', 'og-ko.png'):
        ok((ROOT / f).exists() and (ROOT / f).stat().st_size > 200, f'{f} 있음')
    rss = (ROOT / 'rss.xml').read_text(encoding='utf-8')
    ko_articles = [p for p in paths if p.startswith('/ko/guide/') and p != '/ko/guide/']
    ok(rss.count('<item>') == len(ko_articles) >= 3 and all(SITE + p in rss for p in ko_articles), f'rss.xml: 한국어 글 {len(ko_articles)}편')
    en_articles = [p for p in paths if p.startswith('/guide/') and p != '/guide/']
    ok(len(en_articles) >= 3, f'영어 글 {len(en_articles)}편')
    junk = [str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.name in ('node_modules', '__pycache__', '.wrangler', '.DS_Store')]
    ok(not junk, '폴더에 node_modules·__pycache__·.wrangler 없음', ', '.join(junk))

    bad = [(n, d) for c, n, d in results if not c]
    for n, d in bad:
        print('  실패', n, ('→ ' + d) if d else '')
    print(f'{"통과" if not bad else "실패"}: 정적 확인 {len(results) - len(bad)}개 통과, {len(bad)}개 실패')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
