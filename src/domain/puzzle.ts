import { Constraint } from './constraints';
import { DominoDefinition } from './domino';

export type CellId = string;

export interface Cell {
  id: CellId;
  row: number;
  col: number;
  componentId: string;
}

export interface Region {
  id: string;
  cellIds: CellId[];
  color: string;
  constraint: Constraint | null;
  labelAnchor?: {
    x: number; // Board coordinate or grid offset
    y: number;
  };
}

export interface Puzzle {
  id: string;
  name?: string;
  cells: Cell[];
  regions: Region[];
  dominoes: DominoDefinition[];
}

/**
 * Creates standardized CellId from row and column.
 */
export function makeCellId(row: number, col: number): CellId {
  return `${row},${col}`;
}

/**
 * Parse row and column from cell ID.
 */
export function parseCellId(id: CellId): { row: number; col: number } {
  const [r, c] = id.split(',').map(Number);
  return { row: r, col: c };
}

/**
 * Find cell in puzzle by cell ID.
 */
export function getCellById(puzzle: Puzzle, cellId: CellId): Cell | undefined {
  return puzzle.cells.find((c) => c.id === cellId);
}

/**
 * Find cell at specific row and column.
 */
export function getCellAt(puzzle: Puzzle, row: number, col: number): Cell | undefined {
  return puzzle.cells.find((c) => c.row === row && c.col === col);
}

/**
 * Check if two cells are orthogonally adjacent.
 */
export function areCellsAdjacent(cellA: Cell, cellB: Cell): boolean {
  const dRow = Math.abs(cellA.row - cellB.row);
  const dCol = Math.abs(cellA.col - cellB.col);
  return (dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1);
}

/**
 * Computes disconnected component IDs for a list of cells.
 */
export function computeConnectedComponents(
  cells: { id: CellId; row: number; col: number }[]
): Map<CellId, string> {
  const cellMap = new Map<string, { id: CellId; row: number; col: number }>();
  for (const cell of cells) {
    cellMap.set(`${cell.row},${cell.col}`, cell);
  }

  const visited = new Set<string>();
  const componentMap = new Map<CellId, string>();
  let componentCounter = 1;

  for (const cell of cells) {
    const key = `${cell.row},${cell.col}`;
    if (visited.has(key)) continue;

    const componentId = `comp_${componentCounter++}`;
    const queue = [cell];
    visited.add(key);

    while (queue.length > 0) {
      const current = queue.shift()!;
      componentMap.set(current.id, componentId);

      const neighbors = [
        { r: current.row - 1, c: current.col },
        { r: current.row + 1, c: current.col },
        { r: current.row, c: current.col - 1 },
        { r: current.row, c: current.col + 1 }
      ];

      for (const n of neighbors) {
        const nKey = `${n.r},${n.c}`;
        const neighborCell = cellMap.get(nKey);
        if (neighborCell && !visited.has(nKey)) {
          visited.add(nKey);
          queue.push(neighborCell);
        }
      }
    }
  }

  return componentMap;
}
