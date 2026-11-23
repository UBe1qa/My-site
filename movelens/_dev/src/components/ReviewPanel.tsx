import React, { useEffect, useRef } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  CornerUpLeft,
  ExternalLink,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import type {
  GameSummary,
  Locale,
  MoveAnalysis,
  MoveClassification,
  ParsedGame,
  PositionEval,
} from '../types/chess';
import { CLASSIFICATION_META, formatScore } from '../lib/eval';
import { classificationComment, classificationLabel, t } from '../i18n';
import { EvalChart } from './EvalChart';

interface ReviewPanelProps {
  locale: Locale;
  game: ParsedGame | null;
  currentPly: number;
  positionEvals: Record<number, PositionEval>;
  moveAnalyses: Record<number, MoveAnalysis>;
  summary: GameSummary | null;
  analyzing: boolean;
  progress: { current: number; total: number };
  analysisDepth: number;
  engineStatus: 'loading' | 'ready' | 'error';
  isVariation: boolean;
  liveEval: PositionEval | null;
  onStartAnalyze: () => void;
  onStopAnalyze: () => void;
  onSelectPly: (ply: number) => void;
  onPreviewBestMove: (uci: string) => void;
  onPlayEngineMove: (uci: string) => void;
  onExitVariation: () => void;
}

