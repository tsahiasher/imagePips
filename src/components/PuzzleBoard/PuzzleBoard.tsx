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
  selectedDominoId?: string | null;
  activeRegionId?: string | null;
  gridBounds?: { minRow: number; maxRow: number; minCol: number; maxCol: number };
  showHoles?: boolean;
  editMode?: 'select' | 'regions' | 'cells';
  onDominoClick?: (dominoId: string) => void;
  onDominoPointerDown?: (e: React.PointerEvent, dominoId: string, fromBoard: boolean) => void;
  onCellClick?: (cellId: CellId) => void;
  onRegionBadgeClick?: (regionId: string) => void;
  onEmptyBoardClick?: () => void;
  boardRef?: React.RefObject<SVGSVGElement | null>;
  className?: string;
}

export const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
  puzzle,
  placements,
  invalidRegionIds = [],
  cellSize = 72,
  dragCandidate = null,
  selectedDominoId = null,
  activeRegionId = null,
  gridBounds,
  showHoles = false,
  editMode = 'select',
  onDominoClick,
  onDominoPointerDown,
  onCellClick,
  onRegionBadgeClick,
  onEmptyBoardClick,
  boardRef,
  className = ''
}) => {
  // Compute bounds of cells (or use gridBounds if provided)
  let minRow = gridBounds?.minRow ?? 0;
  let maxRow = gridBounds?.maxRow ?? 0;
  let minCol = gridBounds?.minCol ?? 0;
  let maxCol = gridBounds?.maxCol ?? 0;

  if (puzzle.cells.length > 0) {
    const rMin = Math.min(...puzzle.cells.map((c) => c.row));
    const rMax = Math.max(...puzzle.cells.map((c) => c.row));
    const cMin = Math.min(...puzzle.cells.map((c) => c.col));
    const cMax = Math.max(...puzzle.cells.map((c) => c.col));

    minRow = gridBounds ? Math.min(gridBounds.minRow, rMin) : rMin;
    maxRow = gridBounds ? Math.max(gridBounds.maxRow, rMax) : rMax;
    minCol = gridBounds ? Math.min(gridBounds.minCol, cMin) : cMin;
    maxCol = gridBounds ? Math.max(gridBounds.maxCol, cMax) : cMax;
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

  // Find all hole coordinates inside the active grid bounding box when showHoles is enabled
  const holes: { row: number; col: number; id: string }[] = [];
  if (showHoles) {
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const id = `${r},${c}`;
        if (!cellMap.has(id)) {
          holes.push({ row: r, col: c, id });
        }
      }
    }
  }

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
          touchAction: onDominoPointerDown ? 'none' : 'pan-x pan-y pinch-zoom',
          userSelect: 'none'
        }}
        id="pips-puzzle-board"
        aria-label="Pips Puzzle Board"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onEmptyBoardClick?.();
          }
        }}
      >
        {/* Empty holes (rendered in edit mode so clicking an empty hole turns it back into a playable cell) */}
        {showHoles && holes.length > 0 && (
          <g className="board-holes">
            {holes.map((h) => {
              const x = padding + (h.col - minCol) * cellSize;
              const y = padding + (h.row - minRow) * cellSize;
              return (
                <g
                  key={h.id}
                  className="hole-cell"
                  style={{
                    cursor: editMode === 'cells' && onCellClick ? 'pointer' : 'default',
                    pointerEvents: editMode === 'cells' ? 'auto' : 'none'
                  }}
                  onClick={editMode === 'cells' ? () => onCellClick?.(h.id) : undefined}
                  role="button"
                  aria-label={`Hole at ${h.row},${h.col}`}
                >
                  <rect
                    x={x + 3}
                    y={y + 3}
                    width={cellSize - 6}
                    height={cellSize - 6}
                    rx={cellSize * 0.16}
                    fill="#f1f5f9"
                    stroke="#cbd5e1"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={x + cellSize / 2 - 5}
                    y1={y + cellSize / 2}
                    x2={x + cellSize / 2 + 5}
                    y2={y + cellSize / 2}
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  <line
                    x1={x + cellSize / 2}
                    y1={y + cellSize / 2 - 5}
                    x2={x + cellSize / 2}
                    y2={y + cellSize / 2 + 5}
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </g>
        )}

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
                isSelectedRegion={Boolean(activeRegionId && reg?.id === activeRegionId)}
                hasActiveRegion={Boolean(activeRegionId)}
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
              isSelected={Boolean(activeRegionId && reg.id === activeRegionId)}
            />
          ))}
        </g>

        {/* Placed Dominoes */}
        <g className="placed-dominoes">
          {placements.map((placement) => {
            const domino = dominoMap.get(placement.dominoId);
            if (!domino) return null;

            const parsedA = parseCellId(placement.cellA);
            const parsedB = parseCellId(placement.cellB);
            if (isNaN(parsedA.row) || isNaN(parsedB.row)) return null;

            // Center inside cell pair bounding box
            const margin = Math.max(3, cellSize * 0.05);
            const topRow = Math.min(parsedA.row, parsedB.row);
            const leftCol = Math.min(parsedA.col, parsedB.col);
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
                  isPlaced={true}
                  isSelected={placement.dominoId === selectedDominoId}
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
                size={Math.max(34, cellSize * 0.56)}
                cx={cx}
                cy={cy}
                isSelected={Boolean(activeRegionId && reg.id === activeRegionId)}
                onClick={onRegionBadgeClick ? () => onRegionBadgeClick(reg.id) : undefined}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};
