#!/usr/bin/env python3
"""토독(typing.lumenlab.page) 페이지 전부 만들기: python3 typing/_dev/build.py   (--check 는 낡았는지만 본다)

- 화면 글 = _dev/content.py, 가이드 글 = _dev/articles.py. 만든 HTML·sitemap.xml·rss.xml·404.html 은 손으로 고치지 않는다.
- 만드는 것: 영어 / (x-default), 한국어 /ko/ 의 도구(속도 측정·자리 연습·문장 연습·영타 연습), 가이드 목록과 글, 소개, 방침, 404.html, sitemap.xml, rss.xml(한국어 글).
- 배치는 도구마다 다르다: 속도 측정·영타 = A(종이 한 장), 자리 연습 = C(화면 자판), 문장 연습 = B(보고 치는 글 + 내가 친 글).
- lastmod 는 본문·구조화 데이터·링크가 실제로 바뀐 날만 적는다(UPDATED). 배치·CSS만 바뀐 페이지는 그대로 둔다.
"""
import sys
sys.dont_write_bytecode = True  # 폴더에 __pycache__ 를 남기지 않는다
import html
import json
import re
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
sys.path.insert(0, str(DEV))
import content as C  # noqa: E402
import articles as A  # noqa: E402

SITE = 'https://typing.lumenlab.page'
HOST = 'typing.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
FIRST = '2026-10-10'   # 처음 올린 날
UPDATED = {}           # 그 뒤 본문·구조화 데이터·링크가 바뀐 페이지: 주소 -> 날짜

JS, TX, NAV, PAIRS, TOOLS = C.JS, C.TX, C.NAV, C.PAIRS, C.TOOLS
esc = lambda s: html.escape(str(s), quote=True)

LOGO = ('<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><path class="lg-e" d="M3 20.5a4 4 0 0 0 4 3.5h12a4 4 0 0 0 4-3.5"/>'
        '<rect class="lg-k" x="2" y="2" width="22" height="20" rx="5"/><rect class="lg-u" x="8" y="14" width="10" height="3" rx="1.5"/></svg>')
# 첫 그림 전에: 동작 줄이기가 아니면 html.anim(연출 켬)
BOOT = "<script>(function(d){var h=d.documentElement;if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)&&'IntersectionObserver' in window)h.classList.add('anim')})(document)</script>"


def prefix(lang):
    return '/ko/' if lang == 'ko' else '/'


def url(lang, path=''):
    return SITE + prefix(lang) + path


def lastmod(full):
    return UPDATED.get(full, FIRST)


def alt_of(lang, path):
    """이 페이지와 같은 역할인 다른 언어판 경로(없으면 None)."""
    if lang == 'en':
        if path in PAIRS:
            return PAIRS[path]
    else:
        for en, ko in PAIRS.items():
            if ko == path:
                return en
    m = re.fullmatch(r'guide/([^/]+)/', path)
    if m:
        a = A.by_slug(lang, m.group(1))
        if a and a.get('pair'):
            return 'guide/' + a['pair'] + '/'
    return None


def head(lang, title, desc, path, jsonld=(), og_type='website', noindex=False, ads=True):
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
{'<meta name="robots" content="noindex">' + chr(10) if noindex else ''}<meta name="theme-color" content="#f4f4f6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121218" media="(prefers-color-scheme: dark)">
{chr(10).join(links)}
{og_meta}<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="/assets/pretendard.css">
<link rel="stylesheet" href="/assets/style.css">
{BOOT}
{ld}{ad}</head>'''


def header(lang, path, current=None):
    t = TX[lang]
    p = prefix(lang)
    other = 'en' if lang == 'ko' else 'ko'
    alt = alt_of(lang, path)
    other_href = prefix(other) + (alt if alt is not None else '')
    nav = ''.join(f'<a href="{p}{h}"{" aria-current=" + chr(34) + "page" + chr(34) if key == current else ""}>{esc(label)}</a>' for h, label, key in NAV[lang])
    return f'''<a class="skip" href="#main">{t['skip']}</a>
