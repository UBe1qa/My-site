#!/usr/bin/env python3
"""Opening Trail 모든 HTML·sitemap.xml·404.html·찾기 목록·오프닝 JSON을 만든다: python3 -B chess/_dev/build.py  (--check 는 낡았는지만 본다)
화면 글 = _dev/content.py, 오프닝 해설 = _dev/openings.py, 메인라인 수마다 이유 = _dev/reasons.py, 판·수 자료 = data/t/*.json(_dev/data/make_site.py).
빌드가 하는 일:
  1) 모든 수순(해설 주요 수순·갈래·함정·메인라인·이름표 3,865줄)을 node + assets/chess.min.js(_dev/lines.mjs)로 둬 본다. 틀리면 멈춘다.
  2) 판마다 수를 메인·대안·사이드·의심스러운 수·나쁜 수로 나눠 조각에 적는다(_dev/trail.py, 메인라인은 메인으로 고정).
  3) 조각에 해설 slug(이름 칸 4번째)와 수마다 이유(x)를 적는다. 바뀐 조각만 다시 쓴다.
  4) 페이지를 만든다. 만든 파일은 손으로 고치지 않는다."""
import json
import math
import re
import subprocess
import sys
from html import escape as esc
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
sys.path.insert(0, str(DEV))
from content import UI, PAGES, TX, TEST, about, privacy, data_doc  # noqa: E402
from openings import OPENINGS, GROUPS  # noqa: E402
import reasons as RS  # noqa: E402
import articles as ART  # noqa: E402
import trail  # noqa: E402

SITE = 'https://chess.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
FIRST = '2026-11-04'
UPDATED = {}                 # 본문이 바뀐 페이지: {'/ko/openings/italian-game/': '2026-11-20'}
START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
START_EPD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -'
DEFAULT_BAND = 2             # app.js 와 같다(1600–1999)
BANDS = ['<1200', '1200–1599', '1600–1999', '2000+']
OTB_BANDS = ['<2200', '2200–2399', '2400–2599', '2600+']
META = json.loads((ROOT / 'data' / 'meta.json').read_text(encoding='utf-8'))
DATA = trail.Data(ROOT / 'data')
E, N = DATA.E, DATA.N
BY_SLUG = {o['slug']: o for o in OPENINGS}
GROUP_NAME = dict(GROUPS)
FIRST_MOVES = [('e4', 'e4'), ('d4', 'd4'), ('c4', 'c4'), ('nf3', 'Nf3')]      # (주소, 수)
LANGS = ('en', 'ko')

BOOT = ("<script>(function(h){try{var n=(navigator.language||'').slice(0,2).toLowerCase();"
        "if(!localStorage.getItem('fm.lang')&&(h.lang==='ko'?n!=='ko':n==='ko'))h.classList.add('lb')}catch(e){}})(document.documentElement)</script>")

# 로고: 판 두 칸 위로 굽이진 길(trail) 하나와 끝 점
LOGO = ('<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="7" fill="var(--sq-d)"/>'
        '<path d="M0 7a7 7 0 0 1 7-7h7v14H0zM14 14h14v7a7 7 0 0 1-7 7h-7z" fill="var(--sq-l)"/>'
        '<path d="M5 23c4-1 5-5 9-6s6-4 4-8 2-5 5-5" fill="none" stroke="var(--acc)" stroke-width="3.4" stroke-linecap="round"/>'
        '<circle cx="23" cy="4.6" r="2.6" fill="var(--hot)"/></svg>')
IC = {
    'first': '<path d="M6 5v14M18 6l-7 6 7 6" />',
    'prev': '<path d="M15 6l-6 6 6 6" />',
    'next': '<path d="M9 6l6 6-6 6" />',
    'last': '<path d="M18 5v14M6 6l7 6-7 6" />',
    'flip': '<path d="M8 4v15M4.5 15.5L8 19l3.5-3.5M16 20V5M12.5 8.5L16 5l3.5 3.5" />',
    'sound': '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" /><path class="snd-on" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /><path class="snd-off" d="M16 9.5l5 5M21 9.5l-5 5" />',
    'search': '<circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />',
}


def icon(k):
    return f'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">{IC[k]}</svg>'


def sound_btn(lang):
    u = UI[lang]
    return f'<button type="button" data-sound aria-pressed="true" aria-label="{u["sound"]}" title="{u["sound"]}">{icon("sound")}</button>'


# ---------------------------------------------------------------- 숫자(core.js와 같은 모양)
def tofixed(x, d):
    m = 10 ** d
    v = math.floor(x * m + 0.5 + 1e-9) / m
    return f'{v:.{d}f}'


def pct(x, d=0):
    v = x * 100
    if 0 < v < 0.1:
        return '<0.1%'
    if 0 < v < 1:
        return tofixed(v, 1) + '%'
    return tofixed(v, d) + '%'


def count(n, lang):
    if lang == 'ko':
        if n >= 100000000:
            return re.sub(r'\.0$', '', tofixed(n / 100000000, 1)) + '억'
        if n >= 10000:
            return re.sub(r'\.0$', '', tofixed(n / 10000, 0 if n >= 100000 else 1)) + '만'
        return f'{n:,}'
    if n >= 1e6:
        return re.sub(r'\.0$', '', tofixed(n / 1e6, 1)) + 'M'
    if n >= 1e4:
        return f'{math.floor(n / 1e3 + 0.5)}k'
    return f'{n:,}'


def ev_text(v):
    if v is None:
        return ''
    if isinstance(v, str):
        return '#' + v[1:]
    p = v / 100
    sign = '+' if p > 0 else ('−' if p < 0 else '')
    return sign + tofixed(abs(p), 0 if abs(p) >= 10 else 1)


def fmt(s, **k):
    return re.sub(r'\{(\w+)\}', lambda m: str(k.get(m.group(1), '')), s)


def games_text(lang):
    g = META['games']
    return f'{g / 1e8:.4f}'.rstrip('0') if False else (f'{math.floor(g / 10000 + 0.5):,}만' if lang == 'ko' else f'{g / 1e6:.1f} million')


# ---------------------------------------------------------------- 자료
def zero():
    return {'w': 0, 'd': 0, 'b': 0, 'n': 0}


def reached(epd, band=-1):
    e = E.get(epd)
    return trail.sumband(e[0], 0, band) if e else zero()


def stats(epd, band=-1, all_=False):
    return DATA.stats(epd, band, all_)


START_N = [reached(START_EPD, b)['n'] for b in range(4)] + [reached(START_EPD)['n']]


def share_at(epd, band=-1):
    n = reached(epd, band)['n']
    return n / START_N[band if band >= 0 else 4] if n else 0


def score(r, side):
    """그 쪽 점수: (이김 + 비김 절반) ÷ 판"""
    if not r['n']:
        return 0
    return ((r['w'] if side == 'w' else r['b']) + r['d'] / 2) / r['n']


