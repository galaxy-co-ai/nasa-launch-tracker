"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MISSION,
  CREW,
  TIMELINE,
  simulateTelemetry,
  type TelemetryPoint,
  type MissionMilestone,
} from "@/lib/mission-data";
import DSNPanel from "./DSNPanel";
import NasaTV from "./NasaTV";
import NasaEyes from "./NasaEyes";
import SpaceWeather from "./SpaceWeather";

// ─── Helpers ──────────────────────────────────────────────
function formatCountdown(ms: number): {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  sign: string;
} {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);
  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    sign: ms > 0 ? "T-" : "T+",
  };
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ─── Speedometer Gauge SVG ─────────────────────────────────
function SpeedometerGauge({
  value,
  min,
  max,
  color,
  size = 140,
}: {
  value: number;
  min: number;
  max: number;
  color: string;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2 + 8;
  const radius = size / 2 - 16;
  const startAngle = 225; // degrees (bottom-left)
  const endAngle = -45; // degrees (bottom-right)
  const sweep = 270; // total arc degrees
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const needleAngle = startAngle - pct * sweep;
  const needleRad = (needleAngle * Math.PI) / 180;

  // Arc path helper
  const polarToCart = (angle: number, r: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy - r * Math.sin((angle * Math.PI) / 180),
  });

  const arcStart = polarToCart(startAngle, radius);
  const arcEnd = polarToCart(endAngle, radius);

  // Tick marks
  const ticks = [];
  const numTicks = 10;
  for (let i = 0; i <= numTicks; i++) {
    const angle = startAngle - (i / numTicks) * sweep;
    const inner = polarToCart(angle, radius - 8);
    const outer = polarToCart(angle, radius);
    const isMajor = i % 5 === 0;
    ticks.push(
      <line
        key={i}
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke={isMajor ? "var(--text-tertiary)" : "var(--bg-overlay)"}
        strokeWidth={isMajor ? 2 : 1}
        strokeLinecap="round"
      />,
    );
  }

  // Needle
  const needleTip = {
    x: cx + (radius - 12) * Math.cos(needleRad),
    y: cy - (radius - 12) * Math.sin(needleRad),
  };
  const needleBase1 = {
    x: cx + 4 * Math.cos(needleRad + Math.PI / 2),
    y: cy - 4 * Math.sin(needleRad + Math.PI / 2),
  };
  const needleBase2 = {
    x: cx + 4 * Math.cos(needleRad - Math.PI / 2),
    y: cy - 4 * Math.sin(needleRad - Math.PI / 2),
  };

  return (
    <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
      {/* Track arc */}
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 1 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none"
        stroke="var(--bg-overlay)"
        strokeWidth={6}
        strokeLinecap="round"
      />
      {/* Active arc */}
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 ${pct > 0.5 ? 1 : 0} 1 ${polarToCart(startAngle - pct * sweep, radius).x} ${polarToCart(startAngle - pct * sweep, radius).y}`}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "d 1s cubic-bezier(0.16, 1, 0.3, 1)" }}
      />
      {/* Ticks */}
      {ticks}
      {/* Needle */}
      <polygon
        points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
        fill={color}
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
          transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
      {/* Center cap */}
      <circle cx={cx} cy={cy} r={6} fill="var(--bg-elevated)" stroke={color} strokeWidth={2} />
    </svg>
  );
}

// ─── Sparkline ────────────────────────────────────────────
function Sparkline({
  data,
  color,
  width = 120,
  height = 32,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Altitude Ladder ──────────────────────────────────────
const ALTITUDE_MARKERS = [
  { km: 100, label: "Kármán Line" },
  { km: 408, label: "ISS" },
  { km: 20200, label: "GPS Orbit" },
  { km: 35786, label: "Geostationary" },
  { km: 384400, label: "Moon" },
];

function AltitudeLadder({
  value,
  history,
}: {
  value: number;
  history: number[];
}) {
  // Use log scale for the huge range (0 → 400,000 km)
  const logScale = (v: number) => {
    if (v <= 0) return 0;
    const maxLog = Math.log10(400000);
    return Math.min(1, Math.log10(Math.max(v, 1)) / maxLog);
  };

  const pct = logScale(value);
  const barHeight = 160;
  const fillHeight = pct * barHeight;

  return (
    <div className="kpi-card flex flex-col gap-2">
      <div className="flex items-center justify-between w-full">
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          Altitude
        </span>
        <div
          className="status-dot status-dot--nominal"
        />
      </div>

      <div className="flex gap-3 items-end">
        {/* Vertical bar + markers */}
        <div className="relative flex-shrink-0" style={{ width: 32, height: barHeight }}>
          {/* Track */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "var(--bg-overlay)" }}
          />
          {/* Fill */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-full"
            style={{
              height: `${fillHeight}px`,
              background: "linear-gradient(to top, var(--color-trajectory), var(--color-lunar))",
              boxShadow: "0 0 12px var(--color-trajectory)",
              transition: "height 1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          {/* Current position marker */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
            style={{
              bottom: `${fillHeight - 2}px`,
              background: "var(--text-primary)",
              boxShadow: "0 0 8px var(--text-primary)",
              transition: "bottom 1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>

        {/* Reference markers */}
        <div className="relative flex-1" style={{ height: barHeight }}>
          {ALTITUDE_MARKERS.map((marker) => {
            const markerPct = logScale(marker.km);
            const bottom = markerPct * barHeight;
            const isBelow = value >= marker.km;
            return (
              <div
                key={marker.label}
                className="absolute left-0 flex items-center gap-1.5"
                style={{ bottom: `${bottom - 6}px` }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: isBelow ? "var(--color-trajectory)" : "var(--text-muted)",
                  }}
                />
                <span
                  className="data-value text-[9px] whitespace-nowrap"
                  style={{
                    color: isBelow ? "var(--text-secondary)" : "var(--text-muted)",
                  }}
                >
                  {marker.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Value */}
      <div className="flex items-end gap-2 mt-1">
        <span
          className="data-value-lg text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {formatNumber(value)}
        </span>
        <span
          className="data-value text-xs pb-0.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          km
        </span>
      </div>
      <Sparkline data={history} color="var(--color-trajectory)" width={140} />
    </div>
  );
}

// ─── Distance Card ────────────────────────────────────────
function DistanceCard({
  point,
  history,
  color,
  invert,
}: {
  point: TelemetryPoint;
  history: number[];
  color: string;
  invert?: boolean; // Moon distance = bar shrinks as you approach
}) {
  const pct = Math.max(0, Math.min(1, (point.value - point.min) / (point.max - point.min)));
  const displayPct = invert ? 1 - pct : pct;

  return (
    <div className="kpi-card flex flex-col gap-2">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          {point.label}
        </span>
        <div className="status-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <div className="flex items-end gap-2">
        <span className="data-value-lg text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {formatNumber(point.value)}
        </span>
        <span className="data-value text-[10px] pb-0.5" style={{ color: "var(--text-tertiary)" }}>
          {point.unit}
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-full h-2 rounded-full" style={{ background: "var(--bg-overlay)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${displayPct * 100}%`,
            background: color,
            boxShadow: `0 0 8px ${color}`,
            transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
      <Sparkline data={history} color={color} width={200} />
    </div>
  );
}

