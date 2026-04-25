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

const DEBUG = false;       // ⇦ true to overlay region outlines for re-calibration
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
  // Chest — left + right pec, smoother shape following the photo
  { key: 'chest',
    d: 'M 270,360 L 218,365 C 198,395 198,440 215,470 L 268,470 Z' },
  { key: 'chest',
    d: 'M 274,360 L 326,365 C 346,395 346,440 329,470 L 276,470 Z' },

  // Front deltoids — rounded caps on the shoulders
  { key: 'frontDelt',
    d: 'M 215,330 C 175,335 145,360 150,400 C 175,420 218,418 225,395 C 226,365 222,340 215,330 Z' },
  { key: 'frontDelt',
    d: 'M 329,330 C 369,335 399,360 394,400 C 369,420 326,418 319,395 C 318,365 322,340 329,330 Z' },

  // Biceps — slight oval on front of upper arm
  { key: 'biceps',
    d: 'M 175,420 C 150,460 148,540 168,580 L 200,580 C 215,540 213,460 200,420 Z' },
  { key: 'biceps',
    d: 'M 369,420 C 394,460 396,540 376,580 L 344,580 C 329,540 331,460 344,420 Z' },

  // Forearms — front of lower arm (brachioradialis + flexor)
  { key: 'forearms',
    d: 'M 156,610 C 138,660 138,740 158,790 L 200,790 C 210,740 208,660 195,610 Z' },
  { key: 'forearms',
    d: 'M 388,610 C 406,660 406,740 386,790 L 344,790 C 334,740 336,660 349,610 Z' },

  // Abs — full rectus abdominis (between pec underline and shorts line)
  { key: 'abs',
    d: 'M 220,475 L 324,475 L 322,680 L 222,680 Z' },

  // Obliques — flanks alongside abs
  { key: 'obliques',
    d: 'M 195,490 L 220,490 L 220,670 L 200,660 Z' },
  { key: 'obliques',
    d: 'M 324,490 L 349,490 L 344,660 L 324,670 Z' },

  // Quads — thighs below shorts line down to knee
  { key: 'quads',
    d: 'M 215,920 L 270,920 L 270,1090 L 218,1090 Z' },
  { key: 'quads',
    d: 'M 274,920 L 329,920 L 326,1090 L 274,1090 Z' },

  // Tibialis — front of shins (below knee, ~y=1180)
  { key: 'tibialis',
    d: 'M 226,1180 L 266,1180 L 262,1390 L 232,1390 Z' },
  { key: 'tibialis',
    d: 'M 278,1180 L 318,1180 L 312,1390 L 282,1390 Z' },
];

// Back-view regions also use 0..512 coords (the SVG offsets the image so the
// right half of the PNG is shown in the same coordinate space).
const BACK_REGIONS = [
  // Trapezius — diamond from base of skull down between shoulder blades
  { key: 'traps',
    d: 'M 272,310 L 220,335 L 215,470 L 272,490 L 329,470 L 324,335 Z' },

  // Rear deltoids — rounded caps on the back of shoulders
  { key: 'rearDelt',
    d: 'M 215,330 C 175,335 145,360 150,400 C 175,420 218,418 225,395 C 226,365 222,340 215,330 Z' },
  { key: 'rearDelt',
    d: 'M 329,330 C 369,335 399,360 394,400 C 369,420 326,418 319,395 C 318,365 322,340 329,330 Z' },

  // Triceps — back of upper arms (3-head bundle)
  { key: 'triceps',
    d: 'M 175,420 C 150,460 148,540 168,580 L 200,580 C 215,540 213,460 200,420 Z' },
  { key: 'triceps',
    d: 'M 369,420 C 394,460 396,540 376,580 L 344,580 C 329,540 331,460 344,420 Z' },

  // Forearms (back)
  { key: 'forearms',
    d: 'M 156,610 C 138,660 138,740 158,790 L 200,790 C 210,740 208,660 195,610 Z' },
  { key: 'forearms',
    d: 'M 388,610 C 406,660 406,740 386,790 L 344,790 C 334,740 336,660 349,610 Z' },

  // Lats — V-taper wings extending from armpit down to waist
  { key: 'lats',
    d: 'M 215,470 L 268,470 L 268,720 L 220,710 Z' },
  { key: 'lats',
    d: 'M 276,470 L 329,470 L 324,710 L 276,720 Z' },

  // Upper back / rhomboids — between scapulae
  { key: 'upperBack',
    d: 'M 222,470 L 322,470 L 320,620 L 224,620 Z' },

  // Lower back / erector spinae — above shorts line
  { key: 'lowerBack',
    d: 'M 232,720 L 312,720 L 308,870 L 236,870 Z' },

  // Glutes — under the shorts (still highlightable through fabric)
  { key: 'glutes',
    d: 'M 218,870 L 270,870 L 270,1010 L 218,1010 Z' },
  { key: 'glutes',
    d: 'M 274,870 L 326,870 L 326,1010 L 274,1010 Z' },

  // Hamstrings — backs of thighs from glute crease to knee
  { key: 'hamstrings',
    d: 'M 218,1010 L 270,1010 L 270,1180 L 220,1180 Z' },
  { key: 'hamstrings',
    d: 'M 274,1010 L 326,1010 L 324,1180 L 274,1180 Z' },

  // Calves — backs of lower legs (gastrocnemius bulge)
  { key: 'calves',
    d: 'M 226,1230 L 268,1230 L 266,1430 L 232,1430 Z' },
  { key: 'calves',
    d: 'M 276,1230 L 318,1230 L 314,1430 L 280,1430 Z' },
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
          {/* Stronger blur softens the polygon edges so the highlight looks
              painted onto the muscle rather than a hard rectangle. */}
          <filter id="muscle-glow-pri" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="muscle-glow-sec" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="11" />
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