# ---------------------------------------------------------------- 수순 둬 보기(node)
def play(lines):
    r = subprocess.run(['node', str(DEV / 'lines.mjs')], input=json.dumps(lines), capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def numbered(sans, start=0):
    out = []
    for i, s in enumerate(sans):
        p = start + i
        if p % 2 == 0:
            out.append(f'{p // 2 + 1}.{s}')
        elif i == 0:
            out.append(f'{p // 2 + 1}...{s}')
        else:
            out.append(s)
    return ' '.join(out)


def hash_of(sans):
    return '.'.join(re.sub(r'[+#]', '', s) for s in sans)


def name_of(epds, lang):
    for i in range(len(epds) - 1, -1, -1):
        n = N.get(epds[i])
        if n:
            return {'eco': n[0], 'name': n[2] if lang == 'ko' else n[1], 'en': n[1], 'slug': n[3] if len(n) > 3 else '', 'ply': i}
    return None


def covers_slug(name):
    best, blen = '', -1
    for o in OPENINGS:
        for c in o['covers']:
            if (name == c or name.startswith(c + ':') or name.startswith(c + ',')) and len(c) > blen:
                best, blen = o['slug'], len(c)
    return best


LINES = {}       # 수순 문자열 → lines.mjs 결과


def check_lines():
    """모든 수순을 둬 보고 결과를 붙인다. 틀리면 멈춘다."""
    jobs = []
    for o in OPENINGS:
        jobs.append(('main', o, None, o['line']))
        for v in o['vars']:
            jobs.append(('var', o, v, v['line']))
        for t in o['traps']:
            jobs.append(('trap', o, t, t['line']))
    for slug, line in RS.MAIN.items():
        jobs.append(('ext', BY_SLUG[slug], None, line))
    fm = [m for _, m in FIRST_MOVES]
    res = play([j[3] for j in jobs] + fm)
    bad = []
    for (kind, o, x, line), r in zip(jobs, res):
        LINES[line] = r
        if not r['ok']:
            bad.append(f'{o["slug"]} {kind}: {line} → {r["err"]}')
            continue
        if kind == 'main':
            o['_r'] = r
        elif kind == 'ext':
            o['_m'] = r
        else:
            x['_r'] = r
            if kind == 'trap' and x['end'] == 'mate' and not r['mate']:
                bad.append(f'{o["slug"]} 함정이 메이트가 아님: {line}')
    for o in OPENINGS:
        m = o.get('_m')
        if m and m['san'][:len(o['_r']['san'])] != o['_r']['san']:
            bad.append(f'{o["slug"]} 메인라인이 주요 수순으로 시작하지 않음')
        if not m:
            o['_m'] = o['_r']
    if bad:
        sys.exit('수순 오류:\n  ' + '\n  '.join(bad))
    return {m: r['epd'][0] for (_, m), r in zip(FIRST_MOVES, res[len(jobs):])}


def name_lines():
    """이름표 3,865줄을 둬 보고 [영어, 한국어, ECO, SAN 수순, 끝 EPD]를 돌려준다(찾기 목록용)."""
    import csv
    import io
    rows = []
    for f in sorted((DEV / 'openings').glob('?.tsv')):
        for r in csv.DictReader(io.open(f, encoding='utf-8'), delimiter='\t'):
            rows.append((r['eco'], r['name'], re.sub(r'\d+\.\s*', '', r['pgn']).strip()))
    res = play([x[2] for x in rows])
    out = []
    for (eco, name, line), r in zip(rows, res):
        if not r['ok']:
            sys.exit(f'이름표 수순 오류: {name} {line} {r["err"]}')
        out.append({'eco': eco, 'en': name, 'san': r['san'], 'epd': r['epd'][-1]})
    return out


# ---------------------------------------------------------------- 분류·이름·이유를 조각에
def book_moves():
    """메인라인에서 해설 주요 수순 끝 뒤의 수 = 메인으로 고정할 수 {판: {수}}"""
    book, who = {}, {}
    bad = []
    for o in OPENINGS:
        m, k = o['_m'], len(o['_r']['san'])
        epds = [START_EPD] + m['epd']
        for i in range(k, len(m['san'])):
            e, san = epds[i], m['san'][i]
            if e in who and who[e][1] != san:
                bad.append(f'{who[e][0]} {who[e][1]} ↔ {o["slug"]} {san} ({" ".join(m["san"][:i])})')
                continue
            who[e] = (o['slug'], san)
            book.setdefault(e, set()).add(san)
    if bad:
        sys.exit('같은 판에서 메인라인이 다른 수를 고름:\n  ' + '\n  '.join(bad))
    return book


def theory_moves():
    """해설의 정의 수순과 갈래 수순에 있는 수 {판: {수}}. 함정 수순과 길잡이(hub) 해설은 넣지 않는다
    (길잡이 '드문 첫 수'의 1.a3 같은 갈래까지 대안이 되지 않게)."""
    th = {}
    for o in OPENINGS:
        if o['hub']:
            continue
        for r in [o['_r']] + [v['_r'] for v in o['vars']]:
            epds = [START_EPD] + r['epd']
            for i, san in enumerate(r['san']):
                th.setdefault(epds[i], set()).add(san)
    return th


def classify_all(book):
    th = theory_moves()
    for epd in E:
        DATA.classify(epd, book.get(epd, ()), th.get(epd, ()))


MARK_RE = re.compile(r'(\d+)\.(\.\.)?((?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?)(\?\?|\?!|!\?|\?|!!|!)?')


def check_marks():
    """해설 글의 수 기호(?·??·?!·!)가 지도 분류와 맞는지 본다(평가 2026-11-05 M3). 글의 수는 같은 수순(함정·갈래·메인라인)에서 찾고,
    자료가 없는 판은 건너뛴다. ? = 의심 이상, ?? = 나쁨, ?! = 사이드 이상, ! = 메인·대안."""
    def flat(v):
        if isinstance(v, str):
            return [v]
        if isinstance(v, dict):
            return [z for w in v.values() for z in flat(w)]
        if isinstance(v, (list, tuple)):
            return [z for w in v for z in flat(w)]
        return []
    bad = []
    for o in OPENINGS:
        items = [(t['_r'], flat(t['en']) + flat(t['ko'])) for t in o['traps']] + [(v['_r'], flat(v['en']) + flat(v['ko'])) for v in o['vars']]
        items.append((o['_m'], flat(o['en']) + flat(o['ko'])))
        for r, texts in items:
            for t in texts:
                for m in MARK_RE.finditer(t):
                    num, black, san, mark = int(m.group(1)), bool(m.group(2)), m.group(3), m.group(4)
                    k = (num - 1) * 2 + (1 if black else 0)
                    if not mark or mark == '!?' or k >= len(r['san']) or r['san'][k].rstrip('+#') != san.rstrip('+#'):
                        continue
                    st = stats(START_EPD if k == 0 else r['epd'][k - 1], -1, True)
                    mv = next((q for q in st['moves'] if q['san'] == r['san'][k]), None) if st else None
                    if not mv or mv['cls'] is None or mv['cls'] < 0:
                        continue
                    c = mv['cls']
                    ok = {'?': c >= 3, '??': c == 4, '?!': c >= 2, '!': c <= 1, '!!': c <= 1}[mark]
                    if not ok:
                        bad.append(f"{o['slug']}: {m.group(0)} 인데 지도는 {trail.CLS_NAMES[c] if hasattr(trail, 'CLS_NAMES') else c}")
    if bad:
        sys.exit('해설 글의 수 기호가 지도 분류와 다름:\n  ' + '\n  '.join(sorted(set(bad))))


def write_slugs():
    for sh in DATA.shards.values():
        for epd, v in sh['n'].items():
            slug = covers_slug(v[1])
            want = v[:3] + ([slug] if slug else [])
            if want != v:
                sh['n'][epd] = want
                N[epd] = want


MISSING_WHY = []


def write_reasons():
    """메인라인 수마다 이유를 조각 x칸에: {판: {수: [영어, 한국어]}}"""
    xs = {}
    for o in OPENINGS:
        m = o['_m']
        epds = [START_EPD] + m['epd']
        for i, san in enumerate(m['san']):
            seq = ' '.join(m['san'][:i + 1])
            w = RS.WHY.get(seq)
            if not w:
                MISSING_WHY.append((o['slug'], seq))
                continue
            xs.setdefault(epds[i], {})[san] = [w[0], w[1]]
    for sh in DATA.shards.values():
        sh.pop('x', None)
    for epd, d in xs.items():
        DATA.shards[trail.sid(epd)].setdefault('x', {})[epd] = d
    DATA.X.clear()
    DATA.X.update(xs)


def why(epd, san, lang):
    x = DATA.X.get(epd, {}).get(san)
    return x[1 if lang == 'ko' else 0] if x else ''


def deep(seq, lang):
    d = RS.DEEP.get(seq)
    return d[1 if lang == 'ko' else 0] if d else ''


# ---------------------------------------------------------------- 머리·꼬리
def prefix(lang):
    return '/ko/' if lang == 'ko' else '/'


def url(lang, path=''):
    return SITE + prefix(lang) + path


def lastmod(full):
    return UPDATED.get(full, FIRST)


def suffix(lang):
    return ' | ' + UI[lang]['brand']


def titled(lang, t):
    return t + suffix(lang) if len(t + suffix(lang)) <= (65 if lang == 'en' else 60) else t


def head(lang, title, desc, path, jsonld=(), og_type='website', noindex=False, ads=True):
    assert len(title) <= (70 if lang == 'en' else 60), ('제목이 길다', title, len(title))
    assert len(desc) <= 160, ('설명이 길다', desc, len(desc))
    canon = url(lang, path)
    links = []
    if not noindex:
        links = [f'<link rel="canonical" href="{canon}">',
                 f'<link rel="alternate" hreflang="en" href="{url("en", path)}">',
                 f'<link rel="alternate" hreflang="ko" href="{url("ko", path)}">',
                 f'<link rel="alternate" hreflang="x-default" href="{url("en", path)}">']
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>\n' for j in jsonld)
    ad = (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADS_CLIENT}" crossorigin="anonymous"></script>\n'
          '<script src="/assets/ads-config.js"></script>\n') if ads else ''
    og = 'og-ko.png' if lang == 'ko' else 'og.png'
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{'<meta name="robots" content="noindex">' + chr(10) if noindex else ''}<meta name="theme-color" content="#f6f3ec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14161b" media="(prefers-color-scheme: dark)">
{chr(10).join(links)}
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:site_name" content="{UI[lang]['brand']}">
<meta property="og:image" content="{SITE}/{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="{'ko_KR' if lang == 'ko' else 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="/assets/pretendard.css">
<link rel="stylesheet" href="/assets/pieces.css">
<link rel="stylesheet" href="/assets/style.css">
{BOOT}
{ld}{ad}</head>'''


def header(lang, path, current=None):
    u = UI[lang]
    p = prefix(lang)
    other = 'en' if lang == 'ko' else 'ko'
    items = [('map', 'map/'), ('openings', 'openings/'), ('test', 'test/'), ('practice', 'practice/')]
    nav = ''.join(f'<a href="{p}{rel}"{" aria-current=" + chr(34) + "page" + chr(34) if k == current else ""}>{esc(u["nav"][k])}</a>' for k, rel in items)
    offer = ('이 페이지는 한국어로도 있어요.', '한국어로 보기') if lang == 'en' else ('This page is also in English.', 'Read in English')
    return f'''<div class="langbar" lang="{other}"><span>{offer[0]}</span><a href="{prefix(other)}{path}" hreflang="{other}">{offer[1]}</a><button type="button" aria-label="{UI[other]['close']}">✕</button></div>
<a class="skip" href="#main">{u['skip']}</a>
<header class="top"><div class="top-in wrap">
  <a class="brand" href="{p}">{LOGO}<span>{u['brand']}</span></a>
  <nav class="nav" aria-label="{u['nav_label']}">{nav}</nav>
  <span class="sp"></span>
  <div class="find" data-find><label class="find-l"><span class="vh">{u['search_lbl']}</span>{icon('search')}<input type="search" data-find-in placeholder="{esc(u['search_ph'])}" autocomplete="off" spellcheck="false" enterkeyhint="go"></label><ul class="find-r" data-find-out role="listbox" hidden></ul></div>
  <div class="aux"><a href="{prefix(other)}{path}" lang="{other}" hreflang="{other}">{u['lang_other']}</a></div>
</div></header>'''


def lumen_html(lang):
    """루멘랩 칸: 4×4 작은 판에서 나이트가 L자(위로 두 칸, 옆으로 한 칸)로 뛰어 '루멘랩' 칸에 앉는다."""
    u = UI[lang]
    home = 'https://lumenlab.page/' + ('en/' if lang == 'en' else '')
    return (f'<a class="lumen" href="{home}"><span class="lmini" aria-hidden="true"><span class="lsq"></span>'
            '<svg class="lpath" viewBox="0 0 96 96"><path pathLength="1" d="M60 60V12H84"/></svg><i class="pc wn"></i></span>'
            f'<span class="lumen-t"><b>{u["lumen_b"]}</b><small>{u["lumen_s"]}</small></span><span class="lumen-go" aria-hidden="true">→</span></a>')


def footer(lang):
    u = UI[lang]
    p = prefix(lang)
    links = [(u['nav']['map'], 'map/'), (u['nav']['openings'], 'openings/'), (u['nav']['best'], 'best-openings/'), (u['nav']['test'], 'test/'),
             (u['nav']['practice'], 'practice/'), (u['data'], 'data/'), (u['about'], 'about/'), (u['privacy'], 'privacy/')]
    lk = ''.join(f'<a href="{p}{rel}">{esc(t)}</a>' for t, rel in links)
    return f'''<footer class="foot"><div class="wrap">
  {lumen_html(lang)}
  <p class="foot-links">{lk}<a href="mailto:contact@lumenlab.page">{u['contact']}</a></p>
  <p class="foot-note">{u['data_note']}</p>
  <small>© 2026 Lumen Lab</small>
</div></footer>'''


def ad_slot(lang, name):
    return f'<div class="ad-wrap wrap" data-slot="{name}"><p class="ad-label">{UI[lang]["ad"]}</p><div class="ad-slot" data-ad="{name}" hidden></div></div>'


def cfg_script(cfg):
    return '<script type="application/json" id="fmc">' + json.dumps(cfg, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>'


COVERS = {c: o['slug'] for o in OPENINGS for c in o['covers']}
GUIDES = {lang: {o['slug']: {'u': prefix(lang) + 'openings/' + o['slug'] + '/', 'n': o[lang]['name']} for o in OPENINGS} for lang in LANGS}


def page(lang, head_html, body, path, current=None, cfg=None, scripts=True):
    u = UI[lang]
    base = {'lang': lang, 't': u['js'], 'practiceUrl': prefix(lang) + 'practice/', 'mapUrl': prefix(lang) + 'map/', 'testUrl': prefix(lang) + 'test/',
            'guides': GUIDES[lang], 'find': {'none': u['search_none'], 'page': u['search_page'], 'line': u['search_line'], 'moves': u['search_moves'], 'src': '/data/find.json'},
            'fm': {m: prefix(lang) + 'openings/' + k + '/' for k, m in FIRST_MOVES},
            'clsTip': u['cls_tip'], 'startN': START_N, 'covers': COVERS}
    base.update(cfg or {})
    js = ''.join(f'<script src="/assets/{s}.js"></script>\n' for s in ('chess.min', 'core', 'fx', 'board', 'app')) if scripts else '<script src="/assets/app.js"></script>\n'
    return f'''{head_html}
<body>
{header(lang, path, current)}
<main id="main">
{body}
</main>
{footer(lang)}
{cfg_script(base)}
{js}</body>
</html>
'''


# ---------------------------------------------------------------- 판(첫 HTML에 미리 그린다)
FILES = 'abcdefgh'


FIT_JS = ("(function(){var d=document.documentElement,w=d.clientWidth,h=innerHeight,b=document.currentScript.previousElementSibling,m,k;"
          "function set(){d.style.setProperty('--bd-max',Math.round(m)+'px')}"
          "if(w<900){m=Math.max(260,Math.min(w,h-230));set();return}"
          "m=Math.min(620,Math.max(360,h-190));set();"
          "for(k=0;k<2;k++){var c=b.closest('.bcol')||b.parentNode,t=b.getBoundingClientRect().top+pageYOffset,ct=c.getBoundingClientRect().top+pageYOffset,"
          "a=ct<Math.min(h*.4,260)?t:t-ct+16;m=Math.min(620,Math.max(360,h-a-66));set()}})();")
# 판 크기를 첫 그림 전에 정한다(app.js fitBoards와 같은 셈). 느린 망에서 판이 560→440으로 줄며 화면이 밀리던 것(평가 2026-11-05 L12)


def xy(sq, orient):
    f, r = FILES.index(sq[0]), int(sq[1])
    return (f, 8 - r) if orient == 'w' else (7 - f, r - 1)


def board_html(fen, orient='w', last=None, extra=''):
    pcs, hl = [], []
    rows = fen.split(' ')[0].split('/')
    for r, row in enumerate(rows):
        f = 0
        for ch in row:
            if ch.isdigit():
                f += int(ch)
                continue
            sq = FILES[f] + str(8 - r)
            x, y = xy(sq, orient)
            pcs.append(f'<i class="pc {"w" if ch.isupper() else "b"}{ch.lower()}" style="translate:{x * 100}% {y * 100}%"></i>')
            f += 1
    for sq in (last or []):
        x, y = xy(sq, orient)
        hl.append(f'<i class="lm" style="transform:translate({x * 100}%,{y * 100}%)"></i>')
    co = ''
    for i in range(8):
        file = FILES[i] if orient == 'w' else FILES[7 - i]
        rank = 8 - i if orient == 'w' else i + 1
        co += f'<span class="cf{" dk" if i % 2 else ""}" style="left:{i * 12.5}%">{file}</span>'
        co += f'<span class="cr{"" if i % 2 else " dk"}" style="top:{i * 12.5}%">{rank}</span>'
    return f'<div class="bd" data-board{extra}><div class="bd-hl">{"".join(hl)}</div><div class="bd-co" aria-hidden="true">{co}</div><div class="bd-pc">{"".join(pcs)}</div></div>'


def wdl_bar(w, d, b, lang, mini=False):
    n = w + d + b
    if not n:
        return ''
    a = fmt(UI[lang]['js']['wdl_aria'], w=pct(w / n), d=pct(d / n), b=pct(b / n))
    if mini:
        return (f'<span class="mini" role="img" aria-label="{esc(a)}"><i class="w" style="width:{tofixed(w / n * 100, 1)}%"></i>'
                f'<i class="d" style="width:{tofixed(d / n * 100, 1)}%"></i><i class="b" style="width:{tofixed(b / n * 100, 1)}%"></i></span>')
    segs = ''.join(f'<i class="{k}" style="width:{tofixed(v / n * 100, 1)}%">{esc(pct(v / n)) if v / n >= 0.12 else ""}</i>' for k, v in (('w', w), ('d', d), ('b', b)))
    return f'<span class="bar" role="img" aria-label="{esc(a)}">{segs}</span>'


def cls_badge(c, lang):
    if c is None or c < 0:
        return ''
    u = UI[lang]
    return f'<span class="cl c{c}" title="{esc(u["cls_tip"][c])}">{esc(u["cls"][c])}</span>'


def is_trap(m):
    return m['cls'] >= 3 and m['share'] >= 0.10 and m['n'] >= 50


def rows_html(epd, lang, band=DEFAULT_BAND, limit=12):
    """지도·해설 탐색기의 다음 수 표(app.js renderStats와 같은 모양)"""
    T = UI[lang]['js']
    s = stats(epd, band)
    if not s or not s['moves']:
        sa = stats(epd, -1, True)
        if sa and sa['moves'] and not sa['played']:
            s = sa
        else:
            return f'<tr class="empty"><td colspan="4">{esc(T["rows_none"])}</td></tr>'
    out = []
    for m in s['moves'][:limit]:
        trap = f'<span class="tp" title="{esc(T["trap_tip"])}">{esc(T["trap_flag"])}</span>' if is_trap(m) else ''
        if m['n']:
            w, d, b = m['w'] / m['n'], m['d'] / m['n'], m['b'] / m['n']
            aria = fmt(T['wdl_aria'], w=pct(w), d=pct(d), b=pct(b))
            bar = (f'<span class="bar" role="img" aria-label="{esc(aria)}">'
                   f'<i class="w" style="width:{tofixed(w * 100, 1)}%">{esc(pct(w)) if w >= 0.12 else ""}</i>'
                   f'<i class="d" style="width:{tofixed(d * 100, 1)}%">{esc(pct(d)) if d >= 0.12 else ""}</i>'
                   f'<i class="b" style="width:{tofixed(b * 100, 1)}%">{esc(pct(b)) if b >= 0.12 else ""}</i></span>')
            sh = f'<span class="shb" style="--s:{tofixed(m["share"], 3)}"></span>{esc(pct(m["share"]))}<small>{count(m["n"], lang)}</small>'
        else:
            bar = f'<small class="th">{esc(T["theory"])}</small>'
            sh = '—'
        out.append(f'<tr data-san="{esc(m["san"])}" class="c{m["cls"]}"><th scope="row"><button type="button" class="mv">{esc(m["san"])}</button>{cls_badge(m["cls"], lang)}{trap}</th>'
                   f'<td class="sh">{sh}</td><td class="wdl">{bar}</td><td class="ev">{esc(ev_text(m["ev"]))}</td></tr>')
        r = why(epd, m['san'], lang)
        if r:
            out.append(f'<tr class="why"><td colspan="4">{esc(r)}</td></tr>')
    return ''.join(out)


def ml_html(sans, lang):
    if not sans:
        return f'<li class="ml-empty">{esc(UI[lang]["js"]["ml_empty"])}</li>'
    h = ''
    for i, s in enumerate(sans):
        if i % 2 == 0:
            h += f'<li><span class="mn">{i // 2 + 1}.</span>'
        h += f'<button type="button" data-ply="{i + 1}"{" aria-current=" + chr(34) + "true" + chr(34) if i + 1 == len(sans) else ""}>{esc(s)}</button>'
        if i % 2 == 1 or i == len(sans) - 1:
            h += '</li>'
    return h


def band_chips(lang, current=DEFAULT_BAND):
    u = UI[lang]
    chips = [(-1, u['band_all'])] + list(enumerate(BANDS))
    return (f'<div class="bands" role="group" aria-label="{u["band_lbl"]}"><span class="lbl">{u["band_lbl"]}</span>' +
            ''.join(f'<button type="button" class="chip" data-band="{b}" aria-pressed="{"true" if b == current else "false"}">{esc(t)}</button>' for b, t in chips) + '</div>')


def crumb_parts(nm, sans, lang):
    """길잡이 줄: 1수 › 오프닝 › 갈래 › 세부. [(글, 주소|None)]"""
    out = []
    if sans:
        fm = sans[0]
        key = next((k for k, m in FIRST_MOVES if m == fm), 'other-first-moves')
        out.append((f'1.{fm}', prefix(lang) + 'openings/' + key + '/'))
    if nm:
        en = nm['en']
        fam, _, rest = en.partition(':')
        var, _, sub = rest.strip().partition(',')
        ko = nm['name'] if lang == 'ko' else None
        kfam, _, krest = (ko or '').partition(':')
        kvar, _, ksub = krest.strip().partition(',')
        pieces = [(fam, kfam), ((fam + ': ' + var.strip()) if var else '', kvar.strip()), ((en if sub else ''), ksub.strip())]
        last = None
        for full, kl in pieces:
            if not full:
                continue
            label = (kl if lang == 'ko' and kl else full.split(':')[-1].split(',')[-1].strip())
            slug = covers_slug(full)
            href = GUIDES[lang][slug]['u'] if slug and slug != last else None
            last = slug or last
            out.append((label, href))
    return out


def crumb_html(nm, sans, lang):
    parts = crumb_parts(nm, sans, lang)
    if not parts:
        return f'<span>{esc(UI[lang]["js"]["here_root"])}</span>'
    h = []
    for t, href in parts:
        h.append(f'<a href="{href}">{esc(t)}</a>' if href else f'<span>{esc(t)}</span>')
    return '<span class="sep" aria-hidden="true">›</span>'.join(h)


def pass_text(epd, lang, band=DEFAULT_BAND):
    T = UI[lang]['js']
    n = reached(epd, band)['n']
    if not n:
        return ''
    return esc(fmt(T['pass'], p=pct(n / START_N[band], 1), band=BANDS[band]))


def tree_kids(epd, band=-1, line=None):
    """지도 가지: 지금 판 → 다음 수 최대 5(3% 넘게, 적어도 2) → 그 뒤 최대 3(5% 넘게)"""
    s = stats(epd, band)
    if not s:
        return []
    kids = []
    for m in s['moves']:
        if len(kids) >= 5 or (m['share'] < 0.03 and len(kids) >= 2):
            break
        kids.append({'san': m['san'], 'share': m['share'], 'cls': m['cls'], 'kids': []})
    if not kids:
        return []
    res = play([(line + ' ' if line else '') + k['san'] for k in kids])
    for k, r in zip(kids, res):
        s2 = stats(r['epd'][-1], band)
        if not s2:
            continue
        for m in s2['moves']:
            if len(k['kids']) >= 3 or m['share'] < 0.05:
                break
            k['kids'].append({'san': m['san'], 'share': m['share'], 'cls': m['cls']})
    return kids


def tree_svg(kids, ply, root_label, lang):
    """가지 그림(app.js drawTree와 같은 모양). 뿌리 = 지금 판, 굵기 = 비율."""
    if not kids:
        return ''
    leaves = sum(max(1, len(k['kids'])) for k in kids)
    RH, W = 30, 460
    H = leaves * RH + 12
    x0, x1, x2 = 4, 150, 310
    y0 = H / 2
    paths, texts = [], []
    yi = 6
    for i, k in enumerate(kids):
        nleaf = max(1, len(k['kids']))
        yc = yi + nleaf * RH / 2
        sw = 2 + k['share'] * 20
        paths.append(f'<path class="br c{k["cls"]}" d="M{x0 + 76} {y0:.0f}C{x0 + 116} {y0:.0f} {x1 - 40} {yc:.0f} {x1 - 6} {yc:.0f}" stroke-width="{sw:.1f}"/>')
        texts.append(f'<g class="tn" data-t="{i}" data-s="{esc(k["san"])}"><text x="{x1}" y="{yc + 5:.0f}">{esc(numbered([k["san"]], ply))}</text><text class="tp" x="{x1 + 104}" y="{yc + 5:.0f}" text-anchor="end">{pct(k["share"])}</text></g>')
        for j, g in enumerate(k['kids']):
            yg = yi + j * RH + RH / 2
            sw2 = 1.5 + g['share'] * 16
            paths.append(f'<path class="br c{g["cls"]}" d="M{x1 + 110} {yc:.0f}C{x1 + 136} {yc:.0f} {x2 - 32} {yg:.0f} {x2 - 6} {yg:.0f}" stroke-width="{sw2:.1f}" opacity=".85"/>')
            texts.append(f'<g class="tn" data-t="{i}.{j}" data-s="{esc(k["san"])} {esc(g["san"])}"><text x="{x2}" y="{yg + 5:.0f}">{esc(numbered([g["san"]], ply + 1))}</text><text class="tp" x="{W - 4}" y="{yg + 5:.0f}" text-anchor="end">{pct(g["share"])}</text></g>')
        yi += nleaf * RH
    texts.append(f'<rect class="rt" x="{x0}" y="{y0 - 15:.0f}" width="72" height="30" rx="8"/><text class="rtt" x="{x0 + 36}" y="{y0 + 5:.0f}" text-anchor="middle">{esc(root_label)}</text>')
    alt = ', '.join(f'{numbered([k["san"]], ply)} {pct(k["share"])}' for k in kids)
    return f'<svg viewBox="0 0 {W} {H:.0f}" role="img" aria-label="{esc(alt)}">{"".join(paths)}{"".join(texts)}</svg>'


def explorer(lang, r=None, orient='w', sync=False, head_html='', slug='', tree=True):
    """r = lines.mjs 결과(없으면 처음 국면). 지도(/map/)와 해설 위 탐색기가 같이 쓴다."""
    u, T = UI[lang], UI[lang]['js']
    sans = r['san'] if r else []
    epds = [START_EPD] + (r['epd'] if r else [])
    fen = r['fen'] if r else START_FEN
    last = [r['uci'][-1][:2], r['uci'][-1][2:4]] if r and r['uci'] else None
    epd = epds[-1]
    nm = name_of(epds, lang)
    name = f'<span class="eco">{esc(nm["eco"])}</span><span>{esc(nm["name"])}</span>' if nm else f'<span>{esc(T["name_start"])}</span>'
    s = stats(epd, DEFAULT_BAND)
    sm = fmt(T['sum'], n=f'<b>{count(s["played"], lang)}</b>', band=esc(BANDS[DEFAULT_BAND])) if s and s['played'] else esc(fmt(T['sum_none'], band=BANDS[DEFAULT_BAND]))
    g = GUIDES[lang].get(nm['slug']) if nm and nm['slug'] and nm['slug'] != slug else None
    guide = (f'<a class="guide-link" data-guide href="{g["u"]}">{u["guide_read"]} <b>{esc(g["n"])}</b></a>' if g
             else f'<a class="guide-link" data-guide href="{prefix(lang)}openings/" hidden>{u["guide_read"]} <b></b></a>')
    ctrls = ''.join(f'<button type="button" data-nav="{k}" aria-label="{u[k]}" title="{u[k]}"{" disabled" if (k in ("next", "last")) or (k in ("first", "prev") and not sans) else ""}>{icon(k)}</button>'
                    for k in ('first', 'prev', 'next', 'last', 'flip')) + sound_btn(lang)
    attrs = f' data-orient="{orient}"' + (f' data-slug="{slug}"' if slug else '') + (f' data-line="{".".join(r["uci"])}"' if r else '') + (' data-url="sync"' if sync else '')
    pr = prefix(lang) + 'practice/' + (f'?o={slug}' if slug else '')
    e = E.get(epd)
    evv = ev_text(e[1]) if e else ''
    ev = f'<span class="evc" data-ev title="{esc(T["ev_tip"])}">{esc(T["ev_lbl"])} <b>{esc(evv) or "—"}</b></span>'
    tr = ''
    if tree:
        kids = tree_kids(epd, DEFAULT_BAND, ' '.join(sans))
        root = numbered([sans[-1]], len(sans) - 1) if sans else T['here_root']
        tr = f'<div class="tree" data-tree><p class="tree-h">{esc(T["tree_h"])} <small>{esc(T["tree_lbl"])}</small></p><div class="tree-s" data-tree-svg>{tree_svg(kids, len(sans), root, lang)}</div></div>'
    return f'''<section class="tool" data-explorer{attrs}><div class="wrap">
{head_html}<div class="grid">
<div class="bcol">
  {band_chips(lang)}
  <p class="namel" data-name>{name}</p>
  <div class="bwrap">{board_html(fen, orient, last)}</div><script>{FIT_JS}</script>
  <div class="ctrls">{ctrls}</div>
</div>
<div class="panel">
  <p class="crumb trail" data-crumb>{crumb_html(nm, sans, lang)}</p>
  <p class="sum"><span data-sum>{sm}</span> {ev}</p>
  <p class="pass" data-pass>{pass_text(epd, lang)}</p>
  <div class="mlbox"><ol class="ml" data-ml>{ml_html(sans, lang)}</ol></div>
  <div class="stbox"><table class="st"><thead><tr><th scope="col">{u['th_move']}</th><th scope="col">{u['th_share']}</th><th scope="col">{u['th_wdl']}</th><th scope="col">{u['th_ev']}</th></tr></thead><tbody data-rows>{rows_html(epd, lang)}</tbody></table></div>
  {guide}
  {tr}
  <div class="pfoot"><a class="btn" data-practice="w" href="{pr}">{u['practice_w']}</a><a class="btn ghost" data-practice="b" href="{pr}">{u['practice_b']}</a></div>
</div>
</div></div></section>'''


# ---------------------------------------------------------------- 정적 표
def band_table(lang, epd, ply):
    t = TX[lang]
    rows = []
    for b in list(range(4)) + [-1]:
        s = stats(epd, b)
        rn = reached(epd, b)
        n = rn['n']
        lab = t['band_all'] if b < 0 else BANDS[b]
        sh = n / START_N[b] if n else 0
        top = s['moves'][0] if s and s['moves'] else None
        reply = (f'<span class="san">{esc(numbered([top["san"]], ply))}</span><small>{pct(top["share"])}</small>' if top else '—')
        rows.append(f'<tr{" class=" + chr(34) + "all" + chr(34) if b < 0 else ""}><th scope="row">{esc(lab)}</th><td class="gs">{count(n, lang)}<small>{pct(sh, 1)}</small></td>'
                    f'<td class="wdl">{wdl_bar(rn["w"], rn["d"], rn["b"], lang) if n else ""}</td><td class="gs">{reply}</td></tr>')
    o = DATA.otb(epd)
    if o and o['n'] >= 20:
        top = o['moves'][0] if o['moves'] else None
        reply = (f'<span class="san">{esc(numbered([top["san"]], ply))}</span><small>{pct(top["share"])}</small>' if top else '—')
        rows.append(f'<tr class="otb"><th scope="row">{esc(t["otb_row"])}<small>{esc(t["otb_src"])}</small></th><td class="gs">{count(o["n"], lang)}</td>'
                    f'<td class="wdl">{wdl_bar(o["w"], o["d"], o["b"], lang)}</td><td class="gs">{reply}</td></tr>')
    return (f'<div class="tblbox"><table class="tbl bt"><thead><tr><th scope="col">{t["th_band"]}</th><th scope="col">{t["th_games"]} <small>({t["th_share"]})</small></th>'
            f'<th scope="col">{t["th_result"]}</th><th scope="col">{t["th_reply"]}</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>')


def shares_table(lang, epd, ply, k=6, links=None):
    """레이팅대별 다음 수 비율: 줄 = 전체에서 많이 둔 수 k개"""
    t = TX[lang]
    allm = (stats(epd, -1) or {'moves': []})['moves'][:k]
    per = [stats(epd, b) for b in range(4)]
    head_ = ''.join(f'<th scope="col">{esc(b)}</th>' for b in BANDS)
    rows = []
    for m in allm:
        cells = []
        for s in per:
            mm = next((x for x in (s or {'moves': []})['moves'] if x['san'] == m['san']), None)
            v = mm['share'] if mm else 0
            cells.append(f'<td><span class="shb" style="--s:{tofixed(v, 3)}"></span>{pct(v)}</td>')
        lab = esc(numbered([m['san']], ply))
        href = (links or {}).get(m['san'])
        lab = f'<a href="{href}" class="san">{lab}</a>' if href else f'<span class="san">{lab}</span>'
        rows.append(f'<tr><th scope="row">{lab}{cls_badge(m["cls"], lang)}</th>{"".join(cells)}<td class="ev">{esc(ev_text(m["ev"]))}</td></tr>')
    return (f'<div class="tblbox"><table class="tbl sh-t"><thead><tr><th scope="col">{t["move"]}</th>{head_}<th scope="col">{t["ev_h"]}</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div>')


def next_table(lang, epd, ply):
    """다음 수 4단계: 이 판에서 두는 수 전부(분류 순), 전체 비율·고수 비율·엔진·결과"""
    t, T = TX[lang], UI[lang]['js']
    s = stats(epd, -1, True)
    if not s or not s['moves']:
        return ''
    o = DATA.otb(epd)
    om = {m['san']: m['share'] for m in (o['moves'] if o and o['played'] >= 30 else [])}
    lo = stats(epd, 0) or {'moves': []}
    lom = {m['san']: m for m in lo['moves']}
    moves = sorted([m for m in s['moves'] if m['n'] or m['cls'] in (0, 1)], key=lambda m: (m['cls'] if m['cls'] >= 0 else 9, -m['n']))[:14]
    rows = []
    for m in moves:
        lm = lom.get(m['san'])
        trap = f'<span class="tp" title="{esc(T["trap_tip"])}">{esc(T["trap_flag"])}</span>' if lm and is_trap(lm) else ''
        bar = wdl_bar(m['w'], m['d'], m['b'], lang, mini=True) if m['n'] else f'<small class="th">{esc(T["theory"])}</small>'
        rows.append(f'<tr class="c{m["cls"]}"><th scope="row"><span class="san">{esc(numbered([m["san"]], ply))}</span>{cls_badge(m["cls"], lang)}{trap}</th>'
                    f'<td>{pct(m["share"]) if m["n"] else "—"}</td><td>{pct(om[m["san"]]) if m["san"] in om else "—"}</td>'
                    f'<td class="ev">{esc(ev_text(m["ev"]))}</td><td class="wdl">{bar}</td></tr>')
    return (f'<div class="tblbox"><table class="tbl nx"><thead><tr><th scope="col">{t["move"]}</th><th scope="col">{t["band_all"]}</th><th scope="col">{t["otb_row"]}</th>'
            f'<th scope="col">{t["ev_h"]}</th><th scope="col">{t["th_result"]}</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>')


def card(lang, o):
    r = o['_r']
    n = reached(r['epd'][-1])
    side = TX[lang]['for_w'] if o['side'] == 'w' else TX[lang]['for_b']
    return (f'<li class="card"><a href="{prefix(lang)}openings/{o["slug"]}/">{esc(o[lang]["name"])}</a>'
            f'<p class="mvs">{esc(numbered(r["san"]))}</p>'
            f'<p class="meta"><span class="dot {o["side"]}" role="img" aria-label="{side}" title="{side}"></span>{wdl_bar(n["w"], n["d"], n["b"], lang, mini=True)}'
            f'<span>{fmt(TX[lang]["games_n"], n=count(n["n"], lang))}</span></p></li>')


# ---------------------------------------------------------------- 공통
def org():
    return {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}


def app_ld(lang, name, desc, path):
    return {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': name, 'url': url(lang, path), 'description': desc,
            'applicationCategory': 'GameApplication', 'operatingSystem': 'Any', 'inLanguage': lang, 'isAccessibleForFree': True,
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}, 'publisher': org()}


def crumbs_ld(lang, items):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList',
            'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': url(lang, p)} for i, (n, p) in enumerate(items)]}


def by_reached(lst):
    return sorted(lst, key=lambda o: -reached(o['_r']['epd'][-1])['n'])


def popular(n=8):
    return by_reached([o for o in OPENINGS if not o['hub']])[:n]


def first_key(o):
    fm = o['_r']['san'][0]
    return next((k for k, m in FIRST_MOVES if m == fm), 'other-first-moves')


# ---------------------------------------------------------------- 홈(첫 화면은 사용자와 정하는 중: 지금은 임시)
def home_page(lang):
    P, t, u = PAGES[lang]['home'], TX[lang], UI[lang]
    p = prefix(lang)
    fm_btns = ''.join(f'<a class="fmb" href="{p}openings/{k}/"><span class="san">1.{m}</span><small>{pct(share_at(epd_after(m)))}</small></a>' for k, m in FIRST_MOVES)
    fm_btns += f'<a class="fmb" href="{p}openings/other-first-moves/"><span>{esc(t["fm_other_h"])}</span></a>'
    cards = ''.join(card(lang, o) for o in popular())
    how = ''.join(f'<li>{esc(x)}</li>' for x in t['home_how'])
    body = f'''<section class="hero"><div class="wrap">
  <h1>{P['h1']}</h1>
  <p class="why">{fmt(P['why'], games=games_text(lang))}</p>
  <p class="hero-b"><a class="btn" href="{p}map/">{t['home_map']}</a><a class="btn ghost" href="{p}test/">{t['home_test']}</a></p>
</div></section>
<section class="sec"><div class="wrap">
  <h2>{t['home_first_h']}</h2>
  <div class="fmbs">{fm_btns}</div>
  {shares_table(lang, START_EPD, 0, links={m: f'{p}openings/{k}/' for k, m in FIRST_MOVES})}
</div></section>
{ad_slot(lang, 'mid')}
<section class="sec"><div class="wrap">
  <h2>{t['home_popular_h']}</h2>
  <ul class="cards">{cards}</ul>
  <p class="row-b"><a class="btn ghost" href="{p}openings/">{fmt(t['all_openings'], n=len(OPENINGS))}</a><a class="btn ghost" href="{p}best-openings/">{t['home_best']}</a></p>
</div></section>
<section class="sec"><div class="wrap prose">
  <h2>{t['home_how_h']}</h2>
  <ol>{how}</ol>
  <p class="note">{u['data_note']}</p>
</div></section>'''
    h = head(lang, P['title'], P['desc'], '', [app_ld(lang, u['brand'], P['desc'], '')])
    return '', page(lang, h, body, '', None)


EPD_AFTER = {}


def epd_after(m):
    return EPD_AFTER[m]


def map_page(lang):
    P, u = PAGES[lang]['map'], UI[lang]
    hh = f'<div class="tool-head"><h1>{P["h1"]}</h1><p class="why">{P["why"]}</p></div>\n'
    body = explorer(lang, None, 'w', sync=True, head_html=hh)
    h = head(lang, P['title'], P['desc'], 'map/', [app_ld(lang, P['h1'] + ' · ' + u['brand'], P['desc'], 'map/')])
    return 'map/', page(lang, h, body, 'map/', 'map', {'map': True})


# ---------------------------------------------------------------- 목록·첫 수별
def list_page(lang):
    P, t = PAGES[lang]['openings'], TX[lang]
    p = prefix(lang)
    jump = ''.join(f'<a class="fmb" href="{p}openings/{k}/"><span class="san">1.{m}</span></a>' for k, m in FIRST_MOVES) + f'<a class="fmb" href="{p}openings/other-first-moves/"><span>{esc(t["fm_other_h"])}</span></a>'
    groups = ''
    for g, names in GROUPS:
        cards = ''.join(card(lang, o) for o in by_reached([o for o in OPENINGS if o['group'] == g]))
        groups += f'<h2 class="group-h" id="{g}">{esc(names[lang])}</h2><ul class="cards">{cards}</ul>\n'
    body = f'''<div class="wrap sec">
  <h1>{P['h1']}</h1>
  <p class="lead">{P['lead']}</p>
  <p class="lbl2">{t['list_by_first']}</p><div class="fmbs">{jump}</div>
  {groups}
</div>'''
    h = head(lang, titled(lang, P['title']), P['desc'], 'openings/', [crumbs_ld(lang, [(UI[lang]['brand'], ''), (t['crumb'], 'openings/')])], ads=False)
    return 'openings/', page(lang, h, body, 'openings/', 'openings')


def first_move_page(lang, key, m):
    t, u = TX[lang], UI[lang]
    p = prefix(lang)
    path = f'openings/{key}/'
    epd = epd_after(m)
    mine = [o for o in OPENINGS if o['_r']['san'][0] == m]
    # 응수마다 이어지는 해설: 그 응수로 시작하는 해설 중 가장 많이 두는 것
    links = {}
    for o in by_reached(mine):
        sans = o['_r']['san']
        if len(sans) >= 2 and sans[1] not in links:
            links[sans[1]] = GUIDES[lang][o['slug']]['u']
    wcards = ''.join(card(lang, o) for o in by_reached([o for o in mine if o['side'] == 'w']))
    bcards = ''.join(card(lang, o) for o in by_reached([o for o in mine if o['side'] == 'b']))
    rr = play([m])[0]
    name = f'1.{m}'
    title = fmt(t['fm_h'], m=m)
    body = f'''<div class="wrap ohead">
  <p class="crumb"><a href="{p}openings/">{t['crumb']}</a> <span aria-hidden="true">›</span> {esc(name)}</p>
  <h1>{esc(title)}</h1>
  <p class="olead">{esc(fmt(t['fm_lead'], m=m))}</p>
</div>
{explorer(lang, rr, 'w', head_html='', tree=True)}
<section class="sec"><div class="wrap">
  <h2>{esc(fmt(t['s_next'].split('<')[0] if False else t['fm_reply'], m=m))}</h2>
  {shares_table(lang, epd, 1, k=10, links=links)}
  {band_table(lang, epd, 1)}
</div></section>
{ad_slot(lang, 'mid')}
<section class="sec"><div class="wrap">
  {f"<h2>{esc(fmt(t['fm_black'], m=m))}</h2><ul class='cards'>{bcards}</ul>" if bcards else ''}
  {f"<h2>{esc(fmt(t['fm_white'], m=m))}</h2><ul class='cards'>{wcards}</ul>" if wcards else ''}
</div></section>'''
    desc = fmt(t['fm_lead'], m=m)[:158]
    h = head(lang, titled(lang, title), desc, path, [crumbs_ld(lang, [(u['brand'], ''), (t['crumb'], 'openings/'), (name, path)])])
    return path, page(lang, h, body, path, 'openings')


def other_first_page(lang):
    t, u = TX[lang], UI[lang]
    p = prefix(lang)
    path = 'openings/other-first-moves/'
    main = {m for _, m in FIRST_MOVES}
    s = stats(START_EPD, -1)
    others = [x for x in s['moves'] if x['san'] not in main]
    mine = [o for o in OPENINGS if o['_r']['san'][0] not in main]
    links = {}
    for o in by_reached(mine):
        if o['_r']['san'][0] not in links:
            links[o['_r']['san'][0]] = GUIDES[lang][o['slug']]['u']
    rows = []
    per = [stats(START_EPD, b) for b in range(4)]
    for x in others[:16]:
        cells = ''.join(f'<td>{pct(next((y["share"] for y in (q or {"moves": []})["moves"] if y["san"] == x["san"]), 0), 1)}</td>' for q in per)
        lab = f'<a class="san" href="{links[x["san"]]}">1.{esc(x["san"])}</a>' if x['san'] in links else f'<a class="san" href="{p}map/#{esc(x["san"])}">1.{esc(x["san"])}</a>'
        rows.append(f'<tr><th scope="row">{lab}{cls_badge(x["cls"], lang)}</th>{cells}<td class="ev">{esc(ev_text(x["ev"]))}</td></tr>')
    th = ''.join(f'<th scope="col">{esc(b)}</th>' for b in BANDS)
    cards = ''.join(card(lang, o) for o in by_reached(mine))
    body = f'''<div class="wrap ohead">
  <p class="crumb"><a href="{p}openings/">{t['crumb']}</a></p>
  <h1>{esc(t['fm_other_h'])}</h1>
  <p class="olead">{esc(t['fm_other_lead'])}</p>
</div>
<section class="sec"><div class="wrap">
  <div class="tblbox"><table class="tbl sh-t"><thead><tr><th scope="col">{t['fm_first']}</th>{th}<th scope="col">{t['ev_h']}</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
  <h2>{t['fm_cards']}</h2><ul class="cards">{cards}</ul>
</div></section>'''
    h = head(lang, titled(lang, t['fm_other_h'] + (' in Chess' if lang == 'en' else ' (체스)')), t['fm_other_lead'][:158], path,
             [crumbs_ld(lang, [(u['brand'], ''), (t['crumb'], 'openings/'), (t['fm_other_h'], path)])])
    return path, page(lang, h, body, path, 'openings', scripts=True)


# ---------------------------------------------------------------- 레이팅대별 추천
def best_rows():
    out = {}
    for b in range(4):
        for side in ('w', 'b'):
            lst = []
            for o in OPENINGS:
                if o['hub'] or o['side'] != side:
                    continue
                e = o['_r']['epd'][-1]
                r = reached(e, b)
                if not r['n'] or r['n'] / START_N[b] < 1 / 400:
                    continue
                lst.append((score(r, side), o, r))
            lst.sort(key=lambda x: -x[0])
            out[(b, side)] = lst[:12]
    return out


def best_page(lang, BR):
    P, t, u = PAGES[lang]['best'], TX[lang], UI[lang]
    p = prefix(lang)
    tabs = ''.join(f'<button type="button" class="chip" data-bb="{b}" aria-pressed="{"true" if b == DEFAULT_BAND else "false"}">{esc(BANDS[b])}</button>' for b in range(4))
    panes = ''
    for b in range(4):
        cols = ''
        for i, side in enumerate(('w', 'b')):
            rows = ''.join(f'<tr><th scope="row"><a href="{p}openings/{o["slug"]}/">{esc(o[lang]["name"])}</a></th><td class="sc"><b>{pct(sc, 1)}</b></td>'
                           f'<td>{pct(r["n"] / START_N[b], 1)}</td><td class="wdl">{wdl_bar(r["w"], r["d"], r["b"], lang, mini=True)}</td></tr>'
                           for sc, o, r in BR[(b, side)])
            tb = (f'<div class="tblbox"><table class="tbl bs"><thead><tr><th scope="col">{t["crumb"]}</th><th scope="col">{t["best_score"]}</th><th scope="col">{t["best_pop"]}</th>'
                  f'<th scope="col">{t["th_result"]}</th></tr></thead><tbody>{rows}</tbody></table></div>') if rows else f'<p>{t["best_none"]}</p>'
            cols += f'<div class="bcolx"><h3><span class="dot {side}"></span>{t["best_side"][i]}</h3>{tb}</div>'
        panes += f'<div class="bpane" data-bp="{b}"{"" if b == DEFAULT_BAND else " hidden"}><h2>{esc(BANDS[b])}</h2><div class="bcols">{cols}</div></div>'
    body = f'''<div class="wrap sec">
  <h1>{P['h1']}</h1>
  <p class="lead">{P['lead']}</p>
  <div class="bands" role="group" aria-label="{u['band_lbl']}" data-best><span class="lbl">{u['band_lbl']}</span>{tabs}</div>
  {panes}
  <p class="note">{t['best_note']}</p>
</div>'''
    h = head(lang, P['title'], P['desc'], 'best-openings/', [crumbs_ld(lang, [(u['brand'], ''), (P['h1'], 'best-openings/')])])
    return 'best-openings/', page(lang, h, body, 'best-openings/', 'openings')


# ---------------------------------------------------------------- 오프닝 페이지(11칸)
def learn_band(epd):
    for b in range(4):
        if share_at(epd, b) >= 0.005:
            return b
    return 3 if share_at(epd, 3) else None


def pawns(epd):
    """폰 모양: 말판에서 폰만 남긴 문자열"""
    rows = epd.split(' ')[0].split('/')
    out = []
    for row in rows:
        s = ''
        for ch in row:
            s += '.' * int(ch) if ch.isdigit() else (ch if ch in 'pP' else '.')
        out.append(s)
    return '/'.join(out)


def auto_traps(o, lang):
    """메인라인 판들에서: 아래 레이팅대가 8% 넘게 두지만 의심스러운·나쁜 수 + 엔진 최선 응수.
    오프닝이 정해진 뒤의 판만 본다(1.d4 해설 28개에 똑같이 1...e5가 나오던 것, 평가 2026-11-05 L14)."""
    m = o['_m']
    epds = [START_EPD] + m['epd']
    cand = []
    for i in range(min(len(o['_r']['san']), len(m['san'])), len(m['san'])):
        epd = epds[i]
        for b in (0, 1):
            s = stats(epd, b)
            if not s:
                continue
            for mv in s['moves']:
                if mv['cls'] >= 3 and mv['share'] >= 0.08 and mv['n'] >= 200:
                    cand.append((i, mv['san'], b, mv['share'], mv['n'], mv['cls']))
    seen, out = set(), []
    for i, san, b, sh, n, c in sorted(cand, key=lambda x: -x[4]):
        if (i, san) in seen:
            continue
        seen.add((i, san))
        out.append({'i': i, 'san': san, 'band': b, 'share': sh, 'cls': c})
        if len(out) >= 4:
            break
    if not out:
        return []
    res = play([' '.join(m['san'][:x['i']] + [x['san']]) for x in out])
    for x, r in zip(out, res):
        x['_r'] = r
        ce = E.get(r['epd'][-1])
        x['best'] = ce[5] if ce and len(ce) > 5 else None
        x['ev'] = ce[1] if ce else None
    return out


def opening_page(lang, o, pawn_index):
    L, t, u, T = o[lang], TX[lang], UI[lang], UI[lang]['js']
    p = prefix(lang)
    r, M = o['_r'], o['_m']
    ply = len(r['san'])
    path = f'openings/{o["slug"]}/'
    end = r['epd'][-1]
    n_all = reached(end)
    nm = name_of([START_EPD] + r['epd'], lang)
    eco = nm['eco'] if nm else ''
    side = t['for_w'] if o['side'] == 'w' else t['for_b']
    line_txt = numbered(r['san'])
    short = RS.SHORT.get(o['slug'], ('', ''))[1 if lang == 'ko' else 0]
    nl = L['name'].lower().replace(' ', '')
    other_names = [x for x in RS.ALIASES.get(o['slug'], {}).get(lang, []) if len(x) > 3 and x.lower().replace(' ', '') not in nl and not x.isupper()]
    fmk = first_key(o)
    crumb = (f'<p class="crumb"><a href="{p}openings/">{t["crumb"]}</a> <span aria-hidden="true">›</span> '
             f'<a href="{p}openings/{fmk}/">{esc("1." + r["san"][0]) if fmk != "other-first-moves" else esc(t["fm_other_h"])}</a> <span aria-hidden="true">›</span> {esc(GROUP_NAME[o["group"]][lang])}</p>')
    # 1. 이름·수순·판
    top = f'''<div class="wrap ohead">
  {crumb}
  <h1>{esc(L['title'])}</h1>
  <p class="ometa"><span class="dot {o['side']}"></span><span>{side}</span><span class="eco">{esc(t['eco'])} {esc(eco)}</span><span class="san">{esc(line_txt)}</span><span>{fmt(t['seen'], p=pct(n_all['n'] / START_N[4], 1))}</span></p>
  {f'<p class="aka">{esc(" · ".join(other_names))}</p>' if other_names else ''}
  <div class="short"><p class="short-h">{t['s_short']}</p><p class="short-t">{esc(short) if short else esc(L['lead'])}</p></div>
</div>'''
    body = top + '\n' + explorer(lang, r, o['side'], slug=o['slug'], tree=False)
    # 2. 더 깊이
    body += f'''
<section class="sec"><div class="wrap prose">
  <h2>{t['s_deep']}</h2>
  <p>{esc(L['lead'])}</p>
  <p>{esc(L['club'])}</p>
</div></section>'''
    # 3. 메인라인, 수마다 이유
    epds = [START_EPD] + M['epd']
    steps = []
    for i, san in enumerate(M['san']):
        seq = ' '.join(M['san'][:i + 1])
        row = next((x for x in E.get(epds[i], [None, None, []])[2] if x[0] == san), None) if E.get(epds[i]) else None
        c = row[1] if row else -1
        rs = why(epds[i], san, lang)
        dp = deep(seq, lang)
        mn = f'{i // 2 + 1}.' if i % 2 == 0 else f'{i // 2 + 1}...'
        steps.append(f'<li data-ply="{i + 1}" class="stp c{c}{" def" if i < ply else ""}"><button type="button" class="stp-b"><span class="mn">{mn}</span><b class="san">{esc(san)}</b>{cls_badge(c, lang)}</button>'
                     f'{f"<p>{esc(rs)}</p>" if rs else ""}{f"<p class={chr(34)}deep{chr(34)}>{esc(dp)}</p>" if dp else ""}</li>')
    sfen = START_FEN
    body += f'''
<section class="sec mainline" data-steps data-line="{'.'.join(M['uci'])}" data-orient="{o['side']}"><div class="wrap">
  <h2>{t['s_main']}</h2>
  <p class="prose">{t['s_main_p']}</p>
  <div class="steps">
    <div class="steps-b"><div class="bwrap">{board_html(sfen, o['side'])}</div><p class="steps-now" data-steps-now></p></div>
    <ol class="steps-l">{''.join(steps)}</ol>
  </div>
</div></section>'''
    # 4. 다음 수 4단계
    body += f'''
<section class="sec"><div class="wrap">
  <h2>{t['s_next']}</h2>
  <p class="prose">{fmt(t['s_next_p'], line=esc(line_txt), band=esc(t['band_all']))}</p>
  {next_table(lang, end, ply)}
</div></section>
{ad_slot(lang, 'mid')}'''
    # 5. 레이팅대별
    body += f'''
<section class="sec"><div class="wrap">
  <h2>{fmt(t['s_rating'], name=esc(L['name']))}</h2>
  <p class="prose">{fmt(t['s_rating_p'], line=esc(line_txt))}</p>
  {band_table(lang, end, ply)}
</div></section>'''
    # 6. 함정과 응징
    traps = ''
    for tr in o['traps']:
        tr_r = tr['_r']
        mate = f'<small>{t["mate"]}</small>' if tr['end'] == 'mate' else ''
        pen = tr_r['epd'][-2] if len(tr_r['epd']) > 1 else START_EPD
        row = next((x for x in (E.get(pen) or [None, None, []])[2] if x[0] == tr_r['san'][-1]), None)
        tn = sum(row[3:]) if row else 0
        tline = fmt(t['trap_n'], n=count(tn, lang)) if tn else t['trap_rare']
        traps += (f'<div class="trap"><h3>{esc(tr[lang]["title"])}</h3><p>{esc(tr[lang]["text"])}</p><p class="vst">{esc(tline)}</p>'
                  f'<a class="line-btn" href="{p}map/#{hash_of(tr_r["san"])}" data-goto="{".".join(tr_r["uci"])}">{t["show_board"]}: {esc(numbered(tr_r["san"]))}{mate}</a></div>')
    auto = ''
    for x in auto_traps(o, lang):
        xr = x['_r']
        best = f'<span class="san">{esc(numbered([x["best"]], x["i"] + 1))}</span> <small>({esc(ev_text(x["ev"]))})</small>' if x['best'] else '—'
        auto += (f'<li><span class="san">{esc(numbered(xr["san"][x["i"]:], x["i"]))}</span>{cls_badge(x["cls"], lang)} '
                 f'<small>{esc(BANDS[x["band"]])} {pct(x["share"])}</small> → {t["best_reply"]}: {best} '
                 f'<a href="{p}map/#{hash_of(xr["san"])}" data-goto="{".".join(xr["uci"])}">{t["show_board"]}</a></li>')
    if traps or auto:
        body += f'''
<section class="sec"><div class="wrap">
  <h2>{t['s_traps']}</h2>
  {traps}
  {f"<h3>{t['s_traps_auto']}</h3><p class='prose'>{t['s_traps_auto_p']}</p><ul class='autotrap'>{auto}</ul>" if auto else ''}
</div></section>'''
    # 7. 계획
    ideas = (f'<div class="ideas"><div class="idea"><h3><span class="dot w"></span>{t["white"]}</h3><ul>{"".join(f"<li>{esc(x)}</li>" for x in L["white"])}</ul></div>'
             f'<div class="idea"><h3><span class="dot b"></span>{t["black"]}</h3><ul>{"".join(f"<li>{esc(x)}</li>" for x in L["black"])}</ul></div></div>')
    body += f'''
<section class="sec"><div class="wrap">
  <h2>{t['s_plans']}</h2>
  {ideas}
</div></section>
{ad_slot(lang, 'bottom')}'''
    # 8. 세부 갈래
    vars_ = ''
    for i, v in enumerate(o['vars']):
        vr = v['_r']
        vid = 'v-' + re.sub(r'[^a-z0-9]+', '-', v['en']['name'].lower()).strip('-')[:48]
        k = ply if vr['san'][:ply] == r['san'] else 0
        vs = numbered(vr['san'][k:], k)
        rn = reached(vr['epd'][-1])
        st = (fmt(t['var_stats'], n=count(rn['n'], lang), w=pct(rn['w'] / rn['n']), d=pct(rn['d'] / rn['n']), b=pct(rn['b'] / rn['n'])) if rn['n'] else t['var_rare'])
        vars_ += (f'<li class="var" id="{vid}"><button type="button" class="var-h" data-fold aria-expanded="false" aria-controls="{vid}-b">'
                  f'<span><span class="vn">{esc(v[lang]["name"])}</span>{"" if re.search(r"[0-9][.]", v[lang]["name"]) else " <span class=" + chr(34) + "vs" + chr(34) + ">" + esc(vs) + "</span>"}</span>'
                  f'<svg class="chev" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button>'
                  f'<div class="var-b" id="{vid}-b"><div><p>{esc(v[lang]["note"])}</p><p class="vst">{wdl_bar(rn["w"], rn["d"], rn["b"], lang, mini=True)} {esc(st)}</p>'
                  f'<a class="line-btn" href="{p}map/#{hash_of(vr["san"])}" data-goto="{".".join(vr["uci"])}">{t["show_board"]}: {esc(numbered(vr["san"]))}</a></div></div></li>')
    if vars_:
        body += f'''
<section class="sec"><div class="wrap">
  <h2>{t['s_vars']}</h2>
  <ul class="vars">{vars_}</ul>
</div></section>'''
    # 9. 같은 판, 다른 수순
    ent = E.get(end)
    orders = ent[6] if ent and len(ent) > 6 and ent[6] else []
    ol = ''.join(f'<li><span class="san">{esc(numbered(q.split(" ")))}</span> <small>{fmt(t["games_n"], n=count(n, lang))}</small></li>' for n, q in orders)
    same = [x for x in pawn_index.get(pawns(end), []) if x is not o]
    sl = ''.join(f'<li><a href="{p}openings/{x["slug"]}/">{esc(x[lang]["name"])}</a> <span class="san">{esc(numbered(x["_r"]["san"]))}</span></li>' for x in same[:6])
    body += f'''
<section class="sec"><div class="wrap">
  <h2>{t['s_same']}</h2>
  <p class="prose">{t['s_same_p']}</p>
  <div class="ideas"><div class="idea"><h3>{t['s_same_orders']}</h3>{f"<ol class='orders'>{ol}</ol>" if ol else f"<p>{t['s_same_none']}</p>"}</div>
  {f"<div class='idea'><h3>{t['s_same_pawns']}</h3><ul class='orders'>{sl}</ul></div>" if sl else ''}</div>
</div></section>'''
    # 10. 배울 레이팅대와 검토 상태
    lb = learn_band(end)
    if lb == 0:
        lbt = t['learn_any']
    elif lb is None:
        lbt = t['learn_high']
    else:
        lbt = fmt(t['learn_band'], band=BANDS[lb])
    status = RS.REVIEW.get(o['slug'], {})
    rv_rows = ''
    for key, base in (('short', (1, 0, 0)), ('main', (1, 1, 0)), ('next', (0, 1, 0)), ('traps', (1, 1, 0)), ('plans', (1, 0, 0)), ('vars', (1, 1, 0)), ('stats', (0, 0, 0))):
        st = status.get(key, base)
        marks = ''.join(f'<td>{"✓" if v else "—"}</td>' for v in st)
        rv_rows += f'<tr><th scope="row">{esc(t["rv_sec"][key])}</th>{marks}</tr>'
    rv_head = ''.join(f'<th scope="col">{esc(x)}</th>' for x in t['rv'])
    body += f'''
<section class="sec"><div class="wrap">
  <h2>{t['s_learn']}</h2>
  <p class="learn"><b>{esc(lbt)}</b> <small>{esc(t['learn_why'])}</small></p>
  <div class="tblbox"><table class="tbl rv"><thead><tr><th scope="col"></th>{rv_head}</tr></thead><tbody>{rv_rows}</tbody></table></div>
  <p class="note">{t['rv_note']}</p>
</div></section>'''
    # 11. 이어 가기
    sidename = t['white'] if o['side'] == 'w' else t['black']
    other = 'b' if o['side'] == 'w' else 'w'
    pr = p + 'practice/?o=' + o['slug']
    pr2 = p + 'practice/?m=' + '.'.join(r['uci']) + '&side=' + other
    body += f'''
<section class="sec"><div class="wrap">
  <h2>{t['s_cont']}</h2>
  <ul class="cont">
    <li><a class="btn" href="{p}map/#{hash_of(r['san'])}">{t['cont_map']}</a></li>
    <li><a class="btn ghost" href="{p}test/?o={o['slug']}">{t['cont_test']}</a></li>
    <li><a class="btn ghost" href="{pr}">{fmt(t['cont_practice'], side=sidename)}</a></li>
    <li><a class="btn ghost" href="{pr2}">{fmt(t['cont_practice'], side=t['black'] if other == 'b' else t['white'])}</a></li>
    <li><a class="btn ghost" href="/data/openings/{o['slug']}.json">{t['cont_json']}</a></li>
  </ul>
  <h2>{t['related_h']}</h2>
  <ul class="cards">{''.join(card(lang, x) for x in by_reached([x for x in OPENINGS if x['group'] == o['group'] and x is not o])[:6])}</ul>
</div></section>'''
    title = titled(lang, L['title'])
    art = {'@context': 'https://schema.org', '@type': 'Article', 'headline': L['title'], 'description': L['desc'], 'inLanguage': lang,
           'datePublished': FIRST, 'dateModified': lastmod(p + path), 'author': org(), 'publisher': org(),
           'mainEntityOfPage': url(lang, path), 'image': f'{SITE}/{"og-ko.png" if lang == "ko" else "og.png"}'}
    h = head(lang, title, L['desc'], path, [art, crumbs_ld(lang, [(u['brand'], ''), (t['crumb'], 'openings/'), (L['name'], path)])], og_type='article')
    return path, page(lang, h, body, path, 'openings')


def opening_json(o):
    r, M = o['_r'], o['_m']
    end = r['epd'][-1]
    nm = name_of([START_EPD] + r['epd'], 'en')
    s = stats(end, -1, True)
    by_band = []
    for b in range(4):
        x = reached(end, b)
        by_band.append({'band': BANDS[b], 'games': x['n'], 'share_of_band': round(x['n'] / START_N[b], 6) if x['n'] else 0,
                        'white_win': x['w'], 'draw': x['d'], 'black_win': x['b']})
    oo = DATA.otb(end)
    epds = [START_EPD] + M['epd']
    main = []
    for i, san in enumerate(M['san']):
        x = DATA.X.get(epds[i], {}).get(san)
        main.append({'ply': i + 1, 'san': san, 'why_en': x[0] if x else None, 'why_ko': x[1] if x else None})
    return {
        'name': {'en': o['en']['name'], 'ko': o['ko']['name']}, 'eco': nm['eco'] if nm else None, 'side': o['side'],
        'line_san': r['san'], 'position_epd': end, 'url': {'en': url('en', f'openings/{o["slug"]}/'), 'ko': url('ko', f'openings/{o["slug"]}/')},
        'engine_eval_white_cp': E[end][1] if end in E else None,
        'games_by_rating': by_band,
        'masters': ({'games': oo['n'], 'white_win': oo['w'], 'draw': oo['d'], 'black_win': oo['b'],
                     'next_moves': [{'san': m['san'], 'games': m['n']} for m in oo['moves'][:8]], 'license': 'CC BY-SA 4.0 (Lichess broadcasts, Opening Trail)'} if oo else None),
        'next_moves': [{'san': m['san'], 'type': trail_type(m['cls']), 'engine_eval_white_cp': m['ev'], 'games': m['n'], 'share': round(m['share'], 5),
                        'white_win': m['w'], 'draw': m['d'], 'black_win': m['b']} for m in (s['moves'] if s else [])[:16]],
        'main_line': main,
        'source': {'games': META['source'], 'evals': META['eval_source'], 'license': META['license'], 'made': META['made']},
    }


def trail_type(c):
    return ['main', 'alternative', 'side', 'dubious', 'mistake'][c] if c is not None and c >= 0 else None


# ---------------------------------------------------------------- 연습·테스트·문서·404
def practice_page(lang):
    P, t, u = PAGES[lang]['practice'], TX[lang], UI[lang]
    opts = ''
    for g, names in GROUPS:
        opts += f'<optgroup label="{esc(names[lang])}">' + ''.join(
            f'<option value="{o["slug"]}"{" selected" if o["slug"] == "italian-game" else ""}>{esc(o[lang]["name"])}</option>' for o in OPENINGS if o['group'] == g) + '</optgroup>'
    first = BY_SLUG['italian-game']['_r']
    setup = fmt(u['js']['setup_msg'], name=esc(BY_SLUG['italian-game'][lang]['name']), side=u['js']['white'])
    how = ''.join(f'<li>{esc(x)}</li>' for x in t['pr_how'])
    lst = ''.join(f'<li><a href="{prefix(lang)}practice/?o={o["slug"]}">{esc(o[lang]["name"])}</a></li>' for o in OPENINGS)
    body = f'''<section class="tool drill" data-drill data-state="setup"><div class="wrap">
<div class="tool-head"><h1>{P['h1']}</h1><p class="why">{P['why']}</p></div>
<div class="grid">
<div class="panel">
  <div class="row2 setup-only">
    <label class="field">{t['opening_lbl']}<select data-pick>{opts}</select></label>
    <label class="field">{t['side_lbl']}<select data-side><option value="w" selected>{t['white']}</option><option value="b">{t['black']}</option></select></label>
  </div>
  <div class="setup-only">{band_chips(lang)}</div>
  <div class="msg" data-msg aria-live="polite">{setup}</div>
  <div class="pfoot">
    <button type="button" class="btn setup-only" data-act="start">{t['start']}</button>
    <button type="button" class="btn ghost setup-only" data-act="review">{t['review']}</button>
    <button type="button" class="btn ghost" data-act="hint">{t['hint']}</button>
    <button type="button" class="btn ghost run-only" data-act="setup">{t['stop']}</button>
  </div>
  <p class="due" data-due></p>
</div>
<div class="bcol"><div class="bwrap">{board_html(first['fen'], 'w', [first['uci'][-1][:2], first['uci'][-1][2:4]])}</div><script>{FIT_JS}</script><div class="ctrls ctrls-1">{sound_btn(lang)}</div></div>
</div></div></section>
<section class="sec"><div class="wrap prose">
  <h2>{t['pr_how_h']}</h2>
  <ol>{how}</ol>
</div></section>
{ad_slot(lang, 'mid')}
<section class="sec"><div class="wrap prose">
  <h2>{t['pr_list_h']}</h2>
  <ul class="cols">{lst}</ul>
</div></section>'''
    cfg = {'openings': [{'slug': o['slug'], 'name': o[lang]['name'], 'side': o['side'], 'line': o['_m']['uci'], 'def': len(o['_r']['uci'])} for o in OPENINGS]}
    h = head(lang, titled(lang, P['title']), P['desc'], 'practice/', [app_ld(lang, P['h1'] + ' · ' + u['brand'], P['desc'], 'practice/')])
    return 'practice/', page(lang, h, body, 'practice/', 'practice', cfg)


TEST_MIN = 300          # 2000+가 이 판에서 둔 판이 이만큼 넘어야 문제로 쓴다


def test_pool():
    """테스트 문제: 메인라인·갈래 위의 판에서 2000+가 가장 많이 둔 수(건전한 수)가 정답, 낮은 레이팅대가 많이 두는 다른 수 셋이 보기.
    [수순 UCI, 차례, 정답 SAN, [[SAN, 레이팅대 4칸 비율, 분류], ...], 반수, slug]"""
    seen, pool, by = {}, [], {}
    lines = []
    for o in OPENINGS:
        lines.append((o, o['_m']))
        for v in o['vars']:
            lines.append((o, v['_r']))
    for o, r in lines:
        epds = [START_EPD] + r['epd']
        for i in range(1, len(r['san'])):
            e = epds[i]
            if e in seen:
                if o['slug'] not in pool[seen[e]][5]:
                    pool[seen[e]][5].append(o['slug'])
                continue
            per = [stats(e, b) for b in range(4)]
            top = per[3]
            if not top or top['played'] < TEST_MIN or not top['moves']:
                continue
            a = top['moves'][0]
            if a['share'] < 0.4 or a['cls'] not in (0, 1) or (len(top['moves']) > 1 and top['moves'][1]['share'] > a['share'] - 0.15):
                continue
            low = {}
            for b in range(3):
                for m in (per[b] or {'moves': []})['moves'][:8]:
                    if m['san'] != a['san'] and m['n'] >= 20:
                        low[m['san']] = max(low.get(m['san'], 0), m['share'])
            others = sorted(low, key=lambda k: -low[k])[:3]
            if len(others) < 3:
                continue

            def shares(san):
                return [round(next((x['share'] for x in (q or {'moves': []})['moves'] if x['san'] == san), 0), 3) for q in per]

            def cls_of(san):
                return next((x['cls'] for x in top['moves'] if x['san'] == san), next((x['cls'] for x in (per[2] or {'moves': []})['moves'] if x['san'] == san), -1))
            opts = [[x, shares(x), cls_of(x)] for x in [a['san']] + others]
            seen[e] = len(pool)
            pool.append(['.'.join(r['uci'][:i]), 'w' if i % 2 == 0 else 'b', a['san'], opts, i, [o['slug']]])
    for k, q in enumerate(pool):
        for slug in q[5]:
            by.setdefault(slug, []).append(k)
    return {'q': pool, 'by': by}


def test_page(lang):
    P, u, TT = PAGES[lang]['test'], UI[lang], TEST[lang]
    p = prefix(lang)
    how = ''.join(f'<li>{esc(x)}</li>' for x in TT['how'])
    opts = ''.join(f'<option value="{o["slug"]}">{esc(o[lang]["name"])}</option>' for o in sorted(OPENINGS, key=lambda o: o[lang]['name']))
    body = f'''<section class="tool quiz" data-quiz data-state="intro"><div class="wrap">
<div class="tool-head"><h1>{P['h1']}</h1><p class="why">{P['why']}</p></div>
<div class="grid">
<div class="bcol"><div class="bwrap">{board_html(START_FEN, 'w')}</div><script>{FIT_JS}</script><div class="qbar" data-qbar aria-hidden="true">{''.join('<i></i>' for _ in range(10))}</div></div>
<div class="panel">
  <div class="q-intro">
    <label class="field">{esc(TX[lang]['opening_lbl'])}<select data-qo><option value="">{esc(TT['all'])}</option>{opts}</select></label>
    <button type="button" class="btn big" data-qa="start">{esc(TT['start'])}</button>
  </div>
  <div class="q-run">
    <p class="q-of" data-qof></p>
    <p class="q-name" data-qname></p>
    <p class="q-prompt" data-qprompt></p>
    <div class="q-opts" data-qopts></div>
    <p class="msg" data-qmsg aria-live="polite"></p>
    <button type="button" class="btn" data-qa="next" hidden>{esc(TT['next'])}</button>
  </div>
  <div class="q-end">
    <p class="q-lh">{esc(TT['result_h'])}</p>
    <p class="q-level" data-qlevel></p>
    <p class="q-score" data-qscore></p>
    <p class="q-ld" data-qld></p>
    <p class="q-like" data-qlike></p>
    <canvas class="q-card" data-qcard width="1080" height="1350" aria-hidden="true"></canvas>
    <div class="pfoot"><button type="button" class="btn" data-qa="share">{esc(TT['share'])}</button><button type="button" class="btn ghost" data-qa="save">{esc(TT['save'])}</button><button type="button" class="btn ghost" data-qa="again">{esc(TT['again'])}</button></div>
    <p class="q-note" data-qnote role="status"></p>
    <h3>{esc(TT['miss_h'])}</h3>
    <ul class="q-miss" data-qmiss></ul>
  </div>
</div>
</div></div></section>
<section class="sec"><div class="wrap prose">
  <h2>{esc(TT['how_h'])}</h2>
  <ol>{how}</ol>
  <p class="row-b"><a class="btn ghost" href="{p}map/">{u['nav']['map']}</a><a class="btn ghost" href="{p}openings/">{u['nav']['openings']}</a></p>
</div></section>'''
    cfg = {'tt': TT, 'testSrc': '/data/test.json'}
    h = head(lang, titled(lang, P['title']), P['desc'], 'test/', [app_ld(lang, P['h1'] + ' · ' + u['brand'], P['desc'], 'test/')], ads=False)
    return 'test/', page(lang, h, body, 'test/', 'test', cfg)


def doc_page(lang, key):
    html = about(lang, META) if key == 'about' else privacy(lang) if key == 'privacy' else data_doc(lang, META)
    title = re.search(r'<h1>(.*?)</h1>', html).group(1) + suffix(lang)
    desc = {('en', 'about'): 'Opening Trail walks every chess opening from move one, with a reason for every move and numbers from 174.9 million rated Lichess games.',
            ('ko', 'about'): '오프닝 트레일은 체스 오프닝을 1수부터 수마다 이유와 함께, 리체스 레이팅 대국 1억 7,493만 판의 숫자로 보여 줘요.',
            ('en', 'privacy'): 'What Opening Trail keeps on your device, what it loads, visit statistics and advertising.',
            ('ko', 'privacy'): '오프닝 트레일이 이 기기에 남기는 것, 받아 오는 것, 방문 통계와 광고.',
            ('en', 'data'): PAGES['en']['data']['desc'], ('ko', 'data'): PAGES['ko']['data']['desc']}[(lang, key)]
    if key == 'data':
        title = PAGES[lang]['data']['title']
    body = f'<div class="wrap sec prose doc">{html}</div>'
    h = head(lang, title, desc, f'{key}/', ads=False)
    return f'{key}/', page(lang, h, body, f'{key}/', None, scripts=False)


def not_found():
    e, k = TX['en'], TX['ko']
    body = f'''<div class="wrap sec nf">
  <div class="nf-b">{board_html('8/8/8/3k4/8/8/8/3K4 w - - 0 1')}</div>
  <h1>{e['nf_title']} · <span lang="ko">{k['nf_title']}</span></h1>
  <p><a class="btn" href="/map/">{e['nf_home']}</a> <a class="btn ghost" href="/ko/map/" lang="ko">{k['nf_home']}</a></p>
</div>'''
    h = head('en', 'Page not found | Opening Trail', 'This page does not exist.', '', noindex=True, ads=False)
    cfg = {'lang': 'en', 't': UI['en']['js'], 'mapUrl': '/map/',
           'find': {'none': UI['en']['search_none'], 'page': UI['en']['search_page'], 'line': UI['en']['search_line'], 'src': '/data/find.json'}}
    return (f'{h}\n<body>\n{header("en", "")}\n<main id="main">\n{body}\n</main>\n{footer("en")}\n{cfg_script(cfg)}\n'
            '<script src="/assets/app.js"></script>\n</body>\n</html>\n')


def sitemap(paths):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for path in paths:
        rel = path[4:] if path.startswith('/ko/') else path[1:]
        alts = ''.join(f'<xhtml:link rel="alternate" hreflang="{l}" href="{url(l, rel)}"/>' for l in LANGS)
        out.append(f'  <url><loc>{SITE}{path}</loc><lastmod>{lastmod(path)}</lastmod>{alts}</url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


def find_index(names):
    """머리 찾기 칸 목록: 페이지(해설·첫 수별) + 이름표(지도 주소). [종류, 영어, 한국어, ECO, 주소 꼬리, slug]"""
    out = []
    for o in OPENINGS:
        out.append(['p', o['en']['name'], o['ko']['name'], '', o['slug'], ' '.join(RS.ALIASES.get(o['slug'], {}).get('en', []) + RS.ALIASES.get(o['slug'], {}).get('ko', []))])
    for k, m in FIRST_MOVES:
        out.append(['f', f'1.{m}', f'1.{m}', '', k, ''])
    seen = set()
    for x in sorted(names, key=lambda x: len(x['san'])):
        if x['en'] in seen:
            continue
        seen.add(x['en'])
        n = N.get(x['epd'])
        ko = n[2] if n else x['en']
        out.append(['n', x['en'], ko, x['eco'], hash_of(x['san']), ''])
    return out


# ---------------------------------------------------------------- 가이드 글(루멘랩 홈이 읽는 원본)
def want(ok, msg):
    if not ok:
        sys.exit('글과 데이터가 어긋남: ' + msg)


def article_data():
    first = []
    per = [stats(START_EPD, b) for b in range(4)]
    for m in stats(START_EPD, -1)['moves'][:6]:
        first.append((m['san'], [next((x['share'] for x in s['moves'] if x['san'] == m['san']), 0) for s in per]))
    fs = dict(first)
    rows = []
    for o in OPENINGS:
        if o['hub']:
            continue
        e = o['_r']['epd'][-1]
        rb = [reached(e, b) for b in range(4)]
        rows.append({'slug': o['slug'], 'name': {l: o[l]['name'] for l in LANGS}, 'n': reached(e)['n'],
                     'nb': [r['n'] for r in rb], 'share': [rb[b]['n'] / START_N[b] for b in range(4)],
                     'score': [(r['w'] + r['d'] / 2) / r['n'] if r['n'] else 0 for r in rb]})
    rows.sort(key=lambda r: -r['n'])
    by = {r['slug']: r for r in rows}
    ratio = lambda r: r['share'][3] / r['share'][0] if r['share'][0] else 99
    rise = sorted(rows, key=lambda r: -ratio(r))[:5]
    fall = sorted(rows, key=ratio)[:5]
    gap = sorted([r for r in rows if min(r['nb'][0], r['nb'][3]) >= 2000], key=lambda r: -abs(r['score'][0] - r['score'][3]))[:6]
    low = sorted(rows, key=lambda r: -(r['nb'][0] + r['nb'][1]))[:5]
    sb = [reached(START_EPD, b) for b in range(4)]
    draws = [s['d'] / s['n'] for s in sb]
    want(fs['e4'][0] > fs['e4'][3] and fs['d4'][0] < fs['d4'][3], '1.e4 줄고 1.d4 는다')
    want(fs['Nf3'][3] > fs['Nf3'][0] * 1.8 and fs['c4'][3] > fs['c4'][0] * 1.8, '1.Nf3·1.c4가 2000+에서 크게 는다')
    want(by['sicilian-defense']['share'][3] > by['sicilian-defense']['share'][0] * 2, '시실리안이 는다')
    want(all(by[k]['share'][0] < 0.001 for k in ('sicilian-najdorf', 'kings-indian-defense', 'nimzo-indian-defense')), '깊은 갈래는 1200 미만에서 거의 없다')
    want(fall[0]['slug'] in ('bishops-opening', 'wayward-queen-attack'), '가장 줄어드는 것 = 일찍 비숍이나 퀸을 꺼내는 오프닝(글의 "일찍 비숍이나 퀸" 문장)')
    want(all(ratio(r) > 1.5 for r in rise) and all(ratio(r) < 0.67 for r in fall), '오르내림 목록')
    want(all(draws[i] < draws[i + 1] for i in range(3)) or (draws[0] < draws[3] and draws[2] < draws[3]), '무승부가 는다')
    return {'games': META['games'], 'bands': BANDS, 'band_n': START_N[:4], 'first': first, 'e4': fs['e4'], 'd4': fs['d4'],
            'rows': rows, 'by': by, 'rise': rise, 'fall': fall, 'score_gap': gap, 'top_low': low, 'draws': draws, 'pct': pct}


def count_ko_full(n):
    return f'{n // 100000000}억 {math.floor(n % 100000000 / 10000 + 0.5):,}만' if n >= 100000000 else f'{math.floor(n / 10000 + 0.5):,}만'


def guide_link_home(lang):
    return ('https://lumenlab.page/guides/chess/' if lang == 'ko' else 'https://lumenlab.page/en/guides/chess/') + ART.SLUG + '/'


def article_page(lang, D):
    m, p = ART.META[lang], prefix(lang)
    path = f'guide/{ART.SLUG}/'
    day = lastmod(p + path)
    d = dict(D, prefix=p, count=lambda n: count_ko_full(n) if lang == 'ko' else f'{n:,}',
             pct=lambda x, k=0: esc(tofixed(x * 100, k if x * 100 >= 0.995 or x == 0 else max(k, 2)) + '%'))
    ld = {'@context': 'https://schema.org', '@type': 'Article', 'headline': m['h1'], 'description': m['desc'], 'inLanguage': lang,
          'datePublished': ART.PUBLISHED, 'dateModified': day, 'mainEntityOfPage': url(lang, path),
          'image': f'{SITE}/{"og-ko.png" if lang == "ko" else "og.png"}', 'author': org(), 'publisher': org()}
    body = f'''<article class="art wrap prose">
  <p class="crumb"><a href="{p}guide/">{ART.INDEX[lang]['h1']}</a></p>
  <h1>{esc(m['h1'])}</h1>
  <p class="meta"><time datetime="{day}">{day}</time> · {TX[lang]['by']}</p>
  {ART.body(lang, d)}
</article>'''
    return path, page(lang, head(lang, m['title'], m['desc'], path, [ld], og_type='article'), body, path, None, scripts=False)


def guide_index(lang):
    c, p, m = ART.INDEX[lang], prefix(lang), ART.META[lang]
    body = f'<div class="wrap sec prose"><h1>{c["h1"]}</h1><p>{c["lead"]}</p><ul><li><a href="{p}guide/{ART.SLUG}/">{esc(m["h1"])}</a><p>{esc(m["desc"])}</p></li></ul></div>'
    return 'guide/', page(lang, head(lang, c['title'], c['desc'], 'guide/', ads=False), body, 'guide/', None, scripts=False)


def build():
    tops = check_lines()
    EPD_AFTER.update(tops)
    names = name_lines()
    book = book_moves()
    classify_all(book)
    check_marks()
    write_slugs()
    write_reasons()
    changed = DATA.save()
    pawn_index = {}
    for o in OPENINGS:
        if not o['hub']:
            pawn_index.setdefault(pawns(o['_r']['epd'][-1]), []).append(o)
    BR = best_rows()
    AD = article_data()
    want(round(META['games'] / 1e6) == ART.GAMES_M, f'가이드 제목의 판 수({ART.GAMES_M}M)가 데이터와 맞다')
    _txt = json.dumps([PAGES, UI], ensure_ascii=False)
    want(f"{round(META['positions'], -3):,} positions" in _txt and f"판 {round(META['positions'] / 1e4)}만 개" in _txt, '지도 설명의 판 수가 데이터와 맞다')
    want(f"{META['games'] / 1e6:.1f} million" in _txt and f"{round(META['games'] / 1e6)} Million" in _txt and count_ko_full(META['games']) in _txt, '화면 글의 대국 수가 데이터와 맞다')
    out, paths = {}, []

    def add(lang, rel, text, index=True):
        full = prefix(lang) + rel
        out[full.lstrip('/') + 'index.html'] = text
        if index:
            paths.append(full)

    for lang in LANGS:
        add(lang, *home_page(lang))
        add(lang, *map_page(lang))
        add(lang, *list_page(lang))
        for k, m in FIRST_MOVES:
            add(lang, *first_move_page(lang, k, m))
        add(lang, *other_first_page(lang))
        add(lang, *best_page(lang, BR))
        for o in OPENINGS:
            add(lang, *opening_page(lang, o, pawn_index))
        add(lang, *practice_page(lang))
        add(lang, *test_page(lang))
        for key in ('data', 'about', 'privacy'):
            add(lang, *doc_page(lang, key))
        # 가이드 글: 루멘랩 홈이 읽는 원본. sitemap에 넣지 않고 배포하지 않는다(.assetsignore guide/, _redirects)
        add(lang, *guide_index(lang), index=False)
        add(lang, *article_page(lang, AD), index=False)
    for o in OPENINGS:
        out[f'data/openings/{o["slug"]}.json'] = json.dumps(opening_json(o), ensure_ascii=False, indent=1) + '\n'
    out['data/test.json'] = json.dumps(test_pool(), ensure_ascii=False, separators=(',', ':')) + '\n'
    out['data/find.json'] = json.dumps(find_index(names), ensure_ascii=False, separators=(',', ':')) + '\n'
    out['404.html'] = not_found()
    out['sitemap.xml'] = sitemap(paths)
    if MISSING_WHY:
        print(f'이유가 빠진 메인라인 수 {len(MISSING_WHY)}개 (예: {MISSING_WHY[:3]})')
    print(f'조각 {changed}개 다시 씀')
    return out, paths


def main():
    out, paths = build()
    check = '--check' in sys.argv
    stale = []
    for rel, text in out.items():
        f = ROOT / rel
        old = f.read_text(encoding='utf-8') if f.exists() else None
        if old != text:
            stale.append(rel)
            if not check:
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_text(text, encoding='utf-8')
    if check:
        if stale:
            print('낡은 파일(빌드를 다시 돌려야 함):', ', '.join(stale[:20]))
            sys.exit(1)
        print(f'빌드 결과가 최신이에요({len(out)}개 파일)')
    else:
        print(f'built {len(out)} files ({len(paths)} pages in sitemap), {len(stale)} changed')


if __name__ == '__main__':
    main()
