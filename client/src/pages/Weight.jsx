import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const MEASURE_FIELDS = [
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'chest', label: 'Chest', unit: 'cm' },
  { key: 'arms', label: 'Arms', unit: 'cm' },
  { key: 'hips', label: 'Hips', unit: 'cm' },
  { key: 'thighs', label: 'Thighs', unit: 'cm' },
];

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function Weight() {
  const { token } = useAuth();
  const [weights, setWeights] = useState([]);
  const [goal, setGoal] = useState(null);
  const [form, setForm] = useState({ weight: '', date: localDate() });
  const [measurements, setMeasurements] = useState([]);
  const [mForm, setMForm] = useState({ waist: '', chest: '', arms: '', hips: '', thighs: '', date: localDate() });
  const [showMeasure, setShowMeasure] = useState(false);
  const [activeTab, setActiveTab] = useState('weight'); // weight | measurements

  const load = () => fetch('/api/weights', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setWeights);
  const loadGoal = () => fetch('/api/goals', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(g => { if (g) setGoal(g); });
  const loadMeasurements = () => fetch('/api/measurements', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setMeasurements);
  useEffect(() => { load(); loadGoal(); loadMeasurements(); }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('/api/weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setForm({ weight: '', date: localDate() });
    load();
  };

  const handleMeasureSubmit = async (e) => {
    e.preventDefault();
    const hasAny = MEASURE_FIELDS.some(f => mForm[f.key]);
    if (!hasAny) return;
    await fetch('/api/measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(mForm),
    });
    setMForm({ waist: '', chest: '', arms: '', hips: '', thighs: '', date: localDate() });
    setShowMeasure(false);
    loadMeasurements();
  };

  const remove = async (id) => {
    await fetch(`/api/weights/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const removeMeasurement = async (id) => {
    await fetch(`/api/measurements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadMeasurements();
  };

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const change = latest && first ? (latest.weight - first.weight).toFixed(1) : 0;
  const targetWeight = goal?.targetWeight || null;

  // Weekly averages
  const weeklyAvgs = [];
  if (sorted.length > 0) {
    const byWeek = {};
    sorted.forEach(w => {
      const d = new Date(w.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = `${weekStart.getFullYear()}-${String(weekStart.getMonth()+1).padStart(2,'0')}-${String(weekStart.getDate()).padStart(2,'0')}`;
      if (!byWeek[key]) byWeek[key] = [];
      byWeek[key].push(w.weight);
    });
    Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).forEach(([weekStart, vals]) => {
      weeklyAvgs.push({ weekStart, avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10, count: vals.length });
    });
  }

  // Graph calculations (last 10 entries)
  const graphData = sorted.slice(-10);
  const vW = 500, vH = 220, padL = 45, padR = 20, padT = 25, padB = 35;
  const plotW = vW - padL - padR, plotH = vH - padT - padB;

  // Include target weight in min/max range if it exists
  const allWeightValues = graphData.map(w => w.weight);
  if (targetWeight) allWeightValues.push(targetWeight);
  const rawMin = allWeightValues.length ? Math.min(...allWeightValues) : 0;
  const rawMax = allWeightValues.length ? Math.max(...allWeightValues) : 100;
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

  // Goal line Y position
  const goalY = targetWeight ? getY(targetWeight) : null;

  // Measurement change helpers
  const sortedMeasures = [...measurements].sort((a, b) => a.date.localeCompare(b.date));
  const latestMeasure = sortedMeasures[sortedMeasures.length - 1];
  const prevMeasure = sortedMeasures.length >= 2 ? sortedMeasures[sortedMeasures.length - 2] : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Weight & Body</h1>
          <p>Track your weight and body measurements over time</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="wt-tabs">
        <button className={`wt-tab ${activeTab === 'weight' ? 'active' : ''}`} onClick={() => setActiveTab('weight')}>Weight</button>
        <button className={`wt-tab ${activeTab === 'measurements' ? 'active' : ''}`} onClick={() => setActiveTab('measurements')}>Measurements</button>
      </div>

      {activeTab === 'weight' && (
        <>
          <div className="form-card">
            <h3>Log Weight</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input type="number" placeholder="75.0" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} required min="0" step="0.1" />
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
              {/* Stats row */}
              <div className="weight-stats">
                <div className="wt-stat-card">
                  <span className="wt-stat-value">{latest?.weight} kg</span>
                  <span className="wt-stat-label">Current</span>
                </div>
                {targetWeight && (
                  <div className="wt-stat-card">
                    <span className="wt-stat-value">{targetWeight} kg</span>
                    <span className="wt-stat-label">Goal</span>
                  </div>
                )}
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

              {/* Graph with goal line */}
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
                    {/* Goal weight line */}
                    {goalY !== null && goalY >= padT && goalY <= padT + plotH && (
                      <g>
                        <line x1={padL} y1={goalY} x2={vW - padR} y2={goalY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="8 4" />
                        <rect x={vW - padR - 58} y={goalY - 10} width="56" height="18" rx="4" fill="#f59e0b" fillOpacity="0.15" />
                        <text x={vW - padR - 30} y={goalY + 3} fontSize="10" fill="#f59e0b" fontWeight="600" fontFamily="Inter, sans-serif" textAnchor="middle">Goal {targetWeight}</text>
                      </g>
                    )}
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

              {/* Weekly Averages */}
              {weeklyAvgs.length > 0 && (
                <div className="form-card" style={{ marginTop: '1rem' }}>
                  <h3>Weekly Averages</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>Smooths out daily fluctuations for a clearer trend</p>
                  <div className="weekly-avg-list">
                    {weeklyAvgs.slice(-8).reverse().map((w, i) => {
                      const prev = weeklyAvgs.slice(-8).reverse()[i + 1];
                      const diff = prev ? (w.avg - prev.avg).toFixed(1) : null;
                      return (
                        <div key={w.weekStart} className="weekly-avg-item">
                          <span className="weekly-avg-date">Week of {w.weekStart.slice(5)}</span>
                          <span className="weekly-avg-value">{w.avg} kg</span>
                          <span className="weekly-avg-count">{w.count} log{w.count !== 1 ? 's' : ''}</span>
                          {diff !== null && (
                            <span className={`weekly-avg-diff ${Number(diff) > 0 ? 'up' : Number(diff) < 0 ? 'down' : ''}`}>
                              {Number(diff) > 0 ? '+' : ''}{diff}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Weight history table */}
              <div className="data-table" style={{ marginTop: '0.5rem' }}>
                <table>
                  <thead><tr><th>Date</th><th>Weight</th><th></th></tr></thead>
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
        </>
      )}

      {activeTab === 'measurements' && (
        <>
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>Body Measurements</h3>
              <button className="btn-primary btn-sm" onClick={() => setShowMeasure(!showMeasure)}>
                {showMeasure ? 'Cancel' : '+ Log Measurements'}
              </button>
            </div>

            {showMeasure && (
              <form onSubmit={handleMeasureSubmit}>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label>Date</label>
                  <input type="date" value={mForm.date} onChange={e => setMForm({ ...mForm, date: e.target.value })} />
                </div>
                <div className="measure-grid">
                  {MEASURE_FIELDS.map(f => (
                    <div key={f.key} className="form-group">
                      <label>{f.label} ({f.unit})</label>
                      <input type="number" placeholder="0" value={mForm[f.key]} onChange={e => setMForm({ ...mForm, [f.key]: e.target.value })} min="0" step="0.1" />
                    </div>
                  ))}
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Save Measurements</button>
              </form>
            )}
          </div>

          {/* Latest measurements summary */}
          {latestMeasure && (
            <div className="measure-summary">
              {MEASURE_FIELDS.map(f => {
                const val = latestMeasure[f.key];
                if (!val) return null;
                const prevVal = prevMeasure?.[f.key];
                const diff = prevVal ? (val - prevVal).toFixed(1) : null;
                return (
                  <div key={f.key} className="measure-stat">
                    <span className="measure-stat-label">{f.label}</span>
                    <span className="measure-stat-value">{val} {f.unit}</span>
                    {diff !== null && (
                      <span className={`measure-stat-diff ${Number(diff) > 0 ? 'up' : Number(diff) < 0 ? 'down' : ''}`}>
                        {Number(diff) > 0 ? '+' : ''}{diff}
                      </span>
                    )}
                  </div>
                );
              })}
              <div className="measure-stat-date">Last logged: {latestMeasure.date}</div>
            </div>
          )}

          {/* Measurements history table */}
          {measurements.length > 0 && (
            <div className="data-table" style={{ marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    {MEASURE_FIELDS.map(f => <th key={f.key}>{f.label}</th>)}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map(m => (
                    <tr key={m.id}>
                      <td>{m.date}</td>
                      {MEASURE_FIELDS.map(f => (
                        <td key={f.key}>{m[f.key] ? `${m[f.key]} cm` : '-'}</td>
                      ))}
                      <td><button className="btn-delete" onClick={() => removeMeasurement(m.id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {measurements.length === 0 && !showMeasure && (
            <div className="empty-state-large">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                <path d="M4 20h16M4 20V4m0 16l4-4m-4-4l4-4M4 4l4 4m12 12V10m0 10l-4-4m4-4l-4-4"/>
              </svg>
              <h3>No measurements yet</h3>
              <p>Track your waist, chest, arms, and more to see your body composition change.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
