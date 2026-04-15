import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MarchingCubes, MarchingCube, Environment, ContactShadows, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

const PRIMARY_COLOR   = '#ef4444';
const SECONDARY_COLOR = '#3b82f6';
const SKIN_COLOR      = '#c9937a';

const DEMO_PRESETS = {
  'Bench Press':    { primary: ['chest', 'frontDelt'],                secondary: ['triceps'] },
  'Squat':          { primary: ['quads', 'glutes'],                   secondary: ['hamstrings', 'lowerBack', 'abs'] },
  'Deadlift':       { primary: ['hamstrings', 'glutes', 'lowerBack'], secondary: ['traps', 'lats', 'forearms', 'quads'] },
  'Overhead Press': { primary: ['frontDelt', 'sideDelt'],             secondary: ['triceps', 'traps', 'chest'] },
  'Pull-up':        { primary: ['lats', 'biceps'],                    secondary: ['rearDelt', 'upperBack', 'forearms'] },
  'Barbell Curl':   { primary: ['biceps'],                            secondary: ['forearms'] },
};

// ─── Anatomical metaballs ─────────────────────────────────────────────────────
// Each blob has: group (muscle group or 'base'), pos [x,y,z], str (strength/radius).
// 'base' blobs are always neutral skin-tone. All blobs are included in the base
// body pass; highlighted muscles get an additional glowing pass on top.
const BLOBS = [
  // ── HEAD (egg-shaped: wider mid-skull, taper to chin) ─────────────────────
  { group: 'base', pos: [ 0,    0.92, -0.02], str: 0.26 }, // crown
  { group: 'base', pos: [ 0,    0.86, -0.01], str: 0.38 }, // upper skull
  { group: 'base', pos: [ 0,    0.80,  0.00], str: 0.44 }, // main cranium
  { group: 'base', pos: [ 0,    0.82, -0.06], str: 0.20 }, // back of head
  { group: 'base', pos: [ 0,    0.80,  0.05], str: 0.26 }, // forehead
  { group: 'base', pos: [-0.08, 0.76,  0.04], str: 0.20 }, // left cheek
  { group: 'base', pos: [ 0.08, 0.76,  0.04], str: 0.20 }, // right cheek
  { group: 'base', pos: [ 0,    0.72,  0.03], str: 0.24 }, // jaw
  { group: 'base', pos: [ 0,    0.67,  0.05], str: 0.14 }, // chin point

  // ── NECK ─────────────────────────────────────────────────────────────────
  { group: 'base', pos: [ 0, 0.62,  0], str: 0.22 },
  { group: 'base', pos: [ 0, 0.57,  0], str: 0.26 },

  // ── TRAPS (sloping from neck out to shoulders) ────────────────────────────
  { group: 'traps', pos: [-0.07, 0.55, -0.02], str: 0.28 },
  { group: 'traps', pos: [ 0.07, 0.55, -0.02], str: 0.28 },
  { group: 'traps', pos: [-0.18, 0.50, -0.03], str: 0.30 },
  { group: 'traps', pos: [ 0.18, 0.50, -0.03], str: 0.30 },

  // ── DELTOIDS (rounded cap: front / side / rear + top-cap smoothing) ───────
  { group: 'frontDelt', pos: [-0.30, 0.44,  0.08], str: 0.34 },
  { group: 'frontDelt', pos: [ 0.30, 0.44,  0.08], str: 0.34 },
  { group: 'sideDelt',  pos: [-0.40, 0.42,  0.00], str: 0.38 },
  { group: 'sideDelt',  pos: [ 0.40, 0.42,  0.00], str: 0.38 },
  { group: 'rearDelt',  pos: [-0.30, 0.44, -0.08], str: 0.30 },
  { group: 'rearDelt',  pos: [ 0.30, 0.44, -0.08], str: 0.30 },
  { group: 'base',      pos: [-0.34, 0.48,  0.00], str: 0.24 }, // delt top-cap L
  { group: 'base',      pos: [ 0.34, 0.48,  0.00], str: 0.24 }, // delt top-cap R

  // ── CHEST ─────────────────────────────────────────────────────────────────
  { group: 'chest', pos: [-0.13, 0.40,  0.13], str: 0.30 }, // upper pec L
  { group: 'chest', pos: [ 0.13, 0.40,  0.13], str: 0.30 }, // upper pec R
  { group: 'chest', pos: [-0.15, 0.33,  0.15], str: 0.42 }, // mid pec L
  { group: 'chest', pos: [ 0.15, 0.33,  0.15], str: 0.42 }, // mid pec R
  { group: 'chest', pos: [-0.15, 0.25,  0.13], str: 0.32 }, // lower pec L
  { group: 'chest', pos: [ 0.15, 0.25,  0.13], str: 0.32 }, // lower pec R
  { group: 'base',  pos: [ 0,    0.33,  0.12], str: 0.20 }, // sternum fill

  // ── UPPER BACK (rhomboids) ────────────────────────────────────────────────
  { group: 'upperBack', pos: [-0.13, 0.36, -0.12], str: 0.36 },
  { group: 'upperBack', pos: [ 0.13, 0.36, -0.12], str: 0.36 },
  { group: 'upperBack', pos: [ 0,    0.38, -0.14], str: 0.28 },

  // ── LATS (V-taper) ────────────────────────────────────────────────────────
  { group: 'lats', pos: [-0.27, 0.26, -0.04], str: 0.36 },
  { group: 'lats', pos: [ 0.27, 0.26, -0.04], str: 0.36 },
  { group: 'lats', pos: [-0.22, 0.14, -0.03], str: 0.30 },
  { group: 'lats', pos: [ 0.22, 0.14, -0.03], str: 0.30 },
  { group: 'lats', pos: [-0.17, 0.02, -0.03], str: 0.22 },
  { group: 'lats', pos: [ 0.17, 0.02, -0.03], str: 0.22 },

  // ── TORSO BASE (fills abdominal cavity for a continuous body) ─────────────
  { group: 'base', pos: [ 0, 0.26,  0.00], str: 0.38 },
  { group: 'base', pos: [ 0, 0.15,  0.00], str: 0.38 },
  { group: 'base', pos: [ 0, 0.04,  0.00], str: 0.38 },
  { group: 'base', pos: [ 0, 0.08,  0.08], str: 0.18 }, // slight belly

  // ── ABS (6-pack — slightly proud of torso base) ───────────────────────────
  { group: 'abs', pos: [-0.05, 0.22,  0.17], str: 0.14 },
  { group: 'abs', pos: [ 0.05, 0.22,  0.17], str: 0.14 },
  { group: 'abs', pos: [-0.05, 0.13,  0.17], str: 0.14 },
  { group: 'abs', pos: [ 0.05, 0.13,  0.17], str: 0.14 },
  { group: 'abs', pos: [-0.05, 0.04,  0.17], str: 0.14 },
  { group: 'abs', pos: [ 0.05, 0.04,  0.17], str: 0.14 },

  // ── OBLIQUES ──────────────────────────────────────────────────────────────
  { group: 'obliques', pos: [-0.17, 0.16,  0.06], str: 0.22 },
  { group: 'obliques', pos: [ 0.17, 0.16,  0.06], str: 0.22 },
  { group: 'obliques', pos: [-0.16, 0.06,  0.07], str: 0.20 },
  { group: 'obliques', pos: [ 0.16, 0.06,  0.07], str: 0.20 },

  // ── LOWER BACK (erectors) ─────────────────────────────────────────────────
  { group: 'lowerBack', pos: [-0.08, -0.04, -0.10], str: 0.22 },
  { group: 'lowerBack', pos: [ 0.08, -0.04, -0.10], str: 0.22 },

  // ── PELVIS ────────────────────────────────────────────────────────────────
  { group: 'base', pos: [ 0,     -0.14,  0.00], str: 0.42 },
  { group: 'base', pos: [-0.15,  -0.16,  0.00], str: 0.22 }, // hip L
  { group: 'base', pos: [ 0.15,  -0.16,  0.00], str: 0.22 }, // hip R

  // ── SHOULDER → ARM TRANSITION ─────────────────────────────────────────────
  { group: 'base', pos: [-0.40, 0.36,  0.02], str: 0.26 },
  { group: 'base', pos: [ 0.40, 0.36,  0.02], str: 0.26 },

  // ── BICEPS (front upper arm, tapering) ────────────────────────────────────
  { group: 'biceps', pos: [-0.43, 0.30,  0.06], str: 0.26 },
  { group: 'biceps', pos: [ 0.43, 0.30,  0.06], str: 0.26 },
  { group: 'biceps', pos: [-0.45, 0.20,  0.06], str: 0.24 },
  { group: 'biceps', pos: [ 0.45, 0.20,  0.06], str: 0.24 },
  { group: 'biceps', pos: [-0.46, 0.10,  0.05], str: 0.22 },
  { group: 'biceps', pos: [ 0.46, 0.10,  0.05], str: 0.22 },

  // ── TRICEPS (back upper arm, tapering) ────────────────────────────────────
  { group: 'triceps', pos: [-0.43, 0.30, -0.05], str: 0.24 },
  { group: 'triceps', pos: [ 0.43, 0.30, -0.05], str: 0.24 },
  { group: 'triceps', pos: [-0.45, 0.20, -0.05], str: 0.24 },
  { group: 'triceps', pos: [ 0.45, 0.20, -0.05], str: 0.24 },
  { group: 'triceps', pos: [-0.46, 0.10, -0.04], str: 0.20 },
  { group: 'triceps', pos: [ 0.46, 0.10, -0.04], str: 0.20 },

  // ── ELBOW (narrow base joint) ─────────────────────────────────────────────
  { group: 'base', pos: [-0.46, 0.00,  0.00], str: 0.17 },
  { group: 'base', pos: [ 0.46, 0.00,  0.00], str: 0.17 },

  // ── FOREARMS (tapering toward wrist) ─────────────────────────────────────
  { group: 'forearms', pos: [-0.46, -0.08,  0.02], str: 0.22 },
  { group: 'forearms', pos: [ 0.46, -0.08,  0.02], str: 0.22 },
  { group: 'forearms', pos: [-0.46, -0.18,  0.02], str: 0.20 },
  { group: 'forearms', pos: [ 0.46, -0.18,  0.02], str: 0.20 },
  { group: 'forearms', pos: [-0.46, -0.28,  0.02], str: 0.17 },
  { group: 'forearms', pos: [ 0.46, -0.28,  0.02], str: 0.17 },

  // ── WRIST + HAND ──────────────────────────────────────────────────────────
  { group: 'base', pos: [-0.46, -0.36,  0.02], str: 0.14 }, // wrist L
  { group: 'base', pos: [ 0.46, -0.36,  0.02], str: 0.14 }, // wrist R
  { group: 'base', pos: [-0.46, -0.42,  0.03], str: 0.17 }, // palm L
  { group: 'base', pos: [ 0.46, -0.42,  0.03], str: 0.17 }, // palm R
  { group: 'base', pos: [-0.46, -0.48,  0.05], str: 0.13 }, // fingers L
  { group: 'base', pos: [ 0.46, -0.48,  0.05], str: 0.13 }, // fingers R

  // ── GLUTES (rounded, prominent) ───────────────────────────────────────────
  { group: 'glutes', pos: [-0.13, -0.18, -0.09], str: 0.32 },
  { group: 'glutes', pos: [ 0.13, -0.18, -0.09], str: 0.32 },
  { group: 'glutes', pos: [-0.13, -0.26, -0.09], str: 0.28 },
  { group: 'glutes', pos: [ 0.13, -0.26, -0.09], str: 0.28 },

  // ── HIP → THIGH TRANSITION ────────────────────────────────────────────────
  { group: 'base', pos: [-0.14, -0.24,  0.02], str: 0.26 },
  { group: 'base', pos: [ 0.14, -0.24,  0.02], str: 0.26 },

  // ── QUADS (front thigh, tapering top-to-knee) ─────────────────────────────
  { group: 'quads', pos: [-0.14, -0.30,  0.07], str: 0.32 },
  { group: 'quads', pos: [ 0.14, -0.30,  0.07], str: 0.32 },
  { group: 'quads', pos: [-0.14, -0.40,  0.06], str: 0.30 },
  { group: 'quads', pos: [ 0.14, -0.40,  0.06], str: 0.30 },
  { group: 'quads', pos: [-0.14, -0.50,  0.05], str: 0.26 },
  { group: 'quads', pos: [ 0.14, -0.50,  0.05], str: 0.26 },
  { group: 'quads', pos: [-0.14, -0.58,  0.04], str: 0.22 },
  { group: 'quads', pos: [ 0.14, -0.58,  0.04], str: 0.22 },

  // ── HAMSTRINGS (back thigh, tapering) ────────────────────────────────────
  { group: 'hamstrings', pos: [-0.14, -0.30, -0.07], str: 0.28 },
  { group: 'hamstrings', pos: [ 0.14, -0.30, -0.07], str: 0.28 },
  { group: 'hamstrings', pos: [-0.14, -0.40, -0.06], str: 0.26 },
  { group: 'hamstrings', pos: [ 0.14, -0.40, -0.06], str: 0.26 },
  { group: 'hamstrings', pos: [-0.14, -0.50, -0.05], str: 0.22 },
  { group: 'hamstrings', pos: [ 0.14, -0.50, -0.05], str: 0.22 },

  // ── KNEE (narrow base joint) ──────────────────────────────────────────────
  { group: 'base', pos: [-0.14, -0.63,  0.00], str: 0.18 },
  { group: 'base', pos: [ 0.14, -0.63,  0.00], str: 0.18 },

  // ── CALVES (tapering, bulge at upper-mid) ─────────────────────────────────
  { group: 'calves', pos: [-0.14, -0.68, -0.05], str: 0.26 },
  { group: 'calves', pos: [ 0.14, -0.68, -0.05], str: 0.26 },
  { group: 'calves', pos: [-0.14, -0.76, -0.04], str: 0.22 },
  { group: 'calves', pos: [ 0.14, -0.76, -0.04], str: 0.22 },
  { group: 'calves', pos: [-0.14, -0.84, -0.02], str: 0.17 },
  { group: 'calves', pos: [ 0.14, -0.84, -0.02], str: 0.17 },

  // ── TIBIALIS (shin) ───────────────────────────────────────────────────────
  { group: 'tibialis', pos: [-0.14, -0.70,  0.05], str: 0.17 },
  { group: 'tibialis', pos: [ 0.14, -0.70,  0.05], str: 0.17 },
  { group: 'tibialis', pos: [-0.14, -0.80,  0.04], str: 0.14 },
  { group: 'tibialis', pos: [ 0.14, -0.80,  0.04], str: 0.14 },

  // ── ANKLE (narrow joint) ──────────────────────────────────────────────────
  { group: 'base', pos: [-0.14, -0.91,  0.02], str: 0.13 },
  { group: 'base', pos: [ 0.14, -0.91,  0.02], str: 0.13 },

  // ── FEET (heel → arch → toe, elongated forward) ───────────────────────────
  { group: 'base', pos: [-0.14, -0.94, -0.03], str: 0.14 }, // heel L
  { group: 'base', pos: [ 0.14, -0.94, -0.03], str: 0.14 }, // heel R
  { group: 'base', pos: [-0.14, -0.96,  0.06], str: 0.15 }, // arch L
  { group: 'base', pos: [ 0.14, -0.96,  0.06], str: 0.15 }, // arch R
  { group: 'base', pos: [-0.14, -0.96,  0.14], str: 0.13 }, // toes L
  { group: 'base', pos: [ 0.14, -0.96,  0.14], str: 0.13 }, // toes R
];

