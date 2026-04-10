// Shared fitness calculation formulas — keep in sync with server/index.js

/**
 * Epley formula for estimated 1-rep max.
 * @param {number} weight - Weight lifted (kg)
 * @param {number} reps - Reps completed
 * @returns {number} Estimated 1RM in kg, or 0 if invalid input
 */
export function epley1RM(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

/**
 * Estimated 1RM rounded to 1 decimal place (presentation format).
 */
export function estimate1RM(weight, reps) {
  return Math.round(epley1RM(weight, reps) * 10) / 10;
}

/**
 * Best 1RM from a list of sets (sets_data format).
 */
export function best1RMFromSets(setsData) {
  if (!Array.isArray(setsData) || setsData.length === 0) return 0;
  const vals = setsData
    .filter(s => Number(s.weight) > 0 && Number(s.reps) > 0)
    .map(s => epley1RM(s.weight, s.reps));
  if (vals.length === 0) return 0;
  return Math.round(Math.max(...vals) * 10) / 10;
}

/**
 * Total volume for a set list (sum of reps × weight).
 */
export function volumeFromSets(setsData) {
  if (!Array.isArray(setsData)) return 0;
  return setsData.reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weight) || 0), 0);
}