const STAT_ORDER: MoveClassification[] = [
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
];

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  locale,
  game,
  currentPly,
  positionEvals,
  moveAnalyses,
  summary,
  analyzing,
  progress,
  analysisDepth,
  engineStatus,
  isVariation,
  liveEval,
  onStartAnalyze,
  onStopAnalyze,
  onSelectPly,
  onPreviewBestMove,
  onPlayEngineMove,
  onExitVariation,
}) => {
  const activeMoveRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isVariation && activeMoveRef.current) {
      activeMoveRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [currentPly, isVariation]);

  if (!game) {
    return (
      <div className="review-panel">
        <div className="empty-state">
          <p className="empty-title">{t(locale, 'noGamesYet')}</p>
          <p className="empty-desc">{t(locale, 'noGamesHint')}</p>
        </div>
      </div>
    );
  }

  const currentNode = game.plies[currentPly];
  const currentAnalysis = currentPly > 0 ? moveAnalyses[currentPly] : undefined;
  const hasAnalysis = summary !== null && summary.analyzedPlies > 0;
  const isComplete =
    summary !== null && summary.totalPlies > 0 && summary.analyzedPlies >= summary.totalPlies;

  // Group plies into full move rows: [moveNumber, whiteNode?, blackNode?]
  const moveRows: Array<{
    moveNumber: number;
    white?: (typeof game.plies)[number];
    black?: (typeof game.plies)[number];
  }> = [];
  for (let i = 1; i < game.plies.length; i++) {
    const node = game.plies[i];
    if (node.color === 'w') {
      moveRows.push({ moveNumber: node.moveNumber, white: node });
    } else {
      const last = moveRows[moveRows.length - 1];
      if (last && !last.black && last.moveNumber === node.moveNumber) {
        last.black = node;
      } else {
        moveRows.push({ moveNumber: node.moveNumber, black: node });
      }
    }
  }

  const progressPct =
    progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0;

  return (
    <div className="review-panel">
      {/* Top Analysis Action Bar */}
      <div className="review-header">
        <div className="review-status-row">
          <div className="engine-pill">
            <Cpu size={13} />
            <span>
              {engineStatus === 'error'
                ? t(locale, 'errEngine')
                : engineStatus === 'loading'
                ? t(locale, 'engineLoading')
                : analyzing
                ? t(locale, 'analyzingProgress', {
                    current: progress.current,
                    total: progress.total,
                    depth: analysisDepth,
                  })
                : isComplete
                ? t(locale, 'analysisComplete', { depth: analysisDepth })
                : t(locale, 'engineReady')}
            </span>
          </div>

          <div className="review-header-actions">
            {game.url && (
              <a
                href={game.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost-sm"
                title={t(locale, 'openOnChessCom')}
              >
                <ExternalLink size={13} />
              </a>
            )}
            {analyzing ? (
              <button type="button" className="btn btn-danger-sm" onClick={onStopAnalyze}>
                <Square size={12} />
                <span>{t(locale, 'stopReview')}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary-sm"
                onClick={onStartAnalyze}
                disabled={engineStatus === 'error'}
              >
                {hasAnalysis ? <RotateCcw size={13} /> : <Play size={13} />}
                <span>{hasAnalysis ? t(locale, 'reAnalyze') : t(locale, 'startReview')}</span>
              </button>
            )}
          </div>
        </div>

        {analyzing && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      {/* Eval Chart */}
      <EvalChart
        plies={game.plies}
        positionEvals={positionEvals}
        moveAnalyses={moveAnalyses}
        currentPly={currentPly}
        onSelectPly={onSelectPly}
      />

      {/* Current Move Coach / Variation Live Engine */}
      {isVariation ? (
        <div className="coach-box is-variation">
          <div className="coach-box-top">
            <span className="variation-badge">{t(locale, 'variationMode')}</span>
            <button type="button" className="btn-ghost-sm" onClick={onExitVariation}>
              <CornerUpLeft size={13} />
              <span>{t(locale, 'backToGame')}</span>
            </button>
          </div>
          <p className="coach-desc">{t(locale, 'variationHint')}</p>
          {liveEval && liveEval.lines && liveEval.lines.length > 0 && (
            <div className="engine-lines">
              <div className="engine-lines-head">
                <span>{t(locale, 'liveEngine')}</span>
                <span className="tabular">
                  {t(locale, 'liveDepth', { depth: liveEval.depth })}
                </span>
              </div>
              {liveEval.lines.slice(0, 2).map((ln) => (
                <button
                  key={ln.multipv}
                  type="button"
                  className="engine-line-row"
                  onClick={() => ln.pv[0] && onPlayEngineMove(ln.pv[0])}
                >
                  <span className="engine-line-score tabular">{formatScore(ln.score)}</span>
                  <span className="engine-line-pv truncate">{ln.pvSan.join(' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="coach-box">
          {currentPly === 0 ? (
            <div className="coach-box-top">
              <span className="coach-move-title">{t(locale, 'startPosition')}</span>
              {game.opening && <span className="coach-opening truncate">{game.opening}</span>}
            </div>
          ) : currentAnalysis ? (
            <>
              <div className="coach-box-top">
                <div className="coach-move-head">
                  <span
                    className="cls-pill"
                    style={{
                      color: CLASSIFICATION_META[currentAnalysis.classification].color,
                      backgroundColor: CLASSIFICATION_META[currentAnalysis.classification].bg,
                    }}
                  >
                    {CLASSIFICATION_META[currentAnalysis.classification].symbol}{' '}
                    {classificationLabel(locale, currentAnalysis.classification)}
                  </span>
                  <span className="coach-move-title">
                    {currentNode.color === 'w'
                      ? `${currentNode.moveNumber}. ${currentNode.san}`
                      : `${currentNode.moveNumber}... ${currentNode.san}`}
                  </span>
                </div>
                <span className="eval-shift tabular">
                  {formatScore(currentAnalysis.evalBefore.score)}
                  <ArrowRight size={11} />
                  {formatScore(currentAnalysis.evalAfter.score)}
                </span>
              </div>

              <p className="coach-desc">
                {classificationComment(locale, currentAnalysis.classification)}
              </p>

              {currentAnalysis.bestMoveUci &&
                currentAnalysis.bestMoveSan &&
                currentAnalysis.classification !== 'best' &&
                currentAnalysis.classification !== 'book' && (
                  <div className="best-move-row">
                    <span>
                      {t(locale, 'bestMoveWas')}:{' '}
                      <strong>{currentAnalysis.bestMoveSan}</strong>
                    </span>
                    <button
                      type="button"
                      className="btn-ghost-sm"
                      onClick={() => onPreviewBestMove(currentAnalysis.bestMoveUci!)}
                    >
                      {t(locale, 'playBestLine')}
                    </button>
                  </div>
                )}
            </>
          ) : (
            <div className="coach-box-top">
              <span className="coach-move-title">
                {currentNode.color === 'w'
                  ? `${currentNode.moveNumber}. ${currentNode.san}`
                  : `${currentNode.moveNumber}... ${currentNode.san}`}
              </span>
              {liveEval && (
                <span className="eval-shift tabular">
                  {formatScore(liveEval.score)} (d{liveEval.depth})
                </span>
              )}
            </div>
          )}

          {!isVariation && liveEval && liveEval.lines && liveEval.lines.length > 0 && !analyzing && (
            <div className="engine-lines compact">
              {liveEval.lines.slice(0, 2).map((ln) => (
                <button
                  key={ln.multipv}
                  type="button"
                  className="engine-line-row"
                  onClick={() => ln.pv[0] && onPlayEngineMove(ln.pv[0])}
                >
                  <span className="engine-line-score tabular">{formatScore(ln.score)}</span>
                  <span className="engine-line-pv truncate">{ln.pvSan.join(' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Accuracy & Classification Summary */}
      {hasAnalysis && summary && (
        <div className="summary-section">
          <div className="accuracy-row">
            <div className="acc-side">
              <span className="acc-label truncate">{game.white}</span>
              <span className="acc-value is-white tabular">{summary.white.accuracy.toFixed(1)}%</span>
            </div>
            <span className="acc-center-label">{t(locale, 'accuracy')}</span>
            <div className="acc-side is-right">
              <span className="acc-label truncate">{game.black}</span>
              <span className="acc-value is-black tabular">{summary.black.accuracy.toFixed(1)}%</span>
            </div>
          </div>

          <div className="stats-table">
            {STAT_ORDER.map((cls) => {
              const wCount = summary.white.counts[cls];
              const bCount = summary.black.counts[cls];
              const meta = CLASSIFICATION_META[cls];
              return (
                <div key={cls} className="stats-row">
                  <span className="stats-num tabular">{wCount}</span>
                  <span className="stats-label">
                    <span className="stats-dot" style={{ backgroundColor: meta.color }} />
                    {classificationLabel(locale, cls)}
                  </span>
                  <span className="stats-num is-right tabular">{bCount}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Move List Table */}
      <div className="move-list-wrap">
        <div className="move-list">
          {moveRows.map((row) => (
            <div key={row.moveNumber} className="move-pair-row">
              <span className="move-num tabular">{row.moveNumber}.</span>

              {row.white ? (
                <MoveCell
                  node={row.white}
                  analysis={moveAnalyses[row.white.ply]}
                  active={!isVariation && currentPly === row.white.ply}
                  activeRef={activeMoveRef}
                  onSelect={() => onSelectPly(row.white!.ply)}
                />
              ) : (
                <span className="move-cell-empty" />
              )}

              {row.black ? (
                <MoveCell
                  node={row.black}
                  analysis={moveAnalyses[row.black.ply]}
                  active={!isVariation && currentPly === row.black.ply}
                  activeRef={activeMoveRef}
                  onSelect={() => onSelectPly(row.black!.ply)}
                />
              ) : (
                <span className="move-cell-empty" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface MoveCellProps {
  node: ParsedGame['plies'][number];
  analysis?: MoveAnalysis;
  active: boolean;
  activeRef: React.MutableRefObject<HTMLButtonElement | null>;
  onSelect: () => void;
}

const MoveCell: React.FC<MoveCellProps> = ({ node, analysis, active, activeRef, onSelect }) => {
  const cls = analysis?.classification;
  const meta = cls ? CLASSIFICATION_META[cls] : null;
  const showGlyph =
    cls === 'blunder' || cls === 'mistake' || cls === 'inaccuracy' || cls === 'best' || cls === 'book';

  return (
    <button
      ref={active ? activeRef : undefined}
      type="button"
      className={`move-cell ${active ? 'is-active' : ''}`}
      onClick={onSelect}
    >
      <span className="move-san">
        {node.san}
        {showGlyph && meta && (
          <span className="move-glyph" style={{ color: meta.color }}>
            {meta.symbol}
          </span>
        )}
      </span>
      {node.clock && <span className="move-clock tabular">{node.clock}</span>}
    </button>
  );
};
