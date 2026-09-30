"""첫 화면 글꼴 만들기: python3 _dev/first_font.py

첫 화면(class="first-font": 머리 메뉴, 첫 칸, 비교 칸 제목, 아래 버튼)에 쓰인 글자만 담은
Pretendard 조각을 fonts/first-<지문>.woff2 로 만들고, index.html 의 preload·@font-face 를 새 파일로 바꾼다.
이 작은 파일이 먼저 와서, 처음 방문 때 큰 글꼴이 늦게 와도 첫 화면 줄이 다시 짜이지 않는다.

첫 화면 문구를 바꾸면 다시 돌린다 (빠진 글자는 _dev/check.py 가 알려 준다).
- 원본: index.html 의 CDN 주소와 같은 판의 Pretendard Variable (jsdelivr, 막혀 있으면 npm 에서 받아 /tmp 에 보관)
- 굵기는 사이트에서 쓰는 400~800 만 남긴다
- OFL 규칙: 'Pretendard' 는 예약된 이름이라 조각 글꼴 안의 이름은 'HB First' 로 바꾸고, 라이선스 전문을 fonts/OFL.txt 로 함께 둔다
필요: pip install fonttools brotli playwright
"""
import functools, hashlib, http.server, io, os, re, socketserver, subprocess, tarfile, threading
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(SITE, 'index.html')
FONTS = os.path.join(SITE, 'fonts')
EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
EXTRA = '  0123456789'   # 띄어쓰기와 숫자 전부는 늘 넣는다 (전화번호가 바뀌어도 되게)
KEEP = {0, 5, 13, 14}         # 이름을 그대로 두는 항목: 저작권, 판, 라이선스 설명, 라이선스 주소

html = open(INDEX, encoding='utf-8').read()
ver = re.search(r'pretendard@([\d.]+)/', html).group(1)


def source():
    """원본 글꼴과 라이선스 경로"""
    d = f'/tmp/pretendard-{ver}'; font, lic = f'{d}/PretendardVariable.woff2', f'{d}/LICENSE.txt'
    if os.path.isfile(font) and os.path.isfile(lic): return font, lic
    os.makedirs(d, exist_ok=True)
    cdn = f'https://cdn.jsdelivr.net/npm/pretendard@{ver}/dist'
    if all(subprocess.run(['curl', '-fsL', '--max-time', '60', '-o', o, u]).returncode == 0
           for o, u in ((font, f'{cdn}/web/variable/woff2/PretendardVariable.woff2'), (lic, f'{cdn}/LICENSE.txt'))):
        return font, lic
    tgz = f'{d}/pretendard.tgz'
    print(f'jsdelivr 가 막혀 npm 에서 받는 중 (약 70MB)')
    subprocess.run(['curl', '-fsSL', '-o', tgz, f'https://registry.npmjs.org/pretendard/-/pretendard-{ver}.tgz'], check=True)
    want = {'package/dist/web/variable/woff2/PretendardVariable.woff2': font, 'package/dist/LICENSE.txt': lic}
    with tarfile.open(tgz) as t:
        for name, o in want.items(): open(o, 'wb').write(t.extractfile(name).read())
    os.remove(tgz)
    return font, lic


def first_text():
    """class="first-font" 안의 글자 전부 (브라우저로 열어서 읽음)"""
    from playwright.sync_api import sync_playwright
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory=SITE))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{srv.server_address[1]}/'
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=EXE if os.path.exists(EXE) else None)
        pg = b.new_page(); pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(url) else r.abort())
        pg.goto(url)
        t = pg.evaluate("[...document.querySelectorAll('.first-font')].map(e => e.textContent).join('')")
        b.close()
    srv.shutdown()
    return t


def build(src, text):
    f = TTFont(src, recalcTimestamp=False)  # 같은 글자면 같은 파일(같은 이름)이 나오게
    o = subset.Options(); o.layout_features += ['tnum']; o.hinting = False
    o.name_IDs = sorted(KEEP | {1, 2, 3, 4, 6}); o.name_languages = [0x409]
    s = subset.Subsetter(o); s.populate(text=text); s.subset(f)
    f = instancer.instantiateVariableFont(f, {'wght': (400, 800)})
    for n in f['name'].names:
        if n.nameID not in KEEP:
            n.string = n.toUnicode().replace('PretendardVariable', 'HBFirst').replace('Pretendard Variable', 'HB First').replace('Pretendard', 'HB First')
    left = [n.nameID for n in f['name'].names if n.nameID not in KEEP and 'pretendard' in n.toUnicode().lower()]
    assert not left, f'예약된 이름이 남음: {left}'
    f.flavor = 'woff2'; buf = io.BytesIO(); f.save(buf)
    return buf.getvalue(), sorted(f.getBestCmap())


def ranges(cps):
    out, i = [], 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1: j += 1
        out.append(f'U+{cps[i]:x}' if i == j else f'U+{cps[i]:x}-{cps[j]:x}'); i = j + 1
    return ','.join(out)


font_src, lic = source()
text = ''.join(sorted(set(first_text() + EXTRA) - set('\n\t\r')))
data, cps = build(font_src, text)
missing = [c for c in text if ord(c) not in cps]
name = f'first-{hashlib.sha256(data).hexdigest()[:8]}.woff2'
os.makedirs(FONTS, exist_ok=True)
for old in os.listdir(FONTS):
    if re.fullmatch(r'first-[0-9a-f]+\.woff2', old) and old != name: os.remove(os.path.join(FONTS, old))
open(os.path.join(FONTS, name), 'wb').write(data)
open(os.path.join(FONTS, 'OFL.txt'), 'w', encoding='utf-8').write(
    f'first-*.woff2 는 Pretendard Variable {ver} 에서 첫 화면 글자와 굵기 400~800 만 남긴 조각입니다.\n'
    "'Pretendard' 는 예약된 글꼴 이름(Reserved Font Name)이라 글꼴 안의 이름을 'HB First' 로 바꿨습니다.\n"
    'This subset of Pretendard Variable is renamed "HB First" because "Pretendard" is a Reserved Font Name.\n\n'
    + open(lic, encoding='utf-8').read())
html, n1 = re.subn(r'fonts/first-[0-9a-f]+\.woff2', f'fonts/{name}', html)
html, n2 = re.subn(r"(@font-face\{font-family:'hb-first';[^}]*unicode-range:)[^}]*\}", lambda m: m.group(1) + ranges(cps) + '}', html)
assert n1 == 2 and n2 == 1, f'index.html 에서 바꿀 곳을 못 찾음 (preload·src {n1}/2, unicode-range {n2}/1)'
open(INDEX, 'w', encoding='utf-8').write(html)
print(f'fonts/{name}  {len(data):,} bytes  글자 {len(cps)}개' + (f'  (원본 글꼴에 없는 글자: {"".join(missing)})' if missing else ''))
