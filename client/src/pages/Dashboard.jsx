import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import Onboarding from '../components/Onboarding';
import MacroDonut from '../components/MacroDonut';
import StreakHeatmap from '../components/StreakHeatmap';

/* Weekly calorie trend chart — measures its container so bars fill the full card width */
function WeeklyChart({ data, goalCal }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    setWidth(Math.max(320, el.clientWidth));
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.max(320, entries[0].contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0) return null;

  const maxCal = Math.max(goalCal, ...data.map(d => d.calories)) * 1.1;
  const vW = width;
  const vH = 200;
  const padL = 18, padR = 18, padT = 22, padB = 30;
  const plotW = vW - padL - padR, plotH = vH - padT - padB;
  const slotW = plotW / data.length;
  const barW = Math.min(slotW * 0.62, 56);
  const goalY = padT + plotH - (goalCal / maxCal) * plotH;

  return (
    <div className="weekly-chart" ref={ref}>
      <svg viewBox={`0 0 ${vW} ${vH}`} width={vW} height={vH} style={{ display: 'block', maxWidth: '100%' }}>
        {/* Goal line */}
        <line x1={padL} y1={goalY} x2={vW - padR} y2={goalY} stroke="#22c55e" strokeWidth="1.25" strokeDasharray="5 4" opacity="0.55" />
        <text x={vW - padR} y={goalY - 6} textAnchor="end" fill="#22c55e" fontSize="11" opacity="0.8">goal</text>
        {/* Bars */}
        {data.map((d, i) => {
          const x = padL + i * slotW + (slotW - barW) / 2;
          const h = d.calories > 0 ? (d.calories / maxCal) * plotH : 0;
          const y = padT + plotH - h;
          const isToday = i === data.length - 1;
          const pct = goalCal > 0 ? d.calories / goalCal : 0;
          const fill = d.calories === 0 ? '#1e293b' : pct >= 0.9 ? '#22c55e' : pct >= 0.5 ? '#f59e0b' : '#ef4444';
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx="6" fill={fill} opacity={isToday ? 1 : 0.7} />
              {d.calories > 0 && <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="#94a3b8" fontSize="11">{d.calories}</text>}
              <text x={x + barW / 2} y={vH - 10} textAnchor="middle" fill={isToday ? '#f1f5f9' : '#94a3b8'} fontSize="12" fontWeight={isToday ? '700' : '500'}>{d.label}</text>
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
  const [loadError, setLoadError] = useState(null);

  const loadStats = useCallback(() => {
    setLoadError(null);
    fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error(`Stats failed: ${r.status}`);
        return r.json();
      })
      .then(setStats)
      .catch(err => {
        console.error('Dashboard stats error:', err);
        setLoadError('Could not load dashboard. Check your connection and try again.');
      });
  }, [token]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loadError) return (
    <div className="page">
      <div className="page-header">
        <div><h1>{t('dashboard')}</h1><p>{t('dashSub')}</p></div>
      </div>
      <div className="form-card empty-state" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--danger, #ef4444)', marginBottom: '1rem' }}>{loadError}</p>
        <button className="btn-primary" onClick={loadStats}>Retry</button>
      </div>
    </div>
  );

  if (!stats) return (
    <div className="page">
      <div className="page-header">
        <div><div className="skeleton skeleton-title" style={{ width: '160px' }} /><div className="skeleton skeleton-text" style={{ width: '220px' }} /></div>
      </div>
      <div className="stats-grid">
        {[1,2,3,4].map(i => <div key={i} className="skeleton-card"><div className="skeleton-row"><div className="skeleton skeleton-circle" /><div className="skeleton skeleton-rect" /></div></div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="skeleton-card" style={{ height: '200px' }} />
        <div className="skeleton-card" style={{ height: '200px' }} />
      </div>
    </div>
  );

  const goalCal = stats.goal?.dailyCalories || 2500;
  const goalProt = stats.goal?.dailyProtein || 180;
  const calPct = Math.min((stats.todayCalories / goalCal) * 100, 100);
  const protPct = Math.min((stats.todayProtein / goalProt) * 100, 100);
  const calLeft = Math.max(goalCal - stats.todayCalories, 0);
  const trainedCount = stats.weekDays?.filter(d => d.trained).length || 0;

  return (
    <div className="page">
      <Onboarding hasGoals={!!stats?.goal} onComplete={() => loadStats()} />
      <div className="page-header">
        <div>
          <h1>{t('dashboard')}</h1>
          <p>{t('dashSub')}</p>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="stats-grid">
        <Link to="/calendar" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-card">
            <div className="stat-icon workout-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.streak}</span>
              <span className="stat-label">{t('dayStreak')}</span>
            </div>
          </div>
        </Link>
        <Link to="/workouts" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-card">
            <div className="stat-icon total-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 6.5h11M6.5 17.5h11M2 12h2M20 12h2M4 8v8M20 8v8"/></svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.todayVolume.toLocaleString()}</span>
              <span className="stat-label">{t('volumeKg')}</span>
            </div>
          </div>
        </Link>
        <Link to="/meals" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-card">
            <div className="stat-icon calorie-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12c-2-2.67-6-2.67-6 2 0 4 6 8 6 8s6-4 6-8c0-4.67-4-4.67-6-2z"/></svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.todayCalories}</span>
              <span className="stat-label">{t('kcalToday')}</span>
            </div>
          </div>
        </Link>
        <Link to="/meals" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-card">
            <div className="stat-icon meals-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: '#22c55e' }}>{calLeft}</span>
              <span className="stat-label">{t('kcalLeft')}</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Macro donut + Weekly grid row */}
      <div className="dash-highlight-row">
        {/* Macro donut chart */}
        <div className="dashboard-section dash-protein-card">
          <div className="section-header">
            <h2>{t('todaysMacros')}</h2>
            <Link to="/meals" className="dash-view-btn">{t('logMeal')} &rarr;</Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            <MacroDonut
              protein={stats.todayProtein}
              carbs={stats.todayCarbs}
              fat={stats.todayFat}
              proteinTarget={goalProt}
              carbsTarget={stats.goal?.dailyCarbs || 250}
              fatTarget={stats.goal?.dailyFat || 65}
              calories={stats.todayCalories}
              calorieTarget={goalCal}
            />
          </div>
        </div>

        {/* Weekly grid */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>{t('thisWeek')}</h2>
            <span className="week-count">{trainedCount}/7 {t('sessions')}</span>
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
          <h2>{t('weeklyCalorieTrend')}</h2>
          <Link to="/calendar" className="dash-view-btn">{t('fullHistory')} &rarr;</Link>
        </div>
        {stats.weeklyTrend?.every(d => d.calories === 0) ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>Start logging meals to see your weekly trend</p>
        ) : (
          <WeeklyChart data={stats.weeklyTrend} goalCal={goalCal} />
        )}
      </div>

      {/* Activity heatmap + Personal Records row */}
      <div className="dashboard-grid dash-activity-row" style={{ marginBottom: '1.5rem' }}>
        {stats.heatmapData && stats.heatmapData.length > 0 && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>{t('activity')}</h2>
              <Link to="/calendar" className="dash-view-btn">{t('viewAll')} &rarr;</Link>
            </div>
            <StreakHeatmap data={stats.heatmapData} />
          </div>
        )}

        {/* PRs */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>{t('personalRecords')}</h2>
            <Link to="/workouts" className="dash-view-btn">{t('allPrs')} &rarr;</Link>
          </div>
          {stats.prs.length === 0 ? (
            <div className="empty-state">
              <p>{t('noPrsYet')}</p>
              <Link to="/workouts" className="btn-primary btn-sm">{t('logWorkout')}</Link>
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

    </div>
  );
}
