import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DominoDefinition } from '../../domain/domino';

interface DominoInventoryEditorProps {
  dominoes: DominoDefinition[];
  onAddDomino: () => void;
  onDeleteDomino: (id: string) => void;
  onUpdateDominoValue: (id: string, half: 'a' | 'b', value: number) => void;
  onSwapDomino?: (id: string) => void;
}

export const DominoInventoryEditor: React.FC<DominoInventoryEditorProps> = ({
  dominoes,
  onAddDomino,
  onDeleteDomino,
  onUpdateDominoValue,
  onSwapDomino
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
          Domino Inventory ({dominoes.length})
        </h3>
        <button
          type="button"
          onClick={onAddDomino}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 12px',
            borderRadius: '6px',
            background: '#4f46e5',
            color: '#ffffff',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Plus size={14} /> Domino
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {dominoes.map((d, idx) => (
          <div
            key={d.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              #{idx + 1}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={d.a}
                onChange={(e) => onUpdateDominoValue(d.id, 'a', parseInt(e.target.value, 10))}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontWeight: 700,
                  color: '#0f172a'
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              <span style={{ color: '#cbd5e1' }}>|</span>

              <select
                value={d.b}
                onChange={(e) => onUpdateDominoValue(d.id, 'b', parseInt(e.target.value, 10))}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontWeight: 700,
                  color: '#0f172a'
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              {onSwapDomino && (
                <button
                  type="button"
                  onClick={() => onSwapDomino(d.id)}
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Swap [A|B] to [B|A]"
                >
                  Swap
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDeleteDomino(d.id)}
              style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '6px',
                padding: '3px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Delete domino"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
