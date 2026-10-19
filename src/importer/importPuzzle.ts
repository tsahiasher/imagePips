import { Constraint } from '../domain/constraints';
import { DominoDefinition } from '../domain/domino';
import { Cell, Puzzle, computeConnectedComponents } from '../domain/puzzle';
import { solvePuzzle } from '../game/solver';
import { detectConditionBadges } from './badgeDetection';
import { detectGridCells } from './cellDetection';
import { detectDominoesInTray } from './dominoDetection';
import { detectGameAreas } from './gameAreaDetection';
import { estimateGrid } from './gridDetection';
import { loadImageFromSource } from './loadImage';
import { detectRegions } from './regionDetection';
import { DetectedBadgeCandidate, ImportDebugData, ImportValidationResult } from './types';
import { isImportDebugEnabled } from './debugConfig';

export interface ImportProgressUpdate {
  stage: string;
  percent: number;
}

/**
 * Generates plausible OCR confusion alternatives for a constraint given the region size.
 */
function getPlausibleConstraintAlternatives(
  constraint: Constraint,
  cellCount: number
): Constraint[] {
  const maxSum = cellCount * 6;
  const alts: Constraint[] = [];

  const addSumAlt = (v: number) => {
    if (v >= 0 && v <= maxSum && !(constraint.type === 'sum' && constraint.value === v)) {
      alts.push({ type: 'sum', value: v });
    }
  };
  const addGtAlt = (v: number) => {
    if (v >= 0 && v < maxSum && !(constraint.type === 'greaterThan' && constraint.value === v)) {
      alts.push({ type: 'greaterThan', value: v });
    }
  };
  const addLtAlt = (v: number) => {
    if (v > 0 && v <= maxSum && !(constraint.type === 'lessThan' && constraint.value === v)) {
      alts.push({ type: 'lessThan', value: v });
    }
  };

  if (constraint.type === 'equal') {
    if (cellCount <= 7) alts.push({ type: 'different' });
    return alts;
  }
  if (constraint.type === 'different') {
    alts.push({ type: 'equal' });
    return alts;
  }

  const val = constraint.value;
  const digitSwaps: Record<number, number[]> = {
    0: [8, 6],
    1: [7, 4, 5],
    2: [1],
    3: [5, 8],
    4: [6, 1],
    5: [6, 3, 8, 1],
    6: [8, 4, 5, 0],
    7: [1],
    8: [6, 5, 9, 3, 0],
    9: [8]
  };

  const candidateValues: number[] = [];
  if (val < 10) {
    for (const s of digitSwaps[val] ?? []) {
      candidateValues.push(s);
    }
    // Sometimes 1x or 2x had its leading digit clipped, or 1x <-> 2x
    candidateValues.push(10 + val, 20 + val);
  } else {
    const tens = Math.floor(val / 10);
    const ones = val % 10;
    // Leading digit 1 <-> 2
    if (tens === 1) candidateValues.push(20 + ones);
    if (tens === 2) candidateValues.push(10 + ones);
    // Second digit swap
    for (const s of digitSwaps[ones] ?? []) {
      candidateValues.push(tens * 10 + s);
    }
  }

  if (constraint.type === 'sum') {
    for (const v of candidateValues) addSumAlt(v);
    // Also check if a 2-digit number 2x was actually >1x (e.g. 28 -> >14 or >18)
    if (val >= 20 && val < 30) {
      const ones = val % 10;
      addGtAlt(10 + ones);
      for (const s of digitSwaps[ones] ?? []) {
        addGtAlt(10 + s);
      }
    }
    addGtAlt(val);
    addLtAlt(val);
  } else if (constraint.type === 'greaterThan') {
    for (const v of candidateValues) addGtAlt(v);
    addLtAlt(val);
    addSumAlt(val);
  } else if (constraint.type === 'lessThan') {
    for (const v of candidateValues) addLtAlt(v);
    addGtAlt(val);
    addSumAlt(val);
  }

  return alts;
}

/**
 * If an imported puzzle has valid cell/domino counts but 0 valid solutions,
 * attempts single-badge OCR confusion repairs ordered by lowest badge confidence.
 * Prioritizes digit confusions that preserve the operator before testing operator flips.
 */
