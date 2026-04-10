import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const QUICK_PROMPTS = [
  'What should I eat to hit my macros today?',
  'Give me a high protein dinner recipe',
  'Rate my workout today',
  'How much protein do I still need?',
  'Best PPL program',
  'Tips for progressive overload',
];

export default function Coach() {
  const { token } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState('chat'); // 'chat' | 'recap' | 'analyze'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const endRef = useRef(null);

  // Weekly recap
  const [recapData, setRecapData] = useState(null);
  const [recapLoading, setRecapLoading] = useState(false);

  // Progress analyzer
  const [analyzeFocus, setAnalyzeFocus] = useState('general');
  const [analysis, setAnalysis] = useState('');
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const loadRecap = async () => {
    setRecapLoading(true);
    try {
      const res = await fetch('/api/coach/weekly-recap', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRecapData(data);
    } catch {
      setRecapData({ error: 'Could not load recap' });
    } finally {
      setRecapLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzeLoading(true);
    setAnalysis('');
    try {
      const res = await fetch('/api/coach/analyze-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ focus: analyzeFocus }),
      });
      const data = await res.json();
      setAnalysis(data.reply || data.error || 'No response');
    } catch {
      setAnalysis('Could not reach coach. Check your connection.');
    } finally {
      setAnalyzeLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'recap' && !recapData) loadRecap();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load chat history on mount
  useEffect(() => {
    fetch('/api/chat', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          setMessages(data.map(m => ({ role: m.role, text: m.text })));
        } else {
          setMessages([{ role: 'coach', text: t('coachGreeting') }]);
        }
        setHistoryLoaded(true);
      })
      .catch(() => {
        setMessages([{ role: 'coach', text: t('coachGreetingFallback') }]);
        setHistoryLoaded(true);
      });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'coach', text: data.reply || t('coachNoResponse') }]);
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: t('coachErrorMsg') }]);
    }
    setLoading(false);
  };

  const clearChat = async () => {
    await fetch('/api/chat', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setMessages([{ role: 'coach', text: t('coachClearedMsg') }]);
  };

  const renderText = (text) => {
    return text.split('\n').map((line, j) => {
      const parts = line.split(/(\*\*.*?\*\*)/g).map((seg, k) => {
        if (seg.startsWith('**') && seg.endsWith('**'))
          return <strong key={k}>{seg.slice(2, -2)}</strong>;
        return seg;
      });
      return <span key={j}>{parts}<br/></span>;
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('coach')}</h1>
          <p>{t('coachSub')}</p>
        </div>
        {tab === 'chat' && messages.length > 1 && (
          <button className="btn-secondary btn-sm" onClick={clearChat}>{t('clearChat')}</button>
        )}
      </div>

      <div className="coach-tabs">
        <button className={`coach-tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
          💬 Chat
        </button>
        <button className={`coach-tab ${tab === 'recap' ? 'active' : ''}`} onClick={() => setTab('recap')}>
          📊 Weekly Recap
        </button>
        <button className={`coach-tab ${tab === 'analyze' ? 'active' : ''}`} onClick={() => setTab('analyze')}>
          🔍 Progress Analyzer
        </button>
      </div>

      {tab === 'chat' && (
        <>
          <div className="coach-banner">
            {t('coachBanner')}
          </div>

          <div className="quick-prompts">
            {QUICK_PROMPTS.map(p => (
              <button key={p} className="quick-prompt-btn" onClick={() => send(p)}>{p}</button>
            ))}
          </div>

          <div className="chat-container">
            {!historyLoaded && (
              <div className="chat-bubble coach">
                <div className="chat-role">{t('aiCoach')}</div>
                <div className="chat-text typing-indicator"><span></span><span></span><span></span></div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role === 'user' ? 'user' : 'coach'}`}>
                <div className="chat-role">{m.role === 'user' ? t('you') : t('aiCoach')}</div>
                <div className="chat-text">{renderText(m.text)}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble coach">
                <div className="chat-role">{t('aiCoach')}</div>
                <div className="chat-text typing-indicator"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="chat-input-bar">
            <input
              className="chat-input"
              placeholder={t('askCoach')}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              disabled={loading}
            />
            <button className="chat-send" onClick={() => send()} disabled={loading}>
              {loading ? '...' : t('send')}
            </button>
          </div>
        </>
      )}

      {tab === 'recap' && (
        <div className="coach-tab-content">
          {recapLoading && <div className="form-card"><p>Analyzing your last 7 days…</p></div>}
          {recapData && recapData.error && (
            <div className="form-card empty-state"><p>{recapData.error}</p></div>
          )}
          {recapData && !recapData.error && (
            <>
              <div className="recap-stats-grid">
                <div className="recap-stat">
                  <span className="recap-stat-label">Days Trained</span>
                  <span className="recap-stat-value">{recapData.daysTrained ?? '—'}</span>
                  <span className="recap-stat-sub">out of 7</span>
                </div>
                <div className="recap-stat">
                  <span className="recap-stat-label">Total Volume</span>
                  <span className="recap-stat-value">{recapData.totalVolume?.toLocaleString() ?? 0} kg</span>
                </div>
                <div className="recap-stat">
                  <span className="recap-stat-label">Weight Change</span>
                  <span className="recap-stat-value">
                    {recapData.weightDelta != null
                      ? (recapData.weightDelta > 0 ? '+' : '') + recapData.weightDelta + ' kg'
                      : '—'}
                  </span>
                </div>
                <div className="recap-stat">
                  <span className="recap-stat-label">Avg Calories</span>
                  <span className="recap-stat-value">{recapData.avgCalories?.toLocaleString() ?? '—'}</span>
                </div>
              </div>
              {recapData.reply && (
                <div className="form-card recap-insight">
                  <h3>📝 Coach's take</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{recapData.reply}</p>
                </div>
              )}
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button className="btn-secondary btn-sm" onClick={loadRecap}>Refresh recap</button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'analyze' && (
        <div className="coach-tab-content">
          <div className="form-card">
            <h3>🔍 Progress Analyzer</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Not seeing the results you expected? I'll analyze your weights, measurements, workouts, and nutrition to give you an honest, data-driven answer.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[
                { id: 'general', label: 'General' },
                { id: 'weight', label: 'Weight not changing' },
                { id: 'strength', label: 'Strength stalled' },
                { id: 'measurements', label: 'Measurements stalled' },
              ].map(f => (
                <button
                  key={f.id}
                  className={`chip ${analyzeFocus === f.id ? 'sel' : ''}`}
                  onClick={() => setAnalyzeFocus(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={runAnalysis} disabled={analyzeLoading}>
              {analyzeLoading ? 'Analyzing your data…' : 'Analyze my progress'}
            </button>
          </div>
          {analysis && (
            <div className="form-card recap-insight" style={{ marginTop: '1rem' }}>
              <h3>📊 Analysis</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{analysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
