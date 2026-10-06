import { DominoDefinition } from '../domain/domino';
import { Cell, Puzzle, computeConnectedComponents } from '../domain/puzzle';
import { detectConditionBadges } from './badgeDetection';
import { detectGridCells } from './cellDetection';
import { detectDominoesInTray } from './dominoDetection';
import { detectGameAreas } from './gameAreaDetection';
import { estimateGrid } from './gridDetection';
import { loadImageFromSource } from './loadImage';
import { detectRegions } from './regionDetection';
import { ImportDebugData, ImportValidationResult } from './types';
import { isImportDebugEnabled } from './debugConfig';

export interface ImportProgressUpdate {
  stage: string;
  percent: number;
}

/**
 * Validates the reconstructed puzzle according to strict integrity invariants.
 */
export function validateImportResult(
  playableCellCount: number,
  dominoCount: number,
  puzzle: Puzzle
): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const expectedCells = dominoCount * 2;

  // Invariant 1: playableCellCount MUST equal 2 * dominoCount
  if (playableCellCount !== expectedCells) {
    errors.push(
      `Board detection is inconsistent: detected ${playableCellCount} cells but only ${dominoCount} dominoes (${expectedCells} slots).`
    );
  }

  // Invariant 2: playableCellCount must be even
  if (playableCellCount % 2 !== 0) {
    errors.push(`Playable cell count (${playableCellCount}) must be even.`);
  }

  // Invariant 3: Regions must contain actual cells
  const allCellIds = new Set(puzzle.cells.map((c) => c.id));
  for (const reg of puzzle.regions) {
    if (reg.cellIds.length === 0) {
      warnings.push(`Region ${reg.id} contains no cells.`);
    }
    for (const cId of reg.cellIds) {
      if (!allCellIds.has(cId)) {
        errors.push(`Region ${reg.id} references non-existent cell ${cId}.`);
      }
    }
  }

  // Invariant 4: No cell should appear in multiple regions
  const seenCellIds = new Set<string>();
  for (const reg of puzzle.regions) {
    for (const cId of reg.cellIds) {
      if (seenCellIds.has(cId)) {
        errors.push(`Cell ${cId} is assigned to multiple regions.`);
      }
      seenCellIds.add(cId);
    }
  }

  // Invariant 5: Unknown constraints should be flagged for user correction (excluding intentional neutral unconstrained cells)
  const unconstrainedRegions = puzzle.regions.filter(
    (r) => !r.constraint && r.color !== '#64748b' && r.color !== '#e2e8f0' && r.color !== '#dfccc4'
  );
  if (unconstrainedRegions.length > 0) {
    warnings.push(
      `${unconstrainedRegions.length} region(s) have unknown/missing constraints and require verification.`
    );
    if (!isImportDebugEnabled() && typeof window !== 'undefined') {
      console.info(
        '%c[Hint] An imported region is missing a condition badge. Run `enableImportDebug()` in the console or add `?debug=true` to the URL to view diagnostic logs.',
        'color: #0284c7; font-style: italic;'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * End-to-end browser-only puzzle recognition pipeline.
 * Clean, isolated lifecycle with no stale data leakage and strict invariant enforcement.
 */
export async function importPuzzleFromImage(
  source: File | Blob | string | Uint8Array,
  onProgress?: (update: ImportProgressUpdate) => void,
  sessionId?: string
): Promise<{ puzzle: Puzzle; debugData: ImportDebugData }> {
  const activeSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Stage 1: Load image
  onProgress?.({ stage: 'Analyzing image…', percent: 10 });
  const { imageData, width, height, dataUrl } = await loadImageFromSource(source);

  // Stage 2: Detect game areas (board box & domino tray box)
  onProgress?.({ stage: 'Detecting board and tray…', percent: 25 });
  const { boardBox, trayBox } = detectGameAreas(imageData);

  // Stage 3: Detect dominoes in tray first (global constraint N)
  onProgress?.({ stage: 'Detecting dominoes and counting pips…', percent: 40 });
  const { acceptedDominoes, rejectedCandidates: rejectedDominoes } = detectDominoesInTray(
    imageData,
    trayBox
  );
  const dominoCount = acceptedDominoes.length;
  const expectedPlayableCells = dominoCount * 2;

  // Stage 4: Estimate optimal board grid using 2N constraint
  onProgress?.({ stage: 'Estimating board grid…', percent: 55 });
  const gridParams = estimateGrid(imageData, boardBox, expectedPlayableCells);

  // Stage 5: Detect cells based on direct visual evidence
  onProgress?.({ stage: 'Identifying playable cells and holes…', percent: 68 });
  const { detectedCells, rejectedCells } = detectGridCells(imageData, gridParams);
  const playableCells = detectedCells.filter((c) => c.isPlayable);

  // Compute connected components for playable cells
  const componentMap = computeConnectedComponents(
    playableCells.map((c) => ({ id: c.id, row: c.row, col: c.col }))
  );

  const finalCells: Cell[] = playableCells.map((c) => ({
    id: c.id,
    row: c.row,
    col: c.col,
    componentId: componentMap.get(c.id) ?? 'comp_1'
  }));

  // Stage 6: Detect regions using color clustering and dashed border evidence
  onProgress?.({ stage: 'Finding colored regions…', percent: 80 });
  const rawRegions = detectRegions(playableCells, imageData);

  // Stage 7: Detect condition badges and associate with regions
  onProgress?.({ stage: 'Recognizing condition badges…', percent: 90 });
  const { acceptedBadges, rejectedBadges, updatedRegions } = detectConditionBadges(
    imageData,
    boardBox,
    gridParams,
    rawRegions
  );

  const finalDominoes: DominoDefinition[] = acceptedDominoes.map((d, idx) => ({
    id: `d_${idx + 1}`,
    a: d.halfA.value,
    b: d.halfB.value
  }));

  // Assemble puzzle
  onProgress?.({ stage: 'Validating puzzle invariants…', percent: 98 });
  const puzzle: Puzzle = {
    id: `imported_${Date.now()}`,
    name: 'Imported Puzzle',
    cells: finalCells,
    regions: updatedRegions,
    dominoes: finalDominoes
  };

  const validation = validateImportResult(playableCells.length, dominoCount, puzzle);

  if (isImportDebugEnabled()) {
    console.log(
      `[DEBUG IMPORT COMPLETE] Image: ${width}x${height}, Tray Dominoes: ${dominoCount}, Playable Cells: ${playableCells.length}, Regions: ${updatedRegions.length}, Accepted Badges: ${acceptedBadges.length}, Valid: ${validation.valid}`
    );
  }

  const debugData: ImportDebugData = {
    sessionId: activeSessionId,
    imageWidth: width,
    imageHeight: height,
    boardBox,
    trayBox,
    cellSize: gridParams.cellSize,
    gridOrigin: { x: gridParams.originX, y: gridParams.originY },
    gridRows: gridParams.rows,
    gridCols: gridParams.cols,
    detectedCells,
    rejectedCellCandidates: rejectedCells,
    detectedBadges: acceptedBadges,
    rejectedBadges,
    detectedDominoes: acceptedDominoes,
    rejectedDominoes,
    reconstructedPuzzle: puzzle,
    validation,
    sourceImageUrl: dataUrl
  };

  onProgress?.({ stage: 'Ready', percent: 100 });

  return { puzzle, debugData };
}
