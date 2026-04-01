"use client";

import { useState, useEffect } from "react";

interface SpaceWeatherEvent {
  type: string;
  id: string;
  time: string;
  message: string;
  severity: "low" | "moderate" | "high";
}

interface WeatherData {
  events: SpaceWeatherEvent[];
  solarActivity: string;
}

const SEVERITY_COLORS = {
  low: "var(--color-nominal)",
  moderate: "var(--color-caution)",
  high: "var(--color-critical)",
};

export default function SpaceWeather() {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchWeather() {
      try {
        const res = await fetch("/api/space-weather");
        if (res.ok && mounted) setData(await res.json());
      } catch {
        // Silently retry
      }
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000); // 5 min
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!data) {
    return (
      <div className="section-card">
        <div className="animate-shimmer h-20 rounded-lg" />
      </div>
    );
  }

  const activityColor =
    data.solarActivity === "ELEVATED"
      ? "var(--color-critical)"
      : data.solarActivity === "MODERATE"
        ? "var(--color-caution)"
        : "var(--color-nominal)";

  return (
    <div className="section-card flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Space Weather — DONKI
        </span>
        <span
          className="text-[10px] data-value px-2 py-0.5 rounded-full"
          style={{
            background:
              data.solarActivity === "ELEVATED"
                ? "var(--error-subtle)"
                : data.solarActivity === "MODERATE"
                  ? "var(--warning-subtle)"
                  : "var(--success-subtle)",
            color: activityColor,
          }}
        >
          {data.solarActivity}
        </span>
      </div>

      {/* Events */}
      {data.events.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          No significant space weather events in the past 7 days — conditions
          nominal for mission operations.
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
          {data.events.map((event, i) => (
            <div
              key={event.id || i}
              className="flex items-start gap-2"
            >
              <div
                className="status-dot mt-1.5"
                style={{
                  background: SEVERITY_COLORS[event.severity],
                  boxShadow: `0 0 6px ${SEVERITY_COLORS[event.severity]}`,
                }}
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {event.type}
                  </span>
                  <span
                    className="text-[9px] data-value"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {event.time
                      ? new Date(event.time).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {event.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p
        className="text-[9px] data-value"
        style={{ color: "var(--text-muted)" }}
      >
        Source: NASA DONKI (Space Weather Database of Notifications)
      </p>
    </div>
  );
}
