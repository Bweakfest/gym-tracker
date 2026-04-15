import { useState } from 'react';

// Polished CSS-animated muscle map.
// Uses SVG body silhouettes with breathing pulse, flowing glow, and staggered activation
// on primary muscles. Secondary muscles get a calmer pulse. Pure CSS/SVG — no external assets.

const PRIMARY = '#f97316';
const SECONDARY = '#3b82f6';

// Demo preset. In production this would be driven by the selected exercise.
const DEMO_PRESETS = {
  'Bench Press':   { primary: ['chest', 'frontDelt'], secondary: ['triceps'] },
  'Barbell Row':   { primary: ['lats', 'upperBack'],  secondary: ['biceps', 'rearDelt'] },
  'Squat':         { primary: ['quads', 'glutes'],    secondary: ['hamstrings', 'lowerBack'] },
  'Deadlift':      { primary: ['hamstrings', 'lowerBack', 'glutes'], secondary: ['traps', 'lats', 'forearms'] },
  'Overhead Press':{ primary: ['frontDelt'],          secondary: ['triceps', 'chest', 'traps'] },
  'Barbell Curl':  { primary: ['biceps'],             secondary: ['forearms'] },
};

// Muscle SVG shapes keyed by name. Each is a path string plus a center point (for label lines).
const FRONT_MUSCLES = {
  chest:    { d: 'M 65 95 Q 100 88 135 95 Q 138 120 120 135 Q 100 140 80 135 Q 62 120 65 95 Z', cx: 100, cy: 115 },
  frontDelt:{ d: 'M 50 82 Q 40 100 55 118 Q 70 110 75 90 Q 65 80 50 82 Z', cx: 60, cy: 100 },
  frontDeltR:{ key: 'frontDelt', d: 'M 150 82 Q 160 100 145 118 Q 130 110 125 90 Q 135 80 150 82 Z', cx: 140, cy: 100 },
  biceps:   { d: 'M 44 125 Q 36 155 44 180 Q 55 175 58 150 Q 54 128 44 125 Z', cx: 48, cy: 150 },
  bicepsR:  { key: 'biceps', d: 'M 156 125 Q 164 155 156 180 Q 145 175 142 150 Q 146 128 156 125 Z', cx: 152, cy: 150 },
  forearms: { d: 'M 36 190 Q 30 220 38 250 Q 48 248 52 220 Q 48 192 36 190 Z', cx: 42, cy: 220 },
  forearmsR:{ key: 'forearms', d: 'M 164 190 Q 170 220 162 250 Q 152 248 148 220 Q 152 192 164 190 Z', cx: 158, cy: 220 },
  abs:      { d: 'M 82 145 L 118 145 L 118 220 Q 100 225 82 220 Z', cx: 100, cy: 185 },
  obliques: { d: 'M 70 150 Q 66 190 78 220 L 82 220 L 82 145 Z', cx: 74, cy: 185 },
  obliquesR:{ key: 'obliques', d: 'M 130 150 Q 134 190 122 220 L 118 220 L 118 145 Z', cx: 126, cy: 185 },
  quads:    { d: 'M 70 245 Q 60 300 70 370 Q 85 375 92 310 Q 88 250 70 245 Z', cx: 78, cy: 310 },
  quadsR:   { key: 'quads', d: 'M 130 245 Q 140 300 130 370 Q 115 375 108 310 Q 112 250 130 245 Z', cx: 122, cy: 310 },
  tibialis: { d: 'M 75 395 Q 70 425 78 450 L 88 450 Q 88 420 84 395 Z', cx: 80, cy: 425 },
  tibialisR:{ key: 'tibialis', d: 'M 125 395 Q 130 425 122 450 L 112 450 Q 112 420 116 395 Z', cx: 120, cy: 425 },
};

