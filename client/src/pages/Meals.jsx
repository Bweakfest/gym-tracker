import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MEAL_COLORS = { Breakfast: '#3b82f6', Lunch: '#22c55e', Dinner: '#f97316', Snack: '#a855f7' };

// Harris-Benedict BMR (no body fat needed)
function calcBMR(gender, weight, height, age) {
  if (gender === 'female') return 655.1 + (9.6 * weight) + (1.8 * height) - (4.7 * age);
  return 66.47 + (13.7 * weight) + (5 * height) - (6.8 * age);
}

function calcMacros(gender, weight, height, age, sport, activity, goalType) {
  const bmr = calcBMR(gender, weight, height, age);
  const tdee = Math.round(bmr * (Number(sport) + Number(activity)));

  let calories;
  if (goalType === 'lose') calories = tdee - 400;
  else if (goalType === 'gain') calories = tdee + 400;
  else calories = tdee;

  let protein, fat;
  if (goalType === 'lose') {
    protein = Math.round(2.2 * weight);
    fat = Math.round(gender === 'female' ? 0.9 * weight : 0.7 * weight);
  } else if (goalType === 'gain') {
    protein = Math.round(1.8 * weight);
    fat = Math.round(1.2 * weight);
  } else {
    protein = Math.round(2.0 * weight);
    fat = Math.round(1.0 * weight);
  }

  const carbs = Math.round((calories - (protein * 4.1) - (fat * 9.3)) / 4.1);
  return { calories, protein, carbs, fat, tdee };
}

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

