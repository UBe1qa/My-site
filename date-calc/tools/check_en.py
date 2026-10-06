#!/usr/bin/env python3
"""영어판(/en/)과 언어 연결 검사. tests/run.sh 가 check_i18n.py 다음에 돌린다.

- en/ 파일이 build_en.py로 다시 만든 결과와 같다(index.html·i18n.js를 고치고 안 돌린 경우를 잡는다)
- 영어 페이지에 lang="ko" 밖 한글 0 (글자·속성·주석·JSON-LD까지)
- canonical·og:url·hreflang(같은 내용인 / ↔ /en/, /about/ ↔ /en/about/만), 제목·설명이 페이지마다 다름, 확인 태그 없음
- 구조화 데이터가 화면과 같다: FAQPage = 보이는 질문·답, Article headline = h1, BreadcrumbList = 빵가루
- 사이트 안 링크·#해시가 실제 파일·id로 이어지고, 영어 페이지는 lang="ko" 표시 없이 한국어 페이지로 링크하지 않는다
- 광고: 영어 계산기 = 한국어 계산기와 같은 광고 코드·자리, 404엔 광고 코드 없음 + noindex
- sitemap: 영어 주소가 다 있고, 모든 주소가 실제 파일로 이어진다
"""
import html, json, os, re, sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_en  # noqa: E402
from build_guides import AD_HEAD, BASE, ROOT  # noqa: E402

bad = []


def fail(msg):
    bad.append(msg)
    print("✗", msg)


