// PDF 엔진: 만들기·합치기·나누기는 pdf-lib, 그림으로 바꾸기는 PDF.js. 전부 브라우저 안.
let libP = null, jsP = null;
const lib = () => (libP ||= import('/assets/vendor/pdf-lib.min.mjs'));
const pdfjs = () => (jsP ||= import('/assets/vendor/pdf.min.mjs').then((m) => { m.GlobalWorkerOptions.workerSrc = '/assets/vendor/pdf.worker.min.mjs'; return m; }));

const PAGE = { a4: [595.28, 841.89], letter: [612, 792] };

function wrapErr(e, file) {
  const err = new Error(String(e && e.message || e));
  err.code = e && e.code === 'encrypted' ? 'encrypted' : /encrypt|password/i.test(err.message) ? 'encrypted' : 'pdf';
  if (file) err.file = file.name;
  return err;
}

// ---- qpdf (WebAssembly): 암호 풀기·걸기, 파일 구조 다시 압축 ----
let qpP = null, qpErr = '';
const qpdf = () => (qpP ||= import('/assets/vendor/qpdf.mjs').then((m) => m.default({
  locateFile: () => '/assets/vendor/qpdf.wasm', print: () => {}, printErr: (t) => { qpErr += t + '\n'; },
})));
// args 안의 IN·OUT 자리에 파일을 넣고 돌린다. 돌려주는 값: { code, out(Uint8Array|null), err }
async function runQpdf(bytes, args) {
  const q = await qpdf();
  qpErr = '';
  q.FS.writeFile('/in.pdf', bytes);
  let code;
  try { code = q.callMain(args.map((a) => (a === 'IN' ? '/in.pdf' : a === 'OUT' ? '/out.pdf' : a))); }
  catch (e) { code = typeof e?.status === 'number' ? e.status : 2; }
  let out = null;
  try { if (args.includes('OUT') && (code === 0 || code === 3)) out = q.FS.readFile('/out.pdf'); } catch (e) {}
  try { q.FS.unlink('/in.pdf'); } catch (e) {}
  try { q.FS.unlink('/out.pdf'); } catch (e) {}
  return { code, out, err: qpErr };
}

// 암호 상태: 'none'(암호 없음) | 'restricted'(열 땐 암호 없이, 복사·인쇄만 막힘) | 'password'(열 때 암호 필요)
// 이 qpdf 빌드는 오류 글을 넘겨받을 수 없어서 종료 코드만으로 판단한다: 열리면(쪽 수가 나오면) 암호 없음 또는 제한만,
// 안 열리면 pdf-lib로 암호 사전이 있는지 본다(없으면 손상된 파일).
export async function lockState(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if ((await runQpdf(bytes, ['--show-npages', 'IN'])).code === 0) return (await runQpdf(bytes, ['--is-encrypted', 'IN'])).code === 0 ? 'restricted' : 'none';
  const { PDFDocument } = await lib();
  let doc;
  try { doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false }); } catch (e) { throw wrapErr(e, file); }
  if (doc.isEncrypted) return 'password';
  throw wrapErr(new Error('damaged'), file);
}

async function decryptBytes(bytes, password, file) {
  const r = await runQpdf(bytes, ['--password=' + (password || ''), '--decrypt', 'IN', 'OUT']);
  if (!r.out) {
    const err = new Error(r.err || 'qpdf');
    err.code = password ? 'wrongPassword' : 'encrypted';
    if (file) err.file = file.name;
    throw err;
  }
  return r.out;
}

// pdf-lib로 연다. 복사·인쇄만 막힌 PDF는 먼저 암호를 풀어서(열 때 암호는 없으니 그냥 풀린다) 연다.
async function loadDoc(file, bytes) {
  const { PDFDocument } = await lib();
  bytes = bytes || new Uint8Array(await file.arrayBuffer());
  try { return await PDFDocument.load(bytes, { updateMetadata: false }); }
  catch (e) {
    if (!/encrypt/i.test(String(e && e.message))) throw wrapErr(e, file);
    const plain = await decryptBytes(bytes, '', file);
    try { return await PDFDocument.load(plain, { updateMetadata: false }); } catch (e2) { throw wrapErr(e2, file); }
  }
}

