"""정적 검사: 자리표시자·금지 문구·링크·주소·글꼴 이름. python3 _dev/check.py"""
import os, re, sys
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bad = []
def ok(c, m): print(('통과 ' if c else '실패 ') + m); (None if c else bad.append(m))
pages = {'/': 'index.html', '/en/': 'en/index.html', '404': '404.html'}
for k, f in pages.items():
    h = open(os.path.join(SITE, f), encoding='utf-8').read()
    body = re.sub(r'<script\b.*?</script>', '', h, flags=re.S)
    ok(not re.search(r'__[A-Z]+__|\{[a-z_]+\}', body), f'{k} 자리표시자 없음')
    # 출시 전: 가격·스토어 단추·확인 안 된 말 금지
    vis = re.sub(r'<head\b.*?</head>|<style\b.*?</style>', '', body, flags=re.S)
    vis = re.sub(r'<[^>]+>', ' ', vis)
    hit = re.search(r'₩|\$\d|\d+원|App Store에서|Google Play에서 받기|Get it on|1위|최고의|best-selling|#1\b', vis)
    ok(not hit, f'{k} 가격·스토어 단추·과장 없음' + (f' ({hit.group(0)})' if hit else ''))
    ok(len(re.findall(r'id="([^"]+)"', h)) == len(set(re.findall(r'id="([^"]+)"', h))), f'{k} id 겹침 없음')
    for src in re.findall(r'(?:src|href)="(/[^"#?]*)', h):
        p = os.path.join(SITE, src.lstrip('/'))
        if src.endswith('/'): p = os.path.join(p, 'index.html')
        ok(os.path.exists(p), f'{k} 파일 있음 {src}') if not os.path.exists(p) else None
    if k != '404':
        ok('chick-rescue.lumenlab.page' in h and 'workers.dev' not in h, f'{k} 대표 주소')
        ok(h.count('hreflang=') >= 3, f'{k} hreflang')
        ok('noindex' not in h, f'{k} noindex 없음')
ko = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
ok(not re.search(r'[A-Za-z]{4,}', re.sub(r'<[^>]+>|Lumen Lab|Higgsfield|woxocoso@gmail\.com|English|iOS|Chick Rescue|Android', '', re.sub(r'<script\b.*?</script>|<head>.*?</head>', '', ko, flags=re.S))), '한국어판 화면 글에 영어 낱말 없음(이름 빼고)')
en = re.sub(r'<script\b.*?</script>|<head>.*?</head>', '', open(os.path.join(SITE, 'en/index.html'), encoding='utf-8').read(), flags=re.S)
ok(not re.search(r'[가-힣]', re.sub(r'<a [^>]*lang="ko"[^>]*>[^<]*</a>', '', en)), '영어판 화면에 한글 없음(한국어 링크 빼고)')
from fontTools.ttLib import TTFont
f = TTFont(os.path.join(SITE, 'assets/head.woff2'))
ok(not any('Pretendard' in str(r) for r in f['name'].names), '제목 글꼴 조각에 OFL 예약 이름 없음')
cmap = f.getBestCmap()
heads = ''.join(re.findall(r'<h[123][^>]*>(.*?)</h[123]>', ko + en, flags=re.S))
heads = re.sub(r'<[^>]+>', '', heads)
miss = sorted({c for c in heads if ord(c) not in cmap and not c.isspace()})
ok(not miss, f'제목 글자가 조각에 다 있음 {miss}')
print('실패', len(bad)); sys.exit(1 if bad else 0)
