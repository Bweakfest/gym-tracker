import { useState, useEffect, useRef } from 'react';

const RATINGS = [
  { key: 'bad',     icon: '\uD83D\uDE24', label: 'Tough',  bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   active: 'rgba(239,68,68,0.25)' },
  { key: 'neutral', icon: '\uD83D\uDE10', label: 'Okay',   bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  active: 'rgba(245,158,11,0.25)' },
  { key: 'good',    icon: '\uD83D\uDCAA', label: 'Great',  bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   active: 'rgba(34,197,94,0.25)' },
];

export default function SessionRating({ date, token, onSave }) {
  const [rating, setRating] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);

  const [loadError, setLoadError] = useState('');

  // Load existing note for the date.
  // Top-level .catch + nested .catch make sure neither network nor JSON
  // parse errors bubble as an uncaught promise rejection.
  useEffect(() => {
    if (!date || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/session-notes?date=${date}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (cancelled || !data) return;
        if (data.rating) setRating(data.rating);
        if (data.notes) setNotes(data.notes);
      } catch (err) {
        console.warn('[session-notes] load failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [date, token]);

  const handleSave = async () => {
    if (!rating) return;
    setSaving(true);
    setLoadError('');
    try {
      const res = await fetch('/api/session-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date, rating, notes }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
      if (onSave) onSave({ date, rating, notes });
    } catch (err) {
      console.warn('[session-notes] save failed:', err);
      setLoadError('Could not save rating. Try again.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => { if (savedTimer.current) clearTimeout(savedTimer.current); };
  }, []);

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-6 0v4" />
            <path d="M18 8h-1a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Z" />
            <path d="M6 8H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Z" />
            <path d="M11 4a1 1 0 0 1 2 0v9a1 1 0 0 1-2 0V4Z" />
          </svg>
          <span style={styles.headerText}>Rate Your Session</span>
        </div>
        {saved && (
          <span style={styles.savedBadge}>
            Saved {'\u2713'}
          </span>
        )}
      </div>

      {/* Rating pills */}
      <div style={styles.ratingRow}>
        {RATINGS.map(r => {
          const isActive = rating === r.key;
          return (
            <button
              key={r.key}
              onClick={() => setRating(r.key)}
              style={{
                ...styles.ratingPill,
                background: isActive ? r.active : r.bg,
                borderColor: isActive ? r.border : 'transparent',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isActive ? `0 0 12px ${r.border}` : 'none',
              }}
            >
              <span style={styles.ratingIcon}>{r.icon}</span>
              <span style={{
                ...styles.ratingLabel,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Notes textarea */}
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="How did the session feel? Any notes..."
        rows={3}
        style={styles.textarea}
      />

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!rating || saving}
        style={{
          ...styles.saveBtn,
          opacity: (!rating || saving) ? 0.5 : 1,
          cursor: (!rating || saving) ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving...' : 'Save Rating'}
      </button>

      {loadError && (
        <div role="alert" style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>
          {loadError}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '20px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: 'var(--shadow)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  savedBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent)',
    background: 'rgba(34,197,94,0.12)',
    padding: '4px 10px',
    borderRadius: 20,
    animation: 'fadeInScale 0.3s ease',
  },
  ratingRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 14,
  },
  ratingPill: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px 8px',
    borderRadius: 12,
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    fontFamily: 'inherit',
  },
  ratingIcon: {
    fontSize: 24,
    lineHeight: 1,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  textarea: {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 12px',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    marginBottom: 12,
    minHeight: 60,
    transition: 'border-color 0.2s',
    lineHeight: 1.5,
  },
  saveBtn: {
    width: '100%',
    padding: '10px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
    letterSpacing: '0.01em',
  },
};
