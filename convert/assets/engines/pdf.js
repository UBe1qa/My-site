// PDF 엔진: 만들기·합치기·나누기는 pdf-lib, 그림으로 바꾸기는 PDF.js. 전부 브라우저 안.
let libP = null, jsP = null;
const lib = () => (libP ||= import('/assets/vendor/pdf-lib.min.mjs'));
const pdfjs = () => (jsP ||= import('/assets/vendor/pdf.min.mjs').then((m) => { m.GlobalWorkerOptions.workerSrc = '/assets/vendor/pdf.worker.min.mjs'; return m; }));

const PAGE = { a4: [595.28, 841.89], letter: [612, 792] };

function wrapErr(e) {
  const err = new Error(String(e && e.message || e));
  err.code = /encrypt|password/i.test(err.message) ? 'encrypted' : 'pdf';
  return err;
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
  const { PDFDocument } = await lib();
  try { return (await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false })).getPageCount(); }
  catch (e) { throw wrapErr(e); }
}

// 여러 PDF → 하나
export async function merge(files, onProgress) {
  const { PDFDocument } = await lib();
  const out = await PDFDocument.create();
  let i = 0;
  for (const f of files) {
    let src;
    try { src = await PDFDocument.load(await f.arrayBuffer()); } catch (e) { const err = wrapErr(e); err.file = f.name; throw err; }
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
    onProgress && onProgress(++i / files.length);
  }
  return new Blob([await out.save()], { type: 'application/pdf' });
}

// 쪽 묶음들로 나누기. groups: [[0,1,2],[4]] (0부터 센 쪽 번호) → Blob 배열
export async function split(file, groups, onProgress) {
  const { PDFDocument } = await lib();
  let src;
  try { src = await PDFDocument.load(await file.arrayBuffer()); } catch (e) { throw wrapErr(e); }
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
