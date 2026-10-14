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
  badgeHeight?: number
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

  const rx = ((badgeWidth ?? 80) / 2) * 0.82;
  const ry = ((badgeHeight ?? 80) / 2) * 0.82;
  const cropRadius = Math.round(Math.max(rx, ry) * 1.1);

  const isSmallBadge = (badgeWidth ?? 80) <= 45 || (badgeHeight ?? 80) <= 45;

  for (let dy = -cropRadius; dy <= cropRadius; dy++) {
    const sy = startY + cy + dy;
    if (sy < 0) continue;
    for (let dx = -cropRadius; dx <= cropRadius; dx++) {
      // Diamond equation: (|dx| / rx + |dy| / ry) <= 0.88
      if (Math.abs(dx) / rx + Math.abs(dy) / ry > 0.88) continue;

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

  // 1.1. Equal sign '=': two horizontal bars, empty gap row, no diagonal slash
  if (gapRowPixels <= 1 && topBarSpan >= glyphW * 0.55 && botBarSpan >= glyphW * 0.55) {
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
      topBarSpan >= glyphW * 0.62 &&
      botBarSpan >= glyphW * 0.62 &&
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

  const isChevronLeft = midLeftPixels >= 1 && midRightPixels === 0 && span75 >= span25;
  const isChevronRight = midRightPixels >= 1 && midLeftPixels === 0 && span25 >= span75;

  let leftChar = '';
  // 1. Chevron '<'
  if (isChevronLeft) {
    leftChar = '<';
  }
  // 2. Chevron '>'
  else if (isChevronRight) {
    leftChar = '>';
  }
  // 3. Digit '2' (in '20'..'24'): wide digit with flat horizontal bottom baseline and NO continuous vertical stem
  else if (
    leftMaxCol / leftH <= 0.82 &&
    leftBotP >= leftW * 0.55 &&
    leftW / leftH >= 0.60
  ) {
    leftChar = '2';
  }
  // 4. Digit '1' (in '10'..'19'): narrow vertical stroke or solid vertical column (leftMaxCol / leftH > 0.82)
  else {
    leftChar = '1';
  }

  // Right char classification:
  let rightTopP = 0, rightBotP = 0;
  for (let x = rightMinX; x <= rightMaxX; x++) {
    if (ptsSet.has(`${x},${rightMinY}`) || ptsSet.has(`${x},${rightMinY + 1}`)) rightTopP++;
    if (ptsSet.has(`${x},${rightMaxY}`) || ptsSet.has(`${x},${rightMaxY - 1}`)) rightBotP++;
  }

  let rightMaxCol = 0;
  for (let x = rightMinX; x <= rightMaxX; x++) {
    let count = 0;
    for (let y = rightMinY; y <= rightMaxY; y++) {
      if (ptsSet.has(`${x},${y}`)) count++;
    }
    if (count > rightMaxCol) rightMaxCol = count;
  }

  const yCrossStart = rightMinY + Math.floor(rightH * 0.50);
  const yCrossEnd = rightMinY + Math.floor(rightH * 0.82);
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

  let crossYEnd = crossY;
  while (crossYEnd < rightMaxY - 1) {
    let span = 0;
    for (let x = rightMinX; x <= rightMaxX; x++) {
      if (ptsSet.has(`${x},${crossYEnd + 1}`)) span++;
    }
    if (span >= rightW * 0.60) crossYEnd++;
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
  for (let y = yUR1; y <= yUR2; y++) {
    for (let x = xRightLimit; x <= rightMaxX; x++) {
      if (ptsSet.has(`${x},${y}`)) {
        hasUpperRight = true;
        upRight++;
      }
    }
    for (let x = rightMinX; x <= xLeftLimit; x++) {
      if (ptsSet.has(`${x},${y}`)) {
        upLeft++;
      }
    }
  }

  const rcX = Math.floor((rightMinX + rightMaxX) / 2);
  const rcY = Math.floor((rightMinY + rightMaxY) / 2);
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

  let rightChar = '';
  // 1. '7' (in '<7', '>7'): solid top bar, narrow bottom point
  if (rightTopP >= rightW * 0.65 && rightBotP <= rightW * 0.50) {
    rightChar = '7';
  }
  // 2. '1' (in '11'): narrow width, solid column
  else if (rightW / rightH < 0.60 && rightMaxCol >= rightH * 0.65) {
    rightChar = '1';
  }
  // 3. '4' (in '<4', '>4', '24', '14'): horizontal crossbar, empty lower-left below crossbar
  else if (
    maxCrossSpan >= rightW * 0.65 &&
    rLowerLeft <= Math.max(1, Math.floor(rightW * 0.12)) &&
    rightBotP <= Math.max(4, Math.floor(rightW * 0.60))
  ) {
    rightChar = '4';
  }
  // 4. '0' (in '10'): center hole
  else if (rCenterHole === 0) {
    rightChar = '0';
  }
  // 5. '5' (in '<5'): empty upper-right cavity below top bar, or vertical stem on upper-left
  else if (upLeft > upRight || !hasUpperRight) {
    rightChar = '5';
  }
  // 6. '2' vs '3':
  // In '2', lower-half has descending diagonal so rightMid <= leftMid * 1.85
  // In '3', lower loop bulges heavily to the right so rightMid > leftMid * 1.85
  else if (rightMid <= leftMid * 1.85) {
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

  // 1. Digit '1': narrow aspect ratio
  if (glyphW / glyphH < 0.58) {
    return '1';
  }

  // Top and bottom row pixel counts
  let topP = 0, botP = 0;
  for (let x = minX; x <= maxX; x++) {
    if (ptsSet.has(`${x},${minY}`) || ptsSet.has(`${x},${minY + 1}`)) topP++;
    if (ptsSet.has(`${x},${maxY}`) || ptsSet.has(`${x},${maxY - 1}`)) botP++;
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

  let crossYEnd = crossY;
  while (crossYEnd < maxY - 1) {
    let span = 0;
    for (let x = minX; x <= maxX; x++) {
      if (ptsSet.has(`${x},${crossYEnd + 1}`)) span++;
    }
    if (span >= glyphW * 0.60) crossYEnd++;
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
    lowerLeftPixels <= maxLL &&
    botP <= Math.max(4, Math.floor(glyphW * 0.60))
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

  // 5. '6' vs '8': left wall is continuous, waist crossbar is solid
  if (maxConsecutiveEmptyLeft <= 1 && maxWaistSpan >= glyphW * 0.55) {
    const yUR1 = minY + Math.floor(glyphH * 0.22);
    const yUR2 = Math.max(yUR1, waistY - 1);
    const xRight = maxX - Math.max(1, Math.round(glyphW * 0.25));
    let urPixels = 0;
    for (let y = yUR1; y <= yUR2; y++) {
      for (let x = xRight; x <= maxX; x++) {
        if (ptsSet.has(`${x},${y}`)) urPixels++;
      }
    }
    const urBoxArea = (yUR2 - yUR1 + 1) * (maxX - xRight + 1);

    // In '8', the lower loop has a solid, continuous left wall.
    // In '9', the lower left has an open mouth (gap) between waist and bottom hook.
    const yLLW1 = minY + Math.floor(glyphH * 0.60);
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

    if (urPixels >= urBoxArea * 0.35) {
      if (hasEmptyLowerLeftRow) {
        return '9';
      }
      return '8';
    } else {
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