<header class="top wrap">
  <a class="logo" href="{p}">{LOGO}<span>{t['brand']}</span></a>
  <nav class="nav n{len(NAV[lang])}" aria-label="{t['nav_label']}">{nav}</nav>
  <a class="lang" href="{other_href}" lang="{other}" hreflang="{other}">{t['lang_other']}</a>
</header>'''


def footer(lang):
    t = TX[lang]
    p = prefix(lang)
    home = 'https://lumenlab.page/' + ('en/' if lang == 'en' else '')
    caps = ''.join(f'<span class="cap" style="--i:{i}">{ch}</span>' for i, ch in enumerate('LUMEN'))
    tools = ''.join(f'<a href="{p}{h}">{esc(label)}</a>' for h, label, key in NAV[lang])
    return f'''<footer class="foot"><div class="wrap">
  <a class="lumen" id="lumen" href="{home}"><span class="caps" aria-hidden="true">{caps}</span><span class="lumen-t"><b>{t['lumen']}</b><span>{t['lumen_s']}</span></span></a>
  <p class="foot-links">{tools}<a href="{p}about/">{t['about']}</a><a href="{p}privacy/">{t['privacy']}</a><a href="mailto:woxocoso@gmail.com">{t['contact']}</a></p>
  <small>© 2026 Lumen Lab</small>
</div></footer>'''


def ad_slot(lang, name, cls=''):
    """광고 자리. 폭은 본문 글 기둥과 같다. 단위 번호가 비어 있으면 화면에 없다(높이도 0). ?adpreview·localhost 에서는 빗금 상자."""
    return f'<div class="ad-wrap{" " + cls if cls else ""}" data-slot="{name}"><p class="ad-label">{TX[lang]["ad"]}</p><div class="ad-slot" data-ad="{name}" hidden></div></div>'


def cfg_script(cfg):
    return '<script type="application/json" id="tj-cfg">' + json.dumps(cfg, ensure_ascii=False).replace('</', '<\\/') + '</script>'


def site_cfg(lang, path):
    other = 'en' if lang == 'ko' else 'ko'
    alt = alt_of(lang, path)
    return {'lang': lang, 'other': prefix(other) + (alt if alt is not None else ''), 'otherLang': other, 'offer': TX[lang]['lang_offer'], 'bar': TX[lang]['lang_bar'], 'close': TX[lang]['close']}


def page(lang, head_html, body, path, current=None, cls='', scripts=(), cfg=None, main_cls=''):
    sc = ''.join(f'<script src="/assets/{s}.js"></script>\n' for s in scripts)
    site = '<script type="application/json" id="tj-site">' + json.dumps(site_cfg(lang, path), ensure_ascii=False) + '</script>'
    return f'''{head_html}
