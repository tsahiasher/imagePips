import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Puzzle } from '../../domain/puzzle';
import { solvePuzzle } from '../../game/solver';

interface SolvabilityBadgeProps {
  puzzle: Puzzle;
}

export const SolvabilityBadge: React.FC<SolvabilityBadgeProps> = ({ puzzle }) => {
  const status = useMemo(() => {
    const cellCount = puzzle.cells.length;
    const domCount = puzzle.dominoes.length;
    if (cellCount === 0 || cellCount !== domCount * 2) {
      return {
        kind: 'mismatch' as const,
        label: `${cellCount}c / ${domCount}d`,
        title: `Playable cells (${cellCount}) must equal 2 × dominoes (${domCount * 2})`
      };
    }
    const res = solvePuzzle(puzzle, 200000, 100);
    if (res.solvable) {
      const countStr = `${res.solutionCount}${res.capped ? '+' : ''}`;
      const plural = res.solutionCount === 1 && !res.capped ? 'solution' : 'solutions';
      return {
        kind: 'solvable' as const,
        label: `Solvable (${countStr} ${plural})`,
        title: `Verified: ${countStr} valid mathematical ${plural} found`
      };
    }
    if (res.timedOut) {
      return {
        kind: 'balanced' as const,
        label: `${cellCount}c / ${domCount}d`,
        title: 'Cell and domino counts match'
      };
    }
    return {
      kind: 'unsolvable' as const,
      label: 'No Solution (0 solutions)',
      title: 'No valid solution found with current region rules and dominoes'
    };
  }, [puzzle]);

  const isGreen = status.kind === 'solvable' || status.kind === 'balanced';
  const isAmber = status.kind === 'unsolvable';

  return (
    <div
      title={status.title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.78rem',
        fontWeight: 700,
        padding: '4px 9px',
        borderRadius: '6px',
        background: isGreen ? '#ecfdf5' : isAmber ? '#fffbeb' : '#fef2f2',
        border: `1px solid ${isGreen ? '#a7f3d0' : isAmber ? '#fde68a' : '#fecaca'}`,
        color: isGreen ? '#059669' : isAmber ? '#b45309' : '#dc2626',
        whiteSpace: 'nowrap'
      }}
    >
      {isGreen ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
      <span>{status.label}</span>
    </div>
  );
};
