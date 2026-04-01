import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const DSN_URL = "https://eyes.nasa.gov/dsn/data/dsn.xml";

interface DsnDish {
  name: string;
  azimuthAngle: number;
  elevationAngle: number;
  windSpeed: number;
  targets: {
    name: string;
    id: number;
    uplegRange: number;
    downlegRange: number;
    rtlt: number; // round-trip light time (seconds)
  }[];
  upSignal: {
    signalType: string;
    dataRate: number;
    frequency: number;
    band: string;
    power: number;
    spacecraft: string;
  }[];
  downSignal: {
    signalType: string;
    dataRate: number;
    frequency: number;
    band: string;
    spacecraft: string;
  }[];
}

interface DsnStation {
  name: string;
  friendlyName: string;
  dishes: DsnDish[];
}

function ensureArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export async function GET() {
  try {
    const res = await fetch(DSN_URL, {
      next: { revalidate: 5 },
      headers: { "User-Agent": "MissionControl/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch DSN data" },
        { status: 502 },
      );
    }

    const xml = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    const parsed = parser.parse(xml);
    const dsn = parsed?.dsn;

    if (!dsn) {
      return NextResponse.json({ stations: [], timestamp: new Date().toISOString() });
    }

    const stations: DsnStation[] = ensureArray(dsn.station).map((station: Record<string, unknown>) => {
      const dishes: DsnDish[] = ensureArray(station.dish as Record<string, unknown>[]).map(
        (dish: Record<string, unknown>) => ({
          name: String(dish.name || ""),
          azimuthAngle: Number(dish.azimuthAngle || 0),
          elevationAngle: Number(dish.elevationAngle || 0),
          windSpeed: Number(dish.windSpeed || 0),
          targets: ensureArray(dish.target as Record<string, unknown>[]).map(
            (t: Record<string, unknown>) => ({
              name: String(t.name || ""),
              id: Number(t.id || 0),
              uplegRange: Number(t.uplegRange || 0),
              downlegRange: Number(t.downlegRange || 0),
              rtlt: Number(t.rtlt || 0),
            }),
          ),
          upSignal: ensureArray(dish.upSignal as Record<string, unknown>[]).map(
            (s: Record<string, unknown>) => ({
              signalType: String(s.signalType || ""),
              dataRate: Number(s.dataRate || 0),
              frequency: Number(s.frequency || 0),
              band: String(s.band || ""),
              power: Number(s.power || 0),
              spacecraft: String(s.spacecraft || ""),
            }),
          ),
          downSignal: ensureArray(dish.downSignal as Record<string, unknown>[]).map(
            (s: Record<string, unknown>) => ({
              signalType: String(s.signalType || ""),
              dataRate: Number(s.dataRate || 0),
              frequency: Number(s.frequency || 0),
              band: String(s.band || ""),
              spacecraft: String(s.spacecraft || ""),
            }),
          ),
        }),
      );

      return {
        name: String(station.name || ""),
        friendlyName: String(station.friendlyName || ""),
        dishes,
      };
    });

    return NextResponse.json({
      stations,
      timestamp: dsn.timestamp ? String(dsn.timestamp) : new Date().toISOString(),
    });
  } catch (err) {
    console.error("DSN fetch error:", err);
    return NextResponse.json({ error: "DSN fetch failed" }, { status: 500 });
  }
}
