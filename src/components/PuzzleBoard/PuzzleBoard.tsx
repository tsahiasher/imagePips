import React from 'react';
import { Constraint } from '../../domain/constraints';
import { DominoDefinition, DominoRotationState } from '../../domain/domino';
import { DominoPlacement } from '../../domain/placement';
import { CellId, Puzzle, Region, makeCellId, parseCellId } from '../../domain/puzzle';
import { SelectedPlacement } from '../../game/useDominoDrag';
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
  selectedPlacement?: SelectedPlacement | null;
  draggingDominoId?: string | null;
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
  selectedPlacement = null,
  draggingDominoId = null,
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

  // Calculate badge positions dynamically from the region's cell coordinates
  // (anchoring to the bottom-right-most cell in the region)
  const getBadgePosition = (region: Region): { cx: number; cy: number } => {
    let maxR = -Infinity;
    let maxC = -Infinity;
    for (const cId of region.cellIds) {
      const { row, col } = parseCellId(cId);
      if (row > maxR || (row === maxR && col > maxC)) {
        maxR = row;
        maxC = col;
      }
    }

    // Place badge at the bottom-right corner of the bottom-right-most cell
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
        {/* Transparent backdrop to catch clicks on empty board margins/padding */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="transparent"
          style={{ pointerEvents: 'all' }}
          onClick={() => onEmptyBoardClick?.()}
        />
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

        {/* Recessed board backing tray silhouette behind playable cells */}
        <g className="board-backing" pointerEvents="none">
          {(() => {
            const pad = Math.max(5, cellSize * 0.085);
            const borderPad = pad + 1.5;
            const rxOuter = Math.max(11, cellSize * 0.22);
            const rxInner = Math.max(9.5, cellSize * 0.2);

            return (
              <>
                {/* Outer border silhouette */}
                {puzzle.cells.map((cell) => {
                  const x = padding + (cell.col - minCol) * cellSize;
                  const y = padding + (cell.row - minRow) * cellSize;
                  const hasRight = cellMap.has(`${cell.row},${cell.col + 1}`);
                  const hasDown = cellMap.has(`${cell.row + 1},${cell.col}`);
                  return (
                    <React.Fragment key={`back_border_${cell.id}`}>
                      <rect
                        x={x - borderPad}
                        y={y - borderPad}
                        width={cellSize + borderPad * 2}
                        height={cellSize + borderPad * 2}
                        rx={rxOuter}
                        ry={rxOuter}
                        fill="#cbd5e1"
                      />
                      {hasRight && (
                        <rect
                          x={x + cellSize / 2}
                          y={y - borderPad}
                          width={cellSize}
                          height={cellSize + borderPad * 2}
                          fill="#cbd5e1"
                        />
                      )}
                      {hasDown && (
                        <rect
                          x={x - borderPad}
                          y={y + cellSize / 2}
                          width={cellSize + borderPad * 2}
                          height={cellSize}
                          fill="#cbd5e1"
                        />
                      )}
                    </React.Fragment>
                  );
                })}
                {/* Inner recessed tray surface */}
                {puzzle.cells.map((cell) => {
                  const x = padding + (cell.col - minCol) * cellSize;
                  const y = padding + (cell.row - minRow) * cellSize;
                  const hasRight = cellMap.has(`${cell.row},${cell.col + 1}`);
                  const hasDown = cellMap.has(`${cell.row + 1},${cell.col}`);
                  return (
                    <React.Fragment key={`back_fill_${cell.id}`}>
                      <rect
                        x={x - pad}
                        y={y - pad}
                        width={cellSize + pad * 2}
                        height={cellSize + pad * 2}
                        rx={rxInner}
                        ry={rxInner}
                        fill="#e2e8f0"
                      />
                      {hasRight && (
                        <rect
                          x={x + cellSize / 2}
                          y={y - pad}
                          width={cellSize}
                          height={cellSize + pad * 2}
                          fill="#e2e8f0"
                        />
                      )}
                      {hasDown && (
                        <rect
                          x={x - pad}
                          y={y + cellSize / 2}
                          width={cellSize + pad * 2}
                          height={cellSize}
                          fill="#e2e8f0"
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            );
          })()}
        </g>

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
            if (draggingDominoId && placement.dominoId === draggingDominoId) {
              return null; // Hidden from board while being dragged under the user's cursor
            }

            const domino = dominoMap.get(placement.dominoId);
            if (!domino) return null;

            const isSelected = selectedDominoId === placement.dominoId;
            const margin = Math.max(3, cellSize * 0.05);

            let anchorRow: number;
            let anchorCol: number;
            let anchorIsHalfA: boolean;
            let angle: number;
            let isRotating = false;

            if (isSelected && selectedPlacement) {
              // Lock strictly to the pinned anchor square across all rotation clicks
              anchorRow = selectedPlacement.anchorRow;
              anchorCol = selectedPlacement.anchorCol;
              anchorIsHalfA = selectedPlacement.anchorIsHalfA;
              angle = selectedPlacement.totalSteps * 90;
              isRotating = selectedPlacement.totalSteps !== selectedPlacement.initialTotalSteps;
            } else {
              const parsedA = parseCellId(placement.cellA);
              const parsedB = parseCellId(placement.cellB);
              if (isNaN(parsedA.row) || isNaN(parsedB.row)) return null;

              if (placement.orientation === 'vertical') {
                anchorRow = Math.min(parsedA.row, parsedB.row);
                anchorCol = parsedA.col;
                angle = 90;
              } else {
                anchorRow = parsedA.row;
                anchorCol = Math.min(parsedA.col, parsedB.col);
                angle = 0;
              }

              const anchorId = makeCellId(anchorRow, anchorCol);
              anchorIsHalfA = placement.cellA === anchorId;
            }

            const anchorCenterX = padding + (anchorCol - minCol + 0.5) * cellSize;
            const anchorCenterY = padding + (anchorRow - minRow + 0.5) * cellSize;
            const anchorInsideX = cellSize / 2 - margin;
            const anchorInsideY = cellSize / 2 - margin;

            return (
              <g
                key={placement.dominoId}
                transform={`translate(${anchorCenterX}, ${anchorCenterY}) rotate(${angle})`}
                style={{
                  cursor: 'pointer',
                  transform: `translate(${anchorCenterX}px, ${anchorCenterY}px) rotate(${angle}deg)`,
                  transformOrigin: '0 0',
                  transition: isRotating ? 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
                }}
                onPointerDown={(e) => onDominoPointerDown?.(e, placement.dominoId, true)}
                onClick={() => onDominoClick?.(placement.dominoId)}
              >
                <g transform={`translate(${-anchorInsideX}, ${-anchorInsideY})`}>
                  <Domino
                    domino={domino}
                    rotation={anchorIsHalfA ? 0 : 2}
                    cellSize={cellSize}
                    isPlaced={true}
                    isSelected={isSelected}
                  />
                </g>
              </g>
            );
          })}
        </g>

        {/* Ghost snap candidate preview when dragging */}
        {dragCandidate && dragCandidate.isLegal && (
          <g className="drag-candidate-preview" opacity={0.65} pointerEvents="none">
            {(() => {
              const domino = dominoMap.get(dragCandidate.dominoId);
              const parsedA = parseCellId(dragCandidate.cellA);
              const parsedB = parseCellId(dragCandidate.cellB);
              if (!domino || isNaN(parsedA.row) || isNaN(parsedB.row)) return null;

              const margin = Math.max(3, cellSize * 0.05);
              const topRow = Math.min(parsedA.row, parsedB.row);
              const leftCol = Math.min(parsedA.col, parsedB.col);
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
