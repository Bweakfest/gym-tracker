import { useState, useRef, useEffect, useCallback } from 'react';

const PRESETS = [30, 60, 90, 120, 180];

function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) { /* silent fail */ }
}

// Ask for notification permission once. Safe to call repeatedly —
// if it's already granted or denied, the browser just returns the existing state.
async function ensureNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

// Send a message to the service worker.
function postToSW(message) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    if (reg.active) reg.active.postMessage(message);
  }).catch(() => { /* SW not ready */ });
}

function scheduleBackgroundRest(seconds) {
  postToSW({ type: 'schedule-rest', seconds, id: Date.now() });
}

function cancelBackgroundRest() {
  postToSW({ type: 'cancel-rest' });
}

export default function RestTimer({ defaultSeconds = 90, onComplete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultSeconds);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 480);
  const [toast, setToast] = useState(null); // { text }
  const toastTimer = useRef(null);

  // Listen for global auto-start events (dispatched from anywhere in the app)
  useEffect(() => {
    const handler = (e) => {
      const dur = (e.detail && e.detail.seconds) || defaultSeconds;
      setTotalSeconds(dur);
      setRemainingSeconds(dur);
      setIsRunning(true);
      // Kick off a background notification so the user hears about it even if
      // the tab gets backgrounded (scrolling TikTok etc).
      ensureNotificationPermission().then(() => scheduleBackgroundRest(dur));
      // Show toast without forcing panel open (less intrusive)
      const label = dur < 60 ? `${dur}s` : `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`;
      setToast({ text: `Rest timer started — ${label}` });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2500);
    };
    window.addEventListener('nexero:rest-start', handler);
    return () => {
      window.removeEventListener('nexero:rest-start', handler);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [defaultSeconds]);

  // Listen for the service worker's "rest-finished" message so we can update
  // the UI state (stop the running animation) when the SW timer fires while
  // the tab is in the background.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event) => {
      if (event.data && event.data.type === 'rest-finished') {
        setIsRunning(false);
        setRemainingSeconds(0);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const remainingAtStartRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const tick = useCallback(() => {
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const next = Math.max(0, remainingAtStartRef.current - elapsed);
    setRemainingSeconds(next);

    if (next <= 0) {
      setIsRunning(false);
      playBeep();
      if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400, 200, 400, 200, 400]);
      // Tab is still open — cancel the SW notification so we don't fire it twice.
      cancelBackgroundRest();
      if (onComplete) onComplete();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onComplete]);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = performance.now();
      remainingAtStartRef.current = remainingSeconds;
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (remainingSeconds <= 0) return;
    setIsRunning(prev => {
      const next = !prev;
      if (next) {
        // Resuming — re-schedule SW notification for the remaining time.
        ensureNotificationPermission().then(() => scheduleBackgroundRest(remainingSeconds));
      } else {
        // Paused — cancel SW so it doesn't fire while paused.
        cancelBackgroundRest();
      }
      return next;
    });
  }, [remainingSeconds]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
    cancelBackgroundRest();
  }, [totalSeconds]);

  const selectPreset = useCallback((sec) => {
    setTotalSeconds(sec);
    setRemainingSeconds(sec);
    setIsRunning(true);
    ensureNotificationPermission().then(() => scheduleBackgroundRest(sec));
  }, []);

  const r = 62, circ = 2 * Math.PI * r;
  const fraction = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const offset = circ * (1 - fraction);

  const ringColor = remainingSeconds < 10 ? 'var(--danger, #ef4444)'
    : remainingSeconds < 30 ? 'var(--amber, #f59e0b)'
    : 'var(--accent, #22c55e)';

  const done = remainingSeconds <= 0 && !isRunning && totalSeconds > 0
    && remainingSeconds !== totalSeconds;

  const panelStyle = isMobile
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        width: '100%',
        background: 'var(--bg-card, #1e293b)',
        borderRadius: '16px 16px 0 0',
        padding: 24,
        boxShadow: 'var(--shadow, 0 4px 24px rgba(0,0,0,0.3))',
        transition: 'transform 200ms ease, opacity 200ms ease',
        transform: isExpanded ? 'translateY(0)' : 'translateY(100%)',
        opacity: isExpanded ? 1 : 0,
        pointerEvents: isExpanded ? 'auto' : 'none',
        zIndex: 1002,
      }
    : {
        position: 'absolute', bottom: 56, right: 0,
        width: 220,
        background: 'var(--bg-card, #1e293b)',
        borderRadius: 16,
        padding: '20px 16px 16px',
        boxShadow: 'var(--shadow, 0 4px 24px rgba(0,0,0,0.3))',
        transformOrigin: 'bottom right',
        transition: 'transform 200ms ease, opacity 200ms ease',
        transform: isExpanded ? 'scale(1)' : 'scale(0.85)',
        opacity: isExpanded ? 1 : 0,
        pointerEvents: isExpanded ? 'auto' : 'none',
      };

  return (
    <div style={{ position: 'fixed', bottom: 100, right: 24, zIndex: 1000 }}>
      {/* Auto-start toast */}
      {toast && !isExpanded && (
        <div
          onClick={() => setIsExpanded(true)}
          style={{
            position: 'absolute',
            bottom: 56,
            right: 0,
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--accent, #22c55e)',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-primary, #f1f5f9)',
            boxShadow: '0 4px 16px rgba(34, 197, 94, 0.25)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            animation: 'rest-toast-in 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent, #22c55e)' }} />
          {toast.text}
        </div>
      )}

      {/* Mobile scrim/backdrop */}
      {isMobile && isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1001,
          }}
        />
      )}

      {/* Expanded panel */}
      <div style={panelStyle}>
        {/* SVG ring */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <svg width="160" height="160" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={r} fill="none"
              stroke="var(--border, #334155)" strokeWidth="6" />
            <circle cx="70" cy="70" r={r} fill="none"
              stroke={ringColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              transform="rotate(-90 70 70)"
              style={{ transition: isRunning ? 'none' : 'stroke-dashoffset 0.3s ease' }} />
            <text x="70" y="76" textAnchor="middle"
              fill="var(--text-primary, #f1f5f9)"
              fontSize="28" fontWeight="700"
              style={{ fontVariantNumeric: 'tabular-nums', fontFamily: "'Inter', monospace" }}>
              {fmtTime(Math.ceil(remainingSeconds))}
            </text>
          </svg>
        </div>

        {/* Preset pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
          {PRESETS.map(p => (
            <button key={p} onClick={() => selectPreset(p)}
              style={{
                padding: '4px 10px',
                background: totalSeconds === p && !isRunning ? 'rgba(34,197,94,0.1)' : 'var(--bg-body, #0f172a)',
                border: `1px solid ${totalSeconds === p && !isRunning ? 'var(--accent, #22c55e)' : 'var(--border, #334155)'}`,
                borderRadius: 20,
                fontSize: '0.75rem',
                color: totalSeconds === p && !isRunning ? 'var(--accent, #22c55e)' : 'var(--text-secondary, #94a3b8)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}>
              {p < 60 ? `${p}s` : `${p / 60}m`}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={togglePlay}
            style={{
              flex: 1, padding: '6px 0',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', opacity: remainingSeconds <= 0 && !isRunning ? 0.5 : 1,
            }}>
            {isRunning ? 'Pause' : done ? 'Done' : 'Start'}
          </button>
          <button onClick={reset}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              color: 'var(--text-secondary, #94a3b8)',
              border: '1px solid var(--border, #334155)',
              borderRadius: 8, fontSize: '0.85rem', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Reset
          </button>
        </div>
      </div>

      {/* Floating toggle button */}
      <button onClick={() => setIsExpanded(prev => !prev)}
        style={{
          width: 48, height: 48,
          borderRadius: '50%',
          background: isRunning
            ? `linear-gradient(135deg, ${ringColor}, ${ringColor})`
            : 'linear-gradient(135deg, #22c55e, #16a34a)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(34, 197, 94, 0.35)',
          transition: 'background 0.3s ease, transform 0.15s ease',
          transform: isExpanded ? 'scale(1.05)' : 'scale(1)',
          position: 'relative',
        }}>
        {/* Timer / clock SVG icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="13" r="8" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="13" x2="15" y2="13" />
          <line x1="12" y1="1" x2="12" y2="4" />
          <line x1="8" y1="1" x2="16" y2="1" />
        </svg>
        {/* Running indicator dot */}
        {isRunning && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 10, height: 10, borderRadius: '50%',
            background: '#fff',
            animation: 'rest-timer-pulse 1s infinite',
          }} />
        )}
        <style>{`
          @keyframes rest-timer-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          @keyframes rest-toast-in {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </button>
    </div>
  );
}
