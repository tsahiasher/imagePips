# Progress Log

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
