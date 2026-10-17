import React, { useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Constraint } from '../../domain/constraints';
import { Region } from '../../domain/puzzle';

export const PALETTE = [
  '#a855f7', // 0: Purple
  '#ec4899', // 1: Pink
  '#14b8a6', // 2: Teal
  '#f97316', // 3: Orange
  '#0284c7', // 4: Blue
  '#84cc16'  // 5: Lime
];

interface RegionListEditorProps {
  regions: Region[];
  activeRegionId: string | null;
  onSelectRegion: (id: string) => void;
  onAddRegion: () => void;
  onDeleteRegion: (id: string) => void;
  onUpdateRegionColor: (id: string, color: string) => void;
  onUpdateRegionConstraint: (id: string, constraint: Constraint | null) => void;
}

export const RegionListEditor: React.FC<RegionListEditorProps> = ({
  regions,
  activeRegionId,
  onSelectRegion,
  onAddRegion,
  onDeleteRegion,
  onUpdateRegionColor,
  onUpdateRegionConstraint
}) => {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (activeRegionId && cardRefs.current[activeRegionId]) {
      cardRefs.current[activeRegionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeRegionId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
          Regions & Constraints ({regions.length})
        </h3>
        <button
          type="button"
          onClick={onAddRegion}
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
          <Plus size={14} /> Region
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {regions.map((reg) => {
          const isActive = activeRegionId === reg.id;
          return (
            <div
              key={reg.id}
              ref={(el) => {
                cardRefs.current[reg.id] = el;
              }}
              onClick={() => onSelectRegion(reg.id)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                background: isActive ? '#eef2ff' : '#f8fafc',
                border: `1.5px solid ${isActive ? '#6366f1' : '#e2e8f0'}`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'border-color 0.15s ease, background 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={reg.color}
                    onChange={(e) => onUpdateRegionColor(reg.id, e.target.value)}
                    style={{
                      width: '22px',
                      height: '22px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    {reg.cellIds.length} {reg.cellIds.length === 1 ? 'cell' : 'cells'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRegion(reg.id);
                  }}
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
                  title="Delete region"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <select
                  value={reg.constraint ? reg.constraint.type : 'none'}
                  onChange={(e) => {
                    const type = e.target.value;
                    const currentVal =
                      reg.constraint && 'value' in reg.constraint ? reg.constraint.value : 6;
                    let newConstraint: Constraint | null = null;
                    if (type === 'sum') newConstraint = { type: 'sum', value: currentVal };
                    else if (type === 'lessThan') newConstraint = { type: 'lessThan', value: currentVal };
                    else if (type === 'greaterThan') newConstraint = { type: 'greaterThan', value: currentVal };
                    else if (type === 'equal') newConstraint = { type: 'equal' };
                    else if (type === 'different') newConstraint = { type: 'different' };

                    onUpdateRegionConstraint(reg.id, newConstraint);
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    color: '#0f172a',
                    fontWeight: 600
                  }}
                >
                  <option value="none">No constraint</option>
                  <option value="sum">Sum (=)</option>
                  <option value="lessThan">Less Than (&lt;)</option>
                  <option value="greaterThan">Greater Than (&gt;)</option>
                  <option value="equal">All Equal (=)</option>
                  <option value="different">All Different (≠)</option>
                </select>

                {reg.constraint && 'value' in reg.constraint && (
                  <input
                    type="number"
                    value={reg.constraint.value}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && reg.constraint && 'value' in reg.constraint) {
                        onUpdateRegionConstraint(reg.id, {
                          ...reg.constraint,
                          value: val
                        });
                      }
                    }}
                    style={{
                      width: '58px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      fontSize: '0.8rem',
                      color: '#0f172a',
                      fontWeight: 700
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
