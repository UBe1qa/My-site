// PDF → 마크다운. PDF.js로 쪽마다 글자 조각(위치·크기)을 읽고, 위치만 보고 줄·문단·제목·목록·표·두 단을 다시 짠다.
// 그림·도형은 버린다(글만 남기는 게 목적). 스캔본처럼 글자 층이 없는 쪽은 '글자 없음'으로 알린다.
// extractPages(PDF.js 모듈, 바이트) → buildMarkdown(쪽들, 설정)으로 나눠 둬서 노드에서도 시험할 수 있다.

const BULLET = /^[•●○◦▪▫■□◆◇‣∙・\u2043\u2219\uf0b7\uf0a7\uf076\uf0d8\uf0fc]\s*/; // 글머리 기호(\uf0..는 Symbol·Wingdings 글꼴의 점)
const DASH_BULLET = /^[-–*]\s+/;
const NUMBERED = /^(\d{1,3})[.)]\s+/;
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
const CJK_NOSPACE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/; // 한자·가나: 줄을 이을 때 띄우지 않는다
const PAGE_NO = /^(?:page\s*)?[-–(]?\s*\d{1,4}\s*(?:[-–)]|\/\s*\d{1,4}|of\s+\d{1,4}|쪽)?\s*$/i;

export async function extractPages(m, data, { cMapUrl, standardFontDataUrl, onProgress, signal } = {}) {
  const task = m.getDocument({ data, isEvalSupported: false, cMapUrl, cMapPacked: true, standardFontDataUrl, disableFontFace: true });
  const doc = await task.promise;
  const pages = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      if (signal && signal.aborted) throw new DOMException('canceled', 'AbortError');
      const page = await doc.getPage(n);
      const [x0, y0, x1, y1] = page.view;
      const tc = await page.getTextContent();
      const items = [];
      for (const it of tc.items) {
        if (!it.str || !it.str.trim()) continue;
        const t = it.transform;
        const size = Math.hypot(t[2], t[3]) || it.height || 10;
        const rot = Math.abs(t[1]) > 0.01 * size || Math.abs(t[2]) > 0.01 * size;
        items.push({ str: it.str, x: t[4] - x0, y: y1 - t[5], w: it.width, size, rot, url: null });
      }
      // 표 테두리 선: 칸이 나뉜 줄이 있는 쪽만 읽는다(그림이 큰 쪽에서 느리므로)
      let rules = null;
      if (m.OPS && toLines(items.filter((i) => !i.rot)).some((l) => l.cells.length >= 2)) {
        try { rules = ruleSegments(await page.getOperatorList(), m.OPS, page.view); } catch { /* 선 없이 계속 */ }
      }
      let links = [];
      try {
        links = (await page.getAnnotations()).filter((a) => a.subtype === 'Link' && a.url && a.rect)
          .map((a) => ({ url: a.url, l: a.rect[0] - x0, r: a.rect[2] - x0, t: y1 - a.rect[3], b: y1 - a.rect[1] }));
      } catch { /* 링크를 못 읽어도 글은 살린다 */ }
      pages.push({ n, w: x1 - x0, h: y1 - y0, items, links, rules });
      page.cleanup();
      onProgress && onProgress(n / doc.numPages);
      if (n % 8 === 0) await new Promise((r) => setTimeout(r));
    }
  } finally {
    task.destroy();
  }
  return pages;
}

