import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';

// Stylized anatomical 3D humanoid built from primitives, shaped to feel like an
// anatomical reference (layered deltoids, separated pec heads, distinct biceps/triceps,
// quads vs. hamstrings, glutes behind, calves with tibialis, etc.).

const PRIMARY_COLOR = '#ef4444';       // deep red for active muscles (anatomy-book feel)
const SECONDARY_COLOR = '#3b82f6';
const SKIN_COLOR = '#d4a584';          // neutral anatomical tan
const DEEP_MUSCLE = '#7a3d2b';         // darker for non-active deep tissue

const DEMO_PRESETS = {
  'Bench Press':    { primary: ['chest', 'frontDelt'], secondary: ['triceps'] },
  'Squat':          { primary: ['quads', 'glutes'],    secondary: ['hamstrings', 'lowerBack', 'abs'] },
  'Deadlift':       { primary: ['hamstrings', 'glutes', 'lowerBack'], secondary: ['traps', 'lats', 'forearms', 'quads'] },
  'Overhead Press': { primary: ['frontDelt', 'sideDelt'], secondary: ['triceps', 'traps', 'chest'] },
  'Pull-up':        { primary: ['lats', 'biceps'],     secondary: ['rearDelt', 'upperBack', 'forearms'] },
  'Barbell Curl':   { primary: ['biceps'],             secondary: ['forearms'] },
};

// Muscle mesh: pulses emissive when active, subtle idle otherwise.
function Muscle({ name, activation, position, rotation, args, shape = 'box' }) {
  const ref = useRef();
  const role = activation.primary.includes(name) ? 'primary'
             : activation.secondary.includes(name) ? 'secondary' : 'none';

  useFrame((state) => {
    if (!ref.current) return;
    const mat = ref.current.material;
    if (role === 'primary') {
      const t = (Math.sin(state.clock.elapsedTime * 3) + 1) / 2;
      mat.emissiveIntensity = 0.6 + t * 0.8;
    } else if (role === 'secondary') {
      const t = (Math.sin(state.clock.elapsedTime * 2) + 1) / 2;
      mat.emissiveIntensity = 0.2 + t * 0.35;
    } else {
      mat.emissiveIntensity = 0;
    }
  });

  const color = role === 'primary' ? PRIMARY_COLOR
             : role === 'secondary' ? SECONDARY_COLOR
             : SKIN_COLOR;
  const emissive = role === 'primary' ? PRIMARY_COLOR
                 : role === 'secondary' ? SECONDARY_COLOR
                 : '#000000';

  const geo = shape === 'sphere'   ? <sphereGeometry args={args} />
            : shape === 'capsule'  ? <capsuleGeometry args={args} />
            : shape === 'cylinder' ? <cylinderGeometry args={args} />
            : <boxGeometry args={args} />;

  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      {geo}
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={0}
        roughness={0.6}
        metalness={0.05}
      />
    </mesh>
  );
}

// Fixed, non-highlighting body part (bones, skull shell, etc.)
function Fixed({ position, rotation, args, shape = 'box', color = SKIN_COLOR }) {
  const geo = shape === 'sphere'   ? <sphereGeometry args={args} />
            : shape === 'capsule'  ? <capsuleGeometry args={args} />
            : shape === 'cylinder' ? <cylinderGeometry args={args} />
            : <boxGeometry args={args} />;
  return (
    <mesh position={position} rotation={rotation}>
      {geo}
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} />
    </mesh>
  );
}