<body{' class="' + cls + '"' if cls else ''}>
{header(lang, path, current)}
<main id="main"{' class="' + main_cls + '"' if main_cls else ''}>
{body}
</main>
{footer(lang)}
{site}
{cfg_script(cfg) if cfg else ''}
{sc}<script src="/assets/site.js"></script>
</body>
</html>
'''


# ---------- 구조화 데이터 ----------
ORG = {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}


def app_ld(lang, tool):
    return {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': tool['app_name'], 'url': url(lang, tool['path']), 'description': tool['desc'],
            'applicationCategory': 'EducationalApplication', 'operatingSystem': 'Any', 'inLanguage': lang, 'isAccessibleForFree': True,
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' if lang == 'en' else 'KRW'}, 'publisher': ORG}


def faq_ld(faq):
    return {'@context': 'https://schema.org', '@type': 'FAQPage',
            'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}


def faq_html(lang, faq):
    items = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in faq)
    return f'<section class="sec faq" aria-labelledby="faq-h"><h2 id="faq-h">{TX[lang]["faq_h"]}</h2>{items}</section>'


# ---------- 도구 화면 조각 ----------
def seg(id_, label_id, items, pressed=None, off=False, cls=''):
    b = ''.join(f'<button type="button" data-v="{esc(v)}" aria-pressed="{"true" if v == pressed else "false"}">{esc(lab)}</button>' for v, lab in items)
    return f'<div class="seg{" " + cls if cls else ""}" role="group" aria-labelledby="{label_id}" id="{id_}"{" data-off" if off else ""}>{b}</div>'


def kbd_btn(id_, label, key, cls='btn'):
    return f'<button type="button" class="{cls}" id="{id_}">{esc(label)} <kbd>{key}</kbd></button>'


def trap(lang):
    return (f'<textarea class="trap" id="trap" aria-label="{TX[lang]["trap"]}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" '
            'inputmode="text" enterkeyhint="next" rows="1"></textarea>\n        <p class="hint" id="hint" role="status" hidden></p>')


def chart_fig(lang):
    t = TX[lang]
    return (f'<figure class="r-chart"><svg class="chart" id="chart" role="img" aria-label="{t["chart_aria"]}"></svg>'
            f'<figcaption><span>{t["chart_cap"]}</span><span class="lg"><i></i>{t["chart_err"]}</span></figcaption></figure>')


def map_fig():
    return '<figure class="r-map"><div class="kb" id="kb" aria-hidden="true"></div><figcaption id="map-cap"></figcaption></figure>'


def opts_a(lang, tool):
    t, s = TX[lang], JS[lang]
    kinds = [(k, s['kinds'][k]) for k in tool['kinds']]
    times = [(f't{n}', str(n)) for n in (15, 30, 60, 120)]
    sizes = [(f'c{n}', s['sizes'][str(n)]) for n in (25, 50, 100)]
    return f'''<div class="opts">
      <div class="opt"><span class="opt-l" id="l-kind">{t['kind_l']}</span>{seg('kind', 'l-kind', kinds, tool['kind'])}</div>
      <div class="opt len"><span class="opt-l" id="l-len">{s['lenTime']}</span>{seg('len-t', 'l-len', times, 't30')}{seg('len-c', 'l-len', sizes, 'c25', off=True)}</div>
      <details class="more" id="more"><summary>{t['more']}</summary>
        <div class="more-pop">
          <div class="more-row"><span id="l-mode">{t['mode_l']}</span>{seg('mode', 'l-mode', [('time', t['mode_time']), ('count', t['mode_count'])], 'time')}</div>
          <div class="more-row checks" id="words-only"><label><input type="checkbox" id="punct"> {t['punct']}</label><label><input type="checkbox" id="nums"> {t['nums']}</label></div>
          <p class="more-note">{t['keys_note']}</p>
        </div>
      </details>
    </div>'''


def result_left(lang, tool, extra=''):
    t = TX[lang]
    f2 = '<p class="r-formula num" id="r-formula2"></p>' if tool.get('both') else ''
    return f'''<div class="r-left">
          <p class="r-big"><b class="num" id="r-speed"></b><span id="r-unit"></span><span class="r-wpm num" id="r-wpm"></span></p>
          <p class="r-formula num" id="r-formula"></p>{f2}
          <p class="r-cmp" id="r-cmp" role="status"></p>
          <p class="r-acc"><span>{t['acc']}</span> <b class="num" id="r-acc"></b> <span class="num" id="r-accd"></span></p>
          <p class="r-skip" id="r-skip" hidden></p>
          {extra}<div class="r-act">{kbd_btn('again', t['again'], 'Enter', 'btn pri')}<button type="button" class="btn" id="same">{t['same']}</button></div>
          <div class="r-act2"><button type="button" class="lnk" id="drill">{t['drill']}</button><button type="button" class="lnk" id="share">{t['share']}</button><button type="button" class="lnk quit2" id="quit2">{t['quit2']}</button></div>
        </div>'''


def layout_a(lang, tool):
    """시안 A: 종이 한 장. 글 세 줄 + 숫자 줄. 결과는 같은 종이 안에서 바뀐다(높이 그대로)."""
    t, s = TX[lang], JS[lang]
    both = tool.get('both')
    unit = t['unit']
    ctx = f'<p class="r-ctx">{C.CTX[lang]}</p>' if tool['text'] == 'en' else ''
    wpm = '<div class="m"><b class="num" id="wpm">0</b><span>WPM</span></div>' if both else ''
    return f'''<div class="wrap main-a">
  <div class="a-head">
    <h1>{esc(tool['h1'])}</h1>
    {opts_a(lang, tool)}
  </div>
  <section class="sheet stage{' both' if both else ''}" aria-label="{esc(tool['h1'])}">
    <div class="bar" aria-hidden="true"><i id="bar"></i></div>
    <div class="playbox" id="playbox">
      <div class="play">
        <div class="playtop"><p class="start"><span class="pc">{t['start_pc']}</span><span class="mo">{t['start_mo']}</span></p><p class="daily" id="daily"></p></div>
        <div class="view"><div class="txt" id="txt" aria-hidden="true"></div></div>
        {trap(lang)}
      </div>
      <div class="meter">
        <div class="m main"><b class="num" id="speed">0</b><span>{unit}</span></div>
        {wpm}<div class="m"><b class="num" id="acc">–</b><span>{t['acc_pct']}</span></div>
        <div class="m"><b class="num" id="left">30</b><span id="left-l">{t['left']}</span></div>
        <div class="nk" aria-hidden="true"><span class="nk-l">{t['nextkey']}</span><span class="cap shift" id="nextshift" hidden>Shift</span><span class="cap" id="nextkey"></span></div>
        {kbd_btn('fresh', t['fresh'], 'Tab', 'btn sm')}
        <button type="button" class="btn sm quit" id="quit">{t['quit']}</button>
      </div>
    </div>
    <div class="result" id="result" hidden>
        {result_left(lang, tool)}
        <div class="r-right">
          {map_fig()}
          {chart_fig(lang)}
        </div>
        {ctx}
    </div>
    <canvas class="burst" id="burst" aria-hidden="true" hidden></canvas>
  </section>
  <p class="basis">{esc(tool['basis'])} <a href="#basis">{t['basis_h']}</a> <span class="safe">{esc(tool['safe'])}</span></p>
