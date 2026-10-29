#!/usr/bin/env python3
"""오래QR / Staycode(qr.lumenlab.page) 페이지 전부 만들기: python3 qr/_dev/build.py   (--check 는 낡았는지만 본다)

- 화면 글 = _dev/content.py, 가이드 글 = _dev/articles.py(다른 에이전트가 쓴다. 없으면 빈 목록), 인쇄 크기 사실 = _dev/facts.md(있으면).
- 만드는 것: 영어 / (x-default)·한국어 /ko/ 의 도구 다섯(만들기·와이파이·명함·대량·스캐너), 가이드 목록·글, 소개, 방침, 404.html, sitemap.xml.
- 가이드 HTML 은 루트 빌드(lumenlab/_dev/build_home.py)가 읽어 lumenlab.page/guides/qr/ 로 내는 원본이다(2026-10-29). 이 사이트에는 올리지 않고
  (.assetsignore) 옛 주소는 _redirects 가 301 로 보낸다. 그래서 sitemap 에 넣지 않고 rss.xml 도 만들지 않는다(한국어 글 RSS 는 루트가 낸다).
- 첫 HTML 에 예시 QR·꾸밈 세트 그림·모양 그림을 미리 그려 넣는다(_dev/render.mjs: 브라우저와 같은 assets/qr-render.js). 화면 밀림 0.
- lastmod 는 본문·구조화 데이터·링크가 실제로 바뀐 날만(UPDATED). 만든 파일은 손으로 고치지 않는다.
"""
import sys
sys.dont_write_bytecode = True
import hashlib
import html
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
sys.path.insert(0, str(DEV))
import content as C  # noqa: E402
try:
    import articles as A  # noqa: E402
    ARTICLES = list(getattr(A, 'ARTICLES', []))
except ImportError:
    ARTICLES = []

SITE = 'https://qr.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
FIRST = '2026-10-14'
UPDATED = {}
TX, UI, M = C.TX, C.UI, C.M
esc = lambda s: html.escape(str(s), quote=True)


def arts(lang):
    return [a for a in ARTICLES if a.get('lang') == lang]


# 가이드 글이 0편인 언어판은 메뉴·꼬리말·sitemap 에서 가이드를 숨기고 /guide/ 페이지도 만들지 않는다(빈 페이지 = 내용 부족, 평가 M3)
def has_guide(lang):
    return bool(arts(lang))


NAV = {lang: [n for n in C.NAV[lang] if n[2] != 'guide' or has_guide(lang)] for lang in C.NAV}


def art_by_slug(lang, slug):
    return next((a for a in arts(lang) if a['slug'] == slug), None)


def asset(name):
    data = (ROOT / 'assets' / name).read_bytes()
    return f'/assets/{name}?v={hashlib.sha256(data).hexdigest()[:8]}'


def prefix(lang):
    return '/ko/' if lang == 'ko' else '/'


def url(lang, path=''):
    return SITE + prefix(lang) + path


def lastmod(full):
    return UPDATED.get(full, FIRST)


TOOL_PATHS = {'make': '', 'wifi': 'wifi/', 'vcard': 'vcard/', 'bulk': 'bulk/', 'scan': 'scan/'}
PAIRED = ['', 'wifi/', 'vcard/', 'bulk/', 'scan/', 'guide/', 'about/', 'privacy/']


def alt_of(lang, path):
    """같은 역할인 다른 언어판 경로(없으면 None)."""
    if path == 'guide/':
        return path if has_guide('en') and has_guide('ko') else None
    if path in PAIRED:
        return path
    m = re.fullmatch(r'guide/([^/]+)/', path)
    if m:
        a = art_by_slug(lang, m.group(1))
        other = 'en' if lang == 'ko' else 'ko'
        if a and a.get('pair') and art_by_slug(other, a['pair']):
            return 'guide/' + a['pair'] + '/'
    return None


# ---------- 미리 그리기(node) ----------
_RENDER = []


def job(j):
    _RENDER.append(j)
    return f'@@R{len(_RENDER) - 1}@@'


def run_render(text_by_page):
    if not _RENDER:
        return text_by_page
    r = subprocess.run(['node', str(DEV / 'render.mjs')], input=json.dumps(_RENDER), capture_output=True, text=True, check=True)
    out = json.loads(r.stdout)
    # 미리보기 그림 속 숫자는 소수 둘째 자리까지(첫 HTML 을 가볍게)
    out = [re.sub(r'(\d+\.\d{2})\d+', r'\1', s) for s in out]
    return {k: re.sub(r'@@R(\d+)@@', lambda m: out[int(m.group(1))], v) for k, v in text_by_page.items()}


# 첫 그림 전에: 이펙트 세기(html.fx0/1/2), 동작 줄이기면 fx0, 화면(밝게/어둡게)
BOOT = ("<script>(function(d){var h=d.documentElement,s={};try{s=JSON.parse(localStorage.getItem('staycode.set')||'{}')||{}}catch(e){}"
        "var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches,fx=rm?0:(s.fx==null?2:s.fx);h.classList.add('fx'+fx);if(rm)h.classList.add('rm');"
        "if(s.theme==='dark'){h.setAttribute('data-theme','dark');var m=d.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content','#121815')}else h.setAttribute('data-theme','light')"
        "})(document)</script>")

LOGO = ('<svg class="lg" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect class="lg-l" x="1" y="1" width="26" height="26" rx="7"/>'
        '<path class="lg-s" d="M6 6h16v10l-6 6H6z"/><path class="lg-c" d="M22 16l-6 6v-4.5a1.5 1.5 0 0 1 1.5-1.5z"/>'
        '<rect class="lg-q" x="8.5" y="8.5" width="4" height="4" rx="1"/><rect class="lg-q" x="15.5" y="8.5" width="4" height="4" rx="1"/><rect class="lg-q" x="8.5" y="15.5" width="4" height="4" rx="1"/></svg>')

GEAR = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.2 4.6.1-1.1-.1-1.1 2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.9-1.1L15.5 3h-4l-.4 2.7a8 8 0 0 0-1.9 1.1l-2.4-1-2 3.4 2 1.6-.1 1.1.1 1.1-2 1.6 2 3.4 2.4-1a8 8 0 0 0 1.9 1.1l.4 2.7h4l.4-2.7a8 8 0 0 0 1.9-1.1l2.4 1 2-3.4z"/></svg>'


