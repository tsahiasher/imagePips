import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Puzzle } from './domain/puzzle';
import { GameState } from './game/gameState';
import { loadActiveSession } from './persistence/storage';
import { ImportScreen } from './components/ImportScreen/ImportScreen';
import { VerificationScreen } from './components/VerificationScreen/VerificationScreen';
import { PlayScreen } from './components/PlayScreen/PlayScreen';
import { ManualEditor } from './components/ManualEditor/ManualEditor';

type AppView = 'import' | 'verify' | 'play' | 'manual';

const PULL_THRESHOLD = 80;

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('import');
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
  const [activeGameState, setActiveGameState] = useState<Partial<GameState> | undefined>(undefined);
  const [sourceImageUrl, setSourceImageUrl] = useState<string>('');
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [autoSolveRequested, setAutoSolveRequested] = useState(false);

  // Pull-to-refresh state for Android touch gesture
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false
  });

  useEffect(() => {
    const saved = loadActiveSession();
    if (saved && saved.puzzle) {
      setHasSavedSession(true);
    }
  }, []);

  const hasScrolledAncestor = (el: EventTarget | null): boolean => {
    let curr = el as HTMLElement | null;
    while (curr && curr !== document.body) {
      if (curr.scrollTop > 0) return true;
      if (curr.classList?.contains('no-touch-scroll') || curr.closest?.('.domino-tray')) {
        return true;
      }
      if (curr.dataset?.zoomed === 'true' || curr.closest?.('[data-zoomed="true"]')) {
        return true;
      }
      curr = curr.parentElement;
    }
    return window.scrollY > 0;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing || e.touches.length !== 1) {
      pullStartRef.current.active = false;
      setPullDistance(0);
      return;
    }
    const visualScale = window.visualViewport?.scale ?? 1;
    if (visualScale > 1.05 || hasScrolledAncestor(e.target)) {
      pullStartRef.current.active = false;
      return;
    }
    const touch = e.touches[0];
    // Allow starting pull-down gesture from upper half of screen
    if (touch.clientY <= window.innerHeight * 0.45) {
      pullStartRef.current = { x: touch.clientX, y: touch.clientY, active: true };
    } else {
      pullStartRef.current.active = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pullStartRef.current.active || isRefreshing) return;
    if (e.touches.length !== 1) {
      pullStartRef.current.active = false;
      setPullDistance(0);
      return;
    }
    const visualScale = window.visualViewport?.scale ?? 1;
    if (visualScale > 1.05) {
      pullStartRef.current.active = false;
      setPullDistance(0);
      return;
    }

    const touch = e.touches[0];
    const dy = touch.clientY - pullStartRef.current.y;
    const dx = Math.abs(touch.clientX - pullStartRef.current.x);

    if (dy <= 0 || dx > dy * 0.85) {
      if (dy < -5) {
        pullStartRef.current.active = false;
      }
      setPullDistance(0);
      return;
    }

    // Apply resistance curve after initial 12px deadzone
    if (dy > 12) {
      const damped = Math.min(130, (dy - 12) * 0.55);
      setPullDistance(damped);
    }
  };

  const handleTouchEnd = () => {
    if (!pullStartRef.current.active) return;
    pullStartRef.current.active = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(64);
      window.location.reload();
    } else {
      setPullDistance(0);
    }
  };

  const handleResumeSaved = () => {
    const saved = loadActiveSession();
    if (saved && saved.puzzle) {
      setActivePuzzle(saved.puzzle);
      setActiveGameState(saved.savedState);
      setView('play');
    }
  };

  const handlePuzzleReadyFromImport = (
    puzzle: Puzzle,
    imgUrl: string
  ) => {
    setActivePuzzle(puzzle);
    setSourceImageUrl(imgUrl);
    setActiveGameState(undefined);
    setView('verify');
  };

  const handleDirectPlay = (puzzle: Puzzle) => {
    setActivePuzzle(puzzle);
    setActiveGameState(undefined);
    setAutoSolveRequested(false);
    setView('play');
  };

  const handleStartPuzzleFromVerify = (verifiedPuzzle: Puzzle) => {
    setActivePuzzle(verifiedPuzzle);
    setActiveGameState(undefined);
    setAutoSolveRequested(false);
    setView('play');
  };

  const handleSolvePuzzle = (puzzle: Puzzle) => {
    setActivePuzzle(puzzle);
    setActiveGameState(undefined);
    setAutoSolveRequested(true);
    setView('play');
  };

  return (
    <div
      className="app-root"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{
            position: 'fixed',
            top: `${Math.min(72, pullDistance - 36)}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: pullDistance >= PULL_THRESHOLD || isRefreshing ? '#4f46e5' : '#64748b',
            pointerEvents: 'none',
            transition: pullStartRef.current.active ? 'none' : 'top 0.2s ease'
          }}
        >
          <RefreshCw
            size={20}
            style={{
              transform: `rotate(${Math.round(pullDistance * 3.5)}deg)`
            }}
          />
        </div>
      )}

      {view === 'import' && (
        <ImportScreen
          onPuzzleReady={handlePuzzleReadyFromImport}
          onBuildManually={() => setView('manual')}
          onResumeSaved={handleResumeSaved}
          hasSavedSession={hasSavedSession}
        />
      )}

      {view === 'verify' && activePuzzle && (
        <VerificationScreen
          initialPuzzle={activePuzzle}
          sourceImageUrl={sourceImageUrl}
          onStartPuzzle={handleStartPuzzleFromVerify}
          onSolvePuzzle={handleSolvePuzzle}
          onBack={() => setView('import')}
        />
      )}

      {view === 'manual' && (
        <ManualEditor
          onStartPuzzle={handleDirectPlay}
          onSolvePuzzle={handleSolvePuzzle}
          onCancel={() => setView('import')}
        />
      )}

      {view === 'play' && activePuzzle && (
        <PlayScreen
          puzzle={activePuzzle}
          initialState={activeGameState}
          onBack={() => setView('import')}
          onImportAnother={() => setView('import')}
          autoSolve={autoSolveRequested}
          onAutoSolveStarted={() => setAutoSolveRequested(false)}
        />
      )}
    </div>
  );
};

export default App;

