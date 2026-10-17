# Progress Log

**2026-10-17 — Mobile tray compaction and puzzle board real-estate expansion. ✅ DONE**
- Freed vertical and horizontal viewport real estate on mobile screens so the puzzle board and condition badges render larger without shrinking tray domino tile sizes (`trayCellSize` preserved at `34 / 38 / 42`):
  1. **Tray Bottom Padding & Condensed Domino Lines (`DominoTray.tsx`)**:
     - Reduced excessive bottom padding from `max(84px, calc(env(safe-area-inset-bottom, 0px) + 76px))` to `max(8px, calc(env(safe-area-inset-bottom, 0px) + 6px))` and top/side padding to `6px`.
     - Condensed vertical `rowGap` from `14px`–`16px` down to `5px`–`6px` and `colGap` to `6px` while keeping `trayCellSize = isLarge ? 34 : isMedium ? 38 : 42`.
  2. **Board Area & Condition Readability (`PlayScreen.tsx`, `PuzzleBoard.tsx`, `ConditionBadge.tsx`)**:
     - Reduced `PlayScreen.tsx` `<main>` padding from `6px 12px` to `2px 4px`.
     - Reduced `PuzzleBoard.tsx` outer SVG viewBox margin from `cellSize * 0.45` to `cellSize * 0.30`.
     - Increased condition badge text font-size ratios in `ConditionBadge.tsx` (`0.38 / 0.44 / 0.50 * size`) for clearer readability on mobile screens.
- Files touched:
  - `src/components/DominoTray/DominoTray.tsx`
  - `src/components/PlayScreen/PlayScreen.tsx`
  - `src/components/PuzzleBoard/PuzzleBoard.tsx`
  - `src/components/ConditionBadge/ConditionBadge.tsx`
  - `docs/DECISIONS.md`
  - `docs/PROGRESS.md`
- Proof:
  - Production build passing (`npm run build`).
  - All 20 test suites (76 tests) passing.

**2026-10-17 — NYT Pips UI polish (7 visual enhancements), `pips-build-puzzle` v1 JSON serialization, and symmetry-breaking solution counting. ✅ DONE**
- Implemented 7 NYT Pips UI improvements, refactored puzzle JSON serialization to `pips-build-puzzle` v1, and added exact solution counting without equivalent in-region flips:
  1. **NYT Pips UI Enhancements (1–7)**:
     - `PuzzleBoard.tsx`: Added contiguous recessed board backing tray (`#e6d5cb` per connected component via dilated SVG mask) and dynamic region badge anchor fallback (bottom-right-most cell).
     - `PuzzleCell.tsx`: Softened cell corner radius (`rx=9`, `inset=2.5`) and added inner recessed top-shadow bevel (`rgba(0,0,0,0.06)`).
     - `Domino.tsx`: Separated placed domino face translucency (`fillOpacity=0.62` on white body rect) from pips/divider/border (`opacity=1` so pips stay solid crisp black), and added 3D bottom-edge chamfer lip (`#cbd5e1`) and inner top highlight to unplaced tray/drag dominoes.
     - `RegionBoundary.tsx`: Replaced thin single-stroke boundary with dual-layer inset dashed stitching (`#ffffff` halo + `#332b28` dark cocoa dashed overlay, `strokeDasharray="6, 5"`).
     - `ConditionBadge.tsx`: Upgraded diamond condition badges to rounded-corner diamonds (`rx=4.5`), subtle elevation shadow, and tighter multi-character tracking (`-0.04em`).
     - `DominoTray.tsx`: Increased vertical row gap (`rowGap: '18px'`, `columnGap: '14px'`) so rotated vertical dominoes in the tray never crowd adjacent rows.
  2. **`pips-build-puzzle` v1 Serialization & Golden Regeneration**:
     - Created `src/domain/puzzleSerialization.ts` (`serializePuzzle`, `deserializePuzzle`, `hexToColorIndex`, `colorIndexToHex`) and re-exported in `src/domain/puzzle.ts`.
     - Updated `src/domain/constraints.ts` to accept `"!="` as an alias for `"≠"` on import.
     - Updated `VerificationScreen.tsx`, `ManualEditor.tsx`, `ImportScreen.tsx`, `RegionListEditor.tsx`, and `storage.ts` to export/import `pips-build-puzzle` v1 (with backward-compatible fallback for legacy JSONs) and navigates JSON imports to the Verification screen so the solvability badge and solution count are visible immediately.
     - Regenerated `golden_results/game1.json` through `golden_results/game12.json` in `pips-build-puzzle` v1 format via `scripts/save_game_goldens.ts`.
  3. **Solution Counting & In-Region Symmetry Breaking**:
     - Updated `solvePuzzle` (`src/game/solver.ts`) and `SolvabilityBadge.tsx` to count up to `100` solutions (`1 solution`, `N solutions`, or `100+ solutions`).
     - Eliminated equivalent domino flip permutations when both cells of a placed domino belong to the same region (or are both unconstrained), and enforced canonical domino group ordering (`minGroupIdx`) when multiple dominoes sit completely inside the same region.
