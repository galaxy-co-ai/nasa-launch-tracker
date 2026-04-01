"use client";

import { useState } from "react";
import type { SimSpeed, CameraMode } from "@/types/mission";
import { useSimulation } from "@/hooks/useSimulation";
import ArtemisScene from "@/components/scene/ArtemisScene";
import { formatMET } from "@/lib/format";

export default function Home() {
  const [simSpeed, setSimSpeed] = useState<SimSpeed>(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>("overview");
  const sim = useSimulation(simSpeed);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#000" }}>
      {/* 3D Scene — full viewport */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <ArtemisScene
          trajectoryProgress={sim.trajectoryProgress}
          cameraMode={cameraMode}
          interactive
        />
      </div>

      {/* Temporary HUD — will be replaced by proper views */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "rgba(10, 10, 20, 0.85)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontFamily: "var(--font-dm-mono), monospace",
          color: "rgba(255,255,255,0.9)",
        }}
      >
        {/* Phase */}
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.15em",
            color: sim.phase.includes("BURN") || sim.phase === "ASCENT"
              ? "#f59e0b"
              : "rgba(255,255,255,0.5)",
          }}
        >
          {sim.phase}
        </span>

        {/* MET Clock */}
        <span style={{ fontSize: 22, fontWeight: 600 }}>
          {formatMET(sim.met)}
        </span>

        {/* Controls */}
        <div style={{ display: "flex", gap: 8 }}>
          {/* Camera modes */}
          {(["follow", "earth", "moon", "overview"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCameraMode(mode)}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                borderRadius: 6,
                border: `1px solid ${cameraMode === mode ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                background: cameraMode === mode ? "rgba(245,158,11,0.15)" : "transparent",
                color: cameraMode === mode ? "#f59e0b" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {mode}
            </button>
          ))}

          {/* Speed */}
          <button
            onClick={() => {
              const speeds: SimSpeed[] = [1, 10, 100, 1000, 10000];
              const idx = speeds.indexOf(simSpeed);
              setSimSpeed(speeds[(idx + 1) % speeds.length]);
            }}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.08)",
              background: simSpeed > 1 ? "rgba(245,158,11,0.15)" : "transparent",
              color: simSpeed > 1 ? "#f59e0b" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
            }}
          >
            ⚡ {simSpeed >= 1000 ? `${simSpeed / 1000}K` : `${simSpeed}x`}
          </button>
        </div>
      </div>

      {/* Temporary left HUD — telemetry */}
      <div
        style={{
          position: "fixed",
          left: 24,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          fontFamily: "var(--font-dm-mono), monospace",
        }}
      >
        {[
          { label: "EARTH DIST", value: sim.distanceFromEarth.toLocaleString(), unit: "km" },
          { label: "VELOCITY", value: sim.velocity.toLocaleString(), unit: "km/h" },
          { label: "MOON DIST", value: sim.distanceToMoon.toLocaleString(), unit: "km" },
          { label: "ACCEL", value: sim.acceleration.toFixed(1), unit: "G" },
        ].map((item) => (
          <div key={item.label}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
              {item.label}
            </div>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
              {item.value}{" "}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{item.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
