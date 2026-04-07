import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MEAL_COLORS = { Breakfast: '#3b82f6', Lunch: '#22c55e', Dinner: '#f97316', Snack: '#a855f7' };

function MealRing({ label, value, target, color }) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const circumference = 2 * Math.PI * 23;
  const offset = circumference - pct * circumference;

  return (
    <div className="meal-ring">
      <div className="meal-ring-label" style={{ color }}>{label}</div>
      <svg viewBox="0 0 56 56" width="56" height="56" style={{ display: 'block', margin: '0 auto 4px', transform: 'rotate(-90deg)' }}>
        <circle cx="28" cy="28" r="23" fill="none" stroke="#1e293b" strokeWidth="6"/>
        <circle cx="28" cy="28" r="23" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"/>
        <text x="28" y="28" textAnchor="middle" dominantBaseline="central"
          fontSize="12" fontWeight="700" fill={color}
          style={{ transform: 'rotate(90deg)', transformOrigin: '28px 28px' }}>{value}</text>
      </svg>
      <div className="meal-ring-sub">target {target}</div>
    </div>
  );
}

export default function Meals() {
  const { token } = useAuth();
  const [meals, setMeals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'Lunch', date: new Date().toISOString().split('T')[0] });
  const [goal, setGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({ currentWeight: '', targetWeight: '', weeks: '16' });
  const [activeTab, setActiveTab] = useState('Breakfast');

  const load = () => fetch('http://localhost:3001/api/meals', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setMeals);
  const loadGoal = () => fetch('http://localhost:3001/api/goals', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(g => { if (g) setGoal(g); });

  useEffect(() => { load(); loadGoal(); }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3001/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: form.meal_type, date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    load();
  };

  const saveGoal = async (e) => {
    e.preventDefault();
    const cw = Number(goalForm.currentWeight);
    const tw = Number(goalForm.targetWeight);
    const wk = Number(goalForm.weeks);
    const isBulk = tw > cw;
    const surplus = isBulk ? 300 : -500;
    const dailyCalories = Math.round(cw * 15 + surplus);
    const dailyProtein = Math.round(cw * 0.8);
    await fetch('http://localhost:3001/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentWeight: cw, targetWeight: tw, weeks: wk, dailyCalories, dailyProtein }),
    });
    setGoal({ currentWeight: cw, targetWeight: tw, weeks: wk, dailyCalories, dailyProtein });
  };

  const remove = async (id) => {
    await fetch(`http://localhost:3001/api/meals/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const today = new Date().toISOString().split('T')[0];
  const todayMeals = meals.filter(m => m.date === today);

  const dailyCal = goal?.dailyCalories || 2500;
  const dailyProt = goal?.dailyProtein || 180;

  // Calories per meal type
  const mealCalByType = {};
  const mealProtByType = {};
  MEAL_TYPES.forEach(t => {
    const ms = todayMeals.filter(m => m.meal_type === t);
    mealCalByType[t] = ms.reduce((s, m) => s + (m.calories || 0), 0);
    mealProtByType[t] = ms.reduce((s, m) => s + (m.protein || 0), 0);
  });

  const calTargets = { Breakfast: Math.round(dailyCal * 0.25), Lunch: Math.round(dailyCal * 0.35), Dinner: Math.round(dailyCal * 0.30), Snack: Math.round(dailyCal * 0.10) };

  const todayCalories = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const todayProtein = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);

  const weeklyChange = goal ? ((goal.targetWeight - goal.currentWeight) / goal.weeks).toFixed(2) : 0;
  const goalType = goal && goal.targetWeight > goal.currentWeight ? 'Bulk' : 'Cut';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Nutrition</h1>
          <p>Track your meals and hit your macro targets</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Log Meal'}
        </button>
      </div>

      {/* Goal Calculator */}
      <div className="form-card goal-card">
        <h3>Goal Calculator</h3>
        {goal ? (
          <div className="goal-summary">
            <span style={{ color: '#f8fafc' }}>{goalType}</span> · <span style={{ color: '#22c55e' }}>{goal.dailyCalories} kcal/day · {goal.dailyProtein}g protein/day</span> · ~{Math.abs(weeklyChange)} lbs/week
          </div>
        ) : null}
        <form onSubmit={saveGoal} className="goal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Current lbs</label>
              <input type="number" placeholder="165" value={goalForm.currentWeight} onChange={e => setGoalForm({ ...goalForm, currentWeight: e.target.value })} required step="0.1" />
            </div>
            <div className="form-group">
              <label>Target lbs</label>
              <input type="number" placeholder="180" value={goalForm.targetWeight} onChange={e => setGoalForm({ ...goalForm, targetWeight: e.target.value })} required step="0.1" />
            </div>
            <div className="form-group">
              <label>Weeks</label>
              <input type="number" placeholder="16" value={goalForm.weeks} onChange={e => setGoalForm({ ...goalForm, weeks: e.target.value })} required min="1" />
            </div>
          </div>
          <button type="submit" className="btn-secondary" style={{ marginTop: '0.5rem' }}>Calculate & Save</button>
        </form>
      </div>

      {/* Meal Rings */}
      <div className="form-card">
        <h3>Meal Rings — Today</h3>
        <div className="meal-rings-row">
          {MEAL_TYPES.map(t => (
            <MealRing key={t} label={t} value={mealCalByType[t]} target={calTargets[t]} color={MEAL_COLORS[t]} />
          ))}
        </div>
      </div>

      {/* Log Food */}
      {showForm && (
        <div className="form-card">
          <h3>Log Food</h3>
          <div className="meal-tabs">
            {MEAL_TYPES.map(t => (
              <button key={t} className={`meal-tab ${form.meal_type === t ? 'active' : ''}`}
                style={form.meal_type === t ? { borderColor: MEAL_COLORS[t], color: MEAL_COLORS[t], background: `${MEAL_COLORS[t]}10` } : {}}
                onClick={() => setForm({ ...form, meal_type: t })}>
                {t}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 3 }}>
                <label>Food Name</label>
                <input type="text" placeholder="e.g. Grilled Chicken 200g" value={form.name} onChange={update('name')} required />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={form.date} onChange={update('date')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Calories</label>
                <input type="number" placeholder="500" value={form.calories} onChange={update('calories')} min="0" />
              </div>
              <div className="form-group">
                <label>Protein (g)</label>
                <input type="number" placeholder="30" value={form.protein} onChange={update('protein')} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label>Carbs (g)</label>
                <input type="number" placeholder="50" value={form.carbs} onChange={update('carbs')} min="0" step="0.1" />
              </div>
              <div className="form-group">
                <label>Fat (g)</label>
                <input type="number" placeholder="15" value={form.fat} onChange={update('fat')} min="0" step="0.1" />
              </div>
            </div>
            <button type="submit" className="btn-primary">Add Food</button>
          </form>
        </div>
      )}

      {/* Today's Food Log */}
      {todayMeals.length > 0 && (
        <div className="form-card">
          <h3>Today's Food Log</h3>
          <div className="food-log">
            {todayMeals.map(m => (
              <div key={m.id} className="food-entry">
                <div className="food-entry-left">
                  <span className="food-dot" style={{ background: MEAL_COLORS[m.meal_type] || '#64748b' }} />
                  <div>
                    <span className="food-name">{m.name}</span>
                    <div className="food-macros">
                      {m.protein ? `${m.protein}g prot` : ''}{m.carbs ? ` · ${m.carbs}g carbs` : ''}{m.fat ? ` · ${m.fat}g fat` : ''}
                    </div>
                  </div>
                </div>
                <div className="food-entry-right">
                  <span className="food-cal">{m.calories || 0} kcal</span>
                  <button className="btn-delete" onClick={() => remove(m.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
          <div className="food-total">
            Total: <strong>{todayCalories} kcal</strong> · {todayProtein.toFixed(0)}g protein
          </div>
        </div>
      )}

      {/* Full history */}
      {meals.length > 0 && (
        <>
          <h2 style={{ margin: '2rem 0 1rem', fontSize: '1.1rem', color: '#f1f5f9' }}>All Meals</h2>
          <div className="data-table">
            <table>
              <thead>
                <tr><th>Date</th><th>Meal</th><th>Type</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fat</th><th></th></tr>
              </thead>
              <tbody>
                {meals.map(m => (
                  <tr key={m.id}>
                    <td>{m.date}</td>
                    <td><strong>{m.name}</strong></td>
                    <td><span className={`badge badge-${(m.meal_type || '').toLowerCase()}`}>{m.meal_type || '-'}</span></td>
                    <td>{m.calories || '-'}</td>
                    <td>{m.protein ? `${m.protein}g` : '-'}</td>
                    <td>{m.carbs ? `${m.carbs}g` : '-'}</td>
                    <td>{m.fat ? `${m.fat}g` : '-'}</td>
                    <td><button className="btn-delete" onClick={() => remove(m.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {meals.length === 0 && !showForm && (
        <div className="empty-state-large">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>
          <h3>No meals logged</h3>
          <p>Click "+ Log Meal" to start tracking your nutrition.</p>
        </div>
      )}
    </div>
  );
}
