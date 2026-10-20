import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';

describe('Golden Regression Case: game8.jpg (PC Browser Screen Capture of game7)', () => {
  it('correctly reconstructs the 28-cell 14-domino puzzle with 3 sub-boards and unequal sign', async () => {
    const imagePath = path.resolve(process.cwd(), 'samples', 'game8.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    // 1. Invariants: 3 sub-boards and 14 dominoes
    expect(puzzle.cells.length).toBe(28);
    expect(puzzle.dominoes.length).toBe(14);
    expect(puzzle.cells.length).toBe(puzzle.dominoes.length * 2);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    // 2. 15 condition badges detected
    expect(debugData.detectedBadges.length).toBe(15);

    const unequalBadge = debugData.detectedBadges.find((b) => b.recognizedToken === '≠');
    expect(unequalBadge).toBeDefined();
    expect(unequalBadge?.parsedConstraint).toEqual({ type: 'different' });

    const actualTokens = debugData.detectedBadges.map((b) => b.recognizedToken);
    const expectedTokens = [
      '0', '4',
      '≠', '>7',
      '=', '4',
      '=', '3', '9', '14',
      '<4', '<3', '>4', '6',
      '6'
    ];
    expect(actualTokens).toEqual(expectedTokens);
  });
});
