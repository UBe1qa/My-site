#!/usr/bin/env python3
"""떼고얼마 / Takehome Korea(salary.lumenlab.page) 페이지 전부 만들기: python3 salary/_dev/build.py   (--check 는 낡았는지만 본다)

- 만드는 것: 한국어 / , 영어 /en/ 의 계산기·연봉 표·가이드·소개·방침, 404.html, sitemap.xml, rss.xml(한국어 글).
- 화면·글의 숫자는 전부 `node _dev/calc.mjs`(자료 파일 + 계산 로직)가 낸 값이다(ctx.py). 이 파일과 texts.py·articles.py 에 금액·요율을 손으로 적지 않는다.
- 결과 칸의 첫 모습(예시)은 화면 코드(assets/pay-view.js)가 빌드 때 미리 그린 것이다. 브라우저가 같은 함수로 다시 그리므로 화면이 밀리지 않는다.
- 글꼴: _dev/fonts.json(= _dev/font.py 가 만든 조각 글꼴의 파일 이름과 글자 범위)대로 <head> 에 preload 와 @font-face(TK Sans)를 넣는다.
  글꼴은 이 사이트에서만 받는다(다른 글꼴 서버에 접속하지 않는다). 조각에 없는 글자는 기기 글꼴로 보인다.
- 만든 파일은 손으로 고치지 않는다. lastmod 는 UPDATED 에 실제로 고친 날만 적는다.
"""
import json
import sys
from email.utils import format_datetime
from datetime import datetime, timezone

sys.dont_write_bytecode = True
from ctx import *  # noqa: E402,F401,F403
import texts  # noqa: E402
import articles  # noqa: E402

TODAY = '2026-10-10'
UPDATED = {}   # 주소: 'YYYY-MM-DD' (본문·구조화 데이터·링크가 바뀐 페이지만. 처음 판은 TODAY)
ADS_CLIENT = 'ca-pub-9496167591465154'
BRAND = {'ko': '떼고얼마', 'en': 'Takehome Korea'}
CHECK = '--check' in sys.argv
stale = []
FONTS = json.loads((DEV / 'fonts.json').read_text(encoding='utf-8'))   # 없으면 먼저 python3 -B _dev/font.py


def font_head(lang):
    """글꼴: 이 언어판의 조각 하나(같은 주소에서 받는다)를 먼저 받게 한다.
    font-display: optional 이라 늦게 와도 이미 그린 글자를 바꾸지 않는다(화면 밀림 0). preload 한 optional 글꼴은 브라우저가 잠깐 기다려 첫 그림부터 쓴다."""
    f = FONTS[lang]
    return (f'<link rel="preload" href="/assets/fonts/{f["file"]}" as="font" type="font/woff2" crossorigin>\n'
            f'<style>@font-face{{font-family:"{FONTS["family"]}";src:url(/assets/fonts/{f["file"]}) format("woff2");font-weight:{FONTS["weights"][0]} {FONTS["weights"][1]};font-style:normal;font-display:optional;unicode-range:{f["range"]}}}</style>')


def prefix(lang):
    return '/' if lang == 'ko' else '/en/'


def url(lang, path=''):
    return SITE + prefix(lang) + path


def lastmod(path):
    return UPDATED.get(path, TODAY)


NAV = {
    'ko': [('', '실수령액'), ('table/', '연봉 표'), ('severance/', '퇴직금'), ('hourly/', '시급·주휴<span class="long">수당</span>'), ('unemployment/', '실업급여'), ('annual-leave/', '연차')],
    'en': [('', 'Net pay'), ('table/', 'Salary table'), ('severance/', 'Severance'), ('hourly/', 'Hourly<span class="long"> &amp; holiday pay</span>')],
}
UI = {
    'ko': dict(skip='본문으로 건너뛰기', nav='계산기', guides='가이드', lang_other='English', about='소개와 계산 기준', privacy='개인정보 처리방침', contact='문의',
               ad='광고', f_tools='계산기', f_guides='가이드', f_info='안내', made='만든 곳 루멘랩', more='루멘랩의 다른 앱과 도구 보기',
               safe='입력한 금액과 날짜는 이 기기 밖으로 나가지 않아요.', checked='마지막 확인', home='연봉 실수령액 계산기', all_guides='가이드 전체'),
    'en': dict(skip='Skip to content', nav='Calculators', guides='Guides', lang_other='한국어', about='About and sources', privacy='Privacy', contact='Contact',
               ad='Ad', f_tools='Calculators', f_guides='Guides', f_info='Info', made='Made by Lumen Lab', more='More apps and tools from Lumen Lab',
               safe='The amounts and dates you enter never leave this device.', checked='Last checked', home='Korea Net Salary Calculator', all_guides='All guides'),
}
FOOT_TOOLS = {
    'ko': [('', '연봉 실수령액 계산기'), ('table/', '연봉 실수령액 표'), ('severance/', '퇴직금 계산기'), ('hourly/', '시급·주휴수당 계산기'), ('unemployment/', '실업급여 계산기'), ('annual-leave/', '연차 계산기')],
    'en': [('', 'Net salary calculator'), ('table/', 'Net salary table'), ('severance/', 'Severance pay calculator'), ('hourly/', 'Hourly wage and weekly holiday allowance')],
}
PAIRED = {'', 'table/', 'severance/', 'hourly/', 'guide/', 'about/', 'privacy/'}
LOGO = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect class="lg-p" x="3" y="1.5" width="16" height="19" rx="2.5"/><path class="lg-l" d="M6.8 6.5h8.4M6.8 10h8.4"/><path class="lg-m" d="M6.8 14h8.4M6.8 17h8.4"/></svg>'
LUMEN_SVG = ('<svg width="56" height="50" viewBox="0 0 56 50" aria-hidden="true"><rect class="lm-env" x="5" y="19" width="46" height="27" rx="3"/>'
             '<g class="lm-paper"><rect class="lm-pp" x="14" y="3" width="28" height="34" rx="2.5"/><path class="lm-ln" d="M19 10h18M19 15h18"/><path class="lm-mn" d="M19 21h18M19 25h18"/></g>'
             '<path class="lm-env" d="M5 24l23 14 23-14v19a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/></svg>')
