import type { CrewMember, FeedEvent } from "@/types/mission";

// ─── T-Zero ──────────────────────────────────────────────

export const T0 = new Date("2026-04-01T22:35:00Z");

// ─── Timeline (seconds after T-0) ───────────────────────

export const TIMELINE = {
  launch: 0,
  srbSep: 132,
  fairingSep: 216,
  meco: 497,
  orbitInsert: 1080,
  tli: 7020,
  icpsSep: 7500,
  lunarFlyby: 356400,
  freeReturn: 361800,
  reentry: 864000,
  splashdown: 865800,
} as const;

// ─── Crew ────────────────────────────────────────────────

export const CREW: CrewMember[] = [
  {
    name: "Reid Wiseman",
    role: "Commander",
    agency: "NASA",
    bio: "Navy test pilot, ISS veteran (Expedition 41). 165 days in space.",
    initials: "RW",
  },
  {
    name: "Victor Glover",
    role: "Pilot",
    agency: "NASA",
    bio: "Navy fighter pilot, SpaceX Crew-1. First Black astronaut on a lunar mission.",
    initials: "VG",
  },
  {
    name: "Christina Koch",
    role: "Mission Specialist",
    agency: "NASA",
    bio: "Record holder: longest single spaceflight by a woman (328 days).",
    initials: "CK",
  },
  {
    name: "Jeremy Hansen",
    role: "Mission Specialist",
    agency: "CSA",
    bio: "Canadian Forces fighter pilot. First Canadian to fly to deep space.",
    initials: "JH",
  },
];

// ─── Feed Events (spec Section 9) ───────────────────────

export const FEED_EVENTS: FeedEvent[] = [
  { met: -3600, msg: "Crew access arm retracted, closeout complete" },
  { met: -600, msg: "Terminal countdown sequence initiated" },
  { met: -390, msg: "Ground launch sequencer activated" },
  { met: -120, msg: "RS-25 engines pre-chill in progress" },
  { met: -31, msg: "Auto-sequence start" },
  { met: 0, msg: "LIFTOFF — Artemis II!" },
  { met: 8, msg: "Tower clear, roll program initiated" },
  { met: 30, msg: "Max-Q approaching — 33.2 kPa" },
  { met: 60, msg: "Max-Q — vehicle nominal, throttle up" },
  { met: 132, msg: "SRB separation confirmed — visual nominal" },
  { met: 216, msg: "Fairing separation — LAS jettison confirmed" },
  { met: 497, msg: "MECO — core stage separation confirmed" },
  { met: 510, msg: "ICPS ignition confirmed" },
  { met: 1080, msg: "Orbit insertion — 185km circular orbit achieved" },
  { met: 1200, msg: "Orion systems check — all nominal" },
  { met: 3600, msg: "Crew begins unstowing, cabin ops underway" },
  { met: 7020, msg: "TLI burn ignition — Orion is headed for the Moon" },
  { met: 7380, msg: "TLI burn complete — escape trajectory confirmed" },
  { met: 7500, msg: "ICPS separation — Orion is free-flying" },
  { met: 14400, msg: "Orion now beyond GPS orbit altitude" },
  { met: 36000, msg: "Orion now beyond geostationary orbit" },
  { met: 86400, msg: "Day 1 complete — all systems nominal" },
  { met: 172800, msg: "Day 2 — crew conducting science experiments" },
  { met: 259200, msg: "Day 3 — Moon now visible to crew as a growing crescent" },
  { met: 345600, msg: "Day 4 — approaching lunar sphere of influence" },
  { met: 356400, msg: "Lunar flyby — closest approach: 7,600 km above surface" },
  { met: 358200, msg: "Far side of Moon — loss of Earth signal expected" },
  { met: 360000, msg: "Signal reacquired — Orion rounding the Moon" },
  { met: 361800, msg: "Free return trajectory confirmed — heading home" },
  { met: 432000, msg: "Day 5 — Earth growing brighter in the window" },
  { met: 518400, msg: "Day 6 — midcourse correction burn (if needed)" },
  { met: 691200, msg: "Day 8 — crew preparing for reentry procedures" },
  { met: 777600, msg: "Day 9 — service module separation prep underway" },
  { met: 855000, msg: "Service module separation confirmed" },
  { met: 860400, msg: "Entry interface — reentry corridor confirmed" },
  { met: 864000, msg: "Atmospheric entry — 40,000 km/h — plasma blackout" },
  { met: 864600, msg: "Drogue chutes deployed" },
  { met: 865200, msg: "Main chutes deployed — descent nominal" },
  { met: 865800, msg: "SPLASHDOWN — Welcome home, Artemis II!" },
];

// ─── Milestone labels for timeline UI ────────────────────

export const MILESTONES = [
  { met: TIMELINE.launch, label: "Launch", short: "Launch" },
  { met: TIMELINE.srbSep, label: "SRB Separation", short: "SRB" },
  { met: TIMELINE.meco, label: "Core Stage Sep", short: "MECO" },
  { met: TIMELINE.orbitInsert, label: "Orbit Insertion", short: "Orbit" },
  { met: TIMELINE.tli, label: "Trans-Lunar Injection", short: "TLI" },
  { met: TIMELINE.icpsSep, label: "ICPS Separation", short: "ICPS" },
  { met: TIMELINE.lunarFlyby, label: "Lunar Flyby", short: "Flyby" },
  { met: TIMELINE.freeReturn, label: "Free Return", short: "Return" },
  { met: TIMELINE.reentry, label: "Reentry", short: "Entry" },
  { met: TIMELINE.splashdown, label: "Splashdown", short: "Splash" },
] as const;

// ─── Distance reference markers ──────────────────────────

export const DISTANCE_MARKERS = [
  { km: 408, label: "ISS" },
  { km: 20200, label: "GPS" },
  { km: 35786, label: "GEO" },
] as const;

export const MOON_DISTANCE = 384400; // km
export const EARTH_RADIUS = 6371; // km
