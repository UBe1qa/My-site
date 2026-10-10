#!/usr/bin/env python3
"""칸칸(count.lumenlab.page) 페이지 전부 만들기: python3 count/_dev/build.py   (--check 는 낡았는지만 본다)

- 화면 글 = _dev/content.json, 가이드 글 = _dev/articles.json, 공식 출처에서 확인한 값 = _dev/limits.json
  (나이스 항목·문자 한 통 기준·SNS 한도·읽기 속도·원고지 관행·취업 사이트 측정값. verified=true 인 것만 쓰고 출처 링크와 확인한 날을 화면에 같이 싣는다).
- 만드는 것: 영어 / , 한국어 /ko/ 의 도구·가이드·소개·방침·오픈소스 고지, 404.html, sitemap.xml, rss.xml(한국어 글).
  만든 파일은 손으로 고치지 않는다.
- lastmod 는 본문·구조화 데이터·링크가 실제로 바뀐 날만 적는다(lastmod()). 배치·CSS만 바뀐 페이지는 그대로 둔다.
"""
import html
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
SITE = 'https://count.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
FIRST = '2026-10-09'      # 처음 올린 날
# 그 뒤 본문·구조화 데이터·링크가 바뀐 페이지: 주소 -> 날짜. 다음에 고칠 때는 고친 주소만 새 날짜로 적는다.
KO_ALL = '2026-10-10'     # 2026-10-10: 메뉴에 나이스(생기부)·SNS가 생겨 한국어 페이지 전부의 링크가 바뀜
UPDATED = {p: '2026-10-10' for p in (
    '/', '/character-counter/', '/sms/', '/guide/', '/about/', '/privacy/',
    '/guide/how-x-counts-characters/', '/guide/why-161-characters-is-two-sms/')}
# 그대로인 영어 페이지: /guide/characters-code-points-bytes/(표를 감싼 칸과 날짜 이름만 바뀜), /licenses/

C = json.loads((DEV / 'content.json').read_text(encoding='utf-8'))
A = json.loads((DEV / 'articles.json').read_text(encoding='utf-8')) if (DEV / 'articles.json').exists() else {'ko': [], 'en': []}
L = json.loads((DEV / 'limits.json').read_text(encoding='utf-8'))
for _k, _v in L.items():
    if isinstance(_v, dict):
        assert _v.get('verified') is True and _v.get('checked'), f'limits.json {_k}: 확인된 값(verified·checked)만 화면에 쓴다'
UI, T, PAGES = C['ui'], C['t'], C['pages']
WPM = {'read': L['reading']['read_wpm'], 'speak': L['reading']['aloud_wpm']}  # Brysbaert(2019) 영어 성인 평균. 화면에서 바꿀 수 있다.
esc = lambda s: html.escape(str(s), quote=True)
nfd = lambda s: unicodedata.normalize('NFD', s)
num = lambda n: f'{n:,}'

# 글자 뜯어보기에 먼저 놓아 두는 예시(영어 페이지에는 한글을 넣지 않는다)
INSPECT = {
    'ko': ['👨‍👩‍👧', '🇰🇷', '👍🏽', nfd('각'), nfd('é'), '1️⃣'],
    'en': ['👨‍👩‍👧', '🇺🇸', '👍🏽', nfd('é'), '1️⃣', '🏴\U000E0067\U000E0062\U000E0065\U000E006E\U000E0067\U000E007F'],
}

# 숫자 칸 이름: 키 -> (라벨 HTML, 단위)
M = {
    'ko': {
        'chars': ('공백 포함', '자'), 'nospace': ('공백 제외', '자'),
        'utf8': ('바이트 <small>UTF-8</small>', ''), 'euckr': ('바이트 <small>EUC-KR</small>', ''), 'utf16': ('바이트 <small>UTF-16</small>', ''),
        'words': ('단어 <small>어절</small>', ''), 'sentences': ('문장', ''), 'lines': ('줄', ''), 'paras': ('문단', ''),
        'sheets': ('원고지 <small>글자 수 ÷ 200</small>', '장'),
        'laid': ('칸에 놓으면', '장'), 'plain': ('글자 수 <small>띄어쓰기 포함</small>', '자'), 'rowsUsed': ('쓴 줄', ''), 'lastRows': ('마지막 장에 쓴 줄', ''),
        'neisB': ('바이트', 'Byte'), 'neisLeft': ('남은 바이트', 'Byte'), 'neisH': ('한글로만 쓰면 남은 글자', '자'), 'breaks': ('엔터(줄바꿈)', '번'),
    },
    'en': {
        'words': ('Words', ''), 'chars': ('Characters', ''), 'nospace': ('Without spaces', ''),
        'wordsSeg': ('Words <small>Unicode rules</small>', ''), 'sentences': ('Sentences', ''), 'paras': ('Paragraphs', ''), 'lines': ('Lines', ''),
        'read': ('Reading time', ''), 'speak': ('Reading aloud', ''),
        'utf8': ('Bytes <small>UTF-8</small>', ''), 'utf16': ('Bytes <small>UTF-16</small>', ''), 'codepoints': ('Code points', ''),
        'segs': ('Messages', ''), 'smsLeft': ('Left in this message', ''), 'smsEnc': ('Encoding', ''), 'smsLen': ('Length', ''), 'smsPer': ('Limit per message', ''),
    },
}
# 큰 숫자·띠에서 쓰는 짧은 이름(없으면 위 라벨)
SHORT = {
    'ko': {'utf8': 'UTF-8', 'euckr': 'EUC-KR', 'utf16': 'UTF-16', 'sheets': '글자 수로 환산', 'plain': '글자 수'},
    'en': {'smsLeft': 'Left', 'smsEnc': 'Encoding', 'utf8': 'Bytes', 'nospace': 'No spaces'},
}
BIG_UNIT = {'ko': {'utf8': '바이트', 'euckr': '바이트', 'sheets': '장'}, 'en': {}}
# 목표를 셀 기준: 키 -> (고르기 글자, 문구 속 이름, 단위)
GOAL = {
    'ko': {'chars': ('공백 포함', '공백 포함', '자'), 'nospace': ('공백 제외', '공백 제외', '자'),
           'utf8': ('UTF-8 바이트', 'UTF-8', '바이트'), 'euckr': ('EUC-KR 바이트', 'EUC-KR', '바이트')},
    'en': {'words': ('Words', 'words', 'words'), 'chars': ('Characters', 'characters', 'characters'),
           'nospace': ('Without spaces', 'without spaces', 'characters without spaces'), 'utf8': ('UTF-8 bytes', 'bytes', 'bytes')},
}
TXT_ROWS = {'smsEnc', 'smsLen', 'read', 'speak'}

