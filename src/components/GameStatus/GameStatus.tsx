import React from 'react';
import { ArrowLeft, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { formatElapsedTime } from '../../game/timer';

interface GameStatusProps {
  puzzleName: string;
  elapsedMs: number;
  validationMode: 'normal' | 'repair';
  statusMessage: string | null;
  onReset: () => void;
  onBack: () => void;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  puzzleName,
  elapsedMs,
  validationMode,
  statusMessage,
  onReset,
  onBack
}) => {

  return (
    <header
      className="game-header-bar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 18px',
        gap: '6px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }}
      >
        {/* Left: Back and Reset buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onBack}
            className="header-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
            title="Return to Menu / Verification"
          >
            <ArrowLeft size={16} />
            <span>Puzzles</span>
          </button>

          <button
            onClick={onReset}
            className="header-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
            title="Reset Board Placements"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        </div>

        {/* Center: Puzzle title and Mode */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#0f172a'
            }}
          >
            {puzzleName}
          </h1>
          {validationMode === 'repair' && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                color: '#dc2626',
                fontWeight: 700,
                marginTop: '1px'
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#ef4444'
                }}
              />
              Repair Mode Active
            </div>
          )}
        </div>

        {/* Right: Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#334155',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.95rem',
            fontWeight: 700
          }}
          aria-label={`Elapsed time: ${formatElapsedTime(elapsedMs)}`}
        >
          <Clock size={16} />
          <span>{formatElapsedTime(elapsedMs)}</span>
        </div>
      </div>

      {/* Non-blocking message when in repair mode or wrong board */}
      {statusMessage && (
        <div
          className="animate-fade-in"
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            fontSize: '0.82rem',
            fontWeight: 600,
            alignSelf: 'center'
          }}
        >
          <AlertCircle size={15} color="#ef4444" />
          <span>{statusMessage}</span>
        </div>
      )}

    </header>
  );
};
