import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
          <path d="M6.5 6.5h11M6.5 17.5h11M2 12h2M20 12h2M4 8v8M20 8v8M7 4v4M17 4v4M7 16v4M17 16v4" />
        </svg>
        <span>FitTrack</span>
      </div>
      <div className="nav-links">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/workouts">Workouts</NavLink>
        <NavLink to="/meals">Meals</NavLink>
        <NavLink to="/weight">Weight</NavLink>
        <NavLink to="/coach">AI Coach</NavLink>
      </div>
      <div className="nav-user">
        <span className="nav-username">{user.name}</span>
        <button onClick={logout} className="btn-logout">Sign Out</button>
      </div>
    </nav>
  );
}
