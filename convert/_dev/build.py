#!/usr/bin/env python3
"""인플레이스(convert.lumenlab.page) 페이지 전부 만들기: python3 convert/_dev/build.py

- 도구 목록·설정 = 아래 TOOLS, 글 = _dev/content.json(도구·첫 페이지·소개) + _dev/articles.json(가이드 글).
- 만드는 것: 영어 / , 한국어 /ko/ 의 첫 페이지·도구 24개·가이드·소개·방침·오픈소스 고지, 404, sitemap.xml, rss.xml(한국어 글),
  assets/tools.js(화면 코드가 쓰는 도구 목록). 만든 파일은 손으로 고치지 않는다.
- lastmod는 UPDATED에 실제로 고친 날만 적는다.
"""
import json, html, re, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
SITE = 'https://convert.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
TODAY = '2026-10-06'
UPDATED = {}  # 주소: 'YYYY-MM-DD' (처음 판은 TODAY)

# 도구: id, 분류, 받는 파일, 여러 개, 순서 바꾸기, 글자판 짝(보여 주기용)
TOOLS = [
    # 영상·음성
    dict(id='video-to-mp3', cat='video', accept='.mp4,.mov,.m4v,.webm,.mkv,.ts,.mts,.3gp', pair=('MP4', 'MP3'), fmts='MP4, MOV, M4V, WebM, MKV'),
    dict(id='audio-converter', cat='audio', accept='.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.weba,.webm', pair=('M4A', 'MP3'), fmts='MP3, M4A, AAC, WAV, OGG, Opus, FLAC'),
    dict(id='cut-audio', cat='audio', accept='.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.weba', pair=('MP3', 'CUT'), fmts='MP3, M4A, AAC, WAV, OGG, FLAC'),
    dict(id='video-converter', cat='video', accept='.mp4,.mov,.m4v,.webm,.mkv,.ts,.mts,.3gp', pair=('MOV', 'MP4'), fmts='MP4, MOV, WebM, MKV, TS'),
    dict(id='cut-video', cat='video', accept='.mp4,.mov,.m4v,.webm,.mkv', pair=('MP4', 'CUT'), fmts='MP4, MOV, WebM, MKV'),
    dict(id='compress-video', cat='video', accept='.mp4,.mov,.m4v,.webm,.mkv', pair=('1GB', '80MB'), fmts='MP4, MOV, WebM, MKV'),
    dict(id='video-to-gif', cat='video', accept='.mp4,.mov,.m4v,.webm,.mkv', pair=('MP4', 'GIF'), fmts='MP4, MOV, WebM, MKV'),
    # 그림
    dict(id='image-converter', cat='image', accept='.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.svg', multiple=True, pair=('PNG', 'JPG'), fmts='JPG, PNG, WebP, GIF, BMP, AVIF, SVG'),
    dict(id='heic-to-jpg', cat='image', accept='.heic,.heif', multiple=True, pair=('HEIC', 'JPG'), fmts='HEIC, HEIF'),
    dict(id='compress-image', cat='image', accept='.jpg,.jpeg,.png,.webp,.avif,.bmp', multiple=True, pair=('4MB', '600K'), fmts='JPG, PNG, WebP'),
    dict(id='resize-image', cat='image', accept='.jpg,.jpeg,.png,.webp,.avif,.bmp,.gif', multiple=True, pair=('4000', '1200'), fmts='JPG, PNG, WebP'),
    # PDF
    dict(id='images-to-pdf', cat='pdf', accept='.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif', multiple=True, order=True, pair=('JPG', 'PDF'), fmts='JPG, PNG, WebP'),
    dict(id='pdf-to-jpg', cat='pdf', accept='.pdf', pair=('PDF', 'JPG'), fmts='PDF'),
    dict(id='merge-pdf', cat='pdf', accept='.pdf', multiple=True, order=True, pair=('PDF', '1PDF'), fmts='PDF'),
    dict(id='split-pdf', cat='pdf', accept='.pdf', pair=('PDF', 'P1-3'), fmts='PDF'),
    dict(id='compress-pdf', cat='pdf', accept='.pdf', pair=('9MB', '2MB'), fmts='PDF'),
    dict(id='organize-pdf', cat='pdf', accept='.pdf', pair=('3412', '1234'), fmts='PDF'),
    dict(id='rotate-pdf', cat='pdf', accept='.pdf', pair=('PDF', '90°'), fmts='PDF'),
    dict(id='pdf-page-numbers', cat='pdf', accept='.pdf', pair=('PDF', '1/9'), fmts='PDF'),
    dict(id='watermark-pdf', cat='pdf', accept='.pdf', pair=('PDF', 'MARK'), fmts='PDF'),
    dict(id='protect-pdf', cat='pdf', accept='.pdf', pair=('PDF', 'LOCK'), fmts='PDF'),
    dict(id='unlock-pdf', cat='pdf', accept='.pdf', pair=('LOCK', 'OPEN'), fmts='PDF'),
    # 표
    dict(id='csv-json', cat='data', accept='.csv,.tsv,.txt,.json', pair=('CSV', 'JSON'), fmts='CSV, TSV, JSON'),
    dict(id='excel-csv', cat='data', accept='.xlsx,.xls,.xlsm,.ods,.csv', pair=('XLSX', 'CSV'), fmts='XLSX, XLS, ODS, CSV'),
]
KINDS = {
    'video': ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'ts', 'mts', '3gp', 'avi', 'wmv', 'flv'],
    'audio': ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'flac', 'weba', 'wma', 'amr'],
    'image': ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'svg', 'heic', 'heif', 'tif', 'tiff', 'ico'],
    'pdf': ['pdf'],
    'data': ['csv', 'tsv', 'json', 'xlsx', 'xls', 'xlsm', 'ods', 'txt'],
}
CATS = {
    'video': {'en': 'Video', 'ko': '동영상'},
    'audio': {'en': 'Audio', 'ko': '오디오'},
    'image': {'en': 'Images', 'ko': '이미지'},
    'pdf': {'en': 'PDF', 'ko': 'PDF'},
    'data': {'en': 'Spreadsheets & data', 'ko': '표·데이터'},
}
CAT_ORDER = ['video', 'audio', 'image', 'pdf', 'data']
ARTICLE_PAIRS = {'heic-vs-jpg': 'iphone-heic-jpg', 'youtube-to-mp3-legal': 'youtube-mp3-legal', 'compress-pdf-without-upload': 'pdf-yongryang-julgi',
                 'remove-pdf-password': 'pdf-amho-haeje', 'reduce-video-size-for-email': 'dongyeongsang-yongryang-julgi'}

