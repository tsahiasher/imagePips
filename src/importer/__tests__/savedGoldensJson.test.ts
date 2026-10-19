import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { serializePuzzle } from '../../domain/puzzle';
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
  'game12.jpg',
  'game13.jpg',
];

describe('Saved Golden JSON Regression Suite (game1.jpg - game13.jpg)', () => {
  const outDir = path.resolve(process.cwd(), 'golden_results');

  it('matches the saved per-game pips-build-puzzle v1 golden JSON output for all games 1 to 13', async () => {
    for (const gameFile of GAMES) {
      const baseName = path.basename(gameFile, path.extname(gameFile));
      const imagePath = path.resolve(process.cwd(), gameFile);
      const singleJsonPath = path.join(outDir, `${baseName}.json`);

      expect(fs.existsSync(singleJsonPath)).toBe(true);
      const savedSingle = JSON.parse(fs.readFileSync(singleJsonPath, 'utf-8'));

      const { puzzle, debugData } = await importPuzzleFromImage(imagePath);
      expect(debugData.validation.valid).toBe(true);

      const actualSnapshot = serializePuzzle(puzzle);
      expect(actualSnapshot).toEqual(savedSingle);
    }
  }, 30000);
});

