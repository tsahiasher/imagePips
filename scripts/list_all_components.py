"""Print all components to see actual badge sizes.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def list_all_components(path: str) -> None:
    """Lists all components in the saturation mask.

    Args:
        path: Path to the image file.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        y1, y2 = 700, 1340
        x1, x2 = 160, 800
        box_w = x2 - x1
        box_h = y2 - y1

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
                if sat > 0.50 and max_v > 90:
                    mask[row_offset + mx] = 1

        visited = bytearray(box_w * box_h)
        for my in range(box_h):
            for mx in range(box_w):
                idx = my * box_w + mx
                if mask[idx] == 1 and visited[idx] == 0:
                    queue = [(mx, my)]
                    visited[idx] = 1
                    pixel_count = 0
                    min_bx, max_bx = mx, mx
                    min_by, max_by = my, my

                    while queue:
                        cx, cy = queue.pop()
                        pixel_count += 1
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
                    if pixel_count > 50:
                        logger.info("Component at x=%d, y=%d: bw=%d, bh=%d, pixels=%d", x1 + min_bx, y1 + min_by, bw, bh, pixel_count)


if __name__ == "__main__":
    list_all_components("c:\\Zahi\\image_pips\\game2.jpg")
