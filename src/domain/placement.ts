import { DominoDefinition, DominoRotationState, getRotationDetails, rotateClockwise } from './domino';
import { CellId, Puzzle, areCellsAdjacent, getCellById } from './puzzle';

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
  rotation: DominoRotationState
): { cellA: CellId; cellB: CellId } | null {
  const anchor = getCellById(puzzle, anchorCellId);
  if (!anchor) return null;

  let rA = anchor.row;
  let cA = anchor.col;
  let rB = anchor.row;
  let cB = anchor.col;

  // 0: [A | B]  -> anchor is A, B is to right
  // 1: [A] / [B]-> anchor is A, B is below
  // 2: [B | A]  -> anchor is B, A is to right
  // 3: [B] / [A]-> anchor is B, A is below
  switch (rotation) {
    case 0:
      cB = anchor.col + 1;
      break;
    case 1:
      rB = anchor.row + 1;
      break;
    case 2:
      cA = anchor.col + 1;
      break;
    case 3:
      rA = anchor.row + 1;
      break;
  }

  const foundA = puzzle.cells.find((c) => c.row === rA && c.col === cA);
  const foundB = puzzle.cells.find((c) => c.row === rB && c.col === cB);

  if (!foundA || !foundB) return null;
  return { cellA: foundA.id, cellB: foundB.id };
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

  const nextRotation = rotateClockwise(existing.rotation);
  const { orientation, reversed } = getRotationDetails(nextRotation);

  // Try rotating around cellA first, then cellB
  const candidates: Array<{ cellA: CellId; cellB: CellId }> = [];

  const anchorACells = getCellsForAnchorAndRotation(puzzle, existing.cellA, nextRotation);
  if (anchorACells) candidates.push(anchorACells);

  const anchorBCells = getCellsForAnchorAndRotation(puzzle, existing.cellB, nextRotation);
  if (anchorBCells) candidates.push(anchorBCells);

  for (const cand of candidates) {
    if (canPlaceDomino(puzzle, currentPlacements, domino, cand.cellA, cand.cellB)) {
      const updated: DominoPlacement = {
        dominoId,
        cellA: cand.cellA,
        cellB: cand.cellB,
        orientation,
        reversed,
        rotation: nextRotation
      };
      return {
        success: true,
        placements: placeDomino(currentPlacements, updated)
      };
    }
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
