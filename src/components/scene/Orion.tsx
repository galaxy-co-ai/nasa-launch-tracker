"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const TRAIL_COUNT = 80;

const trailVertexShader = /* glsl */ `
  attribute float opacity;
  varying float vOpacity;
  void main() {
    vOpacity = opacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 4.0 * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const trailFragmentShader = /* glsl */ `
  varying float vOpacity;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, d) * vOpacity;
    gl_FragColor = vec4(0.96, 0.62, 0.04, alpha);
  }
`;

interface OrionProps {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
}

/**
 * Orion MPCV + European Service Module — accurate to NASA/ESA specs.
 *
 * CM: Silver reflective 57.5° frustum, dark brown heat shield
 * ESM: White MLI cylinder (slightly narrower than CM)
 * Solar: 4 X-wings, each with 3 dark blue hinged panels
 * Engine: AJ10 bell at bottom
 */
export default function Orion({ position, tangent }: OrionProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const trailRef = useRef<THREE.Points>(null!);
  const trailPositions = useRef(new Float32Array(TRAIL_COUNT * 3));
  const trailOpacities = useRef(new Float32Array(TRAIL_COUNT).fill(0));
  const headIndex = useRef(0);
  const frameCount = useRef(0);

  const tempVec = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!groupRef.current) return;

    groupRef.current.position.copy(position);
    tempVec.copy(position).add(tangent);
    groupRef.current.lookAt(tempVec);

    // Trail ring buffer (every 2nd frame)
    frameCount.current++;
    if (frameCount.current % 2 !== 0 || !trailRef.current) return;

    const i = headIndex.current;
    const i3 = i * 3;
    trailPositions.current[i3] = position.x + (Math.random() - 0.5) * 0.2;
    trailPositions.current[i3 + 1] = position.y + (Math.random() - 0.5) * 0.2;
    trailPositions.current[i3 + 2] = position.z + (Math.random() - 0.5) * 0.2;
    trailOpacities.current[i] = 1.0;

    for (let j = 0; j < TRAIL_COUNT; j++) {
      trailOpacities.current[j] *= 0.96;
    }
    headIndex.current = (i + 1) % TRAIL_COUNT;

    const geo = trailRef.current.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.opacity.needsUpdate = true;
  });

  // Pre-create materials to avoid re-renders
  const cmMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#c8c8d0", metalness: 0.7, roughness: 0.25 }),
    [],
  );
  const heatShieldMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2a1a0e", metalness: 0.1, roughness: 0.95 }),
    [],
  );
  const esmMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e8e8ec", metalness: 0.15, roughness: 0.6 }),
    [],
  );
  const adapterMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#999", metalness: 0.4, roughness: 0.5 }),
    [],
  );
  const solarFaceMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0a0a2a", metalness: 0.2, roughness: 0.7 }),
    [],
  );
  const engineMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#303030", metalness: 0.85, roughness: 0.15 }),
    [],
  );

  return (
    <>
      <group ref={groupRef} scale={0.5}>
        {/* ── Crew Module (CM) — silver reflective frustum ── */}
        {/* 57.5° half-angle cone: top ~1.0 radius, base ~2.0 radius, height 1.3 */}
        <mesh position={[0, 0, 1.5]} rotation={[Math.PI / 2, 0, 0]} material={cmMaterial}>
          <cylinderGeometry args={[0.5, 1.0, 1.3, 24]} />
        </mesh>

        {/* Forward bay cover (nose cap) */}
        <mesh position={[0, 0, 2.2]} rotation={[Math.PI / 2, 0, 0]} material={cmMaterial}>
          <cylinderGeometry args={[0.15, 0.5, 0.15, 16]} />
        </mesh>

        {/* Heat shield (dark bottom of CM) */}
        <mesh position={[0, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]} material={heatShieldMaterial}>
          <cylinderGeometry args={[1.0, 1.0, 0.06, 24]} />
        </mesh>

        {/* ── CM-to-ESM Adapter Ring ── */}
        <mesh position={[0, 0, 0.65]} rotation={[Math.PI / 2, 0, 0]} material={adapterMaterial}>
          <cylinderGeometry args={[1.0, 0.82, 0.3, 24]} />
        </mesh>

        {/* ── European Service Module (ESM) — WHITE cylinder ── */}
        <mesh position={[0, 0, -0.5]} rotation={[Math.PI / 2, 0, 0]} material={esmMaterial}>
          <cylinderGeometry args={[0.82, 0.82, 2.0, 24]} />
        </mesh>

        {/* ── AJ10 Engine Bell ── */}
        <mesh position={[0, 0, -1.75]} rotation={[-Math.PI / 2, 0, 0]} material={engineMaterial}>
          <coneGeometry args={[0.3, 0.5, 16]} />
        </mesh>

        {/* ── 4 X-Wing Solar Array Wings ── */}
        {/* Each wing: 3 segmented rectangular panels, ~3 units long total */}
        {/* Arranged at 0°, 90°, 180°, 270° around the ESM */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, wingIdx) => (
          <group key={wingIdx} rotation={[0, 0, angle]} position={[0, 0, -0.4]}>
            {/* Root strut */}
            <mesh position={[1.0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
              <meshStandardMaterial color="#888" />
            </mesh>

            {/* Panel 1 (inner) */}
            <mesh position={[1.5, 0, 0]} material={solarFaceMaterial}>
              <boxGeometry args={[0.85, 0.02, 0.75]} />
            </mesh>

            {/* Panel 2 (middle) */}
            <mesh position={[2.45, 0, 0]} material={solarFaceMaterial}>
              <boxGeometry args={[0.85, 0.02, 0.75]} />
            </mesh>

            {/* Panel 3 (outer) */}
            <mesh position={[3.4, 0, 0]} material={solarFaceMaterial}>
              <boxGeometry args={[0.85, 0.02, 0.75]} />
            </mesh>
          </group>
        ))}

        {/* Amber visibility light */}
        <pointLight color="#ff8800" intensity={3} distance={30} decay={2} />
      </group>

      {/* ── Particle Trail ── */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPositions.current, 3]} />
          <bufferAttribute attach="attributes-opacity" args={[trailOpacities.current, 1]} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={trailVertexShader}
          fragmentShader={trailFragmentShader}
          uniforms={{}}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}