def head(lang, title, desc, path, jsonld=(), og_type='website', noindex=False, ads=True, extra=''):
    canon = url(lang, path)
    alt = alt_of(lang, path)
    links = [] if noindex else [f'<link rel="canonical" href="{canon}">']
    if alt is not None and not noindex:
        en_u = url('en', path if lang == 'en' else alt)
        ko_u = url('ko', path if lang == 'ko' else alt)
        links += [f'<link rel="alternate" hreflang="en" href="{en_u}">', f'<link rel="alternate" hreflang="ko" href="{ko_u}">',
                  f'<link rel="alternate" hreflang="x-default" href="{en_u}">']
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>\n' for j in jsonld)
    ad = f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADS_CLIENT}" crossorigin="anonymous"></script>\n' if ads else ''
    og = 'og-ko.png' if lang == 'ko' else 'og.png'
    og_meta = '' if noindex else f'''<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:site_name" content="{TX[lang]['brand']}">
<meta property="og:image" content="{SITE}/{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="{'ko_KR' if lang == 'ko' else 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
'''
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{'<meta name="robots" content="noindex">' + chr(10) if noindex else ''}<meta name="theme-color" content="#f4f7f5">
{chr(10).join(links)}
{og_meta}<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="{asset('style.css')}">
{BOOT}
{extra}{ld}{ad}</head>'''


def header(lang, path, current=None, sfx=''):
    t = TX[lang]
    p = prefix(lang)
    other = 'en' if lang == 'ko' else 'ko'
    alt = alt_of(lang, path)
    other_href = prefix(other) + (alt if alt is not None else '')
    nav = ''.join(f'<a href="{p}{h}"{" aria-current=" + chr(34) + "page" + chr(34) if key == current else ""}>{esc(label)}</a>' for h, label, key in NAV[lang])
    fx = ''.join(f'<button type="button" data-fx="{i}" aria-pressed="false">{esc(n)}</button>' for i, n in enumerate(t['fx']))
    th = ''.join(f'<button type="button" data-theme="{v}" aria-pressed="false">{esc(n)}</button>' for v, n in zip(('light', 'dark'), t['theme']))
    return f'''<a class="skip" href="#main">{t['skip']}</a>
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="{p}">{LOGO}<span>{t['brand']}</span></a>
    <nav class="nav" aria-label="{t['nav_label']}">{nav}</nav>
    <div class="top-r">
      <a class="lang" href="{other_href}" lang="{other}" hreflang="{other}">{t['lang_other']}</a>
      <details class="setting"><summary aria-label="{t['settings']}" title="{t['settings']}">{GEAR}</summary>
        <div class="set-pop"><p class="set-row"><span>{t['fx_l']}</span><span class="seg" role="group" aria-label="{t['fx_l']}" id="set-fx{sfx}">{fx}</span></p>
        <p class="set-row"><span>{t['theme_l']}</span><span class="seg" role="group" aria-label="{t['theme_l']}" id="set-theme{sfx}">{th}</span></p>
        <p class="set-note" id="set-note{sfx}">{t['fx_reduced']}</p></div>
      </details>
    </div>
  </div>
</header>'''


LUMEN_ICONS = {  # 루멘랩 칸의 작은 스티커(다른 도구를 아주 단순하게)
    'cal': '<rect x="5" y="7" width="22" height="19" rx="3" class="lk-a"/><rect x="5" y="7" width="22" height="6" rx="3" class="lk-b"/><rect x="10" y="17" width="4" height="4" rx="1" class="lk-b"/>',
    'pick': '<circle cx="16" cy="16" r="11" class="lk-a"/><path d="M16 16V5a11 11 0 0 1 9.5 5.5z" class="lk-b"/><circle cx="16" cy="16" r="2.5" class="lk-c"/>',
    'count': '<rect x="5" y="8" width="22" height="16" rx="3" class="lk-a"/><path d="M9 13h14M9 17h10M9 21h6" class="lk-l"/>',
    'type': '<rect x="5" y="9" width="22" height="15" rx="3" class="lk-a"/><rect x="11" y="17" width="10" height="3" rx="1.5" class="lk-b"/>',
    'won': '<rect x="5" y="8" width="22" height="16" rx="3" class="lk-a"/><path d="M10 12l2.5 8 3.5-8 3.5 8 2.5-8M9 15h14" class="lk-l"/>',
    'check': '<rect x="5" y="7" width="22" height="16" rx="3" class="lk-a"/><path d="M11 15l3.5 3.5L21 12" class="lk-l"/><path d="M12 27h8" class="lk-l"/>',
}


def footer(lang, lumen_id=True):
    t = TX[lang]
    p = prefix(lang)
    home = 'https://lumenlab.page/' + ('en/' if lang == 'en' else '')
    stickers = ''.join(f'<span class="ls" style="--i:{i}"><svg viewBox="0 0 32 32">{LUMEN_ICONS[k]}</svg></span>' for i, k in enumerate(C.LUMEN_STICKERS))
    tools = ''.join(f'<a href="{p}{h}">{esc(label)}</a>' for h, label, key in NAV[lang])
    return f'''<footer class="foot"><div class="wrap">
  <a class="lumen"{' id="lumen"' if lumen_id else ''} href="{home}"><span class="lsheet" aria-hidden="true">{stickers}<span class="ls-gap"></span></span><span class="lumen-t"><b>{t['lumen']}</b><span>{t['lumen_s']}</span></span><span class="lgo" aria-hidden="true">→</span></a>
  <p class="foot-links">{tools}<a href="{p}about/">{t['about']}</a><a href="{p}privacy/">{t['privacy']}</a><a href="mailto:{C.CONTACT}">{t['contact']}</a></p>
  <p class="tm">{t['trademark']}</p>
  <small>© 2026 Lumen Lab · {t['brand']}</small>
</div></footer>'''


def site_cfg(lang, path):
    other = 'en' if lang == 'ko' else 'ko'
    alt = alt_of(lang, path)
    return {'lang': lang, 'other': prefix(other) + (alt if alt is not None else ''), 'otherLang': other, 'offer': TX[lang]['lang_offer'], 'bar': TX[lang]['lang_bar'], 'close': TX[lang]['close']}


def page(lang, head_html, body, path, current=None, cls='', scripts=(), cfg=None, after=''):
    sc = ''.join(f'<script src="{asset(s)}"></script>\n' for s in scripts)
    site = '<script type="application/json" id="qr-site">' + json.dumps(site_cfg(lang, path), ensure_ascii=False) + '</script>'
    cfgs = ('<script type="application/json" id="qr-cfg">' + json.dumps(cfg, ensure_ascii=False).replace('</', '<\\/') + '</script>\n') if cfg else ''
    return f'''{head_html}
