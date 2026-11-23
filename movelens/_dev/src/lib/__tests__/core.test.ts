import { describe, expect, it } from 'vitest';
import {
  classifyMove,
  computeGameSummary,
  formatScore,
  normalizeScoreToWhite,
  scoreToWhiteWinPct,
  uciListToSan,
  winLossToAccuracy,
} from '../eval';
import { formatClock, parsePgnToGame, SAMPLE_OPERA_PGN } from '../pgn';
import { buildShareUrl, compactPgnForShare, parseShareUrl } from '../share';
import { decodeSettings, addRecentUser } from '../settings';
import { parseUciInfoLine } from '../stockfish';

describe('eval math and move classification', () => {
  it('converts centipawns and mates to White win percentage', () => {
    expect(scoreToWhiteWinPct({ cp: 0, mate: null })).toBeCloseTo(50, 2);
    expect(scoreToWhiteWinPct({ cp: 300, mate: null })).toBeGreaterThan(70);
    expect(scoreToWhiteWinPct({ cp: -300, mate: null })).toBeLessThan(30);
    expect(scoreToWhiteWinPct({ cp: null, mate: 3 })).toBe(100);
    expect(scoreToWhiteWinPct({ cp: null, mate: -2 })).toBe(0);
  });

  it('formats centipawn and mate scores cleanly', () => {
    expect(formatScore({ cp: 0, mate: null })).toBe('0.0');
    expect(formatScore({ cp: 145, mate: null })).toBe('+1.5');
    expect(formatScore({ cp: -230, mate: null })).toBe('-2.3');
    expect(formatScore({ cp: null, mate: 4 })).toBe('M4');
    expect(formatScore({ cp: null, mate: -1 })).toBe('-M1');
  });

  it('classifies top move as best and massive drop as blunder', () => {
    const evalBefore = {
      depth: 14,
      score: { cp: 120, mate: null },
      bestMove: 'e2e4',
      bestMoveSan: 'e4',
      pv: ['e2e4'],
      pvSan: ['e4'],
    };
    const bestRes = classifyMove({
      ply: 12,
      moverColor: 'w',
      playedUci: 'e2e4',
      evalBefore,
      evalAfter: evalBefore,
      isCheckmateAfter: false,
    });
    expect(bestRes.classification).toBe('best');
    expect(bestRes.winLoss).toBe(0);

    const blunderRes = classifyMove({
      ply: 12,
      moverColor: 'w',
      playedUci: 'a2a3',
      evalBefore,
      evalAfter: {
        ...evalBefore,
        score: { cp: -450, mate: null },
      },
      isCheckmateAfter: false,
    });
    expect(blunderRes.classification).toBe('blunder');
    expect(blunderRes.winLoss).toBeGreaterThan(22);
    expect(winLossToAccuracy(blunderRes.winLoss)).toBeLessThan(35);
  });

  it('normalizes black-to-move engine score to white perspective', () => {
    expect(normalizeScoreToWhite({ cp: 150, mate: null }, 'b')).toEqual({
      cp: -150,
      mate: null,
    });
    expect(normalizeScoreToWhite({ cp: null, mate: 2 }, 'b')).toEqual({
      cp: null,
      mate: -2,
    });
  });

  it('parses UCI info lines accurately', () => {
    const line =
      'info depth 14 seldepth 21 multipv 1 score cp 85 nodes 12000 pv e7e5 g1f3 b8c6';
    const parsed = parseUciInfoLine(line, 'b');
    expect(parsed).not.toBeNull();
    expect(parsed?.depth).toBe(14);
    expect(parsed?.score).toEqual({ cp: -85, mate: null });
    expect(parsed?.pv).toEqual(['e7e5', 'g1f3', 'b8c6']);
  });

  it('converts UCI sequence to SAN', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(uciListToSan(startFen, ['e2e4', 'e7e5', 'g1f3'])).toEqual(['e4', 'e5', 'Nf3']);
  });
});

describe('PGN parser', () => {
  it('parses the Opera Game with all plies and checkmate flag', () => {
    const game = parsePgnToGame(SAMPLE_OPERA_PGN, { source: 'sample' });
    expect(game.white).toBe('Paul Morphy');
    expect(game.result).toBe('1-0');
    expect(game.plies.length).toBe(34); // ply 0 + 33 half-moves
    expect(game.plies[33].san).toBe('Rd8#');
    expect(game.plies[33].isCheckmate).toBe(true);

    const summary = computeGameSummary(game.plies, {});
    expect(summary.totalPlies).toBe(33);
    expect(summary.analyzedPlies).toBe(0);
  });

  it('formats Chess.com clock annotations', () => {
    expect(formatClock('0:04:58.2')).toBe('4:58');
    expect(formatClock('0:00:08.4')).toBe('0:08.4');
    expect(formatClock('1:05:03')).toBe('1:05:03');
  });
});

describe('share links and settings', () => {
  it('encodes and decodes user + game share URLs', () => {
    const url = buildShareUrl('https://movelens.example/', {
      user: 'Hikaru',
      gameId: '123456789',
    });
    expect(url).toBe('https://movelens.example/?user=Hikaru&game=123456789');
    expect(parseShareUrl(url!)).toEqual({ user: 'Hikaru', gameId: '123456789', pgn: undefined });
  });

  it('encodes and decodes compact PGN share URLs', () => {
    const url = buildShareUrl('https://movelens.example/', { pgn: SAMPLE_OPERA_PGN });
    expect(url).not.toBeNull();
    const parsed = parseShareUrl(url!);
    expect(parsed.pgn).toContain('Paul Morphy');
    expect(parsed.pgn).toContain('17. Rd8#');
  });

  it('strips bulky clock comments when compacting PGN', () => {
    const pgnWithClk = '[White "A"]\n[Black "B"]\n\n1. e4 {[%clk 0:09:59]} e5 {[%clk 0:09:58]}';
    const compact = compactPgnForShare(pgnWithClk);
    expect(compact).not.toContain('%clk');
    expect(compact).toContain('1. e4 e5');
  });

  it('safely decodes partial or corrupted settings without crashing', () => {
    const decoded = decodeSettings({ locale: 'invalid', analysisDepth: 999, boardTheme: 'slate' });
    expect(decoded.locale).toBe('ko');
    expect(decoded.analysisDepth).toBe(20);
    expect(decoded.boardTheme).toBe('slate');
    expect(addRecentUser(['Alice', 'Bob'], 'alice')).toEqual(['alice', 'Bob']);
  });
});
