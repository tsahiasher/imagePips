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
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
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
                border: '4px solid rgba(99, 102, 241, 0.2)',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#a5b4fc' }}>
                {progress.stage}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Local browser image analysis ({progress.percent}%)
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
