import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';
import { formatConstraint } from '../../domain/constraints';

describe('Golden Regression Case: game4.jpg', () => {
  it('correctly reconstructs the 32-cell 16-domino puzzle with accurate single-digit rules', async () => {
    const imagePath = path.resolve(process.cwd(), 'samples', 'game4.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    // 1. Invariants
    expect(puzzle.cells.length).toBe(32);
    expect(puzzle.dominoes.length).toBe(16);
    expect(puzzle.cells.length).toBe(puzzle.dominoes.length * 2);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    // 2. Expected 32 condition tokens ordered row-by-row left-to-right
    const expectedTokens = [
      '3', '3', '0', '4',
      '4', '4', '2', '1', '0', '0',
      '2', '0', '1', '1', '3', '2',
      '5', '5', '3', '3', '6', '3',
      '4', '1', '0', '2', '2', '5',
      '4', '5', '1', '5'
    ];

    expect(debugData.detectedBadges.length).toBe(32);

    const actualBadgeTokens = debugData.detectedBadges.map((b) => b.recognizedToken);
    expect(actualBadgeTokens).toEqual(expectedTokens);

    // 3. Multiset of region constraints
    const actualRegionTokens = puzzle.regions
      .map((r) => formatConstraint(r.constraint))
      .filter((t) => t.length > 0)
      .sort();

    expect(actualRegionTokens).toEqual([...expectedTokens].sort());
  });
});

