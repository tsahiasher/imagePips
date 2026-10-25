import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';
import { formatConstraint } from '../../domain/constraints';
import { solvePuzzle } from '../../game/solver';
import { loadImageFromSource } from '../loadImage';
import { recognizeBadgeToken } from '../tokenRecognition';

describe('Golden Regression Case: game14.jpg', () => {
  it('correctly reconstructs the 32-cell 16-domino puzzle with accurate 3 and 1,4,4 rules', async () => {
    const imagePath = path.resolve(process.cwd(), 'samples', 'game14.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    expect(puzzle.cells.length).toBe(32);
    expect(puzzle.dominoes.length).toBe(16);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    const expectedTokens = [
      '2', '5', '3', '2', '5',
      '0', '0', '3', '4', '3',
      '3', '3', '3', '6', '2', '5',
      '1', '4', '4', '1', '2', '0',
      '0', '1', '5', '0', '1',
      '4', '5', '1', '4', '2'
    ];

    expect(debugData.detectedBadges.length).toBe(32);
    const actualTokens = debugData.detectedBadges.map((b) => b.recognizedToken);
    expect(actualTokens).toEqual(expectedTokens);

    // Center-left blue 3 (badge_11 at cell 2,0) must be '3', not '>3'
    const blue3Badge = debugData.detectedBadges.find((b) => b.id === 'badge_11');
    expect(blue3Badge?.recognizedToken).toBe('3');

    // Row below from left to right (badge_17, badge_18, badge_19) must start with '1', '4', '4'
    expect(debugData.detectedBadges[16].recognizedToken).toBe('1');
    expect(debugData.detectedBadges[17].recognizedToken).toBe('4');
    expect(debugData.detectedBadges[18].recognizedToken).toBe('4');

    const actualRegionTokens = puzzle.regions
      .map((r) => formatConstraint(r.constraint))
      .filter((t) => t.length > 0)
      .sort();
    expect(actualRegionTokens).toEqual([...expectedTokens].sort());

    const solveRes = solvePuzzle(puzzle, 15000);
    expect(solveRes.solvable).toBe(true);
  });

  it('recognizes badge_19 as 4 on mobile even when bottom crossbar fringe has center gap', async () => {
    const imagePath = path.resolve(process.cwd(), 'samples', 'game14.jpg');
    const { imageData } = await loadImageFromSource(imagePath);

    // Simulate mobile chroma/anti-aliasing shift on badge_19 (346, 820) where (349, 810) has G=220
    // and (345, 827) on the 4th crossbar row has G=200.
    const setPx = (x: number, y: number, r: number, g: number, b: number) => {
      const idx = (y * imageData.width + x) * 4;
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
    };
    setPx(349, 810, 255, 220, 250);
    setPx(345, 827, 237, 200, 231);

    const crop19 = { x: 346 - 32, y: 820 - 32, width: 64, height: 64 };
    const res19 = recognizeBadgeToken(imageData, crop19, 71, 70, '#ec4899');
    expect(res19.token).toBe('4');
  });
});
