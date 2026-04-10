// Smart warm-up set calculator
// Based on classic 40/60/80% working weight ramp-up.

export function buildWarmupSets(workingWeight, barWeight = 20) {
  const w = Number(workingWeight) || 0;
  if (w < 40) return []; // Light weight — warm-up not needed
  const round = (x) => Math.round(x / 2.5) * 2.5;
  const sets = [];
  // Bar warm-up for barbell movements
  if (w >= 60) sets.push({ reps: 10, weight: barWeight, label: 'Empty bar' });
  sets.push({ reps: 8, weight: Math.max(barWeight, round(w * 0.4)), label: '40%' });
  sets.push({ reps: 5, weight: Math.max(barWeight, round(w * 0.6)), label: '60%' });
  sets.push({ reps: 3, weight: Math.max(barWeight, round(w * 0.8)), label: '80%' });
  return sets;
}

export default function WarmupSuggestions({ workingWeight, barWeight = 20 }) {
  const sets = buildWarmupSets(workingWeight, barWeight);
  if (sets.length === 0) return null;

  return (
    <div className="warmup-box">
      <div className="warmup-title">
        <span>🔥</span> Smart Warm-up
        <span className="warmup-sub">Target: {workingWeight} kg</span>
      </div>
      <div className="warmup-sets">
        {sets.map((s, i) => (
          <div key={i} className="warmup-set">
            <span className="warmup-pct">{s.label}</span>
            <span className="warmup-load">{s.weight} kg × {s.reps}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
