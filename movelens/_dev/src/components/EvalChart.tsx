import React, { useMemo } from 'react';
import type { MoveAnalysis, PlyNode, PositionEval } from '../types/chess';
import { CLASSIFICATION_META, scoreToWhiteWinPct } from '../lib/eval';

interface EvalChartProps {
  plies: PlyNode[];
  positionEvals: Record<number, PositionEval>;
  moveAnalyses: Record<number, MoveAnalysis>;
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

export const EvalChart: React.FC<EvalChartProps> = ({
  plies,
  positionEvals,
  moveAnalyses,
  currentPly,
  onSelectPly,
}) => {
  const totalPlies = Math.max(1, plies.length - 1);
  const width = 320;
  const height = 76;

  const { areaPath, linePath, markers } = useMemo(() => {
    const pts: Array<{ x: number; y: number; ply: number }> = [];
    let lastY = height / 2;

    for (let i = 0; i < plies.length; i++) {
      const ply = plies[i].ply;
      const ev = positionEvals[ply];
      if (!ev) continue;
      const winPct = scoreToWhiteWinPct(ev.score);
      const x = (ply / totalPlies) * width;
      const y = height - (winPct / 100) * height;
      pts.push({ x, y, ply });
      lastY = y;
    }

    if (pts.length === 0) {
      return {
        areaPath: '',
        linePath: '',
        markers: [] as Array<{ x: number; y: number; color: string; ply: number }>,
      };
    }

    const line = pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    const lastPt = pts[pts.length - 1];
    const firstPt = pts[0];
    const area = `${line} L ${lastPt.x.toFixed(1)} ${height} L ${firstPt.x.toFixed(1)} ${height} Z`;

    const badMarkers: Array<{ x: number; y: number; color: string; ply: number }> = [];
    for (const p of pts) {
      const analysis = moveAnalyses[p.ply];
      if (
        analysis &&
        (analysis.classification === 'blunder' || analysis.classification === 'mistake')
      ) {
        badMarkers.push({
          x: p.x,
          y: p.y,
          color: CLASSIFICATION_META[analysis.classification].color,
          ply: p.ply,
        });
      }
    }

    void lastY;
    return { areaPath: area, linePath: line, markers: badMarkers };
  }, [plies, positionEvals, moveAnalyses, totalPlies]);

  const currentX = (currentPly / totalPlies) * width;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ply = Math.round(ratio * totalPlies);
    onSelectPly(ply);
  };

  return (
    <div className="eval-chart-wrap">
      <svg
        className="eval-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onClick={handleClick}
        role="slider"
        aria-label="Advantage graph"
        aria-valuemin={0}
        aria-valuemax={totalPlies}
        aria-valuenow={currentPly}
      >
        <rect x="0" y="0" width={width} height={height} fill="#161920" />
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(255,255,255,0.14)"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        {areaPath && <path d={areaPath} fill="#E7E4DC" fillOpacity="0.88" />}
        {linePath && <path d={linePath} fill="none" stroke="#94A3B8" strokeWidth="1.2" />}
        {markers.map((m) => (
          <circle
            key={m.ply}
            cx={m.x}
            cy={m.y}
            r="3"
            fill={m.color}
            stroke="#111317"
            strokeWidth="1"
          />
        ))}
        <line
          x1={currentX}
          y1="0"
          x2={currentX}
          y2={height}
          stroke="#3B82F6"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
};
