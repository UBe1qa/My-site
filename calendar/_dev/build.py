#!/usr/bin/env python3
"""한장달력 / Onesheet(calendar.lumenlab.page) 페이지 전부 만들기: python3 calendar/_dev/build.py

- 계산·그리기는 JS 한 곳(assets/core.js, sheet.js). 이 스크립트는 `node _dev/export.js` 로 값을 받아 HTML만 짠다.
- 문구·글 = _dev/content.py. 만든 HTML·sitemap.xml·rss.xml·404.html·robots.txt 는 손으로 고치지 않는다.
- 만드는 것: 영어 / , 한국어 /ko/ 의 도구(첫 화면), 연간(2026~2028), 월(2026-10~2027-12), 공휴일(2026·2027),
  음력·손 없는 날(한국어), 가이드, 소개·방침·오픈소스 고지, 404, sitemap, rss(한국어 글).
- lastmod 는 본문·링크·구조화 데이터가 실제로 바뀐 쪽만 올린다(LASTMOD·UPDATED). 배치·CSS만 바뀐 페이지는 올리지 않는다.
- 글 속 표는 tables() 가 가로로 밀리는 칸으로 감싸고, class="stack" 표에는 휴대폰용 머리글(data-th)을 단다.
"""
import sys
sys.dont_write_bytecode = True
import html
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
sys.path.insert(0, str(DEV))
import content as C  # noqa: E402

SITE = 'https://calendar.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
TODAY = '2026-10-09'          # 처음 공개한 날(글의 datePublished, rss, 첫 HTML의 '다가오는 쉬는 날' 기준일)
LASTMOD = '2026-10-10'        # 3단계(배포 뒤 고치기): 본문·링크·구조화 데이터가 바뀐 날. 배포된 판과 견줘 보니 영어 가이드 목록만 그대로였다.
UPDATED = {'/guide/': TODAY}  # 주소(경로): 그 쪽의 lastmod. 여기 없는 쪽은 LASTMOD. 다음에 몇 쪽만 고치면 그 쪽만 새 날짜로 적는다(배치·CSS만 바뀐 쪽은 적지 않는다).


def lastmod(path):
    return UPDATED.get(path, LASTMOD)
D = json.loads(subprocess.check_output(['node', str(DEV / 'export.js')]))
MONTHS = [tuple(x) for x in D['months_list']]
BUILD_MONTH = MONTHS[0]
EN_M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
WD_KO = '일월화수목금토'
WD_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
YEARS = [2026, 2027, 2028]
HOL_YEARS = [2026, 2027]
KR_BOTH = {'1월 1일': '신정', '3·1절': '삼일절', '기독탄신일': '성탄절'}
# 미국: 표에는 법(5 U.S.C. 6103)과 OPM 일정표의 이름을, 달력 칸에는 흔히 쓰는 이름을 쓴다.
US_OFFICIAL = {'Martin Luther King Jr. Day': 'Birthday of Martin Luther King, Jr.'}
DATECALC = {'ko': 'https://date.lumenlab.page/', 'en': 'https://date.lumenlab.page/en/'}
LUMEN = {'ko': 'https://lumenlab.page/', 'en': 'https://lumenlab.page/en/'}
esc = lambda s: html.escape(str(s), quote=True)
OUT = {}        # 경로 → HTML
SITEMAP = []    # (주소, lastmod)


def P(lang):
    return '/ko/' if lang == 'ko' else '/'


def U(lang, path=''):
    return SITE + P(lang) + path


def mpath(lang, y, m):
    return f'{y}/{m}/' if lang == 'ko' else f'{y}/{EN_M[m - 1].lower()}/'


def country(lang):
    return 'KR' if lang == 'ko' else 'US'


def md(lang, m, d, wd=None):
    if lang == 'ko':
        return f'{m}월 {d}일' + (f'({WD_KO[wd]})' if wd is not None else '')
    return (WD_EN[wd][:3] + ', ' if wd is not None else '') + f'{EN_M[m - 1][:3]} {d}'


def iso_md(lang, iso, wd=True):
    y, m, d = (int(x) for x in iso.split('-'))
    import datetime
    w = (datetime.date(y, m, d).weekday() + 1) % 7
    return md(lang, m, d, w if wd else None)


def kr_name(it):
    """표·글에 쓰는 이름: 공식 이름(흔히 쓰는 이름)"""
    return '; '.join(n + (f'({KR_BOTH[n]})' if n in KR_BOTH else '') for n in it['names'])


LOGO = ('<svg width="20" height="24" viewBox="0 0 22 26" aria-hidden="true"><path d="M2 1.5h12.5L20 7v17.5H2z" fill="#fff" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
        '<path d="M14.5 1.5V7H20z" fill="var(--brand)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><g fill="#17201b"><rect x="5" y="11" width="2.5" height="2.5" rx=".6"/>'
        '<rect x="9.7" y="11" width="2.5" height="2.5" rx=".6"/><rect x="5" y="15.4" width="2.5" height="2.5" rx=".6"/><rect x="9.7" y="15.4" width="2.5" height="2.5" rx=".6"/>'
        '<rect x="14.4" y="15.4" width="2.5" height="2.5" rx=".6"/><rect x="5" y="19.8" width="2.5" height="2.5" rx=".6"/></g><rect x="14.4" y="11" width="2.5" height="2.5" rx=".6" fill="#cf3027"/></svg>')
I_DL = '<svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2.5v9M5.2 8L9 11.8 12.8 8M3 15h12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'
I_PR = '<svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 6V2.5h8V6M5 13H3.2A1.2 1.2 0 0 1 2 11.8V7.2A1.2 1.2 0 0 1 3.2 6h11.6A1.2 1.2 0 0 1 16 7.2v4.6a1.2 1.2 0 0 1-1.2 1.2H13M5 10.5h8v5H5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
I_L = '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
I_R = '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
I_DOWN = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
ANIM = "<script>(function(d){if(window.IntersectionObserver&&!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('anim');setTimeout(function(){if(!window.__calOn)d.classList.remove('anim')},3000)}})(document.documentElement)</script>"