UI = {
    'en': dict(brand='Inplace', all='All tools', guides='Guides', about='About', privacy='Privacy', licenses='Open-source licenses',
               contact='Contact', lang_other='한국어', choose='Choose file', choose_many='Choose files', drop='or drop it here',
               drop_many='or drop them here', accepts='Accepts', stays='Converted on this device. Your files are never uploaded.',
               faq='Questions', related='More {cat} tools', every='Every tool', ad='Advertisement', skip='Skip to content',
               hub_drop='We’ll show what you can do with it', hub_drop2='Video, audio, image, PDF, CSV or Excel · or drop it here', hub_pick='Choose a file',
               made='Made by', next_stop='Next stop', more_from='Lumen Lab: more apps and tools', guides_h='Guides', tools_n='{n} tools',
               not_found='This page doesn’t exist.', home='Go to all tools', read='Read', updated='Updated',
               how_h='Why nothing gets uploaded', crumb_home='All tools'),
    'ko': dict(brand='인플레이스', all='모든 도구', guides='가이드', about='소개', privacy='개인정보 처리방침', licenses='오픈소스 고지',
               contact='문의', lang_other='English', choose='파일 고르기', choose_many='파일 고르기', drop='또는 여기에 끌어 놓기',
               drop_many='또는 여러 개를 끌어 놓기', accepts='받는 형식', stays='이 기기 안에서 변환해요. 파일이 어디에도 올라가지 않아요.',
               faq='자주 묻는 질문', related='다른 {cat} 도구', every='모든 도구', ad='광고', skip='본문으로 건너뛰기',
               hub_drop='고른 파일로 할 수 있는 일을 바로 보여 드려요', hub_drop2='동영상, 오디오, 이미지, PDF, CSV, 엑셀 · 여기에 끌어 놓아도 돼요', hub_pick='파일 고르기',
               made='만든 곳', next_stop='다음 행선지', more_from='루멘랩: 다른 앱과 도구 보기', guides_h='가이드', tools_n='도구 {n}개',
               not_found='찾는 페이지가 없어요.', home='모든 도구 보기', read='읽기', updated='고친 날',
               how_h='파일이 올라가지 않는 이유', crumb_home='모든 도구'),
}

esc = lambda s: html.escape(str(s), quote=True)


def load_json(name):
    p = DEV / name
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}


CONTENT = load_json('content.json')
ARTICLES = load_json('articles.json')


def tool_text(tid, lang):
    c = CONTENT.get('tools', {}).get(tid, {}).get(lang)
    if not c:
        n = tid.replace('-', ' ').title()
        c = dict(name=n, h1=n, title=n, desc=n, lead=n, short=n, about=[], faq=[])
    c.setdefault('h1', c['name'])
    c.setdefault('short', c.get('lead', ''))
    return c


def prefix(lang):
    return '/ko/' if lang == 'ko' else '/'


def url(lang, path=''):
    return SITE + prefix(lang) + path


