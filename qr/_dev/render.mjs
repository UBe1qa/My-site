// 빌드 때 SVG 미리 그리기(첫 HTML 에 넣어 화면 밀림 0): echo '[작업…]' | node qr/_dev/render.mjs  → JSON 줄 [SVG…]
// 작업: { k:'qr', text, ecl, style, cut, aria, cls } · { k:'dots', v } · { k:'eyeo', v } · { k:'eyei', v } · { k:'frame', v }
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QR = require(path.join(ROOT, 'assets/qr.js'));
const R = require(path.join(ROOT, 'assets/qr-render.js'));
const glyphs = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/glyphs/base.json'), 'utf8'));
const jobs = JSON.parse(fs.readFileSync(0, 'utf8'));
// 작은 무늬 하나(5×5)
const PAT = [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1];
const out = jobs.map((j) => {
  if (j.k === 'qr') {
    let q = QR.encode(j.text, { ecl: j.ecl || 'M', boost: false });
    if (j.fake) q = R.fake(q);   // 예시: 찍어도 읽히지 않는 무늬
    const sc = R.scene(q, j.style || {}, glyphs);
    return R.toSVG(sc, { bare: true, cut: j.cut || 0, cls: j.cls, aria: j.aria, idp: j.idp || 'b' });
  }
  if (j.k === 'dots') {
    const d = R._modules(Uint8Array.from(PAT), 5, j.v, 0, 0);
    return `<svg viewBox="-.4 -.4 5.8 5.8" aria-hidden="true"><path d="${d}"/></svg>`;
  }
  if (j.k === 'eyeo' || j.k === 'eyei') {
    const o = R._eyeOuter(0, 0, j.k === 'eyeo' ? j.v : 'square', 0), i = R._eyeInner(0, 0, j.k === 'eyei' ? j.v : 'square', 0);
    return `<svg viewBox="-.6 -.6 8.2 8.2" aria-hidden="true"><path d="${o}"${j.k === 'eyei' ? ' opacity=".35"' : ''}/><path d="${i}"${j.k === 'eyeo' ? ' opacity=".35"' : ''}/></svg>`;
  }
  if (j.k === 'frame') {
    const q = QR.encode('A', { ecl: 'L', boost: false });
    const sc = R.scene(q, { frame: j.v, frameText: '', margin: 2, frameColor: '#111111', fg: '#111111' }, glyphs);
    // 틀 모양만 보이게: 틀은 진하게, QR 칸은 옅은 네모 하나로
    const fr = sc.shapes.filter((s) => s.role === 'frame' || s.role === 'deco').map((s) => `<path d="${s.d}" class="${s.role === 'frame' ? 'fi-f' : 'fi-d'}"${s.rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}/>`).join('');
    const bg = sc.shapes.find((s) => s.role === 'bg');
    const qx = sc.qr.ox, qy = sc.qr.oy, n = sc.qr.n;
    return `<svg viewBox="${-1} ${-1} ${R.f(sc.W + 2)} ${R.f(sc.H + 2)}" aria-hidden="true">${j.v === 'none' ? '' : ''}${bg ? `<path d="${bg.d}" class="fi-b"/>` : ''}${fr}<rect x="${qx}" y="${qy}" width="${n}" height="${n}" class="fi-q" rx="1"/></svg>`;
  }
  return '';
});
process.stdout.write(JSON.stringify(out));
