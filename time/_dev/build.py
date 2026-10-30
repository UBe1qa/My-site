#!/usr/bin/env python3
"""한바퀴(Oneturn) 모든 HTML·sitemap.xml·404.html을 만든다: python3 time/_dev/build.py  (--check 는 낡았는지만 본다)
화면 글 = _dev/content.py(UI·PAGES), 가이드 글 = _dev/articles.py, 확인된 사실 = _dev/facts.json. 만든 파일은 손으로 고치지 않는다.
가이드 목록·글(guide/)은 2026-10-29부터 루멘랩 홈(lumenlab.page/guides/time/<주소>/)이 읽어 싣는 원본이다. 여기서는 만들기만 하고 sitemap에 넣지 않으며 배포하지 않는다(.assetsignore).
옛 주소는 _redirects 가 홈으로 보내고, 한국어 가이드 RSS도 홈이 낸다."""
import json
import math
import re
import sys
from html import escape as esc
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
sys.path.insert(0, str(DEV))
from content import UI, PAGES, NAV, FAQ, FACTS  # noqa: E402
from articles import ARTICLES  # noqa: E402

SITE = 'https://time.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
FIRST = '2026-10-14'          # 처음 올린 날
UPDATED = {                   # 본문·구조화 데이터·링크가 바뀐 페이지: {'/ko/stopwatch/': '2026-10-20'}
    # 2026-10-29 쿠바(IANA tz 2026f)
    '/world-clock/': '2026-10-29', '/ko/world-clock/': '2026-10-29', '/about/': '2026-10-29', '/ko/about/': '2026-10-29',
    '/guide/daylight-saving-time-2026/': '2026-10-29', '/ko/guide/korea-time-difference/': '2026-10-29',
}
F = json.loads((DEV / 'facts.json').read_text(encoding='utf-8'))

TOOLS = ['timer', 'stopwatch', 'alarm', 'world']
TOOL_PATH = {'timer': '', 'stopwatch': 'stopwatch/', 'alarm': 'alarm/', 'world': 'world-clock/'}
PAIRS = {'': '', 'stopwatch/': 'stopwatch/', 'alarm/': 'alarm/', 'world-clock/': 'world-clock/', 'guide/': 'guide/', 'about/': 'about/', 'privacy/': 'privacy/'}

# 첫 그림 전에 정하는 것: 화면 색(설정 > 기기), 움직임(동작 줄이기·이펙트 끔이면 끔), 언어 안내 띠
BOOT = ("<script>(function(h){var s={};try{s=JSON.parse(localStorage.getItem('ot.set')||'{}')||{}}catch(e){}"
        "var t=s.theme;if(t!=='light'&&t!=='dark')t=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';h.setAttribute('data-theme',t);"
        "if(s.fx!=='off'&&!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))h.classList.add('anim');if(s.fx==='low')h.classList.add('fx-low');"
        "try{var n=(navigator.language||'').slice(0,2).toLowerCase();if(!localStorage.getItem('ot.lang')&&(h.lang==='ko'?n!=='ko':n==='ko'))h.classList.add('lb')}catch(e){}"
        "})(document.documentElement)</script>")

LOGO = ('<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle class="lg-b" cx="13" cy="13" r="13"/><circle class="lg-f" cx="13" cy="13" r="10.5"/>'
        '<path class="lg-w" d="M13 13V4.5A8.5 8.5 0 0 1 21.1 15.6Z"/><path class="lg-h" d="M13 13V4.5"/></svg>')
LOCK = ('<svg width="15" height="15" viewBox="0 0 14 14" aria-hidden="true"><rect x="2.5" y="6" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>'
        '<path d="M4.5 6V4.3a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>')
ICON = {
    'full': '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8V3h5M12 3h5v5M17 12v5h-5M8 17H3v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'play': '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3.5v11l9-5.5z" fill="currentColor"/></svg>',
    'pause': '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3.5h3v11H5zM10 3.5h3v11h-3z" fill="currentColor"/></svg>',
    'x': '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    'plus': '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
}
TOOL_ICON = {  # 도구 카드의 작은 그림(같은 선·같은 시계판)
    'timer': '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="var(--bezel)"/><circle cx="20" cy="20" r="15.5" fill="var(--face)"/><path d="M20 20V8a12 12 0 0 1 10.4 18z" fill="var(--band)"/></svg>',
    'stopwatch': '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="var(--bezel)"/><circle cx="20" cy="20" r="15.5" fill="var(--face)"/><path d="M20 20l7-9" stroke="var(--main-d)" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="20" r="2.4" fill="var(--main-d)"/></svg>',
    'alarm': '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="var(--bezel)"/><circle cx="20" cy="20" r="15.5" fill="var(--face)"/><path d="M20 20V11M20 20l6 4" stroke="var(--ink)" stroke-width="2.6" stroke-linecap="round"/><circle cx="31" cy="11" r="3" fill="var(--band)"/></svg>',
    'world': '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="var(--bezel)"/><circle cx="20" cy="20" r="15.5" fill="var(--face)"/><circle cx="20" cy="20" r="11" fill="none" stroke="var(--night)" stroke-width="5"/><path d="M20 9a11 11 0 0 1 9.5 16.5" fill="none" stroke="var(--main-soft)" stroke-width="5"/><path d="M20 20l5-7" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round"/></svg>',
}

