# Session Handoff — Muscle Map 3D Feature

**Branch:** `claude/show-session-muscles-tb9DZ`
**Last updated:** 2026-04-16
**Trigger word:** "dinosaur" — when user says this in a new session, load this file and continue from WHERE WE LEFT OFF below.

---

## Project context

Repo: `Bweakfest/gym-tracker` — a gym-tracking web app (React/Vite client, Node server).
Goal of this branch: show the muscles worked during a workout session, using a 3D humanoid figure that glows where muscles are activated.

Key paths:
- `client/src/pages/Workouts.jsx` — main workout-logging page (1685 lines). Exports `EXERCISES` array (exercise library with `{ name, group, equipment, muscles }`).
- `client/src/pages/Calendar.jsx` — calendar with selected-day detail panel.
- `client/src/components/MuscleMap.jsx` — OLD 2D SVG version (still exists, no longer rendered anywhere, but `deriveMuscleTags` is exported from it and imported by MuscleMap3D).
- `client/src/components/preview/MuscleMap3D.jsx` — the 3D component. This is what the user wants displayed everywhere.
- `client/src/pages/MusclePreview.jsx` — preview page showing Options A/B/C (user picked Option B = the 3D version).

## What has been DONE on this branch

Commits (most recent first):
1. `fc9e4ff` — Replace blob figure with geometric humanoid, integrate 3D into Workouts/Calendar.
   - Scrapped the marching-cubes metaball approach (blobs weren't merging — looked like disconnected spheres).
   - Rebuilt `MuscleMap3D.jsx` with `sphereGeometry`/`capsuleGeometry`/`cylinderGeometry` primitives laid out anatomically.
   - Exported `deriveMuscleTags` from `MuscleMap.jsx`.
   - `MuscleMap3D` now accepts a `workouts` prop — when provided, derives activation from the logged exercises; when absent, falls back to the exercise-preset picker used in MusclePreview.
   - Replaced `<MuscleMap>` with lazy-loaded `<MuscleMap3D>` in Workouts.jsx (line 1284) and Calendar.jsx (line 313).
2. `1f504b0` — (earlier) redesign attempt with 126 metaballs. Failed — blobs stayed disconnected.
3. `d9e23b9` — Added `<MuscleMap>` (2D) to Calendar day detail. Now superseded by MuscleMap3D.

**Build status:** `npx vite build` in `client/` succeeds cleanly.

## Current state of MuscleMap3D

Uses `@react-three/fiber` + `@react-three/drei` + `@react-three/postprocessing` (already in `client/package.json`).

Structure:
- `Part` component — wraps a mesh with an activation-aware `meshPhysicalMaterial`. Primary muscles → red (`#ef4444`), secondary → blue (`#3b82f6`), inactive → skin (`#c9937a`). Active muscles pulse via `emissiveIntensity` animated in `useFrame`. Bloom post-processing adds the halo glow.
- `Humanoid` — contains all the body-part `<Sphere>`/`<Capsule>`/`<Cyl>` elements. Auto-rotates on Y axis when `autoRotate` is true; user interaction pauses rotation via OrbitControls.
- Default export `MuscleMap3D({ workouts })` — if `workouts` prop given, derives activation; otherwise shows preset pills.

Activation derivation: uses `deriveMuscleTags(group, muscles)` from `MuscleMap.jsx`. Returns `{ primary: [muscleKey,...], secondary: [...] }`. Muscle keys: `chest, lats, traps, upperBack, lowerBack, frontDelt, sideDelt, rearDelt, biceps, triceps, forearms, abs, obliques, quads, hamstrings, glutes, calves, tibialis`.

## The problem the user currently has

**User screenshot shows the OLD 2D SVG MuscleMap** ("Muscles Worked" heading with FRONT/BACK labels, boxy cartoon figure with Chest/Traps/Upper Back/Lower Back labels). This is `client/src/components/MuscleMap.jsx`.

BUT — `grep` for `MuscleMap` shows it's not rendered anywhere anymore. It's only imported by MuscleMap3D.jsx for the `deriveMuscleTags` helper. So either:
- User hasn't pulled the latest branch (`git pull origin claude/show-session-muscles-tb9DZ`)
- Vite dev server needs restart
- Browser cache (need hard refresh)

**Verify the user has pulled** `fc9e4ff` before doing more work. Ask them to confirm they see a 3D canvas (dark background, rotating figure, "Pause/Rotate" button top-right) in the Workouts page.

## WHERE WE LEFT OFF — next task

User feedback after seeing the sphere-and-capsule version (commit `fc9e4ff`):
> "make sure that when the new version is added that alot of effort whent into the design and he should look flawlessly like a human"

**Task:** Rewrite the Humanoid in MuscleMap3D.jsx using `THREE.LatheGeometry` (surfaces of revolution with anatomical profile curves) instead of basic spheres/capsules. This gives organic, continuously tapered body parts.

Planned approach:
1. **Torso as LatheGeometry** with profile points: wide at shoulders → narrow at waist → hips widen. Then scale Z by ~0.55 so the torso is oval in cross-section (wider side-to-side than front-to-back, like a real human).
2. **Arms as two LatheGeometries** (upper + lower):
   - Upper arm profile: shoulder cap → bicep bulge (peak ~mid) → narrow at elbow.
   - Forearm profile: slight bulge near elbow → taper to wrist.
3. **Legs as two LatheGeometries**:
   - Thigh: wide at hip → taper to knee.
   - Lower leg: knee → calf bulge (peak upper-mid) → taper to ankle.
4. **Head**: keep as scaled sphere (egg-shaped) with subtle chin sphere.
5. **Hands/feet**: ellipsoids with elongated Z for foot-forward shape.
6. **Muscle overlays**: keep sphere/ellipsoid bumps sitting just outside the base surface. Chest (pec pair), abs (6-pack grid), obliques, lats (V-sweep), traps, delts (front/side/rear spheres on shoulder joint), biceps, triceps, forearms, glutes, quads, hamstrings, calves, tibialis.
7. **Proportions**: aim for ~8-head-tall figure. Head Y=0.92, feet Y=-0.98.
8. **Material**: `meshPhysicalMaterial` with `sheen`, `clearcoat`, warm skin tone `#c9937a`. Active muscles pulse with `emissiveIntensity` as currently.
9. **Lighting**: keep the existing 3-point + cyan/magenta rim setup, it works well.
10. **Bloom**: keep — the user specifically said they LIKE how the muscles glow.

Implementation notes:
- Import `* as THREE from 'three'`.
- `LatheGeometry` args: `(points: Vector2[], segments=32, phiStart=0, phiLength=2π)`. Points are `new THREE.Vector2(radius, y)`.
- Build profiles with ~8-15 points per body part for smooth curves.
- The base body parts should share the same skin-colored material (no activation group).
- Muscle overlays remain separate meshes with `group` prop for activation coloring.

## How to continue

1. Read this file entirely.
2. Read `client/src/components/preview/MuscleMap3D.jsx` to see current state.
3. Verify the integration in Workouts.jsx:1284 and Calendar.jsx:313 is still intact.
4. Rewrite the `Humanoid` function (and add LatheGeometry profile constants) per the plan above.
5. Run `cd client && npx vite build` to verify no TS/import errors.
6. Commit with descriptive message, push to `claude/show-session-muscles-tb9DZ`.
7. Tell user to pull and hard-refresh to see the new version.

## User preferences / style notes

- User writes informally, expects concise responses.
- User is working on both desktop and phone — wants to be able to switch sessions.
- User appreciates the glow/pulse effect, doesn't want it removed.
- User has explicitly said "put a lot of effort into the design" — avoid lazy/minimal implementations for the humanoid shape.
- User flagged previous versions as "boxy" and "kind of shit" — don't ship anything that looks like floating spheres or a blob cluster.
- When in doubt about UI placement, default to Workouts page + Calendar day detail.

## Git operating context

- Branch: `claude/show-session-muscles-tb9DZ` (do NOT push to any other branch)
- Restricted to repo `Bweakfest/gym-tracker` only
- Never create a PR unless explicitly asked
- Commit messages: descriptive, multi-line, no emojis, explain the WHY