# 좁은 화면에서 메뉴가 넘치면: 지금 페이지가 보이게 밀어 두고, 더 있는 쪽 끝을 흐리게 할 표시를 붙인다(첫 그림 전에. 자리는 안 바뀐다)
NAV_JS = ("<script>(function(n){function f(){var m=n.scrollWidth-n.clientWidth,x=n.scrollLeft;n.classList.toggle('of',m>1);n.classList.toggle('mid',m>1&&x>2&&x<m-2);n.classList.toggle('end',m>1&&x>=m-2)}"
          "var c=n.querySelector('[aria-current]');if(c&&n.scrollWidth>n.clientWidth+1)n.scrollLeft=Math.max(0,c.offsetLeft-n.clientWidth/2+c.offsetWidth/2);f();"
          "n.addEventListener('scroll',f,{passive:true});window.addEventListener('resize',f)})(document.currentScript.previousElementSibling)</script>")
ANIM = "<script>(function(d){var h=d.documentElement;if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)&&'IntersectionObserver' in window)h.classList.add('anim')})(document)</script>"


def head(lang, title, desc, path, alt=None, jsonld=(), og_type='website', noindex=False, ads=True, scripts=()):
    """path: 언어 앞머리 뒤 경로. alt: 다른 언어판의 경로(같은 역할일 때만, 없으면 None)."""
    canon = url(lang, path)
    links = [] if noindex else [f'<link rel="canonical" href="{canon}">']
    if alt is not None and not noindex:
        ko_u = url('ko', path if lang == 'ko' else alt)
        en_u = url('en', path if lang == 'en' else alt)
        links += [f'<link rel="alternate" hreflang="ko" href="{ko_u}">', f'<link rel="alternate" hreflang="en" href="{en_u}">',
                  f'<link rel="alternate" hreflang="x-default" href="{en_u}">']
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>\n' for j in jsonld)
    ad = (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADS_CLIENT}" crossorigin="anonymous"></script>\n'
          '<script src="/assets/ads-config.js"></script>\n') if ads else ''
    sc = ''.join(f'<script defer src="/assets/{s}"></script>\n' for s in scripts)
    og = 'og-ko.png' if lang == 'ko' else 'og.png'
    robots = '<meta name="robots" content="noindex">\n' if noindex else ''
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{robots}<meta name="theme-color" content="#f3f3f0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#161518" media="(prefers-color-scheme: dark)">
{chr(10).join(links)}
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:site_name" content="{BRAND[lang]}">
<meta property="og:image" content="{SITE}/{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="{'ko_KR' if lang == 'ko' else 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
{font_head(lang)}
<link rel="stylesheet" href="/assets/style.css">
{ANIM}
{ld}{ad}{sc}</head>'''


def header(lang, path, alt):
    u, p, other = UI[lang], prefix(lang), ('en' if lang == 'ko' else 'ko')
    cur = lambda x: ' aria-current="page"' if x == path else ''
    tools = ''.join(f'<a href="{p}{h}"{cur(h)}>{t}</a>' for h, t in NAV[lang])
    g_cur = ' aria-current="page"' if path.startswith('guide/') else ''
    other_href = prefix(other) + (alt if alt is not None else '')
    return f'''<a class="skip" href="#main">{u['skip']}</a>
<header class="top"><div class="top-in wrap">
  <a class="brand" href="{p}">{LOGO}{BRAND[lang]}</a>
  <nav class="tools" aria-label="{u['nav']}">{tools}</nav>{NAV_JS}
  <div class="side"><a href="{p}guide/"{g_cur}>{u['guides']}</a><a href="{other_href}" lang="{other}" hreflang="{other}" data-lang-link>{u['lang_other']}</a></div>
</div></header>'''


def footer(lang):
    u, p = UI[lang], prefix(lang)
    tools = ''.join(f'<li><a href="{p}{h}">{t}</a></li>' for h, t in FOOT_TOOLS[lang])
    guides = ''.join(f'<li><a href="{p}guide/{a["slug"]}/">{esc(a["short"])}</a></li>' for a in articles.ARTICLES[lang])
    lumen = 'https://lumenlab.page/' + ('en/' if lang == 'en' else '')
    return f'''<footer class="foot"><div class="wrap">
  <div class="foot-grid">
    <div><p class="foot-h">{u['f_tools']}</p><ul>{tools}</ul></div>
    <div><p class="foot-h">{u['f_guides']}</p><ul>{guides}</ul></div>
    <div><p class="foot-h">{u['f_info']}</p><ul><li><a href="{p}about/">{u['about']}</a></li><li><a href="{p}privacy/">{u['privacy']}</a></li><li><a href="mailto:woxocoso@gmail.com">{u['contact']}</a></li></ul></div>
    <a class="lumen" href="{lumen}" data-lumen>{LUMEN_SVG}<span class="lm-t"><b>{u['made']}</b><small>{u['more']}</small></span></a>
  </div>
  <p class="safe">{u['safe']} © 2026 Lumen Lab</p>
</div></footer>'''


def ad_slot(lang, name, center=False):
    return (f'<div class="ad-wrap wrap{" center" if center else ""}" data-slot="{name}"><div class="ad-in"><p class="ad-label">{UI[lang]["ad"]}</p>'
            f'<div class="ad-slot" data-ad="{name}" hidden></div></div></div>')


def page(lang, head_html, body, path, alt, cfg=None):
    other = 'en' if lang == 'ko' else 'ko'
    conf = {'lang': lang, 'other': prefix(other) + (alt if alt is not None else '')}
    conf.update(cfg or {})
    return f'''{head_html}
<body>
{header(lang, path, alt)}
<main id="main">
{body}
</main>
{footer(lang)}
<script id="tk" type="application/json">{json.dumps(conf, ensure_ascii=False)}</script>
<script defer src="/assets/app.js"></script>
</body>
</html>
'''


def alt_of(path):
    return path if path in PAIRED else None


def webapp(lang, name, desc, path):
    return {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': name, 'url': url(lang, path), 'applicationCategory': 'FinanceApplication',
            'operatingSystem': 'Any', 'browserRequirements': 'Requires a modern web browser', 'inLanguage': lang, 'isAccessibleForFree': True, 'description': desc,
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'KRW'},
            'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}}


def crumbs(lang, items):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': url(lang, p)} for i, (n, p) in enumerate(items)]}


TODAY_JS = "var d=new Date(),t=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2),e=document.getElementById('stale')"
# 실수령액·시급: 기기 날짜가 다음 기준의 시행일부터면 미리 그려 둔 '다음 기준' 결과로 바꿔 끼운다(첫 그림 전에. 자리는 같다).
# 그 다음 기준마저 기간이 지났으면(자료를 못 넘긴 채 오래 지남) 알림을 띄운다. 로직의 defaultPeriod·validity 와 같은 판단이다.
PERIOD_JS = ("<script>(function(){" + TODAY_JS + ",n=document.getElementById('pre-next'),k,j,x,b,i;"
             "if(n&&t>=n.getAttribute('data-starts')){j=JSON.parse(n.textContent);for(k in j){x=document.getElementById(k);if(x)x.innerHTML=j[k]}"
             "b=document.querySelectorAll('#period button,[data-k=period] button');for(i=0;i<b.length;i++)b[i].setAttribute('aria-pressed',String(b[i].getAttribute('data-v')===n.getAttribute('data-id')));"
             "if(t>e.getAttribute('data-until2')){e.textContent=e.getAttribute('data-msg2');e.hidden=false}}"
             "else if(t>e.getAttribute('data-until'))e.hidden=false})()</script>")
# 실업급여: 해가 바뀌면 '상한액은 아직 반영하지 못했다'고, 그 해도 지나면 '새 기준을 확인 중'이라고 알린다
STALE_JS = ("<script>(function(){" + TODAY_JS + ";if(t>e.getAttribute('data-until')){if(e.getAttribute('data-until2')&&t>e.getAttribute('data-until2'))e.textContent=e.getAttribute('data-msg2');e.hidden=false}})()</script>")


def stale_note(msg, until, until2=None, msg2=None):
    more = f' data-until2="{until2}" data-msg2="{esc(msg2)}"' if until2 else ''
    return f'<p class="stale" id="stale" hidden data-until="{until}"{more}>{msg}</p>'


def pre_next(parts):
    """다음 기준으로 미리 그린 결과(요소 id → HTML). 인라인 스크립트가 해가 바뀐 뒤에 끼운다."""
    body = json.dumps(parts, ensure_ascii=False).replace('</', '<\\/')
    return f'<script type="application/json" id="pre-next" data-id="{NEXTID}" data-starts="{NXT["starts"]}">{body}</script>'


def period_until(P):
    return min(P['pension']['until'], P['pension']['limitUntil'], P['minWage']['until'])


def unit(uid, text):
    """칸 안 오른쪽에 겹쳐 보이는 단위. 눈으로 보는 표시라 낭독에서는 빼고(aria-hidden), 칸의 설명(aria-describedby)으로 이어 읽게 한다."""
    return f'<span class="unit" id="u-{uid}" aria-hidden="true">{text}</span>'


def tool_page(lang, key, path, scripts, grid, below, cfg):
    """key: texts.PAGES 의 이름. grid: 왼쪽 입력 + 오른쪽 명세서 HTML. below: 첫 화면 아래 칸들."""
    t = texts.PAGES[key][lang]
    body = f'''<div class="wrap" data-page="{key}">
<div class="tool-grid">
{grid}
</div>
</div>
{ad_slot(lang, 'mid')}
<div class="wrap below">
{below}
</div>
{ad_slot(lang, 'bottom')}'''
    alt = alt_of(path)
    ld = [webapp(lang, t['h1'], t['desc'], path)]
    if path:
        ld.append(crumbs(lang, [(UI[lang]['home'], ''), (t['h1'], path)]))
    conf = {'page': key}
    conf.update(cfg)
    return page(lang, head(lang, t['title'], t['desc'], path, alt=alt, jsonld=ld, scripts=scripts), body, path, alt, conf)


# ───────── 실수령액(첫 화면) ─────────
def net_page(lang):
    t, pre, ko = texts.PAGES['net'][lang], PRE[lang]['net'], lang == 'ko'
    nxt, ST = PRE[lang]['netNext'], PRE[lang]['stale']
    N = D['net']
    quick = {'annual': [30000000, 40000000, 50000000, 70000000], 'monthly': [2200000, 2500000, 3000000, 4000000]}
    q_label = (lambda n: man0(n)) if ko else (lambda n: f'₩{n / 1000000:g}M')
    q_value = (lambda n: man0(n)) if ko else (lambda n: f'{n / 1000000:g}m')
    chips = ''.join(f'<button type="button" data-v="{q_value(n)}">{q_label(n)}</button>' for n in quick['annual'])
    o, U_ = t['opts'], PRE[lang]['unit']
    nt_val = c(N['nontaxMeal'] // texts.MAN) if ko else c(N['nontaxMeal'])
    opts = f'''<div class="row"><label for="o-nontax">{o['nontax']}<span class="hint">{o['nontax_h']}</span></label><span class="inp-u"><input class="mini num" id="o-nontax" inputmode="decimal" autocomplete="off" value="{nt_val}" aria-describedby="u-o-nontax r-o-nontax">{unit('o-nontax', U_['man'])}</span><p class="read" id="r-o-nontax"></p></div>
      <div class="row"><span class="l" id="l-fam">{o['fam']}<span class="hint">{o['fam_h']}</span></span><span class="step" data-k="family" role="group" aria-labelledby="l-fam"><button type="button" aria-label="{o['less']}">−</button><output>1</output><button type="button" aria-label="{o['more']}">+</button></span></div>
      <div class="row"><span class="l" id="l-kid">{o['kid']}<span class="hint">{o['kid_h']}</span></span><span class="step" data-k="children" role="group" aria-labelledby="l-kid"><button type="button" aria-label="{o['less']}">−</button><output>0</output><button type="button" aria-label="{o['more']}">+</button></span></div>
      <div class="row"><span class="l" id="l-ratio">{o['ratio']}<span class="hint">{o['ratio_h']}</span></span><span class="seg" data-k="ratio" role="group" aria-labelledby="l-ratio">{''.join(f'<button type="button" data-v="{r}" aria-pressed="{"true" if r == 100 else "false"}">{r}%</button>' for r in N['ratios'])}</span></div>
      <div class="row"><span class="l" id="l-period">{o['period']}</span><span class="seg" data-k="period" role="group" aria-labelledby="l-period"><button type="button" data-v="{NOWID}" aria-pressed="true">{o['p_now']}</button><button type="button" data-v="{NEXTID}" aria-pressed="false">{o['p_next'][0]}</button></span></div>
      <label class="chk" data-sev><input type="checkbox" id="o-sev"><span>{o['sev']}<span class="hint">{o['sev_h']}</span></span></label>
      <label class="chk"><input type="checkbox" id="o-age60"><span>{o['age60']}<span class="hint">{o['age60_h']}</span></span></label>
      <label class="chk"><input type="checkbox" id="o-age"><span>{o['age']}<span class="hint">{o['age_h']}</span></span></label>'''
    grid = f'''<section class="t-in">
  <h1>{t['h1']}</h1>
  <p class="t-sub">{t['sub']}</p>
  <div class="pick"><span class="seg" id="kind" role="group" aria-label="{t['basis_l']}"><button type="button" data-v="annual" aria-pressed="true">{t['annual']}</button><button type="button" data-v="monthly" aria-pressed="false">{t['monthly']}</button></span><span class="pre">{t['pre']}</span></div>
  <label class="money"><span class="sr" id="amt-l">{t['amt_l'][0]}</span><input id="amt" type="text" inputmode="{'numeric' if ko else 'text'}" autocomplete="off" enterkeyhint="done" placeholder="{t['ph'][0]}" aria-labelledby="amt-l" aria-describedby="read">{unit('amt', U_['man'])}</label>
  <p class="read {pre['read']['cls']}" id="read">{pre['read']['html']}</p>
  <div class="quick" id="quick"><span class="lbl">{t['quick']}</span>{chips}</div>
  <div class="opts">
    <button type="button" class="opts-sum" id="optsBtn" aria-expanded="false" aria-controls="optsBody"><span class="v" id="optsSum">{pre['summary']}</span><span class="go" id="optsGo">{t['change']}</span></button>
    <div class="opts-body" id="optsBody" hidden>
      {opts}
    </div>
  </div>
</section>
<section class="t-out" aria-label="{t['out_l']}">
  {stale_note(ST['now'], period_until(NOW), period_until(NXT), ST['next'])}
  <div class="slip is-ex" id="slip">{pre['slip']}</div>
  <p class="sr" id="live" aria-live="polite"></p>
  <p class="fine">{t['fine']}</p>
</section>
<section class="t-more cmp" aria-label="{t['cmp_l']}">
  <div id="cmp">{pre['compare']}</div>
  <p class="cmp-more"><a href="{prefix(lang)}table/">{t['cmp_more']}</a></p>
</section>
<button type="button" class="stick" id="stick" tabindex="-1" aria-hidden="true">{pre['stick']}</button>
{pre_next({'slip': nxt['slip'], 'cmp': nxt['compare'], 'optsSum': nxt['summary'], 'stick': nxt['stick']})}{PERIOD_JS}'''
    cfg = {'quick': {k: [[q_value(n), q_label(n)] for n in v] for k, v in quick.items()}, 'ph': t['ph'], 'amtL': t['amt_l'], 'change': t['change'], 'close': t['close'], 'pNext': o['p_next']}
    return tool_page(lang, 'net', '', ['pay-data.js', 'gani-2026.js', 'pay-core.js', 'pay-view.js'], grid, texts.net_below(lang), cfg)


# ───────── 퇴직금 ─────────
def sev_page(lang):
    t, pre, ko, U_ = texts.PAGES['sev'][lang], PRE[lang]['sev'], lang == 'ko', PRE[lang]['unit']
    grid = f'''<section class="t-in">
  <h1>{t['h1']}</h1>
  <p class="t-sub">{t['sub']}</p>
  <div class="form" id="form">
    <div class="fld2">
      <div class="fld"><label for="f-join">{t['join']}</label><input type="date" id="f-join" min="1950-01-01" max="2100-12-31"></div>
      <div class="fld"><label for="f-leave">{t['leave']}</label><input type="date" id="f-leave" min="1950-01-01" max="2100-12-31" aria-describedby="h-leave"></div>
    </div>
    <p class="hint" id="h-leave">{t['leave_h']}</p>
    <div class="fld"><label for="f-wages">{t['wages']}</label><span class="inp-u"><input type="text" id="f-wages" inputmode="{'numeric' if ko else 'text'}" autocomplete="off" placeholder="{t['eg']} {t['ph'][0]}" aria-describedby="u-f-wages r-f-wages">{unit('f-wages', U_['man'])}</span><p class="read hint" id="r-f-wages">{t['wages_h']}</p></div>
    <details class="more-in" id="more"><summary><span>{t['more']}</span><span class="go" data-open="{t['open']}" data-close="{t['shut']}"></span></summary>
      <div class="form">
        <div class="fld"><label for="f-bonus">{t['bonus']}</label><span class="inp-u"><input type="text" id="f-bonus" inputmode="{'numeric' if ko else 'text'}" autocomplete="off" placeholder="{t['eg']} {t['ph'][1]}" aria-describedby="u-f-bonus r-f-bonus">{unit('f-bonus', U_['man'])}</span><p class="read hint" id="r-f-bonus">{t['bonus_h']}</p></div>
        <div class="fld"><label for="f-lpay">{t['lpay']}</label><span class="inp-u"><input type="text" id="f-lpay" inputmode="{'numeric' if ko else 'text'}" autocomplete="off" placeholder="{t['eg']} {t['ph'][2]}" aria-describedby="u-f-lpay r-f-lpay">{unit('f-lpay', U_['man'])}</span><p class="read hint" id="r-f-lpay">{t['lpay_h']}</p></div>
        <div class="fld"><label for="f-ord">{t['ord']}</label><span class="inp-u"><input type="text" id="f-ord" inputmode="numeric" autocomplete="off" aria-describedby="u-f-ord r-f-ord">{unit('f-ord', U_['won'])}</span><p class="read hint" id="r-f-ord">{t['ord_h']}</p></div>
        <label class="chk"><input type="checkbox" id="f-u15"><span>{t['u15']}</span></label>
      </div>
    </details>
    <div class="acts"><button type="button" class="btn ghost" id="b-ex">{t['fill']}</button><button type="button" class="btn ghost" id="b-clear" hidden>{t['clear']}</button></div>
  </div>
</section>
<section class="t-out" aria-label="{t['out_l']}">
  <div class="slip is-ex" id="slip">{pre['slip']}</div>
  <p class="sr" id="live" aria-live="polite"></p>
  <p class="fine">{t['fine']}</p>
</section>
{texts.key_facts('sev', lang)}'''
    return tool_page(lang, 'sev', 'severance/', ['pay-data.js', 'pay-core.js', 'pay-view.js'], grid, texts.sev_below(lang), {})


# ───────── 시급·주휴수당·최저임금 ─────────
def hourly_page(lang):
    t, pre, U_, ST = texts.PAGES['hourly'][lang], PRE[lang]['hourly'], PRE[lang]['unit'], PRE[lang]['stale']
    H = D['hourly']
    grid = f'''<section class="t-in">
  <h1>{t['h1']}</h1>
  <p class="t-sub">{t['sub']}</p>
  <div class="pick"><span class="seg" id="mode" role="group" aria-label="{t['mode_l']}"><button type="button" data-v="hourly" aria-pressed="true">{t['m_hourly']}</button><button type="button" data-v="monthly" aria-pressed="false">{t['m_monthly']}</button></span></div>
  <label class="money"><span class="sr" id="amt-l">{t['amt_l'][0]}</span><input id="amt" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done" placeholder="{t['ph'][0]}" aria-labelledby="amt-l" aria-describedby="read">{unit('amt', U_['won'])}</label>
  <p class="read {pre['read']['cls']}" id="read">{pre['read']['html']}</p>
  <div class="form">
    <div class="row"><label for="f-hours">{t['hours']}<span class="hint">{t['hours_h']}</span></label><input class="mini num" id="f-hours" inputmode="decimal" autocomplete="off" value="{H['fullWeekHours']}"></div>
    <div class="row"><span class="l" id="l-year">{t['year']}</span><span class="seg" id="period" role="group" aria-labelledby="l-year"><button type="button" data-v="{NOWID}" aria-pressed="true">{t['y'].format(Y0)}</button><button type="button" data-v="{NEXTID}" aria-pressed="false">{t['y'].format(Y1)}</button></span></div>
  </div>
</section>
<section class="t-out" aria-label="{t['out_l']}">
  {stale_note(ST['now'], NOW['minWage']['until'], NXT['minWage']['until'], ST['next'])}
  <div class="slip is-ex" id="slip">{pre['slip']}</div>
  <p class="sr" id="live" aria-live="polite"></p>
  <p class="fine">{t['fine']}</p>
</section>
{texts.key_facts('hourly', lang)}
{pre_next({'slip': PRE[lang]['hourlyNext']['slip']})}{PERIOD_JS}'''
    return tool_page(lang, 'hourly', 'hourly/', ['pay-data.js', 'pay-core.js', 'pay-view.js'], grid, texts.hourly_below(lang), {'ph': t['ph'], 'amtL': t['amt_l']})


# ───────── 실업급여(한국어) ─────────
def ub_page():
    lang, t, pre, U = 'ko', texts.PAGES['ub']['ko'], PRE['ko']['ub'], D['unemployment']
    bands, AGE = texts.band_labels(), texts.AGE
    grid = f'''<section class="t-in">
  <h1>{t['h1']}</h1>
  <p class="t-sub">{t['sub']}</p>
  <div class="form" id="form">
    <div class="fld"><label for="f-leave">이직일(마지막으로 일한 날)</label><input type="date" id="f-leave" min="1950-01-01" max="2100-12-31" aria-describedby="h-leave"><span class="hint" id="h-leave">{t['leave_h']}</span></div>
    <div class="fld"><label for="f-wages">퇴직 전 3개월 동안 받은 임금(세전)</label><span class="inp-u"><input type="text" id="f-wages" inputmode="numeric" autocomplete="off" placeholder="예: {c(F['ub']['mid']['wages3m'] // texts.MAN)}" aria-describedby="u-f-wages r-f-wages">{unit('f-wages', PRE['ko']['unit']['man'])}</span><p class="read hint" id="r-f-wages">{t['wages_h']}</p></div>
    <div class="fld2">
      <div class="fld"><label for="f-hours">하루 소정근로시간</label><select id="f-hours" aria-describedby="h-hours">{''.join(f'<option value="{h}"{" selected" if h == U["maxDayHours"] else ""}>{h}시간</option>' for h in range(1, U['maxDayHours'] + 1))}</select></div>
      <div class="fld"><label for="f-band">고용보험 가입 기간</label><select id="f-band">{''.join(f'<option value="{i}"{" selected" if i == 2 else ""}>{b}</option>' for i, b in enumerate(bands))}</select></div>
    </div>
    <p class="hint" id="h-hours">{t['hours_h']}</p>
    <div class="row"><span class="l" id="l-age">이직일의 나이</span><span class="seg" id="age" role="group" aria-labelledby="l-age"><button type="button" data-v="0" aria-pressed="true">{AGE}세 미만</button><button type="button" data-v="1" aria-pressed="false">{AGE}세 이상·장애인</button></span></div>
  </div>
</section>
<section class="t-out" aria-label="계산 결과">
  {stale_note(PRE['ko']['stale']['ub'], U['until'], U['next']['until'], PRE['ko']['stale']['ubAfter'])}{STALE_JS}
  <div class="slip is-ex" id="slip">{pre['slip']}</div>
  <p class="sr" id="live" aria-live="polite"></p>
  <p class="fine">{t['fine']}</p>
</section>
{texts.key_facts('ub', lang)}'''
    return tool_page(lang, 'ub', 'unemployment/', ['pay-data.js', 'pay-core.js', 'pay-view.js'], grid, texts.ub_below(), {})


# ───────── 연차(한국어) ─────────
def leave_page():
    lang, t, pre = 'ko', texts.PAGES['leave']['ko'], PRE['ko']['leave']
    grid = f'''<section class="t-in">
  <h1>{t['h1']}</h1>
  <p class="t-sub">{t['sub']}</p>
  <div class="form" id="form">
    <div class="fld"><label for="f-join">입사일</label><input type="date" id="f-join" min="1950-01-01" max="2100-12-31" aria-describedby="h-join"><span class="hint" id="h-join">오늘 기준으로 지금까지 생긴 연차와 다음에 생기는 날을 보여 줘요.</span></div>
  </div>
</section>
<section class="t-out" aria-label="계산 결과">
  <div class="slip is-ex" id="slip">{pre['slip']}</div>
  <p class="sr" id="live" aria-live="polite"></p>
  <p class="fine">{t['fine']}</p>
</section>
{texts.key_facts('leave', lang)}'''
    return tool_page(lang, 'leave', 'annual-leave/', ['pay-data.js', 'pay-core.js', 'pay-view.js'], grid, texts.leave_below(), {})


# ───────── 연봉 실수령액 표 ─────────
def table_page(lang):
    t, ko, p = texts.PAGES['table'][lang], lang == 'ko', prefix(lang)
    money = (lambda n: c(n)) if ko else (lambda n: c(n))
    names = t['cols']
    rows = ''
    for r in CALC['table']['rows']:
        a, ln = r['annual'], r['line']
        label = man0(a) if ko else f'₩{a // 1000000:,}M'
        rows += (f'<tr id="a{a // 10000}" data-a="{a}"><th scope="row"><a href="{p}#a={a}" title="{t["open"].format(man(a) if ko else wn(a))}">{label}</a></th>'
                 f'<td class="g">{money(r["gross"])}</td>'
                 + ''.join(f'<td class="d">{money(ln[k])}</td>' for k in ('pension', 'health', 'care', 'employment', 'incomeTax', 'localTax'))
                 + f'<td>{money(r["deductions"])}</td><td class="net">{money(r["net"])}</td></tr>\n')
    head_cells = (f'<th scope="col">{names[0]}</th><th scope="col" class="g">{names[1]}</th>'
                  + ''.join(f'<th scope="col" class="d">{n}</th>' for n in names[2:8])
                  + f'<th scope="col">{names[8]}</th><th scope="col">{names[9]}</th>')
    body = f'''<div class="wrap" data-page="table">
<div class="doc" style="max-width:none">
  <p class="crumb"><a href="{p}">{UI[lang]['home']}</a></p>
  <h1>{t['h1']}</h1>
  <p class="meta">{t['assume']}</p>
  <div class="pay-find"><label for="find">{t['find']}</label><span class="inp-u"><input id="find" type="text" inputmode="{'numeric' if ko else 'text'}" autocomplete="off" placeholder="{t['find_ph']}" aria-describedby="u-find read">{unit('find', PRE[lang]['unit']['man'])}</span><p class="read" id="read"></p>
    <button type="button" class="btn ghost" id="b-all" aria-pressed="false" data-on="{t['less']}" data-off="{t['all']}">{t['all']}</button></div>
  <p class="tbl-hint" id="hint" hidden>{t['hint']}</p>
  <div class="tbl pay" id="tbl"><table class="pay-t"><caption class="sr">{t['caption']}</caption><thead><tr>{head_cells}</tr></thead><tbody>
{rows}</tbody></table></div>
  <p class="fine">{t['fine']}</p>
</div>
</div>
{ad_slot(lang, 'mid')}
<div class="wrap below">
{texts.table_below(lang)}
</div>
{ad_slot(lang, 'bottom')}'''
    ld = [{'@context': 'https://schema.org', '@type': 'WebPage', 'name': t['h1'], 'url': url(lang, 'table/'), 'inLanguage': lang, 'description': t['desc'],
           'dateModified': lastmod(prefix(lang) + 'table/'), 'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}},
          crumbs(lang, [(UI[lang]['home'], ''), (t['h1'], 'table/')])]
    return page(lang, head(lang, t['title'], t['desc'], 'table/', alt='table/', jsonld=ld, scripts=['pay-data.js', 'pay-core.js']), body, 'table/', 'table/',
                {'page': 'table', 'readAs': t['read_as'], 'none': t['none']})


# ───────── 가이드 ─────────
def article_page(a, lang):
    u, p = UI[lang], prefix(lang)
    path = f'guide/{a["slug"]}/'
    alt = f'guide/{a["pair"]}/' if a.get('pair') else None
    day = lastmod(p + path)
    ld = [{'@context': 'https://schema.org', '@type': 'Article', 'headline': a['h1'], 'description': a['desc'], 'inLanguage': lang,
           'datePublished': TODAY, 'dateModified': day, 'mainEntityOfPage': url(lang, path),
           'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'},
           'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}},
          crumbs(lang, [(u['guides'], 'guide/'), (a['h1'], path)])]
    sources = ''.join(f'<li>{src(k, lang)}</li>' for k in a['sources'])
    src_h = ('출처' if lang == 'ko' else 'Sources')
    src_note = (f'{date_ko(CHECKED)}에 직접 열어 확인했어요.' if lang == 'ko' else f'Opened and checked on {date_en(CHECKED)}. The pages are in Korean.')
    body = f'''<div class="wrap">
<article class="doc">
  <p class="crumb"><a href="{p}guide/">{u['guides']}</a></p>
  <h1>{esc(a['h1'])}</h1>
  <p class="meta">{u['checked']} <time datetime="{day}">{day}</time> · {'루멘랩' if lang == 'ko' else 'Lumen Lab'}</p>
  <div class="prose">
{a['body']}
  <h2>{src_h}</h2>
  <p class="note">{src_note}</p>
  <ul class="src-list">{sources}</ul>
  </div>
  <div class="try"><p>{a['try'][0]}</p><a class="btn" href="{p}{a['try'][2]}">{a['try'][1]}</a></div>
</article>
</div>
{ad_slot(lang, 'mid', center=True)}
<div class="wrap below">
  <section class="sec narrow links" style="margin:0 auto;width:100%"><h2>{'다른 글' if lang == 'ko' else 'More guides'}</h2><ul class="glist">{''.join(f'<li><a href="{p}guide/{b["slug"]}/"><b>{esc(b["h1"])}</b><span>{esc(b["desc"])}</span></a></li>' for b in articles.ARTICLES[lang] if b['slug'] != a['slug'])}</ul></section>
</div>
{ad_slot(lang, 'bottom', center=True)}'''
    return page(lang, head(lang, a['title'], a['desc'], path, alt=alt, jsonld=ld, og_type='article'), body, path, alt, {'page': 'article'})


def guide_index(lang):
    u, p, t = UI[lang], prefix(lang), texts.PAGES['guide'][lang]
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/"><b>{esc(a["h1"])}</b><span>{esc(a["desc"])}</span></a></li>' for a in articles.ARTICLES[lang])
    body = f'''<div class="wrap"><div class="doc"><h1>{t['h1']}</h1><p class="meta">{t['lead']}</p><ul class="glist">{items}</ul>
<div class="below" style="margin-top:36px">{texts.tool_cards(lang, None)}</div></div></div>'''
    return page(lang, head(lang, t['title'], t['desc'], 'guide/', alt='guide/', ads=False), body, 'guide/', 'guide/', {'page': 'doc'})


def doc_page(lang, key, path, inner):
    t = texts.PAGES[key][lang]
    body = f'<div class="wrap"><article class="doc">{inner}</article></div>'
    return page(lang, head(lang, t['title'], t['desc'], path, alt=path, ads=False), body, path, path, {'page': 'doc'})


def not_found():
    body = f'''<div class="wrap"><div class="nf">
  <div class="slip">
    <div class="slip-h"><b>404</b><span class="asof" lang="en">Not found</span></div>
    <h1><span lang="ko">찾는 페이지가 없어요</span> · <span lang="en">This page doesn’t exist</span></h1>
    <div class="ln"><span lang="ko"><a href="/">연봉 실수령액 계산기로 가기</a></span></div>
    <div class="ln"><span lang="en"><a href="/en/">Go to the Korea net salary calculator</a></span></div>
  </div>
</div></div>'''
    title = {'ko': '페이지를 찾을 수 없어요 | 떼고얼마', 'en': 'Page not found | Takehome Korea'}
    h_ = head('ko', '페이지를 찾을 수 없어요 · Page not found | 떼고얼마 · Takehome Korea', '찾는 페이지가 없어요. This page doesn’t exist.', '', noindex=True, ads=False)
    # 없는 주소 어디서나 이 한 장이 나온다. 주소가 /en/ 아래면 제목·언어·머리 링크를 영어로, 아니면 한국어로 맞춘다(첫 그림 전에)
    js = ("<script>(function(){var en=/^\\/en(\\/|$)/.test(location.pathname),h=document.documentElement,b=document.getElementById('nf-brand'),o=document.getElementById('nf-other');"
          f"document.title=en?{json.dumps(title['en'])}:{json.dumps(title['ko'], ensure_ascii=False)};"
          "if(en){h.lang='en';b.href='/en/';b.lastChild.textContent='Takehome Korea';b.lastChild.lang='en';o.href='/';o.textContent='\\ud55c\\uad6d\\uc5b4';o.lang='ko';o.hreflang='ko';"
          "document.querySelector('.skip').textContent='Skip to content'}})()</script>")
    return f'''{h_}
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="top"><div class="top-in wrap"><a class="brand" href="/" id="nf-brand">{LOGO}<span>떼고얼마</span></a><div class="side"><a href="/en/" id="nf-other" lang="en" hreflang="en">English</a></div></div></header>
{js}
<main id="main">
{body}
</main>
</body>
</html>
'''


# ───────── 쓰기 ─────────
def write(rel, text):
    p = ROOT / rel
    old = p.read_text(encoding='utf-8') if p.exists() else None
    if old != text:
        if CHECK:
            stale.append(rel)
            return
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding='utf-8')


def sitemap(paths):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in paths:
        out.append(f'  <url><loc>{SITE}{path}</loc><lastmod>{lastmod(path)}</lastmod></url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


def rss():
    items = ''
    for a in articles.ARTICLES['ko']:
        link = f'{SITE}/guide/{a["slug"]}/'
        y, m, d = (int(x) for x in lastmod(f'/guide/{a["slug"]}/').split('-'))
        pub = format_datetime(datetime(y, m, d, tzinfo=timezone.utc)).replace('+0000', 'GMT')
        items += (f'<item><title>{esc(a["h1"])}</title><link>{link}</link><guid>{link}</guid><pubDate>{pub}</pubDate>'
                  f'<description>{esc(a["desc"])}</description><content:encoded><![CDATA[{a["body"]}]]></content:encoded></item>\n')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>떼고얼마 가이드</title><link>{SITE}/</link><description>급여명세서, 4대 보험, 퇴직금, 주휴수당, 실업급여를 공식 출처와 계산 예로 풀어 쓴 글</description><language>ko</language>
{items}</channel></rss>
'''


def main():
    paths = []

    def put(lang, path, text):
        write(f'{prefix(lang).lstrip("/")}{path}index.html', text)
        paths.append(prefix(lang) + path)

    for lang in ('ko', 'en'):
        put(lang, '', net_page(lang))
        put(lang, 'table/', table_page(lang))
        put(lang, 'severance/', sev_page(lang))
        put(lang, 'hourly/', hourly_page(lang))
        if lang == 'ko':
            put(lang, 'unemployment/', ub_page())
            put(lang, 'annual-leave/', leave_page())
        put(lang, 'guide/', guide_index(lang))
        for a in articles.ARTICLES[lang]:
            put(lang, f'guide/{a["slug"]}/', article_page(a, lang))
        put(lang, 'about/', doc_page(lang, 'about', 'about/', texts.about(lang)))
        put(lang, 'privacy/', doc_page(lang, 'privacy', 'privacy/', texts.privacy(lang)))
    write('404.html', not_found())
    write('sitemap.xml', sitemap(paths))
    write('rss.xml', rss())
    if CHECK:
        if stale:
            print('실패  빌드 결과가 낡았어요: ' + ', '.join(stale[:8]))
            sys.exit(1)
        print(f'통과  빌드 결과가 최신이에요({len(paths)}장)')
    else:
        print(f'built {len(paths)} pages')


if __name__ == '__main__':
    main()
