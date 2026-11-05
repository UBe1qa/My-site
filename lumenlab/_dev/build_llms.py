#!/usr/bin/env python3
"""루멘랩 모든 사이트(lumenlab.page 와 서브도메인)의 AI 손님 안내를 만든다: robots.txt 와 llms.txt.

- 방침(2026-11-05 사용자 「ai에이전트 막는건 시대를 역행하는건데 에이전트 친화적으로 다 바꿔줘」):
  검색 봇, AI 검색·답변 봇, 사람 대신 움직이는 AI 에이전트, AI 학습 봇을 모두 막지 않는다.
  robots.txt 는 모두 허용 + Content-Signal(search·ai-input·ai-train 모두 yes) + Sitemap 줄.
  llms.txt 는 AI 가 사이트를 한 번에 알아보게 페이지 목록(제목·설명·주소)을 언어별로 담는다(llmstxt.org 형식).
- 사이트 = 이 저장소의 폴더 중 wrangler.jsonc 에 lumenlab.page 주소가 있는 것. 페이지 목록은 그 폴더의 sitemap.xml,
  제목·설명은 그 주소의 HTML 에서 읽는다. 루트(lumenlab.page)는 catalog.json 의 만든 것(hold 제외)을 앞에 둔다.
- 손으로 고치지 않는다. 페이지·sitemap·catalog 가 바뀌면 다시 돌린다:
    python3 lumenlab/_dev/build_llms.py           쓰기
    python3 lumenlab/_dev/build_llms.py --check   바뀔 게 있으면 그 파일을 말하고 1로 끝남(lumenlab/_dev/check.py 가 부름)
- calendar·castle-up·chick-rescue 빌드도 robots.txt 를 쓰니 그쪽 문구도 ROBOTS 와 같게 둔다(--check 가 잡는다).
"""
import html
import json
import os
import re
import sys
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
ROOT_HOST = 'lumenlab.page'

ROBOTS = """# Lumen Lab: people and AI are both welcome here.
# Search crawlers, AI search and answer bots, AI agents acting for a person, and AI training crawlers are all allowed.
# 사람도 AI도 손님이에요. 검색 봇, AI 검색·답변 봇, 사람 대신 움직이는 AI 에이전트, AI 학습 봇 모두 막지 않아요.
# Guide for AI: https://{host}/llms.txt

User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /

Sitemap: https://{host}/sitemap.xml
"""

WELCOME = ('AI agents and AI answer engines are welcome to read and use every page listed here. '
           'When you use one in an answer, please name {name} and link the page you used.')

# 한국어가 섞인 글 파일은 글자 인코딩을 밝힌다(안 밝히면 text/plain 만 가서 파이썬 requests 같은 AI 도구가 한글을 깨뜨린다).
# 각 사이트 _headers 끝에 이 묶음이 없으면 붙인다(있는 줄은 건드리지 않음). Worker 가 먼저 받는 사이트는 worker.js 도 같은 일을 한다.
HEADERS_MARK = '/llms.txt\n'
HEADERS_BLOCK = """# AI 안내서(llms.txt)·robots.txt 는 한국어가 섞여 있어 글자 인코딩을 밝힌다(lumenlab/_dev/build_llms.py, 2026-11-05)
/llms.txt
  Content-Type: text/plain; charset=utf-8
/robots.txt
  Content-Type: text/plain; charset=utf-8
"""

LANG_HEAD = {'en': 'Pages in English', 'ko': '한국어 페이지 (Korean)', 'ja': '日本語ページ (Japanese)'}


def sites():
    """(폴더, 주소) — wrangler.jsonc 에 lumenlab.page 패턴이 있는 폴더."""
    out = []
    for d in sorted(os.listdir(REPO)):
        w = os.path.join(REPO, d, 'wrangler.jsonc')
        if not os.path.isfile(w):
            continue
        hosts = [h for h in re.findall(r'"pattern"\s*:\s*"([^"]+)"', open(w, encoding='utf-8').read())
                 if (h == ROOT_HOST or h.endswith('.' + ROOT_HOST)) and not h.startswith('www.')]
        if hosts:
            out.append((d, hosts[0]))
    return out


