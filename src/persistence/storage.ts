import { Puzzle } from '../domain/puzzle';
import { GameState } from '../game/gameState';

const PUZZLE_STORAGE_KEY = 'pips_active_puzzle';
const GAME_STATE_STORAGE_KEY = 'pips_game_state';
const CUSTOM_PUZZLES_KEY = 'pips_custom_puzzles';

export interface SavedPuzzleBundle {
  puzzle: Puzzle;
  gameState?: Partial<GameState>;
  savedAt: number;
}

export function saveActiveSession(puzzle: Puzzle, state: GameState): void {
  try {
    localStorage.setItem(PUZZLE_STORAGE_KEY, JSON.stringify(puzzle));
    const stateToSave: Partial<GameState> = {
      placements: state.placements,
      dominoRotations: state.dominoRotations,
      elapsedMs: state.elapsedMs,
      timerRunning: false, // Do not count closed-browser time
      timerStarted: state.timerStarted,
      validationMode: state.validationMode,
      hasShownFullBoardMessage: state.hasShownFullBoardMessage,
      solved: state.solved,
      moves: state.moves,
      rotations: state.rotations,
      invalidDrops: state.invalidDrops
    };
    localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
  }
}

export function loadActiveSession(): { puzzle: Puzzle; savedState?: Partial<GameState> } | null {
  try {
    const rawPuzzle = localStorage.getItem(PUZZLE_STORAGE_KEY);
    if (!rawPuzzle) return null;
    const puzzle = JSON.parse(rawPuzzle) as Puzzle;

    const rawState = localStorage.getItem(GAME_STATE_STORAGE_KEY);
    const savedState = rawState ? (JSON.parse(rawState) as Partial<GameState>) : undefined;

    return { puzzle, savedState };
  } catch (err) {
    console.error('Failed to load session from localStorage:', err);
    return null;
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(PUZZLE_STORAGE_KEY);
    localStorage.removeItem(GAME_STATE_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear session from localStorage:', err);
  }
}

export function saveCustomPuzzle(puzzle: Puzzle): void {
  try {
    const existingRaw = localStorage.getItem(CUSTOM_PUZZLES_KEY);
    const list: Puzzle[] = existingRaw ? JSON.parse(existingRaw) : [];
    const filtered = list.filter((p) => p.id !== puzzle.id);
    filtered.push(puzzle);
    localStorage.setItem(CUSTOM_PUZZLES_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to save custom puzzle:', err);
  }
}

export function loadCustomPuzzles(): Puzzle[] {
  try {
    const existingRaw = localStorage.getItem(CUSTOM_PUZZLES_KEY);
    return existingRaw ? JSON.parse(existingRaw) : [];
  } catch (err) {
    console.error('Failed to load custom puzzles:', err);
    return [];
  }
}
