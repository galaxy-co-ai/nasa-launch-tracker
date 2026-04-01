# Mission Control v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Artemis II tracker as a 4-view mission control display (TRACK / LIVE / CONTROL / ZEN) with a shared Three.js 3D scene, 100vh zero-scroll layouts, and real NASA data feeds.

**Architecture:** Single-page app with 4 mutually exclusive views rendered inside a persistent shell (tab bar + bottom bar). A single R3F `<Canvas>` lives at the root and is resized/repositioned per view via CSS — never unmounted. All telemetry is computed client-side from MET with optional JPL Horizons override. API routes proxy NASA DSN and DONKI feeds. Auto-view logic selects the best view based on mission phase.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind CSS 4, @react-three/fiber + drei, Three.js, fast-xml-parser (existing)

**Spec:** `C:\Users\Owner\Downloads\ARTEMIS-TRACKER-SPEC-V2.md` — treat as canonical. This plan implements it section by section.

**What survives from v1:**
- `/api/dsn/route.ts` — reuse with minor edits (poll rate change)
- `/api/space-weather/route.ts` — rename to `/api/donki/route.ts`, reuse logic
- `/api/horizons/route.ts` — keep as bonus override, not required by spec
- Mission data constants (CREW, TIMELINE timestamps) — restructure into new format
- Glass panel / status dot CSS patterns — fold into new token system

**What gets deleted:**
- `src/components/MissionControl.tsx` (1,210-line monolith)
- `src/components/DSNPanel.tsx`, `NasaTV.tsx`, `NasaEyes.tsx`, `SpaceWeather.tsx`
- Current `globals.css` token system (replaced by spec Section 10 tokens)
- Light theme (spec: dark-mode only)
- `hls.js` dependency (unused)

---

## File Structure (from spec Section 12)

```
src/
├── app/
│   ├── layout.tsx                    # Root layout — fonts, meta, global styles
│   ├── page.tsx                      # Renders <App /> (view router + scene)
│   └── api/
│       ├── dsn/route.ts              # REUSE — NASA DSN XML proxy
│       └── donki/route.ts            # REUSE (renamed) — DONKI space weather proxy
├── components/
│   ├── scene/
│   │   ├── ArtemisScene.tsx          # R3F Canvas wrapper (dynamic import, ssr:false)
│   │   ├── Earth.tsx                 # Procedural Earth: day/night, atmosphere, city lights
│   │   ├── Moon.tsx                  # Procedural Moon: grey sphere + craters
│   │   ├── Orion.tsx                 # Compound mesh: capsule + service module + panels
│   │   ├── Trajectory.tsx            # Line geometry: full path + traveled segment
│   │   ├── Starfield.tsx             # 8000-point star sphere
│   │   └── CameraController.tsx      # 4-mode camera (Follow/Earth/Moon/Overview)
│   ├── views/
│   │   ├── TrackView.tsx             # Full-scene + HUD overlays + distance strip
│   │   ├── LiveView.tsx              # NASA TV + feed + telemetry + mini scene
│   │   ├── ControlView.tsx           # CSS Grid dashboard, all panels
│   │   └── ZenView.tsx               # Full scene, no UI, auto-hide tabs
│   ├── hud/
│   │   ├── Telemetry.tsx             # Telemetry value display (stacked or inline)
│   │   ├── METClock.tsx              # Mission Elapsed Time display
│   │   ├── MilestoneRail.tsx         # Vertical dot timeline (right side of TRACK)
│   │   ├── PhaseIndicator.tsx        # Current phase name badge
│   │   ├── DistanceStrip.tsx         # Earth-to-Moon horizontal progress bar
│   │   ├── BottomBar.tsx             # Persistent: phase + MET + camera + speed
│   │   ├── CameraDropdown.tsx        # Camera mode selector
│   │   └── SpeedToggle.tsx           # Time warp: 1x → 10x → 100x → 1K → 10K
│   ├── panels/
│   │   ├── CrewCards.tsx             # 4 astronaut cards (compact in CONTROL)
│   │   ├── MissionFeed.tsx           # Reverse-chrono event log with amber flash
│   │   ├── TimelinePanel.tsx         # Milestone dots + labels
│   │   ├── DSNStatus.tsx             # 3-station dish status (compact)
│   │   └── SpaceWeather.tsx          # Kp index + flare status + CME alerts
│   └── shared/
│       ├── ViewTabs.tsx              # Top tab bar (desktop) / bottom nav (mobile)
│       ├── GlassCard.tsx             # Reusable glass panel wrapper
│       ├── NasaTVEmbed.tsx           # YouTube iframe (lazy-load)
│       └── LoadingScreen.tsx         # "INITIALIZING..." branded loader
├── lib/
│   ├── mission.ts                    # T0, TIMELINE, FEED_EVENTS constants
│   ├── trajectory.ts                # Pre-computed 600-point free-return path
│   ├── simulation.ts                # MET → phase/telemetry/position logic
│   └── format.ts                    # Number/time formatters + unit conversion
├── hooks/
│   ├── useMET.ts                    # Reactive MET clock (1Hz tick)
│   ├── useSimulation.ts             # MET + speed → full telemetry state
│   ├── useView.ts                   # Active view + auto-select logic
│   ├── useDSN.ts                    # Poll /api/dsn every 30s
│   └── useDONKI.ts                  # Poll /api/donki every 5min
├── types/
│   └── mission.ts                   # All shared TypeScript interfaces
└── styles/
    └── globals.css                  # Design tokens (spec Section 10) + utilities
```

