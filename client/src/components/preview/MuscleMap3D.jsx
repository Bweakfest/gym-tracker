import { useRef, useState, useMemo, Suspense, lazy } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { deriveMuscleTags } from '../MuscleMap';

const PRIMARY_COLOR   = '#ef4444';
const SECONDARY_COLOR = '#3b82f6';
const SKIN_COLOR      = '#c9937a';
const SKIN_DARK       = '#b8825e'; // slightly darker for depth

const DEMO_PRESETS = {
  'Bench Press':    { primary: ['chest', 'frontDelt'],                secondary: ['triceps'] },
  'Squat':          { primary: ['quads', 'glutes'],                   secondary: ['hamstrings', 'lowerBack', 'abs'] },
  'Deadlift':       { primary: ['hamstrings', 'glutes', 'lowerBack'], secondary: ['traps', 'lats', 'forearms', 'quads'] },
  'Overhead Press': { primary: ['frontDelt', 'sideDelt'],             secondary: ['triceps', 'traps', 'chest'] },
  'Pull-up':        { primary: ['lats', 'biceps'],                    secondary: ['rearDelt', 'upperBack', 'forearms'] },
  'Barbell Curl':   { primary: ['biceps'],                            secondary: ['forearms'] },
};

// ── One mesh piece with activation-aware material ─────────────────────────────
function Part({ group, activation, pulsePhase = 0, position, rotation, scale, children }) {
  const matRef = useRef();
  const isPrimary   = !!group && activation.primary.includes(group);
  const isSecondary = !!group && !isPrimary && activation.secondary.includes(group);
  const active  = isPrimary || isSecondary;
  const color   = isPrimary ? PRIMARY_COLOR : isSecondary ? SECONDARY_COLOR : SKIN_COLOR;
  const baseEI  = isPrimary ? 1.6 : isSecondary ? 0.9 : 0;

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    if (active) {
      const t = (Math.sin(clock.elapsedTime * 2.4 + pulsePhase) + 1) / 2;
      matRef.current.emissiveIntensity = baseEI + t * (isPrimary ? 1.4 : 0.7);
    } else {
      matRef.current.emissiveIntensity = 0;
    }
  });

  return (
    <mesh position={position} rotation={rotation} scale={scale} castShadow>
      {children}
      <meshPhysicalMaterial
        ref={matRef}
        color={color}
        emissive={active ? color : '#000000'}
        emissiveIntensity={baseEI}
        roughness={0.52}
        metalness={0.03}
        clearcoat={0.28}
        clearcoatRoughness={0.42}
        sheen={0.35}
        sheenColor="#ff9a8b"
        sheenRoughness={0.65}
        toneMapped={!active}
      />
    </mesh>
  );
}

const Sphere  = (p) => <Part {...p}><sphereGeometry  args={p.args  || [1, 28, 20]} /></Part>;
const Capsule = (p) => <Part {...p}><capsuleGeometry args={p.args  || [0.08, 0.3, 4, 16]} /></Part>;
const Cyl     = (p) => <Part {...p}><cylinderGeometry args={p.args || [1, 1, 1, 16]} /></Part>;