// 그리기 명령에서 가로·세로 선(가는 사각형 포함)만 모은다. 좌표는 쪽 왼쪽 위 기준.
function ruleSegments(ol, OPS, view) {
  const [vx0, , , vy1] = view;
  const H = [], V = [];
  const paint = new Set([OPS.stroke, OPS.closeStroke, OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const pt = (x, y) => [ctm[0] * x + ctm[2] * y + ctm[4] - vx0, vy1 - (ctm[1] * x + ctm[3] * y + ctm[5])];
  const seg = (a, b) => {
    const dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]);
    if (dy < 1.5 && dx >= 3) H.push({ y: (a[1] + b[1]) / 2, a: Math.min(a[0], b[0]), b: Math.max(a[0], b[0]) });
    else if (dx < 1.5 && dy >= 3) V.push({ x: (a[0] + b[0]) / 2, a: Math.min(a[1], b[1]), b: Math.max(a[1], b[1]) });
  };
  const { fnArray: fn, argsArray: args } = ol;
  for (let i = 0; i < fn.length; i++) {
    const f = fn[i];
    if (f === OPS.save) stack.push(ctm);
    else if (f === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (f === OPS.transform) ctm = mul(ctm, args[i]);
    else if (f === OPS.constructPath && paint.has(fn[i + 1])) {
      const [ops, c] = args[i];
      let j = 0, cur = null, start = null;
      for (const op of ops) {
        if (op === OPS.moveTo) { cur = start = pt(c[j], c[j + 1]); j += 2; }
        else if (op === OPS.lineTo) { const p = pt(c[j], c[j + 1]); j += 2; if (cur) seg(cur, p); cur = p; }
        else if (op === OPS.rectangle) {
          const [x, y, w, h] = c.slice(j, j + 4); j += 4;
          const p = [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)];
          const bw = Math.abs(p[0][0] - p[2][0]), bh = Math.abs(p[0][1] - p[2][1]);
          if (bh < 2.5 && bw >= 3) seg([p[0][0], (p[0][1] + p[2][1]) / 2], [p[2][0], (p[0][1] + p[2][1]) / 2]);
          else if (bw < 2.5 && bh >= 3) seg([(p[0][0] + p[2][0]) / 2, p[0][1]], [(p[0][0] + p[2][0]) / 2, p[2][1]]);
          else for (let k = 0; k < 4; k++) seg(p[k], p[(k + 1) % 4]);
          cur = start = p[0];
        } else if (op === OPS.curveTo) { cur = pt(c[j + 4], c[j + 5]); j += 6; }
        else if (op === OPS.curveTo2 || op === OPS.curveTo3) { cur = pt(c[j + 2], c[j + 3]); j += 4; }
        else if (op === OPS.closePath) { if (cur && start) seg(cur, start); cur = start; }
      }
    }
  }
  return H.length && V.length ? { H, V } : null;
}

// 서로 닿는 선끼리 묶어, 가로선 2개·세로선(바깥 포함) 3개 이상이면 칸이 그려진 표로 본다
function ruledGrids(rules) {
  if (!rules) return [];
  const segs = [...rules.H.map((s) => ({ ...s, h: 1 })), ...rules.V.map((s) => ({ ...s, h: 0 }))];
  if (segs.length > 4000) return [];
  const par = segs.map((_, k) => k);
  const find = (k) => { while (par[k] !== k) k = par[k] = par[par[k]]; return k; };
  const T = 2;
  for (let a = 0; a < segs.length; a++) for (let b = a + 1; b < segs.length; b++) {
    const A = segs[a], B = segs[b];
    let touch;
    if (A.h && B.h) touch = Math.abs(A.y - B.y) < T && A.a <= B.b + T && B.a <= A.b + T;
    else if (!A.h && !B.h) touch = Math.abs(A.x - B.x) < T && A.a <= B.b + T && B.a <= A.b + T;
    else { const h = A.h ? A : B, v = A.h ? B : A; touch = v.x >= h.a - T && v.x <= h.b + T && h.y >= v.a - T && h.y <= v.b + T; }
    if (touch) par[find(a)] = find(b);
  }
  const comps = new Map();
  segs.forEach((s, k) => { const r = find(k); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(s); });
  const uniq = (vals) => { const out = []; for (const v of vals.sort((p, q) => p - q)) if (!out.length || v - out[out.length - 1] > 3) out.push(v); return out; };
  const grids = [];
  for (const c of comps.values()) {
    const hs = c.filter((s) => s.h), vs = c.filter((s) => !s.h);
    if (hs.length < 2 || !vs.length) continue;
    const L = Math.min(...hs.map((s) => s.a)), R = Math.max(...hs.map((s) => s.b));
    const top = Math.min(...vs.map((s) => s.a), ...hs.map((s) => s.y)), bot = Math.max(...vs.map((s) => s.b), ...hs.map((s) => s.y));
    const xs = uniq([L, R, ...vs.map((s) => s.x)]), ys = uniq([top, bot, ...hs.map((s) => s.y)]);
    if (xs.length < 3 || ys.length < 3 || R - L < 30) continue;
    grids.push({ L, R, top, bot, xs, ys });
  }
  return grids;
}