---

## Phase 1: Foundation (Tasks 1-3)

### Task 1: Install deps, fonts, design tokens

**Files:**
- Modify: `package.json`
- Rewrite: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Delete: `src/components/MissionControl.tsx`, `src/components/DSNPanel.tsx`, `src/components/NasaTV.tsx`, `src/components/NasaEyes.tsx`, `src/components/SpaceWeather.tsx`, `src/lib/mission-data.ts`
- Remove dep: `hls.js`

- [ ] **Step 1: Install Three.js + R3F deps**

```bash
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
pnpm remove hls.js
```

- [ ] **Step 2: Rewrite globals.css with spec Section 10 tokens**

Replace entire file with spec's design token system. Key differences from v1:
- `--bg` is pure `#000000` (was `#06080c`)
- `--surface` is `rgba(10,10,20,0.7)` glass
- Font vars: `--font-display` (Instrument Serif), `--font-body` (DM Sans), `--font-mono` (DM Mono)
- No light theme
- `.glass-card` utility class: `background: var(--glass); backdrop-filter: blur(var(--glass-blur)); border: 1px solid var(--glass-border); border-radius: var(--glass-radius);`
- `html, body { height: 100%; overflow: hidden; }` — enforce 100vh no-scroll

- [ ] **Step 3: Rewrite layout.tsx — load new fonts**

Load Instrument Serif, DM Sans, DM Mono from Google Fonts via `next/font/google`. Set `overflow: hidden` on html/body. Remove starfield div. Set metadata for SEO.

- [ ] **Step 4: Delete all v1 components and lib**

Remove all files listed above. Keep `/api/dsn/route.ts` and `/api/space-weather/route.ts`.

- [ ] **Step 5: Rename space-weather route to donki**

Move `src/app/api/space-weather/route.ts` → `src/app/api/donki/route.ts`

- [ ] **Step 6: Create placeholder page.tsx**

```tsx
export default function Home() {
  return <div style={{ height: '100vh', background: '#000', color: '#fff' }}>Loading...</div>;
}
```

- [ ] **Step 7: Verify build passes**

```bash
pnpm build
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "chore: strip v1, install R3F deps, new design tokens"
```

---

### Task 2: Types, mission data, formatters

**Files:**
- Create: `src/types/mission.ts`
- Create: `src/lib/mission.ts`
- Create: `src/lib/format.ts`
- Create: `src/lib/trajectory.ts`
- Create: `src/lib/simulation.ts`

- [ ] **Step 1: Define all TypeScript interfaces**

`src/types/mission.ts` — export interfaces for: `View` (union: 'TRACK' | 'LIVE' | 'CONTROL' | 'ZEN'), `Phase`, `CrewMember`, `Milestone`, `FeedEvent`, `TelemetryState` (met, phase, velocity, altitude, distanceFromEarth, distanceToMoon, acceleration, trajectoryProgress), `CameraMode` (union: 'follow' | 'earth' | 'moon' | 'overview'), `SimSpeed` (union: 1 | 10 | 100 | 1000 | 10000), `DsnStation`, `DsnDish`, `DonkiEvent`

