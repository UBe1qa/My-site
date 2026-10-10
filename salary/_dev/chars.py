"""화면에 나올 수 있는 글자 모으기. 글꼴 조각 만들기(font.py)와 정적 검사(check.py)가 같이 쓴다(표준 라이브러리만)."""
import html
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://salary.lumenlab.page'
ALWAYS = ''.join(chr(c) for c in range(0x20, 0x7f))   # 아스키 전부(칸에 넣는 숫자·영문)
ALWAYS_KO = '연도월일오전오후'                          # 날짜 칸이 보여 주는 글자
ALWAYS_EN = '한국어로 보기'                              # 다른 언어 안내 띠(app.js 가 넣는다)
HANGUL = re.compile(r'[ᄀ-ᇿ㄰-㆏가-힣]')


def walk(v):
    if isinstance(v, str):
        return v
    if isinstance(v, dict):
        return ' '.join(walk(x) for x in v.values())
    if isinstance(v, list):
        return ' '.join(walk(x) for x in v)
    return ''


def page_text(raw):
    """페이지 하나에서 화면에 나올 수 있는 글자: 본문, 속성 글자(자리 글자·이름표 …), JSON 설정(스크립트가 화면에 넣는 글자와 미리 그려 둔 결과)."""
    body = raw[raw.index('<body'):]
    text = ''
    for m in re.finditer(r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', body, flags=re.S):
        text += ' ' + walk(json.loads(m.group(1)))
    body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', body, flags=re.S)
    text += ' ' + ' '.join(re.findall(r'(?:data-[a-z-]+|value|aria-label|placeholder|title|alt)="([^"]*)"', body))
    text += ' ' + body
    return html.unescape(re.sub(r'<[^>]+>', ' ', html.unescape(text)))


def pages():
    """(주소, 언어, 파일) 목록. 없는 주소 쪽(404.html)은 한 장이 두 언어를 다 보여 주고 한국어판 조각을 쓴다."""
    paths = [u.text[len(SITE):] for u in ET.parse(ROOT / 'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    return [(p, 'en' if p.startswith('/en/') else 'ko', ROOT / p.lstrip('/') / 'index.html') for p in paths] + [('/404.html', 'ko', ROOT / '404.html')]


def code_chars():
    """화면 코드가 넣는 글자(아스키 밖): 한국어판은 전부, 영어판은 한글이 아닌 기호만(영어판의 한국어 이름은 첫 HTML에 이미 있다)."""
    js = ''.join((ROOT / 'assets' / f).read_text(encoding='utf-8') for f in ('pay-view.js', 'app.js', 'pay-core.js'))
    marks = {c for c in js if ord(c) > 0x7f}
    return {'ko': marks, 'en': {c for c in marks if not HANGUL.match(c)}}


def screen_chars():
    """언어판마다 화면에 나올 수 있는 글자 모음. {'ko': '…', 'en': '…'}"""
    code = code_chars()
    out = {'ko': set(ALWAYS + ALWAYS_KO) | code['ko'], 'en': set(ALWAYS + ALWAYS_EN) | code['en']}
    for _, lang, f in pages():
        out[lang] |= set(page_text(f.read_text(encoding='utf-8')))
    return {k: ''.join(sorted(c for c in v if c >= ' ' and c != '\x7f')) for k, v in out.items()}