<body{' class="' + cls + '"' if cls else ''}>
{header(lang, path, current)}
<main id="main">
{body}
</main>
{footer(lang)}
{after}{site}
{cfgs}{sc}<script src="{asset('site.js')}"></script>
</body>
</html>
'''


# ---------- 구조화 데이터 ----------
ORG = {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/', 'email': C.CONTACT}


def app_ld(lang, pg, path):
    return {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': pg['app'], 'url': url(lang, path), 'description': pg['desc'],
            'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any', 'browserRequirements': 'Requires JavaScript', 'inLanguage': lang, 'isAccessibleForFree': True,
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' if lang == 'en' else 'KRW'}, 'publisher': ORG}


def faq_ld(faq):
    return {'@context': 'https://schema.org', '@type': 'FAQPage',
            'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}


def faq_html(lang, faq):
    items = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in faq)
    return f'<section class="sec faq" aria-labelledby="faq-h"><h2 id="faq-h">{TX[lang]["faq_h"]}</h2>{items}</section>'


# ---------- 도구 화면 조각 ----------
def choice(group, items, pressed, label, cls='', icons=None):
    b = ''
    for i, (v, lab) in enumerate(items):
        ic = icons[i] if icons else ''
        b += f'<button type="button" data-v="{esc(v)}" aria-pressed="{"true" if v == pressed else "false"}"{" title=" + chr(34) + esc(lab) + chr(34) if icons else ""}>{ic}<span>{esc(lab)}</span></button>'
    return f'<div class="choice {cls}" role="group" aria-label="{esc(label)}" data-g="{group}">{b}</div>'


def field_html(lang, t, name, label, kind, o):
    fid = f'f-{t}-{name}'
    half = ' half' if o.get('half') else ''
    more = ' more-f' if o.get('more') else ''
    msg = f'<p class="msg" id="m-{t}-{name}" aria-live="polite"></p>'
    ph = f' placeholder="{esc(o["ph"])}"' if o.get('ph') else ''
    ac = f' autocomplete="{o["ac"]}"' if o.get('ac') else ''
    im = f' inputmode="{o["im"]}"' if o.get('im') else ''
    attrs = f'id="{fid}" name="{name}" data-f="{name}" aria-describedby="m-{t}-{name}"{ph}{ac}{im}'
    if kind in ('text', 'email', 'tel', 'url', 'password'):
        typ = {'url': 'url', 'email': 'email', 'tel': 'tel', 'password': 'text', 'text': 'text'}[kind]
        extra = ' spellcheck="false" autocapitalize="off"' if kind in ('url', 'email', 'password') else ''
        if kind == 'url':
            extra += ' inputmode="url"'
        inp = f'<input type="{typ}" {attrs}{extra}>'
        if kind == 'password':
            inp = f'<span class="pw">{inp}<button type="button" class="pw-t" data-show="{fid}" aria-pressed="true">{"가리기" if lang == "ko" else "Hide"}</button></span>'
        return f'<div class="fld{half}{more}"><label for="{fid}">{esc(label)}</label>{inp}{msg}</div>'
    if kind == 'num':
        return f'<div class="fld{half}{more}"><label for="{fid}">{esc(label)}</label><input type="text" inputmode="decimal" {attrs} spellcheck="false">{msg}</div>'
    if kind == 'textarea':
        return f'<div class="fld{half}{more}"><label for="{fid}">{esc(label)}</label><textarea rows="{o.get("rows", 3)}" {attrs}></textarea>{msg}</div>'
    if kind == 'select':
        opts = ''.join(f'<option value="{esc(v)}">{esc(lab)}</option>' for v, lab in o['opts'])
        return f'<div class="fld{half}{more}"><label for="{fid}">{esc(label)}</label><select {attrs}>{opts}</select>{msg}</div>'
    if kind == 'check':
        return f'<div class="fld chk{more}"><label><input type="checkbox" id="{fid}" name="{name}" data-f="{name}"> <span>{esc(label)}</span></label></div>'
    if kind == 'dt':
        return f'<div class="fld{half}{more}"><label for="{fid}">{esc(label)}</label><input type="datetime-local" {attrs}>{msg}</div>'
    if kind == 'phones':
        u = UI[lang]
        types = ''.join(f'<option value="{v}">{esc(n)}</option>' for v, n in u['phone_types'])
        row = (f'<div class="ph-row" data-i="0"><select aria-label="{esc(label)} 1" class="ph-type">{types}</select>'
               f'<input type="tel" class="ph-num" id="{fid}" aria-label="{esc(label)} 1" autocomplete="tel" placeholder="{"010-1234-5678" if lang == "ko" else "+1 555 123 4567"}" aria-describedby="m-{t}-phone0">'
               f'<button type="button" class="ph-rm" aria-label="{esc(u["remove"])}" hidden>×</button></div><p class="msg" id="m-{t}-phone0" aria-live="polite"></p>')
        return (f'<div class="fld phones" data-f="phones"><span class="lab">{esc(label)}</span><div class="ph-list" id="ph-list">{row}</div>'
                f'<template id="ph-tpl"><div class="ph-row"><select class="ph-type">{types}</select><input type="tel" class="ph-num" autocomplete="tel"><button type="button" class="ph-rm" aria-label="{esc(u["remove"])}">×</button></div></template>'
                f'<button type="button" class="lnk add-ph" id="add-ph">+ {esc(u["add_phone"])}</button></div>')
    return ''


def fieldsets(lang, start):
    u = UI[lang]
    out = ''
    for t in ('url', 'text', 'wifi', 'vcard', 'email', 'sms', 'tel', 'geo', 'event', 'whatsapp'):
        flds = C.FIELDS[lang][t]
        main = ''.join(field_html(lang, t, *f) for f in flds if not f[3].get('more'))
        more = ''.join(field_html(lang, t, *f) for f in flds if f[3].get('more'))
        if more:
            main += f'<details class="morebox"><summary>{esc(u["more_fields"])}</summary><div class="fgrid">{more}</div></details>'
        if t == 'url':
            utm = (f'<details class="morebox utm" id="utm"><summary>{esc(u["utm_sum"])} <span class="on-tag" id="utm-on" hidden>✓</span></summary>'
                   f'<div class="fgrid">{field_html(lang, "url", "utm", u["utm_on"], "check", {})}{field_html(lang, "url", "utm_source", u["utm_src"], "text", {"half": 1})}{field_html(lang, "url", "utm_medium", u["utm_med"], "text", {"half": 1})}'
                   f'{field_html(lang, "url", "utm_campaign", u["utm_camp"], "text", {"ph": u["utm_camp_ph"]})}<p class="hint">{esc(u["utm_note"])}</p></div></details>')
            main += utm
        out += f'<fieldset class="fs" data-t="{t}"{"" if t == start else " hidden"}><legend class="sr">{esc(C.TYPE_NAMES[lang][t])}</legend><div class="fgrid">{main}</div></fieldset>'
    return out


def example(lang, t):
    """첫 화면에 미리 그려 둘 예시(내용이 비어 있을 때 보인다)."""
    return {
        'url': 'https://example.com/menu', 'wifi': 'WIFI:T:WPA;S:Cafe Guest;P:hello2026;;',
        'vcard': 'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Kim;Jamie;;;\r\nFN:Jamie Kim\r\nTEL;TYPE=CELL,VOICE:+15551234567\r\nEMAIL;TYPE=INTERNET:jamie@example.com\r\nEND:VCARD',
    }.get(t, 'https://example.com/menu')


def tool_page(lang, key):
    pg = C.PAGES[(lang, key)]
    t, u, mm = TX[lang], UI[lang], M[lang]
    start = pg['type']
    path = pg['path']
    names = C.TYPE_NAMES[lang]
    types = ''.join(f'<button type="button" role="radio" data-t="{k}" aria-checked="{"true" if k == start else "false"}" tabindex="{0 if k == start else -1}">{esc(names[k])}</button>'
                    for k in ('url', 'text', 'wifi', 'vcard', 'email', 'sms', 'tel', 'geo', 'event', 'whatsapp'))
    ex_text = example(lang, start)
    ex_style = {'margin': 4}
    preset_html = ''
    import ast  # noqa: F401
    for p in PRESETS:
        st = dict(PRESET_BASE)
        st.update(p['s'])
        st['frameText'] = (p.get('t') or {}).get(lang, '')
        # 그림은 화면이 뜬 뒤 app.js 가 그린다(첫 HTML 을 가볍게). 자리는 정사각으로 미리 잡혀 있어 밀리지 않는다
        preset_html += f'<button type="button" class="pre" data-p="{p["id"]}" aria-pressed="false"><span class="pre-i" aria-hidden="true"></span><span class="pre-n">{esc(p["name"][lang])}</span></button>'
    dots = choice('dots', list(zip(C_DOTS, u['dots'])), 'square', u['dots_l'], 'icons', [job({'k': 'dots', 'v': v}) for v in C_DOTS])
    eyeo = choice('eyeOuter', list(zip(C_EYEO, u['eyeo'])), 'square', u['eyeo_l'], 'icons', [job({'k': 'eyeo', 'v': v}) for v in C_EYEO])
    eyei = choice('eyeInner', list(zip(C_EYEI, u['eyei'])), 'square', u['eyei_l'], 'icons', [job({'k': 'eyei', 'v': v}) for v in C_EYEI])
    frames = choice('frame', list(zip(C_FRAMES, u['frames'])), 'none', u['frame_l'], 'icons frames', [job({'k': 'frame', 'v': v}) for v in C_FRAMES])
    fill = choice('grad', list(zip(('none', 'linear', 'radial'), u['fill'])), 'none', u['fill_l'], 'seg3')
    ecl = ''.join(f'<button type="button" data-v="{v}" aria-pressed="{"true" if v == "M" else "false"}"><b>{n}</b><span>{esc(p)}</span></button>' for v, n, p in u['ecl'])
    words = ''.join(f'<option value="{esc(w)}">{esc(w)}</option>' for w in C.FRAME_WORDS[lang])
    sizes = ''.join(f'<option value="{s}"{" selected" if s == 1024 else ""}>{s}px</option>' for s in (512, 1024, 2048, 4096))
    tabs = ''.join(f'<button type="button" role="tab" id="tab-{k}" aria-controls="tp-{k}" aria-selected="{"true" if i == 0 else "false"}" tabindex="{0 if i == 0 else -1}">{esc(n)}</button>' for i, (k, n) in enumerate(u['tabs']))

    def color(id_, label, val):
        return f'<label class="col"><input type="color" id="{id_}" value="{val}"><span>{esc(label)}</span><code id="{id_}-hex">{val}</code></label>'

    panels = f'''<div class="tp" role="tabpanel" id="tp-shape" aria-labelledby="tab-shape">
        <p class="grp-l">{esc(u['dots_l'])}</p>{dots}
        <p class="grp-l">{esc(u['eyeo_l'])}</p>{eyeo}
        <p class="grp-l">{esc(u['eyei_l'])}</p>{eyei}
      </div>
      <div class="tp" role="tabpanel" id="tp-color" aria-labelledby="tab-color" hidden>
        <p class="grp-l">{esc(u['fill_l'])}</p>{fill}
        <div class="cols">{color('c-fg', u['fg_l'], '#111111')}<span id="c-fg2-w" hidden>{color('c-fg2', u['fg2_l'], '#5b2a86')}</span>
          <label class="col rng" id="c-ang-w" hidden><span>{esc(u['angle_l'])}</span><input type="range" id="c-ang" min="0" max="345" step="15" value="45"><output id="c-ang-o">45°</output></label></div>
        <div class="cols">{color('c-bg', u['bg_l'], '#ffffff')}<label class="chk"><input type="checkbox" id="c-tr"> <span>{esc(u['transparent_l'])}</span></label></div>
        <label class="chk"><input type="checkbox" id="c-eye"> <span>{esc(u['eyecol_l'])}</span></label>
        <div class="cols" id="c-eye-w" hidden>{color('c-eo', u['eyeout_l'], '#111111')}{color('c-ei', u['eyein_l'], '#111111')}</div>
        <p class="contrast" id="contrast"></p>
      </div>
      <div class="tp" role="tabpanel" id="tp-logo" aria-labelledby="tab-logo" hidden>
        <p class="grp-l">{esc(u['logo_l'])}</p>
        <label class="btn ghost file"><input type="file" id="logo-file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif" class="sr"><span>{esc(u['logo_pick'])}</span></label>
        <p class="hint">{esc(u['logo_note'])}</p>
        <div id="logo-opts" hidden>
          <div class="logo-row"><img id="logo-img" alt="" width="56" height="56" hidden><button type="button" class="lnk" id="logo-rm">{esc(u['logo_rm'])}</button></div>
          <label class="col rng"><span>{esc(u['logo_size'])}</span><input type="range" id="logo-size" min="10" max="30" step="1" value="20"><output id="logo-size-o">20%</output></label>
          <label class="chk"><input type="checkbox" id="logo-clear" checked> <span>{esc(u['logo_clear'])}</span></label>
          <label class="chk"><input type="checkbox" id="logo-plate"> <span>{esc(u['logo_plate'])}</span></label>
        </div>
        <p class="msg" id="logo-msg" aria-live="polite"></p>
      </div>
      <div class="tp" role="tabpanel" id="tp-frame" aria-labelledby="tab-frame" hidden>
        <p class="grp-l">{esc(u['frame_l'])}</p>{frames}
        <div id="frame-opts" hidden>
          <label class="fld"><span class="lab">{esc(u['ftext_l'])}</span><span class="ftext"><select id="ft-pick" aria-label="{esc(u['ftext_l'])}"><option value="">{esc(u['ftext_ph'])}</option>{words}</select><input type="text" id="ft-text" maxlength="24" aria-label="{esc(u['ftext_ph'])}" placeholder="{esc(u['ftext_ph'])}" aria-describedby="ft-msg"></span></label>
          <p class="msg" id="ft-msg" aria-live="polite"></p>
          <div class="cols">{color('c-fr', u['fcol_l'], '#111111')}{color('c-ft', u['ftcol_l'], '#ffffff')}</div>
        </div>
      </div>
      <div class="tp" role="tabpanel" id="tp-adv" aria-labelledby="tab-adv" hidden>
        <p class="grp-l">{esc(u['ecl_l'])}</p><div class="choice ecl" role="group" aria-label="{esc(u['ecl_l'])}" data-g="ecl">{ecl}</div>
        <p class="hint">{esc(u['ecl_note'])}</p>
        <label class="col rng"><span>{esc(u['margin_l'])}</span><input type="range" id="margin" min="0" max="8" step="1" value="4"><output id="margin-o">4 {esc(u['margin_unit'])}</output></label>
        <p class="hint">{esc(u['margin_note'])}</p>
      </div>
      <div class="tp" role="tabpanel" id="tp-mine" aria-labelledby="tab-mine" hidden>
        <p class="grp-l">{esc(u['mine_l'])}</p>
        <div class="mine-save"><input type="text" id="mine-name" maxlength="30" aria-label="{esc(u['mine_l'])}" placeholder="{esc(u['mine_ph'])}"><button type="button" class="btn ghost" id="mine-save">{esc(u['mine_save'])}</button></div>
        <p class="msg" id="mine-msg" aria-live="polite"></p>
        <ul class="mine-list" id="mine-list"></ul>
        <p class="hint" id="mine-empty">{esc(u['mine_empty'])}</p>
      </div>'''
    ex_svg = job({'k': 'qr', 'text': ex_text, 'ecl': 'M', 'style': ex_style, 'cut': 1.4, 'cls': 'qr-svg', 'aria': u['example'], 'idp': 'x', 'fake': True})
    pdf_cm = ''.join(f'<option value="{c}"{" selected" if c == 5 else ""}>{c} cm</option>' for c in (2, 3, 4, 5, 8, 10, 15, 20))
    sheet_cm = ''.join(f'<option value="{c}"{" selected" if c == 4 else ""}>{c} cm</option>' for c in (2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 10))
    body = f'''<section id="tool" class="tool" data-type="{start}" aria-labelledby="h1">
  <div class="wrap t-head">
    <h1 id="h1">{esc(pg['h1'])}</h1>
    <p class="why">{esc(pg['sub'])}</p>
  </div>
  <noscript><p class="wrap nojs">{t['nojs']}</p></noscript>
  <div class="wrap t-grid">
    <div class="t-content">
      <div class="types-w" id="types-w"><div class="types" role="radiogroup" aria-label="{esc(u['type_l'])}" id="types">{types}</div></div>
      <form class="fields" id="fields" novalidate autocomplete="off">{fieldsets(lang, start)}</form>
      <p class="happen" id="happen">{esc(C.HAPPEN[lang][start])}</p>
      <div class="notes" id="notes" aria-live="polite"></div>
    </div>
    <div class="t-preview" id="preview">
      <div class="liner" id="liner">
        <div class="sticker is-ex" id="sticker">{ex_svg}</div>
        <span class="ex-tag" id="ex-tag">{esc(u['example'])}</span>
        <span class="stamp" id="stamp" data-s="none" aria-hidden="true"><b id="stamp-t"></b></span>
        <span class="sweep" aria-hidden="true"></span><span class="curl" aria-hidden="true"></span><span class="lift" aria-hidden="true"></span>
      </div>
      <p class="ex-note" id="ex-note">{esc(u['example_note'])}</p>
      <div class="verdict" id="verdict" role="status" aria-live="polite"><p class="v-main" id="v-main"></p><ul class="v-list" id="v-list"></ul></div>
      <p class="go" id="go"></p>
      <div class="save" id="save-box">
        <div class="save-row"><button type="button" class="btn save" id="dl-png">{esc(u['save_png'])}</button>
          <label class="sel"><span>{esc(u['size_l'])}</span><select id="png-size">{sizes}</select></label></div>
        <div class="fmt-row"><span class="fmt-l">{esc(u['fmt_l'])}</span><button type="button" class="btn ghost sm" data-dl="jpg">{u['jpg']}</button><button type="button" class="btn ghost sm" data-dl="svg">{u['svg']}</button><button type="button" class="btn ghost sm" data-dl="pdf">{u['pdf']}</button><button type="button" class="btn ghost sm" data-dl="eps">{u['eps']}</button></div>
        <div class="fmt-row"><button type="button" class="btn ghost sm" id="copy-img">{esc(u['copy'])}</button><button type="button" class="btn ghost sm" id="share-img" hidden>{esc(u['share'])}</button></div>
        <p class="trust">{esc(u['trust'])}</p>
        <details class="morebox"><summary>{esc(u['pdf_l'])}</summary><div class="opt-row"><label class="chk"><input type="radio" name="pdfm" value="a4" checked> <span>{esc(u['pdf_a4'])}</span></label><label class="chk"><input type="radio" name="pdfm" value="fit"> <span>{esc(u['pdf_fit'])}</span></label>
          <label class="sel"><span>{esc(u['pdf_cm'])}</span><select id="pdf-cm">{pdf_cm}</select></label></div></details>
        <details class="morebox" id="sheet"><summary>{esc(u['sheet_sum'])}</summary><div class="opt-row"><label class="sel"><span>{esc(u['sheet_cm'])}</span><select id="sheet-cm">{sheet_cm}</select></label>
          <label class="chk"><input type="checkbox" id="sheet-marks" checked> <span>{esc(u['sheet_marks'])}</span></label><span class="sheet-n" id="sheet-n"></span></div>
          <div class="fmt-row"><button type="button" class="btn ghost sm" id="sheet-pdf">{esc(u['sheet_pdf'])}</button><button type="button" class="btn ghost sm" id="sheet-print">{esc(u['sheet_print'])}</button></div></details>
      </div>
      <p class="info" id="info"></p>
      <p class="print-tip">{esc(PRINT_TIP[lang])}</p>
    </div>
    <div class="t-design">
      <h2 class="d-h">{esc(u['design_h'])}</h2>
      <p class="grp-l">{esc(u['presets_h'])} <span class="hint-i">{esc(u['presets_note'])}</span></p>
      <div class="presets" id="presets">{preset_html}</div>
      <div class="tabs" role="tablist" aria-label="{esc(u['design_h'])}">{tabs}</div>
      {panels}
    </div>
  </div>
  <div class="wrap recent" id="recent" hidden><div class="rec-h"><h2>{esc(u['recent_h'])}</h2><button type="button" class="lnk" id="rec-clear">{esc(u['recent_clear'])}</button></div><p class="hint">{esc(u['recent_note'])}</p><ul class="rec-list" id="rec-list"></ul></div>
