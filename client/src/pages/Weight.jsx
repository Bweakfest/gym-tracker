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
  const vW = 500, vH = 200, padL = 45, padR = 20, padT = 20, padB = 35;
  const plotW = vW - padL - padR, plotH = vH - padT - padB;
  const rawMin = graphData.length ? Math.min(...graphData.map(w => w.weight)) : 0;
  const rawMax = graphData.length ? Math.max(...graphData.map(w => w.weight)) : 100;
  const buffer = rawMax === rawMin ? 2 : (rawMax - rawMin) * 0.15;
  const minW = rawMin - buffer;
  const maxW = rawMax + buffer;
  const range = maxW - minW || 1;
  const gridLines = 4;
  const gridStep = range / gridLines;

  const getX = (i) => graphData.length === 1 ? padL + plotW / 2 : padL + (i / (graphData.length - 1)) * plotW;
  const getY = (w) => padT + plotH - ((w - minW) / range) * plotH;

  const points = graphData.map((w, i) => `${getX(i)},${getY(w.weight)}`).join(' ');
  const areaPoints = graphData.length > 0
    ? points + ` ${getX(graphData.length - 1)},${padT + plotH} ${getX(0)},${padT + plotH}`
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
              <svg viewBox={`0 0 ${vW} ${vH}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {/* Grid lines + Y labels */}
                {Array.from({ length: gridLines + 1 }, (_, i) => {
                  const val = minW + i * gridStep;
                  const y = getY(val);
                  return (
                    <g key={`grid-${i}`}>
                      <line x1={padL} y1={y} x2={vW - padR} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray={i === 0 || i === gridLines ? 'none' : '4 3'}/>
                      <text x={padL - 8} y={y + 4} fontSize="11" fill="#94a3b8" fontFamily="Inter, sans-serif" textAnchor="end">{val.toFixed(1)}</text>
                    </g>
                  );
                })}
                {/* X-axis date labels */}
                {graphData.map((w, i) => (
                  <text key={`d-${w.id}`} x={getX(i)} y={vH - 8} fontSize="10" fill="#94a3b8" fontFamily="Inter, sans-serif" textAnchor="middle">{w.date.slice(5)}</text>
                ))}
                {/* Area fill */}
                {graphData.length > 1 && <polygon points={areaPoints} fill="url(#areaGrad)"/>}
                {/* Line */}
                {graphData.length > 1 && <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
                {/* Data points */}
                {graphData.map((w, i) => {
                  const x = getX(i), y = getY(w.weight);
                  const isLast = i === graphData.length - 1;
                  return (
                    <g key={w.id}>
                      {isLast && <circle cx={x} cy={y} r="8" fill="#22c55e" fillOpacity="0.15"/>}
                      <circle cx={x} cy={y} r={isLast ? 5 : 3.5} fill="#22c55e" stroke={isLast ? '#f8fafc' : '#1e293b'} strokeWidth={isLast ? 2 : 1}/>
                      {isLast && <text x={x} y={y - 14} fontSize="12" fill="#22c55e" fontWeight="700" fontFamily="Inter, sans-serif" textAnchor="middle">{w.weight} kg</text>}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="data-table" style={{marginTop: '0.5rem'}}>
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