</div>'''


def layout_c(lang, tool):
    """시안 C: 위에 숫자 띠와 글 두 줄, 아래 절반은 화면 자판(다음 키·손가락 → 끝나면 틀린 키 지도)."""
    t, s = TX[lang], JS[lang]
    steps = ''.join(f'<button type="button" data-v="{i}" aria-pressed="{"true" if i == 0 else "false"}"><i>{i + 1}</i>{esc(n)}</button>' for i, n in enumerate(s['lessons']))
    return f'''<div class="wrap main-c">
  <div class="c-head">
    <h1>{esc(tool['h1'])}</h1>
    <div class="steps" role="group" aria-label="{t['steps_l']}" id="steps">{steps}</div>
  </div>
  <p class="step-say" id="step-say">{esc(s['lessonSay'][0])}</p>
  <section class="rig stage" aria-label="{esc(tool['h1'])}">
    <div class="strip">
      <div class="m main"><b class="num" id="speed">0</b><span>{t['unit']}</span></div>
      <div class="m"><b class="num" id="acc">–</b><span>{t['acc_pct']}</span></div>
      <div class="m"><b class="num" id="left">0</b><span id="left-l">{s['elapsed']}</span></div>
      <div class="c-bar" aria-hidden="true"><i id="bar"></i></div>
      {kbd_btn('fresh', t['fresh'], 'Tab', 'btn sm')}
      <button type="button" class="btn sm quit" id="quit">{t['quit']}</button>
    </div>
    <div class="band" id="playbox">
      <p class="start"><span class="pc">{t['start_pc']}</span><span class="mo">{t['start_mo']}</span></p>
      <div class="view"><div class="txt" id="txt" aria-hidden="true"></div></div>
      {trap(lang)}
    </div>
    <div class="band result" id="result" hidden>
      <div class="r-side">
        <p class="r-pass" id="r-pass" role="status"></p>
        <p class="r-formula num" id="r-formula"></p>
        <p class="r-acc"><span>{t['acc']}</span> <b class="num" id="r-acc"></b> <span class="num" id="r-accd"></span></p>
        <p class="r-cmp" id="r-cmp"></p>
        <p class="r-skip" id="r-skip" hidden></p>
      </div>
      <div class="r-act">{kbd_btn('again', s['againBtn'], 'Enter', 'btn pri')}<button type="button" class="btn" id="drill">{t['drill']}</button><button type="button" class="lnk quit2" id="quit2">{t['quit2']}</button></div>
    </div>
    <div class="kb-wrap" id="kb-wrap">
      <div class="kb-top">
        <p class="kb-say" id="kb-say"></p>
        <p class="kb-legend" id="kb-legend" hidden><span id="map-cap"></span></p>
        <button type="button" class="btn sm" id="kb-toggle" aria-pressed="false">{t['kb_hide']}</button>
      </div>
      <div class="kb big" id="kb" aria-hidden="true"></div>
      <p class="mo-kb">{t['mo_kb']}</p>
    </div>
    <canvas class="burst" id="burst" aria-hidden="true" hidden></canvas>
  </section>
  <p class="basis">{esc(tool['basis'])} <span class="safe">{esc(tool['safe'])}</span></p>
