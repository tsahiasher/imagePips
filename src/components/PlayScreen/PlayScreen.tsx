import React, { useEffect, useRef, useState } from 'react';
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
import { saveActiveSession } from '../../persistence/storage';
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

  const boardSvgRef = useRef<SVGSVGElement | null>(null);
  const cellSize = 70;

  const {
    dragState,
    dragCandidate,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  } = useDominoDrag(gameState, setGameState, boardSvgRef, cellSize);

  // Timer loop
  useEffect(() => {
    if (!gameState.timerRunning || gameState.solved) return;

    const interval = setInterval(() => {
      setGameState((prev) => tickTimer(prev, performance.now()));
    }, 250);

    return () => clearInterval(interval);
  }, [gameState.timerRunning, gameState.solved]);

  // Persist session whenever state changes
  useEffect(() => {
    saveActiveSession(puzzle, gameState);
  }, [puzzle, gameState]);

  // Determine invalid region IDs for red error dots
  const { invalidRegionIds } = isPuzzleSolved(puzzle, gameState.placements);
  const displayedInvalidRegions =
    gameState.validationMode === 'repair' ? invalidRegionIds : [];

  // Filter unused dominoes for tray
  const placedIds = new Set(gameState.placements.map((p) => p.dominoId));
  const unusedDominoes = puzzle.dominoes.filter((d) => !placedIds.has(d.id));

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
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        position: 'relative'
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
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '12px',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <PuzzleBoard
          puzzle={puzzle}
          placements={gameState.placements}
          invalidRegionIds={displayedInvalidRegions}
          cellSize={cellSize}
          dragCandidate={dragCandidate}
          onDominoPointerDown={handlePointerDown}
          boardRef={boardSvgRef}
        />
      </main>

      {/* Domino Tray */}
      <DominoTray
        unusedDominoes={unusedDominoes}
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
