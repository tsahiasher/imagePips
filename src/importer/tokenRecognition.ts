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
      if (r > 200 && g > 200 && b > 200 && maxVal - minVal < 35) {
        pts.push({ x: dx, y: dy });
      }
    }
  }

  // Not enough evidence of a text glyph
  if (pts.length < 15) {
    return { token: '?', constraint: null, confidence: 0 };
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const ptsSet = new Set<string>();

  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    ptsSet.add(`${p.x},${p.y}`);
  }

  const glyphW = maxX - minX + 1;
  const glyphH = maxY - minY + 1;

  // 1. Equal sign '=': two horizontal bars separated by empty middle row(s)
  const midY = Math.floor((minY + maxY) / 2);
  let gapRowPixels = 0;
  for (let x = minX; x <= maxX; x++) {
    if (ptsSet.has(`${x},${midY}`)) gapRowPixels++;
  }
  let topBarPixels = 0, botBarPixels = 0;
  for (let x = minX; x <= maxX; x++) {
    if (ptsSet.has(`${x},${minY + 2}`)) topBarPixels++;
    if (ptsSet.has(`${x},${maxY - 2}`)) botBarPixels++;
  }
  if (gapRowPixels <= 1 && topBarPixels >= glyphW * 0.55 && botBarPixels >= glyphW * 0.55) {
    return { token: '=', constraint: { type: 'equal' }, confidence: 0.99 };
  }

  // 2. Single digit (aspect ratio w / h < 1.05)
  if (glyphW / glyphH < 1.05) {
    // 2.1. Digit '1': narrow aspect ratio
    if (glyphW / glyphH < 0.58) {
      return { token: '1', constraint: { type: 'sum', value: 1 }, confidence: 0.98 };
    }

    // Top and bottom row pixel counts
    let topP = 0, botP = 0;
    for (let x = minX; x <= maxX; x++) {
      if (ptsSet.has(`${x},${minY}`) || ptsSet.has(`${x},${minY + 1}`)) topP++;
      if (ptsSet.has(`${x},${maxY}`) || ptsSet.has(`${x},${maxY - 1}`)) botP++;
    }

    // 2.2. Digit '7': solid top horizontal bar, narrow bottom point
    if (topP >= glyphW * 0.70 && botP <= glyphW * 0.40) {
      return { token: '7', constraint: { type: 'sum', value: 7 }, confidence: 0.98 };
    }

    // 2.3. Digit '4': horizontal crossbar spanning >= 80% around 60%-70% height,
    // and bottom is only the right vertical stem (lower-left is empty).
    const yCrossStart = minY + Math.floor(glyphH * 0.58);
    const yCrossEnd = minY + Math.floor(glyphH * 0.72);
    let maxCrossSpan = 0;
    for (let y = yCrossStart; y <= yCrossEnd; y++) {
      let span = 0;
      for (let x = minX; x <= maxX; x++) {
        if (ptsSet.has(`${x},${y}`)) span++;
      }
      if (span > maxCrossSpan) maxCrossSpan = span;
    }

    let lowerLeftPixels = 0;
    for (let y = maxY - 2; y <= maxY; y++) {
      for (let x = minX; x <= minX + Math.floor(glyphW * 0.40); x++) {
        if (ptsSet.has(`${x},${y}`)) lowerLeftPixels++;
      }
    }

    if (maxCrossSpan >= glyphW * 0.80 && lowerLeftPixels === 0 && botP <= glyphW * 0.45) {
      return { token: '4', constraint: { type: 'sum', value: 4 }, confidence: 0.98 };
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

    // Waist crossbar span in middle third (y between 0.40*H and 0.60*H)
    const yMidStart = minY + Math.floor(glyphH * 0.40);
    const yMidEnd = minY + Math.floor(glyphH * 0.60);
    let maxWaistSpan = 0;
    let centerTunnelPixels = 0;
    for (let y = yMidStart; y <= yMidEnd; y++) {
      let span = 0;
      for (let x = minX; x <= maxX; x++) {
        if (ptsSet.has(`${x},${y}`)) span++;
      }
      if (span > maxWaistSpan) maxWaistSpan = span;
      for (let x = cX - 1; x <= cX + 1; x++) {
        if (ptsSet.has(`${x},${y}`)) centerTunnelPixels++;
      }
    }

    // 2.4. '0': both left and right walls continuous, but center tunnel is hollow
    if (
      maxConsecutiveEmptyLeft <= 1 &&
      maxConsecutiveEmptyRight <= 1 &&
      centerTunnelPixels <= Math.max(2, Math.round((yMidEnd - yMidStart + 1) * 0.4))
    ) {
      return { token: '0', constraint: { type: 'sum', value: 0 }, confidence: 0.98 };
    }

    // 2.5. '6' vs '8': left wall is continuous, waist crossbar is solid
    if (maxConsecutiveEmptyLeft <= 1 && maxWaistSpan >= glyphW * 0.60) {
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
      if (urPixels >= urBoxArea * 0.35) {
        return { token: '8', constraint: { type: 'sum', value: 8 }, confidence: 0.98 };
      } else {
        return { token: '6', constraint: { type: 'sum', value: 6 }, confidence: 0.98 };
      }
    }

    // 2.6. '2': flat horizontal baseline (botP >= 70%) AND not a '3' lower loop
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
      return { token: '2', constraint: { type: 'sum', value: 2 }, confidence: 0.98 };
    }

    // 2.7. '5' vs '3':
    // '5' has empty upper-right, whereas '3' has filled upper-right
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
      return { token: '5', constraint: { type: 'sum', value: 5 }, confidence: 0.98 };
    } else {
      return { token: '3', constraint: { type: 'sum', value: 3 }, confidence: 0.98 };
    }
  }

  // 3. Multi-character token (operator + digit OR two-digit number)
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

  let leftChar = '';
  if (leftMaxCol >= leftH * 0.65) {
    // Digit '1' or '2'
    // '2' (in '24') has upper-right loop at y = leftMinY + 0.25 * leftH
    const yUpper = leftMinY + Math.floor(leftH * 0.25);
    let hasUpperRight = false;
    for (let x = leftMaxX - 3; x <= leftMaxX; x++) {
      if (ptsSet.has(`${x},${yUpper}`)) hasUpperRight = true;
    }
    if (hasUpperRight) {
      leftChar = '2';
    } else {
      leftChar = '1';
    }
  } else {
    // Chevron '<' or '>'
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

    if (span25 > span75) {
      leftChar = '>';
    } else {
      leftChar = '<';
    }
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

  const rMidY = rightMinY + Math.floor(rightH * 0.63);
  let rCrossP = 0;
  for (let x = rightMinX; x <= rightMaxX; x++) {
    if (ptsSet.has(`${x},${rMidY}`) || ptsSet.has(`${x},${rMidY - 1}`) || ptsSet.has(`${x},${rMidY + 1}`)) rCrossP++;
  }

  const rUpperY = rightMinY + Math.floor(rightH * 0.25);
  let rHasUpperRight = false;
  for (let x = rightMaxX - 3; x <= rightMaxX; x++) {
    if (ptsSet.has(`${x},${rUpperY}`)) rHasUpperRight = true;
  }

  const rcX = Math.floor((rightMinX + rightMaxX) / 2);
  const rcY = Math.floor((rightMinY + rightMaxY) / 2);
  let rCenterHole = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (ptsSet.has(`${rcX + dx},${rcY + dy}`)) rCenterHole++;
    }
  }

  let rightChar = '';
  // 1. '1' (in '11'): narrow width, solid column
  if (rightW / rightH < 0.60 && rightMaxCol >= rightH * 0.65) {
    rightChar = '1';
  }
  // 2. '7' (in '<7'): solid top bar, narrow bottom point
  else if (rightTopP >= rightW * 0.65 && rightBotP <= rightW * 0.45) {
    rightChar = '7';
  }
  // 3. '4' (in '<4', '>4', '24'): horizontal crossbar, narrow bottom point
  else if (rCrossP >= rightW * 0.70 && rightBotP <= rightW * 0.35) {
    rightChar = '4';
  }
  // 4. '0' (in '10'): center hole
  else if (rCenterHole === 0) {
    rightChar = '0';
  }
  // 5. '2' vs '5': '2' has upper-right loop wall, '5' has empty upper-right
  else if (rHasUpperRight) {
    rightChar = '2';
  }
  // 6. Otherwise '5' (in '<5')
  else {
    rightChar = '5';
  }

  const token = `${leftChar}${rightChar}`;
  const constraint = parseConstraintFromToken(token);
  return { token, constraint, confidence: 0.98 };
}
