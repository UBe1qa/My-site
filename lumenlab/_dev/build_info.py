# 루트의 소개·개인정보 처리방침(한국어 /about/ /privacy/, 영어 /en/…)을 만든다. (가이드 모음 /guides/ 는 2026-10-18 홈의 소개 창으로 합쳤다)
# 혼자 돌리지 않고 build_home.py 가 홈·영어 홈을 만든 뒤 불러 쓴다(머리말·꼬리말을 그 두 페이지에서 그대로 가져온다).
# 가이드 목록은 손으로 적지 않는다: catalog.json 도구마다 dir(이 저장소의 폴더)의 guide/ 아래 글을 읽어서
#   제목(h1)·설명(meta description)·쓴 날·고친 날(JSON-LD)·주소(canonical)를 가져오고, 순서는 그 도구의 가이드 목록 페이지 순서를 따른다.
#   → 도구 사이트에 글을 더하거나 고치면 build_home.py 를 다시 돌리기만 하면 된다.
# 소개·방침의 글은 아래 KO / EN 에서 고친다. 숫자·사실은 각 도구 소개 페이지와 사업체 문서 '확인된 사실'에 있는 것만.
import os, re, json, html as H
from urllib.parse import urlparse

ROOT = 'https://lumenlab.page'
MAIL = 'contact@lumenlab.page'
TEL = '070-8098-5263'           # 사용자가 가입한 070 번호(2026-10-17), 사이트·방침에 쓰는 공개 전화
TEL_INTL = '+82-70-8098-5263'
EFFECTIVE = ('2026년 10월 18일', 'October 18, 2026')
esc = lambda s: H.escape(s, quote=True)


# ---------- 도구 사이트의 글 읽기 ----------
def _text(s):
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', s or ''))).strip()

def _get(src, pat):
    m = re.search(pat, src, re.S)
    return m.group(1) if m else None

def read_guides(site, it, lang):
    """도구 하나의 한 언어판 글 목록: (목록 페이지 정보, [글…])."""
    url = it['url_en'] if lang == 'en' else it['url']
    u = urlparse(url); base = u.path if u.path.endswith('/') else u.path + '/'
    gdir = os.path.join(os.path.dirname(site), it['dir'], base.strip('/'), 'guide')
    idx_f = os.path.join(gdir, 'index.html')
    assert os.path.isfile(idx_f), f"{it['id']} {lang}: 가이드 목록 페이지가 없음 {idx_f}"
    idx = open(idx_f).read()
    assert _get(idx, r'<html[^>]*\blang="([a-z]+)') == lang, f"{idx_f}: 언어가 {lang} 이 아님"
    index = {'url': _get(idx, r'rel="canonical" href="([^"]+)"'), 'desc': H.unescape(_get(idx, r'<meta name="description" content="([^"]*)"') or '')}
    assert index['url'] == f"{u.scheme}://{u.netloc}{base}guide/", f"{idx_f}: canonical {index['url']}"
    items = []
    for name in os.listdir(gdir):
        f = os.path.join(gdir, name, 'index.html')
        if not os.path.isfile(f): continue
        src = open(f).read()
        assert _get(src, r'<html[^>]*\blang="([a-z]+)') == lang, f"{f}: 언어가 {lang} 이 아님"
        if re.search(r'<meta name="robots" content="[^"]*noindex', src): continue
        g = {'slug': name, 'url': _get(src, r'rel="canonical" href="([^"]+)"'), 'title': _text(_get(src, r'<h1[^>]*>(.*?)</h1>')),
             'desc': H.unescape(_get(src, r'<meta name="description" content="([^"]*)"') or ''),
             'pub': _get(src, r'"datePublished":\s*"(\d{4}-\d\d-\d\d)'), 'mod': _get(src, r'"dateModified":\s*"(\d{4}-\d\d-\d\d)')}
        assert g['url'] == index['url'] + name + '/', f"{f}: canonical {g['url']}"
        assert g['title'] and g['desc'] and g['pub'], f"{f}: 제목·설명·쓴 날 중 빠진 것"
        items.append(g)
    assert items, f"{it['id']} {lang}: 글이 없음"
    # 순서 = 그 도구의 가이드 목록 페이지에 링크가 처음 나오는 순서(없는 글은 맨 뒤, 이름순)
    pos = {}
    for m in re.finditer(r'href="([^"#?]+)"', idx):
        slug = m.group(1).rstrip('/').rsplit('/', 1)[-1]
        pos.setdefault(slug, len(pos))
    items.sort(key=lambda g: (pos.get(g['slug'], 10**6), g['slug']))
    return index, items

def tool_pages(it, lang):
    """도구의 시작·소개·방침 주소(같은 언어판)."""
    url = it['url_en'] if lang == 'en' else it['url']
    u = urlparse(url); base = u.path if u.path.endswith('/') else u.path + '/'
    root = f'{u.scheme}://{u.netloc}{base}'
    priv = root + 'privacy/'
    if it['dir'] == 'date-calc': priv = f'{u.scheme}://{u.netloc}/privacy' + ('#en' if lang == 'en' else '')   # 며칠 계산기는 한 주소에 두 언어(privacy.html, 영어 칸 id="en")
    return {'home': url, 'about': root + 'about/', 'privacy': priv, 'host': u.netloc}

def fdate(d, lang):
    y, m, dd = map(int, d.split('-'))
    if lang == 'ko': return f'{y}. {m}. {dd}.'
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] + f' {dd}, {y}'


# ---------- 페이지 틀 ----------
def page(lang, path, title, desc, main, head_src, kind='article', ld=None, js='', css=('/assets/site.css', '/assets/info.css')):
    ko_path = path[3:] if lang == 'en' else path
    en_path = '/en' + ko_path
    hdr = head_src[head_src.index('<a class="skip"'):head_src.index('<main')]
    ftr = head_src[head_src.index('<footer'):head_src.index('</footer>') + len('</footer>')]
    # 언어 단추는 같은 페이지의 다른 언어로, 머리말에서 지금 페이지 표시
    if lang == 'ko':
        hdr = hdr.replace('<a class="lang" href="/en/"', f'<a class="lang" href="{en_path}"', 1)
    else:
        hdr = hdr.replace('<a class="lang" href="/" hreflang="ko"', f'<a class="lang" href="{ko_path}" hreflang="ko"', 1)
    hdr = hdr.replace(f'href="{path}"', f'href="{path}" aria-current="page"', 1)
    assert f'href="{ko_path if lang == "en" else en_path}"' in hdr, f'{path}: 언어 단추를 못 바꿈'
    site_name = 'Lumen Lab 루멘랩' if lang == 'ko' else 'Lumen Lab'
    locale = '' if lang == 'ko' else '<meta property="og:locale" content="en_US">\n'
    ldj = f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n' if ld else ''
    return f'''<!doctype html>
<html lang="{lang}" data-lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{ROOT}{path}">
<link rel="alternate" hreflang="ko" href="{ROOT}{ko_path}">
<link rel="alternate" hreflang="en" href="{ROOT}{en_path}">
<link rel="alternate" hreflang="x-default" href="{ROOT}{en_path}">
<meta property="og:type" content="{kind}">
<meta property="og:site_name" content="{site_name}">
{locale}<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{ROOT}{path}">
<meta property="og:image" content="{ROOT}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FAF9F6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121121" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
{''.join(f'<link rel="stylesheet" href="{c}">' + chr(10) for c in css)}{ldj}</head>
<body>
{hdr}<main id="main">
{main}
</main>

{ftr}
<script src="/assets/site.js" defer></script>
{js}</body>
</html>
'''