</div>'''


def layout_b(lang, tool):
    """시안 B: 보고 치는 글 + 내가 친 글 두 줄(앞뒤 줄은 작게), 옆에 계기판."""
    t, s = TX[lang], JS[lang]
    topics = [(k, s['kinds'][k]) for k in tool['topics']]
    counts = ''.join(f'<option value="{n}"{" selected" if n == tool["count"] else ""}>{esc(s["lenSent"].replace("{n}", str(n)))}</option>' for n in tool['counts'])
    return f'''<div class="wrap main-b">
  <div class="b-head">
    <h1>{esc(tool['h1'])}</h1>
    <div class="opts">
      <div class="opt"><span class="opt-l" id="l-topic">{t['topic_l']}</span>{seg('topic', 'l-topic', topics, tool['topics'][0])}</div>
      <label class="opt sel"><span class="opt-l">{t['count_l']}</span><select id="count">{counts}</select></label>
    </div>
  </div>
  <div class="b-grid">
    <section class="desk stage" aria-label="{esc(tool['h1'])}">
      <div class="stack" id="playbox">
        <p class="ln prev first" id="prev" aria-hidden="true"></p>
        <div class="now">
          <p class="tag">{t['look']}</p>
          <div class="txt" id="txt" aria-hidden="true"></div>
          <p class="tag mine-tag">{t['mine']}</p>
          <div class="mine" aria-hidden="true"><span id="mine-t"></span><i class="caret"></i><span class="ph"><span class="pc">{t['start_pc']}</span><span class="mo">{t['start_mo']}</span></span></div>
          {trap(lang)}
        </div>
        <p class="ln next" id="next1" aria-hidden="true"></p>
        <p class="ln next n2" id="next2" aria-hidden="true"></p>
      </div>
      <div class="result" id="result" hidden>
        <div class="r-side">
          <p class="r-formula num" id="r-formula"></p>
          <p class="r-acc"><span>{t['acc']}</span> <b class="num" id="r-acc"></b> <span class="num" id="r-accd"></span></p>
          <p class="r-cmp" id="r-cmp" role="status"></p>
          <p class="r-skip" id="r-skip" hidden></p>
          <div class="r-act">{kbd_btn('again', t['again'], 'Enter', 'btn pri')}<button type="button" class="btn" id="same">{t['same']}</button></div>
          <div class="r-act2"><button type="button" class="lnk" id="drill">{t['drill']}</button><button type="button" class="lnk quit2" id="quit2">{t['quit2']}</button></div>
        </div>
        <div class="r-right">
          {map_fig()}
          {chart_fig(lang)}
        </div>
      </div>
      <canvas class="burst" id="burst" aria-hidden="true" hidden></canvas>
    </section>
    <aside class="gauge" aria-label="{s['speedNow']}">
      <div class="g-main"><p class="g-label" id="g-label">{s['speedNow']}</p><p class="g-big"><b class="num" id="speed">0</b><span>{t['unit']}</span></p></div>
      <div class="spark" id="spark" aria-hidden="true"></div>
      <dl class="g-facts">
        <div><dt>{t['acc']}</dt><dd class="num"><span id="acc">–</span><small>%</small></dd></div>
        <div><dt id="left-l">{s['progress']}</dt><dd class="num"><span id="left">1/{tool['count']}</span></dd></div>
      </dl>
      <div class="g-bar" aria-hidden="true"><i id="bar"></i></div>
      <div class="g-act">{kbd_btn('fresh', t['fresh'], 'Tab', 'btn sm')}<button type="button" class="btn sm quit" id="quit">{t['quit']}</button></div>
    </aside>
  </div>
  <p class="basis">{esc(tool['basis'])} <span class="safe">{esc(tool['safe'])}</span></p>
