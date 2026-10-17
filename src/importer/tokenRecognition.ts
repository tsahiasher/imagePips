import { Constraint } from '../domain/constraints';
import { ImageDataLike } from './types';

export interface TokenRecognitionResult {
  token: string;
  constraint: Constraint | null;
  confidence: number;
}

/**
 * Parses domain constraint from recognized token string.
 */
export function parseConstraintFromToken(token: string): Constraint | null {
  if (token === '=') return { type: 'equal' };
  if (token.startsWith('<')) {
    const val = parseInt(token.slice(1), 10);
    return isNaN(val) ? null : { type: 'lessThan', value: val };
  }
  if (token.startsWith('>')) {
    const val = parseInt(token.slice(1), 10);
    return isNaN(val) ? null : { type: 'greaterThan', value: val };
  }
  if (token !== '?') {
    const val = parseInt(token, 10);
    return isNaN(val) ? null : { type: 'sum', value: val };
  }
  return null;
}

/**
 * Recognizes condition badge tokens with topological and geometric analysis.
 * Uses a diamond interior mask to eliminate background canvas noise.
 */
export function recognizeBadgeToken(
  imageOrCanvas: ImageDataLike | HTMLCanvasElement,
  cropBox?: { x: number; y: number; width: number; height: number },
  badgeWidth?: number,
  badgeHeight?: number,
  badgeColorHex?: string
): TokenRecognitionResult {
  let width: number;
  let height: number;
  let data: Uint8ClampedArray | Uint8Array;
  let startX = 0;
  let startY = 0;

  if ('getContext' in imageOrCanvas && typeof imageOrCanvas.getContext === 'function') {
    const ctx = (imageOrCanvas as HTMLCanvasElement).getContext('2d');
    if (!ctx) {
      return { token: '?', constraint: null, confidence: 0 };
    }
    width = imageOrCanvas.width;
    height = imageOrCanvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    data = imgData.data;
  } else {
    const imgLike = imageOrCanvas as ImageDataLike;
    if (cropBox) {
      startX = cropBox.x;
      startY = cropBox.y;
      width = cropBox.width;
      height = cropBox.height;
    } else {
      width = imgLike.width;
      height = imgLike.height;
    }
    data = imgLike.data;
  }

  const stride = 'getContext' in imageOrCanvas ? width : (imageOrCanvas as ImageDataLike).width;

  // Extract white text pixels strictly within diamond badge interior
  const pts: Array<{ x: number; y: number }> = [];
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  const rawW = badgeWidth ?? 80;
  const rawH = badgeHeight ?? 80;
  const effW = Math.min(rawW, rawH * 1.15);
  const effH = Math.min(rawH, rawW * 1.15);
  const isSmallBadge = effW <= 45 || effH <= 45;
  const isOrangeBadge = badgeColorHex === '#f97316' || badgeColorHex === '#ea580c';
  const scale = isOrangeBadge && !isSmallBadge ? 0.94 : 0.82;
  const rx = (effW / 2) * scale;
  const ry = (effH / 2) * scale;
  const cropRadius = Math.round(Math.max(rx, ry) * 1.05);

  for (let dy = -cropRadius; dy <= cropRadius; dy++) {
    const sy = startY + cy + dy;
    if (sy < 0) continue;
    for (let dx = -cropRadius; dx <= cropRadius; dx++) {
      // Diamond equation: (|dx| / rx + |dy| / ry) <= 0.95
      if (Math.abs(dx) / rx + Math.abs(dy) / ry > 0.95) continue;

      const sx = startX + cx + dx;
      if (sx < 0) continue;

      const idx = (sy * stride + sx) * 4;
      if (idx + 2 >= data.length) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      const diff = maxVal - minVal;

      const isText =
        (r > 200 && g > 200 && b > 200 && diff < 35) ||
        (isOrangeBadge && r > 200 && g > 200 && b > 175 && diff < 55) ||
        (isSmallBadge && minVal >= 135 && diff < 65);

      if (isText) {
        pts.push({ x: dx, y: dy });
      }
    }
  }

  // Not enough evidence of a text glyph
  if (pts.length < 15) {
    return { token: '?', constraint: null, confidence: 0 };
  }

  // Noise filtering for small badges: remove isolated 1-2 pixel border noise
  let filteredPts = pts;
  if (isSmallBadge && pts.length >= 25) {
    const tempSet = new Set(pts.map((p) => `${p.x},${p.y}`));
    const cleaned = pts.filter((p) => {
      let neighbors = 0;
      for (let ody = -1; ody <= 1; ody++) {
        for (let odx = -1; odx <= 1; odx++) {
          if (odx === 0 && ody === 0) continue;
          if (tempSet.has(`${p.x + odx},${p.y + ody}`)) neighbors++;
        }
      }
      return neighbors >= 2;
    });
    if (cleaned.length >= 15) {
      filteredPts = cleaned;
    }
  }

  // Remove small disconnected dust islands (< 5 pixels)
  if (filteredPts.length >= 20) {
    const visitedSet = new Set<string>();
    const components: Array<Array<{ x: number; y: number }>> = [];
    const pMap = new Map<string, { x: number; y: number }>();
    for (const p of filteredPts) pMap.set(`${p.x},${p.y}`, p);

    for (const p of filteredPts) {
      const key = `${p.x},${p.y}`;
      if (visitedSet.has(key)) continue;
      const comp: Array<{ x: number; y: number }> = [];
      const queue = [p];
      visitedSet.add(key);

      while (queue.length > 0) {
        const curr = queue.pop()!;
        comp.push(curr);
        for (let ody = -1; ody <= 1; ody++) {
          for (let odx = -1; odx <= 1; odx++) {
            if (odx === 0 && ody === 0) continue;
            const nKey = `${curr.x + odx},${curr.y + ody}`;
            if (pMap.has(nKey) && !visitedSet.has(nKey)) {
              visitedSet.add(nKey);
              queue.push(pMap.get(nKey)!);
            }
          }
        }
      }
      components.push(comp);
    }

    const maxCompSize = Math.max(...components.map((c) => c.length));
    if (maxCompSize >= 15) {
      // Discard small noise specks that have fewer than 5 pixels
      filteredPts = components.filter((c) => c.length >= 5).flatMap((c) => c);
    }
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const ptsSet = new Set<string>();

  for (const p of filteredPts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    ptsSet.add(`${p.x},${p.y}`);
  }

  const glyphW = maxX - minX + 1;
  const glyphH = maxY - minY + 1;



  // 1. Equal sign '=' and Unequal sign '≠'
  const midY = Math.floor((minY + maxY) / 2);
  let gapRowPixels = 0;
  for (let x = minX; x <= maxX; x++) {
    if (ptsSet.has(`${x},${midY}`)) gapRowPixels++;
  }

  const yTopBar = minY + Math.max(1, Math.floor(glyphH * 0.30));
  const yBotBar = maxY - Math.max(1, Math.floor(glyphH * 0.30));
  let topBarSpan = 0, botBarSpan = 0;
  for (let y = yTopBar - 1; y <= yTopBar + 1; y++) {
    let s = 0;
    for (let x = minX; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) s++;
    }
    if (s > topBarSpan) topBarSpan = s;
  }
  for (let y = yBotBar - 1; y <= yBotBar + 1; y++) {
    let s = 0;
    for (let x = minX; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) s++;
    }
    if (s > botBarSpan) botBarSpan = s;
  }

  let maxTopHalfSpan = 0, maxBotHalfSpan = 0;
  for (let y = minY; y < midY; y++) {
    let s = 0;
    for (let x = minX; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) s++;
    }
    if (s > maxTopHalfSpan) maxTopHalfSpan = s;
  }
  for (let y = midY + 1; y <= maxY; y++) {
    let s = 0;
    for (let x = minX; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) s++;
    }
    if (s > maxBotHalfSpan) maxBotHalfSpan = s;
  }

  const yGap1 = minY + Math.floor(glyphH * 0.35);
  const yGap2 = minY + Math.floor(glyphH * 0.65);
  let minGapRowPixels = Infinity;
  for (let y = yGap1; y <= yGap2; y++) {
    let s = 0;
    for (let x = minX; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) s++;
    }
    if (s < minGapRowPixels) minGapRowPixels = s;
  }

  // 1.1. Equal sign '=': two horizontal bars, empty gap row, no diagonal slash
  if (minGapRowPixels <= 1 && maxTopHalfSpan >= glyphW * 0.45 && maxBotHalfSpan >= glyphW * 0.45 && glyphW / glyphH >= 0.85) {
    return { token: '=', constraint: { type: 'equal' }, confidence: 0.99 };
  }

  // 1.2. Unequal sign '≠': two horizontal bars with diagonal slash extending above and below
  // Must be reasonably wide and not a thin vertical digit like '1'
  if (glyphW >= 7 && glyphW / glyphH >= 0.60 && glyphW / glyphH <= 1.40) {
    const cX = Math.floor((minX + maxX) / 2);
    let slashTopExtends = false;
    let slashBotExtends = false;
    for (let x = cX; x <= maxX; x++) {
      if (ptsSet.has(`${x},${minY}`) || ptsSet.has(`${x},${minY + 1}`)) slashTopExtends = true;
    }
    for (let x = minX; x <= cX; x++) {
      if (ptsSet.has(`${x},${maxY}`) || ptsSet.has(`${x},${maxY - 1}`)) slashBotExtends = true;
    }

    let hasBotLeft = false;
    for (let y = yBotBar - 1; y <= yBotBar + 1; y++) {
      for (let x = minX; x <= minX + Math.max(1, Math.floor(glyphW * 0.20)); x++) {
        if (ptsSet.has(`${x},${y}`)) hasBotLeft = true;
      }
    }
    let hasTopLeft = false;
    for (let y = yTopBar - 1; y <= yTopBar + 1; y++) {
      for (let x = minX; x <= minX + Math.max(1, Math.floor(glyphW * 0.20)); x++) {
        if (ptsSet.has(`${x},${y}`)) hasTopLeft = true;
      }
    }

    const slashAtMid = ptsSet.has(`${cX},${midY}`) || ptsSet.has(`${cX - 1},${midY}`) || ptsSet.has(`${cX + 1},${midY}`);
    const rightEmptyAtMid = !ptsSet.has(`${maxX},${midY}`) && !ptsSet.has(`${maxX - 1},${midY}`);

    let rightEdgeGapPixels = 0;
    for (let y = yTopBar + 2; y <= yBotBar - 2; y++) {
      if (ptsSet.has(`${maxX},${y}`) || ptsSet.has(`${maxX - 1},${y}`)) rightEdgeGapPixels++;
    }

    if (
      topBarSpan >= glyphW * 0.58 &&
      botBarSpan >= glyphW * 0.58 &&
      gapRowPixels >= 1 &&
      gapRowPixels <= Math.max(5, Math.round(glyphW * 0.38)) &&
      slashTopExtends &&
      slashBotExtends &&
      hasBotLeft &&
      hasTopLeft &&
      slashAtMid &&
      rightEmptyAtMid &&
      rightEdgeGapPixels <= Math.max(2, Math.round(glyphH * 0.15))
    ) {
      return { token: '≠', constraint: { type: 'different' }, confidence: 0.99 };
    }
  }

  // 2. Single digit (aspect ratio w / h < 1.05)
  if (glyphW / glyphH < 1.05) {
    const digit = classifySingleDigit(ptsSet, minX, maxX, minY, maxY);
    return { token: digit, constraint: { type: 'sum', value: parseInt(digit, 10) }, confidence: 0.98 };
  }

  // 3. Multi-character token (operator + digit OR two-digit number 10–24)
  const searchStart = minX + Math.floor(glyphW * 0.28);
  const searchEnd = minX + Math.floor(glyphW * 0.68);
  let minColCount = Infinity;
  let splitX = Math.floor((minX + maxX) / 2);

  for (let x = searchStart; x <= searchEnd; x++) {
    let count = 0;
    for (let y = minY; y <= maxY; y++) {
      if (ptsSet.has(`${x},${y}`)) count++;
    }
    if (count < minColCount) {
      minColCount = count;
      splitX = x;
    }
  }

  // Left char bounding box
  let leftMinX = Infinity, leftMaxX = -Infinity, leftMinY = Infinity, leftMaxY = -Infinity;
  for (let x = minX; x <= splitX; x++) {
    for (let y = minY; y <= maxY; y++) {
      if (ptsSet.has(`${x},${y}`)) {
        if (x < leftMinX) leftMinX = x;
        if (x > leftMaxX) leftMaxX = x;
        if (y < leftMinY) leftMinY = y;
        if (y > leftMaxY) leftMaxY = y;
      }
    }
  }
  const leftW = leftMaxX - leftMinX + 1;
  const leftH = leftMaxY - leftMinY + 1;

  // Right char bounding box
  let rightMinX = Infinity, rightMaxX = -Infinity, rightMinY = Infinity, rightMaxY = -Infinity;
  for (let x = splitX + 1; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      if (ptsSet.has(`${x},${y}`)) {
        if (x < rightMinX) rightMinX = x;
        if (x > rightMaxX) rightMaxX = x;
        if (y < rightMinY) rightMinY = y;
        if (y > rightMaxY) rightMaxY = y;
      }
    }
  }
  const rightW = rightMaxX - rightMinX + 1;
  const rightH = rightMaxY - rightMinY + 1;

  // Left char classification:
  let leftMaxCol = 0;
  for (let x = leftMinX; x <= leftMaxX; x++) {
    let count = 0;
    for (let y = leftMinY; y <= leftMaxY; y++) {
      if (ptsSet.has(`${x},${y}`)) count++;
    }
    if (count > leftMaxCol) leftMaxCol = count;
  }

  // Left char horizontal top and bottom spans
  let leftTopP = 0, leftBotP = 0;
  for (let x = leftMinX; x <= leftMaxX; x++) {
    if (ptsSet.has(`${x},${leftMinY}`) || ptsSet.has(`${x},${leftMinY + 1}`)) leftTopP++;
    if (ptsSet.has(`${x},${leftMaxY}`) || ptsSet.has(`${x},${leftMaxY - 1}`)) leftBotP++;
  }

  const x25 = leftMinX + Math.floor(leftW * 0.25);
  const x75 = leftMinX + Math.floor(leftW * 0.75);

  let top25 = Infinity, bot25 = -Infinity;
  for (let y = leftMinY; y <= leftMaxY; y++) {
    if (ptsSet.has(`${x25},${y}`)) {
      if (y < top25) top25 = y;
      if (y > bot25) bot25 = y;
    }
  }
  const span25 = bot25 >= top25 ? bot25 - top25 + 1 : 0;

  let top75 = Infinity, bot75 = -Infinity;
  for (let y = leftMinY; y <= leftMaxY; y++) {
    if (ptsSet.has(`${x75},${y}`)) {
      if (y < top75) top75 = y;
      if (y > bot75) bot75 = y;
    }
  }
  const span75 = bot75 >= top75 ? bot75 - top75 + 1 : 0;

  // Check chevron apex and open mouth around leftMidY
  const leftMidY = Math.floor((leftMinY + leftMaxY) / 2);
  let midLeftPixels = 0;
  let midRightPixels = 0;
  for (let y = leftMidY - 1; y <= leftMidY + 1; y++) {
    for (let x = leftMinX; x <= leftMinX + 1; x++) {
      if (ptsSet.has(`${x},${y}`)) midLeftPixels++;
    }
    for (let x = leftMaxX - 1; x <= leftMaxX; x++) {
      if (ptsSet.has(`${x},${y}`)) midRightPixels++;
    }
  }

  let botRightPixels = 0;
  let botRightOuterPixels = 0;
  for (let y = leftMaxY - 1; y <= leftMaxY; y++) {
    for (let x = leftMinX + Math.floor(leftW * 0.5); x <= leftMaxX; x++) {
      if (ptsSet.has(`${x},${y}`)) botRightPixels++;
    }
    for (let x = leftMinX + Math.floor(leftW * 0.68); x <= leftMaxX; x++) {
      if (ptsSet.has(`${x},${y}`)) botRightOuterPixels++;
    }
  }

  const isChevronLeft = midLeftPixels >= 1 && midLeftPixels > midRightPixels && midRightPixels <= 2 && span75 >= span25;
  const isChevronRight =
    midRightPixels >= 1 &&
    midRightPixels > midLeftPixels &&
    midLeftPixels <= 2 &&
    span25 >= span75 &&
    (botRightPixels <= 1 || (botRightOuterPixels === 0 && span25 > span75));

  let leftChar = '';
  // 1. Chevron '<'
  if (isChevronLeft) {
    leftChar = '<';
  }
  // 2. Chevron '>'
  else if (isChevronRight) {
    leftChar = '>';
  }
  // 3. Digit '2' (in '20'..'24'): wide digit with flat horizontal bottom baseline and top-right arch (span75 >= 0.70*H)
  else if (
    botRightPixels >= 2 &&
    leftW / leftH >= 0.52 &&
    (leftMaxCol / leftH <= 0.86 || (span75 >= leftH * 0.70 && leftMaxCol / leftH <= 0.96))
  ) {
    leftChar = '2';
  }
  // 4. Digit '1' (in '10'..'19'): narrow vertical stroke or solid vertical column (leftMaxCol / leftH > 0.82, span75 <= 0.35*H)
  else {
    leftChar = '1';
  }

  // 3.1. 3-character token: split occurred between operator and two digits (e.g. '>14', '<10', '>24')
  if ((leftChar === '<' || leftChar === '>') && rightW / rightH >= 0.85) {
    const s2Start = rightMinX + Math.floor(rightW * 0.20);
    const s2End = rightMinX + Math.floor(rightW * 0.60);
    let minC2 = Infinity;
    let split2X = Math.floor((rightMinX + rightMaxX) / 2);
    for (let x = s2Start; x <= s2End; x++) {
      let count = 0;
      for (let y = rightMinY; y <= rightMaxY; y++) {
        if (ptsSet.has(`${x},${y}`)) count++;
      }
      if (count < minC2) {
        minC2 = count;
        split2X = x;
      }
    }
    let r1MinX = Infinity, r1MaxX = -Infinity, r1MinY = Infinity, r1MaxY = -Infinity;
    for (let x = rightMinX; x <= split2X; x++) {
      for (let y = rightMinY; y <= rightMaxY; y++) {
        if (ptsSet.has(`${x},${y}`)) {
          if (x < r1MinX) r1MinX = x;
          if (x > r1MaxX) r1MaxX = x;
          if (y < r1MinY) r1MinY = y;
          if (y > r1MaxY) r1MaxY = y;
        }
      }
    }
    let r2MinX = Infinity, r2MaxX = -Infinity, r2MinY = Infinity, r2MaxY = -Infinity;
    for (let x = split2X + 1; x <= rightMaxX; x++) {
      for (let y = rightMinY; y <= rightMaxY; y++) {
        if (ptsSet.has(`${x},${y}`)) {
          if (x < r2MinX) r2MinX = x;
          if (x > r2MaxX) r2MaxX = x;
          if (y < r2MinY) r2MinY = y;
          if (y > r2MaxY) r2MaxY = y;
        }
      }
    }
    const tens = classifySingleDigit(ptsSet, r1MinX, r1MaxX, r1MinY, r1MaxY);
    const ones = classifySingleDigit(ptsSet, r2MinX, r2MaxX, r2MinY, r2MaxY);
    const token = `${leftChar}${tens}${ones}`;
    const constraint = parseConstraintFromToken(token);
    return { token, constraint, confidence: 0.98 };
  }

  // Right char classification:
  let rightTopP = 0, rightBotP = 0, botRowPixels = 0;
  for (let x = rightMinX; x <= rightMaxX; x++) {
    if (ptsSet.has(`${x},${rightMinY}`) || ptsSet.has(`${x},${rightMinY + 1}`)) rightTopP++;
    if (ptsSet.has(`${x},${rightMaxY}`) || ptsSet.has(`${x},${rightMaxY - 1}`)) rightBotP++;
    if (ptsSet.has(`${x},${rightMaxY}`)) botRowPixels++;
  }

  let rightMaxCol = 0;
  for (let x = rightMinX; x <= rightMaxX; x++) {
    let count = 0;
    for (let y = rightMinY; y <= rightMaxY; y++) {
      if (ptsSet.has(`${x},${y}`)) count++;
    }
    if (count > rightMaxCol) rightMaxCol = count;
  }

  const rcX = Math.floor((rightMinX + rightMaxX) / 2);
  const rcY = Math.floor((rightMinY + rightMaxY) / 2);

  const yCrossStart = rightMinY + Math.floor(rightH * 0.50);
  const yCrossEnd = rightMinY + Math.floor(rightH * 0.78);
  let maxCrossSpan = 0;
  let crossY = yCrossStart;
  for (let y = yCrossStart; y <= yCrossEnd; y++) {
    let span = 0;
    for (let x = rightMinX; x <= rightMaxX; x++) {
      if (ptsSet.has(`${x},${y}`)) span++;
    }
    if (span > maxCrossSpan) {
      maxCrossSpan = span;
      crossY = y;
    }
  }

  const maxCrossThickness = Math.max(2, Math.floor(rightH * 0.18));
  let crossYEnd = crossY;
  while (
    crossYEnd < rightMaxY - 2 &&
    crossYEnd - crossY < maxCrossThickness &&
    crossYEnd + 1 <= rightMinY + Math.floor(rightH * 0.80)
  ) {
    let span = 0;
    for (let x = rightMinX; x <= rightMaxX; x++) {
      if (ptsSet.has(`${x},${crossYEnd + 1}`)) span++;
    }
    const centerFilled =
      ptsSet.has(`${rcX},${crossYEnd + 1}`) ||
      (ptsSet.has(`${rcX - 1},${crossYEnd + 1}`) && ptsSet.has(`${rcX + 1},${crossYEnd + 1}`));
    if (span >= rightW * 0.60 && centerFilled) crossYEnd++;
    else break;
  }

  let rLowerLeft = 0;
  for (let y = crossYEnd + 1; y <= rightMaxY; y++) {
    for (let x = rightMinX; x <= rightMinX + Math.floor(rightW * 0.35); x++) {
      if (ptsSet.has(`${x},${y}`)) rLowerLeft++;
    }
  }

  const yUR1 = rightMinY + Math.floor(rightH * 0.22);
  const yUR2 = rightMinY + Math.floor(rightH * 0.42);
  const xLeftLimit = rightMinX + Math.max(1, Math.round(rightW * 0.28));
  const xRightLimit = rightMaxX - Math.max(1, Math.round(rightW * 0.28));
  let hasUpperRight = false;
  let upLeft = 0;
  let upRight = 0;
  let emptyUpperRightRows = 0;
  for (let y = yUR1; y <= yUR2; y++) {
    let rowUR = 0;
    for (let x = xRightLimit; x <= rightMaxX; x++) {
      if (ptsSet.has(`${x},${y}`)) {
        hasUpperRight = true;
        upRight++;
        rowUR++;
      }
    }
    if (rowUR === 0) emptyUpperRightRows++;
    for (let x = rightMinX; x <= xLeftLimit; x++) {
      if (ptsSet.has(`${x},${y}`)) {
        upLeft++;
      }
    }
  }

  let rCenterHole = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (ptsSet.has(`${rcX + dx},${rcY + dy}`)) rCenterHole++;
    }
  }

  const yLM1 = rightMinY + Math.floor(rightH * 0.55);
  const yLM2 = rightMinY + Math.floor(rightH * 0.80);
  let leftMid = 0;
  let rightMid = 0;
  for (let y = yLM1; y <= yLM2; y++) {
    for (let x = rightMinX; x < rcX; x++) {
      if (ptsSet.has(`${x},${y}`)) leftMid++;
    }
    for (let x = rcX; x <= rightMaxX; x++) {
      if (ptsSet.has(`${x},${y}`)) rightMid++;
    }
  }

  const yLLW1 = rightMinY + Math.floor(rightH * 0.58);
  const yLLW2 = rightMinY + Math.floor(rightH * 0.75);
  const xLeftThird = rightMinX + Math.max(1, Math.floor(rightW * 0.32));
  let hasEmptyLowerLeftRow = false;
  for (let y = yLLW1; y <= yLLW2; y++) {
    let count = 0;
    for (let x = rightMinX; x <= xLeftThird; x++) {
      if (ptsSet.has(`${x},${y}`)) count++;
    }
    if (count === 0) {
      hasEmptyLowerLeftRow = true;
      break;
    }
  }

  let lowerRightStem = 0;
  for (let y = yLLW1; y <= yLLW2; y++) {
    for (let x = xRightLimit; x <= rightMaxX; x++) {
      if (ptsSet.has(`${x},${y}`)) lowerRightStem++;
    }
  }

  let rightChar = '';
  // 1. '7' (in '<7', '>7'): solid top bar, narrow bottom point
  if (rightTopP >= rightW * 0.65 && rightBotP <= rightW * 0.50) {
    rightChar = '7';
  }
  // 2. '1' (in '11', '<1', '>1'): narrow width, solid column
  else if (rightW / rightH < 0.60 && rightMaxCol >= rightH * 0.65) {
    rightChar = '1';
  }
  // 3. '4' (in '<4', '>4', '24', '14'): horizontal crossbar, empty lower-left below crossbar
  else if (
    maxCrossSpan >= rightW * 0.65 &&
    rightMaxY - crossYEnd >= Math.max(2, Math.floor(rightH * 0.14)) &&
    rLowerLeft <= Math.max(2, Math.floor(rightW * 0.15)) &&
    rightBotP <= Math.max(4, Math.floor(rightW * 0.62)) &&
    rightTopP < rightW * 0.55
  ) {
    rightChar = '4';
  }
  // 4. '0' (in '10', '20', '>0'): center hole
  else if (rCenterHole === 0) {
    rightChar = '0';
  }
  // 5. '8' vs '9' (in '>8', '<8', '18', '>9', '<9', '19'):
  // enclosed upper loop (both upLeft AND upRight well-developed, no cavity), solid waist, solid lower-right stem
  else if (
    upLeft >= 8 &&
    upLeft >= upRight * 0.65 &&
    hasUpperRight &&
    emptyUpperRightRows === 0 &&
    maxCrossSpan >= rightW * 0.55 &&
    lowerRightStem >= 6
  ) {
    rightChar = hasEmptyLowerLeftRow ? '9' : '8';
  }
  // 6. '5' vs '6' (in '<5', '>5', '15', '<6', '>6', '16'):
  // empty upper-right cavity below top bar, or vertical stem on upper-left
  else if (upLeft > upRight || !hasUpperRight) {
    if (
      !hasEmptyLowerLeftRow &&
      maxCrossSpan >= rightW * 0.55 &&
      lowerRightStem >= 6
    ) {
      rightChar = '6';
    } else {
      rightChar = '5';
    }
  }
  // 7. '2' vs '3':
  // In '2', descending diagonal has midRatio <= 1.85, OR flat baseline with botRow >= 0.55*W and midRatio <= 3.00
  // In '3', lower loop bulges heavily to the right so rightMid > leftMid * 1.85 and botRow <= 0.50*W
  else if (rightMid <= leftMid * 1.85 || (botRowPixels >= rightW * 0.55 && rightMid <= leftMid * 3.00)) {
    rightChar = '2';
  } else {
    rightChar = '3';
  }

  const token = `${leftChar}${rightChar}`;
  const constraint = parseConstraintFromToken(token);
  return { token, constraint, confidence: 0.98 };
}