- Files touched:
  - `src/domain/puzzleSerialization.ts` (new: `pips-build-puzzle` v1 serializer/deserializer)
  - `src/domain/__tests__/puzzleSerialization.test.ts` (new: unit tests for `pips-build-puzzle` v1 round-trip and legacy fallback)
  - `src/domain/puzzle.ts` (re-export serialization helpers, optional `labelAnchor`)
  - `src/domain/constraints.ts` (accept `"!="` as alias for `"≠"`)
  - `src/game/solver.ts` (count solutions up to `maxSolutions` with in-region domino flip & permutation symmetry breaking)
  - `src/game/__tests__/solver.test.ts` (deserialize `pips-build-puzzle` v1 goldens + test in-region flip symmetry breaking)
  - `src/game/__tests__/rotationAnchor.test.ts` (update placed domino SVG attribute assertions for `fill-opacity="0.62"` and `stroke-width="1.1"`)
  - `src/components/EditorShared/SolvabilityBadge.tsx` (display exact solution count in solvability badge)
  - `src/components/EditorShared/RegionListEditor.tsx` (align editor color palette with the 6 canonical Pips palette colors)
  - `src/components/ImportScreen/ImportScreen.tsx` (deserialize imported JSON via `deserializePuzzle` and route to Verification screen)
  - `src/components/ManualEditor/ManualEditor.tsx` (export/import using `serializePuzzle`/`deserializePuzzle`)
  - `src/components/VerificationScreen/VerificationScreen.tsx` (export JSON using `serializePuzzle`)
  - `src/persistence/storage.ts` (persist/load active puzzle via `serializePuzzle`/`deserializePuzzle`)
  - `src/components/PuzzleBoard/PuzzleBoard.tsx` (recessed board backing tray + dynamic bottom-right badge anchor fallback)
  - `src/components/PuzzleCell/PuzzleCell.tsx` (softer corner radius `rx=9` + inner recessed bevel)
  - `src/components/Domino/Domino.tsx` (translucent placed face with opaque pips + 3D tile chamfer/bevel)
  - `src/components/RegionBoundary/RegionBoundary.tsx` (inset dual-layer dashed region boundaries)
  - `src/components/ConditionBadge/ConditionBadge.tsx` (rounded-corner diamond badge + typography tracking)
  - `src/components/DominoTray/DominoTray.tsx` (increased vertical row gap)
  - `scripts/save_game_goldens.ts` (emit `pips-build-puzzle` v1 JSON format)
  - `src/importer/__tests__/savedGoldensJson.test.ts` (verify `serializePuzzle(puzzle)` matches `golden_results/game1..12.json`)
  - `golden_results/game1.json` .. `golden_results/game12.json` (regenerated in `pips-build-puzzle` v1 format)
  - `docs/DECISIONS.md` (Decision 17)
  - `docs/PROGRESS.md` (this entry)
- Proof:
  - All 20 test suites (76 tests) passing (`npx vitest run`).
  - Production build passing (`npm run build`).

**2026-10-17 — Domino selection bold black border and reliable deselect on rotation, drag, or empty click. ✅ DONE**
- Resolved domino selection and unselection styling and interaction transitions:
  1. **Selection Border & Opacity**:
     - When selected on the board, a placed domino now renders with a solid bold black border (`stroke: #000000`, `strokeWidth: 2.4`), solid white background (`opacity: 1`), and clean subtle shadow (`drop-shadow(0 2px 8px rgba(0, 0, 0, 0.25))`), eliminating the previous blue stroke and blue glow.
     - When unselected, the domino immediately returns to normal placed state: thin black border (`stroke: #000000`, `strokeWidth: 0.9`), semi-transparent body (`opacity: 0.58`), and no shadow (`filter: none`).
  2. **Unselection on Rotation & Drag**:
     - `useDominoDrag.ts`: Synchronously cleared `selectedPlacementRef.current = null` in `commitOrRevertSelected` to eliminate re-render race conditions.
     - Automatic 1-second unselect timer triggers after a legal rotation; illegal rotations now also automatically revert and unselect after 1.5 seconds if interaction stops.
     - Dragging another domino from either board or tray immediately unselects the active domino before initiating the drag.
  3. **Empty Click Catchers**:
     - Added full-size transparent backdrop rect to `PuzzleBoard.tsx` and empty click handler to `DominoTray.tsx` so clicking board padding, margins, or empty tray slots immediately unselects any active domino.
- Proof:
  - All 19 test suites (71 tests) passing (`npm test`).
  - Production build passing (`npm run build`).
  - Dev server running on `http://localhost:5173/`.

**2026-10-17 — Game 12: 9x9 "OFF" grid detection alignment, unequal '≠' recognition, golden snapshot, and regression test. ✅ DONE**
- Resolved puzzle geometry distortion on `game12.jpg` where the right and bottom sections misaligned into 34 cells instead of 28 cells, and condition badge 6 was misidentified as `5` instead of `≠`.
- Root causes & fixes:
  1. **Candidate grid scoring alignment in `gridDetection.ts`**:
     - `game12.jpg` forms a 9x9 grid spelling the letters "OFF" (12 cells in 'O', 8 in top 'F', 8 in bottom 'F' = 28 cells, 14 dominoes).
     - `estimateGrid` previously used a simplified 5-point center sampling (`0.50` offset) which accidentally counted 28 playable cells on an `8x8` grid as well as `9x9`. Since `8x8` was evaluated first, it won the tie, causing `detectGridCells` to misalign and produce 34 corrupted cells.
     - Aligned `estimateGrid`'s candidate cell sampling directly with `cellDetection.ts` (9-point core sampling at `0.40` upper-left offset, scaled `0.08` delta, matching brightness/saturation thresholds). On `8x8`, `estimateGrid` now accurately counts 34 cells (diff 6, heavily penalized), while `9x9` counts exactly 28 cells (diff 0, bonus awarded), cleanly selecting `9x9`.
  2. **Unequal badge '≠' recognition threshold in `tokenRecognition.ts`**:
     - The bar span ratio threshold for `≠` was relaxed from 0.62 to 0.58 to accommodate fonts with wide diagonal slashes (15px bars on a 25px wide glyph = 60%), cleanly identifying badge 6 as `≠`.
  3. **Debug UI & Golden Snapshot**:
     - Added `game12` button to debug options in `src/components/ImportScreen/ImportScreen.tsx`.
     - Copied `game11.jpg` and `game12.jpg` to `public/` for browser fetch availability.
     - Generated `golden_results/game12.json` and added `game12.jpg` to `scripts/save_game_goldens.ts` and `src/importer/__tests__/savedGoldensJson.test.ts`.
     - Added formal golden regression test in `src/importer/__tests__/game12Regression.test.ts`.
- Files touched:
  - `src/importer/gridDetection.ts`
  - `src/importer/tokenRecognition.ts`
  - `src/components/ImportScreen/ImportScreen.tsx`
  - `scripts/save_game_goldens.ts`
  - `src/importer/__tests__/savedGoldensJson.test.ts`
  - `src/importer/__tests__/game12Regression.test.ts`
  - `golden_results/game12.json`
  - `public/game11.jpg`
  - `public/game12.jpg`
  - `game12.jpg`
  - `docs/DECISIONS.md`
  - `docs/PROGRESS.md`
- Proof:
  - All 19 test suites (69 tests) passing (`npm test`).
  - `savedGoldensJson.test.ts` verifies games 1 to 12 match saved goldens 100%.
  - Production build passing (`npm run build`).

