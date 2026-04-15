import { useState } from 'react';

// Animated exercise illustrations. Each preset is a small SVG "person" doing the exercise,
// with the primary muscle highlighted as it contracts during the rep. Uses SVG SMIL
// animations so everything runs smoothly in the browser without extra deps.

const PRIMARY = '#f97316';
const SECONDARY = '#3b82f6';
const BODY = '#94a3b8';
const OUTLINE = '#475569';

// ─── Bench Press ─────────────────────────────────────────────────────────────
function BenchPress() {
  return (
    <svg viewBox="0 0 320 220" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="bpBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1f35" />
          <stop offset="100%" stopColor="#050a14" />
        </linearGradient>
      </defs>
      <rect width="320" height="220" fill="url(#bpBg)" rx="10" />

      {/* Bench */}
      <rect x="60" y="140" width="200" height="14" fill="#1e293b" stroke={OUTLINE} />
      <rect x="68" y="154" width="8" height="40" fill="#1e293b" />
      <rect x="244" y="154" width="8" height="40" fill="#1e293b" />

      {/* Body lying on bench */}
      {/* Head */}
      <circle cx="90" cy="130" r="10" fill={BODY} stroke={OUTLINE} strokeWidth="1.2" />
      {/* Torso (chest highlighted) */}
      <ellipse cx="155" cy="135" rx="42" ry="14" fill={PRIMARY} stroke="#fb923c" strokeWidth="1.2">
        <animate attributeName="fill-opacity"
          values="0.55;1;0.55" dur="2s" repeatCount="indefinite" />
        <animate attributeName="rx"
          values="42;44;42" dur="2s" repeatCount="indefinite" />
      </ellipse>
      {/* Hips */}
      <ellipse cx="210" cy="138" rx="16" ry="11" fill={BODY} stroke={OUTLINE} strokeWidth="1.2" />
      {/* Legs */}
      <line x1="220" y1="138" x2="260" y2="170" stroke={BODY} strokeWidth="10" strokeLinecap="round" />
      <line x1="260" y1="170" x2="262" y2="200" stroke={BODY} strokeWidth="10" strokeLinecap="round" />

      {/* Arms (animating) */}
      <g>
        {/* Left arm (upper) */}
        <line stroke={SECONDARY} strokeWidth="7" strokeLinecap="round">
          <animate attributeName="x1" values="140;140;140" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y1" values="128;128;128" dur="2s" repeatCount="indefinite" />
          <animate attributeName="x2" values="130;130;130" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="100;80;100" dur="2s" repeatCount="indefinite" />
        </line>
        {/* Left forearm */}
        <line stroke={SECONDARY} strokeWidth="6" strokeLinecap="round">
          <animate attributeName="x1" values="130;130;130" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y1" values="100;80;100" dur="2s" repeatCount="indefinite" />
          <animate attributeName="x2" values="130;130;130" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="70;40;70" dur="2s" repeatCount="indefinite" />
        </line>
        {/* Right arm (upper) */}
        <line stroke={SECONDARY} strokeWidth="7" strokeLinecap="round">
          <animate attributeName="x1" values="170;170;170" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y1" values="128;128;128" dur="2s" repeatCount="indefinite" />
          <animate attributeName="x2" values="180;180;180" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="100;80;100" dur="2s" repeatCount="indefinite" />
        </line>
        <line stroke={SECONDARY} strokeWidth="6" strokeLinecap="round">
          <animate attributeName="x1" values="180;180;180" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y1" values="100;80;100" dur="2s" repeatCount="indefinite" />
          <animate attributeName="x2" values="180;180;180" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="70;40;70" dur="2s" repeatCount="indefinite" />
        </line>
      </g>

      {/* Barbell */}
      <line stroke="#334155" strokeWidth="4">
        <animate attributeName="y1" values="68;38;68" dur="2s" repeatCount="indefinite" />
        <animate attributeName="y2" values="68;38;68" dur="2s" repeatCount="indefinite" />
        <animate attributeName="x1" values="100;100;100" dur="2s" repeatCount="indefinite" />
        <animate attributeName="x2" values="210;210;210" dur="2s" repeatCount="indefinite" />
      </line>
      {/* Plates */}
      <g>
        <rect fill="#111827" width="10" height="32">
          <animate attributeName="y" values="52;22;52" dur="2s" repeatCount="indefinite" />
          <animate attributeName="x" values="88;88;88" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect fill="#111827" width="10" height="32">
          <animate attributeName="y" values="52;22;52" dur="2s" repeatCount="indefinite" />
          <animate attributeName="x" values="212;212;212" dur="2s" repeatCount="indefinite" />
        </rect>
      </g>

      <text x="160" y="210" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">BENCH PRESS</text>
    </svg>
  );
}

