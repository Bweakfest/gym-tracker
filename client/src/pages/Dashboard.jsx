import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

/* Protein ring SVG component */
function ProteinRing({ eaten, target }) {
  const pct = Math.min(eaten / target, 1);
  const r = 38, circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const over = eaten > target;
  return (
    <div className="protein-ring-wrap">
      <svg viewBox="0 0 100 100" width="110" height="110">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none"
          stroke={over ? '#f59e0b' : '#22c55e'} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <text x="50" y="46" textAnchor="middle" fill="#f1f5f9" fontSize="16" fontWeight="700">{Math.round(eaten)}g</text>
        <text x="50" y="60" textAnchor="middle" fill="#64748b" fontSize="9">/ {target}g</text>
      </svg>
      <span className="protein-ring-label">Protein</span>
    </div>
  );
}

/* Weekly calorie trend chart */
function WeeklyChart({ data, goalCal }) {
  if (!data || data.length === 0) return null;
  const maxCal = Math.max(goalCal, ...data.map(d => d.calories)) * 1.1;
  const vW = 400, vH = 140, padL = 10, padR = 10, padT = 15, padB = 25;
  const plotW = vW - padL - padR, plotH = vH - padT - padB;
  const barW = plotW / data.length * 0.55;
  const goalY = padT + plotH - (goalCal / maxCal) * plotH;

  return (
    <div className="weekly-chart">
      <svg viewBox={`0 0 ${vW} ${vH}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
        {/* Goal line */}
        <line x1={padL} y1={goalY} x2={vW - padR} y2={goalY} stroke="#22c55e" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
        <text x={vW - padR} y={goalY - 4} textAnchor="end" fill="#22c55e" fontSize="8" opacity="0.7">goal</text>
        {/* Bars */}
        {data.map((d, i) => {
          const x = padL + (i / data.length) * plotW + (plotW / data.length - barW) / 2;
          const h = d.calories > 0 ? (d.calories / maxCal) * plotH : 0;
          const y = padT + plotH - h;
          const isToday = i === data.length - 1;
          const pct = goalCal > 0 ? d.calories / goalCal : 0;
          const fill = d.calories === 0 ? '#1e293b' : pct >= 0.9 ? '#22c55e' : pct >= 0.5 ? '#f59e0b' : '#ef4444';
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx="4" fill={fill} opacity={isToday ? 1 : 0.6} />
              {d.calories > 0 && <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="#94a3b8" fontSize="8">{d.calories}</text>}
              <text x={x + barW / 2} y={vH - 5} textAnchor="middle" fill={isToday ? '#f1f5f9' : '#64748b'} fontSize="9" fontWeight={isToday ? '600' : '400'}>{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const { t } = useLang();
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
          <h1>{t('dashboard')}</h1>
          <p>{t('dashSub')}</p>
        </div>
      </div>

      {/* Top stat cards */}
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

      {/* Protein + Weekly grid row */}
      <div className="dash-highlight-row">
        {/* Protein ring */}
        <div className="dashboard-section dash-protein-card">
          <div className="section-header">
            <h2>Protein Today</h2>
            <Link to="/meals" className="dash-view-btn">Log Meal &rarr;</Link>
          </div>
          <div className="protein-content">
            <ProteinRing eaten={stats.todayProtein} target={goalProt} />
            <div className="protein-details">
              <div className="protein-detail-row">
                <span className="protein-detail-label">Eaten</span>
                <span className="protein-detail-value">{Math.round(stats.todayProtein)}g</span>
              </div>
              <div className="protein-detail-row">
                <span className="protein-detail-label">Target</span>
                <span className="protein-detail-value">{goalProt}g</span>
              </div>
              <div className="protein-detail-row">
                <span className="protein-detail-label">Remaining</span>
                <span className="protein-detail-value" style={{ color: stats.todayProtein >= goalProt ? '#f59e0b' : '#22c55e' }}>
                  {Math.max(goalProt - Math.round(stats.todayProtein), 0)}g
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly grid */}
        <div className="dashboard-section">
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
      </div>

      {/* Weekly Calorie Trend Chart */}
      <div className="dashboard-section" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header">
          <h2>Weekly Calorie Trend</h2>
          <Link to="/calendar" className="dash-view-btn">Full History &rarr;</Link>
        </div>
        <WeeklyChart data={stats.weeklyTrend} goalCal={goalCal} />
      </div>

      <div className="dashboard-grid">
        {/* Today's Macros */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Today's Macros</h2>
            <Link to="/meals" className="dash-view-btn">Log Meal &rarr;</Link>
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
            <Link to="/workouts" className="dash-view-btn">All PRs &rarr;</Link>
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
            <Link to="/workouts" className="dash-view-btn">View All &rarr;</Link>
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
            <Link to="/meals" className="dash-view-btn">View All &rarr;</Link>
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
