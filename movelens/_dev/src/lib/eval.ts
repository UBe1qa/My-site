import { Chess } from 'chess.js';
import type {
  EngineScore,
  GameSummary,
  MoveAnalysis,
  MoveClassification,
  PlyNode,
  PositionEval,
  SideSummary,
} from '../types/chess';

/**
 * Convert White-perspective engine score into White's winning probability (0..100).
 * Uses the Lichess calibrated sigmoid formula.
 */
export function scoreToWhiteWinPct(score: EngineScore): number {
  if (score.mate !== null) {
    if (score.mate > 0) return 100;
    if (score.mate < 0) return 0;
    return 50;
  }
  const cp = score.cp ?? 0;
  const clamped = Math.max(-1500, Math.min(1500, cp));
  const win = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
  return Math.max(0, Math.min(100, win));
}

export function scoreToMoverWinPct(score: EngineScore, moverColor: 'w' | 'b'): number {
  const whiteWin = scoreToWhiteWinPct(score);
  return moverColor === 'w' ? whiteWin : 100 - whiteWin;
}

/**
 * Normalize raw score into a bounded value for the vertical EvalBar (0..100, 50 = equal).
 */
export function scoreToBarPercent(score: EngineScore | null | undefined): number {
  if (!score) return 50;
  if (score.mate !== null) {
    return score.mate > 0 ? 97 : 3;
  }
  const winPct = scoreToWhiteWinPct(score);
  return Math.max(4, Math.min(96, winPct));
}

/**
 * Human-readable evaluation string from White's perspective (e.g. "+1.4", "-0.8", "M3").
 */
export function formatScore(score: EngineScore | null | undefined): string {
  if (!score) return '0.0';
  if (score.mate !== null) {
    const sign = score.mate > 0 ? '' : '-';
    return `${sign}M${Math.abs(score.mate)}`;
  }
  const cp = score.cp ?? 0;
  if (Math.abs(cp) < 5) return '0.0';
  const roundedTenths = Math.round(Math.abs(cp) / 10) / 10;
  const sign = cp > 0 ? '+' : '-';
  return `${sign}${roundedTenths.toFixed(1)}`;
}

/**
 * Convert Win% loss (0..100) into move accuracy (0..100).
 */
export function winLossToAccuracy(winLoss: number): number {
  const loss = Math.max(0, winLoss);
  const raw = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
  return Math.max(0, Math.min(100, raw));
}

/**
 * Classify a move given pre-move eval, post-move eval, played UCI, and ply index.
 */
export function classifyMove(params: {
  ply: number;
  moverColor: 'w' | 'b';
  playedUci: string;
  evalBefore: PositionEval;
  evalAfter: PositionEval;
  isCheckmateAfter: boolean;
}): MoveAnalysis {
  const { ply, moverColor, playedUci, evalBefore, evalAfter, isCheckmateAfter } = params;

  const winPctBefore = scoreToMoverWinPct(evalBefore.score, moverColor);
  const winPctAfter = isCheckmateAfter
    ? 100
    : scoreToMoverWinPct(evalAfter.score, moverColor);

  const isTopMove =
    evalBefore.bestMove !== null &&
    evalBefore.bestMove.toLowerCase() === playedUci.toLowerCase();

  const winLoss = isTopMove ? 0 : Math.max(0, winPctBefore - winPctAfter);
  const accuracy = winLossToAccuracy(winLoss);

  let classification: MoveClassification;
  if (ply <= 6 && winLoss <= 2.5) {
    classification = 'book';
  } else if (isTopMove || isCheckmateAfter || winLoss <= 1.2) {
    classification = 'best';
  } else if (winLoss <= 3.5) {
    classification = 'excellent';
  } else if (winLoss <= 6.5) {
    classification = 'good';
  } else if (winLoss <= 12) {
    classification = 'inaccuracy';
  } else if (winLoss <= 22) {
    classification = 'mistake';
  } else {
    classification = 'blunder';
  }

  return {
    ply,
    evalBefore,
    evalAfter,
    winPctBefore,
    winPctAfter,
    winLoss,
    accuracy,
    classification,
    bestMoveUci: evalBefore.bestMove,
    bestMoveSan: evalBefore.bestMoveSan,
  };
}

export function emptyCounts(): Record<MoveClassification, number> {
  return {
    book: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
}

/**
 * Summarize game accuracy and move classification counts for both sides.
 */
export function computeGameSummary(
  plies: PlyNode[],
  analyses: Record<number, MoveAnalysis>
): GameSummary {
  const whiteAccs: number[] = [];
  const blackAccs: number[] = [];
  const whiteCounts = emptyCounts();
  const blackCounts = emptyCounts();

  let analyzedPlies = 0;

  for (const node of plies) {
    if (node.ply === 0 || !node.color) continue;
    const analysis = analyses[node.ply];
    if (!analysis) continue;
    analyzedPlies++;

    if (node.color === 'w') {
      whiteAccs.push(analysis.accuracy);
      whiteCounts[analysis.classification]++;
    } else {
      blackAccs.push(analysis.accuracy);
      blackCounts[analysis.classification]++;
    }
  }

  const avg = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return Math.round((sum / arr.length) * 10) / 10;
  };

  const white: SideSummary = { accuracy: avg(whiteAccs), counts: whiteCounts };
  const black: SideSummary = { accuracy: avg(blackAccs), counts: blackCounts };

  return {
    white,
    black,
    analyzedPlies,
    totalPlies: Math.max(0, plies.length - 1),
  };
}

/**
 * Convert UCI move list from a starting FEN into SAN moves (best effort).
 */
export function uciListToSan(fen: string, uciMoves: string[], maxMoves = 6): string[] {
  try {
    const chess = new Chess(fen);
    const result: string[] = [];
    for (let i = 0; i < Math.min(uciMoves.length, maxMoves); i++) {
      const uci = uciMoves[i];
      if (!uci || uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length >= 5 ? uci[4] : undefined;
      const move = chess.move({ from, to, promotion });
      if (!move) break;
      result.push(move.san);
    }
    return result;
  } catch {
    return [];
  }
}

export function uciToSan(fen: string, uci: string | null): string | null {
  if (!uci) return null;
  const list = uciListToSan(fen, [uci], 1);
  return list[0] ?? null;
}

/**
 * Convert a single engine score reported from side-to-move's perspective into White's perspective.
 */
export function normalizeScoreToWhite(
  rawScore: EngineScore,
  sideToMove: 'w' | 'b'
): EngineScore {
  if (sideToMove === 'w') return rawScore;
  return {
    cp: rawScore.cp !== null ? -rawScore.cp : null,
    mate: rawScore.mate !== null ? -rawScore.mate : null,
  };
}

export const CLASSIFICATION_META: Record<
  MoveClassification,
  { symbol: string; color: string; bg: string }
> = {
  book: { symbol: 'B', color: '#C9A87C', bg: 'rgba(201, 168, 124, 0.16)' },
  best: { symbol: '★', color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.16)' },
  excellent: { symbol: '!', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.16)' },
  good: { symbol: '✓', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.14)' },
  inaccuracy: { symbol: '?!', color: '#FACC15', bg: 'rgba(250, 204, 21, 0.16)' },
  mistake: { symbol: '?', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.18)' },
  blunder: { symbol: '??', color: '#F87171', bg: 'rgba(248, 113, 113, 0.2)' },
};
