#!/usr/bin/env python3
"""체크벤치(check.lumenlab.page) 페이지 전부 만들기: python3 check/_dev/build.py   (--check 는 낡았는지만 본다)

- 화면 글자 = _dev/content.json(공통·첫 화면·도구 8개·소개·방침), 글 = _dev/articles.json.
- 자판 그림은 assets/ck-keys.js 의 배열 표를 node로 읽어 SVG로 그려 첫 HTML에 넣는다(배포 때는 빌드 없음. 이 스크립트는 만들 때만 돈다).
- 만드는 것: 영어 / , 한국어 /ko/ 의 첫 화면·도구 8개·가이드 목록·글·소개·방침, 404.html, sitemap.xml, rss.xml(한국어 글).
- 만든 파일은 손으로 고치지 않는다. lastmod 는 UPDATED 에 실제로 고친 날만 적는다.
"""
import html
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
SITE = 'https://check.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
FIRST = '2026-10-10'          # 처음 올린 날
UPDATED = {}                  # 주소: 'YYYY-MM-DD' (본문·구조화 데이터·링크가 바뀐 날만)

C = json.loads((DEV / 'content.json').read_text(encoding='utf-8'))
A = json.loads((DEV / 'articles.json').read_text(encoding='utf-8')) if (DEV / 'articles.json').exists() else {'en': [], 'ko': []}
UI, T = C['ui'], C['t']
TOOLS = ['kb', 'mouse', 'mic', 'cam', 'spk', 'px', 'hz', 'pad']
SLUG = {k: C['tools'][k]['slug'] for k in TOOLS}
PAIRS = {'': '', 'guide/': 'guide/', 'about/': 'about/', 'privacy/': 'privacy/', **{SLUG[k] + '/': SLUG[k] + '/' for k in TOOLS}}
SCRIPTS = {'home': ['ck-keys', 'ck-measure', 'app', 'media'], 'kb': ['ck-keys', 'app'], 'mouse': ['ck-keys', 'ck-measure', 'app'],
           'mic': ['ck-measure', 'app', 'media'], 'cam': ['ck-measure', 'app', 'media'], 'spk': ['ck-measure', 'app', 'media'],
           'px': ['app', 'screen'], 'hz': ['ck-measure', 'app'], 'pad': ['ck-measure', 'app'], 'doc': ['app']}
esc = lambda s: html.escape(str(s), quote=True)


def layouts():
    js = ("const CK=require('./assets/ck-keys.js');const o={};for(const id of CK.LAYOUT_IDS){const l=CK.layout(id);"
          "o[id]={width:l.width,height:l.height,os:l.os,detectable:l.detectable,keys:l.keys};}process.stdout.write(JSON.stringify(o));")
    return json.loads(subprocess.run(['node', '-e', js], cwd=ROOT, check=True, capture_output=True, text=True).stdout)


LAY = layouts()

# ── 그림 조각 ────────────────────────────────────────────────
LOGO = '<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect class="lg-b" width="26" height="26" rx="7"/><circle class="lg-r" cx="13" cy="13" r="7.2"/><circle class="lg-d" cx="13" cy="13" r="4.2"/></svg>'
LOCK = '<svg width="15" height="16" viewBox="0 0 16 18" aria-hidden="true"><rect x="2" y="8" width="12" height="9" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 8V5.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
SPK = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6h2.2L8 3.2v9.6L4.7 10H2.5z" fill="currentColor"/><path d="M10.6 5.6a3.4 3.4 0 0 1 0 4.8M12.4 3.8a6 6 0 0 1 0 8.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
LAMP = '<span class="lamp" aria-hidden="true"></span>'
PRE = ("<script>(function(d){var h=d.documentElement,p=(navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||'',m=/mac|iphone|ipad|ipod/i.test(p),l=null;"
       "h.setAttribute('data-os',m?'mac':'pc');try{l=localStorage.getItem('ck.layout')}catch(e){}if(!/^(full|iso|tkl|mac)$/.test(l||''))l=m?'mac':'full';h.setAttribute('data-kb',l);"
       "if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))h.classList.add('anim')})(document)</script>")

KEY_TXT = {'Escape': 'Esc', 'Backspace': 'Backspace', 'Tab': 'Tab', 'CapsLock': 'Caps', 'Enter': 'Enter', 'ShiftLeft': 'Shift', 'ShiftRight': 'Shift', 'ControlLeft': 'Ctrl',
           'ControlRight': 'Ctrl', 'MetaLeft': 'Win', 'MetaRight': 'Win', 'AltLeft': 'Alt', 'AltRight': 'Alt', 'ContextMenu': 'Menu', 'Space': '', 'PrintScreen': 'PrtSc',
           'ScrollLock': 'ScrLk', 'Pause': 'Pause', 'Insert': 'Ins', 'Home': 'Home', 'PageUp': 'PgUp', 'Delete': 'Del', 'End': 'End', 'PageDown': 'PgDn', 'NumLock': 'Num',
           'NumpadEnter': 'Enter', 'Backquote': '`', 'Minus': '-', 'Equal': '=', 'BracketLeft': '[', 'BracketRight': ']', 'Backslash': '\\', 'Semicolon': ';', 'Quote': "'",
           'Comma': ',', 'Period': '.', 'Slash': '/', 'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→', 'NumpadDivide': '/', 'NumpadMultiply': '*',
           'NumpadSubtract': '-', 'NumpadAdd': '+', 'NumpadDecimal': '.', 'IntlBackslash': '\\'}
KEY_MAC = {'Escape': 'esc', 'Backspace': 'delete', 'Tab': 'tab', 'CapsLock': 'caps', 'Enter': 'return', 'ShiftLeft': 'shift', 'ShiftRight': 'shift', 'Fn': 'fn',
           'ControlLeft': '⌃', 'AltLeft': '⌥', 'AltRight': '⌥', 'MetaLeft': '⌘', 'MetaRight': '⌘', 'Power': ''}
KEY_KO = {'AltRight': '한/영', 'ControlRight': '한자'}


