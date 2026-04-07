import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Weight() {
  const { token } = useAuth();
  const [weights, setWeights] = useState([]);
  const [form, setForm] = useState({ weight: '', date: new Date().toISOString().split('T')[0] });

  const load = () => fetch('/api/weights', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setWeights);
  useEffect(() => { load(); }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('/api/weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setForm({ weight: '', date: new Date().toISOString().split('T')[0] });
    load();
  };

  const remove = async (id) => {
    await fetch(`/api/weights/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const change = latest && first ? (latest.weight - first.weight).toFixed(1) : 0;

  // Graph calculations
  const graphData = sorted.slice(-10);
  const minW = graphData.length ? Math.min(...graphData.map(w => w.weight)) - 1 : 0;
  const maxW = graphData.length ? Math.max(...graphData.map(w => w.weight)) + 1 : 100;
  const range = maxW - minW || 1;

  const points = graphData.map((w, i) => {
    const x = graphData.length === 1 ? 150 : 20 + (i / (graphData.length - 1)) * 260;
    const y = 85 - ((w.weight - minW) / range) * 70;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = graphData.length > 0
    ? points + ` ${20 + ((graphData.length - 1) / Math.max(graphData.length - 1, 1)) * 260},95 20,95`
    : '';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Weight Tracker</h1>
          <p>Track your body weight over time</p>
        </div>
      </div>

      <div className="form-card">
        <h3>Log Weight</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Weight (kg)</label>
              <input type="number" placeholder="165" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} required min="0" step="0.1" />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn-primary">Log Weight</button>
        </form>
      </div>

      {weights.length > 0 && (
        <>
          <div className="weight-stats">
            <div className="wt-stat-card">
              <span className="wt-stat-value">{latest?.weight} kg</span>
              <span className="wt-stat-label">Current</span>
            </div>
            <div className="wt-stat-card">
              <span className="wt-stat-value" style={{ color: Number(change) >= 0 ? '#22c55e' : '#f87171' }}>
                {Number(change) >= 0 ? '+' : ''}{change} kg
              </span>
              <span className="wt-stat-label">Change</span>
            </div>
            <div className="wt-stat-card">
              <span className="wt-stat-value">{weights.length}</span>
              <span className="wt-stat-label">Entries</span>
            </div>
          </div>

          <div className="weight-graph-card">
            <h3>Weight Progress</h3>
            <div className="weight-graph">
              <svg viewBox="0 0 300 100" preserveAspectRatio="none" width="100%" height="100%">
                <line x1="0" y1="25" x2="300" y2="25" stroke="#1e293b" strokeWidth="1"/>
                <line x1="0" y1="50" x2="300" y2="50" stroke="#1e293b" strokeWidth="1"/>
                <line x1="0" y1="75" x2="300" y2="75" stroke="#1e293b" strokeWidth="1"/>
                {graphData.length > 1 && <polygon points={areaPoints} fill="rgba(34,197,94,0.08)"/>}
                {graphData.length > 1 && <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
                {graphData.map((w, i) => {
                  const x = graphData.length === 1 ? 150 : 20 + (i / (graphData.length - 1)) * 260;
                  const y = 85 - ((w.weight - minW) / range) * 70;
                  return <circle key={w.id} cx={x} cy={y} r={i === graphData.length - 1 ? 4 : 3} fill="#22c55e" stroke={i === graphData.length - 1 ? '#f8fafc' : 'none'} strokeWidth="1.5"/>;
                })}
                <text x="5" y="20" fontSize="7" fill="#64748b" fontFamily="sans-serif">{maxW.toFixed(0)}</text>
                <text x="5" y="90" fontSize="7" fill="#64748b" fontFamily="sans-serif">{minW.toFixed(0)}</text>
              </svg>
            </div>
            <div className="weight-graph-dates">
              {graphData.map((w, i) => (
                <span key={w.id}>{w.date.slice(5)}</span>
              ))}
            </div>
          </div>

          <div className="data-table">
            <table>
              <thead>
                <tr><th>Date</th><th>Weight</th><th></th></tr>
              </thead>
              <tbody>
                {[...weights].sort((a, b) => b.date.localeCompare(a.date)).map(w => (
                  <tr key={w.id}>
                    <td>{w.date}</td>
                    <td><strong>{w.weight} kg</strong></td>
                    <td><button className="btn-delete" onClick={() => remove(w.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {weights.length === 0 && (
        <div className="empty-state-large">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
          <h3>No weight entries yet</h3>
          <p>Log your weight above to start tracking your progress.</p>
        </div>
      )}
    </div>
  );
}
