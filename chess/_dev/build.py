#!/usr/bin/env python3
"""외울수(Fewmoves) 모든 HTML·sitemap.xml·404.html을 만든다: python3 chess/_dev/build.py  (--check 는 낡았는지만 본다)
화면 글 = _dev/content.py(UI·PAGES·TX), 오프닝 해설 = _dev/openings.py, 수 통계 = data/p/*.json(_dev/data/make_data.py가 만든다).
수순은 node + assets/chess.min.js(_dev/lines.mjs)로 둬 본다: 틀린 수가 있거나 end='mate' 함정이 메이트가 아니면 멈춘다.
data/p/*.json 의 이름 칸(n)에 해설 slug(4번째)를 넣는 것도 여기서 한다. 만든 파일은 손으로 고치지 않는다."""
import json
import math
import re
import subprocess
import sys
from html import escape as esc
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
sys.path.insert(0, str(DEV))
from content import UI, PAGES, TX, about, privacy  # noqa: E402
from openings import OPENINGS, GROUPS  # noqa: E402
import articles as ART  # noqa: E402

SITE = 'https://chess.lumenlab.page'
ADS_CLIENT = 'ca-pub-9496167591465154'
FIRST = '2026-11-04'
UPDATED = {}                 # 본문이 바뀐 페이지: {'/ko/openings/italian-game/': '2026-11-20'}
START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
START_EPD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -'
DEFAULT_BAND = 2             # app.js 와 같다(1600–1999)
BANDS = ['<1200', '1200–1599', '1600–1999', '2000+']
META = json.loads((ROOT / 'data' / 'meta.json').read_text(encoding='utf-8'))
BY_SLUG = {o['slug']: o for o in OPENINGS}
GROUP_NAME = dict(GROUPS)

BOOT = ("<script>(function(h){try{var n=(navigator.language||'').slice(0,2).toLowerCase();"
        "if(!localStorage.getItem('fm.lang')&&(h.lang==='ko'?n!=='ko':n==='ko'))h.classList.add('lb')}catch(e){}})(document.documentElement)</script>")

LOGO = ('<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="7" fill="var(--sq-d)"/>'
        '<path d="M0 7a7 7 0 0 1 7-7h7v14H0zM14 14h14v7a7 7 0 0 1-7 7h-7z" fill="var(--sq-l)"/>'
        '<path d="M7 21L19.5 8.5" stroke="var(--acc)" stroke-width="4.6" stroke-linecap="round"/><path d="M12.5 7.2h8.3v8.3" fill="none" stroke="var(--acc)" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>'
        '<path d="M7 21l13.5-3" stroke="var(--acc)" stroke-width="1.8" stroke-linecap="round" opacity=".75"/></svg>')
IC = {
    'first': '<path d="M6 5v14M18 6l-7 6 7 6" />',
    'prev': '<path d="M15 6l-6 6 6 6" />',
    'next': '<path d="M9 6l6 6-6 6" />',
    'last': '<path d="M18 5v14M6 6l7 6-7 6" />',
    'flip': '<path d="M8 4v15M4.5 15.5L8 19l3.5-3.5M16 20V5M12.5 8.5L16 5l3.5 3.5" />',
}


def icon(k):
    return f'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">{IC[k]}</svg>'


# ---------------------------------------------------------------- 숫자(core.js와 같은 모양)
def tofixed(x, d):
    m = 10 ** d
    v = math.floor(x * m + 0.5 + 1e-9) / m
    return f'{v:.{d}f}'


def pct(x, d=0):
    v = x * 100
    if 0 < v < 0.1:
        return '<0.1%'
    if 0 < v < 1:
        return tofixed(v, 1) + '%'
    return tofixed(v, d) + '%'


def count(n, lang):
    if lang == 'ko':
        if n >= 10000:
            return re.sub(r'\.0$', '', tofixed(n / 10000, 0 if n >= 100000 else 1)) + '만'
        return f'{n:,}'
    if n >= 1e6:
        return re.sub(r'\.0$', '', tofixed(n / 1e6, 1)) + 'M'
    if n >= 1e4:
        return f'{math.floor(n / 1e3 + 0.5)}k'
    return f'{n:,}'


def fmt(s, **k):
    return re.sub(r'\{(\w+)\}', lambda m: str(k.get(m.group(1), '')), s)


# ---------------------------------------------------------------- 통계 조각
SHARDS = {}
for f in sorted((ROOT / 'data' / 'p').glob('*.json')):
    SHARDS[f.stem] = json.loads(f.read_text(encoding='utf-8'))
E, N = {}, {}
for sh in SHARDS.values():
    E.update(sh['e'])
    N.update(sh['n'])


def sumband(arr, off, band):
    w = d = b = 0
    for k in range(4):
        if band >= 0 and k != band:
            continue
        w += arr[off + k * 3]
        d += arr[off + k * 3 + 1]
        b += arr[off + k * 3 + 2]
    return {'w': w, 'd': d, 'b': b, 'n': w + d + b}


def stats(entry, band):
    if not entry:
        return None
    played, reached = sumband(entry[0], 0, band), sumband(entry[1], 0, band)
    moves = []
    for row in entry[2:]:
        s = sumband(row, 1, band)
        if not s['n']:
            continue
        s.update(san=row[0], share=s['n'] / played['n'] if played['n'] else 0)
        moves.append(s)
    moves.sort(key=lambda m: -m['n'])
    return dict(reached, played=played['n'], moves=moves)


def reached(epd, band=-1):
    e = E.get(epd)
    return sumband(e[1], 0, band) if e else {'w': 0, 'd': 0, 'b': 0, 'n': 0}


START_N = [reached(START_EPD, b)['n'] for b in range(4)] + [reached(START_EPD)['n']]


def played(epd, band=-1):
    """그 국면에서 다음 수까지 센 판(탐색기 '이 국면에서 둔 판'과 같은 수). 해설·카드·표의 판 수는 이걸 쓴다."""
    e = E.get(epd)
    return sumband(e[0], 0, band) if e else {'w': 0, 'd': 0, 'b': 0, 'n': 0}


def fnv(s):
    h = 0x811c9dc5
    for ch in s.encode():
        h ^= ch
        h = (h * 0x01000193) & 0xffffffff
    return h


def shard_id(epd):
    return f'{fnv(epd) % 256:02x}'


