import { Constraint, RegionEvaluation } from '../domain/constraints';
import { DominoPlacement, getBoardValues } from '../domain/placement';
import { CellId, Puzzle, Region } from '../domain/puzzle';

/**
 * Evaluates whether a region satisfies its constraint given current board cell values.
 */
export function evaluateRegion(
  region: Region,
  boardValues: Map<CellId, number | null>
): RegionEvaluation {
  const values: number[] = [];
  let emptyCount = 0;

  for (const cellId of region.cellIds) {
    const val = boardValues.get(cellId);
    if (val !== null && val !== undefined) {
      values.push(val);
    } else {
      emptyCount++;
    }
  }

  const complete = emptyCount === 0;
  const currentSum = values.reduce((acc, v) => acc + v, 0);

  // If region has no constraint, it is always valid and complete based on its cells
  if (!region.constraint) {
    return {
      complete,
      valid: true,
      impossible: false,
      currentSum
    };
  }

  const constraint: Constraint = region.constraint;

  switch (constraint.type) {
    case 'sum': {
      // Domino pips are between 0 and 6
      const minPossible = currentSum; // remaining could be 0
      const maxPossible = currentSum + emptyCount * 6;
      const impossible = minPossible > constraint.value || maxPossible < constraint.value;

      if (complete) {
        const valid = currentSum === constraint.value;
        return {
          complete,
          valid,
          impossible: !valid,
          currentSum,
          expectedDescription: `Sum = ${constraint.value}`,
          errorReason: valid ? undefined : `Sum is ${currentSum}, expected ${constraint.value}`
        };
      } else {
        return {
          complete,
          valid: !impossible,
          impossible,
          currentSum,
          expectedDescription: `Sum = ${constraint.value}`
        };
      }
    }

    case 'lessThan': {
      // Sum must be strictly less than constraint.value
      const impossible = currentSum >= constraint.value;

      if (complete) {
        const valid = currentSum < constraint.value;
        return {
          complete,
          valid,
          impossible: !valid,
          currentSum,
          expectedDescription: `Sum < ${constraint.value}`,
          errorReason: valid ? undefined : `Sum is ${currentSum}, must be < ${constraint.value}`
        };
      } else {
        return {
          complete,
          valid: !impossible,
          impossible,
          currentSum,
          expectedDescription: `Sum < ${constraint.value}`
        };
      }
    }

    case 'greaterThan': {
      // Sum must be strictly greater than constraint.value
      const maxPossible = currentSum + emptyCount * 6;
      const impossible = maxPossible <= constraint.value;

      if (complete) {
        const valid = currentSum > constraint.value;
        return {
          complete,
          valid,
          impossible: !valid,
          currentSum,
          expectedDescription: `Sum > ${constraint.value}`,
          errorReason: valid ? undefined : `Sum is ${currentSum}, must be > ${constraint.value}`
        };
      } else {
        return {
          complete,
          valid: !impossible,
          impossible,
          currentSum,
          expectedDescription: `Sum > ${constraint.value}`
        };
      }
    }

    case 'equal': {
      // All values in region must be identical
      let hasMismatch = false;
      if (values.length > 1) {
        const first = values[0];
        hasMismatch = values.some((v) => v !== first);
      }

      const impossible = hasMismatch;

      if (complete) {
        const valid = !hasMismatch;
        return {
          complete,
          valid,
          impossible,
          currentSum,
          expectedDescription: `All equal (=)`,
          errorReason: valid ? undefined : `All cells must contain the same value`
        };
      } else {
        return {
          complete,
          valid: !impossible,
          impossible,
          currentSum,
          expectedDescription: `All equal (=)`
        };
      }
    }

    case 'different': {
      // All values in region must be different
      const unique = new Set(values);
      const hasDuplicates = unique.size < values.length;
      const impossible = hasDuplicates;

      if (complete) {
        const valid = !hasDuplicates;
        return {
          complete,
          valid,
          impossible,
          currentSum,
          expectedDescription: `All different (≠)`,
          errorReason: valid ? undefined : `All cells must contain different values`
        };
      } else {
        return {
          complete,
          valid: !impossible,
          impossible,
          currentSum,
          expectedDescription: `All different (≠)`
        };
      }
    }
  }
}

/**
 * Evaluates all regions in the puzzle.
 */
export function evaluateAllRegions(
  puzzle: Puzzle,
  boardValues: Map<CellId, number | null>
): Map<string, RegionEvaluation> {
  const result = new Map<string, RegionEvaluation>();
  for (const region of puzzle.regions) {
    result.set(region.id, evaluateRegion(region, boardValues));
  }
  return result;
}

/**
 * Checks whether the puzzle is completely and correctly solved.
 */
export function isPuzzleSolved(
  puzzle: Puzzle,
  placements: DominoPlacement[]
): {
  solved: boolean;
  allCellsOccupied: boolean;
  allDominoesPlaced: boolean;
  evaluations: Map<string, RegionEvaluation>;
  invalidRegionIds: string[];
} {
  const allDominoesPlaced = placements.length === puzzle.dominoes.length;
  const boardValues = getBoardValues(puzzle, placements);

  let allCellsOccupied = true;
  for (const [, val] of boardValues) {
    if (val === null) {
      allCellsOccupied = false;
      break;
    }
  }

  const evaluations = evaluateAllRegions(puzzle, boardValues);
  const invalidRegionIds: string[] = [];

  for (const [regionId, evalRes] of evaluations) {
    // Only check regions that actually have a constraint
    const region = puzzle.regions.find((r) => r.id === regionId);
    if (region && region.constraint && !evalRes.valid) {
      invalidRegionIds.push(regionId);
    }
  }

  const solved = allCellsOccupied && allDominoesPlaced && invalidRegionIds.length === 0;

  return {
    solved,
    allCellsOccupied,
    allDominoesPlaced,
    evaluations,
    invalidRegionIds
  };
}
