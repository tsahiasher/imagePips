import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';

describe('Golden Regression Case: game10.jpg', () => {
  it('correctly reconstructs the 22-cell 11-domino puzzle with accurate >14, >9, >2, 9 and other rules', async () => {
    const imagePath = path.resolve(process.cwd(), 'game10.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    // 1. Invariants: 22 cells and 11 dominoes
    expect(puzzle.cells.length).toBe(22);
    expect(puzzle.dominoes.length).toBe(11);
    expect(puzzle.cells.length).toBe(puzzle.dominoes.length * 2);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    // 2. 11 condition badges detected
    expect(debugData.detectedBadges.length).toBe(11);

    const actualTokens = debugData.detectedBadges.map((b) => b.recognizedToken);
    const expectedTokens = [
      '>1', '>0', '>3',
      '5', '=', '1',
      '>2', '>14', '9',
      '>9', '4'
    ];
    expect(actualTokens).toEqual(expectedTokens);

    // Explicit checks on specific fixed badges:
    // Badge 8: '>14' on orange cells (greater than 14)
    const gt14Badge = debugData.detectedBadges.find((b) => b.id === 'badge_8');
    expect(gt14Badge?.recognizedToken).toBe('>14');
    expect(gt14Badge?.parsedConstraint).toEqual({ type: 'greaterThan', value: 14 });

    // Badge 7: '>2' on blue cell
    const gt2Badge = debugData.detectedBadges.find((b) => b.id === 'badge_7');
    expect(gt2Badge?.recognizedToken).toBe('>2');
    expect(gt2Badge?.parsedConstraint).toEqual({ type: 'greaterThan', value: 2 });

    // Badge 9: '9' on purple cells (sum 9)
    const sum9Badge = debugData.detectedBadges.find((b) => b.id === 'badge_9');
    expect(sum9Badge?.recognizedToken).toBe('9');
    expect(sum9Badge?.parsedConstraint).toEqual({ type: 'sum', value: 9 });

    // Badge 10: '>9' on teal cells
    const gt9Badge = debugData.detectedBadges.find((b) => b.id === 'badge_10');
    expect(gt9Badge?.recognizedToken).toBe('>9');
    expect(gt9Badge?.parsedConstraint).toEqual({ type: 'greaterThan', value: 9 });
  });
});
