import * as THREE from "three";

/**
 * Generate 600-point Artemis II free-return trajectory.
 *
 * Accurate to NASA's described figure-eight path:
 * - Outbound: sweeps out from Earth, curving toward Moon (4 days)
 * - Lunar flyby: hooks around the far side, closest approach ~8000km
 * - Return: curves back on the OPPOSITE side of Earth-Moon line (5 days)
 * - The two legs create a figure-eight cross-over pattern
 *
 * Coordinate system: Earth at origin, Moon at (350, 0, 0) in scene units.
 * Scale: ~1100 km per scene unit.
 */
export function generateTrajectoryPoints(count = 600): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  // Split: 40% outbound, 10% flyby, 50% return (asymmetric, per NASA)
  const outCount = Math.floor(count * 0.4); // 240 points
  const flybyCount = Math.floor(count * 0.1); // 60 points
  const returnCount = count - outCount - flybyCount; // 300 points

  // ─── Outbound leg: Earth → approach Moon ───────────────
  // Curves outward from Earth, sweeping above the Earth-Moon centerline
  const outCurve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(22, 0, 0), // Depart from Earth orbit
    new THREE.Vector3(80, 55, 15), // Curve above centerline
    new THREE.Vector3(240, 40, 10), // Sweeping arc toward Moon
    new THREE.Vector3(340, 12, 5), // Approaching Moon from above
  );

  for (let i = 0; i < outCount; i++) {
    points.push(outCurve.getPointAt(i / (outCount - 1)));
  }

  // ─── Lunar flyby: hook around far side of Moon ─────────
  // Tight curve behind the Moon, closest approach ~8000km from surface
  // Moon center is at (350, 0, 0), radius = 5.4 scene units
  // Closest approach = 5.4 + ~7.3 = ~12.7 from Moon center
  const flybyCurve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(340, 12, 5), // Matches outbound end
    new THREE.Vector3(358, 8, -8), // Curve behind the Moon
    new THREE.Vector3(365, -10, -12), // Far side passage
    new THREE.Vector3(355, -18, -5), // Emerging from behind Moon
  );

  for (let i = 0; i < flybyCount; i++) {
    points.push(flybyCurve.getPointAt(i / (flybyCount - 1)));
  }

  // ─── Return leg: curves back on OPPOSITE side ──────────
  // The key figure-eight property: return path is on the opposite
  // side of the Earth-Moon line from the outbound path.
  // Also offset because Moon moved ~13° in its orbit during 10 days.
  const returnCurve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(355, -18, -5), // Matches flyby end
    new THREE.Vector3(260, -55, -18), // Sweeping below centerline
    new THREE.Vector3(100, -50, -12), // Broad return arc
    new THREE.Vector3(21, -3, -2), // Back near Earth (different angle)
  );

  for (let i = 0; i < returnCount; i++) {
    points.push(returnCurve.getPointAt(i / (returnCount - 1)));
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