// 칸이 그려진 표 → 마크다운 표 줄(가짜 줄 하나). 칸 안 글은 위에서 아래로 잇는다.
function gridTable(g, items) {
  const nr = g.ys.length - 1, nc = g.xs.length - 1;
  const cell = Array.from({ length: nr }, () => Array.from({ length: nc }, () => []));
  for (const it of items) {
    const cy = it.y - it.size * 0.35, x = it.x + Math.min(it.w, it.size) * 0.5;
    let r = 0, c = 0;
    while (r < nr - 1 && cy > g.ys[r + 1]) r++;
    while (c < nc - 1 && x > g.xs[c + 1]) c++;
    cell[r][c].push(it);
  }
  const cellText = (lns) => lns.reduce((acc, ln) => (acc ? joinText(acc, ln.text) : ln.text), '').replace(/\|/g, '\\|');
  const grid = [];
  for (const row of cell) {
    const lines = row.map((its) => (its.length ? toLines(its) : []));
    // 선 하나 안에 여러 행이 들어 있는 표(가로선을 머리글 아래에만 그은 표): 두 칸 이상이 같은 높이에 여러 줄이면 줄마다 행으로 나눈다
    const ref = lines.reduce((a, b) => (b.length > a.length ? b : a), []);
    const multi = lines.filter((l) => l.length >= 2).length;
    const aligned = ref.length >= 2 && multi >= 2 && lines.every((l) => l.every((ln) => ref.some((r) => Math.abs(r.base - ln.base) < r.size * 0.3)));
    if (aligned) {
      for (const r of ref) grid.push(lines.map((l) => cellText(l.filter((ln) => Math.abs(r.base - ln.base) < r.size * 0.3))));
    } else grid.push(lines.map(cellText));
  }
  for (let k = grid.length - 1; k >= 0; k--) if (!grid[k].some((t) => t)) grid.splice(k, 1);
  const used = grid[0] ? grid[0].map((_, k) => grid.some((row) => row[k])) : [];
  const rows = grid.map((row) => row.filter((_, k) => used[k]));
  if (rows.length < 2 || used.filter(Boolean).length < 2) return null;
  return { table: true, rows, top: g.top, base: g.top + 0.01, size: 0, x0: g.L, x1: g.R, cells: [], items: [], bottom: g.bot };
}

const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const round = (v) => Math.round(v * 2) / 2;

// 한 쪽의 글자 조각 → 줄들(읽는 순서대로). 두 단 문서면 왼쪽 단을 다 읽고 오른쪽 단을 읽는다.
function pageLines(pg) {
  let items = pg.items.filter((i) => !i.rot);
  for (const it of items) {
    it.url = null;
    const cx = it.x + it.w / 2, cy = it.y - it.size * 0.35;
    for (const L of pg.links) if (cx >= L.l - 1 && cx <= L.r + 1 && cy >= L.t - 2 && cy <= L.b + 2) { it.url = L.url; break; }
  }
  const tables = [];
  for (const g of ruledGrids(pg.rules)) {
    const inside = (it) => { const cx = it.x + it.w / 2, cy = it.y - it.size * 0.35; return cx > g.L && cx < g.R && cy > g.top && cy < g.bot; };
    const mine = items.filter(inside);
    const t = mine.length && gridTable(g, mine);
    if (t) { tables.push(t); items = items.filter((it) => !inside(it)); }
  }
  const gutter = findGutter(items, pg.w);
  const groups = gutter == null ? { all: items } : { full: [], left: [], right: [] };
  if (gutter != null) for (const it of items) (it.x < gutter && it.x + it.w > gutter ? groups.full : it.x + it.w <= gutter ? groups.left : groups.right).push(it);
  const lines = {};
  for (const k in groups) lines[k] = toLines(groups[k]);
  for (const t of tables) {
    const k = gutter == null ? 'all' : t.x1 <= gutter ? 'left' : t.x0 >= gutter ? 'right' : 'full';
    const arr = lines[k];
    let at = arr.findIndex((l) => l.base > t.top);
    if (at < 0) at = arr.length;
    arr.splice(at, 0, t);
  }
  if (gutter == null) return lines.all;
  // 가로로 걸친 줄(제목·초록·그림 설명)을 경계로 구간을 나누고, 구간마다 왼쪽 → 오른쪽 단 순서
  const out = [];
  const full = lines.full;
  let from = -Infinity;
  for (let i = 0; i <= full.length; i++) {
    const to = i < full.length ? full[i].top : Infinity;
    for (const side of ['left', 'right']) for (const ln of lines[side]) if (ln.top >= from && ln.top < to) { ln.col = side; out.push(ln); }
    if (i < full.length) { full[i].col = 'full'; out.push(full[i]); from = full[i].top; }
  }
  return out;
}

