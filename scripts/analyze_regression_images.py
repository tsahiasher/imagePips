"""Utility script to analyze regression screenshots and inspect cell counts and geometry.

This script adheres to PEP 484 and Google docstring standards.
"""

import logging
import sys
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def inspect_image(filepath: str) -> Optional[Tuple[int, int]]:
    """Inspects dimensions of an image file.

    Args:
        filepath: Absolute or relative path to the image file.

    Returns:
        A tuple of (width, height) if successful, or None if an error occurred.

    Raises:
        FileNotFoundError: If the image file cannot be located.
    """
    try:
        with Image.open(filepath) as img:
            logger.info("Loaded %s: size=%s, mode=%s", filepath, img.size, img.mode)
            return img.size
    except FileNotFoundError as err:
        logger.error("File not found: %s", filepath)
        raise err
    except Exception as err:
        logger.error("Failed to read image %s: %s", filepath, err)
        return None


if __name__ == "__main__":
    for path in ["game1.jpg", "game2.jpg", "game3.jpg"]:
        inspect_image(path)
