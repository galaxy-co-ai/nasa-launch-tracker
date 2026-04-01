// ─── Core Types ──────────────────────────────────────────

export type View = "TRACK" | "LIVE" | "CONTROL" | "ZEN";

export type CameraMode = "follow" | "earth" | "moon" | "overview";

export type SimSpeed = 1 | 10 | 100 | 1000 | 10000;

export type Phase =
  | "PRE-LAUNCH"
  | "ASCENT"
  | "ORBIT INSERTION"
  | "PARKING ORBIT"
  | "TLI BURN"
  | "TRANS-LUNAR COAST"
  | "LUNAR FLYBY"
  | "RETURN COAST"
  | "REENTRY"
  | "DESCENT"
  | "SPLASHDOWN"
  | "MISSION COMPLETE";

// ─── Telemetry ───────────────────────────────────────────

export interface TelemetryState {
  met: number; // seconds since T-0 (negative = pre-launch)
  phase: Phase;
  velocity: number; // km/h
  altitude: number; // km above Earth surface
  distanceFromEarth: number; // km from Earth center
  distanceToMoon: number; // km from Moon
  acceleration: number; // G
  trajectoryProgress: number; // 0 → 1 over full mission
}

// ─── Mission Data ────────────────────────────────────────

export interface CrewMember {
  name: string;
  role: string;
  agency: string;
  bio: string;
  initials: string;
}

export interface FeedEvent {
  met: number; // seconds — triggers when MET crosses this value
  msg: string;
}

// ─── NASA Data ───────────────────────────────────────────

export interface DsnDish {
  name: string;
  azimuthAngle: number;
  elevationAngle: number;
  targets: {
    name: string;
    id: number;
    uplegRange: number;
    downlegRange: number;
    rtlt: number;
  }[];
  downSignal: {
    signalType: string;
    dataRate: number;
    frequency: number;
    band: string;
    spacecraft: string;
  }[];
}

export interface DsnStation {
  name: string;
  friendlyName: string;
  dishes: DsnDish[];
}

export interface DonkiEvent {
  type: string;
  id: string;
  time: string;
  message: string;
  severity: "low" | "moderate" | "high";
}
