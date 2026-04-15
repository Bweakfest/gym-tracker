import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import MuscleMap from '../components/MuscleMap';
import { EXERCISES } from './Workouts';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function Calendar() {
  const { token } = useAuth();
  const { t } = useLang();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(toDateStr(new Date()));
  const [view, setView] = useState('month'); // 'month' | 'week'
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day + 6) % 7; // Monday = 0
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  });
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

  // Week view days
  const weekDays = [];
  for (let i = 0; i < 7; i++) weekDays.push(addDays(weekStart, i));

  // Data lookup maps
  const workoutsByDate = {};
  workouts.forEach(w => { (workoutsByDate[w.date] = workoutsByDate[w.date] || []).push(w); });
  const mealsByDate = {};
  meals.forEach(m => { (mealsByDate[m.date] = mealsByDate[m.date] || []).push(m); });
  const weightsByDate = {};
  weights.forEach(w => { (weightsByDate[w.date] = weightsByDate[w.date] || []).push(w); });

  // Streak computation: consecutive days with any activity (workout or meal)
  const streakSet = useMemo(() => {
    const active = new Set();
    workouts.forEach(w => active.add(w.date));
    meals.forEach(m => active.add(m.date));
    return active;
  }, [workouts, meals]);

  const streaks = useMemo(() => {
    const map = {}; // dateStr -> streak length ending on that date
    if (streakSet.size === 0) return map;
    const sorted = [...streakSet].sort();
    let run = 1;
    map[sorted[0]] = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1] + 'T00:00:00');
      const curr = new Date(sorted[i] + 'T00:00:00');
      const diff = (curr - prev) / 86400000;
      run = diff === 1 ? run + 1 : 1;
      map[sorted[i]] = run;
    }
    // Back-fill: every date in a streak of length N gets that N
    const filled = {};
    for (let i = sorted.length - 1; i >= 0; i--) {
      const d = sorted[i];
      if (filled[d]) continue;
      const streakLen = map[d];
      for (let j = 0; j < streakLen; j++) {
        const dt = toDateStr(addDays(new Date(sorted[i] + 'T00:00:00'), -j));
        if (streakSet.has(dt)) filled[dt] = streakLen;
      }
    }
    return filled;
  }, [streakSet]);

  // Current streak (from today going backwards)
  const currentStreak = useMemo(() => {
    let count = 0;
    let d = new Date();
    while (true) {
      const ds = toDateStr(d);
      if (streakSet.has(ds)) { count++; d = addDays(d, -1); }
      else break;
    }
    return count;
  }, [streakSet]);

  // Longest streak
  const longestStreak = useMemo(() => {
    return Math.max(0, ...Object.values(streaks));
  }, [streaks]);

  const today = toDateStr(new Date());
  const selectedWorkouts = workoutsByDate[selected] || [];
  const selectedMeals = mealsByDate[selected] || [];
  const selectedWeights = weightsByDate[selected] || [];

  const totalCal = selectedMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProt = selectedMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = selectedMeals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = selectedMeals.reduce((s, m) => s + (m.fat || 0), 0);
  const totalVolume = selectedWorkouts.reduce((s, w) => s + ((w.sets || 0) * (w.reps || 0) * (w.weight || 0)), 0);

  // Enrich workouts with exercise metadata so MuscleMap can derive activated regions
  const selectedMuscleMapData = useMemo(() => selectedWorkouts.map(w => {
    const ex = EXERCISES.find(e => e.name === w.exercise);
    return {
      exercise: w.exercise,
      group: ex?.group || w.muscle_group || '',
      muscles: ex?.muscles || '',
    };
  }), [selectedWorkouts]);

  const prevMonth = () => setMonth(new Date(year, mo - 1, 1));
  const nextMonth = () => setMonth(new Date(year, mo + 1, 1));
  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToday = () => {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(today);
    const day = now.getDay();
    const diff = (day + 6) % 7;
    setWeekStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff));
  };

  const formatDate = (ds) => {
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatWeekRange = () => {
    const end = addDays(weekStart, 6);
    const opts = { day: 'numeric', month: 'short' };
    const s = weekStart.toLocaleDateString('en-GB', opts);
    const e = end.toLocaleDateString('en-GB', { ...opts, year: 'numeric' });
    return `${s} – ${e}`;
  };

  const getDayMacros = (ds) => {
    const dm = mealsByDate[ds] || [];
    return {
      cal: dm.reduce((s, m) => s + (m.calories || 0), 0),
      prot: dm.reduce((s, m) => s + (m.protein || 0), 0),
    };
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('calendar')}</h1>
          <p>{t('calendarSub')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-primary" onClick={goToday}>Today</button>
        </div>
      </div>

      {/* View toggle + streak banner */}
      <div className="cal-toolbar">
        <div className="cal-view-toggle">
          <button className={`cal-view-btn${view === 'month' ? ' active' : ''}`} onClick={() => setView('month')}>{t('month')}</button>
          <button className={`cal-view-btn${view === 'week' ? ' active' : ''}`} onClick={() => setView('week')}>{t('week')}</button>
        </div>
        <div className="cal-streak-banner">
          <span className="cal-streak-fire">{currentStreak > 0 ? '\u{1F525}' : '\u{26A1}'}</span>
          <span className="cal-streak-count">{currentStreak} day streak</span>
          {longestStreak > currentStreak && (
            <span className="cal-streak-best">Best: {longestStreak}</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={view === 'month' ? prevMonth : prevWeek}>&larr;</button>
        <h2 className="cal-month-title">{view === 'month' ? `${MONTHS[mo]} ${year}` : formatWeekRange()}</h2>
        <button className="cal-nav-btn" onClick={view === 'month' ? nextMonth : nextWeek}>&rarr;</button>
      </div>

      {/* Month view */}
      {view === 'month' && (
        <>
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
              const inStreak = (streaks[ds] || 0) >= 2;
              return (
                <div
                  key={ds}
                  className={`cal-cell${isToday ? ' today' : ''}${isSel ? ' selected' : ''}${hasWorkout || hasMeal ? ' has-data' : ''}${inStreak ? ' streak' : ''}`}
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

          <div className="cal-legend">
            <span><span className="cal-dot workout" /> Workout</span>
            <span><span className="cal-dot meal" /> Meal</span>
            <span><span className="cal-dot weight" /> Weight</span>
            <span><span className="cal-dot streak-dot" /> Streak</span>
          </div>
        </>
      )}

      {/* Week view */}
      {view === 'week' && (
        <div className="cal-week">
          {weekDays.map(date => {
            const ds = toDateStr(date);
            const dw = workoutsByDate[ds] || [];
            const dm = mealsByDate[ds] || [];
            const dwt = weightsByDate[ds] || [];
            const isToday = ds === today;
            const isSel = ds === selected;
            const inStreak = (streaks[ds] || 0) >= 2;
            const macros = getDayMacros(ds);
            const vol = dw.reduce((s, w) => s + ((w.sets || 0) * (w.reps || 0) * (w.weight || 0)), 0);
            return (
              <div
                key={ds}
                className={`cal-week-day${isToday ? ' today' : ''}${isSel ? ' selected' : ''}${inStreak ? ' streak' : ''}`}
                onClick={() => setSelected(ds)}
              >
                <div className="cal-week-day-header">
                  <span className="cal-week-day-name">{DAYS[(date.getDay() + 6) % 7]}</span>
                  <span className={`cal-week-day-num${isToday ? ' today' : ''}`}>{date.getDate()}</span>
                </div>
                <div className="cal-week-day-body">
                  {dw.length > 0 && (
                    <div className="cal-week-tag workout">{dw.length} exercise{dw.length > 1 ? 's' : ''} &middot; {Math.round(vol).toLocaleString()}kg</div>
                  )}
                  {dm.length > 0 && (
                    <div className="cal-week-tag meal">{macros.cal} kcal &middot; {macros.prot}g prot</div>
                  )}
                  {dwt.length > 0 && (
                    <div className="cal-week-tag weight">{dwt[0].weight} kg</div>
                  )}
                  {dw.length === 0 && dm.length === 0 && dwt.length === 0 && (
                    <div className="cal-week-empty">{t('restDay')}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected day detail */}
      <div className="cal-detail">
        <h3>{formatDate(selected)}</h3>

        {selectedWorkouts.length === 0 && selectedMeals.length === 0 && (
          <div className="cal-empty">{t('noActivity')}</div>
        )}

        {/* Workouts */}
        {selectedWorkouts.length > 0 && (
          <div className="cal-detail-section">
            <h4>Workouts</h4>
            <div className="cal-summary-row">
              <span className="cal-summary-stat">{selectedWorkouts.length} exercise{selectedWorkouts.length > 1 ? 's' : ''}</span>
              <span className="cal-summary-stat">{Math.round(totalVolume).toLocaleString()} kg volume</span>
            </div>
            <MuscleMap workouts={selectedMuscleMapData} />
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

      </div>
    </div>
  );
}
