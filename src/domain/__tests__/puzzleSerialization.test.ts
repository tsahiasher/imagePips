import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { solvePuzzle } from '../../game/solver';
import {
  deserializePuzzle,
  NEUTRAL_CELL_COLOR,
  PIPS_PALETTE_HEX,
  Puzzle,
  serializePuzzle
} from '../puzzle';

describe('pips-build-puzzle v1 serialization and deserialization', () => {
  it('serializes a Puzzle strictly to the pips-build-puzzle v1 schema', () => {
    const puzzle: Puzzle = {
      id: 'imported_123',
      name: 'Sample Puzzle',
      cells: [
        { id: '0,0', row: 0, col: 0, componentId: 'comp_1' },
        { id: '0,1', row: 0, col: 1, componentId: 'comp_1' },
        { id: '2,0', row: 2, col: 0, componentId: 'comp_2' },
        { id: '2,1', row: 2, col: 1, componentId: 'comp_2' }
      ],
      regions: [
        {
          id: 'reg_1',
          color: '#a855f7', // index 0
          cellIds: ['0,0', '0,1'],
          constraint: { type: 'sum', value: 8 },
          labelAnchor: { x: 1.5, y: 0.8 }
        },
        {
          id: 'reg_2',
          color: '#dfccc4', // unconstrained neutral region -> omitted
          cellIds: ['2,0', '2,1'],
          constraint: null
        }
      ],
      dominoes: [
        { id: 'd_1', a: 6, b: 6 },
        { id: 'd_2', a: 3, b: 5 }
      ]
    };

    const serialized = serializePuzzle(puzzle);
    expect(serialized).toEqual({
      format: 'pips-build-puzzle',
      version: 1,
      rows: 3,
      cols: 2,
      cells: ['0,0', '0,1', '2,0', '2,1'],
      regions: [
        {
          color: 0,
          cells: ['0,0', '0,1'],
          condition: '8'
        }
      ],
      dominoes: [
        [6, 6],
        [3, 5]
      ]
    });
    expect('id' in serialized).toBe(false);
    expect('name' in serialized).toBe(false);
  });

  it('deserializes pips-build-puzzle v1 JSON with dynamic componentId, palette colors, != alias, and default neutral cells', () => {
    const raw = {
      format: 'pips-build-puzzle',
      version: 1,
      rows: 3,
      cols: 2,
      cells: ['0,0', '0,1', '2,0', '2,1'],
      regions: [
        {
          color: 1, // #ec4899
          cells: ['0,0', '0,1'],
          condition: '!='
        }
      ],
      dominoes: [
        [6, 2],
        [3, 5]
      ]
    };

    const puzzle = deserializePuzzle(raw);
    expect(puzzle.cells).toEqual([
      { id: '0,0', row: 0, col: 0, componentId: 'comp_1' },
      { id: '0,1', row: 0, col: 1, componentId: 'comp_1' },
      { id: '2,0', row: 2, col: 0, componentId: 'comp_2' },
      { id: '2,1', row: 2, col: 1, componentId: 'comp_2' }
    ]);

    expect(puzzle.regions).toEqual([
      {
        id: 'region_1',
        color: PIPS_PALETTE_HEX[1],
        cellIds: ['0,0', '0,1'],
        constraint: { type: 'different' }
      },
      {
        id: 'region_2',
        color: NEUTRAL_CELL_COLOR,
        cellIds: ['2,0', '2,1'],
        constraint: null
      }
    ]);

    expect(puzzle.dominoes).toEqual([
      { id: 'd_1', a: 6, b: 2 },
      { id: 'd_2', a: 3, b: 5 }
    ]);
  });

  it('round-trips all 14 golden puzzles through pips-build-puzzle v1 preserving solvability and solution count', () => {
    for (let i = 1; i <= 14; i++) {
      const goldenPath = path.resolve(process.cwd(), 'golden_results', `game${i}.json`);
      const legacyRaw = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));
      const legacyPuzzle = deserializePuzzle(legacyRaw);

      const v1 = serializePuzzle(legacyPuzzle);
      expect(v1.format).toBe('pips-build-puzzle');
      expect(v1.version).toBe(1);

      const roundTripped = deserializePuzzle(JSON.stringify(v1));
      const solveBefore = solvePuzzle(legacyPuzzle, 60000, 100);
      const solveAfter = solvePuzzle(roundTripped, 60000, 100);

      expect(solveAfter.solvable).toBe(true);
      expect(solveAfter.solutionCount).toBe(solveBefore.solutionCount);
    }
  });
});
