import { Region } from '../domain/puzzle';
import { DetectedCellCandidate, ImageDataLike } from './types';

function parseHex(hex: string): { r: number; g: number; b: number } {
  const num = parseInt(hex.replace('#', ''), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

/**
 * Maps raw screenshot watercolor colors to clean, vibrant, high-contrast UI design palette tokens.
 */
export function snapToVibrantPalette(rawHex: string): string {
  const { r, g, b } = parseHex(rawHex);
  const { h, s, l } = rgbToHsl(r, g, b);

  // Very light / warm beige / neutral background (unconstrained cells, e.g. #dfccc4 where s ~ 0.30, l ~ 0.82)
  if (l > 0.75 && s < 0.35) {
    return '#dfccc4'; // Warm Beige / Cream (unconstrained cells)
  }

  // Vibrant chromatic hue mapping
  if (h >= 15 && h < 48) {
    return '#f97316'; // Vibrant Orange
  } else if (h >= 48 && h < 95) {
    return '#84cc16'; // Vibrant Lime / Olive
  } else if (h >= 95 && h < 155) {
    return '#10b981'; // Vibrant Emerald Green
  } else if (h >= 155 && h < 205) {
    return '#14b8a6'; // Vibrant Teal
  } else if (h >= 205 && h < 260) {
    return '#0284c7'; // Vibrant Sky Blue
  } else if (h >= 260 && h < 328) {
    return '#a855f7'; // Vibrant Purple
  } else {
    return '#ec4899'; // Vibrant Pink / Rose
  }
}

/**
 * Weighted perceptual color distance.
 */
export function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  const rMean = (c1.r + c2.r) / 2;
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(
    (2 + rMean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rMean) / 256) * db * db
  );
}

/**
 * Checks for saturated dashed border fragments between two adjacent cells.
 */
function hasDashedBorderBetween(
  c1: DetectedCellCandidate,
  c2: DetectedCellCandidate,
  image?: ImageDataLike
): boolean {
  if (!image) return false;

  const cx1 = c1.x + c1.width / 2;
  const cy1 = c1.y + c1.height / 2;
  const cx2 = c2.x + c2.width / 2;
  const cy2 = c2.y + c2.height / 2;

  const mx = Math.round((cx1 + cx2) / 2);
  const my = Math.round((cy1 + cy2) / 2);

  const data = image.data;
  const imgW = image.width;
  const imgH = image.height;

  // If horizontally adjacent, border is vertical (vary y)
  // If vertically adjacent, border is horizontal (vary x)
  const isHoriz = c1.row === c2.row;
  const span = Math.round((isHoriz ? c1.height : c1.width) * 0.22);
  const normalSearch = Math.round((isHoriz ? c1.width : c1.height) * 0.12);

  // Search perpendicular to the boundary across a range of normal offsets
  for (let norm = -normalSearch; norm <= normalSearch; norm += 4) {
    let dashPixels = 0;
    for (let d = -span; d <= span; d += 2) {
      const sx = isHoriz ? mx + norm : mx + d;
      const sy = isHoriz ? my + d : my + norm;

      if (sx >= 0 && sx < imgW && sy >= 0 && sy < imgH) {
        const idx = (sy * imgW + sx) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const maxV = Math.max(r, g, b);
        const minV = Math.min(r, g, b);
        const sat = maxV > 0 ? (maxV - minV) / maxV : 0;
        if (sat > 0.45 && maxV > 70 && maxV < 235) {
          dashPixels++;
        }
      }
    }
    if (dashPixels >= 7) {
      return true;
    }
  }

  return false;
}

/**
 * Groups connected playable cells into regions based on color similarity and boundary lines.
 */
export function detectRegions(
  playableCells: DetectedCellCandidate[],
  image?: ImageDataLike
): Region[] {
  const cellMap = new Map<string, DetectedCellCandidate>();
  for (const c of playableCells) {
    cellMap.set(c.id, c);
  }

  const visited = new Set<string>();
  const regions: Region[] = [];
  let regionCounter = 1;

  for (const cell of playableCells) {
    if (visited.has(cell.id)) continue;

    const regionCells: DetectedCellCandidate[] = [];
    const queue = [cell];
    visited.add(cell.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      regionCells.push(current);

      const neighbors = [
        `${current.row - 1},${current.col}`,
        `${current.row + 1},${current.col}`,
        `${current.row},${current.col - 1}`,
        `${current.row},${current.col + 1}`
      ];

      for (const nKey of neighbors) {
        const neighbor = cellMap.get(nKey);
        if (neighbor && !visited.has(nKey)) {
          const snap1 = snapToVibrantPalette(current.colorHex);
          const snap2 = snapToVibrantPalette(neighbor.colorHex);
          const hasBorder = hasDashedBorderBetween(current, neighbor, image);

          // Cells share region only if snapped colors match and no dashed dividing boundary
          if (snap1 === snap2 && !hasBorder) {
            visited.add(nKey);
            queue.push(neighbor);
          }
        }
      }
    }

    // Average color of the region
    let sumR = 0, sumG = 0, sumB = 0;
    for (const c of regionCells) {
      const rgb = parseHex(c.colorHex);
      sumR += rgb.r;
      sumG += rgb.g;
      sumB += rgb.b;
    }
    const avgR = Math.round(sumR / regionCells.length);
    const avgG = Math.round(sumG / regionCells.length);
    const avgB = Math.round(sumB / regionCells.length);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const rawRegionColor = `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`;
    const regionColor = snapToVibrantPalette(rawRegionColor);

    regions.push({
      id: `region_${regionCounter++}`,
      cellIds: regionCells.map((c) => c.id),
      color: regionColor,
      constraint: null // Will be assigned by badge detection
    });
  }

  return regions;
}