def jumpnav(T, jumps, jcls=''):
    if not jumps: return ''
    nav = ''.join(f'<a href="#{i}">{t}</a>' for i, t in jumps)
    return f'<nav class="ijump{" " + jcls if jcls else ""}" aria-label="{T["jump_label"]}">{nav}</nav>'

def ihead(T, kicker, title, lead, jumps, wide=False, jcls='', after=''):
    kick = f'\n    <p class="ihead__kicker">{kicker}</p>' if kicker else ''
    return f"""<header class="ihead">
  <div class="wrap ihead__in{' ihead__in--wide' if wide else ''}">{kick}
    <h1 class="ihead__title">{title}</h1>
    <p class="ihead__lead">{lead}</p>
    {jumpnav(T, jumps, jcls)}{after}
  </div>
</header>"""


# ---------- 도구 사이트 파일 확인(소개 창·페이지가 쓴다, build_store.py) ----------
def core_url(it, f):
    """도구 사이트의 계산 파일 주소(/assets/…) → 그 사이트 주소 + 내용 지문(파일이 바뀌면 주소도 바뀌어 묵은 캐시를 안 쓴다)."""
    import hashlib
    local = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), it['dir'], f.lstrip('/'))
    assert f.startswith('/assets/') and os.path.isfile(local), f"{it['id']}: 계산 파일이 없음 {local}"
    v = hashlib.sha1(open(local, 'rb').read()).hexdigest()[:10]
    return f"https://{urlparse(it['url']).netloc}{f}?v={v}"

def sub_page_ok(it, href):
    """'이런 것도 돼요' 카드가 가리키는 페이지가 그 도구 폴더에 실제로 있는지(없는 주소를 싣지 않는다)."""
    u = urlparse(href)
    assert u.netloc == urlparse(it['url']).netloc, f"{it['id']}: 다른 사이트 주소 {href}"
    local = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), it['dir'], u.path.lstrip('/'), 'index.html')
    assert os.path.isfile(local), f"{it['id']}: 카드 페이지가 없음 {href}"
    return True

# ---------- 소개 ----------
def about_main(lang, cat, tools, groups, counts):
    T = KO if lang == 'ko' else EN
    games, apps = cat.get('games', []), cat['apps']
    def nm(it): return esc(it['name'][lang])
    def st(it): return f" ({esc(_text(it['status'][lang]))})" if it.get('status') else ''
    what = T['what'](len(tools), counts[lang], ', '.join(nm(i) + st(i) for i in games), ', '.join(nm(i) + st(i) for i in apps), len(games), len(apps))
    checks = []
    for g in groups:
        for it in [t for t in tools if t['group'] == g['id']]:
            work = ('/en' if lang == 'en' else '') + f"/works/{it['id']}/"
            tp = tool_pages(it, lang)
            checks.append(f"""      <div class="ck" id="c-{it['id']}">
        <dt><img src="{it['icon']}" width="28" height="28" alt="" loading="lazy"><a href="{work}">{nm(it)}</a> <span class="ck__host">{esc(it['what'][lang])}</span></dt>
        <dd>{esc(it['check'][lang])} <a class="ck__src" href="{esc(tp['about'])}">{T['ck_src']} <span aria-hidden="true">→</span></a></dd>
      </div>""")
    body = T['about_body'](what, '\n'.join(checks))
    return ihead(T, T['a_kicker'], T['a_title'], T['a_lead'], T['about_jumps']) + f'\n<div class="wrap idoc">\n{body}\n</div>\n' + T['a_end']


# ---------- 개인정보 처리방침 ----------
def privacy_main(lang, cat, tools, groups):
    T = KO if lang == 'ko' else EN
    rows = []
    for g in groups:
        for it in [t for t in tools if t['group'] == g['id']]:
            tp = tool_pages(it, lang)
            rows.append(f'<li><a href="{esc(tp["privacy"])}">{T["its_policy"](esc(it["name"][lang]))}</a> <span class="ck__host">{tp["host"]}</span></li>')
    apps = []
    for it in cat.get('games', []) + cat['apps']:
        if it.get('privacy'):
            apps.append(f'<li><a href="{esc(it["privacy"][lang])}">{T["its_policy"](esc(it["name"][lang]))}</a></li>')
        for l in it['links']:
            if l['href'].endswith('/privacy/'):   # 한 주소에 두 언어인 방침(Owlight)
                apps.append(f'<li><a href="{esc(l["href"])}{"#en" if lang == "en" else ""}">{T["its_policy"](esc(it["name"][lang]))}</a></li>')
    body = T['privacy_body']('\n'.join(rows), '\n'.join(apps))
    # 요약(한눈에 보기)이 먼저, 번호 목차는 그 바로 뒤(폰에서 목차가 요약을 첫 화면 밖으로 밀지 않게)
    cut = body.index('</section>') + len('</section>')
    body = body[:cut] + '\n' + jumpnav(T, T['privacy_jumps'], 'ijump--toc') + body[cut:]
    return ihead(T, '', T['p_title'], T['p_lead'], []) + f'\n<div class="wrap idoc">\n{body}\n</div>'


