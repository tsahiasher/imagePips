import React from 'react';
import { Cell } from '../../domain/puzzle';

interface PuzzleCellProps {
  cell: Cell;
  x: number;
  y: number;
  size: number;
  regionColor?: string;
  isSelectedRegion?: boolean;
  hasActiveRegion?: boolean;
  isHighlighted?: boolean;
  highlightType?: 'legal' | 'illegal';
  onClick?: () => void;
}

export const PuzzleCell: React.FC<PuzzleCellProps> = ({
  x,
  y,
  size,
  regionColor,
  isSelectedRegion = false,
  hasActiveRegion = false,
  isHighlighted = false,
  highlightType = 'legal',
  onClick
}) => {
  const inset = 2;
  const cellWidth = size - inset * 2;
  const rx = Math.max(7, size * 0.14);

  const effectiveColor = regionColor || '#dfccc4';
  let fill = effectiveColor;
  let fillOpacity = 0.76;
  let stroke = effectiveColor;
  let strokeWidth = 1.5;

  if (hasActiveRegion) {
    if (isSelectedRegion) {
      fillOpacity = 0.95;
      stroke = '#0f172a';
      strokeWidth = 3;
    } else {
      fillOpacity = 0.28;
      stroke = regionColor ? `${regionColor}55` : 'rgba(0,0,0,0.06)';
      strokeWidth = 1;
    }
  }

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
    <g
      className={`puzzle-cell ${isSelectedRegion ? 'selected-region-cell' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Recessed inner shadow rim */}
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
      {/* Subtle inner recessed bevel to make empty cells feel like physical slots */}
      {!isSelectedRegion && !isHighlighted && (
        <rect
          x={x + inset + 1.2}
          y={y + inset + 1.2}
          width={Math.max(0, cellWidth - 2.4)}
          height={Math.max(0, cellWidth - 2.4)}
          rx={Math.max(2, rx - 1)}
          ry={Math.max(2, rx - 1)}
          fill="none"
          stroke="rgba(15, 23, 42, 0.08)"
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
      {isSelectedRegion && (
        <rect
          x={x + inset + 2}
          y={y + inset + 2}
          width={cellWidth - 4}
          height={cellWidth - 4}
          rx={rx - 1}
          ry={rx - 1}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          opacity={0.9}
        />
      )}
    </g>
  );
};
