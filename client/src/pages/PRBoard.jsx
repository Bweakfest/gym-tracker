import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export default function PRBoard() {
  const { token } = useAuth();
  const [prs, setPrs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('1rm'); // '1rm' | 'weight' | 'recent' | 'name'
  const [showGoalForm, setShowGoalForm] = useState(null); // exercise name or null
  const [goalInput, setGoalInput] = useState({ target_weight: '', target_reps: '1' });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prsRes, goalsRes] = await Promise.all([
        fetch('/api/prs', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/goals/exercise', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      setPrs(Array.isArray(prsRes) ? prsRes : []);
      setGoals(Array.isArray(goalsRes) ? goalsRes : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [token]);

  const goalMap = useMemo(() => {
    const m = {};
    goals.forEach(g => { m[g.exercise] = g; });
    return m;
  }, [goals]);

  const filtered = useMemo(() => {
    let list = prs.filter(p => !search || p.exercise.toLowerCase().includes(search.toLowerCase()));
    const byKey = {
      '1rm': (a, b) => (b.est1RM || 0) - (a.est1RM || 0),
      'weight': (a, b) => (b.weight || 0) - (a.weight || 0),
      'recent': (a, b) => (b.date || '').localeCompare(a.date || ''),
      'name': (a, b) => a.exercise.localeCompare(b.exercise),
    };
    list.sort(byKey[sort] || byKey['1rm']);
    return list;
  }, [prs, search, sort]);

  const saveGoal = async (exercise) => {
    const w = parseFloat(goalInput.target_weight);
    const r = parseInt(goalInput.target_reps) || 1;
    if (!w || w <= 0) return;
    await fetch('/api/goals/exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ exercise, target_weight: w, target_reps: r }),
    });
    setShowGoalForm(null);
    setGoalInput({ target_weight: '', target_reps: '1' });
    loadAll();
  };

  const deleteGoal = async (id) => {
    await fetch(`/api/goals/exercise/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadAll();
  };

  const totalVolume = prs.reduce((s, p) => s + (p.weight * p.reps), 0);
  const topLift = prs.length ? prs.reduce((m, p) => (p.est1RM > (m?.est1RM || 0) ? p : m), null) : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Personal Records</h1>
          <p>Top sets, 1RM estimates, and weight goals per exercise.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="pr-summary">
        <div className="pr-summary-card">
          <span className="pr-summary-label">Total PRs</span>
          <span className="pr-summary-value">{prs.length}</span>
        </div>
        <div className="pr-summary-card">
          <span className="pr-summary-label">Top Lift (est 1RM)</span>
          <span className="pr-summary-value">{topLift ? `${topLift.est1RM} kg` : '—'}</span>
          {topLift && <span className="pr-summary-sub">{topLift.exercise}</span>}
        </div>
        <div className="pr-summary-card">
          <span className="pr-summary-label">Goals set</span>
          <span className="pr-summary-value">{goals.length}</span>
          <span className="pr-summary-sub">{goals.filter(g => g.achieved_at).length} achieved</span>
        </div>
      </div>

      {/* Controls */}
      <div className="form-card" style={{ marginBottom: '1rem' }}>
        <div className="pr-controls">
          <input
            type="text"
            placeholder="Search exercise…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-search"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="pr-sort">
            <option value="1rm">Sort: Est. 1RM</option>
            <option value="weight">Sort: Top Weight</option>
            <option value="recent">Sort: Most Recent</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="form-card"><p>Loading PRs…</p></div>
      ) : filtered.length === 0 ? (
        <div className="form-card empty-state">
          <p>No personal records yet. Log a workout to start tracking!</p>
        </div>
      ) : (
        <div className="pr-grid">
          {filtered.map(pr => {
            const goal = goalMap[pr.exercise];
            const hasGoal = !!goal;
            const achieved = hasGoal && goal.achieved_at;
            const pct = hasGoal ? Math.min(100, Math.round((pr.weight / goal.target_weight) * 100)) : 0;
            const isEditing = showGoalForm === pr.exercise;

            return (
              <div key={pr.exercise} className="pr-card">
                <div className="pr-card-header">
                  <h3 className="pr-card-title">{pr.exercise}</h3>
                  {achieved && <span className="pr-goal-badge">✓ Achieved</span>}
                </div>

                <div className="pr-card-stats">
                  <div className="pr-stat">
                    <span className="pr-stat-label">Top Set</span>
                    <span className="pr-stat-value">{pr.weight} × {pr.reps}</span>
                  </div>
                  <div className="pr-stat">
                    <span className="pr-stat-label">Est. 1RM</span>
                    <span className="pr-stat-value pr-stat-accent">{pr.est1RM} kg</span>
                  </div>
                  <div className="pr-stat">
                    <span className="pr-stat-label">Set On</span>
                    <span className="pr-stat-value pr-stat-dim">{pr.date || '—'}</span>
                  </div>
                </div>

                {/* Goal section */}
                {hasGoal ? (
                  <div className="pr-goal">
                    <div className="pr-goal-row">
                      <span className="pr-goal-label">Goal</span>
                      <span className="pr-goal-target">{goal.target_weight} × {goal.target_reps || 1}</span>
                      <button className="btn-delete" style={{ padding: '0 6px' }} onClick={() => deleteGoal(goal.id)}>×</button>
                    </div>
                    <div className="pr-goal-bar">
                      <div className="pr-goal-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="pr-goal-pct">{pct}%</span>
                  </div>
                ) : isEditing ? (
                  <div className="pr-goal-form">
                    <div className="pr-goal-inputs">
                      <input
                        type="number"
                        placeholder="Weight"
                        step="0.5"
                        min="0"
                        value={goalInput.target_weight}
                        onChange={e => setGoalInput(g => ({ ...g, target_weight: e.target.value }))}
                      />
                      <input
                        type="number"
                        placeholder="Reps"
                        min="1"
                        value={goalInput.target_reps}
                        onChange={e => setGoalInput(g => ({ ...g, target_reps: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-primary btn-sm" onClick={() => saveGoal(pr.exercise)}>Save</button>
                      <button className="btn-secondary btn-sm" onClick={() => setShowGoalForm(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn-secondary btn-sm pr-add-goal"
                    onClick={() => {
                      setShowGoalForm(pr.exercise);
                      setGoalInput({ target_weight: String(pr.weight || ''), target_reps: '1' });
                    }}
                  >
                    + Set Goal
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
