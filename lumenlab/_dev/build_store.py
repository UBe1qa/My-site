# 만든 것 15개의 소개(앱스토어 소개 화면처럼)를 만든다. 혼자 돌리지 않고 build_home.py 가 부른다.
#   1) 홈의 큰 아이콘 칸(gen:wall): 누르면 assets/store.js 가 같은 페이지에 소개 창을 띄운다.
#   2) 소개 페이지 /works/<id>/ · /en/works/<id>/: 소개 창과 같은 내용. 창은 이 페이지를 불러 그 안의 .sh__body 를 그대로 옮겨 담는다
#      (글은 여기 한 곳에서만 만든다). 주소를 공유하거나 새로 고치면 이 페이지가 열리고, 검색엔진·애드센스도 이 페이지로 읽는다.
# 사실은 catalog.json(이름·하는 일·확인한 것·링크)과 showcase.json(창에만 쓰는 사실 줄·미리 보기·카드), 가이드 목록은 도구 사이트의 글(build_info.read_guides).
import os, re, json, hashlib, html as H
from urllib.parse import urlparse
import build_info as BI

here = os.path.dirname(os.path.abspath(__file__)); mono = os.path.dirname(os.path.dirname(here))
SC = json.load(open(os.path.join(here, 'showcase.json')))
esc = BI.esc
KO_WORD = {'games': '게임', 'apps': '앱', 'tools': '웹 도구'}