- [ ] **Step 2: Write mission constants**

`src/lib/mission.ts` — export `T0`, `TIMELINE` (object with named seconds), `FEED_EVENTS` (array from spec Section 9 — all 35 entries), `CREW` (4 astronauts), `PHASES` (ordered phase definitions with start/end MET)

- [ ] **Step 3: Write formatters**

`src/lib/format.ts` — export: `formatMET(seconds)` → `T+ DD:HH:MM:SS`, `formatNumber(n)`, `formatDistance(km)`, `convertUnits(value, from, to)`, `velUnit(useMph)`, `distUnit(useMph)`

- [ ] **Step 4: Write trajectory path generator**

`src/lib/trajectory.ts` — export `generateTrajectoryPoints(count: number): Vector3[]` — 600-point free-return path. Uses parametric curve: outbound leg (Earth → lunar flyby) as a smooth arc curving toward Moon, then return leg curving back. Returns array of `{x, y, z}` objects in scene units (Earth at origin, Moon at 350 units).

Key math:
- Outbound: cubic bezier from Earth surface → behind Moon
- Return: cubic bezier from behind Moon → Earth approach
- Total: 600 points, roughly 300 per leg

- [ ] **Step 5: Write simulation engine**

`src/lib/simulation.ts` — export `computeSimulation(met: number): TelemetryState`. Pure function. Takes MET in seconds, returns full telemetry state. Port the 5-phase logic from v1's `simulateTelemetry()` but output the full `TelemetryState` shape. Also export `getPhase(met: number): Phase` and `getTrajectoryProgress(met: number): number` (0→1 over full mission).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: types, mission data, simulation engine, trajectory math"
```

---

### Task 3: Core hooks

**Files:**
- Create: `src/hooks/useMET.ts`
- Create: `src/hooks/useSimulation.ts`
- Create: `src/hooks/useView.ts`
- Create: `src/hooks/useDSN.ts`
- Create: `src/hooks/useDONKI.ts`

- [ ] **Step 1: useMET hook**

```typescript
// Returns { met, realTime } — ticks every second, respects simSpeed
// met = (Date.now() - T0.getTime()) / 1000 * simSpeed
// When simSpeed > 1, MET advances faster than wall clock
export function useMET(simSpeed: SimSpeed): { met: number; realTime: Date }
```

Uses `useState` + `useEffect` with 1-second interval. Stores a `baseTime` and `baseMET` — when speed changes, capture current values so MET doesn't jump.

- [ ] **Step 2: useSimulation hook**

```typescript
// Wraps useMET + computeSimulation
export function useSimulation(simSpeed: SimSpeed): TelemetryState & { simSpeed: SimSpeed }
```

Calls `useMET(simSpeed)`, passes `met` to `computeSimulation()`, returns merged result.

- [ ] **Step 3: useView hook**

```typescript
// Active view management with auto-select logic (spec Section 8)
export function useView(met: number): {
  view: View;
  setView: (v: View) => void;
  isAutoSelected: boolean;
}
```

Implements `getDefaultView(met)` from spec. Stores manual override in localStorage. Only auto-selects on first visit or if user hasn't manually switched in 30 minutes.

- [ ] **Step 4: useDSN hook**

```typescript
export function useDSN(): { stations: DsnStation[]; loading: boolean; error: boolean }
```

Polls `/api/dsn` every 30 seconds. Graceful fallback on error (returns empty stations, never breaks UI).

- [ ] **Step 5: useDONKI hook**

```typescript
export function useDONKI(): { events: DonkiEvent[]; solarActivity: string; loading: boolean }
```

Polls `/api/donki` every 5 minutes. Graceful fallback.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: core hooks — useMET, useSimulation, useView, useDSN, useDONKI"
```

---

## Phase 2: 3D Scene (Tasks 4-6)

### Task 4: Scene shell + Starfield + basic camera

