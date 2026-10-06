import React from 'react';
import { DominoDefinition, DominoRotationState } from '../../domain/domino';
import { Domino } from '../Domino/Domino';

interface DominoTrayProps {
  unusedDominoes: DominoDefinition[];
  totalDominoCount?: number;
  dominoRotations: Record<string, DominoRotationState>;
  onDominoClick: (dominoId: string) => void;
  onDominoPointerDown: (e: React.PointerEvent, dominoId: string, fromBoard: boolean) => void;
  selectedDominoId?: string | null;
  className?: string;
}

export const DominoTray: React.FC<DominoTrayProps> = ({
  unusedDominoes,
  totalDominoCount,
  dominoRotations,
  onDominoClick,
  onDominoPointerDown,
  selectedDominoId,
  className = ''
}) => {
  // Constant sizing based on total puzzle domino count
  const count = totalDominoCount ?? unusedDominoes.length;
  const isLarge = count > 10;
  const isMedium = count > 6;
  const trayCellSize = isLarge ? 34 : isMedium ? 38 : 42;
  const slotWidth = trayCellSize * 2 + 4;
  const slotHeight = trayCellSize + 4;
  const gap = 8;

  // Expected rows based on total puzzle capacity to lock tray height permanently
  const colsPerRow = isLarge ? 5 : isMedium ? 4 : count <= 4 ? count : 3;
  const expectedRows = Math.max(1, Math.ceil(count / colsPerRow));
  const expectedContentHeight = expectedRows * slotHeight + (expectedRows - 1) * gap;

  return (
    <div
      className={`domino-tray-wrapper ${className}`}
      style={{
        width: '100%',
        paddingTop: '10px',
        paddingLeft: '10px',
        paddingRight: '10px',
        paddingBottom: 'max(84px, calc(env(safe-area-inset-bottom, 0px) + 76px))',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0
      }}
    >
      <div
        className="domino-tray-items"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: `${gap}px`,
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: `${colsPerRow * slotWidth + (colsPerRow - 1) * gap + 4}px`,
          minHeight: `${expectedContentHeight}px`,
          padding: '2px',
          overflow: 'visible'
        }}
      >
        {unusedDominoes.length === 0 ? (
          <div
            style={{
              color: 'var(--text-dim)',
              fontSize: '0.84rem',
              fontStyle: 'italic',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: `${expectedContentHeight}px`
            }}
          >
            All dominoes have been placed on the board!
          </div>
        ) : (
          unusedDominoes.map((domino) => {
            const rot = dominoRotations[domino.id] ?? 0;
            const isSelected = selectedDominoId === domino.id;
            const isVertical = rot % 2 !== 0;

            return (
              <div
                key={domino.id}
                className="tray-domino-slot"
                style={{
                  position: 'relative',
                  width: `${slotWidth}px`,
                  height: `${slotHeight}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'grab'
                }}
                onPointerDown={(e) => onDominoPointerDown(e, domino.id, false)}
                onClick={() => onDominoClick(domino.id)}
              >
                {/* Horizontal slot placeholder box (matches game1.jpg) */}
                <div
                  className="slot-placeholder"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <div
                    style={{
                      width: '1px',
                      height: '60%',
                      background: '#cbd5e1'
                    }}
                  />
                </div>

                {/* Domino tile (semi-transparent when rotated vertical) */}
                <div
                  className="tray-domino-item"
                  style={{
                    position: isVertical ? 'absolute' : 'relative',
                    zIndex: isVertical ? 20 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: isSelected ? '1.5px solid #6366f1' : '1.5px solid transparent',
                    opacity: isVertical ? 0.82 : 1,
                    filter: isVertical
                      ? 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.28))'
                      : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.10))',
                    pointerEvents: 'none',
                    transition: 'opacity 0.15s ease, filter 0.15s ease'
                  }}
                >
                  <Domino
                    domino={domino}
                    rotation={rot}
                    cellSize={trayCellSize}
                    ariaSelected={isSelected}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