# ---------------- 틀 ----------------
def head(lang, title, desc, path, alt=None, jsonld=(), og_type='website', noindex=False, ads=True, extra=''):
    """path: 언어 앞머리 뒤 경로(예 'video-to-mp3/'). alt: 다른 언어판 경로(같은 역할일 때만)."""
    canon = url(lang, path)
    other = 'en' if lang == 'ko' else 'ko'
    links = [f'<link rel="canonical" href="{canon}">'] if not noindex else []
    if alt is not None and not noindex:
        en_u = url('en', path if lang == 'en' else alt)
        ko_u = url('ko', path if lang == 'ko' else alt)
        links += [f'<link rel="alternate" hreflang="en" href="{en_u}">', f'<link rel="alternate" hreflang="ko" href="{ko_u}">',
                  f'<link rel="alternate" hreflang="x-default" href="{en_u}">']
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>\n' for j in jsonld)
    ad = (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADS_CLIENT}" crossorigin="anonymous"></script>\n'
          '<script src="/assets/ads-config.js"></script>\n') if ads else ''
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{'<meta name="robots" content="noindex">' if noindex else ''}
<meta name="theme-color" content="#f2f0ea" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131316" media="(prefers-color-scheme: dark)">
{chr(10).join(links)}
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:site_name" content="{UI[lang]['brand']}">
<meta property="og:image" content="{SITE}/og.png">
<meta property="og:locale" content="{'ko_KR' if lang == 'ko' else 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" media="print" onload="this.media='all'">
<link rel="stylesheet" href="/assets/style.css">
<script type="importmap">{{"imports":{{"mediabunny":"/assets/vendor/mediabunny.min.mjs"}}}}</script>
{ld}{ad}{extra}</head>'''


def flap(text, size=''):
    return f'<span class="flap {size}" aria-hidden="true" data-text="{esc(text)}">' + ''.join(f'<b class="blank"> </b>' if c == ' ' else f'<b>{esc(c)}</b>' for c in text) + '</span>'


def header(lang, alt_path=None):
    u = UI[lang]
    p = prefix(lang)
    other = 'en' if lang == 'ko' else 'ko'
    lang_link = ''
    if alt_path is not None:
        lang_link = f'<a class="lang" href="{prefix(other)}{alt_path}" lang="{other}" hreflang="{other}">{u["lang_other"]}</a>'
    return f'''<a class="skip" href="#main">{u['skip']}</a>
<header class="top wrap">
  <a class="logo" href="{p}">{flap('IN', 'logo-flap')}<span>{u['brand']}</span></a>
  <nav class="top-nav" aria-label="{'사이트 메뉴' if lang == 'ko' else 'Site'}"><a href="{p}#tools">{u['all']}</a><a href="{p}guide/">{u['guides']}</a>{lang_link}</nav>
</header>'''


def footer(lang):
    u = UI[lang]
    p = prefix(lang)
    cols = []
    for c in CAT_ORDER:
        items = ''.join(f'<li><a href="{p}{t["id"]}/">{esc(tool_text(t["id"], lang)["name"])}</a></li>' for t in TOOLS if t['cat'] == c)
        cols.append(f'<div><p class="foot-h">{CATS[c][lang]}</p><ul>{items}</ul></div>')
    return f'''<footer class="foot">
  <div class="wrap">
    <div class="foot-cols">{''.join(cols)}</div>
    <a class="lumen" href="https://lumenlab.page/" data-lumen><span class="lumen-k">{u['next_stop']}</span>{flap('LUMEN', 'sm')}<span class="lumen-t"><b>{u['made']} Lumen Lab</b><small>{u['more_from']}</small></span><span class="lumen-go" aria-hidden="true">→</span></a>
    <p class="foot-links"><a href="{p}about/">{u['about']}</a><a href="{p}guide/">{u['guides']}</a><a href="{p}privacy/">{u['privacy']}</a><a href="{p}licenses/">{u['licenses']}</a><a href="mailto:woxocoso@gmail.com">{u['contact']}</a></p>
    <p class="muted small">© 2026 Lumen Lab</p>
  </div>
</footer>'''


def ad_slot(lang, name):
    return f'<div class="ad-wrap wrap" data-ad-wrap><p class="ad-label">{UI[lang]["ad"]}</p><div class="ad-slot" data-ad="{name}" hidden></div></div>'


def page(lang, head_html, body, alt_path=None, body_class=''):
    return f'''{head_html}
