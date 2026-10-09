#!/usr/bin/env python3
"""더한방 '오늘의 식단' 자동 업데이트.

네이버 블로그(thehanbang0157)의 "O월 O일 어르신들의 하루를 소개해 드립니다" 글에서
점심·간식·저녁 사진과 메뉴를 찾아 thehanbang/meals.js 와 img/meals/ 를 갱신한다.
GitHub Actions(.github/workflows/thehanbang-meals.yml)가 하루 몇 번 돌리고,
바뀐 게 있으면 커밋·푸시 → Cloudflare가 자동 배포한다.

글에서 찾는 방법 (블로그 글 모양이 바뀌면 여기를 고친다)
- 글 문단에 '점심'이 있으면 점심, '저녁'+'식사'가 있으면 저녁, '간식'이 있으면 간식
- 메뉴: 그 문단의 다음 줄 (쉼표로 나뉜 음식 이름). 간식은 괄호 안 글자
- 사진: 그 문단 바로 다음에 오는 사진 묶음의 첫 장 (사진이 1~2장일 때만 — 활동 사진 묶음을 식판으로 잘못 잡지 않게)

필요한 것: Python 3.9+, Pillow
"""
import datetime
import email.utils
import html
import io
import json
import os
import re
import sys
import urllib.request

from PIL import Image, ImageOps

BLOG = 'thehanbang0157'
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # thehanbang/
DATA = os.path.join(SITE, 'meals.js')
IMG_DIR = os.path.join(SITE, 'img', 'meals')
KEEP_DAYS = 40      # 사이트에 남겨 둘 최근 기록 수 (오래된 건 사진째 뺀다. 원본은 블로그에 있음)
RECHECK = 3         # 가장 최근 글 몇 개는 매번 다시 읽는다 (글을 올린 뒤 고친 경우)
SINCE = '2026-08-26'  # 이날부터 '하루 소개' 글 모양이 같다. 그 전 글은 식판 사진을 잘못 잡아서 안 쓴다
WIDTH = 760         # 저장할 사진 가로 크기
UA = ('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
      '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
WEEKDAY = '월화수목금토일'
HEADER = ('// 자동으로 만들어지는 파일이에요 — tools/update_meals.py가 네이버 블로그에서 가져와 씁니다.\n'
          '// 손으로 고쳐도 되지만, 최근 3일치는 다음 갱신 때 블로그 내용으로 다시 덮어써져요.\n')


def get(url, referer=None):
    headers = {'User-Agent': UA}
    if referer:
        headers['Referer'] = referer
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
        return r.read()


# ---------- 기존 데이터 ----------
def load():
    if not os.path.exists(DATA):
        return []
    s = open(DATA, encoding='utf-8').read()
    return json.loads(s[s.index('['):s.rindex(']') + 1])


def save(meals):
    body = json.dumps(meals, ensure_ascii=False, separators=(',', ':'))
    body = body.replace('},{"d"', '},\n{"d"')
    new = HEADER + 'window.MEALS = ' + body + ';\n'
    old = open(DATA, encoding='utf-8').read() if os.path.exists(DATA) else ''
    if new != old:
        open(DATA, 'w', encoding='utf-8').write(new)
        return True
    return False


# ---------- 블로그 ----------
def rss_posts():
    """[(logNo, date)] — 제목에 'O월 O일'이 있는 글만, 최신순"""
    s = get(f'https://rss.blog.naver.com/{BLOG}.xml').decode('utf-8', 'replace')
    out = []
    for item in re.findall(r'<item>(.*?)</item>', s, re.S):
        title = html.unescape(re.sub(r'<!\[CDATA\[|\]\]>', '', re.search(r'<title>(.*?)</title>', item, re.S).group(1)))
        link = re.search(r'<link>(.*?)</link>', item, re.S).group(1)
        pub = re.search(r'<pubDate>(.*?)</pubDate>', item, re.S).group(1)
        m = re.search(r'(\d{1,2})월\s*(\d{1,2})일', title)
        log = re.search(r'/(\d{9,})', link)
        if not (m and log):
            continue
        year = email.utils.parsedate_to_datetime(pub.strip()).year
        try:
            day = datetime.date(year, int(m.group(1)), int(m.group(2)))
        except ValueError:
            continue
        out.append((log.group(1), day))
    return out


def clean(s):
    s = re.sub(r'<script.*?</script>', '', s, flags=re.S)
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'</p>', '\n', s)
    s = html.unescape(re.sub(r'<[^>]+>', '', s)).replace('​', '')
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r' *\n *', '\n', s)
    return re.sub(r'\n+', '\n', s).strip()


