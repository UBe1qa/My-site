// 공유 그림의 스티커 SVG 만들기(og.py 가 부른다): node og.mjs <lang>
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QR = require(path.join(ROOT, 'assets/qr.js')), R = require(path.join(ROOT, 'assets/qr-render.js')), P = require(path.join(ROOT, 'assets/qr-presets.js'));
const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/glyphs/base.json'), 'utf8'));
const lang = process.argv[2] || 'en';
const q = QR.encode(lang === 'ko' ? 'https://qr.lumenlab.page/ko/' : 'https://qr.lumenlab.page/', { ecl: 'M', boost: false });
const out = ['cafe', 'event', 'minimal'].map((id) => { const st = P.style(P.LIST.find((p) => p.id === id), lang); st.margin = 2; return R.toSVG(R.scene(q, st, g), { bare: true, cut: 1.6, idp: id }); });
process.stdout.write(JSON.stringify(out));