# strip3_label: 휴대폰 숫자 띠 셋째 칸 이름(무슨 숫자인지 이름만 보고 알 수 있게)
TOOLS = {
    ('en', 'home'): dict(path='', big=['words', 'chars'], rows=['nospace', 'wordsSeg', 'sentences', 'paras', 'read', 'speak'], strip3='nospace',
                         goal=['words', 'chars', 'nospace'], scripts=['lc-core'], inspect=True, sample='en', wpm=True),
    ('en', 'chars'): dict(path='character-counter/', big=['chars', 'nospace'], rows=['utf8', 'utf16', 'codepoints', 'words', 'lines'], strip3='utf8',
                          strip3_label='Bytes (UTF-8)', goal=['chars', 'nospace', 'utf8'], scripts=['lc-core', 'lc-x-tld', 'lc-x'], inspect=True, sample='x', x=True, limits='below'),
    ('en', 'sms'): dict(path='sms/', big=['segs', 'smsLeft'], rows=['smsEnc', 'smsLen', 'smsPer', 'chars'], strip3='smsEnc',
                        goal=[], scripts=['lc-core', 'lc-sms'], sample='sms', sms=True),
    ('ko', 'home'): dict(path='', big=['chars', 'nospace'], rows=['utf8', 'euckr', 'words', 'sentences', 'lines', 'sheets'], strip3='utf8',
                         strip3_label='바이트(UTF-8)', goal=['chars', 'nospace', 'utf8'], scripts=['lc-core', 'lc-cp949'], inspect=True, sample='ko', miss=True),
    ('ko', 'byte'): dict(path='byte/', big=['utf8', 'euckr'], rows=['utf16', 'chars', 'nospace', 'lines'], strip3='utf16',
                         goal=['utf8', 'euckr', 'chars'], scripts=['lc-core', 'lc-cp949'], sample='ko', miss=True, ks=True, krsms=True,
                         nl_now='줄바꿈은 {n}바이트로 셈', nl_opts=['0', '1', '2']),
    ('ko', 'neis'): dict(path='neis/', big=['neisB', 'neisLeft'], rows=['chars', 'neisH', 'breaks', 'nospace'], strip3='chars',
                         strip3_label='글자 수', labels={'chars': '글자 수 <small>공백 포함</small>'}, goal=[], scripts=['lc-core'], sample='neis', neis=True,
                         guide_first='neis-500ja-1500byte'),
    ('ko', 'sns'): dict(path='sns/', big=['chars', 'nospace'], rows=[], strip3='utf8', strip3_label='바이트(UTF-8)',
                        goal=[], scripts=['lc-core', 'lc-x-tld', 'lc-x'], sample='sns', limits='side'),
    ('ko', 'wongoji'): dict(path='wongoji/', big=['laid', 'sheets'], rows=['plain', 'nospace', 'rowsUsed', 'lastRows'], strip3='plain',
                            goal=[], scripts=['lc-core', 'lc-wongoji'], sample='ko', sheet=True),
}
NAV = {
    'en': [('', 'Words', 'home'), ('character-counter/', 'Characters', 'chars'), ('sms/', 'SMS', 'sms'), ('guide/', 'Guides', 'guide')],
    'ko': [('', '글자수 세기', 'home'), ('jasoseo/', '자소서', 'jasoseo'), ('byte/', '바이트', 'byte'), ('neis/', '나이스(생기부)', 'neis'),
           ('sns/', 'SNS', 'sns'), ('wongoji/', '원고지', 'wongoji'), ('guide/', '가이드', 'guide')],
}
# 같은 역할이라 서로 잇는 페이지(영어 경로 -> 한국어 경로). 글은 articles.json 의 pair 로 잇는다.
# 나이스·SNS·자소서·바이트·원고지(한국어), Character Counter·SMS(영어)는 짝이 없다.
PAIRS = {'': '', 'guide/': 'guide/', 'about/': 'about/', 'privacy/': 'privacy/', 'licenses/': 'licenses/'}
# SNS 한도를 보여 주는 순서(값·출처는 limits.json)
LIM_ORDER = {'ko': ['igc', 'igb', 'x', 'xp', 'th', 'ytt', 'ytd', 'tt', 'bs', 'li'],
             'en': ['x', 'xp', 'igc', 'igb', 'th', 'bs', 'ytt', 'ytd', 'tt', 'li']}

LOGO = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect class="lg-b" x="1" y="1" width="20" height="20" rx="3"/><path class="lg-l" d="M11 1v20M1 11h20"/><rect class="lg-f" x="1" y="1" width="10" height="10" rx="2"/></svg>'
LOCK = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2.5" y="6" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 6V4.3a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
ANIM = "<script>(function(d){var h=d.documentElement;if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)&&'IntersectionObserver' in window)h.classList.add('anim')})(document)</script>"
# 다른 언어판 안내 띠를 띄울지 첫 그림 전에 정한다(html.lb). 띠는 화면 아래에 겹쳐 뜨고, 꼬리말 아래에 띠만큼 자리를 둔다.
# 저장 키는 app.js 의 LOCAL.lang 과 같다.
LANGBAR = "<script>(function(h){try{var n=(navigator.language||'').slice(0,2).toLowerCase();if(!localStorage.getItem('kk.lang')&&(h.lang==='ko'?n!=='ko':n==='ko'))h.classList.add('lb')}catch(e){}})(document.documentElement)</script>"
# 같은 탭에서 쓰던 목표(sessionStorage kk.set)를 첫 그림 전에 목표 칸에 넣어 둔다(나중에 넣으면 숫자 기둥이 밀린다). {key} = 언어:도구
GOAL_BOOT = ("<script>(function(d){{try{{var s=JSON.parse(sessionStorage.getItem('kk.set')||'null'),g=s&&s.goal&&s.goal['{key}'],i=d.getElementById('goal'),b=d.getElementById('goalBasis');"
             "if(!g||!(g[0]>0)||!i)return;i.value=g[0];b.value=g[1];if(b.selectedIndex<0)b.selectedIndex=0;i.parentNode.hidden=false;"
             "d.querySelector('[data-act=goal-open]').hidden=true;d.querySelector('.goal .cells').hidden=false;d.getElementById('goalMsg').textContent='\\u00a0'}}catch(e){{}}}})(document)</script>")
# 자소서: 저장해 둔 글(이 기기에 저장을 켠 사람만) 또는 같은 탭에서 쓰던 문항별 목표로 문항 칸을 첫 그림 전에 만들어 둔다(화면 밀림 방지).
# app.js 가 같은 값을 다시 확인해 넣고 잇는다. 저장 키는 app.js 의 LOCAL·SESSION 과 같다.
JS_BOOT = ("<script>(function(d){try{var L=d.getElementById('qList'),T=d.getElementById('qT'),a=null,s,i,q,x,t;"
           "if(localStorage.getItem('kk.jasoseo.on')==='1'){s=JSON.parse(localStorage.getItem('kk.jasoseo')||'null');a=s&&s.items}"
           "if(!a||!a.length){s=JSON.parse(sessionStorage.getItem('kk.set')||'null');a=s&&s.jq&&s.jq.map(function(v){return{goal:v&&v[0]>0?v[0]:'',basis:v&&v[1]}})}"
           "if(!a||!a.length)return;"
           "for(i=0;i<a.length;i++){x=a[i]||{};q=i?T.content.firstElementChild.cloneNode(true):L.firstElementChild;if(i)L.appendChild(q);"
           "q.querySelector('.q-no').textContent=i+1;q.querySelector('.q-del').hidden=a.length<2;"
           "q.querySelector('.q-title').value=x.title||'';q.querySelector('.q-goal').value=x.goal||'';t=q.querySelector('.q-basis');t.value=x.basis||'chars';if(t.selectedIndex<0)t.selectedIndex=0;"
           "t=q.querySelector('textarea');t.value=x.text||'';if(x.goal)q.querySelector('.cells').hidden=false;"
           "if(x.text){t.style.height='auto';t.style.height=Math.max(150,t.scrollHeight+2)+'px'}}"
           "}catch(e){}})(document)</script>")