<body class="{body_class}">
{header(lang, alt_path)}
<main id="main">
{body}
</main>
{footer(lang)}
<script type="module" src="/assets/app.js"></script>
</body>
</html>
'''


def drop_html(lang, tool, input_id='f'):
    u = UI[lang]
    multi = tool.get('multiple')
    return f'''<div class="drop">
    <input type="file" id="{input_id}" class="sr" accept="{tool['accept']}"{' multiple' if multi else ''}>
    <label for="{input_id}" class="btn-pick">{u['choose_many'] if multi else u['choose']}</label>
    <p class="drop-or">{u['drop_many'] if multi else u['drop']}</p>
    <p class="drop-fmts"><span class="sr">{u['accepts']}: </span>{esc(tool['fmts'])}</p>
  </div>'''


# ---------------- 도구 페이지 ----------------
def tool_page(tool, lang):
    u = UI[lang]
    c = tool_text(tool['id'], lang)
    p = prefix(lang)
    path = tool['id'] + '/'
    about = ''.join(
        f'<section class="prose-sec"><h2>{esc(s["h"])}</h2>' + ''.join(f'<p>{esc(x)}</p>' for x in s['p']) + '</section>'
        for s in c.get('about', []))
    faq = c.get('faq', [])
    faq_html = ''
    if faq:
        faq_html = f'<section class="faq wrap narrow"><h2>{u["faq"]}</h2>' + ''.join(
            f'<details><summary>{esc(q["q"])}</summary><p>{esc(q["a"])}</p></details>' for q in faq) + '</section>'
    # 직접 고른 짝을 먼저, 그다음 같은 분류
    picks = RELATED.get(tool['id'], [])
    rel = [t for i in picks for t in TOOLS if t['id'] == i]
    rel += [t for t in TOOLS if t['cat'] == tool['cat'] and t['id'] != tool['id'] and t['id'] not in picks]
    rel_html = ''.join(card(t, lang) for t in rel[:6])
    ld = [{
        '@context': 'https://schema.org', '@type': 'WebApplication', 'name': c['name'], 'url': url(lang, path),
        'applicationCategory': 'MultimediaApplication' if tool['cat'] in ('video', 'audio', 'image') else 'UtilitiesApplication',
        'operatingSystem': 'Any', 'browserRequirements': 'Requires a modern web browser', 'inLanguage': lang,
        'isAccessibleForFree': True, 'description': c['desc'],
        'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' if lang == 'en' else 'KRW'}
    }, {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': u['crumb_home'], 'item': url(lang)},
            {'@type': 'ListItem', 'position': 2, 'name': c['name'], 'item': url(lang, path)}]
    }]
    if faq:
        ld.append({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
            {'@type': 'Question', 'name': q['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': q['a']}} for q in faq]})
    body = f'''<section class="tool-hero wrap cat-{tool['cat']}">
  <p class="crumb"><a href="{p}">{u['crumb_home']}</a> <span aria-hidden="true">›</span> <a href="{p}#{tool['cat']}">{CATS[tool['cat']][lang]}</a></p>
  <div class="hero-row">
    <h1>{esc(c['h1'])}</h1>
    <p class="pair" aria-hidden="true">{flap(tool['pair'][0], 'md')}<span class="arrow">→</span>{flap(tool['pair'][1], 'md')}</p>
  </div>
  <p class="lead">{esc(c['lead'])}</p>
</section>
<section class="tool wrap" data-tool="{tool['id']}" aria-label="{esc(c['name'])}">
  {drop_html(lang, tool)}
  <p class="stays"><svg class="lock" viewBox="0 0 16 18" width="14" height="16" aria-hidden="true"><rect x="2" y="8" width="12" height="9" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 8V5.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="2"/></svg>{u['stays']}</p>
  <div class="work" hidden></div>