const BACK_MUSCLES = {
  traps:    { d: 'M 80 75 Q 100 68 120 75 Q 118 100 100 108 Q 82 100 80 75 Z', cx: 100, cy: 88 },
  upperBack:{ d: 'M 70 110 Q 100 108 130 110 Q 128 135 100 140 Q 72 135 70 110 Z', cx: 100, cy: 125 },
  lats:     { d: 'M 58 140 Q 52 180 65 220 Q 78 215 80 175 Q 76 140 58 140 Z', cx: 66, cy: 180 },
  latsR:    { key: 'lats', d: 'M 142 140 Q 148 180 135 220 Q 122 215 120 175 Q 124 140 142 140 Z', cx: 134, cy: 180 },
  rearDelt: { d: 'M 50 82 Q 40 100 52 118 Q 65 115 72 95 Q 62 80 50 82 Z', cx: 58, cy: 100 },
  rearDeltR:{ key: 'rearDelt', d: 'M 150 82 Q 160 100 148 118 Q 135 115 128 95 Q 138 80 150 82 Z', cx: 142, cy: 100 },
  triceps:  { d: 'M 42 125 Q 34 155 42 185 Q 54 180 57 150 Q 52 128 42 125 Z', cx: 46, cy: 150 },
  tricepsR: { key: 'triceps', d: 'M 158 125 Q 166 155 158 185 Q 146 180 143 150 Q 148 128 158 125 Z', cx: 154, cy: 150 },
  forearms: { d: 'M 36 195 Q 30 225 40 250 Q 50 248 54 225 Q 50 198 36 195 Z', cx: 42, cy: 225 },
  forearmsR:{ key: 'forearms', d: 'M 164 195 Q 170 225 160 250 Q 150 248 146 225 Q 150 198 164 195 Z', cx: 158, cy: 225 },
  lowerBack:{ d: 'M 82 230 L 118 230 L 118 265 Q 100 270 82 265 Z', cx: 100, cy: 248 },
  glutes:   { d: 'M 72 275 Q 60 310 72 345 Q 100 350 128 345 Q 140 310 128 275 Q 100 268 72 275 Z', cx: 100, cy: 310 },
  hamstrings:{ d: 'M 70 350 Q 60 400 70 440 Q 85 442 92 400 Q 90 358 70 350 Z', cx: 78, cy: 395 },
  hamstringsR:{ key: 'hamstrings', d: 'M 130 350 Q 140 400 130 440 Q 115 442 108 400 Q 110 358 130 350 Z', cx: 122, cy: 395 },
  calves:   { d: 'M 72 445 Q 66 485 76 510 L 88 510 Q 88 475 84 445 Z', cx: 78, cy: 478 },
  calvesR:  { key: 'calves', d: 'M 128 445 Q 134 485 124 510 L 112 510 Q 112 475 116 445 Z', cx: 122, cy: 478 },
};

function MuscleShape({ def, role, delay }) {
  const color = role === 'primary' ? PRIMARY : role === 'secondary' ? SECONDARY : '#1c3850';
  const baseFill = role === 'primary' ? `url(#gradPrimary)` : role === 'secondary' ? `url(#gradSecondary)` : '#0c1d2e';
  const fillOp = role === 'none' ? 0.3 : 1;
  const animClass = role === 'primary' ? 'muscle-pulse-primary' : role === 'secondary' ? 'muscle-pulse-secondary' : '';
  return (
    <path
      d={def.d}
      fill={baseFill}
      fillOpacity={fillOp}
      stroke={color}
      strokeWidth={role === 'primary' ? 1.4 : role === 'secondary' ? 1.1 : 0.5}
      strokeLinejoin="round"
      className={animClass}
      style={{ transformOrigin: `${def.cx}px ${def.cy}px`, animationDelay: `${delay}s` }}
    />
  );
}

