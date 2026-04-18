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

// Label positions for front view
const FRONT_LABEL_POS = {
  chest:    { x: 100, y: 108, side: 'center' },
  frontDelt:{ x: -22, y: 96, side: 'left' },
  biceps:   { x: -22, y: 160, side: 'left' },
  forearms: { x: -22, y: 254, side: 'left' },
  abs:      { x: 222, y: 194, side: 'right' },
  obliques: { x: -22, y: 208, side: 'left' },
  quads:    { x: 222, y: 400, side: 'right' },
  tibialis: { x: -20, y: 504, side: 'left' },
};

// Label positions for back view
const BACK_LABEL_POS = {
  traps:     { x: -22, y: 100, side: 'left' },
  upperBack: { x: 222, y: 178, side: 'right' },
  lats:      { x: 222, y: 214, side: 'right' },
  rearDelt:  { x: -22, y: 110, side: 'left' },
  triceps:   { x: 222, y: 160, side: 'right' },
  forearms:  { x: 222, y: 254, side: 'right' },
  lowerBack: { x: -22, y: 276, side: 'left' },
  glutes:    { x: 222, y: 336, side: 'right' },
  hamstrings:{ x: -20, y: 418, side: 'left' },
  calves:    { x: 222, y: 500, side: 'right' },
};

// ── Muscle label with connecting line ────────────────────────────────────────
function MuscleLabel({ name, x, y, targetX, targetY, isPri, side }) {
  const color = isPri ? '#fb923c' : '#60a5fa';
  const bgColor = isPri ? 'rgba(249, 115, 22, 0.18)' : 'rgba(59, 130, 246, 0.18)';
  const textAnchor = side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle';
  const fontSize = 7.5;
  const textW = name.length * 4.2 + 10;
  const rectX = side === 'left' ? x - textW : side === 'right' ? x : x - textW / 2;

  return (
    <g style={{ opacity: 0.95 }}>
      <line
        x1={targetX} y1={targetY} x2={x} y2={y}
        stroke={color} strokeWidth="0.5" strokeOpacity="0.55"
        strokeDasharray="2 2"
      />
      <circle cx={targetX} cy={targetY} r="1.8" fill={color} fillOpacity="0.85" />
      <rect
        x={rectX} y={y - 7} width={textW} height={13}
        rx="3" fill={bgColor} stroke={color} strokeWidth="0.5" strokeOpacity="0.6"
      />
      <text
        x={side === 'left' ? x - 5 : side === 'right' ? x + 5 : x}
        y={y + 2.5} fontSize={fontSize} fill={color}
        fontFamily="Inter, sans-serif" fontWeight="700" textAnchor={textAnchor}
        style={{ letterSpacing: '0.03em' }}
      >
        {name}
      </text>
    </g>
  );
}

// ── Muscle renderer ──────────────────────────────────────────────────────────
function Mus({ type = 'path', isPri, isSec, ...props }) {
  const active   = isPri || isSec;
  const fill     = isPri ? 'url(#priGrad)' : isSec ? 'url(#secGrad)' : 'url(#muscleRest)';
  const stroke   = isPri ? '#fed7aa' : isSec ? '#bfdbfe' : '#1c3a55';
  const sw       = active ? 0.7 : 0.45;
  const filterId = isPri ? 'url(#primaryGlow)' : isSec ? 'url(#secondaryGlow)' : 'none';
  const style    = {
    transition: 'fill 0.45s ease, stroke 0.3s ease, filter 0.3s ease',
    filter: filterId,
  };
  const common = { fill, stroke, strokeWidth: sw, strokeLinejoin: 'round', strokeLinecap: 'round', style };
  if (type === 'path')    return <path    {...common} {...props} />;
  if (type === 'ellipse') return <ellipse {...common} {...props} />;
  if (type === 'circle')  return <circle  {...common} {...props} />;
  return null;
}

// Muscle-fiber striation line
function Stri({ d, isPri, isSec }) {
  const color = isPri ? '#fcd9b6' : isSec ? '#c7dcfb' : '#20405e';
  const op = isPri || isSec ? 0.5 : 0.42;
  return <path d={d} fill="none" stroke={color} strokeWidth="0.35" strokeOpacity={op} strokeLinecap="round" />;
}

