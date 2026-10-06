import React from 'react';
import { Constraint, formatConstraint } from '../../domain/constraints';

interface ConditionBadgeProps {
  constraint: Constraint | null;
  color?: string;
  invalid?: boolean;
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
  size = 32,
  cx = 0,
  cy = 0,
  onClick,
  className = ''
}) => {
  if (!constraint) return null;

  const text = formatConstraint(constraint);
  const half = size / 2;
  const diamondPath = `M ${cx} ${cy - half} L ${cx + half} ${cy} L ${cx} ${cy + half} L ${cx - half} ${cy} Z`;

  // Position for the small red error dot (adjacent to upper-right vertex)
  const dotX = cx + half * 0.85;
  const dotY = cy - half * 0.85;
  const dotR = Math.max(3.5, size * 0.16);

  const ariaDescription = invalid
    ? `Condition ${text} is violated`
    : `Condition ${text}`;

  return (
    <g
      className={`condition-badge-group ${className}`}
      onClick={onClick}
      role="img"
      aria-label={ariaDescription}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Drop shadow filter or subtle under-layer */}
      <path
        d={diamondPath}
        fill="rgba(0, 0, 0, 0.25)"
        transform={`translate(0, ${size * 0.08})`}
      />

      {/* Main diamond body */}
      <path
        d={diamondPath}
        fill={color}
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Badge text */}
      <text
        x={cx}
        y={cy}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={text.length >= 3 ? size * 0.42 : size * 0.48}
        fontWeight="900"
        fontFamily="var(--font-sans), sans-serif"
        pointerEvents="none"
      >
        {text}
      </text>

      {/* Red error indicator dot when condition is invalid */}
      {invalid && (
        <g className="error-dot" role="alert" aria-label="Condition unsatisfied">
          {/* White border ring to make red dot pop against any background */}
          <circle
            cx={dotX}
            cy={dotY}
            r={dotR + 1.2}
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
