import { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MarchingCubes, MarchingCube, Environment, ContactShadows, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';

// Marching-cubes body: dozens of metaballs are placed at anatomical positions,
// then drei's MarchingCubes surfaces them into a single smooth organic mesh.
// Muscle "groups" are rendered as three separate MarchingCubes passes (base tissue,
// primary-highlighted, secondary-highlighted) so each group can have its own
// material and emissive color while still blending organically within its group.

const PRIMARY_COLOR = '#dc2626';
const SECONDARY_COLOR = '#2563eb';
const SKIN_COLOR = '#c9937a';

const DEMO_PRESETS = {
  'Bench Press':    { primary: ['chest', 'frontDelt'],                 secondary: ['triceps'] },
  'Squat':          { primary: ['quads', 'glutes'],                    secondary: ['hamstrings', 'lowerBack', 'abs'] },
  'Deadlift':       { primary: ['hamstrings', 'glutes', 'lowerBack'],  secondary: ['traps', 'lats', 'forearms', 'quads'] },
  'Overhead Press': { primary: ['frontDelt', 'sideDelt'],              secondary: ['triceps', 'traps', 'chest'] },
  'Pull-up':        { primary: ['lats', 'biceps'],                     secondary: ['rearDelt', 'upperBack', 'forearms'] },
  'Barbell Curl':   { primary: ['biceps'],                             secondary: ['forearms'] },
};

// Metaball definitions: every "blob" that makes up the body.
// `group` = muscle group name used for highlighting, or 'base' for neutral tissue (face, hands, feet, joints, torso base).
// `pos` = [x, y, z], `str` = metaball strength (roughly radius in the 0..1 space), `sub` = subtract from the field (for carving).
const BLOBS = [
  // ── HEAD (base) ─────────────────────────────────────
  { group: 'base', pos: [0, 0.82, 0],     str: 0.52 },
  { group: 'base', pos: [0, 0.73, 0.04],  str: 0.38 },  // jaw
  { group: 'base', pos: [0, 0.60, 0],     str: 0.18 },  // neck

  // ── TRAPS ──────────────────────────────────────────
  { group: 'traps', pos: [-0.12, 0.54, -0.02], str: 0.30 },
  { group: 'traps', pos: [0.12, 0.54, -0.02],  str: 0.30 },

  // ── DELTOIDS (three heads per side) ────────────────
  { group: 'frontDelt', pos: [-0.32, 0.44, 0.08],  str: 0.34 },
  { group: 'frontDelt', pos: [0.32, 0.44, 0.08],   str: 0.34 },
  { group: 'sideDelt',  pos: [-0.40, 0.44, 0],     str: 0.34 },
  { group: 'sideDelt',  pos: [0.40, 0.44, 0],      str: 0.34 },
  { group: 'rearDelt',  pos: [-0.32, 0.44, -0.08], str: 0.30 },
  { group: 'rearDelt',  pos: [0.32, 0.44, -0.08],  str: 0.30 },

  // ── CHEST (pecs) ───────────────────────────────────
  { group: 'chest', pos: [-0.14, 0.32, 0.14],  str: 0.44 },
  { group: 'chest', pos: [0.14, 0.32, 0.14],   str: 0.44 },
  { group: 'chest', pos: [-0.12, 0.40, 0.12],  str: 0.28 },  // upper shelf
  { group: 'chest', pos: [0.12, 0.40, 0.12],   str: 0.28 },

  // ── UPPER BACK ─────────────────────────────────────
  { group: 'upperBack', pos: [-0.14, 0.36, -0.12], str: 0.38 },
  { group: 'upperBack', pos: [0.14, 0.36, -0.12],  str: 0.38 },
  { group: 'upperBack', pos: [0, 0.36, -0.14],     str: 0.30 },

  // ── LATS (V-taper) ─────────────────────────────────
  { group: 'lats', pos: [-0.28, 0.24, -0.05],  str: 0.38 },
  { group: 'lats', pos: [-0.23, 0.12, -0.04],  str: 0.32 },
  { group: 'lats', pos: [-0.18, 0.02, -0.04],  str: 0.26 },
  { group: 'lats', pos: [0.28, 0.24, -0.05],   str: 0.38 },
  { group: 'lats', pos: [0.23, 0.12, -0.04],   str: 0.32 },
  { group: 'lats', pos: [0.18, 0.02, -0.04],   str: 0.26 },

  // ── TORSO BASE (fills abdominal cavity) ────────────
  { group: 'base', pos: [0, 0.22, 0],  str: 0.42 },
  { group: 'base', pos: [0, 0.10, 0],  str: 0.42 },
  { group: 'base', pos: [0, 0.0, 0],   str: 0.40 },

  // ── ABS (6-pack) ───────────────────────────────────
  { group: 'abs', pos: [-0.07, 0.22, 0.16], str: 0.20 },
  { group: 'abs', pos: [0.07, 0.22, 0.16],  str: 0.20 },
  { group: 'abs', pos: [-0.07, 0.12, 0.17], str: 0.20 },
  { group: 'abs', pos: [0.07, 0.12, 0.17],  str: 0.20 },
  { group: 'abs', pos: [-0.07, 0.02, 0.17], str: 0.20 },
  { group: 'abs', pos: [0.07, 0.02, 0.17],  str: 0.20 },

  // ── OBLIQUES ───────────────────────────────────────
  { group: 'obliques', pos: [-0.19, 0.14, 0.08], str: 0.24 },
  { group: 'obliques', pos: [0.19, 0.14, 0.08],  str: 0.24 },

  // ── LOWER BACK (erectors) ──────────────────────────
  { group: 'lowerBack', pos: [-0.08, -0.06, -0.10], str: 0.24 },
  { group: 'lowerBack', pos: [0.08, -0.06, -0.10],  str: 0.24 },

  // ── PELVIS (base) ──────────────────────────────────
  { group: 'base', pos: [0, -0.12, 0], str: 0.42 },

  // ── BICEPS ─────────────────────────────────────────
  { group: 'biceps', pos: [-0.48, 0.30, 0.04], str: 0.26 },
  { group: 'biceps', pos: [-0.48, 0.20, 0.04], str: 0.24 },
  { group: 'biceps', pos: [-0.48, 0.10, 0.04], str: 0.22 },
  { group: 'biceps', pos: [0.48, 0.30, 0.04],  str: 0.26 },
  { group: 'biceps', pos: [0.48, 0.20, 0.04],  str: 0.24 },
  { group: 'biceps', pos: [0.48, 0.10, 0.04],  str: 0.22 },

  // ── TRICEPS ────────────────────────────────────────
  { group: 'triceps', pos: [-0.48, 0.28, -0.04], str: 0.24 },
  { group: 'triceps', pos: [-0.48, 0.18, -0.04], str: 0.24 },
  { group: 'triceps', pos: [-0.48, 0.08, -0.04], str: 0.20 },
  { group: 'triceps', pos: [0.48, 0.28, -0.04],  str: 0.24 },
  { group: 'triceps', pos: [0.48, 0.18, -0.04],  str: 0.24 },
  { group: 'triceps', pos: [0.48, 0.08, -0.04],  str: 0.20 },

  // ── ELBOW (base) ───────────────────────────────────
  { group: 'base', pos: [-0.48, -0.02, 0], str: 0.18 },
  { group: 'base', pos: [0.48, -0.02, 0],  str: 0.18 },

  // ── FOREARMS ───────────────────────────────────────
  { group: 'forearms', pos: [-0.48, -0.12, 0.02], str: 0.22 },
  { group: 'forearms', pos: [-0.48, -0.22, 0.02], str: 0.20 },
  { group: 'forearms', pos: [-0.48, -0.30, 0.02], str: 0.18 },
  { group: 'forearms', pos: [0.48, -0.12, 0.02],  str: 0.22 },
  { group: 'forearms', pos: [0.48, -0.22, 0.02],  str: 0.20 },
  { group: 'forearms', pos: [0.48, -0.30, 0.02],  str: 0.18 },

  // ── HANDS (base) ───────────────────────────────────
  { group: 'base', pos: [-0.48, -0.40, 0.04], str: 0.16 },
  { group: 'base', pos: [0.48, -0.40, 0.04],  str: 0.16 },

  // ── GLUTES ─────────────────────────────────────────
  { group: 'glutes', pos: [-0.13, -0.20, -0.08], str: 0.34 },
  { group: 'glutes', pos: [0.13, -0.20, -0.08],  str: 0.34 },

  // ── QUADS (front thigh) ────────────────────────────
  { group: 'quads', pos: [-0.15, -0.30, 0.06], str: 0.30 },
  { group: 'quads', pos: [-0.15, -0.42, 0.06], str: 0.30 },
  { group: 'quads', pos: [-0.15, -0.52, 0.05], str: 0.26 },
  { group: 'quads', pos: [0.15, -0.30, 0.06],  str: 0.30 },
  { group: 'quads', pos: [0.15, -0.42, 0.06],  str: 0.30 },
  { group: 'quads', pos: [0.15, -0.52, 0.05],  str: 0.26 },

  // ── HAMSTRINGS (back thigh) ────────────────────────
  { group: 'hamstrings', pos: [-0.15, -0.30, -0.05], str: 0.28 },
  { group: 'hamstrings', pos: [-0.15, -0.42, -0.05], str: 0.28 },
  { group: 'hamstrings', pos: [-0.15, -0.52, -0.04], str: 0.24 },
  { group: 'hamstrings', pos: [0.15, -0.30, -0.05],  str: 0.28 },
  { group: 'hamstrings', pos: [0.15, -0.42, -0.05],  str: 0.28 },
  { group: 'hamstrings', pos: [0.15, -0.52, -0.04],  str: 0.24 },

  // ── KNEE (base) ───────────────────────────────────
  { group: 'base', pos: [-0.15, -0.62, 0], str: 0.20 },
  { group: 'base', pos: [0.15, -0.62, 0],  str: 0.20 },

  // ── CALVES ─────────────────────────────────────────
  { group: 'calves', pos: [-0.15, -0.72, -0.03], str: 0.24 },
  { group: 'calves', pos: [-0.15, -0.82, -0.03], str: 0.22 },
  { group: 'calves', pos: [0.15, -0.72, -0.03],  str: 0.24 },
  { group: 'calves', pos: [0.15, -0.82, -0.03],  str: 0.22 },

  // ── TIBIALIS (shin) ────────────────────────────────
  { group: 'tibialis', pos: [-0.15, -0.72, 0.05], str: 0.18 },
  { group: 'tibialis', pos: [-0.15, -0.82, 0.05], str: 0.16 },
  { group: 'tibialis', pos: [0.15, -0.72, 0.05],  str: 0.18 },
  { group: 'tibialis', pos: [0.15, -0.82, 0.05],  str: 0.16 },

  // ── ANKLES / FEET (base) ───────────────────────────
  { group: 'base', pos: [-0.15, -0.92, 0.02], str: 0.16 },
  { group: 'base', pos: [0.15, -0.92, 0.02],  str: 0.16 },
  { group: 'base', pos: [-0.15, -0.96, 0.10], str: 0.18 },
  { group: 'base', pos: [0.15, -0.96, 0.10],  str: 0.18 },
];

// Primary/secondary marching-cubes pass: only renders blobs whose group matches
// the activation list, plus "phantom" connector blobs from the base so the
// highlighted muscles still blend into the surrounding tissue edges.
function FieldPass({ blobs, activation, role, pulsePhase = 0 }) {
  const refs = useRef([]);
  const matRef = useRef();

  // Pulse the emissive intensity for a "breathing" look.
  useFrame((state) => {
    if (!matRef.current) return;
    const t = (Math.sin(state.clock.elapsedTime * 2.2 + pulsePhase) + 1) / 2;
    matRef.current.emissiveIntensity = role === 'primary'
      ? 0.8 + t * 1.6
      : 0.3 + t * 0.5;
  });

  const color    = role === 'primary' ? PRIMARY_COLOR : role === 'secondary' ? SECONDARY_COLOR : SKIN_COLOR;
  const emissive = role === 'primary' ? PRIMARY_COLOR : role === 'secondary' ? SECONDARY_COLOR : '#000000';
  const groups   = role === 'primary' ? activation.primary : role === 'secondary' ? activation.secondary : null;

  // Select which blobs to include in this pass
  const included = blobs.filter(b => {
    if (role === 'base') {
      return b.group === 'base' || (!activation.primary.includes(b.group) && !activation.secondary.includes(b.group));
    }
    return groups.includes(b.group);
  });

  if (included.length === 0) return null;

  return (
    <MarchingCubes
      resolution={48}
      maxPolyCount={20000}
      enableUvs={false}
      enableColors={false}
      position={[0, 0, 0]}
      scale={2.4}
    >
      <meshPhysicalMaterial
        ref={matRef}
        color={color}
        emissive={emissive}
        emissiveIntensity={role === 'base' ? 0 : 0.8}
        roughness={0.35}
        metalness={0.05}
        clearcoat={0.3}
        clearcoatRoughness={0.4}
        sheen={0.5}
        sheenColor={role === 'base' ? '#ff9a8b' : color}
        sheenRoughness={0.7}
        toneMapped={role === 'base'}
      />
      {included.map((b, i) => (
        <MarchingCube
          key={`${role}-${i}`}
          strength={b.str}
          subtract={6}
          position={b.pos}
        />
      ))}
    </MarchingCubes>
  );
}

function Humanoid({ activation, autoRotate }) {
  const group = useRef();
  useFrame((_, delta) => {
    if (group.current && autoRotate) group.current.rotation.y += delta * 0.3;
  });

  return (
    <group ref={group}>
      {/* Base tissue — everything not actively highlighted */}
      <FieldPass blobs={BLOBS} activation={activation} role="base" />
      {/* Secondary highlights */}
      <FieldPass blobs={BLOBS} activation={activation} role="secondary" pulsePhase={0.8} />
      {/* Primary highlights (brightest, pulses first) */}
      <FieldPass blobs={BLOBS} activation={activation} role="primary" pulsePhase={0} />
    </group>
  );
}

function Loading() {
  return (
    <Html center>
      <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Loading 3D renderer…</div>
    </Html>
  );
}

export default function MuscleMap3D() {
  const presetNames = Object.keys(DEMO_PRESETS);
  const [preset, setPreset] = useState(presetNames[0]);
  const [autoRotate, setAutoRotate] = useState(true);
  const activation = DEMO_PRESETS[preset];

  return (
    <div>
      <div className="muscle-preview-pills">
        {presetNames.map(p => (
          <button
            key={p}
            className={`muscle-preview-pill ${preset === p ? 'active' : ''}`}
            onClick={() => setPreset(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{
        width: '100%',
        aspectRatio: '4/5',
        maxHeight: 620,
        marginTop: '0.75rem',
        background: 'radial-gradient(ellipse at 50% 35%, #1a2540 0%, #0b1220 55%, #030712 100%)',
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 0 80px rgba(0,0,0,0.6)',
      }}>
        <Canvas
          camera={{ position: [0, 0.2, 2.8], fov: 38 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={['#050812']} />
          <fog attach="fog" args={['#050812', 3.5, 8]} />

          {/* Studio 3-point lighting */}
          <ambientLight intensity={0.25} />
          {/* Warm key from upper-right front */}
          <directionalLight position={[3, 4, 3]} intensity={1.8} color="#fff2e0" />
          {/* Cool fill from lower-left */}
          <directionalLight position={[-3, -1, 2]} intensity={0.6} color="#6b9bff" />
          {/* Magenta rim from behind-right, shows silhouette */}
          <directionalLight position={[2, 2, -4]} intensity={1.0} color="#c084fc" />
          {/* Cyan rim from behind-left */}
          <directionalLight position={[-2, 2, -3]} intensity={0.7} color="#22d3ee" />

          <Suspense fallback={<Loading />}>
            <Humanoid activation={activation} autoRotate={autoRotate} />

            {/* Subtle environment reflections */}
            <Environment preset="night" background={false} />

            {/* Soft shadow underneath */}
            <ContactShadows
              position={[0, -1.15, 0]}
              opacity={0.75}
              scale={4}
              blur={3}
              far={2}
              color="#000"
            />
          </Suspense>

          <OrbitControls
            enablePan={false}
            minDistance={2}
            maxDistance={5}
            target={[0, 0, 0]}
            onStart={() => setAutoRotate(false)}
          />

          <EffectComposer>
            <Bloom
              intensity={1.4}
              luminanceThreshold={0.35}
              luminanceSmoothing={0.6}
              mipmapBlur
              radius={0.85}
            />
            <Vignette eskil={false} offset={0.3} darkness={0.7} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Canvas>

        {/* Rotation control */}
        <button
          onClick={() => setAutoRotate(v => !v)}
          style={{
            position: 'absolute', top: 14, right: 14,
            padding: '8px 14px',
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 10,
            color: '#f1f5f9',
            fontSize: '0.78rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          {autoRotate ? '⏸  Pause' : '▶  Rotate'}
        </button>

        {/* Activation info */}
        <div style={{
          position: 'absolute', bottom: 14, left: 14, right: 14,
          padding: '12px 16px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.5), rgba(2, 6, 23, 0.8))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          borderRadius: 12,
          color: '#f1f5f9',
          fontSize: '0.82rem',
        }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'center' }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: PRIMARY_COLOR,
              boxShadow: `0 0 12px ${PRIMARY_COLOR}`,
              flexShrink: 0,
            }} />
            <strong style={{ color: PRIMARY_COLOR, letterSpacing: '0.02em' }}>PRIMARY</strong>
            <span style={{ color: '#e2e8f0' }}>{activation.primary.join(' · ') || 'None'}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: SECONDARY_COLOR,
              boxShadow: `0 0 8px ${SECONDARY_COLOR}`,
              flexShrink: 0,
            }} />
            <strong style={{ color: SECONDARY_COLOR, letterSpacing: '0.02em' }}>SECONDARY</strong>
            <span style={{ color: '#cbd5e1' }}>{activation.secondary.join(' · ') || 'None'}</span>
          </div>
        </div>
      </div>

      <div className="muscle-preview-legend">
        <span style={{ color: 'var(--text-muted)' }}>Drag to rotate · Scroll to zoom · Auto-rotates until you interact</span>
      </div>
    </div>
  );
}
