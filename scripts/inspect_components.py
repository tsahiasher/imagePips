"""Inspect component sizes in sat_only_mask.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def inspect_components(path: str) -> None:
    """Logs component sizes and dimensions.

    Args:
        path: Path to the image file.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        # Sample around Badge 1 at (770, 868)
        cx, cy = 770, 868
        logger.info("Badge 1 area sample:")
        for y in range(cy - 20, cy + 20, 5):
            row_sats = []
            for x in range(cx - 20, cx + 20, 5):
                r, g, b = rgb.getpixel((x, y))
                max_v = max(r, g, b)
                min_v = min(r, g, b)
                sat = (max_v - min_v) / float(max_v) if max_v > 0 else 0
                row_sats.append(f"{sat:.2f}")
            logger.info("y=%d: %s", y, " ".join(row_sats))


if __name__ == "__main__":
    inspect_components("c:\\Zahi\\image_pips\\game2.jpg")
