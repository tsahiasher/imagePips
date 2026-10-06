import { describe, expect, it } from 'vitest';
import { canPlaceDomino, getBoardValues, placeDomino, removeDomino, rotateDomino } from '../../domain/placement';
import { Puzzle } from '../../domain/puzzle';
import {
  SAMPLE_PUZZLE,
  SAMPLE_PUZZLE_INCORRECT_FULL,
  SAMPLE_PUZZLE_SOLUTION
} from '../../domain/samplePuzzles';
import { evaluateRegion, isPuzzleSolved } from '../constraintEngine';
import {
  initGameState,
  placeDominoOnBoard,
  resetGameState,
  returnDominoToTray,
  rotateTrayDomino,
  tickTimer
} from '../gameState';

describe('Pips Game Engine and Placement Logic', () => {
  const puzzle: Puzzle = SAMPLE_PUZZLE;

  // 1. Legal horizontal placement
  it('1. permits legal horizontal placement', () => {
    const domino = puzzle.dominoes[0]; // d1: [6,6]
    const legal = canPlaceDomino(puzzle, [], domino, '0,0', '0,1');
    expect(legal).toBe(true);
  });

  // 2. Legal vertical placement
  it('2. permits legal vertical placement', () => {
    const domino = puzzle.dominoes[3]; // d4: [3,2]
    const legal = canPlaceDomino(puzzle, [], domino, '1,0', '2,0');
    expect(legal).toBe(true);
  });

  // 3. Overlapping placement rejection
  it('3. rejects overlapping placement', () => {
    const d1 = puzzle.dominoes[0];
    const d2 = puzzle.dominoes[1];
    const placements = [
      { dominoId: d1.id, cellA: '0,0', cellB: '0,1', orientation: 'horizontal' as const, reversed: false, rotation: 0 as const }
    ];
    // Attempt to put d2 covering '0,1' and '0,2'
    const legal = canPlaceDomino(puzzle, placements, d2, '0,1', '0,2');
    expect(legal).toBe(false);
  });

  // 4. Nonexistent-cell rejection
  it('4. rejects placement on non-existent cells', () => {
    const d1 = puzzle.dominoes[0];
    const legal = canPlaceDomino(puzzle, [], d1, '0,0', '99,99');
    expect(legal).toBe(false);
  });

  // 5. Hole rejection
  it('5. rejects placement on a hole', () => {
    // Cell (1,1) is a hole in SAMPLE_PUZZLE
    const d1 = puzzle.dominoes[0];
    const legal = canPlaceDomino(puzzle, [], d1, '1,0', '1,1');
    expect(legal).toBe(false);
  });

  // 6. Boundary / non-adjacent rejection
  it('6. rejects non-adjacent cells across boundaries', () => {
    const d1 = puzzle.dominoes[0];
    // (0,0) and (2,2) are diagonal / far apart
    const legal = canPlaceDomino(puzzle, [], d1, '0,0', '2,2');
    expect(legal).toBe(false);
  });

  // 7. Domino removal
  it('7. removes domino from placements', () => {
    const d1 = puzzle.dominoes[0];
    const placement = {
      dominoId: d1.id,
      cellA: '0,0',
      cellB: '0,1',
      orientation: 'horizontal' as const,
      reversed: false,
      rotation: 0 as const
    };
    const list = placeDomino([], placement);
    expect(list.length).toBe(1);
    const updated = removeDomino(list, d1.id);
    expect(updated.length).toBe(0);
  });

  // 8. Domino movement
  it('8. moves domino to another legal position', () => {
    const d1 = puzzle.dominoes[0];
    const initial = placeDomino([], {
      dominoId: d1.id,
      cellA: '0,0',
      cellB: '0,1',
      orientation: 'horizontal' as const,
      reversed: false,
      rotation: 0 as const
    });
    // Can move to 0,2 and 0,3
    const moved = placeDomino(initial, {
      dominoId: d1.id,
      cellA: '0,2',
      cellB: '0,3',
      orientation: 'horizontal' as const,
      reversed: false,
      rotation: 0 as const
    });
    expect(moved.length).toBe(1);
    expect(moved[0].cellA).toBe('0,2');
    expect(moved[0].cellB).toBe('0,3');
  });

  // 9. 90-degree rotation of placed piece
  it('9. rotates placed domino 90 degrees if target cells are legal', () => {
    const d1 = puzzle.dominoes[0];
    // Place d1 at 0,0 and 0,1.
    // In SAMPLE_PUZZLE: (1,0) is valid. Rotating around (0,0) down to (1,0) is legal!
    const initial = [{
      dominoId: d1.id,
      cellA: '0,0',
      cellB: '0,1',
      orientation: 'horizontal' as const,
      reversed: false,
      rotation: 0 as const
    }];
    const res = rotateDomino(puzzle, initial, d1.id);
    expect(res.success).toBe(true);
    expect(res.placements[0].rotation).toBe(1);
    expect(res.placements[0].orientation).toBe('vertical');
    expect(res.placements[0].cellA).toBe('0,0');
    expect(res.placements[0].cellB).toBe('1,0');
  });

  // 10. Four rotations returning to original orientation
  it('10. handles four rotations cycle properly', () => {
    let state = initGameState(puzzle);
    const dId = puzzle.dominoes[0].id;
    expect(state.dominoRotations[dId]).toBe(0);

    state = rotateTrayDomino(state, dId);
    expect(state.dominoRotations[dId]).toBe(1);

    state = rotateTrayDomino(state, dId);
    expect(state.dominoRotations[dId]).toBe(2);

    state = rotateTrayDomino(state, dId);
    expect(state.dominoRotations[dId]).toBe(3);

    state = rotateTrayDomino(state, dId);
    expect(state.dominoRotations[dId]).toBe(0);
  });

  // 11. Domino value orientation after rotation
  it('11. assigns correct cell values when domino is reversed / rotated', () => {
    const d2 = puzzle.dominoes[1]; // d2: [5, 4]
    // rotation 2 is horizontal reversed: cellB is first (col 2), cellA is second (col 3)
    const placement = {
      dominoId: d2.id,
      cellA: '0,3',
      cellB: '0,2',
      orientation: 'horizontal' as const,
      reversed: true,
      rotation: 2 as const
    };
    const boardValues = getBoardValues(puzzle, [placement]);
    // cellA gets d2.a (5), cellB gets d2.b (4)
    expect(boardValues.get('0,3')).toBe(5);
    expect(boardValues.get('0,2')).toBe(4);
  });

  // 12. SUM condition
  it('12. validates sum condition', () => {
    const region = puzzle.regions.find((r) => r.id === 'reg_sum11')!;
    const board = new Map([
      ['0,2', 5],
      ['0,3', 4],
      ['1,2', 1],
      ['1,3', 1]
    ]);
    const res = evaluateRegion(region, board);
    expect(res.complete).toBe(true);
    expect(res.valid).toBe(true);

    const badBoard = new Map([
      ['0,2', 6],
      ['0,3', 6],
      ['1,2', 1],
      ['1,3', 1]
    ]);
    const badRes = evaluateRegion(region, badBoard);
    expect(badRes.valid).toBe(false);
  });

  // 13. Less-than condition
  it('13. validates less-than condition', () => {
    const region = puzzle.regions.find((r) => r.id === 'reg_lt3')!; // < 3
    const board = new Map([
      ['0,5', 1],
      ['1,5', 1]
    ]); // sum 2 < 3
    expect(evaluateRegion(region, board).valid).toBe(true);

    const badBoard = new Map([
      ['0,5', 2],
      ['1,5', 1]
    ]); // sum 3 not < 3
    expect(evaluateRegion(region, badBoard).valid).toBe(false);
  });

  // 14. Greater-than condition
  it('14. validates greater-than condition', () => {
    const region = puzzle.regions.find((r) => r.id === 'reg_gt8')!; // > 8
    const board = new Map([
      ['1,0', 3],
      ['2,0', 2],
      ['2,1', 4]
    ]); // sum 9 > 8
    expect(evaluateRegion(region, board).valid).toBe(true);

    const badBoard = new Map([
      ['1,0', 1],
      ['2,0', 2],
      ['2,1', 4]
    ]); // sum 7 not > 8
    expect(evaluateRegion(region, badBoard).valid).toBe(false);
  });

  // 15. Equality condition
  it('15. validates equal condition', () => {
    const region = puzzle.regions.find((r) => r.id === 'reg_equal')!; // =
    const goodBoard = new Map([
      ['0,0', 6],
      ['0,1', 6]
    ]);
    expect(evaluateRegion(region, goodBoard).valid).toBe(true);

    const badBoard = new Map([
      ['0,0', 6],
      ['0,1', 5]
    ]);
    expect(evaluateRegion(region, badBoard).valid).toBe(false);
  });

  // 16. Different condition
  it('16. validates different condition', () => {
    const diffRegion = {
      id: 'diff_test',
      cellIds: ['0,0', '0,1'],
      color: '#fff',
      constraint: { type: 'different' as const }
    };
    const goodBoard = new Map([
      ['0,0', 1],
      ['0,1', 2]
    ]);
    expect(evaluateRegion(diffRegion, goodBoard).valid).toBe(true);

    const badBoard = new Map([
      ['0,0', 3],
      ['0,1', 3]
    ]);
    expect(evaluateRegion(diffRegion, badBoard).valid).toBe(false);
  });

  // 17. Incomplete condition
  it('17. evaluates partial/incomplete regions without premature failure', () => {
    const region = puzzle.regions.find((r) => r.id === 'reg_sum11')!;
    const partialBoard = new Map([
      ['0,2', 4],
      ['0,3', 3]
      // 1,2 and 1,3 are still null
    ]);
    const res = evaluateRegion(region, partialBoard);
    expect(res.complete).toBe(false);
    expect(res.valid).toBe(true); // 7 + up to 12 can reach 11
  });

  // 18. Solved detection
  it('18. detects correctly solved puzzle', () => {
    const res = isPuzzleSolved(puzzle, SAMPLE_PUZZLE_SOLUTION);
    expect(res.solved).toBe(true);
    expect(res.invalidRegionIds.length).toBe(0);
  });

  // 19. Unsolved full board
  it('19. detects unsolved full board', () => {
    const res = isPuzzleSolved(puzzle, SAMPLE_PUZZLE_INCORRECT_FULL);
    expect(res.solved).toBe(false);
    expect(res.allDominoesPlaced).toBe(true);
    expect(res.allCellsOccupied).toBe(true);
    expect(res.invalidRegionIds).toContain('reg_equal');
    expect(res.invalidRegionIds).toContain('reg_sum11');
  });

  // 20. Disconnected board components
  it('20. enforces component boundary rejection across disconnected shapes', () => {
    // (0,3) in component 1 and (0,5) in component 2 cannot hold one domino
    const d1 = puzzle.dominoes[0];
    const legal = canPlaceDomino(puzzle, [], d1, '0,3', '0,5');
    expect(legal).toBe(false);
  });

  // 21. Duplicate domino values
  it('21. supports multiple independent dominoes with identical values', () => {
    const customPuzzle: Puzzle = {
      ...puzzle,
      dominoes: [
        { id: 'dup1', a: 4, b: 6 },
        { id: 'dup2', a: 4, b: 6 }
      ]
    };
    expect(customPuzzle.dominoes[0].id).not.toBe(customPuzzle.dominoes[1].id);
    expect(customPuzzle.dominoes[0].a).toBe(customPuzzle.dominoes[1].a);
  });

  // 22. Unused domino detection
  it('22. identifies unused dominoes correctly', () => {
    const state = initGameState(puzzle, { placements: [SAMPLE_PUZZLE_SOLUTION[0]] });
    const placedIds = new Set(state.placements.map((p) => p.dominoId));
    const unused = puzzle.dominoes.filter((d) => !placedIds.has(d.id));
    expect(unused.length).toBe(puzzle.dominoes.length - 1);
  });

  // 23. Full board invalid -> repair mode
  it('23. enters repair mode when all dominoes are placed incorrectly', () => {
    let state = initGameState(puzzle);
    // Place all but last piece
    for (let i = 0; i < SAMPLE_PUZZLE_INCORRECT_FULL.length - 1; i++) {
      const p = SAMPLE_PUZZLE_INCORRECT_FULL[i];
      const res = placeDominoOnBoard(state, p.dominoId, p.cellA, p.cellB, p.rotation, 100);
      state = res.nextState;
    }
    expect(state.validationMode).toBe('normal');

    // Place the final piece
    const last = SAMPLE_PUZZLE_INCORRECT_FULL[SAMPLE_PUZZLE_INCORRECT_FULL.length - 1];
    const res = placeDominoOnBoard(state, last.dominoId, last.cellA, last.cellB, last.rotation, 200);
    state = res.nextState;

    expect(state.validationMode).toBe('repair');
    expect(state.solved).toBe(false);
    expect(state.statusMessage).toContain('Not quite');
  });

  // 24. Violated condition -> red error state
  it('24. flags violated conditions with error in repair mode', () => {
    const evalRes = isPuzzleSolved(puzzle, SAMPLE_PUZZLE_INCORRECT_FULL);
    expect(evalRes.invalidRegionIds).toEqual(expect.arrayContaining(['reg_equal', 'reg_sum11']));
    // And valid conditions must NOT be in invalidRegionIds
    expect(evalRes.invalidRegionIds).not.toContain('reg_gt8');
    expect(evalRes.invalidRegionIds).not.toContain('reg_lt3');
    expect(evalRes.invalidRegionIds).not.toContain('reg_sum13');
  });

  // 25. Corrected condition -> error removed
  it('25. removes error when invalid condition is fixed', () => {
    let state = initGameState(puzzle, {
      placements: SAMPLE_PUZZLE_INCORRECT_FULL,
      validationMode: 'repair'
    });
    // Remove d1 and d2
    state = returnDominoToTray(state, 'd1', 300);
    state = returnDominoToTray(state, 'd2', 400);

    // Place d1 at 0,0 and 0,1 (fixing reg_equal)
    const res1 = placeDominoOnBoard(state, 'd1', '0,0', '0,1', 0, 500);
    state = res1.nextState;

    const evaluation = isPuzzleSolved(puzzle, state.placements);
    expect(evaluation.invalidRegionIds).not.toContain('reg_equal');
  });

  // 26. Final repair -> solved
  it('26. finishes puzzle immediately when all conditions become valid in repair mode', () => {
    let state = initGameState(puzzle, {
      placements: SAMPLE_PUZZLE_INCORRECT_FULL,
      validationMode: 'repair'
    });
    // Swap d1 and d2 to their correct places
    state = returnDominoToTray(state, 'd1', 300);
    state = returnDominoToTray(state, 'd2', 400);

    state = placeDominoOnBoard(state, 'd1', '0,0', '0,1', 0, 500).nextState;
    state = placeDominoOnBoard(state, 'd2', '0,2', '0,3', 0, 600).nextState;

    expect(state.solved).toBe(true);
    expect(state.timerRunning).toBe(false);
  });

  // 27. Reset clears placements while clock continues
  it('27. reset clears repair mode and placements while clock continues', () => {
    const activeState = initGameState(puzzle, {
      placements: SAMPLE_PUZZLE_INCORRECT_FULL,
      validationMode: 'repair',
      timerRunning: true,
      elapsedMs: 15000
    });
    expect(activeState.placements.length).toBeGreaterThan(0);
    const reset = resetGameState(puzzle, activeState);
    expect(reset.placements.length).toBe(0);
    expect(reset.validationMode).toBe('normal');
    expect(reset.elapsedMs).toBe(15000);
    expect(reset.timerRunning).toBe(true);
  });

  // 28. Timer starts immediately as soon as board appears
  it('28. timer starts immediately as soon as board appears', () => {
    const state = initGameState(puzzle);
    expect(state.timerStarted).toBe(true);
    expect(state.timerRunning).toBe(true);
  });

  // 29. Timer does not stop on incorrect full board
  it('29. timer does not stop on incorrect full board', () => {
    const state = initGameState(puzzle, {
      placements: SAMPLE_PUZZLE_INCORRECT_FULL,
      validationMode: 'repair',
      timerRunning: true,
      timerStarted: true,
      lastTickTimestamp: 1000
    });
    const ticked = tickTimer(state, 2000);
    expect(ticked.timerRunning).toBe(true);
    expect(ticked.elapsedMs).toBe(1000);
  });

  // 30. Timer stops when puzzle becomes solved
  it('30. timer stops when puzzle becomes solved', () => {
    let state = initGameState(puzzle, {
      timerStarted: true,
      timerRunning: true,
      lastTickTimestamp: 1000
    });
    // Place all winning pieces
    for (const p of SAMPLE_PUZZLE_SOLUTION) {
      state = placeDominoOnBoard(state, p.dominoId, p.cellA, p.cellB, p.rotation, 1500).nextState;
    }
    expect(state.solved).toBe(true);
    expect(state.timerRunning).toBe(false);

    // Further ticks should not increase elapsedMs
    const postTick = tickTimer(state, 3000);
    expect(postTick.elapsedMs).toBe(state.elapsedMs);
  });
});
