import { DominoDefinition, DominoRotationState, getRotationDetails } from './domino';
import { CellId, Puzzle, areCellsAdjacent, getCellById, makeCellId, parseCellId } from './puzzle';

export interface DominoPlacement {
  dominoId: string;
  cellA: CellId; // cell where half A is located
  cellB: CellId; // cell where half B is located
  orientation: "horizontal" | "vertical";
  reversed: boolean;
  rotation: DominoRotationState;
}

/**
 * Checks whether a domino can legally be placed onto targetCellA and targetCellB.
 */
export function canPlaceDomino(
  puzzle: Puzzle,
  currentPlacements: DominoPlacement[],
  domino: DominoDefinition,
  targetCellA: CellId,
  targetCellB: CellId
): boolean {
  if (targetCellA === targetCellB) return false;

  const cellA = getCellById(puzzle, targetCellA);
  const cellB = getCellById(puzzle, targetCellB);

  // Both cells must exist in the playable cells of the puzzle
  if (!cellA || !cellB) return false;

  // Must be in the same board component
  if (cellA.componentId !== cellB.componentId) return false;

  // Must be orthogonally adjacent
  if (!areCellsAdjacent(cellA, cellB)) return false;

  // Neither cell can be occupied by another placed domino
  for (const placement of currentPlacements) {
    if (placement.dominoId === domino.id) {
      continue; // Skip the domino itself if already placed
    }
    if (
      placement.cellA === targetCellA ||
      placement.cellB === targetCellA ||
      placement.cellA === targetCellB ||
      placement.cellB === targetCellB
    ) {
      return false; // Cell is already occupied
    }
  }

  return true;
}

/**
 * Places or updates a domino placement in the placement list.
 */
export function placeDomino(
  currentPlacements: DominoPlacement[],
  newPlacement: DominoPlacement
): DominoPlacement[] {
  const filtered = currentPlacements.filter((p) => p.dominoId !== newPlacement.dominoId);
  return [...filtered, newPlacement];
}

/**
 * Removes a domino from the board placements.
 */
export function removeDomino(
  currentPlacements: DominoPlacement[],
  dominoId: string
): DominoPlacement[] {
  return currentPlacements.filter((p) => p.dominoId !== dominoId);
}

/**
 * Compute the target cells for a domino given an anchor cell and a rotation state.
 */
export function getCellsForAnchorAndRotation(
  puzzle: Puzzle,
  anchorCellId: CellId,
  rotation: DominoRotationState,
  reversedAnchor: boolean = false
): { cellA: CellId; cellB: CellId } | null {
  const anchor = parseCellId(anchorCellId);
  if (isNaN(anchor.row) || isNaN(anchor.col)) return null;

  // Clockwise step around anchor: 0: Right, 1: Down, 2: Left, 3: Up
  const step = !reversedAnchor ? rotation : ((rotation + 2) % 4);

  let otherRow = anchor.row;
  let otherCol = anchor.col;
  if (step === 0) otherCol += 1;
  else if (step === 1) otherRow += 1;
  else if (step === 2) otherCol -= 1;
  else if (step === 3) otherRow -= 1;

  const foundOther = puzzle.cells.find((c) => c.row === otherRow && c.col === otherCol);
  const foundAnchor = puzzle.cells.find((c) => c.row === anchor.row && c.col === anchor.col);
  if (!foundOther || !foundAnchor) return null;

  return !reversedAnchor
    ? { cellA: foundAnchor.id, cellB: foundOther.id }
    : { cellA: foundOther.id, cellB: foundAnchor.id };
}

/**
 * Attempts to rotate an already placed domino 90 degrees clockwise.
 * If the resulting cells are legal and unoccupied, returns the updated placements.
 * Otherwise, leaves placements unchanged.
 */
export function rotateDomino(
  puzzle: Puzzle,
  currentPlacements: DominoPlacement[],
  dominoId: string
): { success: boolean; placements: DominoPlacement[] } {
  const existing = currentPlacements.find((p) => p.dominoId === dominoId);
  if (!existing) return { success: false, placements: currentPlacements };

  const domino = puzzle.dominoes.find((d) => d.id === dominoId);
  if (!domino) return { success: false, placements: currentPlacements };

  const parsedA = parseCellId(existing.cellA);
  const parsedB = parseCellId(existing.cellB);
  const topSquareRow = Math.min(parsedA.row, parsedB.row);
  const topSquareCol = Math.min(parsedA.col, parsedB.col);
  const topCellId = makeCellId(topSquareRow, topSquareCol);
  const reversedAnchor = existing.cellB === topCellId;

  const otherParsed = existing.cellA === topCellId ? parsedB : parsedA;
  let currentStep = 0;
  if (otherParsed.col === topSquareCol + 1) currentStep = 0;
  else if (otherParsed.row === topSquareRow + 1) currentStep = 1;
  else if (otherParsed.col === topSquareCol - 1) currentStep = 2;
  else if (otherParsed.row === topSquareRow - 1) currentStep = 3;

  const nextStep = (currentStep + 1) % 4;
  const nextRotation: DominoRotationState = !reversedAnchor
    ? (nextStep as DominoRotationState)
    : (((nextStep + 2) % 4) as DominoRotationState);
  const { orientation, reversed } = getRotationDetails(nextRotation);

  const anchorCells = getCellsForAnchorAndRotation(puzzle, topCellId, nextRotation, reversedAnchor);
  if (anchorCells && canPlaceDomino(puzzle, currentPlacements, domino, anchorCells.cellA, anchorCells.cellB)) {
    const updated: DominoPlacement = {
      dominoId,
      cellA: anchorCells.cellA,
      cellB: anchorCells.cellB,
      orientation,
      reversed,
      rotation: nextRotation
    };
    return {
      success: true,
      placements: placeDomino(currentPlacements, updated)
    };
  }

  return { success: false, placements: currentPlacements };
}

/**
 * Returns a map of cell IDs to their current pip values (or null if unoccupied).
 */
export function getBoardValues(
  puzzle: Puzzle,
  placements: DominoPlacement[]
): Map<CellId, number | null> {
  const values = new Map<CellId, number | null>();

  for (const cell of puzzle.cells) {
    values.set(cell.id, null);
  }

  const dominoMap = new Map(puzzle.dominoes.map((d) => [d.id, d]));

  for (const p of placements) {
    const domino = dominoMap.get(p.dominoId);
    if (!domino) continue;

    values.set(p.cellA, domino.a);
    values.set(p.cellB, domino.b);
  }

  return values;
}
