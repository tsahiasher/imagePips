import { CellId, Puzzle } from '../domain/puzzle';
import { Constraint } from '../domain/constraints';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageDataLike {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export interface DetectedCellCandidate {
  id: CellId;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isPlayable: boolean;
  confidence: number;
  colorHex: string;
  isHole: boolean;
  rejectionReason?: string;
}

export interface DetectedBadgeCandidate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colorHex: string;
  recognizedToken: string;
  parsedConstraint: Constraint | null;
  confidence: number;
  cropDataUrl?: string;
  rejectionReason?: string;
  associatedRegionId?: string;
}

export interface DetectedDominoHalfInfo {
  value: number;
  confidence: number;
  pipCount: number;
  pipBlobs: Array<{ cx: number; cy: number; r: number }>;
}

export interface DetectedDominoCandidate {
  id: string;
  box: BoundingBox;
  orientation: 'horizontal' | 'vertical';
  halfA: DetectedDominoHalfInfo;
  halfB: DetectedDominoHalfInfo;
  confidence: number;
  cropDataUrl?: string;
  rejectionReason?: string;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportDebugData {
  sessionId: string;
  imageWidth: number;
  imageHeight: number;
  boardBox: BoundingBox | null;
  trayBox: BoundingBox | null;
  cellSize: number;
  gridOrigin: { x: number; y: number };
  gridRows: number;
  gridCols: number;
  detectedCells: DetectedCellCandidate[];
  rejectedCellCandidates: DetectedCellCandidate[];
  detectedBadges: DetectedBadgeCandidate[];
  rejectedBadges: DetectedBadgeCandidate[];
  detectedDominoes: DetectedDominoCandidate[];
  rejectedDominoes?: DetectedDominoCandidate[];
  reconstructedPuzzle: Puzzle;
  validation: ImportValidationResult;
  sourceImageUrl: string;
}