</section>'''
    after = (f'<div class="savebar" id="savebar" aria-hidden="true"><span class="sb-i" id="sb-i"></span><button type="button" class="btn save" id="sb-save" tabindex="-1">{esc(u["sticky_save"])}</button></div>'
             '<div class="print-sheet" id="print-sheet" aria-hidden="true"></div><div class="toast" id="toast" role="status" aria-live="polite"></div>')
    faq = C.FAQ.get((lang, key), [])
    intent = C.INTENT.get((lang, key))
    how = ''.join(f'<li><b>{esc(h)}</b><span>{esc(b)}</span></li>' for h, b in C.HOW[lang])
    below = f'''<div class="wrap below">
{('<section class="sec prose"><h2>' + esc(intent[0]) + '</h2>' + intent[1] + '</section>') if intent else ''}
<section class="sec" aria-labelledby="how-h"><h2 id="how-h">{t['how_h']}</h2><ol class="how">{how}</ol></section>
<section class="sec prose" aria-labelledby="why-h"><h2 id="why-h">{t['why_h']}</h2>{C.WHY[lang]}{guide_link(lang)}</section>
{faq_html(lang, faq) if faq else ''}
<section class="sec prose" aria-labelledby="std-h"><h2 id="std-h">{t['std_h']}</h2>{C.STD[lang]}</section>
{tools_block(lang, key)}
{guides_block(lang)}
</div>'''
    cfg = {'lang': lang, 'page': key, 'start': start, 'site': SITE, 'M': mm, 'U': {k: u[k] for k in ('example', 'remove', 'mine_del', 'sheet_count', 'sheet_none', 'phone_types', 'margin_unit', 'recent_note', 'logo_ecl', 'sheet_size')},
           'happen': C.HAPPEN[lang], 'types': C.TYPE_NAMES[lang], 'glyphs': asset('glyphs/base.json'), 'worker': asset('scan-worker.js'),
           'presets': [{'id': p['id'], 'name': p['name'][lang]} for p in PRESETS]}
    ld = [app_ld(lang, pg, path)] + ([faq_ld(faq)] if faq else [])
    h = head(lang, pg['title'], pg['desc'], path, jsonld=ld)
    scripts = ['qr.js', 'qr-payload.js', 'qr-render.js', 'qr-presets.js', 'qr-export.js', 'verify.js', 'fx.js', 'app.js']
    return path, page(lang, h, body + '\n' + below, path, current=key, cls='is-tool', scripts=scripts, cfg=cfg, after=after)


def bulk_page(lang):
    pg = C.PAGES[(lang, 'bulk')]
    t, u, b = TX[lang], UI[lang], C.BULK[lang]
    path = pg['path']
    LIMIT = 1000
    types = ''.join(f'<option value="{v}">{esc(n)}</option>' for v, n in b['types'])
    pre = ''.join(f'<option value="p:{p["id"]}">{esc(p["name"][lang])}</option>' for p in PRESETS)
    ecl = ''.join(f'<option value="{v}"{" selected" if v == "M" else ""}>{v} ({esc(p)})</option>' for v, n, p in u['ecl'])
    fmt = ''.join(f'<label class="chk"><input type="radio" name="bfmt" value="{v}"{" checked" if v == "png" else ""}> <span>{n}</span></label>' for v, n in b['fmt'])
    sizes = ''.join(f'<option value="{s}"{" selected" if s == 1024 else ""}>{s}px</option>' for s in (512, 1024, 2048))
    body = f'''<section id="tool" class="tool bulk" aria-labelledby="h1">
  <div class="wrap t-head"><h1 id="h1">{esc(pg['h1'])}</h1><p class="why">{esc(pg['sub'])}</p></div>
  <noscript><p class="wrap nojs">{t['nojs']}</p></noscript>
  <div class="wrap b-grid">
    <div class="b-in">
      <h2 class="d-h">{esc(b['input_h'])}</h2>
      <div class="fld"><label for="b-type">{esc(b['type_l'])}</label><select id="b-type">{types}</select></div>
      <div class="fld"><label for="b-list">{esc(b['paste_l'])} <span class="hint-i" id="b-count">{esc(b['limit'].replace('{n}', f'{LIMIT:,}'))}</span></label><textarea id="b-list" rows="9" spellcheck="false" placeholder="{esc(b['paste_ph'])}" aria-describedby="b-rule"></textarea><p class="hint" id="b-rule">{esc(b['rules']['url'])}</p></div>
      <div class="fld"><span class="lab">{esc(b['csv_l'])}</span><label class="btn ghost file"><input type="file" id="b-csv" accept=".csv,text/csv,text/plain" class="sr"><span>{esc(b['csv_pick'])}</span></label><p class="hint">{esc(b['csv_note'])}</p></div>
      <p class="msg" id="b-msg" aria-live="polite"></p>
    </div>
    <div class="b-design">
      <h2 class="d-h">{esc(b['design_h'])}</h2>
      <div class="fld"><label for="b-style">{esc(b['design_l'])}</label><select id="b-style"><optgroup label="{esc(b['preset_group'])}">{pre}</optgroup><optgroup label="{esc(b['mine_group'])}" id="b-mine"></optgroup></select></div>
      <div class="liner small" id="liner"><div class="sticker" id="sticker">{job({'k': 'qr', 'text': 'https://example.com/menu', 'ecl': 'M', 'style': {'margin': 4}, 'cut': 1.4, 'cls': 'qr-svg', 'aria': u['example'], 'idp': 'x', 'fake': True})}</div><span class="ex-tag">{esc(u['example'])}</span></div>
      <div class="fld"><label for="b-ecl">{esc(b['ecl_l'])}</label><select id="b-ecl">{ecl}</select></div>
      <div class="fld"><span class="lab">{esc(b['fmt_l'])}</span><div class="opt-row">{fmt}<label class="sel" id="b-size-w"><span>{esc(b['size_l'])}</span><select id="b-size">{sizes}</select></label></div></div>
      <div class="b-go"><button type="button" class="btn save" id="b-go">{esc(b['go'])}</button><button type="button" class="btn ghost" id="b-stop" hidden>{esc(b['cancel'])}</button></div>
      <div class="prog" id="b-prog" hidden><div class="bar"><i id="b-bar"></i></div><p id="b-prog-t" role="status"></p></div>
      <p class="trust">{esc(u['trust'])}</p>
      <p class="hint">{esc(b['privacy'])}</p>
    </div>
  </div>
  <div class="wrap b-res" id="b-res" hidden>
    <div class="rec-h"><h2>{esc(b['res_h'])}</h2><button type="button" class="btn save" id="b-zip"></button></div>
    <p id="b-sum" role="status"></p>
    <div class="tbl"><table class="b-table"><thead><tr><th>{esc(b['th_no'])}</th><th>{esc(b['th_img'])}</th><th>{esc(b['th_name'])}</th><th>{esc(b['th_content'])}</th><th>{esc(b['th_check'])}</th></tr></thead><tbody id="b-rows"></tbody></table></div>
    <p class="hint" id="b-tnote" hidden>{esc(b['table_note'])}</p>
    <div id="b-skip" hidden><h3>{esc(b['skip_h'])}</h3><div class="tbl"><table class="b-table"><thead><tr><th>{esc(b['th_no'])}</th><th>{esc(b['th_content'])}</th><th>{esc(b['th_reason'])}</th></tr></thead><tbody id="b-skips"></tbody></table></div></div>
  </div>
