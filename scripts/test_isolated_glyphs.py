"""Isolate text glyphs strictly inside the colored diamond body.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def extract_glyph_inside_diamond(
    img: Image.Image,
    bx: int,
    by: int
) -> Tuple[List[str], int, int]:
    """Isolates white text glyphs strictly enclosed inside the diamond body.

    Args:
        img: RGB image.
        bx: Center X of badge.
        by: Center Y of badge.

    Returns:
        Tuple of (ascii_lines, width, height).
    """
    crop_r = 30
    crop = img.crop((bx - crop_r, by - crop_r, bx + crop_r, by + crop_r))
    cw, ch = crop.size

    # In diamond badges:
    # 1. Badge body is saturated color (max - min > 40)
    # 2. Text is white (r>200, g>200, b>200, max-min < 30)
    # 3. Outer background is white (r>245, g>245, b>245) or pastel cell
    # Find connected component of non-(pure white background)
    # The badge center (bx, by) is (30, 30) in crop.
    # Text is near the center (within distance 16 of center).
    text_pts = []
    for y in range(ch):
        for x in range(cw):
            # Only look within distance 20 of center
            if abs(x - 30) + abs(y - 30) <= 22:
                r, g, b = crop.getpixel((x, y))
                if r > 215 and g > 215 and b > 215 and max(r,g,b) - min(r,g,b) < 30:
                    text_pts.append((x, y))

    if not text_pts:
        return ([], 0, 0)

    min_x = min(p[0] for p in text_pts)
    max_x = max(p[0] for p in text_pts)
    min_y = min(p[1] for p in text_pts)
    max_y = max(p[1] for p in text_pts)

    lines = []
    for y in range(min_y, max_y + 1):
        line = ""
        for x in range(min_x, max_x + 1):
            r, g, b = crop.getpixel((x, y))
            line += "#" if (x, y) in text_pts else "."
        lines.append(line)

    return (lines, max_x - min_x + 1, max_y - min_y + 1)


def test_isolated_glyphs(path: str) -> None:
    """Tests isolated glyphs for all 8 badges.

    Args:
        path: Path to image file.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        vertices = [
            ("Badge 1 (<2)", 753, 868),
            ("Badge 2 (<4)", 753, 1015),
            ("Badge 3 (cyan =)", 462, 1015),
            ("Badge 4 (purple =)", 608, 1015),
            ("Badge 5 (green =)", 608, 1163),
            ("Badge 6 (blue 12)", 317, 1310),
            ("Badge 7 (pink 5)", 608, 1310),
            ("Badge 8 (purple 10)", 753, 1310)
        ]

        for name, bx, by in vertices:
            lines, w, h = extract_glyph_inside_diamond(rgb, bx, by)
            logger.info("=== %s (w=%d, h=%d) ===", name, w, h)
            for line in lines:
                logger.info(line)


if __name__ == "__main__":
    test_isolated_glyphs("c:\\Zahi\\image_pips\\game2.jpg")
