"""정적 검사: 자리표시자·금지 문구·링크·주소·주 단추 한 곳·글자 크기·색·글꼴 이름과 글자. python3 _dev/check.py"""
import os, re, sys, json
from html.parser import HTMLParser
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
sys.path.insert(0, HERE); sys.dont_write_bytecode = True
import build  # 주 단추 상수(CTA)와 사실 사전을 같이 본다
bad = []
def ok(c, m): print(('통과 ' if c else '실패 ') + m); (None if c else bad.append(m))

pages = {'/': 'index.html', '/en/': 'en/index.html', '404': '404.html'}
for k, f in pages.items():
    h = open(os.path.join(SITE, f), encoding='utf-8').read()
    body = re.sub(r'<script\b.*?</script>', '', h, flags=re.S)
    ok(not re.search(r'__[A-Z]+__|\{[a-z_]+\}', re.sub(r'data-[a-z]+="[^"]*"|data-[a-z]+=\'[^\']*\'', '', body)), f'{k} 자리표시자 없음(data- 틀 빼고)')
    # 출시 전: 가격·스토어 단추·확률 숫자·확인 안 된 말 금지
    vis = re.sub(r'<head\b.*?</head>|<style\b.*?</style>', '', body, flags=re.S)
    vis = re.sub(r'<[^>]+>', ' ', vis)
    hit = re.search(r'₩|\$\d|\d[\d,]*원|\d+(\.\d+)?%|App Store에서|Google Play에서 받기|Get it on|지금 받기|Download now|1위|최고의|best-selling|#1\b|900웨이브|22종|12층|끝까지 무료|free to the end|맛보기|Try it', vis)
    ok(not hit, f'{k} 가격·확률·스토어 단추·옛 숫자·맛보기 없음' + (f' ({hit.group(0)})' if hit else ''))
    ok(len(re.findall(r'id="([^"]+)"', h)) == len(set(re.findall(r'id="([^"]+)"', h))), f'{k} id 겹침 없음')
    for src in re.findall(r'(?:src|href|poster)="(/[^"#?]*)', h):
        p = os.path.join(SITE, src.lstrip('/'))
        if src.endswith('/'): p = os.path.join(p, 'index.html')
        ok(os.path.exists(p), f'{k} 파일 있음 {src}') if not os.path.exists(p) else None
    for u in re.findall(r'href="#i-([a-z]+)"', h):
        ok(f'id="i-{u}"' in h, f'{k} 그림 기호 {u}') if f'id="i-{u}"' not in h else None
    for m in re.finditer(r'<img\b[^>]*>', h):
        ok(' alt=' in m.group(0), f'{k} 그림 alt {m.group(0)[:60]}') if ' alt=' not in m.group(0) else None
    ok('demo.js' not in h, f'{k} 맛보기 스크립트(demo.js) 없음')
    if k != '404':
        i = 0 if k == '/' else 1
        ok('castle-up.lumenlab.page' in h and 'workers.dev' not in h, f'{k} 대표 주소')
        ok(h.count('hreflang=') >= 3, f'{k} hreflang')
        ok('noindex' not in h, f'{k} noindex 없음')
        ok('Higgsfield' in h, f'{k} AI 그림 밝힘')
        ok('contact@lumenlab.page' in h, f'{k} 연락 메일')
        ok(build.S['lumen_url'][i] in h, f'{k} 같은 언어 루멘랩 본페이지 링크')
        lum = h[h.index('<aside class="lumen"'):h.index('<footer')] if '<aside class="lumen"' in h else ''
        ok(f'href="{build.S["lumen_url"][i]}"' in lum and 'class="decree"' in lum and 'class="seal" aria-hidden="true"' in lum, f'{k} 루멘랩 알림 두루마리(같은 언어 본페이지, 봉인 장식 숨김)')
        ok(build.S['foot_dev'][i] in h, f'{k} 출시 전에 바뀔 수 있음 한 줄')
        ok('com.example' not in h, f'{k} 임시 앱 ID 없음')
        ctas = re.findall(r'<a class="cta[^"]*"[^>]*href="([^"]+)"[^>]*>.*?<span class="cta-t">([^<]+)</span>', h)
        want = build.CTA['href'][i].replace('&', '&amp;')
        ok(len(ctas) >= 3 and all(c == (want, build.CTA['label'][i]) for c in ctas),
           f'{k} 주 단추 {len(ctas)}곳이 모두 CTA 상수와 같은 말·주소')
        ok(build.CTA['note'][i] in h, f'{k} 단추 아래 안내')
        ok(len(re.findall(r'<details>', h)) == 4, f'{k} 질문 4개')
        ok(h.count('class="poster"') == 6, f'{k} 보스 수배 전단 6장')