function Humanoid({ activation, autoRotate }) {
  const group = useRef();
  useFrame((_, delta) => {
    if (group.current && autoRotate) group.current.rotation.y += delta * 0.3;
  });

  // Use capsule geometry arg form: [radius, length, capSegments, radialSegments]
  return (
    <group ref={group} position={[0, -0.4, 0]}>
      {/* ── HEAD ─────────────────────────────────────────── */}
      <Fixed position={[0, 2.9, 0]} args={[0.32, 24, 20]} shape="sphere" color="#c99a7a" />
      {/* Jaw */}
      <Fixed position={[0, 2.68, 0.08]} args={[0.22, 0.18, 0.26]} color="#c99a7a" />
      {/* Neck */}
      <Fixed position={[0, 2.42, 0]} args={[0.13, 0.22, 12, 16]} shape="capsule" color="#c99a7a" />

      {/* ── TRAPEZIUS ───────────────────────────────────── */}
      <Muscle name="traps" activation={activation} position={[-0.18, 2.25, -0.04]} args={[0.28, 0.3, 0.2]} rotation={[0, 0, -0.35]} />
      <Muscle name="traps" activation={activation} position={[0.18, 2.25, -0.04]} args={[0.28, 0.3, 0.2]} rotation={[0, 0, 0.35]} />

      {/* ── SHOULDERS / DELTOIDS (three heads) ─────────── */}
      {/* Left */}
      <Muscle name="frontDelt" activation={activation} position={[-0.58, 2.0, 0.14]} args={[0.19, 16, 12]} shape="sphere" />
      <Muscle name="sideDelt"  activation={activation} position={[-0.68, 2.02, 0]}   args={[0.19, 16, 12]} shape="sphere" />
      <Muscle name="rearDelt"  activation={activation} position={[-0.58, 2.0, -0.14]}args={[0.17, 16, 12]} shape="sphere" />
      {/* Right */}
      <Muscle name="frontDelt" activation={activation} position={[0.58, 2.0, 0.14]}  args={[0.19, 16, 12]} shape="sphere" />
      <Muscle name="sideDelt"  activation={activation} position={[0.68, 2.02, 0]}    args={[0.19, 16, 12]} shape="sphere" />
      <Muscle name="rearDelt"  activation={activation} position={[0.58, 2.0, -0.14]} args={[0.17, 16, 12]} shape="sphere" />

      {/* ── CHEST (pecs, two heads each side) ──────────── */}
      <Muscle name="chest" activation={activation} position={[-0.24, 1.75, 0.28]} args={[0.27, 18, 14]} shape="sphere" />
      <Muscle name="chest" activation={activation} position={[0.24, 1.75, 0.28]}  args={[0.27, 18, 14]} shape="sphere" />
      {/* Upper chest shelf */}
      <Muscle name="chest" activation={activation} position={[0, 1.95, 0.28]} args={[0.52, 0.12, 0.18]} />

      {/* ── BACK ─────────────────────────────────────────── */}
      {/* Upper back base */}
      <Muscle name="upperBack" activation={activation} position={[0, 1.8, -0.2]} args={[0.8, 0.5, 0.22]} />
      {/* Lats wing out */}
      <Muscle name="lats" activation={activation} position={[-0.46, 1.55, -0.08]} args={[0.15, 16, 12]} shape="sphere" />
      <Muscle name="lats" activation={activation} position={[-0.46, 1.4, -0.08]}  args={[0.15, 0.8, 0.32]} />
      <Muscle name="lats" activation={activation} position={[0.46, 1.55, -0.08]}  args={[0.15, 16, 12]} shape="sphere" />
      <Muscle name="lats" activation={activation} position={[0.46, 1.4, -0.08]}   args={[0.15, 0.8, 0.32]} />
      {/* Lower back (erectors) */}
      <Muscle name="lowerBack" activation={activation} position={[-0.12, 0.95, -0.18]} args={[0.12, 0.4, 0.18]} />
      <Muscle name="lowerBack" activation={activation} position={[0.12, 0.95, -0.18]}  args={[0.12, 0.4, 0.18]} />

      {/* ── ABS (six-pack) ────────────────────────────── */}
      <Muscle name="abs" activation={activation} position={[-0.1, 1.48, 0.26]} args={[0.15, 0.16, 0.12]} />
      <Muscle name="abs" activation={activation} position={[0.1, 1.48, 0.26]}  args={[0.15, 0.16, 0.12]} />
      <Muscle name="abs" activation={activation} position={[-0.1, 1.28, 0.27]} args={[0.15, 0.16, 0.12]} />
      <Muscle name="abs" activation={activation} position={[0.1, 1.28, 0.27]}  args={[0.15, 0.16, 0.12]} />
      <Muscle name="abs" activation={activation} position={[-0.1, 1.08, 0.27]} args={[0.15, 0.16, 0.12]} />
      <Muscle name="abs" activation={activation} position={[0.1, 1.08, 0.27]}  args={[0.15, 0.16, 0.12]} />
      {/* Obliques */}
      <Muscle name="obliques" activation={activation} position={[-0.32, 1.25, 0.16]} args={[0.1, 0.48, 0.22]} rotation={[0, 0, 0.15]} />
      <Muscle name="obliques" activation={activation} position={[0.32, 1.25, 0.16]}  args={[0.1, 0.48, 0.22]} rotation={[0, 0, -0.15]} />

      {/* ── UPPER ARMS ──────────────────────────────────── */}
      {/* Biceps (front) */}
      <Muscle name="biceps" activation={activation} position={[-0.78, 1.6, 0.1]} args={[0.12, 16, 12]} shape="sphere" />
      <Muscle name="biceps" activation={activation} position={[-0.78, 1.45, 0.1]}args={[0.11, 0.4, 8, 12]} shape="capsule" />
      <Muscle name="biceps" activation={activation} position={[0.78, 1.6, 0.1]}  args={[0.12, 16, 12]} shape="sphere" />
      <Muscle name="biceps" activation={activation} position={[0.78, 1.45, 0.1]} args={[0.11, 0.4, 8, 12]} shape="capsule" />
      {/* Triceps (back) */}
      <Muscle name="triceps" activation={activation} position={[-0.78, 1.55, -0.1]} args={[0.12, 0.5, 0.18]} />
      <Muscle name="triceps" activation={activation} position={[0.78, 1.55, -0.1]}  args={[0.12, 0.5, 0.18]} />
      {/* Inner arm fill */}
      <Fixed position={[-0.78, 1.45, 0]} args={[0.095, 0.4, 8, 12]} shape="capsule" color={DEEP_MUSCLE} />
      <Fixed position={[0.78, 1.45, 0]}  args={[0.095, 0.4, 8, 12]} shape="capsule" color={DEEP_MUSCLE} />

      {/* ── ELBOWS ──────────────────────────────────────── */}
      <Fixed position={[-0.78, 1.18, 0]} args={[0.12, 16, 12]} shape="sphere" color="#b88a6a" />
      <Fixed position={[0.78, 1.18, 0]}  args={[0.12, 16, 12]} shape="sphere" color="#b88a6a" />

      {/* ── FOREARMS ────────────────────────────────────── */}
      <Muscle name="forearms" activation={activation} position={[-0.78, 0.9, 0.04]} args={[0.1, 0.5, 10, 14]} shape="capsule" />
      <Muscle name="forearms" activation={activation} position={[0.78, 0.9, 0.04]}  args={[0.1, 0.5, 10, 14]} shape="capsule" />

      {/* Hands */}
      <Fixed position={[-0.78, 0.58, 0.05]} args={[0.09, 0.12, 0.16]} color="#c99a7a" />
      <Fixed position={[0.78, 0.58, 0.05]}  args={[0.09, 0.12, 0.16]} color="#c99a7a" />

      {/* ── PELVIS / HIPS ───────────────────────────────── */}
      <Fixed position={[0, 0.85, 0]} args={[0.68, 0.3, 0.34]} color="#b88a6a" />

      {/* ── GLUTES ──────────────────────────────────────── */}
      <Muscle name="glutes" activation={activation} position={[-0.18, 0.7, -0.15]} args={[0.22, 18, 14]} shape="sphere" />
      <Muscle name="glutes" activation={activation} position={[0.18, 0.7, -0.15]}  args={[0.22, 18, 14]} shape="sphere" />

      {/* ── QUADS (front thigh) ─────────────────────────── */}
      <Muscle name="quads" activation={activation} position={[-0.22, 0.28, 0.1]} args={[0.15, 0.7, 12, 16]} shape="capsule" />
      <Muscle name="quads" activation={activation} position={[0.22, 0.28, 0.1]}  args={[0.15, 0.7, 12, 16]} shape="capsule" />

      {/* ── HAMSTRINGS (back thigh) ─────────────────────── */}
      <Muscle name="hamstrings" activation={activation} position={[-0.22, 0.28, -0.1]} args={[0.13, 0.68, 10, 14]} shape="capsule" />
      <Muscle name="hamstrings" activation={activation} position={[0.22, 0.28, -0.1]}  args={[0.13, 0.68, 10, 14]} shape="capsule" />

      {/* ── KNEES ───────────────────────────────────────── */}
      <Fixed position={[-0.22, -0.12, 0]} args={[0.12, 16, 12]} shape="sphere" color="#b88a6a" />
      <Fixed position={[0.22, -0.12, 0]}  args={[0.12, 16, 12]} shape="sphere" color="#b88a6a" />

      {/* ── CALVES ──────────────────────────────────────── */}
      <Muscle name="calves" activation={activation} position={[-0.22, -0.45, -0.06]} args={[0.13, 0.55, 12, 14]} shape="capsule" />
      <Muscle name="calves" activation={activation} position={[0.22, -0.45, -0.06]}  args={[0.13, 0.55, 12, 14]} shape="capsule" />

      {/* ── TIBIALIS (shin) ─────────────────────────────── */}
      <Muscle name="tibialis" activation={activation} position={[-0.22, -0.45, 0.08]} args={[0.08, 0.5, 0.12]} />
      <Muscle name="tibialis" activation={activation} position={[0.22, -0.45, 0.08]}  args={[0.08, 0.5, 0.12]} />

      {/* ── ANKLES / FEET ───────────────────────────────── */}
      <Fixed position={[-0.22, -0.8, 0]} args={[0.1, 12, 10]} shape="sphere" color="#b88a6a" />
      <Fixed position={[0.22, -0.8, 0]}  args={[0.1, 12, 10]} shape="sphere" color="#b88a6a" />
      <Fixed position={[-0.22, -0.85, 0.12]} args={[0.18, 0.1, 0.34]} color="#b88a6a" />
      <Fixed position={[0.22, -0.85, 0.12]}  args={[0.18, 0.1, 0.34]} color="#b88a6a" />
    </group>
  );
}

