"""Test glyph feature extraction on the 8 badges of game2.jpg.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def extract_badge_glyph(
    img: Image.Image,
    bx: int,
    by: int
) -> Tuple[List[str], int, int]:
    """Extracts binary white glyph mask and bounding box from badge.

    Args:
        img: RGB image.
        bx: Center X of badge.
        by: Center Y of badge.

    Returns:
        Tuple of (ascii_art_lines, glyph_width, glyph_height).
    """
    # Sample window
    r_window = 32
    white_pts = []
    for y in range(by - r_window, by + r_window):
        for x in range(bx - r_window, bx + r_window):
            r, g, b = img.getpixel((x, y))
            # In diamond badges, text is bright white (r, g, b > 220)
            if r > 220 and g > 220 and b > 220:
                white_pts.append((x, y))

    if not white_pts:
        return ([], 0, 0)

    min_x = min(p[0] for p in white_pts)
    max_x = max(p[0] for p in white_pts)
    min_y = min(p[1] for p in white_pts)
    max_y = max(p[1] for p in white_pts)

    gw = max_x - min_x + 1
    gh = max_y - min_y + 1

    lines = []
    for y in range(min_y, max_y + 1):
        line = ""
        for x in range(min_x, max_x + 1):
            r, g, b = img.getpixel((x, y))
            line += "#" if (r > 220 and g > 220 and b > 220) else "."
        lines.append(line)

    return (lines, gw, gh)


def test_badges(path: str) -> None:
    """Tests badge extraction on game2.jpg.

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
            lines, w, h = extract_badge_glyph(rgb, bx, by)
            logger.info("=== %s (w=%d, h=%d) ===", name, w, h)
            for line in lines[::2]: # print every 2nd line
                logger.info(line)


if __name__ == "__main__":
    test_badges("c:\\Zahi\\image_pips\\game2.jpg")