// 쪽 가운데(35~65%)에 글자가 거의 안 걸치는 세로 띠가 있고 양쪽에 글이 충분하면 두 단
function findGutter(items, W) {
  if (items.length < 30) return null;
  const lo = Math.floor(W * 0.35), hi = Math.ceil(W * 0.65);
  const cover = new Int32Array(hi - lo + 1);
  for (const it of items) {
    if (it.w > W * 0.5) continue;
    const a = Math.max(lo, Math.floor(it.x)), b = Math.min(hi, Math.ceil(it.x + it.w));
    for (let x = a; x <= b; x++) cover[x - lo]++;
  }
  let best = -1, bestLen = 0;
  for (let x = 0; x < cover.length;) {
    if (cover[x] <= items.length * 0.01) { let e = x; while (e < cover.length && cover[e] <= items.length * 0.01) e++; if (e - x > bestLen) { bestLen = e - x; best = x + ((e - x) >> 1); } x = e; } else x++;
  }
  if (best < 0 || bestLen < 6) return null;
  const g = lo + best;
  let left = 0, right = 0, cross = 0;
  for (const it of items) { if (it.x + it.w <= g) left += it.str.length; else if (it.x >= g) right += it.str.length; else cross += it.str.length; }
  const total = left + right + cross;
  return left > total * 0.2 && right > total * 0.2 && cross < total * 0.35 ? g : null;
}

function toLines(items) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    let ln = null;
    for (let k = lines.length - 1; k >= 0 && k >= lines.length - 3; k--) {
      const L = lines[k];
      if (Math.abs(L.base - it.y) < Math.min(L.size, it.size) * 0.45) { ln = L; break; }
    }
    if (!ln) { ln = { base: it.y, size: it.size, items: [] }; lines.push(ln); }
    ln.items.push(it);
    if (it.size > ln.size && it.str.trim().length > 1) ln.size = it.size;
  }
  // 위·아래 첨자(작은 글자가 살짝 위·아래에 있는 줄)는 따로 줄을 만들지 않고 옆 큰 글자 줄에 붙인다: 10^20, Vaswani∗
  const big = (ln) => Math.max(...ln.items.map((i) => i.size));
  for (let k = 0; k < lines.length; k++) {
    const L = lines[k], ls = big(L);
    const lx0 = Math.min(...L.items.map((i) => i.x)), lx1 = Math.max(...L.items.map((i) => i.x + i.w));
    let best = null;
    for (let q = Math.max(0, k - 3); q < Math.min(lines.length, k + 4); q++) {
      const C = lines[q];
      if (C === L || !C.items.length) continue;
      const cs = big(C);
      if (ls > cs * 0.85 || Math.abs(L.base - C.base) > cs * 0.6) continue;
      const cx0 = Math.min(...C.items.map((i) => i.x)), cx1 = Math.max(...C.items.map((i) => i.x + i.w));
      if (lx1 < cx0 - cs || lx0 > cx1 + cs) continue;
      if (!best || Math.abs(L.base - C.base) < Math.abs(L.base - best.base)) best = C;
    }
    if (best) {
      for (const it of L.items) if (it.y < best.base - big(best) * 0.25 && /^[0-9a-z()+\-−]+$/i.test(it.str.trim())) it.sup = true;
      best.items.push(...L.items);
      L.items = [];
    }
  }
  for (const ln of lines) if (ln.items.length) finishLine(ln);
  return lines.filter((l) => l.items.length && l.text);
}

// 줄 안의 조각을 이어 붙인다. 간격이 넓으면 띄어 쓰고, 아주 넓으면 표의 칸으로 나눈다.
function finishLine(ln) {
  const its = ln.items.sort((a, b) => a.x - b.x);
  // 글자 크기: 글자 수로 가장 많이 쓴 크기(각주 번호 같은 작은 글자에 끌려가지 않게)
  const w = new Map();
  for (const it of its) { const s = round(it.size); w.set(s, (w.get(s) || 0) + it.str.length); }
  ln.size = [...w].sort((a, b) => b[1] - a[1])[0][0];
  const cells = [];
  let cur = null, prev = null;
  for (const it of its) {
    const gap = prev ? it.x - (prev.x + prev.w) : 0;
    if (!cur || gap > Math.max(ln.size * 1.6, 9)) { cur = { parts: [], x0: it.x, x1: it.x + it.w }; cells.push(cur); }
    else if (gap > ln.size * 0.18 && !/\s$/.test(prev.str) && !/^\s/.test(it.str)) cur.parts.push({ str: ' ', url: null });
    cur.parts.push({ str: it.sup && prev && !/\s$/.test(prev.str) && gap < ln.size * 0.18 ? '^' + it.str : it.str, url: it.url });
    cur.x1 = Math.max(cur.x1, it.x + it.w);
    prev = it;
  }
  for (const c of cells) c.text = joinParts(c.parts);
  ln.cells = cells;
  for (const c of cells) c.text = c.text.replace(/(?:\s?\.){4,}/g, ' …').replace(/(?:\s?_){4,}/g, ' ___').trim();
  ln.text = cells.map((c) => c.text).join(' ').replace(/\s+/g, ' ').trim();
  ln.x0 = its[0].x; ln.x1 = Math.max(...its.map((i) => i.x + i.w));
  ln.top = ln.base - ln.size;
}