// 암호 풀기. 열 때 암호가 필요한 파일은 password가 있어야 한다.
export async function unlock(file, password) {
  return new Blob([await decryptBytes(new Uint8Array(await file.arrayBuffer()), password, file)], { type: 'application/pdf' });
}

// 암호 걸기(AES-256). restrict면 인쇄·복사·수정도 막는다(소유자 암호는 무작위라 열기 암호로 못 푼다).
export async function protect(file, password, restrict) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const state = await lockState(file);
  const src = state === 'none' ? bytes : await decryptBytes(bytes, '', file);
  const owner = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
  const r = await runQpdf(src, ['IN', '--encrypt', password, owner, '256', ...(restrict ? ['--print=none', '--extract=n', '--modify=none', '--annotate=n', '--form=n', '--assemble=n'] : []), '--', 'OUT']);
  if (!r.out) { const err = new Error(r.err || 'qpdf'); err.code = 'pdf'; throw err; }
  return new Blob([r.out], { type: 'application/pdf' });
}

// 그림들 → PDF 하나. items: [{ bytes(Uint8Array, JPG 또는 PNG), kind:'jpg'|'png', width, height }]
// opts: { page: 'fit'|'a4'|'letter', margin: 0|pt }
export async function imagesToPdf(items, opts, onProgress) {
  const { PDFDocument } = await lib();
  const doc = await PDFDocument.create();
  let i = 0;
  for (const it of items) {
    const img = it.kind === 'png' ? await doc.embedPng(it.bytes) : await doc.embedJpg(it.bytes);
    const m = opts.margin || 0;
    let pw, ph;
    if (opts.page === 'fit') { pw = img.width * 0.75 + m * 2; ph = img.height * 0.75 + m * 2; }
    else {
      [pw, ph] = PAGE[opts.page];
      if (img.width > img.height) [pw, ph] = [ph, pw]; // 가로 그림은 가로 페이지
    }
    const page = doc.addPage([pw, ph]);
    const s = Math.min((pw - m * 2) / img.width, (ph - m * 2) / img.height);
    const w = img.width * s, h = img.height * s;
    page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    onProgress && onProgress(++i / items.length);
  }
  return new Blob([await doc.save()], { type: 'application/pdf' });
}

export async function pageCount(file) {
  return (await loadDoc(file)).getPageCount();
}

// 여러 PDF → 하나
export async function merge(files, onProgress) {
  const { PDFDocument } = await lib();
  const out = await PDFDocument.create();
  let i = 0;
  for (const f of files) {
    const src = await loadDoc(f);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
    onProgress && onProgress(++i / files.length);
  }
  return new Blob([await out.save()], { type: 'application/pdf' });
}

// 쪽 묶음들로 나누기. groups: [[0,1,2],[4]] (0부터 센 쪽 번호) → Blob 배열
export async function split(file, groups, onProgress) {
  const { PDFDocument } = await lib();
  const src = await loadDoc(file);
  const res = [];
  let i = 0;
  for (const g of groups) {
    const doc = await PDFDocument.create();
    (await doc.copyPages(src, g)).forEach((p) => doc.addPage(p));
    res.push(new Blob([await doc.save()], { type: 'application/pdf' }));
    onProgress && onProgress(++i / groups.length);
  }
  return res;
}

// "1-3, 5, 8-" → [0,1,2,4,7..n-1]. 틀린 글자나 범위 밖이면 오류.
export function parseRanges(text, n) {
  const out = [];
  const parts = String(text).split(/[,，;\s]+/).filter(Boolean);
  if (!parts.length) throw Object.assign(new Error('empty'), { code: 'range' });
  for (const p of parts) {
    const m = p.match(/^(\d+)?\s*[-–~]\s*(\d+)?$/) || p.match(/^(\d+)$/);
    if (!m) throw Object.assign(new Error(p), { code: 'range' });
    let a, b;
    if (m.length === 2) { a = b = +m[1]; } else { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : n; }
    if (a < 1 || b > n || a > b) throw Object.assign(new Error(p), { code: 'range' });
    for (let k = a; k <= b; k++) out.push(k - 1);
  }
  return out;
}

