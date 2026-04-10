// Derives which muscle regions are activated by an exercise
function deriveMuscleTags(group, muscles) {
  const m = (muscles || '').toLowerCase();
  const primary = [];
  const secondary = [];

  switch (group) {
    case 'Chest':
      primary.push('chest');
      if (m.includes('tricep')) secondary.push('triceps');
      if (m.includes('delt') || m.includes('anterior')) secondary.push('frontDelt');
      break;
    case 'Back':
      primary.push('lats');
      if (m.includes('trap')) secondary.push('traps');
      if (m.includes('rhomboid') || m.includes('mid trap')) secondary.push('upperBack');
      if (m.includes('erector') || m.includes('lower')) secondary.push('lowerBack');
      if (m.includes('bicep')) secondary.push('biceps');
      if (m.includes('rear delt')) secondary.push('rearDelt');
      break;
    case 'Shoulders':
      if (m.includes('anterior') && !m.includes('posterior')) {
        primary.push('frontDelt');
      } else if (m.includes('posterior') || m.includes('rear')) {
        primary.push('rearDelt');
      } else {
        primary.push('frontDelt'); primary.push('rearDelt');
      }
      if (m.includes('tricep')) secondary.push('triceps');
      if (m.includes('trap')) secondary.push('traps');
      break;
    case 'Biceps':
      primary.push('biceps');
      if (m.includes('forearm') || m.includes('brachiorad')) secondary.push('forearms');
      break;
    case 'Triceps':
      primary.push('triceps');
      if (m.includes('chest') || m.includes('pec')) secondary.push('chest');
      if (m.includes('delt')) secondary.push('frontDelt');
      break;
    case 'Quads':
      primary.push('quads');
      if (m.includes('glute')) secondary.push('glutes');
      if (m.includes('hamstring')) secondary.push('hamstrings');
      break;
    case 'Hamstrings':
      primary.push('hamstrings');
      if (m.includes('glute')) secondary.push('glutes');
      if (m.includes('erector') || m.includes('lower back')) secondary.push('lowerBack');
      if (m.includes('calf') || m.includes('calves')) secondary.push('calves');
      break;
    case 'Glutes':
      primary.push('glutes');
      if (m.includes('hamstring')) secondary.push('hamstrings');
      if (m.includes('quad') || m.includes('adductor')) secondary.push('quads');
      break;
    case 'Calves':
      primary.push('calves');
      secondary.push('tibialis');
      break;
    case 'Core':
      primary.push('abs');
      if (m.includes('oblique')) primary.push('obliques');
      if (m.includes('erector') || m.includes('lower')) secondary.push('lowerBack');
      break;
    case 'Forearms':
      primary.push('forearms');
      if (m.includes('bicep')) secondary.push('biceps');
      break;
    case 'Traps':
      primary.push('traps');
      if (m.includes('rhomboid') || m.includes('mid')) secondary.push('upperBack');
      break;
    case 'Cardio':
      secondary.push('quads', 'hamstrings', 'calves', 'glutes');
      break;
    default: break;
  }
  return { primary: [...new Set(primary)], secondary: [...new Set(secondary)] };
}

// Display names for muscle keys
const MUSCLE_NAMES = {
  chest: 'Chest', lats: 'Lats', traps: 'Traps', upperBack: 'Upper Back',
  lowerBack: 'Lower Back', frontDelt: 'Front Delt', rearDelt: 'Rear Delt',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  abs: 'Abs', obliques: 'Obliques', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', tibialis: 'Tibialis',
};

// Label positions for front view muscles (x, y, anchor side)
const FRONT_LABEL_POS = {
  chest:    { x: 100, y: 118, side: 'center' },
  frontDelt:{ x: -18, y: 85, side: 'left' },
  biceps:   { x: -18, y: 150, side: 'left' },
  forearms: { x: -18, y: 240, side: 'left' },
  abs:      { x: 100, y: 184, side: 'center' },
  obliques: { x: 218, y: 195, side: 'right' },
  quads:    { x: 100, y: 375, side: 'center' },
  tibialis: { x: -12, y: 450, side: 'left' },
};