</section>
<div class="prose wrap narrow">{about}</div>
{ad_slot(lang, 'mid')}
{faq_html}
<section class="related wrap"><h2>{u['related'].format(cat=CATS[tool['cat']][lang].lower() if lang == 'en' else CATS[tool['cat']][lang])}</h2><div class="cards">{rel_html}</div>
<p class="all-link"><a href="{p}#tools">{u['every']} →</a></p></section>
{ad_slot(lang, 'bottom')}'''
    return page(lang, head(lang, c['title'], c['desc'], path, alt=path, jsonld=ld), body, alt_path=path, body_class='tool-page')


RELATED = {
    'video-to-mp3': ['cut-audio', 'audio-converter'], 'heic-to-jpg': ['compress-image', 'images-to-pdf'],
    'images-to-pdf': ['heic-to-jpg', 'compress-image'], 'pdf-to-jpg': ['compress-image', 'images-to-pdf'],
    'csv-json': ['excel-csv'], 'excel-csv': ['csv-json'], 'compress-image': ['pdf-to-jpg'],
    'merge-pdf': ['compress-pdf', 'organize-pdf', 'pdf-page-numbers'], 'split-pdf': ['organize-pdf', 'merge-pdf'],
    'compress-pdf': ['merge-pdf', 'compress-image', 'pdf-to-jpg'], 'organize-pdf': ['rotate-pdf', 'split-pdf', 'merge-pdf'],
    'rotate-pdf': ['organize-pdf', 'merge-pdf'], 'pdf-page-numbers': ['merge-pdf', 'watermark-pdf', 'organize-pdf'],
    'watermark-pdf': ['protect-pdf', 'pdf-page-numbers'], 'protect-pdf': ['watermark-pdf', 'unlock-pdf', 'compress-pdf'],
    'unlock-pdf': ['protect-pdf', 'merge-pdf', 'compress-pdf'],
}


def card(t, lang, tag='a'):
    c = tool_text(t['id'], lang)
    return (f'<a class="card cat-{t["cat"]}" href="{prefix(lang)}{t["id"]}/">{flap(t["pair"][1], "xs")}'
            f'<span class="card-name">{esc(c["name"])}</span><span class="card-line">{esc(c["short"])}</span></a>')


# ---------------- 첫 페이지 ----------------
def hub_page(lang):
    u = UI[lang]
    hc = CONTENT.get('hub', {}).get(lang, {'title': 'Inplace', 'desc': '', 'h1': 'Inplace', 'lead': ''})
    p = prefix(lang)
    cats = ''
    for c in CAT_ORDER:
        ts = [t for t in TOOLS if t['cat'] == c]
        cats += f'<section class="cat cat-{c}" id="{c}"><h3>{CATS[c][lang]}</h3><div class="cards">{"".join(card(t, lang) for t in ts)}</div></section>'
    arts = ARTICLES.get(lang, [])
    guide_list = ''.join(f'<li><a href="{p}guide/{a["slug"]}/">{esc(a["title"])}</a><span class="muted">{esc(a["desc"])}</span></li>' for a in arts)
    how = hc.get('how', [])
    how_html = ''.join(f'<p>{esc(x)}</p>' for x in how)
    pairs = [['MP4', 'MP3'], ['HEIC', 'JPG'], ['PDF', 'JPG'], ['CSV', 'JSON'], ['MOV', 'MP4'], ['PNG', 'WEBP'], ['XLSX', 'CSV'], ['WAV', 'MP3']]
    tpl = {'id': 'x', 'accept': '', 'fmts': ''}
    ld = [{'@context': 'https://schema.org', '@type': 'WebSite', 'name': u['brand'], 'url': url(lang), 'inLanguage': lang},
          {'@context': 'https://schema.org', '@type': 'ItemList', 'itemListElement': [
              {'@type': 'ListItem', 'position': i + 1, 'url': url(lang, t['id'] + '/'), 'name': tool_text(t['id'], lang)['name']} for i, t in enumerate(TOOLS)]}]
    body = f'''<section class="hub-hero wrap">
  <p class="hero-flaps" aria-hidden="true" data-pairs='{json.dumps(pairs)}'>{flap('MP4 ', 'lg')}<span class="arrow">→</span>{flap('MP3 ', 'lg')}</p>
  <h1>{esc(hc['h1'])}</h1>
  <p class="lead">{esc(hc['lead'])}</p>
</section>
<section class="hub wrap" data-hub>
  <div class="drop drop-hub">
    <input type="file" id="hubf" class="sr" multiple>
    <label for="hubf" class="btn-pick">{u['hub_pick']}</label>
    <p class="drop-or">{u['hub_drop']}</p>
    <p class="drop-fmts">{u['hub_drop2']}</p>
  </div>
  <p class="stays"><svg class="lock" viewBox="0 0 16 18" width="14" height="16" aria-hidden="true"><rect x="2" y="8" width="12" height="9" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 8V5.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="2"/></svg>{u['stays']}</p>
  <div class="pick" hidden aria-live="polite"></div>
  <template id="tool-tpl"><section class="inline-tool tool">
    <div class="inline-head"><h2 class="inline-title"></h2><a class="inline-link" href="#"></a></div>
    <div class="drop"><input type="file" id="inlf" class="sr"><label for="inlf" class="btn-pick">{u['choose']}</label><p class="drop-or">{u['drop']}</p></div>
    <div class="work" hidden></div>
  </section></template>
</section>
<section class="tools-all wrap" id="tools"><h2>{u['all']} <span class="muted">{u['tools_n'].format(n=len(TOOLS))}</span></h2>{cats}</section>
{ad_slot(lang, 'mid')}
<section class="how wrap narrow"><h2>{u['how_h']}</h2>{how_html}</section>
<section class="guides wrap narrow" id="guides"><h2>{u['guides_h']}</h2><ul class="guide-list">{guide_list}</ul></section>'''
    return page(lang, head(lang, hc['title'], hc['desc'], '', alt='', jsonld=ld), body, alt_path='', body_class='hub-page')


# ---------------- 글·소개·방침 ----------------
def article_page(a, lang):
    u = UI[lang]
    p = prefix(lang)
    path = f'guide/{a["slug"]}/'
    alt = None
    if lang == 'en' and a['slug'] in ARTICLE_PAIRS:
        alt = f'guide/{ARTICLE_PAIRS[a["slug"]]}/'
    if lang == 'ko':
        inv = {v: k for k, v in ARTICLE_PAIRS.items()}
        if a['slug'] in inv:
            alt = f'guide/{inv[a["slug"]]}/'
    day = UPDATED.get(prefix(lang) + path, TODAY)
    ld = [{'@context': 'https://schema.org', '@type': 'Article', 'headline': a['h1'], 'description': a['desc'], 'inLanguage': lang,
           'datePublished': TODAY, 'dateModified': day, 'mainEntityOfPage': url(lang, path),
           'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'},
           'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}},
          {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
              {'@type': 'ListItem', 'position': 1, 'name': u['guides'], 'item': url(lang, 'guide/')},
              {'@type': 'ListItem', 'position': 2, 'name': a['h1'], 'item': url(lang, path)}]}]
    body = f'''<article class="article wrap narrow">
  <p class="crumb"><a href="{p}guide/">{u['guides']}</a></p>
  <h1>{esc(a['h1'])}</h1>
  <p class="muted small">{u['updated']} <time datetime="{day}">{day}</time> · Lumen Lab</p>
  <div class="article-body">{a['body_html']}</div>
