import type { CaseResponse, ThreatType } from "@/lib/types";

export interface ThreatMeta {
  label: string;
  color: string;
}

export const THREAT_META: Record<ThreatType, ThreatMeta> = {
  phishing: { label: "Phishing", color: "#ef4444" },
  bec: { label: "Business Email Compromise", color: "#f97316" },
  spoofing: { label: "Domain Spoofing", color: "#a855f7" },
  malware: { label: "Malware", color: "#8b5cf6" },
  credential_harvesting: { label: "Credential Harvesting", color: "#eab308" },
  social_engineering: { label: "Social Engineering", color: "#f43f5e" },
  suspicious: { label: "Suspicious", color: "#0ea5e9" },
  benign: { label: "Benign", color: "#22c55e" },
};

/** The seven threat classes (benign excluded intentionally). */
export const THREAT_CATEGORIES = Object.keys(THREAT_META).filter(
  (k) => k !== "benign"
) as ThreatType[];

export const BENIGN = "benign" as ThreatType;

interface SeriesPoint {
  iso: string;
  date: string;
  phishing: number;
  bec: number;
  spoofing: number;
  malware: number;
  credential_harvesting: number;
  social_engineering: number;
  suspicious: number;
  benign: number;
}

const zeroPoint = (iso: string): SeriesPoint => ({
  iso,
  date: new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }),
  phishing: 0,
  bec: 0,
  spoofing: 0,
  malware: 0,
  credential_harvesting: 0,
  social_engineering: 0,
  suspicious: 0,
  benign: 0,
});

/** Bucket real cases into a continuous daily series for the last `days` days. */
export function buildSeries(cases: CaseResponse[], days: number, now = new Date()): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const iso = d.toISOString().slice(0, 10);
    map.set(iso, zeroPoint(iso));
  }
  cases.forEach((c) => {
    const iso = (c.created_at || "").slice(0, 10);
    const pt = map.get(iso);
    if (!pt) return;
    const key = THREAT_META[c.threat_type] ? c.threat_type : BENIGN;
    pt[key] += 1;
  });
  return Array.from(map.values());
}

export interface CatCount {
  key: ThreatType;
  label: string;
  color: string;
  count: number;
}

/** Distribution across all categories (7 threats + benign), sorted desc. */
export function distribution(cases: CaseResponse[]): CatCount[] {
  const counts = new Map<ThreatType, number>();
  (Object.keys(THREAT_META) as ThreatType[]).forEach((k) => counts.set(k, 0));
  cases.forEach((c) => {
    const key = THREAT_META[c.threat_type] ? c.threat_type : BENIGN;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      label: THREAT_META[key].label,
      color: THREAT_META[key].color,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface RealDelta {
  pct: number;
  dir: "up" | "down";
}

/**
 * Honest comparison of a count in the most recent `days` window vs the
 * window immediately before it. Returns null when there is no baseline.
 */
export function windowDelta(cases: CaseResponse[], days: number, now = new Date()): RealDelta | null {
  const cut = new Date(now);
  cut.setDate(cut.getDate() - days);
  const prev = new Date(cut);
  prev.setDate(prev.getDate() - days);

  const count = (from: number, to: number) =>
    cases.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= from && t < to;
    }).length;

  const recent = count(prev.getTime(), now.getTime());
  const before = count(prev.getTime() - (days * 86400000), prev.getTime());
  if (before === 0) return null;
  const pct = Math.round(((recent - before) / before) * 100);
  return { pct: Math.abs(pct), dir: pct >= 0 ? "up" : "down" };
}