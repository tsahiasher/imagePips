import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';

describe('Golden Regression Case: game7.jpg (Multi-part board with unequal condition)', () => {
  it('correctly reconstructs the 28-cell 14-domino puzzle with 3 sub-boards and unequal sign', async () => {
    const imagePath = path.resolve(process.cwd(), 'game7.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    console.log('gridRows:', debugData.gridRows, 'gridCols:', debugData.gridCols);
    console.log('boardBox:', debugData.boardBox);
    console.log('detectedBadges:', debugData.detectedBadges.map(b => ({ id: b.id, token: b.recognizedToken, x: b.x, y: b.y })));

    // 1. Invariants
    expect(puzzle.cells.length).toBe(28);
    expect(puzzle.dominoes.length).toBe(14);
    expect(puzzle.cells.length).toBe(puzzle.dominoes.length * 2);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    // 2. Expected 15 condition tokens
    const expectedTokens = [
      '0', '4',
      '≠', '>7',
      '=', '4',
      '=', '3', '9', '14',
      '<4', '<3', '>4', '6',
      '6'
    ];

    expect(debugData.detectedBadges.length).toBe(15);
    const actualBadgeTokens = debugData.detectedBadges.map((b) => b.recognizedToken);
    expect(actualBadgeTokens).toEqual(expectedTokens);

    // Check specific critical tokens
    const unequalBadge = debugData.detectedBadges.find((b) => b.recognizedToken === '≠');
    expect(unequalBadge).toBeDefined();

    const lessThanThreeBadge = debugData.detectedBadges.find((b) => b.recognizedToken === '<3');
    expect(lessThanThreeBadge).toBeDefined();

    const fourteenBadge = debugData.detectedBadges.find((b) => b.recognizedToken === '14');
    expect(fourteenBadge).toBeDefined();
  });
});
