import { useMemo } from 'react';

const MACROS = [
  { key: 'protein', label: 'Protein', color: 'var(--accent)' },
  { key: 'carbs',   label: 'Carbs',   color: 'var(--blue)' },
  { key: 'fat',     label: 'Fat',     color: 'var(--amber)' },
];

const R = 54;
const CIRC = 2 * Math.PI * R;
const SEG = CIRC / 3;          // each macro owns 1/3 of the ring
const GAP = 4;                 // small gap between segments
const ARC_LEN = SEG - GAP;     // drawable arc within each segment

export default function MacroDonut({
  protein = 0,
  carbs = 0,
  fat = 0,
  proteinTarget,
  carbsTarget = 250,
  fatTarget = 65,
  calories = 0,
  calorieTarget = 2000,
}) {
  const values  = useMemo(() => [protein, carbs, fat], [protein, carbs, fat]);
  const targets = useMemo(() => [proteinTarget, carbsTarget, fatTarget], [proteinTarget, carbsTarget, fatTarget]);

  const arcs = useMemo(() =>
    MACROS.map((m, i) => {
      const pct   = targets[i] ? Math.min(values[i] / targets[i], 1) : 0;
      const fill  = ARC_LEN * pct;
      const blank = CIRC - fill;
      const rot   = -90 + i * 120;
      return { ...m, pct, fill, blank, rot, eaten: values[i], target: targets[i] };
    }),
    [values, targets],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {/* Donut */}
      <svg viewBox="0 0 140 140" width="140" height="140">
        {/* Background track */}
        <circle cx="70" cy="70" r={R} fill="none"
          stroke="var(--bg-card)" strokeWidth="10" />

        {/* Macro arcs */}
        {arcs.map((a) => (
          <circle key={a.key} cx="70" cy="70" r={R} fill="none"
            stroke={a.color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${a.fill} ${a.blank}`}
            transform={`rotate(${a.rot} 70 70)`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        ))}

        {/* Center text */}
        {calories === 0 ? (
          <text x="70" y="74" textAnchor="middle"
            fill="var(--text-muted)" fontSize="12" fontWeight="500">
            Log a meal
          </text>
        ) : (
          <>
            <text x="70" y="64" textAnchor="middle"
              fill="var(--text-primary)" fontSize="18" fontWeight="700">
              {Math.round(calories)}
            </text>
            <text x="70" y="82" textAnchor="middle"
              fill="var(--text-muted)" fontSize="10">
              / {calorieTarget} cal
            </text>
          </>
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {arcs.map((a) => (
          <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: a.color, flexShrink: 0,
            }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {a.label}
            </span>
            <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}>
              {Math.round(a.eaten)}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                /{a.target}g
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
