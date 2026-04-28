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
// Each path is a true anatomical silhouette — pec fan, bicep spindle, six
// distinct ab blocks, gastrocnemius diamond, etc. — so the highlight reads
// as a real muscle rather than a coloured rectangle. Compound groups (abs,
// quads, hamstrings, calves, triceps, biceps) are split into multiple
// sub-paths that share the same key so they activate together.
const FRONT_REGIONS = [
  // ─── CHEST — pec major fan (each side separate, clear sternum gap) ───
  // Left pec: fan shape converging at the humerus
  { key: 'chest',
    d: 'M 266,358 L 266,478 C 246,486 224,485 208,475 C 196,455 192,418 200,392 C 215,370 244,360 266,358 Z' },
  // Right pec: mirror
  { key: 'chest',
    d: 'M 278,358 L 278,478 C 298,486 320,485 336,475 C 348,455 352,418 344,392 C 329,370 300,360 278,358 Z' },

  // ─── FRONT DELTS — rounded triangular shoulder caps ───
  { key: 'frontDelt',
    d: 'M 218,320 C 188,326 158,342 142,372 C 138,400 148,425 168,430 C 200,430 225,418 230,395 C 232,360 226,332 218,320 Z' },
  { key: 'frontDelt',
    d: 'M 326,320 C 356,326 386,342 402,372 C 406,400 396,425 376,430 C 344,430 319,418 314,395 C 312,360 318,332 326,320 Z' },

  // ─── BICEPS — long-head + short-head spindles per arm ───
  // L long head (outer/lateral peak)
  { key: 'biceps',
    d: 'M 158,420 C 144,460 142,538 156,580 C 168,590 180,588 184,578 C 188,540 188,478 184,438 C 178,422 168,418 158,420 Z' },
  // L short head (inner/medial)
  { key: 'biceps',
    d: 'M 188,420 C 196,440 200,490 200,540 C 198,572 188,588 178,584 C 174,540 174,480 178,438 C 182,425 186,420 188,420 Z' },
  // R long head
  { key: 'biceps',
    d: 'M 386,420 C 400,460 402,538 388,580 C 376,590 364,588 360,578 C 356,540 356,478 360,438 C 366,422 376,418 386,420 Z' },
  // R short head
  { key: 'biceps',
    d: 'M 356,420 C 348,440 344,490 344,540 C 346,572 356,588 366,584 C 370,540 370,480 366,438 C 362,425 358,420 356,420 Z' },

  // ─── FOREARMS — brachioradialis bulge then tapered to wrist ───
  // L (wider near elbow, narrows toward wrist)
  { key: 'forearms',
    d: 'M 148,608 C 132,660 130,728 144,778 C 158,800 180,800 192,790 C 204,750 206,680 198,618 C 184,602 162,602 148,608 Z' },
  // R mirror
  { key: 'forearms',
    d: 'M 396,608 C 412,660 414,728 400,778 C 386,800 364,800 352,790 C 340,750 338,680 346,618 C 360,602 382,602 396,608 Z' },

  // ─── ABS — six distinct rectus abdominis blocks + lower V triangle ───
  // Top L
  { key: 'abs',
    d: 'M 240,478 L 270,478 L 270,520 L 240,522 Z' },
  // Top R
  { key: 'abs',
    d: 'M 274,478 L 304,478 L 304,522 L 274,520 Z' },
  // Mid L
  { key: 'abs',
    d: 'M 238,528 L 270,528 L 270,572 L 238,572 Z' },
  // Mid R
  { key: 'abs',
    d: 'M 274,528 L 306,528 L 306,572 L 274,572 Z' },
  // Lower L (above navel)
  { key: 'abs',
    d: 'M 236,578 L 270,578 L 270,624 L 236,624 Z' },
  // Lower R
  { key: 'abs',
    d: 'M 274,578 L 308,578 L 308,624 L 274,624 Z' },
  // Lower V triangle (below navel, above shorts)
  { key: 'abs',
    d: 'M 240,630 L 304,630 L 290,690 L 254,690 Z' },

  // ─── OBLIQUES — angled flanks alongside abs ───
  { key: 'obliques',
    d: 'M 196,490 C 192,540 192,615 200,668 C 218,672 232,650 232,612 L 232,500 Z' },
  { key: 'obliques',
    d: 'M 348,490 C 352,540 352,615 344,668 C 326,672 312,650 312,612 L 312,500 Z' },

  // ─── QUADS — rectus femoris + vastus lateralis + VM teardrop per leg ───
  // L vastus lateralis (outer)
  { key: 'quads',
    d: 'M 244,910 C 250,950 252,1010 250,1060 C 244,1085 224,1090 214,1080 C 210,1040 210,980 215,930 Z' },
  // L rectus femoris (centre stripe, runs full thigh)
  { key: 'quads',
    d: 'M 222,910 L 248,910 C 252,955 252,1015 248,1065 C 244,1080 230,1082 224,1075 C 218,1020 218,960 222,910 Z' },
  // L vastus medialis teardrop (above knee, inner)
  { key: 'quads',
    d: 'M 244,1060 C 250,1075 254,1090 252,1098 C 244,1102 232,1098 228,1088 C 232,1075 238,1062 244,1060 Z' },
  // R vastus lateralis
  { key: 'quads',
    d: 'M 300,910 C 294,950 292,1010 294,1060 C 300,1085 320,1090 330,1080 C 334,1040 334,980 329,930 Z' },
  // R rectus femoris
  { key: 'quads',
    d: 'M 296,910 L 322,910 C 326,955 326,1015 322,1065 C 318,1080 304,1082 298,1075 C 292,1020 292,960 296,910 Z' },
  // R vastus medialis teardrop
  { key: 'quads',
    d: 'M 300,1060 C 294,1075 290,1090 292,1098 C 300,1102 312,1098 316,1088 C 312,1075 306,1062 300,1060 Z' },

  // ─── TIBIALIS — narrow strip down the outer shin ───
  { key: 'tibialis',
    d: 'M 230,1180 C 228,1240 228,1320 234,1395 C 244,1402 256,1402 262,1390 C 264,1320 264,1240 258,1180 Z' },
  { key: 'tibialis',
    d: 'M 286,1180 C 284,1240 284,1320 290,1395 C 300,1402 312,1402 318,1390 C 320,1320 320,1240 314,1180 Z' },
];

