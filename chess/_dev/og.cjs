// 공유 그림 og.png(영어)·og-ko.png(한국어) 1200×630, 아이콘 apple-touch-icon.png(180)·favicon.ico(32):
// node chess/_dev/serve.mjs 8472 을 띄운 뒤 node chess/_dev/og.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const B = 'http://localhost:8472';
const TXT = {
  en: ['Opening Trail', 'Chess openings, one move at a time, with the reason for each', 'What players at your rating really play, from 175 million Lichess games.<br>Engine checks · 81 guides · 2-minute test'],
  ko: ['오프닝 트레일', '체스 오프닝, 1수부터 수마다 이유와 함께', '리체스 1억 7,493만 판에서 내 레이팅대가 실제로 두는 수<br>엔진 평가 · 해설 81개 · 2분 테스트'],
};
(async () => {
  const b = await chromium.launch();
  for (const lang of ['en', 'ko']) {
    const pg = await b.newPage({ viewport: { width: 1200, height: 630 } });
    await pg.goto(B + (lang === 'ko' ? '/ko/map/' : '/map/'), { waitUntil: 'networkidle' });
    // 처음 국면: 1.e4 60%·1.d4 27% 화살표가 굵기대로
    await pg.waitForTimeout(700);
    const t = TXT[lang];
    await pg.evaluate((t) => {
      const bd = document.querySelector('[data-explorer] [data-board]');
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed;inset:0;z-index:99;background:var(--bg);display:flex;align-items:center;gap:56px;padding:0 64px;box-sizing:border-box';
      const holder = document.createElement('div');
      holder.style.cssText = 'width:500px;height:500px;flex:none;border-radius:8px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.18)';
      bd.style.width = '500px';
      holder.appendChild(bd);
      const txt = document.createElement('div');
      txt.innerHTML = '<p style="font-size:30px;font-weight:800;color:var(--acc);margin:0 0 14px">' + t[0] + '</p>' +
        '<p style="font-size:50px;line-height:1.18;font-weight:800;margin:0 0 22px;letter-spacing:-.025em;word-break:keep-all">' + t[1] + '</p>' +
        '<p style="font-size:24px;line-height:1.45;color:var(--mute);margin:0;word-break:keep-all">' + t[2] + '</p>';
      wrap.appendChild(holder); wrap.appendChild(txt);
      document.body.appendChild(wrap);
    }, t);
    await pg.waitForTimeout(500);
    await pg.screenshot({ path: path.join(ROOT, lang === 'ko' ? 'og-ko.png' : 'og.png') });
    await pg.close();
  }
  // 아이콘: favicon.svg 를 그대로 그린다
  const svg = fs.readFileSync(path.join(ROOT, 'favicon.svg'), 'utf8');
  for (const [size, file] of [[180, 'apple-touch-icon.png'], [32, '_ico.png']]) {
    const pg = await b.newPage({ viewport: { width: size, height: size } });
    const pad = size === 180 ? 0 : 0;
    await pg.setContent(`<html><body style="margin:0;background:${size === 180 ? '#b78a62' : 'transparent'}">${svg.replace('width="64" height="64"', `width="${size}" height="${size}"`)}</body></html>`);
    await pg.screenshot({ path: path.join(ROOT, file), omitBackground: size !== 180 });
    await pg.close();
  }
  // favicon.ico = PNG 하나를 담은 ICO
  const png = fs.readFileSync(path.join(ROOT, '_ico.png'));
  const h = Buffer.alloc(22);
  h.writeUInt16LE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4);
  h.writeUInt8(32, 6); h.writeUInt8(32, 7); h.writeUInt8(0, 8); h.writeUInt8(0, 9);
  h.writeUInt16LE(1, 10); h.writeUInt16LE(32, 12); h.writeUInt32LE(png.length, 14); h.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), Buffer.concat([h, png]));
  fs.unlinkSync(path.join(ROOT, '_ico.png'));
  await b.close();
  console.log('og.png og-ko.png apple-touch-icon.png favicon.ico');
})();