// ── The humanoid figure built from geometric primitives ───────────────────────
function Humanoid({ activation, autoRotate }) {
  const root = useRef();
  useFrame((_, dt) => { if (root.current && autoRotate) root.current.rotation.y += dt * 0.28; });

  const A = activation;
  return (
    <group ref={root}>

      {/* ══════ HEAD ══════ */}
      {/* Cranium — wider across, egg-tapered toward chin */}
      <Sphere  activation={A} position={[0, 0.90, -0.01]} scale={[0.155, 0.190, 0.162]} />
      {/* Jaw / lower face — forward and down */}
      <Sphere  activation={A} position={[0, 0.775, 0.025]} scale={[0.120, 0.085, 0.110]} />
      {/* Chin point */}
      <Sphere  activation={A} position={[0, 0.710, 0.042]} scale={[0.055, 0.038, 0.048]} />

      {/* ══════ NECK ══════ */}
      <Cyl activation={A} args={[0.062, 0.074, 0.130, 16]} position={[0, 0.655, 0.005]} />

      {/* ══════ TRAPEZIUS — slopes neck→shoulder ══════ */}
      <Sphere activation={A} group="traps" pulsePhase={0.4}
              position={[0, 0.625, -0.025]} scale={[0.230, 0.055, 0.095]} />

      {/* ══════ TORSO BASE — V-tapered from shoulders to waist ══════ */}
      {/* Shoulder girdle (widest) */}
      <Sphere activation={A} position={[0, 0.530, 0]} scale={[0.310, 0.085, 0.155]} />
      {/* Upper chest thickness */}
      <Sphere activation={A} position={[0, 0.445, 0]} scale={[0.290, 0.095, 0.165]} />
      {/* Mid torso */}
      <Sphere activation={A} position={[0, 0.325, 0]} scale={[0.255, 0.090, 0.148]} />
      {/* Waist — narrowest */}
      <Sphere activation={A} position={[0, 0.195, 0]} scale={[0.210, 0.068, 0.130]} />
      {/* Low abdomen */}
      <Sphere activation={A} position={[0, 0.090, 0]} scale={[0.225, 0.065, 0.138]} />
      {/* Pelvis — widens slightly */}
      <Sphere activation={A} position={[0,-0.020, 0]} scale={[0.250, 0.100, 0.148]} />

      {/* ══════ CHEST (pec caps on front torso) ══════ */}
      <Sphere activation={A} group="chest" pulsePhase={0.0}
              position={[-0.112, 0.445, 0.163]} scale={[0.115, 0.096, 0.042]} />
      <Sphere activation={A} group="chest" pulsePhase={0.0}
              position={[ 0.112, 0.445, 0.163]} scale={[0.115, 0.096, 0.042]} />

      {/* ══════ ABS (six-pack bumps) ══════ */}
      {[-0.044, 0.044].map(x => [0.270, 0.185, 0.100].map((y, i) => (
        <Sphere key={`abs-${x}-${i}`} activation={A} group="abs" pulsePhase={0.2}
                position={[x, y, 0.135]} scale={[0.038, 0.036, 0.022]} />
      )))}

      {/* ══════ OBLIQUES ══════ */}
      <Sphere activation={A} group="obliques" pulsePhase={0.3}
              position={[-0.192, 0.195, 0.062]} scale={[0.038, 0.088, 0.068]} />
      <Sphere activation={A} group="obliques" pulsePhase={0.3}
              position={[ 0.192, 0.195, 0.062]} scale={[0.038, 0.088, 0.068]} />

      {/* ══════ UPPER BACK (rhomboids) ══════ */}
      <Sphere activation={A} group="upperBack" pulsePhase={0.1}
              position={[0, 0.435, -0.158]} scale={[0.220, 0.095, 0.028]} />

      {/* ══════ LATS (V-sweep from armpit down) ══════ */}
      <Sphere activation={A} group="lats" pulsePhase={0.15}
              position={[-0.250, 0.310, -0.038]} scale={[0.038, 0.155, 0.105]} />
      <Sphere activation={A} group="lats" pulsePhase={0.15}
              position={[ 0.250, 0.310, -0.038]} scale={[0.038, 0.155, 0.105]} />

      {/* ══════ LOWER BACK (erectors) ══════ */}
      <Sphere activation={A} group="lowerBack" pulsePhase={0.25}
              position={[0, 0.112, -0.140]} scale={[0.098, 0.075, 0.026]} />

      {/* ══════ DELTOIDS ══════ */}
      {/* Side delt — the visible shoulder cap */}
      <Sphere activation={A} group="sideDelt" pulsePhase={0.05}
              position={[-0.340, 0.525, 0.000]} scale={[0.082, 0.080, 0.082]} />
      <Sphere activation={A} group="sideDelt" pulsePhase={0.05}
              position={[ 0.340, 0.525, 0.000]} scale={[0.082, 0.080, 0.082]} />
      {/* Front delt */}
      <Sphere activation={A} group="frontDelt" pulsePhase={0.05}
              position={[-0.300, 0.510, 0.080]} scale={[0.062, 0.062, 0.042]} />
      <Sphere activation={A} group="frontDelt" pulsePhase={0.05}
              position={[ 0.300, 0.510, 0.080]} scale={[0.062, 0.062, 0.042]} />
      {/* Rear delt */}
      <Sphere activation={A} group="rearDelt" pulsePhase={0.05}
              position={[-0.300, 0.510,-0.080]} scale={[0.062, 0.062, 0.042]} />
      <Sphere activation={A} group="rearDelt" pulsePhase={0.05}
              position={[ 0.300, 0.510,-0.080]} scale={[0.062, 0.062, 0.042]} />

      {/* ══════ UPPER ARMS ══════ */}
      {/* Base capsule — shoulder to elbow */}
      <Capsule activation={A} args={[0.062, 0.260, 4, 16]}
               position={[-0.355, 0.290, 0.000]} rotation={[0, 0, 0.06]} />
      <Capsule activation={A} args={[0.062, 0.260, 4, 16]}
               position={[ 0.355, 0.290, 0.000]} rotation={[0, 0,-0.06]} />
      {/* Biceps overlay */}
      <Sphere activation={A} group="biceps" pulsePhase={0.10}
              position={[-0.352, 0.295, 0.058]} scale={[0.040, 0.115, 0.032]} />
      <Sphere activation={A} group="biceps" pulsePhase={0.10}
              position={[ 0.352, 0.295, 0.058]} scale={[0.040, 0.115, 0.032]} />
      {/* Triceps overlay */}
      <Sphere activation={A} group="triceps" pulsePhase={0.15}
              position={[-0.352, 0.295,-0.058]} scale={[0.040, 0.120, 0.030]} />
      <Sphere activation={A} group="triceps" pulsePhase={0.15}
              position={[ 0.352, 0.295,-0.058]} scale={[0.040, 0.120, 0.030]} />

      {/* ══════ ELBOWS ══════ */}
      <Sphere activation={A} position={[-0.362, 0.080, 0]} scale={[0.052, 0.050, 0.052]} />
      <Sphere activation={A} position={[ 0.362, 0.080, 0]} scale={[0.052, 0.050, 0.052]} />

      {/* ══════ FOREARMS ══════ */}
      <Capsule activation={A} group="forearms" pulsePhase={0.20}
               args={[0.050, 0.220, 4, 16]}
               position={[-0.368,-0.085, 0.000]} rotation={[0, 0, 0.04]} />
      <Capsule activation={A} group="forearms" pulsePhase={0.20}
               args={[0.050, 0.220, 4, 16]}
               position={[ 0.368,-0.085, 0.000]} rotation={[0, 0,-0.04]} />

      {/* ══════ HANDS ══════ */}
      <Sphere activation={A} position={[-0.375,-0.260, 0.015]} scale={[0.046, 0.075, 0.032]} />
      <Sphere activation={A} position={[ 0.375,-0.260, 0.015]} scale={[0.046, 0.075, 0.032]} />

      {/* ══════ GLUTES ══════ */}
      <Sphere activation={A} group="glutes" pulsePhase={0.10}
              position={[-0.098,-0.095,-0.105]} scale={[0.118, 0.100, 0.090]} />
      <Sphere activation={A} group="glutes" pulsePhase={0.10}
              position={[ 0.098,-0.095,-0.105]} scale={[0.118, 0.100, 0.090]} />

      {/* ══════ UPPER LEGS ══════ */}
      {/* Base capsule */}
      <Capsule activation={A} args={[0.108, 0.320, 4, 16]} position={[-0.108,-0.295, 0]} />
      <Capsule activation={A} args={[0.108, 0.320, 4, 16]} position={[ 0.108,-0.295, 0]} />
      {/* Quads (front) */}
      <Sphere activation={A} group="quads" pulsePhase={0.10}
              position={[-0.108,-0.295, 0.085]} scale={[0.082, 0.200, 0.036]} />
      <Sphere activation={A} group="quads" pulsePhase={0.10}
              position={[ 0.108,-0.295, 0.085]} scale={[0.082, 0.200, 0.036]} />
      {/* Hamstrings (back) */}
      <Sphere activation={A} group="hamstrings" pulsePhase={0.20}
              position={[-0.108,-0.295,-0.082]} scale={[0.078, 0.185, 0.034]} />
      <Sphere activation={A} group="hamstrings" pulsePhase={0.20}
              position={[ 0.108,-0.295,-0.082]} scale={[0.078, 0.185, 0.034]} />

      {/* ══════ KNEES ══════ */}
      <Sphere activation={A} position={[-0.108,-0.555, 0]} scale={[0.082, 0.072, 0.082]} />
      <Sphere activation={A} position={[ 0.108,-0.555, 0]} scale={[0.082, 0.072, 0.082]} />

      {/* ══════ LOWER LEGS ══════ */}
      <Capsule activation={A} args={[0.078, 0.250, 4, 16]} position={[-0.108,-0.765, 0]} />
      <Capsule activation={A} args={[0.078, 0.250, 4, 16]} position={[ 0.108,-0.765, 0]} />
      {/* Calves (back bulge) */}
      <Sphere activation={A} group="calves" pulsePhase={0.15}
              position={[-0.108,-0.715,-0.052]} scale={[0.062, 0.135, 0.032]} />
      <Sphere activation={A} group="calves" pulsePhase={0.15}
              position={[ 0.108,-0.715,-0.052]} scale={[0.062, 0.135, 0.032]} />
      {/* Tibialis (shin) */}
      <Sphere activation={A} group="tibialis" pulsePhase={0.25}
              position={[-0.108,-0.728, 0.050]} scale={[0.042, 0.118, 0.022]} />
      <Sphere activation={A} group="tibialis" pulsePhase={0.25}
              position={[ 0.108,-0.728, 0.050]} scale={[0.042, 0.118, 0.022]} />

      {/* ══════ ANKLES ══════ */}
      <Sphere activation={A} position={[-0.108,-0.930, 0.000]} scale={[0.055, 0.050, 0.055]} />
      <Sphere activation={A} position={[ 0.108,-0.930, 0.000]} scale={[0.055, 0.050, 0.055]} />

      {/* ══════ FEET (heel → arch → toes) ══════ */}
      <Sphere activation={A} position={[-0.108,-0.965, 0.068]} scale={[0.068, 0.038, 0.105]} />
      <Sphere activation={A} position={[ 0.108,-0.965, 0.068]} scale={[0.068, 0.038, 0.105]} />
    </group>
  );
}

