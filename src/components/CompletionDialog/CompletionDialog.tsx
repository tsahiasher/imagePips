import React from 'react';
import { Trophy, RotateCcw, ArrowRight, Eye, X } from 'lucide-react';
import { formatElapsedTime } from '../../game/timer';

interface CompletionDialogProps {
  elapsedMs: number;
  moves: number;
  onClose: () => void;
  onPlayAgain: () => void;
  onImportAnother: () => void;
}

export const CompletionDialog: React.FC<CompletionDialogProps> = ({
  elapsedMs,
  moves,
  onClose,
  onPlayAgain,
  onImportAnother
}) => {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(15, 23, 42, 0.45)',
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
          position: 'relative',
          maxWidth: '420px',
          width: '100%',
          padding: '32px 28px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.18)'
        }}
      >
        <button
          id="close-completion-dialog-btn"
          onClick={onClose}
          aria-label="Close popup and view solved board"
          title="Close and view solved board"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>
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
            boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)'
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
              color: '#0f172a'
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
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            border: '1px solid #e2e8f0'
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
                color: '#0284c7'
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
            id="view-solved-board-btn"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
            }}
          >
            <Eye size={18} />
            <span>View Solved Board</span>
          </button>

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
              cursor: 'pointer',
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
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer'
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
