import React from 'react';
import { ArrowLeft, RotateCcw, Clock } from 'lucide-react';
import { formatElapsedTime } from '../../game/timer';

interface GameStatusProps {
  puzzleName?: string;
  elapsedMs: number;
  validationMode?: 'normal' | 'repair';
  statusMessage?: string | null;
  onReset: () => void;
  onBack: () => void;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  elapsedMs,
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
            title="Reset Board Placements"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
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