</div>'''


def records_html(lang):
    t, s = TX[lang], JS[lang]
    return f'''<section class="wrap records" aria-labelledby="rec-h">
  <div class="rec-head"><h2 id="rec-h">{t['rec_h']}</h2><p class="rec-note">{t['rec_note']}</p><p class="rec-best num" id="rec-best"></p><button type="button" class="lnk" id="rec-clear" hidden>{s['clearBtn']}</button></div>
  <div class="rec-grid">
    <div class="rec-col"><ol class="rec-list" id="rec-list" hidden></ol><p class="rec-empty" id="rec-empty">{t['rec_empty']}</p></div>
    <div class="rec-col keys"><h3>{t['rec_keys_h']}</h3><div class="rec-keys" id="rec-keys" hidden></div><p class="rec-empty" id="rec-keys-empty">{t['rec_keys_empty']}</p><button type="button" class="btn sm" id="rec-drill" hidden>{t['rec_drill']}</button></div>
  </div>
  <p class="sr" id="rec-say" role="status"></p>
</section>'''


def basis_html(lang, tool):
    rows = list(C.BASIS[tool['text']] if lang == tool['text'] else C.BASIS[lang])
    if tool['tool'] == 'english':
        rows = C.BASIS_ENGLISH + [r for r in rows if r[0] not in ('타수(타/분)', '한글은 키 흐름으로 비교', '휴대폰 자판')]
    items = ''.join(f'<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in rows)
    return f'<section class="sec basis-sec" id="basis" aria-labelledby="basis-h"><h2 id="basis-h">{TX[lang]["basis_h"]}</h2><dl class="defs">{items}</dl></section>'


def guides_block(lang, limit=4, skip=None):
    t = TX[lang]
    p = prefix(lang)
    arts = [a for a in A.ARTICLES[lang] if a['slug'] != skip][:limit]
    if not arts:
        return ''
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/"><b>{esc(a["h1"])}</b><span>{esc(a["tag"])}</span></a></li>' for a in arts)
    return f'<section class="sec" aria-labelledby="guides-h"><h2 id="guides-h">{t["guides_h"]}</h2><ul class="guides">{items}</ul><p class="more-link"><a href="{p}guide/">{t["guides_all"]}</a></p></section>'


TOOL_LINE = {
    ('ko', 'test'): ('타자 속도 측정', '15초부터 120초까지 타수와 정확도 재기'),
    ('ko', 'practice'): ('타자 자리 연습', '두벌식 기본 자리부터 다섯 단계'),
    ('ko', 'sentences'): ('타자 문장 연습', '시간 제한 없이 한 문장씩'),
    ('ko', 'english'): ('영타 연습', '영어 타자를 타수와 WPM으로'),
    ('en', 'test'): ('Typing Test', 'WPM and accuracy in 15 to 120 seconds'),
    ('en', 'practice'): ('Typing Practice', 'Five steps from the home row up'),
}


def tools_block(lang, current):
    p = prefix(lang)
    items = ''
    for h, _, key in NAV[lang]:
        if key in ('guide', current):
            continue
        name, line = TOOL_LINE[(lang, key)]
        items += f'<li><a href="{p}{h}"><b>{esc(name)}</b><span>{esc(line)}</span></a></li>'
    return f'<section class="sec" aria-labelledby="tools-h"><h2 id="tools-h">{TX[lang]["tools_h"]}</h2><ul class="guides">{items}</ul></section>'


def explain_html(lang, key):
    out = ''
    for h, body in C.EXPLAIN.get((lang, key), []):
        out += f'<section class="sec prose"><h2>{esc(h)}</h2>{body}</section>'
    return out


def tool_page(lang, key):
    tool = TOOLS[(lang, key)]
    s = JS[lang]
    body = {'a': layout_a, 'b': layout_b, 'c': layout_c}[tool['layout']](lang, tool)
    faq = C.FAQ.get((lang, key), [])
    below = f'''{records_html(lang)}
