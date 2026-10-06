# Progress Log

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
