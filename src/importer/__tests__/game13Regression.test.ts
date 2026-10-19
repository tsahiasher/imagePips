import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';
import { formatConstraint } from '../../domain/constraints';
import { solvePuzzle } from '../../game/solver';

describe('Golden Regression Case: game13.jpg', () => {
  it('correctly reconstructs the 20-cell 10-domino puzzle with accurate >11 rule', async () => {
    const imagePath = path.resolve(process.cwd(), 'game13.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    expect(puzzle.cells.length).toBe(20);
    expect(puzzle.dominoes.length).toBe(10);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    const expectedTokens = [
      '=', '2', '6',
      '6',
      '>11', '>1', '2',
      '10', '<6', '6', '>2'
    ];

    expect(debugData.detectedBadges.length).toBe(11);
    const actualTokens = debugData.detectedBadges.map((b) => b.recognizedToken);
    expect(actualTokens).toEqual(expectedTokens);

    const actualRegionTokens = puzzle.regions
      .map((r) => formatConstraint(r.constraint))
      .filter((t) => t.length > 0)
      .sort();

    expect(actualRegionTokens).toEqual([...expectedTokens].sort());

    const solveRes = solvePuzzle(puzzle, 15000);
    expect(solveRes.solvable).toBe(true);
  });
});
