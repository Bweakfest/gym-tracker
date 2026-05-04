import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import StreakHeatmap from '../components/StreakHeatmap';

function fmtExact(n) {
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString();
}

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysBetween(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86400000);
}

function workoutVolume(w) {
  if (Array.isArray(w.sets_data) && w.sets_data.length > 0) {
    return w.sets_data.reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weight) || 0), 0);
  }
  return (Number(w.sets) || 0) * (Number(w.reps) || 0) * (Number(w.weight) || 0);
}

export default function Profile() {
  const { user, token } = useAuth();
  const { t } = useLang();

  const [stats, setStats] = useState(null);
  const [prs, setPrs] = useState([]);
  const [weights, setWeights] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [muscleVolume, setMuscleVolume] = useState({});
  const [allWorkouts, setAllWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    Promise.all([
      fetch('/api/stats', auth).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/prs', auth).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/weights', auth).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/measurements', auth).then(r => r.ok ? r.json() : []).catch(() => []),
      // days=36500 → effectively lifetime (server caps at 100 years)
      fetch('/api/volume-by-muscle?days=36500', auth).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('/api/workouts', auth).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([s, p, w, m, mv, wk]) => {
      setStats(s);
      setPrs(Array.isArray(p) ? p : []);
      setWeights(Array.isArray(w) ? w : []);
      setMeasurements(Array.isArray(m) ? m : []);
      setMuscleVolume(mv && typeof mv === 'object' ? mv : {});
      setAllWorkouts(Array.isArray(wk) ? wk : []);
      setLoading(false);
    });
  }, [token]);

  // Derived stats
  const derived = useMemo(() => {
    if (!stats) return null;

    // Distinct gym sessions (unique workout dates), not the row count of
    // exercise entries — each visit logs many exercises.
    const sessionCount = new Set(allWorkouts.map(w => w.date)).size;
    const exerciseCount = allWorkouts.length;

    // Lifetime volume across every set the user has logged.
    const lifetimeVolume = allWorkouts.reduce((sum, w) => sum + workoutVolume(w), 0);

    // Weekly trained days — number of distinct days with workouts in the current week grid
    const weekTrainedDays = (stats.weekDays || []).filter(d => d.trained).length;

    // Avg sessions / week over the heatmap window (12 weeks)
    const heatmapDays = stats.heatmapData || [];
    const distinctDays = new Set(heatmapDays.map(d => d.date)).size;
    const avgPerWeek = distinctDays > 0 ? distinctDays / 12 : 0;

    // Strongest lift — exercise with the highest est. 1RM
    const favourite = (prs[0] && prs[0].exercise) || null;

    // Strongest muscle — the muscle group that has lifted the most weight
    // across the user's entire training history.
    const muscleEntries = Object.entries(muscleVolume || {})
      .map(([name, v]) => [name, Number(v) || 0])
      .filter(([name, v]) => v > 0 && name !== 'Other')
      .sort((a, b) => b[1] - a[1]);
    const strongestMuscle = muscleEntries[0]
      ? { name: muscleEntries[0][0], volume: muscleEntries[0][1] }
      : null;

    // Weight progress: latest log minus first log
    const sortedWeights = [...weights].sort((a, b) => a.date.localeCompare(b.date));
    const firstWeight = sortedWeights[0]?.weight ?? null;
    const latestWeight = sortedWeights[sortedWeights.length - 1]?.weight ?? null;
    const weightDelta = (firstWeight != null && latestWeight != null)
      ? Math.round((latestWeight - firstWeight) * 10) / 10
      : null;
    const weightSpanDays = (firstWeight != null && sortedWeights.length >= 2)
      ? daysBetween(sortedWeights[0].date, sortedWeights[sortedWeights.length - 1].date)
      : null;

    // Goal progress
    let goalProgressPct = null;
    let goalRemaining = null;
    if (stats.goal && latestWeight != null) {
      const start = stats.goal.currentWeight;
      const target = stats.goal.targetWeight;
      if (Number.isFinite(start) && Number.isFinite(target) && start !== target) {
        const total = Math.abs(target - start);
        const done = Math.abs(latestWeight - start);
        goalProgressPct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
        goalRemaining = Math.round((target - latestWeight) * 10) / 10;
      }
    }

    return {
      sessionCount,
      exerciseCount,
      lifetimeVolume,
      weekTrainedDays,
      avgPerWeek,
      favourite,
      strongestMuscle,
      latestWeight,
      firstWeight,
      weightDelta,
      weightSpanDays,
      goalProgressPct,
      goalRemaining,
    };
  }, [stats, prs, weights, muscleVolume, allWorkouts]);

  const latestMeasurement = measurements[0] || null;

  // "Member since" — fall back to first workout/weight log date if no signup date is exposed.
  const memberSince = useMemo(() => {
    const candidates = [
      ...weights.map(w => w.date),
      ...(stats?.recentWorkouts || []).map(w => w.date),
    ].filter(Boolean).sort();
    return candidates[0] || null;
  }, [stats, weights]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><h1>{t('profile') || 'Profile'}</h1></div>
        <div className="loading-screen"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page profile-page">
      <div className="page-header">
        <div>
          <h1>{t('profile') || 'Profile'}</h1>
          <p>Your training journey at a glance</p>
        </div>
      </div>

      {/* Hero */}
      <section className="profile-hero">
        <div className="profile-hero-avatar">
          {user.photo ? (
            <img src={user.photo} alt="" />
          ) : (
            <span>{(user.name || 'U')[0].toUpperCase()}</span>
          )}
        </div>
        <div className="profile-hero-body">
          <h2>{user.name || 'Athlete'}</h2>
          <p className="profile-hero-email">{user.email}</p>
          <div className="profile-hero-meta">
            {memberSince && <span>Member since {fmtDate(memberSince)}</span>}
            {stats?.streak > 0 && (
              <span className="profile-streak-badge">
                {stats.streak} day{stats.streak === 1 ? '' : 's'} streak
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="profile-stats-grid">
        <div className="profile-stat-card">
          <span className="profile-stat-label">Workouts</span>
          <span className="profile-stat-value">{derived?.sessionCount ?? 0}</span>
          <span className="profile-stat-sub">gym sessions</span>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-label">Streak</span>
          <span className="profile-stat-value">{stats?.streak ?? 0}</span>
          <span className="profile-stat-sub">days</span>
        </div>
        <div className="profile-stat-card profile-stat-card-volume">
          <span className="profile-stat-label">Volume</span>
          <span className="profile-stat-value">
            {fmtExact(derived?.lifetimeVolume || 0)}
            <span className="profile-stat-unit"> kg</span>
          </span>
          <span className="profile-stat-sub">all time</span>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-label">PRs</span>
          <span className="profile-stat-value">{prs.length}</span>
          <span className="profile-stat-sub">tracked lifts</span>
        </div>
      </section>

      {/* Body */}
      <section className="profile-section">
        <h3>Body</h3>
        <div className="profile-body-grid">
          <div className="profile-body-cell">
            <span className="profile-body-label">Current weight</span>
            <span className="profile-body-value">
              {derived?.latestWeight != null ? `${derived.latestWeight} kg` : '—'}
            </span>
            {derived?.weightDelta != null && derived.weightSpanDays > 0 && (
              <span className={`profile-body-delta ${derived.weightDelta < 0 ? 'down' : derived.weightDelta > 0 ? 'up' : ''}`}>
                {derived.weightDelta > 0 ? '+' : ''}{derived.weightDelta} kg over {derived.weightSpanDays} d
              </span>
            )}
          </div>
          {stats?.goal && (
            <div className="profile-body-cell">
              <span className="profile-body-label">Goal</span>
              <span className="profile-body-value">
                {stats.goal.targetWeight} kg
              </span>
              {derived?.goalProgressPct != null && (
                <>
                  <div className="profile-progress-bar">
                    <div className="profile-progress-fill" style={{ width: `${derived.goalProgressPct}%` }} />
                  </div>
                  <span className="profile-body-delta">
                    {derived.goalProgressPct}% · {Math.abs(derived.goalRemaining || 0)} kg to go
                  </span>
                </>
              )}
            </div>
          )}
          {latestMeasurement && (
            <>
              {latestMeasurement.chest && (
                <div className="profile-body-cell">
                  <span className="profile-body-label">Chest</span>
                  <span className="profile-body-value">{latestMeasurement.chest} cm</span>
                </div>
              )}
              {latestMeasurement.arms && (
                <div className="profile-body-cell">
                  <span className="profile-body-label">Arms</span>
                  <span className="profile-body-value">{latestMeasurement.arms} cm</span>
                </div>
              )}
              {latestMeasurement.waist && (
                <div className="profile-body-cell">
                  <span className="profile-body-label">Waist</span>
                  <span className="profile-body-value">{latestMeasurement.waist} cm</span>
                </div>
              )}
              {latestMeasurement.thighs && (
                <div className="profile-body-cell">
                  <span className="profile-body-label">Thighs</span>
                  <span className="profile-body-value">{latestMeasurement.thighs} cm</span>
                </div>
              )}
            </>
          )}
        </div>
        {weights.length === 0 && (
          <p className="profile-hint">
            Log your weight on the <Link to="/weight">Weight page</Link> to see progress here.
          </p>
        )}
      </section>

      {/* Top PRs */}
      {prs.length > 0 && (
        <section className="profile-section">
          <div className="profile-section-head">
            <h3>Top lifts</h3>
            <Link to="/prs" className="btn-link">View all</Link>
          </div>
          <ul className="profile-pr-list">
            {prs.slice(0, 5).map(pr => (
              <li key={pr.exercise} className="profile-pr-row">
                <div className="profile-pr-main">
                  <span className="profile-pr-name">{pr.exercise}</span>
                  <span className="profile-pr-detail">
                    {pr.topWeight} kg × {pr.topReps}
                  </span>
                </div>
                <div className="profile-pr-1rm">
                  <span className="profile-pr-1rm-value">{pr.est1RM}</span>
                  <span className="profile-pr-1rm-unit">est. 1RM</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Activity */}
      <section className="profile-section">
        <h3>Activity</h3>
        <div className="profile-activity-summary">
          <div className="profile-activity-cell">
            <span className="profile-body-label">This week</span>
            <span className="profile-body-value">{derived?.weekTrainedDays ?? 0} / 7</span>
          </div>
          <div className="profile-activity-cell">
            <span className="profile-body-label">Avg / week</span>
            <span className="profile-body-value">
              {derived?.avgPerWeek ? derived.avgPerWeek.toFixed(1) : '0.0'}
            </span>
          </div>
          {derived?.strongestMuscle && (
            <div className="profile-activity-cell">
              <span className="profile-body-label">Strongest muscle</span>
              <span className="profile-body-value">{derived.strongestMuscle.name}</span>
              <span className="profile-body-delta">
                {fmtExact(derived.strongestMuscle.volume)} kg lifted
              </span>
            </div>
          )}
          {derived?.favourite && (
            <div className="profile-activity-cell">
              <span className="profile-body-label">Strongest lift</span>
              <span className="profile-body-value">{derived.favourite}</span>
            </div>
          )}
        </div>
        {stats?.heatmapData && stats.heatmapData.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <StreakHeatmap data={stats.heatmapData} />
          </div>
        )}
      </section>

      {/* Today snapshot */}
      <section className="profile-section">
        <h3>Today</h3>
        <div className="profile-today-grid">
          <div className="profile-today-cell">
            <span className="profile-body-label">Exercises</span>
            <span className="profile-body-value">{stats?.todayWorkouts ?? 0}</span>
          </div>
          <div className="profile-today-cell">
            <span className="profile-body-label">Volume</span>
            <span className="profile-body-value">
              {fmtExact(stats?.todayVolume || 0)}
              <span className="profile-stat-unit"> kg</span>
            </span>
          </div>
          <div className="profile-today-cell">
            <span className="profile-body-label">Calories</span>
            <span className="profile-body-value">{stats?.todayCalories ?? 0}</span>
          </div>
          <div className="profile-today-cell">
            <span className="profile-body-label">Protein</span>
            <span className="profile-body-value">{stats?.todayProtein ?? 0} g</span>
          </div>
        </div>
      </section>
    </div>
  );
}