</article>
{ad_slot(lang, 'bottom')}'''
    return page(lang, head(lang, a['title'], a['desc'], path, alt=alt, jsonld=ld, og_type='article'), body,
                alt_path=alt if alt else 'guide/', body_class='article-page')


def guide_index(lang):
    u = UI[lang]
    p = prefix(lang)
    arts = ARTICLES.get(lang, [])
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/">{esc(a["title"])}</a><span class="muted">{esc(a["desc"])}</span></li>' for a in arts)
    title = ('가이드 — 파일 형식과 변환' if lang == 'ko' else 'Guides — file formats and conversion')
    desc = ('HEIC·CSV·MP3처럼 자주 막히는 파일 형식 문제를 정리한 글이에요.' if lang == 'ko'
            else 'Short, sourced explainers on HEIC, MP3 bitrates and other file-format questions.')
    body = f'<section class="wrap narrow doc"><h1>{u["guides"]}</h1><ul class="guide-list">{items}</ul></section>'
    return page(lang, head(lang, title + ' | ' + u['brand'], desc, 'guide/', alt='guide/', ads=False), body, alt_path='guide/')


def about_page(lang):
    u = UI[lang]
    a = CONTENT.get('about', {}).get(lang, {'title': 'About', 'desc': 'About', 'body': []})
    body = f'<article class="wrap narrow doc"><h1>{u["about"]}</h1>' + ''.join(f'<p>{esc(x)}</p>' for x in a['body']) + '</article>'
    return page(lang, head(lang, a['title'], a['desc'], 'about/', alt='about/', ads=False), body, alt_path='about/')


PRIVACY = {
    'en': ('Privacy policy | Inplace', 'Inplace converts files inside your browser and never uploads them. What this site stores and how ads use cookies.', '''<h1>Privacy policy</h1>
<p>Effective October 6, 2026 · Operated by Lumen Lab</p>
<h2>Your files</h2>
<p>Inplace converts files inside your browser. The files you choose and the files it creates are never uploaded to us or anyone else; they stay in your device’s memory until you close or reload the page. There are no accounts.</p>
<h2>What is stored on your device</h2>
<p>If you close the language suggestion bar, that choice is saved in your browser’s localStorage so the bar doesn’t come back. Clearing site data removes it. Nothing else is stored.</p>
<h2>Ads</h2>
<p>This site shows ads through Google AdSense. Google and other ad vendors use cookies to serve ads based on your visits to this and other websites. Because of these ads, third parties such as Google may place or read cookies in your browser and collect information through web beacons (tiny invisible images). See <a href="https://policies.google.com/technologies/partner-sites">how Google uses information from sites or apps that use its services</a>. You can turn off personalized ads in <a href="https://www.google.com/settings/ads">Google Ad Settings</a>. We don’t use separate analytics tools.</p>
<h2>Fonts and server logs</h2>
<p>The page loads its font from jsDelivr, a public content network, which receives your IP address like any web request. The site is served by Cloudflare, which may briefly keep basic request logs such as IP addresses to run the service securely. Neither ever receives your files.</p>
<h2>Contact</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>'''),
    'ko': ('개인정보 처리방침 | 인플레이스', '인플레이스는 파일을 브라우저 안에서 변환하고 올리지 않아요. 기기에 남는 것과 광고 쿠키에 대해 적었어요.', '''<h1>개인정보 처리방침</h1>
