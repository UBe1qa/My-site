import subprocess,time,sys
from playwright.sync_api import sync_playwright
mode=sys.argv[1] if len(sys.argv)>1 else 'desktop'
dark='--dark' in sys.argv
srv=subprocess.Popen(['python3','-m','http.server','8765'],cwd='..',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(.6)
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    vp={'width':1440,'height':900} if mode=='desktop' else {'width':390,'height':844}
    ctx=b.new_context(viewport=vp,device_scale_factor=1 if mode=='desktop' else 2,is_mobile=mode!='desktop',has_touch=mode!='desktop',color_scheme='dark' if dark else 'light')
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/'); pg.wait_for_timeout(1200)
    pg.locator('#quote').scroll_into_view_if_needed(); pg.wait_for_timeout(900)
    pg.locator('.spot[data-id="heel"]').click(); pg.wait_for_timeout(200)
    pg.locator('.spot[data-id="welt"]').click(); pg.wait_for_timeout(500)
    pg.locator('.quote__grid').screenshot(path=f'/tmp/claude-0/q-{mode}{"-dark" if dark else ""}.png')
    pg.locator('.chip[data-id="full"]').click(); pg.wait_for_timeout(600)
    print('toast:',pg.locator('#toast').inner_text(), '| total', pg.locator('#paper-total').inner_text(), pg.locator('#paper-days').inner_text())
    print('disabled chips:', pg.evaluate("[...document.querySelectorAll('.chip:disabled')].map(c=>c.dataset.id)"))
    pg.locator('.quote__grid').screenshot(path=f'/tmp/claude-0/q2-{mode}.png')
    pg.locator('#quote-clear').click(); pg.wait_for_timeout(200)
    print('after clear rows', pg.locator('.prow').count(), 'undo visible', pg.locator('#quote-undo').is_visible())
    pg.locator('#quote-undo-btn').click(); pg.wait_for_timeout(200)
    print('after undo rows', pg.locator('.prow').count())
    pg.locator('#compare').scroll_into_view_if_needed(); pg.wait_for_timeout(900)
    box=pg.locator('#ba').bounding_box()
    pg.mouse.click(box['x']+box['width']*0.72, box['y']+box['height']/2); pg.wait_for_timeout(300)
    pg.locator('.compare__grid').screenshot(path=f'/tmp/claude-0/c-{mode}.png')
    # dock submit
    if mode!='desktop':
        pg.locator('.dock__open').click(); pg.wait_for_timeout(400)
    pg.locator('.dock__go').click(); pg.wait_for_timeout(200)
    print('msg:', pg.locator('#dock-msg').inner_text())
    pg.locator('#dock-phone').fill('010-1234-5678'); pg.locator('.dock__go').click(); pg.wait_for_timeout(300)
    print('toast2:', pg.locator('#toast').inner_text())
    pg.screenshot(path=f'/tmp/claude-0/dock-{mode}.png')
    print('errors', errs)
    b.close()
finally: srv.terminate()
