#!/usr/bin/env python3
"""토독 정적 검사: python3 typing/_dev/check.py   (만든 HTML·배포 파일을 읽어 본다. 화면을 눌러 보는 확인은 e2e.py)

보는 것: 페이지마다 title·description 다름 / canonical = sitemap = 내부 링크(끝 / 까지), 깨진 내부 링크·#해시 0, .html 링크 0 /
hreflang 짝·자기 자신·x-default / <html lang> / 영어 페이지의 lang="ko" 밖 한글 0 / JSON-LD 가 화면 글자와 같음 /
방침: 웹 비콘 문장·partner-sites 링크·Cloudflare Web Analytics·저장 키 이름이 코드와 같음 / 광고 코드가 있어야 할 곳·없어야 할 곳 /
첫 HTML 에 제목·본문·내부 링크 / 확인된 사실(연구 값)에는 출처 링크와 확인한 날 / 화면 말('글쇠'·'낱말' 대신 '키'·'단어') / 배포 파일 /
3단계에 더한 것: 조각 글꼴이 화면 글자·연습 글을 전부 담는지, 404 가 두 언어 틀을 담는지, 결과의 총 속도 줄·화면 읽기용 문단, 통과 기준·터치 자판 문구.
"""
import sys
sys.dont_write_bytecode = True
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '_dev'))
import build as B  # noqa: E402  (조각 글꼴에 담을 글자 모으기)
SITE = 'https://typing.lumenlab.page'
fails = []
count = 0


def ok(cond, msg):
    global count
    count += 1
    if not cond:
        fails.append(msg)


HANGUL = re.compile(r'[ᄀ-ᇿ㄰-㆏가-힣]')


class Text(HTMLParser):
    """보이는 글자를 모은다. lang="ko" 안인지, script·style 안인지 따라간다."""
    VOID = {'meta', 'link', 'br', 'img', 'input', 'hr', 'source', 'path', 'rect', 'circle', 'line'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []      # (tag, ko?, hidden?)
        self.text = []       # 보이는 글(lang=ko 밖)
        self.all = []        # 보이는 글 전부
        self.attrs_ko = []   # lang=ko 밖 요소의 속성 값(aria-label, title, alt, content, placeholder)
        self.ids = set()
        self.links = []
        self.h1 = []
        self.cur_h1 = None

    def ko(self):
        return any(s[1] for s in self.stack)

    def hidden(self):
        return any(s[2] for s in self.stack)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.add(a['id'])
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])
        is_ko = (a.get('lang') or '').startswith('ko')
        skip = tag in ('script', 'style')
        if not (self.ko() or is_ko):
            for k in ('aria-label', 'title', 'alt', 'placeholder'):
                if a.get(k):
                    self.attrs_ko.append(a[k])
            if tag == 'meta' and a.get('content') and (a.get('name') in ('description',) or (a.get('property') or '').startswith('og:')):
                self.attrs_ko.append(a['content'])
        if tag == 'h1':
            self.cur_h1 = []
        if tag not in self.VOID:
            self.stack.append((tag, is_ko, skip))

    def handle_endtag(self, tag):
        if tag == 'h1' and self.cur_h1 is not None:
            self.h1.append(''.join(self.cur_h1).strip())
            self.cur_h1 = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self.hidden():
            return
        self.all.append(data)
        if self.cur_h1 is not None:
            self.cur_h1.append(data)
        if not self.ko():
            self.text.append(data)


def norm(s):
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def load_pages():
    pages = {}
    for f in sorted(ROOT.rglob('index.html')):
        rel = f.relative_to(ROOT).as_posix()
        if rel.startswith(('_dev/', 'tests/')):
            continue
        path = '/' + rel[:-len('index.html')]
        pages[path] = f.read_text(encoding='utf-8')
    return pages