<p>시행일: 2026년 10월 6일 · 운영: 루멘랩(Lumen Lab)</p>
<h2>올린 파일</h2>
<p>인플레이스는 파일을 이용자의 브라우저 안에서 바꿔요. 고른 파일과 만들어진 파일은 저희를 포함해 어디에도 전송되지 않고, 페이지를 닫거나 새로 고칠 때까지 기기 메모리에만 있어요. 회원 가입은 없어요.</p>
<h2>기기에 저장하는 정보</h2>
<p>다른 언어판 안내 띠를 닫으면, 다시 띄우지 않으려고 그 선택을 브라우저 저장소(localStorage)에 기억해요. 브라우저의 사이트 데이터 지우기로 언제든 지울 수 있어요. 그 밖에는 저장하지 않아요.</p>
<h2>광고</h2>
<p>이 사이트는 Google 애드센스로 광고를 보여 줘요. Google을 비롯한 광고 회사는 쿠키를 써서 이 사이트나 다른 사이트에 방문한 기록을 바탕으로 광고를 고를 수 있어요. 광고 때문에 Google 같은 제3자가 이용자 브라우저에 쿠키를 넣거나 읽을 수 있고, 웹 비콘(눈에 보이지 않는 작은 이미지) 같은 기술로 정보를 모을 수 있어요. Google이 이 정보를 어떻게 쓰는지는 <a href="https://policies.google.com/technologies/partner-sites?hl=ko">Google 파트너 사이트에서 Google이 데이터를 사용하는 방식</a>에 있어요. 맞춤 광고는 <a href="https://www.google.com/settings/ads">Google 광고 설정</a>에서 끌 수 있어요. 방문 분석 도구는 따로 쓰지 않아요.</p>
<h2>글꼴과 서버 기록</h2>
<p>글꼴은 공개 전송망인 jsDelivr에서 받아요. 다른 웹 요청처럼 접속 IP가 전달돼요. 사이트는 Cloudflare에서 제공되고, Cloudflare는 서비스를 안전하게 운영하려고 접속 IP 같은 기본 기록을 잠시 남길 수 있어요. 어느 쪽도 파일은 받지 않아요.</p>
<h2>문의</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>'''),
}

LICENSES = [
    ('Mediabunny', 'Vanilagy and contributors', 'MPL-2.0', 'https://github.com/Vanilagy/mediabunny', 'https://mozilla.org/MPL/2.0/'),
    ('@mediabunny/mp3-encoder (LAME 3.100)', 'Vanilagy; The LAME Project', 'MPL-2.0; LAME is LGPL', 'https://lame.sourceforge.io/', 'https://lame.sourceforge.io/license.txt'),
    ('@mediabunny/aac-encoder', 'Vanilagy and contributors', 'MPL-2.0 (see package for bundled encoder license)', 'https://www.npmjs.com/package/@mediabunny/aac-encoder', 'https://mozilla.org/MPL/2.0/'),
    ('pdf-lib', 'Andrew Dillon', 'MIT', 'https://github.com/Hopding/pdf-lib', 'https://github.com/Hopding/pdf-lib/blob/master/LICENSE.md'),
    ('PDF.js', 'Mozilla Foundation', 'Apache-2.0', 'https://github.com/mozilla/pdf.js', 'https://www.apache.org/licenses/LICENSE-2.0'),
    ('libheif-js (libheif)', 'catdad; struktur AG', 'LGPL-3.0', 'https://github.com/catdad-experiments/libheif-js', 'https://www.gnu.org/licenses/lgpl-3.0.html'),
    ('gifenc', 'Matt DesLauriers', 'MIT', 'https://github.com/mattdesl/gifenc', 'https://github.com/mattdesl/gifenc/blob/master/LICENSE.md'),
    ('qpdf (WebAssembly build by @neslinesli93/qpdf-wasm)', 'Jay Berkenbilt and contributors; Tommaso Pifferi', 'Apache-2.0 (qpdf); ISC (wasm build)', 'https://github.com/qpdf/qpdf', 'https://www.apache.org/licenses/LICENSE-2.0'),
    ('fflate', 'Arjun Barrett', 'MIT', 'https://github.com/101arrowz/fflate', 'https://github.com/101arrowz/fflate/blob/master/LICENSE'),
    ('SheetJS Community Edition', 'SheetJS LLC', 'Apache-2.0', 'https://sheetjs.com/', 'https://www.apache.org/licenses/LICENSE-2.0'),
    ('Pretendard', 'Kil Hyung-jin', 'SIL Open Font License 1.1', 'https://github.com/orioncactus/pretendard', 'https://openfontlicense.org/'),
]


def privacy_page(lang):
    title, desc, inner = PRIVACY[lang]
    return page(lang, head(lang, title, desc, 'privacy/', alt='privacy/', ads=False), f'<article class="wrap narrow doc">{inner}</article>', alt_path='privacy/')


def licenses_page(lang):
    rows = ''.join(f'<tr><td><a href="{esc(h)}">{esc(n)}</a></td><td>{esc(a)}</td><td><a href="{esc(l)}">{esc(lic)}</a></td></tr>' for n, a, lic, h, l in LICENSES)
    if lang == 'ko':
        title, desc, h1 = '오픈소스 고지 | 인플레이스', '인플레이스가 브라우저 안에서 쓰는 오픈소스 라이브러리와 라이선스예요.', '오픈소스 고지'
        intro = '아래 라이브러리를 고치지 않은 그대로 /assets/vendor/ 에 두고 써요. LGPL 라이브러리(LAME, libheif)는 원본 소스를 위 링크에서 받을 수 있어요.'
        th = '<th>이름</th><th>만든 이</th><th>라이선스</th>'
    else:
        title, desc, h1 = 'Open-source licenses | Inplace', 'The open-source libraries Inplace runs in your browser, with their licenses.', 'Open-source licenses'
        intro = 'These libraries are served unmodified from /assets/vendor/. Source code for the LGPL libraries (LAME, libheif) is available from the links above.'
        th = '<th>Name</th><th>Author</th><th>License</th>'
    body = f'<article class="wrap narrow doc"><h1>{h1}</h1><div class="table-scroll"><table><thead><tr>{th}</tr></thead><tbody>{rows}</tbody></table></div><p>{intro}</p></article>'
    return page(lang, head(lang, title, desc, 'licenses/', alt='licenses/', ads=False), body, alt_path='licenses/')


def not_found():
    body = f'''<section class="wrap narrow doc nf">
