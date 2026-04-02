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

export default function Orion({ position, tangent }: OrionProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const trailRef = useRef<THREE.Points>(null!);
  const trailPositions = useRef(new Float32Array(TRAIL_COUNT * 3));
  const trailOpacities = useRef(new Float32Array(TRAIL_COUNT).fill(0));
  const headIndex = useRef(0);
  const frameCount = useRef(0);

  const tempVec = useMemo(() => new THREE.Vector3(), []);

  const trailUniforms = useMemo(() => ({}), []);

  useFrame(() => {
    if (!groupRef.current) return;

    // Position spacecraft
    groupRef.current.position.copy(position);

    // Orient along tangent
    tempVec.copy(position).add(tangent);
    groupRef.current.lookAt(tempVec);

    // Update trail (every 2nd frame for performance)
    frameCount.current++;
    if (frameCount.current % 2 !== 0 || !trailRef.current) return;

    const i = headIndex.current;
    const i3 = i * 3;

    trailPositions.current[i3] = position.x + (Math.random() - 0.5) * 0.3;
    trailPositions.current[i3 + 1] = position.y + (Math.random() - 0.5) * 0.3;
    trailPositions.current[i3 + 2] = position.z + (Math.random() - 0.5) * 0.3;
    trailOpacities.current[i] = 1.0;

    for (let j = 0; j < TRAIL_COUNT; j++) {
      trailOpacities.current[j] *= 0.96;
    }

    headIndex.current = (i + 1) % TRAIL_COUNT;

    const geo = trailRef.current.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.opacity.needsUpdate = true;
  });

  return (
    <>
      {/* Orion MPCV — accurate proportions */}
      <group ref={groupRef} scale={0.4}>
        {/* Crew Module — 57.5° frustum (truncated cone), wider at base */}
        <mesh position={[0, 0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.45, 0.9, 1.2, 20]} />
          <meshStandardMaterial color="#d4d4d4" metalness={0.4} roughness={0.4} />
        </mesh>
        {/* Heat shield (flat bottom of CM) */}
        <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 0.08, 20]} />
          <meshStandardMaterial color="#3a3020" metalness={0.2} roughness={0.9} />
        </mesh>

        {/* Crew Module Adapter ring */}
        <mesh position={[0, 0, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.9, 0.85, 0.3, 20]} />
          <meshStandardMaterial color="#c4a84a" metalness={0.3} roughness={0.5} />
        </mesh>

        {/* European Service Module — cylinder, slightly narrower */}
        <mesh position={[0, 0, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 2.0, 20]} />
          <meshStandardMaterial color="#c4a84a" metalness={0.3} roughness={0.5} />
        </mesh>

        {/* OMS engine nozzle (protruding from bottom) */}
        <mesh position={[0, 0, -1.85]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.25, 0.5, 12]} />
          <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* 4 X-Wing Solar Arrays (Orion's distinctive feature) */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
          <group key={i} rotation={[0, 0, angle]} position={[0, 0, -0.5]}>
            {/* Array arm extends outward */}
            <mesh position={[2.5, 0, 0]}>
              <boxGeometry args={[4.0, 0.03, 0.7]} />
              <meshStandardMaterial color="#0d1b4a" metalness={0.2} roughness={0.8} />
            </mesh>
            {/* Strut connecting to ESM */}
            <mesh position={[0.4, 0, 0]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
              <meshStandardMaterial color="#888" />
            </mesh>
          </group>
        ))}

        {/* Amber point light for visibility */}
        <pointLight color="#ff8800" intensity={3} distance={25} decay={2} />
      </group>

      {/* Particle trail */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[trailPositions.current, 3]}
          />
          <bufferAttribute
            attach="attributes-opacity"
            args={[trailOpacities.current, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={trailVertexShader}
          fragmentShader={trailFragmentShader}
          uniforms={trailUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}