# 카드 그림 글자: 선 몇 개로 그 일을 가리킨다(showcase.json 의 more[].g)
GLYPH = {
    'calendar': 'M4 7h16M4 5h16v14H4zM8 3v4M16 3v4M8 11h2M12 11h2M16 11h2M8 15h2M12 15h2',
    'clock': 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2',
    'count': 'M5 6h14M5 12h10M5 18h6M19 15v6M16 18h6',
    'file': 'M7 3h7l4 4v14H7zM14 3v4h4M10 13h5M10 17h5',
    'swap': 'M5 8h12l-3-3M19 16H7l3 3',
    'pdf': 'M7 3h7l4 4v14H7zM14 3v4h4M9.5 16v-4h1.5a1.3 1.3 0 0 1 0 2.6H9.5',
    'image': 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5a1 1 0 1 0 0 .01',
    'sound': 'M5 10v4h3l4 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
    'video': 'M4 6h12v12H4zM16 10l4-2v8l-4-2',
    'key': 'M3 7h18v10H3zM6 10h1M9 10h1M12 10h1M15 10h1M18 10h1M7 14h10',
    'mouse': 'M12 3a5 5 0 0 0-5 5v6a5 5 0 0 0 10 0V8a5 5 0 0 0-5-5zM12 3v6',
    'mic': 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4',
    'screen': 'M3 5h18v12H3zM8 21h8M12 17v4',
    'pad': 'M6 9h12a3 3 0 0 1 3 3v2a3 3 0 0 1-5 2l-1-1H9l-1 1a3 3 0 0 1-5-2v-2a3 3 0 0 1 3-3zM8 11v3M6.5 12.5h3M16 12h.01M18 13h.01',
    'cam': 'M4 7h3l2-2h6l2 2h3v12H4zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    'dice': 'M5 5h14v14H5zM9 9h.01M15 15h.01M12 12h.01',
    'coin': 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4',
    'ladder': 'M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8',
    'team': 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a5 5 0 0 1 10 0M11 20a5 5 0 0 1 10 0',
    'wheel': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M3 12h18M5.6 5.6l12.8 12.8',
    'qr': 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2',
    'wifi': 'M4 9a12 12 0 0 1 16 0M7 12.5a7.5 7.5 0 0 1 10 0M10 16a3 3 0 0 1 4 0M12 19h.01',
    'card': 'M3 6h18v12H3zM7 10a2 2 0 1 0 0 .01M6 15h4M13 10h5M13 13h5',
    'scan': 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16',
    'stack': 'M4 8l8-4 8 4-8 4zM4 12l8 4 8-4M4 16l8 4 8-4',
    'money': 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 10v4M18 10v4',
    'hour': 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9',
    'leave': 'M5 20V5M5 5h11l-2 4 2 4H5',
    'table': 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
    'func': 'M10 20c2 0 2-3 3-8s1-8 3-8M8 11h7',
    'matrix': 'M7 4H5v16h2M17 4h2v16h-2M9 9h.01M12 9h.01M15 9h.01M9 15h.01M12 15h.01M15 15h.01',
    'stats': 'M5 19V11M10 19V6M15 19v-9M20 19V9M3 19h19',
    'base': 'M5 7h3v10H5zM11 7h2M11 12h2M11 17h2M16 7l3 5-3 5',
    'print': 'M7 9V4h10v5M5 9h14v7h-3M8 13h8v7H8z',
    'sms': 'M4 5h16v11H9l-5 4zM8 10h8',
    'grid': 'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16',
    'type': 'M3 7h18v10H3zM6 10h2M10 10h2M14 10h2M18 10h0M8 14h8',
    'globe': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
    'alarm': 'M12 6a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM12 9v4l2 2M4 6l3-3M20 6l-3-3',
    'stop': 'M12 6a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM12 13l3-3M10 2h4',
    'rate': 'M4 18l4-8 4 5 4-9 4 12',
    'pixel': 'M4 4h16v16H4zM10 10h4v4h-4z',
    'speaker': 'M5 10v4h3l4 4V6L8 10zM16 9a4 4 0 0 1 0 6',
    'age': 'M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 20a6 6 0 0 1 12 0',
    'plus': 'M12 5v14M5 12h14',
    'sun': 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
    # 게임·앱 카드
    'play': 'M8 5.5v13l10.5-6.5z',
    'paw': 'M12 13c-3 0-5 3-5 5s2 2 3 2 1.2-.5 2-.5 1 .5 2 .5 3 0 3-2-2-5-5-5zM6.5 10.5a1.5 2 0 1 0 0 .01M17.5 10.5a1.5 2 0 1 0 0 .01M9.8 6.5a1.5 2 0 1 0 0 .01M14.2 6.5a1.5 2 0 1 0 0 .01',
    'home': 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
    'help': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01',
    'sword': 'M14.5 4H20v5.5L10 19.5 4.5 14zM7 17l-3 3M5.5 12.5l6 6',
    'moon': 'M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z',
    'castle': 'M4 20V10h3V7h2v3h2V7h2v3h2V7h2v3h3v10zM10 20v-4a2 2 0 0 1 4 0v4',
    'list': 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
    'dumbbell': 'M3 10v4M6 7.5v9M18 7.5v9M21 10v4M6 12h12',
}
def glyph(g):
    assert g in GLYPH, f'그림 글자 {g} 없음'
    return f'<svg class="gly" viewBox="0 0 24 24" aria-hidden="true"><path d="{GLYPH[g]}"/></svg>'

