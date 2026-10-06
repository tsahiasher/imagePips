import { describe, expect, it } from 'vitest';
import { DominoRotationState, PIP_PATTERNS, getRotationDetails, rotateClockwise } from '../domino';

describe('Domino and Pip Patterns', () => {
  it('correctly maps pip patterns for 0 to 6', () => {
    // 0: none
    expect(PIP_PATTERNS[0].length).toBe(0);

    // 1: center
    expect(PIP_PATTERNS[1].length).toBe(1);
    expect(PIP_PATTERNS[1][0]).toEqual({ x: 0.5, y: 0.5 });

    // 2: 2 diagonal points
    expect(PIP_PATTERNS[2].length).toBe(2);

    // 3: 3 diagonal points
    expect(PIP_PATTERNS[3].length).toBe(3);

    // 4: 4 corners
    expect(PIP_PATTERNS[4].length).toBe(4);

    // 5: 4 corners + center
    expect(PIP_PATTERNS[5].length).toBe(5);

    // 6: 6 side points
    expect(PIP_PATTERNS[6].length).toBe(6);
  });

  it('four 90-degree rotations return piece to original orientation', () => {
    let rot: DominoRotationState = 0;
    rot = rotateClockwise(rot);
    expect(rot).toBe(1);
    expect(getRotationDetails(rot)).toEqual({ orientation: 'vertical', reversed: false });

    rot = rotateClockwise(rot);
    expect(rot).toBe(2);
    expect(getRotationDetails(rot)).toEqual({ orientation: 'horizontal', reversed: true });

    rot = rotateClockwise(rot);
    expect(rot).toBe(3);
    expect(getRotationDetails(rot)).toEqual({ orientation: 'vertical', reversed: true });

    rot = rotateClockwise(rot);
    expect(rot).toBe(0);
    expect(getRotationDetails(rot)).toEqual({ orientation: 'horizontal', reversed: false });
  });
});
