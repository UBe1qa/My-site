// 화면 사진: node shots.mjs <결과 폴더> [base]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, BASE = 'http://localhost:8431', FX = ''] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => /^chromium-\d+$/.test(d)).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`)[0];
const b = await chromium.launch({ executablePath: exe });
async function shot(name, url, vp, opts = {}) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: opts.dpr || 1, colorScheme: opts.dark ? 'dark' : 'light', locale: opts.locale || 'en-US', reducedMotion: 'reduce', isMobile: vp.width < 600, hasTouch: vp.width < 600 });
  await ctx.route(/googlesyndication|doubleclick/, (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  if (opts.files) { await p.setInputFiles(opts.sel || '.tool input[type=file]', opts.files.map((f) => path.join(FX, f))); await p.waitForTimeout(opts.wait || 2500); }
  if (opts.click) { await p.click(opts.click); await p.waitForTimeout(1500); }
  if (opts.run) { await p.click('.actions .btn-go'); await p.waitForSelector('.result', { timeout: 60000 }); await p.waitForTimeout(800); }
  await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!opts.full });
  const sx = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (sx > 0 || errs.length) console.log(name, 'hscroll', sx, errs.join(' | '));
  await ctx.close();
}
const D = { width: 1366, height: 860 }, M = { width: 390, height: 844 }, S = { width: 375, height: 667 };
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const jobs = [
  ['hub-desktop', '/', D, { full: true }],
  ['hub-mobile', '/', M, { full: false }],
  ['hub-ko-mobile', '/ko/', S, {}],
  ['tool-desktop', '/video-to-mp3/', D, { full: true }],
  ['tool-mobile', '/ko/video-to-mp3/', S, {}],
  ['tool-loaded-desktop', '/video-to-mp3/', D, { files: ['clip.webm'] }],
  ['tool-loaded-mobile', '/ko/video-to-mp3/', M, { files: ['clip.webm'], full: true }],
  ['tool-result-desktop', '/video-to-mp3/', D, { files: ['clip.webm'], run: true, full: true }],
  ['img-result-mobile', '/ko/image-converter/', M, { files: ['photo.png', 'alpha.png'], run: true, full: true }],
  ['hub-pick-desktop', '/', D, { files: ['photo.jpg'], sel: '#hubf' }],
  ['tool-dark', '/cut-audio/', D, { files: ['tone.wav'], dark: true }],
  ['cimg-mobile', '/ko/compress-image/', M, { files: ['photo.jpg'], wait: 3000 }],
  ['article-ko-mobile', '/ko/guide/youtube-mp3-legal/', M, { full: true }],
  ['csv-mobile', '/ko/csv-json/', M, { files: ['people.csv'], full: true }],
];
for (const [n, u, vp, o] of jobs) if (!only || only.includes(n)) await shot(n, u, vp, o);
await b.close();