KO = {
    'open': '열기', 'try': '바로 써 보기', 'shots': '미리 보기', 'more': '이런 것도 돼요', 'more_w': '더 알아보기',
    'check': '확인하고 밝혀 둔 것', 'note': '밝혀 둔 것', 'guides': lambda n: f'가이드 {n}편', 'guide_all': '가이드 목록 보기',
    'about': lambda n: f'{n} 소개에서 자세히', 'others': '다른 것도 둘러보기', 'crumb': '만든 것', 'crumb_label': '위치',
    'privacy': '개인정보 처리방침',
    'title': lambda n, w: f'{n}: {w} · Lumen Lab 루멘랩',
    'ui': {'close': '닫기', 'open': '열기', 'loading': '불러오는 중', 'fail': '미리보기를 불러오지 못했어요. 도구에서 바로 써 보세요.',
           'yours': '직접 해 보세요', 'auto': '자동으로 보여 주는 중', 'replay': '다시 보기', 'play': '영상 재생', 'pause': '영상 멈춤'},
    'wall_title': lambda n: f'만든 것 {n}개, <span class="nw">눌러서 바로 써 보세요</span>',
    'wall_lead': '웹 도구는 창 안에서 그 도구의 계산이 그대로 돌고, 게임과 앱은 실제 화면을 보여 드려요. 도구 아이콘 밑 ✓ 줄은 그 도구가 확인하고 밝혀 둔 것이에요.',
    'games_line': '휴대폰 게임이에요. 안드로이드부터 출시를 준비하고 있어요.',
    'apps_line': '맥과 브라우저에서 쓰는 앱이에요.',
}
EN = {
    'open': 'Open', 'try': 'Try it here', 'shots': 'Preview', 'more': 'It can also', 'more_w': 'Learn more',
    'check': 'What it checks and discloses', 'note': 'What we disclose', 'guides': lambda n: f'{n} guide' + ('' if n == 1 else 's'), 'guide_all': 'All guides',
    'about': lambda n: f'More in About {n}', 'others': 'More from Lumen Lab', 'crumb': 'Work', 'crumb_label': 'Breadcrumb',
    'privacy': 'Privacy Policy',
    'title': lambda n, w: f'{n}: {w} · Lumen Lab',
    'ui': {'close': 'Close', 'open': 'Open', 'loading': 'Loading', 'fail': 'The preview didn’t load. Try it on the tool’s own site.',
           'yours': 'Your turn', 'auto': 'Playing a demo', 'replay': 'Replay', 'play': 'Play video', 'pause': 'Pause video'},
    'wall_title': lambda n: f'{n} things we make. <span class="nw">Open one to try it</span>',
    'wall_lead': 'The web tools run their real calculations right in the window, and the games and apps show real screens. The ✓ line under each tool is what it checks and discloses.',
    'games_line': 'Games for your phone, getting ready for Android first.',
    'apps_line': 'Apps for the Mac and the browser.',
}

def text_mix(hex_):
    """글자로 쓰는 색(--tct): 밝은 종이(#FAF9F6) 위에서 4.5:1이 넘을 때까지 검정을 섞는 비율(%)."""
    def lum(v):
        v = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in v]
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
    c = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]; paper = lum([250 / 255, 249 / 255, 246 / 255])
    for p in range(82, 40, -4):
        if (paper + 0.05) / (lum([x * p / 100 for x in c]) + 0.05) >= 4.6: return p
    return 40

def plain(h):
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', h))).strip()

def order(cat):
    """홈 아이콘 칸 순서: 게임 → 앱 → 웹 도구(묶음 순서). [(kind, it), …]"""
    out = [('games', it) for it in cat.get('games', [])] + [('apps', it) for it in cat['apps']]
    for g in cat['groups']: out += [('tools', it) for it in cat['tools'] if it['group'] == g['id']]
    return out

def sc_of(kind, it):
    s = SC[kind].get(it['id'])
    assert s, f"showcase.json {kind}.{it['id']} 없음"
    return s

def short_what(kind, it, lang):
    """아이콘 밑·페이지 제목에 쓰는 '하는 일' 몇 마디. 도구는 catalog 의 what, 게임·앱은 showcase 의 what."""
    if kind == 'tools': return it['what'][lang]
    return sc_of(kind, it)['what'][lang]

def home_url(kind, it, lang):
    if kind == 'tools': return BI.tool_pages(it, lang)['home']
    return it.get('url_en') if lang == 'en' and it.get('url_en') else it['url']

def en_link(href, lang):
    """앱 방침·지원처럼 한 주소에 두 언어인 페이지는 영어면 #en(홈 영어판과 같은 규칙)."""
    if lang == 'en' and re.match(r'https://[a-z0-9-]+\.lumenlab\.page/(?:[a-z]+/)?(?:privacy|support)/$', href): return href + '#en'
    return href

def page_path(id_, lang):
    return ('/en' if lang == 'en' else '') + f'/works/{id_}/'

