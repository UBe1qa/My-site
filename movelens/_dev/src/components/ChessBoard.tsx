import React, { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import type { BoardThemeId, MoveClassification } from '../types/chess';
import { CLASSIFICATION_META } from '../lib/eval';
import { ChessPiece, type PieceCode } from './ChessPieces';

export interface BoardArrow {
  from: string;
  to: string;
  color: string;
  opacity?: number;
}

interface ChessBoardProps {
  fen: string;
  orientation: 'w' | 'b';
  theme: BoardThemeId;
  lastMove?: { from: string; to: string } | null;
  arrows?: BoardArrow[];
  moveBadge?: { square: string; classification: MoveClassification } | null;
  onUserMove?: (from: string, to: string, promotion?: string) => boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

const BOARD_THEMES: Record<
  BoardThemeId,
  { light: string; dark: string; lightCoord: string; darkCoord: string; lastMove: string }
> = {
  walnut: {
    light: '#E7D8C3',
    dark: '#9C7351',
    lightCoord: '#8A6242',
    darkCoord: '#EFE2CE',
    lastMove: 'rgba(245, 197, 66, 0.42)',
  },
  slate: {
    light: '#D9E0E8',
    dark: '#63768D',
    lightCoord: '#526479',
    darkCoord: '#E8EEF4',
    lastMove: 'rgba(56, 189, 248, 0.36)',
  },
  sage: {
    light: '#E3E8DC',
    dark: '#6C8468',
    lightCoord: '#576C54',
    darkCoord: '#EDF2E7',
    lastMove: 'rgba(250, 204, 21, 0.38)',
  },
};

function squareToCoords(square: string, orientation: 'w' | 'b'): { x: number; y: number } | null {
  if (square.length < 2) return null;
  const fileIdx = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rankIdx = RANKS.indexOf(square[1] as (typeof RANKS)[number]);
  if (fileIdx === -1 || rankIdx === -1) return null;

  const col = orientation === 'w' ? fileIdx : 7 - fileIdx;
  const row = orientation === 'w' ? rankIdx : 7 - rankIdx;
  return { x: col + 0.5, y: row + 0.5 };
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  orientation,
  theme,
  lastMove,
  arrows = [],
  moveBadge,
  onUserMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<string | null>(null);

  const palette = BOARD_THEMES[theme];

  const { boardMap, legalTargets, checkedKingSquare, sideToMove } = useMemo(() => {
    const chess = new Chess();
    try {
      chess.load(fen);
    } catch {
      // fallback to startpos if invalid
    }

    const map = new Map<string, PieceCode>();
    let kingSq: string | null = null;
    const turn = chess.turn();
    const inCheck = chess.inCheck();

    const grid = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = grid[r][c];
        if (!cell) continue;
        const sq = `${FILES[c]}${RANKS[r]}`;
        const code = `${cell.color}${cell.type.toUpperCase()}` as PieceCode;
        map.set(sq, code);
        if (inCheck && cell.type === 'k' && cell.color === turn) {
          kingSq = sq;
        }
      }
    }

    const targets = new Set<string>();
    if (selectedSquare) {
      const moves = chess.moves({ square: selectedSquare as never, verbose: true });
      for (const m of moves) {
        targets.add(m.to);
      }
    }

    return {
      boardMap: map,
      legalTargets: targets,
      checkedKingSquare: kingSq,
      sideToMove: turn,
    };
  }, [fen, selectedSquare]);

  // Reset selection whenever FEN changes
  React.useEffect(() => {
    setSelectedSquare(null);
    setDragFrom(null);
  }, [fen]);

  const tryMove = (from: string, to: string): boolean => {
    if (!onUserMove || from === to) return false;
    const piece = boardMap.get(from);
    const isPawnPromo =
      piece &&
      piece[1] === 'P' &&
      ((piece[0] === 'w' && to[1] === '8') || (piece[0] === 'b' && to[1] === '1'));
    const ok = onUserMove(from, to, isPawnPromo ? 'q' : undefined);
    if (ok) {
      setSelectedSquare(null);
    }
    return ok;
  };

  const handleSquareClick = (sq: string) => {
    if (!onUserMove) return;

    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        return;
      }
      if (legalTargets.has(sq)) {
        tryMove(selectedSquare, sq);
        return;
      }
    }

    const piece = boardMap.get(sq);
    if (piece && piece[0] === sideToMove) {
      setSelectedSquare(sq);
    } else {
      setSelectedSquare(null);
    }
  };

  const displayRanks = orientation === 'w' ? RANKS : [...RANKS].reverse();
  const displayFiles = orientation === 'w' ? FILES : [...FILES].reverse();

  return (
    <div className="board-frame" role="region" aria-label="Chessboard">
      <div className="board-grid">
        {displayRanks.map((rank, rowIdx) =>
          displayFiles.map((file, colIdx) => {
            const sq = `${file}${rank}`;
            const fileOrig = FILES.indexOf(file);
            const rankOrig = RANKS.indexOf(rank);
            const isLight = (fileOrig + rankOrig) % 2 === 0;
            const piece = boardMap.get(sq);
            const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
            const isSelected = selectedSquare === sq;
            const isLegal = legalTargets.has(sq);
            const isChecked = checkedKingSquare === sq;
            const badge = moveBadge && moveBadge.square === sq ? moveBadge : null;

            return (
              <div
                key={sq}
                className={`board-square ${isSelected ? 'is-selected' : ''} ${
                  isChecked ? 'is-checked' : ''
                }`}
                style={{
                  backgroundColor: isLight ? palette.light : palette.dark,
                }}
                onClick={() => handleSquareClick(sq)}
                onDragOver={(e) => {
                  if (dragFrom) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom) {
                    tryMove(dragFrom, sq);
                    setDragFrom(null);
                  }
                }}
              >
                {isLast && (
                  <div
                    className="square-overlay"
                    style={{ backgroundColor: palette.lastMove }}
                  />
                )}

                {isLegal && (
                  <div
                    className={piece ? 'legal-capture-ring' : 'legal-move-dot'}
                  />
                )}

                {colIdx === 0 && (
                  <span
                    className="coord-rank"
                    style={{ color: isLight ? palette.lightCoord : palette.darkCoord }}
                  >
                    {rank}
                  </span>
                )}
                {rowIdx === 7 && (
                  <span
                    className="coord-file"
                    style={{ color: isLight ? palette.lightCoord : palette.darkCoord }}
                  >
                    {file}
                  </span>
                )}

                {piece && (
                  <div
                    className="piece-wrap"
                    draggable={Boolean(onUserMove && piece[0] === sideToMove)}
                    onDragStart={() => {
                      if (piece[0] === sideToMove) {
                        setDragFrom(sq);
                        setSelectedSquare(sq);
                      }
                    }}
                    onDragEnd={() => setDragFrom(null)}
                  >
                    <ChessPiece piece={piece} className="piece-svg" />
                  </div>
                )}

                {badge && (
                  <div
                    className="square-badge"
                    style={{
                      backgroundColor: CLASSIFICATION_META[badge.classification].color,
                    }}
                  >
                    {CLASSIFICATION_META[badge.classification].symbol}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {arrows.length > 0 && (
        <svg className="board-arrows-layer" viewBox="0 0 8 8" preserveAspectRatio="none">
          {arrows.map((arrow, idx) => {
            const p1 = squareToCoords(arrow.from, orientation);
            const p2 = squareToCoords(arrow.to, orientation);
            if (!p1 || !p2) return null;

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.01) return null;

            const ux = dx / dist;
            const uy = dy / dist;
            const headLen = 0.34;
            const headWidth = 0.25;
            const shaftWidth = 0.11;
            const startOffset = 0.18;
            const endOffset = 0.1;

            const sx = p1.x + ux * startOffset;
            const sy = p1.y + uy * startOffset;
            const tipX = p2.x - ux * endOffset;
            const tipY = p2.y - uy * endOffset;
            const baseX = tipX - ux * headLen;
            const baseY = tipY - uy * headLen;

            const px = -uy;
            const py = ux;

            const poly = [
              `${sx + px * (shaftWidth / 2)},${sy + py * (shaftWidth / 2)}`,
              `${baseX + px * (shaftWidth / 2)},${baseY + py * (shaftWidth / 2)}`,
              `${baseX + px * headWidth},${baseY + py * headWidth}`,
              `${tipX},${tipY}`,
              `${baseX - px * headWidth},${baseY - py * headWidth}`,
              `${baseX - px * (shaftWidth / 2)},${baseY - py * (shaftWidth / 2)}`,
              `${sx - px * (shaftWidth / 2)},${sy - py * (shaftWidth / 2)}`,
            ].join(' ');

            return (
              <polygon
                key={`${arrow.from}-${arrow.to}-${idx}`}
                points={poly}
                fill={arrow.color}
                fillOpacity={arrow.opacity ?? 0.84}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
};
