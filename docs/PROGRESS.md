# Progress Log

**2026-10-06 — White theme, larger semi-transparent overlapping dominoes, and bold condition badges (offline code + tests + build + deploy). ✅ DONE**
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