// Back-view regions also use 0..512 coords (the SVG offsets the image so the
// right half of the PNG is shown in the same coordinate space).
const BACK_REGIONS = [
  // ─── TRAPEZIUS — kite/diamond from neck base to mid-back ───
  { key: 'traps',
    d: 'M 272,300 C 250,310 224,332 220,360 C 218,400 224,460 244,496 L 272,508 L 300,496 C 320,460 326,400 324,360 C 320,332 294,310 272,300 Z' },

  // ─── REAR DELTS — same triangular caps as front ───
  { key: 'rearDelt',
    d: 'M 218,320 C 188,326 158,342 142,372 C 138,400 148,425 168,430 C 200,430 225,418 230,395 C 232,360 226,332 218,320 Z' },
  { key: 'rearDelt',
    d: 'M 326,320 C 356,326 386,342 402,372 C 406,400 396,425 376,430 C 344,430 319,418 314,395 C 312,360 318,332 326,320 Z' },

  // ─── TRICEPS — three-head horseshoe per arm ───
  // L lateral head (outer)
  { key: 'triceps',
    d: 'M 158,420 C 144,460 142,540 156,580 C 168,590 178,588 180,575 C 182,540 182,480 178,440 C 172,422 164,418 158,420 Z' },
  // L long head (middle)
  { key: 'triceps',
    d: 'M 184,420 C 188,460 190,538 188,575 C 184,584 178,584 174,580 L 174,440 C 178,425 182,420 184,420 Z' },
  // L medial head (inner, lower)
  { key: 'triceps',
    d: 'M 188,500 C 196,520 202,560 200,580 C 196,592 184,594 180,584 C 180,556 184,524 186,505 Z' },
  // R lateral head
  { key: 'triceps',
    d: 'M 386,420 C 400,460 402,540 388,580 C 376,590 366,588 364,575 C 362,540 362,480 366,440 C 372,422 380,418 386,420 Z' },
  // R long head
  { key: 'triceps',
    d: 'M 360,420 C 356,460 354,538 356,575 C 360,584 366,584 370,580 L 370,440 C 366,425 362,420 360,420 Z' },
  // R medial head
  { key: 'triceps',
    d: 'M 356,500 C 348,520 342,560 344,580 C 348,592 360,594 364,584 C 364,556 360,524 358,505 Z' },

  // ─── FOREARMS (back) — same tapered shape as front ───
  { key: 'forearms',
    d: 'M 148,608 C 132,660 130,728 144,778 C 158,800 180,800 192,790 C 204,750 206,680 198,618 C 184,602 162,602 148,608 Z' },
  { key: 'forearms',
    d: 'M 396,608 C 412,660 414,728 400,778 C 386,800 364,800 352,790 C 340,750 338,680 346,618 C 360,602 382,602 396,608 Z' },

  // ─── LATS — V-taper wings + teres major bumps ───
  // L lat wing
  { key: 'lats',
    d: 'M 268,475 L 268,725 C 250,732 230,728 218,718 C 210,690 206,648 208,608 C 212,560 218,520 230,490 C 244,478 256,475 268,475 Z' },
  // L teres major bump (top of lat near armpit)
  { key: 'lats',
    d: 'M 218,455 C 208,460 200,470 204,478 C 218,484 234,478 238,470 C 234,458 224,452 218,455 Z' },
  // R lat wing
  { key: 'lats',
    d: 'M 276,475 L 276,725 C 294,732 314,728 326,718 C 334,690 338,648 336,608 C 332,560 326,520 314,490 C 300,478 288,475 276,475 Z' },
  // R teres major bump
  { key: 'lats',
    d: 'M 326,455 C 336,460 344,470 340,478 C 326,484 310,478 306,470 C 310,458 320,452 326,455 Z' },

  // ─── UPPER BACK — rhomboids between scapulae ───
  { key: 'upperBack',
    d: 'M 244,485 C 252,492 292,492 300,485 L 304,620 C 296,628 248,628 240,620 Z' },

  // ─── LOWER BACK — erector spinae columns + thoracolumbar fascia ───
  // L erector column
  { key: 'lowerBack',
    d: 'M 244,725 C 240,752 240,810 244,860 C 252,866 268,866 272,860 L 272,725 Z' },
  // R erector column
  { key: 'lowerBack',
    d: 'M 300,725 C 304,752 304,810 300,860 C 292,866 276,866 272,860 L 272,725 Z' },

  // ─── GLUTES — rounded buttock shape per side ───
  { key: 'glutes',
    d: 'M 224,872 C 214,890 210,950 218,1000 C 230,1015 256,1018 268,1010 L 268,872 Z' },
  { key: 'glutes',
    d: 'M 320,872 C 330,890 334,950 326,1000 C 314,1015 288,1018 276,1010 L 276,872 Z' },

  // ─── HAMSTRINGS — biceps femoris (outer) + semitendinosus (inner) ───
  // L biceps femoris (outer)
  { key: 'hamstrings',
    d: 'M 218,1015 C 212,1060 212,1130 220,1180 C 232,1190 246,1188 248,1178 C 248,1140 248,1080 248,1020 Z' },
  // L semitendinosus (inner)
  { key: 'hamstrings',
    d: 'M 252,1020 C 254,1080 254,1140 252,1180 C 256,1190 268,1190 270,1180 C 272,1140 272,1080 270,1020 Z' },
  // R biceps femoris
  { key: 'hamstrings',
    d: 'M 326,1015 C 332,1060 332,1130 324,1180 C 312,1190 298,1188 296,1178 C 296,1140 296,1080 296,1020 Z' },
  // R semitendinosus
  { key: 'hamstrings',
    d: 'M 292,1020 C 290,1080 290,1140 292,1180 C 288,1190 276,1190 274,1180 C 272,1140 272,1080 274,1020 Z' },

  // ─── CALVES — gastrocnemius medial + lateral heads (diamond shape) ───
  // L medial gastroc (inner head, larger bulge)
  { key: 'calves',
    d: 'M 248,1228 C 256,1260 262,1320 258,1380 C 254,1410 246,1420 240,1418 C 234,1380 234,1320 238,1264 C 240,1240 244,1228 248,1228 Z' },
  // L lateral gastroc (outer head)
  { key: 'calves',
    d: 'M 232,1228 C 224,1260 222,1320 226,1380 C 230,1410 238,1420 244,1418 C 248,1380 248,1320 244,1264 C 240,1240 236,1228 232,1228 Z' },
  // R medial gastroc
  { key: 'calves',
    d: 'M 296,1228 C 288,1260 282,1320 286,1380 C 290,1410 298,1420 304,1418 C 310,1380 310,1320 306,1264 C 304,1240 300,1228 296,1228 Z' },
  // R lateral gastroc
  { key: 'calves',
    d: 'M 312,1228 C 320,1260 322,1320 318,1380 C 314,1410 306,1420 300,1418 C 296,1380 296,1320 300,1264 C 304,1240 308,1228 312,1228 Z' },
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
