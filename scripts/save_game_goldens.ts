import fs from 'fs';
import path from 'path';
import { importPuzzleFromImage } from '../src/importer/importPuzzle';

async function saveAllGoldens() {
  const games = [
    'game1.jpg', 'game2.jpg', 'game3.jpg', 'game4.jpg',
    'game5.jpg', 'game6.jpg', 'game7.jpg', 'game8.jpg',
    'game9.jpg', 'game10.jpg', 'game11.jpg'
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

    const goldenData = {
      game: g,
      validation: {
        valid: debugData.validation.valid,
        errors: debugData.validation.errors,
        warnings: debugData.validation.warnings,
      },
      counts: {
        cells: puzzle.cells.length,
        dominoes: puzzle.dominoes.length,
        regions: puzzle.regions.length,
        badges: debugData.detectedBadges.length,
      },
      badges: debugData.detectedBadges.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        colorHex: b.colorHex,
        recognizedToken: b.recognizedToken,
        parsedConstraint: b.parsedConstraint,
      })),
      regions: puzzle.regions.map((r) => ({
        id: r.id,
        color: r.color,
        cellCount: r.cellIds.length,
        cellIds: r.cellIds,
        constraint: r.constraint,
      })),
      dominoes: puzzle.dominoes.map((d) => ({
        id: d.id,
        a: d.a,
        b: d.b,
        values: [d.a, d.b],
      })),
      cells: puzzle.cells.map((c) => ({
        id: c.id,
        row: c.row,
        col: c.col,
        componentId: c.componentId,
      })),
    };

    const targetJsonPath = path.join(outDir, `${baseName}.json`);
    fs.writeFileSync(targetJsonPath, JSON.stringify(goldenData, null, 2), 'utf-8');
    console.log(`Saved golden: ${targetJsonPath} (valid=${goldenData.validation.valid}, ${goldenData.counts.badges} badges)`);
  }
}

saveAllGoldens().catch(console.error);