def prefix(lang):
    return '/ko/' if lang == 'ko' else '/'


def url(lang, path=''):
    return SITE + prefix(lang) + path


def lastmod(full):
    """본문·구조화 데이터·링크가 실제로 바뀐 날."""
    if full in UPDATED:
        return UPDATED[full]
    return KO_ALL if full.startswith('/ko/') else FIRST


def link(href, label):
    return f'<a href="{esc(href)}">{esc(label)}</a>'


def alt_of(lang, path):
    """이 페이지와 같은 역할인 다른 언어판 경로(없으면 None)."""
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


def head(lang, title, desc, path, jsonld=(), og_type='website', noindex=False, ads=True, scripts=(), langbar=True):
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
<meta name="theme-color" content="#191c23" media="(prefers-color-scheme: dark)">
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
{ANIM}{LANGBAR if langbar else ''}
{ld}{ad}{''.join(f'<script defer src="/assets/{s}.js"></script>{chr(10)}' for s in scripts)}</head>'''


def header(lang, path, current=None):
    u = UI[lang]
    p = prefix(lang)
    other = 'en' if lang == 'ko' else 'ko'
    alt = alt_of(lang, path)
    other_href = prefix(other) + (alt if alt is not None else '')
    nav = ''.join(f'<a href="{p}{h}"{" aria-current=" + chr(34) + "page" + chr(34) if key == current else ""}>{esc(label)}</a>' for h, label, key in NAV[lang])
    return f'''<a class="skip" href="#main">{u['skip']}</a>
<header class="top"><div class="top-in wrap">
  <a class="brand" href="{p}">{LOGO}{u['brand']}</a>
  <nav class="nav" aria-label="{u['nav_label']}">{nav}</nav>
  <span class="sp"></span>
  <div class="aux"><a class="wide" href="{p}about/">{u['about']}</a><a href="{other_href}" lang="{other}" hreflang="{other}">{u['lang_other']}</a></div>
</div></header>'''


def footer(lang):
    u = UI[lang]
    p = prefix(lang)
    cells = ''.join(f'<i style="--i:{i}"><span>{esc(ch)}</span></i>' for i, ch in enumerate(u['lumen_cells']))
    home = 'https://lumenlab.page/' + ('en/' if lang == 'en' else '')
    tools = ''.join(f'<a href="{p}{h}">{esc(PAGES[lang][key]["name"] if key in PAGES[lang] and "name" in PAGES[lang][key] else label)}</a>'
                    for h, label, key in NAV[lang] if key not in ('home', 'guide'))
    return f'''<footer class="foot"><div class="wrap">
  <a class="lumen" href="{home}"><span class="lumen-cells" aria-hidden="true">{cells}</span><span class="lumen-t"><b>{u['lumen_b']}</b><small>{u['lumen_s']}</small></span><span class="lumen-go" aria-hidden="true">→</span></a>
  <p class="foot-links">{tools}<a href="{p}guide/">{u['guides']}</a><a href="{p}about/">{u['about']}</a><a href="{p}privacy/">{u['privacy']}</a><a href="{p}licenses/">{u['licenses']}</a><a href="mailto:woxocoso@gmail.com">{u['contact']}</a></p>
  <small>© 2026 Lumen Lab</small>
</div></footer>'''


def ad_slot(lang, name, left=True):
    """광고 자리. 폭은 본문 글 기둥(780px)과 같다. left=True 는 도구 화면(왼쪽 끝에 맞춤), False 는 글(가운데 기둥)."""
    cls = 'ad-wrap wrap' + (' left' if left else ' narrow')
    return f'<div class="{cls}" data-slot="{name}"><div class="ad-in"><p class="ad-label">{UI[lang]["ad"]}</p><div class="ad-slot" data-ad="{name}" hidden></div></div></div>'


def cfg_script(cfg):
    return '<script type="application/json" id="kk">' + json.dumps(cfg, ensure_ascii=False).replace('</', '<\\/') + '</script>'


def page(lang, head_html, body, path, current=None, cfg=None, app=True, cls=''):
    other = 'en' if lang == 'ko' else 'ko'
    alt = alt_of(lang, path)
    base = {'lang': lang, 't': {'close': T[lang]['close']}, 'other': prefix(other) + (alt if alt is not None else ''), 'otherLabel': UI[lang]['lang_offer']}
    base.update(cfg or {})
    return f'''{head_html}