// Label positions for back view muscles
const BACK_LABEL_POS = {
  traps:     { x: 100, y: 78, side: 'center' },
  upperBack: { x: 100, y: 140, side: 'center' },
  lats:      { x: -18, y: 190, side: 'left' },
  rearDelt:  { x: 218, y: 85, side: 'right' },
  triceps:   { x: 218, y: 150, side: 'right' },
  forearms:  { x: 218, y: 240, side: 'right' },
  lowerBack: { x: 100, y: 272, side: 'center' },
  glutes:    { x: 100, y: 355, side: 'center' },
  hamstrings:{ x: -12, y: 408, side: 'left' },
  calves:    { x: 218, y: 458, side: 'right' },
};

// ── Muscle label with connecting line ────────────────────────────────────────
function MuscleLabel({ name, x, y, targetX, targetY, isPri, side }) {
  const color = isPri ? '#fb923c' : '#60a5fa';
  const bgColor = isPri ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.15)';
  const textAnchor = side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle';
  const fontSize = 7.5;
  const textW = name.length * 4.2 + 8;
  const rectX = side === 'left' ? x - textW : side === 'right' ? x : x - textW / 2;

  return (
    <g style={{ opacity: 0.92 }}>
      <line
        x1={targetX} y1={targetY} x2={x} y2={y}
        stroke={color} strokeWidth="0.5" strokeOpacity="0.5"
        strokeDasharray="2 2"
      />
      <circle cx={targetX} cy={targetY} r="2" fill={color} fillOpacity="0.7" />
      <rect
        x={rectX} y={y - 7} width={textW} height={13}
        rx="3" fill={bgColor} stroke={color} strokeWidth="0.4" strokeOpacity="0.5"
      />
      <text
        x={x} y={y + 2.5} fontSize={fontSize} fill={color}
        fontFamily="Inter, sans-serif" fontWeight="600" textAnchor={textAnchor}
        style={{ letterSpacing: '0.02em' }}
      >
        {name}
      </text>
    </g>
  );
}

// ── Muscle shape renderer ────────────────────────────────────────────────────
function Mus({ type = 'path', isPri, isSec, ...props }) {
  const active   = isPri || isSec;
  const fill     = isPri ? '#f97316' : isSec ? '#3b82f6' : '#0c1d2e';
  const fillOp   = isPri ? 0.88      : isSec ? 0.75      : 1;
  const stroke   = isPri ? '#fdba74' : isSec ? '#93c5fd' : '#1c3850';
  const sw       = active ? 1.4 : 0.6;
  const glowCol  = isPri ? '#f97316' : isSec ? '#3b82f6' : null;
  const filterId = isPri ? 'url(#primaryGlow)' : isSec ? 'url(#secondaryGlow)' : 'none';
  const style    = {
    transition: 'fill 0.4s ease, fill-opacity 0.4s ease, stroke 0.3s ease',
    filter: filterId,
  };
  const common = { fill, fillOpacity: fillOp, stroke, strokeWidth: sw, strokeLinejoin: 'round', style };
  if (type === 'path')    return <path    {...common} {...props} />;
  if (type === 'ellipse') return <ellipse {...common} {...props} />;
  if (type === 'circle')  return <circle  {...common} {...props} />;
  return null;
}

