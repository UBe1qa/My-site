// 그림 엔진: 브라우저의 그림 해독(createImageBitmap)과 캔버스 인코딩. HEIC는 브라우저가 못 열면 libheif(WebAssembly).
// 다시 그려 저장하므로 EXIF(찍은 곳 좌표 포함)는 따라가지 않는다.

const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };

const canvas = (w, h) => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
};

async function toBlob(c, mime, quality) {
  if (c.convertToBlob) return c.convertToBlob({ type: mime, quality });
  return new Promise((res) => c.toBlob(res, mime, quality));
}

// 이 브라우저가 실제로 만들 수 있는 형식(못 만들면 PNG로 몰래 바뀌므로 결과 형식을 보고 판단)
const encCache = {};
export async function canEncode(fmt) {
  if (fmt in encCache) return encCache[fmt];
  const c = canvas(2, 2); c.getContext('2d').fillRect(0, 0, 2, 2);
  try { const b = await toBlob(c, MIME[fmt], 0.8); encCache[fmt] = !!b && b.type === MIME[fmt]; }
  catch (e) { encCache[fmt] = false; }
  return encCache[fmt];
}

const isHeic = (f) => /\.(heic|heif)$/i.test(f.name) || /image\/hei[cf]/.test(f.type);
const isSvg = (f) => /\.svg$/i.test(f.name) || f.type === 'image/svg+xml';

let heifLib = null;
async function decodeHeic(file) {
  if (!heifLib) heifLib = (async () => (await import('/assets/vendor/libheif-bundle.mjs')).default())();
  const lib = await heifLib;
  const decoder = new lib.HeifDecoder();
  const images = decoder.decode(new Uint8Array(await file.arrayBuffer()));
  if (!images || !images.length) { const e = new Error('heic'); e.code = 'decode'; throw e; }
  const img = images[0];
  const w = img.get_width(), h = img.get_height();
  const data = await new Promise((res, rej) => {
    img.display({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }, (d) => d ? res(d) : rej(new Error('heic')));
  });
  const c = canvas(w, h);
  c.getContext('2d').putImageData(new ImageData(data.data, w, h), 0, 0);
  for (const i of images) i.free && i.free();
  return { source: c, width: w, height: h };
}

async function decodeSvg(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    let w = img.naturalWidth || 1024, h = img.naturalHeight || 1024;
    const c = canvas(w, h); c.getContext('2d').drawImage(img, 0, 0, w, h);
    return { source: c, width: w, height: h };
  } finally { URL.revokeObjectURL(url); }
}

// 파일 → 그릴 수 있는 그림 { source, width, height }
export async function decode(file) {
  if (isSvg(file)) return decodeSvg(file);
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bmp, width: bmp.width, height: bmp.height };
  } catch (e) {
    if (isHeic(file)) return decodeHeic(file);
    const err = new Error('decode'); err.code = 'decode'; throw err;
  }
}

// 그림 하나 저장. opts: { format: 'jpg'|'png'|'webp'|'avif', quality(0~1), width, height, background }
export async function encode(img, opts) {
  const w = Math.max(1, Math.round(opts.width || img.width)), h = Math.max(1, Math.round(opts.height || img.height));
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  if (opts.format === 'jpg') { ctx.fillStyle = opts.background || '#ffffff'; ctx.fillRect(0, 0, w, h); }
  ctx.imageSmoothingQuality = 'high';
  if (w < img.width / 2 || h < img.height / 2) {
    // 많이 줄일 땐 반씩 나눠 줄여야 계단이 덜 생긴다
    let src = img.source, sw = img.width, sh = img.height;
    while (sw / 2 > w && sh / 2 > h) {
      const t = canvas(Math.round(sw / 2), Math.round(sh / 2));
      const tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high';
      tc.drawImage(src, 0, 0, t.width, t.height); src = t; sw = t.width; sh = t.height;
    }
    ctx.drawImage(src, 0, 0, w, h);
  } else ctx.drawImage(img.source, 0, 0, w, h);
  const mime = MIME[opts.format];
  const blob = await toBlob(c, mime, opts.format === 'png' ? undefined : (opts.quality ?? 0.9));
  if (!blob || blob.type !== mime) { const e = new Error('encode'); e.code = 'encode'; throw e; }
  return { blob, ext: opts.format, mime, width: w, height: h };
}

export function release(img) { img && img.source && img.source.close && img.source.close(); }

// 원래 형식을 그대로 쓸 수 있으면 그 형식, 아니면 PNG(투명) / JPG
export function sameFormat(file) {
  const n = file.name.toLowerCase();
  if (/\.jpe?g$/.test(n) || file.type === 'image/jpeg') return 'jpg';
  if (/\.webp$/.test(n) || file.type === 'image/webp') return 'webp';
  if (/\.png$/.test(n) || file.type === 'image/png') return 'png';
  if (/\.avif$/.test(n)) return 'avif';
  return 'png';
}
