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
  const trayCellSize = isLarge ? 28 : isMedium ? 34 : 36;
  const slotSize = isLarge ? 58 : isMedium ? 70 : 76;
  const gap = isLarge ? 6 : 8;

  // Expected rows based on total puzzle capacity to lock tray height permanently
  const colsPerRow = isLarge ? 5 : isMedium ? 4 : count <= 4 ? count : 3;
  const expectedRows = Math.max(1, Math.ceil(count / colsPerRow));
  const expectedContentHeight = expectedRows * slotSize + (expectedRows - 1) * gap;

  return (
    <div
      className={`domino-tray-wrapper ${className}`}
      style={{
        width: '100%',
        paddingTop: '10px',
        paddingLeft: '10px',
        paddingRight: '10px',
        paddingBottom: 'max(84px, calc(env(safe-area-inset-bottom, 0px) + 76px))',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -6px 20px rgba(0, 0, 0, 0.35)',
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
          maxWidth: `${colsPerRow * slotSize + (colsPerRow - 1) * gap + 4}px`,
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

            return (
              <div
                key={domino.id}
                className="tray-domino-slot"
                style={{
                  width: `${slotSize}px`,
                  height: `${slotSize}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'grab'
                }}
                onPointerDown={(e) => onDominoPointerDown(e, domino.id, false)}
                onClick={() => onDominoClick(domino.id)}
              >
                <div
                  className="tray-domino-item"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1px solid #6366f1' : '1px solid transparent'
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