// ── SVG Definitions (gradients, filters, animations) ─────────────────────────
function SvgDefs() {
  return (
    <defs>
      {/* Background radial gradient */}
      <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stopColor="#0d1f35" />
        <stop offset="60%" stopColor="#080f1e" />
        <stop offset="100%" stopColor="#050a14" />
      </radialGradient>
      {/* Body silhouette gradient */}
      <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10243a" />
        <stop offset="50%" stopColor="#0b1a28" />
        <stop offset="100%" stopColor="#081420" />
      </linearGradient>
      {/* Primary muscle glow */}
      <filter id="primaryGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
        <feColorMatrix in="blur1" type="matrix"
          values="1 0 0 0 0.976  0 1 0 0 0.451  0 0 1 0 0.086  0 0 0 0.6 0" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {/* Secondary muscle glow (softer) */}
      <filter id="secondaryGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2" />
        <feColorMatrix in="blur2" type="matrix"
          values="0 0 1 0 0.231  0 0 1 0 0.510  0 0 1 0 0.965  0 0 0 0.4 0" result="glow2" />
        <feMerge>
          <feMergeNode in="glow2" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {/* Pulse animation for primary muscles */}
      <style>{`
        @keyframes musclePulse {
          0%, 100% { opacity: 0.88; }
          50% { opacity: 0.72; }
        }
      `}</style>
    </defs>
  );
}

// ── Body silhouette ──────────────────────────────────────────────────────────
function BodyShape() {
  return (
    <g fill="url(#bodyGrad)" stroke="#1e3a54" strokeWidth="1">
      {/* Head */}
      <circle cx="100" cy="33" r="26" />
      {/* Neck */}
      <path d="M 91,56 L 91,78 C 91,82 95,84 100,84 C 105,84 109,82 109,78 L 109,56 Z" />
      {/* Torso */}
      <path d="M 91,60 C 66,65 28,74 16,89 C 6,101 5,150 7,206 C 5,266 20,308 58,316 L 92,318 L 108,318 C 142,308 195,266 193,206 C 195,150 194,101 184,89 C 172,74 134,65 109,60 Z" />
      {/* Left upper arm */}
      <path d="M 4,93 C 0,110 0,156 4,186 C 5,193 17,195 21,190 C 23,182 23,130 20,102 C 20,94 10,89 4,93 Z" />
      {/* Right upper arm */}
      <path d="M 196,93 C 200,110 200,156 196,186 C 195,193 183,195 179,190 C 177,182 177,130 180,102 C 180,94 190,89 196,93 Z" />
      {/* Left forearm */}
      <path d="M 4,195 C 0,212 0,252 4,272 C 5,278 16,280 20,276 C 22,270 22,230 20,210 C 19,202 9,192 4,195 Z" />
      {/* Right forearm */}
      <path d="M 196,195 C 200,212 200,252 196,272 C 195,278 184,280 180,276 C 178,270 178,230 180,210 C 181,202 191,192 196,195 Z" />
      {/* Left thigh */}
      <path d="M 24,320 C 14,344 12,390 16,416 C 18,423 44,426 80,424 C 93,422 97,411 94,320 Z" />
      {/* Right thigh */}
      <path d="M 176,320 C 186,344 188,390 184,416 C 182,423 156,426 120,424 C 107,422 103,411 106,320 Z" />
      {/* Left lower leg */}
      <path d="M 18,419 C 12,442 14,466 22,474 C 30,480 56,482 78,480 C 88,476 90,464 88,419 Z" />
      {/* Right lower leg */}
      <path d="M 182,419 C 188,442 186,466 178,474 C 170,480 144,482 122,480 C 112,476 110,464 112,419 Z" />
    </g>
  );
}