def check_anchor(href):
    """다른 사이트(게임·앱) 카드 주소가 이 저장소의 실제 파일·칸을 가리키는지."""
    u = urlparse(href); d = {'chick-rescue.lumenlab.page': 'chick-rescue', 'castle-up.lumenlab.page': 'castle-up',
                             'owlight.lumenlab.page': 'owlight', 'setnote.lumenlab.page': 'setnote'}[u.netloc]
    f = os.path.join(mono, d, u.path.strip('/'), 'index.html')
    assert os.path.isfile(f), f'카드 페이지가 없음 {href}'
    if u.fragment: assert f'id="{u.fragment}"' in open(f).read(), f'카드 칸이 없음 {href}'

def media_ok(src):
    """미리 보기 사진·영상이 이 저장소에 실제로 있는지(옆 사이트 폴더 또는 이 사이트)."""
    u = urlparse(src)
    if not u.netloc: f = os.path.join(os.path.dirname(here), u.path.lstrip('/'))
    else: f = os.path.join(mono, u.netloc.split('.')[0], u.path.lstrip('/'))
    assert os.path.isfile(f), f'미리 보기 파일이 없음 {src} ({f})'

# ---------- 소개 본문(창과 페이지가 같이 쓰는 .sh__body) ----------
# 작업대(.sh__spot): 선반에서 집어 든 물건(아이콘)이 스탠드 불빛 아래 작업대에 놓인다. 스탠드 모양은 첫 화면 방 안 스탠드와 같은 꼴(받침·팔 둘·갓).
# 그림 좌표는 .sh__rig(420×230, 아래 끝 = 작업대 윗면) 기준. 불빛 줄기·바닥 빛·벽 빛은 store.css 가 그 자리에 둔다
LAMP = ('<svg class="sh__lamp" viewBox="0 0 200 230" aria-hidden="true" focusable="false">'
        '<circle class="sb-halo" cx="128" cy="94" r="46" fill="url(#sb-dot)"/>'
        '<defs><radialGradient id="sb-dot"><stop offset="0" class="sb-l" stop-opacity=".7"/><stop offset=".45" class="sb-l" stop-opacity=".2"/><stop offset="1" class="sb-l" stop-opacity="0"/></radialGradient></defs>'
        '<rect class="sb-wood" x="14" y="221" width="48" height="10" rx="4"/><path class="sb-arm" d="M38 222L22 120L108 66"/>'
        '<circle class="sb-wood" cx="22" cy="120" r="6"/><circle class="sb-wood" cx="38" cy="219" r="6"/>'
        '<path class="sb-wood" d="M101.8 71L114.2 61L145.9 77.5L110.1 106.5z"/><circle class="sb-wood" cx="108" cy="66" r="9"/>'
        '<ellipse class="sb-bulb" cx="126" cy="90" rx="9" ry="6" transform="rotate(-39 126 90)"/></svg>')

# 작업대 뒤 벽의 창: 첫 화면과 같은 밤 도시(달, 건물, 불 켜진 창 몇 개). 그림만이라 읽기 프로그램에선 숨긴다
WIN = ('<svg class="sh__win" viewBox="0 0 160 130" aria-hidden="true" focusable="false">'
       '<rect class="sw-sky" width="160" height="130"/><circle class="sw-moon" cx="118" cy="32" r="11"/><circle class="sw-sky" cx="123" cy="28" r="9.5"/>'
       '<path class="sw-city" d="M0 130V74h22V60h18v26h14V50h20v36h12V68h22v24h14V80h20v18h18v32z"/>'
       '<path class="sw-lit" d="M27 66h4v5h-4zM45 92h4v5h-4zM60 56h4v5h-4zM66 66h4v5h-4zM60 86h4v5h-4zM93 74h4v5h-4zM101 98h4v5h-4zM127 88h4v5h-4zM143 104h4v5h-4zM10 82h4v5h-4z"/>'
       '<path class="sw-frame" d="M3 3h154v124H3zM80 3v124M3 66h154"/></svg>')

