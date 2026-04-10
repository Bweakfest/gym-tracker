import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const MEASURE_FIELDS = [
  { key: 'waist', label: 'Waist', unit: 'cm', color: '#f59e0b' },
  { key: 'chest', label: 'Chest', unit: 'cm', color: '#22c55e' },
  { key: 'arms', label: 'Arms', unit: 'cm', color: '#3b82f6' },
  { key: 'hips', label: 'Hips', unit: 'cm', color: '#a855f7' },
  { key: 'thighs', label: 'Thighs', unit: 'cm', color: '#ec4899' },
];

// SVG icons for each measurement body part
const MEASURE_ICONS = {
  waist: (color) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="12" rx="8" ry="5" />
      <path d="M4 12c0-2 2-4 4-5M20 12c0-2-2-4-4-5" />
      <path d="M8 7v10M16 7v10" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  ),
  chest: (color) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8c-1 2-1 4 0 6 1 2 3 3 6 3s5-1 6-3c1-2 1-4 0-6" />
      <path d="M6 8c1-2 3-3 6-3s5 1 6 3" />
      <line x1="12" y1="5" x2="12" y2="17" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  ),
  arms: (color) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 5c-1 3-1 7 0 10 0.5 1.5 2 2.5 4 2.5" />
      <path d="M17 5c1 3 1 7 0 10-0.5 1.5-2 2.5-4 2.5" />
      <ellipse cx="12" cy="11" rx="3" ry="5" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  ),
  hips: (color) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 10c0 3 2 6 7 6s7-3 7-6" />
      <path d="M5 10c0-2 3-4 7-4s7 2 7 4" />
      <path d="M9 16v3M15 16v3" opacity="0.5" />
    </svg>
  ),
  thighs: (color) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4c-1 4-2 9-1 14" />
      <path d="M16 4c1 4 2 9 1 14" />
      <ellipse cx="12" cy="10" rx="4" ry="3" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  ),
};

// Mini sparkline component for measurement cards
function MiniSparkline({ data, color, width = 60, height = 24 }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const padY = 2;
  const plotH = height - padY * 2;
  const stepX = width / (vals.length - 1);

  const pts = vals.map((v, i) => `${i * stepX},${padY + plotH - ((v - min) / range) * plotH}`).join(' ');
  const areaPts = pts + ` ${(vals.length - 1) * stepX},${height} 0,${height}`;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#spark-${color.replace('#', '')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle
        cx={(vals.length - 1) * stepX}
        cy={padY + plotH - ((vals[vals.length - 1] - min) / range) * plotH}
        r="2" fill={color}
      />
    </svg>
  );
}