# ---------- 시계판(SVG) — app.js의 face()와 같은 기하. 첫 HTML에 미리 그려 화면 밀림을 막는다 ----------
C = 200
FACE = {1: ('s', 5, 60), 5: ('m', 1, 60), 10: ('m', 1, 60), 15: ('m', 5, 60), 20: ('m', 2, 60), 30: ('m', 5, 60), 60: ('m', 5, 60),
        120: ('m', 15, 24), 180: ('m', 30, 36), 240: ('h', 1, 24), 360: ('h', 1, 24), 480: ('h', 1, 24), 720: ('h', 1, 24), 1440: ('h', 2, 24)}


def pt(r, frac):
    a = frac * 2 * math.pi
    return C + r * math.sin(a), C - r * math.cos(a)


def f1(x):
    return f'{x:.1f}'.rstrip('0').rstrip('.')


def donut(frac, ro=126, ri=100):
    """12시에서 시계 방향으로 frac(0~1)만큼의 고리 조각 path."""
    if frac <= 0:
        return ''
    if frac >= 0.9999:
        return (f'M{C} {C - ro}A{ro} {ro} 0 1 1 {C - 0.01} {C - ro}Z M{C} {C - ri}A{ri} {ri} 0 1 0 {C + 0.01} {C - ri}Z')
    large = 1 if frac > 0.5 else 0
    x1, y1 = pt(ro, frac)
    x2, y2 = pt(ri, frac)
    return f'M{C} {C - ro}A{ro} {ro} 0 {large} 1 {f1(x1)} {f1(y1)}L{f1(x2)} {f1(y2)}A{ri} {ri} 0 {large} 0 {C} {C - ri}Z'


def face_svg(scale, lang, kind='timer'):
    unit, step, ticks = FACE[scale]
    n = 60 if unit == 's' else scale if unit == 'm' else scale // 60
    out = []
    for i in range(ticks):
        fr = i / ticks
        major = any(abs(fr - v / n) < 1e-9 for v in frange(0, n, step))
        x1, y1 = pt(178, fr)
        x2, y2 = pt(164 if major else 171, fr)
        out.append(f'<line class="tk{" mj" if major else ""}" x1="{f1(x1)}" y1="{f1(y1)}" x2="{f1(x2)}" y2="{f1(y2)}"/>')
    for v in frange(0, n, step):
        x, y = pt(145, v / n)
        lab = (12 if v == 0 else int(v)) if kind == 'clock' else int(v) if float(v).is_integer() else v
        out.append(f'<text class="lb" x="{f1(x)}" y="{f1(y)}">{lab}</text>')
    if kind != 'clock':
        out.append(f'<text class="unit" x="{C + 14}" y="{C - 145}">{UI[lang]["unit_" + unit]}</text>')
    return ''.join(out)


def frange(a, b, s):
    v = a
    while v < b - 1e-9:
        yield v
        v += s


def dial_svg(lang, kind, frac=0.0, scale=60):
    """kind: timer | watch | clock(알람). frac = 첫 화면의 부채꼴(타이머 5분 = 5/60)."""
    face_kind = 'clock' if kind == 'clock' else 'timer'
    sc = 60 if kind != 'clock' else 60
    top = (f'<circle class="bez" cx="{C}" cy="{C}" r="198"/><circle class="bez2" cx="{C}" cy="{C}" r="191"/><circle class="face" cx="{C}" cy="{C}" r="186"/>'
           f'<g class="ticks">{face_svg(scale if kind == "timer" else 1, lang, face_kind) if kind != "clock" else clock_face()}</g>')
    if kind == 'timer':
        x, y = pt(113, frac)
        ex1, ey1 = pt(98, frac)
        ex2, ey2 = pt(128, frac)
        body = (f'<path class="track" d="{donut(1)}" fill-rule="evenodd"/><path class="wedge" d="{donut(frac)}"/>'
                f'<line class="edge" x1="{f1(ex1)}" y1="{f1(ey1)}" x2="{f1(ex2)}" y2="{f1(ey2)}"/>'
                f'<circle class="hub" cx="{C}" cy="{C}" r="96"/>'
                f'<g class="knob-g"><circle class="knob" cx="{f1(x)}" cy="{f1(y)}" r="13"/></g>'
                f'<circle class="ringo" cx="{C}" cy="{C}" r="192"/>')
    elif kind == 'watch':
        body = (f'<path class="track" d="{donut(1, 126, 100)}" fill-rule="evenodd"/><path class="wedge" d=""/>'
                f'<g class="laps-g"></g><circle class="hub" cx="{C}" cy="{C}" r="96"/>'
                f'<line class="hand" x1="{C}" y1="{C - 98}" x2="{C}" y2="{C - 130}"/><circle class="ringo" cx="{C}" cy="{C}" r="192"/>')
    else:
        body = ('<path class="wedge" d=""/><g class="amarks"></g>'
                f'<line class="hand-h" x1="{C}" y1="{C + 14}" x2="{C}" y2="{C - 92}"/><line class="hand-m" x1="{C}" y1="{C + 18}" x2="{C}" y2="{C - 140}"/>'
                f'<line class="hand-s" x1="{C}" y1="{C + 26}" x2="{C}" y2="{C - 160}"/><circle class="c" cx="{C}" cy="{C}" r="7" fill="var(--tick)"/>'
                f'<circle class="ringo" cx="{C}" cy="{C}" r="192"/>')
    return f'<svg class="dial" viewBox="0 0 400 400" aria-hidden="true" focusable="false">{top}{body}</svg>'


