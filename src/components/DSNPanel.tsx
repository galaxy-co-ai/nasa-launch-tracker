"use client";

import { useState, useEffect } from "react";

interface DsnTarget {
  name: string;
  id: number;
  uplegRange: number;
  downlegRange: number;
  rtlt: number;
}

interface DsnSignal {
  signalType: string;
  dataRate: number;
  frequency: number;
  band: string;
  power: number;
  spacecraft: string;
}

interface DsnDish {
  name: string;
  azimuthAngle: number;
  elevationAngle: number;
  windSpeed: number;
  targets: DsnTarget[];
  upSignal: DsnSignal[];
  downSignal: DsnSignal[];
}

interface DsnStation {
  name: string;
  friendlyName: string;
  dishes: DsnDish[];
}

interface DsnData {
  stations: DsnStation[];
  timestamp: string;
}

const STATION_LABELS: Record<string, string> = {
  gdscc: "Goldstone, CA",
  mdscc: "Madrid, Spain",
  cdscc: "Canberra, AU",
};

function formatRange(km: number): string {
  if (km <= 0) return "—";
  if (km > 1_000_000) return `${(km / 1_000_000).toFixed(1)}M km`;
  if (km > 1_000) return `${(km / 1_000).toFixed(0)}K km`;
  return `${km.toFixed(0)} km`;
}

function formatLightTime(seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${(seconds / 60).toFixed(1)}m`;
}

function DishCard({ dish }: { dish: DsnDish }) {
  const isActive =
    dish.targets.length > 0 &&
    dish.targets.some((t) => t.name && t.name !== "NONE");
  const isArtemis = dish.targets.some(
    (t) =>
      t.name?.toLowerCase().includes("em2") ||
      t.name?.toLowerCase().includes("orion") ||
      t.name?.toLowerCase().includes("artemis"),
  );

  const borderColor = isArtemis
    ? "var(--accent)"
    : isActive
      ? "var(--color-nominal)"
      : "var(--glass-border)";

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg"
      style={{
        background: "var(--bg-elevated)",
        border: `1px solid ${borderColor}`,
        boxShadow: isArtemis ? "var(--accent-glow-sm)" : "none",
      }}
    >
      {/* Dish header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="status-dot"
            style={{
              background: isArtemis
                ? "var(--accent)"
                : isActive
                  ? "var(--color-nominal)"
                  : "var(--color-standby)",
              boxShadow: isActive
                ? `0 0 8px ${isArtemis ? "var(--accent)" : "var(--color-nominal)"}`
                : "none",
            }}
          />
          <span
            className="data-value text-xs font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {dish.name}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          {dish.elevationAngle.toFixed(1)}° el
        </span>
      </div>

      {/* Targets */}
      {dish.targets
        .filter((t) => t.name && t.name !== "NONE")
        .map((target, i) => (
          <div key={i} className="flex flex-col gap-1">
            <span
              className="text-xs font-semibold"
              style={{
                color: isArtemis ? "var(--accent)" : "var(--text-primary)",
              }}
            >
              {target.name}
            </span>
            <div className="flex gap-3">
              <div className="flex flex-col">
                <span
                  className="text-[9px] uppercase"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Range
                </span>
                <span
                  className="data-value text-[11px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {formatRange(target.downlegRange)}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  className="text-[9px] uppercase"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  RTLT
                </span>
                <span
                  className="data-value text-[11px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {formatLightTime(target.rtlt)}
                </span>
              </div>
            </div>
          </div>
        ))}

      {/* Signal info */}
      {dish.downSignal.filter((s) => s.dataRate > 0).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {dish.downSignal
            .filter((s) => s.dataRate > 0)
            .map((sig, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded data-value"
                style={{
                  background: "var(--accent-subtle)",
                  color: "var(--accent)",
                }}
              >
                {sig.band}-band {sig.dataRate > 1000 ? `${(sig.dataRate / 1000).toFixed(1)}kb/s` : `${sig.dataRate.toFixed(0)}b/s`}
              </span>
            ))}
        </div>
      )}

      {/* Inactive state */}
      {!isActive && (
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          Idle
        </span>
      )}
    </div>
  );
}

export default function DSNPanel() {
  const [data, setData] = useState<DsnData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchDSN() {
      try {
        const res = await fetch("/api/dsn");
        if (res.ok && mounted) {
          setData(await res.json());
          setError(false);
        }
      } catch {
        if (mounted) setError(true);
      }
    }

    fetchDSN();
    const interval = setInterval(fetchDSN, 5000); // 5-second polling
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="section-card">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          DSN feed unavailable — retrying...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="section-card">
        <div className="animate-shimmer h-32 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.stations.map((station) => (
        <div key={station.name} className="section-card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {STATION_LABELS[station.name] || station.friendlyName}
              </span>
              <span
                className="text-[10px] data-value"
                style={{ color: "var(--text-tertiary)" }}
              >
                {station.name.toUpperCase()}
              </span>
            </div>
            <span
              className="text-[9px] data-value"
              style={{ color: "var(--text-muted)" }}
            >
              {station.dishes.length} dishes
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {station.dishes.map((dish) => (
              <DishCard key={dish.name} dish={dish} />
            ))}
          </div>
        </div>
      ))}

      <p
        className="text-[9px] text-center data-value"
        style={{ color: "var(--text-muted)" }}
      >
        Live from NASA Deep Space Network — updates every 5s
      </p>
    </div>
  );
}