// ── Front muscle regions ─────────────────────────────────────────────────────
function FrontMuscles({ pri, sec }) {
  const p = k => pri.has(k);
  const s = k => sec.has(k);
  return (
    <g>
      {/* Chest -- left pec */}
      <Mus isPri={p('chest')} isSec={s('chest')}
        d="M 42,92 C 26,103 21,128 31,152 C 42,163 70,163 84,153 C 93,143 91,114 86,99 C 76,86 55,83 42,92 Z" />
      {/* Chest -- right pec */}
      <Mus isPri={p('chest')} isSec={s('chest')}
        d="M 158,92 C 174,103 179,128 169,152 C 158,163 130,163 116,153 C 107,143 109,114 114,99 C 124,86 145,83 158,92 Z" />
      {/* Front deltoid -- left */}
      <Mus type="circle" isPri={p('frontDelt')} isSec={s('frontDelt')} cx="16" cy="97" r="20" />
      {/* Front deltoid -- right */}
      <Mus type="circle" isPri={p('frontDelt')} isSec={s('frontDelt')} cx="184" cy="97" r="20" />
      {/* Biceps -- left */}
      <Mus isPri={p('biceps')} isSec={s('biceps')}
        d="M 4,107 C 0,121 0,160 4,186 C 6,193 19,193 22,186 C 24,158 24,119 20,106 Z" />
      {/* Biceps -- right */}
      <Mus isPri={p('biceps')} isSec={s('biceps')}
        d="M 196,107 C 200,121 200,160 196,186 C 194,193 181,193 178,186 C 176,158 176,119 180,106 Z" />
      {/* Forearms -- left */}
      <Mus isPri={p('forearms')} isSec={s('forearms')}
        d="M 4,196 C 0,214 0,252 4,270 C 5,276 16,278 20,274 C 22,267 22,230 20,212 Z" />
      {/* Forearms -- right */}
      <Mus isPri={p('forearms')} isSec={s('forearms')}
        d="M 196,196 C 200,214 200,252 196,270 C 195,276 184,278 180,274 C 178,267 178,230 180,212 Z" />
      {/* Abs -- upper block */}
      <Mus type="ellipse" isPri={p('abs')} isSec={s('abs')} cx="100" cy="171" rx="22" ry="12" />
      {/* Abs -- lower block */}
      <Mus type="ellipse" isPri={p('abs')} isSec={s('abs')} cx="100" cy="198" rx="21" ry="13" />
      {/* Obliques -- left */}
      <Mus isPri={p('obliques')} isSec={s('obliques')}
        d="M 57,160 C 46,174 44,204 50,223 C 56,229 70,227 76,221 C 82,215 82,192 80,176 Z" />
      {/* Obliques -- right */}
      <Mus isPri={p('obliques')} isSec={s('obliques')}
        d="M 143,160 C 154,174 156,204 150,223 C 144,229 130,227 124,221 C 118,215 118,192 120,176 Z" />
      {/* Quads -- left */}
      <Mus isPri={p('quads')} isSec={s('quads')}
        d="M 26,328 C 15,352 13,394 17,418 C 20,424 44,426 79,424 C 93,422 96,410 92,328 Z" />
      {/* Quads -- right */}
      <Mus isPri={p('quads')} isSec={s('quads')}
        d="M 174,328 C 185,352 187,394 183,418 C 180,424 156,426 121,424 C 107,422 104,410 108,328 Z" />
      {/* Tibialis anterior -- left */}
      <Mus type="ellipse" isPri={p('tibialis')} isSec={s('tibialis')} cx="52" cy="450" rx="16" ry="26" />
      {/* Tibialis anterior -- right */}
      <Mus type="ellipse" isPri={p('tibialis')} isSec={s('tibialis')} cx="148" cy="450" rx="16" ry="26" />
    </g>
  );
}

// ── Front muscle labels ──────────────────────────────────────────────────────
function FrontLabels({ pri, sec }) {
  const active = [];
  // Target centers for connecting lines (approx center of each muscle region)
  const targets = {
    chest: { x: 100, y: 130 }, frontDelt: { x: 16, y: 97 },
    biceps: { x: 12, y: 150 }, forearms: { x: 12, y: 240 },
    abs: { x: 100, y: 184 }, obliques: { x: 150, y: 195 },
    quads: { x: 100, y: 375 }, tibialis: { x: 52, y: 450 },
  };
  Object.keys(FRONT_LABEL_POS).forEach(k => {
    const isPri = pri.has(k);
    const isSec = sec.has(k);
    if (isPri || isSec) {
      const lp = FRONT_LABEL_POS[k];
      const tp = targets[k] || lp;
      active.push(
        <MuscleLabel
          key={k} name={MUSCLE_NAMES[k]} isPri={isPri}
          x={lp.x} y={lp.y} targetX={tp.x} targetY={tp.y} side={lp.side}
        />
      );
    }
  });
  return <g>{active}</g>;
}

