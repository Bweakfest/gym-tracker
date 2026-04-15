import { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// Stylized 3D humanoid built from primitives.
// Each "muscle group" is a separate mesh so we can highlight it.
// Colors pulse on active groups. Auto-rotates; user can drag to rotate manually.

const PRIMARY_COLOR = '#f97316';
const SECONDARY_COLOR = '#3b82f6';
const BASE_COLOR = '#2d4256';
const PRIMARY_EMISSIVE = '#dc2626';

const DEMO_PRESETS = {
  'Bench Press':    { primary: ['chest', 'frontDelt'], secondary: ['triceps'] },
  'Squat':          { primary: ['quads', 'glutes'],    secondary: ['hamstrings', 'lowerBack'] },
  'Deadlift':       { primary: ['hamstrings', 'glutes', 'lowerBack'], secondary: ['traps', 'lats', 'forearms'] },
  'Overhead Press': { primary: ['frontDelt'],          secondary: ['triceps', 'chest'] },
  'Barbell Curl':   { primary: ['biceps'],             secondary: ['forearms'] },
};

function useActivatedColor(role) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    if (role === 'primary') {
      const t = (Math.sin(state.clock.elapsedTime * 2.5) + 1) / 2;
      ref.current.material.emissiveIntensity = 0.3 + t * 0.9;
    } else if (role === 'secondary') {
      const t = (Math.sin(state.clock.elapsedTime * 1.7) + 1) / 2;
      ref.current.material.emissiveIntensity = 0.15 + t * 0.35;
    } else if (ref.current.material.emissiveIntensity !== 0) {
      ref.current.material.emissiveIntensity = 0;
    }
  });
  return ref;
}

function BodyPart({ name, activation, position, args, shape = 'box', rotation = [0, 0, 0] }) {
  const role = activation.primary.includes(name) ? 'primary'
              : activation.secondary.includes(name) ? 'secondary' : 'none';
  const ref = useActivatedColor(role);

  const color = role === 'primary' ? PRIMARY_COLOR
             : role === 'secondary' ? SECONDARY_COLOR
             : BASE_COLOR;
  const emissive = role === 'primary' ? PRIMARY_EMISSIVE
                 : role === 'secondary' ? SECONDARY_COLOR
                 : '#000000';

  const Geometry = shape === 'sphere'    ? <sphereGeometry args={args} />
                : shape === 'capsule'    ? <capsuleGeometry args={args} />
                : shape === 'cylinder'   ? <cylinderGeometry args={args} />
                : <boxGeometry args={args} />;

  return (
    <mesh ref={ref} position={position} rotation={rotation} castShadow receiveShadow>
      {Geometry}
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={0.15}
        emissive={emissive}
        emissiveIntensity={role === 'none' ? 0 : 0.4}
      />
    </mesh>
  );
}