**Files:**
- Create: `src/components/scene/ArtemisScene.tsx`
- Create: `src/components/scene/Starfield.tsx`
- Create: `src/components/scene/CameraController.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: ArtemisScene — R3F Canvas wrapper**

Dynamic import with `ssr: false`. Accepts `containerStyle` prop for sizing per view. Renders `<Canvas>` with: linear tone mapping, transparent background, `dpr={[1, 2]}`. Contains `<Suspense>` around children. Receives `children` for view-specific content + always renders Starfield.

```tsx
'use client';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

function Scene({ children }: { children: React.ReactNode }) {
  return (
    <Canvas camera={{ fov: 45, near: 0.1, far: 10000, position: [0, 50, 200] }} gl={{ antialias: true }}>
      <Suspense fallback={null}>
        <Starfield />
        {children}
      </Suspense>
    </Canvas>
  );
}

export default dynamic(() => Promise.resolve(Scene), { ssr: false });
```

- [ ] **Step 2: Starfield — 8000-point star sphere**

```tsx
// 8000 points on sphere (r=3000-5000), color temperature variation
// PointsMaterial with sizeAttenuation, size 1.5
```

Use `useMemo` to generate positions + colors buffers. White/yellow/blue/red temperature variation via random hue shifts.

- [ ] **Step 3: CameraController — basic OrbitControls**

Wrap drei's `<OrbitControls>` with configurable target, min/max distance. Accept `mode: CameraMode` prop. For now, just implement basic orbit — full 4-mode transitions come in Task 8.

- [ ] **Step 4: Wire into page.tsx**

Render `ArtemisScene` filling the viewport with just the starfield. Verify 3D renders.

- [ ] **Step 5: Build and verify**

```bash
pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: R3F scene shell + 8000-star starfield"
```

---

### Task 5: Earth + Moon + Atmosphere

**Files:**
- Create: `src/components/scene/Earth.tsx`
- Create: `src/components/scene/Moon.tsx`

- [ ] **Step 1: Earth — procedural sphere with atmosphere**

Spec Section 6.1:
- Sphere geometry: radius 20, 64 segments
- Day texture: blue/green procedural (or a high-quality texture from a CDN)
- Atmosphere: Additive-blend sphere at 1.025x radius, blue fresnel glow using `<meshBasicMaterial>` with `side={BackSide}` and opacity
- Outer halo: BackSide sphere at 1.15x radius, soft blue additive
- Slow Y-rotation via `useFrame`
- City lights on dark hemisphere: subtle point pattern on night side (can use a simple shader or additive sprite layer)

For v2, a clean approach: use a basic blue-green sphere with `MeshStandardMaterial`, add atmosphere as a separate transparent sphere with fresnel effect. City lights can be a second sphere with emissive dots, visible only on the hemisphere facing away from light.

- [ ] **Step 2: Moon — procedural sphere with craters**

Spec Section 6.2:
- Sphere geometry: radius 5.4, 48 segments
- Grey base with canvas texture: generate a `<canvas>` element, draw grey base + random circles for craters + darker patches for maria
- `MeshStandardMaterial`, roughness 0.95
- Position at (350, 0, 0) — compressed visual scale
- Very slow orbital motion via `useFrame`

- [ ] **Step 3: Add to ArtemisScene, add lighting**

Add `<ambientLight intensity={0.1} />` and `<directionalLight position={[100, 50, 100]} intensity={1.5} />` (simulates Sun). Render Earth at origin, Moon at 350 units.

- [ ] **Step 4: Verify visuals**

Build, check that Earth and Moon render with atmosphere visible.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: procedural Earth (atmosphere, glow) + Moon (craters, maria)"
```

---

### Task 6: Orion spacecraft + Trajectory line

**Files:**
- Create: `src/components/scene/Orion.tsx`
- Create: `src/components/scene/Trajectory.tsx`

- [ ] **Step 1: Orion — compound procedural mesh**

Spec Section 6.3:
- Cone (capsule) + Cylinder (service module) + Box panels (solar arrays) + Cylinder (engine)
- Scale 0.4 units total
- Amber point light attached for visibility
- Accept `position: Vector3` and `tangent: Vector3` props — orient along trajectory tangent using `lookAt` or quaternion
- 80-particle amber trail using drei's `<Trail>` or a custom points buffer

Group all parts in a `<group>` with the amber PointLight.

- [ ] **Step 2: Trajectory — line geometry**

