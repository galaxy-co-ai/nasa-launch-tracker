"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Procedural Moon Texture Generator ───────────────────

function generateMoonTexture(width = 1024, height = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Base grey highlands
  ctx.fillStyle = "#8a8a8a";
  ctx.fillRect(0, 0, width, height);

  // Maria (dark seas)
  const maria = [
    { x: 0.35, y: 0.4, rx: 0.15, ry: 0.12, color: "#4a4a50" },
    { x: 0.55, y: 0.5, rx: 0.1, ry: 0.08, color: "#505055" },
    { x: 0.6, y: 0.6, rx: 0.12, ry: 0.1, color: "#484850" },
    { x: 0.4, y: 0.65, rx: 0.08, ry: 0.06, color: "#4e4e54" },
    { x: 0.7, y: 0.45, rx: 0.06, ry: 0.08, color: "#525258" },
    { x: 0.25, y: 0.55, rx: 0.09, ry: 0.07, color: "#4c4c52" },
  ];

  for (const m of maria) {
    const cx = m.x * width;
    const cy = m.y * height;
    const r = Math.max(m.rx * width, m.ry * height);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, m.color);
    grad.addColorStop(0.6, m.color + "80");
    grad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Craters (multiple layers)
  const layers = [
    { count: 12, minR: 15, maxR: 40 },
    { count: 50, minR: 5, maxR: 18 },
    { count: 200, minR: 2, maxR: 7 },
    { count: 600, minR: 1, maxR: 3 },
  ];

  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const r = layer.minR + Math.random() * (layer.maxR - layer.minR);

      // Dark floor
      const darkness = Math.floor(Math.random() * 30 + 50);
      const floor = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      floor.addColorStop(0, `rgba(${darkness},${darkness},${darkness + 5},0.5)`);
      floor.addColorStop(0.7, `rgba(${darkness},${darkness},${darkness + 5},0.2)`);
      floor.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = floor;
      ctx.fill();

      // Bright rim (directional)
      if (r > 3) {
        const bright = Math.floor(160 + Math.random() * 40);
        const rim = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.8, cx, cy, r * 1.1);
        rim.addColorStop(0, "transparent");
        rim.addColorStop(0.7, `rgba(${bright},${bright},${bright},0.08)`);
        rim.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = rim;
        ctx.fill();
      }
    }
  }

  // Surface noise
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 15;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ─── Moon Component ──────────────────────────────────────

export default function Moon() {
  const moonRef = useRef<THREE.Mesh>(null!);

  const map = useMemo(() => generateMoonTexture(), []);

  // Very slow orbital motion
  useFrame((_, delta) => {
    if (moonRef.current) {
      moonRef.current.rotation.y += delta * 0.005;
    }
  });

  return (
    <mesh ref={moonRef} position={[350, 0, 0]}>
      <sphereGeometry args={[5.4, 48, 48]} />
      <meshStandardMaterial
        map={map}
        roughness={1.0}
        metalness={0.0}
        color="#c8c8c8"
        envMapIntensity={0}
      />
    </mesh>
  );
}