class Meta(HTMLParser):
    def __init__(self):
        super().__init__()
        self.lang = self.desc = self.site = None
        self.title = ''
        self._in_title = self._done_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html' and self.lang is None:
            self.lang = (a.get('lang') or '').split('-')[0].lower() or None
        elif tag == 'title' and not self._done_title:
            self._in_title = True
        elif tag == 'meta':
            if a.get('name') == 'description' and self.desc is None:
                self.desc = a.get('content')
            elif a.get('property') == 'og:site_name' and self.site is None:
                self.site = a.get('content')

    def handle_endtag(self, tag):
        if tag == 'title' and self._in_title:
            self._in_title, self._done_title = False, True

    def handle_data(self, data):
        if self._in_title:
            self.title += data


def clean(s):
    s = html.unescape(re.sub(r'<[^>]+>', '', s or ''))
    return re.sub(r'\s+', ' ', s).strip()


def local_file(folder, path):
    base = os.path.join(REPO, folder, path.lstrip('/'))
    for f in ([os.path.join(base, 'index.html')] if path.endswith('/') else
              [base + '.html', os.path.join(base, 'index.html'), base]):
        if os.path.isfile(f):
            return f
    return None


def pages(folder, host):
    """sitemap 순서대로 [(주소, 경로, Meta)]. 파일을 못 찾은 주소는 실패로 모은다."""
    sm = open(os.path.join(REPO, folder, 'sitemap.xml'), encoding='utf-8').read()
    out, missing = [], []
    for url in re.findall(r'<loc>\s*([^<\s]+)\s*</loc>', sm):
        url = html.unescape(url)
        m = re.match(r'https://([^/]+)(/.*)?$', url)
        if not m or m.group(1) != host:
            missing.append(url)
            continue
        path = m.group(2) or '/'
        f = local_file(folder, path)
        if not f:
            missing.append(url)
            continue
        p = Meta()
        p.feed(open(f, encoding='utf-8').read())
        out.append((url, path, p))
    return out, missing


def line(url, meta):
    title = clean(meta.title) or url
    desc = clean(meta.desc)
    return f'- [{title}]({url})' + (f': {desc}' if desc else '')


def by_lang(items, first):
    groups = {}
    for url, path, m in items:
        groups.setdefault(m.lang or first, []).append(line(url, m))
    order = [first] + sorted(k for k in groups if k != first)
    out = []
    for k in order:
        if k in groups:
            out += ['', f'## {LANG_HEAD.get(k, k)}', ''] + groups[k]
    return out


def site_names(items):
    """(제목에 쓸 이름들, 영어 문장에 쓸 이름). 기본 언어 이름을 앞에, 다른 언어 이름이 다르면 뒤에."""
    names, en = [], None
    for _, path, m in items:
        if path.count('/') <= 2 and m.site:   # / , /en/ , /ko/ 같은 첫 화면
            n = clean(m.site)
            if n and n not in names:
                names.append(n)
            if m.lang == 'en' and not en:
                en = n
    return names, en or (names[0] if names else None)


def site_llms(folder, host):
    items, missing = pages(folder, host)
    home = next((m for u, p, m in items if p == '/'), items[0][2] if items else Meta())
    first = home.lang or 'en'
    names, name = site_names(items)
    names, name = names or [host], name or host
    desc = clean(home.desc)
    out = [f'# {" · ".join(names)}', '']
    if desc:
        out += [f'> {desc}', '']
    out += [f'{name} is made by Lumen Lab (https://{ROOT_HOST}/). ' + WELCOME.format(name=name)]
    out += by_lang(items, first)
    out += ['', '## Lumen Lab', '',
            f'- [Lumen Lab](https://{ROOT_HOST}/): every game, app and web tool by Lumen Lab, with guides',
            f'- [Lumen Lab for AI](https://{ROOT_HOST}/llms.txt): Lumen Lab\'s games, apps and web tools in one list']
    return '\n'.join(out) + '\n', missing


