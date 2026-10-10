#!/usr/bin/env python3
"""공평뽑기 / Pickboard (pick.lumenlab.page) 페이지 전부 만들기: python3 -B pick/_dev/build.py

- 화면 글자·도구 설명·FAQ = _dev/content.json, 글 = _dev/articles.json(목록) + _dev/articles/<언어>-<주소>.html(본문),
  소개·방침 = _dev/pages.json.
- 만드는 것: 영어 / , 한국어 /ko/ 의 도구 7개·가이드 목록·글·소개·방침, 404.html, sitemap.xml, rss.xml(한국어 글).
  만든 파일은 손으로 고치지 않는다.
- 글 속 숫자는 {{이름}} 자리에 _dev/sim_ladder.json(시뮬레이션)과 tests/fixtures.json(정확한 계산)에서 넣는다(손으로 적지 않는다).
- 소개·방침 본문 = _dev/pages/<언어>-<about|privacy>.html.
- 글꼴: _dev/fonts.json(= _dev/font.py가 만든 조각 글꼴의 파일 이름과 글자 범위)이 있으면 <head>에 preload와 @font-face를 넣는다.
  화면 글자를 고쳐 조각에 없는 글자가 생기면 check.py가 알려 준다 → font.py를 다시 돌린다(안 돌려도 그 글자는 CDN에서 받아 보인다).
- lastmod(sitemap)와 글의 '마지막 확인'은 MODIFIED·UPDATED에 실제로 본문·구조화 데이터·링크를 고친(확인한) 날만 적는다.
  배치·CSS만 바꾼 날은 적지 않는다.
"""
import hashlib
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
SITE = 'https://pick.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
PUBLISHED = '2026-10-09'  # 처음 올린 날
MODIFIED = '2026-10-10'   # 2026-10-10(3단계): 27쪽 모두 제목·본문·FAQ·링크가 바뀌었고, 글·소개·방침의 사실을 다시 확인했다
UPDATED = {}  # 그 뒤에 고친 페이지만: 주소: 'YYYY-MM-DD'
FONT_CSS = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'

C = json.loads((DEV / 'content.json').read_text(encoding='utf-8'))
PAGES = json.loads((DEV / 'pages.json').read_text(encoding='utf-8'))
ARTICLES = json.loads((DEV / 'articles.json').read_text(encoding='utf-8'))
SIM = json.loads((DEV / 'sim_ladder.json').read_text(encoding='utf-8'))
FX = json.loads((ROOT / 'tests' / 'fixtures.json').read_text(encoding='utf-8'))
FONTS = json.loads((DEV / 'fonts.json').read_text(encoding='utf-8')) if (DEV / 'fonts.json').exists() else {}
TOOL_ORDER = ['wheel', 'ladder', 'draw', 'teams', 'number', 'coin', 'dice']
LIST_TOOLS = ['wheel', 'ladder', 'draw', 'teams']
LANGS = ('en', 'ko')

esc = lambda s: html.escape(str(s), quote=True)


# ---------------- 확인 코드(첫 HTML에 미리 적어 두는 예시 명단의 값) ----------------
# 화면 코드(assets/core/name.js의 listCode·ladderCode)와 같은 규칙을 파이썬 hashlib으로 따로 계산한다.
# 브라우저 확인(e2e.py)이 "첫 HTML에 적힌 코드 = 화면 코드가 계산한 코드"를 본다. 예시 명단의 이름은 이미 고른 꼴이다.
def list_code(names):
    return hashlib.sha256('\n'.join(sorted(names)).encode('utf-8')).hexdigest()[:8]


def ladder_code(names, labels):
    return hashlib.sha256(('\n'.join(names) + '\n\n' + '\n'.join(labels)).encode('utf-8')).hexdigest()[:8]


def sample_code(lang, ladder=False):
    names = C['ui'][lang]['sample'].split('\n')
    count = C['js'][lang]['count'].replace('{n}', str(len(names)))
    code = ladder_code(names, C['ui'][lang]['sampleBottom'].split('\n')) if ladder else list_code(names)
    return count, code


def prefix(lang):
    return '/ko/' if lang == 'ko' else '/'


def url(lang, path=''):
    return SITE + prefix(lang) + path


def U(lang):
    return C['ui'][lang]


def TU(lang):
    return C['toolUi'][lang]


def tool(tid, lang):
    return C['tools'][tid][lang]


def tool_href(tid, lang):
    return prefix(lang) + tool(tid, lang)['path']


# ---------------- 조각 ----------------
LOGO = ('<svg width="28" height="26" viewBox="0 0 28 26" aria-hidden="true"><circle cx="12" cy="13" r="8.5" fill="none" stroke="currentColor" stroke-width="5.5" stroke-dasharray="11.75 1.6" transform="rotate(-39.6 12 13)"/>'
        '<path d="M18.55 7.58A8.5 8.5 0 0 1 18.55 18.42" fill="none" stroke="var(--s1)" stroke-width="5.5"/><path d="M28 13l-9.4-4.6v9.2z" fill="var(--pick)"/></svg>')
NEEDLE = ('<span class="needle" aria-hidden="true"><svg viewBox="0 0 50 40"><path d="M3 20 44 4.4Q49 2.6 49 8v24q0 5.4-5 3.6z" fill="var(--pick)"/>'
          '<circle cx="40.5" cy="20" r="4.2" fill="#fff" fill-opacity=".92"/></svg></span>')
# 글 속 사다리 그림: 4명, 6층. rungs[층] = 가로줄이 놓인 틈(왼쪽 세로줄 번호) 목록. 길은 아래 ladder_figure()가 따라가서 그린다(손으로 긋지 않는다).
FIG_RUNGS = [[0], [2], [1], [0], [2], [1]]
FIG_START = 1
ICON_LINK = ('<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.7 9.3a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.7.7M9.3 6.7a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.7-.7" '
             'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>')
