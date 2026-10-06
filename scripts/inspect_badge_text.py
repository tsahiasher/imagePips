"""Inspect badge interior text in game2.jpg.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def inspect_badge_text(path: str) -> None:
    """Extracts text inside each diamond badge.

    Args:
        path: Path to the image file.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        # Exact centers of the 8 badges in game2.jpg:
        badges = [
            ("Badge 1 (<2)", 753, 420 + 448),    # ~ 868
            ("Badge 2 (<4)", 753, 420 + 595),    # ~ 1015
            ("Badge 3 (cyan =)", 462, 420 + 595), # ~ 1015
            ("Badge 4 (purple =)", 608, 420 + 595),# ~ 1015
            ("Badge 5 (green =)", 608, 420 + 743), # ~ 1163
            ("Badge 6 (blue 12)", 317, 420 + 890), # ~ 1310
            ("Badge 7 (pink 5)", 608, 420 + 890),  # ~ 1310
            ("Badge 8 (purple 10)", 753, 420 + 890)# ~ 1310
        ]

        # Let's save a composite debug image of all 8 badge crops to scratch/
        # so we can view them!
        comp = Image.new("RGB", (80 * 8, 80), (255, 255, 255))
        for idx, (name, bx, by) in enumerate(badges):
            crop = rgb.crop((bx - 40, by - 40, bx + 40, by + 40))
            comp.paste(crop, (idx * 80, 0))
            logger.info("Badge %d at (%d, %d)", idx + 1, bx, by)

        comp.save("c:\\Zahi\\image_pips\\scripts\\badges_game2.png")
        logger.info("Saved badges_game2.png")


if __name__ == "__main__":
    inspect_badge_text("c:\\Zahi\\image_pips\\game2.jpg")
