#!/usr/bin/env python3
"""만든 HTML 정적 검사: python3 count/_dev/check.py   (표준 라이브러리만)

보는 것: 페이지마다 title·description 다름 / canonical = sitemap 주소 = 내부 링크 주소(끝 /까지), 깨진 내부 링크·#해시 0 /
hreflang 짝·자기 자신·x-default / <html lang> / 영어 페이지의 lang="ko" 밖 한글 0 / FAQPage·Article JSON-LD가 화면 글자와 같음 /
방침의 웹 비콘 문장과 partner-sites 링크·방문 통계(Cloudflare Web Analytics) 문장 / 광고 없는 페이지에 adsbygoogle 없음, 도구·글 페이지엔 있음 / 첫 HTML에 제목·본문·내부 링크 /
공개 페이지에 noindex 없음 / .html 링크 없음 / 화면 글에 줄표(—) 없음 /
확인된 사실(_dev/limits.json): 출처 링크와 확인한 날이 화면에 있음, 나이스·SNS 숫자가 그 파일과 같음, 확인 못 한 것(페이스북·SKT 한도 등)이 없음.
제3자 평가(2026-10-10) 뒤: 저장 키(localStorage 셋 + sessionStorage 하나) = 방침, 도구 화면의 <noscript> 한 줄,
자주 묻는 질문이 없는 이름('세는 기준'·How this counts)을 가리키지 않음, 자소서 숫자 띠·원고지 인쇄 단추·블루스카이 둘째 한도가 있음.
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://count.lumenlab.page'
NO_ADS = ('/about/', '/privacy/', '/licenses/', '/guide/', '/ko/about/', '/ko/privacy/', '/ko/licenses/', '/ko/guide/')
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


def main():
    sm = [u.text for u in ET.parse(ROOT / 'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    paths = [u[len(SITE):] for u in sm]
    ok(len(paths) == len(set(paths)), 'sitemap에 같은 주소가 두 번')
    docs = {}
    for p in paths:
        f = ROOT / p.lstrip('/') / 'index.html'
        ok(f.exists(), f'sitemap 주소에 파일이 없음: {p}')
        if f.exists():
            docs[p] = Doc(f.read_text(encoding='utf-8'))
    built = {'/' + str(f.parent.relative_to(ROOT)).replace('.', '').strip('/') + ('/' if str(f.parent.relative_to(ROOT)) != '.' else '')
             for f in ROOT.rglob('index.html') if '_dev' not in f.parts}
    built = {b if b != '//' else '/' for b in built}
    ok(built == set(paths), f'sitemap과 만든 페이지가 다름: {sorted(built ^ set(paths))}')

    titles, descs = {}, {}
    for p, d in docs.items():
        ko = p.startswith('/ko/')
        ok(d.lang == ('ko' if ko else 'en'), f'{p}: <html lang>={d.lang}')
        ok(bool(d.title) and bool(d.desc) and bool(d.h1), f'{p}: title·description·h1 가운데 빈 것')
        ok(d.title not in titles, f'{p}: title이 {titles.get(d.title)}와 같음'); titles[d.title] = p
        ok(d.desc not in descs, f'{p}: description이 {descs.get(d.desc)}와 같음'); descs[d.desc] = p
        ok(d.canon == SITE + p, f'{p}: canonical={d.canon}')
        ok(d.robots is None, f'{p}: 공개 페이지에 robots 메타({d.robots})')
        ok(len(''.join(d.visible)) > 400, f'{p}: 첫 HTML 본문이 너무 짧음')
        internal = [h for h, _ in d.links if h.startswith('/')]
        ok(len(internal) >= 5, f'{p}: 첫 HTML 내부 링크가 적음({len(internal)})')
        # 내부 링크·해시
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
        # hreflang
        if d.alts:
            ok(set(d.alts) == {'en', 'ko', 'x-default'}, f'{p}: hreflang 묶음 {sorted(d.alts)}')
            ok(d.alts.get('ko' if ko else 'en') == SITE + p, f'{p}: hreflang에 자기 자신이 없음')
            ok(d.alts.get('x-default') == d.alts.get('en'), f'{p}: x-default가 영어판이 아님')
            other = (d.alts.get('en' if ko else 'ko') or '')[len(SITE):]
            ok(other in docs and docs[other].alts.get('ko' if ko else 'en') == SITE + p, f'{p}: hreflang 짝({other})이 되돌아오지 않음')
        # 영어 페이지의 한글
        if not ko:
            ok(not d.hangul_out, f'{p}: lang="ko" 밖 한글 {d.hangul_out[:3]}')
        # 광고 코드
        has_ads = any('adsbygoogle' in s for s in d.scripts)
        if p in NO_ADS:
            ok(not has_ads and d._ads == 0, f'{p}: 광고 없는 페이지에 광고 코드')
        else:
            ok(has_ads and d._ads >= 2, f'{p}: 광고 코드·자리({d._ads})가 없음')
        ok(any('ads-config.js' in s for s in d.scripts) == has_ads, f'{p}: ads-config.js와 광고 코드가 짝이 안 맞음')
        # JSON-LD
        types = [j.get('@type') for j in d.ld]
        faq_ld = [j for j in d.ld if j.get('@type') == 'FAQPage']
        if d.faq or faq_ld:
            got = [(q['name'], q['acceptedAnswer']['text']) for q in (faq_ld[0]['mainEntity'] if faq_ld else [])]
            ok(got == d.faq, f'{p}: FAQPage와 화면 FAQ가 다름')
        if '/guide/' in p and not p.endswith('/guide/'):
            art = [j for j in d.ld if j.get('@type') == 'Article']
            ok(bool(art) and art[0]['headline'] == d.h1 and art[0]['description'] == d.desc and art[0]['mainEntityOfPage'] == SITE + p, f'{p}: Article JSON-LD가 화면과 다름')
            ok('BreadcrumbList' in types, f'{p}: BreadcrumbList 없음')
        elif p not in NO_ADS:
            ok('WebApplication' in types, f'{p}: WebApplication 없음')
            app = [j for j in d.ld if j.get('@type') == 'WebApplication'][0]
            ok(app['url'] == SITE + p and app['description'] == d.desc, f'{p}: WebApplication 주소·설명이 화면과 다름')
        ok(not re.search(r'"(aggregateRating|review|reviewRating)"\s*:', json.dumps(d.ld)), f'{p}: 없는 평점·후기')
        ok('—' not in ''.join(d.visible).replace('(—)', ''), f'{p}: 화면 글에 줄표(—)')
    # 방침
    for p, word in (('/privacy/', 'web beacons'), ('/ko/privacy/', '웹 비콘')):
        t = (ROOT / p.lstrip('/') / 'index.html').read_text(encoding='utf-8')
        ok(word in t and 'https://policies.google.com/technologies/partner-sites' in t, f'{p}: 웹 비콘 문장·partner-sites 링크')
        for key in ('kk.lang', 'kk.jasoseo.on', 'kk.jasoseo', 'kk.set'):
            ok(f'<code>{key}</code>' in t, f'{p}: 저장 항목 {key}가 방침에 없음')
        ok('localStorage' in t and 'sessionStorage' in t, f'{p}: 어느 저장소에 남는지(localStorage·sessionStorage)를 적어야 함')
        ok(('이 사이트가 직접 남기는 것은' in t) if p.startswith('/ko/') else ('this site itself stores' in t), f'{p}: "이 사이트가 직접 남기는 것은"으로 적는다(광고가 두는 쿠키는 따로)')
        ok('아래 항목만 남겨요' not in t and 'Only the following items are kept' not in t and 'Nothing else is stored' not in t, f'{p}: 광고 쪽 저장까지 없다고 읽히는 옛 문장이 남아 있음')
    # app.js가 쓰는 저장 키 = 방침에 적은 키: localStorage 셋(kk.lang·kk.jasoseo.on·kk.jasoseo) + sessionStorage 하나(kk.set)
    appjs = (ROOT / 'assets' / 'app.js').read_text(encoding='utf-8')
    keys = set(re.findall(r"'(kk\.[a-z.]+)'", appjs))
    ok(keys == {'kk.lang', 'kk.jasoseo', 'kk.jasoseo.on', 'kk.set'}, f'app.js의 저장 키가 방침과 다름: {sorted(keys)}')
    ok("SESSION = 'kk.set'" in appjs and appjs.count('sessionStorage.') == 2 and appjs.count('localStorage.') == 3 and 'document.cookie' not in appjs and 'indexedDB' not in appjs,
       'app.js: 저장은 store()(localStorage)와 sget()/sset()(sessionStorage의 kk.set 하나)로만 한다')
    # 페이지에 넣은 짧은 스크립트(언어 띠·목표·자소서 문항을 첫 그림 전에 정함)도 같은 키만 읽는다
    for rel in ROOT.rglob('index.html'):
        if '_dev' in rel.parts:
            continue
        inline = set(re.findall(r"'(kk\.[a-z.]+)'", rel.read_text(encoding='utf-8')))
        ok(inline <= {'kk.lang', 'kk.jasoseo', 'kk.jasoseo.on', 'kk.set'}, f'{rel.relative_to(ROOT)}: 방침에 없는 저장 키 {sorted(inline)}')
    # 404
    nf = (ROOT / '404.html').read_text(encoding='utf-8')
    ok('adsbygoogle' not in nf and 'noindex' in nf, '404: 광고 코드가 없고 noindex여야 함')
    # 그 밖의 파일
    ok((ROOT / 'ads.txt').read_text().strip() == 'google.com, pub-9496167591465154, DIRECT, f08c47fec0942fa0', 'ads.txt')
    ok((ROOT / 'googlea614029e84d58498.html').read_text().strip() == 'google-site-verification: googlea614029e84d58498.html', '구글 확인 파일')
    ok('Sitemap: https://count.lumenlab.page/sitemap.xml' in (ROOT / 'robots.txt').read_text(), 'robots.txt Sitemap 줄')
    for f in ('favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og.png', 'og-ko.png', 'wrangler.jsonc', '.assetsignore', '.deploy-actions', 'rss.xml'):
        ok((ROOT / f).exists(), f'{f} 없음')
    rss = (ROOT / 'rss.xml').read_text(encoding='utf-8')
    ok(rss.count('<item>') == sum(1 for p in paths if p.startswith('/ko/guide/') and p != '/ko/guide/'), 'rss.xml 글 수 = 한국어 글 수')
    for junk in ('node_modules', '__pycache__', '.wrangler'):
        ok(not list(ROOT.rglob(junk)), f'폴더 안에 {junk}가 남아 있음')
    # ── 확인된 사실(_dev/limits.json): 확인된 것만, 출처 링크와 확인한 날을 화면에 같이 ──
    lim = json.loads((ROOT / '_dev' / 'limits.json').read_text(encoding='utf-8'))
    ok(all(v.get('verified') is True and v.get('checked') == '2026-10-10' for k, v in lim.items() if isinstance(v, dict)), 'limits.json: verified·checked 가 빠진 묶음이 있음')
    raw = {p: (ROOT / p.lstrip('/') / 'index.html').read_text(encoding='utf-8') for p in docs}
    vis = {p: ''.join(d.visible) for p, d in docs.items()}
    hrefs = {p: {h for h, _ in d.links} for p, d in docs.items()}
    need = {
        '/ko/neis/': [lim['neis']['source']],
        '/ko/guide/neis-500ja-1500byte/': [lim['neis']['source']],
        '/ko/byte/': [u for _, u in lim['kr_sms']['sources']],
        '/ko/sns/': [r['src'] for r in lim['sns']['rows']],
        '/character-counter/': [r['src'] for r in lim['sns']['rows']] + [lim['sns']['x_config']['src']],
        '/guide/how-x-counts-characters/': ['https://docs.x.com/fundamentals/counting-characters', lim['sns']['x_config']['src']],
        '/': [lim['reading']['source']],
        '/ko/wongoji/': [lim['wongoji_rules']['source'], lim['wongoji_rules']['custom_source']],
        '/ko/jasoseo/': [r['url'] for r in lim['jobsites']['rows']],
        '/ko/guide/geulja-su-dareun-iyu/': [r['url'] for r in lim['jobsites']['rows']],
    }
    for p, urls in need.items():
        ok(p in docs, f'{p}: 페이지가 없음')
        if p not in docs:
            continue
        for u in urls:
            ok(u in hrefs[p], f'{p}: 출처 링크가 없음 {u}')
        day = 'checked 2026-10-10' if not p.startswith('/ko/') else ('2026년 10월 10일' if 'jobsites' in str(urls) or p in ('/ko/jasoseo/', '/ko/guide/geulja-su-dareun-iyu/') else '2026-10-10 확인')
        ok(day in vis[p] or '2026-10-10' in vis[p], f'{p}: 확인한 날이 화면에 없음')
    ok('2026년 10월 10일' in vis['/ko/jasoseo/'] and '2026년 10월 10일' in vis['/ko/guide/geulja-su-dareun-iyu/'], '취업 사이트 측정값: 넣어 본 날짜가 화면에 없음')
    # 나이스: 2026학년도 고등학교 기준이라고 밝히고, 표의 숫자 = limits.json, 원문 인용 그대로
    n = lim['neis']
    for p in ('/ko/neis/', '/ko/guide/neis-500ja-1500byte/'):
        ok('2026학년도' in vis[p] and '고등학교' in vis[p], f'{p}: 학년도·학교급을 밝혀야 함')
        ok(n['quote'].lstrip('※ ') in vis[p], f'{p}: 기재요령 원문 인용이 다름')
        for it in n['items']:
            ok(f'{it["name"]}' in vis[p] and f'{it["chars"]:,}자' in vis[p] and f'{it["chars"] * 3:,}Byte' in vis[p], f'{p}: 항목 {it["name"]} 숫자가 없음')
    ok('계산' in vis['/ko/neis/'] and '엔터 1Byte' in vis['/ko/neis/'], '/ko/neis/: 바이트는 계산한 값이라고 밝히고 엔터 1Byte를 적는다')
    # SNS 한도: 목록의 한도·단위 = limits.json
    for p, lang in (('/ko/sns/', 'ko'), ('/character-counter/', 'en')):
        for r in lim['sns']['rows']:
            ok(f'data-unit="{r["unit"]}" data-limit="{r["limit"]}" data-id="{r["id"]}"' in raw[p] and r[lang] in vis[p], f'{p}: SNS 한도 {r["id"]} 줄이 limits.json 과 다름')
    # 확인하지 못한 것은 싣지 않는다
    allvis = '\n'.join(vis.values())
    for word in ('페이스북', 'Facebook', '63,206', 'SKT', '3gpp.org', 'dynareport'):
        ok(word not in allvis and word not in ''.join(raw.values()), f'확인 못 한 것({word})이 화면·링크에 있음')
    for m in re.finditer(r'[^.。\n]*SK텔레콤[^.。\n]*', allvis):
        ok('확인하지 못했' in m.group(0), f'SK텔레콤은 확인하지 못했다는 문장에서만: {m.group(0)[:50]}')
    for m in re.finditer(r'[^.。\n]*(?:중학교|초등학교)[^.。\n]*', allvis):
        ok('확인하지 못' in m.group(0) or '초등 원고지' in m.group(0), f'중학교·초등학교 값은 싣지 않는다: {m.group(0)[:50]}')
    for p, t in vis.items():
        if '700자' in t:
            ok('2025학년도' in t, f'{p}: 진로활동 700자는 2025학년도까지의 값이라고 밝혀야 함')
    for m in re.finditer(r'[^.\n]*90byte[^.\n]*', allvis):
        ok(any(w in m.group(0) for w in ('웹 문자 발송', '직접 입력', '45자')), f'90byte는 웹 문자 발송 서비스 쪽 숫자라고 밝힌 곳에서만: {m.group(0)[:60]}')
    en2 = vis.get('/guide/why-161-characters-is-two-sms/', '')
    ok('6 bytes' not in en2 and '7 of the' not in en2 and '3GPP TS 23.040' in en2, 'SMS 글: 머리 크기 문장은 빼고 표준 번호만 글자로')
    # 방침: 방문 통계(Cloudflare Web Analytics)를 적고, '분석 도구 없음' 뜻의 문장이 없을 것
    for p in ('/privacy/', '/ko/privacy/'):
        ok('Cloudflare Web Analytics' in vis[p] and 'https://www.cloudflare.com/web-analytics/' in hrefs[p], f'{p}: Cloudflare Web Analytics 문장·링크')
    for p in ('/privacy/', '/ko/privacy/', '/about/', '/ko/about/', '/', '/ko/'):
        bad = re.search(r'분석 도구[를는은]? ?(쓰지|사용하지|없)|통계[를는은]? ?(모으지|수집하지) 않|추적하지 않|no analytics|(do not|don\'t|never) (use|run) (any )?analytics|no tracking|(do not|don\'t) track|아무것도 (보내지|전송하지) 않', vis[p], re.I)
        ok(not bad, f'{p}: 방문 통계가 없다는 뜻의 문장 "{bad.group(0) if bad else ""}"')
    # 새 페이지(나이스·SNS)는 다른 언어 짝이 없다
    for p in ('/ko/neis/', '/ko/sns/'):
        ok(not docs[p].alts, f'{p}: 짝이 없는 페이지에 hreflang')
    # '세다'의 높임 '세요'는 명령과 헷갈린다: '세어요'로 쓴다
    for p, t in vis.items():
        m = re.search(r'(로|씩|따로|나란히|바이트를|글자를|수를|이렇게) 세요', t)
        ok(not m, f'{p}: 헷갈리는 "세요" → "세어요": {m.group(0) if m else ""}')
    # '고친 날' → '마지막 확인'
    ok('고친 날' not in allvis and 'Updated ' not in allvis, "'고친 날'/'Updated' 가 남아 있음")
    # 표는 한 겹만 감싼다(두 겹이면 넓은 표가 옆으로 밀리지 않는다)
    ok(not any(re.search(r'<div class="tbl[^>]*>\s*<div class="tbl', r) for r in raw.values()) and all(r.count('<table') == r.count('<div class="tbl') for r in raw.values()), '표를 감싼 칸(.tbl)이 표 수와 다르거나 두 겹')
    # ── 제3자 평가(2026-10-10) 뒤에 더한 것 ──
    tools = [p for p in docs if p not in NO_ADS and '/guide/' not in p]
    ok(len(tools) == 9, f'도구 화면 9쪽: {tools}')
    for p in tools:
        ko = p.startswith('/ko/')
        ok('<noscript><p class="nojs wrap">' in raw[p] and (('자바스크립트' if ko else 'JavaScript') in raw[p]), f'{p}: 자바스크립트가 꺼져 있을 때의 안내(<noscript>)가 없음')
        ok('class="strip' in raw[p], f'{p}: 휴대폰 숫자 띠가 없음')
        ok(raw[p].count("localStorage.getItem('kk.lang')") == 1, f'{p}: 언어 안내 띠를 첫 그림 전에 정하는 스크립트')
    ok('js-strip' in raw['/ko/jasoseo/'] and 'id="sLeft"' in raw['/ko/jasoseo/'] and 'id="sGoal"' in raw['/ko/jasoseo/'], '/ko/jasoseo/: 지금 문항의 글자 수·남은 글자·목표 띠')
    ok('data-nlb="2"' in raw['/ko/jasoseo/'] and 'id="presetUndo"' in raw['/ko/jasoseo/'] and 'id="wipeUndo"' in raw['/ko/jasoseo/'], '/ko/jasoseo/: 바이트 줄바꿈 따로 고르기, 맞추기·지우기 되돌리기')
    ok('data-act="print"' in raw['/ko/wongoji/'] and 'id="printSheets"' in raw['/ko/wongoji/'], '/ko/wongoji/: 원고지 인쇄 단추와 인쇄용 칸')
    ok("localStorage.getItem('kk.lang')" not in (ROOT / '404.html').read_text(encoding='utf-8'), '404: 언어 안내 띠 스크립트를 넣지 않는다')
    bs = [r for r in lim['sns']['rows'] if r['id'] == 'bs'][0]
    for p in ('/ko/sns/', '/character-counter/'):
        ok(f'data-id="bs" data-unit2="{bs["unit2"]}" data-limit2="{bs["limit2"]}"' in raw[p] and 'data-lim-n2' in raw[p] and f'{bs["limit2"]:,}' in vis[p], f'{p}: 블루스카이 둘째 한도(UTF-8 3,000바이트)')
    # 자주 묻는 질문·설명이 가리키는 이름은 화면에 실제로 있는 이름이어야 한다
    for p in tools:
        ok("'세는 기준'에서" not in vis[p] and 'under “How this counts”' not in vis[p] and 'Open “How this counts”' not in vis[p], f'{p}: 화면에 없는 이름(세는 기준·How this counts)을 가리킴')
    ok("'줄바꿈은 1자로 셈' 줄의 '바꾸기'" in vis['/ko/'] and '줄바꿈은 1자로 셈' in raw['/ko/'] and '<em>바꾸기</em>' in raw['/ko/'], "/ko/: FAQ가 가리키는 '줄바꿈은 1자로 셈 · 바꾸기'가 화면에 있음")
    ok('“change” in the “Line breaks count as 1” row' in vis['/'] and 'Line breaks count as 1' in raw['/'] and '<em>change</em>' in raw['/'], '/: FAQ가 가리키는 “Line breaks count as 1 · change”가 화면에 있음')
    ok("'줄바꿈은 1자·1byte로 셈' 줄의 '바꾸기'" in vis['/ko/jasoseo/'] and '줄바꿈은 1자·1byte로 셈' in raw['/ko/jasoseo/'], "/ko/jasoseo/: FAQ가 가리키는 '줄바꿈은 1자·1byte로 셈 · 바꾸기'가 화면에 있음")
    ok('differ slightly from one browser to another' in vis['/'], '/: Words(Unicode rules)는 브라우저마다 조금 다를 수 있다는 한 줄')
    # 화면이 쓰는 문구(#kk JSON)에도 헷갈리는 "세요"(세다)가 없어야 한다
    content = json.loads((ROOT / '_dev' / 'content.json').read_text(encoding='utf-8'))
    tko = json.dumps(content['t']['ko'], ensure_ascii=False)
    m = re.search(r'(로|씩|따로|나란히|바이트를|글자를|수를|이렇게) 세요', tko)
    ok(not m, f'content.json t.ko: 헷갈리는 "세요" → "세어요": {m.group(0) if m else ""}')
    # 광고 자리: 안쪽 틀(.ad-in)이 있어 글 기둥 폭에 맞는다
    ok(all(r.count('class="ad-in"') == r.count('data-ad=') for r in raw.values()), '광고 자리에 .ad-in 틀이 없음')

    print(f'{"실패" if fails else "통과"}  정적 검사: {passed}개 통과' + (f', {len(fails)}개 실패' if fails else '') + f' (페이지 {len(docs)}장)')
    for m in fails[:40]:
        print('   -', m)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
