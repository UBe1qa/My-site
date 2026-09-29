"""카톡·검색 공유 미리보기 사진(og.png, 1200x630) — 4차 색 (솔잎 초록·원목)
사이트의 style.css·로고·도면을 그대로 가져와서 찍는다 (사이트와 똑같이 보이게)."""
import asyncio, os, re, pathlib
from playwright.async_api import async_playwright

import tempfile
SCR = pathlib.Path(tempfile.mkdtemp(prefix='theopen-og-'))
SITE = pathlib.Path(__file__).resolve().parent.parent
src = (SITE / 'index.html').read_text()

defs = re.search(r'<svg width="0" height="0".*?</svg>', src, re.S).group(0)
sheet = re.search(r'<figure class="sheet" data-sheet>.*?</figure>', src, re.S).group(0)
sheet = sheet.replace(' data-sheet', '')

html = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="file://{SITE}/style.css">
<style>
html, body {{ margin: 0; background: #fff; }}
.og {{ width: 1200px; height: 630px; box-sizing: border-box; padding: 60px 72px 58px; display: grid;
  grid-template-columns: minmax(0, 1fr) 468px; gap: 52px; align-items: center; background: var(--bg); color: var(--ink);
  font-family: var(--sans); border-bottom: 10px solid var(--main); }}
.left {{ height: 100%; display: flex; flex-direction: column; justify-content: space-between; }}
.og .brand {{ gap: 16px; }}
.og .brand__mark {{ width: 50px; height: 52px; }}
.og .brand__text {{ gap: 8px; }}
.og .brand__word {{ width: 168px; height: 18px; }}
.og .brand__kor {{ font-size: 15px; }}
h1 {{ margin: 0; font-size: 62px; line-height: 1.24; font-weight: 700; letter-spacing: -.04em; }}
.og-sub {{ margin: 22px 0 0; font-size: 26px; line-height: 1.55; color: var(--ink-2); letter-spacing: -.01em; }}
.tel {{ display: inline-flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 700; letter-spacing: -.005em; }}
.tel small {{ font-size: 21px; font-weight: 600; color: var(--ink-3); }}
.tel svg {{ width: 26px; height: 26px; color: var(--main); }}
.og h1 .hl {{ color: var(--main-ink); }}
.og .sheet__draw {{ padding: 16px 14px 10px; }}
.og .sheet__meta {{ font-size: 14px; }}
</style></head><body>
{defs}
<div class="og">
  <div class="left">
    <span class="brand">
      <svg class="brand__mark"><use href="#logo-mark"/></svg>
      <span class="brand__text"><svg class="brand__word"><use href="#logo-word"/></svg><span class="brand__kor">더오픈</span></span>
    </span>
    <div>
      <h1>한의원 인테리어,<br><span class="hl">예산부터</span> 듣겠습니다</h1>
      <p class="og-sub">생각하신 금액 안에서<br>쓸 곳과 줄일 곳을 가려 드립니다.</p>
    </div>
    <p class="tel" style="margin:0"><svg><use href="#i-phone"/></svg><small>담당자 직통</small>010-2611-0157</p>
  </div>
  {sheet}
</div></body></html>"""
(SCR / 'og3.html').write_text(html)

async def main():
    proxy = os.environ.get('HTTPS_PROXY', '')
    async with async_playwright() as p:
        b = await p.chromium.launch(args=[f'--proxy-server=https={proxy.replace("http://", "")}', '--allow-file-access-from-files'] if proxy else ['--allow-file-access-from-files'])
        pg = await b.new_page(viewport={'width': 1200, 'height': 630})
        await pg.goto(f'file://{SCR}/og3.html', wait_until='networkidle')
        await pg.evaluate('document.fonts.ready')
        await pg.wait_for_timeout(700)
        fams = await pg.evaluate("[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family)")
        size = await pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.scrollHeight]")
        print('fonts', sorted(set(fams)), 'page', size)
        out = SITE / 'og.png'
        await pg.screenshot(path=str(out), clip={'x': 0, 'y': 0, 'width': 1200, 'height': 630})
        await b.close()
        print('saved', out, out.stat().st_size)

asyncio.run(main())
