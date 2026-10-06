# Decisions

| N | Date | Author | Decision & Rationale |
|---|------|--------|----------------------|
| 1 | 2026-10-06 | Pair Programming with Antigravity | **Client-side deterministic CV pipeline over external OCR/VLM APIs.** Why: Zero external network latency, zero per-query API cost, completely offline operation directly in browser using canvas pixel analysis and pattern matching. Files: `src/importer/*`. |
| 2 | 2026-10-06 | Pair Programming with Antigravity | **Continuous game timer starts immediately on board view, continues across exit/resume and reset.** Why: Consistent speedrun/solving flow without stopping unless the puzzle is solved. Preserves elapsed time during board reset. Files: `src/game/gameState.ts`, `src/components/PlayScreen/PlayScreen.tsx`. |
| 3 | 2026-10-06 | Pair Programming with Antigravity | **Centering dominoes on grid cells using margin offset rather than top-left alignment.** Why: Dominos rendered at SVG origin left gap at bottom-right of cell boundaries; offsetting by margin creates symmetric spacing for horizontal and vertical orientations. Files: `src/components/PuzzleBoard/PuzzleBoard.tsx`. |
| 4 | 2026-10-06 | Pair Programming with Antigravity | **Custom puzzle JSON export and import in ManualEditor.** Why: Enables cross-device sharing, offline archiving, and custom puzzle creation without backend storage dependencies. Files: `src/components/ManualEditor/ManualEditor.tsx`. |
| 5 | 2026-10-06 | Pair Programming with Antigravity | **100dvh viewport locking and adaptive tray sizing for portrait mobile screens.** Why: Eliminates accidental scrolling and address-bar jumping on mobile devices while keeping all puzzle elements visible. Files: `src/index.css`, `src/components/DominoTray/DominoTray.tsx`. |
| 6 | 2026-10-06 | Pair Programming with Antigravity | **Hue-adaptive saturation threshold in badge detection (0.28 for teal/blue hues 150..250, 0.45 for warm hues).** Why: Cross-browser color profiles (e.g. Firefox QCMS) increase Red channel levels in watercolor teal tiles, dropping saturation below global 0.44–0.50 cutoffs and shattering diamond badges into crumbs. Lowering threshold selectively for teal/blue hues retains full badge bodies without merging warm badges into colored cell bodies. Files: `src/importer/badgeDetection.ts`. |
| 7 | 2026-10-06 | Pair Programming with Antigravity | **Fixed-slot domino tray preserving empty placeholders upon placement.** Why: Removing dominoes dynamically collapsed the grid and shifted remaining domino positions under the user's cursor. Retaining empty slots keeps layout stable and intuitive. Files: `src/components/DominoTray/DominoTray.tsx`, `src/components/PlayScreen/PlayScreen.tsx`. |

## Open Questions
None currently open.
