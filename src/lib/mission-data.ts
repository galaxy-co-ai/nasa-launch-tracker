// Artemis II — Mission Data
// NASA's first crewed lunar mission since Apollo 17 (1972)

export interface CrewMember {
  name: string;
  role: string;
  agency: string;
  bio: string;
  image: string;
}

export interface MissionMilestone {
  id: string;
  label: string;
  description: string;
  tPlus: string; // relative to launch
  status: "completed" | "active" | "upcoming";
}

export interface TelemetryPoint {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  nominal: [number, number]; // nominal range
  icon: string;
}

export const MISSION = {
  name: "Artemis II",
  vehicle: "Orion MPCV",
  rocket: "SLS Block 1",
  launchSite: "LC-39B, Kennedy Space Center",
  launchDate: new Date("2026-04-01T12:30:00-04:00"), // EDT
  duration: "~10 days",
  orbit: "Lunar Free-Return Trajectory",
  distance: "384,400 km to Moon",
  maxVelocity: "39,429 km/h",
  description:
    "First crewed flight of the Orion spacecraft and SLS rocket. Four astronauts will fly around the Moon in a free-return trajectory — the first humans beyond low Earth orbit since Apollo 17 in December 1972.",
} as const;

export const CREW: CrewMember[] = [
  {
    name: "Reid Wiseman",
    role: "Commander",
    agency: "NASA",
    bio: "Navy test pilot, ISS veteran (Expedition 41). 165 days in space.",
    image: "RW",
  },
  {
    name: "Victor Glover",
    role: "Pilot",
    agency: "NASA",
    bio: "Navy fighter pilot, SpaceX Crew-1 astronaut. First Black astronaut on a lunar mission.",
    image: "VG",
  },
  {
    name: "Christina Koch",
    role: "Mission Specialist",
    agency: "NASA",
    bio: "Holds record for longest single spaceflight by a woman (328 days). Electrical engineer.",
    image: "CK",
  },
  {
    name: "Jeremy Hansen",
    role: "Mission Specialist",
    agency: "CSA",
    bio: "Canadian Forces fighter pilot. First Canadian to fly to deep space.",
    image: "JH",
  },
];

export const TIMELINE: MissionMilestone[] = [
  {
    id: "launch",
    label: "Launch",
    description: "SLS lifts off from LC-39B",
    tPlus: "T+0:00:00",
    status: "upcoming",
  },
  {
    id: "srb-sep",
    label: "SRB Separation",
    description: "Solid rocket boosters jettison at 45 km altitude",
    tPlus: "T+0:02:12",
    status: "upcoming",
  },
  {
    id: "fairing-sep",
    label: "Fairing Separation",
    description: "Launch abort system and service module fairings jettison",
    tPlus: "T+0:03:36",
    status: "upcoming",
  },
  {
    id: "core-sep",
    label: "Core Stage Separation",
    description: "Core stage engine cutoff and ICPS ignition",
    tPlus: "T+0:08:17",
    status: "upcoming",
  },
  {
    id: "orbit-insertion",
    label: "Orbit Insertion",
    description: "Orion enters initial Earth parking orbit (185 km)",
    tPlus: "T+0:18:00",
    status: "upcoming",
  },
  {
    id: "tli",
    label: "Trans-Lunar Injection",
    description: "ICPS burn sends Orion toward the Moon",
    tPlus: "T+1:57:00",
    status: "upcoming",
  },
  {
    id: "icps-sep",
    label: "ICPS Separation",
    description: "Interim Cryogenic Propulsion Stage separates",
    tPlus: "T+2:05:00",
    status: "upcoming",
  },
  {
    id: "lunar-flyby",
    label: "Lunar Flyby",
    description: "Closest approach — 8,900 km above lunar surface",
    tPlus: "T+4d 3:00:00",
    status: "upcoming",
  },
  {
    id: "free-return",
    label: "Free Return",
    description: "Gravity slingshot sends Orion back toward Earth",
    tPlus: "T+4d 4:30:00",
    status: "upcoming",
  },
  {
    id: "reentry",
    label: "Earth Reentry",
    description: "Orion enters atmosphere at 40,000 km/h",
    tPlus: "T+10d 1:00:00",
    status: "upcoming",
  },
  {
    id: "splashdown",
    label: "Splashdown",
    description: "Pacific Ocean recovery by USS Portland",
    tPlus: "T+10d 1:30:00",
    status: "upcoming",
  },
];

export function getInitialTelemetry(): TelemetryPoint[] {
  return [
    {
      label: "Velocity",
      value: 0,
      unit: "km/h",
      min: 0,
      max: 40000,
      nominal: [0, 40000],
      icon: "speed",
    },
    {
      label: "Altitude",
      value: 0,
      unit: "km",
      min: 0,
      max: 400000,
      nominal: [0, 400000],
      icon: "altitude",
    },
    {
      label: "Acceleration",
      value: 1.0,
      unit: "G",
      min: 0,
      max: 4,
      nominal: [0, 3.5],
      icon: "acceleration",
    },
    {
      label: "Heart Rate (Avg)",
      value: 72,
      unit: "bpm",
      min: 40,
      max: 180,
      nominal: [55, 120],
      icon: "heartrate",
    },
  ];
}

// Simulated telemetry progression based on mission phase
export function simulateTelemetry(secondsSinceLaunch: number): TelemetryPoint[] {
  const t = secondsSinceLaunch;
  const base = getInitialTelemetry();

  if (t < 0) return base; // Pre-launch

  // Phase 1: Launch to SRB sep (0-132s)
  if (t <= 132) {
    const progress = t / 132;
    base[0].value = Math.round(progress * 5400); // 0 → 5,400 km/h
    base[1].value = Math.round(progress * 45); // 0 → 45 km
    base[2].value = +(1.0 + progress * 2.5).toFixed(1); // 1G → 3.5G
    base[3].value = Math.round(72 + progress * 30); // Elevated HR
  }
  // Phase 2: SRB sep to core sep (132-497s)
  else if (t <= 497) {
    const progress = (t - 132) / (497 - 132);
    base[0].value = Math.round(5400 + progress * 22000); // 5,400 → 27,400 km/h
    base[1].value = Math.round(45 + progress * 130); // 45 → 175 km
    base[2].value = +(1.2 + progress * 1.5).toFixed(1);
    base[3].value = Math.round(95 + progress * 15);
  }
  // Phase 3: Orbit insertion (497-1080s)
  else if (t <= 1080) {
    const progress = (t - 497) / (1080 - 497);
    base[0].value = Math.round(27400 + progress * 600);
    base[1].value = Math.round(175 + progress * 10); // ~185 km
    base[2].value = +(0.0 + Math.sin(progress * Math.PI) * 0.3).toFixed(1); // Microgravity
    base[3].value = Math.round(85 - progress * 10);
  }
  // Phase 4: Parking orbit (1080-7020s)
  else if (t <= 7020) {
    base[0].value = 28000;
    base[1].value = 185;
    base[2].value = 0.0;
    base[3].value = 72 + Math.round(Math.sin(t / 100) * 5);
  }
  // Phase 5: TLI and coast (7020+)
  else {
    const coastTime = t - 7020;
    const coastProgress = Math.min(coastTime / 345600, 1); // 4 days
    base[0].value = Math.round(28000 + coastProgress * 11000);
    base[1].value = Math.round(185 + coastProgress * 384215);
    base[2].value = +(coastProgress < 0.01 ? 1.2 : 0.0).toFixed(1);
    base[3].value = 68 + Math.round(Math.sin(t / 200) * 8);
  }

  return base;
}
