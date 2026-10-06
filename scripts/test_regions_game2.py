"""Test region grouping and constraint association in game2.jpg.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def test_regions_game2(path: str) -> None:
    """Tests region detection on game2.jpg.

    Args:
        path: Path to the image file.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        # 4x4 grid:
        min_x, max_x = 171, 753
        min_y, max_y = 720, 1310
        cell_w = (max_x - min_x) / 4.0
        cell_h = (max_y - min_y) / 4.0

        # Sample color at center of each of the 14 cells
        playable_cells = []
        for r in range(4):
            for c in range(4):
                if r == 0 and c < 2:
                    continue # absent
                cx = int(min_x + (c + 0.5) * cell_w)
                cy = int(min_y + (r + 0.5) * cell_h)
                # Sample 5x5 center
                samples = [rgb.getpixel((cx + dx, cy + dy)) for dx in [-6, 0, 6] for dy in [-6, 0, 6]]
                avg_r = sum(p[0] for p in samples) // len(samples)
                avg_g = sum(p[1] for p in samples) // len(samples)
                avg_b = sum(p[2] for p in samples) // len(samples)
                playable_cells.append({
                    "id": f"r{r}c{c}",
                    "row": r,
                    "col": c,
                    "rgb": (avg_r, avg_g, avg_b),
                    "cx": cx,
                    "cy": cy
                })

        # Cluster connected adjacent cells with color distance < 45
        # Perceptual color distance
        def cdist(c1, c2):
            return ((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2 + (c1[2]-c2[2])**2)**0.5

        visited = set()
        regions = []
        cell_map = {c["id"]: c for c in playable_cells}

        for cell in playable_cells:
            if cell["id"] in visited:
                continue
            cluster = [cell]
            visited.add(cell["id"])
            queue = [cell]

            while queue:
                curr = queue.pop()
                # Neighbors
                neighbors = [
                    f"r{curr['row']-1}c{curr['col']}",
                    f"r{curr['row']+1}c{curr['col']}",
                    f"r{curr['row']}c{curr['col']-1}",
                    f"r{curr['row']}c{curr['col']+1}"
                ]
                for n_id in neighbors:
                    if n_id in cell_map and n_id not in visited:
                        neighbor = cell_map[n_id]
                        if cdist(curr["rgb"], neighbor["rgb"]) < 42:
                            visited.add(n_id)
                            cluster.append(neighbor)
                            queue.append(neighbor)

            regions.append(cluster)

        logger.info("Total regions formed: %d", len(regions))
        for idx, reg in enumerate(regions):
            cell_ids = [c["id"] for c in reg]
            avg_color = [sum(c["rgb"][i] for c in reg)//len(reg) for i in range(3)]
            logger.info("  Region %d: cells=%s, color=%s", idx + 1, cell_ids, avg_color)


if __name__ == "__main__":
    test_regions_game2("c:\\Zahi\\image_pips\\game2.jpg")
