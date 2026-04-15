import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import MuscleMapAnimated from '../components/preview/MuscleMapAnimated';
import MuscleMapExercise from '../components/preview/MuscleMapExercise';

// Lazy-load 3D preview because it pulls in three.js (~500KB gzipped).
// This keeps the initial bundle small; the 3D deps only load when the user picks that tab.
const MuscleMap3D = lazy(() => import('../components/preview/MuscleMap3D'));

const OPTIONS = [
  {
    id: 'animated',
    title: 'Option A — Animated SVG',
    tagline: 'Polished pulse & glow on existing diagrams',
    summary: 'Keeps the current SVG body and layers on a breathing animation, flowing gradient, and soft drop-shadow glow. Fast, lightweight, and fits the current UI perfectly.',
    pros: ['Very lightweight (~0 kB extra)', 'Works on all devices', 'Matches existing design'],
    cons: ['Still a static body diagram', 'Less "wow" factor'],
  },
  {
    id: '3d',
    title: 'Option B — Interactive 3D',
    tagline: 'Rotating 3D humanoid with highlighted muscles',
    summary: 'A real 3D body built with Three.js that auto-rotates and can be dragged/zoomed. Muscle groups pulse with emissive lighting. Most impressive visually.',
    pros: ['Truly interactive', 'Closest to musclewiki-style depth', 'Users can rotate to see back/sides'],
    cons: ['Heavier bundle (~500 KB)', 'Procedural body is stylized, not photo-real'],
  },
  {
    id: 'exercise',
    title: 'Option C — Animated Exercise',
    tagline: 'Stick-figure doing the actual exercise motion',
    summary: 'A hand-animated figure performs the exercise on loop with the working muscles contracting in real time. Most informative for learning form.',
    pros: ['Teaches the movement pattern', 'Muscles visually contract in motion', 'No dependencies'],
    cons: ['Needs an animation per exercise (a few at launch, more over time)', 'Less of a "body map" feel'],
  },
];

export default function MusclePreview() {
  const [active, setActive] = useState('animated');
  const activeOption = OPTIONS.find(o => o.id === active);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Muscle Map Previews</h1>
          <p>Three directions we could go — pick the one that feels right.</p>
        </div>
        <Link to="/workouts" className="btn-secondary" style={{ textDecoration: 'none' }}>
          Back to workouts
        </Link>
      </div>

      {/* Tab bar */}
      <div className="muscle-preview-tabs">
        {OPTIONS.map(o => (
          <button
            key={o.id}
            className={`muscle-preview-tab ${active === o.id ? 'active' : ''}`}
            onClick={() => setActive(o.id)}
          >
            <div className="muscle-preview-tab-title">{o.title.split(' — ')[0]}</div>
            <div className="muscle-preview-tab-sub">{o.title.split(' — ')[1]}</div>
          </button>
        ))}
      </div>

      <div className="form-card" style={{ marginTop: '1rem' }}>
        <h3 style={{ margin: 0 }}>{activeOption.title}</h3>
        <p style={{ color: 'var(--text-secondary)', margin: '0.35rem 0 0.75rem' }}>{activeOption.tagline}</p>
        <p style={{ color: 'var(--text-body)', margin: '0 0 1rem' }}>{activeOption.summary}</p>

        {/* The actual preview */}
        <div style={{ marginTop: '0.5rem' }}>
          {active === 'animated' && <MuscleMapAnimated />}
          {active === '3d' && (
            <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading 3D renderer…</div>}>
              <MuscleMap3D />
            </Suspense>
          )}
          {active === 'exercise' && <MuscleMapExercise />}
        </div>

        {/* Pros / cons */}
        <div className="muscle-preview-tradeoffs">
          <div>
            <h4 style={{ color: '#22c55e', margin: '0 0 6px' }}>Pros</h4>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-body)', fontSize: '0.9rem' }}>
              {activeOption.pros.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#f59e0b', margin: '0 0 6px' }}>Cons</h4>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-body)', fontSize: '0.9rem' }}>
              {activeOption.cons.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
