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
// ── Muscle shapes ─────────────────────────────────────────────────────────
// Paths traced from the user's red outlines on the body photo. Each muscle
// is sized to FILL its anatomical footprint, and compound groups (abs,
// biceps, triceps, quads, hamstrings, calves) are split into sub-muscles
// with 1–2 px gaps that read as separator lines when the colour fills.
const FRONT_REGIONS = [
  // ═══ CHEST — pec major fan, full pec footprint, sternum cleft visible ═══
  // Left pec
  { key: 'chest',
    d: 'M 268,348 L 222,360 C 198,378 188,420 198,460 C 218,486 252,488 268,484 Z' },
  // Right pec (mirror)
  { key: 'chest',
    d: 'M 276,348 L 322,360 C 346,378 356,420 346,460 C 326,486 292,488 276,484 Z' },

  // ═══ FRONT DELTS — full triangular shoulder cap ═══
  { key: 'frontDelt',
    d: 'M 220,322 C 184,326 152,346 138,378 C 134,406 144,432 168,436 C 200,438 226,422 232,398 C 234,360 228,332 220,322 Z' },
  { key: 'frontDelt',
    d: 'M 324,322 C 360,326 392,346 406,378 C 410,406 400,432 376,436 C 344,438 318,422 312,398 C 310,360 316,332 324,322 Z' },

  // ═══ BICEPS — long head + short head, fills full upper arm ═══
  // L long head (outer/lateral)
  { key: 'biceps',
    d: 'M 178,432 C 156,458 144,510 152,560 C 158,592 174,602 188,600 L 188,432 Z' },
  // L short head (inner/medial)
  { key: 'biceps',
    d: 'M 192,432 L 192,600 C 206,602 218,594 220,562 C 222,508 212,458 198,432 Z' },
  // R long head
  { key: 'biceps',
    d: 'M 366,432 C 388,458 400,510 392,560 C 386,592 370,602 356,600 L 356,432 Z' },
  // R short head
  { key: 'biceps',
    d: 'M 352,432 L 352,600 C 338,602 326,594 324,562 C 322,508 332,458 346,432 Z' },

  // ═══ FOREARMS — brachioradialis bulge tapering to wrist ═══
  { key: 'forearms',
    d: 'M 152,608 C 130,650 124,720 138,775 C 152,798 178,805 198,798 C 212,750 218,680 208,615 C 192,602 168,602 152,608 Z' },
  { key: 'forearms',
    d: 'M 392,608 C 414,650 420,720 406,775 C 392,798 366,805 346,798 C 332,750 326,680 336,615 C 352,602 376,602 392,608 Z' },

  // ═══ ABS — three pairs + lower V triangle, tight gaps for 6-pack look ═══
  // Top L / R (just below pec underline)
  { key: 'abs', d: 'M 232,484 L 271,484 L 271,524 L 232,526 Z' },
  { key: 'abs', d: 'M 273,484 L 312,484 L 312,526 L 273,524 Z' },
  // Mid L / R
  { key: 'abs', d: 'M 230,530 L 271,530 L 271,576 L 230,576 Z' },
  { key: 'abs', d: 'M 273,530 L 314,530 L 314,576 L 273,576 Z' },
  // Lower L / R (just above navel)
  { key: 'abs', d: 'M 228,580 L 271,580 L 271,628 L 228,628 Z' },
  { key: 'abs', d: 'M 273,580 L 316,580 L 316,628 L 273,628 Z' },
  // Lower V triangle (below navel, into the inguinal V)
  { key: 'abs', d: 'M 234,632 L 310,632 L 290,694 L 254,694 Z' },

  // ═══ OBLIQUES — curved flanks running alongside abs ═══
  { key: 'obliques',
    d: 'M 196,488 C 188,540 184,612 196,672 C 214,676 226,654 226,615 L 226,496 Z' },
  { key: 'obliques',
    d: 'M 348,488 C 356,540 360,612 348,672 C 330,676 318,654 318,615 L 318,496 Z' },

  // ═══ QUADS — VL outer + RF centre + VM teardrop per leg ═══
  // L vastus lateralis (outer column)
  { key: 'quads',
    d: 'M 248,908 L 270,908 C 274,950 274,1010 270,1060 L 270,1095 C 250,1100 234,1095 226,1080 C 222,1040 220,980 226,925 C 234,914 244,910 248,908 Z' },
  // L rectus femoris (centre stripe)
  { key: 'quads',
    d: 'M 232,915 L 248,915 L 248,1090 L 232,1088 C 226,1040 226,975 232,915 Z' },
  // L vastus medialis teardrop (inner, above knee)
  { key: 'quads',
    d: 'M 252,1062 L 270,1062 L 268,1100 C 256,1108 246,1102 244,1090 C 246,1078 248,1068 252,1062 Z' },
  // R vastus lateralis
  { key: 'quads',
    d: 'M 296,908 L 318,908 C 322,914 332,925 326,1080 C 318,1095 302,1100 282,1095 L 282,1060 C 278,1010 278,950 282,908 L 296,908 Z' },
  // R rectus femoris
  { key: 'quads',
    d: 'M 304,915 L 320,915 C 326,975 326,1040 320,1088 L 304,1090 Z' },
  // R vastus medialis teardrop
  { key: 'quads',
    d: 'M 282,1062 L 300,1062 C 304,1068 306,1078 308,1090 C 306,1102 296,1108 284,1100 Z' },

  // ═══ TIBIALIS — full front shin (knee to ankle) ═══
  { key: 'tibialis',
    d: 'M 222,1180 C 218,1240 220,1320 230,1400 C 246,1410 262,1410 268,1395 C 270,1320 270,1240 262,1180 Z' },
  { key: 'tibialis',
    d: 'M 282,1180 C 280,1240 280,1320 282,1395 C 288,1410 304,1410 320,1400 C 330,1320 332,1240 328,1180 Z' },
];

