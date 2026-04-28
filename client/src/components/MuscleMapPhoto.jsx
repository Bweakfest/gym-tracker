// ─────────────────────────────────────────────────────────────────────────
// MuscleMap — built on react-body-highlighter, polished UI layer
// ─────────────────────────────────────────────────────────────────────────
//
// • Library handles the anatomical SVG (every muscle is a defined path,
//   highlights stay inside their muscle by construction).
// • This wrapper layers in: stage-light radial backdrop, drop-shadow for
//   depth, custom dark-theme body colour, vivid activation colours, and
//   a CSS pulse animation on activated muscle paths.
// ─────────────────────────────────────────────────────────────────────────

import { Component, useEffect, useRef } from 'react';
import Model from 'react-body-highlighter';

// Error boundary: if anything inside the muscle map crashes, render a small
// fallback instead of taking down the entire workouts page.
class MuscleMapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.warn('[MuscleMap] crashed:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '1rem',
          marginBottom: '0.75rem',
        }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: 'var(--text-primary)' }}>
            Muscles Worked
          </h3>
          <div style={{ fontSize: 12, color: '#f87171' }}>
            Couldn&apos;t render the muscle map. {String(this.state.error?.message || this.state.error)}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

const KEY_TO_LIB = {
  chest: 'chest',
  lats: 'upper-back',
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

const PRIMARY   = '#fb923c';   // orange
const SECONDARY = '#3b82f6';   // blue
const BODY_COLOUR = '#334155'; // dark slate, sits well on dark UI

const toLibList = (set) => {
  const out = new Set();
  set.forEach(k => { const lib = KEY_TO_LIB[k]; if (lib) out.add(lib); });
  return [...out];
};

// Inject styling CSS once (the library uses <polygon> with inline style.fill,
// so the selectors target style attribute substrings).
function useMuscleStyles() {
  const injected = useRef(false);
  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    const css = `
      @keyframes nx-muscle-pulse {
        0%, 100% { opacity: 0.95; }
        50%      { opacity: 0.7; }
      }
      .nx-musclemap-svg polygon[style*="rgb(251, 146, 60)"],
      .nx-musclemap-svg polygon[style*="rgb(59, 130, 246)"] {
        animation: nx-muscle-pulse 2.4s ease-in-out infinite;
        transition: fill 0.4s ease;
      }
      .nx-musclemap-svg svg {
        overflow: visible;
        filter: drop-shadow(0 6px 18px rgba(0,0,0,0.35));
      }
      .nx-musclemap-stage {
        position: relative;
        padding: 14px 8px 18px;
        border-radius: 18px;
        background:
          radial-gradient(ellipse at 50% 28%, rgba(251,146,60,0.10), transparent 55%),
          radial-gradient(ellipse at 50% 70%, rgba(59,130,246,0.08), transparent 55%);
      }
      .nx-musclemap-stage::before {
        content: '';
        position: absolute; inset: 0;
        border-radius: 18px;
        border: 1px solid rgba(74,158,255,0.08);
        pointer-events: none;
      }
    `;
    const tag = document.createElement('style');
    tag.setAttribute('data-source', 'nexero-musclemap');
    tag.textContent = css;
    document.head.appendChild(tag);
  }, []);
}

