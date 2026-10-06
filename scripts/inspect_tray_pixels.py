"""Inspect pixel values in tray area of game2.jpg.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def inspect_tray_pixels(path: str) -> None:
    """Samples pixel RGB values in the tray.

    Args:
        path: Path to the image file.

    Raises:
        FileNotFoundError: If image file does not exist.
    """
    try:
        with Image.open(path) as img:
            rgb = img.convert("RGB")
            # Look at a central vertical line x=461
            x = 461
            for y in range(1600, 1950, 10):
                logger.info("x=%d, y=%d: RGB=%s", x, y, rgb.getpixel((x, y)))

    except FileNotFoundError as err:
        logger.error("File not found: %s", path)
        raise err


if __name__ == "__main__":
    inspect_tray_pixels("c:\\Zahi\\image_pips\\game2.jpg")