function CalorieCalculator({ goal, onSave }) {
  const [showResults, setShowResults] = useState(!!goal);
  const [form, setForm] = useState({
    gender: goal?.gender || 'male',
    age: goal?.age || '',
    weight: goal?.currentWeight || '',
    height: goal?.height || '',
    sport: goal?.sport ?? '0.15',
    activity: goal?.activity ?? '1.5',
    goalType: goal?.goalType || 'gain',
  });
  const [result, setResult] = useState(goal ? {
    calories: goal.dailyCalories,
    protein: goal.dailyProtein,
    carbs: goal.dailyCarbs || 0,
    fat: goal.dailyFat || 0,
  } : null);

  useEffect(() => {
    if (goal && !result) {
      setForm({
        gender: goal.gender || 'male',
        age: goal.age || '',
        weight: goal.currentWeight || '',
        height: goal.height || '',
        sport: goal.sport ?? '0.15',
        activity: goal.activity ?? '1.5',
        goalType: goal.goalType || 'gain',
      });
      setResult({ calories: goal.dailyCalories, protein: goal.dailyProtein, carbs: goal.dailyCarbs || 0, fat: goal.dailyFat || 0 });
      setShowResults(true);
    }
  }, [goal]);

  const handleCalc = (e) => {
    e.preventDefault();
    const r = calcMacros(form.gender, Number(form.weight), Number(form.height), Number(form.age), form.sport, form.activity, form.goalType);
    if (r.calories <= 0 || r.protein <= 0 || r.carbs < 0) return;
    setResult(r);
    setShowResults(true);
    onSave({
      currentWeight: Number(form.weight),
      targetWeight: form.goalType === 'gain' ? Number(form.weight) + 5 : form.goalType === 'lose' ? Number(form.weight) - 5 : Number(form.weight),
      weeks: 16,
      dailyCalories: r.calories,
      dailyProtein: r.protein,
      dailyCarbs: r.carbs,
      dailyFat: r.fat,
      gender: form.gender,
      age: Number(form.age),
      height: Number(form.height),
      sport: Number(form.sport),
      activity: Number(form.activity),
      goalType: form.goalType,
    });
  };

  const u = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  if (showResults && result) {
    const goalLabel = form.goalType === 'lose' ? 'Weight Loss' : form.goalType === 'gain' ? 'Muscle Building' : 'Maintenance';
    return (
      <div className="calc-results">
        <div className="calc-results-header">
          <h3>Your Daily Targets</h3>
          <span className="calc-goal-badge">{goalLabel}</span>
        </div>
        <div className="calc-kcal-box">
          <span className="calc-kcal-number">{result.calories.toLocaleString()}</span>
          <span className="calc-kcal-label">kcal per day</span>
        </div>
        <div className="calc-macros-row">
          <div className="calc-macro">
            <span className="calc-macro-value">{result.protein}g</span>
            <span className="calc-macro-label">Protein</span>
          </div>
          <div className="calc-macro-divider" />
          <div className="calc-macro">
            <span className="calc-macro-value">{result.carbs}g</span>
            <span className="calc-macro-label">Carbs</span>
          </div>
          <div className="calc-macro-divider" />
          <div className="calc-macro">
            <span className="calc-macro-value">{result.fat}g</span>
            <span className="calc-macro-label">Fat</span>
          </div>
        </div>
        <button className="btn-secondary calc-edit-btn" onClick={() => setShowResults(false)}>
          Edit your data
        </button>
      </div>
    );
  }

  return (
    <div className="calc-form">
      <h3>Calorie Calculator</h3>
      <p className="calc-subtitle">Calculate your personal daily calorie and macro targets</p>
      <form onSubmit={handleCalc}>
        <div className="calc-toggle-row">
          <label className="calc-toggle-label">Gender</label>
          <div className="calc-pills">
            <button type="button" className={`calc-pill ${form.gender === 'male' ? 'active' : ''}`} onClick={() => setForm({ ...form, gender: 'male' })}>Male</button>
            <button type="button" className={`calc-pill ${form.gender === 'female' ? 'active' : ''}`} onClick={() => setForm({ ...form, gender: 'female' })}>Female</button>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Age</label>
            <input type="number" placeholder="25" value={form.age} onChange={u('age')} required min="14" max="99" />
          </div>
          <div className="form-group">
            <label>Weight (kg)</label>
            <input type="number" placeholder="75" value={form.weight} onChange={u('weight')} required min="30" max="300" step="0.1" />
          </div>
          <div className="form-group">
            <label>Height (cm)</label>
            <input type="number" placeholder="178" value={form.height} onChange={u('height')} required min="100" max="250" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Sport per week</label>
            <select value={form.sport} onChange={u('sport')}>
              <option value="0">No sport</option>
              <option value="0.1">1-2x per week</option>
              <option value="0.15">3x per week</option>
              <option value="0.2">4x per week</option>
              <option value="0.25">5x per week</option>
              <option value="0.3">6x per week</option>
              <option value="0.35">7x or more</option>
            </select>
          </div>
          <div className="form-group">
            <label>Daily activity</label>
            <select value={form.activity} onChange={u('activity')}>
              <option value="1.2">Sedentary (desk job)</option>
              <option value="1.5">Somewhat active</option>
              <option value="1.7">Active (on feet a lot)</option>
              <option value="2.0">Very active (physical labour)</option>
            </select>
          </div>
        </div>

        <div className="calc-toggle-row">
          <label className="calc-toggle-label">Goal</label>
          <div className="calc-pills">
            <button type="button" className={`calc-pill ${form.goalType === 'lose' ? 'active' : ''}`} onClick={() => setForm({ ...form, goalType: 'lose' })}>Lose Weight</button>
            <button type="button" className={`calc-pill ${form.goalType === 'hold' ? 'active' : ''}`} onClick={() => setForm({ ...form, goalType: 'hold' })}>Maintain</button>
            <button type="button" className={`calc-pill ${form.goalType === 'gain' ? 'active' : ''}`} onClick={() => setForm({ ...form, goalType: 'gain' })}>Build Muscle</button>
          </div>
        </div>

        <button type="submit" className="btn-primary calc-submit">Calculate Now</button>
      </form>
    </div>
  );
}

function FoodSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const search = (q) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,brands,nutriments,serving_size,image_small_url&tagtype_0=countries&tag_contains_0=contains&tag_0=switzerland`)
        .then(r => r.json())
        .then(data => {
          const items = (data.products || [])
            .filter(p => p.product_name && p.nutriments)
            .map(p => ({
              name: p.product_name,
              brand: p.brands || '',
              calories: Math.round(p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal'] || 0),
              protein: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
              carbs: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
              fat: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
              serving: p.serving_size || '100g',
              image: p.image_small_url,
            }));
          setResults(items);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 400);
  };

  return (
    <div className="food-search">
      <input type="text" placeholder="Search Swiss products (Migros, Coop, Lidl)..." value={query}
        onChange={e => { setQuery(e.target.value); search(e.target.value); }} className="food-search-input" />
      {loading && <div className="food-search-status">Searching...</div>}
      {results.length > 0 && (
        <div className="food-search-results">
          {results.map((item, i) => (
            <div key={i} className="food-search-item" onClick={() => { onSelect(item); setQuery(''); setResults([]); }}>
              {item.image && <img src={item.image} alt="" className="food-search-thumb" />}
              <div className="food-search-info">
                <div className="food-search-name">{item.name}</div>
                {item.brand && <div className="food-search-brand">{item.brand}</div>}
                <div className="food-search-macros">
                  {item.calories} kcal · {item.protein}g P · {item.carbs}g C · {item.fat}g F
                  <span className="food-search-serving"> per 100g</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BarcodeScanner({ onScan, onClose }) {
  const html5QrRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const scanner = new Html5Qrcode('barcode-reader');
    html5QrRef.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 150 } },
      (code) => {
        scanner.stop().then(() => {
          fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
            .then(r => r.json())
            .then(data => {
              if (data.status === 1 && data.product) {
                const p = data.product;
                const n = p.nutriments || {};
                onScan({
                  name: p.product_name || 'Unknown Product',
                  brand: p.brands || '',
                  calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
                  protein: Math.round((n.proteins_100g || 0) * 10) / 10,
                  carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
                  fat: Math.round((n.fat_100g || 0) * 10) / 10,
                });
              } else {
                setError('Product not found. Try searching by name.');
                setTimeout(onClose, 2000);
              }
            }).catch(() => { setError('Lookup failed.'); setTimeout(onClose, 2000); });
        });
      },
      () => {}
    ).catch(() => setError('Camera access denied.'));
    return () => { if (html5QrRef.current?.isScanning) html5QrRef.current.stop().catch(() => {}); };
  }, []);

  return (
    <div className="barcode-overlay">
      <div className="barcode-modal">
        <div className="barcode-header">
          <h3>Scan Barcode</h3>
          <button className="btn-delete" onClick={onClose}>Close</button>
        </div>
        {error ? <div className="barcode-error">{error}</div> : <div id="barcode-reader" style={{ width: '100%' }} />}
        <p className="barcode-hint">Point camera at a barcode on the food packaging</p>
      </div>
    </div>
  );
}

export default function Meals() {
  const { token } = useAuth();
  const [meals, setMeals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'Lunch' });
  const [goal, setGoal] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const load = () => fetch('/api/meals', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setMeals);
  const loadGoal = () => fetch('/api/goals', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(g => { if (g) setGoal(g); });
  useEffect(() => { load(); loadGoal(); }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, date: new Date().toISOString().split('T')[0] }),
    });
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: form.meal_type });
    setShowForm(false);
    load();
  };

  const saveGoal = async (data) => {
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    setGoal(data);
  };

  const remove = async (id) => {
    await fetch(`/api/meals/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const handleFoodSelect = (item) => {
    setForm({ ...form, name: item.brand ? `${item.name} (${item.brand})` : item.name, calories: String(item.calories), protein: String(item.protein), carbs: String(item.carbs), fat: String(item.fat) });
  };

  const handleBarcodeScan = (item) => { setShowScanner(false); setShowForm(true); handleFoodSelect(item); };
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const today = new Date().toISOString().split('T')[0];
  const todayMeals = meals.filter(m => m.date === today);
  const dailyCal = goal?.dailyCalories || 2500;
  const mealCalByType = {};
  MEAL_TYPES.forEach(t => { mealCalByType[t] = todayMeals.filter(m => m.meal_type === t).reduce((s, m) => s + (m.calories || 0), 0); });
  const calTargets = { Breakfast: Math.round(dailyCal * 0.25), Lunch: Math.round(dailyCal * 0.35), Dinner: Math.round(dailyCal * 0.30), Snack: Math.round(dailyCal * 0.10) };
  const todayCalories = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const todayProtein = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Nutrition</h1>
          <p>Track your meals and hit your macro targets</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={() => setShowScanner(true)}>Scan Barcode</button>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Log Meal'}</button>
        </div>
      </div>

      {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}

      {/* ESN-style Calculator */}
      <div className="form-card calc-card">
        <CalorieCalculator goal={goal} onSave={saveGoal} />
      </div>

      {/* Meal Rings */}
      <div className="form-card">
        <h3>Meal Rings — Today</h3>
        <div className="meal-rings-row">
          {MEAL_TYPES.map(t => <MealRing key={t} label={t} value={mealCalByType[t]} target={calTargets[t]} color={MEAL_COLORS[t]} />)}
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
                onClick={() => setForm({ ...form, meal_type: t })}>{t}</button>
            ))}
          </div>
          <FoodSearch onSelect={handleFoodSelect} />
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Food Name</label>
              <input type="text" placeholder="e.g. Migros Pouletbrust 200g" value={form.name} onChange={update('name')} required />
            </div>
            <div className="form-row">
              <div className="form-group"><label>Calories</label><input type="number" placeholder="0" value={form.calories} onChange={update('calories')} min="0" /></div>
              <div className="form-group"><label>Protein (g)</label><input type="number" placeholder="0" value={form.protein} onChange={update('protein')} min="0" step="0.1" /></div>
              <div className="form-group"><label>Carbs (g)</label><input type="number" placeholder="0" value={form.carbs} onChange={update('carbs')} min="0" step="0.1" /></div>
              <div className="form-group"><label>Fat (g)</label><input type="number" placeholder="0" value={form.fat} onChange={update('fat')} min="0" step="0.1" /></div>
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
                    <div className="food-macros">{m.protein ? `${m.protein}g prot` : ''}{m.carbs ? ` · ${m.carbs}g carbs` : ''}{m.fat ? ` · ${m.fat}g fat` : ''}</div>
                  </div>
                </div>
                <div className="food-entry-right">
                  <span className="food-cal">{m.calories || 0} kcal</span>
                  <button className="btn-delete" onClick={() => remove(m.id)}>x</button>
                </div>
              </div>
            ))}
          </div>
          <div className="food-total">Total: <strong>{todayCalories} kcal</strong> · {todayProtein.toFixed(0)}g protein</div>
        </div>
      )}

      {/* History */}
      {meals.length > 0 && (
        <>
          <h2 style={{ margin: '2rem 0 1rem', fontSize: '1.1rem', color: '#f1f5f9' }}>All Meals</h2>
          <div className="data-table">
            <table>
              <thead><tr><th>Date</th><th>Meal</th><th>Type</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fat</th><th></th></tr></thead>
              <tbody>
                {meals.map(m => (
                  <tr key={m.id}>
                    <td>{m.date}</td><td><strong>{m.name}</strong></td>
                    <td><span className={`badge badge-${(m.meal_type || '').toLowerCase()}`}>{m.meal_type || '-'}</span></td>
                    <td>{m.calories || '-'}</td><td>{m.protein ? `${m.protein}g` : '-'}</td>
                    <td>{m.carbs ? `${m.carbs}g` : '-'}</td><td>{m.fat ? `${m.fat}g` : '-'}</td>
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
