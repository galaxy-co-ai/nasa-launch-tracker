import type { Phase, TelemetryState } from "@/types/mission";
import { TIMELINE, MOON_DISTANCE, EARTH_RADIUS } from "./mission";

// ─── Phase Detection ─────────────────────────────────────

export function getPhase(met: number): Phase {
  if (met < 0) return "PRE-LAUNCH";
  if (met < TIMELINE.srbSep) return "ASCENT";
  if (met < TIMELINE.orbitInsert) return "ASCENT";
  if (met < TIMELINE.orbitInsert + 60) return "ORBIT INSERTION";
  if (met < TIMELINE.tli) return "PARKING ORBIT";
  if (met < TIMELINE.tli + 360) return "TLI BURN";
  if (met < TIMELINE.lunarFlyby) return "TRANS-LUNAR COAST";
  if (met < TIMELINE.freeReturn) return "LUNAR FLYBY";
  if (met < TIMELINE.reentry) return "RETURN COAST";
  if (met < TIMELINE.reentry + 600) return "REENTRY";
  if (met < TIMELINE.splashdown) return "DESCENT";
  if (met < TIMELINE.splashdown + 60) return "SPLASHDOWN";
  return "MISSION COMPLETE";
}

// ─── Trajectory Progress ─────────────────────────────────

export function getTrajectoryProgress(met: number): number {
  if (met <= 0) return 0;
  if (met >= TIMELINE.splashdown) return 1;
  return met / TIMELINE.splashdown;
}

// ─── Full Simulation ─────────────────────────────────────

export function computeSimulation(met: number): TelemetryState {
  const phase = getPhase(met);
  const trajectoryProgress = getTrajectoryProgress(met);

  // Pre-launch defaults
  if (met < 0) {
    return {
      met,
      phase,
      velocity: 0,
      altitude: 0,
      distanceFromEarth: EARTH_RADIUS,
      distanceToMoon: MOON_DISTANCE,
      acceleration: 1.0,
      trajectoryProgress: 0,
    };
  }

  let velocity = 0;
  let altitude = 0;
  let acceleration = 0;

  // Phase 1: Launch to SRB separation (0–132s)
  if (met <= TIMELINE.srbSep) {
    const p = met / TIMELINE.srbSep;
    velocity = p * 5400;
    altitude = p * 45;
    acceleration = 1.0 + p * 2.5;
  }
  // Phase 2: SRB sep to MECO (132–497s)
  else if (met <= TIMELINE.meco) {
    const p = (met - TIMELINE.srbSep) / (TIMELINE.meco - TIMELINE.srbSep);
    velocity = 5400 + p * 22000;
    altitude = 45 + p * 130;
    acceleration = 1.2 + p * 1.5;
  }
  // Phase 3: MECO to orbit insertion (497–1080s)
  else if (met <= TIMELINE.orbitInsert) {
    const p = (met - TIMELINE.meco) / (TIMELINE.orbitInsert - TIMELINE.meco);
    velocity = 27400 + p * 600;
    altitude = 175 + p * 10;
    acceleration = Math.sin(p * Math.PI) * 0.3;
  }
  // Phase 4: Parking orbit (1080–7020s)
  else if (met <= TIMELINE.tli) {
    velocity = 28000;
    altitude = 185;
    acceleration = 0;
  }
  // Phase 5: TLI burn (7020–7380s)
  else if (met <= TIMELINE.tli + 360) {
    const p = (met - TIMELINE.tli) / 360;
    velocity = 28000 + p * 11400;
    altitude = 185 + p * 500;
    acceleration = 0.5 + p * 0.8;
  }
  // Phase 6: Trans-lunar coast (7380–356400s)
  else if (met <= TIMELINE.lunarFlyby) {
    const p = (met - (TIMELINE.tli + 360)) / (TIMELINE.lunarFlyby - (TIMELINE.tli + 360));
    // Velocity decreases during coast, increases near Moon
    const coastVelCurve = 1 - 0.6 * Math.sin(p * Math.PI * 0.8);
    velocity = 39400 * coastVelCurve;
    altitude = 685 + p * (MOON_DISTANCE - 7600 - 685);
    acceleration = 0;
  }
  // Phase 7: Lunar flyby (356400–361800s)
  else if (met <= TIMELINE.freeReturn) {
    const p = (met - TIMELINE.lunarFlyby) / (TIMELINE.freeReturn - TIMELINE.lunarFlyby);
    velocity = 7200 + Math.sin(p * Math.PI) * 2000; // Speed up around Moon
    altitude = MOON_DISTANCE - 7600 + Math.sin(p * Math.PI) * 3000;
    acceleration = 0;
  }
  // Phase 8: Return coast (361800–864000s)
  else if (met <= TIMELINE.reentry) {
    const p = (met - TIMELINE.freeReturn) / (TIMELINE.reentry - TIMELINE.freeReturn);
    // Velocity increases as approaching Earth
    velocity = 5000 + p * 35000;
    altitude = (MOON_DISTANCE - 4600) * (1 - p);
    acceleration = 0;
  }
  // Phase 9: Reentry and descent (864000–865800s)
  else if (met <= TIMELINE.splashdown) {
    const p = (met - TIMELINE.reentry) / (TIMELINE.splashdown - TIMELINE.reentry);
    velocity = 40000 * Math.max(0, 1 - p * 1.2);
    altitude = Math.max(0, 120 * (1 - p));
    acceleration = p < 0.3 ? 4 + p * 10 : Math.max(0, 6 * (1 - p));
  }
  // Post-mission
  else {
    velocity = 0;
    altitude = 0;
    acceleration = 1.0;
  }

  const distanceFromEarth = EARTH_RADIUS + altitude;
  const distanceToMoon = Math.max(0, MOON_DISTANCE - altitude);

  return {
    met,
    phase,
    velocity: Math.round(velocity),
    altitude: Math.round(altitude),
    distanceFromEarth: Math.round(distanceFromEarth),
    distanceToMoon: Math.round(distanceToMoon),
    acceleration: +acceleration.toFixed(1),
    trajectoryProgress,
  };
}