def body(kind, it, lang, gdata, cat):
    T = KO if lang == 'ko' else EN
    s = sc_of(kind, it); L = lambda v: v[lang] if isinstance(v, dict) and lang in v else v
    name = it['name'][lang]; what = short_what(kind, it, lang) if kind != 'tools' else it['what'][lang]
    sub = f' <span lang="en">{esc(it["sub"])}</span>' if lang == 'ko' and it.get('sub') else ''
    if kind == 'tools': op_href, op_t = home_url(kind, it, lang), T['open']
    elif s.get('open'): op_href, op_t = L(s['open']['href']), L(s['open']['t'])
    else: op_href, op_t = home_url(kind, it, lang), it['links'][0][lang]
    # 꼬리표(물건에 달린 작은 표): 게임·앱은 지금 상태, 도구는 선반 칸의 ✓ 줄과 같은 '확인한 것'
    if it.get('status'): status = f'\n      <p class="sh__status">{esc(plain(it["status"][lang]))}</p>'
    elif kind == 'tools': status = f'\n      <p class="sh__status is-proof">{esc(s["proof"][lang])}</p>'
    else: status = ''
    full_what = it['what'][lang] if kind == 'tools' else plain(it['kind'][lang])
    out = [f'''<header class="sh__head">
    <div class="sh__spot">{WIN}<div class="sh__rig"><i class="sh__glow" aria-hidden="true"></i>{LAMP}<i class="sh__cone" aria-hidden="true"></i><i class="sh__pool" aria-hidden="true"></i>
      <img class="sh__icon" src="{it['icon']}" width="112" height="112" alt=""></div></div>
    <div class="sh__id">
      <h1 class="sh__name" id="sh-name" tabindex="-1">{esc(name)}{sub}</h1>
      <p class="sh__what">{esc(full_what)}</p>{status}
      <a class="btn btn--lamp sh__open" href="{esc(op_href)}">{esc(op_t)} <span aria-hidden="true">↗</span></a>
    </div>
  </header>
  <p class="sh__lead">{esc(plain(it['line'][lang]))}</p>''']
    facts = ''.join(f'<li><b>{esc(L(f["v"]))}</b><span>{esc(L(f["l"])).replace("·", "&#8288;·&#8288;")}</span></li>' for f in s['facts'])
    assert len(s['facts']) == 3, f"{it['id']}: 사실 줄은 3칸"
    out.append(f'<ul class="sh__facts">{facts}</ul>')
    if kind == 'tools':
        d = s['demo']
        core = [BI.core_url(it, f) for f in d['core']]; mod = [BI.core_url(it, f) for f in d.get('mod', [])]
        assert os.path.isfile(os.path.join(os.path.dirname(here), 'assets', 'try', it['id'] + '.js')), f"{it['id']}: assets/try/{it['id']}.js 없음"
        out.append(f'''<section class="sh__sec sh__try" aria-labelledby="sh-try">
    <div class="sh__try-h"><h2 id="sh-try">{T['try']}</h2></div>
    <div class="mon">
      <div class="stage is-loading" data-tool="{it['id']}" data-core="{esc(json.dumps(core))}" data-mod="{esc(json.dumps(mod))}"><p class="stage__msg">{T['ui']['loading']}</p></div>
      <div class="mon__chin"><p class="stage__badge" aria-live="polite"></p><button type="button" class="stage__replay" hidden>{T['ui']['replay']}</button></div>
    </div>
    <i class="mon__stand" aria-hidden="true"></i>
    <p class="sh__cap">{esc(L(d['cap']))}</p>
  </section>''')
    else:
        sh = s['shots']; w, hh = sh['w'], sh['h']; cells = []
        for m in sh['items']:
            if m.get('video'):
                v = L(m['video']); media_ok(v + '.mp4'); media_ok(v + '.webm'); media_ok(L(m['poster']))
                cells.append(f'<li><video class="shots__v" muted loop playsinline controls preload="none" poster="{esc(L(m["poster"]))}" width="{w}" height="{hh}" aria-label="{esc(L(m["alt"]))}">'
                             f'<source src="{esc(v)}.mp4" type="video/mp4"><source src="{esc(v)}.webm" type="video/webm"></video></li>')
            else:
                media_ok(L(m['src']))
                cells.append(f'<li><img src="{esc(L(m["src"]))}" width="{w}" height="{hh}" alt="{esc(L(m["alt"]))}" loading="lazy" decoding="async"></li>')
        shape = 'is-wide' if w > hh else 'is-tall'
        out.append(f'''<section class="sh__sec sh__shots" aria-labelledby="sh-shots">
    <h2 id="sh-shots">{T['shots']}</h2>
    <ul class="shots {shape}" style="--ar:{w}/{hh}">{''.join(cells)}</ul>
    <p class="sh__cap">{esc(L(sh['cap']))}</p>
  </section>''')
    more = []
    for m in s['more']:
        href = L(m['href'])
        if not href: continue   # 한국어판에만 있는 페이지
        if kind == 'tools': BI.sub_page_ok(it, href)
        else: check_anchor(href)
        more.append(f'<li><a href="{esc(href)}"><span class="sh__gly">{glyph(m["g"])}</span><b>{esc(L(m["t"]))}</b><span>{esc(L(m["d"]))}</span></a></li>')
    if more:
        out.append(f'''<section class="sh__sec sh__more" aria-labelledby="sh-more">
    <h2 id="sh-more">{T['more'] if kind == 'tools' else T['more_w']}</h2>
    <ul class="sh__cards">{''.join(more)}</ul>
  </section>''')
    if kind == 'tools':
        tp = BI.tool_pages(it, lang)
        out.append(f'''<section class="sh__sec sh__log" aria-labelledby="sh-check">
    <h2 id="sh-check">{T['check']}</h2>
    <div class="sh__note"><svg class="sh__tick" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12.5l5 5L20 6"/></svg><p class="sh__check">{esc(it['check'][lang])}</p></div>
    <p class="sh__links"><a href="{esc(tp['about'])}">{esc(T['about'](name))} <span aria-hidden="true">→</span></a></p>
  </section>''')
        index, items = gdata
        rows = ''.join(f'<li><a href="{esc(a["url"])}">{esc(a["title"])}</a></li>' for a in items)
        out.append(f'''<section class="sh__sec sh__books" aria-labelledby="sh-gd">
    <h2 id="sh-gd">{T['guides'](len(items))}</h2>
    <ol class="sh__guides">{rows}</ol>
    <p class="sh__links"><a href="{esc(index['url'])}">{T['guide_all']} <span aria-hidden="true">→</span></a></p>
  </section>''')
    else:
        links = []
        if s.get('open'): links.append((it['url'], it['links'][0][lang]))
        links += [(l['href'], l[lang]) for l in it['links'][1:] if l['href'] != op_href]
        if it.get('privacy'): links.append((it['privacy'][lang], T['privacy']))
        chips = ''.join(f'<a href="{esc(en_link(hr, lang))}">{esc(t)} <span aria-hidden="true">→</span></a>' for hr, t in links)
        out.append(f'''<section class="sh__sec sh__log" aria-labelledby="sh-check">
    <h2 id="sh-check">{T['note']}</h2>
    <div class="sh__note"><svg class="sh__tick" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12.5l5 5L20 6"/></svg><p class="sh__check">{esc(L(s['note']))}</p></div>{f'{chr(10)}    <p class="sh__links">{chips}</p>' if chips else ''}
  </section>''')
    # 다른 것: 같은 칸(같은 묶음)이 먼저, 그다음 나머지 순서대로. 창 안에서 누르면 창 내용만 바뀐다(store.js)
    all_ = order(cat)
    same = lambda k, x: k == kind and (kind != 'tools' or x['group'] == it['group'])
    rest = [(k, x) for k, x in all_ if x['id'] != it['id'] and same(k, x)] + [(k, x) for k, x in all_ if x['id'] != it['id'] and not same(k, x)]
    oth = ''.join(f'<li><a href="{page_path(x["id"], lang)}" data-show="{x["id"]}"><img src="{x["icon"]}" width="56" height="56" alt="" loading="lazy"><span>{esc(x["name"][lang])}</span></a></li>' for k, x in rest)
    out.append(f'''<section class="sh__sec sh__oth" aria-labelledby="sh-oth">
    <h2 id="sh-oth">{T['others']}</h2>
    <ul class="sh__others">{oth}</ul>
  </section>''')
    return '\n  '.join(out), op_href, op_t

