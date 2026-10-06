/**
 * Domain definitions for Dominoes and Pip patterns.
 */

export interface DominoDefinition {
  id: string;
  a: number; // 0 to 6
  b: number; // 0 to 6
}

export type DominoRotationState = 0 | 1 | 2 | 3;
// 0: Horizontal, A left, B right  [A | B]
// 1: Vertical,   A top,  B bottom [A] / [B]
// 2: Horizontal, B left, A right  [B | A]
// 3: Vertical,   B top,  A bottom [B] / [A]

export interface PipPoint {
  x: number; // Normalized 0 to 1
  y: number; // Normalized 0 to 1
}

/**
 * Standard pip positions on a square domino half.
 * Normalized coordinates (0 to 1).
 */
export const PIP_PATTERNS: Record<number, PipPoint[]> = {
  0: [],
  1: [{ x: 0.5, y: 0.5 }],
  2: [
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.75 }
  ],
  3: [
    { x: 0.25, y: 0.25 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.75 }
  ],
  4: [
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.25 },
    { x: 0.25, y: 0.75 },
    { x: 0.75, y: 0.75 }
  ],
  5: [
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.25 },
    { x: 0.5, y: 0.5 },
    { x: 0.25, y: 0.75 },
    { x: 0.75, y: 0.75 }
  ],
  6: [
    { x: 0.25, y: 0.25 },
    { x: 0.25, y: 0.5 },
    { x: 0.25, y: 0.75 },
    { x: 0.75, y: 0.25 },
    { x: 0.75, y: 0.5 },
    { x: 0.75, y: 0.75 }
  ]
};

/**
 * Rotates rotation state clockwise by 90 degrees (0 -> 1 -> 2 -> 3 -> 0).
 */
export function rotateClockwise(current: DominoRotationState): DominoRotationState {
  return ((current + 1) % 4) as DominoRotationState;
}

/**
 * Get orientation ("horizontal" | "vertical") and reversed state from rotation state.
 */
export function getRotationDetails(rotation: DominoRotationState): {
  orientation: "horizontal" | "vertical";
  reversed: boolean;
} {
  switch (rotation) {
    case 0:
      return { orientation: "horizontal", reversed: false };
    case 1:
      return { orientation: "vertical", reversed: false };
    case 2:
      return { orientation: "horizontal", reversed: true };
    case 3:
      return { orientation: "vertical", reversed: true };
  }
}