def key_label(code, layout, lang):
    if layout == 'mac' and code in KEY_MAC:
        return KEY_MAC[code]
    if layout == 'iso' and code == 'Backslash':
        return '#'
    if lang == 'ko' and layout != 'mac' and code in KEY_KO:
        return KEY_KO[code]
    if code in KEY_TXT:
        return KEY_TXT[code]
    if code.startswith('Key'):
        return code[3:]
    if code.startswith('Digit') or (code.startswith('Numpad') and code[6:].isdigit()):
        return code[-1]
    return code


def kb_svg(layout, lang, cls=''):
    """키 너비 1 = 40. 키 하나 = 아래 그림자(ke) + 윗면(kt) + 글자. 줄 묶음(g.row)은 '불 지나가기' 연출이 쓴다."""
    L, U = LAY[layout], 40
    rows = {}
    for k in L['keys']:
        x, y, w, h = k['x'] * U + 2, k['y'] * U + 2, k['w'] * U - 4, k['h'] * U - 5
        label = key_label(k['code'], layout, lang)
        wide = ' key--w' if len(label) > 1 else ''
        na = '' if k['detectable'] else ' key--na'
        if k.get('ext'):   # ISO 엔터: 윗줄에서 왼쪽으로 더 나온 꼴
            e = k['ext']
            xl, yt, xr, yb, xm, ym, r = e['x'] * U + 2, y, x + w, y + h, x, e['y'] * U + e['h'] * U - 3, 6
            def path(dy):
                return (f'M{xl + r} {yt + dy}H{xr - r}a{r} {r} 0 0 1 {r} {r}V{yb + dy - r}a{r} {r} 0 0 1 -{r} {r}H{xm + r}a{r} {r} 0 0 1 -{r} -{r}V{ym + dy + r}'
                        f'a{r} {r} 0 0 0 -{r} -{r}H{xl + r}a{r} {r} 0 0 1 -{r} -{r}V{yt + dy + r}a{r} {r} 0 0 1 {r} -{r}Z')
            shape = f'<path class="ke" d="{path(2)}"/><path class="kt" d="{path(0)}"/>'
            tx, ty = (xl + xr) / 2, yt + (k['ext']['h'] * U - 5) / 2 + 0.5
        else:
            shape = f'<rect class="ke" x="{x:g}" y="{y + 2:g}" width="{w:g}" height="{h:g}" rx="6"/><rect class="kt" x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="6"/>'
            tx, ty = x + w / 2, y + h / 2 + 0.5
        text = f'<text x="{tx:g}" y="{ty:g}">{esc(label)}</text>' if label else ''
        rows.setdefault(k['y'], []).append(f'<g class="key{wide}{na}" data-code="{k["code"]}">{shape}{text}</g>')
    glow = lambda i, y: '' if 'kb--home' in cls else f'<rect class="glow" style="--r:{i}" x="2" y="{y * U + 2:g}" width="{L["width"] * U - 4:g}" height="{U - 5}" rx="8"/>'
    body = ''.join(f'<g class="row">{"".join(v)}{glow(i, y)}</g>' for i, (y, v) in enumerate(sorted(rows.items())))
    return (f'<svg class="kb kb--{layout} {cls}" data-kb data-layout="{layout}" viewBox="0 0 {L["width"] * U:g} {L["height"] * U:g}" '
            f'role="img" aria-label="{esc(UI[lang]["kb_label"])}">{body}</svg>')


def mouse_svg(lang, uid='m'):
    return f'''<svg class="mouse" viewBox="0 0 150 212" role="img" aria-label="{esc(UI[lang]['mouse_label'])}">
<defs><clipPath id="clip-{uid}"><rect x="24" y="6" width="112" height="200" rx="56"/></clipPath></defs>
<rect class="m-part" data-m="4" x="12" y="78" width="16" height="26" rx="5"/><rect class="m-part" data-m="3" x="12" y="108" width="16" height="26" rx="5"/>
<rect class="m-body" x="24" y="6" width="112" height="200" rx="56"/>
<g clip-path="url(#clip-{uid})"><rect class="m-part" data-m="0" x="24" y="6" width="55" height="84"/><rect class="m-part" data-m="2" x="81" y="6" width="55" height="84"/></g>
<rect class="m-edge" x="24" y="6" width="112" height="200" rx="56"/>
<rect class="m-part" data-m="1" x="70" y="28" width="20" height="42" rx="10"/>
<path class="m-tick" data-m-wheel="up" d="M75 44l5-5 5 5"/><path class="m-tick" data-m-wheel="down" d="M75 54l5 5 5-5"/>
</svg>'''


# ── 주소·짝 ─────────────────────────────────────────────────
def prefix(lang):
    return '/ko/' if lang == 'ko' else '/'


def url(lang, path=''):
    return SITE + prefix(lang) + path


def alt_of(lang, path):
    if lang == 'en':
        if path in PAIRS:
            return PAIRS[path]
        for a in A['en']:
            if path == f'guide/{a["slug"]}/' and a.get('pair'):
                return f'guide/{a["pair"]}/'
    else:
        for k, v in PAIRS.items():
            if v == path:
                return k
        for a in A['en']:
            if a.get('pair') and path == f'guide/{a["pair"]}/':
                return f'guide/{a["slug"]}/'
    return None


# ── 틀 ─────────────────────────────────────────────────────
def head(lang, title, desc, path, jsonld=(), og_type='website', noindex=False, ads=True, scripts=()):
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
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{'<meta name="robots" content="noindex">' + chr(10) if noindex else ''}<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#172027" media="(prefers-color-scheme: dark)">
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
{PRE}
{ld}{ad}{''.join(f'<script defer src="/assets/{s}.js"></script>{chr(10)}' for s in scripts)}</head>'''


def header(lang, path, current=None):
    u, p = UI[lang], prefix(lang)
    other = 'en' if lang == 'ko' else 'ko'
    alt = alt_of(lang, path)
    cur = lambda k: ' aria-current="page"' if k == current else ''
    return f'''<a class="skip" href="#main">{u['skip']}</a>
