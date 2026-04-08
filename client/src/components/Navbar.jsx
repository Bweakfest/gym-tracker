import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function Navbar() {
  const { user } = useAuth();
  const { t } = useLang();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
          <path d="M6.5 6.5h11M6.5 17.5h11M2 12h2M20 12h2M4 8v8M20 8v8M7 4v4M17 4v4M7 16v4M17 16v4" />
        </svg>
        <span>FitTrack</span>
      </div>
      <div className="nav-links">
        <NavLink to="/" end>{t('dashboard')}</NavLink>
        <NavLink to="/workouts">{t('workouts')}</NavLink>
        <NavLink to="/meals">{t('meals')}</NavLink>
        <NavLink to="/weight">{t('weight')}</NavLink>
        <NavLink to="/coach">{t('coach')}</NavLink>
        <NavLink to="/calendar">{t('calendar')}</NavLink>
      </div>
      <div className="nav-user">
        {user.photo ? (
          <img src={user.photo} alt="" className="nav-avatar" />
        ) : (
          <span className="nav-avatar-letter">{(user.name || 'U')[0].toUpperCase()}</span>
        )}
        <span className="nav-username">{user.name}</span>
        <NavLink to="/settings" className="nav-settings-btn" title={t('settings')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </NavLink>
      </div>
    </nav>
  );
}
