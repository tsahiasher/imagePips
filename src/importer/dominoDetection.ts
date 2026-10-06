import { BoundingBox, DetectedDominoCandidate, ImageDataLike } from './types';
import { detectPipsInHalf } from './pipDetection';

export interface DominoDetectionResult {
  acceptedDominoes: DetectedDominoCandidate[];
  rejectedCandidates: DetectedDominoCandidate[];
}

/**
 * Creates a data URL thumbnail for a bounding box crop when running in browser.
 */
function createCropThumbnail(
  image: ImageDataLike,
  box: BoundingBox
): string | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = box.width;
    canvas.height = box.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const imgData = ctx.createImageData(box.width, box.height);
    const data = image.data;
    const imgW = image.width;
    const imgH = image.height;

    for (let y = 0; y < box.height; y++) {
      const srcY = box.y + y;
      if (srcY < 0 || srcY >= imgH) continue;
      for (let x = 0; x < box.width; x++) {
        const srcX = box.x + x;
        if (srcX < 0 || srcX >= imgW) continue;
        const srcIdx = (srcY * imgW + srcX) * 4;
        const dstIdx = (y * box.width + x) * 4;
        imgData.data[dstIdx] = data[srcIdx];
        imgData.data[dstIdx + 1] = data[srcIdx + 1];
        imgData.data[dstIdx + 2] = data[srcIdx + 2];
        imgData.data[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return undefined;
  }
}

/**
 * Detects unused dominoes in the tray and counts their pips geometrically.
 */
export function detectDominoesInTray(
  image: ImageDataLike,
  trayBox: BoundingBox
): DominoDetectionResult {
  const data = image.data;
  const imgW = image.width;
  const imgH = image.height;

  const subW = trayBox.width;
  const subH = trayBox.height;

  if (subW <= 20 || subH <= 20) {
    return { acceptedDominoes: [], rejectedCandidates: [] };
  }

  // Mask of non-pure-white pixels inside tray
  // Background in the tray is pure white (r, g, b > 250)
  // Domino body has borders (gray/dark) and off-white interior
  const mask = new Uint8Array(subW * subH);

  for (let dy = 0; dy < subH; dy++) {
    const y = trayBox.y + dy;
    if (y < 0 || y >= imgH) continue;
    const rowOffset = dy * subW;
    for (let dx = 0; dx < subW; dx++) {
      const x = trayBox.x + dx;
      if (x < 0 || x >= imgW) continue;
      const idx = (y * imgW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Non-white pixel
      if (r < 252 || g < 252 || b < 252) {
        mask[rowOffset + dx] = 1;
      }
    }
  }

  // Connected component labeling to find domino rectangles
  const visited = new Uint8Array(subW * subH);
  const rawBoxes: Array<{ box: BoundingBox; pixelCount: number }> = [];

  for (let dy = 0; dy < subH; dy++) {
    for (let dx = 0; dx < subW; dx++) {
      const idx = dy * subW + dx;
      if (mask[idx] === 1 && visited[idx] === 0) {
        const queue: Array<{ qx: number; qy: number }> = [{ qx: dx, qy: dy }];
        visited[idx] = 1;
        let pixelCount = 0;
        let minX = dx, maxX = dx, minY = dy, maxY = dy;

        while (queue.length > 0) {
          const { qx, qy } = queue.pop()!;
          pixelCount++;
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

        if (bw >= 30 && bh >= 20) {
          rawBoxes.push({
            box: {
              x: trayBox.x + minX,
              y: trayBox.y + minY,
              width: bw,
              height: bh
            },
            pixelCount
          });
        }
      }
    }
  }

  // Evaluate each raw candidate against domino geometry
  const acceptedDominoes: DetectedDominoCandidate[] = [];
  const rejectedCandidates: DetectedDominoCandidate[] = [];

  for (let i = 0; i < rawBoxes.length; i++) {
    const { box, pixelCount } = rawBoxes[i];
    const aspect = box.width / box.height;

    let rejectionReason: string | undefined;

    if (box.width < 90 || box.width > 320) {
      rejectionReason = `Invalid width (${box.width}px, expected 90-320px)`;
    } else if (box.height < 45 || box.height > 180) {
      rejectionReason = `Invalid height (${box.height}px, expected 45-180px)`;
    } else if (aspect < 1.3 || aspect > 2.8) {
      rejectionReason = `Invalid aspect ratio (${aspect.toFixed(2)}, expected ~2:1)`;
    } else if (pixelCount < 3000) {
      rejectionReason = `Insufficient pixel density (${pixelCount}px)`;
    }

    const halfW = Math.floor(box.width / 2);
    const halfA = detectPipsInHalf(image, box.x, box.y, box.x + halfW, box.y + box.height);
    const halfB = detectPipsInHalf(image, box.x + halfW, box.y, box.x + box.width, box.y + box.height);
    const confidence = (halfA.confidence + halfB.confidence) / 2;

    const cand: DetectedDominoCandidate = {
      id: `domino_cand_${i + 1}`,
      box,
      orientation: 'horizontal',
      halfA,
      halfB,
      confidence: rejectionReason ? 0.2 : confidence,
      cropDataUrl: createCropThumbnail(image, box),
      rejectionReason
    };

    if (rejectionReason) {
      rejectedCandidates.push(cand);
    } else {
      acceptedDominoes.push(cand);
    }
  }

  // Sort accepted dominoes: top rows first, then left to right
  acceptedDominoes.sort((a, b) => {
    const rowA = Math.floor(a.box.y / 50);
    const rowB = Math.floor(b.box.y / 50);
    if (rowA !== rowB) return rowA - rowB;
    return a.box.x - b.box.x;
  });

  // Re-id accepted dominoes in order
  acceptedDominoes.forEach((d, idx) => {
    d.id = `d_${idx + 1}`;
  });

  return { acceptedDominoes, rejectedCandidates };
}
