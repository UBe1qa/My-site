#!/usr/bin/env python3
"""배포 전 검사 (만든 HTML 기준). python3 _dev/check.py  → 문제 없으면 '검사 통과'"""
import os, re, sys, glob, xml.etree.ElementTree as ET
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://calc.lumenlab.page'
bad = []
def err(m): bad.append(m)
pages = {}
for f in glob.glob(os.path.join(ROOT, '**', 'index.html'), recursive=True):
    rel = '/' + os.path.relpath(os.path.dirname(f), ROOT).replace('\\', '/') + '/'
    rel = rel.replace('/./', '/')
    if rel.startswith('/tests') or rel.startswith('/_dev') or rel.startswith('/tools'): continue
    pages[rel] = open(f, encoding='utf-8').read()
titles, descs = {}, {}
for p, h in pages.items():
    t = re.search(r'<title>(.*?)</title>', h); d = re.search(r'<meta name="description" content="(.*?)">', h)
    if not t or not d: err(p + ' 제목/설명 없음'); continue
    if t.group(1) in titles: err('제목 겹침: %s, %s' % (p, titles[t.group(1)]))
    if d.group(1) in descs: err('설명 겹침: %s, %s' % (p, descs[d.group(1)]))
    titles[t.group(1)] = p; descs[d.group(1)] = p
    c = re.search(r'<link rel="canonical" href="(.*?)">', h)
    if not c or c.group(1) != SITE + p: err(p + ' canonical 다름: ' + (c.group(1) if c else '없음'))
    if re.search(r'noindex|nosnippet|max-snippet', h): err(p + ' noindex/nosnippet 있음')
    lang = re.search(r'<html lang="(\w+)">', h).group(1)
    if lang != ('en' if p.startswith('/en/') else 'ko'): err(p + ' html lang 틀림')
    alts = dict((m.group(1), m.group(2)) for m in re.finditer(r'<link rel="alternate" hreflang="([\w-]+)" href="(.*?)">', h))
    if alts:
        if alts.get(lang) != SITE + p: err(p + ' hreflang 자기 자신 없음')
        other = alts.get('en' if lang == 'ko' else 'ko')
        op = other[len(SITE):] if other else None
        if op not in pages: err(p + ' hreflang 짝 페이지 없음 ' + str(op))
        elif ('hreflang="%s" href="%s"' % (lang, SITE + p)) not in pages[op]: err(p + ' hreflang 짝이 되돌아오지 않음')
        if alts.get('x-default', '').startswith(SITE + '/en/') is False: err(p + ' x-default 가 영어판 아님')
    if 'adsbygoogle.js' not in h: err(p + ' 광고 코드 없음')
    # 가이드는 2026-10-29 lumenlab.page/guides/calc/ 로 옮겼다: 이 사이트의 /guide/ 로 링크하지 않고, RSS 링크도 없다
    if re.search(r'href="(/en)?/guide[/"#]', h): err(p + ' 옮긴 가이드 주소(/guide/)로 링크')
    if 'application/rss+xml' in h: err(p + ' RSS 링크가 남아 있음')
    for m in re.finditer(r'href="(/[^"#?]*)', h):
        u = m.group(1)
        if u.startswith('/assets/') or u in ('/favicon.ico', '/favicon.svg', '/apple-touch-icon.png'):
            if not os.path.exists(os.path.join(ROOT, u.lstrip('/').split('?')[0])): err(p + ' 없는 파일 ' + u)
            continue
        if u not in pages: err(p + ' 내부 링크 깨짐 ' + u)
# 404
h404 = open(os.path.join(ROOT, '404.html'), encoding='utf-8').read()
if 'adsbygoogle' in h404: err('404에 광고 코드')
if 'noindex' not in h404: err('404에 noindex 없음')
# 방침
for p in ('/privacy/', '/en/privacy/'):
    if 'policies.google.com/technologies/partner-sites' not in pages[p] or ('웹 비콘' not in pages[p] and 'web beacons' not in pages[p]): err(p + ' 방침 광고 문장 빠짐')
# sitemap
sm = ET.parse(os.path.join(ROOT, 'sitemap.xml')).getroot()
ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
locs = [u.find('s:loc', ns).text for u in sm.findall('s:url', ns)]
# sitemap = 가이드를 뺀 페이지 전부(가이드 HTML 은 lumenlab.page 가 읽는 원본으로 계속 만들지만 여기 싣지 않는다)
if sorted(l[len(SITE):] for l in locs) != sorted(p for p in pages if '/guide/' not in p): err('sitemap 과 페이지 목록(가이드 뺀)이 다름')
if any('/guide/' in l for l in locs): err('sitemap 에 옮긴 가이드 주소')
# 첫 화면의 가이드 목록은 lumenlab.page/guides/calc/ 로
for p, pre in (('/', ''), ('/en/', '/en')):
    if 'href="https://lumenlab.page%s/guides/calc/' % pre not in pages[p]: err(p + ' 가이드 목록이 lumenlab.page%s/guides/calc/ 로 안 감' % pre)
# RSS 는 lumenlab.page/guides/rss.xml 이 낸다(예전 /rss.xml 은 _redirects 가 301)
if os.path.exists(os.path.join(ROOT, 'rss.xml')): err('rss.xml 이 남아 있음')
for f in ('robots.txt', 'favicon.ico', 'apple-touch-icon.png', 'ads.txt', 'favicon.svg'):
    if not os.path.exists(os.path.join(ROOT, f)): err(f + ' 없음')
if bad:
    print('\n'.join('✗ ' + b for b in bad)); sys.exit(1)
print('검사 통과: 페이지 %d개' % len(pages))
