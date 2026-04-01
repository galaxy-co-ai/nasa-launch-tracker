"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TrajectoryProps {
  points: THREE.Vector3[];
  progress: number; // 0 → 1
}

export default function Trajectory({ points, progress }: TrajectoryProps) {
  const traveledRef = useRef<THREE.Line>(null!);

  // Full path geometry
  const fullGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  const traveledGeometry = useMemo(() => fullGeometry.clone(), [fullGeometry]);

  // Full path line object
  const fullLine = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: "#f59e0b",
      transparent: true,
      opacity: 0.15,
    });
    return new THREE.Line(fullGeometry, mat);
  }, [fullGeometry]);

  // Traveled path line object
  const traveledLine = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: "#f59e0b",
      transparent: true,
      opacity: 0.7,
    });
    const line = new THREE.Line(traveledGeometry, mat);
    return line;
  }, [traveledGeometry]);

  // Update draw range for traveled path
  useFrame(() => {
    if (traveledLine) {
      const count = Math.max(2, Math.floor(progress * points.length));
      traveledLine.geometry.setDrawRange(0, count);
    }
  });

  return (
    <group>
      <primitive ref={traveledRef} object={fullLine} />
      <primitive object={traveledLine} />
    </group>
  );
}