// The library's calves polygon has tapered tails that extend down to Y≈200
// while the feet polygons go to Y≈220. When the calves are highlighted
// those orange tails poke past the visible foot/heel area. We trim the
// bottom of any highlighted polygon to Y ≤ 192 so the calves end flat
// inside their muscle zone instead of sticking out.
function useFlattenCalfTails(deps) {
  useEffect(() => {
    const flatten = () => {
      const polys = document.querySelectorAll('.nx-musclemap-svg polygon');
      polys.forEach(p => {
        const fill = p.style.fill || '';
        const isHighlight = fill.includes('251, 146') || fill.includes('59, 130');
        if (!isHighlight) return;
        if (p.dataset.nxFlattened === '1') return;
        const points = p.getAttribute('points');
        if (!points) return;
        const nums = points.split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
        let changed = false;
        const out = [];
        for (let i = 0; i < nums.length; i += 2) {
          const x = nums[i];
          let y = nums[i + 1];
          if (y > 192) { y = 192; changed = true; }
          out.push(`${x},${y}`);
        }
        if (changed) p.setAttribute('points', out.join(' '));
        p.dataset.nxFlattened = '1';
      });
    };
    flatten();
    // Library may re-render on prop change — run again on the next frame too.
    const id = requestAnimationFrame(flatten);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── A single body view (front or back) inside its lit stage ───────────────
function BodyStage({ side, type, data }) {
  return (
    <div style={viewStyle}>
      <div style={viewLabelStyle}>{side}</div>
      <div className="nx-musclemap-stage">
        <div className="nx-musclemap-svg">
          <Model
            type={type}
            data={data}
            highlightedColors={[SECONDARY, PRIMARY]}
            bodyColor={BODY_COLOUR}
            style={{ width: '100%', maxWidth: 220, display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function MuscleMap(props) {
  return (
    <MuscleMapErrorBoundary>
      <MuscleMapInner {...props} />
    </MuscleMapErrorBoundary>
  );
}

function MuscleMapInner({ workouts = [] }) {
  useMuscleStyles();

  const pri = new Set();
  const sec = new Set();
  workouts.forEach(w => {
    const { primary, secondary } = deriveMuscleTags(w.group || '', w.muscles || '');
    primary.forEach(m => pri.add(m));
    secondary.forEach(m => { if (!pri.has(m)) sec.add(m); });
  });

  const priLibList = toLibList(pri);
  const secLibList = toLibList(sec).filter(m => !priLibList.includes(m));

  // Frequency trick: secondary appears once (freq=1 → blue), primary twice
  // (freq=2 → orange).
  const data = [];
  if (secLibList.length) data.push({ name: 'Secondary', muscles: secLibList });
  if (priLibList.length) {
    data.push({ name: 'Primary',     muscles: priLibList });
    data.push({ name: 'PrimaryBoost', muscles: priLibList });
  }

  // After the library renders, flatten any pointed bottom of highlighted
  // polygons (calf tails) so highlights stay inside their muscle zone.
  useFlattenCalfTails([priLibList.join(','), secLibList.join(',')]);

  const hasActivity = pri.size > 0 || sec.size > 0;
  const totalGroups = pri.size + sec.size;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={h3Style}>Muscles Worked</h3>
        {hasActivity ? (
          <span style={countBadgeStyle}>{totalGroups} active</span>
        ) : (
          <span style={emptyStyle}>Log exercises to see activation</span>
        )}
      </div>

      <div style={bodyRowStyle}>
        <BodyStage side="Front" type="anterior"  data={data} />
        <BodyStage side="Back"  type="posterior" data={data} />
      </div>

      <div style={legendStyle}>
        <div style={legendItemStyle}>
          <span style={{ ...dotBase, background: PRIMARY,   boxShadow: `0 0 8px ${PRIMARY}88` }} />
          <span>Primary</span>
        </div>
        <div style={legendItemStyle}>
          <span style={{ ...dotBase, background: SECONDARY, boxShadow: `0 0 8px ${SECONDARY}88` }} />
          <span>Secondary</span>
        </div>
      </div>

      {hasActivity && (
        <div style={statsStyle}>
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
  background:
    'linear-gradient(180deg, rgba(15,23,42,0.6), rgba(15,23,42,0.85)), var(--bg-card)',
  border: '1px solid rgba(74,158,255,0.12)',
  borderRadius: 16,
  padding: '1.1rem 1rem 0.9rem',
  marginBottom: '0.75rem',
  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.25)',
};
const headerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: '0.85rem',
};
const h3Style = {
  margin: 0,
  fontSize: '1.05rem',
  color: 'var(--text-primary)',
  fontWeight: 700,
  letterSpacing: '-0.01em',
};
const emptyStyle = {
  fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic',
};
const countBadgeStyle = {
  fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '4px 9px', borderRadius: 999,
  background: 'rgba(251,146,60,0.12)', color: '#fb923c',
  border: '1px solid rgba(251,146,60,0.25)',
};
const bodyRowStyle = {
  display: 'flex', gap: 6, justifyContent: 'center',
  flexWrap: 'wrap', alignItems: 'flex-start',
};
const viewStyle = {
  flex: '1 1 0',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  minWidth: 150,
};
const viewLabelStyle = {
  fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.16em', color: '#94a3b8',
};
const legendStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 18, marginTop: '0.6rem', paddingTop: '0.7rem',
  borderTop: '1px solid rgba(255,255,255,0.06)',
};
const legendItemStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600,
};
const dotBase = {
  width: 10, height: 10, borderRadius: '50%',
  display: 'inline-block', flexShrink: 0,
};
const statsStyle = {
  marginTop: '0.6rem', paddingTop: '0.6rem',
  borderTop: '1px solid rgba(255,255,255,0.06)',
};
const pillContainerStyle = { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' };
function pillStyle(isPrimary) {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 10px', borderRadius: 999,
    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em',
    background: isPrimary ? 'rgba(251,146,60,0.16)' : 'rgba(59,130,246,0.14)',
    color: isPrimary ? '#fb923c' : '#93c5fd',
    border: `1px solid ${isPrimary ? 'rgba(251,146,60,0.32)' : 'rgba(59,130,246,0.28)'}`,
  };
}