# ---------- 글 (한국어) ----------
KO = {
    'jump_label': '이 페이지 안',
    'a_kicker': '소개',
    'a_title': '루멘랩은 혼자 운영하는 작은 소프트웨어 <span class="nw">스튜디오예요</span>',
    'a_lead': '휴대폰 게임과 앱, 브라우저에서 바로 쓰는 무료 웹 도구를 만들어요. 누가 만드는지, 도구마다 무엇을 확인하는지, 운영비는 어디서 나오는지 적었어요.',
    'ck_src': '기준과 출처',
    'about_jumps': [('who', '누가 만드나요'), ('rules', '만드는 기준'), ('check', '확인하고 밝혀 둔 것'), ('upkeep', '계속 고치는 일'), ('ads', '광고와 운영비'), ('contact', '연락처')],
    'what': lambda t, n, games, apps, ng, na: f'''<ul class="ilist">
  <li><b>웹 도구 {t}개</b> 날짜·숫자·월급 계산, 글자수 세기, 파일 변환, 달력 인쇄, QR코드, 기기 테스트, 타이머, 타자 연습, 뽑기. 모두 무료이고 가입이 없어요. <a href="/#tools">웹 도구 둘러보기</a></li>
  <li><b>가이드 {n}편</b> 도구를 쓰다 막히는 곳과 계산 기준을 풀어 쓴 글이에요. 각 도구 사이트에 있고, 도구마다 소개 창에 목록을 모아 두었어요.</li>
  <li><b>게임 {ng}개</b> {games}. 안드로이드 먼저 준비하고 있어요. <a href="/#games">게임 보기</a></li>
  <li><b>앱 {na}개</b> {apps}. <a href="/#games">앱 보기</a></li>
</ul>''',
    'about_body': lambda what, checks: f'''<section id="who" aria-labelledby="who-t">
<h2 id="who-t">누가 만드나요</h2>
<p>루멘랩(Lumen Lab)은 한국의 개인사업자예요. 한 사람이 기획하고 운영하며, 틀린 곳이나 바라는 기능을 메일로 받아 고쳐요.</p>
<dl class="ifacts">
  <div><dt>상호</dt><dd>루멘랩(Lumen Lab)</dd></div>
  <div><dt>형태</dt><dd>개인사업자</dd></div>
  <div><dt>메일</dt><dd><a href="mailto:{MAIL}">{MAIL}</a></dd></div>
  <div><dt>전화</dt><dd><a href="tel:{TEL_INTL}">{TEL}</a></dd></div>
</dl>
<h3>지금까지 만든 것</h3>
{what}
</section>

<section id="rules" aria-labelledby="rules-t">
<h2 id="rules-t">도구를 만드는 기준</h2>
<ul class="irules">
  <li><b>열자마자 바로 써요.</b> 회원 가입, 설치, 하루 사용 제한이 없어요.</li>
  <li><b>넣은 내용은 이 기기 안에서 처리해요.</b> 날짜, 글, 명단, 파일을 루멘랩 서버로 보내지 않고 브라우저 안에서 계산하고 바꿔요. 루멘랩에는 그런 내용을 받는 서버가 없어요.</li>
  <li><b>기준과 출처를 밝혀요.</b> 답이 기준에 따라 갈리는 곳(글자 수의 공백, 만 나이, 6÷2(1+2) 같은 것)은 어느 기준인지 화면에 적고, 법이나 공식 자료를 따르는 숫자는 출처와 확인한 날을 같이 적어요.</li>
  <li><b>계산하고 세는 도구는 따로 구한 정답과 맞춰 봐요.</b> 계산하고 세는 부분은 화면과 떼어 두고, 다른 방법으로 구한 기준값과 대조하는 자동 시험을 붙여요. 도구마다 무엇을 확인했는지는 바로 아래에 있어요.</li>
  <li><b>못 하는 것은 못 한다고 적어요.</b> 웹페이지라서 알 수 없는 것, 아직 없는 기능, 확인하지 못한 것을 도구 화면과 소개에 그대로 적어요.</li>
  <li><b>없는 숫자를 만들지 않아요.</b> 사용자 수, 평점, 후기처럼 확인하지 않은 숫자나 말은 쓰지 않아요.</li>
</ul>
</section>

<section id="check" aria-labelledby="check-t">
<h2 id="check-t">도구마다 확인하고 밝혀 둔 것</h2>
<p>각 도구의 소개 페이지에 적은 것을 한곳에 모았어요. 도구 이름을 누르면 바로 써 볼 수 있고, 자세한 기준과 출처는 '기준과 출처'를 누르면 그 도구 사이트에서 볼 수 있어요.</p>
<dl class="ichecks">
{checks}
</dl>
</section>

<section id="upkeep" aria-labelledby="upkeep-t">
<h2 id="upkeep-t">계속 고치는 일</h2>
<p>도구가 따르는 기준 가운데는 해마다 바뀌는 것이 있어요. 바뀌는 때를 정해 두고 고쳐요.</p>
<ul class="ilist">
  <li><b>떼고얼마</b> 4대 보험 요율과 상한·하한, 근로소득 간이세액표가 새로 나오면 반영해요. 2027년 몫은 지금도 확정된 것, 의결된 것, 아직 안 정해진 것으로 나눠 보여 줘요.</li>
  <li><b>한장달력</b> 다음 해 월력요항이 발표되면(해마다 6월 말쯤) 그해 공휴일을 공식 자료로 바꿔요. 발표 전인 해는 ‘공식 발표 전 자료’라고 표시해요.</li>
  <li><b>한바퀴</b> 나라나 지역이 서머타임과 시간대 규칙을 바꾸면 반영해요. 2026년에 바뀐 캐나다 세 주와 모로코가 그 예예요.</li>
  <li><b>모든 도구</b> 틀린 결과를 알려 주시면 확인해서 고치고, 글을 고치면 그 글에 고친 날을 적어요.</li>
</ul>
</section>

<section id="ads" aria-labelledby="ads-t">
<h2 id="ads-t">광고와 운영비</h2>
<ul class="ilist">
  <li>웹 도구 사이트는 Google 애드센스 광고로 운영비를 내요. 도구와 글은 모두 무료예요.</li>
  <li>이 사이트(lumenlab.page)와 앱의 지원·개인정보 처리방침 페이지에는 광고를 넣지 않아요.</li>
  <li>광고와 쿠키, 방문 통계가 어떻게 동작하는지는 <a href="/privacy/">개인정보 처리방침</a>에 있어요.</li>
</ul>
</section>
''',
    'a_end': f'''<section class="iend" id="contact" aria-labelledby="contact-t">
  <div class="wrap iend__in">
    <h2 id="contact-t" class="iend__title">틀린 결과나 바라는 기능은 메일로 알려 주세요</h2>
    <p class="iend__lead">어떤 도구인지, 기기와 브라우저, 넣은 값을 같이 적어 주시면 빨리 확인할 수 있어요. 전화는 <a href="tel:{TEL_INTL}">{TEL}</a>이에요.</p>
    <p class="iend__row"><a class="btn btn--lamp" href="mailto:{MAIL}">메일 쓰기</a> <a class="iend__more" href="/#works">만든 것 둘러보기 <span aria-hidden="true">→</span></a></p>
  </div>
</section>''',
    'p_title': '루멘랩 개인정보 처리방침',
    'p_lead': f'시행일: {EFFECTIVE[0]}. 루멘랩(Lumen Lab)이 lumenlab.page와 웹 도구 사이트를 운영하면서 이용자의 개인정보를 어떻게 처리하는지 적었어요.',
    'privacy_jumps': [('p-scope', '1. 다루는 곳'), ('p-direct', '2. 직접 처리하는 정보'), ('p-auto', '3. 기기에 남는 것·방문 통계'), ('p-ads', '4. 광고와 쿠키'), ('p-share', '5. 위탁·국외 이전'), ('p-destroy', '6. 파기'), ('p-rights', '7. 이용자의 권리'), ('p-safe', '8. 안전 조치'), ('p-officer', '9. 보호책임자'), ('p-help', '10. 구제 방법'), ('p-change', '11. 변경')],
    'its_policy': lambda n: f'{n} 방침',
    'privacy_body': lambda rows, apps: f'''<section id="p-sum" aria-labelledby="p-sum-t">
<h2 id="p-sum-t">한눈에 보기</h2>
<ul class="ilist">
  <li>회원 가입과 로그인이 없어요. 루멘랩은 사이트에서 이름, 이메일, 전화번호 같은 개인정보를 받지 않아요.</li>
  <li>도구에 넣은 글, 숫자, 날짜, 명단, 파일과 마이크 소리, 카메라 영상은 이용자 브라우저 안에서만 처리하고 루멘랩 서버로 보내지 않아요.</li>
  <li>루멘랩이 직접 받는 개인정보는 이용자가 보낸 문의 메일(메일 주소와 내용)뿐이에요.</li>
  <li>웹 도구 사이트에는 Google 애드센스 광고가 나와요. 이때 Google 같은 광고 업체가 쿠키를 쓸 수 있어요(<a href="#p-ads">4번</a>). lumenlab.page에는 광고가 없어요.</li>
  <li>맞춤 광고는 <a href="https://adssettings.google.com/">Google 광고 설정</a>에서 끌 수 있어요.</li>
  <li>모든 사이트에 쿠키를 쓰지 않는 방문 통계(Cloudflare Web Analytics)가 있어요(<a href="#p-auto">3번</a>).</li>
</ul>
</section>

<section id="p-scope" aria-labelledby="p-scope-t">
<h2 id="p-scope-t">1. 이 방침이 다루는 곳</h2>
<ul class="ilist">
  <li><b>lumenlab.page</b> 루멘랩 홈과 만든 것 소개 페이지, 루멘랩 소개, 앱 지원 페이지</li>
  <li><b>웹 도구 사이트</b> 아래 도구들이에요. 각 도구의 방침은 이 방침에 그 도구에만 해당하는 내용(이 기기에 남기는 항목 등)을 더한 것이에요.</li>
  <li><b>세트노트(setnote.lumenlab.page)</b> 운동 기록 웹 앱이에요. 기록과 설정은 이 기기의 브라우저 저장소에만 남고 서버로 보내지 않아요. 광고가 없어요.</li>
  <li><b>캐슬업! 소개 사이트(castle-up.lumenlab.page)</b> 아직 출시 전인 게임의 소개 페이지예요. 광고가 없고 이 기기에 남기는 것도 없어요. 방문 통계(3번)만 있어요.</li>
</ul>
<p>도구마다 그 도구의 방침으로 이어져요.</p>
<ul class="isites">
{rows}
</ul>
<p>아래 게임과 앱은 각자의 개인정보 처리방침을 따라요.</p>
<ul class="isites">
{apps}
</ul>
</section>

<section id="p-direct" aria-labelledby="p-direct-t">
<h2 id="p-direct-t">2. 루멘랩이 직접 처리하는 개인정보</h2>
<dl class="ifacts ifacts--rows">
  <div><dt>목적</dt><dd>문의 답변과 틀린 곳 제보 확인</dd></div>
  <div><dt>항목</dt><dd>이용자가 보낸 메일 주소와 메일 내용</dd></div>
  <div><dt>보유 기간</dt><dd>답변을 마친 뒤 1년. 삭제를 요청하면 바로 지워요.</dd></div>
</dl>
<p>그 밖에 루멘랩이 따로 모으거나 저장하는 개인정보는 없어요. 메일을 보내지 않으면 루멘랩은 이용자가 누구인지 알 수 없어요.</p>
</section>

<section id="p-auto" aria-labelledby="p-auto-t">
<h2 id="p-auto-t">3. 이 기기에 남는 것과 방문 통계</h2>
<h3>브라우저 저장소</h3>
<p>사이트는 다음에 열 때 편하도록 일부 설정을 이용자 브라우저의 저장소(localStorage)에만 적어요. 서버로 보내지 않아요.</p>
<ul class="ilist">
  <li><b>lumenlab.page</b> 다른 언어 안내 띠를 닫거나 언어 단추를 눌러 고른 언어(lumen:langbar), 앱 지원 페이지에서 고른 언어(lumen:lang)</li>
  <li><b>웹 도구 사이트</b> 도구마다 설정이나 최근 기록을 남기기도 해요. 남기는 항목은 1번 목록의 ‘이 도구의 방침’에 있어요.</li>
</ul>
<p>브라우저 설정에서 사이트 데이터를 지우면 모두 사라져요.</p>
<h3>방문 통계</h3>
<p>사이트를 호스팅하는 Cloudflare가 방문 통계(Cloudflare Web Analytics)를 위해 작은 스크립트를 페이지에 넣어요. 본 페이지 주소, 직전 페이지 주소, 페이지가 열리는 데 걸린 시간, 브라우저 종류 같은 것을 모으고 쿠키는 쓰지 않아요. 도구에 넣은 내용은 여기에 실리지 않아요. 루멘랩은 Cloudflare 화면에서 집계된 숫자(방문 수, 많이 본 페이지 등)만 봐요.</p>
<h3>접속 기록</h3>
<p>페이지를 보내는 과정에서 Cloudflare가 IP 주소 같은 접속 정보를 처리하고 서비스를 안전하게 운영하려고 잠시 기록할 수 있어요. 도구에 따라 글꼴 같은 파일을 공개 전송망(jsDelivr 등)에서 받기도 하는데, 그때도 다른 웹 요청처럼 접속 IP가 전달돼요. 어느 쪽도 도구에 넣은 내용은 받지 않아요.</p>
</section>

<section id="p-ads" aria-labelledby="p-ads-t">
<h2 id="p-ads-t">4. 광고와 쿠키(웹 도구 사이트)</h2>
<p>웹 도구 사이트는 Google 애드센스로 광고를 보여 줘요. lumenlab.page와 앱의 지원·방침 페이지에는 광고가 없어요.</p>
<ul class="ilist">
  <li>Google을 비롯한 제3자 광고 업체는 쿠키를 써서 이용자가 이 사이트나 다른 사이트에 방문한 기록을 바탕으로 광고를 보여 줄 수 있어요.</li>
  <li>광고 때문에 Google 같은 제3자가 이용자 브라우저에 쿠키를 넣거나 읽을 수 있고, 웹 비콘(눈에 보이지 않는 작은 이미지) 같은 기술로 정보를 모을 수 있어요.</li>
  <li>Google이 이 정보를 어떻게 쓰는지는 <a href="https://policies.google.com/technologies/partner-sites?hl=ko">파트너 사이트에서 Google이 데이터를 사용하는 방식</a>에서 볼 수 있어요.</li>
</ul>
<h3>맞춤 광고에 쓰이는 정보(행태정보)</h3>
<dl class="ifacts ifacts--rows">
  <div><dt>모으는 곳</dt><dd>Google(애드센스)</dd></div>
  <div><dt>항목</dt><dd>광고 쿠키 식별자, 본 페이지 주소와 방문 시각, 광고를 보거나 누른 기록, 브라우저·기기 정보 같은 웹 이용 기록</dd></div>
  <div><dt>방법</dt><dd>웹 도구 페이지가 열릴 때 광고 코드가 쿠키와 웹 비콘으로 자동으로 모아요.</dd></div>
  <div><dt>목적</dt><dd>광고를 보여 주고, 관심사에 맞는 광고를 고르고, 광고 성과를 재요.</dd></div>
  <div><dt>보유 기간</dt><dd>Google 개인정보처리방침을 따라요.</dd></div>
</dl>
<ul class="ilist">
  <li>맞춤 광고는 <a href="https://adssettings.google.com/">Google 광고 설정</a>에서 끌 수 있어요. 다른 광고 업체의 맞춤 광고는 <a href="https://www.aboutads.info/choices/">aboutads.info</a>에서 끌 수 있어요.</li>
  <li>쿠키는 브라우저 설정에서 막거나 지울 수 있어요. 막아도 도구는 그대로 쓸 수 있고, 맞춤이 아닌 광고가 나올 수 있어요.</li>
</ul>
<p>광고 정보는 Google이 직접 모으고 처리해요. 루멘랩은 이 정보를 받거나 저장하지 않고, 애드센스가 주는 집계 보고서(광고 노출 수, 수익 등)만 봐요.</p>
</section>

<section id="p-share" aria-labelledby="p-share-t">
<h2 id="p-share-t">5. 제3자 제공, 처리 위탁, 국외 이전</h2>
<p>루멘랩은 이용자의 개인정보를 제3자에게 제공하지 않아요. 아래 일은 맡기고 있어요(처리 위탁). 두 곳 모두 미국 회사라, 맡긴 정보가 국외(미국 등) 서버에서 처리될 수 있어요(국외 이전).</p>
<dl class="ifacts ifacts--rows">
  <div><dt>Cloudflare, Inc.</dt><dd>사이트 호스팅과 방문 통계, contact@lumenlab.page로 온 메일을 루멘랩 메일함으로 전달. 옮겨지는 정보: 접속 정보, 방문 통계 항목(3번), 보낸 메일의 주소와 내용. 개인정보 문의: privacyquestions@cloudflare.com</dd></div>
  <div><dt>Google LLC</dt><dd>루멘랩 메일함(Gmail)에 문의 메일 보관. 옮겨지는 정보: 보낸 메일의 주소와 내용. 개인정보 문의: googlekrsupport@google.com</dd></div>
</dl>
<p>정보는 사이트를 열거나 메일을 보낼 때 인터넷으로 암호화해 옮겨지고, 보유 기간은 2번을 따라요. 국외 이전을 원하지 않으면 메일을 보내지 않으면 돼요. 다만 이때는 답변을 드릴 수 없어요. 광고 정보(4번)는 Google이 직접 모으는 것이라 루멘랩이 넘기는 것이 아니에요.</p>
</section>

<section id="p-destroy" aria-labelledby="p-destroy-t">
<h2 id="p-destroy-t">6. 파기 절차와 방법</h2>
<ul class="ilist">
  <li>보유 기간이 끝나거나 목적을 이루면 지체 없이 파기해요.</li>
  <li>전자 파일은 되살릴 수 없는 방법으로 지우고, 종이 문서는 쓰지 않아요.</li>
  <li>브라우저 저장소에 남은 설정은 이용자가 사이트 데이터를 지우면 파기돼요.</li>
</ul>
</section>

<section id="p-rights" aria-labelledby="p-rights-t">
<h2 id="p-rights-t">7. 이용자와 법정대리인의 권리</h2>
<ul class="ilist">
  <li>이용자(만 14세 미만이면 법정대리인)는 언제든 개인정보의 열람, 정정, 삭제, 처리 정지를 요청할 수 있어요. 아래 메일로 보내 주시면 지체 없이 처리해요.</li>
  <li>루멘랩이 보관하지 않는 정보(브라우저 저장소, Google이 처리하는 광고 정보)는 각각 브라우저 설정과 Google 계정·광고 설정에서 관리할 수 있어요.</li>
  <li>사이트는 어린이를 주 대상으로 하지 않고, 누구의 개인정보도 사이트에서 직접 모으지 않아요.</li>
</ul>
</section>

<section id="p-safe" aria-labelledby="p-safe-t">
<h2 id="p-safe-t">8. 안전성 확보 조치</h2>
<ul class="ilist">
  <li>이용자가 도구에 넣은 내용을 받는 서버가 없어서 루멘랩 쪽에 쌓이는 입력 정보가 없어요.</li>
  <li>모든 사이트는 암호화된 연결(HTTPS)로만 열려요.</li>
  <li>문의 메일은 루멘랩만 볼 수 있는 메일함에 두고, 접근할 수 있는 사람을 운영자로 한정해요.</li>
</ul>
</section>

<section id="p-officer" aria-labelledby="p-officer-t">
<h2 id="p-officer-t">9. 개인정보 보호책임자</h2>
<dl class="ifacts">
  <div><dt>담당 부서</dt><dd>루멘랩(Lumen Lab) 개인정보 보호 담당</dd></div>
  <div><dt>메일</dt><dd><a href="mailto:{MAIL}">{MAIL}</a></dd></div>
  <div><dt>전화</dt><dd><a href="tel:{TEL_INTL}">{TEL}</a></dd></div>
</dl>
<p>열람 청구 등 개인정보 관련 문의도 위 메일로 받아요.</p>
</section>

<section id="p-help" aria-labelledby="p-help-t">
<h2 id="p-help-t">10. 권익침해 구제 방법</h2>
<p>개인정보 침해로 상담이나 구제가 필요하면 아래 기관에 문의할 수 있어요.</p>
<ul class="ilist">
  <li>개인정보 침해신고센터: privacy.kisa.or.kr, 국번 없이 118</li>
  <li>개인정보 분쟁조정위원회: www.kopico.go.kr, 1833-6972</li>
  <li>대검찰청: www.spo.go.kr, 국번 없이 1301</li>
  <li>경찰청: ecrm.police.go.kr, 국번 없이 182</li>
</ul>
</section>

<section id="p-change" aria-labelledby="p-change-t">
<h2 id="p-change-t">11. 처리방침 변경</h2>
<p>이 처리방침이 바뀌면 이 페이지에 시행일과 함께 알려요. 이 방침은 lumenlab.page 전체를 다루는 첫 판이라 이전 판은 없어요.</p>
</section>''',
}