**2026-10-16 — Edit Mode Refinement: Select Region mode, hole selection prevention, and active region spotlighting. ✅ DONE**
- Implemented dedicated three-mode editing workflow (`Select Region`, `Assign Regions`, `Toggle Cells/Holes`) across `VerificationScreen` and `ManualEditor`.
- Guarded `Assign Regions` mode so that clicks on holes (unplayable slots) are strictly rejected and cannot be selected or assigned to regions.
- Added `Select Region` mode button allowing users to tap any cell or condition badge on the board to focus its region, with smooth scrolling and highlight in the region drawer/list.
- Added active region visual spotlighting: dimming non-selected cells/badges to 28% opacity, applying glowing outline and boundary halo to selected region cells.
- Preserved initial bounding box and rendered interactive dashed hole slots in `cells` mode for bidirectional toggling.
- Files touched:
  - `src/components/ConditionBadge/ConditionBadge.tsx`
  - `src/components/ManualEditor/ManualEditor.tsx`
  - `src/components/PuzzleBoard/PuzzleBoard.tsx`
  - `src/components/PuzzleCell/PuzzleCell.tsx`
  - `src/components/RegionBoundary/RegionBoundary.tsx`
  - `src/components/VerificationScreen/VerificationScreen.tsx`
  - `src/index.css`
  - `README.md`
  - `docs/DECISIONS.md`
  - `docs/PROGRESS.md`
- Proof:
  - All 17 test suites (65 tests) passing (`npx vitest run`).
  - Production build passing with 0 errors (`npm run build`).
  - Hot module replacement confirmed active and functioning on `http://localhost:5173/`.

