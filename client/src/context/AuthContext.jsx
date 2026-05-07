import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API = '/api';

function readCachedUser() {
  try { const raw = localStorage.getItem('user'); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => (token ? readCachedUser() : null));
  // If we already have a token + cached user, render instantly and revalidate in background.
  const [loading, setLoading] = useState(() => !!token && !readCachedUser());

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(u => {
        setUser(u);
        try { localStorage.setItem('user', JSON.stringify(u)); } catch {}
      })
      .catch(() => {
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email, password) => {
    let res;
    try {
      res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error('Cannot connect to server. Please check your internet connection and try again.');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('token', data.token);
    try { localStorage.setItem('user', JSON.stringify(data.user)); } catch {}
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (name, email, password) => {
    let res;
    try {
      res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
    } catch {
      throw new Error('Cannot connect to server. Please check your internet connection and try again.');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('token', data.token);
    try { localStorage.setItem('user', JSON.stringify(data.user)); } catch {}
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    // Clear all app-scoped localStorage keys (keep theme & lang preferences)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('nexero_') || key.startsWith('dash_stats') || key.startsWith('cal_') || key === 'token' || key === 'user')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
