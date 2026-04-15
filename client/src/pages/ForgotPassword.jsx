import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setMessage(data.message || 'If that email is registered, we sent a reset link.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-right" style={{ width: '100%' }}>
        <div className="login-card">
          <h2>Reset Password</h2>
          <p className="login-subtitle">
            Enter your email and we'll send you a link to reset your password.
          </p>

          {error && <div className="login-error">{error}</div>}
          {message && (
            <div className="login-error" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderColor: '#22c55e' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading || !email}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="login-divider"><span>or</span></div>

          <Link to="/login" className="btn-secondary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
