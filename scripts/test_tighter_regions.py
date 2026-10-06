"""Test tighter color distance and dashed boundary separation.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def test_tighter_regions(path: str) -> None:
    """Tests region separation with threshold 28.

    Args:
        path: Path to the image file.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        min_x, max_x = 171, 753
        min_y, max_y = 720, 1310
        cell_w = (max_x - min_x) / 4.0
        cell_h = (max_y - min_y) / 4.0

        playable_cells = []
        for r in range(4):
            for c in range(4):
                if r == 0 and c < 2:
                    continue
                cx = int(min_x + (c + 0.5) * cell_w)
                cy = int(min_y + (r + 0.5) * cell_h)
                samples = [rgb.getpixel((cx + dx, cy + dy)) for dx in [-4, 0, 4] for dy in [-4, 0, 4]]
                avg_r = sum(p[0] for p in samples) // len(samples)
                avg_g = sum(p[1] for p in samples) // len(samples)
                avg_b = sum(p[2] for p in samples) // len(samples)
                playable_cells.append({
                    "id": f"r{r}c{c}",
                    "row": r,
                    "col": c,
                    "rgb": (avg_r, avg_g, avg_b)
                })

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
                neighbors = [
                    f"r{curr['row']-1}c{curr['col']}",
                    f"r{curr['row']+1}c{curr['col']}",
                    f"r{curr['row']}c{curr['col']-1}",
                    f"r{curr['row']}c{curr['col']+1}"
                ]
                for n_id in neighbors:
                    if n_id in cell_map and n_id not in visited:
                        neighbor = cell_map[n_id]
                        # Check border between curr and neighbor:
                        # In Pips, there is a dashed colored line between different regions!
                        if cdist(curr["rgb"], neighbor["rgb"]) < 26:
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
    test_tighter_regions("c:\\Zahi\\image_pips\\game2.jpg")