<header class="top"><div class="wrap top-in">
  <a class="logo" href="{p}">{LOGO}<span>{u['brand']}</span></a>
  <nav class="top-nav" aria-label="{u['nav_label']}"><a class="nav-home" href="{p}"{cur('home')}>{u['home']}</a><a href="{p}guide/"{cur('guide')}>{u['guides']}</a><a class="wide" href="{p}about/"{cur('about')}>{u['about']}</a><a href="{prefix(other)}{alt if alt is not None else ''}" lang="{other}" hreflang="{other}">{u['lang_other']}</a></nav>
</div></header>'''


def strip(lang, current):
    u, p = UI[lang], prefix(lang)
    items = ''.join(f'<a href="{p}{SLUG[k]}/" data-dev="{k}"{" aria-current=" + chr(34) + "page" + chr(34) if k == current else ""}>{LAMP}{esc(C["tools"][k][lang]["name"])}</a>' for k in TOOLS)
    return f'<nav class="strip" aria-label="{u["strip_label"]}"><div class="wrap strip-in">{items}</div></nav>'


def footer(lang):
    u, p = UI[lang], prefix(lang)
    home = 'https://lumenlab.page/' + ('en/' if lang == 'en' else '')
    lamps = ''.join(f'<i style="--i:{i}"></i>' for i in range(5))
    tools = ''.join(f'<a href="{p}{SLUG[k]}/">{esc(C["tools"][k][lang]["h1"])}</a>' for k in TOOLS)
    return f'''<footer class="foot"><div class="wrap">
  <a class="lumen" href="{home}" data-lumen><span class="lumen-lamps" aria-hidden="true">{lamps}</span><span class="lumen-t"><b>{u['lumen_b']}</b><small>{u['lumen_s']}</small></span><span class="lumen-go" aria-hidden="true">→</span></a>
  <p class="foot-links">{tools}</p>
  <p class="foot-links"><a href="{p}guide/">{u['guides']}</a><a href="{p}about/">{u['about']}</a><a href="{p}privacy/">{u['privacy']}</a><a href="mailto:woxocoso@gmail.com">{u['contact']}</a></p>
  <small>© 2026 Lumen Lab</small>
</div></footer>'''


def ad_slot(lang, name):
    """광고 자리. 폭은 본문 글 기둥과 같다. 높이는 ads-config.js 가 첫 그림 전에 잡는다."""
    return f'<div class="ad-wrap wrap" data-slot="{name}"><div class="ad-in"><p class="ad-label">{UI[lang]["ad"]}</p><div class="ad-slot" data-ad="{name}" hidden></div></div></div>'


def page(lang, head_html, body, path, current=None, cfg=None, strip_cur=None, cls=''):
    other = 'en' if lang == 'ko' else 'ko'
    alt = alt_of(lang, path)
    base = {'lang': lang, 'page': 'doc', 't': {'close': UI[lang]['close']}, 'other': prefix(other) + (alt if alt is not None else ''), 'otherLabel': UI[lang]['lang_offer']}
    base.update(cfg or {})
    cfg_html = '<script type="application/json" id="ck">' + json.dumps(base, ensure_ascii=False).replace('</', '<\\/') + '</script>'
    return f'''{head_html}
<body{' class="' + cls + '"' if cls else ''}>
{header(lang, path, current)}
{strip(lang, strip_cur) if strip_cur else ''}
<main id="main">
{body}
</main>
{footer(lang)}
{cfg_html}
</body>
</html>
'''


def verdict(dev, main, sub):
    return (f'<div class="verdict">{LAMP}<div class="v-text"><p class="v-main" data-v="{dev}" aria-live="polite">{esc(main)}</p>'
            f'<p class="v-sub" data-vs="{dev}">{esc(sub)}</p></div></div>')


def faq_html(lang, faq, after=''):
    return (f'<section class="faq wrap narrow"><h2>{UI[lang]["faq"]}</h2>'
            + ''.join(f'<details><summary>{esc(q["q"])}</summary><p>{esc(q["a"])}</p></details>' for q in faq) + after + '</section>')


def app_ld(lang, name, desc, path):
    return {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': name, 'url': url(lang, path), 'applicationCategory': 'UtilitiesApplication',
            'operatingSystem': 'Any', 'browserRequirements': 'Requires a modern web browser', 'inLanguage': lang, 'isAccessibleForFree': True, 'description': desc,
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' if lang == 'en' else 'KRW'},
            'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}}


def guides_block(lang, slugs=None):
    p = prefix(lang)
    arts = [a for a in A[lang] if slugs is None or a['slug'] in slugs]
    if not arts:
        return ''
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/">{esc(a["h1"])}</a><span>{esc(a["desc"])}</span></li>' for a in arts)
    return f'<section class="guides wrap narrow" id="guides"><h2>{UI[lang]["guides_h"]}</h2><ul class="guide-list">{items}</ul></section>'


def tools_block(lang, current=None, hid='all'):
    p = prefix(lang)
    items = ''.join(f'<li><a href="{p}{SLUG[k]}/">{esc(C["tools"][k][lang]["h1"])}</a><span>{esc(C["tools"][k][lang]["short"])}</span></li>' for k in TOOLS if k != current)
    return f'<ul class="tool-list">{items}</ul>'


# ── 기기 위젯(첫 화면과 도구 쪽이 같이 쓴다) ─────────────────────
def meter(lab=None):
    scale = (f'<div class="meter-scale"><span>{lab["quiet"]}</span><span>{lab["loud"]}</span><span class="clip">{lab["clip"]}</span></div>' if lab else '')
    return f'<div class="meter" data-mic-meter><i></i><b></b></div>{scale}'


def finder(btn_label, larger='', stop=''):
    """카메라 창. 첫 화면에서는 '끄기'와 '크게 보기'를 창 안 모서리에 얹는다(켜져도 칸 높이가 그대로)."""
    more = f'<button type="button" class="btn btn--dark btn--sm finder-more" data-act="cam-large" hidden>{larger}</button>' if larger else ''
    more += f'<button type="button" class="btn btn--dark btn--sm finder-stop" data-act="cam-stop" hidden>{stop}</button>' if stop else ''
    return (f'<div class="finder" data-cam-box><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>'
            f'<video data-cam-video muted playsinline hidden></video><button type="button" class="btn" data-act="cam">{btn_label}</button>{more}</div>')


# ════════ 첫 화면: 한 화면 점검판 ════════
def home_page(lang):
    u, t, h, p = UI[lang], T[lang], C['home'][lang], prefix(lang)
    go = lambda k, tool: f'<a class="go" href="{p}{SLUG[tool]}/">{esc(h["go"][k])}</a>'
    ph = lambda dev, do=False: (f'<div class="p-head">{LAMP}<h2>{h["panel"]["screen" if dev == "hz" else dev]}</h2>'
                                f'<p class="p-state{" p-state--do" if do else ""}" data-state="{dev}">{h["idle"]["screen" if dev == "hz" else dev]}</p></div>')
    chips = ''.join(f'<span class="chip" data-m="{i}">{b}</span>' for i, b in enumerate(t['m_btn']))
    body = f'''<div class="wrap bench-head">
  <div><h1>{h['h1']}</h1><p class="lead"><span class="for-desk">{h['lead_desk']}</span><span class="for-touch">{h['lead_touch']}</span></p></div>
  <div class="bench-side"><p class="stays stays--pill">{LOCK}<span>{u['stays_pill']}</span></p><p class="tally" data-tally-text>{t['tally'].replace('%1', '<b class="num" data-tally>0</b>')}</p></div>
