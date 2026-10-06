import React from 'react';
import { DominoDefinition, DominoRotationState } from '../../domain/domino';
import { Domino } from '../Domino/Domino';

interface DominoTrayProps {
  unusedDominoes: DominoDefinition[];
  dominoRotations: Record<string, DominoRotationState>;
  onDominoClick: (dominoId: string) => void;
  onDominoPointerDown: (e: React.PointerEvent, dominoId: string, fromBoard: boolean) => void;
  selectedDominoId?: string | null;
  className?: string;
}

export const DominoTray: React.FC<DominoTrayProps> = ({
  unusedDominoes,
  dominoRotations,
  onDominoClick,
  onDominoPointerDown,
  selectedDominoId,
  className = ''
}) => {
  const trayCellSize = unusedDominoes.length > 10 ? 28 : unusedDominoes.length > 6 ? 34 : 42;

  return (
    <div
      className={`domino-tray-wrapper ${className}`}
      style={{
        width: '100%',
        padding: '10px 12px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.25)',
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
          gap: '8px',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '800px',
          padding: '2px',
          overflow: 'hidden'
        }}
      >
        {unusedDominoes.length === 0 ? (
          <div
            style={{
              color: 'var(--text-dim)',
              fontSize: '0.84rem',
              fontStyle: 'italic',
              padding: '10px'
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
                className="tray-domino-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1px solid #6366f1' : '1px solid transparent',
                  cursor: 'grab'
                }}
                onPointerDown={(e) => onDominoPointerDown(e, domino.id, false)}
                onClick={() => onDominoClick(domino.id)}
              >
                <Domino
                  domino={domino}
                  rotation={rot}
                  cellSize={trayCellSize}
                  ariaSelected={isSelected}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
