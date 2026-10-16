import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Domino } from '../Domino/Domino';
import { DominoTray } from '../DominoTray/DominoTray';
import { GameStatus } from '../GameStatus/GameStatus';
import { PuzzleBoard } from '../PuzzleBoard/PuzzleBoard';
import { CompletionDialog } from '../CompletionDialog/CompletionDialog';
import {
  GameState,
  initGameState,
  resetGameState,
  tickTimer
} from '../../game/gameState';
import { isPuzzleSolved } from '../../game/constraintEngine';
import { useDominoDrag } from '../../game/useDominoDrag';
import { saveActiveGameState, saveActivePuzzle } from '../../persistence/storage';
import { Puzzle } from '../../domain/puzzle';

interface PlayScreenProps {
  puzzle: Puzzle;
  initialState?: Partial<GameState>;
  onBack: () => void;
  onImportAnother: () => void;
}

export const PlayScreen: React.FC<PlayScreenProps> = ({
  puzzle,
  initialState,
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
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Header bar */}
      <GameStatus
        puzzleName={puzzle.name ?? 'Pips Puzzle'}
        elapsedMs={gameState.elapsedMs}
        validationMode={gameState.validationMode}
        statusMessage={gameState.statusMessage}
        onReset={() => setGameState((prev) => resetGameState(puzzle, prev))}
        onBack={onBack}
      />

      {/* Main Board view */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '6px 12px',
          overflow: 'hidden',
          position: 'relative',
          background: '#ffffff'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
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
          onDominoPointerDown={handlePointerDown}
          onCellClick={deselectDomino}
          onEmptyBoardClick={deselectDomino}
          boardRef={boardSvgRef}
        />
      </main>

      {/* Domino Tray */}
      <DominoTray
        dominoes={puzzle.dominoes}
        unusedDominoes={unusedDominoes}
        placedDominoIds={placedIds}
        draggingDominoId={dragState?.hasMoved ? dragState.dominoId : null}
        totalDominoCount={puzzle.dominoes.length}
        dominoRotations={gameState.dominoRotations}
        onDominoClick={() => {}}
        onDominoPointerDown={handlePointerDown}
      />

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
      {gameState.solved && (
        <CompletionDialog
          elapsedMs={gameState.elapsedMs}
          moves={gameState.moves}
          onPlayAgain={() => setGameState(resetGameState(puzzle))}
          onImportAnother={onImportAnother}
        />
      )}
    </div>
  );
};
