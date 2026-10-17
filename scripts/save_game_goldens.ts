import fs from 'fs';
import path from 'path';
import { serializePuzzle } from '../src/domain/puzzle';
import { importPuzzleFromImage } from '../src/importer/importPuzzle';

async function saveAllGoldens() {
  const games = [
    'game1.jpg', 'game2.jpg', 'game3.jpg', 'game4.jpg',
    'game5.jpg', 'game6.jpg', 'game7.jpg', 'game8.jpg',
    'game9.jpg', 'game10.jpg', 'game11.jpg', 'game12.jpg'
  ];

  const outDir = path.resolve(process.cwd(), 'golden_results');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const g of games) {
    const baseName = path.basename(g, path.extname(g));
    const imagePath = path.resolve(process.cwd(), g);

    console.log(`Processing ${g}...`);
    const { puzzle, debugData } = await importPuzzleFromImage(imagePath);

    const goldenData = serializePuzzle(puzzle);

    const targetJsonPath = path.join(outDir, `${baseName}.json`);
    fs.writeFileSync(targetJsonPath, JSON.stringify(goldenData, null, 2), 'utf-8');
    console.log(
      `Saved golden: ${targetJsonPath} (valid=${debugData.validation.valid}, ${goldenData.cells.length} cells, ${goldenData.regions.length} regions, ${goldenData.dominoes.length} dominoes)`
    );
  }
}

saveAllGoldens().catch(console.error);

