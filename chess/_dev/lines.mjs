// build.py 도우미: SAN 수순 묶음을 받아 둬 보고(규칙은 사이트와 같은 assets/chess.min.js), 수마다 UCI·EPD를 돌려준다.
// 쓰는 법: echo '["e4 e5 Nf3", ...]' | node chess/_dev/lines.mjs  → [{ok, err, san, uci, epd, mate, check}, ...]
// EPD = FEN 앞 네 칸(앙파상 칸은 실제로 잡을 수 있을 때만 적힌다. python-chess와 같다)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(here, '..', 'assets', 'chess.min.js'), 'utf8'));
const Chess = globalThis.Chess;
const epd = (fen) => fen.split(' ').slice(0, 4).join(' ');

const lines = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = lines.map((line) => {
  const ch = new Chess();
  const r = { ok: true, err: null, san: [], uci: [], epd: [], mate: false, check: false };
  const toks = line.trim() ? line.trim().split(/\s+/) : [];
  for (const t of toks) {
    let m = null;
    try { m = ch.move(t); } catch (e) { m = null; }
    if (!m) { r.ok = false; r.err = `${t} (수 ${r.san.length + 1})`; break; }
    r.san.push(m.san);
    r.uci.push(m.from + m.to + (m.promotion || ''));
    r.epd.push(epd(ch.fen()));
  }
  r.mate = ch.isCheckmate();
  r.check = ch.inCheck();
  r.fen = ch.fen();
  return r;
});
process.stdout.write(JSON.stringify(out));
