"""Test clear color separation between badges, cells, and whitespace in game2.jpg.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def find_all_badges_by_saturation(path: str) -> None:
    """Finds diamond badges via saturation thresholding and connected components.

    Args:
        path: Path to the image file.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        width, height = img.size

        # In board region y in [650, 1350], x in [100, 850]
        # Badge pixels have sat > 0.60 and max > 100
        # White text inside badge has r,g,b > 230
        badge_mask = []
        y_min, y_max = 680, 1360
        x_min, x_max = 120, 820
        h_box = y_max - y_min
        w_box = x_max - x_min

        for y in range(y_min, y_max):
            row = []
            for x in range(x_min, x_max):
                r, g, b = rgb.getpixel((x, y))
                max_v = max(r, g, b)
                min_v = min(r, g, b)
                sat = (max_v - min_v) / float(max_v) if max_v > 0 else 0
                # Badge pixel: either highly saturated body OR white text within saturated body
                is_badge = (sat > 0.58 and max_v > 90) or (r > 240 and g > 240 and b > 240)
                # But pure white background outside board has r,g,b > 248 and sat < 0.02
                if r > 245 and g > 245 and b > 245 and sat < 0.03:
                    is_badge = False
                row.append(1 if is_badge else 0)
            badge_mask.append(row)

        # Flood fill connected components of sat > 0.58
        sat_only_mask = []
        for y in range(y_min, y_max):
            row = []
            for x in range(x_min, x_max):
                r, g, b = rgb.getpixel((x, y))
                max_v = max(r, g, b)
                min_v = min(r, g, b)
                sat = (max_v - min_v) / float(max_v) if max_v > 0 else 0
                row.append(1 if (sat > 0.58 and max_v > 90) else 0)
            sat_only_mask.append(row)

        visited = [[False]*w_box for _ in range(h_box)]
        badges = []

        for my in range(h_box):
            for mx in range(w_box):
                if sat_only_mask[my][mx] == 1 and not visited[my][mx]:
                    queue = [(mx, my)]
                    visited[my][mx] = True
                    bx1, bx2 = mx, mx
                    by1, by2 = my, my
                    pixel_count = 0
                    sum_x = 0
                    sum_y = 0

                    while queue:
                        cx, cy = queue.pop()
                        pixel_count += 1
                        sum_x += cx
                        sum_y += cy
                        bx1 = min(bx1, cx)
                        bx2 = max(bx2, cx)
                        by1 = min(by1, cy)
                        by2 = max(by2, cy)

                        for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                            if 0 <= nx < w_box and 0 <= ny < h_box:
                                if sat_only_mask[ny][nx] == 1 and not visited[ny][nx]:
                                    visited[ny][nx] = True
                                    queue.append((nx, ny))

                    bw = bx2 - bx1 + 1
                    bh = by2 - by1 + 1
                    # A diamond badge has area ~ 1000 - 4500 and width/height ~ 40-75
                    if 400 <= pixel_count <= 6000 and 30 <= bw <= 90 and 30 <= bh <= 90:
                        center_x = x_min + sum_x // pixel_count
                        center_y = y_min + sum_y // pixel_count
                        badges.append((center_x, center_y, bw, bh, pixel_count))

        # Sort badges by y then x
        badges.sort(key=lambda b: (b[1] // 60, b[0]))
        logger.info("Found %d diamond badges:", len(badges))
        for idx, (cx, cy, bw, bh, count) in enumerate(badges):
            logger.info("  Badge %d: center=(%d, %d), size=%dx%d, pixels=%d", idx + 1, cx, cy, bw, bh, count)


if __name__ == "__main__":
    find_all_badges_by_saturation("c:\\Zahi\\image_pips\\game2.jpg")