function BodyView({ side, activation }) {
  const isBack = side === 'back';
  const muscles = isBack ? BACK_MUSCLES : FRONT_MUSCLES;

  const getRole = (key) => {
    if (activation.primary.includes(key)) return 'primary';
    if (activation.secondary.includes(key)) return 'secondary';
    return 'none';
  };

  return (
    <svg viewBox="0 0 200 540" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        {/* Animated gradients that shift slightly so muscles look "alive" */}
        <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdba74">
            <animate attributeName="stop-color" values="#fdba74;#fb923c;#fdba74" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#ea580c">
            <animate attributeName="stop-color" values="#ea580c;#f97316;#ea580c" dur="3s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        <linearGradient id="gradSecondary" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <radialGradient id="bgGrad" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#0d1f35" />
          <stop offset="100%" stopColor="#050a14" />
        </radialGradient>
        <filter id="glowPrimary" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
          <feComposite in="SourceGraphic" operator="over" />
        </filter>
        {/* Body silhouette gradient */}
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f2338" />
          <stop offset="100%" stopColor="#081420" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width="200" height="540" fill="url(#bgGrad)" rx="10" />

      {/* Body silhouette outline */}
      <g>
        {/* Head */}
        <ellipse cx="100" cy="40" rx="22" ry="28" fill="url(#bodyGrad)" stroke="#1c3850" strokeWidth="0.8" />
        {/* Neck */}
        <path d="M 88 62 L 112 62 L 112 72 L 88 72 Z" fill="url(#bodyGrad)" stroke="#1c3850" strokeWidth="0.6" />
        {/* Torso */}
        <path d="M 60 72 Q 100 68 140 72 Q 145 150 138 230 Q 100 240 62 230 Q 55 150 60 72 Z"
          fill="url(#bodyGrad)" stroke="#1c3850" strokeWidth="0.8" />
        {/* Arms */}
        <path d="M 50 80 Q 35 160 38 255 L 52 255 Q 54 160 62 80 Z" fill="url(#bodyGrad)" stroke="#1c3850" strokeWidth="0.8" />
        <path d="M 150 80 Q 165 160 162 255 L 148 255 Q 146 160 138 80 Z" fill="url(#bodyGrad)" stroke="#1c3850" strokeWidth="0.8" />
        {/* Hips / pelvis */}
        <path d="M 62 230 Q 100 238 138 230 L 142 260 Q 100 264 58 260 Z"
          fill="url(#bodyGrad)" stroke="#1c3850" strokeWidth="0.8" />
        {/* Legs */}
        <path d="M 62 260 Q 58 350 68 445 L 92 445 Q 94 350 94 260 Z"
          fill="url(#bodyGrad)" stroke="#1c3850" strokeWidth="0.8" />
        <path d="M 138 260 Q 142 350 132 445 L 108 445 Q 106 350 106 260 Z"
          fill="url(#bodyGrad)" stroke="#1c3850" strokeWidth="0.8" />
        {/* Lower legs */}
        <path d="M 68 445 Q 64 490 72 520 L 90 520 Q 92 490 92 445 Z" fill="url(#bodyGrad)" stroke="#1c3850" strokeWidth="0.8" />
        <path d="M 132 445 Q 136 490 128 520 L 110 520 Q 108 490 108 445 Z" fill="url(#bodyGrad)" stroke="#1c3850" strokeWidth="0.8" />
      </g>

      {/* Muscles */}
      <g style={{ filter: 'drop-shadow(0 0 6px rgba(249,115,22,0))' }}>
        {Object.entries(muscles).map(([id, def], i) => {
          const lookupKey = def.key || id;
          const role = getRole(lookupKey);
          return <MuscleShape key={id} def={def} role={role} delay={(i % 7) * 0.15} />;
        })}
      </g>

      {/* Label for this view */}
      <text x="100" y="20" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="700" letterSpacing="2">
        {isBack ? 'BACK' : 'FRONT'}
      </text>
    </svg>
  );
}

export default function MuscleMapAnimated() {
  const presetNames = Object.keys(DEMO_PRESETS);
  const [preset, setPreset] = useState(presetNames[0]);
  const activation = DEMO_PRESETS[preset];

  return (
    <div>
      {/* Exercise selector */}
      <div className="muscle-preview-pills">
        {presetNames.map(p => (
          <button
            key={p}
            className={`muscle-preview-pill ${preset === p ? 'active' : ''}`}
            onClick={() => setPreset(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Body views */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
        <div style={{ aspectRatio: '200/540', maxHeight: 440 }}>
          <BodyView side="front" activation={activation} />
        </div>
        <div style={{ aspectRatio: '200/540', maxHeight: 440 }}>
          <BodyView side="back" activation={activation} />
        </div>
      </div>

      {/* Legend */}
      <div className="muscle-preview-legend">
        <span><span className="dot" style={{ background: PRIMARY }} /> Primary</span>
        <span><span className="dot" style={{ background: SECONDARY }} /> Secondary</span>
      </div>

      {/* Animation keyframes + classes */}
      <style>{`
        @keyframes muscle-breathe-primary {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px ${PRIMARY}); }
          50%      { transform: scale(1.04); filter: drop-shadow(0 0 12px ${PRIMARY}); }
        }
        @keyframes muscle-breathe-secondary {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 1px ${SECONDARY}); }
          50%      { transform: scale(1.02); filter: drop-shadow(0 0 6px ${SECONDARY}); }
        }
        .muscle-pulse-primary {
          animation: muscle-breathe-primary 2.2s ease-in-out infinite;
          transform-box: fill-box;
        }
        .muscle-pulse-secondary {
          animation: muscle-breathe-secondary 3s ease-in-out infinite;
          transform-box: fill-box;
        }
      `}</style>
    </div>
  );
}