def clock_face():
    out = []
    for i in range(60):
        fr = i / 60
        major = i % 5 == 0
        x1, y1 = pt(178, fr)
        x2, y2 = pt(164 if major else 171, fr)
        out.append(f'<line class="tk{" mj" if major else ""}" x1="{f1(x1)}" y1="{f1(y1)}" x2="{f1(x2)}" y2="{f1(y2)}"/>')
    for h in range(12):
        x, y = pt(145, h / 12)
        out.append(f'<text class="lb" x="{f1(x)}" y="{f1(y)}">{12 if h == 0 else h}</text>')
    return ''.join(out)


# ---------- 세계 시간: 도시 이름(tz.js에서), 낡은 시간대 자료 알림(첫 그림 전에) ----------
STALE_CITIES = ['vancouver', 'calgary', 'winnipeg', 'casablanca', 'havana']
# 2027-01-15 12:00 UTC의 현지 시: 새 자료(2026b~f)면 밴쿠버 5시(UTC-7)·캘거리 6시·위니펙 7시·카사블랑카 12시·아바나 8시(UTC-4, 예전 자료는 7시)
STALE_BOOT = ("<script>(function(){try{var t=Date.UTC(2027,0,15,12),z={'America/Vancouver':5,'America/Edmonton':6,'America/Winnipeg':7,'Africa/Casablanca':12,'America/Havana':8},k;"
              "for(k in z){var h=+new Intl.DateTimeFormat('en-US',{timeZone:k,hour:'numeric',hourCycle:'h23'}).format(t);if(h!==z[k]){document.getElementById('stale').hidden=false;break}}}catch(e){}})()</script>")


def city_names(lang):
    import re
    src = (ROOT / 'assets/tz.js').read_text(encoding='utf-8')
    nations = {k: (en, ko) for k, en, ko in re.findall(r"(\w+): \['([^']+)', '([^']+)'\]", src)}
    out = {}
    for cid, zone, en, ko, nat in re.findall(r"\['([a-z]+)', '([A-Za-z_/]+)', '([^']+)', '([^']+)', '(\w+)'", src):
        out[cid] = (ko if lang == 'ko' else en, nations[nat][1 if lang == 'ko' else 0])
    return out


# ---------- 공통 조각 ----------
def prefix(lang):
    return '/ko/' if lang == 'ko' else '/'


def url(lang, path=''):
    return SITE + prefix(lang) + path


def lastmod(full):
    return UPDATED.get(full, FIRST)


def alt_of(lang, path):
    if path in PAIRS:
        return PAIRS[path]
    for a in ARTICLES[lang]:
        if path == f'guide/{a["slug"]}/' and a.get('pair'):
            return f'guide/{a["pair"]}/'
    return None


def head(lang, title, desc, path, jsonld=(), og_type='website', noindex=False, ads=True, langbar=True):
    assert len(title) <= (65 if lang == 'en' else 60), ('제목이 길다', title)
    assert len(desc) <= 160, ('설명이 길다', desc)
    canon = url(lang, path)
    alt = alt_of(lang, path)
    links = [] if noindex else [f'<link rel="canonical" href="{canon}">']
    if alt is not None and not noindex:
        en_u = url('en', path if lang == 'en' else alt)
        ko_u = url('ko', path if lang == 'ko' else alt)
        links += [f'<link rel="alternate" hreflang="en" href="{en_u}">', f'<link rel="alternate" hreflang="ko" href="{ko_u}">',
                  f'<link rel="alternate" hreflang="x-default" href="{en_u}">']
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>\n' for j in jsonld)
    ad = (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADS_CLIENT}" crossorigin="anonymous"></script>\n'
          '<script src="/assets/ads-config.js"></script>\n') if ads else ''
    og = 'og-ko.png' if lang == 'ko' else 'og.png'
    boot = BOOT if langbar else BOOT.replace("try{var n=(navigator.language||'').slice(0,2).toLowerCase();if(!localStorage.getItem('ot.lang')&&(h.lang==='ko'?n!=='ko':n==='ko'))h.classList.add('lb')}catch(e){}", '')
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{'<meta name="robots" content="noindex">' + chr(10) if noindex else ''}<meta name="theme-color" content="#fbf9f4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#171a1d" media="(prefers-color-scheme: dark)">
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
<link rel="stylesheet" href="/assets/style.css">
{boot}
{ld}{ad}</head>'''


def header(lang, path, current=None):
    u = UI[lang]
    p = prefix(lang)
    other = 'en' if lang == 'ko' else 'ko'
    alt = alt_of(lang, path)
    other_href = prefix(other) + (alt if alt is not None else '')
    nav = ''.join(f'<a href="{p}{TOOL_PATH[k]}"{" aria-current=" + chr(34) + "page" + chr(34) if k == current else ""}>{esc(NAV[lang][k])}</a>' for k in TOOLS)
    gcur = ' aria-current="page"' if current == 'guide' else ''
    return f'''<a class="skip" href="#main">{u['skip']}</a>
