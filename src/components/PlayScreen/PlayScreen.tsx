import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Domino } from '../Domino/Domino';
import { DominoTray } from '../DominoTray/DominoTray';
import { GameStatus } from '../GameStatus/GameStatus';
import { PuzzleBoard } from '../PuzzleBoard/PuzzleBoard';
import { CompletionDialog } from '../CompletionDialog/CompletionDialog';
import {
  GameState,
  initGameState,
  placeDominoOnBoard,
  resetGameState,
  tickTimer
} from '../../game/gameState';
import { isPuzzleSolved } from '../../game/constraintEngine';
import { solvePuzzle } from '../../game/solver';
import { useDominoDrag } from '../../game/useDominoDrag';
import { isSolveOptionEnabled } from '../../vision/urlParams';
import { saveActiveGameState, saveActivePuzzle } from '../../persistence/storage';
import { Puzzle, parseCellId } from '../../domain/puzzle';

interface FlyingDominoState {
  dominoId: string;
  x: number;
  y: number;
  angle: number;
  scale: number;
  animate: boolean;
}

interface PlayScreenProps {
  puzzle: Puzzle;
  initialState?: Partial<GameState>;
  autoSolve?: boolean;
  onAutoSolveStarted?: () => void;
  onBack: () => void;
  onImportAnother: () => void;
}

