// ─────────────────────────────────────────────────────────────────────────
// MuscleMap — built on react-body-highlighter
// ─────────────────────────────────────────────────────────────────────────
//
// Replaces the photo-based SVG-overlay approach. The library ships a
// pre-drawn anatomical body where every muscle is a defined SVG path, so
// activation highlights are constrained to the actual muscle shape with
// zero spillover possible.
//
// Activation colours:
//   • Primary muscles glow ORANGE (#fb923c)
//   • Secondary muscles glow BLUE  (#60a5fa)
//
// We achieve the two-colour scheme by exploiting the library's frequency
// model: muscles in 2 data entries get highlightedColors[1] (orange);
// muscles in 1 entry get highlightedColors[0] (blue). So we add primary
// muscles twice and secondary muscles once.
// ─────────────────────────────────────────────────────────────────────────

import Model from 'react-body-highlighter';

// ── Activation logic ──────────────────────────────────────────────────────
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

// Map our internal keys → react-body-highlighter muscle names.
// The library has its own taxonomy; some of our keys collapse to the
// nearest equivalent.
const KEY_TO_LIB = {
  chest: 'chest',
  lats: 'upper-back',          // library doesn't separate lats from upper-back
  traps: 'trapezius',
  upperBack: 'upper-back',
  lowerBack: 'lower-back',
  frontDelt: 'front-deltoids',
  rearDelt: 'back-deltoids',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearm',
  abs: 'abs',
  obliques: 'obliques',
  quads: 'quadriceps',
  hamstrings: 'hamstring',
  glutes: 'gluteal',
  calves: 'calves',
};

function toLibList(set) {
  const out = new Set();
  set.forEach(k => {
    const lib = KEY_TO_LIB[k];
    if (lib) out.add(lib);
  });
  return [...out];
}

// ── Main component ────────────────────────────────────────────────────────
export default function MuscleMap({ workouts = [] }) {
  const pri = new Set();
  const sec = new Set();
  workouts.forEach(w => {
    const { primary, secondary } = deriveMuscleTags(w.group || '', w.muscles || '');
    primary.forEach(m => pri.add(m));
    secondary.forEach(m => { if (!pri.has(m)) sec.add(m); });
  });

  const priLibList = toLibList(pri);
  // Drop secondary muscles that are also in primary so they don't fight.
  const secLibList = toLibList(sec).filter(m => !priLibList.includes(m));

  // Library frequency trick:
  //   • Secondary muscles appear ONCE  → freq=1 → highlightedColors[0] (blue)
  //   • Primary muscles appear TWICE   → freq=2 → highlightedColors[1] (orange)
  const data = [];
  if (secLibList.length) {
    data.push({ name: 'Secondary', muscles: secLibList });
  }
  if (priLibList.length) {
    data.push({ name: 'Primary',     muscles: priLibList });
    data.push({ name: 'PrimaryBoost', muscles: priLibList });
  }
  const highlightedColors = ['#60a5fa', '#fb923c'];
  const bodyColor = '#475569';

  const hasActivity = pri.size > 0 || sec.size > 0;
  const totalGroups = pri.size + sec.size;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={h3Style}>Muscles Worked</h3>
        {!hasActivity && <span style={emptyStyle}>Log exercises to see activation</span>}
      </div>

      <div style={bodyStyle}>
        <div style={viewStyle}>
          <div style={viewLabelStyle}>Front</div>
          <Model
            type="anterior"
            data={data}
            highlightedColors={highlightedColors}
            bodyColor={bodyColor}
            style={{ width: '100%', maxWidth: 200, padding: '0 4px' }}
          />
        </div>
        <div style={viewStyle}>
          <div style={viewLabelStyle}>Back</div>
          <Model
            type="posterior"
            data={data}
            highlightedColors={highlightedColors}
            bodyColor={bodyColor}
            style={{ width: '100%', maxWidth: 200, padding: '0 4px' }}
          />
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
      </div>

      {hasActivity && (
        <div style={statsStyle}>
          <div style={statsCountStyle}>
            <strong style={{ color: 'var(--text-primary)' }}>{totalGroups}</strong>{' '}
            muscle group{totalGroups !== 1 ? 's' : ''} targeted
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

// ── Styles ────────────────────────────────────────────────────────────────
const containerStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '1rem',
  marginBottom: '0.75rem',
};
const headerStyle = { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' };
const h3Style = { margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 };
const emptyStyle = { fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' };
const bodyStyle = { display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'flex-start' };
const viewStyle = {
  flex: '1 1 0',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  minWidth: 140,
};
const viewLabelStyle = {
  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--text-muted)',
};
const legendStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 16, marginTop: '0.75rem', paddingTop: '0.6rem',
  borderTop: '1px solid var(--border)',
};
const legendItemStyle = { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-secondary)' };
const dotBase = { width: 10, height: 10, borderRadius: '50%', display: 'inline-block', flexShrink: 0 };
const statsStyle = { marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' };
const statsCountStyle = { fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' };
const pillContainerStyle = { display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' };
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
