import React from 'react';
import { Cell } from '../../domain/puzzle';

interface PuzzleCellProps {
  cell: Cell;
  x: number;
  y: number;
  size: number;
  regionColor?: string;
  isHighlighted?: boolean;
  highlightType?: 'legal' | 'illegal';
  onClick?: () => void;
}

export const PuzzleCell: React.FC<PuzzleCellProps> = ({
  x,
  y,
  size,
  regionColor,
  isHighlighted = false,
  highlightType = 'legal',
  onClick
}) => {
  const inset = 2;
  const cellWidth = size - inset * 2;
  const rx = 6;

  let fill = regionColor ? regionColor : 'rgba(255, 255, 255, 0.04)';
  let fillOpacity = regionColor ? 0.70 : 1;
  let stroke = regionColor ? regionColor : 'rgba(255, 255, 255, 0.12)';
  let strokeWidth = regionColor ? 1.5 : 1;

  if (isHighlighted) {
    if (highlightType === 'legal') {
      fill = 'rgba(16, 185, 129, 0.35)';
      stroke = '#10b981';
      strokeWidth = 2.5;
    } else {
      fill = 'rgba(239, 68, 68, 0.35)';
      stroke = '#ef4444';
      strokeWidth = 2.5;
    }
  }

  return (
    <g className="puzzle-cell" onClick={onClick}>
      <rect
        x={x + inset}
        y={y + inset}
        width={cellWidth}
        height={cellWidth}
        rx={rx}
        ry={rx}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </g>
  );
};