# ---------- 글 (영어) ----------
EN = {
    'jump_label': 'On this page',
    'a_kicker': 'About',
    'a_title': 'Lumen Lab is a small, one-person <span class="nw">software studio</span>',
    'a_lead': 'We make phone games, apps and free web tools that work right in your browser. This page covers who makes them, what each tool checks and how the sites pay for themselves.',
    'ck_src': 'Rules and sources',
    'about_jumps': [('who', 'Who we are'), ('rules', 'How we build'), ('check', 'What each tool checks'), ('upkeep', 'Keeping things current'), ('ads', 'Ads'), ('contact', 'Contact')],
    'what': lambda t, n, games, apps, ng, na: f'''<ul class="ilist">
  <li><b>{t} web tools</b> Date, number and pay calculators, a character counter, file conversion, printable calendars, QR codes, device tests, timers, typing practice and fair picks. All free, no sign-up. <a href="/en/#tools">See the tools</a></li>
  <li><b>{n} English guides</b> Explainers on the tricky parts of each tool and the rules behind the numbers. They live on each tool’s site, and each tool’s preview lists them.</li>
  <li><b>{ng} games</b> {games}. Android comes first. <a href="/en/#games">See the games</a></li>
  <li><b>{na} apps</b> {apps}. <a href="/en/#games">See the apps</a></li>
</ul>''',
    'about_body': lambda what, checks: f'''<section id="who" aria-labelledby="who-t">
<h2 id="who-t">Who we are</h2>
<p>Lumen Lab (<span lang="ko">루멘랩</span>) is a sole proprietorship based in Korea. One person plans and runs it, and fixes what readers report by email.</p>
<dl class="ifacts">
  <div><dt>Name</dt><dd>Lumen Lab (<span lang="ko">루멘랩</span>)</dd></div>
  <div><dt>Type</dt><dd>Sole proprietorship</dd></div>
  <div><dt>Email</dt><dd><a href="mailto:{MAIL}">{MAIL}</a></dd></div>
  <div><dt>Phone</dt><dd><a href="tel:{TEL_INTL}">{TEL_INTL}</a></dd></div>
</dl>
<h3>What we have made so far</h3>
{what}
</section>

<section id="rules" aria-labelledby="rules-t">
<h2 id="rules-t">How we build the tools</h2>
<ul class="irules">
  <li><b>Ready to use.</b> No sign-up, nothing to install, no daily limits.</li>
  <li><b>Your input stays on your device.</b> Dates, text, name lists and files are worked on inside your browser and never sent to a Lumen Lab server. There is no server that receives them.</li>
  <li><b>Rules and sources are shown.</b> Where the answer depends on a rule (spaces in a character count, a holiday falling on a weekend, 6÷2(1+2)), the page says which rule it uses, and numbers that come from laws or official data show their source and the date we checked.</li>
  <li><b>Calculators and counters are checked against separate answers.</b> The counting and calculating code is kept apart from the page and tested automatically against reference values worked out another way. What each tool checks is listed just below.</li>
  <li><b>Limits are written down.</b> What a web page cannot know, features that don’t exist yet and things we could not verify are stated on the tool and its About page.</li>
  <li><b>No made-up numbers.</b> We don’t publish user counts, ratings or testimonials we haven’t verified.</li>
</ul>
</section>

<section id="check" aria-labelledby="check-t">
<h2 id="check-t">What each tool checks and discloses</h2>
<p>This gathers what each tool’s About page says. Follow a tool’s name to try it here, or “Rules and sources” for the full details on the tool’s own site.</p>
<dl class="ichecks">
{checks}
</dl>
</section>

<section id="upkeep" aria-labelledby="upkeep-t">
<h2 id="upkeep-t">Keeping things current</h2>
<p>Some of the rules the tools follow change every year, so updates are planned around when they change.</p>
<ul class="ilist">
  <li><b>Takehome Korea</b> New social insurance rates, contribution limits and the withholding table are added when they are published. For 2027 it already separates what is set, what is approved and what is not decided yet.</li>
  <li><b>Onesheet</b> Korean holidays are switched to the official almanac once it is published each year (around late June). Until it is out, that year is marked “not yet official”.</li>
  <li><b>Oneturn</b> Changes to daylight saving or time zone rules are added as countries make them, like the 2026 changes in three Canadian provinces and Morocco.</li>
  <li><b>All tools</b> If you report a wrong result, we check it and fix it. When a guide changes, it shows the date it was updated.</li>
</ul>
</section>

<section id="ads" aria-labelledby="ads-t">
<h2 id="ads-t">Ads and running costs</h2>
<ul class="ilist">
  <li>The web tool sites are paid for by Google AdSense ads. The tools and guides are free.</li>
  <li>This site (lumenlab.page) and the app support and privacy pages carry no ads.</li>
  <li>How ads, cookies and visit statistics work is explained in the <a href="/en/privacy/">privacy policy</a>.</li>
</ul>
</section>
''',
    'a_end': f'''<section class="iend" id="contact" aria-labelledby="contact-t">
  <div class="wrap iend__in">
    <h2 id="contact-t" class="iend__title">Found a wrong result, or want a feature? Email us</h2>
    <p class="iend__lead">Tell us which tool, your device and browser, and what you entered, and we can check it faster. Phone: <a href="tel:{TEL_INTL}">{TEL_INTL}</a> (in Korean).</p>
    <p class="iend__row"><a class="btn btn--lamp" href="mailto:{MAIL}">Write an email</a> <a class="iend__more" href="/en/#works">See what we make <span aria-hidden="true">→</span></a></p>
  </div>
</section>''',
    'p_title': 'Lumen Lab Privacy Policy',
    'p_lead': f'Effective {EFFECTIVE[1]}. How Lumen Lab handles personal information on lumenlab.page and its web tool sites.',
    'privacy_jumps': [('p-scope', '1. Where it applies'), ('p-direct', '2. What we handle'), ('p-auto', '3. Device storage and statistics'), ('p-ads', '4. Ads and cookies'), ('p-share', '5. Service providers'), ('p-destroy', '6. Deletion'), ('p-rights', '7. Your rights'), ('p-safe', '8. Security'), ('p-officer', '9. Privacy contact'), ('p-help', '10. Complaints'), ('p-change', '11. Changes')],
    'its_policy': lambda n: f'{n} privacy policy',
    'privacy_body': lambda rows, apps: f'''<section id="p-sum" aria-labelledby="p-sum-t">
<h2 id="p-sum-t">Summary</h2>
<ul class="ilist">
  <li>There are no accounts or logins. Lumen Lab does not collect your name, email address or phone number on these sites.</li>
  <li>Text, numbers, dates, name lists, files, microphone audio and camera video you use in the tools are processed in your browser only and are never sent to a Lumen Lab server.</li>
  <li>The only personal information Lumen Lab receives directly is an email you choose to send us (your address and the message).</li>
  <li>The web tool sites show Google AdSense ads, and ad companies such as Google may use cookies (<a href="#p-ads">section 4</a>). lumenlab.page itself has no ads.</li>
  <li>You can turn off personalized ads in <a href="https://adssettings.google.com/">Google Ad Settings</a>.</li>
  <li>Every site has cookie-free visit statistics (Cloudflare Web Analytics, <a href="#p-auto">section 3</a>).</li>
</ul>
</section>

<section id="p-scope" aria-labelledby="p-scope-t">
<h2 id="p-scope-t">1. Where this policy applies</h2>
<ul class="ilist">
  <li><b>lumenlab.page</b> the Lumen Lab home and product pages, About Lumen Lab and the app support pages</li>
  <li><b>The web tool sites</b> listed below. Each tool’s own policy adds what applies to that tool only, such as what it saves on your device.</li>
  <li><b>SetNote (setnote.lumenlab.page)</b> a workout log web app. Your log and settings stay in your browser’s storage on this device and are never sent to a server. It has no ads.</li>
  <li><b>Castle Up! (castle-up.lumenlab.page)</b> the page for a game that is not out yet. It has no ads and saves nothing on your device; only the visit statistics in section 3 apply.</li>
</ul>
<p>Each tool links to its own policy.</p>
<ul class="isites">
{rows}
</ul>
<p>The games and apps below have their own privacy policies.</p>
<ul class="isites">
{apps}
</ul>
</section>

<section id="p-direct" aria-labelledby="p-direct-t">
<h2 id="p-direct-t">2. Information Lumen Lab handles directly</h2>
<dl class="ifacts ifacts--rows">
  <div><dt>Purpose</dt><dd>Answering questions and checking reported mistakes</dd></div>
  <div><dt>What</dt><dd>The email address and message you send</dd></div>
  <div><dt>How long</dt><dd>One year after we reply, or deleted right away if you ask</dd></div>
</dl>
<p>Lumen Lab collects and stores no other personal information. Unless you email us, we have no way of knowing who you are.</p>
</section>

<section id="p-auto" aria-labelledby="p-auto-t">
<h2 id="p-auto-t">3. What stays on your device, and visit statistics</h2>
<h3>Browser storage</h3>
<p>To make the next visit easier, the sites keep a few settings in your browser’s storage (localStorage). Nothing there is sent to a server.</p>
<ul class="ilist">
  <li><b>lumenlab.page</b> the language you picked by closing the language suggestion or pressing the language button (lumen:langbar), and the language chosen on the app support pages (lumen:lang)</li>
  <li><b>Web tool sites</b> some tools keep settings or recent results. Each tool lists exactly what in its own policy (section 1).</li>
</ul>
<p>Clearing site data in your browser removes all of it.</p>
<h3>Visit statistics</h3>
<p>Cloudflare, which hosts the sites, adds a small script for visit statistics (Cloudflare Web Analytics). It collects things like the page address, the previous page address, how long the page took to load and the browser type, and it does not use cookies. Nothing you enter in a tool is part of it. Lumen Lab only sees the totals in Cloudflare’s dashboard (visits, most-viewed pages and so on).</p>
<h3>Server logs</h3>
<p>To deliver pages, Cloudflare processes connection details such as your IP address and may keep basic logs for a short time to run the service securely. Some tools load files such as fonts from a public CDN (for example jsDelivr), which also receives your IP address like any web request. Neither receives what you enter in a tool.</p>
</section>

<section id="p-ads" aria-labelledby="p-ads-t">
<h2 id="p-ads-t">4. Advertising and cookies (web tool sites)</h2>
<p>The web tool sites show ads through Google AdSense. lumenlab.page and the app support and privacy pages have no ads.</p>
<ul class="ilist">
  <li>Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites.</li>
  <li>Because of ads, third parties such as Google may place and read cookies on your browser and may use web beacons (tiny invisible images) to collect information.</li>
  <li>See <a href="https://policies.google.com/technologies/partner-sites">How Google uses information from sites or apps that use our services</a>.</li>
</ul>
<h3>Information used for personalized ads</h3>
<dl class="ifacts ifacts--rows">
  <div><dt>Collected by</dt><dd>Google (AdSense)</dd></div>
  <div><dt>What</dt><dd>Browsing data such as ad cookie IDs, the pages viewed and when, ads seen or clicked, and browser and device details</dd></div>
  <div><dt>How</dt><dd>Collected automatically by the ad code, through cookies and web beacons, when a web tool page opens</dd></div>
  <div><dt>Why</dt><dd>To show ads, choose ads that match your interests and measure how ads perform</dd></div>
  <div><dt>How long</dt><dd>As set out in Google’s Privacy Policy</dd></div>
</dl>
<ul class="ilist">
  <li>You can turn off personalized ads in <a href="https://adssettings.google.com/">Google Ad Settings</a>, and opt out of other vendors’ personalized ads at <a href="https://www.aboutads.info/choices/">aboutads.info</a>.</li>
  <li>You can block or delete cookies in your browser settings. The tools keep working, and you may see non-personalized ads.</li>
</ul>
<p>Ad data is collected and processed by Google directly. Lumen Lab does not receive or store it; we only see AdSense’s totals (impressions, earnings and so on).</p>
</section>

<section id="p-share" aria-labelledby="p-share-t">
<h2 id="p-share-t">5. Sharing, service providers and transfers abroad</h2>
<p>Lumen Lab does not sell your personal information or hand it to third parties; ad cookies are set by Google directly (section 4). We use the service providers below. Both are US companies, so information may be processed on servers outside Korea, including in the United States.</p>
<dl class="ifacts ifacts--rows">
  <div><dt>Cloudflare, Inc.</dt><dd>Hosting and visit statistics, and forwarding mail sent to contact@lumenlab.page to our mailbox. Data involved: connection details, the statistics in section 3, and the address and content of emails you send. Privacy contact: privacyquestions@cloudflare.com</dd></div>
  <div><dt>Google LLC</dt><dd>Keeping your emails in our mailbox (Gmail). Data involved: the address and content of emails you send. Privacy contact: the contact link in <a href="https://policies.google.com/privacy">Google’s Privacy Policy</a></dd></div>
</dl>
<p>Data is encrypted in transit and kept as described in section 2. If you don’t want your email transferred abroad, please don’t email us; we won’t be able to reply in that case. Ad data (section 4) is collected by Google directly, not passed on by us.</p>
</section>

<section id="p-destroy" aria-labelledby="p-destroy-t">
<h2 id="p-destroy-t">6. Deletion</h2>
<ul class="ilist">
  <li>When the retention period ends or the purpose is met, the information is deleted without delay.</li>
  <li>Electronic files are deleted so they can’t be recovered. We keep no paper records.</li>
  <li>Settings in your browser storage are removed when you clear the site’s data.</li>
</ul>
</section>

<section id="p-rights" aria-labelledby="p-rights-t">
<h2 id="p-rights-t">7. Your rights</h2>
<ul class="ilist">
  <li>You (or a legal guardian for a child under 14) can ask to see, correct, delete or stop the processing of your personal information at any time. Email us and we will act without delay.</li>
  <li>Information we don’t hold (your browser storage, ad data processed by Google) can be managed in your browser settings and in your Google account and ad settings.</li>
  <li>The sites are not aimed at children, and we don’t collect anyone’s personal information on them.</li>
</ul>
</section>

<section id="p-safe" aria-labelledby="p-safe-t">
<h2 id="p-safe-t">8. Security</h2>
<ul class="ilist">
  <li>There is no server that receives what you enter in the tools, so none of it builds up on our side.</li>
  <li>All sites are served over encrypted connections (HTTPS) only.</li>
  <li>Emails are kept in a mailbox only Lumen Lab can access.</li>
</ul>
</section>

<section id="p-officer" aria-labelledby="p-officer-t">
<h2 id="p-officer-t">9. Privacy contact</h2>
<dl class="ifacts">
  <div><dt>Who</dt><dd>Lumen Lab (a one-person business)</dd></div>
  <div><dt>Email</dt><dd><a href="mailto:{MAIL}">{MAIL}</a></dd></div>
  <div><dt>Phone</dt><dd><a href="tel:{TEL_INTL}">{TEL_INTL}</a> (in Korean)</dd></div>
</dl>
</section>

<section id="p-help" aria-labelledby="p-help-t">
<h2 id="p-help-t">10. Help with a complaint</h2>
<p>Lumen Lab is based in Korea. If you need help with a privacy complaint, you can also contact the Korean Personal Information Infringement Report Center (privacy.kisa.or.kr, 118 within Korea) or the Personal Information Dispute Mediation Committee (www.kopico.go.kr).</p>
</section>

<section id="p-change" aria-labelledby="p-change-t">
<h2 id="p-change-t">11. Changes</h2>
<p>If this policy changes, this page will show the new effective date. This is the first version covering all of lumenlab.page, so there is no earlier one.</p>
</section>''',
}


