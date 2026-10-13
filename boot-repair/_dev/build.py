# 모든 페이지의 같은 조각(머리 링크·머리줄·메뉴·꼬리말·신청 바)을 한곳에서 채운다.
# 페이지 HTML 안의 <!--@이름--> ... <!--/@이름--> 사이를 아래 조각으로 갈아 끼운다.
# 지금 페이지는 <body data-page="..."> 로 안다. 실행: cd _dev && python3 build.py
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ['index.html', 'check/index.html', 'repairs/index.html', 'cases/index.html',
         'care/index.html', 'maker/index.html', 'apply/index.html', '404.html']

NAV = [('check', '/check/', '맡길 수 있나요', '내 부츠도 고칠 수 있는지'),
       ('repairs', '/repairs/', '수선 종류', '닳은 곳마다 하는 일과 가격'),
       ('cases', '/cases/', '수선 사례', '비슷한 부츠는 이렇게 고쳤어요'),
       ('care', '/care/', '관리법', '맡기기 전에 집에서 하는 관리'),
       ('maker', '/maker/', '수선사', '누가, 어떻게 고치나요')]

HEAD = '''<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<script>
  /* 움직임은 '동작 줄이기'가 아니고 IntersectionObserver가 있을 때만 켠다.
     움직임 코드가 6초 안에 시작하지 않으면 끈다(내용은 늘 보이게). */
  (function () {
    var d = document.documentElement;
    d.classList.add('js');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && 'IntersectionObserver' in window) {
      d.classList.add('anim');
      window.__unanim = function () { d.classList.remove('anim'); window.__filmStill && window.__filmStill(); };
      setTimeout(function () { if (!window.__motionOn) window.__unanim(); }, 6000);
    }
  })();
</script>
<link rel="stylesheet" href="/style.css">'''

def top(page):
    links = '\n      '.join(
        f'<a href="{h}"{" aria-current=\"page\"" if k == page else ""}>{t}</a>' for k, h, t, _ in NAV)
    mlinks = '\n    '.join(
        f'<a class="menu__a" href="{h}"{" aria-current=\"page\"" if k == page else ""}><b>{t}</b><span>{d}</span></a>'
        for k, h, t, d in NAV)
    cta_cur = ' aria-current="page"' if page == 'apply' else ''
    return f'''<header class="top" id="top">
  <div class="wrap top__in">
    <a class="logo" href="/" aria-label="가죽결 수선소 처음으로">
      <span class="logo__word">가죽결</span><span class="logo__sub">부츠 수선소</span>
    </a>
    <nav class="nav" aria-label="주요 메뉴">
      {links}
    </nav>
    <a class="btn btn--accent btn--sm top__cta" href="/apply/"{cta_cur}>수선 맡기기 <span class="go" aria-hidden="true"></span></a>
    <button class="top__menu" type="button" aria-expanded="false" aria-controls="menu"><span class="sr">메뉴 열기</span><i aria-hidden="true"></i></button>
  </div>
</header>
<div class="menu" id="menu" hidden>
  <nav class="wrap menu__in" aria-label="전체 메뉴">
    <a class="menu__a menu__a--home" href="/"{" aria-current=\"page\"" if page == "home" else ""}><b>처음으로</b><span>버리지 말고, 밑창만 갈아요</span></a>
    {mlinks}
    <a class="btn btn--accent btn--lg menu__cta" href="/apply/">수선 맡기기</a>
  </nav>
</div>'''

def foot(page):
    links = ''.join(f'<a href="{h}">{t}</a>' for k, h, t, _ in NAV)
    return f'''<footer class="foot">
  <div class="wrap foot__in">
    <div class="foot__col foot__col--brand">
      <p class="foot__brand">가죽결 <span>부츠 수선소</span></p>
      <p class="foot__desc">닳은 건 밑창이에요. 부츠·워커 굽 교체와 통창갈이를 사진으로 먼저 봐 드려요.</p>
    </div>
    <nav class="foot__col" aria-label="꼬리말 메뉴">
      <p class="foot__h">메뉴</p>
      <a href="/">처음으로</a>{links}<a href="/apply/">수선 맡기기</a>
    </nav>
    <div class="foot__col">
      <p class="foot__h">수선소</p>
      <p>받는 방법 · 택배 (왕복 택배비 포함)</p>
      <p>답장 · 평일 10시~18시</p>
      <p>작업 기간 · 보통 4~10일</p>
      <p>전화·주소 · 가상 공방이라 없어요</p>
    </div>
  </div>
  <div class="wrap foot__bottom">
    <p>이 사이트는 웹 연출을 연습하려고 만든 <b>가상의 수선소</b>예요. 가격·기간·사례·수선사 소개는 예시이고, 신청해도 실제로 접수되지 않아요. 그림은 모두 코드(SVG)로 그렸어요.</p>
  </div>
</footer>'''

# 입력 칸에 name을 두지 않는다: 스크립트가 꺼진 채 보내져도 번호가 주소창에 실리지 않게
DOCK = '''<div class="dock" id="dock">
  <form class="dock__form" id="dock-form" novalidate>
    <div class="dock__who">
      <p><b>사진으로 먼저 견적 받기</b><span>답장은 문자로 와요</span></p>
    </div>
    <div class="dock__fields">
      <label class="sr" for="dock-kind">부츠 종류</label>
      <div class="select">
        <select id="dock-kind">
          <option value="">부츠 종류</option>
          <option>워커 (끈 부츠)</option>
          <option>첼시 부츠</option>
          <option>엔지니어 부츠</option>
          <option>잘 모르겠어요</option>
        </select>
      </div>
      <label class="sr" for="dock-phone">휴대폰 번호</label>
      <input id="dock-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="휴대폰 번호" aria-describedby="dock-msg">
    </div>
    <button class="btn btn--accent dock__go" type="submit">견적 받기</button>
    <button class="btn btn--accent dock__open" type="button" data-open-apply>견적 받기</button>
    <p class="dock__msg" id="dock-msg" role="status" aria-live="polite"></p>
  </form>
</div>

<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>'''

TOAST = '<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>'

def fill(html, name, body):
    pat = re.compile(r'(<!--@' + name + r'-->)(.*?)(<!--/@' + name + r'-->)', re.S)
    if not pat.search(html):
        return html
    return pat.sub(lambda m: m.group(1) + '\n' + body + '\n' + m.group(3), html)

for rel in PAGES:
    f = ROOT / rel
    if not f.exists():
        print('없음', rel); continue
    html = f.read_text(encoding='utf-8')
    m = re.search(r'<body[^>]*data-page="([a-z0-9-]+)"', html)
    page = m.group(1) if m else ''
    out = html
    out = fill(out, 'head', HEAD)
    out = fill(out, 'top', top(page))
    out = fill(out, 'foot', foot(page))
    out = fill(out, 'dock', DOCK)
    out = fill(out, 'toast', TOAST)
    if out != html:
        f.write_text(out, encoding='utf-8')
    print('채움' if out != html else '그대로', rel, page)
