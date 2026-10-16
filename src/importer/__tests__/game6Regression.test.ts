import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';
import { formatConstraint } from '../../domain/constraints';

describe('Golden Regression Case: game6.jpg', () => {
  it('correctly reconstructs the 32-cell 16-domino puzzle with accurate digit 9 and 10 rules', async () => {
    const imagePath = path.resolve(process.cwd(), 'game6.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    // 1. Invariants
    expect(puzzle.cells.length).toBe(32);
    expect(puzzle.dominoes.length).toBe(16);
    expect(puzzle.cells.length).toBe(puzzle.dominoes.length * 2);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    // 2. Expected 30 condition tokens ordered row-by-row left-to-right
    const expectedTokens = [
      // Row 1
      '2', '3', '2', '3',
      // Row 2
      '1', '10', '5', '4', '3',
      // Row 3
      '4', '2', '4', '1', '2', '0',
      // Row 4
      '1', '1', '0', '5', '0',
      // Row 5 (contains digit 9 at x=527, y=910)
      '3', '5', '0', '1', '9', '3',
      // Row 6
      '3', '5', '2', '0'
    ];

    expect(debugData.detectedBadges.length).toBe(30);

    const actualBadgeTokens = debugData.detectedBadges.map((b) => b.recognizedToken);
    expect(actualBadgeTokens).toEqual(expectedTokens);

    // Explicit check on badge 25 ('9', orange) and badge 6 ('10', lime)
    const badge9 = debugData.detectedBadges.find((b) => Math.round(b.x) === 527 && Math.round(b.y) === 910);
    expect(badge9).toBeDefined();
    expect(badge9?.recognizedToken).toBe('9');

    const badge10 = debugData.detectedBadges.find((b) => Math.round(b.x) === 345 && Math.round(b.y) === 639);
    expect(badge10).toBeDefined();
    expect(badge10?.recognizedToken).toBe('10');

    // 3. Multiset of region constraints
    const actualRegionTokens = puzzle.regions
      .map((r) => formatConstraint(r.constraint))
      .filter((t) => t.length > 0)
      .sort();

    expect(actualRegionTokens).toEqual([...expectedTokens].sort());
  });
});
