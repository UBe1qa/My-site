#!/usr/bin/env python3
"""정적 검사: python3 chess/_dev/check.py  (빌드한 HTML을 읽는다)
페이지마다 canonical·hreflang 짝·제목·설명, 안쪽 링크가 실제 파일로 이어지는지, 광고 코드 위치, 사이트맵, 저장 키와 방침, JSON-LD."""
import json
import re
import sys
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '_dev'))
from content import STORE_KEYS  # noqa: E402
SITE = 'https://chess.lumenlab.page'
errs = []


class P(HTMLParser):
    def __init__(s):
        super().__init__()
        s.links, s.meta, s.ld, s._ld, s.title, s._t, s.ids = [], {}, [], None, '', False, set()

    def handle_starttag(s, tag, a):
        a = dict(a)
        if 'id' in a:
            s.ids.add(a['id'])
        if tag == 'a' and a.get('href'):
            s.links.append(a['href'])
        if tag == 'link':
            s.meta.setdefault('link', []).append(a)
        if tag == 'meta':
            s.meta.setdefault('meta', []).append(a)
        if tag == 'script' and a.get('type') == 'application/ld+json':
            s._ld = ''
        if tag == 'title':
            s._t = True

    def handle_endtag(s, tag):
        if tag == 'script' and s._ld is not None:
            s.ld.append(s._ld)
            s._ld = None
        if tag == 'title':
            s._t = False

    def handle_data(s, d):
        if s._ld is not None:
            s._ld += d
        if s._t:
            s.title += d


def exists(href):
    p = href.split('#')[0].split('?')[0]
    if not p.startswith('/') or p.startswith('//'):
        return True
    f = ROOT / p.lstrip('/')
    return (f / 'index.html').exists() if p.endswith('/') else f.exists()


pages = sorted(ROOT.glob('**/index.html'))
pages = [p for p in pages if '_dev' not in p.parts and 'tests' not in p.parts]
guides = [p for p in pages if 'guide' in p.parts]       # 루멘랩 홈이 읽는 원본: 배포·사이트맵 밖
pages = [p for p in pages if 'guide' not in p.parts]
if 'guide/' not in (ROOT / '.assetsignore').read_text(encoding='utf-8').split():
    errs.append('.assetsignore 에 guide/ 없음')
if '/guide/' in (ROOT / 'sitemap.xml').read_text(encoding='utf-8'):
    errs.append('사이트맵에 /guide/ 가 있음')
if len(guides) != 4:
    errs.append(f'가이드 HTML {len(guides)}개(목록 2 + 글 2 이어야 함)')
sm = (ROOT / 'sitemap.xml').read_text(encoding='utf-8')
locs = set(re.findall(r'<loc>(.*?)</loc>', sm))
ADS = 'pagead2.googlesyndication.com'
for f in pages + [ROOT / '404.html', ROOT / 'ko' / '404.html']:
    rel = '/' + str(f.relative_to(ROOT)).replace('index.html', '')
    html = f.read_text(encoding='utf-8')
    p = P()
    p.feed(html)
    is404 = f.name == '404.html'
    links = {l.get('rel'): l for l in p.meta.get('link', []) if l.get('rel') == 'canonical'}
    alts = {l.get('hreflang'): l.get('href') for l in p.meta.get('link', []) if l.get('rel') == 'alternate'}
    if not is404:
        canon = links.get('canonical', {}).get('href')
        if canon != SITE + rel:
            errs.append(f'{rel}: canonical {canon}')
        if set(alts) != {'en', 'ko', 'x-default'}:
            errs.append(f'{rel}: hreflang {alts}')
        for h in alts.values():
            if not exists(h.replace(SITE, '')):
                errs.append(f'{rel}: hreflang 대상 없음 {h}')
        if SITE + rel not in locs:
            errs.append(f'{rel}: 사이트맵에 없음')
    desc = [m.get('content') for m in p.meta.get('meta', []) if m.get('name') == 'description']
    if not p.title or not desc or not desc[0]:
        errs.append(f'{rel}: 제목·설명 없음')
    for l in p.links:
        if not exists(l):
            errs.append(f'{rel}: 링크 끊김 {l}')
        if l.startswith('#') and l[1:] and l[1:] not in p.ids:
            errs.append(f'{rel}: 쪽 안 링크 없음 {l}')
    no_ads = is404 or rel.rstrip('/').split('/')[-1] in ('about', 'privacy', 'openings', 'data', 'test')
    if no_ads and ADS in html:
        errs.append(f'{rel}: 광고 코드가 있으면 안 됨')
    if not no_ads and ADS not in html:
        errs.append(f'{rel}: 광고 코드 없음')
    for j in p.ld:
        try:
            json.loads(j)
        except Exception as e:
            errs.append(f'{rel}: JSON-LD {e}')
    if '{' in p.title or re.search(r'\{[a-z_]+\}', re.sub(r'<script.*?</script>', '', html, flags=re.S)):
        errs.append(f'{rel}: 채우지 않은 {{자리}}')
if len(locs) != len([p for p in pages]):
    errs.append(f'사이트맵 {len(locs)}개, 페이지 {len(pages)}개')
js = ''.join((ROOT / 'assets' / n).read_text(encoding='utf-8') for n in ('app.js', 'core.js', 'board.js', 'fx.js'))
used = set(re.findall(r"'(fm\.[a-z]+)'", js))
if used != set(STORE_KEYS):
    errs.append(f'저장 키 {sorted(used)} ≠ 방침 {STORE_KEYS}')
for lang in ('', 'ko/'):
    pv = (ROOT / lang / 'privacy' / 'index.html').read_text(encoding='utf-8')
    for k in STORE_KEYS:
        if k not in pv:
            errs.append(f'/{lang}privacy/: {k} 설명 없음')
if errs:
    print('\n'.join(errs))
    sys.exit(1)
print(f'정적 검사 통과: 페이지 {len(pages) + 1}개, 사이트맵 {len(locs)}개')