function Loading() {
  return (
    <Html center>
      <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Loading 3D model…</div>
    </Html>
  );
}

export default function MuscleMap3D() {
  const presetNames = Object.keys(DEMO_PRESETS);
  const [preset, setPreset] = useState(presetNames[0]);
  const [autoRotate, setAutoRotate] = useState(true);
  const activation = DEMO_PRESETS[preset];

  const primaryList = activation.primary.join(', ');
  const secondaryList = activation.secondary.join(', ');

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
        maxHeight: 560,
        marginTop: '0.75rem',
        background: 'radial-gradient(circle at 50% 30%, #1e293b, #020617)',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <Canvas camera={{ position: [0, 0.8, 4.8], fov: 35 }}>
          <color attach="background" args={['#020617']} />
          <fog attach="fog" args={['#020617', 5, 12]} />

          {/* Warm key light from above-right */}
          <directionalLight position={[4, 6, 4]} intensity={1.4} color="#ffedd5" />
          {/* Cool fill from the left */}
          <directionalLight position={[-4, 3, 2]} intensity={0.6} color="#60a5fa" />
          {/* Rim light from behind */}
          <directionalLight position={[0, 3, -5]} intensity={0.8} color="#a78bfa" />
          <ambientLight intensity={0.35} />
          {/* Accent point light that highlights the front */}
          <pointLight position={[0, 2, 3]} intensity={0.5} color="#fb923c" />

          <Suspense fallback={<Loading />}>
            <Humanoid activation={activation} autoRotate={autoRotate} />
            <ContactShadows
              position={[0, -1.3, 0]}
              opacity={0.55}
              scale={6}
              blur={2.4}
              far={4}
            />
          </Suspense>

          <OrbitControls
            enablePan={false}
            minDistance={3.5}
            maxDistance={8}
            target={[0, 0.6, 0]}
            onStart={() => setAutoRotate(false)}
          />
        </Canvas>

        {/* Overlay controls */}
        <button
          onClick={() => setAutoRotate(v => !v)}
          style={{
            position: 'absolute', top: 12, right: 12,
            padding: '6px 12px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: 8,
            color: '#f1f5f9',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
          }}
        >
          {autoRotate ? '⏸ Pause' : '▶ Rotate'}
        </button>

        {/* Activation panel, bottom-left */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, right: 12,
          padding: '10px 14px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: 10,
          color: '#f1f5f9',
          fontSize: '0.8rem',
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIMARY_COLOR, boxShadow: `0 0 8px ${PRIMARY_COLOR}` }} />
            <strong style={{ color: PRIMARY_COLOR }}>Primary:</strong>
            <span>{primaryList || 'None'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: SECONDARY_COLOR }} />
            <strong style={{ color: SECONDARY_COLOR }}>Secondary:</strong>
            <span>{secondaryList || 'None'}</span>
          </div>
        </div>
      </div>

      <div className="muscle-preview-legend">
        <span style={{ color: 'var(--text-muted)' }}>Drag to rotate · Scroll to zoom · Auto-rotates until you interact</span>
      </div>
    </div>
  );
}
