"""Inspect diamond badges in game2.jpg.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def find_diamond_badges(path: str) -> None:
    """Finds diamond badge locations and colors in game2.jpg.

    Args:
        path: Path to the image file.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        width, height = img.size

        # In board area (y between 700 and 1350)
        # Badges are saturated diamonds with bright white text in the center
        # A pixel is in a badge if saturation > 0.45 and brightness > 70
        # and has adjacent white pixels (r, g, b > 230)
        # Let's inspect known badge regions or find connected components of high-saturation diamonds
        for y in range(720, 1310, 5):
            for x in range(170, 760, 5):
                r, g, b = rgb.getpixel((x, y))
                max_v = max(r, g, b)
                min_v = min(r, g, b)
                sat = (max_v - min_v) / float(max_v) if max_v > 0 else 0
                # Check for vivid badge colors (magenta, cyan, orange, green, blue, purple)
                if sat > 0.65 and max_v > 130:
                    # check if there's white text nearby
                    has_white = any(
                        sum(rgb.getpixel((x+dx, y+dy))) > 700
                        for dx in range(-15, 16, 5)
                        for dy in range(-15, 16, 5)
                        if 0 <= x+dx < width and 0 <= y+dy < height
                    )
                    if has_white:
                        pass # candidate point


if __name__ == "__main__":
    find_diamond_badges("c:\\Zahi\\image_pips\\game2.jpg")