<p class="nf-flaps" aria-hidden="true">{flap('404', 'lg')}</p>
<h1>Page not found · <span lang="ko">페이지가 없어요</span></h1>
<p><a href="/">All tools</a> · <a href="/ko/" lang="ko">모든 도구</a></p>
</section>'''
    h_ = head('en', 'Page not found | Inplace', 'This page doesn’t exist.', '', noindex=True, ads=False)
    return f'{h_}\n<body>\n{header("en")}\n<main id="main">{body}</main>\n</body>\n</html>\n'


# ---------------- 쓰기 ----------------
def write(rel, text):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    old = p.read_text(encoding='utf-8') if p.exists() else None
    if old != text:
        p.write_text(text, encoding='utf-8')


def tools_js():
    reg = {}
    for t in TOOLS:
        reg[t['id']] = {'id': t['id'], 'cat': t['cat'], 'accept': t['accept'], 'multiple': bool(t.get('multiple')), 'order': bool(t.get('order')),
                        'pair': list(t['pair']),
                        'name': {l: tool_text(t['id'], l)['name'] for l in ('en', 'ko')},
                        'short': {l: tool_text(t['id'], l)['short'] for l in ('en', 'ko')}}
    return ('// 만든 파일: _dev/build.py 가 만든다. 손으로 고치지 않는다.\n'
            f'export const TOOLS = {json.dumps(reg, ensure_ascii=False, indent=1)};\n'
            f'export const KINDS = {json.dumps(KINDS)};\n')


def sitemap(paths):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in paths:
        out.append(f'  <url><loc>{SITE}{path}</loc><lastmod>{UPDATED.get(path, TODAY)}</lastmod></url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


def rss():
    items = ''
    for a in ARTICLES.get('ko', []):
        link = f'{SITE}/ko/guide/{a["slug"]}/'
        items += (f'<item><title>{esc(a["title"])}</title><link>{link}</link><guid>{link}</guid>'
                  f'<pubDate>Tue, 06 Oct 2026 00:00:00 GMT</pubDate><description>{esc(a["desc"])}</description>'
                  f'<content:encoded><![CDATA[{a["body_html"]}]]></content:encoded></item>\n')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>인플레이스 가이드</title><link>{SITE}/ko/</link><description>파일 형식과 변환 가이드</description><language>ko</language>
{items}</channel></rss>
'''


def main():
    paths = []
    for lang in ('en', 'ko'):
        p = prefix(lang)
        write(f'{p.lstrip("/")}index.html', hub_page(lang)); paths.append(p)
        for t in TOOLS:
            write(f'{p.lstrip("/")}{t["id"]}/index.html', tool_page(t, lang)); paths.append(f'{p}{t["id"]}/')
        write(f'{p.lstrip("/")}guide/index.html', guide_index(lang)); paths.append(f'{p}guide/')
        for a in ARTICLES.get(lang, []):
            write(f'{p.lstrip("/")}guide/{a["slug"]}/index.html', article_page(a, lang)); paths.append(f'{p}guide/{a["slug"]}/')
        write(f'{p.lstrip("/")}about/index.html', about_page(lang)); paths.append(f'{p}about/')
        write(f'{p.lstrip("/")}privacy/index.html', privacy_page(lang)); paths.append(f'{p}privacy/')
        write(f'{p.lstrip("/")}licenses/index.html', licenses_page(lang)); paths.append(f'{p}licenses/')
    write('404.html', not_found())
    write('assets/tools.js', tools_js())
    write('sitemap.xml', sitemap(paths))
    if ARTICLES.get('ko'):
        write('rss.xml', rss())
    print(f'built {len(paths)} pages')


if __name__ == '__main__':
    main()