Spec Section 6.4:
- Import `generateTrajectoryPoints(600)` from lib
- Full path: `<Line>` from drei, amber at 20% opacity
- Traveled path: second `<Line>`, amber at 70% opacity, vertices sliced to `trajectoryProgress * 600`
- Accept `progress: number` (0→1) prop

- [ ] **Step 3: Wire Orion position to trajectory**

Orion's position = `trajectoryPoints[Math.floor(progress * 599)]`. Tangent = next point minus current point, normalized. Pass both to Orion component.

- [ ] **Step 4: Wire into scene with test simulation**

Pass a test `progress` value (e.g. 0.3) to verify Orion appears on the trajectory line between Earth and Moon.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: Orion spacecraft model + trajectory line with progress"
```

---

## Phase 3: Shared UI Components (Task 7)

### Task 7: GlassCard, ViewTabs, BottomBar, METClock, HUD components

**Files:**
- Create: `src/components/shared/GlassCard.tsx`
- Create: `src/components/shared/ViewTabs.tsx`
- Create: `src/components/shared/NasaTVEmbed.tsx`
- Create: `src/components/shared/LoadingScreen.tsx`
- Create: `src/components/hud/METClock.tsx`
- Create: `src/components/hud/BottomBar.tsx`
- Create: `src/components/hud/PhaseIndicator.tsx`
- Create: `src/components/hud/SpeedToggle.tsx`
- Create: `src/components/hud/Telemetry.tsx`
- Create: `src/components/hud/MilestoneRail.tsx`
- Create: `src/components/hud/DistanceStrip.tsx`
- Create: `src/components/hud/CameraDropdown.tsx`

- [ ] **Step 1: GlassCard**

```tsx
// Reusable wrapper: glass bg, blur, border, radius
// Props: className?, style?, children
export function GlassCard({ children, className, style }: Props) {
  return <div className={`glass-card ${className ?? ''}`} style={style}>{children}</div>;
}
```

- [ ] **Step 2: ViewTabs — spec Section 2 tab bar**

Desktop: top-center, 4 text labels (TRACK / LIVE / CONTROL / ZEN), underline indicator. Sticky over everything (z-50).
Mobile: bottom nav bar, iOS style, 4 icons + labels. Hide CONTROL on mobile.
Accept `active: View`, `onChange: (v: View) => void`.

- [ ] **Step 3: METClock**

Displays `T+ DD:HH:MM:SS` in DM Mono. Accepts `met: number`. Largest text in bottom bar (24px per spec). The single most important number on screen.

- [ ] **Step 4: BottomBar — spec Section 3**

60px tall, full width, glass background (`--surface-solid`). Three slots:
- Left: `<PhaseIndicator>` — phase name, amber when burning, white during coast
- Center: `<METClock>`
- Right: `<CameraDropdown>` (optional, only in TRACK/ZEN) + `<SpeedToggle>`

- [ ] **Step 5: SpeedToggle**

Cycles through: 1x → 10x → 100x → 1K → 10K → back to 1x. Button with lightning bolt icon. Shows current speed.

- [ ] **Step 6: Telemetry component**

Two modes via prop:
- `layout="vertical"` — stacked values for TRACK view left HUD (Earth dist, velocity, moon dist, G-force)
- `layout="horizontal"` — inline row for LIVE mobile
- `layout="grid"` — 2x2 for CONTROL view

Each value: label (text-2, small), value (font-mono, text-1, bold), unit (text-3).

- [ ] **Step 7: MilestoneRail**

Vertical dot rail for TRACK view right side. Dots: filled green (completed), filled amber (active), outline grey (upcoming). Labels beside dots. Accept `milestones` array + current `met`.

- [ ] **Step 8: DistanceStrip — spec Section 4 (THE hero UX element)**

Horizontal bar, 40px tall, full width. Earth icon left, Moon icon right. Linear scale 0→384,400 km. Reference markers: ISS (408), GPS (20,200), GEO (35,786). Amber animated marker at Orion's current distance. Marker slides smoothly. Labels on hover. This is the most important custom component — build it carefully.

```tsx
interface DistanceStripProps {
  distanceFromEarth: number; // km
  className?: string;
}
```

SVG or pure CSS implementation. Markers at fixed percentage positions. Orion marker animated with CSS transition.

- [ ] **Step 9: CameraDropdown**

Dropdown or segmented control: Follow / Earth / Moon / Overview. Accept `mode: CameraMode`, `onChange`.

- [ ] **Step 10: NasaTVEmbed**

YouTube iframe wrapper. Lazy-loads (only mounts when `active` prop is true). Accepts `videoId` prop. Autoplays muted.

Use the NASA channel live stream URL from spec: `https://www.youtube.com/embed/live_stream?channel=UCLA_DiR1FfKNvjuUpBHmylQ`

