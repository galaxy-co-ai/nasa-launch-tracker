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
      {/* Spacecraft compound model */}
      <group ref={groupRef} scale={0.4}>
        {/* Command module (cone) */}
        <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.7, 1.4, 16]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Service module (cylinder) */}
        <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 2.2, 16]} />
          <meshStandardMaterial color="#8a8a8a" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Engine nozzle */}
        <mesh position={[0, 0, -1.7]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.35, 0.5, 12]} />
          <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Solar panels */}
        <mesh position={[-2.8, 0, -0.2]}>
          <boxGeometry args={[3.5, 0.04, 1.0]} />
          <meshStandardMaterial color="#1a237e" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[2.8, 0, -0.2]}>
          <boxGeometry args={[3.5, 0.04, 1.0]} />
          <meshStandardMaterial color="#1a237e" metalness={0.3} roughness={0.7} />
        </mesh>

        {/* Amber point light for visibility */}
        <pointLight color="#ff8800" intensity={3} distance={20} decay={2} />
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
