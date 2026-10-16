import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Edit3,
  Download,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { Constraint } from '../../domain/constraints';
import { Cell, Puzzle, Region, computeConnectedComponents } from '../../domain/puzzle';
import { PuzzleBoard } from '../PuzzleBoard/PuzzleBoard';
import { PALETTE, RegionListEditor } from '../EditorShared/RegionListEditor';
import { DominoInventoryEditor } from '../EditorShared/DominoInventoryEditor';
import { SolvabilityBadge } from '../EditorShared/SolvabilityBadge';

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
  const [drawerTab, setDrawerTab] = useState<'regions' | 'dominoes'>('regions');

  // Consistency check
  const totalPlayableCells = puzzle.cells.length;
  const totalDominoSlots = puzzle.dominoes.length * 2;
  const isConsistent = totalPlayableCells === totalDominoSlots;
  const [initialGridBounds] = useState(() => {
    const rs = initialPuzzle.cells.map((c) => c.row);
    const cs = initialPuzzle.cells.map((c) => c.col);
    return {
      minRow: rs.length > 0 ? Math.min(...rs) : 0,
      maxRow: rs.length > 0 ? Math.max(...rs) : 0,
      minCol: cs.length > 0 ? Math.min(...cs) : 0,
      maxCol: cs.length > 0 ? Math.max(...cs) : 0
    };
  });

  const [editMode, setEditMode] = useState<'select' | 'regions' | 'cells'>('select');

  // Pinch-to-zoom and pan state for mobile comparison view
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const gestureRef = useRef<{
    mode: 'none' | 'pinch' | 'pan';
    startDist: number;
    startZoom: number;
    startPanX: number;
    startPanY: number;
    startTouchX: number;
    startTouchY: number;
  }>({
    mode: 'none',
    startDist: 0,
    startZoom: 1,
    startPanX: 0,
    startPanY: 0,
    startTouchX: 0,
    startTouchY: 0
  });

  const getTouchDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleCompareTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      gestureRef.current = {
        mode: 'pinch',
        startDist: Math.max(10, dist),
        startZoom: zoom,
        startPanX: pan.x,
        startPanY: pan.y,
        startTouchX: midX,
        startTouchY: midY
      };
    } else if (e.touches.length === 1 && zoom > 1.02) {
      gestureRef.current = {
        mode: 'pan',
        startDist: 0,
        startZoom: zoom,
        startPanX: pan.x,
        startPanY: pan.y,
        startTouchX: e.touches[0].clientX,
        startTouchY: e.touches[0].clientY
      };
    } else {
      gestureRef.current.mode = 'none';
    }
  };

  const handleCompareTouchMove = (e: React.TouchEvent) => {
    if (gestureRef.current.mode === 'pinch' && e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const nextZoom = Math.min(4, Math.max(1, gestureRef.current.startZoom * (dist / gestureRef.current.startDist)));
      const dx = midX - gestureRef.current.startTouchX;
      const dy = midY - gestureRef.current.startTouchY;
      setZoom(nextZoom);
      if (nextZoom <= 1.02) {
        setPan({ x: 0, y: 0 });
      } else {
        setPan({
          x: gestureRef.current.startPanX + dx,
          y: gestureRef.current.startPanY + dy
        });
      }
    } else if (gestureRef.current.mode === 'pan' && e.touches.length === 1 && zoom > 1.02) {
      const dx = e.touches[0].clientX - gestureRef.current.startTouchX;
      const dy = e.touches[0].clientY - gestureRef.current.startTouchY;
      setPan({
        x: gestureRef.current.startPanX + dx,
        y: gestureRef.current.startPanY + dy
      });
    }
  };

  const handleCompareTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      gestureRef.current.mode = 'none';
      if (zoom <= 1.03) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && zoom > 1.02) {
      gestureRef.current = {
        mode: 'pan',
        startDist: 0,
        startZoom: zoom,
        startPanX: pan.x,
        startPanY: pan.y,
        startTouchX: e.touches[0].clientX,
        startTouchY: e.touches[0].clientY
      };
    }
  };

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

    const targetRegionId = activeRegionId || puzzle.regions[0]?.id;
    const updatedRegions = puzzle.regions.map((reg) => {
      if (existing) {
        return {
          ...reg,
          cellIds: reg.cellIds.filter((id) => id !== cellId)
        };
      }
      if (reg.id === targetRegionId) {
        return {
          ...reg,
          cellIds: reg.cellIds.includes(cellId) ? reg.cellIds : [...reg.cellIds, cellId]
        };
      }
      return reg;
    });

    setPuzzle((prev) => ({
      ...prev,
      cells: updatedCells,
      regions: updatedRegions
    }));
  };

  const handleCellInteraction = (cellId: string) => {
    if (editMode === 'cells') {
      handleToggleCell(cellId);
    } else if (editMode === 'select') {
      const reg = puzzle.regions.find((r) => r.cellIds.includes(cellId));
      if (reg) {
        setActiveRegionId(reg.id);
      }
    } else {
      // In Assign Regions mode, holes must never be selected or added to regions
      const isPlayable = puzzle.cells.some((c) => c.id === cellId);
      if (!isPlayable) return;
      handleCellClick(cellId);
    }
  };

  // Direct tap-to-edit on any condition badge on the board
  const handleBadgeClick = (regionId: string) => {
    setShowEditPane(true);
    setDrawerTab('regions');
    setActiveRegionId(regionId);
  };

  // Toggle cell membership in active region
  const handleCellClick = (cellId: string) => {
    if (!activeRegionId) return;
    // Holes must never be assigned to a region
    const isPlayable = puzzle.cells.some((c) => c.id === cellId);
    if (!isPlayable) return;

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

  const handleUpdateRegionColor = (id: string, color: string) => {
    setPuzzle((prev) => ({
      ...prev,
      regions: prev.regions.map((r) => (r.id === id ? { ...r, color } : r))
    }));
  };

  const handleUpdateRegionConstraint = (id: string, constraint: Constraint | null) => {
    setPuzzle((prev) => ({
      ...prev,
      regions: prev.regions.map((r) => (r.id === id ? { ...r, constraint } : r))
    }));
  };

  const handleExportPuzzle = () => {
    const blob = new Blob([JSON.stringify(puzzle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(puzzle.name || 'imported_puzzle').toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          borderBottom: '1px solid #e2e8f0',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

          <SolvabilityBadge puzzle={puzzle} />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handleExportPuzzle}
            title="Save reconstructed puzzle as JSON"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Save</span>
          </button>

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
            Tap a badge or open Edit to assign its constraint rule.
          </span>
        </div>
      )}

      {/* Main verification comparison area */}
      <div className="verification-main-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left/Top Side: Side-by-side Original and Reconstructed Puzzle */}
        <div
          data-zoomed={zoom > 1.02 ? 'true' : 'false'}
          onTouchStart={handleCompareTouchStart}
          onTouchMove={handleCompareTouchMove}
          onTouchEnd={handleCompareTouchEnd}
          onTouchCancel={handleCompareTouchEnd}
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            padding: '10px',
            overflow: 'hidden',
            background: '#f1f5f9',
            touchAction: zoom > 1.02 ? 'none' : 'pan-x pan-y pinch-zoom'
          }}
        >
          {zoom > 1.03 && (
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 50,
                padding: '6px 12px',
                borderRadius: '999px',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
              }}
            >
              Reset Zoom ({Math.round(zoom * 100)}%)
            </button>
          )}
          <div
            className="verification-side-by-side"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              transform: zoom > 1.01 ? `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` : undefined,
              transformOrigin: 'center center'
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px', gap: '6px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  RECONSTRUCTED PUZZLE
                </div>
                {showEditPane && (
                  <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px' }}>
                    <button
                      onClick={() => setEditMode('select')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: editMode === 'select' ? '#4f46e5' : 'transparent',
                        color: editMode === 'select' ? '#ffffff' : '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 600
                      }}
                    >
                      Select Region
                    </button>
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
                activeRegionId={showEditPane ? activeRegionId : null}
                gridBounds={initialGridBounds}
                showHoles={showEditPane}
                editMode={editMode}
                onCellClick={showEditPane ? handleCellInteraction : undefined}
                onRegionBadgeClick={handleBadgeClick}
              />
            </div>
          </div>
        </div>

        {/* Correction Sidebar / Mobile Bottom Drawer */}
        {showEditPane && (
          <aside
            className="verification-edit-drawer"
            style={{
              width: '360px',
              borderLeft: '1px solid #e2e8f0',
              padding: '14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#ffffff'
            }}
          >
            {/* Quick tab switcher inside the drawer */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              <button
                type="button"
                onClick={() => setDrawerTab('regions')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: drawerTab === 'regions' ? '#ffffff' : 'transparent',
                  color: drawerTab === 'regions' ? '#0f172a' : '#64748b',
                  boxShadow: drawerTab === 'regions' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                Regions ({puzzle.regions.length})
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('dominoes')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: drawerTab === 'dominoes' ? '#ffffff' : 'transparent',
                  color: drawerTab === 'dominoes' ? '#0f172a' : '#64748b',
                  boxShadow: drawerTab === 'dominoes' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                Dominoes ({puzzle.dominoes.length})
              </button>
            </div>

            {drawerTab === 'regions' ? (
              <>
                <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#eef2ff', border: '1px solid #c7d2fe', fontSize: '0.78rem', color: '#3730a3' }}>
                  {editMode === 'select' && 'Select Region mode: Tap any cell or badge on the board to select and focus its region in the list.'}
                  {editMode === 'regions' && 'Assign Regions mode: Tap playable cells on the board to add or remove them from the active region.'}
                  {editMode === 'cells' && 'Toggle Cells/Holes mode: Tap cells or dashed slots on the board to toggle between playable cells and holes.'}
                </div>

                <RegionListEditor
                  regions={puzzle.regions}
                  activeRegionId={activeRegionId}
                  onSelectRegion={setActiveRegionId}
                  onAddRegion={handleAddRegion}
                  onDeleteRegion={handleDeleteRegion}
                  onUpdateRegionColor={handleUpdateRegionColor}
                  onUpdateRegionConstraint={handleUpdateRegionConstraint}
                />
              </>
            ) : (
              <DominoInventoryEditor
                dominoes={puzzle.dominoes}
                onAddDomino={handleAddDomino}
                onDeleteDomino={handleDeleteDomino}
                onUpdateDominoValue={handleUpdateDominoValue}
                onSwapDomino={handleSwapDomino}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