- [ ] **Step 11: LoadingScreen**

Full-viewport centered "INITIALIZING MISSION CONTROL..." text. DM Mono. Amber. Subtle pulse animation. Shows while 3D scene loads.

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "feat: all shared UI — GlassCard, ViewTabs, BottomBar, HUD components, DistanceStrip"
```

---

## Phase 4: Panel Components (Task 8)

### Task 8: MissionFeed, DSNStatus, SpaceWeather, CrewCards, TimelinePanel

**Files:**
- Create: `src/components/panels/MissionFeed.tsx`
- Create: `src/components/panels/DSNStatus.tsx`
- Create: `src/components/panels/SpaceWeather.tsx`
- Create: `src/components/panels/CrewCards.tsx`
- Create: `src/components/panels/TimelinePanel.tsx`

- [ ] **Step 1: MissionFeed — spec Section 9**

Filters `FEED_EVENTS` by `met <= currentMET`, reverse sorts, renders as scrollable list (ONLY scrollable element in the app). Amber flash animation on new entries (track last seen count, animate new ones). Each entry: `T+HH:MM` timestamp + message text.

- [ ] **Step 2: DSNStatus — compact version**

3 stations (Goldstone, Canberra, Madrid). Each: name, green/grey dot, target name if tracking. Uses `useDSN()` hook. Compact single-line per station for CONTROL view.

- [ ] **Step 3: SpaceWeather — compact version**

Shows Kp index, solar flare status, CME alerts. Green/yellow/red indicator. Uses `useDONKI()` hook. Simple text display.

- [ ] **Step 4: CrewCards**

Two modes: `compact` (initials circle + name + role, horizontal row) for CONTROL view, `full` (with bio) if ever needed. Default compact.

- [ ] **Step 5: TimelinePanel**

Milestone dots + labels in a vertical list. Same data as MilestoneRail but in a card format for CONTROL view. Shows completed/active/upcoming states.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: panel components — MissionFeed, DSN, SpaceWeather, Crew, Timeline"
```

---

## Phase 5: Views (Tasks 9-12)

### Task 9: TRACK View — the hero

**Files:**
- Create: `src/components/views/TrackView.tsx`

- [ ] **Step 1: Build TrackView layout**

Spec Section 2, View 1. Full viewport. 3D scene fills entire background (`position: fixed; inset: 0;`). HUD overlays are `position: absolute` with pointer-events-none (except interactive elements).

Layout:
- Left strip (24px from edge): Telemetry vertical stack — Earth distance, velocity, moon distance, G-force
- Right strip (24px from edge): MilestoneRail
- Above bottom bar: DistanceStrip
- Bottom bar: BottomBar (phase + MET + camera dropdown + speed)

All HUD elements use glass styling with slight background for readability over the 3D scene.

- [ ] **Step 2: Wire simulation data**

TrackView receives `simulation: TelemetryState` and `simSpeed` as props. Passes values to Telemetry, MilestoneRail, DistanceStrip, BottomBar. Scene receives `trajectoryProgress` for Orion position.

- [ ] **Step 3: Verify — scene with HUD overlays**

