"""정적 검사: 자리표시자·금지 문구·링크·주소·주 단추 상수·꼬리말(메일·AI 표시)·언어 섞임·글꼴 이름과 글자 빠짐·맛보기 원본.
python3 _dev/check.py"""
import hashlib, os, re, sys
from html.parser import HTMLParser
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import build  # noqa: E402  (S·CTA 사전을 그대로 읽는다)

bad = []
def ok(c, m): print(('통과 ' if c else '실패 ') + m); (None if c else bad.append(m))
read = lambda f: open(os.path.join(SITE, f), encoding='utf-8').read()

# 맛보기 판은 게임 세션이 준 그대로(한 글자도 고치지 않는다)
DEMO_SHA = '59e00cd6'
ok(hashlib.sha256(open(os.path.join(SITE, 'assets/demo.js'), 'rb').read()).hexdigest()[:8] == DEMO_SHA, f'demo.js 원본 그대로({DEMO_SHA})')
for _f, _h in (('chick-board.js', 'c8215103'), ('friends.js', '45cc96b6')):  # 게임 세션 파일(landing-kit 2f7bbeb), 고치지 않는다
    ok(hashlib.sha256(open(os.path.join(SITE, 'assets', _f), 'rb').read()).hexdigest()[:8] == _h, f'{_f} 원본 그대로({_h})')

pages = {'/': 'index.html', '/en/': 'en/index.html', '404': '404.html'}
for k, f in pages.items():
    h = read(f)
    body = re.sub(r'<script\b.*?</script>', '', h, flags=re.S)
    ok(not re.search(r'__[A-Z]+__|\{[a-z_]+\}', body), f'{k} 자리표시자 없음')
    # 출시 전: 가격·스토어 단추·확인 안 된 말 금지
    vis = re.sub(r'<head\b.*?</head>|<style\b.*?</style>', '', body, flags=re.S)
    vis = re.sub(r'<[^>]+>', ' ', vis)
    hit = re.search(r'₩|\$\d|\d+원|App Store에서|Google Play에서 받기|Get it on|지금 받기|다운로드 \d|별점|1위|최고의|best-selling|#1\b|\d+만 명', vis)
    ok(not hit, f'{k} 가격·스토어 단추·과장 없음' + (f' ({hit.group(0)})' if hit else ''))
    ok(len(re.findall(r'\sid="([^"]+)"', h)) == len(set(re.findall(r'\sid="([^"]+)"', h))), f'{k} id 겹침 없음')
    for src in re.findall(r'(?:src|href|poster)="(/[^"#?]*)', h):
        p = os.path.join(SITE, src.lstrip('/'))
        if src.endswith('/'): p = os.path.join(p, 'index.html')
        ok(os.path.exists(p), f'{k} 파일 있음 {src}') if not os.path.exists(p) else None
    ok('<meta name="color-scheme" content="only light">' in h, f'{k} 밝은 얼굴 고정(color-scheme)')
    ok('Pretendard' not in h, f'{k} 예전 제목 글꼴 이름 없음')
    if k != '404':
        i = 0 if k == '/' else 1
        ok('chick-rescue.lumenlab.page' in h and 'workers.dev' not in h, f'{k} 대표 주소')
        ok(h.count('hreflang=') >= 3, f'{k} hreflang')
        ok('noindex' not in h, f'{k} noindex 없음')
        # 주 단추: build.CTA 한 곳에서 온 말·주소가 모든 자리(머리말·완료 창·끝 칸·하단 줄)에
        ctas = re.findall(r'<a class="cta[^"]*" href="([^"]+)" data-cta>([^<]+)</a>', h)
        ok(len(ctas) == 4, f'{k} 주 단추 자리 4곳 ({len(ctas)})')
        ok(all(x[0].replace('&amp;', '&') == build.CTA['href'][i] and x[1] == build.CTA['label'][i] for x in ctas), f'{k} 주 단추 말·주소가 상수와 같음')
        ok(h.count(build.CTA['note'][i]) >= 2, f'{k} 주 단추 아래 안내')
        foot = h[h.index('<footer'):h.index('</footer>')]
        ok('© 2026 Lumen Lab' in foot and f'mailto:{build.MAIL}' in foot and build.S['lumen_url'][i] in foot, f'{k} 꼬리말(©·메일·lumenlab.page)')
        ok('Higgsfield' in foot and build.S['foot_dev'][i] in foot, f'{k} 꼬리말 AI 그림 표시·개발 중 안내')
        ok(h.count('<details>') == 4, f'{k} 질문 4개')
        ok(len(re.findall(r'class="stage[ "]', h)) == 12 and h.count('class="pick"') == 12, f'{k} 친구 무대 12칸·줄 12마리')
        ok('class="mini' not in h, f'{k} 스크롤 진행 튜브 없음')
        ok(h.count('data-act="next"') == 1 and h.count('data-act="real"') == 1, f'{k} 맛보기 완료 창 단추(demo.js 약속)')