LUMEN_WHEEL = ('<span class="lumen-wheel" aria-hidden="true"><svg width="48" height="48" viewBox="0 0 48 48"><g class="lw-disc">'
               '<circle cx="24" cy="24" r="21" fill="var(--rim)" stroke="var(--line-2)"/>'
               '<path d="M24 24 43 24A19 19 0 0 1 24 43z" fill="var(--s1)"/><path class="lw-off" d="M24 24 24 43A19 19 0 0 1 5 24z" fill="var(--s2)"/>'
               '<path class="lw-off" d="M24 24 5 24A19 19 0 0 1 24 5z" fill="var(--s3)"/><path class="lw-off" d="M24 24 24 5A19 19 0 0 1 43 24z" fill="var(--s4)"/>'
               '<circle cx="24" cy="24" r="4" fill="var(--card)"/></g><path class="lw-needle" d="M48 24l-9-4.4v8.8z" fill="var(--pick)"/></svg></span>')


def head(lang, title, desc, path, alt=None, jsonld=(), og_type='website', noindex=False, ads=True):
    """path: 언어 앞머리 뒤 경로. alt: 다른 언어판의 경로(같은 역할일 때만, 없으면 None)."""
    canon = url(lang, path)
    links = [f'<link rel="canonical" href="{canon}">'] if not noindex else []
    if alt is not None and not noindex:
        en_u = url('en', path if lang == 'en' else alt)
        ko_u = url('ko', path if lang == 'ko' else alt)
        links += [f'<link rel="alternate" hreflang="en" href="{en_u}">', f'<link rel="alternate" hreflang="ko" href="{ko_u}">',
                  f'<link rel="alternate" hreflang="x-default" href="{en_u}">']
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>\n' for j in jsonld)
    ad = (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADS_CLIENT}" crossorigin="anonymous"></script>\n'
          '<script src="/assets/ads-config.js"></script>\n') if ads else ''
    og_img = f'{SITE}/og-ko.png' if lang == 'ko' else f'{SITE}/og.png'
    robots = '<meta name="robots" content="noindex">\n' if noindex else ''
    # 조각 글꼴(이 언어판 화면 글자만 담은 파일): 같은 주소에서 먼저 받고, 여기 없는 글자만 아래 CDN 글꼴에서 받는다
    fnt = FONTS.get(lang)
    font = (f'<link rel="preload" href="/assets/fonts/{fnt["file"]}" as="font" type="font/woff2" crossorigin>\n'
            f'<style>@font-face{{font-family:"PK Sans";src:url(/assets/fonts/{fnt["file"]}) format("woff2");font-weight:400 800;font-style:normal;font-display:swap;unicode-range:{fnt["range"]}}}</style>\n') if fnt else ''
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{robots}<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1c2127" media="(prefers-color-scheme: dark)">
{chr(10).join(links)}
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:site_name" content="{C['brand'][lang]}">
<meta property="og:image" content="{og_img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="{'ko_KR' if lang == 'ko' else 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
{font}<link rel="stylesheet" href="{FONT_CSS}" media="print" onload="this.media='all'">
<link rel="stylesheet" href="/assets/style.css">
{ld}{ad}</head>'''


def header(lang, current=None, alt_path=None):
    u = U(lang)
    p = prefix(lang)
    other = 'en' if lang == 'ko' else 'ko'
    nav = ''
    for tid in TOOL_ORDER:
        t = tool(tid, lang)
        cur = ' aria-current="page"' if tid == current else ''
        nav += f'<a href="{p}{t["path"]}"{cur}><span class="l">{esc(t["nav"])}</span><span class="s">{esc(t["short"])}</span></a>'
    lang_link = ''
    if alt_path is not None:
        lang_link = f'<a class="lang" href="{prefix(other)}{alt_path}" lang="{other}" hreflang="{other}">{u["langOther"]}</a>'
    return f'''<a class="skip" href="#main">{u['skip']}</a>
<header class="top">
  <a class="logo" href="{p}">{LOGO}<span>{C['brand'][lang]}</span></a>
  <nav class="tools-nav" aria-label="{u['navLabel']}">{nav}</nav>
  <div class="top-side"><a href="{p}guide/">{u['guides']}</a>{lang_link}</div>
</header>'''


def footer(lang):
    u = U(lang)
    p = prefix(lang)
    lumen = 'https://lumenlab.page/' + ('en/' if lang == 'en' else '')
    return f'''<footer class="foot">
  <div class="wrap foot-in">
    <nav class="foot-links" aria-label="{u['footNav']}"><a href="{p}about/">{u['about']}</a><a href="{p}guide/">{u['guides']}</a><a href="{p}privacy/">{u['privacy']}</a><a href="mailto:woxocoso@gmail.com">{u['contact']}</a></nav>
    <p class="made"><span class="made-k">{u['madeBy']}</span><a class="lumen" href="{lumen}" data-lumen>{LUMEN_WHEEL}<b>{u['made']}</b><span class="lumen-go">{u['moreFrom']}</span></a></p>
    <small>© 2026 Lumen Lab</small>
  </div>
</footer>'''


def ad_slot(lang, name):
    return (f'<div class="ad-wrap wrap" hidden><p class="ad-label">{U(lang)["ad"]}</p><div class="ad-slot" data-ad="{name}"></div>'
            '<script>window.PK_ADS&&PK_ADS.mount(document.currentScript.previousElementSibling)</script></div>')


def i18n_blob(lang, tid=None):
    data = dict(C['js'][lang])
    data['lang'] = lang
    data['paths'] = {t: tool_href(t, lang) for t in TOOL_ORDER}
    data['other'] = {'lang': 'en' if lang == 'ko' else 'ko', 'label': 'English version' if lang == 'ko' else '한국어로 보기'}
    if tid:
        data['tool'] = tid
    return '<script type="application/json" id="i18n">' + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + '</script>'


def page(lang, head_html, body, current=None, alt_path=None, script='/assets/app.js', tid=None, body_class=''):
    cls = f' class="{body_class}"' if body_class else ''
    return f'''{head_html}
<body{cls}>
{header(lang, current, alt_path)}
<main id="main">
{body}
</main>
{footer(lang)}
{i18n_blob(lang, tid)}
<script type="module" src="{script}"></script>
</body>
</html>
'''


# ---------------- 도구 화면 ----------------
def list_panel(lang, wheel=False, ladder=False):
    """wheel=True면 돌림판의 '판에서 뺀 사람' 칸을 더한다. ladder=True면 확인 코드가 '사다리 확인 코드'(줄 순서·아래 칸 포함)다."""
    u = U(lang)
    sample = u['sample']
    count, code = sample_code(lang, ladder)
    # 저장된 명단은 첫 그림 전에 넣는다. 그 명단의 확인 코드는 화면 코드가 채우므로, 예시 명단의 코드는 비워 둔다(자리는 그대로)
    restore = ("<script>(function(){try{var v=localStorage.getItem('pick.list');if(v!==null){var t=document.getElementById('names');t.value=v;t.dataset.own='1';"
               "var n=document.getElementById('listnote');n.firstElementChild.textContent=n.dataset.saved;n.lastElementChild.textContent=n.dataset.clearall;"
               "document.getElementById('listcode').textContent=''}}catch(e){}})()</script>")
    fp = (f'<p class="list-fp" id="listfp" title="{esc(u["fpLadderTitle" if ladder else "fpListTitle"])}"><span>{u["fpLadder" if ladder else "fpList"]}</span> '
          f'<b class="num" id="listcode">{count} · {code}</b></p>')
    outbox = (f'<div class="outbox" id="outbox" hidden><p id="outtext" role="status"></p><div class="outbox-btns"><button type="button" class="btn btn-sm" id="outlast">{u["outLast"]}</button>'
              f'<button type="button" class="btn btn-sm" id="outall">{u["outAll"]}</button></div></div>\n    ') if wheel else ''
    return f'''<aside class="list" id="list">
    <div class="list-head"><h2><label for="names">{u['list']}</label></h2><span class="count num" id="count">{count}</span></div>
    <p class="list-note" id="listnote" data-saved="{esc(u['listSaved'])}" data-clear="{esc(u['listClear'])}" data-clearall="{esc(u['listClearAll'])}"><span>{u['listSample']}</span><button type="button" class="btn btn-sm" id="listalt" hidden></button><button type="button" class="btn btn-sm" id="listclear">{u['listClear']}</button></p>
    <p class="list-left" id="histleft" hidden><span>{u['histLeft']}</span><button type="button" class="btn btn-sm">{u['histLeftBtn']}</button></p>
    <textarea class="names" id="names" rows="8" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="{u['listAria']}" data-sample="{esc(sample)}">{esc(sample)}</textarea>
    {fp}
    {restore}
    {outbox}<div class="list-tools"><button type="button" class="btn btn-sm" id="shuffle">{u['shuffle']}</button><button type="button" class="btn btn-sm" id="sortaz">{u['sort']}</button><button type="button" class="btn btn-sm" id="dedupe">{u['dedupe']}</button></div>
    <p class="list-warn" id="listwarn" role="status"></p>
    <p class="note">{u['listHint']}</p>
  </aside>'''


def trust(lang, solo=False, ladder=False):
    """결과 곁의 근거 한 줄(쉬운 말) + 접어 둔 '자세히'(용어는 여기에). 명단을 쓰는 도구는 확인 코드가 무엇인지도 여기에 적는다."""
    u = U(lang)
    line = TU(lang)['trustSolo'] if solo else u['trustA']
    code = '' if solo else f'<p>{u["trustCodeLadder" if ladder else "trustCode"]}</p>'
    return (f'<div class="trust"><p><b>{u["trustQ"]}</b> {line}</p><details class="more trust-more"><summary>{u["trustMoreH"]}</summary>'
            f'<p>{u["trustMore"]} <a href="{prefix(lang)}about/">{u["trustLink"]}</a></p>{code}</details></div>')


def code_note(lang, ladder=False):
    """결과 곁의 확인 코드 자리. 결과가 나오면 화면 코드가 그 결과를 만든 명단의 코드로 바꾼다(자리가 미리 있어 화면이 밀리지 않는다)."""
    count, code = sample_code(lang, ladder)
    return f'<span class="note fp num" id="fp">{C["js"][lang]["fp"].replace("{count}", count).replace("{code}", code)}</span>'


def after_block(lang, note='copyNote', extra='', ladder=False):
    tu = TU(lang)
    fp = '' if note == 'copyNoteNoList' else code_note(lang, ladder)
    return (f'<div class="after" id="after" data-off>{extra}<button type="button" class="btn btn-sm" id="copy">{ICON_LINK}{tu["copy"]}</button>'
            f'<span class="note" id="copynote">{tu[note]}</span>{fp}</div><p class="toast" id="toast" role="status"></p>')


def stage_wheel(lang):
    u = U(lang)
    j = C['js'][lang]
    return f'''<div class="grid grid-wheel">
  <div class="stage-wheel"><div class="wheel" id="wheel"><div class="disc"><canvas width="16" height="16" role="img" aria-label="{esc(tool('wheel', lang)['nav'])}"></canvas></div>{NEEDLE}<button type="button" class="hub" id="go">{u['spin']}</button></div></div>
  <div class="result result-wheel" id="result">
    <div class="result-top">{trust(lang)}<div class="opts"><button type="button" class="btn btn-sm" id="sound" aria-pressed="true">{j['soundOn']}</button><button type="button" class="btn btn-sm" id="present" hidden>{j['present']}</button></div></div>
    <div class="result-main">
    <div class="result-mid" aria-live="polite"><p class="result-label"><span id="rlabel">{u['resultLabel']}</span><span class="stamp" id="stamp" hidden></span></p><p class="result-name wait" id="rname">{j['wait']}</p><p class="result-full" id="rfull" hidden></p></div>
    <div class="result-bot"><div class="after" id="after" data-off><button type="button" class="btn btn-sm" id="again">{u['again']}</button><button type="button" class="btn btn-sm" id="copy">{ICON_LINK}{u['copy']}</button><span class="notes"><span class="note">{u['copyNote']}</span>{code_note(lang)}</span></div><p class="toast" id="toast" role="status"></p>
    <div class="history" id="history" data-off><h2>{u['historyH']}</h2><ol></ol></div></div>
    </div>
  </div>
  {list_panel(lang, wheel=True)}
</div>'''


def stage_ladder(lang):
    tu = TU(lang)
    u = U(lang)
    return f'''<div class="grid grid-list">
  <div class="panel">
    <div class="controls-main">
      <button type="button" class="btn btn-go" id="go" data-again="{tu['ladderNew']}">{tu['ladderMake']}</button>
      <button type="button" class="btn" id="showall" hidden>{tu['ladderShow']}</button>
    </div>
    <details class="more"><summary>{tu['moreSettings']}</summary>
      <div class="controls">
        <label class="field" style="align-items:flex-start;flex-direction:column;gap:4px"><span>{tu['ladderBottom']}</span><textarea class="names" id="bottom" rows="3" style="min-height:88px;width:min(320px,80vw)" spellcheck="false" aria-label="{tu['ladderBottomAria']}">{esc(u['sampleBottom'])}</textarea><span class="note">{tu['ladderBottomHint']}</span></label>
        <div class="field"><span>{tu['ladderRows']}</span><span class="seg" id="rows" role="group" aria-label="{tu['ladderRows']}"><button type="button" data-v="8" aria-pressed="false">{tu['rowsFew']}</button><button type="button" data-v="14" aria-pressed="true">{tu['rowsNormal']}</button><button type="button" data-v="24" aria-pressed="false">{tu['rowsMany']}</button></span></div>
      </div>
    </details>
    <p class="msg" id="msg" role="alert"></p>
    <p class="list-warn warn" id="labwarn" role="status"></p>
    <div class="ladder-box" id="ladderbox"><div class="ladder-scroll" id="ladder" style="min-height:300px;display:grid;place-items:center"><p class="out-empty" style="padding:24px;text-align:center">{tu['ladderEmpty']}</p></div></div>
    <p class="note" id="tip" style="min-height:20px"></p>
    <div class="out" id="out" style="min-height:120px" aria-live="polite"></div>
    {after_block(lang, note='copyNoteLadder', ladder=True)}
    {trust(lang, ladder=True)}
  </div>
  {list_panel(lang, ladder=True)}
</div>'''


def stage_draw(lang):
    tu = TU(lang)
    j = C['js'][lang]
    return f'''<div class="grid grid-list">
  <div class="panel">
    <div class="seg" id="mode" role="group" aria-label="{esc(tool('draw', lang)['nav'])}" style="justify-self:start"><button type="button" data-v="pick" aria-pressed="true">{tu['modePick']}</button><button type="button" data-v="slips" aria-pressed="false">{tu['modeSlips']}</button><button type="button" data-v="order" aria-pressed="false">{tu['modeOrder']}</button></div>
    <div class="controls-main">
      <label class="field" id="fcount"><span id="lcount" data-pick="{tu['howMany']}" data-slips="{tu['winSlips']}">{tu['howMany']}</span><input type="number" id="m" min="1" value="1" inputmode="numeric"></label>
      <button type="button" class="btn btn-go" id="go">{tu['drawGo']}</button>
    </div>
    <details class="more" id="sliplabels" hidden><summary>{tu['slipLabels']}</summary>
      <div class="controls"><label class="field"><span>{tu['winLabel']}</span><input type="text" id="winlabel" value="{esc(j['win'])}" maxlength="20"></label><label class="field"><span>{tu['loseLabel']}</span><input type="text" id="loselabel" value="{esc(j['lose'])}" maxlength="20"></label></div>
    </details>
    <p class="msg" id="msg" role="alert"></p>
    <div class="out" id="out" aria-live="polite"><p class="out-empty">{tu['drawEmpty']}</p></div>
    {after_block(lang)}
    {trust(lang)}
  </div>
  {list_panel(lang)}
</div>'''


def stage_teams(lang):
    tu = TU(lang)
    j = C['js'][lang]
    extra = f'<button type="button" class="btn btn-sm" id="copytext">{j["copyText"]}</button>'
    return f'''<div class="grid grid-list">
  <div class="panel">
    <div class="controls-main">
      <span class="seg" id="mode" role="group" aria-label="{esc(tool('teams', lang)['nav'])}"><button type="button" data-v="teams" aria-pressed="true">{tu['byTeams']}</button><button type="button" data-v="size" aria-pressed="false">{tu['bySize']}</button></span>
      <label class="field"><span class="sr" id="lk">{tu['byTeams']}</span><input type="number" id="k" min="1" value="2" inputmode="numeric" aria-labelledby="lk"></label>
      <button type="button" class="btn btn-go" id="go">{tu['teamsGo']}</button>
    </div>
    <p class="msg" id="msg" role="alert"></p>
    <div class="out" id="out" aria-live="polite"><p class="out-empty">{tu['teamsEmpty']}</p></div>
    {after_block(lang, extra=extra)}
    {trust(lang)}
  </div>
  {list_panel(lang)}
</div>'''


def stage_number(lang):
    tu = TU(lang)
    if lang == 'ko':
        rng = (f'<label class="field"><input type="text" class="wide num" id="min" value="1" inputmode="numeric" aria-label="가장 작은 수"><span>{tu["to"]}</span></label>'
               f'<label class="field"><input type="text" class="wide num" id="max" value="100" inputmode="numeric" aria-label="가장 큰 수"><span>{tu["toAfter"]}</span></label>')
    else:
        rng = (f'<label class="field"><span>{tu["from"]}</span><input type="text" class="wide num" id="min" value="1" inputmode="numeric" aria-label="Lowest number"></label>'
               f'<label class="field"><span>{tu["to"]}</span><input type="text" class="wide num" id="max" value="100" inputmode="numeric" aria-label="Highest number"></label>')
    return f'''<div class="grid grid-solo">
  <div class="panel">
    <div class="controls-main" style="justify-content:center">{rng}
      <label class="field"><span>{tu['count']}</span><input type="number" id="count" min="1" max="10000" value="1" inputmode="numeric"></label>
    </div>
    <div class="controls" style="justify-content:center">
      <label class="check"><input type="checkbox" id="unique"><span>{tu['unique']}</span></label>
      <label class="field"><span>{tu['sortLabel']}</span><select id="sort"><option value="">{tu['sortNone']}</option><option value="asc">{tu['sortAsc']}</option><option value="desc">{tu['sortDesc']}</option></select></label>
    </div>
    <button type="button" class="btn btn-go" id="go">{tu['numGo']}</button>
    <p class="msg" id="msg" role="alert"></p>
    <div class="out" id="out" style="width:100%" aria-live="polite"><p class="out-empty">{tu['numEmpty']}</p></div>
    {after_block(lang, note='copyNoteNoList')}
    {trust(lang, solo=True)}
  </div>
</div>'''


def stage_coin(lang):
    tu = TU(lang)
    j = C['js'][lang]
    return f'''<div class="grid grid-solo">
  <div class="panel">
    <div class="coin-stage"><div class="coin wait" id="coin">{j['coinWait']}</div></div>
    <div class="controls-main" style="justify-content:center">
      <label class="field"><span>{tu['flips']}</span><input type="number" id="count" min="1" max="1000" value="1" inputmode="numeric"></label>
      <button type="button" class="btn btn-go" id="go">{tu['coinGo']}</button>
    </div>
    <p class="msg" id="msg" role="alert"></p>
    <div class="out" id="out" style="width:100%;min-height:110px" aria-live="polite"><p class="sum" id="sum"></p><div class="tally" id="tally" style="margin:8px auto 0"></div></div>
    {after_block(lang, note='copyNoteNoList')}
    {trust(lang, solo=True)}
  </div>
</div>'''


def stage_dice(lang):
    tu = TU(lang)
    opts = ''.join(f'<option value="{s}"{" selected" if s == 6 else ""}>{s}</option>' for s in (4, 6, 8, 10, 12, 20, 100))
    return f'''<div class="grid grid-solo">
  <div class="panel">
    <div class="controls-main" style="justify-content:center">
      <label class="field"><span>{tu['diceCount']}</span><input type="number" id="count" min="1" max="100" value="2" inputmode="numeric"></label>
      <label class="field"><span>{tu['diceSides']}</span><input type="number" id="sides" min="2" max="1000" value="6" inputmode="numeric" list="sideslist"><datalist id="sideslist">{opts}</datalist></label>
      <button type="button" class="btn btn-go" id="go">{tu['diceGo']}</button>
    </div>
    <p class="msg" id="msg" role="alert"></p>
    <div class="out" id="out" style="width:100%;min-height:190px" aria-live="polite"><p class="out-empty">{tu['diceEmpty']}</p></div>
    {after_block(lang, note='copyNoteNoList')}
    {trust(lang, solo=True)}
  </div>
</div>'''


STAGES = {'wheel': stage_wheel, 'ladder': stage_ladder, 'draw': stage_draw, 'teams': stage_teams, 'number': stage_number, 'coin': stage_coin, 'dice': stage_dice}


def guide_items(lang, limit=None):
    arts = ARTICLES[lang][:limit] if limit else ARTICLES[lang]
    p = prefix(lang)
    return ''.join(f'<li><a href="{p}guide/{a["slug"]}/">{esc(a["h1"])}</a><span>{esc(a["desc"])}</span></li>' for a in arts)


def tool_page(tid, lang):
    u = U(lang)
    t = tool(tid, lang)
    p = prefix(lang)
    path = t['path']
    alt = tool(tid, 'ko' if lang == 'en' else 'en')['path']
    about = ''.join(f'<h2>{esc(s["h"])}</h2>' + ''.join(f'<p>{esc(x)}</p>' for x in s['p']) for s in t['about'])
    faq = t.get('faq', [])
    faq_html = ''
    if faq:
        faq_html = f'<h2>{u["faq"]}</h2><div class="faq">' + ''.join(f'<details><summary>{esc(q["q"])}</summary><p>{esc(q["a"])}</p></details>' for q in faq) + '</div>'
    others = [x for x in (LIST_TOOLS if tid in LIST_TOOLS else TOOL_ORDER) if x != tid]
    if tid not in LIST_TOOLS:
        others = [x for x in TOOL_ORDER if x != tid]
    ways_h = u['waysH'] if tid in LIST_TOOLS else u['waysSoloH']
    ways = ''.join(f'<a href="{tool_href(x, lang)}"><b>{esc(tool(x, lang)["nav"])}</b><span>{esc(tool(x, lang)["way"])}</span></a>' for x in others)
    ld = [{
        '@context': 'https://schema.org', '@type': 'WebApplication', 'name': f'{t["h1"]} | {C["brand"][lang]}', 'url': url(lang, path),
        'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any', 'browserRequirements': 'Requires a modern web browser with JavaScript',
        'inLanguage': lang, 'isAccessibleForFree': True, 'description': t['desc'],
        'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' if lang == 'en' else 'KRW'},
        'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'},
    }]
    if faq:
        ld.append({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
            {'@type': 'Question', 'name': q['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': q['a']}} for q in faq]})
    solo = '' if tid in LIST_TOOLS else ' tool-solo'
    body = f'''<section class="tool wrap{solo}" id="tool" data-tool="{tid}">
<div class="tool-head"><h1>{esc(t['h1'])}</h1><p class="aka">{esc(t['aka'])}</p></div>
{STAGES[tid](lang)}
<details class="recent" id="recent"><summary>{u['recentH']}</summary><ul></ul><button type="button" class="btn btn-sm" id="recentclear">{u['recentClear']}</button></details>
</section>
<section class="prose wrap narrow">{about}{faq_html}</section>
{ad_slot(lang, 'mid')}
<section class="sec wrap narrow"><h2>{ways_h}</h2><div class="ways">{ways}</div></section>
<section class="sec wrap narrow"><h2>{u['guidesH']}</h2><ul class="guide-list">{guide_items(lang)}</ul></section>
{ad_slot(lang, 'bottom')}'''
    return page(lang, head(lang, t['title'], t['desc'], path, alt=alt, jsonld=ld), body, current=tid, alt_path=alt,
                script=f'/assets/tools/{tid}.js', tid=tid)


# ---------------- 글 ----------------
def pct(x, d=1):
    return f'{x * 100:.{d}f}%'


def sim_cell(n, rows):
    return next(c for c in SIM['cells'] if c['n'] == n and c['rows'] == rows)


def tokens(lang):
    """글에 넣는 숫자. 전부 시뮬레이션·정확한 계산 파일에서 나온다."""
    need = {r['n']: r for r in FX['ladder_need']}
    t = {}
    for n in (4, 8, 15, 30):
        t[f'fair{n}'] = pct(1 / n)
        for rows in (8, 14, 24, 48, 100, 400):
            t[f'stay{n}_{rows}'] = pct(sim_cell(n, rows)['edge']['stay'])
    c = sim_cell(8, 14)
    for i, v in enumerate(c['edgeDist']):
        t[f'd8_{i + 1}'] = pct(v)
        t[f'd8v_{i + 1}'] = f'{v * 100:.1f}'
    for i, v in enumerate(c['mixedDist']):
        t[f'm8_{i + 1}'] = pct(v)
        t[f'm8v_{i + 1}'] = f'{v * 100:.1f}'
    t['ratio8'] = f'{c["edgeDist"][0] / c["edgeDist"][7]:.0f}'
    t['rungs8_14'] = f'{c["rungsPerGap"]:.1f}'
    t['trials8_14'] = f'{c["trials"]:,}'
    for n in (4, 6, 8, 10, 15, 20, 30):
        t[f'need{n}'] = f'{need[n]["rows_tv5"]:,}'
        t[f'needrungs{n}'] = f'{need[n]["total_rungs_tv5"]:,}'
    t['mixmin8'] = pct(min(c['mixedDist']))
    t['mixmax8'] = pct(max(c['mixedDist']))
    # 표: 맨 끝 줄에서 출발해 바로 아래 칸에 도착한 비율. 공평할 때의 1.5배가 넘는 칸은 빨간 숫자(.hot)
    rows_html = []
    for n in (4, 8, 15, 30):
        cells = ''
        for rows in (8, 14, 24, 48, 100, 400):
            v = sim_cell(n, rows)['edge']['stay']
            cells += f'<td{" class=hot" if v > 1.5 / n else ""}>{pct(v)}</td>'.replace('class=hot', 'class="hot"')
        who = f'{n}명' if lang == 'ko' else str(n)
        rows_html.append(f'<tr><td>{who}</td><td>{pct(1 / n)}</td>{cells}</tr>')
    t['stay_rows'] = '\n'.join(rows_html)
    t['ladder_fig'] = ladder_figure(lang)
    # 글에 예로 드는 확인 코드 = 예시 명단의 코드(첫 화면에 보이는 것과 같다). tests/fixtures.json의 파이썬 값과도 같아야 한다
    count, code = sample_code(lang)
    assert code == FX['codes']['sample'][lang], (code, FX['codes']['sample'][lang])
    t['code_sample'] = f'{count} · {code}'
    t['code_ladder'] = '{} · {}'.format(*sample_code(lang, ladder=True))
    t['site'] = SITE
    t['p'] = prefix(lang)
    for tid in TOOL_ORDER:
        t[f'u_{tid}'] = tool_href(tid, lang)
    return t


def ladder_figure(lang):
    """글 속 사다리 그림 한 장(SVG). 길은 FIG_RUNGS를 위에서부터 따라가서 그린다."""
    n, levels = 4, len(FIG_RUNGS)
    names = ['가', '나', '다', '라'] if lang == 'ko' else ['A', 'B', 'C', 'D']
    bottoms = ['꽝', '꽝', '당첨', '꽝'] if lang == 'ko' else ['No luck', 'No luck', 'Winner', 'No luck']
    W, top, H, colw, pad = 360, 44, 180, 80, 60
    x = lambda c: pad + colw * c
    y = lambda r: top + H * (r + 1) / (levels + 1)
    parts = [f'<line class="fig-line" x1="{x(c)}" y1="{top}" x2="{x(c)}" y2="{top + H}"/>' for c in range(n)]
    for r, gaps in enumerate(FIG_RUNGS):
        for g in gaps:
            parts.append(f'<line class="fig-line" x1="{x(g)}" y1="{y(r):.1f}" x2="{x(g + 1)}" y2="{y(r):.1f}"/>')
    col = FIG_START
    d = f'M{x(col)} {top}'
    for r, gaps in enumerate(FIG_RUNGS):
        nxt = col + 1 if col in gaps else col - 1 if col - 1 in gaps else col
        if nxt != col:
            d += f' L{x(col)} {y(r):.1f} L{x(nxt)} {y(r):.1f}'
            col = nxt
    d += f' L{x(col)} {top + H}'
    parts.append(f'<path class="fig-path" d="{d}"/>')
    for c in range(n):
        parts.append(f'<text class="fig-t{" on" if c == FIG_START else ""}" x="{x(c)}" y="26">{names[c]}</text>')
        parts.append(f'<text class="fig-t{" on" if c == col else ""}" x="{x(c)}" y="{top + H + 26}">{bottoms[c]}</text>')
    if lang == 'ko':
        label = f'4명이 타는 6층 사다리 그림. 둘째 줄의 {names[FIG_START]}가 가로줄을 만날 때마다 건너서 {col + 1}번 칸({bottoms[col]})에 도착한다.'
        cap = f'가로줄을 만나면 반드시 건너요. {names[FIG_START]}는 {col + 1}번 칸에 도착했어요.'
    else:
        label = f'A ladder for four people with six levels. {names[FIG_START]}, on the second line, crosses every rung on the way down and ends at place {col + 1} ({bottoms[col]}).'
        cap = f'Every rung you meet must be crossed. {names[FIG_START]} ends at place {col + 1}.'
    return (f'<figure class="fig"><svg viewBox="0 0 {W} {top + H + 44}" role="img" aria-label="{esc(label)}">{"".join(parts)}</svg>'
            f'<figcaption>{cap}</figcaption></figure>')


def fill(body, lang):
    t = tokens(lang)

    def rep(m):
        k = m.group(1)
        if k not in t:
            sys.exit(f'모르는 숫자 자리: {{{{{k}}}}}')
        return t[k]
    return re.sub(r'\{\{([a-zA-Z0-9_]+)\}\}', rep, body)


def article_body(a, lang):
    raw = (DEV / 'articles' / f'{lang}-{a["slug"]}.html').read_text(encoding='utf-8')
    body = fill(raw, lang)

    def wrap(m):
        table = m.group(0)
        cols = len(re.findall(r'<th[ >]', table.split('</tr>')[0]))
        # 칸이 많은 표는 휴대폰에서 옆으로 밀고(밀 수 있다는 한 줄을 붙인다), 적은 표는 마지막 칸의 줄을 바꿔 폭 안에 넣는다
        if cols >= 5:
            return f'<div class="tbl-wrap wide"><div class="tbl">{table}</div><p class="tbl-hint">{U(lang)["tblHint"]}</p></div>'
        return f'<div class="tbl-wrap"><div class="tbl fit">{table}</div></div>'
    return re.sub(r'<table>.*?</table>', wrap, body, flags=re.S)


def pair_of(a, lang):
    other = 'ko' if lang == 'en' else 'en'
    if not a.get('pair'):
        return None
    return next((b for b in ARTICLES[other] if b['slug'] == a['pair']), None)


def article_page(a, lang):
    u = U(lang)
    p = prefix(lang)
    path = f'guide/{a["slug"]}/'
    b = pair_of(a, lang)
    alt = f'guide/{b["slug"]}/' if b else None
    day = UPDATED.get(prefix(lang) + path, MODIFIED)
    ld = [{'@context': 'https://schema.org', '@type': 'Article', 'headline': a['h1'], 'description': a['desc'], 'inLanguage': lang,
           'datePublished': a.get('published', PUBLISHED), 'dateModified': day, 'mainEntityOfPage': url(lang, path),
           'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'},
           'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}},
          {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
              {'@type': 'ListItem', 'position': 1, 'name': u['guides'], 'item': url(lang, 'guide/')},
              {'@type': 'ListItem', 'position': 2, 'name': a['h1'], 'item': url(lang, path)}]}]
    tool_id = a['tool']
    try_html = (f'<div class="try"><p>{u["tryIt"]}</p><a class="btn btn-go" href="{tool_href(tool_id, lang)}">{esc(tool(tool_id, lang)["h1"])}</a></div>')
    body = f'''<article class="article wrap narrow">
  <p class="crumb"><a href="{p}guide/">{u['guides']}</a></p>
  <h1>{esc(a['h1'])}</h1>
  <p class="meta">{u['updated']} <time datetime="{day}">{day}</time>, Lumen Lab</p>
  <div class="prose" style="padding-top:0">{article_body(a, lang)}</div>
  {try_html}
</article>
{ad_slot(lang, 'bottom')}'''
    return page(lang, head(lang, a['title'], a['desc'], path, alt=alt, jsonld=ld, og_type='article'), body,
                alt_path=alt if alt else 'guide/')


def guide_index(lang):
    u = U(lang)
    g = PAGES['guide'][lang]
    body = f'<section class="doc wrap narrow"><h1>{esc(g["h1"])}</h1><p class="meta">{esc(g["lead"])}</p><ul class="guide-list">{guide_items(lang)}</ul></section>'
    return page(lang, head(lang, g['title'], g['desc'], 'guide/', alt='guide/', ads=False), body, alt_path='guide/')


def doc_page(kind, lang):
    d = PAGES[kind][lang]
    inner = fill((DEV / 'pages' / f'{lang}-{kind}.html').read_text(encoding='utf-8'), lang)
    day = UPDATED.get(f'{prefix(lang)}{kind}/', MODIFIED)
    meta = f'<p class="meta">{U(lang)["updated"]} <time datetime="{day}">{day}</time></p>' if kind == 'about' else ''
    body = f'<article class="doc wrap narrow"><div class="prose" style="padding-top:0"><h1>{esc(d["h1"])}</h1>{meta}{inner}</div></article>'
    return page(lang, head(lang, d['title'], d['desc'], f'{kind}/', alt=f'{kind}/', ads=False), body, alt_path=f'{kind}/')


def not_found():
    """없는 주소. 파일은 하나라서 두 언어를 다 담고, 주소가 /ko/ 로 시작하면 한국어 칸만(아니면 영어 칸만) 남긴다.
    스크립트가 안 돌면 둘 다 보인다. 광고 코드 없음, noindex."""
    def block(lang):
        u = U(lang)
        links = ''.join(f'<a class="btn" href="{tool_href(t, lang)}">{esc(tool(t, lang)["nav"])}</a>' for t in TOOL_ORDER)
        return (f'<div class="nf-lang" lang="{lang}" data-nf="{lang}"><h1>{u["nfTitle"]}</h1><p>{u["nfText"]}</p>'
                f'<p class="nf-tools">{links}</p></div>')
    pick = ("<script>(function(){var ko=location.pathname.indexOf('/ko/')===0||location.pathname==='/ko';document.documentElement.lang=ko?'ko':'en';"
            "var n=document.querySelectorAll('[data-nf]');for(var i=0;i<n.length;i++)if((n[i].getAttribute('data-nf')==='ko')!==ko)n[i].hidden=true})()</script>")
    body = ('<section class="nf wrap narrow">' + LUMEN_WHEEL.replace('lumen-wheel', 'lumen-wheel nf-wheel') + block('en') + block('ko') + '</section>')
    logo = (f'<a class="logo" href="/" data-nf="en">{LOGO}<span>{C["brand"]["en"]}</span></a>'
            f'<a class="logo" href="/ko/" data-nf="ko" lang="ko">{LOGO}<span>{C["brand"]["ko"]}</span></a>')
    h_ = head('en', 'Page not found | Pickboard', 'This page doesn’t exist.', '', noindex=True, ads=False)
    return (f'{h_}\n<body>\n<header class="top">{logo}</header>\n'
            f'<main id="main">{body}</main>\n{pick}\n</body>\n</html>\n')


# ---------------- 화면에 나오는 글자(조각 글꼴에 담을 것) ----------------
ALWAYS = ''.join(chr(c) for c in range(0x20, 0x7f)) + '×…·–−’‘“”→'   # 아스키 전부 + 화면 코드가 넣는 기호
ALWAYS_KO = '오전오후'                                               # 최근 결과의 시각(ko-KR 날짜 꼴)


def screen_chars(files=None):
    """언어판마다 화면에 나올 수 있는 글자 모음: 만든 HTML의 글자·속성 글자 + 화면 코드가 넣는 글자(i18n). {'en': '…', 'ko': '…'}"""
    if files is None:
        files, _ = build()
    out = {'en': set(ALWAYS), 'ko': set(ALWAYS + ALWAYS_KO)}

    def walk(v):
        if isinstance(v, str):
            return v
        if isinstance(v, dict):
            return ' '.join(walk(x) for x in v.values())
        if isinstance(v, list):
            return ' '.join(walk(x) for x in v)
        return ''
    for rel, raw in files:
        if not rel.endswith('.html') or rel == '404.html':
            continue
        lang = 'ko' if rel.startswith('ko/') else 'en'
        m = re.search(r'<script type="application/json" id="i18n">(.*?)</script>', raw, flags=re.S)
        text = walk(json.loads(m.group(1).replace('<\\/', '</'))) if m else ''
        body = raw[raw.index('<body'):]
        body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', body, flags=re.S)
        text += ' ' + ' '.join(re.findall(r'(?:data-[a-z]+|value|aria-label|placeholder|title)="([^"]*)"', body))
        text += ' ' + re.sub(r'<[^>]+>', ' ', body)
        out[lang] |= set(html.unescape(text))
    return {k: ''.join(sorted(c for c in v if c >= ' ')) for k, v in out.items()}


# ---------------- 쓰기 ----------------
def write(rel, text):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    old = p.read_text(encoding='utf-8') if p.exists() else None
    if old != text:
        p.write_text(text, encoding='utf-8')


def sitemap(paths):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in paths:
        out.append(f'  <url><loc>{SITE}{path}</loc><lastmod>{UPDATED.get(path, MODIFIED)}</lastmod></url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


def rss():
    items = ''
    for a in ARTICLES['ko']:
        link = f'{SITE}/ko/guide/{a["slug"]}/'
        items += (f'<item><title>{esc(a["h1"])}</title><link>{link}</link><guid>{link}</guid>'
                  f'<pubDate>Fri, 09 Oct 2026 00:00:00 GMT</pubDate><description>{esc(a["desc"])}</description>'
                  f'<content:encoded><![CDATA[{article_body(a, "ko")}]]></content:encoded></item>\n')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>공평뽑기 가이드</title><link>{SITE}/ko/</link><description>돌림판, 사다리타기, 제비뽑기를 공평하게 쓰는 법</description><language>ko</language>
{items}</channel></rss>
'''


def build():
    """(경로, 내용) 목록과 sitemap 주소 목록을 돌려준다."""
    files = []
    paths = []
    for lang in LANGS:
        p = prefix(lang)
        base = p.lstrip('/')
        for tid in TOOL_ORDER:
            path = tool(tid, lang)['path']
            files.append((f'{base}{path}index.html', tool_page(tid, lang)))
            paths.append(p + path)
        files.append((f'{base}guide/index.html', guide_index(lang)))
        paths.append(f'{p}guide/')
        for a in ARTICLES[lang]:
            files.append((f'{base}guide/{a["slug"]}/index.html', article_page(a, lang)))
            paths.append(f'{p}guide/{a["slug"]}/')
        for kind in ('about', 'privacy'):
            files.append((f'{base}{kind}/index.html', doc_page(kind, lang)))
            paths.append(f'{p}{kind}/')
    files.append(('404.html', not_found()))
    files.append(('sitemap.xml', sitemap(paths)))
    files.append(('rss.xml', rss()))
    return files, paths


def main():
    files, paths = build()
    if '--check' in sys.argv:  # 빌드 결과가 최신인지(손으로 고쳤거나 다시 안 돌린 파일 찾기)
        stale = [rel for rel, text in files if not (ROOT / rel).exists() or (ROOT / rel).read_text(encoding='utf-8') != text]
        if stale:
            sys.exit('빌드 결과가 낡았어요: ' + ', '.join(stale))
        print(f'빌드 결과 최신: {len(files)}개 파일')
        return
    for rel, text in files:
        write(rel, text)
    print(f'built {len(paths)} pages')


if __name__ == '__main__':
    main()
