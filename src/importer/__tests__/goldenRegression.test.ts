import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';
import { formatConstraint } from '../../domain/constraints';

describe('Golden Regression Case: game2.jpg', () => {
  it('correctly reconstructs the 14-cell 7-domino puzzle from game2.jpg without stale state', async () => {
    const imagePath = path.resolve(process.cwd(), 'game2.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    // 1. Invariant assertions
    expect(puzzle.cells.length).toBe(14);
    expect(puzzle.dominoes.length).toBe(7);
    expect(puzzle.cells.length).toBe(puzzle.dominoes.length * 2);

    // Validation must pass without errors
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    // 2. Topology assertions
    // Expected sparse 4x4 topology:
    // row 0: . . # #
    // row 1: # # # #
    // row 2: # # # #
    // row 3: # # # #
    const cellCoords = new Set(puzzle.cells.map((c) => `${c.row},${c.col}`));

    // Row 0
    expect(cellCoords.has('0,0')).toBe(false);
    expect(cellCoords.has('0,1')).toBe(false);
    expect(cellCoords.has('0,2')).toBe(true);
    expect(cellCoords.has('0,3')).toBe(true);

    // Row 1
    expect(cellCoords.has('1,0')).toBe(true);
    expect(cellCoords.has('1,1')).toBe(true);
    expect(cellCoords.has('1,2')).toBe(true);
    expect(cellCoords.has('1,3')).toBe(true);

    // Row 2
    expect(cellCoords.has('2,0')).toBe(true);
    expect(cellCoords.has('2,1')).toBe(true);
    expect(cellCoords.has('2,2')).toBe(true);
    expect(cellCoords.has('2,3')).toBe(true);

    // Row 3
    expect(cellCoords.has('3,0')).toBe(true);
    expect(cellCoords.has('3,1')).toBe(true);
    expect(cellCoords.has('3,2')).toBe(true);
    expect(cellCoords.has('3,3')).toBe(true);

    // 3. Condition tokens multiset assertion
    // Expected: ["=", "=", "=", "<2", "<4", "12", "5", "10"]
    const conditionTokens = puzzle.regions
      .map((r) => formatConstraint(r.constraint))
      .filter((t) => t.length > 0)
      .sort();

    const expectedTokens = ['=', '=', '=', '<2', '<4', '12', '5', '10'].sort();
    expect(conditionTokens).toEqual(expectedTokens);

    // 4. Stale-data regression assertions: NEVER produce 24, 7, >2 on this image
    expect(conditionTokens).not.toContain('24');
    expect(conditionTokens).not.toContain('7');
    expect(conditionTokens).not.toContain('>2');

    // 5. Domino inventory multiset assertion
    // Expected 7 dominoes: 4|4, 6|1, 5|0, 1|3, 5|5, 6|2, 2|5
    const canonicalDominoes = puzzle.dominoes
      .map((d) => [Math.min(d.a, d.b), Math.max(d.a, d.b)].join('|'))
      .sort();

    const expectedDominoes = [
      [4, 4],
      [1, 6],
      [0, 5],
      [1, 3],
      [5, 5],
      [2, 6],
      [2, 5]
    ]
      .map((pair) => [Math.min(pair[0], pair[1]), Math.max(pair[0], pair[1])].join('|'))
      .sort();

    expect(canonicalDominoes).toEqual(expectedDominoes);

    // 6. Multi-cell region integrity assertions:
    // Region for sum 5 must contain both ['3,1', '3,2']
    const reg5 = puzzle.regions.find((r) => formatConstraint(r.constraint) === '5');
    expect(reg5).toBeDefined();
    expect(reg5!.cellIds.sort()).toEqual(['3,1', '3,2'].sort());

    // Region for sum 10 must contain both ['2,3', '3,3']
    const reg10 = puzzle.regions.find((r) => formatConstraint(r.constraint) === '10');
    expect(reg10).toBeDefined();
    expect(reg10!.cellIds.sort()).toEqual(['2,3', '3,3'].sort());
  });
});
