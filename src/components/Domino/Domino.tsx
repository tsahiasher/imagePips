import React from 'react';
import { DominoDefinition, DominoRotationState, getRotationDetails } from '../../domain/domino';
import { PipPattern } from '../PipPattern/PipPattern';

interface DominoProps {
  domino: DominoDefinition;
  rotation: DominoRotationState;
  cellSize: number; // Base cell dimension in pixels (e.g., 60-80px)
  isDragging?: boolean;
  isGhost?: boolean;
  isPlaced?: boolean;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  ariaSelected?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Domino: React.FC<DominoProps> = ({
  domino,
  rotation,
  cellSize,
  isDragging = false,
  isGhost = false,
  isPlaced = false,
  isSelected = false,
  onPointerDown,
  onClick,
  ariaSelected = false,
  className = '',
  style
}) => {
  const { orientation, reversed } = getRotationDetails(rotation);
  const isHorizontal = orientation === 'horizontal';

  // In standard grid, a cell has size `cellSize`.
  // Domino body has small margin so it sits comfortably inside the cells.
  const margin = Math.max(3, cellSize * 0.05);
  const width = isHorizontal ? cellSize * 2 - margin * 2 : cellSize - margin * 2;
  const height = isHorizontal ? cellSize - margin * 2 : cellSize * 2 - margin * 2;
  const rx = Math.max(6, cellSize * 0.12);

  // Determine values for half 1 and half 2 based on reversed state
  const val1 = reversed ? domino.b : domino.a;
  const val2 = reversed ? domino.a : domino.b;

  const halfWidth = isHorizontal ? width / 2 : width;
  const halfHeight = isHorizontal ? height : height / 2;

  const ariaLabel = `Domino ${domino.a} and ${domino.b}, ${orientation}${reversed ? ' reversed' : ''}`;

  let strokeColor = ariaSelected ? '#6366f1' : '#334155';
  let strokeWidth = ariaSelected ? 2.5 : 1.5;
  let opacity = 1;
  let bodyFillOpacity = 1;

  if (isGhost) {
    opacity = 0.6;
  } else if (isPlaced) {
    if (isSelected) {
      // Selected placed domino: solid white face, bold black border
      opacity = 1;
      bodyFillOpacity = 1;
      strokeColor = '#000000';
      strokeWidth = 2.4;
    } else {
      // Settled placed domino: translucent white face (0.62) so region color shines through,
      // while pips and border stay at full 1.0 opacity for crisp readability
      opacity = 1;
      bodyFillOpacity = 0.62;
      strokeColor = '#000000';
      strokeWidth = 1.1;
    }
  }

  const rimInset = Math.max(2, cellSize * 0.045);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`domino-svg ${isDragging ? 'is-dragging' : ''} ${isGhost ? 'is-ghost' : ''} ${className}`}
      style={{
        display: 'block',
        touchAction: 'none',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        filter: isDragging
          ? 'drop-shadow(0 14px 18px rgba(15, 23, 42, 0.45))'
          : isPlaced
          ? isSelected
            ? 'drop-shadow(0 4px 10px rgba(15, 23, 42, 0.28))'
            : 'drop-shadow(0 1px 2px rgba(15, 23, 42, 0.14))'
          : 'drop-shadow(0 3px 5px rgba(15, 23, 42, 0.22))',
        opacity,
        transition: isDragging ? 'none' : 'opacity 0.15s ease, filter 0.15s ease',
        ...style
      }}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-selected={ariaSelected || isSelected}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {/* Outer 3D tile body & border */}
      <rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={rx}
        ry={rx}
        fill={isPlaced && !isSelected ? '#ffffff' : '#e2e8f0'}
        fillOpacity={bodyFillOpacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Raised 3D top face (chamfered inner surface that stays rotation-invariant across 0/90/180/270 deg) */}
      {(!isPlaced || isSelected) && (
        <rect
          x={rimInset}
          y={rimInset}
          width={Math.max(0, width - rimInset * 2)}
          height={Math.max(0, height - rimInset * 2)}
          rx={Math.max(2, rx - 1.5)}
          ry={Math.max(2, rx - 1.5)}
          fill="#ffffff"
          stroke="rgba(255, 255, 255, 0.9)"
          strokeWidth={1}
          pointerEvents="none"
        />
      )}

      {/* Subtle inner glass rim when settled on board */}
      {isPlaced && !isSelected && (
        <rect
          x={1.8}
          y={1.8}
          width={Math.max(0, width - 3.6)}
          height={Math.max(0, height - 3.6)}
          rx={Math.max(2, rx - 1)}
          ry={Math.max(2, rx - 1)}
          fill="none"
          stroke="rgba(255, 255, 255, 0.65)"
          strokeWidth={1}
          pointerEvents="none"
        />
      )}

      {/* Center divider line */}
      {isHorizontal ? (
        <line
          x1={halfWidth}
          y1={margin * 1.5}
          x2={halfWidth}
          y2={height - margin * 1.5}
          stroke={isPlaced && !isSelected ? 'rgba(15, 23, 42, 0.28)' : '#cbd5e1'}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      ) : (
        <line
          x1={margin * 1.5}
          y1={halfHeight}
          x2={width - margin * 1.5}
          y2={halfHeight}
          stroke={isPlaced && !isSelected ? 'rgba(15, 23, 42, 0.28)' : '#cbd5e1'}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      )}

      {/* Half 1 pips */}
      <g transform="translate(0, 0)">
        <PipPattern
          value={val1}
          width={halfWidth}
          height={halfHeight}
          pipRadius={Math.min(halfWidth, halfHeight) * 0.112}
          pipColor="#0f172a"
        />
      </g>

      {/* Half 2 pips */}
      <g
        transform={
          isHorizontal
            ? `translate(${halfWidth}, 0)`
            : `translate(0, ${halfHeight})`
        }
      >
        <PipPattern
          value={val2}
          width={halfWidth}
          height={halfHeight}
          pipRadius={Math.min(halfWidth, halfHeight) * 0.112}
          pipColor="#0f172a"
        />
      </g>
    </svg>
  );
};
