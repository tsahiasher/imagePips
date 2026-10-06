import { DominoPlacement } from './placement';
import { Puzzle } from './puzzle';

/**
 * Hard-coded 8-domino sample puzzle with:
 * - 2 disconnected components
 * - 1 hole at (1, 1)
 * - SUM, LESS THAN, GREATER THAN, EQUAL, and unconstrained conditions
 * - 16 playable cells = 8 dominoes
 */
export const SAMPLE_PUZZLE: Puzzle = {
  id: 'sample-dev-puzzle',
  name: 'Sample 8-Domino Dev Puzzle',
  cells: [
    // Component 1 (10 cells with hole at 1,1)
    { id: '0,0', row: 0, col: 0, componentId: 'comp_1' },
    { id: '0,1', row: 0, col: 1, componentId: 'comp_1' },
    { id: '0,2', row: 0, col: 2, componentId: 'comp_1' },
    { id: '0,3', row: 0, col: 3, componentId: 'comp_1' },
    { id: '1,0', row: 1, col: 0, componentId: 'comp_1' },
    // hole at (1,1)
    { id: '1,2', row: 1, col: 2, componentId: 'comp_1' },
    { id: '1,3', row: 1, col: 3, componentId: 'comp_1' },
    { id: '2,0', row: 2, col: 0, componentId: 'comp_1' },
    { id: '2,1', row: 2, col: 1, componentId: 'comp_1' },
    { id: '2,2', row: 2, col: 2, componentId: 'comp_1' },

    // Component 2 (6 cells, columns 5 to 7)
    { id: '0,5', row: 0, col: 5, componentId: 'comp_2' },
    { id: '0,6', row: 0, col: 6, componentId: 'comp_2' },
    { id: '0,7', row: 0, col: 7, componentId: 'comp_2' },
    { id: '1,5', row: 1, col: 5, componentId: 'comp_2' },
    { id: '1,6', row: 1, col: 6, componentId: 'comp_2' },
    { id: '1,7', row: 1, col: 7, componentId: 'comp_2' }
  ],
  regions: [
    {
      id: 'reg_equal',
      cellIds: ['0,0', '0,1'],
      color: '#0284c7', // Cyan
      constraint: { type: 'equal' }
    },
    {
      id: 'reg_sum11',
      cellIds: ['0,2', '0,3', '1,2', '1,3'],
      color: '#9333ea', // Purple
      constraint: { type: 'sum', value: 11 }
    },
    {
      id: 'reg_gt8',
      cellIds: ['1,0', '2,0', '2,1'],
      color: '#16a34a', // Green
      constraint: { type: 'greaterThan', value: 8 }
    },
    {
      id: 'reg_unconstrained',
      cellIds: ['2,2'],
      color: '#e2e8f0', // Neutral beige/grey
      constraint: null
    },
    {
      id: 'reg_lt3',
      cellIds: ['0,5', '1,5'],
      color: '#ea580c', // Orange
      constraint: { type: 'lessThan', value: 3 }
    },
    {
      id: 'reg_sum13',
      cellIds: ['0,6', '1,6', '0,7', '1,7'],
      color: '#db2777', // Pink
      constraint: { type: 'sum', value: 13 }
    }
  ],
  dominoes: [
    { id: 'd1', a: 6, b: 6 },
    { id: 'd2', a: 5, b: 4 },
    { id: 'd3', a: 4, b: 4 },
    { id: 'd4', a: 3, b: 2 },
    { id: 'd5', a: 1, b: 1 },
    { id: 'd6', a: 2, b: 0 },
    { id: 'd7', a: 5, b: 5 },
    { id: 'd8', a: 3, b: 0 }
  ]
};

/**
 * The known correct solution for the sample puzzle.
 */
export const SAMPLE_PUZZLE_SOLUTION: DominoPlacement[] = [
  { dominoId: 'd1', cellA: '0,0', cellB: '0,1', orientation: 'horizontal', reversed: false, rotation: 0 },
  { dominoId: 'd2', cellA: '0,2', cellB: '0,3', orientation: 'horizontal', reversed: false, rotation: 0 },
  { dominoId: 'd3', cellA: '2,1', cellB: '2,2', orientation: 'horizontal', reversed: false, rotation: 0 },
  { dominoId: 'd4', cellA: '1,0', cellB: '2,0', orientation: 'vertical', reversed: false, rotation: 1 },
  { dominoId: 'd5', cellA: '1,2', cellB: '1,3', orientation: 'horizontal', reversed: false, rotation: 0 },
  { dominoId: 'd6', cellA: '0,5', cellB: '1,5', orientation: 'vertical', reversed: false, rotation: 1 },
  { dominoId: 'd7', cellA: '0,6', cellB: '1,6', orientation: 'vertical', reversed: false, rotation: 1 },
  { dominoId: 'd8', cellA: '0,7', cellB: '1,7', orientation: 'vertical', reversed: false, rotation: 1 }
];

