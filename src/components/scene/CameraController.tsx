"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import type { CameraMode } from "@/types/mission";
import * as THREE from "three";

interface CameraControllerProps {
  mode: CameraMode;
  orionPosition?: THREE.Vector3;
  interactive?: boolean; // Allow user orbit controls
  autoOrbit?: boolean; // Auto-rotate around target
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

  // Transition on mode change
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current as unknown as {
      smoothTime: number;
      setLookAt: (...args: number[]) => void;
      enabled: boolean;
    };

    controls.smoothTime = 2.0;

    if (mode === "follow" && orionPosition) {
      controls.setLookAt(
        orionPosition.x - 10, orionPosition.y + 8, orionPosition.z - 10,
        orionPosition.x, orionPosition.y, orionPosition.z,
        // @ts-expect-error — enableTransition param
        true,
      );
    } else if (mode !== "follow" && MODES[mode]) {
      const { pos, target } = MODES[mode];
      controls.setLookAt(
        pos[0], pos[1], pos[2],
        target[0], target[1], target[2],
        // @ts-expect-error — enableTransition param
        true,
      );
    }

    prevMode.current = mode;
  }, [mode, orionPosition]);

  // Follow mode continuous tracking + auto-orbit
  useFrame((_, delta) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current as unknown as {
      smoothTime: number;
      setLookAt: (...args: number[]) => void;
      azimuthAngle: number;
    };

    if (mode === "follow" && orionPosition) {
      controls.smoothTime = 0.5;
      controls.setLookAt(
        orionPosition.x - 10, orionPosition.y + 8, orionPosition.z - 10,
        orionPosition.x, orionPosition.y, orionPosition.z,
        // @ts-expect-error — enableTransition param
        true,
      );
    }

    if (autoOrbit) {
      autoOrbitAngle.current += delta * 0.1;
      controls.azimuthAngle = autoOrbitAngle.current;
    }
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      enabled={interactive}
      minDistance={5}
      maxDistance={600}
    />
  );
}