<header class="top"><div class="top-in wrap">
  <a class="brand" href="{p}">{LOGO}{u['brand']}</a>
  <nav class="nav" aria-label="{u['nav_label']}">{nav}</nav>
  <span class="sp"></span>
  <div class="aux"><a href="{p}guide/"{gcur}>{u['guides']}</a><a href="{other_href}" lang="{other}" hreflang="{other}">{u['lang_other']}</a></div>
</div></header>'''


def lumen_svg():
    ticks = ''.join(f'<line class="lt" style="--i:{i}" x1="{f1(30 + 22 * math.sin(i * 2 * math.pi / 5))}" y1="{f1(30 - 22 * math.cos(i * 2 * math.pi / 5))}" '
                    f'x2="{f1(30 + 17 * math.sin(i * 2 * math.pi / 5))}" y2="{f1(30 - 17 * math.cos(i * 2 * math.pi / 5))}"/>' for i in range(5))
    return (f'<svg width="52" height="52" viewBox="0 0 60 60" aria-hidden="true"><circle class="lf" cx="30" cy="30" r="27"/>{ticks}'
            '<line class="lhand" x1="30" y1="30" x2="30" y2="13"/><circle class="lhub" cx="30" cy="30" r="3.4"/></svg>')


def footer(lang):
    u = UI[lang]
    p = prefix(lang)
    home = 'https://lumenlab.page/' + ('en/' if lang == 'en' else '')
    tools = ''.join(f'<a href="{p}{TOOL_PATH[k]}">{esc(NAV[lang][k])}</a>' for k in TOOLS)
    return f'''<footer class="foot"><div class="wrap">
  <a class="lumen" href="{home}">{lumen_svg()}<span class="lumen-t"><b>{u['lumen_b']}</b><small>{u['lumen_s']}</small></span><span class="lumen-go" aria-hidden="true">→</span></a>
  <p class="foot-links">{tools}<a href="{p}guide/">{u['guides']}</a><a href="{p}about/">{u['about']}</a><a href="{p}privacy/">{u['privacy']}</a><a href="mailto:contact@lumenlab.page">{u['contact']}</a></p>
  <small>© 2026 Lumen Lab</small>
</div></footer>'''


def ad_slot(lang, name, narrow=False):
    cls = 'ad-wrap wrap' + (' narrow' if narrow else '')
    return f'<div class="{cls}" data-slot="{name}"><p class="ad-label">{UI[lang]["ad"]}</p><div class="ad-slot" data-ad="{name}" hidden></div></div>'


def cfg_script(cfg):
    return '<script type="application/json" id="otc">' + json.dumps(cfg, ensure_ascii=False).replace('</', '<\\/') + '</script>'


def page(lang, head_html, body, path, current=None, cfg=None, scripts=('core', 'app'), page_id=''):
    other = 'en' if lang == 'ko' else 'ko'
    alt = alt_of(lang, path)
    base = {'lang': lang, 'page': page_id, 't': UI[lang]['js'], 'other': prefix(other) + (alt if alt is not None else ''), 'otherLabel': UI[lang]['lang_offer']}
    base.update(cfg or {})
    js = ''.join(f'<script src="/assets/{s}.js"></script>\n' for s in scripts)
    return f'''{head_html}
