#!/usr/bin/env python3
"""오래QR 정적 검사: python3 qr/_dev/check.py   (만든 HTML·배포 파일을 읽어 본다. 화면을 눌러 보는 확인은 e2e.py)
보는 것: 제목 65자·설명 160자 안, 페이지마다 다름 / canonical = sitemap = 내부 링크(끝 / 까지), 깨진 내부 링크 0 / hreflang 짝·자기 자신·x-default 하나 /
<html lang> / 영어 페이지의 lang="ko" 밖 한글 0 / JSON-LD 종류(도구 WebApplication, 글 Article+BreadcrumbList, FAQPage 는 화면 FAQ 와 같음) /
광고 코드가 있어야 할 곳(도구·글)·없어야 할 곳(소개·방침·가이드 목록·404) / 방침: 웹 비콘·partner-sites·Cloudflare Web Analytics·저장 키 = 코드 키, '분석 도구 없음' 금지 /
꼬리말 상표 문장 / 루멘랩 링크(언어별) / 같은 id 0 / 404 두 언어 틀·noindex / 배포 파일(wrangler·assetsignore·_headers·ads.txt·확인 파일·robots) / 외부 스크립트는 애드센스뿐 /
화면 한도 숫자(대량 1,000) = 코드 값 / 글(articles.py)이 있으면 출처·마지막 확인 날짜.
"""
import sys
sys.dont_write_bytecode = True
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '_dev'))
import content as C  # noqa: E402
import build as B  # noqa: E402
SITE = 'https://qr.lumenlab.page'
fails, count = [], 0


def ok(cond, msg):
    global count
    count += 1
    if not cond:
        fails.append(msg)