// ── Back muscle regions ──────────────────────────────────────────────────────
function BackMuscles({ pri, sec }) {
  const p = k => pri.has(k);
  const s = k => sec.has(k);
  return (
    <g>
      {/* Traps */}
      <Mus isPri={p('traps')} isSec={s('traps')}
        d="M 67,65 C 57,78 54,104 54,116 L 146,116 C 146,104 143,78 133,65 C 120,55 80,55 67,65 Z" />
      {/* Upper back / Rhomboids */}
      <Mus isPri={p('upperBack')} isSec={s('upperBack')}
        d="M 60,120 C 57,134 59,154 65,163 L 135,163 C 141,154 143,134 140,120 Z" />
      {/* Lats -- left */}
      <Mus isPri={p('lats')} isSec={s('lats')}
        d="M 25,116 C 11,156 9,212 15,244 C 21,264 45,272 68,270 C 78,250 76,194 72,161 Z" />
      {/* Lats -- right */}
      <Mus isPri={p('lats')} isSec={s('lats')}
        d="M 175,116 C 189,156 191,212 185,244 C 179,264 155,272 132,270 C 122,250 124,194 128,161 Z" />
      {/* Rear deltoid -- left */}
      <Mus type="circle" isPri={p('rearDelt')} isSec={s('rearDelt')} cx="16" cy="97" r="20" />
      {/* Rear deltoid -- right */}
      <Mus type="circle" isPri={p('rearDelt')} isSec={s('rearDelt')} cx="184" cy="97" r="20" />
      {/* Triceps -- left */}
      <Mus isPri={p('triceps')} isSec={s('triceps')}
        d="M 4,107 C 0,121 0,160 4,186 C 6,193 19,193 22,186 C 24,158 24,119 20,106 Z" />
      {/* Triceps -- right */}
      <Mus isPri={p('triceps')} isSec={s('triceps')}
        d="M 196,107 C 200,121 200,160 196,186 C 194,193 181,193 178,186 C 176,158 176,119 180,106 Z" />
      {/* Forearms -- left */}
      <Mus isPri={p('forearms')} isSec={s('forearms')}
        d="M 4,196 C 0,214 0,252 4,270 C 5,276 16,278 20,274 C 22,267 22,230 20,212 Z" />
      {/* Forearms -- right */}
      <Mus isPri={p('forearms')} isSec={s('forearms')}
        d="M 196,196 C 200,214 200,252 196,270 C 195,276 184,278 180,274 C 178,267 178,230 180,212 Z" />
      {/* Erectors / Lower back -- left */}
      <Mus isPri={p('lowerBack')} isSec={s('lowerBack')}
        d="M 80,248 C 74,262 74,284 80,296 C 84,303 96,303 98,296 C 100,284 100,264 95,250 Z" />
      {/* Erectors / Lower back -- right */}
      <Mus isPri={p('lowerBack')} isSec={s('lowerBack')}
        d="M 120,248 C 126,262 126,284 120,296 C 116,303 104,303 102,296 C 100,284 100,264 105,250 Z" />
      {/* Glutes -- left */}
      <Mus isPri={p('glutes')} isSec={s('glutes')}
        d="M 22,321 C 11,336 9,362 17,380 C 26,390 52,394 90,391 C 100,384 100,352 94,321 Z" />
      {/* Glutes -- right */}
      <Mus isPri={p('glutes')} isSec={s('glutes')}
        d="M 178,321 C 189,336 191,362 183,380 C 174,390 148,394 110,391 C 100,384 100,352 106,321 Z" />
      {/* Hamstrings -- left */}
      <Mus isPri={p('hamstrings')} isSec={s('hamstrings')}
        d="M 20,383 C 12,399 12,418 18,428 C 24,434 50,436 78,434 C 88,428 90,416 88,383 Z" />
      {/* Hamstrings -- right */}
      <Mus isPri={p('hamstrings')} isSec={s('hamstrings')}
        d="M 180,383 C 188,399 188,418 182,428 C 176,434 150,436 122,434 C 112,428 110,416 112,383 Z" />
      {/* Calves -- left */}
      <Mus isPri={p('calves')} isSec={s('calves')}
        d="M 18,432 C 12,450 14,468 22,476 C 30,482 56,484 78,482 C 88,478 90,466 88,432 Z" />
      {/* Calves -- right */}
      <Mus isPri={p('calves')} isSec={s('calves')}
        d="M 182,432 C 188,450 186,468 178,476 C 170,482 144,484 122,482 C 112,478 110,466 112,432 Z" />
    </g>
  );
}