Check that 3D scene fills viewport, HUD is readable over it, DistanceStrip shows correct position.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: TRACK view — full-scene + HUD + distance strip"
```

---

### Task 10: LIVE View

**Files:**
- Create: `src/components/views/LiveView.tsx`

- [ ] **Step 1: Build LiveView layout**

Spec Section 2, View 2. Desktop: two columns (65% / 35%).

Left column:
- Top 60%: NasaTVEmbed (16:9)
- Bottom 40%: MissionFeed (scrollable)

Right column:
- Top: Telemetry panel (GlassCard) — velocity, altitude, G-force, distance
- Bottom: Mini 3D scene (GlassCard, auto-orbit camera, no user controls)

Bottom bar: same as TRACK.

- [ ] **Step 2: Mini 3D scene**

Render the same ArtemisScene in a small container. Camera auto-orbits (no OrbitControls). Pass `autoOrbit: true` to CameraController.

- [ ] **Step 3: Mobile layout**

NASA TV fills top 50%. Below: horizontal telemetry strip. Below: MET clock + phase. Feed hidden behind swipe-up tab.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: LIVE view — NASA TV + feed + telemetry + mini 3D"
```

---

### Task 11: CONTROL View

**Files:**
- Create: `src/components/views/ControlView.tsx`

- [ ] **Step 1: Build ControlView CSS Grid**

Spec Section 2, View 3. CSS Grid, 100vh, zero scroll.

```css
grid-template-columns: 1fr 1fr;
grid-template-rows: 55% 1fr 60px;
gap: 8px;
padding: 52px 8px 8px 8px;
```

- Top-left: 3D Scene with orbit controls (GlassCard)
- Top-right: Telemetry grid + CrewCards compact (GlassCard)
- Bottom-left: NasaTVEmbed small (1/3) + TimelinePanel (1/3)
- Bottom-right-top: DSNStatus (GlassCard)
- Bottom-right-bottom: SpaceWeather (GlassCard)
- Bottom row spanning full: BottomBar

- [ ] **Step 2: Wire all data**

All panels receive data from hooks/simulation. DSN and DONKI poll automatically.

- [ ] **Step 3: Mobile — redirect to TRACK**

On mobile (<768px), CONTROL tab redirects to TRACK per spec.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: CONTROL view — Bloomberg Terminal of space"
```

---

### Task 12: ZEN View

**Files:**
- Create: `src/components/views/ZenView.tsx`

- [ ] **Step 1: Build ZenView**

Spec Section 2, View 4. Full scene, no HUD, no text, no buttons. Auto-orbiting camera tracking Orion at distance. Time runs at 100x default.

Tab bar fades out after 2s of inactivity (CSS opacity transition). Reappears on mouse move or tap. ESC returns to previous view.

- [ ] **Step 2: Implement fade logic**

```tsx
const [showUI, setShowUI] = useState(true);
// On mouse move / touch: setShowUI(true), reset 2s timer
// Timer: after 2s idle, setShowUI(false)
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: ZEN view — full scene, auto-hide UI, contemplation mode"
```

---

## Phase 6: Integration (Tasks 13-14)

### Task 13: View router + App shell

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the App shell**

```tsx
'use client';

export default function App() {
  const [simSpeed, setSimSpeed] = useState<SimSpeed>(1);
  const sim = useSimulation(simSpeed);
  const { view, setView } = useView(sim.met);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      {/* 3D Scene — always mounted, resized per view */}
      <ArtemisScene containerStyle={getSceneStyle(view)}>
        <Earth />
        <Moon />
        <Orion position={...} tangent={...} />
        <Trajectory progress={sim.trajectoryProgress} />
        <CameraController mode={cameraMode} view={view} />
      </ArtemisScene>

      {/* Active view overlay */}
      {view === 'TRACK' && <TrackView sim={sim} simSpeed={simSpeed} onSpeedChange={setSimSpeed} />}
      {view === 'LIVE' && <LiveView sim={sim} simSpeed={simSpeed} onSpeedChange={setSimSpeed} />}
      {view === 'CONTROL' && <ControlView sim={sim} simSpeed={simSpeed} onSpeedChange={setSimSpeed} />}
      {view === 'ZEN' && <ZenView sim={sim} onExit={() => setView('TRACK')} />}

      {/* Tab bar — always on top */}
      {view !== 'ZEN' && <ViewTabs active={view} onChange={setView} />}

      {/* Loading screen */}
      <Suspense fallback={<LoadingScreen />} />
    </div>
  );
}
```

- [ ] **Step 2: Scene container style per view**

```typescript
function getSceneStyle(view: View): React.CSSProperties {
  switch (view) {
    case 'TRACK': return { position: 'fixed', inset: 0, zIndex: 0 };
    case 'ZEN':   return { position: 'fixed', inset: 0, zIndex: 0 };
    case 'LIVE':  return { /* positioned inside right column panel */ };
    case 'CONTROL': return { /* positioned inside top-left grid cell */ };
  }
}
```

For LIVE and CONTROL, the scene needs to render into a specific container. Use R3F's `eventSource` and CSS positioning, or use a portal approach. The key constraint: **never unmount the Canvas**.

Best approach: Canvas is always `position: fixed; inset: 0;` but use `gl.setViewport` or CSS `clip-path` to constrain visible area per view. Alternatively, use the full viewport canvas but layer HTML panels on top for LIVE/CONTROL views.

- [ ] **Step 3: Auto-view logic**

`useView` implements spec Section 8's `getDefaultView(met)`. On first load, auto-select. Store manual override + timestamp in localStorage.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: view router, App shell, scene positioning per view"
```

