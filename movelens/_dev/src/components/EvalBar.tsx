import React from 'react';
import type { EngineScore } from '../types/chess';
import { formatScore, scoreToBarPercent } from '../lib/eval';

interface EvalBarProps {
  score: EngineScore | null | undefined;
  orientation: 'w' | 'b';
}

export const EvalBar: React.FC<EvalBarProps> = ({ score, orientation }) => {
  const whitePct = scoreToBarPercent(score);
  const label = formatScore(score);

  const whiteAdvantage =
    score?.mate !== null && score?.mate !== undefined
      ? score.mate > 0
      : (score?.cp ?? 0) >= 0;

  // When white is at bottom (orientation === 'w'), white bar grows from bottom.
  // When black is at bottom (orientation === 'b'), white bar grows from top.
  const whiteStyle: React.CSSProperties =
    orientation === 'w'
      ? { height: `${whitePct}%`, bottom: 0 }
      : { height: `${whitePct}%`, top: 0 };

  const labelAtBottom =
    (orientation === 'w' && whiteAdvantage) || (orientation === 'b' && !whiteAdvantage);

  return (
    <div className="eval-bar" aria-label={`Evaluation ${label}`}>
      <div className="eval-bar-white" style={whiteStyle} />
      <span
        className={`eval-bar-label ${labelAtBottom ? 'at-bottom' : 'at-top'} ${
          whiteAdvantage ? 'on-white' : 'on-black'
        }`}
      >
        {label}
      </span>
    </div>
  );
};