function FallbackLoader() {
  return (
    <Html center>
      <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Loading 3D…</div>
    </Html>
  );
}

// ── Main export — accepts either `workouts` (live/past session) or shows presets ─
export default function MuscleMap3D({ workouts }) {
  const isPresetMode   = !workouts;
  const presetNames    = Object.keys(DEMO_PRESETS);
  const [preset, setPreset]         = useState(presetNames[0]);
  const [autoRotate, setAutoRotate] = useState(true);

  const activation = useMemo(() => {
    if (isPresetMode) return DEMO_PRESETS[preset];
    const primary   = new Set();
    const secondary = new Set();
    (workouts || []).forEach(w => {
      const { primary: p, secondary: s } = deriveMuscleTags(w.group || '', w.muscles || '');
      p.forEach(m => primary.add(m));
      s.forEach(m => { if (!primary.has(m)) secondary.add(m); });
    });
    return { primary: [...primary], secondary: [...secondary] };
  }, [workouts, isPresetMode, preset]);

  const hasActivation = activation.primary.length > 0 || activation.secondary.length > 0;

  return (
    <div>
      {/* Preset exercise picker — only in preview/demo mode */}
      {isPresetMode && (
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
      )}

      <div style={{
        width: '100%',
        aspectRatio: isPresetMode ? '4/5' : '3/4',
        maxHeight: isPresetMode ? 640 : 520,
        marginTop: isPresetMode ? '0.75rem' : '0.5rem',
        background: 'radial-gradient(ellipse at 50% 28%, #18253e 0%, #080d1c 52%, #020407 100%)',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 0 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>
        <Canvas
          camera={{ position: [0, 0.05, 2.95], fov: 40 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
          shadows
        >
          <color attach="background" args={['#030712']} />
          <fog attach="fog" args={['#030712', 4.5, 9]} />

          {/* 3-point lighting */}
          <ambientLight intensity={0.22} />
          <directionalLight position={[ 3,  5,  4]} intensity={2.0} color="#fff4e0" castShadow />
          <directionalLight position={[-3, -1,  2]} intensity={0.65} color="#7ba8ff" />
          <directionalLight position={[ 2,  3, -5]} intensity={1.05} color="#c084fc" />
          <directionalLight position={[-2,  2, -4]} intensity={0.75} color="#22d3ee" />

          <Suspense fallback={<FallbackLoader />}>
            <Humanoid activation={activation} autoRotate={autoRotate} />
            <Environment preset="night" background={false} />
            <ContactShadows
              position={[0, -1.02, 0]}
              opacity={0.75}
              scale={3.5}
              blur={3.5}
              far={2.0}
              color="#000"
            />
          </Suspense>

          <OrbitControls
            enablePan={false}
            minDistance={1.8}
            maxDistance={5.5}
            target={[0, 0.02, 0]}
            onStart={() => setAutoRotate(false)}
          />

          <EffectComposer>
            <Bloom
              intensity={1.5}
              luminanceThreshold={0.28}
              luminanceSmoothing={0.55}
              mipmapBlur
              radius={0.88}
            />
            <Vignette eskil={false} offset={0.28} darkness={0.72} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Canvas>

        {/* Rotate toggle */}
        <button
          onClick={() => setAutoRotate(v => !v)}
          style={{
            position: 'absolute', top: 12, right: 12,
            padding: '6px 12px',
            background: 'rgba(8,14,32,0.78)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(148,163,184,0.18)',
            borderRadius: 9,
            color: '#f1f5f9',
            fontSize: '0.74rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
            letterSpacing: '0.03em',
          }}
        >
          {autoRotate ? '⏸ Pause' : '▶ Rotate'}
        </button>

        {/* Activation legend — only when something is highlighted */}
        {hasActivation && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            padding: '10px 14px',
            background: 'linear-gradient(180deg, rgba(8,14,32,0.55) 0%, rgba(2,5,16,0.88) 100%)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(148,163,184,0.12)',
            borderRadius: 12,
            fontSize: '0.78rem',
          }}>
            {activation.primary.length > 0 && (
              <div style={{ display: 'flex', gap: 9, marginBottom: activation.secondary.length ? 5 : 0, alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: PRIMARY_COLOR, boxShadow: `0 0 8px ${PRIMARY_COLOR}` }} />
                <strong style={{ color: PRIMARY_COLOR, letterSpacing: '0.03em', fontSize: '0.72rem' }}>PRIMARY</strong>
                <span style={{ color: '#e2e8f0' }}>{activation.primary.join(' · ')}</span>
              </div>
            )}
            {activation.secondary.length > 0 && (
              <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: SECONDARY_COLOR, boxShadow: `0 0 7px ${SECONDARY_COLOR}` }} />
                <strong style={{ color: SECONDARY_COLOR, letterSpacing: '0.03em', fontSize: '0.72rem' }}>SECONDARY</strong>
                <span style={{ color: '#cbd5e1' }}>{activation.secondary.join(' · ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isPresetMode && (
        <div className="muscle-preview-legend">
          <span style={{ color: 'var(--text-muted)' }}>
            Drag to rotate · Scroll to zoom · Auto-rotates until you interact
          </span>
        </div>
      )}
    </div>
  );
}