<body{' class="' + cls + '"' if cls else ''}>
{header(lang, path, current)}
<main id="main">
{body}
</main>
{footer(lang)}
{cfg_script(base)}
{'<script src="/assets/app.js"></script>' if app else ''}
</body>
</html>
'''


def faq_html(lang, faq):
    if not faq:
        return ''
    return (f'<section class="sec faq wrap narrow"><h2>{UI[lang]["faq"]}</h2>'
            + ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in faq) + '</section>')


def faq_ld(faq):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}


def app_ld(lang, name, desc, path):
    return {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': name, 'url': url(lang, path),
            'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any', 'browserRequirements': 'Requires a modern web browser',
            'inLanguage': lang, 'isAccessibleForFree': True, 'description': desc,
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'KRW' if lang == 'ko' else 'USD'},
            'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}}


def defs_html(defs):
    return '<dl class="defs">' + ''.join(f'<dt>{esc(k)}</dt><dd>{esc(v)}</dd>' for k, v in defs) + '</dl>'


def guides_block(lang, limit=3, skip=None, first=None, center=False):
    arts = [a for a in A[lang] if a['slug'] != skip]
    if first:
        arts.sort(key=lambda a: a['slug'] != first)
    arts = arts[:limit]
    if not arts:
        return ''
    p = prefix(lang)
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/"><b>{esc(a["h1"])}</b><span>{esc(a["desc"])}</span></a></li>' for a in arts)
    cls = 'sec wrap narrow' + (' col' if center else '')   # col = 글 페이지: 가운데 글 기둥에 맞춘다
    return f'<section class="{cls}"><h2>{UI[lang]["more_guides"]}</h2><ul class="jump jump-g">{items}</ul></section>'


def tools_block(lang, current):
    c = PAGES[lang]['home']
    p = prefix(lang)
    items = ''
    for h, label, key in NAV[lang]:
        if key in ('guide', current):
            continue
        if key == 'home':
            name, line = (c['h1'], c['lead'])
        else:
            name, line = PAGES[lang][key]['name'], PAGES[lang][key]['line']
        items += f'<li><a href="{p}{h}"><b>{esc(name)}</b><span>{esc(line)}</span></a></li>'
    return f'<section class="sec wrap narrow"><h2>{esc(c["tools_h"])}</h2><ul class="jump">{items}</ul></section>'


def cells_html(n=25, attrs=''):
    return f'<div class="cells" aria-hidden="true"{attrs}>' + '<i></i>' * n + '</div>'


def strip_tags(s):
    return re.sub(r'<[^>]+>', '', s).strip()


def label_of(lang, tool, k, short=False):
    if k in tool.get('labels', {}) and not short:
        return tool['labels'][k]
    if short:
        return SHORT[lang].get(k) or strip_tags(tool.get('labels', {}).get(k) or M[lang][k][0])
    return M[lang][k][0]


def strip3_label(lang, tool):
    return tool.get('strip3_label') or label_of(lang, tool, tool['strip3'], short=True)


def strip_html(lang, tool):
    out = ''
    for k in tool['big']:
        zero = num(L['neis']['items'][0]['chars'] * 3) if k == 'neisLeft' else '0'
        out += f'<p data-k="{k}"><span data-lab="{k}">{label_of(lang, tool, k, short=True)}</span><b data-n="{k}">{zero}</b></p>'
    s3 = tool['strip3']
    out += f'<p data-strip3><span>{strip3_label(lang, tool)}</span><b>{"GSM-7" if s3 == "smsEnc" else "0"}</b></p>'
    return f'<div class="strip" aria-hidden="true">{out}</div>'


def tbl(table_html, wide=False, fit=False, lang='ko'):
    """표를 감싼 칸. wide = 휴대폰에서 옆으로 밀어 보는 넓은 표(밀어 보라는 한 줄을 같이 보여 준다)."""
    cls = 'tbl' + (' wide' if wide else '') + (' fit' if fit else '')
    hint = f' data-hint="{esc(UI[lang]["tbl_hint"])} →"' if wide else ''
    return f'<div class="{cls}"{hint}>{table_html}</div>'


def checked(lang):
    return UI[lang]['checked']


def basis_details(lang, tool, extra=''):
    u = UI[lang]
    now = (tool.get('nl_now') or T[lang]['nlNow']).replace('{n}', '1')
    opts = tool.get('nl_opts') or u['nl_opts']
    seg = ''.join(f'<button type="button" data-nl="{i}" aria-pressed="{"true" if i == 1 else "false"}">{esc(o)}</button>' for i, o in enumerate(opts))
    return f'''<details class="basis">
      <summary><span id="nlNow">{esc(now)}</span><em>{u['basis_change']}</em></summary>
      <div class="in"><p>{esc(u['nl_why'])}</p><span class="seg" role="group" aria-label="{esc(u['nl_group'])}">{seg}</span>{extra}</div>
    </details>'''


def pad_html(lang, rows_attr='', top=''):
    """글 칸. top = 글 칸 머리에 놓는 고르기 줄(나이스 항목처럼 글을 쓰기 전에 정하는 것)."""
    u = UI[lang]
    return f'''<section class="pad" aria-label="{u['ta_label']}">{top}
      <textarea id="text" placeholder="{esc(u['placeholder'])}" spellcheck="false" aria-label="{u['ta_label']}"{rows_attr}></textarea>
      <div class="bar">
        <button class="btn go if-empty" data-act="sample" type="button">{u['sample_btn']}</button>
        <button class="btn if-text" data-act="copy" type="button">{u['copy']}</button>
        <span class="undo" hidden><span class="undo-msg">{u['undo_msg']}</span> <button class="linkbtn" data-act="undo" type="button">{u['undo']}</button></span>
        <span class="sp"></span>
        <button class="btn quiet if-text" data-act="clear" type="button">{u['clear']}</button>
      </div>
    </section>'''


# ── 확인된 값(limits.json)으로 만드는 칸 ──
def limits_html(lang, c, two=False):
    """SNS 한도 목록. 서비스마다 세는 단위(data-unit)가 다르다. 숫자는 app.js가 LC.measure 로 채운다."""
    rows = {r['id']: r for r in L['sns']['rows']}
    out = ''
    for i in LIM_ORDER[lang]:
        r = rows[i]
        note = esc(c['units'][r['unit'] + ('u' if r.get('undoc') else '')])
        more = ''
        if r.get('unit2'):   # 한도가 둘인 서비스(블루스카이: 300 글자소 + UTF-8 3,000바이트): 둘째 숫자도 보여 주고 하나라도 넘으면 넘음
            a, b = c['unit2'][r['unit2']]
            note += f' · {esc(a)}<b data-lim-n2>0</b> / {num(r["limit2"])}{esc(b)}'
            more = f' data-unit2="{r["unit2"]}" data-limit2="{r["limit2"]}"'
        out += (f'<li data-unit="{r["unit"]}" data-limit="{r["limit"]}" data-id="{r["id"]}"{more}>'
                f'<p class="lim-h"><b>{esc(r[lang])}</b><span class="lim-n"><b data-lim-n>0</b> / {num(r["limit"])}</span></p>'
                f'<div class="lim-bar" aria-hidden="true"><i></i></div>'
                f'<p class="lim-s"><span>{note} · <a href="{esc(r["src"])}" aria-label="{esc(r[lang])} {UI[lang]["src_label"]}">{UI[lang]["src_label"]}</a></span><em data-lim-left></em></p></li>')
    return f'<ul class="lims{" two" if two else ""}" aria-label="{esc(c["list_label"])}">{out}</ul>'


def neis_table():
    n, c = L['neis'], PAGES['ko']['neis']
    rows = ''
    for i in n['items']:
        note = f'<small>{esc(i["note"])}</small>' if i.get('note') else ''
        rows += f'<tr><td>{esc(i["name"])}{note}</td><td class="r">{num(i["chars"])}자</td><td class="r">{num(i["chars"] * 3)}Byte</td></tr>'
    return tbl(f'<table><tr><th>{c["tbl"][0]}</th><th class="r">{c["tbl"][1]}</th><th class="r">{c["tbl"][2]}</th></tr>{rows}</table>', fit=True)


def neis_source():
    n = L['neis']
    return f'{esc(n["doc"])}, {link(n["source"], "학교생활기록부 종합지원포털 자료실")} · {checked("ko")}'


def jobsites_rules():
    """취업 사이트 네 곳의 세는 법 요약(2026-10-10에 직접 넣어 본 값에서 읽어낸 것) + 칸칸."""
    j, c = L['jobsites'], PAGES['ko']['jasoseo']
    head = ''.join(f'<th>{esc(x)}</th>' for x in c['sites_cols'])
    rows = ''
    for r in j['rows']:
        rows += (f'<tr><td>{link(r["url"], r["short"])}</td><td>1자 · {r["hangul"]}byte</td><td>1자 · {r["newline"]}byte</td>'
                 f'<td>{esc(r["emoji"])}</td></tr>')
    rows += '<tr class="us">' + ''.join(f'<td>{esc(x)}</td>' for x in c['sites_us']) + '</tr>'
    return tbl(f'<table><tr>{head}</tr>{rows}</table>', wide=True)


def jobsites_measured():
    """예시 글 A·B·C를 넣었을 때 화면에 나온 값 그대로 + 칸칸으로 센 값(limits.json jobsites.ours, 로직 시험이 대조)."""
    j = L['jobsites']
    o = j['ours']

    def site(v):
        if v is None:
            return '숫자가 바뀌지 않음'
        return f'{v[0]}자 · {v[1]}byte<br><small>공백 제외 {v[2]}자 · {v[3]}byte</small>'

    def ours(v, more=''):
        return f'{v[0]}자 · {v[1]}byte<br><small>공백 제외 {v[2]}자{more}</small>'
    rows = ''
    for r in j['rows']:
        rows += f'<tr><td>{link(r["url"], r["short"])}</td><td>{site(r["A"])}</td><td>{site(r["B"])}</td><td>{site(r["C"])}</td></tr>'
    # 둘째 줄 = 자소서 화면의 인크루트 맞추기(글자는 1자, 바이트만 2byte): 인크루트와 글자 수·바이트가 모두 같다
    n1, n2 = o['nl1'], o['nl12']
    miss = ' · 😀는 바이트에서 뺌'
    rows += f'<tr class="us"><td>칸칸<br><small>줄바꿈 1자·1byte</small></td><td>{ours(n1["A"])}</td><td>{ours(n1["B"])}</td><td>{ours(n1["C"], miss)}</td></tr>'
    rows += f'<tr class="us"><td>칸칸<br><small>줄바꿈 1자·2byte</small></td><td>{ours(n1["A"])}</td><td>{ours(n2["B"])}</td><td>{ours(n1["C"], miss)}</td></tr>'
    return tbl('<table><tr><th>도구</th><th>예시 A</th><th>예시 B</th><th>예시 C</th></tr>' + rows + '</table>', wide=True)


def expand(body, lang):
    """글 본문의 표를 옆으로 밀리는 칸으로 감싸고, 자리 표시를 확인된 값으로 만든 표로 바꾼다.
    <table class="wide"> = 휴대폰에서 옆으로 미는 넓은 표, <table class="fit"> = 머리글을 줄바꿈해 좁은 화면에 맞추는 표."""
    hint = f' data-hint="{esc(UI[lang]["tbl_hint"])} →"'

    def wrap(m):
        kind = m.group(1) or ''
        return f'<div class="tbl{" " + kind if kind else ""}"{hint if kind == "wide" else ""}><table>'
    body = re.sub(r'<table(?: class="(wide|fit)")?>', wrap, body).replace('</table>', '</table></div>')
    for mark, make in (('<!--neis-table-->', neis_table), ('<!--jobsites-measured-->', jobsites_measured), ('<!--jobsites-rules-->', jobsites_rules)):
        if mark in body:
            body = body.replace(mark, make())
    return body


def nums_html(lang, key, tool, c):
    if tool.get('neis'):
        return neis_nums(tool, c)
    u = UI[lang]
    m, sh = M[lang], SHORT[lang]
    big = ''
    for k in tool['big']:
        unit = BIG_UNIT[lang].get(k, m[k][1])
        lab = sh.get(k) if k in ('utf8', 'euckr', 'sheets', 'smsLeft') and key in ('byte', 'wongoji', 'sms') else None
        lab = lab or m[k][0]
        if key == 'sms' and k == 'smsLeft':
            lab = m[k][0]
        big += f'<p class="bigrow" data-k="{k}"><span class="lb">{lab}</span><span class="vv"><b data-n="{k}">0</b>{"<i>" + unit + "</i>" if unit else ""}</span></p>'
    goal = ''
    if tool['goal']:
        opts = ''.join(f'<option value="{k}">{esc(GOAL[lang][k][0])}</option>' for k in tool['goal'])
        goal = f'''<div class="goal">
        {cells_html(attrs=' hidden')}
        <div class="goal-line">
          <button class="linkbtn" data-act="goal-open" type="button">{u['goal_open']}</button>
          <span class="goal-form" hidden><label for="goal">{u['goal']}</label><input class="fld n" id="goal" type="text" inputmode="numeric" autocomplete="off" aria-describedby="goalMsg"><select class="fld" id="goalBasis" aria-label="{u['goal_basis']}">{opts}</select><button class="goal-x" data-act="goal-close" type="button" aria-label="{u['goal_clear']}">×</button></span>
          <span class="goal-msg" id="goalMsg" aria-live="polite"></span>
        </div>
      </div>'''
    if tool.get('sms'):
        goal = '<div class="segbar" id="segbar" aria-hidden="true"><i></i></div>'
    rows = ''
    for k in tool['rows']:
        lab, unit = label_of(lang, tool, k), m[k][1]
        cls = ' class="txt"' if k in TXT_ROWS else ''
        zero = {'smsEnc': 'GSM-7', 'smsLen': '0', 'read': '0', 'speak': '0', 'smsPer': '160'}.get(k, '0')
        rows += f'<div><dt>{lab}</dt><dd{cls}><span data-n="{k}">{zero}</span>{"<i>" + unit + "</i>" if unit else ""}</dd></div>'
    rows = f'<dl class="rows">{rows}</dl>' if rows else ''
    extra = ''
    if tool.get('miss'):
        extra += '<p class="miss" data-miss hidden></p>'
    if tool.get('ks'):
        extra += '<p class="note" data-ks hidden></p>'
    if tool.get('sms'):
        extra += '<div class="miss" id="smsBad" hidden><span></span><div class="chips"></div></div>'
    box = ''
    if tool.get('x'):
        xc = L['sns']['x_config']
        xdoc = [r for r in L['sns']['rows'] if r['id'] == 'x'][0]['src']
        box = f'''<div class="xbox">
      <h2>{esc(c['x_title'])} <span id="xNum"><b data-n="xw">0</b><small> / {xc['maxWeightedTweetLength']}</small></span></h2>
      <div class="cells c28" id="xCells" aria-hidden="true">{'<i></i>' * 28}</div>
      <p><b id="xMsg"></b> {esc(c['x_note'])}</p>
      <p class="srcline">{esc(c['x_src'])} {link(xdoc, c['x_links'][0])} · {link(xc['src'], c['x_links'][1])} · {checked(lang)}</p>
    </div>'''
    if tool.get('krsms'):
        k = L['kr_sms']
        opts = ''.join(f'<option value="{v}">{esc(t)}</option>' for v, t in c['sms_opts'])
        srcs = ', '.join(link(h, n) for n, h in k['sources'][:2])
        box = f'''<div class="xbox smsbox">
      <h2>{esc(c['sms_title'])}</h2>
      <p class="pick"><label for="smsBase">{c['sms_pick']}</label><select class="fld" id="smsBase">{opts}</select><span id="smsCustomWrap" hidden><input class="fld n" id="smsCustom" type="text" inputmode="numeric" autocomplete="off" aria-label="{esc(c['sms_custom'])}" aria-describedby="smsMsg"> byte</span></p>
      {cells_html(attrs=' id="smsCells"')}
      <p class="sms-msg" id="smsMsg" aria-live="polite"></p>
      <p class="srcline">{esc(c['sms_src'])} {UI[lang]['src_label']}: {srcs} · {checked(lang)}</p>
    </div>'''
    if tool.get('limits') == 'side':
        box = f'<div class="limbox"><h2>{esc(c["list_label"])}</h2>{limits_html(lang, c)}</div>'
    wpm = ''
    if tool.get('wpm'):
        w = c['wpm']
        wpm = (f'<p><label>{w[0]} <input class="fld n" id="wpmRead" type="text" inputmode="numeric" autocomplete="off" value="{WPM["read"]}" placeholder="{WPM["read"]}" aria-describedby="wpmNote"> {w[2]}</label>'
               f'<label>{w[1]} <input class="fld n" id="wpmSpeak" type="text" inputmode="numeric" autocomplete="off" value="{WPM["speak"]}" placeholder="{WPM["speak"]}" aria-describedby="wpmNote"> {w[2]}</label></p>'
               f'<p class="fld-note" id="wpmNote" aria-live="polite"></p>'
               f'<p class="srcline">{w[3]}{link(L["reading"]["source"], w[4])}{w[5]} ({checked(lang)})</p>')
    basis = '' if tool.get('sms') or tool.get('sheet') or tool.get('limits') == 'side' else basis_details(lang, tool, wpm)
    proof = esc(c['proof']) + (f' {checked(lang)}' if tool.get('limits') == 'side' else '')
    only = ' only-big' if not goal else ''
    return f'''<aside class="nums" aria-label="{u['nums_label']}">
      <div class="big{only}">{big}{goal}</div>
      {rows}
      {extra}{box}<p class="proof">{proof}</p>{basis}
    </aside>'''


def neis_pick(c):
    """나이스: 어느 학년도·학교급 기준인지와 항목 고르기. 글 칸 머리에 둔다(휴대폰에서도 글을 쓰기 전에 보인다)."""
    n = L['neis']
    opts = ''.join(f'<option value="{i["chars"]}" data-id="{i["id"]}">{esc(i["name"])} · {num(i["chars"])}자</option>' for i in n['items'])
    opts += f'<option value="custom">{esc(c["custom"])}</option>'
    return f'''
      <div class="pad-top">
        <p class="yr">{n['school_year']}학년도 {n['level']} 기준</p>
        <p class="pick"><label for="neisItem">{c['item']}</label><select class="fld" id="neisItem">{opts}</select></p>
        <p class="pick" id="neisCustomRow" hidden><label for="neisCustom">{c['custom_label']}</label><input class="fld n" id="neisCustom" type="text" inputmode="numeric" autocomplete="off" aria-describedby="neisEq"><span>{c['custom_unit']}</span></p>
      </div>'''


def neis_nums(tool, c):
    n, u, m = L['neis'], UI['ko'], M['ko']
    first = n['items'][0]['chars']
    rows = ''
    for k in tool['rows']:
        lab, unit = label_of('ko', tool, k), m[k][1]
        zero = str(first) if k == 'neisH' else '0'
        rows += f'<div><dt>{lab}</dt><dd><span data-n="{k}">{zero}</span><i>{unit}</i></dd></div>'
    eq = T['ko']['neisEq'].replace('{c}', num(first)).replace('{b}', num(first * 3))
    return f'''<aside class="nums" aria-label="{u['nums_label']}">
      <div class="big">
        <p class="bigrow" data-k="neisB"><span class="lb">{c['bytes']}</span><span class="vv"><b data-n="neisB">0</b><i>/ <span data-n="neisMax">{num(first * 3)}</span> Byte</i></span></p>
        <p class="bigrow" data-k="neisLeft"><span class="lb" data-lab="neisLeft">{c['left']}</span><span class="vv"><b data-n="neisLeft">{num(first * 3)}</b><i>Byte</i></span></p>
        <div class="goal">{cells_html(attrs=' id="neisCells"')}<p class="goal-line"><span class="goal-msg" id="neisEq">{eq}</span></p></div>
      </div>
      <dl class="rows">{rows}</dl>
      <p class="proof"><span class="quote">“{esc(n['quote'].lstrip('※ '))}”</span> {neis_source()}</p>
    </aside>'''


def tool_cfg(lang, key, tool):
    t = dict(T[lang])
    if tool.get('nl_now'):
        t['nlNow'] = tool['nl_now']
    cfg = {'tool': key, 't': t, 'sample': C['sample'][tool['sample']],
           'goal': [{'k': k, 'label': GOAL[lang][k][1], 'unit': GOAL[lang][k][2]} for k in tool['goal']]}
    cfg['strip3'] = {'k': tool['strip3'], 'label': strip3_label(lang, tool)}
    if tool.get('inspect'):
        cfg['inspect'] = INSPECT[lang]
    if tool.get('wpm'):
        cfg['wpm'] = WPM
    if tool.get('inspect'):
        cfg['approxHide'] = True   # 근거 줄이 '사람이 보는 한 글자씩'인 화면: Intl.Segmenter 가 없으면 그 줄을 숨기고 알림을 띄운다
    return cfg


def inspect_html(c):
    return f'''<section class="sec wrap narrow" id="inspect"><h2>{esc(c['inspect_h'])}</h2><p>{esc(c['inspect_p'])}</p>
  <div class="insp"><div class="insp-pick" id="inspPick"></div><div class="insp-stage" id="inspStage"></div><p class="insp-sum" id="inspSum" aria-live="polite"></p></div>