<div class="wrap below">
{explain_html(lang, key)}
{basis_html(lang, tool)}
{ad_slot(lang, 'mid')}
{faq_html(lang, faq) if faq else ''}
{tools_block(lang, key)}
{guides_block(lang)}
{ad_slot(lang, 'bottom')}
</div>'''
    cfg = {'ui': lang, 'text': tool['text'], 'tool': tool['tool'], 'page': lang + '/' + tool['tool'], 'layout': tool['layout'], 'lines': tool['layout'] == 'b',
           'kinds': tool.get('kinds'), 'kind': tool.get('kind'), 'times': [15, 30, 60, 120], 'secs': 30,
           'counts': tool.get('counts', [25, 50, 100]), 'count': tool.get('count', 25), 'topics': tool.get('topics'), 'both': bool(tool.get('both')),
           'host': HOST, 'S': s}
    ld = [app_ld(lang, tool)] + ([faq_ld(faq)] if faq else [])
    scripts = ['tj-core', 'tj-text-' + tool['text'], 'tj-store'] + (['tj-lessons'] if tool['tool'] == 'practice' else []) + ['app']
    h = head(lang, tool['title'], tool['desc'], tool['path'], jsonld=ld)
    return tool['path'], page(lang, h, body + '\n' + below, tool['path'], current=key, cls='tool t-' + tool['layout'], scripts=scripts, cfg=cfg)


# ---------- 글·소개·방침 ----------
def fmt_date(lang, iso):
    y, m, d = (int(x) for x in iso.split('-'))
    if lang == 'ko':
        return f'{y}년 {m}월 {d}일'
    return f'{["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1]} {d}, {y}'


def tbl(table_html, lang, wide=False):
    """표는 감싼 칸 안에. 넓은 표는 휴대폰에서 옆으로 밀고, 민다는 표시를 둔다."""
    hint = f'<p class="tbl-hint">{TX[lang]["swipe"]}</p>' if wide else ''
    return f'<div class="tbl{" wide" if wide else ""}">{table_html}</div>{hint}'


def expand(body, lang):
    """글 속 표를 감싼다. <table class="wide"> 는 휴대폰에서 옆으로 미는 넓은 표."""
    return re.sub(r'<table( class="wide")?((?: data-[a-z]+="[^"]*")*)>(.*?)</table>',
                  lambda m: tbl('<table' + m.group(2) + '>' + m.group(3) + '</table>', lang, bool(m.group(1))), body, flags=re.S)


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
    mod = lastmod(prefix(lang) + path)
    body = expand(a['body'], lang)
    parts = body.split('<!--ad-->')
    body = (parts[0] + ad_slot(lang, 'mid', 'in-prose') + ''.join(parts[1:])) if len(parts) > 1 else body
    cta_href, cta_label = a.get('cta', ('', t['try']))
    ld = {'@context': 'https://schema.org', '@type': 'Article', 'headline': a['h1'], 'description': a['desc'], 'inLanguage': lang,
          'datePublished': a.get('published', FIRST), 'dateModified': mod, 'mainEntityOfPage': url(lang, path),
          'image': SITE + ('/og-ko.png' if lang == 'ko' else '/og.png'), 'author': ORG, 'publisher': ORG}
    html_ = f'''<article class="wrap narrow prose">
  {crumb_html}
  <h1>{esc(a['h1'])}</h1>
  <p class="meta">{t['checked']} <time datetime="{mod}">{fmt_date(lang, mod)}</time></p>
  <p class="lead">{a['answer']}</p>
  {body}
  <p class="cta"><a class="btn pri" href="{p}{cta_href}">{esc(cta_label)}</a></p>