</section>'''
    faq = C.FAQ.get((lang, 'bulk'), [])
    how = ''.join(f'<li><b>{esc(h)}</b><span>{esc(x)}</span></li>' for h, x in C.HOW[lang])
    below = f'''<div class="wrap below">
{faq_html(lang, faq)}
<section class="sec prose" aria-labelledby="why-h"><h2 id="why-h">{t['why_h']}</h2>{C.WHY[lang]}{guide_link(lang)}</section>
{tools_block(lang, 'bulk')}
{guides_block(lang)}
</div>'''
    cfg = {'lang': lang, 'page': 'bulk', 'limit': LIMIT, 'B': b, 'M': M[lang], 'worker': asset('scan-worker.js'), 'glyphs': asset('glyphs/base.json'),
           'presets': [{'id': p['id'], 'name': p['name'][lang]} for p in PRESETS]}
    ld = [app_ld(lang, pg, path), faq_ld(faq)]
    h = head(lang, pg['title'], pg['desc'], path, jsonld=ld)
    scripts = ['qr.js', 'qr-payload.js', 'qr-render.js', 'qr-presets.js', 'qr-export.js', 'verify.js', 'bulk.js']
    after = '<div class="toast" id="toast" role="status" aria-live="polite"></div>'
    return path, page(lang, h, body + '\n' + below, path, current='bulk', cls='is-tool', scripts=scripts, cfg=cfg, after=after)


def scan_page(lang):
    pg = C.PAGES[(lang, 'scan')]
    t, s = TX[lang], C.SCAN[lang]
    path = pg['path']
    body = f'''<section id="tool" class="tool scan" aria-labelledby="h1">
  <div class="wrap t-head"><h1 id="h1">{esc(pg['h1'])}</h1><p class="why">{esc(pg['sub'])}</p></div>
  <noscript><p class="wrap nojs">{t['nojs']}</p></noscript>
  <div class="wrap s-grid">
    <div class="s-in">
      <div class="s-btns"><button type="button" class="btn main" id="s-cam">{esc(s['cam'])}</button>
        <label class="btn ghost file"><input type="file" id="s-file" accept="image/*" class="sr"><span>{esc(s['file'])}</span></label>
        <button type="button" class="btn ghost" id="s-paste">{esc(s['paste'])}</button></div>
      <p class="hint">{esc(s['paste_note'])}</p>
      <div class="cam" id="s-camw" hidden><video id="s-video" playsinline muted></video><span class="cam-box" aria-hidden="true"></span><button type="button" class="btn ghost sm cam-stop" id="s-stop">{esc(s['cam_stop'])}</button><p class="cam-t" id="s-camt">{esc(s['waiting'])}</p></div>
      <p class="hint safe">{esc(s['cam_note'])}</p>
      <p class="msg" id="s-msg" role="status" aria-live="polite"></p>
    </div>
    <div class="s-out" id="s-out">
      <div class="liner small s-liner" id="s-empty" aria-hidden="true"><span class="s-ph"></span></div>
      <div class="s-res" id="s-res" hidden></div>
    </div>
  </div>
