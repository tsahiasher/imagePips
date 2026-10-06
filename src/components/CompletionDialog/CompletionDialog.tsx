import React from 'react';
import { Trophy, RotateCcw, ArrowRight } from 'lucide-react';
import { formatElapsedTime } from '../../game/timer';

interface CompletionDialogProps {
  elapsedMs: number;
  moves: number;
  onPlayAgain: () => void;
  onImportAnother: () => void;
}

export const CompletionDialog: React.FC<CompletionDialogProps> = ({
  elapsedMs,
  moves,
  onPlayAgain,
  onImportAnother
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(5, 8, 16, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-title"
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          maxWidth: '420px',
          width: '100%',
          padding: '32px 28px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.25)'
        }}
      >
        {/* Animated celebration icon */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px rgba(99, 102, 241, 0.6)'
          }}
        >
          <Trophy size={36} color="#ffffff" />
        </div>

        <div>
          <h2
            id="completion-title"
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(to right, #ffffff, #a5b4fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Puzzle Solved!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            All conditions satisfied & all dominoes placed!
          </p>
        </div>

        {/* Stats card */}
        <div
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '12px',
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Time
            </span>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#38bdf8'
              }}
            >
              {formatElapsedTime(elapsedMs)}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Moves
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {moves}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          <button
            onClick={onPlayAgain}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}
          >
            <RotateCcw size={18} />
            <span>Play Again</span>
          </button>

          <button
            onClick={onImportAnother}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}
          >
            <span>Import Another Puzzle</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