function joinParts(parts) {
  // PDF.js는 링크 글 사이 띄어쓰기를 따로 주고 그 조각엔 링크 영역이 안 걸린다 → 양쪽이 같은 링크면 띄어쓰기도 그 링크에 넣는다
  for (let k = 1; k < parts.length - 1; k++) {
    if (parts[k].url || parts[k].str.trim()) continue;
    let a = k - 1, b = k + 1;
    while (b < parts.length - 1 && !parts[b].str.trim()) b++;
    if (parts[a].url && parts[a].url === parts[b].url) for (let j = k; j < b; j++) parts[j].url = parts[a].url;
  }
  let out = '', i = 0;
  while (i < parts.length) {
    const url = parts[i].url;
    let s = '';
    while (i < parts.length && parts[i].url === url) s += parts[i++].str;
    if (url && s.trim()) {
      const t = s.trim();
      const same = t.replace(/^https?:\/\//, '').replace(/\/$/, '') === url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      out += (s.match(/^\s*/)[0]) + (same ? url : `[${t}](${url})`) + (s.match(/\s*$/)[0]);
    } else out += s;
  }
  return out.replace(/\s+/g, ' ').trim();
}

// 여러 쪽에 같은 자리·같은 글로 되풀이되는 머리말·꼬리말과 쪽 번호
function repeatedKeys(pages) {
  const key = (t) => t.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
  const count = new Map();
  for (const pg of pages) {
    const seen = new Set();
    for (const ln of pg.lines) if (!ln.table && (ln.top < pg.h * 0.1 || ln.top > pg.h * 0.88)) seen.add(key(ln.text));
    for (const k of seen) count.set(k, (count.get(k) || 0) + 1);
  }
  const min = Math.max(3, Math.ceil(pages.length * 0.5));
  return { key, rep: new Set([...count].filter(([, c]) => pages.length >= 3 && c >= min).map(([k]) => k)) };
}

export function buildMarkdown(pages, { pageMarks = true, dropRepeats = true } = {}) {
  for (const pg of pages) pg.lines = pageLines(pg);
  let removed = 0;
  if (dropRepeats) {
    const { key, rep } = repeatedKeys(pages);
    for (const pg of pages) {
      const keep = pg.lines.filter((ln) => {
        const edge = !ln.table && (ln.top < pg.h * 0.1 || ln.top > pg.h * 0.88);
        const drop = edge && (rep.has(key(ln.text)) || PAGE_NO.test(ln.text));
        if (drop) removed++;
        return !drop;
      });
      if (keep.length || !pg.lines.length) pg.lines = keep; else removed -= pg.lines.length; // 쪽에 그것밖에 없으면 머리말이 아니라 본문
    }
  }
  // 본문 글자 크기 = 글자 수로 가장 많은 크기. 그보다 12% 이상 크면 제목 후보
  const bySize = new Map();
  for (const pg of pages) for (const ln of pg.lines) if (!ln.table) bySize.set(ln.size, (bySize.get(ln.size) || 0) + ln.text.length);
  const body = [...bySize].sort((a, b) => b[1] - a[1])[0]?.[0] || 10;
  const perPage = new Map();
  for (const pg of pages) { const c = new Map(); for (const ln of pg.lines) if (!ln.table) c.set(ln.size, (c.get(ln.size) || 0) + 1); for (const [k, v] of c) perPage.set(k, Math.max(perPage.get(k) || 0, v)); }
  const bigger = [...bySize.keys()].filter((s) => s >= body * 1.12 && perPage.get(s) <= 6).sort((a, b) => b - a);
  const level = (s) => { const i = bigger.indexOf(s); return i < 0 ? 0 : Math.min(i + 1, 4); };
  // 제목 크기인데 글이 아주 많으면(본문 일부를 크게 쓴 것) 제목으로 치지 않는다
  const out = [];
  const empty = [];
  let tables = 0, headings = 0;
  for (const pg of pages) {
    if (!pg.lines.length) {
      empty.push(pg.n);
      out.push({ t: 'mark', text: `<!-- page ${pg.n}: no text layer (scanned or image only) -->` });
      continue;
    }
    if (pageMarks && pages.length > 1) out.push({ t: 'mark', text: `<!-- page ${pg.n} -->` });
    const blocks = pageBlocks(pg, body, level);
    for (const b of blocks) { if (b.t === 'table') tables++; if (b.t === 'h') headings++; out.push(b); }
  }
  // 쪽을 넘어 이어지는 문단은 붙인다(쪽 표시는 그 사이에 남기지 않고 문단 뒤로)
  const md = [];
  for (let i = 0; i < out.length; i++) {
    const b = out[i];
    if (b.t === 'p' && b.cont && md.length) {
      // 바로 앞 문단(쪽 표시 건너뛰고)에 잇는다
      let j = md.length - 1, marks = [];
      while (j >= 0 && md[j].t === 'mark') marks.unshift(md[j--]);
      if (j >= 0 && md[j].t === 'p' && !(md[j].done && md[j].room > b.firstW + 5) && md[j].wide && md[j].lastBase > md[j].pageH * 0.7) { md[j].text = joinText(md[j].text, b.text); md[j].done = b.done; md.length = j + 1; md.push(...marks); continue; }
    }
    // 쪽 끝 표가 다음 쪽 맨 위 표로 이어지면(칸 수 같음) 한 표로 잇는다
    if (b.t === 'table' && b.first && md.length) {
      let j = md.length - 1, marks = [];
      while (j >= 0 && md[j].t === 'mark') marks.unshift(md[j--]);
      if (j >= 0 && md[j].t === 'table' && md[j].rows[0].length === b.rows[0].length) {
        const head = b.rows[0].join('|') === md[j].rows[0].join('|') ? b.rows.slice(1) : b.rows; // 머리글을 쪽마다 되풀이한 표
        md[j].rows.push(...head); md.length = j + 1; md.push(...marks); continue;
      }
    }
    md.push(b);
  }
  let text = '';
  md.forEach((b, i) => { if (i) text += b.t === 'li' && md[i - 1].t === 'li' ? '\n' : '\n\n'; text += render(b); });
  text = text.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return { text, pages: pages.length, empty, removed, tables, headings, chars: text.length };
}

function render(b) {
  if (b.t === 'h') return '#'.repeat(b.level) + ' ' + b.text;
  if (b.t === 'li') return (b.num ? b.num + '. ' : '- ') + b.text;
  if (b.t === 'table') return [b.rows[0], b.rows[0].map(() => '---'), ...b.rows.slice(1)].map((r) => '| ' + r.join(' | ') + ' |').join('\n');
  if (b.t === 'p') return b.text.replace(/^([#>])/, '\\$1').replace(/^(\d+)\. /, '$1\\. ');
  return b.text;
}

function joinText(a, b) {
  if (/[A-Za-z]-$/.test(a) && /^[a-z]/.test(b)) return a + b; // 줄 끝 하이픈: 'English-to'처럼 원래 하이픈일 수도 있어 지우지 않고 붙인다
  if (CJK_NOSPACE.test(a.slice(-1)) && CJK_NOSPACE.test(b[0]) && !HANGUL.test(a.slice(-1))) return a + b;
  return a + ' ' + b;
}

function pageBlocks(pg, body, level) {
  const lines = pg.lines;
  // 단(또는 쪽) 오른쪽 끝: 줄이 여기보다 많이 짧게 끝나면 문단이 끝난 것
  const right = {}, left = {};
  for (const ln of lines) { if (ln.table) continue; const c = ln.col || 'all'; right[c] = Math.max(right[c] || 0, ln.x1); left[c] = Math.min(left[c] ?? Infinity, ln.x0); }
  const pitches = [];
  for (let i = 1; i < lines.length; i++) if (lines[i].col === lines[i - 1].col && lines[i].size && lines[i].size === lines[i - 1].size) { const d = lines[i].base - lines[i - 1].base; if (d > 0) pitches.push(d / lines[i].size); }
  const pitch = median(pitches) || 1.25;
  const blocks = [];
  let cur = null;
  const flush = () => { if (cur) { blocks.push(cur); cur = null; } };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i], prev = lines[i - 1];
    if (ln.table) { flush(); blocks.push({ t: 'table', rows: ln.rows, first: !blocks.length }); continue; }
    // 표: 칸이 2개 이상인 줄이 2줄 넘게 이어지고 칸 시작 위치가 맞으면
    const tbl = tableAt(lines, i);
    if (tbl) { flush(); blocks.push({ t: 'table', rows: tbl.rows, first: !blocks.length }); i = tbl.end - 1; continue; }
    const lv = ln.text.length <= 140 ? level(ln.size) : 0;
    const c = ln.col || 'all';
    const colW = Math.max(right[c] - left[c], c === 'all' ? pg.w * 0.6 : pg.w * 0.3);
    const gap = prev && prev.col === ln.col ? (ln.base - prev.base) / ln.size : 99;
    if (lv) {
      if (cur && cur.t === 'h' && cur.level === lv && gap < pitch * 1.8) { cur.text += ' ' + ln.text; continue; }
      flush(); cur = { t: 'h', level: lv, text: ln.text }; continue;
    }
    let text = ln.text, li = null;
    const firstStr = ln.items[0].str.trim();
    if (BULLET.test(text) || (DASH_BULLET.test(text) && firstStr.length <= 2)) { li = { num: null }; text = text.replace(BULLET, '').replace(DASH_BULLET, ''); }
    else { const m = text.match(NUMBERED); if (m && ln.x0 < left[c] + colW * 0.15) { li = { num: m[1] }; text = text.slice(m[0].length); } }
    if (li) { flush(); cur = { t: 'li', num: li.num, text, x0: ln.x0, textX: ln.x0 + ln.size * 1.2 }; markEnd(cur, ln, right[c], colW); continue; }
    if (cur && (cur.t === 'p' || cur.t === 'li') && !(cur.done && cur.room > firstWordW(ln) + ln.size * 0.5) && ln.size === cur.size0 && gap < pitch * 1.45 &&
        !(cur.t === 'p' && ln.x0 > cur.lastX0 + ln.size * 1.2) &&
        !(cur.t === 'li' && ln.x0 < cur.x0 - 1)) {
      cur.text = joinText(cur.text, text); cur.lastX0 = ln.x0; markEnd(cur, ln, right[c], colW); continue;
    }
    flush();
    cur = { t: 'p', text, size0: ln.size, lastX0: ln.x0, cont: i === 0 && ln.x0 <= left[c] + ln.size * 0.6, firstW: firstWordW(ln) };
    markEnd(cur, ln, right[c], colW);
  }
  flush();
  for (const b of blocks) b.pageH = pg.h;
  return blocks;
}

function firstWordW(ln) {
  // 글자 폭을 대강 나눠(한글·한자 1, 띄어쓰기 0.3, 나머지 0.55) 첫 낱말이 조각 폭에서 차지하는 몫
  const cw = (t) => [...t].reduce((a, ch) => a + (/\s/.test(ch) ? 0.3 : HANGUL.test(ch) || CJK_NOSPACE.test(ch) ? 1 : 0.55), 0);
  const it = ln.items[0], w = (it.str.trimStart().match(/^\S+/) || [''])[0];
  return it.w * (cw(w) / Math.max(0.1, cw(it.str)));
}

// 줄이 단 오른쪽 끝보다 꽤 짧게 끝나면(마침표 등으로) 문단이 끝났다고 본다
function markEnd(cur, ln, right, colW) {
  cur.size0 ??= ln.size;
  cur.lastX0 ??= ln.x0;
  cur.done = ln.x1 < right - colW * 0.12;
  cur.room = right - ln.x1; // 줄 끝에 남은 자리: 다음 줄 첫 낱말이 여기 들어갈 수 있었는데 줄이 바뀌었으면 문단이 끝난 것
  cur.wide = ln.x1 - ln.x0 > colW * 0.6; // 다음 쪽으로 이어 붙이는 건 마지막 줄이 단 너비를 거의 채우고 쪽 아래쪽에 있을 때만
  cur.lastBase = ln.base;
}

// 선 없는 표: 칸(넓은 간격으로 나뉜 조각)이 2개 이상인 줄에서 시작해, 아래 줄들까지 모든 줄이 비워 둔 세로 틈(칸 경계)이
// 남아 있는 동안 표로 본다. 칸 경계는 글자가 하나도 걸치지 않는 세로 띠라서 가운데 맞춤 머리글·좁은 칸 간격도 잡힌다.
// 칸 안에서 줄이 바뀐 글(아주 촘촘한 줄 간격, 또는 첫 칸이 빈 줄)은 같은 행으로 합친다.
function riversOf(region) {
  let lo = Infinity, hi = -Infinity;
  for (const l of region) { lo = Math.min(lo, l.x0); hi = Math.max(hi, l.x1); }
  const n = Math.ceil(hi - lo) + 1;
  const cov = new Uint8Array(n);
  for (const l of region) for (const it of l.items) cov.fill(1, Math.max(0, Math.round(it.x - lo)), Math.min(n, Math.round(it.x + it.w - lo)));
  const minW = Math.max(3, region[0].size * 0.4), out = [];
  for (let x = 0; x < n;) {
    if (cov[x]) { x++; continue; }
    let e = x;
    while (e < n && !cov[e]) e++;
    if (e - x >= minW) out.push(lo + (x + e) / 2);
    x = e;
  }
  return out;
}

function itemsText(its, size) {
  const parts = [];
  let prev = null;
  for (const it of [...its].sort((a, b) => a.x - b.x)) {
    const gap = prev ? it.x - (prev.x + prev.w) : 0;
    if (prev && gap > size * 0.18 && !/\s$/.test(prev.str) && !/^\s/.test(it.str)) parts.push({ str: ' ', url: null });
    parts.push({ str: it.sup && prev && gap <= size * 0.18 ? '^' + it.str : it.str, url: it.url });
    prev = it;
  }
  return joinParts(parts).replace(/(?:\s?\.){4,}/g, ' …').replace(/(?:\s?_){4,}/g, ' ___').trim();
}

function tableAt(lines, i) {
  const first = lines[i];
  if (!first || first.table || first.cells.length < 2) return null;
  const sz = first.size;
  const region = [first];
  let rivers = riversOf(region);
  if (!rivers.length) return null;
  for (let k = i + 1; k < lines.length; k++) {
    const L = lines[k], P = lines[k - 1];
    if (L.table || L.col !== first.col || Math.abs(L.size - sz) > sz * 0.2) break;
    const gap = (L.base - P.base) / L.size;
    if (gap <= 0 || gap > 3.2) break;
    const r = riversOf([...region, L]);
    if (!r.length || (region.length >= 2 && r.length < rivers.length)) break; // 칸 경계가 줄면 다른 표·글이 시작된 것
    region.push(L); rivers = r;
  }
  const colOf = (it) => { const cx = it.x + it.w / 2; let c = 0; while (c < rivers.length && cx > rivers[c]) c++; return c; };
  const split = region.map((l) => { const cols = rivers.map(() => []); cols.push([]); for (const it of l.items) cols[colOf(it)].push(it); return cols; });
  // 칸이 2개 이상 찬 줄이 2줄은 있어야 표
  if (split.filter((cols) => cols.filter((a) => a.length).length >= 2).length < 2) return null;
  // 뒤쪽에 첫 칸만 찬 줄이 붙었으면(표 아래 짧은 글) 떼어 낸다
  while (split.length > 2 && split[split.length - 1].filter((a) => a.length).length === 1 && split[split.length - 1][0].length) { split.pop(); region.pop(); }
  const gaps = region.map((l, k) => (k ? (l.base - region[k - 1].base) / l.size : 0));
  const inner = gaps.slice(1);
  const gmin = Math.min(...inner), bimodal = inner.some((g) => g > gmin * 1.4);
  const rows = [];
  split.forEach((cols, k) => {
    const cont = k > 0 && (gaps[k] < 1.0 || (bimodal && gaps[k] < gmin * 1.25 && !cols[0].length));
    const texts = cols.map((its) => (its.length ? itemsText(its, region[k].size) : ''));
    if (cont && rows.length) { const row = rows[rows.length - 1]; texts.forEach((t, c) => { if (t) row[c] = row[c] ? joinText(row[c], t) : t; }); }
    else rows.push(texts);
  });
  if (rows.length < 2) return null;
  const used = rows[0].map((_, c) => rows.some((r) => r[c]));
  const grid = rows.map((r) => r.filter((_, c) => used[c]).map((t) => t.replace(/\|/g, '\\|')));
  if (grid[0].length < 2) return null;
  return { rows: grid, end: i + region.length };
}

export async function toMarkdown(file, opts = {}, onProgress, signal) {
  const m = await import('/assets/vendor/pdf.min.mjs');
  m.GlobalWorkerOptions.workerSrc = '/assets/vendor/pdf.worker.min.mjs';
  let pages;
  try {
    pages = await extractPages(m, new Uint8Array(await file.arrayBuffer()), { cMapUrl: '/assets/vendor/cmaps/', standardFontDataUrl: '/assets/vendor/standard_fonts/', onProgress: (p) => onProgress && onProgress(p * 0.9), signal });
  } catch (e) {
    if (e && e.name === 'PasswordException') throw Object.assign(new Error('encrypted'), { code: 'encrypted' });
    if (e && e.name === 'AbortError') throw e;
    throw Object.assign(new Error(e && e.message), { code: 'pdf' });
  }
  const res = buildMarkdown(pages, opts);
  onProgress && onProgress(1);
  return res;
}