# ---------------- 틀 ----------------
def head(lang, title, desc, path, alt=None, jsonld=(), og_type='website', ads=True, noindex=False):
    """path: 언어 앞머리 뒤 경로. alt: 다른 언어판의 경로(같은 역할일 때만, 없으면 hreflang 없음)."""
    canon = U(lang, path)
    links = [] if noindex else [f'<link rel="canonical" href="{canon}">']
    if alt is not None and not noindex:
        en_u = U('en', path if lang == 'en' else alt)
        ko_u = U('ko', path if lang == 'ko' else alt)
        links += [f'<link rel="alternate" hreflang="en" href="{en_u}">', f'<link rel="alternate" hreflang="ko" href="{ko_u}">',
                  f'<link rel="alternate" hreflang="x-default" href="{en_u}">']
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>\n' for j in jsonld)
    ad = (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADS_CLIENT}" crossorigin="anonymous"></script>\n'
          '<script src="/assets/ads-config.js"></script>\n') if ads else ''
    robots = '<meta name="robots" content="noindex">\n' if noindex else ''
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{robots}<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1a201d" media="(prefers-color-scheme: dark)">
{chr(10).join(links)}
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:site_name" content="{C.UI[lang]['brand']}">
<meta property="og:image" content="{SITE}/{'og-ko.png' if lang == 'ko' else 'og.png'}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="{'ko_KR' if lang == 'ko' else 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" media="print" onload="this.media='all'">
<link rel="stylesheet" href="/assets/style.css">
{ANIM}
{ld}{ad}</head>'''


def header(lang, cur=None, alt_path=None):
    u, p = C.UI[lang], P(lang)
    other = 'en' if lang == 'ko' else 'ko'
    items = []
    for key, name in u['nav']:
        if key == '@month':
            href = p + mpath(lang, *BUILD_MONTH)
            extra = ' data-nav-month="' + ','.join(f'{y}-{m}' for y, m in MONTHS) + '"'
        else:
            href, extra = p + key, ''
        items.append(f'<a href="{href}"{extra}{" aria-current=\"page\"" if key == cur else ""}>{name}</a>')
    lang_href = P(other) + (alt_path if alt_path is not None else '')
    return f'''<a class="skip" href="#main">{u['skip']}</a>
<header class="top">
  <a class="logo" href="{p}">{LOGO}<span>{u['brand']}</span></a>
  <nav class="nav" aria-label="{u['menu']}">{''.join(items)}</nav>
  <a class="lang" href="{lang_href}" lang="{other}" hreflang="{other}">{u['lang_other']}</a>
</header>'''


def footer(lang):
    u, p = C.UI[lang], P(lang)
    if lang == 'ko':
        cols = [('연간 달력', [(f'{y}/', f'{y}년 달력') for y in YEARS]),
                ('공휴일·음력', [('2026/holidays/', '2026년 공휴일'), ('2027/holidays/', '2027년 공휴일'), ('lunar/', '음력 변환'), ('son-eomneun-nal/', '손 없는 날')]),
                ('한장달력', [('about/', u['about']), ('guide/', u['guide']), ('privacy/', u['privacy']), ('licenses/', u['licenses'])])]
    else:
        cols = [('Yearly calendars', [(f'{y}/', f'{y} calendar') for y in YEARS]),
                ('Holidays', [('2026/holidays/', '2026 federal holidays'), ('2027/holidays/', '2027 federal holidays')]),
                ('Onesheet', [('about/', u['about']), ('guide/', u['guide']), ('privacy/', u['privacy']), ('licenses/', u['licenses'])])]
    ch = ''.join('<div><p>' + h + '</p>' + ''.join(f'<a href="{p}{k}">{n}</a>' for k, n in ls) + '</div>' for h, ls in cols)
    return f'''<footer class="foot">
  <div class="wrap foot-in">
    <div>
      <a class="lumen" href="{LUMEN[lang]}"><small>{u['made']}</small><b>{u['lumen_b']}</b><span>{u['lumen_s']}</span></a>
      <small>© 2026 Lumen Lab · <a href="mailto:woxocoso@gmail.com">{u['contact']}</a></small>
    </div>
    <div class="foot-cols">{ch}</div>
  </div>
</footer>'''


def ad_slot(lang, name, narrow=False):
    """폭은 본문 글 기둥과 같게(글 페이지는 narrow, 그 밖은 본문 칸 780px). 번호가 비어 있으면 통째로 숨는다."""
    return (f'<div class="ad-wrap wrap{" narrow" if narrow else ""}" data-ad-wrap><div class="ad-col"><p class="ad-label">{C.UI[lang]["ad"]}</p>'
            f'<div class="ad-slot" data-ad="{name}" hidden></div></div></div>')


def tables(html_text):
    """글 속 표: 가로로 밀 수 있는 칸(.tbl-wrap)으로 감싼다. class="stack" 표는 휴대폰에서 줄 카드가 되도록 칸마다 머리글(data-th)을 단다."""
    def one(m):
        t = m.group(0)
        if 'class="stack"' in t:
            head, body = t.split('<tbody>')
            heads = [re.sub(r'<.*?>', '', h) for h in re.findall(r'<th>(.*?)</th>', head, flags=re.S)]

            def row(rm):
                cells = re.findall(r'<td>(.*?)</td>', rm.group(1), flags=re.S)
                return '<tr>' + ''.join((f'<td data-th="{esc(heads[i])}">' if i and heads[i] else '<td>') + c + '</td>' for i, c in enumerate(cells)) + '</tr>'
            t = head + '<tbody>' + re.sub(r'<tr>(.*?)</tr>', row, body, flags=re.S)
        return '<div class="tbl-wrap">' + t + '</div>'
    return re.sub(r'<table.*?</table>', one, html_text, flags=re.S)


def page(lang, head_html, body, cur=None, alt_path=None, scripts=True, cls=''):
    js = ('<div id="print-root" aria-hidden="true"></div>\n<script src="/assets/data.js"></script>\n<script src="/assets/core.js"></script>\n'
          '<script src="/assets/sheet.js"></script>\n<script src="/assets/pdf.js"></script>\n<script src="/assets/app.js"></script>') if scripts else '<script src="/assets/app.js"></script>'
    return f'''{head_html}
<body{f' class="{cls}"' if cls else ''}>
{header(lang, cur, alt_path)}
<main id="main">
{body}
</main>
{footer(lang)}
{js}
</body>
</html>
'''


def put(lang, path, html_text, sitemap=True):
    OUT[(P(lang) + path).lstrip('/') + 'index.html'] = html_text
    if sitemap:
        SITEMAP.append((U(lang, path), lastmod(P(lang) + path)))


def crumbs_ld(lang, items):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(items)]}


def crumb(lang, items):
    return '<p class="crumb">' + ' <span aria-hidden="true">›</span> '.join(f'<a href="{h}">{esc(n)}</a>' for n, h in items) + '</p>'


# ---------------- 달력 만들기(도구) ----------------
def tool(lang, year, fixed):
    u, p, c = C.UI[lang], P(lang), country(lang)
    paper = 'a4' if lang == 'ko' else 'letter'
    ratio = '1.4143' if paper == 'a4' else '1.2941'
    svg = D['svg'].get(f'{lang}-{year}', '')
    if fixed:
        h1 = (f'{year}년 달력' if lang == 'ko' else f'{year} Calendar')
        ctl = '<nav class="years" aria-label="' + ('연도' if lang == 'ko' else 'Year') + '">' + ''.join(
            f'<a href="{p}{y}/"{" aria-current=\"page\"" if y == year else ""}>{y}</a>' for y in YEARS) + '</nav>'
    else:
        h1 = u['h1_tool'].format(y=year)
        ctl = (f'<div class="step" role="group" aria-label="{"연도" if lang == "ko" else "Year"}"><button type="button" data-step="-1" aria-label="{u["prev_year"]}">{I_L}</button>'
               f'<output data-y aria-live="polite">{year}</output><button type="button" data-step="1" aria-label="{u["next_year"]}">{I_R}</button></div>')
    static = f'/files/{year}-calendar-{"korea" if c == "KR" else "us"}-{paper}-landscape.pdf'
    xlsx = (f'<a class="xlsx" href="/files/{year}-calendar-korea.xlsx" download data-xlsx><span class="xlsx-i" aria-hidden="true"></span><span>{u["xlsx"]}<small>{u["xlsx_sub"]}</small></span></a>'
            if lang == 'ko' else '')
    mname = (f'{BUILD_MONTH[1]}월' if lang == 'ko' else EN_M[BUILD_MONTH[1] - 1])
    mshort = (f'{BUILD_MONTH[1]}월' if lang == 'ko' else EN_M[BUILD_MONTH[1] - 1][:3])
    basis = basis_line(lang, year)
    why = '<ul class="why">' + ''.join(f'<li>{w}</li>' for w in u['why']) + '</ul>'
    return f'''<section class="tool wrap" data-tool data-country="{c}" data-year="{year}" data-paper="{paper}"{' data-fixed="1"' if fixed else ''}>
  <div class="tool-head">
    <h1>{h1}</h1>
    {ctl}
    {why}
  </div>
  <div class="tool-body">
    <div class="stage">
      <div class="bar">
        <div class="info">
          <p class="what"><b data-what>{'Year on a page · landscape' if lang == 'en' else '1년 한 장 · 가로'}</b><span data-meta>{'A4' if paper == 'a4' else 'Letter'} · PDF {'1쪽' if lang == 'ko' else '1 page'}</span></p>
          <div class="mstep" hidden><div class="step" role="group" aria-label="{u['month_group']}"><button type="button" data-mstep="-1" aria-label="{u['prev_month']}">{I_L}</button><b aria-live="polite">{mshort}</b><button type="button" data-mstep="1" aria-label="{u['next_month']}">{I_R}</button></div></div>
        </div>
        <div class="acts">
          <a class="btn btn-main" data-pdf href="{static}" download>{I_DL}<span>{u['pdf']}</span></a>
          <button type="button" class="btn" data-print>{I_PR}{u['print']}</button>
          <button type="button" class="btn" data-png>{u['png']}</button>
        </div>
      </div>
      <p class="hint" data-note role="status" hidden></p>
      <div class="paper-box"><div class="crop" style="--ratio:{ratio}"><button type="button" class="paper" aria-label="{u['zoom']}">{svg}</button></div></div>
      <p class="basis" data-basis>{basis}</p>
    </div>
    <aside class="side" aria-label="{u['shapes_h']}">
      <h2 class="side-h">{u['shapes_h']}</h2>
      <div class="shapes">
        <button type="button" class="shape" data-kind="year" data-orient="landscape" aria-pressed="true"><span class="thumb" style="--ratio:{ratio}"></span><b>{u['s_land']}</b></button>
        <button type="button" class="shape" data-kind="year" data-orient="portrait" aria-pressed="false"><span class="thumb" style="--ratio:{1 / float(ratio):.4f}"></span><b>{u['s_port']}</b></button>
        <button type="button" class="shape" data-kind="months" aria-pressed="false"><span class="thumb stack" style="--ratio:{ratio}"></span><b>{u['s_months']}<small>{u['s_months_sub']}</small></b></button>
        <button type="button" class="shape" data-kind="month" aria-pressed="false"><span class="thumb" style="--ratio:{ratio}"></span><b>{u['s_month']}<small data-mname>{mname}</small></b></button>
      </div>
      {xlsx}
      <button type="button" class="opt-toggle" aria-expanded="false" aria-controls="opts"><span>{u['opt']}<small>{u['opt_sub']}</small></span>{I_DOWN}</button>
      <div class="opts" id="opts" hidden>
        <p class="opts-h"><span>{u['opt_h']}</span><button type="button" data-opt-close>{u['close']}</button></p>
        <div class="field"><span>{u['f_ws']}</span><div class="seg"><button type="button" data-seg="weekStart" data-v="0" aria-pressed="true">{u['ws0']}</button><button type="button" data-seg="weekStart" data-v="1" aria-pressed="false">{u['ws1']}</button></div></div>
        <div class="field"><label for="o-paper">{u['f_paper']}</label><select id="o-paper" data-opt="paper"><option value="a4"{' selected' if paper == 'a4' else ''}>A4 (210 × 297mm)</option><option value="letter"{' selected' if paper == 'letter' else ''}>Letter (8.5 × 11in)</option></select></div>
        <div class="field"><label for="o-country">{u['f_country']}</label><select id="o-country" data-opt="country"><option value="KR"{' selected' if c == 'KR' else ''}>{u['c_kr']}</option><option value="US"{' selected' if c == 'US' else ''}>{u['c_us']}</option><option value="NONE">{u['c_none']}</option></select></div>
        <div class="field"><span>{u['f_show']}</span><div class="checks">
          <label class="check" data-only="hol"><input type="checkbox" data-opt="names" checked>{u['o_names']}</label>
          <label class="check"><input type="checkbox" data-opt="week">{u['o_week']}</label>
          <label class="check" data-only="month-kr" hidden><input type="checkbox" data-opt="lunar" checked>{u['o_lunar']}</label>
          <label class="check" data-only="month-kr" hidden><input type="checkbox" data-opt="terms" checked>{u['o_terms']}</label>
          <label class="check" data-only="month-kr" hidden><input type="checkbox" data-opt="son">{u['o_son']}</label>
        </div></div>
        <div class="field"><span>{u['f_color']}</span><label class="check"><input type="checkbox" data-opt="mono">{u['o_mono']}</label></div>
        <p class="opts-note">{u['opt_note']}</p>
      </div>
    </aside>
  </div>
</section>'''


def basis_line(lang, y):
    """app.js basis() 의 처음 값과 같은 글자(첫 그림에서 안 바뀌게)"""
    p = P(lang)
    link = ((f' <a href="{p}{y}/holidays/">{y}년 공휴일 보기</a>' if lang == 'ko' else f' <a href="{p}{y}/holidays/">See the {y} holiday list</a>') if y in HOL_YEARS else '')
    if lang == 'en':
        return 'Holidays: US federal holidays under 5 U.S.C. 6103, with the observed weekday when one falls on a weekend.' + link
    b = D['years']['KR'][str(y)]['basis']
    if b == 'official':
        s = '공휴일 기준: 관공서의 공휴일에 관한 규정, ' + ('우주항공청 2027년 월력요항.' if y == 2027 else '한국천문연구원 달력자료.')
    else:
        s = f'공휴일 기준: 관공서의 공휴일에 관한 규정, 한국천문연구원 달력자료. {y}년 월력요항은 아직 발표 전이에요.'
    return s + link


def up_list(lang):
    """다가오는 쉬는 날(빌드한 날 기준 4줄. app.js 가 방문한 날 기준으로 다시 채운다)"""
    c, rows = country(lang), []
    import datetime
    t = datetime.date.fromisoformat(TODAY)
    for y in (t.year, t.year + 1):
        yd = D['years'][c][str(y)]
        for it in yd['list']:
            d = datetime.date(it['y'], it['m'], it['d'])
            if d >= t and len(rows) < 4:
                n = (d - t).days
                name = it['lab']
                when = ('오늘' if n == 0 else f'{n}일 뒤') if lang == 'ko' else ('today' if n == 0 else f'in {n} day' + ('' if n == 1 else 's'))
                date = f'{it["m"]}월 {it["d"]}일 {WD_KO[it["wd"]]}' if lang == 'ko' else f'{WD_EN[it["wd"]][:3]}, {EN_M[it["m"] - 1][:3]} {it["d"]}'
                rows.append(f'<li><time datetime="{it["date"]}">{date}</time><span>{esc(name)}</span><small>{when}</small></li>')
    return f'<ul class="up" data-up data-country="{c}">' + ''.join(rows) + '</ul>'


def us_short(en):
    obs = en.endswith(' (observed)')
    b = en.replace(' (observed)', '')
    b = {'Juneteenth National Independence Day': 'Juneteenth', 'Thanksgiving Day': 'Thanksgiving'}.get(b, b)
    return b + (' (observed)' if obs else '')


def plain(html_text):
    """태그를 뺀 글자(구조화 데이터용). 화면에 보이는 글자와 같다."""
    return html.unescape(re.sub(r'<[^>]+>', '', html_text))


def guide_list(lang, limit=None):
    arts = C.ARTICLES[lang][:limit] if limit else C.ARTICLES[lang]
    return '<ul class="glist">' + ''.join(f'<li><a href="{P(lang)}guide/{a["slug"]}/"><b>{esc(a["title"])}</b><span>{esc(a["desc"])}</span></a></li>' for a in arts) + '</ul>'


def home(lang):
    u, p = C.UI[lang], P(lang)
    faq = C.FAQ[lang]
    if lang == 'ko':
        ways = [(f'2027/', '2027년 달력', '공휴일 표, 연휴, 받는 파일'), (f'2026/', '2026년 달력', '올해 남은 달과 공휴일'), (mpath(lang, *BUILD_MONTH), '월 달력', '음력·절기·손 없는 날이 든 큰 달'),
                ('2027/holidays/', '2027년 공휴일·연휴', '대체공휴일 7일, 3일 이상 연휴 10번'), ('lunar/', '양력·음력 변환', '1912~2049년, 윤달 표시'), ('son-eomneun-nal/', '손 없는 날', '2026년 10월~2027년 12월 달별 표')]
    else:
        ways = [('2027/', '2027 calendar', 'Federal holidays, long weekends, files'), ('2026/', '2026 calendar', 'The rest of this year'), (mpath(lang, *BUILD_MONTH), 'Monthly calendars', 'One large month with holidays'),
                ('2027/holidays/', '2027 federal holidays', 'All dates, observed days, ten long weekends'), ('2026/holidays/', '2026 federal holidays', 'All dates and long weekends'), ('guide/', 'Guides', 'Printing, week numbers, holidays')]
    ld = [{'@context': 'https://schema.org', '@type': 'WebApplication', 'name': u['brand'], 'url': U(lang), 'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any',
           'browserRequirements': 'Requires a modern web browser', 'inLanguage': lang, 'isAccessibleForFree': True, 'description': u['home_desc'],
           'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'KRW' if lang == 'ko' else 'USD'}},
          {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': plain(a)}} for q, a in faq]}]
    body = f'''{tool(lang, 2027, False)}
<section class="sec wrap"><h2>{u['up_h']}</h2><p class="sub">{u['up_sub']}</p>{up_list(lang)}</section>
{ad_slot(lang, 'mid')}
<section class="sec wrap"><h2>{u['ways_h']}</h2><div class="ways">{''.join(f'<a href="{p}{k}"><b>{n}</b><span>{s}</span></a>' for k, n, s in ways)}</div></section>
<section class="sec wrap"><h2>{u['guides_h']}</h2>{guide_list(lang)}</section>
<section class="sec wrap"><h2>{u['faq_h']}</h2><div class="faq">{''.join(f'<details><summary>{esc(q)}</summary><p>{a}</p></details>' for q, a in faq)}</div></section>
{ad_slot(lang, 'bottom')}'''
    put(lang, '', page(lang, head(lang, u['home_title'], u['home_desc'], '', alt='', jsonld=ld), body, cur='', alt_path=''))


# ---------------- 표 조각 ----------------
def hol_table(lang, c, y):
    yd = D['years'][c][str(y)]
    rows = []
    for it in yd['list']:
        cls = 'sun' if it['wd'] == 0 else 'sat' if it['wd'] == 6 else ''
        if lang == 'ko':
            kind = {'holiday': '공휴일', 'substitute': '대체공휴일', 'election': '선거일', 'temporary': '임시공휴일'}[it['kind']] if c == 'KR' else ('대신 쉬는 날' if it['kind'] == 'substitute' else '공휴일')
            name = kr_name(it) if c == 'KR' else it['name']
            rows.append(f'<tr><td class="d">{it["m"]}월 {it["d"]}일</td><td class="{cls}">{WD_KO[it["wd"]]}요일</td><td>{esc(name)}</td><td><span class="tag">{kind}</span></td></tr>')
        else:
            kind = 'Observed' if it['kind'] == 'substitute' else ('Falls on a weekend' if it['wd'] in (0, 6) else 'Holiday')
            base = it['en'].replace(' (observed)', '')
            name = (f'{US_OFFICIAL[base]} ({base})' if base in US_OFFICIAL else base) + (' (observed)' if it['en'].endswith(' (observed)') else '') if c == 'US' else it['en']
            rows.append(f'<tr><td class="d">{EN_M[it["m"] - 1][:3]} {it["d"]}</td><td>{WD_EN[it["wd"]][:3]}</td><td>{esc(name)}</td><td><span class="tag">{kind}</span></td></tr>')
    th = '<th>날짜</th><th>요일</th><th>이름</th><th>구분</th>' if lang == 'ko' else '<th>Date</th><th>Day</th><th>Holiday</th><th>Type</th>'
    return f'<div class="tbl-wrap"><table class="tbl chips"><thead><tr>{th}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>'


def break_rows(lang, c, y):
    yd = D['years'][c][str(y)]
    pool = []
    for yy in (y - 1, y, y + 1):
        pool += D['years'][c].get(str(yy), {'list': []})['list']
    rows = []
    for b in yd['breaks']:
        names = []
        for it in sorted((x for x in pool if b['from'] <= x['date'] <= b['to']), key=lambda x: x['date']):
            if c == 'KR':
                parts = [('대체공휴일' if n.startswith('대체공휴일') else n) for n in it['names']] if lang == 'ko' else [it['en']]
            else:
                parts = [us_short(it['en'])] if lang == 'en' else it['names']
            for n in parts:
                if n.replace(' (observed)', '') not in [x.replace(' (observed)', '') for x in names]:
                    names.append(n)
        if lang == 'ko':
            rows.append(f'<tr><td class="d">{iso_md(lang, b["from"])} ~ {iso_md(lang, b["to"])}</td><td>{b["days"]}일</td><td>{esc(", ".join(names))}</td></tr>')
        else:
            rows.append(f'<tr><td class="d">{iso_md(lang, b["from"])} to {iso_md(lang, b["to"])}</td><td>{b["days"]} days</td><td>{esc(", ".join(names))}</td></tr>')
    th = '<th>기간</th><th>길이</th><th>들어 있는 공휴일</th>' if lang == 'ko' else '<th>Dates</th><th>Length</th><th>Holiday</th>'
    return f'<div class="tbl-wrap"><table class="tbl"><thead><tr>{th}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>'


def bridge_rows(lang, c, y):
    yd = D['years'][c][str(y)]
    if not yd['bridges']:
        return ''
    rows = []
    for b in yd['bridges']:
        if lang == 'ko':
            rows.append(f'<tr><td class="d">{iso_md(lang, b["leave"][0])}</td><td>{iso_md(lang, b["from"])} ~ {iso_md(lang, b["to"])}</td><td>{b["days"]}일</td></tr>')
        else:
            rows.append(f'<tr><td class="d">{iso_md(lang, b["leave"][0])}</td><td>{iso_md(lang, b["from"])} to {iso_md(lang, b["to"])}</td><td>{b["days"]} days</td></tr>')
    th = '<th>연차 내는 날</th><th>이어지는 기간</th><th>길이</th>' if lang == 'ko' else '<th>Day to take off</th><th>Resulting break</th><th>Length</th>'
    return f'<div class="tbl-wrap"><table class="tbl"><thead><tr>{th}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>'


def month_pills(lang, cur=None):
    out, last = [], None
    for y, m in MONTHS:
        if y != last:
            out.append(f'<span class="yr">{y}</span>')
            last = y
        name = f'{m}월' if lang == 'ko' else EN_M[m - 1][:3]
        out.append(f'<a href="{P(lang)}{mpath(lang, y, m)}"{" aria-current=\"page\"" if (y, m) == cur else ""}>{name}</a>')
    return '<div class="pills">' + ''.join(out) + '</div>'


def count_note(y):
    """공휴일 수 세 가지(이름이 붙는 날 / 일요일까지 / 토요일까지)가 어떻게 이어지는지 한 문단으로. 숫자는 core.js yearFacts."""
    f = D['years']['KR'][str(y)]['facts']
    return (f'달력에 이름이 붙는 공휴일은 대체공휴일까지 {f["holidayDates"]}일이고, 이 가운데 {f["holidaysOnSun"]}일은 일요일과 겹쳐요. '
            f'일요일 {f["sundays"]}일을 더하고 겹치는 {f["holidaysOnSun"]}일을 빼면 {f["publicHolidays"]}일, 토요일까지 쉬면 {f["daysOff"]}일이에요.')


def year_facts(lang, c, y):
    f = D['years'][c][str(y)]['facts']
    if lang == 'ko':
        items = [('날 수', f'{f["days"]}<small>일{" · 윤년" if f["leap"] else ""}</small>'), ('이름이 붙는 공휴일', f'{f["holidayDates"]}<small>일</small>'),
                 ('일요일까지 더하면', f'{f["publicHolidays"]}<small>일</small>'), ('토요일까지 쉬면', f'{f["daysOff"]}<small>일</small>'),
                 ('평일에 걸린 공휴일', f'{f["holidaysOnWeekdays"]}<small>일</small>'), ('일하는 날(주5일)', f'{f["workdays"]}<small>일</small>')]
    else:
        items = [('Days', f'{f["days"]}<small>{" · leap year" if f["leap"] else ""}</small>'), ('Federal holidays', '11'),
                 ('Weekdays off (observed)', str(f['holidaysOnWeekdays'])), ('Saturdays and Sundays', str(f['saturdays'] + f['sundays'])),
                 ('Working days (Mon to Fri)', str(f['workdays']))]
    return '<dl class="facts">' + ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in items) + '</dl>'


# ---------------- 연간 ----------------
def year_page(lang, y):
    u, p, c = C.UI[lang], P(lang), country(lang)
    yd = D['years'][c][str(y)]
    f = yd['facts']
    path = f'{y}/'
    if lang == 'ko':
        title = f'{y}년 달력 한 장 PDF · 공휴일 포함 | 한장달력'
        desc = (f'{y}년 달력을 공휴일을 넣은 A4 한 장 PDF로 받거나 인쇄해요. 공휴일은 대체공휴일까지 {f["holidayDates"]}일, 3일 이상 연휴는 {len(yd["breaks"])}번이에요. '
                f'월별 달력과 엑셀 파일도 있어요.')
        notice = ('<p class="notice">2028년은 한국천문연구원 달력자료를 바탕으로 한 <b>공식 발표 전 자료</b>예요. 월력요항이 발표되면(해마다 6월 말) 다시 맞춰요. 임시공휴일은 들어 있지 않아요.</p>' if yd['basis'] == 'provisional' else '')
        hol_link = f'<p class="note"><a href="{p}{y}/holidays/">{y}년 공휴일과 연휴 자세히 보기</a></p>' if y in HOL_YEARS else ''
        body2 = f'''<section class="sec wrap"><h2>{y}년 공휴일</h2>{notice}{hol_table(lang, c, y)}{hol_link}
<p class="note">달력 칸에는 흔히 쓰는 이름(신정, 성탄절)을, 표에는 공식 이름을 같이 적었어요. 선거일과 임시공휴일은 확정된 날만 들어 있어요.</p></section>
{ad_slot(lang, 'mid')}
<section class="sec wrap"><h2>3일 이상 이어지는 연휴 {len(yd["breaks"])}번</h2><p class="sub">토요일·일요일과 공휴일이 붙은 기간이에요.</p>{break_rows(lang, c, y)}</section>
<section class="sec wrap"><h2>{y}년 한눈에</h2>{year_facts(lang, c, y)}
<p class="note">{count_note(y)}</p>
<p class="note">두 날짜 사이의 일하는 날을 세려면 <a href="{DATECALC[lang]}">며칠 계산기</a>를 쓰세요.</p></section>
<section class="sec wrap"><h2>월 달력</h2><p class="sub">음력·24절기·손 없는 날이 든 큰 달이에요.</p>{month_pills(lang)}</section>'''
        crumbs = [('달력 만들기', U(lang)), (f'{y}년 달력', U(lang, path))]
    else:
        title = f'{y} Calendar with US Federal Holidays: One-Page PDF | Onesheet'
        desc = (f'Download or print the {y} calendar on one page with US federal holidays. {f["holidaysOnWeekdays"]} weekdays off and {len(yd["breaks"])} long weekends, '
                f'in Letter or A4, plus monthly pages.')
        hol_link = f'<p class="note"><a href="{p}{y}/holidays/">{y} federal holidays in detail</a></p>' if y in HOL_YEARS else ''
        body2 = f'''<section class="sec wrap"><h2>{y} US federal holidays</h2>{hol_table(lang, c, y)}
{hol_link}</section>
{ad_slot(lang, 'mid')}
<section class="sec wrap"><h2>{len(yd["breaks"])} long weekends in {y}</h2><p class="sub">Runs of three or more days made of weekends and federal holidays.</p>{break_rows(lang, c, y)}</section>
<section class="sec wrap"><h2>{y} at a glance</h2>{year_facts(lang, c, y)}
<p class="note">To count working days between two dates, use the <a href="{DATECALC[lang]}">Daycount business day calculator</a>.</p></section>
<section class="sec wrap"><h2>Monthly calendars</h2>{month_pills(lang)}</section>''' if str(y) in D['years'][c] else ''
        crumbs = [('Calendar maker', U(lang)), (f'{y} calendar', U(lang, path))]
    ld = [crumbs_ld(lang, crumbs), {'@context': 'https://schema.org', '@type': 'WebPage', 'name': title.split(' | ')[0], 'url': U(lang, path), 'inLanguage': lang, 'description': desc}]
    body = tool(lang, y, True) + '\n' + body2 + '\n' + ad_slot(lang, 'bottom')
    put(lang, path, page(lang, head(lang, title, desc, path, alt=path, jsonld=ld), body, cur=(path if y == 2027 else None), alt_path=path))


# ---------------- 월 ----------------
def month_page(lang, y, m):
    u, p, c = C.UI[lang], P(lang), country(lang)
    md_ = D['months'][f'{c}-{y}-{m}']
    f = md_['facts']
    path, alt = mpath(lang, y, m), mpath('en' if lang == 'ko' else 'ko', y, m)
    i = MONTHS.index((y, m))
    prev = MONTHS[i - 1] if i > 0 else None
    nxt = MONTHS[i + 1] if i + 1 < len(MONTHS) else None
    paper = 'a4' if lang == 'ko' else 'letter'
    hols = list(zip(f['holidays'], md_['labels']))
    if lang == 'ko':
        name = f'{y}년 {m}월'
        hol_txt = ', '.join(f'{lab}({h["d"]}일)' for h, lab in hols)
        title = f'{name} 달력 · 공휴일·음력·손 없는 날 | 한장달력'
        desc = (f'{name}은 {f["days"]}일이고 {WD_KO[f["firstWd"]]}요일에 시작해요. ' + (f'공휴일은 {hol_txt}. ' if hols else '공휴일은 없어요. ')
                + f'주5일 기준 일하는 날은 {f["workdays"]}일이에요. 음력과 24절기가 든 달력을 인쇄하거나 PDF로 받아요.')
        h1 = f'{name} 달력'
        nav = (f'<a href="{p}{mpath(lang, *prev)}">{I_L}{prev[1]}월</a>' if prev else '') + (f'<a href="{p}{mpath(lang, *nxt)}">{nxt[1]}월{I_R}</a>' if nxt else '')
        pdf_t, hol_h, fact_h = '이 달 PDF 받기', '이 달 공휴일', '이 달 한눈에'
        hl = ''.join(f'<li><time datetime="{h["date"]}">{h["d"]}일 {WD_KO[h["wd"]]}</time><span>{esc(kr_name(h))}</span></li>' for h, lab in hols) or '<li><span>이 달은 공휴일이 없어요.</span></li>'
        lf, lt = f['lunar']['from'], f['lunar']['to']
        lun = f'{"윤" if lf["leap"] else ""}{lf["m"]}월 {lf["d"]}일 ~ {"윤" if lt["leap"] else ""}{lt["m"]}월 {lt["d"]}일'
        terms = ', '.join(f'{t["name"]} {t["d"]}일' for t in (f['terms'] or []))
        son = '·'.join(str(d) for d in f['son']) + '일'
        facts = [('날 수', f'{f["days"]}<small>일</small>', ''), ('일하는 날(주5일)', f'{f["workdays"]}<small>일</small>', ''),
                 ('평일 · 토 · 일', f'{f["weekdays"]} · {f["saturdays"]} · {f["sundays"]}', ''), ('첫날 · 말일', f'{WD_KO[f["firstWd"]]} · {WD_KO[f["lastWd"]]}<small>요일</small>', ''),
                 ('주 번호(ISO 8601)', f'{f["isoWeeks"][0]["week"]}주 ~ {f["isoWeeks"][1]["week"]}주', 'wide'), ('음력', lun, 'wide')]
        if terms:
            facts.append(('24절기', terms, 'wide'))
        facts.append(('손 없는 날', son, 'wide'))
        note = (f'<p class="note">일하는 날은 평일에서 공휴일을 뺀 수예요. 기간을 정해 세려면 <a href="{DATECALC[lang]}">며칠 계산기</a>를 쓰세요.</p>'
                f'<p class="note">손 없는 날은 전해 오는 풍습이에요. 달별 날짜는 <a href="{p}son-eomneun-nal/">손 없는 날 표</a>에 있어요.</p>')
        more = (f'<section class="sec wrap"><h2>다른 달</h2>{month_pills(lang, (y, m))}'
                f'<p class="note"><a href="{p}{y}/">{y}년 달력 한 장 받기</a> · <a href="{p}?k=month&amp;y={y}&amp;m={m}">주 시작·용지를 바꿔 이 달 만들기</a></p></section>')
        crumbs = [('달력 만들기', U(lang)), (f'{y}년 달력', U(lang, f'{y}/')), (f'{m}월', U(lang, path))]
        basis = basis_line(lang, y).split(' <a')[0]
    else:
        name = f'{EN_M[m - 1]} {y}'
        hol_txt = ', '.join(f'{lab} ({EN_M[m - 1][:3]} {h["d"]})' for h, lab in hols)
        title = f'{name} Calendar: Printable, with US Holidays | Onesheet'
        desc = (f'{name} has {f["days"]} days and starts on a {WD_EN[f["firstWd"]]}. ' + (f'Federal holidays: {hol_txt}. ' if hols else 'There are no federal holidays. ')
                + f'{f["workdays"]} working days. Print it or save a PDF.')
        h1 = f'{name} Calendar'
        nav = (f'<a href="{p}{mpath(lang, *prev)}">{I_L}{EN_M[prev[1] - 1][:3]}</a>' if prev else '') + (f'<a href="{p}{mpath(lang, *nxt)}">{EN_M[nxt[1] - 1][:3]}{I_R}</a>' if nxt else '')
        pdf_t, hol_h, fact_h = 'Download this month (PDF)', 'Holidays this month', 'This month at a glance'
        hl = ''.join(f'<li><time datetime="{h["date"]}">{WD_EN[h["wd"]][:3]} {h["d"]}</time><span>{esc(h["en"])}</span></li>' for h, lab in hols) or '<li><span>No federal holidays this month.</span></li>'
        facts = [('Days', str(f['days']), ''), ('Working days', str(f['workdays']), ''),
                 ('Weekdays · Sat · Sun', f'{f["weekdays"]} · {f["saturdays"]} · {f["sundays"]}', ''), ('First · last day', f'{WD_EN[f["firstWd"]][:3]} · {WD_EN[f["lastWd"]][:3]}', ''),
                 ('ISO 8601 weeks', f'{f["isoWeeks"][0]["week"]} to {f["isoWeeks"][1]["week"]}', 'wide'), ('US-style weeks', f'{f["usWeeks"][0]} to {f["usWeeks"][1]}', 'wide')]
        note = (f'<p class="note">Working days are Monday to Friday minus federal holidays. Count any range with the <a href="{DATECALC[lang]}">Daycount business day calculator</a>.</p>'
                f'<p class="note">The two week-number systems are explained in <a href="{p}guide/week-numbers-iso-vs-us/">ISO 8601 vs US week numbering</a>.</p>')
        more = (f'<section class="sec wrap"><h2>Other months</h2>{month_pills(lang, (y, m))}'
                f'<p class="note"><a href="{p}{y}/">Get the whole {y} calendar on one page</a> · <a href="{p}?k=month&amp;y={y}&amp;m={m}">Change the week start or paper for this month</a></p></section>')
        crumbs = [('Calendar maker', U(lang)), (f'{y} calendar', U(lang, f'{y}/')), (EN_M[m - 1], U(lang, path))]
        basis = basis_line(lang, y).split(' <a')[0]
    fx = ''.join(f'<div{" class=\"wide\"" if w else ""}><dt>{k}</dt><dd>{v}</dd></div>' for k, v, w in facts)
    body = f'''<section class="month wrap" data-month-page data-country="{c}" data-year="{y}" data-month="{m}" data-paper="{paper}">
  <div class="m-head">
    <h1>{h1}</h1>
    <nav class="m-nav" aria-label="{'달 넘기기' if lang == 'ko' else 'Months'}">{nav}</nav>
    <div class="acts">
      <button type="button" class="btn btn-main" data-pdf>{I_DL}<span>{pdf_t}</span></button>
      <button type="button" class="btn" data-print>{I_PR}{u['print']}</button>
      <button type="button" class="btn" data-png>{u['png']}</button>
    </div>
  </div>
  <p class="hint" data-note role="status" hidden></p>
  <div class="m-body">
    <div><div class="wm-box">{md_['web']}</div><p class="basis">{basis}</p></div>
    <aside class="m-side">
      <h2>{hol_h}</h2><ul class="hl">{hl}</ul>
      <h2>{fact_h}</h2><dl class="facts">{fx}</dl>
    </aside>
  </div>
  {note}
</section>
{ad_slot(lang, 'mid')}
{more}
{ad_slot(lang, 'bottom')}'''
    ld = [crumbs_ld(lang, crumbs), {'@context': 'https://schema.org', '@type': 'WebPage', 'name': h1, 'url': U(lang, path), 'inLanguage': lang, 'description': desc}]
    put(lang, path, page(lang, head(lang, title, desc, path, alt=alt, jsonld=ld), body, cur='@month', alt_path=alt))


# ---------------- 공휴일·연휴 ----------------
def holidays_page(lang, y):
    u, p, c = C.UI[lang], P(lang), country(lang)
    yd = D['years'][c][str(y)]
    f = yd['facts']
    path = f'{y}/holidays/'
    subs = [it for it in yd['list'] if it['kind'] == 'substitute']
    if lang == 'ko':
        title = f'{y}년 공휴일·대체공휴일·연휴 정리 | 한장달력'
        desc = (f'{y}년 공휴일은 대체공휴일 {len(subs)}일을 넣어 {f["holidayDates"]}일, 3일 이상 연휴는 {len(yd["breaks"])}번이에요. '
                f'2026년 4월 개정(노동절·제헌절)을 반영한 날짜와 요일, 연차 하루로 이어지는 날을 표로 볼 수 있어요.')
        lead = (count_note(y) + (f' {f["publicHolidays"]}일과 {f["daysOff"]}일은 우주항공청 2027년 월력요항에 나온 숫자예요.' if y == 2027
                                 else ' 2026년 4월 개정으로 더해진 노동절과 제헌절을 넣어 계산하면 이렇게 돼요.'))
        sub_txt = ', '.join(f'{it["m"]}월 {it["d"]}일({WD_KO[it["wd"]]})' for it in subs)
        changed = (f'''<section class="sec wrap narrow-sec"><h2>2026년 개정으로 바뀐 것</h2><div class="prose narrow">
<p>2026년 4월 30일 개정으로 노동절(5월 1일)과 제헌절(7월 17일)이 공휴일이 됐고, 두 날 모두 대체공휴일 대상이에요. '''
                   + ('2027년에는 두 날이 토요일이라 5월 3일(월)과 7월 19일(월)이 대체공휴일이에요.' if y == 2027 else '2026년에는 두 날이 모두 금요일이라 대체공휴일 없이 그대로 사흘 연휴였어요.')
                   + f''' 5월 1일이 그전과 무엇이 다른지는 <a href="{p}guide/2026-nodongjeol-jeheonjeol/">노동절·제헌절, 2026년부터 공휴일이 됐어요</a>에 있어요.</p>
<h2>회사도 쉬나요</h2>
<p>이 페이지는 관공서 공휴일 기준이에요. 상시 근로자가 5명 이상인 사업장에서는 일요일을 뺀 공휴일과 대체공휴일이 유급휴일이에요(<a href="{C.LAW55}">근로기준법 제55조 제2항</a>, <a href="{C.LAW30}">시행령 제30조 제2항</a>). 근로자대표와 서면으로 합의하면 다른 근로일로 바꿀 수 있고, 4명 이하 사업장에는 이 조항이 적용되지 않아요(<a href="{C.LAW11}">근로기준법 제11조</a>와 시행령 별표 1). {C.MAY1['ko']}</p></div></section>''')
        br = bridge_rows(lang, c, y)
        body = f'''<section class="doc wrap">{crumb(lang, [('달력 만들기', p), (f'{y}년 달력', f'{p}{y}/')])}
<h1>{y}년 공휴일과 연휴</h1><p class="lead">{lead}</p>
<p class="note"><a class="btn btn-main" href="{p}{y}/">{I_DL}<span>{y}년 달력 한 장 받기</span></a></p></section>
<section class="sec wrap"><h2>{y}년 공휴일 {f["holidayDates"]}일</h2>{hol_table(lang, c, y)}
<p class="note">선거일과 임시공휴일은 확정된 날만 들어 있어요.</p></section>
<section class="sec wrap"><h2>대체공휴일 {len(subs)}일</h2><p class="sub">{sub_txt}</p>
<p class="note">공휴일이 토·일요일이나 다른 공휴일과 겹치면 그다음 첫 평일이 쉬는 날이 돼요. 1월 1일과 현충일은 해당하지 않아요. 규칙은 <a href="{p}guide/daeche-gonghyuil/">대체공휴일이 생기는 세 가지 경우</a>에서 볼 수 있어요.</p></section>
{ad_slot(lang, 'mid')}
<section class="sec wrap"><h2>3일 이상 연휴 {len(yd["breaks"])}번</h2>{break_rows(lang, c, y)}</section>
''' + (f'<section class="sec wrap"><h2>연차 하루로 이어지는 날</h2><p class="sub">쉬는 날 사이에 평일이 하루 끼어 있는 곳이에요.</p>{br}</section>' if br else '') + changed + f'''
<section class="sec wrap"><div class="src"><h2>출처</h2><ul><li><a href="{C.LAW}">관공서의 공휴일에 관한 규정 (국가법령정보센터, 시행 2026. 5. 11.)</a> <small>{C.SEEN9['ko']}</small></li>
<li><a href="{C.KASA}">우주항공청 「2027년 월력요항」 발표 (2026. 6. 29.)</a> <small>{C.SEEN9['ko']}</small></li><li><a href="{C.KASI}">한국천문연구원 달력자료</a></li>
<li><a href="{C.LAW55}">근로기준법 제55조</a>, <a href="{C.LAW30}">시행령 제30조</a>, <a href="{C.LAW11}">제11조</a>, <a href="{C.NODONG}">노동절 제정에 관한 법률</a> <small>{C.SEEN10['ko']}</small></li></ul></div></section>
{ad_slot(lang, 'bottom')}'''
        crumbs = [('달력 만들기', U(lang)), (f'{y}년 달력', U(lang, f'{y}/')), ('공휴일·연휴', U(lang, path))]
    else:
        title = f'US Federal Holidays {y}: Dates, Observed Days and Long Weekends | Onesheet'
        desc = (f'All eleven US federal holidays in {y} with weekdays and observed dates. They give {f["holidaysOnWeekdays"]} weekdays off and {len(yd["breaks"])} long weekends.')
        extra = ('<p class="note">Friday, December 31, 2027 is the observed day for New Year’s Day 2028, which falls on a Saturday. It is a day off in 2027 even though the holiday belongs to 2028.</p>' if y == 2027 else
                 '<p class="note">Independence Day falls on Saturday, July 4, 2026, so it is observed on Friday, July 3.</p>')
        br = bridge_rows(lang, c, y)
        body = f'''<section class="doc wrap">{crumb(lang, [('Calendar maker', p), (f'{y} calendar', f'{p}{y}/')])}
<h1>US Federal Holidays in {y}</h1><p class="lead">The eleven federal holidays give {f["holidaysOnWeekdays"]} weekdays off in {y} and {len(yd["breaks"])} long weekends. When a holiday falls on a Saturday it is observed on Friday, and on a Sunday it is observed on Monday.</p>
<p class="note"><a class="btn btn-main" href="{p}{y}/">{I_DL}<span>Get the {y} calendar on one page</span></a></p></section>
<section class="sec wrap"><h2>Dates and observed days</h2>{hol_table(lang, c, y)}{extra}</section>
{ad_slot(lang, 'mid')}
<section class="sec wrap"><h2>{len(yd["breaks"])} long weekends</h2>{break_rows(lang, c, y)}</section>
''' + (f'<section class="sec wrap"><h2>One day off that makes a longer break</h2><p class="sub">A single working day sits between a holiday and the weekend.</p>{br}</section>' if br else '') + f'''
<section class="sec wrap"><div class="src"><h2>Sources</h2><ul><li>The holidays and the Saturday and Sunday rule are set by 5 U.S.C. 6103. Dates on this page are computed from that rule.</li>
<li><a href="{C.OPM}">U.S. Office of Personnel Management: Federal Holidays</a> publishes the official schedule. The {y} days off on this page match it <small>({C.SEEN10['en']})</small>. Holiday names in the table follow OPM, and the calendar itself uses the common name Martin Luther King Jr. Day.</li></ul>
<p>This page covers federal holidays, which apply to federal employees. Your employer, school or state may follow a different schedule.</p></div></section>
{ad_slot(lang, 'bottom')}'''
        crumbs = [('Calendar maker', U(lang)), (f'{y} calendar', U(lang, f'{y}/')), ('Federal holidays', U(lang, path))]
    ld = [crumbs_ld(lang, crumbs), {'@context': 'https://schema.org', '@type': 'WebPage', 'name': title.split(' | ')[0], 'url': U(lang, path), 'inLanguage': lang, 'description': desc}]
    put(lang, path, page(lang, head(lang, title, desc, path, jsonld=ld), body, cur=(path if y == 2027 else None), scripts=False))


# ---------------- 음력·손 없는 날 (한국어) ----------------
def lunar_page():
    lang, p = 'ko', '/ko/'
    title = '양력 음력 변환 · 음력 달력 (1912~2049년) | 한장달력'
    desc = '양력 날짜를 음력으로, 음력 날짜를 양력으로 바꿔요. 윤달을 표시하고, 없는 윤달이나 작은달 30일은 알려 줘요. 이번 달 음력 달력도 볼 수 있어요.'
    y, m = BUILD_MONTH
    web = D['months'][f'KR-{y}-{m}']['web']
    body = f'''<section class="doc wrap" data-lunar>{crumb(lang, [('달력 만들기', p)])}
<h1>양력·음력 변환</h1><p class="lead">날짜를 숫자로 넣으면 바로 바꿔요. 넣은 날짜는 이 기기 밖으로 나가지 않아요.</p>
<div class="conv">
  <div class="conv-card"><h2>양력 → 음력</h2>
    <div class="conv-row"><input name="sy" inputmode="numeric" aria-label="양력 연도" value="{y}" autocomplete="off"><label>년</label><input class="mo" name="sm" inputmode="numeric" aria-label="양력 월" value="{m}" autocomplete="off"><label>월</label><input class="da" name="sd" inputmode="numeric" aria-label="양력 일" value="1" autocomplete="off"><label>일</label></div>
    <div class="conv-out" data-out="s2l" aria-live="polite"><b>&nbsp;</b><span>&nbsp;</span></div></div>
  <div class="conv-card"><h2>음력 → 양력</h2>
    <div class="conv-row"><input name="ly" inputmode="numeric" aria-label="음력 연도" value="{y}" autocomplete="off"><label>년</label><input class="mo" name="lm" inputmode="numeric" aria-label="음력 월" value="1" autocomplete="off"><label>월</label><input class="da" name="ld" inputmode="numeric" aria-label="음력 일" value="1" autocomplete="off"><label>일</label>
      <label class="check"><input type="checkbox" name="leap">윤달</label></div>
    <div class="conv-out" data-out="l2s" aria-live="polite"><b>&nbsp;</b><span>&nbsp;</span></div></div>
</div>
<p class="basis">한국천문연구원 자료 기반 표, 천문 계산으로 검산. 공식 자료와 직접 대조한 범위는 2025~2028년이에요. 바꿀 수 있는 범위는 양력 1912년 2월 18일 ~ 2050년 1월 22일이고, 범위 밖은 알려 드려요.</p>
</section>
<section class="sec wrap" data-lmonth><div class="m-head"><h2 class="sec-h"><span data-lm-title>{y}년 {m}월</span> 음력 달력</h2>
<nav class="m-nav"><button type="button" class="btn" data-lstep="-1" aria-label="이전 달">{I_L}</button><button type="button" class="btn" data-lstep="1" aria-label="다음 달">{I_R}</button></nav></div>
<p class="sub">칸 아래 ‘음 9.1’이 음력 날짜예요. 굵은 날이 음력 초하루예요.</p>
<div style="max-width:860px;margin-top:12px;min-height:520px"><div class="wm-box">{web}</div></div></section>
{ad_slot(lang, 'mid')}
<section class="sec wrap"><h2>알아 두면 좋은 것</h2><div class="prose narrow">
<ul><li>음력 한 달은 29일(작은달)이거나 30일(큰달)이에요. 작은달의 30일은 없는 날이라 변환기가 알려 줘요.</li>
<li>윤달은 같은 번호의 평달 바로 뒤에 와요. 2025년에는 윤6월, 2028년에는 윤5월이 있어요.</li>
<li>24절기와 손 없는 날은 <a href="{p}{mpath(lang, y, m)}">월 달력</a>에 같이 나와요. 달별 표는 <a href="{p}son-eomneun-nal/">손 없는 날</a>에 있어요.</li></ul>
<p>윤달이 왜 생기는지는 <a href="{p}guide/eumnyeok-yundal/">2025년 윤6월, 2028년 윤5월로 보는 음력과 윤달</a>에서 읽을 수 있어요.</p></div>
<div class="src"><h2>출처</h2><ul><li><a href="{C.KASI}">한국천문연구원 천문우주지식정보 달력자료</a></li></ul></div></section>
{ad_slot(lang, 'bottom')}'''
    ld = [crumbs_ld(lang, [('달력 만들기', U(lang)), ('양력·음력 변환', U(lang, 'lunar/'))]),
          {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': '양력·음력 변환', 'url': U(lang, 'lunar/'), 'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any',
           'inLanguage': 'ko', 'isAccessibleForFree': True, 'description': desc, 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'KRW'}}]
    put(lang, 'lunar/', page(lang, head(lang, title, desc, 'lunar/', jsonld=ld), body, cur='lunar/'))


def son_page():
    lang, p = 'ko', '/ko/'
    title = '손 없는 날 2026·2027년 달별 표 | 한장달력'
    desc = '2026년 10월부터 2027년 12월까지 손 없는 날을 달별 표로 볼 수 있어요. 요일과 음력 날짜, 주말·공휴일과 겹치는 날을 같이 표시했어요.'
    secs = []
    for y, m in MONTHS:
        rows = []
        for r in D['son'][f'{y}-{m}']:
            tag = ('<span class="tag">' + esc(r['hol']) + '</span>' if r['hol'] else '<span class="tag">주말</span>' if r['wd'] in (0, 6) else '')
            cls = 'sun' if (r['wd'] == 0 or r['hol']) else 'sat' if r['wd'] == 6 else ''
            rows.append(f'<tr><td class="d">{m}월 {r["d"]}일</td><td class="{cls}">{WD_KO[r["wd"]]}요일</td><td>음 {r["lunar"]}</td><td>{tag}</td></tr>')
        wk = sum(1 for r in D['son'][f'{y}-{m}'] if r['wd'] in (0, 6) or r['hol'])
        secs.append(f'<section class="sec wrap" id="m{y}-{m}"><h2>{y}년 {m}월 손 없는 날</h2><p class="sub">모두 {len(rows)}일, 주말·공휴일과 겹치는 날은 {wk}일이에요. <a href="{p}{mpath(lang, y, m)}">{m}월 달력 보기</a></p>'
                    f'<div class="tbl-wrap"><table class="tbl" style="max-width:560px"><thead><tr><th>날짜</th><th>요일</th><th>음력</th><th>겹치는 날</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div></section>')
        if (y, m) == MONTHS[2]:
            secs.append(ad_slot(lang, 'mid'))
    body = f'''<section class="doc wrap">{crumb(lang, [('달력 만들기', p)])}
<h1>손 없는 날 (2026년 10월 ~ 2027년 12월)</h1>
<p class="lead">손 없는 날은 음력 날짜의 끝자리가 9와 0인 날이에요. 음력 9·10·19·20·29·30일이 해당해요. 이삿날을 잡을 때 많이 찾아요.</p>
<p class="notice">손 없는 날은 전해 오는 풍습이에요. 공식 기준이나 과학적 근거가 있는 날은 아니에요. 여기서는 음력 표로 위 규칙대로만 계산했어요.</p>
<div class="pills">{''.join(f'<a href="#m{y}-{m}">{str(y)[2:]}년 {m}월</a>' for y, m in MONTHS)}</div></section>
{''.join(secs)}
<section class="sec wrap"><h2>달력에 넣어 인쇄하려면</h2><div class="prose narrow"><p><a href="{p}">달력 만들기</a>에서 ‘월별 12장’이나 ‘한 달’을 고르고 ‘내 설정으로 바꾸기’에서 손 없는 날을 켜면 달력 칸에 표시돼요. 음력 날짜는 <a href="{p}lunar/">양력·음력 변환</a>에서 바로 확인할 수 있어요.</p></div></section>
{ad_slot(lang, 'bottom')}'''
    ld = [crumbs_ld(lang, [('달력 만들기', U(lang)), ('손 없는 날', U(lang, 'son-eomneun-nal/'))]),
          {'@context': 'https://schema.org', '@type': 'WebPage', 'name': '손 없는 날 2026·2027년 달별 표', 'url': U(lang, 'son-eomneun-nal/'), 'inLanguage': 'ko', 'description': desc}]
    put(lang, 'son-eomneun-nal/', page(lang, head(lang, title, desc, 'son-eomneun-nal/', jsonld=ld), body, cur='son-eomneun-nal/', scripts=False))


# ---------------- 글 ----------------
def kr2027_table():
    rows = []
    for it in D['years']['KR']['2027']['list']:
        rows.append(f'<tr><td>{EN_M[it["m"] - 1][:3]} {it["d"]}</td><td>{WD_EN[it["wd"]][:3]}</td><td>{esc(it["en"])}</td><td><span lang="ko">{esc(kr_name(it))}</span></td></tr>')
    return '<table class="wide"><thead><tr><th>Date</th><th>Day</th><th>Holiday</th><th>Korean name</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table>'


def article_body(lang, a):
    return a['body'].replace('{P}', P(lang)).replace('{KR2027_TABLE}', kr2027_table() if lang == 'en' else '')


def article_page(lang, a):
    u, p = C.UI[lang], P(lang)
    path = f'guide/{a["slug"]}/'
    pair = a.get('pair')
    alt = f'guide/{pair}/' if pair else None
    # 글 속 광고 자리는 초록 받기 단추(cta) 바로 아래. 단추는 본문 가운데에 하나만 둔다(끝에 두면 광고 둘이 붙는다).
    body_html = tables(article_body(lang, a))
    cta = re.search(r'<p><a class="btn btn-main cta".*?</p>', body_html, flags=re.S)
    assert cta and len(re.findall('class="btn btn-main cta"', body_html)) == 1 and '<h2>' in body_html[cta.end():], f'{a["slug"]}: 받기 단추는 본문 가운데에 하나'
    first, rest = body_html[:cta.end()], body_html[cta.end():]
    src = ''
    if a.get('sources'):
        src = f'<div class="src"><h2>{u["sources"]}</h2><ul>' + ''.join(
            f'<li><a href="{esc(h)}">{esc(n)}</a>' + (f' <small>{seen[lang]}</small>' if seen else '') + '</li>' for n, h, seen in a['sources']) + '</ul></div>'
    others = [x for x in C.ARTICLES[lang] if x['slug'] != a['slug']]
    more = ('<section class="sec wrap narrow"><h2>' + ('다른 가이드' if lang == 'ko' else 'More guides') + '</h2><ul class="glist">'
            + ''.join(f'<li><a href="{p}guide/{x["slug"]}/"><b>{esc(x["title"])}</b><span>{esc(x["desc"])}</span></a></li>' for x in others) + '</ul></section>')
    date_txt = C.CHECKED[lang]
    body = f'''<article class="doc wrap narrow">{crumb(lang, [(u['crumb_home'], p), (u['guide'], p + 'guide/')])}
<h1>{esc(a['title'])}</h1><p class="lead">{esc(a['lead'])}</p><p class="meta">{u['updated']} {date_txt} · {u['brand']}</p>
<div class="prose">{first}</div></article>
{ad_slot(lang, 'mid', True)}
<article class="wrap narrow"><div class="prose">{rest}</div>{src}</article>
{more}
{ad_slot(lang, 'bottom', True)}'''
    ld = [{'@context': 'https://schema.org', '@type': 'Article', 'headline': a['title'], 'description': a['desc'], 'inLanguage': lang, 'datePublished': TODAY,
           'dateModified': lastmod(P(lang) + path), 'mainEntityOfPage': U(lang, path), 'image': f'{SITE}/{"og-ko.png" if lang == "ko" else "og.png"}',
           'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': LUMEN[lang]}, 'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': LUMEN[lang]}},
          crumbs_ld(lang, [(u['crumb_home'], U(lang)), (u['guide'], U(lang, 'guide/')), (a['title'], U(lang, path))])]
    put(lang, path, page(lang, head(lang, a['title'] + ' | ' + u['brand'], a['desc'], path, alt=alt, jsonld=ld, og_type='article'), body, cur='guide/', alt_path=alt, scripts=False))


def guide_index(lang):
    u, p = C.UI[lang], P(lang)
    if lang == 'ko':
        title, desc, h1, lead = '가이드: 공휴일·인쇄·음력 | 한장달력', '2026년 공휴일 개정, 대체공휴일 규칙, 달력을 한 장에 인쇄하는 법, 음력과 윤달을 다룬 글이에요.', '가이드', '달력을 뽑다가 궁금해지는 것들을 한 편씩 풀었어요.'
    else:
        title, desc, h1, lead = 'Guides: Printing, Week Numbers, Holidays | Onesheet', 'How to print a calendar on one page, 2027 long weekends, ISO and US week numbers, and South Korea’s 2027 public holidays.', 'Guides', 'Short answers to the questions that come up when you print a calendar.'
    body = f'<section class="doc wrap narrow">{crumb(lang, [(u["crumb_home"], p)])}<h1>{h1}</h1><p class="lead">{lead}</p>{guide_list(lang)}</section>\n{ad_slot(lang, "bottom", True)}'
    ld = [crumbs_ld(lang, [(u['crumb_home'], U(lang)), (u['guide'], U(lang, 'guide/'))])]
    put(lang, 'guide/', page(lang, head(lang, title, desc, 'guide/', jsonld=ld), body, cur='guide/', scripts=False))


# ---------------- 소개·방침·고지·404 ----------------
def simple_page(lang, key, data):
    title, desc, inner = data[lang]
    body = f'<article class="doc wrap narrow">{inner.replace("{P}", P(lang))}</article>'
    put(lang, key, page(lang, head(lang, title, desc, key, alt=key, ads=False), body, alt_path=key, scripts=False))


def licenses_page(lang):
    def pick(s):
        return re.sub(r'\((.+?) / (.+?)\)', lambda m: '(' + (m.group(1) if lang == 'ko' else m.group(2)) + ')', s)
    rows = ''.join(f'<tr><td><a href="{esc(h)}">{esc(pick(n))}</a></td><td>{esc(a)}</td><td><a href="{esc(l)}">{esc(lic)}</a></td></tr>' for n, a, lic, h, l in C.LICENSES)
    if lang == 'ko':
        title, desc, h1 = '오픈소스 고지 | 한장달력', '한장달력이 쓰는 글꼴과, 음력·공휴일 표와 엑셀 파일을 미리 만들 때 쓴 오픈소스 도구, 그 라이선스를 적었어요.', '오픈소스 고지'
        intro = '이 사이트의 화면 코드는 외부 라이브러리 없이 직접 만들었어요. 아래는 글꼴과, 음력·공휴일 표와 엑셀 파일을 미리 만들 때 쓴 도구예요. 도구 자체는 사이트에 실려 있지 않아요.'
        th = '<th>이름</th><th>만든 이</th><th>라이선스</th>'
    else:
        title, desc, h1 = 'Open-source licenses | Onesheet', 'The typeface Onesheet uses and the open-source tools used to prepare its tables and files, with their licenses.', 'Open-source licenses'
        intro = 'The code that runs on this site was written without third-party libraries. Listed below are the typeface and the tools used ahead of time to build the lunar and holiday tables and the spreadsheet files. The tools themselves are not shipped with the site.'
        th = '<th>Name</th><th>Author</th><th>License</th>'
    body = f'<article class="doc wrap narrow"><h1>{h1}</h1><p class="lead">{intro}</p><div class="prose">' + tables(f'<table class="stack"><thead><tr>{th}</tr></thead><tbody>{rows}</tbody></table>') + '</div></article>'
    put(lang, 'licenses/', page(lang, head(lang, title, desc, 'licenses/', alt='licenses/', ads=False), body, alt_path='licenses/', scripts=False))


def not_found():
    h = head('en', 'Page not found | Onesheet', 'This page does not exist.', '', ads=False, noindex=True)
    body = '<section class="wrap nf"><h1>Page not found · <span lang="ko">페이지가 없어요</span></h1><p><a href="/">Onesheet calendar maker</a> · <a href="/ko/" lang="ko">한장달력 달력 만들기</a></p></section>'
    OUT['404.html'] = page('en', h, body, scripts=False)


def main():
    for lang in ('en', 'ko'):
        home(lang)
        for y in YEARS:
            year_page(lang, y)
        for y, m in MONTHS:
            month_page(lang, y, m)
        for y in HOL_YEARS:
            holidays_page(lang, y)
        guide_index(lang)
        for a in C.ARTICLES[lang]:
            article_page(lang, a)
        simple_page(lang, 'about/', C.ABOUT)
        simple_page(lang, 'privacy/', C.PRIVACY)
        licenses_page(lang)
    lunar_page()
    son_page()
    not_found()
    if '--check' in sys.argv:   # 저장된 HTML이 지금 빌드 결과와 같은지만 본다
        stale = [rel for rel, text in OUT.items() if not (ROOT / rel).exists() or (ROOT / rel).read_text(encoding='utf-8') != text]
        print('빌드 결과가 최신' if not stale else '낡은 파일: ' + ', '.join(stale[:8]))
        sys.exit(1 if stale else 0)
    for rel, text in OUT.items():
        f = ROOT / rel
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(text, encoding='utf-8')
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += [f'<url><loc>{u}</loc><lastmod>{d}</lastmod></url>' for u, d in SITEMAP]
    (ROOT / 'sitemap.xml').write_text('\n'.join(sm) + '\n</urlset>\n', encoding='utf-8')
    items = []
    for a in C.ARTICLES['ko']:
        link = U('ko', f'guide/{a["slug"]}/')
        full = re.sub(r'href="/', f'href="{SITE}/', article_body('ko', a)).replace(' class="stack"', '')
        items.append(f'<item><title>{esc(a["title"])}</title><link>{link}</link><guid isPermaLink="true">{link}</guid><pubDate>Fri, 09 Oct 2026 00:00:00 +0900</pubDate>'
                     f'<description><![CDATA[<p>{a["lead"]}</p>{full}]]></description></item>')
    rss = (f'<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>한장달력 가이드</title><link>{SITE}/ko/guide/</link>'
           f'<description>공휴일, 달력 인쇄, 음력을 정리한 한장달력의 글</description><language>ko</language>\n' + '\n'.join(items) + '\n</channel></rss>\n')
    (ROOT / 'rss.xml').write_text(rss, encoding='utf-8')
    static = {
        'robots.txt': ('# 검색엔진과 AI 검색·답변 서비스 모두 허용 (AI 답변에 출처로 나오게)\n' + ''.join(
            f'User-agent: {b}\nAllow: /\n\n' for b in ['*', 'Googlebot', 'Yeti', 'Bingbot', 'OAI-SearchBot', 'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended'])
            + f'Sitemap: {SITE}/sitemap.xml\n'),
        'ads.txt': 'google.com, pub-9496167591465154, DIRECT, f08c47fec0942fa0\n',
        'googlea614029e84d58498.html': 'google-site-verification: googlea614029e84d58498.html',
        '.assetsignore': '_dev\ntests\nCLAUDE.md\nwrangler.jsonc\n.assetsignore\n.deploy-actions\n.wrangler\n.DS_Store\n',
        '.deploy-actions': '',
        'wrangler.jsonc': '''// Cloudflare 배포 설정: 이 폴더 = Cloudflare Worker 'calendar' 하나 (한장달력 / Onesheet, 인쇄용 달력)
// 주소: https://calendar.lumenlab.page (영어 /, 한국어 /ko/). workers.dev 주소는 켜지 않는다(같은 내용이 두 주소에 생기지 않게).
// 빌드 없음. 이 폴더 파일이 그대로 사이트가 된다. 올리지 않을 파일은 .assetsignore 에 적는다.
// 배포는 GitHub Actions(.github/workflows/deploy-new-sites.yml)가 한다 (.deploy-actions 표시).
{
  "name": "calendar",
  "compatibility_date": "2026-09-01",
  "assets": {
    "directory": ".",
    // 없는 주소는 404.html(광고 없음, noindex)을 404로 보여 준다
    "not_found_handling": "404-page"
  },
  "workers_dev": false,
  "routes": [
    { "pattern": "calendar.lumenlab.page", "custom_domain": true }
  ]
}
''',
    }
    for rel, text in static.items():
        (ROOT / rel).write_text(text, encoding='utf-8')
    print(f'built {len(OUT)} pages, sitemap {len(SITEMAP)} urls')


if __name__ == '__main__':
    main()
