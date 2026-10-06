import { DetectedDominoHalfInfo, ImageDataLike } from './types';

/**
 * Detects and counts circular dark pip blobs inside a domino half.
 * Rejects borders, dividers, noise, and whitespace without requiring DOM canvas.
 */
export function detectPipsInHalf(
  image: ImageDataLike,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): DetectedDominoHalfInfo {
  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);

  if (w <= 12 || h <= 12) {
    return { value: 0, confidence: 0.5, pipCount: 0, pipBlobs: [] };
  }

  // Inset boundary to avoid outer domino border and divider line
  const insetX = Math.floor(w * 0.12);
  const insetY = Math.floor(h * 0.12);

  const subW = w - 2 * insetX;
  const subH = h - 2 * insetY;

  if (subW <= 8 || subH <= 8) {
    return { value: 0, confidence: 0.5, pipCount: 0, pipBlobs: [] };
  }

  const data = image.data;
  const imgW = image.width;
  const imgH = image.height;

  // Binary mask of dark pixels (pips)
  const mask = new Uint8Array(subW * subH);

  for (let sy = 0; sy < subH; sy++) {
    const y = y1 + insetY + sy;
    if (y < 0 || y >= imgH) continue;
    const rowOffset = sy * subW;
    for (let sx = 0; sx < subW; sx++) {
      const x = x1 + insetX + sx;
      if (x < 0 || x >= imgW) continue;
      const idx = (y * imgW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Dark pip pixels have RGB values < 110
      if (r < 110 && g < 110 && b < 110) {
        mask[rowOffset + sx] = 1;
      }
    }
  }

  // Connected components
  const visited = new Uint8Array(subW * subH);
  const blobs: Array<{ cx: number; cy: number; r: number }> = [];

  for (let sy = 0; sy < subH; sy++) {
    for (let sx = 0; sx < subW; sx++) {
      const idx = sy * subW + sx;
      if (mask[idx] === 1 && visited[idx] === 0) {
        const queue: Array<{ qx: number; qy: number }> = [{ qx: sx, qy: sy }];
        visited[idx] = 1;
        let pixelCount = 0;
        let sumX = 0;
        let sumY = 0;
        let minX = sx, maxX = sx, minY = sy, maxY = sy;

        while (queue.length > 0) {
          const { qx, qy } = queue.pop()!;
          pixelCount++;
          sumX += qx;
          sumY += qy;
          if (qx < minX) minX = qx;
          if (qx > maxX) maxX = qx;
          if (qy < minY) minY = qy;
          if (qy > maxY) maxY = qy;

          const neighbors = [
            { nx: qx + 1, ny: qy },
            { nx: qx - 1, ny: qy },
            { nx: qx, ny: qy + 1 },
            { nx: qx, ny: qy - 1 }
          ];

          for (const n of neighbors) {
            if (n.nx >= 0 && n.nx < subW && n.ny >= 0 && n.ny < subH) {
              const nIdx = n.ny * subW + n.nx;
              if (mask[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push({ qx: n.nx, qy: n.ny });
              }
            }
          }
        }

        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        const aspect = bh > 0 ? bw / bh : 0;
        const radius = (bw + bh) / 4;

        // Circular blob filtering
        if (pixelCount >= 20 && pixelCount <= 550 && aspect >= 0.45 && aspect <= 2.2) {
          blobs.push({
            cx: x1 + insetX + Math.round(sumX / pixelCount),
            cy: y1 + insetY + Math.round(sumY / pixelCount),
            r: radius
          });
        }
      }
    }
  }

  const pipCount = Math.min(6, blobs.length);
  const confidence = blobs.length <= 6 ? 0.98 : 0.7;

  return {
    value: pipCount,
    confidence,
    pipCount,
    pipBlobs: blobs
  };
}
