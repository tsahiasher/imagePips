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
  let strokeWidth = ariaSelected ? 2.5 : 1.4;
  let opacity = 1;

  if (isGhost) {
    opacity = 0.6;
  } else if (isPlaced) {
    if (isSelected) {
      // Selected placed domino: make it even more noticeably brighter with high contrast vibrant glow
      opacity = 1;
      strokeColor = '#2563eb';
      strokeWidth = 2.2;
    } else {
      // Settled placed domino: 58% transparent, thin black edge
      opacity = 0.58;
      strokeColor = '#000000';
      strokeWidth = 0.9;
    }
  }

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
          ? 'drop-shadow(0 14px 16px rgba(0,0,0,0.5))'
          : isPlaced
          ? isSelected
            ? 'drop-shadow(0 0 18px rgba(255, 255, 255, 1)) drop-shadow(0 0 8px rgba(59, 130, 246, 0.9)) drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45))'
            : 'none'
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
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
      {/* Outer rounded domino rectangle */}
      <rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={rx}
        ry={rx}
        fill="#ffffff"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Internal subtle bevel / inset highlight */}
      {(!isPlaced || isSelected) && (
        <rect
          x={2}
          y={2}
          width={width - 4}
          height={height - 4}
          rx={rx - 1}
          ry={rx - 1}
          fill="none"
          stroke={isSelected ? '#60a5fa' : 'rgba(255, 255, 255, 0.7)'}
          strokeWidth={isSelected ? 1.5 : 1}
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
          stroke="#cbd5e1"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ) : (
        <line
          x1={margin * 1.5}
          y1={halfHeight}
          x2={width - margin * 1.5}
          y2={halfHeight}
          stroke="#cbd5e1"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}

      {/* Half 1 pips */}
      <g transform={isHorizontal ? 'translate(0, 0)' : 'translate(0, 0)'}>
        <PipPattern
          value={val1}
          width={halfWidth}
          height={halfHeight}
          pipRadius={Math.min(halfWidth, halfHeight) * 0.11}
          pipColor="#1e293b"
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
          pipRadius={Math.min(halfWidth, halfHeight) * 0.11}
          pipColor="#1e293b"
        />
      </g>
    </svg>
  );
};