// PDF 쪽 → 그림. pages: 0부터 센 쪽 번호 배열. opts: { dpi, format:'jpg'|'png', quality }
export async function toImages(file, pages, opts, onEach) {
  const m = await pdfjs();
  const task = m.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  let doc;
  try { doc = await task.promise; }
  catch (e) { throw wrapErr(e); }
  const res = [];
  const mime = opts.format === 'png' ? 'image/png' : 'image/jpeg';
  for (let k = 0; k < pages.length; k++) {
    const page = await doc.getPage(pages[k] + 1);
    const vp = page.getViewport({ scale: opts.dpi / 72 });
    const c = document.createElement('canvas');
    c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise;
    const blob = await new Promise((r) => c.toBlob(r, mime, opts.quality ?? 0.92));
    res.push({ blob, page: pages[k] + 1, width: c.width, height: c.height });
    c.width = c.height = 0;
    page.cleanup();
    onEach && onEach((k + 1) / pages.length);
  }
  task.destroy();
  return res;
}

export async function numPagesJs(file) {
  const m = await pdfjs();
  const task = m.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  try { const d = await task.promise; const n = d.numPages; task.destroy(); return n; }
  catch (e) { throw wrapErr(e); }
}

// ---- 쪽 미리보기(작은 그림). onEach(i, canvas)로 하나씩 넘긴다. signal로 멈춘다. ----
export async function thumbnails(file, width, onEach, signal) {
  const m = await pdfjs();
  const task = m.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  let doc;
  try { doc = await task.promise; } catch (e) { throw wrapErr(e, file); }
  const n = doc.numPages;
  try {
    for (let i = 0; i < n; i++) {
      if (signal && signal.aborted) break;
      const page = await doc.getPage(i + 1);
      const vp0 = page.getViewport({ scale: 1, rotation: 0 });
      const scale = (width * Math.min(2, devicePixelRatio || 1)) / Math.max(vp0.width, vp0.height);
      const vp = page.getViewport({ scale, rotation: 0 }); // 회전은 화면에서 CSS로 보여 준다
      const c = document.createElement('canvas');
      c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise;
      onEach(i, c, page.rotate || 0, n);
      page.cleanup();
      await new Promise((r) => setTimeout(r));
    }
  } finally { task.destroy(); }
  return n;
}

// 쪽마다 돌리기. turns[i] = 더할 각도(90의 배수, 시계 방향). 다시 그리지 않고 쪽의 회전값만 바꾼다.
export async function rotate(file, turns) {
  const { degrees } = await lib();
  const doc = await loadDoc(file);
  doc.getPages().forEach((p, i) => {
    const add = turns[i] || 0;
    if (add % 360) p.setRotation(degrees((((p.getRotation().angle + add) % 360) + 360) % 360));
  });
  return new Blob([await doc.save()], { type: 'application/pdf' });
}

// 쪽 정리: order = 남길 쪽 번호(0부터)를 새 순서대로
export async function organize(file, order) {
  const { PDFDocument } = await lib();
  const src = await loadDoc(file);
  const out = await PDFDocument.create();
  (await out.copyPages(src, order)).forEach((p) => out.addPage(p));
  return new Blob([await out.save()], { type: 'application/pdf' });
}

// 화면에 보이는 방향(쪽 회전 반영) 기준 좌표 → PDF 좌표. 보이는 크기와 변환 함수를 돌려준다.
function viewOf(page) {
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  const b = page.getCropBox();
  const W = b.width, H = b.height, x0 = b.x, y0 = b.y;
  const VW = r % 180 ? H : W, VH = r % 180 ? W : H;
  const map = (vx, vy) => {
    if (r === 90) return [x0 + W - vy, y0 + vx];
    if (r === 180) return [x0 + W - vx, y0 + H - vy];
    if (r === 270) return [x0 + vy, y0 + H - vx];
    return [x0 + vx, y0 + vy];
  };
  return { r, VW, VH, map };
}

