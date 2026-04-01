import { NextResponse } from "next/server";

const DONKI_BASE = "https://api.nasa.gov/DONKI";
const API_KEY = "DEMO_KEY"; // 30 req/hr — sufficient for our polling rate

interface SpaceWeatherEvent {
  type: string;
  id: string;
  time: string;
  message: string;
  severity: "low" | "moderate" | "high";
}

export async function GET() {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = weekAgo.toISOString().slice(0, 10);
    const endDate = now.toISOString().slice(0, 10);

    // Fetch multiple DONKI endpoints in parallel
    const [flares, cmes, geoStorms] = await Promise.all([
      fetch(
        `${DONKI_BASE}/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`,
        { next: { revalidate: 300 } },
      ).then((r) => (r.ok ? r.json() : [])),
      fetch(
        `${DONKI_BASE}/CME?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`,
        { next: { revalidate: 300 } },
      ).then((r) => (r.ok ? r.json() : [])),
      fetch(
        `${DONKI_BASE}/GST?startDate=${startDate}&endDate=${endDate}&api_key=${API_KEY}`,
        { next: { revalidate: 300 } },
      ).then((r) => (r.ok ? r.json() : [])),
    ]);

    const events: SpaceWeatherEvent[] = [];

    // Solar flares
    for (const flare of flares?.slice?.(-5) || []) {
      const classId = flare.classType || "Unknown";
      events.push({
        type: "Solar Flare",
        id: flare.flrID || classId,
        time: flare.beginTime || "",
        message: `${classId} class solar flare detected from ${flare.sourceLocation || "unknown region"}`,
        severity: classId.startsWith("X")
          ? "high"
          : classId.startsWith("M")
            ? "moderate"
            : "low",
      });
    }

    // CMEs
    for (const cme of cmes?.slice?.(-3) || []) {
      events.push({
        type: "CME",
        id: cme.activityID || "",
        time: cme.startTime || "",
        message: `Coronal Mass Ejection detected — speed ${cme.cmeAnalyses?.[0]?.speed || "unknown"} km/s`,
        severity:
          (cme.cmeAnalyses?.[0]?.speed || 0) > 1000 ? "high" : "moderate",
      });
    }

    // Geomagnetic storms
    for (const storm of geoStorms?.slice?.(-3) || []) {
      const kpIndex = storm.allKpIndex?.[0]?.kpIndex || 0;
      events.push({
        type: "Geomagnetic Storm",
        id: storm.gstID || "",
        time: storm.startTime || "",
        message: `Kp index: ${kpIndex} — ${kpIndex >= 7 ? "Severe" : kpIndex >= 5 ? "Moderate" : "Minor"} geomagnetic storm`,
        severity: kpIndex >= 7 ? "high" : kpIndex >= 5 ? "moderate" : "low",
      });
    }

    // Sort by time descending
    events.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );

    return NextResponse.json({
      events: events.slice(0, 10),
      solarActivity:
        events.some((e) => e.severity === "high")
          ? "ELEVATED"
          : events.some((e) => e.severity === "moderate")
            ? "MODERATE"
            : "QUIET",
      queriedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("DONKI error:", err);
    return NextResponse.json(
      {
        events: [],
        solarActivity: "UNKNOWN",
        error: "Space weather fetch failed",
      },
      { status: 500 },
    );
  }
}
