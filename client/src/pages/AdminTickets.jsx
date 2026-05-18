import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value: 'bug', label: 'Bug Report', icon: '🐛' },
  { value: 'feature', label: 'Feature Request', icon: '💡' },
  { value: 'feedback', label: 'General Feedback', icon: '💬' },
  { value: 'question', label: 'Question', icon: '❓' },
];

const STATUSES = [
  { value: 'open', label: 'Open', color: '#3b82f6' },
  { value: 'in-progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'resolved', label: 'Resolved', color: '#22c55e' },
  { value: 'closed', label: 'Closed', color: '#64748b' },
];

export default function AdminTickets() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [replyText, setReplyText] = useState({});
  const [saving, setSaving] = useState({});
  const [msg, setMsg] = useState(null);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    fetch('/api/admin/tickets', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setTickets(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const updateTicket = async (id, updates) => {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
      const updated = await res.json();
      setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
      flash(`Ticket updated — user has been notified by email.`);
      if (updates.admin_reply) setReplyText(r => ({ ...r, [id]: '' }));
    } catch (err) {
      flash(err.message, false);
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  };

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    'in-progress': tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Manage Tickets</h1>
          <p className="page-subtitle">Review, reply, and resolve user tickets</p>
        </div>
      </div>

      {msg && <div className={`settings-flash ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}

      {/* Status filter pills */}
      <div className="ticket-category-pills" style={{ marginBottom: '1.5rem' }}>
        {[{ value: 'all', label: 'All' }, ...STATUSES].map(s => (
          <button
            key={s.value}
            className={`ticket-cat-pill${filter === s.value ? ' active' : ''}`}
            onClick={() => setFilter(s.value)}
          >
            {s.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>({counts[s.value] || 0})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="form-card">
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          <div className="skeleton skeleton-text" style={{ width: '80%', marginTop: 8 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="form-card empty-state" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>No tickets {filter !== 'all' ? `with status "${filter}"` : ''}</h3>
        </div>
      ) : (
        <div className="ticket-list">
          {filtered.map(ticket => {
            const cat = CATEGORIES.find(c => c.value === ticket.category) || CATEGORIES[2];
            const status = STATUSES.find(s => s.value === ticket.status) || STATUSES[0];
            const isExpanded = expandedId === ticket.id;
            const reply = replyText[ticket.id] ?? ticket.admin_reply ?? '';
            const stars = ticket.feedback_rating ? '★'.repeat(ticket.feedback_rating) + '☆'.repeat(5 - ticket.feedback_rating) : null;

            return (
              <div key={ticket.id} className={`ticket-card${isExpanded ? ' expanded' : ''}`}>
                <div className="ticket-header" onClick={() => setExpandedId(isExpanded ? null : ticket.id)}>
                  <div className="ticket-header-left">
                    <span className="ticket-cat-icon">{cat.icon}</span>
                    <div>
                      <div className="ticket-subject">{ticket.subject}</div>
                      <div className="ticket-meta">
                        <span style={{ fontWeight: 600 }}>{ticket.user_name || 'Unknown'}</span>
                        <span style={{ opacity: 0.6 }}>({ticket.user_email || 'no email'})</span>
                        <span className="ticket-date">{formatDate(ticket.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="ticket-status" style={{ background: `${status.color}18`, color: status.color, borderColor: `${status.color}40` }}>
                    {status.label}
                  </span>
                </div>

                {isExpanded && (
                  <div className="ticket-body">
                    <p className="ticket-description">{ticket.description}</p>

                    {/* Feedback display */}
                    {stars && (
                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', marginTop: '12px', border: '1px solid var(--border)' }}>
                        <strong>User Feedback:</strong>
                        <span style={{ fontSize: '1.2rem', color: '#f59e0b', marginLeft: 8 }}>{stars}</span>
                        {ticket.feedback_comment && <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>{ticket.feedback_comment}</p>}
                      </div>
                    )}

                    {/* Status change buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                      {STATUSES.filter(s => s.value !== ticket.status).map(s => (
                        <button
                          key={s.value}
                          className="btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: `${s.color}40`, color: s.color }}
                          disabled={saving[ticket.id]}
                          onClick={() => updateTicket(ticket.id, { status: s.value, admin_reply: replyText[ticket.id] || undefined })}
                        >
                          Mark as {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Admin reply */}
                    <div style={{ marginTop: '16px' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Admin Reply</label>
                      <textarea
                        value={reply}
                        onChange={(e) => setReplyText(r => ({ ...r, [ticket.id]: e.target.value }))}
                        placeholder="Write a reply to the user..."
                        rows={3}
                        maxLength={2000}
                        style={{ width: '100%', resize: 'vertical', minHeight: '80px' }}
                      />
                      <button
                        className="btn-primary"
                        style={{ marginTop: 8, fontSize: '0.85rem' }}
                        disabled={saving[ticket.id] || !replyText[ticket.id]?.trim()}
                        onClick={() => updateTicket(ticket.id, { admin_reply: replyText[ticket.id], status: ticket.status })}
                      >
                        {saving[ticket.id] ? 'Saving...' : 'Save Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