// ─── Telemetry Card ───────────────────────────────────────
function TelemetryCard({
  point,
  history,
}: {
  point: TelemetryPoint;
  history: number[];
}) {
  const isNominal =
    point.value >= point.nominal[0] && point.value <= point.nominal[1];
  const gaugeColor = isNominal ? "var(--color-nominal)" : "var(--color-caution)";

  // Use distance card for distance metrics
  if (point.label === "Earth Distance") {
    return <DistanceCard point={point} history={history} color="var(--color-trajectory)" />;
  }
  if (point.label === "Moon Distance") {
    return <DistanceCard point={point} history={history} color="var(--color-lunar)" invert />;
  }

  return (
    <div className="kpi-card flex flex-col items-center gap-2">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          {point.label}
        </span>
        <div
          className="status-dot"
          style={{ background: gaugeColor, boxShadow: `0 0 8px ${gaugeColor}` }}
        />
      </div>
      <SpeedometerGauge
        value={point.value}
        min={point.min}
        max={point.max}
        color={gaugeColor}
      />
      <div className="flex items-end gap-2">
        <span className="data-value-lg text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {formatNumber(point.value)}
        </span>
        <span className="data-value text-[10px] pb-0.5" style={{ color: "var(--text-tertiary)" }}>
          {point.unit}
        </span>
      </div>
      <Sparkline data={history} color={gaugeColor} width={200} />
    </div>
  );
}