</section>'''
    faq = C.FAQ.get((lang, 'scan'), [])
    below = f'''<div class="wrap below">
{faq_html(lang, faq)}
{tools_block(lang, 'scan')}
{guides_block(lang)}
</div>'''
    cfg = {'lang': lang, 'page': 'scan', 'S': s, 'worker': asset('scan-worker.js')}
    ld = [app_ld(lang, pg, path), faq_ld(faq)]
    h = head(lang, pg['title'], pg['desc'], path, jsonld=ld)
    after = '<div class="toast" id="toast" role="status" aria-live="polite"></div>'
    return path, page(lang, h, body + '\n' + below, path, current='scan', cls='is-tool', scripts=['qr-parse.js', 'verify.js', 'scan.js'], cfg=cfg, after=after)


TOOL_LINE = {
    ('ko', 'make'): ('QR코드 만들기', 'URL·글·메일·일정 등 열 가지'), ('ko', 'wifi'): ('와이파이 QR', '찍으면 바로 연결'),
    ('ko', 'vcard'): ('명함 QR', '찍으면 연락처에 추가'), ('ko', 'bulk'): ('대량 만들기', '목록·CSV로 최대 1,000개'), ('ko', 'scan'): ('QR 스캐너', '열기 전에 주소 확인'),
    ('en', 'make'): ('QR Code Generator', 'URL, text, email, events and more'), ('en', 'wifi'): ('WiFi QR Code', 'Scan to join'),
    ('en', 'vcard'): ('vCard QR Code', 'Scan to add a contact'), ('en', 'bulk'): ('Bulk Generator', 'Up to 1,000 from a list or CSV'), ('en', 'scan'): ('QR Scanner', 'Check links before opening'),
}


def tools_block(lang, current):
    p = prefix(lang)
    items = ''
    for h, _, key in NAV[lang]:
        if key in ('guide', current):
            continue
        name, line = TOOL_LINE[(lang, key)]
        items += f'<li><a href="{p}{h}"><b>{esc(name)}</b><span>{esc(line)}</span></a></li>'
    return f'<section class="sec" aria-labelledby="tools-h"><h2 id="tools-h">{TX[lang]["tools_h"]}</h2><ul class="cards">{items}</ul></section>'


def guide_link(lang):
    """'왜 무료이고 만료가 없나' 칸 끝의 가이드 글 링크: 만료를 다루는 글이 있으면 그 글, 없으면 가이드 목록."""
    p = prefix(lang)
    a = next((a for a in arts(lang) if re.search(r'expire|manryo|만료', a['slug'] + a['title'])), None)
    if a:
        return f'<p><a href="{p}guide/{a["slug"]}/">{esc(a["h1"])}</a></p>'
    return ''


def guides_block(lang, limit=4, skip=None):
    t = TX[lang]
    p = prefix(lang)
    lst = [a for a in arts(lang) if a['slug'] != skip][:limit]
    if not lst:
        return ''
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/"><b>{esc(a["h1"])}</b><span>{esc(a["description"])}</span></a></li>' for a in lst)
    return f'<section class="sec" aria-labelledby="guides-h"><h2 id="guides-h">{t["guides_h"]}</h2><ul class="cards">{items}</ul><p class="more-link"><a href="{p}guide/">{t["guides_all"]}</a></p></section>'


# ---------- 글·소개·방침 ----------
def fmt_date(lang, iso):
    y, m, d = (int(x) for x in iso.split('-'))
    if lang == 'ko':
        return f'{y}년 {m}월 {d}일'
    return f'{["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1]} {d}, {y}'


def expand(body, lang):
    """글 속 표는 가로로 미는 칸 안에(휴대폰에서 잘리지 않게)."""
    return re.sub(r'<table(.*?)>(.*?)</table>', lambda m: f'<div class="tbl"><table{m.group(1)}>{m.group(2)}</table></div><p class="tbl-hint">{TX[lang]["swipe"]}</p>', body, flags=re.S)


def crumbs(lang, a):
    t = TX[lang]
    p = prefix(lang)
    html_ = f'<nav class="crumbs" aria-label="breadcrumb"><a href="{p}">{t["crumb_home"]}</a><span aria-hidden="true">›</span><a href="{p}guide/">{t["crumb_guides"]}</a><span aria-hidden="true">›</span><span>{esc(a["h1"])}</span></nav>'
    ld = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': t['crumb_home'], 'item': url(lang)},
        {'@type': 'ListItem', 'position': 2, 'name': t['crumb_guides'], 'item': url(lang, 'guide/')},
        {'@type': 'ListItem', 'position': 3, 'name': a['h1'], 'item': url(lang, 'guide/' + a['slug'] + '/')}]}
    return html_, ld


def article_page(lang, a):
    t = TX[lang]
    p = prefix(lang)
    path = 'guide/' + a['slug'] + '/'
    crumb_html, crumb_ld = crumbs(lang, a)
    checked = a.get('checked', FIRST)
    body = expand(a['body'], lang)
    srcs = a.get('sources') or []
    src_html = ''
    if srcs:
        li = ''.join(f'<li><a href="{esc(s["url"])}" rel="noopener">{esc(s["label"])}</a> <span class="chk-d">({t["checked"]} {fmt_date(lang, s.get("checked", checked))})</span></li>' for s in srcs)
        src_html = f'<section class="sources"><h2>{t["sources_h"]}</h2><ul>{li}</ul></section>'
    tool = a.get('tool') or p
    ld = {'@context': 'https://schema.org', '@type': 'Article', 'headline': a['h1'], 'description': a['description'], 'inLanguage': lang,
          'datePublished': a.get('published', FIRST), 'dateModified': checked, 'mainEntityOfPage': url(lang, path),
          'image': SITE + ('/og-ko.png' if lang == 'ko' else '/og.png'), 'author': ORG, 'publisher': ORG}
    html_ = f'''<article class="wrap narrow prose">
  {crumb_html}
  <h1>{esc(a['h1'])}</h1>
  <p class="meta">{t['checked']} <time datetime="{checked}">{fmt_date(lang, checked)}</time></p>
  <div class="lead">{a['lead'] if a['lead'].lstrip().startswith('<') else '<p>' + a['lead'] + '</p>'}</div>
  {body}
  <p class="cta"><a class="btn main" href="{esc(tool)}">{esc(a.get('tool_label') or t['try_tool'])}</a></p>
  {src_html}
