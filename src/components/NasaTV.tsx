"use client";

import { useState } from "react";

// UPDATE THIS with the live stream video ID from youtube.com/@NASA
const YOUTUBE_VIDEO_ID: string = "Tf_UjBMIzNo";

export default function NasaTV() {
  const [isPlaying, setIsPlaying] = useState(true); // autoplay on load
  const hasValidId = YOUTUBE_VIDEO_ID !== "FILL_LIVE_ID";

  return (
    <div className="section-card overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="status-dot"
            style={{
              background: isPlaying ? "var(--error)" : "var(--text-muted)",
              boxShadow: isPlaying ? "0 0 8px var(--error)" : "none",
              animation: isPlaying
                ? "pulse-glow-critical 2s ease-in-out infinite"
                : "none",
            }}
          />
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            NASA TV — Live Mission Coverage
          </span>
        </div>
        {!isPlaying && hasValidId && (
          <button
            onClick={() => setIsPlaying(true)}
            className="text-xs px-3 py-1 rounded-full transition-all cursor-pointer"
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

      {isPlaying && hasValidId ? (
        <div
          className="relative rounded-lg overflow-hidden"
          style={{ aspectRatio: "16/9", background: "var(--bg-base)" }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&rel=0&modestbranding=1&color=white`}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="NASA TV — Artemis II Live"
          />
        </div>
      ) : (
        <div
          className="rounded-lg flex items-center justify-center cursor-pointer transition-all"
          style={{
            background: "var(--bg-elevated)",
            aspectRatio: "16/9",
            border: "1px solid var(--glass-border)",
          }}
          onClick={() => hasValidId && setIsPlaying(true)}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "var(--error-subtle)",
                border: "2px solid var(--error)",
              }}
            >
              <span
                className="text-lg ml-1"
                style={{ color: "var(--error)" }}
              >
                ▶
              </span>
            </div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {hasValidId
                ? "Click to watch Artemis II launch live"
                : "Live stream loading — check nasa.gov/live"}
            </p>
            <a
              href="https://www.youtube.com/@NASA/live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px]"
              style={{ color: "var(--accent)" }}
              onClick={(e) => e.stopPropagation()}
            >
              Open on YouTube ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
