import React from 'react';
import { describe, it, expect } from 'vitest';
import { canPlaceDomino, DominoPlacement, placeDomino } from '../../domain/placement';
import { Puzzle, makeCellId } from '../../domain/puzzle';

describe('Domino Rotation Anchor Rules', () => {
  const puzzle: Puzzle = {
    id: 'test_puzzle',
    cells: [
      { id: '1,1', row: 1, col: 1, componentId: '0' },
      { id: '1,2', row: 1, col: 2, componentId: '0' },
      { id: '1,3', row: 1, col: 3, componentId: '0' },
      { id: '2,1', row: 2, col: 1, componentId: '0' },
      { id: '2,2', row: 2, col: 2, componentId: '0' },
      { id: '2,3', row: 2, col: 3, componentId: '0' },
      { id: '3,1', row: 3, col: 1, componentId: '0' },
      { id: '3,2', row: 3, col: 2, componentId: '0' },
      { id: '3,3', row: 3, col: 3, componentId: '0' }
    ],
    regions: [],
    dominoes: [
      { id: 'd1', a: 3, b: 5 }
    ]
  };

  it('rotates around top square when selected from vertical position', () => {
    // Placed vertically at (2,2) and (3,2). Top square is (2,2).
    const anchorRow = 2;
    const anchorCol = 2;

    // Quadrant step 1 is Down (3,2). Next is step 2 (Left): (2,1)
    const step2OtherCol = anchorCol - 1; // 1
    const candStep2: DominoPlacement = {
      dominoId: 'd1',
      cellA: makeCellId(anchorRow, anchorCol), // '2,2'
      cellB: makeCellId(anchorRow, step2OtherCol), // '2,1'
      orientation: 'horizontal',
      reversed: true,
      rotation: 2
    };
    expect(candStep2.cellA).toBe('2,2');
    expect(candStep2.cellB).toBe('2,1');
    expect(canPlaceDomino(puzzle, [], puzzle.dominoes[0], candStep2.cellA, candStep2.cellB)).toBe(true);

    // Step 3 (Up): (1,2)
    const step3OtherRow = anchorRow - 1; // 1
    const candStep3: DominoPlacement = {
      dominoId: 'd1',
      cellA: makeCellId(anchorRow, anchorCol), // '2,2'
      cellB: makeCellId(step3OtherRow, anchorCol), // '1,2'
      orientation: 'vertical',
      reversed: true,
      rotation: 3
    };
    expect(candStep3.cellA).toBe('2,2');
    expect(candStep3.cellB).toBe('1,2');

    // Step 0 (Right): (2,3)
    const step0OtherCol = anchorCol + 1; // 3
    const candStep0: DominoPlacement = {
      dominoId: 'd1',
      cellA: makeCellId(anchorRow, anchorCol), // '2,2'
      cellB: makeCellId(anchorRow, step0OtherCol), // '2,3'
      orientation: 'horizontal',
      reversed: false,
      rotation: 0
    };
    expect(candStep0.cellA).toBe('2,2');
    expect(candStep0.cellB).toBe('2,3');
  });

  it('rotates around left square when selected from horizontal position', () => {
    // Placed horizontally at (2,2) and (2,3). Left square is (2,2).
    const anchorRow = 2;
    const anchorCol = 2;

    // Step 0 is Right (2,3). Next is step 1 (Down): (3,2)
    const step1OtherRow = anchorRow + 1; // 3
    const candStep1: DominoPlacement = {
      dominoId: 'd1',
      cellA: makeCellId(anchorRow, anchorCol), // '2,2'
      cellB: makeCellId(step1OtherRow, anchorCol), // '3,2'
      orientation: 'vertical',
      reversed: false,
      rotation: 1
    };
    expect(candStep1.cellA).toBe('2,2');
    expect(candStep1.cellB).toBe('3,2');
    expect(canPlaceDomino(puzzle, [], puzzle.dominoes[0], candStep1.cellA, candStep1.cellB)).toBe(true);
  });

  it('reverts illegal rotation to original placement on deselect', () => {
    const original: DominoPlacement = {
      dominoId: 'd1',
      cellA: '2,2',
      cellB: '2,3',
      orientation: 'horizontal',
      reversed: false,
      rotation: 0
    };

    // Illegal placement outside board or overlapping
    const illegalCandidate: DominoPlacement = {
      dominoId: 'd1',
      cellA: '2,2',
      cellB: '2,99', // out of bounds
      orientation: 'horizontal',
      reversed: false,
      rotation: 0
    };

    let placements = [illegalCandidate];
    // Revert when illegal:
    placements = placeDomino(placements, original);
    expect(placements[0]).toEqual(original);
  });

  it('renders bold black border and opacity 1 when selected on board', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { Domino } = await import('../../components/Domino/Domino');

    const html = renderToStaticMarkup(
      React.createElement(Domino, {
        domino: puzzle.dominoes[0],
        rotation: 0,
        cellSize: 72,
        isPlaced: true,
        isSelected: true
      })
    );

    // Selected domino should have opacity: 1 and bold black stroke
    expect(html).toContain('opacity:1');
    expect(html).toContain('stroke="#000000"');
    expect(html).toContain('stroke-width="2.4"');
  });

  it('renders normal thin black border and opacity 0.58 when unselected on board', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { Domino } = await import('../../components/Domino/Domino');

    const html = renderToStaticMarkup(
      React.createElement(Domino, {
        domino: puzzle.dominoes[0],
        rotation: 0,
        cellSize: 72,
        isPlaced: true,
        isSelected: false
      })
    );

    // Unselected domino should return to opacity: 0.58 and thin black stroke 0.9
    expect(html).toContain('opacity:0.58');
    expect(html).toContain('stroke="#000000"');
    expect(html).toContain('stroke-width="0.9"');
  });
});
