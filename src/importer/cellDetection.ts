import { DetectedCellCandidate, ImageDataLike } from './types';
import { GridParameters } from './gridDetection';

export interface CellDetectionResult {
  detectedCells: DetectedCellCandidate[];
  rejectedCells: DetectedCellCandidate[];
}

/**
 * Classifies each grid location as playable or hole based on direct image evidence.
 * Samples the central cell interior to avoid boundary and badge contamination.
 */
export function detectGridCells(
  image: ImageDataLike,
  grid: GridParameters
): CellDetectionResult {
  const data = image.data;
  const imgW = image.width;
  const imgH = image.height;

  const detectedCells: DetectedCellCandidate[] = [];
  const rejectedCells: DetectedCellCandidate[] = [];

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cellLeft = Math.round(grid.originX + c * grid.cellWidth);
      const cellTop = Math.round(grid.originY + r * grid.cellHeight);
      const cellW = Math.round(grid.cellWidth);
      const cellH = Math.round(grid.cellHeight);

      // Sample cell interior shifted slightly toward upper-left (0.40) to guarantee
      // avoidance of condition diamond badges which sit on lower-right corners/edges
      const cx = Math.round(cellLeft + cellW * 0.40);
      const cy = Math.round(cellTop + cellH * 0.40);

      // Sample a compact 9-point grid centered strictly within the cell core
      const sampleOffsets = [
        [0, 0],
        [-8, -8],
        [8, -8],
        [-8, 8],
        [8, 8],
        [-8, 0],
        [8, 0],
        [0, -8],
        [0, 8]
      ];

      const samples: Array<{ r: number; g: number; b: number }> = [];

      for (const [ox, oy] of sampleOffsets) {
        const sx = cx + ox;
        const sy = cy + oy;
        if (sx >= 0 && sx < imgW && sy >= 0 && sy < imgH) {
          const idx = (sy * imgW + sx) * 4;
          samples.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
          });
        }
      }

      if (samples.length === 0) continue;

      const avgR = Math.round(samples.reduce((sum, s) => sum + s.r, 0) / samples.length);
      const avgG = Math.round(samples.reduce((sum, s) => sum + s.g, 0) / samples.length);
      const avgB = Math.round(samples.reduce((sum, s) => sum + s.b, 0) / samples.length);

      const maxVal = Math.max(avgR, avgG, avgB);
      const minVal = Math.min(avgR, avgG, avgB);
      const delta = maxVal - minVal;
      const brightness = (avgR + avgG + avgB) / 3;
      const saturation = maxVal > 0 ? delta / maxVal : 0;

      // Pure white webpage background
      const isWhiteBackground = brightness > 246 && saturation < 0.04;
      const isPlayable = !isWhiteBackground;

      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      const colorHex = `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`;

      // Compute multi-signal confidence
      const aspect = cellW / cellH;
      const geometryConfidence = Math.max(0, 1 - Math.abs(1 - aspect) * 2);
      const colorConfidence = isPlayable
        ? Math.min(1.0, 0.7 + saturation * 0.4 + (255 - brightness) / 300)
        : 0.95;
      const confidence = Number((geometryConfidence * 0.4 + colorConfidence * 0.6).toFixed(2));

      const candidate: DetectedCellCandidate = {
        id: `${r},${c}`,
        row: r,
        col: c,
        x: cellLeft,
        y: cellTop,
        width: cellW,
        height: cellH,
        isPlayable,
        confidence,
        colorHex,
        isHole: !isPlayable,
        rejectionReason: !isPlayable ? 'Whitespace background / non-playable hole' : undefined
      };

      detectedCells.push(candidate);
      if (!isPlayable) {
        rejectedCells.push(candidate);
      }
    }
  }

  return { detectedCells, rejectedCells };
}