// ── Base body: ALL blobs merged into one continuous skin-tone mesh ────────────
function BaseBody() {
  return (
    <MarchingCubes
      resolution={64}
      maxPolyCount={45000}
      enableUvs={false}
      enableColors={false}
      scale={2.4}
    >
      <meshPhysicalMaterial
        color={SKIN_COLOR}
        roughness={0.55}
        metalness={0.02}
        clearcoat={0.35}
        clearcoatRoughness={0.45}
        sheen={0.4}
        sheenColor="#ff9a8b"
        sheenRoughness={0.7}
      />
      {BLOBS.map((b, i) => (
        <MarchingCube key={i} strength={b.str} subtract={6} position={b.pos} />
      ))}
    </MarchingCubes>
  );
}

// ── Highlight layer: only selected muscle blobs, slightly enlarged so they
//    bulge outward beyond the base mesh and catch the Bloom glow ──────────────
function HighlightLayer({ activation, role, pulsePhase }) {
  const matRef = useRef();

  useFrame((state) => {
    if (!matRef.current) return;
    const t = (Math.sin(state.clock.elapsedTime * 2.2 + pulsePhase) + 1) / 2;
    matRef.current.emissiveIntensity = role === 'primary'
      ? 1.6 + t * 2.0
      : 0.8 + t * 0.8;
  });

  const groups  = role === 'primary' ? activation.primary : activation.secondary;
  const color   = role === 'primary' ? PRIMARY_COLOR : SECONDARY_COLOR;
  const included = BLOBS.filter(b => groups.includes(b.group));

  if (included.length === 0) return null;

  // Slightly larger scale pushes the surface outside the base body
  const strScale = role === 'primary' ? 1.20 : 1.12;

  return (
    <MarchingCubes
      resolution={56}
      maxPolyCount={20000}
      enableUvs={false}
      enableColors={false}
      scale={2.44}
    >
      <meshPhysicalMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={role === 'primary' ? 2.0 : 1.0}
        roughness={0.25}
        metalness={0.1}
        clearcoat={0.6}
        clearcoatRoughness={0.25}
        transparent
        opacity={role === 'primary' ? 0.95 : 0.88}
        toneMapped={false}
      />
      {included.map((b, i) => (
        <MarchingCube
          key={i}
          strength={b.str * strScale}
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
    if (group.current && autoRotate) group.current.rotation.y += delta * 0.28;
  });
  return (
    <group ref={group}>
      <BaseBody />
      <HighlightLayer activation={activation} role="secondary" pulsePhase={0.8} />
      <HighlightLayer activation={activation} role="primary"   pulsePhase={0.0} />
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
  const presetNames  = Object.keys(DEMO_PRESETS);
  const [preset, setPreset]           = useState(presetNames[0]);
  const [autoRotate, setAutoRotate]   = useState(true);
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
        maxHeight: 640,
        marginTop: '0.75rem',
        background: 'radial-gradient(ellipse at 50% 30%, #1a2540 0%, #090e1e 55%, #020408 100%)',
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
      }}>
        <Canvas
          camera={{ position: [0, 0.1, 3.0], fov: 36 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={['#030712']} />
          <fog attach="fog" args={['#030712', 4, 9]} />

          {/* Studio 3-point + rim lighting */}
          <ambientLight intensity={0.20} />
          <directionalLight position={[ 3,  5,  4]} intensity={2.0} color="#fff4e0" />
          <directionalLight position={[-3, -1,  2]} intensity={0.7} color="#6b9bff" />
          <directionalLight position={[ 2,  3, -5]} intensity={1.1} color="#c084fc" />
          <directionalLight position={[-2,  2, -4]} intensity={0.8} color="#22d3ee" />

          <Suspense fallback={<Loading />}>
            <Humanoid activation={activation} autoRotate={autoRotate} />
            <Environment preset="night" background={false} />
            <ContactShadows
              position={[0, -1.22, 0]}
              opacity={0.8}
              scale={4}
              blur={3.5}
              far={2.2}
              color="#000"
            />
          </Suspense>

          <OrbitControls
            enablePan={false}
            minDistance={2}
            maxDistance={5.5}
            target={[0, 0.05, 0]}
            onStart={() => setAutoRotate(false)}
          />

          <EffectComposer>
            <Bloom
              intensity={1.6}
              luminanceThreshold={0.30}
              luminanceSmoothing={0.55}
              mipmapBlur
              radius={0.90}
            />
            <Vignette eskil={false} offset={0.28} darkness={0.75} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Canvas>

        {/* Rotation toggle */}
        <button
          onClick={() => setAutoRotate(v => !v)}
          style={{
            position: 'absolute', top: 14, right: 14,
            padding: '7px 13px',
            background: 'rgba(10, 18, 38, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(148,163,184,0.18)',
            borderRadius: 10,
            color: '#f1f5f9',
            fontSize: '0.76rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
            letterSpacing: '0.03em',
          }}
        >
          {autoRotate ? '⏸  Pause' : '▶  Rotate'}
        </button>

        {/* Activation legend */}
        <div style={{
          position: 'absolute', bottom: 14, left: 14, right: 14,
          padding: '11px 15px',
          background: 'linear-gradient(180deg, rgba(10,18,38,0.5) 0%, rgba(2,6,20,0.85) 100%)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(148,163,184,0.13)',
          borderRadius: 13,
          fontSize: '0.80rem',
        }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 5, alignItems: 'center' }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
              background: PRIMARY_COLOR,
              boxShadow: `0 0 10px ${PRIMARY_COLOR}`,
            }} />
            <strong style={{ color: PRIMARY_COLOR, letterSpacing: '0.03em' }}>PRIMARY</strong>
            <span style={{ color: '#e2e8f0' }}>{activation.primary.join(' · ') || 'None'}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
              background: SECONDARY_COLOR,
              boxShadow: `0 0 8px ${SECONDARY_COLOR}`,
            }} />
            <strong style={{ color: SECONDARY_COLOR, letterSpacing: '0.03em' }}>SECONDARY</strong>
            <span style={{ color: '#cbd5e1' }}>{activation.secondary.join(' · ') || 'None'}</span>
          </div>
        </div>
      </div>

      <div className="muscle-preview-legend">
        <span style={{ color: 'var(--text-muted)' }}>
          Drag to rotate · Scroll to zoom · Auto-rotates until you interact
        </span>
      </div>
    </div>
  );
}
