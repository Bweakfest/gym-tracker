import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import ExerciseDemo from '../components/ExerciseDemo';

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Core'];

const EXERCISES = [
  { name: 'Barbell Bench Press', group: 'Chest', equipment: 'Barbell', muscles: 'Pecs, anterior deltoid', icon: '🏋️' },
  { name: 'Incline DB Press', group: 'Chest', equipment: 'Dumbbell', muscles: 'Upper pecs, anterior delt', icon: '💪' },
  { name: 'Cable Crossover', group: 'Chest', equipment: 'Cable', muscles: 'Pecs, serratus anterior', icon: '🔗' },
  { name: 'Pec Deck', group: 'Chest', equipment: 'Machine', muscles: 'Pectoralis major', icon: '⚙️' },
  { name: 'Barbell Row', group: 'Back', equipment: 'Barbell', muscles: 'Lats, rhomboids, traps', icon: '🏋️' },
  { name: 'Pull-ups', group: 'Back', equipment: 'Bodyweight', muscles: 'Lats, biceps, rear delt', icon: '💪' },
  { name: 'Lat Pulldown', group: 'Back', equipment: 'Cable', muscles: 'Latissimus dorsi', icon: '🔗' },
  { name: 'Cable Row', group: 'Back', equipment: 'Cable', muscles: 'Lats, rhomboids', icon: '🔗' },
  { name: 'Barbell Squat', group: 'Legs', equipment: 'Barbell', muscles: 'Quads, glutes, hamstrings', icon: '🏋️' },
  { name: 'Romanian Deadlift', group: 'Legs', equipment: 'Barbell', muscles: 'Hamstrings, glutes', icon: '🏋️' },
  { name: 'Leg Press', group: 'Legs', equipment: 'Machine', muscles: 'Quads, glutes', icon: '⚙️' },
  { name: 'Leg Curl', group: 'Legs', equipment: 'Machine', muscles: 'Hamstrings', icon: '⚙️' },
  { name: 'Overhead Press', group: 'Shoulders', equipment: 'Barbell', muscles: 'Anterior delt, triceps', icon: '🏋️' },
  { name: 'Lateral Raise', group: 'Shoulders', equipment: 'Dumbbell', muscles: 'Lateral deltoid', icon: '💪' },
  { name: 'Face Pull', group: 'Shoulders', equipment: 'Cable', muscles: 'Rear delt, rotator cuff', icon: '🔗' },
  { name: 'Barbell Curl', group: 'Biceps', equipment: 'Barbell', muscles: 'Biceps brachii', icon: '🏋️' },
  { name: 'Incline DB Curl', group: 'Biceps', equipment: 'Dumbbell', muscles: 'Long head biceps', icon: '💪' },
  { name: 'Preacher Curl', group: 'Biceps', equipment: 'Barbell', muscles: 'Short head biceps', icon: '🏋️' },
  { name: 'Tricep Pushdown', group: 'Triceps', equipment: 'Cable', muscles: 'Triceps lateral head', icon: '🔗' },
  { name: 'Skull Crushers', group: 'Triceps', equipment: 'Barbell', muscles: 'Triceps long head', icon: '🏋️' },
  { name: 'Overhead Extension', group: 'Triceps', equipment: 'Cable', muscles: 'Triceps long head', icon: '🔗' },
  { name: 'Plank', group: 'Core', equipment: 'Bodyweight', muscles: 'Transverse abdominis', icon: '💪' },
  { name: 'Cable Crunch', group: 'Core', equipment: 'Cable', muscles: 'Rectus abdominis', icon: '🔗' },
];

const TIMER_PRESETS = [30, 60, 90, 120, 180];
function fmtTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