def components(page):
    """글 본문을 [{'t':'text','v':글} | {'t':'img','v':[주소...]}] 순서대로"""
    if 'se-main-container' not in page:
        return []
    body = page.split('se-main-container', 1)[1]
    for end in ['<div class="post_footer_contents', '<div class="post_tag', 'id="post_footer', '<div class="wrap_postcomment']:
        body = body.split(end, 1)[0]
    out = []
    for part in re.split(r'<div class="se-component ', body)[1:]:
        kind = part.split('"', 1)[0].split()[0]
        inner = part.split('>', 1)[1] if '>' in part else part
        if kind in ('se-text', 'se-quotation', 'se-sectionTitle'):
            t = clean(inner)
            if t:
                out.append({'t': 'text', 'v': t})
        elif kind.startswith('se-image'):
            srcs = re.findall(r'"src"\s*:\s*"([^"]+)"', inner) or re.findall(r'data-lazy-src="([^"]+)"', inner)
            srcs = list(dict.fromkeys(x.split('?')[0] for x in srcs))
            if srcs:
                out.append({'t': 'img', 'v': srcs})
    return out


def menu_list(line):
    items = [x.strip(' .·') for x in re.split(r'[,，、]', line)]
    return [x for x in items if x and len(x) <= 20]


def find_menu(lines):
    """쉼표가 2개 이상인 첫 줄 = 메뉴 ("제육볶음, 멸치볶음, 배추김치, ...")"""
    for line in lines:
        if len(re.findall(r'[,，、]', line)) >= 2:
            return menu_list(line)
    return []


SERVE = r'(?:준비|제공|대접|마련|드)'  # '준비해 드렸어요', '제공해 드렸습니다', '드셨어요' …
ITEMS = r'[^\s,]+(?:(?:\s*,\s*|(?<=[와과])\s+)[^\s,]+)*'  # '팥죽', '대추차, 빵', '찐계란과 대추차'


def find_snack(lines):
    """간식 이름만 뽑는다 (문장 끝 '준비해 드렸어요' 같은 말은 뺀다).

    '간식(샤인머스캣, 보리과자)' / '간식은? 찐빵을 준비해드렸어요' / '간식으로 과일 도시락을 준비해 드렸어요'
    '팥죽을 오전 간식으로 준비해 드렸어요' / '오후 간식으로 대추차, 빵 제공해 드렸습니다'
    """
    text = ''
    for k, line in enumerate(lines):
        par = re.search(r'간식\s*\(([^)]+)\)', line)
        q = re.search(r'간식\s*(?:은|는)\s*\?\s*(.*)', line)
        before = re.search(r'(' + ITEMS + r')(?:을|를)\s*(?:오전|오후)?\s*간식으로\s*' + SERVE, line)
        by = re.search(r'간식으로\s*(.+?)(?:을|를)?\s*' + SERVE, line)
        if par:
            text = par.group(1)
        elif q:
            text = q.group(1) or (lines[k + 1] if k + 1 < len(lines) else '')
        elif before:
            text = before.group(1)
        elif by:
            text = by.group(1)
        text = tidy_snack(text)
        if text:
            break
    return text[:40]


def tidy_snack(text):
    """이름 뒤에 붙은 말투를 뗀다: '대추차, 빵 제공해' → '대추차, 빵', '수프와 호박죽이에요' → '수프와 호박죽'"""
    text = re.sub(r'\s*(?:을|를)?\s*' + SERVE + r'(?:해|하)?\s*(?:드|주).*$', '', text)
    text = re.sub(r'\s*(?:을|를)?\s*(?:준비|제공|대접|마련)(?:해|했|하|한).*$', '', text)
    text = re.sub(r'\s*(?:을|를)?\s*드(?:셨|렸|시|려|립).*$', '', text)
    text = re.sub(r'(?:이에요|예요|입니다|이랍니다|랍니다)$', '', text.strip(' .~!'))
    return text.strip(' .~!')


