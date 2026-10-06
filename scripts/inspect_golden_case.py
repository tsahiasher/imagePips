"""Detailed pixel analysis of game2.jpg golden regression screenshot.

Adheres strictly to PEP 484 and Google docstring style.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def analyze_golden_image(path: str) -> None:
    """Analyzes game2.jpg board and tray dimensions and colors.

    Args:
        path: Path to the image file.

    Raises:
        FileNotFoundError: If the image file cannot be found.
    """
    try:
        with Image.open(path) as img:
            rgb = img.convert("RGB")
            width, height = rgb.size
            logger.info("Image size: %d x %d", width, height)

            # Look at board area y between 650 and 1350
            # Find board boundary
            min_x, max_x = width, 0
            min_y, max_y = height, 0
            for y in range(650, 1350):
                for x in range(width):
                    r, g, b = rgb.getpixel((x, y))
                    # Background in game2 is white (255, 255, 255)
                    if r < 245 or g < 245 or b < 245:
                        min_x = min(min_x, x)
                        max_x = max(max_x, x)
                        min_y = min(min_y, y)
                        max_y = max(max_y, y)

            board_w = max_x - min_x
            board_h = max_y - min_y
            logger.info(
                "Board bounds: x=[%d, %d] (w=%d), y=[%d, %d] (h=%d)",
                min_x, max_x, board_w, min_y, max_y, board_h
            )

            # If board is 4x4 cells:
            cell_size_w = board_w / 4.0
            cell_size_h = board_h / 4.0
            logger.info("Implied 4x4 cell size: %.1f x %.1f", cell_size_w, cell_size_h)

            # Let's inspect each of the 4x4 cells
            for r in range(4):
                for c in range(4):
                    cx = int(min_x + (c + 0.5) * cell_size_w)
                    cy = int(min_y + (r + 0.5) * cell_size_h)
                    pix = rgb.getpixel((cx, cy))
                    logger.info("Grid cell r%d c%d at (%d, %d): RGB=%s", r, c, cx, cy, pix)

    except FileNotFoundError as err:
        logger.error("File not found: %s", path)
        raise err


if __name__ == "__main__":
    analyze_golden_image("game2.jpg")
