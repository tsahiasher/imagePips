import React, { useState, useEffect } from 'react';
import {
  Upload,
  Edit3,
  AlertCircle
} from 'lucide-react';
import { Puzzle } from '../../domain/puzzle';
import { importPuzzleFromImage, ImportProgressUpdate } from '../../importer/importPuzzle';

interface ImportScreenProps {
  onPuzzleReady: (puzzle: Puzzle, sourceImageUrl: string) => void;
  onBuildManually: () => void;
  onResumeSaved: () => void;
  hasSavedSession: boolean;
}

export const ImportScreen: React.FC<ImportScreenProps> = ({
  onPuzzleReady,
  onBuildManually,
  onResumeSaved,
  hasSavedSession
}) => {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [progress, setProgress] = useState<ImportProgressUpdate | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle clipboard paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleProcessImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const currentSessionIdRef = React.useRef<string>('');

  const handleProcessImageFile = async (file: File) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    currentSessionIdRef.current = sessionId;
    setErrorMessage(null);
    setProgress({ stage: 'Starting fresh import session…', percent: 5 });

    try {
      const { puzzle, debugData } = await importPuzzleFromImage(
        file,
        (update) => {
          if (currentSessionIdRef.current === sessionId) {
            setProgress(update);
          }
        },
        sessionId
      );

      if (currentSessionIdRef.current !== sessionId) {
        return; // Ignore stale result from cancelled or superseded session
      }

      (window as any).__lastImportResult = { puzzle, debugData };
      onPuzzleReady(puzzle, debugData.sourceImageUrl);
    } catch (err) {
      if (currentSessionIdRef.current !== sessionId) return;
      console.error(err);
      setErrorMessage('Failed to process screenshot locally. Please try another image or build manually.');
      setProgress(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleProcessImageFile(file);
    }
  };

  return (
    <div
      className="import-screen-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        minHeight: '100dvh',
        width: '100vw',
        padding: '16px 14px',
        boxSizing: 'border-box',
        background: '#f8fafc',
        color: 'var(--text-main)',
        overflow: 'hidden'
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={handleDrop}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* Logo and title */}
        <div style={{ textAlign: 'center' }}>
          <img
            src="/icon.jpg"
            alt="Pips Logo"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              objectFit: 'cover',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              marginBottom: '12px'
            }}
          />

          <h1
            style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#0f172a',
              margin: 0
            }}
          >
            Pips from image
          </h1>
        </div>

        {/* Resume session button (grayed out if no session) */}
        <button
          onClick={hasSavedSession ? onResumeSaved : undefined}
          disabled={!hasSavedSession}
          style={{
            width: '100%',
            maxWidth: '360px',
            padding: '12px 24px',
            borderRadius: '12px',
            background: hasSavedSession
              ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
              : '#f1f5f9',
            color: hasSavedSession ? '#ffffff' : '#94a3b8',
            border: hasSavedSession ? 'none' : '1px solid #e2e8f0',
            fontWeight: 700,
            fontSize: '0.95rem',
            boxShadow: hasSavedSession ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none',
            cursor: hasSavedSession ? 'pointer' : 'not-allowed',
            textAlign: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          Resume Puzzle
        </button>

        {/* Progress or Drag/Drop Area */}
        {progress ? (
          <div
            style={{
              width: '100%',
              padding: '30px 20px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1px solid #c7d2fe',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                border: '4px solid #e0e7ff',
                borderTopColor: '#4f46e5',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
            <div style={{ textAlign: 'center', width: '100%', maxWidth: '300px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#312e81' }}>
                {progress.stage}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', marginBottom: '10px' }}>
                Local browser image analysis ({progress.percent}%)
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '999px',
                  background: '#e2e8f0',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${Math.max(5, Math.min(100, progress.percent))}%`,
                    height: '100%',
                    borderRadius: '999px',
                    background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
                    transition: 'width 0.18s ease-out'
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <label
            htmlFor="screenshot-upload-input"
            style={{
              width: '100%',
              padding: '32px 18px',
              borderRadius: '16px',
              border: isDraggingFile ? '2px dashed #6366f1' : '2px dashed #cbd5e1',
              background: isDraggingFile ? '#eef2ff' : '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              id="screenshot-upload-input"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Upload size={22} color="#4f46e5" />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                Drop screenshot here, or click to browse
              </div>
            </div>
          </label>
        )}

        {(() => {
          if (typeof window === 'undefined') return false;
          try {
            const params = new URLSearchParams(window.location.search);
            return params.get('debug') === '1' || params.get('debug') === 'true';
          } catch {
            return false;
          }
        })() && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '10px' }}>
            {['game1', 'game2', 'game3', 'game4', 'game5', 'game6', 'game7', 'game8', 'game9', 'game10', 'game11', 'game12'].map((g) => (
              <button
                key={g}
                id={`test-${g}-btn`}
                type="button"
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: '#e2e8f0',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#334155'
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const res = await fetch(`/${g}.jpg`);
                    const blob = await res.blob();
                    const file = new File([blob], `${g}.jpg`, { type: 'image/jpeg' });
                    handleProcessImageFile(file);
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                Test {g}
              </button>
            ))}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.85rem'
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Build Manually Button */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onBuildManually}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.86rem',
              transition: 'background 0.15s ease'
            }}
          >
            <Edit3 size={16} color="#4f46e5" />
            <span>Build Manually</span>
          </button>
        </div>
      </div>
    </div>
  );
};
