import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const CATEGORIES = [
  { value: 'bug', label: 'Bug Report', icon: '🐛' },
  { value: 'feature', label: 'Feature Request', icon: '💡' },
  { value: 'feedback', label: 'General Feedback', icon: '💬' },
  { value: 'question', label: 'Question', icon: '❓' },
];

const STATUS_LABELS = {
  open: { label: 'Open', color: '#3b82f6' },
  'in-progress': { label: 'In Progress', color: '#f59e0b' },
  resolved: { label: 'Resolved', color: '#22c55e' },
  closed: { label: 'Closed', color: '#64748b' },
};

export default function Feedback() {
  const { token } = useAuth();
  const { t } = useLang();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [feedbackId, setFeedbackId] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const [form, setForm] = useState({
    category: 'feedback',
    subject: '',
    description: '',
  });

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const loadTickets = () => {
    fetch('/api/tickets', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setTickets(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  };

  useEffect(() => { loadTickets(); }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      return flash('Please fill in both subject and description.', false);
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to submit ticket');
      }
      const newTicket = await res.json();
      setTickets(prev => [newTicket, ...prev]);
      setForm({ category: 'feedback', subject: '', description: '' });
      setShowForm(false);
      flash('Ticket submitted! We\'ll get back to you soon.');
    } catch (err) {
      flash(err.message || 'Something went wrong.', false);
    } finally {
      setSubmitting(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackRating) return;
    setSendingFeedback(true);
    try {
      const res = await fetch(`/api/tickets/${feedbackId}/feedback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
      const updated = await res.json();
      setTickets(prev => prev.map(t => t.id === feedbackId ? { ...t, ...updated } : t));
      setFeedbackId(null);
      setFeedbackRating(0);
      setFeedbackComment('');
      flash('Thanks for your feedback!');
    } catch (err) {
      flash(err.message, false);
    } finally {
      setSendingFeedback(false);
    }
  };

  const u = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Feedback & Support</h1>
          <p>Report bugs, request features, or share your thoughts</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ New Ticket'}
        </button>
      </div>

      {msg && (
        <div className={`settings-flash ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>
      )}

      {/* New ticket form */}
      {showForm && (
        <div className="form-card" style={{ marginBottom: '1.5rem' }}>
          <h3>Submit a Ticket</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Category</label>
              <div className="ticket-category-pills">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    className={`ticket-cat-pill${form.category === c.value ? ' active' : ''}`}
                    onClick={() => setForm({ ...form, category: c.value })}
                  >
                    <span>{c.icon}</span> {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                placeholder="Brief summary of your issue or idea"
                value={form.subject}
                onChange={u('subject')}
                maxLength={200}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="Describe the issue in detail, or tell us about your feature idea..."
                value={form.description}
                onChange={u('description')}
                rows={5}
                maxLength={2000}
                required
                style={{ resize: 'vertical', minHeight: '100px' }}
              />
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {form.description.length}/2000
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </div>
      )}

      {/* Tickets list */}
      {loading ? (
        <div className="form-card">
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          <div className="skeleton skeleton-text" style={{ width: '80%', marginTop: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: 8 }} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="form-card empty-state" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <h3 style={{ margin: '0 0 0.5rem' }}>No tickets yet</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Found a bug or have an idea? Tap <strong>+ New Ticket</strong> to let us know!
          </p>
        </div>
      ) : (
        <div className="ticket-list">
          {tickets.map(ticket => {
            const cat = CATEGORIES.find(c => c.value === ticket.category) || CATEGORIES[2];
            const status = STATUS_LABELS[ticket.status] || STATUS_LABELS.open;
            const isExpanded = expandedId === ticket.id;
            return (
              <div
                key={ticket.id}
                className={`ticket-card${isExpanded ? ' expanded' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
              >
                <div className="ticket-header">
                  <div className="ticket-header-left">
                    <span className="ticket-cat-icon">{cat.icon}</span>
                    <div>
                      <div className="ticket-subject">{ticket.subject}</div>
                      <div className="ticket-meta">
                        <span className="ticket-cat-label">{cat.label}</span>
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
                    {ticket.admin_reply && (
                      <div className="ticket-reply">
                        <div className="ticket-reply-header">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6"/></svg>
                          <span>Admin Reply</span>
                        </div>
                        <p>{ticket.admin_reply}</p>
                      </div>
                    )}
                    {/* Feedback section for resolved tickets */}
                    {ticket.status === 'resolved' && !ticket.feedback_rating && (
                      <button
                        className="btn-primary"
                        style={{ marginTop: 12, fontSize: '0.85rem' }}
                        onClick={(e) => { e.stopPropagation(); setFeedbackId(ticket.id); setFeedbackRating(0); setFeedbackComment(''); }}
                      >
                        Rate our response
                      </button>
                    )}
                    {ticket.feedback_rating && (
                      <div style={{ marginTop: 12, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: '#f59e0b', fontSize: '1.1rem' }}>{'★'.repeat(ticket.feedback_rating)}{'☆'.repeat(5 - ticket.feedback_rating)}</span>
                        <span style={{ marginLeft: 8 }}>Your rating</span>
                        {ticket.feedback_comment && <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>{ticket.feedback_comment}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback rating modal */}
      {feedbackId && (
        <div className="modal-overlay" onClick={() => setFeedbackId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ marginTop: 0 }}>How did we do?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Rate how well we resolved your ticket</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '20px 0' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  onMouseEnter={() => setFeedbackHover(star)}
                  onMouseLeave={() => setFeedbackHover(0)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem', padding: '4px',
                    color: star <= (feedbackHover || feedbackRating) ? '#f59e0b' : 'var(--text-muted)',
                    transform: star <= (feedbackHover || feedbackRating) ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              placeholder="Any additional comments? (optional)"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              rows={3}
              maxLength={500}
              style={{ width: '100%', resize: 'vertical', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setFeedbackId(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!feedbackRating || sendingFeedback}
                onClick={submitFeedback}
              >
                {sendingFeedback ? 'Sending...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
