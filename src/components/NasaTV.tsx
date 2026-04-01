"use client";

import { useRef, useEffect, useState } from "react";

const NASA_HLS_URL =
  "https://nasa-i.akamaihd.net/hls/live/253565/NASA-NTV1-Public/master.m3u8";

export default function NasaTV() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Only load HLS.js when user clicks play (saves bandwidth)
    if (!isPlaying) return;

    let hls: import("hls.js").default | null = null;

    async function initHls() {
      const Hls = (await import("hls.js")).default;

      if (Hls.isSupported() && video) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(NASA_HLS_URL);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setHasError(true));
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setHasError(true);
        });
      } else if (video?.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = NASA_HLS_URL;
        video.play().catch(() => setHasError(true));
      } else {
        setHasError(true);
      }
    }

    initHls();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [isPlaying]);

  return (
    <div className="section-card overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="status-dot"
            style={{
              background: isPlaying ? "var(--error)" : "var(--text-muted)",
              boxShadow: isPlaying ? "0 0 8px var(--error)" : "none",
              animation: isPlaying ? "pulse-glow-critical 2s ease-in-out infinite" : "none",
            }}
          />
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            NASA TV — Live
          </span>
        </div>
        {!isPlaying && (
          <button
            onClick={() => setIsPlaying(true)}
            className="text-xs px-3 py-1 rounded-full transition-all"
            style={{
              background: "var(--accent-subtle)",
              color: "var(--accent)",
              border: "1px solid var(--accent-border)",
            }}
          >
            ▶ Watch Live
          </button>
        )}
      </div>

      {hasError && (
        <div
          className="rounded-lg p-4 text-center"
          style={{ background: "var(--bg-elevated)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            NASA TV stream unavailable — try{" "}
            <a
              href="https://www.nasa.gov/live/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
            >
              nasa.gov/live
            </a>
          </p>
        </div>
      )}

      {!isPlaying && !hasError && (
        <div
          className="rounded-lg flex items-center justify-center"
          style={{
            background: "var(--bg-elevated)",
            aspectRatio: "16/9",
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">🛰️</span>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Click to stream NASA TV mission coverage
            </p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full rounded-lg"
        style={{
          display: isPlaying && !hasError ? "block" : "none",
          aspectRatio: "16/9",
          background: "var(--bg-base)",
        }}
        controls
        muted
        playsInline
      />
    </div>
  );
}
