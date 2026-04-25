// ─────────────────────────────────────────────────────────────────────────
// MuscleMapPhoto — image-based muscle activation map
// ─────────────────────────────────────────────────────────────────────────
//
// Renders a photorealistic body PNG as the base layer with an SVG layer on
// top. Each muscle region is an SVG <path> that's invisible by default and
// fades to translucent orange (primary) or blue (secondary) when its
// activation key is in the active sets.
//
// The base photo is a single 1024×1536 PNG with FRONT on the left half
// (x = 0…512) and BACK on the right half (x = 512…1024). Each view's <svg>
// crops to its half by offsetting the <image> tag.
//
// Calibration: set DEBUG = true to overlay every muscle region as a lime
// outline with its key labelled. Once the regions line up with the body,
// flip DEBUG = false.
// ─────────────────────────────────────────────────────────────────────────

const DEBUG = true;        // ⇦ flip false once regions line up with the photo
const HALF_W = 512;        // each view is 512 wide (half of 1024)
const IMG_H  = 1536;       // image height

// ── Activation logic — same as the SVG version ────────────────────────────
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
      if (m.includes('anterior') && !m.includes('posterior')) primary.push('frontDelt');
      else if (m.includes('posterior') || m.includes('rear')) primary.push('rearDelt');
      else { primary.push('frontDelt'); primary.push('rearDelt'); }
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

const MUSCLE_NAMES = {
  chest: 'Chest', lats: 'Lats', traps: 'Traps', upperBack: 'Upper Back',
  lowerBack: 'Lower Back', frontDelt: 'Front Delt', rearDelt: 'Rear Delt',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  abs: 'Abs', obliques: 'Obliques', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', tibialis: 'Tibialis',
};

// ── Muscle region paths ───────────────────────────────────────────────────
//
// Coordinates are in the 512 × 1536 single-view space (each half-image).
// These are STARTER positions assuming the figure is roughly centered at
// x=256. With DEBUG=true above, they render as lime outlines with the
// muscle key labelled — take a screenshot and I'll nudge any that are
// off.
//
// Path format: simple polygons (M-L-L-L-Z) work fine since the blur
// filter softens edges anyway.
const FRONT_REGIONS = [
  // Chest — split into L/R pec
  { key: 'chest',     d: 'M 168,360 L 252,360 L 264,500 L 176,520 Z' },
  { key: 'chest',     d: 'M 260,360 L 344,360 L 336,520 L 248,500 Z' },

  // Front deltoids — caps on the shoulders
  { key: 'frontDelt', d: 'M 124,340 L 180,360 L 184,420 L 128,410 Z' },
  { key: 'frontDelt', d: 'M 332,360 L 388,340 L 384,410 L 328,420 Z' },

  // Biceps — fronts of upper arms
  { key: 'biceps',    d: 'M 110,420 L 160,420 L 160,580 L 110,580 Z' },
  { key: 'biceps',    d: 'M 352,420 L 402,420 L 402,580 L 352,580 Z' },

  // Forearms (front)
  { key: 'forearms',  d: 'M 110,580 L 160,580 L 154,760 L 110,760 Z' },
  { key: 'forearms',  d: 'M 352,580 L 402,580 L 402,760 L 358,760 Z' },

  // Abs — full rectus abdominis
  { key: 'abs',       d: 'M 200,510 L 312,510 L 312,680 L 200,680 Z' },

  // Obliques — flanks
  { key: 'obliques',  d: 'M 168,510 L 200,510 L 200,660 L 174,650 Z' },
  { key: 'obliques',  d: 'M 312,510 L 344,510 L 338,650 L 312,660 Z' },

  // Quads — fronts of thighs (below shorts line, ~y=900)
  { key: 'quads',     d: 'M 178,910 L 252,910 L 250,1100 L 184,1100 Z' },
  { key: 'quads',     d: 'M 260,910 L 334,910 L 328,1100 L 262,1100 Z' },

  // Tibialis — front of shins (below knee, ~y=1180)
  { key: 'tibialis',  d: 'M 188,1180 L 248,1180 L 244,1380 L 196,1380 Z' },
  { key: 'tibialis',  d: 'M 264,1180 L 324,1180 L 316,1380 L 268,1380 Z' },
];

// Back-view regions also use 0..512 coords (the SVG offsets the image so the
// right half of the PNG is shown in the same coordinate space).
const BACK_REGIONS = [
  // Trapezius — diamond from neck down between shoulder blades
  { key: 'traps',     d: 'M 220,320 L 292,320 L 320,460 L 192,460 Z' },

  // Rear deltoids
  { key: 'rearDelt',  d: 'M 124,340 L 180,360 L 184,420 L 128,410 Z' },
  { key: 'rearDelt',  d: 'M 332,360 L 388,340 L 384,410 L 328,420 Z' },

  // Triceps — back of upper arms
  { key: 'triceps',   d: 'M 110,420 L 160,420 L 160,580 L 110,580 Z' },
  { key: 'triceps',   d: 'M 352,420 L 402,420 L 402,580 L 352,580 Z' },

  // Forearms (back)
  { key: 'forearms',  d: 'M 110,580 L 160,580 L 154,760 L 110,760 Z' },
  { key: 'forearms',  d: 'M 352,580 L 402,580 L 402,760 L 358,760 Z' },

  // Lats — V-taper wings under arms
  { key: 'lats',      d: 'M 168,470 L 240,470 L 240,700 L 174,680 Z' },
  { key: 'lats',      d: 'M 272,470 L 344,470 L 338,680 L 272,700 Z' },

  // Upper back / rhomboids
  { key: 'upperBack', d: 'M 192,460 L 320,460 L 318,560 L 194,560 Z' },

  // Lower back / erector spinae
  { key: 'lowerBack', d: 'M 210,680 L 302,680 L 300,820 L 212,820 Z' },

  // Glutes (covered by shorts, still highlightable through them)
  { key: 'glutes',    d: 'M 178,820 L 252,820 L 252,940 L 178,930 Z' },
  { key: 'glutes',    d: 'M 260,820 L 334,820 L 334,930 L 260,940 Z' },

  // Hamstrings — backs of thighs
  { key: 'hamstrings',d: 'M 178,940 L 252,940 L 250,1100 L 184,1100 Z' },
  { key: 'hamstrings',d: 'M 260,940 L 334,940 L 328,1100 L 262,1100 Z' },

  // Calves — backs of lower legs
  { key: 'calves',    d: 'M 188,1180 L 248,1180 L 244,1380 L 196,1380 Z' },
  { key: 'calves',    d: 'M 264,1180 L 324,1180 L 316,1380 L 268,1380 Z' },
];