</article>
<div class="wrap narrow">{guides_block(lang, limit=3, skip=a['slug'])}</div>'''
    h = head(lang, a['title'], a['description'], path, jsonld=[ld, crumb_ld], og_type='article')
    return path, page(lang, h, html_, path, current='guide', cls='doc')


def guide_index(lang):
    g = C.GUIDE_INDEX[lang]
    p = prefix(lang)
    lst = arts(lang)
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/"><b>{esc(a["h1"])}</b><span>{esc(a["description"])}</span></a></li>' for a in lst)
    inner = f'<ul class="cards long">{items}</ul>' if lst else f'<p>{esc(TX[lang]["guide_empty"])}</p>'
    body = f'''<div class="wrap narrow prose">
  <h1>{esc(g['h1'])}</h1>
  <p class="lead">{esc(g['lead'])}</p>
  {inner}
</div>
<div class="wrap narrow">{tools_block(lang, 'guide')}</div>'''
    h = head(lang, g['title'], g['desc'], 'guide/', ads=False)
    return 'guide/', page(lang, h, body, 'guide/', current='guide', cls='doc')


def doc_page(lang, key):
    d = (C.ABOUT if key == 'about' else C.PRIVACY)[lang]
    body = f'<div class="wrap narrow prose"><h1>{esc(d["h1"])}</h1>{d["body"]}</div>'
    h = head(lang, d['title'], d['desc'], key + '/', ads=False)
    return key + '/', page(lang, h, body, key + '/', cls='doc')


def not_found():
    """없는 주소: 한 장에 두 언어 틀. 첫 그림 전에 주소(/ko/ 로 시작하면 한국어)로 하나만 보인다. 광고 없음, noindex."""
    def frame(lang):
        t = TX[lang]
        ol = 'ko' if lang == 'en' else 'en'
        return f'''<div class="wrap narrow nf" data-l="{lang}"{' lang="ko"' if lang == 'ko' else ''}>
  <div class="liner nf-liner" aria-hidden="true"><span class="nf-s">404</span></div>
  <h1>{t['nf_title']}</h1>
  <p>{t['nf_lead']}</p>
  <p><a class="btn main" href="{prefix(lang)}">{t['home']}</a> <a class="btn ghost" href="{prefix(ol)}" lang="{ol}" hreflang="{ol}">{TX[ol]['home']}</a></p>