</section>'''


def phead(lang, c, tool=True):
    """쪽 머리. tool=True(도구 화면)면 자바스크립트가 꺼져 있을 때 보이는 한 줄을 붙인다(숫자가 0인 채로 조용히 있지 않게)."""
    nojs = f'\n<noscript><p class="nojs wrap">{esc(UI[lang]["nojs"])}</p></noscript>' if tool else ''
    return f'''<div class="phead wrap">
  <h1>{esc(c['h1'])}</h1>
  <p class="lead">{esc(c['lead'])}</p>
  <p class="safe">{LOCK}{UI[lang]['safe']}</p>
</div>{nojs}'''


def extra_sections(lang, key, tool, c):
    """도구 바로 아래에 놓는, 그 도구만의 칸(확인된 값과 출처)."""
    if tool.get('neis'):
        n = L['neis']
        ps = ''.join(f'<p>{esc(x)}</p>' for x in c['year_p'])
        return f'''<section class="sec wrap narrow" id="items"><h2>{esc(c['year_h'])}</h2>{ps}
  {neis_table()}
  <p class="srcline">{esc(c['tbl_note'])} {UI[lang]['src_label']}: {neis_source()}</p>
</section>'''
    if tool.get('krsms'):
        k = L['kr_sms']
        ps = ''.join(f'<p>{esc(x)}</p>' for x in c['sms_ps'])
        srcs = ' · '.join(link(h, n) for n, h in k['sources'])
        return f'''<section class="sec wrap narrow" id="sms"><h2>{esc(c['sms_h'])}</h2>{ps}
  <p class="srcline">{UI[lang]['src_label']}: {srcs} · {checked(lang)}</p>