// ── SVG defs: gradients + glow filters ───────────────────────────────────────
function SvgDefs() {
  return (
    <defs>
      <radialGradient id="bgGrad" cx="50%" cy="38%" r="70%">
        <stop offset="0%"  stopColor="#0e2339" />
        <stop offset="55%" stopColor="#081327" />
        <stop offset="100%" stopColor="#040912" />
      </radialGradient>
      <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stopColor="#15304b" />
        <stop offset="45%" stopColor="#0c1f34" />
        <stop offset="100%" stopColor="#061021" />
      </linearGradient>
      <linearGradient id="muscleRest" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stopColor="#1e3d5c" />
        <stop offset="50%" stopColor="#0f2540" />
        <stop offset="100%" stopColor="#061222" />
      </linearGradient>
      {/* Muscle highlight — top sheen for anatomical form */}
      <linearGradient id="muscleHilight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stopColor="rgba(100,160,220,0.25)" />
        <stop offset="40%" stopColor="rgba(100,160,220,0)" />
      </linearGradient>
      <linearGradient id="priGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stopColor="#fed7aa" />
        <stop offset="35%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#b4430a" />
      </linearGradient>
      <linearGradient id="secGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stopColor="#dbeafe" />
        <stop offset="35%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#1e40af" />
      </linearGradient>
      <filter id="primaryGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur1" />
        <feColorMatrix in="blur1" type="matrix"
          values="1 0 0 0 0.976  0 1 0 0 0.451  0 0 1 0 0.086  0 0 0 0.8 0" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="secondaryGlow" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="blur2" />
        <feColorMatrix in="blur2" type="matrix"
          values="0 0 1 0 0.231  0 0 1 0 0.510  0 0 1 0 0.965  0 0 0 0.55 0" result="glow2" />
        <feMerge>
          <feMergeNode in="glow2" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ── Anatomical body silhouette ───────────────────────────────────────────────
function BodyShape() {
  return (
    <g>
      <g fill="url(#bodyGrad)" stroke="#244566" strokeWidth="0.9" strokeLinejoin="round">
        {/* Head — refined skull with jaw taper and brow ridge */}
        <path d="M 100,4
          C 84,4 74,16 72,32
          C 70,42 72,54 76,62
          C 78,66 81,70 84,72
          L 86,80
          C 86,83 88,86 92,88
          C 94,89 97,89 100,89
          C 103,89 106,89 108,88
          C 112,86 114,83 114,80
          L 116,72
          C 119,70 122,66 124,62
          C 128,54 130,42 128,32
          C 126,16 116,4 100,4 Z" />
        {/* Neck + trap rise — blends smoothly into shoulders */}
        <path d="M 88,80 L 88,92
          C 86,96 80,99 72,102
          C 62,104 52,108 44,112
          L 156,112
          C 148,108 138,104 128,102
          C 120,99 114,96 112,92
          L 112,80 Z" />
        {/* Torso */}
        <path d="M 70,102
          C 50,104 32,108 22,114
          C 12,113 8,122 8,134
          L 8,150
          C 8,164 10,176 12,186
          C 14,196 16,210 18,224
          L 18,242
          C 18,258 22,272 28,284
          C 32,296 36,308 40,320
          C 42,330 44,338 48,346
          C 52,352 58,356 66,356
          L 134,356
          C 142,356 148,352 152,346
          C 156,338 158,330 160,320
          C 164,308 168,296 172,284
          C 178,272 182,258 182,242
          L 182,224
          C 184,210 186,196 188,186
          C 190,176 192,164 192,150
          L 192,134
          C 192,122 188,115 178,112
          C 168,108 150,104 130,102
          C 120,101 110,102 100,102
          C 90,102 80,102 70,102 Z" />
        {/* L upper arm */}
        <path d="M 20,100
          C 10,103 4,112 2,124
          C 0,138 0,156 2,176
          C 2,192 4,208 8,222
          C 10,230 16,234 22,232
          C 28,228 32,220 34,210
          C 36,196 36,180 36,164
          C 36,146 34,128 32,114
          C 30,106 26,101 20,100 Z" />
        {/* R upper arm */}
        <path d="M 180,100
          C 190,103 196,112 198,124
          C 200,138 200,156 198,176
          C 198,192 196,208 192,222
          C 190,230 184,234 178,232
          C 172,228 168,220 166,210
          C 164,196 164,180 164,164
          C 164,146 166,128 168,114
          C 170,106 174,101 180,100 Z" />
        {/* L forearm */}
        <path d="M 8,222
          C 4,240 2,264 4,284
          C 6,298 10,308 16,312
          C 20,314 26,312 30,306
          C 32,298 32,282 32,266
          C 32,250 30,236 28,226
          C 26,220 22,218 16,218
          C 12,218 10,220 8,222 Z" />
        {/* R forearm */}
        <path d="M 192,222
          C 196,240 198,264 196,284
          C 194,298 190,308 184,312
          C 180,314 174,312 170,306
          C 168,298 168,282 168,266
          C 168,250 170,236 172,226
          C 174,220 178,218 184,218
          C 188,218 190,220 192,222 Z" />
        {/* Hands — closed fists with thumb + knuckle suggestion */}
        <path d="M 4,318
          C 2,326 4,336 10,340
          C 18,342 26,340 30,334
          C 32,326 32,318 30,312
          C 26,310 18,310 12,312
          C 8,314 5,316 4,318 Z" />
        <path d="M 196,318
          C 198,326 196,336 190,340
          C 182,342 174,340 170,334
          C 168,326 168,318 170,312
          C 174,310 182,310 188,312
          C 192,314 195,316 196,318 Z" />
        {/* L thigh */}
        <path d="M 46,344
          C 36,356 30,378 28,404
          C 26,428 26,452 30,472
          C 34,478 44,480 56,478
          C 70,476 82,470 86,462
          C 88,454 88,440 88,420
          C 88,396 90,372 92,352
          C 90,344 86,340 80,340
          L 52,340 C 48,340 46,342 46,344 Z" />
        {/* R thigh */}
        <path d="M 154,344
          C 164,356 170,378 172,404
          C 174,428 174,452 170,472
          C 166,478 156,480 144,478
          C 130,476 118,470 114,462
          C 112,454 112,440 112,420
          C 112,396 110,372 108,352
          C 110,344 114,340 120,340
          L 148,340 C 152,340 154,342 154,344 Z" />
        {/* L lower leg */}
        <path d="M 30,475
          C 22,496 22,516 26,528
          C 30,536 46,540 62,538
          C 76,536 84,532 86,526
          C 88,518 88,506 86,490
          C 84,480 82,474 80,470
          C 70,474 50,474 30,475 Z" />
        {/* R lower leg */}
        <path d="M 170,475
          C 178,496 178,516 174,528
          C 170,536 154,540 138,538
          C 124,536 116,532 114,526
          C 112,518 112,506 114,490
          C 116,480 118,474 120,470
          C 130,474 150,474 170,475 Z" />
        {/* L foot — narrow, slightly pointed toe */}
        <path d="M 38,538
          C 32,540 28,548 32,556
          C 36,560 56,560 66,558
          C 70,554 70,548 68,544
          C 62,540 48,538 38,538 Z" />
        {/* R foot — narrow, slightly pointed toe */}
        <path d="M 162,538
          C 168,540 172,548 168,556
          C 164,560 144,560 134,558
          C 130,554 130,548 132,544
          C 138,540 152,538 162,538 Z" />
      </g>

      {/* ── Subtle anatomical refinement lines — always visible, blend over activations ── */}
      <g fill="none" stroke="#3a5a7c" strokeWidth="0.35" strokeOpacity="0.6" strokeLinecap="round" pointerEvents="none">
        {/* Centerline highlight — hairline glint down the middle (linea alba) */}
        <path d="M 100,104 L 100,270" stroke="#4a7aa8" strokeOpacity="0.18" strokeWidth="0.6" />
        {/* Clavicle suggestion — two subtle lines from sternum to shoulders */}
        <path d="M 100,108 C 84,114 70,116 54,118" />
        <path d="M 100,108 C 116,114 130,116 146,118" />
        {/* Sternum notch */}
        <circle cx="100" cy="108" r="1.2" fill="#4a7aa8" fillOpacity="0.3" stroke="none" />
      </g>

      {/* ── Soft ground shadow beneath feet ── */}
      <ellipse cx="100" cy="576" rx="92" ry="5" fill="#000" opacity="0.35" pointerEvents="none" />
    </g>
  );
}

// ── Front muscles ────────────────────────────────────────────────────────────
function FrontMuscles({ pri, sec }) {
  const p = k => pri.has(k);
  const s = k => sec.has(k);

  return (
    <g>
      {/* Sternocleidomastoid (decorative) */}
      <path d="M 93,78 C 91,84 90,90 92,95 L 97,95 C 96,90 96,84 95,78 Z"
        fill="url(#muscleRest)" stroke="#1c3a55" strokeWidth="0.35" />
      <path d="M 107,78 C 109,84 110,90 108,95 L 103,95 C 104,90 104,84 105,78 Z"
        fill="url(#muscleRest)" stroke="#1c3a55" strokeWidth="0.35" />

      {/* ══ CHEST ── pec: clavicular + sternocostal heads (L & R) ══ */}
      <Mus isPri={p('chest')} isSec={s('chest')}
        d="M 50,98 C 42,102 36,112 34,122 C 34,128 38,132 46,132 L 92,132
           C 96,130 98,126 96,120 C 94,110 88,102 80,98 C 72,94 58,94 50,98 Z" />
      <Mus isPri={p('chest')} isSec={s('chest')}
        d="M 36,124 C 32,136 32,148 36,158 C 44,164 72,164 88,158
           C 94,154 96,146 96,138 L 96,128 C 90,132 60,134 40,132
           C 38,130 37,126 36,124 Z" />
      <Mus isPri={p('chest')} isSec={s('chest')}
        d="M 150,98 C 158,102 164,112 166,122 C 166,128 162,132 154,132 L 108,132
           C 104,130 102,126 104,120 C 106,110 112,102 120,98 C 128,94 142,94 150,98 Z" />
      <Mus isPri={p('chest')} isSec={s('chest')}
        d="M 164,124 C 168,136 168,148 164,158 C 156,164 128,164 112,158
           C 106,154 104,146 104,138 L 104,128 C 110,132 140,134 160,132
           C 162,130 163,126 164,124 Z" />
      <Stri d="M 42,116 C 56,120 78,122 92,120" isPri={p('chest')} isSec={s('chest')} />
      <Stri d="M 158,116 C 144,120 122,122 108,120" isPri={p('chest')} isSec={s('chest')} />
      <Stri d="M 46,140 C 62,148 82,150 92,146" isPri={p('chest')} isSec={s('chest')} />
      <Stri d="M 154,140 C 138,148 118,150 108,146" isPri={p('chest')} isSec={s('chest')} />

      {/* ══ FRONT DELTOID — sits atop upper arm as a shoulder cap ══ */}
      <Mus isPri={p('frontDelt')} isSec={s('frontDelt')}
        d="M 30,100 C 20,102 12,110 10,124
           C 10,132 14,138 22,138
           C 30,136 36,130 40,120
           C 42,110 40,102 36,100
           C 34,98 32,98 30,100 Z" />
      <Stri d="M 16,114 C 22,120 30,124 36,122" isPri={p('frontDelt')} isSec={s('frontDelt')} />
      <Stri d="M 20,122 C 26,128 34,130 38,128" isPri={p('frontDelt')} isSec={s('frontDelt')} />
      <Mus isPri={p('frontDelt')} isSec={s('frontDelt')}
        d="M 170,100 C 180,102 188,110 190,124
           C 190,132 186,138 178,138
           C 170,136 164,130 160,120
           C 158,110 160,102 164,100
           C 166,98 168,98 170,100 Z" />
      <Stri d="M 184,114 C 178,120 170,124 164,122" isPri={p('frontDelt')} isSec={s('frontDelt')} />
      <Stri d="M 180,122 C 174,128 166,130 162,128" isPri={p('frontDelt')} isSec={s('frontDelt')} />

      {/* ══ BICEPS — fills upper arm, two-head striations ══ */}
      <Mus isPri={p('biceps')} isSec={s('biceps')}
        d="M 20,100 C 10,103 4,112 2,124 C 0,138 0,156 2,176
           C 2,192 4,208 8,222 C 10,230 16,234 22,232
           C 28,228 32,220 34,210 C 36,196 36,180 36,164
           C 36,146 34,128 32,114 C 30,106 26,101 20,100 Z" />
      <Stri d="M 12,130 C 14,160 16,190 20,222" isPri={p('biceps')} isSec={s('biceps')} />
      <Stri d="M 28,130 C 30,160 30,190 28,222" isPri={p('biceps')} isSec={s('biceps')} />
      <Mus isPri={p('biceps')} isSec={s('biceps')}
        d="M 180,100 C 190,103 196,112 198,124 C 200,138 200,156 198,176
           C 198,192 196,208 192,222 C 190,230 184,234 178,232
           C 172,228 168,220 166,210 C 164,196 164,180 164,164
           C 164,146 166,128 168,114 C 170,106 174,101 180,100 Z" />
      <Stri d="M 188,130 C 186,160 184,190 180,222" isPri={p('biceps')} isSec={s('biceps')} />
      <Stri d="M 172,130 C 170,160 170,190 172,222" isPri={p('biceps')} isSec={s('biceps')} />

      {/* ══ FOREARMS ══ */}
      <Mus isPri={p('forearms')} isSec={s('forearms')}
        d="M 8,222 C 4,240 2,264 4,284 C 6,298 10,308 16,312
           C 20,314 26,312 30,306 C 32,298 32,282 32,266
           C 32,250 30,236 28,226 C 26,220 22,218 16,218
           C 12,218 10,220 8,222 Z" />
      <Stri d="M 14,234 C 16,258 18,284 20,300" isPri={p('forearms')} isSec={s('forearms')} />
      <Stri d="M 24,234 C 26,258 26,284 24,300" isPri={p('forearms')} isSec={s('forearms')} />
      <Mus isPri={p('forearms')} isSec={s('forearms')}
        d="M 192,222 C 196,240 198,264 196,284 C 194,298 190,308 184,312
           C 180,314 174,312 170,306 C 168,298 168,282 168,266
           C 168,250 170,236 172,226 C 174,220 178,218 184,218
           C 188,218 190,220 192,222 Z" />
      <Stri d="M 186,234 C 184,258 182,284 180,300" isPri={p('forearms')} isSec={s('forearms')} />
      <Stri d="M 176,234 C 174,258 174,284 176,300" isPri={p('forearms')} isSec={s('forearms')} />

      {/* Serratus anterior (decorative teeth) */}
      <g fill="url(#muscleRest)" stroke="#1c3a55" strokeWidth="0.3" opacity="0.85">
        <path d="M 32,148 C 35,152 35,158 32,162 Z" />
        <path d="M 32,164 C 35,168 35,174 32,178 Z" />
        <path d="M 32,180 C 35,184 35,190 32,194 Z" />
        <path d="M 168,148 C 165,152 165,158 168,162 Z" />
        <path d="M 168,164 C 165,168 165,174 168,178 Z" />
        <path d="M 168,180 C 165,184 165,190 168,194 Z" />
      </g>

      {/* ══ ABS — 6-pack + lower triangle ══ */}
      <Mus isPri={p('abs')} isSec={s('abs')}
        d="M 84,160 C 80,164 80,176 82,184 C 86,188 96,188 98,184 L 98,162 C 94,158 88,158 84,160 Z" />
      <Mus isPri={p('abs')} isSec={s('abs')}
        d="M 116,160 C 120,164 120,176 118,184 C 114,188 104,188 102,184 L 102,162 C 106,158 112,158 116,160 Z" />
      <Mus isPri={p('abs')} isSec={s('abs')}
        d="M 82,188 C 78,192 78,204 80,212 C 84,216 96,216 98,212 L 98,190 C 94,186 86,186 82,188 Z" />
      <Mus isPri={p('abs')} isSec={s('abs')}
        d="M 118,188 C 122,192 122,204 120,212 C 116,216 104,216 102,212 L 102,190 C 106,186 114,186 118,188 Z" />
      <Mus isPri={p('abs')} isSec={s('abs')}
        d="M 80,216 C 76,220 76,232 78,240 C 82,244 96,244 98,240 L 98,218 C 94,214 84,214 80,216 Z" />
      <Mus isPri={p('abs')} isSec={s('abs')}
        d="M 120,216 C 124,220 124,232 122,240 C 118,244 104,244 102,240 L 102,218 C 106,214 116,214 120,216 Z" />
      <Mus isPri={p('abs')} isSec={s('abs')}
        d="M 82,244 C 86,258 94,268 100,270 C 106,268 114,258 118,244 C 112,248 88,248 82,244 Z" />

      {/* ══ OBLIQUES ══ */}
      <Mus isPri={p('obliques')} isSec={s('obliques')}
        d="M 50,158 C 44,174 42,200 46,228 C 50,238 62,240 74,234
           C 78,226 78,200 76,178 C 72,168 64,160 54,156 C 52,156 51,157 50,158 Z" />
      <Stri d="M 52,174 C 58,186 68,196 76,202" isPri={p('obliques')} isSec={s('obliques')} />
      <Stri d="M 48,200 C 56,210 66,218 76,224" isPri={p('obliques')} isSec={s('obliques')} />
      <Mus isPri={p('obliques')} isSec={s('obliques')}
        d="M 150,158 C 156,174 158,200 154,228 C 150,238 138,240 126,234
           C 122,226 122,200 124,178 C 128,168 136,160 146,156 C 148,156 149,157 150,158 Z" />
      <Stri d="M 148,174 C 142,186 132,196 124,202" isPri={p('obliques')} isSec={s('obliques')} />
      <Stri d="M 152,200 C 144,210 134,218 124,224" isPri={p('obliques')} isSec={s('obliques')} />

      {/* ══ QUADS — fills thigh, with VL/RF/VM striations ══ */}
      <Mus isPri={p('quads')} isSec={s('quads')}
        d="M 46,344 C 36,356 30,378 28,404 C 26,428 26,452 30,472
           C 34,478 44,480 56,478 C 70,476 82,470 86,462
           C 88,454 88,440 88,420 C 88,396 90,372 92,352
           C 90,344 86,340 80,340 L 52,340 C 48,340 46,342 46,344 Z" />
      <Stri d="M 42,370 C 42,410 44,450 48,470" isPri={p('quads')} isSec={s('quads')} />
      <Stri d="M 60,364 C 60,400 62,440 64,470" isPri={p('quads')} isSec={s('quads')} />
      <Stri d="M 78,364 C 78,400 80,440 80,470" isPri={p('quads')} isSec={s('quads')} />
      {/* VM teardrop accent near knee */}
      <Mus isPri={p('quads')} isSec={s('quads')}
        d="M 78,440 C 78,452 80,464 84,470 C 88,472 90,468 90,462
           C 90,454 86,444 82,438 C 80,436 79,437 78,440 Z" />
      <Mus isPri={p('quads')} isSec={s('quads')}
        d="M 154,344 C 164,356 170,378 172,404 C 174,428 174,452 170,472
           C 166,478 156,480 144,478 C 130,476 118,470 114,462
           C 112,454 112,440 112,420 C 112,396 110,372 108,352
           C 110,344 114,340 120,340 L 148,340 C 152,340 154,342 154,344 Z" />
      <Stri d="M 158,370 C 158,410 156,450 152,470" isPri={p('quads')} isSec={s('quads')} />
      <Stri d="M 140,364 C 140,400 138,440 136,470" isPri={p('quads')} isSec={s('quads')} />
      <Stri d="M 122,364 C 122,400 120,440 120,470" isPri={p('quads')} isSec={s('quads')} />
      <Mus isPri={p('quads')} isSec={s('quads')}
        d="M 122,440 C 122,452 120,464 116,470 C 112,472 110,468 110,462
           C 110,454 114,444 118,438 C 120,436 121,437 122,440 Z" />

      {/* Kneecaps — sit at the seam between thigh and shin */}
      <ellipse cx="58" cy="472" rx="9" ry="5" fill="url(#muscleRest)" stroke="#2e4d6b" strokeWidth="0.5" />
      <ellipse cx="142" cy="472" rx="9" ry="5" fill="url(#muscleRest)" stroke="#2e4d6b" strokeWidth="0.5" />

      {/* ══ TIBIALIS — fills lower leg ══ */}
      <Mus isPri={p('tibialis')} isSec={s('tibialis')}
        d="M 30,475 C 22,496 22,516 26,528 C 30,536 46,540 62,538
           C 76,536 84,532 86,526 C 88,518 88,506 86,490
           C 84,480 82,474 80,470 C 70,474 50,474 30,475 Z" />
      <Stri d="M 46,490 C 48,510 50,525 52,532" isPri={p('tibialis')} isSec={s('tibialis')} />
      <Stri d="M 62,488 C 62,508 62,524 62,532" isPri={p('tibialis')} isSec={s('tibialis')} />
      <Mus isPri={p('tibialis')} isSec={s('tibialis')}
        d="M 170,475 C 178,496 178,516 174,528 C 170,536 154,540 138,538
           C 124,536 116,532 114,526 C 112,518 112,506 114,490
           C 116,480 118,474 120,470 C 130,474 150,474 170,475 Z" />
      <Stri d="M 154,490 C 152,510 150,525 148,532" isPri={p('tibialis')} isSec={s('tibialis')} />
      <Stri d="M 138,488 C 138,508 138,524 138,532" isPri={p('tibialis')} isSec={s('tibialis')} />
    </g>
  );
}

// ── Back muscles ─────────────────────────────────────────────────────────────
function BackMuscles({ pri, sec }) {
  const p = k => pri.has(k);
  const s = k => sec.has(k);

  return (
    <g>
      {/* ══ TRAPEZIUS — upper + mid diamond ══ */}
      <Mus isPri={p('traps')} isSec={s('traps')}
        d="M 100,82 C 90,84 80,92 72,104 C 66,114 62,124 60,132
           L 140,132 C 138,124 134,114 128,104 C 120,92 110,84 100,82 Z" />
      <Mus isPri={p('traps')} isSec={s('traps')}
        d="M 62,132 C 60,142 62,156 68,164 L 132,164 C 138,156 140,142 138,132 Z" />
      <Stri d="M 100,88 C 90,100 82,115 76,128" isPri={p('traps')} isSec={s('traps')} />
      <Stri d="M 100,88 C 110,100 118,115 124,128" isPri={p('traps')} isSec={s('traps')} />
      <Stri d="M 68,148 C 84,152 116,152 132,148" isPri={p('traps')} isSec={s('traps')} />

      {/* ══ UPPER BACK / RHOMBOIDS ══ */}
      <Mus isPri={p('upperBack')} isSec={s('upperBack')}
        d="M 66,166 C 64,178 64,190 68,198 L 132,198
           C 136,190 136,178 134,166 Z" />
      <Stri d="M 72,182 C 86,186 114,186 128,182" isPri={p('upperBack')} isSec={s('upperBack')} />

      {/* ══ LATS + teres major ══ */}
      <Mus isPri={p('lats')} isSec={s('lats')}
        d="M 36,138 C 26,156 20,180 18,208 C 18,230 20,252 26,268
           C 36,278 54,280 70,274 C 76,258 78,232 76,208
           C 74,190 70,176 64,166 C 56,154 46,146 40,140
           C 38,138 37,138 36,138 Z" />
      <Mus isPri={p('lats')} isSec={s('lats')}
        d="M 38,130 C 32,134 28,142 30,150 C 36,152 48,150 54,144
           C 54,138 48,130 42,128 C 40,128 39,129 38,130 Z" />
      <Mus isPri={p('lats')} isSec={s('lats')}
        d="M 164,138 C 174,156 180,180 182,208 C 182,230 180,252 174,268
           C 164,278 146,280 130,274 C 124,258 122,232 124,208
           C 126,190 130,176 136,166 C 144,154 154,146 160,140
           C 162,138 163,138 164,138 Z" />
      <Mus isPri={p('lats')} isSec={s('lats')}
        d="M 162,130 C 168,134 172,142 170,150 C 164,152 152,150 146,144
           C 146,138 152,130 158,128 C 160,128 161,129 162,130 Z" />
      <Stri d="M 30,160 C 40,190 55,220 68,260" isPri={p('lats')} isSec={s('lats')} />
      <Stri d="M 50,150 C 55,180 65,215 72,260" isPri={p('lats')} isSec={s('lats')} />
      <Stri d="M 170,160 C 160,190 145,220 132,260" isPri={p('lats')} isSec={s('lats')} />
      <Stri d="M 150,150 C 145,180 135,215 128,260" isPri={p('lats')} isSec={s('lats')} />

      {/* ══ REAR DELTOID — sits atop upper arm (back view) ══ */}
      <Mus isPri={p('rearDelt')} isSec={s('rearDelt')}
        d="M 30,100 C 20,102 12,110 10,124
           C 10,132 14,138 22,138
           C 30,136 36,130 40,120
           C 42,110 40,102 36,100
           C 34,98 32,98 30,100 Z" />
      <Stri d="M 16,114 C 22,120 30,124 36,122" isPri={p('rearDelt')} isSec={s('rearDelt')} />
      <Stri d="M 20,122 C 26,128 34,130 38,128" isPri={p('rearDelt')} isSec={s('rearDelt')} />
      <Mus isPri={p('rearDelt')} isSec={s('rearDelt')}
        d="M 170,100 C 180,102 188,110 190,124
           C 190,132 186,138 178,138
           C 170,136 164,130 160,120
           C 158,110 160,102 164,100
           C 166,98 168,98 170,100 Z" />
      <Stri d="M 184,114 C 178,120 170,124 164,122" isPri={p('rearDelt')} isSec={s('rearDelt')} />
      <Stri d="M 180,122 C 174,128 166,130 162,128" isPri={p('rearDelt')} isSec={s('rearDelt')} />

      {/* ══ TRICEPS — fills upper arm, 3 head hints ══ */}
      <Mus isPri={p('triceps')} isSec={s('triceps')}
        d="M 20,100 C 10,103 4,112 2,124 C 0,138 0,156 2,176
           C 2,192 4,208 8,222 C 10,230 16,234 22,232
           C 28,228 32,220 34,210 C 36,196 36,180 36,164
           C 36,146 34,128 32,114 C 30,106 26,101 20,100 Z" />
      <Stri d="M 10,130 C 12,160 14,190 18,222" isPri={p('triceps')} isSec={s('triceps')} />
      <Stri d="M 20,130 C 20,160 20,190 20,222" isPri={p('triceps')} isSec={s('triceps')} />
      <Stri d="M 30,130 C 30,160 28,190 26,222" isPri={p('triceps')} isSec={s('triceps')} />
      <Mus isPri={p('triceps')} isSec={s('triceps')}
        d="M 180,100 C 190,103 196,112 198,124 C 200,138 200,156 198,176
           C 198,192 196,208 192,222 C 190,230 184,234 178,232
           C 172,228 168,220 166,210 C 164,196 164,180 164,164
           C 164,146 166,128 168,114 C 170,106 174,101 180,100 Z" />
      <Stri d="M 190,130 C 188,160 186,190 182,222" isPri={p('triceps')} isSec={s('triceps')} />
      <Stri d="M 180,130 C 180,160 180,190 180,222" isPri={p('triceps')} isSec={s('triceps')} />
      <Stri d="M 170,130 C 170,160 172,190 174,222" isPri={p('triceps')} isSec={s('triceps')} />

      {/* ══ FOREARMS ══ */}
      <Mus isPri={p('forearms')} isSec={s('forearms')}
        d="M 8,222 C 4,240 2,264 4,284 C 6,298 10,308 16,312
           C 20,314 26,312 30,306 C 32,298 32,282 32,266
           C 32,250 30,236 28,226 C 26,220 22,218 16,218
           C 12,218 10,220 8,222 Z" />
      <Stri d="M 14,234 C 16,258 18,284 20,300" isPri={p('forearms')} isSec={s('forearms')} />
      <Stri d="M 24,234 C 26,258 26,284 24,300" isPri={p('forearms')} isSec={s('forearms')} />
      <Mus isPri={p('forearms')} isSec={s('forearms')}
        d="M 192,222 C 196,240 198,264 196,284 C 194,298 190,308 184,312
           C 180,314 174,312 170,306 C 168,298 168,282 168,266
           C 168,250 170,236 172,226 C 174,220 178,218 184,218
           C 188,218 190,220 192,222 Z" />
      <Stri d="M 186,234 C 184,258 182,284 180,300" isPri={p('forearms')} isSec={s('forearms')} />
      <Stri d="M 176,234 C 174,258 174,284 176,300" isPri={p('forearms')} isSec={s('forearms')} />

      {/* ══ LOWER BACK — erector columns + fascia ══ */}
      <Mus isPri={p('lowerBack')} isSec={s('lowerBack')}
        d="M 84,240 C 80,258 78,280 80,298 C 84,306 94,306 96,298
           C 98,280 98,258 96,240 C 92,236 86,236 84,240 Z" />
      <Mus isPri={p('lowerBack')} isSec={s('lowerBack')}
        d="M 116,240 C 120,258 122,280 120,298 C 116,306 106,306 104,298
           C 102,280 102,258 104,240 C 108,236 114,236 116,240 Z" />
      <Mus isPri={p('lowerBack')} isSec={s('lowerBack')}
        d="M 100,300 C 92,306 86,318 86,328 C 90,334 110,334 114,328
           C 114,318 108,306 100,300 Z" />
      <Stri d="M 88,260 C 90,280 92,296 92,304" isPri={p('lowerBack')} isSec={s('lowerBack')} />
      <Stri d="M 112,260 C 110,280 108,296 108,304" isPri={p('lowerBack')} isSec={s('lowerBack')} />

      {/* ══ GLUTES — gluteus maximus only (medius bumps removed per feedback) ══ */}
      <Mus isPri={p('glutes')} isSec={s('glutes')}
        d="M 44,290 C 30,306 24,334 28,360 C 36,374 60,382 86,378
           C 94,370 96,346 92,316 C 86,300 70,290 50,288
           C 48,288 46,289 44,290 Z" />
      <Mus isPri={p('glutes')} isSec={s('glutes')}
        d="M 156,290 C 170,306 176,334 172,360 C 164,374 140,382 114,378
           C 106,370 104,346 108,316 C 114,300 130,290 150,288
           C 152,288 154,289 156,290 Z" />
      <Stri d="M 48,320 C 60,340 76,360 86,370" isPri={p('glutes')} isSec={s('glutes')} />
      <Stri d="M 152,320 C 140,340 124,360 114,370" isPri={p('glutes')} isSec={s('glutes')} />

      {/* ══ HAMSTRINGS — fills thigh, BF + ST striations ══ */}
      <Mus isPri={p('hamstrings')} isSec={s('hamstrings')}
        d="M 46,344 C 36,356 30,378 28,404 C 26,428 26,452 30,472
           C 34,478 44,480 56,478 C 70,476 82,470 86,462
           C 88,454 88,440 88,420 C 88,396 90,372 92,352
           C 90,344 86,340 80,340 L 52,340 C 48,340 46,342 46,344 Z" />
      <Stri d="M 42,370 C 42,410 44,450 48,470" isPri={p('hamstrings')} isSec={s('hamstrings')} />
      <Stri d="M 60,364 C 60,400 62,440 64,470" isPri={p('hamstrings')} isSec={s('hamstrings')} />
      <Stri d="M 78,364 C 78,400 80,440 80,470" isPri={p('hamstrings')} isSec={s('hamstrings')} />
      <Mus isPri={p('hamstrings')} isSec={s('hamstrings')}
        d="M 154,344 C 164,356 170,378 172,404 C 174,428 174,452 170,472
           C 166,478 156,480 144,478 C 130,476 118,470 114,462
           C 112,454 112,440 112,420 C 112,396 110,372 108,352
           C 110,344 114,340 120,340 L 148,340 C 152,340 154,342 154,344 Z" />
      <Stri d="M 158,370 C 158,410 156,450 152,470" isPri={p('hamstrings')} isSec={s('hamstrings')} />
      <Stri d="M 140,364 C 140,400 138,440 136,470" isPri={p('hamstrings')} isSec={s('hamstrings')} />
      <Stri d="M 122,364 C 122,400 120,440 120,470" isPri={p('hamstrings')} isSec={s('hamstrings')} />

      {/* ══ CALVES — fills lower leg, gastroc medial/lateral head split ══ */}
      <Mus isPri={p('calves')} isSec={s('calves')}
        d="M 30,475 C 22,496 22,516 26,528 C 30,536 46,540 62,538
           C 76,536 84,532 86,526 C 88,518 88,506 86,490
           C 84,480 82,474 80,470 C 70,474 50,474 30,475 Z" />
      {/* Medial head striations */}
      <Stri d="M 44,488 C 46,504 48,520 52,530" isPri={p('calves')} isSec={s('calves')} />
      <Stri d="M 56,486 C 56,504 56,520 56,530" isPri={p('calves')} isSec={s('calves')} />
      {/* Lateral head striations */}
      <Stri d="M 68,488 C 68,504 66,520 64,530" isPri={p('calves')} isSec={s('calves')} />
      <Stri d="M 78,486 C 76,500 74,514 72,528" isPri={p('calves')} isSec={s('calves')} />
      {/* Central gastroc separation line */}
      <Stri d="M 58,478 C 58,498 58,518 58,530" isPri={p('calves')} isSec={s('calves')} />
      <Mus isPri={p('calves')} isSec={s('calves')}
        d="M 170,475 C 178,496 178,516 174,528 C 170,536 154,540 138,538
           C 124,536 116,532 114,526 C 112,518 112,506 114,490
           C 116,480 118,474 120,470 C 130,474 150,474 170,475 Z" />
      <Stri d="M 156,488 C 154,504 152,520 148,530" isPri={p('calves')} isSec={s('calves')} />
      <Stri d="M 144,486 C 144,504 144,520 144,530" isPri={p('calves')} isSec={s('calves')} />
      <Stri d="M 132,488 C 132,504 134,520 136,530" isPri={p('calves')} isSec={s('calves')} />
      <Stri d="M 122,486 C 124,500 126,514 128,528" isPri={p('calves')} isSec={s('calves')} />
      <Stri d="M 142,478 C 142,498 142,518 142,530" isPri={p('calves')} isSec={s('calves')} />
    </g>
  );
}

// ── Front labels ─────────────────────────────────────────────────────────────
function FrontLabels({ pri, sec }) {
  const active = [];
  const targets = {
    chest: { x: 100, y: 130 }, frontDelt: { x: 18, y: 118 },
    biceps: { x: 18, y: 172 }, forearms: { x: 18, y: 264 },
    abs: { x: 100, y: 200 }, obliques: { x: 60, y: 198 },
    quads: { x: 100, y: 410 }, tibialis: { x: 58, y: 510 },
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

// ── Back labels ──────────────────────────────────────────────────────────────
function BackLabels({ pri, sec }) {
  const active = [];
  const targets = {
    traps: { x: 100, y: 106 }, upperBack: { x: 100, y: 182 },
    lats: { x: 42, y: 210 }, rearDelt: { x: 18, y: 118 },
    triceps: { x: 182, y: 172 }, forearms: { x: 182, y: 264 },
    lowerBack: { x: 100, y: 278 }, glutes: { x: 148, y: 340 },
    hamstrings: { x: 58, y: 420 }, calves: { x: 152, y: 504 },
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
  const headerStyle = { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' };
  const h3Style = { margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 };
  const emptyStyle = { fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' };
  const bodyStyle = { display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' };
  const viewStyle = {
    flex: '1 1 160px', maxWidth: '200px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
  };
  const viewLabelStyle = {
    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: 'var(--text-muted)',
  };
  const legendStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '16px', marginTop: '0.75rem', paddingTop: '0.6rem',
    borderTop: '1px solid var(--border)',
  };
  const legendItemStyle = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' };
  const dotBase = { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', flexShrink: 0 };
  const statsStyle = { marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' };
  const statsCountStyle = { fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' };
  const pillContainerStyle = { display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' };
  const pillStyle = (isPrimary) => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: '10px',
    fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.02em',
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
        <div style={viewStyle}>
          <div style={viewLabelStyle}>Front</div>
          <svg viewBox="-30 -5 260 600" width="100%" style={{ display: 'block' }}>
            <SvgDefs />
            <rect x="-30" y="-5" width="260" height="600" fill="url(#bgGrad)" />
            <g opacity="0.035" stroke="#4a9eff" strokeWidth="0.5">
              {Array.from({ length: 13 }, (_, i) => (
                <line key={`hg-${i}`} x1="-30" y1={i * 50} x2="230" y2={i * 50} />
              ))}
              {Array.from({ length: 7 }, (_, i) => (
                <line key={`vg-${i}`} x1={-30 + i * 44} y1="-5" x2={-30 + i * 44} y2="595" />
              ))}
            </g>
            <BodyShape />
            <FrontMuscles pri={pri} sec={sec} />
            <FrontLabels pri={pri} sec={sec} />
          </svg>
        </div>

        <div style={viewStyle}>
          <div style={viewLabelStyle}>Back</div>
          <svg viewBox="-30 -5 260 600" width="100%" style={{ display: 'block' }}>
            <SvgDefs />
            <rect x="-30" y="-5" width="260" height="600" fill="url(#bgGrad)" />
            <g opacity="0.035" stroke="#4a9eff" strokeWidth="0.5">
              {Array.from({ length: 13 }, (_, i) => (
                <line key={`hg-${i}`} x1="-30" y1={i * 50} x2="230" y2={i * 50} />
              ))}
              {Array.from({ length: 7 }, (_, i) => (
                <line key={`vg-${i}`} x1={-30 + i * 44} y1="-5" x2={-30 + i * 44} y2="595" />
              ))}
            </g>
            <BodyShape />
            <BackMuscles pri={pri} sec={sec} />
            <BackLabels pri={pri} sec={sec} />
          </svg>
        </div>
      </div>

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