</div>'''

    def wrap(lang, inner):
        return f'<div data-l="{lang}"{' lang="ko"' if lang == 'ko' else ''}>\n{inner}\n</div>'

    pick = ("<script>if(/^\\/ko(\\/|$)/.test(location.pathname)){var h=document.documentElement;h.lang='ko';h.classList.add('l-ko');document.title='" + TX['ko']['nf_title'] + " | " + TX['ko']['brand'] + "'}</script>\n")
    h = head('en', 'Page not found | Staycode', 'This page does not exist.', '', noindex=True, ads=False, extra=pick)
    site = '<script type="application/json" id="qr-site">' + json.dumps({'lang': 'en'}) + '</script>'
    return f'''{h}
<body class="doc nfpage">
{wrap('en', header('en', '__404__'))}
{wrap('ko', header('ko', '__404__', sfx='-ko'))}
<main id="main">
{frame('en')}
{frame('ko')}
</main>
{wrap('en', footer('en'))}
{wrap('ko', footer('ko', lumen_id=False))}
{site}
<script src="{asset('site.js')}"></script>
</body>
</html>
'''


def sitemap(paths):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in paths:
        out.append(f'  <url><loc>{SITE}{path}</loc><lastmod>{lastmod(path)}</lastmod></url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


GUIDE_HOME = {'ko': 'https://lumenlab.page/guides/', 'en': 'https://lumenlab.page/en/guides/'}


def guide_links(text):
    # 2026-10-29 가이드는 lumenlab.page/guides/qr/<slug>/(영어 /en/guides/…)로 옮겼다: /guide/·/ko/guide/ 링크를 새 주소로(목록은 #qr, 글의 #조각은 그대로)
    def to(m):
        root, slug, frag = GUIDE_HOME['ko' if m.group(1) else 'en'], m.group(2) or '', m.group(3) or ''
        return f'href="{root}#qr"' if slug in ('', 'index.html') else f'href="{root}qr/{slug}{frag}"'
    return re.sub(r'href="/(ko/)?guide(?:/([^"#]*))?(#[^"]*)?"', to, text)


def is_guide(path):
    return path.startswith(('/guide/', '/ko/guide/'))


# ---------- 꾸밈 세트(assets/qr-presets.js 를 그대로 읽는다) ----------
def load_presets():
    r = subprocess.run(['node', '-e', f"const P=require({json.dumps(str(ROOT / 'assets/qr-presets.js'))});const R=require({json.dumps(str(ROOT / 'assets/qr-render.js'))});"
                        "process.stdout.write(JSON.stringify({base:P.BASE,list:P.LIST,dots:R.DOTS,eo:R.EYE_OUT,ei:R.EYE_IN,fr:R.FRAMES}))"], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


_P = load_presets()
PRESET_BASE, PRESETS = _P['base'], _P['list']
C_DOTS, C_EYEO, C_EYEI, C_FRAMES = _P['dots'], _P['eo'], _P['ei'], _P['fr']


def print_tip():
    """인쇄 크기 안내: facts.md 가 있으면 거기 적힌 문장을 쓴다(없으면 content.py 의 부드러운 문장)."""
    tip = {'ko': M['ko']['print_tip'], 'en': M['en']['print_tip']}
    f = DEV / 'facts.md'
    if f.exists():
        txt = f.read_text(encoding='utf-8')
        for lang in ('ko', 'en'):
            m = re.search(r'print_tip_' + lang + r'\s*[:=]\s*(.+)', txt)
            if m:
                tip[lang] = m.group(1).strip().strip('"「」')
    return tip


PRINT_TIP = print_tip()


def build():
    _RENDER.clear()
    out = {}
    paths = []

    def add(lang, rel, text, index=True):
        full = prefix(lang) + rel
        out[(full.lstrip('/') + 'index.html')] = text
        if index:
            paths.append(full)

    for lang in ('en', 'ko'):
        for key in ('make', 'wifi', 'vcard'):
            add(lang, *tool_page(lang, key))
        add(lang, *bulk_page(lang))
        add(lang, *scan_page(lang))
        if has_guide(lang):
            add(lang, *guide_index(lang))
        for a in arts(lang):
            add(lang, *article_page(lang, a))
        for key in ('about', 'privacy'):
            add(lang, *doc_page(lang, key))
    out['404.html'] = not_found()
    out = run_render(out)
    out = {rel: guide_links(text) for rel, text in out.items()}
    # 가이드 주소는 이 사이트가 301 로 넘기므로 sitemap 에 넣지 않는다(paths 에는 남겨 check.py 가 가이드 HTML 도 본다)
    out['sitemap.xml'] = sitemap([p for p in paths if not is_guide(p)])
    return out, paths


def main():
    out, paths = build()
    check = '--check' in sys.argv
    stale = []
    for rel, text in out.items():
        f = ROOT / rel
        if check:
            if not f.exists() or f.read_text(encoding='utf-8') != text:
                stale.append(rel)
            continue
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(text, encoding='utf-8')
    # 빌드가 만들지 않는 옛 페이지(가이드 글이 빠졌을 때 등)는 지운다: 폴더 주소의 index.html 중 out 에 없는 것
    keep = set(out)
    for f in list(ROOT.glob('**/index.html')):
        rel = f.relative_to(ROOT).as_posix()
        if rel.startswith(('_dev/', 'tests/', 'assets/')) or rel in keep:
            continue
        if check:
            stale.append(rel + '(지울 것)')
        else:
            f.unlink()
            try:
                f.parent.rmdir()
            except OSError:
                pass
    if check:
        if stale:
            print('빌드 결과가 낡았어요(python3 qr/_dev/build.py 를 다시 돌리세요):', ', '.join(stale))
            sys.exit(1)
        print(f'빌드 결과 최신({len(out)}개 파일)')
        return
    print(f'built {len(paths)} pages + 404, sitemap')


if __name__ == '__main__':
    main()