</div>
<div class="wrap bench">
  <section class="panel p-kb" data-dev="kb">
    <div class="p-head">{LAMP}<h2>{h['panel']['kb']}</h2><label class="kb-pick"><span class="vh">{u['kb_layout']}</span><select data-kb-layout>{''.join(f'<option value="{k}">{esc(u["layouts"][k])}</option>' for k in ('full', 'iso', 'tkl', 'mac'))}</select></label><p class="p-state p-state--do" data-state="kb">{h['idle']['kb']}</p></div>
    <div class="kb-well">{''.join(kb_svg(k, lang, 'kb--home') for k in ('full', 'iso', 'tkl', 'mac'))}</div>
    <div class="p-foot"><div class="swap"><p class="note" data-kb-empty>{h['kb_hint']}</p><p class="said" data-v="kb" data-kb-live></p></div>{go('kb', 'kb')}</div>
  </section>
  <section class="panel p-mouse" data-dev="mouse" data-mouse-area>
    {ph('mouse', True)}
    <div class="m-wrap"><div class="m-pic">{mouse_svg(lang)}</div><div class="m-read">
      <div class="chips">{chips}</div>
      <dl class="m-dl"><div><dt>{h['m_rows']['wheel']}</dt><dd><span class="chip" data-m-wheel="up">↑</span> <span class="chip" data-m-wheel="down">↓</span></dd></div>
      <div><dt>{h['m_rows']['rate']}</dt><dd><b class="num is-idle" data-m-rate>{t['m_rate_idle']}</b></dd></div>
      <div><dt>{h['m_rows']['dbl']}</dt><dd><b class="is-idle" data-m-dbl>{t['m_dbl_idle']}</b></dd></div></dl></div></div>
    <div class="p-foot">{go('mouse', 'mouse')}</div>
  </section>
  <section class="panel p-pad" data-dev="pad">
    <div class="p-head">{LAMP}<h2>{h['panel']['pad']}</h2>{go('pad', 'pad')}</div>
    <p class="pad-state" data-state="pad">{h['idle']['pad']}</p>
  </section>
  <section class="panel p-mic" data-dev="mic">
    {ph('mic')}
    <div class="mic-row"><button type="button" class="btn" data-act="mic">{h['mic_btn']}</button><button type="button" class="btn btn--line" data-act="mic-stop" hidden>{h['stop']}</button></div>
    {meter()}
    <div class="p-foot"><span class="note" data-note="mic">{u['asks']}</span>{go('mic', 'mic')}</div>
  </section>
  <section class="panel p-cam" data-dev="cam">
    {ph('cam')}
    {finder(h['cam_btn'], h['larger'], h['stop'])}
    <div class="p-foot"><span class="note" data-note="cam">{u['asks']}</span>{go('cam', 'cam')}</div>
  </section>
  <section class="panel p-spk" data-dev="spk">
    {ph('spk')}
    <div class="spk"><button type="button" class="btn btn--line" data-act="spk-left">{SPK}{h['left']}</button><button type="button" class="btn btn--line" data-act="spk-right">{h['right']}{SPK.replace('<svg ', '<svg class="flip" ')}</button></div>
    <div class="p-foot"><span class="note">{h['quiet']}</span>{go('spk', 'spk')}</div>
  </section>
  <section class="panel p-screen" data-dev="hz">
    {ph('hz')}
    <div class="scr"><p class="hz"><b data-hz>··</b><span>Hz</span></p><p class="note num"><span data-res>&nbsp;</span> px</p></div>
    <div class="p-foot">{go('hz', 'hz')}{go('px', 'px')}</div>
  </section>
  <p class="desk-note">{u['desk_note']} <a href="{p}{SLUG['kb']}/">{esc(h['go']['kb'])}</a> · <a href="{p}{SLUG['mouse']}/">{esc(h['go']['mouse'])}</a></p>
