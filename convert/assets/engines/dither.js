// GIF 색 줄이기(256색)에서 부드러운 배경이 계단·얼룩이 지지 않게 하는 디더링.
// 순서 디더링(Bayer 8×8): 프레임마다 무늬가 같은 자리에 있어 움직이는 GIF에서도 지글거리지 않고 압축도 잘 된다.
const BAYER = (() => {
  const m = new Float32Array(64);
  const b = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  for (let i = 0; i < 64; i++) m[i] = (b[i] + 0.5) / 64 - 0.5;
  return m;
})();

// data: RGBA, palette: [[r,g,b],...] → 색 번호 배열
// 같은 팔레트를 다음 프레임에도 쓰면 찾아 둔 색을 그대로 쓴다
const memo = new WeakMap();
export function ditherIndex(data, w, h, palette, strength = 12) {
  const n = palette.length;
  const pr = new Int16Array(n), pg = new Int16Array(n), pb = new Int16Array(n);
  palette.forEach((c, i) => { pr[i] = c[0]; pg[i] = c[1]; pb[i] = c[2]; });
  let cache = memo.get(palette); // 채널당 6비트로 가장 가까운 색을 기억
  if (!cache) { cache = new Int16Array(1 << 18).fill(-1); memo.set(palette, cache); }
  const near = (r, g, b) => {
    const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    let k = cache[key];
    if (k >= 0) return k;
    let best = 1e9;
    for (let i = 0; i < n; i++) {
      const dr = pr[i] - r, dg = pg[i] - g, db = pb[i] - b;
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
      if (d < best) { best = d; k = i; }
    }
    cache[key] = k;
    return k;
  };
  const out = new Uint8Array(w * h);
  for (let y = 0, p = 0; y < h; y++) {
    const row = (y & 7) << 3;
    for (let x = 0; x < w; x++, p++) {
      const o = BAYER[row | (x & 7)] * strength, q = p * 4;
      const r = data[q] + o, g = data[q + 1] + o, b = data[q + 2] + o;
      out[p] = near(r < 0 ? 0 : r > 255 ? 255 : r | 0, g < 0 ? 0 : g > 255 ? 255 : g | 0, b < 0 ? 0 : b > 255 ? 255 : b | 0);
    }
  }
  return out;
}