---

### Task 14: Camera system — 4 modes + transitions

**Files:**
- Modify: `src/components/scene/CameraController.tsx`

- [ ] **Step 1: Implement 4 camera modes**

```typescript
// Follow: chase cam behind Orion, looking at Orion
// Earth: positioned 100 units from Earth, looking at Earth
// Moon: positioned 50 units from Moon, looking at Moon
// Overview: positioned high (0, 200, 0), looking at midpoint
```

Each mode defines: `position: Vector3`, `target: Vector3`, `fov: number`.

- [ ] **Step 2: Smooth transitions**

On mode change, lerp camera position and target over 2 seconds using `useFrame`. Use smoothstep easing. Track transition progress with a ref.

- [ ] **Step 3: Auto-orbit for LIVE/CONTROL/ZEN**

When `autoOrbit: true`, slowly rotate camera around current target using `useFrame` with small angular increment.

- [ ] **Step 4: Disable controls in non-TRACK views**

OrbitControls only enabled in TRACK view. Other views: auto-orbit, no user interaction with camera.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 4-mode camera system with smooth transitions + auto-orbit"
```

---

## Phase 7: Polish + Mobile (Tasks 15-17)

### Task 15: Auto-view logic + localStorage

- [ ] **Step 1: Implement smart defaults from spec Section 8**
- [ ] **Step 2: localStorage persistence**
- [ ] **Step 3: Commit**

### Task 16: Mobile responsive layouts

- [ ] **Step 1: TRACK mobile — telemetry mini sheet**
- [ ] **Step 2: LIVE mobile — stacked layout**
- [ ] **Step 3: CONTROL mobile — redirect to TRACK**
- [ ] **Step 4: Mobile bottom nav**
- [ ] **Step 5: Commit**

### Task 17: Loading screen + SEO + final polish

- [ ] **Step 1: LoadingScreen as Suspense fallback**
- [ ] **Step 2: OG meta tags, favicon**
- [ ] **Step 3: Time warp test at 10,000x — verify smooth 86-second mission playthrough**
- [ ] **Step 4: Final commit + push to deploy**

```bash
git add -A && git commit -m "feat: Mission Control v2 complete — TRACK/LIVE/CONTROL/ZEN"
git push origin main
```

---

## Implementation Notes

**Critical path:** Task 1 → Task 2 → Task 4 → Task 5 → Task 6 → Task 7 → Task 9 (TRACK view working). Everything else builds on top of a working TRACK view.

**Parallelizable:** Tasks 2+3 (data/hooks), Task 7+8 (UI components) can be done by parallel subagents.

**Biggest risk:** The 3D scene (Tasks 4-6). Procedural Earth with atmosphere and city lights is complex shader work. Pragmatic approach: start with basic `MeshStandardMaterial` + atmosphere sphere, iterate the shader quality after core functionality works.

**The distance strip is the product differentiator.** Build it well in Task 7 Step 8. It's the one thing nobody else has. Smooth CSS transitions, clear reference markers, the "YOU ARE HERE" moment.

**Canvas singleton strategy:** Keep `<Canvas>` at `position: fixed; inset: 0;` always. For LIVE/CONTROL views where the scene appears in a panel, layer HTML panels on top of the canvas and use CSS to create the windowed appearance. This avoids the complexity of portals or viewport manipulation.

**Commit after each task.** The spec says this explicitly (Section 14). Ship incrementally.