<body data-page="{page_id}">
{header(lang, path, current)}
<main id="main">
{body}
</main>
{footer(lang)}
{cfg_script(base)}
{js}</body>
</html>
'''


def faq_html(lang, faq):
    return (f'<section class="sec faq wrap narrow" id="faq"><h2>{UI[lang]["faq"]}</h2>'
            + ''.join(f'<details><summary>{esc(q)}</summary><p>{a}</p></details>' for q, a in faq) + '</section>')


def strip(s):
    import re
    return re.sub(r'<[^>]+>', '', s)


def faq_ld(faq):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': strip(a)}} for q, a in faq]}


def app_ld(lang, name, desc, path):
    return {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': name, 'url': url(lang, path),
            'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any', 'browserRequirements': 'Requires a modern web browser',
            'inLanguage': lang, 'isAccessibleForFree': True, 'description': desc,
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'KRW' if lang == 'ko' else 'USD'},
            'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}}


def facts_html(lang, key):
    items = ''.join(f'<div class="fact"><h3>{esc(h)}</h3>{"".join("<p>" + p + "</p>" for p in ps)}</div>' for h, ps in FACTS[lang][key]['items'])
    return f'<section class="sec wrap"><h2>{esc(FACTS[lang][key]["h2"])}</h2><div class="facts">{items}</div></section>'


def guides_block(lang, skip=None, limit=3):
    p = prefix(lang)
    arts = [a for a in ARTICLES[lang] if a['slug'] != skip][:limit]
    if not arts:
        return ''
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/"><b>{esc(a["h1"])}</b><span>{esc(a["desc"])}</span></a></li>' for a in arts)
    return f'<section class="sec wrap"><h2>{UI[lang]["guides_h"]}</h2><ul class="cards">{items}</ul></section>'


def tools_block(lang, current):
    p = prefix(lang)
    items = ''.join(f'<li><a href="{p}{TOOL_PATH[k]}">{TOOL_ICON[k]}<b>{esc(PAGES[lang][k]["h1"])}</b><span>{esc(PAGES[lang][k]["card"])}</span></a></li>'
                    for k in TOOLS if k != current)
    return f'<section class="sec wrap"><h2>{UI[lang]["tools_h"]}</h2><ul class="cards tools">{items}</ul></section>'


def phead(lang, c):
    return f'<div class="phead wrap"><h1>{esc(c["h1"])}</h1><p class="why">{c["why"]}</p></div>'


def trust(lang):
    return f'<p class="trust">{LOCK}<span>{UI[lang]["trust"]}</span></p>'


def sound_row(lang, extra=''):
    u = UI[lang]
    opts = ''.join(f'<option value="{k}">{esc(v)}</option>' for k, v in u['sounds'])
    return (f'<div class="sound"><label for="snd">{u["sound"]}</label><select class="fld" id="snd">{opts}</select>'
            f'<button type="button" class="btn quiet" id="sndTest">{u["sound_test"]}</button>{extra}</div>')


def more_opts(lang, timer=False, keys='keys'):
    u = UI[lang]
    seg = lambda name, vals: f'<span class="seg" data-set="{name}">' + ''.join(f'<button type="button" data-v="{k}" aria-pressed="false">{esc(v)}</button>' for k, v in vals) + '</span>'
    notify = (f'<label class="tog" id="notifyRow" hidden><input type="checkbox" id="notify"> {u["notify"]} <small>{u["notify_s"]}</small></label>' if timer or True else '')
    return f'''<details class="more"><summary>{u['more']}</summary><div class="opts">
  <label class="tog"><input type="checkbox" id="wake"> {u['wake']} <small id="wakeNote">{u['wake_s']}</small></label>
  {notify}
  <div class="opt"><span class="ol">{u['fx']}</span>{seg('fx', u['fx_v'])}</div>
  <div class="opt"><span class="ol">{u['theme']}</span>{seg('theme', u['theme_v'])}</div>
  <p class="note">{u[keys]}</p>
</div></details>'''


# ---------- 도구 페이지 ----------
def timer_page(lang):
    c, u = PAGES[lang]['timer'], UI[lang]
    path = ''
    presets = ''.join(f'<button type="button" class="btn" data-preset="{m}">{esc(lbl)}</button>' for m, lbl in u['presets'])
    body = f'''{phead(lang, c)}
<div class="wrap" id="tool">
<section class="stage timer" aria-label="{esc(c['h1'])}">
  <div class="dialbox can-drag" id="dialbox" role="slider" tabindex="0" aria-label="{u['dial_label']}" aria-valuemin="0" aria-valuemax="60" aria-valuenow="5" aria-valuetext="{u['dial_now']}">
    {dial_svg(lang, 'timer', 5 / 60, 60)}
    <div class="read"><output class="big num" id="big" aria-live="off">05:00</output><span class="sub" id="sub">{u['drag_hint']}</span></div>
    <div class="dial-tools"><button type="button" class="ibtn" id="fullBtn" aria-label="{u['full']}">{ICON['full']}</button></div>
  </div>
  <div class="acts"><button type="button" class="btn go main" id="go">{ICON['play']}<span>{u['start']}</span></button><button type="button" class="btn" id="reset">{u['reset']}</button><button type="button" class="btn" id="plus1">{u['plus1']}</button><p class="note" id="tapNote" hidden style="width:100%"></p></div>
  <div class="presets"><p class="ctl-h">{u['presets_h']}</p><div class="grid">{presets}</div></div>
  <div class="hms"><p class="ctl-h">{u['hms_h']}</p><div class="row">
    <label>{u['h']}<input class="fld" id="inH" inputmode="numeric" autocomplete="off" maxlength="2" value="0" aria-describedby="hmsNote"></label><span class="colon">:</span>
    <label>{u['m']}<input class="fld" id="inM" inputmode="numeric" autocomplete="off" maxlength="3" value="5" aria-describedby="hmsNote"></label><span class="colon">:</span>
    <label>{u['s']}<input class="fld" id="inS" inputmode="numeric" autocomplete="off" maxlength="3" value="0" aria-describedby="hmsNote"></label>
  </div><p class="note" id="hmsNote" aria-live="polite"></p>
  <div class="namef" style="margin-top:8px"><input class="fld" id="tName" maxlength="24" autocomplete="off" placeholder="{u['name_ph']}" aria-label="{u['name_label']}"></div></div>
  {sound_row(lang)}
  {more_opts(lang, True)}
</section>
<noscript><p class="nojs">{u['nojs']}</p></noscript>
<div class="multi" id="multi">
  <div class="multi-h"><h2>{u['multi_h']}</h2><span class="note">{u['multi_s']}</span><span class="sp"></span><button type="button" class="btn" id="addT">{ICON['plus']}<span>{u['add_timer']}</span></button></div>
  <ul class="tlist" id="tlist"></ul>
