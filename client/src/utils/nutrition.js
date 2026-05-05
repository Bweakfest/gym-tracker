// Shared nutrition formulas — used by Meals.jsx and Onboarding.jsx.
// Keep in sync with the server-side clamp in server/index.js POST /api/goals.

// Physiological ceiling for Physical Activity Level. Even elite athletes
// rarely exceed ~2.2 × BMR. Anything higher is almost certainly a bad input.
export const PAL_MAX = 2.2;

// Safety bounds for the final recommended calorie target.
// Below 1200 is unsafe for most adults; above 5000 is unrealistic for
// a non-professional-athlete daily target.
export const CAL_MIN = 1200;
export const CAL_MAX = 5000;

// Allowed input ranges (must match the <input min/max> attributes).
const RANGES = {
  weight:   [30, 250],   // kg
  height:   [120, 230],  // cm
  age:      [14, 90],    // years
  sport:    [0, 10],     // weekly sport hours (converted to PAL internally)
  activity: [1.0, 2.0],  // base lifestyle PAL
};

const inRange = (v, [lo, hi]) => Number.isFinite(v) && v >= lo && v <= hi;

/**
 * Mifflin-St Jeor BMR — the modern standard, more accurate than
 * Harris-Benedict (which over-estimates BMR for many body types).
 */
export function calcBMR(gender, weight, height, age) {
  const base = (10 * weight) + (6.25 * height) - (5 * age);
  return gender === 'female' ? base - 161 : base + 5;
}

/**
 * Compute daily calorie target and macro split.
 *
 * Returns `{ calories, protein, carbs, fat, tdee, valid }`.
 * When any input is out of range, returns zeros with `valid: false`
 * so callers can block Save and show a validation error.
 *
 * Fix history: previous version computed `bmr * (sport + activity)`
 * with no cap, so max form inputs produced > 10,000 kcal. This version
 * caps the combined PAL at 2.2 and clamps the final number to
 * [CAL_MIN, CAL_MAX].
 */
export function calcMacros(gender, weight, height, age, sport, activity, goalType) {
  const w = Number(weight);
  const h = Number(height);
  const a = Number(age);
  const s = Number(sport);
  const act = Number(activity);

  if (
    !inRange(w, RANGES.weight) ||
    !inRange(h, RANGES.height) ||
    !inRange(a, RANGES.age) ||
    !inRange(s, RANGES.sport) ||
    !inRange(act, RANGES.activity) ||
    (gender !== 'male' && gender !== 'female')
  ) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, tdee: 0, valid: false };
  }

  const bmr = calcBMR(gender, w, h, a);
  const sportPAL = s * 0.035;
  const pal = Math.min(act + sportPAL, PAL_MAX);
  const tdee = Math.round(bmr * pal);

  // Percentage-based goal adjustment (body-size aware, unlike the old flat ±400 kcal).
  let calories;
  if (goalType === 'lose')      calories = Math.round(tdee * 0.80); // 20 % deficit
  else if (goalType === 'gain') calories = Math.round(tdee * 1.15); // 15 % surplus
  else                          calories = tdee;

  // Hard safety clamp — never recommend a dangerous or absurd number.
  calories = Math.max(CAL_MIN, Math.min(calories, CAL_MAX));

  // Macro targets in grams, based on body weight (standard sports-nutrition ranges).
  let protein, fat;
  if (goalType === 'lose') {
    protein = Math.round(2.2 * w);
    fat = Math.round((gender === 'female' ? 0.9 : 0.7) * w);
  } else if (goalType === 'gain') {
    protein = Math.round(1.8 * w);
    fat = Math.round(1.2 * w);
  } else {
    protein = Math.round(2.0 * w);
    fat = Math.round(1.0 * w);
  }

  // Standard Atwater factors: 4 kcal/g protein & carbs, 9 kcal/g fat.
  // (Previous version used 4.1 / 9.3, inconsistent with food labels
  // and the Open Food Facts data this app queries.)
  const carbs = Math.max(0, Math.round((calories - (protein * 4) - (fat * 9)) / 4));

  // Regression guard: the reconstructed macro calories must land within
  // ±20 kcal of the target. If not, the protein/fat grams were so high
  // they forced carbs to clamp at 0 — we rebalance by trimming fat first
  // (protein is the priority macro for body-comp goals).
  const ATWATER_TOLERANCE = 20;
  const reconstructed = (protein * 4) + (carbs * 4) + (fat * 9);
  let fatAdjusted = fat;
  if (Math.abs(reconstructed - calories) > ATWATER_TOLERANCE) {
    // Solve for fat grams that close the gap (holds protein constant,
    // assumes carbs stays at 0 since that's the only way we get here).
    fatAdjusted = Math.max(0, Math.round((calories - (protein * 4)) / 9));
  }

  return { calories, protein, carbs, fat: fatAdjusted, tdee, valid: true };
}
