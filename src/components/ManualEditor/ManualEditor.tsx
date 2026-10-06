import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Play, CheckCircle2, AlertTriangle, Download, Upload } from 'lucide-react';
import { Constraint } from '../../domain/constraints';
import { DominoDefinition } from '../../domain/domino';
import { Cell, Puzzle, Region, computeConnectedComponents } from '../../domain/puzzle';

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

interface ManualEditorProps {
  onStartPuzzle: (puzzle: Puzzle) => void;
  onCancel: () => void;
  initialPuzzle?: Puzzle;
}

export const ManualEditor: React.FC<ManualEditorProps> = ({
  onStartPuzzle,
  onCancel,
  initialPuzzle
}) => {
  const [rows, setRows] = useState(initialPuzzle ? Math.max(...initialPuzzle.cells.map(c => c.row)) + 1 : 4);
  const [cols, setCols] = useState(initialPuzzle ? Math.max(...initialPuzzle.cells.map(c => c.col)) + 1 : 6);
  const [name, setName] = useState(initialPuzzle?.name ?? 'Custom Puzzle');

  // Playable cells set (key: "r,c")
  const [playableKeys, setPlayableKeys] = useState<Set<string>>(() => {
    if (initialPuzzle) {
      return new Set(initialPuzzle.cells.map(c => `${c.row},${c.col}`));
    }
    // Default 4x4 with 8 cells playable
    const s = new Set<string>();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        s.add(`${r},${c}`);
      }
    }
    return s;
  });

  // Regions
  const [regions, setRegions] = useState<Region[]>(() => {
    if (initialPuzzle) return initialPuzzle.regions;
    return [
      {
        id: 'reg_1',
        cellIds: ['0,0', '0,1'],
        color: PALETTE[0],
        constraint: { type: 'equal' }
      },
      {
        id: 'reg_2',
        cellIds: ['0,2', '0,3'],
        color: PALETTE[1],
        constraint: { type: 'sum', value: 7 }
      }
    ];
  });

  const [activeRegionId, setActiveRegionId] = useState<string | null>(regions[0]?.id ?? null);

  // Domino inventory
  const [dominoes, setDominoes] = useState<DominoDefinition[]>(() => {
    if (initialPuzzle) return initialPuzzle.dominoes;
    return [
      { id: 'd1', a: 3, b: 3 },
      { id: 'd2', a: 5, b: 2 },
      { id: 'd3', a: 4, b: 1 },
      { id: 'd4', a: 6, b: 0 },
      { id: 'd5', a: 2, b: 2 },
      { id: 'd6', a: 1, b: 4 }
    ];
  });

  // Toggle playable cell
  const handleToggleCell = (r: number, c: number) => {
    const key = `${r},${c}`;
    const next = new Set(playableKeys);
    if (next.has(key)) {
      next.delete(key);
      // Also remove from any regions
      setRegions(prev => prev.map(reg => ({
        ...reg,
        cellIds: reg.cellIds.filter(id => id !== key)
      })));
    } else {
      next.add(key);
    }
    setPlayableKeys(next);
  };

  // Toggle cell membership in active region
  const handleCellRegionClick = (r: number, c: number) => {
    const key = `${r},${c}`;
    if (!playableKeys.has(key) || !activeRegionId) return;

    setRegions(prev => prev.map(reg => {
      if (reg.id === activeRegionId) {
        const has = reg.cellIds.includes(key);
        return {
          ...reg,
          cellIds: has ? reg.cellIds.filter(id => id !== key) : [...reg.cellIds, key]
        };
      } else {
        // Remove from other regions to keep clean separation
        return {
          ...reg,
          cellIds: reg.cellIds.filter(id => id !== key)
        };
      }
    }));
  };

  // Add region
  const handleAddRegion = () => {
    const newId = `reg_${Date.now()}`;
    const color = PALETTE[regions.length % PALETTE.length];
    setRegions(prev => [
      ...prev,
      {
        id: newId,
        cellIds: [],
        color,
        constraint: { type: 'sum', value: 10 }
      }
    ]);
    setActiveRegionId(newId);
  };

  // Delete region
  const handleDeleteRegion = (id: string) => {
    setRegions(prev => prev.filter(r => r.id !== id));
    if (activeRegionId === id) {
      setActiveRegionId(regions.find(r => r.id !== id)?.id ?? null);
    }
  };

  // Add domino
  const handleAddDomino = () => {
    const newId = `d_${Date.now()}`;
    setDominoes(prev => [...prev, { id: newId, a: 0, b: 0 }]);
  };

  // Delete domino
  const handleDeleteDomino = (id: string) => {
    setDominoes(prev => prev.filter(d => d.id !== id));
  };

  // Consistency checks
  const totalPlayable = playableKeys.size;
  const dominoCoverage = dominoes.length * 2;
  const isBalanced = totalPlayable === dominoCoverage;

  const handleStart = () => {
    if (!isBalanced) {
      alert(`Cannot start: ${totalPlayable} playable cells, but ${dominoes.length} dominoes cover ${dominoCoverage} cells.`);
      return;
    }

    // Convert playable cells to Cell objects with component detection
    const cellsRaw: { id: string; row: number; col: number }[] = [];
    for (const key of playableKeys) {
      const [r, c] = key.split(',').map(Number);
      cellsRaw.push({ id: key, row: r, col: c });
    }

    const componentMap = computeConnectedComponents(cellsRaw);
    const finalCells: Cell[] = cellsRaw.map(c => ({
      ...c,
      componentId: componentMap.get(c.id) ?? 'comp_1'
    }));

    const puzzle: Puzzle = {
      id: initialPuzzle?.id ?? `custom_${Date.now()}`,
      name,
      cells: finalCells,
      regions,
      dominoes
    };

    onStartPuzzle(puzzle);
  };

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleExportPuzzle = () => {
    const cellsRaw: { id: string; row: number; col: number }[] = [];
    for (const key of playableKeys) {
      const [r, c] = key.split(',').map(Number);
      cellsRaw.push({ id: key, row: r, col: c });
    }
    const componentMap = computeConnectedComponents(cellsRaw);
    const finalCells: Cell[] = cellsRaw.map(c => ({
      ...c,
      componentId: componentMap.get(c.id) ?? 'comp_1'
    }));

    const puzzle: Puzzle = {
      id: initialPuzzle?.id ?? `custom_${Date.now()}`,
      name: name || 'Custom Puzzle',
      cells: finalCells,
      regions: regions.map(r => ({
        ...r,
        cellIds: r.cellIds.filter(id => playableKeys.has(id))
      })),
      dominoes
    };

    const blob = new Blob([JSON.stringify(puzzle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'custom_puzzle').toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportPuzzleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as Puzzle;
        if (!parsed || !Array.isArray(parsed.cells) || !Array.isArray(parsed.dominoes)) {
          alert('Invalid puzzle file format.');
          return;
        }

        setName(parsed.name || 'Imported Puzzle');
        const keys = new Set(parsed.cells.map(c => `${c.row},${c.col}`));
        setPlayableKeys(keys);

        const maxR = Math.max(3, ...parsed.cells.map(c => c.row)) + 1;
        const maxC = Math.max(3, ...parsed.cells.map(c => c.col)) + 1;
        setRows(maxR);
        setCols(maxC);

        setRegions(parsed.regions || []);
        setDominoes(parsed.dominoes || []);
        if (parsed.regions && parsed.regions.length > 0) {
          setActiveRegionId(parsed.regions[0].id);
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse puzzle JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [mobileTab, setMobileTab] = useState<'grid' | 'regions' | 'dominoes'>('grid');

  return (
    <div
      className={`manual-editor-root tab-${mobileTab}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100vw',
        background: 'var(--bg-primary)',
        color: 'var(--text-main)',
        overflow: 'hidden'
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportPuzzleFile}
      />

      {/* Top action header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          background: 'rgba(15, 23, 42, 0.85)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '5px 10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: '#ffffff',
              maxWidth: '180px'
            }}
          />
        </div>

        {/* Center: Save / Import / Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleExportPuzzle}
            title="Save puzzle as JSON file"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Save</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import puzzle from JSON file"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Upload size={14} />
            <span>Import</span>
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: isBalanced ? '#34d399' : '#f87171'
            }}
          >
            {isBalanced ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            <span>
              {totalPlayable}c / {dominoes.length}d
            </span>
          </div>
        </div>

        {/* Right: Play Puzzle */}
        <button
          onClick={handleStart}
          disabled={!isBalanced || totalPlayable === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 16px',
            borderRadius: '8px',
            background: isBalanced ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: isBalanced ? 'pointer' : 'not-allowed',
            opacity: isBalanced ? 1 : 0.5
          }}
        >
          <Play size={15} />
          <span>Play Puzzle</span>
        </button>
      </header>

      {/* Mobile Tab Switcher */}
      <div
        className="mobile-editor-tabs"
        style={{
          display: 'none',
          background: 'rgba(15, 23, 42, 0.95)',
          padding: '6px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <button
          onClick={() => setMobileTab('grid')}
          style={{
            padding: '5px 14px',
            borderRadius: '6px',
            background: mobileTab === 'grid' ? '#6366f1' : 'rgba(255, 255, 255, 0.06)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.8rem'
          }}
        >
          Grid
        </button>
        <button
          onClick={() => setMobileTab('regions')}
          style={{
            padding: '5px 14px',
            borderRadius: '6px',
            background: mobileTab === 'regions' ? '#6366f1' : 'rgba(255, 255, 255, 0.06)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.8rem'
          }}
        >
          Regions ({regions.length})
        </button>
        <button
          onClick={() => setMobileTab('dominoes')}
          style={{
            padding: '5px 14px',
            borderRadius: '6px',
            background: mobileTab === 'dominoes' ? '#6366f1' : 'rgba(255, 255, 255, 0.06)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.8rem'
          }}
        >
          Dominoes ({dominoes.length})
        </button>
      </div>

      {/* Editor 3-column layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar: Regions & Constraints */}
        <aside
          className="editor-regions-sidebar"
          style={{
            width: '320px',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: 'rgba(15, 23, 42, 0.5)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Regions & Constraints</h3>
            <button
              onClick={handleAddRegion}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#6366f1',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <Plus size={14} /> Region
            </button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Select a region below, then click playable cells on the board to add or remove them.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {regions.map((reg) => {
              const isActive = activeRegionId === reg.id;
              return (
                <div
                  key={reg.id}
                  onClick={() => setActiveRegionId(reg.id)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isActive ? '#6366f1' : 'rgba(255, 255, 255, 0.08)'}`,
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
                          setRegions(prev => prev.map(r => r.id === reg.id ? { ...r, color: val } : r));
                        }}
                        style={{ width: '22px', height: '22px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        {reg.cellIds.length} cells
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRegion(reg.id);
                      }}
                      style={{ background: 'transparent', color: '#f87171', padding: '2px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Constraint dropdown and input */}
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

                        setRegions(prev => prev.map(r => r.id === reg.id ? { ...r, constraint: newConstraint } : r));
                      }}
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        color: '#ffffff'
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
                            setRegions(prev => prev.map(r => r.id === reg.id && r.constraint && 'value' in r.constraint
                              ? { ...r, constraint: { ...r.constraint, value: val } }
                              : r
                            ));
                          }
                        }}
                        style={{
                          width: '56px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          fontSize: '0.8rem',
                          color: '#ffffff'
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center: Grid layout editor */}
        <main
          className="editor-grid-area"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          {/* Grid size controls */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              marginBottom: '16px',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <span>Rows:</span>
              <button
                onClick={() => setRows(Math.max(2, rows - 1))}
                style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}
              >-</button>
              <span style={{ fontWeight: 700 }}>{rows}</span>
              <button
                onClick={() => setRows(Math.min(10, rows + 1))}
                style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}
              >+</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <span>Cols:</span>
              <button
                onClick={() => setCols(Math.max(2, cols - 1))}
                style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}
              >-</button>
              <span style={{ fontWeight: 700 }}>{cols}</span>
              <button
                onClick={() => setCols(Math.min(10, cols + 1))}
                style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}
              >+</button>
            </div>

            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Right-click cell to toggle playable / hole. Left-click to assign region.
            </span>
          </div>

          {/* Interactive grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 54px)`,
              gridTemplateRows: `repeat(${rows}, 54px)`,
              gap: '4px',
              padding: '16px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((_, c) => {
                const key = `${r},${c}`;
                const isPlayable = playableKeys.has(key);
                const reg = regions.find(rg => rg.cellIds.includes(key));

                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (!isPlayable) {
                        handleToggleCell(r, c);
                      } else {
                        handleCellRegionClick(r, c);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleToggleCell(r, c);
                    }}
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '8px',
                      border: isPlayable ? `2px solid ${reg ? reg.color : '#64748b'}` : '1px dashed rgba(255, 255, 255, 0.1)',
                      background: isPlayable
                        ? reg ? `${reg.color}40` : 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(0, 0, 0, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: isPlayable ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'
                    }}
                    title={isPlayable ? `Playable cell (${r}, ${c})` : 'Hole (click to enable)'}
                  >
                    <span>{r},{c}</span>
                    {reg?.constraint && (
                      <span style={{ fontSize: '0.62rem', color: reg.color, fontWeight: 700 }}>
                        {reg.constraint.type === 'sum' && reg.constraint.value}
                        {reg.constraint.type === 'lessThan' && `<${reg.constraint.value}`}
                        {reg.constraint.type === 'greaterThan' && `>${reg.constraint.value}`}
                        {reg.constraint.type === 'equal' && '='}
                        {reg.constraint.type === 'different' && '≠'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </main>

        {/* Right sidebar: Domino Inventory */}
        <aside
          className="editor-dominoes-sidebar"
          style={{
            width: '320px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: 'rgba(15, 23, 42, 0.5)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              Dominoes ({dominoes.length})
            </h3>
            <button
              onClick={handleAddDomino}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#6366f1',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600
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
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  #{idx + 1}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    value={d.a}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDominoes(prev => prev.map(item => item.id === d.id ? { ...item, a: val } : item));
                    }}
                    style={{
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontWeight: 700,
                      color: '#ffffff'
                    }}
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>

                  <span style={{ color: 'var(--text-dim)' }}>|</span>

                  <select
                    value={d.b}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDominoes(prev => prev.map(item => item.id === d.id ? { ...item, b: val } : item));
                    }}
                    style={{
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontWeight: 700,
                      color: '#ffffff'
                    }}
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>

                  <button
                    onClick={() => {
                      // Swap a and b
                      setDominoes(prev => prev.map(item => item.id === d.id ? { ...item, a: d.b, b: d.a } : item));
                    }}
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-muted)'
                    }}
                    title="Swap values"
                  >
                    Swap
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteDomino(d.id)}
                  style={{ background: 'transparent', color: '#f87171', padding: '2px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};