class P(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.alts, self.ids, self.ld, self.scripts, self.title, self.desc, self.canon, self.robots = [], [], [], [], [], '', '', '', ''
        self._t = self._ld = False
        self.text_ko_outside = []
        self.stack = []
        self.lang = ''

    def handle_starttag(self, tag, a):
        a = dict(a)
        if tag == 'html':
            self.lang = a.get('lang', '')
        if tag not in ('meta', 'link', 'img', 'input', 'br', 'source', 'path', 'rect', 'circle', 'stop', 'image', 'hr'):
            self.stack.append(a.get('lang'))
        if 'id' in a:
            self.ids.append(a['id'])
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canon = a['href']
        if tag == 'link' and a.get('rel') == 'alternate' and a.get('hreflang'):
            self.alts.append((a['hreflang'], a['href']))
        if tag == 'meta' and a.get('name') == 'description':
            self.desc = a.get('content', '')
        if tag == 'meta' and a.get('name') == 'robots':
            self.robots = a.get('content', '')
        if tag == 'title':
            self._t = True
        if tag == 'script':
            if a.get('src'):
                self.scripts.append(a['src'])
            self._ld = a.get('type') == 'application/ld+json'
            self._buf = ''

    def handle_endtag(self, tag):
        if tag == 'title':
            self._t = False
        if tag == 'script' and self._ld:
            self.ld.append(json.loads(self._buf))
            self._ld = False
        if tag not in ('meta', 'link', 'img', 'input', 'br', 'source', 'path', 'rect', 'circle', 'stop', 'image', 'hr') and self.stack:
            self.stack.pop()

    def handle_data(self, d):
        if self._t:
            self.title += d
        if self._ld:
            self._buf += d
        if re.search(r'[가-힣]', d) and 'ko' not in [x for x in self.stack if x]:
            self.text_ko_outside.append(d.strip()[:30])


def parse(rel):
    p = P()
    txt = (ROOT / rel).read_text(encoding='utf-8')
    # 스크립트 속 JSON(설정)은 검사에서 뺀다(화면 글이 아님)
    p.feed(re.sub(r'<script type="application/json"[^>]*>.*?</script>', '', txt, flags=re.S))
    return p, txt


out, paths = B.build()
ok(B.main.__module__ == 'build', 'build')
# 빌드 결과가 최신
for rel, text in out.items():
    f = ROOT / rel
    ok(f.exists() and f.read_text(encoding='utf-8') == text, f'빌드 결과가 낡음: {rel}')

pages = {}
for path in paths:
    rel = path.lstrip('/') + 'index.html'
    pages[path] = parse(rel)
titles, descs = {}, {}
sitemap = re.findall(r'<loc>(.*?)</loc>', (ROOT / 'sitemap.xml').read_text())
ok(sorted(sitemap) == sorted(SITE + p for p in paths), 'sitemap = 만든 페이지')
NOADS = {'/guide/', '/ko/guide/', '/about/', '/ko/about/', '/privacy/', '/ko/privacy/'}
for lang, pre in (('en', '/'), ('ko', '/ko/')):
    ok(B.has_guide(lang) == ((pre + 'guide/') in paths), f'{lang} 가이드 페이지는 글이 있을 때만')
    ok(B.has_guide(lang) == any(n[2] == 'guide' for n in B.NAV[lang]), f'{lang} 가이드 메뉴는 글이 있을 때만')
TOOLS = {'/', '/wifi/', '/vcard/', '/bulk/', '/scan/', '/ko/', '/ko/wifi/', '/ko/vcard/', '/ko/bulk/', '/ko/scan/'}
for path, (p, txt) in pages.items():
    ko = path.startswith('/ko/')
    ok(p.lang == ('ko' if ko else 'en'), f'{path} html lang {p.lang}')
    ok(0 < len(p.title) <= 65, f'{path} 제목 길이 {len(p.title)}: {p.title}')
    ok(50 <= len(p.desc) <= 160, f'{path} 설명 길이 {len(p.desc)}')
    ok(p.title not in titles, f'{path} 제목 겹침 {titles.get(p.title)}')
    ok(p.desc not in descs, f'{path} 설명 겹침 {descs.get(p.desc)}')
    titles[p.title] = descs[p.desc] = path
    ok(p.canon == SITE + path, f'{path} canonical {p.canon}')
    ok('noindex' not in p.robots, f'{path} noindex')
    # hreflang
    alt = B.alt_of('ko' if ko else 'en', path[4:] if ko else path[1:])
    if alt is not None:
        langs = dict(p.alts)
        ok(set(langs) == {'en', 'ko', 'x-default'} and len(p.alts) == 3, f'{path} hreflang {p.alts}')
        ok(langs.get('ko' if ko else 'en') == SITE + path, f'{path} hreflang 자기 자신')
        ok(langs.get('x-default') == langs.get('en'), f'{path} x-default = 영어')
        other = langs.get('en' if ko else 'ko', '')
        op = pages.get(other.replace(SITE, ''))
        ok(op is not None and dict(op[0].alts).get('ko' if ko else 'en') == SITE + path, f'{path} 짝 페이지가 되가리키지 않음')
    else:
        ok(not p.alts, f'{path} 짝 없는데 hreflang')
    # 영어 페이지 한글 0(lang="ko" 밖)
    if not ko:
        ok(not p.text_ko_outside, f'{path} lang=ko 밖 한글 {p.text_ko_outside[:3]}')
    # 같은 id
    dup = {i for i in p.ids if p.ids.count(i) > 1}
    ok(not dup, f'{path} 같은 id {dup}')
    # 내부 링크
    for h in p.links:
        if h.startswith('/') and not h.startswith('//'):
            hp = h.split('#')[0].split('?')[0]
            ok(hp.endswith('/') or '.' in hp.rsplit('/', 1)[-1], f'{path} 링크가 폴더 주소가 아님 {h}')
            ok(hp in pages or (ROOT / hp.lstrip('/')).exists(), f'{path} 깨진 내부 링크 {h}')
            ok('.html' not in hp, f'{path} .html 링크 {h}')
    # 광고
    ads = 'adsbygoogle.js' in txt
    if path in NOADS:
        ok(not ads, f'{path} 광고 코드가 있으면 안 됨')
    else:
        ok(ads, f'{path} 광고 코드 없음')
    # 외부 스크립트는 애드센스뿐
    ext = [s for s in p.scripts if s.startswith('http') and 'pagead2.googlesyndication.com' not in s]
    ok(not ext, f'{path} 외부 스크립트 {ext}')
    # 구조화 데이터
    types = [j.get('@type') for j in p.ld]
    if path in TOOLS:
        ok('WebApplication' in types, f'{path} WebApplication 없음')
        ok('id="tool"' in txt, f'{path} 도구 한 칸(#tool) 없음')
    faq = [j for j in p.ld if j.get('@type') == 'FAQPage']
    if faq:
        qs = [q['name'] for q in faq[0]['mainEntity']]
        shown = re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>', txt)
        import html as H
        ok([H.unescape(q) for q, _ in shown] == qs and [H.unescape(a) for _, a in shown] == [q['acceptedAnswer']['text'] for q in faq[0]['mainEntity']], f'{path} FAQPage 가 화면 FAQ 와 다름')
    if '/guide/' in path and path not in ('/guide/', '/ko/guide/'):
        ok('Article' in types and 'BreadcrumbList' in types, f'{path} Article·BreadcrumbList')
        ok('출처' in txt or 'Sources' in txt, f'{path} 출처 목록')
        ok('마지막 확인' in txt or 'Last checked' in txt, f'{path} 마지막 확인')
    # 꼬리말
    ok((C.TX['ko' if ko else 'en']['trademark']) in txt, f'{path} 상표 문장')
    ok(('href="https://lumenlab.page/"' if ko else 'href="https://lumenlab.page/en/"') in txt, f'{path} 루멘랩 링크 언어')
    ok('woxocoso@gmail.com' in txt, f'{path} 문의 메일')
    # 첫 HTML 에 제목·본문
    ok('<h1' in txt and len(re.sub(r'<[^>]+>', '', txt)) > 800, f'{path} 첫 HTML 내용')

# 방침
for path in ('/privacy/', '/ko/privacy/'):
    txt = pages[path][1]
    ok('Cloudflare Web Analytics' in txt, f'{path} Cloudflare Web Analytics')
    ok('policies.google.com/technologies/partner-sites' in txt, f'{path} partner-sites 링크')
    ok(('웹 비콘' in txt) or ('web beacons' in txt), f'{path} 웹 비콘 문장')
    ok(not re.search(r'분석 도구[^.。]*(없|쓰지 않|사용하지 않)|no analytics|do not use analytics|don\'t use analytics', txt, re.I), f'{path} "분석 도구 없음" 문장 금지')
    for k in C.STORE_KEYS:
        ok(k in txt, f'{path} 저장 키 {k} 빠짐')
    ok(('카메라' in txt) or ('camera' in txt), f'{path} 카메라 화면 문장')
# 코드의 저장 키 = 방침 키
code = ''.join((ROOT / 'assets' / f).read_text(encoding='utf-8') for f in ('app.js', 'bulk.js', 'scan.js', 'site.js'))
code += ''.join(re.findall(r"localStorage[^\n]*", out['index.html']))
keys = set(re.findall(r"staycode\.[a-z]+", code))
ok(keys == set(C.STORE_KEYS), f'코드 저장 키 {sorted(keys)} != 방침 {C.STORE_KEYS}')
# 방침 문장 = 실제 저장 동작(2단계 M4): 최근 목록에서 빼는 종류가 방침에 그대로
app = (ROOT / 'assets' / 'app.js').read_text(encoding='utf-8')
m = re.search(r"var NO_RECENT = \{([^}]*)\}", app)
ok(m and set(re.findall(r"(\w+): 1", m.group(1))) == {'vcard', 'wifi'}, '최근 목록 제외 종류 = 연락처·와이파이')
ok('연락처·와이파이 QR은 남기지 않아요' in pages['/ko/privacy/'][1] and 'contact and WiFi codes are never kept' in pages['/privacy/'][1], '방침: 연락처·와이파이는 최근 목록에 안 남김')
ok('40자' not in pages['/ko/privacy/'][1] and '40 characters' not in pages['/privacy/'][1], '방침에 옛 "앞 40자" 문장 없음')
ok('data: cur.r.data' in app, '최근 목록이 넣은 내용 전체(data)를 저장')
# 대량 글 규칙: 화면 글과 코드
bulk = (ROOT / 'assets' / 'bulk.js').read_text(encoding='utf-8')
ok("type === 'text' && !hasHead" in bulk and '쉼표가 있어도 나누지 않아요' in C.BULK['ko']['rules']['text'], '대량 글은 쉼표로 안 나눔(코드·화면 글)')
# 틀 여백 최소값 = 화면 알림 숫자
rend = (ROOT / 'assets' / 'qr-render.js').read_text(encoding='utf-8')
ok('var MIN_FRAME_MARGIN = 2;' in rend, '틀 최소 여백 2칸')
# 404
t404 = (ROOT / '404.html').read_text(encoding='utf-8')
ok('noindex' in t404 and 'adsbygoogle' not in t404, '404 noindex·광고 없음')
ok('data-l="en"' in t404 and 'data-l="ko"' in t404 and "/^\\/ko(\\/|$)/" in t404, '404 두 언어 틀·주소로 고름')
p404 = P(); p404.feed(re.sub(r'<script type="application/json"[^>]*>.*?</script>', '', t404, flags=re.S))
ok(not {i for i in p404.ids if p404.ids.count(i) > 1}, '404 같은 id')
# 화면 한도 숫자 = 코드
bulk_en, bulk_ko = pages['/bulk/'][1], pages['/ko/bulk/'][1]
lim = json.loads(re.search(r'<script type="application/json" id="qr-cfg">(.*?)</script>', bulk_en, re.S).group(1))['limit']
ok(f'{lim:,}' in bulk_en and f'{lim:,}' in bulk_ko and f'{lim:,}' in C.PAGES[('ko', 'bulk')]['desc'], f'대량 한도 {lim} 가 화면 글과 다름')
for (lang, key), faqs in C.FAQ.items():
    if key == 'bulk':
        ok(any(f'{lim:,}' in a for _, a in faqs), f'대량 FAQ 한도 숫자 {lang}')
# 꾸밈 세트 수(8~10) = 화면 글
n_pre = len(B.PRESETS)
ok(8 <= n_pre <= 10, f'꾸밈 세트 {n_pre}개')
ok(len(B.C_DOTS) >= 6 and len(B.C_EYEO) >= 5 and len(B.C_EYEI) >= 5 and len(B.C_FRAMES) - 1 >= 8, '모양 수(점 6+, 눈 5+, 틀 8+)')
ok(len(C.UI['ko']['dots']) == len(B.C_DOTS) == len(C.UI['en']['dots']) and len(C.UI['ko']['frames']) == len(B.C_FRAMES), '모양 이름 수 = 코드')
# 배포 파일
w = (ROOT / 'wrangler.jsonc').read_text()
for s in ('"name": "qr"', '"workers_dev": false', '"pattern": "qr.lumenlab.page"', '"custom_domain": true', '"not_found_handling": "404-page"', '"html_handling": "auto-trailing-slash"'):
    ok(s in w, f'wrangler.jsonc {s}')
ign = (ROOT / '.assetsignore').read_text().split()
for s in ('_dev', 'tests', 'CLAUDE.md', 'wrangler.jsonc', '.assetsignore', '.deploy-actions'):
    ok(s in ign, f'.assetsignore {s}')
ok((ROOT / '.deploy-actions').exists() and (ROOT / '.deploy-actions').stat().st_size == 0, '.deploy-actions 빈 파일')
ok((ROOT / 'ads.txt').read_text() == (ROOT.parent / 'typing' / 'ads.txt').read_text(), 'ads.txt = typing')
ok((ROOT / 'googlea614029e84d58498.html').read_text().strip() == 'google-site-verification: googlea614029e84d58498.html', '구글 확인 파일')
ok('Sitemap: https://qr.lumenlab.page/sitemap.xml' in (ROOT / 'robots.txt').read_text(), 'robots Sitemap')
ok('nosniff' in (ROOT / '_headers').read_text(), '_headers nosniff')
for f in ('favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'og.png', 'og-ko.png', 'assets/vendor/jsQR-LICENSE.txt', 'assets/glyphs/OFL-Jua.txt', 'assets/glyphs/OFL-Fredoka.txt', 'assets/glyphs/lat.json', 'assets/glyphs/sym.json', 'CLAUDE.md'):
    ok((ROOT / f).exists(), f'파일 {f}')
from PIL import Image
for f in ('og.png', 'og-ko.png'):
    ok(Image.open(ROOT / f).size == (1200, 630), f'{f} 1200×630')
ok(Image.open(ROOT / 'apple-touch-icon.png').size == (180, 180), 'apple-touch-icon 180')
# rss: 한국어 글만
rss = (ROOT / 'rss.xml').read_text()
ok('/guide/' not in rss.replace('/ko/guide/', ''), 'rss 에 영어 글')
# 글: 출처·확인 날짜
for a in B.ARTICLES:
    ok(a.get('checked') and re.fullmatch(r'\d{4}-\d{2}-\d{2}', a['checked']), f'글 {a.get("slug")} checked')
    ok(len(a['title']) <= 65 and len(a['description']) <= 160, f'글 {a["slug"]} 제목·설명 길이')
    for s in a.get('sources', []):
        ok(s.get('url', '').startswith('https://') and s.get('checked'), f'글 {a["slug"]} 출처 형식')
# 첫 화면 '왜 여기서'·제목에 검색어
ok('QR코드 만들기' in pages['/ko/'][0].title and 'QR Code Generator' in pages['/'][0].title, '제목에 검색어')
# 금지 약속 문장(실제 동작보다 큰 말)
for path, (p, txt) in pages.items():
    body = re.sub(r'<script.*?</script>', '', txt, flags=re.S)
    for bad in ('무제한', 'unlimited', '100%', '영원히', 'forever', '보장', 'guarantee'):
        ok(bad not in body, f'{path} 금지 문장 "{bad}"')

print(f'정적 검사 {count}개 가운데 실패 {len(fails)}개')
for f in fails[:60]:
    print('  실패', f)
sys.exit(1 if fails else 0)
