"""Segment dominoes in game2.jpg via connected component analysis.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def find_domino_boxes(path: str) -> List[Tuple[int, int, int, int]]:
    """Locates all domino bounding boxes in the tray.

    Args:
        path: Path to the image file.

    Returns:
        List of (x, y, w, h) bounding boxes.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        width, height = rgb.size

        # In tray (y from 1600 to 1950)
        # Find non-white pixels: domino bodies have light gray / off-white and dark borders
        # Background is pure white (255, 255, 255)
        # A pixel is in a domino if (r < 250 or g < 250 or b < 250)
        mask = []
        for y in range(1600, 1950):
            row = []
            for x in range(width):
                r, g, b = rgb.getpixel((x, y))
                row.append(1 if (r < 252 or g < 252 or b < 252) else 0)
            mask.append(row)

        # Flood fill connected components
        h_mask = len(mask)
        w_mask = len(mask[0])
        visited = [[False]*w_mask for _ in range(h_mask)]
        boxes = []

        for my in range(h_mask):
            for mx in range(w_mask):
                if mask[my][mx] == 1 and not visited[my][mx]:
                    # BFS
                    queue = [(mx, my)]
                    visited[my][mx] = True
                    min_x, max_x = mx, mx
                    min_y, max_y = my, my
                    pixel_count = 0

                    while queue:
                        cx, cy = queue.pop()
                        pixel_count += 1
                        min_x = min(min_x, cx)
                        max_x = max(max_x, cx)
                        min_y = min(min_y, cy)
                        max_y = max(max_y, cy)

                        for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                            if 0 <= nx < w_mask and 0 <= ny < h_mask:
                                if mask[ny][nx] == 1 and not visited[ny][nx]:
                                    visited[ny][nx] = True
                                    queue.append((nx, ny))

                    bw = max_x - min_x + 1
                    bh = max_y - min_y + 1
                    # Domino aspect ratio is roughly 2:1 (width ~ 170-220, height ~ 85-110)
                    if bw > 100 and bh > 60:
                        real_y = 1600 + min_y
                        boxes.append((min_x, real_y, bw, bh))
                        logger.info(
                            "Found domino candidate: x=%d, y=%d, w=%d, h=%d (pixels=%d)",
                            min_x, real_y, bw, bh, pixel_count
                        )

        # Sort by y, then x
        boxes.sort(key=lambda b: (b[1] // 50, b[0]))
        logger.info("Total dominoes found: %d", len(boxes))
        return boxes


if __name__ == "__main__":
    find_domino_boxes("c:\\Zahi\\image_pips\\game2.jpg")
