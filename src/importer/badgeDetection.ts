import { Region } from '../domain/puzzle';
import { GridParameters } from './gridDetection';
import { recognizeBadgeToken } from './tokenRecognition';
import { colorDistance, snapToVibrantPalette } from './regionDetection';
import { BoundingBox, DetectedBadgeCandidate, ImageDataLike } from './types';

export interface BadgeDetectionResult {
  acceptedBadges: DetectedBadgeCandidate[];
  rejectedBadges: DetectedBadgeCandidate[];
  updatedRegions: Region[];
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const num = parseInt(hex.replace('#', ''), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Creates a data URL thumbnail for a badge crop when running in browser.
 */
function createBadgeCropDataUrl(
  image: ImageDataLike,
  cropBox: BoundingBox
): string | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = cropBox.width;
    canvas.height = cropBox.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const imgData = ctx.createImageData(cropBox.width, cropBox.height);
    const data = image.data;
    const imgW = image.width;
    const imgH = image.height;

    for (let y = 0; y < cropBox.height; y++) {
      const srcY = cropBox.y + y;
      if (srcY < 0 || srcY >= imgH) continue;
      for (let x = 0; x < cropBox.width; x++) {
        const srcX = cropBox.x + x;
        if (srcX < 0 || srcX >= imgW) continue;
        const srcIdx = (srcY * imgW + srcX) * 4;
        const dstIdx = (y * cropBox.width + x) * 4;
        imgData.data[dstIdx] = data[srcIdx];
        imgData.data[dstIdx + 1] = data[srcIdx + 1];
        imgData.data[dstIdx + 2] = data[srcIdx + 2];
        imgData.data[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return undefined;
  }
}

/**
 * Explicit detector for condition diamond badges.
 * Distinguishes badges from dashed borders, dominoes, and cells using saturation and geometry.
 */
export function detectConditionBadges(
  image: ImageDataLike,
  boardBox: BoundingBox,
  grid: GridParameters,
  regions: Region[]
): BadgeDetectionResult {
  const data = image.data;
  const imgW = image.width;
  const imgH = image.height;

  // Margin around boardBox where badges may project outwards
  const padX = Math.round(grid.cellSize * 0.4);
  const padY = Math.round(grid.cellSize * 0.4);

  const startX = Math.max(0, boardBox.x - padX);
  const endX = Math.min(imgW, boardBox.x + boardBox.width + padX);
  const startY = Math.max(0, boardBox.y - padY);
  const endY = Math.min(imgH, boardBox.y + boardBox.height + padY);

  const scanW = endX - startX;
  const scanH = endY - startY;

  // Mask of saturated badge pixels (sat > 0.50, max > 80, not pure white)
  const mask = new Uint8Array(scanW * scanH);

  for (let dy = 0; dy < scanH; dy++) {
    const y = startY + dy;
    const rowOffset = dy * scanW;
    for (let dx = 0; dx < scanW; dx++) {
      const x = startX + dx;
      const idx = (y * imgW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const maxV = Math.max(r, g, b);
      const minV = Math.min(r, g, b);
      const sat = maxV > 0 ? (maxV - minV) / maxV : 0;

      if (sat > 0.50 && maxV > 80 && maxV < 240) {
        mask[rowOffset + dx] = 1;
      }
    }
  }

  // Connected components to find badge bodies
  const visited = new Uint8Array(scanW * scanH);
  const rawComponents: Array<{
    cx: number;
    cy: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    pixelCount: number;
    avgR: number;
    avgG: number;
    avgB: number;
  }> = [];

  for (let dy = 0; dy < scanH; dy++) {
    for (let dx = 0; dx < scanW; dx++) {
      const idx = dy * scanW + dx;
      if (mask[idx] === 1 && visited[idx] === 0) {
        const queue: Array<{ qx: number; qy: number }> = [{ qx: dx, qy: dy }];
        visited[idx] = 1;
        let pixelCount = 0;
        let sumX = 0;
        let sumY = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let minX = dx, maxX = dx, minY = dy, maxY = dy;

        while (queue.length > 0) {
          const { qx, qy } = queue.pop()!;
          pixelCount++;
          sumX += qx;
          sumY += qy;

          const origIdx = ((startY + qy) * imgW + (startX + qx)) * 4;
          sumR += data[origIdx];
          sumG += data[origIdx + 1];
          sumB += data[origIdx + 2];

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
            if (n.nx >= 0 && n.nx < scanW && n.ny >= 0 && n.ny < scanH) {
              const nIdx = n.ny * scanW + n.nx;
              if (mask[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push({ qx: n.nx, qy: n.ny });
              }
            }
          }
        }

        if (pixelCount >= 30) {
          rawComponents.push({
            cx: startX + Math.round(sumX / pixelCount),
            cy: startY + Math.round(sumY / pixelCount),
            minX: startX + minX,
            maxX: startX + maxX,
            minY: startY + minY,
            maxY: startY + maxY,
            pixelCount,
            avgR: Math.round(sumR / pixelCount),
            avgG: Math.round(sumG / pixelCount),
            avgB: Math.round(sumB / pixelCount)
          });
        }
      }
    }
  }

  const acceptedBadges: DetectedBadgeCandidate[] = [];
  const rejectedBadges: DetectedBadgeCandidate[] = [];

  for (let i = 0; i < rawComponents.length; i++) {
    const comp = rawComponents[i];
    const bw = comp.maxX - comp.minX + 1;
    const bh = comp.maxY - comp.minY + 1;
    const aspect = bw / bh;

    let rejectionReason: string | undefined;

    // Reject small dashed border fragments (typically < 300 pixels)
    if (comp.pixelCount < 1800) {
      rejectionReason = `Border fragment / noise (only ${comp.pixelCount}px, expected >1800px)`;
    } else if (comp.pixelCount > 9000) {
      rejectionReason = `Too large for badge (${comp.pixelCount}px)`;
    } else if (bw < 50 || bh < 50) {
      rejectionReason = `Too small dimensions (${bw}x${bh}px)`;
    } else if (aspect < 0.65 || aspect > 1.55) {
      rejectionReason = `Non-square aspect ratio (${aspect.toFixed(2)})`;
    }

    // Determine badge body color using average RGB of badge diamond pixels (avoids center white glyph)
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const rawColorHex = `#${toHex(comp.avgR)}${toHex(comp.avgG)}${toHex(comp.avgB)}`;
    const colorHex = snapToVibrantPalette(rawColorHex);

    const cropBox: BoundingBox = {
      x: comp.cx - 28,
      y: comp.cy - 28,
      width: 56,
      height: 56
    };

    const tokenResult = recognizeBadgeToken(image, cropBox, bw, bh);

    const cand: DetectedBadgeCandidate = {
      id: `badge_cand_${i + 1}`,
      x: comp.cx,
      y: comp.cy,
      width: bw,
      height: bh,
      colorHex,
      recognizedToken: tokenResult.token,
      parsedConstraint: tokenResult.constraint,
      confidence: rejectionReason ? 0.1 : tokenResult.confidence,
      cropDataUrl: createBadgeCropDataUrl(image, cropBox),
      rejectionReason
    };

    if (rejectionReason) {
      rejectedBadges.push(cand);
    } else {
      acceptedBadges.push(cand);
    }
  }

  // Sort accepted badges by Y, then X
  acceptedBadges.sort((a, b) => {
    const rowA = Math.floor(a.y / 60);
    const rowB = Math.floor(b.y / 60);
    if (rowA !== rowB) return rowA - rowB;
    return a.x - b.x;
  });

  acceptedBadges.forEach((b, idx) => {
    b.id = `badge_${idx + 1}`;
  });

  // Associate each accepted badge with the best matching region
  const updatedRegions: Region[] = regions.map((r) => ({ ...r }));
  const assignedBadgeIds = new Set<string>();

  for (const reg of updatedRegions) {
    // Unconstrained beige cells never have condition badges
    if (reg.color === '#dfccc4' || reg.color === '#e2e8f0') continue;

    let bestBadge: DetectedBadgeCandidate | null = null;
    let bestDist = Infinity;

    const regRgb = parseHex(reg.color);

    for (const badge of acceptedBadges) {
      if (assignedBadgeIds.has(badge.id)) continue;

      const badgeRgb = parseHex(badge.colorHex);
      const cDist = colorDistance(regRgb, badgeRgb);

      // Badge must match the region color
      if (cDist > 65) continue;

      // Find minimum distance from badge to any cell in the region
      let minDistToRegion = Infinity;
      for (const cellId of reg.cellIds) {
        const [cR, cC] = cellId.split(',').map(Number);
        const cellCenterX = grid.originX + (cC + 0.5) * grid.cellWidth;
        const cellCenterY = grid.originY + (cR + 0.5) * grid.cellHeight;
        const d = Math.hypot(cellCenterX - badge.x, cellCenterY - badge.y);
        if (d < minDistToRegion) {
          minDistToRegion = d;
        }
      }

      // Proximity penalty + color similarity check
      const totalCost = minDistToRegion + cDist * 2.0;

      if (totalCost < bestDist && minDistToRegion < grid.cellSize * 1.6) {
        bestDist = totalCost;
        bestBadge = badge;
      }
    }

    if (bestBadge) {
      assignedBadgeIds.add(bestBadge.id);
      reg.constraint = bestBadge.parsedConstraint;
      bestBadge.associatedRegionId = reg.id;
      reg.labelAnchor = {
        x: (bestBadge.x - grid.originX) / grid.cellWidth,
        y: (bestBadge.y - grid.originY) / grid.cellHeight
      };
    }
  }

  return { acceptedBadges, rejectedBadges, updatedRegions };
}