</div>
<dialog class="cam-dialog" data-cam-dialog><div class="cam-dialog-in"><video data-cam-big muted playsinline></video><button type="button" class="btn btn--dark" data-act="cam-large-close">{u['close']}</button></div></dialog>
<section class="wrap narrow sec" id="all"><h2>{h['all_h']}</h2><p>{h['all_p']}</p>{tools_block(lang)}</section>
{ad_slot(lang, 'mid')}
<section class="wrap narrow sec"><h2>{h['why_h']}</h2>{''.join(f'<p>{esc(x)}</p>' for x in h['why'])}</section>
{guides_block(lang)}
{ad_slot(lang, 'bottom')}'''
    ld = [{'@context': 'https://schema.org', '@type': 'WebSite', 'name': u['brand'], 'url': url(lang), 'inLanguage': lang}, app_ld(lang, u['brand'], h['desc'], '')]
    cfg = {'page': 'home', 'auto': u['auto'], 't': {**t, 'close': u['close'], 'asks': u['asks'], 'stays_on': u['stays_on'], 'off_note': u['off_note']}}
    return page(lang, head(lang, h['title'], h['desc'], '', jsonld=ld, scripts=SCRIPTS['home']), body, '', current='home', cfg=cfg, cls='home')


# ════════ 도구 쪽: 기기 띠 + 큰 무대 ════════
def stage_kb(lang, c):
    u, t, lb = UI[lang], T[lang], c['labels']
    opts = ''.join(f'<option value="{k}">{esc(u["layouts"][k])}</option>' for k in ('full', 'iso', 'tkl', 'mac'))
    svgs = ''.join(kb_svg(k, lang) for k in ('full', 'iso', 'tkl', 'mac'))
    return f'''<section class="stage stage--kb" data-dev="kb" id="tool">
  <div class="stage-top">{verdict('kb', t['kb_idle'], t['kb_idle_s'])}
    <div class="stage-ctl"><label class="sel"><span>{u['kb_layout']}</span><select data-kb-layout>{opts}</select></label><button type="button" class="btn btn--line btn--sm" data-act="kb-reset">{lb['reset']}</button></div></div>
  <div class="kb-well" data-kb-area>{svgs}</div>
  <p class="cap" data-kb-cap>{t['kb_cap_on']}</p>
  <dl class="facts"><div><dt>{lb['seen']}</dt><dd class="num" data-kb-count>&nbsp;</dd></div><div><dt>{lb['max']}</dt><dd data-kb-max>{t['kb_max0']}</dd></div>
    <div><dt>{lb['chatter']}</dt><dd data-kb-chatter>{t['kb_chat0']}</dd></div><div><dt>{lb['held']}</dt><dd data-kb-held>{t['kb_heldnone']}</dd></div></dl>
  <details class="more"><summary>{u['details']}</summary><div class="more-in">
    <dl class="kv"><div><dt>{lb['key']}</dt><dd data-kb-key>·</dd></div><div><dt>{lb['code']}</dt><dd data-kb-code>·</dd></div><div><dt>{lb['extra']}</dt><dd class="chips" data-kb-extra>{t['kb_extra_none']}</dd></div></dl>
    <p class="thr"><label>{lb['thr']} <input type="number" min="5" max="200" step="1" value="30" inputmode="numeric" data-kb-thr> {lb['ms']}</label></p>
    <p class="note">{u['legend_note']}</p>
    <h3>{lb['log']}</h3><ol class="log" data-kb-log></ol>
  </div></details>
</section>'''


def stage_mouse(lang, c):
    u, t, lb = UI[lang], T[lang], c['labels']
    chips = ''.join(f'<span class="chip chip--n" data-m="{i}">{b}<b class="num" data-m-n="{i}"></b></span>' for i, b in enumerate(t['m_btn']))
    return f'''<section class="stage stage--mouse" data-dev="mouse" data-mouse-area id="tool">
  <div class="stage-top">{verdict('mouse', t['m_idle'], t['m_idle_s'])}<div class="stage-ctl"><button type="button" class="btn btn--line btn--sm" data-act="mouse-reset">{lb['reset']}</button></div></div>
  <div class="m-wrap"><div class="m-pic">{mouse_svg(lang)}</div><div class="m-read">
    <p class="m-h">{lb['buttons']}</p><div class="chips">{chips}</div>
    <dl class="m-dl"><div><dt>{lb['wheel']}</dt><dd><span class="chip chip--n" data-m-wheel="up">↑ {lb['up']}<b class="num" data-m-wn="up"></b></span> <span class="chip chip--n" data-m-wheel="down">↓ {lb['down']}<b class="num" data-m-wn="down"></b></span></dd></div>
    <div><dt>{lb['rate']}</dt><dd><b class="num is-idle" data-m-rate>{t['m_rate_idle']}</b></dd></div>
    <div><dt>{lb['dbl']}</dt><dd><b class="is-idle" data-m-dbl>{t['m_dbl_idle']}</b></dd></div></dl></div></div>
  <details class="more"><summary>{u['details']}</summary><div class="more-in">
    <p class="thr"><label>{lb['thr']} <input type="number" min="5" max="200" step="1" value="50" inputmode="numeric" data-m-thr> {lb['ms']}</label></p>
    <p class="note" data-m-cap hidden>{t['m_framecap']}</p>
  </div></details>
</section>'''


def stage_mic(lang, c):
    u, t, lb = UI[lang], T[lang], c['labels']
    return f'''<section class="stage stage--mic" data-dev="mic" id="tool">
  <div class="stage-top">{verdict('mic', t['mic_idle'], t['mic_idle_s'])}</div>
  <div class="act-row"><button type="button" class="btn btn--big" data-act="mic">{lb['start']}</button><button type="button" class="btn btn--line btn--big" data-act="mic-stop" hidden>{lb['stop']}</button><span class="stays" data-on-note="mic" hidden>{LOCK}<span>{u['stays_on']}</span></span></div>
  {meter(lb)}
  <div class="mic-more" data-mic-more hidden>
    <label class="sel"><span>{lb['device']}</span><select data-mic-device disabled><option>{t['mic_default']}</option></select></label>
    <div class="rec"><h2>{lb['rec_h']}</h2><div class="rec-row"><button type="button" class="btn btn--line" data-act="mic-rec" disabled>{lb['rec']}</button><audio controls data-mic-audio hidden></audio><button type="button" class="btn btn--line btn--sm" data-act="mic-del" hidden>{lb['del']}</button></div><p class="note" data-mic-rec-state>&nbsp;</p></div>
  </div>
  <details class="more"><summary>{u['details']}</summary><div class="more-in">
    <dl class="kv"><div><dt>{lb['level']}</dt><dd class="num"><span data-mic-db>·</span> dBFS</dd></div><div><dt>{lb['peak']}</dt><dd class="num"><span data-mic-peak>·</span> dBFS</dd></div><div><dt>{lb['format']}</dt><dd data-mic-info>·</dd></div></dl>
    <p><button type="button" class="btn btn--line btn--sm" data-act="mic-noise" disabled>{lb['noise']}</button> <span class="note" data-mic-noise></span></p>
  </div></details>
