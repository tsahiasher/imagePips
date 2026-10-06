"""Analyze tray and dominoes in game2.jpg.

Adheres strictly to PEP 484 and Google docstring style.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def analyze_tray(path: str) -> None:
    """Analyzes domino tray in game2.jpg.

    Args:
        path: Path to the image file.

    Raises:
        FileNotFoundError: If image file does not exist.
    """
    try:
        with Image.open(path) as img:
            rgb = img.convert("RGB")
            width, height = rgb.size

            # Tray area is y between 1500 and 1950
            row_has_domino = []
            for y in range(1500, 1950):
                dark_count = 0
                for x in range(width):
                    r, g, b = rgb.getpixel((x, y))
                    if 80 < r < 200 and abs(r - g) < 20 and abs(g - b) < 20:
                        dark_count += 1
                row_has_domino.append((y, dark_count))

            peaks = [y for y, count in row_has_domino if count > 200]
            if peaks:
                logger.info("Tray dark density from y=%d to y=%d", peaks[0], peaks[-1])

    except FileNotFoundError as err:
        logger.error("File not found: %s", path)
        raise err


if __name__ == "__main__":
    analyze_tray("c:\\Zahi\\image_pips\\game2.jpg")