</div>
{trust(lang)}
</div>
{ad_slot(lang, 'mid')}
{facts_html(lang, 'timer')}
{faq_html(lang, FAQ[lang]['timer'])}
{guides_block(lang)}
{tools_block(lang, 'timer')}
{ad_slot(lang, 'bottom')}'''
    ld = [app_ld(lang, c['h1'], c['desc'], path), faq_ld(FAQ[lang]['timer'])]
    return path, page(lang, head(lang, c['title'], c['desc'], path, jsonld=ld), body, path, current='timer', page_id='timer')


def watch_page(lang):
    c, u = PAGES[lang]['stopwatch'], UI[lang]
    path = 'stopwatch/'
    body = f'''{phead(lang, c)}
<div class="wrap" id="tool">
<section class="stage watch" aria-label="{esc(c['h1'])}">
  <div class="dialbox" id="dialbox">
    {dial_svg(lang, 'watch')}
    <div class="read"><output class="big num" id="big">00:00.00</output><span class="sub" id="sub">{u['w_idle']}</span></div>
    <div class="dial-tools"><button type="button" class="ibtn" id="fullBtn" aria-label="{u['full']}">{ICON['full']}</button></div>
  </div>
  <div class="acts"><button type="button" class="btn go main" id="go">{ICON['play']}<span>{u['start']}</span></button><button type="button" class="btn" id="lap" disabled>{u['lap']}</button><button type="button" class="btn" id="reset" disabled>{u['reset']}</button></div>
  <div class="laps"><div class="laps-h"><h2>{u['laps_h']}</h2><button type="button" class="btn quiet" id="copyLaps" disabled>{u['copy']}</button><button type="button" class="btn quiet" id="csvLaps" disabled>{u['csv']}</button></div>
    <div class="lapbox"><table class="lapt"><thead><tr><th>{u['lap_n']}</th><th>{u['lap_t']}</th><th>{u['lap_total']}</th></tr></thead><tbody id="lapBody"></tbody></table>
    <p class="empty" id="lapEmpty">{u['laps_empty']}</p></div><p class="note" id="lapNote" aria-live="polite"></p></div>
  {more_opts(lang, keys='keys_watch')}
</section>
<noscript><p class="nojs">{u['nojs']}</p></noscript>
{trust(lang)}
</div>
{ad_slot(lang, 'mid')}
{facts_html(lang, 'stopwatch')}
{faq_html(lang, FAQ[lang]['stopwatch'])}
{guides_block(lang)}
{tools_block(lang, 'stopwatch')}
{ad_slot(lang, 'bottom')}'''
    ld = [app_ld(lang, c['h1'], c['desc'], path), faq_ld(FAQ[lang]['stopwatch'])]
    return path, page(lang, head(lang, c['title'], c['desc'], path, jsonld=ld), body, path, current='stopwatch', page_id='stopwatch')


def alarm_page(lang):
    c, u = PAGES[lang]['alarm'], UI[lang]
    path = 'alarm/'
    quick = ''.join(f'<button type="button" class="btn" data-quick="{m}">{esc(l)}</button>' for m, l in u['a_quick'])
    body = f'''{phead(lang, c)}
<div class="wrap" id="tool">
<section class="stage alarm" aria-label="{esc(c['h1'])}">
  <div class="dialbox clockbox" id="dialbox">
    {dial_svg(lang, 'clock')}
    <div class="read clock"><output class="big num" id="big">--:--</output><span class="sub" id="sub">&nbsp;</span></div>
    <div class="dial-tools"><button type="button" class="ibtn" id="fullBtn" aria-label="{u['full']}">{ICON['full']}</button></div>
  </div>
  <div class="setr"><p class="ctl-h">{u['a_set_h']}</p>
    <div class="row"><label>{u['a_time']}<input class="fld" type="time" id="aTime" value="07:00" required></label>
    <label style="flex:1 1 160px">{u['a_name']}<input class="fld" id="aName" maxlength="24" autocomplete="off" placeholder="{u['a_name_ph']}"></label></div>
    <div class="quick"><span class="note" style="align-self:center">{u['a_quick_h']}</span>{quick}</div>
    <div class="acts" style="margin-top:12px"><button type="button" class="btn go main" id="aAdd">{u['a_add']}</button></div>
    <p class="note" id="aNote" aria-live="polite"></p>
    {sound_row(lang)}
  </div>
  <div class="alist"><p class="ctl-h">{u['a_list_h']}</p><ul id="aList"></ul><p class="note" id="aEmpty">{u['a_empty']}</p></div>
  {more_opts(lang, True, 'keys_alarm')}
</section>
<noscript><p class="nojs">{u['nojs']}</p></noscript>
{trust(lang)}
</div>
{ad_slot(lang, 'mid')}
{facts_html(lang, 'alarm')}
{faq_html(lang, FAQ[lang]['alarm'])}
{guides_block(lang)}
{tools_block(lang, 'alarm')}
{ad_slot(lang, 'bottom')}'''
    ld = [app_ld(lang, c['h1'], c['desc'], path), faq_ld(FAQ[lang]['alarm'])]
    return path, page(lang, head(lang, c['title'], c['desc'], path, jsonld=ld), body, path, current='alarm', page_id='alarm')


def world_page(lang):
    c, u = PAGES[lang]['world'], UI[lang]
    path = 'world-clock/'
    defaults = u['w_defaults']
    cities = city_names(lang)
    rows = ''.join(f'<li class="city" data-id="{cid}"><svg class="d24" viewBox="0 0 64 64" aria-hidden="true"></svg><p class="cn">{esc(cities[cid][0])}<small>{esc(cities[cid][1])}</small></p>'
                   f'<p class="ct num">--:--</p><p class="cd">&nbsp;</p><p class="dst">&nbsp;</p><button type="button" class="ibtn cx" aria-label="{esc(UI[lang]["js"]["remove"])} · {esc(cities[cid][0])}">{ICON["x"]}</button></li>' for cid in defaults)
    stale_names = ', '.join(dict.fromkeys(cities[c][0] for c in STALE_CITIES))
    body = f'''{phead(lang, c)}
