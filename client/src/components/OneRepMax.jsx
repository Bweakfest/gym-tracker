import { useState, useRef, useEffect } from 'react';
import { best1RMFromSets } from '../utils/formulas';

const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70];

export default function OneRepMax({ setsData }) {
  const [expanded, setExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef(null);

  // Clear tooltip timer on unmount
  useEffect(() => {
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  // Compute 1RM from all sets
  const validSets = (setsData || []).filter(s => Number(s.weight) > 0 && Number(s.reps) > 0);
  if (validSets.length === 0) return null;

  const estimated1RM = Math.round(best1RMFromSets(validSets));

  if (estimated1RM <= 0) return null;

  const handleTooltip = (e) => {
    e.stopPropagation();
    setShowTooltip(true);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setShowTooltip(false), 3000);
  };

  return (
    <div style={styles.wrapper}>
      {/* Badge row */}
      <div
        style={styles.badge}
        onClick={() => setExpanded(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpanded(v => !v); }}
      >
        {/* Dumbbell icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 6.5h11v11h-11z" opacity="0" />
          <rect x="2" y="9" width="4" height="6" rx="1" />
          <rect x="18" y="9" width="4" height="6" rx="1" />
          <line x1="6" y1="12" x2="18" y2="12" />
          <rect x="6" y="7" width="3" height="10" rx="1" />
          <rect x="15" y="7" width="3" height="10" rx="1" />
        </svg>

        <span style={styles.badgeText}>Est. 1RM: {estimated1RM} kg</span>

        {/* Info tooltip trigger */}
        <span
          onClick={handleTooltip}
          style={styles.infoBtn}
          role="button"
          tabIndex={0}
          aria-label="What is 1RM?"
        >?</span>

        {/* Expand chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div style={styles.tooltip}>
          Estimated using the Epley formula: 1RM = weight x (1 + reps/30)
        </div>
      )}

      {/* Percentage table */}
      {expanded && (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span style={styles.thCell}>%</span>
            <span style={styles.thCell}>Weight</span>
          </div>
          {PERCENTAGES.map((pct, i) => (
            <div
              key={pct}
              style={{
                ...styles.tableRow,
                background: i % 2 === 0
                  ? 'rgba(34,197,94,0.06)'
                  : 'transparent',
              }}
            >
              <span style={styles.pctCell}>
                {pct}%
                {pct === 100 && <span style={styles.maxTag}>MAX</span>}
              </span>
              <span style={styles.weightCell}>
                {Math.round(estimated1RM * pct / 100)} kg
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'relative',
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    background: 'var(--accent)',
    borderRadius: 20,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
    outline: 'none',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.01em',
    lineHeight: 1,
  },
  infoBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    lineHeight: 1,
    flexShrink: 0,
    outline: 'none',
  },
  tooltip: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 6,
    padding: '8px 12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    fontSize: 11,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    boxShadow: 'var(--shadow)',
    zIndex: 10,
    whiteSpace: 'nowrap',
    maxWidth: 280,
  },
  table: {
    marginTop: 8,
    width: '100%',
    minWidth: 180,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: 'var(--shadow)',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 14px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(34,197,94,0.08)',
  },
  thCell: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tableRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '7px 14px',
    transition: 'background 0.15s',
  },
  pctCell: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  maxTag: {
    fontSize: 9,
    fontWeight: 700,
    color: 'var(--accent)',
    background: 'rgba(34,197,94,0.15)',
    padding: '1px 5px',
    borderRadius: 4,
    letterSpacing: '0.04em',
  },
  weightCell: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
  },
};
