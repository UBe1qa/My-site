#!/usr/bin/env python3
"""토독(typing.lumenlab.page) 페이지 전부 만들기: python3 typing/_dev/build.py   (--check 는 낡았는지만 본다)

- 화면 글 = _dev/content.py, 가이드 글 = _dev/articles.py. 만든 HTML·sitemap.xml·rss.xml·404.html 은 손으로 고치지 않는다.
- 만드는 것: 영어 / (x-default), 한국어 /ko/ 의 도구(속도 측정·자리 연습·문장 연습·영타 연습), 가이드 목록과 글, 소개, 방침, 404.html, sitemap.xml, rss.xml(한국어 글).
- 배치는 도구마다 다르다: 속도 측정·영타 = A(종이 한 장), 자리 연습 = C(화면 자판), 문장 연습 = B(보고 치는 글 + 내가 친 글).
- lastmod 는 본문·구조화 데이터·링크가 실제로 바뀐 날만 적는다(UPDATED). 배치·CSS만 바뀐 페이지는 그대로 둔다.
- 글꼴: _dev/fonts.json(= _dev/font.py 가 만든 조각 글꼴의 파일 이름과 담은 글자)이 있으면 <head> 에 preload 와 @font-face(Todok Sans)를 넣는다.
  글이나 연습 글을 고쳐 조각에 없는 글자가 생기면 check.py 가 알려 준다 → font.py 를 다시 돌린다(안 돌려도 그 글자는 jsDelivr 에서 받아 보인다).
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
# 그 뒤 본문·구조화 데이터·링크가 바뀐 페이지: 주소 -> 날짜
UPDATED = {p: '2026-10-11' for p in (  # 콤보·이펙트 설정이 생기고(도구 화면 글·계산 기준), 방침의 저장 항목 설명이 바뀜
    '/', '/practice/', '/privacy/', '/ko/', '/ko/practice/', '/ko/sentences/', '/ko/english/', '/ko/privacy/')}

JS, TX, NAV, PAIRS, TOOLS = C.JS, C.TX, C.NAV, C.PAIRS, C.TOOLS
FONTS = json.loads((DEV / 'fonts.json').read_text(encoding='utf-8')) if (DEV / 'fonts.json').exists() else {}
NUMF = json.loads((DEV / 'fonts-num.json').read_text(encoding='utf-8')) if (DEV / 'fonts-num.json').exists() else None  # 숫자·키 글자용 조각(_dev/font_num.py)


def asset(name):
    """/assets/ 파일 주소 뒤에 내용 지문을 붙인다(?v=). 파일이 바뀌면 주소가 바뀌므로 브라우저가 오래 저장해 두고 다시 쓸 수 있다(_headers)."""
    import hashlib
    data = (ROOT / 'assets' / name).read_bytes()
    return f'/assets/{name}?v={hashlib.sha256(data).hexdigest()[:8]}'
esc = lambda s: html.escape(str(s), quote=True)

LOGO = ('<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><path class="lg-e" d="M3 20.5a4 4 0 0 0 4 3.5h12a4 4 0 0 0 4-3.5"/>'
        '<rect class="lg-k" x="2" y="2" width="22" height="20" rx="5"/><rect class="lg-u" x="8" y="14" width="10" height="3" rx="1.5"/></svg>')
# 첫 그림 전에: 동작 줄이기가 아니면 html.anim(연출 켬)
# + 화면(밝게/어둡게): 기본은 밝게. '설정 → 화면'에서 어둡게를 고른 사람만 어둡게(todok.set 의 fx.t). 기기의 어두운 모드는 따르지 않는다
BOOT = ("<script>(function(d){var h=d.documentElement;if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)&&'IntersectionObserver' in window)h.classList.add('anim');"
        "try{var s=JSON.parse(localStorage.getItem('todok.set')||'{}');if(s&&s.fx&&s.fx.t==='dark'){h.setAttribute('data-theme','dark');var m=d.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content','#15121f')}}catch(e){}"
        "})(document)</script>")


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
    ad = (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADS_CLIENT}" crossorigin="anonymous"></script>\n'
          f'<script src="{asset("ads-config.js")}"></script>\n') if ads else ''
    og = 'og-ko.png' if lang == 'ko' else 'og.png'
    # 화면 글자만 담은 글꼴 조각(같은 주소). optional 이라 늦게 오면 이번 방문에는 기기 글꼴 그대로 둔다(치는 글의 줄 수가 바뀌지 않게)
    fnt = FONTS.get(lang)
    font = (f'<link rel="preload" href="/assets/fonts/{fnt["file"]}" as="font" type="font/woff2" crossorigin>\n'
            f'<style>@font-face{{font-family:"Todok Sans";src:url(/assets/fonts/{fnt["file"]}) format("woff2");font-weight:400 800;font-style:normal;font-display:optional}}</style>\n') if fnt else ''
    # 숫자·키 글자용 조각(Rubik 700 의 숫자·영문·기호만, 10KB 안쪽). 늦게 오면 이번 방문에는 본문 글꼴로 둔다(숫자 칸은 크기가 고정이라 밀리지 않는다)
    if NUMF:
        font += (f'<link rel="preload" href="/assets/fonts/{NUMF["file"]}" as="font" type="font/woff2" crossorigin>\n'
                 f'<style>@font-face{{font-family:"Todok Num";src:url(/assets/fonts/{NUMF["file"]}) format("woff2");font-weight:700;font-style:normal;font-display:optional}}</style>\n')
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
{'<meta name="robots" content="noindex">' + chr(10) if noindex else ''}<meta name="theme-color" content="#f3f1f7">
{chr(10).join(links)}
{og_meta}<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
{font if font else '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>' + chr(10)}<link rel="stylesheet" href="{asset('pretendard.css')}">
<link rel="stylesheet" href="{asset('style.css')}">
{BOOT}
{extra}{ld}{ad}</head>'''


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


def footer(lang, lumen_id=True):
    t = TX[lang]
    p = prefix(lang)
    home = 'https://lumenlab.page/' + ('en/' if lang == 'en' else '')
    caps = ''.join(f'<span class="cap" style="--i:{i}">{ch}</span>' for i, ch in enumerate('LUMEN'))
    tools = ''.join(f'<a href="{p}{h}">{esc(label)}</a>' for h, label, key in NAV[lang])
    return f'''<footer class="foot"><div class="wrap">
  <a class="lumen"{' id="lumen"' if lumen_id else ''} href="{home}"><span class="caps" aria-hidden="true">{caps}</span><span class="lumen-t"><b>{t['lumen']}</b><span>{t['lumen_s']}</span></span></a>
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
    sc = ''.join(f'<script src="{asset(s + ".js")}"></script>\n' for s in scripts)
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
{sc}<script src="{asset('site.js')}"></script>
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


def hk(id_, val, label, cls='', label_id='', key_id='', tip='', short=''):
    """숫자 줄의 키캡 하나(상징 '키'). 바깥(.hk) = 키의 옆면(자리 고정), 안(.hk-f) = 윗면(눌릴 때 transform 만 바뀐다).
    숫자 칸은 크기가 고정이라 값이 바뀌어도 둘레의 배치가 다시 계산되지 않는다."""
    lid = f' id="{label_id}"' if label_id else ''
    kid = f' id="{key_id}"' if key_id else ''
    tt = f' title="{esc(tip)}"' if tip else ''
    # short = 좁은 휴대폰(430px 아래)에서 대신 보이는 짧은 이름(칸 밖으로 넘치지 않게). 화면 읽기 프로그램은 긴 이름을 읽는다
    sh = f'<span class="l-s" aria-hidden="true">{short}</span>' if short else ''
    return f'<div class="m hk{" " + cls if cls else ""}{" has-s" if short else ""}"{kid}{tt}><div class="hk-f"><b class="num" id="{id_}">{val}</b><span{lid}>{label}</span>{sh}</div></div>'


def fx_rows(lang):
    """설정 팝업 안의 이펙트 세기·키 소리 고르기. 고른 값은 todok.set 에 남는다. '동작 줄이기'가 켜진 기기에서는 이펙트 줄이 꺼진다(app.js)."""
    t, s = TX[lang], JS[lang]
    return (f'<div class="more-row"><span id="l-fx">{t["fx_l"]}</span>{seg("fx-seg", "l-fx", [(str(i), s["fxLevels"][i]) for i in (0, 1, 2)], "2")}</div>'
            f'<div class="more-row"><span id="l-snd">{t["snd_l"]}</span>{seg("snd-seg", "l-snd", [("0", s["sndOff"]), ("1", s["sndOn"])], "1")}</div>'
            f'<div class="more-row"><span id="l-theme">{t["theme_l"]}</span>{seg("theme-seg", "l-theme", [("light", s["themes"][0]), ("dark", s["themes"][1])], "light")}</div>')


def more_only(lang):
    """고르기 줄에 '설정'이 따로 없는 화면(자리 연습·문장 연습)의 설정 팝업: 이펙트와 키 소리만."""
    t = TX[lang]
    return f'<details class="more" id="more"><summary>{t["more"]}</summary><div class="more-pop">{fx_rows(lang)}<p class="more-note">{t["keys_note"]}</p></div></details>'


def under(lang, basis_html):
    """도구 바로 아래 줄: 계산 기준 한 줄 + (느린 기기라서 이펙트를 스스로 줄였을 때의 알림)"""
    return f'<div class="under"><p class="basis">{basis_html}</p><p class="fx-say" id="fx-say" role="status"></p></div>'


FX_LAYER = '<div class="fx" id="fx" aria-hidden="true"></div>'


def badges():
    return '<p class="r-badges" id="r-badges"></p>'


def trap(lang):
    """보이지 않는 입력칸. 그림으로 그린 글자 줄(#txt)은 화면 읽기 프로그램에 숨기고, 같은 글을 #txt-sr 문단으로 읽게 한다(app.js 가 채운다).
    치는 칸에서 Tab 은 '다른 글'이라, 빠져나오는 법(Esc)을 설명으로 붙인다."""
    t = TX[lang]
    return (f'<p class="sr" id="txt-sr"></p>\n        '
            f'<textarea class="trap" id="trap" aria-label="{t["trap"]}" aria-describedby="trap-help" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" '
            'inputmode="text" enterkeyhint="next" rows="1"></textarea>\n        '
            f'<p class="sr" id="trap-help">{t["trap_help"]}</p>\n        <p class="hint" id="hint" role="status" hidden></p>')


def start_spans(lang):
    """시작 안내: 치는 칸에 초점이 있을 때 / 초점이 나가 있을 때(Esc·다른 곳을 누른 뒤) / 휴대폰"""
    t = TX[lang]
    return f'<span class="pc on">{t["start_pc"]}</span><span class="pc off">{t["start_off"]}</span><span class="mo">{t["start_mo"]}</span>'


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
          {fx_rows(lang)}
          <p class="more-note">{t['keys_note']}</p>
        </div>
      </details>
    </div>'''


def result_left(lang, tool, extra=''):
    t = TX[lang]
    f2 = '<p class="r-formula num" id="r-formula2"></p>' if tool.get('both') else ''
    return f'''<div class="r-left">
          <p class="r-big"><b class="num" id="r-speed"></b><span id="r-unit"></span><span class="r-wpm num" id="r-wpm"></span></p>
          {badges()}
          <p class="r-formula num" id="r-formula"></p>{f2}
          <p class="r-cmp" id="r-cmp" role="status"></p>
          <p class="r-acc"><span>{t['acc']}</span> <b class="num" id="r-acc"></b> <span class="num" id="r-accd"></span></p>
          <p class="r-raw num" id="r-raw"></p>
          <p class="r-skip" id="r-skip" hidden></p>
          {extra}
        </div>'''


def result_plate(lang):
    """결과 화면 아래의 판: 다시 하기 단추들이 키캡으로 놓인다(치는 화면의 숫자 줄과 같은 자리)."""
    t = TX[lang]
    return (f'<div class="r-plate hud">{kbd_btn('again', t['again'], 'Enter', 'btn pri')}<button type="button" class="btn" id="same">{t['same']}</button>'
            f'<span class="r-links"><button type="button" class="btn flat" id="drill">{t['drill']}</button><button type="button" class="btn flat" id="share">{t['share']}</button>'
            f'<button type="button" class="btn flat quit2" id="quit2">{t['quit2']}</button></span></div>')


def layout_a(lang, tool):
    """시안 A: 종이 한 장. 글 세 줄 + 숫자 줄. 결과는 같은 종이 안에서 바뀐다(높이 그대로)."""
    t, s = TX[lang], JS[lang]
    both = tool.get('both')
    unit = t['unit']
    ctx = f'<p class="r-ctx">{C.CTX[lang]}</p>' if tool['text'] == 'en' else ''
    wpm = hk('wpm', '0', 'WPM') if both else ''
    return f'''<div class="wrap main-a">
  <div class="a-head">
    <h1>{esc(tool['h1'])}</h1>
    {opts_a(lang, tool)}
  </div>
  <noscript><p class="nojs">{t['nojs']}</p></noscript>
  <section class="sheet stage{' both' if both else ''}{' hasctx' if ctx else ''}" aria-label="{esc(tool['h1'])}">
    <div class="playbox" id="playbox">
      <div class="play">
        <div class="playtop"><p class="start">{start_spans(lang)}</p><p class="daily" id="daily"></p></div>
        <div class="view"><div class="txt" id="txt" aria-hidden="true"></div></div>
        {trap(lang)}
      </div>
      <div class="bar" aria-hidden="true"><i id="bar"></i></div>
      <div class="meter hud" id="hud">
        {hk('speed', '0', unit, 'main')}
        {wpm}{hk('acc', '–', t['acc_pct'], short=t['acc_s'])}
        {hk('left', '30', t['left'], label_id='left-l', key_id='k-time', short=t['left_s'])}
        {hk('combo', '0', t['combo'], 'hot', key_id='k-combo', tip=t['combo_tip'])}
        <div class="nk" aria-hidden="true"><span class="nk-l">{t['nextkey']}</span><span class="cap shift" id="nextshift" hidden>Shift</span><span class="cap" id="nextkey"></span></div>
        {kbd_btn('fresh', t['fresh'], 'Tab', 'btn sm')}
        <button type="button" class="btn sm quit" id="quit">{t['quit']}</button>
      </div>
    </div>
    <div class="result" id="result" hidden>
      <div class="r-body">
        {result_left(lang, tool)}
        <div class="r-right">
          {map_fig()}
          {chart_fig(lang)}
        </div>
        {ctx}
      </div>
      {result_plate(lang)}
    </div>
    {FX_LAYER}
    <canvas class="burst" id="burst" aria-hidden="true" hidden></canvas>
  </section>
  {under(lang, f"""{esc(tool['basis'])} <a href="#basis">{t['basis_h']}</a> <span class="safe">{t['combo_note']}</span> <span class="safe">{esc(tool['safe'])}</span> <span class="safe pc">{t['esc_note']}</span>""")}
</div>'''


def layout_c(lang, tool):
    """시안 C: 위에 숫자 띠와 글 두 줄, 아래 절반은 화면 자판(다음 키·손가락 → 끝나면 틀린 키 지도)."""
    t, s = TX[lang], JS[lang]
    steps = ''.join(f'<button type="button" data-v="{i}" aria-pressed="{"true" if i == 0 else "false"}"><i>{i + 1}</i>{esc(n)}</button>' for i, n in enumerate(s['lessons']))
    return f'''<div class="wrap main-c">
  <div class="c-head">
    <h1>{esc(tool['h1'])}</h1>
    <div class="c-opts"><div class="steps" role="group" aria-label="{t['steps_l']}" id="steps">{steps}</div>{more_only(lang)}</div>
  </div>
  <p class="step-say" id="step-say">{esc(s['lessonSay'][0])}</p>
  <noscript><p class="nojs">{t['nojs']}</p></noscript>
  <section class="rig stage" aria-label="{esc(tool['h1'])}">
    <div class="strip hud" id="hud">
      {hk('speed', '0', t['unit'], 'main')}
      {hk('acc', '–', t['acc_pct'], short=t['acc_s'])}
      {hk('left', '0', s['elapsed'], label_id='left-l', key_id='k-time', short=t['left_s'])}
      {hk('combo', '0', t['combo'], 'hot', key_id='k-combo', tip=t['combo_tip'])}
      {kbd_btn('fresh', t['fresh'], 'Tab', 'btn sm')}
      <button type="button" class="btn sm quit" id="quit">{t['quit']}</button>
    </div>
    <div class="bar" aria-hidden="true"><i id="bar"></i></div>
    <div class="band" id="playbox">
      <p class="start">{start_spans(lang)}</p>
      <div class="view"><div class="txt" id="txt" aria-hidden="true"></div></div>
      {trap(lang)}
    </div>
    <div class="band result" id="result" hidden>
      <div class="r-side">
        <p class="r-pass" id="r-pass" role="status"></p>
        <p class="r-formula num" id="r-formula"></p>
        <p class="r-acc"><span>{t['acc']}</span> <b class="num" id="r-acc"></b> <span class="num" id="r-accd"></span></p>
        <p class="r-raw num" id="r-raw"></p>
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
    {FX_LAYER}
    <canvas class="burst" id="burst" aria-hidden="true" hidden></canvas>
  </section>
  {under(lang, f"""{esc(tool['basis'])} <span class="safe">{t['combo_note']}</span> <span class="safe">{esc(tool['safe'])}</span> <span class="safe pc">{t['esc_note']}</span>""")}
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
      {more_only(lang)}
    </div>
  </div>
  <div class="b-grid">
    <noscript><p class="nojs">{t['nojs']}</p></noscript>
    <section class="desk stage" aria-label="{esc(tool['h1'])}">
      <div class="stack" id="playbox">
        <p class="ln prev first" id="prev" aria-hidden="true"></p>
        <div class="now">
          <p class="tag">{t['look']}</p>
          <div class="txt" id="txt" aria-hidden="true"></div>
          <p class="tag mine-tag">{t['mine']}</p>
          <div class="mine" aria-hidden="true"><span id="mine-t"></span><i class="caret"></i><span class="ph">{start_spans(lang)}</span></div>
          {trap(lang)}
        </div>
        <p class="ln next" id="next1" aria-hidden="true"></p>
        <p class="ln next n2" id="next2" aria-hidden="true"></p>
      </div>
      <div class="result" id="result" hidden>
        <div class="r-side">
          {badges()}
          <p class="r-formula num" id="r-formula"></p>
          <p class="r-acc"><span>{t['acc']}</span> <b class="num" id="r-acc"></b> <span class="num" id="r-accd"></span></p>
          <p class="r-raw num" id="r-raw"></p>
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
      {FX_LAYER}
      <canvas class="burst" id="burst" aria-hidden="true" hidden></canvas>
    </section>
    <aside class="gauge" aria-label="{s['speedNow']}">
      <div class="g-main"><p class="g-label" id="g-label">{s['speedNow']}</p><p class="g-big"><b class="num" id="speed">0</b><span>{t['unit']}</span></p></div>
      <div class="spark" id="spark" aria-hidden="true"></div>
      <dl class="g-facts">
        <div><dt>{t['acc']}</dt><dd class="num"><span id="acc">–</span><small>%</small></dd></div>
        <div><dt id="left-l">{s['progress']}</dt><dd class="num"><span id="left">1/{tool['count']}</span></dd></div>
        <div class="g-combo" id="k-combo" title="{esc(t['combo_tip'])}"><dt>{t['combo']}</dt><dd class="num"><span id="combo">0</span></dd></div>
      </dl>
      <div class="g-bar" aria-hidden="true"><i id="bar"></i></div>
      <div class="g-act">{kbd_btn('fresh', t['fresh'], 'Tab', 'btn sm')}<button type="button" class="btn sm quit" id="quit">{t['quit']}</button></div>
    </aside>
  </div>
  {under(lang, f"""{esc(tool['basis'])} <span class="safe">{t['combo_note']}</span> <span class="safe">{esc(tool['safe'])}</span> <span class="safe pc">{t['esc_note']}</span>""")}
</div>'''


def records_html(lang):
    t, s = TX[lang], JS[lang]
    return f'''<section class="wrap records" aria-labelledby="rec-h">
  <div class="rec-head"><h2 id="rec-h">{t['rec_h']}</h2><p class="rec-note">{t['rec_note']}</p><p class="rec-best num" id="rec-best"></p><span class="rec-btns"><button type="button" class="lnk" id="rec-more" aria-controls="rec-list" hidden></button><button type="button" class="lnk" id="rec-clear" hidden>{s['clearBtn']}</button></span></div>
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
    scripts = ['tj-core', 'tj-text-' + tool['text'], 'tj-store'] + (['tj-lessons'] if tool['tool'] == 'practice' else []) + ['fx', 'app']
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
    """없는 주소. Cloudflare 는 어느 주소에서든 이 한 장(404.html)을 보여 주므로, 두 언어 틀을 다 넣어 두고
    첫 그림 전에 주소를 보고(/ko/ 로 시작하면 한국어) 하나만 보여 준다. 스크립트가 꺼져 있으면 영어 틀이 보인다(한국어 첫 화면 링크는 그 안에도 있다)."""
    caps = ''.join(f'<span class="cap">{ch}</span>' for ch in '404')

    def frame(lang):
        t, other = TX[lang], TX['ko' if lang == 'en' else 'en']
        ol = 'ko' if lang == 'en' else 'en'
        return f'''<div class="wrap narrow nf" data-l="{lang}"{' lang="ko"' if lang == 'ko' else ''}>
  <p class="nf-keys" aria-hidden="true">{caps}</p>
  <h1>{t['nf_title']}</h1>
  <p><a class="btn pri" href="{prefix(lang)}">{t['home']}</a> <a class="btn" href="{prefix(ol)}" lang="{ol}" hreflang="{ol}">{other['home']}</a></p>
</div>'''

    def wrap(lang, inner):
        return f'<div data-l="{lang}"{' lang="ko"' if lang == 'ko' else ''}>\n{inner}\n</div>'

    pick = ("<script>if(/^\\/ko(\\/|$)/.test(location.pathname)){var h=document.documentElement;h.lang='ko';document.title='" + TX['ko']['nf_title'] + " | " + TX['ko']['brand'] + "'}</script>\n")
    h = head('en', 'Page not found | Todok', 'This page does not exist.', '', noindex=True, ads=False, extra=pick)
    site = '<script type="application/json" id="tj-site">' + json.dumps({'lang': 'en'}) + '</script>'
    return f'''{h}
<body class="doc">
{wrap('en', header('en', '__404__'))}
{wrap('ko', header('ko', '__404__'))}
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


# ---------- 글꼴 조각에 담을 글자 ----------
_CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
_JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'
_VOWEL_FIRST = {9: 8, 10: 8, 11: 8, 14: 13, 15: 13, 16: 13, 19: 18}   # 겹모음 → 먼저 치는 모음(ㅘㅙㅚ → ㅗ, ㅝㅞㅟ → ㅜ, ㅢ → ㅡ)
_JONG_PAIR = {'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ'}


def composing_shapes(text):
    """한글을 두벌식으로 칠 때 입력칸에 잠깐 보이는 글자들: 치는 중인 글자('한'의 'ㅎ', '하'), 겹모음·겹받침의 앞 절반,
    받침으로 붙었다가 다음 글자로 넘어가는 모양('가나'의 '간'). 문장 연습의 '내가 친 글' 줄에 그대로 보인다."""
    out = set()
    syl = lambda l, v, t: chr(0xAC00 + (l * 21 + v) * 28 + t)
    prev = None
    for ch in text:
        c = ord(ch) - 0xAC00
        if not (0 <= c < 11172):
            prev = None
            continue
        l, v, t = c // 588, (c // 28) % 21, c % 28
        out.add(_CHO[l])
        if v in _VOWEL_FIRST:
            out.add(syl(l, _VOWEL_FIRST[v], 0))
        out.add(syl(l, v, 0))
        if t and _JONG[t] in _JONG_PAIR:
            out.add(syl(l, v, _JONG.index(_JONG_PAIR[_JONG[t]][0])))
        if prev is not None:   # 이 글자의 첫소리가 앞 글자의 받침으로 붙었다가 넘어간다
            pl, pv, pt = prev
            if pt == 0 and _CHO[l] in _JONG:
                out.add(syl(pl, pv, _JONG.index(_CHO[l])))
            elif pt and _JONG[pt] not in _JONG_PAIR:
                both = [k for k, pair in _JONG_PAIR.items() if pair == _JONG[pt] + _CHO[l]]
                if both:
                    out.add(syl(pl, pv, _JONG.index(both[0])))
        prev = (l, v, t)
    return out


def js_strings(name):
    """assets 의 데이터 파일에서 따옴표 안의 글(연습 글·단어)만 뽑는다(주석의 글자는 화면에 나오지 않는다)."""
    src = re.sub(r'/\*.*?\*/', '', (ROOT / 'assets' / name).read_text(encoding='utf-8'), flags=re.S)
    return ''.join(re.findall(r"'((?:[^'\\\n]|\\.)*)'", src))


def screen_chars():
    """언어판마다 화면에 나올 수 있는 글자(조각 글꼴에 담을 것): 만든 페이지의 글자 + 연습 글·자리 연습 단어 + 한글 낱자 + 치는 중에 보이는 중간 모양.
    영어판에는 한국어 연습 글이 나오지 않는다(404 한 장만 두 언어 틀을 다 담는다)."""
    out, _ = build()
    is_ko = lambda ch: '\uac00' <= ch <= '\ud7a3' or '\u3131' <= ch <= '\u3163'
    base = {chr(c) for c in range(0x20, 0x7F)}
    symbols = {ch for n in ('app.js', 'site.js') for ch in js_strings(n) if ord(ch) > 0x7F and not is_ko(ch)}
    chars = {'en': base | symbols, 'ko': base | symbols}
    for rel, text in out.items():
        if rel.endswith('.xml'):
            continue
        langs = ('en', 'ko') if rel == '404.html' else ('ko',) if rel.startswith('ko/') else ('en',)
        for lang in langs:
            chars[lang] |= set(text)
    ko_text = js_strings('tj-text-ko.js') + js_strings('tj-lessons.js')
    chars['ko'] |= set(ko_text) | set(js_strings('tj-text-en.js')) | composing_shapes(ko_text) | {chr(c) for c in range(0x3131, 0x3164)}
    chars['en'] |= {ch for ch in js_strings('tj-text-en.js') + js_strings('tj-lessons.js') if not is_ko(ch)}
    return {lang: {ch for ch in cs if ch >= ' '} for lang, cs in chars.items()}


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
