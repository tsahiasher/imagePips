"""Find exact center coordinates of all 8 badges in game2.jpg.

Adheres strictly to PEP 484 and Google docstring standards.
"""

import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def locate_exact_badge_centers(path: str) -> None:
    """Finds exact centers of the 8 badges.

    Args:
        path: Path to the image file.
    """
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        width, height = img.size

        # In board region (y in 700 to 1350, x in 150 to 800)
        # Any pixel with saturation > 0.55 and brightness < 235
        pts = []
        for y in range(710, 1340):
            for x in range(160, 780):
                r, g, b = rgb.getpixel((x, y))
                max_v = max(r, g, b)
                min_v = min(r, g, b)
                sat = (max_v - min_v) / float(max_v) if max_v > 0 else 0
                if sat > 0.55 and max_v > 80:
                    pts.append((x, y))

        logger.info("Total saturated badge pixels found: %d", len(pts))
        # Cluster these points into 8 components
        # Two points belong to same badge if dist < 30
        visited = set()
        clusters = []
        for p in pts:
            if p in visited:
                continue
            cluster = [p]
            visited.add(p)
            queue = [p]
            while queue:
                cx, cy = queue.pop()
                for dx in range(-4, 5):
                    for dy in range(-4, 5):
                        np = (cx + dx, cy + dy)
                        if np in pts and np not in visited:
                            visited.add(np)
                            queue.append(np)
                            cluster.append(np)

            if len(cluster) > 100:
                avg_x = sum(pt[0] for pt in cluster) // len(cluster)
                avg_y = sum(pt[1] for pt in cluster) // len(cluster)
                clusters.append((avg_x, avg_y, len(cluster)))

        clusters.sort(key=lambda c: (c[1] // 60, c[0]))
        logger.info("Found %d badge clusters:", len(clusters))
        for idx, (cx, cy, count) in enumerate(clusters):
            logger.info("  Badge %d: center=(%d, %d), pixels=%d", idx + 1, cx, cy, count)


if __name__ == "__main__":
    locate_exact_badge_centers("c:\\Zahi\\image_pips\\game2.jpg")