def article(kind, it, lang, gdata, cat):
    T = KO if lang == 'ko' else EN
    s = sc_of(kind, it)
    inner, op_href, op_t = body(kind, it, lang, gdata, cat)
    ui = dict(T['ui'], home=op_href, icon=it['icon'], open=op_t)
    return (f'<article class="sh-doc" id="sheet" data-id="{it["id"]}" data-ui="{esc(json.dumps(ui, ensure_ascii=False))}" style="--tc:{s["color"]};--tcp:{text_mix(s["color"])}%">\n'
            f'<div class="sh__body">\n  {inner}\n</div>\n</article>')

# ---------- 홈 아이콘 칸 ----------
def wall(cat, EN_OUT):
    """홈 gen:wall 칸(한국어, 영어는 EN_OUT 사전에 넣어 build_home.py 의 to_en 이 바꾼다)."""
    def cell(kind, it):
        s = sc_of(kind, it); k = it['id']
        EN_OUT[f'fi_{k}_n'] = it['name']['en']; EN_OUT[f'wl_{k}_w'] = short_what(kind, it, 'en')
        extra = ''
        if kind == 'tools':
            EN_OUT[f'wl_{k}_p'] = s['proof']['en']
            extra = f'<span class="wi__p" data-i18n="wl_{k}_p">{esc(s["proof"]["ko"])}</span>'
        elif it.get('status'):
            EN_OUT[f'wl_{k}_s'] = plain(it['status']['en'])
            extra = f'<span class="wi__s" data-i18n="wl_{k}_s">{esc(plain(it["status"]["ko"]))}</span>'
        return (f'<li><a class="wi" href="/works/{k}/" data-show="{k}" aria-haspopup="dialog" style="--tc:{s["color"]};--tcp:{text_mix(s["color"])}%">'
                f'<img class="wi__icon" src="{it["icon"]}" width="84" height="84" alt="" loading="lazy">'
                f'<span class="wi__n" data-i18n="fi_{k}_n">{esc(it["name"]["ko"])}</span>'
                f'<span class="wi__w" data-i18n="wl_{k}_w">{esc(short_what(kind, it, "ko"))}</span>{extra}</a></li>')
    def shelf(id_, head_ko, head_en, line_ko, line_en, cells, kick=None):
        key = id_.replace('-', '_')   # i18n.js 사전 키는 따옴표 없이 쓰므로 밑줄만
        EN_OUT[f'wl_{key}_h'] = head_en; EN_OUT[f'wl_{key}_l'] = line_en
        k = ''
        if kick: k = f'<p class="shelf__kick" data-i18n="wl_kick">{kick}</p>'
        return (f'      <div class="shelf" id="{id_}">\n        <div class="shelf__label">{k}<h3 class="shelf__h" data-i18n="wl_{key}_h">{head_ko}</h3>'
                f'<p class="shelf__line" data-i18n="wl_{key}_l">{line_ko}</p></div>\n        <ul class="wall">{"".join(cells)}</ul>\n      </div>')
    games, apps = cat.get('games', []), cat['apps']
    # 게임과 앱은 따로 한 선반씩(2026-10-18 사용자 요청). 웹 도구 선반과 같은 모양이라 칸이 둘뿐이어도 줄이 맞는다
    out = [shelf('games', '게임', 'Games', KO['games_line'], EN['games_line'], [cell('games', it) for it in games])] if games else []
    out.append(shelf('apps', '앱', 'Apps', KO['apps_line'], EN['apps_line'], [cell('apps', it) for it in apps]))
    EN_OUT['wl_kick'] = 'Web tools'
    tg = [shelf(f'g-{g["id"]}', esc(g['name']['ko']), g['name']['en'], esc(g['line']['ko']), g['line']['en'],
                [cell('tools', it) for it in cat['tools'] if it['group'] == g['id']], kick='웹 도구' if i == 0 else None) for i, g in enumerate(cat['groups'])]
    out.append('      <div id="tools">\n' + '\n'.join(tg) + '\n      </div>')
    n = len(games) + len(apps) + len(cat['tools'])
    EN_OUT['wlTitle'] = EN['wall_title'](n); EN_OUT['wlLead'] = EN['wall_lead']
    return '\n'.join(out), KO['wall_title'](n), KO['wall_lead']

