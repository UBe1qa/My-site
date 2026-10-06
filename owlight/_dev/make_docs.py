# 지원·개인정보 처리방침을 Owlight 주소(/support/, /privacy/)에 만든다: python3 owlight/_dev/make_docs.py
# 본문(<h1>부터 마지막 </section>까지)은 lumenlab.page/owlight/… 파일에서 글자 그대로 복사하고, 틀(머리말·꼬리말)만 Owlight 것.
# lumenlab.page/owlight/support/·privacy/ 는 앱과 App Store Connect에 등록된 주소라 그대로 둔다(지우거나 넘기지 않음).
# 방침·지원 글을 고칠 땐 lumenlab 쪽을 고치고 이 스크립트를 다시 돌린다. check.py 가 두 본문이 같은지 대조한다.
import os
here = os.path.dirname(os.path.abspath(__file__))
site = os.path.dirname(here)
src_dir = os.path.join(os.path.dirname(site), 'lumenlab', 'owlight')

PAGES = {
    'support': ('crumbSupport', '지원', 'Owlight 지원 · Support'),
    'privacy': ('crumbPrivacy', '개인정보 처리방침', 'Owlight 개인정보 처리방침 · Privacy Policy'),
}

def body(name):
    t = open(os.path.join(src_dir, name, 'index.html'), encoding='utf-8').read()
    return t[t.index('<h1>'):t.rindex('</section>') + len('</section>')]

def meta_desc(name):
    t = open(os.path.join(src_dir, name, 'index.html'), encoding='utf-8').read()
    i = t.index('<meta name="description" content="') + len('<meta name="description" content="')
    return t[i:t.index('"', i)]

for name, (key, crumb, title) in PAGES.items():
    url = f'https://owlight.lumenlab.page/{name}/'
    desc = meta_desc(name)
    page = f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Owlight">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://owlight.lumenlab.page/og.png">
<meta name="theme-color" content="#14132A">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/site.css">
<script>
/* 언어: 주소 끝 #ko·#en > 저장한 선택 > 브라우저 언어. 한 페이지에 두 언어가 있고 고른 쪽 칸만 보인다 */
(function(d){{var l=location.hash.slice(1);if(l!=='ko'&&l!=='en'){{try{{l=localStorage.getItem('owlight:lang')}}catch(e){{}}}}if(l!=='ko'&&l!=='en')l=/^ko/i.test(navigator.language||'')?'ko':'en';d.setAttribute('data-lang',l);d.lang=l}})(document.documentElement);
</script>
</head>
<body>
<!-- 만든 파일: 고치려면 _dev/make_docs.py 와 lumenlab/owlight/{name}/index.html -->
<a class="skip" href="#main" data-i18n="skip">본문으로 건너뛰기</a>
<header class="top">
  <div class="wrap top__in">
    <a class="brand" href="/" aria-label="Owlight 처음으로" data-i18n-aria="brandLabel">
      <img src="/favicon.svg" width="30" height="30" alt="">
      <span translate="no">Owlight</span>
    </a>
    <nav class="nav" aria-label="이 사이트" data-i18n-aria="navLabel">
      <a href="/#features" data-i18n="navFeatures">기능</a>
      <a href="/#scenes" data-i18n="navScenes">장면</a>
      <a href="/#faq" data-i18n="navFaq">자주 묻는 질문</a>
      <a href="/support/" data-i18n="navSupport">지원</a>
    </nav>
    <button class="lang" type="button" hidden data-lang-btn>English</button>
  </div>
</header>

<main id="main">
<div class="doc-head">
<div class="wrap doc-head__in">
<p class="crumb"><img class="icon" src="/favicon.svg" width="28" height="28" alt=""><a href="/">Owlight</a><span aria-hidden="true">›</span><span data-i18n="{key}">{crumb}</span></p>
<!-- 아래 제목·이동 줄과 본문은 lumenlab.page/owlight/{name}/ 와 글자 하나 다르지 않음 -->
{body(name)}
</div>
</main>

<footer class="foot">
  <div class="wrap foot__in">
    <p data-i18n="footMaker">Owlight는 <a href="https://lumenlab.page/" class="nw">Lumen Lab(루멘랩)</a>이 만들어요. <span class="nw">Lumen Lab</span>은 개인사업자예요.</p>
    <p class="nw">© 2026 Lumen Lab</p>
  </div>
</footer>

<script src="/assets/i18n.js"></script>
</body>
</html>
'''
    os.makedirs(os.path.join(site, name), exist_ok=True)
    open(os.path.join(site, name, 'index.html'), 'w', encoding='utf-8').write(page)
    print(f'{name}/index.html 만듦')
