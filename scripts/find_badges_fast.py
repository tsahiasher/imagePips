"""Fast 2D connected component labeling for badges in game2.jpg.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def find_badges_fast(path: str) -> None:
    """Finds badge centers using fast 2D connected component labeling.

    Args:
        path: Path to the image file.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        width, height = img.size

        y1, y2 = 700, 1340
        x1, x2 = 160, 800
        box_w = x2 - x1
        box_h = y2 - y1

        # Binary mask: saturated colors (badge bodies)
        mask = bytearray(box_w * box_h)
        for my in range(box_h):
            y = y1 + my
            row_offset = my * box_w
            for mx in range(box_w):
                x = x1 + mx
                r, g, b = rgb.getpixel((x, y))
                max_v = max(r, g, b)
                min_v = min(r, g, b)
                sat = (max_v - min_v) / float(max_v) if max_v > 0 else 0
                # Badge pixels have high saturation and are not too dark
                if sat > 0.58 and max_v > 90:
                    mask[row_offset + mx] = 1

        visited = bytearray(box_w * box_h)
        badges = []

        for my in range(box_h):
            for mx in range(box_w):
                idx = my * box_w + mx
                if mask[idx] == 1 and visited[idx] == 0:
                    # BFS
                    queue = [(mx, my)]
                    visited[idx] = 1
                    pixel_count = 0
                    sum_x = 0
                    sum_y = 0
                    min_bx, max_bx = mx, mx
                    min_by, max_by = my, my

                    while queue:
                        cx, cy = queue.pop()
                        pixel_count += 1
                        sum_x += cx
                        sum_y += cy
                        min_bx = min(min_bx, cx)
                        max_bx = max(max_bx, cx)
                        min_by = min(min_by, cy)
                        max_by = max(max_by, cy)

                        for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                            if 0 <= nx < box_w and 0 <= ny < box_h:
                                n_idx = ny * box_w + nx
                                if mask[n_idx] == 1 and visited[n_idx] == 0:
                                    visited[n_idx] = 1
                                    queue.append((nx, ny))

                    bw = max_bx - min_bx + 1
                    bh = max_by - min_by + 1
                    # A diamond badge has area ~ 1000 - 5000 and width/height ~ 40-75
                    if pixel_count >= 800 and 35 <= bw <= 85 and 35 <= bh <= 85:
                        center_x = x1 + sum_x // pixel_count
                        center_y = y1 + sum_y // pixel_count
                        badges.append((center_x, center_y, bw, bh, pixel_count))

        badges.sort(key=lambda b: (b[1] // 50, b[0]))
        logger.info("Found %d diamond badges:", len(badges))
        for idx, (cx, cy, bw, bh, count) in enumerate(badges):
            logger.info("  Badge %d: center=(%d, %d), size=%dx%d, pixels=%d", idx + 1, cx, cy, bw, bh, count)


if __name__ == "__main__":
    find_badges_fast("c:\\Zahi\\image_pips\\game2.jpg")