def rd(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def file_for(path):
    """주소 경로 → 파일(Cloudflare 정적 파일 규칙: /x/ → x/index.html, /privacy → privacy.html)."""
    p = path.lstrip("/")
    if p == "" or p.endswith("/"):
        p += "index.html"
    full = os.path.join(ROOT, p)
    if os.path.isfile(full):
        return p
    if os.path.isfile(full + ".html"):
        return p + ".html"
    return None


def page_path(rel):
    """파일 → 주소 경로"""
    if rel.endswith("index.html"):
        return "/" + rel[: -len("index.html")]
    return "/" + rel[:-5] if rel.endswith(".html") else "/" + rel


class Scan(HTMLParser):
    """링크(주소, 그 자리의 언어), id, 빵가루·h1·FAQ 글자를 모은다."""
    VOID = build_en.VOID

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.links, self.ids = [], [], set()
        self.h1, self.crumbs, self.faq = "", [], []
        self._grab = None

    def lang(self):
        for _, l, _ in reversed(self.stack):
            if l:
                return l
        return ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        cls = a.get("class", "")
        if tag not in self.VOID:
            self.stack.append((tag, a.get("lang"), cls))
        if tag in ("a", "link", "script") and (a.get("href") or a.get("src")):
            self.links.append((tag, a.get("href") or a.get("src"), self.lang(), a.get("rel", "")))
        if tag == "h1":
            self._grab = ["h1", ""]
        elif tag == "summary":
            self._grab = ["q", ""]
        elif tag == "p" and self.stack[-2:-1] and self.stack[-2][0] == "details":
            self._grab = ["a", ""]
        in_crumbs = any(t == "nav" and "crumbs" in c for t, _, c in self.stack)
        if in_crumbs and tag in ("a", "span"):
            self._grab = ["c", ""]

    def handle_endtag(self, tag):
        if self._grab and ((self._grab[0] == "h1" and tag == "h1") or (self._grab[0] == "q" and tag == "summary")
                           or (self._grab[0] == "a" and tag == "p") or (self._grab[0] == "c" and tag in ("a", "span"))):
            kind, text = self._grab
            text = " ".join(text.split())
            if kind == "h1":
                self.h1 = text
            elif kind == "q":
                self.faq.append([text, None])
            elif kind == "a":
                self.faq[-1][1] = text
            else:
                self.crumbs.append(text)
            self._grab = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self._grab:
            self._grab[1] += data


def scan(text):
    s = Scan()
    s.feed(text)
    s.close()
    return s


def lds(text):
    out = []
    for raw in re.findall(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', text, flags=re.S):
        try:
            d = json.loads(raw)
        except ValueError as e:
            fail(f"JSON-LD 해석 안 됨: {e}")
            continue
        out.extend(d.get("@graph", [d]))
    return out


def meta(text, name, attr="name"):
    m = re.search(rf'<meta {attr}="{re.escape(name)}" content="([^"]*)"', text)
    return html.unescape(m.group(1)) if m else None


def link_rel(text, rel):
    m = re.search(rf'<link rel="{rel}" href="([^"]*)"', text)
    return m.group(1) if m else None


def hreflangs(text):
    return dict(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"', text))


# 1) 새로 만든 결과와 같은가
generated = build_en.pages()
for rel, want in generated.items():
    full = os.path.join(ROOT, rel)
    if not os.path.isfile(full):
        fail(f"{rel} 없음 → python3 tools/build_guides.py")
    elif rd(rel) != want:
        fail(f"{rel} 가 낡음(index.html·i18n.js·build_en.py가 바뀜) → python3 tools/build_guides.py")
on_disk = {os.path.relpath(os.path.join(d, f), ROOT) for d, _, fs in os.walk(os.path.join(ROOT, "en")) for f in fs}
for extra in sorted(on_disk - set(generated)):
    fail(f"en/ 안에 빌드가 만들지 않은 파일: {extra}")

# 2~4) 페이지마다
EN_PAGES = sorted(generated)
KO_PAGES = ["index.html", "about/index.html", "guide/index.html", "privacy.html", "404.html"] + sorted(
    os.path.relpath(os.path.join(d, "index.html"), ROOT) for d, _, fs in os.walk(os.path.join(ROOT, "guide")) if "index.html" in fs and d != os.path.join(ROOT, "guide"))
PAIRS = {k: v for k, v in build_en.PAIRS.items()}
PAIRS.update({v: k for k, v in build_en.PAIRS.items()})
KO_PATHS = {page_path(p) for p in KO_PAGES if p not in ("404.html", "privacy.html")}  # 방침은 한·영 두 칸이라 뺀다(영어는 /privacy#en)
titles, descs = {}, {}

for rel in EN_PAGES + KO_PAGES:
    text = rd(rel)
    path = page_path(rel)
    is_en = rel.startswith("en/")
    s = scan(text)

    if is_en:
        for b in build_en.hangul_outside_ko(text):
            fail(f"{rel}: lang=\"ko\" 밖 한글: {b}")
        if not text.startswith('<!doctype html>\n<html lang="en">'):
            fail(f"{rel}: <html lang=\"en\"> 아님")
        if "site-verification" in text:
            fail(f"{rel}: 서치 콘솔·네이버 확인 태그가 영어판에 있음")
        if AD_HEAD not in text:
            fail(f"{rel}: 광고 코드 없음")
    if rel == "404.html":
        if "adsbygoogle" in text or "ads-config" in text:
            fail("404.html: 광고 코드가 있음")
        if '<meta name="robots" content="noindex">' not in text:
            fail("404.html: noindex 없음")
        hrefs = {h for t, h, _, _ in s.links if t == "a"}
        if not {"/", "/en/"} <= hrefs:
            fail("404.html: / 와 /en/ 링크가 둘 다 있어야 함")
        continue

    # canonical, og:url, 제목·설명이 서로 다름
    canon = link_rel(text, "canonical")
    if rel != "privacy.html":
        if canon != BASE + path:
            fail(f"{rel}: canonical {canon} ≠ {BASE + path}")
        if meta(text, "og:url", "property") != canon:
            fail(f"{rel}: og:url ≠ canonical")
    title = html.unescape(re.search(r"<title>(.*?)</title>", text).group(1))
    desc = meta(text, "description")
    for seen, val, kind in ((titles, title, "title"), (descs, desc, "description")):
        if val in seen:
            fail(f"{rel}: {kind}가 {seen[val]} 와 같음")
        seen[val] = rel
    if is_en and meta(text, "og:locale", "property") != "en_US":
        fail(f"{rel}: og:locale이 en_US 아님")

    # hreflang: 같은 내용 짝만
    hl = hreflangs(text)
    if path in PAIRS:
        ko, en = (path, PAIRS[path]) if not is_en else (PAIRS[path], path)
        want = {"ko": BASE + ko, "en": BASE + en, "x-default": BASE + en}
        if hl != want:
            fail(f"{rel}: hreflang {hl} ≠ {want}")
    elif hl:
        fail(f"{rel}: 짝이 없는 페이지에 hreflang {hl}")

    # 구조화 데이터 = 화면
    for d in lds(text):
        t = d.get("@type")
        if t == "FAQPage":
            got = [[q["name"], q["acceptedAnswer"]["text"]] for q in d["mainEntity"]]
            if got != s.faq:
                fail(f"{rel}: FAQPage 구조화 데이터가 화면 FAQ와 다름\n   데이터 {got}\n   화면   {s.faq}")
        elif t == "Article":
            if d["headline"] != s.h1:
                fail(f"{rel}: Article headline ≠ h1 ({d['headline']!r} / {s.h1!r})")
            if d["description"] != desc:
                fail(f"{rel}: Article description ≠ meta description")
            if d["mainEntityOfPage"] != BASE + path:
                fail(f"{rel}: Article mainEntityOfPage ≠ 주소")
        elif t == "BreadcrumbList":
            names = [i["name"] for i in d["itemListElement"]]
            if names != s.crumbs:
                fail(f"{rel}: BreadcrumbList {names} ≠ 화면 빵가루 {s.crumbs}")
            if d["itemListElement"][-1]["item"] != BASE + path:
                fail(f"{rel}: BreadcrumbList 마지막이 이 페이지가 아님")
        elif t in ("WebApplication", "CollectionPage", "AboutPage"):
            want_lang = "en" if is_en else "ko"
            if d.get("inLanguage") != want_lang:
                fail(f"{rel}: {t} inLanguage {d.get('inLanguage')} ≠ {want_lang}")

    # 사이트 안 링크
    for tag, href, lang, linkrel in s.links:
        u = urlsplit(urljoin("https://date.lumenlab.page" + path, href))
        if u.netloc != "date.lumenlab.page" or u.scheme not in ("http", "https"):
            continue
        target = file_for(u.path)
        if target is None:
            fail(f"{rel}: 없는 주소로 링크 {href}")
            continue
        if u.fragment and target.endswith(".html"):
            if u.fragment not in scan(rd(target)).ids:
                fail(f"{rel}: {href} 의 #{u.fragment} 가 {target}에 없음")
        if is_en and tag == "a" and u.path in KO_PATHS and not lang.startswith("ko"):
            fail(f"{rel}: 영어 페이지가 한국어 페이지 {href} 로 링크(lang=\"ko\" 표시 필요)")

# 5) 영어 계산기 = 한국어 계산기와 같은 광고 자리·광고 설정
ko, en = rd("index.html"), rd("en/index.html")
slots = lambda t: re.findall(r'<div class="ad-slot" data-ad="([^"]+)"', t)
if slots(ko) != slots(en) or len(slots(en)) != 3:
    fail(f"광고 자리 다름: 한국어 {slots(ko)} / 영어 {slots(en)}")
if '<script src="/assets/ads-config.js"></script>' not in en:
    fail("en/index.html: ads-config.js 없음")
tools_ko = re.findall(r'<section class="tool"[^>]* id="([^"]+)"', ko)
if tools_ko != re.findall(r'<section class="tool"[^>]* id="([^"]+)"', en) or len(tools_ko) != 11:
    fail("계산기 섹션이 한국어·영어에서 다름")

# 6) sitemap
sm = rd("sitemap.xml")
locs = re.findall(r"<loc>([^<]+)</loc>", sm)
for u in build_en.urls():
    if BASE + u not in locs:
        fail(f"sitemap에 {u} 없음")
for loc in locs:
    if not loc.startswith(BASE) or file_for(loc[len(BASE):]) is None:
        fail(f"sitemap 주소가 파일로 안 이어짐: {loc}")
if len(set(locs)) != len(locs):
    fail("sitemap에 같은 주소가 두 번")

print(("✗ 영어판 검사 %d개 문제" % len(bad)) if bad else "✅ 영어판 검사 통과 (영어 %d쪽, 한국어 %d쪽, sitemap %d개)" % (len(EN_PAGES), len(KO_PAGES), len(locs)))
sys.exit(1 if bad else 0)
