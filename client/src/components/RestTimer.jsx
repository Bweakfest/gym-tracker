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

function postToSW(message) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    if (reg.active) reg.active.postMessage(message);
  }).catch(() => {});
}

let pushSubscribed = false;
async function ensurePushSubscription(token) {
  if (pushSubscribed || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const res = await fetch('/api/push/vapid-key');
      const { publicKey } = await res.json();
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    pushSubscribed = true;
  } catch { /* falls back to client-side SW timer */ }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function scheduleServerRest(seconds, token) {
  try {
    await fetch('/api/push/schedule-rest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ seconds }),
    });
  } catch {
    postToSW({ type: 'schedule-rest', seconds, id: Date.now() });
  }
}

async function cancelServerRest(token) {
  try {
    await fetch('/api/push/cancel-rest', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch { /* silent */ }
  postToSW({ type: 'cancel-rest' });
}

function showLocalNotification() {
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
  navigator.serviceWorker.ready.then(reg => {
    reg.showNotification('Rest is up — back to work!', {
      tag: 'pumptracker-rest-timer',
      body: 'Your rest timer has finished. Time for your next set.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [400, 200, 400, 200, 400],
      requireInteraction: true,
      silent: false,
      data: { url: '/workouts' },
    });
  }).catch(() => {});
}

export default function RestTimer({ defaultSeconds = 90, onComplete, token }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultSeconds);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 480);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Wall-clock timer: stores the absolute end timestamp and uses setInterval
  // to check it every 250ms. Unlike requestAnimationFrame this keeps running
  // when the tab is backgrounded (browsers throttle to ~1s but it still fires).
  const endTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const startTimer = useCallback((seconds) => {
    hasCompletedRef.current = false;
    endTimeRef.current = Date.now() + seconds * 1000;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, (endTimeRef.current - Date.now()) / 1000);
      setRemainingSeconds(left);

      if (left <= 0 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        endTimeRef.current = null;
        setIsRunning(false);

        if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400, 200, 400, 200, 400]);
        showLocalNotification();
        if (token) cancelServerRest(token);
        postToSW({ type: 'cancel-rest' });
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }, 250);

    if (token) scheduleServerRest(seconds, token);
    else postToSW({ type: 'schedule-rest', seconds, id: Date.now() });
  }, [token]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    endTimeRef.current = null;
    if (token) cancelServerRest(token);
    postToSW({ type: 'cancel-rest' });
  }, [token]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Sync display immediately when tab becomes visible again
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && endTimeRef.current) {
        setRemainingSeconds(Math.max(0, (endTimeRef.current - Date.now()) / 1000));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Listen for global auto-start events (dispatched from anywhere in the app)
  useEffect(() => {
    const handler = (e) => {
      const dur = (e.detail && e.detail.seconds) || defaultSeconds;
      setTotalSeconds(dur);
      setRemainingSeconds(dur);
      setIsRunning(true);
      // Kick off a background notification so the user hears about it even if
      // the tab gets backgrounded (scrolling TikTok etc).
      ensureNotificationPermission().then(() => {
        if (token) ensurePushSubscription(token);
        startTimer(dur);
      });
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
  }, [defaultSeconds, startTimer]);

  // Listen for SW "rest-finished" in case the page interval was killed
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event) => {
      if (event.data && event.data.type === 'rest-finished') {
        setIsRunning(false);
        setRemainingSeconds(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        endTimeRef.current = null;
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const togglePlay = useCallback(() => {
    if (remainingSeconds <= 0) return;
    if (isRunning) {
      const left = endTimeRef.current ? Math.max(0, (endTimeRef.current - Date.now()) / 1000) : remainingSeconds;
      stopTimer();
      setRemainingSeconds(left);
      setIsRunning(false);
    } else {
      setIsRunning(true);
      ensureNotificationPermission().then(() => {
        if (token) ensurePushSubscription(token);
        startTimer(remainingSeconds);
      });
    }
  }, [isRunning, remainingSeconds, startTimer, stopTimer, token]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
    stopTimer();
  }, [totalSeconds, stopTimer]);

  const selectPreset = useCallback((sec) => {
    setTotalSeconds(sec);
    setRemainingSeconds(sec);
    setIsRunning(true);
    ensureNotificationPermission().then(() => {
      if (token) ensurePushSubscription(token);
      startTimer(sec);
    });
  }, [startTimer, token]);

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
