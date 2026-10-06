import React, { useState, useEffect } from 'react';
import { Puzzle } from './domain/puzzle';
import { GameState } from './game/gameState';
import { loadActiveSession } from './persistence/storage';
import { ImportScreen } from './components/ImportScreen/ImportScreen';
import { VerificationScreen } from './components/VerificationScreen/VerificationScreen';
import { PlayScreen } from './components/PlayScreen/PlayScreen';
import { ManualEditor } from './components/ManualEditor/ManualEditor';

type AppView = 'import' | 'verify' | 'play' | 'manual';

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('import');
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
  const [activeGameState, setActiveGameState] = useState<Partial<GameState> | undefined>(undefined);
  const [sourceImageUrl, setSourceImageUrl] = useState<string>('');
  const [hasSavedSession, setHasSavedSession] = useState(false);

  useEffect(() => {
    const saved = loadActiveSession();
    if (saved && saved.puzzle) {
      setHasSavedSession(true);
    }
  }, []);

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
    setView('play');
  };

  const handleStartPuzzleFromVerify = (verifiedPuzzle: Puzzle) => {
    setActivePuzzle(verifiedPuzzle);
    setActiveGameState(undefined);
    setView('play');
  };

  return (
    <div className="app-root">
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
          onBack={() => setView('import')}
        />
      )}

      {view === 'manual' && (
        <ManualEditor
          onStartPuzzle={handleDirectPlay}
          onCancel={() => setView('import')}
        />
      )}

      {view === 'play' && activePuzzle && (
        <PlayScreen
          puzzle={activePuzzle}
          initialState={activeGameState}
          onBack={() => setView('import')}
          onImportAnother={() => setView('import')}
        />
      )}
    </div>
  );
};

export default App;
