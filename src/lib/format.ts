// ─── MET Formatter ───────────────────────────────────────

export function formatMET(met: number): string {
  const sign = met >= 0 ? "T+" : "T-";
  const abs = Math.abs(met);
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.floor(abs % 60);

  const dd = String(d).padStart(2, "0");
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  return `${sign} ${dd}:${hh}:${mm}:${ss}`;
}

// ─── Number Formatter ────────────────────────────────────

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ─── Distance Formatter ──────────────────────────────────

export function formatDistance(km: number): string {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(1)}M`;
  if (km >= 1_000) return `${(km / 1_000).toFixed(0)}K`;
  return `${km.toFixed(0)}`;
}

// ─── Unit Conversion ─────────────────────────────────────

const KM_TO_MI = 0.621371;

export function toMph(kmh: number): number {
  return Math.round(kmh * KM_TO_MI);
}

export function toMiles(km: number): number {
  return Math.round(km * KM_TO_MI);
}

export function velUnit(useMph: boolean): string {
  return useMph ? "mph" : "km/h";
}

export function distUnit(useMph: boolean): string {
  return useMph ? "mi" : "km";
}