// ─── Squat ───────────────────────────────────────────────────────────────────
function Squat() {
  return (
    <svg viewBox="0 0 320 320" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="sqBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1f35" />
          <stop offset="100%" stopColor="#050a14" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill="url(#sqBg)" rx="10" />

      {/* Ground */}
      <line x1="20" y1="290" x2="300" y2="290" stroke="#334155" strokeWidth="2" />

      <g>
        {/* Head */}
        <circle r="12" fill={BODY} stroke={OUTLINE} strokeWidth="1.2">
          <animate attributeName="cx" values="160;160;160" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="cy" values="55;95;55" dur="2.2s" repeatCount="indefinite" />
        </circle>

        {/* Torso */}
        <rect width="26" height="48" rx="6" fill={BODY} stroke={OUTLINE} strokeWidth="1.2">
          <animate attributeName="x" values="147;147;147" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y" values="68;105;68" dur="2.2s" repeatCount="indefinite" />
        </rect>

        {/* Thighs (quads highlighted primary) */}
        <line stroke={PRIMARY} strokeWidth="16" strokeLinecap="round">
          <animate attributeName="x1" values="154;154;154" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y1" values="118;155;118" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="x2" values="138;124;138" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="195;215;195" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="stroke-width" values="14;18;14" dur="2.2s" repeatCount="indefinite" />
        </line>
        <line stroke={PRIMARY} strokeWidth="16" strokeLinecap="round">
          <animate attributeName="x1" values="166;166;166" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y1" values="118;155;118" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="x2" values="182;196;182" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="195;215;195" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="stroke-width" values="14;18;14" dur="2.2s" repeatCount="indefinite" />
        </line>

        {/* Shins */}
        <line stroke={BODY} strokeWidth="12" strokeLinecap="round">
          <animate attributeName="x1" values="138;124;138" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y1" values="195;215;195" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="x2" values="140;138;140" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="280;280;280" dur="2.2s" repeatCount="indefinite" />
        </line>
        <line stroke={BODY} strokeWidth="12" strokeLinecap="round">
          <animate attributeName="x1" values="182;196;182" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y1" values="195;215;195" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="x2" values="180;182;180" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="280;280;280" dur="2.2s" repeatCount="indefinite" />
        </line>

        {/* Arms holding bar */}
        <line stroke={BODY} strokeWidth="7" strokeLinecap="round">
          <animate attributeName="x1" values="150;150;150" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y1" values="75;112;75" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="x2" values="130;130;130" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="65;102;65" dur="2.2s" repeatCount="indefinite" />
        </line>
        <line stroke={BODY} strokeWidth="7" strokeLinecap="round">
          <animate attributeName="x1" values="170;170;170" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y1" values="75;112;75" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="x2" values="190;190;190" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="65;102;65" dur="2.2s" repeatCount="indefinite" />
        </line>

        {/* Barbell on back */}
        <line stroke="#334155" strokeWidth="4">
          <animate attributeName="x1" values="100;100;100" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="x2" values="220;220;220" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y1" values="65;102;65" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="65;102;65" dur="2.2s" repeatCount="indefinite" />
        </line>
        <rect fill="#111827" width="10" height="36">
          <animate attributeName="x" values="88;88;88" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y" values="47;84;47" dur="2.2s" repeatCount="indefinite" />
        </rect>
        <rect fill="#111827" width="10" height="36">
          <animate attributeName="x" values="222;222;222" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="y" values="47;84;47" dur="2.2s" repeatCount="indefinite" />
        </rect>

        {/* Glutes highlight — secondary shown as a pulsing chip near hips */}
        <ellipse fill={SECONDARY} fillOpacity="0.4" rx="10" ry="5">
          <animate attributeName="cx" values="160;160;160" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="cy" values="118;156;118" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.2;0.8;0.2" dur="2.2s" repeatCount="indefinite" />
        </ellipse>
      </g>

      <text x="160" y="310" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">BACK SQUAT</text>
    </svg>
  );
}