</section>'''


def stage_cam(lang, c):
    u, t, lb = UI[lang], T[lang], c['labels']
    return f'''<section class="stage stage--cam" data-dev="cam" id="tool">
  <div class="stage-top">{verdict('cam', t['cam_idle'], t['cam_idle_s'])}</div>
  {finder(lb['start'])}
  <div class="act-row" data-cam-tools hidden><button type="button" class="btn btn--line" data-act="cam-stop" data-keep disabled>{lb['stop']}</button><button type="button" class="btn btn--line" data-act="cam-mirror" aria-pressed="false" disabled>{lb['mirror']}</button><button type="button" class="btn btn--line" data-act="cam-photo" disabled>{lb['photo']}</button>
    <label class="sel"><span>{lb['device']}</span><select data-cam-device disabled><option>{t['cam_default']}</option></select></label><span class="stays" data-on-note="cam">{LOCK}<span>{u['stays_on']}</span></span></div>
  <div class="shot" data-cam-shot hidden><img alt="" data-cam-img><div><p class="note">{t['cam_photo']}</p><a class="btn btn--line btn--sm" data-cam-save download="checkbench-photo.png" href="#tool">{lb['save']}</a></div></div>
  <details class="more"><summary>{u['details']}</summary><div class="more-in">
    <dl class="kv"><div><dt>{lb['setting']}</dt><dd class="num" data-cam-set>·</dd></div><div><dt>{lb['measured']}</dt><dd class="num" data-cam-meas>·</dd></div></dl>
  </div></details>
</section>'''


def stage_spk(lang, c):
    u, t, lb = UI[lang], T[lang], c['labels']
    return f'''<section class="stage stage--spk" data-dev="spk" id="tool">
  <div class="stage-top">{verdict('spk', t['spk_idle'], t['spk_idle_s'])}</div>
  <div class="spk spk--big"><button type="button" class="btn btn--line" data-act="spk-left">{SPK}{lb['left']}</button><button type="button" class="btn btn--line" data-act="spk-both">{lb['both']}</button><button type="button" class="btn btn--line" data-act="spk-right">{lb['right']}{SPK.replace('<svg ', '<svg class="flip" ')}</button></div>
  <label class="vol"><span>{lb['volume']}</span><span class="vol-in"><small>{lb['low']}</small><input type="range" min="0.02" max="0.5" step="0.01" value="0.1" data-spk-vol><small>{lb['high']}</small></span></label>
  <div class="sweep"><button type="button" class="btn btn--line" data-act="spk-sweep">{lb['sweep']}</button><button type="button" class="btn btn--line" data-act="spk-stop" hidden>{lb['stop']}</button><p class="note">{lb['sweep_note']}</p></div>
</section>'''


def stage_px(lang, c):
    u, t, lb = UI[lang], T[lang], c['labels']
    sw = ''.join(f'<label class="sw"><input type="radio" name="px" value="{i}"{" checked" if i == 0 else ""}><i class="sw-c sw-{i}"></i><span>{n}</span></label>' for i, n in enumerate(t['px_names']))
    return f'''<section class="stage stage--px" data-dev="px" id="tool">
  <div class="stage-top">{verdict('px', t['px_idle'], t['px_idle_s'])}</div>
  <fieldset class="sws"><legend>{lb['from']}</legend>{sw}</fieldset>
  <div class="act-row"><button type="button" class="btn btn--big" data-act="px-start">{lb['start']}</button></div>
  <p class="note">{lb['next']}</p>
</section>
<div class="px-full" data-px-full hidden></div>'''


def stage_hz(lang, c):
    u, t, lb = UI[lang], T[lang], c['labels']
    return f'''<section class="stage stage--hz" data-dev="hz" id="tool">
  <div class="stage-top">{verdict('hz', t['hz_wait'], ' ')}</div>
  <div class="hz-row"><p class="hz hz--big"><b data-hz>··</b><span>Hz</span></p><div class="act-row"><button type="button" class="btn btn--line" data-act="hz-again">{lb['again']}</button><button type="button" class="btn btn--line" data-act="hz-bar" data-alt="{esc(lb['bar_stop'])}">{lb['bar']}</button></div></div>
  <div class="band" data-band aria-hidden="true"><i></i></div>
  <p class="note">{lb['bar_note']}</p>
  <details class="more"><summary>{u['details']}</summary><div class="more-in">
    <dl class="kv"><div><dt>{lb['frame']}</dt><dd class="num" data-hz-ms>·</dd></div><div><dt>{lb['samples']}</dt><dd class="num" data-hz-n>·</dd></div><div><dt>{lb['stable']}</dt><dd class="num" data-hz-stable>·</dd></div><div><dt>{lb['size']}</dt><dd class="num"><span data-res>·</span> px</dd></div></dl>
  </div></details>
</section>'''


def stage_pad(lang, c):
    u, t, lb = UI[lang], T[lang], c['labels']
    btns = ''.join(f'<li class="pb" data-pb="{i}"><span data-pb-name="{i}">{esc(n)}</span><b class="num" data-pb-v="{i}"></b></li>' for i, n in enumerate(t['pad_btn']))
    stick = lambda i: (f'<div class="stick"><p>{t["pad_sticks"][i]}</p><div class="dial"><i data-stick="{i}"></i></div><p class="num note" data-stick-v="{i}">0.00, 0.00</p></div>')
    return f'''<section class="stage stage--pad" data-dev="pad" id="tool">
  <div class="stage-top">{verdict('pad', t['pad_idle'], t['pad_idle_s'])}</div>
  <div class="pad-grid"><div><p class="m-h">{lb['buttons']}</p><ul class="pbs" data-pbs>{btns}</ul></div><div><p class="m-h">{lb['sticks']}</p><div class="sticks">{stick(0)}{stick(1)}</div></div></div>
  <div class="drift"><h2>{lb['drift_h']}</h2><div class="act-row"><button type="button" class="btn btn--line" data-act="pad-drift" disabled>{lb['drift']}</button><button type="button" class="btn btn--line" data-act="pad-rumble" hidden>{lb['rumble']}</button></div>
    <p class="said" data-pad-drift>{lb['drift_idle']}</p><p class="note">{lb['rule']}</p></div>
