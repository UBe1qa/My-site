#!/usr/bin/env python3
"""만든 HTML을 검사한다(check.sh 가 부른다): python3 calendar/_dev/check.py
제목·설명 겹침, canonical·sitemap·내부 링크, hreflang 짝, <html lang>, 영어 페이지의 한글, JSON-LD = 화면 글자,
방침 문구(방문 통계 = Cloudflare Web Analytics, '분석 도구 없음' 문장 금지), 광고 없는 페이지, 첫 HTML의 제목·본문·링크,
받는 파일·PDF 글꼴이 실제로 있는지, 표가 가로로 밀리는 칸 안에 있는지, 글 속 광고 자리가 받기 단추 아래인지, 종이 그림에 말줄임이 없는지."""
import sys
sys.dont_write_bytecode = True
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://calendar.lumenlab.page'
SKIP = {'_dev', 'tests', 'assets', 'files'}
fails, passes = [], 0


def check(cond, msg):
    global passes
    if cond:
        passes += 1
    else:
        fails.append(msg)


class Doc(HTMLParser):
    VOID = {'meta', 'link', 'br', 'img', 'input', 'hr', 'source', 'path', 'rect'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []          # (tag, lang)
        self.lang = None
        self.title = ''
        self.desc = None
        self.canon = None
        self.alts = {}
        self.links = []
        self.ids = set()
        self.ld = []
        self.h1 = ''
        self.hangul_outside = []
        self.text = []
        self.robots = None
        self.scripts = []
        self._cap = None
        self._buf = ''
        self.faq = []
        self._q = None

    def cur_lang(self):
        for t, l in reversed(self.stack):
            if l:
                return l
        return self.lang

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html':
            self.lang = a.get('lang')
        if 'id' in a:
            self.ids.add(a['id'])
        if tag == 'meta' and a.get('name') == 'description':
            self.desc = a.get('content')
        if tag == 'meta' and a.get('name') == 'robots':
            self.robots = a.get('content')
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canon = a.get('href')
        if tag == 'link' and a.get('rel') == 'alternate' and a.get('hreflang'):
            self.alts[a['hreflang']] = a.get('href')
        if tag == 'a' and 'href' in a:
            self.links.append(a['href'])
        if tag == 'script':
            self.scripts.append(a.get('src', ''))
        if tag in ('title', 'h1', 'summary') or (tag == 'script' and a.get('type') == 'application/ld+json'):
            self._cap, self._buf = ('ld' if tag == 'script' else tag), ''
        if tag == 'p' and self._q is not None and self.stack and self.stack[-1][0] == 'details':
            self._cap, self._buf = 'answer', ''
        if tag not in self.VOID:
            self.stack.append((tag, a.get('lang')))

    def handle_endtag(self, tag):
        if self._cap == 'ld' and tag == 'script':
            self.ld.append(json.loads(self._buf)); self._cap = None
        elif self._cap == tag and tag in ('title', 'h1'):
            setattr(self, tag, self._buf.strip()); self._cap = None
        elif self._cap == 'summary' and tag == 'summary':
            self._q = self._buf.strip(); self._cap = None
        elif self._cap == 'answer' and tag == 'p':
            self.faq.append((self._q, self._buf.strip())); self._q = None; self._cap = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self._cap:
            self._buf += data
        tags = [t for t, _ in self.stack]
        if 'script' in tags or 'style' in tags:
            return
        self.text.append(data)
        if re.search('[가-힣ㄱ-ㆎ]', data) and self.cur_lang() != 'ko':
            self.hangul_outside.append(data.strip()[:40])


def main():
    pages = {}
    for f in sorted(ROOT.rglob('index.html')):
        rel = f.relative_to(ROOT)
        if rel.parts[0] in SKIP:
            continue
        url = '/' + '/'.join(rel.parts[:-1]) + ('/' if len(rel.parts) > 1 else '')
        d = Doc()
        d.feed(f.read_text(encoding='utf-8'))
        d.raw = f.read_text(encoding='utf-8')
        pages[url] = d
    sitemap = re.findall(r'<loc>(.*?)</loc>', (ROOT / 'sitemap.xml').read_text(encoding='utf-8'))
    check(len(pages) == 60, f'페이지 수 60이어야 함: {len(pages)}')
    check(sorted(sitemap) == sorted(SITE + u for u in pages), 'sitemap 주소 = 페이지 주소')

    titles, descs = {}, {}
    for url, d in pages.items():
        ko = url.startswith('/ko/')
        check(d.lang == ('ko' if ko else 'en'), f'{url} <html lang> = {d.lang}')
        check(d.title and d.desc and d.h1, f'{url} 제목·설명·h1')
        check(50 <= len(d.desc or '') <= 230, f'{url} 설명 길이 {len(d.desc or "")}')
        titles.setdefault(d.title, []).append(url)
        descs.setdefault(d.desc, []).append(url)
        check(d.canon == SITE + url, f'{url} canonical = {d.canon}')
        check(d.robots is None and 'nosnippet' not in d.raw, f'{url} noindex·nosnippet 없음')
        # hreflang: 있으면 자기 자신 + 짝 + x-default(영어), 짝도 서로 가리킨다
        if d.alts:
            check(set(d.alts) == {'en', 'ko', 'x-default'}, f'{url} hreflang 세 개')
            check(d.alts.get('ko' if ko else 'en') == SITE + url, f'{url} hreflang 자기 자신')
            check(d.alts.get('x-default') == d.alts.get('en'), f'{url} x-default = 영어')
            other = d.alts.get('en' if ko else 'ko', '').replace(SITE, '')
            check(other in pages and pages[other].alts.get('ko' if ko else 'en') == SITE + url, f'{url} hreflang 짝이 서로 가리킴 ({other})')
        # 내부 링크
        for h in d.links:
            if h.startswith(('http', 'mailto:')):
                check(not h.startswith(SITE), f'{url} 내부 링크는 경로로: {h}')
                continue
            path, _, frag = h.partition('#')
            path = path.partition('?')[0]
            if h.startswith('#'):
                check(frag in d.ids, f'{url} 없는 #해시 {h}')
                continue
            if path.startswith('/files/'):
                check((ROOT / path.lstrip('/')).exists(), f'{url} 없는 파일 {path}')
                continue
            check(path in pages, f'{url} 깨진 내부 링크 {h}')
            check('.html' not in path, f'{url} .html 링크 {h}')
            if frag:
                check(path in pages and frag in pages[path].ids, f'{url} 없는 #해시 {h}')
        # 영어 페이지의 한글은 lang="ko" 안에만
        if not ko:
            check(not d.hangul_outside, f'{url} lang="ko" 밖 한글: {d.hangul_outside[:3]}')
        # 광고: 소개·방침·고지에는 없고, 나머지에는 head 코드와 자리
        no_ads = any(url.endswith(x) for x in ('about/', 'privacy/', 'licenses/'))
        check(('adsbygoogle' in d.raw) != no_ads, f'{url} 광고 코드 {"없어야" if no_ads else "있어야"} 함')
        if not no_ads:
            check(d.raw.count('data-ad="') in (1, 2, 3), f'{url} 광고 자리 수 {d.raw.count(chr(100) + "ata-ad=")}')
        # JSON-LD = 화면 글자
        for j in d.ld:
            t = j.get('@type')
            if t == 'FAQPage':
                got = [(q['name'], q['acceptedAnswer']['text']) for q in j['mainEntity']]
                check(got == d.faq and len(got) > 0, f'{url} FAQPage = 화면의 질문·답')
            if t == 'Article':
                check(j['headline'] == d.h1, f'{url} Article headline = h1')
            if t == 'BreadcrumbList':
                check(j['itemListElement'][-1]['item'] == SITE + url, f'{url} Breadcrumb 마지막 = 이 페이지')
                check(all(i['item'].replace(SITE, '') in pages for i in j['itemListElement']), f'{url} Breadcrumb 주소가 실제 페이지')
        check(not any(j.get('@type') == 'FAQPage' for j in d.ld) or d.faq, f'{url} FAQPage 는 화면에 FAQ가 있을 때만')
        body_text = ' '.join(''.join(d.text).split())
        check(len(body_text) > 300 and sum(1 for h in d.links if h.startswith('/')) >= 5, f'{url} 첫 HTML에 본문·내부 링크')
        check('—' not in body_text, f'{url} 줄표(—)')
        # 3단계에서 바꾼 말: '고친 날' → '마지막 확인', '관측일' → '대신 쉬는 날'
        check(not re.search(r'고친 날|관측일|>Updated ', d.raw), f'{url} 옛 표현(고친 날·관측일·Updated)')
        # 표는 모두 가로로 밀 수 있는 칸(.tbl-wrap) 안에(큰 달 표 .wm 은 빼고)
        check(len(re.findall(r'<table(?! class="wm")', d.raw)) == len(re.findall(r'<div class="tbl-wrap"[^>]*><table', d.raw)), f'{url} 표가 .tbl-wrap 안에')
        # 첫 HTML에 든 종이 그림: 말줄임·'+N more'·'외 N일' 없음
        for svg in re.findall(r'<svg[^>]*class="sheet-svg".*?</svg>', d.raw, flags=re.S):
            check(not re.search(r'…|\+\d+ more|외 \d+일', svg), f'{url} 종이 그림에 말줄임')
        # 글: 글 속 광고 자리(mid)는 받기 단추(cta) 아래
        if '/guide/' in url and url.rstrip('/').split('/')[-1] != 'guide':
            check(0 < d.raw.find('btn btn-main cta') < d.raw.find('data-ad="mid"'), f'{url} 글 속 광고 자리는 받기 단추 아래')
            check(('마지막 확인 2026년' in d.raw) if ko else ('Last checked ' in d.raw), f'{url} 마지막 확인 날짜')
    for t, us in titles.items():
        check(len(us) == 1, f'제목 겹침: {t} {us}')
    for t, us in descs.items():
        check(len(us) == 1, f'설명 겹침: {us}')
    # 방침
    for u in ('/privacy/', '/ko/privacy/'):
        raw = pages[u].raw
        check('https://policies.google.com/technologies/partner-sites' in raw, f'{u} partner-sites 링크')
        check(('web beacons' in raw) if u == '/privacy/' else ('웹 비콘' in raw), f'{u} 웹 비콘 문장')
        check('cal.lang' in raw, f'{u} 저장 항목 이름(cal.lang)')
        # 방문 통계: 실제 주소에서는 Cloudflare Web Analytics 가 돈다 → 방침에 적혀 있어야 하고, '분석 도구를 안 쓴다'는 말은 없어야 한다
        check('Cloudflare Web Analytics' in raw and 'https://www.cloudflare.com/web-analytics/' in raw, f'{u} 방문 통계(Cloudflare Web Analytics)와 링크')
        check(not re.search(r'분석 도구[^.]{0,20}(쓰지 않|없)|통계[^.]{0,12}(모으지 않|수집하지 않)|do(es)? not use[^.]{0,30}analytics|no analytics', raw, flags=re.I), f'{u} "분석 도구 없음" 뜻의 문장이 없어야 함')
    for u in ('/about/', '/ko/about/', '/', '/ko/'):
        raw = pages[u].raw
        check(not re.search(r'어디에도 (보내|전송)|아무것도 (보내|전송)|설정은 이 기기 밖으로|settings never leave|not sent anywhere\. See|sends nothing', raw.replace('The files you make are not sent anywhere', '')), f'{u} 넓게 쓴 "아무것도 보내지 않아요" 문장')
    app = (ROOT / 'assets' / 'app.js').read_text(encoding='utf-8')
    keys = set(re.findall(r"localStorage\.(?:setItem|getItem)\('([^']+)'", app))
    check(keys == {'cal.lang'}, f'app.js 가 쓰는 localStorage 항목 = 방침에 적은 것: {keys}')
    # 404
    nf = (ROOT / '404.html').read_text(encoding='utf-8')
    check('adsbygoogle' not in nf and 'noindex' in nf, '404: 광고 없음, noindex')
    # 꼭 있어야 하는 파일
    for f in ('ads.txt', 'robots.txt', 'googlea614029e84d58498.html', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og.png', 'og-ko.png', 'rss.xml',
              'wrangler.jsonc', '.assetsignore', '.deploy-actions', 'assets/ads-config.js'):
        check((ROOT / f).exists(), f'파일 없음: {f}')
    check((ROOT / 'ads.txt').read_text().strip() == 'google.com, pub-9496167591465154, DIRECT, f08c47fec0942fa0', 'ads.txt 내용')
    check(f'Sitemap: {SITE}/sitemap.xml' in (ROOT / 'robots.txt').read_text(), 'robots.txt Sitemap 줄')
    rss = (ROOT / 'rss.xml').read_text(encoding='utf-8')
    check(rss.count('<item>') == sum(1 for u in pages if u.startswith('/ko/guide/') and u != '/ko/guide/'), 'rss = 한국어 글 수')
    pdfs = sorted((ROOT / 'files').glob('*.pdf'))
    check(len(pdfs) == 27 and len(list((ROOT / 'files').glob('*.xlsx'))) == 3, '받는 파일 PDF 27 + 엑셀 3')
    for f in pdfs:   # 문서 정보에 만든 프로그램 이름(HeadlessChrome·Skia)이 남지 않고 사이트 이름과 제목이 들어 있다
        data = f.read_bytes()
        check(b'HeadlessChrome' not in data and b'Skia/PDF' not in data and b'/Title' in data and b'/Producer' in data, f'{f.name} 문서 정보(제목·만든 곳)')
    # 내 설정 PDF에 담는 글꼴과 글자 폭 표
    m = json.loads((ROOT / 'assets' / 'fonts' / 'metrics.json').read_text(encoding='utf-8'))
    for w in ('500', '600', '700', '800'):
        f = ROOT / 'assets' / 'fonts' / f'onesheet-{w}.ttf'
        check(f.exists() and f.stat().st_size == m['bytes'][w] and len(m['adv'][w]) == m['n'], f'PDF 글꼴 onesheet-{w}.ttf = metrics.json')
    check((ROOT / 'assets' / 'pdf.js').exists(), 'assets/pdf.js')
    junk = [str(p) for p in ROOT.rglob('*') if p.name in ('__pycache__', 'node_modules', '.wrangler')]
    check(not junk, f'남으면 안 되는 폴더: {junk}')
    print(f'HTML 검사: 통과 {passes}, 실패 {len(fails)}')
    for m in fails[:40]:
        print('  ✗', m)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