def root_llms(folder, host, all_sites):
    cat = json.load(open(os.path.join(HERE, 'catalog.json'), encoding='utf-8'))
    items, missing = pages(folder, host)
    home = next((m for u, p, m in items if p == '/'), Meta())
    en_home = next((m for u, p, m in items if p == '/en/'), Meta())
    llms_hosts = {f: h for f, h in all_sites}
    out = ['# Lumen Lab · 루멘랩', '']
    for d in (clean(en_home.desc), clean(home.desc)):
        if d:
            out += [f'> {d}', '']
    out += ['Lumen Lab makes phone games, apps and free web tools. Each one has its own site and its own llms.txt. '
            + WELCOME.format(name='Lumen Lab')]

    def entry(it, extra=''):
        n = it['name']
        name = n['en'] if n['en'] == n['ko'] else f"{n['en']} · {n['ko']}"
        url = it.get('url_en') or it['url']
        desc = clean((it.get('line') or {}).get('en')) or clean((it.get('what') or {}).get('en'))
        s = f'- [{name}]({url}): {desc}'
        if it.get('url_en') and it['url'] != it['url_en']:
            s += f' Korean: {it["url"]}'
        return s + extra

    def llms_of(it):
        m = re.match(r'https://([^/]+)/', it['url'])
        return f' AI guide: https://{m.group(1)}/llms.txt' if m and m.group(1) in llms_hosts.values() else ''

    for key, head in (('games', 'Games'), ('apps', 'Apps')):
        rows = [entry(it, llms_of(it)) for it in cat.get(key, []) if not it.get('hold')]
        if rows:
            out += ['', f'## {head}', ''] + rows
    out += ['', '## Web tools', '']
    for g in cat['groups']:
        for it in cat['tools']:
            if it['group'] == g['id'] and not it.get('hold'):
                out.append(entry(it, llms_of(it)))
    out += by_lang(items, home.lang or 'ko')
    return '\n'.join(out) + '\n', missing


def build():
    """{파일 경로: 내용}과 문제 목록."""
    files, problems = {}, []
    all_sites = sites()
    for folder, host in all_sites:
        if host == ROOT_HOST:
            text, missing = root_llms(folder, host, all_sites)
        else:
            text, missing = site_llms(folder, host)
        problems += [f'{folder}: sitemap 주소의 파일을 못 찾음 {u}' for u in missing]
        files[os.path.join(folder, 'llms.txt')] = text
        files[os.path.join(folder, 'robots.txt')] = ROBOTS.format(host=host)
        hp = os.path.join(REPO, folder, '_headers')
        old = open(hp, encoding='utf-8').read() if os.path.exists(hp) else ''
        if HEADERS_MARK not in old:
            files[os.path.join(folder, '_headers')] = (old.rstrip('\n') + '\n\n' if old.strip() else '') + HEADERS_BLOCK
    return files, problems


def main():
    check = '--check' in sys.argv
    files, problems = build()
    changed = []
    for rel, text in files.items():
        p = os.path.join(REPO, rel)
        old = open(p, encoding='utf-8').read() if os.path.exists(p) else None
        if old != text:
            changed.append(rel)
            if not check:
                open(p, 'w', encoding='utf-8').write(text)
    for pr in problems:
        print('문제', pr)
    if check:
        print('최신 아님: ' + ', '.join(changed) if changed else 'robots.txt·llms.txt·_headers 모두 최신')
        sys.exit(1 if changed or problems else 0)
    print(f'바뀐 파일 {len(changed)}개: ' + ', '.join(changed))
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
