import React from 'react';
import { ArrowLeft, RotateCcw, Clock, Wand2, Square } from 'lucide-react';
import { formatElapsedTime } from '../../game/timer';

interface GameStatusProps {
  puzzleName?: string;
  elapsedMs: number;
  validationMode?: 'normal' | 'repair';
  statusMessage?: string | null;
  onReset: () => void;
  onBack: () => void;
  onSolve?: () => void;
  onStopSolve?: () => void;
  isSolving?: boolean;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  elapsedMs,
  onReset,
  onBack,
  onSolve,
  onStopSolve,
  isSolving = false
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
        padding: '6px 14px',
        gap: '4px'
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
              padding: '5px 10px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
            title="Return to Menu / Verification"
          >
            <ArrowLeft size={15} />
            <span>Puzzles</span>
          </button>

          <button
            onClick={onReset}
            disabled={isSolving}
            className="header-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: isSolving ? '#94a3b8' : '#0f172a',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: isSolving ? 'not-allowed' : 'pointer'
            }}
            title="Reset Board Placements"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          {(onSolve || isSolving) && (
            <button
              id="play-solve-btn"
              onClick={isSolving ? onStopSolve : onSolve}
              className="header-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '8px',
                background: isSolving
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: isSolving
                  ? '0 2px 6px rgba(239, 68, 68, 0.35)'
                  : '0 2px 6px rgba(99, 102, 241, 0.3)'
              }}
              title={isSolving ? 'Stop solve animation' : 'Auto-solve puzzle with animation'}
            >
              {isSolving ? <Square size={13} fill="#ffffff" /> : <Wand2 size={14} />}
              <span>{isSolving ? 'Stop' : 'Solve'}</span>
            </button>
          )}
        </div>

        {/* Right: Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '20px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#334155',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
            fontWeight: 700
          }}
          aria-label={`Elapsed time: ${formatElapsedTime(elapsedMs)}`}
        >
          <Clock size={15} />
          <span>{formatElapsedTime(elapsedMs)}</span>
        </div>
      </div>

    </header>
  );
};