ko = read('index.html')
ok(not re.search(r'[A-Za-z]{4,}', re.sub(r'<[^>]+>|Lumen Lab|Higgsfield|contact@lumenlab\.page|lumenlab\.page|English|iOS', '', re.sub(r'<script\b.*?</script>|<head>.*?</head>', '', ko, flags=re.S))), '한국어판 화면 글에 영어 낱말 없음(이름 빼고)')
en = re.sub(r'<script\b.*?</script>|<head>.*?</head>', '', read('en/index.html'), flags=re.S)
ok(not re.search(r'[가-힣]', re.sub(r'<a [^>]*lang="ko"[^>]*>[^<]*</a>', '', en)), '영어판 화면에 한글 없음(한국어 링크 빼고)')
ok(not re.search(r'[가-힣]', re.sub(r'"names".*', '', read('en/index.html').split('id="demo-text">')[1].split('</script>')[0])), '영어판 맛보기 글(demo-text)에 한글 없음')
css = read('assets/site.css')
ok(not re.search(r'\.(sec-head|eyebrow|mcard|nums|helps|end-steps|lumen|hero-side|shots)\b', css), '예전 칸 CSS 없음')
ok(re.search(r'head\.woff2\?v=' + build.sha('assets/head.woff2'), css) is not None, 'CSS 글꼴 주소 지문이 맞음')

# 둥근 글꼴 조각: 이름을 바꿨고(OFL), 둥근 글꼴로 그리는 글자가 다 들어 있다
from fontTools.ttLib import TTFont
f = TTFont(os.path.join(SITE, 'assets/head.woff2'))
fam = {r.toUnicode() for r in f['name'].names if r.nameID in (1, 4, 6, 16)}
ok(not any(re.search(r'Jua|JUA|Pretendard', x) for x in fam), f'글꼴 조각 이름을 바꿈 {sorted(fam)}')
ofl = read('assets/OFL.txt')
ok('BM JUA Project Authors' in ofl and 'Open Font License' in ofl, 'OFL.txt 저작권 줄이 Jua 것')
cmap = f.getBestCmap()


class Round(HTMLParser):
    """둥근 글꼴로 그리는 칸(h1~h3, 단추, 소리말, 팻말 숫자, 말풍선, 그림 설명 제목, 언어 링크)의 글."""
    TAGS = ('h1', 'h2', 'h3')
    CLS = re.compile(r'\b(cta|btn|verb|peep|lang|brand-mini)\b')
    def __init__(self):
        super().__init__(); self.stack = []; self.text = []
    def handle_starttag(self, tag, attrs):
        if tag in ('img', 'br', 'source', 'meta', 'link', 'input'):
            return
        a = dict(attrs)
        on = tag in self.TAGS or bool(self.CLS.search(a.get('class') or '')) or (tag == 'b' and self.stack and self.stack[-1][0] in ('p', 'figcaption'))
        self.stack.append((tag, on or (self.stack[-1][1] if self.stack else False)))
    def handle_endtag(self, tag):
        while self.stack:
            t, _ = self.stack.pop()
            if t == tag: break
    def handle_data(self, d):
        if self.stack and self.stack[-1][1] and self.stack[-1][0] not in ('script', 'style'):
            self.text.append(d)


txt = ''
for fn in ('index.html', 'en/index.html', '404.html'):
    p = Round(); p.feed(re.sub(r'<summary>.*?</summary>|<footer.*?</footer>|<p class="hero-sub">.*?</p>', '', read(fn), flags=re.S)); txt += ''.join(p.text)
miss = sorted({c for c in txt if ord(c) not in cmap and not c.isspace()})
ok(not miss, f'둥근 글꼴 글자가 조각에 다 있음 {miss}')
print('실패', len(bad)); sys.exit(1 if bad else 0)
