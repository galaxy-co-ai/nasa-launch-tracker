"use client";

import { useRef, useMemo } from "react";
import { useFrame, extend } from "@react-three/fiber";
import { useTexture, shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

// ─── Atmosphere Shader Material ──────────────────────────

const AtmosphereMaterialImpl = shaderMaterial(
  {
    atmOpacity: 0.7,
    atmPowFactor: 4.1,
    atmMultiplier: 9.0,
  },
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = normalize(vec3(modelViewMatrix * vec4(position, 1.0)));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform float atmOpacity;
    uniform float atmPowFactor;
    uniform float atmMultiplier;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float intensity = pow(dot(vNormal, vPosition), atmPowFactor) * atmMultiplier;
      vec3 atmColor = vec3(
        0.35 + dot(vNormal, vPosition) / 4.5,
        0.35 + dot(vNormal, vPosition) / 4.5,
        1.0
      );
      gl_FragColor = vec4(atmColor, atmOpacity) * intensity;
    }
  `,
);

extend({ AtmosphereMaterialImpl });

// ─── Earth Surface Shader ────────────────────────────────

const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthFragmentShader = /* glsl */ `
  uniform sampler2D u_dayTexture;
  uniform sampler2D u_nightTexture;
  uniform sampler2D u_cloudTexture;
  uniform vec3 u_sunDirection;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 sunDir = normalize(u_sunDirection);

    vec3 dayColor = texture2D(u_dayTexture, vUv).rgb;
    vec3 nightColor = texture2D(u_nightTexture, vUv).rgb;

    // Smooth day/night terminator
    float cosAngle = dot(vNormal, sunDir);
    float dayFactor = 1.0 / (1.0 + exp(-12.0 * cosAngle));

    vec3 color = mix(nightColor * 1.5, dayColor, dayFactor);

    // Cloud layer (lit on day side)
    vec3 clouds = texture2D(u_cloudTexture, vUv).rgb;
    float cloudBrightness = clamp(cosAngle * 0.8 + 0.2, 0.05, 1.0);
    color = mix(color, clouds * cloudBrightness, clouds.r * 0.6);

    // Fresnel rim glow on lit side
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, 3.0);
    color += vec3(0.3, 0.5, 1.0) * fresnel * dayFactor * 0.4;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Earth Component ─────────────────────────────────────

export default function Earth() {
  const earthRef = useRef<THREE.Mesh>(null!);
  const cloudRef = useRef<THREE.Mesh>(null!);

  const [dayMap, nightMap, cloudMap] = useTexture([
    "/textures/earth/2k_earth_daymap.jpg",
    "/textures/earth/2k_earth_nightmap.jpg",
    "/textures/earth/2k_earth_clouds.jpg",
  ]);

  // Ensure correct color space
  dayMap.colorSpace = THREE.SRGBColorSpace;
  nightMap.colorSpace = THREE.SRGBColorSpace;

  const sunDirection = useMemo(() => new THREE.Vector3(5, 3, 5).normalize(), []);

  const uniforms = useMemo(
    () => ({
      u_dayTexture: { value: dayMap },
      u_nightTexture: { value: nightMap },
      u_cloudTexture: { value: cloudMap },
      u_sunDirection: { value: sunDirection },
    }),
    [dayMap, nightMap, cloudMap, sunDirection],
  );

  useFrame((_, delta) => {
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.02;
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.025;
  });

  return (
    <group>
      {/* Earth surface */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[20, 64, 64]} />
        <shaderMaterial
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={uniforms}
        />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudRef} scale={[1.005, 1.005, 1.005]}>
        <sphereGeometry args={[20, 64, 64]} />
        <meshBasicMaterial
          map={cloudMap}
          transparent
          opacity={0.25}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>

      {/* Atmosphere outer glow */}
      <mesh scale={[1.12, 1.12, 1.12]}>
        <sphereGeometry args={[20, 64, 64]} />
        {/* @ts-expect-error — extended material */}
        <atmosphereMaterialImpl
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
