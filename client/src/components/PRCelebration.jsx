import { useState, useEffect, useRef } from 'react';

const CONFETTI_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];
const CONFETTI_COUNT = 30;

const STYLE_ID = 'pr-celebration-keyframes';

const KEYFRAMES_CSS = `
@keyframes prConfettiFall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes prCardEntry {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
`;

function buildConfetti() {
  const pieces = [];
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    pieces.push({
      id: i,
      left: Math.random() * 100,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 2.5,
      duration: 2 + Math.random() * 3,
      isCircle: Math.random() > 0.5,
    });
  }
  return pieces;
}

export default function PRCelebration({ show, exercise, newWeight, oldWeight, onClose }) {
  const [confetti] = useState(() => buildConfetti());
  const timerRef = useRef(null);

  // Inject keyframe styles on mount, remove on unmount
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = KEYFRAMES_CSS;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
    };
  }, []);

  // Auto-close after 5 seconds
  useEffect(() => {
    if (!show) return;
    timerRef.current = setTimeout(() => {
      onClose();
    }, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show, onClose]);

  if (!show) return null;

  const improvement = oldWeight != null ? newWeight - oldWeight : null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>

        {/* Close button */}
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Trophy icon */}
        <div style={styles.trophyWrap}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <path d="M18 10h20v6a10 10 0 01-20 0v-6z" fill="#f59e0b" />
            <path d="M14 10h-4a4 4 0 000 8h4" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M42 10h4a4 4 0 010 8h-4" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="24" y="26" width="8" height="8" rx="1" fill="#f59e0b" />
            <rect x="20" y="34" width="16" height="4" rx="2" fill="#f59e0b" />
            <path d="M28 20l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6L23.1 35l.9-5.3-4-3.9 5.5-.8L28 20z"
              fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
          </svg>
        </div>

        {/* Heading */}
        <h2 style={styles.heading}>NEW PERSONAL RECORD!</h2>

        {/* Exercise name */}
        <p style={styles.exerciseName}>{exercise}</p>

        {/* Weight display */}
        <div style={styles.weightRow}>
          {oldWeight != null ? (
            <>
              <span style={styles.oldWeight}>{oldWeight} kg</span>
              <span style={styles.arrow}>
                <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
                  <path d="M2 8h20m0 0l-5-5m5 5l-5 5" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span style={styles.newWeight}>{newWeight} kg</span>
            </>
          ) : (
            <span style={styles.newWeight}>{newWeight} kg</span>
          )}
        </div>

        {/* Improvement badge OR first PR */}
        {improvement != null ? (
          <span style={styles.badge}>+{improvement} kg</span>
        ) : (
          <span style={styles.firstPr}>First PR!</span>
        )}

        {/* Motivational subtitle */}
        <p style={styles.subtitle}>Keep crushing it!</p>

        {/* Primary button */}
        <button style={styles.niceBtn} onClick={onClose}>Nice!</button>
      </div>

      {/* Confetti layer */}
      {confetti.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            top: -12,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            animation: `prConfettiFall ${p.duration}s ease-in ${p.delay}s both`,
            pointerEvents: 'none',
            zIndex: 10001,
          }}
        />
      ))}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  card: {
    position: 'relative',
    background: 'var(--bg-card)',
    borderRadius: 16,
    padding: '40px 32px 32px',
    maxWidth: 400,
    width: '90%',
    textAlign: 'center',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border)',
    animation: 'prCardEntry 200ms ease-out both',
    zIndex: 10002,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  trophyWrap: {
    marginBottom: 16,
  },
  heading: {
    color: 'var(--accent)',
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    margin: '0 0 8px',
  },
  exerciseName: {
    color: 'var(--text-primary)',
    fontSize: 24,
    fontWeight: 700,
    margin: '0 0 20px',
    lineHeight: 1.3,
  },
  weightRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  oldWeight: {
    color: 'var(--text-secondary)',
    fontSize: 22,
    fontWeight: 600,
    textDecoration: 'line-through',
    textDecorationColor: 'var(--text-muted, var(--text-secondary))',
  },
  arrow: {
    display: 'flex',
    alignItems: 'center',
  },
  newWeight: {
    color: 'var(--accent)',
    fontSize: 32,
    fontWeight: 800,
  },
  badge: {
    display: 'inline-block',
    background: 'var(--accent-dim, rgba(34,197,94,0.1))',
    color: 'var(--accent)',
    fontWeight: 700,
    fontSize: 14,
    padding: '4px 14px',
    borderRadius: 20,
    marginBottom: 12,
  },
  firstPr: {
    display: 'inline-block',
    background: 'var(--accent-dim, rgba(34,197,94,0.1))',
    color: 'var(--accent)',
    fontWeight: 700,
    fontSize: 16,
    padding: '4px 16px',
    borderRadius: 20,
    marginBottom: 12,
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: 15,
    margin: '0 0 24px',
    fontWeight: 500,
  },
  niceBtn: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 48px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 150ms',
  },
};
