import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { Puzzle } from '../../domain/puzzle';
import { isPuzzleSolved } from '../constraintEngine';
import { solvePuzzle } from '../solver';

describe('solvePuzzle on golden games 1-11', () => {
  for (let i = 1; i <= 11; i++) {
    const gameName = `game${i}`;
    it(`solves ${gameName} quickly and produces a valid solution`, () => {
      const goldenPath = path.resolve(process.cwd(), 'golden_results', `${gameName}.json`);
      const puzzle = JSON.parse(fs.readFileSync(goldenPath, 'utf-8')) as Puzzle;

      const t0 = performance.now();
      const result = solvePuzzle(puzzle);
      const elapsed = performance.now() - t0;

      expect(result.solvable).toBe(true);
      expect(result.solution).toBeDefined();
      expect(elapsed).toBeLessThan(500);

      const check = isPuzzleSolved(puzzle, result.solution!);
      expect(check.solved).toBe(true);
    });
  }
});
