import { Constraint } from '../domain/constraints';
import { DominoPlacement } from '../domain/placement';
import { Puzzle } from '../domain/puzzle';

export interface SolveResult {
  solvable: boolean;
  solution?: DominoPlacement[];
  stepsExplored: number;
  timedOut?: boolean;
}

interface DominoGroup {
  a: number;
  b: number;
  ids: string[];
  usedCount: number;
}

interface RegionTracker {
  constraint: Constraint | null;
  unfilled: number;
  sum: number;
  mask: number; // bitmask of values present (for 'different' / 'equal')
  firstVal: number; // -1 if none placed yet (for 'equal')
}

/**
 * Fast backtracking solver for Pips puzzles using:
 * - Minimum Remaining Degree (isolated-cell / forced-edge first) cell selection
 * - Incremental region constraint pruning (sum, lessThan, greaterThan, equal, different)
 * - Identical-domino symmetry breaking
 */
export function solvePuzzle(puzzle: Puzzle, maxSteps: number = 60000): SolveResult {
  const numCells = puzzle.cells.length;
  const numDominoes = puzzle.dominoes.length;

  if (numCells === 0 || numCells !== numDominoes * 2 || numCells % 2 !== 0) {
    return { solvable: false, stepsExplored: 0 };
  }

  // Checkerboard parity check: every domino covers 1 even and 1 odd (row + col) cell
  let parityBalance = 0;
  for (let i = 0; i < numCells; i++) {
    const c = puzzle.cells[i];
    parityBalance += (c.row + c.col) & 1 ? 1 : -1;
  }
  if (parityBalance !== 0) {
    return { solvable: false, stepsExplored: 0 };
  }

  // Map cell IDs and coordinates to 0..numCells-1
  const cellIdToIdx = new Map<string, number>();
  const coordToIdx = new Map<string, number>();
  for (let i = 0; i < numCells; i++) {
    const c = puzzle.cells[i];
    cellIdToIdx.set(c.id, i);
    coordToIdx.set(`${c.row},${c.col}`, i);
  }

  // Build adjacency list
  const adj: number[][] = Array.from({ length: numCells }, () => []);
  const dirs = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0]
  ];
  for (let i = 0; i < numCells; i++) {
    const c = puzzle.cells[i];
    for (const [dr, dc] of dirs) {
      const nIdx = coordToIdx.get(`${c.row + dr},${c.col + dc}`);
      if (nIdx !== undefined) {
        adj[i].push(nIdx);
      }
    }
    if (adj[i].length === 0) {
      return { solvable: false, stepsExplored: 0 };
    }
  }

  // Build region trackers
  const cellRegionIdx = new Int32Array(numCells).fill(-1);
  const regions: RegionTracker[] = puzzle.regions.map((r, rIdx) => {
    let validCellCount = 0;
    for (const cid of r.cellIds) {
      const cIdx = cellIdToIdx.get(cid);
      if (cIdx !== undefined) {
        if (cellRegionIdx[cIdx] !== -1) {
          // Invalid puzzle: cell in multiple regions
          return {
            constraint: r.constraint ?? null,
            unfilled: -1,
            sum: 0,
            mask: 0,
            firstVal: -1
          };
        }
        cellRegionIdx[cIdx] = rIdx;
        validCellCount++;
      }
    }
    return {
      constraint: r.constraint ?? null,
      unfilled: validCellCount,
      sum: 0,
      mask: 0,
      firstVal: -1
    };
  });

  for (const reg of regions) {
    if (reg.unfilled < 0) {
      return { solvable: false, stepsExplored: 0 };
    }
    if (reg.constraint) {
      if (reg.constraint.type === 'different' && reg.unfilled > 7) {
        return { solvable: false, stepsExplored: 0 };
      }
      if (reg.constraint.type === 'sum' && (reg.constraint.value < 0 || reg.constraint.value > reg.unfilled * 6)) {
        return { solvable: false, stepsExplored: 0 };
      }
      if (reg.constraint.type === 'lessThan' && reg.constraint.value <= 0) {
        return { solvable: false, stepsExplored: 0 };
      }
      if (reg.constraint.type === 'greaterThan' && reg.unfilled * 6 <= reg.constraint.value) {
        return { solvable: false, stepsExplored: 0 };
      }
    }
  }

  // Group identical dominoes to avoid duplicate branches
  const groupMap = new Map<string, DominoGroup>();
  for (const d of puzzle.dominoes) {
    const lo = Math.min(d.a, d.b);
    const hi = Math.max(d.a, d.b);
    const key = `${lo}_${hi}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.ids.push(d.id);
    } else {
      groupMap.set(key, { a: lo, b: hi, ids: [d.id], usedCount: 0 });
    }
  }
  const dominoGroups = Array.from(groupMap.values());

  const covered = new Uint8Array(numCells);
  const remDegree = new Int32Array(numCells);
  for (let i = 0; i < numCells; i++) {
    remDegree[i] = adj[i].length;
  }

  // Check if placing value `val` into region `rIdx` is valid
  function canApplyValue(rIdx: number, val: number): boolean {
    if (rIdx === -1) return true;
    const reg = regions[rIdx];
    const c = reg.constraint;
    if (!c) return true;

    const newSum = reg.sum + val;
    const remAfter = reg.unfilled - 1;

    switch (c.type) {
      case 'sum': {
        if (newSum > c.value) return false;
        if (newSum + remAfter * 6 < c.value) return false;
        return true;
      }
      case 'lessThan': {
        return newSum < c.value;
      }
      case 'greaterThan': {
        return newSum + remAfter * 6 > c.value;
      }
      case 'equal': {
        if (reg.mask !== 0 && reg.firstVal !== val) return false;
        return true;
      }
      case 'different': {
        if ((reg.mask & (1 << val)) !== 0) return false;
        return true;
      }
    }
  }

  // Check if placing `(valU, valV)` on `(u, v)` satisfies region constraints (including when u and v share a region)
  function canPlaceValues(u: number, valU: number, v: number, valV: number): boolean {
    const rU = cellRegionIdx[u];
    const rV = cellRegionIdx[v];

    if (rU !== rV || rU === -1) {
      return canApplyValue(rU, valU) && canApplyValue(rV, valV);
    }

    // u and v are in the SAME region
    const reg = regions[rU];
    const c = reg.constraint;
    if (!c) return true;

    const newSum = reg.sum + valU + valV;
    const remAfter = reg.unfilled - 2;

    switch (c.type) {
      case 'sum': {
        if (newSum > c.value) return false;
        if (newSum + remAfter * 6 < c.value) return false;
        return true;
      }
      case 'lessThan': {
        return newSum < c.value;
      }
      case 'greaterThan': {
        return newSum + remAfter * 6 > c.value;
      }
      case 'equal': {
        if (valU !== valV) return false;
        if (reg.mask !== 0 && reg.firstVal !== valU) return false;
        return true;
      }
      case 'different': {
        if (valU === valV) return false;
        if ((reg.mask & ((1 << valU) | (1 << valV))) !== 0) return false;
        return true;
      }
    }
  }

  const placementStack: Array<{ u: number; v: number; groupIdx: number; valU: number; valV: number }> = [];
  let steps = 0;
  let timedOut = false;

  function backtrack(placedCount: number): boolean {
    if (placedCount === numDominoes) {
      return true;
    }
    if (++steps > maxSteps) {
      timedOut = true;
      return false;
    }

    // Select uncovered cell with minimum remaining degree (and check for isolated uncovered cells)
    let bestCell = -1;
    let minDeg = 99;
    let bestRegionTightness = 999;

    for (let i = 0; i < numCells; i++) {
      if (covered[i]) continue;
      const deg = remDegree[i];
      if (deg === 0) {
        // Isolated single uncovered cell -> impossible!
        return false;
      }
      const rIdx = cellRegionIdx[i];
      const tightness = rIdx !== -1 && regions[rIdx].constraint ? regions[rIdx].unfilled : 50;
      if (deg < minDeg || (deg === minDeg && tightness < bestRegionTightness)) {
        minDeg = deg;
        bestRegionTightness = tightness;
        bestCell = i;
      }
    }

    const u = bestCell;
    covered[u] = 1;
    for (const nb of adj[u]) {
      remDegree[nb]--;
    }

    const rU = cellRegionIdx[u];

    // Try each uncovered neighbor v of u
    for (const v of adj[u]) {
      if (covered[v]) continue;

      // Quick lookahead: covering v must not isolate any other neighbor of u or v (unless that neighbor is the only one left, etc.)
      let createsIsolated = false;
      for (const nbU of adj[u]) {
        if (nbU !== v && !covered[nbU] && remDegree[nbU] === 0) {
          createsIsolated = true;
          break;
        }
      }
      if (!createsIsolated) {
        for (const nbV of adj[v]) {
          if (!covered[nbV] && remDegree[nbV] - 1 === 0) {
            createsIsolated = true;
            break;
          }
        }
      }
      if (createsIsolated) continue;

      covered[v] = 1;
      for (const nb of adj[v]) {
        remDegree[nb]--;
      }

      const rV = cellRegionIdx[v];

      // Try each available domino group
      for (let gIdx = 0; gIdx < dominoGroups.length; gIdx++) {
        const grp = dominoGroups[gIdx];
        if (grp.usedCount >= grp.ids.length) continue;

        const orientations = grp.a === grp.b ? [[grp.a, grp.b]] : [[grp.a, grp.b], [grp.b, grp.a]];

        for (const [valU, valV] of orientations) {
          if (!canPlaceValues(u, valU, v, valV)) continue;

          // Apply region updates
          grp.usedCount++;
          const prevMaskU = rU !== -1 ? regions[rU].mask : 0;
          const prevFirstU = rU !== -1 ? regions[rU].firstVal : -1;
          if (rU !== -1) {
            regions[rU].sum += valU;
            regions[rU].unfilled--;
            if (regions[rU].mask === 0) regions[rU].firstVal = valU;
            regions[rU].mask |= 1 << valU;
          }

          const prevMaskV = rV !== -1 ? regions[rV].mask : 0;
          const prevFirstV = rV !== -1 ? regions[rV].firstVal : -1;
          if (rV !== -1) {
            regions[rV].sum += valV;
            regions[rV].unfilled--;
            if (regions[rV].mask === 0) regions[rV].firstVal = valV;
            regions[rV].mask |= 1 << valV;
          }

          placementStack.push({ u, v, groupIdx: gIdx, valU, valV });

          if (backtrack(placedCount + 1)) {
            return true;
          }

          placementStack.pop();

          // Revert region updates
          if (rV !== -1) {
            regions[rV].sum -= valV;
            regions[rV].unfilled++;
            regions[rV].mask = prevMaskV;
            regions[rV].firstVal = prevFirstV;
          }
          if (rU !== -1) {
            regions[rU].sum -= valU;
            regions[rU].unfilled++;
            regions[rU].mask = prevMaskU;
            regions[rU].firstVal = prevFirstU;
          }
          grp.usedCount--;

          if (timedOut) break;
        }
        if (timedOut) break;
      }

      for (const nb of adj[v]) {
        remDegree[nb]++;
      }
      covered[v] = 0;
      if (timedOut) break;
    }

    for (const nb of adj[u]) {
      remDegree[nb]++;
    }
    covered[u] = 0;
    return false;
  }

  const solved = backtrack(0);
  if (!solved) {
    return { solvable: false, stepsExplored: steps, timedOut };
  }

  // Convert placementStack to DominoPlacement[]
  const groupAllocCount = new Int32Array(dominoGroups.length);
  const dominoMap = new Map(puzzle.dominoes.map((d) => [d.id, d]));
  const solution: DominoPlacement[] = placementStack.map((item) => {
    const grp = dominoGroups[item.groupIdx];
    const dominoId = grp.ids[groupAllocCount[item.groupIdx]++];
    const domDef = dominoMap.get(dominoId)!;

    const cellU = puzzle.cells[item.u];
    const cellV = puzzle.cells[item.v];

    // Order cells top-to-bottom or left-to-right
    const uFirst = cellU.row < cellV.row || (cellU.row === cellV.row && cellU.col < cellV.col);
    const firstCell = uFirst ? cellU : cellV;
    const secondCell = uFirst ? cellV : cellU;
    const firstVal = uFirst ? item.valU : item.valV;

    const orientation = firstCell.row === secondCell.row ? 'horizontal' : 'vertical';
    const matchesNormalOrder = domDef.a === firstVal;
    const reversed = !matchesNormalOrder;
    const rotation =
      orientation === 'horizontal' ? (reversed ? 2 : 0) : reversed ? 3 : 1;

    return {
      dominoId,
      cellA: reversed ? secondCell.id : firstCell.id,
      cellB: reversed ? firstCell.id : secondCell.id,
      orientation,
      reversed,
      rotation
    };
  });

  return {
    solvable: true,
    solution,
    stepsExplored: steps
  };
}