// 쪽 번호. opts: { pos: 'bc'|'br'|'bl'|'tr'|'tc', fmt: 'n'|'nOfTotal'|'dash'|'page', start, skipFirst, size: 's'|'m' }
export async function pageNumbers(file, opts) {
  const { StandardFonts, rgb, degrees } = await lib();
  const doc = await loadDoc(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const skip = opts.skipFirst ? 1 : 0;
  const start = Math.max(0, Math.floor(opts.start || 1));
  const total = pages.length - skip + start - 1;
  pages.forEach((page, i) => {
    if (i < skip) return;
    const n = start + i - skip;
    const text = opts.fmt === 'nOfTotal' ? `${n} / ${total}` : opts.fmt === 'dash' ? `- ${n} -` : opts.fmt === 'page' ? `Page ${n} of ${total}` : String(n);
    const { r, VW, VH, map } = viewOf(page);
    const size = Math.max(7, Math.min(VW, VH) * (opts.size === 'm' ? 0.022 : 0.016));
    const tw = font.widthOfTextAtSize(text, size);
    const m = Math.max(18, Math.min(VW, VH) * 0.045);
    const vx = opts.pos === 'br' || opts.pos === 'tr' ? VW - m - tw : opts.pos === 'bl' ? m : (VW - tw) / 2;
    const vy = opts.pos === 'tr' || opts.pos === 'tc' ? VH - m - size * 0.75 : m;
    const [x, y] = map(vx, vy);
    page.drawText(text, { x, y, size, font, color: rgb(0.2, 0.2, 0.22), rotate: degrees(r) });
  });
  return new Blob([await doc.save()], { type: 'application/pdf' });
}

// 워터마크: 글자를 투명 PNG로 그려(한글 등 어떤 글자든) 쪽마다 올린다.
// opts: { text, style: 'diagonal'|'center'|'tile', opacity, size: 's'|'m'|'l', color: 'gray'|'red' }
function textImage(text, color, angle) {
  const px = 160;
  const font = `700 ${px}px system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Noto Sans CJK KR", sans-serif`;
  const c0 = document.createElement('canvas').getContext('2d');
  c0.font = font;
  const tw = Math.ceil(c0.measureText(text).width) + px * 0.4, th = Math.ceil(px * 1.4);
  const a = (angle * Math.PI) / 180, cw = Math.ceil(Math.abs(tw * Math.cos(a)) + Math.abs(th * Math.sin(a))), ch = Math.ceil(Math.abs(tw * Math.sin(a)) + Math.abs(th * Math.cos(a)));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  ctx.translate(cw / 2, ch / 2); ctx.rotate(-a);
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color === 'red' ? '#d0312d' : '#6b6b70';
  ctx.fillText(text, 0, 0);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}

export async function watermark(file, opts) {
  const { degrees } = await lib();
  const doc = await loadDoc(file);
  const angle = opts.style === 'center' ? 0 : 45;
  const png = await textImage(opts.text, opts.color, angle);
  const img = await doc.embedPng(new Uint8Array(await png.arrayBuffer()));
  const ar = img.height / img.width;
  const frac = opts.style === 'tile' ? { s: 0.22, m: 0.3, l: 0.4 }[opts.size] : { s: 0.45, m: 0.7, l: 0.92 }[opts.size];
  for (const page of doc.getPages()) {
    const { r, VW, VH, map } = viewOf(page);
    let w = Math.min(VW, VH) * frac, h = w * ar;
    if (h > VH * 0.9) { h = VH * 0.9; w = h / ar; }
    const place = (cx, cy) => {
      // 이미지 가운데가 (cx, cy)에 오게: 왼쪽 아래 모서리를 회전 반영해서 계산
      const [x, y] = map(cx - w / 2, cy - h / 2);
      page.drawImage(img, { x, y, width: w, height: h, opacity: opts.opacity, rotate: degrees(r) });
    };
    if (opts.style === 'tile') {
      const gx = w * 1.25, gy = h * 1.35;
      for (let cy = gy / 2; cy < VH + gy / 2; cy += gy) for (let cx = gx / 2 + ((Math.round(cy / gy) % 2) * gx) / 2; cx < VW + gx / 2; cx += gx) place(cx, cy);
    } else place(VW / 2, VH / 2);
  }
  return new Blob([await doc.save()], { type: 'application/pdf' });
}

// ---- PDF 압축: 안의 사진·스캔 그림을 해상도·품질을 낮춘 JPEG로 다시 저장 + 파일 구조 압축 ----
const LEVEL = { strong: { side: 1240, q: 0.55 }, balanced: { side: 1600, q: 0.7 }, light: { side: 2400, q: 0.82 } };

// 글자로 감싼 데이터(ASCII85·ASCIIHex) 풀기. 앞단 필터로 흔히 쓰인다(ReportLab 등).
function ascii85(bytes) {
  const out = []; let n = 0, k = 0;
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c === 126) break; // ~>
    if (c <= 32) continue;
    if (c === 122 && k === 0) { out.push(0, 0, 0, 0); continue; } // z
    if (c < 33 || c > 117) throw new Error('a85');
    n = n * 85 + (c - 33); k++;
    if (k === 5) { out.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255); n = 0; k = 0; }
  }
  if (k) { for (let j = k; j < 5; j++) n = n * 85 + 84; for (let j = 0; j < k - 1; j++) out.push((n >>> (24 - 8 * j)) & 255); }
  return new Uint8Array(out);
}
function asciiHex(bytes) {
  const hex = new TextDecoder('latin1').decode(bytes).split('>')[0].replace(/[^0-9a-fA-F]/g, '');
  const s = hex.length % 2 ? hex + '0' : hex; const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
}

