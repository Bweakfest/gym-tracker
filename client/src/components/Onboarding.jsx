import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { calcMacrosWithDeadline } from '../utils/nutrition';

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
  const [targetDate, setTargetDate] = useState('');

  if (hasGoals) return null;

  // Auto-suggest a deadline when weights change and no date is set yet
  const suggestDate = (cw, tw, goal) => {
    if (!cw || !tw || goal === 'maintain') return '';
    const diff = Math.abs(Number(tw) - Number(cw));
    // ~0.5 kg/week for loss, ~0.3 kg/week for gain
    const rate = goal === 'lose' ? 0.5 : 0.3;
    const weeks = Math.max(4, Math.ceil(diff / rate));
    const d = new Date();
    d.setDate(d.getDate() + weeks * 7);
    return d.toISOString().split('T')[0];
  };

  const canNext1 = age && height;
  const canNext2 = currentWeight && targetWeight;

  // Use deadline-aware calculator when date is set, otherwise standard
  const macros = (canNext1 && canNext2)
    ? calcMacrosWithDeadline(gender, Number(currentWeight), Number(height), Number(age), sport, activity, goalType, bodyFat || null, Number(targetWeight), targetDate || null)
    : null;

  const hasDangerWarning = macros?.warnings?.some(w => w.level === 'danger');

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
          weeks: macros.weeksRemaining ? Math.round(macros.weeksRemaining) : 12,
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
          targetDate: targetDate || null,
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

            {goalType !== 'maintain' && (
              <div className="onboard-field">
                <label>Goal Deadline <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(when do you want to reach your target?)</span></label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  min={new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}
                  onFocus={() => {
                    if (!targetDate && currentWeight && targetWeight) {
                      setTargetDate(suggestDate(currentWeight, targetWeight, goalType));
                    }
                  }}
                />
                {!targetDate && currentWeight && targetWeight && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Tap to set a deadline — we'll auto-suggest one based on a healthy pace.
                  </p>
                )}
              </div>
            )}

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
                  {macros.dailyAdjustment && targetDate ? (
                    <p>
                      {macros.dailyAdjustment > 0 ? '+' : ''}{macros.dailyAdjustment} kcal/day
                      {' '}to {goalType === 'lose' ? 'reach' : 'reach'} {targetWeight} kg by{' '}
                      {new Date(targetDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' '}(~{Math.abs(macros.weeklyChange).toFixed(2)} kg/week)
                    </p>
                  ) : (
                    <>
                      {goalType === 'gain' && <p>+300 kcal surplus for lean muscle gain</p>}
                      {goalType === 'lose' && <p>-400 kcal deficit for steady fat loss</p>}
                      {goalType === 'maintain' && <p>Maintenance calories to hold your weight</p>}
                    </>
                  )}
                </div>

                {/* Realism warnings */}
                {macros.warnings && macros.warnings.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    {macros.warnings.map((w, i) => (
                      <div key={i} style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        marginBottom: 6,
                        fontSize: '0.82rem',
                        lineHeight: 1.4,
                        background: w.level === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        border: `1px solid ${w.level === 'danger' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                        color: w.level === 'danger' ? '#f87171' : '#fbbf24',
                      }}>
                        {w.level === 'danger' ? '⛔' : '⚠️'} {w.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <p style={{ color: 'var(--danger, #ef4444)', fontSize: '0.85rem', textAlign: 'center', margin: '0.5rem 0 0' }}>{error}</p>}

            <div className="onboard-btn-row">
              <button className="onboard-btn secondary" onClick={() => setStep(1)}>Back</button>
              <button className="onboard-btn primary" disabled={saving || !macros?.valid || hasDangerWarning} onClick={handleSave}>
                {saving ? 'Saving...' : 'Save & Start'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