</section>'''
    if tool.get('limits') == 'below':
        return f'''<section class="sec wrap narrow" id="limits"><h2>{esc(c['sns_h'])}</h2><p>{esc(c['sns_p'])}</p>
  {limits_html(lang, c, two=True)}
  <p class="srcline">{esc(c['sns_chk'])}</p>
</section>'''
    return ''


def tool_page(lang, key):
    tool = TOOLS[(lang, key)]
    c = PAGES[lang][key]
    path = tool['path']
    if tool.get('sheet'):
        w = L['wongoji_rules']
        seg = ''.join(f'<button type="button" data-wg="{i}" aria-pressed="{"true" if i == 0 else "false"}">{esc(x)}</button>' for i, x in enumerate(c['mode']))
        left = f'<div class="wg-left">{pad_html(lang)}{nums_html(lang, key, tool, c)}</div>'
        work = f'''<div class="tool wg-tool wrap" data-tool="{key}">
    {left}
    <section class="sheet" aria-label="{esc(c['sheet_title'])}">
      <div class="sheet-head"><p>{esc(c['sheet_title'])}<b data-n="laid">0</b>장</p><p class="pager"><button type="button" id="prev" aria-label="{c['prev']}" disabled>‹</button><span class="num" id="pageNo">1 / 1</span><button type="button" id="next" aria-label="{c['next']}" disabled>›</button></p></div>
      <p class="wg-mode"><span id="wgModeLabel">{esc(c['mode_label'])}</span><span class="seg" role="group" aria-labelledby="wgModeLabel">{seg}</span><span class="sp"></span><button class="btn if-text" data-act="print" type="button">{esc(c['print'])}</button></p>
      <svg id="sheet" viewBox="0 0 724 446" role="img" aria-label="{esc(c['sheet_title'])}"></svg>
      <div class="sheet-foot"><span>20 × 10</span><span class="num" id="sheetNo">No. 1</span></div>
      <p class="sheet-note"><span id="wgNote">{esc(T[lang]['wgPlain'])}</span> {esc(c['sheet_rule'])} {link(w['source'], c['rule_links'][0])} · {link(w['custom_source'], c['rule_links'][1])} · {checked(lang)}</p>
    </section>
  </div>
