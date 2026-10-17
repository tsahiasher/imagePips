import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';
import { formatConstraint } from '../../domain/constraints';
import { solvePuzzle } from '../../game/solver';

describe('Golden Regression Case: game12.jpg', () => {
  it('correctly reconstructs the 28-cell 14-domino 9x9 puzzle ("OFF") with accurate ≠ and = rules', async () => {
    const imagePath = path.resolve(process.cwd(), 'game12.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    // 1. Invariants
    expect(puzzle.cells.length).toBe(28);
    expect(puzzle.dominoes.length).toBe(14);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    // 2. Expected 15 condition tokens ordered row-by-row left-to-right
    const expectedTokens = [
      '4', '2',
      '8', '5',
      '3', '≠', '0',
      '5', '>1',
      '0', '5', '5', '=',
      '10',
      '='
    ];

    expect(debugData.detectedBadges.length).toBe(15);
    const actualTokens = debugData.detectedBadges.map((b) => b.recognizedToken);
    expect(actualTokens).toEqual(expectedTokens);

    // 3. Multiset of region constraints
    const actualRegionTokens = puzzle.regions
      .map((r) => formatConstraint(r.constraint))
      .filter((t) => t.length > 0)
      .sort();

    expect(actualRegionTokens).toEqual([...expectedTokens].sort());

    // 4. Mathematical solvability
    const solveRes = solvePuzzle(puzzle, 15000);
    expect(solveRes.solvable).toBe(true);
  });
});
