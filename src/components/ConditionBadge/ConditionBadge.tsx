import React from 'react';
import { Constraint, formatConstraint } from '../../domain/constraints';

interface ConditionBadgeProps {
  constraint: Constraint | null;
  color?: string;
  invalid?: boolean;
  isSelected?: boolean;
  size?: number; // Size in SVG units (e.g. 32px)
  cx?: number;
  cy?: number;
  onClick?: () => void;
  className?: string;
}

export const ConditionBadge: React.FC<ConditionBadgeProps> = ({
  constraint,
  color = '#6366f1',
  invalid = false,
  isSelected = false,
  size = 32,
  cx = 0,
  cy = 0,
  onClick,
  className = ''
}) => {
  if (!constraint) return null;

  const text = formatConstraint(constraint);
  const half = size / 2;
  // Square side length so that its rotated diagonal matches `size`
  const boxSize = size * 0.74;
  const boxHalf = boxSize / 2;
  const cornerRadius = Math.max(3.5, size * 0.13);

  // Position for the status indicator dot (adjacent to upper-right edge of diamond)
  const dotX = cx + half * 0.72;
  const dotY = cy - half * 0.72;
  const dotR = Math.max(4.5, size * 0.17);

  const ariaDescription = invalid
    ? `Condition ${text} is violated`
    : `Condition ${text}`;

  return (
    <g
      className={`condition-badge-group ${isSelected ? 'selected-condition-badge' : ''} ${className}`}
      onClick={onClick}
      role="img"
      aria-label={ariaDescription}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Selection halo when active */}
      {isSelected && (
        <>
          <rect
            x={cx - boxHalf}
            y={cy - boxHalf}
            width={boxSize}
            height={boxSize}
            rx={cornerRadius}
            ry={cornerRadius}
            transform={`rotate(45 ${cx} ${cy})`}
            fill="none"
            stroke="#0f172a"
            strokeWidth={size * 0.26}
            strokeLinejoin="round"
            opacity={0.85}
          />
          <rect
            x={cx - boxHalf}
            y={cy - boxHalf}
            width={boxSize}
            height={boxSize}
            rx={cornerRadius}
            ry={cornerRadius}
            transform={`rotate(45 ${cx} ${cy})`}
            fill="none"
            stroke="#ffffff"
            strokeWidth={size * 0.14}
            strokeLinejoin="round"
          />
        </>
      )}

      {/* Subtle drop shadow under-layer */}
      <rect
        x={cx - boxHalf}
        y={cy - boxHalf + size * 0.06}
        width={boxSize}
        height={boxSize}
        rx={cornerRadius}
        ry={cornerRadius}
        transform={`rotate(45 ${cx} ${cy + size * 0.06})`}
        fill="rgba(15, 23, 42, 0.28)"
      />

      {/* Outer dark contrast hairline so light region badges pop */}
      <rect
        x={cx - boxHalf}
        y={cy - boxHalf}
        width={boxSize}
        height={boxSize}
        rx={cornerRadius}
        ry={cornerRadius}
        transform={`rotate(45 ${cx} ${cy})`}
        fill="none"
        stroke="rgba(15, 23, 42, 0.35)"
        strokeWidth={isSelected ? 3.5 : 3}
        strokeLinejoin="round"
      />

      {/* Main rounded diamond body */}
      <rect
        x={cx - boxHalf}
        y={cy - boxHalf}
        width={boxSize}
        height={boxSize}
        rx={cornerRadius}
        ry={cornerRadius}
        transform={`rotate(45 ${cx} ${cy})`}
        fill={color}
        stroke="#ffffff"
        strokeWidth={isSelected ? 2.4 : 1.8}
        strokeLinejoin="round"
      />

      {/* Badge text or custom high-legibility ≠ vector symbol */}
      {constraint.type === 'different' ? (
        <g pointerEvents="none">
          {/* Keep hidden text node for DOM/test queries */}
          <text x={cx} y={cy} opacity={0} fontSize={size * 0.5}>
            {text}
          </text>
          {/* Two horizontal bars of '=' */}
          <line
            x1={cx - size * 0.19}
            y1={cy - size * 0.095}
            x2={cx + size * 0.19}
            y2={cy - size * 0.095}
            stroke="rgba(15, 23, 42, 0.25)"
            strokeWidth={size * 0.078 + 1.1}
            strokeLinecap="round"
          />
          <line
            x1={cx - size * 0.19}
            y1={cy + size * 0.095}
            x2={cx + size * 0.19}
            y2={cy + size * 0.095}
            stroke="rgba(15, 23, 42, 0.25)"
            strokeWidth={size * 0.078 + 1.1}
            strokeLinecap="round"
          />
          <line
            x1={cx - size * 0.19}
            y1={cy - size * 0.095}
            x2={cx + size * 0.19}
            y2={cy - size * 0.095}
            stroke="#ffffff"
            strokeWidth={size * 0.078}
            strokeLinecap="round"
          />
          <line
            x1={cx - size * 0.19}
            y1={cy + size * 0.095}
            x2={cx + size * 0.19}
            y2={cy + size * 0.095}
            stroke="#ffffff"
            strokeWidth={size * 0.078}
            strokeLinecap="round"
          />
          {/* Bold diagonal slash across the bars with subtle halo for crisp separation */}
          <line
            x1={cx - size * 0.135}
            y1={cy + size * 0.22}
            x2={cx + size * 0.135}
            y2={cy - size * 0.22}
            stroke={color}
            strokeWidth={size * 0.135}
            strokeLinecap="round"
          />
          <line
            x1={cx - size * 0.135}
            y1={cy + size * 0.22}
            x2={cx + size * 0.135}
            y2={cy - size * 0.22}
            stroke="rgba(15, 23, 42, 0.28)"
            strokeWidth={size * 0.088 + 1.2}
            strokeLinecap="round"
          />
          <line
            x1={cx - size * 0.135}
            y1={cy + size * 0.22}
            x2={cx + size * 0.135}
            y2={cy - size * 0.22}
            stroke="#ffffff"
            strokeWidth={size * 0.088}
            strokeLinecap="round"
          />
        </g>
      ) : (
        <text
          x={cx}
          y={cy}
          fill="#ffffff"
          stroke="rgba(15, 23, 42, 0.22)"
          strokeWidth={0.6}
          paintOrder="stroke fill"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={text.length >= 3 ? size * 0.38 : text.length === 2 ? size * 0.44 : size * 0.50}
          fontWeight="900"
          fontFamily="var(--font-sans), sans-serif"
          letterSpacing={text.length >= 3 ? '-0.04em' : '-0.01em'}
          pointerEvents="none"
        >
          {text}
        </text>
      )}

      {/* Red error indicator dot when condition is invalid */}
      {invalid && (
        <g className="error-dot" role="alert" aria-label="Condition unsatisfied">
          <circle
            cx={dotX}
            cy={dotY}
            r={dotR + 1.3}
            fill="#ffffff"
          />
          <circle
            cx={dotX}
            cy={dotY}
            r={dotR}
            fill="#ef4444"
          />
        </g>
      )}
    </g>
  );
};