def main():
    pages = load_pages()
    ign = (ROOT / '.assetsignore').read_text().split()
    sm = (ROOT / 'sitemap.xml').read_text(encoding='utf-8')
    sm_paths = re.findall(r'<loc>' + re.escape(SITE) + r'([^<]*)</loc>', sm)
    ok(sorted(sm_paths) == sorted(pages), f'sitemap 주소와 만든 페이지가 다르다: {sorted(set(sm_paths) ^ set(pages))}')
    ok(len(sm_paths) == len(set(sm_paths)), 'sitemap 에 겹치는 주소')
    ok(all(re.search(r'<lastmod>\d{4}-\d\d-\d\d</lastmod>', l) for l in sm.split('\n') if '<loc>' in l), 'sitemap lastmod')
    titles, descs, parsed = {}, {}, {}
    for path, src in pages.items():
        lang = 'ko' if path.startswith('/ko/') else 'en'
        p = Text()
        p.feed(src)
        parsed[path] = p
        m = re.search(r'<html lang="([a-z]+)">', src)
        ok(m and m.group(1) == lang, f'{path} <html lang> 이 {lang} 이 아니다')
        t = re.search(r'<title>(.*?)</title>', src, re.S)
        d = re.search(r'<meta name="description" content="(.*?)">', src, re.S)
        ok(t and d, f'{path} title·description 없음')
        titles.setdefault(norm(t.group(1)), []).append(path)
        descs.setdefault(norm(d.group(1)), []).append(path)
        ok(10 <= len(norm(t.group(1))) <= 80, f'{path} title 길이 {len(norm(t.group(1)))}')
        ok(40 <= len(norm(d.group(1))) <= 200, f'{path} description 길이 {len(norm(d.group(1)))}')
        ok(len(p.h1) == 1 and p.h1[0], f'{path} h1 이 하나가 아니다: {p.h1}')
        canon = re.findall(r'<link rel="canonical" href="([^"]+)">', src)
        ok(canon == [SITE + path], f'{path} canonical {canon}')
        ok(f'<meta property="og:url" content="{SITE + path}">' in src, f'{path} og:url')
        ok(re.search(r'<meta property="og:image" content="' + re.escape(SITE) + r'/og(-ko)?\.png">', src), f'{path} og:image')
        ok('twitter:card' in src and 'og:locale' in src and 'og:site_name' in src and 'theme-color' in src, f'{path} og·theme-color 빠짐')
        ok('favicon.svg' in src and 'favicon.ico' in src and 'apple-touch-icon.png' in src, f'{path} 아이콘 링크')
        ok('noindex' not in src and 'nosnippet' not in src and 'max-snippet' not in src, f'{path} 공개 페이지에 noindex·nosnippet')
        ok('maximum-scale' not in src and 'user-scalable' not in src, f'{path} 확대를 막는다')
        ok('—' not in src, f'{path} 줄표(—)가 있다')
        # 첫 HTML 에 제목·본문·내부 링크
        body_text = norm(' '.join(p.all))
        ok(len(body_text) > 300, f'{path} 첫 HTML 본문이 너무 짧다({len(body_text)}자)')
        ok(sum(1 for h in p.links if h.startswith('/')) >= 5, f'{path} 내부 링크가 적다')
        # 내부 링크: 폴더 주소(끝 /), 있는 페이지, #해시는 그 페이지에 있는 id
        for h in p.links:
            if h.startswith(('https://', 'mailto:')):
                continue
            ok(h.startswith('/') or h.startswith('#'), f'{path} 상대 링크 {h}')
            target, _, frag = h.partition('#')
            if target.startswith('/assets/'):   # 파일로 가는 링크(글꼴 라이선스 전문)
                ok((ROOT / target.lstrip('/')).is_file(), f'{path} 없는 파일 링크 {h}')
                continue
            if target:
                ok('.html' not in target, f'{path} .html 링크 {h}')
                ok(target in pages, f'{path} 깨진 내부 링크 {h}')
            if frag:
                tp = parsed.get(target) if target else p
                if tp is None and target in pages:
                    tp = Text(); tp.feed(pages[target]); parsed[target] = tp
                ok(tp is not None and frag in tp.ids, f'{path} 없는 #해시 {h}')
        # 영어 페이지: lang="ko" 밖 한글 0 (속성·구조화 데이터·설정 JSON 포함. tj-site 의 한국어 안내 두 줄은 화면에 lang="ko" 로 들어간다)
        if lang == 'en':
            vis = ''.join(p.text) + ' '.join(p.attrs_ko)
            ok(not HANGUL.search(vis), f'{path} 영어 페이지에 lang="ko" 밖 한글: {HANGUL.findall(vis)[:8]}')
            for m2 in re.finditer(r'<script type="application/(?:ld\+)?json"(?: id="([^"]+)")?>(.*?)</script>', src, re.S):
                data = m2.group(2)
                if m2.group(1) == 'tj-site':
                    j = json.loads(data)
                    j.pop('bar', None); j.pop('offer', None)
                    data = json.dumps(j, ensure_ascii=False)
                ok(not HANGUL.search(data), f'{path} 영어 페이지 JSON 에 한글: {HANGUL.findall(data)[:8]}')
        # 화면 말: 도구·소개·방침·목록에는 '글쇠'·'낱말'을 쓰지 않는다(글 본문에서 한 번 풀어 주는 것만 허용)
        if lang == 'ko':
            is_article = re.fullmatch(r'/ko/guide/[^/]+/', path)
            n_geul = src.count('글쇠')
            ok(n_geul <= (2 if is_article else 0), f'{path} "글쇠" {n_geul}번(화면 말은 "키")')
            ok('낱말' not in src, f'{path} "낱말"(화면 말은 "단어")')
        # 광고 코드: 도구·글에는 있고, 소개·방침·목록에는 없다
        tool_or_article = ('id="tj-cfg"' in src) or re.fullmatch(r'/(ko/)?guide/[^/]+/', path)
        has_ads = 'adsbygoogle' in src
        ok(has_ads == bool(tool_or_article), f'{path} 광고 코드가 {"없다" if tool_or_article else "있다"}')
        if tool_or_article:
            ok('ca-pub-9496167591465154' in src and '/assets/ads-config.js' in src, f'{path} 광고 설정')
            ok(len(re.findall(r'data-ad="', src)) in (2, 3), f'{path} 수동 광고 자리 수 {len(re.findall(chr(100) + "ata-ad=", src))}')
        else:
            ok('data-ad=' not in src, f'{path} 광고 없는 페이지에 광고 자리')
        # 구조화 데이터
        lds = [json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>', src, re.S)]
        types = [j['@type'] for j in lds]
        vis_all = norm(' '.join(p.all))
        for j in lds:
            if j['@type'] == 'WebApplication':
                ok(j['description'] == norm(d.group(1)), f'{path} WebApplication 설명이 description 과 다르다')
                ok(j['url'] == SITE + path, f'{path} WebApplication url')
                ok(p.h1[0] in j['name'], f'{path} WebApplication 이름에 h1 이 없다')
            if j['@type'] == 'FAQPage':
                qa = re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>', src, re.S)
                shown = [(norm(q), norm(a)) for q, a in qa]
                ld = [(x['name'], x['acceptedAnswer']['text']) for x in j['mainEntity']]
                ok(shown == ld and len(ld) >= 2, f'{path} FAQPage 가 화면 글자와 다르다')
            if j['@type'] == 'Article':
                ok(j['headline'] == p.h1[0], f'{path} Article headline 이 h1 과 다르다')
                ok(j['description'] == norm(d.group(1)) and j['mainEntityOfPage'] == SITE + path, f'{path} Article 설명·주소')
                ok(re.fullmatch(r'\d{4}-\d\d-\d\d', j['dateModified']) and j['dateModified'] in src.split('</head>')[1], f'{path} Article 날짜가 화면에 없다')
            if j['@type'] == 'BreadcrumbList':
                names = [x['name'] for x in j['itemListElement']]
                crumb = re.search(r'<nav class="crumbs".*?</nav>', src, re.S)
                shown = [norm(x) for x in re.findall(r'>([^<>›]+)<', crumb.group(0))] if crumb else []
                ok(names == [x for x in shown if x], f'{path} BreadcrumbList {names} / 화면 {shown}')
                ok(j['itemListElement'][-1]['item'] == SITE + path, f'{path} BreadcrumbList 마지막 주소')
        if 'id="tj-cfg"' in src:
            ok('WebApplication' in types, f'{path} 도구 페이지에 WebApplication 없음')
            # 결과의 총 속도 줄, 화면 읽기 프로그램용 '칠 글' 문단과 빠져나오는 법, 초점이 나가 있을 때의 시작 안내
            ok('id="r-raw"' in src and (('총 타수' in src) if lang == 'ko' else ('Raw speed' in src and 'small print' in src)), f'{path} 총 속도(결과 줄 + 계산 기준)')
            ok('id="txt-sr"' in src and 'aria-describedby="trap-help"' in src and re.search(r'<p class="sr" id="trap-help">[^<]*Esc[^<]*</p>', src), f'{path} 화면 읽기용 문단·치는 칸에서 나오는 법')
            ok(re.search(r'<p class="sr" id="txt-sr"></p>\s*<textarea', src) and not re.search(r'id="txt-sr"[^>]*aria-hidden', src), f'{path} 칠 글 문단은 숨기지 않고 치는 칸 바로 앞에')
            ok('class="pc off"' in src and 'id="rec-more"' in src, f'{path} 시작 안내(초점이 나가 있을 때)·기록 더 보기')
            cfgj = json.loads(re.search(r'<script type="application/json" id="tj-cfg">(.*?)</script>', src, re.S).group(1).replace('<\\/', '</'))
            ok(all(k in cfgj['S'] for k in ('rawKo', 'rawEn', 'rawAlso', 'withPunct', 'withNums', 'recMore', 'recLess')), f'{path} 화면 문구(총 속도·기록 조건)')
            if cfgj['tool'] == 'practice':
                ok(('95% 이상' in src and '95%를 넘' not in src) if lang == 'ko' else ('95% accuracy or higher' in src), f'{path} 통과 기준의 말은 "95% 이상"')
        ok('천지인' not in src, f'{path} 확인하지 못한 자판(천지인)을 된다고 단정하지 않는다')
        if re.fullmatch(r'/(ko/)?guide/[^/]+/', path):
            ok('Article' in types and 'BreadcrumbList' in types, f'{path} 글에 Article·BreadcrumbList 없음')
            ok(('마지막 확인' if lang == 'ko' else 'Last checked') in vis_all, f'{path} "마지막 확인" 날짜')
        ok(('FAQPage' in types) == ('class="sec faq"' in src), f'{path} FAQPage 는 화면에 FAQ 가 있을 때만')
        # 확인된 사실: 연구 값에는 출처 링크와 확인한 날
        if '51.56' in src:
            ok('userinterfaces.aalto.fi/136Mkeystrokes' in src and '2026-10-10' in src, f'{path} 연구 값(51.56 WPM)에 출처·확인한 날이 없다')
            ok(('세계 평균은 아니' in src) if lang == 'ko' else ('not a world average' in src), f'{path} 연구 값의 한계(스스로 참여·영어 문장)를 밝히지 않았다')
        # 루멘랩 링크는 같은 언어 본페이지로
        want = 'https://lumenlab.page/' + ('en/' if lang == 'en' else '')
        ok(f'class="lumen" id="lumen" href="{want}"' in src, f'{path} 루멘랩 링크가 {want} 가 아니다')
        ok('woxocoso@gmail.com' in src, f'{path} 문의 메일')
    for t, ps in titles.items():
        ok(len(ps) == 1, f'title 이 겹친다: {ps}')
    for d, ps in descs.items():
        ok(len(ps) == 1, f'description 이 겹친다: {ps}')

    # hreflang: 짝 있는 페이지는 자기 자신까지 서로, x-default 는 영어. 짝 없는 페이지에는 없다
    alts = {}
    for path, src in pages.items():
        a = dict(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">', src))
        alts[path] = a
    for path, a in alts.items():
        lang = 'ko' if path.startswith('/ko/') else 'en'
        if not a:
            continue
        ok(set(a) == {'en', 'ko', 'x-default'}, f'{path} hreflang 종류 {sorted(a)}')
        ok(a.get(lang) == SITE + path, f'{path} hreflang 자기 자신')
        ok(a.get('x-default') == a.get('en'), f'{path} x-default 는 영어')
        other = a.get('ko' if lang == 'en' else 'en', '')[len(SITE):]
        ok(other in pages and alts[other].get(lang) == SITE + path, f'{path} hreflang 짝이 서로 가리키지 않는다')
    paired = sorted(p for p, a in alts.items() if a)
    expect = sorted(['/', '/ko/', '/practice/', '/ko/practice/', '/guide/', '/ko/guide/', '/about/', '/ko/about/', '/privacy/', '/ko/privacy/',
                     '/guide/how-wpm-is-calculated/', '/ko/guide/tasu-gyesan/'])
    have_articles = any(re.fullmatch(r'/(ko/)?guide/[^/]+/', p) for p in pages)
    if have_articles:
        ok(paired == expect, f'hreflang 짝이 있는 페이지 목록이 다르다: {sorted(set(paired) ^ set(expect))}')
        ok(len([p for p in pages if re.fullmatch(r'/guide/[^/]+/', p)]) >= 3 and len([p for p in pages if re.fullmatch(r'/ko/guide/[^/]+/', p)]) >= 3, '글이 언어판마다 3편 이상이어야 한다')
    for path in ('/ko/sentences/', '/ko/english/'):
        ok(path in pages and not alts[path], f'{path} 는 짝이 없으니 hreflang 이 없어야 한다')

    # 404
    nf = (ROOT / '404.html').read_text(encoding='utf-8')
    ok('noindex' in nf and 'adsbygoogle' not in nf and 'data-ad=' not in nf and 'rel="canonical"' not in nf, '404 는 noindex, 광고 없음, canonical 없음')
    ok('href="/"' in nf and 'href="/ko/"' in nf, '404 에 두 언어 첫 화면 링크')
    pn = Text(); pn.feed(nf)
    ok(not HANGUL.search(''.join(pn.text)), '404(영어)에 lang="ko" 밖 한글')
    # 한 장에 두 언어 틀: 주소가 /ko/ 로 시작하면 한국어 틀만 보인다(첫 그림 전의 스크립트 + CSS)
    ok(nf.count('data-l="en"') == 3 and nf.count('data-l="ko" lang="ko"') == 3, '404: 머리·본문·꼬리마다 두 언어 틀')
    ok("location.pathname" in nf.split('</head>')[0] and "h.lang='ko'" in nf.split('</head>')[0], '404: 주소를 보고 언어를 고르는 스크립트가 <head> 에 있다')
    ok(nf.count('id="lumen"') == 1 and nf.count('<main') == 1 and len(re.findall(r'<nav class="nav', nf)) == 2, '404: id 가 겹치지 않고 메뉴는 언어마다 하나씩')
    for navlink in ('/ko/practice/', '/ko/sentences/', '/ko/english/', '/ko/guide/', '/practice/', '/guide/'):
        ok(f'href="{navlink}"' in nf, f'404 메뉴에 {navlink}')

    # 방침: 웹 비콘 문장, partner-sites 링크, 방문 통계, 저장 키
    js_keys = set()
    for f in (ROOT / 'assets').glob('*.js'):
        js_keys |= set(re.findall(r"'(todok\.[a-z]+)'", f.read_text(encoding='utf-8')))
    ok(js_keys == {'todok.runs', 'todok.best', 'todok.keys', 'todok.set', 'todok.lang'}, f'코드가 쓰는 저장 키 {sorted(js_keys)}')
    for f in (ROOT / 'assets').glob('*.js'):
        s = f.read_text(encoding='utf-8')
        ok('sessionStorage' not in s and 'document.cookie' not in s and 'indexedDB' not in s, f'{f.name} 방침에 없는 저장소를 쓴다')
        ok(not re.search(r'\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket', s), f'{f.name} 밖으로 보내는 코드가 있다(입력은 기기 밖으로 나가지 않아야 한다)')
    for path, words in (('/ko/privacy/', ['웹 비콘', 'Cloudflare Web Analytics', '쿠키']), ('/privacy/', ['web beacons', 'Cloudflare Web Analytics', 'cookies'])):
        src = pages[path]
        ok('https://policies.google.com/technologies/partner-sites' in src, f'{path} partner-sites 링크')
        ok('https://www.cloudflare.com/web-analytics/' in src and 'adssettings.google.com' in src, f'{path} 방문 통계·광고 설정 링크')
        for w in words:
            ok(w in src, f'{path} "{w}" 문장')
        ok(('성능 정보' in src and '브라우저 종류' in src) if path.startswith('/ko/') else ('performance details' in src and 'kind of browser' in src), f'{path} 방문 통계에 브라우저 종류·성능 정보를 밝힌다')
        ok(set(re.findall(r'<code>(todok\.[a-z]+)</code>', src)) == js_keys, f'{path} 저장 키 이름이 코드와 다르다')
        ok(not re.search(r'분석 도구를 쓰지 않|통계를 모으지 않|아무것도 보내지 않|no analytics|do not use analytics|nothing is sent', src, re.I), f'{path} "분석 도구 없음" 뜻의 문장')
        ok('woxocoso@gmail.com' in src and 'jsDelivr' in src, f'{path} 문의·글꼴 안내')
    for path, src in pages.items():
        ok(not re.search(r'아무것도 보내지 않|어떤 정보도 보내지|sends nothing|nothing leaves', src, re.I), f'{path} 너무 넓게 쓴 안심 문구')

    # rss: 한국어 글만
    rss = (ROOT / 'rss.xml').read_text(encoding='utf-8')
    ko_articles = sorted(p for p in pages if re.fullmatch(r'/ko/guide/[^/]+/', p))
    ok(sorted(re.findall(r'<guid>' + re.escape(SITE) + r'([^<]+)</guid>', rss)) == ko_articles, 'rss.xml 은 한국어 글 전부, 그것만')

    # 배포 파일
    ok((ROOT / 'ads.txt').read_text().strip() == 'google.com, pub-9496167591465154, DIRECT, f08c47fec0942fa0', 'ads.txt')
    ok((ROOT / 'googlea614029e84d58498.html').read_text().strip() == 'google-site-verification: googlea614029e84d58498.html', '구글 확인 파일')
    robots = (ROOT / 'robots.txt').read_text()
    ok(f'Sitemap: {SITE}/sitemap.xml' in robots and 'Disallow' not in robots, 'robots.txt')
    wr = (ROOT / 'wrangler.jsonc').read_text(encoding='utf-8')
    ok('"name": "typing"' in wr and '"workers_dev": false' in wr and '"pattern": "typing.lumenlab.page", "custom_domain": true' in wr and '"not_found_handling": "404-page"' in wr, 'wrangler.jsonc')
    ok(all(x in ign for x in ('_dev', 'tests', 'CLAUDE.md', 'wrangler.jsonc', '.assetsignore', '.deploy-actions')), '.assetsignore')
    ok((ROOT / '.deploy-actions').exists() and (ROOT / '.deploy-actions').stat().st_size == 0, '.deploy-actions(빈 파일)')
    for f in ('favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og.png', 'og-ko.png'):
        ok((ROOT / f).exists() and (ROOT / f).stat().st_size > 200, f'{f} 없음')
    for junk in ('.wrangler', 'node_modules', '__pycache__', '_dev/__pycache__'):
        ok(not (ROOT / junk).exists(), f'폴더에 {junk} 가 남아 있다')

    # CSS 기본기
    css = (ROOT / 'assets' / 'style.css').read_text(encoding='utf-8')
    ok('[hidden]{display:none!important}' in css and 'word-break:keep-all' in css and ':focus-visible' in css and 'tabular-nums' in css, 'CSS 기본기(hidden·keep-all·focus-visible·tabular-nums)')
    ok(not re.search(r'transition:\s*all', css), 'transition: all 금지')
    ok('prefers-color-scheme:dark' in css and 'prefers-reduced-motion:reduce' in css and '@media print' in css, 'CSS 어두운 화면·동작 줄이기·인쇄')
    ok('font-display:optional' in (ROOT / 'assets' / 'pretendard.css').read_text(encoding='utf-8'), '글꼴 CSS 는 font-display: optional')
    ok('.seg button{padding:12px' in css and '.btn,.btn.sm{height:44px}' in css, 'CSS 휴대폰에서 누르는 곳 44px')
    ok('html[lang="en"] [data-l="ko"],html[lang="ko"] [data-l="en"]{display:none!important}' in css, 'CSS 두 언어 틀 가운데 하나만 보이기(404)')

    # 조각 글꼴: 화면 글자와 연습 글을 전부 담는다. 모든 페이지가 자기 언어의 조각을 미리 받는다
    fj = ROOT / '_dev' / 'fonts.json'
    ok(fj.exists(), '_dev/fonts.json 없음(python3 -B _dev/font.py)')
    if fj.exists():
        fonts = json.loads(fj.read_text(encoding='utf-8'))
        fdir = ROOT / 'assets' / 'fonts'
        ok(all((fdir / fonts[l]['file']).exists() and (fdir / fonts[l]['file']).stat().st_size == fonts[l]['bytes'] for l in ('en', 'ko')), '조각 글꼴 파일이 있고 크기가 fonts.json 과 같다')
        ok(fonts['ko']['bytes'] < 260_000 and fonts['en']['bytes'] < 60_000, f'조각 글꼴 크기(한국어 {fonts["ko"]["bytes"]:,}, 영어 {fonts["en"]["bytes"]:,} 바이트)')
        for path, src in list(pages.items()) + [('404', nf)]:
            f = fonts['ko' if path.startswith('/ko/') else 'en']['file']
            ok(f'<link rel="preload" href="/assets/fonts/{f}" as="font" type="font/woff2" crossorigin>' in src and f'@font-face{{font-family:"Todok Sans";src:url(/assets/fonts/{f}) format("woff2");font-weight:400 800;font-style:normal;font-display:optional}}' in src,
               f'{path} 자기 언어의 조각 글꼴을 미리 받고 @font-face(Todok Sans, optional)를 갖고 있다')
        need = B.screen_chars()
        for l in ('en', 'ko'):
            have = set(fonts[l]['chars']) | set(fonts[l].get('not_in_source', ''))
            miss = ''.join(sorted(c for c in need[l] if c not in have))
            ok(not miss, f'조각 글꼴({l})이 화면 글자를 전부 담지 못한다 → python3 -B _dev/font.py (안 돌려도 그 글자는 jsDelivr 에서 받아 보인다): {len(miss)}자 {miss[:40]}')
        # 연습 글의 글자는 따로 한 번 더 본다(원본 글꼴에 없는 글자가 연습 글에 있으면 안 된다)
        practice = set(B.js_strings('tj-text-ko.js')) | set(B.js_strings('tj-text-en.js')) | set(B.js_strings('tj-lessons.js'))
        gone = ''.join(sorted(c for c in practice if c >= ' ' and c not in set(fonts['ko']['chars'])))
        ok(not gone, f'연습 글의 글자가 한국어 조각 글꼴에 전부 있어야 한다: {gone[:40]}')
        gone_en = ''.join(sorted(c for c in set(B.js_strings('tj-text-en.js')) if c >= ' ' and c not in set(fonts['en']['chars'])))
        ok(not gone_en, f'영어 연습 글의 글자가 영어 조각 글꼴에 전부 있어야 한다: {gone_en[:40]}')
        junk = [f.name for f in fdir.glob('td-*.woff2') if f.name not in (fonts['en']['file'], fonts['ko']['file'])]
        ok(not junk, f'쓰지 않는 옛 조각 글꼴 파일: {junk}')
        ofl = fdir / 'OFL.txt'
        ok(ofl.exists() and 'SIL OPEN FONT LICENSE' in ofl.read_text(encoding='utf-8') and 'Todok Sans' in ofl.read_text(encoding='utf-8'), '글꼴 라이선스 전문(assets/fonts/OFL.txt)과 이름을 바꿨다는 설명')
        hd = ROOT / '_headers'
        ok(hd.exists() and '/assets/fonts/*' in hd.read_text(encoding='utf-8') and 'immutable' in hd.read_text(encoding='utf-8'), '_headers: 글꼴 조각은 오래 저장')
        ok('"Todok Sans","Pretendard Variable"' in css, 'CSS 글꼴 이름 순서: 조각 → 나눠 받기')
        ok('_headers' not in ign, '.assetsignore 가 _headers 를 빼면 안 된다')
    for f in (ROOT / 'assets').glob('*.js'):
        ok('https://' not in re.sub(r'//.*', '', f.read_text(encoding='utf-8')) or f.name == 'ads-config.js', f'{f.name} 밖 주소를 부른다')

    print(f'정적 검사 {count}개 가운데 실패 {len(fails)}개 (페이지 {len(pages)}쪽 + 404)')
    for f in fails[:60]:
        print('  실패', f)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
