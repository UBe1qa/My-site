"""정적 검사: 자리표시자·금지 문구·링크·주소·글꼴 이름. python3 _dev/check.py"""
import os, re, sys
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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
    hit = re.search(r'₩|\$\d|\d[\d,]*원|\d+(\.\d+)?%|App Store에서|Google Play에서 받기|Get it on|1위|최고의|best-selling|#1\b|900웨이브|22종|12층|끝까지 무료|free to the end', vis)
    ok(not hit, f'{k} 가격·확률·스토어 단추·옛 숫자 없음' + (f' ({hit.group(0)})' if hit else ''))
    ok(len(re.findall(r'id="([^"]+)"', h)) == len(set(re.findall(r'id="([^"]+)"', h))), f'{k} id 겹침 없음')
    for src in re.findall(r'(?:src|href)="(/[^"#?]*)', h):
        p = os.path.join(SITE, src.lstrip('/'))
        if src.endswith('/'): p = os.path.join(p, 'index.html')
        ok(os.path.exists(p), f'{k} 파일 있음 {src}') if not os.path.exists(p) else None
    for u in re.findall(r'href="#i-([a-z]+)"', h):
        ok(f'id="i-{u}"' in h, f'{k} 속성 그림 {u}') if f'id="i-{u}"' not in h else None
    if k != '404':
        ok('castle-up.lumenlab.page' in h and 'workers.dev' not in h, f'{k} 대표 주소')
        ok(h.count('hreflang=') >= 3, f'{k} hreflang')
        ok('noindex' not in h, f'{k} noindex 없음')
        ok('Higgsfield' in h, f'{k} AI 그림 밝힘')
        ok('contact@lumenlab.page' in h, f'{k} 연락 메일')
        ok('com.example' not in h, f'{k} 임시 앱 ID 없음')
ko = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
kov = re.sub(r'<script\b.*?</script>|<head>.*?</head>|<svg\b.*?</svg>', '', ko, flags=re.S)
ok(not re.search(r'[A-Za-z]{4,}', re.sub(r'<[^>]+>|Lumen Lab|Higgsfield|contact@lumenlab\.page|English|Castle Up|Kling', '', kov)), '한국어판 화면 글에 영어 낱말 없음(이름 빼고)')
en = re.sub(r'<script\b.*?</script>|<head>.*?</head>', '', open(os.path.join(SITE, 'en/index.html'), encoding='utf-8').read(), flags=re.S)
ok(not re.search(r'[가-힣]', re.sub(r'<a [^>]*lang="ko"[^>]*>[^<]*</a>', '', en)), '영어판 화면에 한글 없음(한국어 링크 빼고)')
from fontTools.ttLib import TTFont
f = TTFont(os.path.join(SITE, 'assets/head.woff2'))
ok(not any('Black Han' in str(r) or '검은고딕' in str(r) for r in f['name'].names if r.nameID in (1, 4, 6, 16)), '제목 글꼴 조각 이름을 바꿈(OFL)')
ok(os.path.exists(os.path.join(SITE, 'assets/OFL.txt')), '글꼴 라이선스 파일')
cmap = f.getBestCmap()
heads = ''.join(re.findall(r'<h[12][^>]*>(.*?)</h[12]>', ko + en, flags=re.S)) + ''.join(re.findall(r'class="(?:tower-name|logo-text|num)[^"]*"[^>]*>(.*?)<', ko + en))
heads = re.sub(r'<[^>]+>', '', heads)
miss = sorted({c for c in heads if ord(c) not in cmap and not c.isspace()})
ok(not miss, f'제목 글자가 조각에 다 있음 {miss}')
print('실패', len(bad)); sys.exit(1 if bad else 0)
