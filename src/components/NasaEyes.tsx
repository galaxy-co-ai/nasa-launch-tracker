"use client";

import { useState } from "react";

const EYES_URL =
  "https://eyes.nasa.gov/apps/solar-system/#/sc_orion?embed=true&cid=sc_orion&rate=1";

export default function NasaEyes() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="section-card overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          NASA Eyes — 3D Solar System
        </span>
        <a
          href="https://eyes.nasa.gov/apps/solar-system/#/sc_orion"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px]"
          style={{ color: "var(--accent)" }}
        >
          Open Full ↗
        </a>
      </div>

      <div
        className="relative rounded-lg overflow-hidden"
        style={{ aspectRatio: "16/9", background: "var(--bg-base)" }}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-shimmer w-full h-full" />
          </div>
        )}
        <iframe
          src={EYES_URL}
          className="w-full h-full border-0"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.3s" }}
          onLoad={() => setLoaded(true)}
          allow="fullscreen"
          title="NASA Eyes on the Solar System — Orion Spacecraft"
        />
      </div>

      <p
        className="text-[9px] text-center mt-2 data-value"
        style={{ color: "var(--text-muted)" }}
      >
        Interactive 3D view powered by NASA/JPL — uses real trajectory data
      </p>
    </div>
  );
}
