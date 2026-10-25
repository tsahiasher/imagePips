import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { deserializePuzzle, Puzzle } from '../../domain/puzzle';
import { isPuzzleSolved } from '../constraintEngine';
import { solvePuzzle } from '../solver';

describe('solvePuzzle on golden games 1-14', () => {
  for (let i = 1; i <= 14; i++) {
    const gameName = `game${i}`;
    it(`solves ${gameName} quickly and produces a valid solution`, () => {
      const goldenPath = path.resolve(process.cwd(), 'golden_results', `${gameName}.json`);
      const puzzle = deserializePuzzle(fs.readFileSync(goldenPath, 'utf-8'));

      const t0 = performance.now();
      const result = solvePuzzle(puzzle, 60000, 100);
      const elapsed = performance.now() - t0;
      console.log(`${gameName}: solvable=${result.solvable}, count=${result.solutionCount}, capped=${result.capped}, timedOut=${result.timedOut}, steps=${result.stepsExplored}, ms=${elapsed.toFixed(1)}`);

      expect(result.solvable).toBe(true);
      expect(result.solutionCount).toBeGreaterThanOrEqual(1);
      expect(result.solution).toBeDefined();
      expect(elapsed).toBeLessThan(500);

      const check = isPuzzleSolved(puzzle, result.solution!);
      expect(check.solved).toBe(true);
    });
  }

  it('does not count symmetric domino flips within the same region as distinct solutions', () => {
    const puzzle: Puzzle = {
      id: 'symmetry_test',
      name: 'Symmetry Test',
      cells: [
        { id: '0,0', row: 0, col: 0, componentId: 'comp_1' },
        { id: '0,1', row: 0, col: 1, componentId: 'comp_1' },
      ],
      regions: [
        {
          id: 'reg_1',
          color: '#a855f7',
          cellIds: ['0,0', '0,1'],
          constraint: { type: 'sum', value: 5 },
          labelAnchor: { x: 1, y: 0 },
        },
      ],
      dominoes: [{ id: 'd_1', a: 2, b: 3 }],
    };

    const result = solvePuzzle(puzzle, 5000, 100);
    expect(result.solvable).toBe(true);
    expect(result.solutionCount).toBe(1);
  });
});

