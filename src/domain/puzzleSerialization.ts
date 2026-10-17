import { Constraint, formatConstraint, parseConstraint } from './constraints';
import { DominoDefinition } from './domino';
import {
  Cell,
  CellId,
  computeConnectedComponents,
  makeCellId,
  parseCellId,
  Puzzle,
  Region
} from './puzzle';

export const PIPS_PALETTE_HEX = [
  '#a855f7', // 0: Purple
  '#ec4899', // 1: Pink
  '#14b8a6', // 2: Teal
  '#f97316', // 3: Orange
  '#0284c7', // 4: Blue
  '#84cc16'  // 5: Lime
] as const;

export const NEUTRAL_CELL_COLOR = '#dfccc4';

export interface PipsBuildRegionV1 {
  color: number;
  cells: string[];
  condition: string;
}

export interface PipsBuildPuzzleV1 {
  format: 'pips-build-puzzle';
  version: 1;
  rows: number;
  cols: number;
  cells: string[];
  regions: PipsBuildRegionV1[];
  dominoes: [number, number][];
}

function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

/**
 * Maps a region hex color to its palette index (0..5).
 * Uses exact match first, falling back to nearest RGB palette color.
 */
export function hexToColorIndex(hex: string): number {
  const normalized = hex.trim().toLowerCase();
  const exactIdx = PIPS_PALETTE_HEX.findIndex((c) => c.toLowerCase() === normalized);
  if (exactIdx !== -1) {
    return exactIdx;
  }

  const rgb = parseHexRgb(normalized);
  if (!rgb) return 0;

  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < PIPS_PALETTE_HEX.length; i++) {
    const pRgb = parseHexRgb(PIPS_PALETTE_HEX[i])!;
    const d =
      (rgb[0] - pRgb[0]) ** 2 +
      (rgb[1] - pRgb[1]) ** 2 +
      (rgb[2] - pRgb[2]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Maps a palette index (0..5) or legacy hex string to a canonical hex color.
 */
export function colorIndexToHex(color: number | string | undefined): string {
  if (typeof color === 'number') {
    const idx = ((Math.round(color) % PIPS_PALETTE_HEX.length) + PIPS_PALETTE_HEX.length) % PIPS_PALETTE_HEX.length;
    return PIPS_PALETTE_HEX[idx];
  }
  if (typeof color === 'string') {
    const trimmed = color.trim();
    if (/^\d+$/.test(trimmed)) {
      const idx = parseInt(trimmed, 10);
      if (idx >= 0 && idx < PIPS_PALETTE_HEX.length) {
        return PIPS_PALETTE_HEX[idx];
      }
    }
    if (trimmed.startsWith('#')) {
      return trimmed.toLowerCase();
    }
  }
  return PIPS_PALETTE_HEX[0];
}

/**
 * Serializes an internal Puzzle object into the compact `pips-build-puzzle` v1 schema.
 */
export function serializePuzzle(puzzle: Puzzle): PipsBuildPuzzleV1 {
  const rows =
    puzzle.cells.length > 0 ? Math.max(...puzzle.cells.map((c) => c.row)) + 1 : 0;
  const cols =
    puzzle.cells.length > 0 ? Math.max(...puzzle.cells.map((c) => c.col)) + 1 : 0;

  const cells = puzzle.cells.map((c) => makeCellId(c.row, c.col));

  const regions: PipsBuildRegionV1[] = [];
  for (const reg of puzzle.regions) {
    if (!reg.constraint) continue;
    if (reg.color.trim().toLowerCase() === NEUTRAL_CELL_COLOR) continue;
    if (!reg.cellIds || reg.cellIds.length === 0) continue;

    regions.push({
      color: hexToColorIndex(reg.color),
      cells: [...reg.cellIds],
      condition: formatConstraint(reg.constraint)
    });
  }

  const dominoes: [number, number][] = puzzle.dominoes.map((d) => [d.a, d.b]);

  return {
    format: 'pips-build-puzzle',
    version: 1,
    rows,
    cols,
    cells,
    regions,
    dominoes
  };
}

/**
 * Deserializes a `pips-build-puzzle` v1 object (or legacy puzzle object) into an internal Puzzle.
 * Dynamically computes cell `componentId` via 4-way BFS and strips any serialized `labelAnchor`.
 * Any root cell absent from constrained regions defaults to an unconstrained neutral cell (`#dfccc4`, `constraint: null`).
 */
export function deserializePuzzle(input: unknown): Puzzle {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid puzzle JSON: expected an object.');
  }

  const raw = data as Record<string, any>;
  if (!Array.isArray(raw.cells) || !Array.isArray(raw.dominoes)) {
    throw new Error('Invalid puzzle JSON: missing cells or dominoes array.');
  }

  // 1. Parse cells ("r,c" strings or legacy { row, col } objects)
  const rawCells: { id: CellId; row: number; col: number }[] = [];
  const seenCellIds = new Set<CellId>();

  for (const item of raw.cells) {
    let row: number;
    let col: number;
    if (typeof item === 'string') {
      const parsed = parseCellId(item.trim());
      row = parsed.row;
      col = parsed.col;
    } else if (item && typeof item === 'object') {
      if (typeof item.row === 'number' && typeof item.col === 'number') {
        row = item.row;
        col = item.col;
      } else if (typeof item.id === 'string') {
        const parsed = parseCellId(item.id.trim());
        row = parsed.row;
        col = parsed.col;
      } else {
        continue;
      }
    } else {
      continue;
    }

    if (isNaN(row) || isNaN(col)) continue;
    const id = makeCellId(row, col);
    if (seenCellIds.has(id)) continue;
    seenCellIds.add(id);
    rawCells.push({ id, row, col });
  }

  // Compute connected components dynamically via 4-way orthogonal BFS
  const componentMap = computeConnectedComponents(rawCells);
  const cells: Cell[] = rawCells.map((c) => ({
    id: c.id,
    row: c.row,
    col: c.col,
    componentId: componentMap.get(c.id) ?? 'comp_1'
  }));

  // 2. Parse regions and default unassigned root cells to unconstrained (#dfccc4, constraint: null)
  const regions: Region[] = [];
  const assignedCells = new Set<CellId>();
  const rawRegions = Array.isArray(raw.regions) ? raw.regions : [];

  for (let i = 0; i < rawRegions.length; i++) {
    const r = rawRegions[i];
    if (!r || typeof r !== 'object') continue;

    const rawRegionCells: unknown[] = Array.isArray(r.cells)
      ? r.cells
      : Array.isArray(r.cellIds)
      ? r.cellIds
      : [];

    const validCellIds: CellId[] = [];
    for (const cid of rawRegionCells) {
      if (typeof cid !== 'string') continue;
      const parsed = parseCellId(cid.trim());
      if (isNaN(parsed.row) || isNaN(parsed.col)) continue;
      const normId = makeCellId(parsed.row, parsed.col);
      if (seenCellIds.has(normId) && !assignedCells.has(normId)) {
        validCellIds.push(normId);
      }
    }

    if (validCellIds.length === 0) continue;

    let constraint: Constraint | null = null;
    if (typeof r.condition === 'string') {
      constraint = parseConstraint(r.condition);
    } else if (r.constraint && typeof r.constraint === 'object' && typeof r.constraint.type === 'string') {
      const cType = r.constraint.type;
      if (cType === 'equal' || cType === 'different') {
        constraint = { type: cType };
      } else if (
        (cType === 'sum' || cType === 'lessThan' || cType === 'greaterThan') &&
        typeof r.constraint.value === 'number'
      ) {
        constraint = { type: cType, value: r.constraint.value };
      }
    }

    // Omit unconstrained regions so all unassigned cells fall back cleanly to neutral #dfccc4
    if (!constraint) continue;

    for (const cid of validCellIds) {
      assignedCells.add(cid);
    }

    regions.push({
      id: `region_${regions.length + 1}`,
      cellIds: validCellIds,
      color: colorIndexToHex(r.color),
      constraint
    });
  }

  // Group any remaining unassigned cells into an unconstrained neutral region (#dfccc4, constraint: null)
  const unassignedCellIds = cells
    .map((c) => c.id)
    .filter((id) => !assignedCells.has(id));

  if (unassignedCellIds.length > 0) {
    regions.push({
      id: `region_${regions.length + 1}`,
      cellIds: unassignedCellIds,
      color: NEUTRAL_CELL_COLOR,
      constraint: null
    });
  }

  // 3. Parse dominoes ([a, b] tuples or legacy { id, a, b } objects)
  const dominoes: DominoDefinition[] = [];
  for (let i = 0; i < raw.dominoes.length; i++) {
    const d = raw.dominoes[i];
    if (Array.isArray(d) && d.length >= 2) {
      const a = Number(d[0]);
      const b = Number(d[1]);
      if (!isNaN(a) && !isNaN(b)) {
        dominoes.push({
          id: `d_${i + 1}`,
          a,
          b
        });
      }
    } else if (d && typeof d === 'object') {
      const a = Number(d.a ?? (Array.isArray(d.values) ? d.values[0] : NaN));
      const b = Number(d.b ?? (Array.isArray(d.values) ? d.values[1] : NaN));
      if (!isNaN(a) && !isNaN(b)) {
        dominoes.push({
          id: `d_${i + 1}`,
          a,
          b
        });
      }
    }
  }

  return {
    id: `puzzle_${Date.now()}`,
    cells,
    regions,
    dominoes
  };
}
