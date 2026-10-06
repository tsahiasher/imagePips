import { DominoRotationState, getRotationDetails, rotateClockwise } from '../domain/domino';
import {
  DominoPlacement,
  canPlaceDomino,
  placeDomino,
  removeDomino,
  rotateDomino
} from '../domain/placement';
import { CellId, Puzzle } from '../domain/puzzle';
import { isPuzzleSolved } from './constraintEngine';

export interface GameState {
  puzzle: Puzzle;
  placements: DominoPlacement[];
  dominoRotations: Record<string, DominoRotationState>;
  elapsedMs: number;
  timerRunning: boolean;
  timerStarted: boolean;
  lastTickTimestamp: number | null;
  validationMode: 'normal' | 'repair';
  hasShownFullBoardMessage: boolean;
  statusMessage: string | null;
  solved: boolean;
  moves: number;
  rotations: number;
  invalidDrops: number;
}

/**
 * Initializes a new game state for a given puzzle.
 */
export function initGameState(puzzle: Puzzle, savedState?: Partial<GameState>): GameState {
  const initialRotations: Record<string, DominoRotationState> = {};
  for (const d of puzzle.dominoes) {
    initialRotations[d.id] = 0;
  }

  const isSolved = savedState?.solved ?? false;

  return {
    puzzle,
    placements: savedState?.placements ?? [],
    dominoRotations: savedState?.dominoRotations ?? initialRotations,
    elapsedMs: savedState?.elapsedMs ?? 0,
    timerRunning: !isSolved,
    timerStarted: true,
    lastTickTimestamp: savedState?.lastTickTimestamp !== undefined
      ? savedState.lastTickTimestamp
      : (typeof performance !== 'undefined' ? performance.now() : null),
    validationMode: savedState?.validationMode ?? 'normal',
    hasShownFullBoardMessage: savedState?.hasShownFullBoardMessage ?? false,
    statusMessage: null,
    solved: isSolved,
    moves: savedState?.moves ?? 0,
    rotations: savedState?.rotations ?? 0,
    invalidDrops: savedState?.invalidDrops ?? 0
  };
}

/**
 * Start timer on first player action if not already running.
 */
function ensureTimerStarted(state: GameState, now: number): GameState {
  if (state.solved) return state;
  if (!state.timerStarted) {
    return {
      ...state,
      timerStarted: true,
      timerRunning: true,
      lastTickTimestamp: now
    };
  }
  return state;
}

/**
 * Rotates an unused domino sitting in the tray.
 */
export function rotateTrayDomino(
  state: GameState,
  dominoId: string,
  now: number = performance.now()
): GameState {
  if (state.solved) return state;
  let next = ensureTimerStarted(state, now);

  const currentRotation = next.dominoRotations[dominoId] ?? 0;
  const newRotation = rotateClockwise(currentRotation);

  return {
    ...next,
    dominoRotations: {
      ...next.dominoRotations,
      [dominoId]: newRotation
    },
    rotations: next.rotations + 1
  };
}

/**
 * Attempts to rotate a placed domino on the board.
 */
export function rotatePlacedDomino(
  state: GameState,
  dominoId: string,
  now: number = performance.now()
): GameState {
  if (state.solved) return state;
  let next = ensureTimerStarted(state, now);

  const res = rotateDomino(next.puzzle, next.placements, dominoId);
  if (!res.success) {
    return next; // Rotation could not be completed legally
  }

  next = {
    ...next,
    placements: res.placements,
    rotations: next.rotations + 1
  };

  return evaluatePostMoveState(next);
}

/**
 * Attempts to place a domino onto targetCellA and targetCellB.
 */
export function placeDominoOnBoard(
  state: GameState,
  dominoId: string,
  targetCellA: CellId,
  targetCellB: CellId,
  rotation: DominoRotationState,
  now: number = performance.now()
): { nextState: GameState; success: boolean } {
  if (state.solved) return { nextState: state, success: false };
  let next = ensureTimerStarted(state, now);

  const domino = next.puzzle.dominoes.find((d) => d.id === dominoId);
  if (!domino) {
    return { nextState: next, success: false };
  }

  const legal = canPlaceDomino(next.puzzle, next.placements, domino, targetCellA, targetCellB);
  if (!legal) {
    return {
      nextState: {
        ...next,
        invalidDrops: next.invalidDrops + 1
      },
      success: false
    };
  }

  const { orientation, reversed } = getRotationDetails(rotation);
  const newPlacement: DominoPlacement = {
    dominoId,
    cellA: targetCellA,
    cellB: targetCellB,
    orientation,
    reversed,
    rotation
  };

  next = {
    ...next,
    placements: placeDomino(next.placements, newPlacement),
    moves: next.moves + 1
  };

  const evaluated = evaluatePostMoveState(next);
  return { nextState: evaluated, success: true };
}

/**
 * Removes a placed domino from the board and returns it to the tray.
 */
export function returnDominoToTray(
  state: GameState,
  dominoId: string,
  now: number = performance.now()
): GameState {
  if (state.solved) return state;
  let next = ensureTimerStarted(state, now);

  next = {
    ...next,
    placements: removeDomino(next.placements, dominoId),
    dominoRotations: {
      ...next.dominoRotations,
      [dominoId]: 0
    },
    moves: next.moves + 1
  };

  return evaluatePostMoveState(next);
}

/**
 * Evaluates completion and repair mode after any board change.
 */
function evaluatePostMoveState(state: GameState): GameState {
  const { solved, allDominoesPlaced } = isPuzzleSolved(state.puzzle, state.placements);

  if (solved) {
    return {
      ...state,
      solved: true,
      timerRunning: false,
      statusMessage: null
    };
  }

  // If all dominoes are placed but conditions are not met:
  if (allDominoesPlaced && !solved) {
    const isNewRepair = state.validationMode !== 'repair';
    return {
      ...state,
      validationMode: 'repair',
      hasShownFullBoardMessage: true,
      statusMessage: isNewRepair ? "Not quite — check the marked conditions." : state.statusMessage
    };
  }

  // If already in repair mode, retain repair mode (even if domino removed)
  return state;
}

/**
 * Resets the puzzle board back to starting state while allowing clock to continue.
 */
export function resetGameState(puzzle: Puzzle, currentState?: GameState): GameState {
  const initial = initGameState(puzzle);
  if (currentState) {
    return {
      ...initial,
      elapsedMs: currentState.elapsedMs,
      timerRunning: true,
      timerStarted: true,
      lastTickTimestamp: typeof performance !== 'undefined' ? performance.now() : null,
      moves: currentState.moves,
      rotations: currentState.rotations
    };
  }
  return initial;
}

/**
 * Advance timer using precise delta calculation.
 */
export function tickTimer(state: GameState, now: number): GameState {
  if (!state.timerRunning || state.solved) {
    return state;
  }

  if (state.lastTickTimestamp === null) {
    return { ...state, lastTickTimestamp: now };
  }

  const delta = Math.max(0, now - state.lastTickTimestamp);
  return {
    ...state,
    elapsedMs: state.elapsedMs + delta,
    lastTickTimestamp: now
  };
}
