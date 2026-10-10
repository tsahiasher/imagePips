import { BoundingBox, ImageDataLike } from './types';

export interface GameAreas {
  boardBox: BoundingBox;
  trayBox: BoundingBox;
}

/**
 * Identifies the bounding boxes for the puzzle board and domino tray.
 */
export function detectGameAreas(image: ImageDataLike): GameAreas {
  const data = image.data;
  const width = image.width;
  const height = image.height;

  // Compute non-white pixel count for every row
  const rowDensity: number[] = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    let nonWhiteCount = 0;
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Check if pixel is distinct from pure white background
      if (r < 246 || g < 246 || b < 246) {
        nonWhiteCount++;
      }
    }
    rowDensity[y] = nonWhiteCount;
  }

  // Dynamically find content spans without hardcoded phone chrome assumptions.
  // The board is the largest contiguous high-density vertical block.
  // The tray is the content area below the board.
  const thresh = width * 0.04;
  const isDense = new Uint8Array(height);
  for (let y = 0; y < height; y++) {
    if (rowDensity[y] >= thresh) {
      isDense[y] = 1;
    }
  }

  // Bridge small gaps (<= 12px)
  const bridged = new Uint8Array(isDense);
  let gap = 0;
  for (let y = 0; y < height; y++) {
    if (bridged[y] === 0) {
      gap++;
    } else {
      if (gap > 0 && gap <= 12) {
        for (let gy = y - gap; gy < y; gy++) {
          bridged[gy] = 1;
        }
      }
      gap = 0;
    }
  }

  // Find contiguous spans in bridged
  interface VerticalSpan {
    startY: number;
    endY: number;
    height: number;
  }
  const spans: VerticalSpan[] = [];
  let inSpan = false;
  let spanStart = 0;
  for (let y = 0; y < height; y++) {
    if (bridged[y] === 1 && !inSpan) {
      inSpan = true;
      spanStart = y;
    } else if (bridged[y] === 0 && inSpan) {
      inSpan = false;
      spans.push({ startY: spanStart, endY: y - 1, height: y - spanStart });
    }
  }
  if (inSpan) {
    spans.push({ startY: spanStart, endY: height - 1, height: height - spanStart });
  }

  // The board is the span with the largest height
  let boardMinY = Math.floor(height * 0.20);
  let boardMaxY = Math.floor(height * 0.65);
  if (spans.length > 0) {
    let maxH = -1;
    let bestSpan = spans[0];
    for (const s of spans) {
      if (s.height > maxH) {
        maxH = s.height;
        bestSpan = s;
      }
    }
    boardMinY = bestSpan.startY;
    boardMaxY = bestSpan.endY;

    // Refine board boundaries using rowDensity
    while (boardMinY < boardMaxY && rowDensity[boardMinY] < thresh) {
      boardMinY++;
    }
    while (boardMaxY > boardMinY && rowDensity[boardMaxY] < thresh) {
      boardMaxY--;
    }
  }

  // Find tray vertical extent below the board
  let trayMinY = boardMaxY + 20;
  let trayMaxY = height - 20;
  const traySpans = spans.filter((s) => s.startY > boardMaxY && s.height >= 20);
  if (traySpans.length > 0) {
    trayMinY = traySpans[0].startY;
    const lastSpan = traySpans[traySpans.length - 1];
    // Exclude phone home indicator bar if near the very bottom and short (height < 50px)
    if (traySpans.length > 1 && lastSpan.height < 50 && lastSpan.endY > height - 100) {
      trayMaxY = traySpans[traySpans.length - 2].endY;
    } else {
      trayMaxY = lastSpan.endY;
    }
  }

  // Find horizontal extent for board
  let boardMinX = width;
  let boardMaxX = 0;
  for (let y = boardMinY; y <= boardMaxY; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < 246 || g < 246 || b < 246) {
        if (x < boardMinX) boardMinX = x;
        if (x > boardMaxX) boardMaxX = x;
      }
    }
  }

  // Find horizontal extent for tray
  let trayMinX = width;
  let trayMaxX = 0;
  for (let y = trayMinY; y <= trayMaxY; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < 246 || g < 246 || b < 246) {
        if (x < trayMinX) trayMinX = x;
        if (x > trayMaxX) trayMaxX = x;
      }
    }
  }

  // Fallback defaults if image is unusual
  if (boardMinX >= boardMaxX) {
    boardMinX = Math.floor(width * 0.05);
    boardMaxX = Math.floor(width * 0.95);
    boardMinY = Math.floor(height * 0.25);
    boardMaxY = Math.floor(height * 0.65);
  }

  if (trayMinX >= trayMaxX) {
    trayMinX = Math.floor(width * 0.05);
    trayMaxX = Math.floor(width * 0.95);
    trayMinY = Math.floor(height * 0.70);
    trayMaxY = Math.floor(height * 0.96);
  }

  return {
    boardBox: {
      x: boardMinX,
      y: boardMinY,
      width: Math.max(10, boardMaxX - boardMinX),
      height: Math.max(10, boardMaxY - boardMinY)
    },
    trayBox: {
      x: trayMinX,
      y: trayMinY,
      width: Math.max(10, trayMaxX - trayMinX),
      height: Math.max(10, trayMaxY - trayMinY)
    }
  };
}
