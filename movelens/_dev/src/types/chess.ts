export type Locale = 'ko' | 'en';

export type BoardThemeId = 'walnut' | 'slate' | 'sage';

export type MoveClassification =
  | 'book'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface EngineScore {
  /** Centipawns from White's perspective */
  cp: number | null;
  /** Mate in N moves from White's perspective (+N = White mates, -N = Black mates) */
  mate: number | null;
}

export interface EngineLine {
  multipv: number;
  depth: number;
  score: EngineScore;
  /** UCI move sequence, e.g. ["e2e4", "e7e5"] */
  pv: string[];
  /** SAN converted moves for display */
  pvSan: string[];
}

export interface PositionEval {
  depth: number;
  score: EngineScore;
  bestMove: string | null; // UCI e.g. "e2e4"
  bestMoveSan: string | null;
  pv: string[];
  pvSan: string[];
  lines?: EngineLine[];
}

export interface PlyNode {
  ply: number; // 0 = initial position, 1 = after white's 1st move, ...
  fen: string;
  san: string | null;
  uci: string | null;
  from: string | null;
  to: string | null;
  color: 'w' | 'b' | null; // color that made this move
  moveNumber: number;
  clock: string | null;
  inCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
}

export interface MoveAnalysis {
  ply: number;
  evalBefore: PositionEval;
  evalAfter: PositionEval;
  winPctBefore: number; // mover's perspective 0..100
  winPctAfter: number; // mover's perspective 0..100
  winLoss: number; // >= 0
  accuracy: number; // 0..100
  classification: MoveClassification;
  bestMoveUci: string | null;
  bestMoveSan: string | null;
}

export interface SideSummary {
  accuracy: number;
  counts: Record<MoveClassification, number>;
}

export interface GameSummary {
  white: SideSummary;
  black: SideSummary;
  analyzedPlies: number;
  totalPlies: number;
}

export interface ParsedGame {
  id: string;
  source: 'chesscom' | 'pgn' | 'sample';
  url?: string;
  pgn: string;
  white: string;
  black: string;
  whiteRating?: number;
  blackRating?: number;
  result: string; // "1-0" | "0-1" | "1/2-1/2" | "*"
  date: string;
  timeControl?: string;
  timeClass?: string;
  opening?: string;
  termination?: string;
  plies: PlyNode[];
}

export interface ChessComGameItem {
  id: string;
  url: string;
  pgn: string;
  timeControl: string;
  timeClass: string;
  endTime: number;
  rated: boolean;
  white: {
    username: string;
    rating: number;
    result: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
  };
  opening: string;
}

export interface AppSettings {
  locale: Locale;
  boardTheme: BoardThemeId;
  analysisDepth: number;
  showBestArrow: boolean;
  showPlayedArrow: boolean;
  autoAnalyze: boolean;
  recentUsers: string[];
  lastUsername: string;
}
