import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { fuzzySearch, normalize } from '../utils/fuzzySearch';
import { SWISS_FOODS, foodKeys } from '../utils/swissFoods';
import { calcMacros } from '../utils/nutrition';
import RecipeEditor from '../components/RecipeEditor';

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

// Unit system — 'metric' (kg / cm) or 'imperial' (lbs / ft+in). We persist
// only metric values in the goal object so the backend stays source-of-truth
// in one unit. Conversion happens at the form layer.
const LB_PER_KG = 2.20462262;
const CM_PER_IN = 2.54;
const kgToLb = kg => Math.round(kg * LB_PER_KG * 10) / 10;
const lbToKg = lb => lb / LB_PER_KG;
const cmToFtIn = cm => {
  const totalIn = cm / CM_PER_IN;
  return { ft: Math.floor(totalIn / 12), in: Math.round(totalIn % 12) };
};
const ftInToCm = (ft, inches) => ((Number(ft) || 0) * 12 + (Number(inches) || 0)) * CM_PER_IN;

function CalorieCalculator({ goal, onSave }) {
  const [showResults, setShowResults] = useState(!!goal);
  const [units, setUnits] = useState(() => localStorage.getItem('nexero_units') || 'metric');
  const [form, setForm] = useState({
    gender: goal?.gender || 'male', age: goal?.age || '', weight: goal?.currentWeight || '',
    height: goal?.height || '', sport: goal?.sport ?? '0.15', activity: goal?.activity ?? '1.5',
    goalType: goal?.goalType || 'gain',
  });
  // Separate imperial input state so kg/cm aren't mangled as the user types ft/in/lb
  const initialFtIn = goal?.height ? cmToFtIn(Number(goal.height)) : { ft: '', in: '' };
  const [imp, setImp] = useState({
    weightLb: goal?.currentWeight ? String(kgToLb(Number(goal.currentWeight))) : '',
    heightFt: initialFtIn.ft !== '' ? String(initialFtIn.ft) : '',
    heightIn: initialFtIn.in !== '' ? String(initialFtIn.in) : '',
  });
  const [result, setResult] = useState(goal ? { calories: goal.dailyCalories, protein: goal.dailyProtein, carbs: goal.dailyCarbs || 0, fat: goal.dailyFat || 0 } : null);
  const [error, setError] = useState('');

  // Sync imperial inputs whenever metric form values change (keeps both in sync)
  useEffect(() => {
    if (units === 'imperial') return; // user is editing imperial; don't clobber
    if (form.weight !== '' && !isNaN(Number(form.weight))) {
      setImp(prev => ({ ...prev, weightLb: String(kgToLb(Number(form.weight))) }));
    }
    if (form.height !== '' && !isNaN(Number(form.height))) {
      const { ft, in: inches } = cmToFtIn(Number(form.height));
      setImp(prev => ({ ...prev, heightFt: String(ft), heightIn: String(inches) }));
    }
  }, [form.weight, form.height, units]);

  const toggleUnits = (newUnits) => {
    if (newUnits === units) return;
    setUnits(newUnits);
    localStorage.setItem('nexero_units', newUnits);
  };

  useEffect(() => {
    if (goal && !result) {
      const nextForm = { gender: goal.gender || 'male', age: goal.age || '', weight: goal.currentWeight || '', height: goal.height || '', sport: goal.sport ?? '0.15', activity: goal.activity ?? '1.5', goalType: goal.goalType || 'gain' };
      setForm(nextForm);

      // Legacy heal: users who set their goal on an older build might have
      // a bogus stored number because the previous formula multiplied BMR
      // by (sport + activity) with no cap, producing 10,000+ kcal. If we
      // detect a value outside [1000, 5500] we treat it as stale and
      // recompute from the saved inputs (which are still valid). Upper
      // bound is deliberately slightly above CAL_MAX (5000) so legitimate
      // top-end results don't get re-healed on every page load.
      const stored = Number(goal.dailyCalories);
      const stale = !Number.isFinite(stored) || stored < 1000 || stored > 5500;
      if (stale) {
        const fixed = calcMacros(nextForm.gender, Number(nextForm.weight), Number(nextForm.height), Number(nextForm.age), nextForm.sport, nextForm.activity, nextForm.goalType);
        if (fixed.valid) {
          setResult(fixed);
          onSave({ currentWeight: Number(nextForm.weight), targetWeight: nextForm.goalType === 'gain' ? Number(nextForm.weight) + 5 : nextForm.goalType === 'lose' ? Number(nextForm.weight) - 5 : Number(nextForm.weight), weeks: 16, dailyCalories: fixed.calories, dailyProtein: fixed.protein, dailyCarbs: fixed.carbs, dailyFat: fixed.fat, gender: nextForm.gender, age: Number(nextForm.age), height: Number(nextForm.height), sport: Number(nextForm.sport), activity: Number(nextForm.activity), goalType: nextForm.goalType });
          setShowResults(true);
          return;
        }
        // Saved inputs aren't usable either — drop back to the form so the user can recalculate.
        setShowResults(false);
        return;
      }

      setResult({ calories: goal.dailyCalories, protein: goal.dailyProtein, carbs: goal.dailyCarbs || 0, fat: goal.dailyFat || 0 });
      setShowResults(true);
    }
  }, [goal]);

  const handleCalc = (e) => {
    e.preventDefault();
    setError('');
    const a = Number(form.age);
    // Resolve weight+height from whichever unit system is active. Storage is
    // always metric so the rest of the app stays in one unit.
    let w, h;
    if (units === 'imperial') {
      const lb = Number(imp.weightLb);
      const ft = Number(imp.heightFt);
      const inches = Number(imp.heightIn);
      if (!Number.isFinite(lb) || lb < 66 || lb > 550) return setError('Weight must be between 66 and 550 lbs.');
      if (!Number.isFinite(ft) || ft < 3 || ft > 8 || !Number.isFinite(inches) || inches < 0 || inches > 11) {
        return setError('Height must be between 3′11″ and 7′6″.');
      }
      w = lbToKg(lb);
      h = ftInToCm(ft, inches);
    } else {
      w = Number(form.weight);
      h = Number(form.height);
    }
    // Pre-validate against backend ranges with friendly messages.
    if (!Number.isFinite(a) || a < 14 || a > 90) return setError('Age must be between 14 and 90.');
    if (!Number.isFinite(w) || w < 30 || w > 250) return setError(units === 'imperial' ? 'Weight must be between 66 and 550 lbs.' : 'Weight must be between 30 and 250 kg.');
    if (!Number.isFinite(h) || h < 120 || h > 230) return setError(units === 'imperial' ? 'Height must be between 3′11″ and 7′6″.' : 'Height must be between 120 and 230 cm.');
    // Round kg/cm to one decimal and integer before storing to avoid float drift.
    w = Math.round(w * 10) / 10;
    h = Math.round(h);
    const r = calcMacros(form.gender, w, h, a, form.sport, form.activity, form.goalType);
    if (!r.valid) return setError('Please check your inputs and try again.');
    setResult(r); setShowResults(true);
    onSave({ currentWeight: w, targetWeight: form.goalType === 'gain' ? w + 5 : form.goalType === 'lose' ? w - 5 : w, weeks: 16, dailyCalories: r.calories, dailyProtein: r.protein, dailyCarbs: r.carbs, dailyFat: r.fat, gender: form.gender, age: a, height: h, sport: Number(form.sport), activity: Number(form.activity), goalType: form.goalType });
  };

  const u = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  if (showResults && result) {
    const goalLabel = form.goalType === 'lose' ? 'Weight Loss' : form.goalType === 'gain' ? 'Muscle Building' : 'Maintenance';
    return (
      <div className="calc-results">
        <div className="calc-results-header"><h3>Your Daily Targets</h3><span className="calc-goal-badge">{goalLabel}</span></div>
        <div className="calc-kcal-box"><span className="calc-kcal-number">{result.calories.toLocaleString()}</span><span className="calc-kcal-label">kcal per day</span></div>
        <div className="calc-macros-row">
          <div className="calc-macro"><span className="calc-macro-value">{result.protein}g</span><span className="calc-macro-label">Protein</span></div>
          <div className="calc-macro-divider" />
          <div className="calc-macro"><span className="calc-macro-value">{result.carbs}g</span><span className="calc-macro-label">Carbs</span></div>
          <div className="calc-macro-divider" />
          <div className="calc-macro"><span className="calc-macro-value">{result.fat}g</span><span className="calc-macro-label">Fat</span></div>
        </div>
        <button className="btn-secondary calc-edit-btn" onClick={() => setShowResults(false)}>Edit your data</button>
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
        <div className="calc-toggle-row">
          <label className="calc-toggle-label">Units</label>
          <div className="calc-pills">
            <button type="button" className={`calc-pill ${units === 'metric' ? 'active' : ''}`} onClick={() => toggleUnits('metric')}>Metric (kg / cm)</button>
            <button type="button" className={`calc-pill ${units === 'imperial' ? 'active' : ''}`} onClick={() => toggleUnits('imperial')}>Imperial (lbs / ft-in)</button>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Age</label><input type="number" placeholder="25" value={form.age} onChange={u('age')} required min="14" max="90" /></div>
          {units === 'metric' ? (
            <>
              <div className="form-group"><label>Weight (kg)</label><input type="number" placeholder="75" value={form.weight} onChange={u('weight')} required min="30" max="250" step="0.1" /></div>
              <div className="form-group"><label>Height (cm)</label><input type="number" placeholder="178" value={form.height} onChange={u('height')} required min="120" max="230" /></div>
            </>
          ) : (
            <>
              <div className="form-group"><label>Weight (lbs)</label><input type="number" placeholder="165" value={imp.weightLb} onChange={e => setImp({ ...imp, weightLb: e.target.value })} required min="66" max="550" step="0.1" /></div>
              <div className="form-group" style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1 }}><label>Height (ft)</label><input type="number" placeholder="5" value={imp.heightFt} onChange={e => setImp({ ...imp, heightFt: e.target.value })} required min="3" max="8" /></div>
                <div style={{ flex: 1 }}><label>in</label><input type="number" placeholder="10" value={imp.heightIn} onChange={e => setImp({ ...imp, heightIn: e.target.value })} required min="0" max="11" /></div>
              </div>
            </>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Sport per week</label>
            <select value={form.sport} onChange={u('sport')}>
              <option value="0">No sport</option><option value="0.1">1-2x per week</option>
              <option value="0.15">3x per week</option><option value="0.2">4x per week</option>
              <option value="0.25">5x per week</option><option value="0.3">6x per week</option>
              <option value="0.35">7x or more</option>
            </select>
          </div>
          <div className="form-group">
            <label>Daily activity</label>
            <select value={form.activity} onChange={u('activity')}>
              <option value="1.2">Sedentary (desk job)</option><option value="1.5">Somewhat active</option>
              <option value="1.7">Active (on feet a lot)</option><option value="2.0">Very active (physical labour)</option>
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
        {error && (
          <div role="alert" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', padding: '8px 12px', borderRadius: 8, margin: '8px 0', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn-primary calc-submit">Calculate Now</button>
      </form>
    </div>
  );
}

/* ─── Food Search with serving-size adjustment ─── */
function FoodSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [servingItem, setServingItem] = useState(null);   // item being adjusted
  const [servingGrams, setServingGrams] = useState(100);
  const debounceRef = useRef(null);

  const search = (q) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    clearTimeout(debounceRef.current);

    // Instant local fuzzy match — shows results even when offline / typo'd
    const localMatches = fuzzySearch(SWISS_FOODS, q, foodKeys, 0.5).slice(0, 8).map(f => ({
      name: f.name,
      brand: f.brand || '',
      cal100: f.cal100,
      prot100: f.prot100,
      carb100: f.carb100,
      fat100: f.fat100,
      serving: f.serving || '100g',
      image: null,
      source: 'local',
    }));
    if (localMatches.length > 0) setResults(localMatches);

    debounceRef.current = setTimeout(async () => {
      // Query Open Food Facts — try Switzerland first, fall back to global
      const fetchOff = async (url) => {
        try {
          const r = await fetch(url);
          if (!r.ok) return [];
          const data = await r.json();
          return (data.products || [])
            .filter(p => p.product_name && p.nutriments)
            .map(p => ({
              name: p.product_name,
              brand: p.brands || '',
              cal100: Math.round(p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal'] || 0),
              prot100: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
              carb100: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
              fat100: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
              serving: p.serving_size || '100g',
              image: p.image_small_url,
              source: 'off',
            }));
        } catch { return []; }
      };

      const encQ = encodeURIComponent(q);
      // Start with Switzerland-specific
      const swissUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encQ}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,nutriments,serving_size,image_small_url&tagtype_0=countries&tag_contains_0=contains&tag_0=switzerland`;
      let apiItems = await fetchOff(swissUrl);

      // Fallback: if no Swiss results, expand to global products
      if (apiItems.length === 0) {
        const globalUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encQ}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,nutriments,serving_size,image_small_url`;
        apiItems = await fetchOff(globalUrl);
      }

      // If still nothing AND the query is probably a typo, try fuzzy-expanding:
      // query the API with each normalized local match name (improves recall)
      if (apiItems.length === 0 && localMatches.length > 0) {
        const best = localMatches[0];
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(best.name)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,brands,nutriments,serving_size,image_small_url`;
        apiItems = await fetchOff(url);
      }

      // Rank API items by fuzzy relevance to the original query (so typo'd
      // queries still sort the most-relevant products to the top).
      const ranked = apiItems.length > 0
        ? fuzzySearch(
            apiItems,
            q,
            (it) => [it.name, it.brand, `${it.name} ${it.brand}`],
            0.35
          )
        : [];
      const finalApi = (ranked.length > 0 ? ranked : apiItems).slice(0, 10);

      // Merge local + api, deduping by normalized name
      const seen = new Set();
      const merged = [];
      for (const it of [...localMatches, ...finalApi]) {
        const key = normalize(`${it.name}|${it.brand}`);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(it);
      }
      setResults(merged.slice(0, 14));
      setLoading(false);
    }, 350);
  };

  const openServing = (item) => {
    // Try to parse a default serving size from the product data
    const match = item.serving.match(/(\d+)\s*g/i);
    setServingGrams(match ? Number(match[1]) : 100);
    setServingItem(item);
  };

  const confirmServing = () => {
    if (!servingItem) return;
    const factor = servingGrams / 100;
    onSelect({
      name: servingItem.brand ? `${servingItem.name} (${servingItem.brand})` : servingItem.name,
      calories: Math.round(servingItem.cal100 * factor),
      protein: Math.round(servingItem.prot100 * factor * 10) / 10,
      carbs: Math.round(servingItem.carb100 * factor * 10) / 10,
      fat: Math.round(servingItem.fat100 * factor * 10) / 10,
      cal100: servingItem.cal100, prot100: servingItem.prot100,
      carb100: servingItem.carb100, fat100: servingItem.fat100,
    });
    setServingItem(null);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="food-search">
      <input type="text" placeholder="Search Swiss products (Migros, Coop, Lidl)..." value={query}
        onChange={e => { setQuery(e.target.value); search(e.target.value); }} className="food-search-input" />
      {loading && <div className="food-search-status">Searching...</div>}
      {results.length > 0 && !servingItem && (
        <div className="food-search-results">
          {results.map((item, i) => (
            <div key={i} className="food-search-item" onClick={() => openServing(item)}>
              {item.image && <img src={item.image} alt="" className="food-search-thumb" />}
              <div className="food-search-info">
                <div className="food-search-name">{item.name}</div>
                {item.brand && <div className="food-search-brand">{item.brand}</div>}
                <div className="food-search-macros">
                  {item.cal100} kcal · {item.prot100}g P · {item.carb100}g C · {item.fat100}g F
                  <span className="food-search-serving"> per 100g</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Serving size adjustment panel */}
      {servingItem && (
        <div className="serving-panel">
          <div className="serving-header">
            <strong>{servingItem.name}</strong>
            {servingItem.brand && <span className="food-search-brand">{servingItem.brand}</span>}
          </div>
          <div className="serving-control">
            <label>Serving size</label>
            <div className="serving-input-row">
              <input type="range" min="10" max="500" step="5" value={servingGrams}
                onChange={e => setServingGrams(Number(e.target.value))} className="serving-slider" />
              <div className="serving-grams-wrap">
                <input type="number" min="1" max="2000" value={servingGrams}
                  onChange={e => setServingGrams(Number(e.target.value) || 100)} className="serving-grams" />
                <span>g</span>
              </div>
            </div>
          </div>
          <div className="serving-preview">
            <span>{Math.round(servingItem.cal100 * servingGrams / 100)} kcal</span>
            <span>{Math.round(servingItem.prot100 * servingGrams / 100 * 10) / 10}g P</span>
            <span>{Math.round(servingItem.carb100 * servingGrams / 100 * 10) / 10}g C</span>
            <span>{Math.round(servingItem.fat100 * servingGrams / 100 * 10) / 10}g F</span>
          </div>
          <div className="serving-actions">
            <button className="btn-primary btn-sm" onClick={confirmServing}>Add to Form</button>
            <button className="btn-secondary btn-sm" onClick={() => setServingItem(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BarcodeScanner({ onScan, onClose }) {
  const html5QrRef = useRef(null);
  const [error, setError] = useState('');
  const [looking, setLooking] = useState(false);
  const [product, setProduct] = useState(null); // {name, brand, cal100, prot100, carb100, fat100, image, defaultGrams}
  const [grams, setGrams] = useState(100);

  useEffect(() => {
    const formats = [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.QR_CODE,
    ];
    const scanner = new Html5Qrcode('barcode-reader', { formatsToSupport: formats, verbose: false });
    html5QrRef.current = scanner;
    // qrbox as a function so it scales with the viewfinder — a bigger scan
    // window dramatically improves 1D barcode pickup on real packaging.
    const qrboxFn = (vw, vh) => {
      const w = Math.max(200, Math.floor(vw * 0.85));
      const h = Math.max(100, Math.floor(vh * 0.45));
      return { width: w, height: h };
    };
    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: qrboxFn,
        aspectRatio: 1.777,
        disableFlip: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        formatsToSupport: formats,
      },
      (code) => {
        scanner.stop().then(() => {
          setLooking(true);
          fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
            .then(r => r.json())
            .then(data => {
              setLooking(false);
              if (data.status === 1 && data.product) {
                const p = data.product; const n = p.nutriments || {};
                const servingMatch = String(p.serving_size || '').match(/(\d+(?:\.\d+)?)\s*g/i);
                const defaultGrams = servingMatch ? Math.round(Number(servingMatch[1])) : 100;
                setProduct({
                  name: p.product_name || 'Unknown Product',
                  brand: p.brands || '',
                  cal100: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
                  prot100: Math.round((n.proteins_100g || 0) * 10) / 10,
                  carb100: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
                  fat100: Math.round((n.fat_100g || 0) * 10) / 10,
                  image: p.image_small_url || null,
                });
                setGrams(defaultGrams);
              } else { setError('Product not found. Try searching by name.'); setTimeout(onClose, 2000); }
            }).catch(() => { setLooking(false); setError('Lookup failed.'); setTimeout(onClose, 2000); });
        });
      },
      () => {}
    ).catch(() => setError('Camera access denied.'));
    return () => { if (html5QrRef.current?.isScanning) html5QrRef.current.stop().catch(() => {}); };
  }, []);

  const confirm = () => {
    if (!product) return;
    const g = Number(grams) || 100;
    const factor = g / 100;
    onScan({
      name: product.brand ? `${product.name} (${product.brand})` : product.name,
      calories: Math.round(product.cal100 * factor),
      protein: Math.round(product.prot100 * factor * 10) / 10,
      carbs: Math.round(product.carb100 * factor * 10) / 10,
      fat: Math.round(product.fat100 * factor * 10) / 10,
    });
  };

  return (
    <div className="barcode-overlay">
      <div className="barcode-modal">
        <div className="barcode-header">
          <h3>{product ? 'Adjust Serving' : 'Scan Barcode'}</h3>
          <button className="btn-delete" onClick={onClose}>Close</button>
        </div>

        {error && <div className="barcode-error">{error}</div>}

        {!error && !product && (
          <>
            <div id="barcode-reader" style={{ width: '100%' }} />
            <p className="barcode-hint">
              {looking ? 'Looking up product...' : 'Point camera at a barcode on the food packaging'}
            </p>
          </>
        )}

        {!error && product && (
          <div className="serving-panel" style={{ marginTop: 0 }}>
            <div className="serving-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {product.image && <img src={product.image} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />}
              <div>
                <strong>{product.name}</strong>
                {product.brand && <div className="food-search-brand">{product.brand}</div>}
                <div className="food-search-macros" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                  {product.cal100} kcal per 100g
                </div>
              </div>
            </div>
            <div className="serving-control">
              <label>Amount (grams)</label>
              <div className="serving-input-row">
                <input type="range" min="10" max="500" step="5" value={grams}
                  onChange={e => setGrams(Number(e.target.value))} className="serving-slider" />
                <div className="serving-grams-wrap">
                  <input type="number" min="1" max="2000" value={grams}
                    onChange={e => setGrams(Number(e.target.value) || 100)} className="serving-grams" autoFocus />
                  <span>g</span>
                </div>
              </div>
            </div>
            <div className="serving-preview">
              <span>{Math.round(product.cal100 * grams / 100)} kcal</span>
              <span>{Math.round(product.prot100 * grams / 100 * 10) / 10}g P</span>
              <span>{Math.round(product.carb100 * grams / 100 * 10) / 10}g C</span>
              <span>{Math.round(product.fat100 * grams / 100 * 10) / 10}g F</span>
            </div>
            <div className="serving-actions">
              <button className="btn-primary btn-sm" onClick={confirm}>Add to Log</button>
              <button className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Favourites / Recent helpers (localStorage) ─── */
const FAVS_KEY = 'meal-favourites';
// Normalize food name for comparison: lowercase + collapse whitespace.
// "chicken breast" and "Chicken Breast " should dedupe to one entry.
function normalizeName(n) {
  return String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function loadFavourites() {
  try { return JSON.parse(localStorage.getItem(FAVS_KEY)) || []; } catch { return []; }
}
function saveFavourite(food) {
  const favs = loadFavourites();
  const key = normalizeName(food.name);
  const existing = favs.find(f => normalizeName(f.name) === key);
  if (existing) { existing.count = (existing.count || 1) + 1; existing.ts = Date.now(); }
  else { favs.push({ ...food, name: String(food.name || '').trim(), count: 1, ts: Date.now(), starred: false }); }
  favs.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || b.count - a.count || b.ts - a.ts);
  localStorage.setItem(FAVS_KEY, JSON.stringify(favs.slice(0, 50)));
}
function toggleFavouriteStored(foodName, meal) {
  const favs = loadFavourites();
  const key = normalizeName(foodName);
  const existing = favs.find(f => normalizeName(f.name) === key);
  if (existing) {
    existing.starred = !existing.starred;
  } else if (meal) {
    favs.push({ name: String(meal.name || '').trim(), calories: meal.calories || 0, protein: meal.protein || 0, carbs: meal.carbs || 0, fat: meal.fat || 0, meal_type: meal.meal_type || 'Lunch', count: 1, ts: Date.now(), starred: true });
  }
  localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
  return loadFavourites();
}
function isFavouriteStored(foodName) {
  const key = normalizeName(foodName);
  return loadFavourites().some(f => normalizeName(f.name) === key && f.starred);
}

export default function Meals() {
  const { token } = useAuth();
  const { t } = useLang();
  const [meals, setMeals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'Lunch' });
  const [goal, setGoal] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [favourites, setFavourites] = useState(loadFavourites());
  const [repeating, setRepeating] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [editingRecipe, setEditingRecipe] = useState(null); // null = closed, {} = new, {id,...} = edit

  const load = () => fetch('/api/meals', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setMeals);
  const loadGoal = () => fetch('/api/goals', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(g => { if (g) setGoal(g); });
  const loadRecipes = () => fetch('/api/recipes', { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.ok ? r.json() : [])
    .then(data => setRecipes(Array.isArray(data) ? data : []))
    .catch(() => setRecipes([]));
  useEffect(() => { load(); loadGoal(); loadRecipes(); }, [token]);

  const saveRecipe = async (data) => {
    const isEdit = !!editingRecipe?.id;
    const url = isEdit ? `/api/recipes/${editingRecipe.id}` : '/api/recipes';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Could not save recipe');
    if (isEdit) {
      setRecipes(prev => prev.map(r => r.id === body.id ? body : r));
    } else {
      setRecipes(prev => [body, ...prev]);
    }
    setEditingRecipe(null);
  };

  const deleteRecipe = async () => {
    if (!editingRecipe?.id) return;
    if (!confirm('Delete this recipe? This cannot be undone.')) return;
    const id = editingRecipe.id;
    setRecipes(prev => prev.filter(r => r.id !== id));
    setEditingRecipe(null);
    await fetch(`/api/recipes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const logRecipeAsMeal = (recipe) => {
    setForm({
      name: recipe.title,
      calories: recipe.calories != null ? String(recipe.calories) : '',
      protein: recipe.protein != null ? String(recipe.protein) : '',
      carbs: recipe.carbs != null ? String(recipe.carbs) : '',
      fat: recipe.fat != null ? String(recipe.fat) : '',
      meal_type: form.meal_type,
    });
    setShowForm(true);
    setTimeout(() => {
      const forms = document.querySelectorAll('.form-card');
      const target = Array.from(forms).find(c => c.querySelector('h3')?.textContent === 'Log Food');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
    const res = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, date: today }),
    });
    const newMeal = await res.json();
    // Optimistic update: add to state immediately
    setMeals(prev => [newMeal, ...prev]);
    // Track as favourite
    saveFavourite({ name: form.name, calories: Number(form.calories) || 0, protein: Number(form.protein) || 0, carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0, meal_type: form.meal_type });
    setFavourites(loadFavourites());
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: form.meal_type });
    setShowForm(false);
  };

  const saveGoal = async (data) => {
    await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
    setGoal(data);
  };

  const remove = async (id) => {
    // Optimistic update: remove from state immediately
    setMeals(prev => prev.filter(m => m.id !== id));
    await fetch(`/api/meals/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  };

  const repeatYesterday = async () => {
    setRepeating(true);
    const res = await fetch('/api/meals/repeat-yesterday', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const newMeals = await res.json();
      setMeals(prev => [...newMeals, ...prev]);
    }
    setRepeating(false);
  };

  const handleFoodSelect = (item) => {
    setForm({ ...form, name: item.name, calories: String(item.calories), protein: String(item.protein), carbs: String(item.carbs), fat: String(item.fat) });
  };

  const quickAdd = (fav) => {
    setForm({ name: fav.name, calories: String(fav.calories || ''), protein: String(fav.protein || ''), carbs: String(fav.carbs || ''), fat: String(fav.fat || ''), meal_type: fav.meal_type || 'Lunch' });
    setShowForm(true);
  };

  const toggleFav = (foodName, meal) => {
    const updated = toggleFavouriteStored(foodName, meal);
    setFavourites(updated);
  };

  const handleBarcodeScan = (item) => { setShowScanner(false); setShowForm(true); handleFoodSelect(item); };
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const todayMeals = meals.filter(m => m.date === today);
  const dailyCal = goal?.dailyCalories || 2500;
  const mealCalByType = {};
  MEAL_TYPES.forEach(t => { mealCalByType[t] = todayMeals.filter(m => m.meal_type === t).reduce((s, m) => s + (m.calories || 0), 0); });
  const calTargets = { Breakfast: Math.round(dailyCal * 0.25), Lunch: Math.round(dailyCal * 0.35), Dinner: Math.round(dailyCal * 0.30), Snack: Math.round(dailyCal * 0.10) };
  const todayCalories = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const todayProtein = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const todayCarbs = todayMeals.reduce((s, m) => s + (m.carbs || 0), 0);
  const todayFat = todayMeals.reduce((s, m) => s + (m.fat || 0), 0);

  // Running totals (targets from goals)
  const targetCal = goal?.dailyCalories || 2500;
  const targetProt = goal?.dailyProtein || 150;
  const targetCarbs = goal?.dailyCarbs || 250;
  const targetFat = goal?.dailyFat || 80;

  // Recent = last 5 unique foods logged (case-insensitive dedupe)
  const recentFoods = [];
  const seenRecent = new Set();
  for (const m of meals) {
    const key = normalizeName(m.name);
    if (!seenRecent.has(key) && recentFoods.length < 5) {
      recentFoods.push(m);
      seenRecent.add(key);
    }
  }

  // Starred favourites first, then top by count
  const starredFavs = favourites.filter(f => f.starred);
  const topFavs = starredFavs.length > 0 ? starredFavs.slice(0, 8) : favourites.filter(f => f.count >= 2).slice(0, 5);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('meals')}</h1>
          <p>{t('mealsSub')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={repeatYesterday} disabled={repeating}>
            {repeating ? 'Copying...' : 'Repeat Yesterday'}
          </button>
          <button className="btn-secondary" onClick={() => setShowScanner(true)}>Scan Barcode</button>
        </div>
      </div>

      {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}

      {/* Running Macro Totals Bar */}
      <div className="macro-bar">
        <div className="macro-bar-item">
          <div className="macro-bar-label">Calories</div>
          <div className="macro-bar-values">
            <span className="macro-bar-current">{todayCalories}</span>
            <span className="macro-bar-sep">/</span>
            <span className="macro-bar-target">{targetCal}</span>
          </div>
          <div className="macro-bar-track"><div className="macro-bar-fill" style={{ width: `${Math.min(todayCalories / targetCal * 100, 100)}%`, background: todayCalories > targetCal ? '#f59e0b' : '#22c55e' }} /></div>
        </div>
        <div className="macro-bar-item">
          <div className="macro-bar-label">Protein</div>
          <div className="macro-bar-values">
            <span className="macro-bar-current">{Math.round(todayProtein)}g</span>
            <span className="macro-bar-sep">/</span>
            <span className="macro-bar-target">{targetProt}g</span>
          </div>
          <div className="macro-bar-track"><div className="macro-bar-fill" style={{ width: `${Math.min(todayProtein / targetProt * 100, 100)}%`, background: '#3b82f6' }} /></div>
        </div>
        <div className="macro-bar-item">
          <div className="macro-bar-label">Carbs</div>
          <div className="macro-bar-values">
            <span className="macro-bar-current">{Math.round(todayCarbs)}g</span>
            <span className="macro-bar-sep">/</span>
            <span className="macro-bar-target">{targetCarbs}g</span>
          </div>
          <div className="macro-bar-track"><div className="macro-bar-fill" style={{ width: `${Math.min(todayCarbs / targetCarbs * 100, 100)}%`, background: '#f97316' }} /></div>
        </div>
        <div className="macro-bar-item">
          <div className="macro-bar-label">Fat</div>
          <div className="macro-bar-values">
            <span className="macro-bar-current">{Math.round(todayFat)}g</span>
            <span className="macro-bar-sep">/</span>
            <span className="macro-bar-target">{targetFat}g</span>
          </div>
          <div className="macro-bar-track"><div className="macro-bar-fill" style={{ width: `${Math.min(todayFat / targetFat * 100, 100)}%`, background: '#a855f7' }} /></div>
        </div>
      </div>

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

      {/* Quick Add: Favourites & Recent */}
      {(topFavs.length > 0 || recentFoods.length > 0) && (
        <div className="form-card">
          <h3>Quick Add</h3>
          {topFavs.length > 0 && (
            <div className="quick-section">
              <div className="quick-label">Favourites</div>
              <div className="quick-chips">
                {topFavs.map((f, i) => (
                  <div key={`fav-${i}`} className="quick-chip-wrap">
                    <button className="quick-chip" onClick={() => quickAdd(f)}>
                      {f.starred && <span className="quick-chip-star">{'\u2605'}</span>}
                      <span className="quick-chip-name">{f.name}</span>
                      <span className="quick-chip-cal">{f.calories} kcal</span>
                    </button>
                    {f.starred && <button className="quick-chip-unfav" onClick={() => toggleFav(f.name)} title="Remove favourite">&times;</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {recentFoods.length > 0 && (
            <div className="quick-section">
              <div className="quick-label">Recent</div>
              <div className="quick-chips">
                {recentFoods.map((m, i) => (
                  <button key={`rec-${i}`} className="quick-chip" onClick={() => quickAdd({ name: m.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, meal_type: m.meal_type })}>
                    <span className="quick-chip-name">{m.name}</span>
                    <span className="quick-chip-cal">{m.calories} kcal</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Recipes */}
      <div className="form-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>My Recipes</h3>
          <button className="btn-secondary" onClick={() => setEditingRecipe({})} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            + New Recipe
          </button>
        </div>
        {recipes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            No recipes yet. Tap <strong>+ New Recipe</strong> to save your own meal ideas with photos and macros.
          </p>
        ) : (
          <div className="recipe-grid">
            {recipes.map(r => (
              <div key={r.id} className="recipe-card" onClick={() => setEditingRecipe(r)}>
                {r.photo ? (
                  <img src={r.photo} alt={r.title} className="recipe-card-thumb" />
                ) : (
                  <div className="recipe-card-thumb recipe-card-thumb-placeholder">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>
                  </div>
                )}
                <div className="recipe-card-body">
                  <div className="recipe-card-title">{r.title}</div>
                  {r.calories != null && (
                    <div className="recipe-card-meta">{r.calories} kcal{r.protein != null ? ` · ${r.protein}g protein` : ''}</div>
                  )}
                  <div className="recipe-card-actions">
                    <button
                      className="btn-primary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={(e) => { e.stopPropagation(); logRecipeAsMeal(r); }}
                    >
                      Log as Meal
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingRecipe !== null && (
        <RecipeEditor
          recipe={editingRecipe.id ? editingRecipe : null}
          onSave={saveRecipe}
          onCancel={() => setEditingRecipe(null)}
          onDelete={editingRecipe.id ? deleteRecipe : null}
        />
      )}

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
                  <button className={`btn-fav ${isFavouriteStored(m.name) ? 'active' : ''}`}
                    onClick={() => toggleFav(m.name, m)} title={isFavouriteStored(m.name) ? 'Unfavourite' : 'Favourite'}>
                    {isFavouriteStored(m.name) ? '\u2605' : '\u2606'}
                  </button>
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
          <p>Tap the floating button to start tracking your nutrition.</p>
        </div>
      )}

      {/* Floating Log Meal button — scoped to Meals page, scrolls with user */}
      <button
        className="meals-fab"
        aria-label={showForm ? 'Cancel' : 'Log Meal'}
        onClick={() => {
          if (showForm) {
            // Closing the form: clear any prefilled values so the next open is empty.
            setForm({ name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: form.meal_type });
            setShowForm(false);
          } else {
            setShowForm(true);
            // scroll to form after it opens
            setTimeout(() => {
              const el = document.querySelector('.form-card h3');
              const forms = document.querySelectorAll('.form-card');
              const target = Array.from(forms).find(c => c.querySelector('h3')?.textContent === 'Log Food');
              (target || el)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 60);
          }
        }}
      >
        {showForm ? (
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        )}
        <span className="meals-fab-label">{showForm ? 'Close' : 'Log Meal'}</span>
      </button>
    </div>
  );
}
