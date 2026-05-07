import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { calcMacros } from '../utils/nutrition';

// ESN-style PAL values (midpoints of each band)
const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentary (office job, little movement)' },
  { value: 1.4, label: 'Lightly active (some walking, errands)' },
  { value: 1.6, label: 'Active (on your feet most of the day)' },
  { value: 1.8, label: 'Very active (physical job / daily hard exercise)' },
];

export default function Onboarding({ hasGoals, onComplete }) {
  const { token } = useAuth();
  const { t } = useLang();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stepWarning, setStepWarning] = useState('');

  /* Step 1 */
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');

  /* Step 2 */
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goalType, setGoalType] = useState('gain');
  const [activity, setActivity] = useState(1.6);
  const [sport, setSport] = useState(3);
  const [bodyFat, setBodyFat] = useState('');

  if (hasGoals) return null;

  const canNext1 = age && height;
  const canNext2 = currentWeight && targetWeight;

  const macros = (canNext1 && canNext2)
    ? calcMacros(gender, Number(currentWeight), Number(height), Number(age), sport, activity, goalType, bodyFat || null)
    : null;

  const handleSave = async () => {
    if (!macros || !macros.valid) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentWeight: Number(currentWeight),
          targetWeight: Number(targetWeight),
          weeks: 12,
          dailyCalories: macros.calories,
          dailyProtein: macros.protein,
          dailyCarbs: macros.carbs,
          dailyFat: macros.fat,
          gender,
          age: Number(age),
          height: Number(height),
          sport: Number(sport),
          activity: Number(activity),
          goalType,
          bodyFat: bodyFat !== '' ? Number(bodyFat) : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save goals');
      }
      onComplete();
    } catch (e) {
      console.error('Failed to save goals:', e);
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboard-overlay">
      <div className="onboard-card">
        {/* Step indicator dots */}
        <div className="onboard-dots">
          {[0, 1, 2].map(i => (
            <span key={i} className={`onboard-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 0 && (
          <div className="onboard-step">
            <h2 className="onboard-title">{t('onboardWelcome')}</h2>
            <p className="onboard-desc">Let's set up your profile to calculate your ideal nutrition targets.</p>

            <div className="onboard-field">
              <label>Gender</label>
              <div className="onboard-toggle-row">
                <button className={`onboard-toggle ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>Male</button>
                <button className={`onboard-toggle ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>Female</button>
              </div>
            </div>

            <div className="onboard-field">
              <label>Age</label>
              <input type="number" placeholder="e.g. 25" value={age} onChange={e => setAge(e.target.value)} min="13" max="100" />
            </div>

            <div className="onboard-field">
              <label>Height (cm)</label>
              <input type="number" placeholder="e.g. 178" value={height} onChange={e => setHeight(e.target.value)} min="100" max="250" />
            </div>

            {stepWarning && (
              <p style={{ color: '#f59e0b', fontSize: '0.85rem', textAlign: 'center', margin: '0.5rem 0 0' }}>{stepWarning}</p>
            )}
            <button className="onboard-btn primary" disabled={!canNext1} onClick={() => {
              setStepWarning('');
              const ageNum = Number(age);
              const heightNum = Number(height);
              if (ageNum < 14 || ageNum > 90) { setStepWarning('Age should be between 14 and 90.'); return; }
              if (heightNum < 120 || heightNum > 230) { setStepWarning('Height should be between 120 and 230 cm.'); return; }
              setStep(1);
            }}>Continue</button>
            <button onClick={onComplete} style={{
  background: 'none', border: 'none', color: 'var(--text-muted)',
  cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem',
  textDecoration: 'underline', fontFamily: 'inherit'
}}>Skip for now</button>
          </div>
        )}

        {/* Step 2: Goals */}
        {step === 1 && (
          <div className="onboard-step">
            <h2 className="onboard-title">{t('onboardGoals')}</h2>
            <p className="onboard-desc">Tell us about your body composition goals.</p>

            <div className="onboard-row">
              <div className="onboard-field">
                <label>Current Weight (kg)</label>
                <input type="number" placeholder="e.g. 80" value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} min="30" max="300" />
              </div>
              <div className="onboard-field">
                <label>Target Weight (kg)</label>
                <input type="number" placeholder="e.g. 85" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} min="30" max="300" />
              </div>
            </div>

            <div className="onboard-field">
              <label>Goal</label>
              <div className="onboard-toggle-row triple">
                <button className={`onboard-toggle ${goalType === 'gain' ? 'active' : ''}`} onClick={() => setGoalType('gain')}>Gain</button>
                <button className={`onboard-toggle ${goalType === 'maintain' ? 'active' : ''}`} onClick={() => setGoalType('maintain')}>Maintain</button>
                <button className={`onboard-toggle ${goalType === 'lose' ? 'active' : ''}`} onClick={() => setGoalType('lose')}>Lose</button>
              </div>
            </div>

            <div className="onboard-field">
              <label>Daily Activity Level</label>
              <select value={activity} onChange={e => setActivity(Number(e.target.value))}>
                {ACTIVITY_LEVELS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            <div className="onboard-field">
              <label>Training Sessions per Week: {sport}</label>
              <input type="range" min="0" max="7" step="1" value={sport} onChange={e => setSport(Number(e.target.value))} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                <span>None</span><span>7x</span>
              </div>
            </div>

            <div className="onboard-field">
              <label>Body Fat % <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional — improves accuracy)</span></label>
              <input type="number" placeholder="e.g. 15" value={bodyFat} onChange={e => setBodyFat(e.target.value)} min="3" max="60" step="0.1" />
            </div>

            <div className="onboard-btn-row">
              <button className="onboard-btn secondary" onClick={() => setStep(0)}>Back</button>
              <button className="onboard-btn primary" disabled={!canNext2} onClick={() => setStep(2)}>Continue</button>
            </div>
          </div>
        )}

        {/* Step 3: Plan */}
        {step === 2 && (
          <div className="onboard-step">
            <h2 className="onboard-title">{t('onboardPlan')}</h2>
            <p className="onboard-desc">Here's your personalized nutrition plan based on your profile.</p>

            {macros?.valid && (
              <div className="onboard-plan">
                <div className="onboard-plan-hero">
                  <span className="onboard-plan-cal">{macros.calories}</span>
                  <span className="onboard-plan-unit">kcal / day</span>
                </div>
                <div className="onboard-plan-label">TDEE: {macros.tdee} kcal</div>

                <div className="onboard-macros">
                  <div className="onboard-macro">
                    <span className="onboard-macro-val">{macros.protein}g</span>
                    <span className="onboard-macro-label">Protein</span>
                  </div>
                  <div className="onboard-macro">
                    <span className="onboard-macro-val">{macros.carbs}g</span>
                    <span className="onboard-macro-label">Carbs</span>
                  </div>
                  <div className="onboard-macro">
                    <span className="onboard-macro-val">{macros.fat}g</span>
                    <span className="onboard-macro-label">Fat</span>
                  </div>
                </div>

                <div className="onboard-plan-summary">
                  {goalType === 'gain' && <p>+300 kcal surplus for lean muscle gain</p>}
                  {goalType === 'lose' && <p>-400 kcal deficit for steady fat loss</p>}
                  {goalType === 'maintain' && <p>Maintenance calories to hold your weight</p>}
                </div>
              </div>
            )}

            {error && <p style={{ color: 'var(--danger, #ef4444)', fontSize: '0.85rem', textAlign: 'center', margin: '0.5rem 0 0' }}>{error}</p>}

            <div className="onboard-btn-row">
              <button className="onboard-btn secondary" onClick={() => setStep(1)}>Back</button>
              <button className="onboard-btn primary" disabled={saving || !macros?.valid} onClick={handleSave}>
                {saving ? 'Saving...' : 'Save & Start'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
