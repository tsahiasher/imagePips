"""Find exact vertical coordinates of dominoes in game2.jpg.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def find_tray_range(path: str) -> None:
    """Finds exact y bounds of dominoes in tray.

    Args:
        path: Path to the image file.

    Raises:
        FileNotFoundError: If image file does not exist.
    """
    try:
        with Image.open(path) as img:
            rgb = img.convert("RGB")
            width, height = rgb.size

            # Scan rows y from 1400 to 2000
            for y in range(1400, 2000, 10):
                # Count black pips (r < 70, g < 70, b < 70)
                pip_pix = sum(1 for x in range(width) if sum(rgb.getpixel((x, y))) < 180)
                if pip_pix > 20:
                    logger.info("y=%d has %d pip-like pixels", y, pip_pix)

    except FileNotFoundError as err:
        logger.error("File not found: %s", path)
        raise err


if __name__ == "__main__":
    find_tray_range("c:\\Zahi\\image_pips\\game2.jpg")