// ─── Crew Card ────────────────────────────────────────────
function CrewCard({ member }: { member: (typeof CREW)[number] }) {
  const initials = member.image;
  return (
    <div className="section-card flex items-start gap-4">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
        style={{
          background: "var(--accent-subtle)",
          color: "var(--accent)",
          border: "1px solid var(--accent-border)",
        }}
      >
        {initials}
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            {member.name}
          </span>
          {member.agency === "CSA" && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: "var(--info-subtle)",
                color: "var(--info)",
              }}
            >
              CSA
            </span>
          )}
        </div>
        <span
          className="text-xs font-medium"
          style={{ color: "var(--accent)" }}
        >
          {member.role}
        </span>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {member.bio}
        </p>
      </div>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────
function TimelineEvent({
  milestone,
  isLast,
}: {
  milestone: MissionMilestone;
  isLast: boolean;
}) {
  const statusColor =
    milestone.status === "completed"
      ? "var(--color-nominal)"
      : milestone.status === "active"
        ? "var(--accent)"
        : "var(--text-muted)";

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
          style={{
            background: statusColor,
            boxShadow:
              milestone.status === "active"
                ? `0 0 12px ${statusColor}`
                : "none",
          }}
        />
        {!isLast && (
          <div
            className="w-px flex-1 min-h-[32px]"
            style={{ background: "var(--glass-border)" }}
          />
        )}
      </div>
      <div className="flex flex-col gap-1 pb-4">
        <div className="flex items-center gap-2">
          <span
            className="data-value text-[11px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {milestone.tPlus}
          </span>
        </div>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {milestone.label}
        </span>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {milestone.description}
        </p>
      </div>
    </div>
  );
}

