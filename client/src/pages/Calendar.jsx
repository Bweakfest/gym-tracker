import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Calendar() {
  const { token } = useAuth();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(toDateStr(new Date()));
  const [workouts, setWorkouts] = useState([]);
  const [meals, setMeals] = useState([]);
  const [weights, setWeights] = useState([]);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/workouts', { headers }).then(r => r.json()),
      fetch('/api/meals', { headers }).then(r => r.json()),
      fetch('/api/weights', { headers }).then(r => r.json()),
    ]).then(([w, m, wt]) => { setWorkouts(w || []); setMeals(m || []); setWeights(wt || []); });
  }, [token]);

  // Build calendar grid (Monday-start)
  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1);
  const lastDay = new Date(year, mo + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const totalDays = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, mo, d));

  // Data lookup maps
  const workoutsByDate = {};
  workouts.forEach(w => { (workoutsByDate[w.date] = workoutsByDate[w.date] || []).push(w); });
  const mealsByDate = {};
  meals.forEach(m => { (mealsByDate[m.date] = mealsByDate[m.date] || []).push(m); });
  const weightsByDate = {};
  weights.forEach(w => { (weightsByDate[w.date] = weightsByDate[w.date] || []).push(w); });

  const today = toDateStr(new Date());
  const selectedWorkouts = workoutsByDate[selected] || [];
  const selectedMeals = mealsByDate[selected] || [];
  const selectedWeights = weightsByDate[selected] || [];

  const totalCal = selectedMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProt = selectedMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = selectedMeals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = selectedMeals.reduce((s, m) => s + (m.fat || 0), 0);
  const totalVolume = selectedWorkouts.reduce((s, w) => s + ((w.sets || 0) * (w.reps || 0) * (w.weight || 0)), 0);

  const prevMonth = () => setMonth(new Date(year, mo - 1, 1));
  const nextMonth = () => setMonth(new Date(year, mo + 1, 1));
  const goToday = () => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelected(today); };

  const formatDate = (ds) => {
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Calendar</h1>
          <p>View your training and nutrition history</p>
        </div>
        <button className="btn-primary" onClick={goToday}>Today</button>
      </div>

      {/* Month navigation */}
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>&larr;</button>
        <h2 className="cal-month-title">{MONTHS[mo]} {year}</h2>
        <button className="cal-nav-btn" onClick={nextMonth}>&rarr;</button>
      </div>

      {/* Calendar grid */}
      <div className="cal-grid">
        {DAYS.map(d => <div key={d} className="cal-header">{d}</div>)}
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="cal-cell empty" />;
          const ds = toDateStr(date);
          const hasWorkout = !!workoutsByDate[ds];
          const hasMeal = !!mealsByDate[ds];
          const hasWeight = !!weightsByDate[ds];
          const isToday = ds === today;
          const isSel = ds === selected;
          return (
            <div
              key={ds}
              className={`cal-cell${isToday ? ' today' : ''}${isSel ? ' selected' : ''}${hasWorkout || hasMeal ? ' has-data' : ''}`}
              onClick={() => setSelected(ds)}
            >
              <span className="cal-day-num">{date.getDate()}</span>
              <div className="cal-dots">
                {hasWorkout && <span className="cal-dot workout" />}
                {hasMeal && <span className="cal-dot meal" />}
                {hasWeight && <span className="cal-dot weight" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <span><span className="cal-dot workout" /> Workout</span>
        <span><span className="cal-dot meal" /> Meal</span>
        <span><span className="cal-dot weight" /> Weight</span>
      </div>

      {/* Selected day detail */}
      <div className="cal-detail">
        <h3>{formatDate(selected)}</h3>

        {selectedWorkouts.length === 0 && selectedMeals.length === 0 && selectedWeights.length === 0 && (
          <div className="cal-empty">No activity recorded on this day.</div>
        )}

        {/* Workouts */}
        {selectedWorkouts.length > 0 && (
          <div className="cal-detail-section">
            <h4>Workouts</h4>
            <div className="cal-summary-row">
              <span className="cal-summary-stat">{selectedWorkouts.length} exercise{selectedWorkouts.length > 1 ? 's' : ''}</span>
              <span className="cal-summary-stat">{Math.round(totalVolume).toLocaleString()} kg volume</span>
            </div>
            <div className="cal-items">
              {selectedWorkouts.map(w => (
                <div key={w.id} className="cal-item">
                  <span className="cal-item-name">{w.exercise}</span>
                  <span className="cal-item-detail">{w.sets} x {w.reps} @ {w.weight} kg</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meals */}
        {selectedMeals.length > 0 && (
          <div className="cal-detail-section">
            <h4>Meals</h4>
            <div className="cal-summary-row">
              <span className="cal-summary-stat">{totalCal} kcal</span>
              <span className="cal-summary-stat">{totalProt}g protein</span>
              <span className="cal-summary-stat">{totalCarbs}g carbs</span>
              <span className="cal-summary-stat">{totalFat}g fat</span>
            </div>
            <div className="cal-items">
              {selectedMeals.map(m => (
                <div key={m.id} className="cal-item">
                  <span className="cal-item-name">{m.name}</span>
                  <span className="cal-item-detail">{m.calories} kcal{m.meal_type ? ` · ${m.meal_type}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weight */}
        {selectedWeights.length > 0 && (
          <div className="cal-detail-section">
            <h4>Weight Log</h4>
            <div className="cal-items">
              {selectedWeights.map(w => (
                <div key={w.id} className="cal-item">
                  <span className="cal-item-name">{w.weight} kg</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
