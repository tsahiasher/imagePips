import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';
import { formatConstraint } from '../../domain/constraints';

describe('Golden Regression Case: game1.jpg', () => {
  it('correctly reconstructs the 26-cell 13-domino puzzle with accurate rules, beige unconstrained squares, and merged green cells', async () => {
    const imagePath = path.resolve(process.cwd(), 'game1.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    // 1. Invariants
    expect(puzzle.cells.length).toBe(26);
    expect(puzzle.dominoes.length).toBe(13);
    expect(puzzle.cells.length).toBe(puzzle.dominoes.length * 2);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    // 2. Condition tokens multiset assertion
    // 10 constrained regions + 2 unconstrained beige regions = 12 regions total
    const conditionTokens = puzzle.regions
      .map((r) => formatConstraint(r.constraint))
      .filter((t) => t.length > 0)
      .sort();

    const expectedTokens = [
      '11',
      '<2',
      '7',
      '>2',
      '24',
      '=',
      '5',
      '0',
      '=',
      '>4',
      '<7',
      '<5'
    ].sort();

    expect(conditionTokens).toEqual(expectedTokens);

    // Regression checks against previous misclassifications:
    expect(conditionTokens).toContain('11'); // was 12
    expect(conditionTokens).toContain('7');  // was <2
    expect(conditionTokens).toContain('0');  // was missing
    expect(conditionTokens).toContain('5');  // was 10
    expect(conditionTokens).toContain('<5'); // was >2
    expect(conditionTokens).toContain('<7'); // was missing

    // 3. Circled beige unconstrained cells (0,5) and (1,4)
    const beigeRegions = puzzle.regions.filter((r) => r.color === '#dfccc4');
    expect(beigeRegions.length).toBe(2);
    for (const br of beigeRegions) {
      expect(br.constraint).toBeNull();
    }
    const beigeCellIds = beigeRegions.flatMap((r) => r.cellIds).sort();
    expect(beigeCellIds).toEqual(['0,5', '1,4'].sort());

    // 4. Merged green squares at bottom-right of 'G' (cells 4,6 and 4,7 with rule <5)
    const green5Region = puzzle.regions.find(
      (r) => formatConstraint(r.constraint) === '<5'
    );
    expect(green5Region).toBeDefined();
    expect(green5Region!.color).toBe('#84cc16');
    expect(green5Region!.cellIds.sort()).toEqual(['4,6', '4,7'].sort());
  });
});