<div class="wrap" id="tool">
<section class="wc-now" aria-label="{u['wc_now']}">
  <p class="clock num" id="nowClock">--:--</p>
  <div class="where"><b id="nowName">&nbsp;</b><span id="nowSub">&nbsp;</span></div>
  <label class="base">{u['wc_base']}<select class="fld" id="baseSel"></select></label>
</section>
<p class="stale" id="stale" hidden>{esc(UI[lang]['js']['stale'].replace('{cities}', stale_names))}</p>{STALE_BOOT}
<ul class="cities" id="cities">{rows}</ul>
<div class="addc"><input class="fld" id="cityIn" list="cityList" autocomplete="off" placeholder="{u['wc_add_ph']}" aria-label="{u['wc_add_label']}"><datalist id="cityList"></datalist>
  <button type="button" class="btn go" id="cityAdd">{ICON['plus']}<span>{u['wc_add']}</span></button><p class="note" id="cityNote" aria-live="polite"></p></div>
<section class="meet" id="meet">
  <div class="meet-h"><h2>{u['m_h']}</h2><label class="note" for="meetDate">{u['m_date']}</label><input class="fld" type="date" id="meetDate"><label class="note" for="meetTime">{u['m_time']}</label><input class="fld" type="time" id="meetTime"></div>
  <p class="allsum" id="allSum">&nbsp;</p>
  <div class="grid24" id="grid24"><table class="g24" id="g24"><tbody></tbody></table></div>
  <p class="legend"><span><i class="la"></i>{u['m_all']}</span><span><i class="lw"></i>{u['m_work']}</span><span><i class="ln"></i>{u['m_night']}</span><span><i class="le"></i>{u['m_weekend']}</span></p>
  <div class="pickline"><p id="pickLine">{u['m_pick']}</p><button type="button" class="btn" id="copyPick" disabled>{u['copy']}</button></div>
</section>
<noscript><p class="nojs">{u['nojs']}</p></noscript>
{trust(lang)}
</div>
{ad_slot(lang, 'mid')}
{facts_html(lang, 'world')}
{faq_html(lang, FAQ[lang]['world'])}
{guides_block(lang)}
{tools_block(lang, 'world')}
{ad_slot(lang, 'bottom')}'''
    ld = [app_ld(lang, c['h1'], c['desc'], path), faq_ld(FAQ[lang]['world'])]
    return path, page(lang, head(lang, c['title'], c['desc'], path, jsonld=ld), body, path, current='world', page_id='world',
                      scripts=('core', 'tz', 'app'), cfg={'defaults': u['w_defaults']})


# ---------- 글·소개·방침 ----------
def guide_index(lang):
    c, p = PAGES[lang]['guide'], prefix(lang)
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/">{esc(a["h1"])}</a><p>{esc(a["desc"])}</p></li>' for a in ARTICLES[lang])
    body = f'<div class="wrap narrow doc"><h1>{esc(c["h1"])}</h1><p>{esc(c["lead"])}</p><ul class="glist">{items}</ul></div>\n{tools_block(lang, None)}'
    return 'guide/', page(lang, head(lang, c['title'], c['desc'], 'guide/', ads=False), body, 'guide/', current='guide', page_id='guide')


def expand(body):
    return body


def article_page(lang, a):
    u, p = UI[lang], prefix(lang)
    path = f'guide/{a["slug"]}/'
    day = lastmod(prefix(lang) + path)
    ld = [{'@context': 'https://schema.org', '@type': 'Article', 'headline': a['h1'], 'description': a['desc'], 'inLanguage': lang,
           'datePublished': a.get('published', FIRST), 'dateModified': day, 'mainEntityOfPage': url(lang, path),
           'image': f'{SITE}/{"og-ko.png" if lang == "ko" else "og.png"}',
           'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'},
           'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}},
          {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
              {'@type': 'ListItem', 'position': 1, 'name': u['guides'], 'item': url(lang, 'guide/')},
              {'@type': 'ListItem', 'position': 2, 'name': a['h1'], 'item': url(lang, path)}]}]
    parts = a['body'].split('<!--ad-->')
    src = ''
    if a.get('sources'):
        src = f'<div class="src"><h2>{u["sources"]}</h2><ul>' + ''.join(f'<li><a href="{esc(s[1])}">{esc(s[0])}</a></li>' for s in a['sources']) + '</ul></div>'
    tr = a.get('try')
    try_html = f'<div class="try"><p>{esc(tr[0])}</p><a class="btn go" href="{p}{tr[1]}">{esc(tr[2])}</a></div>' if tr else ''
    body = f'''<article class="art wrap narrow">
  <p class="crumb"><a href="{p}guide/">{u['crumb']}</a></p>
  <h1>{esc(a['h1'])}</h1>
  <p class="meta">{u['checked']} <time datetime="{day}">{day}</time> · {u['byline']}</p>
  <p class="answer">{a['answer']}</p>
  <div class="prose">{parts[0]}</div>
