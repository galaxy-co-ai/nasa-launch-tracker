"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const STAR_COUNT = 8000;

const vertexShader = /* glsl */ `
  uniform float uTime;
  attribute float size;
  attribute float phase;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vColor = color;

    // Dual-frequency twinkle for organic feel
    float twinkle = sin(uTime * 1.5 + phase) * 0.3
                  + sin(uTime * 3.7 + phase * 2.3) * 0.2
                  + 0.5;
    vTwinkle = clamp(twinkle, 0.15, 1.0);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z) * vTwinkle;
    gl_PointSize = max(gl_PointSize, 0.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float strength = 1.0 - smoothstep(0.0, 0.5, d);
    strength = pow(strength, 1.5);

    vec3 finalColor = vColor * (0.7 + vTwinkle * 0.3);
    float alpha = strength * vTwinkle;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Color temperature palette (realistic distribution)
const STAR_COLORS: [number, number, number][] = [
  [1.0, 0.85, 0.7], // warm yellow (K-type)
  [1.0, 0.95, 0.9], // white-yellow (G-type)
  [1.0, 1.0, 1.0], // pure white (A-type)
  [0.8, 0.85, 1.0], // blue-white (B-type)
  [0.7, 0.75, 1.0], // blue (O-type)
  [1.0, 0.6, 0.4], // red (M-type)
];
const WEIGHTS = [0.15, 0.3, 0.25, 0.12, 0.03, 0.15];

export default function Starfield() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const { positions, colors, sizes, phases } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const phases = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      // Uniform sphere distribution (r=3000-5000)
      const r = 3000 + Math.random() * 2000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - Math.random() * 2);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Weighted color temperature
      const rand = Math.random();
      let cumulative = 0;
      let colorIdx = 0;
      for (let j = 0; j < WEIGHTS.length; j++) {
        cumulative += WEIGHTS[j];
        if (rand < cumulative) {
          colorIdx = j;
          break;
        }
      }
      const [cr, cg, cb] = STAR_COLORS[colorIdx];
      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;

      // Size: most small, rare bright ones
      sizes[i] = Math.pow(Math.random(), 3) * 8.0 + 0.5;

      // Twinkle phase offset
      phases[i] = Math.random() * Math.PI * 2;
    }

    return { positions, colors, sizes, phases };
  }, []);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 } }),
    [],
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-phase" args={[phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </points>
  );
}
