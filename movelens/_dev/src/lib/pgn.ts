import { Chess } from 'chess.js';
import type { ParsedGame, PlyNode } from '../types/chess';

export const SAMPLE_OPERA_PGN = `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.11.02"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[ECO "C41"]
[Opening "Philidor Defense"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8
13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

/**
 * Extract clock strings like `[%clk 0:04:58.2]` aligned to each ply (1-indexed).
 */
function extractClocksFromPgn(pgn: string): Map<number, string> {
  const clocks = new Map<number, string>();
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
    const comments = chess.getComments();
    // Map FEN -> clock string
    const fenToClock = new Map<string, string>();
    for (const item of comments) {
      const m = item.comment.match(/\[%clk\s+([^\]]+)\]/);
      if (m) {
        fenToClock.set(item.fen, formatClock(m[1].trim()));
      }
    }
    const replay = new Chess();
    const history = chess.history({ verbose: true });
    history.forEach((mv, idx) => {
      replay.move(mv);
      const clk = fenToClock.get(replay.fen());
      if (clk) clocks.set(idx + 1, clk);
    });
  } catch {
    // ignore clock parsing errors
  }
  return clocks;
}

export function formatClock(raw: string): string {
  // Turn "0:04:58.2" into "4:58" or "0:09.5"
  const parts = raw.split(':');
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const secNum = parseFloat(parts[2]);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(Math.floor(secNum)).padStart(2, '0')}`;
    }
    if (m === 0 && secNum < 20) {
      return `0:${secNum.toFixed(1).padStart(4, '0')}`;
    }
    return `${m}:${String(Math.floor(secNum)).padStart(2, '0')}`;
  }
  return raw;
}

export function extractOpeningName(headers: Record<string, string>): string | undefined {
  if (headers.Opening) return headers.Opening;
  if (headers.ECOUrl) {
    const slug = headers.ECOUrl.split('/').pop() ?? '';
    const cleaned = slug
      .replace(/-\d+\..*$/, '')
      .replace(/-/g, ' ')
      .trim();
    if (cleaned) return cleaned;
  }
  if (headers.ECO) return headers.ECO;
  return undefined;
}

export function parsePgnToGame(
  pgn: string,
  meta?: Partial<Pick<ParsedGame, 'id' | 'source' | 'url' | 'timeClass'>>
): ParsedGame {
  const trimmed = pgn.trim();
  if (!trimmed) {
    throw new Error('EMPTY_PGN');
  }

  const chess = new Chess();
  chess.loadPgn(trimmed);

  const history = chess.history({ verbose: true });
  if (history.length === 0) {
    throw new Error('NO_MOVES');
  }

  const rawHeaders = chess.header();
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawHeaders)) {
    if (typeof v === 'string') headers[k] = v;
  }

  const clocks = extractClocksFromPgn(trimmed);

  const startFen = headers.FEN;
  const replay = startFen ? new Chess(startFen) : new Chess();

  const plies: PlyNode[] = [
    {
      ply: 0,
      fen: replay.fen(),
      san: null,
      uci: null,
      from: null,
      to: null,
      color: null,
      moveNumber: 0,
      clock: null,
      inCheck: replay.inCheck(),
      isCheckmate: replay.isCheckmate(),
      isDraw: replay.isDraw(),
    },
  ];

  history.forEach((mv, idx) => {
    const ply = idx + 1;
    const executed = replay.move({
      from: mv.from,
      to: mv.to,
      promotion: mv.promotion,
    });
    const uci = `${executed.from}${executed.to}${executed.promotion ?? ''}`;
    plies.push({
      ply,
      fen: replay.fen(),
      san: executed.san,
      uci,
      from: executed.from,
      to: executed.to,
      color: executed.color,
      moveNumber: Math.ceil(ply / 2),
      clock: clocks.get(ply) ?? null,
      inCheck: replay.inCheck(),
      isCheckmate: replay.isCheckmate(),
      isDraw: replay.isDraw(),
    });
  });

  const whiteRating = headers.WhiteElo ? parseInt(headers.WhiteElo, 10) : undefined;
  const blackRating = headers.BlackElo ? parseInt(headers.BlackElo, 10) : undefined;

  return {
    id: meta?.id ?? `pgn-${Date.now()}`,
    source: meta?.source ?? 'pgn',
    url: meta?.url ?? headers.Link,
    pgn: trimmed,
    white: headers.White || 'White',
    black: headers.Black || 'Black',
    whiteRating: Number.isFinite(whiteRating) ? whiteRating : undefined,
    blackRating: Number.isFinite(blackRating) ? blackRating : undefined,
    result: headers.Result || '*',
    date: (headers.UTCDate || headers.Date || '').replace(/\./g, '-'),
    timeControl: headers.TimeControl,
    timeClass: meta?.timeClass,
    opening: extractOpeningName(headers),
    termination: headers.Termination,
    plies,
  };
}
