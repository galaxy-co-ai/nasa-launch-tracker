import * as THREE from "three";

/**
 * Generate 600-point free-return trajectory path.
 * Earth at origin, Moon at (350, 0, 0).
 * Outbound: cubic bezier curving up/out toward Moon
 * Return: cubic bezier curving down/back toward Earth
 */
export function generateTrajectoryPoints(count = 600): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const half = Math.floor(count / 2);

  // Outbound leg: Earth surface → behind Moon
  const outStart = new THREE.Vector3(22, 0, 0); // Just above Earth surface
  const outCP1 = new THREE.Vector3(100, 80, -60);
  const outCP2 = new THREE.Vector3(280, 50, -30);
  const outEnd = new THREE.Vector3(355, 10, 0); // Behind Moon

  const outCurve = new THREE.CubicBezierCurve3(outStart, outCP1, outCP2, outEnd);
  for (let i = 0; i < half; i++) {
    points.push(outCurve.getPointAt(i / (half - 1)));
  }

  // Return leg: behind Moon → back toward Earth
  const retStart = new THREE.Vector3(355, -10, 0);
  const retCP1 = new THREE.Vector3(280, -60, 40);
  const retCP2 = new THREE.Vector3(100, -80, 50);
  const retEnd = new THREE.Vector3(22, -5, 0); // Back near Earth

  const retCurve = new THREE.CubicBezierCurve3(retStart, retCP1, retCP2, retEnd);
  for (let i = 0; i < count - half; i++) {
    points.push(retCurve.getPointAt(i / (count - half - 1)));
  }

  return points;
}

/**
 * Get the position and tangent for a given progress (0→1) along the trajectory.
 */
export function getTrajectoryState(
  points: THREE.Vector3[],
  progress: number,
): { position: THREE.Vector3; tangent: THREE.Vector3 } {
  const idx = Math.min(
    Math.floor(progress * (points.length - 1)),
    points.length - 2,
  );
  const nextIdx = idx + 1;

  const position = points[idx].clone();
  const tangent = new THREE.Vector3()
    .subVectors(points[nextIdx], points[idx])
    .normalize();

  return { position, tangent };
}
