// Shared nutrition formulas — used by Meals.jsx and Onboarding.jsx.
// Uses Harris-Benedict BMR formula, with Katch-McArdle override when
// body fat percentage is known (more accurate for lean/heavy individuals).

// Physiological ceiling for Physical Activity Level.
export const PAL_MAX = 2.2;

// Safety bounds for the final recommended calorie target.
export const CAL_MIN = 1200;
export const CAL_MAX = 6000;

// Allowed input ranges (must match the <input min/max> attributes).
const RANGES = {
  weight:   [30, 250],   // kg
  height:   [120, 230],  // cm
  age:      [14, 90],    // years
  sport:    [0, 7],      // training sessions per week
  activity: [1.0, 2.0],  // base lifestyle PAL
  bodyFat:  [3, 60],     // body fat percentage
};

const inRange = (v, [lo, hi]) => Number.isFinite(v) && v >= lo && v <= hi;

/**
 * Harris-Benedict BMR — the formula used by ESN and many sports-nutrition
 * calculators. Tends to give slightly higher values than Mifflin-St Jeor.
 *
 * Male:   66.47 + (13.7 × weight_kg) + (5.0 × height_cm) − (6.8 × age)
 * Female: 655.1 + (9.6 × weight_kg) + (1.8 × height_cm) − (4.7 × age)
 */
export function calcBMR(gender, weight, height, age) {
  if (gender === 'female') {
    return 655.1 + (9.6 * weight) + (1.8 * height) - (4.7 * age);
  }
  return 66.47 + (13.7 * weight) + (5.0 * height) - (6.8 * age);
}

/**
 * Katch-McArdle BMR — used when body fat percentage is known.
 * More accurate because it bases the calculation on lean body mass.
 *
 * BMR = 370 + (21.6 × lean_body_mass_kg)
 */
export function calcBMR_KatchMcArdle(weight, bodyFatPct) {
  const leanMass = weight * (1 - bodyFatPct / 100);
  return 370 + (21.6 * leanMass);
}

/**
 * Compute daily calorie target and macro split.
 *
 * @param {string}  gender    - 'male' or 'female'
 * @param {number}  weight    - body weight in kg
 * @param {number}  height    - height in cm
 * @param {number}  age       - age in years
 * @param {number}  sport     - training sessions per week (0-7)
 * @param {number}  activity  - base lifestyle PAL (1.2 – 1.9)
 * @param {string}  goalType  - 'lose', 'maintain', or 'gain'
 * @param {number?} bodyFat   - optional body fat percentage (3-60)
 *
 * Returns `{ calories, protein, carbs, fat, tdee, bmr, valid }`.
 */