/**
 * An intentionally incorrect full placement for testing repair mode.
 * Here, d1 [6,6] and d2 [5,4] are swapped or rotated so that reg_equal has [5, 4] (not equal!)
 * and reg_sum11 has [6, 6, 1, 1] = 14 (not 11!).
 */
export const SAMPLE_PUZZLE_INCORRECT_FULL: DominoPlacement[] = [
  { dominoId: 'd2', cellA: '0,0', cellB: '0,1', orientation: 'horizontal', reversed: false, rotation: 0 },
  { dominoId: 'd1', cellA: '0,2', cellB: '0,3', orientation: 'horizontal', reversed: false, rotation: 0 },
  { dominoId: 'd3', cellA: '2,1', cellB: '2,2', orientation: 'horizontal', reversed: false, rotation: 0 },
  { dominoId: 'd4', cellA: '1,0', cellB: '2,0', orientation: 'vertical', reversed: false, rotation: 1 },
  { dominoId: 'd5', cellA: '1,2', cellB: '1,3', orientation: 'horizontal', reversed: false, rotation: 0 },
  { dominoId: 'd6', cellA: '0,5', cellB: '1,5', orientation: 'vertical', reversed: false, rotation: 1 },
  { dominoId: 'd7', cellA: '0,6', cellB: '1,6', orientation: 'vertical', reversed: false, rotation: 1 },
  { dominoId: 'd8', cellA: '0,7', cellB: '1,7', orientation: 'vertical', reversed: false, rotation: 1 }
];

/**
 * Accurate representation of game3.jpg:
 * 10 playable cells = 5 dominoes.
 * Row 0: empty, col 1..3
 * Row 1: col 0..1, col 2 unconstrained, empty
 * Row 2: col 0 unconstrained, col 2..3 teal
 * Row 3: col 3 orange
 */
export const GAME3_PRESET: Puzzle = {
  id: 'preset-game3',
  name: 'Game 3 (from screenshot)',
  cells: [
    { id: '0,1', row: 0, col: 1, componentId: 'comp_1' },
    { id: '0,2', row: 0, col: 2, componentId: 'comp_1' },
    { id: '0,3', row: 0, col: 3, componentId: 'comp_1' },
    { id: '1,0', row: 1, col: 0, componentId: 'comp_1' },
    { id: '1,1', row: 1, col: 1, componentId: 'comp_1' },
    { id: '1,2', row: 1, col: 2, componentId: 'comp_1' },
    { id: '2,0', row: 2, col: 0, componentId: 'comp_1' },
    { id: '2,2', row: 2, col: 2, componentId: 'comp_1' },
    { id: '2,3', row: 2, col: 3, componentId: 'comp_1' },
    { id: '3,3', row: 3, col: 3, componentId: 'comp_1' }
  ],
  regions: [
    {
      id: 'g3_purple',
      cellIds: ['0,1', '0,2', '0,3'],
      color: '#a855f7',
      constraint: { type: 'sum', value: 2 }
    },
    {
      id: 'g3_pink',
      cellIds: ['1,0', '1,1'],
      color: '#ec4899',
      constraint: { type: 'sum', value: 10 }
    },
    {
      id: 'g3_unconstrained',
      cellIds: ['1,2', '2,0'],
      color: '#64748b',
      constraint: null
    },
    {
      id: 'g3_teal',
      cellIds: ['2,2', '2,3'],
      color: '#14b8a6',
      constraint: { type: 'sum', value: 8 }
    },
    {
      id: 'g3_orange',
      cellIds: ['3,3'],
      color: '#f97316',
      constraint: { type: 'greaterThan', value: 2 }
    }
  ],
  dominoes: [
    { id: 'g3_d1', a: 0, b: 0 },
    { id: 'g3_d2', a: 6, b: 6 },
    { id: 'g3_d3', a: 5, b: 3 },
    { id: 'g3_d4', a: 4, b: 2 },
    { id: 'g3_d5', a: 3, b: 2 }
  ]
};
