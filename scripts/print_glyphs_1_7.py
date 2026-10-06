"""Print exact glyph mask for Badge 1 and Badge 7.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def print_glyph(crop: Image.Image) -> None:
    """Prints ascii art of white glyph in crop.

    Args:
        crop: PIL Image.
    """
    cw, ch = crop.size
    cx, cy = cw // 2, ch // 2
    pts = []
    for y in range(ch):
        for x in range(cw):
            if abs(x - cx) <= 24 and abs(y - cy) <= 24:
                r, g, b = crop.getpixel((x, y))
                if r > 210 and g > 210 and b > 210 and (max(r,g,b) - min(r,g,b) < 30):
                    pts.append((x, y))

    if not pts:
        logger.info("No points found!")
        return

    min_x = min(p[0] for p in pts)
    max_x = max(p[0] for p in pts)
    min_y = min(p[1] for p in pts)
    max_y = max(p[1] for p in pts)

    for y in range(min_y, max_y + 1):
        line = "".join("#" if (x, y) in pts else "." for x in range(min_x, max_x + 1))
        logger.info(line)


if __name__ == "__main__":
    with Image.open("c:\\Zahi\\image_pips\\game2.jpg") as img:
        rgb = img.convert("RGB")
        logger.info("=== BADGE 1 (<2) ===")
        print_glyph(rgb.crop((700 - 35, 861 - 35, 700 + 35, 861 + 35)))
        logger.info("=== BADGE 7 (5) ===")
        print_glyph(rgb.crop((570 - 35, 1254 - 35, 570 + 35, 1254 + 35)))
