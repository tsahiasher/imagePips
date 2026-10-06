import React from 'react';
import { PIP_PATTERNS } from '../../domain/domino';

interface PipPatternProps {
  value: number; // 0 to 6
  width: number;
  height: number;
  pipRadius?: number;
  pipColor?: string;
}

export const PipPattern: React.FC<PipPatternProps> = ({
  value,
  width,
  height,
  pipRadius = Math.min(width, height) * 0.1,
  pipColor = '#1e293b'
}) => {
  const points = PIP_PATTERNS[Math.max(0, Math.min(6, value))] ?? [];

  return (
    <g className="pip-pattern" aria-label={`Pips count: ${value}`}>
      {points.map((pt, idx) => (
        <circle
          key={idx}
          cx={pt.x * width}
          cy={pt.y * height}
          r={pipRadius}
          fill={pipColor}
          stroke="#0f172a"
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
};