</section>'''


STAGE = {'kb': stage_kb, 'mouse': stage_mouse, 'mic': stage_mic, 'cam': stage_cam, 'spk': stage_spk, 'px': stage_px, 'hz': stage_hz, 'pad': stage_pad}
RELATED = {'kb': ['keyboard-double-typing', 'n-key-rollover-ghosting', 'keyboard-chattering', 'dongsi-ipryeok-rollover'], 'mic': ['microphone-not-working-browser', 'maikeu-an-japil-ttae'],
           'cam': ['microphone-not-working-browser', 'maikeu-an-japil-ttae'], 'px': ['check-new-monitor-dead-pixels', 'bulryang-hwaso-hwagin'], 'hz': ['check-new-monitor-dead-pixels', 'bulryang-hwaso-hwagin']}


def tool_page(lang, key):
    u, t, c, p = UI[lang], T[lang], C['tools'][key][lang], prefix(lang)
    path = SLUG[key] + '/'
    how = ''.join(f'<li>{esc(x)}</li>' for x in c['how'])
    secs = ''.join(f'<h2>{esc(s["h"])}</h2>' + ''.join(f'<p>{esc(x)}</p>' for x in s['p']) for s in c['sections'])
    ld = [app_ld(lang, c['h1'], c['desc'], path),
          {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
              {'@type': 'ListItem', 'position': 1, 'name': u['home'], 'item': url(lang)}, {'@type': 'ListItem', 'position': 2, 'name': c['h1'], 'item': url(lang, path)}]},
          {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
              {'@type': 'Question', 'name': q['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': q['a']}} for q in c['faq']]}]
    touch = f'<p class="touch-note">{esc(c["touch_note"])}</p>' if c.get('touch_note') else ''
    # 공식 출처를 확인한 사실에는 출처 링크와 확인한 날을 단다(확인된 사실 파일에 [확인됨]으로 있는 것만)
    src = ''.join(f'<p class="src">{u["source"]}: <a href="{esc(x["url"])}" rel="noopener">{esc(x["label"])}</a> ({u["source_checked"].replace("%1", x["checked"])})</p>' for x in c.get('sources', []))
    body = f'''<div class="wrap tool-head"><h1>{esc(c['h1'])}</h1><p class="lead">{esc(c['lead'])}</p>{touch}</div>
<div class="wrap">{STAGE[key](lang, c)}</div>
<section class="wrap narrow sec"><h2>{u['how']}</h2><ol class="steps">{how}</ol>{secs}</section>
{ad_slot(lang, 'mid')}
{faq_html(lang, c['faq'], src)}
{guides_block(lang, RELATED.get(key))}
<section class="wrap narrow sec"><h2>{u['more_tests']}</h2>{tools_block(lang, key)}</section>
{ad_slot(lang, 'bottom')}'''
    cfg = {'page': key, 't': {**t, 'close': u['close'], 'asks': u['asks'], 'stays_on': u['stays_on'], 'off_note': u['off_note']}}
    return page(lang, head(lang, c['title'], c['desc'], path, jsonld=ld, scripts=SCRIPTS[key]), body, path, cfg=cfg, strip_cur=key, cls='tool')


# ════════ 글·소개·방침 ════════
def _width(text):
    """글자 폭 어림(한글·한자는 2칸)."""
    return sum(2 if ord(ch) > 0x2E7F else 1 for ch in text)


def wrap_tables(body):
    """글의 표를 감싼 칸(.tbl)에 넣는다. 칸마다 머리 이름(data-th)을 달아 휴대폰에서 줄 카드로 바꿀 수 있게 한다.
    - 첫 칸 말고는 전부 짧은 표(숫자·판정) → tbl--tight: 그 칸들은 줄을 바꾸지 않는다.
    - 긴 글 칸이 둘 이상이고 칸이 3개 이하 → tbl--cards: 휴대폰에서 줄마다 카드 하나.
    - 그 밖 → 글이 칸 안에서 줄을 바꾼다."""
    def one(m):
        t = m.group(0)
        heads = [re.sub(r'<[^>]+>', '', h) for h in re.findall(r'<th>(.*?)</th>', t, flags=re.S)]
        rows = [re.findall(r'<td>(.*?)</td>', r, flags=re.S) for r in re.findall(r'<tr>((?:\s*<td>.*?</td>)+)\s*</tr>', t, flags=re.S)]
        assert heads and rows and all(len(r) == len(heads) for r in rows), '표의 칸 수가 머리와 다름'
        longest = [max(_width(re.sub(r'<[^>]+>', '', r[i])) for r in rows) for i in range(len(heads))]
        long_cols = sum(1 for w in longest if w > 30)
        cls = 'tbl'
        if all(w <= 16 for w in longest[1:]):
            cls += ' tbl--tight'
        elif len(heads) <= 3 and long_cols >= 2:
            cls += ' tbl--cards'
        def row(rm):
            cells = iter(heads)
            return re.sub(r'<td>', lambda _: f'<td data-th="{esc(next(cells))}">', rm.group(0))
        t = re.sub(r'<tr>(?:\s*<td>.*?</td>)+\s*</tr>', row, t, flags=re.S)
        return f'<div class="{cls}">{t}</div>'
    return re.sub(r'<table>.*?</table>', one, body, flags=re.S)


def guide_index(lang):
    g, p = C['guide_index'][lang], prefix(lang)
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/">{esc(a["h1"])}</a><span>{esc(a["desc"])}</span></li>' for a in A[lang])
    body = (f'<section class="wrap narrow doc"><h1>{g["h1"]}</h1><p class="lead">{g["lead"]}</p><ul class="guide-list">{items}</ul>'
            f'<h2>{UI[lang]["more_tests"]}</h2>{tools_block(lang)}</section>')
    return page(lang, head(lang, g['title'], g['desc'], 'guide/', ads=False, scripts=SCRIPTS['doc']), body, 'guide/', current='guide')


def article_page(lang, a):
    u, p = UI[lang], prefix(lang)
    path = f'guide/{a["slug"]}/'
    day = a.get('checked', FIRST)
    ld = [{'@context': 'https://schema.org', '@type': 'Article', 'headline': a['h1'], 'description': a['desc'], 'inLanguage': lang, 'datePublished': a.get('published', FIRST),
           'dateModified': day, 'mainEntityOfPage': url(lang, path), 'image': f'{SITE}/{"og-ko.png" if lang == "ko" else "og.png"}',
           'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}, 'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}},
          {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
              {'@type': 'ListItem', 'position': 1, 'name': u['guides'], 'item': url(lang, 'guide/')}, {'@type': 'ListItem', 'position': 2, 'name': a['h1'], 'item': url(lang, path)}]}]
    inner = wrap_tables(a['body_html'])
    body = f'''<article class="wrap narrow doc article">
  <p class="crumb"><a href="{p}guide/">{u['guides']}</a></p>
  <h1>{esc(a['h1'])}</h1>
  <p class="byline">{u['checked']} <time datetime="{day}">{day}</time> · Lumen Lab</p>
  {inner}
