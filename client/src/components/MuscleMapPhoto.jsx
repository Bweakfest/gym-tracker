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
  // Chest — full L + R pec, matching the photo's pec footprint
  { key: 'chest',
    d: 'M 268,355 L 215,360 C 195,385 188,440 208,475 L 268,485 Z' },
  { key: 'chest',
    d: 'M 276,355 L 329,360 C 349,385 356,440 336,475 L 276,485 Z' },

  // Front deltoids — full shoulder-cap dome (wider + taller than before)
  { key: 'frontDelt',
    d: 'M 220,320 C 170,328 138,355 142,408 C 168,432 220,432 230,402 C 232,365 230,335 220,320 Z' },
  { key: 'frontDelt',
    d: 'M 324,320 C 374,328 406,355 402,408 C 376,432 324,432 314,402 C 312,365 314,335 324,320 Z' },

  // Biceps — full upper arm bulge
  { key: 'biceps',
    d: 'M 168,415 C 142,455 138,545 162,590 L 208,590 C 218,545 215,455 200,415 Z' },
  { key: 'biceps',
    d: 'M 376,415 C 402,455 406,545 382,590 L 336,590 C 326,545 329,455 344,415 Z' },

  // Forearms — full forearm taper
  { key: 'forearms',
    d: 'M 148,600 C 130,660 130,750 152,800 L 210,800 C 218,750 216,660 200,600 Z' },
  { key: 'forearms',
    d: 'M 396,600 C 414,660 414,750 392,800 L 334,800 C 326,750 328,660 344,600 Z' },

  // Abs — full rectus abdominis from pec underline to navel
  { key: 'abs',
    d: 'M 215,478 L 329,478 L 327,690 L 217,690 Z' },

  // Obliques — flanks running alongside abs
  { key: 'obliques',
    d: 'M 188,490 L 217,490 L 219,680 L 195,668 Z' },
  { key: 'obliques',
    d: 'M 327,490 L 356,490 L 349,668 L 325,680 Z' },

  // Quads — full thigh below shorts to knee (wider than before)
  { key: 'quads',
    d: 'M 210,910 L 272,910 L 272,1095 L 213,1095 Z' },
  { key: 'quads',
    d: 'M 274,910 L 336,910 L 333,1095 L 274,1095 Z' },

  // Tibialis — full front shin from knee to ankle
  { key: 'tibialis',
    d: 'M 220,1175 L 270,1175 L 266,1410 L 226,1410 Z' },
  { key: 'tibialis',
    d: 'M 278,1175 L 328,1175 L 322,1410 L 282,1410 Z' },
];

// Back-view regions also use 0..512 coords (the SVG offsets the image so the
// right half of the PNG is shown in the same coordinate space).
const BACK_REGIONS = [
  // Trapezius — full diamond from neck down to mid-back
  { key: 'traps',
    d: 'M 272,300 L 215,335 L 210,485 L 272,505 L 334,485 L 329,335 Z' },

  // Rear deltoids — full back-of-shoulder cap
  { key: 'rearDelt',
    d: 'M 220,320 C 170,328 138,355 142,408 C 168,432 220,432 230,402 C 232,365 230,335 220,320 Z' },
  { key: 'rearDelt',
    d: 'M 324,320 C 374,328 406,355 402,408 C 376,432 324,432 314,402 C 312,365 314,335 324,320 Z' },

  // Triceps — full back of upper arm
  { key: 'triceps',
    d: 'M 168,415 C 142,455 138,545 162,590 L 208,590 C 218,545 215,455 200,415 Z' },
  { key: 'triceps',
    d: 'M 376,415 C 402,455 406,545 382,590 L 336,590 C 326,545 329,455 344,415 Z' },

  // Forearms (back)
  { key: 'forearms',
    d: 'M 148,600 C 130,660 130,750 152,800 L 210,800 C 218,750 216,660 200,600 Z' },
  { key: 'forearms',
    d: 'M 396,600 C 414,660 414,750 392,800 L 334,800 C 326,750 328,660 344,600 Z' },

  // Lats — full V-taper wings from armpit to waist
  { key: 'lats',
    d: 'M 210,475 L 268,475 L 268,730 L 218,720 Z' },
  { key: 'lats',
    d: 'M 276,475 L 334,475 L 326,720 L 276,730 Z' },

  // Upper back / rhomboids — between scapulae
  { key: 'upperBack',
    d: 'M 218,485 L 326,485 L 322,635 L 222,635 Z' },

  // Lower back / erector spinae
  { key: 'lowerBack',
    d: 'M 226,725 L 318,725 L 314,880 L 230,880 Z' },

  // Glutes — full glute footprint under shorts
  { key: 'glutes',
    d: 'M 213,870 L 272,870 L 272,1015 L 215,1015 Z' },
  { key: 'glutes',
    d: 'M 274,870 L 333,870 L 331,1015 L 274,1015 Z' },

  // Hamstrings — full back-of-thigh
  { key: 'hamstrings',
    d: 'M 210,1015 L 272,1015 L 272,1190 L 213,1190 Z' },
  { key: 'hamstrings',
    d: 'M 274,1015 L 336,1015 L 333,1190 L 274,1190 Z' },

  // Calves — full back-of-lower-leg gastrocnemius
  { key: 'calves',
    d: 'M 220,1225 L 270,1225 L 266,1435 L 226,1435 Z' },
  { key: 'calves',
    d: 'M 278,1225 L 328,1225 L 322,1435 L 282,1435 Z' },
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
  // Full-saturation colour + screen blend = vivid, lit-up muscle even on
  // darker skin tones. Multiply was too subtle.
  const fill = isPri ? '#fb923c' : '#60a5fa';
  const filterId = isPri ? 'url(#muscle-glow-pri)' : 'url(#muscle-glow-sec)';
  return (
    <path
      d={region.d}
      fill={fill}
      style={{
        mixBlendMode: 'screen',
        opacity: isPri ? 0.78 : 0.66,
        filter: filterId,
        transition: 'opacity 0.4s ease',
      }}
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
          {/* Moderate blur — softens polygon edges so the highlight looks
              painted, but keeps the colour concentrated on the muscle so
              it's easy to see at a glance. */}
          <filter id="muscle-glow-pri" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="muscle-glow-sec" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="5" />
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