export function calcMacros(gender, weight, height, age, sport, activity, goalType, bodyFat) {
  const w = Number(weight);
  const h = Number(height);
  const a = Number(age);
  const s = Number(sport);
  const act = Number(activity);
  const bf = bodyFat != null && bodyFat !== '' ? Number(bodyFat) : null;

  if (
    !inRange(w, RANGES.weight) ||
    !inRange(h, RANGES.height) ||
    !inRange(a, RANGES.age) ||
    !inRange(s, RANGES.sport) ||
    !inRange(act, RANGES.activity) ||
    (gender !== 'male' && gender !== 'female')
  ) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, tdee: 0, bmr: 0, valid: false };
  }

  // If body fat is provided and valid, use Katch-McArdle; otherwise Harris-Benedict
  let bmr;
  if (bf !== null && inRange(bf, RANGES.bodyFat)) {
    bmr = calcBMR_KatchMcArdle(w, bf);
  } else {
    bmr = calcBMR(gender, w, h, a);
  }

  // Sport sessions add to the base PAL.
  // Each training session adds ~0.05 PAL spread across the week.
  const sportPAL = s * 0.05;
  const pal = Math.min(act + sportPAL, PAL_MAX);
  const tdee = Math.round(bmr * pal);

  // Goal adjustment: fixed kcal surplus/deficit (ESN approach).
  // Loss: 300-500 kcal deficit → we use 400 as a balanced midpoint.
  // Gain: 200-500 kcal surplus → we use 300 for lean gains.
  let calories;
  if (goalType === 'lose')      calories = tdee - 400;
  else if (goalType === 'gain') calories = tdee + 300;
  else                          calories = tdee;

  // Hard safety clamp — never recommend a dangerous or absurd number.
  calories = Math.max(CAL_MIN, Math.min(calories, CAL_MAX));

  // Macro targets in grams, based on body weight (standard sports-nutrition ranges).
  let protein, fat;
  if (goalType === 'lose') {
    protein = Math.round(2.2 * w);   // high protein to preserve muscle in deficit
    fat = Math.round((gender === 'female' ? 0.9 : 0.8) * w);
  } else if (goalType === 'gain') {
    protein = Math.round(1.8 * w);
    fat = Math.round(1.0 * w);
  } else {
    protein = Math.round(2.0 * w);
    fat = Math.round(0.9 * w);
  }

  // Standard Atwater factors: 4 kcal/g protein & carbs, 9 kcal/g fat.
  const carbs = Math.max(0, Math.round((calories - (protein * 4) - (fat * 9)) / 4));

  // Regression guard: if protein+fat alone exceed calorie target, trim fat.
  const ATWATER_TOLERANCE = 20;
  const reconstructed = (protein * 4) + (carbs * 4) + (fat * 9);
  let fatAdjusted = fat;
  if (Math.abs(reconstructed - calories) > ATWATER_TOLERANCE) {
    fatAdjusted = Math.max(0, Math.round((calories - (protein * 4)) / 9));
  }

  return { calories, protein, carbs, fat: fatAdjusted, tdee, bmr: Math.round(bmr), valid: true };
}

/**
 * Calculate the daily calorie adjustment needed to reach a target weight by a deadline.
 * Uses the approximation: 7700 kcal ≈ 1 kg of body weight change.
 *
 * @param {number} currentWeight - in kg
 * @param {number} targetWeight  - in kg
 * @param {string} targetDate    - ISO date string (YYYY-MM-DD)
 * @returns {{ dailyAdjustment, weeklyChange, weeksRemaining, weightDiff }}
 */
export function calcDynamicAdjustment(currentWeight, targetWeight, targetDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = new Date(targetDate + 'T00:00:00');
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksRemaining = Math.max(0, (deadline - now) / msPerWeek);
  const weightDiff = targetWeight - currentWeight;

  if (weeksRemaining < 0.14) {
    // Less than ~1 day — can't compute a meaningful rate
    return { dailyAdjustment: 0, weeklyChange: 0, weeksRemaining: 0, weightDiff };
  }

  const weeklyChange = weightDiff / weeksRemaining;       // kg/week
  const dailyAdjustment = Math.round(weeklyChange * 7700 / 7); // kcal/day

  return { dailyAdjustment, weeklyChange, weeksRemaining, weightDiff };
}

/**
 * Validate whether a weight-change goal is realistic and safe.
 *
 * @param {number} weeklyChange    - kg per week (negative = losing)
 * @param {number} resultCalories  - final daily calorie target after adjustment
 * @param {number} weeksRemaining  - weeks until deadline
 * @param {string} goalType        - 'lose', 'gain', or 'maintain'
 * @param {number} weightDiff      - targetWeight - currentWeight
 * @returns {Array<{level: 'warning'|'danger', message: string}>}
 */