def extract(comps):
    """{'L': {'m': [...], 'src': url}, 'D': ..., 'S': {'t': '...', 'src': url}}"""
    found = {}
    for i, c in enumerate(comps):
        if c['t'] != 'text':
            continue
        nxt = comps[i + 1] if i + 1 < len(comps) else None
        if not (nxt and nxt['t'] == 'img' and 1 <= len(nxt['v']) <= 2):
            continue
        lines = c['v'].split('\n')
        for j, line in enumerate(lines):
            meal_word = re.search(r'식사|시간|식단|메뉴', line)
            if '점심' in line:
                kind = 'L'
            elif '저녁' in line:
                kind = 'D'
            elif '간식' in line:
                kind = 'S'
            else:
                continue
            if kind in found:
                break
            if kind == 'S':
                text = find_snack(lines[j:])
                if text and len(nxt['v']) == 1:
                    found['S'] = {'t': text, 'src': nxt['v'][0]}
            else:
                menu = find_menu(lines[j:])
                if menu or meal_word:  # "점심 식 후 오후 프로그램…" 같은 문장은 건너뜀
                    found[kind] = {'m': menu, 'src': nxt['v'][0]}
            break
    return found


def save_photo(src, name):
    raw = get(src + '?type=w966', referer='https://blog.naver.com/')
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    os.makedirs(IMG_DIR, exist_ok=True)
    path = os.path.join(IMG_DIR, name)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=82, optimize=True, progressive=True)  # 사진 정보(EXIF·위치) 없이 저장
    data = buf.getvalue()
    if not (os.path.exists(path) and open(path, 'rb').read() == data):
        open(path, 'wb').write(data)
    return [im.width, im.height]


def build_entry(log, day):
    page = get(f'https://m.blog.naver.com/PostView.naver?blogId={BLOG}&logNo={log}').decode('utf-8', 'replace')
    found = extract(components(page))
    if 'L' not in found and 'D' not in found:
        return None
    entry = {'d': f'{day.month}.{day.day:02d}', 'w': WEEKDAY[day.weekday()], 'ymd': day.isoformat(), 'log': log}
    stem = f'{day.month:02d}{day.day:02d}'
    for kind, word in (('L', 'lunch'), ('D', 'dinner'), ('S', 'snack')):
        if kind not in found:
            continue
        f = found[kind]
        rel = f'img/meals/{stem}-{word}.jpg'
        wh = save_photo(f['src'], f'{stem}-{word}.jpg')
        entry[kind] = ({'t': f['t']} if kind == 'S' else {'m': f['m']}) | {'img': rel, 'wh': wh}
    return entry


def main():
    meals = load()
    by_log = {m['log']: m for m in meals}
    posts = rss_posts()
    posts = [(log, day) for log, day in posts if day.isoformat() >= SINCE]
    todo = [(log, day) for k, (log, day) in enumerate(posts) if k < RECHECK or log not in by_log]
    for log, day in todo:
        try:
            entry = build_entry(log, day)
        except Exception as e:  # 한 글이 실패해도 나머지는 계속
            print(f'건너뜀 {log} ({day}): {e}', file=sys.stderr)
            continue
        if entry:
            old = by_log.get(log)
            by_log[log] = entry
            print(('다시 확인' if old else '새로 추가'), entry['ymd'], ', '.join(k for k in 'LSD' if k in entry))
    meals = [m for m in by_log.values() if m.get('ymd', '') >= SINCE]
    meals = sorted(meals, key=lambda m: m['ymd'], reverse=True)[:KEEP_DAYS]

    # 사이트에서 빠진 날의 사진은 폴더에서도 뺀다
    used = {m[k]['img'].split('/')[-1] for m in meals for k in 'LDS' if k in m}
    if os.path.isdir(IMG_DIR):
        for f in os.listdir(IMG_DIR):
            if f.endswith('.jpg') and f not in used:
                os.remove(os.path.join(IMG_DIR, f))
                print('뺀 사진', f)
    print('meals.js', '바뀜' if save(meals) else '그대로', f'({len(meals)}일)')


if __name__ == '__main__':
    main()
