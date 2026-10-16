import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';

const GAMES = [
  'game1.jpg',
  'game2.jpg',
  'game3.jpg',
  'game4.jpg',
  'game5.jpg',
  'game6.jpg',
  'game7.jpg',
  'game8.jpg',
  'game9.jpg',
  'game10.jpg',
  'game11.jpg',
];

function serializeGoldenSnapshot(
  gameFile: string,
  puzzle: Awaited<ReturnType<typeof importPuzzleFromImage>>['puzzle'],
  debugData: Awaited<ReturnType<typeof importPuzzleFromImage>>['debugData']
) {
  return {
    game: gameFile,
    validation: {
      valid: debugData.validation.valid,
      errors: debugData.validation.errors,
      warnings: debugData.validation.warnings,
    },
    counts: {
      cells: puzzle.cells.length,
      dominoes: puzzle.dominoes.length,
      regions: puzzle.regions.length,
      badges: debugData.detectedBadges.length,
    },
    badges: debugData.detectedBadges.map((b) => ({
      id: b.id,
      x: b.x,
      y: b.y,
      colorHex: b.colorHex,
      recognizedToken: b.recognizedToken,
      parsedConstraint: b.parsedConstraint,
    })),
    regions: puzzle.regions.map((r) => ({
      id: r.id,
      color: r.color,
      cellCount: r.cellIds.length,
      cellIds: r.cellIds,
      constraint: r.constraint,
    })),
    dominoes: puzzle.dominoes.map((d) => ({
      id: d.id,
      a: d.a,
      b: d.b,
      values: [d.a, d.b],
    })),
    cells: puzzle.cells.map((c) => ({
      id: c.id,
      row: c.row,
      col: c.col,
      componentId: c.componentId,
    })),
  };
}

describe('Saved Golden JSON Regression Suite (game1.jpg - game11.jpg)', () => {
  const outDir = path.resolve(process.cwd(), 'golden_results');

  it('matches the saved per-game golden JSON output for all games 1 to 11', async () => {
    for (const gameFile of GAMES) {
      const baseName = path.basename(gameFile, path.extname(gameFile));
      const imagePath = path.resolve(process.cwd(), gameFile);
      const singleJsonPath = path.join(outDir, `${baseName}.json`);

      expect(fs.existsSync(singleJsonPath)).toBe(true);
      const savedSingle = JSON.parse(fs.readFileSync(singleJsonPath, 'utf-8'));

      const { puzzle, debugData } = await importPuzzleFromImage(imagePath);
      const actualSnapshot = serializeGoldenSnapshot(gameFile, puzzle, debugData);

      expect(actualSnapshot).toEqual(savedSingle);
    }
  }, 30000);
});
