#!/usr/bin/env python3
"""한바퀴 정적 검사(만든 HTML·코드): python3 time/_dev/check.py"""
import html as H
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://time.lumenlab.page'
fails = []


def bad(msg):
    fails.append(msg)


htmls = sorted(p for p in ROOT.rglob('index.html') if '_dev' not in p.parts and 'tests' not in p.parts)
sitemap = re.findall(r'<loc>([^<]+)</loc>', (ROOT / 'sitemap.xml').read_text(encoding='utf-8'))
titles, descs = Counter(), Counter()
for p in htmls:
    h = p.read_text(encoding='utf-8')
    rel = '/' + str(p.parent.relative_to(ROOT)).replace('.', '') + '/'
    rel = rel.replace('//', '/')
    url = SITE + rel
    t = H.unescape(re.search(r'<title>([^<]+)</title>', h).group(1))
    d = H.unescape(re.search(r'<meta name="description" content="([^"]+)"', h).group(1))
    titles[t] += 1
    descs[d] += 1
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', h)
    if not canon or canon.group(1) != url:
        bad(f'canonical {rel}: {canon and canon.group(1)}')
    if url not in sitemap:
        bad(f'사이트맵에 없음 {rel}')
    if 'noindex' in h:
        bad(f'공개 페이지에 noindex {rel}')
    lang = 'ko' if rel.startswith('/ko/') else 'en'
    if f'<html lang="{lang}">' not in h:
        bad(f'html lang {rel}')
    alts = re.findall(r'hreflang="([^"]+)" href="([^"]+)"', h)
    if alts:
        if url not in [a[1] for a in alts if a[0] == lang]:
            bad(f'hreflang 자기 자신 {rel}')
        if sum(1 for a in alts if a[0] == 'x-default') != 1:
            bad(f'x-default {rel}')
        for code, a in alts:
            if a.replace(SITE, '') and not (ROOT / (a.replace(SITE, '').lstrip('/') + 'index.html')).exists():
                bad(f'hreflang 짝 없음 {rel} → {a}')
    ids = re.findall(r'\sid="([^"]+)"', h)
    dup = [k for k, v in Counter(ids).items() if v > 1]
    if dup:
        bad(f'같은 id {rel}: {dup}')
    noads = any(rel.startswith(x) for x in ('/about/', '/ko/about/', '/privacy/', '/ko/privacy/')) or rel in ('/guide/', '/ko/guide/')
    if ('adsbygoogle' in h) == noads:
        bad(f'광고 코드 {rel}')
    if lang == 'en':
        body = re.sub(r'<[^>]+lang="ko"[^>]*>[^<]*<', '', h)
        body = re.sub(r'<script[\s\S]*?</script>', '', body)
        if re.search(r'[가-힣]', re.sub(r'<a [^>]*hreflang="ko"[^>]*>[^<]*</a>', '', body)):
            bad(f'영어 페이지에 한글 {rel}')
    for m in re.finditer(r'<a [^>]*href="(/[^"#?]*)"', h):
        target = m.group(1)
        f = ROOT / target.lstrip('/')
        if not (f.is_file() or (f / 'index.html').is_file()):
            bad(f'깨진 내부 링크 {rel} → {target}')
    if len(t) > (65 if lang == 'en' else 60) or len(d) > 160:
        bad(f'제목·설명 길이 {rel}')
for k, v in titles.items():
    if v > 1:
        bad(f'같은 제목 {k}')
for k, v in descs.items():
    if v > 1:
        bad(f'같은 설명 {k[:30]}')
if len(sitemap) != len(htmls):
    bad(f'사이트맵 {len(sitemap)} ≠ 페이지 {len(htmls)}')

# 404: 광고 없음, noindex
nf = (ROOT / '404.html').read_text(encoding='utf-8')
if 'adsbygoogle' in nf or 'noindex' not in nf:
    bad('404 광고·noindex')

# 저장 키 = 방침
app = (ROOT / 'assets/app.js').read_text(encoding='utf-8') + (ROOT / '_dev/build.py').read_text(encoding='utf-8')
keys = set(re.findall(r"'(ot\.[a-z]+)'", app))
for lang, path in (('en', 'privacy/index.html'), ('ko', 'ko/privacy/index.html')):
    pv = (ROOT / path).read_text(encoding='utf-8')
    listed = set(re.findall(r'<code>(ot\.[a-z]+)</code>', pv))
    if keys != listed:
        bad(f'방침 저장 키 {lang}: 코드 {sorted(keys)} / 방침 {sorted(listed)}')
    if 'Cloudflare Web Analytics' not in pv or 'partner-sites' not in pv:
        bad(f'방침 통계·광고 문단 {lang}')
    if re.search(r'분석 도구를 쓰지|no analytics', pv, re.I):
        bad(f'방침에 "분석 도구 없음" {lang}')
if 'sessionStorage' in (ROOT / 'assets/app.js').read_text(encoding='utf-8'):
    bad('app.js가 sessionStorage를 쓴다(방침에 없음)')

# 공식 출처 링크와 확인한 날
F = json.loads((ROOT / '_dev/facts.json').read_text(encoding='utf-8'))
for lang, path in (('ko', 'ko/index.html'), ('en', 'index.html')):
    h = (ROOT / path).read_text(encoding='utf-8')
    if F['chrome_throttling']['url'] not in h or ('2026년 10월 14일 확인' if lang == 'ko' else 'checked Oct 14, 2026') not in h:
        bad(f'타이머 출처·확인한 날 {lang}')
# 화면 글의 한도 = 코드
core = (ROOT / 'assets/core.js').read_text(encoding='utf-8')
if 'OT.MAX_TIMER = 99 * HOUR + 59 * MIN + 59 * SEC' not in core:
    bad('최대 시간 코드가 바뀜 → FAQ 99시간 59분 59초 확인')
if not re.search(r'MAXN = 8', app) or not re.search(r'MAXA = 12', app):
    bad('타이머 8개·알람 12개 한도가 코드와 다름')
for lang, path, words in (('ko', 'ko/index.html', ['99시간 59분 59초', '8개까지']), ('en', 'index.html', ['99 hours 59 minutes 59 seconds', 'up to 8'])):
    h = (ROOT / path).read_text(encoding='utf-8')
    for w in words:
        if w.lower() not in h.lower():
            bad(f'한도 문구 {lang}: {w}')
# 확인 못 한 사실을 쓰지 않는다
alltxt = ''.join(p.read_text(encoding='utf-8') for p in htmls)
for w in ('Safari도 1분', '사파리도 1분', '아이폰에서도 울려요', 'works on iPhone lock screen', '정확도 100%', '보장'):
    if w in alltxt:
        bad(f'확인 못 한 문장: {w}')

print('\n'.join('  ✗ ' + f for f in fails))
print(f'정적 검사: 페이지 {len(htmls)}개, 실패 {len(fails)}')
sys.exit(1 if fails else 0)
