"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import type { CameraMode } from "@/types/mission";
import * as THREE from "three";

interface CameraControllerProps {
  mode: CameraMode;
  orionPosition?: THREE.Vector3;
  interactive?: boolean;
  autoOrbit?: boolean;
}

const MODES: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
  earth: { pos: [0, 30, 60], target: [0, 0, 0] },
  moon: { pos: [340, 15, 30], target: [350, 0, 0] },
  overview: { pos: [100, 150, 200], target: [175, 0, 0] },
};

export default function CameraController({
  mode,
  orionPosition,
  interactive = true,
  autoOrbit = false,
}: CameraControllerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const prevMode = useRef(mode);
  const autoOrbitAngle = useRef(0);

  // ONLY transition when mode actually CHANGES — never on every frame
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    controls.smoothTime = 2.0;

    if (mode === "follow" && orionPosition) {
      controls.setLookAt(
        orionPosition.x - 10, orionPosition.y + 8, orionPosition.z - 10,
        orionPosition.x, orionPosition.y, orionPosition.z,
        true,
      );
    } else if (MODES[mode]) {
      const { pos, target } = MODES[mode];
      controls.setLookAt(pos[0], pos[1], pos[2], target[0], target[1], target[2], true);
    }

    prevMode.current = mode;
  }, [mode]); // Only fire on mode change, NOT on position change

  // Auto-orbit only when explicitly requested (ZEN mode, mini scenes)
  useFrame((_, delta) => {
    if (!controlsRef.current || !autoOrbit) return;
    autoOrbitAngle.current += delta * 0.1;
    controlsRef.current.azimuthAngle = autoOrbitAngle.current;
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      enabled={interactive}
      minDistance={5}
      maxDistance={800}
    />
  );
}