</article>
{ad_slot(lang, 'mid', narrow=True) if len(parts) > 1 else ''}
<div class="wrap narrow"><div class="prose">{parts[1] if len(parts) > 1 else ''}{try_html}{src}</div></div>
{guides_block(lang, skip=a['slug'])}
{ad_slot(lang, 'bottom', narrow=True)}'''
    return path, page(lang, head(lang, a['title'], a['desc'], path, jsonld=ld, og_type='article'), body, path, current='guide', page_id='article',
                      scripts=('core', 'app'))


def ncity():
    import re
    return len(re.findall(r"\['[a-z]+', '[A-Za-z_/]+', '", (ROOT / 'assets/tz.js').read_text(encoding='utf-8')))


def doc_page(lang, key):
    c = PAGES[lang][key]
    path = key + '/'
    body = f'<div class="wrap narrow doc prose">{c["body"].replace("{NCITY}", str(ncity()))}</div>'
    return path, page(lang, head(lang, c['title'], c['desc'], path, ads=False), body, path, page_id=key)


def not_found():
    body = f'''<div class="wrap narrow nf">
  {dial_svg('en', 'timer', 0.0, 60).replace('class="dial"', 'class="dial" style="width:180px;height:180px;margin:0 auto"')}
  <h1>{UI['en']['nf_title']} · <span lang="ko">{UI['ko']['nf_title']}</span></h1>
  <p><a class="btn go" href="/">{UI['en']['home']}</a> <a class="btn" href="/ko/" lang="ko">{UI['ko']['home']}</a></p>
</div>'''
    h = head('en', 'Page not found | Oneturn', 'This page does not exist.', '', noindex=True, ads=False, langbar=False)
    cfg = {'lang': 'en', 'page': '404', 't': UI['en']['js']}
    return f'{h}\n<body data-page="404">\n{header("en", "")}\n<main id="main">\n{body}\n</main>\n{footer("en")}\n{cfg_script(cfg)}\n<script src="/assets/core.js"></script>\n<script src="/assets/app.js"></script>\n<script>(function(){{if(/^\\/ko(\\/|$)/.test(location.pathname)){{document.documentElement.lang="ko";}}}})()</script>\n</body>\n</html>\n'


def sitemap(paths):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in paths:
        out.append(f'  <url><loc>{SITE}{path}</loc><lastmod>{lastmod(path)}</lastmod></url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


# 2026-10-29 가이드를 루멘랩 홈으로 옮겼다: 모든 HTML의 가이드 링크(<a href>)를 홈 주소로 바꾼다(글의 canonical·hreflang·JSON-LD는 그대로. 홈 빌드가 읽는다)
GUIDE_LINK = re.compile(r'(<a\b[^>]*?\shref=")(?:https://time\.lumenlab\.page)?/(ko/)?guide/([^"#]*)(#[^"]*)?"')


def moved_guides(text):
    """/ko/guide/<주소>/ → https://lumenlab.page/guides/time/<주소>/, /guide/<주소>/ → …/en/guides/time/<주소>/ (#조각은 그대로). 목록은 홈 가이드 모음의 이 사이트 칸(#time)."""
    def rep(m):
        home = 'https://lumenlab.page/' + ('' if m.group(2) else 'en/') + 'guides/'
        slug = m.group(3)
        return m.group(1) + (home + '#time' if slug in ('', 'index.html') else home + 'time/' + slug + (m.group(4) or '')) + '"'
    return GUIDE_LINK.sub(rep, text)


def build():
    out, paths = {}, []

    def add(lang, rel, text, index=True):
        full = prefix(lang) + rel
        out[full.lstrip('/') + 'index.html'] = text
        if index:
            paths.append(full)

    for lang in ('en', 'ko'):
        add(lang, *timer_page(lang))
        add(lang, *watch_page(lang))
        add(lang, *alarm_page(lang))
        add(lang, *world_page(lang))
        # 가이드 목록·글은 홈이 읽는 원본이라 만들기만 한다(sitemap에 넣지 않는다)
        add(lang, *guide_index(lang), index=False)
        for a in ARTICLES[lang]:
            add(lang, *article_page(lang, a), index=False)
        for key in ('about', 'privacy'):
            add(lang, *doc_page(lang, key))
    out['404.html'] = not_found()
    out['sitemap.xml'] = sitemap(paths)
    out = {rel: moved_guides(text) if rel.endswith('.html') else text for rel, text in out.items()}
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
            print('낡은 파일(빌드를 다시 돌려야 함):', ', '.join(stale))
            sys.exit(1)
        print(f'빌드 결과가 최신이에요({len(out)}개 파일)')
    else:
        print(f'built {len(out)} files ({len(paths)} pages in sitemap), {len(stale)} changed')


if __name__ == '__main__':
    main()
