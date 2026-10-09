#!/usr/bin/env python3
"""칸칸(count.lumenlab.page) 페이지 전부 만들기: python3 count/_dev/build.py   (--check 는 낡았는지만 본다)

- 화면 글 = _dev/content.json, 가이드 글 = _dev/articles.json, 확인 대기 값 = _dev/limits.json(verified=true 만 화면에 쓴다).
- 만드는 것: 영어 / , 한국어 /ko/ 의 도구·가이드·소개·방침·오픈소스 고지, 404.html, sitemap.xml, rss.xml(한국어 글).
  만든 파일은 손으로 고치지 않는다.
- lastmod 는 UPDATED 에 실제로 고친 날만 적는다.
"""
import html
import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
SITE = 'https://count.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
TODAY = '2026-10-09'
UPDATED = {}  # 주소: 'YYYY-MM-DD' (처음 판은 TODAY)
WPM = {'read': 200, 'speak': 130}  # 가정한 값(출처 확인 전). 화면에 '가정'이라고 밝히고 바꿀 수 있게 둔다.

C = json.loads((DEV / 'content.json').read_text(encoding='utf-8'))
A = json.loads((DEV / 'articles.json').read_text(encoding='utf-8')) if (DEV / 'articles.json').exists() else {'ko': [], 'en': []}
UI, T, PAGES = C['ui'], C['t'], C['pages']
esc = lambda s: html.escape(str(s), quote=True)
nfd = lambda s: unicodedata.normalize('NFD', s)

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
    },
    'en': {
        'words': ('Words', ''), 'chars': ('Characters', ''), 'nospace': ('Without spaces', ''),
        'wordsSeg': ('Words <small>Unicode rules</small>', ''), 'sentences': ('Sentences', ''), 'paras': ('Paragraphs', ''), 'lines': ('Lines', ''),
        'read': ('Reading time', ''), 'speak': ('Speaking time', ''),
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

TOOLS = {
    ('en', 'home'): dict(path='', big=['words', 'chars'], rows=['nospace', 'wordsSeg', 'sentences', 'paras', 'read', 'speak'], strip3='nospace',
                         goal=['words', 'chars', 'nospace'], scripts=['lc-core'], inspect=True, sample='en', wpm=True),
    ('en', 'chars'): dict(path='character-counter/', big=['chars', 'nospace'], rows=['utf8', 'utf16', 'codepoints', 'words', 'lines'], strip3='utf8',
                          goal=['chars', 'nospace', 'utf8'], scripts=['lc-core', 'lc-x-tld', 'lc-x'], inspect=True, sample='x', x=True),
    ('en', 'sms'): dict(path='sms/', big=['segs', 'smsLeft'], rows=['smsEnc', 'smsLen', 'smsPer', 'chars'], strip3='smsEnc',
                        goal=[], scripts=['lc-core', 'lc-sms'], sample='sms', sms=True),
    ('ko', 'home'): dict(path='', big=['chars', 'nospace'], rows=['utf8', 'euckr', 'words', 'sentences', 'lines', 'sheets'], strip3='utf8',
                         goal=['chars', 'nospace', 'utf8'], scripts=['lc-core', 'lc-cp949'], inspect=True, sample='ko', miss=True),
    ('ko', 'byte'): dict(path='byte/', big=['utf8', 'euckr'], rows=['utf16', 'chars', 'nospace', 'lines'], strip3='utf16',
                         goal=['utf8', 'euckr', 'chars'], scripts=['lc-core', 'lc-cp949'], sample='ko', miss=True, ks=True,
                         nl_now='줄바꿈은 {n}바이트로 셈', nl_opts=['0', '1', '2']),
    ('ko', 'wongoji'): dict(path='wongoji/', big=['laid', 'sheets'], rows=['plain', 'nospace', 'rowsUsed', 'lastRows'], strip3='plain',
                            goal=[], scripts=['lc-core', 'lc-wongoji'], sample='ko', sheet=True),
}
NAV = {
    'en': [('', 'Words', 'home'), ('character-counter/', 'Characters', 'chars'), ('sms/', 'SMS', 'sms'), ('guide/', 'Guides', 'guide')],
    'ko': [('', '글자수 세기', 'home'), ('jasoseo/', '자소서', 'jasoseo'), ('byte/', '바이트', 'byte'), ('wongoji/', '원고지', 'wongoji'), ('guide/', '가이드', 'guide')],
}
# 같은 역할이라 서로 잇는 페이지(영어 경로 -> 한국어 경로). 글은 articles.json 의 pair 로 잇는다.
PAIRS = {'': '', 'guide/': 'guide/', 'about/': 'about/', 'privacy/': 'privacy/', 'licenses/': 'licenses/'}

LOGO = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect class="lg-b" x="1" y="1" width="20" height="20" rx="3"/><path class="lg-l" d="M11 1v20M1 11h20"/><rect class="lg-f" x="1" y="1" width="10" height="10" rx="2"/></svg>'
LOCK = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2.5" y="6" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 6V4.3a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
ANIM = "<script>(function(d){var h=d.documentElement;if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)&&'IntersectionObserver' in window){h.classList.add('anim');setTimeout(function(){if(!window.__kkAnim)h.classList.remove('anim')},3000)}})(document)</script>"


def prefix(lang):
    return '/ko/' if lang == 'ko' else '/'


def url(lang, path=''):
    return SITE + prefix(lang) + path


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
{ANIM}
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


def ad_slot(lang, name):
    return f'<div class="ad-wrap wrap" data-slot="{name}"><p class="ad-label">{UI[lang]["ad"]}</p><div class="ad-slot" data-ad="{name}" hidden></div></div>'


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


def guides_block(lang, limit=3, skip=None):
    arts = [a for a in A[lang] if a['slug'] != skip][:limit]
    if not arts:
        return ''
    p = prefix(lang)
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/"><b>{esc(a["h1"])}</b><span>{esc(a["desc"])}</span></a></li>' for a in arts)
    return f'<section class="sec wrap narrow"><h2>{UI[lang]["more_guides"]}</h2><ul class="jump jump-g">{items}</ul></section>'


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


def cells_html(n=25):
    return '<div class="cells" aria-hidden="true">' + '<i></i>' * n + '</div>'


def strip_html(lang, keys, strip3):
    s = SHORT[lang]
    out = ''
    for k in keys:
        out += f'<p><span>{s.get(k) or strip_tags(M[lang][k][0])}</span><b data-n="{k}">0</b></p>'
    lab = s.get(strip3) or strip_tags(M[lang][strip3][0])
    out += f'<p data-strip3><span>{lab}</span><b>{"GSM-7" if strip3 == "smsEnc" else "0"}</b></p>'
    return f'<div class="strip" aria-hidden="true">{out}</div>'


def strip_tags(s):
    import re
    return re.sub(r'<[^>]+>', '', s).strip()


def basis_details(lang, tool, extra=''):
    u = UI[lang]
    now = (tool.get('nl_now') or T[lang]['nlNow']).replace('{n}', '1')
    opts = tool.get('nl_opts') or u['nl_opts']
    seg = ''.join(f'<button type="button" data-nl="{i}" aria-pressed="{"true" if i == 1 else "false"}">{esc(o)}</button>' for i, o in enumerate(opts))
    return f'''<details class="basis">
      <summary><span id="nlNow">{esc(now)}</span><em>{u['basis_change']}</em></summary>
      <div class="in"><p>{esc(u['nl_why'])}</p><span class="seg" role="group" aria-label="{esc(u['nl_group'])}">{seg}</span>{extra}</div>
    </details>'''


def pad_html(lang, rows_attr=''):
    u = UI[lang]
    return f'''<section class="pad" aria-label="{u['ta_label']}">
      <textarea id="text" placeholder="{esc(u['placeholder'])}" spellcheck="false" aria-label="{u['ta_label']}"{rows_attr}></textarea>
      <div class="bar">
        <button class="btn go if-empty" data-act="sample" type="button">{u['sample_btn']}</button>
        <button class="btn if-text" data-act="copy" type="button">{u['copy']}</button>
        <span class="undo" hidden>{u['undo_msg']} <button class="linkbtn" data-act="undo" type="button">{u['undo']}</button></span>
        <span class="sp"></span>
        <button class="btn quiet if-text" data-act="clear" type="button">{u['clear']}</button>
      </div>
    </section>'''


def nums_html(lang, key, tool, c):
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
        {cells_html()}
        <div class="goal-line">
          <button class="linkbtn" data-act="goal-open" type="button">{u['goal_open']}</button>
          <span class="goal-form" hidden><label for="goal">{u['goal']}</label><input class="fld n" id="goal" type="text" inputmode="numeric" autocomplete="off"><select class="fld" id="goalBasis" aria-label="{u['goal_basis']}">{opts}</select><button class="goal-x" data-act="goal-close" type="button" aria-label="{u['goal_clear']}">×</button></span>
          <span class="goal-msg" id="goalMsg" aria-live="polite"></span>
        </div>
      </div>'''
    if tool.get('sms'):
        goal = '<div class="segbar" id="segbar" aria-hidden="true"><i></i></div>'
    rows = ''
    for k in tool['rows']:
        lab, unit = m[k]
        cls = ' class="txt"' if k in TXT_ROWS else ''
        zero = {'smsEnc': 'GSM-7', 'smsLen': '0', 'read': '0', 'speak': '0', 'smsPer': '160'}.get(k, '0')
        rows += f'<div><dt>{lab}</dt><dd{cls}><span data-n="{k}">{zero}</span>{"<i>" + unit + "</i>" if unit else ""}</dd></div>'
    extra = ''
    if tool.get('miss'):
        extra += '<p class="miss" data-miss hidden></p>'
    if tool.get('ks'):
        extra += '<p class="note" data-ks hidden></p>'
    if tool.get('sms'):
        extra += '<div class="miss" id="smsBad" hidden><span></span><div class="chips"></div></div>'
    xbox = ''
    if tool.get('x'):
        xbox = f'''<div class="xbox">
      <h2>{esc(c['x_title'])} <span id="xNum"><b data-n="xw">0</b><small> / 280</small></span></h2>
      <div class="cells c28" id="xCells" aria-hidden="true">{'<i></i>' * 28}</div>
      <p><b id="xMsg"></b> {esc(c['x_note'])}</p>
    </div>'''
    wpm = ''
    if tool.get('wpm'):
        wpm = (f'<p><label>Reading speed (assumed) <input class="fld n" id="wpmRead" type="text" inputmode="numeric" value="{WPM["read"]}"> words/min</label>'
               f'<label>Speaking speed (assumed) <input class="fld n" id="wpmSpeak" type="text" inputmode="numeric" value="{WPM["speak"]}"> words/min</label></p>')
    basis = '' if tool.get('sms') or tool.get('sheet') else basis_details(lang, tool, wpm)
    return f'''<aside class="nums" aria-label="{u['nums_label']}">
      <div class="big">{big}{goal}</div>
      <dl class="rows">{rows}</dl>
      {extra}{xbox}<p class="proof">{esc(c['proof'])}</p>{basis}
    </aside>'''


def tool_cfg(lang, key, tool):
    t = dict(T[lang])
    if tool.get('nl_now'):
        t['nlNow'] = tool['nl_now']
    cfg = {'tool': key, 't': t, 'sample': C['sample'][tool['sample']],
           'goal': [{'k': k, 'label': GOAL[lang][k][1], 'unit': GOAL[lang][k][2]} for k in tool['goal']]}
    s3 = tool['strip3']
    cfg['strip3'] = {'k': s3, 'label': SHORT[lang].get(s3) or strip_tags(M[lang][s3][0])}
    if tool.get('inspect'):
        cfg['inspect'] = INSPECT[lang]
    if tool.get('wpm'):
        cfg['wpm'] = WPM
    return cfg


def inspect_html(c):
    return f'''<section class="sec wrap narrow" id="inspect"><h2>{esc(c['inspect_h'])}</h2><p>{esc(c['inspect_p'])}</p>
  <div class="insp"><div class="insp-pick" id="inspPick"></div><div class="insp-stage" id="inspStage"></div><p class="insp-sum" id="inspSum" aria-live="polite"></p></div>
</section>'''


def phead(lang, c):
    return f'''<div class="phead wrap">
  <h1>{esc(c['h1'])}</h1>
  <p class="lead">{esc(c['lead'])}</p>
  <p class="safe">{LOCK}{UI[lang]['safe']}</p>
</div>'''


def tool_page(lang, key):
    tool = TOOLS[(lang, key)]
    c = PAGES[lang][key]
    path = tool['path']
    if tool.get('sheet'):
        left = f'<div class="wg-left">{pad_html(lang)}{nums_html(lang, key, tool, c)}</div>'
        work = f'''<div class="tool wg-tool wrap" data-tool="{key}">
    {left}
    <section class="sheet" aria-label="{esc(c['sheet_title'])}">
      <div class="sheet-head"><p>{esc(c['sheet_title'])}<b data-n="laid">0</b>장</p><p class="pager"><button type="button" id="prev" aria-label="{c['prev']}" disabled>‹</button><span class="num" id="pageNo">1 / 1</span><button type="button" id="next" aria-label="{c['next']}" disabled>›</button></p></div>
      <svg id="sheet" viewBox="0 0 724 446" role="img" aria-label="{esc(c['sheet_title'])}"></svg>
      <div class="sheet-foot"><span>20 × 10</span><span class="num" id="sheetNo">No. 1</span></div>
      <p class="sheet-note">{esc(c['sheet_rule'])}</p>
    </section>
  </div>'''
    else:
        work = f'''<div class="tool wrap" data-tool="{key}">
    {pad_html(lang)}
    {nums_html(lang, key, tool, c)}
  </div>'''
    body = phead(lang, c) + '\n' + strip_html(lang, tool['big'], tool['strip3']) + '\n' + work
    if tool.get('inspect'):
        body += '\n' + inspect_html(c)
    body += '\n' + tools_block(lang, key)
    body += f'\n<section class="sec wrap narrow"><h2>{esc(c["basis_h"])}</h2>{defs_html(c["defs"])}</section>'
    body += '\n' + ad_slot(lang, 'mid')
    body += '\n' + faq_html(lang, c.get('faq'))
    body += '\n' + guides_block(lang)
    body += '\n' + ad_slot(lang, 'bottom')
    ld = [app_ld(lang, c.get('name', c['h1']), c['desc'], path)]
    if c.get('faq'):
        ld.append(faq_ld(c['faq']))
    return path, page(lang, head(lang, c['title'], c['desc'], path, jsonld=ld, scripts=tool['scripts']), body, path, current=key, cfg=tool_cfg(lang, key, tool))


def jasoseo_page():
    lang, key, path = 'ko', 'jasoseo', 'jasoseo/'
    c, u = PAGES['ko']['jasoseo'], UI['ko']
    opts = ''.join(f'<option value="{k}">{esc(v)}</option>' for k, v in c['bases'])
    q = f'''<article class="q">
        <div class="q-head"><span class="q-no" aria-hidden="true">1</span><input class="q-title" type="text" placeholder="{esc(c['q_title'])}" aria-label="{esc(c['q_title'])}" autocomplete="off">
          <label>{c['q_goal']} <input class="fld n q-goal" type="text" inputmode="numeric" autocomplete="off"></label>
          <label><span class="sr">{c['q_basis']}</span><select class="fld q-basis">{opts}</select></label></div>
        <textarea placeholder="{esc(c['q_text'])}" spellcheck="false" aria-label="{esc(c['q_text'])}"></textarea>
        <div class="q-foot">{cells_html()}
          <p class="cnt"><b class="q-n num">0</b><span class="q-u">자</span><span class="left" aria-live="polite"></span><br><small class="q-sub"></small></p>
          <button class="btn quiet q-del" type="button" hidden>{c['q_del']}</button></div>
      </article>'''
    seg = ''.join(f'<button type="button" data-nl="{i}" aria-pressed="{"true" if i == 1 else "false"}">{o}</button>' for i, o in enumerate(u['nl_opts']))
    body = f'''{phead(lang, c)}
<div class="wrap js-wrap" data-tool="jasoseo">
  <div class="js-top">
    <p class="tot">{c['tot'][0]} <b id="qCount" class="num">1</b>{c['tot'][1]} <b id="qTotal" class="num">0</b>{c['tot'][2]}</p>
    <span class="sp"></span>
    <label class="switch"><input type="checkbox" id="save"> {c['save']}</label>
    <button class="btn quiet" id="wipe" type="button" hidden>{c['wipe']}</button>
  </div>
  <div class="js-list" id="qList">
      {q}
  </div>
  <template id="qT">{q}</template>
  <div class="js-add"><button class="btn go" id="qAdd" type="button">{c['q_add']}</button></div>
  <details class="basis js-basis">
    <summary><span id="nlNow">{T['ko']['nlNow'].replace('{n}', '1')}</span><em>{u['basis_change']}</em></summary>
    <div class="in"><p>{esc(u['nl_why'])}</p><span class="seg" role="group" aria-label="{esc(u['nl_group'])}">{seg}</span></div>
  </details>
</div>
<section class="sec wrap narrow"><h2>{esc(c['how_h'])}</h2><ol class="steps">{''.join(f'<li>{esc(x)}</li>' for x in c['how'])}</ol></section>
<section class="sec wrap narrow"><h2>{esc(c['save_h'])}</h2><p>{esc(c['save_p'])}</p></section>
{tools_block(lang, key)}
{ad_slot(lang, 'mid')}
{faq_html(lang, c['faq'])}
{guides_block(lang)}
{ad_slot(lang, 'bottom')}'''
    ld = [app_ld(lang, c['name'], c['desc'], path), faq_ld(c['faq'])]
    cfg = {'tool': key, 't': T['ko']}
    return path, page(lang, head(lang, c['title'], c['desc'], path, jsonld=ld, scripts=['lc-core']), body, path, current=key, cfg=cfg)


def guide_index(lang):
    c, p = PAGES[lang]['guide'], prefix(lang)
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/">{esc(a["h1"])}</a><p>{esc(a["desc"])}</p></li>' for a in A[lang])
    body = f'<div class="wrap narrow doc"><h1>{esc(c["h1"])}</h1><p>{esc(c["lead"])}</p><ul class="glist">{items}</ul></div>\n{tools_block(lang, "guide")}'
    return 'guide/', page(lang, head(lang, c['title'], c['desc'], 'guide/', ads=False), body, 'guide/', current='guide')


def article_page(lang, a):
    u, p = UI[lang], prefix(lang)
    path = f'guide/{a["slug"]}/'
    day = UPDATED.get(prefix(lang) + path, TODAY)
    ld = [{'@context': 'https://schema.org', '@type': 'Article', 'headline': a['h1'], 'description': a['desc'], 'inLanguage': lang,
           'datePublished': a.get('published', TODAY), 'dateModified': day, 'mainEntityOfPage': url(lang, path),
           'image': f'{SITE}/{"og-ko.png" if lang == "ko" else "og.png"}',
           'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'},
           'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}},
          {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
              {'@type': 'ListItem', 'position': 1, 'name': u['guides'], 'item': url(lang, 'guide/')},
              {'@type': 'ListItem', 'position': 2, 'name': a['h1'], 'item': url(lang, path)}]}]
    body_html = a['body'].replace('<table>', '<div class="tbl"><table>').replace('</table>', '</table></div>')
    parts = body_html.split('<!--ad-->')
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
{ad_slot(lang, 'mid') if len(parts) > 1 else ''}
<div class="wrap narrow"><div class="prose">{parts[1] if len(parts) > 1 else ''}{try_html}{src}</div></div>
{guides_block(lang, skip=a['slug'])}
{ad_slot(lang, 'bottom')}'''
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
    h = head('en', 'Page not found | Kankan', 'This page does not exist.', '', noindex=True, ads=False)
    return f'{h}\n<body>\n{header("en", "")}\n<main id="main">\n{body}\n</main>\n{footer("en")}\n{cfg_script({"lang": "en", "t": {"close": "Close"}})}\n<script src="/assets/app.js"></script>\n</body>\n</html>\n'


def sitemap(paths):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in paths:
        out.append(f'  <url><loc>{SITE}{path}</loc><lastmod>{UPDATED.get(path, TODAY)}</lastmod></url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


def rss():
    items = ''
    for a in A['ko']:
        link = f'{SITE}/ko/guide/{a["slug"]}/'
        full = f'<p>{a["answer"]}</p>' + a['body'].replace('<!--ad-->', '')
        items += (f'<item><title>{esc(a["h1"])}</title><link>{link}</link><guid>{link}</guid>'
                  f'<pubDate>Fri, 09 Oct 2026 00:00:00 GMT</pubDate><description>{esc(a["desc"])}</description>'
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
        for (l, key) in TOOLS:
            if l == lang:
                rel, text = tool_page(lang, key)
                add(lang, rel, text)
        if lang == 'ko':
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