export default function Workouts() {
  const { token } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ exercise: '', sets: '', reps: '', weight: '' });
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [search, setSearch] = useState('');

  // Templates
  const [templates, setTemplates] = useState([]);
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Rest Timer
  const [timerDuration, setTimerDuration] = useState(90);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const intervalRef = useRef(null);

  // Editing
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ exercise: '', sets: '', reps: '', weight: '' });

  // Volume chart
  const [chartExercise, setChartExercise] = useState('');
  const [chartData, setChartData] = useState([]);

  const load = () => fetch('/api/workouts', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setWorkouts);
  const loadTemplates = () => fetch('/api/templates', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setTemplates);
  useEffect(() => { load(); loadTemplates(); }, [token]);

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setTimerRunning(false);
            setTimerDone(true);
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.frequency.value = 880; gain.gain.value = 0.3;
              osc.start(); osc.stop(ctx.currentTime + 0.3);
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  const startTimer = (dur) => {
    clearInterval(intervalRef.current);
    setTimerDuration(dur);
    setTimerSeconds(dur);
    setTimerDone(false);
    setTimerRunning(true);
  };

  const stopTimer = () => {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerDone(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() }),
    });
    setForm({ exercise: '', sets: '', reps: '', weight: '' });
    setShowForm(false);
    load();
    startTimer(timerDuration);
  };

  const selectExercise = (name) => {
    setForm({ ...form, exercise: name });
    setShowForm(true);
  };

  const remove = async (id) => {
    await fetch(`/api/workouts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Template actions
  const saveTemplate = async () => {
    if (!templateName.trim() || todayWorkouts.length === 0) return;
    const exercises = todayWorkouts.map(w => ({ exercise: w.exercise, sets: w.sets, reps: w.reps, weight: w.weight }));
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: templateName.trim(), exercises }),
    });
    setTemplateName('');
    setShowTemplateSave(false);
    loadTemplates();
  };

  const loadTemplate = async (id) => {
    await fetch(`/api/templates/${id}/load`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const deleteTemplate = async (id) => {
    await fetch(`/api/templates/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadTemplates();
  };

  // Inline editing
  const startEdit = (w) => {
    setEditingId(w.id);
    setEditForm({ exercise: w.exercise, sets: w.sets || '', reps: w.reps || '', weight: w.weight || '' });
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (id) => {
    await fetch(`/api/workouts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    load();
  };
  const updateEdit = (field) => (e) => setEditForm({ ...editForm, [field]: e.target.value });

  // Volume chart
  const loadChart = async (exercise) => {
    setChartExercise(exercise);
    if (!exercise) { setChartData([]); return; }
    const data = await fetch(`/api/workouts/volume?exercise=${encodeURIComponent(exercise)}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    setChartData(data);
  };

  const filtered = EXERCISES.filter(ex =>
    (selectedGroup === 'All' || ex.group === selectedGroup) &&
    (search === '' || ex.name.toLowerCase().includes(search.toLowerCase()))
  );

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const todayWorkouts = workouts.filter(w => w.date === today);
  const totalVolume = todayWorkouts.reduce((s, w) => s + ((w.sets || 0) * (w.reps || 0) * (w.weight || 0)), 0);

  // Unique exercises the user has logged (for chart selector)
  const loggedExercises = [...new Set(workouts.map(w => w.exercise))].sort();

  // Volume chart SVG
  const vW = 500, vH = 200, padL = 50, padR = 15, padT = 20, padB = 35;
  const plotW = vW - padL - padR, plotH = vH - padT - padB;
  const maxVol = chartData.length ? Math.max(...chartData.map(d => d.volume)) * 1.1 : 100;
  const gridLines = 4;

  // Timer SVG
  const tR = 50, tCirc = 2 * Math.PI * tR;
  const tPct = timerDuration > 0 ? timerSeconds / timerDuration : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Workouts</h1>
          <p>Browse exercises and log your sessions</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Log Workout'}
        </button>
      </div>

      <div className="workout-layout">
        {/* Exercise Library */}
        <div className="exercise-library">
          <div className="form-card">
            <h3>Exercise Library</h3>
            <div className="chips">
              {MUSCLE_GROUPS.map(g => (
                <button key={g} className={`chip ${selectedGroup === g ? 'sel' : ''}`} onClick={() => setSelectedGroup(g)}>{g}</button>
              ))}
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <input type="text" placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="exercise-list">
              {filtered.map(ex => (
                <div key={ex.name} className="exercise-card" onClick={() => selectExercise(ex.name)}>
                  <div className="exercise-icon">
                    <ExerciseDemo exercise={ex.name} />
                  </div>
                  <div className="exercise-info">
                    <div className="exercise-name">{ex.name}</div>
                    <div className="exercise-meta">{ex.group} · {ex.equipment}</div>
                    <div className="exercise-muscles">{ex.muscles}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: Form + Timer + Templates + Session */}
        <div className="workout-right">
          {showForm && (
            <div className="form-card">
              <h3>{form.exercise || 'New Workout'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Exercise</label>
                  <input type="text" placeholder="e.g. Bench Press" value={form.exercise} onChange={update('exercise')} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Sets</label>
                    <input type="number" placeholder="4" value={form.sets} onChange={update('sets')} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Reps</label>
                    <input type="number" placeholder="8" value={form.reps} onChange={update('reps')} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" placeholder="135" value={form.weight} onChange={update('weight')} min="0" step="0.5" />
                  </div>
                </div>
                <button type="submit" className="btn-primary">Add to Session</button>
              </form>
            </div>
          )}

          {/* Rest Timer */}
          <div className="form-card">
            <h3>Rest Timer</h3>
            <div className="chips" style={{ marginBottom: '0.75rem' }}>
              {TIMER_PRESETS.map(p => (
                <button key={p} className={`chip ${timerDuration === p && !timerRunning ? 'sel' : ''}`}
                  onClick={() => { if (!timerRunning) setTimerDuration(p); }}>{p < 60 ? `${p}s` : `${p / 60}m`}</button>
              ))}
            </div>
            <div className={`timer-display ${timerDone ? 'timer-done' : ''}`}>
              <svg width="130" height="130" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={tR} fill="none" stroke="#1e293b" strokeWidth="6" />
                <circle cx="60" cy="60" r={tR} fill="none"
                  stroke={timerDone ? '#fbbf24' : '#22c55e'} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={tCirc} strokeDashoffset={tCirc * (1 - tPct)}
                  transform="rotate(-90 60 60)"
                  style={{ transition: timerRunning ? 'stroke-dashoffset 1s linear' : 'none' }} />
                <text x="60" y="65" textAnchor="middle" fill={timerRunning || timerDone ? '#f1f5f9' : '#64748b'}
                  fontSize="28" fontWeight="700" fontFamily="'Inter', monospace">
                  {fmtTime(timerSeconds)}
                </text>
              </svg>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!timerRunning ? (
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => startTimer(timerDuration)}>Start</button>
              ) : (
                <button className="btn-secondary" style={{ flex: 1 }} onClick={stopTimer}>Stop</button>
              )}
            </div>
          </div>

          {/* Templates */}
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>Templates</h3>
              {todayWorkouts.length > 0 && (
                <button className="btn-secondary btn-sm" onClick={() => setShowTemplateSave(true)}>Save Session</button>
              )}
            </div>
            {showTemplateSave && (
              <div className="template-save-row">
                <input type="text" placeholder="e.g. Push Day" value={templateName} onChange={e => setTemplateName(e.target.value)} />
                <button className="btn-primary btn-sm" onClick={saveTemplate}>Save</button>
                <button className="btn-secondary btn-sm" onClick={() => setShowTemplateSave(false)}>Cancel</button>
              </div>
            )}
            {templates.length === 0 ? (
              <div className="empty-state"><p>No templates yet. Log a session and save it!</p></div>
            ) : (
              <div className="template-list">
                {templates.map(t => (
                  <div key={t.id} className="template-item">
                    <div className="template-info">
                      <span className="template-name">{t.name}</span>
                      <span className="template-meta">{t.exercises.length} exercises</span>
                    </div>
                    <div className="template-actions">
                      <button className="btn-primary btn-sm" onClick={() => loadTemplate(t.id)}>Load</button>
                      <button className="btn-delete" onClick={() => deleteTemplate(t.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session Log */}
          <div className="form-card">
            <h3>Session Log</h3>
            {todayWorkouts.length === 0 ? (
              <div className="empty-state">
                <p>No exercises logged today. Pick one from the library!</p>
              </div>
            ) : (
              <>
                <div className="session-list">
                  {todayWorkouts.map(w => (
                    <div key={w.id} className="session-item">
                      <div>
                        <div className="session-exercise">{w.exercise}</div>
                        <div className="session-detail">
                          {w.sets && w.reps ? `${w.sets}x${w.reps}` : ''}{w.weight ? ` @ ${w.weight} kg` : ''}
                        </div>
                      </div>
                      <span className="session-volume">{(w.sets || 0) * (w.reps || 0) * (w.weight || 0)} kg</span>
                    </div>
                  ))}
                </div>
                <div className="session-total">Volume: <strong>{totalVolume.toLocaleString()} kg</strong></div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Volume Progression Chart */}
      {loggedExercises.length > 0 && (
        <div className="form-card" style={{ marginTop: '1.5rem' }}>
          <h3>Volume Progression</h3>
          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <select value={chartExercise} onChange={e => loadChart(e.target.value)}>
              <option value="">Select an exercise...</option>
              {loggedExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          {chartExercise && chartData.length < 2 && (
            <div className="empty-state"><p>Log this exercise on more days to see trends.</p></div>
          )}
          {chartData.length >= 2 && (
            <div className="volume-chart">
              <svg viewBox={`0 0 ${vW} ${vH}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid */}
                {Array.from({ length: gridLines + 1 }, (_, i) => {
                  const val = (maxVol / gridLines) * i;
                  const y = padT + plotH - (val / maxVol) * plotH;
                  return (
                    <g key={`g-${i}`}>
                      <line x1={padL} y1={y} x2={vW - padR} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray={i === 0 ? 'none' : '4 3'} />
                      <text x={padL - 8} y={y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">{Math.round(val)}</text>
                    </g>
                  );
                })}
                {/* Area */}
                <polygon
                  points={chartData.map((d, i) => {
                    const x = padL + (i / (chartData.length - 1)) * plotW;
                    const y = padT + plotH - (d.volume / maxVol) * plotH;
                    return `${x},${y}`;
                  }).join(' ') + ` ${padL + plotW},${padT + plotH} ${padL},${padT + plotH}`}
                  fill="url(#volGrad)" />
                {/* Line */}
                <polyline
                  points={chartData.map((d, i) => {
                    const x = padL + (i / (chartData.length - 1)) * plotW;
                    const y = padT + plotH - (d.volume / maxVol) * plotH;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Points + labels */}
                {chartData.map((d, i) => {
                  const x = padL + (i / (chartData.length - 1)) * plotW;
                  const y = padT + plotH - (d.volume / maxVol) * plotH;
                  const isLast = i === chartData.length - 1;
                  return (
                    <g key={d.date}>
                      {isLast && <circle cx={x} cy={y} r="8" fill="#22c55e" fillOpacity="0.15" />}
                      <circle cx={x} cy={y} r={isLast ? 5 : 3.5} fill="#22c55e" stroke={isLast ? '#f8fafc' : '#1e293b'} strokeWidth={isLast ? 2 : 1} />
                      {isLast && <text x={x} y={y - 12} fontSize="11" fill="#22c55e" fontWeight="700" textAnchor="middle">{d.volume.toLocaleString()} kg</text>}
                      <text x={x} y={vH - 8} fontSize="9" fill="#94a3b8" textAnchor="middle">{d.date.slice(5)}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Full history table */}
      {workouts.length > 0 && (
        <>
          <h2 style={{ margin: '2rem 0 1rem', fontSize: '1.1rem', color: '#f1f5f9' }}>All Workouts</h2>
          <div className="data-table">
            <table>
              <thead>
                <tr><th>Date</th><th>Exercise</th><th>Sets</th><th>Reps</th><th>Weight</th><th></th></tr>
              </thead>
              <tbody>
                {workouts.map(w => (
                  <tr key={w.id}>
                    {editingId === w.id ? (
                      <>
                        <td>{w.date}</td>
                        <td><input value={editForm.exercise} onChange={updateEdit('exercise')} /></td>
                        <td><input type="number" value={editForm.sets} onChange={updateEdit('sets')} style={{ width: '60px' }} /></td>
                        <td><input type="number" value={editForm.reps} onChange={updateEdit('reps')} style={{ width: '60px' }} /></td>
                        <td><input type="number" value={editForm.weight} onChange={updateEdit('weight')} style={{ width: '80px' }} step="0.5" /></td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-save" onClick={() => saveEdit(w.id)}>Save</button>
                            <button className="btn-delete" onClick={cancelEdit}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{w.date}</td>
                        <td><strong>{w.exercise}</strong></td>
                        <td>{w.sets || '-'}</td>
                        <td>{w.reps || '-'}</td>
                        <td>{w.weight ? `${w.weight} kg` : '-'}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-edit" onClick={() => startEdit(w)}>Edit</button>
                            <button className="btn-delete" onClick={() => remove(w.id)}>Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
