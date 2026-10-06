"""Inspect dominoes and badges in game2.jpg in detail.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def inspect_dominoes(path: str) -> None:
    """Finds exact domino bounding boxes in game2.jpg.

    Args:
        path: Path to the image file.

    Raises:
        FileNotFoundError: If image file does not exist.
    """
    try:
        with Image.open(path) as img:
            rgb = img.convert("RGB")
            width, height = rgb.size

            # In game2.jpg, dominoes are between y=1630 and y=1900
            # Let's inspect horizontal profile in row 1 (y ~ 1640 to 1730)
            # and row 2 (y ~ 1740 to 1830)
            for row_idx, (y_start, y_end) in enumerate([(1630, 1730), (1740, 1840)]):
                col_dark = []
                for x in range(width):
                    count = 0
                    for y in range(y_start, y_end):
                        r, g, b = rgb.getpixel((x, y))
                        if r < 80 and g < 80 and b < 80: # dark pips / border
                            count += 1
                    col_dark.append(count)

                # Find segments where count > 0
                in_dom = False
                sx = 0
                doms = []
                for x, c in enumerate(col_dark):
                    if c > 5:
                        if not in_dom:
                            in_dom = True
                            sx = x
                    else:
                        if in_dom:
                            in_dom = False
                            if x - sx > 80:
                                doms.append((sx, x))
                if in_dom and width - sx > 80:
                    doms.append((sx, width))

                logger.info("Row %d dominoes: %s (count=%d)", row_idx + 1, doms, len(doms))

    except FileNotFoundError as err:
        logger.error("File not found: %s", path)
        raise err


if __name__ == "__main__":
    inspect_dominoes("c:\\Zahi\\image_pips\\game2.jpg")
