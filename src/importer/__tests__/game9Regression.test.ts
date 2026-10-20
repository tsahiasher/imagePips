import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';

describe('Golden Regression Case: game9.jpg', () => {
  it('correctly reconstructs the 16-cell 8-domino puzzle with accurate rules and equal signs', async () => {
    const imagePath = path.resolve(process.cwd(), 'samples', 'game9.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    // 1. Invariants: 16 cells and 8 dominoes
    expect(puzzle.cells.length).toBe(16);
    expect(puzzle.dominoes.length).toBe(8);
    expect(puzzle.cells.length).toBe(puzzle.dominoes.length * 2);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    // 2. 8 condition badges detected
    expect(debugData.detectedBadges.length).toBe(8);

    const actualTokens = debugData.detectedBadges.map((b) => b.recognizedToken);
    const expectedTokens = [
      '<4', '=', '=',
      '=', '<1', '6',
      '3', '20'
    ];
    expect(actualTokens).toEqual(expectedTokens);

    // Verify equal signs have equal constraints
    const equalBadges = debugData.detectedBadges.filter((b) => b.recognizedToken === '=');
    expect(equalBadges.length).toBe(3);
    for (const eb of equalBadges) {
      expect(eb.parsedConstraint).toEqual({ type: 'equal' });
    }
  });
});