// ─── Trajectory Visualization ─────────────────────────────
function TrajectoryViz({ progress }: { progress: number }) {
  // Simplified free-return trajectory path
  return (
    <div className="section-card overflow-hidden">
      <h3
        className="text-xs uppercase tracking-wider mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        Trajectory — Free Return
      </h3>
      <svg viewBox="0 0 400 200" className="w-full" style={{ maxHeight: 200 }}>
        {/* Earth */}
        <circle cx="60" cy="100" r="20" fill="var(--info)" opacity={0.3} />
        <circle cx="60" cy="100" r="16" fill="var(--info)" opacity={0.6} />
        <text
          x="60"
          y="104"
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize="8"
          fontWeight="bold"
        >
          Earth
        </text>

        {/* Moon */}
        <circle cx="340" cy="60" r="12" fill="var(--color-lunar)" opacity={0.3} />
        <circle cx="340" cy="60" r="9" fill="var(--color-lunar)" opacity={0.6} />
        <text
          x="340"
          y="63"
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize="7"
          fontWeight="bold"
        >
          Moon
        </text>

        {/* Trajectory path */}
        <path
          d="M 80 100 C 150 -20, 300 -20, 340 48 M 340 72 C 300 180, 150 220, 80 100"
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={0.4}
        />

        {/* Active trajectory */}
        <path
          d="M 80 100 C 150 -20, 300 -20, 340 48 M 340 72 C 300 180, 150 220, 80 100"
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeDasharray={`${progress * 600} 600`}
          style={{ filter: "drop-shadow(0 0 4px var(--accent))" }}
        />

        {/* Orion position indicator */}
        {progress > 0 && (
          <circle
            cx={60 + progress * 280}
            cy={100 - Math.sin(progress * Math.PI) * 60}
            r={4}
            fill="var(--accent)"
            style={{ filter: "drop-shadow(0 0 8px var(--accent))" }}
          >
            <animate
              attributeName="r"
              values="3;5;3"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Distance label */}
        <text
          x="200"
          y="190"
          textAnchor="middle"
          fill="var(--text-tertiary)"
          fontSize="9"
          fontFamily="var(--font-geist-mono)"
        >
          384,400 km
        </text>
      </svg>
    </div>
  );
}

// ─── Status Feed ──────────────────────────────────────────
interface StatusEvent {
  time: string;
  message: string;
  type: "nominal" | "info" | "caution";
}

function StatusFeed({ events }: { events: StatusEvent[] }) {
  return (
    <div className="section-card flex flex-col gap-1">
      <h3
        className="text-xs uppercase tracking-wider mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        Mission Status Feed
      </h3>
      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-2">
        {events.map((event, i) => (
          <div
            key={i}
            className="flex items-start gap-2 animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div
              className="status-dot mt-1.5"
              style={{
                background:
                  event.type === "nominal"
                    ? "var(--color-nominal)"
                    : event.type === "caution"
                      ? "var(--color-caution)"
                      : "var(--info)",
                boxShadow: `0 0 6px ${
                  event.type === "nominal"
                    ? "var(--color-nominal)"
                    : event.type === "caution"
                      ? "var(--color-caution)"
                      : "var(--info)"
                }`,
              }}
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className="data-value text-[10px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {event.time}
              </span>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {event.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────
export default function MissionControl() {
  const [now, setNow] = useState(() => new Date());
  const [showStream, setShowStream] = useState(false);
  const [centerTab, setCenterTab] = useState<"trajectory" | "stream" | "eyes">("trajectory");
  const [telemetryHistory, setTelemetryHistory] = useState<number[][]>(
    Array.from({ length: 4 }, () => []),
  );

  // Update every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const msToLaunch = MISSION.launchDate.getTime() - now.getTime();
  const secondsSinceLaunch = -msToLaunch / 1000;
  const isLaunched = msToLaunch <= 0;
  const countdown = formatCountdown(msToLaunch);

  // Telemetry
  const telemetry = useMemo(
    () => simulateTelemetry(secondsSinceLaunch),
    [secondsSinceLaunch],
  );

  // History accumulation (every 2 seconds)
  useEffect(() => {
    if (!isLaunched) return;
    const interval = setInterval(() => {
      setTelemetryHistory((prev) =>
        prev.map((arr, i) => [...arr.slice(-59), telemetry[i].value]),
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [isLaunched, telemetry]);

  // Timeline with live status
  const timeline = useMemo(() => {
    const milestoneSeconds: Record<string, number> = {
      launch: 0,
      "srb-sep": 132,
      "fairing-sep": 216,
      "core-sep": 497,
      "orbit-insertion": 1080,
      tli: 7020,
      "icps-sep": 7500,
      "lunar-flyby": 356400,
      "free-return": 361800,
      reentry: 867600,
      splashdown: 869400,
    };

    return TIMELINE.map((m) => {
      const mSec = milestoneSeconds[m.id] ?? Infinity;
      let status: MissionMilestone["status"] = "upcoming";
      if (secondsSinceLaunch >= mSec + 60) status = "completed";
      else if (secondsSinceLaunch >= mSec - 10) status = "active";
      return { ...m, status };
    });
  }, [secondsSinceLaunch]);

  // Trajectory progress (0 to 1 over 10 days)
  const trajectoryProgress = useMemo(
    () => Math.max(0, Math.min(1, secondsSinceLaunch / 864000)),
    [secondsSinceLaunch],
  );

  // Status feed events
  const generateEvents = useCallback((): StatusEvent[] => {
    const events: StatusEvent[] = [
      {
        time: "T-01:00:00",
        message: "Crew access arm retracted, closeout complete",
        type: "nominal",
      },
      {
        time: "T-00:30:00",
        message: "Launch director poll — all stations GO",
        type: "nominal",
      },
      {
        time: "T-00:10:00",
        message: "Terminal countdown sequence initiated",
        type: "info",
      },
      {
        time: "T-00:06:30",
        message: "Ground launch sequencer activated",
        type: "info",
      },
      {
        time: "T-00:02:00",
        message: "RS-25 engines pre-chill in progress",
        type: "nominal",
      },
      {
        time: "T-00:00:31",
        message: "Auto-sequence start",
        type: "info",
      },
    ];

    if (isLaunched) {
      events.push(
        { time: "T+00:00:00", message: "LIFTOFF — Artemis II!", type: "nominal" },
        {
          time: "T+00:00:08",
          message: "Tower clear, roll program initiated",
          type: "nominal",
        },
      );
    }
    if (secondsSinceLaunch > 30) {
      events.push({
        time: "T+00:00:30",
        message: "Max-Q approaching — 33.2 kPa",
        type: "caution",
      });
    }
    if (secondsSinceLaunch > 60) {
      events.push({
        time: "T+00:01:00",
        message: "Max-Q — vehicle nominal, throttle up",
        type: "nominal",
      });
    }
    if (secondsSinceLaunch > 132) {
      events.push({
        time: "T+00:02:12",
        message: "SRB separation confirmed — visual nominal",
        type: "nominal",
      });
    }
    if (secondsSinceLaunch > 497) {
      events.push({
        time: "T+00:08:17",
        message: "MECO — core stage separation confirmed",
        type: "nominal",
      });
    }
    if (secondsSinceLaunch > 1080) {
      events.push({
        time: "T+00:18:00",
        message: "Orbit insertion confirmed — 185 km circular",
        type: "nominal",
      });
    }
    if (secondsSinceLaunch > 7020) {
      events.push({
        time: "T+01:57:00",
        message: "TLI BURN COMPLETE — Orion on lunar trajectory",
        type: "nominal",
      });
    }

    return events.reverse();
  }, [isLaunched, secondsSinceLaunch]);

  const statusEvents = generateEvents();

  // Phase label
  const getPhaseLabel = () => {
    if (!isLaunched) return "PRE-LAUNCH";
    if (secondsSinceLaunch < 132) return "ASCENT — FIRST STAGE";
    if (secondsSinceLaunch < 497) return "ASCENT — SECOND STAGE";
    if (secondsSinceLaunch < 1080) return "ORBIT INSERTION";
    if (secondsSinceLaunch < 7020) return "PARKING ORBIT";
    if (secondsSinceLaunch < 7500) return "TRANS-LUNAR INJECTION";
    if (secondsSinceLaunch < 356400) return "LUNAR COAST";
    if (secondsSinceLaunch < 361800) return "LUNAR FLYBY";
    if (secondsSinceLaunch < 867600) return "RETURN COAST";
    if (secondsSinceLaunch < 869400) return "REENTRY";
    return "MISSION COMPLETE";
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ─── TopBar ─────────────────────────────────── */}
      <header
        className="glass-panel sticky top-0 z-50 flex items-center justify-between px-4 md:px-6"
        style={{
          height: "var(--topbar-height)",
          borderRadius: 0,
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
          >
            A2
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Mission Control
            </span>
            <span className="text-[10px] data-value" style={{ color: "var(--text-tertiary)" }}>
              ARTEMIS II — {MISSION.rocket}
            </span>
          </div>
        </div>

        {/* Center — Phase indicator */}
        <div className="hidden md:flex items-center gap-3">
          <div
            className={`status-dot ${isLaunched ? "status-dot--nominal" : ""}`}
            style={
              !isLaunched
                ? { background: "var(--color-caution)", boxShadow: "0 0 8px var(--color-caution)" }
                : undefined
            }
          />
          <span className="data-value text-xs tracking-widest" style={{ color: "var(--accent)" }}>
            {getPhaseLabel()}
          </span>
        </div>

        {/* Right — Stream toggle + UTC */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStream(!showStream)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer"
            style={{
              background: showStream ? "var(--error-subtle)" : "var(--bg-elevated)",
              color: showStream ? "var(--error)" : "var(--text-secondary)",
              border: `1px solid ${showStream ? "var(--error)" : "var(--glass-border)"}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: showStream ? "var(--error)" : "var(--text-muted)",
                boxShadow: showStream ? "0 0 6px var(--error)" : "none",
                animation: showStream ? "pulse-glow-critical 2s ease-in-out infinite" : "none",
              }}
            />
            LIVE
          </button>
          <span className="data-value text-xs hidden sm:block" style={{ color: "var(--text-secondary)" }}>
            UTC {now.toISOString().slice(11, 19)}
          </span>
        </div>
      </header>

      {/* ─── Metric Strip — Countdown + Key Values ───── */}
      <div
        className="flex flex-wrap items-center justify-center gap-4 md:gap-8 px-4 py-3"
        style={{ borderBottom: "1px solid var(--glass-border)", background: "var(--bg-surface)" }}
      >
        {/* Countdown */}
        <div className="flex items-baseline gap-1">
          <span className="data-value text-sm font-bold" style={{ color: "var(--accent)" }}>
            {countdown.sign}
          </span>
          <span className="data-value text-base md:text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {countdown.days}:{countdown.hours}:{countdown.minutes}:{countdown.seconds}
          </span>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-8" style={{ background: "var(--glass-border)" }} />

        {/* Inline metrics */}
        {telemetry.map((point) => (
          <div key={point.label} className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              {point.label === "Earth Distance" ? "⊕" : point.label === "Moon Distance" ? "☽" : point.label === "Acceleration" ? "G" : point.label.slice(0, 3).toUpperCase()}
            </span>
            <span className="data-value text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {formatNumber(point.value)}
            </span>
            <span className="data-value text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              {point.unit}
            </span>
          </div>
        ))}
      </div>

      {/* ─── Stream Panel (toggled) ──────────────────── */}
      {showStream && (
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto w-full animate-fade-in-up">
          <NasaTV />
        </div>
      )}

      {/* ─── Main 3-Column Layout ────────────────────── */}
      <main className="flex-1 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_260px] gap-4 md:gap-5">

          {/* ── Left Column: Timeline ────────────────── */}
          <div className="hidden lg:flex flex-col gap-2">
            <SectionHeader title="Timeline" />
            <div className="section-card flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
              {timeline.map((m, i) => (
                <TimelineEvent key={m.id} milestone={m} isLast={i === timeline.length - 1} />
              ))}
            </div>
          </div>

          {/* ── Center Column: Viz + Feed ────────────── */}
          <div className="flex flex-col gap-4">
            {/* Featured: Live Stream */}
            <NasaTV />

            {/* Tab bar for secondary views */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--bg-surface)" }}>
              {(["trajectory", "eyes"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCenterTab(tab)}
                  className="flex-1 text-xs py-2 px-3 rounded-md transition-all cursor-pointer"
                  style={{
                    background: centerTab === tab ? "var(--bg-elevated)" : "transparent",
                    color: centerTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
                    border: centerTab === tab ? "1px solid var(--glass-border)" : "1px solid transparent",
                  }}
                >
                  {tab === "trajectory" ? "Trajectory" : "3D View"}
                </button>
              ))}
            </div>

            {/* Secondary panel */}
            {centerTab === "trajectory" && <TrajectoryViz progress={trajectoryProgress} />}
            {centerTab === "eyes" && <NasaEyes />}

            {/* Status Feed */}
            <StatusFeed events={statusEvents} />
          </div>

          {/* ── Right Column: Telemetry Instruments ──── */}
          <div className="flex flex-col gap-3">
            <SectionHeader title="Telemetry" />
            {telemetry.map((point, i) => (
              <TelemetryCard
                key={point.label}
                point={point}
                history={telemetryHistory[i]}
              />
            ))}
          </div>
        </div>

        {/* ─── Below fold: DSN + Weather ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <SectionHeader title="Deep Space Network — Live" />
            <DSNPanel />
          </div>
          <div>
            <SectionHeader title="Space Weather" />
            <SpaceWeather />
          </div>
        </div>

        {/* ─── Crew + Stats ──────────────────────────── */}
        <div className="mt-8">
          <SectionHeader title="Crew — Orion MPCV" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CREW.map((member) => (
              <CrewCard key={member.name} member={member} />
            ))}
          </div>
        </div>

        <div className="glass-panel p-4 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatBlock label="Vehicle" value={MISSION.vehicle} />
            <StatBlock label="Launch Vehicle" value={MISSION.rocket} />
            <StatBlock label="Mission Duration" value={MISSION.duration} />
            <StatBlock label="Trajectory" value="Free Return" />
            <StatBlock label="Launch Site" value="LC-39B, KSC" />
          </div>
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────── */}
      <footer className="text-center py-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Mission Control — Artemis II — Live data from NASA DSN, JPL Horizons, DONKI
        </span>
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────
function CountdownSegment({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="data-value-lg text-4xl md:text-6xl lg:text-7xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </span>
      <span
        className="text-[9px] md:text-[10px] tracking-[0.2em] mt-1"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
    </div>
  );
}

function Colon() {
  return (
    <span
      className="data-value-lg text-3xl md:text-5xl lg:text-6xl font-bold self-start mt-1"
      style={{ color: "var(--text-muted)" }}
    >
      :
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      className="text-xs uppercase tracking-[0.2em] mb-3"
      style={{ color: "var(--text-secondary)" }}
    >
      {title}
    </h2>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <span className="data-value text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}
