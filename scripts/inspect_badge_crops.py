"""Inspect the 8 badge crops in game2.jpg.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def inspect_badge_locations(path: str) -> None:
    """Crops and inspects the 8 known badge positions in game2.jpg.

    Args:
        path: Path to the image file.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")

        # Let's check candidate vertex locations around board
        vertices = [
            ("Badge 1 (<2)", 753, 868),
            ("Badge 2 (<4)", 753, 1015),
            ("Badge 3 (cyan =)", 462, 1015),
            ("Badge 4 (purple =)", 608, 1015),
            ("Badge 5 (green =)", 608, 1163),
            ("Badge 6 (blue 12)", 317, 1310),
            ("Badge 7 (pink 5)", 608, 1310),
            ("Badge 8 (purple 10)", 753, 1310)
        ]

        for name, bx, by in vertices:
            # Sample around (bx, by)
            # Find white pixels (r>230, g>230, b>230) representing the glyph
            white_pixels = []
            for y in range(by - 30, by + 30):
                for x in range(bx - 30, bx + 30):
                    r, g, b = rgb.getpixel((x, y))
                    if r > 230 and g > 230 and b > 230:
                        white_pixels.append((x, y))

            if white_pixels:
                min_x = min(p[0] for p in white_pixels)
                max_x = max(p[0] for p in white_pixels)
                min_y = min(p[1] for p in white_pixels)
                max_y = max(p[1] for p in white_pixels)
                gw = max_x - min_x + 1
                gh = max_y - min_y + 1
                logger.info(
                    "%s: glyph at x=[%d, %d] y=[%d, %d] w=%d, h=%d, count=%d",
                    name, min_x, max_x, min_y, max_y, gw, gh, len(white_pixels)
                )


if __name__ == "__main__":
    inspect_badge_locations("c:\\Zahi\image_pips\\game2.jpg")