export function validateGoalRealism(weeklyChange, resultCalories, weeksRemaining, goalType, weightDiff) {
  const warnings = [];

  if (weeksRemaining <= 0) {
    warnings.push({ level: 'danger', message: 'Your deadline is in the past. Pick a future date.' });
    return warnings;
  }
  if (weeksRemaining < 1) {
    warnings.push({ level: 'danger', message: 'Your deadline is less than 1 week away. You need more time for healthy progress.' });
  }
  if (weeksRemaining > 104) {
    warnings.push({ level: 'warning', message: 'Your deadline is over 2 years away. Consider setting a shorter milestone.' });
  }

  // Direction mismatch
  if (goalType === 'lose' && weightDiff > 0) {
    warnings.push({ level: 'warning', message: 'Your target weight is higher than your current weight, but you selected "Lose Weight".' });
  }
  if (goalType === 'gain' && weightDiff < 0) {
    warnings.push({ level: 'warning', message: 'Your target weight is lower than your current weight, but you selected "Build Muscle".' });
  }

  // Rate of change
  if (weeklyChange < -1.0) {
    warnings.push({ level: 'danger', message: `Losing ${Math.abs(weeklyChange).toFixed(1)} kg/week is too aggressive. Max recommended is 1 kg/week. Extend your deadline.` });
  } else if (weeklyChange < -0.75) {
    warnings.push({ level: 'warning', message: `Losing ${Math.abs(weeklyChange).toFixed(1)} kg/week is aggressive. Consider extending your deadline for sustainable results.` });
  }
  if (weeklyChange > 0.5) {
    warnings.push({ level: 'warning', message: `Gaining ${weeklyChange.toFixed(1)} kg/week is fast — much of it may be fat. Consider a slower pace.` });
  }

  // Calorie safety
  if (resultCalories < CAL_MIN) {
    warnings.push({ level: 'danger', message: `Calculated calories (${resultCalories}) are below the safe minimum of ${CAL_MIN} kcal. Extend your deadline.` });
  }
  if (resultCalories > CAL_MAX) {
    warnings.push({ level: 'warning', message: `Calculated calories exceed ${CAL_MAX} kcal. Check your inputs.` });
  }

  return warnings;
}

/**
 * Full calorie calculator with dynamic deadline-based adjustment.
 * Wraps calcMacros: if targetWeight and targetDate are provided and goalType
 * isn't 'maintain', the fixed ±kcal offset is replaced with a computed one.
 * Falls back to the standard fixed adjustment when no deadline is set.
 *
 * Returns everything calcMacros returns, plus:
 *   { dailyAdjustment, weeklyChange, weeksRemaining, warnings[] }
 */
export function calcMacrosWithDeadline(gender, weight, height, age, sport, activity, goalType, bodyFat, targetWeight, targetDate) {
  // Get baseline TDEE and macros using standard calcMacros
  const base = calcMacros(gender, weight, height, age, sport, activity, goalType, bodyFat);
  if (!base.valid) {
    return { ...base, dailyAdjustment: 0, weeklyChange: 0, weeksRemaining: 0, warnings: [] };
  }

  const tw = Number(targetWeight);
  const hasDeadline = targetDate && !isNaN(tw) && tw > 0 && goalType !== 'maintain';

  if (!hasDeadline) {
    // No deadline → use the fixed-offset result from calcMacros as-is
    return { ...base, dailyAdjustment: goalType === 'lose' ? -400 : goalType === 'gain' ? 300 : 0, weeklyChange: 0, weeksRemaining: 0, warnings: [] };
  }

  const { dailyAdjustment, weeklyChange, weeksRemaining, weightDiff } = calcDynamicAdjustment(weight, tw, targetDate);

  // Apply dynamic adjustment to TDEE instead of the fixed ±kcal
  let calories = Math.round(base.tdee + dailyAdjustment);
  calories = Math.max(CAL_MIN, Math.min(calories, CAL_MAX));

  // Keep the same protein/fat ratios from goalType, but recompute carbs for new calorie total
  const { protein, fat } = base;
  const carbs = Math.max(0, Math.round((calories - (protein * 4) - (fat * 9)) / 4));

  // Regression guard (same as calcMacros)
  const reconstructed = (protein * 4) + (carbs * 4) + (fat * 9);
  let fatAdjusted = fat;
  if (Math.abs(reconstructed - calories) > 20) {
    fatAdjusted = Math.max(0, Math.round((calories - (protein * 4)) / 9));
  }

  const warnings = validateGoalRealism(weeklyChange, calories, weeksRemaining, goalType, weightDiff);

  return {
    calories,
    protein,
    carbs,
    fat: fatAdjusted,
    tdee: base.tdee,
    bmr: base.bmr,
    valid: true,
    dailyAdjustment,
    weeklyChange,
    weeksRemaining,
    warnings,
  };
}