function Humanoid({ activation, autoRotate }) {
  const group = useRef();
  useFrame((state, delta) => {
    if (group.current && autoRotate) {
      group.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Head */}
      <BodyPart name="head" activation={activation} position={[0, 2.7, 0]} args={[0.38, 24, 16]} shape="sphere" />
      {/* Neck */}
      <BodyPart name="neck" activation={activation} position={[0, 2.3, 0]} args={[0.15, 0.15, 0.22]} shape="cylinder" />
      {/* Trapezius (shoulders up) */}
      <BodyPart name="traps" activation={activation} position={[0, 2.07, -0.07]} args={[0.75, 0.22, 0.22]} />

      {/* Chest (pecs) — two spheres */}
      <BodyPart name="chest" activation={activation} position={[-0.24, 1.75, 0.26]} args={[0.26, 16, 12]} shape="sphere" />
      <BodyPart name="chest" activation={activation} position={[0.24, 1.75, 0.26]} args={[0.26, 16, 12]} shape="sphere" />
      {/* Abs (rectus abdominis) — six-pack as a stacked plate */}
      <BodyPart name="abs" activation={activation} position={[0, 1.30, 0.25]} args={[0.38, 0.60, 0.16]} />
      {/* Obliques */}
      <BodyPart name="obliques" activation={activation} position={[-0.42, 1.35, 0.1]} args={[0.14, 0.54, 0.30]} />
      <BodyPart name="obliques" activation={activation} position={[0.42, 1.35, 0.1]} args={[0.14, 0.54, 0.30]} />

      {/* Upper back (base torso behind chest) */}
      <BodyPart name="upperBack" activation={activation} position={[0, 1.75, -0.2]} args={[0.78, 0.56, 0.22]} />
      {/* Lats */}
      <BodyPart name="lats" activation={activation} position={[-0.42, 1.55, -0.1]} args={[0.16, 0.66, 0.35]} />
      <BodyPart name="lats" activation={activation} position={[0.42, 1.55, -0.1]} args={[0.16, 0.66, 0.35]} />
      {/* Lower back */}
      <BodyPart name="lowerBack" activation={activation} position={[0, 1.02, -0.18]} args={[0.5, 0.32, 0.20]} />

      {/* Shoulders (deltoids) */}
      <BodyPart name="frontDelt" activation={activation} position={[-0.55, 1.95, 0.12]} args={[0.22, 16, 12]} shape="sphere" />
      <BodyPart name="frontDelt" activation={activation} position={[0.55, 1.95, 0.12]} args={[0.22, 16, 12]} shape="sphere" />
      <BodyPart name="rearDelt" activation={activation} position={[-0.55, 1.95, -0.12]} args={[0.18, 16, 12]} shape="sphere" />
      <BodyPart name="rearDelt" activation={activation} position={[0.55, 1.95, -0.12]} args={[0.18, 16, 12]} shape="sphere" />

      {/* Biceps (front) / Triceps (back) */}
      <BodyPart name="biceps" activation={activation} position={[-0.68, 1.55, 0.1]} args={[0.14, 16, 12]} shape="sphere" />
      <BodyPart name="biceps" activation={activation} position={[0.68, 1.55, 0.1]} args={[0.14, 16, 12]} shape="sphere" />
      <BodyPart name="triceps" activation={activation} position={[-0.68, 1.55, -0.1]} args={[0.14, 16, 12]} shape="sphere" />
      <BodyPart name="triceps" activation={activation} position={[0.68, 1.55, -0.1]} args={[0.14, 16, 12]} shape="sphere" />
      {/* Upper arm fill */}
      <mesh position={[-0.68, 1.55, 0]}><cylinderGeometry args={[0.11, 0.1, 0.5, 12]} /><meshStandardMaterial color={BASE_COLOR} roughness={0.6} /></mesh>
      <mesh position={[0.68, 1.55, 0]}><cylinderGeometry args={[0.11, 0.1, 0.5, 12]} /><meshStandardMaterial color={BASE_COLOR} roughness={0.6} /></mesh>

      {/* Forearms */}
      <BodyPart name="forearms" activation={activation} position={[-0.72, 1.05, 0]} args={[0.1, 0.08, 0.55, 12]} shape="cylinder" />
      <BodyPart name="forearms" activation={activation} position={[0.72, 1.05, 0]} args={[0.1, 0.08, 0.55, 12]} shape="cylinder" />

      {/* Hands */}
      <mesh position={[-0.72, 0.72, 0]}><sphereGeometry args={[0.09, 12, 12]} /><meshStandardMaterial color={BASE_COLOR} /></mesh>
      <mesh position={[0.72, 0.72, 0]}><sphereGeometry args={[0.09, 12, 12]} /><meshStandardMaterial color={BASE_COLOR} /></mesh>

      {/* Pelvis */}
      <mesh position={[0, 0.92, 0]}><boxGeometry args={[0.7, 0.24, 0.36]} /><meshStandardMaterial color={BASE_COLOR} /></mesh>

      {/* Glutes */}
      <BodyPart name="glutes" activation={activation} position={[-0.17, 0.78, -0.12]} args={[0.20, 14, 10]} shape="sphere" />
      <BodyPart name="glutes" activation={activation} position={[0.17, 0.78, -0.12]} args={[0.20, 14, 10]} shape="sphere" />

      {/* Quads (front of thigh) */}
      <BodyPart name="quads" activation={activation} position={[-0.22, 0.35, 0.1]} args={[0.16, 0.62, 0.22]} />
      <BodyPart name="quads" activation={activation} position={[0.22, 0.35, 0.1]} args={[0.16, 0.62, 0.22]} />
      {/* Hamstrings (back of thigh) */}
      <BodyPart name="hamstrings" activation={activation} position={[-0.22, 0.35, -0.1]} args={[0.16, 0.62, 0.22]} />
      <BodyPart name="hamstrings" activation={activation} position={[0.22, 0.35, -0.1]} args={[0.16, 0.62, 0.22]} />

      {/* Knees */}
      <mesh position={[-0.22, 0.0, 0]}><sphereGeometry args={[0.11, 12, 12]} /><meshStandardMaterial color={BASE_COLOR} /></mesh>
      <mesh position={[0.22, 0.0, 0]}><sphereGeometry args={[0.11, 12, 12]} /><meshStandardMaterial color={BASE_COLOR} /></mesh>

      {/* Calves */}
      <BodyPart name="calves" activation={activation} position={[-0.22, -0.35, -0.05]} args={[0.14, 0.58, 0.22]} />
      <BodyPart name="calves" activation={activation} position={[0.22, -0.35, -0.05]} args={[0.14, 0.58, 0.22]} />

      {/* Tibialis */}
      <BodyPart name="tibialis" activation={activation} position={[-0.22, -0.35, 0.08]} args={[0.09, 0.56, 0.12]} />
      <BodyPart name="tibialis" activation={activation} position={[0.22, -0.35, 0.08]} args={[0.09, 0.56, 0.12]} />

      {/* Feet */}
      <mesh position={[-0.22, -0.74, 0.08]}><boxGeometry args={[0.18, 0.1, 0.3]} /><meshStandardMaterial color={BASE_COLOR} /></mesh>
      <mesh position={[0.22, -0.74, 0.08]}><boxGeometry args={[0.18, 0.1, 0.3]} /><meshStandardMaterial color={BASE_COLOR} /></mesh>
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
        aspectRatio: '1/1',
        maxHeight: 480,
        marginTop: '0.75rem',
        background: 'radial-gradient(circle at 50% 40%, #0d1f35, #050a14)',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <Canvas shadows camera={{ position: [0, 1.5, 4.2], fov: 35 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 5, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-3, 4, -2]} intensity={0.5} color="#60a5fa" />
          <pointLight position={[0, 2, 3]} intensity={0.6} color="#f97316" />

          <Suspense fallback={<Loading />}>
            <Humanoid activation={activation} autoRotate={autoRotate} />
          </Suspense>

          <OrbitControls
            enablePan={false}
            minDistance={3}
            maxDistance={7}
            target={[0, 1.2, 0]}
            onStart={() => setAutoRotate(false)}
          />
        </Canvas>

        <button
          onClick={() => setAutoRotate(v => !v)}
          style={{
            position: 'absolute', top: 10, right: 10,
            padding: '6px 10px',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: '#fff',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {autoRotate ? 'Pause rotation' : 'Auto-rotate'}
        </button>
      </div>

      <div className="muscle-preview-legend">
        <span><span className="dot" style={{ background: PRIMARY_COLOR }} /> Primary</span>
        <span><span className="dot" style={{ background: SECONDARY_COLOR }} /> Secondary</span>
        <span style={{ color: 'var(--text-muted)' }}>Drag to rotate · Scroll to zoom</span>
      </div>
    </div>
  );
}
