import { describe, expect, it } from 'vitest';
import { areCellsAdjacent, computeConnectedComponents, makeCellId, parseCellId } from '../puzzle';

describe('Puzzle Geometry and Topology', () => {
  it('correctly creates and parses cell IDs', () => {
    const id = makeCellId(3, 7);
    expect(id).toBe('3,7');
    expect(parseCellId(id)).toEqual({ row: 3, col: 7 });
  });

  it('correctly tests cell adjacency', () => {
    const cellA = { id: '0,0', row: 0, col: 0, componentId: 'comp_1' };
    const cellB = { id: '0,1', row: 0, col: 1, componentId: 'comp_1' };
    const cellC = { id: '1,1', row: 1, col: 1, componentId: 'comp_1' };
    const cellFar = { id: '2,2', row: 2, col: 2, componentId: 'comp_1' };

    expect(areCellsAdjacent(cellA, cellB)).toBe(true);
    expect(areCellsAdjacent(cellB, cellC)).toBe(true);
    expect(areCellsAdjacent(cellA, cellC)).toBe(false); // Diagonal
    expect(areCellsAdjacent(cellA, cellFar)).toBe(false);
  });

  it('detects disconnected components and holes accurately', () => {
    // Component 1: 4 cells in 2x2 with one hole -> L shape
    // (0,0), (0,1), (1,0) - (1,1 is hole!)
    // Component 2: separated by 3 columns: (0,5), (0,6)
    const cells = [
      { id: '0,0', row: 0, col: 0 },
      { id: '0,1', row: 0, col: 1 },
      { id: '1,0', row: 1, col: 0 },
      { id: '0,5', row: 0, col: 5 },
      { id: '0,6', row: 0, col: 6 }
    ];

    const components = computeConnectedComponents(cells);
    const comp1 = components.get('0,0');
    expect(comp1).toBeDefined();
    expect(components.get('0,1')).toBe(comp1);
    expect(components.get('1,0')).toBe(comp1);

    const comp2 = components.get('0,5');
    expect(comp2).toBeDefined();
    expect(components.get('0,6')).toBe(comp2);

    expect(comp1).not.toBe(comp2);
  });
});
