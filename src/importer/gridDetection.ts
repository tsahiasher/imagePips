import { BoundingBox, ImageDataLike } from './types';

export interface GridParameters {
  rows: number;
  cols: number;
  cellSize: number;
  cellWidth: number;
  cellHeight: number;
  originX: number;
  originY: number;
  playableCount: number;
}

/**
 * Estimates optimal square cell grid parameters inside the board bounding box,
 * globally guided by the expected playable cell count (2 * dominoCount).
 */
export function estimateGrid(
  image: ImageDataLike,
  boardBox: BoundingBox,
  expectedPlayableCells?: number
): GridParameters {
  const data = image.data;
  const imgW = image.width;
  const imgH = image.height;

  let bestParams: GridParameters = {
    rows: 4,
    cols: 4,
    cellSize: Math.round(boardBox.width / 4),
    cellWidth: boardBox.width / 4,
    cellHeight: boardBox.height / 4,
    originX: boardBox.x,
    originY: boardBox.y,
    playableCount: 0
  };

  let bestScore = -Infinity;

  // Search candidate grid divisions (cols: 3 to 10, rows: 3 to 9)
  for (let c = 3; c <= 10; c++) {
    const cellW = boardBox.width / c;
    if (cellW < 55 || cellW > 220) continue;

    for (let r = 3; r <= 9; r++) {
      const cellH = boardBox.height / r;
      if (cellH < 55 || cellH > 220) continue;

      // Aspect ratio of cells must be approximately 1:1 square
      const aspectDeviation = Math.abs(cellW - cellH) / cellW;
      if (aspectDeviation > 0.18) continue;

      let playableCount = 0;

      // Check interior of each candidate cell in this grid
      for (let rowIdx = 0; rowIdx < r; rowIdx++) {
        for (let colIdx = 0; colIdx < c; colIdx++) {
          const cx = Math.floor(boardBox.x + (colIdx + 0.5) * cellW);
          const cy = Math.floor(boardBox.y + (rowIdx + 0.5) * cellH);

          if (cx < 0 || cx >= imgW || cy < 0 || cy >= imgH) continue;

          // Sample 5 points near the center to avoid border noise
          const samples: Array<{ r: number; g: number; b: number }> = [];
          const offsets = [
            [0, 0],
            [-4, -4],
            [4, -4],
            [-4, 4],
            [4, 4]
          ];

          for (const [ox, oy] of offsets) {
            const sx = cx + ox;
            const sy = cy + oy;
            if (sx >= 0 && sx < imgW && sy >= 0 && sy < imgH) {
              const idx = (sy * imgW + sx) * 4;
              samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
            }
          }

          if (samples.length === 0) continue;

          const avgR = samples.reduce((acc, s) => acc + s.r, 0) / samples.length;
          const avgG = samples.reduce((acc, s) => acc + s.g, 0) / samples.length;
          const avgB = samples.reduce((acc, s) => acc + s.b, 0) / samples.length;

          // Pure white background: avg values > 246
          const isWhiteBackground = avgR > 246 && avgG > 246 && avgB > 246;
          if (!isWhiteBackground) {
            playableCount++;
          }
        }
      }

      // Scoring:
      let score = 0;

      // Strong reward if matching expected playable cells (2 * domino count)
      if (expectedPlayableCells && expectedPlayableCells > 0) {
        const diff = Math.abs(playableCount - expectedPlayableCells);
        // Heavy penalty for difference from expected cell count
        score -= diff * 150;
        if (diff === 0) {
          score += 500;
        }
      } else {
        score += playableCount * 10;
      }

      // Penalty for non-squareness
      score -= aspectDeviation * 100;

      if (score > bestScore) {
        bestScore = score;
        bestParams = {
          rows: r,
          cols: c,
          cellSize: Math.round((cellW + cellH) / 2),
          cellWidth: cellW,
          cellHeight: cellH,
          originX: boardBox.x,
          originY: boardBox.y,
          playableCount
        };
      }
    }
  }

  return bestParams;
}