// ─── Barbell Curl ────────────────────────────────────────────────────────────
function Curl() {
  return (
    <svg viewBox="0 0 320 320" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="cuBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1f35" />
          <stop offset="100%" stopColor="#050a14" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill="url(#cuBg)" rx="10" />

      {/* Ground */}
      <line x1="20" y1="290" x2="300" y2="290" stroke="#334155" strokeWidth="2" />

      {/* Head */}
      <circle cx="160" cy="65" r="13" fill={BODY} stroke={OUTLINE} strokeWidth="1.2" />
      {/* Torso */}
      <rect x="147" y="78" width="26" height="90" rx="6" fill={BODY} stroke={OUTLINE} strokeWidth="1.2" />
      {/* Hips */}
      <rect x="145" y="165" width="30" height="15" fill={BODY} stroke={OUTLINE} strokeWidth="1.2" />
      {/* Legs */}
      <line x1="152" y1="180" x2="144" y2="280" stroke={BODY} strokeWidth="12" strokeLinecap="round" />
      <line x1="168" y1="180" x2="176" y2="280" stroke={BODY} strokeWidth="12" strokeLinecap="round" />

      {/* Upper arms (stable) */}
      <line x1="150" y1="98" x2="130" y2="170" stroke={BODY} strokeWidth="8" strokeLinecap="round" />
      <line x1="170" y1="98" x2="190" y2="170" stroke={BODY} strokeWidth="8" strokeLinecap="round" />

      {/* Forearms — biceps flex / extend */}
      <g>
        {/* Left forearm (biceps highlighted) */}
        <line stroke={PRIMARY} strokeWidth="9" strokeLinecap="round">
          <animate attributeName="x1" values="130;130;130" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="y1" values="170;170;170" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="x2" values="118;148;118" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="y2" values="245;110;245" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="stroke-width" values="8;12;8" dur="1.6s" repeatCount="indefinite" />
        </line>
        {/* Right forearm */}
        <line stroke={PRIMARY} strokeWidth="9" strokeLinecap="round">
          <animate attributeName="x1" values="190;190;190" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="y1" values="170;170;170" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="x2" values="202;172;202" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="y2" values="245;110;245" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="stroke-width" values="8;12;8" dur="1.6s" repeatCount="indefinite" />
        </line>
      </g>

      {/* Barbell */}
      <line stroke="#334155" strokeWidth="4">
        <animate attributeName="x1" values="90;120;90" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="x2" values="230;200;230" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="y1" values="245;110;245" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="y2" values="245;110;245" dur="1.6s" repeatCount="indefinite" />
      </line>
      <rect fill="#111827" width="10" height="30">
        <animate attributeName="x" values="82;112;82" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="y" values="230;95;230" dur="1.6s" repeatCount="indefinite" />
      </rect>
      <rect fill="#111827" width="10" height="30">
        <animate attributeName="x" values="228;198;228" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="y" values="230;95;230" dur="1.6s" repeatCount="indefinite" />
      </rect>

      <text x="160" y="310" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">BARBELL CURL</text>
    </svg>
  );
}

const EXERCISES = {
  'Bench Press':   { Component: BenchPress, primary: ['Chest'], secondary: ['Front Delt', 'Triceps'] },
  'Squat':         { Component: Squat,      primary: ['Quads'], secondary: ['Glutes', 'Hamstrings'] },
  'Barbell Curl':  { Component: Curl,       primary: ['Biceps'], secondary: ['Forearms'] },
};

export default function MuscleMapExercise() {
  const names = Object.keys(EXERCISES);
  const [choice, setChoice] = useState(names[0]);
  const { Component, primary, secondary } = EXERCISES[choice];

  return (
    <div>
      <div className="muscle-preview-pills">
        {names.map(n => (
          <button
            key={n}
            className={`muscle-preview-pill ${choice === n ? 'active' : ''}`}
            onClick={() => setChoice(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '0.75rem', borderRadius: 12, overflow: 'hidden' }}>
        <Component />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.85rem' }}>
          <span className="dot" style={{ background: PRIMARY }} />
          <strong style={{ color: 'var(--text-primary)' }}>Primary:</strong>
          <span style={{ color: 'var(--text-secondary)' }}>{primary.join(', ')}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.85rem' }}>
          <span className="dot" style={{ background: SECONDARY }} />
          <strong style={{ color: 'var(--text-primary)' }}>Secondary:</strong>
          <span style={{ color: 'var(--text-secondary)' }}>{secondary.join(', ')}</span>
        </div>
      </div>
    </div>
  );
}
