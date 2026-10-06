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

  // Board typically occupies upper-middle area (e.g. 20% to 68% height)
  // Tray typically occupies lower area (e.g. 68% to 98% height)
  const midSplit = Math.floor(height * 0.67);

  // Find board vertical extent
  let boardMinY = Math.floor(height * 0.20);
  let boardMaxY = midSplit;

  while (boardMinY < midSplit && rowDensity[boardMinY] < width * 0.04) {
    boardMinY++;
  }
  while (boardMaxY > boardMinY && rowDensity[boardMaxY] < width * 0.04) {
    boardMaxY--;
  }

  // Find tray vertical extent
  let trayMinY = midSplit;
  let trayMaxY = Math.floor(height * 0.98);

  while (trayMinY < trayMaxY && rowDensity[trayMinY] < width * 0.04) {
    trayMinY++;
  }
  while (trayMaxY > trayMinY && rowDensity[trayMaxY] < width * 0.04) {
    trayMaxY--;
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