export const PlayScreen: React.FC<PlayScreenProps> = ({
  puzzle,
  initialState,
  autoSolve = false,
  onAutoSolveStarted,
  onBack,
  onImportAnother
}) => {
  const [gameState, setGameState] = useState<GameState>(() =>
    initGameState(puzzle, initialState)
  );

  const latestGameStateRef = useRef<GameState>(gameState);
  latestGameStateRef.current = gameState;

  const boardSvgRef = useRef<SVGSVGElement | null>(null);
  const cellSize = 70;

  const {
    dragState,
    dragCandidate,
    selectedPlacement,
    selectedDominoId,
    draggingDominoId,
    effectivePlacements,
    deselectDomino,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  } = useDominoDrag(gameState, setGameState, boardSvgRef, cellSize);

  // Timer loop (pauses automatically when document is hidden in background)
  useEffect(() => {
    if (!gameState.timerRunning || gameState.solved) return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setGameState((prev) => tickTimer(prev, performance.now()));
    }, 250);

    return () => clearInterval(interval);
  }, [gameState.timerRunning, gameState.solved]);

  // Pause timer timestamp when app/tab goes to background and persist latest elapsed time
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveActiveGameState(latestGameStateRef.current);
        setGameState((prev) => ({
          ...prev,
          lastTickTimestamp: null
        }));
      } else {
        setGameState((prev) => ({
          ...prev,
          lastTickTimestamp: performance.now()
        }));
      }
    };

    const handlePageHide = () => {
      saveActiveGameState(latestGameStateRef.current);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      saveActiveGameState(latestGameStateRef.current);
    };
  }, []);

  // Persist puzzle only when puzzle definition changes
  useEffect(() => {
    saveActivePuzzle(puzzle);
  }, [puzzle]);

  // Persist game state only on meaningful player moves/actions (not every 250ms clock tick)
  useEffect(() => {
    saveActiveGameState(latestGameStateRef.current);
  }, [
    gameState.placements,
    gameState.dominoRotations,
    gameState.solved,
    gameState.validationMode,
    gameState.hasShownFullBoardMessage,
    gameState.moves,
    gameState.rotations,
    gameState.invalidDrops,
    gameState.timerStarted
  ]);

  // Determine invalid region IDs for red error dots (memoized across timer ticks)
  const { invalidRegionIds } = useMemo(
    () => isPuzzleSolved(puzzle, gameState.placements),
    [puzzle, gameState.placements]
  );
  const displayedInvalidRegions = useMemo(
    () => (gameState.validationMode === 'repair' ? invalidRegionIds : []),
    [gameState.validationMode, invalidRegionIds]
  );

  // Filter unused dominoes for tray (memoized across timer ticks)
  const placedIds = useMemo(
    () => new Set(gameState.placements.map((p) => p.dominoId)),
    [gameState.placements]
  );
  const unusedDominoes = useMemo(
    () => puzzle.dominoes.filter((d) => !placedIds.has(d.id)),
    [puzzle.dominoes, placedIds]
  );

  // Active dragging domino definition
  const draggingDomino = dragState
    ? puzzle.dominoes.find((d) => d.id === dragState.dominoId)
    : null;

  const [isAutoSolving, setIsAutoSolving] = useState(false);
  const [flyingDomino, setFlyingDomino] = useState<FlyingDominoState | null>(null);
  const [completionDismissed, setCompletionDismissed] = useState(false);
  const solveRunIdRef = useRef(0);
  const showSolveButton = isSolveOptionEnabled();

  useEffect(() => {
    if (!gameState.solved) {
      setCompletionDismissed(false);
    }
  }, [gameState.solved]);

  useEffect(() => {
    return () => {
      solveRunIdRef.current += 1;
    };
  }, []);

  const stopSolveAnimation = useCallback(() => {
    solveRunIdRef.current += 1;
    setIsAutoSolving(false);
    setFlyingDomino(null);
  }, []);

  const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const nextFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  const startSolveAnimation = useCallback(async () => {
    const res = solvePuzzle(puzzle, 200000, 1);
    if (!res.solvable || !res.solution) {
      alert('No valid mathematical solution found for this puzzle.');
      return;
    }

    const runId = ++solveRunIdRef.current;
    deselectDomino();
    setCompletionDismissed(false);
    setIsAutoSolving(true);
    setFlyingDomino(null);

    // Check if existing placements on the board match the target solution so we can resume seamlessly
    const solutionByDomino = new Map(res.solution.map((p) => [p.dominoId, p]));
    const currentPlacements = latestGameStateRef.current.placements;
    const hasMismatch = currentPlacements.some((curr) => {
      const target = solutionByDomino.get(curr.dominoId);
      return (
        !target ||
        target.cellA !== curr.cellA ||
        target.cellB !== curr.cellB ||
        target.rotation !== curr.rotation
      );
    });

    let alreadyPlacedIds = new Set<string>();
    if (hasMismatch) {
      setGameState((prev) => resetGameState(puzzle, prev));
    } else {
      alreadyPlacedIds = new Set(currentPlacements.map((p) => p.dominoId));
    }

    // Order remaining placements by tray order so dominoes animate sequentially from the tray
    const dominoOrder = new Map(puzzle.dominoes.map((d, idx) => [d.id, idx]));
    const orderedPlacements = [...res.solution]
      .filter((p) => !alreadyPlacedIds.has(p.dominoId))
      .sort((a, b) => (dominoOrder.get(a.dominoId) ?? 0) - (dominoOrder.get(b.dominoId) ?? 0));

    const minRow = puzzle.cells.length > 0 ? Math.min(...puzzle.cells.map((c) => c.row)) : 0;
    const minCol = puzzle.cells.length > 0 ? Math.min(...puzzle.cells.map((c) => c.col)) : 0;
    const padding = cellSize * 0.30;

    const count = puzzle.dominoes.length;
    const trayCellSize = count > 10 ? 34 : count > 6 ? 38 : 42;
    const startScale = trayCellSize / cellSize;

    await nextFrame();

    for (const placement of orderedPlacements) {
      if (solveRunIdRef.current !== runId) return;

      const svg = boardSvgRef.current;
      const slotEl = document.querySelector(
        `[data-domino-slot-id="${placement.dominoId}"]`
      ) as HTMLElement | null;

      let startX = window.innerWidth / 2;
      let startY = window.innerHeight - 80;
      if (slotEl) {
        const rect = slotEl.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }

      const parsedA = parseCellId(placement.cellA);
      const parsedB = parseCellId(placement.cellB);
      const svgMidX = padding + ((parsedA.col + parsedB.col) / 2 - minCol + 0.5) * cellSize;
      const svgMidY = padding + ((parsedA.row + parsedB.row) / 2 - minRow + 0.5) * cellSize;

      let endX = window.innerWidth / 2;
      let endY = window.innerHeight / 3;
      let endScale = 1;

      if (svg) {
        const ctm = svg.getScreenCTM();
        if (ctm) {
          const pt = svg.createSVGPoint();
          pt.x = svgMidX;
          pt.y = svgMidY;
          const screenPt = pt.matrixTransform(ctm);
          endX = screenPt.x;
          endY = screenPt.y;
          endScale = ctm.a;
        }
      }

      setFlyingDomino({
        dominoId: placement.dominoId,
        x: startX,
        y: startY,
        angle: 0,
        scale: startScale,
        animate: false
      });

      await nextFrame();
      if (solveRunIdRef.current !== runId) return;

      setFlyingDomino({
        dominoId: placement.dominoId,
        x: endX,
        y: endY,
        angle: placement.rotation * 90,
        scale: endScale,
        animate: true
      });

      await waitMs(420);
      if (solveRunIdRef.current !== runId) return;

      setGameState((prev) => {
        const placed = placeDominoOnBoard(
          prev,
          placement.dominoId,
          placement.cellA,
          placement.cellB,
          placement.rotation
        );
        return placed.nextState;
      });
      setFlyingDomino(null);

      await waitMs(55);
    }

    if (solveRunIdRef.current === runId) {
      setIsAutoSolving(false);
      setFlyingDomino(null);
    }
  }, [puzzle, cellSize, deselectDomino]);

  useEffect(() => {
    if (autoSolve) {
      const timer = setTimeout(() => {
        onAutoSolveStarted?.();
        startSolveAnimation();
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [autoSolve, onAutoSolveStarted, startSolveAnimation]);

  const activeFlyingDominoDef = flyingDomino
    ? puzzle.dominoes.find((d) => d.id === flyingDomino.dominoId)
    : null;

  return (
    <div
      className="play-screen-root no-touch-scroll"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        maxHeight: '100dvh',
        width: '100vw',
        maxWidth: '100vw',
        overflow: 'hidden',
        position: 'relative',
        background: '#ffffff'
      }}
      onPointerMove={isAutoSolving ? undefined : handlePointerMove}
      onPointerUp={isAutoSolving ? undefined : handlePointerUp}
      onPointerCancel={isAutoSolving ? undefined : handlePointerUp}
    >
      {/* Header bar */}
      <GameStatus
        puzzleName={puzzle.name ?? 'Pips Puzzle'}
        elapsedMs={gameState.elapsedMs}
        validationMode={gameState.validationMode}
        statusMessage={gameState.statusMessage}
        onReset={() => {
          stopSolveAnimation();
          setCompletionDismissed(false);
          setGameState((prev) => resetGameState(puzzle, prev));
        }}
        onBack={() => {
          stopSolveAnimation();
          onBack();
        }}
        onSolve={showSolveButton && !gameState.solved ? startSolveAnimation : undefined}
        onStopSolve={stopSolveAnimation}
        isSolving={isAutoSolving}
      />

      {/* Main Board view */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2px 4px',
          overflow: 'hidden',
          position: 'relative',
          background: '#ffffff'
        }}
        onClick={(e) => {
          if (!isAutoSolving && e.target === e.currentTarget) {
            deselectDomino();
          }
        }}
      >
        <PuzzleBoard
          puzzle={puzzle}
          placements={effectivePlacements}
          invalidRegionIds={displayedInvalidRegions}
          cellSize={cellSize}
          dragCandidate={dragCandidate}
          selectedDominoId={selectedDominoId}
          selectedPlacement={selectedPlacement}
          draggingDominoId={draggingDominoId}
          onDominoPointerDown={isAutoSolving ? undefined : handlePointerDown}
          onCellClick={isAutoSolving ? undefined : deselectDomino}
          onEmptyBoardClick={isAutoSolving ? undefined : deselectDomino}
          boardRef={boardSvgRef}
        />
      </main>

      {/* Domino Tray */}
      <DominoTray
        dominoes={puzzle.dominoes}
        unusedDominoes={unusedDominoes}
        placedDominoIds={placedIds}
        draggingDominoId={flyingDomino?.dominoId ?? (dragState?.hasMoved ? dragState.dominoId : null)}
        totalDominoCount={puzzle.dominoes.length}
        dominoRotations={gameState.dominoRotations}
        onDominoClick={() => {}}
        onDominoPointerDown={isAutoSolving ? () => {} : handlePointerDown}
        onEmptyClick={isAutoSolving ? undefined : deselectDomino}
      />

      {/* Auto-solve flying domino animation */}
      {flyingDomino && activeFlyingDominoDef && (
        <div
          style={{
            position: 'fixed',
            left: `${flyingDomino.x}px`,
            top: `${flyingDomino.y}px`,
            transform: `translate(-50%, -50%) rotate(${flyingDomino.angle}deg) scale(${flyingDomino.scale})`,
            transformOrigin: 'center center',
            transition: flyingDomino.animate
              ? 'left 400ms cubic-bezier(0.22, 1, 0.36, 1), top 400ms cubic-bezier(0.22, 1, 0.36, 1), transform 400ms cubic-bezier(0.22, 1, 0.36, 1)'
              : 'none',
            pointerEvents: 'none',
            zIndex: 9999
          }}
        >
          <Domino
            domino={activeFlyingDominoDef}
            rotation={0}
            cellSize={cellSize}
            isDragging={true}
          />
        </div>
      )}

      {/* Floating dragging ghost piece */}
      {dragState && dragState.hasMoved && draggingDomino && (
        <div
          style={{
            position: 'fixed',
            left: dragState.currentX,
            top: dragState.currentY,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 9999
          }}
        >
          <Domino
            domino={draggingDomino}
            rotation={dragState.rotation}
            cellSize={cellSize}
            isDragging={true}
          />
        </div>
      )}

      {/* Completion Dialog */}
      {gameState.solved && !completionDismissed && (
        <CompletionDialog
          elapsedMs={gameState.elapsedMs}
          moves={gameState.moves}
          onClose={() => setCompletionDismissed(true)}
          onPlayAgain={() => {
            setCompletionDismissed(false);
            setGameState(resetGameState(puzzle));
          }}
          onImportAnother={onImportAnother}
        />
      )}
    </div>
  );
};
