import fs from 'node:fs';
import path from 'node:path';
import jpeg from 'jpeg-js';
import { serializePuzzle } from '../src/domain/puzzle';
import { recognize } from '../src/vision/recognize';

async function saveAllGoldens(): Promise<void> {
  const games = [
    'game1.jpg', 'game2.jpg', 'game3.jpg', 'game4.jpg',
    'game5.jpg', 'game6.jpg', 'game7.jpg', 'game8.jpg',
    'game9.jpg', 'game10.jpg', 'game11.jpg', 'game12.jpg', 'game13.jpg', 'game14.jpg'
  ];

  const outDir = path.resolve(process.cwd(), 'golden_results');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const g of games) {
    const baseName = path.basename(g, path.extname(g));
    const imagePath = path.resolve(process.cwd(), 'samples', g);

    const raw = jpeg.decode(fs.readFileSync(imagePath), { useTArray: true, formatAsRGBA: true });
    const { puzzle, warnings } = await recognize({ width: raw.width, height: raw.height, data: raw.data });
    const goldenData = serializePuzzle(puzzle);

    const targetJsonPath = path.join(outDir, `${baseName}.json`);
    fs.writeFileSync(targetJsonPath, JSON.stringify(goldenData, null, 2) + '\n', 'utf-8');
    console.log(
      `Saved golden: ${baseName}.json (${goldenData.cells.length} cells, ${goldenData.regions.length} regions, ${goldenData.dominoes.length} dominoes, warnings=${warnings.length})`
    );
  }
}

saveAllGoldens().catch(console.error);
