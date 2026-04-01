import { NextResponse } from "next/server";

const HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";
const ORION_ID = "-1024"; // Artemis II Orion spacecraft

export async function GET() {
  try {
    const now = new Date();
    const start = new Date(now.getTime() - 10 * 60 * 1000); // 10 min ago
    const end = new Date(now.getTime() + 10 * 60 * 1000); // 10 min from now

    const formatDate = (d: Date) =>
      `'${d.toISOString().slice(0, 19).replace("T", " ")}'`;

    const params = new URLSearchParams({
      format: "json",
      COMMAND: `'${ORION_ID}'`,
      EPHEM_TYPE: "VECTORS",
      CENTER: "'500@399'", // geocentric
      START_TIME: formatDate(start),
      STOP_TIME: formatDate(end),
      STEP_SIZE: "'1m'",
      VEC_TABLE: "'2'", // position + velocity
    });

    const res = await fetch(`${HORIZONS_URL}?${params}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Horizons API error", available: false },
        { status: 502 },
      );
    }

    const data = await res.json();
    const result = data?.result || "";

    // Check if spacecraft data is available
    if (
      result.includes("No ephemeris") ||
      result.includes("cannot be found") ||
      result.includes("No matches")
    ) {
      return NextResponse.json({
        available: false,
        message: "Orion ephemeris not yet available — data populates after launch",
      });
    }

    // Parse the ephemeris table
    const lines = result.split("\n");
    const soeIndex = lines.findIndex((l: string) => l.includes("$$SOE"));
    const eoeIndex = lines.findIndex((l: string) => l.includes("$$EOE"));

    if (soeIndex === -1 || eoeIndex === -1) {
      return NextResponse.json({
        available: false,
        message: "No vector data in response",
        raw: result.slice(0, 500),
      });
    }

    // Parse vectors between SOE and EOE
    const vectorLines = lines.slice(soeIndex + 1, eoeIndex);
    const vectors: {
      timestamp: string;
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      distance: number;
      velocity: number;
      moonDistance: number;
    }[] = [];

    for (let i = 0; i < vectorLines.length; i += 4) {
      // Line 1: Julian date and calendar date
      // Line 2: X, Y, Z (km)
      // Line 3: VX, VY, VZ (km/s)
      // Line 4: blank or light-time
      const dateLine = vectorLines[i]?.trim();
      const posLine = vectorLines[i + 1]?.trim();
      const velLine = vectorLines[i + 2]?.trim();

      if (!dateLine || !posLine || !velLine) continue;

      // Extract date from "2460767.500000000 = A.D. 2025-Mar-28 00:00:00.0000 TDB"
      const dateMatch = dateLine.match(/A\.D\.\s+(\S+\s+\S+)/);
      const timestamp = dateMatch ? dateMatch[1] : dateLine;

      // Extract X, Y, Z
      const posMatch = posLine.match(
        /X\s*=\s*([-\d.E+]+)\s*Y\s*=\s*([-\d.E+]+)\s*Z\s*=\s*([-\d.E+]+)/,
      );
      // Extract VX, VY, VZ
      const velMatch = velLine.match(
        /VX\s*=\s*([-\d.E+]+)\s*VY\s*=\s*([-\d.E+]+)\s*VZ\s*=\s*([-\d.E+]+)/,
      );

      if (posMatch && velMatch) {
        const x = parseFloat(posMatch[1]);
        const y = parseFloat(posMatch[2]);
        const z = parseFloat(posMatch[3]);
        const vx = parseFloat(velMatch[1]);
        const vy = parseFloat(velMatch[2]);
        const vz = parseFloat(velMatch[3]);

        const distance = Math.sqrt(x * x + y * y + z * z); // km from Earth center
        const velocity = Math.sqrt(vx * vx + vy * vy + vz * vz) * 3600; // km/s → km/h
        const moonDistance = 384400 - distance; // approximate (assumes Earth-Moon line)

        vectors.push({ timestamp, x, y, z, vx, vy, vz, distance, velocity, moonDistance: Math.max(0, moonDistance) });
      }
    }

    const latest = vectors[vectors.length - 1] || null;

    return NextResponse.json({
      available: true,
      spacecraft: "Artemis II — Orion",
      horizonsId: ORION_ID,
      latest,
      vectors: vectors.slice(-5), // Last 5 data points
      queriedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Horizons error:", err);
    return NextResponse.json(
      { error: "Horizons query failed", available: false },
      { status: 500 },
    );
  }
}