# ---------------------------------------------------------------- 수순 둬 보기(node)
def play(lines):
    r = subprocess.run(['node', str(DEV / 'lines.mjs')], input=json.dumps(lines), capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def numbered(sans, start=0):
    out = []
    for i, s in enumerate(sans):
        p = start + i
        if p % 2 == 0:
            out.append(f'{p // 2 + 1}.{s}')
        elif i == 0:
            out.append(f'{p // 2 + 1}...{s}')
        else:
            out.append(s)
    return ' '.join(out)


def name_of(epds, lang):
    for i in range(len(epds) - 1, -1, -1):
        n = N.get(epds[i])
        if n:
            return {'eco': n[0], 'name': n[2] if lang == 'ko' else n[1], 'slug': n[3] if len(n) > 3 else '', 'ply': i}
    return None


def check_lines():
    """모든 수순을 둬 보고 결과를 오프닝에 붙인다. 틀리면 멈춘다."""
    jobs = []
    for o in OPENINGS:
        jobs.append(('main', o, None, o['line']))
        for v in o['vars']:
            jobs.append(('var', o, v, v['line']))
        for t in o['traps']:
            jobs.append(('trap', o, t, t['line']))
    res = play([j[3] for j in jobs] + ['e4', 'd4'])
    bad = []
    for (kind, o, x, line), r in zip(jobs, res):
        if not r['ok']:
            bad.append(f'{o["slug"]} {kind}: {line} → {r["err"]}')
            continue
        if kind == 'main':
            o['_r'] = r
        else:
            x['_r'] = r
            if kind == 'trap' and x['end'] == 'mate' and not r['mate']:
                bad.append(f'{o["slug"]} 함정이 메이트가 아님: {line}')
    if bad:
        sys.exit('수순 오류:\n  ' + '\n  '.join(bad))
    return {'e4': res[-2]['epd'][0], 'd4': res[-1]['epd'][0]}


def covers_slug(name):
    best, blen = '', -1
    for o in OPENINGS:
        for c in o['covers']:
            if (name == c or name.startswith(c + ':') or name.startswith(c + ',')) and len(c) > blen:
                best, blen = o['slug'], len(c)
    return best


def write_slugs():
    """data/p 이름 칸에 해설 slug를 넣는다(없으면 3칸). 바뀐 조각만 다시 쓴다."""
    changed = 0
    for sid, sh in SHARDS.items():
        dirty = False
        for epd, v in sh['n'].items():
            slug = covers_slug(v[1])
            want = v[:3] + ([slug] if slug else [])
            if want != v:
                sh['n'][epd] = want
                N[epd] = want
                dirty = True
        if dirty:
            changed += 1
            (ROOT / 'data' / 'p' / f'{sid}.json').write_text(
                json.dumps(sh, separators=(',', ':'), ensure_ascii=False, sort_keys=True), encoding='utf-8')
    return changed


def check_names():
    """오프닝 주요 수순 끝 국면의 이름이 그 해설로 이어지는지 본다."""
    bad = []
    for o in OPENINGS:
        nm = name_of([START_EPD] + o['_r']['epd'], 'en')
        if not nm or nm['slug'] != o['slug']:
            bad.append(f'{o["slug"]}: 끝 국면 이름 {nm and nm["name"]} → {nm and nm["slug"]}')
        if o['_r']['epd'][-1] not in E:
            bad.append(f'{o["slug"]}: 끝 국면 통계 없음')
    if bad:
        sys.exit('이름 오류:\n  ' + '\n  '.join(bad))


# ---------------------------------------------------------------- 머리·꼬리
def prefix(lang):
    return '/ko/' if lang == 'ko' else '/'


def url(lang, path=''):
    return SITE + prefix(lang) + path


def lastmod(full):
    return UPDATED.get(full, FIRST)


def head(lang, title, desc, path, jsonld=(), og_type='website', noindex=False, ads=True):
    assert len(title) <= (65 if lang == 'en' else 60), ('제목이 길다', title, len(title))
    assert len(desc) <= 160, ('설명이 길다', desc, len(desc))
    canon = url(lang, path)
    links = []
    if not noindex:
        links = [f'<link rel="canonical" href="{canon}">',
                 f'<link rel="alternate" hreflang="en" href="{url("en", path)}">',
                 f'<link rel="alternate" hreflang="ko" href="{url("ko", path)}">',
                 f'<link rel="alternate" hreflang="x-default" href="{url("en", path)}">']
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
{'<meta name="robots" content="noindex">' + chr(10) if noindex else ''}<meta name="theme-color" content="#f6f3ec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14161b" media="(prefers-color-scheme: dark)">
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
<link rel="stylesheet" href="/assets/pieces.css">
<link rel="stylesheet" href="/assets/style.css">
{BOOT}
{ld}{ad}</head>'''


def header(lang, path, current=None):
    u = UI[lang]
    p = prefix(lang)
    other = 'en' if lang == 'ko' else 'ko'
    items = [('explore', ''), ('openings', 'openings/'), ('practice', 'practice/')]
    nav = ''.join(f'<a href="{p}{rel}"{" aria-current=" + chr(34) + "page" + chr(34) if k == current else ""}>{esc(u["nav"][k])}</a>' for k, rel in items)
    offer = ('이 페이지는 한국어로도 있어요.', '한국어로 보기') if lang == 'en' else ('This page is also in English.', 'Read in English')
    return f'''<div class="langbar" lang="{other}"><span>{offer[0]}</span><a href="{prefix(other)}{path}" hreflang="{other}">{offer[1]}</a><button type="button" aria-label="{UI[other]['close']}">✕</button></div>
<a class="skip" href="#main">{u['skip']}</a>
<header class="top"><div class="top-in wrap">
  <a class="brand" href="{p}">{LOGO}{u['brand']}</a>
  <nav class="nav" aria-label="{u['nav_label']}">{nav}</nav>
  <span class="sp"></span>
  <div class="aux"><a href="{prefix(other)}{path}" lang="{other}" hreflang="{other}">{u['lang_other']}</a></div>
</div></header>'''


def lumen_html(lang):
    """루멘랩 칸: 4×4 작은 판에서 나이트가 L자(위로 두 칸, 옆으로 한 칸)로 뛰어 '루멘랩' 칸에 앉는다."""
    u = UI[lang]
    home = 'https://lumenlab.page/' + ('en/' if lang == 'en' else '')
    return (f'<a class="lumen" href="{home}"><span class="lmini" aria-hidden="true"><span class="lsq"></span>'
            '<svg class="lpath" viewBox="0 0 96 96"><path pathLength="1" d="M60 60V12H84"/></svg><i class="pc wn"></i></span>'
            f'<span class="lumen-t"><b>{u["lumen_b"]}</b><small>{u["lumen_s"]}</small></span><span class="lumen-go" aria-hidden="true">→</span></a>')


def footer(lang):
    u = UI[lang]
    p = prefix(lang)
    return f'''<footer class="foot"><div class="wrap">
  {lumen_html(lang)}
  <p class="foot-links"><a href="{p}">{u['nav']['explore']}</a><a href="{p}openings/">{u['nav']['openings']}</a><a href="{p}practice/">{u['nav']['practice']}</a><a href="{p}about/">{u['about']}</a><a href="{p}privacy/">{u['privacy']}</a><a href="mailto:contact@lumenlab.page">{u['contact']}</a></p>
  <p class="foot-note">{u['data_note']}</p>
  <small>© 2026 Lumen Lab</small>
</div></footer>'''


def ad_slot(lang, name):
    return f'<div class="ad-wrap wrap" data-slot="{name}"><p class="ad-label">{UI[lang]["ad"]}</p><div class="ad-slot" data-ad="{name}" hidden></div></div>'


def cfg_script(cfg):
    return '<script type="application/json" id="fmc">' + json.dumps(cfg, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>'


GUIDES = {lang: {o['slug']: {'u': prefix(lang) + 'openings/' + o['slug'] + '/', 'n': o[lang]['name']} for o in OPENINGS} for lang in ('en', 'ko')}


def page(lang, head_html, body, path, current=None, cfg=None, scripts=True):
    base = {'lang': lang, 't': UI[lang]['js'], 'practiceUrl': prefix(lang) + 'practice/', 'guides': GUIDES[lang]}
    base.update(cfg or {})
    js = ''.join(f'<script src="/assets/{s}.js"></script>\n' for s in ('chess.min', 'core', 'board', 'app')) if scripts else '<script src="/assets/app.js"></script>\n'
    return f'''{head_html}
<body>
{header(lang, path, current)}
<main id="main">
{body}
</main>
{footer(lang)}
{cfg_script(base)}
{js}</body>
</html>
'''


# ---------------------------------------------------------------- 판·탐색기(첫 HTML에 미리 그린다)
FILES = 'abcdefgh'


def xy(sq, orient):
    f, r = FILES.index(sq[0]), int(sq[1])
    return (f, 8 - r) if orient == 'w' else (7 - f, r - 1)


def board_html(fen, orient='w', last=None):
    pcs, hl = [], []
    rows = fen.split(' ')[0].split('/')
    for r, row in enumerate(rows):
        f = 0
        for ch in row:
            if ch.isdigit():
                f += int(ch)
                continue
            sq = FILES[f] + str(8 - r)
            x, y = xy(sq, orient)
            pcs.append(f'<i class="pc {"w" if ch.isupper() else "b"}{ch.lower()}" style="transform:translate({x * 100}%,{y * 100}%)"></i>')
            f += 1
    for sq in (last or []):
        x, y = xy(sq, orient)
        hl.append(f'<i class="lm" style="transform:translate({x * 100}%,{y * 100}%)"></i>')
    co = ''
    for i in range(8):
        file = FILES[i] if orient == 'w' else FILES[7 - i]
        rank = 8 - i if orient == 'w' else i + 1
        co += f'<span class="cf{" dk" if i % 2 else ""}" style="left:{i * 12.5}%">{file}</span>'
        co += f'<span class="cr{"" if i % 2 else " dk"}" style="top:{i * 12.5}%">{rank}</span>'
    return f'<div class="bd" data-board><div class="bd-hl">{"".join(hl)}</div><div class="bd-co" aria-hidden="true">{co}</div><div class="bd-pc">{"".join(pcs)}</div></div>'


def rows_html(s, lang):
    T = UI[lang]['js']
    if not s or not s['moves']:
        return f'<tr class="empty"><td colspan="4">{esc(T["rows_none"])}</td></tr>'
    out = []
    for m in s['moves'][:12]:
        w, d, b = m['w'] / m['n'], m['d'] / m['n'], m['b'] / m['n']
        aria = fmt(T['wdl_aria'], w=pct(w), d=pct(d), b=pct(b))
        out.append(f'<tr data-san="{esc(m["san"])}"><th scope="row"><button type="button" class="mv">{esc(m["san"])}</button></th>'
                   f'<td class="sh"><span class="shb" style="--s:{tofixed(m["share"], 3)}"></span>{esc(pct(m["share"]))}</td>'
                   f'<td class="ng">{count(m["n"], lang)}</td>'
                   f'<td class="wdl"><span class="bar" role="img" aria-label="{esc(aria)}">'
                   f'<i class="w" style="width:{tofixed(w * 100, 1)}%">{esc(pct(w)) if w >= 0.12 else ""}</i>'
                   f'<i class="d" style="width:{tofixed(d * 100, 1)}%">{esc(pct(d)) if d >= 0.12 else ""}</i>'
                   f'<i class="b" style="width:{tofixed(b * 100, 1)}%">{esc(pct(b)) if b >= 0.12 else ""}</i></span></td></tr>')
    return ''.join(out)


def ml_html(sans, lang):
    if not sans:
        return f'<li class="ml-empty">{esc(UI[lang]["js"]["ml_empty"])}</li>'
    h = ''
    for i, s in enumerate(sans):
        if i % 2 == 0:
            h += f'<li><span class="mn">{i // 2 + 1}.</span>'
        h += f'<button type="button" data-ply="{i + 1}"{" aria-current=" + chr(34) + "true" + chr(34) if i + 1 == len(sans) else ""}>{esc(s)}</button>'
        if i % 2 == 1 or i == len(sans) - 1:
            h += '</li>'
    return h


def band_chips(lang, current=DEFAULT_BAND):
    u = UI[lang]
    chips = [(-1, u['band_all'])] + list(enumerate(BANDS))
    return (f'<div class="bands" role="group" aria-label="{u["band_lbl"]}"><span class="lbl">{u["band_lbl"]}</span>' +
            ''.join(f'<button type="button" class="chip" data-band="{b}" aria-pressed="{"true" if b == current else "false"}">{esc(t)}</button>' for b, t in chips) + '</div>')


def explorer(lang, r=None, orient='w', sync=False, head_html='', slug=''):
    """r = lines.mjs 결과(없으면 처음 국면)."""
    u, T = UI[lang], UI[lang]['js']
    sans = r['san'] if r else []
    epds = [START_EPD] + (r['epd'] if r else [])
    fen = r['fen'] if r else START_FEN
    last = [r['uci'][-1][:2], r['uci'][-1][2:4]] if r and r['uci'] else None
    nm = name_of(epds, lang)
    name = f'<span class="eco">{esc(nm["eco"])}</span><span>{esc(nm["name"])}</span>' if nm else f'<span>{esc(T["name_start"])}</span>'
    s = stats(E.get(epds[-1]), DEFAULT_BAND)
    band = BANDS[DEFAULT_BAND]
    sm = fmt(T['sum'], n=f'<b>{count(s["played"], lang)}</b>', band=esc(band)) if s and s['played'] else esc(fmt(T['sum_none'], band=band))
    g = GUIDES[lang].get(nm['slug']) if nm and nm['slug'] and nm['slug'] != slug else None
    guide = (f'<a class="guide-link" data-guide href="{g["u"]}">{u["guide_read"]} <b>{esc(g["n"])}</b></a>' if g
             else f'<a class="guide-link" data-guide href="{prefix(lang)}openings/" hidden>{u["guide_read"]} <b></b></a>')
    ctrls = ''.join(f'<button type="button" data-nav="{k}" aria-label="{u[k]}" title="{u[k]}"{" disabled" if (k in ("next", "last")) or (k in ("first", "prev") and not sans) else ""}>{icon(k)}</button>'
                    for k in ('first', 'prev', 'next', 'last', 'flip'))
    attrs = f' data-orient="{orient}"' + (f' data-slug="{slug}"' if slug else '') + (f' data-line="{".".join(r["uci"])}"' if r else '') + (' data-url="sync"' if sync else '')
    pr = prefix(lang) + 'practice/' + (f'?o={slug}' if slug else '')
    return f'''<section class="tool" data-explorer{attrs}><div class="wrap">
{head_html}<div class="grid">
<div class="bcol">
  {band_chips(lang)}
  <p class="namel" data-name>{name}</p>
  <div class="bwrap">{board_html(fen, orient, last)}</div>
  <div class="ctrls">{ctrls}</div>
</div>
<div class="panel">
  <p class="sum" data-sum>{sm}</p>
  <div class="mlbox"><ol class="ml" data-ml>{ml_html(sans, lang)}</ol></div>
  <div class="stbox"><table class="st"><thead><tr><th scope="col">{u['th_move']}</th><th scope="col">{u['th_share']}</th><th scope="col">{u['th_games']}</th><th scope="col">{u['th_wdl']}</th></tr></thead><tbody data-rows>{rows_html(s, lang)}</tbody></table></div>
  {guide}
  <div class="pfoot"><a class="btn" data-practice="w" href="{pr}">{u['practice_w']}</a><a class="btn ghost" data-practice="b" href="{pr}">{u['practice_b']}</a></div>
</div>
</div></div></section>'''


# ---------------------------------------------------------------- 정적 표·그림
def bar_html(w, d, b, lang, mini=False):
    n = w + d + b
    if not n:
        return ''
    a = fmt(UI[lang]['js']['wdl_aria'], w=pct(w / n), d=pct(d / n), b=pct(b / n))
    if mini:
        return (f'<span class="mini" role="img" aria-label="{esc(a)}"><i class="w" style="width:{tofixed(w / n * 100, 1)}%"></i>'
                f'<i class="d" style="width:{tofixed(d / n * 100, 1)}%"></i><i class="b" style="width:{tofixed(b / n * 100, 1)}%"></i></span>')
    segs = ''.join(f'<i class="{k}" style="width:{tofixed(v / n * 100, 1)}%">{esc(pct(v / n)) if v / n >= 0.12 else ""}</i>' for k, v in (('w', w), ('d', d), ('b', b)))
    return f'<span class="bar" role="img" aria-label="{esc(a)}">{segs}</span>'


def band_table(lang, epd, ply):
    t = TX[lang]
    rows = []
    for b in list(range(4)) + [-1]:
        s = stats(E.get(epd), b)
        pl = played(epd, b)
        n = pl['n']
        lab = t['band_all'] if b < 0 else BANDS[b]
        share = n / START_N[b] if n else 0
        top = s['moves'][0] if s and s['moves'] else None
        reply = (f'<span class="san">{esc(numbered([top["san"]], ply))}</span><small>{pct(top["share"])}</small>' if top else '—')
        rows.append(f'<tr{" class=" + chr(34) + "all" + chr(34) if b < 0 else ""}><th scope="row">{esc(lab)}</th><td class="gs">{count(n, lang)}<small>{pct(share, 1)}</small></td>'
                    f'<td class="wdl">{bar_html(pl["w"], pl["d"], pl["b"], lang) if n else ""}</td><td class="gs">{reply}</td></tr>')
    return (f'<div class="tblbox"><table class="tbl bt"><thead><tr><th scope="col">{t["th_band"]}</th><th scope="col">{t["th_games"]} <small>({t["th_share"]})</small></th>'
            f'<th scope="col">{t["th_result"]}</th><th scope="col">{t["th_reply"]}</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>')


def shares_table(lang, epd, ply, k=6):
    """레이팅대별 다음 수 비율(첫 화면): 줄 = 전체에서 많이 둔 수 k개."""
    t = TX[lang]
    allm = stats(E.get(epd), -1)['moves'][:k]
    per = [stats(E.get(epd), b) for b in range(4)]
    head_ = ''.join(f'<th scope="col">{esc(b)}</th>' for b in BANDS)
    rows = []
    for m in allm:
        cells = []
        for s in per:
            mm = next((x for x in s['moves'] if x['san'] == m['san']), None)
            v = mm['share'] if mm else 0
            cells.append(f'<td><span class="shb" style="--s:{tofixed(v, 3)}"></span>{pct(v)}</td>')
        rows.append(f'<tr><th scope="row"><span class="san">{esc(numbered([m["san"]], ply))}</span></th>{"".join(cells)}</tr>')
    return (f'<div class="tblbox"><table class="tbl sh-t"><thead><tr><th scope="col">{t["move"]}</th>{head_}</tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div>')


def tree_svg(lang, o, kids):
    """수순 가지: 뿌리 = 주요 수순 끝, 1단 = 자주 두는 수(최대 4), 2단 = 그 뒤 자주 두는 수(최대 3). 선 굵기 = 비율."""
    r = o['_r']
    ply = len(r['san'])
    leaves = sum(max(1, len(k['kids'])) for k in kids)
    RH, W = 32, 450
    H = leaves * RH + 16
    x0, x1, x2 = 4, 158, 318
    y0 = H / 2
    paths, texts = [], []
    yi = 8
    root = numbered([r['san'][-1]], ply - 1)
    for k in kids:
        nleaf = max(1, len(k['kids']))
        yc = yi + nleaf * RH / 2
        sw = 2 + k['share'] * 22
        paths.append(f'<path class="br" d="M{x0 + 80} {y0:.0f}C{x0 + 120} {y0:.0f} {x1 - 44} {yc:.0f} {x1 - 6} {yc:.0f}" stroke-width="{sw:.1f}"/>')
        texts.append(f'<text x="{x1}" y="{yc + 5:.0f}">{esc(numbered([k["san"]], ply))}</text><text class="tp" x="{x1 + 108}" y="{yc + 5:.0f}" text-anchor="end">{pct(k["share"])}</text>')
        for j, g in enumerate(k['kids']):
            yg = yi + j * RH + RH / 2
            sw2 = 1.5 + g['share'] * 18
            paths.append(f'<path class="br" d="M{x1 + 114} {yc:.0f}C{x1 + 140} {yc:.0f} {x2 - 34} {yg:.0f} {x2 - 6} {yg:.0f}" stroke-width="{sw2:.1f}" opacity=".8"/>')
            texts.append(f'<text x="{x2}" y="{yg + 5:.0f}">{esc(numbered([g["san"]], ply + 1))}</text><text class="tp" x="{W - 4}" y="{yg + 5:.0f}" text-anchor="end">{pct(g["share"])}</text>')
        yi += nleaf * RH
    texts.append(f'<rect class="rt" x="{x0}" y="{y0 - 16:.0f}" width="76" height="32" rx="8"/><text class="rtt" x="{x0 + 38}" y="{y0 + 5:.0f}" text-anchor="middle">{esc(root)}</text>')
    alt = ', '.join(f'{numbered([k["san"]], ply)} {pct(k["share"])}' for k in kids)
    return f'<svg viewBox="0 0 {W} {H:.0f}" role="img" aria-label="{esc(alt)}">{"".join(paths)}{"".join(texts)}</svg>'


def tree_kids(o):
    s = stats(E.get(o['_r']['epd'][-1]), -1)
    out = []
    for m in s['moves']:
        if len(out) >= 4 or (m['share'] < 0.04 and len(out) >= 2):
            break
        out.append({'san': m['san'], 'share': m['share'], 'kids': []})
    return out


def fill_tree(kidmap):
    lines, keys = [], []
    for o, kids in kidmap:
        for k in kids:
            lines.append(o['line'] + ' ' + k['san'])
            keys.append(k)
    for k, r in zip(keys, play(lines)):
        if not r['ok']:
            sys.exit('가지 수 오류: ' + r['err'])
        s = stats(E.get(r['epd'][-1]), -1)
        if not s:
            continue
        for m in s['moves']:
            if len(k['kids']) >= 3 or m['share'] < 0.05:
                break
            k['kids'].append({'san': m['san'], 'share': m['share']})


def card(lang, o):
    r = o['_r']
    n = played(r['epd'][-1])
    side = TX[lang]['for_w'] if o['side'] == 'w' else TX[lang]['for_b']
    return (f'<li class="card"><a href="{prefix(lang)}openings/{o["slug"]}/">{esc(o[lang]["name"])}</a>'
            f'<p class="mvs">{esc(numbered(r["san"]))}</p>'
            f'<p class="meta"><span class="dot {o["side"]}" role="img" aria-label="{side}" title="{side}"></span>{bar_html(n["w"], n["d"], n["b"], lang, mini=True)}'
            f'<span>{fmt(TX[lang]["games_n"], n=count(n["n"], lang))}</span></p></li>')


# ---------------------------------------------------------------- 페이지
def org():
    return {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}


def app_ld(lang, name, desc, path):
    return {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': name, 'url': url(lang, path), 'description': desc,
            'applicationCategory': 'GameApplication', 'operatingSystem': 'Any', 'inLanguage': lang, 'isAccessibleForFree': True,
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}, 'publisher': org()}


def crumbs_ld(lang, items):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList',
            'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': url(lang, p)} for i, (n, p) in enumerate(items)]}


def by_played(lst):
    return sorted(lst, key=lambda o: -played(o['_r']['epd'][-1])['n'])


def popular(n=8):
    return by_played([o for o in OPENINGS if not o['hub']])[:n]


def home_page(lang, tops):
    P, t, u = PAGES[lang]['home'], TX[lang], UI[lang]
    games = f'{math.floor(META["games"] / 10000 + 0.5):,}만' if lang == 'ko' else f'{META["games"] / 1e6:.1f} million'
    hh = f'<div class="tool-head"><h1>{P["h1"]}</h1><p class="why">{fmt(P["why"], games=games)}</p></div>\n'
    body = explorer(lang, None, 'w', sync=True, head_html=hh)
    cards = ''.join(card(lang, o) for o in popular())
    how = ''.join(f'<li>{esc(x)}</li>' for x in t['how'])
    body += f'''
<section class="sec"><div class="wrap">
  <h2>{t['popular_h']}</h2>
  <ul class="cards">{cards}</ul>
  <p><a class="btn ghost" href="{prefix(lang)}openings/">{fmt(t['all_openings'], n=len(OPENINGS))}</a></p>
</div></section>
{ad_slot(lang, 'mid')}
<section class="sec"><div class="wrap">
  <h2>{t['first_h']}</h2><p class="prose">{t['first_p']}</p>
  {shares_table(lang, START_EPD, 0)}
  <h2>{t['e4_h']}</h2>
  {shares_table(lang, tops['e4'], 1)}
  <h2>{t['d4_h']}</h2>
  {shares_table(lang, tops['d4'], 1)}
</div></section>
<section class="sec"><div class="wrap">
  <a class="read" href="{guide_link_home(lang)}"><small>{t['read_lbl']}</small><b>{esc(ART.META[lang]['h1'])}</b><span>{esc(ART.META[lang]['desc'])}</span></a>
</div></section>
<section class="sec"><div class="wrap prose">
  <h2>{t['how_h']}</h2>
  <ol>{how}</ol>
  <p class="note">{u['data_note']}</p>
</div></section>
{ad_slot(lang, 'bottom')}'''
    h = head(lang, P['title'], P['desc'], '', [app_ld(lang, u['brand'], P['desc'], '')])
    return '', page(lang, h, body, '', 'explore')


def list_page(lang):
    P, t = PAGES[lang]['openings'], TX[lang]
    groups = ''
    for g, names in GROUPS:
        cards = ''.join(card(lang, o) for o in by_played([o for o in OPENINGS if o['group'] == g]))
        groups += f'<h2 class="group-h" id="{g}">{esc(names[lang])}</h2><ul class="cards">{cards}</ul>\n'
    body = f'''<div class="wrap sec">
  <h1>{P['h1']}</h1>
  <p class="lead">{P['lead']}</p>
  {groups}
</div>'''
    desc = fmt(P['desc'], n=len(OPENINGS))
    h = head(lang, P['title'], desc, 'openings/', [crumbs_ld(lang, [(UI[lang]['brand'], ''), (t['crumb'], 'openings/')])], ads=False)
    return 'openings/', page(lang, h, body, 'openings/', 'openings')


def guide_title(lang, o):
    suffix = ' | ' + UI[lang]['brand']
    t = o[lang]['title']
    return t + suffix if len(t + suffix) <= (65 if lang == 'en' else 60) else t


def opening_page(lang, o, kids):
    L, t, u = o[lang], TX[lang], UI[lang]
    r = o['_r']
    ply = len(r['san'])
    path = f'openings/{o["slug"]}/'
    end = r['epd'][-1]
    n_all = played(end)
    eco = name_of([START_EPD] + r['epd'], lang)['eco']
    side = t['for_w'] if o['side'] == 'w' else t['for_b']
    line_txt = numbered(r['san'])
    hh = ''
    top = f'''<div class="wrap ohead">
  <p class="crumb"><a href="{prefix(lang)}openings/">{t['crumb']}</a> <span aria-hidden="true">›</span> {esc(GROUP_NAME[o['group']][lang])}</p>
  <h1>{esc(L['title'])}</h1>
  <p class="olead">{esc(L['lead'])}</p>
  <p class="ometa"><span class="dot {o['side']}"></span><span>{side}</span><span class="san">{esc(line_txt)}</span><span>{fmt(t['seen'], p=pct(n_all['n'] / START_N[4], 1))}</span></p>
</div>'''
    body = top + '\n' + explorer(lang, r, o['side'], head_html=hh, slug=o['slug'])
    ideas = (f'<div class="ideas"><div class="idea"><h3><span class="dot w"></span>{t["white"]}</h3><ul>{"".join(f"<li>{esc(x)}</li>" for x in L["white"])}</ul></div>'
             f'<div class="idea"><h3><span class="dot b"></span>{t["black"]}</h3><ul>{"".join(f"<li>{esc(x)}</li>" for x in L["black"])}</ul></div></div>')
    vars_ = ''
    for i, v in enumerate(o['vars']):
        vr = v['_r']
        vid = f'v{i}'
        k = ply if vr['san'][:ply] == r['san'] else 0      # 주요 수순과 다른 순서로 오는 갈래는 처음부터 적는다
        vs = numbered(vr['san'][k:], k)
        rn = played(vr['epd'][-1])
        st = (fmt(t['var_stats'], n=count(rn['n'], lang), w=pct(rn['w'] / rn['n']), d=pct(rn['d'] / rn['n']), b=pct(rn['b'] / rn['n'])) if rn['n'] else t['var_rare'])
        vars_ += (f'<li class="var"><button type="button" class="var-h" data-fold aria-expanded="false" aria-controls="{vid}">'
                  f'<span><span class="vn">{esc(v[lang]["name"])}</span>{"" if re.search(r"[0-9][.]", v[lang]["name"]) else " <span class=" + chr(34) + "vs" + chr(34) + ">" + esc(vs) + "</span>"}</span>'
                  f'<svg class="chev" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button>'
                  f'<div class="var-b" id="{vid}"><div><p>{esc(v[lang]["note"])}</p><p class="vst">{bar_html(rn["w"], rn["d"], rn["b"], lang, mini=True)} {esc(st)}</p>'
                  f'<a class="line-btn" href="{prefix(lang)}?m={".".join(vr["uci"])}" data-goto="{".".join(vr["uci"])}">{t["show_board"]}: {esc(numbered(vr["san"]))}</a></div></div></li>')
    traps = ''
    for tr in o['traps']:
        tr_r = tr['_r']
        mate = f'<small>{t["mate"]}</small>' if tr['end'] == 'mate' else ''
        pen = tr_r['epd'][-2] if len(tr_r['epd']) > 1 else START_EPD
        row = next((x for x in (E.get(pen) or [None, None])[2:] if x[0] == tr_r['san'][-1]), None)
        tn = sum(row[1:]) if row else 0
        tline = fmt(t['trap_n'], n=count(tn, lang)) if tn else t['trap_rare']
        traps += (f'<div class="trap"><h3>{esc(tr[lang]["title"])}</h3><p>{esc(tr[lang]["text"])}</p><p class="vst">{esc(tline)}</p>'
                  f'<a class="line-btn" href="{prefix(lang)}?m={".".join(tr_r["uci"])}" data-goto="{".".join(tr_r["uci"])}">{t["show_board"]}: {esc(numbered(tr_r["san"]))}{mate}</a></div>')
    rel = ''.join(card(lang, x) for x in by_played([x for x in OPENINGS if x['group'] == o['group'] and x is not o])[:6])
    pr = prefix(lang) + 'practice/?o=' + o['slug']
    sidename = t['white'] if o['side'] == 'w' else t['black']
    other = 'b' if o['side'] == 'w' else 'w'
    pr2 = prefix(lang) + 'practice/?m=' + '.'.join(r['uci']) + '&side=' + other
    body += f'''
<section class="sec"><div class="wrap">
  <h2>{t['plans_h']}</h2>
  {ideas}
</div></section>
{ad_slot(lang, 'mid')}
<section class="sec"><div class="wrap">
  <h2>{fmt(t['rating_h'], name=esc(L['name']))}</h2>
  <p class="prose">{fmt(t['rating_p'], line=esc(line_txt))}</p>
  {band_table(lang, end, ply)}
  <h2>{t['tree_h']}</h2>
  <p class="prose">{t['tree_p']}</p>
  <div class="tree">{tree_svg(lang, o, kids)}</div>
  <h2>{t['vars_h']}</h2>
  <ul class="vars">{vars_}</ul>
  {f"<h2>{t['traps_h']}</h2>" + traps if traps else ''}
</div></section>
{ad_slot(lang, 'bottom')}
<section class="sec"><div class="wrap">
  <h2>{t['club_h']}</h2>
  <p class="prose">{esc(L['club'])}</p>
  <div class="cta"><h2>{t['practice_h']}</h2><p>{t['practice_p']}</p><p class="cta-b"><a class="btn" href="{pr}">{fmt(t['practice_go'], side=sidename)}</a><a class="btn ghost" href="{pr2}">{fmt(t['practice_go'], side=t['black'] if other == 'b' else t['white'])}</a></p></div>
  <h2>{t['related_h']}</h2>
  <ul class="cards">{rel}</ul>
</div></section>'''
    title = guide_title(lang, o)
    art = {'@context': 'https://schema.org', '@type': 'Article', 'headline': L['title'], 'description': L['desc'], 'inLanguage': lang,
           'datePublished': FIRST, 'dateModified': lastmod(prefix(lang) + path), 'author': org(), 'publisher': org(),
           'mainEntityOfPage': url(lang, path), 'image': f'{SITE}/{"og-ko.png" if lang == "ko" else "og.png"}'}
    h = head(lang, title, L['desc'], path, [art, crumbs_ld(lang, [(u['brand'], ''), (t['crumb'], 'openings/'), (L['name'], path)])], og_type='article')
    return path, page(lang, h, body, path, 'openings')


def practice_page(lang):
    P, t, u = PAGES[lang]['practice'], TX[lang], UI[lang]
    opts = ''
    for g, names in GROUPS:
        opts += f'<optgroup label="{esc(names[lang])}">' + ''.join(
            f'<option value="{o["slug"]}"{" selected" if o["slug"] == "italian-game" else ""}>{esc(o[lang]["name"])}</option>' for o in OPENINGS if o['group'] == g) + '</optgroup>'
    first = BY_SLUG['italian-game']['_r']
    setup = fmt(u['js']['setup_msg'], name=esc(BY_SLUG['italian-game'][lang]['name']), side=u['js']['white'])
    how = ''.join(f'<li>{esc(x)}</li>' for x in t['pr_how'])
    lst = ''.join(f'<li><a href="{prefix(lang)}practice/?o={o["slug"]}">{esc(o[lang]["name"])}</a></li>' for o in OPENINGS)
    body = f'''<section class="tool drill" data-drill data-state="setup"><div class="wrap">
<div class="tool-head"><h1>{P['h1']}</h1><p class="why">{P['why']}</p></div>
<div class="grid">
<div class="bcol"><div class="bwrap">{board_html(first['fen'], 'w', [first['uci'][-1][:2], first['uci'][-1][2:4]])}</div></div>
<div class="panel">
  <div class="row2 setup-only">
    <label class="field">{t['opening_lbl']}<select data-pick>{opts}</select></label>
    <label class="field">{t['side_lbl']}<select data-side><option value="w" selected>{t['white']}</option><option value="b">{t['black']}</option></select></label>
  </div>
  <div class="setup-only">{band_chips(lang)}</div>
  <div class="msg" data-msg aria-live="polite">{setup}</div>
  <div class="pfoot">
    <button type="button" class="btn setup-only" data-act="start">{t['start']}</button>
    <button type="button" class="btn ghost setup-only" data-act="review">{t['review']}</button>
    <button type="button" class="btn ghost" data-act="hint">{t['hint']}</button>
    <button type="button" class="btn ghost run-only" data-act="setup">{t['stop']}</button>
  </div>
  <p class="due" data-due></p>
</div>
</div></div></section>
<section class="sec"><div class="wrap prose">
  <h2>{t['pr_how_h']}</h2>
  <ol>{how}</ol>
</div></section>
{ad_slot(lang, 'mid')}
<section class="sec"><div class="wrap prose">
  <h2>{t['pr_list_h']}</h2>
  <ul class="cols">{lst}</ul>
</div></section>'''
    cfg = {'openings': [{'slug': o['slug'], 'name': o[lang]['name'], 'side': o['side'], 'line': o['_r']['uci']} for o in OPENINGS]}
    h = head(lang, P['title'], P['desc'], 'practice/', [app_ld(lang, P['h1'] + ' · ' + u['brand'], P['desc'], 'practice/')])
    return 'practice/', page(lang, h, body, 'practice/', 'practice', cfg)


def doc_page(lang, key):
    html = about(lang, META) if key == 'about' else privacy(lang)
    title = re.search(r'<h1>(.*?)</h1>', html).group(1) + ' | ' + UI[lang]['brand']
    desc = {('en', 'about'): 'Where the Fewmoves numbers come from: rated Lichess games, rating levels, opening names, how practice picks moves, and limits.',
            ('ko', 'about'): '외울수 숫자는 어디서 왔나: 리체스 레이팅 대국, 레이팅대, 오프닝 이름, 연습이 수를 고르는 방법과 한계.',
            ('en', 'privacy'): 'What Fewmoves keeps on your device, what it loads, visit statistics and advertising.',
            ('ko', 'privacy'): '외울수가 이 기기에 남기는 것, 받아 오는 것, 방문 통계와 광고.'}[(lang, key)]
    body = f'<div class="wrap sec prose doc">{html}</div>'
    h = head(lang, title, desc, f'{key}/', ads=False)
    return f'{key}/', page(lang, h, body, f'{key}/', None, scripts=False)


def not_found():
    e, k = TX['en'], TX['ko']
    body = f'''<div class="wrap sec nf">
  <div class="nf-b">{board_html('8/8/8/3k4/8/8/8/3K4 w - - 0 1')}</div>
  <h1>{e['nf_title']} · <span lang="ko">{k['nf_title']}</span></h1>
  <p><a class="btn" href="/">{e['nf_home']}</a> <a class="btn ghost" href="/ko/" lang="ko">{k['nf_home']}</a></p>
</div>'''
    h = head('en', 'Page not found | Fewmoves', 'This page does not exist.', '', noindex=True, ads=False)
    cfg = {'lang': 'en', 't': UI['en']['js']}
    return (f'{h}\n<body>\n{header("en", "")}\n<main id="main">\n{body}\n</main>\n{footer("en")}\n{cfg_script(cfg)}\n'
            '<script src="/assets/app.js"></script>\n</body>\n</html>\n')


def sitemap(paths):
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for path in paths:
        rel = path[4:] if path.startswith('/ko/') else path[1:]
        alts = ''.join(f'<xhtml:link rel="alternate" hreflang="{l}" href="{url(l, rel)}"/>' for l in ('en', 'ko'))
        out.append(f'  <url><loc>{SITE}{path}</loc><lastmod>{lastmod(path)}</lastmod>{alts}</url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


# ---------------------------------------------------------------- 가이드 글(루멘랩 홈이 읽는 원본)
def want(ok, msg):
    if not ok:
        sys.exit('글과 데이터가 어긋남: ' + msg)


def article_data(tops):
    first = []
    per = [stats(E[START_EPD], b) for b in range(4)]
    for m in stats(E[START_EPD], -1)['moves'][:6]:
        first.append((m['san'], [next((x['share'] for x in s['moves'] if x['san'] == m['san']), 0) for s in per]))
    fs = dict(first)
    rows = []
    for o in OPENINGS:
        if o['hub']:
            continue
        e = o['_r']['epd'][-1]
        rb = [played(e, b) for b in range(4)]
        rows.append({'slug': o['slug'], 'name': {l: o[l]['name'] for l in ('en', 'ko')}, 'n': played(e)['n'],
                     'nb': [r['n'] for r in rb], 'share': [rb[b]['n'] / START_N[b] for b in range(4)],
                     'score': [(r['w'] + r['d'] / 2) / r['n'] if r['n'] else 0 for r in rb]})
    rows.sort(key=lambda r: -r['n'])
    by = {r['slug']: r for r in rows}
    ratio = lambda r: r['share'][3] / r['share'][0] if r['share'][0] else 99
    rise = sorted(rows, key=lambda r: -ratio(r))[:5]
    fall = sorted(rows, key=ratio)[:5]
    gap = sorted([r for r in rows if min(r['nb'][0], r['nb'][3]) >= 2000], key=lambda r: -abs(r['score'][0] - r['score'][3]))[:6]
    low = sorted(rows, key=lambda r: -(r['nb'][0] + r['nb'][1]))[:5]
    sb = [stats(E[START_EPD], b) for b in range(4)]
    draws = [s['d'] / s['n'] for s in sb]
    # 글이 말하는 방향이 데이터와 맞는지
    want(fs['e4'][0] > fs['e4'][3] and fs['d4'][0] < fs['d4'][3], '1.e4 줄고 1.d4 는다')
    want(fs['Nf3'][3] > fs['Nf3'][0] * 1.8 and fs['c4'][3] > fs['c4'][0] * 1.8, '1.Nf3·1.c4가 2000+에서 크게 는다')
    want(by['sicilian-defense']['share'][3] > by['sicilian-defense']['share'][0] * 2, '시실리안이 는다')
    want(all(by[k]['share'][0] < 0.001 for k in ('sicilian-najdorf', 'kings-indian-defense', 'nimzo-indian-defense')), '깊은 갈래는 1200 미만에서 거의 없다')
    want(fall[0]['slug'] in ('bishops-opening', 'wayward-queen-attack'), '가장 줄어드는 것 = 일찍 비숍이나 퀸을 꺼내는 오프닝(글의 "일찍 비숍이나 퀸" 문장)')
    want(by['kings-gambit']['score'][0] > by['kings-gambit']['score'][3] and by['smith-morra-gambit']['score'][0] > by['smith-morra-gambit']['score'][3], '갬빗 점수가 낮은 레이팅에서 높다')
    want(all(draws[i] < draws[i + 1] for i in range(3)) or (draws[0] < draws[3] and draws[2] < draws[3]), '무승부가 는다')
    want(all(ratio(r) > 1.5 for r in rise) and all(ratio(r) < 0.67 for r in fall), '오르내림 목록')
    return {'games': META['games'], 'bands': BANDS, 'band_n': START_N[:4], 'first': first, 'e4': fs['e4'], 'd4': fs['d4'],
            'rows': rows, 'by': by, 'rise': rise, 'fall': fall, 'score_gap': gap, 'top_low': low, 'draws': draws, 'pct': pct}


def guide_link_home(lang):
    return ('https://lumenlab.page/guides/chess/' if lang == 'ko' else 'https://lumenlab.page/en/guides/chess/') + ART.SLUG + '/'


def article_page(lang, D):
    m, u, p = ART.META[lang], UI[lang], prefix(lang)
    path = f'guide/{ART.SLUG}/'
    day = lastmod(p + path)
    d = dict(D, prefix=p, count=lambda n: f'{math.floor(n / 10000 + 0.5):,}만' if lang == 'ko' else f'{n:,}',
             pct=lambda x, k=0: esc(tofixed(x * 100, k if x * 100 >= 0.995 or x == 0 else max(k, 2)) + '%'))
    ld = [{'@context': 'https://schema.org', '@type': 'Article', 'headline': m['h1'], 'description': m['desc'], 'inLanguage': lang,
           'datePublished': ART.PUBLISHED, 'dateModified': day, 'mainEntityOfPage': url(lang, path),
           'image': f'{SITE}/{"og-ko.png" if lang == "ko" else "og.png"}', 'author': org(), 'publisher': org()}]
    body = f'''<article class="art wrap prose">
  <p class="crumb"><a href="{p}guide/">{ART.INDEX[lang]['h1']}</a></p>
  <h1>{esc(m['h1'])}</h1>
  <p class="meta"><time datetime="{day}">{day}</time> · {TX[lang]['by']}</p>
  {ART.body(lang, d)}
</article>'''
    return path, page(lang, head(lang, m['title'], m['desc'], path, [ld[0]], og_type='article'), body, path, None, scripts=False)


def guide_index(lang):
    c, p, m = ART.INDEX[lang], prefix(lang), ART.META[lang]
    body = f'<div class="wrap sec prose"><h1>{c["h1"]}</h1><p>{c["lead"]}</p><ul><li><a href="{p}guide/{ART.SLUG}/">{esc(m["h1"])}</a><p>{esc(m["desc"])}</p></li></ul></div>'
    return 'guide/', page(lang, head(lang, c['title'], c['desc'], 'guide/', ads=False), body, 'guide/', None, scripts=False)


def build():
    tops = check_lines()
    write_slugs()
    check_names()
    kidmap = [(o, tree_kids(o)) for o in OPENINGS]
    fill_tree(kidmap)
    kids = {o['slug']: k for o, k in kidmap}
    AD = article_data(tops)
    out, paths = {}, []

    def add(lang, rel, text, index=True):
        full = prefix(lang) + rel
        out[full.lstrip('/') + 'index.html'] = text
        if index:
            paths.append(full)

    for lang in ('en', 'ko'):
        add(lang, *home_page(lang, tops))
        add(lang, *list_page(lang))
        for o in OPENINGS:
            add(lang, *opening_page(lang, o, kids[o['slug']]))
        add(lang, *practice_page(lang))
        for key in ('about', 'privacy'):
            add(lang, *doc_page(lang, key))
        # 가이드 글: 루멘랩 홈이 읽는 원본. sitemap에 넣지 않고 배포하지 않는다(.assetsignore guide/, _redirects)
        add(lang, *guide_index(lang), index=False)
        add(lang, *article_page(lang, AD), index=False)
    out['404.html'] = not_found()
    out['sitemap.xml'] = sitemap(paths)
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
