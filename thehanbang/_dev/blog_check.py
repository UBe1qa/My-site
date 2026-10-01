#!/usr/bin/env python3
"""더한방 블로그에서 사이트에 반영할 새 글을 찾아 보여 준다 (둘러보기 '블로그에 남긴 활동 기록'·건강 칼럼용).

식단은 GitHub Actions(tools/update_meals.py)가 혼자 넣지만, 활동 카드와 칼럼은
얼굴이 없는 사진 고르기·문구 다듬기·효능 표현 거르기처럼 눈으로 판단할 게 많아서
Claude 정기 작업이 이 결과를 보고 고친다.

  python3 thehanbang/_dev/blog_check.py            # 사이트 활동 카드 중 가장 최근 날짜 이후 글
  python3 thehanbang/_dev/blog_check.py 2026-09-25 # 이 날짜 이후 글

글마다 글 문단과 사진 묶음을 순서대로 적고, 사진은 /tmp/hb-blog/<logNo>/ 에 받아 둔다
(번호 순서 = 글 안 순서). '하루 소개'가 아닌 글은 [칼럼 후보]로 표시한다.
"""
import datetime
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tools'))
import update_meals as um  # noqa: E402  (블로그 읽는 방법을 식단 자동 반영과 같게)

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = '/tmp/hb-blog'


def latest_card_date():
    s = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
    dates = re.findall(r'class="act raised".*?<time datetime="(\d{4}-\d{2}-\d{2})"', s)
    return max(dates) if dates else '2026-08-26'


def all_posts():
    """[(logNo, 날짜, 제목)] — RSS의 모든 글 (제목에 날짜가 없으면 올린 날)"""
    import email.utils
    import html
    s = um.get(f'https://rss.blog.naver.com/{um.BLOG}.xml').decode('utf-8', 'replace')
    out = []
    for item in re.findall(r'<item>(.*?)</item>', s, re.S):
        title = html.unescape(re.sub(r'<!\[CDATA\[|\]\]>', '', re.search(r'<title>(.*?)</title>', item, re.S).group(1))).strip()
        log = re.search(r'/(\d{9,})', re.search(r'<link>(.*?)</link>', item, re.S).group(1))
        pub = email.utils.parsedate_to_datetime(re.search(r'<pubDate>(.*?)</pubDate>', item, re.S).group(1).strip()).date()
        m = re.search(r'(\d{1,2})월\s*(\d{1,2})일', title)
        day = pub
        if m:
            try:
                day = datetime.date(pub.year, int(m.group(1)), int(m.group(2)))
            except ValueError:
                pass
        if log:
            out.append((log.group(1), day, title))
    return out


def main():
    since = sys.argv[1] if len(sys.argv) > 1 else latest_card_date()
    posts = [p for p in all_posts() if p[1].isoformat() > since]
    print(f'{since} 이후 글 {len(posts)}개\n')
    for log, day, title in sorted(posts, key=lambda p: p[1]):
        kind = '하루 소개' if '하루' in title and '소개' in title else '칼럼 후보'
        print(f'=== [{kind}] {day} {title}\n    https://blog.naver.com/{um.BLOG}/{log}')
        page = um.get(f'https://m.blog.naver.com/PostView.naver?blogId={um.BLOG}&logNo={log}').decode('utf-8', 'replace')
        d = os.path.join(OUT, log)
        os.makedirs(d, exist_ok=True)
        n = 0
        for c in um.components(page):
            if c['t'] == 'text':
                print('  글:', c['v'].replace('\n', ' / ')[:300])
            else:
                names = []
                for src in c['v']:
                    n += 1
                    name = f'{n:02d}.jpg'
                    path = os.path.join(d, name)
                    if not os.path.exists(path):
                        try:
                            open(path, 'wb').write(um.get(src + '?type=w966', referer='https://blog.naver.com/'))
                        except Exception as e:  # 사진 하나가 안 받아져도 계속
                            name += f'(실패 {e})'
                    names.append(name)
                print(f'  사진 {len(names)}장: {d}/ {", ".join(names)}')
        print()


if __name__ == '__main__':
    main()