function tryAutoRepairUnsolvablePuzzle(
  puzzle: Puzzle,
  acceptedBadges: DetectedBadgeCandidate[]
): { repairedPuzzle: Puzzle; repairNote?: string } {
  const initialSolve = solvePuzzle(puzzle, 25000);
  if (initialSolve.solvable || initialSolve.timedOut) {
    return { repairedPuzzle: puzzle };
  }

  // Map regionId -> badge confidence
  const confidenceByRegion = new Map<string, number>();
  for (const b of acceptedBadges) {
    if (b.associatedRegionId) {
      confidenceByRegion.set(b.associatedRegionId, b.confidence);
    }
  }

  const constrainedRegions = puzzle.regions
    .filter((r) => r.constraint != null && r.cellIds.length > 0)
    .slice()
    .sort((a, b) => (confidenceByRegion.get(a.id) ?? 0.5) - (confidenceByRegion.get(b.id) ?? 0.5));

  for (const allowOperatorFlip of [false, true]) {
    for (const targetRegion of constrainedRegions) {
      const orig = targetRegion.constraint;
      if (!orig) continue;
      const alts = getPlausibleConstraintAlternatives(orig, targetRegion.cellIds.length);

      for (const alt of alts) {
        const isPrimaryDigitConfusion =
          alt.type === orig.type ||
          (orig.type === 'sum' && orig.value >= 20 && alt.type === 'greaterThan');
        if (isPrimaryDigitConfusion === allowOperatorFlip) continue;

        const candidateRegions = puzzle.regions.map((r) =>
          r.id === targetRegion.id ? { ...r, constraint: alt } : r
        );
        const candidatePuzzle: Puzzle = {
          ...puzzle,
          regions: candidateRegions
        };
        const check = solvePuzzle(candidatePuzzle, 15000);
        if (check.solvable) {
          return {
            repairedPuzzle: candidatePuzzle,
            repairNote: `Auto-repaired region ${targetRegion.id} constraint to ${JSON.stringify(alt)} via solver verification.`
          };
        }
      }
    }
  }

  return { repairedPuzzle: puzzle };
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

  // Invariant 6: Mathematical solvability check
  if (errors.length === 0 && playableCellCount > 0) {
    const solveCheck = solvePuzzle(puzzle, 25000);
    if (!solveCheck.solvable && !solveCheck.timedOut) {
      warnings.push(
        'Reconstructed puzzle has no valid mathematical solution — please double-check the region rules and dominoes.'
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

  const reportProgress = async (stage: string, percent: number) => {
    onProgress?.({ stage, percent });
    if (typeof window !== 'undefined' && onProgress) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  // Stage 1: Load image
  await reportProgress('Analyzing image…', 10);
  const { imageData, width, height, dataUrl } = await loadImageFromSource(source);

  // Stage 2: Detect game areas (board box & domino tray box)
  await reportProgress('Detecting board and tray…', 25);
  const { boardBox, trayBox } = detectGameAreas(imageData);

  // Stage 3: Detect dominoes in tray first (global constraint N)
  await reportProgress('Detecting dominoes and counting pips…', 40);
  const { acceptedDominoes, rejectedCandidates: rejectedDominoes } = detectDominoesInTray(
    imageData,
    trayBox
  );
  const dominoCount = acceptedDominoes.length;
  const expectedPlayableCells = dominoCount * 2;

  // Stage 4: Estimate optimal board grid using 2N constraint
  await reportProgress('Estimating board grid…', 55);
  const gridParams = estimateGrid(imageData, boardBox, expectedPlayableCells);

  // Stage 5: Detect cells based on direct visual evidence
  await reportProgress('Identifying playable cells and holes…', 68);
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
  await reportProgress('Finding colored regions…', 80);
  const rawRegions = detectRegions(playableCells, imageData);

  // Stage 7: Detect condition badges and associate with regions
  await reportProgress('Recognizing condition badges…', 90);
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

  // Assemble puzzle & run mathematical solvability verification / self-healing
  await reportProgress('Validating puzzle solvability…', 98);
  const rawPuzzle: Puzzle = {
    id: `imported_${Date.now()}`,
    name: 'Imported Puzzle',
    cells: finalCells,
    regions: updatedRegions,
    dominoes: finalDominoes
  };

  const { repairedPuzzle: puzzle, repairNote } =
    playableCells.length === dominoCount * 2 && dominoCount > 0
      ? tryAutoRepairUnsolvablePuzzle(rawPuzzle, acceptedBadges)
      : { repairedPuzzle: rawPuzzle, repairNote: undefined };

  if (repairNote && isImportDebugEnabled()) {
    console.log(`[DEBUG AUTO-REPAIR] ${repairNote}`);
  }

  const validation = validateImportResult(playableCells.length, dominoCount, puzzle);

  if (isImportDebugEnabled()) {
    console.log(
      `[DEBUG IMPORT COMPLETE] Image: ${width}x${height}, Tray Dominoes: ${dominoCount}, Playable Cells: ${playableCells.length}, Regions: ${puzzle.regions.length}, Accepted Badges: ${acceptedBadges.length}, Valid: ${validation.valid}`
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

  await reportProgress('Ready', 100);

  return { puzzle, debugData };
}

