import { describe, expect, it } from 'vitest';
import path from 'path';
import { importPuzzleFromImage } from '../importPuzzle';
import { formatConstraint } from '../../domain/constraints';

describe('Golden Regression Case: game11.jpg', () => {
  it('correctly reconstructs the 28-cell 14-domino puzzle with accurate 6 and >8 rules', async () => {
    const imagePath = path.resolve(process.cwd(), 'samples', 'game11.jpg');

    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    console.log('game11 cells:', puzzle.cells.length, 'dominoes:', puzzle.dominoes.length);
    console.log('game11 badges:', debugData.detectedBadges.map((b) => ({
      id: b.id,
      token: b.recognizedToken,
      x: b.x,
      y: b.y,
      w: b.width,
      h: b.height,
      color: b.colorHex
    })));
    console.log('game11 regions:', puzzle.regions.map((r) => ({
      id: r.id,
      color: r.color,
      cells: r.cellIds,
      constraint: formatConstraint(r.constraint)
    })));

    expect(puzzle.cells.length).toBe(28);
    expect(puzzle.dominoes.length).toBe(14);
    expect(debugData.validation.valid).toBe(true);
    expect(debugData.validation.errors).toHaveLength(0);

    const expectedTokens = [
      '4',
      '1', '6',
      '5', '=', '2', '>8',
      '1', '≠',
      '0', '2', '>9', '='
    ];

    expect(debugData.detectedBadges.length).toBe(13);
    const actualTokens = debugData.detectedBadges.map((b) => b.recognizedToken);
    expect(actualTokens).toEqual(expectedTokens);
  });
});