**2026-10-15 — Show test game buttons only in debug mode with flag debug=1. ✅ DONE**
- Configured [ImportScreen.tsx](file:///c:/Zahi/image_pips/src/components/ImportScreen/ImportScreen.tsx) to conditionally render the `Test game1`..`Test game10` quick-test buttons only when the `debug=1` (or `debug=true`) query parameter is provided in the URL (e.g. `http://localhost:5173/?debug=1`).
- Files touched:
  - `src/components/ImportScreen/ImportScreen.tsx`
  - `docs/PROGRESS.md`
- Proof:
  - Verified live in Chrome: at `http://localhost:5173/`, 0 test buttons are rendered (clean main page); at `http://localhost:5173/?debug=1`, all 10 test buttons are rendered and functional.
  - All 14 Vitest suites (52 tests) passing.
  - Production build passing cleanly (`npm run build`).

**2026-10-15 — Fix Game 1 (24 vs >4), Game 2 (= vs 23), Game 8 (6 vs 3), and Game 9 (20 vs >0) in Chrome browser & Node. ✅ DONE**
- Resolved 4 browser-specific condition badge misclassifications caused by subpixel Canvas antialiasing and image noise:
  1. **Game 1 (`24` vs `>4`) & Game 9 (`20` vs `>0`)**:
     - Root cause: In `tokenRecognition.ts`, `isChevronRight` checked mid-height pixel counts and vertical spans (`span25 >= span75`). When splitting multi-character glyphs `24` and `20`, digit `2`'s diagonal neck created rightward pixels at mid-height with empty left space, causing `isChevronRight` to trigger on digit `2` and turn `24` into `>4` and `20` into `>0`.
     - Fix: Added `botRightPixels <= 1` constraint to `isChevronRight`. A chevron `>` angles down-left to `leftMinX` at the bottom and has zero bottom-right pixels, whereas digit `2` has a wide horizontal baseline extending across to `leftMaxX` with `botRightPixels >= 2`.
  2. **Game 2 (`=` vs `23`)**:
     - Root cause: Wide double-cell equal badge in Game 2 had width 70 and top/bottom bar spans of 36 pixels ($36 / 70 = 0.514$), which narrowly missed the previous `0.55 * glyphW` span threshold. When it failed the equal check, it fell through to multi-character splitting, classifying the left and right halves as `2` and `3`.
     - Fix: Lowered bar span threshold for equal signs from `0.55` to `0.45 * glyphW` when an empty horizontal gap row (`minGapRowPixels <= 1`) spans the entire glyph.
  3. **Game 8 (`6` vs `3`)**:
     - Root cause: The small 36x36 teal badge at (428, 292) contained a 3-pixel isolated noise speck at rows 0-1 on the far left. This artificially shifted `minX` 7 columns to the left, causing `maxConsecutiveEmptyLeft` to evaluate to 6 and fail digit 6's left-wall continuity check, falling through to digit `3`.
     - Fix: Added 8-connected component noise filtering in `tokenRecognition.ts` to discard isolated dust specks (< 5 pixels) when the main glyph component is $\ge 15$ pixels. The cleaned digit 6 now has continuous left wall ($emptyLeft = 0$) and recognizes accurately as `6`.
  4. **Game 1 (`<5` vs `<9`)**:
     - Root cause: In Chrome, antialiased top-bar pixels in `<5` touched `yUR1`, satisfying `hasUpperRight` and triggering digit 9's stroke ratio rule.
     - Fix: Added `emptyUpperRightRows === 0` validation to digit 9. Digit 9's upper loop has a continuous right wall from top to waist, whereas digit 5 has an open cavity below the top horizontal bar with `emptyUpperRightRows >= 1`.
- Files touched:
  - `src/importer/tokenRecognition.ts`
  - `golden_results/*.json`
  - `docs/DECISIONS.md`
  - `docs/PROGRESS.md`
- Proof:
  - 14 Vitest test suites passing (52 tests total, 0 regressions across all games).
  - All 10 golden files generated and verified via `npm run save:goldens`.
  - Verified live in Chrome browser via automated browser subagent at `http://localhost:5173/`:
    - Game 1: `badge_10` shows `24`, `badge_12` shows `<5`.
    - Game 2: middle teal badge shows `=`.
    - Game 8: bottom section right badge shows `6`.
    - Game 9: bottom right badge shows `20`.
  - Production build passing cleanly (`npm run build`).

**2026-10-15 — Fix game10 badge rules (>14, >9, >2, 9), Chrome browser antialiasing parity, and persistent golden test suites for all 10 games. ✅ DONE**
- Resolved condition badge recognition and rendering issues in `game10.jpg`:
  1. **3-character badge token `>14`**: Added multi-glyph sub-splitting for tokens where `(leftChar === '<' || leftChar === '>') && rightW / rightH >= 0.85`, separating tens digit `1` and ones digit `4` via column minima; adjusted SVG `<text>` sizing (`0.36 * size`, `-0.05em` letter-spacing) in `ConditionBadge.tsx` so `>14` fits with comfortable padding inside diamond badges.
  2. **Color-aware text pixel extraction for orange badges**: White text antialiased against bright orange badges (#f97316) exhibits warm channel skew ($R \approx 255, G \approx 245, B \approx 210$, diff $\approx 45$). Added targeted condition `isOrangeBadge && r > 200 && g > 200 && b > 175 && diff < 55` without relaxing thresholds on green/blue/yellow badges, ensuring the chevron `>` is fully preserved in Chrome's canvas decompression.
  3. **Right digit `9` recognition (`>9`)**: Added topological classification requiring continuous enclosed upper loop (`upLeft >= 8 && upLeft >= upRight * 0.65`), solid waist, empty lower-left row, and solid lower-right stem (`lowerRightStem >= 6`), distinguishing `9` from `5` and `3`.
  4. **Right digit `2` vs `3` (`>2` vs `>3`)**: Formulated robust baseline density check (`botRowPixels >= 0.55 * W && midRatio <= 3.00`) to capture digit `2`'s flat horizontal bottom baseline even under antialiasing, cleanly distinguishing it from `3`'s curved bottom tip (`botRowPixels <= 0.50 * W`).
  5. **Single digit `9` vs `8` / `6`**: Refined upper-left wall continuity and lower-left mouth gap checks, recognizing single digit `9` on bottom purple cells without false positives.
  6. **Golden snapshot persistence**: Implemented `scripts/save_game_goldens.ts` and generated `golden_results/game1.json` through `golden_results/game10.json`, recording full validation, cell coordinates, dominoes, regions, constraints, and detected badges for future regression checking. Added `"save:goldens"` npm script.
- Files touched:
  - `src/importer/tokenRecognition.ts`
  - `src/importer/badgeDetection.ts`
  - `src/components/ConditionBadge/ConditionBadge.tsx`
  - `src/components/ImportScreen/ImportScreen.tsx`
  - `scripts/save_game_goldens.ts`
  - `golden_results/game[1-10].json`
  - `src/importer/__tests__/game9Regression.test.ts`
  - `src/importer/__tests__/game10Regression.test.ts`
  - `package.json`
  - `docs/DECISIONS.md`
  - `docs/PROGRESS.md`
- Proof:
  - 14 Vitest test suites passing (52 tests total, covering all games).
  - Verified live in Chrome browser via automated browser subagent on `http://localhost:5173/`: all badges in `game10.jpg` verified (`['>1', '>0', '>3', '5', '=', '1', '>2', '>14', '9', '>9', '4']`).
  - Production build passing cleanly (`npm run build`).

**2026-10-14 — Multi-part puzzle reconstruction, unequal ('≠') badge rule, and robust chevron / 1 vs 2 / 8 vs 9 recognition (game7.jpg & game8.jpg). ✅ DONE**
- Supported puzzles with multiple disconnected sub-boards (e.g. 3 sub-boards in `game7.jpg` and `game8.jpg`) and unequal ('≠') region condition badges across mobile and desktop browser captures (Chrome, Firefox, Android).
- Resolved recognition discrepancies in `game8.jpg`:
  1. **Unequal badge ('≠')**: Identified by dual horizontal bars with diagonal slash extending above top and below bottom bars, creating a distinct `{ type: 'different' }` constraint ensuring all cells in the region have distinct pip values.
  2. **Scale-invariant chevrons ('<', '>')**: Uses topological apex and open-mouth detection at mid-height (`midRightPixels === 0` for `<`, `midLeftPixels === 0` for `>`), preventing chevrons from being misrecognized as digits `1` or `2` (`<3` previously turning into `13` or `23`, and `>7` turning into `27`).
  3. **Multi-character `1` vs `2` (`14` vs `24`)**: Differentiates digit `1`'s continuous vertical stem (`leftMaxCol / leftH > 0.82`) from digit `2`'s flat horizontal baseline without continuous vertical stem (`leftMaxCol / leftH <= 0.82 && leftBotP >= leftW * 0.55 && leftW / leftH >= 0.60`).
  4. **Single-digit `8` vs `9`**: Differentiates the continuous lower-left loop wall of `8` from the open gap of `9` across rows `0.60..0.75 * H` where `9` has empty rows in the left third.
  5. **Board area, grid, cell, and domino tray detection**: Adjusted detection thresholds and band extraction to reconstruct all 3 sub-boards (28 cells, 14 dominoes, 15 condition badges).
- Files touched:
  - `src/importer/badgeDetection.ts`
  - `src/importer/cellDetection.ts`
  - `src/importer/dominoDetection.ts`
  - `src/importer/gameAreaDetection.ts`
  - `src/importer/gridDetection.ts`
  - `src/importer/pipDetection.ts`
  - `src/importer/tokenRecognition.ts`
  - `src/components/ImportScreen/ImportScreen.tsx`
  - `game7.jpg`, `game8.jpg`
  - `src/importer/__tests__/game7Regression.test.ts`
  - `src/importer/__tests__/game8Regression.test.ts`
  - `docs/DECISIONS.md`
  - `docs/PROGRESS.md`
- Proof:
  - All 12 Vitest regression test suites passing (50 tests total).
  - Verified live in Chrome browser via automated browser agent on `http://localhost:5173/`: all 15 badges in `game8.jpg` verified (`['0', '4', '≠', '>7', '=', '4', '=', '3', '9', '14', '<4', '<3', '>4', '6', '6']`).
  - Production build passing (`npm run build`).

**2026-10-13 — Single-digit 9 recognition and multi-character 10/11/12 token resolution for game6.jpg (Android & Firefox). ✅ DONE**
- Resolved condition badge recognition error in `game6.jpg` where the orange badge at (527, 910) (1 column before the right edge, 1 row before the bottom) representing `9` was reconstructed as `5`.
- Root causes & fixes:
  1. **Topological single-digit `9` classifier in `src/importer/tokenRecognition.ts`**:
     - Previously, the single-digit classifier had no rule for digit `9`. It bypassed `0, 6, 8` because `maxConsecutiveEmptyLeft >= 3` in the lower half; bypassed `2` because lower-right stem outweighed lower-left; and then fell into the `5 vs 3` heuristic where `upLeft > upRight` incorrectly returned `'5'`.
     - Implemented topological recognition for `9`:
       - Enclosed upper loop: continuous left and right boundaries across the upper third (`upLoopLeft >= 0.35 * H`, `upLoopRight >= 0.35 * H`) with hollow cavity in the upper-mid center (`upLoopCenterHole <= 0.35 * waistBox`).
       - Solid horizontal waist crossbar (`maxWaistSpan >= 0.65 * W`).
       - Solid lower-right vertical stem (`lowerRightStem >= 0.35 * H`).
       - Empty lower-left quadrant (`lowerLeftStem <= 0.35 * lowerRightStem`).
  2. **Scale-invariant multi-character left digit classifier (`1` vs `2`)**:
     - In `game6.jpg`, Badge 6 (`10`) was previously at risk of misclassifying as `20` because `leftMaxX - 3` tested pixels 3px from the right edge, which in lower-resolution glyphs hit the central stem of `1`.
     - Replaced with scale-invariant `leftMaxX` margin check at `yUpper = 0.25 * leftH`, testing whether the glyph curve reaches the rightmost boundary `leftMaxX`. For digit `2`, the top-right loop reaches `leftMaxX`, while for digit `1`, the upper stem is centered and does not reach `leftMaxX`.
     - Verified across all multi-character badges in `game1.jpg` (`11`, `24`), `game2.jpg` (`12`, `10`), `game3.jpg` (`10`), and `game6.jpg` (`10`).
- Added formal golden regression test in `src/importer/__tests__/game6Regression.test.ts` verifying all 30 condition badges, 16 dominoes, 32 cells, and 30 regions on `game6.jpg`.
- Files touched: `src/importer/tokenRecognition.ts`, `src/importer/__tests__/game6Regression.test.ts`, `game6.jpg`, `docs/DECISIONS.md`, `docs/PROGRESS.md`.
- Proof: All 48 vitest tests passing across all 10 test files (`npx vitest run`), production build passing (`npm run build`), local Vite dev server running on `http://localhost:5173/`.

**2026-10-10 — Desktop PC screenshot support & resolution/aspect-ratio independence (game5.jpg). ✅ DONE**
- Resolved all recognition issues on PC browser screen captures like `game5.jpg` (827x981, aspect ratio 0.84, no mobile status bar/chrome, board starts at y=24).
- Key improvements:
  1. **Dynamic vertical band analysis in `gameAreaDetection.ts`**:
     - Removed hardcoded percentage splits (`height * 0.20`, `height * 0.67`) that assumed phone status bars and chopped off rows 0 and 1 on PC captures.
     - Detects contiguous vertical content spans (`rowDensity >= 0.04 * width`, bridging gaps <= 12px).
     - Identifies the puzzle board as the primary high-density span (largest vertical extent, roughly square/rectangular) and the domino tray as the content spans below the board.
  2. **Color-constrained connected-components clustering in `badgeDetection.ts`**:
     - Previously, saturated badge pixels of different colors (e.g. pink, teal) were connected across cells when touching saturated dark/orange inter-region boundary lines on lower-resolution captures, merging adjacent badges into wide non-square components.
     - Added neighbor color-distance constraint (`cDist < 75`) during BFS so badges of different colors or touching border fragments never merge.
     - Replaced hardcoded badge dimension thresholds (`bw < 35 || bh < 35`) and hardcoded crop boxes (`56x56`) with scale-relative dimensions (`minDim = Math.min(35, Math.round(cellSize * 0.35))`, `cropRadius = Math.round(Math.max(bw, bh) * 0.45)`).
  3. **Scale-invariant token classification in `tokenRecognition.ts`**:
     - Replaced absolute pixel thresholds (`glyphW <= 17`, `botP <= 8`, `leftMaxCol >= 17`, `rightMaxCol >= 18`) with scale-invariant ratios:
       - Digit `1`: Aspect ratio `glyphW / glyphH < 0.58` (reliably differentiates narrow digits from standard digits regardless of resolution).
       - Digit `7`: `topP >= 0.70 * W && botP <= 0.40 * W`.
       - Digit `0` vs `6` vs `8`: Middle-third waist crossbar and vertical tunnel density; upper-right wall check for `6` vs `8`.
       - Digit `2` vs `3`: Baseline coverage (`botP >= 0.70 * W`) combined with lower-mid quadrant balance (`rightMid <= 1.85 * leftMid`), cleanly separating diagonal-stroke `2`s from right-loop `3`s.
       - Digit `5` vs `3`: Upper-right cavity check (`ur_pixels <= 0.30 * urBoxArea`) and upper-left stroke dominance.
       - Multi-character tokens: Normalized height thresholds (`leftMaxCol >= 0.65 * leftH`, `rightMaxCol >= 0.65 * rightH`).
- Added golden regression suite in `src/importer/__tests__/game5Regression.test.ts` verifying all 32 condition badges, 16 dominoes, 32 cells, and 32 regions match ground truth with 0 validation errors.
- Files touched: `src/importer/gameAreaDetection.ts`, `src/importer/badgeDetection.ts`, `src/importer/tokenRecognition.ts`, `src/importer/__tests__/game5Regression.test.ts`, `docs/DECISIONS.md`, `docs/PROGRESS.md`.
- Proof: All 47 vitest tests passing across all 5 test suites (`game1.jpg`, `game2.jpg`, `game3.jpg`, `game4.jpg`, `game5.jpg`), local Vite dev server running on `http://localhost:5174/`.

**2026-10-10 — Single-digit condition badge recognition fix for game4.jpg (digits 0–8). ✅ DONE**
- Resolved condition badge recognition errors on `game4.jpg` where single digits `1, 3, 4, 6` were misrecognized as `2, 8, 5`, and single digit `0` on rows 1 and 3 was misrecognized as `8` in browser canvas decoding.
- Root cause:
  1. `src/importer/tokenRecognition.ts` previously lacked rules for `1, 3, 4, 6`. Digit `1`'s bottom serif triggered `botP >= 0.75 * W` for `2`, while `3, 4, 6` defaulted to `8` or `5`.
  2. Digit `0` detection relied on strict 5x5 center-box hole check (`centerHolePixels === 0`) and equator cross width cutoff (`equatorCrossCount <= 0.65 * W`). In browser canvas rendering (where antialiasing softens edges and slightly broadens lines), `0` missed this check and fell directly into the `6 vs 8` branch, which matched all criteria for `8`.
- Unified enclosed-loop digit recognition (`0`, `6`, `8`):
  - `0`, `6`, and `8` all share an enclosed lower loop and continuous left vertical wall (`maxConsecutiveEmptyLeft <= 1`).
  - Differentiated `0` from `6` and `8` via vertical waist tunnel analysis across the middle third (`y in 0.35..0.65 * H, x in cX ± 1`):
    - `0` has a hollow central vertical tunnel with no horizontal junction crossbar (`centerTunnelPixels <= 3`).
    - `6` and `8` both have a solid horizontal waist/junction crossbar (`centerTunnelPixels >= 4`).
    - `8` is distinguished from `6` by the upper-right loop wall (`upperRightPixels >= 3`), whereas `6` is open on the upper-right (`upperRightPixels < 3`).
- Single-digit topological classifier hierarchy:
  - `1`: Narrow width / aspect ratio (`glyphW <= 17 || glyphW / glyphH < 0.65`).
  - `7`: Solid top horizontal bar with narrow bottom point (`topP >= 0.70 * W && botP <= 8`).
  - `4`: Prominent mid-lower horizontal crossbar spanning >= 80% around 60%–70% height with empty lower-left and single vertical stem (`botP <= 0.45 * W`).
  - `0`, `6`, `8`: Enclosed-loop digits distinguished by waist crossbar tunnel density (`0` vs `6/8`) and upper-right wall presence (`6` vs `8`).
  - `2`: Solid flat horizontal baseline spanning >= 75% of width.
  - `5` vs `3`: `5` has strong vertical stroke in upper-left quadrant (`upperLeftP >= 8`) and open upper-right, whereas `3` has open upper-left quadrant and curved loop in upper-right (`upperRightP >= 8`).
- Added formal golden regression test in `src/importer/__tests__/game4Regression.test.ts` verifying all 32 condition badges and puzzle invariants on `game4.jpg`.
- Files touched: `src/importer/tokenRecognition.ts`, `src/importer/__tests__/game4Regression.test.ts`, `docs/DECISIONS.md`, `docs/PROGRESS.md`.
- Proof: All 46 vitest tests passing (`npx vitest run`) across all 4 game test suites (`game1.jpg`, `game2.jpg`, `game3.jpg`, `game4.jpg`), production build passing, local Vite dev server running on `http://localhost:5174/`.

**2026-10-06 — Toggleable import diagnostics, fixed-slot domino tray layout, and README polish. ✅ DONE**
- Implemented configurable runtime import diagnostics in `src/importer/debugConfig.ts`, `badgeDetection.ts`, `regionDetection.ts`, and `importPuzzle.ts`. Can be toggled on/off at will via `enableImportDebug()` / `disableImportDebug()` in the browser DevTools console, `localStorage.DEBUG_IMPORT = 'true'`, or `?debug=true` in the URL. Produces zero console output when off.
- Updated `DominoTray.tsx` and `PlayScreen.tsx` to maintain a completely fixed, stable layout for all dominoes:
  - Each puzzle domino has a permanent designated slot index in the tray.
  - When a domino is dragged and placed on the board, its slot in the tray remains in place as an empty placeholder box rather than collapsing or shifting the other dominoes.
  - Removed the "All dominoes have been placed on the board!" message; when all dominoes are placed, all slots simply stay in their fixed grid positions as empty placeholders.
- Redesigned and streamlined `README.md` with a clean overview of the app's purpose, positioned the example puzzle screenshot (`game1.jpg`) right below the main header before Getting Started, detailed core features, and linked the MIT License.
- Files touched: `src/importer/debugConfig.ts`, `src/importer/badgeDetection.ts`, `src/importer/regionDetection.ts`, `src/importer/importPuzzle.ts`, `src/components/DominoTray/DominoTray.tsx`, `src/components/PlayScreen/PlayScreen.tsx`, `README.md`, `docs/PROGRESS.md`.
- Proof: All 45 vitest tests passing (`npm test`), production build passing (`npm run build`), dev server running.

**2026-10-06 — Cross-browser Firefox & Chrome condition detection resilience. ✅ DONE**
- Eliminated false dashed-border splits between adjacent same-color cells in `regionDetection.ts` by constraining the search window to the central 40% of the shared boundary (`span = 0.20 * cellHeight`), tightening normal search offset (`0.06 * cellWidth`), and increasing the detection threshold from 7 to 14 pixels. Prevents outer perimeter border bleed and browser canvas antialiasing/noise from falsely splitting merged cells (e.g. teal cells `0,6` and `0,7`).
- Hardened condition badge detection in `badgeDetection.ts`: expanded outer padding around the board from 0.40 to 0.60 * `cellSize` to prevent outer edge badges (e.g. badge 7) from clipping at the boundary, made minimum pixel count adaptive (`min(1200, 0.10 * cellSize^2)`), widened aspect ratio tolerance to `0.60..1.65`, and expanded proximity matching to `1.8 * cellSize`.
- Configured offscreen canvas 2D context in `loadImage.ts` with `{ willReadFrequently: true, colorSpace: 'srgb' }` to explicitly request sRGB color space handling across browsers.
- Expanded badge-to-region color matching tolerance in `badgeDetection.ts` (`cDist` threshold from 65 to 130). In Firefox, subtle gamma/color management differences caused teal badges (hue ~206°) to snap to Sky Blue (`#0284c7`) while cells snapped to Teal (`#14b8a6`), creating a token distance of 117 that rejected Badge 7 from Region 4 (`0,6; 0,7`) and Badge 0 from Region 11 (`3,4`). Allowing up to 130 distance permits adjacent gamut tones (teal/sky-blue) while still strictly preventing mismatches with other colors (pink, lime, orange, purple).
- Implemented hue-adaptive badge mask saturation threshold in `badgeDetection.ts`: for teal/cyan/sky-blue hues (`hue 150..250`), threshold is set to `0.28` (safely capturing watercolor teal badges that decode with reduced saturation in Firefox without matching pale teal cell background at ~0.12), while for warm/vibrant hues (`orange, lime, green, pink, purple`), threshold remains `0.45` to prevent badges from merging into colored cell bodies.
- Files touched: `src/importer/regionDetection.ts`, `src/importer/badgeDetection.ts`, `src/importer/loadImage.ts`, `docs/PROGRESS.md`.
- Proof: All 45 tests passing (`npm test`), dev server running.

**2026-10-06 — 4-quadrant pinned clockwise rotation for placed dominoes, thinner selected black edge, and condition identification discrepancy diagnosis. ✅ DONE**
- Configured selected placed dominoes with a thinner black edge (`stroke: '#000000'`, `strokeWidth: 0.6`, `opacity: 0.75`), while settled unselected placed dominoes maintain standard edge (`strokeWidth: 1`, `opacity: 0.6`).
- Implemented 4-quadrant clockwise rotation pinned strictly around the domino's top square `(anchorRow, anchorCol)` across all positions (0: Right, 1: Down, 2: Left, 3: Up). Every click on a selected domino advances 90° clockwise around the anchor square, regardless of where the domino is placed on the board.
- After 1 second of inactivity, the candidate position is evaluated against board legality: if legal, the domino is placed and deselected; if illegal, it reverts to the original placement and deselects.
- Updated `placement.ts` and unit regression test 32 in `gameEngine.test.ts` to reflect the 4-quadrant rotation mechanism.
- Conducted deep investigation and comparison between committed code (`6b869c6` / `f108e64`) and current code regarding the "unknown condition" banner. Identified why the banner was invisible in the committed white theme version and became visible when restyled for high contrast.
- Files touched: `src/components/Domino/Domino.tsx`, `src/game/useDominoDrag.ts`, `src/domain/placement.ts`, `src/game/__tests__/gameEngine.test.ts`, `docs/PROGRESS.md`.
- Proof: 45 unit and regression tests passing (`npm test`), production build passing (`npm run build`), dev server running on `http://localhost:5173/`.

**2026-10-06 — Strict top square rotation anchor for placed dominoes. ✅ DONE**
- Updated placed domino rotation logic in `findRotationCandidate` (`useDominoDrag.ts`) and `rotateDomino` (`placement.ts`) to strictly rotate around the domino's top square `(topSquareRow, topSquareCol)` across all 4 rotation states.
- Removed arbitrary anchor offset shifts (`dRow`, `dCol`) so dominoes never jump to other grid cells during rotation, regardless of board position or adjacent cell states.
- Updated `PuzzleBoard.tsx` placed domino rendering to parse coordinates via `parseCellId`, ensuring temporary candidate rotations near edges remain smoothly visible before the 1-second legality validation commits or reverts.
- Added regression test 32 in `gameEngine.test.ts` verifying placed domino rotations pivot strictly around the top square.
- Files touched: `src/game/useDominoDrag.ts`, `src/domain/placement.ts`, `src/components/PuzzleBoard/PuzzleBoard.tsx`, `src/game/__tests__/gameEngine.test.ts`, `docs/PROGRESS.md`.
- Proof: 45 tests passing (`npm test`), production build passing (`npm run build`), local dev server running on `http://localhost:5173/`.

**2026-10-06 — Placed domino 60% transparency, selection rotation state machine (75% opacity, 90° clockwise per click, 1-sec auto settle), and GameStatus cleanup. ✅ DONE**
- Configured settled placed dominoes on board with 60% opacity (`opacity: 0.6`) and thin black edge (`stroke="#000000"`, `strokeWidth: 1`) so background square colors show through clearly.
- Completely removed "Repair Mode Active" and "Not quite — check the marked conditions" text banners from `GameStatus.tsx` when the puzzle has incorrect placements.
- Implemented placed domino selection and rotation state machine:
  - First click on an unselected placed domino selects it: thin black edge disappears, transparency changes to 75% (`opacity: 0.75`), and 1-second countdown begins.
  - Subsequent clicks on a selected domino rotate it 90 degrees clockwise per click, resetting the 1-second countdown from the last click.
  - 1 second after the last click, if the candidate position is legal on the board, it commits/places the domino, restores 60% transparency, restores the thin black edge, and deselects.
  - If the candidate position is illegal (blocked or out of bounds), it safely reverts to the original placement and deselects.
  - Clicking empty board space or another piece cleanly settles selection immediately.
- Files touched: `src/components/Domino/Domino.tsx`, `src/components/GameStatus/GameStatus.tsx`, `src/components/PuzzleBoard/PuzzleBoard.tsx`, `src/components/PlayScreen/PlayScreen.tsx`, `src/game/useDominoDrag.ts`, `src/game/gameState.ts`, `src/game/__tests__/gameEngine.test.ts`, `docs/PROGRESS.md`.
- Proof: 44 tests passing (`npm test`), production build passing (`npm run build`), local dev server running on `http://localhost:5173/`.

**2026-10-06 — Game header cleanup, VerificationScreen top row simplification, and complete editor white theme. ✅ DONE**
- Removed "Imported Puzzle" title text from the game screen header to maximize vertical screen real estate for the board and domino tray.
- Simplified the top row of the Verification & Correct screen: removed "Verify & Correct Puzzle" header text, renamed the start button to "Start", and made the header row single-line and compact.
- Implemented full white theme across all 4 screens/tabs (Verification screen + Manual Editor Grid, Regions, and Dominoes tabs):
  - Top action bars converted to clean white backgrounds with slate borders.
  - Mobile tabs converted to light background with crisp active and inactive button styles.
  - All form controls (inputs, dropdown selects, number inputs, color pickers) styled cleanly with white backgrounds and dark text.
  - Action buttons (Swap, Delete, + Region, + Domino, Play, Start) styled consistently with modern light theme styling.
  - Interactive grid container and cell styling converted to light canvas with distinct playable vs hole cell representations.
- Files touched: `src/components/GameStatus/GameStatus.tsx`, `src/components/VerificationScreen/VerificationScreen.tsx`, `src/components/ManualEditor/ManualEditor.tsx`, `docs/PROGRESS.md`.
- Proof: 43 unit and regression tests passing (`npm test`), TypeScript and Vite production build passing (`npm run build`), local dev server running on `http://localhost:5173/`.

- Switched entire application theme to white background (`#ffffff`) and dark slate text while strictly preserving puzzle game squares / region colors.
- Enlarged tray dominoes (cellSize increased to 34–42px) with horizontal slot placeholders (`[ | ]`) and compact 8px row spacing.
- Implemented semi-transparent vertical domino rendering (`opacity: 0.82` with soft drop-shadow) that overlaps adjacent rows without expanding tray or row dimensions.
- Configured dominoes to turn back to horizontal (`rotation = 0`) whenever a drag ends without dropping onto the board or when returned from board to tray.
- Enlarged condition badges (`size: 0.56 * cellSize`) with bold white text (`fontWeight: 900`) and enhanced diamond borders.
- Files touched: `src/index.css`, `src/components/ConditionBadge/ConditionBadge.tsx`, `src/components/PuzzleBoard/PuzzleBoard.tsx`, `src/components/Domino/Domino.tsx`, `src/components/DominoTray/DominoTray.tsx`, `src/components/GameStatus/GameStatus.tsx`, `src/components/PlayScreen/PlayScreen.tsx`, `src/components/ImportScreen/ImportScreen.tsx`, `src/components/CompletionDialog/CompletionDialog.tsx`, `src/game/useDominoDrag.ts`, `src/game/gameState.ts`, `docs/PROGRESS.md`.
- Proof: 43 tests passing (`npm test`), production build passing (`npm run build`), Firebase deployment verified live.

**2026-10-06 — Invariant square slots & constant tray height for rotation stability (offline code + tests + build + deploy). ✅ DONE**
- Encapsulated each tray domino inside a fixed square `.tray-domino-slot` container (`slotSize x slotSize`).
- When dominoes rotate between horizontal (2x1) and vertical (1x2), they rotate cleanly about their exact center point within the invariant square slot.
- The slot width, slot height, row height, and tray container height never change during rotation or placement.
- Ensured the board above never shifts or pushes upward, and neighboring tray dominoes never shift sideways or vertically when a domino rotates.
- Maintained constant minimum tray height based on total puzzle piece capacity so tray dimensions remain fully stable throughout gameplay.
- Files touched: `src/components/DominoTray/DominoTray.tsx`, `docs/PROGRESS.md`.
- Proof: 43 tests passing (`npm test`), production build passing (`npm run build`), Firebase deployment verified live.

**2026-10-06 — Android system navigation bar clearance & dynamic viewport fix (offline code + tests + build + deploy). ✅ DONE**
- Raised mobile tray clearance to `paddingBottom: max(84px, calc(env(safe-area-inset-bottom, 0px) + 76px))` ensuring the bottom row of 3 dominoes is lifted completely clear of the Android 3-button control bar.
- Replaced `100vh` with `100dvh` on `.play-screen-root` so mobile browser address/navigation chrome does not push bottom screen content under the device buttons.
- Updated SVG puzzle board scaling to fit within available `<main>` height dynamically without pushing the tray downward.
- Fine-tuned `trayCellSize` to 30px for >10 dominoes, maintaining constant size regardless of dominoes placed.
- Files touched: `src/components/DominoTray/DominoTray.tsx`, `src/components/PlayScreen/PlayScreen.tsx`, `src/components/PuzzleBoard/PuzzleBoard.tsx`, `src/index.css`, `docs/PROGRESS.md`.
- Proof: 43 tests passed (`npm test`), production build passed (`npm run build`), Firebase deployment verified live.

**2026-10-06 — Mobile tray elevation, persistent domino sizing, and README example update (offline code + tests + docs + deploy). ✅ DONE**
- Lifted domino tray above mobile bottom navigation bar with safe-area padding (`paddingBottom: max(36px, env(safe-area-inset-bottom, 32px))`).
- Fixed domino sizing so pieces no longer shrink/grow dynamically when dominoes are dropped, basing size on total puzzle domino capacity.
- Updated `README.md` to remove point 5 and include `game1.jpg` example screenshot.
- Files touched: `src/components/DominoTray/DominoTray.tsx`, `src/components/PlayScreen/PlayScreen.tsx`, `README.md`, `docs/PROGRESS.md`.
- Proof: 43 unit and regression tests passing (`npm test`), production build passing (`npm run build`), Firebase deployment verified live.

**2026-10-06 — Production polish, mobile viewport optimization, custom puzzle save/import, and Firebase Hosting deployment (offline code + tests + Firebase hosting deploy). ✅ DONE**
Completed all fine-tuning requirements:
- Updated brand icon and favicon to `icon.jpg` and updated home screen branding.
- Home screen "Resume Puzzle" button displays disabled/grayed-out when no active session exists.
- Removed image format text from the upload box for a clean drop area.
- Dominoes on the board and drag candidate previews are centered within cell boundaries for all rotations.
- Removed rotations and invalid drops metrics from the puzzle completion dialog.
- Mobile portrait optimization: configured `100dvh` viewport lock, responsive tab navigation in manual editor, and adaptive tray domino scaling so all elements remain visible without page scrolling.
- Added custom puzzle JSON export (`Save`) and JSON import (`Import`) in `ManualEditor`.
- Rewrote `README.md` with operational instructions only.
- Configured Firebase Hosting (`firebase.json`, `.firebaserc`) and successfully deployed to project `imagepips` (`https://imagepips.web.app`).
- Verification: 43 unit and regression tests passing across 7 test suites (`npm test`), TypeScript build passed (`npm run build`), Firebase deployment verified live.
- Files touched: `index.html`, `src/index.css`, `src/components/ImportScreen/ImportScreen.tsx`, `src/components/PuzzleBoard/PuzzleBoard.tsx`, `src/components/DominoTray/DominoTray.tsx`, `src/components/CompletionDialog/CompletionDialog.tsx`, `src/components/PlayScreen/PlayScreen.tsx`, `src/components/VerificationScreen/VerificationScreen.tsx`, `src/components/ManualEditor/ManualEditor.tsx`, `README.md`, `firebase.json`, `.firebaserc`, `.gitignore`, `docs/DECISIONS.md`, `docs/PROGRESS.md`.
