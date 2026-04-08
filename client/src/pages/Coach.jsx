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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const endRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    fetch('/api/chat', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          setMessages(data.map(m => ({ role: m.role, text: m.text })));
        } else {
          setMessages([{ role: 'coach', text: 'Hey! I\'m your AI fitness coach powered by Claude. I can see your logged meals, workouts, and goals — ask me anything and I\'ll give you personalized advice!\n\nTry: "What should I eat to hit my macros?" or "Rate my workout today"' }]);
        }
        setHistoryLoaded(true);
      })
      .catch(() => {
        setMessages([{ role: 'coach', text: 'Hey! I\'m your AI fitness coach. Ask me anything about training, nutrition, or recovery!' }]);
        setHistoryLoaded(true);
      });
  }, [token]);

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
      setMessages(prev => [...prev, { role: 'coach', text: data.reply || 'Sorry, I couldn\'t generate a response.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: 'Sorry, something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  const clearChat = async () => {
    await fetch('/api/chat', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setMessages([{ role: 'coach', text: 'Chat cleared! Ask me anything — I still have access to all your logged data.' }]);
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
        {messages.length > 1 && (
          <button className="btn-secondary btn-sm" onClick={clearChat}>Clear Chat</button>
        )}
      </div>

      <div className="coach-banner">
        I can see your meals, workouts, weight, and goals. Ask me anything and I'll give advice based on your actual data.
      </div>

      <div className="quick-prompts">
        {QUICK_PROMPTS.map(p => (
          <button key={p} className="quick-prompt-btn" onClick={() => send(p)}>{p}</button>
        ))}
      </div>

      <div className="chat-container">
        {!historyLoaded && (
          <div className="chat-bubble coach">
            <div className="chat-role">AI Coach</div>
            <div className="chat-text typing-indicator"><span></span><span></span><span></span></div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === 'user' ? 'user' : 'coach'}`}>
            <div className="chat-role">{m.role === 'user' ? 'You' : 'AI Coach'}</div>
            <div className="chat-text">{renderText(m.text)}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble coach">
            <div className="chat-role">AI Coach</div>
            <div className="chat-text typing-indicator"><span></span><span></span><span></span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-input-bar">
        <input
          className="chat-input"
          placeholder="Ask your coach anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button className="chat-send" onClick={() => send()} disabled={loading}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
