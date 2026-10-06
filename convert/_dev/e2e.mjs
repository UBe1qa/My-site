// 실제 파일로 도구 17개를 눌러 보고 결과 파일을 검사한다.
// node convert/_dev/e2e.mjs <fixtures 폴더> <결과 폴더> [base=http://localhost:8431] [도구id…]
// playwright-core 필요(NODE_PATH로 지정). 광고 요청은 막는다.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const [FX, OUT, BASE = 'http://localhost:8431', ...ONLY] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => /^chromium-\d+$/.test(d)).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`)[0];
const browser = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] });
const probe = (f) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', f]).toString());
const fx = (n) => path.join(FX, n);
const results = [];
const { PDFDocument } = await import('pdf-lib');
const pdfPages = async (f) => (await PDFDocument.load(fs.readFileSync(f))).getPageCount();

async function run(c) {
  const ctx = await browser.newContext({ acceptDownloads: true, locale: c.locale || 'en-US', viewport: { width: 1200, height: 900 } });
  await ctx.route(/googlesyndication|doubleclick|adservice|googleads/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const t0 = Date.now();
  try {
    await page.goto(BASE + (c.lang === 'ko' ? '/ko/' : '/') + (c.hub ? '' : c.tool + '/'), { waitUntil: 'load' });
    if (c.hub) {
      await page.setInputFiles('#hubf', c.files.map(fx));
      await page.click(`.pick-card:has-text("${c.hubPick}")`);
    } else {
      await page.setInputFiles('.tool input[type=file]', c.files.map(fx));
    }
    await page.waitForSelector('.btn-go:not(.btn-pick), .err', { timeout: 30000 });
    if (await page.$('.err')) throw new Error('setup: ' + (await page.textContent('.err')));
    for (const a of c.actions || []) await a(page);
    await page.click('.actions .btn-go');
    await page.waitForSelector('.result, .out .err', { timeout: c.timeout || 120000 });
    if (await page.$('.out .err')) throw new Error('run: ' + (await page.textContent('.out .err')));
    const files = await page.evaluate(async () => {
      const as = [...document.querySelectorAll('.result a[download]')];
      const out = [];
      for (const a of as) {
        const b = await (await fetch(a.href)).blob();
        const buf = new Uint8Array(await b.arrayBuffer());
        let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        out.push({ name: a.getAttribute('download'), b64: btoa(s), type: b.type });
      }
      return out;
    });
    const saved = files.map((f) => { const p = path.join(OUT, c.name + '__' + f.name); fs.writeFileSync(p, Buffer.from(f.b64, 'base64')); return { ...f, path: p, b64: undefined }; });
    const note = await page.textContent('.result');
    if (c.shot) await page.screenshot({ path: path.join(OUT, c.name + '.png'), fullPage: false });
    const check = c.check ? await c.check(saved, note, page) : 'ok';
    results.push({ name: c.name, ok: true, ms: Date.now() - t0, check, errors: errors.filter((e) => !/favicon|og\.png|Failed to load resource.*(googlesyndication|ERR_FAILED)/.test(e)) });
  } catch (e) {
    if (c.shot !== false) await page.screenshot({ path: path.join(OUT, c.name + '-FAIL.png') }).catch(() => {});
    results.push({ name: c.name, ok: false, ms: Date.now() - t0, err: String(e.message || e).slice(0, 400), errors });
  }
  await ctx.close();
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const chip = (label) => async (p) => p.click(`.chips button:has-text("${label}")`);

const CASES = [
  { name: 'v2mp3-webm', tool: 'video-to-mp3', files: ['clip.webm'], check: async ([f]) => { const p = probe(f.path); assert(p.streams.length === 1 && p.streams[0].codec_name === 'mp3', 'not mp3'); assert(near(+p.format.duration, 6, 0.3), 'dur ' + p.format.duration); assert(near(+p.format.bit_rate / 1000, 192, 20), 'br ' + p.format.bit_rate); return `mp3 ${(+p.format.duration).toFixed(2)}s ${Math.round(p.format.bit_rate / 1000)}kbps`; } },
  { name: 'v2mp3-trim320', tool: 'video-to-mp3', files: ['clip.webm'], actions: [chip('320 kbps'), async (p) => { await p.fill('.tl-row input.time >> nth=0', '0:01.0'); await p.press('.tl-row input.time >> nth=0', 'Enter'); await p.fill('.tl-row input.time >> nth=1', '0:04.0'); await p.press('.tl-row input.time >> nth=1', 'Enter'); }],
    check: async ([f]) => { const p = probe(f.path); assert(near(+p.format.duration, 3, 0.15), 'dur ' + p.format.duration); assert(/cut\.mp3$/.test(f.name), 'name'); return `trim ${(+p.format.duration).toFixed(3)}s ${Math.round(p.format.bit_rate / 1000)}kbps`; } },
  { name: 'v2wav', tool: 'video-to-mp3', files: ['clip.webm'], actions: [chip('WAV')], check: async ([f]) => { const p = probe(f.path); assert(p.streams[0].codec_name.startsWith('pcm'), 'not pcm'); return p.streams[0].codec_name + ' ' + p.format.duration; } },
  { name: 'v2m4a', tool: 'video-to-mp3', files: ['clip.webm'], actions: [chip('M4A')], timeout: 180000, check: async ([f]) => { const p = probe(f.path); assert(p.streams[0].codec_name === 'aac', 'not aac'); return 'aac ' + (+p.format.duration).toFixed(2); } },
  { name: 'v2mp3-mp4', tool: 'video-to-mp3', files: ['clip.mp4'], check: async ([f]) => { const p = probe(f.path); return p.streams[0].codec_name + ' ' + p.format.duration; } },
  { name: 'audio-wav2mp3', tool: 'audio-converter', files: ['tone.wav'], check: async ([f]) => { const p = probe(f.path); assert(p.streams[0].codec_name === 'mp3', 'not mp3'); assert(near(+p.format.duration, 5, 0.2), 'dur'); return 'mp3 ' + p.format.duration; } },
  { name: 'audio-flac2ogg', tool: 'audio-converter', files: ['tone.flac'], actions: [chip('OGG')], check: async ([f]) => { const p = probe(f.path); assert(p.streams[0].codec_name === 'opus', 'not opus'); return 'opus ' + p.format.duration; } },
  { name: 'audio-mp32wav', tool: 'audio-converter', files: ['tone.mp3'], actions: [chip('WAV')], check: async ([f]) => { const p = probe(f.path); assert(near(+p.format.duration, 5, 0.2), 'dur ' + p.format.duration); return p.streams[0].codec_name + ' ' + p.format.duration; } },
  { name: 'audio-m4a2mp3', tool: 'audio-converter', files: ['tone.m4a'], check: async ([f]) => { const p = probe(f.path); return p.streams[0].codec_name + ' ' + p.format.duration; } },
  { name: 'cut-audio-fade', tool: 'cut-audio', files: ['tone.wav'], actions: [async (p) => { await p.fill('.tl-row input.time >> nth=0', '0:01.0'); await p.press('.tl-row input.time >> nth=0', 'Enter'); await p.fill('.tl-row input.time >> nth=1', '0:03.5'); await p.press('.tl-row input.time >> nth=1', 'Enter'); }, async (p) => { await p.click('.field:has-text("Fade in") .chips button:has-text("1")'); }, chip('WAV')],
    check: async ([f]) => {
      const p = probe(f.path); assert(near(+p.format.duration, 2.5, 0.06), 'dur ' + p.format.duration);
      // 첫 0.1초는 거의 조용, 1.5초 뒤는 원래 크기
      const vol = (ss) => { const o = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(ss), '-t', '0.1', '-i', f.path, '-af', 'volumedetect', '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'] }); return o; };
      const lv = (ss) => { const r = require_spawn(['-ss', String(ss), '-t', '0.1', '-i', f.path, '-af', 'volumedetect', '-f', 'null', '-']); const m = r.match(/max_volume: (-?[\d.]+) dB/); return m ? +m[1] : null; };
      const a = lv(0), b = lv(1.6);
      assert(a < b - 12, `fade not applied ${a} vs ${b}`);
      return `cut ${p.format.duration}s fadeStart ${a}dB mid ${b}dB`;
    } },
  { name: 'video-webm2mp4', tool: 'video-converter', files: ['clip.webm'], timeout: 180000, check: async ([f], note) => { const p = probe(f.path); const v = p.streams.find((s) => s.codec_type === 'video'); assert(v, 'no video'); assert(near(+p.format.duration, 6, 0.4), 'dur'); return `mp4 ${v.codec_name} ${v.width}x${v.height} ${(+p.format.duration).toFixed(2)}s copied=${/Copied|옮겨/.test(note)}`; } },
  { name: 'video-mp42webm', tool: 'video-converter', files: ['clip.mp4'], actions: [chip('WebM')], timeout: 180000, check: async ([f]) => { const p = probe(f.path); return p.streams.map((s) => s.codec_name).join('+'); } },
  { name: 'video-webm2mkv-copy', tool: 'video-converter', files: ['clip.webm'], actions: [chip('MOV')], timeout: 180000, check: async ([f], note) => { const p = probe(f.path); return p.streams.map((s) => s.codec_name).join('+') + ' copied=' + /Copied/.test(note); } },
  { name: 'cut-video', tool: 'cut-video', files: ['clip.webm'], actions: [async (p) => { await p.fill('.tl-row input.time >> nth=0', '0:02.0'); await p.press('.tl-row input.time >> nth=0', 'Enter'); await p.fill('.tl-row input.time >> nth=1', '0:04.0'); await p.press('.tl-row input.time >> nth=1', 'Enter'); }],
    check: async ([f]) => { const p = probe(f.path); const d = +p.format.duration; assert(d >= 1.9 && d <= 4.2, 'dur ' + d); return 'fast cut ' + d.toFixed(2) + 's'; } },
  { name: 'cut-video-exact', tool: 'cut-video', files: ['clip.webm'], timeout: 180000, actions: [async (p) => { await p.fill('.tl-row input.time >> nth=0', '0:02.5'); await p.press('.tl-row input.time >> nth=0', 'Enter'); await p.fill('.tl-row input.time >> nth=1', '0:04.0'); await p.press('.tl-row input.time >> nth=1', 'Enter'); await p.check('.toggle input'); }],
    check: async ([f]) => { const p = probe(f.path); const d = +p.format.duration; assert(near(d, 1.5, 0.15), 'dur ' + d); return 'exact ' + d.toFixed(3) + 's'; } },
  { name: 'compress-video', tool: 'compress-video', files: ['silent.webm'], timeout: 240000, actions: [chip('480p'), chip('Smaller')], check: async ([f]) => { const p = probe(f.path); const v = p.streams.find((s) => s.codec_type === 'video'); assert(v.height === 480, 'h ' + v.height); return `${v.codec_name} ${v.width}x${v.height} ${fs.statSync(f.path).size}B (from 491646)`; } },
  { name: 'gif', tool: 'video-to-gif', files: ['clip.webm'], timeout: 180000, actions: [chip('320 px')], check: async ([f]) => { const p = probe(f.path); const v = p.streams[0]; assert(v.codec_name === 'gif' && v.width === 320, v.codec_name + v.width); return `gif ${v.width}x${v.height} frames=${v.nb_frames || '?'} ${fs.statSync(f.path).size}B`; } },
  { name: 'img-png2jpg', tool: 'image-converter', files: ['photo.png', 'alpha.png'], shot: true, check: async (fs_) => { assert(fs_.length === 2, 'n ' + fs_.length); const p = probe(fs_[0].path); assert(p.streams[0].codec_name === 'mjpeg' && p.streams[0].width === 1200, 'jpg'); return fs_.map((f) => f.name).join(','); } },
  { name: 'img-jpg2webp', tool: 'image-converter', files: ['photo.jpg'], actions: [chip('WebP')], check: async ([f]) => { const p = probe(f.path); assert(p.streams[0].codec_name === 'webp', 'webp'); return 'webp ' + fs.statSync(f.path).size; } },
  { name: 'heic', tool: 'heic-to-jpg', files: ['sample.heic'], timeout: 120000, check: async ([f]) => { const p = probe(f.path); assert(p.streams[0].codec_name === 'mjpeg', 'jpg'); return `jpg ${p.streams[0].width}x${p.streams[0].height}`; } },
  { name: 'compress-img', tool: 'compress-image', files: ['photo.png'], actions: [chip('1280')], check: async ([f]) => { const s = fs.statSync(f.path).size; assert(s < 107523, 'not smaller ' + s); return 'jpg ' + s + 'B'; } },
  { name: 'resize-pct', tool: 'resize-image', files: ['photo.jpg'], actions: [chip('Percent'), async (p) => { await p.fill('.num:has-text("Percent") input', '25'); }], check: async ([f]) => { const p = probe(f.path); assert(p.streams[0].width === 300 && p.streams[0].height === 200, p.streams[0].width + 'x' + p.streams[0].height); return '300x200 ' + f.name; } },
  { name: 'resize-px', tool: 'resize-image', files: ['photo.webp'], actions: [async (p) => { await p.fill('.num:has-text("Width") input', '600'); await p.dispatchEvent('.num:has-text("Width") input', 'input'); }], check: async ([f]) => { const p = probe(f.path); assert(p.streams[0].width === 600 && p.streams[0].height === 400 && p.streams[0].codec_name === 'webp', JSON.stringify(p.streams[0].width)); return '600x400 webp'; } },
  { name: 'img2pdf', tool: 'images-to-pdf', files: ['photo.jpg', 'alpha.png', 'photo.webp'], actions: [chip('A4')], check: async ([f]) => { const n = await pdfPages(f.path); assert(n === 3, 'pages ' + n); return 'pdf 3 pages ' + fs.statSync(f.path).size + 'B'; } },
  { name: 'pdf2jpg', tool: 'pdf-to-jpg', files: ['doc3.pdf'], actions: [chip('72 dpi')], check: async (fl) => { assert(fl.length === 3, 'n ' + fl.length); const p = probe(fl[0].path); assert(p.streams[0].width === 595, 'w ' + p.streams[0].width); return fl.map((f) => f.name).join(','); } },
  { name: 'pdf2jpg-range', tool: 'pdf-to-jpg', files: ['doc3.pdf'], actions: [async (p) => p.fill('input.text', '2')], check: async (fl) => { assert(fl.length === 1 && /-2\.jpg$/.test(fl[0].name), fl.map((f) => f.name)); return fl[0].name; } },
  { name: 'merge', tool: 'merge-pdf', files: ['doc3.pdf', 'doc2.pdf'], check: async ([f]) => { const n = await pdfPages(f.path); assert(n === 5, 'pages ' + n); return 'merged 5 pages'; } },
  { name: 'split-extract', tool: 'split-pdf', files: ['doc3.pdf'], actions: [async (p) => p.fill('input.text', '1, 3')], check: async (fl) => { assert(fl.length === 1, 'n'); const n = await pdfPages(fl[0].path); assert(n === 2, 'pages ' + n); return fl[0].name; } },
  { name: 'split-every', tool: 'split-pdf', files: ['doc3.pdf'], actions: [chip('Every page')], check: async (fl) => { assert(fl.length === 3, 'n ' + fl.length); return fl.map((f) => f.name).join(','); } },
  { name: 'csv2json', tool: 'csv-json', files: ['people.csv'], actions: [async (p) => p.check('.toggle:has-text("Detect") input')], check: async ([f]) => { const j = JSON.parse(fs.readFileSync(f.path, 'utf8')); assert(j.length === 2 && j[0]['이름'] === '홍길동' && j[0]['나이'] === 30 && j[0]['우편번호'] === '01234' && j[0]['메모'] === '안녕, "친구"' && j[1]['메모'] === '줄\n바꿈', JSON.stringify(j)); return 'json ok'; } },
  { name: 'json2csv', tool: 'csv-json', files: ['items.json'], lang: 'ko', check: async ([f]) => { const s = fs.readFileSync(f.path, 'utf8'); assert(s.startsWith('﻿'), 'bom'); assert(s === '﻿id,name,tags,price\r\n1,Pen,"[""a"",""b""]",\r\n2,"Note, A5",,3.5\r\n', JSON.stringify(s)); return 'csv ok (ko, BOM)'; } },
  { name: 'xlsx2csv', tool: 'excel-csv', files: ['book.xlsx'], lang: 'ko', check: async ([f]) => { const s = fs.readFileSync(f.path, 'utf8'); assert(s.startsWith('﻿품목,수량,단가,합계\r\n사과,3,1200,3600'), JSON.stringify(s)); return JSON.stringify(s.slice(0, 60)); } },
  { name: 'xlsx2csv-all', tool: 'excel-csv', files: ['book.xlsx'], actions: [chip('All sheets')], check: async (fl) => { assert(fl.length === 2, 'n'); return fl.map((f) => f.name).join(','); } },
  { name: 'csv2xlsx', tool: 'excel-csv', files: ['people.csv'], check: async ([f]) => { assert(fs.readFileSync(f.path).subarray(0, 2).toString() === 'PK', 'zip'); return 'xlsx ' + fs.statSync(f.path).size + 'B'; } },
  { name: 'hub-heic', hub: true, files: ['sample.heic'], hubPick: 'HEIC', timeout: 120000, check: async ([f]) => { const p = probe(f.path); return 'hub → ' + p.streams[0].codec_name; } },
];
import { spawnSync } from 'node:child_process';
function require_spawn(args) { const r = spawnSync('ffmpeg', ['-v', 'info', ...args], { encoding: 'utf8' }); return r.stderr; }

for (const c of CASES) { if (ONLY.length && !ONLY.some((o) => c.name.startsWith(o))) continue; await run(c); const r = results.at(-1); console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name.padEnd(22) + (r.ms / 1000).toFixed(1).padStart(6) + 's  ' + (r.ok ? r.check : r.err) + (r.errors && r.errors.length ? '  [console: ' + r.errors.slice(0, 2).join(' | ').slice(0, 200) + ']' : '')); }
await browser.close();
const fail = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - fail}/${results.length} passed`);
process.exit(fail ? 1 : 0);
