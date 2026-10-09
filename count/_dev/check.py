#!/usr/bin/env python3
"""만든 HTML 정적 검사: python3 count/_dev/check.py   (표준 라이브러리만)

보는 것: 페이지마다 title·description 다름 / canonical = sitemap 주소 = 내부 링크 주소(끝 /까지), 깨진 내부 링크·#해시 0 /
hreflang 짝·자기 자신·x-default / <html lang> / 영어 페이지의 lang="ko" 밖 한글 0 / FAQPage·Article JSON-LD가 화면 글자와 같음 /
방침의 웹 비콘 문장과 partner-sites 링크 / 광고 없는 페이지에 adsbygoogle 없음, 도구·글 페이지엔 있음 / 첫 HTML에 제목·본문·내부 링크 /
공개 페이지에 noindex 없음 / .html 링크 없음 / 화면 글에 줄표(—) 없음.
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://count.lumenlab.page'
NO_ADS = ('/about/', '/privacy/', '/licenses/', '/guide/', '/ko/about/', '/ko/privacy/', '/ko/licenses/', '/ko/guide/')
fails, passed = [], 0


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
        self.ld = []; self.h1 = ''; self.robots = None; self.scripts = []; self.faq = []; self.visible = []; self.hangul_out = []
        self.stack = []  # (tag, in_ko)
        self._cap = None; self._buf = ''; self._skip = 0; self._faq_q = None; self._ads = 0
        self.feed(text)

    def in_ko(self):
        return any(k for _, k in self.stack)

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
        if tag == 'a' and a.get('href') is not None:
            self.links.append((a['href'], a.get('lang')))
        if tag == 'script':
            self.scripts.append(a.get('src') or '')
            if a.get('type') in ('application/ld+json', 'application/json'):
                self._cap = ('ld' if a.get('type') == 'application/ld+json' else 'json'); self._buf = ''
            else:
                self._skip += 1
        if tag in ('style', 'template'):
            self._skip += 1
        if 'data-ad' in a:
            self._ads += 1
        if tag == 'section':
            self._in_faq = 'faq' in (a.get('class') or '').split()
        for t in ('title', 'h1', 'summary'):
            if tag == t and (t != 'summary' or getattr(self, '_in_faq', False)):
                self._cap = t; self._buf = ''
        if tag == 'p' and self._faq_q is not None:
            self._cap = 'faq_a'; self._buf = ''
        if tag not in self.VOID:
            self.stack.append((tag, a.get('lang') == 'ko'))
        for k in ('placeholder', 'aria-label', 'content', 'title', 'alt'):
            v = a.get(k)
            if v and re.search(r'[ᄀ-ᇿ㄰-㆏가-힣]', v) and not (a.get('lang') == 'ko' or self.in_ko()):
                if not (tag == 'meta' and a.get('property', '').startswith('og:') and self.lang == 'ko'):
                    self.hangul_out.append(f'{tag}@{k}: {v[:30]}')

    def handle_endtag(self, tag):
        if tag in ('script',) and self._cap in ('ld', 'json'):
            if self._cap == 'ld':
                self.ld.append(json.loads(self._buf))
            self._cap = None
        elif tag in ('script', 'style', 'template'):
            self._skip = max(0, self._skip - 1)
        if tag == 'section':
            self._in_faq = False
        if tag == 'title' and self._cap == 'title':
            self.title = self._buf.strip(); self._cap = None
        if tag == 'h1' and self._cap == 'h1':
            self.h1 = self._buf.strip(); self._cap = None
        if tag == 'summary' and self._cap == 'summary':
            self._faq_q = self._buf.strip(); self._cap = None
        if tag == 'p' and self._cap == 'faq_a':
            self.faq.append((self._faq_q, self._buf.strip())); self._faq_q = None; self._cap = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self._cap:
            self._buf += data
        if self._cap in ('ld', 'json') or self._skip:
            return
        self.visible.append(data)
        if re.search(r'[ᄀ-ᇿ㄰-㆏가-힣]', data) and not self.in_ko():
            self.hangul_out.append(data.strip()[:30])


def main():
    sm = [u.text for u in ET.parse(ROOT / 'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    paths = [u[len(SITE):] for u in sm]
    ok(len(paths) == len(set(paths)), 'sitemap에 같은 주소가 두 번')
    docs = {}
    for p in paths:
        f = ROOT / p.lstrip('/') / 'index.html'
        ok(f.exists(), f'sitemap 주소에 파일이 없음: {p}')
        if f.exists():
            docs[p] = Doc(f.read_text(encoding='utf-8'))
    built = {'/' + str(f.parent.relative_to(ROOT)).replace('.', '').strip('/') + ('/' if str(f.parent.relative_to(ROOT)) != '.' else '')
             for f in ROOT.rglob('index.html') if '_dev' not in f.parts}
    built = {b if b != '//' else '/' for b in built}
    ok(built == set(paths), f'sitemap과 만든 페이지가 다름: {sorted(built ^ set(paths))}')

    titles, descs = {}, {}
    for p, d in docs.items():
        ko = p.startswith('/ko/')
        ok(d.lang == ('ko' if ko else 'en'), f'{p}: <html lang>={d.lang}')
        ok(bool(d.title) and bool(d.desc) and bool(d.h1), f'{p}: title·description·h1 가운데 빈 것')
        ok(d.title not in titles, f'{p}: title이 {titles.get(d.title)}와 같음'); titles[d.title] = p
        ok(d.desc not in descs, f'{p}: description이 {descs.get(d.desc)}와 같음'); descs[d.desc] = p
        ok(d.canon == SITE + p, f'{p}: canonical={d.canon}')
        ok(d.robots is None, f'{p}: 공개 페이지에 robots 메타({d.robots})')
        ok(len(''.join(d.visible)) > 400, f'{p}: 첫 HTML 본문이 너무 짧음')
        internal = [h for h, _ in d.links if h.startswith('/')]
        ok(len(internal) >= 5, f'{p}: 첫 HTML 내부 링크가 적음({len(internal)})')
        # 내부 링크·해시
        for h, lang in d.links:
            if h.startswith('#'):
                ok(h[1:] in d.ids, f'{p}: 없는 #해시 {h}')
            elif h.startswith('/'):
                path, _, frag = h.partition('#')
                ok('.html' not in path, f'{p}: .html 링크 {h}')
                ok(path in docs, f'{p}: 깨진 내부 링크 {h}')
                if frag and path in docs:
                    ok(frag in docs[path].ids, f'{p}: 없는 #해시 {h}')
                if not ko and path.startswith('/ko/'):
                    ok(lang == 'ko', f'{p}: 한국어 페이지로 가는 링크에 lang="ko" 없음 {h}')
        # hreflang
        if d.alts:
            ok(set(d.alts) == {'en', 'ko', 'x-default'}, f'{p}: hreflang 묶음 {sorted(d.alts)}')
            ok(d.alts.get('ko' if ko else 'en') == SITE + p, f'{p}: hreflang에 자기 자신이 없음')
            ok(d.alts.get('x-default') == d.alts.get('en'), f'{p}: x-default가 영어판이 아님')
            other = (d.alts.get('en' if ko else 'ko') or '')[len(SITE):]
            ok(other in docs and docs[other].alts.get('ko' if ko else 'en') == SITE + p, f'{p}: hreflang 짝({other})이 되돌아오지 않음')
        # 영어 페이지의 한글
        if not ko:
            ok(not d.hangul_out, f'{p}: lang="ko" 밖 한글 {d.hangul_out[:3]}')
        # 광고 코드
        has_ads = any('adsbygoogle' in s for s in d.scripts)
        if p in NO_ADS:
            ok(not has_ads and d._ads == 0, f'{p}: 광고 없는 페이지에 광고 코드')
        else:
            ok(has_ads and d._ads >= 2, f'{p}: 광고 코드·자리({d._ads})가 없음')
        ok(any('ads-config.js' in s for s in d.scripts) == has_ads, f'{p}: ads-config.js와 광고 코드가 짝이 안 맞음')
        # JSON-LD
        types = [j.get('@type') for j in d.ld]
        faq_ld = [j for j in d.ld if j.get('@type') == 'FAQPage']
        if d.faq or faq_ld:
            got = [(q['name'], q['acceptedAnswer']['text']) for q in (faq_ld[0]['mainEntity'] if faq_ld else [])]
            ok(got == d.faq, f'{p}: FAQPage와 화면 FAQ가 다름')
        if '/guide/' in p and not p.endswith('/guide/'):
            art = [j for j in d.ld if j.get('@type') == 'Article']
            ok(bool(art) and art[0]['headline'] == d.h1 and art[0]['description'] == d.desc and art[0]['mainEntityOfPage'] == SITE + p, f'{p}: Article JSON-LD가 화면과 다름')
            ok('BreadcrumbList' in types, f'{p}: BreadcrumbList 없음')
        elif p not in NO_ADS:
            ok('WebApplication' in types, f'{p}: WebApplication 없음')
            app = [j for j in d.ld if j.get('@type') == 'WebApplication'][0]
            ok(app['url'] == SITE + p and app['description'] == d.desc, f'{p}: WebApplication 주소·설명이 화면과 다름')
        ok(not any(k in json.dumps(d.ld) for k in ('aggregateRating', 'review')), f'{p}: 없는 평점·후기')
        ok('—' not in ''.join(d.visible).replace('(—)', ''), f'{p}: 화면 글에 줄표(—)')
    # 방침
    for p, word in (('/privacy/', 'web beacons'), ('/ko/privacy/', '웹 비콘')):
        t = (ROOT / p.lstrip('/') / 'index.html').read_text(encoding='utf-8')
        ok(word in t and 'https://policies.google.com/technologies/partner-sites' in t, f'{p}: 웹 비콘 문장·partner-sites 링크')
        for key in ('kk.lang', 'kk.jasoseo.on', 'kk.jasoseo'):
            ok(key in t, f'{p}: 저장 항목 {key}가 방침에 없음')
    # app.js가 쓰는 localStorage 키 = 방침에 적은 키
    keys = set(re.findall(r"'(kk\.[a-z.]+)'", (ROOT / 'assets' / 'app.js').read_text(encoding='utf-8')))
    ok(keys == {'kk.lang', 'kk.jasoseo', 'kk.jasoseo.on'}, f'app.js의 저장 키가 방침과 다름: {sorted(keys)}')
    # 404
    nf = (ROOT / '404.html').read_text(encoding='utf-8')
    ok('adsbygoogle' not in nf and 'noindex' in nf, '404: 광고 코드가 없고 noindex여야 함')
    # 그 밖의 파일
    ok((ROOT / 'ads.txt').read_text().strip() == 'google.com, pub-9496167591465154, DIRECT, f08c47fec0942fa0', 'ads.txt')
    ok((ROOT / 'googlea614029e84d58498.html').read_text().strip() == 'google-site-verification: googlea614029e84d58498.html', '구글 확인 파일')
    ok('Sitemap: https://count.lumenlab.page/sitemap.xml' in (ROOT / 'robots.txt').read_text(), 'robots.txt Sitemap 줄')
    for f in ('favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og.png', 'og-ko.png', 'wrangler.jsonc', '.assetsignore', '.deploy-actions', 'rss.xml'):
        ok((ROOT / f).exists(), f'{f} 없음')
    rss = (ROOT / 'rss.xml').read_text(encoding='utf-8')
    ok(rss.count('<item>') == sum(1 for p in paths if p.startswith('/ko/guide/') and p != '/ko/guide/'), 'rss.xml 글 수 = 한국어 글 수')
    for junk in ('node_modules', '__pycache__', '.wrangler'):
        ok(not list(ROOT.rglob(junk)), f'폴더 안에 {junk}가 남아 있음')
    # 확인 안 된 값이 화면에 없는지: limits.json 의 verified=false 항목 이름
    lim = json.loads((ROOT / '_dev' / 'limits.json').read_text(encoding='utf-8'))
    ok(all(v.get('verified') is False for k, v in lim.items() if isinstance(v, dict)), 'limits.json: 확인된 값이 생겼으면 화면에 쓸지 정하고 이 검사를 고친다')
    allhtml = ''.join(''.join(d.visible) for d in docs.values())
    for word in ('나이스', 'NEIS', '인스타그램', 'Instagram', 'LMS'):
        ok(word not in allhtml, f'확인 안 된 주제({word})가 화면에 있음')

    print(f'{"실패" if fails else "통과"}  정적 검사: {passed}개 통과' + (f', {len(fails)}개 실패' if fails else '') + f' (페이지 {len(docs)}장)')
    for m in fails[:40]:
        print('   -', m)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