# ---------- 만들기 ----------
def build(site, cat, groups, tools):
    """루트 정보 페이지(소개·방침과 영어판)를 쓰고, 사이트맵에 넣을 주소(한국어 쪽)와 언어별 가이드 글 수를 돌려준다."""
    ko_src = open(os.path.join(site, 'index.html')).read()
    en_src = open(os.path.join(site, 'en', 'index.html')).read()
    counts = {l: sum(len(read_guides(site, it, l)[1]) for it in tools) for l in ('ko', 'en')}
    org = {'@type': 'Organization', 'name': 'Lumen Lab', 'alternateName': '루멘랩', 'url': ROOT + '/', 'email': MAIL, 'telephone': TEL_INTL}
    out = []
    for lang, src in (('ko', ko_src), ('en', en_src)):
        pre = '' if lang == 'ko' else '/en'
        if lang == 'ko':
            at, ad = '루멘랩 소개 · Lumen Lab', '루멘랩(Lumen Lab)은 혼자 운영하는 작은 소프트웨어 스튜디오예요. 누가 만드는지, 웹 도구의 결과를 어떻게 확인하는지, 운영비와 연락처.'
            pt, pd = '개인정보 처리방침 · Lumen Lab 루멘랩', 'lumenlab.page와 루멘랩 웹 도구 사이트의 개인정보 처리방침: 처리하는 정보, 광고 쿠키(Google 애드센스), 방문 통계, 위탁과 국외 이전, 이용자의 권리.'
        else:
            at, ad = 'About Lumen Lab', 'Lumen Lab is a small, one-person software studio. Who makes the tools, how their results are checked, how the sites are paid for, and how to reach us.'
            pt, pd = 'Privacy Policy · Lumen Lab', 'Privacy policy for lumenlab.page and the Lumen Lab web tool sites: what is processed, advertising cookies (Google AdSense), visit statistics, service providers and your rights.'
        pages = [
            (f'{pre}/about/', at, ad, about_main(lang, cat, tools, groups, counts), 'website', {'@context': 'https://schema.org', '@type': 'AboutPage', 'name': at, 'url': f'{ROOT}{pre}/about/', 'inLanguage': lang, 'mainEntity': org}),
            (f'{pre}/privacy/', pt, pd, privacy_main(lang, cat, tools, groups), 'article', None),
        ]
        for path, title, desc, main, kind, ld in pages:
            d = os.path.join(site, path.strip('/')); os.makedirs(d, exist_ok=True)
            open(os.path.join(d, 'index.html'), 'w').write(page(lang, path, title, desc, main, src, kind, ld))
            out.append(path)
    print('정보 페이지:', ', '.join(out), f'(가이드 한국어 {counts["ko"]}편, 영어 {counts["en"]}편)')
    return ['/about/', '/privacy/'], counts
