import * as THREE from "three";

/**
 * Generate Artemis II trajectory — accurate to NASA's published flight plan.
 *
 * SCENE SCALE: Earth at origin, Moon at (350, 0, 0).
 * ~1100 km per scene unit. Earth radius = 20, Moon radius = 5.4.
 *
 * ACTUAL MISSION SEQUENCE (per NASA press kit + SVS):
 * 1. HEO: Highly elliptical orbit (185 x 70,376 km) — 1.5 revolutions
 * 2. TLI: Trans-Lunar Injection burn from HEO perigee
 * 3. Outbound coast: ~4 days, gentle arc to Moon
 * 4. Lunar flyby: Wide pass behind far side, ~6,513 km closest approach
 * 5. Return coast: ~4 days, different angle than outbound
 * 6. Reentry: Pacific Ocean splashdown
 *
 * KEY DISTANCES:
 * - HEO apogee: 70,376 km → ~64 scene units from Earth center
 * - Moon: 384,400 km → 350 scene units
 * - Closest lunar approach: 6,513 km above surface → ~6 scene units from Moon center
 * - Max distance from Earth: 405,500 km → ~369 scene units
 */
export function generateTrajectoryPoints(count = 600): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  // Allocate points per phase
  const heoPoints = Math.floor(count * 0.12); // 72 — HEO orbit (visual interest near Earth)
  const tliPoints = Math.floor(count * 0.03); // 18 — TLI departure
  const outPoints = Math.floor(count * 0.30); // 180 — outbound coast
  const flybyPoints = Math.floor(count * 0.12); // 72 — lunar flyby
  const returnPoints = Math.floor(count * 0.38); // 228 — return coast
  const entryPoints = count - heoPoints - tliPoints - outPoints - flybyPoints - returnPoints;

  // ─── Phase 1: HEO — 1.5 elliptical orbits ─────────────
  // 185 km perigee = ~20.2 scene units from center (just above Earth surface)
  // 70,376 km apogee = ~64 scene units from center
  const heoPerigee = 20.5; // scene units (just above Earth surface of r=20)
  const heoApogee = 64; // scene units
  const heoA = (heoPerigee + heoApogee) / 2; // semi-major axis
  const heoC = (heoApogee - heoPerigee) / 2; // center offset
  const heoE = heoC / heoA; // eccentricity

  for (let i = 0; i < heoPoints; i++) {
    // 1.5 orbits = 3π radians
    const angle = (i / heoPoints) * Math.PI * 3;
    const r = (heoA * (1 - heoE * heoE)) / (1 + heoE * Math.cos(angle));
    // Slight inclination for visual interest
    points.push(
      new THREE.Vector3(
        r * Math.cos(angle) + heoC,
        r * Math.sin(angle) * 0.15, // slight Z tilt
        r * Math.sin(angle) * 0.98,
      ),
    );
  }

  // ─── Phase 2: TLI departure — smooth transition from HEO ──
  const lastHEO = points[points.length - 1];
  const tliCurve = new THREE.CubicBezierCurve3(
    lastHEO.clone(),
    new THREE.Vector3(lastHEO.x + 15, lastHEO.y + 3, lastHEO.z - 5),
    new THREE.Vector3(50, 8, -10),
    new THREE.Vector3(75, 12, -8),
  );
  for (let i = 1; i <= tliPoints; i++) {
    points.push(tliCurve.getPointAt(i / tliPoints));
  }

  // ─── Phase 3: Outbound coast — gentle arc to Moon ──────
  // 4-day coast from near Earth out to lunar vicinity
  // Path curves gently, influenced by Earth's gravity
  // Approaches Moon from slightly above the Earth-Moon centerline
  const outCurve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(75, 12, -8), // Matches TLI end
    new THREE.Vector3(150, 25, -5), // Gently curving outward
    new THREE.Vector3(270, 18, 3), // Approaching Moon region
    new THREE.Vector3(335, 8, 6), // Near Moon, slightly above centerline
  );
  for (let i = 1; i <= outPoints; i++) {
    points.push(outCurve.getPointAt(i / outPoints));
  }

  // ─── Phase 4: Lunar flyby — wide, gentle pass behind far side ──
  // Closest approach: ~6,513 km from surface = ~6 scene units from Moon center
  // Moon center at (350, 0, 0), radius 5.4
  // Spacecraft passes behind (x > 350), deflection ~130°
  // This is a WIDE turn — not a tight hairpin
  const flybyRadius = 12; // ~6 scene units from surface (5.4 + 6 ≈ 11.4)
  const flybyCenter = new THREE.Vector3(350, 0, 0); // Moon center

  // Arc from approach to departure — sweeping behind the Moon
  for (let i = 0; i < flybyPoints; i++) {
    const t = i / (flybyPoints - 1);
    // Start angle: approaching from Earth side (angle ~150°)
    // End angle: departing back toward Earth (angle ~-150°)
    // Sweep through the far side (angle ~0° = directly behind Moon from Earth)
    const startAngle = (150 * Math.PI) / 180;
    const endAngle = (-130 * Math.PI) / 180;
    const angle = startAngle + t * (endAngle - startAngle);

    // Radius varies slightly — closest at the middle of the flyby
    const radiusVar = flybyRadius + Math.sin(t * Math.PI) * -2; // Closest in middle
    const yVar = 8 * (1 - 2 * t); // Transition from above to below centerline

    points.push(
      new THREE.Vector3(
        flybyCenter.x + radiusVar * Math.cos(angle),
        yVar,
        flybyCenter.z + radiusVar * Math.sin(angle) * 0.8 + 6 * Math.sin(t * Math.PI),
      ),
    );
  }

  // ─── Phase 5: Return coast — different angle than outbound ──
  // The Moon moved ~13° during 10-day mission, so return path
  // is on a different bearing. Sweeps below the Earth-Moon centerline.
  const returnStart = points[points.length - 1];
  const returnCurve = new THREE.CubicBezierCurve3(
    returnStart.clone(),
    new THREE.Vector3(275, -22, 12), // Below centerline (opposite of outbound)
    new THREE.Vector3(130, -30, 8), // Wide return arc
    new THREE.Vector3(25, -5, 2), // Approaching Earth from below
  );
  for (let i = 1; i <= returnPoints; i++) {
    points.push(returnCurve.getPointAt(i / returnPoints));
  }

  // ─── Phase 6: Entry — final approach to Earth ──────────
  const entryStart = points[points.length - 1];
  const entryCurve = new THREE.CubicBezierCurve3(
    entryStart.clone(),
    new THREE.Vector3(23, -3, 1),
    new THREE.Vector3(21, -1, 0),
    new THREE.Vector3(20.2, 0, 0), // Reentry at Earth surface
  );
  for (let i = 1; i <= entryPoints; i++) {
    points.push(entryCurve.getPointAt(i / entryPoints));
  }

  return points;
}

/**
 * Get position and tangent for a given progress (0→1) along the trajectory.
 */
export function getTrajectoryState(
  points: THREE.Vector3[],
  progress: number,
): { position: THREE.Vector3; tangent: THREE.Vector3 } {
  const clampedProgress = Math.max(0, Math.min(0.999, progress));
  const idx = Math.min(
    Math.floor(clampedProgress * (points.length - 1)),
    points.length - 2,
  );
  const nextIdx = idx + 1;

  const position = points[idx].clone();
  const tangent = new THREE.Vector3()
    .subVectors(points[nextIdx], points[idx])
    .normalize();

  return { position, tangent };
}