// ── Single overlay path ───────────────────────────────────────────────────
function MuscleOverlay({ region, isPri, isSec }) {
  if (DEBUG) {
    return (
      <>
        <path
          d={region.d}
          fill={isPri ? 'rgba(251,146,60,0.35)' : isSec ? 'rgba(96,165,250,0.35)' : 'rgba(132,204,22,0.12)'}
          stroke={isPri ? '#fb923c' : isSec ? '#60a5fa' : '#84cc16'}
          strokeWidth="2.5"
          strokeOpacity="0.9"
        />
      </>
    );
  }
  if (!isPri && !isSec) return null;
  const fill = isPri ? 'rgba(251, 146, 60, 0.55)' : 'rgba(96, 165, 250, 0.50)';
  const filterId = isPri ? 'url(#muscle-glow-pri)' : 'url(#muscle-glow-sec)';
  return (
    <path
      d={region.d}
      fill={fill}
      style={{ mixBlendMode: 'multiply', filter: filterId, transition: 'fill 0.4s ease' }}
    />
  );
}

// ── One side of the figure ────────────────────────────────────────────────
function BodyView({ side, regions, pri, sec, imgX }) {
  return (
    <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'var(--text-muted)',
      }}>{side}</div>

      <svg
        viewBox={`0 0 ${HALF_W} ${IMG_H}`}
        width="100%"
        style={{ display: 'block', maxWidth: 360 }}
      >
        <defs>
          <filter id="muscle-glow-pri" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="muscle-glow-sec" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* Single combined PNG, offset so only the relevant half shows */}
        <image
          href="/muscles/body.png"
          x={imgX} y="0" width="1024" height={IMG_H}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Muscle activation overlays */}
        {regions.map((r, i) => (
          <MuscleOverlay
            key={`${r.key}-${i}`}
            region={r}
            isPri={pri.has(r.key)}
            isSec={sec.has(r.key)}
          />
        ))}

        {/* DEBUG: label each region with its key */}
        {DEBUG && regions.map((r, i) => {
          const m = r.d.match(/^M\s*([\d.]+)[,\s]+([\d.]+)/);
          if (!m) return null;
          return (
            <text key={`lbl-${i}`} x={Number(m[1]) + 4} y={Number(m[2]) + 22}
              fontSize="20" fill="#84cc16" fontWeight="700"
              style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 2px #000)' }}>
              {r.key}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── Main component — drop-in replacement for MuscleMap ────────────────────
export default function MuscleMapPhoto({ workouts = [] }) {
  const pri = new Set();
  const sec = new Set();
  workouts.forEach(w => {
    const { primary, secondary } = deriveMuscleTags(w.group || '', w.muscles || '');
    primary.forEach(m => pri.add(m));
    secondary.forEach(m => { if (!pri.has(m)) sec.add(m); });
  });

  const hasActivity = pri.size > 0 || sec.size > 0;
  const totalGroups = pri.size + sec.size;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '1rem',
      marginBottom: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
          Muscles Worked
        </h3>
        {!hasActivity && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Log exercises to see activation
          </span>
        )}
        {DEBUG && (
          <span style={{ fontSize: '0.7rem', color: '#84cc16', fontWeight: 600, letterSpacing: '0.05em' }}>
            ● CALIBRATION MODE
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* Front view: image at x=0 (left half visible) */}
        <BodyView side="Front" regions={FRONT_REGIONS} pri={pri} sec={sec} imgX={0} />
        {/* Back view: image shifted -512 (right half visible) */}
        <BodyView side="Back"  regions={BACK_REGIONS}  pri={pri} sec={sec} imgX={-HALF_W} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16, marginTop: '0.75rem', paddingTop: '0.6rem',
        borderTop: '1px solid var(--border)',
      }}>
        {[
          { color: '#f97316', label: 'Primary',   shadow: '0 0 6px rgba(249,115,22,0.5)' },
          { color: '#3b82f6', label: 'Secondary', shadow: '0 0 6px rgba(59,130,246,0.4)' },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.72rem', color: 'var(--text-secondary)',
          }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: item.color, boxShadow: item.shadow,
              display: 'inline-block', flexShrink: 0,
            }} />
            {item.label}
          </div>
        ))}
      </div>

      {hasActivity && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{totalGroups}</strong>{' '}
            muscle group{totalGroups !== 1 ? 's' : ''} targeted
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
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

function pillStyle(isPrimary) {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: 10,
    fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.02em',
    background: isPrimary ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.12)',
    color: isPrimary ? '#fb923c' : '#93c5fd',
    border: `1px solid ${isPrimary ? 'rgba(249, 115, 22, 0.3)' : 'rgba(59, 130, 246, 0.25)'}`,
  };
}
