import React, { useState } from 'react';
import {
  X,
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  DetectedBadgeCandidate,
  DetectedCellCandidate,
  DetectedDominoCandidate,
  ImportDebugData
} from '../../importer/types';

interface ImportDebugViewProps {
  debugData: ImportDebugData;
  onClose: () => void;
}

export interface DebugLayerToggles {
  boardCrop: boolean;
  rawCellGrid: boolean;
  acceptedCells: boolean;
  rejectedCells: boolean;
  cellCenters: boolean;
  gridCoords: boolean;
  sparseGrid: boolean;
  colorSamples: boolean;
  regionAssignments: boolean;
  badgeCandidates: boolean;
  acceptedBadges: boolean;
  badgeTokens: boolean;
  badgeRegionLinks: boolean;
  dominoCandidates: boolean;
  acceptedDominoes: boolean;
  dominoHalves: boolean;
  pipBlobs: boolean;
  normalizedPuzzle: boolean;
}

export const ImportDebugView: React.FC<ImportDebugViewProps> = ({
  debugData,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overlay' | 'cells' | 'badges' | 'dominoes' | 'validation'>('overlay');

  // Layer toggles
  const [layers, setLayers] = useState<DebugLayerToggles>({
    boardCrop: true,
    rawCellGrid: false,
    acceptedCells: true,
    rejectedCells: true,
    cellCenters: false,
    gridCoords: true,
    sparseGrid: true,
    colorSamples: true,
    regionAssignments: true,
    badgeCandidates: false,
    acceptedBadges: true,
    badgeTokens: true,
    badgeRegionLinks: true,
    dominoCandidates: false,
    acceptedDominoes: true,
    dominoHalves: true,
    pipBlobs: true,
    normalizedPuzzle: false
  });

  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'cell' | 'badge' | 'domino';
    data: DetectedCellCandidate | DetectedBadgeCandidate | DetectedDominoCandidate;
  } | null>(null);

  const {
    sessionId,
    imageWidth,
    imageHeight,
    boardBox,
    trayBox,
    cellSize,
    gridOrigin,
    gridRows,
    gridCols,
    detectedCells,
    rejectedCellCandidates,
    detectedBadges,
    rejectedBadges,
    detectedDominoes,
    rejectedDominoes = [],
    reconstructedPuzzle,
    validation,
    sourceImageUrl
  } = debugData;

  const toggleLayer = (key: keyof DebugLayerToggles) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllLayers = (val: boolean) => {
    setLayers({
      boardCrop: val,
      rawCellGrid: val,
      acceptedCells: val,
      rejectedCells: val,
      cellCenters: val,
      gridCoords: val,
      sparseGrid: val,
      colorSamples: val,
      regionAssignments: val,
      badgeCandidates: val,
      acceptedBadges: val,
      badgeTokens: val,
      badgeRegionLinks: val,
      dominoCandidates: val,
      acceptedDominoes: val,
      dominoHalves: val,
      pipBlobs: val,
      normalizedPuzzle: val
    });
  };

  const playableCells = detectedCells.filter((c) => c.isPlayable);

  // Region colors lookup
  const cellRegionMap = new Map<string, { color: string; regionId: string; constraintToken?: string }>();
  for (const reg of reconstructedPuzzle.regions) {
    for (const cId of reg.cellIds) {
      cellRegionMap.set(cId, {
        color: reg.color,
        regionId: reg.id,
        constraintToken: reg.constraint?.type
      });
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2100,
        background: 'rgba(7, 11, 22, 0.96)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text-main)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.9)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#a5b4fc',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}
          >
            CV INSPECTOR
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              Recognition Debug Overlays & Diagnostics
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Session: {sessionId} • Image: {imageWidth} × {imageHeight} px • Grid: {gridCols}×{gridRows}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['overlay', 'cells', 'badges', 'dominoes', 'validation'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: activeTab === tab ? '#6366f1' : 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'overlay' ? 'Visual Overlays (18 Layers)' : tab}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '8px',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer'
          }}
          title="Close Inspector"
        >
          <X size={18} />
        </button>
      </header>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {activeTab === 'overlay' && (
          <>
            {/* Left Interactive Multi-Layer Canvas */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                padding: '16px',
                overflow: 'auto',
                background: '#090d16'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  maxHeight: '85vh',
                  maxWidth: '100%',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={sourceImageUrl}
                  alt="Raw Screenshot"
                  style={{
                    maxHeight: '85vh',
                    maxWidth: '100%',
                    display: 'block'
                  }}
                />

                {/* SVG Visual Debugging Overlays */}
                <svg
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'auto'
                  }}
                  viewBox={`0 0 ${imageWidth} ${imageHeight}`}
                >
                  {/* Layer 1: Detected Game Areas */}
                  {layers.boardCrop && boardBox && (
                    <g>
                      <rect
                        x={boardBox.x}
                        y={boardBox.y}
                        width={boardBox.width}
                        height={boardBox.height}
                        fill="rgba(6, 182, 212, 0.05)"
                        stroke="#06b6d4"
                        strokeWidth={4}
                        strokeDasharray="12 6"
                      />
                      <text
                        x={boardBox.x + 8}
                        y={boardBox.y + 24}
                        fill="#06b6d4"
                        fontSize={18}
                        fontWeight="bold"
                      >
                        Board Area ({boardBox.width}×{boardBox.height})
                      </text>
                    </g>
                  )}

                  {layers.boardCrop && trayBox && (
                    <g>
                      <rect
                        x={trayBox.x}
                        y={trayBox.y}
                        width={trayBox.width}
                        height={trayBox.height}
                        fill="rgba(245, 158, 11, 0.05)"
                        stroke="#f59e0b"
                        strokeWidth={4}
                        strokeDasharray="12 6"
                      />
                      <text
                        x={trayBox.x + 8}
                        y={trayBox.y + 24}
                        fill="#f59e0b"
                        fontSize={18}
                        fontWeight="bold"
                      >
                        Domino Tray Area ({trayBox.width}×{trayBox.height})
                      </text>
                    </g>
                  )}

                  {/* Layer 2: Raw Grid Lattice */}
                  {layers.rawCellGrid && (
                    <g stroke="rgba(255, 255, 255, 0.25)" strokeWidth={2} strokeDasharray="4 4">
                      {Array.from({ length: gridRows + 1 }).map((_, r) => (
                        <line
                          key={`gl_r_${r}`}
                          x1={gridOrigin.x}
                          y1={gridOrigin.y + r * cellSize}
                          x2={gridOrigin.x + gridCols * cellSize}
                          y2={gridOrigin.y + r * cellSize}
                        />
                      ))}
                      {Array.from({ length: gridCols + 1 }).map((_, c) => (
                        <line
                          key={`gl_c_${c}`}
                          x1={gridOrigin.x + c * cellSize}
                          y1={gridOrigin.y}
                          x2={gridOrigin.x + c * cellSize}
                          y2={gridOrigin.y + gridRows * cellSize}
                        />
                      ))}
                    </g>
                  )}

                  {/* Layer 3 & 4: Accepted and Rejected Cells */}
                  {detectedCells.map((cell) => {
                    if (cell.isPlayable && !layers.acceptedCells) return null;
                    if (!cell.isPlayable && !layers.rejectedCells) return null;

                    const regInfo = cellRegionMap.get(cell.id);
                    const isSelected = selectedEntity?.data === cell;

                    return (
                      <g
                        key={`cell_rect_${cell.id}`}
                        onClick={() => setSelectedEntity({ type: 'cell', data: cell })}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Region tinted background */}
                        {layers.regionAssignments && regInfo && cell.isPlayable && (
                          <rect
                            x={cell.x + 4}
                            y={cell.y + 4}
                            width={cell.width - 8}
                            height={cell.height - 8}
                            rx={12}
                            fill={regInfo.color}
                            fillOpacity={0.4}
                          />
                        )}

                        <rect
                          x={cell.x}
                          y={cell.y}
                          width={cell.width}
                          height={cell.height}
                          rx={14}
                          fill={cell.isPlayable ? 'none' : 'rgba(239, 68, 68, 0.2)'}
                          stroke={
                            isSelected
                              ? '#ffffff'
                              : cell.isPlayable
                              ? '#10b981'
                              : '#ef4444'
                          }
                          strokeWidth={isSelected ? 5 : cell.isPlayable ? 3 : 2}
                          strokeDasharray={cell.isPlayable ? undefined : '6 4'}
                        />

                        {/* Layer 5: Cell Centers */}
                        {layers.cellCenters && (
                          <circle
                            cx={cell.x + cell.width / 2}
                            cy={cell.y + cell.height / 2}
                            r={5}
                            fill="#38bdf8"
                          />
                        )}

                        {/* Layer 6: Inferred Grid Coordinates */}
                        {layers.gridCoords && (
                          <text
                            x={cell.x + 8}
                            y={cell.y + 20}
                            fill={cell.isPlayable ? '#ffffff' : '#f87171'}
                            fontSize={14}
                            fontWeight="bold"
                          >
                            ({cell.row},{cell.col})
                          </text>
                        )}

                        {/* Layer 8: Region Color Samples */}
                        {layers.colorSamples && cell.isPlayable && (
                          <g>
                            <circle
                              cx={cell.x + cell.width / 2}
                              cy={cell.y + cell.height / 2}
                              r={10}
                              fill={cell.colorHex}
                              stroke="#ffffff"
                              strokeWidth={2}
                            />
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Layer 10 & 11: Badge Candidates and Accepted Badges */}
                  {detectedBadges.map((badge) => {
                    if (!layers.acceptedBadges) return null;
                    const isSelected = selectedEntity?.data === badge;
                    const bRadius = badge.width / 2;

                    return (
                      <g
                        key={`badge_${badge.id}`}
                        onClick={() => setSelectedEntity({ type: 'badge', data: badge })}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Diamond shape */}
                        <polygon
                          points={`
                            ${badge.x},${badge.y - bRadius}
                            ${badge.x + bRadius},${badge.y}
                            ${badge.x},${badge.y + bRadius}
                            ${badge.x - bRadius},${badge.y}
                          `}
                          fill="rgba(99, 102, 241, 0.4)"
                          stroke={isSelected ? '#ffffff' : '#a855f7'}
                          strokeWidth={isSelected ? 4 : 3}
                        />

                        {/* Layer 12: Badge Tokens */}
                        {layers.badgeTokens && (
                          <text
                            x={badge.x}
                            y={badge.y + 6}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize={20}
                            fontWeight="900"
                          >
                            {badge.recognizedToken}
                          </text>
                        )}

                        {/* Layer 13: Badge to Region link */}
                        {layers.badgeRegionLinks && badge.associatedRegionId && (
                          <circle
                            cx={badge.x}
                            cy={badge.y}
                            r={bRadius + 4}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            strokeDasharray="4 2"
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Layer 14 & 15: Domino Rectangles and Halves */}
                  {detectedDominoes.map((domino) => {
                    if (!layers.acceptedDominoes) return null;
                    const isSelected = selectedEntity?.data === domino;
                    const halfW = domino.box.width / 2;

                    return (
                      <g
                        key={`domino_${domino.id}`}
                        onClick={() => setSelectedEntity({ type: 'domino', data: domino })}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect
                          x={domino.box.x}
                          y={domino.box.y}
                          width={domino.box.width}
                          height={domino.box.height}
                          rx={10}
                          fill="none"
                          stroke={isSelected ? '#ffffff' : '#f59e0b'}
                          strokeWidth={isSelected ? 5 : 3}
                        />

                        {/* Layer 16: Domino Half Divider */}
                        {layers.dominoHalves && (
                          <line
                            x1={domino.box.x + halfW}
                            y1={domino.box.y}
                            x2={domino.box.x + halfW}
                            y2={domino.box.y + domino.box.height}
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="4 2"
                          />
                        )}

                        {/* Layer 17: Pip Blobs */}
                        {layers.pipBlobs && (
                          <g>
                            {domino.halfA.pipBlobs.map((blob, bIdx) => (
                              <circle
                                key={`pip_a_${bIdx}`}
                                cx={blob.cx}
                                cy={blob.cy}
                                r={Math.max(4, blob.r)}
                                fill="#ef4444"
                                stroke="#ffffff"
                                strokeWidth={1.5}
                              />
                            ))}
                            {domino.halfB.pipBlobs.map((blob, bIdx) => (
                              <circle
                                key={`pip_b_${bIdx}`}
                                cx={blob.cx}
                                cy={blob.cy}
                                r={Math.max(4, blob.r)}
                                fill="#ef4444"
                                stroke="#ffffff"
                                strokeWidth={1.5}
                              />
                            ))}
                          </g>
                        )}

                        <text
                          x={domino.box.x + 8}
                          y={domino.box.y - 6}
                          fill="#f59e0b"
                          fontSize={15}
                          fontWeight="bold"
                        >
                          {domino.id}: [{domino.halfA.value} | {domino.halfB.value}]
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Right Layer Controls & Diagnostics Sidebar */}
            <aside
              style={{
                width: '380px',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '16px',
                background: 'rgba(15, 23, 42, 0.85)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {/* Presets */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} /> 18 Switchable Layers
                  </h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setAllLayers(true)}
                      style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setAllLayers(false)}
                      style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }}
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* Layer checkboxes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                  {[
                    ['boardCrop', '1. Board & Tray Crop Boxes'],
                    ['rawCellGrid', '2. Raw Grid Lattice'],
                    ['acceptedCells', '3. Accepted Playable Cells'],
                    ['rejectedCells', '4. Rejected Candidates / Holes'],
                    ['cellCenters', '5. Estimated Cell Centers'],
                    ['gridCoords', '6. Inferred Grid Coordinates'],
                    ['sparseGrid', '7. Final Sparse Grid'],
                    ['colorSamples', '8. Cell Color Samples'],
                    ['regionAssignments', '9. Region Tint & Boundaries'],
                    ['badgeCandidates', '10. Badge Candidates'],
                    ['acceptedBadges', '11. Accepted Diamond Badges'],
                    ['badgeTokens', '12. Badge Text Recognition'],
                    ['badgeRegionLinks', '13. Badge-to-Region Links'],
                    ['dominoCandidates', '14. Domino Tray Candidates'],
                    ['acceptedDominoes', '15. Accepted Domino Rectangles'],
                    ['dominoHalves', '16. Each Domino Half Divider'],
                    ['pipBlobs', '17. Detected Pip Blobs'],
                    ['normalizedPuzzle', '18. Final Normalized Puzzle']
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: layers[key as keyof DebugLayerToggles] ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${layers[key as keyof DebugLayerToggles] ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={layers[key as keyof DebugLayerToggles]}
                        onChange={() => toggleLayer(key as keyof DebugLayerToggles)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Entity Inspector Detail Card */}
              {selectedEntity ? (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                      {selectedEntity.type} Inspector
                    </div>
                    <button
                      onClick={() => setSelectedEntity(null)}
                      style={{ background: 'transparent', padding: '2px', color: 'var(--text-dim)' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {selectedEntity.type === 'cell' && (() => {
                    const cell = selectedEntity.data as DetectedCellCandidate;
                    return (
                      <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><b>Cell ID:</b> {cell.id} (Row {cell.row}, Col {cell.col})</div>
                        <div><b>Status:</b> {cell.isPlayable ? <span style={{ color: '#34d399' }}>Playable Cell</span> : <span style={{ color: '#f87171' }}>Hole / Rejected</span>}</div>
                        {cell.rejectionReason && (
                          <div style={{ color: '#fca5a5' }}><b>Rejection Reason:</b> {cell.rejectionReason}</div>
                        )}
                        <div><b>Dimensions:</b> {cell.width} × {cell.height} px</div>
                        <div><b>Confidence:</b> {(cell.confidence * 100).toFixed(0)}%</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <b>Sampled Color:</b>
                          <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: cell.colorHex }} />
                          <span>{cell.colorHex}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {selectedEntity.type === 'badge' && (() => {
                    const badge = selectedEntity.data as DetectedBadgeCandidate;
                    return (
                      <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><b>Badge ID:</b> {badge.id}</div>
                        <div><b>Recognized Token:</b> <span style={{ color: '#38bdf8', fontWeight: 800 }}>"{badge.recognizedToken}"</span></div>
                        <div><b>Status:</b> {badge.rejectionReason ? <span style={{ color: '#f87171' }}>Rejected</span> : <span style={{ color: '#34d399' }}>Accepted</span>}</div>
                        {badge.rejectionReason && (
                          <div style={{ color: '#fca5a5' }}><b>Rejection Reason:</b> {badge.rejectionReason}</div>
                        )}
                        <div><b>Location:</b> ({badge.x}, {badge.y})</div>
                        <div><b>Confidence:</b> {(badge.confidence * 100).toFixed(0)}%</div>
                        <div><b>Associated Region:</b> {badge.associatedRegionId ?? 'None'}</div>
                      </div>
                    );
                  })()}

                  {selectedEntity.type === 'domino' && (() => {
                    const domino = selectedEntity.data as DetectedDominoCandidate;
                    return (
                      <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><b>Domino ID:</b> {domino.id}</div>
                        <div><b>Values:</b> [{domino.halfA.value} | {domino.halfB.value}]</div>
                        <div><b>Pips:</b> Half A = {domino.halfA.pipCount}, Half B = {domino.halfB.pipCount}</div>
                        <div><b>Box:</b> {domino.box.width} × {domino.box.height} px at ({domino.box.x}, {domino.box.y})</div>
                        <div><b>Confidence:</b> {(domino.confidence * 100).toFixed(0)}%</div>
                        {domino.rejectionReason && (
                          <div style={{ color: '#fca5a5' }}><b>Rejection Reason:</b> {domino.rejectionReason}</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  Click on any cell, badge, or domino in the image to view diagnostic measurements and rejection reasons.
                </div>
              )}
            </aside>
          </>
        )}

        {/* Tab 2: Cells Details */}
        {activeTab === 'cells' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
              Detected Grid Cells ({playableCells.length} Playable, {rejectedCellCandidates.length} Rejected Holes)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {detectedCells.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: c.isPlayable ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${c.isPlayable ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Cell ({c.row}, {c.col})</span>
                    <span style={{ color: c.isPlayable ? '#34d399' : '#f87171' }}>
                      {c.isPlayable ? 'Playable' : 'Hole'}
                    </span>
                  </div>
                  {c.rejectionReason && (
                    <div style={{ fontSize: '0.74rem', color: '#fca5a5' }}>
                      {c.rejectionReason}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                    <span>Color:</span>
                    <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: c.colorHex }} />
                    <span>{c.colorHex}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Confidence: {(c.confidence * 100).toFixed(0)}% • Size: {c.width}×{c.height}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Badges Details */}
        {activeTab === 'badges' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
              Detected Badges ({detectedBadges.length} Accepted, {rejectedBadges.length} Rejected)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {detectedBadges.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {b.cropDataUrl && (
                    <img
                      src={b.cropDataUrl}
                      alt="Badge crop"
                      style={{ width: '56px', height: '56px', borderRadius: '6px', background: '#000' }}
                    />
                  )}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#38bdf8' }}>
                      Token: "{b.recognizedToken}"
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      Confidence: {(b.confidence * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Location: ({b.x}, {b.y}) • Region: {b.associatedRegionId ?? 'None'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Dominoes Details */}
        {activeTab === 'dominoes' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
              Detected Dominoes ({detectedDominoes.length} Accepted, {rejectedDominoes.length} Rejected)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {detectedDominoes.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {d.cropDataUrl && (
                    <img
                      src={d.cropDataUrl}
                      alt="Domino crop"
                      style={{ width: '130px', height: '64px', borderRadius: '6px' }}
                    />
                  )}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                      {d.id}: [{d.halfA.value} | {d.halfB.value}]
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Pips: Half A = {d.halfA.pipCount} blobs, Half B = {d.halfB.pipCount} blobs
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Confidence: {(d.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}

              {rejectedDominoes.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>
                      Rejected Domino Candidate
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '4px' }}>
                      {d.rejectionReason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Validation Report */}
        {activeTab === 'validation' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>
              Import Integrity & Invariant Validation
            </h3>

            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: validation.valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${validation.valid ? '#10b981' : '#ef4444'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}
            >
              {validation.valid ? <CheckCircle2 size={24} color="#10b981" /> : <AlertTriangle size={24} color="#ef4444" />}
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: validation.valid ? '#34d399' : '#f87171' }}>
                  {validation.valid ? 'Validation Passed: Puzzle Invariants Satisfied' : 'Validation Failed: Invariants Violated'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Playable cells: {playableCells.length} • Domino count: {detectedDominoes.length} • Slots: {detectedDominoes.length * 2}
                </div>
              </div>
            </div>

            {validation.errors.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '8px' }}>Errors:</h4>
                <ul style={{ paddingLeft: '20px', color: '#fca5a5', fontSize: '0.85rem' }}>
                  {validation.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div>
                <h4 style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: '8px' }}>Warnings:</h4>
                <ul style={{ paddingLeft: '20px', color: '#fde68a', fontSize: '0.85rem' }}>
                  {validation.warnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
