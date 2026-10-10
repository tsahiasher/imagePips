# Progress Log

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
