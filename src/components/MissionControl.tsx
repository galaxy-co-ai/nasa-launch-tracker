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
    sign: ms <= 0 ? "T-" : "T+",
  };
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ─── Arc Gauge SVG ────────────────────────────────────────
function ArcGauge({
  value,
  min,
  max,
  color,
  size = 80,
}: {
  value: number;
  min: number;
  max: number;
  color: string;
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = Math.PI * radius; // half-circle
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`}>
      <path
        d={`M 4 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2}`}
        className="gauge-track"
        strokeWidth={6}
      />
      <path
        d={`M 4 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2}`}
        className="gauge-fill"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
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

  return (
    <div className="kpi-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          {point.label}
        </span>
        <div
          className="status-dot"
          style={{
            background: gaugeColor,
            boxShadow: `0 0 8px ${gaugeColor}`,
          }}
        />
      </div>
      <div className="flex items-end gap-2">
        <span
          className="data-value-lg text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {formatNumber(point.value)}
        </span>
        <span
          className="data-value text-xs pb-0.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          {point.unit}
        </span>
      </div>
      <ArcGauge
        value={point.value}
        min={point.min}
        max={point.max}
        color={gaugeColor}
      />
      <Sparkline data={history} color={gaugeColor} />
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
  const [telemetryHistory, setTelemetryHistory] = useState<number[][]>([
    [],
    [],
    [],
    [],
  ]);

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
        className="glass-panel sticky top-0 z-50 flex items-center justify-between px-6"
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
                ? {
                    background: "var(--color-caution)",
                    boxShadow: "0 0 8px var(--color-caution)",
                  }
                : undefined
            }
          />
          <span
            className="data-value text-xs tracking-widest"
            style={{ color: "var(--accent)" }}
          >
            {getPhaseLabel()}
          </span>
        </div>

        {/* Right — UTC clock */}
        <div className="flex items-center gap-4">
          <span className="data-value text-xs" style={{ color: "var(--text-secondary)" }}>
            UTC {now.toISOString().slice(11, 19)}
          </span>
        </div>
      </header>

      {/* ─── Main Grid ──────────────────────────────── */}
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
        {/* ─── Countdown Hero ───────────────────────── */}
        <section className="flex flex-col items-center gap-2 py-6 md:py-10">
          <span
            className="text-xs uppercase tracking-[0.3em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isLaunched ? "Mission Elapsed Time" : "Time to Launch"}
          </span>
          <div className="flex items-baseline gap-1 md:gap-2 animate-countdown-pulse">
            <span
              className="data-value-lg text-4xl md:text-6xl lg:text-7xl font-bold"
              style={{ color: "var(--accent)" }}
            >
              {countdown.sign}
            </span>
            <CountdownSegment value={countdown.days} label="DAYS" />
            <Colon />
            <CountdownSegment value={countdown.hours} label="HRS" />
            <Colon />
            <CountdownSegment value={countdown.minutes} label="MIN" />
            <Colon />
            <CountdownSegment value={countdown.seconds} label="SEC" />
          </div>
          <p
            className="text-sm text-center max-w-lg mt-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {MISSION.description}
          </p>
        </section>

        {/* ─── Telemetry Grid ───────────────────────── */}
        <section>
          <SectionHeader title="Telemetry" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {telemetry.map((point, i) => (
              <TelemetryCard
                key={point.label}
                point={point}
                history={telemetryHistory[i]}
              />
            ))}
          </div>
        </section>

        {/* ─── Two Column: Timeline + Trajectory/Feed ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-1">
            <SectionHeader title="Mission Timeline" />
            <div className="section-card max-h-[600px] overflow-y-auto">
              {timeline.map((m, i) => (
                <TimelineEvent
                  key={m.id}
                  milestone={m}
                  isLast={i === timeline.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div>
              <SectionHeader title="Orbital Trajectory" />
              <TrajectoryViz progress={trajectoryProgress} />
            </div>

            <StatusFeed events={statusEvents} />
          </div>
        </div>

        {/* ─── NASA Eyes 3D ──────────────────────────── */}
        <section>
          <SectionHeader title="3D Spacecraft Tracking" />
          <NasaEyes />
        </section>

        {/* ─── Deep Space Network ───────────────────── */}
        <section>
          <SectionHeader title="Deep Space Network — Live" />
          <DSNPanel />
        </section>

        {/* ─── NASA TV + Space Weather ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <SectionHeader title="NASA TV — Mission Coverage" />
            <NasaTV />
          </div>
          <div>
            <SectionHeader title="Space Weather" />
            <SpaceWeather />
          </div>
        </div>

        {/* ─── Crew ─────────────────────────────────── */}
        <section>
          <SectionHeader title="Crew — Orion MPCV" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREW.map((member) => (
              <CrewCard key={member.name} member={member} />
            ))}
          </div>
        </section>

        {/* ─── Mission Stats Bar ────────────────────── */}
        <section className="glass-panel p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatBlock label="Vehicle" value={MISSION.vehicle} />
            <StatBlock label="Launch Vehicle" value={MISSION.rocket} />
            <StatBlock label="Mission Duration" value={MISSION.duration} />
            <StatBlock label="Trajectory" value="Free Return" />
            <StatBlock label="Launch Site" value="LC-39B, KSC" />
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────── */}
      <footer
        className="text-center py-4"
        style={{ borderTop: "1px solid var(--glass-border)" }}
      >
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
