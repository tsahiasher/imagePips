"""Count pips in each domino half of game2.jpg.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def count_pips_in_half(rgb: Image.Image, x1: int, y1: int, x2: int, y2: int) -> int:
    """Counts circular dark blobs in a domino half.

    Args:
        rgb: PIL Image object.
        x1: Left bound of half.
        y1: Top bound of half.
        x2: Right bound of half.
        y2: Bottom bound of half.

    Returns:
        Number of detected pips.
    """
    # Inset by 12% to avoid border and divider line
    w = x2 - x1
    h = y2 - y1
    inset_x = int(w * 0.12)
    inset_y = int(h * 0.12)

    # Dark pixels (pips) have r,g,b < 100
    sub_w = w - 2 * inset_x
    sub_h = h - 2 * inset_y
    mask = []
    for y in range(y1 + inset_y, y2 - inset_y):
        row = []
        for x in range(x1 + inset_x, x2 - inset_x):
            r, g, b = rgb.getpixel((x, y))
            row.append(1 if (r < 110 and g < 110 and b < 110) else 0)
        mask.append(row)

    # Connected components
    visited = [[False]*sub_w for _ in range(sub_h)]
    blobs = []
    for my in range(sub_h):
        for mx in range(sub_w):
            if mask[my][mx] == 1 and not visited[my][mx]:
                queue = [(mx, my)]
                visited[my][mx] = True
                pixel_count = 0
                bx1, bx2 = mx, mx
                by1, by2 = my, my

                while queue:
                    cx, cy = queue.pop()
                    pixel_count += 1
                    bx1 = min(bx1, cx)
                    bx2 = max(bx2, cx)
                    by1 = min(by1, cy)
                    by2 = max(by2, cy)

                    for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                        if 0 <= nx < sub_w and 0 <= ny < sub_h:
                            if mask[ny][nx] == 1 and not visited[ny][nx]:
                                visited[ny][nx] = True
                                queue.append((nx, ny))

                bw = bx2 - bx1 + 1
                bh = by2 - by1 + 1
                aspect = bw / float(bh) if bh > 0 else 0
                # A pip blob in game2 has area ~ 50-350 pixels and aspect 0.6 - 1.6
                if 25 <= pixel_count <= 450 and 0.5 <= aspect <= 2.0:
                    blobs.append((bx1, by1, bw, bh, pixel_count))

    return len(blobs)


def inspect_all_domino_pips(path: str) -> None:
    """Inspects all domino pips in game2.jpg.

    Args:
        path: Path to the image file.
    """
    domino_boxes = [
        (48, 1658, 192, 102),
        (258, 1659, 193, 101),
        (470, 1658, 194, 102),
        (681, 1658, 191, 102),
        (154, 1773, 192, 102),
        (366, 1773, 191, 102),
        (576, 1773, 192, 102)
    ]

    with Image.open(path) as img:
        rgb = img.convert("RGB")
        for idx, (x, y, w, h) in enumerate(domino_boxes):
            half_w = w // 2
            a = count_pips_in_half(rgb, x, y, x + half_w, y + h)
            b = count_pips_in_half(rgb, x + half_w, y, x + w, y + h)
            logger.info("Domino %d: [%d | %d]", idx + 1, a, b)


if __name__ == "__main__":
    inspect_all_domino_pips("c:\\Zahi\\image_pips\\game2.jpg")