ko = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
kov = re.sub(r'<script\b.*?</script>|<head>.*?</head>|<svg\b.*?</svg>', '', ko, flags=re.S)
kov = re.sub(r'<[^>]+>|Lumen Lab|Higgsfield|contact@lumenlab\.page|lumenlab\.page|English|Castle Up|Kling', '', kov)
ok(not re.search(r'[A-Za-z]{4,}', kov), '한국어판 화면 글에 영어 낱말 없음(이름 빼고)' + (f' {re.search(r"[A-Za-z]{4,}", kov).group(0)}' if re.search(r'[A-Za-z]{4,}', kov) else ''))
en = re.sub(r'<script\b.*?</script>|<head>.*?</head>', '', open(os.path.join(SITE, 'en/index.html'), encoding='utf-8').read(), flags=re.S)
ok(not re.search(r'[가-힣]', re.sub(r'<a [^>]*lang="ko"[^>]*>[^<]*</a>', '', en)), '영어판 화면에 한글 없음(한국어 링크 빼고)')

# CSS: 작은 글자·금지 색
css = open(os.path.join(SITE, 'assets/site.css'), encoding='utf-8').read()
sizes = [float(x) for x in re.findall(r'font-size:\s*(\d+(?:\.\d+)?)px', css)] + \
        [float(x) for x in re.findall(r'font:\s*(?:\d{3}\s+)?(\d+(?:\.\d+)?)px', css)]
ok(sizes and min(sizes) >= 14, f'CSS 글자 14px 이상(가장 작은 값 {min(sizes) if sizes else "-"}px)')
ok('#171B2B' not in css.upper(), '바탕에 #171B2B 안 씀(병아리와 같은 값)')
ok('prefers-reduced-motion' in css, '움직임 줄이기 규칙')
js = open(os.path.join(SITE, 'assets/site.js'), encoding='utf-8').read()
ok(not re.search(r'for\s*\(\s*var\s+\w+\s*=\s*[12]\s*;\s*\w+\s*<=\s*20', js), '성 그림 20장을 한꺼번에 미리 받지 않음')
ok(not os.path.exists(os.path.join(SITE, 'assets/demo.js')), '옛 맛보기 파일 지움')

# 글꼴 조각: 이름·라이선스·빠진 글자
from fontTools.ttLib import TTFont
f = TTFont(os.path.join(SITE, 'assets/head.woff2'))
ok(not any('Black Han' in str(r) or '검은고딕' in str(r) for r in f['name'].names if r.nameID in (1, 4, 6, 16)), '제목 글꼴 조각 이름을 바꿈(OFL)')
ofl = os.path.join(SITE, 'assets/OFL.txt')
ok(os.path.exists(ofl) and 'Black Han Sans' in open(ofl, encoding='utf-8').read(), '글꼴 라이선스 파일(Black Han Sans 저작권 줄)')
ok(os.path.getsize(os.path.join(SITE, 'assets/head.woff2')) < 40000, '제목 글꼴 조각 40KB 안')
cmap = f.getBestCmap()
HEAD_CLASSES = {'cta-t', 'big', 'plate-n', 'p-wanted', 'p-name', 'stamp-el', 'count', 'promo', 'plaque-n', 'keep-name', 'brand-text', 'got', 'hud-name', 'count-badge', 'cta'}


class Heads(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack = []; self.text = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('img', 'br', 'source', 'input', 'meta', 'link', 'use'): return
        cls = set((a.get('class') or '').split())
        on = tag in ('h1', 'h2', 'h3') or bool(cls & HEAD_CLASSES)
        if cls & {'count-badge'}: on = False  # 안의 <b>만 제목 글꼴
        if tag == 'b' and self.stack and self.stack[-1][1] == 'count-badge': on = True
        self.stack.append((tag, 'count-badge' if 'count-badge' in cls else '', bool(on or (self.stack and self.stack[-1][2]))))
        for k in ('data-grades',):
            if k in a: self.text.append(''.join(json.loads(a[k])))
        if 'data-pop' in a: self.text.append(a['data-pop'])
    def handle_endtag(self, tag):
        while self.stack:
            t = self.stack.pop()
            if t[0] == tag: break
    def handle_data(self, d):
        if self.stack and self.stack[-1][2]: self.text.append(d)


heads = ''
for fname in ('index.html', 'en/index.html', '404.html'):
    hp = Heads(); hp.feed(re.sub(r'<script\b.*?</script>|<svg\b.*?</svg>', '', open(os.path.join(SITE, fname), encoding='utf-8').read(), flags=re.S)); heads += ''.join(hp.text)
miss = sorted({c for c in heads if ord(c) not in cmap and not c.isspace()})
ok(not miss, f'제목 글꼴을 쓰는 글자가 조각에 다 있음 {miss}')
print('실패', len(bad)); sys.exit(1 if bad else 0)