function unpredictPng(data, colors, columns) {
  const bpr = colors * columns, out = new Uint8Array(bpr * Math.floor(data.length / (bpr + 1)));
  let prev = new Uint8Array(bpr);
  for (let row = 0, i = 0, o = 0; i + bpr < data.length + 1 && o < out.length; row++) {
    const f = data[i++], cur = out.subarray(o, o + bpr);
    for (let x = 0; x < bpr; x++) {
      const a = x >= colors ? cur[x - colors] : 0, b = prev[x], c = x >= colors ? prev[x - colors] : 0, v = data[i + x];
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = (v + p) & 255;
    }
    prev = cur; i += bpr; o += bpr;
  }
  return out;
}

export async function compress(file, level, onProgress) {
  const L = LEVEL[level] || LEVEL.balanced;
  const P = await lib();
  const { PDFName, PDFRawStream, PDFArray, PDFNumber } = P;
  const orig = new Uint8Array(await file.arrayBuffer());
  const doc = await loadDoc(file, orig);
  const ctx = doc.context;
  const N = (d, k) => { const v = d.get(PDFName.of(k)); return v ? ctx.lookup(v) : undefined; };
  const num = (v) => (v instanceof PDFNumber ? v.asNumber() : undefined);
  const nm = (v) => (v instanceof PDFName ? v.decodeText() : undefined);
  const images = ctx.enumerateIndirectObjects().filter(([, o]) => o instanceof PDFRawStream && nm(N(o.dict, 'Subtype')) === 'Image');
  let done = 0, replaced = 0;
  const { unzlibSync } = await import('/assets/vendor/fflate.mjs');
  for (const [ref, obj] of images) {
    onProgress && onProgress((done++ / Math.max(1, images.length)) * 0.85);
    try {
      const d = obj.dict;
      const w = num(N(d, 'Width')), h = num(N(d, 'Height')), bpc = num(N(d, 'BitsPerComponent'));
      if (!w || !h || w * h < 200 * 200) continue;
      if (N(d, 'ImageMask') || N(d, 'Decode') || N(d, 'Mask') instanceof PDFArray) continue;
      // 필터가 여러 겹이면(예: ASCII85 → DCT) 앞의 것은 풀고 마지막 것으로 판단한다
      const fl = N(d, 'Filter');
      const chain = fl instanceof PDFArray ? Array.from({ length: fl.size() }, (_, i) => nm(ctx.lookup(fl.get(i)))) : [nm(fl)];
      const f = chain[chain.length - 1];
      let data = obj.contents;
      for (const pre of chain.slice(0, -1)) {
        if (pre === 'ASCII85Decode' || pre === 'A85') data = ascii85(data);
        else if (pre === 'ASCIIHexDecode' || pre === 'AHx') data = asciiHex(data);
        else if (pre === 'FlateDecode' || pre === 'Fl') data = unzlibSync(data);
        else { data = null; break; }
      }
      if (!data) continue;
      let cs = N(d, 'ColorSpace'), comps;
      const csName = nm(cs);
      if (csName === 'DeviceRGB') comps = 3; else if (csName === 'DeviceGray') comps = 1;
      else if (cs instanceof PDFArray && nm(ctx.lookup(cs.get(0))) === 'ICCBased') {
        const icc = ctx.lookup(cs.get(1)); const n = icc && icc.dict ? num(N(icc.dict, 'N')) : undefined;
        if (n === 3 || n === 1) comps = n;
      }
      if (!comps) continue; // CMYK·Indexed·특수 색은 건드리지 않는다
      const scale = Math.min(1, L.side / Math.max(w, h));
      let bmp;
      if (f === 'DCTDecode') {
        bmp = await createImageBitmap(new Blob([data], { type: 'image/jpeg' }));
      } else if (f === 'FlateDecode' && bpc === 8) {
        let raw = unzlibSync(data);
        let parms = N(d, 'DecodeParms');
        if (parms instanceof PDFArray) parms = ctx.lookup(parms.get(parms.size() - 1));
        const pred = parms && parms.get ? num(N(parms, 'Predictor')) : undefined;
        if (pred && pred >= 10) raw = unpredictPng(raw, comps, w);
        else if (pred && pred !== 1) continue;
        if (raw.length < w * h * comps) continue;
        const rgba = new Uint8ClampedArray(w * h * 4);
        for (let i = 0, j = 0; i < w * h; i++, j += comps) {
          const k = i * 4;
          if (comps === 3) { rgba[k] = raw[j]; rgba[k + 1] = raw[j + 1]; rgba[k + 2] = raw[j + 2]; } else { rgba[k] = rgba[k + 1] = rgba[k + 2] = raw[j]; }
          rgba[k + 3] = 255;
        }
        bmp = await createImageBitmap(new ImageData(rgba, w, h));
      } else continue;
      const nw = Math.max(1, Math.round(w * scale)), nh = Math.max(1, Math.round(h * scale));
      const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(nw, nh) : Object.assign(document.createElement('canvas'), { width: nw, height: nh });
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, nw, nh); g.imageSmoothingQuality = 'high';
      g.drawImage(bmp, 0, 0, nw, nh); bmp.close && bmp.close();
      const blob = c.convertToBlob ? await c.convertToBlob({ type: 'image/jpeg', quality: L.q }) : await new Promise((r) => c.toBlob(r, 'image/jpeg', L.q));
      const jpg = new Uint8Array(await blob.arrayBuffer());
      if (jpg.length >= obj.contents.length * 0.9) continue;
      const nd = { Type: 'XObject', Subtype: 'Image', Width: nw, Height: nh, ColorSpace: 'DeviceRGB', BitsPerComponent: 8, Filter: 'DCTDecode' };
      const ns = ctx.stream(jpg, nd);
      for (const k of ['SMask', 'Interpolate', 'Intent', 'Metadata']) { const v = d.get(PDFName.of(k)); if (v) ns.dict.set(PDFName.of(k), v); }
      ctx.assign(ref, ns);
      replaced++;
    } catch (e) { /* 이 그림은 그대로 둔다 */ }
  }
  onProgress && onProgress(0.9);
  let bytes = await doc.save({ useObjectStreams: true });
  // 파일 구조 압축(qpdf). 실패하면 pdf-lib 결과 그대로.
  try {
    const r = await runQpdf(bytes, ['IN', '--object-streams=generate', '--compress-streams=y', '--recompress-flate', '--compression-level=9', 'OUT']);
    if (r.out && r.out.length < bytes.length) bytes = r.out;
  } catch (e) {}
  onProgress && onProgress(1);
  if (bytes.length >= orig.length) return { blob: new Blob([orig], { type: 'application/pdf' }), notSmaller: true, replaced };
  return { blob: new Blob([bytes], { type: 'application/pdf' }), notSmaller: false, replaced };
}
