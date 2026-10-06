"""Test unified grid and topology detection across all three regression images.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def test_board_detection_on_image(path: str, expected_cells: int) -> None:
    """Tests board bounding box and candidate grid selection.

    Args:
        path: Path to the image file.
        expected_cells: Expected number of playable cells (2 * dominoes).
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        width, height = img.size

        # Find board area between y=500 and y=1400
        min_x, max_x = width, 0
        min_y, max_y = height, 0
        for y in range(550, 1380):
            for x in range(width):
                r, g, b = rgb.getpixel((x, y))
                # Distinct from pure white background
                if r < 246 or g < 246 or b < 246:
                    min_x = min(min_x, x)
                    max_x = max(max_x, x)
                    min_y = min(min_y, y)
                    max_y = max(max_y, y)

        bw = max_x - min_x + 1
        bh = max_y - min_y + 1
        logger.info("%s: board box x=[%d, %d] w=%d, y=[%d, %d] h=%d", path, min_x, max_x, bw, min_y, max_y, bh)

        # Test candidate grid divisions (c in 3..10, r in 3..8)
        best_diff = 999
        best_grid = None
        best_topology = []

        for c in range(3, 11):
            cell_w = bw / float(c)
            if cell_w < 60 or cell_w > 200:
                continue
            for r in range(3, 9):
                cell_h = bh / float(r)
                if abs(cell_w - cell_h) / cell_w > 0.18:
                    continue # Not square

                # Count playable cells
                topology = []
                playable_count = 0
                for row_idx in range(r):
                    row_str = ""
                    for col_idx in range(c):
                        cx = int(min_x + (col_idx + 0.5) * cell_w)
                        cy = int(min_y + (row_idx + 0.5) * cell_h)
                        # Sample 3x3 at center
                        samples = [rgb.getpixel((cx + dx, cy + dy)) for dx in [-5, 0, 5] for dy in [-5, 0, 5]]
                        avg_r = sum(p[0] for p in samples) / 9.0
                        avg_g = sum(p[1] for p in samples) / 9.0
                        avg_b = sum(p[2] for p in samples) / 9.0

                        # Cell is playable if not pure white
                        # Pure white background: avg_r > 248, avg_g > 248, avg_b > 248
                        is_white = (avg_r > 246 and avg_g > 246 and avg_b > 246)
                        if not is_white:
                            playable_count += 1
                            row_str += "#"
                        else:
                            row_str += "."
                    topology.append(row_str)

                diff = abs(playable_count - expected_cells)
                if diff < best_diff:
                    best_diff = diff
                    best_grid = (r, c, cell_w, cell_h, playable_count)
                    best_topology = topology

        logger.info(
            "%s: Selected grid %dx%d (cell size %.1f x %.1f), playable=%d (expected %d, diff=%d)",
            path, best_grid[0], best_grid[1], best_grid[2], best_grid[3], best_grid[4], expected_cells, best_diff
        )
        for row_str in best_topology:
            logger.info("  %s", row_str)


if __name__ == "__main__":
    logger.info("=== TESTING GAME 2 ===")
    test_board_detection_on_image("c:\\Zahi\\image_pips\\game2.jpg", 14)
    logger.info("=== TESTING GAME 3 ===")
    test_board_detection_on_image("c:\\Zahi\\image_pips\\game3.jpg", 10)
    logger.info("=== TESTING GAME 1 ===")
    test_board_detection_on_image("c:\\Zahi\\image_pips\\game1.jpg", 26)
