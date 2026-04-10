import { useState, useEffect } from 'react';

// ─── Mode A: Toggle/Settings ──────────────────────────────────────────────

export function OverloadToggle({ exercise, token, onUpdate }) {
  const [enabled, setEnabled] = useState(false);
  const [increment, setIncrement] = useState('2.5');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing progression rule for this exercise
  useEffect(() => {
    if (!exercise || !token) return;
    fetch('/api/progression', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(rules => {
        const rule = (Array.isArray(rules) ? rules : []).find(
          r => r.exercise === exercise
        );
        if (rule) {
          setEnabled(!!rule.enabled);
          setIncrement(String(rule.weight_increment ?? 2.5));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [exercise, token]);

  const handleToggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await save(next, increment);
  };

  const handleIncrement = (val) => {
    setIncrement(val);
    if (enabled) save(enabled, val);
  };

  const save = async (en, inc) => {
    setSaving(true);
    try {
      await fetch('/api/progression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise, weight_increment: Number(inc) || 2.5, enabled: en }),
      });
      if (onUpdate) onUpdate({ exercise, enabled: en, weight_increment: Number(inc) });
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div style={toggleStyles.card}>
      <div style={toggleStyles.row}>
        <div style={toggleStyles.labelWrap}>
          {/* Trending up icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          <span style={toggleStyles.label}>Progressive Overload</span>
        </div>

        {/* Toggle switch */}
        <button
          onClick={handleToggle}
          style={{
            ...toggleStyles.switch,
            background: enabled ? 'var(--accent)' : 'var(--border)',
          }}
          aria-label="Toggle progressive overload"
        >
          <div style={{
            ...toggleStyles.switchKnob,
            transform: enabled ? 'translateX(18px)' : 'translateX(2px)',
          }} />
        </button>
      </div>

      {/* Increment input, shown when enabled */}
      {enabled && (
        <div style={toggleStyles.incrementRow}>
          <span style={toggleStyles.incrementLabel}>Weight increment</span>
          <div style={toggleStyles.incrementInput}>
            <input
              type="number"
              value={increment}
              onChange={e => handleIncrement(e.target.value)}
              min="0.5"
              step="0.5"
              style={toggleStyles.input}
            />
            <span style={toggleStyles.unit}>kg</span>
          </div>
        </div>
      )}

      {saving && <span style={toggleStyles.savingText}>Saving...</span>}
    </div>
  );
}

// ─── Mode B: Suggestion Banner ────────────────────────────────────────────

export function OverloadBanner({ exercise, token }) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exercise || !token) { setLoading(false); return; }
    fetch(`/api/progression/suggest?exercise=${encodeURIComponent(exercise)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setSuggestion(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [exercise, token]);

  if (loading) return null;
  if (!suggestion || !suggestion.enabled) return null;

  const hasPrevious = suggestion.last_weight != null && suggestion.last_weight > 0;

  return (
    <div style={bannerStyles.card}>
      {/* Accent left border */}
      <div style={bannerStyles.accentBar} />

      <div style={bannerStyles.content}>
        {/* Header row */}
        <div style={bannerStyles.headerRow}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          <span style={bannerStyles.headerText}>Progressive Overload Active</span>
        </div>

        {hasPrevious ? (
          <div style={bannerStyles.body}>
            <span style={bannerStyles.bodyText}>
              Last session: <strong>{suggestion.last_weight} kg</strong>
              {' \u2192 '}
              This session: aim for{' '}
            </span>
            <span style={bannerStyles.targetWeight}>
              {suggestion.suggested_weight} kg
            </span>
            <span style={bannerStyles.incrementBadge}>
              +{suggestion.increment}
            </span>
          </div>
        ) : (
          <div style={bannerStyles.body}>
            <span style={bannerStyles.bodyText}>
              First session! Set your baseline.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Toggle Styles ────────────────────────────────────────────────────────

const toggleStyles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '14px 16px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  switch: {
    position: 'relative',
    width: 40,
    height: 22,
    borderRadius: 11,
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    padding: 0,
    outline: 'none',
  },
  switchKnob: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    top: 2,
    transition: 'transform 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  incrementRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid var(--border)',
  },
  incrementLabel: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  incrementInput: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    width: 60,
    padding: '5px 8px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'inherit',
    textAlign: 'right',
    outline: 'none',
  },
  unit: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  savingText: {
    display: 'block',
    marginTop: 8,
    fontSize: 11,
    color: 'var(--text-muted)',
  },
};

// ─── Banner Styles ────────────────────────────────────────────────────────

const bannerStyles = {
  card: {
    position: 'relative',
    display: 'flex',
    alignItems: 'stretch',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(20,184,166,0.1))',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    flexShrink: 0,
    background: 'var(--accent)',
    borderRadius: '4px 0 0 4px',
  },
  content: {
    flex: 1,
    padding: '12px 16px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  body: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 6,
  },
  bodyText: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  targetWeight: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  incrementBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--accent)',
    background: 'rgba(34,197,94,0.15)',
    padding: '2px 7px',
    borderRadius: 8,
  },
};