// ── Back muscle labels ───────────────────────────────────────────────────────
function BackLabels({ pri, sec }) {
  const active = [];
  const targets = {
    traps: { x: 100, y: 90 }, upperBack: { x: 100, y: 140 },
    lats: { x: 40, y: 200 }, rearDelt: { x: 184, y: 97 },
    triceps: { x: 188, y: 150 }, forearms: { x: 188, y: 240 },
    lowerBack: { x: 100, y: 272 }, glutes: { x: 100, y: 355 },
    hamstrings: { x: 50, y: 408 }, calves: { x: 150, y: 458 },
  };
  Object.keys(BACK_LABEL_POS).forEach(k => {
    const isPri = pri.has(k);
    const isSec = sec.has(k);
    if (isPri || isSec) {
      const lp = BACK_LABEL_POS[k];
      const tp = targets[k] || lp;
      active.push(
        <MuscleLabel
          key={k} name={MUSCLE_NAMES[k]} isPri={isPri}
          x={lp.x} y={lp.y} targetX={tp.x} targetY={tp.y} side={lp.side}
        />
      );
    }
  });
  return <g>{active}</g>;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MuscleMap({ workouts = [] }) {
  const allPrimary = new Set();
  const allSecondary = new Set();

  workouts.forEach(w => {
    const { primary, secondary } = deriveMuscleTags(w.group || '', w.muscles || '');
    primary.forEach(m => allPrimary.add(m));
    secondary.forEach(m => { if (!allPrimary.has(m)) allSecondary.add(m); });
  });

  const pri = allPrimary;
  const sec = allSecondary;
  const hasActivity = pri.size > 0 || sec.size > 0;
  const totalGroups = pri.size + sec.size;

  const containerStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '1rem',
    marginBottom: '0.75rem',
  };

  const headerStyle = {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    marginBottom: '0.75rem',
  };

  const h3Style = {
    margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700,
  };

  const emptyStyle = {
    fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic',
  };

  const bodyStyle = {
    display: 'flex', gap: '0.75rem', justifyContent: 'center',
    flexWrap: 'wrap',
  };

  const viewStyle = {
    flex: '1 1 140px', maxWidth: '170px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
  };

  const viewLabelStyle = {
    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: 'var(--text-muted)',
  };

  // Legend styles
  const legendStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '16px', marginTop: '0.75rem', paddingTop: '0.6rem',
    borderTop: '1px solid var(--border)',
  };

  const legendItemStyle = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '0.72rem', color: 'var(--text-secondary)',
  };

  const dotBase = {
    width: '10px', height: '10px', borderRadius: '50%',
    display: 'inline-block', flexShrink: 0,
  };

  // Stats section styles
  const statsStyle = {
    marginTop: '0.75rem', paddingTop: '0.6rem',
    borderTop: '1px solid var(--border)',
  };

  const statsCountStyle = {
    fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem',
    textAlign: 'center',
  };

  const pillContainerStyle = {
    display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center',
  };

  const pillStyle = (isPrimary) => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: '10px',
    fontSize: '0.68rem', fontWeight: 600,
    letterSpacing: '0.02em',
    background: isPrimary ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.12)',
    color: isPrimary ? '#fb923c' : '#93c5fd',
    border: `1px solid ${isPrimary ? 'rgba(249, 115, 22, 0.3)' : 'rgba(59, 130, 246, 0.25)'}`,
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={h3Style}>Muscles Worked</h3>
        {!hasActivity && <span style={emptyStyle}>Log exercises to see activation</span>}
      </div>

      <div style={bodyStyle}>
        {/* Front view */}
        <div style={viewStyle}>
          <div style={viewLabelStyle}>Front</div>
          <svg viewBox="-25 0 250 500" width="100%" style={{ display: 'block' }}>
            <SvgDefs />
            <rect x="-25" y="0" width="250" height="500" fill="url(#bgGrad)" />
            {/* Subtle grid overlay */}
            <g opacity="0.04" stroke="#4a9eff" strokeWidth="0.5">
              {Array.from({ length: 10 }, (_, i) => (
                <line key={`hg-${i}`} x1="-25" y1={i * 50} x2="225" y2={i * 50} />
              ))}
              {Array.from({ length: 6 }, (_, i) => (
                <line key={`vg-${i}`} x1={-25 + i * 50} y1="0" x2={-25 + i * 50} y2="500" />
              ))}
            </g>
            <BodyShape />
            <FrontMuscles pri={pri} sec={sec} />
            <FrontLabels pri={pri} sec={sec} />
          </svg>
        </div>

        {/* Back view */}
        <div style={viewStyle}>
          <div style={viewLabelStyle}>Back</div>
          <svg viewBox="-25 0 250 500" width="100%" style={{ display: 'block' }}>
            <SvgDefs />
            <rect x="-25" y="0" width="250" height="500" fill="url(#bgGrad)" />
            <g opacity="0.04" stroke="#4a9eff" strokeWidth="0.5">
              {Array.from({ length: 10 }, (_, i) => (
                <line key={`hg-${i}`} x1="-25" y1={i * 50} x2="225" y2={i * 50} />
              ))}
              {Array.from({ length: 6 }, (_, i) => (
                <line key={`vg-${i}`} x1={-25 + i * 50} y1="0" x2={-25 + i * 50} y2="500" />
              ))}
            </g>
            <BodyShape />
            <BackMuscles pri={pri} sec={sec} />
            <BackLabels pri={pri} sec={sec} />
          </svg>
        </div>
      </div>

      {/* Enhanced legend */}
      <div style={legendStyle}>
        <div style={legendItemStyle}>
          <span style={{ ...dotBase, background: '#f97316', boxShadow: '0 0 6px rgba(249,115,22,0.5)' }} />
          Primary
        </div>
        <div style={legendItemStyle}>
          <span style={{ ...dotBase, background: '#3b82f6', boxShadow: '0 0 6px rgba(59,130,246,0.4)' }} />
          Secondary
        </div>
        <div style={legendItemStyle}>
          <span style={{ ...dotBase, background: '#0c1d2e', border: '1px solid #1c3850' }} />
          Inactive
        </div>
      </div>

      {/* Muscle stats section */}
      {hasActivity && (
        <div style={statsStyle}>
          <div style={statsCountStyle}>
            <strong style={{ color: 'var(--text-primary)' }}>{totalGroups}</strong> muscle group{totalGroups !== 1 ? 's' : ''} targeted
          </div>
          <div style={pillContainerStyle}>
            {[...pri].map(k => (
              <span key={k} style={pillStyle(true)}>{MUSCLE_NAMES[k] || k}</span>
            ))}
            {[...sec].map(k => (
              <span key={k} style={pillStyle(false)}>{MUSCLE_NAMES[k] || k}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
