import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';
import { formatConstraint } from '../../domain/constraints';

describe('Golden Regression Case: game3.jpg', () => {
  it('correctly reconstructs the 10-cell 5-domino puzzle with valid colors and rules', async () => {
    const imagePath = path.resolve(process.cwd(), 'game3.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    // 1. Invariant assertions
    expect(puzzle.cells.length).toBe(10);
    expect(puzzle.dominoes.length).toBe(5);
    expect(puzzle.cells.length).toBe(puzzle.dominoes.length * 2);

    // Validation must pass without errors
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    // 2. Board cell colors assertion
    // Every region must have a valid 7-character CSS hex color (#rrggbb)
    for (const reg of puzzle.regions) {
      expect(reg.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }

    // 3. Condition badges assertion
    // Expected rule tokens: ['2', '10', '8', '>2']
    const conditionTokens = puzzle.regions
      .map((r) => formatConstraint(r.constraint))
      .filter((t) => t.length > 0)
      .sort();

    const expectedTokens = ['2', '10', '8', '>2'].sort();
    expect(conditionTokens).toEqual(expectedTokens);

    // Explicit regression checks against reported errors:
    // - Token '2' must NOT be misrecognized as '5'
    // - Token '>2' must NOT be misrecognized as '12'
    expect(conditionTokens).toContain('2');
    expect(conditionTokens).toContain('>2');
    expect(conditionTokens).not.toContain('12');

    // - Unconstrained neutral cells (1,2) and (2,0) must be warm beige (#dfccc4) with no constraints
    // and must NOT be misclassified as orange (#f97316)
    const cell12Region = puzzle.regions.find((r) => r.cellIds.includes('1,2'));
    const cell20Region = puzzle.regions.find((r) => r.cellIds.includes('2,0'));
    expect(cell12Region).toBeDefined();
    expect(cell20Region).toBeDefined();
    expect(cell12Region?.color).toBe('#dfccc4');
    expect(cell20Region?.color).toBe('#dfccc4');
    expect(cell12Region?.constraint).toBeNull();
    expect(cell20Region?.constraint).toBeNull();

    // Only cell 3,3 should be orange (#f97316) with >2 constraint
    const cell33Region = puzzle.regions.find((r) => r.cellIds.includes('3,3'));
    expect(cell33Region).toBeDefined();
    expect(cell33Region?.color).toBe('#f97316');
  });
});
