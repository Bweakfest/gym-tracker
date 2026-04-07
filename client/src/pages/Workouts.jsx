import { useState, useEffect } from 'react';
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

export default function Workouts() {
  const { token } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ exercise: '', sets: '', reps: '', weight: '', duration: '', notes: '', date: new Date().toISOString().split('T')[0] });
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [search, setSearch] = useState('');

  const load = () => fetch('http://localhost:3001/api/workouts', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setWorkouts);
  useEffect(() => { load(); }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3001/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setForm({ exercise: '', sets: '', reps: '', weight: '', duration: '', notes: '', date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    load();
  };

  const selectExercise = (name) => {
    setForm({ ...form, exercise: name });
    setShowForm(true);
  };

  const remove = async (id) => {
    await fetch(`http://localhost:3001/api/workouts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const filtered = EXERCISES.filter(ex =>
    (selectedGroup === 'All' || ex.group === selectedGroup) &&
    (search === '' || ex.name.toLowerCase().includes(search.toLowerCase()))
  );

  const today = new Date().toISOString().split('T')[0];
  const todayWorkouts = workouts.filter(w => w.date === today);
  const totalVolume = todayWorkouts.reduce((s, w) => s + ((w.sets || 0) * (w.reps || 0) * (w.weight || 0)), 0);

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

        {/* Right side: Form + Session */}
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
                    <label>Weight (lbs)</label>
                    <input type="number" placeholder="135" value={form.weight} onChange={update('weight')} min="0" step="0.5" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (min)</label>
                    <input type="number" placeholder="30" value={form.duration} onChange={update('duration')} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={form.date} onChange={update('date')} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea placeholder="How did it go?" value={form.notes} onChange={update('notes')} rows="2" />
                </div>
                <button type="submit" className="btn-primary">Add to Session</button>
              </form>
            </div>
          )}

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
                          {w.sets && w.reps ? `${w.sets}×${w.reps}` : ''}{w.weight ? ` @ ${w.weight} lbs` : ''}
                        </div>
                      </div>
                      <span className="session-volume">{(w.sets || 0) * (w.reps || 0) * (w.weight || 0)} lbs</span>
                    </div>
                  ))}
                </div>
                <div className="session-total">Volume: <strong>{totalVolume.toLocaleString()} lbs</strong></div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Full history table */}
      {workouts.length > 0 && (
        <>
          <h2 style={{ margin: '2rem 0 1rem', fontSize: '1.1rem', color: '#f1f5f9' }}>All Workouts</h2>
          <div className="data-table">
            <table>
              <thead>
                <tr><th>Date</th><th>Exercise</th><th>Sets</th><th>Reps</th><th>Weight</th><th>Duration</th><th>Notes</th><th></th></tr>
              </thead>
              <tbody>
                {workouts.map(w => (
                  <tr key={w.id}>
                    <td>{w.date}</td>
                    <td><strong>{w.exercise}</strong></td>
                    <td>{w.sets || '-'}</td>
                    <td>{w.reps || '-'}</td>
                    <td>{w.weight ? `${w.weight} lbs` : '-'}</td>
                    <td>{w.duration ? `${w.duration} min` : '-'}</td>
                    <td className="notes-cell">{w.notes || '-'}</td>
                    <td><button className="btn-delete" onClick={() => remove(w.id)}>Delete</button></td>
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
