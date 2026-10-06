import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Edit3,
  Plus,
  Trash2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { Constraint } from '../../domain/constraints';
import { Cell, Puzzle, Region, computeConnectedComponents } from '../../domain/puzzle';
import { PuzzleBoard } from '../PuzzleBoard/PuzzleBoard';

const PALETTE = [
  '#0284c7', // Cyan
  '#9333ea', // Purple
  '#16a34a', // Green
  '#ea580c', // Orange
  '#db2777', // Pink
  '#0d9488', // Teal
  '#e11d48', // Rose
  '#ca8a04', // Amber
  '#64748b'  // Slate
];

interface VerificationScreenProps {
  initialPuzzle: Puzzle;
  sourceImageUrl: string;
  onStartPuzzle: (puzzle: Puzzle) => void;
  onBack: () => void;
}

export const VerificationScreen: React.FC<VerificationScreenProps> = ({
  initialPuzzle,
  sourceImageUrl,
  onStartPuzzle,
  onBack
}) => {
  const [puzzle, setPuzzle] = useState<Puzzle>(initialPuzzle);
  const [showEditPane, setShowEditPane] = useState(false);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(
    initialPuzzle.regions[0]?.id ?? null
  );

  // Consistency check
  const totalPlayableCells = puzzle.cells.length;
  const totalDominoSlots = puzzle.dominoes.length * 2;
  const isConsistent = totalPlayableCells === totalDominoSlots;

  const [editMode, setEditMode] = useState<'regions' | 'cells'>('regions');

  // Toggle cell playable/hole
  const handleToggleCell = (cellId: string) => {
    const existing = puzzle.cells.find((c) => c.id === cellId);
    let newCells: Cell[];

    if (existing) {
      newCells = puzzle.cells.filter((c) => c.id !== cellId);
    } else {
      const [r, c] = cellId.split(',').map(Number);
      newCells = [...puzzle.cells, { id: cellId, row: r, col: c, componentId: 'comp_1' }];
    }

    const compMap = computeConnectedComponents(
      newCells.map((c) => ({ id: c.id, row: c.row, col: c.col }))
    );
    const updatedCells = newCells.map((c) => ({
      ...c,
      componentId: compMap.get(c.id) ?? 'comp_1'
    }));

    const updatedRegions = puzzle.regions.map((reg) => ({
      ...reg,
      cellIds: reg.cellIds.filter((id) => updatedCells.some((c) => c.id === id))
    }));

    setPuzzle((prev) => ({
      ...prev,
      cells: updatedCells,
      regions: updatedRegions
    }));
  };

  const handleCellInteraction = (cellId: string) => {
    if (editMode === 'cells') {
      handleToggleCell(cellId);
    } else {
      handleCellClick(cellId);
    }
  };

  // Toggle cell membership in active region
  const handleCellClick = (cellId: string) => {
    if (!activeRegionId) return;

    setPuzzle((prev) => ({
      ...prev,
      regions: prev.regions.map((reg) => {
        if (reg.id === activeRegionId) {
          const has = reg.cellIds.includes(cellId);
          return {
            ...reg,
            cellIds: has ? reg.cellIds.filter((id) => id !== cellId) : [...reg.cellIds, cellId]
          };
        } else {
          return {
            ...reg,
            cellIds: reg.cellIds.filter((id) => id !== cellId)
          };
        }
      })
    }));
  };

  // Domino operations
  const handleSwapDomino = (id: string) => {
    setPuzzle((prev) => ({
      ...prev,
      dominoes: prev.dominoes.map((d) => (d.id === id ? { ...d, a: d.b, b: d.a } : d))
    }));
  };

  const handleUpdateDominoValue = (id: string, half: 'a' | 'b', value: number) => {
    setPuzzle((prev) => ({
      ...prev,
      dominoes: prev.dominoes.map((d) => (d.id === id ? { ...d, [half]: value } : d))
    }));
  };

  const handleAddDomino = () => {
    const newId = `d_${Date.now()}`;
    setPuzzle((prev) => ({
      ...prev,
      dominoes: [...prev.dominoes, { id: newId, a: 0, b: 0 }]
    }));
  };

  const handleDeleteDomino = (id: string) => {
    setPuzzle((prev) => ({
      ...prev,
      dominoes: prev.dominoes.filter((d) => d.id !== id)
    }));
  };

  // Region operations
  const handleAddRegion = () => {
    const newId = `reg_${Date.now()}`;
    const color = PALETTE[puzzle.regions.length % PALETTE.length];
    const newReg: Region = {
      id: newId,
      cellIds: [],
      color,
      constraint: { type: 'sum', value: 10 }
    };
    setPuzzle((prev) => ({
      ...prev,
      regions: [...prev.regions, newReg]
    }));
    setActiveRegionId(newId);
  };

  const handleDeleteRegion = (id: string) => {
    setPuzzle((prev) => ({
      ...prev,
      regions: prev.regions.filter((r) => r.id !== id)
    }));
    if (activeRegionId === id) {
      setActiveRegionId(puzzle.regions.find((r) => r.id !== id)?.id ?? null);
    }
  };

  const handleStart = () => {
    if (!isConsistent) {
      alert(
        `Cannot start: ${totalPlayableCells} playable cells detected, but ${puzzle.dominoes.length} dominoes cover ${totalDominoSlots} cells.`
      );
      return;
    }
    onStartPuzzle(puzzle);
  };

  return (
    <div
      className="verification-screen-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        maxHeight: '100dvh',
        width: '100vw',
        background: 'var(--bg-primary)',
        color: 'var(--text-main)',
        overflow: 'hidden'
      }}
    >
      {/* Top action header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0'
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowEditPane((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: showEditPane ? '#4f46e5' : '#f8fafc',
              border: `1px solid ${showEditPane ? '#4338ca' : '#e2e8f0'}`,
              color: showEditPane ? '#ffffff' : '#0f172a',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Edit3 size={15} />
            <span>{showEditPane ? 'Close Editor' : 'Edit'}</span>
          </button>

          <button
            onClick={handleStart}
            disabled={!isConsistent || totalPlayableCells === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: isConsistent
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : '#f1f5f9',
              border: isConsistent ? 'none' : '1px solid #e2e8f0',
              color: isConsistent ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: isConsistent ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
              boxShadow: isConsistent ? '0 2px 6px rgba(16, 185, 129, 0.3)' : 'none'
            }}
          >
            <Play size={15} fill={isConsistent ? '#ffffff' : 'none'} />
            <span>Start</span>
          </button>
        </div>
      </header>

      {/* Prominent Invariant & Validation Warning Banners */}
      {!isConsistent && (
        <div
          style={{
            margin: '10px 16px 0 16px',
            padding: '10px 16px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          <AlertTriangle size={22} color="#dc2626" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.9rem', color: '#991b1b', fontWeight: 700 }}>
              Board detection is inconsistent: detected {totalPlayableCells} cells but only{' '}
              {puzzle.dominoes.length} dominoes ({totalDominoSlots} cells).
            </div>
            <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 500, marginTop: '2px' }}>
              In Pips puzzles, playable cells must equal 2 × domino count. Please use "Toggle Cells/Holes" or adjust dominoes before starting.
            </div>
          </div>
        </div>
      )}

      {puzzle.regions.some((r) => !r.constraint && r.color !== '#64748b' && r.color !== '#e2e8f0' && r.color !== '#dfccc4') && (
        <div
          style={{
            margin: '8px 16px 0 16px',
            padding: '8px 16px',
            borderRadius: '10px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.84rem'
          }}
        >
          <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0 }} />
          <span>
            {puzzle.regions.filter((r) => !r.constraint && r.color !== '#64748b' && r.color !== '#e2e8f0' && r.color !== '#dfccc4').length} region(s) have unknown conditions.
            Select the region in the sidebar to assign its constraint rule.
          </span>
        </div>
      )}

      {/* Main verification comparison area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Side: Side-by-side Original and Reconstructed Puzzle */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            padding: '10px',
            overflow: 'hidden',
            background: '#f1f5f9'
          }}
        >
          <div
            className="verification-side-by-side"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              width: '100%',
              height: '100%',
              overflow: 'hidden'
            }}
          >
            {/* Left: Original Screenshot */}
            <div
              className="verification-panel glass-panel"
              style={{
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                ORIGINAL SCREENSHOT
              </div>
              <img
                src={sourceImageUrl}
                alt="Original"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            </div>

            {/* Right: Reconstructed Board */}
            <div
              className="verification-panel glass-panel"
              style={{
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  RECONSTRUCTED PUZZLE
                </div>
                {showEditPane && (
                  <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px' }}>
                    <button
                      onClick={() => setEditMode('regions')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: editMode === 'regions' ? '#4f46e5' : 'transparent',
                        color: editMode === 'regions' ? '#ffffff' : '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 600
                      }}
                    >
                      Assign Regions
                    </button>
                    <button
                      onClick={() => setEditMode('cells')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: editMode === 'cells' ? '#4f46e5' : 'transparent',
                        color: editMode === 'cells' ? '#ffffff' : '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 600
                      }}
                    >
                      Toggle Cells/Holes
                    </button>
                  </div>
                )}
              </div>
              <PuzzleBoard
                puzzle={puzzle}
                placements={[]}
                cellSize={56}
                onCellClick={showEditPane ? handleCellInteraction : undefined}
              />
            </div>
          </div>
        </div>

        {/* Right Correction Sidebar */}
        {showEditPane && (
          <aside
            style={{
              width: '360px',
              borderLeft: '1px solid #e2e8f0',
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: '#ffffff'
            }}
          >
            {/* Quick instructions */}
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#eef2ff', border: '1px solid #c7d2fe', fontSize: '0.8rem', color: '#3730a3' }}>
              Click a region below, then click cells on the board to add or remove them.
            </div>

            {/* Regions & Constraints */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Regions & Constraints</h3>
                <button
                  onClick={handleAddRegion}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    background: '#4f46e5',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  <Plus size={14} /> Region
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {puzzle.regions.map((reg) => {
                  const isActive = activeRegionId === reg.id;
                  return (
                    <div
                      key={reg.id}
                      onClick={() => setActiveRegionId(reg.id)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        background: isActive ? '#eef2ff' : '#f8fafc',
                        border: `1.5px solid ${isActive ? '#6366f1' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="color"
                            value={reg.color}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPuzzle((prev) => ({
                                ...prev,
                                regions: prev.regions.map((r) => (r.id === reg.id ? { ...r, color: val } : r))
                              }));
                            }}
                            style={{ width: '22px', height: '22px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                            {reg.cellIds.length} cells
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRegion(reg.id);
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
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={reg.constraint ? reg.constraint.type : 'none'}
                          onChange={(e) => {
                            const type = e.target.value;
                            let newConstraint: Constraint | null = null;
                            if (type === 'sum') newConstraint = { type: 'sum', value: 10 };
                            else if (type === 'lessThan') newConstraint = { type: 'lessThan', value: 5 };
                            else if (type === 'greaterThan') newConstraint = { type: 'greaterThan', value: 5 };
                            else if (type === 'equal') newConstraint = { type: 'equal' };
                            else if (type === 'different') newConstraint = { type: 'different' };

                            setPuzzle((prev) => ({
                              ...prev,
                              regions: prev.regions.map((r) => (r.id === reg.id ? { ...r, constraint: newConstraint } : r))
                            }));
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
                          <option value="sum">Sum</option>
                          <option value="lessThan">Less Than (&lt;)</option>
                          <option value="greaterThan">Greater Than (&gt;)</option>
                          <option value="equal">Equal (=)</option>
                          <option value="different">Different (≠)</option>
                        </select>

                        {reg.constraint && 'value' in reg.constraint && (
                          <input
                            type="number"
                            value={reg.constraint.value}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                setPuzzle((prev) => ({
                                  ...prev,
                                  regions: prev.regions.map((r) =>
                                    r.id === reg.id && r.constraint && 'value' in r.constraint
                                      ? { ...r, constraint: { ...r.constraint, value: val } }
                                      : r
                                  )
                                }));
                              }
                            }}
                            style={{
                              width: '56px',
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

            {/* Dominoes Inventory Editor */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  Domino Inventory ({puzzle.dominoes.length})
                </h3>
                <button
                  onClick={handleAddDomino}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    background: '#4f46e5',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  <Plus size={14} /> Domino
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {puzzle.dominoes.map((d, idx) => (
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
                        onChange={(e) => handleUpdateDominoValue(d.id, 'a', parseInt(e.target.value, 10))}
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
                        onChange={(e) => handleUpdateDominoValue(d.id, 'b', parseInt(e.target.value, 10))}
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

                      <button
                        onClick={() => handleSwapDomino(d.id)}
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontWeight: 600
                        }}
                        title="Swap [A|B] to [B|A]"
                      >
                        Swap
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteDomino(d.id)}
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
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
