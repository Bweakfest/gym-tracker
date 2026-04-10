// Exercise swap logic — suggests alternatives for a given exercise.
// Priority: same muscle group & similar mechanics, different equipment preferred.

// Group muscle → primary movement pattern buckets.
const PATTERN_MAP = {
  // Chest
  'Barbell Bench Press': 'horizontal-push',
  'Dumbbell Bench Press': 'horizontal-push',
  'Machine Chest Press': 'horizontal-push',
  'Smith Machine Bench Press': 'horizontal-push',
  'Push-ups': 'horizontal-push',
  'Incline Barbell Press': 'incline-push',
  'Incline Dumbbell Press': 'incline-push',
  'Overhead Press': 'vertical-push',
  'Dumbbell Shoulder Press': 'vertical-push',
  'Arnold Press': 'vertical-push',
  'Machine Shoulder Press': 'vertical-push',
  'Smith Machine OHP': 'vertical-push',
  // Back
  'Barbell Row': 'horizontal-pull',
  'Dumbbell Row': 'horizontal-pull',
  'Seated Cable Row': 'horizontal-pull',
  'Chest-Supported Row': 'horizontal-pull',
  'Pendlay Row': 'horizontal-pull',
  'T-Bar Row': 'horizontal-pull',
  'Machine Row': 'horizontal-pull',
  'Pull-ups': 'vertical-pull',
  'Chin-ups': 'vertical-pull',
  'Lat Pulldown': 'vertical-pull',
  'Close Grip Pulldown': 'vertical-pull',
  'Neutral Grip Pull-ups': 'vertical-pull',
  // Legs
  'Barbell Back Squat': 'squat',
  'Front Squat': 'squat',
  'Goblet Squat': 'squat',
  'Leg Press': 'squat',
  'Hack Squat': 'squat',
  'Smith Machine Squat': 'squat',
  'Bulgarian Split Squat': 'squat-unilateral',
  'Walking Lunge': 'squat-unilateral',
  'Reverse Lunge': 'squat-unilateral',
  'Deadlift': 'hinge',
  'Romanian Deadlift': 'hinge',
  'Dumbbell Romanian Deadlift': 'hinge',
  'Stiff Leg Deadlift': 'hinge',
  'Sumo Deadlift': 'hinge',
};

export function getSwapSuggestions(exerciseName, allExercises, limit = 4) {
  const target = allExercises.find(e => e.name === exerciseName);
  if (!target) return [];

  const targetPattern = PATTERN_MAP[exerciseName];
  const scored = allExercises
    .filter(e => e.name !== exerciseName)
    .map(e => {
      let score = 0;
      // Same muscle group = strong match
      if (e.group === target.group) score += 10;
      // Same pattern = perfect match
      const ePat = PATTERN_MAP[e.name];
      if (targetPattern && ePat && ePat === targetPattern) score += 20;
      // Different equipment = bonus (variety)
      if (e.equipment !== target.equipment) score += 3;
      // Shared muscles keyword overlap
      if (target.muscles && e.muscles) {
        const tWords = target.muscles.toLowerCase().split(/[,\s]+/).filter(w => w.length > 3);
        const eWords = new Set(e.muscles.toLowerCase().split(/[,\s]+/));
        tWords.forEach(w => { if (eWords.has(w)) score += 2; });
      }
      return { ex: e, score };
    })
    .filter(x => x.score >= 10) // Must at least share muscle group
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.ex);

  return scored;
}