</article>
{ad_slot(lang, 'mid')}
<section class="wrap narrow sec"><h2>{u['more_tests']}</h2>{tools_block(lang)}</section>
{ad_slot(lang, 'bottom')}'''
    return page(lang, head(lang, a['title'], a['desc'], path, jsonld=ld, og_type='article', scripts=SCRIPTS['doc']), body, path, current='guide')


def about_page(lang):
    a = C['about'][lang]
    inner = f'<h1>{esc(a["h1"])}</h1>'
    for s in a['body']:
        inner += f'<h2>{esc(s["h"])}</h2>' + ''.join(f'<p>{esc(x)}</p>' for x in s['p'])
        if s.get('list'):
            inner += '<ul>' + ''.join(f'<li>{esc(x)}</li>' for x in s['list']) + '</ul>'
    p = prefix(lang)
    inner += f'<p><a href="{p}privacy/">{UI[lang]["privacy"]}</a> · <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>'
    return page(lang, head(lang, a['title'], a['desc'], 'about/', ads=False, scripts=SCRIPTS['doc']), f'<article class="wrap narrow doc">{inner}<h2>{UI[lang]["more_tests"]}</h2>{tools_block(lang)}</article>', 'about/', current='about')


def privacy_page(lang):
    v = C['privacy'][lang]
    return page(lang, head(lang, v['title'], v['desc'], 'privacy/', ads=False, scripts=SCRIPTS['doc']), f'<article class="wrap narrow doc">{v["html"]}</article>', 'privacy/')


def not_found():
    n = C['notfound']
    body = f'''<section class="wrap narrow doc nf">
<p class="nf-lamps" aria-hidden="true"><i></i><i></i><i></i></p>
<h1>{n['en']} · <span lang="ko">{n['ko']}</span></h1>
<p><a href="/">{n['en_go']}</a> · <a href="/ko/" lang="ko">{n['ko_go']}</a></p>
</section>'''
    h_ = head('en', UI['en']['not_found_t'], UI['en']['not_found_d'], '', noindex=True, ads=False)
    return f'{h_}\n<body>\n{header("en", "__none__")}\n<main id="main">{body}</main>\n</body>\n</html>\n'


def sitemap(paths):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    out += [f'  <url><loc>{SITE}{p}</loc><lastmod>{UPDATED.get(p, FIRST)}</lastmod></url>' for p in paths]
    return '\n'.join(out + ['</urlset>']) + '\n'


def rss():
    items = ''
    for a in A['ko']:
        link = f'{SITE}/ko/guide/{a["slug"]}/'
        items += (f'<item><title>{esc(a["h1"])}</title><link>{link}</link><guid>{link}</guid><pubDate>Sat, 10 Oct 2026 00:00:00 GMT</pubDate>'
                  f'<description>{esc(a["desc"])}</description><content:encoded><![CDATA[{a["body_html"]}]]></content:encoded></item>\n')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>체크벤치 가이드</title><link>{SITE}/ko/</link><description>키보드·마이크·모니터 테스트 가이드</description><language>ko</language>
{items}</channel></rss>
'''


def build():
    files, paths = {}, []

    def add(lang, rel, text):
        files[(prefix(lang) + rel).lstrip('/') + 'index.html'] = text
        paths.append(prefix(lang) + rel)

    for lang in ('en', 'ko'):
        add(lang, '', home_page(lang))
        for k in TOOLS:
            add(lang, SLUG[k] + '/', tool_page(lang, k))
        add(lang, 'guide/', guide_index(lang))
        for a in A[lang]:
            add(lang, f'guide/{a["slug"]}/', article_page(lang, a))
        add(lang, 'about/', about_page(lang))
        add(lang, 'privacy/', privacy_page(lang))
    files['404.html'] = not_found()
    files['sitemap.xml'] = sitemap(paths)
    if A['ko']:
        files['rss.xml'] = rss()
    return files, paths


def main():
    files, paths = build()
    if '--check' in sys.argv:
        stale = [f for f, t in files.items() if not (ROOT / f).exists() or (ROOT / f).read_text(encoding='utf-8') != t]
        print(('실패  빌드 결과가 낡았어요: ' + ', '.join(stale[:8])) if stale else f'통과  빌드 결과가 최신이에요({len(files)}개 파일)')
        sys.exit(1 if stale else 0)
    for f, t in files.items():
        p = ROOT / f
        p.parent.mkdir(parents=True, exist_ok=True)
        if not p.exists() or p.read_text(encoding='utf-8') != t:
            p.write_text(t, encoding='utf-8')
    print(f'built {len(paths)} pages')


if __name__ == '__main__':
    main()