/**
 * Classifies a single digit (0–9) using scale-invariant topological and geometric analysis.
 */
function classifySingleDigit(
  ptsSet: Set<string>,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): string {
  const glyphW = maxX - minX + 1;
  const glyphH = maxY - minY + 1;

  // 1. Digit '1': narrow aspect ratio OR central vertical stem with wide bottom serif base
  if (glyphW / glyphH < 0.58) {
    return '1';
  }

  let topP = 0, botP = 0;
  for (let x = minX; x <= maxX; x++) {
    if (ptsSet.has(`${x},${minY}`) || ptsSet.has(`${x},${minY + 1}`)) topP++;
    if (ptsSet.has(`${x},${maxY}`) || ptsSet.has(`${x},${maxY - 1}`)) botP++;
  }

  if (glyphW / glyphH < 0.64 && botP >= glyphW * 0.75) {
    const cX = Math.floor((minX + maxX) / 2);
    let stemBrokenRows = 0;
    for (let y = minY + Math.floor(glyphH * 0.15); y <= maxY - 2; y++) {
      if (!ptsSet.has(`${cX},${y}`) || !ptsSet.has(`${cX - 1},${y}`)) {
        stemBrokenRows++;
      }
    }
    const yBeak1 = minY + Math.floor(glyphH * 0.15);
    const yBeak2 = minY + Math.floor(glyphH * 0.38);
    let beakLeft = 0;
    let beakRight = 0;
    for (let y = yBeak1; y <= yBeak2; y++) {
      for (let x = minX; x < cX; x++) {
        if (ptsSet.has(`${x},${y}`)) beakLeft++;
      }
      for (let x = cX + 1; x <= maxX; x++) {
        if (ptsSet.has(`${x},${y}`)) beakRight++;
      }
    }
    const yMidStem1 = minY + Math.floor(glyphH * 0.38);
    const yMidStem2 = minY + Math.floor(glyphH * 0.72);
    const xLeftMargin = minX + Math.max(1, Math.floor(glyphW * 0.18));
    const xRightMargin = maxX - Math.max(2, Math.floor(glyphW * 0.22));
    let midLeftMarginPixels = 0;
    let upperAndMidRightPixels = 0;
    for (let y = minY; y <= yMidStem2; y++) {
      if (y >= yMidStem1) {
        for (let x = minX; x <= xLeftMargin; x++) {
          if (ptsSet.has(`${x},${y}`)) midLeftMarginPixels++;
        }
      }
      for (let x = xRightMargin; x <= maxX; x++) {
        if (ptsSet.has(`${x},${y}`)) upperAndMidRightPixels++;
      }
    }
    if (
      stemBrokenRows === 0 &&
      beakLeft > beakRight * 1.3 &&
      midLeftMarginPixels === 0 &&
      upperAndMidRightPixels === 0
    ) {
      return '1';
    }
  }

  // Wall and cavity checks
  const cX = Math.floor((minX + maxX) / 2);
  const leftMargin = Math.max(1, Math.round(glyphW * 0.28));

  // Continuous left wall in middle: y between 0.30*H and 0.70*H
  const yLeftStart = minY + Math.floor(glyphH * 0.30);
  const yLeftEnd = minY + Math.floor(glyphH * 0.70);
  let maxConsecutiveEmptyLeft = 0;
  let currEmptyLeft = 0;
  for (let y = yLeftStart; y <= yLeftEnd; y++) {
    let hasLeft = false;
    for (let x = minX; x <= minX + leftMargin; x++) {
      if (ptsSet.has(`${x},${y}`)) hasLeft = true;
    }
    if (!hasLeft) {
      currEmptyLeft++;
      if (currEmptyLeft > maxConsecutiveEmptyLeft) maxConsecutiveEmptyLeft = currEmptyLeft;
    } else {
      currEmptyLeft = 0;
    }
  }

  // Continuous right wall in middle: y between 0.30*H and 0.70*H
  let maxConsecutiveEmptyRight = 0;
  let currEmptyRight = 0;
  for (let y = yLeftStart; y <= yLeftEnd; y++) {
    let hasRight = false;
    for (let x = maxX - leftMargin; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) hasRight = true;
    }
    if (!hasRight) {
      currEmptyRight++;
      if (currEmptyRight > maxConsecutiveEmptyRight) maxConsecutiveEmptyRight = currEmptyRight;
    } else {
      currEmptyRight = 0;
    }
  }

  // 2. Digit '7': solid top horizontal bar, narrow bottom point, empty left wall
  if (topP >= glyphW * 0.70 && botP <= glyphW * 0.40 && maxConsecutiveEmptyLeft >= 2) {
    return '7';
  }

  // 3. Digit '4': horizontal crossbar around 50%-75% height,
  // and bottom is only the right vertical stem (lower-left is empty).
  const yCrossStart = minY + Math.floor(glyphH * 0.50);
  const yCrossEnd = minY + Math.floor(glyphH * 0.75);
  let maxCrossSpan = 0;
  let crossY = yCrossStart;
  for (let y = yCrossStart; y <= yCrossEnd; y++) {
    let span = 0;
    for (let x = minX; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) span++;
    }
    if (span > maxCrossSpan) {
      maxCrossSpan = span;
      crossY = y;
    }
  }

  const maxCrossThickness = Math.max(2, Math.floor(glyphH * 0.18));
  let crossYEnd = crossY;
  while (
    crossYEnd < maxY - 2 &&
    crossYEnd - crossY < maxCrossThickness &&
    crossYEnd + 1 <= minY + Math.floor(glyphH * 0.78)
  ) {
    let span = 0;
    for (let x = minX; x <= maxX; x++) {
      if (ptsSet.has(`${x},${crossYEnd + 1}`)) span++;
    }
    const centerFilled =
      ptsSet.has(`${cX},${crossYEnd + 1}`) ||
      (ptsSet.has(`${cX - 1},${crossYEnd + 1}`) && ptsSet.has(`${cX + 1},${crossYEnd + 1}`));
    if (span >= glyphW * 0.60 && centerFilled) crossYEnd++;
    else break;
  }

  let lowerLeftPixels = 0;
  for (let y = crossYEnd + 1; y <= maxY; y++) {
    for (let x = minX; x <= minX + Math.floor(glyphW * 0.35); x++) {
      if (ptsSet.has(`${x},${y}`)) lowerLeftPixels++;
    }
  }

  const minCrossReq = glyphW <= 8 ? glyphW * 0.65 : glyphW * 0.75;
  const maxLL = Math.max(1, Math.floor(glyphW * 0.12));
  if (
    maxCrossSpan >= minCrossReq &&
    maxY - crossYEnd >= Math.max(2, Math.floor(glyphH * 0.14)) &&
    lowerLeftPixels <= maxLL &&
    botP <= Math.max(4, Math.floor(glyphW * 0.60)) &&
    topP < glyphW * 0.60
  ) {
    return '4';
  }

  // Waist crossbar span in middle third (y between 0.40*H and 0.60*H)
  const yMidStart = minY + Math.floor(glyphH * 0.40);
  const yMidEnd = minY + Math.floor(glyphH * 0.60);
  let maxWaistSpan = 0;
  let waistY = yMidStart;
  let centerTunnelPixels = 0;
  for (let y = yMidStart; y <= yMidEnd; y++) {
    let span = 0;
    for (let x = minX; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) span++;
    }
    if (span > maxWaistSpan) {
      maxWaistSpan = span;
      waistY = y;
    }
    for (let x = cX - 1; x <= cX + 1; x++) {
      if (ptsSet.has(`${x},${y}`)) centerTunnelPixels++;
    }
  }

  // 4. Digit '0': both left and right walls continuous, but center tunnel is hollow
  if (
    maxConsecutiveEmptyLeft <= 1 &&
    maxConsecutiveEmptyRight <= 1 &&
    centerTunnelPixels <= Math.max(2, Math.round((yMidEnd - yMidStart + 1) * 0.4))
  ) {
    return '0';
  }

  // Continuous left wall in upper half:
  const yUpperLeftStart = minY + Math.floor(glyphH * 0.20);
  const yUpperLeftEnd = Math.max(yUpperLeftStart, waistY - 1);
  let maxConsecutiveEmptyLeftUpper = 0;
  let currEmptyLeftUpper = 0;
  for (let y = yUpperLeftStart; y <= yUpperLeftEnd; y++) {
    let hasLeft = false;
    for (let x = minX; x <= minX + leftMargin; x++) {
      if (ptsSet.has(`${x},${y}`)) hasLeft = true;
    }
    if (!hasLeft) {
      currEmptyLeftUpper++;
      if (currEmptyLeftUpper > maxConsecutiveEmptyLeftUpper) maxConsecutiveEmptyLeftUpper = currEmptyLeftUpper;
    } else {
      currEmptyLeftUpper = 0;
    }
  }

  // 5. '6' vs '8' vs '9': upper left wall is continuous, waist crossbar is solid
  if (maxConsecutiveEmptyLeftUpper <= 1 && maxWaistSpan >= glyphW * 0.55) {
    const yUR1 = minY + Math.floor(glyphH * 0.24);
    const yUR2 = Math.max(yUR1, Math.min(waistY - 1, minY + Math.floor(glyphH * 0.38)));
    const xRight = maxX - Math.max(1, Math.round(glyphW * 0.25));
    let urPixels = 0;
    let emptyUpperRightRows = 0;
    for (let y = yUR1; y <= yUR2; y++) {
      let rowUR = 0;
      for (let x = xRight; x <= maxX; x++) {
        if (ptsSet.has(`${x},${y}`)) {
          urPixels++;
          rowUR++;
        }
      }
      if (rowUR === 0) emptyUpperRightRows++;
    }
    const urBoxArea = (yUR2 - yUR1 + 1) * (maxX - xRight + 1);

    // In '8', the lower loop has a solid, continuous left wall.
    // In '9', the lower left has an open mouth (gap) between waist and bottom hook.
    const yLLW1 = minY + Math.floor(glyphH * 0.58);
    const yLLW2 = minY + Math.floor(glyphH * 0.75);
    const xLeftThird = minX + Math.max(1, Math.floor(glyphW * 0.30));
    let hasEmptyLowerLeftRow = false;
    for (let y = yLLW1; y <= yLLW2; y++) {
      let count = 0;
      for (let x = minX; x <= xLeftThird; x++) {
        if (ptsSet.has(`${x},${y}`)) count++;
      }
      if (count === 0) {
        hasEmptyLowerLeftRow = true;
        break;
      }
    }

    if (emptyUpperRightRows === 0 && urPixels >= urBoxArea * 0.35) {
      if (hasEmptyLowerLeftRow) {
        return '9';
      }
      return '8';
    } else if (maxConsecutiveEmptyLeft <= 1) {
      return '6';
    }
  }

  // 6. '9': enclosed upper loop, solid waist crossbar, solid right vertical stem, and empty lower-left
  const yU1 = minY + Math.floor(glyphH * 0.20);
  const yU2 = minY + Math.floor(glyphH * 0.40);
  let upLoopLeft = 0;
  let upLoopRight = 0;
  let upLoopCenterHole = 0;
  for (let y = yU1; y <= yU2; y++) {
    for (let x = minX; x <= minX + leftMargin; x++) {
      if (ptsSet.has(`${x},${y}`)) upLoopLeft++;
    }
    for (let x = maxX - leftMargin; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) upLoopRight++;
    }
    for (let x = cX - 1; x <= cX + 1; x++) {
      if (ptsSet.has(`${x},${y}`)) upLoopCenterHole++;
    }
  }

  const yLL1 = minY + Math.floor(glyphH * 0.60);
  const yLL2 = minY + Math.floor(glyphH * 0.78);
  let lowerLeftStem = 0;
  let lowerRightStem = 0;
  for (let y = yLL1; y <= yLL2; y++) {
    for (let x = minX; x <= minX + leftMargin; x++) {
      if (ptsSet.has(`${x},${y}`)) lowerLeftStem++;
    }
    for (let x = maxX - leftMargin; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) lowerRightStem++;
    }
  }

  if (
    upLoopLeft >= glyphH * 0.35 &&
    upLoopRight >= glyphH * 0.35 &&
    upLoopCenterHole <= Math.max(2, Math.round((yU2 - yU1 + 1) * 0.35)) &&
    maxWaistSpan >= glyphW * 0.65 &&
    lowerRightStem >= glyphH * 0.35 &&
    lowerLeftStem <= lowerRightStem * 0.35
  ) {
    return '9';
  }

  // 7. '2': flat horizontal baseline (botP >= 70%) AND not a '3' lower loop
  const yLM1 = minY + Math.floor(glyphH * 0.60);
  const yLM2 = minY + Math.floor(glyphH * 0.78);
  let leftMid = 0;
  let rightMid = 0;
  for (let y = yLM1; y <= yLM2; y++) {
    for (let x = minX; x < cX; x++) {
      if (ptsSet.has(`${x},${y}`)) leftMid++;
    }
    for (let x = cX + 1; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) rightMid++;
    }
  }

  if (botP >= glyphW * 0.70 && rightMid <= leftMid * 1.85) {
    return '2';
  }

  // 8. '5' vs '3':
  const yUR1 = minY + Math.floor(glyphH * 0.22);
  const yUR2 = minY + Math.floor(glyphH * 0.42);
  const xRight = maxX - Math.max(1, Math.round(glyphW * 0.25));
  let urPixels = 0;
  for (let y = yUR1; y <= yUR2; y++) {
    for (let x = xRight; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) urPixels++;
    }
  }
  const urBoxArea = (yUR2 - yUR1 + 1) * (maxX - xRight + 1);

  const yUp1 = minY + Math.floor(glyphH * 0.20);
  const yUp2 = minY + Math.floor(glyphH * 0.40);
  let upLeft = 0;
  let upRight = 0;
  for (let y = yUp1; y <= yUp2; y++) {
    for (let x = minX; x <= minX + leftMargin; x++) {
      if (ptsSet.has(`${x},${y}`)) upLeft++;
    }
    for (let x = maxX - leftMargin; x <= maxX; x++) {
      if (ptsSet.has(`${x},${y}`)) upRight++;
    }
  }

  if (upLeft > upRight || urPixels <= urBoxArea * 0.30) {
    return '5';
  } else {
    return '3';
  }
}