// Combined multi-line chart showing all measurements on one set of axes
// with each field as a distinct colored line. Lines share the same Y scale
// and are positioned along the X axis by actual date, so gaps in logging
// show up proportionally.
function CombinedMeasurementChart({ sortedMeasures, fields }) {
  // Build series per field, skipping fields with no data
  const seriesData = fields.map(f => ({
    field: f,
    points: sortedMeasures
      .filter(m => m[f.key] != null && m[f.key] !== '')
      .map(m => ({ date: m.date, value: Number(m[f.key]) })),
  })).filter(s => s.points.length >= 1);

  if (seriesData.length === 0) return null;

  // Union of all dates across every series, sorted
  const allDateSet = new Set();
  seriesData.forEach(s => s.points.forEach(p => allDateSet.add(p.date)));
  const allDates = [...allDateSet].sort();
  if (allDates.length === 0) return null;

  const vW = 520, vH = 240, padL = 45, padR = 20, padT = 20, padB = 38;
  const plotW = vW - padL - padR, plotH = vH - padT - padB;

  // X scale: time-based so gaps in logging are visible
  const t0 = new Date(allDates[0]).getTime();
  const t1 = new Date(allDates[allDates.length - 1]).getTime();
  const tRange = t1 - t0 || 1;
  const getX = (dateStr) => {
    if (allDates.length === 1) return padL + plotW / 2;
    return padL + ((new Date(dateStr).getTime() - t0) / tRange) * plotW;
  };

  // Y scale: combined min/max across every plotted value
  const allValues = seriesData.flatMap(s => s.points.map(p => p.value));
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const buffer = rawMax === rawMin ? 2 : (rawMax - rawMin) * 0.12;
  const minV = rawMin - buffer;
  const maxV = rawMax + buffer;
  const range = maxV - minV || 1;
  const getY = (v) => padT + plotH - ((v - minV) / range) * plotH;

  const gridLines = 4;
  const gridStep = range / gridLines;

  // Precompute polyline strings for each series
  const seriesWithPaths = seriesData.map(s => ({
    ...s,
    pathPoints: s.points.map(p => `${getX(p.date)},${getY(p.value)}`).join(' '),
  }));

  // X-axis labels: up to 6 evenly spaced dates from the union
  const labelCount = Math.min(6, allDates.length);
  const labelDates = labelCount < 2
    ? allDates
    : Array.from({ length: labelCount }, (_, i) =>
        allDates[Math.round((i / (labelCount - 1)) * (allDates.length - 1))]
      );

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px',
      padding: '1rem', marginTop: '0.75rem',
    }}>
      <div style={{ width: '100%', aspectRatio: '2.3 / 1', minHeight: '180px' }}>
        <svg viewBox={`0 0 ${vW} ${vH}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
          {/* Grid + Y-axis labels (cm) */}
          {Array.from({ length: gridLines + 1 }, (_, i) => {
            const val = minV + i * gridStep;
            const y = getY(val);
            return (
              <g key={`g-${i}`}>
                <line x1={padL} y1={y} x2={vW - padR} y2={y}
                  stroke="var(--border)" strokeWidth="0.5"
                  strokeDasharray={i === 0 || i === gridLines ? 'none' : '4 3'} />
                <text x={padL - 8} y={y + 4} fontSize="10" fill="var(--text-muted)"
                  fontFamily="Inter, sans-serif" textAnchor="end">{val.toFixed(0)}</text>
              </g>
            );
          })}
          {/* X-axis date labels */}
          {labelDates.map((d, i) => (
            <text key={`x-${i}`} x={getX(d)} y={vH - 10} fontSize="9"
              fill="var(--text-muted)" fontFamily="Inter, sans-serif" textAnchor="middle">
              {d.slice(5)}
            </text>
          ))}
          {/* One colored line per measurement */}
          {seriesWithPaths.map(s => (
            <g key={s.field.key}>
              {s.points.length > 1 && (
                <polyline
                  points={s.pathPoints}
                  fill="none"
                  stroke={s.field.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {s.points.map((p, i) => {
                const isLast = i === s.points.length - 1;
                return (
                  <circle
                    key={`${s.field.key}-${i}`}
                    cx={getX(p.date)}
                    cy={getY(p.value)}
                    r={isLast ? 4 : 2.5}
                    fill={s.field.color}
                    stroke="var(--bg-card)"
                    strokeWidth={isLast ? 1.5 : 1}
                  />
                );
              })}
              {/* Label the most recent point with its value */}
              {s.points.length > 0 && (() => {
                const last = s.points[s.points.length - 1];
                return (
                  <text
                    x={getX(last.date) + 6}
                    y={getY(last.value) - 6}
                    fontSize="9"
                    fill={s.field.color}
                    fontWeight="700"
                    fontFamily="Inter, sans-serif"
                  >
                    {last.value}
                  </text>
                );
              })()}
            </g>
          ))}
        </svg>
      </div>
      {/* Legend with per-line total change */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center',
        marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)',
      }}>
        {seriesData.map(s => {
          const first = s.points[0]?.value;
          const last = s.points[s.points.length - 1]?.value;
          const delta = first != null && last != null ? (last - first).toFixed(1) : null;
          const isUp = delta !== null && Number(delta) > 0;
          const isDown = delta !== null && Number(delta) < 0;
          return (
            <div key={s.field.key} style={{
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem',
            }}>
              <span style={{
                width: '14px', height: '3px', background: s.field.color,
                borderRadius: '2px', flexShrink: 0,
              }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{s.field.label}</span>
              {delta !== null && (
                <span style={{
                  color: isDown ? 'var(--accent)' : isUp ? '#f87171' : 'var(--text-muted)',
                  fontWeight: 700,
                }}>
                  {isUp ? '+' : ''}{delta} cm
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Measurement trend chart component
function MeasurementChart({ sortedMeasures, selectedMeasure, fieldDef }) {
  const dataPoints = sortedMeasures
    .filter(m => m[fieldDef.key] != null && m[fieldDef.key] !== '')
    .map(m => ({ date: m.date, value: Number(m[fieldDef.key]) }))
    .slice(-12);

  if (dataPoints.length < 2) return null;

  const vW = 500, vH = 200, padL = 45, padR = 20, padT = 25, padB = 35;
  const plotW = vW - padL - padR, plotH = vH - padT - padB;

  const vals = dataPoints.map(d => d.value);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const buffer = rawMax === rawMin ? 2 : (rawMax - rawMin) * 0.15;
  const minV = rawMin - buffer;
  const maxV = rawMax + buffer;
  const range = maxV - minV || 1;
  const gridLines = 4;
  const gridStep = range / gridLines;

  const getX = (i) => dataPoints.length === 1 ? padL + plotW / 2 : padL + (i / (dataPoints.length - 1)) * plotW;
  const getY = (v) => padT + plotH - ((v - minV) / range) * plotH;

  const points = dataPoints.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const areaPoints = points + ` ${getX(dataPoints.length - 1)},${padT + plotH} ${getX(0)},${padT + plotH}`;

  const color = fieldDef.color;
  const gradId = `measGrad-${fieldDef.key}`;
  const first = dataPoints[0].value;
  const last = dataPoints[dataPoints.length - 1].value;
  const pctChange = first !== 0 ? (((last - first) / first) * 100).toFixed(1) : '0.0';
  const absChange = (last - first).toFixed(1);

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px',
      padding: '1rem', marginTop: '0.75rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color }}>{MEASURE_ICONS[fieldDef.key]?.(color)}</span>
          {fieldDef.label} Trend
        </h4>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '0.78rem', fontWeight: 600,
        }}>
          <span style={{ color: Number(absChange) > 0 ? '#f87171' : Number(absChange) < 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
            {Number(absChange) > 0 ? '+' : ''}{absChange} cm
          </span>
          <span style={{
            padding: '2px 6px', borderRadius: '6px', fontSize: '0.7rem',
            background: Number(pctChange) > 0 ? 'rgba(248,113,113,0.12)' : Number(pctChange) < 0 ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
            color: Number(pctChange) > 0 ? '#f87171' : Number(pctChange) < 0 ? 'var(--accent)' : 'var(--text-muted)',
          }}>
            {Number(pctChange) > 0 ? '+' : ''}{pctChange}%
          </span>
        </div>
      </div>
      <div style={{ width: '100%', aspectRatio: '2.5 / 1', minHeight: '140px' }}>
        <svg viewBox={`0 0 ${vW} ${vH}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {Array.from({ length: gridLines + 1 }, (_, i) => {
            const val = minV + i * gridStep;
            const y = getY(val);
            return (
              <g key={`g-${i}`}>
                <line x1={padL} y1={y} x2={vW - padR} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray={i === 0 || i === gridLines ? 'none' : '4 3'} />
                <text x={padL - 8} y={y + 4} fontSize="10" fill="var(--text-muted)" fontFamily="Inter, sans-serif" textAnchor="end">{val.toFixed(1)}</text>
              </g>
            );
          })}
          {/* X labels */}
          {dataPoints.map((d, i) => (
            <text key={`x-${i}`} x={getX(i)} y={vH - 8} fontSize="9" fill="var(--text-muted)" fontFamily="Inter, sans-serif" textAnchor="middle">{d.date.slice(5)}</text>
          ))}
          {/* Area fill */}
          {dataPoints.length > 1 && <polygon points={areaPoints} fill={`url(#${gradId})`} />}
          {/* Line */}
          {dataPoints.length > 1 && <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          {/* Points */}
          {dataPoints.map((d, i) => {
            const x = getX(i), y = getY(d.value);
            const isLast = i === dataPoints.length - 1;
            return (
              <g key={`p-${i}`}>
                {isLast && <circle cx={x} cy={y} r="7" fill={color} fillOpacity="0.12" />}
                <circle cx={x} cy={y} r={isLast ? 4 : 3} fill={color} stroke={isLast ? '#f8fafc' : 'var(--bg-card)'} strokeWidth={isLast ? 1.5 : 1} />
                {isLast && <text x={x} y={y - 12} fontSize="11" fill={color} fontWeight="700" fontFamily="Inter, sans-serif" textAnchor="middle">{d.value} cm</text>}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function Weight() {
  const { token } = useAuth();
  const { t } = useLang();
  const [weights, setWeights] = useState([]);
  const [goal, setGoal] = useState(null);
  const [form, setForm] = useState({ weight: '', date: localDate() });
  const [measurements, setMeasurements] = useState([]);
  const [mForm, setMForm] = useState({ waist: '', chest: '', arms: '', hips: '', thighs: '', date: localDate() });
  const [showMeasure, setShowMeasure] = useState(false);
  const [measureError, setMeasureError] = useState('');
  const [measureSaving, setMeasureSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('weight'); // weight | measurements
  const [selectedChart, setSelectedChart] = useState('all'); // 'all' or a field key

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
    setMeasureError('');
    const hasAny = MEASURE_FIELDS.some(f => mForm[f.key] !== '' && mForm[f.key] != null);
    if (!hasAny) {
      setMeasureError('Enter at least one measurement');
      return;
    }
    // Build payload — convert empty strings to null so the server can handle them.
    const payload = {
      date: mForm.date || localDate(),
      waist: mForm.waist !== '' ? Number(mForm.waist) : null,
      chest: mForm.chest !== '' ? Number(mForm.chest) : null,
      arms: mForm.arms !== '' ? Number(mForm.arms) : null,
      hips: mForm.hips !== '' ? Number(mForm.hips) : null,
      thighs: mForm.thighs !== '' ? Number(mForm.thighs) : null,
    };
    // Reject NaN values so bad input doesn't silently fail
    for (const f of MEASURE_FIELDS) {
      if (payload[f.key] !== null && Number.isNaN(payload[f.key])) {
        setMeasureError(`Invalid ${f.label.toLowerCase()} value`);
        return;
      }
    }
    setMeasureSaving(true);
    try {
      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMeasureError(data.error || `Save failed (${res.status}). Please try again.`);
        return;
      }
      setMForm({ waist: '', chest: '', arms: '', hips: '', thighs: '', date: localDate() });
      setShowMeasure(false);
      await loadMeasurements();
    } catch (err) {
      console.error('Measurement save failed:', err);
      setMeasureError('Network error — check your connection and try again.');
    } finally {
      setMeasureSaving(false);
    }
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
          <h1>{t('weight')}</h1>
          <p>{t('weightSub')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="wt-tabs">
        <button className={`wt-tab ${activeTab === 'weight' ? 'active' : ''}`} onClick={() => setActiveTab('weight')}>{t('weight')}</button>
        <button className={`wt-tab ${activeTab === 'measurements' ? 'active' : ''}`} onClick={() => setActiveTab('measurements')}>{t('measurements')}</button>
      </div>

      {activeTab === 'weight' && (
        <>
          <div className="form-card">
            <h3>{t('logWeight')}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input type="number" placeholder="e.g. 75.0" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} required min="0" step="0.1" />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn-primary">{t('logWeight')}</button>
            </form>
          </div>

          {weights.length > 0 && (
            <>
              {/* Stats row */}
              <div className="weight-stats">
                <div className="wt-stat-card">
                  <span className="wt-stat-value">{latest?.weight} kg</span>
                  <span className="wt-stat-label">{t('current')}</span>
                </div>
                {targetWeight && (
                  <div className="wt-stat-card">
                    <span className="wt-stat-value">{targetWeight} kg</span>
                    <span className="wt-stat-label">{t('goalWeight')}</span>
                  </div>
                )}
                <div className="wt-stat-card">
                  <span className="wt-stat-value" style={{ color: Number(change) >= 0 ? '#22c55e' : '#f87171' }}>
                    {Number(change) >= 0 ? '+' : ''}{change} kg
                  </span>
                  <span className="wt-stat-label">{t('change')}</span>
                </div>
                <div className="wt-stat-card">
                  <span className="wt-stat-value">{weights.length}</span>
                  <span className="wt-stat-label">{t('entries')}</span>
                </div>
              </div>

              {/* Graph with goal line */}
              <div className="weight-graph-card">
                <h3>{t('weightProgress')}</h3>
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
              <h3>{t('noWeightYet')}</h3>
              <p>{t('weightSub')}</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'measurements' && (
        <>
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>{t('bodyMeasurements')}</h3>
              <button className="btn-primary btn-sm" onClick={() => setShowMeasure(!showMeasure)}>
                {showMeasure ? t('cancel') : t('logMeasurements')}
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
                {measureError && (
                  <div style={{
                    padding: '0.6rem 0.8rem',
                    marginTop: '0.5rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}>
                    {measureError}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ marginTop: '0.5rem', opacity: measureSaving ? 0.6 : 1, cursor: measureSaving ? 'not-allowed' : 'pointer' }}
                  disabled={measureSaving}
                >
                  {measureSaving ? 'Saving...' : t('saveMeasurements')}
                </button>
              </form>
            )}
          </div>

          {/* Enhanced measurement summary cards */}
          {latestMeasure && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '0.6rem',
              marginTop: '0.75rem',
            }}>
              {MEASURE_FIELDS.map(f => {
                const val = latestMeasure[f.key];
                if (!val) return null;

                // Gather all data points for this field
                const allData = sortedMeasures
                  .filter(m => m[f.key] != null && m[f.key] !== '')
                  .map(m => ({ date: m.date, value: Number(m[f.key]) }));
                const firstVal = allData.length > 0 ? allData[0].value : null;
                const lastVal = allData.length > 0 ? allData[allData.length - 1].value : null;
                const totalChange = firstVal !== null && lastVal !== null ? (lastVal - firstVal).toFixed(1) : null;
                const isUp = totalChange !== null && Number(totalChange) > 0;
                const isDown = totalChange !== null && Number(totalChange) < 0;

                return (
                  <div key={f.key} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Subtle color accent line at top */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                      background: `linear-gradient(90deg, ${f.color}, transparent)`,
                    }} />

                    {/* Header row: icon + label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ flexShrink: 0, lineHeight: 0 }}>
                        {MEASURE_ICONS[f.key]?.(f.color)}
                      </span>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.05em', color: 'var(--text-muted)',
                      }}>{f.label}</span>
                    </div>

                    {/* Value row */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{
                        fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)',
                        lineHeight: 1,
                      }}>{val}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.unit}</span>

                      {/* Change arrow */}
                      {totalChange !== null && Number(totalChange) !== 0 && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '2px',
                          fontSize: '0.72rem', fontWeight: 700, marginLeft: 'auto',
                          color: isDown ? 'var(--accent)' : isUp ? '#f87171' : 'var(--text-muted)',
                        }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                            {isUp
                              ? <path d="M5 1L9 6H1Z" />
                              : <path d="M5 9L1 4H9Z" />
                            }
                          </svg>
                          {Math.abs(Number(totalChange))}
                        </span>
                      )}
                    </div>

                    {/* Mini sparkline */}
                    {allData.length >= 2 && (
                      <div style={{ marginTop: '2px' }}>
                        <MiniSparkline data={allData} color={f.color} width={120} height={22} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {latestMeasure && (
            <div style={{
              textAlign: 'center', fontSize: '0.73rem', color: 'var(--text-muted)',
              marginTop: '0.4rem',
            }}>
              Last logged: {latestMeasure.date}
            </div>
          )}

          {/* Measurement trend charts */}
          {sortedMeasures.length >= 2 && (() => {
            // Find which fields have at least 2 data points
            const chartableFields = MEASURE_FIELDS.filter(f =>
              sortedMeasures.filter(m => m[f.key] != null && m[f.key] !== '').length >= 2
            );

            if (chartableFields.length === 0) return null;

            return (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '0.75rem 1rem',
                }}>
                  <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                    Measurement Trends
                  </h3>

                  {/* Chart selector pills */}
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '0.5rem',
                  }}>
                    <button
                      onClick={() => setSelectedChart('all')}
                      style={{
                        padding: '4px 12px', borderRadius: '8px', border: 'none',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        background: selectedChart === 'all' ? 'var(--accent)' : 'var(--bg-input)',
                        color: selectedChart === 'all' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                      }}
                    >All</button>
                    {chartableFields.map(f => (
                      <button
                        key={f.key}
                        onClick={() => setSelectedChart(f.key)}
                        style={{
                          padding: '4px 12px', borderRadius: '8px', border: 'none',
                          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                          background: selectedChart === f.key ? f.color : 'var(--bg-input)',
                          color: selectedChart === f.key ? '#fff' : 'var(--text-secondary)',
                          transition: 'all 0.2s',
                        }}
                      >{f.label}</button>
                    ))}
                  </div>

                  {/* Progress summary row */}
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '0.25rem',
                    padding: '6px 0',
                  }}>
                    {chartableFields
                      .filter(f => selectedChart === 'all' || selectedChart === f.key)
                      .map(f => {
                        const pts = sortedMeasures
                          .filter(m => m[f.key] != null && m[f.key] !== '')
                          .map(m => Number(m[f.key]));
                        const first = pts[0], last = pts[pts.length - 1];
                        const pct = first !== 0 ? (((last - first) / first) * 100).toFixed(1) : '0.0';
                        const isNeg = Number(pct) < 0;
                        return (
                          <div key={f.key} style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            fontSize: '0.72rem',
                          }}>
                            <span style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: f.color, display: 'inline-block', flexShrink: 0,
                            }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{f.label}:</span>
                            <span style={{
                              fontWeight: 700,
                              color: isNeg ? 'var(--accent)' : Number(pct) > 0 ? '#f87171' : 'var(--text-muted)',
                            }}>
                              {Number(pct) > 0 ? '+' : ''}{pct}%
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Render charts: one combined multi-line chart when "All"
                    is selected, otherwise the single focused chart */}
                {selectedChart === 'all' ? (
                  <CombinedMeasurementChart
                    sortedMeasures={sortedMeasures}
                    fields={chartableFields}
                  />
                ) : (
                  chartableFields
                    .filter(f => selectedChart === f.key)
                    .map(f => (
                      <MeasurementChart
                        key={f.key}
                        sortedMeasures={sortedMeasures}
                        selectedMeasure={f.key}
                        fieldDef={f}
                      />
                    ))
                )}
              </div>
            );
          })()}

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
              <h3>{t('noMeasurementsYet')}</h3>
              <p>{t('trackBody')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