<div class="print-sheets" id="printSheets" aria-hidden="true"></div>'''
    else:
        work = f'''<div class="tool wrap" data-tool="{key}">
    {pad_html(lang, top=neis_pick(c) if tool.get('neis') else '')}
    {nums_html(lang, key, tool, c)}
  </div>'''
    body = phead(lang, c) + '\n' + strip_html(lang, tool) + '\n' + work
    if tool['goal']:
        body += '\n' + GOAL_BOOT.format(key=f'{lang}:{key}')
    extra = extra_sections(lang, key, tool, c)
    if extra:
        body += '\n' + extra
    if tool.get('inspect'):
        body += '\n' + inspect_html(c)
    body += '\n' + tools_block(lang, key)
    body += f'\n<section class="sec wrap narrow"><h2>{esc(c["basis_h"])}</h2>{defs_html(c["defs"])}</section>'
    body += '\n' + ad_slot(lang, 'mid')
    body += '\n' + faq_html(lang, c.get('faq'))
    body += '\n' + guides_block(lang, first=tool.get('guide_first'))
    body += '\n' + ad_slot(lang, 'bottom')
    ld = [app_ld(lang, c.get('name', c['h1']), c['desc'], path)]
    if c.get('faq'):
        ld.append(faq_ld(c['faq']))
    return path, page(lang, head(lang, c['title'], c['desc'], path, jsonld=ld, scripts=tool['scripts']), body, path, current=key, cfg=tool_cfg(lang, key, tool))


def jasoseo_page():
    lang, key, path = 'ko', 'jasoseo', 'jasoseo/'
    c, u = PAGES['ko']['jasoseo'], UI['ko']
    opts = ''.join(f'<option value="{k}">{esc(v)}</option>' for k, v in c['bases'])
    # 문항 아래 네 기준 한 줄은 첫 HTML에 0으로 넣어 둔다(나중에 채우면 그 줄만큼 아래가 밀린다)
    sub0 = esc(re.sub(r'\{\w\}', '0', T['ko']['qSub']))
    q = f'''<article class="q">
        <div class="q-head"><span class="q-no" aria-hidden="true">1</span><input class="q-title" type="text" placeholder="{esc(c['q_title'])}" aria-label="{esc(c['q_title'])}" autocomplete="off">
          <label>{c['q_goal']} <input class="fld n q-goal" type="text" inputmode="numeric" autocomplete="off"></label>
          <label><span class="sr">{c['q_basis']}</span><select class="fld q-basis">{opts}</select></label></div>
        <textarea placeholder="{esc(c['q_text'])}" spellcheck="false" aria-label="{esc(c['q_text'])}"></textarea>
        <div class="q-foot">{cells_html(attrs=' hidden')}
          <p class="cnt"><b class="q-n num">0</b><span class="q-u">자</span><span class="left" aria-live="polite"></span><br><small class="q-sub">{sub0}</small><small class="q-miss" hidden></small></p>
          <button class="btn quiet q-del" type="button" hidden>{c['q_del']}</button></div>
      </article>'''
    # 줄바꿈은 글자 수와 바이트에서 따로 고른다(인크루트는 글자 1자·바이트 2byte)
    segs = ''
    for (label, opts), attr, lid in zip(c['nl_rows'], ('data-nl', 'data-nlb'), ('nlCLab', 'nlBLab')):
        btns = ''.join(f'<button type="button" {attr}="{i}" aria-pressed="{"true" if i == 1 else "false"}">{esc(o)}</button>' for i, o in enumerate(opts))
        segs += f'<p class="nl-row"><span id="{lid}">{esc(label)}</span><span class="seg" role="group" aria-labelledby="{lid}">{btns}</span></p>'
    presets = ''.join(f'<button class="btn" type="button" data-preset="{v}">{esc(t)}</button>' for v, t in c['presets'])
    how = ''.join(f'<li>{esc(x)}</li>' for x in c['sites_how'])
    more = c['sites_more']
    guide = f'/ko/guide/{A["ko"][0]["slug"]}/'
    t0 = T['ko']
    # 휴대폰 숫자 띠: 지금 쓰는 문항의 글자 수 · 남은 글자 · 목표(다른 도구처럼 화면 위에 붙어 다닌다)
    strip = (f'<div class="strip js-strip" aria-hidden="true"><p><span id="sLab">{t0["stripQ"].replace("{n}", "1").replace("{b}", t0["stripBasis"]["chars"])}</span><b id="sN" class="num">0</b></p>'
             f'<p id="sLeftP"><span id="sLeftLab">{t0["stripLeft"]}</span><b id="sLeft" class="num">-</b></p>'
             f'<p><span>{c["strip_goal"]}</span><b id="sGoal" class="num">-</b></p></div>')
    body = f'''{phead(lang, c)}
{strip}
<div class="wrap js-wrap" data-tool="jasoseo">
  <div class="js-top">
    <p class="tot">{c['tot'][0]} <b id="qCount" class="num">1</b>{c['tot'][1]} <b id="qTotal" class="num">0</b>{c['tot'][2]}</p>
    <span class="sp"></span>
    <label class="switch"><input type="checkbox" id="save"> {c['save']}</label>
    <button class="btn quiet" id="wipe" type="button" hidden>{c['wipe']}</button>
    <span class="undo" id="wipeUndo" hidden>{esc(c['wipe_done'])} <button class="linkbtn" type="button">{u['undo']}</button></span>
  </div>
  <div class="js-list" id="qList">
      {q}
  </div>
  <template id="qT">{q}</template>
  {JS_BOOT}
  <div class="js-add"><button class="btn go" id="qAdd" type="button">{c['q_add']}</button></div>
  <details class="basis js-basis">
    <summary><span id="nlNow">{c['nl_now'].replace('{n}', '1').replace('{b}', '1')}</span><em>{u['basis_change']}</em></summary>
    <div class="in"><p>{esc(c['nl_why'])}</p>{segs}
      <p class="preset"><span>{esc(c['preset_label'])}</span>{presets}</p>
      <p class="preset-hint">{esc(c['preset_hint'])}</p>
      <p class="preset-msg" id="presetMsg" aria-live="polite"><span></span> <button class="linkbtn" id="presetUndo" type="button" hidden>{u['undo']}</button></p></div>
  </details>
