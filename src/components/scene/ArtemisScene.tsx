"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { CameraMode } from "@/types/mission";
import { generateTrajectoryPoints, getTrajectoryState } from "@/lib/trajectory";
import Starfield from "./Starfield";
import Earth from "./Earth";
import Moon from "./Moon";
import Orion from "./Orion";
import Trajectory from "./Trajectory";
import CameraController from "./CameraController";

interface ArtemisSceneProps {
  trajectoryProgress: number; // 0 → 1
  cameraMode: CameraMode;
  interactive?: boolean;
  autoOrbit?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

function Scene({
  trajectoryProgress,
  cameraMode,
  interactive = true,
  autoOrbit = false,
}: ArtemisSceneProps) {
  const trajectoryPoints = useMemo(() => generateTrajectoryPoints(600), []);

  const { position, tangent } = useMemo(
    () => getTrajectoryState(trajectoryPoints, Math.max(0.001, trajectoryProgress)),
    [trajectoryPoints, trajectoryProgress],
  );

  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 10000, position: [100, 80, 200] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#000000"]} />

      {/* Lighting */}
      <directionalLight position={[500, 200, -300]} intensity={2.0} color="#fff5e6" />
      <ambientLight intensity={0.03} color="#1a1a3a" />

      <Suspense fallback={null}>
        <Starfield />
        <Earth />
        <Moon />
        <Orion position={position} tangent={tangent} />
        <Trajectory points={trajectoryPoints} progress={trajectoryProgress} />
      </Suspense>

      <CameraController
        mode={cameraMode}
        orionPosition={position}
        interactive={interactive}
        autoOrbit={autoOrbit}
      />
    </Canvas>
  );
}

// Dynamic import with SSR disabled — Three.js requires browser globals
const ArtemisScene = dynamic(() => Promise.resolve(Scene), { ssr: false });

export default ArtemisScene;
export type { ArtemisSceneProps };
