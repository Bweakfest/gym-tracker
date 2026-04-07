import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setStats);
  }, [token]);

  if (!stats) return <div className="loading-screen"><div className="spinner" /></div>;

  const goalCal = stats.goal?.dailyCalories || 2500;
  const goalProt = stats.goal?.dailyProtein || 180;
  const calPct = Math.min((stats.todayCalories / goalCal) * 100, 100);
  const protPct = Math.min((stats.todayProtein / goalProt) * 100, 100);
  const calLeft = Math.max(goalCal - stats.todayCalories, 0);
  const trainedCount = stats.weekDays?.filter(d => d.trained).length || 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user.name}!</h1>
          <p>Here's your fitness overview for today.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon workout-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.streak}</span>
            <span className="stat-label">Day Streak</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon total-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 6.5h11M6.5 17.5h11M2 12h2M20 12h2M4 8v8M20 8v8"/></svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.todayVolume.toLocaleString()}</span>
            <span className="stat-label">Volume kg</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon calorie-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12c-2-2.67-6-2.67-6 2 0 4 6 8 6 8s6-4 6-8c0-4.67-4-4.67-6-2z"/></svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.todayCalories}</span>
            <span className="stat-label">Kcal Today</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon meals-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div className="stat-info">
            <span className="stat-value" style={{ color: '#22c55e' }}>{calLeft}</span>
            <span className="stat-label">Kcal Left</span>
          </div>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="dashboard-section" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header">
          <h2>This Week</h2>
          <span className="week-count">{trainedCount}/7 sessions</span>
        </div>
        <div className="week-grid">
          {stats.weekDays?.map(d => (
            <div key={d.date} className={`week-day ${d.trained ? 'trained' : ''} ${d.isToday ? 'today' : ''}`}>
              <span className="week-day-label">{d.day}</span>
              {d.trained && <span className="week-day-check">&#10003;</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Today's Macros */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Today's Macros</h2>
            <Link to="/meals" className="btn-link">Log Meal</Link>
          </div>
          <div className="macro-row">
            <span className="macro-row-label">Calories</span>
            <span className="macro-row-value">{stats.todayCalories}/{goalCal}</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${calPct}%` }} /></div>
          <div className="macro-row">
            <span className="macro-row-label">Protein</span>
            <span className="macro-row-value" style={{ color: '#22c55e' }}>{stats.todayProtein.toFixed(0)}/{goalProt}g</span>
          </div>
          <div className="progress-bar"><div className="progress-fill green" style={{ width: `${protPct}%` }} /></div>
          <div className="macro-row">
            <span className="macro-row-label">Carbs</span>
            <span className="macro-row-value">{stats.todayCarbs.toFixed(0)}g</span>
          </div>
          <div className="macro-row" style={{ borderBottom: 'none' }}>
            <span className="macro-row-label">Fat</span>
            <span className="macro-row-value">{stats.todayFat.toFixed(0)}g</span>
          </div>
        </div>

        {/* PRs */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Personal Records</h2>
            <Link to="/workouts" className="btn-link">View All</Link>
          </div>
          {stats.prs.length === 0 ? (
            <div className="empty-state">
              <p>No PRs yet. Start logging workouts!</p>
              <Link to="/workouts" className="btn-primary btn-sm">Log Workout</Link>
            </div>
          ) : (
            <div className="pr-list">
              {stats.prs.map(pr => (
                <div key={pr.exercise} className="pr-row">
                  <span className="pr-exercise">{pr.exercise}</span>
                  <span className="pr-badge">{pr.weight} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
        {/* Recent Workouts */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Workouts</h2>
            <Link to="/workouts" className="btn-link">View All</Link>
          </div>
          {stats.recentWorkouts.length === 0 ? (
            <div className="empty-state">
              <p>No workouts yet. Start tracking!</p>
              <Link to="/workouts" className="btn-primary btn-sm">Log Workout</Link>
            </div>
          ) : (
            <div className="recent-list">
              {stats.recentWorkouts.map(w => (
                <div key={w.id} className="recent-item">
                  <div className="recent-info">
                    <strong>{w.exercise}</strong>
                    <span>{w.sets && w.reps ? `${w.sets} x ${w.reps}` : ''} {w.weight ? `@ ${w.weight} kg` : ''}</span>
                  </div>
                  <span className="recent-date">{w.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Meals */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Meals</h2>
            <Link to="/meals" className="btn-link">View All</Link>
          </div>
          {stats.recentMeals.length === 0 ? (
            <div className="empty-state">
              <p>No meals logged. Start tracking!</p>
              <Link to="/meals" className="btn-primary btn-sm">Log Meal</Link>
            </div>
          ) : (
            <div className="recent-list">
              {stats.recentMeals.map(m => (
                <div key={m.id} className="recent-item">
                  <div className="recent-info">
                    <strong>{m.name}</strong>
                    <span>{m.calories ? `${m.calories} cal` : ''} {m.protein ? `${m.protein}g protein` : ''}</span>
                  </div>
                  <span className="recent-date">{m.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
