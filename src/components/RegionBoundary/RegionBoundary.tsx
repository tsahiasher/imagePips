import React from 'react';
import { parseCellId, Region } from '../../domain/puzzle';

interface RegionBoundaryProps {
  region: Region;
  minRow: number;
  minCol: number;
  cellSize: number;
  padding: number;
}

export const RegionBoundary: React.FC<RegionBoundaryProps> = ({
  region,
  minRow,
  minCol,
  cellSize,
  padding
}) => {
  // In Pips, dashed perimeter lines denote constraint/rule boundaries.
  // Regions without a rule (unconstrained / neutral cells) do not have dashed lines.
  if (!region.constraint) {
    return null;
  }

  const cellSet = new Set(region.cellIds);

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

    // Top edge
    if (!cellSet.has(`${row - 1},${col}`)) {
      segments.push({ x1: x, y1: y, x2: x + cellSize, y2: y });
    }
    // Bottom edge
    if (!cellSet.has(`${row + 1},${col}`)) {
      segments.push({ x1: x, y1: y + cellSize, x2: x + cellSize, y2: y + cellSize });
    }
    // Left edge
    if (!cellSet.has(`${row},${col - 1}`)) {
      segments.push({ x1: x, y1: y, x2: x, y2: y + cellSize });
    }
    // Right edge
    if (!cellSet.has(`${row},${col + 1}`)) {
      segments.push({ x1: x + cellSize, y1: y, x2: x + cellSize, y2: y + cellSize });
    }
  }

  return (
    <g className="region-boundary" pointerEvents="none">
      {segments.map((seg, idx) => (
        <line
          key={idx}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
          stroke={region.color}
          strokeWidth={3}
          strokeDasharray="6 4"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
};
