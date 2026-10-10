#!/usr/bin/env python3
"""만든 HTML 정적 검사: python3 check/_dev/check.py   (표준 라이브러리만)

보는 것: 페이지마다 title·description 다름 / canonical = sitemap 주소 = 내부 링크 주소(끝 /까지), 깨진 내부 링크·#해시 0 /
hreflang 짝·자기 자신·x-default / <html lang> / 영어 페이지의 lang="ko" 밖 한글 0 / FAQPage·Article·WebApplication JSON-LD가 화면 글자와 같음 /
방침: 웹 비콘 문장과 partner-sites 링크, 방문 통계(Cloudflare Web Analytics), 기기 저장소 키 = 화면 코드가 쓰는 키 /
광고 없는 페이지에 adsbygoogle 없음, 첫 화면·도구·글에는 있음 / 첫 HTML에 제목·본문·내부 링크 / 공개 페이지에 noindex 없음 / .html 링크 없음 / 화면 글에 줄표(—) 없음 /
이 사이트의 기준 숫자(채터링 30ms, 더블클릭 50ms, 쏠림 5%·15%, -45 dBFS, 테스트 음 크기, 주사율 1%·120장)가 로직 파일의 값과 같고 '공식 표준이 아니다'를 같이 적었는지 /
글 속 사실: _dev/articles.json 의 sources 에 적은 출처 링크와 확인한 날이 화면에 있는지, 확인 못 한 것으로 표시한 낱말이 화면에 없는지.
3단계(제3자 평가 뒤)에 더한 것: 영어 제목·설명 길이 / 조각 글꼴이 화면 글자를 전부 담고 있는지, 바깥 글꼴 주소가 없는지 / _headers /
화면 코드가 쓰는 문장(T.이름)이 두 언어 데이터에 다 있는지 / 클래스 이름 sweep 이 다시 겹치지 않는지 / 글의 광고 자리가 '테스트 열기' 단추 앞(글 가운데)에 있는지.
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://check.lumenlab.page'
NO_ADS = ('/about/', '/privacy/', '/guide/', '/ko/about/', '/ko/privacy/', '/ko/guide/')
TOOLS = {'keyboard-test': 'kb', 'mouse-test': 'mouse', 'mic-test': 'mic', 'webcam-test': 'cam', 'speaker-test': 'spk', 'dead-pixel-test': 'px', 'refresh-rate-test': 'hz', 'gamepad-tester': 'pad'}
KEYS = {'ck.layout', 'ck.chatter', 'ck.dblclick', 'ck.lang', 'ck.done'}
fails, passed = [], 0


def ok(cond, msg):
    global passed
    if cond:
        passed += 1
    else:
        fails.append(msg)


class Doc(HTMLParser):
    VOID = {'meta', 'link', 'br', 'img', 'input', 'hr', 'source', 'path', 'rect', 'line'}

    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.lang = None; self.title = ''; self.desc = None; self.canon = None; self.alts = {}; self.links = []; self.ids = set()
        self.ld = []; self.h1 = ''; self.robots = None; self.scripts = []; self.faq = []; self.visible = []; self.hangul_out = []
        self.stack = []  # (tag, in_ko)
        self._cap = None; self._buf = ''; self._skip = 0; self._faq_q = None; self._ads = 0
        self.feed(text)

    def in_ko(self):
        return any(k for _, k in self.stack)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html':
            self.lang = a.get('lang')
        if 'id' in a:
            self.ids.add(a['id'])
        if tag == 'meta' and a.get('name') == 'description':
            self.desc = a.get('content')
        if tag == 'meta' and a.get('name') == 'robots':
            self.robots = a.get('content')
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canon = a.get('href')
        if tag == 'link' and a.get('rel') == 'alternate' and a.get('hreflang'):
            self.alts[a['hreflang']] = a.get('href')
        if tag == 'a' and a.get('href') is not None:
            self.links.append((a['href'], a.get('lang')))
        if tag == 'script':
            self.scripts.append(a.get('src') or '')
            if a.get('type') in ('application/ld+json', 'application/json'):
                self._cap = ('ld' if a.get('type') == 'application/ld+json' else 'json'); self._buf = ''
            else:
                self._skip += 1
        if tag in ('style', 'template'):
            self._skip += 1
        if 'data-ad' in a:
            self._ads += 1
        if tag == 'section':
            self._in_faq = 'faq' in (a.get('class') or '').split()
        for t in ('title', 'h1', 'summary'):
            if tag == t and (t != 'summary' or getattr(self, '_in_faq', False)):
                self._cap = t; self._buf = ''
        if tag == 'p' and self._faq_q is not None:
            self._cap = 'faq_a'; self._buf = ''
        if tag not in self.VOID:
            self.stack.append((tag, a.get('lang') == 'ko'))
        for k in ('placeholder', 'aria-label', 'content', 'title', 'alt'):
            v = a.get(k)
            if v and re.search(r'[ᄀ-ᇿ㄰-㆏가-힣]', v) and not (a.get('lang') == 'ko' or self.in_ko()):
                if not (tag == 'meta' and a.get('property', '').startswith('og:') and self.lang == 'ko'):
                    self.hangul_out.append(f'{tag}@{k}: {v[:30]}')

    def handle_endtag(self, tag):
        if tag in ('script',) and self._cap in ('ld', 'json'):
            if self._cap == 'ld':
                self.ld.append(json.loads(self._buf))
            self._cap = None
        elif tag in ('script', 'style', 'template'):
            self._skip = max(0, self._skip - 1)
        if tag == 'section':
            self._in_faq = False
        if tag == 'title' and self._cap == 'title':
            self.title = self._buf.strip(); self._cap = None
        if tag == 'h1' and self._cap == 'h1':
            self.h1 = self._buf.strip(); self._cap = None
        if tag == 'summary' and self._cap == 'summary':
            self._faq_q = self._buf.strip(); self._cap = None
        if tag == 'p' and self._cap == 'faq_a':
            self.faq.append((self._faq_q, self._buf.strip())); self._faq_q = None; self._cap = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self._cap:
            self._buf += data
        if self._cap in ('ld', 'json') or self._skip:
            return
        self.visible.append(data)
        if re.search(r'[ᄀ-ᇿ㄰-㆏가-힣]', data) and not self.in_ko():
            self.hangul_out.append(data.strip()[:30])


def const(name, text):
    m = re.search(r'CK\.' + name + r'\s*=\s*(-?[\d.]+)', text)
    return float(m.group(1)) if m else None


def main():
    sm = [u.text for u in ET.parse(ROOT / 'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    paths = [u[len(SITE):] for u in sm]
    ok(len(paths) == len(set(paths)), 'sitemap에 같은 주소가 두 번')
    docs, raw = {}, {}
    for p in paths:
        f = ROOT / p.lstrip('/') / 'index.html'
        ok(f.exists(), f'sitemap 주소에 파일이 없음: {p}')
        if f.exists():
            raw[p] = f.read_text(encoding='utf-8')
            docs[p] = Doc(raw[p])
    built = set()
    for f in ROOT.rglob('index.html'):
        rel = f.parent.relative_to(ROOT)
        if '_dev' in rel.parts:
            continue
        built.add('/' if str(rel) == '.' else '/' + rel.as_posix() + '/')
    ok(built == set(paths), f'sitemap과 만든 페이지가 다름: {sorted(built ^ set(paths))}')
    vis = {p: ''.join(d.visible) for p, d in docs.items()}
    hrefs = {p: {h for h, _ in d.links} for p, d in docs.items()}

    titles, descs = {}, {}
    for p, d in docs.items():
        ko = p.startswith('/ko/')
        slug = p.strip('/').split('/')[-1] if p.strip('/') else ''
        is_tool, is_home = slug in TOOLS, p in ('/', '/ko/')
        is_article = '/guide/' in p and not p.endswith('/guide/')
        ok(d.lang == ('ko' if ko else 'en'), f'{p}: <html lang>={d.lang}')
        ok(bool(d.title) and bool(d.desc) and bool(d.h1), f'{p}: title·description·h1 가운데 빈 것')
        if not ko:      # 검색 결과에서 잘리지 않게(제3자 평가 L23): 영어 제목 60자 안팎, 설명 155자 안팎
            ok(len(d.title) <= 65, f'{p}: 영어 제목이 {len(d.title)}자(65자 이하로)')
            ok(len(d.desc or '') <= 160, f'{p}: 영어 설명이 {len(d.desc or "")}자(160자 이하로)')
        ok(d.title not in titles, f'{p}: title이 {titles.get(d.title)}와 같음'); titles[d.title] = p
        ok(d.desc not in descs, f'{p}: description이 {descs.get(d.desc)}와 같음'); descs[d.desc] = p
        ok(d.canon == SITE + p, f'{p}: canonical={d.canon}')
        ok(d.robots is None, f'{p}: 공개 페이지에 robots 메타({d.robots})')
        ok(len(vis[p]) > 400, f'{p}: 첫 HTML 본문이 너무 짧음')
        internal = [h for h, _ in d.links if h.startswith('/')]
        ok(len(internal) >= 5, f'{p}: 첫 HTML 내부 링크가 적음({len(internal)})')
        for h, lang in d.links:
            if h.startswith('#'):
                ok(h[1:] in d.ids, f'{p}: 없는 #해시 {h}')
            elif h.startswith('/'):
                path, _, frag = h.partition('#')
                ok('.html' not in path, f'{p}: .html 링크 {h}')
                ok(path in docs, f'{p}: 깨진 내부 링크 {h}')
                if frag and path in docs:
                    ok(frag in docs[path].ids, f'{p}: 없는 #해시 {h}')
                if not ko and path.startswith('/ko/'):
                    ok(lang == 'ko', f'{p}: 한국어 페이지로 가는 링크에 lang="ko" 없음 {h}')
        if d.alts:
            ok(set(d.alts) == {'en', 'ko', 'x-default'}, f'{p}: hreflang 묶음 {sorted(d.alts)}')
            ok(d.alts.get('ko' if ko else 'en') == SITE + p, f'{p}: hreflang에 자기 자신이 없음')
            ok(d.alts.get('x-default') == d.alts.get('en'), f'{p}: x-default가 영어판이 아님')
            other = (d.alts.get('en' if ko else 'ko') or '')[len(SITE):]
            ok(other in docs and docs[other].alts.get('ko' if ko else 'en') == SITE + p, f'{p}: hreflang 짝({other})이 되돌아오지 않음')
        else:
            ok(False, f'{p}: hreflang이 없음(모든 페이지가 짝이 있는 사이트)')
        if not ko:
            ok(not d.hangul_out, f'{p}: lang="ko" 밖 한글 {d.hangul_out[:3]}')
        has_ads = any('adsbygoogle' in s for s in d.scripts)
        if p in NO_ADS:
            ok(not has_ads and d._ads == 0, f'{p}: 광고 없는 페이지에 광고 코드')
        else:
            ok(has_ads and d._ads >= 2, f'{p}: 광고 코드·자리({d._ads})가 없음')
        ok(any('ads-config.js' in s for s in d.scripts) == has_ads, f'{p}: ads-config.js와 광고 코드가 짝이 안 맞음')
        ok(raw[p].count('class="ad-in"') == raw[p].count('data-ad='), f'{p}: 광고 자리에 .ad-in 틀이 없음')
        types = [j.get('@type') for j in d.ld]
        faq_ld = [j for j in d.ld if j.get('@type') == 'FAQPage']
        if d.faq or faq_ld:
            got = [(q['name'], q['acceptedAnswer']['text']) for q in (faq_ld[0]['mainEntity'] if faq_ld else [])]
            ok(got == d.faq, f'{p}: FAQPage와 화면 FAQ가 다름')
            ok(len({q for q, _ in d.faq}) == len(d.faq), f'{p}: 같은 질문이 FAQ에 두 번 있음')
        if is_article:
            art = [j for j in d.ld if j.get('@type') == 'Article']
            ok(bool(art) and art[0]['headline'] == d.h1 and art[0]['description'] == d.desc and art[0]['mainEntityOfPage'] == SITE + p, f'{p}: Article JSON-LD가 화면과 다름')
            ok('BreadcrumbList' in types, f'{p}: BreadcrumbList 없음')
        elif is_tool or is_home:
            ok('WebApplication' in types, f'{p}: WebApplication 없음')
            app = [j for j in d.ld if j.get('@type') == 'WebApplication'][0]
            ok(app['url'] == SITE + p and app['description'] == d.desc, f'{p}: WebApplication 주소·설명이 화면과 다름')
        if is_tool:
            ok(bool(d.faq) and bool(faq_ld), f'{p}: 도구 쪽에 FAQ가 없음')
            ok(raw[p].count('<nav class="strip"') == 1 and len(re.findall(r'<a href="[^"]+" data-dev="(?:kb|mouse|mic|cam|spk|px|hz|pad)"', raw[p])) == 8, f'{p}: 기기 띠에 도구 8개가 없음')
            ok(re.search(r'data-dev="' + TOOLS[slug] + r'" aria-current="page"', raw[p]), f'{p}: 기기 띠에 지금 쪽 표시가 없음')
            ok(f'class="stage stage--{TOOLS[slug]}" data-dev="{TOOLS[slug]}"' in raw[p], f'{p}: 무대가 없음')
        if is_home:
            ok(len(re.findall(r'<section class="panel p-[a-z]+" data-dev="(kb|mouse|mic|cam|spk|hz|pad)"', raw[p])) == 7, f'{p}: 점검판 칸이 7개가 아님')
        ok(not re.search(r'"(aggregateRating|review|reviewRating)"\s*:', json.dumps(d.ld)), f'{p}: 없는 평점·후기')
        ok('—' not in vis[p], f'{p}: 화면 글에 줄표(—)')
    allvis = '\n'.join(vis.values())

    # ── 방침 ──
    js = ''.join((ROOT / 'assets' / f).read_text(encoding='utf-8') for f in ('app.js', 'media.js', 'screen.js'))
    used = set(re.findall(r"'(ck\.[a-z]+)'", js))
    ok(used == KEYS, f'화면 코드가 쓰는 저장 키가 방침 목록과 다름: {sorted(used ^ KEYS)}')
    pre = re.search(r"localStorage\.getItem\('(ck\.[a-z]+)'\)", raw['/'])
    ok(bool(pre) and pre.group(1) == 'ck.layout', '첫 그림 전 스크립트가 읽는 키는 ck.layout')
    for p, word in (('/privacy/', 'web beacons'), ('/ko/privacy/', '웹 비콘')):
        ok(word in vis[p] and 'https://policies.google.com/technologies/partner-sites' in ' '.join(hrefs[p]), f'{p}: 웹 비콘 문장·partner-sites 링크')
        for key in KEYS:
            ok(key in vis[p], f'{p}: 저장 항목 {key}가 방침에 없음')
        ok('Cloudflare Web Analytics' in vis[p] and 'https://www.cloudflare.com/web-analytics/' in hrefs[p], f'{p}: Cloudflare Web Analytics 문장·링크')
        ok('woxocoso@gmail.com' in vis[p], f'{p}: 문의 메일')
        ok(('type of browser' in vis[p]) or ('브라우저 종류' in vis[p]), f'{p}: 방문 통계에 실리는 것(브라우저 종류·성능 정보) 문장')
        ok('jsDelivr' not in vis[p], f'{p}: 글꼴을 이 사이트에서 보내는데 방침에 글꼴 CDN 문장이 남아 있음')
    for p in ('/privacy/', '/ko/privacy/', '/about/', '/ko/about/', '/', '/ko/'):
        bad = re.search(r"분석 도구[를는은]? ?(쓰지|사용하지|없)|통계[를는은]? ?(모으지|수집하지) 않|추적하지 않|no analytics|(do not|don't|never) (use|run) (any )?analytics|no tracking|(do not|don't) track|아무것도 (보내지|전송하지) 않|nothing (is|gets) sent", vis[p], re.I)
        ok(not bad, f'{p}: 방문 통계가 없다는 뜻의 문장 "{bad.group(0) if bad else ""}"')

    # ── 이 사이트의 기준 숫자 = 로직 파일의 값 ──
    keys_js = (ROOT / 'assets' / 'ck-keys.js').read_text(encoding='utf-8')
    meas_js = (ROOT / 'assets' / 'ck-measure.js').read_text(encoding='utf-8')
    app_js = (ROOT / 'assets' / 'app.js').read_text(encoding='utf-8')
    ok(const('KEY_CHATTER_MS', keys_js) == 30 and const('MOUSE_CHATTER_MS', keys_js) == 50, '로직의 채터링·더블클릭 기본값이 30·50이 아님(화면 글과 같이 고칠 것)')
    ok(const('DRIFT_SLIGHT', meas_js) == 0.05 and const('DRIFT_CLEAR', meas_js) == 0.15, '로직의 쏠림 기준이 5%·15%가 아님')
    ok(const('MIC_HEARD_DB', meas_js) == -45 and const('DEFAULT_GAIN', meas_js) == 0.1 and const('MAX_GAIN', meas_js) == 0.5 and const('REFRESH_TOL', meas_js) == 0.01, '로직의 -45 dBFS·음 크기·주사율 허용 오차가 화면 글과 다름')
    ok('++n < 121' in app_js, '주사율은 화면 120장 간격으로 잰다(화면 글의 120과 같아야 함)')
    ok(const('REFRESH_STEADY', meas_js) == 0.75 and const('DRIFT_WOBBLE', meas_js) == 0.05 and const('MIC_CLIP_SHARE', meas_js) == 0.005, '로직의 고른 프레임 75%·떨림 5%·잘림 0.5%가 화면 글과 다름')
    need = {
        '/keyboard-test/': ['30 ms', 'not an official standard'], '/ko/keyboard-test/': ['30ms', '공식 표준이 아니'],
        '/mouse-test/': ['50 ms', 'own rule'], '/ko/mouse-test/': ['50ms', '이 사이트가 정한 기준'],
        '/mic-test/': ['−45 dBFS', 'own rule'], '/ko/mic-test/': ['-45 dBFS', '이 사이트가 정한 기준'],
        '/gamepad-tester/': ['5%', '15%', 'not an official standard', 'jittery'], '/ko/gamepad-tester/': ['5%', '15%', '공식 표준이 아니', '떨림'],
        '/refresh-rate-test/': ['120 frames', '1%', '75%', 'own rule'], '/ko/refresh-rate-test/': ['120장', '1%', '75%', '이 사이트가 정한 기준'],
        '/webcam-test/': ['largest picture'], '/ko/webcam-test/': ['가장 큰 화면을 요청'],
        '/speaker-test/': ['one tenth', 'half'], '/ko/speaker-test/': ['10분의 1', '절반'],
        '/about/': ['30 ms', '50 ms', '−45 dBFS', '5%', '15%', '1%', '75%', 'official standard'], '/ko/about/': ['30ms', '50ms', '-45 dBFS', '5%', '15%', '1%', '75%', '공식 표준이 아니'],
    }
    for p, words in need.items():
        for w in words:
            ok(w in vis[p], f'{p}: 기준 문구 "{w}"가 화면에 없음')
    for p in vis:
        m = re.search(r'official standard|공식 표준', vis[p])
        if m:
            ok(re.search(r'not an official standard|None of these rules is an official standard|공식 표준이 아니', vis[p]), f'{p}: 공식 표준이라고 읽힐 수 있는 문장')
    # 권한 단추가 있는 쪽은 켜진 동안 보일 '끄기'와 '올라가지 않아요' 문장을 미리 갖고 있다
    for p in ('/', '/ko/', '/mic-test/', '/ko/mic-test/', '/webcam-test/', '/ko/webcam-test/'):
        ok('data-act="mic-stop"' in raw[p] or 'data-act="cam-stop"' in raw[p], f'{p}: 끄기 단추가 없음')
    for p in ('/mic-test/', '/webcam-test/', '/ko/mic-test/', '/ko/webcam-test/'):
        ok('data-on-note=' in raw[p], f'{p}: 켜진 동안 보일 안내가 없음')
    # 전체 화면 칸 안에는 아무것도 없다
    for p in ('/dead-pixel-test/', '/ko/dead-pixel-test/'):
        ok('<div class="px-full" data-px-full hidden></div>' in raw[p], f'{p}: 전체 화면 칸은 비어 있어야 함')

    # ── 글: 출처·확인한 날, 확인 못 한 낱말 ──
    arts = json.loads((ROOT / '_dev' / 'articles.json').read_text(encoding='utf-8'))
    for lang in ('en', 'ko'):
        ok(len(arts.get(lang, [])) >= 3, f'{lang}: 글이 3편 미만')
        for a in arts.get(lang, []):
            p = ('/ko' if lang == 'ko' else '') + f'/guide/{a["slug"]}/'
            if p not in docs:
                ok(False, f'{p}: 글 페이지가 없음'); continue
            for u in a.get('sources', []):
                ok(u in hrefs[p], f'{p}: 출처 링크가 없음 {u}')
            if a.get('sources'):
                ok(('checked 2026-10-10' in vis[p]) or ('2026-10-10 확인' in vis[p]), f'{p}: 출처를 확인한 날이 화면에 없음')
            ok(a.get('checked', '') in vis[p], f'{p}: 마지막 확인 날짜가 화면에 없음')
            tool_links = [h for h in hrefs[p] if h.strip('/').split('/')[-1] in TOOLS]
            ok(len(tool_links) >= 1, f'{p}: 도구로 가는 링크가 없음')
    # 도구 쪽의 출처: content.json 에 적은 출처 링크와 확인한 날이 화면에 있다
    content = json.loads((ROOT / '_dev' / 'content.json').read_text(encoding='utf-8'))
    for key, tool in content['tools'].items():
        for lang in ('en', 'ko'):
            p = ('/ko/' if lang == 'ko' else '/') + tool['slug'] + '/'
            for src in tool[lang].get('sources', []):
                ok(src['url'] in hrefs[p] and src['checked'] in vis[p] and src['label'] in vis[p], f'{p}: 출처 링크·확인한 날이 화면에 없음 {src["url"]}')
    for word in arts.get('banned', []):
        ok(word not in allvis, f'확인 못 한 것("{word}")이 화면에 있음')
    ok('고친 날' not in allvis and 'Updated ' not in allvis, "'고친 날'/'Updated' 가 남아 있음")
    for p, r in raw.items():
        ok(not re.search(r'<div class="tbl[^>]*>\s*<div class="tbl', r) and r.count('<table') == r.count('<div class="tbl'), f'{p}: 표를 감싼 칸(.tbl)이 표 수와 다르거나 두 겹')

    # ── 3단계에 더한 검사 ──
    # 화면 코드가 쓰는 문장이 두 언어 데이터에 다 있다(빠지면 화면에 undefined 가 뜬다)
    tt = content['t']
    extra = {'close', 'asks', 'stays_on', 'off_note'}
    used_t = set(re.findall(r'\bT\.([a-z][a-z0-9_]*)', js)) - {'err'}
    for lang in ('en', 'ko'):
        miss = sorted(k for k in used_t if k not in tt[lang] and k not in extra)
        ok(not miss, f'화면 코드가 쓰는 문장이 content.json t.{lang} 에 없음: {miss}')
    ok(set(tt['en']) == set(tt['ko']) and set(tt['en']['err']) == set(tt['ko']['err']), f't.en 과 t.ko 의 항목이 다름: {sorted(set(tt["en"]) ^ set(tt["ko"]))} {sorted(set(tt["en"]["err"]) ^ set(tt["ko"]["err"]))}')
    kinds = set(re.findall(r"out\('([a-z-]+)'", meas_js))
    ok(kinds <= set(tt['en']['err']), f'장치 오류 종류에 안내 문장이 없음: {sorted(kinds - set(tt["en"]["err"]))}')
    ok(set(content['ui']['en']) == set(content['ui']['ko']), f'ui.en 과 ui.ko 의 항목이 다름: {sorted(set(content["ui"]["en"]) ^ set(content["ui"]["ko"]))}')
    # 클래스 이름 겹침(자판 연출이 스피커 칸의 .sweep 모양을 물려받아 자판이 밀렸던 일): 같은 이름을 두 뜻으로 쓰지 않는다
    css = (ROOT / 'assets' / 'style.css').read_text(encoding='utf-8')
    ok(not re.search(r'\.sweep(?![\w-])', css) and "'sweep'" not in app_js and not any(re.search(r'class="(?:[^"]* )?sweep[ "]', r) for r in raw.values()), "클래스 이름 'sweep'을 다시 쓰고 있음(자판 연출은 is-sweeping, 스피커 칸은 spk-sweep)")
    # 화면 코드가 붙이는 상태 클래스와 같은 이름의 '칸 모양 규칙'(.이름 { display·여백… })이 있으면 안 된다
    plain = {}
    for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', re.sub(r'/\*.*?\*/', '', css, flags=re.S)):
        for one in sel.split(','):
            m = re.fullmatch(r'\s*\.([a-z][\w-]*)\s*', one)
            if m and re.search(r'(?<![\w-])(display|margin(-top|-bottom)?|padding(-top|-bottom)?|border-top|height|width|flex)\s*:', body):
                plain[m.group(1)] = True
    for name in sorted(set(re.findall(r"classList\.(?:add|toggle|remove)\('([a-z-]+)'", js))):
        ok(name not in plain, f'화면 코드가 붙이는 상태 클래스 .{name} 과 같은 이름의 칸 모양 규칙이 style.css 에 있음(이름을 나눌 것)')
    # 키보드 쪽: 키를 잡는다는 안내가 자판 위에 있다. 첫 화면: 키 받기 단추와 안내가 있다
    for p in ('/keyboard-test/', '/ko/keyboard-test/'):
        ok(0 < raw[p].find('data-kb-cap') < raw[p].find('class="kb-well"'), f'{p}: 키 잡기 안내가 자판 위에 있어야 함')
        ok('data-kb-maxkeys' in raw[p] and 'class="note kb-na"' in raw[p], f'{p}: 가장 많이 눌렸을 때의 키 칸·맥 배열 안내')
    for p in ('/', '/ko/'):
        ok('data-act="kb-capture"' in raw[p] and 'data-kb-cap' in raw[p] and raw[p].count('data-mouse-area') == 1, f'{p}: 첫 화면의 키 받기 단추·안내·마우스 칸')
    # 웹캠·마이크: 받은 값이 무엇인지 밝히는 줄의 자리
    for p in ('/webcam-test/', '/ko/webcam-test/'):
        ok('data-cam-got' in raw[p] and 'data-cam-cap' in raw[p], f'{p}: 받은 크기 안내·카메라가 밝힌 최대 칸')
    for p in ('/mic-test/', '/ko/mic-test/'):
        ok('data-mic-proc' in raw[p], f'{p}: 브라우저가 소리를 다듬는지 알리는 줄')
    media_js = (ROOT / 'assets' / 'media.js').read_text(encoding='utf-8')
    ok('width: { ideal: 4096 }, height: { ideal: 2160 }' in media_js and "request('video', CAM_WANT" in media_js and 'exact: 4096' not in media_js, '카메라는 가장 큰 크기를 ideal 조건으로 요청한다')
    ok(all(f'{k}: {{ ideal: false }}' in media_js for k in ('echoCancellation', 'noiseSuppression', 'autoGainControl')) and "request('audio', MIC_WANT" in media_js, '마이크는 소리 다듬기를 끄고(ideal) 요청한다')
    # 글: 광고 자리(mid)는 글 가운데, '테스트 열기' 단추보다 앞
    for p in docs:
        if '/guide/' in p and not p.endswith('/guide/'):
            i, j, k2 = raw[p].find('data-slot="mid"'), raw[p].find('class="cta"'), raw[p].find('data-slot="bottom"')
            ok(0 < i < j < k2 and 'ad-wrap--in' in raw[p], f'{p}: 가운데 광고 자리가 글 안, 테스트 열기 단추 앞에 있어야 함')
    # 조각 글꼴: 파일이 있고, 모든 쪽이 자기 언어 조각을 preload 하고, 화면에 나오는 글자를 전부 담고 있다. 바깥 글꼴 주소는 없다
    fonts = json.loads((ROOT / '_dev' / 'fonts.json').read_text(encoding='utf-8')) if (ROOT / '_dev' / 'fonts.json').exists() else {}
    ok(all(l in fonts and (ROOT / 'assets' / 'fonts' / fonts[l]['file']).exists() and (ROOT / 'assets' / 'fonts' / fonts[l]['file']).stat().st_size == fonts[l]['bytes'] for l in ('en', 'ko')), '조각 글꼴 파일이 있고 크기가 fonts.json 과 같음(python3 -B _dev/font.py)')
    if fonts.get('en') and fonts.get('ko'):
        need_chars = {'en': set(), 'ko': set()}
        for p, r in raw.items():
            lang = 'ko' if p.startswith('/ko/') else 'en'
            ok(f'<link rel="preload" href="/assets/fonts/{fonts[lang]["file"]}" as="font" type="font/woff2" crossorigin>' in r and 'font-family:"CK Sans"' in r, f'{p}: 자기 언어의 조각 글꼴 preload·@font-face')
            ok('cdn.jsdelivr.net' not in r and 'fonts.googleapis' not in r, f'{p}: 바깥 글꼴 주소가 남아 있음')
            body = re.sub(r'<script type="application/ld\+json">.*?</script>', ' ', r, flags=re.S)
            body = re.sub(r'<script(?! type="application/json")[^>]*>.*?</script>|<style>.*?</style>', ' ', body, flags=re.S)
            import html as _html
            need_chars[lang] |= set(_html.unescape(re.sub(r'<[^>]+>', ' ', body)))
        for l in ('en', 'ko'):
            miss = ''.join(sorted(c for c in need_chars[l] if c > ' ' and c != '\xa0' and c not in fonts[l]['chars'] and c not in fonts[l].get('not_in_source', '')))
            ok(not miss, f'조각 글꼴({l})에 화면 글자가 빠짐({len(miss)}자: {miss[:40]}). python3 -B _dev/font.py 를 다시 돌릴 것')
        junk = [f.name for f in (ROOT / 'assets' / 'fonts').glob('ck-*.woff2') if f.name not in (fonts['en']['file'], fonts['ko']['file'])]
        ok(not junk, f'쓰지 않는 옛 조각 글꼴 파일: {junk}')
    ofl = ROOT / 'assets' / 'fonts' / 'OFL.txt'
    ok(ofl.exists() and 'SIL OPEN FONT LICENSE' in ofl.read_text(encoding='utf-8') and 'CK Sans' in ofl.read_text(encoding='utf-8'), '글꼴 라이선스 전문(assets/fonts/OFL.txt)과 이름을 바꿨다는 설명')
    ok('"CK Sans"' in css and not (ROOT / 'assets' / 'pretendard.css').exists(), 'style.css 의 글꼴 이름표 맨 앞이 CK Sans, 옛 CDN 글꼴 CSS는 없음')
    # 응답 머리말
    hd = (ROOT / '_headers').read_text(encoding='utf-8') if (ROOT / '_headers').exists() else ''
    ok('X-Content-Type-Options: nosniff' in hd and 'Referrer-Policy: strict-origin-when-cross-origin' in hd and '/assets/fonts/*' in hd and 'immutable' in hd, '_headers: nosniff·Referrer-Policy·글꼴 오래 저장')
    ok('Content-Security-Policy' not in hd and 'Permissions-Policy' not in hd, '_headers 에 CSP·Permissions-Policy 를 넣지 않는다(광고·마이크·카메라를 막을 수 있다)')
    ok('_headers' not in (ROOT / '.assetsignore').read_text().split(), '.assetsignore 에 _headers 를 넣으면 머리말이 적용되지 않는다')

    # ── 그 밖의 파일 ──
    nf = (ROOT / '404.html').read_text(encoding='utf-8')
    ok('adsbygoogle' not in nf and 'noindex' in nf, '404: 광고 코드가 없고 noindex여야 함')
    ok((ROOT / 'ads.txt').read_text().strip() == 'google.com, pub-9496167591465154, DIRECT, f08c47fec0942fa0', 'ads.txt')
    ok((ROOT / 'googlea614029e84d58498.html').read_text().strip() == 'google-site-verification: googlea614029e84d58498.html', '구글 확인 파일')
    ok('Sitemap: https://check.lumenlab.page/sitemap.xml' in (ROOT / 'robots.txt').read_text(), 'robots.txt Sitemap 줄')
    for f in ('favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og.png', 'og-ko.png', 'wrangler.jsonc', '.assetsignore', '.deploy-actions', 'rss.xml', 'CLAUDE.md'):
        ok((ROOT / f).exists(), f'{f} 없음')
    ig = (ROOT / '.assetsignore').read_text().split()
    ok(all(x in ig for x in ('_dev', 'tests', 'CLAUDE.md', 'wrangler.jsonc', '.assetsignore', '.deploy-actions')), '.assetsignore에 빠진 것')
    if (ROOT / 'rss.xml').exists():
        rss = (ROOT / 'rss.xml').read_text(encoding='utf-8')
        ok(rss.count('<item>') == sum(1 for p in paths if p.startswith('/ko/guide/') and p != '/ko/guide/'), 'rss.xml 글 수 = 한국어 글 수')
    for junk in ('node_modules', '__pycache__', '.wrangler'):
        ok(not list(ROOT.rglob(junk)), f'폴더 안에 {junk}가 남아 있음')

    print(f'{"실패" if fails else "통과"}  정적 검사: {passed}개 통과' + (f', {len(fails)}개 실패' if fails else '') + f' (페이지 {len(docs)}장)')
    for m in fails[:40]:
        print('   -', m)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