// Back-view regions also use 0..512 coords (the SVG offsets the image so the
// right half of the PNG is shown in the same coordinate space).
const BACK_REGIONS = [
  // ═══ TRAPEZIUS — full kite from neck base to mid-back, spans shoulders ═══
  { key: 'traps',
    d: 'M 272,300 C 240,308 198,332 172,360 L 220,500 L 272,510 L 324,500 L 372,360 C 346,332 304,308 272,300 Z' },

  // ═══ REAR DELTS — full back-of-shoulder cap (matches front delts) ═══
  { key: 'rearDelt',
    d: 'M 220,322 C 184,326 152,346 138,378 C 134,406 144,432 168,436 C 200,438 226,422 232,398 C 234,360 228,332 220,322 Z' },
  { key: 'rearDelt',
    d: 'M 324,322 C 360,326 392,346 406,378 C 410,406 400,432 376,436 C 344,438 318,422 312,398 C 310,360 316,332 324,322 Z' },

  // ═══ TRICEPS — 3 heads (lateral / long / medial) fills full upper arm ═══
  // L lateral head (outer column)
  { key: 'triceps',
    d: 'M 152,438 C 132,470 124,540 142,580 C 158,594 170,592 172,580 C 174,540 174,478 172,440 C 168,432 158,432 152,438 Z' },
  // L long head (middle column)
  { key: 'triceps',
    d: 'M 176,438 L 192,438 L 192,584 C 184,592 178,590 174,584 L 174,440 Z' },
  // L medial head (inner, peeks at lower elbow)
  { key: 'triceps',
    d: 'M 196,438 C 208,470 218,520 220,562 C 218,592 206,602 196,602 L 196,438 Z' },
  // R lateral head
  { key: 'triceps',
    d: 'M 392,438 C 412,470 420,540 402,580 C 386,594 374,592 372,580 C 370,540 370,478 372,440 C 376,432 386,432 392,438 Z' },
  // R long head
  { key: 'triceps',
    d: 'M 368,438 L 352,438 L 352,584 C 360,592 366,590 370,584 L 370,440 Z' },
  // R medial head
  { key: 'triceps',
    d: 'M 348,438 C 336,470 326,520 324,562 C 326,592 338,602 348,602 L 348,438 Z' },

  // ═══ FOREARMS (back) — same tapered shape as front ═══
  { key: 'forearms',
    d: 'M 152,608 C 130,650 124,720 138,775 C 152,798 178,805 198,798 C 212,750 218,680 208,615 C 192,602 168,602 152,608 Z' },
  { key: 'forearms',
    d: 'M 392,608 C 414,650 420,720 406,775 C 392,798 366,805 346,798 C 332,750 326,680 336,615 C 352,602 376,602 392,608 Z' },

  // ═══ LATS — full V-taper wings + teres major bumps ═══
  // L lat wing
  { key: 'lats',
    d: 'M 268,478 L 268,728 C 246,736 224,732 212,720 C 204,690 198,650 200,608 C 204,560 212,520 226,490 C 240,478 254,476 268,478 Z' },
  // L teres major (top of lat near posterior delt)
  { key: 'lats',
    d: 'M 222,452 C 210,458 202,470 208,480 C 222,488 240,482 244,472 C 240,458 230,450 222,452 Z' },
  // R lat wing
  { key: 'lats',
    d: 'M 276,478 L 276,728 C 298,736 320,732 332,720 C 340,690 346,650 344,608 C 340,560 332,520 318,490 C 304,478 290,476 276,478 Z' },
  // R teres major
  { key: 'lats',
    d: 'M 322,452 C 334,458 342,470 336,480 C 322,488 304,482 300,472 C 304,458 314,450 322,452 Z' },

  // ═══ UPPER BACK / RHOMBOIDS — between scapulae ═══
  { key: 'upperBack',
    d: 'M 244,485 C 252,492 292,492 300,485 L 304,620 C 296,628 248,628 240,620 Z' },

  // ═══ LOWER BACK — erector spinae columns ═══
  // L column
  { key: 'lowerBack',
    d: 'M 244,728 C 240,752 240,810 244,860 C 252,866 268,866 271,860 L 271,728 Z' },
  // R column
  { key: 'lowerBack',
    d: 'M 300,728 C 304,752 304,810 300,860 C 292,866 276,866 273,860 L 273,728 Z' },

  // ═══ GLUTES — round buttock per side (matching the user's circle outlines) ═══
  // L glute (round / oval)
  { key: 'glutes',
    d: 'M 270,872 L 270,1014 C 246,1020 222,1010 212,990 C 204,962 206,920 218,890 C 232,876 254,872 270,872 Z' },
  // R glute (round / oval)
  { key: 'glutes',
    d: 'M 274,872 L 274,1014 C 298,1020 322,1010 332,990 C 340,962 338,920 326,890 C 312,876 290,872 274,872 Z' },

  // ═══ HAMSTRINGS — biceps femoris + semitendinosus per leg ═══
  // L biceps femoris (outer)
  { key: 'hamstrings',
    d: 'M 222,1018 C 215,1060 215,1130 222,1185 C 232,1192 244,1190 248,1180 C 250,1140 250,1080 248,1024 Z' },
  // L semitendinosus (inner)
  { key: 'hamstrings',
    d: 'M 252,1024 C 254,1080 254,1140 252,1180 C 256,1190 266,1192 270,1185 C 272,1140 272,1080 270,1018 Z' },
  // R biceps femoris
  { key: 'hamstrings',
    d: 'M 322,1018 C 329,1060 329,1130 322,1185 C 312,1192 300,1190 296,1180 C 294,1140 294,1080 296,1024 Z' },
  // R semitendinosus
  { key: 'hamstrings',
    d: 'M 292,1024 C 290,1080 290,1140 292,1180 C 288,1190 278,1192 274,1185 C 272,1140 272,1080 274,1018 Z' },

  // ═══ CALVES — gastrocnemius medial + lateral heads, diamond shape ═══
  // L medial head (inner, larger bulge)
  { key: 'calves',
    d: 'M 248,1228 C 256,1260 264,1320 260,1380 C 254,1412 246,1420 240,1416 C 232,1378 232,1318 238,1264 C 240,1240 244,1228 248,1228 Z' },
  // L lateral head (outer)
  { key: 'calves',
    d: 'M 232,1228 C 224,1260 220,1320 224,1380 C 228,1412 236,1420 242,1416 C 244,1378 244,1318 240,1264 C 238,1240 236,1228 232,1228 Z' },
  // R medial head
  { key: 'calves',
    d: 'M 296,1228 C 288,1260 280,1320 284,1380 C 290,1412 298,1420 304,1416 C 312,1378 312,1318 306,1264 C 304,1240 300,1228 296,1228 Z' },
  // R lateral head
  { key: 'calves',
    d: 'M 312,1228 C 320,1260 324,1320 320,1380 C 316,1412 308,1420 302,1416 C 300,1378 300,1318 304,1264 C 306,1240 308,1228 312,1228 Z' },
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
function BodyView({ side, regions, pri, sec, imgX, maskId }) {
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
          {/* Tight blur — softens edges within the muscle, but small enough
              that colour stays inside its polygon. */}
          <filter id="muscle-glow-pri" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="muscle-glow-sec" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="2" />
          </filter>

          {/* Body silhouette mask — uses the photo's luminance as alpha so
              everything inside the masked group renders ONLY on body
              pixels. The dark navy background (~RGB 13,21,36) is near-black
              and clips out, so highlights physically cannot leak past the
              body's edge. */}
          <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width={HALF_W} height={IMG_H}>
            <image
              href="/muscles/body.png"
              x={imgX} y="0" width="1024" height={IMG_H}
              preserveAspectRatio="xMidYMid meet"
            />
          </mask>
        </defs>

        {/* Body photo (bottom layer) */}
        <image
          href="/muscles/body.png"
          x={imgX} y="0" width="1024" height={IMG_H}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* All muscle highlights wrapped in body-shaped mask — colours
            cannot leak past the body silhouette. */}
        <g mask={`url(#${maskId})`}>
          {regions.map((r, i) => (
            <MuscleOverlay
              key={`${r.key}-${i}`}
              region={r}
              isPri={pri.has(r.key)}
              isSec={sec.has(r.key)}
            />
          ))}
        </g>

        {/* DEBUG: label each region with its key (drawn outside the mask
            so labels are visible against the background) */}
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
        <BodyView side="Front" regions={FRONT_REGIONS} pri={pri} sec={sec} imgX={0} maskId="bodyMaskFront" />
        {/* Back view: image shifted -512 (right half visible) */}
        <BodyView side="Back"  regions={BACK_REGIONS}  pri={pri} sec={sec} imgX={-HALF_W} maskId="bodyMaskBack" />
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