# ---------- 소개 페이지 ----------
def build(site, cat, ko_src, en_src):
    """/works/<id>/ 와 /en/works/<id>/ 를 쓰고 주소 목록을 돌려준다. 머리말·바닥글은 방금 만든 홈 두 페이지에서."""
    tools = cat['tools']
    gd = {l: {it['id']: BI.read_guides(site, it, l) for it in tools} for l in ('ko', 'en')}
    for k in ('games', 'apps', 'tools'):
        extra = set(SC.get(k, {})) - {it['id'] for it in cat.get(k, [])}
        assert not extra, f'showcase.json {k} 에만 있는 항목 {extra}'
    keep = set(); paths = []
    for kind, it in order(cat):
        for lang, src in (('ko', ko_src), ('en', en_src)):
            T = KO if lang == 'ko' else EN
            path = page_path(it['id'], lang); paths.append(path); keep.add(path)
            name = it['name'][lang]; what = it['what'][lang] if kind == 'tools' else short_what(kind, it, lang)
            if kind == 'tools': up_href, up_t = f'/#g-{it["group"]}', next(g['name'][lang] for g in cat['groups'] if g['id'] == it['group'])
            else: up_href, up_t = f'/#{kind}', {'games': ('게임', 'Games'), 'apps': ('앱', 'Apps')}[kind][lang == 'en']
            pre = '/en' if lang == 'en' else ''
            crumb = (f'<nav class="pp__crumb" aria-label="{T["crumb_label"]}"><a href="{pre}/#works">{T["crumb"]}</a><span aria-hidden="true">›</span>'
                     f'<a href="{pre}{up_href}">{esc(up_t)}</a></nav>')
            main = f'<div class="wrap pp">\n{crumb}\n{article(kind, it, lang, gd[lang].get(it["id"]), cat)}\n</div>'
            desc = plain(it['line'][lang])
            html = BI.page(lang, path, T['title'](name, what), desc, main, src, 'website', None,
                           '<script src="/assets/store.js" defer></script>\n', css=['/assets/site.css', '/assets/store.css'])
            # 머리말의 '만든 것'에 지금 있는 곳 표시(이 페이지 자체는 아니므로 page 가 아니라 true)
            nav = f'<a class="nav-works" href="{pre}/#works"'
            assert nav in html, f'{path}: 머리말 만든 것 링크가 없음'
            html = html.replace(nav, nav + ' aria-current="true"', 1)
            d = os.path.join(site, path.strip('/')); os.makedirs(d, exist_ok=True)
            open(os.path.join(d, 'index.html'), 'w').write(html)
    # 카탈로그에서 빠진 항목의 옛 소개 페이지는 지운다(주소 넘기기는 _redirects 에서 따로)
    for pre in ('', 'en'):
        wd = os.path.join(site, pre, 'works')
        for name in os.listdir(wd) if os.path.isdir(wd) else []:
            p = ('/en' if pre else '') + f'/works/{name}/'
            if os.path.isdir(os.path.join(wd, name)) and p not in keep:
                import shutil; shutil.rmtree(os.path.join(wd, name))
    print(f'소개 페이지: {len(paths)}개 (/works/<id>/ 와 영어판)')
    return paths
