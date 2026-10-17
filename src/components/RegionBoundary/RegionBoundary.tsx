import React from 'react';
import { parseCellId, Region } from '../../domain/puzzle';

interface RegionBoundaryProps {
  region: Region;
  minRow: number;
  minCol: number;
  cellSize: number;
  padding: number;
  isSelected?: boolean;
}

export const RegionBoundary: React.FC<RegionBoundaryProps> = ({
  region,
  minRow,
  minCol,
  cellSize,
  padding,
  isSelected = false
}) => {
  // In Pips, dashed perimeter lines denote constraint/rule boundaries.
  // Regions without a rule (unconstrained / neutral cells) do not have dashed lines.
  if (!region.constraint) {
    return null;
  }

  const cellSet = new Set(region.cellIds);
  const inset = Math.max(3, Math.round(cellSize * 0.05));

  interface Segment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  const segments: Segment[] = [];

  for (const cellId of region.cellIds) {
    const { row, col } = parseCellId(cellId);
    const x = padding + (col - minCol) * cellSize;
    const y = padding + (row - minRow) * cellSize;

    const hasTop = cellSet.has(`${row - 1},${col}`);
    const hasBottom = cellSet.has(`${row + 1},${col}`);
    const hasLeft = cellSet.has(`${row},${col - 1}`);
    const hasRight = cellSet.has(`${row},${col + 1}`);
    const hasTopLeft = cellSet.has(`${row - 1},${col - 1}`);
    const hasTopRight = cellSet.has(`${row - 1},${col + 1}`);
    const hasBottomLeft = cellSet.has(`${row + 1},${col - 1}`);
    const hasBottomRight = cellSet.has(`${row + 1},${col + 1}`);

    // Top edge
    if (!hasTop) {
      const x1 = !hasLeft ? x + inset : hasTopLeft ? x - inset : x;
      const x2 = !hasRight ? x + cellSize - inset : hasTopRight ? x + cellSize + inset : x + cellSize;
      segments.push({ x1, y1: y + inset, x2, y2: y + inset });
    }
    // Bottom edge
    if (!hasBottom) {
      const x1 = !hasLeft ? x + inset : hasBottomLeft ? x - inset : x;
      const x2 = !hasRight ? x + cellSize - inset : hasBottomRight ? x + cellSize + inset : x + cellSize;
      segments.push({ x1, y1: y + cellSize - inset, x2, y2: y + cellSize - inset });
    }
    // Left edge
    if (!hasLeft) {
      const y1 = !hasTop ? y + inset : hasTopLeft ? y - inset : y;
      const y2 = !hasBottom ? y + cellSize - inset : hasBottomLeft ? y + cellSize + inset : y + cellSize;
      segments.push({ x1: x + inset, y1, x2: x + inset, y2 });
    }
    // Right edge
    if (!hasRight) {
      const y1 = !hasTop ? y + inset : hasTopRight ? y - inset : y;
      const y2 = !hasBottom ? y + cellSize - inset : hasBottomRight ? y + cellSize + inset : y + cellSize;
      segments.push({ x1: x + cellSize - inset, y1, x2: x + cellSize - inset, y2 });
    }
  }

  return (
    <g className={`region-boundary ${isSelected ? 'selected-region-boundary' : ''}`} pointerEvents="none">
      {isSelected &&
        segments.map((seg, idx) => (
          <line
            key={`halo_${idx}`}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke="#ffffff"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      {segments.map((seg, idx) => (
        <line
          key={idx}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
          stroke={isSelected ? '#0f172a' : region.color}
          strokeWidth={isSelected ? 3.5 : 2.5}
          strokeDasharray={isSelected ? '6 3' : '5 4'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
};
