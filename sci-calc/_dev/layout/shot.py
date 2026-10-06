import sys
from playwright.sync_api import sync_playwright
D='/home/user/my-site/sci-calc/_dev/layout/'; out=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch()
    for cand in ['now','A','B']:
        for scheme in ['light','dark']:
            for w,h,tag in [(1366,768,'d'),(390,844,'m')]:
                if scheme=='dark' and tag=='m': continue
                ctx=b.new_context(viewport={'width':w,'height':h}, color_scheme=scheme, is_mobile=(tag=='m'), has_touch=(tag=='m'))
                ctx.add_init_script("try{localStorage.setItem('sc.langbar','x')}catch(e){}")
                pg=ctx.new_page(); pg.goto('http://localhost:8765/'); pg.wait_for_function('window.__calcReady')
                pg.evaluate("document.querySelector('.langbar')&&document.querySelector('.langbar').remove()")
                if cand!='now':
                    pg.add_script_tag(path=D+'common.js'); pg.add_script_tag(path=D+cand+'.js')
                    pg.add_style_tag(path=D+'side.css'); pg.add_style_tag(path=D+cand+'.css'); pg.add_style_tag(path=D+'mobile.css')
                else:
                    for k in ['sin','3','0','rp','eq']: pg.click(f'[data-k="{k}"]')
                pg.wait_for_timeout(300); pg.evaluate("document.activeElement.blur(); scrollTo(0,0)")
                pg.screenshot(path=f'{out}/{cand}-{scheme}-{tag}.png')
                if tag=='m': pg.screenshot(path=f'{out}/{cand}-{scheme}-{tag}-full.png', full_page=True)
                eq=pg.evaluate("document.querySelector('.k.eq').getBoundingClientRect().bottom")
                print(cand,scheme,tag,'= key bottom',round(eq),'viewport',h, 'overflow', pg.evaluate('document.documentElement.scrollWidth>innerWidth'))
                ctx.close()
    b.close()
