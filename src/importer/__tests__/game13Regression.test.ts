import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';
import { formatConstraint } from '../../domain/constraints';
import { solvePuzzle } from '../../game/solver';

describe('Golden Regression Case: game13.jpg', () => {
  it('correctly reconstructs the 20-cell 10-domino puzzle with accurate >11 rule', async () => {
    const imagePath = path.resolve(process.cwd(), 'game13.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    expect(puzzle.cells.length).toBe(20);
    expect(puzzle.dominoes.length).toBe(10);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    const expectedTokens = [
      '=', '2', '6',
      '6',
      '>11', '>1', '2',
      '10', '<6', '6', '>2'
    ];

    expect(debugData.detectedBadges.length).toBe(11);
    const actualTokens = debugData.detectedBadges.map((b) => b.recognizedToken);
    expect(actualTokens).toEqual(expectedTokens);

    const actualRegionTokens = puzzle.regions
      .map((r) => formatConstraint(r.constraint))
      .filter((t) => t.length > 0)
      .sort();

    expect(actualRegionTokens).toEqual([...expectedTokens].sort());

    const solveRes = solvePuzzle(puzzle, 15000);
    expect(solveRes.solvable).toBe(true);
  });

  it('recognizes >1 badge accurately instead of >5 when serifed 1 aspect ratio >= 0.60 on mobile screenshots', async () => {
    const imagePath = path.resolve(process.cwd(), 'game13.jpg');
    const { loadImageFromSource } = await import('../loadImage');
    const { recognizeBadgeToken } = await import('../tokenRecognition');
    const { imageData } = await loadImageFromSource(imagePath);

    // Simulate mobile PNG screenshot without WhatsApp 4:2:0 JPEG vertical chroma bleed on badge_6 (>1 at 266,794),
    // where the full 11px bottom serif is preserved and height is 16-17px (rightW / rightH >= 0.60).
    const cx = 266;
    const cy = 794;
    const setPx = (x: number, y: number, r: number, g: number, b: number) => {
      const idx = (y * imageData.width + x) * 4;
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
    };
    setPx(cx + 5, cy + 10, 255, 255, 255);
    setPx(cx + 5, cy + 11, 255, 255, 255);
    for (let dx = 5; dx <= 15; dx++) {
      setPx(cx + dx, cy - 6, 100, 150, 20);
      setPx(cx + dx, cy - 5, 100, 150, 20);
      setPx(cx + dx, cy + 12, 100, 150, 20);
    }

    const cropBox = { x: cx - 28, y: cy - 28, width: 56, height: 56 };
    const res = recognizeBadgeToken(imageData, cropBox, 65, 65, '#84cc16');
    expect(res.token).toBe('>1');
  });
});