</div>
<section class="sec wrap narrow"><h2>{esc(c['how_h'])}</h2><ol class="steps">{''.join(f'<li>{esc(x)}</li>' for x in c['how'])}</ol></section>
<section class="sec wrap narrow" id="sites"><h2>{esc(c['sites_h'])}</h2><p>{esc(c['sites_p'])}</p>
  {jobsites_rules()}
  <ul class="steps">{how}</ul>
  <p>{esc(more[0])}<a href="{guide}">{esc(more[1])}</a>{esc(more[2])}</p>
</section>
<section class="sec wrap narrow"><h2>{esc(c['save_h'])}</h2><p>{esc(c['save_p'])}</p></section>
{tools_block(lang, key)}
{ad_slot(lang, 'mid')}
{faq_html(lang, c['faq'])}
{guides_block(lang)}
{ad_slot(lang, 'bottom')}'''
    ld = [app_ld(lang, c['name'], c['desc'], path), faq_ld(c['faq'])]
    t = dict(T['ko'])
    t['nlNow'] = c['nl_now']
    cfg = {'tool': key, 't': t}
    return path, page(lang, head(lang, c['title'], c['desc'], path, jsonld=ld, scripts=['lc-core', 'lc-cp949']), body, path, current=key, cfg=cfg)


def guide_index(lang):
    c, p = PAGES[lang]['guide'], prefix(lang)
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/">{esc(a["h1"])}</a><p>{esc(a["desc"])}</p></li>' for a in A[lang])
    body = f'<div class="wrap narrow doc"><h1>{esc(c["h1"])}</h1><p>{esc(c["lead"])}</p><ul class="glist">{items}</ul></div>\n{tools_block(lang, "guide")}'
    return 'guide/', page(lang, head(lang, c['title'], c['desc'], 'guide/', ads=False), body, 'guide/', current='guide')


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
    parts = expand(a['body'], lang).split('<!--ad-->')
    src = ''
    if a.get('sources'):
        src = f'<div class="src"><h2>{u["sources"]}</h2><ul>' + ''.join((f'<li><a href="{esc(s[1])}">{esc(s[0])}</a></li>' if s[1] else f'<li>{esc(s[0])}</li>') for s in a['sources']) + '</ul></div>'
    tr = a.get('try')
    try_html = f'<div class="try"><p>{esc(tr[0])}</p><a class="btn go" href="{p}{tr[1]}">{esc(tr[2])}</a></div>' if tr else ''
    body = f'''<article class="art wrap narrow">
  <p class="crumb"><a href="{p}guide/">{u['crumb']}</a></p>
  <h1>{esc(a['h1'])}</h1>
  <p class="meta">{u['updated']} <time datetime="{day}">{day}</time> · Lumen Lab</p>
  <p class="answer">{a['answer']}</p>
  <div class="prose">{parts[0]}</div>
</article>
{ad_slot(lang, 'mid', left=False) if len(parts) > 1 else ''}
<div class="wrap narrow"><div class="prose">{parts[1] if len(parts) > 1 else ''}{try_html}{src}</div></div>
{guides_block(lang, skip=a['slug'], center=True)}
{ad_slot(lang, 'bottom', left=False)}'''
    return path, page(lang, head(lang, a['title'], a['desc'], path, jsonld=ld, og_type='article'), body, path, current='guide')


def doc_page(lang, key):
    c = PAGES[lang][key]
    path = key + '/'
    body = f'<div class="wrap narrow doc prose">{c["body"]}</div>'
    return path, page(lang, head(lang, c['title'], c['desc'], path, ads=False), body, path)


def licenses_page(lang):
    c = PAGES[lang]['licenses']
    body = f'''<div class="wrap narrow doc prose"><h1>{esc(c['h1'])}</h1><p>{esc(c['intro'])}</p>
<h2>twitter-text 3.1.0</h2>
<p>{c['tt']}</p>
<p>Copyright 2018 Twitter, Inc. Licensed under the <a href="https://www.apache.org/licenses/LICENSE-2.0">Apache License, Version 2.0</a>. <a href="https://github.com/twitter/twitter-text">github.com/twitter/twitter-text</a></p>
<h2>Pretendard 1.3.9</h2>
<p>{c['pt']}</p>
<p>Copyright (c) 2021 Kil Hyung-jin. Licensed under the <a href="https://openfontlicense.org/open-font-license-official-text/">SIL Open Font License 1.1</a>. <a href="https://github.com/orioncactus/pretendard">github.com/orioncactus/pretendard</a></p>
</div>'''
    return 'licenses/', page(lang, head(lang, c['title'], c['desc'], 'licenses/', ads=False), body, 'licenses/')


def not_found():
    cells = ''.join(f'<i>{ch}</i>' for ch in '404')
    body = f'''<div class="wrap narrow nf">
  <p class="cellrow" aria-hidden="true">{cells}</p>
  <h1>{UI['en']['nf_title']} · <span lang="ko">{UI['ko']['nf_title']}</span></h1>
  <p><a class="btn go" href="/">{UI['en']['home']}</a> <a class="btn" href="/ko/" lang="ko">{UI['ko']['home']}</a></p>
</div>'''
    h = head('en', 'Page not found | Kankan', 'This page does not exist.', '', noindex=True, ads=False, langbar=False)
    return f'{h}\n<body>\n{header("en", "")}\n<main id="main">\n{body}\n</main>\n{footer("en")}\n{cfg_script({"lang": "en", "t": {"close": "Close"}})}\n<script src="/assets/app.js"></script>\n</body>\n</html>\n'


def sitemap(paths):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in paths:
        out.append(f'  <url><loc>{SITE}{path}</loc><lastmod>{lastmod(path)}</lastmod></url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


def rss():
    items = ''
    for a in A['ko']:
        link_ = f'{SITE}/ko/guide/{a["slug"]}/'
        full = f'<p>{a["answer"]}</p>' + expand(a['body'], 'ko').replace('<!--ad-->', '')
        y, mo, d = (int(x) for x in a.get('published', FIRST).split('-'))
        pub = format_datetime(datetime(y, mo, d, tzinfo=timezone.utc), usegmt=True)
        items += (f'<item><title>{esc(a["h1"])}</title><link>{link_}</link><guid>{link_}</guid>'
                  f'<pubDate>{pub}</pubDate><description>{esc(a["desc"])}</description>'
                  f'<content:encoded><![CDATA[{full}]]></content:encoded></item>\n')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>칸칸 가이드</title><link>{SITE}/ko/guide/</link><description>글자 수와 바이트를 세는 법</description><language>ko</language>
{items}</channel></rss>
'''


def build():
    out = {}
    paths = []

    def add(lang, rel, text, index=True):
        full = prefix(lang) + rel
        out[(full.lstrip('/') + 'index.html')] = text
        if index:
            paths.append(full)

    for lang in ('en', 'ko'):
        order = [key for _, _, key in NAV[lang]]
        for key in order:
            if (lang, key) in TOOLS:
                add(lang, *tool_page(lang, key))
            elif key == 'jasoseo':
                add(lang, *jasoseo_page())
        add(lang, *guide_index(lang))
        for a in A[lang]:
            add(lang, *article_page(lang, a))
        for key in ('about', 'privacy'):
            add(lang, *doc_page(lang, key))
        add(lang, *licenses_page(lang))
    out['404.html'] = not_found()
    out['sitemap.xml'] = sitemap(paths)
    out['rss.xml'] = rss()
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
