import React from 'react';
import { Constraint } from '../../domain/constraints';
import { DominoDefinition, DominoRotationState } from '../../domain/domino';
import { DominoPlacement } from '../../domain/placement';
import { CellId, Puzzle, Region, parseCellId } from '../../domain/puzzle';
import { ConditionBadge } from '../ConditionBadge/ConditionBadge';
import { Domino } from '../Domino/Domino';
import { PuzzleCell } from '../PuzzleCell/PuzzleCell';
import { RegionBoundary } from '../RegionBoundary/RegionBoundary';

export interface DragCandidate {
  dominoId: string;
  cellA: CellId;
  cellB: CellId;
  rotation: DominoRotationState;
  isLegal: boolean;
}

interface PuzzleBoardProps {
  puzzle: Puzzle;
  placements: DominoPlacement[];
  invalidRegionIds?: string[];
  cellSize?: number;
  dragCandidate?: DragCandidate | null;
  onDominoClick?: (dominoId: string) => void;
  onDominoPointerDown?: (e: React.PointerEvent, dominoId: string, fromBoard: boolean) => void;
  onCellClick?: (cellId: CellId) => void;
  boardRef?: React.RefObject<SVGSVGElement | null>;
  className?: string;
}

export const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
  puzzle,
  placements,
  invalidRegionIds = [],
  cellSize = 72,
  dragCandidate = null,
  onDominoClick,
  onDominoPointerDown,
  onCellClick,
  boardRef,
  className = ''
}) => {
  // Compute bounds of cells
  let minRow = 0;
  let maxRow = 0;
  let minCol = 0;
  let maxCol = 0;

  if (puzzle.cells.length > 0) {
    minRow = Math.min(...puzzle.cells.map((c) => c.row));
    maxRow = Math.max(...puzzle.cells.map((c) => c.row));
    minCol = Math.min(...puzzle.cells.map((c) => c.col));
    maxCol = Math.max(...puzzle.cells.map((c) => c.col));
  }

  const cols = Math.max(1, maxCol - minCol + 1);
  const rows = Math.max(1, maxRow - minRow + 1);
  const padding = cellSize * 0.45; // Space for badges extending beyond edges
  const width = cols * cellSize + padding * 2;
  const height = rows * cellSize + padding * 2;

  // Build cell maps for fast lookup
  const cellMap = new Map(puzzle.cells.map((c) => [c.id, c]));
  const regionMap = new Map<CellId, Region>();
  for (const reg of puzzle.regions) {
    for (const cId of reg.cellIds) {
      regionMap.set(cId, reg);
    }
  }

  // Calculate badge positions for regions that have constraints
  const getBadgePosition = (region: Region): { cx: number; cy: number } => {
    if (region.labelAnchor) {
      return {
        cx: padding + (region.labelAnchor.x - minCol) * cellSize,
        cy: padding + (region.labelAnchor.y - minRow) * cellSize
      };
    }

    // Default badge placement: Find extreme bottom-right vertex or edge of the region
    let maxR = -Infinity;
    let maxC = -Infinity;
    for (const cId of region.cellIds) {
      const { row, col } = parseCellId(cId);
      if (row > maxR || (row === maxR && col > maxC)) {
        maxR = row;
        maxC = col;
      }
    }

    // Place badge at the bottom-right corner of that cell
    const cx = padding + (maxC - minCol + 1) * cellSize;
    const cy = padding + (maxR - minRow + 1) * cellSize;
    return { cx, cy };
  };

  // Find placed domino objects
  const dominoMap = new Map<string, DominoDefinition>(
    puzzle.dominoes.map((d) => [d.id, d])
  );

  return (
    <div
      className={`puzzle-board-container ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        maxHeight: '100%',
        overflow: 'hidden'
      }}
    >
      <svg
        ref={boardRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        style={{
          maxHeight: '100%',
          maxWidth: '100%',
          display: 'block',
          touchAction: 'none',
          userSelect: 'none'
        }}
        id="pips-puzzle-board"
        aria-label="Pips Puzzle Board"
      >
        {/* Playable cells */}
        <g className="board-cells">
          {puzzle.cells.map((cell) => {
            const x = padding + (cell.col - minCol) * cellSize;
            const y = padding + (cell.row - minRow) * cellSize;
            const reg = regionMap.get(cell.id);

            const isCandidateA = dragCandidate?.cellA === cell.id;
            const isCandidateB = dragCandidate?.cellB === cell.id;
            const isCandidate = isCandidateA || isCandidateB;

            return (
              <PuzzleCell
                key={cell.id}
                cell={cell}
                x={x}
                y={y}
                size={cellSize}
                regionColor={reg?.color}
                isHighlighted={Boolean(isCandidate && dragCandidate?.isLegal)}
                highlightType="legal"
                onClick={() => onCellClick?.(cell.id)}
              />
            );
          })}
        </g>

        {/* Region dashed boundary lines */}
        <g className="region-boundaries">
          {puzzle.regions.map((reg) => (
            <RegionBoundary
              key={reg.id}
              region={reg}
              minRow={minRow}
              minCol={minCol}
              cellSize={cellSize}
              padding={padding}
            />
          ))}
        </g>

        {/* Placed Dominoes */}
        <g className="placed-dominoes">
          {placements.map((placement) => {
            const domino = dominoMap.get(placement.dominoId);
            const cellA = cellMap.get(placement.cellA);
            const cellB = cellMap.get(placement.cellB);
            if (!domino || !cellA || !cellB) return null;

            // Center inside cell pair bounding box
            const margin = Math.max(3, cellSize * 0.05);
            const topRow = Math.min(cellA.row, cellB.row);
            const leftCol = Math.min(cellA.col, cellB.col);
            const x = padding + (leftCol - minCol) * cellSize + margin;
            const y = padding + (topRow - minRow) * cellSize + margin;

            return (
              <g
                key={placement.dominoId}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => onDominoPointerDown?.(e, placement.dominoId, true)}
                onClick={() => onDominoClick?.(placement.dominoId)}
              >
                <Domino
                  domino={domino}
                  rotation={placement.rotation}
                  cellSize={cellSize}
                />
              </g>
            );
          })}
        </g>

        {/* Ghost snap candidate preview when dragging */}
        {dragCandidate && dragCandidate.isLegal && (
          <g className="drag-candidate-preview" opacity={0.65} pointerEvents="none">
            {(() => {
              const domino = dominoMap.get(dragCandidate.dominoId);
              const cellA = cellMap.get(dragCandidate.cellA);
              const cellB = cellMap.get(dragCandidate.cellB);
              if (!domino || !cellA || !cellB) return null;

              const margin = Math.max(3, cellSize * 0.05);
              const topRow = Math.min(cellA.row, cellB.row);
              const leftCol = Math.min(cellA.col, cellB.col);
              const x = padding + (leftCol - minCol) * cellSize + margin;
              const y = padding + (topRow - minRow) * cellSize + margin;

              return (
                <g transform={`translate(${x}, ${y})`}>
                  <Domino
                    domino={domino}
                    rotation={dragCandidate.rotation}
                    cellSize={cellSize}
                    isGhost={true}
                  />
                </g>
              );
            })()}
          </g>
        )}

        {/* Condition badges */}
        <g className="condition-badges">
          {puzzle.regions.map((reg) => {
            if (!reg.constraint) return null;
            const { cx, cy } = getBadgePosition(reg);
            const isInvalid = invalidRegionIds.includes(reg.id);

            return (
              <ConditionBadge
                key={reg.id}
                constraint={reg.constraint as Constraint}
                color={reg.color}
                invalid={isInvalid}
                size={Math.max(28, cellSize * 0.44)}
                cx={cx}
                cy={cy}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};