</article>
<div class="wrap narrow">
{guides_block(lang, limit=3, skip=a['slug'])}
{ad_slot(lang, 'bottom')}
</div>'''
    h = head(lang, a['title'], a['desc'], path, jsonld=[ld, crumb_ld], og_type='article')
    return path, page(lang, h, html_, path, current='guide', cls='doc')


def guide_index(lang):
    g = C.GUIDE_INDEX[lang]
    p = prefix(lang)
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/"><b>{esc(a["h1"])}</b><span>{esc(a["desc"])}</span></a></li>' for a in A.ARTICLES[lang])
    body = f'''<div class="wrap narrow prose">
  <h1>{esc(g['h1'])}</h1>
  <p class="lead">{esc(g['lead'])}</p>
  <ul class="guides long">{items}</ul>
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
    te, tk = TX['en'], TX['ko']
    caps = ''.join(f'<span class="cap">{ch}</span>' for ch in '404')
    body = f'''<div class="wrap narrow nf">
  <p class="nf-keys" aria-hidden="true">{caps}</p>
  <h1>{te['nf_title']} · <span lang="ko">{tk['nf_title']}</span></h1>
  <p><a class="btn pri" href="/">{te['home']}</a> <a class="btn" href="/ko/" lang="ko">{tk['home']}</a></p>
</div>'''
    h = head('en', 'Page not found | Todok', 'This page does not exist.', '', noindex=True, ads=False)
    return page('en', h, body, '__404__', cls='doc')


def sitemap(paths):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in paths:
        out.append(f'  <url><loc>{SITE}{path}</loc><lastmod>{lastmod(path)}</lastmod></url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


def rss():
    items = ''
    for a in A.ARTICLES['ko']:
        link_ = f'{SITE}/ko/guide/{a["slug"]}/'
        full = f'<p>{a["answer"]}</p>' + expand(a['body'], 'ko').replace('<!--ad-->', '')
        y, mo, d = (int(x) for x in a.get('published', FIRST).split('-'))
        pub = format_datetime(datetime(y, mo, d, tzinfo=timezone.utc), usegmt=True)
        items += (f'<item><title>{esc(a["h1"])}</title><link>{link_}</link><guid>{link_}</guid>'
                  f'<pubDate>{pub}</pubDate><description>{esc(a["desc"])}</description>'
                  f'<content:encoded><![CDATA[{full}]]></content:encoded></item>\n')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>토독 타자 연습 가이드</title><link>{SITE}/ko/guide/</link><description>타수 계산, 자리 익히기, 한글 조합 입력</description><language>ko</language>
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
        for _, _, key in NAV[lang]:
            if (lang, key) in TOOLS:
                add(lang, *tool_page(lang, key))
        add(lang, *guide_index(lang))
        for a in A.ARTICLES[lang]:
            add(lang, *article_page(lang, a))
        for key in ('about', 'privacy'):
            add(lang, *doc_page(lang, key))
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
        if check:
            if not f.exists() or f.read_text(encoding='utf-8') != text:
                stale.append(rel)
            continue
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(text, encoding='utf-8')
    if check:
        if stale:
            print('빌드 결과가 낡았어요(python3 _dev/build.py 를 다시 돌리세요):', ', '.join(stale))
            sys.exit(1)
        print(f'빌드 결과 최신({len(out)}개 파일)')
        return
    print(f'built {len(paths)} pages + 404, sitemap, rss')


if __name__ == '__main__':
    main()
