import fs from 'node:fs';
import path from 'node:path';
import jpeg from 'jpeg-js';
import { describe, expect, it } from 'vitest';
import { formatConstraint } from '../../domain/constraints';
import { deserializePuzzle, Puzzle, serializePuzzle } from '../../domain/puzzle';
import { solvePuzzle } from '../../game/solver';
import type { RGBAImage } from '../image';
import { recognize } from '../recognize';

const GAMES = [
  'game1',
  'game2',
  'game3',
  'game4',
  'game5',
  'game6',
  'game7',
  'game8',
  'game9',
  'game10',
  'game11',
  'game12',
  'game13',
  'game14',
];

function loadSample(name: string): RGBAImage {
  const imgPath = path.resolve(process.cwd(), 'samples', `${name}.jpg`);
  const raw = jpeg.decode(fs.readFileSync(imgPath), { useTArray: true, formatAsRGBA: true });
  return { width: raw.width, height: raw.height, data: raw.data };
}

function canonicalPuzzle(p: Puzzle) {
  const r0 = Math.min(...p.cells.map((c) => c.row));
  const c0 = Math.min(...p.cells.map((c) => c.col));
  const norm = (id: string) => {
    const [r, c] = id.split(',').map(Number);
    return `${r - r0},${c - c0}`;
  };
  return {
    cells: p.cells.map((c) => norm(c.id)).sort(),
    regions: p.regions
      .filter((r) => r.constraint !== null)
      .map((r) => `${r.cellIds.map(norm).sort().join(' ')} => ${formatConstraint(r.constraint)}`)
      .sort(),
    dominoes: p.dominoes.map((d) => `${d.a}${d.b}`),
  };
}

describe('Vision Recognition Suite (game1 - game14)', () => {
  for (const name of GAMES) {
    it(`reconstructs ${name}.jpg matching its golden and is mathematically solvable`, async () => {
      const img = loadSample(name);
      const res = await recognize(img);

      expect(res.warnings).toEqual([]);
      expect(res.puzzle.cells.length).toBe(res.puzzle.dominoes.length * 2);

      const goldenPath = path.resolve(process.cwd(), 'golden_results', `${name}.json`);
      const goldenRaw = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));
      const goldenPuzzle = deserializePuzzle(goldenRaw);

      expect(canonicalPuzzle(res.puzzle)).toEqual(canonicalPuzzle(goldenPuzzle));
      expect(serializePuzzle(res.puzzle)).toEqual(goldenRaw);

      const solveRes = solvePuzzle(res.puzzle, 200000, 1);
      expect(solveRes.solvable).toBe(true);
    });
  }
});
