"""Inspects screenshot bounding boxes and color profiles.

Adheres strictly to PEP 484 and Google docstring style.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def find_white_background_bounds(
    image_path: str,
    y_start: int,
    y_end: int
) -> Optional[Tuple[int, int, int, int]]:
    """Locates non-white bounding box within vertical range.

    Args:
        image_path: Path to the image file.
        y_start: Top vertical coordinate to search.
        y_end: Bottom vertical coordinate to search.

    Returns:
        Bounding box tuple (min_x, min_y, max_x, max_y) or None.

    Raises:
        FileNotFoundError: If image does not exist.
    """
    try:
        with Image.open(image_path) as img:
            rgb_img = img.convert("RGB")
            width, height = rgb_img.size
            min_x, max_x = width, 0
            min_y, max_y = height, 0

            for y in range(y_start, min(y_end, height)):
                for x in range(width):
                    r, g, b = rgb_img.getpixel((x, y))
                    # Background is nearly pure white (255, 255, 255)
                    if not (r > 248 and g > 248 and b > 248):
                        if x < min_x:
                            min_x = x
                        if x > max_x:
                            max_x = x
                        if y < min_y:
                            min_y = y
                        if y > max_y:
                            max_y = y

            if min_x <= max_x and min_y <= max_y:
                logger.info(
                    "Found non-white bounding box in %s between y=[%d, %d]: (%d, %d, %d, %d) w=%d, h=%d",
                    image_path, y_start, y_end, min_x, min_y, max_x, max_y, max_x - min_x, max_y - min_y
                )
                return (min_x, min_y, max_x, max_y)
            return None
    except FileNotFoundError as err:
        logger.error("File not found: %s", image_path)
        raise err


if __name__ == "__main__":
    for path in ["game1.jpg", "game2.jpg", "game3.jpg"]:
        logger.info("=== %s ===", path)
        # Search board area between y=500 and y=1400
        find_white_background_bounds(path, 500, 1400)
        # Search tray area between y=1400 and y=2000
        find_white_background_bounds(path, 1400, 2000)
