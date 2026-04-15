import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await register(form.name, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5h11M6.5 17.5h11M2 12h2M20 12h2M4 8v8M20 8v8M7 4v4M17 4v4M7 16v4M17 16v4" />
            </svg>
          </div>
          <h1>Nexero</h1>
          <p className="login-tagline">Your complete fitness companion</p>
        </div>
        <div className="login-features">
          <div className="login-feature">
            <span className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </span>
            <div>
              <h3>Track Workouts</h3>
              <p>Log exercises, sets, reps, and weight to monitor your progress over time.</p>
            </div>
          </div>
          <div className="login-feature">
            <span className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>
            </span>
            <div>
              <h3>Log Meals</h3>
              <p>Track calories, protein, carbs, and fat to stay on top of your nutrition.</p>
            </div>
          </div>
          <div className="login-feature">
            <span className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
            </span>
            <div>
              <h3>View Progress</h3>
              <p>See your fitness journey with stats and history all in one dashboard.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="login-subtitle">
            {isSignUp ? 'Start your fitness journey today' : 'Sign in to continue your journey'}
          </p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input id="name" type="text" placeholder="John Doe" value={form.name} onChange={update('name')} required />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={update('email')} required />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={update('password')} required minLength={6} />
            </div>
            {!isSignUp && (
              <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '12px' }}>
                <Link to="/forgot-password" style={{ color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="login-divider"><span>or</span></div>

          <button className="btn-secondary" onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
